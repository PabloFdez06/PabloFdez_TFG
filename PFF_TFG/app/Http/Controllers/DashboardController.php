<?php

namespace App\Http\Controllers;

use App\Services\EisenhowerMatrixService;
use App\Services\Ai\EisenhowerMatrixAiService;
use App\Services\Moodle\Exceptions\MoodleAuthenticationException;
use App\Services\Moodle\Exceptions\MoodleRequestException;
use App\Services\Moodle\SpanishDateParser;
use App\Services\Moodle\MoodleUserAcademicCache;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        private readonly MoodleUserAcademicCache $cache,
        private readonly SpanishDateParser $dateParser,
        private readonly EisenhowerMatrixService $matrixResolver,
        private readonly EisenhowerMatrixAiService $matrixAi,
    ) {
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        $moodleConnected = (bool) ($user?->moodle_username && $user?->moodle_password);

        $quickCards = [];
        $timeline = [];
        $hero = [
            'reference' => 'SIN ACTIVIDAD',
            'title' => 'Sin entregas programadas',
            'highlight' => 'Conecta Moodle para comenzar',
            'remaining' => '--',
            'priority' => 'Normal',
            'link' => null,
        ];
        $eisenhower = [
            'doNow' => [],
            'schedule' => [],
            'delegate' => [],
            'optimize' => [],
        ];
        $matrixExplanation = null;
        $matrixProvider = 'none';
        $dashboardError = null;
        $profileAvatarUrl = null;
        $studentName = $user?->name;
        $matrixMode = $request->query('matrix_mode') === 'ai' ? 'ai' : 'basic';
        $matrixRunAi = $matrixMode === 'ai' && $request->boolean('matrix_run');
        $matrixPreferences = $matrixMode === 'ai' ? trim((string) session('matrix_ai_preferences', '')) : '';
        $matrixIncludeExplanation = $matrixMode === 'ai'
            ? (bool) session('matrix_include_explanation', true)
            : false;
        $matrixApiKey = $matrixMode === 'ai' ? trim((string) session('matrix_ai_api_key', '')) : '';

        if ($moodleConnected) {
            try {
                $payload = $this->cache->getForUser($user);
                $courses = is_array($payload['courses'] ?? null) ? $payload['courses'] : [];
                $tasks = is_array($payload['tasks'] ?? null) ? $payload['tasks'] : [];
                $profileAvatarUrl = is_string($payload['profileAvatarUrl'] ?? null) ? $payload['profileAvatarUrl'] : null;
                $studentName = is_string($payload['studentName'] ?? null) && trim((string) $payload['studentName']) !== ''
                    ? (string) $payload['studentName']
                    : $studentName;

                $quickCards = $this->buildQuickCards($courses, $tasks);
                $timeline = $this->buildTimeline($tasks);
                $hero = $this->buildHero($tasks);

                $matrixTasks = $this->buildOpenTasksForMatrix($tasks);
                if ($matrixMode === 'basic') {
                    $eisenhower = $this->matrixResolver->classify($matrixTasks);
                    $matrixProvider = 'rule-based';
                } else {
                    $eisenhower = [
                        'doNow' => [],
                        'schedule' => [],
                        'delegate' => [],
                        'optimize' => [],
                    ];
                    $matrixProvider = 'ai-idle';
                }

                if ($matrixRunAi) {
                    if ($matrixApiKey === '') {
                        $matrixProvider = 'missing-api-key';
                        $matrixExplanation = 'Debes introducir una API key valida para generar la matriz con IA.';
                    } else {
                        $analysis = $this->matrixAi->analyze(
                            $matrixTasks,
                            $matrixIncludeExplanation,
                            $matrixApiKey,
                            $matrixPreferences,
                        );
                        $aiMatrix = is_array($analysis['matrix'] ?? null) ? $analysis['matrix'] : [];
                        $eisenhower = $aiMatrix;

                        $matrixExplanation = is_string($analysis['explanation'] ?? null) ? $analysis['explanation'] : null;
                        $matrixProvider = is_string($analysis['provider'] ?? null) ? $analysis['provider'] : 'none';
                    }
                }
            } catch (MoodleAuthenticationException $exception) {
                $dashboardError = $exception->getMessage();
            } catch (MoodleRequestException $exception) {
                $dashboardError = $exception->getMessage();
            } catch (\Throwable) {
                $dashboardError = 'No se pudieron cargar los datos del dashboard en este momento.';
            }
        }

        return Inertia::render('dashboard', [
            'moodleConnected' => $moodleConnected,
            'studentName' => $studentName,
            'quickCards' => $quickCards,
            'timeline' => $timeline,
            'hero' => $hero,
            'eisenhower' => $eisenhower,
            'matrixExplanation' => $matrixExplanation,
            'matrixProvider' => $matrixProvider,
            'matrixMode' => $matrixMode,
            'matrixPreferences' => $matrixPreferences,
            'matrixIncludeExplanation' => $matrixIncludeExplanation,
            'profileAvatarUrl' => $profileAvatarUrl,
            'dashboardError' => $dashboardError,
        ]);
    }

    public function updateMatrix(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'matrix_mode' => ['required', 'in:basic,ai'],
            'ai_api_key' => ['nullable', 'string', 'max:400'],
            'matrix_preferences' => ['nullable', 'string', 'max:1600'],
            'matrix_include_explanation' => ['nullable', 'boolean'],
        ]);

        $mode = (string) ($validated['matrix_mode'] ?? 'basic');

        if ($mode === 'basic') {
            $request->session()->forget([
                'matrix_ai_api_key',
                'matrix_ai_preferences',
                'matrix_include_explanation',
            ]);

            return redirect()->route('dashboard', ['matrix_mode' => 'basic']);
        }

        $apiKey = trim((string) ($validated['ai_api_key'] ?? ''));
        if ($apiKey === '') {
            $apiKey = trim((string) $request->session()->get('matrix_ai_api_key', ''));
        }

        $preferences = trim((string) ($validated['matrix_preferences'] ?? ''));
        $includeExplanation = (bool) ($validated['matrix_include_explanation'] ?? true);

        if ($apiKey === '') {
            return redirect()
                ->route('dashboard', ['matrix_mode' => 'ai'])
                ->withErrors([
                    'ai_api_key' => 'Sin API key no se puede ejecutar la matriz con IA.',
                ]);
        }

        $request->session()->put('matrix_ai_api_key', $apiKey);
        $request->session()->put('matrix_ai_preferences', $preferences);
        $request->session()->put('matrix_include_explanation', $includeExplanation);

        return redirect()->route('dashboard', ['matrix_mode' => 'ai', 'matrix_run' => 1]);
    }

    /**
     * @param  array<int, array<string, mixed>>  $courses
     * @param  array<int, array<string, mixed>>  $tasks
     * @return array<int, array<string, mixed>>
     */
    private function buildQuickCards(array $courses, array $tasks): array
    {
        $statsByCourse = [];

        foreach ($tasks as $task) {
            $courseId = (int) ($task['asignatura_id'] ?? 0);
            if ($courseId <= 0) {
                continue;
            }

            if (! isset($statsByCourse[$courseId])) {
                $statsByCourse[$courseId] = [
                    'pending' => 0,
                    'done' => 0,
                ];
            }

            if ((bool) ($task['pendiente'] ?? false)) {
                $statsByCourse[$courseId]['pending']++;
            }

            if ((bool) ($task['entregada'] ?? false) || (bool) ($task['calificada'] ?? false)) {
                $statsByCourse[$courseId]['done']++;
            }
        }

        $cards = [];

        foreach (array_values($courses) as $index => $course) {
            if ($index >= 4) {
                break;
            }

            $courseId = (int) ($course['id'] ?? 0);
            $courseStats = $statsByCourse[$courseId] ?? ['pending' => 0, 'done' => 0];
            $pending = (int) $courseStats['pending'];
            $done = (int) $courseStats['done'];

            $status = 'Sin actividad reciente';
            if ($pending > 0) {
                $status = $pending.' tareas pendientes';
            } elseif ($done > 0) {
                $status = $done.' tareas completadas';
            }

            $cards[] = [
                'code' => 'CRS-'.$courseId,
                'title' => (string) ($course['nombre'] ?? 'Asignatura'),
                'status' => $status,
                'muted' => $index === 1,
                'accent' => $index === 3,
            ];
        }

        return $cards;
    }

    /**
     * @param  array<int, array<string, mixed>>  $tasks
     * @return array<int, array<string, mixed>>
     */
    private function buildTimeline(array $tasks): array
    {
        $now = CarbonImmutable::now();
        $dated = [];

        foreach ($tasks as $task) {
            $date = $this->resolveTaskDate($task);
            $days = isset($task['dias_restantes']) ? (int) $task['dias_restantes'] : null;

            if ($days === null && $date) {
                $days = $now->diffInDays($date, false);
            }

            if ($date === null && $days === null) {
                continue;
            }

            $dated[] = [
                'task' => $task,
                'date' => $date,
                'days' => $days,
            ];
        }

        usort($dated, function (array $a, array $b) use ($now): int {
            $aDays = $a['days'];
            $bDays = $b['days'];

            if ($aDays !== null && $bDays !== null) {
                $aFuture = $aDays >= 0;
                $bFuture = $bDays >= 0;

                if ($aFuture !== $bFuture) {
                    return $aFuture ? -1 : 1;
                }

                if ($aDays === $bDays) {
                    return 0;
                }

                return $aDays < $bDays ? -1 : 1;
            }

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

            $aFuture = $aDate->greaterThanOrEqualTo($now);
            $bFuture = $bDate->greaterThanOrEqualTo($now);

            if ($aFuture !== $bFuture) {
                return $aFuture ? -1 : 1;
            }

            if ($aFuture) {
                return $aDate->lessThan($bDate) ? -1 : 1;
            }

            return abs($aDate->diffInSeconds($now, false)) <=> abs($bDate->diffInSeconds($now, false));
        });

        $timeline = [];

        foreach ($dated as $index => $item) {
            if ($index >= 10) {
                break;
            }

            $task = $item['task'];
            $date = $item['date'];
            $days = $item['days'];

            if ($date) {
                $dayLabel = match (true) {
                    $date->isToday() => 'HOY',
                    $date->isTomorrow() => 'MANANA',
                    default => mb_strtoupper($date->translatedFormat('d M')),
                };
                $timeLabel = $date->format('H:i');
                $isCurrent = $date->greaterThanOrEqualTo($now) && $index === 0;
            } else {
                $dayLabel = $days !== null ? (($days <= 0) ? 'HOY' : 'EN '.$days.' DIAS') : 'SIN FECHA';
                $timeLabel = '--:--';
                $isCurrent = $days !== null && $days >= 0 && $index === 0;
            }

            $timeline[] = [
                'when' => $dayLabel.' · '.$timeLabel,
                'title' => (string) ($task['nombre'] ?? 'Actividad'),
                'description' => (string) ($task['asignatura_nombre'] ?? 'Sin asignatura'),
                'link' => (string) ($task['url'] ?? ''),
                'current' => $isCurrent,
            ];
        }

        return $timeline;
    }

    /**
     * @param  array<int, array<string, mixed>>  $tasks
     * @return array<string, string>
     */
    private function buildHero(array $tasks): array
    {
        $now = CarbonImmutable::now();

        $dated = [];
        foreach ($tasks as $task) {
            $date = $this->resolveTaskDate($task);
            $days = isset($task['dias_restantes']) ? (int) $task['dias_restantes'] : null;

            if ($days === null && $date) {
                $days = $now->diffInDays($date, false);
            }

            if (! $date && $days === null) {
                continue;
            }

            $dated[] = ['task' => $task, 'date' => $date, 'days' => $days];
        }

        usort($dated, function (array $a, array $b) use ($now): int {
            $aDays = $a['days'];
            $bDays = $b['days'];

            if ($aDays !== null && $bDays !== null) {
                $aFuture = $aDays >= 0;
                $bFuture = $bDays >= 0;

                if ($aFuture !== $bFuture) {
                    return $aFuture ? -1 : 1;
                }

                if ($aDays === $bDays) {
                    return 0;
                }

                return $aDays < $bDays ? -1 : 1;
            }

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

            $aFuture = $aDate->greaterThanOrEqualTo($now);
            $bFuture = $bDate->greaterThanOrEqualTo($now);

            if ($aFuture !== $bFuture) {
                return $aFuture ? -1 : 1;
            }

            return $aDate->lessThan($bDate) ? -1 : 1;
        });

        $task = $dated[0]['task'] ?? null;

        if (! is_array($task)) {
            $task = $this->pickMostUrgentWithoutIso($tasks);
        }

        if (! is_array($task)) {
            return [
                'reference' => 'SIN ACTIVIDAD',
                'title' => 'Sin entregas programadas',
                'highlight' => 'No hay tareas con fecha',
                'remaining' => '--',
                'priority' => 'Normal',
                'link' => null,
            ];
        }

        $days = isset($task['dias_restantes']) ? (int) $task['dias_restantes'] : 99;

        if ($days === 99 && is_string($task['fecha_iso'] ?? null) && $task['fecha_iso'] !== '') {
            try {
                $days = $now->diffInDays(CarbonImmutable::parse((string) $task['fecha_iso']), false);
            } catch (\Throwable) {
                $days = 99;
            }
        }
        $remaining = match (true) {
            $days < 0 => 'Vencida',
            $days === 0 => 'Hoy',
            default => $days.' dias',
        };

        $priority = match (true) {
            $days <= 1 => 'Critica',
            $days <= 3 => 'Alta',
            default => 'Normal',
        };

        return [
            'reference' => 'ACT-'.$task['asignatura_id'],
            'title' => (string) ($task['nombre'] ?? 'Actividad'),
            'highlight' => (string) ($task['asignatura_nombre'] ?? 'Sin asignatura'),
            'remaining' => $remaining,
            'priority' => $priority,
            'link' => is_string($task['url'] ?? null) && $task['url'] !== '' ? (string) $task['url'] : null,
        ];
    }

    /**
     * @param  array<int, array<string, mixed>>  $tasks
     * @return array<int, array<string, mixed>>
     */
    private function buildOpenTasksForMatrix(array $tasks): array
    {
        $openTasks = [];

        foreach ($tasks as $task) {
            $status = mb_strtolower((string) ($task['estado'] ?? ''));
            $delivered = (bool) ($task['entregada'] ?? false)
                || (bool) ($task['calificada'] ?? false)
                || str_contains($status, 'entregado')
                || str_contains($status, 'enviado')
                || str_contains($status, 'submitted');

            if ($delivered) {
                continue;
            }

            $title = trim((string) ($task['nombre'] ?? ''));
            if ($title === '') {
                continue;
            }

            $days = isset($task['dias_restantes']) ? (int) $task['dias_restantes'] : null;
            $date = $this->resolveTaskDate($task);

            if ($days === null && $date !== null) {
                $days = CarbonImmutable::now()->diffInDays($date, false);
            }

            $openTasks[] = [
                'title' => $title,
                'course' => (string) ($task['asignatura_nombre'] ?? 'Sin asignatura'),
                'daysRemaining' => $days,
                'dueLabel' => is_string($task['fecha_entrega'] ?? null) ? (string) $task['fecha_entrega'] : '',
                'status' => (string) ($task['estado'] ?? ''),
                'link' => is_string($task['url'] ?? null) && $task['url'] !== '' ? (string) $task['url'] : null,
            ];
        }

        return $openTasks;
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
                // Ignore and fallback to raw delivery string parsing.
            }
        }

        $raw = is_string($task['fecha_entrega'] ?? null) ? (string) $task['fecha_entrega'] : null;
        $parsedIso = $this->dateParser->toIso($raw);

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
     * @param  array<int, array<string, mixed>>  $tasks
     * @return array<string, mixed>|null
     */
    private function pickMostUrgentWithoutIso(array $tasks): ?array
    {
        if ($tasks === []) {
            return null;
        }

        usort($tasks, function (array $a, array $b): int {
            $aPending = (bool) ($a['pendiente'] ?? false);
            $bPending = (bool) ($b['pendiente'] ?? false);

            if ($aPending !== $bPending) {
                return $aPending ? -1 : 1;
            }

            return strcmp((string) ($a['fecha_entrega'] ?? ''), (string) ($b['fecha_entrega'] ?? ''));
        });

        return $tasks[0] ?? null;
    }

    /**
     * @param array<string, mixed> $matrix
     */
    private function matrixHasTasks(array $matrix): bool
    {
        $quadrants = ['doNow', 'schedule', 'delegate', 'optimize'];

        foreach ($quadrants as $quadrant) {
            $tasks = $matrix[$quadrant] ?? null;

            if (is_array($tasks) && $tasks !== []) {
                return true;
            }
        }

        return false;
    }
}
