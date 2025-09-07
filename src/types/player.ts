// Forward declaration to avoid circular import
export type Card = {
  id: string;
  name: string;
  type: string;
  class?: string;
  description: string;
  requirement?: string;
  effect: any[];
};

export type Player = {
  // Basic info
  id: string;
  name: string;
  color: string;
  
  // Connection/presence info
  lastSeen: number;
  joinTime: number;
  cursor?: { x: number; y: number };
  
  // Game state
  position: 'top' | 'right' | 'bottom' | 'left';
  hand: Card[];
  deck: Card[];
  party: {
    leader: Card | null;
    heroes: (Card | null)[];
  };
  actionPoints: number;
};
