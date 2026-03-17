# Especificacion funcional actual de integracion Moodle (base para migrar a nuevo repositorio)

## 1. Objetivo del documento

Este documento describe, de forma estrictamente basada en el codigo actual del proyecto, todas las funcionalidades implementadas para integracion con Moodle/CAS, obtencion de datos academicos y preferencias de usuario.

Tambien incluye un prompt listo para Copilot para reimplementar estas funcionalidades en un nuevo proyecto, aplicando mejores practicas.

## 2. Alcance real implementado hoy

### 2.1 Flujo principal en uso (web Laravel + panel)

1. Login local en la app mediante username y password.
2. Conexion de cuenta Moodle (usuario y password Moodle) desde la pestana Configuracion.
3. Verificacion de credenciales Moodle mediante autenticacion CAS real.
4. Almacenamiento de usuario Moodle y password Moodle cifrada en base de datos.
5. Para cada endpoint academico, login fresco a Moodle y reutilizacion de la misma sesion cURL para extraer datos.
6. Obtencion de datos academicos:
- Asignaturas matriculadas.
- Tareas por asignatura.
- Tareas agregadas de todas las asignaturas (panel, calendario, estadisticas).
- Calificaciones por asignatura e item.
- Tutor/docente por asignatura para mostrar en tarjetas de la UI.
7. Gestion de preferencias de recordatorios y canales de notificacion.

### 2.2 Flujo legacy existente (API Sanctum)

Existe un flujo adicional en API con registro/login y guardado manual de cookies Moodle. Esta via convive en codigo pero no es la usada por la vista principal del panel.

## 3. Arquitectura tecnica actual (verificada)

### 3.1 Autenticacion Moodle/CAS

El helper de login usa cURL con cookies en memoria y sigue este flujo:

1. GET a CAS login con service apuntando a Moodle login authCAS.
2. Parseo de campos ocultos de CAS (execution, lt, _eventId=submit).
3. POST de credenciales a CAS.
4. Seguimiento de redirecciones hasta Moodle autenticado.
5. Extraccion de sesskey y userid desde HTML/JSON embebido.
6. Reutilizacion del mismo handle cURL para llamadas posteriores (manteniendo cookies de sesion).

Detalles tecnicos presentes en codigo:

- User-Agent tipo navegador real.
- Follow redirects habilitado.
- Cookie engine en memoria.
- Timeout configurado.
- SSL verify deshabilitado en desarrollo (actualmente false).
- Deteccion de credenciales invalidas por URL efectiva y patrones de error HTML CAS.

### 3.2 Obtencion de asignaturas

Se consume service.php de Moodle con sesskey y metodo:

- core_course_get_enrolled_courses_by_timeline_classification

Se mapean campos para frontend:

- id
- nombre (fullname)
- categoria (coursecategory)
- url (viewurl)
- imagen (courseimage)
- docente/tutor (extraido por scraping de participantes)
- progreso (progress redondeado)

### 3.3 Obtencion de tareas por asignatura

Se hace scraping HTML de:

- /mod/assign/index.php?id={courseId}

Se parsea tabla generaltable con DOMDocument/DOMXPath y se extrae:

- tema (seccion)
- nombre
- fecha_entrega
- estado
- calificacion
- url

Se soporta estructura con rowspan de seccion (filas de 5 o 4 celdas).

### 3.4 Obtencion agregada de tareas (todas las asignaturas)

Proceso:

1. Obtener asignaturas por service.php.
2. Recorrer cada asignatura y scrapear su assign index.
3. Enriquecer cada tarea con logica de negocio usada por frontend:
- fecha_iso parseada desde fecha en espanol.
- pendiente, entregada, calificada.
- dias_restantes.
- color por asignatura.

Respuesta final:

- asignaturas: lista para panel (id, nombre, color, imagen)
- tareas: lista global enriquecida

### 3.5 Obtencion de calificaciones

Proceso:

1. Obtener asignaturas por service.php.
2. Por cada asignatura, scrapear:
- /grade/report/user/index.php?id={courseId}
3. Parsear filas de tablas user-grade/generaltable.
4. Extraer por item:
- item
- calificacion (numerica cuando posible)
- rango
- porcentaje
- versiones de texto originales

Incluye normalizacion de formatos numericos con coma/punto y parseo de rangos tipo 0-100.

### 3.6 Tutor por asignatura

Se usa scraping de la pagina de participantes del curso para detectar el primer docente/tutor y enriquecer la respuesta de asignaturas.

### 3.7 Configuracion de usuario

Preferencias persistidas en JSON:

- 48h_antes
- 24h_antes
- mismo_dia
- email
- push

Con defaults cuando el usuario no tiene preferencias guardadas.

### 3.8 Endpoint de debug de CAS

Existe endpoint temporal que devuelve trazas de cURL y metadatos por pasos para diagnostico de login CAS.

## 4. Contrato de endpoints actuales

### 4.1 Rutas web/publicas

- GET / -> vista login
- GET /login -> vista login
- POST /login -> login local de app (firstOrCreate + Auth::login)
- GET /logout -> logout

Nota de comportamiento actual: el login local no valida password si el username ya existe, porque usa firstOrCreate y login directo.

### 4.2 Rutas web autenticadas (flujo principal)

- GET /panel
- POST /moodle-connect
- POST /moodle-debug
- GET /api/asignaturas
- GET /api/tareas/{courseId}
- GET /api/all-tareas
- GET /api/calificaciones
- GET /api/configuracion
- POST /api/configuracion

### 4.3 Rutas API legacy (Sanctum)

- POST /api/register
- POST /api/login
- POST /api/moodle/cookies (auth:sanctum)
- GET /api/tareas (auth:sanctum)

Estas rutas usan otro modelo de integracion por cookies guardadas manualmente y no son las que usa el panel principal actual.

## 5. Funcionalidades con valor para replicar en el nuevo proyecto

### 5.1 Conectar Moodle y autenticar usuario

Implementar login CAS real y extraccion de sesion activa reutilizable para llamadas posteriores en la misma peticion backend.

### 5.2 Obtener asignaturas

Consumir metodo interno de Moodle de cursos matriculados para alimentar listado de asignaturas en UI.

### 5.3 Obtener tareas por asignatura

Scraping de assign index para mostrar entregas, estado y calificacion textual por actividad.

### 5.4 Obtener todas las tareas agregadas

Unificar tareas de todas las asignaturas y enriquecerlas con campos derivados para dashboard, calendario y estadisticas.

### 5.5 Obtener calificaciones

Scraping del informe de usuario por asignatura y normalizacion de notas/rangos/porcentajes.

### 5.6 Persistir preferencias de notificacion

Guardar y leer preferencias por usuario para personalizacion de recordatorios.

## 6. Mejores practicas recomendadas para reimplementacion

Estas practicas deben aplicarse en el nuevo repositorio:

1. Separar en capas:
- Controllers: validacion y respuesta HTTP.
- Services: CAS/Moodle client y scraping.
- Parsers: DOM/XPath por tipo de pagina.
- DTOs/Transformers: salida estable para frontend.

2. Evitar logica larga en rutas:
- Mover closures de rutas a controladores y servicios testeables.

3. Gestion segura de credenciales:
- Guardar password Moodle siempre cifrada.
- Nunca exponer password ni cookies en logs.
- Rotar y revisar APP_KEY por entorno.

4. Seguridad de transporte:
- Activar verificacion SSL en produccion (no dejar verify false).
- Definir timeouts, retries y circuit-breaker para llamadas remotas.

5. Manejo de errores:
- Estandarizar codigos HTTP y estructura de error.
- Diferenciar errores de autenticacion, parseo, red y respuesta inesperada.

6. Observabilidad:
- Logging estructurado con correlation id por request.
- Metricas de exito/fallo por endpoint Moodle.

7. Robustez de scraping:
- Tolerar variaciones de HTML.
- Mantener tests de parser con fixtures reales.

8. Rendimiento:
- Cache corta para listados pesados cuando proceda.
- Posible paralelizacion controlada por curso si el entorno lo permite.

9. Calidad y pruebas:
- Tests unitarios para parsers.
- Tests de integracion para cliente CAS/Moodle.
- Tests contractuales para respuestas API al frontend.

10. Compatibilidad de datos:
- Mantener nombres de campos esperados por frontend o versionar API.

## 7. Prompt listo para Copilot (copiar en el nuevo proyecto)

Usa este prompt tal cual para que Copilot implemente la misma funcionalidad con buenas practicas:

"""
Quiero que implementes en este nuevo proyecto la integracion Moodle/CAS con el mismo alcance funcional del sistema de referencia, aplicando mejores practicas de arquitectura, seguridad y testing.

Alcance obligatorio:
1) Conexion Moodle por CAS con credenciales de usuario, conservando cookies de sesion en memoria para la misma ejecucion y extrayendo sesskey + userid.
2) Endpoint para conectar cuenta Moodle y almacenar moodle_username + moodle_password cifrada.
3) Endpoint para obtener asignaturas matriculadas via Moodle service.php con core_course_get_enrolled_courses_by_timeline_classification.
4) Endpoint para obtener tareas de una asignatura via scraping de /mod/assign/index.php?id={courseId}, extrayendo tema, nombre, fecha_entrega, estado, calificacion y url.
5) Endpoint para obtener todas las tareas de todas las asignaturas, con campos derivados: fecha_iso, pendiente, entregada, calificada, dias_restantes y color por asignatura.
6) Endpoint para obtener calificaciones via scraping de /grade/report/user/index.php?id={courseId}, devolviendo item, calificacion, rango, porcentaje y versiones de texto.
7) Endpoint para configuracion de preferencias (48h_antes, 24h_antes, mismo_dia, email, push) con GET y POST.
8) Incluir en la respuesta de asignaturas el tutor/docente real del curso (extraido por scraping de participantes), sin exponer endpoints raw de participantes.
9) Endpoint de debug de login CAS para diagnostico (solo habilitable en entorno no productivo).

Requisitos tecnicos y de buenas practicas:
- No implementes logica compleja en rutas; usa Controllers + Services + Parsers.
- Usa validaciones de entrada y respuestas de error consistentes.
- Cifra secretos y no los expongas en logs.
- En produccion, SSL verify debe estar habilitado.
- Incluye pruebas unitarias de parsers HTML y pruebas de integracion para flujo CAS/Moodle.
- Anade comentarios unicamente donde la logica no sea obvia.
- Manten la API estable y documentada con ejemplos de request/response.

Si algo no se puede obtener por API oficial Moodle, usa scraping robusto y tolerante a cambios menores de HTML.
"""

## 8. Nota final de migracion

Para migrar sin regresiones funcionales, el nuevo proyecto debe mantener como minimo los mismos contratos de datos consumidos por el frontend actual en panel, asignaturas, calendario, estadisticas y calificaciones.

En caso de no contenerlos, se crearan unos basicos, que cubran minimamente la salida que devolvera el backend.
