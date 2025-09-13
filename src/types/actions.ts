// Action and ActionResponse types for server-driven interaction pattern

export interface BaseAction {
  type: string;
  playerId: string;
  roomId: string;
}

export interface DrawCardAction extends BaseAction {
  type: 'draw_card';
}

export interface PlayCardAction extends BaseAction {
  type: 'play_card';
  cardId: string;
}

export interface AttackMonsterAction extends BaseAction {
  type: 'attack_monster';
  monsterId: string;
}

export type GameAction = DrawCardAction | PlayCardAction | AttackMonsterAction;

export interface ActionResponse {
  status: 'completed' | 'requires_input' | 'failed';
  message?: string;
  actionId?: string;
  requiredInput?: {
    type: 'select_card' | 'select_player' | 'dice_roll' | 'choose_option';
    prompt: string;
    options?: unknown[];
    constraints?: unknown;
  };
}

export interface ContinueActionRequest {
  actionId: string;
  input: unknown;
}