"use client";

import { CardSlot } from "./card-slot";
import { Card } from "./card";
import { ActionPointRing } from "./action-point-ring";
import { useGameState } from "../hooks/use-game-state";

interface PlayerAreaProps {
  position: "top" | "right" | "bottom" | "left";
}

function PlayerAreaContent({ position }: { position: PlayerAreaProps['position'] }) {
  const { players, currentPlayer, currentTurn, otherPlayers } = useGameState();
  
  // Dynamically assign positions based on current player's perspective
  const getPlayerForPosition = (pos: PlayerAreaProps['position']) => {
    if (pos === 'bottom') return currentPlayer;
    
    // Sort other players by ID for consistent positioning
    const sortedOtherPlayers = [...otherPlayers].sort((a, b) => a.id.localeCompare(b.id));
    const positions = ['right', 'top', 'left'] as const;
    const positionIndex = positions.indexOf(pos as any);
    
    return positionIndex !== -1 ? sortedOtherPlayers[positionIndex] || null : null;
  };
  
  const player = getPlayerForPosition(position);

  return (
    <div className="relative flex items-center gap-2 p-4">
      <div className="relative flex-shrink-0">
        {player && (
          <div className="absolute top-1/2 -translate-y-1/2 -left-10 z-10">
            <ActionPointRing 
              current={player.actionPoints} 
              max={3} 
            />
          </div>
        )}
        <CardSlot label="Party Leader" size="large">
          {player?.party?.leader && (
            <Card card={player.party.leader} size="fill" />
          )}
        </CardSlot>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: 6 }, (_, i) => (
          <CardSlot key={i} label={i === 0 ? `${player?.name || 'Player'}'s Heroes` : undefined} size="small">
            {player?.party?.heroes[i] && (
              <Card card={player.party.heroes[i]} size="fill" />
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