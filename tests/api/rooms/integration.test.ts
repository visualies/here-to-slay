import { test, expect } from '@playwright/test'
import { createRoom, joinRoom, getRoomInfo } from './test-utils'

test.describe('Integration Tests', () => {
  test('should complete full room creation and joining workflow', async ({ request }) => {
    // Create room
    const room = await createRoom(request, {
      name: 'Integration Test Room',
      maxPlayers: 3
    })

    // Add multiple players
    await joinRoom(request, room.roomId, {
      playerId: 'alice',
      playerName: 'Alice',
      playerColor: 'red'
    })

    await joinRoom(request, room.roomId, {
      playerId: 'bob',
      playerName: 'Bob',
      playerColor: 'blue'
    })

    // Verify room state
    const roomInfo = await getRoomInfo(request, room.roomId)
    expect(roomInfo).toMatchObject({
      name: 'Integration Test Room',
      maxPlayers: 3,
      players: {
        'alice': expect.objectContaining({ name: 'Alice', color: 'red' }),
        'bob': expect.objectContaining({ name: 'Bob', color: 'blue' })
      }
    })

    // Verify room appears in active rooms
    const activeRoomsResponse = await request.get('/api/active-rooms')
    const activeRooms = await activeRoomsResponse.json()
    
    expect(activeRooms).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: room.roomId,
          name: 'Integration Test Room'
        })
      ])
    )
  })
})
