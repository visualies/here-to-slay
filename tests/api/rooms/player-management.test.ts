import { test, expect } from '@playwright/test'
import { createRoom, joinRoom, getRoomInfo, verifyYjsState } from './test-utils'

test.describe('Player Management', () => {
  let roomId: string

  test.beforeEach(async ({ request }) => {
    const room = await createRoom(request, { name: 'Test Room', maxPlayers: 4 })
    roomId = room.roomId
  })

  test('should allow player to join room', async ({ request }) => {
    const playerData = {
      playerId: 'player1',
      playerName: 'Alice',
      playerColor: 'red'
    }

    const result = await joinRoom(request, roomId, playerData)

    expect(result).toMatchObject({
      success: true,
      room: expect.objectContaining({ id: roomId })
    })

    // Verify database state
    const roomInfo = await getRoomInfo(request, roomId)
    expect(roomInfo.players).toMatchObject({
      'player1': expect.objectContaining({
        id: 'player1',
        name: 'Alice',
        color: 'red'
      })
    })
  })

  test('should handle multiple players joining', async ({ request }) => {
    const players = [
      { playerId: 'player1', playerName: 'Alice', playerColor: 'red' },
      { playerId: 'player2', playerName: 'Bob', playerColor: 'blue' },
      { playerId: 'player3', playerName: 'Charlie', playerColor: 'green' }
    ]

    for (const player of players) {
      await joinRoom(request, roomId, player)
    }

    const roomInfo = await getRoomInfo(request, roomId)
    expect(Object.keys(roomInfo.players)).toHaveLength(3)
    expect(roomInfo.players['player1']).toMatchObject({ id: 'player1', name: 'Alice' })
    expect(roomInfo.players['player2']).toMatchObject({ id: 'player2', name: 'Bob' })
    expect(roomInfo.players['player3']).toMatchObject({ id: 'player3', name: 'Charlie' })
  })

  test('should allow player to rejoin (replace)', async ({ request }) => {
    const playerData = {
      playerId: 'player1',
      playerName: 'Alice',
      playerColor: 'red'
    }

    // Join first time
    await joinRoom(request, roomId, playerData)

    // Join again with different name/color
    const updatedPlayerData = {
      ...playerData,
      playerName: 'Alice Updated',
      playerColor: 'blue'
    }

    await joinRoom(request, roomId, updatedPlayerData)

    const roomInfo = await getRoomInfo(request, roomId)
    expect(Object.keys(roomInfo.players)).toHaveLength(1)
    expect(roomInfo.players['player1']).toMatchObject({
      id: 'player1',
      name: 'Alice Updated',
      color: 'blue'
    })
  })

  test('should verify Yjs state after player joins', async ({ request }) => {
    await joinRoom(request, roomId, {
      playerId: 'player1',
      playerName: 'Alice',
      playerColor: 'red'
    })

    await verifyYjsState(request, roomId)
  })
})
