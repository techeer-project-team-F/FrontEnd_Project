import apiClient from './client'
import { ApiResponse, normalizeAxiosError, parseApiResponse } from './_helpers'

export interface FeedReviewUser {
  userId: number
  nickname: string
  profileImageUrl: string | null
}

export interface FeedReviewBook {
  bookId: number
  title: string
  author: string
  coverImageUrl: string | null
}

export interface FeedReview {
  reviewId: number
  user: FeedReviewUser
  book: FeedReviewBook
  rating: number
  content: string
  quote: string | null
  isSpoiler: boolean
  likeCount: number
  commentCount: number
  isLiked: boolean
  tags: string[]
  // 서버 LocalDateTime ISO 문자열 (offset 없음). 클라이언트는 로컬 KST로 해석.
  createdAt: string
}

export interface FeedItem {
  feedId: number
  review: FeedReview
}

export interface FeedListResponse {
  content: FeedItem[]
  nextCursor: number | null
  hasNext: boolean
  size: number
}

export interface GetFollowingFeedParams {
  cursor?: number | null
  limit?: number
  signal?: AbortSignal
}

export async function getFollowingFeed({
  cursor,
  limit = 20,
  signal,
}: GetFollowingFeedParams): Promise<FeedListResponse> {
  try {
    const { data } = await apiClient.get<ApiResponse<FeedListResponse>>('/api/v1/feed/following', {
      params: {
        limit,
        ...(cursor != null ? { cursor } : {}),
      },
      signal,
    })
    return parseApiResponse(data, '피드 응답이 올바르지 않습니다.')
  } catch (error) {
    throw normalizeAxiosError(error, '피드를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
  }
}

// ── 추천 피드 ──

export interface RecommendReviewBook {
  bookId: number
  title: string
  author: string
  coverImageUrl: string | null
  category: string | null
}

export interface RecommendItem {
  reviewId: number
  user: FeedReviewUser
  book: RecommendReviewBook
  rating: number
  content: string
  quote: string | null
  isSpoiler: boolean
  likeCount: number
  commentCount: number
  isLiked: boolean
  tags: string[]
  createdAt: string
}

export type RecommendType = 'CONTENT_BASED' | 'SOCIAL' | 'MIXED' | 'POPULAR'

export interface RecommendFeedResponse {
  content: RecommendItem[]
  nextCursorId: number | null
  nextCursorLike: number | null
  hasNext: boolean
  size: number
  recommendType: RecommendType
}

export interface GetRecommendFeedParams {
  cursorLike?: number | null
  cursorId?: number | null
  limit?: number
  signal?: AbortSignal
}

export async function getRecommendFeed({
  cursorLike,
  cursorId,
  limit = 20,
  signal,
}: GetRecommendFeedParams): Promise<RecommendFeedResponse> {
  try {
    const { data } = await apiClient.get<ApiResponse<RecommendFeedResponse>>(
      '/api/v1/feed/recommend',
      {
        params: {
          limit,
          ...(cursorLike != null ? { cursorLike } : {}),
          ...(cursorId != null ? { cursorId } : {}),
        },
        signal,
      }
    )
    return parseApiResponse(data, '추천 피드 응답이 올바르지 않습니다.')
  } catch (error) {
    throw normalizeAxiosError(error, '추천 피드를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
  }
}
