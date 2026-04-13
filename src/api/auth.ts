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

interface ApiResponse<T> {
  status: 'SUCCESS' | 'ERROR'
  code: number
  message?: string
  data?: T
  errors?: Array<{ field: string; message: string }>
}

export async function login(request: LoginRequest): Promise<LoginResponse> {
  try {
    const { data } = await apiClient.post<ApiResponse<LoginResponse>>('/api/v1/auth/login', request)
    if (!data.data) {
      throw new Error(data.message ?? '로그인 응답이 올바르지 않습니다.')
    }
    return data.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const apiMessage = error.response?.data?.message
      if (apiMessage) throw new Error(apiMessage)
      if (error.code === 'ECONNABORTED') {
        throw new Error('요청 시간이 초과되었습니다. 다시 시도해주세요.')
      }
      if (!error.response) {
        throw new Error('서버에 연결할 수 없습니다. 백엔드 서버 상태를 확인해주세요.')
      }
      throw new Error('로그인에 실패했습니다. 잠시 후 다시 시도해주세요.')
    }
    throw error
  }
}
