import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import StarRating from '@/components/common/StarRating'
import AddToLibrarySheet from '@/components/common/AddToLibrarySheet'
import { getBook, type BookDetail, type BackendReadingStatus } from '@/api/book'
import type { ReadingStatus } from '@/types'

const statusEmoji: Record<ReadingStatus, string> = {
  want_to_read: '📖 읽고 싶은',
  reading: '📚 읽는 중',
  finished: '✅ 다 읽음',
  stopped: '⏸️ 중단',
}

const backendToFrontStatus: Record<BackendReadingStatus, ReadingStatus> = {
  WANT_TO_READ: 'want_to_read',
  READING: 'reading',
  FINISHED: 'finished',
  STOPPED: 'stopped',
}

function toFrontStatus(s: string | null): ReadingStatus | null {
  if (s && s in backendToFrontStatus) {
    return backendToFrontStatus[s as BackendReadingStatus]
  }
  return null
}

export default function BookDetailPage() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [book, setBook] = useState<BookDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  // TODO(B3): Library API 연동 시 savedStatus를 API 호출로 대체하고 myLibraryStatus와 동기화
  const [savedStatus, setSavedStatus] = useState<ReadingStatus | null>(null)

  const parsedBookId = bookId ? Number(bookId) : NaN
  const isValidBookId = Number.isInteger(parsedBookId) && parsedBookId > 0

  useEffect(() => {
    if (!isValidBookId) {
      setIsLoading(false)
      setErrorMessage('유효하지 않은 도서 ID입니다.')
      return
    }

    const controller = new AbortController()
    setIsLoading(true)
    setErrorMessage(null)
    ;(async () => {
      try {
        const result = await getBook(parsedBookId, controller.signal)
        if (controller.signal.aborted) return
        setBook(result)
        setSavedStatus(toFrontStatus(result.myLibraryStatus))
      } catch (error) {
        if (axios.isCancel(error) || controller.signal.aborted) return
        setErrorMessage(error instanceof Error ? error.message : '도서 정보를 불러오지 못했습니다.')
        setBook(null)
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    })()

    return () => controller.abort()
  }, [parsedBookId, isValidBookId])

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader title="BookLog" showBack />
        <main aria-busy="true" className="flex flex-1 items-center justify-center pb-24">
          <p role="status" className="text-sm text-muted-foreground">
            불러오는 중...
          </p>
        </main>
        <BottomNav />
      </div>
    )
  }

  if (errorMessage || !book) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader title="BookLog" showBack />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 pb-24">
          <span className="material-symbols-outlined text-6xl text-muted-foreground/30">
            search_off
          </span>
          <p role="alert" className="text-lg font-bold text-muted-foreground">
            {errorMessage ?? '도서를 찾을 수 없습니다'}
          </p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
          >
            돌아가기
          </button>
        </main>
        <BottomNav />
      </div>
    )
  }

  const handleReviewClick = () => {
    if (book.myReviewId != null) {
      navigate(`/review/${book.myReviewId}`)
    } else {
      navigate(`/review/write/${book.bookId}`)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader
        title="BookLog"
        showBack
        rightAction={
          <button
            type="button"
            disabled
            aria-label="공유 (준비 중)"
            className="flex size-10 items-center justify-center rounded-full text-primary/40"
          >
            <span className="material-symbols-outlined">share</span>
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto pb-24">
        {/* Hero: Book Cover */}
        <div className="flex justify-center px-6 py-8">
          <div className="relative aspect-[2/3] w-2/3 overflow-hidden rounded-lg border border-primary/5 shadow-2xl">
            {book.coverImageUrl ? (
              <img src={book.coverImageUrl} alt={book.title} className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center bg-primary/5">
                <span className="material-symbols-outlined text-5xl text-muted-foreground/30">
                  menu_book
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Book Info */}
        <section className="px-6 text-center">
          <h1 className="mb-2 text-3xl font-bold leading-tight">{book.title}</h1>
          <p className="mb-1 text-lg font-medium text-primary">{book.author}</p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>{book.publisher}</span>
            {book.totalPages != null && book.totalPages > 0 && (
              <>
                <span className="size-1 rounded-full bg-muted-foreground/30" />
                <span>{book.totalPages} pages</span>
              </>
            )}
          </div>
        </section>

        {/* Rating */}
        <section className="mt-8 px-6">
          <div className="flex flex-col items-center rounded-xl bg-primary/5 p-6">
            <div className="mb-2 flex items-center gap-1">
              <span className="text-3xl font-bold">
                {book.averageRating != null ? book.averageRating.toFixed(1) : '-'}
              </span>
              <span className="text-muted-foreground">/ 5.0</span>
            </div>
            <StarRating rating={book.averageRating ?? 0} size="md" />
            <p className="mt-2 text-xs font-medium text-muted-foreground">
              {book.reviewCount != null
                ? `${book.reviewCount.toLocaleString()}개의 감상`
                : '아직 감상이 없습니다'}
            </p>
          </div>
        </section>

        {/* Description */}
        {book.description && (
          <section className="mt-8 px-6">
            <h3 className="mb-3 text-lg font-bold">책 소개</h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {book.description}
            </p>
          </section>
        )}

        {/* CTA */}
        <section className="mt-8 flex flex-col gap-3 px-6">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="w-full rounded-xl bg-primary py-4 text-lg font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-[0.98]"
          >
            {savedStatus ? `${statusEmoji[savedStatus]} ✏️` : '내 서재에 추가'}
          </button>
          <button
            type="button"
            onClick={handleReviewClick}
            className="w-full rounded-xl border border-primary/20 bg-card py-4 text-base font-semibold text-primary transition-colors hover:bg-primary/5"
          >
            {book.myReviewId != null ? '내 감상 보기' : '감상 쓰기'}
          </button>
        </section>

        {/* Reviews — 전체보기 링크 */}
        <section className="mt-12">
          <div className="mb-4 flex items-center justify-between px-6">
            <h3 className="text-xl font-bold">독자들의 감상</h3>
            <Link
              to={`/book/${book.bookId}/reviews`}
              className="text-sm font-semibold text-primary"
            >
              전체보기
            </Link>
          </div>
          {/* TODO(B3): 도서별 감상 목록 API 연동 시 미리보기 리스트 표시 */}
          <div className="px-6">
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-primary/10 py-8 text-center">
              <span className="material-symbols-outlined text-3xl text-muted-foreground/40">
                menu_book
              </span>
              <p className="text-sm text-muted-foreground">전체보기에서 모든 감상을 확인하세요</p>
            </div>
          </div>
        </section>
      </main>

      <AddToLibrarySheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSave={setSavedStatus}
        bookId={String(book.bookId)}
        defaultStatus={savedStatus ?? undefined}
      />

      <BottomNav />
    </div>
  )
}
