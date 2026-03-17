<?php

use App\Models\User;
use App\Services\Moodle\MoodleCasClient;
use App\Services\Moodle\MoodleSession;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('connects moodle account and stores encrypted password', function (): void {
    $this->mock(MoodleCasClient::class, function ($mock): void {
        $mock->shouldReceive('login')
            ->once()
            ->andReturn(new MoodleSession(curl_init(), 'sess-123', 10));
    });

    $user = User::factory()->create();

    $response = $this->actingAs($user)
        ->postJson('/moodle-connect', [
            'moodle_username' => 'alumno',
            'moodle_password' => 'secreto123',
        ]);

    $response->assertOk()->assertJson([
        'message' => 'Cuenta Moodle conectada correctamente.',
    ]);

    $user->refresh();

    expect($user->moodle_username)->toBe('alumno');
    expect($user->getRawOriginal('moodle_password'))->not->toBe('secreto123');
    expect($user->moodle_password)->toBe('secreto123');
});
