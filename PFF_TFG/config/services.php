<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'moodle' => [
        'base_url' => env('MOODLE_BASE_URL', env('MOODLE_URL')),
        'cas_base' => env('MOODLE_CAS_BASE', env('CAS_BASE')),
        'cas_login_url' => env('MOODLE_CAS_LOGIN_URL', env('MOODLE_LOGIN_URL', env('MOODLE_CAS_URL'))),
        'cas_service_url' => env('MOODLE_CAS_SERVICE_URL', env('MOODLE_SERVICE_URL')),
        'verify_ssl' => env('MOODLE_VERIFY_SSL', false),
        'timeout' => (int) env('MOODLE_TIMEOUT', 20),
        'retry_attempts' => (int) env('MOODLE_RETRY_ATTEMPTS', 4),
        'retry_delay_ms' => (int) env('MOODLE_RETRY_DELAY_MS', 1000),
        'cache_ttl_seconds' => (int) env('MOODLE_CACHE_TTL_SECONDS', 300),
        'cache_stale_ttl_seconds' => (int) env('MOODLE_CACHE_STALE_TTL_SECONDS', 900),
        'cache_lock_ttl_seconds' => (int) env('MOODLE_CACHE_LOCK_TTL_SECONDS', 120),
        'cache_lock_wait_ms' => (int) env('MOODLE_CACHE_LOCK_WAIT_MS', 2000),
        'cache_lock_poll_ms' => (int) env('MOODLE_CACHE_LOCK_POLL_MS', 200),
        'cache_task_course_limit' => (int) env('MOODLE_CACHE_TASK_COURSE_LIMIT', 50),
        'cache_task_budget_seconds' => (float) env('MOODLE_CACHE_TASK_BUDGET_SECONDS', 22),
    ],

    'ai' => [
        'base_url' => env('AI_BASE_URL', 'https://api.openai.com/v1'),
        'api_key' => env('AI_API_KEY'),
        'model' => env('AI_MODEL', 'gpt-4o-mini'),
        'timeout' => (int) env('AI_TIMEOUT', 45),
        'verify_ssl' => env('AI_VERIFY_SSL', true),
    ],

];
