import AppHeader from '@/components/layout/AppHeader'
import BottomNav from '@/components/layout/BottomNav'

export default function ReviewDetailPage() {
  const review = {
    book: {
      title: '데미안',
      author: '헤르만 헤세',
      coverImageUrl:
        'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80',
      rating: 5.0,
      status: '다 읽음',
    },
    content: `알을 깨고 나오는 새의 투쟁처럼, 자아를 찾아가는 치열한 성장의 기록입니다. 싱클레어가 데미안을 만나며 겪는 내면의 변화는 시대를 초월한 깊은 울림을 줍니다.

우리는 모두 각자의 ‘가인’의 표식을 지닌 채, 고정관념이라는 알 속에 갇혀 살아가고 있는지도 모릅니다. 헤세는 이 책을 통해 우리에게 묻습니다. 당신은 진정으로 자신의 길을 걷고 있는가?`,
    quote:
      '새는 알에서 나오려고 투쟁한다. 알은 세계이다. 태어나려는 자는 하나의 세계를 깨뜨려야 한다. 새는 신에게로 날아간다. 그 신의 이름은 아브락사스다.',
    quoteSource: '본문 중에서',
    tags: ['고전', '성장소설', '헤세'],
    likes: 124,
    commentsCount: 12,
    comments: [
      {
        id: 1,
        author: '김지민',
        time: '2시간 전',
        content: '이 문장은 읽을 때마다 마음에 깊게 남는 것 같아요. 정말 최고의 고전입니다.',
      },
      {
        id: 2,
        author: '박선영',
        time: '5시간 전',
        content: '저도 다시 한 번 꺼내 읽고 싶어졌어요.',
      },
    ],
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader title="데미안" showBack />

      <main className="flex-1 overflow-y-auto pb-24">
        {/* Book Card */}
        <section className="px-5 py-5">
          <div className="overflow-hidden rounded-[28px] bg-card shadow-sm">
            <div className="bg-muted/30 px-6 py-8">
              <div className="mx-auto aspect-[2/3] w-[62%] max-w-[260px] overflow-hidden rounded-md shadow-xl">
                <img
                  src={review.book.coverImageUrl}
                  alt={review.book.title}
                  className="size-full object-cover"
                />
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                  {review.book.status}
                </span>

                <div className="flex items-center gap-1 rounded-full bg-primary/5 px-3 py-1.5 text-sm font-bold text-primary">
                  <span
                    className="material-symbols-outlined text-[18px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                  <span>{review.book.rating.toFixed(1)}</span>
                </div>
              </div>

              <h1 className="text-3xl font-bold tracking-tight">{review.book.title}</h1>
              <p className="mt-2 text-lg font-medium text-muted-foreground">{review.book.author}</p>
            </div>
          </div>
        </section>

        {/* Review Content */}
        <section className="px-5 py-3">
          <h2 className="mb-4 text-2xl font-bold">나의 감상</h2>
          <div className="space-y-5 text-lg leading-8 text-foreground/90">
            {review.content.split('\n\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </section>

        {/* Quote Card */}
        <section className="px-5 py-5">
          <div className="rounded-[24px] bg-primary/5 p-5">
            <div className="mb-2 text-primary/20">
              <span className="material-symbols-outlined text-[38px]">format_quote</span>
            </div>

            <div className="border-l-4 border-primary pl-4">
              <p className="text-xl italic leading-9 text-foreground/85">{review.quote}</p>
              <p className="mt-4 text-base text-muted-foreground">{review.quoteSource}</p>
            </div>
          </div>
        </section>

        {/* Tags */}
        <section className="px-5 py-2">
          <div className="flex flex-wrap gap-2">
            {review.tags.map(tag => (
              <span
                key={tag}
                className="rounded-xl bg-primary/10 px-4 py-1.5 text-sm font-semibold text-primary/80"
              >
                #{tag}
              </span>
            ))}
          </div>
        </section>

        {/* Reactions */}
        <section className="mt-4 border-t border-border px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5 text-sm font-semibold text-muted-foreground">
              <button className="flex items-center gap-1.5 transition-colors hover:text-primary">
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  favorite
                </span>
                <span>{review.likes}</span>
              </button>

              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[20px]">chat_bubble</span>
                <span>{review.commentsCount}</span>
              </div>
            </div>

            <button className="text-muted-foreground transition-colors hover:text-primary">
              <span className="material-symbols-outlined text-[22px]">share</span>
            </button>
          </div>
        </section>

        {/* Comments */}
        <section className="px-5 pb-6 pt-2">
          <h3 className="mb-4 text-lg font-bold">댓글 {review.commentsCount}개</h3>

          <div className="border-t border-border">
            {review.comments.map(comment => (
              <div key={comment.id} className="border-b border-border py-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {comment.author[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{comment.author}</p>
                      <p className="text-xs text-muted-foreground">{comment.time}</p>
                    </div>
                  </div>
                </div>

                <p className="pl-[52px] text-sm leading-6 text-foreground/85">{comment.content}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Comment Input */}
        <section className="border-t border-border px-5 py-4">
          <div className="flex items-center gap-3 rounded-full border border-primary/10 bg-card px-4 py-3">
            <input
              type="text"
              placeholder="따뜻한 댓글을 남겨주세요"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            />
            <button className="text-sm font-bold text-primary transition-colors hover:text-primary/80">
              게시
            </button>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
