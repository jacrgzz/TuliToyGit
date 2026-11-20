import { createClient } from "@/lib/supabase/server";
import { listToyStatus } from "@/features/devices/queries";
import { liveNoiseMessage } from "@/features/insights/alerts";
import { getLiveNoise } from "@/features/insights/queries";
import { navItemsFor } from "./nav-items";
import { visibleChildren } from "./room";
import { buildNotices, searchIndex } from "./top-bar";
import { TopBarClient } from "./TopBarClient";

// Barra superior: búsqueda (secciones y niños visibles) y campana de avisos. Lee cookies: usar dentro
// de <Suspense>. Se actualiza con cada lectura nueva porque LiveRefresh refresca toda la ruta.
export async function TopBar() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  const [{ role, kids, room }, toys] = await Promise.all([visibleChildren(), listToyStatus()]);
  const live = role === "teacher" && room ? liveNoiseMessage(await getLiveNoise(room.id), []) : null;

  return (
    <TopBarClient
      items={searchIndex(navItemsFor(role), kids, role)}
      notices={buildNotices({ liveMessage: live, kids, toys, role })}
    />
  );
}
