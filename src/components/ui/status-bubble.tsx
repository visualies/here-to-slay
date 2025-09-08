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
        className={`absolute inset-0 border-3 border-solid ${colors.solidBorder} rounded-lg`}
        style={{
          maskImage: `conic-gradient(from 0deg at 50% 50%, black 0deg, black ${progress * 360}deg, transparent ${progress * 360}deg, transparent 360deg)`,
          WebkitMaskImage: `conic-gradient(from 0deg at 50% 50%, black 0deg, black ${progress * 360}deg, transparent ${progress * 360}deg, transparent 360deg)`
        }}
      />
      
      {/* Content layer */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
