import BottomNav from '@/components/layout/BottomNav'

const yearlyBooks = [
  { title: '어린 왕자', width: 'w-[92%]', bg: '#2B2626', text: 'text-white' },
  { title: '모비 딕', width: 'w-[88%]', bg: '#314244', text: 'text-white' },
  { title: '이방인', width: 'w-[90%]', bg: '#4B2E26', text: 'text-white' },
  { title: '위대한 개츠비', width: 'w-[86%]', bg: '#C2A065', text: 'text-white' },
  { title: '위대한 개츠비', width: 'w-[91%]', bg: '#6C4B3F', text: 'text-white' },
  { title: '호밀밭의 파수꾼', width: 'w-[84%]', bg: '#9B8378', text: 'text-white' },
  { title: '인간 실격', width: 'w-[89%]', bg: '#CBBDB8', text: 'text-foreground' },
  { title: '데미안', width: 'w-[82%]', bg: '#E2DBD8', text: 'text-primary' },
]

export default function MyProfilePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="grid grid-cols-3 items-center px-4 py-3">
          <div className="flex justify-start">
            <button className="flex size-10 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10">
              <span className="material-symbols-outlined">settings</span>
            </button>
          </div>

          <div className="flex justify-center">
            <h1 className="text-2xl font-bold tracking-tight text-primary">BookLog</h1>
          </div>

          <div className="flex justify-end">
            <button className="flex size-10 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10">
              <span className="material-symbols-outlined">share</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        {/* Profile Intro */}
        <section className="px-6 pt-8 text-center">
          <div className="relative mx-auto mb-5 flex h-36 w-36 items-center justify-center rounded-full bg-primary/10">
            <img
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80"
              alt="프로필 이미지"
              className="h-32 w-32 rounded-full object-cover"
            />

            <button className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-sm">
              <span className="material-symbols-outlined text-[18px]">edit</span>
            </button>
          </div>

          <h1 className="text-3xl font-bold tracking-tight">책벌레지니</h1>
          <p className="mx-auto mt-3 max-w-[320px] text-base leading-7 text-primary/80">
            "좋은 책은 마음을 풍요롭게 합니다. 고전 문학을 즐겨 읽어요."
          </p>

          <div className="mt-6 flex items-center justify-center gap-4 text-base font-medium text-primary/80">
            <button className="hover:underline">팔로워 128</button>
            <span className="text-primary/30">|</span>
            <button className="hover:underline">팔로잉 56</button>
          </div>
        </section>

        {/* Stats */}
        <section className="px-6 pt-8">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-[24px] bg-card px-3 py-5 text-center shadow-sm">
              <p className="text-xs font-semibold text-primary/60">올해 읽은 책</p>
              <p className="mt-2 text-3xl font-bold text-primary">8권</p>
            </div>

            <div className="rounded-[24px] bg-card px-3 py-5 text-center shadow-sm">
              <p className="text-xs font-semibold text-primary/60">총 완독</p>
              <p className="mt-2 text-3xl font-bold text-primary">47권</p>
            </div>

            <div className="rounded-[24px] bg-card px-3 py-5 text-center shadow-sm">
              <p className="text-xs font-semibold text-primary/60">감상</p>
              <p className="mt-2 text-3xl font-bold text-primary">63개</p>
            </div>
          </div>
        </section>

        {/* Yearly Reading Stack */}
        <section className="px-6 pb-8 pt-10">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold text-primary/90">Your Wisdom Tower</h2>
          </div>

          <div className="flex flex-col-reverse items-center">
            {yearlyBooks.map((book, index) => (
              <div
                key={`${book.title}-${index}`}
                className={`relative ${book.width} h-[58px]`}
                style={{ marginTop: index === 0 ? 0 : '-2px' }}
              >
                <div
                  className={`flex h-full w-full items-center justify-center rounded-[16px] text-lg font-bold shadow-md ${book.text}`}
                  style={{ backgroundColor: book.bg }}
                >
                  {book.title}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
