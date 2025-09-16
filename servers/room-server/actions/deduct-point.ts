import type { ActionContext, ActionResult, ActionParams } from '../../../shared/types';
import { Amount } from '../../../shared/types';
import { registerAction } from './action-registry';
import { getParam } from './action-utils';

export function run(context: ActionContext, params?: ActionParams): ActionResult {
  const { playerId, gameStateMap, playersMap } = context;

  // Get the amount parameter (defaults to 1 if not provided)
  let amount: number = 1;
  try {
    const amountParam = getParam<Amount>(params, 'amount');
    if (typeof amountParam === 'number') {
      amount = amountParam;
    } else if (typeof amountParam === 'string' && !isNaN(Number(amountParam))) {
      amount = Number(amountParam);
    }
  } catch (error) {
    // If amount parameter is missing, default to 1
    console.log(`➖ Using default amount of 1 for deduct-point action`);
  }

  console.log(`➖ Internal: Deducting ${amount} action point(s) for player ${playerId}`);

  // Get current turn
  const currentTurn = gameStateMap.get('currentTurn') as any;
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

  // Check if player has enough action points
  if (currentTurn.action_points < amount) {
    return {
      success: false,
      message: `Not enough action points (has ${currentTurn.action_points}, needs ${amount})`
    };
  }

  // Deduct action points from turn
  const updatedTurn = {
    ...currentTurn,
    action_points: currentTurn.action_points - amount
  };
  gameStateMap.set('currentTurn', updatedTurn);

  // Also update player's action points
  const player = playersMap.get(playerId);
  if (player) {
    playersMap.set(playerId, {
      ...player,
      actionPoints: updatedTurn.action_points
    });
  }

  console.log(`✅ Deducted ${amount} action point(s). Remaining: ${updatedTurn.action_points}`);

  return {
    success: true,
    message: `Deducted ${amount} action point(s)`,
    data: { playerId, amount, remainingPoints: updatedTurn.action_points }
  };
}

registerAction('deductPoint', { run });