import { test, expect } from '@playwright/test'
import { createRoom, joinRoom } from '../rooms/test-utils'

test.describe('Player Presence API', () => {
  let roomId: string

  test.beforeEach(async ({ request }) => {
    const room = await createRoom(request, { name: 'Test Room', maxPlayers: 4 })
    roomId = room.roomId
  })

  test('should update player presence successfully', async ({ request }) => {
    const playerData = {
      playerId: 'player1',
      playerName: 'Alice',
      playerColor: '#FF6B6B'
    }

    // First join the room
    await joinRoom(request, roomId, playerData)

    // Update player presence
    const response = await request.post('/api/game/update-player-presence', {
      data: {
        roomId,
        playerId: playerData.playerId,
        playerName: playerData.playerName,
        playerColor: playerData.playerColor
      }
    })

    expect(response.status()).toBe(200)

    const result = await response.json()
    expect(result).toMatchObject({
      success: true
    })
  })

  test('should create room, join it, and update presence', async ({ request }) => {
    // Create a new room (not using the beforeEach roomId)
    const room = await createRoom(request, { name: 'Presence Test Room', maxPlayers: 4 })

    const playerData = {
      playerId: 'creator-player',
      playerName: 'RoomCreator',
      playerColor: '#4ECDC4'
    }

    // Join the newly created room
    await joinRoom(request, room.roomId, playerData)

    // Update player presence
    const response = await request.post('/api/game/update-player-presence', {
      data: {
        roomId: room.roomId,
        playerId: playerData.playerId,
        playerName: playerData.playerName,
        playerColor: playerData.playerColor
      }
    })

    expect(response.status()).toBe(200)

    const result = await response.json()
    expect(result).toMatchObject({
      success: true
    })
  })

  test('should handle missing roomId', async ({ request }) => {
    const response = await request.post('/api/game/update-player-presence', {
      data: {
        playerId: 'player1',
        playerName: 'Alice',
        playerColor: '#FF6B6B'
      }
    })

    expect(response.status()).toBe(400)

    const result = await response.json()
    expect(result.error).toBeTruthy()
  })

  test('should handle missing playerId', async ({ request }) => {
    const response = await request.post('/api/game/update-player-presence', {
      data: {
        roomId,
        playerName: 'Alice',
        playerColor: '#FF6B6B'
      }
    })

    expect(response.status()).toBe(400)

    const result = await response.json()
    expect(result.error).toBeTruthy()
  })

  test('should handle missing playerName', async ({ request }) => {
    const response = await request.post('/api/game/update-player-presence', {
      data: {
        roomId,
        playerId: 'player1',
        playerColor: '#FF6B6B'
      }
    })

    expect(response.status()).toBe(400)

    const result = await response.json()
    expect(result.error).toBeTruthy()
  })

  test('should handle missing playerColor', async ({ request }) => {
    const response = await request.post('/api/game/update-player-presence', {
      data: {
        roomId,
        playerId: 'player1',
        playerName: 'Alice'
      }
    })

    expect(response.status()).toBe(400)

    const result = await response.json()
    expect(result.error).toBeTruthy()
  })

  test('should handle non-existent room', async ({ request }) => {
    const response = await request.post('/api/game/update-player-presence', {
      data: {
        roomId: 'NONEXIST',
        playerId: 'player1',
        playerName: 'Alice',
        playerColor: '#FF6B6B'
      }
    })

    expect(response.status()).toBe(404)

    const result = await response.json()
    expect(result.error).toBeTruthy()
  })

  test('should handle player not in room', async ({ request }) => {
    const response = await request.post('/api/game/update-player-presence', {
      data: {
        roomId,
        playerId: 'nonexistent-player',
        playerName: 'Nobody',
        playerColor: '#FF6B6B'
      }
    })

    expect(response.status()).toBe(404)

    const result = await response.json()
    expect(result.error).toBeTruthy()
  })

  test('should update presence for multiple players', async ({ request }) => {
    const players = [
      { playerId: 'player1', playerName: 'Alice', playerColor: '#FF6B6B' },
      { playerId: 'player2', playerName: 'Bob', playerColor: '#4ECDC4' },
      { playerId: 'player3', playerName: 'Charlie', playerColor: '#45B7D1' }
    ]

    // Join all players to the room
    for (const player of players) {
      await joinRoom(request, roomId, player)
    }

    // Update presence for all players
    for (const player of players) {
      const response = await request.post('/api/game/update-player-presence', {
        data: {
          roomId,
          ...player
        }
      })

      expect(response.status()).toBe(200)

      const result = await response.json()
      expect(result).toMatchObject({
        success: true
      })
    }
  })

})