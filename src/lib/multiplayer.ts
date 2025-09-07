"use client";

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { ServerDiceManager } from './server-dice';

import type { Player, DicePosition, MultiplayerRoom as Room } from '../types';

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

export async function joinRoom(roomId: string, playerId: string, playerName: string, playerColor: string): Promise<{ success: boolean; room: Room }> {
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

export async function getRoomInfo(roomId: string): Promise<Room> {
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
  public gameState: Y.Map<unknown>;
  public players: Y.Map<Player>;
  public dicePositions: Y.Map<DicePosition>;
  public awareness: import('y-websocket').WebsocketProvider['awareness'];
  private playerId: string;
  public roomId: string;
  private serverDiceManager: ServerDiceManager | null = null;
  public onWebSocketConnected?: () => void;
  public onWebSocketDisconnected?: () => void;
  
  constructor(roomId: string) {
    this.roomId = roomId;
    this.doc = new Y.Doc();
    this.playerId = this.generatePlayerId();
    
    // Initialize shared data structures
    this.gameState = this.doc.getMap('gameState');
    this.players = this.doc.getMap('players');
    this.dicePositions = this.doc.getMap('dicePositions');
    
    // Connect to WebSocket provider with room parameter
    const wsUrl = `ws://localhost:1234?room=${roomId}`;
    
    // Test server connectivity first
    fetch('http://localhost:1234/api/test')
      .catch(error => {
        console.error(`[DEBUG] MultiplayerGame - Server test failed:`, error);
      });
    
    this.provider = new WebsocketProvider(wsUrl, roomId, this.doc);
    this.awareness = this.provider.awareness;
    
    // Set up player presence
    this.setupPlayerPresence();
    
    // Handle connection events
    this.provider.on('status', (event: { status: string }) => {
      
      if (event.status === 'connected') {
        // Notify that WebSocket is connected
        this.onWebSocketConnected?.();
      } else if (event.status === 'disconnected') {
        // Notify that WebSocket is disconnected
        this.onWebSocketDisconnected?.();
      }
    });
    
    // Also listen for connection errors
    this.provider.on('connection-error', (event: Event) => {
      console.error(`[DEBUG] MultiplayerGame - WebSocket connection error:`, event);
    });
    
    this.provider.on('connection-close', (event: CloseEvent | null) => {
      console.log(`[DEBUG] MultiplayerGame - WebSocket connection closed:`, event);
    });
    
    // Set up dice manager immediately (it will connect to dedicated server)
    this.setupServerDiceManager();
  }
  
  private generatePlayerId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private setupServerDiceManager() {
    if (this.serverDiceManager) {
      return;
    }
    
    
    // Create a dice manager that connects to dedicated dice server
    this.serverDiceManager = new ServerDiceManager(this.roomId, () => {
      // Dice states are handled directly by the ServerDiceManager
    });
    
  }

  public getServerDiceManager(): ServerDiceManager | null {
    return this.serverDiceManager;
  }
  
  
  private setupPlayerPresence() {
    const playerColors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff'];
    const playerColor = playerColors[Math.floor(Math.random() * playerColors.length)];
    const joinTime = Date.now();
    
    // Setting up player presence
    
    // Set local user info
    this.awareness.setLocalStateField('user', {
      id: this.playerId,
      name: `Player ${this.playerId.slice(0, 4)}`,
      color: playerColor,
      lastSeen: joinTime
    });
    
    // Create initial player object with default game state
    const initialPlayer: Player = {
      id: this.playerId,
      name: `Player ${this.playerId.slice(0, 4)}`,
      color: playerColor,
      lastSeen: joinTime,
      joinTime: joinTime,
      position: 'bottom', // Will be updated when game starts
      hand: [],
      deck: [],
      party: {
        leader: null,
        heroes: [null, null, null, null, null, null]
      },
      actionPoints: 0
    };
    
    this.players.set(this.playerId, initialPlayer);
    
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
          lastSeen: Date.now(),
          // Keep original joinTime unchanged
          joinTime: currentPlayer.joinTime
        });
      }
    }, 5000);
  }
  
  
  // Update cursor position for presence
  updateCursor(x: number, y: number) {
    this.awareness.setLocalStateField('cursor', { x, y });
  }
  
  // Get all connected players
  getConnectedPlayers(): Player[] {
    const players: Player[] = [];
    this.players.forEach((player) => {
      // Consider player active if seen within last 30 seconds
      if (Date.now() - player.lastSeen < 30000) {
        players.push(player);
      }
    });
    return players;
  }
  
  
  // Subscribe to player changes
  onPlayersChange(callback: (players: Player[]) => void) {
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
    // Just disconnect, Yjs will handle presence automatically
    
    // Clean up server dice manager
    if (this.serverDiceManager) {
      this.serverDiceManager.disconnect();
      this.serverDiceManager = null;
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
    // Checking connected players
    
    // Sort by joinTime timestamp (earliest join = host)
    const sortedPlayers = players.sort((a, b) => a.joinTime - b.joinTime);
    const isCurrentHost = sortedPlayers.length > 0 && sortedPlayers[0].id === this.playerId;
    
    // Host determination complete
    
    return isCurrentHost;
  }

  // Dice position syncing methods
  updateDicePosition(diceId: string, position: DicePosition) {
    // Only the host controls dice positions
    const isHostPlayer = this.isHost();
    // Updating dice position
    if (isHostPlayer) {
      this.dicePositions.set(diceId, position);
      // Position updated
    } else {
      // Not host - position not updated
    }
  }

  getDicePosition(diceId: string): DicePosition | undefined {
    return this.dicePositions.get(diceId);
  }

  // Subscribe to dice position changes
  onDicePositionChange(callback: (positions: Map<string, DicePosition>) => void) {
    const observer = () => {
      const positions = new Map<string, DicePosition>();
      this.dicePositions.forEach((position, diceId) => {
        positions.set(diceId, position);
      });
      callback(positions);
    };

    this.dicePositions.observe(observer);
    
    // Return cleanup function
    return () => {
      this.dicePositions.unobserve(observer);
    };
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