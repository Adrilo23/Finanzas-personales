<div align="center">

# 💶 Finanzas Personales

**App de finanzas personales multiplataforma (PWA) para llevar ingresos, gastos, inversiones y presupuestos en un solo sitio.**

[![CI](https://github.com/Adrilo23/Finanzas-personales/actions/workflows/ci.yml/badge.svg)](https://github.com/Adrilo23/Finanzas-personales/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E?logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/licencia-MIT-blue)

[**Ver demo en vivo →**](https://finanzas-personales-one-opal.vercel.app)

</div>

---

## ✨ Qué hace

| | |
|---|---|
| 🧾 **Movimientos** | Alta, edición y borrado lógico de ingresos y gastos, con filtros por fecha, categoría y cuenta, y adjuntos (tickets y facturas). |
| 🏦 **Cuentas y categorías** | Varias cuentas con saldo calculado en base de datos, categorías con subcategorías y categorías por defecto precargadas para cada usuario nuevo. |
| 🔁 **Recurrentes** | Nóminas, alquiler y suscripciones que se generan solas. Los vencimientos del día 29-31 no derivan a 28 tras febrero. |
| 🔀 **Traspasos** | Mover dinero entre cuentas sin que cuente como ingreso, gasto ni presupuesto. También periódicos. |
| 📈 **Inversiones** | Cuentas de inversión con fondos (por ISIN, validado con dígito de control) y criptomonedas. Valor actual, aportado y rentabilidad en € y %. |
| 🪙 **Planes de aportación** | Un traspaso recurrente que reparte el dinero entre activos y crea compras pendientes que confirmas con las participaciones reales del bróker. |
| 💰 **Cuentas remuneradas** | Interés anual opcional por cuenta, abonado cada mes sobre el saldo medio diario. |
| 🎯 **Presupuestos** | Límite mensual por categoría con avisos visuales («cerca del límite» al 80 %, «superado» por encima del 100 %). |
| 📊 **Informes** | Evolución mensual de los últimos 12 meses con gráfica accesible y apta para daltonismo. |
| 📤 **Exportación** | Descarga de movimientos a Excel (XLSX) o PDF con los mismos filtros de la lista. |
| 📱 **PWA** | Instalable en el móvil, con modo claro/oscuro, navegación inferior en móvil y lectura sin conexión de las páginas visitadas. |

## 🧱 Stack

- **Framework:** [Next.js 16](https://nextjs.org) (App Router, Turbopack, Server Actions) y React 19
- **Lenguaje:** TypeScript
- **Backend:** [Supabase](https://supabase.com): Auth, Postgres con Row Level Security y Storage
- **UI:** Tailwind CSS 4, shadcn/ui y Radix, con tokens de diseño propios
- **Formularios y validación:** react-hook-form y zod, con el mismo esquema en cliente y servidor
- **Gráficas:** Recharts
- **PWA:** Serwist
- **Exportación:** SheetJS (XLSX) y jsPDF
- **Calidad:** Vitest y GitHub Actions (lint, tipos y tests en cada push)
- **Despliegue:** Vercel

## 🧠 Decisiones de diseño

- **El dinero son enteros.** Los importes se guardan como `bigint` en céntimos y toda conversión pasa por `lib/money.ts`, para evitar errores de coma flotante.
- **El signo lo decide el servidor.** El usuario siempre escribe importes positivos; el signo sale del tipo de categoría, así no hay movimientos con el signo cambiado.
- **Seguridad en la base de datos.** Cada tabla tiene RLS con políticas `user_id = auth.uid()`: la app solo usa la anon key y nadie puede leer datos ajenos.
- **Lógica pura y testeada.** Los cálculos (presupuestos, recurrentes, intereses, informes, reparto de aportaciones) son funciones puras separadas de las consultas, con tests junto al código.
- **Consistencia atómica.** Las operaciones que tocan varias filas (traspasos, planes de aportación, edición de reglas) son funciones SQL (RPC) que se ejecutan en una sola transacción.
- **Sin cron.** Los recurrentes, intereses y precios se procesan de forma perezosa al cargar la app, con reserva del periodo para no duplicar si coinciden dos cargas.

## 🚀 Puesta en marcha

Necesitas Node.js 24 y un proyecto de Supabase (el plan gratuito sirve).

```bash
git clone https://github.com/Adrilo23/Finanzas-personales.git
cd Finanzas-personales
npm install
```

Crea un `.env.local` con las claves de tu proyecto de Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>
```

Aplica las migraciones de `supabase/migrations/` a tu proyecto (con la [CLI de Supabase](https://supabase.com/docs/guides/cli): `npx supabase link` y `npx supabase db push`) y arranca la app:

```bash
npm run dev
```

Abre <http://localhost:3000>, crea una cuenta y empieza.

### Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (compila también el service worker) |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Comprobación de tipos |
| `npm test` | Tests con Vitest (una pasada) |
| `npm run db:types` | Regenera los tipos de TypeScript desde la base de datos |

## 🗂️ Estructura

```
app/            Rutas (accounts, categories, transactions, recurring, budgets, reports…)
components/     Componentes compartidos y UI base (shadcn)
lib/            Lógica de dinero y cálculos, con sus tests (*.test.ts)
  supabase/     Clientes de servidor y de navegador, y tipos de la base de datos
  validation/   Esquemas zod
supabase/       Migraciones SQL numeradas (0001 – 0011)
docs/           Stack, modelo de datos y roadmap
```

Cada sección de `app/` sigue el mismo patrón: `page.tsx` (Server Component), `actions.ts` (Server Actions con validación zod) y un diálogo cliente para los formularios.

## 🗺️ Roadmap

El estado detallado está en [`docs/04-roadmap.md`](docs/04-roadmap.md). Resumen:

- ✅ MVP: autenticación, cuentas, categorías, movimientos, saldos y panel de inicio
- ✅ Recurrentes, adjuntos, exportación, presupuestos e informes mensuales
- ✅ Inversiones, traspasos, planes de aportación y cuentas remuneradas
- ✅ Rediseño de la interfaz (claro/oscuro, móvil primero), tests y CI
- 🚧 Ayuda para nuevos usuarios, modo demo y landing
- 🔜 Actualización diaria programada de precios, informe anual y modo offline con sincronización

## ⚠️ Aviso sobre los precios

Los precios de fondos y criptomonedas vienen de la API no oficial de Yahoo Finance, que no es apta para uso comercial. Está detrás de la interfaz `PriceProvider` (`lib/prices.ts`) para poder cambiarla por un proveedor con licencia.

## 📄 Licencia

[MIT](LICENSE) © 2026 Adrilo23
