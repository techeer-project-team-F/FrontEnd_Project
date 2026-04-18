import axios from 'axios'

export interface ApiResponse<T> {
  status: 'SUCCESS' | 'ERROR'
  code: number
  message?: string
  data?: T
  errors?: Array<{ field: string; message: string }>
}

/**
 * Axios 에러를 한국어 메시지의 일반 Error로 정규화한다.
 * 취소 에러(CanceledError / AbortError)는 원본 그대로 rethrow하여
 * 호출자가 `axios.isCancel`로 분기할 수 있게 한다.
 */
export function normalizeAxiosError(error: unknown, fallback: string): Error {
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
