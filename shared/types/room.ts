import type { Player } from './player';
import type { Card } from './card';
import type { Turn } from './turn';
import type { WebsocketProvider } from 'y-websocket';

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
  currentTurnData: Turn | null;
  supportStack: Card[];
  monsters: Card[];

  // Computed/derived properties
  currentPlayer: Player | null;
  otherPlayers: Player[];
  isHost: boolean;
  isConnected: boolean;

  // Actions
  initializeGame: () => void;
  addPlayerToGame: (playerId: string) => void;
  updateCursor: (x: number, y: number) => void;
  gameActions: {
    playCard: () => void;
    [key: string]: unknown;
  };
};