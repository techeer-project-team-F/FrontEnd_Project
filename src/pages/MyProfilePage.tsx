import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import BottomNav from '@/components/layout/BottomNav'
import { getMyProfile, type MyProfile } from '@/api/member'
import { getMyReviews, REVIEW_PAGE_SIZE, type ReviewListItem } from '@/api/review'
import { formatRelativeTime } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'

// TODO(M1 후속): Library 통계 API 연동 시 교체 (Wisdom Tower, 연간 독서 스택)
const yearlyBooks = [
  { title: '어린 왕자', width: 'w-[92%]', bg: '#2B2626', text: 'text-white' },
  { title: '모비 딕', width: 'w-[88%]', bg: '#314244', text: 'text-white' },
  { title: '이방인', width: 'w-[90%]', bg: '#4B2E26', text: 'text-white' },
  { title: '위대한 개츠비', width: 'w-[86%]', bg: '#C2A065', text: 'text-white' },
  { title: '위대한 개츠비', width: 'w-[91%]', bg: '#6C4B3F', text: 'text-white' },
  { title: '호밀밭의 파수꾼', width: 'w-[84%]', bg: '#9B8378', text: 'text-white' },
  { title: '인간 실격', width: 'w-[89%]', bg: '#CBBDB8', text: 'text-foreground' },
  { title: '데미안', width: 'w-[82%]', bg: '#E2DBD8', text: 'text-primary' },
]

// TODO(M1 후속): 통계 전용 API 연동 시 교체 (월별 독서량)
const monthlyStats = [
  { month: '1월', value: 2 },
  { month: '2월', value: 3 },
  { month: '3월', value: 3 },
  { month: '4월', value: 5 },
  { month: '5월', value: 4 },
  { month: '6월', value: 6 },
]

// TODO(M1 후속): 통계 전용 API 연동 시 교체 (카테고리 분포)
const categoryStats = [
  { label: '소설 60%', color: '#B9935A' },
  { label: '에세이 25%', color: '#D3BE9E' },
  { label: '인문 15%', color: '#EEE3D2' },
]

/**
 * 본인 프로필 페이지.
 *
 * 두 개의 독립 fetch effect로 구성:
 * 1. `getMyProfile` — 상단 프로필(닉네임/bio/팔로워·팔로잉/감상수)을 채우고 `authStore.setAuth`로
 *    persist 상태를 최신화. `useAuthStore.getState()`로 읽는 이유는 본 컴포넌트가 store를
 *    selector로 구독하지 않게 하여 `setAuth` 호출이 리렌더 → effect 무한 루프를 일으키지 않도록 함.
 * 2. `getMyReviews({ status: 'PUBLISHED' })` — 공개 감상 타임라인. 백엔드 `findMyReviews`
 *    쿼리는 가시성(`reviewVisibility`) 필터가 없어 PUBLIC/PRIVATE이 모두 오므로,
 *    DRAFT 임시저장은 `status='PUBLISHED'`로 백엔드에서 제외 + PUBLIC 필터는 클라이언트
 *    표시단(useMemo `visibleReviews`)에서 적용. 후속 백엔드 이슈로 쿼리에 PUBLIC 필터 추가 검토.
 *
 * Wisdom Tower / 월별·카테고리 통계는 Library/통계 전용 API 미구현으로 mock 유지(TODO 표시).
 *
 * @remarks 페이징은 옵션 A — 응답이 배열이라 `items.length === REVIEW_PAGE_SIZE`로 hasNext
 * 추론. 마지막 페이지에서 정확히 PAGE_SIZE만 매칭되면 한 번 false-positive 후 빈 배열로 자연 종료.
 */
export default function MyProfilePage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<MyProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [reviews, setReviews] = useState<ReviewListItem[]>([])
  const [reviewNextCursor, setReviewNextCursor] = useState<number | null>(null)
  const [hasMoreReviews, setHasMoreReviews] = useState(false)
  const [isReviewsLoading, setIsReviewsLoading] = useState(true)
  const [isReviewsLoadingMore, setIsReviewsLoadingMore] = useState(false)
  const [reviewsErrorMessage, setReviewsErrorMessage] = useState<string | null>(null)

  /**
   * "더 보기" 클릭 시 만들어지는 abort controller. 사용자가 페이지를 이탈하거나 빠르게
   * 재클릭하면 진행 중인 요청을 취소하여 unmount 후 setState 경고와 stale 응답 덮어쓰기를 방지.
   */
  const loadMoreControllerRef = useRef<AbortController | null>(null)

  const maxStatValue = Math.max(...monthlyStats.map(item => item.value))

  /**
   * 백엔드 `findMyReviews`는 `reviewVisibility` 필터를 적용하지 않아 본인의 PRIVATE 감상도
   * 응답에 포함된다. "공개 감상 타임라인" 섹션의 의미상 클라이언트 표시단에서 PUBLIC만 노출.
   * 후속 백엔드 이슈로 쿼리 필터 추가 후 본 메모이제이션 제거 가능.
   */
  const visibleReviews = useMemo(
    () => reviews.filter(r => r.reviewVisibility === 'PUBLIC'),
    [reviews]
  )

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    setErrorMessage(null)
    ;(async () => {
      try {
        const result = await getMyProfile(controller.signal)
        if (controller.signal.aborted) return
        setProfile(result)

        // getState()로 읽는 이유: 이 컴포넌트가 authStore를 구독하지 않게 하여
        // setAuth 호출이 리렌더 → useEffect 재실행 무한 루프를 방지한다.
        const state = useAuthStore.getState()
        if (state.user && state.accessToken) {
          state.setAuth(
            {
              ...state.user,
              id: result.userId,
              nickname: result.nickname,
              email: result.email,
              profileImageUrl: result.profileImageUrl ?? undefined,
              bio: result.bio ?? undefined,
              emailVerified: result.emailVerified,
              onboardingCompleted: result.onboardingCompleted,
            },
            state.accessToken
          )
        }
      } catch (error) {
        if (axios.isCancel(error) || controller.signal.aborted) return
        setErrorMessage(error instanceof Error ? error.message : '프로필을 불러오지 못했습니다.')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    })()

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setIsReviewsLoading(true)
    setReviewsErrorMessage(null)
    ;(async () => {
      try {
        // status='PUBLISHED'로 임시저장(DRAFT) 제외. 가시성(PUBLIC) 필터는 백엔드 미적용이라
        // 클라이언트 visibleReviews 메모이제이션에서 처리.
        const response = await getMyReviews({
          cursor: null,
          status: 'PUBLISHED',
          signal: controller.signal,
        })
        if (controller.signal.aborted) return
        setReviews(response)
        // 옵션 A: 마지막 아이템의 reviewId를 다음 cursor로, items.length === PAGE_SIZE이면 hasNext.
        setReviewNextCursor(response.length > 0 ? response[response.length - 1].reviewId : null)
        setHasMoreReviews(response.length === REVIEW_PAGE_SIZE)
      } catch (error) {
        if (axios.isCancel(error) || controller.signal.aborted) return
        setReviewsErrorMessage(
          error instanceof Error ? error.message : '감상 목록을 불러오지 못했습니다.'
        )
      } finally {
        if (!controller.signal.aborted) setIsReviewsLoading(false)
      }
    })()

    return () => {
      controller.abort()
      // 더 보기로 진행 중이던 요청도 함께 취소 — 페이지 이탈 시 unmount 후 setState 방지.
      loadMoreControllerRef.current?.abort()
    }
  }, [])

  /**
   * "더 보기" 핸들러. 진행 중인 이전 요청은 abort 후 새 요청으로 교체하고, 응답에는 cancel
   * 가드를 적용해 stale 응답이 새 응답을 덮어쓰지 않도록 한다. 빈 응답이 도착하면
   * `hasMoreReviews=false`로 종료(옵션 A의 false-positive 자연 종료 정책).
   */
  const handleLoadMoreReviews = async () => {
    if (isReviewsLoadingMore || !hasMoreReviews) return

    loadMoreControllerRef.current?.abort()
    const controller = new AbortController()
    loadMoreControllerRef.current = controller

    setIsReviewsLoadingMore(true)
    setReviewsErrorMessage(null)
    try {
      const response = await getMyReviews({
        cursor: reviewNextCursor,
        status: 'PUBLISHED',
        signal: controller.signal,
      })
      if (controller.signal.aborted) return
      if (response.length === 0) {
        setHasMoreReviews(false)
        return
      }
      setReviews(prev => [...prev, ...response])
      setReviewNextCursor(response[response.length - 1].reviewId)
      setHasMoreReviews(response.length === REVIEW_PAGE_SIZE)
    } catch (error) {
      if (axios.isCancel(error) || controller.signal.aborted) return
      setReviewsErrorMessage(
        error instanceof Error ? error.message : '감상 목록을 더 불러오지 못했습니다.'
      )
    } finally {
      if (!controller.signal.aborted) setIsReviewsLoadingMore(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="grid grid-cols-3 items-center px-4 py-3">
            <div />
            <div className="flex justify-center">
              <h1 className="text-2xl font-bold tracking-tight text-primary">Shelfeed</h1>
            </div>
            <div />
          </div>
        </header>
        <main aria-busy="true" className="flex flex-1 items-center justify-center pb-24">
          <p role="status" className="text-sm text-muted-foreground">
            불러오는 중...
          </p>
        </main>
        <BottomNav />
      </div>
    )
  }

  if (errorMessage || !profile) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="grid grid-cols-3 items-center px-4 py-3">
            <div />
            <div className="flex justify-center">
              <h1 className="text-2xl font-bold tracking-tight text-primary">Shelfeed</h1>
            </div>
            <div />
          </div>
        </header>
        <main className="flex flex-1 flex-col items-center justify-center gap-4 pb-24">
          <span className="material-symbols-outlined text-6xl text-muted-foreground/30">error</span>
          <p role="alert" className="text-lg font-bold text-muted-foreground">
            {errorMessage ?? '프로필을 불러올 수 없습니다.'}
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
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="grid grid-cols-3 items-center px-4 py-3">
          <div className="flex justify-start">
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="flex size-10 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10"
              aria-label="설정 페이지로 이동"
            >
              <span className="material-symbols-outlined">settings</span>
            </button>
          </div>

          <div className="flex justify-center">
            <h1 className="text-2xl font-bold tracking-tight text-primary">Shelfeed</h1>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled
              aria-label="공유 (준비 중)"
              className="flex size-10 items-center justify-center rounded-full text-primary/40"
            >
              <span className="material-symbols-outlined">share</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        {/* Profile Intro */}
        <section className="px-6 pt-8 text-center">
          <div className="relative mx-auto mb-5 flex h-36 w-36 items-center justify-center rounded-full bg-primary/10">
            {profile.profileImageUrl ? (
              <img
                src={profile.profileImageUrl}
                alt={`${profile.nickname} 프로필 이미지`}
                className="h-32 w-32 rounded-full object-cover"
              />
            ) : (
              <span className="material-symbols-outlined text-6xl text-muted-foreground/40">
                person
              </span>
            )}

            <button
              type="button"
              onClick={() => navigate('/settings/profile')}
              aria-label="프로필 편집"
              className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-sm transition-all hover:opacity-90 active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
          </div>

          <h1 className="text-3xl font-bold tracking-tight">{profile.nickname}</h1>
          {profile.bio ? (
            <p className="mx-auto mt-3 max-w-[320px] whitespace-pre-wrap text-base leading-7 text-primary/80">
              {profile.bio}
            </p>
          ) : (
            <p className="mx-auto mt-3 max-w-[320px] text-base leading-7 text-primary/40">
              소개글을 작성해보세요.
            </p>
          )}

          <div className="mt-6 flex items-center justify-center gap-4 text-base font-medium text-primary/80">
            <button
              type="button"
              onClick={() => navigate(`/user/${profile.userId}/follows?tab=followers`)}
              className="transition-colors hover:text-primary"
            >
              팔로워 {profile.followerCount}
            </button>
            <span className="text-primary/30">|</span>
            <button
              type="button"
              onClick={() => navigate(`/user/${profile.userId}/follows?tab=following`)}
              className="transition-colors hover:text-primary"
            >
              팔로잉 {profile.followingCount}
            </button>
          </div>
        </section>

        {/* Stats */}
        <section className="px-6 pt-8">
          <div className="grid grid-cols-3 gap-3">
            {/* TODO(M1 후속): Library 통계 API 연동 시 실제 데이터로 교체 */}
            <div className="rounded-[24px] bg-card px-3 py-5 text-center shadow-sm">
              <p className="text-xs font-semibold text-primary/60">올해 읽은 책</p>
              <p className="mt-2 text-3xl font-bold text-primary">8권</p>
            </div>

            {/* TODO(M1 후속): Library 통계 API 연동 시 실제 데이터로 교체 */}
            <div className="rounded-[24px] bg-card px-3 py-5 text-center shadow-sm">
              <p className="text-xs font-semibold text-primary/60">총 완독</p>
              <p className="mt-2 text-3xl font-bold text-primary">47권</p>
            </div>

            <div className="rounded-[24px] bg-card px-3 py-5 text-center shadow-sm">
              <p className="text-xs font-semibold text-primary/60">감상</p>
              <p className="mt-2 text-3xl font-bold text-primary">{profile.reviewCount}개</p>
            </div>
          </div>
        </section>

        {/* Yearly Reading Stack — TODO(M1 후속): Library API 연동 필요 */}
        <section className="px-6 pt-10">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-primary/90">Your Wisdom Tower</h2>
          </div>

          <div className="flex flex-col-reverse items-center">
            {yearlyBooks.map((book, index) => (
              <div
                key={`${book.title}-${index}`}
                className={`relative ${book.width} h-[58px]`}
                style={{ marginTop: index === 0 ? 0 : '-2px' }}
              >
                <div
                  className={`flex h-full w-full items-center justify-center rounded-[16px] text-lg font-bold shadow-md ${book.text}`}
                  style={{ backgroundColor: book.bg }}
                >
                  {book.title}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Reading Statistics — TODO(M1 후속): 통계 전용 API 연동 필요 */}
        <section className="px-6 pt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[28px] font-bold tracking-tight text-foreground">나의 독서 통계</h2>
            <button
              type="button"
              className="flex items-center justify-center rounded-full p-1 text-primary/50 transition-colors hover:bg-primary/10"
              aria-label="독서 통계 상세 보기"
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>

          <div className="rounded-[28px] bg-card px-5 pb-5 pt-5 shadow-sm">
            <div className="h-[176px] pt-6">
              <div className="flex h-[128px] items-end justify-between gap-3 border-b border-border/70 px-2 pb-3">
                {monthlyStats.map(item => {
                  const barHeight = `${(item.value / maxStatValue) * 100}%`

                  return (
                    <div
                      key={item.month}
                      className="flex flex-1 flex-col items-center justify-end gap-3"
                    >
                      <div className="flex h-[96px] items-end">
                        <div
                          className="relative flex w-7 items-start justify-center rounded-full bg-primary/70"
                          style={{ height: barHeight, minHeight: '18px' }}
                        >
                          <span className="absolute bottom-full mb-2 text-sm font-semibold text-primary/55">
                            {item.value}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-primary/45">{item.month}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {categoryStats.map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium text-primary/65">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Public Review Timeline */}
        <section className="px-6 pb-10 pt-10">
          <h2 className="mb-5 text-[28px] font-bold tracking-tight text-foreground">
            공개 감상 타임라인
          </h2>

          {isReviewsLoading ? (
            <p role="status" className="py-8 text-center text-sm text-muted-foreground">
              감상을 불러오는 중...
            </p>
          ) : visibleReviews.length === 0 && !reviewsErrorMessage ? (
            <div className="rounded-[24px] bg-card px-5 py-8 text-center text-sm text-muted-foreground">
              아직 공개 감상이 없습니다.
            </div>
          ) : (
            <div className="space-y-4">
              {visibleReviews.map(review => (
                <article
                  key={review.reviewId}
                  onClick={() => navigate(`/review/${review.reviewId}`)}
                  className="flex cursor-pointer gap-4 rounded-[24px] bg-card p-4 shadow-sm transition-colors hover:bg-primary/5"
                >
                  <div className="flex h-[96px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-primary/5">
                    {review.book.coverImageUrl ? (
                      <img
                        src={review.book.coverImageUrl}
                        alt={`${review.book.title} 표지`}
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-3xl text-muted-foreground/30">
                        menu_book
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 pt-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="line-clamp-1 text-xl font-bold text-foreground">
                        {review.book.title}
                      </h3>
                      <span className="shrink-0 text-sm font-bold text-primary">
                        ★ {review.rating.toFixed(1)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-primary/40">
                      {formatRelativeTime(review.createdAt)}
                    </p>
                    <p className="mt-3 line-clamp-2 text-base leading-6 text-foreground/65">
                      {review.isSpoiler ? '스포일러가 포함된 감상입니다.' : review.content}
                    </p>
                    <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">favorite</span>
                        {review.likeCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">chat_bubble</span>
                        {review.commentCount}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {reviewsErrorMessage && (
            <p
              role="alert"
              className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-center text-sm text-destructive"
            >
              {reviewsErrorMessage}
            </p>
          )}

          {hasMoreReviews && !isReviewsLoading && (
            <button
              type="button"
              onClick={handleLoadMoreReviews}
              disabled={isReviewsLoadingMore}
              className="mt-5 w-full rounded-xl bg-primary/10 py-3 text-sm font-bold text-primary transition-colors hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isReviewsLoadingMore ? '불러오는 중...' : '더 보기'}
            </button>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
