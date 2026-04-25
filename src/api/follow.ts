import apiClient from './client'
import { ApiResponse, normalizeAxiosError } from './_helpers'

export interface FollowResponse {
  followId: number
  followingUserId: number
  followerCount: number
  followingCount: number
}

// 백엔드 명세상 unfollow 응답은 카운트만 반환 (followId/followingUserId 없음)
export interface UnfollowResponse {
  followerCount: number
  followingCount: number
}

// AbortSignal 미지원 유지: POST는 서버 상태를 변경하므로 클라이언트에서 중단해도 서버 반영 여부가 불확실하고
// (실제로 DB 쓰기가 이미 커밋되었을 수 있음), 취소의 실효성이 낮다. 대신 호출측에서 이중 클릭 방지(disabled)로 중복 호출을 막는다.
export async function followUser(userId: number): Promise<FollowResponse> {
  try {
    const { data } = await apiClient.post<ApiResponse<FollowResponse>>(
      `/api/v1/users/${userId}/follow`,
      null
    )
    if (!data.data) {
      throw new Error(data.message ?? '팔로우 응답이 올바르지 않습니다.')
    }
    return data.data
  } catch (error) {
    throw normalizeAxiosError(error, '팔로우에 실패했습니다. 잠시 후 다시 시도해주세요.')
  }
}

// AbortSignal 미지원 유지: DELETE는 서버 상태를 변경하므로 클라이언트에서 중단해도 서버 반영 여부가 불확실하고
// (실제로 DB 삭제가 이미 커밋되었을 수 있음), 취소의 실효성이 낮다. 대신 호출측에서 이중 클릭 방지(disabled)로 중복 호출을 막는다.
export async function unfollowUser(userId: number): Promise<UnfollowResponse> {
  try {
    const { data } = await apiClient.delete<ApiResponse<UnfollowResponse>>(
      `/api/v1/users/${userId}/follow`
    )
    if (!data.data) {
      throw new Error(data.message ?? '언팔로우 응답이 올바르지 않습니다.')
    }
    return data.data
  } catch (error) {
    throw normalizeAxiosError(error, '언팔로우에 실패했습니다. 잠시 후 다시 시도해주세요.')
  }
}
