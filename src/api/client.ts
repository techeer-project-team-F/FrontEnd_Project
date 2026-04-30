import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/store/authStore'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

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

interface ApiResponseShape<T> {
  status: string
  code: number
  data?: T
  message?: string
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
  const { data } = await refreshClient.post<ApiResponseShape<TokenRefreshResponse>>(
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
 * 사용자가 보호된 페이지에서 인증 만료(refresh 실패 포함) 시 호출.
 *
 * Zustand 인증 상태 초기화 + persist storage 정리 후 로그인 페이지로 강제 이동.
 * window.location.href를 사용해 React Router 내부 상태도 초기화 (SPA navigate
 * 사용 시 stale state가 남을 수 있음).
 */
function logoutAndRedirect() {
  useAuthStore.getState().clearAuth()
  window.location.href = '/login'
}

/**
 * 요청 인터셉터.
 *
 * 매 요청마다 authStore의 최신 accessToken을 Authorization 헤더에 부착.
 * 토큰 갱신 직후 재시도되는 요청도 새 토큰을 자동으로 받음.
 */
apiClient.interceptors.request.use(config => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

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

function isAuthFlowUrl(url: string): boolean {
  return AUTH_FLOW_PATHS.some(p => url.includes(p))
}

/**
 * 응답 인터셉터.
 *
 * 401 응답 흐름:
 * 1. 인증 흐름(login/signup/refresh 등) 호출이거나 이미 한 번 재시도한 요청이면 그대로 reject
 * 2. 비로그인 상태면 그대로 reject (이전 동작 유지 — 보호 라우트 진입 자체를 막지 않음)
 * 3. 그 외엔 _retry 플래그 부여 후 getRefreshPromise()로 새 토큰 획득 시도
 *    - 성공: authStore에 새 토큰 반영, 원래 요청의 Authorization 헤더 갱신, 재시도
 *    - 실패: clearAuth + /login 리다이렉트
 */
apiClient.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined
    if (!originalRequest) return Promise.reject(error)

    const requestUrl: string = originalRequest.url ?? ''
    const status = error.response?.status

    if (
      status === 401 &&
      !isAuthFlowUrl(requestUrl) &&
      !originalRequest._retry &&
      useAuthStore.getState().isAuthenticated
    ) {
      originalRequest._retry = true
      try {
        const newToken = await getRefreshPromise()
        const user = useAuthStore.getState().user
        if (user) {
          useAuthStore.getState().setAuth(user, newToken)
        }
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
        }
        return apiClient(originalRequest)
      } catch (refreshError) {
        logoutAndRedirect()
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
// 단위 테스트 전용 export (프로덕션 코드에서 직접 사용 금지)
export { refreshClient, performRefresh, getRefreshPromise, isAuthFlowUrl }
