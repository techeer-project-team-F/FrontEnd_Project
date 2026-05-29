import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'node:url'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import { playwright } from '@vitest/browser-playwright'
const dirname =
  typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url))

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // 무거운 의존성을 별도 vendor 청크로 분리해 초기 로드/캐시 효율을 높인다.
        // (vitest/config 타입이 객체 형태 manualChunks를 함수형으로 좁혀 잡으므로 함수형으로 작성한다.)
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('@zxing')) return 'scanner-vendor'
          if (id.includes('@tanstack')) return 'query-vendor'
          if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('/zod/'))
            return 'form-vendor'
          if (id.includes('@radix-ui') || id.includes('lucide-react')) return 'ui-vendor'
          if (
            id.includes('react-router') ||
            id.includes('react-dom') ||
            id.includes('/react/') ||
            id.includes('scheduler')
          )
            return 'react-vendor'
          return undefined
        },
      },
    },
  },
  test: {
    projects: [
      {
        extends: true,
        plugins: [
          // The plugin will run tests for the stories defined in your Storybook config
          // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
          storybookTest({
            configDir: path.join(dirname, '.storybook'),
          }),
        ],
        test: {
          name: 'storybook',
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({}),
            instances: [
              {
                browser: 'chromium',
              },
            ],
          },
        },
      },
    ],
  },
})
