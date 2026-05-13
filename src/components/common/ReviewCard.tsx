import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { likeReview, unlikeReview } from '@/api/review'
import { cn, formatRelativeTime } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import type { ReadingStatus } from '@/api/library'
import StarRating from './StarRating'

export interface ReviewCardData {
  id: number
  content: string
  isLiked: boolean
  likeCount: number
  createdAt: string
  rating?: number
  readingStatus?: ReadingStatus
  hasSpoiler?: boolean
  commentCount?: number
  author: {
    id: number
    nickname: string
    profileImageUrl?: string
  }
  book: {
    title: string
    author: string
    coverImageUrl: string
  }
}

interface ReviewCardProps {
  review: ReviewCardData
  className?: string
}

const statusLabel: Record<string, { text: string; variant: 'solid' | 'outline' }> = {
  finished: { text: '다 읽음', variant: 'solid' },
  reading: { text: '읽는 중', variant: 'outline' },
  want_to_read: { text: '읽고 싶어요', variant: 'outline' },
  stopped: { text: '중단', variant: 'outline' },
}

export default function ReviewCard({ review, className }: ReviewCardProps) {
  const navigate = useNavigate()
  const currentUserId = useAuthStore(state => state.user?.id)
  const isMyReview = currentUserId != null && review.author.id === currentUserId

  const [spoilerRevealed, setSpoilerRevealed] = useState(false)
  const [liked, setLiked] = useState(review.isLiked)
  const [likeCount, setLikeCount] = useState(review.likeCount)
  const [isLiking, setIsLiking] = useState(false)
  const status = review.readingStatus ? statusLabel[review.readingStatus] : null

  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    setLiked(review.isLiked)
    setLikeCount(review.likeCount)
  }, [review.id, review.isLiked, review.likeCount])

  /**
   * 낙관적 토글 + 롤백. 즉시 UI 반영 후 API 호출, 실패 시 원래 값으로 복원.
   * `isLiking` 가드로 연타 방지, `isMountedRef`로 언마운트 후 setState 방지.
   */
  const toggleLike = async () => {
    if (isLiking) return
    const wasLiked = liked
    const prevCount = likeCount
    setLiked(!wasLiked)
    setLikeCount(prevCount + (wasLiked ? -1 : 1))
    setIsLiking(true)
    try {
      const result = wasLiked ? await unlikeReview(review.id) : await likeReview(review.id)
      if (!isMountedRef.current) return
      setLikeCount(result.likeCount)
    } catch {
      if (!isMountedRef.current) return
      setLiked(wasLiked)
      setLikeCount(prevCount)
    } finally {
      if (isMountedRef.current) setIsLiking(false)
    }
  }

  const cardClassName = cn(
    'block overflow-hidden rounded-xl border border-primary/5 bg-card shadow-sm',
    className
  )

  const inner = (
    <div className="p-4">
      {/* User Header */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          to={`/user/${review.author.id}`}
          onClick={e => e.stopPropagation()}
          className="flex items-center gap-3"
        >
          <div className="size-10 overflow-hidden rounded-full border border-primary/10 bg-primary/10">
            {review.author.profileImageUrl && (
              <img
                src={review.author.profileImageUrl}
                alt={review.author.nickname}
                className="size-full object-cover"
              />
            )}
          </div>
          <div>
            <p className="text-sm font-bold">{review.author.nickname}</p>
            <p className="text-xs text-muted-foreground">{formatRelativeTime(review.createdAt)}</p>
          </div>
        </Link>
        {status && (
          <span
            className={cn(
              'rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider',
              status.variant === 'solid'
                ? 'bg-primary text-primary-foreground'
                : 'bg-primary/10 text-primary'
            )}
          >
            {status.text}
          </span>
        )}
      </div>

      {/* Book Info */}
      <div className="mb-4 flex gap-4">
        <div className="h-28 w-20 shrink-0 overflow-hidden rounded-md bg-primary/5 shadow-md">
          {review.book.coverImageUrl ? (
            <img
              src={review.book.coverImageUrl}
              alt={review.book.title}
              className="size-full object-cover"
            />
          ) : (
            // 빈 src는 브라우저가 현재 페이지를 재요청하므로 placeholder로 분기
            <div
              aria-hidden="true"
              className="flex size-full items-center justify-center text-xs text-muted-foreground/60"
            >
              <span className="material-symbols-outlined text-2xl">menu_book</span>
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center">
          <h3 className="text-lg font-bold leading-tight text-primary">{review.book.title}</h3>
          <p className="mb-2 text-sm">{review.book.author}</p>
          {review.rating && <StarRating rating={review.rating} size="md" />}
        </div>
      </div>

      {/* Review Text */}
      {review.hasSpoiler && !spoilerRevealed ? (
        <button
          onClick={e => {
            e.preventDefault()
            setSpoilerRevealed(true)
          }}
          className="group relative mb-4 w-full cursor-pointer"
        >
          <div className="pointer-events-none select-none opacity-40 blur-md">
            <p className="text-sm leading-relaxed">{review.content}</p>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-lg border border-primary/10 bg-primary/5 transition-colors group-hover:bg-primary/10">
            <span className="material-symbols-outlined mb-1 text-primary">visibility_off</span>
            <p className="text-[13px] font-bold text-primary">스포일러 포함 — 탭하여 보기</p>
          </div>
        </button>
      ) : (
        <div className="mb-4">
          <p className="text-sm leading-relaxed">
            {review.content}
            {!review.hasSpoiler && (
              <span className="ml-1 cursor-pointer font-medium text-primary">더보기</span>
            )}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-6 border-t border-primary/5 pt-2">
        {!isMyReview ? (
          <button
            onClick={e => {
              e.preventDefault()
              toggleLike()
            }}
            disabled={isLiking}
            aria-label={liked ? '좋아요 취소' : '좋아요'}
            className={cn(
              'flex items-center gap-1.5 transition-colors disabled:opacity-60',
              liked ? 'text-primary' : 'hover:text-primary'
            )}
          >
            <span className={cn('material-symbols-outlined text-xl', liked && 'fill-icon')}>
              favorite
            </span>
            <span className="text-xs font-bold">{likeCount}</span>
          </button>
        ) : likeCount > 0 ? (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="material-symbols-outlined text-xl">favorite</span>
            <span className="text-xs font-bold">{likeCount}</span>
          </div>
        ) : null}
        <button
          onClick={e => {
            e.preventDefault()
            navigate(`/review/${review.id}#comments`)
          }}
          className="flex items-center gap-1.5 transition-colors hover:text-primary"
        >
          <span className="material-symbols-outlined text-xl">chat_bubble</span>
          <span className="text-xs font-bold">{review.commentCount ?? 0}</span>
        </button>
      </div>
    </div>
  )

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => navigate(`/review/${review.id}`)}
      onKeyDown={e => {
        if (e.key === 'Enter' && e.currentTarget === e.target) navigate(`/review/${review.id}`)
      }}
      className={cn(cardClassName, 'cursor-pointer')}
    >
      {inner}
    </div>
  )
}
