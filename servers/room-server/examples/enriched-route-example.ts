/**
 * Example: Routes using enriched game context middleware
 *
 * BEFORE: Every route repeats context creation and validation
 * AFTER: Middleware handles it, routes get clean context automatically
 */

import { Hono } from 'hono';
import { gameContextMiddleware, roomOnlyContextMiddleware } from '../middleware/game-context-middleware';
import { setStatus, clearStatus } from '../lib/status-service';
import * as stateManager from '../lib/state-manager';

export function createEnrichedGameRouter() {
  const router = new Hono();

  // Apply game context middleware to all routes that need player validation
  router.use('*', gameContextMiddleware);

  // Routes now get clean, validated context automatically
  router.post('/play-card', async (c) => {
    try {
      // BEFORE: Repetitive extraction and validation
      // const { roomId, playerId, cardId } = await c.req.json()
      // if (!validateGameContext({ roomId, playerId })) {
      //   return c.json({ error: 'roomId and playerId required' }, 400)
      // }
      // const validation = stateManager.validateRoomAndPlayer(roomId, playerId)
      // if (!validation.valid) {
      //   return c.json({ error: validation.error }, 404)
      // }
      // const context = createGameContext(roomId, playerId)

      // AFTER: Clean, context automatically available
      const context = c.var.gameContext; // ✨ Automatically enriched!
      const { cardId } = await c.req.json();

      // Business logic is now the focus
      setStatus(context, 'playCard', `Playing card ${cardId}...`);

      // Simulate card play logic
      const currentTurn = stateManager.getCurrentTurn(context.roomId);
      if (currentTurn?.player_id !== context.playerId) {
        return c.json({ error: 'Not your turn' }, 400);
      }

      // Card play logic would go here...
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

  router.post('/draw-card', async (c) => {
    // Context automatically available, no repetitive setup!
    const context = c.var.gameContext;

    setStatus(context, 'drawCard', 'Drawing card...');

    // Draw card logic...
    clearStatus(context);

    return c.json({ success: true, message: 'Card drawn' });
  });

  router.post('/end-turn', async (c) => {
    // Context automatically available!
    const context = c.var.gameContext;

    setStatus(context, 'endTurn', 'Ending turn...');

    // End turn logic...
    clearStatus(context);

    return c.json({ success: true, message: 'Turn ended' });
  });

  return router;
}

// Example of room-only routes (no player required)
export function createRoomInfoRouter() {
  const router = new Hono();

  // Use room-only middleware for routes that don't need player validation
  router.use('*', roomOnlyContextMiddleware);

  router.get('/room-status/:roomId', async (c) => {
    const context = c.var.gameContext; // roomId validated, playerId empty

    const gamePhase = stateManager.getGamePhase(context.roomId);
    const players = stateManager.getPlayers(context.roomId);

    return c.json({
      roomId: context.roomId,
      gamePhase,
      playerCount: players.length,
      players: players.map(p => ({ id: p.id, name: p.name }))
    });
  });

  return router;
}

/**
 * Benefits of Enriched Context Pattern:
 *
 * 1. DRY: Zero repetition across routes
 * 2. Validation: Automatic room/player validation
 * 3. Clean Routes: Focus on business logic, not boilerplate
 * 4. Type Safety: TypeScript knows context is always valid
 * 5. Consistency: All routes get same enriched context
 * 6. Error Handling: Centralized validation error responses
 * 7. Flexibility: Different middleware for different needs (player vs room-only)
 */