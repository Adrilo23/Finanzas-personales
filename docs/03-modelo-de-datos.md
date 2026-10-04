# Modelo de datos — App Ingresos/Gastos

Modelo orientado a PostgreSQL (Supabase), pensado como un *ledger* (libro de movimientos) y no como un CRUD simple, para tener trazabilidad real.

> **Fuente de verdad:** las migraciones de `supabase/migrations/` y los tipos generados en `lib/supabase/database.types.ts` (`npm run db:types`). Este documento las resume. Cualquier cambio de esquema se hace con una migración nueva numerada y se refleja aquí en el mismo commit.
>
> Última revisión contra las migraciones: 2026-10-04 (hasta `0007`).

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
| created_at | timestamptz | |

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

### transactions (movimientos) — `0001`, `0004`
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
| prices_checked_at | timestamptz \| null | último intento de refrescar precios (se reintenta cada 6 h) |
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
| units | numeric(20, 8) | participaciones o unidades de cripto, `> 0` |
| amount_cents | bigint | importe pagado o recibido, `> 0` |
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

## Vistas y cálculos derivados

- **`account_balances`** (`0002`, recreada en `0007`, `security_invoker`): saldo por cuenta = `initial_balance_cents` + movimientos no borrados + **valor de mercado de sus activos** (`market_value_cents`, también como columna aparte). Las columnas de la vista salen anulables en los tipos generados.
- **`holding_values`** (`0007`, `security_invoker`): por activo, participaciones netas (compras − ventas), aportado neto (`invested_cents`), último precio y fecha, `value_cents = round(participaciones × precio × 100)` y `gain_cents = valor − aportado`, todo en `numeric` y redondeado a céntimos en SQL.
- Totales por categoría y periodo, e ingresos frente a gastos por mes: se calculan en el servidor (`app/page.tsx`, `lib/reports.ts`), no en tablas.

## Diferencias con el diseño inicial

| Diseño inicial | Implementado | Motivo |
|---|---|---|
| `categories.type`: `income`, `expense` | añade `investment` | separar la inversión del gasto en totales y gráficas |
| Movimientos inmutables y corrección con ajustes, o edición auditada (a decidir) | edición directa + borrado lógico; `updated_at` por trigger | uso personal; la auditoría se deja para SaaS |
| Signo en `amount_cents` o campo `type` aparte (a decidir) | signo en `amount_cents`, derivado de la categoría | |
| `attachments` sin `user_id` ni `file_name` | con `user_id` (para RLS) y `file_name` | RLS directa y mostrar el nombre original |
| `transactions.account_id` sin acción definida | `restrict` en `0001` → `cascade` en `0004` | poder borrar una cuenta con su historial |
