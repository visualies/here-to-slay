import { notFound } from "next/navigation";
import { GameBoard } from "./game-board";
import { UserProvider } from "@/contexts/user-context";
import { getServerUserData } from "@/lib/server-user";

interface RoomPageProps {
  params: {
    roomId: string;
  };
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { roomId } = params;

  // Validate room ID format (should be 6 characters)
  if (!roomId || roomId.length !== 6) {
    notFound();
  }

  // Get server user data
  const serverUser = await getServerUserData();

  return (
    <UserProvider initialUser={serverUser.playerId ? serverUser : null}>
      <GameBoard roomId={roomId} user={serverUser} />
    </UserProvider>
  );
}