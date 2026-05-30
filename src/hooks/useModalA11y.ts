import { useEffect, type RefObject } from 'react'

interface UseModalA11yOptions {
  isOpen: boolean
  onClose: () => void
  isBlocked?: boolean
  initialFocusRef?: RefObject<HTMLElement | null>
}

/**
 * 모달/바텀시트 공통 접근성 동작.
 *
 * - 열렸을 때 body 스크롤 잠금(배경 스크롤 누출 방지), 닫힐 때 원복
 * - Escape 키로 onClose 호출 (isBlocked면 무시 — 저장/로딩 중 닫힘 방지)
 * - 열릴 때 initialFocusRef로 초기 포커스 이동 (키보드/스크린리더 진입점)
 *
 * @remarks 전체 포커스 트랩은 범위 외(Radix 기반 ui/dialog가 담당). PopupBanner의
 *          기존 로직을 추출해 다른 커스텀 시트가 재사용하도록 한다.
 */
export function useModalA11y({
  isOpen,
  onClose,
  isBlocked = false,
  initialFocusRef,
}: UseModalA11yOptions) {
  useEffect(() => {
    if (!isOpen) return
    initialFocusRef?.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isBlocked) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen, onClose, isBlocked, initialFocusRef])
}
