import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { cn } from '@/lib/utils'
import { getFollowingFeed, type FeedItem } from '@/api/feed'
import type { Memo } from '@/types'
import BottomNav from '@/components/layout/BottomNav'
import ReviewCard from '@/components/common/ReviewCard'

type TabValue = 'following' | 'recommend'

// 백엔드 FeedItem을 ReviewCard가 받는 Memo 형태로 매핑.
// Memo의 일부 필드(book.isbn/publisher, author.followerCount/followingCount)는 ReviewCard가 사용하지 않으므로
// 빈 값/0으로 채운다 — 후속 리팩터로 ReviewCard prop을 더 단순한 형태로 분리하면 제거 가능.
function toMemo(item: FeedItem): Memo {
  return {
    id: item.review.reviewId,
    content: item.review.content,
    book: {
      isbn: '',
      title: item.review.book.title,
      author: item.review.book.author,
      publisher: '',
      coverImageUrl: item.review.book.coverImageUrl ?? '',
    },
    author: {
      id: item.review.user.userId,
      nickname: item.review.user.nickname,
      profileImageUrl: item.review.user.profileImageUrl ?? undefined,
      followerCount: 0,
      followingCount: 0,
    },
    likeCount: item.review.likeCount,
    isLiked: item.review.isLiked,
    createdAt: item.review.createdAt,
    rating: item.review.rating,
    hasSpoiler: item.review.isSpoiler,
    commentCount: item.review.commentCount,
  }
}

export default function HomeFeedPage() {
  const [activeTab, setActiveTab] = useState<TabValue>('following')

  const [items, setItems] = useState<Memo[]>([])
  const [nextCursor, setNextCursor] = useState<number | null>(null)
  const [hasNext, setHasNext] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)

  const observerRef = useRef<IntersectionObserver | null>(null)
  const moreControllerRef = useRef<AbortController | null>(null)

  const stateRef = useRef({
    hasNext,
    isLoading,
    isLoadingMore,
    nextCursor,
    activeTab,
    loadMoreError,
  })
  stateRef.current = {
    hasNext,
    isLoading,
    isLoadingMore,
    nextCursor,
    activeTab,
    loadMoreError,
  }

  // 초기 로딩 + 탭 변경 시 재요청. 'recommend' 탭은 백엔드 미구현이므로 placeholder만 표시 (fetch 스킵).
  useEffect(() => {
    setIsLoadingMore(false)
    setLoadMoreError(null)
    moreControllerRef.current?.abort()
    setItems([])
    setNextCursor(null)
    setHasNext(false)
    setErrorMessage(null)

    if (activeTab !== 'following') {
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)
    ;(async () => {
      try {
        const response = await getFollowingFeed({
          cursor: null,
          signal: controller.signal,
        })
        if (controller.signal.aborted) return
        setItems(response.content.map(toMemo))
        setNextCursor(response.nextCursor)
        setHasNext(response.hasNext)
      } catch (error) {
        // normalizeAxiosError가 cancel은 rethrow하므로 여기서 분기 필수
        if (axios.isCancel(error) || controller.signal.aborted) return
        setErrorMessage(error instanceof Error ? error.message : '피드를 불러오지 못했습니다.')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    })()

    return () => {
      controller.abort()
      moreControllerRef.current?.abort()
    }
  }, [activeTab])

  const fetchMore = useCallback(async () => {
    const s = stateRef.current
    if (s.activeTab !== 'following') return
    if (s.isLoadingMore || s.isLoading || !s.hasNext) return
    const requestedCursor = s.nextCursor

    moreControllerRef.current?.abort()
    const controller = new AbortController()
    moreControllerRef.current = controller

    setIsLoadingMore(true)
    setLoadMoreError(null)
    try {
      const response = await getFollowingFeed({
        cursor: requestedCursor,
        signal: controller.signal,
      })
      if (controller.signal.aborted) return
      // 도중에 탭이 바뀌었으면 응답 버림
      if (stateRef.current.activeTab !== 'following') return
      setItems(prev => [...prev, ...response.content.map(toMemo)])
      setNextCursor(response.nextCursor)
      setHasNext(response.hasNext)
    } catch (error) {
      if (axios.isCancel(error) || controller.signal.aborted) return
      if (stateRef.current.activeTab !== 'following') return
      setLoadMoreError(error instanceof Error ? error.message : '추가 로딩에 실패했습니다.')
    } finally {
      if (!controller.signal.aborted) setIsLoadingMore(false)
    }
  }, [])

  // sentinel ref callback: 조건부 렌더된 sentinel 마운트/언마운트에 따라 observer 재부착이 자동
  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      observerRef.current?.disconnect()
      if (!node) {
        observerRef.current = null
        return
      }
      observerRef.current = new IntersectionObserver(
        entries => {
          // noUncheckedIndexedAccess 대비 + disconnect 후 잔여 콜백 방어
          if (!entries[0]?.isIntersecting) return
          if (stateRef.current.loadMoreError) return
          fetchMore()
        },
        { rootMargin: '200px' }
      )
      observerRef.current.observe(node)
    },
    [fetchMore]
  )

  useEffect(() => () => observerRef.current?.disconnect(), [])

  const retryLoadMore = () => {
    setLoadMoreError(null)
    fetchMore()
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Shelfeed</h1>
          <Link
            to="/notifications"
            className="rounded-full p-2 transition-colors hover:bg-primary/5"
          >
            <span className="material-symbols-outlined text-primary">notifications</span>
          </Link>
        </div>
        {/* Tabs */}
        <div className="flex gap-8 px-4" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'following'}
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
            type="button"
            role="tab"
            aria-selected={activeTab === 'recommend'}
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
        {activeTab === 'following' ? (
          <>
            {isLoading && items.length === 0 && (
              <p
                role="status"
                aria-busy="true"
                className="py-10 text-center text-sm text-muted-foreground"
              >
                불러오는 중...
              </p>
            )}

            {!isLoading && errorMessage && (
              <p role="alert" className="py-10 text-center text-sm text-destructive">
                {errorMessage}
              </p>
            )}

            {!isLoading && !errorMessage && items.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-3 py-20">
                <span className="material-symbols-outlined text-5xl text-muted-foreground/30">
                  group
                </span>
                <p className="text-sm text-muted-foreground">
                  팔로우한 사용자의 감상이 아직 없어요.
                </p>
              </div>
            )}

            {items.map(memo => (
              <div key={memo.id} className="p-4 pt-4 first:pt-4 [&:not(:first-child)]:pt-0">
                <ReviewCard review={memo} />
              </div>
            ))}

            {items.length > 0 && (
              <>
                {/* hasNext가 false면 sentinel 자체를 안 띄워 불필요한 observer 부착 방지 */}
                {hasNext && <div ref={sentinelRef} className="h-10" aria-hidden="true" />}

                {isLoadingMore && (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    더 불러오는 중...
                  </p>
                )}

                {loadMoreError && !isLoadingMore && (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <p role="alert" className="text-sm text-destructive">
                      {loadMoreError}
                    </p>
                    <button
                      type="button"
                      onClick={retryLoadMore}
                      className="rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20"
                    >
                      다시 불러오기
                    </button>
                  </div>
                )}

                {!hasNext && !isLoadingMore && !loadMoreError && (
                  <p className="py-4 text-center text-xs text-muted-foreground/50">
                    모든 감상을 확인했습니다
                  </p>
                )}
              </>
            )}
          </>
        ) : (
          // TODO(추천 피드 백엔드 구현 시 작업): 현재는 placeholder 유지
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <span className="material-symbols-outlined text-5xl text-muted-foreground/30">
              auto_awesome
            </span>
            <p className="text-sm text-muted-foreground">추천 감상이 곧 제공됩니다</p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
