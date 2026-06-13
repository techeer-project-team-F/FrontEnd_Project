import { create } from 'zustand'
import { saveAuthProvider, loadAuthProvider, clearAuthProvider } from '@/lib/authProvider'

interface User {
  id: number
  nickname: string
  profileImageUrl?: string
  email?: string
  bio?: string | null
  emailVerified?: boolean
  onboardingCompleted?: boolean
  authProvider?: 'EMAIL' | 'GOOGLE'
}

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  /**
   * 부팅 silent refresh(`useAuthBootstrap`) 완료 여부.
   * false인 동안 RootLayout 게이트가 PageLoader를 표시해, 토큰 복구 전 라우트 렌더를 막는다.
   */
  isBootstrapped: boolean
  setAuth: (user: User, accessToken: string) => void
  setAccessToken: (accessToken: string) => void
  setUser: (user: User) => void
  clearAuth: () => void
  markBootstrapped: () => void
  completeOnboarding: () => void
}

/**
 * 과거 버전이 localStorage('auth-storage')에 평문 저장한 access token을 1회 제거한다.
 *
 * persist를 걷어내고 토큰을 메모리 전용으로 옮겼으므로, 기존 사용자 브라우저에 남아 있는
 * 평문 토큰 잔존물을 정리해 탈취 표면을 없앤다. private 모드/비브라우저 환경은 무시.
 */
try {
  localStorage.removeItem('auth-storage')
} catch {
  // private 모드 등 localStorage 접근 불가 환경에서는 무시
}

/**
 * 인증 상태 store (메모리 전용, 비영속).
 *
 * accessToken을 localStorage가 아닌 JS 메모리에만 보관해 XSS 토큰 탈취 표면을 제거한다.
 * 새로고침 시 상태가 휘발되지만, httpOnly refresh 쿠키로 앱 부팅 때 1회 silent refresh하여
 * 세션을 복구한다(`useAuthBootstrap`). 이 때문에 persist 미들웨어를 의도적으로 쓰지 않는다.
 *
 * @remarks user는 부팅 직후 비어 있을 수 있고(토큰만 복구된 상태), RootLayout 안전장치가
 * `getMyProfile`로 충전한다. 따라서 user=null이 곧 "비로그인"을 의미하지 않으며, 인증 판정은
 * `isAuthenticated`로 한다.
 */
export const useAuthStore = create<AuthState>(set => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isBootstrapped: false,
  /**
   * 로그인/회원가입/구글 콜백 등 user와 토큰을 동시에 확보한 경우.
   * authProvider는 별도 영속하고, 호출부가 넘기지 않으면 localStorage에서 보강한다.
   */
  setAuth: (user, accessToken) => {
    const authProvider = user.authProvider ?? loadAuthProvider()
    set({ user: { ...user, authProvider }, accessToken, isAuthenticated: true })
    saveAuthProvider(authProvider)
  },
  /**
   * user는 그대로 두고 access token만 교체한다(부팅 silent refresh 성공·401 자동 refresh 공용).
   * 토큰을 받았다는 것은 유효한 refresh 세션이 있다는 뜻이므로 isAuthenticated=true를 보장한다.
   */
  setAccessToken: accessToken => set({ accessToken, isAuthenticated: true }),
  /**
   * 부팅 후 비차단 getMyProfile로 받아온 user를 주입(토큰 불변).
   * getMyProfile 응답엔 authProvider가 없으므로 localStorage에서 보강해 유실을 막는다.
   */
  setUser: user => {
    const authProvider = user.authProvider ?? loadAuthProvider()
    set({ user: { ...user, authProvider } })
  },
  clearAuth: () => {
    set({ user: null, accessToken: null, isAuthenticated: false })
    clearAuthProvider()
  },
  markBootstrapped: () => set({ isBootstrapped: true }),
  completeOnboarding: () =>
    set(state => ({
      user: state.user ? { ...state.user, onboardingCompleted: true } : null,
    })),
}))
