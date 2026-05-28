import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { getBook, type BookDetail } from '@/api/book'
import { createReview, getReviewDetail, updateReview } from '@/api/review'
import { extractTextFromImage, type OcrTextField } from '@/api/ocr'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import OcrTextSelector from '@/components/ocr/OcrTextSelector'
import { useAuthStore } from '@/store/authStore'

const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const MAX_QUOTE_LENGTH = 200

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

type ReviewFormBook = Pick<BookDetail, 'bookId' | 'title' | 'author' | 'coverImageUrl'>

export default function WriteReviewPage() {
  const { bookId, reviewId } = useParams()
  const navigate = useNavigate()
  const currentUserId = useAuthStore(state => state.user?.id)
  const isEditMode = reviewId != null

  const [book, setBook] = useState<ReviewFormBook | null>(null)
  const [rating, setRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const [quoteText, setQuoteText] = useState('')
  const [isQuoteEditorOpen, setIsQuoteEditorOpen] = useState(false)
  // [HIGH-1 fix] 이전엔 isSpoiler를 항상 false로 전송 → 사용자가 스포일러 글을 써도
  // 피드의 ReviewCard에서 hasSpoiler 블러 처리가 동작하지 않아 다른 사용자에게 결말이 새는
  // 도메인 정책 위반이 발생했다. 사용자가 명시적으로 토글로 표시하도록 state로 받음.
  const [isSpoiler, setIsSpoiler] = useState(false)
  const [isOcrLoading, setIsOcrLoading] = useState(false)
  const [ocrResult, setOcrResult] = useState<{ imageSrc: string; fields: OcrTextField[] } | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // [CodeRabbit fix] 단일 errorMessage가 "도서 로드 실패"와 "감상 제출 실패"를 함께 다뤄
  // 제출 실패 시 하단의 풀페이지 분기(errorMessage || !book)에 걸려 "도서를 찾을 수 없습니다"
  // 화면으로 점프하면서 사용자가 작성한 글이 사라진 것처럼 보였다.
  // 두 흐름의 에러를 분리해 로드 실패는 풀페이지로, 제출 실패는 인라인 alert로 노출하고
  // 작성한 글이 보존되도록 수정.
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null)
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isEditMode) {
      const isValid = /^\d+$/.test(reviewId ?? '')
      if (!isValid) {
        setLoadErrorMessage('감상 정보가 올바르지 않습니다.')
        setBook(null)
        setIsLoading(false)
        return
      }

      const numericReviewId = parseInt(reviewId!, 10)
      const controller = new AbortController()
      setIsLoading(true)
      setLoadErrorMessage(null)
      ;(async () => {
        try {
          const result = await getReviewDetail(numericReviewId, controller.signal)
          if (currentUserId != null && result.user.userId !== currentUserId) {
            setLoadErrorMessage('본인이 작성한 감상만 수정할 수 있습니다.')
            setBook(null)
            return
          }
          setBook({
            bookId: result.book.bookId,
            title: result.book.title,
            author: result.book.author,
            coverImageUrl: result.book.coverImageUrl,
          })
          setRating(result.rating)
          setReviewText(result.content)
          setQuoteText(result.quote ?? '')
          setIsQuoteEditorOpen(Boolean(result.quote))
          setIsSpoiler(result.isSpoiler)
        } catch (error) {
          if (axios.isCancel(error)) return
          setLoadErrorMessage(
            error instanceof Error ? error.message : '감상을 불러오지 못했습니다.'
          )
          setBook(null)
        } finally {
          if (!controller.signal.aborted) setIsLoading(false)
        }
      })()

      return () => controller.abort()
    }

    const isValid = /^\d+$/.test(bookId ?? '')
    if (!isValid) {
      setLoadErrorMessage(
        bookId ? '잘못된 도서 ID입니다.' : '도서를 먼저 선택하면 감상을 작성할 수 있어요.'
      )
      setBook(null)
      setIsLoading(false)
      return
    }

    const numericBookId = parseInt(bookId!, 10)
    const controller = new AbortController()
    setIsLoading(true)
    setLoadErrorMessage(null)
    ;(async () => {
      try {
        const result = await getBook(numericBookId, controller.signal)
        setBook(result)
        setRating(5)
        setReviewText('')
        setQuoteText('')
        setIsQuoteEditorOpen(false)
        setIsSpoiler(false)
      } catch (error) {
        // [MED-1 fix] try 블록 내 controller.signal.aborted 가드는 사실상 도달 불가
        // (요청이 abort되면 axios가 throw로 빠짐) + _helpers.ts의 normalizeAxiosError가
        // 이미 cancel을 rethrow하므로 catch에서 axios.isCancel만 보면 책임이 끝난다.
        // 다른 도메인(book/library 등)과 패턴 통일 + CLAUDE.md "방어 코드 최소화"에 맞춰 단일화.
        if (axios.isCancel(error)) return
        setLoadErrorMessage(error instanceof Error ? error.message : '도서를 불러오지 못했습니다.')
        setBook(null)
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    })()

    return () => controller.abort()
  }, [bookId, currentUserId, isEditMode, reviewId])

  const ocrAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      ocrAbortRef.current?.abort()
    }
  }, [])

  /**
   * 사진 선택 시 OCR API를 호출하여 텍스트 블록 + 좌표를 받아온다.
   * 결과는 OcrTextSelector 모달에서 이미지 위 오버레이로 표시된다.
   */
  const handleOcrCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_IMAGE_SIZE) {
      setSubmitErrorMessage('이미지 크기가 너무 큽니다. 5MB 이하의 이미지를 선택해주세요.')
      return
    }
    ocrAbortRef.current?.abort()
    const controller = new AbortController()
    ocrAbortRef.current = controller
    setIsOcrLoading(true)
    setSubmitErrorMessage(null)
    try {
      const dataUrl = await readFileAsDataUrl(file)
      const base64 = dataUrl.split(',')[1]
      const rawFormat = file.type.split('/')[1] || 'jpg'
      const format = rawFormat === 'jpeg' ? 'jpg' : rawFormat
      const result = await extractTextFromImage(base64, format, controller.signal)
      if (controller.signal.aborted) return
      setOcrResult({ imageSrc: dataUrl, fields: result.fields })
    } catch {
      if (!controller.signal.aborted) {
        setSubmitErrorMessage('텍스트 추출에 실패했습니다. 다시 시도해주세요.')
      }
    } finally {
      if (!controller.signal.aborted) setIsOcrLoading(false)
      e.target.value = ''
    }
  }

  /**
   * OcrTextSelector에서 선택 완료 시 호출. 선택된 텍스트를 인용구 textarea에 채운다.
   * MAX_QUOTE_LENGTH를 초과하면 자동으로 잘라낸다.
   */
  const handleOcrConfirm = (selectedText: string) => {
    setQuoteText(prev => {
      const combined = prev ? prev + '\n' + selectedText : selectedText
      return combined.slice(0, MAX_QUOTE_LENGTH)
    })
    setIsQuoteEditorOpen(true)
    setOcrResult(null)
  }

  const handleSubmit = async () => {
    const isValidBookId = /^\d+$/.test(bookId ?? '')
    const isValidReviewId = /^\d+$/.test(reviewId ?? '')
    const trimmedContent = reviewText.trim()
    const trimmedQuote = quoteText.trim()

    if ((!isEditMode && !isValidBookId) || (isEditMode && !isValidReviewId) || !book) {
      setSubmitErrorMessage('도서 정보가 올바르지 않습니다.')
      return
    }

    if (!trimmedContent) {
      setSubmitErrorMessage('감상 내용을 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    setSubmitErrorMessage(null)
    try {
      const basePayload = {
        content: trimmedContent,
        rating,
        // [HIGH-1 fix] 사용자가 토글로 명시적으로 표시한 값을 그대로 전송 (이전엔 false 고정)
        isSpoiler,
        reviewVisibility: 'PUBLIC' as const,
        reviewStatus: 'PUBLISHED' as const,
      }

      if (isEditMode) {
        await updateReview(parseInt(reviewId!, 10), {
          ...basePayload,
          quote: trimmedQuote,
        })
        navigate(`/review/${reviewId}`, { replace: true })
        return
      }

      const result = await createReview({
        bookId: parseInt(bookId!, 10),
        ...basePayload,
        ...(trimmedQuote ? { quote: trimmedQuote } : {}),
      })
      navigate(`/review/${result.reviewId}`, { replace: true })
    } catch (error) {
      setSubmitErrorMessage(
        error instanceof Error
          ? error.message
          : isEditMode
            ? '감상을 수정하지 못했습니다.'
            : '감상을 작성하지 못했습니다.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader title={isEditMode ? '감상 수정' : '감상 작성'} showBack />
        <main aria-busy="true" className="flex flex-1 items-center justify-center pb-24">
          <p role="status" className="text-sm text-muted-foreground">
            불러오는 중...
          </p>
        </main>
        <BottomNav />
      </div>
    )
  }

  if (loadErrorMessage || !book) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader title={isEditMode ? '감상 수정' : '감상 작성'} showBack />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-8 pb-24">
          <span className="material-symbols-outlined text-6xl text-muted-foreground/30">
            search_off
          </span>
          <p className="text-lg font-bold text-muted-foreground">도서를 찾을 수 없습니다</p>
          <p role="alert" className="max-w-[280px] text-center text-sm text-muted-foreground">
            {loadErrorMessage ?? '도서 정보를 불러올 수 없습니다.'}
          </p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
          >
            돌아가기
          </button>
        </main>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader title={isEditMode ? '감상 수정' : '감상 작성'} showBack />

      <main className="flex-1 overflow-y-auto pb-24">
        {/* Book Info */}
        <section className="px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-16 shrink-0 items-center justify-center rounded-2xl bg-card shadow-sm">
              <div className="h-20 w-12 overflow-hidden rounded-md border border-primary/10 bg-primary/5">
                {book.coverImageUrl ? (
                  <img
                    src={book.coverImageUrl}
                    alt={book.title}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <span className="material-symbols-outlined text-3xl text-muted-foreground/30">
                      menu_book
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="min-w-0">
              <h2 className="text-2xl font-bold leading-tight text-foreground">{book.title}</h2>
              <p className="mt-1 text-lg font-medium text-muted-foreground">{book.author}</p>
            </div>
          </div>
        </section>

        {/* Rating */}
        <section className="py-4">
          <div className="w-full bg-primary/5 px-8 py-6">
            <p className="mb-5 text-center text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Rate your reading experience
            </p>

            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(value => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className="transition-transform active:scale-90"
                  aria-label={`${value}점`}
                >
                  <span
                    className={`material-symbols-outlined text-[40px] ${
                      value <= rating ? 'fill-1 text-primary' : 'text-primary/25'
                    }`}
                    style={{ fontVariationSettings: `'FILL' ${value <= rating ? 1 : 0}` }}
                  >
                    star
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Review Text */}
        <section className="px-8 py-4">
          <textarea
            value={reviewText}
            onChange={e => setReviewText(e.target.value)}
            maxLength={500}
            placeholder="이 책에 대한 감상을 자유롭게 적어보세요...."
            className="min-h-[260px] w-full resize-none bg-transparent text-lg leading-relaxed outline-none placeholder:text-muted-foreground/40"
          />
        </section>

        {/* Quote Editor */}
        {isQuoteEditorOpen && (
          <section className="px-8 py-2">
            <div className="rounded-2xl bg-primary/5 p-5">
              <div className="border-l-4 border-primary pl-4">
                <textarea
                  value={quoteText}
                  onChange={e => setQuoteText(e.target.value)}
                  maxLength={200}
                  placeholder="기억하고 싶은 문장을 입력하세요."
                  className="min-h-[96px] w-full resize-none bg-transparent text-lg italic leading-relaxed outline-none placeholder:text-muted-foreground/50"
                />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-primary/80">
                  <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                  {isOcrLoading ? '인식 중...' : '사진으로 다시 입력'}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleOcrCapture}
                    className="sr-only"
                    disabled={isOcrLoading}
                  />
                </label>
                <span className="text-xs text-muted-foreground">{quoteText.length}/200</span>
              </div>
            </div>
          </section>
        )}

        {/* Quote Add Button + Spoiler Toggle */}
        <section className="flex items-center justify-between gap-4 px-8 py-3">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsQuoteEditorOpen(true)}
              className="flex items-center gap-2 text-base font-bold text-primary transition-colors hover:text-primary/80"
            >
              <span className="material-symbols-outlined text-[20px]">format_quote</span>
              인용구 추가
            </button>
            {!isQuoteEditorOpen && (
              <label className="flex cursor-pointer items-center gap-2 text-base font-bold text-primary transition-colors hover:text-primary/80">
                <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                {isOcrLoading ? '인식 중...' : '사진으로 입력'}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleOcrCapture}
                  className="hidden"
                  disabled={isOcrLoading}
                />
              </label>
            )}
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-muted-foreground select-none">
            <input
              type="checkbox"
              checked={isSpoiler}
              onChange={e => setIsSpoiler(e.target.checked)}
              className="size-4 cursor-pointer accent-primary"
            />
            스포일러 포함
          </label>
        </section>

        {/* Action Buttons */}
        <section className="px-8 pb-6 pt-2">
          {submitErrorMessage && (
            <p role="alert" className="mb-3 text-sm font-semibold text-destructive">
              {submitErrorMessage}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              className="h-14 flex-1 rounded-full border-2 border-primary bg-background text-base font-bold text-primary transition-colors hover:bg-primary/5"
            >
              임시저장
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="h-14 flex-[1.7] rounded-full bg-primary text-base font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? isEditMode
                  ? '수정 중...'
                  : '게시 중...'
                : isEditMode
                  ? '수정하기'
                  : '게시하기'}
            </button>
          </div>
        </section>
      </main>

      <BottomNav />

      {ocrResult && (
        <OcrTextSelector
          imageSrc={ocrResult.imageSrc}
          fields={ocrResult.fields}
          onConfirm={handleOcrConfirm}
          onClose={() => setOcrResult(null)}
        />
      )}
    </div>
  )
}
