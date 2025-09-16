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

    test('should start game and verify initial state for one player', async ({ request }, testInfo) => {
      // Player should already be in Yjs document from join-room call in beforeEach

      // 1. Start the game
      const startResponse = await request.post('/api/game/start', {
        data: { roomId }
      })

      const startBody = await startResponse.json()

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

      // 2. Verify initial game state was set up correctly via room endpoint
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
      expect(roomData.gameState.currentTurn.player_id).toBe(playerId)
      expect(roomData.gameState.currentTurn.action_points).toBe(3)
      expect(roomData.id).toBe(roomId)
      expect(roomData.name).toBeDefined()
      expect(roomData.maxPlayers).toBeDefined()
      expect(player.actionPoints).toBe(3) // First player starts with 3 action points
      expect(roomData.gameState.supportStack).toBeDefined()
      expect(roomData.gameState.supportStack.length).toBeGreaterThan(0)

      // Snapshot of final game state for inspection
      const gameSnapshot = {
        roomId: roomData.id,
        phase: roomData.gameState.phase,
        currentTurn: roomData.gameState.currentTurn,
        monsters: roomData.gameState.monsters.map((m: any) => m.name),
        players: Object.keys(roomData.players).map(id => ({
          id,
          name: roomData.players[id].name,
          handSize: roomData.players[id].hand.length,
          partyLeader: roomData.players[id].party.leader.name,
          heroCount: roomData.players[id].party.heroes.length,
          actionPoints: roomData.players[id].actionPoints
        })),
        supportStackSize: roomData.gameState.supportStack.length
      }

      // Attach game state snapshot to test report
      await testInfo.attach('1-player-game-state.json', {
        body: JSON.stringify(gameSnapshot, null, 2),
        contentType: 'application/json'
      })
    })

    test('should start game and verify initial state for two players', async ({ request }, testInfo) => {
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

      // Start the game
      const startResponse = await request.post('/api/game/start', {
        data: { roomId }
      })

      expect(startResponse.status()).toBe(200)
      const startBody = await startResponse.json()

      expect(startBody).toMatchObject({
        success: true,
        message: 'Game started with 2 players',
        phase: 'playing',
        players: expect.arrayContaining([
          { id: playerId, name: 'Test Player' },
          { id: playerId2, name: 'Test Player 2' }
        ])
      })

      // Verify game state via room endpoint
      const roomStateResponse = await request.get(`/api/room/${roomId}`)
      expect(roomStateResponse.status()).toBe(200)
      const roomData = await roomStateResponse.json()

      // Verify both players have correct initial state
      const player1 = roomData.players[playerId]
      const player2 = roomData.players[playerId2]

      // Player 1 verification
      expect(player1.hand).toHaveLength(5)
      expect(player1.party.leader.type).toBe('PartyLeader')
      expect(Array.isArray(player1.party.heroes)).toBe(true)

      // Player 2 verification
      expect(player2.hand).toHaveLength(5)
      expect(player2.party.leader.type).toBe('PartyLeader')
      expect(Array.isArray(player2.party.heroes)).toBe(true)

      // Game state verification
      expect(roomData.gameState.monsters).toHaveLength(3)
      expect(roomData.gameState.phase).toBe('playing')
      expect([playerId, playerId2]).toContain(roomData.gameState.currentTurn.player_id)

      // Snapshot of final game state for inspection
      const gameSnapshot = {
        roomId: roomData.id,
        phase: roomData.gameState.phase,
        currentTurn: roomData.gameState.currentTurn,
        monsters: roomData.gameState.monsters.map((m: any) => m.name),
        players: Object.keys(roomData.players).map(id => ({
          id,
          name: roomData.players[id].name,
          handSize: roomData.players[id].hand.length,
          partyLeader: roomData.players[id].party.leader.name,
          heroCount: roomData.players[id].party.heroes.length,
          actionPoints: roomData.players[id].actionPoints
        })),
        supportStackSize: roomData.gameState.supportStack.length
      }

      // Attach game state snapshot to test report
      await testInfo.attach('2-player-game-state.json', {
        body: JSON.stringify(gameSnapshot, null, 2),
        contentType: 'application/json'
      })
    })

    test('should start game and verify initial state for three players', async ({ request }, testInfo) => {
      // Add second and third players
      const playerId2 = 'test-player-2'
      const playerId3 = 'test-player-3'

      const joinResponse2 = await request.post('/api/join-room', {
        data: {
          roomId,
          playerId: playerId2,
          playerName: 'Test Player 2',
          playerColor: 'blue'
        }
      })
      expect(joinResponse2.status()).toBe(200)

      const joinResponse3 = await request.post('/api/join-room', {
        data: {
          roomId,
          playerId: playerId3,
          playerName: 'Test Player 3',
          playerColor: 'green'
        }
      })
      expect(joinResponse3.status()).toBe(200)

      // Start the game
      const startResponse = await request.post('/api/game/start', {
        data: { roomId }
      })

      expect(startResponse.status()).toBe(200)
      const startBody = await startResponse.json()

      expect(startBody).toMatchObject({
        success: true,
        message: 'Game started with 3 players',
        phase: 'playing',
        players: expect.arrayContaining([
          { id: playerId, name: 'Test Player' },
          { id: playerId2, name: 'Test Player 2' },
          { id: playerId3, name: 'Test Player 3' }
        ])
      })

      // Verify game state via room endpoint
      const roomStateResponse = await request.get(`/api/room/${roomId}`)
      expect(roomStateResponse.status()).toBe(200)
      const roomData = await roomStateResponse.json()

      // Verify all three players have correct initial state
      const player1 = roomData.players[playerId]
      const player2 = roomData.players[playerId2]
      const player3 = roomData.players[playerId3]

      // All players should have 5 cards and a party leader
      expect(player1.hand).toHaveLength(5)
      expect(player1.party.leader.type).toBe('PartyLeader')
      expect(Array.isArray(player1.party.heroes)).toBe(true)

      expect(player2.hand).toHaveLength(5)
      expect(player2.party.leader.type).toBe('PartyLeader')
      expect(Array.isArray(player2.party.heroes)).toBe(true)

      expect(player3.hand).toHaveLength(5)
      expect(player3.party.leader.type).toBe('PartyLeader')
      expect(Array.isArray(player3.party.heroes)).toBe(true)

      // Game state verification
      expect(roomData.gameState.monsters).toHaveLength(3)
      expect(roomData.gameState.phase).toBe('playing')
      expect([playerId, playerId2, playerId3]).toContain(roomData.gameState.currentTurn.player_id)

      // Snapshot of final game state for inspection
      const gameSnapshot = {
        roomId: roomData.id,
        phase: roomData.gameState.phase,
        currentTurn: roomData.gameState.currentTurn,
        monsters: roomData.gameState.monsters.map((m: any) => m.name),
        players: Object.keys(roomData.players).map(id => ({
          id,
          name: roomData.players[id].name,
          handSize: roomData.players[id].hand.length,
          partyLeader: roomData.players[id].party.leader.name,
          heroCount: roomData.players[id].party.heroes.length,
          actionPoints: roomData.players[id].actionPoints
        })),
        supportStackSize: roomData.gameState.supportStack.length
      }

      // Attach game state snapshot to test report
      await testInfo.attach('3-player-game-state.json', {
        body: JSON.stringify(gameSnapshot, null, 2),
        contentType: 'application/json'
      })
    })

    test('should start game and verify initial state for four players', async ({ request }, testInfo) => {
      // Add second, third, and fourth players
      const playerId2 = 'test-player-2'
      const playerId3 = 'test-player-3'
      const playerId4 = 'test-player-4'

      const joinResponse2 = await request.post('/api/join-room', {
        data: {
          roomId,
          playerId: playerId2,
          playerName: 'Test Player 2',
          playerColor: 'blue'
        }
      })
      expect(joinResponse2.status()).toBe(200)

      const joinResponse3 = await request.post('/api/join-room', {
        data: {
          roomId,
          playerId: playerId3,
          playerName: 'Test Player 3',
          playerColor: 'green'
        }
      })
      expect(joinResponse3.status()).toBe(200)

      const joinResponse4 = await request.post('/api/join-room', {
        data: {
          roomId,
          playerId: playerId4,
          playerName: 'Test Player 4',
          playerColor: 'yellow'
        }
      })
      expect(joinResponse4.status()).toBe(200)

      // Start the game
      const startResponse = await request.post('/api/game/start', {
        data: { roomId }
      })

      expect(startResponse.status()).toBe(200)
      const startBody = await startResponse.json()

      expect(startBody).toMatchObject({
        success: true,
        message: 'Game started with 4 players',
        phase: 'playing',
        players: expect.arrayContaining([
          { id: playerId, name: 'Test Player' },
          { id: playerId2, name: 'Test Player 2' },
          { id: playerId3, name: 'Test Player 3' },
          { id: playerId4, name: 'Test Player 4' }
        ])
      })

      // Verify game state via room endpoint
      const roomStateResponse = await request.get(`/api/room/${roomId}`)
      expect(roomStateResponse.status()).toBe(200)
      const roomData = await roomStateResponse.json()

      // Verify all four players have correct initial state
      const player1 = roomData.players[playerId]
      const player2 = roomData.players[playerId2]
      const player3 = roomData.players[playerId3]
      const player4 = roomData.players[playerId4]

      // All players should have 5 cards and a party leader
      expect(player1.hand).toHaveLength(5)
      expect(player1.party.leader.type).toBe('PartyLeader')
      expect(Array.isArray(player1.party.heroes)).toBe(true)

      expect(player2.hand).toHaveLength(5)
      expect(player2.party.leader.type).toBe('PartyLeader')
      expect(Array.isArray(player2.party.heroes)).toBe(true)

      expect(player3.hand).toHaveLength(5)
      expect(player3.party.leader.type).toBe('PartyLeader')
      expect(Array.isArray(player3.party.heroes)).toBe(true)

      expect(player4.hand).toHaveLength(5)
      expect(player4.party.leader.type).toBe('PartyLeader')
      expect(Array.isArray(player4.party.heroes)).toBe(true)

      // Game state verification
      expect(roomData.gameState.monsters).toHaveLength(3)
      expect(roomData.gameState.phase).toBe('playing')
      expect([playerId, playerId2, playerId3, playerId4]).toContain(roomData.gameState.currentTurn.player_id)

      // Snapshot of final game state for inspection
      const gameSnapshot = {
        roomId: roomData.id,
        phase: roomData.gameState.phase,
        currentTurn: roomData.gameState.currentTurn,
        monsters: roomData.gameState.monsters.map((m: any) => m.name),
        players: Object.keys(roomData.players).map(id => ({
          id,
          name: roomData.players[id].name,
          handSize: roomData.players[id].hand.length,
          partyLeader: roomData.players[id].party.leader.name,
          heroCount: roomData.players[id].party.heroes.length,
          actionPoints: roomData.players[id].actionPoints
        })),
        supportStackSize: roomData.gameState.supportStack.length
      }

      // Attach game state snapshot to test report
      await testInfo.attach('4-player-game-state.json', {
        body: JSON.stringify(gameSnapshot, null, 2),
        contentType: 'application/json'
      })
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