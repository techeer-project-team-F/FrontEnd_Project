import { useCallback, useEffect, useRef, useState } from 'react'

const DEVICE_ID_KEY = 'shelfeed-scan-device-id'

type ScannerStatus =
  | 'initializing'
  | 'running'
  | 'detected'
  | 'denied'
  | 'no-camera'
  | 'in-use'
  | 'unsupported'
  | 'error'

interface IsbnScannerModalProps {
  open: boolean
  onDetected: (isbn13: string) => void
  onClose: () => void
  // 인식된 ISBN-13의 체크섬 검증을 외부에서 주입 (프론트 검증 일관성 유지)
  validate?: (isbn13: string) => boolean
}

const STATUS_MESSAGES: Record<
  Exclude<ScannerStatus, 'initializing' | 'running' | 'detected'>,
  string
> = {
  denied: '카메라 권한이 필요합니다. 브라우저 설정에서 허용한 뒤 다시 시도해주세요.',
  'no-camera': '이 기기에 사용할 수 있는 카메라가 없습니다.',
  'in-use': '다른 앱이 카메라를 사용 중입니다. 종료 후 다시 시도해주세요.',
  unsupported: '이 브라우저는 카메라 스캔을 지원하지 않습니다.',
  error: '카메라를 시작하지 못했습니다. 잠시 후 다시 시도해주세요.',
}

export default function IsbnScannerModal({
  open,
  onDetected,
  onClose,
  validate,
}: IsbnScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  // ZXing 인스턴스. 정확한 타입은 dynamic import 결과에서만 알 수 있어 unknown으로 둠
  const readerRef = useRef<{ reset: () => void } | null>(null)

  const [status, setStatus] = useState<ScannerStatus>('initializing')
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null)
  const [flashFeedback, setFlashFeedback] = useState(false)

  // 모든 자원 정리. cleanup 누락 시 LED가 켜진 상태로 유지되는 흔한 버그 방지
  const stopAll = useCallback(() => {
    readerRef.current?.reset()
    readerRef.current = null
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const handleDetected = useCallback(
    (isbn: string) => {
      if (validate && !validate(isbn)) return // 체크섬 불일치 → 계속 스캔
      setStatus('detected')
      setFlashFeedback(true)
      navigator.vibrate?.(50)
      stopAll()
      // 시각 피드백을 위해 짧게 지연
      window.setTimeout(() => onDetected(isbn), 200)
    },
    [onDetected, stopAll, validate]
  )

  const startStream = useCallback(
    async (deviceId: string | null) => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setStatus('unsupported')
          return
        }

        // 기존 스트림 정지 후 새 요청
        streamRef.current?.getTracks().forEach(t => t.stop())

        const constraints: MediaStreamConstraints = {
          video: deviceId
            ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
        }

        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        streamRef.current = stream

        const video = videoRef.current
        if (!video) {
          stream.getTracks().forEach(t => t.stop())
          return
        }
        video.srcObject = stream
        await video.play().catch(() => {
          // play() rejection은 사용자가 빠르게 모달을 닫은 경우 발생 — 무시
        })

        // 권한 받은 직후 enumerate (라벨 포함)
        const all = await navigator.mediaDevices.enumerateDevices()
        const videoInputs = all.filter(d => d.kind === 'videoinput')
        setDevices(videoInputs)

        // 실제 사용 중인 deviceId 추출 → state/localStorage 동기화
        const trackSettings = stream.getVideoTracks()[0]?.getSettings()
        const usingId = trackSettings?.deviceId ?? null
        setActiveDeviceId(usingId)
        if (usingId) {
          try {
            localStorage.setItem(DEVICE_ID_KEY, usingId)
          } catch {
            // private 모드 등에서 실패 시 무시
          }
        }

        // ZXing lazy import로 메인 번들 영향 최소화
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        const reader = new BrowserMultiFormatReader()
        readerRef.current = reader

        // decodeFromVideoElement는 비디오 엘리먼트에 직접 attach하여 프레임마다 디코딩
        reader.decodeFromVideoElement(video, result => {
          if (!result) return
          handleDetected(result.getText())
        })

        setStatus('running')
      } catch (error) {
        if (!(error instanceof DOMException)) {
          setStatus('error')
          return
        }
        switch (error.name) {
          case 'NotAllowedError':
          case 'SecurityError':
            setStatus('denied')
            break
          case 'NotFoundError':
          case 'OverconstrainedError':
            setStatus('no-camera')
            break
          case 'NotReadableError':
          case 'TrackStartError':
            setStatus('in-use')
            break
          case 'AbortError':
            // 사용자가 dismiss 또는 컴포넌트 unmount — 조용히 무시
            break
          default:
            setStatus('error')
        }
      }
    },
    [handleDetected]
  )

  // 모달 열림 시 시작
  useEffect(() => {
    if (!open) return
    setStatus('initializing')
    setFlashFeedback(false)

    // 저장된 deviceId가 enumerate 결과에 있으면 우선 사용 — 첫 시작 시엔 enumerate 전이라 facingMode로 가고,
    // startStream 내부에서 받은 stream의 settings.deviceId가 저장값과 다르면 한 번 더 교체
    let saved: string | null = null
    try {
      saved = localStorage.getItem(DEVICE_ID_KEY)
    } catch {
      saved = null
    }
    startStream(saved)

    return () => {
      stopAll()
    }
  }, [open, startStream, stopAll])

  // 사용자가 드롭다운에서 카메라 변경
  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    setActiveDeviceId(id)
    setStatus('initializing')
    startStream(id)
  }

  if (!open) return null

  const errorMessage =
    status === 'denied' ||
    status === 'no-camera' ||
    status === 'in-use' ||
    status === 'unsupported' ||
    status === 'error'
      ? STATUS_MESSAGES[status]
      : null

  const showDeviceSelect = devices.length >= 2 && status === 'running'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ISBN 바코드 스캔"
      className="fixed inset-0 z-50 flex flex-col bg-black"
    >
      {/* Header */}
      <header className="flex items-center justify-between gap-3 bg-black/80 px-4 py-3 text-white">
        <button
          type="button"
          onClick={onClose}
          aria-label="스캐너 닫기"
          className="flex size-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <h2 className="flex-1 text-center text-base font-bold">ISBN 바코드 스캔</h2>
        {showDeviceSelect ? (
          <select
            aria-label="카메라 선택"
            value={activeDeviceId ?? ''}
            onChange={handleDeviceChange}
            className="max-w-[40vw] truncate rounded-md bg-white/10 px-2 py-1 text-xs text-white outline-none"
          >
            {devices.map((d, idx) => (
              <option key={d.deviceId} value={d.deviceId} className="text-black">
                {d.label || `카메라 ${idx + 1}`}
              </option>
            ))}
          </select>
        ) : (
          <span className="size-10" aria-hidden="true" />
        )}
      </header>

      {/* Video / Error / Loading */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          aria-hidden="true"
          className="size-full object-cover"
        />

        {/* 가이드 박스 + 외부 마스크 (status가 running일 때만) */}
        {status === 'running' && (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-black/40" />
            <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 sm:inset-x-1/4">
              <div
                className={`relative aspect-[4/1] overflow-hidden rounded-lg transition-colors ${
                  flashFeedback ? 'bg-emerald-500/30' : ''
                }`}
                style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)' }}
              >
                {/* 모서리 마커 */}
                <span className="absolute left-0 top-0 h-6 w-6 border-l-4 border-t-4 border-emerald-400" />
                <span className="absolute right-0 top-0 h-6 w-6 border-r-4 border-t-4 border-emerald-400" />
                <span className="absolute bottom-0 left-0 h-6 w-6 border-b-4 border-l-4 border-emerald-400" />
                <span className="absolute bottom-0 right-0 h-6 w-6 border-b-4 border-r-4 border-emerald-400" />
                {/* 스캔 라인 */}
                <span className="absolute inset-x-2 top-0 h-0.5 animate-[scan_1.6s_ease-in-out_infinite] bg-red-500" />
              </div>
              <p className="mt-6 text-center text-sm font-medium text-white/90">
                책 뒷면 바코드를 스캔 영역에 맞춰주세요
              </p>
            </div>
          </div>
        )}

        {(status === 'initializing' || status === 'detected') && !errorMessage && (
          <p
            role="status"
            aria-busy={status === 'initializing'}
            className="absolute text-sm text-white/80"
          >
            {status === 'initializing' ? '카메라 준비 중...' : '인식 완료'}
          </p>
        )}

        {errorMessage && (
          <div className="absolute inset-x-0 top-1/2 mx-6 -translate-y-1/2 rounded-2xl bg-white/95 p-6 text-center text-foreground">
            <span className="material-symbols-outlined mb-2 text-4xl text-destructive">error</span>
            <p role="alert" className="mb-4 text-sm font-medium">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
            >
              직접 입력하기
            </button>
          </div>
        )}
      </div>

      {/* Footer fallback */}
      {!errorMessage && (
        <footer className="bg-black/80 px-4 py-3 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-medium text-white/70 transition-colors hover:text-white"
          >
            직접 입력하기
          </button>
        </footer>
      )}

      {/* keyframes는 인라인 style 태그로 — Tailwind 3.x animate-[...] 임의값 동작 보장 */}
      <style>{`@keyframes scan { 0% { transform: translateY(0); opacity: 0.9; } 50% { transform: translateY(calc(100% - 4px)); opacity: 1; } 100% { transform: translateY(0); opacity: 0.9; } }`}</style>
    </div>
  )
}
