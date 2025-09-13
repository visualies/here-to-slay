import { test, expect } from '@playwright/test'

test.describe('API: Game Start', () => {

  test.describe('POST /api/game/start', () => {
    let roomId: string
    let playerId: string

    test.beforeEach(async ({ request }) => {
      // Create a room
      const createResponse = await request.post('/api/create-room', {
        data: { name: 'Game Start Test Room', maxPlayers: 4 }
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

      // In a real application, players would be added to the Yjs document via WebSocket
      // In tests, we need to manually add players to the Yjs document first
    })

    test('should start game and verify initial state for one player', async ({ request }) => {
      // Player should already be in Yjs document from join-room call in beforeEach

      // 1. Start the game
      const startResponse = await request.post('/api/game/start', {
        data: { roomId }
      })

      // Debug: Log the response to understand what's happening
      const startBody = await startResponse.json()
      console.log('Start response status:', startResponse.status())
      console.log('Start response body:', JSON.stringify(startBody, null, 2))

      expect(startResponse.status()).toBe(200)

      expect(startBody).toMatchObject({
        success: true,
        message: 'Game started with 1 players',
        phase: 'playing',
        currentTurn: playerId,
        players: [
          {
            id: playerId,
            name: 'Test Player'
          }
        ]
      })

      // 2. Get the game state from the debug endpoint
      const debugResponse = await request.get('/api/game/debug')
      expect(debugResponse.status()).toBe(200)

      const debugData = await debugResponse.json()
      expect(debugData.roomIds).toContain(roomId)

      const roomDoc = debugData.docs.find((doc: any) => doc.id === roomId)
      expect(roomDoc).toBeDefined()
      expect(roomDoc.stateSize).toBeGreaterThan(0)

      // 3. Verify initial game state was set up correctly via room endpoint
      const roomStateResponse = await request.get(`/api/room/${roomId}`)
      expect(roomStateResponse.status()).toBe(200)

      const roomData = await roomStateResponse.json()
      expect(roomData.id).toBe(roomId)

      // ✅ Requirement 1: Game has started (already verified above in startBody)

      // ✅ Requirement 2: Player got 5 hand cards
      const player = roomData.players[playerId]
      expect(player).toBeDefined()
      expect(player.hand).toBeDefined()
      expect(player.hand).toHaveLength(5)

      // ✅ Requirement 3: Player got 1 party leader
      expect(player.party).toBeDefined()
      expect(player.party.leader).toBeDefined()
      expect(player.party.leader.type).toBe('PartyLeader')
      expect(player.party.heroes).toBeDefined()
      expect(Array.isArray(player.party.heroes)).toBe(true)

      // ✅ Requirement 4: Room got 3 monsters assigned
      expect(roomData.gameState.monsters).toBeDefined()
      expect(roomData.gameState.monsters).toHaveLength(3)

      // Additional verifications - room metadata
      expect(roomData.gameState.phase).toBe('playing')
      expect(roomData.gameState.currentTurn).toBe(playerId)
      expect(roomData.id).toBe(roomId)
      expect(roomData.name).toBeDefined()
      expect(roomData.maxPlayers).toBeDefined()
      expect(player.actionPoints).toBe(3) // First player starts with 3 action points
      expect(roomData.gameState.supportStack).toBeDefined()
      expect(roomData.gameState.supportStack.length).toBeGreaterThan(0)
    })

    test('should not allow starting game twice', async ({ request }) => {
      // Start the game first time
      const firstStartResponse = await request.post('/api/game/start', {
        data: { roomId }
      })

      expect(firstStartResponse.status()).toBe(200)
      const firstStartBody = await firstStartResponse.json()
      expect(firstStartBody.success).toBe(true)

      // Try to start the game again
      const secondStartResponse = await request.post('/api/game/start', {
        data: { roomId }
      })

      expect(secondStartResponse.status()).toBe(200)
      const secondStartBody = await secondStartResponse.json()

      expect(secondStartBody).toMatchObject({
        success: false,
        message: 'Game is already started',
        phase: 'playing'
      })
    })

    test('should not allow starting game with no players', async ({ request }) => {
      // Create a room without adding any players
      const emptyRoomResponse = await request.post('/api/create-room', {
        data: { name: 'Empty Room', maxPlayers: 4 }
      })

      const emptyRoomBody = await emptyRoomResponse.json()
      const emptyRoomId = emptyRoomBody.roomId

      // Try to start the game with no players
      const startResponse = await request.post('/api/game/start', {
        data: { roomId: emptyRoomId }
      })

      expect(startResponse.status()).toBe(400)
      const startBody = await startResponse.json()

      expect(startBody).toMatchObject({
        error: 'No active players in room'
      })
    })

    test('should not allow starting game for non-existent room', async ({ request }) => {
      const startResponse = await request.post('/api/game/start', {
        data: { roomId: 'FAKE01' }
      })

      expect(startResponse.status()).toBe(404)
      const startBody = await startResponse.json()

      expect(startBody).toMatchObject({
        error: 'Room not found'
      })
    })

    test('should require roomId parameter', async ({ request }) => {
      const startResponse = await request.post('/api/game/start', {
        data: {}
      })

      expect(startResponse.status()).toBe(400)
      const startBody = await startResponse.json()

      expect(startBody).toMatchObject({
        error: 'Room ID required'
      })
    })
  })
})