---
applyTo: '**'
---

# Guía de Diseño, Semántica y Accesibilidad

## Objetivo
Toda implementación que requiera diseño visual o estructural debe seguir el sistema de diseño ya existente en el proyecto y mantener semántica HTML correcta, accesibilidad y buenas prácticas W3C.

## Reglas Obligatorias

### 1) Diseño guiado por la estructura existente
- Reutilizar la arquitectura de estilos del proyecto (`resources/scss` y componentes UI existentes).
- Priorizar variables/tokens, utilidades y mixins definidos en el proyecto antes de crear estilos nuevos.
- Evitar estilos inline salvo casos justificados y puntuales o criticamente necesario.
- Mantener naming, organización por capas y convenciones actuales.

### 2) Uso de mixins y composición
- Si existe un mixin/utilidad que resuelva el caso, debe usarse en lugar de duplicar reglas CSS/SCSS.
- Extraer estilos repetidos en mixins o utilidades reutilizables.
- No introducir estilos ad-hoc si ya hay patrón equivalente en la base de estilos.

### 3) Semántica HTML estricta
- Prohibido usar `div` como contenedor genérico por defecto.
- Elegir siempre la etiqueta semántica correcta según intención: `main`, `section`, `article`, `header`, `footer`, `nav`, `aside`, `form`, `fieldset`, `ul`, `ol`, `button`, etc.
- `div` solo se permite cuando no exista alternativa semántica adecuada o el uso semántico resulte incorrecto para el contenido/rol.
- Justificar el uso de `div` cuando se utilice en contexto donde podría esperarse un elemento semántico.

### 4) W3C y accesibilidad (a11y)
- Cumplir buenas prácticas W3C y WCAG aplicables.
- Mantener jerarquía correcta de encabezados (`h1` -> `h2` -> `h3`...).
- Asegurar labels asociados en formularios y textos alternativos en imágenes.
- Garantizar navegación por teclado, foco visible y orden de tabulación lógico.
- Mantener contraste suficiente y estados de interacción perceptibles.
- Usar atributos ARIA solo cuando la semántica nativa no cubra la necesidad.

### 5) Coherencia y mantenibilidad
- No romper patrones visuales ni de interacción existentes.
- Preferir soluciones consistentes y reutilizables sobre atajos locales.
- Cualquier excepción debe ser mínima, argumentada y alineada con mantenibilidad a largo plazo.

## Checklist rápido antes de cerrar un cambio de UI
- ¿Se usó el sistema de estilos existente en lugar de crear uno paralelo?
- ¿Se reutilizaron mixins/utilidades/tokens antes de duplicar CSS?
- ¿La estructura HTML es semántica y evita `div` innecesarios?
- ¿Se validaron criterios básicos de accesibilidad y W3C?
- ¿El resultado mantiene coherencia con el resto del proyecto?
