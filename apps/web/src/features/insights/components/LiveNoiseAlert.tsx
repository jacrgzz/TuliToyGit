// C2: aviso en vivo. Una sugerencia sobre el ambiente, en lenguaje neutral. role="status": los
// lectores de pantalla lo anuncian sin interrumpir. Se actualiza solo con cada lectura (LiveRefresh).
export function LiveNoiseAlert({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="status" className="rounded-xl border border-attention bg-attention/10 p-4">
      <p className="font-semibold">Ruido alto en el salón ahora</p>
      <p className="mt-1 text-sm">{message}</p>
    </div>
  );
}
