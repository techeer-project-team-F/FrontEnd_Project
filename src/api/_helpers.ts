import axios from 'axios'

export interface ApiResponse<T> {
  status: 'SUCCESS' | 'ERROR'
  code: number
  message?: string
  data?: T
  errors?: Array<{ field: string; message: string }>
}

export function normalizeAxiosError(error: unknown, fallback: string): Error {
  // AbortController에 의한 취소는 원본 그대로 전파 (호출자에서 axios.isCancel로 분기)
  if (axios.isCancel(error) || (error instanceof DOMException && error.name === 'AbortError')) {
    throw error
  }
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
