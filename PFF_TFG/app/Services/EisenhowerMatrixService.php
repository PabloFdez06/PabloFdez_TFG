<?php

namespace App\Services;

class EisenhowerMatrixService
{
    /**
     * @param array<int, array<string, mixed>> $tasks
     * @return array<string, array<int, array<string, string|null>>>
     */
    public function classify(array $tasks): array
    {
        $matrix = $this->emptyMatrix();
        $scoredTasks = [];

        foreach ($tasks as $task) {
            $title = trim((string) ($task['title'] ?? ''));

            if ($title === '') {
                continue;
            }

            $course = (string) ($task['course'] ?? 'Sin asignatura');
            $daysRemaining = isset($task['daysRemaining']) ? (int) $task['daysRemaining'] : null;
            $status = mb_strtolower((string) ($task['status'] ?? ''));

            $urgency = $this->calculateUrgency($daysRemaining, $status);
            $importance = $this->calculateImportance($title, $course, $daysRemaining, $status);
            $quadrant = $this->resolveQuadrant($urgency, $importance);

            $scoredTasks[] = [
                'quadrant' => $quadrant,
                'urgency' => $urgency,
                'importance' => $importance,
                'payload' => [
                    'title' => $title,
                    'course' => $course,
                    'reason' => $this->buildReason($quadrant, $daysRemaining, $status),
                    'link' => is_string($task['link'] ?? null) ? (string) $task['link'] : null,
                ],
            ];
        }

        usort($scoredTasks, static function (array $a, array $b): int {
            $aScore = ($a['urgency'] * 10) + $a['importance'];
            $bScore = ($b['urgency'] * 10) + $b['importance'];

            return $bScore <=> $aScore;
        });

        foreach ($scoredTasks as $scoredTask) {
            $quadrant = (string) $scoredTask['quadrant'];

            if (count($matrix[$quadrant]) >= 3) {
                continue;
            }

            $matrix[$quadrant][] = $scoredTask['payload'];
        }

        foreach ($scoredTasks as $scoredTask) {
            if (count($matrix['schedule']) >= 3) {
                break;
            }

            $payload = $scoredTask['payload'];
            $alreadyInMatrix = $this->taskAlreadyIncluded($matrix, (string) ($payload['title'] ?? ''), (string) ($payload['course'] ?? ''));

            if ($alreadyInMatrix) {
                continue;
            }

            $matrix['schedule'][] = [
                'title' => (string) ($payload['title'] ?? 'Tarea'),
                'course' => (string) ($payload['course'] ?? 'Sin asignatura'),
                'reason' => 'Planificada para no perder control de la carga academica.',
                'link' => is_string($payload['link'] ?? null) ? (string) $payload['link'] : null,
            ];
        }

        return $matrix;
    }

    private function calculateUrgency(?int $daysRemaining, string $status): int
    {
        $urgency = 0;

        if ($daysRemaining !== null) {
            $urgency += match (true) {
                $daysRemaining <= 0 => 4,
                $daysRemaining <= 1 => 3,
                $daysRemaining <= 3 => 2,
                $daysRemaining <= 7 => 1,
                default => 0,
            };
        }

        if (
            str_contains($status, 'atras')
            || str_contains($status, 'venc')
            || str_contains($status, 'urgent')
        ) {
            $urgency += 2;
        }

        return min(5, max(0, $urgency));
    }

    private function calculateImportance(string $title, string $course, ?int $daysRemaining, string $status): int
    {
        $importance = 0;
        $text = mb_strtolower($title.' '.$course);

        $highImpactKeywords = [
            'examen',
            'final',
            'parcial',
            'proyecto',
            'entrega',
            'evaluacion',
            'practica',
            'trabajo',
        ];

        foreach ($highImpactKeywords as $keyword) {
            if (str_contains($text, $keyword)) {
                $importance += 2;
                break;
            }
        }

        if ($daysRemaining !== null && $daysRemaining <= 3) {
            $importance += 1;
        }

        if ($daysRemaining === null && str_contains($status, 'pendiente')) {
            $importance += 1;
        }

        return min(5, max(0, $importance));
    }

    private function resolveQuadrant(int $urgency, int $importance): string
    {
        if ($urgency >= 3 && $importance >= 2) {
            return 'doNow';
        }

        if ($urgency < 3 && $importance >= 2) {
            return 'schedule';
        }

        if ($urgency >= 3 && $importance < 2) {
            return 'delegate';
        }

        return 'optimize';
    }

    private function buildReason(string $quadrant, ?int $daysRemaining, string $status): string
    {
        $daysText = $daysRemaining === null ? 'sin fecha concreta' : ($daysRemaining <= 0 ? 'vence hoy o esta vencida' : 'vence en '.$daysRemaining.' dias');

        return match ($quadrant) {
            'doNow' => 'Alta urgencia y alto impacto academico: '.$daysText.'.',
            'schedule' => 'Importante pero con margen de planificacion: '.$daysText.'.',
            'delegate' => 'Urgente de bajo impacto relativo: '.$daysText.'.',
            default => 'Baja urgencia e impacto: conviene reducir o reagendar.',
        };
    }

    /**
     * @param array<string, array<int, array<string, string|null>>> $matrix
     */
    private function taskAlreadyIncluded(array $matrix, string $title, string $course): bool
    {
        foreach ($matrix as $quadrantTasks) {
            foreach ($quadrantTasks as $task) {
                if ((string) ($task['title'] ?? '') === $title && (string) ($task['course'] ?? '') === $course) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * @return array<string, array<int, array<string, string|null>>>
     */
    private function emptyMatrix(): array
    {
        return [
            'doNow' => [],
            'schedule' => [],
            'delegate' => [],
            'optimize' => [],
        ];
    }
}
