/**
 * 로그인 방식(EMAIL/GOOGLE) 라벨만 localStorage에 별도 영속한다.
 *
 * access token·세션은 메모리 전용(authStore)으로 옮겼지만, authProvider는 토큰도 PII도 아닌
 * 단순 enum 라벨이라 XSS가 얻을 보안 가치가 없다("전부 메모리" 취지는 토큰·세션 보호이지 이
 * 라벨이 아니다). 새로고침 후 부팅 복구(getMyProfile) 시 백엔드 `/users/me` 응답에
 * authProvider가 없어 유실되면 SettingsPage의 Google 유저 분기(비밀번호 변경 숨김)가 깨지므로,
 * 이 값만 영속해 복원한다.
 *
 * @remarks 백엔드 `/users/me` 응답에 authProvider가 추가되면 이 모듈은 제거 가능(후속).
 */
const KEY = 'auth-provider'

export type AuthProvider = 'EMAIL' | 'GOOGLE'

export function saveAuthProvider(provider: AuthProvider | undefined): void {
  try {
    if (provider) localStorage.setItem(KEY, provider)
  } catch {
    // private 모드 등 localStorage 접근 불가 환경에서는 무시
  }
}

export function loadAuthProvider(): AuthProvider | undefined {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'EMAIL' || value === 'GOOGLE' ? value : undefined
  } catch {
    return undefined
  }
}

export function clearAuthProvider(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // private 모드 등 localStorage 접근 불가 환경에서는 무시
  }
}
