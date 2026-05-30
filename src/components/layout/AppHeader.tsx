import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface AppHeaderProps {
  title?: string
  showBack?: boolean
  rightAction?: React.ReactNode
  className?: string
}

export default function AppHeader({
  title = 'Shelfeed',
  showBack = false,
  rightAction,
  className,
}: AppHeaderProps) {
  const navigate = useNavigate()
  const isHomeLogo = title === 'Shelfeed'

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
            type="button"
            onClick={() => navigate(-1)}
            aria-label="이전 페이지로 돌아가기"
            className="flex size-10 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_back
            </span>
          </button>
        )}
      </div>

      <h1
        {...(isHomeLogo && {
          role: 'link',
          tabIndex: 0,
          onClick: () => navigate('/'),
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              navigate('/')
            }
          },
        })}
        className={cn(
          'text-xl font-bold tracking-tight text-primary',
          !showBack && 'text-2xl',
          isHomeLogo && 'cursor-pointer transition-opacity hover:opacity-70'
        )}
      >
        {title}
      </h1>

      <div className="flex w-10 items-center justify-end">{rightAction}</div>
    </header>
  )
}
