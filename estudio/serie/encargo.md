# Encargo para animar un capítulo de «Cómo aprende una máquina»

Eres el animador y director de UN capítulo. José ya aprobó el nivel ("está precioso"): tu trabajo es
igualarlo con una idea visual propia, no repetir la del perro.

## Lee antes de empezar
1. `.claude/skills/estudio-pieza/SKILL.md` y `.claude/skills/animar-con-codigo/SKILL.md`
2. `estudio/serie/biblia.md`: la identidad de la serie y la imagen central de tu capítulo
3. `estudio/remotion/src/serie/c01/Pieza.tsx` y `estudio/serie/c01_error/partitura.py`: ejemplo reciente
   de cómo se escribe una pieza con la base común. Son una referencia, no un molde
4. `estudio/remotion/src/marca.tsx` y `src/kit.ts`: lo que ya tienes a mano
5. Tu guion: `estudio/serie/<id>/guion.txt`

## Cómo se trabaja
Trabaja siempre con rutas absolutas o desde `/home/jose/tiktok/estudio/remotion`, y usa los binarios
locales: `./node_modules/.bin/tsc`, no `npx`.

1. Escribe `estudio/serie/<id>/partitura.py`. Decide las `pausas` que hagan falta para que la imagen
   respire, y corre `.venv/bin/python estudio/serie/<id>/partitura.py` desde `/home/jose/tiktok`.
   Eso deja `palabras.json` y `duracion.json` en `estudio/remotion/src/serie/<cNN>/`.
2. Escribe `estudio/remotion/src/serie/<cNN>/Pieza.tsx` (exporta `DURACION` y `Pieza`; `index.ts` ya existe).
3. Comprueba tipos:
   `./node_modules/.bin/tsc --noEmit --jsx react-jsx --esModuleInterop --resolveJsonModule --skipLibCheck --target es2022 --moduleResolution bundler --module esnext --lib es2023,dom src/serie/<cNN>/index.ts`
4. Mira cuadros: `ENTRADA=src/serie/<cNN>/index.ts node tira.mjs <CNN> out/<cNN>_a.jpg 8 t1 t2 t3 …` y abre
   el jpg con Read. Usa unos 30-40 instantes repartidos por todo el video. **Míralo de verdad** y
   corrige. Haz al menos tres pasadas: la primera siempre tiene fallos.
5. Cuando esté bien, corre `/home/jose/tiktok/estudio/kit_termina.sh <id>` en segundo plano
   (`run_in_background`): hace cola, porque solo hay un render a la vez, y puede tardar más de 10 min.
   Termina con `kit_verifica.py`. Si no pasa, corrige y repite.

## Lo que no se negocia
- **El primer cuadro ya se mueve y ya engancha.** La voz arranca en el segundo 0. En los primeros 3 s debe
  pasar algo físico. Ahí perdemos a la gente: la mayoría se va en 0:01-0:02.
- **Nunca quieto.** Mide con `estudio/kit_movimiento.py`. Objetivo: menos de 15% parado, mediana cerca de 1.4.
  Una hoja de cuadros no lo revela: el capítulo 1 se veía bien en cuadros y midió 56% parado. Funciona: deriva
  lenta de todo el cuadro con `translate`, `scale` y `rotate` mínimos; una capa muy tenue de algo que flote
  detrás; vibración de dibujo a mano en las líneas (posición al azar sembrada con `Math.floor(t * 10)`).
- **Audio sin cortes:** escucha no puedes, así que comprueba que `partitura.py` no imprima `AVISO: la pausa`. Cada
  pausa se pega en el silencio entre dos frases, y una frase que empieza con música nueva arranca con fundido.
- **Final cerrado:** frase completa, gesto visual que remate y música que se apaga. Deja `cola` de al menos
  2 s. José ya vio un final en suspenso y dijo "se cortó".
- **Sin encimar texto** con texto ni con objetos. Cada hoja de contacto se revisa buscando eso.
- **Legible en celular.** Títulos de 100 px o más, nada bajo y≈1590 ni a menos de 104 px del borde derecho.
- **Sin subtítulos corridos**, y sin hacer leer frases largas mientras la voz dice otra cosa.
- **Sonido con peso**, sincronizado con cada acción. Música: `musica/<id>.mp3`, ya comprobada sin voces.
- Un corte a negro por capítulo como máximo, y solo si hay un giro que lo merezca.
- Rigor: si una imagen sugiere algo falso, cámbiala. Nada de cifras decorativas inventadas que parezcan datos reales.

## Lo que no debes tocar
- El texto del guion. Si crees que algo es incorrecto, dilo en tu reporte.
- Archivos comunes: `kit.ts`, `marca.tsx`, `kit_sonido.py`, `tira.mjs`, y los de otros capítulos. Si necesitas una
  herramienta nueva, escríbela dentro de tu `Pieza.tsx`.
- Nada de TikTok, nada de publicar, nada de commits.
- Varios capítulos se producen a la vez y comparten el scratchpad: todo log o temporal tuyo lleva tu id en el nombre
  (`termina_a12.log`, no `termina1.log`). Un nombre genérico pisó el log de otro capítulo el 2-nov.

## Tu reporte final
Máximo 8 líneas: la idea visual, lo que mide `kit_verifica.py`, y qué quedó débil con honestidad. No
digas que está bien si no abriste los cuadros.

## Si tu capítulo es de la serie 2 («Cómo actúa una máquina», ids a01-a30 más a03b, a06b y a06c)
- La biblia es `estudio/serie/biblia2.md`, no `biblia.md`. Tu guion se escribió para cualquier persona, sin código en pantalla: nunca pongas JSON ni terminales.
- Mira `estudio/remotion/src/serie/a01/Pieza.tsx`, y también `c03` y `c02`, que son el listón.
- El personaje es uno solo: importa `agente` y `brazo` de `src/personaje.ts` y no lo redibujes. La bola con manos debe protagonizar, y el encargo de la fiesta debe verse cuando el guion lo cite.
- Técnicamente correcto, entendible: primero se ve lo que pasa, después aparece el término real. Respeta las reglas de rigor de `biblia2.md`.
- Si `kit_verifica` marca arranque flojo, míralo por ventanas de 0.5 s en los primeros 3.5 s: el objetivo es que ninguna baje de 1.5 y que el promedio supere 4.
- Con un render colgado no mates nada: `kit_termina` lo corta solo a los 25 minutos.
