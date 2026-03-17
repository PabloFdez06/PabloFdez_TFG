<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('returns defaults when user has no moodle preferences', function (): void {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->getJson('/api/configuracion');

    $response->assertOk()->assertJson([
        '48h_antes' => true,
        '24h_antes' => true,
        'mismo_dia' => true,
        'email' => true,
        'push' => false,
    ]);
});

it('updates moodle preferences', function (): void {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/configuracion', [
        '48h_antes' => false,
        '24h_antes' => true,
        'mismo_dia' => false,
        'email' => true,
        'push' => true,
    ]);

    $response->assertOk()->assertJsonPath('data.push', true);

    $user->refresh();
    expect($user->moodle_notification_preferences['push'])->toBeTrue();
});
