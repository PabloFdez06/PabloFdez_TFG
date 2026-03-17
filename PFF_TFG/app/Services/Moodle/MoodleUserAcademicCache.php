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
        * @return array{courses: array<int, array<string, mixed>>, tasks: array<int, array<string, mixed>>, profileAvatarUrl: ?string}
     */
    public function getForUser(User $user): array
    {
        $ttlSeconds = max(60, (int) config('services.moodle.cache_ttl_seconds', 300));
        $cacheKey = 'moodle:academic:user:'.$user->id;

        return Cache::remember($cacheKey, now()->addSeconds($ttlSeconds), function () use ($user): array {
            if (function_exists('set_time_limit')) {
                @set_time_limit(180);
            }

            $session = $this->client->login((string) $user->moodle_username, (string) $user->moodle_password);

            try {
                $courses = $this->academicService->getCourses($session, includeTutor: true);
                $tasks = $this->collectAllTasks($session, $courses);
                $profileAvatarUrl = $this->extractProfileAvatarUrl($session);

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
        $cacheKey = 'moodle:grades:user:'.$user->id;

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

            try {
                $courseTasks = $this->academicService->getAssignmentsByCourse($session, $courseId);
            } catch (\Throwable) {
                continue;
            }

            foreach ($courseTasks as $task) {
                $statusText = mb_strtolower((string) ($task['estado'] ?? ''));
                $gradeText = mb_strtolower((string) ($task['calificacion'] ?? ''));
                $entregada = str_contains($statusText, 'enviado') || str_contains($statusText, 'entregado') || str_contains($statusText, 'submitted');
                $calificada = $gradeText !== '' && $gradeText !== '-' && ! str_contains($gradeText, 'sin calificar');

                $tasks[] = [
                    'asignatura_id' => $courseId,
                    'asignatura_nombre' => (string) ($course['nombre'] ?? ''),
                    'nombre' => $task['nombre'] ?? null,
                    'fecha_entrega' => $task['fecha_entrega'] ?? null,
                    'fecha_iso' => null,
                    'estado' => $task['estado'] ?? null,
                    'calificacion' => $task['calificacion'] ?? null,
                    'url' => $task['url'] ?? null,
                    'entregada' => $entregada,
                    'calificada' => $calificada,
                    'pendiente' => ! $entregada && ! $calificada,
                ];
            }
        }

        return $tasks;
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

            $avatar = $userData['profileimageurl'] ?? $userData['profileimageurlsmall'] ?? null;
            if (! is_string($avatar) || $avatar === '') {
                return null;
            }

            return html_entity_decode($avatar, ENT_QUOTES | ENT_HTML5);
        } catch (\Throwable) {
            return null;
        }
    }
}
