import { describe, expect, test } from 'vitest'
import { formatPercent } from './format'

describe('formatPercent', () => {
  // Intl separa la cifra del % con un espacio de no separación.
  const plain = (text: string) => text.replace(/\s/g, ' ')

  test('formato español, sin decimales sobrantes', () => {
    expect(plain(formatPercent(3))).toBe('3 %')
    expect(plain(formatPercent(2.25))).toBe('2,25 %')
  })
})
