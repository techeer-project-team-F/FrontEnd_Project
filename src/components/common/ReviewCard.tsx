import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Memo } from '@/types'
import StarRating from './StarRating'

interface ReviewCardProps {
  review: Memo
  className?: string
}

const statusLabel: Record<string, { text: string; variant: 'solid' | 'outline' }> = {
  finished: { text: '다 읽음', variant: 'solid' },
  reading: { text: '읽는 중', variant: 'outline' },
  want_to_read: { text: '읽고 싶어요', variant: 'outline' },
}

export default function ReviewCard({ review, className }: ReviewCardProps) {
  const [spoilerRevealed, setSpoilerRevealed] = useState(false)
  const status = review.readingStatus ? statusLabel[review.readingStatus] : null

  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-primary/5 bg-card shadow-sm',
        className
      )}
    >
      <div className="p-4">
        {/* User Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
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
              <p className="text-xs text-muted-foreground">{review.createdAt}</p>
            </div>
          </div>
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
            <img
              src={review.book.coverImageUrl}
              alt={review.book.title}
              className="size-full object-cover"
            />
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
            onClick={() => setSpoilerRevealed(true)}
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
          <button className="flex items-center gap-1.5 transition-colors hover:text-primary">
            <span className="material-symbols-outlined text-xl">favorite</span>
            <span className="text-xs font-bold">{review.likeCount}</span>
          </button>
          <button className="flex items-center gap-1.5 transition-colors hover:text-primary">
            <span className="material-symbols-outlined text-xl">chat_bubble</span>
            <span className="text-xs font-bold">{review.commentCount ?? 0}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
