<?php

namespace App\Http\Controllers\Moodle;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MoodlePreferencesController extends Controller
{
    /**
     * @var array<string, bool>
     */
    private array $defaults = [
        '48h_antes' => true,
        '24h_antes' => true,
        'mismo_dia' => true,
        'email' => true,
        'push' => false,
    ];

    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        $saved = is_array($user->moodle_notification_preferences) ? $user->moodle_notification_preferences : [];

        return response()->json(array_merge($this->defaults, $saved));
    }

    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            '48h_antes' => ['sometimes', 'boolean'],
            '24h_antes' => ['sometimes', 'boolean'],
            'mismo_dia' => ['sometimes', 'boolean'],
            'email' => ['sometimes', 'boolean'],
            'push' => ['sometimes', 'boolean'],
        ]);

        $merged = array_merge($this->defaults, $data);
        $request->user()->update(['moodle_notification_preferences' => $merged]);

        return response()->json([
            'message' => 'Preferencias guardadas correctamente.',
            'data' => $merged,
        ]);
    }
}
