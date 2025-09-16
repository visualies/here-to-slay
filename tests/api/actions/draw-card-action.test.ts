import { test, expect } from '@playwright/test'

test.describe('API: Draw Card Action', () => {
  let roomId: string
  let playerId: string
  let testCardId: string

  test.beforeEach(async ({ request }) => {
    // Create a room
    const createResponse = await request.post('/api/create-room', {
      data: { name: 'Draw Card Action Test Room', maxPlayers: 4 }
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

  test('should draw 1 card from support deck to own hand', async ({ request }) => {
    // 1. Create test card with draw 1 card action
    const createCardResponse = await request.post('/api/cards/test-card', {
      data: {
        action: 'drawCard',
        parameters: [
          { name: 'target', type: 'LOCATION', value: 'support-deck' },
          { name: 'destination', type: 'LOCATION', value: 'own-hand' },
          { name: 'amount', type: 'AMOUNT', value: '1' }
        ],
        cardName: 'Draw 1 Card',
        cardDescription: 'Draw 1 card from support deck'
      }
    })

    expect(createCardResponse.status()).toBe(200)
    const createCardBody = await createCardResponse.json()
    testCardId = createCardBody.data.id

    // 2. Get initial state
    const initialRoomResponse = await request.get(`/api/room/${roomId}`)
    const initialRoomData = await initialRoomResponse.json()
    const initialPlayer = initialRoomData.players[playerId]
    const initialHandSize = initialPlayer.hand.length
    const initialSupportStackSize = initialRoomData.gameState.supportStack.length

    expect(initialHandSize).toBe(5) // Players start with 5 cards

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

    // 4. Verify results
    const finalRoomResponse = await request.get(`/api/room/${roomId}`)
    const finalRoomData = await finalRoomResponse.json()
    const finalPlayer = finalRoomData.players[playerId]
    const finalSupportStackSize = finalRoomData.gameState.supportStack.length

    // Player should have 1 more card
    expect(finalPlayer.hand.length).toBe(initialHandSize + 1)

    // Support stack should have 1 less card
    expect(finalSupportStackSize).toBe(initialSupportStackSize - 1)
  })

  test('should draw 3 cards from support deck to own hand', async ({ request }) => {
    // 1. Create test card with draw 3 cards action
    const createCardResponse = await request.post('/api/cards/test-card', {
      data: {
        action: 'drawCard',
        parameters: [
          { name: 'target', type: 'LOCATION', value: 'support-deck' },
          { name: 'destination', type: 'LOCATION', value: 'own-hand' },
          { name: 'amount', type: 'AMOUNT', value: '3' }
        ],
        cardName: 'Draw 3 Cards',
        cardDescription: 'Draw 3 cards from support deck'
      }
    })

    expect(createCardResponse.status()).toBe(200)
    const createCardBody = await createCardResponse.json()
    testCardId = createCardBody.data.id

    // 2. Get initial state
    const initialRoomResponse = await request.get(`/api/room/${roomId}`)
    const initialRoomData = await initialRoomResponse.json()
    const initialPlayer = initialRoomData.players[playerId]
    const initialHandSize = initialPlayer.hand.length
    const initialSupportStackSize = initialRoomData.gameState.supportStack.length

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

    // 4. Verify results
    const finalRoomResponse = await request.get(`/api/room/${roomId}`)
    const finalRoomData = await finalRoomResponse.json()
    const finalPlayer = finalRoomData.players[playerId]
    const finalSupportStackSize = finalRoomData.gameState.supportStack.length

    // Player should have 3 more cards
    expect(finalPlayer.hand.length).toBe(initialHandSize + 3)

    // Support stack should have 3 less cards
    expect(finalSupportStackSize).toBe(initialSupportStackSize - 3)
  })

  test('should fail when trying to draw more cards than available in support deck', async ({ request }) => {
    // 1. Get current support stack size
    const initialRoomResponse = await request.get(`/api/room/${roomId}`)
    const initialRoomData = await initialRoomResponse.json()
    const supportStackSize = initialRoomData.gameState.supportStack.length

    // 2. Create test card that tries to draw more cards than available
    const createCardResponse = await request.post('/api/cards/test-card', {
      data: {
        action: 'drawCard',
        parameters: [
          { name: 'target', type: 'LOCATION', value: 'support-deck' },
          { name: 'destination', type: 'LOCATION', value: 'own-hand' },
          { name: 'amount', type: 'AMOUNT', value: String(supportStackSize + 10) }
        ],
        cardName: 'Draw Too Many Cards',
        cardDescription: 'Try to draw more cards than available'
      }
    })

    expect(createCardResponse.status()).toBe(200)
    const createCardBody = await createCardResponse.json()
    testCardId = createCardBody.data.id

    // 3. Try to play the card - should fail
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
    expect(playCardBody.message).toContain('Not enough cards')
  })

  test('should handle drawing from own hand to support deck', async ({ request }) => {
    // 1. Create test card that moves cards from hand to support deck
    const createCardResponse = await request.post('/api/cards/test-card', {
      data: {
        action: 'drawCard',
        parameters: [
          { name: 'target', type: 'LOCATION', value: 'own-hand' },
          { name: 'destination', type: 'LOCATION', value: 'support-deck' },
          { name: 'amount', type: 'AMOUNT', value: '2' }
        ],
        cardName: 'Move Cards to Deck',
        cardDescription: 'Move 2 cards from hand to support deck'
      }
    })

    expect(createCardResponse.status()).toBe(200)
    const createCardBody = await createCardResponse.json()
    testCardId = createCardBody.data.id

    // 2. Get initial state
    const initialRoomResponse = await request.get(`/api/room/${roomId}`)
    const initialRoomData = await initialRoomResponse.json()
    const initialPlayer = initialRoomData.players[playerId]
    const initialHandSize = initialPlayer.hand.length
    const initialSupportStackSize = initialRoomData.gameState.supportStack.length

    expect(initialHandSize).toBeGreaterThanOrEqual(2) // Need at least 2 cards in hand

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

    // 4. Verify results
    const finalRoomResponse = await request.get(`/api/room/${roomId}`)
    const finalRoomData = await finalRoomResponse.json()
    const finalPlayer = finalRoomData.players[playerId]
    const finalSupportStackSize = finalRoomData.gameState.supportStack.length

    // Player should have 2 less cards
    expect(finalPlayer.hand.length).toBe(initialHandSize - 2)

    // Support stack should have 2 more cards
    expect(finalSupportStackSize).toBe(initialSupportStackSize + 2)
  })

  test('should fail when trying to move more cards from hand than available', async ({ request }) => {
    // 1. Get current hand size
    const initialRoomResponse = await request.get(`/api/room/${roomId}`)
    const initialRoomData = await initialRoomResponse.json()
    const initialPlayer = initialRoomData.players[playerId]
    const handSize = initialPlayer.hand.length

    // 2. Create test card that tries to move more cards than in hand
    const createCardResponse = await request.post('/api/cards/test-card', {
      data: {
        action: 'drawCard',
        parameters: [
          { name: 'target', type: 'LOCATION', value: 'own-hand' },
          { name: 'destination', type: 'LOCATION', value: 'support-deck' },
          { name: 'amount', type: 'AMOUNT', value: String(handSize + 5) }
        ],
        cardName: 'Move Too Many Cards',
        cardDescription: 'Try to move more cards than in hand'
      }
    })

    expect(createCardResponse.status()).toBe(200)
    const createCardBody = await createCardResponse.json()
    testCardId = createCardBody.data.id

    // 3. Try to play the card - should fail
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
    expect(playCardBody.message).toContain('Not enough cards')
  })

  test('should fail with unsupported location combinations', async ({ request }) => {
    // Test unsupported source location
    const createCardResponse = await request.post('/api/cards/test-card', {
      data: {
        action: 'drawCard',
        parameters: [
          { name: 'target', type: 'LOCATION', value: 'discard-pile' },
          { name: 'destination', type: 'LOCATION', value: 'own-hand' },
          { name: 'amount', type: 'AMOUNT', value: '1' }
        ],
        cardName: 'Unsupported Source',
        cardDescription: 'Test unsupported source location'
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
    expect(playCardBody.success).toBe(false)
    expect(playCardBody.message).toContain('Unsupported source location')
  })
})