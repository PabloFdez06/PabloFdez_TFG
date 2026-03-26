<?php

namespace App\Services\Moodle;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class MoodleUserAcademicCache
{
    private const ACADEMIC_CACHE_PREFIX = 'moodle:academic:user:v4:';

    private const GRADES_CACHE_PREFIX = 'moodle:grades:user:v2:';

    public function __construct(
        private readonly MoodleCasClient $client,
        private readonly MoodleAcademicService $academicService,
        private readonly SpanishDateParser $dateParser,
    ) {
    }

    /**
        * @return array{courses: array<int, array<string, mixed>>, tasks: array<int, array<string, mixed>>, profileAvatarUrl: ?string, studentName: ?string, studentEmail: ?string, academicCourse: ?string, academicYear: ?string}
     */
    public function getForUser(User $user): array
    {
        $ttlSeconds = max(60, (int) config('services.moodle.cache_ttl_seconds', 300));
        $cacheKey = self::ACADEMIC_CACHE_PREFIX.$user->id;

        return Cache::remember($cacheKey, now()->addSeconds($ttlSeconds), function () use ($user): array {
            if (function_exists('set_time_limit')) {
                @set_time_limit(300);
            }

            @ini_set('max_execution_time', '300');

            $session = $this->client->login((string) $user->moodle_username, (string) $user->moodle_password);

            try {
                $courses = $this->academicService->getCourses($session, includeTutor: true);
                $tasks = $this->collectAllTasks($session, $courses);
                $gradeReport = $this->academicService->getGrades($session);
                $tasks = $this->enrichTasksWithGradeReport($tasks, is_array($gradeReport) ? $gradeReport : []);
                $profileAvatarUrl = $this->extractProfileAvatarUrl($session);
                $studentName = $this->extractStudentName($session);
                $studentEmail = $this->extractStudentEmail($session);
                $academicCourse = $this->extractAcademicCourse($session);
                $academicYear = $this->extractAcademicYear($session, $courses);

                $normalizedTasks = array_map(function (array $task): array {
                    $fechaIso = is_string($task['fecha_iso'] ?? null) ? (string) $task['fecha_iso'] : '';

                    if ($fechaIso === '' && is_string($task['fecha_entrega'] ?? null)) {
                        $fechaIso = (string) ($this->dateParser->toIso((string) $task['fecha_entrega']) ?? '');
                        $task['fecha_iso'] = $fechaIso !== '' ? $fechaIso : null;
                    }

                    if ($fechaIso !== '') {
                        try {
                            $task['dias_restantes'] = CarbonImmutable::now()->diffInDays(CarbonImmutable::parse($fechaIso), false);
                        } catch (\Throwable) {
                            $task['dias_restantes'] = $task['dias_restantes'] ?? null;
                        }
                    }

                    return $task;
                }, $tasks);

                return [
                    'courses' => $courses,
                    'tasks' => $normalizedTasks,
                    'profileAvatarUrl' => $profileAvatarUrl,
                    'studentName' => $studentName,
                    'studentEmail' => $studentEmail,
                    'academicCourse' => $academicCourse,
                    'academicYear' => $academicYear,
                ];
            } finally {
                $session->close();
            }
        });
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function getGradesForUser(User $user): array
    {
        $ttlSeconds = max(60, (int) config('services.moodle.cache_ttl_seconds', 300));
        $cacheKey = self::GRADES_CACHE_PREFIX.$user->id;

        return Cache::remember($cacheKey, now()->addSeconds($ttlSeconds), function () use ($user): array {
            $session = $this->client->login((string) $user->moodle_username, (string) $user->moodle_password);

            try {
                return $this->academicService->getGrades($session);
            } finally {
                $session->close();
            }
        });
    }

    public function clearForUser(User $user): void
    {
        Cache::forget(self::ACADEMIC_CACHE_PREFIX.$user->id);
        Cache::forget(self::GRADES_CACHE_PREFIX.$user->id);
    }

    /**
     * @param  array<int, array<string, mixed>>  $courses
     * @return array<int, array<string, mixed>>
     */
    private function collectAllTasks(MoodleSession $session, array $courses): array
    {
        $tasks = [];

        foreach (array_values($courses) as $course) {
            $courseId = (int) ($course['id'] ?? 0);
            if ($courseId <= 0) {
                continue;
            }

            $courseTasks = $this->academicService->getAssignmentsByCourse($session, $courseId);

            foreach ($courseTasks as $task) {
                $statusText = mb_strtolower((string) ($task['estado'] ?? ''));
                $rawGradeText = trim((string) ($task['calificacion'] ?? ''));
                $gradeText = mb_strtolower($rawGradeText);
                $feedbackText = trim((string) ($task['retroalimentacion'] ?? ''));
                $entregada = $this->isDeliveredFromStatus($statusText);
                $hasNumericGrade = $this->formatNumericGrade($rawGradeText) !== null;
                $hasRubricGrade = $this->extractRubricGrade($rawGradeText) !== null;
                $gradeLooksLikeFeedback = str_contains($gradeText, 'retroaliment')
                    || str_contains($gradeText, 'feedback')
                    || str_contains($gradeText, 'comentario')
                    || str_contains($gradeText, 'observacion');
                $hasExplicitGrade = $this->isExplicitGradeValue($gradeText, $gradeLooksLikeFeedback);
                $hasFeedbackAsGrade = $this->hasMeaningfulFeedback($feedbackText)
                    || $this->hasMeaningfulFeedback($rawGradeText);
                $calificada = $hasNumericGrade || $hasRubricGrade || $hasExplicitGrade || $hasFeedbackAsGrade;

                $tasks[] = [
                    'asignatura_id' => $courseId,
                    'asignatura_nombre' => (string) ($course['nombre'] ?? ''),
                    'tema' => $task['tema'] ?? null,
                    'nombre' => $task['nombre'] ?? null,
                    'fecha_entrega' => $task['fecha_entrega'] ?? null,
                    'fecha_iso' => null,
                    'estado' => $task['estado'] ?? null,
                    'calificacion' => $task['calificacion'] ?? null,
                    'retroalimentacion' => $feedbackText !== ''
                        ? $feedbackText
                        : ($gradeLooksLikeFeedback ? (string) ($task['calificacion'] ?? null) : null),
                    'url' => $task['url'] ?? null,
                    'entregada' => $entregada,
                    'calificada' => $calificada,
                    'pendiente' => ! $entregada && ! $calificada,
                ];
            }
        }

        return $tasks;
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

    private function isExplicitGradeValue(string $gradeText, bool $gradeLooksLikeFeedback): bool
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

    /**
     * @param  array<int, array<string, mixed>>  $tasks
     * @param  array<int, array<string, mixed>>  $gradeReport
     * @return array<int, array<string, mixed>>
     */
    private function enrichTasksWithGradeReport(array $tasks, array $gradeReport): array
    {
        $reportByCourseAndName = [];

        foreach ($gradeReport as $courseReport) {
            if (! is_array($courseReport)) {
                continue;
            }

            $courseId = (int) ($courseReport['asignatura_id'] ?? 0);
            if ($courseId <= 0) {
                continue;
            }

            $items = is_array($courseReport['items'] ?? null) ? $courseReport['items'] : [];
            foreach ($items as $item) {
                if (! is_array($item)) {
                    continue;
                }

                $itemName = $this->normalizeTextKey((string) ($item['item'] ?? ''));
                if ($itemName === '') {
                    continue;
                }

                $hasGradeSignal = $this->gradeReportItemHasGradeSignal($item);
                $feedbackText = trim((string) ($item['retroalimentacion_texto'] ?? ''));

                if (! isset($reportByCourseAndName[$courseId][$itemName])) {
                    $reportByCourseAndName[$courseId][$itemName] = [
                        'hasGradeSignal' => $hasGradeSignal,
                        'feedback' => $feedbackText,
                    ];

                    continue;
                }

                $current = $reportByCourseAndName[$courseId][$itemName];
                $reportByCourseAndName[$courseId][$itemName] = [
                    'hasGradeSignal' => (bool) ($current['hasGradeSignal'] ?? false) || $hasGradeSignal,
                    'feedback' => trim((string) ($current['feedback'] ?? '')) !== ''
                        ? (string) ($current['feedback'] ?? '')
                        : $feedbackText,
                ];
            }
        }

        foreach ($tasks as $index => $task) {
            if (! is_array($task)) {
                continue;
            }

            $courseId = (int) ($task['asignatura_id'] ?? 0);
            $taskName = $this->normalizeTextKey((string) ($task['nombre'] ?? ''));

            if ($courseId <= 0 || $taskName === '') {
                continue;
            }

            $reportMatch = $this->findGradeReportMatch($courseId, $taskName, $reportByCourseAndName);
            if (! is_array($reportMatch) || ! ((bool) ($reportMatch['hasGradeSignal'] ?? false))) {
                continue;
            }

            $tasks[$index]['calificada'] = true;
            $tasks[$index]['pendiente'] = false;

            $feedback = trim((string) ($reportMatch['feedback'] ?? ''));
            if ($feedback !== '') {
                $tasks[$index]['retroalimentacion'] = $feedback;
            }
        }

        return $tasks;
    }

    /**
     * @param array<int, array<string, array{hasGradeSignal:bool, feedback:string}>> $reportByCourseAndName
     * @return array{hasGradeSignal:bool, feedback:string}|null
     */
    private function findGradeReportMatch(int $courseId, string $taskKey, array $reportByCourseAndName): ?array
    {
        $courseMap = $reportByCourseAndName[$courseId] ?? null;
        if (! is_array($courseMap) || $courseMap === []) {
            return null;
        }

        if (isset($courseMap[$taskKey])) {
            return $courseMap[$taskKey];
        }

        $bestMatch = null;
        $bestScore = 0.0;

        foreach ($courseMap as $itemKey => $itemValue) {
            if (! is_array($itemValue)) {
                continue;
            }

            $score = 0.0;
            $taskLen = mb_strlen($taskKey);
            $itemLen = mb_strlen((string) $itemKey);

            if ($taskLen >= 8 && $itemLen >= 8 && (str_contains($taskKey, (string) $itemKey) || str_contains((string) $itemKey, $taskKey))) {
                $score = 95.0;
            } else {
                similar_text($taskKey, (string) $itemKey, $percent);
                $score = (float) $percent;
            }

            if ($score > $bestScore) {
                $bestScore = $score;
                $bestMatch = $itemValue;
            }
        }

        return $bestScore >= 72.0 ? $bestMatch : null;
    }

    /**
     * @param array<string, mixed> $item
     */
    private function gradeReportItemHasGradeSignal(array $item): bool
    {
        $gradeText = trim((string) ($item['calificacion_texto'] ?? ''));
        $feedbackText = trim((string) ($item['retroalimentacion_texto'] ?? ''));

        $hasNumericGrade = $this->formatNumericGrade($gradeText) !== null;
        $hasRubricGrade = $this->extractRubricGrade($gradeText) !== null;

        $gradeLooksLikeFeedback = str_contains(mb_strtolower($gradeText), 'retroaliment')
            || str_contains(mb_strtolower($gradeText), 'feedback')
            || str_contains(mb_strtolower($gradeText), 'comentario')
            || str_contains(mb_strtolower($gradeText), 'observacion');

        $hasExplicitGrade = $this->isExplicitGradeValue(mb_strtolower($gradeText), $gradeLooksLikeFeedback);
        $hasFeedbackAsGrade = $this->hasMeaningfulFeedback($feedbackText);

        return $hasNumericGrade || $hasRubricGrade || $hasExplicitGrade || $hasFeedbackAsGrade;
    }

    private function normalizeTextKey(string $value): string
    {
        $normalized = mb_strtolower(trim((string) preg_replace('/\s+/u', ' ', $value)));
        $normalized = Str::ascii($normalized);
        $normalized = (string) preg_replace('/[^a-z0-9]+/u', ' ', $normalized);

        return trim((string) preg_replace('/\s+/u', ' ', $normalized));
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

    private function extractProfileAvatarUrl(MoodleSession $session): ?string
    {
        $serviceAvatar = $this->fetchProfileAvatarUrlFromService($session);
        if ($serviceAvatar !== null) {
            return $serviceAvatar;
        }

        $candidateUrls = [];

        if ($session->userid) {
            $candidateUrls[] = $this->client->get($session, '/user/profile.php', ['id' => $session->userid], traceStep: 'profile_avatar_'.$session->userid);
        }

        $candidateUrls[] = $this->client->get($session, '/my/', traceStep: 'my_page_avatar');

        foreach ($candidateUrls as $html) {
            if (! is_string($html) || $html === '') {
                continue;
            }

            if (preg_match('/<img[^>]+class="[^"]*userpicture[^"]*"[^>]+src="([^"]+)"/i', $html, $match) === 1) {
                $src = html_entity_decode((string) $match[1], ENT_QUOTES | ENT_HTML5);
                return $src !== '' ? $src : null;
            }
        }

        return null;
    }

    private function fetchProfileAvatarUrlFromService(MoodleSession $session): ?string
    {
        $userData = $this->fetchProfileUserDataFromService($session);
        if (! is_array($userData)) {
            return null;
        }

        $avatar = $userData['profileimageurl'] ?? $userData['profileimageurlsmall'] ?? null;
        if (! is_string($avatar) || $avatar === '') {
            return null;
        }

        return html_entity_decode($avatar, ENT_QUOTES | ENT_HTML5);
    }

    private function extractStudentName(MoodleSession $session): ?string
    {
        $userData = $this->fetchProfileUserDataFromService($session);
        if (! is_array($userData)) {
            return null;
        }

        $fullName = trim((string) ($userData['fullname'] ?? ''));

        if ($fullName !== '') {
            return $fullName;
        }

        $firstName = trim((string) ($userData['firstname'] ?? ''));
        if ($firstName === '') {
            $firstName = trim((string) ($userData['firstnamephonetic'] ?? ''));
        }

        $lastName = trim((string) ($userData['lastname'] ?? ''));
        if ($lastName === '') {
            $lastName = trim((string) ($userData['lastnamephonetic'] ?? ''));
        }

        if ($firstName !== '' || $lastName !== '') {
            return trim($firstName.' '.$lastName);
        }

        return null;
    }

    private function extractStudentEmail(MoodleSession $session): ?string
    {
        $userData = $this->fetchProfileUserDataFromService($session);
        if (! is_array($userData)) {
            return null;
        }

        $email = trim((string) ($userData['email'] ?? ''));

        return $email !== '' ? $email : null;
    }

    private function extractAcademicCourse(MoodleSession $session): ?string
    {
        $userData = $this->fetchProfileUserDataFromService($session);
        if (is_array($userData)) {
            $customFields = $userData['customfields'] ?? [];
            if (is_array($customFields)) {
                foreach ($customFields as $field) {
                    if (! is_array($field)) {
                        continue;
                    }

                    $fieldName = mb_strtolower(trim((string) (($field['shortname'] ?? $field['name'] ?? ''))));
                    $fieldValue = trim((string) ($field['value'] ?? ''));

                    if ($fieldValue === '') {
                        continue;
                    }

                    if (
                        str_contains($fieldName, 'curso')
                        || str_contains($fieldName, 'semestre')
                        || str_contains($fieldName, 'nivel')
                        || str_contains($fieldName, 'programa')
                        || str_contains($fieldName, 'carrera')
                    ) {
                        return $fieldValue;
                    }
                }
            }

            $department = trim((string) ($userData['department'] ?? ''));
            if ($department !== '') {
                return $department;
            }
        }

        return null;
    }

    /**
     * @param  array<int, array<string, mixed>>  $courses
     */
    private function extractAcademicYear(MoodleSession $session, array $courses): ?string
    {
        $userData = $this->fetchProfileUserDataFromService($session);
        if (is_array($userData)) {
            $customFields = $userData['customfields'] ?? [];
            if (is_array($customFields)) {
                foreach ($customFields as $field) {
                    if (! is_array($field)) {
                        continue;
                    }

                    $fieldValue = trim((string) ($field['value'] ?? ''));
                    if ($fieldValue === '') {
                        continue;
                    }

                    $parsedYear = $this->extractAcademicYearFromText($fieldValue);
                    if ($parsedYear !== null) {
                        return $parsedYear;
                    }
                }
            }
        }

        foreach ($courses as $course) {
            $courseName = trim((string) ($course['nombre'] ?? ''));
            if ($courseName === '') {
                continue;
            }

            $parsedYear = $this->extractAcademicYearFromText($courseName);
            if ($parsedYear !== null) {
                return $parsedYear;
            }
        }

        return null;
    }

    private function extractAcademicYearFromText(string $text): ?string
    {
        if (preg_match('/\b(20\d{2})\s*[\/\-]\s*(20\d{2})\b/u', $text, $match) === 1) {
            return $match[1].'/'.$match[2];
        }

        if (preg_match('/\b(20\d{2})\b/u', $text, $match) === 1) {
            $startYear = (int) $match[1];

            return $startYear.'/'.($startYear + 1);
        }

        return null;
    }

    /**
     * @return array<string, mixed>|null
     */
    private function fetchProfileUserDataFromService(MoodleSession $session): ?array
    {
        if (! $session->userid) {
            return null;
        }

        try {
            $payload = json_encode([
                [
                    'index' => 0,
                    'methodname' => 'core_user_get_users_by_field',
                    'args' => [
                        'field' => 'id',
                        'values' => [(string) $session->userid],
                    ],
                ],
            ], JSON_THROW_ON_ERROR);

            $response = $this->client->post(
                $session,
                '/lib/ajax/service.php?sesskey='.$session->sesskey.'&info=core_user_get_users_by_field',
                $payload,
                [
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                    'X-Requested-With' => 'XMLHttpRequest',
                ],
                traceStep: 'user_avatar_service',
            );

            $decoded = json_decode($response, true);
            $userData = $decoded[0]['data'][0] ?? null;
            if (! is_array($userData)) {
                return null;
            }

            return $userData;
        } catch (\Throwable) {
            return null;
        }
    }
}
