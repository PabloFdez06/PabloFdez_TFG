<?php

namespace App\Services\Moodle\Parsers;

use DOMDocument;
use DOMXPath;

class ParticipantsParser
{
    public function extractTutor(string $html): ?string
    {
        $doc = new DOMDocument();
        @$doc->loadHTML($html);

        $xpath = new DOMXPath($doc);
        $rows = $xpath->query('//table[contains(@class, "generaltable")]/tbody/tr');

        if (! $rows) {
            return null;
        }

        foreach ($rows as $row) {
            $text = mb_strtolower(trim(preg_replace('/\s+/u', ' ', $row->textContent ?? '')));
            if (! str_contains($text, 'profesor') && ! str_contains($text, 'docente') && ! str_contains($text, 'teacher') && ! str_contains($text, 'tutor')) {
                continue;
            }

            $nameNode = $xpath->query('.//a[contains(@class, "fullname") or contains(@href, "/user/view.php")]', $row)?->item(0);
            $name = trim((string) ($nameNode?->textContent ?? ''));

            if ($name !== '') {
                return $name;
            }
        }

        return null;
    }
}
