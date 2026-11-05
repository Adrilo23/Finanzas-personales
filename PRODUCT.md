# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Ahora:** el autor (uso diario con sus cuentas reales), y familia y amigos a los que se la pasa. Personas en España que quieren saber en qué se les va el dinero y cuánto ahorran, sin ser expertas en finanzas.
- **Más adelante:** clientes de pago (Fase 5 del roadmap) y quien la vea como proyecto de portfolio (LinkedIn).
- Situación de uso: apuntar un gasto en el momento desde el móvil (PWA instalada) y revisar el mes o el año con calma en el ordenador.

## Product Purpose
App de finanzas personales para registrar ingresos, gastos, traspasos e inversiones a mano y ver métricas: saldo por cuenta, presupuestos, objetivos de ahorro, evolución e informes mensual y anual en PDF. Éxito: que alguien sin conocimientos financieros la use cada semana y sepa en todo momento cuánto tiene, en qué gasta y si llega a sus objetivos.

## Positioning
Confirmado por el autor (2026-11-05) como lo que la landing debe destacar:
- **Sin conectar el banco:** el usuario apunta lo que pasa; no da acceso a su banco a un tercero. Privacidad y control.
- **Simple y sin anuncios:** presupuestos, objetivos e informes claros; se instala en el móvil como una app.

## Operating Context
- Registro manual (decisión del roadmap: leer notificaciones del banco descartado; importar extractos o Open Banking quedan como opción futura, no existen hoy).
- PWA instalable (Android, iPhone vía «Añadir a pantalla de inicio», escritorio). Solo lectura sin conexión.
- Interfaz, comentarios y textos en español; importes en euros con formato español.

## Capabilities and Constraints
- Cuentas (banco, efectivo, tarjeta, inversión, otra), categorías con subcategorías, movimientos (gasto, ingreso, inversión, traspaso), recurrentes, adjuntos (tickets/facturas), presupuestos con avisos, objetivos de ahorro, cuentas de inversión con fondos (ISIN) y criptomonedas, cuentas remuneradas, evolución mensual/anual, informes mensual y anual en PDF, envío del informe por email, exportación Excel/PDF.
- Precio: **gratis**, sin mencionar planes (confirmado 2026-11-05).
- **Nombre del producto: sin decidir.** Provisionalmente «Finanzas» (pestaña, icono, emails) / «Finanzas Personales» (manifest).
- Precios de inversión de una fuente no oficial y no apta para uso comercial: no presentarlos como dato garantizado.
- Demo pública: solo lectura con datos de ejemplo, sin base de datos (decisión 2026-11-05).

## Evidence on Hand
- No hay testimonios, clientes, cifras de uso, prensa ni capturas oficiales. **No inventarlos.**
- Datos de ejemplo de la demo: ficticios y presentados como tales.

## Product Principles
1. El usuario introduce importes en positivo; el sistema pone el signo. La app explica, no exige saber contabilidad.
2. Privacidad por diseño: los datos son del usuario (RLS por usuario, sin conexión bancaria de terceros).
3. Honestidad: nada de cifras, promesas o testimonios que no existan.
4. Móvil primero para apuntar, ordenador para revisar.

## Accessibility & Inclusion
Color nunca como único indicador (los estados llevan icono y texto); paleta de gráficas validada para daltonismo; modo claro y oscuro según el sistema.
