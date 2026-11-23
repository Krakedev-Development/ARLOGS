# Clean Code — Reglas del proyecto ARLOGS

Reglas obligatorias para todo el código de este repositorio (`arlogs-app`).

## Arquitectura y estructura

- Stack base: Angular 22 (standalone components, Signals y control de flujo `@if`/`@for`/`@switch`/`@defer`), TypeScript, Bootstrap 5, Three.js, SheetJS (`xlsx`), Vitest, ESLint y Prettier.
- Estructura de capas dentro de `src/app`:
  - `models/`: tipos de dominio, constantes de roles, pantallas e hitos (`shipment.model.ts`) y datos iniciales (`mock-data.ts`).
  - `services/`: estado compartido mediante Signals, lógica de negocio, autenticación/permisos, auditoría y notificaciones (`auth.service.ts`, `shipment.service.ts`, `audit.service.ts`, `toast.service.ts`).
  - `components/`: vistas y componentes standalone (`admin`, `billing-view`, `client-portal`, `executive-dashboard`, `header`, `job-detail-modal`, `login`, `operations-view`, `pricing-view`, `toast-container`, `warehouse-view`).
- Dirección de dependencias obligatoria: `components` -> `services` -> `models`. Los modelos no importan servicios ni componentes; los servicios no importan componentes.

## Tamaño de archivos, componentes y funciones

- Todo componente, servicio o utilidad nueva debe mantenerse enfocado y conciso (objetivo: máximo 150-200 líneas de lógica TypeScript).
- Cuando la plantilla de un componente supere las ~50 líneas o tenga estilos propios extensos, se separa en archivos dedicados (`*.html` y `*.css`) en lugar de mantener templates inline extensos.
- Para archivos legados que ya superan este tamaño, aplica la regla del *Boy Scout*: al modificarlos, no se agrega lógica monolítica nueva; se extraen subcomponentes, helpers puros o métodos en servicios.
- Cada función o método cumple una sola responsabilidad. Si requiere bloques de comentarios para separarse en pasos, debe dividirse en funciones más pequeñas.

## Comentarios y formato

- No se usan comentarios para explicar qué hace el código; los nombres de clases, signals, variables y métodos deben ser autoexplicativos.
- Se permite un comentario breve (una línea) solo para explicar un porqué no obvio: una regla de negocio crítica, una restricción del navegador/Three.js o un workaround puntual.
- No se dejan bloques de código comentado, `TODO` sin ticket/responsable asociado ni emojis en código, commits o documentación.
- Todo el código fuente debe respetar `.prettierrc` y `.editorconfig`.

## Estado, datos y reglas de seguridad por rol

- El estado de dominio vive en servicios usando Angular Signals (`signal`, `computed`, `asReadonly()`); los componentes solo mantienen estado local de interfaz (filtros, modales, pestañas, formularios).
- Reglas estrictas de visibilidad por rol en ARLOGS:
  - El rol `operaciones` nunca debe visualizar ni manipular precios, tarifas, costos ni facturación.
  - Los roles de cliente (`cliente_a`, `cliente_b` y futuros clientes) solo acceden a embarques y órdenes de compra filtrados estrictamente por su `clienteId`.
  - El acceso a pantallas se controla siempre mediante `AuthService` (`allowedScreensForCurrentUser`), nunca solo ocultando controles en la vista.
- Cuando exista integración con API/backend, los contratos DTO se definen primero en `src/app/models/` y toda comunicación HTTP se centraliza en `src/app/services/`, nunca directamente en componentes.

## Auditoría y logging

- Toda acción sensible del negocio (edición de hitos H1-H10, cambios de umbral SLA, cotizaciones QR, facturación, movimientos Kardex, gestión de usuarios/roles y sesiones) debe registrarse mediante `AuditService`.
- Prohibido dejar `console.log`, `console.debug` o `debugger` en código que llegue al repositorio.
- Nunca se exponen contraseñas, tokens ni datos confidenciales en logs o mensajes de error mostrados al usuario.

## Componentes, rendimiento y recursos

- Antes de crear UI nueva, se revisan los componentes compartidos (`toast-container`, `job-detail-modal`, `header`), utilidades de Bootstrap 5 y tokens globales de `src/styles.css` para evitar duplicación.
- Usar `inject()` para inyección de dependencias y Signals para estado reactivo. Evitar suscripciones manuales sin limpieza (`DestroyRef` / `takeUntilDestroyed`).
- Todo recurso externo (escenas, renderers, geometrías y listeners de Three.js, timers o listeners de `window`) debe liberarse correctamente al destruir el componente.
- Mantener las vistas principales cargadas con `@defer` y cuidar los presupuestos de bundle definidos en `angular.json`.

## Nombres y dependencias

- Nombres de archivos, clases, servicios, componentes y funciones en inglés siguiendo las convenciones de Angular (`*.component.ts`, `*.service.ts`, `*.model.ts`, `*.spec.ts`).
- Los identificadores del dominio logístico ya definidos en `shipment.model.ts` (por ejemplo `refArlogs`, `clienteId`, `h1_asignacion`, `ScreenId`) se mantienen consistentes en todo el proyecto.
- No se agregan abstracciones especulativas (YAGNI) ni dependencias nuevas en `package.json` sin una necesidad concreta y justificada.

## Comandos de calidad obligatorios

Antes de subir cambios al repositorio, deben ejecutarse y pasar sin errores los siguientes comandos:

```bash
npm run format        # Formatea src/ con Prettier
npm run format:check  # Verifica el formato sin modificar archivos
npm run lint          # Ejecuta ESLint sobre TypeScript y plantillas Angular
npm run typecheck     # Verifica tipado de TypeScript sin emitir archivos
npm run test:ci       # Ejecuta las pruebas unitarias con Vitest una sola vez
npm run build         # Genera el build de producción y valida budgets
npm run check         # Ejecuta lint, format:check, typecheck, test:ci y build
```

## Control de versión

- No subir cambios sin validar previamente con `npm run check`.
- Trabajar los cambios en ramas descriptivas (`feat/...`, `fix/...`, `refactor/...`, `chore/...`) y evitar commits directos a `main` cuando haya trabajo colaborativo o cambios de riesgo.
- Usar mensajes de commit claros y convencionales (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`) explicando el propósito del cambio.
