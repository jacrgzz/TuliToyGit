// B1: elegir el día de la línea del día. Formulario GET (sin JavaScript): conserva ?dias=.
export function DaySelector({ day, days, basePath }: { day: string; days: number; basePath: string }) {
  return (
    <form action={basePath} method="get" className="flex items-center gap-2 text-sm">
      <input type="hidden" name="dias" value={days} />
      <label className="flex items-center gap-2 text-muted">
        Día
        <input
          type="date"
          name="dia"
          defaultValue={day}
          className="rounded-lg border border-border bg-white px-2 py-1 text-foreground"
        />
      </label>
      <button type="submit" className="rounded-lg border border-border bg-white px-3 py-1 hover:bg-gray-50">
        Ver
      </button>
    </form>
  );
}
