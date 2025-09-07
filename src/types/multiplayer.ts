// PlayerPresence is now just Player from player.ts

export type DicePosition = {
  x: number;
  y: number;
  z: number;
  timestamp: number;
};

export type Room = {
  roomId: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
};
