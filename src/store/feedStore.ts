import { create } from 'zustand'
import type { ReviewCardData } from '@/components/common/ReviewCard'

export type FeedTab = 'following' | 'recommend'

export interface FeedTabCache {
  items: ReviewCardData[]
  nextCursor: number | null
  nextCursorId: number | null
  nextCursorLike: number | null
  hasNext: boolean
  scrollY: number
}

interface FeedState {
  activeTab: FeedTab
  following: FeedTabCache | null
  recommend: FeedTabCache | null
}

/**
 * 홈 피드 데이터를 컴포넌트 unmount 이후에도 메모리에 보존하는 스토어.
 * persist 미들웨어 없이 in-memory로만 유지 — 새로고침 시 자연스럽게 초기화.
 * 탭별(팔로잉/추천) 독립 캐시 + 스크롤 위치를 저장한다.
 */
export const useFeedStore = create<FeedState>()(() => ({
  activeTab: 'following',
  following: null,
  recommend: null,
}))

export function setFeedTabCache(tab: FeedTab, cache: FeedTabCache) {
  if (tab === 'following') {
    useFeedStore.setState({ following: cache })
  } else {
    useFeedStore.setState({ recommend: cache })
  }
}

export function clearFeedCache() {
  useFeedStore.setState({ following: null, recommend: null })
}
