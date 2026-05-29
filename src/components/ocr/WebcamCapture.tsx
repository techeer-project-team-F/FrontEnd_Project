import { useCallback, useEffect, useRef, useState } from 'react'

type CameraStatus =
  | 'initializing'
  | 'running'
  | 'denied'
  | 'no-camera'
  | 'in-use'
  | 'unsupported'
  | 'error'

const STATUS_MESSAGES: Record<Exclude<CameraStatus, 'initializing' | 'running'>, string> = {
  denied: '카메라 권한이 필요합니다. 브라우저 설정에서 허용한 뒤 다시 시도해주세요.',
  'no-camera': '이 기기에 사용할 수 있는 카메라가 없습니다.',
  'in-use': '다른 앱이 카메라를 사용 중입니다. 종료 후 다시 시도해주세요.',
  unsupported: '이 브라우저는 카메라를 지원하지 않습니다.',
  error: '카메라를 시작하지 못했습니다. 잠시 후 다시 시도해주세요.',
}

interface WebcamCaptureProps {
  onCapture: (file: File) => void
  onClose: () => void
}

/**
 * PC 환경에서 웹캠 라이브 프리뷰를 보여주고 촬영하는 전체 화면 모달.
 *
 * IsbnScannerModal의 getUserMedia/에러 처리/cleanup 패턴을 간소화하여 재활용한다.
 * 바코드 스캔·토치·디바이스 선택 로직은 제거하고 프리뷰 + 촬영 버튼만 제공.
 */
export default function WebcamCapture({ onCapture, onClose }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const sessionRef = useRef(0)
  const [status, setStatus] = useState<CameraStatus>('initializing')

  const stopAll = useCallback(() => {
    sessionRef.current += 1
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const startStream = useCallback(async () => {
    const mySession = ++sessionRef.current
    const isStale = () => sessionRef.current !== mySession

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('unsupported')
        return
      }

      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })

      if (isStale()) {
        stream.getTracks().forEach(t => t.stop())
        return
      }
      streamRef.current = stream

      const video = videoRef.current
      if (!video) {
        stream.getTracks().forEach(t => t.stop())
        streamRef.current = null
        return
      }
      video.srcObject = stream
      await video.play()
      if (isStale()) return

      setStatus('running')
    } catch (error) {
      if (isStale()) return
      stopAll()
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
          break
        default:
          setStatus('error')
      }
    }
  }, [stopAll])

  const startStreamRef = useRef(startStream)
  const stopAllRef = useRef(stopAll)
  useEffect(() => {
    startStreamRef.current = startStream
    stopAllRef.current = stopAll
  }, [startStream, stopAll])

  useEffect(() => {
    startStreamRef.current()
    return () => stopAllRef.current()
  }, [])

  const handleCapture = useCallback(() => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0)
    canvas.toBlob(
      blob => {
        if (!blob) return
        const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' })
        stopAll()
        onCapture(file)
      },
      'image/jpeg',
      0.9
    )
  }, [onCapture, stopAll])

  const handleClose = useCallback(() => {
    stopAll()
    onClose()
  }, [stopAll, onClose])

  const errorMessage =
    status !== 'initializing' && status !== 'running' ? STATUS_MESSAGES[status] : null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="카메라 촬영"
      className="fixed inset-0 z-50 flex flex-col bg-black"
    >
      {/* Header */}
      <header className="flex items-center justify-between gap-3 bg-black/80 px-4 py-3 text-white">
        <button
          type="button"
          onClick={handleClose}
          aria-label="카메라 닫기"
          className="flex size-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <h2 className="flex-1 text-center text-base font-bold">카메라 촬영</h2>
        <span className="size-10" aria-hidden="true" />
      </header>

      {/* Video Preview */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          aria-hidden="true"
          className="size-full object-cover"
        />

        {status === 'initializing' && (
          <p role="status" aria-busy="true" className="absolute text-sm text-white/80">
            카메라 준비 중...
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
              onClick={handleClose}
              className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
            >
              닫기
            </button>
          </div>
        )}
      </div>

      {/* Capture Button */}
      {status === 'running' && (
        <footer className="flex items-center justify-center bg-black/80 px-4 py-6">
          <button
            type="button"
            onClick={handleCapture}
            aria-label="촬영하기"
            className="flex size-[72px] items-center justify-center rounded-full border-4 border-white bg-white/20 transition-transform active:scale-90"
          >
            <span className="size-[56px] rounded-full bg-white" />
          </button>
        </footer>
      )}

      {!errorMessage && status !== 'running' && (
        <footer className="bg-black/80 px-4 py-3 text-center">
          <button
            type="button"
            onClick={handleClose}
            className="text-sm font-medium text-white/70 transition-colors hover:text-white"
          >
            취소
          </button>
        </footer>
      )}
    </div>
  )
}
