import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { getGenres, completeOnboarding, type Genre } from '@/api/genre'
import { useAuthStore } from '@/store/authStore'

/**
 * 온보딩 장르 선택 페이지 (`/onboarding/genre`).
 *
 * `onboardingCompleted === false`인 신규 사용자가 관심 장르를 선택하는 단계.
 * 선택된 장르는 `POST /api/v1/users/me/onboarding`으로 전달되어
 * 추천 피드(`RecommendationService.buildTopCategories`)의 콘텐츠 기반 추천 입력이 된다.
 *
 * 최소 1개 선택 필수 (백엔드 `@NotEmpty`). 최대 제한 없음.
 */
export default function GenreSelectionPage() {
  const navigate = useNavigate()
  const user = useAuthStore(state => state.user)
  const onboardingCompleted = useAuthStore(state => state.user?.onboardingCompleted)
  const completeOnboardingStore = useAuthStore(state => state.completeOnboarding)

  const [genres, setGenres] = useState<Genre[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    ;(async () => {
      try {
        const result = await getGenres(controller.signal)
        if (controller.signal.aborted) return
        setGenres(result)
      } catch (error) {
        if (axios.isCancel(error) || controller.signal.aborted) return
        setErrorMessage(error instanceof Error ? error.message : '장르 목록을 불러오지 못했습니다.')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    })()
    return () => controller.abort()
  }, [])

  const toggleGenre = (genreId: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(genreId)) {
        next.delete(genreId)
      } else {
        next.add(genreId)
      }
      return next
    })
  }

  const handleSubmit = async () => {
    if (isSubmitting || selectedIds.size === 0 || !user) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await completeOnboarding({
        nickname: user.nickname,
        genreIds: Array.from(selectedIds),
      })
      completeOnboardingStore()
      navigate('/', { replace: true })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '온보딩 완료에 실패했습니다.')
      setIsSubmitting(false)
    }
  }

  if (onboardingCompleted) return <Navigate to="/" replace />

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <p role="status" className="text-sm text-muted-foreground">
          불러오는 중...
        </p>
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6">
        <span className="material-symbols-outlined text-5xl text-muted-foreground/30">error</span>
        <p role="alert" className="text-sm text-muted-foreground">
          {errorMessage}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground"
        >
          다시 시도
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="px-6 pb-2 pt-12">
        <h1 className="text-3xl font-bold leading-tight">
          관심 장르를
          <br />
          선택해주세요
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          선택한 장르를 바탕으로 감상을 추천해드려요
        </p>
      </header>

      <main className="flex-1 overflow-y-auto px-6 pb-32 pt-6">
        <div className="flex flex-wrap gap-3">
          {genres.map(genre => {
            const isSelected = selectedIds.has(genre.genreId)
            return (
              <button
                key={genre.genreId}
                type="button"
                onClick={() => toggleGenre(genre.genreId)}
                aria-pressed={isSelected}
                className={`rounded-full px-5 py-3 text-[15px] font-semibold transition-all ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'border border-primary/15 bg-card text-foreground hover:bg-primary/5'
                }`}
              >
                {genre.name}
              </button>
            )
          })}
        </div>

        {genres.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16">
            <span className="material-symbols-outlined text-5xl text-muted-foreground/30">
              category
            </span>
            <p className="text-sm text-muted-foreground">등록된 장르가 없습니다</p>
          </div>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 bg-background px-6 pb-8 pt-4">
        {submitError && (
          <p
            role="alert"
            className="mb-3 rounded-lg bg-destructive/10 px-4 py-2 text-center text-sm text-destructive"
          >
            {submitError}
          </p>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={selectedIds.size === 0 || isSubmitting}
          className="h-14 w-full rounded-full bg-primary text-lg font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSubmitting
            ? '처리 중...'
            : selectedIds.size === 0
              ? '장르를 선택해주세요'
              : `선택 완료 (${selectedIds.size}개)`}
        </button>
      </div>
    </div>
  )
}
