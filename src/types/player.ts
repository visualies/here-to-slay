import type { Card } from './card';

export type Player = {
  // Basic info
  id: string;
  name: string;
  color: string;
  
  // Connection/presence info
  lastSeen: number;
  joinTime: number;
  cursor?: { x: number; y: number };
  
  // Game state (position handled client-side)
  hand: Card[];
  deck: Card[];
  party: {
    leader: Card | null;
    heroes: (Card | null)[];
    duplicateHeroes: (Card | null)[];
  };
  actionPoints: number;
};
