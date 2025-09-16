import { Hono } from 'hono'
import type RoomDatabase from '../../../src/lib/database.js'
import * as Y from 'yjs'
import { getYDoc as getYDocShared } from '@y/websocket-server/utils'
import { initializeGame, addPlayerToGame, advanceTurn } from '../lib/game-logic.js'
import { getActivePlayers } from '../../../src/lib/players.js'
import { playCard } from '../lib/card-service.js'
import type { Player, Turn } from '../../../shared/types'

export function createGameRouter(db: RoomDatabase, docs: Map<string, Y.Doc>) {
  const router = new Hono()


  // Helper function to get existing Yjs document from shared map, or create if needed
  function getYDoc(roomId: string) {
    // First check if we already have the document in memory
    if (docs.has(roomId)) {
      console.log(`🔄 Using existing Yjs document for room ${roomId}`)
      return docs.get(roomId)!
    }

    // Only create new document if not found in shared map
    console.log(`🆕 Creating new Yjs document for room ${roomId}`)
    const ydoc = getYDocShared(roomId)
    docs.set(roomId, ydoc)

    // Try to restore state from database only for truly new documents
    const savedState = db.getRoomById(roomId)?.state
    if (savedState) {
      try {
        const uint8Array = new Uint8Array(savedState)
        Y.applyUpdate(ydoc, uint8Array)
        console.log(`🔄 Restored game state for room ${roomId}`)
      } catch (error) {
        console.error(`Error restoring game state for room ${roomId}:`, error)
      }
    }

    return ydoc
  }



  // Update player presence/rejoin
  router.post('/update-player-presence', async (c) => {
    try {
      const { roomId, playerId, playerName, playerColor } = await c.req.json()

      if (!roomId || !playerId || !playerName || !playerColor) {
        return c.json({ error: 'roomId, playerId, playerName, and playerColor required' }, 400)
      }

      // Check if room exists in database
      const room = db.getRoomById(roomId)
      if (!room) {
        return c.json({ error: 'Room not found' }, 404)
      }

      // Get or create Yjs document
      const ydoc = getYDoc(roomId)
      if (!ydoc) {
        return c.json({ error: 'Failed to get room document' }, 500)
      }

      const playersMap = ydoc.getMap('players')
      const existingPlayer = playersMap.get(playerId)

      if (existingPlayer) {
        // Update existing player's presence and activity
        playersMap.set(playerId, {
          ...existingPlayer,
          lastSeen: Date.now(),
          name: playerName,
          color: playerColor,
        })
        console.log(`🔄 Updated existing player presence for ${playerName}`)

        return c.json({
          success: true,
          message: 'Player presence updated',
          player: { id: playerId, name: playerName, color: playerColor }
        })
      } else {
        return c.json({ error: 'Player not found in game' }, 404)
      }
    } catch (error) {
      console.error('Error updating player presence:', error)
      return c.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        500
      )
    }
  })

  // Add player to existing game
  router.post('/add-player-to-game', async (c) => {
    try {
      const { roomId, playerId } = await c.req.json()

      if (!roomId || !playerId) {
        return c.json({ error: 'roomId and playerId required' }, 400)
      }

      // Check if room exists
      const room = db.getRoomById(roomId)
      if (!room) {
        return c.json({ error: 'Room not found' }, 404)
      }

      // Get Yjs document
      const ydoc = getYDoc(roomId)
      if (!ydoc) {
        return c.json({ error: 'Failed to get room document' }, 500)
      }

      const playersMap = ydoc.getMap('players')
      const allPlayers = Array.from(playersMap.values()) as Player[]

      // Use the existing function
      addPlayerToGame(playersMap, allPlayers, playerId)

      console.log(`🎮 Added player ${playerId} to existing game in room ${roomId}`)

      return c.json({
        success: true,
        message: 'Player added to game'
      })
    } catch (error) {
      console.error('Error adding player to game:', error)
      return c.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        500
      )
    }
  })

  // Start/Initialize a game
  router.post('/start', async (c) => {
    try {
      const { roomId } = await c.req.json()
      if (!roomId) {
        return c.json({ error: 'Room ID required' }, 400)
      }

      // Check if room exists in database
      const room = db.getRoomById(roomId)
      if (!room) {
        return c.json({ error: 'Room not found' }, 404)
      }

      // Get or create Yjs document
      const ydoc = getYDoc(roomId)
      if (!ydoc) {
        return c.json({ error: 'Failed to get room document' }, 500)
      }

      const playersMap = ydoc.getMap('players')
      const gameStateMap = ydoc.getMap('gameState')

      // Get current players from the document
      const allPlayers = Array.from(playersMap.values()) as Player[]
      const activePlayers = getActivePlayers(allPlayers)

      if (activePlayers.length === 0) {
        return c.json({ error: 'No active players in room' }, 400)
      }

      // Check if game is already started
      const currentPhase = gameStateMap.get('phase')
      if (currentPhase === 'playing') {
        return c.json({
          success: false,
          message: 'Game is already started',
          phase: currentPhase
        })
      }

      // Initialize the game
      initializeGame(playersMap, gameStateMap, allPlayers)

      console.log(`🎮 Game started for room ${roomId} with ${activePlayers.length} players`)

      // Get the current turn info
      const currentTurnInfo = gameStateMap.get('currentTurn') as any
      const currentTurnPlayerId = currentTurnInfo?.player_id || activePlayers[0]?.id

      return c.json({
        success: true,
        message: `Game started with ${activePlayers.length} players`,
        phase: 'playing',
        currentTurn: currentTurnPlayerId,
        players: activePlayers.map(p => ({ id: p.id, name: p.name }))
      })
    } catch (error) {
      console.error('Error starting game:', error)
      return c.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        500
      )
    }
  })

  // Save game state for a room
  router.post('/save', async (c) => {
    console.log('--- SAVE ENDPOINT HIT ---');
    try {
      const body = await c.req.json()
      console.log('--- SAVE ENDPOINT BODY ---', body);
      const { roomId } = body
      if (!roomId) {
        return c.json({ error: 'Room ID required' }, 400)
      }

      // Debug: Check what documents exist
      const existingDocs = Array.from(docs.keys())
      console.log(`🔍 DEBUG: Existing documents: [${existingDocs.join(', ')}]`)
      console.log(`🔍 DEBUG: Looking for room: ${roomId}`)
      console.log(`🔍 DEBUG: Document exists: ${docs.has(roomId)}`)

      const ydoc = getYDoc(roomId)
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
      
      const result = db.saveRoomState(roomId, ydoc)
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


  // Play Card - unified endpoint for all card actions
  router.post('/play-card', async (c) => {
    try {
      const { playerId, roomId, cardId } = await c.req.json()
      console.log(`🎮 API: Play card request from player ${playerId} - card ${cardId} in room ${roomId}`)

      if (!playerId || !roomId || !cardId) {
        return c.json({ success: false, message: 'playerId, roomId, and cardId are required' }, 400)
      }

      // Get the Yjs document for the room
      const ydoc = getYDoc(roomId)
      if (!ydoc) {
        return c.json({ success: false, message: 'Failed to get room document' }, 500)
      }

      // Use the card service to handle the card playing logic
      const result = await playCard(playerId, roomId, cardId, ydoc)

      if (result.success) {
        return c.json(result)
      } else {
        return c.json(result, 400)
      }
    } catch (error) {
      console.error('❌ Play card error:', error)
      return c.json({ success: false, message: 'Internal server error' }, 500)
    }
  })

  // Note: draw-card endpoint removed - use play-card with cardId "draw-001" instead

  return router
}