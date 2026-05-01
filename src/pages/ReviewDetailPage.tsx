import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { deleteReview, getReviewDetail, type ReviewDetail } from '@/api/review'
import { backendToFrontStatus } from '@/api/library'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuthStore } from '@/store/authStore'
import type { ReadingStatus } from '@/types'

const readingStatusLabel: Record<ReadingStatus, string> = {
  finished: '다 읽음',
  reading: '읽는 중',
  stopped: '중단',
  want_to_read: '읽고 싶어요',
}

export default function ReviewDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const currentUserId = useAuthStore(state => state.user?.id)
  const reviewId = Number(id)
  const [review, setReview] = useState<ReviewDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!Number.isFinite(reviewId)) {
      setErrorMessage('감상 정보가 올바르지 않습니다.')
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)
    setErrorMessage(null)
    ;(async () => {
      try {
        const result = await getReviewDetail(reviewId, controller.signal)
        setReview(result)
      } catch (error) {
        // [MED-1 fix] try 블록 내 controller.signal.aborted 가드는 사실상 도달 불가
        // (요청이 abort되면 axios가 throw로 빠짐) + _helpers.ts의 normalizeAxiosError가
        // 이미 cancel을 rethrow하므로 catch에서 axios.isCancel만 보면 책임이 끝난다.
        // 다른 도메인(book/library 등)과 패턴 통일 + CLAUDE.md "방어 코드 최소화"에 맞춰 단일화.
        if (axios.isCancel(error)) return
        setErrorMessage(error instanceof Error ? error.message : '감상을 불러오지 못했습니다.')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    })()

    return () => controller.abort()
  }, [reviewId])

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader title="감상 상세" showBack />

        <main aria-busy="true" className="flex flex-1 items-center justify-center pb-24">
          <p role="status" className="text-sm text-muted-foreground">
            불러오는 중...
          </p>
        </main>

        <BottomNav />
      </div>
    )
  }

  if (errorMessage || !review) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader title="감상 상세" showBack />

        <main className="flex flex-1 flex-col items-center justify-center gap-4 pb-24">
          <span className="material-symbols-outlined text-6xl text-muted-foreground/30">
            search_off
          </span>
          <p className="text-lg font-bold text-muted-foreground">감상을 찾을 수 없습니다</p>
          {errorMessage && (
            <p role="alert" className="max-w-[280px] text-center text-sm text-muted-foreground">
              {errorMessage}
            </p>
          )}
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

  const frontReadingStatus = review.readingStatus
    ? backendToFrontStatus[review.readingStatus]
    : undefined
  const reviewStatus = frontReadingStatus ? readingStatusLabel[frontReadingStatus] : '기록'
  const tags: string[] =
    review.tags && review.tags.length > 0
      ? review.tags
      : [review.book.author, review.book.publisher, reviewStatus].filter((tag): tag is string =>
          Boolean(tag)
        )
  // [MED-2 fix] 이전엔 quote 결정은 ?? (null/undefined만 fallthrough), source 결정은 || (빈 문자열도 falsy)
  // 라 백엔드가 quote: ""를 보내면 quote 자리에 빈 문자열이 렌더되면서 라벨은 '감상 중에서'로
  // 잘못 표기되는 미스매치가 있었다. 두 분기 모두 || 기준으로 통일하고 hasOwnQuote 플래그로
  // 라벨을 정확히 결정하도록 수정.
  const hasOwnQuote = Boolean(review.quote)
  const quote = review.quote || review.book.description || review.content
  const quoteSource = hasOwnQuote
    ? '감상 중에서'
    : review.book.description
      ? '도서 소개'
      : '감상 중에서'
  const coverImageUrl = review.book.coverImageUrl
  const isMyReview = currentUserId != null && review.user.userId === currentUserId

  const handleDeleteReview = async () => {
    setIsDeleting(true)
    setDeleteErrorMessage(null)
    try {
      await deleteReview(review.reviewId)
      navigate(`/book/${review.book.bookId}`, { replace: true })
    } catch (error) {
      setDeleteErrorMessage(error instanceof Error ? error.message : '감상을 삭제하지 못했습니다.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader title={review.book.title} showBack />

      <main className="flex-1 overflow-y-auto pb-24">
        {/* Book Card */}
        <section className="px-5 py-5">
          <div className="overflow-hidden rounded-[28px] bg-card shadow-sm">
            <div className="bg-muted/30 px-6 py-8">
              <div className="mx-auto aspect-[2/3] w-[62%] max-w-[260px] overflow-hidden rounded-md shadow-xl">
                {coverImageUrl ? (
                  <img
                    src={coverImageUrl}
                    alt={review.book.title}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center bg-primary/10 text-primary/35">
                    <span className="material-symbols-outlined text-5xl">menu_book</span>
                  </div>
                )}
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
                  <span>{review.rating.toFixed(1)}</span>
                </div>
              </div>

              <h1 className="text-3xl font-bold tracking-tight">{review.book.title}</h1>
              <p className="mt-2 text-lg font-medium text-muted-foreground">{review.book.author}</p>
            </div>
          </div>
        </section>

        {isMyReview && (
          <section className="flex gap-2 px-5 pb-3">
            <button
              type="button"
              onClick={() => navigate(`/review/${review.reviewId}/edit`)}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-primary/20 bg-card text-sm font-bold text-primary transition-colors hover:bg-primary/5"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
              수정
            </button>
            <button
              type="button"
              onClick={() => {
                setDeleteErrorMessage(null)
                setIsDeleteDialogOpen(true)
              }}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 text-sm font-bold text-destructive transition-colors hover:bg-destructive/10"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
              삭제
            </button>
          </section>
        )}

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

        {/* Reactions
            [HIGH-2 fix] 이전엔 좋아요 버튼이 로컬 state(liked)만 토글되어 새로고침 시 액션이
            사라지고, likeCount 계산식도 초기값 대비 한 번의 토글에만 정확했다. POST/DELETE
            좋아요 API가 본 PR 범위 밖이므로 일단 disabled로 처리해 서버에서 받은 isLiked /
            likeCount를 표시만 한다. 좋아요 API 연동은 후속 이슈에서 처리.
            [MED-3 fix] 이전엔 review.commentCount ?? 0 형태로 가드했지만 타입은 number(non-null)
            이라 가드 불필요. CLAUDE.md "방어 코드 최소화" + 타입 신뢰성을 위해 ?? 0 제거. */}
        <section className="mt-4 border-t border-border px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5 text-sm font-semibold text-muted-foreground">
              <button
                type="button"
                disabled
                aria-label="좋아요 (준비 중)"
                className="flex items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: `'FILL' ${review.isLiked ? 1 : 0}` }}
                >
                  favorite
                </span>
                <span>{review.likeCount}</span>
              </button>

              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[20px]">chat_bubble</span>
                <span>{review.commentCount}</span>
              </div>
            </div>

            <button
              type="button"
              disabled
              aria-label="공유 (준비 중)"
              className="text-muted-foreground/40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[22px]">share</span>
            </button>
          </div>
        </section>

        {/* Comments
            [MED-4 fix] 이전엔 commentTemplates ("독자 1: 문장 해석이 인상적이네요…")로 가짜 댓글을
            진짜처럼 렌더해 사용자가 실제 댓글로 오해할 수 있었다. 댓글 API가 본 PR 범위 밖이므로
            placeholder("댓글 기능은 곧 제공될 예정입니다.")로 교체하여 명시적 "준비 중" 상태를
            표시. 댓글 API 연동은 후속 이슈에서 처리. */}
        <section className="px-5 pb-6 pt-2">
          <h3 className="mb-4 text-lg font-bold">댓글 {review.commentCount}개</h3>
          <div className="rounded-xl bg-card px-4 py-5 text-center text-sm text-muted-foreground">
            댓글 기능은 곧 제공될 예정입니다.
          </div>
        </section>

        {/* Comment Input — [MED-4 fix] 위와 동일 사유로 입력창/게시 버튼 모두 disabled 처리 */}
        <section className="border-t border-border px-5 py-4">
          <div className="flex items-center gap-3 rounded-full border border-primary/10 bg-card px-4 py-3 opacity-60">
            <input
              type="text"
              disabled
              placeholder="댓글 기능 준비 중"
              className="min-w-0 flex-1 cursor-not-allowed bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            />
            <button
              type="button"
              disabled
              className="cursor-not-allowed text-sm font-bold text-primary/40"
            >
              게시
            </button>
          </div>
        </section>
      </main>

      <Dialog
        open={isDeleteDialogOpen}
        onOpenChange={open => {
          if (isDeleting && !open) return
          setIsDeleteDialogOpen(open)
        }}
      >
        <DialogContent
          onInteractOutside={e => {
            if (isDeleting) e.preventDefault()
          }}
          onEscapeKeyDown={e => {
            if (isDeleting) e.preventDefault()
          }}
        >
          <DialogHeader>
            <DialogTitle>감상을 삭제하시겠습니까?</DialogTitle>
            <DialogDescription>
              삭제한 감상은 되돌릴 수 없습니다. 이 책에 대한 감상 기록이 사라집니다.
            </DialogDescription>
          </DialogHeader>
          {deleteErrorMessage && (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 px-4 py-3 text-center text-sm text-destructive"
            >
              {deleteErrorMessage}
            </p>
          )}
          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
              className="rounded-lg border border-primary/20 bg-card px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-primary/5 disabled:opacity-60"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleDeleteReview}
              disabled={isDeleting}
              className="rounded-lg bg-destructive px-5 py-3 text-sm font-semibold text-destructive-foreground transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? '삭제 중...' : '삭제하기'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  )
}
