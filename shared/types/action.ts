import type { Player } from './player';
import type { ActionParameter } from './action-parameter';

export enum ActionState {
  Pending = 'pending',           // Ready to execute
  WaitingForInput = 'waiting',   // Waiting for user selection
  Completed = 'completed',       // Finished successfully
  Failed = 'failed',            // Failed execution
  Canceled = 'canceled'         // Canceled due to timeout or other reason
}

export type Action = {
  id: string;                   // Unique action ID
  action: string;
  parameters: ActionParameter[];
  cardId?: string;              // ID of the card that triggered this action
  state: ActionState;           // Current action state
  timeoutAt?: number;           // Timestamp when action times out (ms since epoch)
  awaitingInput?: {
    type: 'target' | 'destination' | 'choice';
    options?: any[];            // Available choices
    prompt?: string;            // User-facing message
    timeoutMs: number;          // Timeout duration in milliseconds
  };
}