"use client";

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { ServerDiceManager } from './server-dice';
import { Player, GameState } from '../game/types';
import { createDeck, dealHand, createSupportStack } from '../game/deck';

// Game state types

export interface PlayerPresence {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  isActive: boolean;
  lastSeen: number;
  joinTime: number;
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

export class Room {
  public doc: Y.Doc;
  public provider: WebsocketProvider;
  public gameState: Y.Map<unknown>;
  public players: Y.Map<PlayerPresence>;
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
    
    // Connect to WebSocket provider with room parameter
    const wsUrl = `ws://localhost:1234?room=${roomId}`;
    
    // Test server connectivity first
    fetch('http://localhost:1234/api/test')
      .catch(error => {
        console.error(`[DEBUG] MultiplayerGame - Server test failed:`, error);
      });
    
    this.provider = new WebsocketProvider(wsUrl, roomId, this.doc);
    this.awareness = this.provider.awareness;
    
    // Player presence will be set up when explicitly joining with player data
    
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
  
  
  public joinWithPlayerData(playerId: string, playerName: string, playerColor: string) {
    // Update the player ID to match the one from room manager
    this.playerId = playerId;
    
    const joinTime = Date.now();
    
    // Set local user info
    this.awareness.setLocalStateField('user', {
      id: this.playerId,
      name: playerName,
      color: playerColor,
      isActive: true,
      lastSeen: joinTime
    });
    
    // Update player presence in shared map with consistent timestamp
    this.players.set(this.playerId, {
      id: this.playerId,
      name: playerName,
      color: playerColor,
      isActive: true,
      lastSeen: joinTime,
      joinTime: joinTime
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
          lastSeen: Date.now(),
          // Keep original joinTime unchanged
          joinTime: currentPlayer.joinTime
        });
      }
    }, 5000);
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
      isActive: true,
      lastSeen: joinTime
    });
    
    // Update player presence in shared map with consistent timestamp
    this.players.set(this.playerId, {
      id: this.playerId,
      name: `Player ${this.playerId.slice(0, 4)}`,
      color: playerColor,
      isActive: true,
      lastSeen: joinTime,
      joinTime: joinTime
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
        lastSeen: Date.now(),
        joinTime: currentPlayer.joinTime
      });
    }
    
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

  // Initialize game with current connected players (host only)
  initializeGame(): void {
    if (!this.isHost()) {
      console.log('Only host can initialize game');
      return;
    }

    const connectedPlayers = this.getConnectedPlayers();
    if (connectedPlayers.length < 1) {
      console.log('Need at least 1 player to start game');
      return;
    }

    // Create and shuffle deck
    const deck = createDeck();
    let remainingDeck = [...deck];

    // Assign positions to players (bottom for host, then right, top, left)
    const positions = ['bottom', 'right', 'top', 'left'] as const;
    
    // Sort players by join time to ensure consistent positioning
    const sortedPlayers = connectedPlayers.sort((a, b) => a.joinTime - b.joinTime);

    sortedPlayers.forEach((player, index) => {
      const { hand, remainingDeck: newDeck } = dealHand(remainingDeck, 5);
      remainingDeck = newDeck;
      
      const { hand: playerDeck, remainingDeck: finalDeck } = dealHand(remainingDeck, 10);
      remainingDeck = finalDeck;

      const gamePlayer: Player = {
        id: player.id,
        name: player.name,
        color: player.color,
        position: positions[index % 4] || 'bottom',
        hand,
        deck: playerDeck,
        isActive: true
      };

      // Store each player in the Yjs gameState map
      this.gameState.set(player.id, gamePlayer);
    });

    // Set game metadata
    this.gameState.set('currentTurn', sortedPlayers[0].id);
    this.gameState.set('supportStack', createSupportStack());
    this.gameState.set('phase', 'playing');
    
    console.log('Game initialized with', sortedPlayers.length, 'players');
  }

  // Get current game players from Yjs state
  getGamePlayers(): Player[] {
    const players: Player[] = [];
    this.gameState.forEach((value, key) => {
      // Skip metadata keys
      if (key !== 'currentTurn' && key !== 'supportStack' && key !== 'phase' && typeof value === 'object' && value !== null) {
        players.push(value as Player);
      }
    });
    return players;
  }

  // Get game metadata
  getGamePhase(): string {
    return this.gameState.get('phase') as string || 'waiting';
  }

  getCurrentTurn(): string {
    return this.gameState.get('currentTurn') as string || '';
  }

  getSupportStack(): any[] {
    return this.gameState.get('supportStack') as any[] || [];
  }

  // Get current player's data
  getCurrentPlayer(): Player | null {
    return this.gameState.get(this.playerId) as Player || null;
  }

  // Get other players (excluding current player)
  getOtherPlayers(): Player[] {
    const allPlayers = this.getGamePlayers();
    return allPlayers.filter(p => p.id !== this.playerId);
  }

  // Subscribe to game state changes
  onGameStateChange(callback: (players: Player[], phase: string, currentTurn: string) => void) {
    const observer = () => {
      const players = this.getGamePlayers();
      const phase = this.getGamePhase();
      const currentTurn = this.getCurrentTurn();
      callback(players, phase, currentTurn);
    };

    this.gameState.observe(observer);
    
    // Return cleanup function
    return () => {
      this.gameState.unobserve(observer);
    };
  }

}

// Global room instance management
let currentRoom: Room | null = null;
let currentRoomId: string | null = null;

export function getRoom(roomId: string): Room {
  // If we have a different room, disconnect and create new instance
  if (currentRoom && currentRoomId !== roomId) {
    currentRoom.disconnect();
    currentRoom = null;
  }
  
  if (!currentRoom) {
    currentRoom = new Room(roomId);
    currentRoomId = roomId;
  }
  return currentRoom;
}

export function disconnectRoom() {
  if (currentRoom) {
    currentRoom.disconnect();
    currentRoom = null;
    currentRoomId = null;
  }
}

export function getCurrentRoom(): string | null {
  return currentRoomId;
}