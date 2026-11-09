// Las horas que escribe el docente son de México. México no usa horario de verano desde octubre de
// 2022 (UTC−6 todo el año; la franja fronteriza es la excepción). Los formularios usan
// <input type="datetime-local"> ("YYYY-MM-DDTHH:mm") y la base guarda UTC.
const OFFSET = "-06:00";
const LOCAL_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function isLocalInput(value: string) {
  return LOCAL_RE.test(value) && !Number.isNaN(new Date(`${value}:00${OFFSET}`).getTime());
}

// "2026-11-04T10:30" (hora de México) → "2026-11-04T16:30:00.000Z"
export function localInputToUtcISO(value: string) {
  return new Date(`${value}:00${OFFSET}`).toISOString();
}

// ISO UTC → valor para <input type="datetime-local"> en hora de México
export function utcToLocalInput(iso: string) {
  const d = new Date(new Date(iso).getTime() - 6 * 3600_000);
  return d.toISOString().slice(0, 16);
}
