import * as stateManager from './state-manager';
import type { GameContext } from './game-context';

export interface GameStatusData {
  key: string;            // Action name or status key (e.g., 'placeCard', 'waiting-to-start')
  message: string;        // Display message for center game board
  timeout?: number;       // Duration in milliseconds, optional
  timeoutAt?: number;     // Timestamp when status expires (ms since epoch)
}

// Default timeout from environment or 30 seconds
const DEFAULT_TIMEOUT_MS = parseInt(process.env.ACTION_TIMEOUT_MS || '30000');

/**
 * Status Service - Manages game status updates tied to the action system
 *
 * Uses GameContext pattern with global state access for clean API.
 * Each status represents either:
 * - An action currently running (e.g., 'placeCard', 'captureDice')
 * - A game state ('waiting-to-start', 'game-ended')
 */

/**
 * Set the current game status
 * @param context - Game context containing roomId and playerId
 * @param actionName - Name of the action or status key
 * @param message - Display message for the UI
 * @param hasCallback - Whether action has a callback (determines if timeout is needed)
 * @param customTimeoutMs - Optional custom timeout, defaults to env var or 30s
 */
export function setStatus(
  context: GameContext,
  actionName: string,
  message: string,
  hasCallback: boolean = false,
  customTimeoutMs?: number
): void {
  const gameStateMap = stateManager.getGameStateMap(context.roomId);
  if (!gameStateMap) {
    console.error(`🎮 Status Service: Cannot set status - room ${context.roomId} not found`);
    return;
  }
  const now = Date.now();
  let timeout: number | undefined;
  let timeoutAt: number | undefined;

  // Only set timeout if action has callback (waits for user input)
  if (hasCallback) {
    timeout = customTimeoutMs || DEFAULT_TIMEOUT_MS;
    timeoutAt = now + timeout;
  }

  const statusData: GameStatusData = {
    key: actionName,
    message,
    timeout,
    timeoutAt
  };

  console.log(`🎮 Status Service: Setting status to "${actionName}" for room ${context.roomId} with message: "${message}"${timeout ? ` (timeout: ${timeout}ms)` : ''}`);

  gameStateMap.set('gameStatus', statusData);
}

/**
 * Clear the current game status
 * @param context - Game context containing roomId and playerId
 */
export function clearStatus(context: GameContext): void {
  const gameStateMap = stateManager.getGameStateMap(context.roomId);
  if (!gameStateMap) {
    console.error(`🎮 Status Service: Cannot clear status - room ${context.roomId} not found`);
    return;
  }

  console.log(`🎮 Status Service: Clearing game status for room ${context.roomId}`);
  gameStateMap.delete('gameStatus');
}

/**
 * Get the current game status
 * @param context - Game context containing roomId and playerId
 * @returns Current status data or null if not set
 */
export function getStatus(context: GameContext): GameStatusData | null {
  const gameStateMap = stateManager.getGameStateMap(context.roomId);
  if (!gameStateMap) {
    return null;
  }
  return (gameStateMap.get('gameStatus') as GameStatusData) || null;
}

/**
 * Check if current status has timed out
 * @param context - Game context containing roomId and playerId
 * @returns true if status has timed out, false otherwise
 */
export function hasStatusTimedOut(context: GameContext): boolean {
  const status = getStatus(context);
  if (!status || !status.timeoutAt) {
    return false;
  }

  const now = Date.now();
  return now > status.timeoutAt;
}

/**
 * Get time remaining for current status in milliseconds
 * @param context - Game context containing roomId and playerId
 * @returns milliseconds remaining or 0 if no timeout or expired
 */
export function getTimeRemaining(context: GameContext): number {
  const status = getStatus(context);
  if (!status || !status.timeoutAt) {
    return 0;
  }

  const now = Date.now();
  const remaining = status.timeoutAt - now;
  return Math.max(0, remaining);
}