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
        $table = $xpath->query('//table[contains(@class, "user-grade") or contains(@class, "generaltable")]')?->item(0);

        if (! $table) {
            return [];
        }

        $rows = $xpath->query('.//tbody/tr', $table);

        if (! $rows) {
            return [];
        }

        $headerMap = $this->extractHeaderMap($xpath, $table);

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

            $item = $this->valueAt($values, $headerMap, ['item']);
            $gradeText = $this->valueAt($values, $headerMap, ['calificacion']);
            $rangeText = $this->valueAt($values, $headerMap, ['rango']);
            $percentageText = $this->valueAt($values, $headerMap, ['porcentaje']);
            $feedbackText = $this->valueAt($values, $headerMap, ['retroalimentacion']);

            if ($item === null) {
                $item = $values[0] ?? null;
            }

            if ($gradeText === null) {
                $gradeText = $values[1] ?? null;
            }

            if ($rangeText === null) {
                $rangeText = $values[2] ?? null;
            }

            if ($percentageText === null) {
                $percentageText = $values[3] ?? null;
            }

            $items[] = [
                'item' => $item,
                'calificacion' => $this->toFloat($gradeText),
                'rango' => $rangeText,
                'porcentaje' => $this->toFloat($percentageText),
                'calificacion_texto' => $gradeText,
                'rango_texto' => $rangeText,
                'porcentaje_texto' => $percentageText,
                'retroalimentacion_texto' => $feedbackText,
            ];
        }

        return $items;
    }

    /**
     * @return array<string, int>
     */
    private function extractHeaderMap(DOMXPath $xpath, \DOMNode $table): array
    {
        $map = [];
        $headers = $xpath->query('.//thead/tr/th', $table);

        if (! $headers) {
            return $map;
        }

        foreach ($headers as $index => $header) {
            $text = mb_strtolower(trim(preg_replace('/\s+/u', ' ', $header->textContent ?? '')));
            if ($text === '') {
                continue;
            }

            if (str_contains($text, 'item')) {
                $map['item'] = $index;
                continue;
            }

            if (str_contains($text, 'calificaci')) {
                $map['calificacion'] = $index;
                continue;
            }

            if (str_contains($text, 'rango')) {
                $map['rango'] = $index;
                continue;
            }

            if (str_contains($text, 'porcentaje')) {
                $map['porcentaje'] = $index;
                continue;
            }

            if (str_contains($text, 'retroaliment')) {
                $map['retroalimentacion'] = $index;
            }
        }

        return $map;
    }

    /**
     * @param array<int, string> $values
     * @param array<string, int> $headerMap
     * @param array<int, string> $keys
     */
    private function valueAt(array $values, array $headerMap, array $keys): ?string
    {
        foreach ($keys as $key) {
            $index = $headerMap[$key] ?? null;

            if ($index === null) {
                continue;
            }

            return $values[$index] ?? null;
        }

        return null;
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
