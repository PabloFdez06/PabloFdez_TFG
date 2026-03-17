<?php

namespace App\Services\Moodle\Parsers;

use DOMDocument;
use DOMXPath;

class GradesParser
{
    /**
     * @return array<int, array<string, float|string|null>>
     */
    public function parse(string $html): array
    {
        $doc = new DOMDocument();
        @$doc->loadHTML($html);

        $xpath = new DOMXPath($doc);
        $rows = $xpath->query('//table[contains(@class, "user-grade") or contains(@class, "generaltable")]/tbody/tr');

        if (! $rows) {
            return [];
        }

        $items = [];

        foreach ($rows as $row) {
            $cells = $xpath->query('./th|./td', $row);
            if (! $cells || $cells->length < 2) {
                continue;
            }

            $values = [];
            foreach ($cells as $cell) {
                $values[] = trim(preg_replace('/\s+/u', ' ', $cell->textContent ?? ''));
            }

            $item = $values[0] ?? null;
            $gradeText = $values[1] ?? null;
            $rangeText = $values[2] ?? null;
            $percentageText = $values[3] ?? null;

            $items[] = [
                'item' => $item,
                'calificacion' => $this->toFloat($gradeText),
                'rango' => $rangeText,
                'porcentaje' => $this->toFloat($percentageText),
                'calificacion_texto' => $gradeText,
                'rango_texto' => $rangeText,
                'porcentaje_texto' => $percentageText,
            ];
        }

        return $items;
    }

    private function toFloat(?string $value): ?float
    {
        if (! is_string($value) || $value === '') {
            return null;
        }

        if (! preg_match('/-?\d+[\d.,]*/', $value, $match)) {
            return null;
        }

        $number = str_replace('.', '', $match[0]);
        $number = str_replace(',', '.', $number);

        return is_numeric($number) ? (float) $number : null;
    }
}
