import { defineConfig } from '@playwright/test'

/**
 * Uzantı düzeyinde uçtan uca testler.
 *
 * Varsayılan test koşusundan (`vitest`) ayrı: bunlar gerçek bir Chromium
 * istiyor ve tarayıcı indirmesi gerektiriyor. Birim testleri hiçbir şey
 * istemiyor ve öyle kalmalı — `pnpm -r test` hızlı olduğu için koşuluyor.
 */
export default defineConfig({
  testDir: './e2e',
  // Uzantı yüklemek ve service worker'ın ayağa kalkmasını beklemek saniyeler
  // sürebiliyor; varsayılan 30 sn dar geliyor.
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? 'line' : 'list',
})
