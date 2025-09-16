// Server-side dice state types for physics simulation
export interface ServerDiceState {
  position: [number, number, number];
  rotation: [number, number, number, number]; // quaternion
  result: number;
  isStable: boolean;
  lastUpdate: number;
}

export interface ServerDiceStates {
  [diceId: string]: ServerDiceState;
}

// Coordinate transformation utilities for responsive boundaries
export const FIELD_SIZE = 5; // Server field half-size (-5 to +5)

export interface CoordinateTransformer {
  serverToClient: (serverX: number, serverZ: number) => { x: number; z: number };
  clientToServer: (clientX: number, clientZ: number) => { x: number; z: number };
}