"use client";

import { useState, useEffect } from "react";
import { getMultiplayerGame, PlayerPresence } from "../lib/multiplayer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MultiplayerPresenceProps {
  roomId?: string;
}

export function MultiplayerPresence({ roomId }: MultiplayerPresenceProps) {
  const [players, setPlayers] = useState<PlayerPresence[]>([]);
  const [multiplayerGame] = useState(() => roomId ? getMultiplayerGame(roomId) : null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!multiplayerGame) return;

    // Subscribe to connection status
    multiplayerGame.provider.on('status', (event: any) => {
      setIsConnected(event.status === 'connected');
    });

    // Subscribe to player changes
    const unsubscribe = multiplayerGame.onPlayersChange((updatedPlayers) => {
      setPlayers(updatedPlayers);
    });

    return () => {
      unsubscribe();
    };
  }, [multiplayerGame]);

  useEffect(() => {
    if (!multiplayerGame) return;

    // Update cursor position on mouse move
    const handleMouseMove = (event: MouseEvent) => {
      const rect = document.documentElement.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      multiplayerGame.updateCursor(x, y);
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [multiplayerGame]);

  if (!multiplayerGame) {
    return null;
  }

  const currentPlayerId = multiplayerGame.getCurrentPlayerId();

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Connection Status */}
      <div className="mb-2">
        <Badge variant={isConnected ? 'default' : 'destructive'} className="flex items-center gap-2">
          <div 
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          {isConnected ? 'Connected' : 'Disconnected'}
        </Badge>
      </div>

      {/* Players List */}
      {players.length > 0 && (
        <Card className="bg-white/90 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-700">
              Players ({players.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {players.map((player) => (
                <div 
                  key={player.id} 
                  className="flex items-center gap-2 text-sm"
                >
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: player.color }}
                  />
                  <span className={`truncate ${
                    player.id === currentPlayerId ? 'font-semibold' : ''
                  }`}>
                    {player.name}
                    {player.id === currentPlayerId && ' (You)'}
                  </span>
                  {!player.isActive && (
                    <Badge variant="secondary" className="text-xs">Away</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Other Players' Cursors */}
      {players
        .filter(player => player.id !== currentPlayerId && player.cursor && player.isActive)
        .map((player) => (
          <div
            key={`cursor-${player.id}`}
            className="fixed pointer-events-none z-40"
            style={{
              left: `${player.cursor!.x * 100}%`,
              top: `${player.cursor!.y * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="relative">
              {/* Cursor */}
              <svg width="20" height="20" viewBox="0 0 20 20" className="drop-shadow-md">
                <path
                  d="M0 0L8 12L4 16L0 12L0 0Z"
                  fill={player.color}
                  stroke="white"
                  strokeWidth="1"
                />
              </svg>
              
              {/* Player name label */}
              <div 
                className="absolute top-5 left-2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap"
                style={{ borderColor: player.color }}
              >
                {player.name}
              </div>
            </div>
          </div>
        ))}
    </div>
  );
}