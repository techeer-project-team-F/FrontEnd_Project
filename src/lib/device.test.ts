import { afterEach, describe, expect, it, vi } from 'vitest'

import { isIOS, isMobile } from './device'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('isMobile', () => {
  it('Android UA → true', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-N986N) Chrome/120',
      maxTouchPoints: 5,
    })
    expect(isMobile()).toBe(true)
  })

  it('데스크탑 UA → false', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120',
      maxTouchPoints: 0,
    })
    expect(isMobile()).toBe(false)
  })

  it('iPadOS(Mac UA + 터치) → true', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605',
      maxTouchPoints: 5,
    })
    expect(isMobile()).toBe(true)
  })

  it('터치 없는 Mac → false', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605',
      maxTouchPoints: 0,
    })
    expect(isMobile()).toBe(false)
  })

  it('navigator 없으면 false', () => {
    vi.stubGlobal('navigator', undefined)
    expect(isMobile()).toBe(false)
  })
})

describe('isIOS', () => {
  it('iPhone UA → true', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/605',
      maxTouchPoints: 5,
    })
    expect(isIOS()).toBe(true)
  })

  it('iPadOS(Mac UA + 터치) → true', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605',
      maxTouchPoints: 5,
    })
    expect(isIOS()).toBe(true)
  })

  it('Android → false', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-N986N) Chrome/120',
      maxTouchPoints: 5,
    })
    expect(isIOS()).toBe(false)
  })

  it('터치 없는 데스크탑 → false', () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605',
      maxTouchPoints: 0,
    })
    expect(isIOS()).toBe(false)
  })

  it('navigator 없으면 false', () => {
    vi.stubGlobal('navigator', undefined)
    expect(isIOS()).toBe(false)
  })
})
