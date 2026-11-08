# Tuli Toy: Not A Regular Toy

Juguete fidget + caja multisensor + PWA que muestra qué condiciones del ambiente (ruido, luz, temperatura, humedad) coinciden con los momentos en que un niño usa el juguete. Tuli no diagnostica ni trata nada.

- `apps/web`: PWA y API (Next.js + Supabase)
- `supabase`: migraciones y políticas RLS
- `tools/simulator`: simulador de dispositivos
- `firmware`: ESP32 (juguete y caja)
- `docs`: arquitectura, contrato de datos, IoT y plan

Arranque local: `cd apps/web && npm install && npm run dev`. Copia `.env.example` a `apps/web/.env.local` y llena los valores.
