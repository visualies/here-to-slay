"use client";

import { createContext, useContext, ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import type { Player, Card, Room, GameActions } from '../types';
import { isHost } from '../lib/players';
import { setupPlayerAwareness, updateCursor, createHeartbeatInterval, cleanupHeartbeat } from '../lib/presence';
import { createYjsObserver } from '../lib/game-state';
import { gameServerAPI } from '../lib/game-server-api';
import { canReclaimPlayerSlot, updateLastActive, getStoredPlayerData } from '../lib/player-persistence';
import { wrapDocument, ReadOnlyYDoc } from '../lib/read-only-yjs';

const RoomContext = createContext<Room | null>(null);

interface RoomProviderProps {
  roomId: string;
  playerId: string;
  playerName: string;
  playerColor: string;
  children: ReactNode;
}

export function RoomProvider({ roomId, playerId, playerName, playerColor, children }: RoomProviderProps) {
  // Yjs setup
  const docRef = useRef<ReadOnlyYDoc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const gameStateRef = useRef<Y.Map<unknown> | null>(null);
  const playersRef = useRef<Y.Map<Player> | null>(null);
  
  // React state
  const [players, setPlayers] = useState<Player[]>([]);
  const [gamePhase, setGamePhase] = useState<string>('waiting');
  const [currentTurn, setCurrentTurn] = useState<string>('');
  const [supportStack, setSupportStack] = useState<Card[]>([]);
  const [monsters, setMonsters] = useState<Card[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize Yjs when roomId changes
  useEffect(() => {
    // Clean up previous connection
    if (providerRef.current) {
      providerRef.current.disconnect();
    }

    // Create Yjs doc and provider - let WebsocketProvider handle document sharing
    const originalDoc = new Y.Doc();
    const wsUrl = `ws://192.168.178.61:1234`;
    const provider = new WebsocketProvider(wsUrl, roomId, originalDoc);

    // Wrap document with read-only protection
    const doc = wrapDocument(originalDoc);

    // Get shared maps after provider is connected
    const gameState = doc.getMap('gameState');
    const playersMap = doc.getMap('players') as Y.Map<Player>;

    // Store refs
    docRef.current = doc;
    providerRef.current = provider;
    gameStateRef.current = gameState;
    playersRef.current = playersMap;

    // Set up player presence for cursor tracking
    setupPlayerAwareness(provider, playerId, playerName, playerColor);

    console.log(`🔌 Connected to room ${roomId} as ${playerName} (${playerId})`);
    console.log('Client is now read-only - all game state managed by server');

    // Connection status
    provider.on('status', (event: { status: string }) => {
      setIsConnected(event.status === 'connected');
    });

    // Cleanup function
    return () => {
      provider.disconnect();
    };
  }, [roomId, playerId, playerName, playerColor]);
  
  // Subscribe to players and game state changes
  useEffect(() => {
    if (!playersRef.current || !gameStateRef.current || !providerRef.current) return;
    
    // Wait for WebSocket connection before setting up observer
    const setupObserver = () => {
      if (!playersRef.current || !gameStateRef.current) return;
      
      console.log(`📡 Setting up read-only state observer for room: ${roomId}`);
      const cleanup = createYjsObserver(
        playersRef.current,
        gameStateRef.current,
        (newPlayers, gameState) => {
          setPlayers(newPlayers);
          setGamePhase(gameState.gamePhase);
          setCurrentTurn(gameState.currentTurn);
          setSupportStack(gameState.supportStack);
          setMonsters(gameState.monsters || []);
        }
      );
      
      return cleanup;
    };
    
    let cleanup: (() => void) | undefined;
    
    if (providerRef.current.wsconnected) {
      cleanup = setupObserver();
    } else {
      const handleConnection = (event: { status: string }) => {
        if (event.status === 'connected') {
          cleanup = setupObserver();
        }
      };
      providerRef.current.on('status', handleConnection);
      
      return () => {
        providerRef.current?.off('status', handleConnection);
        cleanup?.();
      };
    }
    
    return cleanup;
  }, [roomId]);
  
  // Update localStorage to keep session fresh
  useEffect(() => {
    const storageUpdateInterval = setInterval(() => {
      updateLastActive(roomId);
    }, 30000);

    return () => {
      clearInterval(storageUpdateInterval);
    };
  }, [roomId]);
  
  // Derived state - all players are managed by server
  const currentPlayer = players.find(p => p.id === playerId) || null;
  const otherPlayers = players.filter(p => p.id !== playerId);
  
  // Check if current player is host (first to join)
  const playerIsHost = isHost(players, playerId);
  
  // Actions
  const handleInitializeGame = useCallback(async () => {
    if (!playerIsHost) {
      console.log('initializeGame: Not host');
      return;
    }

    try {
      const result = await gameServerAPI.startGame(roomId);
      if (result.success) {
        console.log('✅ Game started via API:', result.message);
      } else {
        console.error('❌ Failed to start game:', result.message);
      }
    } catch (error) {
      console.error('❌ Failed to start game via API:', error);
    }
  }, [playerIsHost, roomId]);

  const handleAddPlayerToGame = useCallback(async (playerIdToAdd: string) => {
    if (!playerIsHost) {
      console.log('addPlayerToGame: Not host');
      return;
    }

    try {
      const result = await gameServerAPI.addPlayerToGame(roomId, playerIdToAdd);
      if (result.success) {
        console.log('✅ Added player to game via API:', result.message);
      } else {
        console.error('❌ Failed to add player to game:', result.message);
      }
    } catch (error) {
      console.error('❌ Failed to add player to game via API:', error);
      // Fallback to direct mutation for now
      if (playersRef.current) {
        const { addPlayerToGame } = await import('../lib/game-actions');
        addPlayerToGame(playersRef.current, players, playerIdToAdd);
      }
    }
  }, [playerIsHost, roomId, players]);
  
  const handleUpdateCursor = useCallback((x: number, y: number) => {
    updateCursor(providerRef.current, x, y);
  }, []);

  const handleAdvanceTurn = useCallback(() => {
    // Turn advancement is now handled automatically by the server when action points reach 0
    // This function is kept for backward compatibility but does nothing
    console.log('advanceTurn: Turn advancement is now handled automatically by the server');
  }, []);

  const handlePlayCard = useCallback(async (cardId: string) => {
    try {
      const result = await gameServerAPI.playHeroToParty(roomId, playerId, cardId);
      if (result.success) {
        console.log('✅ Played card via API:', result.message);
      } else {
        console.error('❌ Failed to play card:', result.message);
      }
    } catch (error) {
      console.error('❌ Failed to play card via API:', error);
    }
  }, [playerId, roomId]);

  const handleDrawCard = useCallback(async () => {
    try {
      const result = await gameServerAPI.drawCard(roomId, playerId);
      if (result.success) {
        console.log('✅ Drew card via API:', result.message);
      } else {
        console.error('❌ Failed to draw card:', result.message);
      }
    } catch (error) {
      console.error('❌ Failed to draw card via API:', error);
    }
  }, [playerId, roomId]);

  const gameActions: GameActions = {
      playCard: handlePlayCard,
      drawCard: handleDrawCard,
      advanceTurn: handleAdvanceTurn,
  };

  const roomData: Room = {
    // Room info
    roomId,
    
    // Game state
    players,
    gamePhase,
    currentTurn,
    supportStack,
    monsters,
    
    // Player info
    currentPlayer,
    otherPlayers,
    isHost: playerIsHost,
    
    // Actions
    initializeGame: handleInitializeGame,
    addPlayerToGame: handleAddPlayerToGame,
    updateCursor: handleUpdateCursor,
    gameActions,
    
    // Connection state
    isConnected
  };
  
  return (
    <RoomContext.Provider value={roomData}>
      {children}
    </RoomContext.Provider>
  );
}

export function useRoom(): Room {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
}