import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import BottomNav from '@/components/layout/BottomNav'
import { getMyProfile, type MyProfile } from '@/api/member'
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

// TODO(M1 후속): Review 목록 API 연동 시 교체 (공개 감상 타임라인)
const publicTimeline = [
  {
    id: 1,
    title: '위대한 개츠비',
    date: '2024년 6월 15일',
    summary: '데이지를 향한 개츠비의 맹목적인 열망은 시대를 관통하는 슬픈 낭만이다...',
    cover:
      'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=300&q=80',
    coverBg: '#5E8B7E',
  },
  {
    id: 2,
    title: '호밀밭의 파수꾼',
    date: '2024년 5월 28일',
    summary: '홀든 코필드의 방황이 낯설지 않게 느껴지는 밤. 어른이 된다는 것은 무엇일까.',
    cover:
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=300&q=80',
    coverBg: '#D8B08C',
  },
  {
    id: 3,
    title: '데미안',
    date: '2024년 5월 10일',
    summary: '새는 알을 깨고 나오기 위해 투쟁한다. 내 안의 아브락사스를 찾아서.',
    cover:
      'https://images.unsplash.com/photo-1526243741027-444d633d7365?auto=format&fit=crop&w=300&q=80',
    coverBg: '#8A8075',
  },
]

export default function MyProfilePage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<MyProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const maxStatValue = Math.max(...monthlyStats.map(item => item.value))

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    setErrorMessage(null)
    ;(async () => {
      try {
        const result = await getMyProfile(controller.signal)
        if (controller.signal.aborted) return
        setProfile(result)

        // authStore의 emailVerified / onboardingCompleted 최신화
        const state = useAuthStore.getState()
        if (state.user && state.accessToken) {
          state.setAuth(
            {
              ...state.user,
              nickname: result.nickname,
              email: result.email,
              profileImageUrl: result.profileImageUrl ?? undefined,
              bio: result.bio,
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

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
          <div className="grid grid-cols-3 items-center px-4 py-3">
            <div />
            <div className="flex justify-center">
              <h1 className="text-2xl font-bold tracking-tight text-primary">BookLog</h1>
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
              <h1 className="text-2xl font-bold tracking-tight text-primary">BookLog</h1>
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
            <h1 className="text-2xl font-bold tracking-tight text-primary">BookLog</h1>
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

            {/* TODO(M2): 프로필 수정 페이지 연동 시 onClick 추가 */}
            <button
              type="button"
              disabled
              aria-label="프로필 편집 (준비 중)"
              className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full border-4 border-background bg-primary/60 text-primary-foreground shadow-sm"
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
            <button type="button" className="hover:underline">
              팔로워 {profile.followerCount}
            </button>
            <span className="text-primary/30">|</span>
            <button type="button" className="hover:underline">
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

        {/* Public Review Timeline — TODO(M1 후속): Review 목록 API 연동 필요 */}
        <section className="px-6 pb-10 pt-10">
          <h2 className="mb-5 text-[28px] font-bold tracking-tight text-foreground">
            공개 감상 타임라인
          </h2>

          <div className="space-y-4">
            {publicTimeline.map(item => (
              <article
                key={item.id}
                className="flex gap-4 rounded-[28px] bg-card p-4 shadow-sm transition-transform hover:scale-[1.01]"
              >
                <div
                  className="flex h-[96px] w-[76px] shrink-0 items-center justify-center rounded-[18px]"
                  style={{ backgroundColor: item.coverBg }}
                >
                  <img
                    src={item.cover}
                    alt={`${item.title} 표지`}
                    className="h-[78px] w-[54px] rounded-[10px] object-cover shadow-sm"
                  />
                </div>

                <div className="min-w-0 flex-1 pt-1">
                  <h3 className="truncate text-xl font-bold text-foreground">{item.title}</h3>
                  <p className="mt-1 text-sm font-medium text-primary/40">{item.date}</p>
                  <p className="mt-3 line-clamp-2 text-base leading-6 text-foreground/65">
                    {item.summary}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
