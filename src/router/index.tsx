import { createBrowserRouter } from 'react-router-dom'
import HomeFeedPage from '@/pages/HomeFeedPage'
import LoginPage from '@/pages/LoginPage'
import BookSearchPage from '@/pages/BookSearchPage'
import BookDetailPage from '@/pages/BookDetailPage'
import WriteReviewPage from '@/pages/WriteReviewPage'
import ReviewDetailPage from '@/pages/ReviewDetailPage'
import MyProfilePage from '@/pages/MyProfilePage'
import SettingsPage from '@/pages/SettingsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomeFeedPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/search',
    element: <BookSearchPage />,
  },
  {
    path: '/book/:id',
    element: <BookDetailPage />,
  },
  {
    path: '/review/write',
    element: <WriteReviewPage />,
  },
  {
    path: '/review/:id',
    element: <ReviewDetailPage />,
  },
  {
    path: '/my-profile',
    element: <MyProfilePage />,
  },
  {
    path: '/settings',
    element: <SettingsPage />,
  },
])
