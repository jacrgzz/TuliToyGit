import { handleIngest } from "@/features/ingest/handle";

// Ruta delgada: toda la lógica vive en features/ingest.
export async function POST(request: Request) {
  return handleIngest(request);
}
