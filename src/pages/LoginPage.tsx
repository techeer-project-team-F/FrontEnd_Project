import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'

const loginSchema = z.object({
  email: z.string().email('올바른 이메일을 입력하세요'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = (data: LoginForm) => {
    console.log('Login:', data)
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Background (Simulated Feed) */}
      <div className="flex flex-col gap-6 p-4 opacity-40">
        <header className="flex items-center justify-between py-4">
          <h1 className="text-2xl font-bold text-primary">BookLog</h1>
          <span className="material-symbols-outlined text-primary">search</span>
        </header>
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-primary/10 bg-card p-4 shadow-sm">
            <div className="flex gap-4">
              <div className="h-24 w-16 rounded bg-primary/20" />
              <div className="flex flex-col justify-center">
                <h2 className="text-lg font-bold">위대한 개츠비</h2>
                <p className="text-sm text-muted-foreground">F. 스콧 피츠제럴드</p>
              </div>
            </div>
            <p className="mt-3 italic leading-relaxed text-muted-foreground">
              "우리는 과거 속으로 끊임없이 밀려가면서도, 흐름을 거스르는 배처럼 앞으로 나아간다."
            </p>
          </div>
          <div className="rounded-xl border border-primary/10 bg-card p-4 shadow-sm">
            <div className="flex gap-4">
              <div className="h-24 w-16 rounded bg-primary/20" />
              <div className="flex flex-col justify-center">
                <h2 className="text-lg font-bold">데미안</h2>
                <p className="text-sm text-muted-foreground">헤르만 헤세</p>
              </div>
            </div>
            <p className="mt-3 italic leading-relaxed text-muted-foreground">
              "새는 알에서 나오려고 투쟁한다. 알은 세계이다."
            </p>
          </div>
        </div>
      </div>

      {/* Dimmed Overlay */}
      <div className="absolute inset-0 flex flex-col justify-end bg-primary/40 backdrop-blur-[2px]">
        {/* Bottom Sheet */}
        <div className="flex w-full max-h-[85%] flex-col items-stretch overflow-y-auto rounded-t-xl bg-background pb-10 shadow-2xl">
          {/* Handle Bar */}
          <div className="flex h-8 w-full shrink-0 items-center justify-center">
            <div className="h-1.5 w-12 rounded-full bg-primary/20" />
          </div>

          <div className="px-6 pt-4">
            <h3 className="pb-8 text-center text-2xl font-bold leading-tight">
              로그인하고 감상을 기록해보세요
            </h3>

            {/* Google Login */}
            <button className="flex h-14 w-full items-center justify-center gap-3 rounded-xl border border-primary/10 bg-card text-base font-semibold transition-colors hover:bg-primary/5">
              <svg className="h-6 w-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Google로 로그인</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-primary/10" />
              <span className="mx-4 shrink-0 text-sm font-medium">또는</span>
              <div className="flex-grow border-t border-primary/10" />
            </div>

            {/* Email Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="ml-1 text-sm font-semibold">이메일</label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="email@example.com"
                  className="w-full rounded-xl border border-primary/10 bg-card p-4 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                />
                {errors.email && (
                  <p className="ml-1 text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="ml-1 text-sm font-semibold">비밀번호</label>
                <input
                  {...register('password')}
                  type="password"
                  placeholder="비밀번호를 입력하세요"
                  className="w-full rounded-xl border border-primary/10 bg-card p-4 outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary"
                />
                {errors.password && (
                  <p className="ml-1 text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>
              <button
                type="submit"
                className="mt-4 h-14 w-full rounded-xl bg-primary text-lg font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
              >
                로그인
              </button>
            </form>

            {/* Footer Link */}
            <div className="mb-4 mt-8 text-center">
              <p className="text-sm">
                계정이 없으신가요?
                <Link to="/signup" className="ml-1 font-bold hover:underline">
                  회원가입
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
