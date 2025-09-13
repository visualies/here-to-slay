import { test, expect } from '@playwright/test'

test.describe('API: Hand Card Drawing', () => {

  test.describe('POST /api/game/draw-card', () => {
    let roomId: string
    let playerId: string

    test.beforeEach(async ({ request }) => {
      // Create a room
      const createResponse = await request.post('/api/create-room', {
        data: { name: 'Hand Card Drawing Test Room', maxPlayers: 4 }
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

    test('should draw a card and verify it appears in room state', async ({ request }, testInfo) => {
      // 1. Get initial room state to verify player starts with 5 cards
      const initialRoomResponse = await request.get(`/api/room/${roomId}`)
      expect(initialRoomResponse.status()).toBe(200)

      const initialRoomData = await initialRoomResponse.json()
      const initialPlayer = initialRoomData.players[playerId]

      expect(initialPlayer.hand).toHaveLength(5)
      const initialHandCards = [...initialPlayer.hand]
      const initialActionPoints = initialPlayer.actionPoints

      // 2. Draw a card
      const drawResponse = await request.post('/api/game/draw-card', {
        data: {
          roomId,
          playerId
        }
      })

      expect(drawResponse.status()).toBe(200)
      const drawBody = await drawResponse.json()

      expect(drawBody).toMatchObject({
        success: true,
        message: expect.stringContaining('Drew card:')
      })

      // 3. Wait a moment for Yjs sync, then verify the card appears in room state
      await new Promise(resolve => setTimeout(resolve, 100))

      const updatedRoomResponse = await request.get(`/api/room/${roomId}`)
      expect(updatedRoomResponse.status()).toBe(200)

      const updatedRoomData = await updatedRoomResponse.json()
      const updatedPlayer = updatedRoomData.players[playerId]

      // ✅ Requirement: Player should now have 6 cards (5 initial + 1 drawn from support stack)
      expect(updatedPlayer.hand).toHaveLength(6)

      // Find the new card (the one not in initial hand)
      const newCards = updatedPlayer.hand.filter(card =>
        !initialHandCards.some(initialCard =>
          initialCard.id === card.id
        )
      )

      expect(newCards).toHaveLength(1)
      const drawnCard = newCards[0]

      // Verify the drawn card has proper structure
      expect(drawnCard).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        type: expect.any(String)
      })

      // Verify the drawn card matches what the API response said was drawn
      const apiResponseCard = drawBody.data.card
      expect(drawnCard.id).toBe(apiResponseCard.id)
      expect(drawnCard.name).toBe(apiResponseCard.name)

      // Action points should have decreased
      expect(updatedPlayer.actionPoints).toBeLessThan(initialActionPoints || 3)

      // Snapshot of the card drawing result
      const drawSnapshot = {
        roomId: updatedRoomData.id,
        playerId,
        playerName: updatedPlayer.name,
        initialHandSize: initialPlayer.hand.length,
        finalHandSize: updatedPlayer.hand.length,
        initialActionPoints: initialActionPoints,
        finalActionPoints: updatedPlayer.actionPoints,
        drawnCard: {
          id: drawnCard.id,
          name: drawnCard.name,
          type: drawnCard.type
        },
        drawResponse: drawBody,
        allHandCards: updatedPlayer.hand.map(card => ({
          id: card.id,
          name: card.name,
          type: card.type
        }))
      }

      // Attach draw state snapshot to test report
      await testInfo.attach('card-draw-state.json', {
        body: JSON.stringify(drawSnapshot, null, 2),
        contentType: 'application/json'
      })
    })

    test('should not allow drawing card when not player turn', async ({ request }) => {
      // Add a second player
      const playerId2 = 'test-player-2'
      const joinResponse2 = await request.post('/api/join-room', {
        data: {
          roomId,
          playerId: playerId2,
          playerName: 'Test Player 2',
          playerColor: 'blue'
        }
      })
      expect(joinResponse2.status()).toBe(200)

      // Get current turn player
      const roomResponse = await request.get(`/api/room/${roomId}`)
      const roomData = await roomResponse.json()
      const currentTurnPlayer = roomData.gameState.currentTurn

      // Try to draw with the player who is NOT on turn
      const notCurrentPlayer = currentTurnPlayer === playerId ? playerId2 : playerId

      const drawResponse = await request.post('/api/game/draw-card', {
        data: {
          roomId,
          playerId: notCurrentPlayer
        }
      })

      expect(drawResponse.status()).toBe(400)
      const drawBody = await drawResponse.json()

      expect(drawBody).toMatchObject({
        success: false,
        message: expect.stringContaining('Not your turn')
      })
    })

    test('should not allow drawing card for non-existent player', async ({ request }) => {
      const drawResponse = await request.post('/api/game/draw-card', {
        data: {
          roomId,
          playerId: 'fake-player-id'
        }
      })

      expect(drawResponse.status()).toBe(400)
      const drawBody = await drawResponse.json()

      expect(drawBody).toMatchObject({
        success: false,
        message: expect.stringContaining('Player not found')
      })
    })

    test('should not allow drawing card for non-existent room', async ({ request }) => {
      const drawResponse = await request.post('/api/game/draw-card', {
        data: {
          roomId: 'FAKE01',
          playerId
        }
      })

      expect(drawResponse.status()).toBe(400)
      const drawBody = await drawResponse.json()

      expect(drawBody).toMatchObject({
        success: false,
        message: expect.stringContaining('Player not found')
      })
    })

    test('should require both roomId and playerId parameters', async ({ request }) => {
      // Test missing roomId
      const missingRoomResponse = await request.post('/api/game/draw-card', {
        data: { playerId }
      })

      expect(missingRoomResponse.status()).toBe(400)
      const missingRoomBody = await missingRoomResponse.json()
      expect(missingRoomBody).toMatchObject({
        success: false,
        message: expect.stringContaining('Player not found')
      })

      // Test missing playerId
      const missingPlayerResponse = await request.post('/api/game/draw-card', {
        data: { roomId }
      })

      expect(missingPlayerResponse.status()).toBe(400)
      const missingPlayerBody = await missingPlayerResponse.json()
      expect(missingPlayerBody).toMatchObject({
        success: false,
        message: expect.stringContaining('Player not found')
      })
    })
  })
})