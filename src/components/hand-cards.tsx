"use client";

import { Card as GameCard } from "../game/types";
import { Card } from "./card";
import { useGameActions } from "../hooks/use-game-state";

interface HandCardsProps {
  cards: GameCard[];
  isOwn?: boolean;
  position: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

export function HandCards({ cards, isOwn = false, position, className = '' }: HandCardsProps) {
  const { playCard } = useGameActions();
  const cardCount = cards.length;
  
  console.log(`HandCards - Position: ${position}, IsOwn: ${isOwn}, Cards: ${cardCount}`, cards);

  // Position-specific styles
  const positionStyles = {
    top: {
      container: 'flex-row justify-center items-start',
      cardSpacing: '-ml-12',
      rotation: ''
    },
    right: {
      container: 'flex-col justify-center items-end',
      cardSpacing: '-mt-12',
      rotation: 'rotate-90'
    },
    bottom: {
      container: 'flex-row justify-center items-end',
      cardSpacing: 'ml-2',
      rotation: ''
    },
    left: {
      container: 'flex-col justify-center items-start',
      cardSpacing: '-mt-12',
      rotation: '-rotate-90'
    }
  };

  const styles = positionStyles[position];

  return (
    <div className={`flex ${styles.container} ${className}`}>
      {isOwn ? (
        // Show actual cards for the current player
        cards.map((card, index) => (
          <div
            key={card.id}
            className={`${index > 0 ? styles.cardSpacing : ''} ${styles.rotation} hover:scale-150 hover:translate-y-[-11rem] transition-transform cursor-pointer hover:z-10 relative`}
            onClick={() => playCard(card.id)}
          >
            <Card card={card} size="xl" />
          </div>
        ))
      ) : (
        // Show card backs for other players with count
        <div className="relative">
          {/* Stack of card backs */}
          <div className={`flex ${styles.container}`}>
            {[...Array(Math.min(cardCount, 5))].map((_, index) => (
              <div
                key={index}
                className={`${index > 0 ? styles.cardSpacing : ''} ${styles.rotation}`}
                style={{ zIndex: 5 - index }}
              >
                <Card 
                  card={{
                    id: 'back',
                    name: 'Hidden',
                    type: 'Hero' as any,
                    description: '',
                    requirement: '',
                    effect: []
                  }} 
                  isBack={true} 
                  size="large" 
                />
              </div>
            ))}
          </div>
          {/* Card count badge */}
          {cardCount > 0 && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white z-20">
              {cardCount}
            </div>
          )}
        </div>
      )}
    </div>
  );
}