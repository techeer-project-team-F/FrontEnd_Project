import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: number
  nickname: string
  profileImageUrl?: string
  email?: string
  bio?: string | null
  emailVerified?: boolean
  onboardingCompleted?: boolean
  authProvider?: 'EMAIL' | 'GOOGLE'
}

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  setAuth: (user: User, accessToken: string) => void
  clearAuth: () => void
  completeOnboarding: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
      clearAuth: () => {
        set({ user: null, accessToken: null, isAuthenticated: false })
        useAuthStore.persist.clearStorage?.()
      },
      completeOnboarding: () =>
        set(state => ({
          user: state.user ? { ...state.user, onboardingCompleted: true } : null,
        })),
    }),
    {
      name: 'auth-storage',
      partialize: state => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
