import { createClient } from "@/lib/supabase/server";
import { PATTERNS } from "@/lib/thresholds";

// Patrones calculados en SQL (función child_patterns); aquí solo se consulta.
export async function getChildPatterns(childId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("child_patterns", {
    p_child: childId,
    p_days: PATTERNS.days,
    p_noise: PATTERNS.noiseHigh,
    p_light_swing: PATTERNS.lightSwing,
  });
  if (error) throw new Error(`No se pudieron calcular los patrones: ${error.message}`);
  return data?.[0] ?? null;
}

export type ChildPatterns = NonNullable<Awaited<ReturnType<typeof getChildPatterns>>>;
