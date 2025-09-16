import * as Y from 'yjs';

// Server-side action service types
export interface ActionContext {
  roomId: string;
  playerId: string;
  diceResult: number;
  playersMap: Y.Map<unknown>;
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