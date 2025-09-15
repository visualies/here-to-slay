"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { ErrorMessage } from "@/components/ui/error-message";
import { joinRoomAction } from "@/actions/room-actions";
import { ArrowLeft, LogIn, Settings } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import type { ServerUser, RecentRoom } from "@/lib/server-user";
import { useUser } from "@/hooks/use-user";

interface JoinRoomModalProps {
  user: ServerUser | null;
  recentRooms: RecentRoom[];
}

export function JoinRoomModal({ user, recentRooms }: JoinRoomModalProps) {
  const [state, formAction, isPending] = useActionState(joinRoomAction, { error: undefined });
  const { user: clientUser, loading } = useUser();

  // Format time since for recent rooms
  const formatTimeSince = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      
      {/* Background image */}
      <div 
        className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/flute.png")' }}
      />
      {/* Dark overlay for better readability */}
      <div className="absolute inset-0 bg-black/40" />
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm relative z-10">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2">
            <LogIn className="h-6 w-6 text-amber-600" />
            <h2 className="text-2xl">Join Room</h2>
          </div>
          <CardDescription>Enter the room code or select from recent rooms</CardDescription>
        </CardHeader>
        <CardContent>
          <ErrorMessage message={state.error || null} />
          <form action={formAction} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Room ID</label>
              <Input
                type="text"
                name="roomId"
                placeholder="e.g., ABC123"
                className="text-center text-lg font-mono"
                maxLength={6}
                data-testid="join-room-id-input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Your Name</label>
              <Input
                type="text"
                name="playerName"
                defaultValue={user?.playerName || ''}
                placeholder="Enter your player name"
                maxLength={20}
                data-testid="join-player-name-input"
                required
              />
            </div>

            {/* Hidden player id from cookie-based @me response */}
            <input type="hidden" name="playerId" value={clientUser?.playerId || ""} />

            {/* Recent Rooms */}
            {recentRooms.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Recent Rooms</label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {recentRooms.map((room) => (
                    <form key={room.roomId} action={formAction} className="contents">
                      <input type="hidden" name="roomId" value={room.roomId} />
                      <input type="hidden" name="playerName" value={user?.playerName || ''} />
                      <Button
                        type="submit"
                        variant="outline"
                        className="w-full justify-between text-left border-amber-600 text-amber-700 hover:bg-amber-50"
                      >
                        <div>
                          <div className="font-mono font-bold">{room.roomId}</div>
                          <div className="text-xs text-muted-foreground">{room.roomName}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatTimeSince(room.lastJoined)} • {room.playerCount} players
                        </div>
                      </Button>
                    </form>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                type="button"
                asChild
                variant="outline"
                className="flex-1 border-amber-600 text-amber-700 hover:bg-amber-50"
              >
                <Link href="/" prefetch={true}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Link>
              </Button>
              <Button
                type="submit"
                disabled={isPending || loading || !clientUser?.playerId}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold disabled:opacity-50"
                data-testid="join-room-submit-button"
              >
                <LogIn className="h-4 w-4 mr-2" />
                {isPending ? 'Joining...' : 'Join'}
              </Button>
            </div>

            <div className="pt-2">
              <Button
                type="button"
                asChild
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground hover:bg-muted/50"
                size="sm"
              >
                <Link href="/settings" prefetch={true}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
