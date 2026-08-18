# MB360 — Handoff técnico para Claude Code

## Objetivo inmediato

Arreglar definitivamente **Inicio de Cliente · Maestro** dentro del **Centro de Operaciones MB360**.

El usuario NO quiere volver a iniciar sesión para abrir Inicio de Cliente. Debe iniciar sesión una sola vez en `index.html` y, al tocar **🤝 Inicio de cliente**, el formulario Maestro debe abrir dentro del mismo Centro de Operaciones, sin otra pantalla de login, sin redirección a otra página y sin errores JS.

## Repositorio

`martinezruizdiazj-afk/mb360-auditoria`

GitHub Pages:
`https://martinezruizdiazj-afk.github.io/mb360-auditoria/`

## Estado actual

El Centro de Operaciones funciona y permite login correctamente.

`index.html` inicializa Supabase así:

```js
const SUPABASE_URL = 'https://fztdnelzhdoewxqpkxja.supabase.co';
const SUPABASE_KEY = 'sb_publishable_HDXDi8L0Li9riuogd0YfVQ_AEHOCA-D';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
});
```

La sesión del Centro funciona. El usuario autenticado tiene `app_metadata.mb360_role = admin`.

NO usar ni solicitar `service_role` ni ningún secreto. El publishable key anterior es cliente-side y está protegido por RLS.

## Error actual visible en iPhone

Al tocar **Inicio de cliente**, `index.html` actualmente renderiza un `iframe` con `inicio-cliente-maestro.html`.

Dentro de ese iframe aparece nuevamente el login de Inicio de Cliente. Al tocar Entrar aparece:

> `Cannot access 'sb' before initialization.`

Esto es inaceptable porque además duplica el login.

## Qué se intentó y NO debe repetirse

1. Redirigir `openTool('onboarding')` a `inicio-cliente-maestro.html`.
   - Falló porque en iPhone/ChatGPT/Safari se abrió en otro contexto y no compartió la sesión.

2. Crear un login separado en `inicio-cliente-maestro.html`.
   - Falló / se quedó en “Ingresando…”.

3. Cargar `inicio-cliente-maestro.html` dentro de un iframe.
   - Actualmente muestra segundo login y produce `Cannot access 'sb' before initialization.`

4. Seguir agregando query params para cache (`?v=...`) no soluciona la arquitectura.

## Solución requerida

Refactorizar para que **Inicio de Cliente Maestro sea un módulo nativo del mismo `index.html` o del mismo runtime**, usando **la instancia `sb` ya existente** en `index.html`.

Preferencia: NO iframe, NO segunda página, NO segunda instancia de Supabase, NO segundo auth gate.

Claude puede mover/importar la lógica del formulario Maestro desde estos archivos:

- `inicio-cliente-config.js` → fuente de verdad de las 16 secciones y preguntas.
- `inicio-cliente-app.js` → renderer/estado/guardado actual del Maestro.
- `inicio-cliente.css` → estilos actuales del Maestro.
- `inicio-cliente-maestro.html` → wrapper viejo; puede dejarse solo como legacy o eliminarse cuando ya no sea necesario.
- `index.html` → Centro de Operaciones y auth que sí funciona.

Hay scripts/workflows creados durante intentos previos:

- `scripts/inline-master-onboarding.py`
- `.github/workflows/apply-inline-master-onboarding.yml`
- `.github/workflows/route-onboarding-master.yml`

Revisarlos; no asumir que deben conservarse. Si ya no son necesarios, se pueden eliminar después de verificar el fix.

## Requisitos funcionales del Inicio de Cliente Maestro

La estructura aprobada está en `inicio-cliente-config.js` y NO debe reducirse a un formulario básico.

Debe mantener **16 secciones**:

1. Negocio y situación actual
2. Objetivos del cliente
3. Ventas y comportamiento
4. Días, horarios y capacidad
5. Productos / platos / servicios
6. Clientes actuales y deseados
7. Origen actual de clientes
8. Promociones y marketing anterior
9. Competencia
10. Calendario comercial
11. Operación y limitaciones
12. Sistemas y plataformas
13. Activos existentes
14. Producción y visitas MB360
15. Decisiones y autonomía MB360
16. Información abierta final

UX obligatoria:

- Botones de selección simple.
- Selección múltiple.
- Siempre permitir texto libre / detalle cuando la información no encaje en opciones.
- Opción `Otro` con campo para especificar.
- Campos textarea para información abierta.
- Repetidores para productos, competidores, promociones/eventos, productos agotados, etc.
- Calidad/origen del dato cuando corresponde:
  - `confirmed` = Confirmado
  - `estimated` = Estimado
  - `unknown` = No sabe
  - `not_shared` = No quiere compartir
- Guardado de borrador.
- Navegación Anterior / Siguiente.
- Revisión final.
- Diseño móvil primero, especialmente iPhone.

## Guardado en Supabase

Tabla principal de este formulario: `public.onboardings`.

El formulario Maestro actual guarda:

- `client_id`
- `onboarding_date`
- `form_version = 'inicio_cliente_master_1.0'`
- `raw_answers`
- `answer_quality`
- `summary`
- `missing_information`
- `preliminary_priorities`
- `research_brief`
- `status` (`draft` o `completed`)

Debe seguir guardando todo lo anterior.

`raw_answers` debe conservar TODAS las respuestas originales aunque luego haya datos estructurados en otras tablas.

## Base Central MB360

Supabase project ref:
`fztdnelzhdoewxqpkxja`

Tablas públicas existentes:

- clients
- locations
- stakeholders
- client_systems
- audits
- onboardings
- products
- customer_segments
- business_time_slots
- competitors
- research_runs
- research_findings
- plans_90d
- weekly_reviews
- tasks
- metric_targets
- metrics
- commercial_calendar
- campaigns
- production_sessions
- production_shots
- content_items
- publications
- assets
- activities
- reports

Tabla privada:

- `private.client_contacts`

**Restricción crítica:** datos personales de contacto del cliente (nombre de contacto, teléfono, email privado y notas privadas) NO deben exponerse al módulo de IA ni mezclarse con tablas públicas. `private.client_contacts` permanece aislada.

RLS está habilitado. Roles internos en JWT `app_metadata.mb360_role`:

- admin
- operator
- viewer

El Centro de Operaciones ya valida esos roles.

## Flujo de negocio que NO debe romperse

- Auditoría de Campo y Inicio de Cliente son herramientas diferentes.
- Inicio de Cliente se realiza DESPUÉS de que el prospecto acepta trabajar con MB360.
- No pedir accesos/contraseñas durante el onboarding; solo identificar qué sistemas existen.
- Después del onboarding: investigación externa profunda → presentación del plan → luego solicitud de accesos.
- Producción de contenido es un módulo separado.
- La Base Central Supabase es la fuente de verdad, no ChatGPT/Claude.

## Prioridad del formulario

El objetivo de MB360 es aumentar ventas/ganancias del restaurante/bar/cafetería. El onboarding debe recopilar principalmente información que el dueño conoce y que MB360 no puede obtener fácilmente de forma pública.

No convertirlo en preguntas sobre seguidores, rating público, publicaciones visibles, etc. Eso se investiga después.

## Criterios de aceptación — NO declarar terminado hasta cumplirlos

1. Abrir `index.html` en iPhone.
2. Login una sola vez en Centro de Operaciones.
3. Tocar **🤝 Inicio de cliente**.
4. Debe permanecer dentro del Centro de Operaciones.
5. Debe aparecer directamente la Sección 1 del Maestro, sin email/contraseña adicionales.
6. Deben existir 16 secciones.
7. Selección simple, múltiple, `Otro` y texto libre funcionan.
8. Repetidores funcionan.
9. Calidad del dato funciona.
10. Guardar borrador en `onboardings` funciona.
11. Finalizar onboarding funciona.
12. Navegar a otro módulo (Inicio/Auditoría/Producción/etc.) funciona sin romper sesión.
13. Consola sin `Cannot access 'sb' before initialization`, sin `Identifier 'sb' has already been declared`, y sin errores de auth.
14. No debe existir segundo login dentro del módulo onboarding.
15. No romper Auditoría, Producción, Tareas, Resultados ni Reportes.

## Recomendación técnica

Haz primero un análisis de dependencias antes de editar.

La solución más limpia probablemente sea:

- mantener una única `const sb` en `index.html`;
- cargar `inicio-cliente-config.js` como datos de configuración globales o trasladarlos a un módulo sin inicializar Supabase;
- convertir el renderer de `inicio-cliente-app.js` en funciones con prefijo/namespace (`MB360Onboarding`) que reciban `sb` o usen el `sb` del Centro, pero sin redeclararlo;
- renderizar el formulario directamente en `<main id="main">` cuando `currentTool === 'onboarding'`;
- adaptar los selectores DOM para que se creen/destruyan al entrar/salir del módulo;
- limpiar el código legacy del onboarding básico solo cuando el Maestro funcione.

No hagas un parche que simplemente esconda el login del iframe. El objetivo es una arquitectura estable, una sesión y un cliente Supabase.

## Último estado confirmado

El usuario pudo entrar correctamente al Centro de Operaciones. El problema ocurre únicamente al entrar a Inicio de Cliente Maestro. El último error visible es:

`Cannot access 'sb' before initialization.`

## Instrucción operativa para Claude

Trabaja directamente en el repo. Inspecciona los archivos reales antes de modificar. Haz los cambios necesarios, prueba sintaxis y flujo estático, y deja el repo en estado utilizable. No le pidas al usuario que copie/pegue código manualmente salvo que sea estrictamente inevitable.
