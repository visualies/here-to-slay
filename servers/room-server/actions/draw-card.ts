import type { ActionContext, ActionResult, ActionParams, Turn, Player } from '../../../shared/types';
import { Location, Amount, SelectionMode } from '../../../shared/types';
import { registerAction } from './action-registry';
import { getParam, determineSelectionMode } from './action-utils';
import { selectCards, moveCard } from '../lib/card-service';
import { setStatus, clearStatus } from '../lib/status-service';
import { createGameContext } from '../lib/game-context';


export function run(context: ActionContext, params?: ActionParams): ActionResult {
  const { gameStateMap, roomId, playerId } = context;
  const target = getParam<Location>(params, 'target');
  const destination = getParam<Location>(params, 'destination');
  const amount = getParam<Amount>(params, 'amount');

  // Create game context for service calls
  const gameContext = createGameContext(roomId, playerId);

  // Set status when action starts
  setStatus(gameContext, 'drawCard', 'Drawing cards...');

  // Handle amount 0 as a no-op (no operation) - return success immediately
  if (amount === 0 || (typeof amount === 'string' && Number(amount) === 0)) {
    return {
      success: true,
      message: 'No cards to draw (amount is 0)',
      data: {
        cards: [],
        target,
        destination,
        amount: 0
      }
    };
  }

  // Check if there's an explicit selection mode parameter
  let selectionMode: SelectionMode;
  try {
    selectionMode = getParam<SelectionMode>(params, 'selection');
  } catch {
    // No explicit selection mode, determine based on target card count
    selectionMode = determineSelectionMode(context, target, amount);
  }

  // Step 1: Try to select cards
  const selection = selectCards(context, target, amount, selectionMode);

  if (selection.needsInput) {
    // Set status with timeout since this action needs user input (has callback)
    setStatus(gameContext, 'drawCard', 'Waiting for card selection...', true);

    // Need user input - return early and wait for user selection
    return selection.needsInput;
  }

  if (!selection.selectedCardIds || selection.selectedCardIds.length === 0) {
    // Clear status on error
    clearStatus(gameContext);
    return {
      success: false,
      message: 'No cards were selected'
    };
  }
  // Step 2: Move the selected cards
  const result = moveCard(context, target, destination, selection.selectedCardIds);

  // Clear status when action completes successfully
  if (result.success) {
    clearStatus(gameContext);
  }

  return result;
}

export function callback(context: ActionContext, userInput: string[]): ActionResult {
  // Get the current action to retrieve original parameters
  // TODO can we make it so the callback retrieves the same context as before just now populated with the response
  const { gameStateMap, playersMap, playerId, roomId } = context;

  // Create game context for service calls
  const gameContext = createGameContext(roomId, playerId);
  const currentTurn = gameStateMap.get('currentTurn') as Turn | null;

  if (!currentTurn || !currentTurn.action_queue || currentTurn.action_queue.length === 0) {
    // Clear status on error
    clearStatus(gameContext);
    return {
      success: false,
      message: 'No current action found for callback'
    };
  }

  const currentAction = currentTurn.action_queue[0];

  // Extract original parameters
  const target = getParam<Location>({ parameters: currentAction.parameters }, 'target');
  const destination = getParam<Location>({ parameters: currentAction.parameters }, 'destination');

  // Special validation for AnyHand: all selected cards must come from the same player
  if (target === Location.AnyHand) {
    const otherPlayers = Array.from(playersMap.values()).filter(p => (p as Player).id !== playerId) as Player[];
    const playerCardMap = new Map<string, string[]>();
    
    // Group selected cards by player
    for (const cardId of userInput) {
      let found = false;
      for (const player of otherPlayers) {
        const card = (player.hand || []).find((c: any) => c.id === cardId);
        if (card) {
          if (!playerCardMap.has(player.id)) {
            playerCardMap.set(player.id, []);
          }
          playerCardMap.get(player.id)!.push(cardId);
          found = true;
          break;
        }
      }
      if (!found) {
        // Clear status on error
        clearStatus(gameContext);
        return { success: false, message: `Card ${cardId} not found in any other player's hand` };
      }
    }
    
    // Check if all cards come from the same player
    if (playerCardMap.size > 1) {
      // Clear status on error
      clearStatus(gameContext);
      return {
        success: false,
        message: 'For AnyHand, all selected cards must come from the same player\'s hand'
      };
    }
  }

  // Move the user-selected cards
  const result = moveCard(context, target, destination, userInput);

  // Clear status when callback completes successfully
  if (result.success) {
    clearStatus(gameContext);
  }

  return result;
}

registerAction('drawCard', { run, callback });