<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\PasswordUpdateRequest;
comuse App\Services\Moodle\Exceptions\MoodleAuthenticationException;
use App\Services\Moodle\Exceptions\MoodleRequestException;
use App\Services\Moodle\MoodleUserAcademicCache;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Fortify\Features;

class SecurityController extends Controller
{
    public function __construct(
        private readonly MoodleUserAcademicCache $cache,
    ) {
    }

    /**
     * Show the user's configuration settings page.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user();
        $moodleConnected = (bool) ($user?->moodle_username && $user?->moodle_password);

        $profile = [
            'fullName' => $user?->name,
            'email' => $user?->email,
            'course' => null,
            'academicYear' => null,
            'avatarUrl' => null,
        ];

        $syncStatus = [
            'lastSyncLabel' => null,
            'message' => null,
        ];

        if ($moodleConnected) {
            try {
                $payload = $this->cache->getForUser($user);

                $profile['fullName'] = is_string($payload['studentName'] ?? null) && trim((string) $payload['studentName']) !== ''
                    ? (string) $payload['studentName']
                    : $profile['fullName'];
                $profile['email'] = is_string($payload['studentEmail'] ?? null) && trim((string) $payload['studentEmail']) !== ''
                    ? (string) $payload['studentEmail']
                    : $profile['email'];
                $profile['course'] = is_string($payload['academicCourse'] ?? null) && trim((string) $payload['academicCourse']) !== ''
                    ? (string) $payload['academicCourse']
                    : null;
                $profile['academicYear'] = is_string($payload['academicYear'] ?? null) && trim((string) $payload['academicYear']) !== ''
                    ? (string) $payload['academicYear']
                    : null;
                $profile['avatarUrl'] = is_string($payload['profileAvatarUrl'] ?? null) && trim((string) $payload['profileAvatarUrl']) !== ''
                    ? (string) $payload['profileAvatarUrl']
                    : null;
                $syncStatus['lastSyncLabel'] = now()->format('H:i');
            } catch (MoodleAuthenticationException|MoodleRequestException $exception) {
                $syncStatus['message'] = $exception->getMessage();
            } catch (\Throwable) {
                $syncStatus['message'] = 'No se pudo obtener la sincronización de Moodle en este momento.';
            }
        }

        $savedPreferences = is_array($user?->moodle_notification_preferences)
            ? $user->moodle_notification_preferences
            : [];

        $preferences = array_merge($this->defaultPreferences(), $savedPreferences);

        $cacheAssignmentsMinutes = max(1, (int) config('services.moodle.cache_asignaturas_minutes', 15));
        $cacheTasksMinutes = max(1, (int) config('services.moodle.cache_tareas_minutes', 5));

        return Inertia::render('settings/security', [
            'moodleConnected' => $moodleConnected,
            'profile' => $profile,
            'syncStatus' => $syncStatus,
            'preferences' => $preferences,
            'canManageTwoFactor' => Features::canManageTwoFactorAuthentication(),
            'twoFactorEnabled' => $user?->hasEnabledTwoFactorAuthentication() ?? false,
            'cacheConfig' => [
                'asignaturasMinutes' => $cacheAssignmentsMinutes,
                'tareasMinutes' => $cacheTasksMinutes,
            ],
        ]);
    }

    /**
     * Update the user's password.
     */
    public function update(PasswordUpdateRequest $request): RedirectResponse
    {
        $request->user()->update([
            'password' => $request->password,
        ]);

        return back();
    }

    public function updatePreferences(Request $request): RedirectResponse
    {
        $data = $request->validate([
            '48h_antes' => ['sometimes', 'boolean'],
            '24h_antes' => ['sometimes', 'boolean'],
            'mismo_dia' => ['sometimes', 'boolean'],
            'recordatorio_personalizado' => ['sometimes', 'boolean'],
            'recordatorio_personalizado_minutos' => ['sometimes', 'integer', 'min:1', 'max:10080'],
            'email' => ['sometimes', 'boolean'],
            'push' => ['sometimes', 'boolean'],
        ]);

        $merged = array_merge($this->defaultPreferences(), $data);

        if (! $merged['recordatorio_personalizado']) {
            $merged['recordatorio_personalizado_minutos'] = $this->defaultPreferences()['recordatorio_personalizado_minutos'];
        }

        $request->user()->update([
            'moodle_notification_preferences' => $merged,
        ]);

        return back()->with('success', 'Preferencias actualizadas.');
    }

    public function disconnectMoodle(Request $request): RedirectResponse
    {
        $this->cache->clearForUser($request->user());

        $request->user()->update([
            'moodle_username' => null,
            'moodle_password' => null,
        ]);

        return back()->with('success', 'Sesión de Moodle cerrada correctamente.');
    }

    public function destroyAccount(Request $request): RedirectResponse
    {
        $user = $request->user();

        Auth::logout();
        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }

    /**
     * @return array<string, bool|int>
     */
    private function defaultPreferences(): array
    {
        return [
            '48h_antes' => true,
            '24h_antes' => true,
            'mismo_dia' => true,
            'recordatorio_personalizado' => false,
            'recordatorio_personalizado_minutos' => 180,
            'email' => true,
            'push' => false,
        ];
    }
}
