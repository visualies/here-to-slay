import { Hono } from 'hono'
import type RoomDatabase from '../../../src/lib/database.js'
import * as Y from 'yjs'
import { 
  drawCard, 
  playHeroToParty, 
  attackMonster, 
  discardAllAndRedraw,
  type ActionServiceContext,
  type ActionResult
} from '../../../src/services/action-service.js'
import { advanceTurn as advanceTurnFn } from '../../../src/lib/game-actions.js'

// Common payload structure for all game actions
interface GameActionRequest {
  playerId: string;
  roomId: string;
  // Optional fields used by specific actions
  cardId?: string;           // For play-hero-to-party
  monsterId?: string;        // For attack-monster
  diceResult?: number;       // For actions requiring dice (attack-monster, hero effects)
}

interface GameActionResponse {
  success: boolean;
  message?: string;
  data?: unknown;
  requiresInput?: {
    type: string;
    prompt: string;
    options?: unknown[];
    actionId: string;
  };
}

export function createGameActionsRouter(db: RoomDatabase, docs: Map<string, Y.Doc>) {
  const router = new Hono()

  // Helper function to get Yjs document
  function getYDoc(roomId: string) {
    return docs.get(roomId)
  }

  // Helper function to validate player action
  function validatePlayerAction(
    playerId: string, 
    roomId: string, 
    requiresActionPoints = true
  ): { valid: boolean; context?: ActionServiceContext; player?: any; error?: string } {
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

    const context: ActionServiceContext = {
      roomId,
      playerId,
      playersMap,
      gameStateMap
    }

    return { valid: true, context, player }
  }

  // Helper function to handle action point deduction and turn advancement
  function handleTurnLogic(
    context: ActionServiceContext, 
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

  // 1. Draw Card
  router.post('/draw-card', async (c) => {
    try {
      const { playerId, roomId }: GameActionRequest = await c.req.json()
      console.log(`🎮 API: Draw card request from player ${playerId}`)

      const validation = validatePlayerAction(playerId, roomId, true)
      if (!validation.valid) {
        return c.json({ success: false, message: validation.error }, 400)
      }

      const result = drawCard(validation.context!)
      
      if (result.success) {
        handleTurnLogic(validation.context!, validation.player, true)
      }

      return c.json(result)
    } catch (error) {
      console.error('❌ Draw card error:', error)
      return c.json({ success: false, message: 'Internal server error' }, 500)
    }
  })

  // 2. Play Hero to Party
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

      const result = playHeroToParty(validation.context!, cardId)
      
      if (result.success) {
        handleTurnLogic(validation.context!, validation.player, true)
      }

      return c.json(result)
    } catch (error) {
      console.error('❌ Play hero to party error:', error)
      return c.json({ success: false, message: 'Internal server error' }, 500)
    }
  })

  // 3. Attack Monster  
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

      const result = attackMonster(validation.context!, monsterId, diceResult)
      
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

  // 4. Discard All and Redraw (costs 1 action point)
  router.post('/discard-hand-redraw', async (c) => {
    try {
      const { playerId, roomId }: GameActionRequest = await c.req.json()
      console.log(`🎮 API: Discard hand redraw request from player ${playerId}`)

      const validation = validatePlayerAction(playerId, roomId, true)
      if (!validation.valid) {
        return c.json({ success: false, message: validation.error }, 400)
      }

      const result = discardAllAndRedraw(validation.context!)
      
      if (result.success) {
        handleTurnLogic(validation.context!, validation.player, true)
      }

      return c.json(result)
    } catch (error) {
      console.error('❌ Discard hand redraw error:', error)
      return c.json({ success: false, message: 'Internal server error' }, 500)
    }
  })

  // Debug endpoint to see available actions
  router.get('/debug', (c) => {
    return c.json({
      availableActions: [
        {
          endpoint: 'POST /draw-card',
          payload: { playerId: 'string', roomId: 'string' }
        },
        {
          endpoint: 'POST /play-hero-to-party',
          payload: { playerId: 'string', roomId: 'string', cardId: 'string' }
        },
        {
          endpoint: 'POST /attack-monster',
          payload: { playerId: 'string', roomId: 'string', monsterId: 'string', diceResult: 'number' }
        },
        {
          endpoint: 'POST /discard-hand-redraw',
          payload: { playerId: 'string', roomId: 'string' }
        }
      ],
      commonPayload: {
        playerId: 'string (required)',
        roomId: 'string (required)',
        cardId: 'string (optional - for play-hero-to-party)',
        monsterId: 'string (optional - for attack-monster)',
        diceResult: 'number (required for attack-monster)'
      },
      notes: [
        'All actions require player to be on their turn with action points',
        'Actions cost 1 action point and may advance turn',
        'Dice results must be included in payload for monster attacks'
      ]
    })
  })

  return router
}