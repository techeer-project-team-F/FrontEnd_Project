import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/authStore'
import type { ApiResponse } from './_helpers'

/**
 * API 베이스 URL.
 *
 * 프로덕션 빌드(import.meta.env.PROD)에서는 VITE_API_BASE_URL이 반드시 주입되어야 한다
 * (Vercel 프로젝트 대시보드의 Environment Variables). 미설정 시 localhost로 무음 fallback하면
 * 운영 번들이 사용자 머신의 localhost:8080을 호출해 전 API가 조용히 실패하므로, 프로덕션에서는
 * fail-fast로 즉시 원인을 드러낸다. localhost 기본값은 개발 환경(DEV) 전용이다.
 */
const envBaseURL = import.meta.env.VITE_API_BASE_URL
if (!envBaseURL && import.meta.env.PROD) {
  throw new Error(
    'VITE_API_BASE_URL이 설정되지 않았습니다. 배포 환경(Vercel)의 환경변수를 확인하세요.'
  )
}
const baseURL = envBaseURL || 'http://localhost:8080'

const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Refresh 호출 전용 별도 axios 인스턴스.
 *
 * apiClient의 응답 인터셉터에 진입하지 않게 분리해, refresh 호출이 401/400을 받아도
 * 무한 루프(refresh 실패 → 인터셉터가 또 refresh 시도)에 빠지지 않도록 한다.
 * 쿠키 자동 전송이 필요하므로 withCredentials는 동일하게 true.
 */
const refreshClient = axios.create({
  baseURL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

interface TokenRefreshResponse {
  accessToken: string
  accessTokenExpiresIn: number
}

/**
 * Refresh token 쿠키로 새 access token 발급.
 *
 * 응답 분기 (백엔드 명세):
 * - 200: 성공, 새 accessToken 반환. refresh token도 자동 회전(쿠키 set 새로 됨)
 * - 400: refreshToken 쿠키 미포함 → throw (재시도 무의미)
 * - 401: refresh token 만료/무효 → throw (재시도 무의미)
 *
 * @returns 새 access token 문자열
 * @throws 응답이 200이 아니거나 data가 비어있으면 Error
 */
async function performRefresh(): Promise<string> {
  const { data } = await refreshClient.post<ApiResponse<TokenRefreshResponse>>(
    '/api/v1/auth/token/refresh'
  )
  if (!data.data?.accessToken) {
    throw new Error(data.message ?? '토큰 갱신 응답이 올바르지 않습니다.')
  }
  return data.data.accessToken
}

/**
 * 진행 중인 refresh 호출의 in-flight Promise.
 *
 * 동시에 여러 요청이 401을 받아도 refresh API는 단 한 번만 호출되도록 큐잉한다.
 * 첫 401 → performRefresh 시작 → refreshPromise에 저장. 후속 401들은 같은 Promise를
 * await 후 새 토큰을 받아 자기 요청을 재시도. 완료(성공/실패) 후 null로 초기화하여
 * 다음 만료 사이클에서 다시 동작한다.
 */
let refreshPromise: Promise<string> | null = null

/**
 * 인터셉터에서 사용하는 refresh 게이트웨이.
 *
 * 이미 진행 중인 refresh가 있으면 그 Promise를 그대로 반환(공유). 없으면 새로 시작.
 */
function getRefreshPromise(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

/**
 * 동시 다수 401 실패 시 logoutAndRedirect가 N번 호출되는 것을 막는 가드.
 *
 * `clearAuth`는 멱등이지만 `window.location.href` 할당이 여러 번 발생하면 진행 중인
 * 다른 비동기 작업과의 race를 만들 수 있어 단발화한다.
 */
let isLoggingOut = false

/**
 * 사용자가 보호된 페이지에서 인증 만료(refresh 실패 포함) 시 호출.
 *
 * Zustand 인증 상태 초기화 + persist storage 정리 후 로그인 페이지로 강제 이동.
 * window.location.href를 사용해 React Router 내부 상태도 초기화 (SPA navigate
 * 사용 시 stale state가 남을 수 있음).
 */
function logoutAndRedirect() {
  if (isLoggingOut) return
  isLoggingOut = true
  useAuthStore.getState().clearAuth()
  window.location.href = '/login'
}

/**
 * 요청 인터셉터.
 *
 * 매 요청마다 authStore의 최신 accessToken을 Authorization 헤더에 부착.
 * 토큰 갱신 직후 재시도되는 요청도 새 토큰을 자동으로 받음.
 *
 * 인증 흐름 자체의 호출(login/signup/oauth2 등)에는 토큰을 부착하지 않는다.
 * stale 토큰이 헤더에 실리면 백엔드가 토큰 검증부터 수행해 401로 거부하는
 * 문제가 발생한다 (예: Google 로그인 URL 요청 시 만료 토큰 → 401).
 */
apiClient.interceptors.request.use(config => {
  const token = useAuthStore.getState().accessToken
  if (token && !isAuthFlowUrl(config.url ?? '')) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/**
 * 백엔드 MEMBER_NOT_FOUND 응답 메시지.
 *
 * `ErrorCode.MEMBER_NOT_FOUND(404, "M001", "존재하지 않는 회원입니다.")`이지만
 * `GlobalExceptionHandler.handleBusinessException`이 message만 응답 body에 포함하므로
 * 에러 코드("M001")가 아닌 메시지 문자열로 판별한다.
 */
const MEMBER_NOT_FOUND_MESSAGE = '존재하지 않는 회원입니다.'

/**
 * Refresh를 시도하지 않을 인증 흐름 자체의 호출 경로.
 *
 * 이 경로의 401은 사용자 자격증명 자체 문제(잘못된 비밀번호, 만료된 인증 코드 등)이거나
 * refresh 자체의 실패라서 refresh 재시도가 무의미.
 */
const AUTH_FLOW_PATHS = [
  '/api/v1/auth/login',
  '/api/v1/auth/signup',
  '/api/v1/auth/logout',
  '/api/v1/auth/oauth2',
  '/api/v1/auth/token/refresh',
  '/api/v1/auth/email',
  '/api/v1/auth/password',
]

/**
 * 인증 흐름 path 매칭. 쿼리스트링이 path에 인증 path 문자열을 포함하는 false positive를
 * 막기 위해 path 부분만 잘라 startsWith로 정확 매칭한다.
 */
function isAuthFlowUrl(url: string): boolean {
  const path = url.split('?')[0] ?? url
  return AUTH_FLOW_PATHS.some(p => path.startsWith(p))
}

/**
 * 응답이 MEMBER_NOT_FOUND(HTTP 404 + 특정 message)인지 판별.
 *
 * DB 초기화·회원 삭제 등으로 JWT의 사용자가 DB에 없을 때 백엔드의 거의 모든
 * 인증 필요 API가 이 응답을 반환한다. 401(토큰 만료)과 달리 토큰 자체는 유효하므로
 * 별도 감지가 필요하다.
 */
function isMemberNotFound(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  const data = error.response?.data as { message?: string } | undefined
  return error.response?.status === 404 && data?.message === MEMBER_NOT_FOUND_MESSAGE
}

/**
 * Refresh 실패가 인증 자체 문제인지 판단.
 *
 * 백엔드 명세상 refresh API는 400(쿠키 누락) / 401(만료)만 인증 문제.
 * 추가로 404 + MEMBER_NOT_FOUND는 JWT의 사용자 자체가 DB에 없는 경우로,
 * refresh를 반복해도 복구 불가 — logout이 유일한 해결책.
 *
 * 그 외(네트워크/timeout/5xx)는 일시적 장애일 가능성이 높아 강제 logout은 UX 회귀.
 * 따라서 이 함수가 true일 때만 logoutAndRedirect를 호출하고, 그 외엔 세션을
 * 보존한 채 원본 에러만 propagate.
 */
function isAuthFailureRefreshError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  const status = error.response?.status
  return status === 400 || status === 401 || isMemberNotFound(error)
}

/**
 * 응답 인터셉터의 에러 핸들러.
 *
 * 인터셉터 등록 안에 anonymous로 두지 않고 export하여 단위 테스트가 axios 내부
 * (interceptors.response.handlers[0].rejected) 접근 없이 직접 호출 가능하도록 한다.
 *
 * 401 / MEMBER_NOT_FOUND 응답 흐름:
 * 1. 인증 흐름(login/signup/refresh 등) 호출이거나 이미 한 번 재시도한 요청이면 그대로 reject
 * 2. 비로그인 상태면 그대로 reject (이전 동작 유지 — 보호 라우트 진입 자체를 막지 않음)
 * 3. 그 외엔 _retry 플래그 부여 후 getRefreshPromise()로 새 토큰 획득 시도
 *    - 성공 + 같은 사용자가 여전히 로그인 상태 → authStore 갱신 후 원래 요청 재시도
 *      (Authorization 헤더는 요청 인터셉터가 store의 최신 토큰을 자동 부착하므로 명시 부착 불필요)
 *    - 성공이지만 그 사이 logout/계정 전환 → 재시도하지 않고 원본 에러 reject (stale 토큰
 *      주입 방지)
 *    - refresh 실패가 400/401/MEMBER_NOT_FOUND(인증 문제)이면 clearAuth + /login 리다이렉트
 *    - refresh 실패가 그 외(네트워크/timeout/5xx)면 세션 유지하고 에러만 propagate
 *
 * MEMBER_NOT_FOUND(404 + "존재하지 않는 회원입니다.") 추가 배경:
 * DB 초기화 등으로 JWT의 사용자가 DB에 없을 때, 토큰 자체는 유효해 Spring Security를
 * 통과하지만 Service 레이어에서 Member 조회 실패 → 404. 이를 401처럼 refresh 경로로
 * 진입시키면:
 * - 현재 유저가 없는 경우: refresh도 MEMBER_NOT_FOUND → isAuthFailureRefreshError
 *   → logoutAndRedirect (올바른 동작)
 * - 타 유저 조회 404인 경우: refresh 성공(현재 유저는 존재) → 원래 요청 재시도
 *   → 다시 404 → _retry 플래그로 인해 그대로 reject → 페이지 에러 표시 (올바른 동작)
 */
async function handleApiClientResponseError(error: AxiosError) {
  const originalRequest = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined
  if (!originalRequest) return Promise.reject(error)

  const requestUrl: string = originalRequest.url ?? ''
  const status = error.response?.status

  const shouldAttemptRefresh =
    (status === 401 || isMemberNotFound(error)) &&
    !isAuthFlowUrl(requestUrl) &&
    !originalRequest._retry &&
    useAuthStore.getState().isAuthenticated

  if (shouldAttemptRefresh) {
    originalRequest._retry = true
    // refresh 직전의 user id를 스냅샷 — refresh 진행 중 logout/계정 전환 감지용
    const userBefore = useAuthStore.getState().user
    try {
      const newToken = await getRefreshPromise()
      const stateAfter = useAuthStore.getState()
      // refresh 도중 사용자가 logout했거나 다른 계정으로 전환된 경우 → 새 토큰을
      // store에 주입하지 않고 원본 에러를 그대로 reject (토큰/사용자 불일치 방지)
      if (!stateAfter.isAuthenticated || !stateAfter.user) {
        return Promise.reject(error)
      }
      if (userBefore && stateAfter.user.id !== userBefore.id) {
        return Promise.reject(error)
      }
      useAuthStore.getState().setAuth(stateAfter.user, newToken)
      return apiClient(originalRequest)
    } catch (refreshError) {
      // 인증 문제(400/401)일 때만 logout. 일시적 네트워크/timeout/5xx에선 세션 유지
      if (isAuthFailureRefreshError(refreshError)) {
        logoutAndRedirect()
      }
      return Promise.reject(refreshError)
    }
  }

  return Promise.reject(error)
}

apiClient.interceptors.response.use(response => response, handleApiClientResponseError)

export default apiClient
// 단위 테스트 전용 export (프로덕션 코드에서 직접 사용 금지)
export {
  refreshClient,
  performRefresh,
  getRefreshPromise,
  isAuthFlowUrl,
  isMemberNotFound,
  handleApiClientResponseError,
}
