/**
 * UA·터치 지원으로 모바일 단말 여부를 판정한다(best-effort).
 *
 * iPadOS는 데스크탑 Safari처럼 Macintosh UA로 위장하므로 maxTouchPoints까지 본다.
 * 카메라 입력 분기(네이티브 카메라 앱 vs 웹캠, 바코드 스캔 시 후면 기본 vs 카메라 선택 UI)에 쓴다.
 */
export function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 0 && /Macintosh/i.test(navigator.userAgent))
  )
}

/**
 * iOS(iPhone/iPad/iPod) 단말 여부를 판정한다(best-effort).
 *
 * iPadOS는 데스크탑 Safari처럼 Macintosh UA로 위장하므로 maxTouchPoints까지 본다.
 * 안드로이드는 CSS `overscroll-behavior`로 pull-to-refresh가 이미 차단되므로 의도적으로
 * 제외한다. `usePreventPullToRefresh`에서 iOS에만 JS 가드를 거는 데 쓴다.
 */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /iPhone|iPad|iPod/i.test(ua) || (navigator.maxTouchPoints > 0 && /Macintosh/i.test(ua))
}
