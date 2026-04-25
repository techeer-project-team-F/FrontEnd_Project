import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import axios from 'axios'
import AppHeader from '@/components/layout/AppHeader'
import StarRating from '@/components/common/StarRating'
import { getLibraryBookDetail, backendToFrontStatus, type LibraryBookDetail } from '@/api/library'
import type { ReadingStatus } from '@/types'

const statusLabel: Record<ReadingStatus, { text: string; emoji: string; bg: string }> = {
  want_to_read: { text: '읽고 싶은', emoji: '📖', bg: 'bg-primary/10' },
  reading: { text: '읽는 중', emoji: '📚', bg: 'bg-amber-100' },
  finished: { text: '다 읽음', emoji: '✅', bg: 'bg-primary/20' },
  stopped: { text: '중단', emoji: '⏸️', bg: 'bg-slate-100' },
}

function formatDate(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '-'
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}.${mm}.${dd}`
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null
  const start = new Date(iso)
  if (isNaN(start.getTime())) return null
  // 자정 기준 정규화: "오늘 14시 시작 → 내일 13시"가 같은 1일로 보이는 24h 단위 계산을 피한다.
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()
  const today = new Date()
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const days = Math.floor((todayDay - startDay) / (1000 * 60 * 60 * 24)) + 1
  return days > 0 ? days : null
}

export default function LibraryBookDetailPage() {
  const { libraryBookId } = useParams<{ libraryBookId: string }>()
  const navigate = useNavigate()

  const [detail, setDetail] = useState<LibraryBookDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    // 파생값을 effect 내부에서 다시 산출해 deps를 libraryBookId 하나로 단순화
    const isValid = /^\d+$/.test(libraryBookId ?? '')
    if (!isValid) {
      setErrorMessage('잘못된 서재 도서 ID입니다.')
      setIsLoading(false)
      return
    }
    const numericId = parseInt(libraryBookId!, 10)

    const controller = new AbortController()
    setIsLoading(true)
    setErrorMessage(null)
    ;(async () => {
      try {
        const result = await getLibraryBookDetail(numericId, controller.signal)
        if (controller.signal.aborted) return
        setDetail(result)
      } catch (error) {
        // normalizeAxiosError가 cancel은 rethrow하므로 여기서 분기 필수
        if (axios.isCancel(error) || controller.signal.aborted) return
        setErrorMessage(
          error instanceof Error ? error.message : '서재 도서 정보를 불러오지 못했습니다.'
        )
        setDetail(null)
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    })()

    return () => controller.abort()
  }, [libraryBookId])

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader title="서재 도서" showBack />
        <main aria-busy="true" className="flex flex-1 items-center justify-center">
          <p role="status" className="text-sm text-muted-foreground">
            불러오는 중...
          </p>
        </main>
      </div>
    )
  }

  if (errorMessage || !detail) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader title="서재 도서" showBack />
        <main className="flex flex-1 flex-col items-center justify-center gap-4">
          <span className="material-symbols-outlined text-6xl text-muted-foreground/30">error</span>
          <p role="alert" className="text-lg font-bold text-muted-foreground">
            {errorMessage ?? '서재 도서를 불러올 수 없습니다.'}
          </p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
          >
            돌아가기
          </button>
        </main>
      </div>
    )
  }

  // 백엔드 enum이 미지원 값이어도 페이지가 크래시하지 않도록 방어
  const frontStatus: ReadingStatus | undefined = backendToFrontStatus[detail.status]
  const status = frontStatus ? statusLabel[frontStatus] : null
  // 날짜 표시 가시성은 데이터 존재 여부만으로 결정 — frontStatus 매핑이 실패해도(unknown enum) 데이터가 있으면 보여준다.
  // (frontStatus는 라벨/액션 분기에만 사용)
  const showStarted = detail.startedAt != null
  const showFinished = detail.finishedAt != null
  const showPeriod = showStarted || showFinished
  const reading = frontStatus === 'reading'
  // "N일째 읽는 중" 라벨은 의미상 READING 상태에서만 보여야 하므로 status 분기 유지
  const readingDays = reading ? daysSince(detail.startedAt) : null

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader
        title={detail.book.title}
        showBack
        rightAction={
          <button
            type="button"
            disabled
            aria-label="더보기 (준비 중)"
            className="flex size-10 items-center justify-center rounded-full text-primary/40"
          >
            <span className="material-symbols-outlined">more_vert</span>
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto pb-12">
        {/* 책 메타 */}
        <section className="flex gap-4 px-6 pt-6">
          <div className="h-[140px] w-[100px] shrink-0 overflow-hidden rounded-lg bg-primary/5 shadow-md">
            {detail.book.coverImageUrl ? (
              <img
                src={detail.book.coverImageUrl}
                alt={`${detail.book.title} 표지`}
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-muted-foreground/30">
                  menu_book
                </span>
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
            <h1 className="text-xl font-bold leading-snug">{detail.book.title}</h1>
            <p className="text-sm text-primary">{detail.book.author}</p>
            <p className="text-xs text-muted-foreground">
              {detail.book.publisher}
              {detail.book.totalPages != null && detail.book.totalPages > 0
                ? ` · ${detail.book.totalPages}쪽`
                : ''}
            </p>
          </div>
        </section>

        {/* 독서 상태 카드 */}
        {status && (
          <section className="mt-6 px-6">
            <div className={`flex items-center justify-between rounded-2xl ${status.bg} px-5 py-4`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">
                  {status.emoji}
                </span>
                <span className="text-lg font-bold">{status.text}</span>
              </div>
              {/* TODO(L4): 백엔드 myLibraryBookId 필드 추가 후 활성화 → AddToLibrarySheet 또는 액션시트 트리거 */}
              <button
                type="button"
                disabled
                aria-label="독서 상태 변경 (준비 중)"
                className="rounded-full border border-primary/40 px-4 py-2 text-sm font-semibold text-primary/40"
              >
                상태 변경
              </button>
            </div>
          </section>
        )}

        {/* 독서 기간 */}
        {showPeriod && (
          <section className="mt-5 flex items-start justify-between px-6 text-sm">
            <div className="flex flex-col gap-1">
              {showStarted && (
                <p>
                  <span className="text-muted-foreground">시작:</span>{' '}
                  <span className="font-medium">{formatDate(detail.startedAt)}</span>
                </p>
              )}
              {showFinished && (
                <p>
                  <span className="text-muted-foreground">완료:</span>{' '}
                  <span className="font-medium">{formatDate(detail.finishedAt)}</span>
                </p>
              )}
            </div>
            {reading && readingDays != null && (
              <p className="text-xs text-muted-foreground">({readingDays}일째 읽는 중)</p>
            )}
          </section>
        )}

        {/* 구분선 */}
        <div className="mx-6 mt-8 border-t border-border/60" />

        {/* 내 감상 */}
        <section className="mt-6 px-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold">내 감상</h2>
            {detail.review && <StarRating rating={detail.review.rating} size="md" />}
          </div>

          {detail.review ? (
            <Link
              to={`/review/${detail.review.reviewId}`}
              className="block rounded-2xl bg-card p-5 shadow-sm transition-colors hover:bg-card/80"
            >
              <p className="line-clamp-3 whitespace-pre-wrap text-sm leading-relaxed">
                {detail.review.content}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{formatDate(detail.review.createdAt)}</span>
                <span className="font-semibold text-primary">전체 보기</span>
              </div>
            </Link>
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-2xl bg-card p-6 shadow-sm">
              <p className="text-sm text-muted-foreground">아직 감상이 없어요</p>
              <button
                type="button"
                onClick={() => navigate(`/review/write/${detail.book.bookId}`)}
                className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-sm transition-transform active:scale-[0.98]"
              >
                감상 쓰기
              </button>
            </div>
          )}
        </section>

        {/* 도서 상세 보기 */}
        <section className="mt-8 flex justify-center pb-6">
          <Link
            to={`/book/${detail.book.bookId}`}
            className="text-sm font-semibold text-primary underline decoration-primary/30 underline-offset-4"
          >
            도서 상세 보기 →
          </Link>
        </section>
      </main>
    </div>
  )
}
