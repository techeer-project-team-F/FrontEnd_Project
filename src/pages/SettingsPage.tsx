import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import { logout, resendEmailCode } from '@/api/auth'
import { getSettings, updateSettings, type SettingsResponse } from '@/api/member'
import { useAuthStore } from '@/store/authStore'
import type { EmailVerifyLocationState } from '@/pages/EmailVerificationPage'

function Toggle({
  checked,
  onChange,
  ariaLabel,
  disabled,
}: {
  checked: boolean
  onChange: () => void
  ariaLabel: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      disabled={disabled}
      className={`relative h-8 w-14 rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-primary/10'
      } ${disabled ? 'opacity-50' : ''}`}
    >
      <span
        className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-background shadow-sm transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

interface SettingRowProps {
  title: string
  description?: string
  right?: React.ReactNode
  noBorder?: boolean
}

function SettingRow({ title, description, right, noBorder = false }: SettingRowProps) {
  return (
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
}

interface LinkRowProps {
  title: string
  description?: string
  onClick?: () => void
  noBorder?: boolean
}

function LinkRow({ title, description, onClick, noBorder = false }: LinkRowProps) {
  return (
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
}

/**
 * 설정 페이지.
 *
 * 마운트 시 `GET /api/v1/users/me/settings`로 토글 초기값을 로드하고,
 * 토글 변경 시 `PATCH /api/v1/users/me/settings`로 낙관적 업데이트.
 * 실패 시 이전 값으로 롤백.
 *
 * `authProvider`는 로그인 시점에 authStore에 저장되며,
 * Google 사용자는 비밀번호 변경을 숨기고 "Google 연동 중"을 표시.
 */
export default function SettingsPage() {
  const navigate = useNavigate()
  const clearAuth = useAuthStore(state => state.clearAuth)
  const user = useAuthStore(state => state.user)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isSendingVerification, setIsSendingVerification] = useState(false)
  const [verificationError, setVerificationError] = useState<string | null>(null)

  const [settings, setSettings] = useState<SettingsResponse | null>(null)
  const [isSettingsLoading, setIsSettingsLoading] = useState(true)
  const [settingsError, setSettingsError] = useState(false)
  const [updatingKeys, setUpdatingKeys] = useState<Set<string>>(new Set())

  const isGoogleUser = user?.authProvider === 'GOOGLE'

  const loadSettings = async (signal?: AbortSignal) => {
    setIsSettingsLoading(true)
    setSettingsError(false)
    try {
      const result = await getSettings(signal)
      if (signal?.aborted) return
      setSettings(result)
    } catch {
      if (signal?.aborted) return
      setSettingsError(true)
    } finally {
      if (!signal?.aborted) setIsSettingsLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    loadSettings(controller.signal)
    return () => controller.abort()
  }, [])

  /**
   * 토글 변경 핸들러. 낙관적으로 즉시 UI 반영 후 API 호출.
   * 실패 시 이전 설정으로 롤백. 개별 필드별 잠금으로 여러 토글을
   * 빠르게 연속 변경해도 각각 독립적으로 처리됨.
   */
  const handleToggle = async (patch: Partial<SettingsResponse>) => {
    if (!settings) return
    const keys = Object.keys(patch)
    if (keys.some(k => updatingKeys.has(k))) return
    const prev = settings
    setSettings({ ...settings, ...patch })
    setUpdatingKeys(prev => {
      const next = new Set(prev)
      keys.forEach(k => next.add(k))
      return next
    })
    try {
      const result = await updateSettings(patch)
      setSettings(result)
    } catch {
      setSettings(prev)
    } finally {
      setUpdatingKeys(prev => {
        const next = new Set(prev)
        keys.forEach(k => next.delete(k))
        return next
      })
    }
  }

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    try {
      await logout()
    } catch (error) {
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
      const verifyState: EmailVerifyLocationState = { email: user.email, from: 'settings' }
      navigate('/verify-email', { state: verifyState })
    } catch (error) {
      setVerificationError(
        error instanceof Error ? error.message : '인증 코드 발송에 실패했습니다.'
      )
    } finally {
      setIsSendingVerification(false)
    }
  }

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
            {isSettingsLoading && !settingsError ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                설정을 불러오는 중...
              </div>
            ) : settings ? (
              <>
                <SettingRow
                  title="좋아요"
                  right={
                    <Toggle
                      checked={settings.likeEnabled}
                      onChange={() => handleToggle({ likeEnabled: !settings.likeEnabled })}
                      ariaLabel="좋아요 알림"
                      disabled={updatingKeys.has('likeEnabled')}
                    />
                  }
                />
                <SettingRow
                  title="댓글"
                  right={
                    <Toggle
                      checked={settings.commentEnabled}
                      onChange={() => handleToggle({ commentEnabled: !settings.commentEnabled })}
                      ariaLabel="댓글 알림"
                      disabled={updatingKeys.has('commentEnabled')}
                    />
                  }
                />
                <SettingRow
                  title="새 팔로워"
                  right={
                    <Toggle
                      checked={settings.followEnabled}
                      onChange={() => handleToggle({ followEnabled: !settings.followEnabled })}
                      ariaLabel="새 팔로워 알림"
                      disabled={updatingKeys.has('followEnabled')}
                    />
                  }
                />
                <SettingRow
                  title="팔로잉 새 감상"
                  noBorder
                  right={
                    <Toggle
                      checked={settings.followingReviewEnabled}
                      onChange={() =>
                        handleToggle({
                          followingReviewEnabled: !settings.followingReviewEnabled,
                        })
                      }
                      ariaLabel="팔로잉 새 감상 알림"
                      disabled={updatingKeys.has('followingReviewEnabled')}
                    />
                  }
                />
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 px-5 py-8">
                <p className="text-sm text-muted-foreground">설정을 불러오지 못했습니다</p>
                <button
                  type="button"
                  onClick={() => loadSettings()}
                  className="rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20"
                >
                  다시 시도
                </button>
              </div>
            )}
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
                settings ? (
                  <Toggle
                    checked={settings.libraryVisibility === 'PUBLIC'}
                    onChange={() =>
                      handleToggle({
                        libraryVisibility:
                          settings.libraryVisibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC',
                      })
                    }
                    ariaLabel="서재 공개"
                    disabled={updatingKeys.has('libraryVisibility') || isSettingsLoading}
                  />
                ) : (
                  <Toggle checked={false} onChange={() => {}} ariaLabel="서재 공개" disabled />
                )
              }
            />
          </div>
        </section>

        {/* Personalization */}
        <section className="px-5 pt-8">
          <h2 className="mb-3 text-lg font-bold text-primary/80">개인화</h2>
          <div className="overflow-hidden rounded-[28px] bg-card shadow-sm">
            <LinkRow title="관심 장르 변경" onClick={() => navigate('/settings/genres')} noBorder />
          </div>
        </section>

        {/* Block Management */}
        <section className="px-5 pt-8">
          <h2 className="mb-3 text-lg font-bold text-primary/80">차단 관리</h2>
          <div className="overflow-hidden rounded-[28px] bg-card shadow-sm">
            <LinkRow title="차단한 사용자" onClick={() => navigate('/settings/blocked')} noBorder />
          </div>
        </section>

        {/* Account */}
        <section className="px-5 pt-8">
          <h2 className="mb-3 text-lg font-bold text-primary/80">계정 관리</h2>
          <div className="overflow-hidden rounded-[28px] bg-card shadow-sm">
            {!isGoogleUser && (
              <LinkRow title="비밀번호 변경" onClick={() => navigate('/settings/password')} />
            )}
            <SettingRow
              title="연동 소셜 계정"
              description={isGoogleUser ? 'Google 연동 중' : '이메일 계정'}
              noBorder
            />
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
              onClick={() => navigate('/settings/withdraw')}
              className="text-base font-medium text-destructive/70 underline underline-offset-4 transition-colors hover:text-destructive"
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
              <span className="text-2xl italic">Shelfeed</span>
            </div>
            <p className="text-sm uppercase tracking-wider">Version 2.4.0</p>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
