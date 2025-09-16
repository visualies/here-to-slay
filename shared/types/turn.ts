import type { Action } from './action';

export type Turn = {
  player_id: string;
  action_points: number;
  current_roll?: number;
  last_target?: string;
  last_destination?: string;
  last_amount?: number;
  played_cards: string[];
  modifiers: string[];
  action_queue: Action[];
};