"use client";

import { CardSlot } from "./card-slot";
import { Card } from "./card";
import { Stack } from "./stack";
import { ActionPointRing } from "./action-point-ring";
import { useGameState } from "../hooks/use-game-state";
import { usePlayerPosition } from "../hooks/use-player-position";
import { useGameActions } from "../hooks/use-game-actions";
import { useSizing } from "../contexts/sizing-context";
import type { Card as CardType } from "../types";

// Configuration constants
const MAX_PARTY_COLUMNS = 6;

interface PlayerAreaProps {
  position: "top" | "right" | "bottom" | "left";
  debugMode?: boolean;
}

function PlayerAreaContent({ position, debugMode = false }: { position: PlayerAreaProps['position'], debugMode?: boolean }) {
  const { players } = useGameState();
  const { getPlayerPosition } = usePlayerPosition();
  const { heroAbility, canUseHeroAbility } = useGameActions();
  const { cardSize } = useSizing();
  
  // Use global card size for consistent stacking
  const stackHeight = cardSize * 0.8; // Slightly smaller than card size for stacking effect
  
  // Use the global sizing context for consistent card sizing
  // The overflow decision is handled at the grid level, not here
  
  // Find the player that should be at this position
  const player = players.find(p => getPlayerPosition(p.id) === position) || null;

  const handleHeroClick = async (hero: CardType) => {
    if (!canUseHeroAbility()) return;
    
    try {
      await heroAbility(hero);
    } catch (error) {
      console.error('Failed to use hero ability:', error);
    }
  };

  return (
    <div className={`relative flex items-center gap-4 p-4 ${debugMode ? 'bg-red-100 outline outline-2 outline-red-300' : ''}`}>
      {debugMode && (
        <div className="absolute top-0 left-0 text-xs bg-black text-white px-1 rounded">
          Card Size: {Math.round(cardSize)}px
        </div>
      )}
      <div className="relative flex-shrink-0">
        {player && (
          <div className="absolute top-1/2 -translate-y-1/2 -left-10 z-10">
            <ActionPointRing 
              current={player.actionPoints} 
              max={3} 
            />
          </div>
        )}
        <CardSlot label={player?.name || "Party Leader"} size="large" cardType="party-leader">
          {player?.party?.leader && (
            <div 
              className={`h-full w-full relative ${canUseHeroAbility() ? 'cursor-pointer' : 'saturate-50'}`}
              onClick={canUseHeroAbility() ? () => handleHeroClick(player.party.leader!) : undefined}
            >
              <Card card={player.party.leader} size="fill" preview={true} />
              {!canUseHeroAbility() && (
                <Stack>
                  <div className="absolute inset-0 bg-white/30 rounded" />
                </Stack>
              )}
            </div>
          )}
        </CardSlot>
      </div>
      <div className="flex flex-col gap-1 relative">
        {(() => {
          // Get all heroes from the unified heroes array
          const allHeroes = (player?.party?.heroes || []).filter(h => h !== null);
          
          // Group all heroes by class into columns
          const herosByColumn = Array.from({ length: MAX_PARTY_COLUMNS }, () => [] as typeof allHeroes);
          
          allHeroes.forEach(hero => {
            if (!hero) return;
            
            // Find existing column with same class, or use first empty column
            let targetColumn = herosByColumn.findIndex(column => 
              column.length > 0 && column[0].class === hero.class
            );
            
            if (targetColumn === -1) {
              // Find first empty column
              targetColumn = herosByColumn.findIndex(column => column.length === 0);
            }
            
            if (targetColumn !== -1) {
              herosByColumn[targetColumn].push(hero);
            }
          });
          
          return (
            <div className="flex gap-1">
              {Array.from({ length: MAX_PARTY_COLUMNS }, (_, columnIndex) => {
                const columnHeroes = herosByColumn[columnIndex];
                const maxStackHeight = stackHeight; // Use responsive stack height
                const totalCardsInColumn = columnHeroes.length;
                const cardSpacing = totalCardsInColumn > 1 ? maxStackHeight / (totalCardsInColumn - 1) : 0;
                
                return (
                  <div key={`column-${columnIndex}`} className="relative">
                    {columnHeroes.map((hero, stackIndex) => (
                      <Stack key={`hero-${hero.id}-${stackIndex}`}>
                        <div 
                          className={stackIndex === 0 ? "" : "absolute left-0"}
                          style={stackIndex === 0 ? {} : { top: `-${cardSpacing * stackIndex}px` }}
                        >
                          <CardSlot 
                            label={undefined} 
                            size="large" 
                            hideOutline={stackIndex > 0} 
                            noBg={stackIndex > 0}
                          >
                            {hero && (
                              <div 
                                className={`h-full w-full relative ${canUseHeroAbility() ? 'cursor-pointer' : 'saturate-60'}`}
                                style={{ 
                                  minWidth: '100%', 
                                  minHeight: '100%',
                                  aspectRatio: '744/1039'
                                }}
                                onClick={canUseHeroAbility() ? () => handleHeroClick(hero) : undefined}
                              >
                                <Card card={hero} size="fill" preview={true} />
                                {!canUseHeroAbility() && (
                                  <Stack>
                                    <div className="absolute inset-0 bg-white/50 rounded" />
                                  </Stack>
                                )}
                              </div>
                            )}
                          </CardSlot>
                        </div>
                      </Stack>
                    ))}
                    
                    {/* Empty slot if no heroes in this column */}
                    {columnHeroes.length === 0 && (
                      <Stack>
                        <CardSlot label={undefined} size="large" />
                      </Stack>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export function PlayerArea({ position, debugMode = false }: PlayerAreaProps) {
  // Rotation is now handled by PartyWrapper, so we just need to handle the 180° rotation for top
  const needsTopRotation = position === "top";

  return needsTopRotation ? (
    <div className="rotate-180">
      <PlayerAreaContent position={position} debugMode={debugMode} />
    </div>
  ) : (
    <PlayerAreaContent position={position} debugMode={debugMode} />
  );
}