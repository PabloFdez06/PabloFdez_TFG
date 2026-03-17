<?php

namespace App\Services\Moodle;

use App\Services\Moodle\Exceptions\MoodleAuthenticationException;
use App\Services\Moodle\Exceptions\MoodleRequestException;

class MoodleCasClient
{
    private const DEFAULT_MOODLE_CAS_PATH = '/login/index.php?authCAS=CAS';
    private const DEFAULT_CAS_LOGIN_PATH = '/login';

    public function __construct(private readonly CasLoginParser $parser)
    {
    }

    public function login(string $username, string $password, bool $withTrace = false): MoodleSession
    {
        $baseUrl = $this->resolveBaseUrl();
        $casLoginUrl = $this->resolveCasLoginUrl($baseUrl);
        $casServiceUrl = $this->resolveCasServiceUrl($baseUrl);

        if ($baseUrl === '' || $casLoginUrl === '' || $casServiceUrl === '') {
            throw new MoodleRequestException('Missing Moodle/CAS configuration.');
        }

        $trace = [];
        $curl = $this->initCurl();

        $loginUrl = $casLoginUrl.(str_contains($casLoginUrl, '?') ? '&' : '?').'service='.rawurlencode($casServiceUrl);
        $loginHtml = $this->request($curl, 'GET', $loginUrl, null, $trace, 'cas_login_get');

        $hidden = $this->parser->parseHiddenFields($loginHtml);
        $payload = array_merge($hidden, [
            'username' => $username,
            'password' => $password,
            '_eventId' => $hidden['_eventId'] ?? 'submit',
        ]);

        $postHtml = $this->request($curl, 'POST', $loginUrl, http_build_query($payload), $trace, 'cas_login_post');
        $effectiveUrl = (string) curl_getinfo($curl, CURLINFO_EFFECTIVE_URL);

        if ($this->parser->looksLikeInvalidCredentials($effectiveUrl, $postHtml)) {
            throw new MoodleAuthenticationException('Invalid Moodle credentials.');
        }

        $homeHtml = $this->request($curl, 'GET', $baseUrl.'/my/', null, $trace, 'moodle_home');
        $sesskey = $this->parser->extractSesskey($homeHtml);
        $userid = $this->parser->extractUserid($homeHtml);

        if (! $sesskey) {
            throw new MoodleAuthenticationException('CAS login succeeded but sesskey could not be extracted.');
        }

        return new MoodleSession($curl, $sesskey, $userid, $withTrace ? $trace : []);
    }

    /**
     * @param  array<string, scalar|null>  $query
     */
    public function get(MoodleSession $session, string $path, array $query = [], ?array &$trace = null, string $traceStep = 'get'): string
    {
        $baseUrl = rtrim((string) config('services.moodle.base_url'), '/');
        $url = str_starts_with($path, 'http') ? $path : $baseUrl.'/'.ltrim($path, '/');

        if ($query !== []) {
            $url .= (str_contains($url, '?') ? '&' : '?').http_build_query($query);
        }

        return $this->request($session->handle, 'GET', $url, null, $trace, $traceStep);
    }

    /**
     * @param  array<string, string>  $headers
     */
    public function post(MoodleSession $session, string $path, string $body, array $headers = [], ?array &$trace = null, string $traceStep = 'post'): string
    {
        $baseUrl = rtrim((string) config('services.moodle.base_url'), '/');
        $url = str_starts_with($path, 'http') ? $path : $baseUrl.'/'.ltrim($path, '/');

        return $this->request($session->handle, 'POST', $url, $body, $trace, $traceStep, $headers);
    }

    private function initCurl()
    {
        $curl = curl_init();
        $timeoutSeconds = max(45, (int) config('services.moodle.timeout', 20));

        curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => $timeoutSeconds,
            CURLOPT_CONNECTTIMEOUT => min($timeoutSeconds, 20),
            CURLOPT_SSL_VERIFYPEER => $this->shouldVerifySsl(),
            CURLOPT_SSL_VERIFYHOST => $this->shouldVerifySsl() ? 2 : 0,
            CURLOPT_COOKIEFILE => '',
            CURLOPT_COOKIEJAR => '',
            CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
        ]);

        return $curl;
    }

    /**
     * @param  array<int, array<string, mixed>>|null  $trace
     * @param  array<string, string>  $headers
     */
    private function request($curl, string $method, string $url, ?string $body, ?array &$trace, string $traceStep, array $headers = []): string
    {
        curl_setopt($curl, CURLOPT_URL, $url);
        curl_setopt($curl, CURLOPT_HTTPGET, $method === 'GET');
        curl_setopt($curl, CURLOPT_POST, $method === 'POST');

        $maxAttempts = max(1, (int) config('services.moodle.retry_attempts', 4));
        $baseDelayMs = max(250, (int) config('services.moodle.retry_delay_ms', 1000));

        if ($method === 'POST') {
            curl_setopt($curl, CURLOPT_POSTFIELDS, $body ?? '');
        } else {
            curl_setopt($curl, CURLOPT_POSTFIELDS, null);
        }

        if ($headers !== []) {
            $formatted = [];
            foreach ($headers as $key => $value) {
                $formatted[] = $key.': '.$value;
            }
            curl_setopt($curl, CURLOPT_HTTPHEADER, $formatted);
        } else {
            curl_setopt($curl, CURLOPT_HTTPHEADER, []);
        }

        $lastError = null;

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            $response = curl_exec($curl);
            $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
            $effectiveUrl = (string) curl_getinfo($curl, CURLINFO_EFFECTIVE_URL);
            $errno = curl_errno($curl);
            $error = curl_error($curl);

            if (is_array($trace)) {
                $trace[] = [
                    'step' => $traceStep,
                    'method' => $method,
                    'request_url' => $url,
                    'effective_url' => $effectiveUrl,
                    'status' => $status,
                    'attempt' => $attempt,
                    'response_size' => is_string($response) ? strlen($response) : 0,
                    'curl_errno' => $errno,
                ];
            }

            if ($response === false) {
                $lastError = new MoodleRequestException('cURL request failed: '.$error);

                if ($attempt < $maxAttempts && $this->shouldRetryCurlError($errno)) {
                    $this->pauseRetry($attempt, $baseDelayMs);
                    continue;
                }

                throw $lastError;
            }

            if ($status === 429 && $attempt < $maxAttempts) {
                $this->pauseRetry($attempt, $baseDelayMs);
                continue;
            }

            if ($status >= 400) {
                throw new MoodleRequestException("Moodle request failed with HTTP {$status} at {$effectiveUrl}");
            }

            return $response;
        }

        throw $lastError ?? new MoodleRequestException('Moodle request failed after retries.');
    }

    private function shouldRetryCurlError(int $errno): bool
    {
        return in_array($errno, [CURLE_OPERATION_TIMEDOUT, CURLE_COULDNT_CONNECT, CURLE_RECV_ERROR, CURLE_SEND_ERROR], true);
    }

    private function pauseRetry(int $attempt, int $baseDelayMs): void
    {
        $waitMs = min($baseDelayMs * $attempt, 8000);
        usleep($waitMs * 1000);
    }

    private function shouldVerifySsl(): bool
    {
        if (app()->isProduction()) {
            return true;
        }

        return (bool) config('services.moodle.verify_ssl', false);
    }

    private function resolveBaseUrl(): string
    {
        return rtrim((string) config('services.moodle.base_url'), '/');
    }

    private function resolveCasLoginUrl(string $baseUrl): string
    {
        $configured = trim((string) config('services.moodle.cas_login_url'));
        if ($configured !== '') {
            return $configured;
        }

        $casBase = rtrim(trim((string) config('services.moodle.cas_base')), '/');
        if ($casBase !== '') {
            return $casBase.self::DEFAULT_CAS_LOGIN_PATH;
        }

        if ($baseUrl === '') {
            return '';
        }

        return $baseUrl.self::DEFAULT_MOODLE_CAS_PATH;
    }

    private function resolveCasServiceUrl(string $baseUrl): string
    {
        $configured = trim((string) config('services.moodle.cas_service_url'));
        if ($configured !== '') {
            return $configured;
        }

        if ($baseUrl === '') {
            return '';
        }

        return $baseUrl.self::DEFAULT_MOODLE_CAS_PATH;
    }
}
