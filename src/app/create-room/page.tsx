import { CreateRoomModal } from "@/components/modals/create-room-modal";
import { getServerUserData } from "@/lib/server-user";

export default async function CreateRoomPage() {
  const user = await getServerUserData();
  
  return <CreateRoomModal user={user} />;
}
