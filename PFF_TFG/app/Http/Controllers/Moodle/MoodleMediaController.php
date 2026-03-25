<?php

namespace App\Http\Controllers\Moodle;

use App\Http\Controllers\Controller;
use App\Services\Moodle\Exceptions\MoodleAuthenticationException;
use App\Services\Moodle\Exceptions\MoodleRequestException;
use App\Services\Moodle\MoodleCasClient;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class MoodleMediaController extends Controller
{
    public function __construct(
        private readonly MoodleCasClient $client,
    ) {
    }

    public function show(Request $request): Response
    {
        $validated = $request->validate([
            'url' => ['required', 'string', 'max:4096'],
        ]);

        $user = $request->user();
        $moodleConnected = (bool) ($user?->moodle_username && $user?->moodle_password);

        if (! $moodleConnected) {
            abort(403, 'Moodle no conectado.');
        }

        $target = $this->resolveAbsoluteUrl((string) $validated['url']);

        if ($target === null || ! $this->isAllowedMoodleUrl($target)) {
            abort(403, 'URL de recurso no permitida.');
        }

        try {
            $session = $this->client->login((string) $user->moodle_username, (string) $user->moodle_password);
            $binary = $this->client->getBinary($session, $target);
        } catch (MoodleAuthenticationException|MoodleRequestException) {
            abort(404, 'No se pudo recuperar el recurso solicitado.');
        } finally {
            if (isset($session)) {
                $session->close();
            }
        }

        return response($binary['body'])
            ->header('Content-Type', $binary['contentType'])
            ->header('Cache-Control', 'private, max-age=300');
    }

    private function resolveAbsoluteUrl(string $rawUrl): ?string
    {
        $decoded = html_entity_decode(trim($rawUrl), ENT_QUOTES | ENT_HTML5);

        if ($decoded === '') {
            return null;
        }

        if (str_starts_with($decoded, '//')) {
            $base = rtrim((string) config('services.moodle.base_url'), '/');
            $scheme = parse_url($base, PHP_URL_SCHEME);

            return ($scheme ?: 'https').':'.$decoded;
        }

        if (str_starts_with($decoded, '/')) {
            $base = rtrim((string) config('services.moodle.base_url'), '/');

            return $base !== '' ? $base.$decoded : null;
        }

        $scheme = parse_url($decoded, PHP_URL_SCHEME);

        if (is_string($scheme) && in_array(mb_strtolower($scheme), ['http', 'https'], true)) {
            return $decoded;
        }

        return null;
    }

    private function isAllowedMoodleUrl(string $url): bool
    {
        $targetHost = parse_url($url, PHP_URL_HOST);

        if (! is_string($targetHost) || trim($targetHost) === '') {
            return false;
        }

        $allowedHosts = [];

        $baseUrl = trim((string) config('services.moodle.base_url'));
        if ($baseUrl !== '') {
            $host = parse_url($baseUrl, PHP_URL_HOST);
            if (is_string($host) && $host !== '') {
                $allowedHosts[] = mb_strtolower($host);
            }
        }

        $casBase = trim((string) config('services.moodle.cas_base'));
        if ($casBase !== '') {
            $host = parse_url($casBase, PHP_URL_HOST);
            if (is_string($host) && $host !== '') {
                $allowedHosts[] = mb_strtolower($host);
            }
        }

        $casLogin = trim((string) config('services.moodle.cas_login_url'));
        if ($casLogin !== '') {
            $host = parse_url($casLogin, PHP_URL_HOST);
            if (is_string($host) && $host !== '') {
                $allowedHosts[] = mb_strtolower($host);
            }
        }

        $allowedHosts = array_values(array_unique($allowedHosts));
        if ($allowedHosts === []) {
            return false;
        }

        return in_array(mb_strtolower($targetHost), $allowedHosts, true);
    }
}
