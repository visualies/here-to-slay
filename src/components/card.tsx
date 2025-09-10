"use client";

import type { Card as GameCard } from "../types";

interface CardProps {
  card: GameCard;
  isBack?: boolean;
  size?: 'small' | 'medium' | 'deck' | 'large' | 'xl' | 'fill';
  className?: string;
  stackIndex?: number;
  randomness?: number; // 0-5, where 0 = no randomness, 5 = full randomness
}

export function Card({ card, isBack = false, size = 'deck', className = '', stackIndex, randomness = 0 }: CardProps) {
  const sizeClasses = {
    small: 'w-12',
    medium: 'w-16', 
    deck: 'w-20',
    large: 'w-24',
    xl: 'w-40',
    fill: 'w-full h-full'
  };

  // Always use aspect ratio for non-fill sizes, matching support deck style
  const baseClasses = size === 'fill' 
    ? 'w-full h-full' 
    : `${sizeClasses[size]} aspect-[744/1039]`;

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

  // Generate slight random transformations based on card name and index for true randomness
  const getRandomTransform = (seed: string, index?: number, level: number = 0) => {
    if (level === 0) return '';
    
    let hash = 0;
    const fullSeed = seed + (index !== undefined ? index.toString() : '');
    for (let i = 0; i < fullSeed.length; i++) {
      const char = fullSeed.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Add extra randomization with index if provided
    if (index !== undefined) {
      hash = hash ^ (index * 31);
    }
    
    // Create multiple hash values for better distribution
    const hash2 = ((hash * 1103515245) + 12345) & 0x7fffffff;
    const hash3 = ((hash2 * 16807) + 0) & 0x7fffffff;
    const hash4 = ((hash3 * 48271) + 0) & 0x7fffffff;
    
    // Scale rotation based on level (0-5) - much more dramatic for high levels
    const maxRotation = level === 1 ? 3 : level === 5 ? 40 : level * 10; // Level 1 = 3 degrees, Level 5 = 180 degrees max
    const rotation = (hash2 % (maxRotation * 2 + 1)) - maxRotation;
    
    // Position randomness - much more dramatic for level 5
    const maxTranslate = level === 1 ? 1 : level === 5 ? 80 : Math.min(2, level); // Level 1 = 1px, Level 5 = 20px max
    const translateX = (hash3 % (maxTranslate * 2 + 1)) - maxTranslate;
    const translateY = (hash4 % (maxTranslate * 2 + 1)) - maxTranslate;
    
    return `rotate(${rotation}deg) translate(${translateX}px, ${translateY}px)`;
  };

  const transform = getRandomTransform(card.name, stackIndex, randomness);
  const borderStyle = { borderColor: '#79757350' };

  // All cards now use background images
  const backgroundImage = isBack ? 'url(/heroBack.png)' : getCardBackground(card);

  return (
    <div 
      className={`${baseClasses} bg-cover bg-center rounded overflow-hidden border ${className} ${card.type !== 'Modifier' && !isBack ? 'flex flex-col' : ''}`}
      style={{ 
        backgroundImage,
        transform: transform,
        ...borderStyle
      }}
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