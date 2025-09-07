"use client";

import { createContext, useContext, ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { ServerDiceManager } from '../lib/server-dice';
import type { Player, Card, CardType, Room, GameActions } from '../types';
import { createDeck, dealHand, createSupportStack } from '../game/deck';

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
  const serverDiceManagerRef = useRef<ServerDiceManager | null>(null);
  
  // React state
  const [players, setPlayers] = useState<Player[]>([]);
  const [gamePhase, setGamePhase] = useState<string>('waiting');
  const [currentTurn, setCurrentTurn] = useState<string>('');
  const [supportStack, setSupportStack] = useState<Card[]>([]);
  const [isConnected, setIsConnected] = useState(false);

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
    const playersMap = doc.getMap('players') as Y.Map<Player>;
    
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
      id: playerId,
      name: playerName,
      color: playerColor,
      lastSeen: joinTime
    });
    
    console.log('=== ADDING PLAYER TO ROOM ===');
    console.log('Room ID:', roomId);
    console.log('Player ID:', playerId);
    console.log('Player Name:', playerName);
    console.log('Current players in map before adding:', playersMap.size);
    
    // Check if player already exists in the room
    const existingPlayer = playersMap.get(playerId);
    
    if (existingPlayer) {
      console.log('Player already exists, updating info:', existingPlayer.name);
      // Update existing player info
      const updatedPlayer: Player = {
        ...existingPlayer,
        name: playerName, // Update name in case it changed
        color: playerColor, // Update color in case it changed
        lastSeen: joinTime
      };
      playersMap.set(playerId, updatedPlayer);
    } else {
      console.log('Creating new player');
      // Create initial player object with default game state
      const initialPlayer: Player = {
        id: playerId,
        name: playerName,
        color: playerColor,
        lastSeen: joinTime,
        joinTime: joinTime,
        // Position handled client-side
        hand: [],
        deck: [],
        party: {
          leader: null,
          heroes: [null, null, null, null, null, null]
        },
        actionPoints: 0
      };
      playersMap.set(playerId, initialPlayer);
    }
    
    console.log('Players in map after adding:', playersMap.size);
    
    // Connection status
    provider.on('status', (event: { status: string }) => {
      setIsConnected(event.status === 'connected');
    });
    
    // Set up dice manager
    const diceManager = new ServerDiceManager(roomId, () => {});
    serverDiceManagerRef.current = diceManager;
    
    // Cleanup function
    return () => {
      // Just disconnect, Yjs will handle presence automatically
      provider.disconnect();
      if (diceManager) {
        diceManager.disconnect();
      }
    };
  }, [roomId, playerId, playerName, playerColor]);
  
  // Subscribe to players and game state changes
  useEffect(() => {
    if (!playersRef.current || !gameStateRef.current) return;
    
    const updateState = () => {
      console.log('=== STATE UPDATE ===');
      const newPlayers: Player[] = [];
      let newPhase = 'waiting';
      let newCurrentTurn = '';
      let newSupportStack: Card[] = [];
      
      // Get all players from players map
      playersRef.current?.forEach((value, key) => {
        if (typeof value === 'object' && value !== null && 'id' in value) {
          console.log('Found player:', key, value);
          newPlayers.push(value as Player);
        }
      });
      
      // Get game metadata from game state
      gameStateRef.current?.forEach((value, key) => {
        console.log('Game state key:', key, 'value:', value);
        if (key === 'phase') {
          newPhase = value as string;
        } else if (key === 'currentTurn') {
          newCurrentTurn = value as string;
        } else if (key === 'supportStack') {
          newSupportStack = value as Card[];
        }
      });
      
      console.log('State update result:', { newPlayers: newPlayers.length, newPhase, newCurrentTurn });
      setPlayers(newPlayers);
      setGamePhase(newPhase);
      setCurrentTurn(newCurrentTurn);
      setSupportStack(newSupportStack);
    };
    
    // Observe both maps
    playersRef.current.observe(updateState);
    gameStateRef.current.observe(updateState);
    
    // Initial call
    updateState();
    
    return () => {
      playersRef.current?.unobserve(updateState);
      gameStateRef.current?.unobserve(updateState);
    };
  }, [roomId]);
  
  // Heartbeat for player presence
  useEffect(() => {
    if (!playersRef.current) return;
    
    const heartbeat = setInterval(() => {
      if (playersRef.current?.has(playerId)) {
        const currentPlayer = playersRef.current.get(playerId);
        if (currentPlayer) {
          playersRef.current.set(playerId, {
            ...currentPlayer,
            lastSeen: Date.now()
          });
        }
      }
    }, 5000);
    
    return () => {
      clearInterval(heartbeat);
    };
  }, [playerId]);
  
  // Derived state
  const currentPlayer = players.find(p => p.id === playerId) || null;
  const otherPlayers = players.filter(p => p.id !== playerId);
  const connectedPlayersCount = players.filter(p => Date.now() - p.lastSeen < 30000).length;
  
  // Check if current player is host (first to join)
  const isHost = players.length > 0 && 
    players.sort((a, b) => a.joinTime - b.joinTime)[0]?.id === playerId;
  
  // Actions
  const initializeGame = useCallback(() => {
    if (!isHost || !gameStateRef.current || !playersRef.current) {
      console.log('initializeGame: Not host or missing refs', { isHost, hasGameState: !!gameStateRef.current, hasPlayersMap: !!playersRef.current });
      return;
    }
    
    if (players.length < 1) {
      console.log('initializeGame: Not enough players', { players: players.length });
      return;
    }
    
    // Only include recently active players (connected within last 30 seconds)
    const activePlayers = players.filter(p => Date.now() - p.lastSeen < 30000);
    
    console.log('initializeGame: Starting game with', activePlayers.length, 'active players out of', players.length, 'total');
    console.log('initializeGame: Active player list:', activePlayers.map(p => ({ 
      id: p.id, 
      name: p.name, 
      joinTime: p.joinTime,
      lastSeen: new Date(p.lastSeen).toLocaleTimeString()
    })));
    
    if (activePlayers.length < 1) {
      console.log('initializeGame: Not enough active players', { activePlayers: activePlayers.length });
      return;
    }
    
    // Create and shuffle deck
    const deck = createDeck();
    console.log('Created deck with', deck.length, 'cards');
    let remainingDeck = [...deck];
    
    // Deal cards to players (no server-side position assignment needed)
    const sortedPlayers = [...activePlayers].sort((a, b) => a.joinTime - b.joinTime);
    console.log('initializeGame: Sorted active players:', sortedPlayers.map(p => ({ id: p.id, name: p.name, joinTime: p.joinTime })));
    
    sortedPlayers.forEach((player, index) => {
      const { hand, remainingDeck: newDeck } = dealHand(remainingDeck, 5);
      remainingDeck = newDeck;
      console.log('Dealt hand to', player.name, ':', hand.length, 'cards');
      
      const { hand: playerDeck, remainingDeck: finalDeck } = dealHand(remainingDeck, 10);
      remainingDeck = finalDeck;
      console.log('Dealt deck to', player.name, ':', playerDeck.length, 'cards');
      
      const gamePlayer: Player = {
        ...player,
        // Remove position assignment - client handles positioning
        hand,
        deck: playerDeck,
        party: { leader: null, heroes: [null, null, null, null, null, null] },
        actionPoints: 0
      };
      
      console.log('initializeGame: Adding player to game', gamePlayer.name);
      console.log('initializeGame: Player cards - hand:', gamePlayer.hand.length, 'deck:', gamePlayer.deck.length);
      playersRef.current.set(player.id, gamePlayer);
      console.log('initializeGame: Player set in Yjs map for', player.id);
    });
    
    // Set game metadata
    const firstPlayerId = sortedPlayers[0].id;
    const firstPlayer = playersRef.current.get(firstPlayerId) as Player;
    if (firstPlayer) {
        playersRef.current.set(firstPlayerId, { ...firstPlayer, actionPoints: 3 });
    }
    gameStateRef.current.set('currentTurn', firstPlayerId);
    gameStateRef.current.set('supportStack', createSupportStack());
    gameStateRef.current.set('phase', 'playing');
    
    console.log('initializeGame: Game metadata set:', {
      currentTurn: firstPlayerId,
      phase: 'playing',
      supportStackLength: createSupportStack().length
    });
    console.log('initializeGame: Game initialized successfully');
  }, [isHost, players]);

  const addPlayerToGame = useCallback((playerIdToAdd: string) => {
    if (!isHost || !playersRef.current) {
      console.log('addPlayerToGame: Not host or no players map');
      return;
    }

    const existingPlayer = playersRef.current.get(playerIdToAdd);
    if (existingPlayer && existingPlayer.hand && existingPlayer.hand.length > 0) {
      console.log('addPlayerToGame: Player already has game data');
      return;
    }

    const playerPresence = players.find(p => p.id === playerIdToAdd);
    if (!playerPresence) {
      console.log('addPlayerToGame: Player not found in players');
      return;
    }

    const deck = createDeck();
    const { hand } = dealHand(deck, 5);
    const { hand: playerDeck } = dealHand(deck.slice(5), 10);

    const gamePlayer: Player = {
      ...playerPresence,
      // Remove position assignment - client handles positioning  
      hand,
      deck: playerDeck,
      party: { leader: null, heroes: [null, null, null, null, null, null] },
      actionPoints: 0
    };

    console.log('addPlayerToGame: Adding player to existing game', gamePlayer.name);
    playersRef.current.set(playerIdToAdd, gamePlayer);
  }, [isHost, players]);
  
  const updateCursor = useCallback((x: number, y: number) => {
    if (providerRef.current?.awareness) {
      providerRef.current.awareness.setLocalStateField('cursor', { x, y });
    }
  }, []);

  const advanceTurn = useCallback(() => {
    console.log('=== ADVANCE TURN DEBUG ===');
    console.log('isHost:', isHost);
    console.log('hasGameState:', !!gameStateRef.current);
    console.log('hasPlayersMap:', !!playersRef.current);
    console.log('currentTurn:', currentTurn);
    console.log('players:', players.map(p => ({ id: p.id, name: p.name, actionPoints: p.actionPoints })));
    
    if (!gameStateRef.current || !playersRef.current) {
      console.log('advanceTurn: No gameState or playersMap, returning');
      return;
    }
    
    const currentPlayerIndex = players.findIndex(p => p.id === currentTurn);
    console.log('currentPlayerIndex:', currentPlayerIndex);
    
    // Handle case where current player is not found
    if (currentPlayerIndex === -1) {
      console.warn('Current player not found in players array:', {
        currentTurn,
        playerIds: players.map(p => p.id)
      });
      return;
    }
    
    const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
    const nextPlayer = players[nextPlayerIndex];
    
    console.log('Turn advance calculation:', {
      currentPlayerIndex,
      nextPlayerIndex,
      currentPlayerId: currentTurn,
      nextPlayerId: nextPlayer?.id,
      totalPlayers: players.length
    });
    
    const currentPlayerFromState = players[currentPlayerIndex];
    console.log('currentPlayerFromState:', currentPlayerFromState);
    
    if (currentPlayerFromState) {
        console.log('Setting current player action points to 0');
        playersRef.current.set(currentPlayerFromState.id, { ...currentPlayerFromState, actionPoints: 0 });
    }

    if (nextPlayer) {
        console.log('Setting next player action points to 3 and updating currentTurn');
        playersRef.current.set(nextPlayer.id, { ...nextPlayer, actionPoints: 3 });
        gameStateRef.current.set('currentTurn', nextPlayer.id);
        console.log('Turn advanced to:', nextPlayer.name);
    } else {
        console.error('No next player found!');
    }
    console.log('=== END ADVANCE TURN DEBUG ===');
  }, [isHost, players, currentTurn]);

  const playCard = useCallback((cardId: string) => {
      if (!currentPlayer || currentPlayer.actionPoints <= 0 || !playersRef.current) return;

      const cardIndex = currentPlayer.hand.findIndex(c => c.id === cardId);
      if (cardIndex === -1) return;

      const card = currentPlayer.hand[cardIndex];
      if (card.type !== 'Hero') return;

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

      playersRef.current.set(currentPlayer.id, updatedPlayer);

      console.log('Card played - remaining action points:', updatedPlayer.actionPoints);
      if (updatedPlayer.actionPoints === 0) {
          console.log('No action points left, advancing turn...');
          advanceTurn();
      }
  }, [currentPlayer, advanceTurn]);

  const drawCard = useCallback(() => {
      if (!currentPlayer || currentPlayer.actionPoints <= 0 || !gameStateRef.current || !playersRef.current) return;
      
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
      playersRef.current.set(currentPlayer.id, updatedPlayer);

      if (updatedPlayer.actionPoints === 0) {
          advanceTurn();
      }
  }, [currentPlayer, advanceTurn]);

  const gameActions: GameActions = {
      playCard,
      drawCard,
      advanceTurn,
  };

  const roomData: Room = {
    // Game state
    players,
    gamePhase,
    currentTurn,
    supportStack,
    
    // Player info
    currentPlayer,
    otherPlayers,
    isHost,
    
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

export function useRoom(): Room {
  const context = useContext(RoomContext);
  if (!context) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
}