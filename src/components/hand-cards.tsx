"use client";

import type { Card as GameCard } from "../types";
import { Card } from "./card";
import { useGameActions, useGameState } from "../hooks/use-game-state";

interface HandCardsProps {
  cards: GameCard[];
  isOwn?: boolean;
  position: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

export function HandCards({ cards, isOwn = false, position, className = '' }: HandCardsProps) {
  const { playCard } = useGameActions();
  const { currentPlayer, currentTurn } = useGameState();
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
            className={`${index > 0 ? styles.cardSpacing : ''} ${currentPlayer?.id === currentTurn && currentPlayer?.actionPoints > 0 && card.type === 'Hero' ? 'hover:scale-200 hover:translate-y-[-8.5rem] cursor-pointer' : 'opacity-60 cursor-not-allowed'} transition-transform hover:z-10 relative`}
            onClick={() => {
              const canPlay = currentPlayer?.id === currentTurn && (currentPlayer?.actionPoints ?? 0) > 0 && card.type === 'Hero';
              if (!canPlay) return;
              playCard(card.id);
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
                      type: 'Hero' as any,
                      description: '',
                      requirement: '',
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