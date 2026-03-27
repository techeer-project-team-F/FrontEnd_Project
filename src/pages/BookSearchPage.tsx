import { useState } from 'react'
import { mockSearchResults } from '@/mocks/data'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'
import BookListItem from '@/components/common/BookListItem'

export default function BookSearchPage() {
  const [recentKeywords, setRecentKeywords] = useState(['데미안', '헤르만 헤세', '자기계발'])
  const [searchQuery, setSearchQuery] = useState('')

  const removeKeyword = (keyword: string) => {
    setRecentKeywords(prev => prev.filter(k => k !== keyword))
  }

  const clearAllKeywords = () => {
    setRecentKeywords([])
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader title="BookLog" showBack />

      {/* Search Bar */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex h-12 w-full items-stretch rounded-xl border border-primary/10 bg-primary/5">
          <div className="flex items-center justify-center pl-4 text-primary/60">
            <span className="material-symbols-outlined text-[22px]">search</span>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="도서 제목, 저자, ISBN 검색"
            className="h-full min-w-0 flex-1 border-none bg-transparent px-3 text-base font-normal outline-none placeholder:text-primary/40 focus:ring-0"
          />
          <div className="flex cursor-pointer items-center justify-center pr-4 text-primary">
            <span className="material-symbols-outlined text-[24px]">barcode_scanner</span>
          </div>
        </div>
      </div>

      {/* Recent Keywords */}
      {recentKeywords.length > 0 && (
        <div className="border-b border-border px-4 py-4">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary/70">
              최근 검색어
            </h4>
            <button
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
                <p className="text-sm font-medium leading-normal text-primary">{keyword}</p>
                <button onClick={() => removeKeyword(keyword)}>
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
        <div className="flex flex-col">
          {mockSearchResults.map(book => (
            <BookListItem key={book.isbn} book={book} />
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
