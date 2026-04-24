import apiClient from './client'
import { ApiResponse, normalizeAxiosError } from './_helpers'
import type { BackendReadingStatus } from './book'
import type { ReadingStatus } from '@/types'

export const frontToBackendStatus: Record<ReadingStatus, BackendReadingStatus> = {
  want_to_read: 'WANT_TO_READ',
  reading: 'READING',
  finished: 'FINISHED',
  stopped: 'STOPPED',
}

export const backendToFrontStatus: Record<BackendReadingStatus, ReadingStatus> = {
  WANT_TO_READ: 'want_to_read',
  READING: 'reading',
  FINISHED: 'finished',
  STOPPED: 'stopped',
}

export interface LibraryBookAddResponse {
  libraryBookId: number
  bookId: number
  status: BackendReadingStatus
  startedAt: string | null
  finishedAt: string | null
}

export interface LibraryBookSummary {
  libraryBookId: number
  book: {
    bookId: number
    isbn13: string
    title: string
    author: string
    coverImageUrl: string | null
  }
  status: BackendReadingStatus
  startedAt: string | null
  finishedAt: string | null
  hasReview: boolean
}

export interface LibraryListResponse {
  content: LibraryBookSummary[]
  nextCursor: number | null
  hasNext: boolean
  size: number
}

export interface GetMyLibraryParams {
  status?: ReadingStatus
  cursor?: number | null
  limit?: number
  signal?: AbortSignal
}

export async function getMyLibrary({
  status,
  cursor,
  limit = 20,
  signal,
}: GetMyLibraryParams = {}): Promise<LibraryListResponse> {
  try {
    const { data } = await apiClient.get<ApiResponse<LibraryListResponse>>('/api/v1/library/me', {
      params: {
        limit,
        ...(status ? { status: frontToBackendStatus[status] } : {}),
        ...(cursor != null ? { cursor } : {}),
      },
      signal,
    })
    if (!data.data) {
      throw new Error(data.message ?? '서재 목록 응답이 올바르지 않습니다.')
    }
    return data.data
  } catch (error) {
    throw normalizeAxiosError(error, '서재 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
  }
}

// AbortSignal 미지원 유지: POST는 서버 상태를 변경하므로 클라이언트에서 중단해도 서버 반영 여부가 불확실하고
// (실제로 DB 쓰기가 이미 커밋되었을 수 있음), 취소의 실효성이 낮다. 대신 호출측에서 이중 클릭 방지(disabled)로 중복 호출을 막는다.
export async function addLibraryBook(
  bookId: number,
  status: ReadingStatus
): Promise<LibraryBookAddResponse> {
  try {
    const { data } = await apiClient.post<ApiResponse<LibraryBookAddResponse>>('/api/v1/library', {
      bookId,
      status: frontToBackendStatus[status],
    })
    if (!data.data) {
      throw new Error(data.message ?? '서재 추가 응답이 올바르지 않습니다.')
    }
    return data.data
  } catch (error) {
    throw normalizeAxiosError(
      error,
      '서재에 도서를 추가하지 못했습니다. 잠시 후 다시 시도해주세요.'
    )
  }
}
