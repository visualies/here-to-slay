import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Swords, LogIn, Settings } from "lucide-react";
import Link from "next/link";
import type { ServerUser } from "@/lib/server-user";

interface MenuModalProps {
  user: ServerUser | null;
}

export function MenuModal({ user }: MenuModalProps) {

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
          <div className="flex items-center justify-center gap-2 mb-2">
            <Swords className="h-8 w-8 text-amber-600" />
            <h1 className="text-3xl">Here to Slay</h1>
          </div>
          <CardDescription>A strategic card game. A role-playing adventure. <br /> A dangerous new world.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Button
              asChild
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              size="lg"
              data-testid="create-room-button"
            >
              <Link href="/create-room" prefetch={true}>Create Room</Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="w-full border-amber-600 text-amber-700 hover:bg-amber-50"
              size="lg"
              data-testid="join-existing-room-button"
            >
              <Link href="/join-room" prefetch={true}>
                <LogIn className="h-4 w-4 mr-2" />
                Join Existing Room
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="w-full border-amber-600 text-amber-700 hover:bg-amber-50"
              size="lg"
            >
              <Link href="/settings" prefetch={true}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Link>
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Roll dice with friends in real-time!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
