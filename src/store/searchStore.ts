import { create } from 'zustand'
import type { BookSummary } from '@/api/book'
import type { BookSearchItem, SearchType, UserSearchItem } from '@/api/search'

interface SearchState {
  query: string
  activeTab: SearchType
  bookResults: BookSummary[]
  bookNextPage: number | null
  bookHasNext: boolean
  userResults: UserSearchItem[]
  userNextCursor: number | null
  userHasNext: boolean
  allBooks: BookSearchItem[]
  allUsers: UserSearchItem[]
  allBooksHasMore: boolean
  allUsersHasMore: boolean
}

/**
 * 검색 결과를 컴포넌트 unmount 이후에도 메모리에 보존하는 스토어.
 * persist 미들웨어 없이 in-memory로만 유지 — 새로고침 시 자연스럽게 초기화.
 */
const initialState: SearchState = {
  query: '',
  activeTab: 'all',
  bookResults: [],
  bookNextPage: null,
  bookHasNext: false,
  userResults: [],
  userNextCursor: null,
  userHasNext: false,
  allBooks: [],
  allUsers: [],
  allBooksHasMore: false,
  allUsersHasMore: false,
}

export const useSearchStore = create<SearchState>()(() => ({ ...initialState }))

export function clearSearchCache() {
  useSearchStore.setState(initialState)
}
