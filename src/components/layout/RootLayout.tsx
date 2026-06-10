import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'

import PageLoader from '@/components/common/PageLoader'
import { usePreventPullToRefresh } from '@/hooks/usePreventPullToRefresh'

/**
 * 라우터 최상위 레이아웃. 라우트 전환에도 언마운트되지 않으므로 전역 1회성 사이드이펙트의
 * 마운트 지점으로 쓴다. iOS pull-to-refresh 차단 훅을 여기서 한 번만 건다.
 */
export default function RootLayout() {
  usePreventPullToRefresh()
  return (
    <Suspense fallback={<PageLoader />}>
      <Outlet />
    </Suspense>
  )
}
