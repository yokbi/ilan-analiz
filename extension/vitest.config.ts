import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    // Uçtan uca testler Playwright ile koşuyor (`npm run test:e2e`) ve gerçek
    // bir tarayıcı istiyor. Varsayılan koşuya girseydi tarayıcısız her
    // makinede kırmızı olurdu — ve "her zaman kırmızı" bir test, kapalı bir
    // testtir. Mağaza ekran görüntüleri (`magaza/`) de Playwright betiği.
    exclude: ['node_modules/**', 'e2e/**', 'magaza/**'],
  },
})
