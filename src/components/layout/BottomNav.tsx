import { useLocation, Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

const navItems = [
  { label: '홈', icon: 'home', path: '/' },
  { label: '검색', icon: 'search', path: '/search' },
  { label: '내 서재', icon: 'menu_book', path: '/library' },
  { label: '프로필', icon: 'person', path: '/profile' },
]

export default function BottomNav() {
  const { pathname } = useLocation()

  return (
    <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 border-t border-border bg-card/95 px-4 pb-6 pt-2 backdrop-blur-md">
      <div className="flex items-center justify-around">
        {navItems.map(item => {
          const isActive = pathname === item.path

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center gap-1 transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <span className={cn('material-symbols-outlined text-2xl', isActive && 'fill-icon')}>
                {item.icon}
              </span>
              <span className="text-[10px] font-bold">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
