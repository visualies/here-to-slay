import type { ActionContext, ActionResult } from '../../../shared/types';
import { registerAction } from './action-registry';

export function run(context: ActionContext): ActionResult {
  const { playerId } = context;

  console.log(`🎯 Internal: Capturing modifier for player ${playerId}`);
  console.log('capturing modifiers');

  return {
    success: false,
    message: 'Waiting for user to select modifier',
    waitingForInput: {
      type: 'choice',
      prompt: 'Select modifier cards',
      timeoutMs: 30000,
      requiredPlayerId: playerId
    }
  };
}

export function callback(context: ActionContext, userInput: string[]): ActionResult {
  const { playerId } = context;

  console.log(`🎯 Internal: Modifier callback for player ${playerId}`);
  console.log('Modifier cards received:', userInput);

  // Process the list of modifier cards
  return {
    success: true,
    message: 'Modifier captured successfully',
    data: {
      playerId,
      modifierCards: userInput
    }
  };
}

registerAction('captureModifier', { run, callback });
