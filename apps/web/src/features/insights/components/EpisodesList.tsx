import { formatDateTime } from "@/lib/format";
import { episodesSummary, formatDuration, type EpisodeRow } from "../patterns";

// A7: episodios (pulsaciones cercanas agrupadas). Muestra los 8 más recientes.
export function EpisodesList({ episodes }: { episodes: EpisodeRow[] }) {
  const recent = episodes.slice(0, 8);
  return (
    <div>
      <p className="mb-3">{episodesSummary(episodes)}</p>
      {recent.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Comenzó</th>
                <th className="px-3 py-2 font-medium">Pulsaciones</th>
                <th className="px-3 py-2 font-medium">Duración</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((e) => (
                <tr key={e.started_at} className="border-b border-border last:border-0">
                  <td className="px-3 py-2">{formatDateTime(e.started_at)}</td>
                  <td className="px-3 py-2">{e.presses}</td>
                  <td className="px-3 py-2">{formatDuration(e.duration_s)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
