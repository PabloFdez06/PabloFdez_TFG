<?php

namespace App\Http\Controllers\Moodle;

use App\Http\Controllers\Controller;
use App\Services\Moodle\Exceptions\MoodleAuthenticationException;
use App\Services\Moodle\Exceptions\MoodleRequestException;
use App\Services\Moodle\MoodleCasClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class MoodleConnectionController extends Controller
{
    public function __construct(private readonly MoodleCasClient $client)
    {
    }

    public function connect(Request $request): JsonResponse|RedirectResponse
    {
        $data = $request->validate([
            'moodle_username' => ['required', 'string', 'max:255'],
            'moodle_password' => ['required', 'string', 'max:255'],
        ]);

        try {
            $session = $this->client->login($data['moodle_username'], $data['moodle_password']);
            $session->close();
        } catch (MoodleAuthenticationException) {
            return $this->respond(
                $request,
                ['message' => 'Credenciales Moodle invalidas.'],
                ['moodle_password' => 'Credenciales Moodle invalidas.'],
                422,
            );
        } catch (MoodleRequestException $exception) {
            $message = $exception->getMessage() === 'Missing Moodle/CAS configuration.'
                ? 'Falta la configuracion Moodle en .env. Define MOODLE_URL o MOODLE_BASE_URL. Si CAS va en otro dominio, define MOODLE_CAS_BASE (o CAS_BASE).'
                : $exception->getMessage();

            return $this->respond(
                $request,
                ['message' => $message],
                ['moodle_username' => $message],
                422,
            );
        }

        $request->user()->update([
            'moodle_username' => $data['moodle_username'],
            'moodle_password' => $data['moodle_password'],
        ]);

        return $this->respond($request, ['message' => 'Cuenta Moodle conectada correctamente.']);
    }

    public function debug(Request $request): JsonResponse
    {
        abort_if(app()->isProduction(), 404);

        $data = $request->validate([
            'moodle_username' => ['required', 'string', 'max:255'],
            'moodle_password' => ['required', 'string', 'max:255'],
        ]);

        try {
            $session = $this->client->login($data['moodle_username'], $data['moodle_password'], withTrace: true);
            $response = [
                'message' => 'Login CAS completado.',
                'sesskey_detectado' => $session->sesskey !== '',
                'userid' => $session->userid,
                'trace' => $session->trace,
            ];
            $session->close();

            return response()->json($response);
        } catch (\Throwable $exception) {
            return response()->json([
                'message' => 'Fallo en debug CAS.',
                'error' => $exception->getMessage(),
            ], 422);
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, string>|null  $errors
     */
    private function respond(Request $request, array $payload, ?array $errors = null, int $status = 200): JsonResponse|RedirectResponse
    {
        if ($request->expectsJson() || $request->is('api/*')) {
            if ($errors) {
                return response()->json(['message' => $payload['message'] ?? 'Error', 'errors' => $errors], $status);
            }

            return response()->json($payload, $status);
        }

        if ($errors) {
            return back()->withErrors($errors);
        }

        return back()->with('success', $payload['message'] ?? 'OK');
    }
}
