import { Hono } from 'hono'
import type RoomDatabase from '../../../src/lib/database.js'
import * as Y from 'yjs'
import { actionQueue } from '../../../src/services/action-queue.js'
import type { ActionQueueItem } from '../../../src/services/action-queue.js'

interface StartChainRequest {
  playerId: string;
  roomId: string;
  triggerType: 'hero_played' | 'monster_defeated' | 'manual';
  actions: Omit<ActionQueueItem, 'completed'>[];
  triggerData?: Record<string, unknown>;
}

interface ContinueChainRequest {
  chainId: string;
  input: unknown;
}

export function createActionChainsRouter(db: RoomDatabase, docs: Map<string, Y.Doc>) {
  const router = new Hono()

  // Helper function to get Yjs document
  function getYDoc(roomId: string) {
    return docs.get(roomId)
  }

  // Helper function to validate player exists in room
  function validatePlayer(playerId: string, roomId: string): { valid: boolean; error?: string } {
    const ydoc = getYDoc(roomId)
    if (!ydoc) {
      return { valid: false, error: 'Room not found' }
    }

    const playersMap = ydoc.getMap('players')
    const player = playersMap.get(playerId)

    if (!player) {
      return { valid: false, error: 'Player not found' }
    }

    return { valid: true }
  }

  /**
   * Start a new action chain (hero effects, triggered actions)
   */
  router.post('/start-chain', async (c) => {
    try {
      const { playerId, roomId, triggerType, actions, triggerData }: StartChainRequest = await c.req.json()
      
      console.log(`🎭 API: Starting chain for player ${playerId} in room ${roomId}`)
      console.log(`🎭 Trigger: ${triggerType}, Actions: ${actions.length}`)

      // Validate player exists
      const validation = validatePlayer(playerId, roomId)
      if (!validation.valid) {
        return c.json({ success: false, message: validation.error }, 400)
      }

      if (!actions || actions.length === 0) {
        return c.json({ success: false, message: 'Actions array cannot be empty' }, 400)
      }

      // Start the action chain
      const result = actionQueue.startChain(
        roomId,
        playerId,
        triggerType,
        actions,
        triggerData || {}
      )

      return c.json(result)
    } catch (error) {
      console.error('❌ Start chain error:', error)
      return c.json({ success: false, message: 'Internal server error' }, 500)
    }
  })

  /**
   * Continue a paused action chain with user input
   */
  router.post('/continue-chain', async (c) => {
    try {
      const { chainId, input }: ContinueChainRequest = await c.req.json()
      
      console.log(`🎭 API: Continuing chain ${chainId} with input:`, input)

      if (!chainId) {
        return c.json({ success: false, message: 'Chain ID required' }, 400)
      }

      // Continue the action chain
      const result = actionQueue.continueChain(chainId, input)

      return c.json(result)
    } catch (error) {
      console.error('❌ Continue chain error:', error)
      return c.json({ success: false, message: 'Internal server error' }, 500)
    }
  })

  /**
   * Get pending chains for a player (useful for reconnection)
   */
  router.get('/pending-chains', (c) => {
    try {
      const playerId = c.req.query('playerId')
      const roomId = c.req.query('roomId')

      if (!playerId || !roomId) {
        return c.json({ success: false, message: 'playerId and roomId query parameters required' }, 400)
      }

      const chains = actionQueue.getPlayerChains(roomId, playerId)
      
      return c.json({
        success: true,
        chains: chains.map(chain => ({
          id: chain.id,
          triggerType: chain.triggerType,
          triggerData: chain.triggerData,
          totalActions: chain.actions.length,
          currentIndex: chain.currentIndex,
          awaitingInput: chain.awaitingInput,
          inputRequired: chain.inputRequired,
          createdAt: chain.createdAt
        }))
      })
    } catch (error) {
      console.error('❌ Get pending chains error:', error)
      return c.json({ success: false, message: 'Internal server error' }, 500)
    }
  })

  /**
   * Get all chains for a room (debug/admin endpoint)
   */
  router.get('/room-chains/:roomId', (c) => {
    try {
      const roomId = c.req.param('roomId')
      
      if (!roomId) {
        return c.json({ success: false, message: 'Room ID required' }, 400)
      }

      const chains = actionQueue.getRoomChains(roomId)
      
      return c.json({
        success: true,
        roomId,
        totalChains: chains.length,
        chains: chains.map(chain => ({
          id: chain.id,
          playerId: chain.playerId,
          triggerType: chain.triggerType,
          totalActions: chain.actions.length,
          currentIndex: chain.currentIndex,
          awaitingInput: chain.awaitingInput,
          inputRequired: chain.inputRequired,
          actions: chain.actions.map(action => ({
            type: action.type,
            requiresInput: action.requiresInput,
            completed: action.completed
          })),
          createdAt: chain.createdAt
        }))
      })
    } catch (error) {
      console.error('❌ Get room chains error:', error)
      return c.json({ success: false, message: 'Internal server error' }, 500)
    }
  })

  /**
   * Debug endpoint showing global action queue state
   */
  router.get('/debug', (c) => {
    try {
      const debugInfo = actionQueue.getDebugInfo()
      
      return c.json({
        success: true,
        ...debugInfo,
        availableEndpoints: [
          'POST /start-chain - Start new action chain',
          'POST /continue-chain - Continue paused chain with user input', 
          'GET /pending-chains?playerId=X&roomId=Y - Get player pending chains',
          'GET /room-chains/:roomId - Get all chains for room',
          'GET /debug - This debug info'
        ]
      })
    } catch (error) {
      console.error('❌ Debug error:', error)
      return c.json({ success: false, message: 'Internal server error' }, 500)
    }
  })

  return router
}