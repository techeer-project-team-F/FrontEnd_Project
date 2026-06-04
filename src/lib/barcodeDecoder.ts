/**
 * ROI 캔버스 1장을 받아 EAN-13(ISBN) 바코드 문자열을 디코딩하는 추상화.
 *
 * `decode` 단일 메서드로 통일해 호출부(IsbnScannerModal)가 네이티브/zxing 중
 * 무엇이 선택됐는지 신경 쓰지 않고 동일하게 쓰도록 한다. 반환 문자열의 체크섬
 * 검증은 호출부의 `validate`가 담당하므로 여기서는 raw 디코딩 결과만 돌려준다.
 */
export interface BarcodeDecoder {
  decode(canvas: HTMLCanvasElement): Promise<string | null>
}

/**
 * 런타임에 사용 가능한 가장 빠른 EAN-13 디코더를 생성한다.
 *
 * 네이티브 `BarcodeDetector`(주로 안드로이드 Chrome)는 zxing 순수 JS 디코딩보다
 * 훨씬 빨라 모바일 스캔 지연의 핵심 원인을 해소한다. 다만 iOS Safari·Firefox 등은
 * 미지원이거나 지원 포맷이 달라서 두 단계로 확인한다:
 *  1. `'BarcodeDetector' in window`로 객체 존재 확인
 *  2. `getSupportedFormats()`(비동기)에 `ean_13`이 실제 포함되는지 확인
 *     (객체는 있어도 ean_13을 못 다루는 구현이 있어 await 확인이 필요)
 * 어느 단계든 실패하면 zxing 폴백으로 떨어진다. zxing은 이 폴백 경로에서만 동적
 * import하므로, 네이티브가 채택되는 환경(안드로이드)에서는 zxing 번들 로딩·실행을
 * 통째로 건너뛴다.
 */
export async function createBarcodeDecoder(): Promise<BarcodeDecoder> {
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window && window.BarcodeDetector) {
    try {
      const formats = await window.BarcodeDetector.getSupportedFormats()
      if (formats.includes('ean_13')) {
        const detector = new window.BarcodeDetector({ formats: ['ean_13'] })
        return {
          async decode(canvas) {
            const codes = await detector.detect(canvas)
            return codes[0]?.rawValue ?? null
          },
        }
      }
    } catch {
      // 네이티브 감지/생성 실패 → zxing 폴백
    }
  }

  // zxing 폴백 (iOS Safari 등 BarcodeDetector 미지원 환경)
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
    import('@zxing/browser'),
    import('@zxing/library'),
  ])
  // EAN-13만 타겟(전 포맷 시도하면 느리고 오인식↑). TRY_HARDER로 비용 약간↑ 대신 정확도↑.
  const hints = new Map<number, unknown>()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13])
  hints.set(DecodeHintType.TRY_HARDER, true)
  const reader = new BrowserMultiFormatReader(hints)
  return {
    async decode(canvas) {
      try {
        return reader.decodeFromCanvas(canvas)?.getText() ?? null
      } catch {
        // NotFoundException / ChecksumException / FormatException — 미검출
        return null
      }
    },
  }
}
