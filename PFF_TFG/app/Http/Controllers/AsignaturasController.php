<?php

namespace App\Http\Controllers;

use App\Services\Moodle\Exceptions\MoodleAuthenticationException;
use App\Services\Moodle\Exceptions\MoodleRequestException;
use App\Services\Moodle\MoodleUserAcademicCache;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AsignaturasController extends Controller
{
    public function __construct(
        private readonly MoodleUserAcademicCache $cache,
    ) {
    }

    public function index(Request $request): Response
    {
        if (function_exists('set_time_limit')) {
            @set_time_limit(120);
        }

        @ini_set('max_execution_time', '120');

        $user = $request->user();
        $moodleConnected = (bool) ($user?->moodle_username && $user?->moodle_password);

        $courseCards = [];
        $summary = [
            'courses' => 0,
            'averageProgress' => 0,
            'highProgress' => 0,
        ];
        $pageError = null;
        $profileAvatarUrl = null;
        $studentName = $user?->name;

        if ($moodleConnected) {
            try {
                $payload = $this->cache->getForUser($user);
                $courses = is_array($payload['courses'] ?? null) ? $payload['courses'] : [];
                $tasks = is_array($payload['tasks'] ?? null) ? $payload['tasks'] : [];
                $profileAvatarUrl = is_string($payload['profileAvatarUrl'] ?? null) ? $payload['profileAvatarUrl'] : null;
                $studentName = is_string($payload['studentName'] ?? null) && trim((string) $payload['studentName']) !== ''
                    ? (string) $payload['studentName']
                    : $studentName;
                $taskStats = $this->collectTaskStatsByCourse($tasks);

                $courseCards = $this->buildCourseCards($courses, $taskStats);
                $summary = $this->buildSummary($courses, $taskStats);
            } catch (MoodleAuthenticationException $exception) {
                $pageError = $exception->getMessage();
            } catch (MoodleRequestException $exception) {
                $pageError = $exception->getMessage();
            } catch (\Throwable) {
                $pageError = 'No se pudieron cargar las asignaturas en este momento.';
            }
        }

        return Inertia::render('asignaturas', [
            'moodleConnected' => $moodleConnected,
            'studentName' => $studentName,
            'courseCards' => $courseCards,
            'summary' => $summary,
            'profileAvatarUrl' => $profileAvatarUrl,
            'pageError' => $pageError,
        ]);
    }

    /**
     * @param  array<int, array<string, mixed>>  $tasks
     * @return array<int, array{total:int,pending:int}>
     */
    private function collectTaskStatsByCourse(array $tasks): array
    {
        $stats = [];

        foreach ($tasks as $task) {
            $courseId = (int) ($task['asignatura_id'] ?? 0);
            if ($courseId <= 0) {
                continue;
            }

            if (! isset($stats[$courseId])) {
                $stats[$courseId] = ['total' => 0, 'pending' => 0];
            }

            $stats[$courseId]['total']++;

            $status = mb_strtolower((string) ($task['estado'] ?? ''));
            $isDelivered = str_contains($status, 'entregado') || str_contains($status, 'enviado') || str_contains($status, 'submitted');
            if (! $isDelivered) {
                $stats[$courseId]['pending']++;
            }
        }

        return $stats;
    }

    /**
     * @param  array<int, array<string, mixed>>  $courses
     * @param  array<int, array{total:int,pending:int}>  $taskStats
     * @return array<int, array<string, mixed>>
     */
    private function buildCourseCards(array $courses, array $taskStats): array
    {
        $cards = [];
        $variants = ['featured', 'tall', 'wide', 'compact', 'accent'];

        foreach (array_values($courses) as $index => $course) {
            $courseId = (int) ($course['id'] ?? 0);
            $variant = $index === 0 ? 'featured' : $variants[$index % count($variants)];
            $stats = $taskStats[$courseId] ?? ['total' => 0, 'pending' => 0];

            $cards[] = [
                'id' => $courseId,
                'code' => 'CRS-'.$courseId,
                'title' => (string) ($course['nombre'] ?? 'Asignatura'),
                'meta' => (string) ($course['categoria'] ?? 'Sin categoria'),
                'teacher' => (string) ($course['docente'] ?? 'Docente no disponible'),
                'image' => is_string($course['imagen'] ?? null) && $course['imagen'] !== '' ? (string) $course['imagen'] : null,
                'progress' => (int) ($course['progreso'] ?? 0),
                'tasksTotal' => (int) $stats['total'],
                'tasksPending' => (int) $stats['pending'],
                'variant' => $variant,
            ];
        }

        return $cards;
    }

    /**
     * @param  array<int, array<string, mixed>>  $courses
     * @return array<string, int|string>
     */
    private function buildSummary(array $courses, array $taskStats): array
    {
        $courseCount = count($courses);
        $progressValues = array_values(array_filter(array_map(fn (array $course): int => (int) ($course['progreso'] ?? 0), $courses), fn (int $v): bool => $v > 0));
        $averageProgress = $progressValues === []
            ? 0
            : (int) round(array_sum($progressValues) / count($progressValues));
        $highProgress = count(array_filter($progressValues, fn (int $value): bool => $value >= 75));
        $pendingTasks = array_sum(array_map(fn (array $item): int => (int) ($item['pending'] ?? 0), $taskStats));

        return [
            'courses' => $courseCount,
            'averageProgress' => $averageProgress,
            'highProgress' => $highProgress,
            'pendingTasks' => $pendingTasks,
        ];
    }
}
