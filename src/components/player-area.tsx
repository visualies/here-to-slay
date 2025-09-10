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
    <div className="relative flex items-center gap-4now p-4">
      <div className="relative flex-shrink-0">
        {player && (
          <div className="absolute top-1/2 -translate-y-1/2 -left-10 z-10">
            <ActionPointRing 
              current={player.actionPoints} 
              max={3} 
            />
          </div>
        )}
        <CardSlot label="Party Leader" size="2xl" cardType="party-leader">
          {player?.party?.leader && (
            <div 
              className={`h-full w-full relative ${canUseHeroAbility(player.party.leader) ? 'cursor-pointer' : 'saturate-50'}`}
              onClick={canUseHeroAbility(player.party.leader) ? () => handleHeroClick(player.party.leader) : undefined}
            >
              <Card card={player.party.leader} size="fill" />
              {!canUseHeroAbility(player.party.leader) && (
                <Stack>
                  <div className="absolute inset-0 bg-white/30 rounded" />
                </Stack>
              )}
            </div>
          )}
        </CardSlot>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 6 }, (_, i) => (
          <CardSlot key={i} label={i === 0 ? `${player?.name || 'Player'}'s Heroes` : undefined} size="small">
            {player?.party?.heroes[i] && (
              <div 
                className={`h-full w-full relative ${canUseHeroAbility(player.party.heroes[i]) ? 'cursor-pointer' : 'saturate-60'}`}
                style={{ 
                  minWidth: '100%', 
                  minHeight: '100%',
                  aspectRatio: '744/1039'
                }}
                onClick={canUseHeroAbility(player.party.heroes[i]) ? () => handleHeroClick(player.party.heroes[i]) : undefined}
              >
                <Card card={player.party.heroes[i]} size="fill" />
                {!canUseHeroAbility(player.party.heroes[i]) && (
                  <Stack>
                    <div className="absolute inset-0 bg-white/50 rounded" />
                  </Stack>
                )}
              </div>
            )}
          </CardSlot>
        ))}
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