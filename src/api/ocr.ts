import apiClient from './client'
import { type ApiResponse, normalizeAxiosError, parseApiResponse } from './_helpers'

export interface OcrTextField {
  text: string
  lineBreak: boolean
  vertices: { x: number; y: number }[]
}

export interface OcrExtractResponse {
  extractedText: string
  fields: OcrTextField[]
}

/**
 * 이미지에서 텍스트를 추출한다 (CLOVA OCR General V2).
 *
 * @param imageData Base64 인코딩된 이미지 데이터
 * @param imageFormat 이미지 형식 (jpg, png 등)
 * @param signal 요청 취소용 AbortSignal
 * @returns 추출된 전체 텍스트와 블록별 좌표 정보
 */
export async function extractTextFromImage(
  imageData: string,
  imageFormat: string,
  signal?: AbortSignal
): Promise<OcrExtractResponse> {
  try {
    const { data } = await apiClient.post<ApiResponse<OcrExtractResponse>>(
      '/api/v1/ocr/extract-text',
      { imageData, imageFormat },
      { signal }
    )
    return parseApiResponse(data, 'OCR 응답이 올바르지 않습니다.')
  } catch (error) {
    throw normalizeAxiosError(error, '텍스트 추출에 실패했습니다. 다시 시도해주세요.')
  }
}
