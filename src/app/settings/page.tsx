import { MenuModal } from "@/components/modals/menu-modal";
import { getServerUserData } from "@/lib/server-user";

export default async function SettingsPage() {
  const user = await getServerUserData();
  
  return <MenuModal user={user} />;
}
