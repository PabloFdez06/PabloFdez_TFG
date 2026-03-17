<?php

use App\Http\Controllers\AsignaturasController;
use App\Http\Controllers\CalificacionesController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Moodle\MoodleConnectionController;
use App\Http\Controllers\Moodle\MoodleConsoleController;
use App\Http\Controllers\Moodle\MoodleDataController;
use App\Http\Controllers\Moodle\MoodlePreferencesController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('panel', [DashboardController::class, 'index'])->name('panel');
    Route::get('asignaturas', [AsignaturasController::class, 'index'])->name('asignaturas.index');
    Route::get('calificaciones', [CalificacionesController::class, 'index'])->name('calificaciones.index');
    Route::get('moodle-console', [MoodleConsoleController::class, 'index'])->name('moodle.console');
    Route::post('moodle-console/preferences', [MoodleConsoleController::class, 'updatePreferences'])->name('moodle.console.preferences.update');

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
