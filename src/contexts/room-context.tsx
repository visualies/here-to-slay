"use client";

import { createContext, ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import type { Player, Card, Room, Turn } from '../types';
import { isHost } from '../lib/players';
import { setupPlayerAwareness, updateCursor } from '../lib/presence';
import { createYjsObserver } from '../lib/game-state';
import { gameServerAPI } from '../lib/game-server-api';
import { updateLastActive } from '../lib/player-persistence';
import { wrapDocument, ReadOnlyYDoc } from '../lib/read-only-yjs';
import { createHeartbeatInterval, cleanupHeartbeat } from '../lib/presence';
import { useUser } from '../hooks/use-user';
import { env } from '../lib/env-validation';

export const RoomContext = createContext<Room | null>(null);

interface RoomProviderProps {
  roomId: string;
  children: ReactNode;
}

export function RoomProvider({ roomId, children }: RoomProviderProps) {
  const { user, loading } = useUser();

  // Yjs setup
  const docRef = useRef<ReadOnlyYDoc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const gameStateRef = useRef<Y.Map<unknown> | null>(null);
  const playersRef = useRef<Y.Map<Player> | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // React state
  const [players, setPlayers] = useState<Player[]>([]);
  const [phase, setPhase] = useState<string>('waiting');
  const [currentTurn, setCurrentTurn] = useState<string>('');
  const [currentTurnData, setCurrentTurnData] = useState<Turn | null>(null);
  const [supportStack, setSupportStack] = useState<Card[]>([]);
  const [monsters, setMonsters] = useState<Card[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize Yjs when roomId changes
  useEffect(() => {
    // Wait until user is bootstrapped from cookie (@me)
    if (loading || !user) {
      return;
    }
    const { playerId, playerName, playerColor } = user;
    // Clean up previous connection
    if (providerRef.current) {
      providerRef.current.disconnect();
    }

    // Automatically join room when RoomProvider mounts
    const joinRoom = async () => {
      try {
        const joinResult = await gameServerAPI.joinRoom(roomId, playerId, playerName, playerColor);
        if (!joinResult.success) {
          console.error('Failed to join room:', joinResult.message);
        }
      } catch (error) {
        console.error('Error joining room:', error);
      }
    };

    joinRoom();

    // Create Yjs doc and provider - let WebsocketProvider handle document sharing
    const originalDoc = new Y.Doc();

    // Get WebSocket URL from environment variables
    const { gameServerWsUrl } = env();
    const wsUrl = gameServerWsUrl;

    const provider = new WebsocketProvider(wsUrl, roomId, originalDoc);

    // Wrap document with read-only protection
    const doc = wrapDocument(originalDoc);

    // Get shared maps after provider is connected
    const gameState = doc.getMap('gameState');
    const playersMap = doc.getMap('players') as unknown as Y.Map<Player>;

    // Store refs
    docRef.current = doc;
    providerRef.current = provider;
    gameStateRef.current = gameState as unknown as Y.Map<unknown>;
    playersRef.current = playersMap;

    // Set up player presence for cursor tracking
    setupPlayerAwareness(provider, playerId, playerName, playerColor);

    // Set up heartbeat to keep player "active"
    const updatePresence = async () => {
      try {
        await gameServerAPI.updatePlayerPresence(roomId, playerId, playerName, playerColor);
      } catch (error) {
        console.warn('Failed to update player presence:', error);
      }
    };
    heartbeatRef.current = createHeartbeatInterval(playersMap, playerId, 15000, updatePresence);

    console.log(`🔌 Connected to room ${roomId} as ${playerName} (${playerId})`);
    console.log('Client is now read-only - all game state managed by server');

    // Connection status
    provider.on('status', (event: { status: string }) => {
      setIsConnected(event.status === 'connected');
    });

    // Cleanup function
    return () => {
      cleanupHeartbeat(heartbeatRef.current);
      provider.disconnect();
    };
  }, [roomId, user, loading]);
  
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
          setPhase(gameState.phase);
          setCurrentTurn(gameState.currentTurn);
          setCurrentTurnData(gameState.currentTurnData);
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

  // Actions - moved before conditional return to satisfy React hooks rules
  const handleInitializeGame = useCallback(async () => {
    if (loading || !user) return;

    const playerIsHost = isHost(players, user.playerId);
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
  }, [loading, user, players, roomId]);

  const handleAddPlayerToGame = useCallback(async (playerIdToAdd: string) => {
    if (loading || !user) return;

    const playerIsHost = isHost(players, user.playerId);
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
    }
  }, [loading, user, players, roomId]);

  const handleUpdateCursor = useCallback((x: number, y: number) => {
    updateCursor(providerRef.current, x, y);
  }, []);

  // Wait until user is bootstrapped before rendering component logic
  if (loading || !user) {
    return null;
  }

  const { playerId, playerName, playerColor } = user;

  // Derived state - all players are managed by server
  const currentPlayer = players.find(p => p.id === playerId) || null;
  const otherPlayers = players.filter(p => p.id !== playerId);

  // Check if current player is host (first to join)
  const playerIsHost = isHost(players, playerId);

  const roomData: Room = {
    // Room info
    roomId,
    
    // Yjs refs for read-only access if needed
    provider: providerRef.current,
    playersRef: playersRef.current,
    gameStateRef: gameStateRef.current,
    
    // Game state
    players,
    phase,
    currentTurn,
    currentTurnData,
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
    gameActions: {
      playCard: () => { console.warn('playCard not implemented'); },
      drawCard: () => { console.warn('drawCard not implemented'); },
      advanceTurn: () => { console.warn('advanceTurn not implemented'); },
    },
    
    // Connection state
    isConnected
  };
  
  return (
    <RoomContext.Provider value={roomData}>
      {children}
    </RoomContext.Provider>
  );
}

