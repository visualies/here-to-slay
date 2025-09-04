"use client";

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

// Game state types
export interface DiceState {
  position: [number, number, number];
  velocity: [number, number, number];
  angularVelocity: [number, number, number];
  result: number;
  isStable: boolean;
  timestamp: number;
}

export interface PlayerPresence {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  isActive: boolean;
  lastSeen: number;
}

export interface Room {
  roomId: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
}

// Room API functions
export async function createRoom(name: string = 'Here to Slay Game'): Promise<Room> {
  const response = await fetch('http://localhost:1234/api/create-room', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create room');
  }
  
  return await response.json();
}

export async function joinRoom(roomId: string, playerId: string, playerName: string, playerColor: string): Promise<{ success: boolean; room: any }> {
  const response = await fetch('http://localhost:1234/api/join-room', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, playerId, playerName, playerColor })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to join room');
  }
  
  return await response.json();
}

export async function getRoomInfo(roomId: string): Promise<any> {
  const response = await fetch(`http://localhost:1234/api/room-info?id=${roomId}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get room info');
  }
  
  return await response.json();
}

export class MultiplayerGame {
  public doc: Y.Doc;
  public provider: WebsocketProvider;
  public gameState: Y.Map<any>;
  public diceState: Y.Array<DiceState>;
  public players: Y.Map<PlayerPresence>;
  public awareness: any;
  private playerId: string;
  public roomId: string;
  
  constructor(roomId: string) {
    this.roomId = roomId;
    this.doc = new Y.Doc();
    this.playerId = this.generatePlayerId();
    
    // Initialize shared data structures
    this.gameState = this.doc.getMap('gameState');
    this.diceState = this.doc.getArray('diceState');
    this.players = this.doc.getMap('players');
    
    // Connect to WebSocket provider with room parameter
    this.provider = new WebsocketProvider(`ws://localhost:1234?room=${roomId}`, roomId, this.doc);
    this.awareness = this.provider.awareness;
    
    // Initialize dice state if empty
    if (this.diceState.length === 0) {
      this.initializeDiceState();
    }
    
    // Set up player presence
    this.setupPlayerPresence();
    
    // Handle connection events
    this.provider.on('status', (event: any) => {
      console.log('WebSocket status:', event.status);
    });
  }
  
  private generatePlayerId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
  
  private initializeDiceState() {
    const initialDice: DiceState[] = [
      {
        position: [-0.6, 2, 0],
        velocity: [0, 0, 0],
        angularVelocity: [0, 0, 0],
        result: 1,
        isStable: true,
        timestamp: Date.now()
      },
      {
        position: [0.6, 2, 0],
        velocity: [0, 0, 0],
        angularVelocity: [0, 0, 0],
        result: 1,
        isStable: true,
        timestamp: Date.now()
      }
    ];
    
    initialDice.forEach(dice => this.diceState.push([dice]));
  }
  
  private setupPlayerPresence() {
    const playerColors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff'];
    const playerColor = playerColors[Math.floor(Math.random() * playerColors.length)];
    
    // Set local user info
    this.awareness.setLocalStateField('user', {
      id: this.playerId,
      name: `Player ${this.playerId.slice(0, 4)}`,
      color: playerColor,
      isActive: true,
      lastSeen: Date.now()
    });
    
    // Update player presence in shared map
    this.players.set(this.playerId, {
      id: this.playerId,
      name: `Player ${this.playerId.slice(0, 4)}`,
      color: playerColor,
      isActive: true,
      lastSeen: Date.now()
    });
    
    // Clean up on disconnect
    window.addEventListener('beforeunload', () => {
      this.disconnect();
    });
    
    // Heartbeat to maintain presence
    setInterval(() => {
      const currentPlayer = this.players.get(this.playerId);
      if (currentPlayer) {
        this.players.set(this.playerId, {
          ...currentPlayer,
          lastSeen: Date.now()
        });
      }
    }, 5000);
  }
  
  // Update dice state (called when local dice changes)
  updateDiceState(diceIndex: number, newState: Partial<DiceState>) {
    // Ensure we have a valid dice entry at this index
    while (this.diceState.length <= diceIndex) {
      this.diceState.push([{
        position: [0, 2, 0],
        velocity: [0, 0, 0],
        angularVelocity: [0, 0, 0],
        result: 1,
        isStable: true,
        timestamp: Date.now()
      }]);
    }
    
    const currentDice = this.diceState.get(diceIndex) as unknown as DiceState[] | undefined;
    if (currentDice && currentDice[0]) {
      const updatedDice = {
        ...currentDice[0],
        ...newState,
        timestamp: Date.now()
      };
      this.diceState.delete(diceIndex, 1);
      this.diceState.insert(diceIndex, [updatedDice]);
    } else {
      // Create new dice state if it doesn't exist
      const newDice: DiceState = {
        position: [0, 2, 0],
        velocity: [0, 0, 0],
        angularVelocity: [0, 0, 0],
        result: 1,
        isStable: true,
        timestamp: Date.now(),
        ...newState
      };
      this.diceState.delete(diceIndex, 1);
      this.diceState.insert(diceIndex, [newDice]);
    }
  }
  
  // Get current dice state
  getDiceState(diceIndex: number): DiceState | null {
    const dice = this.diceState.get(diceIndex) as unknown as DiceState[] | undefined;
    return dice ? dice[0] : null;
  }
  
  // Update cursor position for presence
  updateCursor(x: number, y: number) {
    this.awareness.setLocalStateField('cursor', { x, y });
  }
  
  // Get all connected players
  getConnectedPlayers(): PlayerPresence[] {
    const players: PlayerPresence[] = [];
    this.players.forEach((player) => {
      // Consider player active if seen within last 30 seconds
      const isActive = Date.now() - player.lastSeen < 30000;
      if (isActive) {
        players.push(player);
      }
    });
    return players;
  }
  
  // Subscribe to dice state changes
  onDiceStateChange(callback: (diceIndex: number, diceState: DiceState) => void) {
    const observer = (event: any) => {
      event.changes.delta.forEach((change: any, index: number) => {
        if (change.insert && Array.isArray(change.insert)) {
          change.insert.forEach((dice: DiceState, i: number) => {
            callback(index + i, dice);
          });
        }
      });
    };
    
    this.diceState.observe(observer);
    
    // Return cleanup function
    return () => {
      this.diceState.unobserve(observer);
    };
  }
  
  // Subscribe to player changes
  onPlayersChange(callback: (players: PlayerPresence[]) => void) {
    const playersObserver = () => {
      callback(this.getConnectedPlayers());
    };
    
    const awarenessObserver = () => {
      callback(this.getConnectedPlayers());
    };
    
    this.players.observe(playersObserver);
    this.awareness.on('change', awarenessObserver);
    
    // Return cleanup function
    return () => {
      this.players.unobserve(playersObserver);
      this.awareness.off('change', awarenessObserver);
    };
  }
  
  // Clean disconnect
  disconnect() {
    const currentPlayer = this.players.get(this.playerId);
    if (currentPlayer) {
      this.players.set(this.playerId, {
        ...currentPlayer,
        isActive: false,
        lastSeen: Date.now()
      });
    }
    this.provider.disconnect();
  }
  
  // Get current player ID
  getCurrentPlayerId(): string {
    return this.playerId;
  }
  
  // Check if current player is the "host" (first player)
  isHost(): boolean {
    const players = this.getConnectedPlayers();
    const sortedPlayers = players.sort((a, b) => a.lastSeen - b.lastSeen);
    return sortedPlayers.length > 0 && sortedPlayers[0].id === this.playerId;
  }
}

// Global multiplayer instance management
let multiplayerGame: MultiplayerGame | null = null;
let currentRoomId: string | null = null;

export function getMultiplayerGame(roomId: string): MultiplayerGame {
  // If we have a different room, disconnect and create new instance
  if (multiplayerGame && currentRoomId !== roomId) {
    multiplayerGame.disconnect();
    multiplayerGame = null;
  }
  
  if (!multiplayerGame) {
    multiplayerGame = new MultiplayerGame(roomId);
    currentRoomId = roomId;
  }
  return multiplayerGame;
}

export function disconnectMultiplayer() {
  if (multiplayerGame) {
    multiplayerGame.disconnect();
    multiplayerGame = null;
    currentRoomId = null;
  }
}

export function getCurrentRoom(): string | null {
  return currentRoomId;
}