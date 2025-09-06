"use client";

import { createContext, useContext, ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { ServerDiceManager } from '../lib/server-dice';
import { Player } from '../game/types';
import { createDeck, dealHand, createSupportStack } from '../game/deck';

export interface PlayerPresence {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  isActive: boolean;
  lastSeen: number;
  joinTime: number;
}

export interface RoomData {
  // Game state
  players: Player[];
  gamePhase: string;
  currentTurn: string;
  supportStack: any[];
  
  // Player info
  currentPlayer: Player | null;
  otherPlayers: Player[];
  isHost: boolean;
  
  // Connected players (presence)
  connectedPlayers: PlayerPresence[];
  connectedPlayersCount: number;
  
  // Actions
  initializeGame: () => void;
  updateCursor: (x: number, y: number) => void;
  
  // Connection state
  isConnected: boolean;
  
  // Server dice manager
  serverDiceManager: ServerDiceManager | null;
}

const RoomContext = createContext<RoomData | null>(null);

interface RoomProviderProps {
  roomId: string;
  children: ReactNode;
}

export function RoomProvider({ roomId, children }: RoomProviderProps) {
  // Yjs setup
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const gameStateRef = useRef<Y.Map<unknown> | null>(null);
  const playersRef = useRef<Y.Map<PlayerPresence> | null>(null);
  const playerIdRef = useRef<string>('');
  const serverDiceManagerRef = useRef<ServerDiceManager | null>(null);
  
  // React state
  const [players, setPlayers] = useState<Player[]>([]);
  const [gamePhase, setGamePhase] = useState<string>('waiting');
  const [currentTurn, setCurrentTurn] = useState<string>('');
  const [supportStack, setSupportStack] = useState<any[]>([]);
  const [connectedPlayers, setConnectedPlayers] = useState<PlayerPresence[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  // Generate player ID once
  if (!playerIdRef.current) {
    playerIdRef.current = Math.random().toString(36).substr(2, 9);
  }

  // Initialize Yjs when roomId changes
  useEffect(() => {
    // Clean up previous connection
    if (providerRef.current) {
      providerRef.current.disconnect();
    }
    if (serverDiceManagerRef.current) {
      serverDiceManagerRef.current.disconnect();
    }
    
    // Create new Yjs doc and provider
    const doc = new Y.Doc();
    const gameState = doc.getMap('gameState');
    const playersMap = doc.getMap('players');
    
    const wsUrl = `ws://localhost:1234?room=${roomId}`;
    const provider = new WebsocketProvider(wsUrl, roomId, doc);
    const awareness = provider.awareness;
    
    // Store refs
    docRef.current = doc;
    providerRef.current = provider;
    gameStateRef.current = gameState;
    playersRef.current = playersMap;
    
    // Set up player presence
    const playerColors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff'];
    const playerColor = playerColors[Math.floor(Math.random() * playerColors.length)];
    const joinTime = Date.now();
    
    awareness.setLocalStateField('user', {
      id: playerIdRef.current,
      name: `Player ${playerIdRef.current.slice(0, 4)}`,
      color: playerColor,
      isActive: true,
      lastSeen: joinTime
    });
    
    playersMap.set(playerIdRef.current, {
      id: playerIdRef.current,
      name: `Player ${playerIdRef.current.slice(0, 4)}`,
      color: playerColor,
      isActive: true,
      lastSeen: joinTime,
      joinTime: joinTime
    });
    
    // Connection status
    provider.on('status', (event: { status: string }) => {
      setIsConnected(event.status === 'connected');
    });
    
    // Set up dice manager
    const diceManager = new ServerDiceManager(roomId, () => {});
    serverDiceManagerRef.current = diceManager;
    
    // Cleanup function
    return () => {
      if (playersMap.has(playerIdRef.current)) {
        const currentPlayer = playersMap.get(playerIdRef.current);
        if (currentPlayer) {
          playersMap.set(playerIdRef.current, {
            ...currentPlayer,
            isActive: false,
            lastSeen: Date.now()
          });
        }
      }
      
      provider.disconnect();
      if (serverDiceManagerRef.current) {
        serverDiceManagerRef.current.disconnect();
      }
    };
  }, [roomId]);
  
  // Subscribe to game state changes
  useEffect(() => {
    if (!gameStateRef.current) return;
    
    const observer = () => {
      const newPlayers: Player[] = [];
      let newPhase = 'waiting';
      let newCurrentTurn = '';
      let newSupportStack: any[] = [];
      
      gameStateRef.current?.forEach((value, key) => {
        if (key === 'phase') {
          newPhase = value as string;
        } else if (key === 'currentTurn') {
          newCurrentTurn = value as string;
        } else if (key === 'supportStack') {
          newSupportStack = value as any[];
        } else if (typeof value === 'object' && value !== null) {
          // This is a player
          newPlayers.push(value as Player);
        }
      });
      
      setPlayers(newPlayers);
      setGamePhase(newPhase);
      setCurrentTurn(newCurrentTurn);
      setSupportStack(newSupportStack);
    };
    
    gameStateRef.current.observe(observer);
    
    // Initial call
    observer();
    
    return () => {
      gameStateRef.current?.unobserve(observer);
    };
  }, [roomId]);
  
  // Subscribe to connected players changes
  useEffect(() => {
    if (!playersRef.current) return;
    
    const observer = () => {
      const activePlayers: PlayerPresence[] = [];
      playersRef.current?.forEach((player) => {
        if (Date.now() - player.lastSeen < 30000) {
          activePlayers.push(player);
        }
      });
      setConnectedPlayers(activePlayers);
    };
    
    playersRef.current.observe(observer);
    
    // Initial call
    observer();
    
    // Heartbeat
    const heartbeat = setInterval(() => {
      if (playersRef.current?.has(playerIdRef.current)) {
        const currentPlayer = playersRef.current.get(playerIdRef.current);
        if (currentPlayer) {
          playersRef.current.set(playerIdRef.current, {
            ...currentPlayer,
            lastSeen: Date.now()
          });
        }
      }
    }, 5000);
    
    return () => {
      playersRef.current?.unobserve(observer);
      clearInterval(heartbeat);
    };
  }, [roomId]);
  
  // Derived state
  const currentPlayer = players.find(p => p.id === playerIdRef.current) || null;
  const otherPlayers = players.filter(p => p.id !== playerIdRef.current);
  const connectedPlayersCount = connectedPlayers.length;
  
  // Check if current player is host (first to join)
  const isHost = connectedPlayers.length > 0 && 
    connectedPlayers.sort((a, b) => a.joinTime - b.joinTime)[0]?.id === playerIdRef.current;
  
  // Actions
  const initializeGame = useCallback(() => {
    if (!isHost || !gameStateRef.current) {
      console.log('initializeGame: Not host or no gameState', { isHost, hasGameState: !!gameStateRef.current });
      return;
    }
    
    if (connectedPlayers.length < 1) {
      console.log('initializeGame: Not enough players', { connectedPlayers: connectedPlayers.length });
      return;
    }
    
    console.log('initializeGame: Starting game with', connectedPlayers.length, 'players');
    
    // Create and shuffle deck
    const deck = createDeck();
    let remainingDeck = [...deck];
    
    // Assign positions
    const positions = ['bottom', 'right', 'top', 'left'] as const;
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
      
      console.log('initializeGame: Adding player to game', gamePlayer.name, gamePlayer.position);
      gameStateRef.current?.set(player.id, gamePlayer);
    });
    
    // Set game metadata
    gameStateRef.current.set('currentTurn', sortedPlayers[0].id);
    gameStateRef.current.set('supportStack', createSupportStack());
    gameStateRef.current.set('phase', 'playing');
    
    console.log('initializeGame: Game initialized successfully');
  }, [isHost, connectedPlayers]);
  
  const updateCursor = useCallback((x: number, y: number) => {
    if (providerRef.current?.awareness) {
      providerRef.current.awareness.setLocalStateField('cursor', { x, y });
    }
  }, []);

  const roomData: RoomData = {
    // Game state
    players,
    gamePhase,
    currentTurn,
    supportStack,
    
    // Player info
    currentPlayer,
    otherPlayers,
    isHost,
    
    // Connected players
    connectedPlayers,
    connectedPlayersCount,
    
    // Actions
    initializeGame,
    updateCursor,
    
    // Connection state
    isConnected,
    
    // Server dice manager
    serverDiceManager: serverDiceManagerRef.current
  };
  
  return (
    <RoomContext.Provider value={roomData}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom(): RoomData {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
}