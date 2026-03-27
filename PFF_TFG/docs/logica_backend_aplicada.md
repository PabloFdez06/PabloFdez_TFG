# Logica Backend Aplicada

## Objetivo del documento
En este documento explico, en primera persona, como he construido y organizado mi backend. Describo fichero a fichero que hace cada pieza, por que la tengo y como funciona en ejecucion real.

## Vision general de mi backend
Yo he estructurado el backend en capas:

1. Capa HTTP: controladores, requests y rutas.
2. Capa de dominio/servicios: logica de negocio y de integracion con Moodle/CAS.
3. Capa de parseo: extraccion robusta de datos HTML de Moodle.
4. Capa de modelo y persistencia: entidad User y migraciones.
5. Capa transversal: middleware, providers y configuracion.

Mi flujo principal es Inertia + Laravel + Fortify. La app trabaja con usuario autenticado localmente y, ademas, con credenciales Moodle cifradas para sincronizar datos academicos.

---

## 1) Controladores (Capa HTTP)

### app/Http/Controllers/Controller.php
- Que hace: es la clase base de mis controladores.
- Por que: mantengo el punto comun de herencia de Laravel para extender en el futuro.
- Como: actualmente esta vacia, pero toda mi capa HTTP hereda de ella.

### app/Http/Controllers/DashboardController.php
- Que hace: construye el dashboard principal con tarjetas rapidas, timeline, hero y matriz de Eisenhower.
- Por que: concentro en un unico endpoint toda la vista ejecutiva del alumno.
- Como:
  - Compruebo si Moodle esta conectado.
  - Pido payload academico cacheado a MoodleUserAcademicCache.
  - Transformo cursos y tareas a estructuras de frontend (quickCards, timeline, hero).
  - Clasifico tareas abiertas en matriz Eisenhower.
  - Soporto dos modos de matriz: basico (reglas) y AI (servicio externo).
  - Guardo preferencias AI en sesion y permito actualizarlas con updateMatrix.

### app/Http/Controllers/AsignaturasController.php
- Que hace: pinta la pagina de asignaturas con tarjetas, progreso y resumen academico.
- Por que: separar la vista de asignaturas del dashboard mejora mantenibilidad.
- Como:
  - Obtengo cursos y tareas desde el cache academico.
  - Calculo estadisticas por curso (total/pending).
  - Construyo cards y resumen global (media de progreso, pendientes, cursos avanzados).
  - Gestiono errores Moodle de forma controlada.

### app/Http/Controllers/CalificacionesController.php
- Que hace: genera la vista de calificaciones por asignatura e hitos.
- Por que: la logica de notas requiere normalizacion propia y presentacion por bloques.
- Como:
  - Obtengo snapshot academico y reutilizo gradeReport del payload cuando existe.
  - Solo si falta ese bloque, pido grades separados.
  - Construyo subjectCards por asignatura y resumen de items calificados.
  - Construyo milestones combinando proximas entregas y entregas recientes.
  - Uso MoodleAcademicRules para detectar feedback util y normalizar criterio.

### app/Http/Controllers/TareasController.php
- Que hace: genera la pagina de tareas, agrupacion por fecha, calendario y estado.
- Por que: necesito una capa de normalizacion para transformar datos heterogeneos de Moodle a un modelo estable de UI.
- Como:
  - Normalizo cada tarea (id, curso, unidad, fecha, estado, tono, enlace).
  - Agrupo por fecha ISO para el calendario.
  - Construyo tarjetas por asignatura, unidades y metricas de cumplimiento.
  - Selecciono fecha inicial de calendario e inicialSubjectId por query param.
  - Uso MoodleAcademicRules para reforzar deteccion de tareas calificadas.

### app/Http/Controllers/Settings/ProfileController.php
- Que hace: gestiona editar perfil y borrado de cuenta.
- Por que: separo datos de perfil general de la configuracion academica/seguridad.
- Como:
  - edit renderiza la vista de perfil.
  - update aplica ProfileUpdateRequest.
  - destroy valida contraseña, cierra sesion y elimina usuario.

### app/Http/Controllers/Settings/SecurityController.php
- Que hace: concentra seguridad, password, conexion Moodle y preferencias de aviso.
- Por que: unifico en una sola vista toda la configuracion sensible del usuario.
- Como:
  - edit carga perfil enriquecido desde Moodle (nombre, email, avatar, curso, año).
  - update cambia contraseña con PasswordUpdateRequest.
  - updatePreferences persiste preferencias de notificacion.
  - disconnectMoodle limpia credenciales Moodle y cache asociado.
  - destroyAccount elimina cuenta y sesion.
  - ademas expongo en la vista la configuracion de cache fresh/stale en minutos.

### app/Http/Controllers/Moodle/MoodleConnectionController.php
- Que hace: conecta y verifica credenciales Moodle mediante CAS.
- Por que: valido credenciales antes de persistirlas para evitar estados incoherentes.
- Como:
  - valido moodle_username/moodle_password.
  - ejecuto login CAS real con MoodleCasClient.
  - si falla autenticacion, devuelvo error 422 claro.
  - si todo va bien, guardo credenciales en User (cifrado por cast) y limpio cache.
  - tengo endpoint debug no disponible en produccion para diagnostico.

### app/Http/Controllers/Moodle/MoodleConsoleController.php
- Que hace: consola tecnica interna para ejecutar endpoints Moodle y ver salida.
- Por que: me permite auditar y depurar la integracion desde interfaz.
- Como:
  - recibe accion y course_id opcional.
  - ejecuta asignaturas, tareas, all-tareas, calificaciones o configuracion.
  - usa MoodleCasClient + MoodleAcademicService en una sola sesion.
  - permite actualizar preferencias rapidas de notificaciones.

### app/Http/Controllers/Moodle/MoodleDataController.php
- Que hace: expone endpoints JSON internos de datos Moodle.
- Por que: desacoplo la vista de consola y otros consumos internos de la capa de scraping/API Moodle.
- Como:
  - valida que el usuario tenga credenciales Moodle conectadas.
  - abre sesion CAS por peticion.
  - devuelve JSON de asignaturas, tareas por curso, todas las tareas y calificaciones.
  - diferencia errores de autenticacion, request y error inesperado.

### app/Http/Controllers/Moodle/MoodleMediaController.php
- Que hace: proxifica recursos multimedia protegidos de Moodle.
- Por que: necesito descargar contenido autenticado sin exponer credenciales en frontend.
- Como:
  - valida URL solicitada.
  - comprueba host permitido (base Moodle/CAS configurado).
  - abre sesion CAS y descarga binario con getBinary.
  - responde con content-type original y cache-control privado.

### app/Http/Controllers/Moodle/MoodlePreferencesController.php
- Que hace: lectura y guardado JSON de preferencias de notificacion Moodle.
- Por que: separo preferencias de comunicacion de la logica academica.
- Como:
  - show mezcla defaults + valores persistidos.
  - update valida booleanos y persiste resultado fusionado.

---

## 2) Requests y reglas de validacion

### app/Http/Requests/Settings/PasswordUpdateRequest.php
- Que hace: valida cambio de contraseña.
- Por que: centralizo reglas y evito validaciones duplicadas en controlador.
- Como: usa PasswordValidationRules para current_password + password confirmada.

### app/Http/Requests/Settings/ProfileUpdateRequest.php
- Que hace: valida nombre y email en update de perfil.
- Por que: encapsulo validacion de perfil en un request reusable.
- Como: delega en ProfileValidationRules con ignore al usuario actual.

### app/Http/Requests/Settings/ProfileDeleteRequest.php
- Que hace: valida contraseña actual para eliminar cuenta.
- Por que: proteger operacion destructiva.
- Como: usa currentPasswordRules del trait.

### app/Http/Requests/Settings/TwoFactorAuthenticationRequest.php
- Que hace: request dedicado para flujo de 2FA con Fortify.
- Por que: mantener endpoint tipado y extensible para reglas futuras.
- Como: extiende FormRequest y usa InteractsWithTwoFactorState.

### app/Concerns/PasswordValidationRules.php
- Que hace: define reglas comunes de contraseña.
- Por que: evitar inconsistencias entre registro, reset y cambio de password.
- Como: expone passwordRules y currentPasswordRules.

### app/Concerns/ProfileValidationRules.php
- Que hace: define reglas comunes de profile (name/email).
- Por que: mantener una unica fuente de verdad para validacion de perfil.
- Como: profileRules compone nameRules + emailRules con unique condicional.

---

## 3) Servicios de negocio y de integracion

## 3.1 Moodle

### app/Services/Moodle/MoodleCasClient.php
- Que hace: cliente HTTP principal para CAS/Moodle.
- Por que: encapsular login, requests GET/POST y manejo de reintentos/timeouts en un solo punto.
- Como:
  - login:
    - resuelve URLs Moodle/CAS desde config.
    - hace GET de login CAS, parsea hidden fields.
    - hace POST con credenciales.
    - detecta credenciales invalidas.
    - entra en /my/ y extrae sesskey + userid.
    - devuelve MoodleSession con curl handle reutilizable.
  - get/post/getBinary:
    - construye URL absoluta.
    - ejecuta request con retry/backoff.
    - registra trace opcional por paso.

### app/Services/Moodle/CasLoginParser.php
- Que hace: parsea HTML de CAS/Moodle para extraer campos de sesion.
- Por que: desacoplar parsing de autenticacion del cliente HTTP.
- Como:
  - parseHiddenFields extrae inputs hidden.
  - extractSesskey y extractUserid aplican patrones regex.
  - looksLikeInvalidCredentials detecta errores de auth por HTML/URL.

### app/Services/Moodle/MoodleSession.php
- Que hace: contenedor de sesion CAS/Moodle.
- Por que: transportar handle curl, sesskey, userid y trace como unidad de trabajo.
- Como: incluye close explicito y cierre en destructor.

### app/Services/Moodle/MoodleAcademicService.php
- Que hace: servicio de acceso academico a cursos, tareas y notas.
- Por que: separar adquisicion de datos Moodle de la capa HTTP.
- Como:
  - getCourses usa core_course_get_enrolled_courses_by_timeline_classification.
  - opcionalmente enriquece docente via participants parser.
  - getAssignmentsByCourse scrapea /mod/assign/index.php.
  - getAllAssignments agrega tareas de todos los cursos y calcula estado basico.
  - getGrades scrapea /grade/report/user/index.php por curso.

### app/Services/Moodle/MoodleAcademicRules.php
- Que hace: reglas comunes para estados y evaluacion academica.
- Por que: evitar duplicacion entre servicios y controladores.
- Como:
  - detecta entrega por estado textual.
  - detecta si texto parece feedback.
  - detecta calificacion explicita.
  - evalua feedback util.
  - parsea nota numerica y rubricas SF/BN/NT/SB.
  - normaliza tokens numericos.

### app/Services/Moodle/MoodleUserAcademicCache.php
- Que hace: orquestador de snapshot academico por usuario + cache inteligente.
- Por que: acelerar carga, reducir llamadas repetidas y estabilizar salida.
- Como:
  - getForUser:
    - usa cache envelope con timestamps.
    - distingue fresh vs stale.
    - aplica stale-while-revalidate en terminacion de request.
    - usa lock por usuario para evitar stampede.
    - si no hay cache usable, recomputa con lock.
  - buildAcademicPayload:
    - login CAS.
    - cursos + tareas + grades.
    - enriquecimiento de tareas con reporte de notas.
    - datos de perfil (avatar, nombre, email, curso, año).
    - normalizacion de fechas y dias restantes.
  - getGradesForUser:
    - reutiliza gradeReport del snapshot academico si existe.
    - si no, usa cache propia de grades con misma estrategia fresh/stale/lock.
  - clearForUser:
    - invalida cache de academic, grades y locks.
  - matching inteligente de tareas vs grade report:
    - normalizacion texto, match exacto/fuzzy y umbral.

### app/Services/Moodle/SpanishDateParser.php
- Que hace: convierte fechas en español/relativas a ISO8601.
- Por que: Moodle entrega fechas en formatos heterogeneos y necesito una base temporal consistente.
- Como:
  - soporta hoy, mañana, en X dias, en X horas.
  - soporta fechas con mes en texto y numericas.
  - infiere año cuando falta.
  - ajusta al año siguiente si una fecha sin año quedo demasiado en el pasado.

### app/Services/Moodle/Parsers/AssignmentsParser.php
- Que hace: parsea tabla de tareas de Moodle.
- Por que: no siempre tengo endpoint oficial con el detalle que necesito.
- Como:
  - usa DOMXPath sobre generaltable.
  - soporta filas con y sin seccion (tema).
  - extrae nombre, fecha, estado, calificacion, feedback y url.

### app/Services/Moodle/Parsers/GradesParser.php
- Que hace: parsea tabla de calificaciones.
- Por que: normalizo estructura para el frontend aunque cambie orden de columnas.
- Como:
  - detecta encabezados por texto.
  - extrae item, calificacion, rango, porcentaje y feedback texto.
  - convierte valores numericos con soporte coma/punto.

### app/Services/Moodle/Parsers/ParticipantsParser.php
- Que hace: extrae docente/tutor de participantes del curso.
- Por que: mostrar profesor en tarjetas de asignatura.
- Como:
  - recorre filas de participantes.
  - busca marcadores de rol (profesor/docente/teacher/tutor).
  - extrae nombre del enlace de usuario.

### app/Services/Moodle/Exceptions/MoodleAuthenticationException.php
- Que hace: excepcion de autenticacion Moodle.
- Por que: separar errores de credenciales de errores tecnicos.
- Como: RuntimeException especializada.

### app/Services/Moodle/Exceptions/MoodleRequestException.php
- Que hace: excepcion de request/remoto Moodle.
- Por que: tratar fallos de red/http/config de forma diferenciada.
- Como: RuntimeException especializada.

## 3.2 Priorizacion academica

### app/Services/EisenhowerMatrixService.php
- Que hace: clasifica tareas con reglas deterministicas en cuadrantes Eisenhower.
- Por que: ofrecer priorizacion aunque no haya IA disponible.
- Como:
  - calcula urgencia por dias/estado.
  - calcula importancia por keywords academicas y contexto.
  - resuelve cuadrante y razon.
  - limita a 3 tareas por cuadrante y evita duplicados.

### app/Services/Ai/EisenhowerMatrixAiService.php
- Que hace: clasifica matriz via proveedor AI (OpenAI o Gemini) con fallback controlado.
- Por que: mejorar calidad de priorizacion con contexto y preferencias del usuario.
- Como:
  - detecta proveedor por key/base/model.
  - construye prompts con esquema JSON obligatorio.
  - llama endpoint y parsea respuesta robustamente.
  - hidrata matriz usando solo tareas existentes (sin inventar).
  - aplica fallback schedule con tareas restantes.
  - devuelve provider y explicacion opcional.

---

## 4) Modelo y persistencia

### app/Models/User.php
- Que hace: modelo de usuario autenticable con campos locales y Moodle.
- Por que: unifico identidad local y vinculacion academica en la misma entidad.
- Como:
  - fillable incluye moodle_username, moodle_password y preferencias.
  - hidden oculta password local/Moodle y secretos 2FA.
  - casts:
    - password hasheada.
    - moodle_password cifrada.
    - preferencias como array.

### database/migrations/2026_03_16_120000_add_moodle_fields_to_users_table.php
- Que hace: añade campos Moodle al usuario.
- Por que: persistir integracion y preferencias de notificacion.
- Como:
  - up agrega moodle_username, moodle_password y moodle_notification_preferences.
  - down revierte esos campos.

---

## 5) Middleware

### app/Http/Middleware/HandleInertiaRequests.php
- Que hace: comparte props globales en todas mis paginas Inertia.
- Por que: evitar duplicar datos comunes en cada controlador.
- Como:
  - comparte app name, auth user, flash messages y estado sidebar.

### app/Http/Middleware/HandleAppearance.php
- Que hace: comparte tema de apariencia (cookie) con vistas.
- Por que: mantener preferencia visual persistente.
- Como: lee cookie appearance y la inyecta en View::share.

---

## 6) Providers y acciones Fortify

### app/Providers/AppServiceProvider.php
- Que hace: configura defaults globales de framework.
- Por que: endurecer comportamiento por entorno y estandarizar fechas.
- Como:
  - Date usa CarbonImmutable.
  - en produccion prohíbe comandos destructivos DB.
  - define politica de password fuerte en produccion.

### app/Providers/FortifyServiceProvider.php
- Que hace: integra Fortify con acciones, vistas Inertia y rate limits.
- Por que: centralizar auth UX y seguridad de login/2FA.
- Como:
  - registra acciones create/reset user.
  - define todas las vistas auth Inertia.
  - limita intentos de login y 2FA.

### app/Actions/Fortify/CreateNewUser.php
- Que hace: alta de usuario local.
- Por que: tener proceso de registro validado y coherente con mis traits.
- Como: valida profile + password y crea User.

### app/Actions/Fortify/ResetUserPassword.php
- Que hace: reset de password olvidada.
- Por que: encapsular politica de reseteo.
- Como: valida password y hace forceFill/save.

---

## 7) Rutas

### routes/web.php
- Que hace: define rutas web autenticadas y endpoints internos API de Moodle.
- Por que: concentrar navegacion principal y servicios internos protegidos por auth/verified.
- Como:
  - home redirige a dashboard si hay sesion.
  - expone dashboard, asignaturas, tareas, calificaciones y consola Moodle.
  - expone conexion Moodle y debug.
  - agrupa API interna moodle bajo /api.
  - incluye settings.php.

### routes/settings.php
- Que hace: rutas de perfil y seguridad.
- Por que: separar configuracion de usuario de rutas generales.
- Como:
  - profile edit/update/destroy.
  - security edit, preferencias, desconexion Moodle, borrado cuenta, cambio password.

### routes/console.php
- Que hace: comando artisan inspire.
- Por que: scaffold base de Laravel para consola.
- Como: comando de ejemplo sin impacto en mi logica academica.

---

## 8) Configuracion

### config/services.php
- Que hace: centraliza credenciales y parametros de terceros (Moodle y AI).
- Por que: desacoplar codigo de entorno y poder tunear performance sin tocar servicios.
- Como:
  - moodle:
    - URLs base/CAS.
    - SSL verify, timeout, retries.
    - cache TTL fresh/stale.
    - lock TTL/wait/poll.
  - ai:
    - base_url, api_key, model, timeout, verify.

---

## 9) Como encaja todo en runtime (flujo extremo a extremo)

1. El usuario inicia sesion local (Fortify) y entra a una pagina academica.
2. El controlador detecta si hay credenciales Moodle conectadas.
3. Si hay conexion Moodle:
   - pido snapshot a MoodleUserAcademicCache.
   - si cache fresh, respondo inmediato.
   - si cache stale, respondo inmediato y refresco al terminar request.
   - si no hay cache, recomputo con lock por usuario.
4. Durante recompute:
   - login CAS.
   - cursos, tareas, calificaciones y perfil.
   - parseo HTML/API y normalizo fechas/estados/notas.
5. El controlador transforma y entrega props Inertia a frontend.
6. Si hay error, respondo mensaje controlado sin romper la pagina.

---

## 10) Decisiones tecnicas que yo he tomado

1. Mantener scraping + llamadas internas Moodle porque necesito detalle que no siempre llega por API oficial.
2. Encapsular reglas academicas en un servicio unico para evitar divergencias.
3. Usar cache con stale-while-revalidate + lock para mejorar latencia y evitar picos.
4. Mantener controladores orientados a transformacion de payload para UI, no a scraping.
5. Tratar seguridad como prioridad: credenciales Moodle cifradas, media proxy con whitelist de host y debug bloqueado en produccion.

Este documento refleja el backend funcional actual y la logica aplicada en cada fichero relevante del proyecto.