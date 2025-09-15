import { test, expect } from '@playwright/test'
import { createRoom, joinRoom } from './test-utils'

test.describe('Active Rooms List', () => {
  test('should return list of active rooms', async ({ request }) => {
    const response = await request.get('/api/active-rooms')
    expect(response.status()).toBe(200)

    const body = await response.json()
    expect(Array.isArray(body)).toBe(true)
    
    // Verify structure if rooms exist
    if (body.length > 0) {
      expect(body[0]).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        maxPlayers: expect.any(Number),
        playerCount: expect.any(Number)
      })
    }
  })

  test('should include newly created rooms', async ({ request }) => {
    // Create test rooms
    const room1 = await createRoom(request, { name: 'Unique Room 1', maxPlayers: 2 })
    const room2 = await createRoom(request, { name: 'Unique Room 2', maxPlayers: 4 })

    // Add player to one room
    await joinRoom(request, room1.roomId, {
      playerId: 'player1',
      playerName: 'Alice',
      playerColor: 'red'
    })

    // Add a small delay to ensure database operations complete
    await new Promise(resolve => setTimeout(resolve, 100))

    const response = await request.get('/api/active-rooms')
    const body = await response.json()
    
    // Verify our rooms are in the list (this is the main assertion)
    const roomIds = body.map((room: { id: string }) => room.id)
    expect(roomIds).toContain(room1.roomId)
    expect(roomIds).toContain(room2.roomId)

    // Check specific room details
    const foundRoom1 = body.find((room: { id: string }) => room.id === room1.roomId)
    const foundRoom2 = body.find((room: { id: string }) => room.id === room2.roomId)

    expect(foundRoom1).toMatchObject({
      name: 'Unique Room 1',
      maxPlayers: 2,
      playerCount: 1
    })

    expect(foundRoom2).toMatchObject({
      name: 'Unique Room 2',
      maxPlayers: 4,
      playerCount: 0
    })
  })
})
