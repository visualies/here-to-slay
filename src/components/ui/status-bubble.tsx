"use client";

import { ReactNode } from 'react';

interface StatusBubbleProps {
  children: ReactNode;
  className?: string;
  progress?: number; // 0 to 1
  showProgress?: boolean;
  variant?: 'default' | 'success' | 'error';
}

export function StatusBubble({ 
  children, 
  className = "", 
  progress = 1,
  showProgress = false,
  variant = 'default'
}: StatusBubbleProps) {

  const getColors = () => {
    switch (variant) {
      case 'success':
        return {
          bg: 'bg-green-100',
          dashedBorder: 'border-green-400',
          solidBorder: 'border-green-400'
        };
      case 'error':
        return {
          bg: 'bg-red-100', 
          dashedBorder: 'border-red-400',
          solidBorder: 'border-red-400'
        };
      default:
        return {
          bg: 'bg-gray-100',
          dashedBorder: 'border-gray-300',
          solidBorder: 'border-gray-300'
        };
    }
  };

  const colors = getColors();

  return (
    <div className={`relative w-12 h-12 rounded-lg overflow-hidden ${className}`}>
      {/* Background layer */}
      <div className={`absolute inset-0 ${colors.bg} rounded-lg`} />
      
      {/* Dashed border layer (below) */}
      <div className={`absolute inset-0 border-2 border-dashed ${colors.dashedBorder} rounded-lg`} />
      
      {/* Solid border layer with circular reveal mask (above) */}
      <div 
        className={`absolute inset-0 border-2 border-solid ${colors.solidBorder} rounded-lg`}
        style={{
          clipPath: (() => {
            const angle = progress * 360;
            if (angle >= 360) return 'none';
            if (angle <= 0) return 'polygon(50% 50%, 50% 50%, 50% 50%)';
            
            // Start from top (12 o'clock) and go clockwise
            const points = ['50% 50%', '50% 0%'];
            
            // Add corner points as we sweep clockwise
            if (angle > 45) points.push('100% 0%'); // top-right corner
            if (angle > 135) points.push('100% 100%'); // bottom-right corner  
            if (angle > 225) points.push('0% 100%'); // bottom-left corner
            if (angle > 315) points.push('0% 0%'); // top-left corner
            
            // Add the current progress point
            const radians = (angle - 90) * Math.PI / 180;
            const x = 50 + 50 * Math.cos(radians);
            const y = 50 + 50 * Math.sin(radians);
            points.push(`${x}% ${y}%`);
            
            return `polygon(${points.join(', ')})`;
          })()
        }}
      />
      
      {/* Content layer */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
