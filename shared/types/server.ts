import * as Y from 'yjs';

// Server-side action service types
export interface ActionContext {
  roomId: string;
  playerId: string;
  cardId?: string; // ID of the card that triggered this action
  diceResult: number;
  playersMap: Y.Map<unknown>;
  gameStateMap: Y.Map<unknown>;
}

export interface ActionResult {
  success: boolean;
  message?: string;
  data?: unknown;
  // For user input requirements
  waitingForInput?: {
    type: 'target' | 'destination' | 'choice';
    options?: any[];
    prompt?: string;
    timeoutMs: number; // Timeout duration in milliseconds
    requiredPlayerId?: string; // Only this player can provide input
  };
  // Legacy field for backwards compatibility
  requiresInput?: {
    type: 'select_card' | 'select_player' | 'dice_roll' | 'choose_option';
    prompt: string;
    options?: unknown[];
    actionId: string; // To continue the action later
  };
}