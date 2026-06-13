import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from './authStore'

const sampleUser = { id: 1, nickname: '테스터', email: 't@example.com' }

// authStore가 authProvider를 localStorage에 동기화하므로 node 환경에서도 stub으로 검증한다.
let lsStore: Record<string, string>

beforeEach(() => {
  lsStore = {}
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => lsStore[k] ?? null,
    setItem: (k: string, v: string) => {
      lsStore[k] = v
    },
    removeItem: (k: string) => {
      delete lsStore[k]
    },
  })
  useAuthStore.setState({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isBootstrapped: false,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('authStore', () => {
  it('초기 상태는 비로그인·미부팅', () => {
    const s = useAuthStore.getState()
    expect(s.user).toBeNull()
    expect(s.accessToken).toBeNull()
    expect(s.isAuthenticated).toBe(false)
    expect(s.isBootstrapped).toBe(false)
  })

  it('setAuth: user·token 저장 + isAuthenticated true', () => {
    useAuthStore.getState().setAuth(sampleUser, 'tok-1')
    const s = useAuthStore.getState()
    expect(s.user).toEqual(sampleUser)
    expect(s.accessToken).toBe('tok-1')
    expect(s.isAuthenticated).toBe(true)
  })

  it('setAccessToken: 토큰만 교체, user 불변, isAuthenticated true', () => {
    useAuthStore.setState({ user: sampleUser, accessToken: 'old', isAuthenticated: true })
    useAuthStore.getState().setAccessToken('new-tok')
    const s = useAuthStore.getState()
    expect(s.accessToken).toBe('new-tok')
    expect(s.user).toEqual(sampleUser)
    expect(s.isAuthenticated).toBe(true)
  })

  it('setAccessToken: user=null(부팅 직후)에도 토큰 저장 + isAuthenticated true', () => {
    useAuthStore.getState().setAccessToken('boot-tok')
    const s = useAuthStore.getState()
    expect(s.accessToken).toBe('boot-tok')
    expect(s.user).toBeNull()
    expect(s.isAuthenticated).toBe(true)
  })

  it('setUser: user만 주입, 토큰 불변', () => {
    useAuthStore.setState({ accessToken: 'keep-tok', isAuthenticated: true })
    useAuthStore.getState().setUser(sampleUser)
    const s = useAuthStore.getState()
    expect(s.user).toEqual(sampleUser)
    expect(s.accessToken).toBe('keep-tok')
  })

  it('clearAuth: user·token·isAuthenticated 전부 초기화', () => {
    useAuthStore.setState({ user: sampleUser, accessToken: 'tok', isAuthenticated: true })
    useAuthStore.getState().clearAuth()
    const s = useAuthStore.getState()
    expect(s.user).toBeNull()
    expect(s.accessToken).toBeNull()
    expect(s.isAuthenticated).toBe(false)
  })

  it('markBootstrapped: isBootstrapped true (다른 상태 불변)', () => {
    useAuthStore.getState().markBootstrapped()
    expect(useAuthStore.getState().isBootstrapped).toBe(true)
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('completeOnboarding: user 있으면 onboardingCompleted true', () => {
    useAuthStore.setState({
      user: { ...sampleUser, onboardingCompleted: false },
      isAuthenticated: true,
    })
    useAuthStore.getState().completeOnboarding()
    expect(useAuthStore.getState().user?.onboardingCompleted).toBe(true)
  })

  it('completeOnboarding: user 없으면 null 유지', () => {
    useAuthStore.getState().completeOnboarding()
    expect(useAuthStore.getState().user).toBeNull()
  })

  it('setAuth: authProvider를 localStorage에 영속', () => {
    useAuthStore.getState().setAuth({ ...sampleUser, authProvider: 'GOOGLE' }, 'tok')
    expect(lsStore['auth-provider']).toBe('GOOGLE')
    expect(useAuthStore.getState().user?.authProvider).toBe('GOOGLE')
  })

  it('setUser: authProvider 없는 응답도 localStorage에서 보강 (부팅 충전 회귀)', () => {
    lsStore['auth-provider'] = 'GOOGLE'
    useAuthStore.getState().setUser(sampleUser)
    expect(useAuthStore.getState().user?.authProvider).toBe('GOOGLE')
  })

  it('clearAuth: authProvider도 localStorage에서 삭제', () => {
    lsStore['auth-provider'] = 'GOOGLE'
    useAuthStore.setState({
      user: { ...sampleUser, authProvider: 'GOOGLE' },
      accessToken: 'tok',
      isAuthenticated: true,
    })
    useAuthStore.getState().clearAuth()
    expect(lsStore['auth-provider']).toBeUndefined()
  })
})
