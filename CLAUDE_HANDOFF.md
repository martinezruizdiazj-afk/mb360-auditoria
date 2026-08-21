# MB360 — Handoff integral para Claude Code

**Actualizado:** 21 de agosto de 2026  
**Proyecto:** MarketBoost360 / Centro de Operaciones MB360  
**Objetivo de este documento:** darte todo el contexto funcional, técnico y de negocio necesario para **auditar el sistema completo y generar un informe profesional**.

---

# 0. INSTRUCCIÓN PRINCIPAL PARA CLAUDE

En esta etapa **NO modifiques código, base de datos, workflows ni configuración**.

Primero debes:

1. Inspeccionar el repositorio real completo.
2. Contrastar la implementación actual con la especificación funcional aprobada que se documenta aquí.
3. Identificar qué está realmente implementado, qué es solo interfaz, qué funciona parcialmente y qué todavía depende de integraciones externas.
4. Revisar arquitectura, modelo de datos, seguridad, escalabilidad, UX móvil, consistencia entre módulos, duplicaciones, deuda técnica, errores potenciales y riesgos.
5. Generar un **informe técnico + funcional + estratégico en español**.

No asumas que una función existe solo porque esté descrita aquí. **Verifica el código real.**

No hagas cambios hasta que el usuario revise el informe y autorice una siguiente fase.

---

# 1. QUÉ ES MB360

MarketBoost360 (MB360) es un sistema operativo interno para administrar servicios de crecimiento para:

- Restaurantes
- Bares
- Cafeterías

El objetivo del producto no es “publicar contenido” ni “conseguir likes”.

El objetivo central es:

> **Aumentar ventas y ganancias del cliente usando datos, contenido, automatización, marketing local y seguimiento medible.**

El sistema intenta convertir el trabajo de una agencia tradicional en una operación estructurada y trazable:

**Auditoría → Onboarding → Investigación → Plan → Tareas → Producción → Publicaciones/Campañas → Resultados → Reportes → nuevas acciones.**

Supabase es la **fuente de verdad**. ChatGPT/Claude deben actuar como capa de inteligencia, análisis y operación; no como base primaria donde reside la información.

---

# 2. FLUJO DE NEGOCIO APROBADO

El flujo comercial/operativo esperado es:

1. **Auditoría de Campo** al prospecto.
   - Detectar fugas de dinero, fricciones operativas, problemas comerciales y oportunidades.

2. Si acepta trabajar con MB360:
   - pasa a **Inicio de Cliente**.

3. **Inicio de Cliente / Onboarding**:
   - reunión rápida;
   - recopilar principalmente información interna que el dueño sí conoce y MB360 no puede descubrir públicamente;
   - NO pedir contraseñas/accesos todavía.

4. **Investigación externa profunda**:
   - Google Maps / GBP;
   - Instagram;
   - Facebook;
   - TikTok;
   - web/SEO;
   - reseñas;
   - competidores;
   - tendencias;
   - datos públicos.

5. Construir **plan inicial 90 días**.

6. Presentarlo al cliente.

7. Recién después solicitar accesos a plataformas cuando corresponda.

8. Ejecutar semanalmente:
   - tareas;
   - campañas/promociones;
   - producción de contenido;
   - optimizaciones;
   - seguimiento de resultados;
   - revisión de competencia y tendencias.

9. Medir resultados.

10. Crear reportes.

11. El resultado y los reportes vuelven a generar nuevas prioridades y tareas.

---

# 3. PRINCIPIOS FUNCIONALES QUE NO DEBEN ROMPERSE

## 3.1 Cliente activo

Todo módulo importante debe operar sabiendo claramente **qué cliente está activo**.

El frontend usa:

```js
activeWorkspaceClientId = localStorage.getItem('mb360_active_client_id') || ''
```

La intención es impedir que información de un restaurante termine accidentalmente asociada a otro.

Debe mantenerse visible un banner de **CLIENTE ACTIVO** en módulos principales.

## 3.2 Datos separados por cliente

La separación principal se hace por UUID `client_id`.

No existe una carpeta física por cliente: la separación está en PostgreSQL mediante relaciones.

## 3.3 Nunca inventar rentabilidad

Si el cliente no comparte:

- costos;
- márgenes;
- gasto publicitario;
- comisión;
- ventas atribuibles;

MB360 **no debe inventar ganancia ni ROI**.

Debe mostrar:

- real;
- estimado;
- informado por cliente;
- incompleto/no disponible.

## 3.4 Privacidad crítica

La información personal de contacto del cliente debe quedar aislada.

Existe:

```text
private.client_contacts
```

Los siguientes datos NO deben entrar en contexto de IA ni mezclarse libremente con las tablas operativas públicas:

- nombre de contacto privado;
- teléfono;
- email;
- notas privadas de contacto.

Claude debe verificar que esta separación siga siendo real.

## 3.5 UX móvil

El sistema se usa intensamente desde móvil, especialmente iPhone.

La experiencia debe ser:

- mobile-first;
- botones grandes;
- pocos pasos;
- sin formularios innecesariamente complejos;
- sin bucles de navegación;
- clara para uso durante visitas presenciales.

---

# 4. REPOSITORIO Y ENTORNO

Repositorio:

```text
martinezruizdiazj-afk/mb360-auditoria
```

GitHub Pages:

```text
https://martinezruizdiazj-afk.github.io/mb360-auditoria/
```

Supabase project ref:

```text
fztdnelzhdoewxqpkxja
```

Región:

```text
us-east-1
```

Frontend actual:

- HTML/CSS/JS sin framework pesado.
- Supabase JS vía CDN.
- GitHub Pages como hosting.
- Supabase Auth + PostgreSQL + Storage.

No solicitar `service_role`, secret keys ni contraseñas.

El navegador usa una publishable key cliente-side y RLS debe ser la verdadera barrera de seguridad.

---

# 5. AUTENTICACIÓN Y ROLES

`index.html` crea una única instancia principal de Supabase.

La autenticación usa sesión persistente.

Roles internos esperados en:

```text
app_metadata.mb360_role
```

Valores:

- `admin`
- `operator`
- `viewer`

El Centro de Operaciones valida el rol antes de permitir acceso.

## Historia importante

Hubo un problema antiguo donde Inicio de Cliente abría otro login y aparecía:

```text
Cannot access 'sb' before initialization
```

Ese problema fue resuelto refactorizando el onboarding como módulo nativo que comparte la misma instancia `sb` de `index.html`.

No volver a arquitectura de:

- iframe;
- segundo login;
- segunda instancia paralela de Supabase;
- redirección a página separada para onboarding.

Los wrappers legacy `inicio-cliente.html` e `inicio-cliente-maestro.html` existen, pero actualmente son pequeños wrappers/legacy y no deben asumirse como la implementación principal.

---

# 6. INVENTARIO PRINCIPAL DEL REPOSITORIO — ESTADO ACTUAL

Verifica siempre el contenido real y el SHA actual antes de editar.

Archivos clave observados al preparar este handoff:

| Archivo | Función | SHA observado |
|---|---|---|
| `index.html` | Shell central, auth, navegación, código legacy y loaders | `962cfb702a0a67947983b6e69c1091ac89249a8c` |
| `inicio-cliente-config.js` | Configuración de las 16 secciones del onboarding | `33bf1db8ee8ef507b8cac16683764397ab4b1641` |
| `inicio-cliente-app.js` | Renderer/estado/guardado del onboarding nativo | `d79bc27b85b561681254c283af779b271c69f16c` |
| `inicio-cliente.css` | Estilos onboarding | `651bc0189f3a2dedb5ddecf7b875f6225eb83451` |
| `produccion-v2.js` | Producción v2 | `7dbcd40b47ceceba4f99ee9494c85673b4198732` |
| `produccion-v2.css` | Estilos Producción v2 | `192aea20780675791192233428d1b39028648e28` |
| `tareas-v2.js` | Tareas v2 | `3328de0c7ea385b9286b09ed0f7e88df38ae3922` |
| `tareas-v2.css` | Estilos Tareas v2 | `72dca87c54d2d36cc5996cdc81853ee8a1b6b23d` |
| `resultados-v2.js` | Resultados v2 | `ed16b66b034f4faa112b86308aaa0bec18381895` |
| `resultados-v2.css` | Estilos Resultados v2 | `51fef5235ba97ac9938b0c0de5cb0dea2d8f882e` |
| `reportes-v2.js` | Reportes v2 | `96309baf36f4d1f259a0bb8d0da98dac7d3771e4` |
| `reportes-v2.css` | Estilos Reportes v2 | `118d97f3b51543be9c517ee0a4cb00e696e7687c` |
| `reporte-publico.html` | Visor público controlado para reportes compartidos | `b9cdb017d8f030a2ce8d554c15854f1b6c79881a` |
| `CLAUDE_HANDOFF.md` | Este documento | cambia con esta actualización |

También existen archivos/artefactos temporales relacionados con instalación/validación de módulos, por ejemplo algunos `.task-v2-*` y workflows/scripts históricos.

Claude debe identificar:

- cuáles siguen activos;
- cuáles ya no hacen nada;
- cuáles conviene eliminar en una futura limpieza;
- si alguno puede volver a modificar archivos accidentalmente.

**No limpiar nada todavía: solo reportarlo.**

---

# 7. ARQUITECTURA FRONTEND ACTUAL

El patrón actual es híbrido:

1. `index.html` contiene:
   - shell;
   - login;
   - navegación;
   - varias funciones originales/legacy de módulos.

2. Módulos v2 se cargan al final y **sobrescriben/overridean funciones globales** existentes.

Orden observado:

```html
<script src="produccion-v2.js?v=prod2-1"></script>
<script src="tareas-v2.js?v=task2-1"></script>
<script src="resultados-v2.js?v=res2-1"></script>
<script src="reportes-v2.js?v=rep2-1"></script>
```

Y estilos equivalentes en `<head>`.

Este patrón permitió evolucionar sin reescribir todo `index.html`, pero Claude debe evaluar:

- riesgo de colisiones globales;
- funciones legacy muertas;
- orden de carga;
- dependencia implícita del scope global;
- mantenibilidad;
- necesidad futura de modularización real.

No refactorizar todavía; solo diagnosticar.

---

# 8. MÓDULO CLIENTES

Existe un módulo **Clientes** dentro del menú principal.

Funciones esperadas/implementadas:

- listar clientes;
- buscar por nombre/tipo/estado/ubicación;
- crear cliente;
- seleccionar cliente activo;
- abrir perfil;
- navegar desde el perfil a:
  - Auditoría;
  - Inicio de Cliente;
  - Producción;
  - Tareas;
  - Resultados;
  - Reportes.

`openClientWorkspace(id, tool)` establece el cliente activo antes de abrir un módulo.

Claude debe revisar si todas las rutas respetan esa selección y si existen consultas globales que puedan mezclar clientes.

---

# 9. AUDITORÍA DE CAMPO

La Auditoría y el Onboarding son módulos diferentes.

La Auditoría busca diagnosticar fugas, operación y situación actual.

Preguntas principales actuales:

## 9.1 Negocio

- nombre;
- ubicación;
- tipo;
- horarios;
- días de operación.

## 9.2 Dolor del dueño

- dónde pierde dinero;
- qué genera estrés;
- qué quisiera automatizar.

## 9.3 Ventas

- ventas promedio/día;
- ticket promedio;
- clientes/día;
- horarios fuertes;
- top vendidos;
- productos rentables.

## 9.4 Captación

- origen de clientes;
- fotos Google;
- respuestas a reseñas;
- número de reseñas;
- publicación Instagram;
- frecuencia;
- tipo de contenido.

## 9.5 Delivery

- apps;
- comisión;
- comisión mensual;
- % ventas apps;
- canal directo.

## 9.6 Mensajes/respuesta

- plataformas;
- quién responde;
- tiempo de respuesta;
- mensajes perdidos.

## 9.7 Pedidos

- cómo toma pedido;
- claridad menú;
- errores;
- tiempo de cierre.

## 9.8 Operación

- pedido a cocina;
- errores caja/cocina;
- tiempo de preparación.

## 9.9 Personal

- cantidad;
- roles;
- dependencia del dueño;
- horas del dueño;
- funcionamiento sin dueño.

## 9.10 Cobro

- métodos;
- tiempo;
- abandonos.

## 9.11 Reservas/eventos

- reservas;
- método;
- no-shows;
- eventos/catering.

## 9.12 Retención

- base de clientes;
- seguimiento;
- recurrencia.

## 9.13 Tiempos críticos

- responder;
- tomar pedido;
- preparar;
- cobrar.

## 9.14 Decisión/inversión

- quién decide;
- inversión previa;
- gasto publicidad;
- disposición a probar.

---

# 10. INICIO DE CLIENTE / ONBOARDING

El onboarding tiene 16 secciones:

1. Negocio y situación actual
2. Objetivos
3. Ventas
4. Días/horarios/capacidad
5. Productos
6. Clientes
7. Origen de clientes
8. Marketing anterior
9. Competencia
10. Calendario comercial
11. Operación/limitaciones
12. Sistemas
13. Activos
14. Producción/visitas
15. Autonomía/aprobaciones
16. Cierre

Características UX:

- botones;
- multi-select;
- `Otro`;
- texto libre;
- repetidores;
- dictado-friendly;
- borrador;
- navegación anterior/siguiente;
- revisión final.

La tabla principal es `onboardings`.

Debe preservar `raw_answers` aunque luego se estructure parte de la información en otras tablas.

## 10.1 Deduplificación Auditoría → Onboarding ya aprobada

El sistema intenta evitar repetir información que ya fue preguntada en la Auditoría.

Se aprobaron y aplicaron estos enlaces:

1. Nombre del negocio → precarga editable.
2. Tipo de negocio → precarga editable.
3. Ticket promedio → precarga editable.
4. Ventas promedio → precarga como ventas diarias.
5. Clientes/día → precarga salón; pickup/delivery quedan para completar.
6. Horarios fuertes → precarga.
7. Top 3 productos → pasa directo.
8. Productos rentables → pasa directo.
9. Origen de clientes → `current_channels`.
10. Apps delivery → sistemas/apps.
11. Base de clientes → pasa al onboarding. La implementación actual agrega subpreguntas si existe base; Claude debe evaluar si eso genera fricción o duplicación.
12. Quién decide → pasa directo.
13. Marketing/inversión anterior → pasa directo.
14. Instagram/Facebook/WhatsApp → precarga sistemas.
15. Reservas → pasa directo.
16. Eventos/catering → pasa directo.
17. Problemas principales → combina pérdida/estrés/automatización.
18. Gasto publicitario actual → separado de presupuesto futuro.
19. Recurrencia → pasa directo.
20. Tiempo promedio de preparación → general; por producto solo si difiere.
21. **Canal directo propio**: explícitamente NO se modificó. Permanece audit-only.

Implementación relevante de `inicio-cliente-app.js`:

- `auditSource`
- `selectedClientId`
- `initialClientId`
- `touchSource(id)`
- `sourceHint(id)`
- `setAudit(id,v)`
- `loadAuditForClient(clientId)`

Claude debe revisar que una edición manual posterior no sea sobrescrita por una nueva precarga.

---

# 11. PRODUCCIÓN v2 — ESPECIFICACIÓN APROBADA

Se diseñó como módulo independiente.

Funciones aprobadas:

1. Pantalla principal con cliente activo, resumen, nueva producción, próximas sesiones e historial.
2. Formulario de producción:
   - fecha/hora;
   - objetivo;
   - ubicación;
   - foto/video/ambos;
   - outputs esperados.
3. Shot list exacta:
   - sujeto;
   - descripción;
   - tipo;
   - formato;
   - uso;
   - prioridad;
   - estado.
4. Modo visita/checklist móvil.
5. Finalización de sesión y pendientes/carryover.
6. Plan semanal automático de producción.
7. Historial, detalle y duplicación.
8. Estado de edición/postproducción del material.
9. Prioridades y alertas automáticas.
10. Archivos/evidencias por producción.
11. Agenda.
12. Responsables.
13. Validación contra restricciones del onboarding; advertir sin bloquear.
14. Producción → Resultados para cerrar el ciclo de medición.

Archivos:

```text
produccion-v2.js
produccion-v2.css
```

Tablas específicas añadidas/ampliadas:

- `production_plans`
- `production_media`
- `production_sessions`
- `production_shots`

Storage esperado:

```text
mb360-assets
```

Claude debe distinguir qué partes son plenamente operativas versus reglas/heurísticas locales.

---

# 12. TAREAS v2 — ESPECIFICACIÓN APROBADA

Funciones aprobadas:

1. Dashboard:
   - vencidas;
   - hoy;
   - semana;
   - esperando;
   - completadas.
2. Nueva tarea:
   - título;
   - descripción;
   - tipo;
   - prioridad;
   - impacto esperado;
   - responsable;
   - fecha;
   - estado;
   - origen.
3. Detalle y ciclo de vida.
4. Subtareas/checklist.
5. Tareas automáticas desde:
   - Auditoría;
   - Onboarding;
   - Investigación;
   - Producción;
   - Resultados;
   - Revisión semanal.
6. Priorización por impacto, urgencia, bloqueo y objetivo.
7. **Dependencias entre tareas fueron explícitamente rechazadas. NO agregarlas como requisito.**
8. Agenda:
   - Hoy;
   - Mañana;
   - Esta semana;
   - Próxima semana;
   - Sin fecha.
9. Detectar vencidas/estancadas/esperando/críticas sin responsable.
10. Timeline de comentarios/updates.
11. Archivos/evidencias.
12. Recurrencia.
13. Cierre con:
   - qué se hizo;
   - resultado;
   - evidencia;
   - impacto;
   - follow-up.
14. Revisión semanal automática de prioridades.

Tablas:

- `tasks` — 28 columnas actualmente.
- `task_subtasks`
- `task_updates`
- `task_files`

Archivos:

```text
tareas-v2.js
tareas-v2.css
```

Existe lógica de sincronización de fuentes que intenta crear tareas faltantes sin duplicarlas.

Claude debe auditar idempotencia y posibles duplicados.

---

# 13. RESULTADOS v2 — VISIÓN FUNCIONAL APROBADA

Este módulo no es un simple registro de métricas. Debe ser el motor para decidir qué funciona, qué no y dónde MB360 genera valor.

Archivos:

```text
resultados-v2.js
resultados-v2.css
```

Tabs observados en el código:

- Resumen
- Canales
- Productos
- Campañas
- Tendencias
- Impacto
- Pruebas
- Datos
- Preguntar
- Vista cliente

## 13.1 Las 30 áreas aprobadas

### 1. Dashboard principal

Períodos:

- semana;
- mes;
- 30 días;
- 90 días;
- personalizado.

KPIs:

- ventas;
- ticket promedio;
- clientes;
- pedidos directos;
- reseñas Google;
- acciones Maps;
- leads/mensajes;
- reservas.

Comparación contra período anterior.

### 2. Metas

- real;
- target;
- progreso;
- gap;
- verde/amarillo/rojo.

### 3. Resultados por canal

Google/Maps, IG, FB, TikTok, web/SEO, WhatsApp, pedidos/reservas.

### 4. Atribución a acciones MB360

Cadena:

```text
Tarea → Acción → Publicación/Campaña → Resultado
```

No afirmar causalidad si solo existe correlación temporal.

### 5. Resultados por producto/plato

Ventas, pedidos, contenido, margen si existe, clasificación.

### 6. Campañas/promociones

Ventas, pedidos, ticket, costo, ganancia estimada, ROI si se puede calcular.

### 7. Alertas automáticas

Ejemplos:

- alcance sube pero ventas bajan;
- clics suben pero pedidos no;
- reel viral sin conversión;
- campaña activa sin ventas atribuibles.

Debe poder crear Tarea.

### 8. Tendencias históricas

7d / 30d / 90d / 6m / 1y.

### 9. Calidad y fuente del dato

- verified;
- estimated;
- client_reported;
- incomplete.

### 10. Antes vs después de MB360

Baseline y 30/60/90 días, 6m, 1y.

### 11. Rentabilidad real MB360

Cuando existan datos:

- ventas adicionales atribuibles;
- ganancia adicional estimada;
- ads;
- promociones;
- fee MB360;
- retorno neto;
- ROI.

### 12. Actualizaciones automáticas

Arquitectura preparada para conectar:

- GBP;
- Search Console/Analytics;
- Meta;
- TikTok;
- web;
- órdenes;
- reservas;
- POS.

**IMPORTANTE:** Claude debe verificar cuáles de estas conexiones realmente existen hoy. No asumir que están conectadas.

### 13. Resumen ejecutivo automático

Generar base para Reportes.

### 14. Funnel de conversión

Ejemplo:

```text
Maps → acciones → menú/web → pedido → venta
```

### 15. Resultados por ubicación

No mezclar sucursales.

### 16. Proyección de cierre

Actual → meta → proyección → gap.

Debe etiquetarse como proyección.

### 17. Experimentos

- hipótesis;
- métrica principal;
- baseline;
- período prueba;
- resultado;
- decisión.

### 18. Día/horario

Ventas/pedidos/ticket por día y daypart.

### 19. Nuevos vs recurrentes

Solo si los datos permiten identificar recurrencia.

### 20. Top acciones MB360

Qué repetir, mejorar o detener.

### 21. Competidores

Solo datos públicos:

- rating;
- reseñas;
- ritmo de reseñas;
- presencia;
- ranking;
- actividad.

Nunca ventas privadas del competidor.

### 22. Tipo de cliente y modalidad de venta

Dine-in, pickup, delivery, directo, segmentos.

### 23. CAC / LTV

Solo si existen gasto + atribución + recurrencia suficientes.

### 24. Cobertura de medición

Mostrar qué se puede y no se puede medir.

### 25. Timeline de acciones sobre resultados

Marcar en gráficos qué acción ocurrió y cuándo.

### 26. Estacionalidad

Comparar con período anterior y mismo período año anterior cuando exista.

### 27. Resultado por pieza de contenido

Reel/story/foto/video → alcance → clic → pedido → venta atribuible cuando exista.

### 28. Preguntar a Resultados

Preguntas en lenguaje natural.

Debe responder “no hay datos suficientes” en lugar de inventar.

**Claude debe verificar si esto usa una IA real o solamente reglas/heurísticas JS.**

### 29. Importación masiva

CSV/Excel/exportaciones POS/Google/Meta.

Debe validar duplicados, columnas, fechas y errores.

### 30. Vista interna vs vista cliente

La vista cliente nunca debe mostrar notas internas/sensibles.

---

# 14. MODELO DE DATOS DE RESULTADOS

`metrics` actualmente tiene 26 columnas y fue ampliada para dimensiones adicionales:

- `channel`
- `metric_unit`
- `product_id`
- `campaign_id`
- `content_item_id`
- `publication_id`
- `customer_segment_id`
- `time_slot_id`
- `collection_frequency`
- `last_synced_at`
- `is_attributed`
- `attribution_confidence`

Tablas añadidas:

- `result_attributions`
- `result_experiments`
- `result_imports`
- `result_settings`
- `competitor_metrics`

`result_attributions` incluye explícitamente método y confianza de atribución.

Claude debe evaluar si el modelo soporta sin ambigüedad:

- sumas vs snapshots;
- métricas acumulativas;
- granularidad diaria/semanal/mensual;
- duplicación tras importaciones;
- zonas horarias;
- múltiples ubicaciones;
- atribución múltiple;
- datos estimados.

---

# 15. REPORTES v2 — VISIÓN FUNCIONAL APROBADA

Archivos:

```text
reportes-v2.js
reportes-v2.css
reporte-publico.html
```

En `index.html`, Reportes v2 se carga después de Resultados v2.

Tabs principales observados:

- Reportes
- Plantillas
- Archivo

## 15.1 Funciones aprobadas

### Parte 1 — Pantalla principal

- cliente activo;
- último reporte;
- próximo recomendado;
- total;
- borradores;
- recientes;
- estados.

Estados:

- Borrador;
- Revisado;
- Listo;
- Compartido;
- Aprobado;
- Requiere cambios.

### Parte 2 — Generación automática desde datos MB360

Fuentes:

- Resultados;
- metas;
- tareas;
- campañas;
- producción;
- publicaciones/contenido;
- acciones;
- experimentos;
- comparación anterior.

### Parte 3 — Tipos de reporte

- semanal interno;
- semanal cliente;
- mensual cliente;
- 90 días;
- trimestral;
- personalizado.

### Parte 4 — Plantilla/estructura según tipo

Secciones diferentes según objetivo.

### Parte 5 — Editor/revisión

- editar;
- ocultar/mostrar;
- reordenar;
- notas internas;
- vista cliente;
- control manual final.

### Parte 6 — Presentación/exportación

- diseño profesional;
- PDF vía impresión;
- vista web;
- móvil;
- MB360 / white-label / cliente.

### Parte 7 — Trazabilidad de cifras

Fuente, período, calidad, actualización.

### Parte 8 — Envío/seguimiento

- WhatsApp;
- email;
- enlace;
- PDF;
- registro de envío/visualización.

Implementación observada actualmente para WhatsApp/email:

- crea un enlace privado;
- WhatsApp abre `wa.me` con el enlace;
- email usa `mailto:`.

Esto **no equivale a una integración backend de envío automático**. Claude debe indicarlo claramente.

### Parte 9 — Versiones

Version snapshot + número + estado + resumen de cambios.

### Parte 10 — Comparación entre reportes

Período actual vs anterior.

### Parte 11 — Reportes programados

Plantillas con frecuencia y próxima fecha.

**Implementación actual observada:** `maybeCreateDue()` crea borradores vencidos cuando el usuario entra/carga Reportes. No es un cron/background scheduler real.

Claude debe señalar esta diferencia entre “programado” y “ejecución autónoma”.

### Parte 12 — Por ubicación o consolidado

Una sucursal o todas.

### Parte 13 — Evidencias/anexos

Relacionar campañas, publicaciones, producción, tareas, assets, etc.

### Parte 14 — Datos congelados

El reporte guarda snapshot histórico para que un reporte enviado no cambie retroactivamente.

### Parte 15 — QA antes de compartir

Detectar:

- datos dudosos;
- ROI sin base;
- métricas faltantes;
- estimaciones no marcadas;
- notas internas visibles;
- inconsistencias.

### Parte 16 — Modo presentación

Slides dentro de MB360.

### Parte 17 — Reporte → acción

Desde un hallazgo se puede crear:

- tarea;
- campaña;
- producción;
- revisión semanal.

### Parte 18 — Seguridad del enlace

- token privado;
- PIN opcional;
- vencimiento;
- desactivación;
- conteo de vistas.

### Parte 19 — Aprobación/cierre con cliente

- aprobado;
- aprobado con comentarios;
- requiere cambios;
- revisado.

### Parte 20 — Plantilla propia por cliente

Configura tipo, frecuencia, idioma, detalle, branding.

### Parte 21 — COLABORACIÓN INTERNA

**No implementar todavía. Fue explícitamente pospuesta para una fase futura.**

### Parte 22 — Duplicar/reutilizar

Copiar estructura/configuración sin arrastrar datos antiguos.

### Parte 23 — Idioma y detalle

- Español / Inglés.
- Ejecutivo / Normal / Detallado.

### Parte 24 — Compromisos del reporte anterior

Qué se prometió → qué se hizo → qué resultado tuvo.

### Parte 25 — Archivo/búsqueda inteligente

Filtro por tipo, estado, período y texto.

---

# 16. SEGURIDAD DE REPORTES COMPARTIDOS — IMPLEMENTACIÓN OBSERVADA

Existe `reporte-publico.html`.

El flujo observado es:

1. Se genera un token aleatorio en navegador.
2. Se guarda solo `SHA-256(token)` en DB.
3. PIN opcional también se guarda como hash.
4. El enlace contiene el token no hasheado.
5. `reporte-publico.html` llama RPC:

```text
report_public_get
```

6. El RPC devuelve el snapshot de la versión autorizada si:
   - token válido;
   - link activo;
   - no vencido;
   - PIN correcto si aplica.

Tabla:

```text
report_share_links
```

Campos relevantes:

- token_hash;
- pin_hash;
- expires_at;
- is_active;
- view_count;
- last_viewed_at.

La función `report_public_get` existe como `SECURITY DEFINER`.

Claude debe hacer auditoría especial de:

- `search_path` seguro del SECURITY DEFINER;
- grants EXECUTE;
- exposición accidental vía anon;
- posibilidad de acceder a reportes sin token;
- qué columnas devuelve el RPC;
- si filtra contenido interno;
- si actualiza correctamente `view_count` y `viewed_at`;
- seguridad del PIN;
- revocación;
- expiración;
- caching del navegador.

## Observación técnica específica a revisar

En `reporte-publico.html`, la función de moneda observada usa `USD` fijo:

```js
style:'currency', currency:'USD'
```

Verificar si esto rompe reportes de clientes con otra moneda configurada en `result_settings`.

---

# 17. BASE CENTRAL — INVENTARIO ACTUAL

## Schema `private`

- `client_contacts` — 8 columnas.

## Schema `public`

- activities — 12
- assets — 14
- audits — 11
- business_time_slots — 11
- campaigns — 17
- client_systems — 13
- clients — 10
- commercial_calendar — 11
- competitor_metrics — 10
- competitors — 14
- content_items — 13
- customer_segments — 10
- locations — 15
- metric_targets — 12
- metrics — 26
- onboardings — 13
- plans_90d — 9
- production_media — 15
- production_plans — 10
- production_sessions — 18
- production_shots — 20
- products — 16
- publications — 11
- report_commitments — 10
- report_deliveries — 10
- report_evidence — 11
- report_feedback — 7
- report_share_links — 11
- report_templates — 15
- report_versions — 8
- reports — 34
- research_findings — 14
- research_runs — 9
- result_attributions — 13
- result_experiments — 19
- result_imports — 14
- result_settings — 9
- stakeholders — 10
- task_files — 10
- task_subtasks — 9
- task_updates — 7
- tasks — 28
- weekly_reviews — 14

Claude debe generar un diagrama conceptual de relaciones aunque sea textual.

---

# 18. REPORTES — MODELO DE DATOS ACTUAL

`reports` tiene 34 columnas.

Además de los campos básicos históricos, incluye:

- `location_id`
- `template_id`
- `parent_report_id`
- `title`
- `status`
- `audience_mode`
- `language`
- `detail_level`
- `branding_mode`
- `sections`
- `source_snapshot`
- `comparison_summary`
- `quality_checks`
- `visibility_settings`
- `generated_at`
- `reviewed_at`
- `ready_at`
- `shared_at`
- `approved_at`
- `data_frozen_at`
- `updated_at`

Tablas complementarias:

## `report_versions`

- versión numerada;
- estado;
- snapshot;
- resumen de cambios;
- autor lógico;
- fecha.

## `report_templates`

- cliente;
- ubicación;
- tipo;
- frecuencia;
- próxima fecha;
- último generado;
- idioma;
- detalle;
- branding;
- settings;
- active.

## `report_evidence`

- tipo/ref;
- título;
- descripción;
- URL;
- visible_to_client;
- metadata.

## `report_deliveries`

- reporte;
- versión;
- canal;
- recipient_label;
- status;
- sent_at;
- viewed_at;
- metadata.

## `report_feedback`

- tipo de respuesta;
- comentarios;
- decisiones.

## `report_commitments`

- título;
- task vinculada;
- estado;
- fecha;
- outcome;
- carry_to_next.

## `report_share_links`

- token_hash;
- PIN hash;
- vencimiento;
- activo;
- vistas.

---

# 19. RLS Y SEGURIDAD

Patrón esperado en tablas operativas:

- `admin/operator/viewer` pueden leer según política;
- `admin/operator` pueden insertar/actualizar/eliminar;
- viewer debe ser lectura.

Las nuevas tablas de Tareas/Producción/Resultados/Reportes fueron creadas con RLS/policies equivalentes.

Claude debe auditar:

1. tablas sin RLS;
2. policies demasiado amplias;
3. uso inseguro de `auth.jwt()`;
4. funciones SECURITY DEFINER;
5. Storage policies;
6. exposición del schema `private`;
7. riesgo de anon access;
8. constraints inexistentes;
9. foreign keys y ON DELETE;
10. índices para consultas por `client_id`, fecha y estado.

---

# 20. ESTADO DE INTEGRACIONES EXTERNAS

El sistema está diseñado para integrar:

- Google Business Profile;
- Google Search Console;
- Google Analytics;
- Instagram/Facebook/Meta;
- TikTok;
- WhatsApp;
- web;
- POS;
- pedidos/reservas;
- delivery apps;
- n8n;
- Stripe;
- Twilio;
- Gmail;
- Telegram.

Pero para el informe debes separar estrictamente:

### A. Integración real ya funcionando en este repo

### B. Infraestructura de datos preparada pero sin conector

### C. Acción manual asistida por navegador

Ejemplo actual de Reportes:

- WhatsApp: abre `wa.me` con enlace.
- Email: abre `mailto:`.

Eso es distinto de un backend que envía y verifica entrega.

No describas una integración como “automática” si solo existe UI/placeholder/campo `connection_status`.

---

# 21. IA / AUTOMATIZACIÓN — PUNTO DE AUDITORÍA IMPORTANTE

Varias funciones se describen como “IA” o “automáticas”.

Claude debe determinar cuáles son realmente:

- reglas JS determinísticas;
- agregaciones SQL;
- heurísticas;
- prompts/LLM reales;
- integraciones API reales;
- placeholders para futura IA.

Esto es especialmente importante en:

- Resultados → “Preguntar”;
- interpretación de alertas;
- generación de reportes;
- plan de producción automático;
- prioridades automáticas;
- investigación;
- revisión semanal.

El informe debe evitar marketing exagerado y describir la capacidad técnica exacta.

---

# 22. DEUDA TÉCNICA / HIPÓTESIS A VERIFICAR

No asumas que estos puntos son errores; son **preguntas de auditoría** que Claude debe comprobar.

## 22.1 `index.html` monolítico

Tiene ~85 KB y todavía conserva funciones legacy de Producción, Tareas, Resultados y Reportes que luego son overrideadas por JS v2.

Preguntas:

- ¿hay funciones muertas?
- ¿hay dobles listeners?
- ¿hay riesgo de llamar una versión vieja antes de que cargue v2?
- ¿conviene una migración futura a módulos ES?

## 22.2 Global namespace

Mucha lógica usa funciones `window.*`.

Evaluar colisiones y testabilidad.

## 22.3 Cache/versionado

Los assets usan query strings manuales:

```text
?v=prod2-1
?v=task2-1
?v=res2-1
?v=rep2-1
```

Evaluar estrategia de cache busting.

## 22.4 Archivos temporales/workflows históricos

Hay trigger files y posiblemente workflows/scripts de instalación antiguos.

Revisar si pueden ejecutar cambios inesperados.

## 22.5 Automatizaciones “programadas”

Algunas dependen de que el usuario abra el módulo.

Diferenciar de cron real.

## 22.6 Escala

Pensar en escenario de:

- 30 clientes;
- 100 clientes;
- 200 clientes;
- múltiples ubicaciones;
- años de métricas;
- miles de publicaciones/tareas.

Revisar límites `.limit(...)`, consultas múltiples y carga de todos los registros al navegador.

## 22.7 Integridad de métricas

Revisar:

- duplicados;
- agregaciones incorrectas;
- métricas de snapshot sumadas por error;
- zona horaria;
- periodos superpuestos;
- importaciones duplicadas;
- normalización de claves (`avg_ticket` vs `average_ticket`, etc.).

## 22.8 Reportes públicos

Revisar seguridad, moneda, estados y exposición de campos internos.

---

# 23. QUÉ DEBE ANALIZAR CLAUDE MÓDULO POR MÓDULO

Para cada módulo genera una tabla con:

- Objetivo funcional.
- Archivo(s) principales.
- Tablas usadas.
- Nivel de implementación:
  - completo;
  - parcial;
  - UI solamente;
  - infraestructura preparada;
  - no implementado.
- Riesgos.
- Bugs potenciales.
- Mejoras recomendadas.
- Prioridad.

Módulos a cubrir:

1. Auth / shell
2. Clientes
3. Auditoría
4. Inicio de Cliente
5. Investigación
6. Plan 90 días
7. Revisión semanal
8. Producción
9. Tareas
10. Campañas
11. Contenido/Publicaciones
12. Resultados
13. Reportes
14. Storage/assets
15. Integraciones
16. Seguridad/RLS

---

# 24. INFORME QUE SE ESPERA DE CLAUDE

Genera un documento profesional con esta estructura mínima:

## A. Resumen ejecutivo

- qué es MB360;
- madurez actual;
- fortalezas;
- riesgos principales;
- veredicto general.

## B. Arquitectura actual

- frontend;
- Supabase;
- auth;
- storage;
- relaciones;
- despliegue.

## C. Mapa completo de módulos

Estado real de cada módulo.

## D. Flujo end-to-end

Determinar si el sistema realmente puede cerrar:

```text
Cliente → Auditoría → Onboarding → Plan → Acción → Resultado → Reporte → nueva Acción
```

Indicar dónde se rompe o queda manual.

## E. Modelo de datos

- calidad del esquema;
- normalización;
- relaciones;
- redundancias;
- constraints;
- índices;
- escalabilidad.

## F. Seguridad

- Auth;
- RLS;
- private schema;
- share links;
- SECURITY DEFINER;
- public page;
- Storage;
- claves frontend.

## G. UX

Especialmente móvil/iPhone.

## H. Resultados y atribución

Evaluar si el sistema puede demostrar valor económico de MB360 de forma creíble.

## I. Reportes

Evaluar si lo implementado puede usarse comercialmente frente a un cliente real.

## J. Automatización e IA

Separar lo real de lo aspiracional.

## K. Integraciones faltantes

Qué conectar primero y por qué.

## L. Deuda técnica

Incluye código legacy y patrón de overrides.

## M. Bugs/riesgos

Clasificar:

- **P0** = seguridad/pérdida de datos/mezcla de clientes.
- **P1** = rompe flujo comercial principal.
- **P2** = funcionalidad importante degradada.
- **P3** = mejora técnica/UX.

## N. Escalabilidad

¿Puede soportar 30, 100 y 200 clientes?

## O. Roadmap recomendado

Separar:

### Próximos 7 días
### Próximos 30 días
### 60 días
### 90 días

## P. Quick wins

Cambios de alto impacto y bajo esfuerzo.

## Q. Qué NO tocar todavía

Para evitar refactors prematuros.

## R. Veredicto final

Responder claramente:

1. ¿Qué porcentaje aproximado del sistema está realmente operativo?
2. ¿Qué falta para usarlo profesionalmente con clientes?
3. ¿Qué falta para venderlo como producto/SaaS?
4. ¿Cuáles son los 5 riesgos más importantes?
5. ¿Cuáles son las 10 acciones de mayor prioridad?

---

# 25. REGLAS PARA EL INFORME

- Escribir en español.
- Ser directo y técnico.
- No rellenar con teoría genérica.
- Citar archivos, funciones y tablas concretas.
- Cuando digas que algo “funciona”, señalar evidencia del código.
- Cuando algo no pueda confirmarse, decir **NO CONFIRMADO**.
- Distinguir especificación aprobada de implementación real.
- No proponer una reescritura completa solo por preferencia tecnológica.
- Priorizar continuidad del negocio y seguridad de datos.
- Tener en cuenta que el usuario utiliza el sistema desde iPhone y computadora.
- No tocar datos personales privados.
- No pedir service role ni secretos.
- No modificar nada durante esta auditoría.

---

# 26. CRITERIO ESTRATÉGICO

MB360 no debe evaluarse solo como una app CRUD.

El valor está en si puede convertirse en un sistema que permita a una pequeña agencia operar muchos restaurantes con:

- contexto persistente;
- menos trabajo manual;
- decisiones basadas en datos;
- producción organizada;
- tareas priorizadas por impacto;
- medición confiable;
- atribución prudente;
- reportes que demuestran valor;
- automatización progresiva.

Por eso tu informe debe responder también:

> **¿La arquitectura actual está encaminada a convertirse en un verdadero sistema operativo de crecimiento para restaurantes, o está acumulando módulos sin suficiente integración?**

Y si hay problemas, indicar exactamente qué conviene consolidar antes de seguir agregando funcionalidades.

---

# 27. INSTRUCCIÓN FINAL

Empieza por leer:

1. `CLAUDE_HANDOFF.md`
2. `index.html`
3. `inicio-cliente-config.js`
4. `inicio-cliente-app.js`
5. `produccion-v2.js`
6. `tareas-v2.js`
7. `resultados-v2.js`
8. `reportes-v2.js`
9. `reporte-publico.html`
10. CSS correspondientes
11. `.github/workflows/`
12. `scripts/` si existen

Después revisa el esquema/policies Supabase si tienes acceso. Si no tienes acceso directo, utiliza el snapshot de tablas de este documento y marca cualquier comprobación de DB no realizada como **NO CONFIRMADA**.

**No hagas cambios. Entrega primero el informe completo.**
