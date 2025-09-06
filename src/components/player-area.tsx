"use client";

import { CardSlot } from "./card-slot";
import { Card } from "./card";
import { useGameState } from "../hooks/use-game-state";

interface PlayerAreaProps {
  position: "top" | "right" | "bottom" | "left";
}

function PlayerAreaContent({ position }: { position: PlayerAreaProps['position'] }) {
  const { players, currentPlayer, currentTurn } = useGameState();
  const player = position === 'bottom' ? currentPlayer : players.find(p => p.position === position);
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
          <CardSlot key={i} label={i === 0 ? "Heroes" : undefined} size="small">
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