import type { ActionContext, ActionResult, ActionParams, Turn } from '../../../shared/types';
import { Location, Amount, SelectionMode } from '../../../shared/types';
import { registerAction } from './action-registry';
import { getParam, determineSelectionMode } from './action-utils';
import { selectCards, moveCard } from '../lib/card-service';


export function run(context: ActionContext, params?: ActionParams): ActionResult {
  const target = getParam<Location>(params, 'target');
  const destination = getParam<Location>(params, 'destination');
  const amount = getParam<Amount>(params, 'amount');

  console.log(`🎯 DrawCard Action: target=${target}, destination=${destination}, amount=${amount}`);

  // Handle amount 0 as a no-op (no operation) - return success immediately
  if (amount === 0 || amount === '0') {
    console.log(`🎯 DrawCard Action: Amount is 0, treating as no-op`);
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
    console.log(`🎯 Try using explicit selection mode: ${selectionMode}`);
  } catch {
    // No explicit selection mode, determine based on target card count
    selectionMode = determineSelectionMode(context, target, amount);
    console.log(`🎯 DrawCard Action: Determined selection mode: ${selectionMode}`);
  }

  // Step 1: Try to select cards
  const selection = selectCards(context, target, amount, selectionMode);
  console.log(`🎯 DrawCard Action: selection result:`, selection);

  if (selection.needsInput) {
    // Need user input - return early and wait for user selection
    return selection.needsInput;
  }

  if (!selection.selectedCardIds || selection.selectedCardIds.length === 0) {
    console.log(`🎯 DrawCard Action: No cards selected, returning error`);
    return {
      success: false,
      message: 'No cards were selected'
    };
  }

  console.log(`🎯 DrawCard Action: Moving ${selection.selectedCardIds.length} cards:`, selection.selectedCardIds);
  // Step 2: Move the selected cards
  return moveCard(context, target, destination, selection.selectedCardIds);
}

export function callback(context: ActionContext, userInput: string[]): ActionResult {
  // Get the current action to retrieve original parameters
  // TODO can we make it so the callback retrieves the same context as before just now populated with the response
  const { gameStateMap } = context;
  const currentTurn = gameStateMap.get('currentTurn') as Turn | null;

  if (!currentTurn || !currentTurn.action_queue || currentTurn.action_queue.length === 0) {
    return {
      success: false,
      message: 'No current action found for callback'
    };
  }

  const currentAction = currentTurn.action_queue[0];

  // Extract original parameters
  const target = getParam<Location>({ parameters: currentAction.parameters }, 'target');
  const destination = getParam<Location>({ parameters: currentAction.parameters }, 'destination');

  // Move the user-selected cards
  return moveCard(context, target, destination, userInput);
}

registerAction('drawCard', { run, callback });