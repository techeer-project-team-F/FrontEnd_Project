import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AxiosError } from 'axios'

// authStore mock — 모듈 레벨에서 single source of truth로 다루고, 각 테스트는
// authState 객체를 직접 변경해 다양한 인증 시나리오를 시뮬레이션한다
const authState: {
  user: { id: number; nickname: string; email: string } | null
  accessToken: string | null
  isAuthenticated: boolean
} = {
  user: { id: 1, nickname: 'tester', email: 't@t.com' },
  accessToken: 'old-access-token',
  isAuthenticated: true,
}
// 실제 authStore의 setAuth는 isAuthenticated도 함께 true로 flip하므로 mock도 동일하게.
// 향후 인터셉터가 isAuthenticated 의존 로직을 추가했을 때 회귀를 잡기 위해 미러링.
const setAuthMock = vi.fn((user: typeof authState.user, accessToken: string) => {
  authState.user = user
  authState.accessToken = accessToken
  authState.isAuthenticated = true
})
const clearAuthMock = vi.fn(() => {
  authState.user = null
  authState.accessToken = null
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

// node 환경엔 window/location이 없으므로 stub. 매 테스트마다 fresh 모듈을 import해
// 모듈 레벨 state(refreshPromise, isLoggingOut)도 함께 reset.
// client.ts는 `window.location.href`를 사용하므로 globalThis.window까지 stub해야
// 실제 할당이 locationStub.href에 반영됨.
const locationStub = { href: '' }
beforeEach(() => {
  vi.resetModules()
  // @ts-expect-error — node 환경에서 window 재할당 허용 (jsdom 미사용)
  globalThis.window = { location: locationStub }
  locationStub.href = ''
  authState.user = { id: 1, nickname: 'tester', email: 't@t.com' }
  authState.accessToken = 'old-access-token'
  authState.isAuthenticated = true
  setAuthMock.mockClear()
  clearAuthMock.mockClear()
})
afterEach(() => {
  // @ts-expect-error — node 환경에서는 원래 window가 없으므로 단순 unset
  delete globalThis.window
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

  it('쿼리스트링에 인증 path 문자열이 포함되어도 path는 일반 path면 false (M1 fix)', async () => {
    const { isAuthFlowUrl } = await import('./client')
    expect(isAuthFlowUrl('/api/v1/feed/comments?redirect=/api/v1/auth/login')).toBe(false)
    expect(isAuthFlowUrl('/api/v1/users/me?from=/api/v1/auth/signup')).toBe(false)
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

    const recovered = await client.getRefreshPromise()
    expect(recovered).toBe('recovered-token')
    expect(postSpy).toHaveBeenCalledTimes(2)
  })
})

/**
 * 응답 인터셉터 분기 테스트 (H2 fix).
 *
 * apiClient.interceptors.handlers의 두 번째 인자(error handler)를 직접 호출해
 * 실제 인터셉터 로직을 단위 검증한다. 이 방식이 axios 전체 라이프사이클을 mock
 * 하지 않아도 되어 테스트가 빠르고 결정적.
 */
describe('apiClient response interceptor — 401 분기', () => {
  // handleApiClientResponseError를 named export로 분리한 뒤로는 axios 내부 handlers
  // 배열에 의존하지 않고 직접 import하여 테스트한다 (브리틀한 내부 구조 의존 제거)
  async function getErrorHandler() {
    const client = await import('./client')
    return client.handleApiClientResponseError
  }

  function makeAxiosError(
    url: string,
    status: number | undefined,
    extraConfig: Partial<{ _retry: boolean }> = {},
    responseData: Record<string, unknown> = {}
  ): AxiosError {
    return {
      isAxiosError: true,
      config: { url, headers: {}, ...extraConfig },
      response:
        status != null
          ? { status, data: responseData, headers: {}, config: {}, statusText: '' }
          : undefined,
      message: 'mock',
      name: 'AxiosError',
      toJSON: () => ({}),
    } as unknown as AxiosError
  }

  it('401 + 일반 path + 미시도 + 로그인 상태 → refresh 1회 호출 + 새 토큰으로 setAuth', async () => {
    const client = await import('./client')
    const handler = await getErrorHandler()

    vi.spyOn(client.refreshClient, 'post').mockResolvedValueOnce({
      data: {
        status: 'SUCCESS',
        code: 200,
        data: { accessToken: 'fresh-token', accessTokenExpiresIn: 3600 },
      },
    } as never)

    const error = makeAxiosError('/api/v1/users/me', 401)
    // 재시도(apiClient(originalRequest))는 실제 axios가 노드 환경에서 네트워크 요청을 시도해
    // 실패할 수 있으므로 결과는 신경쓰지 않고 setAuth 호출 여부만 검증한다.
    // axios 1.x의 bound instance는 spy로 가로채기 어려워 retry 자체는 통합테스트로 검증.
    await handler(error).catch(() => undefined)

    expect(setAuthMock).toHaveBeenCalledOnce()
    expect(setAuthMock.mock.calls[0]?.[1]).toBe('fresh-token')
    expect(clearAuthMock).not.toHaveBeenCalled()
    expect(locationStub.href).toBe('')
  })

  it('401 + 인증 흐름 path → refresh 시도 안 함, 그대로 reject', async () => {
    const client = await import('./client')
    const handler = await getErrorHandler()
    const refreshSpy = vi.spyOn(client.refreshClient, 'post')

    const error = makeAxiosError('/api/v1/auth/login', 401)
    await expect(handler(error)).rejects.toBe(error)
    expect(refreshSpy).not.toHaveBeenCalled()
    expect(clearAuthMock).not.toHaveBeenCalled()
  })

  it('401 + _retry: true (이미 재시도된 요청) → refresh 시도 안 함, 그대로 reject', async () => {
    const client = await import('./client')
    const handler = await getErrorHandler()
    const refreshSpy = vi.spyOn(client.refreshClient, 'post')

    const error = makeAxiosError('/api/v1/users/me', 401, { _retry: true })
    await expect(handler(error)).rejects.toBe(error)
    expect(refreshSpy).not.toHaveBeenCalled()
  })

  it('401 + 비로그인 상태 → refresh 시도 안 함', async () => {
    authState.isAuthenticated = false
    authState.user = null
    authState.accessToken = null
    const client = await import('./client')
    const handler = await getErrorHandler()
    const refreshSpy = vi.spyOn(client.refreshClient, 'post')

    const error = makeAxiosError('/api/v1/users/me', 401)
    await expect(handler(error)).rejects.toBe(error)
    expect(refreshSpy).not.toHaveBeenCalled()
  })

  it('refresh가 401(만료)로 실패 → clearAuth + /login 리다이렉트', async () => {
    const client = await import('./client')
    const handler = await getErrorHandler()
    vi.spyOn(client.refreshClient, 'post').mockRejectedValueOnce(
      Object.assign(new Error('refresh 401'), {
        isAxiosError: true,
        response: { status: 401 },
      })
    )

    const error = makeAxiosError('/api/v1/users/me', 401)
    await expect(handler(error)).rejects.toBeDefined()
    expect(clearAuthMock).toHaveBeenCalledOnce()
    expect(locationStub.href).toBe('/login')
  })

  it('refresh가 400(쿠키 누락)으로 실패 → clearAuth + /login 리다이렉트', async () => {
    const client = await import('./client')
    const handler = await getErrorHandler()
    vi.spyOn(client.refreshClient, 'post').mockRejectedValueOnce(
      Object.assign(new Error('refresh 400'), {
        isAxiosError: true,
        response: { status: 400 },
      })
    )

    const error = makeAxiosError('/api/v1/users/me', 401)
    await expect(handler(error)).rejects.toBeDefined()
    expect(clearAuthMock).toHaveBeenCalledOnce()
    expect(locationStub.href).toBe('/login')
  })

  it('refresh가 네트워크 오류로 실패 → 세션 유지, logout 미호출 (CodeRabbit fix)', async () => {
    const client = await import('./client')
    const handler = await getErrorHandler()
    vi.spyOn(client.refreshClient, 'post').mockRejectedValueOnce(
      Object.assign(new Error('Network Error'), {
        isAxiosError: true,
        // response 없음 → 네트워크 오류
      })
    )

    const error = makeAxiosError('/api/v1/users/me', 401)
    await expect(handler(error)).rejects.toBeDefined()
    expect(clearAuthMock).not.toHaveBeenCalled()
    expect(locationStub.href).toBe('')
  })

  it('refresh가 5xx로 실패 → 세션 유지, logout 미호출 (CodeRabbit fix)', async () => {
    const client = await import('./client')
    const handler = await getErrorHandler()
    vi.spyOn(client.refreshClient, 'post').mockRejectedValueOnce(
      Object.assign(new Error('Server Error'), {
        isAxiosError: true,
        response: { status: 500 },
      })
    )

    const error = makeAxiosError('/api/v1/users/me', 401)
    await expect(handler(error)).rejects.toBeDefined()
    expect(clearAuthMock).not.toHaveBeenCalled()
    expect(locationStub.href).toBe('')
  })

  it('refresh 도중 logout 발생 시 setAuth 미호출, 원본 에러 reject (H1 fix)', async () => {
    const client = await import('./client')
    const handler = await getErrorHandler()

    let resolveInner: ((token: string) => void) | undefined
    const innerPromise = new Promise<string>(resolve => {
      resolveInner = resolve
    })
    vi.spyOn(client.refreshClient, 'post').mockImplementationOnce(
      () =>
        innerPromise.then(token => ({
          data: {
            status: 'SUCCESS',
            code: 200,
            data: { accessToken: token, accessTokenExpiresIn: 3600 },
          },
        })) as never
    )

    const error = makeAxiosError('/api/v1/users/me', 401)
    const handlerPromise = handler(error)

    // refresh 진행 중 사용자가 logout
    authState.isAuthenticated = false
    authState.user = null

    resolveInner!('would-be-stale-token')
    await expect(handlerPromise).rejects.toBe(error)
    expect(setAuthMock).not.toHaveBeenCalled()
  })

  it('refresh 도중 다른 계정으로 전환 시 setAuth 미호출 (H1 fix)', async () => {
    const client = await import('./client')
    const handler = await getErrorHandler()

    let resolveInner: ((token: string) => void) | undefined
    const innerPromise = new Promise<string>(resolve => {
      resolveInner = resolve
    })
    vi.spyOn(client.refreshClient, 'post').mockImplementationOnce(
      () =>
        innerPromise.then(token => ({
          data: {
            status: 'SUCCESS',
            code: 200,
            data: { accessToken: token, accessTokenExpiresIn: 3600 },
          },
        })) as never
    )

    const error = makeAxiosError('/api/v1/users/me', 401)
    const handlerPromise = handler(error)

    // refresh 진행 중 다른 계정으로 전환 (id 변경)
    authState.user = { id: 999, nickname: 'other', email: 'o@o.com' }

    resolveInner!('cross-account-token')
    await expect(handlerPromise).rejects.toBe(error)
    expect(setAuthMock).not.toHaveBeenCalled()
  })
})

describe('isMemberNotFound', () => {
  it('404 + "존재하지 않는 회원입니다." → true', async () => {
    const { isMemberNotFound } = await import('./client')
    const error = {
      isAxiosError: true,
      response: { status: 404, data: { message: '존재하지 않는 회원입니다.' } },
    }
    expect(isMemberNotFound(error)).toBe(true)
  })

  it('404 + 다른 메시지 → false', async () => {
    const { isMemberNotFound } = await import('./client')
    const error = {
      isAxiosError: true,
      response: { status: 404, data: { message: '존재하지 않는 도서입니다.' } },
    }
    expect(isMemberNotFound(error)).toBe(false)
  })

  it('404 + 메시지 없음 → false', async () => {
    const { isMemberNotFound } = await import('./client')
    const error = {
      isAxiosError: true,
      response: { status: 404, data: {} },
    }
    expect(isMemberNotFound(error)).toBe(false)
  })

  it('401 + 회원 메시지 → false (status 불일치)', async () => {
    const { isMemberNotFound } = await import('./client')
    const error = {
      isAxiosError: true,
      response: { status: 401, data: { message: '존재하지 않는 회원입니다.' } },
    }
    expect(isMemberNotFound(error)).toBe(false)
  })

  it('non-Axios 에러 → false', async () => {
    const { isMemberNotFound } = await import('./client')
    expect(isMemberNotFound(new Error('test'))).toBe(false)
    expect(isMemberNotFound(null)).toBe(false)
  })
})

describe('MEMBER_NOT_FOUND 인터셉터 — stale 세션 감지', () => {
  async function getErrorHandler() {
    const client = await import('./client')
    return client.handleApiClientResponseError
  }

  function makeAxiosError(
    url: string,
    status: number | undefined,
    extraConfig: Partial<{ _retry: boolean }> = {},
    responseData: Record<string, unknown> = {}
  ): AxiosError {
    return {
      isAxiosError: true,
      config: { url, headers: {}, ...extraConfig },
      response:
        status != null
          ? { status, data: responseData, headers: {}, config: {}, statusText: '' }
          : undefined,
      message: 'mock',
      name: 'AxiosError',
      toJSON: () => ({}),
    } as unknown as AxiosError
  }

  it('404 + MEMBER_NOT_FOUND + refresh도 MEMBER_NOT_FOUND 실패 → logout', async () => {
    const client = await import('./client')
    const handler = await getErrorHandler()
    vi.spyOn(client.refreshClient, 'post').mockRejectedValueOnce(
      Object.assign(new Error('refresh 404'), {
        isAxiosError: true,
        response: { status: 404, data: { message: '존재하지 않는 회원입니다.' } },
      })
    )

    const error = makeAxiosError(
      '/api/v1/feed/following',
      404,
      {},
      {
        message: '존재하지 않는 회원입니다.',
      }
    )
    await expect(handler(error)).rejects.toBeDefined()
    expect(clearAuthMock).toHaveBeenCalledOnce()
    expect(locationStub.href).toBe('/login')
  })

  it('404 + MEMBER_NOT_FOUND + refresh 성공 → logout 안 함 (타 유저 404)', async () => {
    const client = await import('./client')
    const handler = await getErrorHandler()
    vi.spyOn(client.refreshClient, 'post').mockResolvedValueOnce({
      data: {
        status: 'SUCCESS',
        code: 200,
        data: { accessToken: 'fresh-token', accessTokenExpiresIn: 3600 },
      },
    } as never)

    const error = makeAxiosError(
      '/api/v1/members/999/reviews',
      404,
      {},
      {
        message: '존재하지 않는 회원입니다.',
      }
    )
    // refresh 성공 후 재시도 → apiClient(originalRequest)가 실행되지만
    // 네트워크 없으므로 catch. 중요한 건 logout이 안 되는 것.
    await handler(error).catch(() => undefined)
    expect(clearAuthMock).not.toHaveBeenCalled()
    expect(locationStub.href).toBe('')
  })

  it('일반 404 (다른 메시지) → refresh 시도 안 함, 그대로 reject', async () => {
    const client = await import('./client')
    const handler = await getErrorHandler()
    const refreshSpy = vi.spyOn(client.refreshClient, 'post')

    const error = makeAxiosError(
      '/api/v1/books/999',
      404,
      {},
      {
        message: '존재하지 않는 도서입니다.',
      }
    )
    await expect(handler(error)).rejects.toBe(error)
    expect(refreshSpy).not.toHaveBeenCalled()
  })

  it('404 + MEMBER_NOT_FOUND + 비로그인 → refresh 시도 안 함', async () => {
    authState.isAuthenticated = false
    authState.user = null
    authState.accessToken = null
    const client = await import('./client')
    const handler = await getErrorHandler()
    const refreshSpy = vi.spyOn(client.refreshClient, 'post')

    const error = makeAxiosError(
      '/api/v1/feed/following',
      404,
      {},
      {
        message: '존재하지 않는 회원입니다.',
      }
    )
    await expect(handler(error)).rejects.toBe(error)
    expect(refreshSpy).not.toHaveBeenCalled()
  })
})
