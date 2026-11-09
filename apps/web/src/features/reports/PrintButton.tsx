"use client";

// Imprimir o guardar como PDF con el diálogo del navegador (sin librerías de PDF).
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark"
    >
      Imprimir o guardar como PDF
    </button>
  );
}
