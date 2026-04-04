import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import { mockBookDetailReviews, mockReviews } from '@/mocks/data'
import type { ReadingStatus } from '@/types'

const readingStatusLabel: Record<ReadingStatus, string> = {
  finished: '다 읽음',
  reading: '읽는 중',
  stopped: '중단',
  want_to_read: '읽고 싶어요',
}

const commentTemplates = [
  '문장 해석이 인상적이네요. 저도 다시 읽어보고 싶어요.',
  '공감되는 감상이에요. 다음에도 이런 리뷰 기대할게요.',
  '스포일러 경고 덕분에 안심하고 읽었습니다. 감사합니다!',
]

export default function ReviewDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [liked, setLiked] = useState(false)
  const allReviews = useMemo(() => [...mockReviews, ...mockBookDetailReviews], [])
  const reviewId = Number(id)
  const review = allReviews.find(item => item.id === reviewId)

  if (!review) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader title="감상 상세" showBack />

        <main className="flex flex-1 flex-col items-center justify-center gap-4 pb-24">
          <span className="material-symbols-outlined text-6xl text-muted-foreground/30">
            search_off
          </span>
          <p className="text-lg font-bold text-muted-foreground">감상을 찾을 수 없습니다</p>
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

  const reviewStatus = review.readingStatus ? readingStatusLabel[review.readingStatus] : '기록'
  const likeCount = review.likeCount + (liked ? 1 : 0)
  const comments = Array.from({ length: Math.min(review.commentCount ?? 0, 3) }, (_, index) => ({
    id: index + 1,
    author: `독자 ${index + 1}`,
    time: `${index + 1}시간 전`,
    content: commentTemplates[index % commentTemplates.length],
  }))
  const tags = [review.book.author, review.book.publisher, reviewStatus]
  const quote = review.book.description ?? review.content
  const quoteSource = review.book.description ? '도서 소개' : '감상 중에서'

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader title={review.book.title} showBack />

      <main className="flex-1 overflow-y-auto pb-24">
        {/* Book Card */}
        <section className="px-5 py-5">
          <div className="overflow-hidden rounded-[28px] bg-card shadow-sm">
            <div className="bg-muted/30 px-6 py-8">
              <div className="mx-auto aspect-[2/3] w-[62%] max-w-[260px] overflow-hidden rounded-md shadow-xl">
                <img
                  src={review.book.coverImageUrl}
                  alt={review.book.title}
                  className="size-full object-cover"
                />
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  {reviewStatus}
                </span>

                <div className="flex items-center gap-1 rounded-full bg-primary/5 px-3 py-1.5 text-sm font-bold text-primary">
                  <span
                    className="material-symbols-outlined text-[18px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                  <span>{(review.rating ?? review.book.rating ?? 0).toFixed(1)}</span>
                </div>
              </div>

              <h1 className="text-3xl font-bold tracking-tight">{review.book.title}</h1>
              <p className="mt-2 text-lg font-medium text-muted-foreground">{review.book.author}</p>
            </div>
          </div>
        </section>

        {/* Review Content */}
        <section className="px-5 py-3">
          <h2 className="mb-4 text-2xl font-bold">나의 감상</h2>
          <div className="space-y-5 text-lg leading-8 text-foreground/90">
            {review.content.split('\n\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </section>

        {/* Quote Card */}
        <section className="px-5 py-5">
          <div className="rounded-[24px] bg-primary/5 p-5">
            <div className="mb-2 text-primary/20">
              <span className="material-symbols-outlined text-[38px]">format_quote</span>
            </div>

            <div className="border-l-4 border-primary pl-4">
              <p className="text-xl italic leading-9 text-foreground/85">{quote}</p>
              <p className="mt-4 text-base text-muted-foreground">{quoteSource}</p>
            </div>
          </div>
        </section>

        {/* Tags */}
        <section className="px-5 py-2">
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <span
                key={tag}
                className="rounded-xl bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary/80"
              >
                #{tag}
              </span>
            ))}
          </div>
        </section>

        {/* Reactions */}
        <section className="mt-4 border-t border-border px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5 text-sm font-semibold text-muted-foreground">
              <button
                onClick={() => setLiked(prev => !prev)}
                className="flex items-center gap-1.5 transition-colors hover:text-primary"
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: `'FILL' ${liked ? 1 : 0}` }}
                >
                  favorite
                </span>
                <span>{likeCount}</span>
              </button>

              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[20px]">chat_bubble</span>
                <span>{review.commentCount ?? 0}</span>
              </div>
            </div>

            <button className="text-muted-foreground transition-colors hover:text-primary">
              <span className="material-symbols-outlined text-[22px]">share</span>
            </button>
          </div>
        </section>

        {/* Comments */}
        <section className="px-5 pb-6 pt-2">
          <h3 className="mb-4 text-lg font-bold">댓글 {review.commentCount ?? 0}개</h3>

          {comments.length > 0 ? (
            <div className="border-t border-border">
              {comments.map(comment => (
                <div key={comment.id} className="border-b border-border py-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {comment.author[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold">{comment.author}</p>
                        <p className="text-xs text-muted-foreground">{comment.time}</p>
                      </div>
                    </div>
                  </div>

                  <p className="pl-[52px] text-sm leading-6 text-foreground/85">
                    {comment.content}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-card px-4 py-5 text-center text-sm text-muted-foreground">
              아직 댓글이 없습니다.
            </div>
          )}
        </section>

        {/* Comment Input */}
        <section className="border-t border-border px-5 py-4">
          <div className="flex items-center gap-3 rounded-full border border-primary/10 bg-card px-4 py-3">
            <input
              type="text"
              placeholder="따뜻한 댓글을 남겨주세요"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            />
            <button className="text-sm font-bold text-primary transition-colors hover:text-primary/80">
              게시
            </button>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
