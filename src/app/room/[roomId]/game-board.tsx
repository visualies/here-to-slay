"use client";

import { useCallback, useEffect, useState } from "react";
import { GameArea } from "@/components/game-area";
import { ServerDiceCanvas } from "@/components/server-dice-canvas";
import { MultiplayerPresence } from "@/components/multiplayer-presence";
import { DebugMenu } from "@/components/debug-menu";
import { RoomProvider } from "@/contexts/room-context";
import { GameActionsProvider } from "@/contexts/game-actions-context";
import { DiceProvider } from "@/contexts/dice-context";
import { StatusProvider } from "@/contexts/status-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bug } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/use-user";
import type { ServerUser } from "@/lib/server-user";

interface GameBoardProps {
  roomId: string;
  user: ServerUser | null;
}

export function GameBoard({ roomId, user }: GameBoardProps) {
  const { user: currentUser, loading } = useUser();
  const router = useRouter();
  const [diceResults, setDiceResults] = useState<number[]>([]);
  const [isDebugMenuOpen, setIsDebugMenuOpen] = useState<boolean>(false);

  const handleDiceResults = useCallback((results: number[]) => {
    setDiceResults(results);
  }, []);

  const handleLeaveRoom = useCallback(() => {
    // Navigate back to the home page
    router.push("/");
  }, [router]);

  // Show loading state while user data is being fetched
  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading game...</p>
        </div>
      </div>
    );
  }

  // If no user data, show error
  if (!currentUser) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Unable to load player data. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  return (
    <RoomProvider
      roomId={roomId}
      playerId={currentUser.playerId}
      playerName={currentUser.playerName}
      playerColor={currentUser.playerColor}
    >
      <DiceProvider>
        <StatusProvider>
          <GameActionsProvider>
            <div className="w-full h-screen relative">
              {/* Room Info and Action Buttons */}
              <div className="absolute top-4 left-4 z-50 flex items-center gap-3">
                <Badge
                  variant="secondary"
                  className="bg-white/90 backdrop-blur-sm px-4 py-2 text-sm"
                  data-testid="room-id-badge"
                >
                  Room: <span className="font-mono font-bold text-purple-600" data-testid="room-id-value">{roomId}</span>
                </Badge>
                <Button
                  onClick={() => setIsDebugMenuOpen(true)}
                  variant="outline"
                  size="sm"
                  className="bg-white/90 backdrop-blur-sm border-gray-300 hover:bg-gray-100"
                  data-testid="debug-menu-button"
                  title="Open Debug Menu"
                >
                  <Bug className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleLeaveRoom}
                  variant="destructive"
                  size="sm"
                  className="backdrop-blur-sm"
                  data-testid="leave-room-button"
                >
                  🚪 Leave Room
                </Button>
              </div>

              {/* Multiplayer Presence */}
              <MultiplayerPresence />

              {/* Game Area with hands */}
              <GameArea diceResults={diceResults} />

              {/* Server-controlled dice canvas - covers the entire game board */}
              <ServerDiceCanvas
                onDiceResults={handleDiceResults}
              />

              {/* Debug Menu */}
              <DebugMenu
                isOpen={isDebugMenuOpen}
                onClose={() => setIsDebugMenuOpen(false)}
              />
            </div>
          </GameActionsProvider>
        </StatusProvider>
      </DiceProvider>
    </RoomProvider>
  );
}