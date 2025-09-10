import type { Player } from './player';
import type { Card } from './card';

export type GameState = {
  players: Player[];
  currentTurn: string;
  supportStack: Card[];
  monsters: Card[];
  phase: 'waiting' | 'playing' | 'ended';
};
