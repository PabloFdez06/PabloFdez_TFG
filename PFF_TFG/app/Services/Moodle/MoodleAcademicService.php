<?php

namespace App\Services\Moodle;

use App\Services\Moodle\Parsers\AssignmentsParser;
use App\Services\Moodle\Parsers\GradesParser;
use App\Services\Moodle\Parsers\ParticipantsParser;
use Carbon\CarbonImmutable;

class MoodleAcademicService
{
    public function __construct(
        private readonly MoodleCasClient $client,
        private readonly AssignmentsParser $assignmentsParser,
        private readonly GradesParser $gradesParser,
        private readonly ParticipantsParser $participantsParser,
        private readonly SpanishDateParser $dateParser,
    ) {
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getCourses(MoodleSession $session, bool $includeTutor = true): array
    {
        $payload = json_encode([
            [
                'index' => 0,
                'methodname' => 'core_course_get_enrolled_courses_by_timeline_classification',
                'args' => [
                    'classification' => 'all',
                    'limit' => 999,
                    'offset' => 0,
                    'sort' => 'fullname',
                    'customfieldname' => '',
                    'customfieldvalue' => '',
                ],
            ],
        ], JSON_THROW_ON_ERROR);

        $response = $this->client->post(
            $session,
            '/lib/ajax/service.php?sesskey='.$session->sesskey.'&info=core_course_get_enrolled_courses_by_timeline_classification',
            $payload,
            [
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
                'X-Requested-With' => 'XMLHttpRequest',
            ],
            traceStep: 'courses_service',
        );

        $decoded = json_decode($response, true);
        $courses = $decoded[0]['data']['courses'] ?? [];

        if (! is_array($courses)) {
            return [];
        }

        $mapped = [];

        foreach ($courses as $course) {
            $courseId = (int) ($course['id'] ?? 0);
            if ($courseId <= 0) {
                continue;
            }

            $tutor = null;
            if ($includeTutor) {
                $participantsHtml = $this->client->get($session, '/user/index.php', ['id' => $courseId], traceStep: 'participants_'.$courseId);
                $tutor = $this->participantsParser->extractTutor($participantsHtml);
            }

            $mapped[] = [
                'id' => $courseId,
                'nombre' => $course['fullname'] ?? null,
                'categoria' => $course['coursecategory'] ?? null,
                'url' => $course['viewurl'] ?? null,
                'imagen' => $course['courseimage'] ?? null,
                'docente' => $tutor,
                'progreso' => isset($course['progress']) ? (int) round((float) $course['progress']) : null,
            ];
        }

        return $mapped;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getAssignmentsByCourse(MoodleSession $session, int $courseId): array
    {
        $html = $this->client->get($session, '/mod/assign/index.php', ['id' => $courseId], traceStep: 'assignments_'.$courseId);

        return $this->assignmentsParser->parse($html);
    }

    /**
     * @return array<string, mixed>
     */
    public function getAllAssignments(MoodleSession $session): array
    {
        $courses = $this->getCourses($session, includeTutor: false);
        $colors = ['#E63946', '#457B9D', '#2A9D8F', '#F4A261', '#264653', '#1D3557', '#8AB17D'];

        $courseCards = [];
        $tasks = [];

        foreach ($courses as $course) {
            $courseId = (int) $course['id'];
            $color = $colors[$courseId % count($colors)];

            $courseCards[] = [
                'id' => $courseId,
                'nombre' => $course['nombre'],
                'color' => $color,
                'imagen' => $course['imagen'],
            ];

            $courseTasks = $this->getAssignmentsByCourse($session, $courseId);

            foreach ($courseTasks as $task) {
                $fechaIso = $this->dateParser->toIso($task['fecha_entrega'] ?? null);
                $statusText = mb_strtolower((string) ($task['estado'] ?? ''));
                $gradeText = mb_strtolower((string) ($task['calificacion'] ?? ''));
                $feedbackText = trim((string) ($task['retroalimentacion'] ?? ''));
                $gradeLooksLikeFeedback = str_contains($gradeText, 'retroaliment')
                    || str_contains($gradeText, 'feedback')
                    || str_contains($gradeText, 'comentario')
                    || str_contains($gradeText, 'observacion');

                $entregada = $this->isDeliveredFromStatus($statusText);
                $calificada = $this->isExplicitGradeValue($gradeText)
                    || $this->hasMeaningfulFeedback($feedbackText)
                    || $this->hasMeaningfulFeedback((string) ($task['calificacion'] ?? ''));
                $pendiente = ! $entregada && ! $calificada;

                $diasRestantes = null;
                if ($fechaIso) {
                    $diasRestantes = CarbonImmutable::now()->diffInDays(CarbonImmutable::parse($fechaIso), false);
                }

                $tasks[] = array_merge($task, [
                    'asignatura_id' => $courseId,
                    'asignatura_nombre' => $course['nombre'],
                    'color' => $color,
                    'fecha_iso' => $fechaIso,
                    'pendiente' => $pendiente,
                    'entregada' => $entregada,
                    'calificada' => $calificada,
                    'dias_restantes' => $diasRestantes,
                ]);
            }
        }

        return [
            'asignaturas' => $courseCards,
            'tareas' => $tasks,
        ];
    }

    private function isDeliveredFromStatus(string $statusText): bool
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

    private function isExplicitGradeValue(string $gradeText): bool
    {
        $gradeText = trim($gradeText);
        if ($gradeText === '' || $gradeText === '-') {
            return false;
        }

        $negativeMarkers = [
            'sin calificar',
            'not graded',
            'ungraded',
            'no grade',
            'pendiente',
            'feedback',
            'retroaliment',
            'comentario',
            'observacion',
        ];

        foreach ($negativeMarkers as $marker) {
            if (str_contains($gradeText, $marker)) {
                return false;
            }
        }

        return true;
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

        if (mb_strlen($clean) < 2) {
            return false;
        }

        return preg_match('/[\p{L}\p{N}]/u', $clean) === 1;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getGrades(MoodleSession $session): array
    {
        $courses = $this->getCourses($session, includeTutor: false);
        $result = [];

        foreach ($courses as $course) {
            $courseId = (int) $course['id'];
            $html = $this->client->get($session, '/grade/report/user/index.php', ['id' => $courseId], traceStep: 'grades_'.$courseId);

            $result[] = [
                'asignatura_id' => $courseId,
                'asignatura_nombre' => $course['nombre'],
                'items' => $this->gradesParser->parse($html),
            ];
        }

        return $result;
    }
}
