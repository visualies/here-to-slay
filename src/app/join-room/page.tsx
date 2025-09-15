import { JoinRoomModal } from "@/components/modals/join-room-modal";
import { getServerUserData } from "@/lib/server-user";

export default async function JoinRoomPage() {
  const user = await getServerUserData();

  return <JoinRoomModal user={user} />;
}