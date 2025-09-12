import { Hono } from 'hono'
import type RoomDatabase from '../../src/lib/database.js'
import * as Y from 'yjs'

export function createGameRouter(db: RoomDatabase, docs: Map<string, Y.Doc>) {
  const router = new Hono()

  // Save game state for a room
  router.post('/save', async (c) => {
    try {
      const { roomId } = await c.req.json()
      if (!roomId) {
        return c.json({ error: 'Room ID required' }, 400)
      }

      const ydoc = docs.get(roomId)
      if (ydoc) {
        const state = Y.encodeStateAsUpdate(ydoc)
        db.saveGameState(roomId, Buffer.from(state))
        console.log(`💾 Game state saved for room ${roomId}`)
      }

      return c.json({ success: true })
    } catch (error) {
      console.error('Error saving game state via API:', error)
      return c.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        500
      )
    }
  })

  return router
}