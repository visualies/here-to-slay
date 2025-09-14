import GameBoard from "@/components/game-board";
import { getServerUserData } from "@/lib/server-user";

export default async function Home() {
  // Fetch user data server-side
  const initialUser = await getServerUserData();

  return <GameBoard user={initialUser} />;
}
