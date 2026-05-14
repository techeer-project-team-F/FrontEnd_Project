import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createReport, type ReportReason, type ReportTargetType } from '@/api/report'
import { cn } from '@/lib/utils'

interface ReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetType: ReportTargetType
  targetId: number
}

const REASON_OPTIONS: { value: ReportReason; label: string }[] = [
  { value: 'SPOILER', label: '스포일러 포함' },
  { value: 'SPAM', label: '스팸 / 홍보' },
  { value: 'INAPPROPRIATE', label: '부적절한 내용' },
  { value: 'COPYRIGHT', label: '저작권 침해' },
  { value: 'OTHER', label: '기타' },
]

/**
 * 감상·댓글 신고 다이얼로그.
 *
 * 5개 사유 중 하나를 선택하고, "기타" 선택 시 상세 사유를 입력할 수 있다.
 * 제출 시 `POST /api/v1/reports`를 호출하고 성공/실패 메시지를 표시.
 */
export default function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
}: ReportDialogProps) {
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const reset = () => {
    setReason(null)
    setDescription('')
    setIsSubmitting(false)
    setErrorMessage(null)
    setIsSuccess(false)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleSubmit = async () => {
    if (!reason || isSubmitting) return
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      await createReport({
        targetType,
        targetId,
        reason,
        ...(reason === 'OTHER' && description.trim() ? { description: description.trim() } : {}),
      })
      setIsSuccess(true)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '신고 접수에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>신고 접수 완료</DialogTitle>
            <DialogDescription>신고가 접수되었습니다. 검토 후 조치하겠습니다.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => handleOpenChange(false)}
              className="h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              확인
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>신고하기</DialogTitle>
          <DialogDescription>
            {targetType === 'REVIEW' ? '이 감상을' : '이 댓글을'} 신고하는 이유를 선택해주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 py-2">
          {REASON_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setReason(opt.value)}
              aria-pressed={reason === opt.value}
              className={cn(
                'rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors',
                reason === opt.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-foreground hover:bg-primary/5'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {reason === 'OTHER' && (
          <div className="flex flex-col gap-1">
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              aria-label="신고 상세 사유 입력"
              placeholder="상세 사유를 입력해주세요"
              maxLength={200}
              className="min-h-[80px] w-full resize-none rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <p className="text-right text-xs text-muted-foreground">{description.length}/200</p>
          </div>
        )}

        {errorMessage && (
          <p
            role="alert"
            className="rounded-lg bg-destructive/10 px-3 py-2 text-center text-sm text-destructive"
          >
            {errorMessage}
          </p>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="h-11 flex-1 rounded-xl border border-border text-sm font-bold text-foreground transition-colors hover:bg-primary/5"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!reason || isSubmitting}
            className="h-11 flex-1 rounded-xl bg-destructive text-sm font-bold text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
          >
            {isSubmitting ? '접수 중...' : '신고하기'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
