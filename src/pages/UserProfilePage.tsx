import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import AppHeader from '@/components/layout/AppHeader'
import { getUserProfile, type UserProfile } from '@/api/member'
import { followUser, unfollowUser } from '@/api/follow'
import { useAuthStore } from '@/store/authStore'

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const myUserId = useAuthStore(state => state.user?.id)

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isFollowProcessing, setIsFollowProcessing] = useState(false)
  const [followError, setFollowError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  // StrictMode dev 모드에서 effect가 mount → unmount → mount로 더블 인보크되므로
  // setup에서 명시적으로 true로 리셋해 ref가 false로 stuck되지 않도록 한다.
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const isValidId = /^\d+$/.test(userId ?? '')
  const numericUserId = isValidId ? parseInt(userId!, 10) : 0

  useEffect(() => {
    if (!userId || !isValidId) {
      setErrorMessage('잘못된 사용자 ID입니다.')
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)
    setErrorMessage(null)
    ;(async () => {
      try {
        const result = await getUserProfile(numericUserId, controller.signal)
        if (controller.signal.aborted) return
        setProfile(result)
      } catch (error) {
        if (axios.isCancel(error) || controller.signal.aborted) return
        setErrorMessage(error instanceof Error ? error.message : '프로필을 불러오지 못했습니다.')
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    })()

    return () => controller.abort()
  }, [userId, isValidId, numericUserId])

  if (myUserId && numericUserId === myUserId) {
    return <Navigate to="/profile" replace />
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader title="프로필" showBack />
        <main aria-busy="true" className="flex flex-1 items-center justify-center">
          <p role="status" className="text-sm text-muted-foreground">
            불러오는 중...
          </p>
        </main>
      </div>
    )
  }

  if (errorMessage || !profile) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader title="프로필" showBack />
        <main className="flex flex-1 flex-col items-center justify-center gap-4">
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
      </div>
    )
  }

  const handleToggleFollow = async () => {
    if (isFollowProcessing) return
    // 결정 시점 스냅샷: 호출 직후 외부에서 profile.isFollowing이 바뀌어도 분기를 일관되게 유지
    // (미래 옵티미스틱 업데이트/외부 갱신 도입 시 회귀 방지)
    const wasFollowing = profile.isFollowing
    setIsFollowProcessing(true)
    setFollowError(null)
    try {
      if (wasFollowing) {
        const result = await unfollowUser(profile.userId)
        if (!isMountedRef.current) return
        setProfile(prev =>
          prev
            ? {
                ...prev,
                isFollowing: false,
                followerCount: Number.isFinite(result.followerCount)
                  ? result.followerCount
                  : prev.followerCount,
              }
            : prev
        )
      } else {
        const result = await followUser(profile.userId)
        if (!isMountedRef.current) return
        setProfile(prev =>
          prev
            ? {
                ...prev,
                isFollowing: true,
                followerCount: Number.isFinite(result.followerCount)
                  ? result.followerCount
                  : prev.followerCount,
              }
            : prev
        )
      }
    } catch (error) {
      if (!isMountedRef.current) return
      setFollowError(error instanceof Error ? error.message : '요청에 실패했습니다.')
    } finally {
      if (isMountedRef.current) setIsFollowProcessing(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader title="프로필" showBack />

      <main className="flex-1 overflow-y-auto pb-12">
        {/* Profile Intro */}
        <section className="px-6 pt-8 text-center">
          <div className="mx-auto mb-5 flex h-36 w-36 items-center justify-center rounded-full bg-primary/10">
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
          </div>

          <h1 className="text-3xl font-bold tracking-tight">{profile.nickname}</h1>
          {profile.bio && (
            <p className="mx-auto mt-3 max-w-[320px] whitespace-pre-wrap text-base leading-7 text-primary/80">
              {profile.bio}
            </p>
          )}

          {/* TODO(Follow): 팔로워/팔로잉 목록 페이지 연동 시 disabled 제거 + onClick 추가 */}
          <div className="mt-6 flex items-center justify-center gap-4 text-base font-medium text-primary/80">
            <button type="button" disabled aria-disabled="true">
              팔로워 {profile.followerCount}
            </button>
            <span className="text-primary/30">|</span>
            <button type="button" disabled aria-disabled="true">
              팔로잉 {profile.followingCount}
            </button>
          </div>
        </section>

        {/* Follow Button */}
        <section className="flex flex-col gap-2 px-6 pt-6">
          <button
            type="button"
            onClick={handleToggleFollow}
            disabled={isFollowProcessing}
            aria-pressed={profile.isFollowing}
            className={
              profile.isFollowing
                ? 'w-full rounded-xl border border-primary/30 bg-card py-4 text-lg font-bold text-primary shadow-sm transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60'
                : 'w-full rounded-xl bg-primary py-4 text-lg font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60'
            }
          >
            {isFollowProcessing ? '처리 중...' : profile.isFollowing ? '팔로잉' : '팔로우'}
          </button>
          {followError && (
            <p
              role="alert"
              aria-atomic="true"
              className="rounded-lg bg-destructive/10 px-4 py-2 text-center text-sm text-destructive"
            >
              {followError}
            </p>
          )}
        </section>

        {/* 서재 보기 진입점 */}
        <section className="px-6 pt-4">
          <button
            type="button"
            onClick={() => navigate(`/user/${numericUserId}/library`)}
            className="flex w-full items-center justify-between rounded-xl bg-card p-5 shadow-sm transition-colors hover:bg-card/80"
          >
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="material-symbols-outlined text-primary">
                menu_book
              </span>
              <span className="text-base font-semibold">서재 보기</span>
            </div>
            <span aria-hidden="true" className="material-symbols-outlined text-primary/40">
              chevron_right
            </span>
          </button>
        </section>

        {/* Stats */}
        <section className="px-6 pt-8">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-[24px] bg-card px-3 py-5 text-center shadow-sm">
              <p className="text-xs font-semibold text-primary/60">팔로워</p>
              <p className="mt-2 text-3xl font-bold text-primary">{profile.followerCount}</p>
            </div>
            <div className="rounded-[24px] bg-card px-3 py-5 text-center shadow-sm">
              <p className="text-xs font-semibold text-primary/60">팔로잉</p>
              <p className="mt-2 text-3xl font-bold text-primary">{profile.followingCount}</p>
            </div>
            <div className="rounded-[24px] bg-card px-3 py-5 text-center shadow-sm">
              <p className="text-xs font-semibold text-primary/60">감상</p>
              <p className="mt-2 text-3xl font-bold text-primary">{profile.reviewCount}개</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
