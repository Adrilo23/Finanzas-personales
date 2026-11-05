---
version: 1
slug: "app-landing-tsx"
primary_target: "app/landing.tsx"
related_targets: ["app/demo/page.tsx"]
---

## Scope

Landing pública en `/` para visitantes sin sesión (con sesión, `/` sigue siendo el inicio de la app). Modo: **Persuade**. Acompaña a `/demo` (solo lectura, datos de ejemplo, sin base de datos).

## Audience, job, action

- Familia y amigos a los que el autor pasa el enlace; más adelante, posibles clientes y quien llegue desde el portfolio.
- Deben entender en segundos qué es y por qué fiarse: apuntas tú, sin conectar el banco, sin anuncios, gratis.
- Acción principal: **Probar la demo** (sin registrarse). Secundarias: Crear cuenta, Entrar, Cómo instalarla.
- Prueba disponible: la propia interfaz con datos de ejemplo (etiquetados). No hay testimonios ni cifras: no inventarlos.

## Direction contract

THESIS: La libreta de gastos de casa, que todo el mundo ha llevado alguna vez, convertida en la app delante del visitante: tú apuntas, ella hace las cuentas. Rechaza el «titular + subtítulo + botón y fila de tres tarjetas iguales».

OWN-WORLD: El sistema de la app sin añadidos: neutros cálidos, un único acento `brand`, `positive`/`negative`/`invest` para importes, Geist con cifras tabulares, superficies `.surface`. La libreta se dibuja con ese vocabulario: renglones con `border`, margen vertical en `negative` suave, importes alineados a la derecha.

STORY: El visitante ve una página de libreta con cuatro apuntes reales de un mes de ejemplo; esos apuntes resuelven en el resumen del mes de la app (balance, una barra de presupuesto). Entiende que apuntar basta, que no se conecta su banco y que es gratis; baja para ver qué sale de la libreta (presupuestos, objetivos, informe PDF, evolución) y prueba la demo.

FIRST VIEWPORT: Izquierda: «Tú apuntas. La app hace las cuentas.» a escala de titular grande («Ella» quedaba sin referente mientras el producto no tenga nombre), tres afirmaciones cortas (sin conectar el banco · sin anuncios · gratis) y los botones «Probar la demo» (primario) y «Crear cuenta». Derecha (debajo en móvil): la libreta, con renglones que se escriben uno tras otro y una franja inferior que cristaliza en el resumen del mes. Barra superior mínima: nombre, «Ayuda» (desde sm), «Entrar» y «Crear cuenta».

FORM: «La libreta de cuentas», posición 5 de 7 en la lista ordenada; semilla 3a28a413. Interacción firma: los apuntes se escriben en la libreta y su suma se transforma en el resumen de la app (una vez, al cargar; estático con prefers-reduced-motion).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved

- Nombre del producto sin decidir: «Finanzas» provisional.
