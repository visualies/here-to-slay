import { test, expect } from '@playwright/test'

test.describe('API: Rooms', () => {

  test.describe('POST /api/create-room', () => {
    test('should create a room with default values and verify both database and Yjs state', async ({ request }) => {
      // 1. Create the room
      const response = await request.post('/api/create-room', {
        data: {}
      })

      expect(response.status()).toBe(200)
      const body = await response.json()

      expect(body).toMatchObject({
        roomId: expect.stringMatching(/^[A-Z0-9]{6}$/),
        name: 'Here to Slay Game'
      })

      const { roomId } = body

      // 2. Verify database state
      const roomInfo = await request.get(`/api/room/${roomId}`)
      expect(roomInfo.status()).toBe(200)

      const roomData = await roomInfo.json()
      expect(roomData).toMatchObject({
        id: roomId,
        name: 'Here to Slay Game',
        maxPlayers: 4
      })

      // 3. Trigger Yjs document creation (on-demand)
      const createDocResponse = await request.post('/api/game/create-test-doc', {
        data: { roomId }
      })
      expect(createDocResponse.status()).toBe(200)

      // 4. Verify Yjs document state
      const debugResponse = await request.get('/api/game/debug')
      expect(debugResponse.status()).toBe(200)

      const debugData = await debugResponse.json()
      expect(debugData.roomIds).toContain(roomId)

      const roomDoc = debugData.docs.find((doc: any) => doc.id === roomId)
      expect(roomDoc).toBeDefined()
      expect(roomDoc.stateSize).toBeGreaterThanOrEqual(0)
    })

    test('should create a room with custom name and max players', async ({ request }) => {
      const roomData = {
        name: 'Custom Game Room',
        maxPlayers: 6
      }

      const response = await request.post('/api/create-room', {
        data: roomData
      })

      expect(response.status()).toBe(200)
      const body = await response.json()

      expect(body).toMatchObject({
        roomId: expect.stringMatching(/^[A-Z0-9]{6}$/),
        name: 'Custom Game Room'
      })
    })

    test('should generate unique room IDs', async ({ request }) => {
      const promises = Array.from({ length: 5 }, () =>
        request.post('/api/create-room', { data: {} })
      )

      const responses = await Promise.all(promises)
      const bodies = await Promise.all(responses.map(res => res.json()))
      const roomIds = bodies.map(body => body.roomId)
      const uniqueIds = new Set(roomIds)

      expect(uniqueIds.size).toBe(5)
    })

  })

  test.describe('POST /api/join-room', () => {
    let roomId: string

    test.beforeEach(async ({ request }) => {
      // Create a room to join
      const createResponse = await request.post('/api/create-room', {
        data: { name: 'Test Room', maxPlayers: 4 }
      })

      const body = await createResponse.json()
      roomId = body.roomId
    })

    test('should allow a player to join an existing room and verify both database and Yjs state', async ({ request }) => {
      const playerData = {
        roomId,
        playerId: 'player1',
        playerName: 'Alice',
        playerColor: 'red'
      }

      // 1. Player joins room
      const response = await request.post('/api/join-room', {
        data: playerData
      })

      expect(response.status()).toBe(200)
      const body = await response.json()

      expect(body).toMatchObject({
        success: true,
        room: expect.objectContaining({
          id: roomId
        })
      })

      // 2. Verify database state
      const roomInfo = await request.get(`/api/room/${roomId}`)
      expect(roomInfo.status()).toBe(200)

      const roomData = await roomInfo.json()
      expect(roomData).toMatchObject({
        id: roomId,
        players: {
          'player1': expect.objectContaining({
            id: 'player1',
            name: 'Alice',
            color: 'red'
          })
        }
      })

      // 3. Trigger Yjs document creation and verify state
      const createDocResponse = await request.post('/api/game/create-test-doc', {
        data: { roomId }
      })
      expect(createDocResponse.status()).toBe(200)

      const debugResponse = await request.get('/api/game/debug')
      const debugData = await debugResponse.json()
      expect(debugData.roomIds).toContain(roomId)
    })

    test('should handle multiple players joining the same room', async ({ request }) => {
      const players = [
        { playerId: 'player1', playerName: 'Alice', playerColor: 'red' },
        { playerId: 'player2', playerName: 'Bob', playerColor: 'blue' },
        { playerId: 'player3', playerName: 'Charlie', playerColor: 'green' }
      ]

      for (const player of players) {
        const response = await request.post('/api/join-room', {
          data: { roomId, ...player }
        })

        expect(response.status()).toBe(200)
        const body = await response.json()
        expect(body.success).toBe(true)
      }

      // Check room info to verify all players joined
      const roomInfoResponse = await request.get(`/api/room/${roomId}`)
      expect(roomInfoResponse.status()).toBe(200)

      const roomInfo = await roomInfoResponse.json()
      expect(Object.keys(roomInfo.players)).toHaveLength(3)
      expect(roomInfo.players['player1']).toMatchObject({ id: 'player1', name: 'Alice' })
      expect(roomInfo.players['player2']).toMatchObject({ id: 'player2', name: 'Bob' })
      expect(roomInfo.players['player3']).toMatchObject({ id: 'player3', name: 'Charlie' })
    })

    test('should reject joining a full room', async ({ request }) => {
      // Fill the room to capacity (4 players)
      const players = ['player1', 'player2', 'player3', 'player4']

      for (const playerId of players) {
        await request.post('/api/join-room', {
          data: {
            roomId,
            playerId,
            playerName: `Player ${playerId}`,
            playerColor: 'red'
          }
        })
      }

      // Try to add a 5th player
      const response = await request.post('/api/join-room', {
        data: {
          roomId,
          playerId: 'player5',
          playerName: 'Extra Player',
          playerColor: 'purple'
        }
      })

      expect(response.status()).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('Room is full')
    })

    test('should reject joining a non-existent room', async ({ request }) => {
      const response = await request.post('/api/join-room', {
        data: {
          roomId: 'FAKE01',
          playerId: 'player1',
          playerName: 'Alice',
          playerColor: 'red'
        }
      })

      expect(response.status()).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('Room not found')
    })

    test('should allow the same player to rejoin (replace)', async ({ request }) => {
      const playerData = {
        roomId,
        playerId: 'player1',
        playerName: 'Alice',
        playerColor: 'red'
      }

      // Join first time
      await request.post('/api/join-room', { data: playerData })

      // Join again with different name/color
      const updatedPlayerData = {
        ...playerData,
        playerName: 'Alice Updated',
        playerColor: 'blue'
      }

      const response = await request.post('/api/join-room', {
        data: updatedPlayerData
      })

      expect(response.status()).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)

      // Verify room still has only 1 player
      const roomInfoResponse = await request.get(`/api/room/${roomId}`)
      const roomInfo = await roomInfoResponse.json()

      expect(Object.keys(roomInfo.players)).toHaveLength(1)
      expect(roomInfo.players['player1']).toMatchObject({
        id: 'player1',
        name: 'Alice Updated',
        color: 'blue'
      })
    })
  })

  test.describe('GET /api/room/{roomId}', () => {
    test('should return room information', async ({ request }) => {
      // Create a room
      const createResponse = await request.post('/api/create-room', {
        data: { name: 'Info Test Room', maxPlayers: 3 }
      })

      const createBody = await createResponse.json()
      const roomId = createBody.roomId

      // Add a player
      await request.post('/api/join-room', {
        data: {
          roomId,
          playerId: 'player1',
          playerName: 'Test Player',
          playerColor: 'green'
        }
      })

      // Get room info
      const response = await request.get(`/api/room/${roomId}`)
      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body).toMatchObject({
        id: roomId,
        name: 'Info Test Room',
        maxPlayers: 3,
        players: {
          'player1': expect.objectContaining({
            id: 'player1',
            name: 'Test Player',
            color: 'green'
          })
        }
      })
    })

    test('should return 404 for non-existent room', async ({ request }) => {
      const response = await request.get('/api/room/NOTFOUND')
      expect(response.status()).toBe(404)

      const body = await response.json()
      expect(body.error).toBe('Room not found')
    })
  })

  test.describe('GET /api/active-rooms', () => {
    test('should return the current list of active rooms', async ({ request }) => {
      const response = await request.get('/api/active-rooms')
      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(Array.isArray(body)).toBe(true)
      // We can't guarantee it's empty since other tests may have run
      // But we can verify the structure
      if (body.length > 0) {
        expect(body[0]).toMatchObject({
          id: expect.any(String),
          name: expect.any(String),
          maxPlayers: expect.any(Number),
          playerCount: expect.any(Number)
        })
      }
    })

    test('should return list including newly created rooms', async ({ request }) => {
      // Get current count
      const initialResponse = await request.get('/api/active-rooms')
      const initialRooms = await initialResponse.json()
      const initialCount = initialRooms.length

      // Create multiple rooms
      const room1Response = await request.post('/api/create-room', {
        data: { name: 'Unique Room 1', maxPlayers: 2 }
      })
      const room1 = await room1Response.json()

      const room2Response = await request.post('/api/create-room', {
        data: { name: 'Unique Room 2', maxPlayers: 4 }
      })
      const room2 = await room2Response.json()

      // Add players to rooms
      await request.post('/api/join-room', {
        data: {
          roomId: room1.roomId,
          playerId: 'player1',
          playerName: 'Alice',
          playerColor: 'red'
        }
      })

      const response = await request.get('/api/active-rooms')
      expect(response.status()).toBe(200)

      const body = await response.json()
      expect(body.length).toBeGreaterThanOrEqual(initialCount + 2)

      // Check that our newly created rooms are in the list
      const roomIds = body.map((room: any) => room.id)
      expect(roomIds).toContain(room1.roomId)
      expect(roomIds).toContain(room2.roomId)

      // Check specific room details
      const foundRoom1 = body.find((room: any) => room.id === room1.roomId)
      const foundRoom2 = body.find((room: any) => room.id === room2.roomId)

      expect(foundRoom1).toMatchObject({
        name: 'Unique Room 1',
        maxPlayers: 2,
        playerCount: 1
      })

      expect(foundRoom2).toMatchObject({
        name: 'Unique Room 2',
        maxPlayers: 4,
        playerCount: 0
      })
    })
  })

  test.describe('Integration: Create and Join Flow', () => {
    test('should complete full room creation and joining workflow', async ({ request }) => {
      // Step 1: Create room
      const createResponse = await request.post('/api/create-room', {
        data: {
          name: 'Integration Test Room',
          maxPlayers: 3
        }
      })

      expect(createResponse.status()).toBe(200)
      const createBody = await createResponse.json()
      const { roomId } = createBody

      // Step 2: First player joins
      await request.post('/api/join-room', {
        data: {
          roomId,
          playerId: 'alice',
          playerName: 'Alice',
          playerColor: 'red'
        }
      })

      // Step 3: Second player joins
      await request.post('/api/join-room', {
        data: {
          roomId,
          playerId: 'bob',
          playerName: 'Bob',
          playerColor: 'blue'
        }
      })

      // Step 4: Verify room state
      const roomInfoResponse = await request.get(`/api/room/${roomId}`)
      expect(roomInfoResponse.status()).toBe(200)

      const roomInfo = await roomInfoResponse.json()
      expect(roomInfo).toMatchObject({
        name: 'Integration Test Room',
        maxPlayers: 3,
        players: {
          'alice': expect.objectContaining({ name: 'Alice', color: 'red' }),
          'bob': expect.objectContaining({ name: 'Bob', color: 'blue' })
        }
      })

      // Step 5: Verify room appears in active rooms
      const activeRoomsResponse = await request.get('/api/active-rooms')
      expect(activeRoomsResponse.status()).toBe(200)

      const activeRooms = await activeRoomsResponse.json()
      expect(activeRooms).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: roomId,
            name: 'Integration Test Room'
          })
        ])
      )
    })
  })
})