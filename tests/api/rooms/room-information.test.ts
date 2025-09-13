import { test, expect } from '@playwright/test'
import { createRoom, joinRoom, getRoomInfo } from './test-utils'

test.describe('Room Information', () => {
  test('should return room details with players', async ({ request }) => {
    const room = await createRoom(request, { name: 'Info Test Room', maxPlayers: 3 })
    
    await joinRoom(request, room.roomId, {
      playerId: 'player1',
      playerName: 'Test Player',
      playerColor: 'green'
    })

    const roomInfo = await getRoomInfo(request, room.roomId)
    expect(roomInfo).toMatchObject({
      id: room.roomId,
      name: 'Info Test Room',
      maxPlayers: 3,
      players: {
        'player1': expect.objectContaining({
          id: 'player1',
          name: 'Test Player',
          color: 'green'
        })
      }
    })
  })

  test('should return 404 for non-existent room', async ({ request }) => {
    const response = await request.get('/api/room/NOTFOUND')
    expect(response.status()).toBe(404)

    const body = await response.json()
    expect(body.error).toBe('Room not found')
  })
})
