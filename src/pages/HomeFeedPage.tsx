import { useState } from 'react'
import { cn } from '@/lib/utils'
import { mockReviews } from '@/mocks/data'
import BottomNav from '@/components/layout/BottomNav'
import ReviewCard from '@/components/common/ReviewCard'

export default function HomeFeedPage() {
  const [activeTab, setActiveTab] = useState<'following' | 'recommend'>('following')

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-2xl font-bold tracking-tight text-primary">BookLog</h1>
          <button className="rounded-full p-2 transition-colors hover:bg-primary/5">
            <span className="material-symbols-outlined text-primary">notifications</span>
          </button>
        </div>
        {/* Tabs */}
        <div className="flex gap-8 px-4">
          <button
            onClick={() => setActiveTab('following')}
            className="relative flex flex-col items-center py-3"
          >
            <span
              className={cn(
                'text-sm font-bold',
                activeTab === 'following' ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              팔로잉
            </span>
            {activeTab === 'following' && (
              <div className="absolute bottom-0 h-0.5 w-full rounded-full bg-primary" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('recommend')}
            className="relative flex flex-col items-center py-3"
          >
            <span
              className={cn(
                'text-sm font-bold',
                activeTab === 'recommend' ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              추천
            </span>
            {activeTab === 'recommend' && (
              <div className="absolute bottom-0 h-0.5 w-full rounded-full bg-primary" />
            )}
          </button>
        </div>
      </header>

      {/* Feed */}
      <main className="flex-1 overflow-y-auto pb-24">
        {mockReviews.map(review => (
          <div key={review.id} className="p-4 pt-4 first:pt-4 [&:not(:first-child)]:pt-0">
            <ReviewCard review={review} />
          </div>
        ))}
      </main>

      <BottomNav />
    </div>
  )
}
