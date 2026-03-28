import { mockUsers, mockBooks } from '@/mocks/data'
import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'

const user = mockUsers[1] // 책벌레지니

const monthlyStats = [
  { month: '1월', height: 40 },
  { month: '2월', height: 60 },
  { month: '3월', height: 50 },
  { month: '4월', height: 90 },
  { month: '5월', height: 75 },
  { month: '6월', height: 65 },
]

const genreStats = [
  { label: '소설 60%', opacity: '' },
  { label: '에세이 25%', opacity: '/50' },
  { label: '인문 15%', opacity: '/20' },
]

const timelineEntries = [
  {
    book: mockBooks[1],
    date: '2024년 6월 15일',
    excerpt: '데이지를 향한 개츠비의 맹목적인 열망은 시대를 관통하는 슬픈 낭만이다...',
  },
  {
    book: mockBooks[2],
    date: '2024년 5월 28일',
    excerpt: '홀든 코필드의 방황이 낯설지 않게 느껴지는 밤. 어른이 된다는 것은 무엇일까.',
  },
  {
    book: mockBooks[0],
    date: '2024년 5월 10일',
    excerpt: '새는 알을 깨고 나오기 위해 투쟁한다. 내 안의 아브락사스를 찾아서.',
  },
]

export default function MyProfilePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader
        title="BookLog"
        rightAction={
          <button className="flex size-10 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10">
            <span className="material-symbols-outlined">share</span>
          </button>
        }
        className="justify-between"
      />

      <main className="flex-1 overflow-y-auto pb-24">
        {/* Profile Section */}
        <div className="flex flex-col items-center gap-4 p-6">
          <div className="relative">
            <div className="size-32 overflow-hidden rounded-full border-4 border-primary/10">
              {user.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt={user.nickname}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center bg-primary/10">
                  <span className="material-symbols-outlined text-4xl text-primary/40">person</span>
                </div>
              )}
            </div>
            <div className="absolute bottom-1 right-1 rounded-full border-2 border-background bg-primary p-1.5 text-primary-foreground">
              <span className="material-symbols-outlined block text-xs">edit</span>
            </div>
          </div>

          <div className="flex flex-col items-center text-center">
            <h1 className="text-2xl font-bold tracking-tight">{user.nickname}</h1>
            <p className="mt-2 max-w-[280px] text-sm italic leading-relaxed text-primary/70">
              "좋은 책은 마음을 풍요롭게 합니다. 고전 문학을 즐겨 읽어요."
            </p>
          </div>

          <button className="flex h-10 w-full max-w-[200px] items-center justify-center rounded-lg border border-primary text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground">
            프로필 편집
          </button>

          <div className="flex cursor-pointer gap-4 text-sm font-medium text-primary/80 underline underline-offset-4">
            <span>팔로워 {user.followerCount}</span>
            <span className="text-primary/30">|</span>
            <span>팔로잉 {user.followingCount}</span>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="mb-6 grid grid-cols-3 gap-3 px-4">
          {[
            { label: '올해 읽은 책', value: '12권' },
            { label: '총 완독', value: '47권' },
            { label: '감상', value: '63개' },
          ].map(stat => (
            <div
              key={stat.label}
              className="flex flex-col items-center justify-center gap-1 rounded-xl border border-primary/10 bg-card p-4 shadow-sm"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary/60">
                {stat.label}
              </p>
              <p className="text-xl font-bold text-primary">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Reading Statistics */}
        <div className="mb-8 px-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold">나의 독서 통계</h3>
            <span className="material-symbols-outlined text-primary/40">chevron_right</span>
          </div>
          <div className="rounded-xl border border-primary/10 bg-card p-5 shadow-sm">
            {/* Bar Chart */}
            <div className="mb-2 flex h-32 items-end justify-between gap-2">
              {monthlyStats.map(stat => (
                <div key={stat.month} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-sm bg-primary"
                    style={{
                      height: `${stat.height}%`,
                      opacity: stat.height / 100,
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground">{stat.month}</span>
                </div>
              ))}
            </div>
            {/* Genre Legend */}
            <div className="mt-6 flex items-center justify-around border-t border-primary/5 pt-4">
              {genreStats.map(genre => (
                <div key={genre.label} className="flex items-center gap-2">
                  <div className={`size-2 rounded-full bg-primary${genre.opacity}`} />
                  <span className="text-xs text-muted-foreground">{genre.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="px-4 pb-4">
          <h3 className="mb-4 text-lg font-bold">공개 감상 타임라인</h3>
          <div className="space-y-4">
            {timelineEntries.map((entry, index) => (
              <div
                key={entry.book.isbn}
                className="flex gap-4 rounded-xl border border-primary/10 bg-card p-4 shadow-sm"
                style={{ opacity: 1 - index * 0.1 }}
              >
                <div className="h-24 w-16 shrink-0 overflow-hidden rounded bg-primary/10">
                  <img
                    src={entry.book.coverImageUrl}
                    alt={entry.book.title}
                    className="size-full object-cover"
                  />
                </div>
                <div className="flex flex-col justify-between py-1">
                  <div>
                    <h4 className="text-sm font-bold line-clamp-1">{entry.book.title}</h4>
                    <p className="text-[11px] font-medium text-primary/50">{entry.date}</p>
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                      {entry.excerpt}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
