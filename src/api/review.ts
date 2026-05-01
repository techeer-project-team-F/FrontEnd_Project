import apiClient from './client'
import { ApiResponse, normalizeAxiosError } from './_helpers'
import type { BackendReadingStatus } from './book'

export interface CreateReviewRequest {
  bookId: number
  content: string
  rating: number
  quote?: string
  isSpoiler?: boolean
}

export interface CreateReviewResponse {
  reviewId: number
}

export interface ReviewDetail {
  reviewId: number
  user: {
    userId: number
    nickname: string
    profileImageUrl: string | null
  }
  book: {
    bookId: number
    isbn13?: string
    title: string
    author: string
    publisher?: string | null
    coverImageUrl: string | null
    description?: string | null
  }
  rating: number
  content: string
  quote: string | null
  isSpoiler: boolean
  likeCount: number
  commentCount: number
  isLiked: boolean
  tags?: string[]
  readingStatus?: BackendReadingStatus | null
  createdAt: string
}

export interface ReviewListItem {
  reviewId: number
  book: {
    bookId: number
    title: string
    author: string
    coverImageUrl: string | null
  }
  rating: number
  content: string
  quote: string | null
  isSpoiler: boolean
  likeCount: number
  commentCount: number
  createdAt: string
}

export interface ReviewListResponse {
  content: ReviewListItem[]
  nextCursor: number | null
  hasNext: boolean
  size: number
}

export interface GetReviewListParams {
  cursor?: number | null
  limit?: number
  signal?: AbortSignal
}

export async function createReview(request: CreateReviewRequest): Promise<CreateReviewResponse> {
  try {
    const { data } = await apiClient.post<ApiResponse<CreateReviewResponse>>(
      '/api/v1/reviews',
      request
    )

    if (!data.data) {
      throw new Error(data.message ?? '감상 작성 응답이 올바르지 않습니다.')
    }

    return data.data
  } catch (error) {
    throw normalizeAxiosError(error, '감상을 작성하지 못했습니다. 잠시 후 다시 시도해주세요.')
  }
}

export async function getMyReviews({
  cursor,
  limit = 10,
  signal,
}: GetReviewListParams = {}): Promise<ReviewListResponse> {
  try {
    const { data } = await apiClient.get<ApiResponse<ReviewListResponse>>('/api/v1/me/reviews', {
      params: {
        limit,
        ...(cursor != null ? { cursor } : {}),
      },
      signal,
    })

    if (!data.data) {
      throw new Error(data.message ?? '내 감상 목록 응답이 올바르지 않습니다.')
    }

    return data.data
  } catch (error) {
    throw normalizeAxiosError(
      error,
      '내 감상 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
    )
  }
}

export async function getUserReviews({
  userId,
  cursor,
  limit = 10,
  signal,
}: GetReviewListParams & { userId: number }): Promise<ReviewListResponse> {
  try {
    const { data } = await apiClient.get<ApiResponse<ReviewListResponse>>(
      `/api/v1/${userId}/reviews`,
      {
        params: {
          limit,
          ...(cursor != null ? { cursor } : {}),
        },
        signal,
      }
    )

    if (!data.data) {
      throw new Error(data.message ?? '감상 목록 응답이 올바르지 않습니다.')
    }

    return data.data
  } catch (error) {
    throw normalizeAxiosError(error, '감상 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
  }
}

export async function getReviewDetail(
  reviewId: number,
  signal?: AbortSignal
): Promise<ReviewDetail> {
  try {
    const { data } = await apiClient.get<ApiResponse<ReviewDetail>>(`/api/v1/reviews/${reviewId}`, {
      signal,
    })

    if (!data.data) {
      throw new Error(data.message ?? '감상 상세 응답이 올바르지 않습니다.')
    }

    return data.data
  } catch (error) {
    throw normalizeAxiosError(error, '감상 상세를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
  }
}
