import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/authStore'
import { performRefresh, isAuthFailureRefreshError } from '@/api/client'

/** 일시(timeout/5xx/network) 실패 시 부팅 refresh 재시도 횟수(최초 시도 제외). */
const MAX_RETRIES = 2
/** 재시도 간 지수 백오프 기준(ms). */
const RETRY_BASE_DELAY = 800

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

interface BootstrapDeps {
  performRefresh: () => Promise<string>
  isAuthFailure: (error: unknown) => boolean
  setAccessToken: (token: string) => void
  clearAuth: () => void
  delay: (ms: number) => Promise<void>
  maxRetries: number
  retryBaseDelay: number
}

/**
 * 부팅 silent refresh의 순수 로직 — React 훅 바깥에서 단위 테스트가 가능하도록 의존성을
 * 주입받는 형태로 분리했다.
 *
 * 에러를 두 부류로 나눈다:
 * - 인증 실패(400 쿠키 누락 / 401 만료): 재시도 무의미 → 즉시 clearAuth(비로그인 확정).
 * - 일시 장애(timeout/5xx/network): 백엔드 콜드스타트(~31초)일 수 있어 지수 백오프로 재시도
 *   (콜드스타트 인스턴스를 깨우는 효과). 끝까지 실패하면 clearAuth.
 */
export async function runAuthBootstrap(deps: BootstrapDeps): Promise<void> {
  for (let attempt = 0; attempt <= deps.maxRetries; attempt++) {
    try {
      const token = await deps.performRefresh()
      deps.setAccessToken(token)
      return
    } catch (error) {
      if (deps.isAuthFailure(error)) {
        deps.clearAuth()
        return
      }
      if (attempt < deps.maxRetries) {
        await deps.delay(deps.retryBaseDelay * 2 ** attempt)
        continue
      }
      deps.clearAuth()
    }
  }
}

/**
 * 앱 부팅 시 1회 silent refresh로 세션을 복구한다.
 *
 * accessToken을 메모리에만 두면 새로고침 시 휘발되므로, httpOnly refresh 쿠키로 토큰을
 * 재발급해 로그인 상태를 잇는다. 성공 시 토큰만 저장하고(user는 RootLayout 안전장치가
 * getMyProfile로 비차단 충전) 즉시 게이트를 해제한다 — 부팅 왕복을 refresh 1회로 최소화.
 *
 * 성공/실패와 무관하게 마지막에 markBootstrapped로 게이트를 해제한다.
 *
 * @remarks StrictMode 이중 마운트와 무관하게 1회만 실행되도록 ref로 가드한다. client.ts의
 * in-flight refreshPromise 큐잉도 중복 호출을 추가로 방어한다.
 */
export function useAuthBootstrap(): void {
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const { setAccessToken, clearAuth, markBootstrapped } = useAuthStore.getState()

    runAuthBootstrap({
      performRefresh,
      isAuthFailure: isAuthFailureRefreshError,
      setAccessToken,
      clearAuth,
      delay,
      maxRetries: MAX_RETRIES,
      retryBaseDelay: RETRY_BASE_DELAY,
    }).finally(() => {
      markBootstrapped()
    })
  }, [])
}
