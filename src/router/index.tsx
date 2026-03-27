import { createBrowserRouter } from 'react-router-dom'
import HomeFeedPage from '@/pages/HomeFeedPage'
import LoginPage from '@/pages/LoginPage'
import BookSearchPage from '@/pages/BookSearchPage'
import BookDetailPage from '@/pages/BookDetailPage'

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
])
