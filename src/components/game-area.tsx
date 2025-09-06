"use client";

import { useEffect } from "react";
import { useGameState, useGameActions, usePlayerPresence } from "../hooks/useGameState";
import { HandCards } from "./hand-cards";
import { PlayerArea } from "./player-area";
import { CenterArea } from "./center-area";

interface GameAreaProps {
  diceResults: number[];
}

export function GameArea({ diceResults }: GameAreaProps) {
  const { players, gamePhase, currentTurn, currentPlayer, otherPlayers } = useGameState();
  const { initializeGame, isHost } = useGameActions();
  const { connectedPlayersCount } = usePlayerPresence();

  // Auto-initialize game when players join
  useEffect(() => {
    if (isHost && gamePhase === 'waiting' && connectedPlayersCount >= 1) {
      setTimeout(() => initializeGame(), 100);
    }
  }, [isHost, gamePhase, connectedPlayersCount, initializeGame]);


  // Show loading while game initializes
  if (gamePhase === 'waiting' || players.length === 0) {
    return (
      <div className="w-full h-screen bg-white relative overflow-hidden">
        {/* Dotted background pattern */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle, #666 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
          }}
        />
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-2xl font-bold mb-2">🎲 Here to Slay</div>
            <div className="text-gray-600">Setting up game...</div>
          </div>
        </div>
      </div>
    );
  }

  // Position players around screen edges
  const getPlayerByPosition = (position: 'top' | 'right' | 'bottom' | 'left'): Player | null => {
    // Current player is always at bottom
    if (position === 'bottom') return currentPlayer;
    
    // Find player at specific position
    return otherPlayers.find(p => p.position === position) || null;
  };

  return (
    <div className="w-full h-screen bg-white relative overflow-hidden">
      {/* Top player hand cards */}
      <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-30">
        {getPlayerByPosition('top') && (
          <HandCards 
            cards={getPlayerByPosition('top')!.hand} 
            isOwn={false} 
            position="top"
          />
        )}
      </div>

      {/* Right player hand cards */}
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 z-30">
        {getPlayerByPosition('right') && (
          <HandCards 
            cards={getPlayerByPosition('right')!.hand} 
            isOwn={false} 
            position="right"
          />
        )}
      </div>

      {/* Bottom player hand cards (current player) */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-30">
        {currentPlayer && (
          <HandCards 
            cards={currentPlayer.hand} 
            isOwn={true} 
            position="bottom"
          />
        )}
      </div>

      {/* Left player hand cards */}
      <div className="absolute left-2 top-1/2 transform -translate-y-1/2 z-30">
        {getPlayerByPosition('left') && (
          <HandCards 
            cards={getPlayerByPosition('left')!.hand} 
            isOwn={false} 
            position="left"
          />
        )}
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
      <div className="relative h-full grid grid-rows-[200px_1fr_200px] grid-cols-[200px_1fr_200px]">
        {/* Top player area */}
        <div className="col-start-2 row-start-1 flex items-end justify-center">
          <PlayerArea position="top" />
        </div>
        
        {/* Right player area */}
        <div className="col-start-3 row-start-2 flex items-center justify-center">
          <PlayerArea position="right" />
        </div>
        
        {/* Bottom player area */}
        <div className="col-start-2 row-start-3 flex items-start justify-center">
          <PlayerArea position="bottom" />
        </div>
        
        {/* Left player area */}
        <div className="col-start-1 row-start-2 flex items-center justify-center">
          <PlayerArea position="left" />
        </div>
        
        {/* Center area */}
        <div className="col-start-2 row-start-2 flex items-center justify-center">
          <CenterArea diceResults={diceResults} />
        </div>
      </div>
      
      {/* Game info overlay */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 z-40">
        <div className="text-sm">
          <div>Phase: <span className="font-semibold">{gamePhase}</span></div>
          <div>Turn: <span className="font-semibold">
            {players.find(p => p.id === currentTurn)?.name || 'Unknown'}
          </span></div>
          <div>Players: <span className="font-semibold">{connectedPlayersCount}</span></div>
        </div>
      </div>
    </div>
  );
}