import { test, expect } from '@playwright/test'
import { createRoom, joinRoom, getRoomInfo } from './test-utils'

test.describe('Player Capacity Tests', () => {
  test('should handle room creation and joining with 1 to 4 players', async ({ request }) => {
    // Create room with default max capacity (4 players)
    const room = await createRoom(request, {
      name: 'Capacity Test Room',
      maxPlayers: 4
    })

    // Test joining with 1 player
    await joinRoom(request, room.roomId, {
      playerId: 'player1',
      playerName: 'Player 1',
      playerColor: 'red'
    })

    let roomInfo = await getRoomInfo(request, room.roomId)
    expect(roomInfo.players).toHaveProperty('player1')
    expect(Object.keys(roomInfo.players)).toHaveLength(1)
    expect(roomInfo.maxPlayers).toBe(4)

    // Test joining with 2nd player
    await joinRoom(request, room.roomId, {
      playerId: 'player2',
      playerName: 'Player 2',
      playerColor: 'blue'
    })

    roomInfo = await getRoomInfo(request, room.roomId)
    expect(roomInfo.players).toHaveProperty('player1')
    expect(roomInfo.players).toHaveProperty('player2')
    expect(Object.keys(roomInfo.players)).toHaveLength(2)

    // Test joining with 3rd player
    await joinRoom(request, room.roomId, {
      playerId: 'player3',
      playerName: 'Player 3',
      playerColor: 'green'
    })

    roomInfo = await getRoomInfo(request, room.roomId)
    expect(roomInfo.players).toHaveProperty('player1')
    expect(roomInfo.players).toHaveProperty('player2')
    expect(roomInfo.players).toHaveProperty('player3')
    expect(Object.keys(roomInfo.players)).toHaveLength(3)

    // Test joining with 4th player (room at capacity)
    await joinRoom(request, room.roomId, {
      playerId: 'player4',
      playerName: 'Player 4',
      playerColor: 'yellow'
    })

    roomInfo = await getRoomInfo(request, room.roomId)
    expect(roomInfo.players).toHaveProperty('player1')
    expect(roomInfo.players).toHaveProperty('player2')
    expect(roomInfo.players).toHaveProperty('player3')
    expect(roomInfo.players).toHaveProperty('player4')
    expect(Object.keys(roomInfo.players)).toHaveLength(4)

    // Verify all player data is correct
    expect(roomInfo.players['player1']).toMatchObject({
      id: 'player1',
      name: 'Player 1',
      color: 'red'
    })
    expect(roomInfo.players['player2']).toMatchObject({
      id: 'player2',
      name: 'Player 2',
      color: 'blue'
    })
    expect(roomInfo.players['player3']).toMatchObject({
      id: 'player3',
      name: 'Player 3',
      color: 'green'
    })
    expect(roomInfo.players['player4']).toMatchObject({
      id: 'player4',
      name: 'Player 4',
      color: 'yellow'
    })

    // Test that 5th player is rejected (room full)
    const fullRoomResponse = await request.post('/api/join-room', {
      data: {
        roomId: room.roomId,
        playerId: 'player5',
        playerName: 'Player 5',
        playerColor: 'purple'
      }
    })

    expect(fullRoomResponse.status()).toBe(400)
    const fullRoomBody = await fullRoomResponse.json()
    expect(fullRoomBody.error).toContain('Room is full')

    // Verify room still has exactly 4 players
    roomInfo = await getRoomInfo(request, room.roomId)
    expect(Object.keys(roomInfo.players)).toHaveLength(4)
  })

  test('should handle different max player capacities', async ({ request }) => {
    // Test room with 2 max players
    const room2 = await createRoom(request, {
      name: 'Two Player Room',
      maxPlayers: 2
    })

    await joinRoom(request, room2.roomId, {
      playerId: 'p1',
      playerName: 'Player A',
      playerColor: 'red'
    })

    await joinRoom(request, room2.roomId, {
      playerId: 'p2',
      playerName: 'Player B',
      playerColor: 'blue'
    })

    let roomInfo = await getRoomInfo(request, room2.roomId)
    expect(Object.keys(roomInfo.players)).toHaveLength(2)
    expect(roomInfo.maxPlayers).toBe(2)

    // Try to add 3rd player - should be rejected
    const response = await request.post('/api/join-room', {
      data: {
        roomId: room2.roomId,
        playerId: 'p3',
        playerName: 'Player C',
        playerColor: 'green'
      }
    })

    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('Room is full')

    // Test room with 6 max players
    const room6 = await createRoom(request, {
      name: 'Six Player Room',
      maxPlayers: 6
    })

    // Add 4 players to 6-player room
    for (let i = 1; i <= 4; i++) {
      await joinRoom(request, room6.roomId, {
        playerId: `player${i}`,
        playerName: `Player ${i}`,
        playerColor: ['red', 'blue', 'green', 'yellow'][i - 1]
      })
    }

    roomInfo = await getRoomInfo(request, room6.roomId)
    expect(Object.keys(roomInfo.players)).toHaveLength(4)
    expect(roomInfo.maxPlayers).toBe(6)

    // Should be able to add 2 more players
    await joinRoom(request, room6.roomId, {
      playerId: 'player5',
      playerName: 'Player 5',
      playerColor: 'purple'
    })

    await joinRoom(request, room6.roomId, {
      playerId: 'player6',
      playerName: 'Player 6',
      playerColor: 'orange'
    })

    roomInfo = await getRoomInfo(request, room6.roomId)
    expect(Object.keys(roomInfo.players)).toHaveLength(6)
    expect(roomInfo.maxPlayers).toBe(6)
  })

  test('should handle player replacement at capacity', async ({ request }) => {
    // Create room and fill to capacity
    const room = await createRoom(request, {
      name: 'Replacement Test Room',
      maxPlayers: 3
    })

    // Fill room to capacity
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

    await joinRoom(request, room.roomId, {
      playerId: 'player3',
      playerName: 'Player 3',
      playerColor: 'green'
    })

    let roomInfo = await getRoomInfo(request, room.roomId)
    expect(Object.keys(roomInfo.players)).toHaveLength(3)

    // Replace player1 with updated info (same player ID - should work)
    await joinRoom(request, room.roomId, {
      playerId: 'player1',
      playerName: 'Player 1 Updated',
      playerColor: 'purple'
    })

    roomInfo = await getRoomInfo(request, room.roomId)
    expect(Object.keys(roomInfo.players)).toHaveLength(3) // Still 3 players
    expect(roomInfo.players['player1']).toMatchObject({
      id: 'player1',
      name: 'Player 1 Updated',
      color: 'purple'
    })

    // Try to add a 4th player with different ID - should be rejected
    const response = await request.post('/api/join-room', {
      data: {
        roomId: room.roomId,
        playerId: 'player4',
        playerName: 'Player 4 New',
        playerColor: 'yellow'
      }
    })

    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('Room is full')

    // Verify room still has exactly 3 players
    roomInfo = await getRoomInfo(request, room.roomId)
    expect(Object.keys(roomInfo.players)).toHaveLength(3)
    expect(roomInfo.players).toHaveProperty('player1')
    expect(roomInfo.players).toHaveProperty('player2')
    expect(roomInfo.players).toHaveProperty('player3')
    expect(roomInfo.players).not.toHaveProperty('player4')
  })

  test('should verify room state consistency across all player counts', async ({ request }) => {
    const room = await createRoom(request, {
      name: 'Consistency Test Room',
      maxPlayers: 4
    })

    // Verify initial room state
    let roomInfo = await getRoomInfo(request, room.roomId)
    expect(roomInfo.maxPlayers).toBe(4)
    expect(Object.keys(roomInfo.players || {})).toHaveLength(0)

    // Add players one by one and verify state at each step
    const players = [
      { playerId: 'alice', playerName: 'Alice', playerColor: 'red' },
      { playerId: 'bob', playerName: 'Bob', playerColor: 'blue' },
      { playerId: 'charlie', playerName: 'Charlie', playerColor: 'green' },
      { playerId: 'diana', playerName: 'Diana', playerColor: 'yellow' }
    ]

    for (let i = 0; i < players.length; i++) {
      const player = players[i]
      await joinRoom(request, room.roomId, player)

      roomInfo = await getRoomInfo(request, room.roomId)
      
      // Verify player count
      expect(Object.keys(roomInfo.players)).toHaveLength(i + 1)
      
      // Verify room metadata is consistent
      expect(roomInfo.id).toBe(room.roomId)
      expect(roomInfo.name).toBe('Consistency Test Room')
      expect(roomInfo.maxPlayers).toBe(4)
      
      // Verify all players up to this point are present
      for (let j = 0; j <= i; j++) {
        const expectedPlayer = players[j]
        expect(roomInfo.players).toHaveProperty(expectedPlayer.playerId)
        expect(roomInfo.players[expectedPlayer.playerId]).toMatchObject({
          id: expectedPlayer.playerId,
          name: expectedPlayer.playerName,
          color: expectedPlayer.playerColor
        })
      }
    }

    // Final verification - room should be at capacity
    roomInfo = await getRoomInfo(request, room.roomId)
    expect(Object.keys(roomInfo.players)).toHaveLength(4)
    expect(roomInfo.maxPlayers).toBe(4)

    // Try to add a 5th player - should be rejected
    const response = await request.post('/api/join-room', {
      data: {
        roomId: room.roomId,
        playerId: 'eve',
        playerName: 'Eve',
        playerColor: 'purple'
      }
    })

    expect(response.status()).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('Room is full')

    // Verify room still has exactly 4 players
    const finalCheck = await getRoomInfo(request, room.roomId)
    expect(Object.keys(finalCheck.players)).toHaveLength(4)
  })
})
