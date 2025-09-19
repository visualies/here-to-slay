/**
 * Game Context - Request context pattern for multiplayer game operations
 *
 * Provides lightweight context object that routes create and pass to services,
 * eliminating the need to pass heavy Yjs objects around.
 */

export interface GameContext {
  /** Room identifier */
  roomId: string;

  /** Player making the request */
  playerId: string;
}

/**
 * Create a basic game context from request data
 */
export function createGameContext(roomId: string, playerId: string): GameContext {
  return {
    roomId,
    playerId
  };
}

/**
 * Validate that required context fields are present
 * playerId can be empty for room-only operations
 */
export function validateGameContext(context: Partial<GameContext>): context is GameContext {
  return !!(context.roomId && context.playerId !== undefined);
}

/**
 * Validate that room and player are both present (stricter validation)
 */
export function validateFullGameContext(context: Partial<GameContext>): context is GameContext {
  return !!(context.roomId && context.playerId);
}