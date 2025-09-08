"use client";

import { ReactNode } from 'react';

interface StatusBubbleProps {
  children: ReactNode;
  className?: string;
  progress?: number; // 0 to 1
  showProgress?: boolean;
}

export function StatusBubble({ 
  children, 
  className = "", 
  progress = 1,
  showProgress = false 
}: StatusBubbleProps) {
  return (
    <div className={`relative w-12 h-12 rounded-lg overflow-hidden ${className}`}>
      {/* Progress background layer with solid border - testing reveal effect */}
      <div 
        className="absolute inset-0 bg-gray-100 border-2 border-solid border-gray-300 rounded-lg"
        style={{
          clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.cos((progress * 360 - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((progress * 360 - 90) * Math.PI / 180)}%, 50% 50%)`
        }}
      />
      
      {/* Content layer */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
