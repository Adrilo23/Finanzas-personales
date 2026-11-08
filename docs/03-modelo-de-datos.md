# Modelo de datos — App Ingresos/Gastos

Modelo orientado a PostgreSQL (Supabase), pensado como un *ledger* (libro de movimientos) y no como un CRUD simple, para tener trazabilidad real.

> **Fuente de verdad:** las migraciones de `supabase/migrations/` y los tipos generados en `lib/supabase/database.types.ts` (`npm run db:types`). Este documento las resume. Cualquier cambio de esquema se hace con una migración nueva numerada y se refleja aquí en el mismo commit.
>
> Última revisión contra las migraciones: 2026-10-04 (hasta `0012`).

## Convenciones

- **RLS en todas las tablas** desde el día 1, con políticas `*_own` del tipo `user_id = auth.uid()`.
- **Importes en `bigint` (céntimos)**, nunca `float`/`real`. Las conversiones euros/céntimos se hacen solo en `lib/money.ts`.
- **Signo del importe:** `amount_cents` positivo = ingreso; negativo = gasto o inversión. Lo pone el servidor según el tipo de la categoría; el usuario siempre escribe importes positivos.
- `transaction_date` y `created_at` van por separado: se puede registrar hoy un gasto de la semana pasada.
- **Borrado lógico** de movimientos (`deleted_at`). Toda consulta de movimientos filtra `deleted_at is null`.

## Entidades

### users
Las gestiona Supabase Auth (`auth.users`). Cada tabla propia la referencia con `on delete cascade`. Un trigger (`on_auth_user_created_categories`) precarga las categorías por defecto de cada usuario nuevo.

### accounts (cuentas) — `0001`
Dónde está el dinero: cuenta bancaria, efectivo, tarjeta…

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → auth.users, RLS |
| name | text | "Cuenta corriente", "Efectivo"… |
| type | text | `bank`, `cash`, `card`, `investment` (desde `0007`), `other` |
| currency | text | ISO 4217, por defecto `EUR` |
| initial_balance_cents | bigint | saldo inicial en céntimos |
| interest_rate | numeric(6,3) | opcional (`0011`): interés anual en % de una cuenta remunerada, p. ej. `3` |
| interest_next_date | date | próximo abono de intereses (día 1); los dos campos van juntos o los dos nulos |
| created_at | timestamptz | |

Intereses: cada día 1 se abona como ingreso (categoría «Intereses», se crea si no existe) el interés **neto** del mes anterior: bruto = Σ saldo de efectivo de cierre de cada día × % ÷ 365 (devengo diario, base 365, como los bancos), menos la retención de IRPF del 19 % redondeada hacia arriba al céntimo. La descripción guarda el bruto y la retención. El % de la cuenta es el bruto que anuncia el banco. Lo calcula `lib/interest.ts` de forma perezosa, como los recurrentes.

### categories (categorías) — `0001`
Categorías de ingreso, gasto o inversión, con subcategorías.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK, RLS |
| parent_id | uuid \| null | auto-referencia; `on delete set null` |
| name | text | "Alimentación", "Nómina"… |
| type | text | `income`, `expense`, `investment` |
| icon | text \| null | emoji opcional para la UI |
| created_at | timestamptz | |

Por defecto: Nómina y Otros ingresos (`income`); Alquiler, Alimentación, Transporte, Ocio, Suministros, Salud y Otros gastos (`expense`); Inversión (`investment`).

### transactions (movimientos) — `0001`, `0004`, `0008`
Tabla central.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK, RLS |
| account_id | uuid | FK → accounts, **`on delete cascade`** (desde `0004`) |
| category_id | uuid \| null | FK → categories, `on delete set null` |
| amount_cents | bigint | con signo (ver convenciones) |
| currency | text | ISO 4217, por defecto `EUR` |
| description | text \| null | |
| transaction_date | date | por defecto `current_date` |
| recurring_rule_id | uuid \| null | FK → recurring_rules, `on delete set null` |
| transfer_id | uuid \| null | enlaza las dos patas de un **traspaso** (`0008`); en ese caso `category_id` es null (check) |
| deleted_at | timestamptz \| null | borrado lógico |
| created_at | timestamptz | |
| updated_at | timestamptz | lo mantiene el trigger `set_updated_at` |

### recurring_rules (movimientos recurrentes) — `0001`, `0006`
Nóminas, alquiler, suscripciones…

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK, RLS |
| account_id | uuid | FK, `on delete cascade` |
| category_id | uuid \| null | FK, `on delete set null` |
| amount_cents | bigint | **se guarda en positivo**; el signo se aplica al generar el movimiento |
| frequency | text | `weekly`, `monthly`, `yearly`, `custom` (`custom` existe pero se ignora) |
| next_run_date | date | |
| anchor_day | smallint | día del mes original (1-31, `0006`). Los vencimientos mensuales y anuales vuelven a este día, recortado al último día en los meses cortos (31 → 28 feb → 31 mar) |
| active | boolean | |
| created_at | timestamptz | |

`to_account_id` (`0008`, FK → accounts, `on delete cascade`): si está, la regla es un **traspaso** periódico de `account_id` a `to_account_id` (sin categoría). Con dos FK a accounts, los embeds deben nombrar la relación: `accounts!recurring_rules_account_id_fkey(name)`.

Los movimientos se generan de forma diferida (`lib/recurring.ts`) al cargar una página autenticada; no hay cron.

### attachments (adjuntos) — `0003`
Metadatos de los archivos guardados en el bucket privado `attachments` de Supabase Storage.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK, RLS |
| transaction_id | uuid | FK → transactions, `on delete cascade` |
| storage_path | text | `{user_id}/{transaction_id}/archivo` |
| file_name | text | nombre original |
| uploaded_at | timestamptz | |

Las políticas de Storage exigen que la primera carpeta de la ruta sea `auth.uid()`. La tabla tiene políticas de select, insert y delete (no hay update).

### budgets (presupuestos) — `0005`
Un límite mensual por categoría de gasto; se reinicia cada mes (no hay histórico de presupuestos).

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK, RLS |
| category_id | uuid | FK → categories, `on delete cascade` |
| amount_cents | bigint | límite mensual, `> 0` |
| created_at | timestamptz | |

`unique (user_id, category_id)`: un presupuesto por categoría; guardar otro para la misma categoría sustituye el importe (`upsert`). La FK no pasa por RLS, así que la Server Action comprueba que la categoría es del usuario y de tipo `expense`. Lo gastado se calcula en `lib/budgets.ts`: movimientos de gasto del mes en curso, **sumando los de las subcategorías al padre**. Avisos: «Cerca del límite» desde el 80 %, «Superado» por encima del 100 %.

### Objetivos de ahorro — `0012`, `0013`
**savings_goals**: `id`, `user_id`, `name` (1-80), `icon` (emoji opcional), `target_cents` (`> 0`), `target_date` (opcional), `account_id` (opcional, FK → accounts, `on delete set null`; `0013`), `created_at`. Las políticas de insert y update exigen que la cuenta vinculada sea del mismo usuario.

**goal_contributions**: `id`, `user_id`, `goal_id` (FK → savings_goals, `on delete cascade`), `amount_cents` (`<> 0`; positivo = aportación, negativo = retirada), `contribution_date`, `note`, `created_at`. La política de insert exige que el objetivo sea del mismo usuario (la FK no pasa por RLS).

Lo ahorrado es la suma de aportaciones (mínimo 0; la action impide retirar más de lo ahorrado). **No son movimientos** (`transactions`): no afectan a saldos, informes ni presupuestos. Progreso, ritmo y estado: `lib/goals.ts`.

**Objetivo vinculado** (`account_id` no nulo): lo ahorrado es el `balance_cents` de la cuenta (`account_balances`) y el ritmo, el neto de sus movimientos de los últimos 90 días (traspasos incluidos; la revalorización de una cuenta de inversión no cuenta como ritmo). No admite aportaciones manuales (la action lo impide); las que tuviera se conservan y vuelven a contar si se desvincula o se borra la cuenta.

### Inversiones — `0007`
Una cuenta de tipo `investment` (MyInvestor, Kraken…) contiene **activos**: fondos (con ISIN) o criptomonedas (sin ISIN). Todos se identifican por su código en la fuente de precios (`symbol`), y las participaciones las introduce el usuario desde su bróker.

**holdings** — activos de cada cuenta

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK, RLS |
| account_id | uuid | FK → accounts, `on delete cascade` |
| asset_type | text | `fund`, `crypto` |
| isin | text \| null | obligatorio si `fund`; validado (formato y dígito de control) en la app y con regex en BD |
| symbol | text | código en la fuente de precios (`0P0001CLDK.F`, `BTC-EUR`) |
| name | text | resuelto desde la fuente al añadirlo |
| currency | text | de momento solo `EUR` (se rechazan activos en otra moneda) |
| prices_checked_at | timestamptz \| null | último intento de refrescar precios (se reintenta cada 6 h en fondos y cada hora en cripto) |
| created_at | timestamptz | |

`unique (account_id, symbol)`.

**holding_operations** — compras y ventas

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK, RLS |
| holding_id | uuid | FK → holdings, `on delete cascade` |
| operation_date | date | |
| kind | text | `buy`, `sell` |
| units | numeric(20, 8) \| null | participaciones o unidades de cripto, `> 0`; solo null en compras pendientes sin estimar |
| amount_cents | bigint | importe pagado o recibido, `> 0` |
| affects_cash | boolean | `0008`: la compra se paga con (o la venta se cobra en) el efectivo de la cuenta. Las posiciones registradas antes de existir los traspasos se migraron a `false` |
| status | text | `pending` / `confirmed` (`0009`). Las compras que genera un plan de aportación nacen `pending` con participaciones estimadas (o null si no había precio) |
| recurring_rule_id | uuid \| null | plan que la generó (`0009`) |
| created_at | timestamptz | |

**asset_prices** — precio diario (valor liquidativo o cierre), **por usuario** en esta fase

| Campo | Tipo | Notas |
|---|---|---|
| user_id | uuid | FK, RLS |
| symbol | text | |
| price_date | date | |
| price | numeric(20, 8) | redondeado a 6 decimales al descargarlo |
| currency | text | |
| fetched_at | timestamptz | |

PK `(user_id, symbol, price_date)`. Es por usuario porque la app lo rellena con la sesión del propio usuario: una tabla compartida permitiría escribir precios que verían otros. Al pasar a la actualización programada con service role (roadmap, Fase 3b tanda 2) se podrá compartir.

### recurring_allocations (reparto de un plan de aportación) — `0009`

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK, RLS |
| rule_id | uuid | FK → recurring_rules (un traspaso recurrente), `on delete cascade` |
| holding_id | uuid | FK → holdings, `on delete cascade` |
| amount_cents | bigint | `> 0`; la suma no puede superar el importe del traspaso (lo que sobra queda como efectivo) |
| created_at | timestamptz | |

`unique (rule_id, holding_id)`. La función `run_contribution_plan(p_rule_id, p_dates, p_next)` (atómica, `security invoker`) genera en cada vencimiento: el traspaso de la regla; un traspaso destino → cuenta del activo si el activo está en otra cuenta; y una compra pendiente por activo con participaciones = importe ÷ último precio. Al final adelanta `next_run_date`. Para editar un plan, `update_recurring_transfer(p_rule_id, …, p_allocations jsonb)` (migración `0010`, atómica) actualiza la regla, recalcula `anchor_day` y sustituye su reparto.

### subscriptions (reservada, futuro SaaS)
Sin implementar; solo reservada en el diseño.

## Relaciones

```
users 1───N accounts
users 1───N categories (auto-referencia parent_id)
users 1───N transactions
accounts 1───N transactions
categories 1───N transactions
recurring_rules 1───N transactions
transactions 1───N attachments
categories 1───1 budgets (opcional)
accounts 1───N holdings 1───N holding_operations
```

### Seguridad en la base de datos — `0014`
- **Propiedad de las FK en RLS:** las políticas de insert/update de `categories`, `recurring_rules`, `transactions`, `attachments`, `budgets`, `holdings`, `holding_operations`, `recurring_allocations` y `goal_contributions` exigen, además de `user_id = auth.uid()`, que cada FK apunte a una fila del usuario. Funciones auxiliares `owns_account`, `owns_category`, `owns_transaction`, `owns_transaction_path` (texto, para Storage), `owns_recurring_rule` y `owns_holding` (`security invoker`, `stable`).
- **Límites de importe** (`not valid`: aplican a lo nuevo y a lo editado): `transactions.amount_cents` y `recurring_rules.amount_cents` ≠ 0 y |x| ≤ 100.000.000.000 céntimos (1.000 millones de €); el mismo tope en saldos iniciales, presupuestos, operaciones, repartos, objetivos y aportaciones.
- **Bucket `attachments`:** `allowed_mime_types` = JPG/PNG/WEBP/PDF, `file_size_limit` = 10 MB; la política de insert exige además que la segunda carpeta sea un movimiento propio.
- **login_attempts**: `key` (`pair:` o `ip:` + sha256), `failures`, `window_start`, `blocked_until`. RLS sin políticas y sin permisos para `anon`/`authenticated`: solo se usa desde `login_throttle_status(p_keys)` y `login_throttle_fail(p_keys)` (`security definer`). No hay función para reiniciar el contador, a propósito.

### Borrado de la cuenta — `0015`
- **`delete_my_account()`** (`security definer`, solo `authenticated`): borra de `auth.users` al usuario de la sesión; el resto de tablas se va por `on delete cascade`. Los archivos del bucket `attachments` no cascadean: la Server Action `deleteMyAccount` (`app/settings/actions.ts`) los elimina por la API de Storage antes de llamar a la función.

### Registro sin conexión — `0016`
- **`transactions.client_id`** (`uuid`, nulo): lo genera el navegador para cada movimiento de la cola sin conexión. Índice único parcial `(user_id, client_id) where client_id is not null`: un reintento falla con `23505` y `createTransaction` lo trata como «ya guardado», así que no duplica el dinero.

### Correcciones de la auditoría de seguridad — `0017`
- **`rate_events`** (`user_id`, `action`, `created_at`): RLS activado, sin políticas y sin permisos para `anon`/`authenticated`. Solo la usa **`check_rate_limit(p_action, p_max, p_window)`** (`security definer`, solo `authenticated`, usa `auth.uid()`): devuelve `false` al superar el límite. La app la llama con `allowAction` (`lib/rate-limit.ts`) para el informe por correo (5/hora) y las exportaciones (20/10 min).
- **`run_contribution_plan`**: `select … for update` sobre la regla y error «Plan ya procesado» si alguna fecha es anterior a `next_run_date` (dos cargas simultáneas ya no duplican).
- **`holding_operations`**: las políticas de insert/update comprueban también `owns_recurring_rule(recurring_rule_id)`.
- **Permisos:** `update_transfer`, `run_contribution_plan`, `update_recurring_transfer`, `convert_to_transfer`, los `owns_*`, `delete_my_account` y `check_rate_limit` solo para `authenticated`; `anon` sin acceso a las tablas del esquema `public` (y sin privilegios por defecto en las futuras). Las funciones del limitador de login siguen abiertas a `anon`.
- **Limitador de login:** índice en `login_attempts(window_start)` y tope de 100 000 filas en `login_throttle_fail`.
- **Restricciones (`not valid`, solo para lo nuevo):** longitudes máximas de `transactions.description` (500), `accounts.name` y `categories.name` (1-80), `goal_contributions.note` (500) y `attachments.file_name` (255); `recurring_rules`: un traspaso exige `amount_cents > 0`. Las restricciones de importe de `0014` siguen sin validar las filas antiguas (por ejemplo, movimientos de 0 céntimos).
- **Trigger `transactions_enforce_sign`** (`before insert or update of amount_cents, category_id`): con categoría, un `income` no puede ser negativo ni un `expense`/`investment` positivo. Sin categoría (traspasos) no se comprueba y el borrado lógico no lo activa.
- **Índices** en las FK que faltaban (`transactions.recurring_rule_id`, `recurring_rules.{account_id,to_account_id,category_id}`, `recurring_allocations.{holding_id,user_id}`, `holding_operations.recurring_rule_id`, `goal_contributions.user_id`, `savings_goals.account_id`, `budgets.category_id`) y `search_path = public, pg_temp` en las funciones `security definer`.

## Vistas y cálculos derivados

- **`account_balances`** (`0002`, recreada en `0007` y `0008`, `security_invoker`): `cash_cents` = saldo inicial + movimientos no borrados − compras + ventas (las que tienen `affects_cash`); `balance_cents` = `cash_cents` + `market_value_cents` (valor de mercado de sus activos). Las columnas de la vista salen anulables en los tipos generados.
- **`holding_values`** (`0007`, `security_invoker`): por activo, participaciones netas (compras − ventas), aportado neto (`invested_cents`), último precio y fecha, `value_cents = round(participaciones × precio × 100)` y `gain_cents = valor − aportado`, todo en `numeric` y redondeado a céntimos en SQL.
### Traspasos
Dos filas de `transactions` con el mismo `transfer_id` (pata negativa en origen, positiva en destino), insertadas en una sola sentencia (`lib/transfers.ts` → `buildTransferRows`). Se editan con la función `update_transfer` (atómica, `security invoker`) y se borran juntas. `convert_to_transfer` (`0013`, atómica, `security invoker`) convierte un movimiento de salida con categoría de tipo `investment` (lo que antes de los traspasos se registraba como inversión) en la pata de salida de un traspaso: le quita la categoría, le asigna un `transfer_id` y crea la pata de entrada en la cuenta destino. Conserva los adjuntos. Al no tener categoría, no cuentan como ingreso, gasto, inversión ni presupuesto. En listas sin filtro de cuenta se muestra solo la pata de salida.

- Totales por categoría y periodo, e ingresos frente a gastos por mes y por año: se calculan en el servidor (`app/page.tsx`, `lib/reports.ts`, `lib/monthly-report.ts`, `lib/annual-report.ts`), no en tablas. Las consultas que pueden superar las 1000 filas que devuelve PostgREST por respuesta (un año, todo el histórico) paginan con `fetchAllRows` (`lib/fetch-all.ts`).

## Diferencias con el diseño inicial

| Diseño inicial | Implementado | Motivo |
|---|---|---|
| `categories.type`: `income`, `expense` | añade `investment` | separar la inversión del gasto en totales y gráficas |
| Movimientos inmutables y corrección con ajustes, o edición auditada (a decidir) | edición directa + borrado lógico; `updated_at` por trigger | uso personal; la auditoría se deja para SaaS |
| Signo en `amount_cents` o campo `type` aparte (a decidir) | signo en `amount_cents`, derivado de la categoría | |
| `attachments` sin `user_id` ni `file_name` | con `user_id` (para RLS) y `file_name` | RLS directa y mostrar el nombre original |
| `transactions.account_id` sin acción definida | `restrict` en `0001` → `cascade` en `0004` | poder borrar una cuenta con su historial |
