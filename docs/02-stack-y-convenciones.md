# Stack técnico y convenciones — App Ingresos/Gastos

> Revisado contra el código el 2026-10-04. La columna «Estado» indica si la decisión está implementada o sigue siendo un plan. `package.json` es la referencia de versiones.

## Arquitectura general

```
┌──────────────────────────────────────────┐
│ Next.js 16 (App Router, React 19, TS)    │
│  - Web (navegador)                       │
│  - PWA instalable (Serwist)              │
│  - Tauri para escritorio (pendiente)     │
└────────────────────┬─────────────────────┘
                     │ Server Components / Server Actions
                     ▼
┌──────────────────────────────────────────┐
│ Supabase                                 │
│  - PostgreSQL (datos)                    │
│  - Auth (usuarios)                       │
│  - Storage (adjuntos: tickets/facturas)  │
│  - Row Level Security (aislamiento)      │
└──────────────────────────────────────────┘
```

## Frontend

| Aspecto | Plan inicial | Implementado | Estado |
|---|---|---|---|
| Framework | Next.js 14+ (App Router) | **Next.js 16** (App Router, Turbopack). `proxy.ts` sustituye a `middleware.ts` | ✅ |
| Lenguaje | TypeScript | TypeScript; clientes de Supabase tipados con `Database` | ✅ |
| Estilos | Tailwind CSS | **Tailwind 4**, con tokens propios en `app/globals.css` (modo claro/oscuro) | ✅ |
| Componentes UI | shadcn/ui | shadcn/ui (Radix) + componentes propios en `components/` | ✅ |
| Estado remoto | TanStack Query | **No se usa.** Los datos se leen en Server Components y se escriben con Server Actions + `revalidatePath` | ↩️ cambiado |
| Estado local | Zustand (si hace falta) | No ha hecho falta (`useState` / react-hook-form) | — |
| Formularios | React Hook Form + Zod | React Hook Form + Zod; el mismo esquema valida en cliente y servidor | ✅ |
| Gráficas | Recharts | Recharts 3 (paleta validada para daltonismo) | ✅ |
| Fechas | date-fns | date-fns con locale `es` (`lib/format.ts`) | ✅ |
| Iconos | — | lucide-react | ✅ |
| Exportación | — | `xlsx` (Excel) y `jspdf` + `jspdf-autotable` (PDF) | ✅ |
| Escritorio | Tauri | Sin empezar | ⏳ |
| Móvil | PWA (manifest + service worker) | Serwist (`app/sw.ts`, `app/manifest.ts`), página `/offline` y barra de navegación inferior | ✅ |

## Backend / Datos

- Supabase: PostgreSQL gestionado + Auth + Storage. ✅
- RLS activado en todas las tablas desde el primer día, con políticas `user_id = auth.uid()`. Todo usa la anon key + RLS. ✅
- Migraciones con la CLI de Supabase, versionadas en `supabase/migrations/` y aplicadas con `npx supabase db push`. **Nunca cambios manuales en el dashboard ni en el editor SQL**: desincronizan el historial de `migration list`. ✅
- Después de cada cambio de esquema: `npm run db:types`. ✅

Detalle del esquema: [03-modelo-de-datos.md](03-modelo-de-datos.md).

## Manejo de dinero — regla no negociable

- Todos los importes se guardan como enteros en céntimos (`bigint`): 10,50 € → 1050. ✅
- Las conversiones, el formateo y la regla de signo están **solo** en `lib/money.ts` (`eurosToCents`, `centsToEuros`, `formatCents`, `parseEurosInput`, `applyCategorySign`), con tests. Nada de aritmética con `float` fuera de ahí. ✅
- La moneda se guarda por movimiento (`currency`) en previsión de multi-moneda, aunque hoy todo es EUR. ✅
- El signo lo pone el servidor según el tipo de categoría; el usuario siempre introduce importes positivos. ✅

## Estructura de carpetas (real)

```
/app                      → rutas (App Router); cada sección tiene page.tsx, actions.ts y diálogos
/components               → componentes compartidos (navegación, cabeceras, importes…)
  /ui                     → primitivas (shadcn + propias: Field, NativeSelect, ConfirmDialog…)
/lib
  money.ts                → utilidades de dinero (un archivo, no carpeta)
  format.ts               → formato de fechas
  recurring.ts, reports.ts
  /supabase               → clientes (server/client) y database.types.ts generado
  /validation             → esquemas Zod
/supabase/migrations      → migraciones SQL versionadas (000N_descripcion.sql)
/docs                     → roadmap, modelo de datos y este documento
```

La carpeta `/types` del plan inicial no se ha creado: los tipos de la BD se generan en `lib/supabase/database.types.ts` y el resto se infiere de los esquemas Zod.

## Convenciones de código

- Componentes en PascalCase y hooks con prefijo `use`. ✅
- Interfaz, comentarios y mensajes de commit en español. ✅
- Commits con Conventional Commits (`feat:`, `fix:`, `chore:`…). ✅ (algunos commits antiguos no lo siguen)
- Tests con Vitest para la lógica de negocio, sobre todo lo de dinero. ✅ `npm test`; tests en `lib/*.test.ts` (dinero, signos, recurrentes, presupuestos, agregados). CI en GitHub Actions: lint + tipos + tests en cada push.
- Las convenciones detalladas de arquitectura e interfaz están en `CLAUDE.md`.

## Hosting y despliegue

- Vercel (tier gratuito) con despliegue automático desde `main`. ⏳ Sin confirmar: no hay configuración de Vercel en el repo.
- Supabase (tier gratuito) para backend y datos. ✅
- Variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) fuera del repo: `.env.local` en local y el panel de Vercel en producción. ✅

## Notas de cara al futuro SaaS

- Supabase Auth admite varios proveedores (email, Google) sin cambiar la arquitectura.
- La RLS por `user_id` en cada tabla es la base de la multi-tenancy.
- Facturación: Stripe vía Edge Functions si se monetiza. La tabla `subscriptions` está reservada en el diseño, pero sin crear.
