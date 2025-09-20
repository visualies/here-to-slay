import type { ActionContext, ActionResult, ActionParams, Turn } from '../../../shared/types';
import { StatusKey, Amount } from '../../../shared/types';
import { registerAction } from './action-registry';
import { setStatus } from '../lib/status-service';
import { createGameContext } from '../lib/game-context';

function parseRequiredAmount(params?: ActionParams): number {
  const DEFAULT_AMOUNT = 5;

  if (!params) {
    return DEFAULT_AMOUNT;
  }

  const amountParam = params.parameters.find(param => param.name === 'amount');
  if (!amountParam) {
    return DEFAULT_AMOUNT;
  }

  const { value } = amountParam;

  if (typeof value === 'number') {
    return value;
  }

  if (value === Amount.All) {
    return DEFAULT_AMOUNT;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const numericValue = Number(value);
    if (!Number.isNaN(numericValue) && numericValue > 0) {
      return numericValue;
    }
  }

  return DEFAULT_AMOUNT;
}

export function run(context: ActionContext, params?: ActionParams): ActionResult {
  const { playerId, roomId, gameStateMap } = context;

  const requiredAmount = parseRequiredAmount(params);

  // Create game context for service calls
  const gameContext = createGameContext(roomId, playerId);

  // Set status when action starts
  const statusMessage = `Roll the dice (need ${requiredAmount}+)`;
  setStatus(gameContext, StatusKey.CAPTURE_DICE, statusMessage, true, 30000);

  const currentTurn = gameStateMap.get('currentTurn') as Turn | null;
  if (currentTurn) {
    const updatedTurn: Turn = {
      ...currentTurn,
      current_roll: undefined,
      last_amount: requiredAmount
    };
    gameStateMap.set('currentTurn', updatedTurn);
  }

  console.log(`🎯 Internal: Capturing dice for player ${playerId}`);
  console.log('capturing dice');

  return {
    success: false,
    message: 'Waiting for dice result',
    waitingForInput: {
      type: 'choice',
      prompt: 'Roll the dice',
      timeoutMs: 30000,
      requiredPlayerId: playerId
    }
  };
}

export function callback(context: ActionContext, userInput: string[]): ActionResult {
  const { playerId, roomId, gameStateMap } = context;

  console.log(`🎯 Internal: Dice callback for player ${playerId}`);

  // Convert the first input to a number (dice result)
  const diceResult = userInput.length > 0 ? parseInt(userInput[0], 10) : 0;
  console.log('Dice result received:', diceResult);

  // Validate dice result
  if (isNaN(diceResult) || diceResult < 1 || diceResult > 12) {
    return {
      success: false,
      message: 'Invalid dice result. Must be a number between 1 and 6.'
    };
  }

  const currentTurn = gameStateMap.get('currentTurn') as Turn | null;
  const currentAction = currentTurn?.action_queue?.[0];
  let requiredAmount: number | undefined;

  if (currentTurn) {
    requiredAmount = currentTurn.last_amount;
    if (requiredAmount === undefined && currentAction) {
      requiredAmount = parseRequiredAmount({ parameters: currentAction.parameters });
    }

    const isSuccessful = typeof requiredAmount === 'number' ? diceResult >= requiredAmount : false;

    const updatedTurn: Turn = {
      ...currentTurn,
      current_roll: diceResult,
      last_amount: requiredAmount
    };

    gameStateMap.set('currentTurn', updatedTurn);

    const gameContext = createGameContext(roomId, playerId);
    const message = typeof requiredAmount === 'number'
      ? `${isSuccessful ? 'Success' : 'Missed'}: rolled ${diceResult} (need ${requiredAmount}+)`
      : `Rolled ${diceResult}`;
    setStatus(gameContext, StatusKey.CAPTURE_DICE, message);
  }

  return {
    success: true,
    message: 'Dice captured successfully',
    data: {
      playerId,
      diceResult,
      requiredAmount,
      success: typeof requiredAmount === 'number' ? diceResult >= requiredAmount : undefined
    }
  };
}

registerAction('captureDice', { run, callback });
