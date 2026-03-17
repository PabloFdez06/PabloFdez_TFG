<?php

namespace App\Services\Ai;

use Illuminate\Support\Facades\Http;

class EisenhowerMatrixAiService
{
    /**
     * @param array<int, array<string, mixed>> $tasks
     * @return array{matrix: array<string, array<int, array<string, string|null>>>, explanation: ?string, provider: string}
     */
    public function analyze(array $tasks, bool $includeExplanation = false): array
    {
        $apiKey = trim((string) config('services.ai.api_key', ''));
        $baseUrl = rtrim((string) config('services.ai.base_url', ''), '/');
        $model = (string) config('services.ai.model', 'gpt-4o-mini');
        $timeout = max(15, (int) config('services.ai.timeout', 45));

        if ($apiKey === '' || $baseUrl === '') {
            return [
                'matrix' => $this->emptyMatrix(),
                'explanation' => $includeExplanation
                    ? 'No se pudo generar la explicacion con IA porque falta la configuracion del proveedor en el servidor.'
                    : null,
                'provider' => 'unconfigured',
            ];
        }

        $taskPayload = array_map(static function (array $task): array {
            return [
                'title' => (string) ($task['title'] ?? ''),
                'course' => (string) ($task['course'] ?? ''),
                'days_remaining' => isset($task['daysRemaining']) ? (int) $task['daysRemaining'] : null,
                'due_label' => (string) ($task['dueLabel'] ?? ''),
                'status' => (string) ($task['status'] ?? ''),
                'link' => is_string($task['link'] ?? null) ? (string) $task['link'] : null,
            ];
        }, $tasks);

        $systemPrompt = <<<'PROMPT'
Eres un asistente academico especializado en productividad estudiantil.
Clasifica tareas en una matriz de Eisenhower de forma coherente para un estudiante:
- doNow: urgente e importante
- schedule: importante no urgente
- delegate: urgente de menor impacto academico
- optimize: ni urgente ni importante

Reglas:
- Solo usar las tareas recibidas.
- No inventar tareas.
- Mantener un tono directo y util.
- Si una tarea no tiene fecha, usar estado y contexto para decidir.
- Responder SIEMPRE en JSON valido, sin markdown.
PROMPT;

        $userPrompt = json_encode([
            'request' => 'Clasifica las tareas en la matriz y devuelve explicacion breve por tarea.',
            'include_explanation' => $includeExplanation,
            'tasks' => $taskPayload,
            'expected_output_schema' => [
                'matrix' => [
                    'doNow' => [['title' => 'string', 'reason' => 'string']],
                    'schedule' => [['title' => 'string', 'reason' => 'string']],
                    'delegate' => [['title' => 'string', 'reason' => 'string']],
                    'optimize' => [['title' => 'string', 'reason' => 'string']],
                ],
                'explanation' => 'string|null',
            ],
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        try {
            $response = Http::withToken($apiKey)
                ->acceptJson()
                ->timeout($timeout)
                ->post($baseUrl.'/chat/completions', [
                    'model' => $model,
                    'temperature' => 0.2,
                    'response_format' => ['type' => 'json_object'],
                    'messages' => [
                        ['role' => 'system', 'content' => $systemPrompt],
                        ['role' => 'user', 'content' => $userPrompt],
                    ],
                ]);

            if (! $response->ok()) {
                return [
                    'matrix' => $this->emptyMatrix(),
                    'explanation' => $includeExplanation ? 'No se pudo generar la explicacion IA en este momento.' : null,
                    'provider' => 'error',
                ];
            }

            $content = (string) data_get($response->json(), 'choices.0.message.content', '');
            $decoded = json_decode($this->stripCodeBlock($content), true);

            if (! is_array($decoded)) {
                return [
                    'matrix' => $this->emptyMatrix(),
                    'explanation' => $includeExplanation ? 'La respuesta de IA no fue valida.' : null,
                    'provider' => 'invalid-json',
                ];
            }

            $matrix = $this->hydrateMatrixFromAi($decoded, $tasks);
            $explanation = $includeExplanation ? $this->extractExplanation($decoded) : null;

            return [
                'matrix' => $matrix,
                'explanation' => $explanation,
                'provider' => 'ai',
            ];
        } catch (\Throwable) {
            return [
                'matrix' => $this->emptyMatrix(),
                'explanation' => $includeExplanation ? 'No se pudo contactar con el servicio de IA.' : null,
                'provider' => 'exception',
            ];
        }
    }

    private function extractExplanation(array $decoded): ?string
    {
        $text = data_get($decoded, 'explanation');

        if (! is_string($text)) {
            return null;
        }

        $trimmed = trim($text);

        return $trimmed !== '' ? $trimmed : null;
    }

    /**
     * @param array<string, mixed> $decoded
     * @param array<int, array<string, mixed>> $tasks
     * @return array<string, array<int, array<string, string|null>>>
     */
    private function hydrateMatrixFromAi(array $decoded, array $tasks): array
    {
        $taskMap = [];

        foreach ($tasks as $task) {
            $title = trim((string) ($task['title'] ?? ''));
            if ($title === '') {
                continue;
            }

            $key = mb_strtolower($title);

            if (! isset($taskMap[$key])) {
                $taskMap[$key] = [];
            }

            $taskMap[$key][] = $task;
        }

        $quadrants = ['doNow', 'schedule', 'delegate', 'optimize'];
        $result = $this->emptyMatrix();

        foreach ($quadrants as $quadrant) {
            $items = data_get($decoded, 'matrix.'.$quadrant, []);
            if (! is_array($items)) {
                continue;
            }

            foreach ($items as $item) {
                if (! is_array($item)) {
                    continue;
                }

                $title = trim((string) ($item['title'] ?? ''));
                if ($title === '') {
                    continue;
                }

                $reason = trim((string) ($item['reason'] ?? ''));
                $taskData = $this->consumeTaskByTitle($taskMap, $title);

                if ($taskData === null) {
                    continue;
                }

                $result[$quadrant][] = [
                    'title' => (string) ($taskData['title'] ?? $title),
                    'course' => (string) ($taskData['course'] ?? 'Sin asignatura'),
                    'reason' => $reason !== '' ? $reason : 'Priorizada por analisis IA.',
                    'link' => is_string($taskData['link'] ?? null) ? (string) $taskData['link'] : null,
                ];

                if (count($result[$quadrant]) >= 3) {
                    break;
                }
            }
        }

        $remaining = [];
        foreach ($taskMap as $bucket) {
            foreach ($bucket as $task) {
                $remaining[] = $task;
            }
        }

        foreach ($remaining as $task) {
            if (count($result['schedule']) >= 3) {
                break;
            }

            $result['schedule'][] = [
                'title' => (string) ($task['title'] ?? 'Tarea'),
                'course' => (string) ($task['course'] ?? 'Sin asignatura'),
                'reason' => 'Priorizacion de respaldo mientras se completa el analisis IA.',
                'link' => is_string($task['link'] ?? null) ? (string) $task['link'] : null,
            ];
        }

        return $result;
    }

    /**
     * @param array<string, array<int, array<string, mixed>>> $taskMap
     * @return array<string, mixed>|null
     */
    private function consumeTaskByTitle(array &$taskMap, string $title): ?array
    {
        $key = mb_strtolower(trim($title));

        if (! isset($taskMap[$key]) || $taskMap[$key] === []) {
            return null;
        }

        $task = array_shift($taskMap[$key]);

        if ($taskMap[$key] === []) {
            unset($taskMap[$key]);
        }

        return $task;
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

    private function stripCodeBlock(string $content): string
    {
        $trimmed = trim($content);

        if (! str_starts_with($trimmed, '```')) {
            return $trimmed;
        }

        $trimmed = preg_replace('/^```[a-zA-Z0-9_-]*\s*/', '', $trimmed) ?? $trimmed;
        $trimmed = preg_replace('/```$/', '', $trimmed) ?? $trimmed;

        return trim($trimmed);
    }
}
