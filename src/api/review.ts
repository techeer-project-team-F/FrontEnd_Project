import apiClient from './client'
import { ApiResponse, normalizeAxiosError } from './_helpers'

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
