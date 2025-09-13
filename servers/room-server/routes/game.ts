import { Hono } from 'hono'
import type RoomDatabase from '../../src/lib/database.js'
import * as Y from 'yjs'
import { initializeGame, advanceTurn as advanceTurnFn, addPlayerToGame } from '../../../src/lib/game-actions.js'
import { getActivePlayers } from '../../../src/lib/players.js'
import {
  type ActionContext,
  type ActionResult,
  actionRegistry
} from '../../../src/services/action-service.js'

// Common payload structure for all game actions
interface GameActionRequest {
  playerId: string;
  roomId: string;
  // Optional fields used by specific actions
  cardId?: string;           // For play-hero-to-party
  monsterId?: string;        // For attack-monster
  diceResult?: number;       // For actions requiring dice (attack-monster, hero effects)
}

export function createGameRouter(db: RoomDatabase, docs: Map<string, Y.Doc>) {
  const router = new Hono()

  // Helper function to validate player action
  function validatePlayerAction(
    playerId: string,
    roomId: string,
    requiresActionPoints = true
  ): { valid: boolean; context?: ActionContext; player?: any; error?: string } {
    const ydoc = getYDoc(roomId)
    if (!ydoc) {
      return { valid: false, error: 'Room not found' }
    }

    const playersMap = ydoc.getMap('players')
    const gameStateMap = ydoc.getMap('gameState')
    const player = playersMap.get(playerId)

    if (!player) {
      return { valid: false, error: 'Player not found' }
    }

    // Check if it's the player's turn
    const currentTurn = gameStateMap.get('currentTurn') as string
    if (currentTurn !== playerId) {
      return { valid: false, error: 'Not your turn' }
    }

    // Check action points if required
    if (requiresActionPoints && player.actionPoints <= 0) {
      return { valid: false, error: 'No action points remaining' }
    }

    const context: ActionContext = {
      roomId,
      playerId,
      diceResult: 0,
      playersMap,
      gameStateMap
    }

    return { valid: true, context, player }
  }

  // Helper function to handle action point deduction and turn advancement
  function handleTurnLogic(
    context: ActionContext,
    player: any,
    deductActionPoint = true
  ): void {
    if (deductActionPoint) {
      const newActionPoints = Math.max(0, player.actionPoints - 1)
      context.playersMap.set(context.playerId, { ...player, actionPoints: newActionPoints })

      console.log(`🔄 Player ${context.playerId} has ${newActionPoints} action points remaining`)

      // Advance turn if no action points left
      if (newActionPoints === 0) {
        const currentPlayers = Array.from(context.playersMap.values())
        const currentTurn = context.gameStateMap.get('currentTurn') as string
        console.log(`🔄 Advancing turn from player ${context.playerId}`)
        advanceTurnFn(context.playersMap, context.gameStateMap, currentPlayers, currentTurn, context.roomId)
      }
    }
  }

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

  // Debug endpoint to get game state for a specific room
  router.get('/debug/:roomId', async (c) => {
    const roomId = c.req.param('roomId')
    if (!roomId) {
      return c.json({ error: 'Room ID required' }, 400)
    }

    const ydoc = docs.get(roomId)
    if (!ydoc) {
      return c.json({ error: 'Room document not found' }, 404)
    }

    const playersMap = ydoc.getMap('players')
    const gameStateMap = ydoc.getMap('gameState')

    // Convert Yjs maps to plain objects for JSON serialization
    const players = Array.from(playersMap.entries()).reduce((acc, [key, value]) => {
      acc[key] = value
      return acc
    }, {} as Record<string, any>)

    const gameState = Array.from(gameStateMap.entries()).reduce((acc, [key, value]) => {
      acc[key] = value
      return acc
    }, {} as Record<string, any>)

    return c.json({
      roomId,
      players,
      gameState,
      playersCount: playersMap.size,
      gameStateKeys: Array.from(gameStateMap.keys())
    })
  })


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
      const allPlayers = Array.from(playersMap.values())

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
      const allPlayers = Array.from(playersMap.values())
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

      return c.json({
        success: true,
        message: `Game started with ${activePlayers.length} players`,
        phase: 'playing',
        currentTurn: gameStateMap.get('currentTurn'),
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

  // Game Actions

  // Draw Card
  router.post('/draw-card', async (c) => {
    try {
      const { playerId, roomId }: GameActionRequest = await c.req.json()
      console.log(`🎮 API: Draw card request from player ${playerId}`)

      const validation = validatePlayerAction(playerId, roomId, true)
      if (!validation.valid) {
        return c.json({ success: false, message: validation.error }, 400)
      }

      const drawCardAction = actionRegistry.get('drawCard')!
      const result = drawCardAction.run(validation.context!)

      if (result.success) {
        handleTurnLogic(validation.context!, validation.player, true)
      }

      return c.json(result)
    } catch (error) {
      console.error('❌ Draw card error:', error)
      return c.json({ success: false, message: 'Internal server error' }, 500)
    }
  })

  // Play Hero to Party
  router.post('/play-hero-to-party', async (c) => {
    try {
      const { playerId, roomId, cardId }: GameActionRequest = await c.req.json()
      console.log(`🎮 API: Play hero to party request from player ${playerId} - card ${cardId}`)

      if (!cardId) {
        return c.json({ success: false, message: 'Card ID required' }, 400)
      }

      const validation = validatePlayerAction(playerId, roomId, true)
      if (!validation.valid) {
        return c.json({ success: false, message: validation.error }, 400)
      }

      const playHeroAction = actionRegistry.get('playHeroToParty')!
      const result = playHeroAction.run(validation.context!, cardId)

      if (result.success) {
        handleTurnLogic(validation.context!, validation.player, true)
      }

      return c.json(result)
    } catch (error) {
      console.error('❌ Play hero to party error:', error)
      return c.json({ success: false, message: 'Internal server error' }, 500)
    }
  })

  // Attack Monster
  router.post('/attack-monster', async (c) => {
    try {
      const { playerId, roomId, monsterId, diceResult }: GameActionRequest = await c.req.json()
      console.log(`🎮 API: Attack monster request from player ${playerId} - monster ${monsterId}, dice: ${diceResult}`)

      if (!monsterId) {
        return c.json({ success: false, message: 'Monster ID required' }, 400)
      }

      if (diceResult === undefined || diceResult === null) {
        return c.json({ success: false, message: 'Dice result required (include diceResult in payload)' }, 400)
      }

      const validation = validatePlayerAction(playerId, roomId, true)
      if (!validation.valid) {
        return c.json({ success: false, message: validation.error }, 400)
      }

      const attackAction = actionRegistry.get('attackMonster')!
      const result = attackAction.run(validation.context!, monsterId, diceResult)

      // Always deduct action point and handle turn logic for completed action
      if (result.success !== undefined) { // Action completed (success or failure)
        handleTurnLogic(validation.context!, validation.player, true)
      }

      return c.json(result)
    } catch (error) {
      console.error('❌ Attack monster error:', error)
      return c.json({ success: false, message: 'Internal server error' }, 500)
    }
  })

  // Discard All and Redraw
  router.post('/discard-hand-redraw', async (c) => {
    try {
      const { playerId, roomId }: GameActionRequest = await c.req.json()
      console.log(`🎮 API: Discard hand redraw request from player ${playerId}`)

      const validation = validatePlayerAction(playerId, roomId, true)
      if (!validation.valid) {
        return c.json({ success: false, message: validation.error }, 400)
      }

      const discardAction = actionRegistry.get('discardAllAndRedraw')!
      const result = discardAction.run(validation.context!)

      if (result.success) {
        handleTurnLogic(validation.context!, validation.player, true)
      }

      return c.json(result)
    } catch (error) {
      console.error('❌ Discard hand redraw error:', error)
      return c.json({ success: false, message: 'Internal server error' }, 500)
    }
  })

  return router
}