import Link from "next/link";
import { formatDateTime, isOlderThan, timeAgo } from "@/lib/format";
import {
  getAdminOverview,
  listAdminClassrooms,
  listAdminDevices,
  listAdminUsers,
  listIngestLog,
} from "../queries";

const ONLINE_MS = 2 * 60 * 1000; // visto en los últimos 2 min = en línea

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold">{title}</h2>
      {hint && <p className="mb-3 text-sm text-muted">{hint}</p>}
      {!hint && <div className="mb-3" />}
      {children}
    </section>
  );
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="card">
      <p className="text-sm text-muted">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${warn && value > 0 ? "text-high" : ""}`}>{value}</p>
    </div>
  );
}

const th = "px-3 py-2 font-medium";
const td = "px-3 py-2";
const table = "overflow-x-auto card-flat";

// Debe renderse en un contexto dinámico (usa la hora actual y cookies).
export async function AdminPanel() {
  const [overview, devices, rooms, users, log] = await Promise.all([
    getAdminOverview(),
    listAdminDevices(),
    listAdminClassrooms(),
    listAdminUsers(),
    listIngestLog(),
  ]);

  return (
    <div className="space-y-10">
      <Section title="Resumen" hint="Datos de todo el sistema. El admin solo puede leer.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Salones" value={overview.classrooms} />
          <Stat label="Niños" value={overview.children} />
          <Stat label="Dispositivos" value={overview.devices} />
          <Stat label="Momentos (24 h)" value={overview.events24h} />
          <Stat label="Lecturas (1 h)" value={overview.readings1h} />
          <Stat label="Errores de ingesta (24 h)" value={overview.ingestErrors24h} warn />
        </div>
      </Section>

      <Section title="Salones y niños" hint="Abre cualquier vista como la ve cada rol.">
        <ul className="grid gap-3 sm:grid-cols-2">
          {rooms.map((r) => (
            <li key={r.id} className="card">
              <Link href={`/dashboard/salones/${r.id}`} className="text-lg font-semibold text-brand hover:underline">
                {r.name} · vista del docente
              </Link>
              <ul className="mt-2 space-y-1 text-sm">
                {r.children.map((c) => (
                  <li key={c.id}>
                    <Link href={`/dashboard/ninos/${c.id}/resumen`} className="hover:underline">
                      {c.display_name} · vista del tutor
                    </Link>
                  </li>
                ))}
                {r.children.length === 0 && <li className="text-muted">Sin niños</li>}
              </ul>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm">
          <Link href="/demo" className="text-brand hover:underline">
            Modo demo (teléfono como juguete y caja) →
          </Link>
        </p>
      </Section>

      <Section title="Dispositivos" hint="En línea = envió datos en los últimos 2 minutos.">
        <div className={table}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className={th}>Dispositivo</th>
                <th className={th}>Tipo</th>
                <th className={th}>Vinculado a</th>
                <th className={th}>Última señal</th>
                <th className={th}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => {
                const online = d.last_seen_at !== null && !isOlderThan(d.last_seen_at, ONLINE_MS);
                return (
                  <tr key={d.device_id} className="border-b border-border last:border-0">
                    <td className={`${td} font-mono`}>{d.device_id}</td>
                    <td className={td}>{d.kind === "toy" ? "Juguete" : "Caja"}</td>
                    <td className={td}>{d.linkedTo}</td>
                    <td className={td}>{d.last_seen_at ? timeAgo(d.last_seen_at) : "Nunca"}</td>
                    <td className={td}>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                          online ? "border-transparent bg-calm/10 text-calm" : "border-border text-muted"
                        }`}
                      >
                        {online ? "En línea" : "Sin señal"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Usuarios" hint="Quién está registrado y a qué niños o salones está vinculado.">
        <div className={table}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className={th}>Correo</th>
                <th className={th}>Nombre</th>
                <th className={th}>Vínculos</th>
                <th className={th}>Alta</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className={td}>{u.email ?? "—"}</td>
                  <td className={td}>{u.full_name ?? "—"}</td>
                  <td className={td}>
                    {u.links.length > 0 ? u.links.join(", ") : <span className="text-muted">Sin vínculos (no ve datos)</span>}
                  </td>
                  <td className={td}>{formatDateTime(u.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Registro de ingesta" hint="Últimas peticiones de dispositivos a /api/ingest: ideal para depurar el IoT.">
        <div className={table}>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className={th}>Hora</th>
                <th className={th}>Dispositivo</th>
                <th className={th}>Tipo</th>
                <th className={th}>Código</th>
                <th className={th}>Resultado</th>
                <th className={th}>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {log.map((l) => (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className={`${td} whitespace-nowrap`}>{formatDateTime(l.received_at)}</td>
                  <td className={`${td} font-mono`}>{l.device_id ?? "—"}</td>
                  <td className={td}>{l.type ?? "—"}</td>
                  <td className={td}>{l.status}</td>
                  <td className={td}>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                        l.outcome === "ok"
                          ? "border-transparent bg-calm/10 text-calm"
                          : l.outcome === "duplicate"
                            ? "border-transparent bg-attention/10 text-attention"
                            : "border-transparent bg-high/10 text-high"
                      }`}
                    >
                      {l.outcome}
                    </span>
                  </td>
                  <td className={`${td} text-muted`}>{l.detail ?? ""}</td>
                </tr>
              ))}
              {log.length === 0 && (
                <tr>
                  <td className={`${td} text-muted`} colSpan={6}>
                    Todavía no hay peticiones registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
