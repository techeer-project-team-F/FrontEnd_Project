import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { saveAuthProvider, loadAuthProvider, clearAuthProvider } from './authProvider'

describe('authProvider 영속', () => {
  let store: Record<string, string>

  beforeEach(() => {
    store = {}
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v
      },
      removeItem: (k: string) => {
        delete store[k]
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('save → load 왕복', () => {
    saveAuthProvider('GOOGLE')
    expect(loadAuthProvider()).toBe('GOOGLE')
    saveAuthProvider('EMAIL')
    expect(loadAuthProvider()).toBe('EMAIL')
  })

  it('undefined 저장은 no-op (기존 값 유지)', () => {
    saveAuthProvider('GOOGLE')
    saveAuthProvider(undefined)
    expect(loadAuthProvider()).toBe('GOOGLE')
  })

  it('알 수 없는 값은 undefined로 무시', () => {
    store['auth-provider'] = 'KAKAO'
    expect(loadAuthProvider()).toBeUndefined()
  })

  it('값 없으면 undefined', () => {
    expect(loadAuthProvider()).toBeUndefined()
  })

  it('clear 후 undefined', () => {
    saveAuthProvider('GOOGLE')
    clearAuthProvider()
    expect(loadAuthProvider()).toBeUndefined()
  })

  it('localStorage 접근 불가(throw)여도 안전', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
      removeItem: () => {
        throw new Error('blocked')
      },
    })
    expect(() => saveAuthProvider('GOOGLE')).not.toThrow()
    expect(loadAuthProvider()).toBeUndefined()
    expect(() => clearAuthProvider()).not.toThrow()
  })
})
