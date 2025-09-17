import type { Player } from './player';
import type { ActionParameter } from './action-parameter';

export type Action = {
  action: string;
  parameters: ActionParameter[];
  cardId?: string; // ID of the card that triggered this action
}