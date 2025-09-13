import { test, expect } from '@playwright/test'
import { createRoom, joinRoom } from './test-utils'

test.describe('Error Handling', () => {
  test('should reject joining full room', async ({ request }) => {
    const room = await createRoom(request, { name: 'Full Room', maxPlayers: 2 })
    
    // Fill the room to capacity
    await joinRoom(request, room.roomId, {
      playerId: 'player1',
      playerName: 'Player 1',
      playerColor: 'red'
    })
    await joinRoom(request, room.roomId, {
      playerId: 'player2',
      playerName: 'Player 2',
      playerColor: 'blue'
    })

    // Try to add a 3rd player
    const response = await request.post('/api/join-room', {
      data: {
        roomId: room.roomId,
        playerId: 'player3',
        playerName: 'Extra Player',
        playerColor: 'purple'
      }
    })

    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('Room is full')
  })

  test('should reject joining non-existent room', async ({ request }) => {
    const response = await request.post('/api/join-room', {
      data: {
        roomId: 'FAKE01',
        playerId: 'player1',
        playerName: 'Alice',
        playerColor: 'red'
      }
    })

    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('Room not found')
  })
})
