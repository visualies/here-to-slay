import * as Y from 'yjs';
import type { Player } from '../types';
import '../actions'; // Auto-import all actions to register them
import { actionRegistry } from './action-registry';

/**
 * Internal Action Service
 *
 * Pure game logic functions that can be called by:
 * - API endpoints (with validation)
 * - Hero effects (without action point costs)
 * - Game events (triggered actions)
 */

export interface ActionContext {
  roomId: string;
  playerId: string;
  diceResult: number;
  playersMap: Y.Map<Player>;
  gameStateMap: Y.Map<unknown>;
}

export interface ActionResult {
  success: boolean;
  message?: string;
  data?: unknown;
  // For user input requirements
  requiresInput?: {
    type: 'select_card' | 'select_player' | 'dice_roll' | 'choose_option';
    prompt: string;
    options?: unknown[];
    actionId: string; // To continue the action later
  };
}

// Re-export registry for controllers to use
export { actionRegistry } from './action-registry';