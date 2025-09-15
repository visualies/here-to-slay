import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { joinRoomAction } from "@/actions/room-actions";
import { ArrowLeft, LogIn, Settings } from "lucide-react";
import Link from "next/link";
import type { ServerUser } from "@/lib/server-user";

interface JoinRoomModalProps {
  user: ServerUser | null;
}

export function JoinRoomModal({ user }: JoinRoomModalProps) {
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
          <CardDescription>Enter the room code and your player name</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={joinRoomAction} className="space-y-6">
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
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                data-testid="join-room-submit-button"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Join
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