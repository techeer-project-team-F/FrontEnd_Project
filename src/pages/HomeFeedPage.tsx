import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { cn } from '@/lib/utils'
import { getFollowingFeed, type FeedItem } from '@/api/feed'
import { getUnreadNotificationCount } from '@/api/notification'
import BottomNav from '@/components/layout/BottomNav'
import PopupBanner from '@/components/common/PopupBanner'
import ReviewCard, { type ReviewCardData } from '@/components/common/ReviewCard'

type TabValue = 'following' | 'recommend'

/**
 * 백엔드 `FeedItem` 응답을 `ReviewCardData`로 매핑한다.
 * 슬림 타입이라 더미 필드 없이 필요한 정보만 전달.
 */
function toReviewCardData(item: FeedItem): ReviewCardData {
  return {
    id: item.review.reviewId,
    content: item.review.content,
    book: {
      title: item.review.book.title,
      author: item.review.book.author,
      coverImageUrl: item.review.book.coverImageUrl ?? '',
    },
    author: {
      id: item.review.user.userId,
      nickname: item.review.user.nickname,
      profileImageUrl: item.review.user.profileImageUrl ?? undefined,
    },
    likeCount: item.review.likeCount,
    isLiked: item.review.isLiked,
    createdAt: item.review.createdAt,
    rating: item.review.rating,
    hasSpoiler: item.review.isSpoiler,
    commentCount: item.review.commentCount,
  }
}

/**
 * 홈 피드 페이지.
 *
 * - 팔로잉 탭: 사용자가 팔로우한 유저들의 감상을 cursor 기반으로 페이지네이션.
 *   `IntersectionObserver`로 sentinel을 감지하여 무한스크롤로 자연스럽게 다음 페이지 로딩.
 * - 추천 탭: 백엔드 미구현으로 placeholder만 표시. 탭 전환 시 in-flight 요청을 즉시
 *   abort하고 상태를 초기화한다.
 *
 * **데이터 흐름**:
 * 1. 마운트 또는 탭 전환 시 첫 페이지(`getFollowingFeed({ cursor: null })`) 요청
 * 2. sentinel이 viewport 200px 안으로 들어오면 다음 페이지 요청
 * 3. 응답 도중 탭이 바뀌면 stale guard로 결과 폐기
 *
 * **상태 동기화**:
 * - `stateRef`로 observer 콜백에서 최신 state를 안전하게 읽어 deps 폭주를 회피
 * - `moreControllerRef`로 진행 중인 추가 로딩 요청을 새 요청 시 명시적으로 취소
 * - `loadMoreError` 발생 시 observer 콜백이 자동 재시도하지 않고 사용자가 "다시 불러오기"로 명시 재시도
 *
 * @returns 헤더(로고/알림) + 탭(팔로잉/추천) + 피드 리스트 + BottomNav를 렌더링하는 React 엘리먼트
 */
export default function HomeFeedPage() {
  const [activeTab, setActiveTab] = useState<TabValue>('following')
  /**
   * 종 아이콘 미읽음 알림 카운트.
   *
   * 0이면 뱃지 미렌더, 1+이면 카운트 표시(100+는 "99+"). 조회 실패는 조용히
   * 무시한다 — 뱃지가 안 뜨는 것은 치명적 에러가 아니고, 피드 화면 자체 동작에
   * 영향 없음. SSE/폴링은 본 이슈 범위 밖이라 마운트 시점 + 탭 visible 복귀
   * 시점에만 재조회한다.
   */
  const [unreadCount, setUnreadCount] = useState(0)

  const [items, setItems] = useState<ReviewCardData[]>([])
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
        setItems(response.content.map(toReviewCardData))
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

  /**
   * 미읽음 알림 개수를 조회해 종 아이콘 뱃지에 반영한다.
   *
   * - 마운트 시점 1회 조회 (HomeFeedPage는 `/notifications` 진입 시 unmount되므로,
   *   복귀 시 자연스럽게 재마운트되어 카운트가 갱신된다).
   * - `visibilitychange`로 탭이 백그라운드 → 포그라운드로 돌아오면 다시 조회.
   * - 실패는 조용히 무시 (catch에서 setState 안 함). 뱃지가 안 뜨는 건 치명적이지
   *   않고, 피드 화면 자체 동작에 영향 없음.
   * - 진행 중 요청은 페이지 이탈/탭 전환 시 abort.
   */
  useEffect(() => {
    let activeController: AbortController | null = null

    const refetch = () => {
      activeController?.abort()
      const controller = new AbortController()
      activeController = controller
      ;(async () => {
        try {
          const result = await getUnreadNotificationCount(controller.signal)
          if (controller.signal.aborted) return
          setUnreadCount(result.unreadCount)
        } catch (error) {
          if (axios.isCancel(error) || controller.signal.aborted) return
          // 조용히 무시 — 뱃지 미표시가 치명적 에러는 아님
        }
      })()
    }

    // [code-review MED fix] bfcache 복구나 일부 브라우저 마운트 직후 visibilitychange가
    // 다시 fire되어 같은 카운트를 중복 호출하는 케이스를 방지. visible일 때만 첫 fetch.
    if (document.visibilityState === 'visible') refetch()

    const onVisibility = () => {
      if (document.visibilityState === 'visible') refetch()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      activeController?.abort()
    }
  }, [])

  /**
   * 다음 페이지를 cursor 기반으로 추가 로딩한다.
   *
   * - `stateRef`에서 최신 `nextCursor`/`hasNext`/탭 상태를 읽어 stale closure를 회피
   * - 진행 중인 이전 추가 로딩 요청은 새 `AbortController`로 즉시 취소
   * - 응답이 도착했을 때 사용자가 이미 다른 탭으로 이동했다면 결과 폐기
   * - cancel은 `_helpers.ts`의 `normalizeAxiosError`가 rethrow하므로 `axios.isCancel`로 분기
   *
   * @remarks observer 콜백과 retry 버튼이 공유 호출하므로 useCallback으로 안정화.
   * deps를 비워두는 이유는 stateRef로 모든 최신 상태에 접근하기 때문.
   */
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
      setItems(prev => [...prev, ...response.content.map(toReviewCardData)])
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

  /**
   * sentinel DOM 노드에 부착되는 ref callback.
   *
   * 조건부로 렌더되는 sentinel(`hasNext === true`일 때만 표시)의 마운트/언마운트에
   * 따라 `IntersectionObserver`를 자동으로 재부착한다. ref가 null이면 기존 observer를
   * 정리하고 새 노드가 들어오면 새 observer를 만들어 observe.
   *
   * - `entries[0]?.isIntersecting`만 의미 있는 조건 (다른 entries는 발생 가능성 없음)
   * - `loadMoreError`가 있으면 자동 재시도하지 않고 사용자에게 명시 재시도 권한을 위임
   *
   * @param node sentinel `<div>` DOM 요소 (조건부 렌더로 null일 수 있음)
   */
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

  /**
   * 추가 로딩 실패("다시 불러오기" 버튼) 핸들러.
   *
   * `loadMoreError` 상태를 초기화하여 observer가 다시 sentinel 교차에 반응할 수 있도록
   * 만든 뒤 `fetchMore()`로 즉시 재요청한다. 자동 재시도와 분리한 이유는 무한 재시도
   * 루프(에러 → observer 콜백 → 에러)를 막기 위함.
   */
  const retryLoadMore = () => {
    setLoadMoreError(null)
    fetchMore()
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="w-10" />
          <h1 className="text-2xl font-bold tracking-tight text-primary">Shelfeed</h1>
          <Link
            to="/notifications"
            aria-label={unreadCount > 0 ? `알림 (미읽음 ${unreadCount}개)` : '알림'}
            className="relative flex w-10 items-center justify-center rounded-full p-2 transition-colors hover:bg-primary/5"
          >
            <span className="material-symbols-outlined text-primary">notifications</span>
            {unreadCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
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

      <PopupBanner
        imageUrl="/images/popup/event-banner.png"
        imageAlt="Shelfeed 이벤트"
        storageKey="home-popup"
      />
      <BottomNav />
    </div>
  )
}
