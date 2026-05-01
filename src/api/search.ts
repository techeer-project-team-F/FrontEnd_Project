import apiClient from './client'
import { type ApiResponse, normalizeAxiosError, parseApiResponse } from './_helpers'

/**
 * 통합 검색 결과의 단일 도서 항목 — 백엔드 `BookSearchResult`와 1:1 매칭.
 *
 * 기존 `/api/v1/books/search`의 `BookSummary`(book.ts)와는 다른 필드 셋:
 * - 통합 검색은 `averageRating`/`reviewCount`(통계)를 노출
 * - 도서 검색은 `publisher`/`publishedDate`/`inMyLibrary`(서재 상태)를 노출
 *
 * 따라서 도서 탭은 기존 `searchBooks`를 그대로 사용하고, 본 통합 검색 API는
 * "전체" 탭 또는 "유저" 탭에서만 사용한다 (#126 결정 사항 — 옵션 a).
 *
 * `averageRating`은 백엔드에서 평점이 없으면 0.0으로 채움 — UI에서 0.0이면
 * 별점 미표시 등 정책으로 분기.
 */
export interface BookSearchItem {
  bookId: number
  isbn13: string
  title: string
  author: string
  coverImageUrl: string | null
  averageRating: number
  reviewCount: number
}

/**
 * 통합 검색 결과의 단일 유저 항목 — 백엔드 `UserSearchResult`와 1:1 매칭.
 *
 * `isFollowing`은 비로그인 시 백엔드가 항상 false로 채움. 검색 결과에 자기 자신이
 * 포함될 수 있으므로 호출부에서 `useAuthStore.user.id` 비교로 자기 자신은 팔로우
 * 버튼 미노출 처리 권장.
 */
export interface UserSearchItem {
  userId: number
  nickname: string
  profileImageUrl: string | null
  bio: string | null
  followerCount: number
  isFollowing: boolean
}

/**
 * 백엔드 `SearchPageResponse<T>`와 1:1 매칭. 빈 결과는 `content: []` + `hasNext: false`.
 * `nextCursor`는 마지막 아이템의 id (book이면 bookId, user면 userId).
 */
export interface SearchPage<T> {
  content: T[]
  nextCursor: number | null
  hasNext: boolean
  size: number
}

/**
 * 통합 검색 응답 wrapper. `type`별로 한쪽이 빈 페이지로 채워진다.
 *
 * - `type='all'` → books, users 모두 검색 결과
 * - `type='book'` → users는 빈 페이지(empty)
 * - `type='user'` → books는 빈 페이지(empty)
 *
 * 두 섹션이 항상 존재하므로 옵셔널 분기 불필요.
 */
export interface IntegratedSearchResponse {
  books: SearchPage<BookSearchItem>
  users: SearchPage<UserSearchItem>
}

export type SearchType = 'all' | 'book' | 'user'

export interface SearchAllParams {
  query: string
  type?: SearchType
  cursor?: number | null
  limit?: number
  signal?: AbortSignal
}

/**
 * 통합 검색 (`GET /api/v1/search`). 도서와 유저를 동시에 검색.
 *
 * 백엔드는 query가 빈 문자열/공백이면 400(`SEARCH_QUERY_REQUIRED`)을 반환하므로
 * 호출부에서 trimmed query가 빈 문자열일 때 호출 자체를 차단해야 한다.
 *
 * 비로그인 접근 허용 — 단, 로그인 시 백엔드가 `SearchHistory`를 자동 저장하고
 * 유저 결과의 `isFollowing`을 정확히 채운다. 비로그인이면 `isFollowing` 항상 false.
 *
 * @param params.query 검색어 (필수, trim 후 호출 권장)
 * @param params.type 'all' | 'book' | 'user' (기본 'all')
 * @param params.cursor 직전 응답의 `nextCursor`. 첫 페이지는 null/undefined
 * @param params.limit 페이지 크기 (기본 20, 최대 50)
 * @param params.signal 요청 취소용 AbortSignal
 */
export async function searchAll({
  query,
  type = 'all',
  cursor,
  limit = 20,
  signal,
}: SearchAllParams): Promise<IntegratedSearchResponse> {
  try {
    const { data } = await apiClient.get<ApiResponse<IntegratedSearchResponse>>('/api/v1/search', {
      params: {
        query,
        type,
        limit,
        ...(cursor != null ? { cursor } : {}),
      },
      signal,
    })
    return parseApiResponse(data, '검색 응답이 올바르지 않습니다.')
  } catch (error) {
    // 통합 검색은 백엔드 알라딘 ISBN 중복 결함으로 409가 발생할 수 있어
    // 도메인 무관 일반 메시지로 치환 (docs/통합_검색_백엔드_결함_보고.md 참고).
    throw normalizeAxiosError(error, '검색에 실패했습니다. 잠시 후 다시 시도해주세요.', {
      suppress409Message: true,
    })
  }
}
