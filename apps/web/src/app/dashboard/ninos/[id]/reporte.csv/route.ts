import { getChild } from "@/features/children/queries";
import { listEventsSince } from "@/features/events/queries";
import { eventsToCsv, reportFileName } from "@/features/reports/csv";
import { parsePeriod } from "@/lib/period";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Descarga los momentos de un niño en CSV. /dashboard está protegido por el proxy y, además, todo se
// consulta con el cliente del usuario: si no puede ver al niño (RLS), responde 404 sin revelar nada.
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new Response("No encontrado", { status: 404 });

  const days = parsePeriod(new URL(request.url).searchParams.get("dias") ?? undefined);
  const child = await getChild(id);
  if (!child) return new Response("No encontrado", { status: 404 });

  const events = await listEventsSince(child.id, days);
  return new Response(eventsToCsv(events), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${reportFileName(child.display_name, days)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
