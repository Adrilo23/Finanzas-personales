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

npx supabase migration list  # estado local vs remoto de las migraciones
npx supabase db push         # aplica migraciones pendientes al proyecto remoto
```

Los tests (Vitest, entorno node, `TZ=Europe/Madrid`) cubren la lógica pura de `lib/` y viven junto al código (`lib/*.test.ts`). Para que algo sea testeable, separa el cálculo de la consulta a Supabase: `getX()` consulta y delega en una función pura `computeX()` (ver `lib/budgets.ts`, `lib/reports.ts`, `lib/recurring.ts`, `lib/stats.ts`). Todo cambio en dinero, signos, fechas o agregados debe venir con su test. GitHub Actions (`.github/workflows/ci.yml`) pasa lint, tipos y tests en cada push a `main`.

Para comprobar cambios de UI en un navegador real está el MCP de Playwright (`.mcp.json`): arranca `npm run dev` y navega a `http://localhost:3000`. Inicia sesión con un usuario de pruebas, nunca con la cuenta real.

Variables de entorno (en `.env.local`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Arquitectura

### Auth y Supabase
- `proxy.ts` (en Next 16 sustituye a `middleware.ts`) refresca la sesión de Supabase y redirige a `/login` a quien no esté autenticado. Las rutas públicas están en `PUBLIC_PATHS`. Si añades una ruta pública, añádela ahí y, si es un recurso estático, también al `matcher`.
- Usa `lib/supabase/server.ts` en Server Components, Server Actions y Route Handlers, y `lib/supabase/client.ts` en componentes cliente (por ejemplo, para subir adjuntos a Storage).
- Todo usa la anon key + RLS: cada tabla tiene políticas `user_id = auth.uid()`. Al insertar hay que pasar siempre `user_id: user.id`, sacado de `supabase.auth.getUser()`.

### Patrón por funcionalidad
Cada sección (`app/accounts`, `app/categories`, `app/transactions`, `app/recurring`, `app/budgets`) sigue la misma estructura:
- `page.tsx`: Server Component que consulta Supabase directamente.
- `actions.ts`: Server Actions (`'use server'`) que reciben `FormData`, validan con el esquema zod de `lib/validation/*-schemas.ts`, devuelven `{ error }` o `{ success: true }` y llaman a `revalidatePath`.
- `new-*-dialog.tsx`: diálogo cliente con react-hook-form + `zodResolver` usando el mismo esquema, que convierte los datos a `FormData` y llama a la action.

### Modelo de dinero (importante)
- Los importes se guardan como `bigint` en céntimos (`amount_cents`, `initial_balance_cents`). Las conversiones euros/céntimos se hacen **solo** en `lib/money.ts` (`eurosToCents`, `centsToEuros`, `formatCents`, `parseEurosInput`).
- **El signo lo pone el servidor a partir del tipo de categoría** con `applyCategorySign` (`lib/money.ts`): `income` es positivo; `expense`, `investment` o sin categoría, negativos. El usuario siempre introduce importes positivos.
- `transactions` usa soft delete (`deleted_at`). Toda consulta de movimientos debe filtrar con `.is('deleted_at', null)`.
- El saldo de cada cuenta sale de la vista `account_balances` (migración 0002, `security_invoker`), no se calcula en el cliente.

### Movimientos recurrentes
`lib/recurring.ts` → `processRecurringRules()` se ejecuta desde `components/app-nav.tsx` (montado en el layout) cada vez que se carga una página autenticada. Genera todas las transacciones que hayan vencido desde `next_run_date` (puede ser más de una por regla) y luego adelanta esa fecha. Las fechas las calcula `computeDueDates` usando `anchor_day` (día original de la regla), para que un día 31 no derive a 28 tras febrero. No hay cron: la generación ocurre de forma perezosa. La frecuencia `custom` existe en el esquema, pero se ignora.

### Relaciones embebidas de Supabase
Los selects con joins (`categories(type)`, `accounts(name)`) pueden devolver un objeto o un array según los tipos. El patrón del proyecto es un helper local `first()` que normaliza ambos casos (está en `lib/recurring.ts`, `lib/reports.ts`, `lib/budgets.ts` y en la ruta de exportación).

### Adjuntos
Se guardan en el bucket privado `attachments` con la ruta `{user_id}/{transaction_id}/archivo`; la política de Storage exige que la primera carpeta sea `auth.uid()`. Al borrar, se elimina primero el archivo de Storage y después la fila (`app/transactions/attachments-actions.ts`).

### Interfaz
- Tokens en `app/globals.css`: neutros cálidos, un único acento (`brand`) y colores semánticos de importes (`positive`, `negative`, `invest`). El modo oscuro sigue `prefers-color-scheme` (la variante `dark:` es una media query, no una clase). Los colores de la gráfica (`chart-1..3`) están validados para daltonismo en el orden ingresos → inversión → gastos; no los reordenes.
- Piezas compartidas: `PageShell` + `PageHeader` (`components/page-header.tsx`), `EmptyState`, `Amount` (importes con cifras tabulares; `signed` añade "+" y color), `CategoryBadge` / `CATEGORY_TYPE_META` y `AccountIcon`. En formularios: `Field`/`FieldError`/`FormError`, `NativeSelect`, `AmountInput` y `Segmented`; `parseEurosInput` (en `lib/money.ts`) convierte lo que teclea el usuario.
- Nada de `window.confirm`: los borrados usan `ConfirmDialog`. `Dialog` es una hoja inferior en móvil y un modal centrado desde `sm`.
- La navegación (`components/nav-links.tsx`, cliente) es una barra superior desde `lg` y una barra inferior de 5 pestañas por debajo. Si añades una sección, añádela a `NAV_ITEMS`: con `primary: true` va en la barra inferior (máximo 4 más «Más») y con `false` dentro de la hoja «Más».
- Estados de presupuesto: `BudgetStatusBadge` y `BudgetBar` (`components/budget-progress.tsx`), con el token `warning` para «cerca del límite». El color siempre va con icono y texto.

### Exportación
`app/transactions/export/route.ts` (runtime `nodejs`) genera XLSX (con `xlsx`) o PDF (con `jspdf` + `jspdf-autotable`) según los mismos filtros de `/transactions`.

### PWA / offline
Serwist con `@serwist/turbopack`: `next.config.ts` lo envuelve con `withSerwist`, el worker está en `app/sw.ts` y se sirve desde `app/serwist/[path]/route.ts`. Si la navegación falla sin conexión, se muestra `/offline`. La revisión de caché es el hash del commit de git.

### Base de datos
Las migraciones SQL están en `supabase/migrations/`, numeradas (`000N_descripcion.sql`). El repo está enlazado con la CLI al proyecto remoto (`kwouosaoaeydipzavjdr`): las migraciones se aplican con `npx supabase db push` y el historial remoto debe coincidir con `migration list`. No hay base de datos local en Docker. Después de cambiar el esquema, ejecuta `npm run db:types`. Los clientes de `lib/supabase/` están tipados con `Database`, así que las consultas tienen tipos (las columnas de las vistas salen anulables). Cada tabla nueva debe activar RLS e incluir las cuatro políticas `*_own`. Un trigger sobre `auth.users` precarga las categorías por defecto de cada usuario nuevo.
