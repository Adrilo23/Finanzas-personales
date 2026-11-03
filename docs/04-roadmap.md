# Roadmap — App Ingresos/Gastos

> Documento vivo. Se actualiza el estado de cada fase conforme se avanza. Sirve para que Claude sepa siempre "dónde estamos" al retomar el proyecto.
>
> **Fuente de verdad:** este archivo del repo (GitHub `Adrilo23/Finanzas-personales`). Claude Code lo actualiza al terminar cada tarea, en el mismo commit que el código.

## Estado actual: 🟢 Fases 1, 3, 3b y 3c completas, con tests y CI (la actualización programada de precios y el envío automático del informe quedan aparcados, ver notas). Gráfica anual, informe anual con PDF, informe mensual por email, objetivos vinculados a una cuenta y conversión de inversiones antiguas a traspaso hechos. **Migración `0013` escrita pero sin aplicar en remoto** (`npx supabase db push --remote` y después `npm run db:types`): hasta entonces, Objetivos y «Convertir en traspaso» fallan en producción. Siguiente: ayudas contextuales "?" o modo demo + landing (Fase 4)

Última actualización: 2026-11-03

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

## Calidad
- [x] Tests con Vitest de la lógica de dinero y cálculos (`lib/*.test.ts`) y CI en GitHub Actions (lint, tipos, tests)
- [x] Corregido al escribir los tests: `parseEurosInput` leía "1.234,56" como 1,23 €; ahora entiende el formato español con miles
- [x] Recurrentes mensuales en día 29-31: antes, al pasar por un mes corto, bajaban a 28 y se quedaban ahí. Arreglado con `anchor_day` (migración `0006`): cada vencimiento vuelve al día original. Las reglas que ya hubieran derivado antes del arreglo se quedan en el día en que estaban

## Fase 2 — PWA y multiplataforma
- [x] Configurar manifest y service worker (instalable en móvil) — Serwist (`app/sw.ts`, `app/manifest.ts`)
- [ ] Probar instalación en Android/iOS
- [ ] Empaquetar con Tauri para escritorio (Windows/Mac)
- [~] Modo offline básico — se pueden leer las páginas ya visitadas y hay una página `/offline`; **falta registrar sin conexión y sincronizar después**

## Fase 3 — Funcionalidades avanzadas
- [x] Movimientos recurrentes (nóminas, alquiler, suscripciones) — generación diferida al cargar páginas (`lib/recurring.ts`)
- [x] Adjuntar tickets/facturas (Supabase Storage) — bucket privado `attachments` (migración 0003)
- [x] Gráficas de evolución mensual/anual (Recharts) — en Evolución, selector Mensual (últimos 12 meses) | Anual (un punto por año desde el primer movimiento; el año en curso, hasta hoy). Cada año de la tabla enlaza a su informe anual. `aggregateYearly` en `lib/reports.ts`, con tests
  - De paso: las consultas de 12 meses y de todo el histórico paginan (`fetchAllRows`), porque PostgREST corta en 1000 filas por respuesta y los totales salían incompletos sin avisar
- [x] Exportación a Excel/PDF — `app/transactions/export/route.ts`
- [x] Presupuestos por categoría con alertas — migración `0005`, `/budgets` y bloque en el inicio. Límite mensual por categoría de gasto, las subcategorías suman al padre, y los avisos son visuales (80 % «cerca del límite», >100 % «superado»), sin notificaciones externas. Partió de la propuesta del Project de claude.ai, adaptada al diseño y con correcciones (fechas en hora local, validación de la categoría en el servidor)

## Fase 3b — Inversiones y transferencias (añadida 2026-10-04)
Idea surgida al usar la app: una cuenta como MyInvestor contiene fondos cuyo valor cambia solo, y una aportación no es un gasto sino dinero que cambia de sitio.

**Orden acordado:** primero cuentas de inversión con sus fondos (lo que hace falta ya para MyInvestor); después la actualización diaria programada; después las transferencias.

- [x] **Tanda 1 — Cuentas de inversión con activos** (migración `0007`)
  - Tipo de cuenta `investment`; pantalla de detalle `/accounts/[id]` con valor, aportado y rentabilidad (€ y %) por activo y en total; el valor cuenta en el saldo de la cuenta y en el total del inicio
  - Activos: fondos por ISIN (validado con dígito de control) y **criptomonedas** por código (p. ej. BTC → `BTC-EUR`, para Kraken). Nombre y código de precios resueltos automáticamente; solo activos en euros
  - Compras y ventas con participaciones introducidas a mano desde el bróker (decisión 2026-10-04); no se puede vender más de lo que se tiene
  - Precios refrescados al cargar la app si llevan más de 6 h sin consultarse (cripto: 1 h desde 2026-11-03), y al añadir un activo (últimos 3 meses). Fuente detrás de la interfaz `PriceProvider` (`lib/prices.ts`)
  - Precios guardados por usuario (`asset_prices`) para no necesitar todavía la service role key
  - Al convertir una cuenta existente (p. ej. My Investor, que tenía todo en el saldo inicial) a tipo Inversión, poner el saldo inicial a 0 antes de añadir los fondos, o se contará dos veces (el formulario lo avisa)
- [ ] **Tanda 2 — Actualización diaria programada** (Vercel Cron o Supabase pg_cron + Edge Function), con la fuente detrás de una interfaz `PriceProvider` intercambiable — **aparcada (2026-11-03)**
  - Revisado si merece la pena refrescar 4 veces al día con un programador: **no por ahora**. Los fondos publican un único valor liquidativo al día (y Yahoo lo da con 1 día hábil de retraso), así que más de una consulta diaria no aporta nada. Las criptomonedas sí cambian a todas horas, pero el refresco perezoso actual (al abrir la app, si han pasado más de 6 h) ya da hasta 4 actualizaciones al día justo cuando se miran; como se guarda un precio por día y el del día se sobrescribe, cada refresco actualiza el valor. Además, al consultar 1 mes de histórico, se rellenan solos los huecos de los días sin abrir la app
  - Un programador solo aporta valor cuando haya algo que lea los precios sin abrir la app (informe por email, avisos). Entonces: una ejecución diaria para fondos (Vercel Hobby solo permite crons diarios) y, si hace falta más frecuencia para cripto, pg_cron. Mientras tanto, hecho (2026-11-03): el refresco perezoso usa un intervalo por tipo, 1 h para cripto y 6 h para fondos (`isPriceStale` en `lib/investments.ts`, con tests)
  - Requiere `SUPABASE_SERVICE_ROLE_KEY` y una clave de cron en Vercel, solo en servidor. Es la única excepción a "todo con anon key + RLS": la tabla de precios no tiene datos personales y los usuarios solo la leen
  - Uso personal/amigos: fuente gratuita (API no oficial de Yahoo). **Antes de vender: proveedor de datos con licencia comercial**
  - Cobertura comprobada en Yahoo (2026-10-04), los tres en EUR y con valor liquidativo diario (desfase normal de 1 día hábil): Fidelity MSCI World Index P-Acc (`IE00BYX5NX33` → `0P0001CLDK.F`), Amundi IS Core MSCI Emerging Markets IE-C (`LU0996175948` → `0P00011MU2.F`) y Groupama Trésorerie IC (`FR0000989626` → `0P00000LRT.F`)
- [x] **Tanda 3 — Traspasos entre cuentas** (migración `0008`; en la interfaz se llaman "Traspaso")
  - Cuarto tipo en "Nuevo movimiento" (Gasto | Ingreso | Inversión | Traspaso) con cuenta origen y destino. Dos movimientos enlazados sin categoría: mueven saldos, no cuentan como ingreso, gasto, inversión ni presupuesto. Se editan (atómico) y se borran juntos
  - En Movimientos se ven una vez ("BBVA → My Investor"); filtrando por una cuenta se ve su pata con signo, porque para esa cuenta sí es entrada o salida
  - Traspasos recurrentes: nueva opción "Traspaso" en Recurrentes
  - Efectivo en las cuentas de inversión: las compras lo consumen y las ventas lo devuelven; las posiciones ya registradas se marcaron como "sin efectivo". El formulario de operación permite desmarcarlo para posiciones previas
- [x] **Plan de aportación periódica** (migración `0009`): un traspaso recurrente con "Repartir en activos". En cada vencimiento genera, de forma atómica, el traspaso (p. ej. BBVA → My Investor 500 €), los traspasos a otras cuentas si un activo vive en otra (My Investor → Kraken 50 €) y una **compra pendiente** por activo con participaciones estimadas. Las pendientes se ven en el activo y en un aviso en el inicio, y se confirman con las participaciones reales del bróker
- [x] **Editar reglas recurrentes y planes** (migración `0010`): botón de lápiz en cada regla. Se cambian importe, cuentas, categoría, frecuencia, próxima fecha y el reparto en activos; solo afecta a los próximos vencimientos. Los planes se guardan con la función atómica `update_recurring_transfer` (regla y reparto a la vez). Un movimiento no se convierte en traspaso ni al revés
- [x] **Cuentas remuneradas** (migración `0011`): campo opcional «Interés anual» en cualquier cuenta. Cada día 1 se abona como ingreso (categoría «Intereses») el interés del mes anterior sobre el saldo medio diario de efectivo (% ÷ 12). Si la app lleva meses sin abrirse, abona cada mes con interés compuesto. Se usa el % que pone el usuario (bruto o neto); el abono generado se puede editar si el banco paga otra cifra
- [x] Revisar la categoría `investment` ahora que existen los traspasos (2026-11-03, migración `0013`)
  - Decisión: el tipo `investment` se mantiene para dinero que sale hacia algo que no se lleva en la app. Lo registrado antes como inversión hacia una cuenta que ahora sí está en la app se convierte **uno a uno** con «Convertir en traspaso» (botón de flechas en Movimientos, solo en salidas de categoría inversión). Función atómica `convert_to_transfer`: el movimiento pasa a ser la pata de salida (conserva adjuntos) y se crea la entrada en la cuenta destino
  - Riesgo avisado en el diálogo y en la ayuda: suma efectivo a la cuenta destino; si las compras de esos fondos se registraron «sin efectivo», el efectivo sale de más. Por eso no se convierte en bloque
  - Las reglas recurrentes de inversión no se convierten (una regla no pasa de movimiento a traspaso): hay que crear una regla de traspaso nueva y borrar la antigua

## Fase 3c — Objetivos e informes (añadida 2026-10-06)
- [x] **Objetivos de ahorro** (migración `0012`, `/goals`): nombre, icono, cantidad y fecha opcional. El progreso sale de **aportaciones manuales** (y retiradas) que registra el usuario; no son movimientos, así que no tocan saldos, informes ni presupuestos. Muestra ahorrado/objetivo, lo que falta, cuánto aportar al mes para llegar a la fecha, el ritmo real (media de los últimos 90 días), la fecha estimada y un estado (cumplido · vas a tiempo · con retraso · fecha superada). Lógica pura y testeada en `lib/goals.ts`
  - Decisión: aportaciones manuales y no vinculadas a una cuenta, para no contar dos veces el dinero ni acoplarlo al saldo
  - [x] **Objetivo vinculado a una cuenta** (opcional, migración `0013`): el progreso es el saldo de la cuenta y el ritmo, el neto de sus movimientos de 90 días; sin aportaciones manuales. Si se borra la cuenta, vuelve a las aportaciones que tuviera. Pendiente: los informes mensual y anual solo listan aportaciones manuales, no el movimiento de las cuentas vinculadas
  - Resumen de objetivos en el inicio (los que van con retraso, primero)
- [x] **Informe mensual** (`/reports/monthly?month=yyyy-MM`, enlazado desde Evolución): totales y balance del mes con tasa de ahorro y comparación con el mes anterior, gasto por categoría, mayores gastos, estado de presupuestos y aportaciones a objetivos. Se descarga como **PDF** (`/reports/monthly/export`, `lib/monthly-report-pdf.ts`). Cálculo puro y testeado en `lib/monthly-report.ts`
  - Los presupuestos no guardan histórico: un mes pasado se compara con los límites actuales
  - [x] **Envío por email** (botón «Envíamelo»): resumen en el cuerpo y el PDF adjunto, siempre al correo de la sesión. Resend por su API REST (`lib/email.ts`, interfaz `EmailProvider`), con `RESEND_API_KEY` y `EMAIL_FROM`. **Falta configurarlo:** crear la cuenta de Resend y poner las variables en Vercel; para enviar a otros correos que no sean el de la cuenta de Resend hace falta verificar un dominio
  - Aparcado: envío automático cada mes. Necesita cron y service role key (leer datos sin sesión), la misma excepción que la actualización programada de precios
- [x] **Informe anual** (`/reports/annual?year=yyyy`, enlazado desde Evolución): totales, balance y tasa de ahorro frente al año anterior, mes a mes, gasto por categoría comparado con el año anterior, mayores gastos y aportaciones a objetivos; PDF en `/reports/annual/export`. El año en curso se compara con el **mismo periodo** del anterior (1 ene – hoy). Cálculo puro y testeado en `lib/annual-report.ts`

## Fase 4 — Pulido y preparación para portfolio/LinkedIn
- [x] Diseño UI cuidado (no solo funcional) — rediseño completo: sistema de tokens (modo claro/oscuro), navegación con barra inferior en móvil, formularios nuevos, estados vacíos y de carga, gráfica accesible
- [ ] Ayuda para nuevos usuarios (prioritaria: la usarán familia y amigos y el objetivo es venderla)
  - [x] Lista de primeros pasos en el inicio que se marca sola según el uso (cuenta, movimiento, presupuesto, recurrente, objetivo, instalar en el móvil); se puede ocultar (queda en el navegador) y desaparece al completarla. El paso de instalar lo marca el cliente (`useInstallState`): hecho si la app se abre como instalada o se instaló desde este navegador
  - [x] Página de ayuda `/help` (pública, para seguir la guía antes de registrarse; enlazada desde el login, el menú de usuario y «Más»): 9 preguntas frecuentes (importe en positivo, tipos de movimiento, convertir inversiones antiguas, recurrentes, subcategorías en presupuestos, corregir/borrar, inversiones y precios, objetivos, sin conexión) y guía de instalación para iPhone/iPad, Android y ordenador que se abre en la del dispositivo detectado (`lib/install.ts`), con botón «Instalar» donde el navegador lo permite (Chrome/Edge). Pendiente: probarla en un iPhone y un Android reales
  - [ ] Ayudas contextuales "?" solo en los puntos confusos: importe en positivo, gasto/inversión/transferencia, recurrentes generados al abrir la app, subcategorías que suman al padre
  - [ ] Modo demo con datos de ejemplo ("Probar sin registrarme"), junto con la landing
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

- **¿Registrar pagos leyendo las notificaciones del banco?** — Descartado. Una PWA no puede leer las notificaciones de otras apps (ni en Android ni en iOS); solo lo permite una app nativa de Android con permiso de acceso a notificaciones, y en iOS no existe. No se incluye. Alternativas realistas si se retoma: importar el extracto CSV/Excel del banco, o conectar con Open Banking (PSD2) mediante un agregador de pago.

## Cómo usar este documento con Claude
- **Claude Code:** al completar una tarea, marca su casilla aquí (con una nota breve si queda algo pendiente), actualiza "Estado actual" y la fecha, e incluye el cambio en el mismo commit que el código.
- **Claude (Project de claude.ai):** lee este archivo desde GitHub para saber dónde estamos antes de proponer nada. Solo ve lo que se ha subido con push.
