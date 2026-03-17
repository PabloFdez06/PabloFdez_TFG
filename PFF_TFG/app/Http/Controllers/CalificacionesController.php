<?php

namespace App\Http\Controllers;

use App\Services\Moodle\Exceptions\MoodleAuthenticationException;
use App\Services\Moodle\Exceptions\MoodleRequestException;
use App\Services\Moodle\MoodleUserAcademicCache;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CalificacionesController extends Controller
{
    public function __construct(
        private readonly MoodleUserAcademicCache $cache,
    ) {
    }

    public function index(Request $request): Response
    {
        $user = $request->user();
        $moodleConnected = (bool) ($user?->moodle_username && $user?->moodle_password);

        $gradeCards = [];
        $summary = [
            'subjects' => 0,
            'average' => 0,
            'passed' => 0,
            'pending' => 0,
        ];
        $profileAvatarUrl = null;
        $pageError = null;

        if ($moodleConnected) {
            try {
                $academicPayload = $this->cache->getForUser($user);
                $grades = $this->cache->getGradesForUser($user);

                $profileAvatarUrl = is_string($academicPayload['profileAvatarUrl'] ?? null)
                    ? $academicPayload['profileAvatarUrl']
                    : null;

                $gradeCards = $this->buildGradeCards($grades);
                $summary = $this->buildSummary($gradeCards);
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
            'profileAvatarUrl' => $profileAvatarUrl,
            'gradeCards' => $gradeCards,
            'summary' => $summary,
            'pageError' => $pageError,
        ]);
    }

    /**
     * @param  array<int, array<string, mixed>>  $grades
     * @return array<int, array<string, mixed>>
     */
    private function buildGradeCards(array $grades): array
    {
        $cards = [];

        foreach ($grades as $gradeSet) {
            $items = is_array($gradeSet['items'] ?? null) ? $gradeSet['items'] : [];
            $numeric = array_values(array_filter(array_map(fn (array $item): ?float => isset($item['calificacion']) ? (float) $item['calificacion'] : null, $items), fn (?float $v): bool => $v !== null));
            $percentages = array_values(array_filter(array_map(fn (array $item): ?float => isset($item['porcentaje']) ? (float) $item['porcentaje'] : null, $items), fn (?float $v): bool => $v !== null));

            $average = $numeric === [] ? 0 : (float) round(array_sum($numeric) / count($numeric), 2);
            $progress = $percentages === [] ? 0 : (int) round(array_sum($percentages) / count($percentages));

            $status = $progress >= 70 ? 'Aprobada' : ($progress > 0 ? 'En progreso' : 'Sin nota');

            $cards[] = [
                'subject' => (string) ($gradeSet['asignatura_nombre'] ?? 'Asignatura'),
                'average' => $average,
                'progress' => $progress,
                'itemsCount' => count($items),
                'status' => $status,
            ];
        }

        usort($cards, fn (array $a, array $b): int => $b['progress'] <=> $a['progress']);

        return $cards;
    }

    /**
     * @param  array<int, array<string, mixed>>  $cards
     * @return array<string, int|float>
     */
    private function buildSummary(array $cards): array
    {
        $subjects = count($cards);
        $averages = array_values(array_filter(array_map(fn (array $card): float => (float) ($card['average'] ?? 0), $cards), fn (float $v): bool => $v > 0));
        $average = $averages === [] ? 0 : round(array_sum($averages) / count($averages), 2);

        $passed = count(array_filter($cards, fn (array $card): bool => (int) ($card['progress'] ?? 0) >= 70));
        $pending = count(array_filter($cards, fn (array $card): bool => (int) ($card['progress'] ?? 0) < 70));

        return [
            'subjects' => $subjects,
            'average' => $average,
            'passed' => $passed,
            'pending' => $pending,
        ];
    }
}
