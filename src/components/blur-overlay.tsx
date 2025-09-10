"use client";

import { useBlur } from '../contexts/blur-context';

export function BlurOverlay() {
  const { isBlurred } = useBlur();

  return (
    <div 
      className={`fixed inset-0 bg-black/20 backdrop-blur-sm z-40 pointer-events-none transition-all duration-300 ease-in-out ${
        isBlurred ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40
      }}
    />
  );
}
