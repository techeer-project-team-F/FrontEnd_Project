import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { mockBooks, mockBookDetailReviews } from '@/mocks/data'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import StarRating from '@/components/common/StarRating'
import AddToLibrarySheet from '@/components/common/AddToLibrarySheet'
import { useDragScroll } from '@/hooks/useDragScroll'

export default function BookDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const scrollRef = useDragScroll<HTMLDivElement>()
  const [sheetOpen, setSheetOpen] = useState(false)
  const book = mockBooks.find(b => b.isbn === id)

  if (!book) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader title="BookLog" showBack />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 pb-24">
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
      <AppHeader
        title="BookLog"
        showBack
        rightAction={
          <button className="flex size-10 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10">
            <span className="material-symbols-outlined">share</span>
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto pb-24">
        {/* Hero: Book Cover */}
        <div className="flex justify-center px-6 py-8">
          <div className="relative aspect-[2/3] w-2/3 overflow-hidden rounded-lg border border-primary/5 shadow-2xl">
            <img src={book.coverImageUrl} alt={book.title} className="size-full object-cover" />
          </div>
        </div>

        {/* Book Info */}
        <section className="px-6 text-center">
          <h1 className="mb-2 text-3xl font-bold leading-tight">{book.title}</h1>
          <p className="mb-1 text-lg font-medium text-primary">{book.author}</p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>{book.publisher}</span>
            {book.pageCount && (
              <>
                <span className="size-1 rounded-full bg-muted-foreground/30" />
                <span>{book.pageCount} pages</span>
              </>
            )}
          </div>
        </section>

        {/* Rating */}
        <section className="mt-8 px-6">
          <div className="flex flex-col items-center rounded-xl bg-primary/5 p-6">
            <div className="mb-2 flex items-center gap-1">
              <span className="text-3xl font-bold">{book.rating}</span>
              <span className="text-muted-foreground">/ 5.0</span>
            </div>
            <StarRating rating={book.rating ?? 0} size="md" />
            <p className="mt-2 text-xs font-medium text-muted-foreground">
              {book.reviewCount?.toLocaleString()} reviews from readers
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="mt-8 px-6">
          <button
            onClick={() => setSheetOpen(true)}
            className="w-full rounded-xl bg-primary py-4 text-lg font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-[0.98]"
          >
            내 서재에 추가
          </button>
        </section>

        {/* Reviews */}
        <section className="mt-12">
          <div className="mb-4 flex items-center justify-between px-6">
            <h3 className="text-xl font-bold">독자들의 감상</h3>
            <button className="text-sm font-semibold text-primary">전체보기</button>
          </div>
          <div ref={scrollRef} className="no-scrollbar flex gap-4 overflow-x-auto px-6 pb-4">
            {mockBookDetailReviews.map(review => (
              <div
                key={review.id}
                className="min-w-[280px] rounded-xl border border-primary/5 bg-card p-4 shadow-sm"
              >
                {/* Reviewer */}
                <div className="mb-3 flex items-center gap-3">
                  <div className="size-8 overflow-hidden rounded-full border border-primary/10">
                    {review.author.profileImageUrl && (
                      <img
                        src={review.author.profileImageUrl}
                        alt={review.author.nickname}
                        className="size-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold leading-none">{review.author.nickname}</p>
                    <div className="-mt-1 origin-left scale-75">
                      <StarRating rating={review.rating ?? 0} size="sm" />
                    </div>
                  </div>
                </div>

                {/* Review Content */}
                {review.hasSpoiler ? (
                  <div className="relative">
                    <p className="select-none text-sm text-muted-foreground blur-sm">
                      {review.content}
                    </p>
                    <div className="absolute inset-0 flex items-center justify-center bg-card/40 backdrop-blur-[2px]">
                      <div className="flex items-center gap-1 rounded-full bg-primary/90 px-3 py-1.5 text-xs font-bold text-primary-foreground">
                        <span className="material-symbols-outlined text-sm">visibility_off</span>
                        스포일러 포함 리뷰
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="line-clamp-3 text-sm text-muted-foreground">{review.content}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      <AddToLibrarySheet book={book} isOpen={sheetOpen} onClose={() => setSheetOpen(false)} />

      <BottomNav />
    </div>
  )
}
