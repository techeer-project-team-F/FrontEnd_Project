import axios from 'axios'

export interface ApiResponse<T> {
  status: 'SUCCESS' | 'ERROR'
  code: number
  // 백엔드 도메인 에러코드(예: 'M001'). 비즈니스 예외 응답에만 포함된다(성공/일반 에러엔 없음).
  // 메시지 문구가 아닌 이 코드로 에러를 분기하기 위해 사용.
  errorCode?: string
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
  // HTTP 200 + status:'ERROR' 조합(백엔드 비즈니스 에러)을 data 체크 전에 먼저 차단한다.
  // 이 가드 없이는 data가 우연히 채워진 경우 에러가 누수될 수 있다.
  if (response.status === 'ERROR') {
    throw new Error(response.message ?? fallback)
  }
  if (response.data === undefined || response.data === null) {
    throw new Error(response.message ?? fallback)
  }
  return response.data
}

/**
 * Axios 에러를 한국어 메시지의 일반 Error로 정규화한다.
 * 취소 에러(CanceledError / AbortError)는 원본 그대로 rethrow하여
 * 호출자가 `axios.isCancel`로 분기할 수 있게 한다.
 *
 * **409 임시 회피 (옵트인)** (`docs/통합_검색_백엔드_결함_보고.md` 참고):
 * 백엔드의 `GlobalExceptionHandler.handleDataIntegrityViolation`이 모든
 * `DataIntegrityViolationException`을 "이미 존재하는 데이터입니다." 메시지로
 * 일괄 응답하는 구조라, read 시나리오(예: 도서 검색)에서도 알라딘 응답 ISBN
 * 중복으로 인한 unique 위반이 사용자에게 그대로 노출된다.
 *
 * 단, 다른 도메인(예: 서재 추가의 정상 conflict)은 409가 의미 있는 응답이라
 * 전역 override가 부적절. `options.suppress409Message: true`로 호출하는
 * 검색 도메인에서만 일반 메시지로 변환하고, 미지정 시 기존 분기(apiMessage
 * 우선)로 fallthrough해 도메인 메시지를 보존한다.
 */
export interface NormalizeAxiosErrorOptions {
  /** 409 응답을 도메인 무관 일반 메시지로 치환 (검색 도메인 전용 회피) */
  suppress409Message?: boolean
}

export function normalizeAxiosError(
  error: unknown,
  fallback: string,
  options?: NormalizeAxiosErrorOptions
): Error {
  if (axios.isCancel(error) || (error instanceof DOMException && error.name === 'AbortError')) {
    throw error
  }
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    if (status === 409 && options?.suppress409Message) {
      return new Error('일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    }
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
