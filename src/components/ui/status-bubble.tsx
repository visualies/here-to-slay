"use client";

import { ReactNode, useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';

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
  const [showCelebration, setShowCelebration] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Trigger celebration when progress completes
  useEffect(() => {
    if (progress >= 1 && showProgress && variant === 'success') {
      setShowCelebration(true);
      
      // Trigger confetti from the bubble position
      if (bubbleRef.current) {
        const rect = bubbleRef.current.getBoundingClientRect();
        const x = (rect.left + rect.width / 2) / window.innerWidth;
        const y = (rect.top + rect.height / 2) / window.innerHeight;
        
        confetti({
          particleCount: 25,
          spread: 360,
          origin: { x, y },
          colors: ['#10b981', '#34d399', '#6ee7b7'], // Green colors
          gravity: 1.0,
          scalar: 0.6,
          startVelocity: 30
        });
      }
      
      const timer = setTimeout(() => setShowCelebration(false), 600);
      return () => clearTimeout(timer);
    }
  }, [progress, showProgress, variant]);

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
    <div 
      ref={bubbleRef}
      className={`relative w-12 h-12 rounded-lg overflow-hidden transition-transform duration-300 ease-out ${className} ${
        showCelebration ? 'scale-125' : 'scale-100'
      }`}
    >
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
