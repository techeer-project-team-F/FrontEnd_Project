import { defineConfig } from 'vitest/config'
import path from 'path'

// 단위 테스트용 Vitest 설정. 브라우저 모드(@vitest/browser-playwright)는 storybook
// 통합 전용으로 두고, 본 설정은 node 환경에서 axios 인터셉터/race condition 같은
// 순수 로직 테스트를 빠르게 돌리는 데 집중한다.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
})
