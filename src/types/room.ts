import type { Player } from './player';
import type { Card } from './card';

export type GameActions = {
  playCard: (cardId: string) => void;
  drawCard: () => void;
  advanceTurn: () => void;
  useHeroAbility?: (heroId: string) => Promise<void>;
};

export type Room = {
  // Room info
  roomId: string;
  
  // Game state
  players: Player[];
  gamePhase: string;
  currentTurn: string;
  supportStack: Card[];
  monsters: Card[];
  
  // Player info
  currentPlayer: Player | null;
  otherPlayers: Player[];
  isHost: boolean;
  
  // Actions
  initializeGame: () => void;
  addPlayerToGame: (playerId: string) => void;
  updateCursor: (x: number, y: number) => void;
  gameActions: GameActions;
  
  // Connection state
  isConnected: boolean;
};
