import { Hono } from 'hono'
import type RoomDatabase from '../../src/lib/database.js'

export function createRoomsRouter(db: RoomDatabase) {
  const router = new Hono()

  // Create a new room
  router.post('/create-room', async (c) => {
    try {
      const body = await c.req.json()
      const name = body.name || 'Here to Slay Game'
      const maxPlayers = body.maxPlayers || 4
      const room = db.createRoom(name, maxPlayers)
      return c.json(room)
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
      const result = db.joinRoom(roomId, playerId, playerName, playerColor)

      // Also add player to Yjs document if it exists
      if (result.success) {
        // Import docs from the game router scope - we'll need to pass it
        // For now, let the WebSocket connection handle this
        console.log(`Player ${playerName} joined room ${roomId} - Yjs sync will happen via WebSocket`)
      }

      return c.json(result)
    } catch (error) {
      return c.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        400
      )
    }
  })

  // Get room information
  router.get('/room-info', async (c) => {
    const roomId = c.req.query('id')
    if (!roomId) {
      return c.json({ error: 'Room ID required' }, 400)
    }

    try {
      const roomInfo = db.getRoomStats(roomId)
      if (!roomInfo) {
        return c.json({ error: 'Room not found' }, 404)
      }
      return c.json(roomInfo)
    } catch (error) {
      return c.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        500
      )
    }
  })

  // List all active rooms
  router.get('/active-rooms', async (c) => {
    try {
      const rooms = db.getActiveRooms()
      return c.json(rooms)
    } catch (error) {
      return c.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        500
      )
    }
  })

  return router
}