"use client";

import { useEffect, useState } from "react";
import { useGameState, useGameActions, usePlayerPresence } from "../hooks/use-game-state";
import { usePlayerPosition } from "../hooks/use-player-position";
import { useDice } from "../contexts/dice-context";
import { HandCards } from "./hand-cards";
import { PlayerArea } from "./player-area";
import { PartyWrapper } from "./party-wrapper";
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
  const { getPlayerPosition } = usePlayerPosition();
  const { 
    enabled: diceEnabled, 
    results: hookDiceResults, 
    stable: diceStable,
    enable: enableDice,
    disable: disableDice
  } = useDice();

  // Debug mode from environment variable
  const debugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';
  
  // Calculate which side should overflow
  const [shouldTopBottomOverflow, setShouldTopBottomOverflow] = useState(false);
  
  useEffect(() => {
    const calculateOverflow = () => {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const horizontalSpace = viewportWidth * 0.6;
      const verticalSpace = viewportHeight * 0.6;
      
      const cardsPerParty = 6;
      const cardGap = 4;
      const totalGapSpace = (cardsPerParty - 1) * cardGap;
      const horizontalSpacePerCard = (horizontalSpace - totalGapSpace) / cardsPerParty;
      const verticalSpacePerCard = (verticalSpace - totalGapSpace) / cardsPerParty;
      
      // Top/Bottom should overflow if horizontal space is smaller
      const shouldOverflow = horizontalSpacePerCard < verticalSpacePerCard;
      setShouldTopBottomOverflow(shouldOverflow);
      
      if (debugMode) {
        console.log('GameArea overflow calculation:', {
          viewport: { width: viewportWidth, height: viewportHeight },
          spaces: { horizontal: horizontalSpace, vertical: verticalSpace },
          perCard: { horizontal: horizontalSpacePerCard, vertical: verticalSpacePerCard },
          shouldTopBottomOverflow: shouldOverflow
        });
      }
    };
    
    calculateOverflow();
    window.addEventListener('resize', calculateOverflow);
    return () => window.removeEventListener('resize', calculateOverflow);
  }, [debugMode]);

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

  // Position players around screen edges - using centralized positioning logic
  const getPlayerByPosition = (position: 'top' | 'right' | 'bottom' | 'left'): Player | null => {
    return players.find(p => getPlayerPosition(p.id) === position) || null;
  };

  return (
    <div className="w-full h-screen bg-background relative overflow-hidden p-18">
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
          {getPlayerByPosition('bottom') && (
            <HandCards 
              cards={getPlayerByPosition('bottom')!.hand} 
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
      <div className="relative h-full grid grid-rows-[minmax(60px,1fr)_2fr_minmax(60px,1fr)] grid-cols-[minmax(40px,0.5fr)_2fr_minmax(40px,0.5fr)]">
        {/* Center area */}
        <div className={`col-start-2 row-start-2 flex items-center justify-center ${debugMode ? 'outline outline-2 outline-red-300' : ''}`}>
          <CenterArea diceResults={diceResults} debugMode={debugMode} />
        </div>
        
        {/* Top player area - conditional overflow based on available space */}
        <div className={`${shouldTopBottomOverflow ? 'col-start-1 col-span-3' : 'col-start-2'} row-start-1 cq-container party-container ${debugMode ? 'outline outline-2 outline-red-300' : ''}`}>
          <PartyWrapper orientation="horizontal" debugMode={debugMode} position="top" />
        </div>
        
        {/* Right player area - conditional overflow based on available space */}
        <div className={`col-start-3 ${shouldTopBottomOverflow ? 'row-start-2' : 'row-start-1 row-span-3'} cq-container party-container ${debugMode ? 'outline outline-2 outline-red-300' : ''}`}>
          <PartyWrapper orientation="vertical" debugMode={debugMode} position="right" />
        </div>
        
        {/* Bottom player area - conditional overflow based on available space */}
        <div className={`${shouldTopBottomOverflow ? 'col-start-1 col-span-3' : 'col-start-2'} row-start-3 cq-container party-container ${debugMode ? 'outline outline-2 outline-red-300' : ''}`}>
          <PartyWrapper orientation="horizontal" debugMode={debugMode} position="bottom" />
        </div>
        
        {/* Left player area - conditional overflow based on available space */}
        <div className={`col-start-1 ${shouldTopBottomOverflow ? 'row-start-2' : 'row-start-1 row-span-3'} cq-container party-container ${debugMode ? 'outline outline-2 outline-red-300' : ''}`}>
          <PartyWrapper orientation="vertical" debugMode={debugMode} position="left" />
        </div>
      </div>
      

      {/* Debug overflow indicator */}
      {debugMode && (
        <div className="absolute top-4 left-4 z-50 bg-black text-white px-2 py-1 rounded text-xs">
          Overflow: {shouldTopBottomOverflow ? 'Top/Bottom' : 'Left/Right'}
        </div>
      )}

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