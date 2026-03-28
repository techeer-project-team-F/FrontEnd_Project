import { useState } from 'react'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import { mockBooks } from '@/mocks/data'

export default function WriteReviewPage() {
  const book = mockBooks[3]

  const [rating, setRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [quoteText] = useState(
    '“내 속에서 솟아 나오려는 것, 바로 그것을 나는 살아보려고 했다. 왜 그것이 그토록 어려웠을까?”'
  )

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader title="감상 작성" showBack />

      <main className="flex-1 overflow-y-auto pb-24">
        {/* Book Info */}
        <section className="px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded-2xl bg-card shadow-sm">
              <div className="h-20 w-12 overflow-hidden rounded-md border border-primary/10 bg-primary/5">
                <img src={book.coverImageUrl} alt="데미안" className="size-full object-cover" />
              </div>
            </div>

            <div className="min-w-0">
              <h2 className="text-2xl font-bold leading-tight text-foreground">데미안</h2>
              <p className="mt-1 text-lg font-medium text-muted-foreground">헤르만 헤세</p>
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

        {/* Quote Card */}
        <section className="px-8 py-2">
          <div className="rounded-2xl bg-primary/5 p-5">
            <div className="border-l-4 border-primary pl-4">
              <p className="text-lg italic leading-relaxed text-muted-foreground">{quoteText}</p>
              <p className="mt-3 text-base text-muted-foreground/70">– page 12</p>
            </div>
          </div>
        </section>

        {/* Quote Add Button */}
        <section className="px-8 py-3">
          <button
            type="button"
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
