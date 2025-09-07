"use client";

// Coordinate transformation utilities for responsive boundaries
export const FIELD_SIZE = 5; // Server field half-size (-5 to +5)

export interface CoordinateTransformer {
  serverToClient: (serverX: number, serverZ: number) => { x: number; z: number };
  clientToServer: (clientX: number, clientZ: number) => { x: number; z: number };
}

export function createCoordinateTransformer(viewportWidth: number, viewportHeight: number): CoordinateTransformer {
  return {
    // Transform server coordinates (-5 to +5) to client viewport coordinates
    serverToClient: (serverX: number, serverZ: number) => ({
      x: (serverX / FIELD_SIZE) * (viewportWidth / 2),
      z: (serverZ / FIELD_SIZE) * (viewportHeight / 2)
    }),
    
    // Transform client viewport coordinates to server coordinates (-5 to +5)
    clientToServer: (clientX: number, clientZ: number) => ({
      x: (clientX / (viewportWidth / 2)) * FIELD_SIZE,
      z: (clientZ / (viewportHeight / 2)) * FIELD_SIZE
    })
  };
}

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

export class ServerDiceManager {
  private roomId: string;
  private onStatesUpdate: (states: ServerDiceStates) => void;
  private initialized: boolean = false;
  private ws: WebSocket | null = null;
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private diceServerUrl: string = 'ws://localhost:1235';
  private diceApiUrl: string = 'http://localhost:1235';

  constructor(roomId: string, onStatesUpdate: (states: ServerDiceStates) => void) {
    this.roomId = roomId;
    this.onStatesUpdate = onStatesUpdate;
    this.initialized = true;
    
    // Automatically connect to dedicated dice server
    this.connectToDiceServer();
  }

  // Connect to dedicated dice physics server
  private connectToDiceServer() {
    try {
      const wsUrl = `${this.diceServerUrl}?room=${this.roomId}`;
      console.log(`[DEBUG] ServerDiceManager - Connecting to ${wsUrl}`);
      
      this.ws = new WebSocket(wsUrl);
      
      this.messageHandler = (event: MessageEvent) => {
        if (typeof event.data === 'string') {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'dice-states') {
              try {
                this.onStatesUpdate(message.data);
              } catch (updateError) {
                console.error(`[DEBUG] ServerDiceManager - Error in onStatesUpdate:`, updateError);
              }
            }
          } catch (parseError) {
            console.error(`[DEBUG] ServerDiceManager - Error parsing message:`, parseError);
          }
        }
      };
      
      this.ws.addEventListener('message', this.messageHandler);
      
      this.ws.addEventListener('open', () => {
        console.log(`[DEBUG] ServerDiceManager - Connected to dice server for room ${this.roomId}`);
      });
      
      this.ws.addEventListener('close', () => {
        console.log(`[DEBUG] ServerDiceManager - Connection closed for room ${this.roomId}`);
        // Attempt to reconnect after 2 seconds
        setTimeout(() => {
          if (this.initialized) {
            console.log(`[DEBUG] ServerDiceManager - Attempting to reconnect for room ${this.roomId}`);
            this.connectToDiceServer();
          }
        }, 2000);
      });
      
      this.ws.addEventListener('error', (error) => {
        console.error(`[DEBUG] ServerDiceManager - Dice server connection error:`, error);
      });
      
    } catch (error) {
      console.error('[DEBUG] ServerDiceManager - Failed to connect to dice server:', error);
    }
  }

  // Legacy method for compatibility - no longer needed but kept for existing code
  setupWebSocket() {
    // This method is now a no-op since we connect to dedicated dice server
  }

  // Clean up WebSocket connection
  cleanup() {
    if (this.ws && this.messageHandler) {
      this.ws.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }
    this.ws = null;
  }

  // Dice are automatically created by the server, no need for client-side addition

  // Move dice on server (kinematic mode)
  async moveDice(diceId: string, position: [number, number, number], isKinematic: boolean = true) {
    if (!this.initialized) return;

    try {
      await fetch(`${this.diceApiUrl}/api/dice/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: this.roomId, diceId, position, isKinematic })
      });
    } catch (error) {
      console.error('[ServerDiceManager] Failed to move dice:', error);
    }
  }

  // Throw dice on server
  async throwDice(diceId: string, velocity: [number, number, number], angularVelocity: [number, number, number]) {
    if (!this.initialized) {
      console.warn('[ServerDiceManager] Not initialized, cannot throw dice');
      return;
    }

    try {
      await fetch(`${this.diceApiUrl}/api/dice/throw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: this.roomId, diceId, velocity, angularVelocity })
      });
      
    } catch (error) {
      console.error('[ServerDiceManager] Failed to throw dice:', error);
    }
  }

  // Throw all dice with the same velocity and angular velocity
  async throwAllDice(velocity: [number, number, number], angularVelocity: [number, number, number]) {
    if (!this.initialized) {
      console.warn('[ServerDiceManager] Not initialized, cannot throw dice');
      return;
    }

    try {
      await fetch(`${this.diceApiUrl}/api/dice/throw-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: this.roomId, velocity, angularVelocity })
      });
      
    } catch (error) {
      console.error('[ServerDiceManager] Failed to throw all dice:', error);
    }
  }

  // Move all dice to maintain relative positions during dragging
  async moveAllDice(leadDiceId: string, leadPosition: [number, number, number], isKinematic: boolean = true) {
    if (!this.initialized) return;

    try {
      await fetch(`${this.diceApiUrl}/api/dice/move-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: this.roomId, leadDiceId, leadPosition, isKinematic })
      });
    } catch (error) {
      console.error('[ServerDiceManager] Failed to move all dice:', error);
    }
  }

  // Move multiple dice with specific positions
  async moveMultipleDice(dicePositions: Record<string, [number, number, number]>, isKinematic: boolean = true) {
    if (!this.initialized) return;

    try {
      await fetch(`${this.diceApiUrl}/api/dice/move-multiple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: this.roomId, dicePositions, isKinematic })
      });
    } catch (error) {
      console.error('[ServerDiceManager] Failed to move multiple dice:', error);
    }
  }


  // Check if connected and ready
  isReady(): boolean {
    return this.initialized;
  }

  // Cleanup
  disconnect() {
    this.cleanup();
    this.initialized = false;
  }
}