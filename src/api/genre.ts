import apiClient from './client'
import { ApiResponse, normalizeAxiosError, parseApiResponse } from './_helpers'

export interface Genre {
  genreId: number
  name: string
}

export interface GenreListResponse {
  genres: Genre[]
}

export interface OnboardingRequest {
  nickname: string
  genreIds: number[]
  bio?: string
  profileImageUrl?: string
}

export interface OnboardingResponse {
  userId: number
  nickname: string
  profileImageUrl: string | null
  bio: string | null
  onboardingCompleted: boolean
  genres: Genre[]
}

/**
 * 전체 장르 목록 조회. 온보딩 장르 선택 UI에서 사용.
 * 백엔드 `genres` 테이블의 전체 목록을 반환한다.
 */
export async function getGenres(signal?: AbortSignal): Promise<Genre[]> {
  try {
    const { data } = await apiClient.get<ApiResponse<GenreListResponse>>('/api/v1/genres', {
      signal,
    })
    const result = parseApiResponse(data, '장르 목록 응답이 올바르지 않습니다.')
    return result.genres
  } catch (error) {
    throw normalizeAxiosError(error, '장르 목록을 불러오지 못했습니다.')
  }
}

/**
 * 온보딩 완료. nickname과 genreIds를 백엔드에 전달하여 프로필+장르를 한 번에 설정.
 * 성공 시 백엔드가 `member.onboardingCompleted = true`로 갱신.
 */
export async function completeOnboarding(
  request: OnboardingRequest,
  signal?: AbortSignal
): Promise<OnboardingResponse> {
  try {
    const { data } = await apiClient.post<ApiResponse<OnboardingResponse>>(
      '/api/v1/users/me/onboarding',
      request,
      { signal }
    )
    return parseApiResponse(data, '온보딩 완료 응답이 올바르지 않습니다.')
  } catch (error) {
    throw normalizeAxiosError(error, '온보딩 완료에 실패했습니다.')
  }
}
