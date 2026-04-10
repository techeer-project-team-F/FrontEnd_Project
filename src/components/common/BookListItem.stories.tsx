import type { Meta, StoryObj } from '@storybook/react-vite'
import { MemoryRouter } from 'react-router-dom'
import { mockBooks } from '@/mocks/data'
import BookListItem from './BookListItem'

const meta: Meta<typeof BookListItem> = {
  title: 'Common/BookListItem',
  component: BookListItem,
  decorators: [
    Story => (
      <MemoryRouter>
        <div className="mx-auto max-w-md bg-background p-4">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta

type Story = StoryObj<typeof BookListItem>

// 실제 앱 mock 데이터의 첫 번째 책 (데미안)을 기준점으로 사용
const baseBook = mockBooks[0]

/**
 * 정상 케이스. 실제 앱 검색 페이지에 노출되는 "데미안" 그대로.
 * 제목/저자/출판사/페이지수/평점/리뷰수 모든 필드가 적절한 값으로 채워진 기본 상태.
 */
export const Default: Story = {
  args: { book: baseBook },
}

/**
 * 책 제목이 매우 긴 경우 (80자 내외).
 * 실제 알라딘 API에는 부제가 길게 붙는 책이 많은데, 이 경우
 * 우측 텍스트 영역이 표지 높이(h-36 = 144px)를 넘어가면서
 * 리스트 행의 세로 리듬이 무너지지 않는지 확인.
 */
export const LongTitle: Story = {
  args: {
    book: {
      ...baseBook,
      title:
        '데미안: 에밀 싱클레어의 젊은 날의 이야기 — 자신에게 이르는 길을 찾아 헤매는 한 소년의 영혼의 고백',
    },
  },
}

/**
 * 저자명이 매우 긴 경우. 여러 공저자가 있거나 번역자까지 포함된 경우를 시뮬레이션.
 * "author 저" 한 줄이 카드 바깥으로 밀려나지 않는지 확인.
 */
export const LongAuthor: Story = {
  args: {
    book: {
      ...baseBook,
      author: '아서 코난 도일, 아가사 크리스티, 레이먼드 챈들러, 대실 해밋, 엘러리 퀸',
    },
  },
}

/**
 * 출판사명 + 페이지수 조합이 길어지는 경우.
 * "{publisher} · {pageCount}p" 포맷이 한 줄로 유지되는지 확인.
 */
export const LongPublisher: Story = {
  args: {
    book: {
      ...baseBook,
      publisher: '한국문학번역원출판부 협동조합',
      pageCount: 1280,
    },
  },
}

/**
 * 리뷰 수가 매우 많은 경우 (베스트셀러 시나리오).
 * toLocaleString()으로 콤마 포맷이 적용되는지,
 * "(999,999 reviews)" 텍스트가 카드 바깥으로 밀려나지 않는지 확인.
 */
export const HugeReviewCount: Story = {
  args: {
    book: {
      ...baseBook,
      reviewCount: 999999,
    },
  },
}

/**
 * 평점이 없는 경우 (rating이 undefined).
 * 컴포넌트 하단의 별 + 평점 숫자 + 리뷰수 영역 전체가 렌더링되지 않아야 함.
 * 아직 아무도 평가하지 않은 신간 도서 시나리오.
 */
export const NoRating: Story = {
  args: {
    book: {
      ...baseBook,
      rating: undefined,
      reviewCount: undefined,
    },
  },
}

/**
 * 페이지수가 없는 경우. "· {pageCount}p" 부분이 사라지고 출판사만 표시돼야 함.
 * 옛날 책이나 페이지 정보가 누락된 전자책 시나리오.
 */
export const NoPageCount: Story = {
  args: {
    book: {
      ...baseBook,
      pageCount: undefined,
    },
  },
}

/**
 * 평점은 있지만 리뷰수는 없는 경우.
 * "(N reviews)" 부분만 사라지고 평점/별/숫자는 그대로 노출돼야 함.
 */
export const RatingWithoutReviewCount: Story = {
  args: {
    book: {
      ...baseBook,
      reviewCount: undefined,
    },
  },
}

/**
 * 표지 이미지 로딩 실패 상황.
 * 존재하지 않는 도메인을 URL로 주고,
 * img 로드 실패 시에도 회색 배경 박스(bg-primary/5)가 유지돼
 * 카드 레이아웃이 무너지지 않는지 확인.
 */
export const BrokenCoverImage: Story = {
  args: {
    book: {
      ...baseBook,
      coverImageUrl: 'https://invalid-domain-that-does-not-exist.example/cover.jpg',
    },
  },
}

/**
 * 실제 앱의 검색 결과/서재 페이지 시뮬레이션.
 * mockBooks 전체(7권)를 리스트로 쌓아 시각적 리듬을 검증한다.
 * 실제 앱 스크린샷과 동일한 모습이 나와야 한다.
 */
export const RealisticList: Story = {
  render: () => (
    <div>
      {mockBooks.map(book => (
        <BookListItem key={book.isbn} book={book} />
      ))}
    </div>
  ),
}

/**
 * 극단 케이스를 섞어 넣은 리스트. 정상 책 사이에
 * 긴 제목 / 평점 없음 / 표지 없음 등이 끼어들 때
 * 리스트 전체 리듬이 어떻게 버티는지 한눈에 볼 수 있다.
 * 발표 시연용 — "실전에서 이런 데이터가 섞여 들어오면 어떻게 보이는가" 연출.
 */
export const MixedEdgeCases: Story = {
  render: () => (
    <div>
      <BookListItem book={mockBooks[0]} />
      <BookListItem
        book={{
          ...mockBooks[1],
          title:
            '위대한 개츠비: 1920년대 미국 재즈 시대를 배경으로 펼쳐지는 한 남자의 비극적 사랑 이야기와 아메리칸 드림의 허상',
        }}
      />
      <BookListItem
        book={{
          ...mockBooks[2],
          rating: undefined,
          reviewCount: undefined,
        }}
      />
      <BookListItem
        book={{
          ...mockBooks[3],
          reviewCount: 999999,
        }}
      />
      <BookListItem
        book={{
          ...mockBooks[4],
          pageCount: undefined,
        }}
      />
    </div>
  ),
}
