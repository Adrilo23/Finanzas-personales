/**
 * Eje Y «redondo» para las gráficas de importes: marcas en múltiplos de 1, 2, 2,5 o 5
 * (× 10^n) y un dominio que no exagera los negativos. Si el mínimo es un bache pequeño
 * (menos de media marca), el eje baja solo hasta él y no se dibuja una marca negativa.
 */
export function niceAxis(
  values: number[],
  targetTicks = 4
): { domain: [number, number]; ticks: number[] } {
  const finite = values.filter((v) => Number.isFinite(v))
  const max = Math.max(0, ...finite)
  const min = Math.min(0, ...finite)
  if (max === 0 && min === 0) return { domain: [0, 1], ticks: [0] }

  const raw = (max - min) / targetTicks
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw)!

  const top = Math.ceil(max / step) * step
  let bottom = 0
  if (min < 0) bottom = -min < step / 2 ? min * 1.15 : Math.floor(min / step) * step

  const ticks: number[] = []
  for (let t = Math.ceil(bottom / step) * step; t <= top + step / 1e6; t += step) {
    ticks.push(Math.round(t * 1e6) / 1e6 + 0) // + 0 evita «-0»
  }
  return { domain: [bottom, top], ticks }
}
