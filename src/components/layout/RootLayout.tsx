import { Suspense, useEffect, useRef } from 'react'
import { Outlet } from 'react-router-dom'

import PageLoader from '@/components/common/PageLoader'
import { usePreventPullToRefresh } from '@/hooks/usePreventPullToRefresh'
import { useAuthBootstrap } from '@/hooks/useAuthBootstrap'
import { useAuthStore } from '@/store/authStore'
import { getMyProfile } from '@/api/member'

/**
 * 라우터 최상위 레이아웃. 라우트 전환에도 언마운트되지 않으므로 전역 1회성 사이드이펙트의
 * 마운트 지점으로 쓴다.
 *
 * 책임:
 * 1. iOS pull-to-refresh 차단 훅(`usePreventPullToRefresh`).
 * 2. 부팅 silent refresh(`useAuthBootstrap`) + `isBootstrapped` 게이트 — 토큰 복구 전 라우트
 *    렌더를 막아, accessToken을 메모리로 옮긴 뒤 새로고침 시 발생하는 인증 판정 race를 차단한다.
 * 3. user 안전장치 — 부팅 게이트는 토큰만 기다리므로(접근 C) user가 비어 있을 수 있다. 어떤
 *    진입 경로(홈 직행 등)에서도 user가 채워지도록 `isAuthenticated && !user`면 getMyProfile을
 *    비차단으로 1회 호출한다.
 */
export default function RootLayout() {
  usePreventPullToRefresh()
  useAuthBootstrap()

  const isBootstrapped = useAuthStore(state => state.isBootstrapped)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)
  const hasUser = useAuthStore(state => state.user !== null)
  const userFetchRef = useRef(false)

  useEffect(() => {
    if (!isBootstrapped || !isAuthenticated || hasUser || userFetchRef.current) return
    userFetchRef.current = true
    getMyProfile()
      .then(profile => {
        // 요청 중 로그아웃/계정전환이 일어났으면 stale 응답으로 현재 세션을 덮어쓰지 않는다.
        // isAuthenticated=false면 로그아웃됨, state.user가 이미 있으면 다른 경로(재로그인 등)가
        // 충전한 것이므로 건드리지 않는다. (토큰 비교는 부팅 중 401→refresh 토큰 교체를 같은
        // 사용자인데도 stale로 오판하므로 쓰지 않는다.)
        const state = useAuthStore.getState()
        if (!state.isAuthenticated || state.user) return
        state.setUser({
          id: profile.userId,
          nickname: profile.nickname,
          email: profile.email,
          profileImageUrl: profile.profileImageUrl ?? undefined,
          bio: profile.bio,
          emailVerified: profile.emailVerified,
          onboardingCompleted: profile.onboardingCompleted,
        })
      })
      .catch(() => {
        // 충전 실패는 치명적이지 않음 — user 객체를 쓰는 페이지(MyProfile 등)가 자체
        // getMyProfile로 채우거나, 후속 API의 401→refresh 흐름이 세션을 정리한다.
      })
  }, [isBootstrapped, isAuthenticated, hasUser])

  if (!isBootstrapped) {
    return <PageLoader />
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Outlet />
    </Suspense>
  )
}
