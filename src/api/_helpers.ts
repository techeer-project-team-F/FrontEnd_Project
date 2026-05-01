import axios from 'axios'

export interface ApiResponse<T> {
  status: 'SUCCESS' | 'ERROR'
  code: number
  message?: string
  data?: T
  errors?: Array<{ field: string; message: string }>
}

/**
 * 백엔드 `ApiResponse<T>` 응답에서 `data` 필드를 안전하게 꺼낸다.
 *
 * `data`가 누락되어 있으면 백엔드 `message`(있으면)를, 없으면 `fallback`을 사용해
 * 일반 `Error`를 던진다. 호출부의 `if (!data.data) throw ...; return data.data`
 * 보일러플레이트를 일원화한다.
 *
 * @remarks 후속 cleanup 이슈에서 다른 api/*.ts 모듈도 본 헬퍼로 점진 마이그레이션 예정.
 */
export function parseApiResponse<T>(response: ApiResponse<T>, fallback: string): T {
  if (response.data === undefined || response.data === null) {
    throw new Error(response.message ?? fallback)
  }
  return response.data
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
