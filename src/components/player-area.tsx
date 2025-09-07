"use client";

import { CardSlot } from "./card-slot";
import { Card } from "./card";
import { ActionPointRing } from "./action-point-ring";
import { useGameState } from "../hooks/use-game-state";
import { usePlayerPosition } from "../hooks/use-player-position";

interface PlayerAreaProps {
  position: "top" | "right" | "bottom" | "left";
}

function PlayerAreaContent({ position }: { position: PlayerAreaProps['position'] }) {
  const { players, currentPlayer } = useGameState();
  const { getPlayerPosition } = usePlayerPosition();
  
  // Find the player that should be at this position
  const player = players.find(p => getPlayerPosition(p.id) === position) || null;

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