import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface AppHeaderProps {
  title?: string
  showBack?: boolean
  rightAction?: React.ReactNode
  className?: string
}

export default function AppHeader({
  title = 'BookLog',
  showBack = false,
  rightAction,
  className,
}: AppHeaderProps) {
  const navigate = useNavigate()

  return (
    <header
      className={cn(
        'sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md',
        className
      )}
    >
      <div className="flex w-10 items-center">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="flex size-10 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        )}
      </div>

      <h1 className={cn('text-xl font-bold tracking-tight text-primary', !showBack && 'text-2xl')}>
        {title}
      </h1>

      <div className="flex w-10 items-center justify-end">{rightAction}</div>
    </header>
  )
}
