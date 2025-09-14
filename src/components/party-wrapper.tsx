"use client";

import { ReactNode, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useSizing } from "@/hooks/use-sizing";
import { CardOrigin } from "./card-origin";
import {CardSlot} from "@/components/card-slot";
import { Card } from "@/components/card";
import { useGameState } from "@/hooks/use-game-state";
import { usePlayerPosition } from "@/hooks/use-player-position";
import { Stack } from "@/components/stack";
import { Card as CardType } from "@/types/card";

interface PartyWrapperProps {
  children?: ReactNode;
  orientation: "horizontal" | "vertical";
  debugMode?: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function PartyWrapper({ orientation, debugMode = false, position }: PartyWrapperProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { scales, register } = useSizing();
  const scale = position ? scales[position] ?? 1 : 1;
  const { players } = useGameState();
  const { getPlayerPosition } = usePlayerPosition();
  const player = position ? (players.find(p => getPlayerPosition(p.id) === position) || null) : null;

  // Register this wrapper for measurement. Done in layout effect to run before paint.
  useLayoutEffect(() => {
    if (position) {
      register(position, containerRef.current);
      return () => register(position, null);
    }
  }, [position, register]);
  // Calculate aspect ratio for 1 party leader + 6 cards with 5:7 ratio
  // Reduced from 37/7 to 4.5:1 for better proportions
  const cardAspectRatio = position === 'top' || position === 'bottom' ? 5 : 5;

  // Render cards directly for top/bottom positions (horizontal layout)
  const renderHorizontalCards = () => {
    return (
      <div className="w-full h-full flex items-center justify-center">
        {/* Debug info */}
        {debugMode && (
          <div className="absolute top-0 left-0 text-xs bg-black text-white px-1 rounded outline outline-1 outline-white">
            {position} - PartyWrapper Cards (scale: {scale.toFixed(3)})
          </div>
        )}
        
        {/* Party Leader card slot with light blue outline */}
        <div className={`${debugMode ? "outline outline-1 outline-blue-300" : ""} flex items-center justify-center`} style={{ padding: '1%', height: '100%', aspectRatio: '7/7' }}>
          <CardOrigin aspectRatio="large" orientation="horizontal" side={position} debugMode={debugMode}>
            <CardSlot size="auto" cardType="party-leader" noBg={!!player?.party?.leader}>
              {player?.party?.leader && (
                <div className="h-full w-full relative">
                  <Card card={player.party.leader} size="fill" preview={true} />
                </div>
              )}
            </CardSlot>
          </CardOrigin>
        </div>
        
        {/* Container for the 6 cards with light blue outline */}
        <div className={`flex items-center justify-center ${debugMode ? "outline outline-1 outline-blue-300" : ""}`} style={{ gap: '2%', padding: '1%', height: '100%', flex: 1 }}>
          {(() => {
            const MAX_PARTY_COLUMNS = 6;
            const allHeroes = (player?.party?.heroes || []).filter(h => h !== null) as CardType[];
            const columns = Array.from({ length: MAX_PARTY_COLUMNS }, () => [] as CardType[]);
            allHeroes.forEach((hero) => {
              let target = columns.findIndex(col => col.length > 0 && col[0].class === hero.class);
              if (target === -1) target = columns.findIndex(col => col.length === 0);
              if (target !== -1) columns[target].push(hero);
            });
            return Array.from({ length: MAX_PARTY_COLUMNS }, (_, columnIndex) => {
              const columnHeroes = columns[columnIndex];
              const total = columnHeroes.length;
              const spacingPercent = total > 1 ? 70 / (total - 1) : 0; // distribute up to ~80% height like original
              return (
                <CardOrigin key={columnIndex} aspectRatio="default" orientation="horizontal" side={position} debugMode={debugMode}>
                  {total === 0 ? (
                    <CardSlot size="auto" cardType="hero" />
                  ) : (
                    <CardSlot size="auto" cardType="hero" noBg={true}>
                      <Stack className="w-full h-full">
                        {columnHeroes.map((hero, stackIndex) => (
                          <div key={`hero-${hero.id}-${stackIndex}`} className="relative h-full" style={{ transform: stackIndex === 0 ? undefined : `translateY(-${spacingPercent * stackIndex}%)` }}>
                            <div className="h-full w-full relative">
                              <Card card={hero} size="fill" preview={true} />
                            </div>
                          </div>
                        ))}
                      </Stack>
                    </CardSlot>
                  )}
                </CardOrigin>
              );
            });
          })()}
        </div>
      </div>
    );
  };

  // Render cards for left/right positions (vertical layout)
  const renderVerticalCards = () => {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        {/* Debug info */}
        {debugMode && (
          <div className="absolute top-0 left-0 text-xs bg-black text-white px-1 rounded outline outline-1 outline-white">
            {position} - PartyWrapper Cards (Vertical, scale: {scale.toFixed(3)})
          </div>
        )}
        
        {/* Party Leader card slot with light blue outline */}
        <div className={`${debugMode ? "outline outline-1 outline-blue-300" : ""} flex items-center justify-center`} style={{ padding: '1%', width: '100%', aspectRatio: '7/7' }}>
          <CardOrigin aspectRatio="large" orientation="vertical" side={position} debugMode={debugMode}>
            <CardSlot size="auto" cardType="party-leader" noBg={!!player?.party?.leader}>
              {player?.party?.leader && (
                <div className="h-full w-full relative">
                  <Card card={player.party.leader} size="fill" preview={true} />
                </div>
              )}
            </CardSlot>
          </CardOrigin>
        </div>
        
        {/* Container for the 6 cards with light blue outline */}
        <div className={`flex flex-col items-center justify-center ${debugMode ? "outline outline-1 outline-blue-300" : ""}`} style={{ gap: '2%', padding: '1%', width: '100%', flex: 1 }}>
          {(() => {
            const MAX_PARTY_COLUMNS = 6;
            const allHeroes = (player?.party?.heroes || []).filter(h => h !== null) as CardType[];
            const columns = Array.from({ length: MAX_PARTY_COLUMNS }, () => [] as CardType[]);
            allHeroes.forEach((hero) => {
              let target = columns.findIndex(col => col.length > 0 && col[0].class === hero.class);
              if (target === -1) target = columns.findIndex(col => col.length === 0);
              if (target !== -1) columns[target].push(hero);
            });
            return Array.from({ length: MAX_PARTY_COLUMNS }, (_, columnIndex) => {
              const columnHeroes = columns[columnIndex];
              const total = columnHeroes.length;
              const spacingPercent = total > 1 ? 80 / (total - 1) : 0;
              return (
                <CardOrigin key={columnIndex} aspectRatio="default" orientation="vertical" side={position} debugMode={debugMode}>
                  {total === 0 ? (
                    <CardSlot size="auto" cardType="hero" />
                  ) : (
                    <CardSlot size="auto" cardType="hero" noBg={true}>
                      <Stack className="w-full h-full">
                        {columnHeroes.map((hero, stackIndex) => (
                          <div key={`hero-${hero.id}-${stackIndex}`} className="relative h-full" style={{ transform: stackIndex === 0 ? undefined : `translateY(-${spacingPercent * stackIndex}%)` }}>
                            <div className="h-full w-full relative">
                              <Card card={hero} size="fill" preview={true} />
                            </div>
                          </div>
                        ))}
                      </Stack>
                    </CardSlot>
                  )}
                </CardOrigin>
              );
            });
          })()}
        </div>
      </div>
    );
  };

  return (
    // The green wrapper IS the aspect-ratio box (object-fit: contain behavior)
    <div
      className={cn(
        "cq-contain flex items-center justify-center p-2",
        debugMode ? "bg-red-200 outline outline-2 outline-red-300" : ""
      )}
      style={{
        "--w": orientation === "horizontal" ? cardAspectRatio : 1,
        "--h": orientation === "horizontal" ? 1 : cardAspectRatio
      } as React.CSSProperties}
      ref={containerRef}
    >
      <div
        className="w-full h-full relative overflow-visible has-[.card:hover]:z-[60]"
        data-scale={scale.toFixed(3)}
        style={{ transform: `scale(${scale})`, transformOrigin: "center", willChange: "transform" }}
      >
        {/* Use appropriate render function based on position */}
        {position === 'top' || position === 'bottom' ? renderHorizontalCards() : renderVerticalCards()}
      </div>
    </div>
  );
}
