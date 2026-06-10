import { describe, expect, it } from 'vitest'

import { shouldBlockPull } from './usePreventPullToRefresh'

describe('shouldBlockPull', () => {
  it('세로 아래 당김 + 문서 최상단 + 내부 스크롤 없음 → 차단', () => {
    expect(shouldBlockPull({ deltaX: 2, deltaY: 40, scrollY: 0, innerScrolling: false })).toBe(true)
  })

  it('위로 당기면(콘텐츠 스크롤) → 통과', () => {
    expect(shouldBlockPull({ deltaX: 0, deltaY: -40, scrollY: 0, innerScrolling: false })).toBe(
      false
    )
  })

  it('문서가 최상단이 아니면 → 통과', () => {
    expect(shouldBlockPull({ deltaX: 0, deltaY: 40, scrollY: 120, innerScrolling: false })).toBe(
      false
    )
  })

  it('내부 스크롤 요소가 소비하면 → 통과', () => {
    expect(shouldBlockPull({ deltaX: 0, deltaY: 40, scrollY: 0, innerScrolling: true })).toBe(false)
  })

  it('가로 우세 제스처(캐러셀) → 통과', () => {
    expect(shouldBlockPull({ deltaX: 80, deltaY: 10, scrollY: 0, innerScrolling: false })).toBe(
      false
    )
  })
})
