import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import AppHeader from '@/components/layout/AppHeader'
import { requestPasswordReset } from '@/api/auth'

const schema = z.object({
  email: z.string().email('올바른 이메일 형식을 입력해주세요'),
})

type FormData = z.infer<typeof schema>

export default function PasswordResetRequestPage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    if (isLoading) return
    setIsLoading(true)
    setErrorMessage(null)
    try {
      await requestPasswordReset(data.email)
      setIsSent(true)
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '요청에 실패했습니다. 잠시 후 다시 시도해주세요.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader title="비밀번호 재설정" showBack />

      <main className="flex flex-1 flex-col px-6 pt-12">
        {isSent ? (
          <div className="flex flex-col items-center gap-4 pt-16 text-center">
            <span className="material-symbols-outlined text-5xl text-primary">mark_email_read</span>
            <h2 className="text-2xl font-bold text-foreground">메일을 보냈습니다</h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              입력하신 이메일로 비밀번호 재설정 링크를
              <br />
              보내드렸습니다. 메일함을 확인해주세요.
            </p>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="mt-4 rounded-xl bg-primary px-8 py-3 text-base font-bold text-primary-foreground transition-all hover:opacity-95"
            >
              로그인으로 돌아가기
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-foreground">비밀번호 재설정</h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">
              가입 시 사용한 이메일을 입력하시면
              <br />
              비밀번호 재설정 링크를 보내드립니다.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-10 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label htmlFor="reset-email" className="ml-1 text-sm font-semibold">
                  이메일
                </label>
                <input
                  id="reset-email"
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  placeholder="email@example.com"
                  className="w-full rounded-xl border-none bg-card px-5 py-4 shadow-sm transition-all placeholder:text-muted-foreground/40 focus:ring-2 focus:ring-primary/20"
                />
                {errors.email && (
                  <p role="alert" className="ml-1 text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {errorMessage && (
                <p
                  role="alert"
                  className="rounded-lg bg-destructive/10 px-4 py-3 text-center text-sm text-destructive"
                >
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="mt-4 w-full rounded-xl bg-primary py-4 text-lg font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:opacity-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? '전송 중...' : '재설정 링크 보내기'}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  )
}
