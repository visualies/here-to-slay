"use client";

import { CardSlot } from "./card-slot";
import { Card } from "./card";
import { Stack } from "./stack";
import { ActionPointRing } from "./action-point-ring";
import { useGameState } from "../hooks/use-game-state";
import { usePlayerPosition } from "../hooks/use-player-position";
import { useGameActions } from "../hooks/use-game-actions";
import type { Card as CardType } from "../types";

interface PlayerAreaProps {
  position: "top" | "right" | "bottom" | "left";
}

function PlayerAreaContent({ position }: { position: PlayerAreaProps['position'] }) {
  const { players, currentPlayer, currentTurn } = useGameState();
  const { getPlayerPosition } = usePlayerPosition();
  const { useHeroAbility, canUseHeroAbility } = useGameActions();
  
  // Find the player that should be at this position
  const player = players.find(p => getPlayerPosition(p.id) === position) || null;

  const handleHeroClick = async (hero: CardType) => {
    if (!canUseHeroAbility(hero)) return;
    
    try {
      await useHeroAbility(hero);
    } catch (error) {
      console.error('Failed to use hero ability:', error);
    }
  };

  return (
    <div className="relative flex items-center gap-4 p-4">
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
              className={`h-full w-full relative ${canUseHeroAbility(player.party.leader) ? 'cursor-pointer' : 'saturate-50'}`}
              onClick={canUseHeroAbility(player.party.leader!) ? () => handleHeroClick(player.party.leader!) : undefined}
            >
              <Card card={player.party.leader} size="fill" preview={true} />
              {!canUseHeroAbility(player.party.leader) && (
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
          const duplicateHeroes = player?.party?.duplicateHeroes || [];
          const originalHeroes = player?.party?.heroes || [];
          
          // Group duplicates by their matching original hero's column position
          const duplicatesByColumn = Array.from({ length: 6 }, () => [] as typeof duplicateHeroes);
          
          duplicateHeroes.forEach(duplicateHero => {
            if (!duplicateHero) return;
            
            // Find which column this duplicate belongs to (based on matching class)
            const matchingColumnIndex = originalHeroes.findIndex(originalHero => 
              originalHero && originalHero.class === duplicateHero.class
            );
            
            if (matchingColumnIndex !== -1) {
              duplicatesByColumn[matchingColumnIndex].push(duplicateHero);
            }
          });
          
          return (
            <div className="flex gap-1">
              {Array.from({ length: 6 }, (_, columnIndex) => {
                const originalHero = originalHeroes[columnIndex];
                const columnDuplicates = duplicatesByColumn[columnIndex];
                const maxStackHeight = 120; // Fixed container height
                const totalCardsInColumn = 1 + columnDuplicates.length; // 1 original + duplicates
                const cardSpacing = totalCardsInColumn > 1 ? maxStackHeight / (totalCardsInColumn - 1) : 0;
                
                return (
                  <div key={`column-${columnIndex}`} className="relative">
                    {/* Original hero (always at bottom of stack) */}
                    <Stack>
                      <CardSlot label={undefined} size="large">
                        {originalHero && (
                          <div 
                            className={`h-full w-full relative ${canUseHeroAbility(originalHero) ? 'cursor-pointer' : 'saturate-60'}`}
                            style={{ 
                              minWidth: '100%', 
                              minHeight: '100%',
                              aspectRatio: '744/1039'
                            }}
                            onClick={canUseHeroAbility(originalHero) ? () => handleHeroClick(originalHero) : undefined}
                          >
                            <Card card={originalHero} size="fill" preview={true} />
                            {!canUseHeroAbility(originalHero) && (
                              <Stack>
                                <div className="absolute inset-0 bg-white/50 rounded" />
                              </Stack>
                            )}
                          </div>
                        )}
                      </CardSlot>
                    </Stack>
                    
                    {/* Duplicate heroes stacked above original */}
                    {columnDuplicates.map((duplicateHero, stackIndex) => (
                      <Stack key={`duplicate-${duplicateHero.id}`}>
                        <div 
                          className="absolute left-0"
                          style={{ top: `-${cardSpacing * (stackIndex + 1)}px` }}
                        >
                          <CardSlot label={undefined} size="large" hideOutline={true} noBg={true}>
                            <div
                              className={`h-full w-full relative ${canUseHeroAbility(duplicateHero) ? 'cursor-pointer' : 'saturate-60'}`}
                              style={{ 
                                minWidth: '100%', 
                                minHeight: '100%',
                                aspectRatio: '744/1039'
                              }}
                              onClick={canUseHeroAbility(duplicateHero) ? () => handleHeroClick(duplicateHero) : undefined}
                            >
                              <Card card={duplicateHero} size="fill" />
                              {!canUseHeroAbility(duplicateHero) && (
                                <div className="absolute inset-0 bg-white/50 rounded" />
                              )}
                            </div>
                          </CardSlot>
                        </div>
                      </Stack>
                    ))}
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

export function PlayerArea({ position }: PlayerAreaProps) {
  const rotationClass = {
    top: "rotate-180",
    right: "-rotate-90", 
    left: "rotate-90",
    bottom: ""
  }[position];

  return rotationClass ? (
    <div className={rotationClass}>
      <PlayerAreaContent position={position} />
    </div>
  ) : (
    <PlayerAreaContent position={position} />
  );
}