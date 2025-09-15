import type { Player } from './player';
import type { Card } from './card';
import type { WebsocketProvider } from 'y-websocket';

export type GameActions = {
  playCard: (cardId: string) => void;
  drawCard: () => void;
  advanceTurn: () => void;
  useHeroAbility?: (heroId: string) => Promise<void>;
};

export type Room = {
  // Room info
  roomId: string;
  
  // Yjs refs for read-only access if needed
  provider: WebsocketProvider | null;
  playersRef: unknown; // Y.Map<Player> - using unknown for YJS map
  gameStateRef: unknown; // Y.Map<unknown> - using unknown for YJS map
  
  // Game state
  players: Player[];
  phase: string;
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
