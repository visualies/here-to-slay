import { Location } from './location';
import { Amount } from './amount';
import { CardType } from './card-type';

/**
 * Action parameter system interfaces
 * Defines the structure for passing parameters to actions
 */

export interface ActionParameter {
  name: string;             // 'target', 'destination', 'amount', 'type', 'selection'
  type: string;             // 'LOCATION', 'AMOUNT', 'CARD_TYPE', 'ACTION_SELECTION_MODE'
  value: unknown;
}

export interface ActionParams {
  parameters: ActionParameter[];
}