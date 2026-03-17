<?php

namespace App\Services\Moodle;

use DOMDocument;
use DOMXPath;

class CasLoginParser
{
    /**
     * @return array<string, string>
     */
    public function parseHiddenFields(string $html): array
    {
        $doc = new DOMDocument();
        @$doc->loadHTML($html);

        $xpath = new DOMXPath($doc);
        $inputs = $xpath->query('//input[@type="hidden"]');

        $fields = [];

        if (! $inputs) {
            return $fields;
        }

        foreach ($inputs as $input) {
            $name = trim((string) $input->getAttribute('name'));
            $value = (string) $input->getAttribute('value');

            if ($name !== '') {
                $fields[$name] = $value;
            }
        }

        return $fields;
    }

    public function extractSesskey(string $html): ?string
    {
        $patterns = [
            '/"sesskey"\s*:\s*"([a-zA-Z0-9]+)"/i',
            '/sesskey=([a-zA-Z0-9]+)/i',
            '/name="sesskey"\s+value="([a-zA-Z0-9]+)"/i',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $html, $matches) === 1) {
                return $matches[1];
            }
        }

        return null;
    }

    public function extractUserid(string $html): ?int
    {
        $patterns = [
            '/"userid"\s*:\s*(\d+)/i',
            '/"userId"\s*:\s*(\d+)/i',
            '/id="nav-notification-popover-container"[^>]*data-userid="(\d+)"/i',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $html, $matches) === 1) {
                return (int) $matches[1];
            }
        }

        return null;
    }

    public function looksLikeInvalidCredentials(string $effectiveUrl, string $html): bool
    {
        $errorPatterns = [
            '/credenciales?/i',
            '/authentication failed/i',
            '/username or password/i',
            '/\bcas\b.*\berror\b/i',
            '/class="errors?"/i',
        ];

        foreach ($errorPatterns as $pattern) {
            if (preg_match($pattern, $html) === 1) {
                return true;
            }
        }

        return str_contains($effectiveUrl, '/login') && ! str_contains($effectiveUrl, '/my/');
    }
}
