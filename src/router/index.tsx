import { createBrowserRouter } from 'react-router-dom'
import HomeFeedPage from '@/pages/HomeFeedPage'
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'
import BookSearchPage from '@/pages/BookSearchPage'
import BookDetailPage from '@/pages/BookDetailPage'
import WriteReviewPage from '@/pages/WriteReviewPage'
import ReviewDetailPage from '@/pages/ReviewDetailPage'
import MyProfilePage from '@/pages/MyProfilePage'
import SettingsPage from '@/pages/SettingsPage'
import NotificationsPage from '@/pages/NotificationsPage'
import MyLibraryPage from '@/pages/MyLibraryPage'
import BookReviewsListPage from '@/pages/BookReviewsListPage'
import OnboardingPage from '@/pages/OnboardingPage'
import AuthCallbackPage from '@/pages/AuthCallbackPage'
import PasswordResetRequestPage from '@/pages/PasswordResetRequestPage'
import PasswordResetPage from '@/pages/PasswordResetPage'
import EmailVerificationPage from '@/pages/EmailVerificationPage'
import PasswordChangePage from '@/pages/PasswordChangePage'
import WithdrawPage from '@/pages/WithdrawPage'
import EditProfilePage from '@/pages/EditProfilePage'
import UserProfilePage from '@/pages/UserProfilePage'
import LibraryBookDetailPage from '@/pages/LibraryBookDetailPage'
import UserLibraryPage from '@/pages/UserLibraryPage'
import FollowListPage from '@/pages/FollowListPage'
import ProtectedRoute from '@/components/layout/ProtectedRoute'

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <HomeFeedPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/onboarding',
    element: (
      <ProtectedRoute>
        <OnboardingPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
  },
  {
    path: '/auth/callback/google',
    element: <AuthCallbackPage />,
  },
  {
    path: '/password-reset-request',
    element: <PasswordResetRequestPage />,
  },
  {
    path: '/password-reset',
    element: <PasswordResetPage />,
  },
  {
    path: '/verify-email',
    element: <EmailVerificationPage />,
  },
  {
    path: '/search',
    element: (
      <ProtectedRoute>
        <BookSearchPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/book/:bookId',
    element: (
      <ProtectedRoute>
        <BookDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/book/:bookId/reviews',
    element: (
      <ProtectedRoute>
        <BookReviewsListPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/review/write',
    element: (
      <ProtectedRoute>
        <WriteReviewPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/review/write/:bookId',
    element: (
      <ProtectedRoute>
        <WriteReviewPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/review/:id',
    element: (
      <ProtectedRoute>
        <ReviewDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/review/:reviewId/edit',
    element: (
      <ProtectedRoute>
        <WriteReviewPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/profile',
    element: (
      <ProtectedRoute>
        <MyProfilePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/user/:userId',
    element: (
      <ProtectedRoute>
        <UserProfilePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/user/:userId/library',
    element: (
      <ProtectedRoute>
        <UserLibraryPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/user/:userId/follows',
    element: (
      <ProtectedRoute>
        <FollowListPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/library',
    element: (
      <ProtectedRoute>
        <MyLibraryPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/library/:libraryBookId',
    element: (
      <ProtectedRoute>
        <LibraryBookDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/notifications',
    element: (
      <ProtectedRoute>
        <NotificationsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings',
    element: (
      <ProtectedRoute>
        <SettingsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings/profile',
    element: (
      <ProtectedRoute>
        <EditProfilePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings/password',
    element: (
      <ProtectedRoute>
        <PasswordChangePage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings/withdraw',
    element: (
      <ProtectedRoute>
        <WithdrawPage />
      </ProtectedRoute>
    ),
  },
])
