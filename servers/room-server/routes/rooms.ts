import { Hono } from 'hono'
import type RoomDatabase from '../../src/lib/database.js'
import { getYDoc as getYDocShared } from '@y/websocket-server/utils'
import * as Y from 'yjs'

export function createRoomsRouter(db: RoomDatabase, docs: Map<string, Y.Doc>) {
  const router = new Hono()

  // Helper to get or create a Yjs doc and load state from DB if it's new
  const getDoc = (roomId: string): Y.Doc => {
    const docExists = docs.has(roomId)
    const ydoc = getYDocShared(roomId)

    if (!docs.has(roomId)) {
      docs.set(roomId, ydoc)
    }

    if (!docExists) {
      // Try to load existing state from database
      db.loadRoomState(roomId, ydoc)
    }
    return ydoc
  }

  // Create a new room
  router.post('/create-room', async (c) => {
    try {
      const body = await c.req.json()
      const name = body.name || 'Here to Slay Game'
      const maxPlayers = body.maxPlayers || 4
      const turnDuration = body.turnDuration || 30
      const selectedDeck = body.selectedDeck || 'standard'

      // Create room in database (minimal metadata)
      const room = db.createRoom()
      const roomId = room.roomId

      // Initialize Yjs document with room data
      const ydoc = getDoc(roomId)

      // Set room metadata in Yjs document
      const roomMap = ydoc.getMap('room')
      roomMap.set('id', roomId)
      roomMap.set('name', name)
      roomMap.set('maxPlayers', maxPlayers)
      roomMap.set('turnDuration', turnDuration)
      roomMap.set('selectedDeck', selectedDeck)
      roomMap.set('createdAt', new Date().toISOString())

      // Initialize empty collections
      ydoc.getMap('players')
      ydoc.getMap('gameState')

      console.log(`🏠 Created room: ${roomId} - "${name}" (${turnDuration}s turns, ${selectedDeck} deck)`)

      return c.json({ roomId, name, maxPlayers, turnDuration, selectedDeck })
    } catch (error) {
      console.error('Error creating room:', error)
      return c.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        500
      )
    }
  })

  // Join an existing room
  router.post('/join-room', async (c) => {
    try {
      const { roomId, playerId, playerName, playerColor } = await c.req.json()

      // Get or create Yjs document for this room
      const ydoc = getDoc(roomId)

      // Initialize room metadata if still missing
      const roomMap = ydoc.getMap('room')
      if (!roomMap.get('id')) {
        roomMap.set('id', roomId)
        roomMap.set('name', 'Here to Slay Game')
        roomMap.set('maxPlayers', 4)
        roomMap.set('createdAt', new Date().toISOString())
      }

      const playersMap = ydoc.getMap('players')

      // Check if room is full
      const maxPlayers = roomMap.get('maxPlayers') || 4
      const currentPlayerCount = playersMap.size
      if (currentPlayerCount >= maxPlayers && !playersMap.has(playerId)) {
        return c.json(
          { error: 'Room is full' },
          400
        )
      }

      // Add/update player in Yjs document
      playersMap.set(playerId, {
        id: playerId,
        name: playerName,
        color: playerColor,
        lastSeen: Date.now(),
        hand: [],
        party: [],
        actionPoints: 0,
        joinTime: Date.now()
      })

      // Use database method to join and persist
      const result = db.joinRoom(roomId, playerId, playerName, playerColor, ydoc)

      return c.json(result)
    } catch (error) {
      return c.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        400
      )
    }
  })

  // Get complete room state (from Yjs document)
  router.get('/room/:roomId', async (c) => {
    const roomId = c.req.param('roomId')
    if (!roomId) {
      return c.json({ error: 'Room ID required' }, 400)
    }

    try {
      // Check if room exists in database
      const roomMetadata = db.getRoomMetadata(roomId)
      if (!roomMetadata) {
        return c.json({ error: 'Room not found' }, 404)
      }

      // Get or load Yjs document
      const ydoc = getDoc(roomId)

      const roomMap = ydoc.getMap('room')
      const playersMap = ydoc.getMap('players')
      const gameStateMap = ydoc.getMap('gameState')

      // Convert Yjs maps to plain objects for JSON serialization
      const room = Array.from(roomMap.entries()).reduce((acc, [key, value]) => {
        acc[key] = value
        return acc
      }, {} as Record<string, any>)

      const players = Array.from(playersMap.entries()).reduce((acc, [key, value]) => {
        acc[key] = value
        return acc
      }, {} as Record<string, any>)

      const gameState = Array.from(gameStateMap.entries()).reduce((acc, [key, value]) => {
        acc[key] = value
        return acc
      }, {} as Record<string, any>)

      // Return the Yjs document content with fallback values
      return c.json({
        id: room.id || roomId,
        name: room.name || 'Here to Slay Game',
        maxPlayers: room.maxPlayers || 4,
        createdAt: room.createdAt || roomMetadata.created_at,
        gameState: Object.keys(gameState).length > 0 ? gameState : null,
        players: Object.keys(players).length > 0 ? players : null
      })
    } catch (error) {
      return c.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        500
      )
    }
  })

  // List all active rooms with data from Yjs docs
  router.get('/active-rooms', async (c) => {
    try {
      const rooms = db.getActiveRooms()

      // Enhance with data from Yjs documents
      const enhancedRooms = rooms.map(room => {
        if (docs.has(room.id)) {
          const ydoc = docs.get(room.id)!
          const roomMap = ydoc.getMap('room')
          const playersMap = ydoc.getMap('players')

          return {
            id: room.id,
            name: roomMap.get('name') || 'Here to Slay Game',
            maxPlayers: roomMap.get('maxPlayers') || 4,
            playerCount: playersMap.size,
            createdAt: roomMap.get('createdAt') || room.created_at,
            lastActivity: room.last_activity
          }
        }

        return {
          id: room.id,
          name: 'Here to Slay Game',
          maxPlayers: 4,
          playerCount: 0,
          createdAt: room.created_at,
          lastActivity: room.last_activity
        }
      })

      return c.json(enhancedRooms)
    } catch (error) {
      return c.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        500
      )
    }
  })

  // Leave a room
  router.post('/leave-room', async (c) => {
    try {
      const { roomId, playerId } = await c.req.json()

      // Get Yjs document if it exists
      if (docs.has(roomId)) {
        const ydoc = getDoc(roomId)
        const playersMap = ydoc.getMap('players')

        // Remove player from Yjs document
        playersMap.delete(playerId)

        // Use database method to leave and persist
        db.leaveRoom(roomId, playerId, ydoc)
      }

      return c.json({ success: true })
    } catch (error) {
      return c.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        400
      )
    }
  })

  return router
}