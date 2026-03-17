<?php

use App\Services\Moodle\Parsers\GradesParser;

it('parses grade rows and normalizes numbers', function (): void {
    $html = <<<'HTML'
    <table class="user-grade generaltable">
      <tbody>
        <tr>
          <td>Examen parcial</td>
          <td>8,75</td>
          <td>0-10</td>
          <td>87,5 %</td>
        </tr>
      </tbody>
    </table>
    HTML;

    $items = (new GradesParser())->parse($html);

    expect($items)->toHaveCount(1);
    expect($items[0]['item'])->toBe('Examen parcial');
    expect($items[0]['calificacion'])->toBe(8.75);
    expect($items[0]['porcentaje'])->toBe(87.5);
    expect($items[0]['rango'])->toBe('0-10');
});
