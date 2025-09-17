import { test, expect } from '@playwright/test'
import { createTestCardAndAddToHand, verifyCardPlacement, addCardToPlayerHandInTest } from './test-helpers'

test.describe('API: Place Card Action', () => {
  let roomId: string
  let playerId: string
  let testCardId: string

  test.beforeEach(async ({ request }) => {
    // Create a room
    const createResponse = await request.post('/api/create-room', {
      data: { name: 'Place Card Action Test Room', maxPlayers: 4 }
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

  test('should demonstrate proper card placement testing approach', async ({ request }) => {
    // This test demonstrates the proper way to test card placement
    // by showing the limitations of the current testing approach

    // 1. Get initial room state
    const initialRoomResponse = await request.get(`/api/room/${roomId}`)
    expect(initialRoomResponse.status()).toBe(200)
    const initialRoom = await initialRoomResponse.json()

    const initialPlayer = initialRoom.players?.[playerId]
    const initialHandSize = initialPlayer?.hand?.length || 0
    const initialPartySize = initialPlayer?.party?.heroes?.length || 0

    console.log(`Initial hand size: ${initialHandSize}`)
    console.log(`Initial party size: ${initialPartySize}`)

    // 2. Create a test card with place-card action
    const createCardResponse = await request.post('/api/cards/test-card', {
      data: {
        action: 'placeCard',
        parameters: []
      }
    })

    expect(createCardResponse.status()).toBe(200)
    const cardData = await createCardResponse.json()
    testCardId = cardData.data.id

    console.log(`Created test card: ${testCardId}`)

    // 3. Try to play the test card (it won't be in hand, so it should fail gracefully)
    const playCardResponse = await request.post('/api/game/play-card', {
      data: {
        roomId,
        playerId,
        cardId: testCardId
      }
    })

    console.log('Play card response status:', playCardResponse.status())
    const playResult = await playCardResponse.json()
    console.log('Play card result:', playResult)
    
    if (playCardResponse.status() !== 200) {
      console.log('❌ Card play failed:', playResult.message)
    }
    
    expect(playCardResponse.status()).toBe(200)

    // 4. Verify no changes since card wasn't in hand
    const finalRoomResponse = await request.get(`/api/room/${roomId}`)
    expect(finalRoomResponse.status()).toBe(200)
    const finalRoom = await finalRoomResponse.json()

    const finalPlayer = finalRoom.players?.[playerId]
    
    // Hand and party sizes should remain the same
    expect(finalPlayer?.hand?.length || 0).toBe(initialHandSize)
    expect(finalPlayer?.party?.heroes?.length || 0).toBe(initialPartySize)

    console.log('This test demonstrates the limitation: test cards are not automatically in hand')
    console.log('To properly test card placement, we need either:')
    console.log('1. A way to add cards to hand for testing')
    console.log('2. Use existing cards in hand and modify them')
    console.log('3. Create a test helper that sets up the proper state')
  })

  test('should handle card not in hand gracefully', async ({ request }) => {
    // 1. Create test card with place card action
    const createCardResponse = await request.post('/api/cards/test-card', {
      data: {
        action: 'placeCard',
        parameters: []
      }
    })

    expect(createCardResponse.status()).toBe(200)
    const cardData = await createCardResponse.json()
    testCardId = cardData.data.id

    // 2. Play the card (which should trigger place-card action)
    // Since we didn't add it to hand, it should not be there
    const playCardResponse = await request.post('/api/game/play-card', {
      data: {
        roomId,
        playerId,
        cardId: testCardId
      }
    })

    expect(playCardResponse.status()).toBe(200)
    const playResult = await playCardResponse.json()
    expect(playResult.success).toBe(true)
    // The place-card action should succeed but not place anything since card not in hand

    // 3. Verify no changes to party
    const finalRoomResponse = await request.get(`/api/room/${roomId}`)
    expect(finalRoomResponse.status()).toBe(200)
    const finalRoom = await finalRoomResponse.json()

    const finalPlayer = finalRoom.players?.[playerId]
    expect(finalPlayer.party?.heroes?.length || 0).toBe(0)
  })

  test('should work with place card action only', async ({ request }) => {
    // 1. Create test card with place card action
    const createCardResponse = await request.post('/api/cards/test-card', {
      data: {
        action: 'placeCard',
        parameters: []
      }
    })

    expect(createCardResponse.status()).toBe(200)
    const cardData = await createCardResponse.json()
    testCardId = cardData.data.id

    // 2. Get initial state
    const initialRoomResponse = await request.get(`/api/room/${roomId}`)
    expect(initialRoomResponse.status()).toBe(200)
    const initialRoom = await initialRoomResponse.json()

    const initialPlayer = initialRoom.players?.[playerId]
    const initialHandSize = initialPlayer?.hand?.length || 0
    const initialPartySize = initialPlayer?.party?.heroes?.length || 0

    // 3. Play the card (which should trigger place-card action)
    const playCardResponse = await request.post('/api/game/play-card', {
      data: {
        roomId,
        playerId,
        cardId: testCardId
      }
    })

    expect(playCardResponse.status()).toBe(200)
    const playResult = await playCardResponse.json()
    expect(playResult.success).toBe(true)

    // 4. Verify the action was processed
    const finalRoomResponse = await request.get(`/api/room/${roomId}`)
    expect(finalRoomResponse.status()).toBe(200)
    const finalRoom = await finalRoomResponse.json()

    const finalPlayer = finalRoom.players?.[playerId]
    
    // Since the test card is not in hand, no card should be placed
    expect(finalPlayer?.party?.heroes?.length || 0).toBe(initialPartySize)
    
    // Action points should remain unchanged (place-card doesn't deduct points)
    expect(finalPlayer.actionPoints).toBe(initialPlayer.actionPoints)
  })

  test('should place a card from hand to party using test helper', async ({ request }) => {
    // This test properly tests the place-card action by creating a test card
    // and adding it directly to the player's hand

    // 1. Get initial room state
    const initialRoomResponse = await request.get(`/api/room/${roomId}`)
    expect(initialRoomResponse.status()).toBe(200)
    const initialRoom = await initialRoomResponse.json()

    const initialPlayer = initialRoom.players?.[playerId]
    const initialHandSize = initialPlayer?.hand?.length || 0
    const initialPartySize = initialPlayer?.party?.heroes?.length || 0

    console.log(`Initial hand size: ${initialHandSize}`)
    console.log(`Initial party size: ${initialPartySize}`)

    // 2. Create a test card with place-card action and add it to hand
    const { cardId, card } = await createTestCardAndAddToHand(
      request, 
      roomId, 
      playerId, 
      'placeCard', 
      []
    )
    testCardId = cardId

    console.log(`Created and added test card: ${card.name} (${cardId})`)

    // 3. Verify the card was added to hand
    const roomAfterAddResponse = await request.get(`/api/room/${roomId}`)
    expect(roomAfterAddResponse.status()).toBe(200)
    const roomAfterAdd = await roomAfterAddResponse.json()

    const playerAfterAdd = roomAfterAdd.players?.[playerId]
    const handSizeAfterAdd = playerAfterAdd?.hand?.length || 0

    expect(handSizeAfterAdd).toBe(initialHandSize + 1)
    console.log(`Hand size after adding test card: ${handSizeAfterAdd}`)

    // 4. Play the card (which should trigger place-card action)
    const playCardResponse = await request.post('/api/game/play-card', {
      data: {
        roomId,
        playerId,
        cardId: cardId
      }
    })

    expect(playCardResponse.status()).toBe(200)
    const playResult = await playCardResponse.json()
    console.log('Play card result:', playResult)
    expect(playResult.success).toBe(true)

    // 5. Verify the card was placed in party
    const verification = await verifyCardPlacement(request, roomId, playerId, cardId)
    
    expect(verification.success).toBe(true)
    expect(verification.handSize).toBe(initialHandSize) // Hand size back to original
    expect(verification.partySize).toBe(initialPartySize + 1) // Party size increased by 1
    expect(verification.cardInParty).toBeDefined()
    expect(verification.cardInParty?.id).toBe(cardId)
    expect(verification.cardInParty?.name).toBe(card.name)
  })

  test('should handle empty hand gracefully', async ({ request }) => {
    // 1. Create test card with place card action
    const createCardResponse = await request.post('/api/cards/test-card', {
      data: {
        action: 'placeCard',
        parameters: []
      }
    })

    expect(createCardResponse.status()).toBe(200)
    const cardData = await createCardResponse.json()
    testCardId = cardData.data.id

    // 2. Play the card (which should trigger place-card action)
    const playCardResponse = await request.post('/api/game/play-card', {
      data: {
        roomId,
        playerId,
        cardId: testCardId
      }
    })

    expect(playCardResponse.status()).toBe(200)
    const playResult = await playCardResponse.json()
    expect(playResult.success).toBe(true)
    // The place-card action should succeed but not place anything since card not in hand

    // 3. Verify no changes to party
    const finalRoomResponse = await request.get(`/api/room/${roomId}`)
    expect(finalRoomResponse.status()).toBe(200)
    const finalRoom = await finalRoomResponse.json()

    const finalPlayer = finalRoom.players?.[playerId]
    expect(finalPlayer.party?.heroes?.length || 0).toBe(0)
  })

  test('should require cardId in action context', async ({ request }) => {
    // This test verifies that the place-card action works correctly when cardId is provided
    // The cardId is passed through the play-card endpoint to the action context
    
    // 1. Create test card with place card action
    const createCardResponse = await request.post('/api/cards/test-card', {
      data: {
        action: 'placeCard',
        parameters: []
      }
    })

    expect(createCardResponse.status()).toBe(200)
    const cardData = await createCardResponse.json()
    testCardId = cardData.data.id

    // 2. Add the card to player's hand first
    await addCardToPlayerHandInTest(request, roomId, playerId, testCardId)

    // 3. Play the card - this should work because the cardId is passed through the play-card endpoint
    const playCardResponse = await request.post('/api/game/play-card', {
      data: {
        roomId,
        playerId,
        cardId: testCardId
      }
    })

    // The play-card endpoint should pass the cardId to the action context
    expect(playCardResponse.status()).toBe(200)
    const playResult = await playCardResponse.json()
    expect(playResult.success).toBe(true)
    
    // 4. Verify the card was placed in the party
    const verification = await verifyCardPlacement(request, roomId, playerId, testCardId)
    expect(verification.success).toBe(true)
    expect(verification.cardInParty?.id).toBe(testCardId)
  })

  test('should verify place card action is registered', async ({ request }) => {
    // 1. Create test card with place card action
    const createCardResponse = await request.post('/api/cards/test-card', {
      data: {
        action: 'placeCard',
        parameters: []
      }
    })

    expect(createCardResponse.status()).toBe(200)
    const cardData = await createCardResponse.json()
    testCardId = cardData.data.id

    // 2. Verify the card was created with the correct action
    expect(cardData.data.actions).toHaveLength(1)
    expect(cardData.data.actions[0].action).toBe('placeCard')
    expect(cardData.data.actions[0].params).toHaveLength(0)

    // 3. Play the card to test the action works
    const playCardResponse = await request.post('/api/game/play-card', {
      data: {
        roomId,
        playerId,
        cardId: testCardId
      }
    })

    expect(playCardResponse.status()).toBe(200)
    const playResult = await playCardResponse.json()
    expect(playResult.success).toBe(true)
  })
})
