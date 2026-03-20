<?php

namespace App\Services\Moodle;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;

class MoodleUserAcademicCache
{
    public function __construct(
        private readonly MoodleCasClient $client,
        private readonly MoodleAcademicService $academicService,
        private readonly SpanishDateParser $dateParser,
    ) {
    }

    /**
        * @return array{courses: array<int, array<string, mixed>>, tasks: array<int, array<string, mixed>>, profileAvatarUrl: ?string, studentName: ?string}
     */
    public function getForUser(User $user): array
    {
        $ttlSeconds = max(60, (int) config('services.moodle.cache_ttl_seconds', 300));
        $cacheKey = 'moodle:academic:user:v4:'.$user->id;

        return Cache::remember($cacheKey, now()->addSeconds($ttlSeconds), function () use ($user): array {
            if (function_exists('set_time_limit')) {
                @set_time_limit(300);
            }

            @ini_set('max_execution_time', '300');

            $session = $this->client->login((string) $user->moodle_username, (string) $user->moodle_password);

            try {
                $courses = $this->academicService->getCourses($session, includeTutor: true);
                $tasks = $this->collectAllTasks($session, $courses);
                $profileAvatarUrl = $this->extractProfileAvatarUrl($session);
                $studentName = $this->extractStudentName($session);

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
        $cacheKey = 'moodle:grades:user:v2:'.$user->id;

        return Cache::remember($cacheKey, now()->addSeconds($ttlSeconds), function () use ($user): array {
            $session = $this->client->login((string) $user->moodle_username, (string) $user->moodle_password);

            try {
                return $this->academicService->getGrades($session);
            } finally {
                $session->close();
            }
        });
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
                $entregada = str_contains($statusText, 'enviado') || str_contains($statusText, 'entregado') || str_contains($statusText, 'submitted');
                $hasNumericGrade = $this->formatNumericGrade($rawGradeText) !== null;
                $hasRubricGrade = $this->extractRubricGrade($rawGradeText) !== null;
                $gradeLooksLikeFeedback = str_contains($gradeText, 'retroaliment')
                    || str_contains($gradeText, 'feedback')
                    || str_contains($gradeText, 'comentario')
                    || str_contains($gradeText, 'observacion');
                $hasFeedbackAsGrade = $this->hasMeaningfulFeedback($feedbackText)
                    || ($gradeLooksLikeFeedback && $this->hasMeaningfulFeedback($rawGradeText));
                $calificada = $hasNumericGrade || $hasRubricGrade || $hasFeedbackAsGrade;

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
