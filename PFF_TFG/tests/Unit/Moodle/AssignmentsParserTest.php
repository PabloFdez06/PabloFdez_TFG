<?php

use App\Services\Moodle\Parsers\AssignmentsParser;

it('parses assignments table including section reuse', function (): void {
    $html = <<<'HTML'
    <table class="generaltable">
      <tbody>
        <tr>
          <td rowspan="2">Tema 1</td>
          <td><a href="https://moodle.local/mod/assign/view.php?id=10">Tarea 1</a></td>
          <td>20 marzo 2026 23:59</td>
          <td>No enviado</td>
          <td>-</td>
        </tr>
        <tr>
          <td><a href="https://moodle.local/mod/assign/view.php?id=11">Tarea 2</a></td>
          <td>22 marzo 2026 23:59</td>
          <td>Enviado</td>
          <td>9,5</td>
        </tr>
      </tbody>
    </table>
    HTML;

    $items = (new AssignmentsParser())->parse($html);

    expect($items)->toHaveCount(2);
    expect($items[0]['tema'])->toBe('Tema 1');
    expect($items[1]['tema'])->toBe('Tema 1');
    expect($items[1]['estado'])->toBe('Enviado');
    expect($items[0]['url'])->toBe('https://moodle.local/mod/assign/view.php?id=10');
});
