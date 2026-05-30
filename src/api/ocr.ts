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
    const result = parseApiResponse(data, 'OCR 응답이 올바르지 않습니다.')
    // OcrTextSelector가 result.fields[].vertices로 좌표를 계산하므로,
    // fields가 배열이 아니거나 vertices가 누락되면 런타임 크래시가 발생한다.
    // parseApiResponse 통과 후 구조를 한 번 더 방어해 안전한 객체를 반환한다.
    if (!Array.isArray(result.fields)) {
      throw new Error('OCR 응답이 올바르지 않습니다.')
    }
    return {
      ...result,
      // 각 field가 객체가 아니거나 vertices가 배열이 아닐 수 있으므로 정규화 — null 접근 크래시 방지
      fields: result.fields.map((f): OcrTextField => {
        const field = (typeof f === 'object' && f !== null ? f : {}) as OcrTextField
        return { ...field, vertices: Array.isArray(field.vertices) ? field.vertices : [] }
      }),
    }
  } catch (error) {
    throw normalizeAxiosError(error, '텍스트 추출에 실패했습니다. 다시 시도해주세요.')
  }
}
