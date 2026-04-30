import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { getBook, type BookDetail } from '@/api/book'
import { createReview } from '@/api/review'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'

export default function WriteReviewPage() {
  const { bookId } = useParams()
  const navigate = useNavigate()

  const [book, setBook] = useState<BookDetail | null>(null)
  const [rating, setRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [quoteText, setQuoteText] = useState('')
  const [isQuoteEditorOpen, setIsQuoteEditorOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const isValid = /^\d+$/.test(bookId ?? '')
    if (!isValid) {
      setErrorMessage(
        bookId ? '잘못된 도서 ID입니다.' : '도서를 먼저 선택하면 감상을 작성할 수 있어요.'
      )
      setBook(null)
      setIsLoading(false)
      return
    }

    const numericBookId = parseInt(bookId!, 10)
    const controller = new AbortController()
    setIsLoading(true)
    setErrorMessage(null)
    ;(async () => {
      try {
        const result = await getBook(numericBookId, controller.signal)
        if (controller.signal.aborted) return
        setBook(result)
      } catch (error) {
        if (axios.isCancel(error) || controller.signal.aborted) return
        setErrorMessage(error instanceof Error ? error.message : '도서를 불러오지 못했습니다.')
        setBook(null)
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    })()

    return () => controller.abort()
  }, [bookId])

  const handleSubmit = async () => {
    const isValid = /^\d+$/.test(bookId ?? '')
    const trimmedContent = reviewText.trim()
    const trimmedQuote = quoteText.trim()

    if (!isValid || !book) {
      setErrorMessage('도서 정보가 올바르지 않습니다.')
      return
    }

    if (!trimmedContent) {
      setErrorMessage('감상 내용을 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      const result = await createReview({
        bookId: parseInt(bookId!, 10),
        content: trimmedContent,
        rating,
        ...(trimmedQuote ? { quote: trimmedQuote } : {}),
        isSpoiler: false,
      })
      navigate(`/review/${result.reviewId}`, { replace: true })
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '감상을 작성하지 못했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader title="감상 작성" showBack />
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
        <AppHeader title="감상 작성" showBack />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-8 pb-24">
          <span className="material-symbols-outlined text-6xl text-muted-foreground/30">
            search_off
          </span>
          <p className="text-lg font-bold text-muted-foreground">도서를 찾을 수 없습니다</p>
          <p role="alert" className="max-w-[280px] text-center text-sm text-muted-foreground">
            {errorMessage ?? '도서 정보를 불러올 수 없습니다.'}
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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader title="감상 작성" showBack />

      <main className="flex-1 overflow-y-auto pb-24">
        {/* Book Info */}
        <section className="px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded-2xl bg-card shadow-sm">
              <div className="h-20 w-12 overflow-hidden rounded-md border border-primary/10 bg-primary/5">
                {book.coverImageUrl ? (
                  <img
                    src={book.coverImageUrl}
                    alt={book.title}
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
            </div>

            <div className="min-w-0">
              <h2 className="text-2xl font-bold leading-tight text-foreground">{book.title}</h2>
              <p className="mt-1 text-lg font-medium text-muted-foreground">{book.author}</p>
            </div>
          </div>
        </section>

        {/* Rating */}
        <section className="py-4">
          <div className="w-full bg-primary/5 px-8 py-6">
            <p className="mb-5 text-center text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Rate your reading experience
            </p>

            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(value => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className="transition-transform active:scale-90"
                  aria-label={`${value}점`}
                >
                  <span
                    className={`material-symbols-outlined text-[40px] ${
                      value <= rating ? 'fill-1 text-primary' : 'text-primary/25'
                    }`}
                    style={{ fontVariationSettings: `'FILL' ${value <= rating ? 1 : 0}` }}
                  >
                    star
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Review Text */}
        <section className="px-8 py-4">
          <textarea
            value={reviewText}
            onChange={e => setReviewText(e.target.value)}
            maxLength={500}
            placeholder="이 책에 대한 감상을 자유롭게 적어보세요...."
            className="min-h-[260px] w-full resize-none bg-transparent text-lg leading-relaxed outline-none placeholder:text-muted-foreground/40"
          />
        </section>

        {/* Quote Editor */}
        {isQuoteEditorOpen && (
          <section className="px-8 py-2">
            <div className="rounded-2xl bg-primary/5 p-5">
              <div className="border-l-4 border-primary pl-4">
                <textarea
                  value={quoteText}
                  onChange={e => setQuoteText(e.target.value)}
                  maxLength={200}
                  placeholder="기억하고 싶은 문장을 입력하세요."
                  className="min-h-[96px] w-full resize-none bg-transparent text-lg italic leading-relaxed outline-none placeholder:text-muted-foreground/50"
                />
              </div>
            </div>
          </section>
        )}

        {/* Quote Add Button */}
        <section className="px-8 py-3">
          <button
            type="button"
            onClick={() => setIsQuoteEditorOpen(true)}
            className="flex items-center gap-2 text-base font-bold text-primary transition-colors hover:text-primary/80"
          >
            <span className="material-symbols-outlined text-[20px]">format_quote</span>
            인용구 추가
          </button>
        </section>

        {/* Action Buttons */}
        <section className="px-8 pb-6 pt-2">
          {errorMessage && (
            <p role="alert" className="mb-3 text-sm font-semibold text-destructive">
              {errorMessage}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              className="h-14 flex-1 rounded-full border-2 border-primary bg-background text-base font-bold text-primary transition-colors hover:bg-primary/5"
            >
              임시저장
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="h-14 flex-[1.7] rounded-full bg-primary text-base font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? '게시 중...' : '게시하기'}
            </button>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
