<?php

use App\Http\Controllers\Settings\ProfileController;
use App\Http\Controllers\Settings\SecurityController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::redirect('settings', '/settings/security');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/security', [SecurityController::class, 'edit'])->name('security.edit');
    Route::redirect('settings/configuracion', '/settings/security');
    Route::post('settings/security/preferences', [SecurityController::class, 'updatePreferences'])->name('security.preferences.update');
    Route::post('settings/security/moodle/disconnect', [SecurityController::class, 'disconnectMoodle'])->name('security.moodle.disconnect');
    Route::delete('settings/security/account', [SecurityController::class, 'destroyAccount'])->name('security.account.destroy');

    Route::put('settings/password', [SecurityController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');

    Route::inertia('settings/appearance', 'settings/appearance')->name('appearance.edit');
});
