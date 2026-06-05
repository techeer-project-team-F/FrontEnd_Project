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
