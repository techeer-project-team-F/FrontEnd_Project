import apiClient from './client'
import { type ApiResponse, normalizeAxiosError, parseApiResponse } from './_helpers'
import type { BackendReadingStatus } from './book'

export interface CreateReviewRequest {
  bookId: number
  content: string
  rating: number
  quote?: string
  isSpoiler?: boolean
  reviewVisibility: ReviewVisibility
  reviewStatus: ReviewStatus
  tags?: string[]
}

export type UpdateReviewRequest = Omit<CreateReviewRequest, 'bookId'>

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

/**
 * 백엔드 `ReviewVisibility` enum과 1:1 매칭. 공개/비공개 감상을 구분.
 * `findUserReviews` 쿼리는 PUBLIC만 반환하므로 타 유저 응답에는 사실상 PUBLIC만 옴.
 * 반면 `findMyReviews`는 가시성 필터가 없어 본인 감상엔 두 값 모두 등장 가능 → 호출부에서 표시 정책 결정.
 */
export type ReviewVisibility = 'PUBLIC' | 'PRIVATE'

/**
 * 백엔드 `ReviewStatus` enum과 1:1 매칭. 임시저장/발행 상태 구분.
 * `findUserReviews`는 PUBLISHED만, `findMyReviews`는 `status` 쿼리 파라미터로 선택적 필터링.
 */
export type ReviewStatus = 'DRAFT' | 'PUBLISHED'

/**
 * 감상 목록 응답의 단일 아이템 — 백엔드 `ReviewSummaryResponse`와 1:1 매칭.
 *
 * 동료 PR 초안에서 `reviewVisibility`/`reviewStatus`/`isLiked`/`tags` 필드가 누락되어 있어
 * 클라이언트가 가시성/상태/좋아요 상태를 알 수 없는 문제(특히 본인 감상에서 PRIVATE/DRAFT가
 * 섞여 들어옴)를 해결하기 위해 누락분을 모두 노출.
 */
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
  reviewVisibility: ReviewVisibility
  reviewStatus: ReviewStatus
  likeCount: number
  commentCount: number
  isLiked: boolean
  tags: string[]
  createdAt: string
}

export interface GetMyReviewsParams {
  cursor?: number | null
  limit?: number
  status?: ReviewStatus
  signal?: AbortSignal
}

export interface GetUserReviewsParams {
  userId: number
  cursor?: number | null
  limit?: number
  signal?: AbortSignal
}

/**
 * 감상 목록 페이지 크기. 백엔드 default(20)과 동일하게 맞춰 한 가지 단위로 hasNext를 추론한다.
 *
 * 옵션 A로 인해 응답이 페이지 wrapper가 아니므로(컨벤션 미통일 — 후속 백엔드 이슈),
 * 호출부에서 `items.length === REVIEW_PAGE_SIZE`로 hasNext를 추론한다. 마지막 페이지에서
 * 정확히 `REVIEW_PAGE_SIZE`개가 매칭되면 false-positive로 한 번 더 호출되지만, 빈 배열로
 * 자연 종료된다.
 */
export const REVIEW_PAGE_SIZE = 20

/**
 * 새 감상을 작성한다.
 *
 * AbortSignal 미지원: POST는 서버 상태를 변경하므로 클라이언트가 중단해도 서버 반영 여부가
 * 불확실(이미 commit됐을 수 있음). 호출부에서 이중 클릭 방지(disabled)로 중복 호출 차단.
 */
export async function createReview(request: CreateReviewRequest): Promise<CreateReviewResponse> {
  try {
    const { data } = await apiClient.post<ApiResponse<CreateReviewResponse>>(
      '/api/v1/reviews',
      request
    )
    return parseApiResponse(data, '감상 작성 응답이 올바르지 않습니다.')
  } catch (error) {
    throw normalizeAxiosError(error, '감상을 작성하지 못했습니다. 잠시 후 다시 시도해주세요.')
  }
}

/**
 * 내 감상 목록을 커서 기반으로 조회한다 (`GET /api/v1/reviews/me`).
 *
 * 백엔드 응답: `ApiResponse<List<ReviewSummaryResponse>>` (페이지 wrapper 아님 — 옵션 A).
 * `findMyReviews` 쿼리는 가시성(`reviewVisibility`) 필터가 없으므로 PUBLIC/PRIVATE이 함께 옴.
 * `reviewStatus` 필터는 호출부의 `status` 파라미터로 선택 — 발행분만 받으려면 `'PUBLISHED'`
 * 명시 권장 (DRAFT 임시저장 노출 방지).
 *
 * @remarks 후속 백엔드 이슈로 페이지 wrapper 통일 + `findMyReviews`에 PUBLIC 필터 추가
 * 검토 예정 (`docs/리뷰_API_백엔드_wrapper_통일_논의.md`).
 *
 * @param params.cursor 직전 응답 마지막 아이템의 `reviewId`. 첫 페이지면 null/undefined
 * @param params.limit 페이지 크기 (기본 `REVIEW_PAGE_SIZE`)
 * @param params.status `'PUBLISHED'`로 임시저장 제외 등 선택적 필터
 * @param params.signal 요청 취소용 AbortSignal
 */
export async function getMyReviews({
  cursor,
  limit = REVIEW_PAGE_SIZE,
  status,
  signal,
}: GetMyReviewsParams = {}): Promise<ReviewListItem[]> {
  try {
    const { data } = await apiClient.get<ApiResponse<ReviewListItem[]>>('/api/v1/reviews/me', {
      params: {
        limit,
        ...(cursor != null ? { cursor } : {}),
        ...(status ? { status } : {}),
      },
      signal,
    })
    return parseApiResponse(data, '내 감상 목록 응답이 올바르지 않습니다.')
  } catch (error) {
    throw normalizeAxiosError(
      error,
      '내 감상 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
    )
  }
}

/**
 * 타 유저의 감상 목록을 커서 기반으로 조회한다 (`GET /api/v1/members/{userId}/reviews`).
 *
 * 백엔드 `findUserReviews` 쿼리는 `reviewVisibility='PUBLIC' AND reviewStatus='PUBLISHED'`
 * 필터를 적용하므로 응답에 비공개/임시저장은 포함되지 않는다. 응답은 페이지 wrapper가 아닌
 * 단순 배열(옵션 A) — 호출부에서 `items.length === REVIEW_PAGE_SIZE`로 hasNext 추론.
 *
 * @param params.userId 타 유저의 memberUserId
 * @param params.cursor 직전 응답 마지막 아이템의 `reviewId`
 * @param params.limit 페이지 크기 (기본 `REVIEW_PAGE_SIZE`)
 * @param params.signal 요청 취소용 AbortSignal
 */
export async function getUserReviews({
  userId,
  cursor,
  limit = REVIEW_PAGE_SIZE,
  signal,
}: GetUserReviewsParams): Promise<ReviewListItem[]> {
  try {
    const { data } = await apiClient.get<ApiResponse<ReviewListItem[]>>(
      `/api/v1/members/${userId}/reviews`,
      {
        params: {
          limit,
          ...(cursor != null ? { cursor } : {}),
        },
        signal,
      }
    )
    return parseApiResponse(data, '감상 목록 응답이 올바르지 않습니다.')
  } catch (error) {
    throw normalizeAxiosError(error, '감상 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
  }
}

/**
 * 감상 상세를 조회한다 (`GET /api/v1/reviews/{reviewId}`).
 *
 * 비회원도 접근 허용(백엔드 컨트롤러 명세). 본 호출은 axios 기본 인증 헤더가 있으면
 * 자동으로 붙고, 인증 인터셉터가 401만 처리하므로 비회원 분기 별도 처리 불필요.
 */
export async function getReviewDetail(
  reviewId: number,
  signal?: AbortSignal
): Promise<ReviewDetail> {
  try {
    const { data } = await apiClient.get<ApiResponse<ReviewDetail>>(`/api/v1/reviews/${reviewId}`, {
      signal,
    })
    return parseApiResponse(data, '감상 상세 응답이 올바르지 않습니다.')
  } catch (error) {
    throw normalizeAxiosError(error, '감상 상세를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
  }
}

export async function updateReview(reviewId: number, request: UpdateReviewRequest): Promise<void> {
  try {
    await apiClient.put<ApiResponse<unknown>>(`/api/v1/reviews/${reviewId}`, request)
  } catch (error) {
    throw normalizeAxiosError(error, '감상을 수정하지 못했습니다. 잠시 후 다시 시도해주세요.')
  }
}

export async function deleteReview(reviewId: number): Promise<void> {
  try {
    await apiClient.delete<ApiResponse<unknown>>(`/api/v1/reviews/${reviewId}`)
  } catch (error) {
    throw normalizeAxiosError(error, '감상을 삭제하지 못했습니다. 잠시 후 다시 시도해주세요.')
  }
}

export interface ReviewLikeResponse {
  reviewId: number
  likeCount: number
}

/**
 * 감상에 좋아요를 누른다.
 *
 * 본인 감상이면 400 `SELF_LIKE_NOT_ALLOWED`, 이미 좋아요면 409 `ALREADY_REVIEW_LIKED`.
 * UI에서 본인 감상 좋아요 버튼을 미노출해 사전 차단하지만 백엔드도 방어.
 */
export async function likeReview(reviewId: number): Promise<ReviewLikeResponse> {
  try {
    const { data } = await apiClient.post<ApiResponse<ReviewLikeResponse>>(
      `/api/v1/reviews/${reviewId}/likes`
    )
    return parseApiResponse(data, '좋아요 응답이 올바르지 않습니다.')
  } catch (error) {
    throw normalizeAxiosError(error, '좋아요에 실패했습니다.')
  }
}

/**
 * 감상 좋아요를 취소한다.
 *
 * 좋아요 기록이 없으면 404 `REVIEW_LIKE_NOT_FOUND`.
 */
export async function unlikeReview(reviewId: number): Promise<ReviewLikeResponse> {
  try {
    const { data } = await apiClient.delete<ApiResponse<ReviewLikeResponse>>(
      `/api/v1/reviews/${reviewId}/likes`
    )
    return parseApiResponse(data, '좋아요 취소 응답이 올바르지 않습니다.')
  } catch (error) {
    throw normalizeAxiosError(error, '좋아요 취소에 실패했습니다.')
  }
}
