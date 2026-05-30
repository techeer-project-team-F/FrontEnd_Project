/**
 * lazy 라우트 청크 로딩 중 표시하는 전체 화면 스피너 fallback.
 */
export default function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="size-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
    </div>
  )
}
