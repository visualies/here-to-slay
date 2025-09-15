import { test, expect } from '@playwright/test'

test('create room via UI and verify room id is shown', async ({ page }) => {
  // Wait for Next.js server to come up (poll the root URL)
  const base = process.env.PW_BASE_URL || 'http://localhost:3000'
  const start = Date.now()
  while (Date.now() - start < 30000) {
    const res = await page.request.get(base + '/')
    if (res.ok()) break
    await new Promise(r => setTimeout(r, 300))
  }

  // Go to homepage
  await page.goto('/')

  // Click the Create Room entry point on the home screen
  await page.getByTestId('create-room-button').click()

  // Wait for the create-room form
  const nameInput = page.getByTestId('create-player-name-input')
  await expect(nameInput).toBeVisible()

  // Enter player name
  await nameInput.fill('TestPlayer')

  // Submit form (Server Action)
  await page.getByTestId('create-room-button').click()

  // Verify we navigated into a room and a room id badge is visible
  const badge = page.getByTestId('room-id-badge')
  await expect(badge).toBeVisible({ timeout: 15000 })

  // Extract and validate room id value
  const roomIdEl = page.getByTestId('room-id-value')
  await expect(roomIdEl).toBeVisible()
  const roomIdText = (await roomIdEl.textContent())?.trim() || ''
  expect(roomIdText).toHaveLength(6)
})


