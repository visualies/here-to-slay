import * as Y from 'yjs';
import type { Action, ActionContext, ActionResult, Turn, Player } from '../../../shared/types';
import { ActionState } from '../../../shared/types';
import { actionRegistry } from '../actions/action-registry';
import { advanceTurn } from './game-service';

// Import actions to register them
import '../actions/index';

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
    console.log(`🎮 Turn Service: Processing action: ${nextAction.action} (state: ${nextAction.state})`);

    // Skip actions that are waiting for input
    if (nextAction.state === ActionState.WaitingForInput) {
      console.log(`⏸️ Turn Service: Action ${nextAction.id} waiting for user input, pausing queue`);
      break;
    }

    // Remove completed, canceled, or failed actions
    if (nextAction.state === ActionState.Completed || 
        nextAction.state === ActionState.Canceled || 
        nextAction.state === ActionState.Failed) {
      console.log(`🗑️ Turn Service: Action ${nextAction.id} in ${nextAction.state} state, removing from queue`);
      const updatedCurrentTurn = gameStateMap.get('currentTurn') as Turn;
      const updatedTurn: Turn = {
        ...updatedCurrentTurn,
        action_queue: updatedCurrentTurn.action_queue.slice(1)
      };
      gameStateMap.set('currentTurn', updatedTurn);
      continue;
    }

    // Only process pending actions
    if (nextAction.state !== ActionState.Pending) {
      console.log(`⚠️ Turn Service: Action ${nextAction.id} in unexpected state: ${nextAction.state}, removing from queue`);
      const updatedCurrentTurn = gameStateMap.get('currentTurn') as Turn;
      const updatedTurn: Turn = {
        ...updatedCurrentTurn,
        action_queue: updatedCurrentTurn.action_queue.slice(1)
      };
      gameStateMap.set('currentTurn', updatedTurn);
      continue;
    }

    // Get action handler from registry
    const actionHandler = actionRegistry.get(nextAction.action);
    if (!actionHandler) {
      // Mark action as failed
      const updatedCurrentTurn = gameStateMap.get('currentTurn') as Turn;
      const updatedQueue = [...updatedCurrentTurn.action_queue];
      updatedQueue[0] = { ...nextAction, state: ActionState.Failed };
      const updatedTurn: Turn = {
        ...updatedCurrentTurn,
        action_queue: updatedQueue
      };
      gameStateMap.set('currentTurn', updatedTurn);

      return {
        success: false,
        message: `Unknown action: ${nextAction.action}`,
        actionsProcessed
      };
    }

    // Create action context
    const context: ActionContext = {
      playersMap,
      gameStateMap,
      playerId,
      roomId,
      cardId: nextAction.cardId,
      diceResult: 0 // Default value, will be set by dice roll actions
    };

    // Execute the action (either initial run or callback)
    let result: ActionResult;

    // Check if this is a callback for a waiting action
    const userInput = nextAction.parameters.find(p => p.name === 'user_input');
    if (userInput && actionHandler.callback) {
      console.log(`🎮 Turn Service: Executing callback for action ${nextAction.action} with user input`);
      result = actionHandler.callback(context, userInput.value);
    } else {
      console.log(`🎮 Turn Service: Executing initial run for action ${nextAction.action}`);
      console.log(`🎮 Turn Service: Action parameters:`, nextAction.parameters);
      result = actionHandler.run(context, { parameters: nextAction.parameters });
      console.log(`🎮 Turn Service: Action result:`, result);
    }

    results.push(result);

    // Update action state based on result
    const updatedCurrentTurn = gameStateMap.get('currentTurn') as Turn;
    const updatedQueue = [...updatedCurrentTurn.action_queue];

    if (!result.success) {
      console.log(`🎮 Turn Service: Action ${nextAction.action} failed: ${result.message}`);

      // Check if action needs user input
      if (result.waitingForInput) {
        console.log(`⏸️ Turn Service: Action ${nextAction.id} needs user input`);

        const timeoutMs = result.waitingForInput.timeoutMs || 30000; // Default 30 seconds
        const timeoutAt = Date.now() + timeoutMs;

        updatedQueue[0] = {
          ...nextAction,
          state: ActionState.WaitingForInput,
          timeoutAt,
          awaitingInput: result.waitingForInput
        };

        const updatedTurn: Turn = {
          ...updatedCurrentTurn,
          action_queue: updatedQueue
        };
        gameStateMap.set('currentTurn', updatedTurn);

        // Set waiting status in game state for frontend
        gameStateMap.set('waitingForAction', {
          actionId: nextAction.id,
          playerId: playerId, // Use current player
          type: result.waitingForInput.type,
          prompt: result.waitingForInput.prompt,
          options: result.waitingForInput.options,
          timeoutAt,
          timeRemaining: timeoutMs
        });

        // Set up timeout callback
        setTimeout(() => {
          console.log(`⏱️ Action ${nextAction.id} timed out, calling callback with empty input`);
          
          // Call the action's callback with empty input to allow cleanup
          if (actionHandler && actionHandler.callback) {
            try {
              console.log(`⏱️ Calling timeout callback for action ${nextAction.action}`);
              const timeoutResult = actionHandler.callback(context, []);
              console.log(`⏱️ Timeout callback result:`, timeoutResult);
            } catch (error) {
              console.error(`⏱️ Error calling timeout callback for action ${nextAction.action}:`, error);
            }
          }
          
          // Mark action as canceled and continue processing
          const currentTurn = gameStateMap.get('currentTurn') as Turn | null;
          if (currentTurn) {
            const updatedQueue = currentTurn.action_queue.map(action => 
              action.id === nextAction.id 
                ? { ...action, state: ActionState.Canceled }
                : action
            );
            
            const updatedTurn: Turn = {
              ...currentTurn,
              action_queue: updatedQueue
            };
            gameStateMap.set('currentTurn', updatedTurn);
            
            // Clear waiting status
            gameStateMap.delete('waitingForAction');
            
            // Continue processing the action queue
            console.log(`⏱️ Continuing action queue processing after timeout`);
            processActionQueue(playersMap, gameStateMap, playerId, roomId);
          }
        }, timeoutMs);

        // Pause processing and wait for user input
        break;
      } else {
        // Mark as failed and return error
        updatedQueue[0] = { ...nextAction, state: ActionState.Failed };
        const updatedTurn: Turn = {
          ...updatedCurrentTurn,
          action_queue: updatedQueue
        };
        gameStateMap.set('currentTurn', updatedTurn);

        return {
          success: false,
          message: `Action ${nextAction.action} failed: ${result.message}`,
          actionsProcessed
        };
      }
    } else {
      console.log(`🎮 Turn Service: Action ${nextAction.action} completed successfully`);
      actionsProcessed++;

      // Mark action as completed and remove from queue
      const updatedTurn: Turn = {
        ...updatedCurrentTurn,
        action_queue: updatedCurrentTurn.action_queue.slice(1)
      };
      gameStateMap.set('currentTurn', updatedTurn);
    }
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