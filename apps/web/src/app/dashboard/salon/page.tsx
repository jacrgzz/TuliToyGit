import { Suspense } from "react";
import { parsePeriod } from "@/lib/period";
import { NoiseSection, ProfilesSection } from "../_components/ClassroomSections";
import { requireTeacherRoom } from "../_components/room";

async function Room({ searchParams }: { searchParams: PageProps<"/dashboard/salon">["searchParams"] }) {
  const [room, sp] = await Promise.all([requireTeacherRoom(), searchParams]);
  const days = parsePeriod(sp.dias);
  if (!room) return <p className="rounded-xl border border-border bg-white p-4">Todavía no tienes un salón vinculado a tu cuenta.</p>;
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Mi salón · {room.name}</h1>
      <ProfilesSection classroomId={room.id} days={days} basePath="/dashboard/salon" />
      <NoiseSection classroomId={room.id} days={days} />
    </div>
  );
}

export default function SalonPage(props: PageProps<"/dashboard/salon">) {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Room searchParams={props.searchParams} />
    </Suspense>
  );
}
