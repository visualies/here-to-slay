import { Hono } from 'hono'
import type RoomDatabase from '../../src/lib/database.js'
import * as Y from 'yjs'

export function createGameRouter(db: RoomDatabase, docs: Map<string, Y.Doc>) {
  const router = new Hono()

  // Helper function to get or create Yjs document (same as server.ts)
  function getYDoc(roomId: string) {
    if (!docs.has(roomId)) {
      const ydoc = new Y.Doc()
      
      // Try to restore saved game state
      const savedState = db.getGameState(roomId)
      if (savedState) {
        try {
          const uint8Array = new Uint8Array(savedState)
          Y.applyUpdate(ydoc, uint8Array)
          console.log(`🔄 Restored game state for room ${roomId}`)
        } catch (error) {
          console.error(`Error restoring game state for room ${roomId}:`, error)
        }
      }
      
      docs.set(roomId, ydoc)
    }
    return docs.get(roomId)
  }

  // Debug endpoint to see all documents
  router.get('/debug', async (c) => {
    const roomIds = Array.from(docs.keys())
    return c.json({ 
      totalDocs: docs.size, 
      roomIds: roomIds,
      docs: roomIds.map(id => ({
        id,
        hasDoc: docs.has(id),
        stateSize: docs.get(id) ? Y.encodeStateAsUpdate(docs.get(id)!).length : 0
      }))
    })
  })

  // Test endpoint to manually create a document
  router.post('/create-test-doc', async (c) => {
    const { roomId } = await c.req.json()
    if (!roomId) {
      return c.json({ error: 'Room ID required' }, 400)
    }
    
    const ydoc = getYDoc(roomId)
    const gameState = ydoc!.getMap('gameState')
    const players = ydoc!.getMap('players')
    
    // Add some test data
    gameState.set('gamePhase', 'playing')
    gameState.set('currentTurn', 'test-player')
    
    console.log(`Created/updated test document for room ${roomId}`)
    
    return c.json({ 
      success: true, 
      roomId, 
      stateSize: Y.encodeStateAsUpdate(ydoc!).length 
    })
  })

  // Save game state for a room
  router.post('/save', async (c) => {
    try {
      const { roomId } = await c.req.json()
      if (!roomId) {
        return c.json({ error: 'Room ID required' }, 400)
      }

      // Debug: Check what documents exist
      const existingDocs = Array.from(docs.keys())
      console.log(`🔍 DEBUG: Existing documents: [${existingDocs.join(', ')}]`)
      console.log(`🔍 DEBUG: Looking for room: ${roomId}`)
      console.log(`🔍 DEBUG: Document exists: ${docs.has(roomId)}`)

      const ydoc = docs.get(roomId)
      if (!ydoc) {
        console.log(`⚠️ No Yjs document found for room ${roomId}`)
        console.log(`⚠️ This suggests WebSocket connection was never established or document was lost`)
        
        // Check if room exists in database
        const room = db.getRoomById(roomId)
        if (room) {
          console.log(`⚠️ Room ${roomId} exists in database but has no active Yjs document`)
        } else {
          console.log(`⚠️ Room ${roomId} not found in database either`)
        }
        
        return c.json({ 
          success: false, 
          saved: false, 
          message: 'No active document found - WebSocket connection may not be established',
          debug: {
            requestedRoom: roomId,
            existingDocs: existingDocs,
            roomInDb: !!room
          }
        }, 400)
      }

      const state = Y.encodeStateAsUpdate(ydoc)
      console.log(`💾 Saving game state for room ${roomId}, state size: ${state.length} bytes`)
      
      const result = db.saveGameState(roomId, Buffer.from(state))
      console.log(`💾 Game state saved for room ${roomId}`)
      
      return c.json({ 
        success: true, 
        saved: true, 
        stateSize: result.stateSize,
        originalStateSize: state.length 
      })
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