import type { ActionContext, ActionResult } from '../../../shared/types';
import { registerAction } from './action-registry';

export function run(context: ActionContext): ActionResult {
  const { playerId } = context;

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
  const { playerId } = context;

  console.log(`🎯 Internal: Dice callback for player ${playerId}`);

  // Convert the first input to a number (dice result)
  const diceResult = userInput.length > 0 ? parseInt(userInput[0], 10) : 0;
  console.log('Dice result received:', diceResult);

  // Validate dice result
  if (isNaN(diceResult) || diceResult < 1 || diceResult > 6) {
    return {
      success: false,
      message: 'Invalid dice result. Must be a number between 1 and 6.'
    };
  }

  return {
    success: true,
    message: 'Dice captured successfully',
    data: {
      playerId,
      diceResult
    }
  };
}

registerAction('captureDice', { run, callback });
