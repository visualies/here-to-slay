"use client";

import type { Card as GameCard } from "../types";
import { useBlur } from "../contexts/blur-context";
import { getRandomTransform, getRandomHoverRotation } from "../lib/utils";

interface CardProps {
  card: GameCard;
  isBack?: boolean;
  size?: 'small' | 'medium' | 'deck' | 'large' | 'xl' | 'fill';
  className?: string;
  stackIndex?: number;
  randomness?: number; // 0-5, where 0 = no randomness, 5 = full randomness
}

export function Card({ card, isBack = false, size = 'deck', className = '', stackIndex, randomness = 0 }: CardProps) {
  const { setBlurred } = useBlur();
  const sizeClasses = {
    small: 'w-20',
    medium: 'w-24', 
    deck: 'w-28',
    large: 'w-32',
    xl: 'w-40',
    fill: 'w-full h-full'
  };

  // Always use aspect ratio for non-fill sizes, matching support deck style
  const getBaseClasses = () => {
    if (size === 'fill') {
      return 'w-full h-full';
    }
    
    const aspectRatio = (card.type === 'PartyLeader' || card.type === 'Monster') ? 'aspect-[7/12]' : 'aspect-[744/1039]';
    return `${sizeClasses[size]} ${aspectRatio}`;
  };
  
  const baseClasses = getBaseClasses();

  // Get background image for card
  const getCardBackground = (card: GameCard) => {
    // If card has imagePath, use it
    if (card.imagePath) {
      return `url(${card.imagePath})`;
    }
    
    // Fall back to default images based on type
    switch (card.type) {
      case 'Modifier':
        return 'url(/modifier.png)';
      case 'Hero':
      case 'Item':
      case 'Magic':
      default:
        return 'url(/heroBack.png)';
    }
  };

  const transform = getRandomTransform(card.name, stackIndex, randomness);
  const hoverRotation = getRandomHoverRotation(card.name, stackIndex);

  // All cards now use background images
  const backgroundImage = isBack ? 'url(/heroBack.png)' : getCardBackground(card);

  return (
    <div 
      className={`${baseClasses} bg-cover bg-center rounded overflow-hidden outline outline-1 ${className} ${card.type !== 'Modifier' && !isBack ? 'flex flex-col' : ''} ${card.type === 'Monster' ? 'random-rotate hover:scale-[2] hover:-translate-y-4 hover:rotate-[var(--hover-rotation)] hover:z-50 hover:shadow-2xl hover:shadow-black/50 transition-all duration-300 ease-in-out cursor-pointer relative' : 'random-rotate hover:rotate-[var(--hover-rotation)] transition-transform duration-300 ease-in-out cursor-pointer relative'}`}
      style={{ 
        backgroundImage,
        backgroundSize: (card.type === 'PartyLeader' || card.type === 'Monster') ? '100% 100%' : 'cover',
        transform: transform,
        outlineColor: '#c5c3c0',
        '--hover-rotation': `${hoverRotation}deg`
      } as React.CSSProperties & { '--hover-rotation': string }}
      onMouseEnter={() => card.type === 'Monster' && setBlurred(true)}
      onMouseLeave={() => card.type === 'Monster' && setBlurred(false)}
    >
      {/* Only show text content for non-modifier cards, non-back cards, and cards without custom images */}
      {card.type !== 'Modifier' && !isBack && !card.imagePath && (
        <div className="flex-1 flex flex-col justify-between bg-white/80 p-1">
          <div className="text-xs font-bold text-center truncate">
            {card.name}
          </div>
          <div className="text-center">
            <div className={`inline-block px-1 py-0.5 rounded text-xs font-medium ${
              card.type === 'Hero' ? 'bg-yellow-100 text-yellow-800' :
              card.type === 'Item' ? 'bg-blue-100 text-blue-800' :
              card.type === 'Magic' ? 'bg-purple-100 text-purple-800' :
              'bg-red-100 text-red-800'
            }`}>
              {card.type}
            </div>
            {card.class && (
              <div className="text-xs text-gray-600 mt-0.5">
                {card.class}
              </div>
            )}
          </div>
          <div className="text-xs text-center text-gray-700">
            {card.requirement && (
              <div className="font-semibold">{card.requirement}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}