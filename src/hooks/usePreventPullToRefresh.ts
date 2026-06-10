import { useEffect } from 'react'

import { isIOS } from '@/lib/device'

/**
 * pull-to-refresh를 차단해야 하는 제스처인지 판정한다(순수 함수, 단위 테스트 대상).
 *
 * 차단 조건: 세로 우세 제스처이면서, 문서가 최상단이고, 아래로 당기며, 그 당김을 소비할
 * 내부 스크롤 요소가 없을 때. 가로 우세(캐러셀)·위로 당김·문서가 최상단이 아닐 때·내부
 * 스크롤이 진행 중일 때는 통과시켜 기존 스크롤 동작을 보존한다.
 */
export function shouldBlockPull(args: {
  deltaX: number
  deltaY: number
  scrollY: number
  innerScrolling: boolean
}): boolean {
  const { deltaX, deltaY, scrollY, innerScrolling } = args
  // 가로 우세 제스처(overflow-x 캐러셀 등)는 건드리지 않는다.
  if (Math.abs(deltaY) <= Math.abs(deltaX)) return false
  return deltaY > 0 && scrollY <= 0 && !innerScrolling
}

/**
 * iOS 사파리의 "당겨서 새로고침(pull-to-refresh)"을 차단하는 훅. 앱 루트에서 1회 마운트한다.
 *
 * iOS 사파리는 CSS `overscroll-behavior`를 무시하므로(안드로이드는 그걸로 차단됨),
 * `touchmove`를 non-passive로 가로채 문서 최상단에서의 아래 방향 당김만 `preventDefault`한다.
 * 내부 스크롤 요소(모달/시트/리스트)가 스크롤 중(`scrollTop>0`)이면 그 제스처를 통과시키고,
 * 가로 캐러셀 제스처도 통과시켜 정상 스크롤을 깨지 않는다. 안드로이드/데스크탑에서는 no-op.
 */
export function usePreventPullToRefresh(): void {
  useEffect(() => {
    if (!isIOS()) return

    let startX = 0
    let startY = 0

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) return // 핀치 줌은 그대로 둔다
      const deltaX = e.touches[0].clientX - startX
      const deltaY = e.touches[0].clientY - startY

      // e.target에서 위로 올라가며, 아래 당김을 소비할 수 있는(이미 스크롤된) 요소를 찾는다.
      let innerScrolling = false
      let node: HTMLElement | null = e.target instanceof HTMLElement ? e.target : null
      while (node && node !== document.body) {
        if (node.scrollHeight > node.clientHeight && node.scrollTop > 0) {
          innerScrolling = true
          break
        }
        node = node.parentElement
      }

      if (shouldBlockPull({ deltaX, deltaY, scrollY: window.scrollY, innerScrolling })) {
        e.preventDefault()
      }
    }

    // preventDefault가 동작하려면 touchmove는 반드시 non-passive로 등록해야 한다.
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: false })

    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
    }
  }, [])
}
