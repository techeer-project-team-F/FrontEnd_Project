import axios from 'axios'
import apiClient from './client'
import { type ApiResponse, normalizeAxiosError, parseApiResponse } from './_helpers'

export type ReportTargetType = 'REVIEW' | 'COMMENT'

export type ReportReason = 'SPOILER' | 'SPAM' | 'INAPPROPRIATE' | 'COPYRIGHT' | 'OTHER'

export interface CreateReportParams {
  targetType: ReportTargetType
  targetId: number
  reason: ReportReason
  description?: string
}

export interface ReportResponse {
  reportId: number
  targetType: ReportTargetType
  targetId: number
  reason: ReportReason
  createdAt: string
}

/**
 * 감상·댓글 신고 API 호출.
 * 백엔드에서 중복 신고(409), 자기 신고, 삭제된 대상 등을 검증하므로
 * 프론트엔드는 최소 가드만 적용하고 서버 응답에 의존한다.
 */
export async function createReport(params: CreateReportParams): Promise<ReportResponse> {
  try {
    const { data } = await apiClient.post<ApiResponse<ReportResponse>>('/api/v1/reports', {
      targetType: params.targetType,
      targetId: params.targetId,
      reason: params.reason,
      ...(params.description?.trim() ? { description: params.description.trim() } : {}),
    })
    return parseApiResponse(data, '신고 접수에 실패했습니다.')
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 409) {
      return {
        reportId: 0,
        targetType: params.targetType,
        targetId: params.targetId,
        reason: params.reason,
        createdAt: new Date().toISOString(),
      }
    }
    throw normalizeAxiosError(error, '신고 접수에 실패했습니다. 잠시 후 다시 시도해주세요.')
  }
}
