import { test, expect } from '@playwright/test'

test.describe('API: Deduct Point Action', () => {
  let roomId: string
  let playerId: string
  let testCardId: string

  test.beforeEach(async ({ request }) => {
    // Create a room
    const createResponse = await request.post('/api/create-room', {
      data: { name: 'Deduct Point Action Test Room', maxPlayers: 4 }
    })

    const createBody = await createResponse.json()
    roomId = createBody.roomId

    // Add a player to the room
    playerId = 'test-player-1'
    const joinResponse = await request.post('/api/join-room', {
      data: {
        roomId,
        playerId,
        playerName: 'Test Player',
        playerColor: 'red'
      }
    })

    expect(joinResponse.status()).toBe(200)

    // Start the game
    const startResponse = await request.post('/api/game/start', {
      data: { roomId }
    })

    expect(startResponse.status()).toBe(200)
  })

  test.afterEach(async ({ request }) => {
    // Clean up test card if it was created
    if (testCardId) {
      await request.delete(`/api/cards/test-card/${testCardId}`)
    }
  })

  test('should deduct 1 action point by default', async ({ request }) => {
    // 1. Create test card with deduct-point action (no amount specified)
    const createCardResponse = await request.post('/api/cards/test-card', {
      data: {
        action: 'deductPoint',
        parameters: [], // No amount parameter = default to 1
        cardName: 'Deduct 1 Point',
        cardDescription: 'Deduct 1 action point (default)'
      }
    })

    expect(createCardResponse.status()).toBe(200)
    const createCardBody = await createCardResponse.json()
    testCardId = createCardBody.data.id

    // 2. Get initial action points
    const initialRoomResponse = await request.get(`/api/room/${roomId}`)
    const initialRoomData = await initialRoomResponse.json()
    const initialTurn = initialRoomData.gameState.currentTurn
    const initialActionPoints = initialTurn.action_points

    expect(initialActionPoints).toBe(3) // Players start with 3 action points

    // 3. Play the card
    const playCardResponse = await request.post('/api/game/play-card', {
      data: {
        roomId,
        playerId,
        cardId: testCardId
      }
    })

    expect(playCardResponse.status()).toBe(200)
    const playCardBody = await playCardResponse.json()
    expect(playCardBody.success).toBe(true)

    // 4. Verify action points were deducted
    const finalRoomResponse = await request.get(`/api/room/${roomId}`)
    const finalRoomData = await finalRoomResponse.json()
    const finalTurn = finalRoomData.gameState.currentTurn

    expect(finalTurn.action_points).toBe(initialActionPoints - 1) // Should be 2
    expect(finalTurn.player_id).toBe(playerId) // Same player's turn

    // Also verify player state
    const finalPlayer = finalRoomData.players[playerId]
    expect(finalPlayer.actionPoints).toBe(2)
  })

  test('should deduct specified amount of action points', async ({ request }) => {
    // 1. Create test card with deduct 2 points action
    const createCardResponse = await request.post('/api/cards/test-card', {
      data: {
        action: 'deductPoint',
        parameters: [
          { name: 'amount', type: 'AMOUNT', value: '2' }
        ],
        cardName: 'Deduct 2 Points',
        cardDescription: 'Deduct 2 action points'
      }
    })

    expect(createCardResponse.status()).toBe(200)
    const createCardBody = await createCardResponse.json()
    testCardId = createCardBody.data.id

    // 2. Get initial action points
    const initialRoomResponse = await request.get(`/api/room/${roomId}`)
    const initialRoomData = await initialRoomResponse.json()
    const initialTurn = initialRoomData.gameState.currentTurn

    expect(initialTurn.action_points).toBe(3)

    // 3. Play the card
    const playCardResponse = await request.post('/api/game/play-card', {
      data: {
        roomId,
        playerId,
        cardId: testCardId
      }
    })

    expect(playCardResponse.status()).toBe(200)
    const playCardBody = await playCardResponse.json()
    expect(playCardBody.success).toBe(true)

    // 4. Verify 2 action points were deducted
    const finalRoomResponse = await request.get(`/api/room/${roomId}`)
    const finalRoomData = await finalRoomResponse.json()
    const finalTurn = finalRoomData.gameState.currentTurn

    expect(finalTurn.action_points).toBe(1) // 3 - 2 = 1
  })

  test('should deduct all action points and advance turn', async ({ request }) => {
    // 1. Create test card with deduct 3 points action (all points)
    const createCardResponse = await request.post('/api/cards/test-card', {
      data: {
        action: 'deductPoint',
        parameters: [
          { name: 'amount', type: 'AMOUNT', value: '3' }
        ],
        cardName: 'Deduct All Points',
        cardDescription: 'Deduct all 3 action points'
      }
    })

    expect(createCardResponse.status()).toBe(200)
    const createCardBody = await createCardResponse.json()
    testCardId = createCardBody.data.id

    // First, add a second player so turn can advance
    const player2Id = 'test-player-2'
    const joinPlayer2Response = await request.post('/api/join-room', {
      data: {
        roomId,
        playerId: player2Id,
        playerName: 'Test Player 2',
        playerColor: 'blue'
      }
    })
    expect(joinPlayer2Response.status()).toBe(200)

    // 2. Get initial state
    const initialRoomResponse = await request.get(`/api/room/${roomId}`)
    const initialRoomData = await initialRoomResponse.json()
    const initialTurn = initialRoomData.gameState.currentTurn

    expect(initialTurn.action_points).toBe(3)
    expect(initialTurn.player_id).toBe(playerId)

    // 3. Play the card
    const playCardResponse = await request.post('/api/game/play-card', {
      data: {
        roomId,
        playerId,
        cardId: testCardId
      }
    })

    expect(playCardResponse.status()).toBe(200)
    const playCardBody = await playCardResponse.json()
    expect(playCardBody.success).toBe(true)

    // 4. Verify turn advanced to next player
    const finalRoomResponse = await request.get(`/api/room/${roomId}`)
    const finalRoomData = await finalRoomResponse.json()
    const finalTurn = finalRoomData.gameState.currentTurn

    expect(finalTurn.player_id).toBe(player2Id) // Turn should advance
    expect(finalTurn.action_points).toBe(3) // New turn starts with 3 points
  })

  test('should fail when trying to deduct more points than available', async ({ request }) => {
    // 1. Create test card that tries to deduct more points than available
    const createCardResponse = await request.post('/api/cards/test-card', {
      data: {
        action: 'deductPoint',
        parameters: [
          { name: 'amount', type: 'AMOUNT', value: '5' }
        ],
        cardName: 'Deduct Too Many Points',
        cardDescription: 'Try to deduct more points than available'
      }
    })

    expect(createCardResponse.status()).toBe(200)
    const createCardBody = await createCardResponse.json()
    testCardId = createCardBody.data.id

    // 2. Try to play the card - should fail
    const playCardResponse = await request.post('/api/game/play-card', {
      data: {
        roomId,
        playerId,
        cardId: testCardId
      }
    })

    expect(playCardResponse.status()).toBe(400)
    const playCardBody = await playCardResponse.json()
    expect(playCardBody.success).toBe(false)
    expect(playCardBody.message).toContain('Not enough action points')

    // 3. Verify action points unchanged
    const finalRoomResponse = await request.get(`/api/room/${roomId}`)
    const finalRoomData = await finalRoomResponse.json()
    const finalTurn = finalRoomData.gameState.currentTurn

    expect(finalTurn.action_points).toBe(3) // Should remain unchanged
  })

  test('should fail when not the player turn', async ({ request }) => {
    // Add a second player
    const player2Id = 'test-player-2'
    const joinPlayer2Response = await request.post('/api/join-room', {
      data: {
        roomId,
        playerId: player2Id,
        playerName: 'Test Player 2',
        playerColor: 'blue'
      }
    })
    expect(joinPlayer2Response.status()).toBe(200)

    // 1. Create test card
    const createCardResponse = await request.post('/api/cards/test-card', {
      data: {
        action: 'deductPoint',
        parameters: [
          { name: 'amount', type: 'AMOUNT', value: '1' }
        ],
        cardName: 'Deduct 1 Point Wrong Turn',
        cardDescription: 'Try to deduct when not your turn'
      }
    })

    expect(createCardResponse.status()).toBe(200)
    const createCardBody = await createCardResponse.json()
    testCardId = createCardBody.data.id

    // 2. Verify whose turn it is
    const roomResponse = await request.get(`/api/room/${roomId}`)
    const roomData = await roomResponse.json()
    const currentTurn = roomData.gameState.currentTurn

    // Get the player who is NOT on turn
    const wrongPlayerId = currentTurn.player_id === playerId ? player2Id : playerId

    // 3. Try to play card with wrong player - should fail
    const playCardResponse = await request.post('/api/game/play-card', {
      data: {
        roomId,
        playerId: wrongPlayerId,
        cardId: testCardId
      }
    })

    expect(playCardResponse.status()).toBe(400)
    const playCardBody = await playCardResponse.json()
    expect(playCardBody.success).toBe(false)
    expect(playCardBody.message).toContain("not your turn")
  })

  test('should work with zero amount parameter', async ({ request }) => {
    // 1. Create test card with 0 amount
    const createCardResponse = await request.post('/api/cards/test-card', {
      data: {
        action: 'deductPoint',
        parameters: [
          { name: 'amount', type: 'AMOUNT', value: '0' }
        ],
        cardName: 'Deduct 0 Points',
        cardDescription: 'Deduct 0 action points (no-op)'
      }
    })

    expect(createCardResponse.status()).toBe(200)
    const createCardBody = await createCardResponse.json()
    testCardId = createCardBody.data.id

    // 2. Get initial action points
    const initialRoomResponse = await request.get(`/api/room/${roomId}`)
    const initialRoomData = await initialRoomResponse.json()
    const initialTurn = initialRoomData.gameState.currentTurn

    expect(initialTurn.action_points).toBe(3)

    // 3. Play the card
    const playCardResponse = await request.post('/api/game/play-card', {
      data: {
        roomId,
        playerId,
        cardId: testCardId
      }
    })

    expect(playCardResponse.status()).toBe(200)
    const playCardBody = await playCardResponse.json()
    expect(playCardBody.success).toBe(true)

    // 4. Verify action points unchanged
    const finalRoomResponse = await request.get(`/api/room/${roomId}`)
    const finalRoomData = await finalRoomResponse.json()
    const finalTurn = finalRoomData.gameState.currentTurn

    expect(finalTurn.action_points).toBe(3) // Should remain unchanged
  })
})