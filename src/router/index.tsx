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
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
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
    path: '/book/:id',
    element: (
      <ProtectedRoute>
        <BookDetailPage />
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
    path: '/review/:id',
    element: (
      <ProtectedRoute>
        <ReviewDetailPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/my-profile',
    element: (
      <ProtectedRoute>
        <MyProfilePage />
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
])
