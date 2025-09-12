"use client";

import { createContext, useContext, ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import type { Player, Card, Room, GameActions } from '../types';
import { addPlayerToRoom, isHost } from '../lib/players';
import { setupPlayerAwareness, updateCursor, createHeartbeatInterval, cleanupHeartbeat } from '../lib/presence';
import { createYjsObserver } from '../lib/game-state';
import { playCard, drawCard, advanceTurn, initializeGame, addPlayerToGame } from '../lib/game-actions';

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
  const docRef = useRef<Y.Doc | null>(null);
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
    
    // Create new Yjs doc and provider
    const doc = new Y.Doc();
    const gameState = doc.getMap('gameState');
    const playersMap = doc.getMap('players') as Y.Map<Player>;
    
    const wsUrl = `ws://localhost:1234?room=${roomId}`;
    const provider = new WebsocketProvider(wsUrl, roomId, doc);
    
    // Store refs
    docRef.current = doc;
    providerRef.current = provider;
    gameStateRef.current = gameState;
    playersRef.current = playersMap;
    
    // Set up player presence
    setupPlayerAwareness(provider, playerId, playerName, playerColor);
    
    console.log('=== ADDING PLAYER TO ROOM ===');
    console.log('Room ID:', roomId);
    console.log('Player ID:', playerId);
    console.log('Player Name:', playerName);
    console.log('Current players in map before adding:', playersMap.size);
    
    // Add player to room
    addPlayerToRoom(playersMap, playerId, playerName, playerColor);
    
    console.log('Players in map after adding:', playersMap.size);
    
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
    if (!playersRef.current || !gameStateRef.current) return;
    
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
  }, [roomId]);
  
  // Heartbeat for player presence
  useEffect(() => {
    const heartbeat = createHeartbeatInterval(playersRef.current, playerId);
    return () => cleanupHeartbeat(heartbeat);
  }, [playerId]);
  
  // Derived state
  const currentPlayer = players.find(p => p.id === playerId) || null;
  const otherPlayers = players.filter(p => p.id !== playerId);
  const connectedPlayersCount = players.filter(p => Date.now() - p.lastSeen < 30000).length;
  
  // Check if current player is host (first to join)
  const playerIsHost = isHost(players, playerId);
  
  // Actions
  const handleInitializeGame = useCallback(() => {
    if (!playerIsHost || !gameStateRef.current || !playersRef.current) {
      console.log('initializeGame: Not host or missing refs', { playerIsHost, hasGameState: !!gameStateRef.current, hasPlayersMap: !!playersRef.current });
      return;
    }
    
    initializeGame(playersRef.current, gameStateRef.current, players);
  }, [playerIsHost, players]);

  const handleAddPlayerToGame = useCallback((playerIdToAdd: string) => {
    if (!playerIsHost || !playersRef.current) {
      console.log('addPlayerToGame: Not host or no players map');
      return;
    }

    addPlayerToGame(playersRef.current, players, playerIdToAdd);
  }, [playerIsHost, players]);
  
  const handleUpdateCursor = useCallback((x: number, y: number) => {
    updateCursor(providerRef.current, x, y);
  }, []);

  const handleAdvanceTurn = useCallback(() => {
    if (!gameStateRef.current || !playersRef.current) {
      console.log('advanceTurn: No gameState or playersMap, returning');
      return;
    }
    
    advanceTurn(playersRef.current, gameStateRef.current, players, currentTurn, roomId);
  }, [players, currentTurn, roomId]);

  const handlePlayCard = useCallback((cardId: string) => {
      if (!playersRef.current) return;
      
      playCard(playersRef.current, players, playerId, cardId, handleAdvanceTurn);
  }, [playersRef.current, players, playerId, handleAdvanceTurn]);

  const handleDrawCard = useCallback(() => {
      if (!playersRef.current || !gameStateRef.current) return;
      
      drawCard(playersRef.current, gameStateRef.current, playerId, handleAdvanceTurn);
  }, [playersRef.current, gameStateRef.current, playerId, handleAdvanceTurn]);

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