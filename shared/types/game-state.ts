import type { Player } from './player';
import type { Card } from './card';
import type { Turn } from './turn';

export type GameState = {
  players: Player[];
  currentTurn: Turn;
  supportStack: Card[];
  monsters: Card[];
  phase: 'waiting' | 'playing' | 'ended';
  waitingForAction?: {
    actionId: string;
    playerId: string;
    type: 'target' | 'destination' | 'choice';
    prompt?: string;
    options?: any[];
    timeoutAt: number; // Timestamp when action times out
    timeRemaining?: number; // Calculated time remaining in ms
  };
};