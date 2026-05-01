import apiClient from './client'
import { type ApiResponse, normalizeAxiosError } from './_helpers'

/**
 * 백엔드 `NotificationType` enum과 1:1 매칭되는 문자열 리터럴 유니온.
 *
 * - `REVIEW_LIKE`: 내 감상에 좋아요 (target: reviewId)
 * - `COMMENT`: 내 감상에 댓글 (target: reviewId + commentId)
 * - `COMMENT_LIKE`: 내 댓글에 좋아요 (target: reviewId + commentId)
 * - `FOLLOW`: 나를 팔로우 (target: actor.userId)
 * - `SYSTEM`: 시스템 메시지 (actor 없음, 이동 없음)
 */
export type NotificationType = 'REVIEW_LIKE' | 'COMMENT' | 'COMMENT_LIKE' | 'FOLLOW' | 'SYSTEM'

export interface NotificationActor {
  userId: number
  nickname: string
  profileImageUrl: string | null
}

export interface NotificationItem {
  notificationId: number
  type: NotificationType
  message: string | null
  isRead: boolean
  actor: NotificationActor | null
  reviewId: number | null
  commentId: number | null
  followId: number | null
  createdAt: string
}

export interface NotificationListResponse {
  content: NotificationItem[]
  nextCursor: string | null
  hasNext: boolean
  size: number
}

export interface UnreadCountResponse {
  unreadCount: number
}

/**
 * 내 알림 목록을 커서 기반으로 조회한다.
 *
 * 백엔드는 `notificationId DESC` 정렬에 cursor 미만 항목을 반환하므로 첫 페이지는
 * cursor 미지정, 다음 페이지는 직전 응답의 `nextCursor`를 그대로 전달하면 된다.
 *
 * @param cursor 직전 응답의 `nextCursor`. 첫 페이지면 null/undefined
 * @param limit 페이지 크기 (기본 20)
 * @param signal 요청 취소용 AbortSignal
 */
export async function getNotifications(
  cursor?: string | null,
  limit = 20,
  signal?: AbortSignal
): Promise<NotificationListResponse> {
  try {
    const { data } = await apiClient.get<ApiResponse<NotificationListResponse>>(
      '/api/v1/notifications',
      {
        params: {
          limit,
          // [code-review NIT fix] 빈 문자열 cursor도 명시적으로 누락하도록 != null 사용
          ...(cursor != null && cursor !== '' ? { cursor } : {}),
        },
        signal,
      }
    )
    if (!data.data) {
      throw new Error(data.message ?? '알림 목록 응답이 올바르지 않습니다.')
    }
    return data.data
  } catch (error) {
    throw normalizeAxiosError(error, '알림을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
  }
}

/**
 * 단일 알림을 읽음 처리한다.
 *
 * 본인 소유가 아닌 알림이면 백엔드에서 403(FORBIDDEN), 존재하지 않으면 404를
 * 반환한다. 멱등이지만 호출자가 낙관적 업데이트 후 실패 시 롤백할 수 있도록
 * 에러는 그대로 전파한다.
 */
export async function markNotificationAsRead(
  notificationId: number,
  signal?: AbortSignal
): Promise<void> {
  try {
    await apiClient.patch<ApiResponse<void>>(
      `/api/v1/notifications/${notificationId}/read`,
      undefined,
      { signal }
    )
  } catch (error) {
    throw normalizeAxiosError(error, '알림 읽음 처리에 실패했습니다. 잠시 후 다시 시도해주세요.')
  }
}

/**
 * 미읽음 알림 개수를 조회한다.
 *
 * @remarks HomeFeedPage 종 아이콘 뱃지에서 사용 예정 (후속 이슈).
 */
export async function getUnreadNotificationCount(
  signal?: AbortSignal
): Promise<UnreadCountResponse> {
  try {
    const { data } = await apiClient.get<ApiResponse<UnreadCountResponse>>(
      '/api/v1/notifications/unread-count',
      { signal }
    )
    if (!data.data) {
      throw new Error(data.message ?? '미읽음 개수 응답이 올바르지 않습니다.')
    }
    return data.data
  } catch (error) {
    throw normalizeAxiosError(error, '미읽음 알림 수를 불러오지 못했습니다.')
  }
}
