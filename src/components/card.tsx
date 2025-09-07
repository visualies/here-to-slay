"use client";

import type { Card as GameCard } from "../types";

interface CardProps {
  card: GameCard;
  isBack?: boolean;
  size?: 'small' | 'medium' | 'large' | 'xl' | 'fill';
  className?: string;
}

export function Card({ card, isBack = false, size = 'medium', className = '' }: CardProps) {
  const sizeClasses = {
    small: 'w-12',
    medium: 'w-16', 
    large: 'w-24',
    xl: 'w-40',
    fill: 'w-full h-full'
  };

  // Always use aspect ratio for non-fill sizes, matching support deck style
  const baseClasses = size === 'fill' 
    ? 'w-full h-full' 
    : `${sizeClasses[size]} aspect-[744/1039]`;

  const cardClasses = `${baseClasses} bg-white rounded-lg border-2 border-gray-300 shadow-md overflow-hidden ${className}`;

  if (isBack) {
    return (
      <div 
        className={`${baseClasses} bg-cover bg-center rounded-lg border-2 border-gray-300 shadow-md overflow-hidden ${className}`}
        style={{ backgroundImage: 'url(/heroBack.png)' }}
      >
      </div>
    );
  }

  return (
    <div className={`${cardClasses} flex flex-col`}>
      <div className="flex-1 flex flex-col justify-between p-1">
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
    </div>
  );
}