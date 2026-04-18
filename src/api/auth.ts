import apiClient from './client'
import { ApiResponse, normalizeAxiosError } from './_helpers'

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginUserInfo {
  userId: number
  email: string
  nickname: string
  profileImageUrl: string | null
  bio: string | null
  emailVerified: boolean
  onboardingCompleted: boolean
}

export interface LoginResponse {
  accessToken: string
  accessTokenExpiresIn: number
  user: LoginUserInfo
}

export interface SignupRequest {
  email: string
  password: string
  nickname: string
  bio?: string
}

export interface SignupUserInfo {
  userId: number
  email: string
  nickname: string
  bio: string | null
  emailVerified: boolean
}

export interface SignupResponse {
  accessToken: string
  accessTokenExpiresIn: number
  user: SignupUserInfo
}

export interface CheckAvailabilityResponse {
  available: boolean
}

export interface OAuthLoginUrlResponse {
  loginUrl: string
}

export interface GoogleLoginUserInfo {
  userId: number
  email: string
  nickname: string
  profileImageUrl: string | null
  emailVerified: boolean
  onboardingCompleted: boolean
}

export interface GoogleLoginResponse {
  accessToken: string
  accessTokenExpiresIn: number
  isNewUser: boolean
  user: GoogleLoginUserInfo
}

export async function login(request: LoginRequest): Promise<LoginResponse> {
  try {
    const { data } = await apiClient.post<ApiResponse<LoginResponse>>('/api/v1/auth/login', request)
    if (!data.data) {
      throw new Error(data.message ?? '로그인 응답이 올바르지 않습니다.')
    }
    return data.data
  } catch (error) {
    throw normalizeAxiosError(error, '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.')
  }
}

export async function signup(request: SignupRequest): Promise<SignupResponse> {
  try {
    const { data } = await apiClient.post<ApiResponse<SignupResponse>>(
      '/api/v1/auth/signup',
      request
    )
    if (!data.data) {
      throw new Error(data.message ?? '회원가입 응답이 올바르지 않습니다.')
    }
    return data.data
  } catch (error) {
    throw normalizeAxiosError(error, '회원가입에 실패했습니다. 잠시 후 다시 시도해주세요.')
  }
}

export async function checkNickname(nickname: string): Promise<CheckAvailabilityResponse> {
  try {
    const { data } = await apiClient.get<ApiResponse<CheckAvailabilityResponse>>(
      '/api/v1/auth/check-nickname',
      { params: { nickname } }
    )
    if (!data.data) {
      throw new Error(data.message ?? '닉네임 확인 응답이 올바르지 않습니다.')
    }
    return data.data
  } catch (error) {
    throw normalizeAxiosError(error, '닉네임 확인에 실패했습니다. 잠시 후 다시 시도해주세요.')
  }
}

export async function checkEmail(email: string): Promise<CheckAvailabilityResponse> {
  try {
    const { data } = await apiClient.get<ApiResponse<CheckAvailabilityResponse>>(
      '/api/v1/auth/check-email',
      { params: { email } }
    )
    if (!data.data) {
      throw new Error(data.message ?? '이메일 확인 응답이 올바르지 않습니다.')
    }
    return data.data
  } catch (error) {
    throw normalizeAxiosError(error, '이메일 확인에 실패했습니다. 잠시 후 다시 시도해주세요.')
  }
}

export async function getGoogleLoginUrl(): Promise<OAuthLoginUrlResponse> {
  try {
    const { data } = await apiClient.get<ApiResponse<OAuthLoginUrlResponse>>(
      '/api/v1/auth/oauth2/google'
    )
    if (!data.data) {
      throw new Error(data.message ?? 'Google 로그인 URL 응답이 올바르지 않습니다.')
    }
    return data.data
  } catch (error) {
    throw normalizeAxiosError(
      error,
      'Google 로그인 URL을 받아오지 못했습니다. 잠시 후 다시 시도해주세요.'
    )
  }
}

export async function requestPasswordReset(email: string): Promise<void> {
  try {
    await apiClient.post('/api/v1/auth/password/reset-request', { email })
  } catch (error) {
    throw normalizeAxiosError(
      error,
      '비밀번호 재설정 요청에 실패했습니다. 잠시 후 다시 시도해주세요.'
    )
  }
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  try {
    await apiClient.post('/api/v1/auth/password/reset', { token, newPassword })
  } catch (error) {
    throw normalizeAxiosError(error, '비밀번호 변경에 실패했습니다. 잠시 후 다시 시도해주세요.')
  }
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/api/v1/auth/logout')
  } catch (error) {
    throw normalizeAxiosError(error, '로그아웃에 실패했습니다. 잠시 후 다시 시도해주세요.')
  }
}

export async function googleLogin(code: string, redirectUri: string): Promise<GoogleLoginResponse> {
  try {
    const { data } = await apiClient.post<ApiResponse<GoogleLoginResponse>>(
      '/api/v1/auth/oauth2/google/login',
      { code, redirectUri }
    )
    if (!data.data) {
      throw new Error(data.message ?? 'Google 로그인 응답이 올바르지 않습니다.')
    }
    return data.data
  } catch (error) {
    throw normalizeAxiosError(error, 'Google 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.')
  }
}
