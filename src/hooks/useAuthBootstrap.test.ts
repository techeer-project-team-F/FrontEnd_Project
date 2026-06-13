import { describe, expect, it, vi } from 'vitest'
import { runAuthBootstrap } from './useAuthBootstrap'

type Deps = Parameters<typeof runAuthBootstrap>[0]

function makeDeps(overrides: Partial<Deps> = {}): Deps {
  return {
    performRefresh: vi.fn().mockResolvedValue('tok'),
    isAuthFailure: () => false,
    setAccessToken: vi.fn(),
    clearAuth: vi.fn(),
    delay: vi.fn().mockResolvedValue(undefined),
    maxRetries: 2,
    retryBaseDelay: 1,
    ...overrides,
  }
}

describe('runAuthBootstrap', () => {
  it('refresh 성공 → setAccessToken 호출, clearAuth·재시도 없음', async () => {
    const deps = makeDeps({ performRefresh: vi.fn().mockResolvedValue('fresh') })
    await runAuthBootstrap(deps)
    expect(deps.performRefresh).toHaveBeenCalledOnce()
    expect(deps.setAccessToken).toHaveBeenCalledWith('fresh')
    expect(deps.clearAuth).not.toHaveBeenCalled()
    expect(deps.delay).not.toHaveBeenCalled()
  })

  it('인증 실패(400/401) → 재시도 없이 즉시 clearAuth', async () => {
    const deps = makeDeps({
      performRefresh: vi.fn().mockRejectedValue(new Error('401')),
      isAuthFailure: () => true,
    })
    await runAuthBootstrap(deps)
    expect(deps.performRefresh).toHaveBeenCalledOnce()
    expect(deps.clearAuth).toHaveBeenCalledOnce()
    expect(deps.setAccessToken).not.toHaveBeenCalled()
    expect(deps.delay).not.toHaveBeenCalled()
  })

  it('일시 장애 후 재시도 성공 → setAccessToken, clearAuth 미호출', async () => {
    const performRefresh = vi
      .fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce('recovered')
    const deps = makeDeps({ performRefresh, isAuthFailure: () => false })
    await runAuthBootstrap(deps)
    expect(performRefresh).toHaveBeenCalledTimes(2)
    expect(deps.delay).toHaveBeenCalledOnce()
    expect(deps.setAccessToken).toHaveBeenCalledWith('recovered')
    expect(deps.clearAuth).not.toHaveBeenCalled()
  })

  it('일시 장애가 끝까지 지속 → 모든 재시도 소진 후 clearAuth', async () => {
    const deps = makeDeps({
      performRefresh: vi.fn().mockRejectedValue(new Error('timeout')),
      isAuthFailure: () => false,
      maxRetries: 2,
    })
    await runAuthBootstrap(deps)
    expect(deps.performRefresh).toHaveBeenCalledTimes(3) // 최초 1 + 재시도 2
    expect(deps.delay).toHaveBeenCalledTimes(2)
    expect(deps.clearAuth).toHaveBeenCalledOnce()
    expect(deps.setAccessToken).not.toHaveBeenCalled()
  })
})
