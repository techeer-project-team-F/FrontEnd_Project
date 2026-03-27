import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { Book } from '@/types'
import StarRating from './StarRating'

interface BookListItemProps {
  book: Book
  className?: string
}

export default function BookListItem({ book, className }: BookListItemProps) {
  return (
    <Link
      to={`/book/${book.isbn}`}
      className={cn('flex items-start gap-4 border-b border-primary/5 py-5', className)}
    >
      <div className="h-36 w-24 shrink-0 overflow-hidden rounded-lg bg-primary/5 shadow-sm">
        <img src={book.coverImageUrl} alt={book.title} className="size-full object-cover" />
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <h3 className="text-lg font-bold leading-tight text-primary">{book.title}</h3>
        <p className="text-sm text-muted-foreground">{book.author} 저</p>
        <p className="text-xs text-muted-foreground/70">
          {book.publisher}
          {book.pageCount && ` · ${book.pageCount}p`}
        </p>
        {book.rating && (
          <div className="mt-auto flex items-center gap-1">
            <StarRating rating={book.rating} size="sm" />
            <span className="text-sm font-bold text-primary">{book.rating}</span>
            {book.reviewCount && (
              <span className="ml-1 text-xs text-muted-foreground">
                ({book.reviewCount.toLocaleString()} reviews)
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
