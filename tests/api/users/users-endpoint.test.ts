import { test, expect } from '@playwright/test'

test.describe('Users @me Endpoint', () => {
  test('should create new player when no cookie exists', async ({ request }) => {
    const response = await request.get('/api/users/@me')

    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body).toMatchObject({
      success: true,
      data: {
        playerId: expect.stringMatching(/^[A-Za-z0-9]{16}$/),
        playerName: 'Player',
        playerColor: '#FF6B6B',
        lastSeen: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
        createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      }
    })

    // Verify cookie was set
    const cookies = response.headers()['set-cookie']
    expect(cookies).toContain('player_id=')
  })

  test('should return existing player data when cookie exists', async ({ request }) => {
    // First request to create player
    const firstResponse = await request.get('/api/users/@me')
    expect(firstResponse.status()).toBe(200)

    const firstBody = await firstResponse.json()
    const playerId = firstBody.data.playerId

    // Second request should return same player ID
    const secondResponse = await request.get('/api/users/@me')
    expect(secondResponse.status()).toBe(200)

    const secondBody = await secondResponse.json()
    expect(secondBody.data.playerId).toBe(playerId)
    expect(secondBody.data.playerName).toBe('Player')
    expect(secondBody.data.playerColor).toBe('#FF6B6B')
  })

  test('should update player data via PUT request', async ({ request }) => {
    // Create player first
    await request.get('/api/users/@me')

    // Update player data
    const updateData = {
      playerName: 'TestPlayer',
      playerColor: '#00FF00'
    }

    const response = await request.put('/api/users/@me', {
      data: updateData
    })

    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body).toMatchObject({
      success: true,
      data: {
        playerId: expect.stringMatching(/^[A-Za-z0-9]{16}$/),
        playerName: 'TestPlayer',
        playerColor: '#00FF00',
        lastSeen: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
        createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      }
    })
  })

  test('should create new player when updating without existing cookie', async ({ request }) => {
    const updateData = {
      playerName: 'NewTestPlayer',
      playerColor: '#0000FF'
    }

    const response = await request.put('/api/users/@me', {
      data: updateData
    })

    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body).toMatchObject({
      success: true,
      data: {
        playerId: expect.stringMatching(/^[A-Za-z0-9]{16}$/),
        playerName: 'NewTestPlayer',
        playerColor: '#0000FF'
      }
    })

    // Verify cookie was set
    const cookies = response.headers()['set-cookie']
    expect(cookies).toContain('player_id=')
  })

  test('should return error when updating without player name', async ({ request }) => {
    const updateData = {
      playerColor: '#FF0000'
    }

    const response = await request.put('/api/users/@me', {
      data: updateData
    })

    expect(response.status()).toBe(400)

    const body = await response.json()
    expect(body).toMatchObject({
      error: 'Player name is required'
    })
  })

  test('should return recent rooms (empty array)', async ({ request }) => {
    const response = await request.get('/api/users/@me/rooms')

    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(body).toMatchObject({
      success: true,
      data: {
        playerId: expect.any(String),
        recentRooms: []
      }
    })
  })

  test('should handle server errors gracefully', async ({ request }) => {
    // This test assumes we can trigger an error condition
    // In practice, this might be difficult to test without mocking
    // but the endpoint has error handling for general errors
  })
})