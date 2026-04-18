import axios from 'axios'
import apiClient from './client'

export interface BookSummary {
  bookId: number
  isbn13: string
  title: string
  author: string
  publisher: string
  coverImageUrl: string | null
  publishedDate: string | null
  inMyLibrary: boolean
}

export interface BookSearchListResponse {
  content: BookSummary[]
  nextCursor: number | null
  hasNext: boolean
  size: number
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

export async function searchBooks(
  query: string,
  limit = 20,
  cursor?: number | null
): Promise<BookSearchListResponse> {
  try {
    const { data } = await apiClient.get<ApiResponse<BookSearchListResponse>>(
      '/api/v1/books/search',
      {
        params: {
          query,
          limit,
          ...(cursor != null ? { cursor } : {}),
        },
      }
    )
    if (!data.data) {
      throw new Error(data.message ?? '도서 검색 응답이 올바르지 않습니다.')
    }
    return data.data
  } catch (error) {
    throw normalizeAxiosError(error, '도서 검색에 실패했습니다. 잠시 후 다시 시도해주세요.')
  }
}
