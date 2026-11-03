import { describe, expect, it } from 'vitest'
import { detectPlatform } from './install'

const UA = {
  iphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1',
  ipadOS:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  android:
    'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36',
  windows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
}

describe('detectPlatform', () => {
  it('iPhone, con Safari o con otro navegador', () => {
    expect(detectPlatform(UA.iphone)).toBe('ios')
    expect(detectPlatform(UA.iphoneChrome)).toBe('ios')
  })

  it('iPad que se presenta como Mac: se distingue por la pantalla táctil', () => {
    expect(detectPlatform(UA.ipadOS, 5)).toBe('ios')
    expect(detectPlatform(UA.ipadOS, 0)).toBe('desktop')
  })

  it('Android y escritorio', () => {
    expect(detectPlatform(UA.android, 5)).toBe('android')
    expect(detectPlatform(UA.windows)).toBe('desktop')
  })
})
