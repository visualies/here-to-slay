import { Context, Next } from 'hono';
import { createGameContext, validateGameContext, type GameContext } from '../lib/game-context';
import * as stateManager from '../lib/state-manager';

/**
 * Game Context Middleware
 *
 * Enriches requests with validated GameContext, eliminating repetitive
 * context creation and validation across all game routes.
 */

declare module 'hono' {
  interface ContextVariableMap {
    gameContext: GameContext;
  }
}

/**
 * Middleware that extracts and validates game context from request
 * Sets c.var.gameContext for use in route handlers
 */
export async function gameContextMiddleware(c: Context, next: Next) {
  try {
    // Extract roomId and playerId from request body or params
    let roomId: string | undefined;
    let playerId: string | undefined;

    // Try body first (POST requests)
    if (c.req.header('content-type')?.includes('application/json')) {
      try {
        const body = await c.req.json();
        roomId = body.roomId;
        playerId = body.playerId;
      } catch {
        // If JSON parsing fails, continue to try other sources
      }
    }

    // Try URL params if not found in body (GET requests)
    if (!roomId) {
      roomId = c.req.param('roomId');
    }
    if (!playerId) {
      playerId = c.req.query('playerId');
    }

    // Validate required fields
    if (!validateGameContext({ roomId, playerId })) {
      return c.json({
        error: 'Missing required fields: roomId and playerId are required'
      }, 400);
    }

    // Validate room and player exist
    const validation = stateManager.validateRoomAndPlayer(roomId, playerId);
    if (!validation.valid) {
      return c.json({
        error: validation.error
      }, 404);
    }

    // Create and set context
    const gameContext = createGameContext(roomId, playerId);
    c.set('gameContext', gameContext);

    await next();

  } catch (error) {
    console.error('Game context middleware error:', error);
    return c.json({
      error: 'Failed to process game context'
    }, 500);
  }
}

/**
 * Optional middleware for routes that don't require playerId
 * Only validates roomId
 */
export async function roomOnlyContextMiddleware(c: Context, next: Next) {
  try {
    // Extract roomId from request body or params
    let roomId: string | undefined;

    // Try body first (POST requests)
    if (c.req.header('content-type')?.includes('application/json')) {
      try {
        const body = await c.req.json();
        roomId = body.roomId;
      } catch {
        // If JSON parsing fails, continue to try other sources
      }
    }

    // Try URL params if not found in body (GET requests)
    if (!roomId) {
      roomId = c.req.param('roomId');
    }

    // Validate required field
    if (!roomId) {
      return c.json({
        error: 'Missing required field: roomId is required'
      }, 400);
    }

    // Validate room exists
    if (!stateManager.hasRoom(roomId)) {
      return c.json({
        error: `Room ${roomId} not found`
      }, 404);
    }

    // Create minimal context (playerId will be empty string)
    const gameContext = createGameContext(roomId, '');
    c.set('gameContext', gameContext);

    await next();

  } catch (error) {
    console.error('Room context middleware error:', error);
    return c.json({
      error: 'Failed to process room context'
    }, 500);
  }
}