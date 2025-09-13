import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  fullyParallel: false, // Disable for API tests that share database
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Use single worker for API tests
  reporter: 'html',
  globalSetup: './tests/global-setup.ts',
  globalTeardown: './tests/global-teardown.ts',
  use: {
    baseURL: 'http://localhost:8234', // Test server port
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  },
  projects: [
    {
      name: 'api',
      testMatch: 'tests/api/**/*.test.ts',
      use: {
        baseURL: 'http://localhost:8234',
      },
    },
    {
      name: 'ui',
      testMatch: 'tests/ui/**/*.test.ts',
      use: {
        baseURL: 'http://localhost:3000',
      },
    },
  ],
})