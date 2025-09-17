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
    console.log(`🧪 Test: Playing card ${testCardId} for player ${playerId} in room ${roomId}`)
    const playCardResponse = await request.post('/api/game/play-card', {
      data: {
        roomId,
        playerId,
        cardId: testCardId
      }
    })

    console.log(`🧪 Test: Play card response status: ${playCardResponse.status()}`)
    const playCardBody = await playCardResponse.json()
    console.log(`🧪 Test: Play card response body:`, playCardBody)
    
    expect(playCardResponse.status()).toBe(200)
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

  // === TARGET TESTS (all targets → own-hand) ===
  test.describe('Target Locations (to own-hand)', () => {

    test('should draw from support-deck to own-hand', async ({ request }) => {
      const createCardResponse = await request.post('/api/cards/test-card', {
        data: {
          action: 'drawCard',
          parameters: [
            { name: 'target', type: 'LOCATION', value: 'support-deck' },
            { name: 'destination', type: 'LOCATION', value: 'own-hand' },
            { name: 'amount', type: 'AMOUNT', value: '1' }
          ],
          cardName: 'Draw from Support Deck',
          cardDescription: 'Draw from support deck to own hand'
        }
      })

      expect(createCardResponse.status()).toBe(200)
      const createCardBody = await createCardResponse.json()
      testCardId = createCardBody.data.id

      const initialRoomResponse = await request.get(`/api/room/${roomId}`)
      const initialRoomData = await initialRoomResponse.json()
      const initialPlayer = initialRoomData.players[playerId]
      const initialHandSize = initialPlayer.hand.length
      const initialSupportStackSize = initialRoomData.gameState.supportStack.length

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

      const finalRoomResponse = await request.get(`/api/room/${roomId}`)
      const finalRoomData = await finalRoomResponse.json()
      const finalPlayer = finalRoomData.players[playerId]
      const finalSupportStackSize = finalRoomData.gameState.supportStack.length

      expect(finalPlayer.hand.length).toBe(initialHandSize + 1)
      expect(finalSupportStackSize).toBe(initialSupportStackSize - 1)
    })

    test('should draw from own-hand to own-hand (circular - should work)', async ({ request }) => {
      const createCardResponse = await request.post('/api/cards/test-card', {
        data: {
          action: 'drawCard',
          parameters: [
            { name: 'target', type: 'LOCATION', value: 'own-hand' },
            { name: 'destination', type: 'LOCATION', value: 'own-hand' },
            { name: 'amount', type: 'AMOUNT', value: '1' }
          ],
          cardName: 'Circular Hand Draw',
          cardDescription: 'Draw from own hand to own hand'
        }
      })

      expect(createCardResponse.status()).toBe(200)
      const createCardBody = await createCardResponse.json()
      testCardId = createCardBody.data.id

      const initialRoomResponse = await request.get(`/api/room/${roomId}`)
      const initialRoomData = await initialRoomResponse.json()
      const initialPlayer = initialRoomData.players[playerId]
      const initialHandSize = initialPlayer.hand.length

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

      const finalRoomResponse = await request.get(`/api/room/${roomId}`)
      const finalRoomData = await finalRoomResponse.json()
      const finalPlayer = finalRoomData.players[playerId]

      // Hand size should remain the same (circular operation)
      expect(finalPlayer.hand.length).toBe(initialHandSize)
    })

    test('should fail to draw from cache to own-hand (unsupported target)', async ({ request }) => {
      const createCardResponse = await request.post('/api/cards/test-card', {
        data: {
          action: 'drawCard',
          parameters: [
            { name: 'target', type: 'LOCATION', value: 'cache' },
            { name: 'destination', type: 'LOCATION', value: 'own-hand' },
            { name: 'amount', type: 'AMOUNT', value: '1' }
          ],
          cardName: 'Draw from Cache',
          cardDescription: 'Try to draw from cache (unsupported)'
        }
      })

      expect(createCardResponse.status()).toBe(200)
      const createCardBody = await createCardResponse.json()
      testCardId = createCardBody.data.id

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

    test('should fail to draw from discard-pile to own-hand (unsupported target)', async ({ request }) => {
      const createCardResponse = await request.post('/api/cards/test-card', {
        data: {
          action: 'drawCard',
          parameters: [
            { name: 'target', type: 'LOCATION', value: 'discard-pile' },
            { name: 'destination', type: 'LOCATION', value: 'own-hand' },
            { name: 'amount', type: 'AMOUNT', value: '1' }
          ],
          cardName: 'Draw from Discard',
          cardDescription: 'Try to draw from discard pile (unsupported)'
        }
      })

      expect(createCardResponse.status()).toBe(200)
      const createCardBody = await createCardResponse.json()
      testCardId = createCardBody.data.id

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

    test('should draw from other-hands with first selection', async ({ request }) => {
      // First add a second player so there are "other hands"
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

      // Add player 2 to the game
      const addPlayerResponse = await request.post('/api/game/add-player-to-game', {
        data: {
          roomId,
          playerId: player2Id
        }
      })
      expect(addPlayerResponse.status()).toBe(200)

      // Give player 2 some cards by having them draw from support deck first
      const giveCardsResponse = await request.post('/api/cards/test-card', {
        data: {
          action: 'drawCard',
          parameters: [
            { name: 'target', type: 'LOCATION', value: 'support-deck' },
            { name: 'destination', type: 'LOCATION', value: 'own-hand' },
            { name: 'amount', type: 'AMOUNT', value: '3' }
          ],
          cardName: 'Give Player 2 Cards',
          cardDescription: 'Give player 2 some cards'
        }
      })
      const giveCardsBody = await giveCardsResponse.json()
      const giveCardsId = giveCardsBody.data.id

      // Player 2 draws 3 cards
      await request.post('/api/game/play-card', {
        data: {
          roomId,
          playerId: player2Id,
          cardId: giveCardsId
        }
      })

      // Clean up the temp card
      await request.delete(`/api/cards/test-card/${giveCardsId}`)

      // Now create the test card for drawing from other hands
      const createCardResponse = await request.post('/api/cards/test-card', {
        data: {
          action: 'drawCard',
          parameters: [
            { name: 'target', type: 'LOCATION', value: 'other-hands' },
            { name: 'destination', type: 'LOCATION', value: 'own-hand' },
            { name: 'amount', type: 'AMOUNT', value: '1' },
            { name: 'selection', type: 'SELECTION_MODE', value: 'first' }
          ],
          cardName: 'Draw from Other Hands',
          cardDescription: 'Draw from other players hands with first selection'
        }
      })

      expect(createCardResponse.status()).toBe(200)
      const createCardBody = await createCardResponse.json()
      testCardId = createCardBody.data.id

      // Get initial state
      const initialRoomResponse = await request.get(`/api/room/${roomId}`)
      const initialRoomData = await initialRoomResponse.json()
      const initialPlayer1Hand = initialRoomData.players[playerId].hand.length
      const initialPlayer2Hand = initialRoomData.players[player2Id].hand.length

      // Player 1 draws from other hands (should take from player 2)
      const playCardResponse = await request.post('/api/game/play-card', {
        data: {
          roomId,
          playerId,
          cardId: testCardId
        }
      })

      const playCardBody = await playCardResponse.json()
      if (playCardResponse.status() !== 200) {
        console.log('Error response:', playCardBody)
      }
      expect(playCardResponse.status()).toBe(200)
      expect(playCardBody.success).toBe(true)

      // Check final state
      const finalRoomResponse = await request.get(`/api/room/${roomId}`)
      const finalRoomData = await finalRoomResponse.json()
      const finalPlayer1Hand = finalRoomData.players[playerId].hand.length
      const finalPlayer2Hand = finalRoomData.players[player2Id].hand.length

      // Player 1 should gain 1 card, player 2 should lose 1 card
      expect(finalPlayer1Hand).toBe(initialPlayer1Hand + 1)
      expect(finalPlayer2Hand).toBe(initialPlayer2Hand - 1)
    })

    test('should draw from other-hands with first selection (multiple players)', async ({ request }) => {
      // Add multiple players to test selection modes
      const player2Id = 'test-player-2'
      const player3Id = 'test-player-3'

      await request.post('/api/join-room', {
        data: { roomId, playerId: player2Id, playerName: 'Player 2', playerColor: 'blue' }
      })
      await request.post('/api/join-room', {
        data: { roomId, playerId: player3Id, playerName: 'Player 3', playerColor: 'green' }
      })

      // Add players to the game
      await request.post('/api/game/add-player-to-game', {
        data: { roomId, playerId: player2Id }
      })
      await request.post('/api/game/add-player-to-game', {
        data: { roomId, playerId: player3Id }
      })

      // Give both players some cards
      const setupCardResponse = await request.post('/api/cards/test-card', {
        data: {
          action: 'drawCard',
          parameters: [
            { name: 'target', type: 'LOCATION', value: 'support-deck' },
            { name: 'destination', type: 'LOCATION', value: 'own-hand' },
            { name: 'amount', type: 'AMOUNT', value: '2' }
          ],
          cardName: 'Setup Cards',
          cardDescription: 'Give players cards for testing'
        }
      })
      const setupCardId = (await setupCardResponse.json()).data.id

      // Both players draw cards
      await request.post('/api/game/play-card', {
        data: { roomId, playerId: player2Id, cardId: setupCardId }
      })
      await request.post('/api/game/play-card', {
        data: { roomId, playerId: player3Id, cardId: setupCardId }
      })
      await request.delete(`/api/cards/test-card/${setupCardId}`)

      // Create test card with "first" selection
      const createCardResponse = await request.post('/api/cards/test-card', {
        data: {
          action: 'drawCard',
          parameters: [
            { name: 'target', type: 'LOCATION', value: 'other-hands' },
            { name: 'destination', type: 'LOCATION', value: 'own-hand' },
            { name: 'amount', type: 'AMOUNT', value: '1' },
            { name: 'selection', type: 'SELECTION_MODE', value: 'first' }
          ],
          cardName: 'Draw from First Player',
          cardDescription: 'Draw from first other player\'s hand'
        }
      })

      testCardId = (await createCardResponse.json()).data.id

      const playCardResponse = await request.post('/api/game/play-card', {
        data: { roomId, playerId, cardId: testCardId }
      })

      expect(playCardResponse.status()).toBe(200)
      expect((await playCardResponse.json()).success).toBe(true)
    })

    test('should fail to draw from other-hands when no other players exist', async ({ request }) => {
      const createCardResponse = await request.post('/api/cards/test-card', {
        data: {
          action: 'drawCard',
          parameters: [
            { name: 'target', type: 'LOCATION', value: 'other-hands' },
            { name: 'destination', type: 'LOCATION', value: 'own-hand' },
            { name: 'amount', type: 'AMOUNT', value: '1' },
            { name: 'selection', type: 'SELECTION_MODE', value: 'first' }
          ],
          cardName: 'Draw from No Players',
          cardDescription: 'Try to draw when no other players exist'
        }
      })

      testCardId = (await createCardResponse.json()).data.id

      const playCardResponse = await request.post('/api/game/play-card', {
        data: { roomId, playerId, cardId: testCardId }
      })

      expect(playCardResponse.status()).toBe(400)
      const playCardBody = await playCardResponse.json()
      expect(playCardBody.success).toBe(false)
      expect(playCardBody.message).toContain('No other players to draw from')
    })

    test('should handle user input when drawing from other-hands with destination owner selection', async ({ request }) => {
      // First add a second player so there are "other hands"
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

      // Add player 2 to the game
      const addPlayerResponse = await request.post('/api/game/add-player-to-game', {
        data: {
          roomId,
          playerId: player2Id
        }
      })
      expect(addPlayerResponse.status()).toBe(200)

      // Give player 2 some cards by having them draw from support deck first
      const giveCardsResponse = await request.post('/api/cards/test-card', {
        data: {
          action: 'drawCard',
          parameters: [
            { name: 'target', type: 'LOCATION', value: 'support-deck' },
            { name: 'destination', type: 'LOCATION', value: 'own-hand' },
            { name: 'amount', type: 'AMOUNT', value: '3' }
          ],
          cardName: 'Give Player 2 Cards',
          cardDescription: 'Give player 2 some cards'
        }
      })
      const giveCardsBody = await giveCardsResponse.json()
      const giveCardsId = giveCardsBody.data.id

      // Player 2 draws 3 cards
      await request.post('/api/game/play-card', {
        data: {
          roomId,
          playerId: player2Id,
          cardId: giveCardsId
        }
      })

      // Clean up the temp card
      await request.delete(`/api/cards/test-card/${giveCardsId}`)

      // Get initial state
      const initialRoomResponse = await request.get(`/api/room/${roomId}`)
      const initialRoomData = await initialRoomResponse.json()
      const initialPlayer1 = initialRoomData.players[playerId]
      const initialPlayer2 = initialRoomData.players[player2Id]
      const initialPlayer1Hand = initialPlayer1.hand.length
      const initialPlayer2Hand = initialPlayer2.hand.length

      console.log(`🧪 Initial Player 1 hand size: ${initialPlayer1Hand}`)
      console.log(`🧪 Initial Player 2 hand size: ${initialPlayer2Hand}`)
      console.log(`🧪 Player 2 cards:`, initialPlayer2.hand.map(c => c.id))

      // Create test card for drawing from other hands with destination owner selection
      // This should trigger user input since we're not using 'first' selection
      const createCardResponse = await request.post('/api/cards/test-card', {
        data: {
          action: 'drawCard',
          parameters: [
            { name: 'target', type: 'LOCATION', value: 'other-hands' },
            { name: 'destination', type: 'LOCATION', value: 'own-hand' },
            { name: 'amount', type: 'AMOUNT', value: '1' }
            // Note: No explicit selection mode - should default to DestinationOwner
          ],
          cardName: 'Draw from Other Hands (User Choice)',
          cardDescription: 'Draw from other players hands with user selection'
        }
      })

      expect(createCardResponse.status()).toBe(200)
      const createCardBody = await createCardResponse.json()
      testCardId = createCardBody.data.id

      // Play the card - this should trigger user input
      const playCardResponse = await request.post('/api/game/play-card', {
        data: {
          roomId,
          playerId,
          cardId: testCardId
        }
      })

      console.log(`🧪 Play card response status: ${playCardResponse.status()}`)
      const playCardBody = await playCardResponse.json()
      console.log(`🧪 Play card response body:`, JSON.stringify(playCardBody, null, 2))
      console.log(`🧪 Turn service result:`, JSON.stringify(playCardBody.turnServiceResult, null, 2))

      // The action should be waiting for user input
      expect(playCardResponse.status()).toBe(200)
      expect(playCardBody.success).toBe(true) // The card play itself succeeds
      expect(playCardBody.data.turnServiceResult.data.actionResults[0].success).toBe(false)
      expect(playCardBody.data.turnServiceResult.data.actionResults[0].waitingForInput).toBeDefined()
      expect(playCardBody.data.turnServiceResult.data.actionResults[0].waitingForInput.type).toBe('choice')

      // Now provide user input by selecting a specific card from player 2's hand
      const selectedCardId = initialPlayer2.hand[0].id // Select the first card
      console.log(`🧪 Providing user input: selected card ${selectedCardId}`)

      // Get the actionId from the current turn's action queue
      const roomStateResponse = await request.get(`/api/room/${roomId}`)
      const roomState = await roomStateResponse.json()
      const currentTurn = roomState.gameState.currentTurn
      console.log(`🧪 Current turn:`, JSON.stringify(currentTurn, null, 2))
      
      // Find the action that's waiting for input
      const waitingAction = currentTurn.action_queue.find(action => action.state === 'waiting')
      console.log(`🧪 Waiting action:`, JSON.stringify(waitingAction, null, 2))
      
      if (!waitingAction) {
        throw new Error('No action found waiting for input')
      }
      
      const actionId = waitingAction.id

      const provideInputResponse = await request.post('/api/game/provide-action-input', {
        data: {
          roomId,
          playerId,
          actionId: actionId,
          input: [selectedCardId]
        }
      })

      console.log(`🧪 Provide input response status: ${provideInputResponse.status()}`)
      const inputResponseBody = await provideInputResponse.json()
      console.log(`🧪 Provide input response body:`, JSON.stringify(inputResponseBody, null, 2))

      expect(provideInputResponse.status()).toBe(200)
      expect(inputResponseBody.success).toBe(true)

      // Verify the final state
      const finalRoomResponse = await request.get(`/api/room/${roomId}`)
      const finalRoomData = await finalRoomResponse.json()
      const finalPlayer1 = finalRoomData.players[playerId]
      const finalPlayer2 = finalRoomData.players[player2Id]
      const finalPlayer1Hand = finalPlayer1.hand.length
      const finalPlayer2Hand = finalPlayer2.hand.length

      console.log(`🧪 Final Player 1 hand size: ${finalPlayer1Hand}`)
      console.log(`🧪 Final Player 2 hand size: ${finalPlayer2Hand}`)
      console.log(`🧪 Final Player 1 cards:`, finalPlayer1.hand.map(c => c.id))
      console.log(`🧪 Final Player 2 cards:`, finalPlayer2.hand.map(c => c.id))

      // Player 1 should gain 1 card, player 2 should lose 1 card
      expect(finalPlayer1Hand).toBe(initialPlayer1Hand + 1)
      expect(finalPlayer2Hand).toBe(initialPlayer2Hand - 1)

      // Verify the specific card was moved
      expect(finalPlayer1.hand.some(card => card.id === selectedCardId)).toBe(true)
      expect(finalPlayer2.hand.some(card => card.id === selectedCardId)).toBe(false)
    })
  })

  // === DESTINATION TESTS (support-deck → all destinations) ===
  test.describe('Destination Locations (from support-deck)', () => {

    test('should move from support-deck to own-hand', async ({ request }) => {
      // This is the same as our basic test, but in the destination test group
      const createCardResponse = await request.post('/api/cards/test-card', {
        data: {
          action: 'drawCard',
          parameters: [
            { name: 'target', type: 'LOCATION', value: 'support-deck' },
            { name: 'destination', type: 'LOCATION', value: 'own-hand' },
            { name: 'amount', type: 'AMOUNT', value: '1' }
          ],
          cardName: 'Support to Hand',
          cardDescription: 'Move from support deck to own hand'
        }
      })

      expect(createCardResponse.status()).toBe(200)
      const createCardBody = await createCardResponse.json()
      testCardId = createCardBody.data.id

      const initialRoomResponse = await request.get(`/api/room/${roomId}`)
      const initialRoomData = await initialRoomResponse.json()
      const initialPlayer = initialRoomData.players[playerId]
      const initialHandSize = initialPlayer.hand.length
      const initialSupportStackSize = initialRoomData.gameState.supportStack.length

      const playCardResponse = await request.post('/api/game/play-card', {
        data: {
          roomId,
          playerId,
          cardId: testCardId
        }
      })

      expect(playCardResponse.status()).toBe(200)
      expect((await playCardResponse.json()).success).toBe(true)

      const finalRoomResponse = await request.get(`/api/room/${roomId}`)
      const finalRoomData = await finalRoomResponse.json()
      const finalPlayer = finalRoomData.players[playerId]
      const finalSupportStackSize = finalRoomData.gameState.supportStack.length

      expect(finalPlayer.hand.length).toBe(initialHandSize + 1)
      expect(finalSupportStackSize).toBe(initialSupportStackSize - 1)
    })

    test('should move from support-deck to support-deck (circular - should work)', async ({ request }) => {
      const createCardResponse = await request.post('/api/cards/test-card', {
        data: {
          action: 'drawCard',
          parameters: [
            { name: 'target', type: 'LOCATION', value: 'support-deck' },
            { name: 'destination', type: 'LOCATION', value: 'support-deck' },
            { name: 'amount', type: 'AMOUNT', value: '1' }
          ],
          cardName: 'Circular Support Move',
          cardDescription: 'Move from support deck to support deck'
        }
      })

      expect(createCardResponse.status()).toBe(200)
      const createCardBody = await createCardResponse.json()
      testCardId = createCardBody.data.id

      const initialRoomResponse = await request.get(`/api/room/${roomId}`)
      const initialRoomData = await initialRoomResponse.json()
      const initialSupportStackSize = initialRoomData.gameState.supportStack.length

      const playCardResponse = await request.post('/api/game/play-card', {
        data: {
          roomId,
          playerId,
          cardId: testCardId
        }
      })

      expect(playCardResponse.status()).toBe(200)
      expect((await playCardResponse.json()).success).toBe(true)

      const finalRoomResponse = await request.get(`/api/room/${roomId}`)
      const finalRoomData = await finalRoomResponse.json()
      const finalSupportStackSize = finalRoomData.gameState.supportStack.length

      // Support stack size should remain the same (circular operation)
      expect(finalSupportStackSize).toBe(initialSupportStackSize)
    })

    test('should fail to move from support-deck to cache (unsupported destination)', async ({ request }) => {
      const createCardResponse = await request.post('/api/cards/test-card', {
        data: {
          action: 'drawCard',
          parameters: [
            { name: 'target', type: 'LOCATION', value: 'support-deck' },
            { name: 'destination', type: 'LOCATION', value: 'cache' },
            { name: 'amount', type: 'AMOUNT', value: '1' }
          ],
          cardName: 'Support to Cache',
          cardDescription: 'Try to move from support deck to cache (unsupported)'
        }
      })

      expect(createCardResponse.status()).toBe(200)
      const createCardBody = await createCardResponse.json()
      testCardId = createCardBody.data.id

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
      expect(playCardBody.message).toContain('Unsupported destination location')
    })

    test('should fail to move from support-deck to discard-pile (unsupported destination)', async ({ request }) => {
      const createCardResponse = await request.post('/api/cards/test-card', {
        data: {
          action: 'drawCard',
          parameters: [
            { name: 'target', type: 'LOCATION', value: 'support-deck' },
            { name: 'destination', type: 'LOCATION', value: 'discard-pile' },
            { name: 'amount', type: 'AMOUNT', value: '1' }
          ],
          cardName: 'Support to Discard',
          cardDescription: 'Try to move from support deck to discard pile (unsupported)'
        }
      })

      expect(createCardResponse.status()).toBe(200)
      const createCardBody = await createCardResponse.json()
      testCardId = createCardBody.data.id

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
      expect(playCardBody.message).toContain('Unsupported destination location')
    })
  })

  // === AMOUNT TESTS (support-deck → own-hand with different amounts) ===
  test.describe('Amount Variations (support-deck → own-hand)', () => {

    test('should draw 0 cards (no-op)', async ({ request }) => {
      const createCardResponse = await request.post('/api/cards/test-card', {
        data: {
          action: 'drawCard',
          parameters: [
            { name: 'target', type: 'LOCATION', value: 'support-deck' },
            { name: 'destination', type: 'LOCATION', value: 'own-hand' },
            { name: 'amount', type: 'AMOUNT', value: '0' }
          ],
          cardName: 'Draw 0 Cards',
          cardDescription: 'Draw zero cards (no-op)'
        }
      })

      expect(createCardResponse.status()).toBe(200)
      const createCardBody = await createCardResponse.json()
      testCardId = createCardBody.data.id

      const initialRoomResponse = await request.get(`/api/room/${roomId}`)
      const initialRoomData = await initialRoomResponse.json()
      const initialPlayer = initialRoomData.players[playerId]
      const initialHandSize = initialPlayer.hand.length
      const initialSupportStackSize = initialRoomData.gameState.supportStack.length

      const playCardResponse = await request.post('/api/game/play-card', {
        data: {
          roomId,
          playerId,
          cardId: testCardId
        }
      })

      expect(playCardResponse.status()).toBe(200)
      expect((await playCardResponse.json()).success).toBe(true)

      const finalRoomResponse = await request.get(`/api/room/${roomId}`)
      const finalRoomData = await finalRoomResponse.json()
      const finalPlayer = finalRoomData.players[playerId]
      const finalSupportStackSize = finalRoomData.gameState.supportStack.length

      // No change should occur
      expect(finalPlayer.hand.length).toBe(initialHandSize)
      expect(finalSupportStackSize).toBe(initialSupportStackSize)
    })

    test('should draw 2 cards', async ({ request }) => {
      const createCardResponse = await request.post('/api/cards/test-card', {
        data: {
          action: 'drawCard',
          parameters: [
            { name: 'target', type: 'LOCATION', value: 'support-deck' },
            { name: 'destination', type: 'LOCATION', value: 'own-hand' },
            { name: 'amount', type: 'AMOUNT', value: '2' }
          ],
          cardName: 'Draw 2 Cards',
          cardDescription: 'Draw exactly 2 cards'
        }
      })

      expect(createCardResponse.status()).toBe(200)
      const createCardBody = await createCardResponse.json()
      testCardId = createCardBody.data.id

      const initialRoomResponse = await request.get(`/api/room/${roomId}`)
      const initialRoomData = await initialRoomResponse.json()
      const initialPlayer = initialRoomData.players[playerId]
      const initialHandSize = initialPlayer.hand.length
      const initialSupportStackSize = initialRoomData.gameState.supportStack.length

      const playCardResponse = await request.post('/api/game/play-card', {
        data: {
          roomId,
          playerId,
          cardId: testCardId
        }
      })

      expect(playCardResponse.status()).toBe(200)
      expect((await playCardResponse.json()).success).toBe(true)

      const finalRoomResponse = await request.get(`/api/room/${roomId}`)
      const finalRoomData = await finalRoomResponse.json()
      const finalPlayer = finalRoomData.players[playerId]
      const finalSupportStackSize = finalRoomData.gameState.supportStack.length

      expect(finalPlayer.hand.length).toBe(initialHandSize + 2)
      expect(finalSupportStackSize).toBe(initialSupportStackSize - 2)
    })

    test('should draw 5 cards (maximum numeric amount)', async ({ request }) => {
      const createCardResponse = await request.post('/api/cards/test-card', {
        data: {
          action: 'drawCard',
          parameters: [
            { name: 'target', type: 'LOCATION', value: 'support-deck' },
            { name: 'destination', type: 'LOCATION', value: 'own-hand' },
            { name: 'amount', type: 'AMOUNT', value: '5' }
          ],
          cardName: 'Draw 5 Cards',
          cardDescription: 'Draw maximum 5 cards'
        }
      })

      expect(createCardResponse.status()).toBe(200)
      const createCardBody = await createCardResponse.json()
      testCardId = createCardBody.data.id

      const initialRoomResponse = await request.get(`/api/room/${roomId}`)
      const initialRoomData = await initialRoomResponse.json()
      const initialPlayer = initialRoomData.players[playerId]
      const initialHandSize = initialPlayer.hand.length
      const initialSupportStackSize = initialRoomData.gameState.supportStack.length

      // Only proceed if we have at least 5 cards available
      if (initialSupportStackSize < 5) {
        console.log(`Skipping test - only ${initialSupportStackSize} cards available, need 5`)
        return
      }

      const playCardResponse = await request.post('/api/game/play-card', {
        data: {
          roomId,
          playerId,
          cardId: testCardId
        }
      })

      expect(playCardResponse.status()).toBe(200)
      expect((await playCardResponse.json()).success).toBe(true)

      const finalRoomResponse = await request.get(`/api/room/${roomId}`)
      const finalRoomData = await finalRoomResponse.json()
      const finalPlayer = finalRoomData.players[playerId]
      const finalSupportStackSize = finalRoomData.gameState.supportStack.length

      expect(finalPlayer.hand.length).toBe(initialHandSize + 5)
      expect(finalSupportStackSize).toBe(initialSupportStackSize - 5)
    })

    test('should draw all available cards with amount "all"', async ({ request }) => {
      const createCardResponse = await request.post('/api/cards/test-card', {
        data: {
          action: 'drawCard',
          parameters: [
            { name: 'target', type: 'LOCATION', value: 'support-deck' },
            { name: 'destination', type: 'LOCATION', value: 'own-hand' },
            { name: 'amount', type: 'AMOUNT', value: 'all' }
          ],
          cardName: 'Draw All Cards',
          cardDescription: 'Draw all available cards from support deck'
        }
      })

      expect(createCardResponse.status()).toBe(200)
      const createCardBody = await createCardResponse.json()
      testCardId = createCardBody.data.id

      const initialRoomResponse = await request.get(`/api/room/${roomId}`)
      const initialRoomData = await initialRoomResponse.json()
      const initialPlayer = initialRoomData.players[playerId]
      const initialHandSize = initialPlayer.hand.length
      const initialSupportStackSize = initialRoomData.gameState.supportStack.length

      const playCardResponse = await request.post('/api/game/play-card', {
        data: {
          roomId,
          playerId,
          cardId: testCardId
        }
      })

      expect(playCardResponse.status()).toBe(200)
      expect((await playCardResponse.json()).success).toBe(true)

      const finalRoomResponse = await request.get(`/api/room/${roomId}`)
      const finalRoomData = await finalRoomResponse.json()
      const finalPlayer = finalRoomData.players[playerId]
      const finalSupportStackSize = finalRoomData.gameState.supportStack.length

      // All cards should be moved
      expect(finalPlayer.hand.length).toBe(initialHandSize + initialSupportStackSize)
      expect(finalSupportStackSize).toBe(0)
    })

    test('should fail when trying to draw more than available', async ({ request }) => {
      // First check how many cards are available
      const roomResponse = await request.get(`/api/room/${roomId}`)
      const roomData = await roomResponse.json()
      const availableCards = roomData.gameState.supportStack.length

      // Try to draw more than available
      const excessAmount = availableCards + 10

      const createCardResponse = await request.post('/api/cards/test-card', {
        data: {
          action: 'drawCard',
          parameters: [
            { name: 'target', type: 'LOCATION', value: 'support-deck' },
            { name: 'destination', type: 'LOCATION', value: 'own-hand' },
            { name: 'amount', type: 'AMOUNT', value: String(excessAmount) }
          ],
          cardName: 'Draw Too Many',
          cardDescription: `Try to draw ${excessAmount} cards when only ${availableCards} available`
        }
      })

      expect(createCardResponse.status()).toBe(200)
      const createCardBody = await createCardResponse.json()
      testCardId = createCardBody.data.id

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
  })
})