<?php

namespace App\Services\Moodle;

use CurlHandle;

class MoodleSession
{
    public function __construct(
        public CurlHandle $handle,
        public string $sesskey,
        public ?int $userid,
        public array $trace = [],
    ) {
    }

    public function close(): void
    {
        curl_close($this->handle);
    }

    public function __destruct()
    {
        if (is_resource($this->handle) || $this->handle instanceof CurlHandle) {
            @curl_close($this->handle);
        }
    }
}
