---
name: cuento-animado
description: Produce un cuento humanista ilustrado estilo r2 (personajes consistentes, narración emotiva, cuadros animados con Nano Banana y Gemini Omni). Úsala cuando la idea sea una historia humana o moral, no un mecanismo. Aún NO se ha probado de punta a punta en este motor.
---

# Cuento animado

Pipeline diseñado en noviembre de 2026 a partir de la documentación oficial. **Aún no se ha
ejecutado**: mide costos y calidad con un capítulo corto antes de comprometer una serie.

## Lo que aprender de r2

- Empieza con una afirmación que el espectador cree conocer y rómpela en segundos con un hecho.
- La historia es de **"tú"**: el narrador le habla al espectador, no le cuenta sobre otro.
- Un **hilo visual diminuto** une todo (la lágrima dorada) y permite que el ojo adivine antes que el oído.
- Pasa de víctima a verdugo: la empatía ganada se vuelve contra quien mira.
- Termina en un gesto mínimo y cotidiano, no en una moraleja dicha.

r2 adapta un cuento ajeno ("The Egg" de Andy Weir). Aquí las historias deben ser originales: se
aprende la mecánica, no el relato.

## Producción

1. **Guion** como pide `estudio-pieza`, y voz primero. Cada plano dura lo que dura su frase.
2. **Biblia visual:** hoja de personaje y una paleta simbólica (frío para el mundo real, otro color
   para lo imposible, un acento que signifique algo).
3. **Cuadro clave por plano** con `gemini-3-pro-image` (hasta 14 referencias: 5 de personaje y 3 de
   estilo, $0.134/imagen). Revisa la continuidad antes de animar: es la parte barata.
4. **Anima** solo lo que lo necesita con `gemini-omni-1.1-flash`: `<FIRST_FRAME>` + `<IMAGE_REF_0>`, con
   "No dialogue" en el prompt. Clips de 3-10 s a 24 fps, 9:16, ~$0.10/s a 720p. Solo inglés evaluado.
5. **Híbrido más barato:** muchos planos pueden ser el cuadro clave con un empujón de cámara o parallax
   en código, reservando Omni para la acción. Un capítulo de 28 planos todo en Omni ronda los $15.
6. **Sonido:** piano o cuerdas mínimas, lluvia, objetos que caen. La voz va 12-15 dB por encima de todo.

## Trampas

- El español hablado en Omni es el punto débil: voz siempre aparte.
- Con `task="extend"` no se admiten referencias.
- La documentación no aclara el máximo de imágenes de referencia en Omni: compruébalo.
- Los personajes de estilo realista pueden exigir la etiqueta de contenido generado por IA en TikTok.
