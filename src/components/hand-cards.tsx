"use client";

import { useState, useEffect } from "react";
import type { Card as GameCard, Player } from "../types";
import { CardType } from "../types";
import { Card } from "./card";
import { useGameActions } from "../hooks/use-game-actions";
import { useRoom } from "../hooks/use-room";

interface HandCardsProps {
  playerId: string;
  isOwn?: boolean;
  position: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

export function HandCards({ playerId, isOwn = false, position, className = '' }: HandCardsProps) {
  const { playHeroToParty } = useGameActions();
  const { players, currentTurn, currentTurnData } = useRoom();
  const [cards, setCards] = useState<GameCard[]>([]);
  const [player, setPlayer] = useState<Player | null>(null);

  // Update cards when players change
  useEffect(() => {
    const playerData = players.find(p => p.id === playerId);
    if (playerData) {
      console.log(`HandCards: Player ${playerId} hand updated:`, playerData.hand);
      setCards(playerData.hand || []);
      setPlayer(playerData);
    }
  }, [players, playerId]);
  const cardCount = cards.length;

  // Position-specific styles
  const positionStyles = {
    top: {
      container: 'flex-row justify-center items-start',
      containerRotation: '',
      cardSpacing: '-ml-12',
      cardRotation: 'rotate-180'
    },
    right: {
      container: 'flex-row justify-center items-start',
      containerRotation: 'rotate-90',
      cardSpacing: '-ml-12',
      cardRotation: 'rotate-180'
    },
    bottom: {
      container: 'flex-row justify-center items-end',
      containerRotation: '',
      cardSpacing: 'ml-2',
      cardRotation: ''
    },
    left: {
      container: 'flex-row justify-center items-start',
      containerRotation: '-rotate-90',
      cardSpacing: '-ml-12',
      cardRotation: 'rotate-180'
    }
  };

  const styles = positionStyles[position];

  return (
    <div className={`flex ${styles.container} ${styles.containerRotation} ${className}`}>
      {isOwn ? (
        // Show actual cards for the current player
        cards.map((card, index) => (
          <div
            key={card.id}
            className={`${index > 0 ? styles.cardSpacing : ''} ${player?.id === currentTurn && (currentTurnData?.action_points ?? 0) > 0 && card.type === 'Hero' ? 'hover:scale-200 hover:translate-y-[-8.5rem] cursor-pointer' : 'opacity-60 cursor-not-allowed'} transition-transform hover:z-10 relative`}
            onClick={async () => {
              const canPlay = player?.id === currentTurn && (currentTurnData?.action_points ?? 0) > 0 && card.type === 'Hero';
              if (!canPlay) return;
              await playHeroToParty(card.id);
            }}
          >
            <Card card={card} size="default" />
          </div>
        ))
      ) : (
        // Show card backs for other players with count
        <div className="relative">
          {/* Stack of card backs */}
          <div className={`flex ${styles.container}`}>
            {[...Array(cardCount)].map((_, index) => (
              <div
                key={index}
                className={`${index > 0 ? styles.cardSpacing : ''} ${styles.cardRotation} hover:translate-y-1 transition-transform duration-200`}
                style={{ zIndex: cardCount - index }}
              >
                <div className="hover:scale-102 transition-transform duration-200">
                  <Card 
                    card={{
                      id: 'back',
                      name: 'Hidden',
                      type: CardType.Hero,
                      description: '',
                      requirements: [{ type: 'point', value: 0 }],
                      effect: []
                    }} 
                    isBack={true} 
                    size="default" 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}