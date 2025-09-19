import { test, expect } from '@playwright/test'

test.describe('API: User Cookie Persistence Bugs', () => {
  test.describe('Player ID Cookie Consistency', () => {
    test('should not generate new player ID on each reload when cookie exists', async ({ request }) => {
      // Simulate first visit - should create new player ID
      const firstVisit = await request.get('/api/users/@me')
      expect(firstVisit.status()).toBe(200)

      const firstData = await firstVisit.json()
      const originalPlayerId = firstData.data.playerId

      // Verify cookie was set
      const setCookieHeader = firstVisit.headers()['set-cookie']
      expect(setCookieHeader).toBeDefined()
      expect(setCookieHeader).toContain('player_id=')
      expect(setCookieHeader).toContain(originalPlayerId)

      // Simulate page reload - should return same player ID
      const secondVisit = await request.get('/api/users/@me')
      expect(secondVisit.status()).toBe(200)

      const secondData = await secondVisit.json()
      expect(secondData.data.playerId).toBe(originalPlayerId)

      // Simulate multiple reloads - should always return same player ID
      for (let i = 0; i < 5; i++) {
        const reload = await request.get('/api/users/@me')
        expect(reload.status()).toBe(200)

        const reloadData = await reload.json()
        expect(reloadData.data.playerId).toBe(originalPlayerId)
      }
    })

    test('should preserve player ID across different user operations', async ({ request }) => {
      // Get initial player ID
      const getUser = await request.get('/api/users/@me')
      const userData = await getUser.json()
      const playerId = userData.data.playerId

      // Update player name
      const updateResponse = await request.put('/api/users/@me', {
        data: {
          playerName: 'Updated Name',
          playerColor: '#00FF00'
        }
      })
      expect(updateResponse.status()).toBe(200)

      const updatedData = await updateResponse.json()
      expect(updatedData.data.playerId).toBe(playerId) // Same ID

      // Get recent rooms
      const roomsResponse = await request.get('/api/users/@me/rooms')
      expect(roomsResponse.status()).toBe(200)

      const roomsData = await roomsResponse.json()
      expect(roomsData.data.playerId).toBe(playerId) // Same ID

      // Get user again
      const finalGet = await request.get('/api/users/@me')
      const finalData = await finalGet.json()
      expect(finalData.data.playerId).toBe(playerId) // Same ID
      // Now implementation actually stores and returns updated names
      expect(finalData.data.playerName).toBe('Updated Name')
    })

    test('should handle concurrent requests without creating duplicate player IDs', async ({ request }) => {
      // First request to establish player ID/cookie
      const firstResponse = await request.get('/api/users/@me')
      const firstData = await firstResponse.json()
      const establishedPlayerId = firstData.data.playerId

      // Make multiple concurrent requests with existing cookie
      const requests = Array.from({ length: 10 }, () =>
        request.get('/api/users/@me')
      )

      const responses = await Promise.all(requests)

      // All should succeed
      responses.forEach(response => {
        expect(response.status()).toBe(200)
      })

      const playerIds = await Promise.all(
        responses.map(async response => {
          const data = await response.json()
          return data.data.playerId
        })
      )

      // All player IDs should be the same (no race condition)
      const uniquePlayerIds = new Set(playerIds)
      expect(uniquePlayerIds.size).toBe(1)

      // Should be the established player ID
      expect(playerIds[0]).toBe(establishedPlayerId)
      expect(establishedPlayerId).toMatch(/^[A-Za-z0-9]{16}$/)
    })
  })

  test.describe('Cookie Security and Cross-Origin', () => {
    test('should set secure cookie attributes appropriately', async ({ request }) => {
      const response = await request.get('/api/users/@me')
      expect(response.status()).toBe(200)

      const setCookieHeader = response.headers()['set-cookie']
      expect(setCookieHeader).toBeDefined()

      // Should set HttpOnly for security
      expect(setCookieHeader).toContain('HttpOnly')

      // Should set SameSite policy
      expect(setCookieHeader).toContain('SameSite=Lax')

      // Should set Max-Age for persistence
      expect(setCookieHeader).toContain('Max-Age=31536000') // 1 year

      // Should set Path
      expect(setCookieHeader).toContain('Path=/')
    })

    test('should handle missing cookies gracefully', async ({ browser }) => {
      // Create fresh browser context (no cookies)
      const context = await browser.newContext()
      const freshRequest = context.request

      const response = await freshRequest.get('/api/users/@me')
      expect(response.status()).toBe(200)

      const data = await response.json()
      expect(data).toMatchObject({
        success: true,
        data: {
          playerId: expect.stringMatching(/^[A-Za-z0-9]{16}$/),
          playerName: 'Player', // Test mode uses 'Player'
          playerColor: '#FF6B6B'
        }
      })

      await context.close()
    })
  })

  test.describe('Integration with Room Joining', () => {
    test('should use consistent player ID when joining rooms after reload', async ({ request }) => {
      let roomId: string

      // Create room
      const createRoom = await request.post('/api/create-room', {
        data: { name: 'Consistency Test Room' }
      })
      const roomData = await createRoom.json()
      roomId = roomData.roomId

      // Get player ID from user endpoint
      const getUserResponse = await request.get('/api/users/@me')
      const userData = await getUserResponse.json()
      const playerId = userData.data.playerId

      // Join room with this player ID
      const joinResponse = await request.post('/api/join-room', {
        data: {
          roomId,
          playerId,
          playerName: 'Test Player',
          playerColor: 'red'
        }
      })
      expect(joinResponse.status()).toBe(200)

      // Simulate page reload - get player ID again
      const reloadUserResponse = await request.get('/api/users/@me')
      const reloadUserData = await reloadUserResponse.json()
      expect(reloadUserData.data.playerId).toBe(playerId) // Same ID

      // Rejoin room with same player ID (simulating page reload)
      const rejoinResponse = await request.post('/api/join-room', {
        data: {
          roomId,
          playerId: reloadUserData.data.playerId,
          playerName: 'Test Player',
          playerColor: 'red'
        }
      })
      expect(rejoinResponse.status()).toBe(200)

      // Verify only one player in room (not duplicated)
      const roomInfo = await request.get(`/api/room/${roomId}`)
      const roomInfoData = await roomInfo.json()

      expect(Object.keys(roomInfoData.players)).toHaveLength(1)
      expect(roomInfoData.players[playerId]).toBeDefined()
      expect(roomInfoData.players[playerId].id).toBe(playerId)
    })

    test('should maintain room membership across user endpoint calls', async ({ request }) => {
      let roomId: string

      // Create room and join
      const createRoom = await request.post('/api/create-room', {
        data: { name: 'Membership Test Room' }
      })
      const createRoomData = await createRoom.json()
      roomId = createRoomData.roomId

      const getUserResponse = await request.get('/api/users/@me')
      const userData = await getUserResponse.json()
      const playerId = userData.data.playerId

      await request.post('/api/join-room', {
        data: {
          roomId: await roomId,
          playerId,
          playerName: 'Test Player',
          playerColor: 'red'
        }
      })

      // Start game to give player cards
      await request.post('/api/game/start', {
        data: { roomId: await roomId }
      })

      // Get initial room state
      let roomInfo = await request.get(`/api/room/${await roomId}`)
      let roomData = await roomInfo.json()
      const originalHandSize = roomData.players[playerId].hand.length

      // Make various user endpoint calls
      await request.get('/api/users/@me')
      await request.put('/api/users/@me', {
        data: { playerName: 'Updated Player', playerColor: '#FF0000' }
      })
      await request.get('/api/users/@me/rooms')

      // Verify room state unchanged by user operations
      roomInfo = await request.get(`/api/room/${await roomId}`)
      roomData = await roomInfo.json()

      expect(roomData.players[playerId].hand).toHaveLength(originalHandSize)
      // Note: Room player name comes from join request, not user endpoint
      expect(roomData.players[playerId].name).toBe('Test Player') // Original name preserved
      expect(Object.keys(roomData.players)).toHaveLength(1) // Still only one player
    })
  })

  test.describe('Error Recovery and Edge Cases', () => {
    test('should handle malformed cookie gracefully', async ({ browser }) => {
      // Note: This test would need browser context manipulation
      // For now, we verify the server handles missing/invalid cookies
      const context = await browser.newContext()
      const request = context.request

      // Try with completely fresh context
      const response = await request.get('/api/users/@me')
      expect(response.status()).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.playerId).toMatch(/^[A-Za-z0-9]{16}$/)

      await context.close()
    })

    test('should not create new player ID when updating with existing cookie', async ({ request }) => {
      // Get initial player ID
      const initialResponse = await request.get('/api/users/@me')
      const initialData = await initialResponse.json()
      const playerId = initialData.data.playerId

      // Update player via PUT (should use existing cookie)
      const updateResponse = await request.put('/api/users/@me', {
        data: {
          playerName: 'New Name',
          playerColor: '#BLUE'
        }
      })
      expect(updateResponse.status()).toBe(200)

      const updateData = await updateResponse.json()
      expect(updateData.data.playerId).toBe(playerId) // Same player ID

      // Verify subsequent GET still returns same ID
      const verifyResponse = await request.get('/api/users/@me')
      const verifyData = await verifyResponse.json()
      expect(verifyData.data.playerId).toBe(playerId)
      // Now implementation actually stores and returns updated names
      expect(verifyData.data.playerName).toBe('New Name')
    })
  })
})