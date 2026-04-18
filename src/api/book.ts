import apiClient from './client'
import { ApiResponse, normalizeAxiosError } from './_helpers'

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

export async function searchBooks(
  query: string,
  limit = 20,
  cursor?: number | null,
  signal?: AbortSignal
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
        signal,
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
