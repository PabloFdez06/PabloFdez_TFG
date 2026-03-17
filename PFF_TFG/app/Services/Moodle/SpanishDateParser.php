<?php

namespace App\Services\Moodle;

use Carbon\CarbonImmutable;

class SpanishDateParser
{
    /**
     * @return string|null ISO-8601 date time.
     */
    public function toIso(?string $raw): ?string
    {
        if (! is_string($raw) || trim($raw) === '') {
            return null;
        }

        $normalized = mb_strtolower(trim($raw));
        $normalized = str_replace(',', ' ', $normalized);
        $normalized = preg_replace('/\s+/', ' ', (string) $normalized) ?? $normalized;
        $normalized = preg_replace('/\b(lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado|domingo)\b/u', '', (string) $normalized) ?? $normalized;
        $normalized = trim((string) $normalized);

        // Relative phrases commonly shown in Moodle assignment tables.
        if (str_contains($normalized, 'hoy')) {
            return CarbonImmutable::now()->endOfDay()->toIso8601String();
        }

        if (str_contains($normalized, 'manana') || str_contains($normalized, 'mañana')) {
            return CarbonImmutable::now()->addDay()->endOfDay()->toIso8601String();
        }

        if (preg_match('/(?:en\s+)?(\d{1,3})\s*d[ií]a(?:s)?/u', $normalized, $relativeDays)) {
            $days = (int) $relativeDays[1];
            return CarbonImmutable::now()->addDays($days)->endOfDay()->toIso8601String();
        }

        if (preg_match('/(?:en\s+)?(\d{1,3})\s*hora(?:s)?/u', $normalized, $relativeHours)) {
            $hours = (int) $relativeHours[1];
            return CarbonImmutable::now()->addHours($hours)->toIso8601String();
        }

        $months = [
            'enero' => '01',
            'febrero' => '02',
            'marzo' => '03',
            'abril' => '04',
            'mayo' => '05',
            'junio' => '06',
            'julio' => '07',
            'agosto' => '08',
            'septiembre' => '09',
            'setiembre' => '09',
            'octubre' => '10',
            'noviembre' => '11',
            'diciembre' => '12',
        ];

        // Format examples handled:
        // - 12 junio 2026 23:59
        // - 12 de junio 23:59
        // - 12/06/2026 23:59
        // - 12-06 23:59
        $patternNamed = '/(\d{1,2})\s*(?:de\s+)?([a-záéíóú]+)(?:\s+(\d{4}))?(?:.*?(\d{1,2}):(\d{2}))?/u';
        $patternNumeric = '/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?(?:.*?(\d{1,2}):(\d{2}))?/u';

        $day = null;
        $month = null;
        $year = null;
        $hour = '23';
        $minute = '59';

        if (preg_match($patternNamed, $normalized, $match)) {
            $day = str_pad($match[1], 2, '0', STR_PAD_LEFT);
            $monthText = str_replace(['á', 'é', 'í', 'ó', 'ú'], ['a', 'e', 'i', 'o', 'u'], $match[2]);
            $month = $months[$monthText] ?? null;
            $year = $match[3] ?? null;
            $hour = isset($match[4]) ? str_pad($match[4], 2, '0', STR_PAD_LEFT) : '23';
            $minute = $match[5] ?? '59';
        } elseif (preg_match($patternNumeric, $normalized, $match)) {
            $day = str_pad($match[1], 2, '0', STR_PAD_LEFT);
            $month = str_pad($match[2], 2, '0', STR_PAD_LEFT);
            $year = $match[3] ?? null;
            $hour = isset($match[4]) ? str_pad($match[4], 2, '0', STR_PAD_LEFT) : '23';
            $minute = $match[5] ?? '59';
        }

        if (! $day || ! $month) {
            return null;
        }

        if (! $year) {
            $year = (string) CarbonImmutable::now()->year;
        }

        if (strlen((string) $year) === 2) {
            $year = '20'.$year;
        }

        try {
            $date = CarbonImmutable::createFromFormat('Y-m-d H:i', "{$year}-{$month}-{$day} {$hour}:{$minute}");

            if (! $date) {
                return null;
            }

            // If source date omitted year and got parsed as already long past, move to next year.
            if (! isset($match[3]) || ($match[3] ?? '') === '') {
                $now = CarbonImmutable::now();
                if ($date->lessThan($now->subDays(7))) {
                    $date = $date->addYear();
                }
            }

            return $date?->toIso8601String();
        } catch (\Throwable) {
            return null;
        }
    }
}
