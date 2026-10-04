# Modelo de datos — App Ingresos/Gastos

Modelo orientado a PostgreSQL (Supabase), pensado como un *ledger* (libro de movimientos) y no como un CRUD simple, para tener trazabilidad real.

> **Fuente de verdad:** las migraciones de `supabase/migrations/` y los tipos generados en `lib/supabase/database.types.ts` (`npm run db:types`). Este documento las resume. Cualquier cambio de esquema se hace con una migración nueva numerada y se refleja aquí en el mismo commit.
>
> Última revisión contra las migraciones: 2026-10-04 (hasta `0005`).

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
| type | text | `bank`, `cash`, `card`, `other` |
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

### recurring_rules (movimientos recurrentes) — `0001`
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
```

## Vistas y cálculos derivados

- **`account_balances`** (`0002`, `security_invoker`): saldo por cuenta = `initial_balance_cents` + suma de `amount_cents` de sus movimientos no borrados. Las columnas de la vista salen anulables en los tipos generados.
- Totales por categoría y periodo, e ingresos frente a gastos por mes: se calculan en el servidor (`app/page.tsx`, `lib/reports.ts`), no en tablas.

## Diferencias con el diseño inicial

| Diseño inicial | Implementado | Motivo |
|---|---|---|
| `categories.type`: `income`, `expense` | añade `investment` | separar la inversión del gasto en totales y gráficas |
| Movimientos inmutables y corrección con ajustes, o edición auditada (a decidir) | borrado lógico directo; **sin edición** por ahora | decisión pendiente (ver roadmap) |
| Signo en `amount_cents` o campo `type` aparte (a decidir) | signo en `amount_cents`, derivado de la categoría | |
| `attachments` sin `user_id` ni `file_name` | con `user_id` (para RLS) y `file_name` | RLS directa y mostrar el nombre original |
| `transactions.account_id` sin acción definida | `restrict` en `0001` → `cascade` en `0004` | poder borrar una cuenta con su historial |
