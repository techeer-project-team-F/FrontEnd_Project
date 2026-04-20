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

export interface UpdateProfileRequest {
  nickname?: string
  profileImageUrl?: string
  bio?: string
}

export interface UpdateProfileResponse {
  userId: number
  nickname: string
  profileImageUrl: string | null
  bio: string | null
  libraryVisibility: LibraryVisibility
}

export async function updateProfile(data: UpdateProfileRequest): Promise<UpdateProfileResponse> {
  try {
    const res = await apiClient.patch<ApiResponse<UpdateProfileResponse>>('/api/v1/users/me', data)
    if (!res.data.data) {
      throw new Error(res.data.message ?? '프로필 수정 응답이 올바르지 않습니다.')
    }
    return res.data.data
  } catch (error) {
    throw normalizeAxiosError(error, '프로필 수정에 실패했습니다. 잠시 후 다시 시도해주세요.')
  }
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  try {
    await apiClient.put('/api/v1/users/me/password', { currentPassword, newPassword })
  } catch (error) {
    throw normalizeAxiosError(error, '비밀번호 변경에 실패했습니다. 잠시 후 다시 시도해주세요.')
  }
}

export async function withdrawAccount(password: string, reason?: string): Promise<void> {
  try {
    await apiClient.delete('/api/v1/users/me', {
      data: { password, ...(reason ? { reason } : {}) },
    })
  } catch (error) {
    throw normalizeAxiosError(error, '회원 탈퇴에 실패했습니다. 잠시 후 다시 시도해주세요.')
  }
}
