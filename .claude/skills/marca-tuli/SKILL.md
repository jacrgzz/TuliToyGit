---
name: marca-tuli
description: Reglas de marca, tono y texto de Tuli para toda la interfaz (landing, login, dashboard). Úsala al escribir o revisar textos y estilos de la UI.
---

# Marca y texto de Tuli

## Qué es y qué no es
Tuli muestra **coincidencias** entre condiciones del ambiente y los momentos en que un niño usa el juguete. **No diagnostica, no trata, no predice.**

- Sí: "Antes de este momento el ruido subió a 78 dB", "Estas condiciones se repitieron en 4 de 5 eventos".
- No: "El niño tuvo una crisis de ansiedad", "Tuli detectó un meltdown", "causa de la ansiedad".
- Evita lenguaje clínico. Usa "momento", "evento", "pulsación del juguete", "condiciones".
- Incluye el aviso "Tuli no es un dispositivo médico ni ofrece diagnósticos" en landing y en el registro.

## Tono
Español neutro, cálido, claro y breve. Aspecto de juguete amigable, no de aparato médico. Dirigido a padres y docentes, sin tecnicismos.

## Estilo visual
- Color principal: naranja-rojo aprox. `#DB4A2B` (confirmar con Jac), fondo blanco o crema, texto oscuro. Definir como variables CSS/Tailwind en un solo lugar.
- Semáforo: verde = tranquilo, amarillo = atención, rojo = nivel alto; nunca depender solo del color (agregar texto o icono). Umbrales en `apps/web/src/lib/thresholds.ts`.
- Mobile first, tipografía grande, bordes redondeados, contraste AA.
- Logo: ver `Tuli_Marca.pdf` (el PDF aún dice "Tilo"; en la UI siempre "Tuli").

## Privacidad en la UI
Datos de niños con alias o iniciales; en demo, solo datos simulados. Nunca mostrar ni pedir datos de identidad innecesarios.
