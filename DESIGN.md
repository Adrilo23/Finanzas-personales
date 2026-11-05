---
name: Finanzas
description: La libreta de gastos de toda la vida, que suma sola. Neutros cálidos, un acento verde y los importes como protagonistas.
colors:
  paper: "oklch(0.982 0.003 85)"
  ink: "oklch(0.2 0.008 75)"
  card-white: "oklch(1 0 0)"
  ink-button: "oklch(0.22 0.009 75)"
  warm-mist: "oklch(0.958 0.004 85)"
  pencil-grey: "oklch(0.5 0.01 75)"
  hairline: "oklch(0.91 0.005 85)"
  field-edge: "oklch(0.88 0.006 85)"
  ledger-green: "oklch(0.5 0.11 160)"
  ledger-green-soft: "oklch(0.95 0.03 160)"
  focus-green: "oklch(0.55 0.11 160)"
  income-green: "oklch(0.5 0.12 158)"
  income-green-soft: "oklch(0.955 0.035 158)"
  expense-red: "oklch(0.53 0.18 26)"
  expense-red-soft: "oklch(0.96 0.025 26)"
  caution-amber: "oklch(0.6 0.13 65)"
  caution-amber-soft: "oklch(0.96 0.04 80)"
  invest-blue: "oklch(0.52 0.14 255)"
  invest-blue-soft: "oklch(0.955 0.025 255)"
  destructive-red: "oklch(0.55 0.19 27)"
  chart-income: "#13a06f"
  chart-invest: "#2a78d6"
  chart-expense: "#e34948"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 6vw, 4.5rem)"
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "\"ss01\", \"cv11\""
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.35
  amount:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    letterSpacing: "-0.01em"
    fontFeature: "\"tnum\""
rounded:
  sm: "7.2px"
  md: "9.6px"
  lg: "12px"
  xl: "16.8px"
  2xl: "21.6px"
  full: "9999px"
spacing:
  gutter-mobile: "16px"
  gutter-desktop: "24px"
  card-padding: "20px"
  section-gap: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink-button}"
    textColor: "{colors.paper}"
    rounded: "{rounded.lg}"
    padding: "0 14px"
    height: "36px"
  button-outline:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "0 14px"
    height: "36px"
  button-ghost:
    textColor: "{colors.pencil-grey}"
    rounded: "{rounded.md}"
    size: "32px"
  input:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "4px 12px"
    height: "40px"
  card:
    backgroundColor: "{colors.card-white}"
    rounded: "{rounded.xl}"
    padding: "{spacing.card-padding}"
  status-badge-warning:
    backgroundColor: "{colors.caution-amber-soft}"
    textColor: "{colors.caution-amber}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
  nav-tab-active:
    backgroundColor: "{colors.ledger-green-soft}"
    textColor: "{colors.ledger-green}"
    rounded: "{rounded.full}"
    height: "28px"
    width: "44px"
---

# Design System: Finanzas

## Overview

**Creative North Star: "La libreta de cuentas"**

Finanzas es la libreta de gastos de casa convertida en app: papel cálido, tinta oscura y números que cuadran. La interfaz se aparta para que manden los importes. Neutros cálidos (tono ~85) en lugar de grises fríos, un único acento verde para la marca y el foco, y tres colores semánticos que solo hablan de dinero: verde para lo que entra, rojo para lo que sale y azul para lo que se invierte.

La densidad es la de una herramienta que se abre a diario en el móvil: tarjetas con aire, una lista por bloque y como mucho una cifra grande por pantalla. El sistema prefiere el orden de un buen libro de cuentas (columnas alineadas, cifras tabulares, separadores finos) a la decoración. Lo único que se mueve con intención es la propia libreta de la landing, que se escribe y cuadra una sola vez.

La app sigue el modo claro u oscuro del sistema operativo, sin interruptor propio. En oscuro, el papel pasa a un marrón casi negro y los colores semánticos se aclaran, pero conservan su papel.

**Key Characteristics:**
- Papel cálido y tinta oscura; nunca gris azulado.
- Un solo acento de marca (verde libreta), escaso y funcional.
- Los importes son el contenido: cifras tabulares, signo explícito y color semántico.
- El color nunca va solo: siempre con icono y texto.
- Tarjetas con anillo fino y sombra tintada, sin bordes grises genéricos.
- Móvil primero: barra inferior de pestañas y diálogos como hojas que suben desde abajo.

## Colors

Una paleta de papel y tinta con un acento verde y tres colores que solo se usan para dinero.

### Primary
- **Verde libreta** (`ledger-green`): el acento de marca. Va en la pestaña activa de la barra inferior, en la selección de texto (versión suave) y en el anillo de foco (`focus-green`). Ocupa muy poca superficie.
- **Tinta de botón** (`ink-button`): el botón principal es tinta casi negra sobre papel, no verde. La acción principal se distingue por contraste, no por color de marca.

### Secondary
- **Verde ingreso** (`income-green`, suave `income-green-soft`): importes positivos, el estado «En margen» y las barras de presupuesto sanas.
- **Rojo gasto** (`expense-red`, suave `expense-red-soft`): importes negativos, el estado «Superado» y el margen de la libreta de la landing (al 35 %).
- **Ámbar aviso** (`caution-amber`, suave `caution-amber-soft`): solo para «Cerca del límite» (presupuesto por encima del 80 %).

### Tertiary
- **Azul inversión** (`invest-blue`, suave `invest-blue-soft`): movimientos de inversión, activos y su categoría.
- **Gráfica** (`chart-income`, `chart-invest`, `chart-expense`): colores de las barras de evolución, validados para daltonismo en ese orden y siempre contiguos.

### Neutral
- **Papel** (`paper`): fondo de toda la app.
- **Blanco tarjeta** (`card-white`): tarjetas, hojas y campos.
- **Niebla cálida** (`warm-mist`): fondos de botones fantasma al pasar el ratón, pestaña activa de escritorio y pistas de las barras.
- **Tinta** (`ink`): texto principal.
- **Lápiz** (`pencil-grey`): texto secundario, fechas, metadatos y etiquetas.
- **Línea fina** (`hairline`) y **Borde de campo** (`field-edge`): separadores de lista y bordes de inputs.

### Named Rules
**The Money-Only Color Rule.** Verde, rojo, ámbar y azul significan dinero (entra, sale, aviso, invertido). No se usan para decorar ni para destacar algo que no sea un importe o su estado.

**The Never-Alone Rule.** Ningún estado se comunica solo con color. Una etiqueta lleva icono y texto («⚠ Cerca del límite»), un importe positivo lleva «+» además del verde.

**The Chart Order Rule.** Las series de la gráfica van siempre en el orden ingresos → inversión → gastos. Es el orden validado para daltonismo; no se reordenan ni se recolorean.

## Typography

**Display Font:** Geist (con ui-sans-serif, system-ui)
**Body Font:** Geist (con ui-sans-serif, system-ui)
**Label/Mono Font:** Geist Mono solo para código; los importes usan Geist con cifras tabulares.

**Character:** Una sola familia, precisa y sin adornos, con los alternativos `ss01` y `cv11` activos en todo el cuerpo. La jerarquía sale del peso y del espaciado negativo, no de cambiar de letra.

### Hierarchy
- **Display** (600, 2,75 rem en móvil hasta 4,5 rem, interlineado 1,02, −0,04 em): solo el titular de la landing.
- **Headline** (600, 1,75 rem, −0,025 em): el título de cada página (`PageHeader`), con la primera letra en mayúscula.
- **Title** (600, 0,9375 rem): títulos de tarjeta y nombres en listas.
- **Body** (400, 0,875 rem en escritorio y 1 rem en campos móviles para que iOS no haga zoom): texto general, con `text-wrap: pretty`.
- **Label** (500, 0,8125 rem): metadatos, etiquetas de campo y pestañas. Las etiquetas de estado bajan a 0,6875 rem.
- **Amount** (600, cifras tabulares, −0,01 em): todos los importes, mediante el componente `Amount`.

### Named Rules
**The Tabular Figures Rule.** Todo importe se pinta con cifras tabulares (`.num` o `Amount`), para que las columnas cuadren como en un libro de cuentas.

**The One Big Number Rule.** Como mucho una cifra grande por pantalla o tarjeta (el balance, lo disponible). El resto de importes van a tamaño de título.

## Layout

Una columna centrada de 64 rem como máximo (`max-w-5xl`), con 16 px de margen lateral en móvil y 24 px desde `sm`, y 32 px entre bloques de página. En el inicio y en las páginas con varias tarjetas, la rejilla pasa de una columna a dos desde `md`/`lg`.

La navegación cambia de forma con el ancho. Por debajo de `lg` hay una barra inferior fija de cinco pestañas (cuatro principales y «Más»), y la página reserva 112 px abajo para que no tape contenido. Desde `lg` hay una barra superior pegada arriba con fondo translúcido y desenfoque.

En listas con acciones (por ejemplo, Recurrentes), por debajo de `sm` los botones bajan a su propia fila para que el texto y el importe usen todo el ancho. La información secundaria baja de línea en lugar de recortarse.

### Named Rules
**The Never-Truncate-Money Rule.** Un importe, una fecha de vencimiento o una etiqueta de datos de ejemplo nunca se recortan con «…». Si no cabe, se reorganiza la fila.

## Elevation & Depth

El sistema es casi plano. La profundidad la dan un anillo de 1 px y una sombra muy suave tintada de marrón, nunca un borde gris. Solo lo que flota sobre la página (diálogos, popovers, tooltips de la gráfica) usa una sombra más marcada. En modo oscuro las tarjetas pierden la sombra y se quedan con un anillo blanco al 7 %.

### Shadow Vocabulary
- **Tarjeta** (`box-shadow: 0 1px 2px oklch(0.4 0.02 75 / 0.05), 0 0 0 1px oklch(0.4 0.02 75 / 0.06)`): toda superficie `.surface` en reposo.
- **Flotante** (`box-shadow: 0 12px 32px -8px oklch(0.3 0.02 75 / 0.18), 0 0 0 1px oklch(0.4 0.02 75 / 0.08)`): diálogos, hojas, popovers y tooltips.
- **Brillo de botón** (`box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.12)`): el filo de luz del botón principal.

### Named Rules
**The Tinted-Shadow Rule.** Las sombras van tintadas del mismo tono cálido que el papel (oklch 75). Nunca sombras negras puras en modo claro.

## Shapes

Esquinas suaves y consistentes a partir de una base de 12 px: 12 px en botones y campos, 16,8 px en tarjetas, y una hoja inferior con las esquinas de arriba redondeadas (16 px) en móvil. Las insignias de categoría son cuadradas de 36 px con 10 px de radio. Las etiquetas de estado tienen 7 px y las barras de progreso son completamente redondas. La pestaña activa de la barra inferior es una píldora de 44 × 28 px.

## Components

### Buttons
Sobrios y táctiles: un leve hundimiento al pulsar (escala 0,97) y transiciones de 150 ms.
- **Shape:** esquinas suaves (12 px; 9,6 px en tamaños pequeños e iconos).
- **Primary:** tinta sobre papel, 36 px de alto (44 px en tamaño grande), con un filo de luz interior. Al pasar el ratón baja al 88 % de opacidad.
- **Hover / Focus:** anillo de foco verde de 3 px al 40 %; deshabilitado al 50 % de opacidad.
- **Outline:** fondo blanco tarjeta con borde de campo; al pasar el ratón, niebla cálida.
- **Ghost:** sin fondo, texto lápiz; se usa para las acciones de fila (editar, pausar, borrar) en tamaño icono de 32 px.
- **Destructive:** rojo al 10 % con texto rojo, nunca un rojo sólido.

### Chips (etiquetas de estado)
- **Style:** fondo suave del color semántico, texto del color fuerte, icono de 12 px y texto de 11 px a peso 500.
- **State:** «En margen» (verde, círculo con check), «Cerca del límite» (ámbar, triángulo), «Superado» (rojo, círculo con exclamación). En objetivos: «Vas a tiempo», «Vas con retraso», etc.

### Cards / Containers
- **Corner Style:** 16,8 px.
- **Background:** blanco tarjeta (en oscuro, marrón un punto más claro que el fondo).
- **Shadow Strategy:** sombra «Tarjeta» (ver Elevation & Depth).
- **Border:** ninguno; el anillo de la sombra hace de borde.
- **Internal Padding:** 20 px en móvil y 24 px desde `sm`. Las listas dentro de una tarjeta se separan con líneas finas.

### Inputs / Fields
- **Style:** 40 px de alto, fondo blanco tarjeta, borde de campo de 1 px, 12 px de radio y una sombra mínima.
- **Focus:** el borde pasa a verde de foco con un halo de 3 px al 25 %.
- **Error / Disabled:** borde y halo en rojo destructivo; deshabilitado con fondo de borde al 50 %.
- **Importes:** `AmountInput` con teclado decimal, cifras tabulares y «€» a la derecha.

### Navigation
- **Escritorio (`lg`+):** barra superior pegada con fondo papel al 80 % y desenfoque. Enlaces de 14 px a peso 500 en lápiz; el activo, en tinta sobre niebla cálida.
- **Móvil:** barra inferior fija de cinco pestañas con icono y etiqueta. La activa lleva la píldora verde libreta suave y el icono a trazo 2,25 (1,75 en reposo).

### Hoja / Diálogo
En móvil, los diálogos son hojas que suben desde abajo (300 ms, curva de cajón `cubic-bezier(0.32, 0.72, 0, 1)`) con esquinas superiores redondeadas y margen para la zona segura. Cuando sale el teclado, la hoja se coloca encima y lleva a la vista el campo enfocado. Desde `sm` son modales centrados de 28 rem con un zoom sutil.

### Importe (`Amount`)
La pieza central del sistema. Cifras tabulares, formato español («1.850,00 €»), y con `signed` un «+» explícito y color de ingreso o gasto. Es la única forma de pintar dinero.

### La libreta (landing)
Pieza propia de la landing: renglones con fecha a la izquierda, un margen vertical rojo suave de 1 px, importes alineados a la derecha y una doble raya antes de la «Suma». Los renglones se escriben una vez (`animate-ink`) y el resumen se asienta debajo (`animate-settle`) cuando la libreta entra en pantalla. Con «reducir movimiento», todo aparece estático.

## Do's and Don'ts

### Do:
- **Do** pinta todo importe con `Amount` (cifras tabulares, «+» y color semántico con `signed`).
- **Do** acompaña cada estado de color con icono y texto (`BudgetStatusBadge`, `GoalStatusBadge`).
- **Do** usa `.surface` para las tarjetas: anillo y sombra tintada, 16,8 px de radio.
- **Do** usa `ConfirmDialog` para confirmar borrados y `Dialog` para formularios (hoja en móvil, modal desde `sm`).
- **Do** etiqueta siempre los datos de ejemplo como tales, en la landing y en la demo.
- **Do** desactiva las animaciones con `prefers-reduced-motion`.
- **Do** mantén las series de la gráfica en el orden ingresos → inversión → gastos y el eje Y con marcas redondas (`niceAxis`).

### Don't:
- **Don't** uses verde, rojo, ámbar o azul para decorar; son colores de dinero.
- **Don't** uses `window.confirm` ni diálogos nativos del navegador.
- **Don't** pongas bordes grises genéricos en las tarjetas ni sombras negras puras en modo claro.
- **Don't** recortes con «…» un importe, una fecha de vencimiento o la etiqueta de datos de ejemplo.
- **Don't** añadas texturas de papel, inclinaciones ni testimonios o cifras inventadas; la libreta se dibuja con las piezas reales de la app.
- **Don't** introduzcas un segundo color de acento ni otra familia tipográfica.
