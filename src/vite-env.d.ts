/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// ── Web BarcodeDetector API (lib.dom.d.ts 미포함) ──
// 모바일 바코드 스캔 가속용. 미지원 브라우저(iOS Safari 등)는 런타임 feature-detect로 폴백.
interface DetectedBarcode {
  rawValue: string
  format: string
}

declare class BarcodeDetector {
  constructor(options?: { formats: string[] })
  static getSupportedFormats(): Promise<string[]>
  detect(source: CanvasImageSource | Blob | ImageData): Promise<DetectedBarcode[]>
}

interface Window {
  BarcodeDetector?: typeof BarcodeDetector
}

// 네이티브 토치(플래시) 제어 — lib.dom.d.ts 미포함 필드
interface MediaTrackCapabilities {
  torch?: boolean
}

interface MediaTrackConstraintSet {
  torch?: boolean
}
