"use client";

import { createContext, useContext, ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { ServerDiceManager } from '../lib/server-dice';
import { Player, Card, CardType } from '../game/types';
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

export interface GameActions {
  playCard: (cardId: string) => void;
  drawCard: () => void;
  advanceTurn: () => void;
}

export interface RoomData {
  // Game state
  players: Player[];
  gamePhase: string;
  currentTurn: string;
  supportStack: Card[];
  
  // Player info
  currentPlayer: Player | null;
  otherPlayers: Player[];
  isHost: boolean;
  
  // Connected players (presence)
  connectedPlayers: PlayerPresence[];
  connectedPlayersCount: number;
  
  // Actions
  initializeGame: () => void;
  addPlayerToGame: (playerId: string) => void;
  updateCursor: (x: number, y: number) => void;
  gameActions: GameActions;
  
  // Connection state
  isConnected: boolean;
  
  // Server dice manager
  serverDiceManager: ServerDiceManager | null;
}

const RoomContext = createContext<RoomData | null>(null);

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
  const playersRef = useRef<Y.Map<PlayerPresence> | null>(null);
  const playerIdRef = useRef<string>('');
  const serverDiceManagerRef = useRef<ServerDiceManager | null>(null);
  
  // React state
  const [players, setPlayers] = useState<Player[]>([]);
  const [gamePhase, setGamePhase] = useState<string>('waiting');
  const [currentTurn, setCurrentTurn] = useState<string>('');
  const [supportStack, setSupportStack] = useState<Card[]>([]);
  const [connectedPlayers, setConnectedPlayers] = useState<PlayerPresence[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  // Use provided player ID
  playerIdRef.current = playerId;

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
    
    // Set up player presence with provided data
    const joinTime = Date.now();
    
    awareness.setLocalStateField('user', {
      id: playerIdRef.current,
      name: playerName,
      color: playerColor,
      isActive: true,
      lastSeen: joinTime
    });
    
    playersMap.set(playerIdRef.current, {
      id: playerIdRef.current,
      name: playerName,
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
  }, [roomId, playerId, playerName, playerColor]);
  
  // Subscribe to game state changes
  useEffect(() => {
    if (!gameStateRef.current) return;
    
    const observer = () => {
      const newPlayers: Player[] = [];
      let newPhase = 'waiting';
      let newCurrentTurn = '';
      let newSupportStack: Card[] = [];
      
      gameStateRef.current?.forEach((value, key) => {
        if (key === 'phase') {
          newPhase = value as string;
        } else if (key === 'currentTurn') {
          newCurrentTurn = value as string;
        } else if (key === 'supportStack') {
          newSupportStack = value as Card[];
        } else if (typeof value === 'object' && value !== null && 'hand' in value && 'position' in value) {
          // This is a player - check for required Player fields
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
    console.log('Created deck with', deck.length, 'cards');
    let remainingDeck = [...deck];
    
    // Assign positions
    const positions = ['bottom', 'right', 'top', 'left'] as const;
    const sortedPlayers = connectedPlayers.sort((a, b) => a.joinTime - b.joinTime);
    
    sortedPlayers.forEach((player, index) => {
      const { hand, remainingDeck: newDeck } = dealHand(remainingDeck, 5);
      remainingDeck = newDeck;
      console.log('Dealt hand to', player.name, ':', hand.length, 'cards');
      
      const { hand: playerDeck, remainingDeck: finalDeck } = dealHand(remainingDeck, 10);
      remainingDeck = finalDeck;
      console.log('Dealt deck to', player.name, ':', playerDeck.length, 'cards');
      
      const gamePlayer: Player = {
        id: player.id,
        name: player.name,
        color: player.color,
        position: positions[index % 4] || 'bottom',
        hand,
        deck: playerDeck,
        party: { leader: null, heroes: [null, null, null, null, null, null] },
        actionPoints: 0,
        isActive: true
      };
      
      console.log('initializeGame: Adding player to game', gamePlayer.name, gamePlayer.position);
      gameStateRef.current?.set(player.id, gamePlayer);
    });
    
    // Set game metadata
    const firstPlayerId = sortedPlayers[0].id;
    const firstPlayer = gameStateRef.current?.get(firstPlayerId) as Player;
    if (firstPlayer) {
        gameStateRef.current?.set(firstPlayerId, { ...firstPlayer, actionPoints: 3 });
    }
    gameStateRef.current.set('currentTurn', firstPlayerId);
    gameStateRef.current.set('supportStack', createSupportStack());
    gameStateRef.current.set('phase', 'playing');
    
    console.log('initializeGame: Game initialized successfully');
  }, [isHost, connectedPlayers]);

  const addPlayerToGame = useCallback((playerId: string) => {
    if (!isHost || !gameStateRef.current) {
      console.log('addPlayerToGame: Not host or no gameState');
      return;
    }

    if (gameStateRef.current.has(playerId)) {
      console.log('addPlayerToGame: Player already exists in game');
      return;
    }

    const playerPresence = connectedPlayers.find(p => p.id === playerId);
    if (!playerPresence) {
      console.log('addPlayerToGame: Player not found in connected players');
      return;
    }

    const deck = createDeck();
    const { hand } = dealHand(deck, 5);
    const { hand: playerDeck } = dealHand(deck.slice(5), 10);

    const occupiedPositions = new Set();
    gameStateRef.current.forEach((value, key) => {
      if (typeof value === 'object' && value !== null && 'position' in value) {
        occupiedPositions.add((value as Player).position);
      }
    });

    const availablePositions = ['right', 'top', 'left'].filter(pos => !occupiedPositions.has(pos));
    const assignedPosition = availablePositions[0] || 'right';

    const gamePlayer: Player = {
      id: playerPresence.id,
      name: playerPresence.name,
      color: playerPresence.color,
      position: assignedPosition as 'top' | 'right' | 'bottom' | 'left',
      hand,
      deck: playerDeck,
      party: { leader: null, heroes: [null, null, null, null, null, null] },
      actionPoints: 0,
      isActive: true
    };

    console.log('addPlayerToGame: Adding player to existing game', gamePlayer.name, gamePlayer.position);
    gameStateRef.current.set(playerId, gamePlayer);
  }, [isHost, connectedPlayers]);
  
  const updateCursor = useCallback((x: number, y: number) => {
    if (providerRef.current?.awareness) {
      providerRef.current.awareness.setLocalStateField('cursor', { x, y });
    }
  }, []);

  const advanceTurn = useCallback(() => {
    console.log('advanceTurn called - isHost:', isHost, 'hasGameState:', !!gameStateRef.current);
    if (!isHost || !gameStateRef.current) return;
    
    const currentPlayerIndex = players.findIndex(p => p.id === currentTurn);
    const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
    const nextPlayer = players[nextPlayerIndex];
    
    console.log('Turn advance:', {
      currentPlayerIndex,
      nextPlayerIndex,
      currentPlayerId: currentTurn,
      nextPlayerId: nextPlayer?.id,
      totalPlayers: players.length
    });
    
    const currentPlayerFromState = players[currentPlayerIndex];
    if (currentPlayerFromState) {
        gameStateRef.current?.set(currentPlayerFromState.id, { ...currentPlayerFromState, actionPoints: 0 });
    }

    if (nextPlayer) {
        gameStateRef.current?.set(nextPlayer.id, { ...nextPlayer, actionPoints: 3 });
        gameStateRef.current?.set('currentTurn', nextPlayer.id);
        console.log('Turn advanced to:', nextPlayer.name);
    }
  }, [isHost, players, currentTurn]);

  const playCard = useCallback((cardId: string) => {
      if (!currentPlayer || currentPlayer.actionPoints <= 0) return;

      const cardIndex = currentPlayer.hand.findIndex(c => c.id === cardId);
      if (cardIndex === -1) return;

      const card = currentPlayer.hand[cardIndex];
      if (card.type !== CardType.Hero) return;

      const partySlotIndex = currentPlayer.party.heroes.findIndex(h => h === null);
      if (partySlotIndex === -1) return;

      const newHand = [...currentPlayer.hand];
      newHand.splice(cardIndex, 1);

      const newPartyHeroes = [...currentPlayer.party.heroes];
      newPartyHeroes[partySlotIndex] = card;

      const updatedPlayer: Player = {
          ...currentPlayer,
          hand: newHand,
          party: { ...currentPlayer.party, heroes: newPartyHeroes },
          actionPoints: currentPlayer.actionPoints - 1,
      };

      gameStateRef.current?.set(currentPlayer.id, updatedPlayer);

      console.log('Card played - remaining action points:', updatedPlayer.actionPoints);
      if (updatedPlayer.actionPoints === 0) {
          console.log('No action points left, advancing turn...');
          advanceTurn();
      }
  }, [currentPlayer, advanceTurn]);

  const drawCard = useCallback(() => {
      if (!currentPlayer || currentPlayer.actionPoints <= 0 || !gameStateRef.current) return;
      
      const currentSupportStack = gameStateRef.current.get('supportStack') as Card[];
      if (currentSupportStack.length === 0) return;

      const newSupportStack = [...currentSupportStack];
      const drawnCard = newSupportStack.pop();
      if (!drawnCard) return;

      const updatedPlayer: Player = {
          ...currentPlayer,
          hand: [...currentPlayer.hand, drawnCard],
          actionPoints: currentPlayer.actionPoints - 1,
      };

      gameStateRef.current.set('supportStack', newSupportStack);
      gameStateRef.current.set(currentPlayer.id, updatedPlayer);

      if (updatedPlayer.actionPoints === 0) {
          advanceTurn();
      }
  }, [currentPlayer, advanceTurn]);

  const gameActions: GameActions = {
      playCard,
      drawCard,
      advanceTurn,
  };

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
    addPlayerToGame,
    updateCursor,
    gameActions,
    
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