<?php

namespace App\Http\Controllers\Moodle;

use App\Http\Controllers\Controller;
use App\Services\Moodle\Exceptions\MoodleAuthenticationException;
use App\Services\Moodle\Exceptions\MoodleRequestException;
use App\Services\Moodle\MoodleAcademicService;
use App\Services\Moodle\MoodleCasClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MoodleDataController extends Controller
{
    public function __construct(
        private readonly MoodleCasClient $client,
        private readonly MoodleAcademicService $academicService,
    ) {
    }

    public function asignaturas(Request $request): JsonResponse
    {
        try {
            [$username, $password] = $this->resolveCredentials($request);
            $session = $this->client->login($username, $password);

            $courses = $this->academicService->getCourses($session, includeTutor: true);

            return response()->json($courses);
        } catch (MoodleAuthenticationException $exception) {
            return response()->json(['message' => $exception->getMessage()], 401);
        } catch (MoodleRequestException $exception) {
            return response()->json(['message' => $exception->getMessage()], 502);
        } catch (\Throwable) {
            return response()->json(['message' => 'Error inesperado al obtener asignaturas.'], 500);
        } finally {
            if (isset($session)) {
                $session->close();
            }
        }
    }

    public function tareas(Request $request, int $courseId): JsonResponse
    {
        try {
            [$username, $password] = $this->resolveCredentials($request);
            $session = $this->client->login($username, $password);

            $tasks = $this->academicService->getAssignmentsByCourse($session, $courseId);

            return response()->json($tasks);
        } catch (MoodleAuthenticationException $exception) {
            return response()->json(['message' => $exception->getMessage()], 401);
        } catch (MoodleRequestException $exception) {
            return response()->json(['message' => $exception->getMessage()], 502);
        } catch (\Throwable) {
            return response()->json(['message' => 'Error inesperado al obtener tareas.'], 500);
        } finally {
            if (isset($session)) {
                $session->close();
            }
        }
    }

    public function allTareas(Request $request): JsonResponse
    {
        try {
            [$username, $password] = $this->resolveCredentials($request);
            $session = $this->client->login($username, $password);

            $payload = $this->academicService->getAllAssignments($session);

            return response()->json($payload);
        } catch (MoodleAuthenticationException $exception) {
            return response()->json(['message' => $exception->getMessage()], 401);
        } catch (MoodleRequestException $exception) {
            return response()->json(['message' => $exception->getMessage()], 502);
        } catch (\Throwable) {
            return response()->json(['message' => 'Error inesperado al obtener tareas agregadas.'], 500);
        } finally {
            if (isset($session)) {
                $session->close();
            }
        }
    }

    public function calificaciones(Request $request): JsonResponse
    {
        try {
            [$username, $password] = $this->resolveCredentials($request);
            $session = $this->client->login($username, $password);

            $grades = $this->academicService->getGrades($session);

            return response()->json($grades);
        } catch (MoodleAuthenticationException $exception) {
            return response()->json(['message' => $exception->getMessage()], 401);
        } catch (MoodleRequestException $exception) {
            return response()->json(['message' => $exception->getMessage()], 502);
        } catch (\Throwable) {
            return response()->json(['message' => 'Error inesperado al obtener calificaciones.'], 500);
        } finally {
            if (isset($session)) {
                $session->close();
            }
        }
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function resolveCredentials(Request $request): array
    {
        $user = $request->user();

        if (! $user || ! $user->moodle_username || ! $user->moodle_password) {
            throw new MoodleAuthenticationException('La cuenta Moodle no esta conectada.');
        }

        return [$user->moodle_username, $user->moodle_password];
    }
}
