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
export type ReadingStatus = 'reading' | 'finished' | 'want_to_read' | 'stopped'

// 서재 도서
export interface LibraryBook {
  book: Book
  readingStatus: ReadingStatus
  addedAt: string
}

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
