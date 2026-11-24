# Clean Code — Reglas del proyecto ARLOGS

Reglas obligatorias para todo el código de este repositorio (`arlogs-app`).

## Arquitectura y estructura (Santísima Trinidad + Hexagonal + Atomic Design)

- Stack base: Angular 22 (standalone components, Signals y control de flujo `@if`/`@for`/`@switch`/`@defer`), TypeScript, Bootstrap 5, SheetJS (`xlsx`), Vitest, ESLint y Prettier.
- Estructura de capas dentro de `src/app`:
  - `core/config/`: archivo maestro centralizado de configuración de red, puertos y endpoints armados por partes (`api-endpoints.config.ts`). Prohibido quemar URLs o puertos fuera de este archivo.
  - `domain/`: núcleo puro en TypeScript (cero imports de Angular), motores determinísticos de negocio (`milestone-rules.engine.ts`, `logistics-analytics.engine.ts`), catálogos (`iam-roles.catalog.ts`) y puertos (`*.port.ts`).
  - `application/`: casos de uso, fábricas y gestores de flujo (`shipment.factory.ts`, `warehouse-kardex.manager.ts`, `iam-user.factory.ts`).
  - `infrastructure/`: adaptadores concretos de puertos (`xlsx-spreadsheet-exporter.adapter.ts`), interceptores HTTP (`arlogs-context.interceptor.ts`) y seeders de persistencia.
  - `presentation/ui/`: componentes reutilizables bajo **Atomic Design** (`atoms/`, `molecules/`, `organisms/`).
  - `services/` y `components/`: servicios de estado compartido con Signals y páginas/vistas conectadas a la capa de aplicación.
- Dirección de dependencias obligatoria: `presentation/components` -> `application/services` -> `domain` <- `infrastructure`.

## Tamaño de archivos, componentes y funciones

- Todo componente, servicio o utilidad nueva debe mantenerse enfocado y conciso (objetivo: máximo 150-200 líneas de lógica TypeScript; límite duro: ningún archivo supera las 500 líneas).
- Cuando la plantilla de un componente supere las ~50 líneas o tenga estilos propios extensos, se separa obligatoriamente en su trinidad de archivos dedicados (`*.component.ts`, `*.component.html` y `*.component.css`).
- Para archivos que crezcan, aplica la regla del *Boy Scout*: no se agrega lógica monolítica nueva; se extraen átomos/moléculas/organismos, helpers puros en `domain/` o gestores en `application/`.
- Cada función o método cumple una sola responsabilidad.

## Comentarios y formato

- No se usan comentarios para explicar qué hace el código; los nombres de clases, signals, variables y métodos deben ser autoexplicativos.
- Se permite un comentario breve (una línea) solo para explicar un porqué no obvio o una regla de negocio crítica.
- No se dejan bloques de código comentado, `TODO` sin ticket/responsable asociado ni emojis en código, commits o documentación.
- Todo el código fuente debe respetar `.prettierrc` y `.editorconfig`.

## Estado, datos y reglas de seguridad por rol

- El estado de dominio vive en servicios usando Angular Signals (`signal`, `computed`, `asReadonly()`); los componentes solo mantienen estado local de interfaz (filtros, modales, pestañas, formularios).
- Reglas estrictas de visibilidad por rol en ARLOGS:
  - El rol `operaciones` nunca debe visualizar ni manipular precios, tarifas, costos ni facturación.
  - Los roles de cliente (`cliente_a`, `cliente_b` y futuros clientes) solo acceden a embarques y órdenes de compra filtrados estrictamente por su `clienteId`.
  - El acceso a pantallas se controla siempre mediante `AuthService` (`allowedScreensForCurrentUser`), nunca solo ocultando controles en la vista.
- Toda comunicación HTTP usa exclusivamente los endpoints definidos en `src/app/core/config/api-endpoints.config.ts` y se centraliza en adaptadores/servicios, nunca directamente en componentes.

## Auditoría y logging

- Toda acción sensible del negocio (edición de hitos H1-H10, cambios de umbral SLA, cotizaciones QR, facturación, movimientos Kardex, gestión de usuarios/roles y sesiones) debe registrarse mediante `AuditService`.
- Prohibido dejar `console.log`, `console.warn`, `console.debug` o `debugger` en código que llegue al repositorio.
- Nunca se exponen contraseñas, tokens ni datos confidenciales en logs o mensajes de error mostrados al usuario.

## Componentes, rendimiento y recursos

- Antes de crear UI nueva, se revisan los átomos, moléculas y organismos en `src/app/presentation/ui/` (`app-status-pill`, `app-pagination-bar`, `app-modal-shell`, `app-kpi-stat-ribbon`, `app-milestone-stepper`) y tokens globales de `src/styles.css` para evitar duplicación.
- Usar `inject()` para inyección de dependencias y Signals para estado reactivo. Evitar suscripciones manuales sin limpieza (`DestroyRef` / `takeUntilDestroyed`).
- Mantener las vistas principales cargadas con `@defer` y cuidar los presupuestos de bundle definidos en `angular.json`.

## Nombres y dependencias

- Nombres de archivos, clases, servicios, componentes y funciones en inglés siguiendo las convenciones de Angular (`*.component.ts`, `*.service.ts`, `*.model.ts`, `*.port.ts`, `*.adapter.ts`, `*.engine.ts`, `*.spec.ts`).
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
