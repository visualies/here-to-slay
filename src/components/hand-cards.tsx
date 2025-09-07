"use client";

import type { Card as GameCard } from "../types";
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
            className={`${index > 0 ? styles.cardSpacing : ''} hover:scale-150 hover:translate-y-[-11rem] transition-transform cursor-pointer hover:z-10 relative`}
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
                      type: 'Hero' as any,
                      description: '',
                      requirement: '',
                      effect: []
                    }} 
                    isBack={true} 
                    size="large" 
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