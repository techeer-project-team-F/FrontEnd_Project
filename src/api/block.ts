import apiClient from './client'
import { ApiResponse, normalizeAxiosError, parseApiResponse } from './_helpers'

export interface BlockedUser {
  userId: number
  nickname: string
  profileImageUrl: string | null
  blockedAt: string
}

export interface BlockListResponse {
  content: BlockedUser[]
  nextCursor: number | null
  hasNext: boolean
  size: number
}

/**
 * 차단 목록 조회. cursor 기반 페이지네이션.
 * 백엔드 `FollowController.getBlockList` → `GET /api/v1/users/me/blocks`
 */
export async function getBlockedUsers(options?: {
  cursor?: number | null
  limit?: number
  signal?: AbortSignal
}): Promise<BlockListResponse> {
  const { cursor, limit = 20, signal } = options ?? {}
  try {
    const { data } = await apiClient.get<ApiResponse<BlockListResponse>>(
      '/api/v1/users/me/blocks',
      {
        params: {
          limit,
          ...(cursor != null ? { cursor } : {}),
        },
        signal,
      }
    )
    return parseApiResponse(data, '차단 목록 응답이 올바르지 않습니다.')
  } catch (error) {
    throw normalizeAxiosError(error, '차단 목록을 불러오지 못했습니다.')
  }
}

/**
 * 사용자 차단. 양방향 팔로우 해제 + 피드 삭제가 백엔드에서 함께 처리됨.
 */
export async function blockUser(userId: number): Promise<void> {
  try {
    await apiClient.post(`/api/v1/users/${userId}/block`)
  } catch (error) {
    throw normalizeAxiosError(error, '차단에 실패했습니다.')
  }
}

/**
 * 사용자 차단 해제.
 */
export async function unblockUser(userId: number): Promise<void> {
  try {
    await apiClient.delete(`/api/v1/users/${userId}/block`)
  } catch (error) {
    throw normalizeAxiosError(error, '차단 해제에 실패했습니다.')
  }
}
