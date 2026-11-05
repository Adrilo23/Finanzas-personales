# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Proyecto

App de finanzas personales (PWA multiplataforma) para registrar ingresos y gastos y ver métricas. Next.js 16 (App Router, Turbopack) + React 19 + Supabase (Auth, Postgres, Storage) + Tailwind 4 / shadcn/ui. La interfaz, los comentarios y los mensajes de commit están en español.

## Documentación del proyecto y roadmap

En `docs/` están las decisiones ya tomadas: `02-stack-y-convenciones.md`, `03-modelo-de-datos.md` y `04-roadmap.md`. Son la fuente de verdad compartida con el Project de claude.ai, que las lee desde GitHub.
- Antes de escribir código nuevo, comprueba que encaja con lo decidido ahí. Si una petición contradice una decisión de arquitectura, dilo antes de implementarla.
- Al terminar una tarea, marca su casilla en `04-roadmap.md` (con una nota si queda algo a medias), actualiza «Estado actual» y la fecha, e incluye el cambio en el mismo commit que el código. Si cambia el esquema, actualiza también `03-modelo-de-datos.md`.
- El código que llegue del Project de claude.ai puede estar escrito contra una versión antigua del repo: revísalo y adáptalo a las convenciones actuales, no lo pegues tal cual.

## Comandos

```bash
npm run dev     # servidor de desarrollo
npm run build   # build de producción (también compila el service worker)
npm run lint    # ESLint (eslint-config-next)
npx tsc --noEmit  # comprobación de tipos
npm test          # tests (Vitest), una pasada
npm run test:watch  # tests en modo vigilancia
npm run db:types  # regenera lib/supabase/database.types.ts desde la BD remota

npx supabase migration list --remote  # estado local vs remoto de las migraciones
npx supabase db push --remote         # aplica migraciones pendientes al proyecto remoto
```

Los tests (Vitest, entorno node, `TZ=Europe/Madrid`) cubren la lógica pura de `lib/` y viven junto al código (`lib/*.test.ts`). Para que algo sea testeable, separa el cálculo de la consulta a Supabase: `getX()` consulta y delega en una función pura `computeX()` (ver `lib/budgets.ts`, `lib/reports.ts`, `lib/recurring.ts`, `lib/stats.ts`). Todo cambio en dinero, signos, fechas o agregados debe venir con su test. GitHub Actions (`.github/workflows/ci.yml`) pasa lint, tipos y tests en cada push a `main`.

Para comprobar cambios de UI en un navegador real está el MCP de Playwright (`.mcp.json`): arranca `npm run dev` y navega a `http://localhost:3000`. Inicia sesión con un usuario de pruebas, nunca con la cuenta real.

Variables de entorno (en `.env.local`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Opcionales, solo servidor: `RESEND_API_KEY` y `EMAIL_FROM` para enviar el informe mensual por correo (`lib/email.ts`); sin ellas, el botón «Envíamelo» responde que el envío no está configurado.

## Arquitectura

### Auth y Supabase
- `proxy.ts` (en Next 16 sustituye a `middleware.ts`) refresca la sesión de Supabase y redirige a `/login` a quien no esté autenticado. Las rutas públicas están en `lib/public-paths.ts` (con tests): por prefijo (`/login`, `/register`, `/help`, `/demo`…) o exactas (`/`, la landing; como prefijo abriría toda la app). Si añades una ruta pública, añádela ahí y, si es un recurso estático, también al `matcher`.
- Usa `lib/supabase/server.ts` en Server Components, Server Actions y Route Handlers. **No hay cliente de Supabase en el navegador**: las cookies de sesión son `HttpOnly` y `Secure` (`lib/supabase/cookie-options.ts`, auditoría F-04), así que un componente cliente que necesite datos llama a una Server Action. Para subir a Storage, el servidor entrega una URL firmada (ver Adjuntos). No vuelvas a crear `createBrowserClient`: rompería con cookies `HttpOnly`.
- Todo usa la anon key + RLS: cada tabla tiene políticas `user_id = auth.uid()`. Al insertar hay que pasar siempre `user_id: user.id`, sacado de `supabase.auth.getUser()`.
- **PostgREST es accesible directamente con el JWT del usuario**, sin pasar por las Server Actions: las validaciones de la app no bastan. Las políticas de insert/update comprueban también que cada FK es del usuario (`owns_account`, `owns_category`, `owns_transaction`, `owns_recurring_rule`, `owns_holding`; migración `0014`), y los importes tienen `check` en la BD. Una tabla nueva con FK a datos del usuario debe hacer lo mismo.
- Un `delete` que la RLS filtra devuelve «0 filas», no error: las actions piden `.select('id')` y responden «No se ha encontrado» si no borraron nada.

### Patrón por funcionalidad
Cada sección (`app/accounts`, `app/categories`, `app/transactions`, `app/recurring`, `app/budgets`) sigue la misma estructura:
- `page.tsx`: Server Component que consulta Supabase directamente.
- `actions.ts`: Server Actions (`'use server'`) que reciben `FormData`, validan con el esquema zod de `lib/validation/*-schemas.ts`, devuelven `{ error }` o `{ success: true }` y llaman a `revalidatePath`.
- `new-*-dialog.tsx`: diálogo cliente con react-hook-form + `zodResolver` usando el mismo esquema, que convierte los datos a `FormData` y llama a la action.

### Modelo de dinero (importante)
- Los importes se guardan como `bigint` en céntimos (`amount_cents`, `initial_balance_cents`). Las conversiones euros/céntimos se hacen **solo** en `lib/money.ts` (`eurosToCents`, `centsToEuros`, `formatCents`, `parseEurosInput`). Todo importe que llega del usuario se valida con `positiveAmount` / `nonNegativeAmount` (`lib/validation/money-schemas.ts`): finito, como mucho dos decimales (para que nunca acabe en 0 céntimos) y hasta 1.000 millones de €.
- **El signo lo pone el servidor a partir del tipo de categoría** con `applyCategorySign` (`lib/money.ts`): `income` es positivo; `expense`, `investment` o sin categoría, negativos. El usuario siempre introduce importes positivos.
- `transactions` usa soft delete (`deleted_at`). Toda consulta de movimientos debe filtrar con `.is('deleted_at', null)`.
- El saldo de cada cuenta sale de la vista `account_balances` (migración 0002, `security_invoker`), no se calcula en el cliente.

### Traspasos
Un traspaso entre cuentas son dos filas de `transactions` con el mismo `transfer_id` y sin categoría (`lib/transfers.ts`). Al no tener categoría, todos los totales por tipo, los informes y los presupuestos los ignoran solos. En listas sin filtro de cuenta, oculta la pata de entrada (`isHiddenTransferLeg`) y no los cuentes como entradas ni salidas. Se editan con la RPC `update_transfer` y se borran ambas patas. `recurring_rules.to_account_id` convierte una regla en traspaso periódico.

Un traspaso recurrente con filas en `recurring_allocations` es un **plan de aportación**: `processRecurringRules` delega todos los traspasos recurrentes en la RPC `run_contribution_plan` (atómica: traspasos, compras pendientes y nueva fecha). Las compras pendientes (`holding_operations.status = 'pending'`) se confirman con `confirmOperation`. Las reglas se editan con `updateRecurringRule`; los traspasos y planes pasan por la RPC `update_recurring_transfer`, que sustituye regla y reparto a la vez.

**Ojo con los embeds:** `recurring_rules` tiene dos FK a `accounts`, así que `accounts(name)` es ambiguo y PostgREST devuelve error; usa `accounts!recurring_rules_account_id_fkey(name)`. Revisa los embeds cada vez que añadas una segunda FK a una tabla.

### Movimientos recurrentes
`lib/recurring.ts` → `processRecurringRules()` se ejecuta desde `components/app-nav.tsx` (montado en el layout) cada vez que se carga una página autenticada. Genera todas las transacciones que hayan vencido desde `next_run_date` (puede ser más de una por regla) y luego adelanta esa fecha. Las fechas las calcula `computeDueDates` usando `anchor_day` (día original de la regla), para que un día 31 no derive a 28 tras febrero. No hay cron: la generación ocurre de forma perezosa. La frecuencia `custom` existe en el esquema, pero se ignora.

**Radix `asChild` y Server Components:** pasar como `trigger` un elemento creado en un Server Component a un diálogo cliente puede romper el SSR ("Primitive.button failed to slot"). Si falla, deja que el propio diálogo pinte su botón (ver `NewRecurringDialog` con `rule`).

### Relaciones embebidas de Supabase
Los selects con joins (`categories(type)`, `accounts(name)`) pueden devolver un objeto o un array según los tipos. El patrón del proyecto es un helper local `first()` que normaliza ambos casos (está en `lib/recurring.ts`, `lib/reports.ts`, `lib/budgets.ts` y en la ruta de exportación).

### Inversiones
Las cuentas de tipo `investment` tienen activos (`holdings`: fondos por ISIN o criptomonedas) con sus compras/ventas (`holding_operations`, participaciones `numeric` introducidas a mano). El valor (participaciones × último precio) se calcula en SQL en la vista `holding_values` y se suma al saldo en `account_balances`; no lo calcules en JS. Los precios vienen de `lib/prices.ts` (interfaz `PriceProvider`, hoy la API no oficial de Yahoo, no apta para uso comercial) y se guardan por usuario en `asset_prices`. `refreshStalePrices` se ejecuta junto a los recurrentes en `components/app-nav.tsx` y solo consulta la fuente si un activo lleva sin refrescar más de su intervalo (`isPriceStale`: fondos 6 h, cripto 1 h). La lógica pura (ISIN, participaciones, parseo de respuestas) está en `lib/investments.ts`, con tests.

### Cuentas remuneradas
Cualquier cuenta puede tener `interest_rate` (% anual) e `interest_next_date`. `processAccountInterest` (`lib/interest.ts`, llamado desde `components/app-nav.tsx`) abona cada día 1 el interés del mes anterior: interés devengado día a día sobre el saldo de efectivo (movimientos + operaciones con `affects_cash`): Σ saldo diario × % bruto ÷ 365, y se abona el **neto** tras la retención del 19 % (`applyWithholding`, redondeo hacia arriba), como ingreso de la categoría «Intereses». Antes de insertar, reserva el periodo moviendo la fecha con un update condicional, para no duplicar si coinciden dos cargas. El cálculo es puro y tiene tests (`computeInterestPayments`).

### Adjuntos
Se guardan en el bucket privado `attachments` (solo JPG/PNG/WEBP/PDF de hasta 10 MB) con la ruta `{user_id}/{transaction_id}/archivo`; la política de Storage exige que la primera carpeta sea `auth.uid()` y la segunda un movimiento propio. Todo pasa por `app/transactions/attachments-actions.ts`: `prepareAttachmentUpload` comprueba el movimiento y devuelve una URL de subida firmada (el navegador sube con `fetch`, sin sesión), `createAttachment` solo acepta rutas propias (`lib/attachments.ts`), y ver/borrar sacan la ruta de la fila, nunca del cliente. Al borrar, se elimina primero el archivo de Storage y después la fila.

### Interfaz
- El sistema de diseño completo (colores, tipografía, componentes y reglas) está en `DESIGN.md`; si cambias tokens o componentes compartidos, actualízalo.
- Tokens en `app/globals.css`: neutros cálidos, un único acento (`brand`) y colores semánticos de importes (`positive`, `negative`, `invest`). El modo oscuro sigue `prefers-color-scheme` (la variante `dark:` es una media query, no una clase). Los colores de la gráfica (`chart-1..3`) están validados para daltonismo en el orden ingresos → inversión → gastos; no los reordenes.
- Piezas compartidas: `PageShell` + `PageHeader` (`components/page-header.tsx`), `EmptyState`, `Amount` (importes con cifras tabulares; `signed` añade "+" y color), `CategoryBadge` / `CATEGORY_TYPE_META`, `AccountIcon` y `HelpHint` (ayuda «?» con enlace a su pregunta de `/help`; úsala solo donde algo confunda de verdad, no en cada campo). En formularios: `Field`/`FieldError`/`FormError`, `NativeSelect`, `AmountInput` y `Segmented`; `parseEurosInput` (en `lib/money.ts`) convierte lo que teclea el usuario.
- Nada de `window.confirm`: los borrados usan `ConfirmDialog`. `Dialog` es una hoja inferior en móvil y un modal centrado desde `sm`.
- La navegación (`components/nav-links.tsx`, cliente) es una barra superior desde `lg` y una barra inferior de 5 pestañas por debajo. Si añades una sección, añádela a `NAV_ITEMS`: con `primary: true` va en la barra inferior (máximo 4 más «Más») y con `false` dentro de la hoja «Más». `topBar: false` la saca de la barra superior de escritorio (así está «Ayuda», que va en el menú de usuario).
- Gráficas de importes: el eje Y sale de `niceAxis` (`lib/chart-axis.ts`, con tests): marcas redondas, «€» una vez en el título y sin exagerar los negativos pequeños.
- Estados de presupuesto: `BudgetStatusBadge` y `BudgetBar` (`components/budget-progress.tsx`), con el token `warning` para «cerca del límite». El color siempre va con icono y texto.

### Landing y demo
Sin sesión, `/` pinta la landing (`app/landing.tsx`) en vez del inicio, y `/demo` es una demo pública de solo lectura. Las dos usan datos de ejemplo de `lib/demo-data.ts`, generados de forma determinista y pasados por las mismas funciones puras que la app (`sumByType`, `computeBudgetProgress`, `computeGoals`, `aggregateMonthly`); no consultan Supabase. La demo enseña el último mes completo. Siempre se etiquetan como datos de ejemplo: no hay testimonios ni cifras reales que mostrar (ver `PRODUCT.md`). La dirección de diseño de la landing está en `.impeccable/surfaces/app-landing-tsx.md`.

### Exportación e informes
`app/transactions/export/route.ts` (runtime `nodejs`) genera XLSX (con `xlsx`) o PDF (con `jspdf` + `jspdf-autotable`) según los mismos filtros de `/transactions`. Los informes mensual (`/reports/monthly`) y anual (`/reports/annual`) tienen su cálculo puro en `lib/monthly-report.ts` / `lib/annual-report.ts`, su PDF en `lib/*-report-pdf.ts` y su ruta `export`. El año en curso se compara con el mismo periodo del año anterior. El mensual se puede enviar al correo del usuario («Envíamelo», `app/reports/monthly/actions.ts`): siempre a su propio email, nunca a un destinatario que llegue del cliente.

**Límite de 1000 filas:** PostgREST corta cada respuesta en `max_rows` (1000) sin avisar. Cualquier consulta de movimientos que pueda superar ese número (un año, todo el histórico) debe paginar con `fetchAllRows` (`lib/fetch-all.ts`) y un orden estable (`.order('id')`).

### Seguridad
- **Cabeceras:** `proxy.ts` genera un nonce por petición y la CSP (`buildCsp` en `lib/security-headers.ts`): scripts solo con nonce, `frame-ancestors 'none'`, `connect-src` limitado a la app y Supabase. Next pone el nonce en sus scripts porque todas las páginas son dinámicas; una página estática no lo recibiría. Las cabeceras fijas (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`) están en `next.config.ts`. Si añades un origen externo (fuente, API desde el navegador), añádelo a la CSP.
- **Login:** `login` limita los fallos por IP+email (5 en 15 min) y por IP (30) con las funciones `login_throttle_status` / `login_throttle_fail` (migración `0014`, tabla `login_attempts` sin acceso directo) y responde siempre «Email o contraseña incorrectos». Si el limitador falla, no bloquea el login.
- **Descargas** (PDF/XLSX): `Cache-Control: private, no-store`.
- **Dependencias:** `npm audit --omit=dev` debe quedar a 0. `xlsx` se instala desde el CDN oficial de SheetJS (la versión de npm está abandonada y tiene avisos). Los avisos que quedan son de herramientas de desarrollo (eslint, build de Serwist, CLI de shadcn) y no llegan a producción.

### PWA / offline
Serwist con `@serwist/turbopack`: `next.config.ts` lo envuelve con `withSerwist`, el worker está en `app/sw.ts` y se sirve desde `app/serwist/[path]/route.ts`. Si la navegación falla sin conexión, se muestra `/offline`. La revisión de caché es el hash del commit de git.

### Base de datos
Las migraciones SQL están en `supabase/migrations/`, numeradas (`000N_descripcion.sql`). El repo está enlazado con la CLI al proyecto remoto (`kwouosaoaeydipzavjdr`): las migraciones se aplican con `npx supabase db push --remote` y el historial remoto debe coincidir con `migration list --remote`. La CLI está fijada en `devDependencies` (`supabase@3.0.0`; súbela a propósito, no con `npx` a ciegas). Desde la CLI 3, sin `--remote` los comandos apuntan a una base local en Docker que no existe y fallan con `ECONNREFUSED 127.0.0.1:54322`. No hay base de datos local en Docker. Después de cambiar el esquema, ejecuta `npm run db:types`. Los clientes de `lib/supabase/` están tipados con `Database`, así que las consultas tienen tipos (las columnas de las vistas salen anulables). Cada tabla nueva debe activar RLS e incluir las cuatro políticas `*_own`. Un trigger sobre `auth.users` precarga las categorías por defecto de cada usuario nuevo.
