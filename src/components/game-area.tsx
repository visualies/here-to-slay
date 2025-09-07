"use client";

import { useEffect } from "react";
import { useGameState, useGameActions, usePlayerPresence } from "../hooks/use-game-state";
import { useDice } from "../contexts/dice-context";
import { HandCards } from "./hand-cards";
import { PlayerArea } from "./player-area";
import { CenterArea } from "./center-area";
import { Button } from "@/components/ui/button";
import type { Player } from "../types";

interface GameAreaProps {
  diceResults: number[];
}

export function GameArea({ diceResults }: GameAreaProps) {
  const { players, gamePhase, currentTurn, currentPlayer, otherPlayers } = useGameState();
  const { initializeGame, addPlayerToGame, isHost } = useGameActions();
  const { connectedPlayers, connectedPlayersCount } = usePlayerPresence();
  const { 
    enabled: diceEnabled, 
    results: hookDiceResults, 
    stable: diceStable,
    enable: enableDice,
    disable: disableDice
  } = useDice();

  // Determine if it's the current player's turn
  const isMyTurn = currentPlayer?.id === currentTurn && gamePhase === 'playing';

  // Disable dice when it's not player's turn
  useEffect(() => {
    if (!isMyTurn && diceEnabled) {
      disableDice();
    }
  }, [isMyTurn, diceEnabled, disableDice]);

  // Manual game start - no automatic initialization

  // Add players who join an existing game
  useEffect(() => {
    if (isHost && gamePhase === 'playing') {
      // Find connected players not yet in the game
      const playersInGame = new Set(players.map(p => p.id));
      const playersToAdd = connectedPlayers.filter(p => !playersInGame.has(p.id));
      
      playersToAdd.forEach(player => {
        console.log('Adding player to existing game:', player.name);
        addPlayerToGame(player.id);
      });
    }
  }, [isHost, gamePhase, players, connectedPlayers, addPlayerToGame]);


  // Always show the game board - no separate waiting room

  // Position players around screen edges - consistent with player-area.tsx
  const getPlayerByPosition = (position: 'top' | 'right' | 'bottom' | 'left'): Player | null => {
    // Current player is always at bottom
    if (position === 'bottom') return currentPlayer;
    
    // Sort other players by ID for consistent positioning
    const sortedOtherPlayers = [...otherPlayers].sort((a, b) => a.id.localeCompare(b.id));
    
    // For 2 players total (1 other player), position the other player at top
    // For 3+ players, use the original positioning: right, top, left
    const positions = players.length === 2 ? ['top', 'right', 'left'] : ['right', 'top', 'left'];
    const positionIndex = positions.indexOf(position as any);
    
    return positionIndex !== -1 ? sortedOtherPlayers[positionIndex] || null : null;
  };

  return (
    <div className="w-full h-screen bg-white relative overflow-hidden">
      {/* Top player hand cards */}
      <div className="absolute top-0 left-1/2 w-0 h-0 flex items-center justify-center z-30">
        <div>
          {getPlayerByPosition('top') && (
            <HandCards 
              cards={getPlayerByPosition('top')!.hand} 
              isOwn={false} 
              position="top"
            />
          )}
        </div>
      </div>

      {/* Right player hand cards */}
      <div className="absolute right-0 top-1/2 w-0 h-0 flex items-center justify-center z-30">
        <div>
          {getPlayerByPosition('right') && (
            <HandCards 
              cards={getPlayerByPosition('right')!.hand} 
              isOwn={false} 
              position="right"
            />
          )}
        </div>
      </div>

      {/* Bottom player hand cards (current player) */}
      <div className="absolute bottom-0 left-1/2 w-0 h-0 flex items-center justify-center z-30">
        <div>
          {currentPlayer && (
            <HandCards 
              cards={currentPlayer.hand} 
              isOwn={true} 
              position="bottom"
            />
          )}
        </div>
      </div>

      {/* Left player hand cards */}
      <div className="absolute left-0 top-1/2 w-0 h-0 flex items-center justify-center z-30">
        <div>
          {getPlayerByPosition('left') && (
            <HandCards 
              cards={getPlayerByPosition('left')!.hand} 
              isOwn={false} 
              position="left"
            />
          )}
        </div>
      </div>

      {/* Dotted background pattern */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle, #666 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }}
      />
      
      {/* Game board container */}
      <div className="relative h-full grid grid-rows-[260px_1fr_260px] grid-cols-[260px_1fr_260px]">
        {/* Top player area */}
        <div className="col-start-2 row-start-1 flex items-end justify-center pb-4">
          <PlayerArea position="top" />
        </div>
        
        {/* Right player area */}
        <div className="col-start-3 row-start-2 flex items-center justify-center pr-12">
          <PlayerArea position="right" />
        </div>
        
        {/* Bottom player area */}
        <div className="col-start-2 row-start-3 flex items-start justify-center pt-4">
          <PlayerArea position="bottom" />
        </div>
        
        {/* Left player area */}
        <div className="col-start-1 row-start-2 flex items-center justify-center pl-12">
          <PlayerArea position="left" />
        </div>
        
        {/* Center area */}
        <div className="col-start-2 row-start-2 flex items-center justify-center">
          <CenterArea diceResults={diceResults} />
        </div>
      </div>
      

      {/* Control Panel - shows different content based on game phase */}
      <div className="absolute bottom-4 right-4 z-40">
        {gamePhase === 'waiting' ? (
          /* Waiting Phase - Start Round Controls */
          <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 border-2 border-purple-500">
            <div className="text-sm font-semibold text-purple-600 mb-3">
              {connectedPlayersCount === 1 ? 
                "Waiting for more players..." : 
                `${connectedPlayersCount} players ready`
              }
            </div>
            
            {/* Connected players mini-list */}
            <div className="mb-3">
              <div className="flex flex-wrap gap-1 max-w-48">
                {connectedPlayers.map(player => (
                  <div 
                    key={player.id}
                    className="px-2 py-1 rounded text-xs"
                    style={{ backgroundColor: player.color + '20', color: player.color }}
                  >
                    {player.name}
                    {player.id === connectedPlayers.find(p => p.joinTime === Math.min(...connectedPlayers.map(cp => cp.joinTime)))?.id && " (Host)"}
                  </div>
                ))}
              </div>
            </div>

            {/* Start Round button for host */}
            {isHost ? (
              <Button
                onClick={() => initializeGame()}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 text-sm w-full"
              >
                🎮 Start Round
              </Button>
            ) : (
              <div className="text-sm text-gray-600 text-center">
                Waiting for host to start...
              </div>
            )}
          </div>
        ) : (
          /* Playing Phase - Dice Controls */
          <>
            {isMyTurn ? (
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 border-2 border-purple-500">
                <div className="text-sm font-semibold text-purple-600 mb-2">Your Turn!</div>
                {!diceEnabled ? (
                  <Button
                    onClick={enableDice}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 text-sm"
                  >
                    🎲 Roll Dice
                  </Button>
                ) : (
                  <div className="text-sm text-purple-600">
                    {diceStable ? '✅ Roll Complete!' : '🎲 Dice rolling...'}
                  </div>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}