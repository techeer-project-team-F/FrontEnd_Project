// 공통 API 응답 타입
export interface ApiResponse<T> {
  data: T
  message: string
  status: number
}

// 페이지네이션
export interface PageResponse<T> {
  content: T[]
  hasNext: boolean
  nextCursor?: string
}

// 유저
export interface User {
  id: number
  nickname: string
  profileImageUrl?: string
  followerCount: number
  followingCount: number
}

// 도서
export interface Book {
  isbn: string
  title: string
  author: string
  publisher: string
  coverImageUrl: string
  description?: string
  pageCount?: number
  rating?: number
  reviewCount?: number
}

// 알림
export type NotificationType = 'like' | 'comment' | 'follow' | 'new_review'

export interface Notification {
  id: number
  type: NotificationType
  senderNickname: string
  senderProfileImageUrl?: string
  message: string
  isRead: boolean
  createdAt: string
  bookTitle?: string
}

// 읽기 상태
export type ReadingStatus = 'reading' | 'finished' | 'want_to_read'

// 감상 (메모)
export interface Memo {
  id: number
  content: string
  book: Book
  author: User
  likeCount: number
  isLiked: boolean
  createdAt: string
  rating?: number
  readingStatus?: ReadingStatus
  hasSpoiler?: boolean
  commentCount?: number
}
