import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * ISO 문자열 또는 Date를 한국어 상대 시간으로 변환한다.
 * 7일 이상은 절대 날짜(YYYY.MM.DD)로 표기.
 * invalid 입력은 빈 문자열 반환.
 *
 * 백엔드 LocalDateTime은 offset 없는 ISO("2026-04-26T17:10:45")로 직렬화되어
 * 브라우저에서 로컬 타임존으로 해석된다. 서버/클라가 모두 KST이면 일치.
 */
export function formatRelativeTime(input: string | Date): string {
  const date = typeof input === 'string' ? new Date(input) : input
  if (Number.isNaN(date.getTime())) return ''

  // 서버/클라 시계 어긋남으로 미래 시각이 들어와도 "방금 전"으로 흡수 (Math.max로 의도 명시)
  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000))
  if (diffSec < 60) return '방금 전'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분 전`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간 전`
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}일 전`

  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}.${m}.${d}`
}
