"use client";

import { useCallback, useState } from "react";
import { GameArea } from "@/components/game-area";
import { ServerDiceCanvas } from "@/components/server-dice-canvas";
import { MultiplayerPresence } from "@/components/multiplayer-presence";
import { DebugMenu } from "@/components/debug-menu";
import { GameActionsProvider } from "@/contexts/game-actions-context";
import { DiceProvider } from "@/contexts/dice-context";
import { StatusProvider } from "@/contexts/status-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bug } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRoom } from "@/contexts/room-context";

export function GameBoard() {
  const router = useRouter();
  const room = useRoom();
  const [diceResults, setDiceResults] = useState<number[]>([]);
  const [isDebugMenuOpen, setIsDebugMenuOpen] = useState<boolean>(false);

  const handleDiceResults = useCallback((results: number[]) => {
    setDiceResults(results);
  }, []);

  const handleLeaveRoom = useCallback(() => {
    // Navigate back to the home page
    router.push("/");
  }, [router]);

  return (
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
                  Room: <span className="font-mono font-bold text-purple-600" data-testid="room-id-value">{room?.roomId || 'Loading...'}</span>
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