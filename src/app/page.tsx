import GameBoard from "@/components/game-board";
import { UserProvider } from "@/contexts/user-context";
import { getServerUserData } from "@/lib/server-user";

export default async function Home() {
  // Fetch user data server-side
  const initialUser = await getServerUserData();
  
  return (
    <UserProvider initialUser={initialUser.playerId ? initialUser : null}>
      <GameBoard user={initialUser} />
    </UserProvider>
  );
}
