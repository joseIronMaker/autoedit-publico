---
name: animar-con-codigo
description: Escribe animación de autor por código para el motor `estudio/` (Remotion + Canvas 2D, sin plantillas): mundos 3D minimalistas, física, tipografía, sincronía con la voz. Úsala para escribir o corregir la animación de una pieza; el criterio narrativo está en `estudio-pieza`.
---

# Animar con código

Cada pieza es un archivo propio en `estudio/remotion/src/<pieza>/`, escrito a mano. Una animación
es una función pura `dibuja(ctx, t)`: mismo `t`, mismo cuadro. `estudio/remotion/src/perro/Perro.tsx`
es un ejemplo de lo que se puede hacer, no un molde: no copies su estructura si la idea pide otra.

`src/kit.ts` son herramientas sueltas (cámara 3D, resortes, rebotes, curvas de nivel, ruido,
disolver texto en partículas). Úsalas si sirven, escribe otras si no, y sube al kit lo que veas
repetirse dos veces.

## Flujo que funciona

1. Convierte frases del guion en tiempos con nombre (`tiempos.py` → `t.json`). Animación y sonido
   leen el mismo archivo, así nunca se desfasan.
2. Escribe el código y mira cuadros, no videos: `node tira.mjs <Comp> out/t.jpg 8 t1 t2 t3…` da una
   hoja de contacto en segundos (~0.6 s/cuadro). Renderizar todo cuesta minutos: hazlo al final.
3. Mira la hoja con ojos de espectador y corrige. Se necesitaron tres pasadas para que el piloto
   funcionara, y la primera ya tenía una escena sin dibujar.
4. Comprueba tipos con `tsc` antes de renderizar, y lanza el render al final:
   `npx remotion render src/index.ts <Comp> out/x.mp4 --browser-executable=/usr/bin/google-chrome --concurrency=6 --muted --crf=15 --pixel-format=yuv420p`

Los tiempos de Whisper fallan justo donde importa. Con un silencio dramático ("de rey... a reina")
estira la palabra anterior sobre la pausa, así que ancla los momentos clave a la palabra exacta y
revisa esos instantes. Y no le pases el guion como `initial_prompt`: alucina los primeros 30 s.

Trabaja con crítica externa: `python estudio/kit_critica.py <video.mp4>`. Acertó en lo importante
(planos parados, negro estático, afirmaciones imprecisas), pero también citó palabras que no están en
el video y un piano que no suena: su nota no sube aunque la pieza mejore, así que úsala para encontrar
fallos, no como termómetro. El termómetro es `estudio/kit_movimiento.py`.

## Lo que hace que se vea caro

- **Continuidad.** Un solo mundo que se transforma vale más que muchas escenas. Reserva el corte
  duro para el momento que lo merezca: uno solo, a negro, en el giro, pega como un golpe.
- **Física creíble.** Gravedad, rebote que se apaga, sombra de contacto que se afina al subir. El
  ojo perdona un dibujo simple, no un movimiento falso.
- **Curvas.** Nada se mueve lineal. `outExpo` para latigazos de cámara, `outBack` para lo que
  aterriza, `resorte` para lo que aparece. Ajusta cada curva a la intención del gesto.
- **Sincronía de sentido.** Cada palabra clave dispara una transformación exacta: al decir "reina"
  se enciende el punto. El gesto puede adelantarse unos cuadros a la palabra; nunca llega tarde.
- **Periodo propio.** El movimiento lento se define en segundos, no como fracción de la duración,
  o en escenas largas parece foto fija.
- **Restricción.** Fondo limpio, una tipografía con carácter, un solo color de acento usado solo
  para lo que importa. Si todo grita, nada se oye.
- **Nunca quieto.** Una respiración lenta de cámara en todo el video (`Math.sin` con periodos que no
  coincidan) evita que cualquier espera se lea como foto.
- **Lleno en celular.** Tiende a quedarte pequeño. Títulos de 100 px o más, etiquetas de 90, cámara
  cerca, y revisa que nada quede a menos de 104 px del borde derecho ni por debajo de y≈1590.

## Trampas medidas en esta máquina

- Sin GPU: **no uses `filter: blur()`, `drop-shadow()` ni `shadowBlur`** (tiran tiles y son lentos).
  Sombras y brillos con `createRadialGradient`.
- WebGL por software es muy lento; un mundo 3D minimalista se resuelve mejor proyectando geometría
  a Canvas 2D con `camara()` del kit. Si de verdad necesitas iluminación, mide antes de comprometerte.
- Espera las fuentes antes de dibujar o de muestrear texto (`delayRender` + `document.fonts.load`).
- Las mallas de contorno ancladas al MUNDO no tiemblan al mover la cámara; las ancladas a pantalla sí.
- Un render cortado deja Chrome huérfano que degrada los siguientes (`ps -eo ppid,etime,comm | grep chrome`).
- `render` sin `--muted` y con audio embebido complica la mezcla: el sonido se une al final con ffmpeg.
