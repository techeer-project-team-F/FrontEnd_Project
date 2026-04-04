import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import { mockBooks } from '@/mocks/data'

export default function WriteReviewPage() {
  const { bookId } = useParams()
  const navigate = useNavigate()
  const book = bookId ? mockBooks.find(item => item.isbn === bookId) : undefined

  const [rating, setRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [quoteText, setQuoteText] = useState('')
  const [isQuoteEditorOpen, setIsQuoteEditorOpen] = useState(false)

  if (!bookId) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader title="감상 작성" showBack />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-8 pb-24">
          <p className="text-center text-sm text-muted-foreground">
            도서를 먼저 선택하면 해당 책 기준으로 감상을 작성할 수 있어요.
          </p>
          <button
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

  if (!book) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader title="감상 작성" showBack />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-8 pb-24">
          <span className="material-symbols-outlined text-6xl text-muted-foreground/30">
            search_off
          </span>
          <p className="text-lg font-bold text-muted-foreground">도서를 찾을 수 없습니다</p>
          <button
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
                <img src={book.coverImageUrl} alt={book.title} className="size-full object-cover" />
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
          <div className="flex gap-3">
            <button
              type="button"
              className="h-14 flex-1 rounded-full border-2 border-primary bg-background text-base font-bold text-primary transition-colors hover:bg-primary/5"
            >
              임시저장
            </button>
            <button
              type="button"
              className="h-14 flex-[1.7] rounded-full bg-primary text-base font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
            >
              게시하기
            </button>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
