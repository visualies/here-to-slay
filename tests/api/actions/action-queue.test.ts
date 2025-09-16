import { test, expect } from '@playwright/test'

test.describe('API: Action Queue System', () => {
  let roomId: string
  let playerId: string
  let testCardId: string

  test.beforeEach(async ({ request }) => {
    // Create a room
    const createResponse = await request.post('/api/create-room', {
      data: { name: 'Action Queue Test Room', maxPlayers: 4 }
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

  test('should add actions to queue when playing a card with multiple actions', async ({ request }) => {
    // 1. Create a test card with multiple actions
    const createCardResponse = await request.post('/api/cards/test-card', {
      data: {
        action: 'drawCard',
        parameters: [
          { name: 'target', type: 'LOCATION', value: 'support-deck' },
          { name: 'destination', type: 'LOCATION', value: 'own-hand' },
          { name: 'amount', type: 'AMOUNT', value: '1' }
        ],
        cardName: 'Test Draw Card',
        cardDescription: 'Test card that draws one card'
      }
    })

    expect(createCardResponse.status()).toBe(200)
    const createCardBody = await createCardResponse.json()
    testCardId = createCardBody.data.id

    // Verify the card was created correctly
    expect(createCardBody.data.actions).toHaveLength(1)
    expect(createCardBody.data.actions[0].action).toBe('drawCard')
    expect(createCardBody.data.actions[0].params).toHaveLength(3)

    // 2. Get initial room state to check action queue is empty
    const initialRoomResponse = await request.get(`/api/room/${roomId}`)
    expect(initialRoomResponse.status()).toBe(200)

    const initialRoomData = await initialRoomResponse.json()
    const initialTurn = initialRoomData.gameState.currentTurn

    expect(initialTurn.action_queue).toHaveLength(0)
    expect(initialTurn.player_id).toBe(playerId)
    expect(initialTurn.action_points).toBe(3)

    // 3. Play the test card
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
    expect(playCardBody.data.actionsProcessed).toBe(1)

    // 4. Verify the action was processed and queue is empty again
    const finalRoomResponse = await request.get(`/api/room/${roomId}`)
    expect(finalRoomResponse.status()).toBe(200)

    const finalRoomData = await finalRoomResponse.json()
    const finalTurn = finalRoomData.gameState.currentTurn

    // Action should have been processed, so queue should be empty
    expect(finalTurn.action_queue).toHaveLength(0)

    // Player should have drawn a card (6 instead of 5)
    const finalPlayer = finalRoomData.players[playerId]
    expect(finalPlayer.hand).toHaveLength(6)
  })

  test('should create and test a card with deduct-point action only', async ({ request }) => {
    // 1. Create a test card with only deduct-point action
    const createCardResponse = await request.post('/api/cards/test-card', {
      data: {
        action: 'deductPoint',
        parameters: [
          { name: 'amount', type: 'AMOUNT', value: '2' }
        ],
        cardName: 'Test Deduct 2 Points',
        cardDescription: 'Test card that deducts 2 action points'
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

    // 3. Play the test card
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
    expect(playCardBody.data.actionsProcessed).toBe(1)

    // 4. Verify action points were deducted
    const finalRoomResponse = await request.get(`/api/room/${roomId}`)
    const finalRoomData = await finalRoomResponse.json()
    const finalTurn = finalRoomData.gameState.currentTurn

    expect(finalTurn.action_points).toBe(1) // 3 - 2 = 1
  })

  test('should handle card with no actions gracefully', async ({ request }) => {
    // Create a test card with no action (this will test the error handling)
    const createCardResponse = await request.post('/api/cards/test-card', {
      data: {
        action: 'nonExistentAction',
        cardName: 'Test No Action Card',
        cardDescription: 'Test card with non-existent action'
      }
    })

    expect(createCardResponse.status()).toBe(200)
    const createCardBody = await createCardResponse.json()
    testCardId = createCardBody.data.id

    // Try to play the card - should fail
    const playCardResponse = await request.post('/api/game/play-card', {
      data: {
        roomId,
        playerId,
        cardId: testCardId
      }
    })

    expect(playCardResponse.status()).toBe(400)
    const playCardBody = await playCardResponse.json()

    // Should fail because the action doesn't exist
    expect(playCardBody.success).toBe(false)
    expect(playCardBody.message).toContain('Unknown action')
  })

  test('should verify test card creation and deletion endpoints', async ({ request }) => {
    // 1. Create a test card
    const createResponse = await request.post('/api/cards/test-card', {
      data: {
        action: 'drawCard',
        parameters: [
          { name: 'target', type: 'LOCATION', value: 'support-deck' },
          { name: 'destination', type: 'LOCATION', value: 'own-hand' },
          { name: 'amount', type: 'AMOUNT', value: '1' }
        ]
      }
    })

    expect(createResponse.status()).toBe(200)
    const createBody = await createResponse.json()
    testCardId = createBody.data.id

    expect(testCardId).toMatch(/^test-drawCard-\d+$/)
    expect(createBody.data.name).toBe('Test drawCard Card')

    // 2. Verify we can fetch the created card
    const fetchResponse = await request.get(`/api/cards/${testCardId}`)
    expect(fetchResponse.status()).toBe(200)

    const fetchBody = await fetchResponse.json()
    expect(fetchBody.data.id).toBe(testCardId)

    // 3. Delete the test card
    const deleteResponse = await request.delete(`/api/cards/test-card/${testCardId}`)
    expect(deleteResponse.status()).toBe(200)

    const deleteBody = await deleteResponse.json()
    expect(deleteBody.success).toBe(true)

    // 4. Verify the card is gone
    const fetchAfterDeleteResponse = await request.get(`/api/cards/${testCardId}`)
    expect(fetchAfterDeleteResponse.status()).toBe(404)

    // Mark as cleaned up so afterEach doesn't try to delete again
    testCardId = ''
  })

  test('should prevent deletion of non-test cards', async ({ request }) => {
    // Try to delete a system card
    const deleteResponse = await request.delete('/api/cards/test-card/draw-001')
    expect(deleteResponse.status()).toBe(400)

    const deleteBody = await deleteResponse.json()
    expect(deleteBody.success).toBe(false)
    expect(deleteBody.message).toContain('Can only delete test cards')
  })
})