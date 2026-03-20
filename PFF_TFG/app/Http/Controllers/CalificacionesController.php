<?php

namespace App\Http\Controllers;

use App\Services\Moodle\Exceptions\MoodleAuthenticationException;
use App\Services\Moodle\Exceptions\MoodleRequestException;
use App\Services\Moodle\SpanishDateParser;
use App\Services\Moodle\MoodleUserAcademicCache;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CalificacionesController extends Controller
{
    public function __construct(
        private readonly MoodleUserAcademicCache $cache,
        private readonly SpanishDateParser $dateParser,
    ) {
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        $moodleConnected = (bool) ($user?->moodle_username && $user?->moodle_password);

        $subjectCards = [];
        $summary = [
            'subjects' => 0,
            'gradedItems' => 0,
            'subjectsWithGrades' => 0,
        ];
        $profileAvatarUrl = null;
        $pageError = null;
        $milestones = [];
        $studentName = $user?->name;

        if ($moodleConnected) {
            try {
                $academicPayload = $this->cache->getForUser($user);
                $gradeReport = $this->cache->getGradesForUser($user);
                $courses = is_array($academicPayload['courses'] ?? null) ? $academicPayload['courses'] : [];
                $tasks = is_array($academicPayload['tasks'] ?? null) ? $academicPayload['tasks'] : [];

                $profileAvatarUrl = is_string($academicPayload['profileAvatarUrl'] ?? null)
                    ? $academicPayload['profileAvatarUrl']
                    : null;
                $studentName = is_string($academicPayload['studentName'] ?? null) && trim((string) $academicPayload['studentName']) !== ''
                    ? (string) $academicPayload['studentName']
                    : $studentName;

                $subjectCards = $this->buildSubjectCards($courses, $tasks, is_array($gradeReport) ? $gradeReport : []);
                $summary = $this->buildSummary($subjectCards);
                $milestones = $this->buildMilestones($tasks);
            } catch (MoodleAuthenticationException $exception) {
                $pageError = $exception->getMessage();
            } catch (MoodleRequestException $exception) {
                $pageError = $exception->getMessage();
            } catch (\Throwable) {
                $pageError = 'No se pudieron cargar las calificaciones en este momento.';
            }
        }

        return Inertia::render('calificaciones', [
            'moodleConnected' => $moodleConnected,
            'studentName' => $studentName,
            'profileAvatarUrl' => $profileAvatarUrl,
            'subjectCards' => $subjectCards,
            'summary' => $summary,
            'milestones' => $milestones,
            'pageError' => $pageError,
        ]);
    }

    /**
     * @param  array<int, array<string, mixed>>  $tasks
     * @return array<int, array<string, string|null>>
     */
    private function buildMilestones(array $tasks): array
    {
        $now = CarbonImmutable::now();
        $upcoming = [];
        $recentDelivered = [];

        foreach ($tasks as $task) {
            if (! is_array($task)) {
                continue;
            }

            $title = trim((string) ($task['nombre'] ?? ''));
            if ($title === '') {
                continue;
            }

            $date = $this->resolveTaskDate($task);
            $days = isset($task['dias_restantes']) ? (int) $task['dias_restantes'] : null;

            if ($days === null && $date !== null) {
                $days = $now->diffInDays($date, false);
            }

            $status = mb_strtolower((string) ($task['estado'] ?? ''));
            $isDelivered = (bool) ($task['entregada'] ?? false)
                || (bool) ($task['calificada'] ?? false)
                || str_contains($status, 'entregado')
                || str_contains($status, 'enviado')
                || str_contains($status, 'submitted');

            $item = [
                'title' => $title,
                'subject' => (string) ($task['asignatura_nombre'] ?? 'Sin asignatura'),
                'dateLabel' => $this->buildMilestoneDateLabel($task, $date, $days),
                'link' => is_string($task['url'] ?? null) && $task['url'] !== '' ? (string) $task['url'] : null,
                'kind' => $isDelivered ? 'entregada' : 'proxima',
                'days' => $days,
                'date' => $date,
            ];

            if (! $isDelivered && ($days === null || $days >= 0)) {
                $upcoming[] = $item;
                continue;
            }

            if ($isDelivered) {
                $recentDelivered[] = $item;
            }
        }

        usort($upcoming, function (array $a, array $b): int {
            $aDays = $a['days'];
            $bDays = $b['days'];

            if ($aDays !== null && $bDays !== null) {
                return $aDays <=> $bDays;
            }

            if ($aDays === null && $bDays === null) {
                return 0;
            }

            return $aDays === null ? 1 : -1;
        });

        usort($recentDelivered, function (array $a, array $b) use ($now): int {
            $aDate = $a['date'];
            $bDate = $b['date'];

            if (! $aDate && ! $bDate) {
                return 0;
            }

            if (! $aDate) {
                return 1;
            }

            if (! $bDate) {
                return -1;
            }

            return abs($aDate->diffInSeconds($now, false)) <=> abs($bDate->diffInSeconds($now, false));
        });

        $selected = array_slice($upcoming, 0, 4);

        if (count($selected) < 4) {
            $selected = array_merge($selected, array_slice($recentDelivered, 0, 4 - count($selected)));
        }

        return array_map(static fn (array $item): array => [
            'dateLabel' => (string) ($item['dateLabel'] ?? 'SIN FECHA'),
            'title' => (string) ($item['title'] ?? 'Actividad'),
            'subject' => (string) ($item['subject'] ?? 'Sin asignatura'),
            'link' => is_string($item['link'] ?? null) ? (string) $item['link'] : null,
            'kind' => (string) ($item['kind'] ?? 'proxima'),
        ], $selected);
    }

    /**
     * @param  array<string, mixed>  $task
     */
    private function resolveTaskDate(array $task): ?CarbonImmutable
    {
        $dateIso = (string) ($task['fecha_iso'] ?? '');

        if ($dateIso !== '') {
            try {
                return CarbonImmutable::parse($dateIso);
            } catch (\Throwable) {
                // Ignore and fallback to fecha_entrega parsing.
            }
        }

        $rawDate = is_string($task['fecha_entrega'] ?? null) ? (string) $task['fecha_entrega'] : null;
        $parsedIso = $this->dateParser->toIso($rawDate);

        if (! $parsedIso) {
            return null;
        }

        try {
            return CarbonImmutable::parse($parsedIso);
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @param  array<string, mixed>  $task
     */
    private function buildMilestoneDateLabel(array $task, ?CarbonImmutable $date, ?int $days): string
    {
        if ($date !== null) {
            if ($date->isToday()) {
                return 'HOY';
            }

            if ($date->isTomorrow()) {
                return 'MANANA';
            }

            return mb_strtoupper($date->translatedFormat('d M'));
        }

        if ($days !== null) {
            return $days <= 0 ? 'HOY' : 'EN '.$days.' DIAS';
        }

        $rawDate = is_string($task['fecha_entrega'] ?? null) ? trim((string) $task['fecha_entrega']) : '';

        return $rawDate !== '' ? mb_strtoupper($rawDate) : 'SIN FECHA';
    }

    /**
     * @param  array<int, array<string, mixed>>  $courses
     * @param  array<int, array<string, mixed>>  $tasks
     * @param  array<int, array<string, mixed>>  $gradeReport
     * @return array<int, array<string, mixed>>
     */
    private function buildSubjectCards(array $courses, array $tasks, array $gradeReport): array
    {
        $cards = [];
        $variants = ['large', 'small', 'small', 'large'];

        $taskUrlByCourseAndName = [];
        foreach ($tasks as $task) {
            $courseId = (int) ($task['asignatura_id'] ?? 0);
            $taskName = mb_strtolower(trim((string) ($task['nombre'] ?? '')));
            $taskUrl = is_string($task['url'] ?? null) && $task['url'] !== '' ? (string) $task['url'] : null;

            if ($courseId <= 0 || $taskName === '' || $taskUrl === null) {
                continue;
            }

            $taskUrlByCourseAndName[$courseId][$taskName] = $taskUrl;
        }

        $reportByCourse = [];
        foreach ($gradeReport as $courseReport) {
            $courseId = (int) ($courseReport['asignatura_id'] ?? 0);
            if ($courseId <= 0) {
                continue;
            }

            $items = is_array($courseReport['items'] ?? null) ? $courseReport['items'] : [];
            if ($items === []) {
                continue;
            }

            $reportByCourse[$courseId] = $items;
        }

        foreach (array_values($courses) as $index => $course) {
            $courseId = (int) ($course['id'] ?? 0);
            $courseItems = $reportByCourse[$courseId] ?? [];

            $tasksForUnit = [];
            foreach ($courseItems as $item) {
                if (! is_array($item)) {
                    continue;
                }

                $itemName = trim((string) ($item['item'] ?? ''));
                if ($itemName === '') {
                    continue;
                }

                ['grade' => $grade, 'feedback' => $feedback, 'isNumeric' => $isNumeric] = $this->resolveGradeReportEntry($item);

                if ($grade === null && $feedback === null) {
                    continue;
                }

                $taskUrl = $taskUrlByCourseAndName[$courseId][mb_strtolower($itemName)] ?? null;
                $linkTitle = $taskUrl !== null && $feedback !== null && mb_strlen($feedback) >= 120;

                $tasksForUnit[] = [
                    'name' => $itemName,
                    'grade' => $grade ?? '-',
                    'isNumeric' => $isNumeric,
                    'feedback' => $feedback,
                    'url' => $taskUrl,
                    'linkTitle' => $linkTitle,
                ];
            }

            $unitBlocks = $tasksForUnit === []
                ? []
                : [
                    [
                        'name' => 'General',
                        'tasks' => $tasksForUnit,
                    ],
                ];

            $cards[] = [
                'id' => $courseId,
                'code' => 'CRS-'.$courseId,
                'subject' => (string) ($course['nombre'] ?? 'Asignatura'),
                'teacher' => (string) ($course['docente'] ?? 'Docente no disponible'),
                'image' => is_string($course['imagen'] ?? null) && $course['imagen'] !== '' ? (string) $course['imagen'] : null,
                'gradedCount' => count($tasksForUnit),
                'units' => $unitBlocks,
                'variant' => $variants[$index % count($variants)],
                'accent' => $index % 3 === 1,
            ];
        }

        usort($cards, fn (array $a, array $b): int => $b['gradedCount'] <=> $a['gradedCount']);

        return $cards;
    }

    /**
     * @param  array<int, array<string, mixed>>  $cards
     * @return array<string, int>
     */
    private function buildSummary(array $cards): array
    {
        $subjects = count($cards);
        $gradedItems = array_sum(array_map(fn (array $card): int => (int) ($card['gradedCount'] ?? 0), $cards));
        $subjectsWithGrades = count(array_filter($cards, fn (array $card): bool => (int) ($card['gradedCount'] ?? 0) > 0));

        return [
            'subjects' => $subjects,
            'gradedItems' => $gradedItems,
            'subjectsWithGrades' => $subjectsWithGrades,
        ];
    }

    /**
     * @param array<string, mixed> $item
     * @return array{grade:?string, feedback:?string, isNumeric:bool}
     */
    private function resolveGradeReportEntry(array $item): array
    {
        $gradeText = trim((string) ($item['calificacion_texto'] ?? ''));
        $rangeText = trim((string) ($item['rango_texto'] ?? ''));
        $feedbackText = trim((string) ($item['retroalimentacion_texto'] ?? ''));

        $numeric = $this->formatGradeWithRange($gradeText, $rangeText);
        if ($numeric !== null) {
            return [
                'grade' => $numeric,
                'feedback' => $this->hasMeaningfulFeedback($feedbackText) ? $feedbackText : null,
                'isNumeric' => true,
            ];
        }

        $rubric = $this->extractRubricGrade($gradeText);
        if ($rubric !== null) {
            return [
                'grade' => $rubric,
                'feedback' => $this->hasMeaningfulFeedback($feedbackText) ? $feedbackText : null,
                'isNumeric' => false,
            ];
        }

        if ($this->hasMeaningfulFeedback($feedbackText)) {
            return [
                'grade' => '-',
                'feedback' => $feedbackText,
                'isNumeric' => false,
            ];
        }

        return [
            'grade' => null,
            'feedback' => null,
            'isNumeric' => false,
        ];
    }

    private function hasMeaningfulFeedback(string $text): bool
    {
        $normalized = mb_strtolower(trim($text));

        if ($normalized === '') {
            return false;
        }

        $clean = preg_replace('/\b(sin calificar|sin calificacion|not graded|sin entregar|no entregado|no enviado|pendiente|calificaci[oó]n|grade|feedback comments?|comentarios? de retroalimentaci[oó]n)\b[:\s-]*/iu', ' ', $normalized);
        $clean = trim(preg_replace('/\s+/u', ' ', (string) $clean));

        if ($clean === '') {
            return false;
        }

        if (mb_strlen($clean) < 4) {
            return false;
        }

        return preg_match('/[\p{L}\p{N}]{2,}/u', $clean) === 1;
    }

    private function extractRubricGrade(string $value): ?string
    {
        if (preg_match('/\b(SF|BN|NT|SB)\b/i', trim($value), $match) !== 1) {
            return null;
        }

        return mb_strtoupper($match[1]);
    }

    private function formatNumericGrade(string $value): ?string
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

    private function normalizeNumberToken(string $token): string
    {
        $number = (float) $token;

        if (fmod($number, 1.0) === 0.0) {
            return (string) ((int) $number);
        }

        $value = rtrim(rtrim(number_format($number, 2, '.', ''), '0'), '.');

        return $value;
    }

    private function formatGradeWithRange(string $gradeText, string $rangeText): ?string
    {
        $gradeNormalized = trim(str_replace(',', '.', $gradeText));
        if ($gradeNormalized === '') {
            return null;
        }

        if (preg_match('/^\s*([0-9]+(?:\.[0-9]+)?)\s*$/', $gradeNormalized, $gradeMatch) !== 1) {
            return null;
        }

        $grade = $this->normalizeNumberToken($gradeMatch[1]);

        if (preg_match('/([0-9]+(?:[\.,][0-9]+)?)\s*$/', $rangeText, $rangeMatch) === 1) {
            $denominator = $this->normalizeNumberToken(str_replace(',', '.', $rangeMatch[1]));
            return $grade.'/'.$denominator;
        }

        return $grade.'/10';
    }

}
