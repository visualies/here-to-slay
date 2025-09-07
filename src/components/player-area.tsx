"use client";

import { CardSlot } from "./card-slot";
import { Card } from "./card";
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
  const isMyTurn = player?.id === currentTurn;

  return (
    <div className="relative flex items-center gap-2 p-4">
      <CardSlot label="Party Leader" className="flex-shrink-0" size="large">
        {player?.party?.leader && (
          <Card card={player.party.leader} size="fill" />
        )}
      </CardSlot>
      <div className="flex gap-1">
        {Array.from({ length: 6 }, (_, i) => (
          <CardSlot key={i} label={i === 0 ? `${player?.name || 'Player'}'s Heroes` : undefined} size="small">
            {player?.party?.heroes[i] && (
              <Card card={player.party.heroes[i]} size="fill" />
            )}
          </CardSlot>
        ))}
      </div>
      {player && isMyTurn && (
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white/80 px-3 py-1 rounded-full text-sm font-semibold shadow">
          Action Points: {player.actionPoints}
        </div>
      )}
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