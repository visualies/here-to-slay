import type { Action } from './card';
import type { Player } from './player';

export type { Action } from './card';
export type ActionParams = {
  player: Player;
  target?: Player;
  effect: Action;
};
