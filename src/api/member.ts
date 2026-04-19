import apiClient from './client'
import { ApiResponse, normalizeAxiosError } from './_helpers'

export type LibraryVisibility = 'PUBLIC' | 'PRIVATE'

export interface MyProfile {
  userId: number
  email: string
  nickname: string
  profileImageUrl: string | null
  bio: string | null
  libraryVisibility: LibraryVisibility
  emailVerified: boolean
  onboardingCompleted: boolean
  followerCount: number
  followingCount: number
  reviewCount: number
}

export async function getMyProfile(signal?: AbortSignal): Promise<MyProfile> {
  try {
    const { data } = await apiClient.get<ApiResponse<MyProfile>>('/api/v1/users/me', { signal })
    if (!data.data) {
      throw new Error(data.message ?? '프로필 조회 응답이 올바르지 않습니다.')
    }
    return data.data
  } catch (error) {
    throw normalizeAxiosError(error, '프로필을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  try {
    await apiClient.put('/api/v1/users/me/password', { currentPassword, newPassword })
  } catch (error) {
    throw normalizeAxiosError(error, '비밀번호 변경에 실패했습니다. 잠시 후 다시 시도해주세요.')
  }
}
