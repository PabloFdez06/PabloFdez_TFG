<?php

use App\Http\Controllers\AsignaturasController;
use App\Http\Controllers\CalificacionesController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\TareasController;
use App\Http\Controllers\Moodle\MoodleConnectionController;
use App\Http\Controllers\Moodle\MoodleConsoleController;
use App\Http\Controllers\Moodle\MoodleDataController;
use App\Http\Controllers\Moodle\MoodleMediaController;
use App\Http\Controllers\Moodle\MoodlePreferencesController;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

Route::get('/', function (): Response|RedirectResponse {
    if (auth()->check()) {
        return redirect()->route('dashboard');
    }

    return Inertia::render('welcome');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::post('dashboard/matrix', [DashboardController::class, 'updateMatrix'])->name('dashboard.matrix.update');
    Route::get('panel', [DashboardController::class, 'index'])->name('panel');
    Route::get('asignaturas', [AsignaturasController::class, 'index'])->name('asignaturas.index');
    Route::get('calificaciones', [CalificacionesController::class, 'index'])->name('calificaciones.index');
    Route::get('tareas', [TareasController::class, 'index'])->name('tareas.index');
    Route::get('moodle-console', [MoodleConsoleController::class, 'index'])->name('moodle.console');
    Route::post('moodle-console/preferences', [MoodleConsoleController::class, 'updatePreferences'])->name('moodle.console.preferences.update');
    Route::get('moodle/media', [MoodleMediaController::class, 'show'])->name('moodle.media');

    Route::post('moodle-connect', [MoodleConnectionController::class, 'connect'])->name('moodle.connect');
    Route::post('moodle-debug', [MoodleConnectionController::class, 'debug'])->name('moodle.debug');

    Route::prefix('api')->group(function (): void {
        Route::get('asignaturas', [MoodleDataController::class, 'asignaturas'])->name('moodle.asignaturas');
        Route::get('tareas/{courseId}', [MoodleDataController::class, 'tareas'])->name('moodle.tareas');
        Route::get('all-tareas', [MoodleDataController::class, 'allTareas'])->name('moodle.all_tareas');
        Route::get('calificaciones', [MoodleDataController::class, 'calificaciones'])->name('moodle.calificaciones');

        Route::get('configuracion', [MoodlePreferencesController::class, 'show'])->name('moodle.configuracion.show');
        Route::post('configuracion', [MoodlePreferencesController::class, 'update'])->name('moodle.configuracion.update');
    });
});

require __DIR__.'/settings.php';
