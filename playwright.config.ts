import { defineConfig } from '@playwright/test'

const webServers = [
  {
    command: 'npx tsx servers/room-server/server.ts',
    url: 'http://localhost:8234',
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      HOST: 'localhost',
      PORT: '8234',
      NODE_ENV: 'production',
      PLAYWRIGHT_TEST: '1',
      NEXT_TELEMETRY_DISABLED: '1',
    },
  },
]

if (process.env.PW_START_NEXT === '1') {
  webServers.push({
    command: 'sh -c "npx next build && npx next start -p 3000"',
    url: 'http://localhost:3000',
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      HOST: 'localhost',
      PORT: '3000',
      PLAYWRIGHT_TEST: '1',
      NEXT_TELEMETRY_DISABLED: '1',
      NODE_ENV: 'production',
      NEXT_PUBLIC_GAME_SERVER_WS_URL: 'ws://localhost:8234',
      NEXT_PUBLIC_GAME_SERVER_API_URL: 'http://localhost:8234/api',
    } as any,
  })
}

export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  fullyParallel: false, // Disable for API tests that share database
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Use single worker for API tests
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:8234', // Test server port
    // NOTE: do NOT set global headers here; API project will set JSON headers explicitly
  },
  webServer: webServers,
  projects: [
    {
      name: 'api',
      testMatch: 'tests/api/**/*.test.ts',
      use: {
        baseURL: 'http://localhost:8234',
        extraHTTPHeaders: {
          'Content-Type': 'application/json',
        },
      },
    },
    {
      name: 'ui',
      testMatch: 'tests/ui/**/*.test.ts',
      use: {
        baseURL: 'http://localhost:3000',
        extraHTTPHeaders: {}, // ensure browser-originated requests keep real headers
      },
    },
  ],
})