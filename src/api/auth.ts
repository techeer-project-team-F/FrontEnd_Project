import axios from 'axios'
import apiClient from './client'

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginUserInfo {
  userId: number
  email: string
  nickname: string
  profileImageUrl: string | null
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
}

export interface SignupUserInfo {
  userId: number
  email: string
  nickname: string
  emailVerified: boolean
}

export interface SignupResponse {
  accessToken: string
  accessTokenExpiresIn: number
  user: SignupUserInfo
}

export interface CheckEmailResponse {
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

interface ApiResponse<T> {
  status: 'SUCCESS' | 'ERROR'
  code: number
  message?: string
  data?: T
  errors?: Array<{ field: string; message: string }>
}

function normalizeAxiosError(error: unknown, fallback: string): Error {
  if (axios.isAxiosError(error)) {
    const apiMessage = error.response?.data?.message
    if (apiMessage) return new Error(apiMessage)
    if (error.code === 'ECONNABORTED') {
      return new Error('요청 시간이 초과되었습니다. 다시 시도해주세요.')
    }
    if (!error.response) {
      return new Error('서버에 연결할 수 없습니다. 백엔드 서버 상태를 확인해주세요.')
    }
    return new Error(fallback)
  }
  return error instanceof Error ? error : new Error(fallback)
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

export async function checkEmail(email: string): Promise<CheckEmailResponse> {
  try {
    const { data } = await apiClient.get<ApiResponse<CheckEmailResponse>>(
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
