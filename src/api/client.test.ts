import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// authStore mock — getState()를 동적으로 제어하기 위해 stateholder 패턴 사용
const authState = {
  user: { id: 1, nickname: 'tester', email: 't@t.com' },
  accessToken: 'old-access-token',
  isAuthenticated: true,
}
const setAuthMock = vi.fn((user, accessToken) => {
  authState.user = user
  authState.accessToken = accessToken
})
const clearAuthMock = vi.fn(() => {
  authState.user = null as unknown as typeof authState.user
  authState.accessToken = null as unknown as string
  authState.isAuthenticated = false
})

vi.mock('@/store/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      ...authState,
      setAuth: setAuthMock,
      clearAuth: clearAuthMock,
    }),
  },
}))

// window.location.href는 jsdom 없이도 mock 가능하도록 stub
const originalLocation = globalThis.location
const locationStub = { href: '' }
beforeEach(() => {
  // @ts-expect-error — node 환경에서 location 재할당 허용
  globalThis.location = locationStub
  locationStub.href = ''
  authState.user = { id: 1, nickname: 'tester', email: 't@t.com' }
  authState.accessToken = 'old-access-token'
  authState.isAuthenticated = true
  setAuthMock.mockClear()
  clearAuthMock.mockClear()
})
afterEach(() => {
  // @ts-expect-error — restore
  globalThis.location = originalLocation
  vi.restoreAllMocks()
})

describe('isAuthFlowUrl', () => {
  it('인증 흐름 path는 true', async () => {
    const { isAuthFlowUrl } = await import('./client')
    expect(isAuthFlowUrl('/api/v1/auth/login')).toBe(true)
    expect(isAuthFlowUrl('/api/v1/auth/signup')).toBe(true)
    expect(isAuthFlowUrl('/api/v1/auth/logout')).toBe(true)
    expect(isAuthFlowUrl('/api/v1/auth/token/refresh')).toBe(true)
    expect(isAuthFlowUrl('/api/v1/auth/oauth2/google/login')).toBe(true)
    expect(isAuthFlowUrl('/api/v1/auth/email/verify')).toBe(true)
    expect(isAuthFlowUrl('/api/v1/auth/password/reset')).toBe(true)
  })

  it('일반 도메인 path는 false', async () => {
    const { isAuthFlowUrl } = await import('./client')
    expect(isAuthFlowUrl('/api/v1/users/me')).toBe(false)
    expect(isAuthFlowUrl('/api/v1/books/search')).toBe(false)
    expect(isAuthFlowUrl('/api/v1/feed/following')).toBe(false)
  })
})

describe('performRefresh', () => {
  it('200 응답 시 새 accessToken 반환', async () => {
    const client = await import('./client')
    const postSpy = vi.spyOn(client.refreshClient, 'post').mockResolvedValueOnce({
      data: {
        status: 'SUCCESS',
        code: 200,
        data: { accessToken: 'new-access-token', accessTokenExpiresIn: 3600 },
      },
    } as never)

    const token = await client.performRefresh()
    expect(token).toBe('new-access-token')
    expect(postSpy).toHaveBeenCalledOnce()
    expect(postSpy).toHaveBeenCalledWith('/api/v1/auth/token/refresh')
  })

  it('400 응답 시 throw (refreshToken 쿠키 누락)', async () => {
    const client = await import('./client')
    vi.spyOn(client.refreshClient, 'post').mockRejectedValueOnce({
      response: { status: 400, data: { message: 'refreshToken이 없습니다.' } },
      isAxiosError: true,
    })
    await expect(client.performRefresh()).rejects.toBeDefined()
  })

  it('401 응답 시 throw (refresh token 만료)', async () => {
    const client = await import('./client')
    vi.spyOn(client.refreshClient, 'post').mockRejectedValueOnce({
      response: { status: 401, data: { message: '만료된 refresh token입니다.' } },
      isAxiosError: true,
    })
    await expect(client.performRefresh()).rejects.toBeDefined()
  })

  it('200 응답이지만 data가 비어있으면 throw', async () => {
    const client = await import('./client')
    vi.spyOn(client.refreshClient, 'post').mockResolvedValueOnce({
      data: { status: 'SUCCESS', code: 200, message: '응답 손상' },
    } as never)
    await expect(client.performRefresh()).rejects.toThrow('응답 손상')
  })
})

describe('getRefreshPromise (race condition 큐잉)', () => {
  it('동시에 여러 번 호출해도 performRefresh는 한 번만 실행', async () => {
    const client = await import('./client')
    let resolveInner: ((token: string) => void) | undefined
    const innerPromise = new Promise<string>(resolve => {
      resolveInner = resolve
    })
    const postSpy = vi.spyOn(client.refreshClient, 'post').mockImplementationOnce(
      () =>
        innerPromise.then(token => ({
          data: {
            status: 'SUCCESS',
            code: 200,
            data: { accessToken: token, accessTokenExpiresIn: 3600 },
          },
        })) as never
    )

    // 5개 요청 동시 발생
    const p1 = client.getRefreshPromise()
    const p2 = client.getRefreshPromise()
    const p3 = client.getRefreshPromise()
    const p4 = client.getRefreshPromise()
    const p5 = client.getRefreshPromise()

    expect(postSpy).toHaveBeenCalledOnce()

    resolveInner!('queued-token')
    const results = await Promise.all([p1, p2, p3, p4, p5])
    expect(results).toEqual([
      'queued-token',
      'queued-token',
      'queued-token',
      'queued-token',
      'queued-token',
    ])
  })

  it('첫 refresh 종료 후 두 번째 호출은 새 refresh를 시작', async () => {
    const client = await import('./client')
    const postSpy = vi
      .spyOn(client.refreshClient, 'post')
      .mockResolvedValueOnce({
        data: {
          status: 'SUCCESS',
          code: 200,
          data: { accessToken: 'token-1', accessTokenExpiresIn: 3600 },
        },
      } as never)
      .mockResolvedValueOnce({
        data: {
          status: 'SUCCESS',
          code: 200,
          data: { accessToken: 'token-2', accessTokenExpiresIn: 3600 },
        },
      } as never)

    const first = await client.getRefreshPromise()
    expect(first).toBe('token-1')

    // refreshPromise가 null로 reset된 뒤 두 번째 호출은 새 refresh
    const second = await client.getRefreshPromise()
    expect(second).toBe('token-2')
    expect(postSpy).toHaveBeenCalledTimes(2)
  })

  it('refresh 실패 후에도 다음 호출은 새 refresh를 시도', async () => {
    const client = await import('./client')
    const postSpy = vi
      .spyOn(client.refreshClient, 'post')
      .mockRejectedValueOnce({
        response: { status: 401 },
        isAxiosError: true,
      })
      .mockResolvedValueOnce({
        data: {
          status: 'SUCCESS',
          code: 200,
          data: { accessToken: 'recovered-token', accessTokenExpiresIn: 3600 },
        },
      } as never)

    await expect(client.getRefreshPromise()).rejects.toBeDefined()

    // 실패 후 refreshPromise null reset 검증 — 두 번째 호출이 새 호출
    const recovered = await client.getRefreshPromise()
    expect(recovered).toBe('recovered-token')
    expect(postSpy).toHaveBeenCalledTimes(2)
  })
})
