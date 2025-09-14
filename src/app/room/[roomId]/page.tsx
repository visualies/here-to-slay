import { notFound } from "next/navigation";
import { GameBoard } from "./game-board";
import { RoomProvider } from "@/contexts/room-context";

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

  return (
    <RoomProvider roomId={roomId}>
      <GameBoard />
    </RoomProvider>
  );
}