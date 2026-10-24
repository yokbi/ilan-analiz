import { defineConfig } from '@playwright/test'

/**
 * Mağaza ekran görüntüleri — `npm run magaza:ekran`. Test değil, üretim betiği;
 * CI'da koşmuyor. Uçtan uca testlerle aynı uzantı kurulumunu kullanıyor
 * (`e2e/baglam.ts`).
 */
export default defineConfig({
  testDir: './magaza',
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
})
