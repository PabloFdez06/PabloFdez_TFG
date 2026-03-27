<?php

namespace App\Services\Moodle;

class MoodleAcademicRules
{
    public function isDeliveredFromStatus(string $statusText): bool
    {
        if ($statusText === '') {
            return false;
        }

        $negativeMarkers = [
            'sin entregar',
            'no entregad',
            'no enviad',
            'not submitted',
            'no submission',
            'draft',
            'borrador',
        ];

        foreach ($negativeMarkers as $marker) {
            if (str_contains($statusText, $marker)) {
                return false;
            }
        }

        return str_contains($statusText, 'entregado')
            || str_contains($statusText, 'enviado')
            || str_contains($statusText, 'submitted for grading')
            || str_contains($statusText, 'submitted');
    }

    public function looksLikeFeedback(string $text): bool
    {
        return str_contains($text, 'retroaliment')
            || str_contains($text, 'feedback')
            || str_contains($text, 'comentario')
            || str_contains($text, 'observacion');
    }

    public function isExplicitGradeValue(string $gradeText, bool $gradeLooksLikeFeedback = false): bool
    {
        if ($gradeText === '' || $gradeText === '-' || $gradeLooksLikeFeedback) {
            return false;
        }

        $negativeMarkers = [
            'sin calificar',
            'not graded',
            'ungraded',
            'no grade',
            'pendiente',
        ];

        foreach ($negativeMarkers as $marker) {
            if (str_contains($gradeText, $marker)) {
                return false;
            }
        }

        return true;
    }

    public function hasMeaningfulFeedback(string $text): bool
    {
        $normalized = mb_strtolower(trim($text));

        if ($normalized === '') {
            return false;
        }

        $clean = preg_replace('/\b(sin calificar|sin calificacion|not graded|sin entregar|no entregado|no enviado|pendiente|calificaci[oó]n|grade|feedback comments?|comentarios? de retroalimentaci[oó]n)\b[:\s-]*/iu', ' ', $normalized);
        $clean = trim((string) preg_replace('/\s+/u', ' ', (string) $clean));

        if ($clean === '') {
            return false;
        }

        if (mb_strlen($clean) < 2) {
            return false;
        }

        return preg_match('/[\p{L}\p{N}]/u', $clean) === 1;
    }

    public function extractRubricGrade(string $value): ?string
    {
        if (preg_match('/\b(SF|BN|NT|SB)\b/i', trim($value), $match) !== 1) {
            return null;
        }

        return mb_strtoupper($match[1]);
    }

    public function formatNumericGrade(string $value): ?string
    {
        $normalized = trim(str_replace(',', '.', $value));

        if ($normalized === '') {
            return null;
        }

        if (preg_match('/^\s*([0-9]+(?:\.[0-9]+)?)\s*\/\s*([0-9]+(?:\.[0-9]+)?)\s*$/', $normalized, $match) === 1) {
            return $this->normalizeNumberToken($match[1]).'/'.$this->normalizeNumberToken($match[2]);
        }

        if (preg_match('/^\s*([0-9]+(?:\.[0-9]+)?)\s*$/', $normalized, $match) === 1) {
            return $this->normalizeNumberToken($match[1]).'/10';
        }

        return null;
    }

    public function normalizeNumberToken(string $token): string
    {
        $number = (float) $token;

        if (fmod($number, 1.0) === 0.0) {
            return (string) ((int) $number);
        }

        $value = rtrim(rtrim(number_format($number, 2, '.', ''), '0'), '.');

        return $value;
    }
}
