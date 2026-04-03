import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { mockBooks, mockBookDetailReviews } from '@/mocks/data'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import StarRating from '@/components/common/StarRating'

const sortOptions = [
  { label: '최신순', value: 'latest' },
  { label: '별점 높은순', value: 'rating_desc' },
  { label: '별점 낮은순', value: 'rating_asc' },
]

export default function BookReviewsListPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeSort, setActiveSort] = useState('latest')
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<number>>(new Set())

  const book = mockBooks.find(b => b.isbn === id) ?? mockBooks[0]
  const reviews = mockBookDetailReviews

  const toggleSpoiler = (reviewId: number) => {
    setRevealedSpoilers(prev => {
      const next = new Set(prev)
      next.add(reviewId)
      return next
    })
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader title="독자 감상" showBack />

      <main className="flex-1 overflow-y-auto pb-24">
        {/* Book Context */}
        <section className="px-6 pb-4 pt-6">
          <div className="flex items-center gap-3 rounded-xl bg-primary/10 p-3 shadow-sm">
            <img
              src={book.coverImageUrl}
              alt={book.title}
              className="h-14 w-10 rounded-md object-cover shadow-sm"
            />
            <div className="flex flex-col">
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-bold">{book.title}</span>
                <span className="text-sm text-muted-foreground">{book.author}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Sort & Count */}
        <section className="mb-8 px-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">
              감상 {reviews.length}개
            </span>
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-2">
            {sortOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setActiveSort(option.value)}
                className={cn(
                  'whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition-colors',
                  activeSort === option.value
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'border border-primary/10 bg-primary/5 text-primary'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        {/* Review List */}
        <div className="flex flex-col gap-8 px-6">
          {reviews.map(review => (
            <article
              key={review.id}
              onClick={() => navigate(`/review/${review.id}`)}
              className="cursor-pointer rounded-lg border-l-4 border-primary bg-card p-6 shadow-sm transition-colors hover:bg-primary/5"
            >
              {/* Header */}
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 overflow-hidden rounded-full">
                    {review.author.profileImageUrl ? (
                      <img
                        src={review.author.profileImageUrl}
                        alt={review.author.nickname}
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-primary/10">
                        <span className="material-symbols-outlined text-primary/40">person</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{review.author.nickname}</p>
                    <p className="text-xs text-muted-foreground">{review.createdAt}</p>
                  </div>
                </div>
                <StarRating rating={review.rating ?? 0} size="sm" />
              </div>

              {/* Content */}
              {review.hasSpoiler && !revealedSpoilers.has(review.id) ? (
                <button
                  onClick={e => {
                    e.stopPropagation()
                    toggleSpoiler(review.id)
                  }}
                  className="group relative w-full cursor-pointer text-left"
                >
                  <div className="pointer-events-none select-none blur-md">
                    <p className="leading-relaxed">{review.content}</p>
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg bg-primary/5 transition-colors group-hover:bg-primary/10">
                    <span className="material-symbols-outlined mb-1 text-primary">
                      visibility_off
                    </span>
                    <p className="text-sm font-semibold text-primary">
                      스포일러 포함 — 탭하여 보기
                    </p>
                  </div>
                </button>
              ) : (
                <p className="mb-4 leading-relaxed">{review.content}</p>
              )}

              {/* Actions */}
              <div className="mt-4 flex items-center gap-6 text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-lg">favorite</span>
                  <span className="text-xs">{review.likeCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-lg">chat_bubble</span>
                  <span className="text-xs">{review.commentCount ?? 0}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
