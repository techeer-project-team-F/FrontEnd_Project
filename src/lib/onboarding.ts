const CAROUSEL_SEEN_KEY = 'onboarding-carousel-seen'

export function isCarouselSeen(): boolean {
  try {
    return !!localStorage.getItem(CAROUSEL_SEEN_KEY)
  } catch {
    return false
  }
}

export function markCarouselSeen(): void {
  try {
    localStorage.setItem(CAROUSEL_SEEN_KEY, 'true')
  } catch {
    /* Safari 프라이빗 모드 등 */
  }
}
