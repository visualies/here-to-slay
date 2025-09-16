import type { Player } from './player';
import type { Card } from './card';
import type { Turn } from './turn';

export type GameState = {
  players: Player[];
  currentTurn: Turn;
  supportStack: Card[];
  monsters: Card[];
  phase: 'waiting' | 'playing' | 'ended';
};