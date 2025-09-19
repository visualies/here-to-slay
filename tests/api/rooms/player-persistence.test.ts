import { test, expect } from '@playwright/test'

test.describe('API: Player Persistence and Rejoin Scenarios', () => {
  let roomId: string
  let playerId: string

  test.beforeEach(async ({ request }) => {
    // Create room
    const createResponse = await request.post('/api/create-room', {
      data: { name: 'Player Persistence Test Room', maxPlayers: 4 }
    })
    const createBody = await createResponse.json()
    roomId = createBody.roomId

    // Generate consistent player ID for testing
    playerId = 'test-player-persistence'
  })

  test.describe('Player ID Cookie Persistence', () => {
    test('should persist player ID across multiple requests', async ({ request }) => {
      // First request to get/create player ID
      const firstResponse = await request.get('/api/users/@me')
      expect(firstResponse.status()).toBe(200)

      const firstBody = await firstResponse.json()
      const originalPlayerId = firstBody.data.playerId

      // Verify player ID format
      expect(originalPlayerId).toMatch(/^[A-Za-z0-9]{16}$/)

      // Second request should return same player ID (cookie persistence)
      const secondResponse = await request.get('/api/users/@me')
      expect(secondResponse.status()).toBe(200)

      const secondBody = await secondResponse.json()
      expect(secondBody.data.playerId).toBe(originalPlayerId)

      // Third request should still return same player ID
      const thirdResponse = await request.get('/api/users/@me')
      expect(thirdResponse.status()).toBe(200)

      const thirdBody = await thirdResponse.json()
      expect(thirdBody.data.playerId).toBe(originalPlayerId)
    })

    test('should generate different player IDs for different sessions', async ({ request, browser }) => {
      // Get player ID in first context
      const firstResponse = await request.get('/api/users/@me')
      const firstBody = await firstResponse.json()
      const firstPlayerId = firstBody.data.playerId

      // Create new browser context (fresh cookies)
      const newContext = await browser.newContext()
      const newRequest = newContext.request

      // Get player ID in new context
      const secondResponse = await newRequest.get('/api/users/@me')
      const secondBody = await secondResponse.json()
      const secondPlayerId = secondBody.data.playerId

      // Should be different player IDs
      expect(firstPlayerId).not.toBe(secondPlayerId)
      expect(firstPlayerId).toMatch(/^[A-Za-z0-9]{16}$/)
      expect(secondPlayerId).toMatch(/^[A-Za-z0-9]{16}$/)

      await newContext.close()
    })
  })

  test.describe('Hand and Party State Preservation on Rejoin', () => {
    test('should preserve empty state when player rejoins before game starts', async ({ request }) => {
      // Join room initially
      const joinResponse = await request.post('/api/join-room', {
        data: {
          roomId,
          playerId,
          playerName: 'Test Player',
          playerColor: 'red'
        }
      })
      expect(joinResponse.status()).toBe(200)

      // Verify initial empty state
      let roomResponse = await request.get(`/api/room/${roomId}`)
      let roomData = await roomResponse.json()
      let player = roomData.players[playerId]

      expect(player.hand).toEqual([])
      expect(player.party).toEqual({ leader: null, heroes: [] })
      expect(player.actionPoints).toBe(0)

      // Rejoin room (simulating page reload)
      const rejoinResponse = await request.post('/api/join-room', {
        data: {
          roomId,
          playerId,
          playerName: 'Test Player',
          playerColor: 'red'
        }
      })
      expect(rejoinResponse.status()).toBe(200)

      // Verify state is still empty and not reset
      roomResponse = await request.get(`/api/room/${roomId}`)
      roomData = await roomResponse.json()
      player = roomData.players[playerId]

      expect(player.hand).toEqual([])
      expect(player.party).toEqual({ leader: null, heroes: [] })
      expect(player.actionPoints).toBe(0)
      expect(player.id).toBe(playerId) // Same player ID
    })

    test('should preserve hand cards and party when player rejoins after game starts', async ({ request }) => {
      // Join room
      await request.post('/api/join-room', {
        data: {
          roomId,
          playerId,
          playerName: 'Test Player',
          playerColor: 'red'
        }
      })

      // Start game to get hand cards and party leader
      const startResponse = await request.post('/api/game/start', {
        data: { roomId }
      })
      expect(startResponse.status()).toBe(200)

      // Verify player has cards and party after game start
      let roomResponse = await request.get(`/api/room/${roomId}`)
      let roomData = await roomResponse.json()
      let player = roomData.players[playerId]

      const originalHandSize = player.hand.length
      const originalHand = [...player.hand]
      const originalPartyLeader = player.party.leader
      const originalActionPoints = player.actionPoints

      // Should have 5 hand cards
      expect(originalHandSize).toBe(5)
      expect(originalPartyLeader).not.toBeNull()
      expect(originalPartyLeader.type).toBe('PartyLeader')
      expect(originalActionPoints).toBeGreaterThanOrEqual(0)

      // Rejoin room (simulating page reload mid-game)
      const rejoinResponse = await request.post('/api/join-room', {
        data: {
          roomId,
          playerId,
          playerName: 'Test Player',
          playerColor: 'red'
        }
      })
      expect(rejoinResponse.status()).toBe(200)

      // Verify ALL state is preserved after rejoin
      roomResponse = await request.get(`/api/room/${roomId}`)
      roomData = await roomResponse.json()
      player = roomData.players[playerId]

      // Hand cards should be exactly the same
      expect(player.hand).toHaveLength(originalHandSize)
      expect(player.hand).toEqual(originalHand)

      // Party leader should be exactly the same
      expect(player.party.leader).toEqual(originalPartyLeader)
      expect(player.party.leader.id).toBe(originalPartyLeader.id)
      expect(player.party.leader.name).toBe(originalPartyLeader.name)

      // Action points should be preserved
      expect(player.actionPoints).toBe(originalActionPoints)

      // Player identity should be preserved
      expect(player.id).toBe(playerId)
      expect(player.name).toBe('Test Player')
      expect(player.color).toBe('red')
    })

    test('should preserve multiple players state when one player rejoins', async ({ request }) => {
      const player1Id = 'player1'
      const player2Id = 'player2'

      // Both players join
      await request.post('/api/join-room', {
        data: {
          roomId,
          playerId: player1Id,
          playerName: 'Player 1',
          playerColor: 'red'
        }
      })

      await request.post('/api/join-room', {
        data: {
          roomId,
          playerId: player2Id,
          playerName: 'Player 2',
          playerColor: 'blue'
        }
      })

      // Start game
      await request.post('/api/game/start', {
        data: { roomId }
      })

      // Get initial state for both players
      let roomResponse = await request.get(`/api/room/${roomId}`)
      let roomData = await roomResponse.json()

      const player1InitialHand = [...roomData.players[player1Id].hand]
      const player2InitialHand = [...roomData.players[player2Id].hand]
      const player1InitialParty = roomData.players[player1Id].party
      const player2InitialParty = roomData.players[player2Id].party

      // Player 1 rejoins (simulating only player 1 reloading page)
      await request.post('/api/join-room', {
        data: {
          roomId,
          playerId: player1Id,
          playerName: 'Player 1',
          playerColor: 'red'
        }
      })

      // Verify both players' state is preserved
      roomResponse = await request.get(`/api/room/${roomId}`)
      roomData = await roomResponse.json()

      // Player 1 state should be preserved
      expect(roomData.players[player1Id].hand).toEqual(player1InitialHand)
      expect(roomData.players[player1Id].party).toEqual(player1InitialParty)

      // Player 2 state should be completely untouched
      expect(roomData.players[player2Id].hand).toEqual(player2InitialHand)
      expect(roomData.players[player2Id].party).toEqual(player2InitialParty)

      // Verify we still have exactly 2 players
      expect(Object.keys(roomData.players)).toHaveLength(2)
    })

    test('should update presence info while preserving game state on rejoin', async ({ request }) => {
      // Join room and start game
      await request.post('/api/join-room', {
        data: {
          roomId,
          playerId,
          playerName: 'Original Name',
          playerColor: 'red'
        }
      })

      await request.post('/api/game/start', {
        data: { roomId }
      })

      // Get initial state
      let roomResponse = await request.get(`/api/room/${roomId}`)
      let roomData = await roomResponse.json()
      let player = roomData.players[playerId]

      const originalHand = [...player.hand]
      const originalParty = player.party
      const originalJoinTime = player.joinTime
      const originalLastSeen = player.lastSeen

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      // Rejoin with updated name and color
      await request.post('/api/join-room', {
        data: {
          roomId,
          playerId,
          playerName: 'Updated Name',
          playerColor: 'blue'
        }
      })

      // Verify presence updated but game state preserved
      roomResponse = await request.get(`/api/room/${roomId}`)
      roomData = await roomResponse.json()
      player = roomData.players[playerId]

      // Game state should be preserved
      expect(player.hand).toEqual(originalHand)
      expect(player.party).toEqual(originalParty)

      // Presence should be updated
      expect(player.name).toBe('Updated Name')
      expect(player.color).toBe('blue')
      expect(player.lastSeen).toBeGreaterThanOrEqual(originalLastSeen)

      // Join time should be preserved (not reset)
      expect(player.joinTime).toBe(originalJoinTime)
    })
  })

  test.describe('Edge Cases and Error Scenarios', () => {
    test('should handle rapid successive rejoins', async ({ request }) => {
      // Join initially
      await request.post('/api/join-room', {
        data: {
          roomId,
          playerId,
          playerName: 'Test Player',
          playerColor: 'red'
        }
      })

      await request.post('/api/game/start', {
        data: { roomId }
      })

      // Get initial state
      let roomResponse = await request.get(`/api/room/${roomId}`)
      let roomData = await roomResponse.json()
      const originalHand = [...roomData.players[playerId].hand]

      // Rapid successive rejoins
      const promises = []
      for (let i = 0; i < 5; i++) {
        promises.push(
          request.post('/api/join-room', {
            data: {
              roomId,
              playerId,
              playerName: `Test Player ${i}`,
              playerColor: 'red'
            }
          })
        )
      }

      const responses = await Promise.all(promises)
      responses.forEach(response => {
        expect(response.status()).toBe(200)
      })

      // Verify state is still consistent and not corrupted
      roomResponse = await request.get(`/api/room/${roomId}`)
      roomData = await roomResponse.json()

      expect(roomData.players[playerId].hand).toEqual(originalHand)
      expect(Object.keys(roomData.players)).toHaveLength(1)
    })

    test('should handle rejoin with same player ID but as different player name', async ({ request }) => {
      // Player joins
      await request.post('/api/join-room', {
        data: {
          roomId,
          playerId,
          playerName: 'Alice',
          playerColor: 'red'
        }
      })

      await request.post('/api/game/start', {
        data: { roomId }
      })

      let roomResponse = await request.get(`/api/room/${roomId}`)
      let roomData = await roomResponse.json()
      const originalHand = [...roomData.players[playerId].hand]

      // Same player ID but different person tries to join
      await request.post('/api/join-room', {
        data: {
          roomId,
          playerId, // Same ID
          playerName: 'Bob', // Different name
          playerColor: 'blue'
        }
      })

      // Should preserve game state but update identity
      roomResponse = await request.get(`/api/room/${roomId}`)
      roomData = await roomResponse.json()

      expect(roomData.players[playerId].hand).toEqual(originalHand)
      expect(roomData.players[playerId].name).toBe('Bob')
      expect(roomData.players[playerId].color).toBe('blue')
    })
  })

  test.describe('Game State Verification', () => {
    test('should verify Yjs document consistency after player rejoin', async ({ request }) => {
      // Join and start game
      await request.post('/api/join-room', {
        data: {
          roomId,
          playerId,
          playerName: 'Test Player',
          playerColor: 'red'
        }
      })

      await request.post('/api/game/start', {
        data: { roomId }
      })

      // Verify room has proper game state
      let roomResponse = await request.get(`/api/room/${roomId}`)
      let roomData = await roomResponse.json()

      expect(roomData.gameState.phase).toBe('playing')
      expect(roomData.gameState.monsters).toHaveLength(3)
      // currentTurn is now a Turn object, not just a string
      expect(roomData.gameState.currentTurn.player_id).toBe(playerId)

      // Rejoin
      await request.post('/api/join-room', {
        data: {
          roomId,
          playerId,
          playerName: 'Test Player',
          playerColor: 'red'
        }
      })

      // Verify game state is completely unchanged
      roomResponse = await request.get(`/api/room/${roomId}`)
      roomData = await roomResponse.json()

      expect(roomData.gameState.phase).toBe('playing')
      expect(roomData.gameState.monsters).toHaveLength(3)
      expect(roomData.gameState.currentTurn.player_id).toBe(playerId)

      // Verify room metadata preserved
      expect(roomData.id).toBe(roomId)
      expect(roomData.name).toBe('Player Persistence Test Room')
      expect(roomData.maxPlayers).toBe(4)
    })
  })
})