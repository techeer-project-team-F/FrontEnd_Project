import { afterEach, describe, expect, it, vi } from 'vitest'

import { createBarcodeDecoder } from './barcodeDecoder'

// zxing 폴백 경로를 결정적으로 검증하기 위해 모듈을 모킹(실제 브라우저 디코더 로드 방지).
// vi.hoisted: vi.mock 팩토리가 호이스팅돼도 참조할 수 있게 mock 핸들을 먼저 만든다.
const { decodeFromCanvasMock } = vi.hoisted(() => ({ decodeFromCanvasMock: vi.fn() }))

vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: class {
    decodeFromCanvas = decodeFromCanvasMock
  },
}))
vi.mock('@zxing/library', () => ({
  BarcodeFormat: { EAN_13: 1 },
  DecodeHintType: { POSSIBLE_FORMATS: 2, TRY_HARDER: 3 },
}))

// 디코더는 canvas를 디코더에 그대로 전달만 하므로 실제 캔버스 없이 식별용 스텁이면 충분.
const FAKE_CANVAS = {} as HTMLCanvasElement

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('createBarcodeDecoder', () => {
  it('네이티브 BarcodeDetector가 ean_13을 지원하면 네이티브 디코더를 사용한다', async () => {
    const detect = vi.fn().mockResolvedValue([{ rawValue: '9788956609959', format: 'ean_13' }])
    class FakeDetector {
      static getSupportedFormats = vi.fn().mockResolvedValue(['ean_13', 'qr_code'])
      detect = detect
    }
    vi.stubGlobal('window', { BarcodeDetector: FakeDetector })

    const decoder = await createBarcodeDecoder()
    const result = await decoder.decode(FAKE_CANVAS)

    expect(result).toBe('9788956609959')
    expect(detect).toHaveBeenCalledWith(FAKE_CANVAS)
    expect(decodeFromCanvasMock).not.toHaveBeenCalled() // zxing 미사용
  })

  it('네이티브가 ean_13을 지원하지 않으면 zxing 폴백을 사용한다', async () => {
    class FakeDetector {
      static getSupportedFormats = vi.fn().mockResolvedValue(['qr_code'])
      detect = vi.fn()
    }
    vi.stubGlobal('window', { BarcodeDetector: FakeDetector })
    decodeFromCanvasMock.mockReturnValue({ getText: () => '9788956609959' })

    const decoder = await createBarcodeDecoder()
    const result = await decoder.decode(FAKE_CANVAS)

    expect(result).toBe('9788956609959')
    expect(decodeFromCanvasMock).toHaveBeenCalledWith(FAKE_CANVAS)
  })

  it('BarcodeDetector 자체가 없으면 zxing 폴백을 사용한다', async () => {
    vi.stubGlobal('window', {}) // BarcodeDetector 부재 (iOS Safari 등)
    decodeFromCanvasMock.mockReturnValue({ getText: () => '9791169213021' })

    const decoder = await createBarcodeDecoder()
    const result = await decoder.decode(FAKE_CANVAS)

    expect(result).toBe('9791169213021')
  })

  it('zxing이 미검출로 throw하면 null을 반환한다(다음 프레임 재시도)', async () => {
    vi.stubGlobal('window', {})
    decodeFromCanvasMock.mockImplementation(() => {
      throw new Error('NotFoundException')
    })

    const decoder = await createBarcodeDecoder()
    const result = await decoder.decode(FAKE_CANVAS)

    expect(result).toBeNull()
  })

  it('네이티브 detect가 빈 배열이면 null을 반환한다', async () => {
    const detect = vi.fn().mockResolvedValue([])
    class FakeDetector {
      static getSupportedFormats = vi.fn().mockResolvedValue(['ean_13'])
      detect = detect
    }
    vi.stubGlobal('window', { BarcodeDetector: FakeDetector })

    const decoder = await createBarcodeDecoder()
    const result = await decoder.decode(FAKE_CANVAS)

    expect(result).toBeNull()
  })
})
