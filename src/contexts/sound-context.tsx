"use client";

import React, { createContext, useEffect, useRef, useState, useCallback } from 'react';

interface SoundContextType {
  playThemeMusic: () => void;
  stopThemeMusic: () => void;
  isThemeMusicPlaying: boolean;
  setThemeMusicVolume: (volume: number) => void;
}

export const SoundContext = createContext<SoundContextType | undefined>(undefined);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const [isThemeMusicPlaying, setIsThemeMusicPlaying] = useState(false);
  const themeAudioRef = useRef<HTMLAudioElement | null>(null);
  const hasInitializedRef = useRef(false);

  const initializeThemeAudio = () => {
    if (hasInitializedRef.current || themeAudioRef.current) return;
    
    const audio = new Audio('/soundtrack.mp3');
    audio.loop = true;
    audio.volume = 0.09; // Set to 9% volume (reduced by 70%)
    audio.preload = 'auto';
    
    themeAudioRef.current = audio;
    hasInitializedRef.current = true;
    
    // Handle audio events
    audio.addEventListener('play', () => setIsThemeMusicPlaying(true));
    audio.addEventListener('pause', () => setIsThemeMusicPlaying(false));
    audio.addEventListener('ended', () => setIsThemeMusicPlaying(false));
  };

  const playThemeMusic = useCallback(async () => {
    console.log('playThemeMusic called, isPlaying:', isThemeMusicPlaying, 'audio exists:', !!themeAudioRef.current);
    
    if (!themeAudioRef.current) {
      initializeThemeAudio();
    }
    
    if (themeAudioRef.current && !isThemeMusicPlaying && themeAudioRef.current.paused) {
      try {
        await themeAudioRef.current.play();
        console.log('Theme music started successfully');
      } catch (error) {
        console.log('Autoplay blocked - theme music will start on first user interaction', error);
        
        // Add click listener to start audio on first user interaction
        const startAudio = () => {
          if (themeAudioRef.current) {
            themeAudioRef.current.play().then(() => {
              console.log('Theme music started after user interaction');
              document.removeEventListener('click', startAudio);
            }).catch(console.error);
          }
        };
        document.addEventListener('click', startAudio);
      }
    }
  }, [isThemeMusicPlaying]);

  const stopThemeMusic = useCallback(() => {
    if (themeAudioRef.current) {
      themeAudioRef.current.pause();
      themeAudioRef.current.currentTime = 0;
      setIsThemeMusicPlaying(false);
      console.log('Theme music stopped');
    }
  }, []);

  const setThemeMusicVolume = useCallback((volume: number) => {
    if (themeAudioRef.current) {
      themeAudioRef.current.volume = Math.max(0, Math.min(1, volume));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (themeAudioRef.current) {
        themeAudioRef.current.pause();
        themeAudioRef.current.currentTime = 0;
        themeAudioRef.current = null;
        hasInitializedRef.current = false;
      }
    };
  }, []);

  const value: SoundContextType = {
    playThemeMusic,
    stopThemeMusic,
    isThemeMusicPlaying,
    setThemeMusicVolume,
  };

  return (
    <SoundContext.Provider value={value}>
      {children}
    </SoundContext.Provider>
  );
}

