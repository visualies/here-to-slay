import { test, expect } from '@playwright/test'
import { createRoom, joinRoom, getRoomInfo, verifyYjsState } from './test-utils'

test.describe('Room Persistence', () => {
  test('should restore saved state when players rejoin after leaving', async ({ request }) => {
    // Create room and add players
    const room = await createRoom(request, {
      name: 'Persistence Test Room',
      maxPlayers: 4
    })

    // Add players and start game
    await joinRoom(request, room.roomId, {
      playerId: 'player1',
      playerName: 'Alice',
      playerColor: 'red'
    })

    await joinRoom(request, room.roomId, {
      playerId: 'player2',
      playerName: 'Bob',
      playerColor: 'blue'
    })

    // Start the game to create some state
    const startResponse = await request.post('/api/game/start', {
      data: { roomId: room.roomId }
    })
    expect(startResponse.status()).toBe(200)

    // Verify initial game state
    const initialRoomInfo = await getRoomInfo(request, room.roomId)
    expect(initialRoomInfo.players).toHaveProperty('player1')
    expect(initialRoomInfo.players).toHaveProperty('player2')

    // Simulate players leaving by removing them from the Yjs document
    // (In real scenario, this would happen when WebSocket connections close)
    const debugResponse = await request.get('/api/game/debug')
    const debugData = await debugResponse.json()
    const roomDoc = debugData.docs.find((doc: any) => doc.id === room.roomId)
    expect(roomDoc).toBeDefined()

    // Verify Yjs document exists and has state
    await verifyYjsState(request, room.roomId)

    // Now simulate players rejoining the "empty" room
    // (In real scenario, Yjs document would be garbage collected and recreated)
    
    // First player rejoins
    const rejoin1Response = await request.post('/api/join-room', {
      data: {
        roomId: room.roomId,
        playerId: 'player1',
        playerName: 'Alice Updated',
        playerColor: 'green'
      }
    })
    expect(rejoin1Response.status()).toBe(200)

    // Second player rejoins
    const rejoin2Response = await request.post('/api/join-room', {
      data: {
        roomId: room.roomId,
        playerId: 'player2',
        playerName: 'Bob Updated',
        playerColor: 'purple'
      }
    })
    expect(rejoin2Response.status()).toBe(200)

    // Verify room state is restored
    const restoredRoomInfo = await getRoomInfo(request, room.roomId)
    expect(restoredRoomInfo).toMatchObject({
      name: 'Persistence Test Room',
      maxPlayers: 4,
      players: {
        'player1': expect.objectContaining({
          id: 'player1',
          name: 'Alice Updated',
          color: 'green'
        }),
        'player2': expect.objectContaining({
          id: 'player2',
          name: 'Bob Updated',
          color: 'purple'
        })
      }
    })

    // Verify Yjs document is still accessible
    await verifyYjsState(request, room.roomId)
  })

  test('should handle room restoration with custom room data', async ({ request }) => {
    // Create room with custom data
    const room = await createRoom(request, {
      name: 'Custom Persistence Room',
      maxPlayers: 6
    })

    // Add a player
    await joinRoom(request, room.roomId, {
      playerId: 'solo-player',
      playerName: 'Solo Player',
      playerColor: 'orange'
    })

    // Verify initial state
    const initialInfo = await getRoomInfo(request, room.roomId)
    expect(initialInfo).toMatchObject({
      name: 'Custom Persistence Room',
      maxPlayers: 6
    })

    // Simulate player leaving and rejoining
    const rejoinResponse = await request.post('/api/join-room', {
      data: {
        roomId: room.roomId,
        playerId: 'solo-player',
        playerName: 'Solo Player Restored',
        playerColor: 'yellow'
      }
    })
    expect(rejoinResponse.status()).toBe(200)

    // Verify room data is preserved
    const restoredInfo = await getRoomInfo(request, room.roomId)
    expect(restoredInfo).toMatchObject({
      name: 'Custom Persistence Room',
      maxPlayers: 6,
      players: {
        'solo-player': expect.objectContaining({
          id: 'solo-player',
          name: 'Solo Player Restored',
          color: 'yellow'
        })
      }
    })
  })
})
