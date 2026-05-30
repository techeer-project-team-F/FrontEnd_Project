/**
 * lazy 라우트 청크 로딩 중 표시하는 전체 화면 스피너 fallback.
 *
 * 스피너는 장식이라 aria-hidden 처리하고, 스크린리더에는 sr-only 텍스트 + live region으로
 * 로딩 상태를 알린다.
 */
export default function PageLoader() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-screen items-center justify-center">
      <div
        aria-hidden="true"
        className="size-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary"
      />
      <span className="sr-only">페이지를 불러오는 중...</span>
    </div>
  )
}
