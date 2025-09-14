"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { ErrorMessage } from "@/components/ui/error-message";
import { createRoomAction } from "@/actions/room-actions";
import { ArrowLeft, Settings, Clock, Layers, Play } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import type { ServerUser } from "@/lib/server-user";

interface CreateRoomModalProps {
  user: ServerUser | null;
}

export function CreateRoomModal({ user }: CreateRoomModalProps) {
  const [state, formAction, isPending] = useActionState(createRoomAction, { error: undefined });

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
            <Settings className="h-6 w-6 text-amber-600" />
            <h2 className="text-2xl">New Room Settings</h2>
          </div>
          <CardDescription>Configure your new game room</CardDescription>
        </CardHeader>
        <CardContent>
          <ErrorMessage message={state.error || null} />
          <form action={formAction} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Player Name</label>
              <Input
                type="text"
                name="playerName"
                defaultValue={user?.playerName || ''}
                placeholder="Enter your player name"
                maxLength={20}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Clock className="h-4 w-4 inline mr-2" />
                Turn Duration (seconds)
              </label>
              <Input
                type="number"
                name="turnDuration"
                defaultValue={30}
                min="10"
                max="300"
                className="text-center"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">How long each player has per turn</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Layers className="h-4 w-4 inline mr-2" />
                Card Deck
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    name="selectedDeck"
                    value="standard"
                    defaultChecked
                    className="sr-only"
                  />
                  <Button
                    type="button"
                    variant="default"
                    className="w-full bg-amber-600 hover:bg-amber-700"
                  >
                    Standard
                  </Button>
                </label>
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    name="selectedDeck"
                    value="expanded"
                    className="sr-only"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-amber-600 text-amber-700 hover:bg-amber-50"
                  >
                    Expanded
                  </Button>
                </label>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Choose your card deck</p>
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
                disabled={isPending}
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold disabled:opacity-50"
                data-testid="create-and-start-game-button"
              >
                <Play className="h-4 w-4 mr-2" />
                {isPending ? 'Creating...' : 'Create & Start Game'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
