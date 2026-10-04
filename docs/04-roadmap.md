# Roadmap — App Ingresos/Gastos

> Documento vivo. Se actualiza el estado de cada fase conforme se avanza. Sirve para que Claude sepa siempre "dónde estamos" al retomar el proyecto.
>
> **Fuente de verdad:** este archivo del repo (GitHub `Adrilo23/Finanzas-personales`). Claude Code lo actualiza al terminar cada tarea, en el mismo commit que el código.

## Estado actual: 🟢 Fase 1 y Fase 3 completas en lo esencial → siguiente: transferencias entre cuentas y valoración de inversiones (Fase 3b), y tests

Última actualización: 2026-10-04

Leyenda: `[x]` hecho · `[~]` hecho en parte (ver nota) · `[ ]` pendiente

---

## Fase 0 — Diseño y arranque ✅
- [x] Definir objetivo del proyecto y alcance
- [x] Decidir stack técnico
- [x] Diseñar modelo de datos inicial
- [x] Crear repositorio en GitHub — `Adrilo23/Finanzas-personales`
- [x] Crear proyecto en Supabase (gratuito) — enlazado con la CLI (`kwouosaoaeydipzavjdr`)
- [ ] Crear proyecto en Vercel y conectar con GitHub — sin confirmar; no hay configuración de Vercel en el repo
- [x] Scaffold inicial de Next.js + Tailwind + shadcn/ui — Next 16, Tailwind 4

## Fase 1 — MVP funcional (uso personal) ✅
Objetivo: poder llevar mis propias cuentas reales, aunque sea con UI básica.
- [x] Autenticación (login/registro con Supabase Auth)
- [x] CRUD de cuentas (`accounts`) — crear, editar (nombre, tipo, saldo inicial; la moneda no) y borrar en cascada (migración 0004)
- [x] CRUD de categorías (con precarga de categorías por defecto) — crear, editar (nombre, icono, padre; el tipo no, porque fija el signo de los movimientos) y borrar; subcategorías de un nivel; precarga por trigger
- [x] Registro de movimientos (`transactions`) — alta, edición directa (se toca la fila en la lista; el signo se recalcula según la categoría) y borrado lógico (`deleted_at`)
- [x] Listado de movimientos con filtro por fecha/categoría/cuenta
- [x] Cálculo de saldo por cuenta — vista `account_balances` (migración 0002)
- [x] Dashboard básico: total ingresos, total gastos, balance del mes

## Fase 2 — PWA y multiplataforma
- [x] Configurar manifest y service worker (instalable en móvil) — Serwist (`app/sw.ts`, `app/manifest.ts`)
- [ ] Probar instalación en Android/iOS
- [ ] Empaquetar con Tauri para escritorio (Windows/Mac)
- [~] Modo offline básico — se pueden leer las páginas ya visitadas y hay una página `/offline`; **falta registrar sin conexión y sincronizar después**

## Fase 3 — Funcionalidades avanzadas
- [x] Movimientos recurrentes (nóminas, alquiler, suscripciones) — generación diferida al cargar páginas (`lib/recurring.ts`)
- [x] Adjuntar tickets/facturas (Supabase Storage) — bucket privado `attachments` (migración 0003)
- [~] Gráficas de evolución mensual/anual (Recharts) — mensual (últimos 12 meses) hecha; **falta la anual**
- [x] Exportación a Excel/PDF — `app/transactions/export/route.ts`
- [x] Presupuestos por categoría con alertas — migración `0005`, `/budgets` y bloque en el inicio. Límite mensual por categoría de gasto, las subcategorías suman al padre, y los avisos son visuales (80 % «cerca del límite», >100 % «superado»), sin notificaciones externas. Partió de la propuesta del Project de claude.ai, adaptada al diseño y con correcciones (fechas en hora local, validación de la categoría en el servidor)

## Fase 3b — Transferencias e inversiones (añadida 2026-10-04)
Idea surgida al usar la app: una aportación a un fondo no es un gasto, es dinero que pasa de una cuenta a otra; y las cuentas de inversión cambian de valor solas.
- [ ] Transferencias entre cuentas (cuenta origen → cuenta destino): no cuentan como ingreso ni gasto en los totales, pero mueven los saldos
- [ ] Cuentas de inversión con valoración periódica (p. ej. fondos MSCI World y Amundi Emergentes): registrar el valor de mercado cada cierto tiempo y ver la plusvalía/minusvalía frente a lo aportado
- [ ] Revisar el papel de la categoría `investment` cuando existan las transferencias (¿migrar las aportaciones existentes a transferencias?)

## Fase 4 — Pulido y preparación para portfolio/LinkedIn
- [x] Diseño UI cuidado (no solo funcional) — rediseño completo: sistema de tokens (modo claro/oscuro), navegación con barra inferior en móvil, formularios nuevos, estados vacíos y de carga, gráfica accesible
- [ ] Landing page del producto
- [~] Documentación técnica del proyecto — `CLAUDE.md` describe la arquitectura; **falta la documentación pública**
- [ ] Despliegue estable en dominio propio

## Fase 5 — Evolución a SaaS (opcional, futuro)
- [~] Activar soporte multiusuario real — el esquema y la RLS (`user_id = auth.uid()`) ya están preparados
- [ ] Planes de suscripción (Stripe)
- [~] Onboarding para nuevos usuarios — el inicio muestra una guía de 3 pasos a quien no tiene cuentas; categorías por defecto precargadas
- [ ] Política de privacidad / RGPD

---

## Decisiones (antes "pendientes")
- **¿Editar/borrar transacciones directamente o solo con movimientos de ajuste?** — Edición directa y borrado lógico (`deleted_at`). `updated_at` registra cuándo se modificó; si se pasa a SaaS se puede añadir auditoría de cambios.
- **¿Multi-moneda desde el MVP?** — Pospuesto. Las columnas `currency` existen, pero la UI trabaja en EUR y los totales suman sin convertir.
- **¿Categorías por defecto fijas o editables?** — Editables: se precargan por usuario y se pueden renombrar, borrar o ampliar. El tipo de una categoría no se puede cambiar una vez creada.

## Cómo usar este documento con Claude
- **Claude Code:** al completar una tarea, marca su casilla aquí (con una nota breve si queda algo pendiente), actualiza "Estado actual" y la fecha, e incluye el cambio en el mismo commit que el código.
- **Claude (Project de claude.ai):** lee este archivo desde GitHub para saber dónde estamos antes de proponer nada. Solo ve lo que se ha subido con push.
