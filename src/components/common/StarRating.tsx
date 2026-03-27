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
  const fullStars = Math.floor(rating)
  const hasHalf = rating - fullStars >= 0.5
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0)

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
