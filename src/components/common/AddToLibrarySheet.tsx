import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ReadingStatus } from '@/types'

// API 연동 시 props에 book: Book 추가하고,
// handleSave에서 POST /api/v1/library { isbn: book.isbn, status: selected } 형태로 사용.
interface AddToLibrarySheetProps {
  isOpen: boolean
  onClose: () => void
  onSave: (status: ReadingStatus) => void
  defaultStatus?: ReadingStatus
}

const statusOptions: { value: ReadingStatus; label: string; emoji: string }[] = [
  { value: 'want_to_read', label: '읽고 싶은', emoji: '📖' },
  { value: 'reading', label: '읽는 중', emoji: '📚' },
  { value: 'finished', label: '다 읽음', emoji: '✅' },
  { value: 'stopped', label: '중단', emoji: '⏸️' },
]

export default function AddToLibrarySheet({
  isOpen,
  onClose,
  onSave,
  defaultStatus = 'want_to_read',
}: AddToLibrarySheetProps) {
  const [selected, setSelected] = useState<ReadingStatus>(defaultStatus)
  useEffect(() => {
    setSelected(defaultStatus)
  }, [defaultStatus])
  const navigate = useNavigate()

  if (!isOpen) return null

  const handleSave = () => {
    onSave(selected)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-[430px] flex-col justify-end">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      {/* Bottom Sheet */}
      <div className="relative flex flex-col items-stretch overflow-hidden rounded-t-xl bg-card shadow-2xl ring-1 ring-black/5">
        {/* Handle */}
        <button className="flex h-6 w-full items-center justify-center pt-2" onClick={onClose}>
          <div className="h-1.5 w-12 rounded-full bg-primary/20" />
        </button>

        <div className="flex-1">
          <h1 className="px-6 pb-4 pt-6 text-center text-xl font-bold leading-tight tracking-tight">
            독서 상태 선택
          </h1>

          <div className="flex flex-col gap-3 px-6 py-2">
            {statusOptions.map(option => (
              <label
                key={option.value}
                className="flex cursor-pointer flex-row-reverse items-center gap-4 rounded-xl border border-primary/10 p-4 transition-colors hover:bg-primary/5"
              >
                <input
                  type="radio"
                  name="reading-status"
                  checked={selected === option.value}
                  onChange={() => setSelected(option.value)}
                  className="size-5 border-2 border-primary/30 bg-transparent text-primary focus:outline-none focus:ring-0 focus:ring-offset-0"
                />
                <div className="flex grow items-center gap-3">
                  <span className="text-xl">{option.emoji}</span>
                  <p className="text-base font-medium">{option.label}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="flex flex-col gap-4 px-6 py-6 pb-10">
            <button
              onClick={handleSave}
              className="flex h-14 w-full cursor-pointer items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-[0.98]"
            >
              저장
            </button>
            <button
              onClick={() => {
                onClose()
                navigate('/review/write')
              }}
              className="text-sm font-semibold text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:text-primary/80"
            >
              감상 메모 남기기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
