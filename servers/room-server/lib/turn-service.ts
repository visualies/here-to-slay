import * as Y from 'yjs';
import type { Action, ActionContext, ActionResult, Turn, Player } from '../../../shared/types';
import { actionRegistry } from '../actions/action-service';
import { advanceTurn } from './game-logic';

/**
 * Turn Service - Manages action queue processing for turns
 *
 * Handles adding actions to the turn queue and processing them sequentially
 */

export interface TurnServiceResult {
  success: boolean;
  message: string;
  data?: any;
  actionsProcessed?: number;
}

/**
 * Add actions from a card to the current turn's action queue
 */
export function addActionsToQueue(
  playersMap: Y.Map<unknown>,
  gameStateMap: Y.Map<unknown>,
  playerId: string,
  roomId: string,
  actions: Action[]
): TurnServiceResult {
  console.log(`🎮 Turn Service: Adding ${actions.length} actions to queue for player ${playerId}`);

  // Get current turn
  const currentTurn = gameStateMap.get('currentTurn') as Turn | null;
  if (!currentTurn) {
    return {
      success: false,
      message: 'No active turn found'
    };
  }

  // Check if it's the correct player's turn
  if (currentTurn.player_id !== playerId) {
    return {
      success: false,
      message: `Not player ${playerId}'s turn`
    };
  }

  // Add actions to the queue
  const updatedTurn: Turn = {
    ...currentTurn,
    action_queue: [...currentTurn.action_queue, ...actions]
  };

  gameStateMap.set('currentTurn', updatedTurn);

  console.log(`🎮 Turn Service: Added ${actions.length} actions to queue. Queue now has ${updatedTurn.action_queue.length} items`);

  // Process the queue
  return processActionQueue(playersMap, gameStateMap, playerId, roomId);
}

/**
 * Process all actions in the current turn's action queue
 */
export function processActionQueue(
  playersMap: Y.Map<unknown>,
  gameStateMap: Y.Map<unknown>,
  playerId: string,
  roomId: string
): TurnServiceResult {
  console.log(`🎮 Turn Service: Processing action queue for player ${playerId}`);

  let actionsProcessed = 0;
  const results: ActionResult[] = [];

  while (true) {
    // Get current turn (it may have been updated by previous actions)
    const currentTurn = gameStateMap.get('currentTurn') as Turn | null;
    if (!currentTurn) {
      return {
        success: false,
        message: 'No active turn found during queue processing'
      };
    }

    // Check if queue is empty
    if (currentTurn.action_queue.length === 0) {
      console.log(`🎮 Turn Service: Queue processing complete. Processed ${actionsProcessed} actions`);
      break;
    }

    // Get next action from queue
    const nextAction = currentTurn.action_queue[0];
    console.log(`🎮 Turn Service: Processing action: ${nextAction.action}`);

    // Get action handler from registry
    const actionHandler = actionRegistry.get(nextAction.action);
    if (!actionHandler) {
      return {
        success: false,
        message: `Unknown action: ${nextAction.action}`
      };
    }

    // Create action context
    const context: ActionContext = {
      playersMap,
      gameStateMap,
      playerId,
      roomId
    };

    // Execute the action
    const result = actionHandler.run(context, { parameters: nextAction.parameters });
    results.push(result);

    if (!result.success) {
      console.log(`🎮 Turn Service: Action ${nextAction.action} failed: ${result.message}`);
      return {
        success: false,
        message: `Action ${nextAction.action} failed: ${result.message}`,
        actionsProcessed
      };
    }

    console.log(`🎮 Turn Service: Action ${nextAction.action} completed successfully`);
    actionsProcessed++;

    // Remove processed action from queue
    const updatedCurrentTurn = gameStateMap.get('currentTurn') as Turn;
    const updatedTurn: Turn = {
      ...updatedCurrentTurn,
      action_queue: updatedCurrentTurn.action_queue.slice(1) // Remove first item
    };
    gameStateMap.set('currentTurn', updatedTurn);
  }

  // After all actions are processed, check if turn should advance
  const finalTurn = gameStateMap.get('currentTurn') as Turn;
  if (finalTurn && finalTurn.action_points <= 0) {
    console.log(`🔄 Turn Service: All actions processed. Action points exhausted, advancing turn from player ${playerId}`);
    const allPlayers = Array.from(playersMap.values()) as Player[];
    advanceTurn(playersMap, gameStateMap, allPlayers, finalTurn);
    console.log(`🔄 Turn Service: Turn advanced successfully after processing ${actionsProcessed} actions`);
  }

  return {
    success: true,
    message: `Successfully processed ${actionsProcessed} actions`,
    actionsProcessed,
    data: {
      actionResults: results
    }
  };
}

/**
 * Clear the action queue for the current turn
 */
export function clearActionQueue(
  gameStateMap: Y.Map<unknown>,
  playerId: string
): TurnServiceResult {
  console.log(`🎮 Turn Service: Clearing action queue for player ${playerId}`);

  const currentTurn = gameStateMap.get('currentTurn') as Turn | null;
  if (!currentTurn) {
    return {
      success: false,
      message: 'No active turn found'
    };
  }

  if (currentTurn.player_id !== playerId) {
    return {
      success: false,
      message: `Not player ${playerId}'s turn`
    };
  }

  const updatedTurn: Turn = {
    ...currentTurn,
    action_queue: []
  };

  gameStateMap.set('currentTurn', updatedTurn);

  console.log(`🎮 Turn Service: Action queue cleared for player ${playerId}`);

  return {
    success: true,
    message: 'Action queue cleared'
  };
}