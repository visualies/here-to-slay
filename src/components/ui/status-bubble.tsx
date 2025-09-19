"use client";

import { ReactNode, useEffect, useState, useRef } from 'react';
import confetti from 'canvas-confetti';

interface StatusBubbleProps {
  children: ReactNode;
  className?: string;
  progress?: number; // 0 to 1
  showProgress?: boolean;
  variant?: 'default' | 'success' | 'error';
  direction?: 'clockwise' | 'counterclockwise';
  timeout?: number; // Total timeout duration in milliseconds
  timeRemaining?: number; // Time remaining in milliseconds
}

export function StatusBubble({
  children,
  className = "",
  progress = 1,
  showProgress = false,
  variant = 'default',
  direction = 'clockwise',
  timeout,
  timeRemaining
}: StatusBubbleProps) {
  const [showCelebration, setShowCelebration] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Calculate progress from timeout values if provided
  const calculatedProgress = timeout && timeRemaining !== undefined
    ? Math.max(0, Math.min(1, timeRemaining / timeout))
    : progress;

  // Show progress automatically when timeout is provided
  const shouldShowProgress = showProgress || (timeout !== undefined && timeRemaining !== undefined);

  // Trigger celebration when progress completes
  useEffect(() => {
    if (calculatedProgress >= 1 && shouldShowProgress && variant === 'success') {
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
  }, [calculatedProgress, shouldShowProgress, variant]);

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
      {/* Background layer with variant colors */}
      <div className={`absolute inset-0 ${colors.bg} rounded-lg`} />
      
      {/* Animated dashed border that appears/disappears based on direction */}
      <div 
        className={`absolute inset-0 border-2 border-dashed ${colors.dashedBorder} rounded-lg`}
        style={(() => {
          if (!shouldShowProgress) {
            // When not showing progress, show appropriate starting state
            if (direction === 'clockwise') {
              // Clockwise starts empty (no border visible)
              return {
                maskImage: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 360deg)`,
                WebkitMaskImage: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, transparent 360deg)`
              };
            } else {
              // Counterclockwise starts full (full border visible)
              return {};
            }
          }

          // When showing progress, animate based on direction
          const angle = calculatedProgress * 360;
          if (direction === 'counterclockwise') {
            // Counterclockwise: start full, remove going backwards (timeout)
            return {
              maskImage: `conic-gradient(from 0deg at 50% 50%, black 0deg, black ${360 - angle}deg, transparent ${360 - angle}deg, transparent 360deg)`,
              WebkitMaskImage: `conic-gradient(from 0deg at 50% 50%, black 0deg, black ${360 - angle}deg, transparent ${360 - angle}deg, transparent 360deg)`
            };
          } else {
            // Clockwise: start empty, add going forwards (completion)
            return {
              maskImage: `conic-gradient(from 0deg at 50% 50%, black 0deg, black ${angle}deg, transparent ${angle}deg, transparent 360deg)`,
              WebkitMaskImage: `conic-gradient(from 0deg at 50% 50%, black 0deg, black ${angle}deg, transparent ${angle}deg, transparent 360deg)`
            };
          }
        })()}
      />
      
      {/* Content layer */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
