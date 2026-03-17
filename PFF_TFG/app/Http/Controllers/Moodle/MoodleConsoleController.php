<?php

namespace App\Http\Controllers\Moodle;

use App\Http\Controllers\Controller;
use App\Services\Moodle\Exceptions\MoodleAuthenticationException;
use App\Services\Moodle\Exceptions\MoodleRequestException;
use App\Services\Moodle\MoodleAcademicService;
use App\Services\Moodle\MoodleCasClient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MoodleConsoleController extends Controller
{
    public function __construct(
        private readonly MoodleCasClient $client,
        private readonly MoodleAcademicService $academicService,
    ) {
    }

    public function index(Request $request): Response
    {
        $data = $request->validate([
            'action' => ['nullable', 'in:asignaturas,tareas,all-tareas,calificaciones,configuracion'],
            'course_id' => ['nullable', 'integer', 'min:1'],
        ]);

        $endpointResponse = null;
        $endpointError = null;
        $selectedEndpoint = $data['action'] ?? null;
        $courseId = isset($data['course_id']) ? (int) $data['course_id'] : null;

        if ($selectedEndpoint) {
            try {
                $endpointResponse = $this->executeEndpoint(
                    $request,
                    $selectedEndpoint,
                    $courseId,
                );
            } catch (MoodleAuthenticationException $exception) {
                $endpointError = $exception->getMessage();
            } catch (MoodleRequestException $exception) {
                $endpointError = $exception->getMessage();
            } catch (\Throwable $exception) {
                $endpointError = 'Error inesperado: '.$exception->getMessage();
            }
        }

        $preferences = $request->user()->moodle_notification_preferences;
        if (! is_array($preferences)) {
            $preferences = [
                '48h_antes' => true,
                '24h_antes' => true,
                'mismo_dia' => true,
                'email' => true,
                'push' => false,
            ];
        }

        return Inertia::render('moodle/console', [
            'selectedEndpoint' => $selectedEndpoint,
            'courseId' => $courseId,
            'endpointResponse' => $endpointResponse,
            'endpointError' => $endpointError,
            'preferences' => $preferences,
            'moodleConnected' => (bool) ($request->user()->moodle_username && $request->user()->moodle_password),
            'moodleUsername' => $request->user()->moodle_username,
            'endpoints' => [
                ['key' => 'asignaturas', 'method' => 'GET', 'path' => '/api/asignaturas'],
                ['key' => 'tareas', 'method' => 'GET', 'path' => '/api/tareas/{courseId}'],
                ['key' => 'all-tareas', 'method' => 'GET', 'path' => '/api/all-tareas'],
                ['key' => 'calificaciones', 'method' => 'GET', 'path' => '/api/calificaciones'],
                ['key' => 'configuracion', 'method' => 'GET', 'path' => '/api/configuracion'],
            ],
        ]);
    }

    public function updatePreferences(Request $request): RedirectResponse
    {
        $data = $request->validate([
            '48h_antes' => ['sometimes', 'boolean'],
            '24h_antes' => ['sometimes', 'boolean'],
            'mismo_dia' => ['sometimes', 'boolean'],
            'email' => ['sometimes', 'boolean'],
            'push' => ['sometimes', 'boolean'],
        ]);

        $defaults = [
            '48h_antes' => true,
            '24h_antes' => true,
            'mismo_dia' => true,
            'email' => true,
            'push' => false,
        ];

        $request->user()->update([
            'moodle_notification_preferences' => array_merge($defaults, $data),
        ]);

        return back()->with('success', 'Preferencias de Moodle actualizadas.');
    }

    private function executeEndpoint(Request $request, string $endpoint, ?int $courseId): mixed
    {
        if ($endpoint === 'configuracion') {
            return $request->user()->moodle_notification_preferences ?? [];
        }

        $moodleUsername = $request->user()->moodle_username;
        $moodlePassword = $request->user()->moodle_password;

        if (! $moodleUsername || ! $moodlePassword) {
            throw new MoodleAuthenticationException('La cuenta Moodle no esta conectada.');
        }

        $session = $this->client->login($moodleUsername, $moodlePassword);

        try {
            return match ($endpoint) {
                'asignaturas' => $this->academicService->getCourses($session, includeTutor: true),
                'tareas' => $this->academicService->getAssignmentsByCourse($session, $courseId ?? throw new MoodleRequestException('Debes indicar course_id para ejecutar tareas.')),
                'all-tareas' => $this->academicService->getAllAssignments($session),
                'calificaciones' => $this->academicService->getGrades($session),
                default => throw new MoodleRequestException('Endpoint no soportado.'),
            };
        } finally {
            $session->close();
        }
    }
}
