import { cn } from '@/lib/utils'

interface StarRatingProps {
  rating: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-2xl',
}

export default function StarRating({ rating, size = 'md', className }: StarRatingProps) {
  // 백엔드 집계 오류 등으로 [0,5]를 벗어난 값(또는 NaN/Infinity)이 와도 Array.from에 음수 length가
  // 들어가 RangeError(화이트스크린)가 나지 않도록 진입부에서 clamp한다.
  const safeRating = Math.min(5, Math.max(0, Number.isFinite(rating) ? rating : 0))
  const fullStars = Math.floor(safeRating)
  const hasHalf = safeRating - fullStars >= 0.5
  const emptyStars = Math.max(0, 5 - fullStars - (hasHalf ? 1 : 0))

  return (
    <div className={cn('flex gap-0.5', className)}>
      {Array.from({ length: fullStars }).map((_, i) => (
        <span
          key={`full-${i}`}
          className={cn('material-symbols-outlined fill-icon text-accent-gold', sizeMap[size])}
        >
          star
        </span>
      ))}
      {hasHalf && (
        <span className={cn('material-symbols-outlined text-accent-gold', sizeMap[size])}>
          star_half
        </span>
      )}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <span
          key={`empty-${i}`}
          className={cn('material-symbols-outlined text-muted-foreground/30', sizeMap[size])}
        >
          star
        </span>
      ))}
    </div>
  )
}
