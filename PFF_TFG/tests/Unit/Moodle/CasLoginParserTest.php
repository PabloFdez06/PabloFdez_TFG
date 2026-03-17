<?php

use App\Services\Moodle\CasLoginParser;

it('parses hidden fields and session markers from cas html', function (): void {
    $html = <<<'HTML'
    <html><body>
        <form>
            <input type="hidden" name="lt" value="LT-123" />
            <input type="hidden" name="execution" value="EXE-1" />
            <input type="hidden" name="_eventId" value="submit" />
        </form>
        <script>window.__INITIAL_STATE__={"sesskey":"abc123","userid":45};</script>
    </body></html>
    HTML;

    $parser = new CasLoginParser();

    expect($parser->parseHiddenFields($html))->toMatchArray([
        'lt' => 'LT-123',
        'execution' => 'EXE-1',
        '_eventId' => 'submit',
    ]);

    expect($parser->extractSesskey($html))->toBe('abc123');
    expect($parser->extractUserid($html))->toBe(45);
});

it('detects invalid credentials patterns', function (): void {
    $parser = new CasLoginParser();

    expect($parser->looksLikeInvalidCredentials('https://cas.local/login', '<div class="error">Authentication failed</div>'))
        ->toBeTrue();
});
