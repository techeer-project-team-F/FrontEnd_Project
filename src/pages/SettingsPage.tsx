import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import { logout, resendEmailCode } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'

export default function SettingsPage() {
  const navigate = useNavigate()
  const clearAuth = useAuthStore(state => state.clearAuth)
  const user = useAuthStore(state => state.user)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isSendingVerification, setIsSendingVerification] = useState(false)
  const [verificationError, setVerificationError] = useState<string | null>(null)

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await logout()
    } catch (error) {
      // TODO: [코드 리뷰 LOW] 프로덕션에서 console.error 잔류 이슈
      // 공용 토스트/알림 시스템 도입 후 console.error 대신 사용자 피드백으로 교체하거나,
      // 로그아웃은 실패해도 UX상 무조건 성공으로 처리하므로 로깅 자체를 제거할 것
      console.error('로그아웃 API 호출 실패:', error)
    } finally {
      clearAuth()
      navigate('/login', { replace: true })
    }
  }

  const handleVerifyEmail = async () => {
    if (isSendingVerification || !user?.email) return
    setIsSendingVerification(true)
    setVerificationError(null)
    try {
      await resendEmailCode(user.email)
      navigate('/verify-email', { state: { email: user.email } })
    } catch (error) {
      setVerificationError(
        error instanceof Error ? error.message : '인증 코드 발송에 실패했습니다.'
      )
    } finally {
      setIsSendingVerification(false)
    }
  }

  const [likeAlert, setLikeAlert] = useState(true)
  const [commentAlert, setCommentAlert] = useState(true)
  const [newFollowerAlert, setNewFollowerAlert] = useState(true)
  const [followingReviewAlert, setFollowingReviewAlert] = useState(false)
  const [libraryPublic, setLibraryPublic] = useState(true)

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
      type="button"
      onClick={onChange}
      className={`relative h-8 w-14 rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-primary/10'
      }`}
    >
      <span
        className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-background shadow-sm transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </button>
  )

  const SettingRow = ({
    title,
    description,
    right,
    noBorder = false,
  }: {
    title: string
    description?: string
    right?: React.ReactNode
    noBorder?: boolean
  }) => (
    <div
      className={`flex items-center justify-between gap-4 px-5 py-5 ${
        noBorder ? '' : 'border-b border-border'
      }`}
    >
      <div className="min-w-0">
        <p className="text-[18px] font-medium leading-tight text-foreground">{title}</p>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      </div>
      {right}
    </div>
  )

  const LinkRow = ({
    title,
    description,
    onClick,
    noBorder = false,
  }: {
    title: string
    description?: string
    onClick?: () => void
    noBorder?: boolean
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition-colors hover:bg-primary/5 disabled:cursor-not-allowed disabled:hover:bg-transparent ${
        noBorder ? '' : 'border-b border-border'
      }`}
    >
      <div className="min-w-0">
        <p className="text-[18px] font-medium leading-tight text-foreground">{title}</p>
        {description && <p className="mt-2 text-sm text-primary/80">{description}</p>}
      </div>
      <span className="material-symbols-outlined text-[24px] text-muted-foreground">
        chevron_right
      </span>
    </button>
  )

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader title="설정" showBack />

      <main className="flex-1 overflow-y-auto pb-24">
        {/* Email Verification Banner */}
        {user?.email && !user.emailVerified && (
          <section className="px-5 pt-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between rounded-2xl bg-amber-50 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[20px] text-amber-600">
                    warning
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    이메일 인증이 완료되지 않았습니다.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleVerifyEmail}
                  disabled={isSendingVerification}
                  className="text-sm font-semibold text-primary hover:underline disabled:opacity-60"
                >
                  {isSendingVerification ? '발송 중...' : '인증하기'}
                </button>
              </div>
              {verificationError && (
                <p role="alert" className="px-2 text-xs text-destructive">
                  {verificationError}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Notification Settings */}
        <section className="px-5 pt-6">
          <h2 className="mb-3 text-lg font-bold text-primary/80">알림 설정</h2>
          <div className="overflow-hidden rounded-[28px] bg-card shadow-sm">
            <SettingRow
              title="좋아요"
              right={<Toggle checked={likeAlert} onChange={() => setLikeAlert(prev => !prev)} />}
            />
            <SettingRow
              title="댓글"
              right={
                <Toggle checked={commentAlert} onChange={() => setCommentAlert(prev => !prev)} />
              }
            />
            <SettingRow
              title="새 팔로워"
              right={
                <Toggle
                  checked={newFollowerAlert}
                  onChange={() => setNewFollowerAlert(prev => !prev)}
                />
              }
            />
            <SettingRow
              title="팔로잉 새 감상"
              noBorder
              right={
                <Toggle
                  checked={followingReviewAlert}
                  onChange={() => setFollowingReviewAlert(prev => !prev)}
                />
              }
            />
          </div>
        </section>

        {/* Privacy */}
        <section className="px-5 pt-8">
          <h2 className="mb-3 text-lg font-bold text-primary/80">공개 범위</h2>
          <div className="overflow-hidden rounded-[28px] bg-card shadow-sm">
            <SettingRow
              title="서재 공개"
              description="다른 사용자가 내 서재를 방문할 수 있습니다."
              noBorder
              right={
                <Toggle checked={libraryPublic} onChange={() => setLibraryPublic(prev => !prev)} />
              }
            />
          </div>
        </section>

        {/* Account */}
        <section className="px-5 pt-8">
          <h2 className="mb-3 text-lg font-bold text-primary/80">계정 관리</h2>
          <div className="overflow-hidden rounded-[28px] bg-card shadow-sm">
            <LinkRow title="비밀번호 변경" onClick={() => navigate('/settings/password')} />
            <LinkRow title="연동 소셜 계정" description="Google 연동 중" noBorder />
          </div>
        </section>

        {/* Logout */}
        <section className="px-5 pt-10">
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="h-16 w-full rounded-full bg-primary text-xl font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.99] disabled:opacity-60"
          >
            {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
          </button>
        </section>

        {/* Delete account */}
        <section className="px-5 pt-6">
          <div className="text-center">
            <button
              type="button"
              className="text-base font-medium text-destructive/70 underline underline-offset-4"
            >
              회원 탈퇴
            </button>
          </div>
        </section>

        {/* Footer */}
        <section className="px-5 pb-10 pt-16">
          <div className="text-center text-primary/20">
            <div className="mb-2 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-[18px]">menu_book</span>
              <span className="text-2xl italic">BookLog</span>
            </div>
            <p className="text-sm uppercase tracking-wider">Version 2.4.0</p>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
