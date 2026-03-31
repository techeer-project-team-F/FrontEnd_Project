import { useState } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { mockLibraryBooks } from '@/mocks/data'
import type { ReadingStatus } from '@/types'
import BottomNav from '@/components/layout/BottomNav'

const filters: { label: string; value: ReadingStatus | 'all' }[] = [
  { label: '전체', value: 'all' },
  { label: '읽고 싶은', value: 'want_to_read' },
  { label: '읽는 중', value: 'reading' },
  { label: '다 읽음', value: 'finished' },
  { label: '중단', value: 'stopped' },
]

const statusBadge: Record<ReadingStatus, { text: string; bg: string }> = {
  finished: { text: '다 읽음', bg: 'bg-primary' },
  reading: { text: '읽는 중', bg: 'bg-amber-600' },
  want_to_read: { text: '읽고 싶은', bg: 'bg-primary/40' },
  stopped: { text: '중단', bg: 'bg-slate-400' },
}

export default function MyLibraryPage() {
  const [activeFilter, setActiveFilter] = useState<ReadingStatus | 'all'>('all')

  const displayed =
    activeFilter === 'all'
      ? mockLibraryBooks
      : mockLibraryBooks.filter(item => item.readingStatus === activeFilter)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/80 px-4 py-4 backdrop-blur-md">
        <h1 className="text-2xl font-bold">내 서재</h1>
        <Link to="/search" className="rounded-full p-2 transition-colors hover:bg-primary/10">
          <span className="material-symbols-outlined text-primary">search</span>
        </Link>
      </header>

      {/* Filter Chips */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto p-4">
        {filters.map(filter => (
          <button
            key={filter.value}
            onClick={() => setActiveFilter(filter.value)}
            className={cn(
              'shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-colors',
              activeFilter === filter.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-primary/10 text-primary hover:bg-primary/20'
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex cursor-pointer items-center gap-2 rounded-lg bg-primary/5 px-3 py-1.5">
          <span className="material-symbols-outlined text-sm text-primary">swap_vert</span>
          <span className="text-sm font-medium text-primary">최근 추가순</span>
        </div>
        <div className="flex items-center gap-4 text-primary/60">
          <span className="material-symbols-outlined cursor-pointer text-primary transition-colors">
            grid_view
          </span>
          <span className="material-symbols-outlined cursor-pointer transition-colors hover:text-primary">
            view_list
          </span>
          <span className="material-symbols-outlined cursor-pointer transition-colors hover:text-primary">
            layers
          </span>
        </div>
      </div>

      {/* Book Count */}
      <div className="px-4 py-4">
        <p className="text-sm font-medium">총 {displayed.length}권</p>
      </div>

      {/* Book Grid */}
      <main className="px-4 pb-24">
        {displayed.length > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {displayed.map(item => {
              const badge = statusBadge[item.readingStatus]
              return (
                <Link
                  key={item.book.isbn}
                  to={`/book/${item.book.isbn}`}
                  className="relative flex flex-col gap-2"
                >
                  <div className="group relative aspect-[2/3] w-full overflow-hidden rounded-lg shadow-md">
                    <img
                      src={item.book.coverImageUrl}
                      alt={item.book.title}
                      className="size-full object-cover"
                    />
                    <div
                      className={cn(
                        'absolute bottom-1 right-1 rounded-full px-2 py-0.5 text-[10px] text-white',
                        badge.bg
                      )}
                    >
                      {badge.text}
                    </div>
                  </div>
                  <p className="line-clamp-1 text-xs font-semibold">{item.book.title}</p>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <span className="material-symbols-outlined text-5xl text-muted-foreground/30">
              menu_book
            </span>
            <p className="text-sm text-muted-foreground">해당 상태의 도서가 없습니다</p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
