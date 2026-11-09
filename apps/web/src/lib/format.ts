// Formato de fechas en español y zona horaria de México (el servidor corre en UTC).
const TZ = "America/Mexico_City";

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// Fecha y hora sin segundos (para lo que escribe el docente: bitácora, ajustes).
export function formatDateTimeShort(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ¿Pasó más de `ms` desde `iso`? Helper aparte para no llamar Date.now() dentro de componentes.
export function isOlderThan(iso: string, ms: number, now: number = Date.now()) {
  return now - new Date(iso).getTime() > ms;
}

// "hace 12 s", "hace 3 min", "hace 2 h". Usa la hora actual: solo en componentes dinámicos.
export function timeAgo(iso: string, now: number = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `hace ${s} s`;
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return `hace ${Math.round(s / 86400)} d`;
}

// Antigüedad en milisegundos de un instante ISO. Vive aquí (y no en un componente) porque usa la hora actual.
export function ageMs(iso: string) {
  return Date.now() - new Date(iso).getTime();
}
