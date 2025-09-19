/**
 * Example: How routes would use the new GameContext pattern
 *
 * BEFORE: Routes extracted heavy Yjs objects and passed them around
 * AFTER: Routes create lightweight context and services access global state
 */

import { Hono } from 'hono';
import { createGameContext, validateGameContext } from '../lib/game-context';
import { setStatus, clearStatus, getStatus } from '../lib/status-service';
import * as stateManager from '../lib/state-manager';

// Example route using the new pattern
export function exampleRoute() {
  const router = new Hono();

  router.post('/play-card', async (c) => {
    try {
      // BEFORE: Heavy Yjs extraction
      // const { roomId, playerId, cardId } = await c.req.json()
      // const ydoc = getDoc(roomId)
      // const playersMap = ydoc.getMap('players')
      // const gameStateMap = ydoc.getMap('gameState')
      // someService(playersMap, gameStateMap, playerId, roomId, cardId)

      // AFTER: Lightweight context creation
      const { roomId, playerId, cardId } = await c.req.json();

      // Validate required fields
      if (!validateGameContext({ roomId, playerId })) {
        return c.json({ error: 'roomId and playerId required' }, 400);
      }

      // Create context
      const context = createGameContext(roomId, playerId);

      // Services now use clean API with context + global state
      setStatus(context, 'playCard', `Playing card ${cardId}...`);

      // Business logic would go here...
      // const result = cardService.playCard(enhancedContext, cardId)

      clearStatus(context);

      return c.json({
        success: true,
        message: 'Card played successfully'
      });

    } catch (error) {
      console.error('Play card error:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  });

  return router;
}

/**
 * Benefits of this pattern:
 *
 * 1. DRY: No more repetitive Yjs map extraction in every route
 * 2. Clean APIs: Services get lightweight context instead of heavy objects
 * 3. Global State: Single source of truth accessed internally by services
 * 4. Separation: Services don't need Yjs knowledge, just context
 * 5. Consistent: All services use same GameContext interface
 * 6. Room Isolation: Context ensures operations are scoped to correct room
 */