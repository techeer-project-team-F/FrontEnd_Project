import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import { searchBooks, type BookSummary } from '@/api/book'

const RECENT_KEYWORDS_KEY = 'booklog-recent-keywords'
const MAX_RECENT_KEYWORDS = 10

function loadRecentKeywords(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEYWORDS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter((k): k is string => typeof k === 'string').slice(0, MAX_RECENT_KEYWORDS)
      : []
  } catch {
    return []
  }
}

function saveRecentKeywords(keywords: string[]) {
  try {
    localStorage.setItem(RECENT_KEYWORDS_KEY, JSON.stringify(keywords))
  } catch {
    // localStorage 쓰기 실패 시 무시 (private 모드, 용량 초과 등)
  }
}

export default function BookSearchPage() {
  const [recentKeywords, setRecentKeywords] = useState<string[]>(() => loadRecentKeywords())
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<BookSummary[]>([])
  const [nextCursor, setNextCursor] = useState<number | null>(null)
  const [hasNext, setHasNext] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null)

  const trimmedQuery = searchQuery.trim()
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  // observer 콜백에서 최신 state를 읽기 위한 ref (deps 폭주 방지)
  const stateRef = useRef({
    hasNext,
    isLoading,
    isLoadingMore,
    nextCursor,
    trimmedQuery,
    loadMoreError,
  })
  stateRef.current = {
    hasNext,
    isLoading,
    isLoadingMore,
    nextCursor,
    trimmedQuery,
    loadMoreError,
  }

  // 검색어 debounce + AbortController로 stale 응답 방지
  useEffect(() => {
    if (!trimmedQuery) {
      setResults([])
      setNextCursor(null)
      setHasNext(false)
      setErrorMessage(null)
      setLoadMoreError(null)
      return
    }

    const controller = new AbortController()
    setIsLoading(true)
    setErrorMessage(null)
    setLoadMoreError(null)

    const handle = setTimeout(async () => {
      try {
        const response = await searchBooks(trimmedQuery, 20, null, controller.signal)
        if (controller.signal.aborted) return
        setResults(response.content)
        setNextCursor(response.nextCursor)
        setHasNext(response.hasNext)
      } catch (error) {
        if (axios.isCancel(error) || controller.signal.aborted) return
        setErrorMessage(error instanceof Error ? error.message : '검색에 실패했습니다.')
        setResults([])
        setNextCursor(null)
        setHasNext(false)
      } finally {
        if (!controller.signal.aborted) setIsLoading(false)
      }
    }, 400)

    return () => {
      clearTimeout(handle)
      controller.abort()
    }
  }, [trimmedQuery])

  // 다음 페이지 로딩 (observer + 수동 retry에서 공유)
  const fetchMore = useCallback(async () => {
    const s = stateRef.current
    if (s.isLoadingMore || s.isLoading || !s.hasNext) return
    const requestedQuery = s.trimmedQuery
    const requestedCursor = s.nextCursor
    setIsLoadingMore(true)
    setLoadMoreError(null)
    try {
      const response = await searchBooks(requestedQuery, 20, requestedCursor)
      // stale guard: 검색어가 바뀐 경우 결과 버림
      if (stateRef.current.trimmedQuery !== requestedQuery) return
      setResults(prev => [...prev, ...response.content])
      setNextCursor(response.nextCursor)
      setHasNext(response.hasNext)
    } catch (error) {
      if (stateRef.current.trimmedQuery !== requestedQuery) return
      setLoadMoreError(error instanceof Error ? error.message : '추가 로딩에 실패했습니다.')
    } finally {
      setIsLoadingMore(false)
    }
  }, [])

  // IntersectionObserver는 단 한 번만 생성, 최신값은 ref로 읽기
  useEffect(() => {
    const sentinel = loadMoreRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      entries => {
        if (!entries[0].isIntersecting) return
        if (stateRef.current.loadMoreError) return
        fetchMore()
      },
      { rootMargin: '200px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [fetchMore])

  const retryLoadMore = () => {
    setLoadMoreError(null)
    fetchMore()
  }

  const commitKeyword = (keyword: string) => {
    const value = keyword.trim()
    if (!value) return
    setRecentKeywords(prev => {
      if (prev[0] === value) return prev
      const next = [value, ...prev.filter(k => k !== value)].slice(0, MAX_RECENT_KEYWORDS)
      saveRecentKeywords(next)
      return next
    })
  }

  const removeKeyword = (keyword: string) => {
    setRecentKeywords(prev => {
      const next = prev.filter(k => k !== keyword)
      saveRecentKeywords(next)
      return next
    })
  }

  const clearAllKeywords = () => {
    setRecentKeywords([])
    saveRecentKeywords([])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && trimmedQuery) {
      commitKeyword(trimmedQuery)
    }
  }

  const handleKeywordClick = (keyword: string) => {
    setSearchQuery(keyword)
    commitKeyword(keyword)
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader title="BookLog" showBack />

      {/* Search Bar */}
      <div className="border-b border-border px-4 py-3" role="search">
        <label htmlFor="book-search-input" className="sr-only">
          도서 검색
        </label>
        <div className="flex h-12 w-full items-stretch rounded-xl border border-primary/10 bg-primary/5">
          <div className="flex items-center justify-center pl-4 text-primary/60">
            <span className="material-symbols-outlined text-[22px]">search</span>
          </div>
          <input
            id="book-search-input"
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="도서 제목, 저자, ISBN 검색"
            placeholder="도서 제목, 저자, ISBN 검색"
            className="h-full min-w-0 flex-1 border-none bg-transparent px-3 text-base font-normal outline-none placeholder:text-primary/40 focus:ring-0"
          />
          <button
            type="button"
            disabled
            aria-label="바코드 스캔 (준비 중)"
            className="flex items-center justify-center pr-4 text-primary/40"
          >
            <span className="material-symbols-outlined text-[24px]">barcode_scanner</span>
          </button>
        </div>
      </div>

      {/* Recent Keywords — 검색어가 비어있을 때만 표시 */}
      {!trimmedQuery && recentKeywords.length > 0 && (
        <div className="border-b border-border px-4 py-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary/70">
              최근 검색어
            </h4>
            <button
              type="button"
              onClick={clearAllKeywords}
              className="text-xs text-primary/40 hover:text-primary"
            >
              전체 삭제
            </button>
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto py-1">
            {recentKeywords.map(keyword => (
              <div
                key={keyword}
                className="flex h-8 shrink-0 items-center justify-center gap-x-1 rounded-full border border-primary/5 bg-primary/10 px-3"
              >
                <button
                  type="button"
                  onClick={() => handleKeywordClick(keyword)}
                  className="text-sm font-medium leading-normal text-primary"
                >
                  {keyword}
                </button>
                <button
                  type="button"
                  onClick={() => removeKeyword(keyword)}
                  aria-label={`'${keyword}' 최근 검색어 삭제`}
                >
                  <span className="material-symbols-outlined cursor-pointer text-[16px] text-primary/60">
                    close
                  </span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      <main className="flex-1 overflow-y-auto px-4 pb-24">
        {trimmedQuery && isLoading && results.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">검색 중...</p>
        )}

        {trimmedQuery && !isLoading && errorMessage && (
          <p role="alert" className="py-10 text-center text-sm text-destructive">
            {errorMessage}
          </p>
        )}

        {trimmedQuery && !isLoading && !errorMessage && results.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-muted-foreground/30">
              search_off
            </span>
            <p className="max-w-full truncate text-sm text-muted-foreground">
              '{trimmedQuery}'에 대한 검색 결과가 없습니다.
            </p>
          </div>
        )}

        {results.length > 0 && (
          <div className="flex flex-col">
            {results.map(book => (
              <Link
                key={book.bookId}
                to={`/book/${book.bookId}`}
                onClick={() => commitKeyword(trimmedQuery)}
                className="flex items-start gap-4 border-b border-primary/5 py-5"
              >
                <div className="h-36 w-24 shrink-0 overflow-hidden rounded-lg bg-primary/5 shadow-sm">
                  {book.coverImageUrl ? (
                    <img
                      src={book.coverImageUrl}
                      alt={book.title}
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <span className="material-symbols-outlined text-2xl text-muted-foreground/40">
                        menu_book
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <h3 className="line-clamp-2 text-lg font-bold leading-tight text-primary">
                    {book.title}
                  </h3>
                  <p className="truncate text-sm text-muted-foreground">{book.author} 저</p>
                  <p className="truncate text-xs text-muted-foreground/70">{book.publisher}</p>
                  {book.inMyLibrary && (
                    <span className="mt-1 w-fit rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      내 서재에 있음
                    </span>
                  )}
                </div>
              </Link>
            ))}

            {/* 무한 스크롤 sentinel */}
            <div ref={loadMoreRef} className="h-10" />

            {isLoadingMore && (
              <p className="py-4 text-center text-xs text-muted-foreground">더 불러오는 중...</p>
            )}

            {loadMoreError && !isLoadingMore && (
              <div className="flex flex-col items-center gap-2 py-4">
                <p role="alert" className="text-sm text-destructive">
                  {loadMoreError}
                </p>
                <button
                  type="button"
                  onClick={retryLoadMore}
                  className="rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20"
                >
                  다시 불러오기
                </button>
              </div>
            )}

            {!hasNext && !isLoadingMore && !loadMoreError && (
              <p className="py-4 text-center text-xs text-muted-foreground/50">
                모든 결과를 확인했습니다
              </p>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
