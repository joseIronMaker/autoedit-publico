import React from 'react';
import {OffthreadVideo, Img, Sequence, interpolate, random, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Theme} from '../theme';

// ─────────────────────────────────────────────────────────────────────────────
// CAPA DE FONDO del panel inferior (1080x1026). No dibuja texto: se monta DETRÁS
// de cualquier kind de panel.
//
// POR QUÉ EXISTE: de los 117 paneles de los últimos seis videos, 71 (61%) eran
// texto sobre el MISMO degradado plano con el MISMO halo y los MISMOS 10 puntitos
// (José, 23-ago-2026: "todos tus videos se ven monótonos"). Un titular sobre un
// degradado muerto se ve barato aunque el titular sea bueno; el fondo es la mitad
// de la producción. Tres modos: clip pagado, foto editorial y trama generada.
//
// Zonas del panel (medidas en Panel.tsx, no re-derivar):
//   SUB_ZONE=168 px arriba  → ahí se queman los subtítulos ASS (velo MÁS denso)
//   SAFE_BOTTOM=330 px abajo→ TikTok tapa eso con usuario/copy
// El texto del panel vive entre esas dos franjas, así que el velo también carga
// ahí en medio.
//
// COSTE, para quien lo cablee: `modo:'clip'` monta UN OffthreadVideo y `modo:'foto'` UN Img.
// No pongas un fondo 'clip' debajo de un panel kind:'clip', ni un fondo 'foto' debajo de un
// kind:'photo' de varias imágenes: dos videos a la vez (o más de 4 imágenes) tiran los fps
// de render. Esos dos kinds YA traen su propio material a pantalla completa y no necesitan
// fondo; el fondo es para los paneles de TEXTO, que son el 61% del problema.
// ─────────────────────────────────────────────────────────────────────────────

const SUB_ZONE = 168;
const SAFE_BOTTOM = 330;

export const TRAMAS = ['malla', 'polvo', 'barrido', 'ondas'] as const;
export type TramaVariante = (typeof TRAMAS)[number];

export type FondoSpec =
  // clip .mp4 YA PAGADO de la biblioteca (videos/_clips_pagados/…): nunca se genera uno nuevo
  | {kind: 'fondo'; modo: 'clip'; video: string; intensidad?: number; clip_dur?: number;
     foco?: 'arriba' | 'centro' | 'abajo'}
  // foto editorial de Codex ($0) con Ken Burns
  | {kind: 'fondo'; modo: 'foto'; image: string; intensidad?: number;
     foco?: 'arriba' | 'centro' | 'abajo'; seed?: string}
  // sin material: trama generada que SÍ se mueve
  | {kind: 'fondo'; modo: 'trama'; variante?: TramaVariante; intensidad?: number; seed?: string};

// Alternador determinista para que dos paneles seguidos NUNCA lleven la misma trama.
// Lo usa el generador: variantePorIndice(i) sobre el índice de escena.
export const variantePorIndice = (i: number): TramaVariante => TRAMAS[((i % TRAMAS.length) + TRAMAS.length) % TRAMAS.length];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
// módulo SIEMPRE positivo (el % de JS conserva el signo y rompe los bucles que van al revés)
const wrap = (v: number, span: number) => ((v % span) + span) % span;
// alpha en sufijo hex (#RRGGBBAA): el Theme guarda HEX justo para esto
const a = (hex: string, alpha: number) =>
  hex + Math.round(clamp01(alpha) * 255).toString(16).padStart(2, '0').toUpperCase();

const objPos = (foco?: 'arriba' | 'centro' | 'abajo') =>
  foco === 'arriba' ? '50% 12%' : foco === 'abajo' ? '50% 88%' : '50% 50%';

export const Fondo: React.FC<{spec: FondoSpec; th: Theme; frame: number; fps: number; dur?: number}> = ({
  spec, th, frame, fps, dur,
}) => {
  const {durationInFrames, width, height} = useVideoConfig();
  const total = Math.max(1, dur ?? durationInFrames);
  const t = frame / fps;
  // SEMILLA POR PANEL. Antes, sin `seed` en el spec, caía en `spec.modo`: la MISMA cadena
  // en todos los paneles del video, o sea todas las fotos con el mismo Ken Burns y todas
  // las tramas con la misma variante (siempre la que saliera de random('trama')) — justo
  // la monotonía que este componente existe para romper. El respaldo ahora usa algo que SÍ
  // cambia entre paneles: la ruta del asset, y en la trama la duración del panel. Aun así,
  // lo correcto desde el generador es mandar `seed` o `variante` (variantePorIndice(i)).
  const seed =
    'seed' in spec && spec.seed
      ? spec.seed
      : spec.modo === 'foto'
        ? `foto-${spec.image}`
        : spec.modo === 'clip'
          ? `clip-${spec.video}`
          : `trama-${total}`;

  return (
    // fondo OPACO siempre: si el clip o la foto tardan un frame en resolver, no se ve
    // un agujero negro sino la base de marca.
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden',
                 background: `linear-gradient(176deg, ${th.bgTop} 0%, ${th.bgBottom} 100%)`}}>
      {spec.modo === 'clip' ? <ClipFondo spec={spec} th={th} frame={frame} fps={fps} total={total} /> : null}
      {spec.modo === 'foto' ? <FotoFondo spec={spec} th={th} frame={frame} total={total} seed={seed} /> : null}
      {spec.modo === 'trama' ? (
        <Trama variante={spec.variante ?? variantePorIndice(Math.floor(random(seed) * TRAMAS.length))}
               th={th} t={t} frame={frame} total={total} w={width} h={height} seed={seed} />
      ) : null}

      {spec.modo === 'trama' ? (
        <VeloSuave th={th} intensidad={spec.intensidad ?? 0.35} />
      ) : (
        <Velo th={th} intensidad={spec.intensidad ?? 0.6} />
      )}
    </div>
  );
};

// ───────────────────────────── modo clip ─────────────────────────────

// El clip pagado dura ~4 s y el panel puede durar 18. PING-PONG por tiempo (ida y
// vuelta), no loop:
//   · el loop mete un CORTE cada 4 s — la imagen salta de golpe y se lee como bug;
//   · el ping-pong es continuo en posición (solo invierte la velocidad), así que la
//     costura es invisible, y además DUPLICA el periodo (8 s en vez de 4), o sea la
//     mitad de repeticiones perceptibles en el mismo panel.
// Se implementa remapeando el frame de ORIGEN, sin re-generar ni re-codificar nada.
// OffthreadVideo es sin estado (extrae el frame por tiempo en cada render), así que
// saltar hacia atrás es legal y determinista; lo único que hay que hacer es meterlo en
// un <Sequence> cuyo `from` desplace su frame local hasta el frame de origen deseado.
//
// El `frame` de props es el del PANEL (lo manda Panel.tsx) y decide la fase del ping-pong;
// el desfase del <Sequence> se calcula con useCurrentFrame(), que es el frame del contexto
// donde Fondo esté montado. Así el clip no se desplaza aunque mañana cuelgue de otro
// <Sequence>. VERIFICADO tras el cambio (frames 112-126, clip de 4.01 s a 30 fps): las
// luminancias siguen siendo un palíndromo alrededor del giro (24.61 en f118, una sola vez),
// sin frames negros ni congelados.
const ClipFondo: React.FC<{
  spec: Extract<FondoSpec, {modo: 'clip'}>; th: Theme; frame: number; fps: number; total: number;
}> = ({spec, th, frame, fps, total}) => {
  // `from` de un <Sequence> se interpreta en el frame del CONTEXTO actual, no en el de la
  // composición: si Fondo termina montado dentro de otro <Sequence>, restar el `frame` que
  // llega por props desplazaría el clip. useCurrentFrame() da siempre el frame del contexto,
  // así que el desfase sale correcto esté donde esté montado (y es idéntico al de antes
  // cuando Fondo cuelga de la raíz, que es el caso de Panel.tsx).
  const ctxFrame = useCurrentFrame();
  // -1 frame de margen: si el caller redondea `clip_dur` hacia arriba, pedir el frame que
  // no existe no degrada — Remotion aborta el render entero con "Could not extract frame".
  const L = Math.max(2, Math.floor((spec.clip_dur ?? 4) * fps) - 1);   // largo útil en frames
  const periodo = 2 * (L - 1);
  const m = wrap(frame, periodo);
  const srcFrame = m < L ? m : periodo - m;                        // ida y vuelta

  // movimiento propio lento del encuadre, repartido en TODO el panel (si fuera de 20
  // frames, un panel de 500 se quedaría 480 congelado — ese bug ya se pagó dos veces)
  const z = interpolate(frame, [0, total], [1.06, 1.14], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const dx = interpolate(frame, [0, total], [0, -18], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <Sequence from={ctxFrame - srcFrame} durationInFrames={L} layout="none">
      <OffthreadVideo
        src={staticFile(spec.video)}
        muted
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: objPos(spec.foco),
          transform: `scale(${z}) translateX(${dx}px)`,
          backgroundColor: th.bgBottom,
        }}
      />
    </Sequence>
  );
};

// ───────────────────────────── modo foto ─────────────────────────────

const FotoFondo: React.FC<{
  spec: Extract<FondoSpec, {modo: 'foto'}>; th: Theme; frame: number; total: number; seed: string;
}> = ({spec, th, frame, total, seed}) => {
  // La dirección del Ken Burns sale de la semilla: dos paneles con foto seguidos no
  // se mueven igual. random() de remotion (determinista), nunca Math.random().
  const dir = random(`kb-${seed}`) > 0.5 ? 1 : -1;
  const vert = random(`kbv-${seed}`) > 0.5 ? 1 : -1;
  const z = interpolate(frame, [0, total], [1.05, 1.17], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const px = interpolate(frame, [0, total], [0, dir * 26], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const py = interpolate(frame, [0, total], [0, vert * 16], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Img
      src={staticFile(spec.image)}
      style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        objectFit: 'cover', objectPosition: objPos(spec.foco),
        transform: `scale(${z}) translate(${px}px, ${py}px)`,
        backgroundColor: th.bgBottom,
      }}
    />
  );
};

// ───────────────────────────── velo de legibilidad ─────────────────────────────

// OBLIGATORIO sobre clip y foto: el texto del panel es blanco y una foto clara se lo
// come. Todo con linear-gradient / radial-gradient: PROHIBIDO blur() (en WSL2 el
// raster por software tira tiles y deja rectángulos opacos, y va 2.5x más lento).
// `intensidad` 0..1 sube o baja el velo entero (0.6 = calibrado por defecto).
const Velo: React.FC<{th: Theme; intensidad: number}> = ({th, intensidad}) => {
  // MEDIDO en el probe (captura de fondo blanco, luminancia media 246): con el velo por
  // defecto la banda de texto tiene que bajar a ~70 de luminancia para que el titular
  // blanco se lea. De ahí sale esta escala: intensidad 0.6 = velo calibrado (f=1),
  // 0.3 = "deja respirar la imagen", 1 = foto muy clara o clip muy contrastado.
  const f = 0.25 + clamp01(intensidad) * 1.25;
  const c = th.bgBottom;
  const topH = SUB_ZONE + 130;
  const corte = (SUB_ZONE / topH) * 100;      // dónde deja de ser denso: justo bajo los subtítulos
  return (
    <>
      {/* 0. base plana: sin ella, sobre una foto clara el titular queda ilegible */}
      <div style={{position: 'absolute', inset: 0, background: a(c, 0.38 * f)}} />
      {/* 1. franja de SUBTÍTULOS: la más densa de todas (ahí se queman los ASS) */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: topH,
                   background: `linear-gradient(180deg, ${a(c, 0.74 * f)} 0%, ${a(c, 0.6 * f)} ${corte}%, ${a(c, 0)} 100%)`}} />
      {/* 2. banda del TEXTO del panel (entre SUB_ZONE y SAFE_BOTTOM): peso en el centro */}
      <div style={{position: 'absolute', left: 0, right: 0, top: SUB_ZONE, bottom: SAFE_BOTTOM - 60,
                   background: `linear-gradient(180deg, ${a(c, 0)} 0%, ${a(c, 0.58 * f)} 38%, ${a(c, 0.6 * f)} 66%, ${a(c, 0.1 * f)} 100%)`}} />
      {/* 3. pie: la imagen sangra hasta el borde pero se hunde en el fondo */}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: SAFE_BOTTOM + 240,
                   background: `linear-gradient(0deg, ${a(c, 0.86 * f)} 0%, ${a(c, 0.42 * f)} 46%, ${a(c, 0)} 100%)`}} />
      {/* 4. viñeta: apaga las esquinas para que el centro mande (look documental) */}
      <div style={{position: 'absolute', inset: 0,
                   background: `radial-gradient(ellipse 78% 62% at 50% 42%, ${a(c, 0)} 0%, ${a(c, 0.14 * f)} 62%, ${a(c, 0.44 * f)} 100%)`}} />
      {/* 5. grado de color muy leve: unifica clips de temperaturas distintas sin virar a neón */}
      <div style={{position: 'absolute', inset: 0,
                   background: `linear-gradient(126deg, ${a(th.accent2, 0.07)} 0%, ${a(c, 0)} 46%, ${a(th.accent, 0.06)} 100%)`}} />
    </>
  );
};

// Sobre una trama generada no hace falta tapar nada (ya es oscura): solo se hunde el
// centro lo justo para que el titular tenga peso, y se apagan las esquinas.
const VeloSuave: React.FC<{th: Theme; intensidad: number}> = ({th, intensidad}) => {
  const f = clamp01(intensidad);
  const c = th.bgBottom;
  return (
    <>
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: SUB_ZONE + 90,
                   background: `linear-gradient(180deg, ${a(c, 0.72 * f)} 0%, ${a(c, 0)} 100%)`}} />
      <div style={{position: 'absolute', inset: 0,
                   background: `radial-gradient(ellipse 76% 60% at 50% 42%, ${a(c, 0.3 * f)} 0%, ${a(c, 0.06 * f)} 58%, ${a(c, 0.44 * f)} 100%)`}} />
    </>
  );
};

// ───────────────────────────── modo trama ─────────────────────────────

// POR QUÉ ESTAS TRAMAS SE MUEVEN COMO SE MUEVEN (medido 23-ago-2026).
// El panel viejo estaba parado el 78.4% del tiempo; con estas cuatro tramas bajó a 23.9%,
// y lo que quedaba quieto eran justo los paneles CON trama: se movían, pero tan poquito que
// el píxel no cambiaba. Medido frame a frame (diff medio del cuadro escalado a 80x76, panel
// `define` de 150 frames, tema hielo) — la columna que importa es la de RÉGIMEN, porque la
// media entera se la inflaba la entrada del texto del primer medio segundo:
//
//               media antes → después   régimen antes → después   parado antes → después
//   malla            0.24 → 2.07             0.15 → 1.83            3.9 s → 0 s
//   polvo            0.92 → 1.77             0.14 → 1.31            3.8 s → 0 s
//   barrido          0.47 → 2.13             0.38 → 1.12            1.3 s → 0 s
//   ondas            1.15 → 3.19             0.62 → 2.48            0.0 s → 0 s
//
// (Verificado también a 20 s por trama —el largo máximo de un panel— y en `ambar`, la paleta
// con el accent2 más oscuro de las diez: ninguna baja de 0.94 de mínimo por frame.)
//
// La cuenta que explica el fallo: para un patrón que se repite con periodo P (px de
// pantalla), amplitud A (en niveles de luma) y velocidad v (px por frame), el movimiento
// que se mide vale ≈ 4·A·v/P. O sea:
//   · MIL LÍNEAS DE 1 px moviéndose 1 px/frame → P chico pero A se promedia a cero en cuanto
//     el medidor (o el ojo a distancia de teléfono, o el encoder) escala: invisible.
//   · UNA ONDA ANCHA de 300 px moviéndose 6 px/frame con 25 de amplitud → 4·25·6/300 = 2.0.
// Por eso las cuatro tramas llevan ahora POCA frecuencia espacial con MUCHO recorrido, y no
// más brillo: A es CONTRASTE (diferencia de valor contra el fondo de grafito), no saturación
// ni neón — la paleta sobria manda y todos los colores siguen saliendo del Theme.
//
// La otra mitad del arreglo es que NADA se mueva con `interpolate` contra la duración del
// panel: todo va con tiempo continuo `t` y periodo propio, así un panel de 4 s y uno de 20 s
// se ven igual de vivos y ninguno se congela a la mitad.

type TramaProps = {th: Theme; t: number; frame: number; total: number; w: number; h: number; seed: string};

// Perfil suave de UN ciclo (0..1 → 0..1). Coseno: sin cantos, sin banding.
const ciclo = (u: number) => 0.5 - 0.5 * Math.cos(2 * Math.PI * u);

// Stops de UN ciclo para un `repeating-*-gradient`, DESFASADOS por `ph` (0..1 = un periodo).
// POR QUÉ RECALCULARLOS CADA FRAME: `background-position` mueve el CENTRO de un radial (no su
// fase) y las posiciones negativas no son legales ahí; recalcular los stops sí desplaza la onda
// de verdad. Como el stop 0 y el stop N valen lo mismo (wrap(0-ph) === wrap(1-ph)), la
// repetición no tiene costura. Todo con gradientes: PROHIBIDO blur() y drop-shadow().
const ondaStops = (col: string, amp: number, P: number, ph: number, N = 10) =>
  Array.from({length: N + 1}, (_, k) =>
    `${a(col, amp * ciclo(wrap(k / N - ph, 1)))} ${((k * P) / N).toFixed(1)}px`).join(', ');

const Trama: React.FC<TramaProps & {variante: TramaVariante}> = ({variante, ...p}) => {
  if (variante === 'malla') return <Malla {...p} />;
  if (variante === 'polvo') return <Polvo {...p} />;
  if (variante === 'barrido') return <Barrido {...p} />;
  return <Ondas {...p} />;
};

// (1) MALLA: corredor en perspectiva que avanza hacia el espectador. Suelo + techo con
// horizonte encendido, y PULSOS de luz que bajan por el suelo hacia la cámara.
// Los pulsos son el músculo: la rejilla sola no bastaba (1 px de línea a 26 px/s = 0.87
// px/frame, por debajo del píxel una vez escalado el cuadro — el medidor daba 0.10 y José
// veía un panel congelado).
//
// LOS PULSOS SE DIBUJAN EN COORDENADAS DE PANTALLA, NO SOBRE EL PLANO EN PERSPECTIVA.
// MEDIDO (23-ago): poner un `repeating-linear-gradient` que cambia cada frame ENCIMA del div
// con `perspective(900px) rotateX(72deg)` mandó el render de 40 s a más de 12 minutos sin
// terminar (el proceso GPU de swiftshader al 84%): un layer 3D se rasteriza a la escala
// MÁXIMA del transform — cerca de la cámara la textura va magnificada 2.4x — así que cada
// frame repintaba un gradiente de ~4700x1900 px por software. Con la perspectiva calculada a
// mano y volcada en las paradas de un linear-gradient plano, el resultado en pantalla es el
// MISMO y el coste es un div normal.
//   pantalla → textura:  Y = 900·s / (900·cos72 + sen72·s)   con s = y − horizonte
// El muestreo va cuadrático (denso junto al horizonte, suelto cerca de la cámara) porque ahí
// el patrón se comprime, y la amplitud entra con rampa desde el horizonte: así no hay aliasing
// donde las bandas se juntan y la luz se queda ABAJO, lejos de la banda del titular.
const Malla: React.FC<TramaProps> = ({th, t, h}) => {
  const paso = 132;
  const avanceSuelo = wrap(t * 168, paso);      // 5.6 px/frame de textura (antes 0.87)
  const avanceTecho = wrap(t * 116, paso);
  const deriva = wrap(t * 34, paso);
  const respira = 0.34 + Math.sin(t * 0.85) * 0.08;
  // el horizonte respira con PERIODO PROPIO (antes era un interpolate contra la duración del
  // panel: en uno de 20 s se movía 4 px en total)
  const horiz = 0.485 + Math.sin(t * 0.21) * 0.02;
  const y0 = h * horiz;
  const K1 = Math.cos((72 * Math.PI) / 180);
  const K2 = Math.sin((72 * Math.PI) / 180);
  const P = 300;                                 // periodo del pulso en px de TEXTURA
  const ph = wrap(t * 0.72, 1);                  // ~216 px/s, sin costura (0..1 cíclico)
  const N = 34;
  const pulsos = (col: string, amp: number, arriba: boolean) => {
    const largo = arriba ? y0 : h - y0;
    // `ciclo` es par (coseno), así que la dirección NO se invierte cambiando el signo del
    // argumento: se invierte el signo de la FASE (ph), que es lo que corre con el tiempo.
    const dir = arriba ? -1 : 1;
    const stops = Array.from({length: N + 1}, (_, i) => {
      const u = i / N;
      const s = u * u * largo;                   // cuadrático: denso junto al horizonte
      const Y = (900 * s) / (900 * K1 + K2 * s);
      const rampa = Math.min(1, u / 0.55);       // 0 en el horizonte, 1 a un tercio del suelo
      const v = amp * rampa * ciclo(wrap(Y / P - dir * ph, 1));
      const pos = arriba ? largo - s : s;
      return {pos, v};
    });
    if (arriba) stops.reverse();
    return `linear-gradient(180deg, ${stops.map((x) => `${a(col, x.v)} ${x.pos.toFixed(1)}px`).join(', ')})`;
  };
  return (
    <>
      <div style={{position: 'absolute', inset: 0,
                   background: `linear-gradient(180deg, ${a(th.bgTop, 1)} 0%, ${a(th.bgBottom, 1)} 100%)`}} />
      {/* resplandor del horizonte (radial-gradient puro, jamás blur), latiendo */}
      <div style={{position: 'absolute', left: '-20%', width: '140%', top: y0 - 260, height: 520,
                   background: `radial-gradient(ellipse 50% 50% at 50% 50%, ${a(th.accent, 0.30 + Math.sin(t * 1.15) * 0.09)} 0%, ${a(th.accent, 0.10)} 42%, ${a(th.accent, 0)} 72%)`}} />
      {/* suelo: rejilla más gruesa y con más contraste (2 px, no 1: 1 px se promedia a nada) */}
      <div style={{position: 'absolute', left: '-40%', width: '180%', top: y0, bottom: -h * 0.25,
                   transform: 'perspective(900px) rotateX(72deg)', transformOrigin: '50% 0%',
                   opacity: respira + 0.06,
                   backgroundImage: `linear-gradient(${a(th.accent, 0.85)} 2px, transparent 2px),
                                     linear-gradient(90deg, ${a(th.accent, 0.62)} 2px, transparent 2px)`,
                   backgroundSize: `${paso}px ${paso}px`,
                   backgroundPosition: `${deriva}px ${avanceSuelo}px`}} />
      {/* PULSOS del suelo: bandas anchas de luz que vienen hacia la cámara */}
      <div style={{position: 'absolute', left: 0, right: 0, top: y0, bottom: 0,
                   backgroundImage: pulsos(th.accent, 0.34, false)}} />
      {/* techo: el mismo plano espejado y más apagado — da el túnel.
          La bisagra (transformOrigin 50% 100%) cae EXACTAMENTE en el horizonte, igual que la
          del suelo: height = y0 + h*0.2 compensa el `top` negativo (si no, se abre una banda
          muerta de ~205 px entre techo y suelo y el túnel no cierra). */}
      <div style={{position: 'absolute', left: '-40%', width: '180%', top: -h * 0.2, height: y0 + h * 0.2,
                   transform: 'perspective(900px) rotateX(-72deg)', transformOrigin: '50% 100%',
                   opacity: respira * 0.62,
                   backgroundImage: `linear-gradient(${a(th.accent2, 0.72)} 2px, transparent 2px),
                                     linear-gradient(90deg, ${a(th.accent2, 0.5)} 2px, transparent 2px)`,
                   backgroundSize: `${paso}px ${paso}px`,
                   backgroundPosition: `${-deriva}px ${-avanceTecho}px`}} />
      {/* pulsos del techo: van al revés y a la MITAD de amplitud, porque el techo cae justo
          sobre la banda del titular y ahí el velo no puede con más luz */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: y0,
                   backgroundImage: pulsos(th.accent2, 0.16, true)}} />
      {/* niebla del fondo: mata las líneas lejanas para que no sea una rejilla plana */}
      <div style={{position: 'absolute', left: 0, right: 0, top: y0 - 200, height: 400,
                   background: `linear-gradient(180deg, ${a(th.bgBottom, 0)} 0%, ${a(th.bgBottom, 0.85)} 50%, ${a(th.bgBottom, 0)} 100%)`}} />
    </>
  );
};

// (2) POLVO: partículas GRANDES desenfocadas. El desenfoque se finge con la caída del
// radial-gradient (blur() está prohibido y además sería 2.5x más lento).
// Una burbuja de 700 px es un patrón de periodo ~700: para que se note tiene que RECORRER,
// no flotar. A 18-48 px/s (0.6-1.6 px/frame) el medidor daba 0.10 — imagen fija con ruido.
const Polvo: React.FC<TramaProps> = ({th, t, w, h, seed}) => {
  const gordas = Array.from({length: 12}, (_, i) => {
    const r = 165 + random(`g-r-${seed}-${i}`) * 235;
    const x0 = random(`g-x-${seed}-${i}`) * (w + r * 2) - r;
    // 145-300 px/s (4.8-10 px/frame), antes 18-48. Suena rápido y NO lo es: son formas de
    // hasta 800 px con borde suave, así que se leen como algo enorme pasando despacio, no
    // como un disparo.
    const vel = 145 + random(`g-v-${seed}-${i}`) * 155;
    // La vuelta del módulo ocurre con la burbuja COMPLETAMENTE fuera de cuadro: de y=h
    // (borde de arriba pegado al fondo del cuadro) a y=-2r (borde de abajo pegado al techo).
    const span = h + r * 2;
    const y = h - wrap(random(`g-y-${seed}-${i}`) * span + t * vel, span);
    const x = x0 + Math.sin(t * 0.62 + i * 1.7) * 96;      // vaivén lateral de verdad
    const col = i % 3 === 0 ? th.accent2 : th.accent;
    // late: la opacidad sube y baja con periodo propio, así una burbuja parada en el centro
    // del cuadro tampoco se queda quieta
    const op = (0.20 + random(`g-o-${seed}-${i}`) * 0.17) * (0.60 + 0.40 * Math.sin(t * 1.25 + i * 2.3));
    return {r, x, y, col, op, i};
  });
  const chispas = Array.from({length: 22}, (_, i) => {
    const r = 4 + random(`s-r-${seed}-${i}`) * 5;
    const x = random(`s-x-${seed}-${i}`) * w + Math.sin(t * 0.9 + i) * 26;
    const span = h + 80;
    const y = h - wrap(random(`s-y-${seed}-${i}`) * span + t * (95 + (i % 5) * 34), span);
    const tw = 0.24 + (Math.sin(t * 1.6 + i * 2.1) + 1) * 0.2;
    return {r, x, y, tw, i};
  });
  // Corriente de aire: dos ondas anchas y tenues que cruzan en diagonal, en sentidos
  // contrarios. No se "ven" como capa, pero son las que garantizan que el cuadro nunca esté
  // quieto entre burbuja y burbuja: una burbuja de 700 px con borde suave cambia poquísimo
  // por frame, y con burbujas rápidas pero UNA sola onda el medidor se quedaba en 0.82,
  // debajo de la meta de 0.9.
  const aire = wrap(t * 0.62, 1);
  const aire2 = wrap(-t * 0.34, 1);
  return (
    <>
      <div style={{position: 'absolute', inset: 0,
                   background: `linear-gradient(200deg, ${th.card} 0%, ${th.bgTop} 34%, ${th.bgBottom} 100%)`}} />
      {/* la onda que carga el movimiento va en th.text, no en th.accent2: `text` es el mismo
          hueso en las diez paletas, mientras que accent2 va de 222 de luma (hielo) a 134
          (ambar). MEDIDO: con accent2, la misma trama daba 1.41 en hielo y 0.93 en ambar —
          o sea el tema decidía si el panel se movía o no. */}
      <div style={{position: 'absolute', inset: 0,
                   backgroundImage: `repeating-linear-gradient(168deg, ${ondaStops(th.text, 0.17, 440, aire)})`}} />
      <div style={{position: 'absolute', inset: 0,
                   backgroundImage: `repeating-linear-gradient(84deg, ${ondaStops(th.accent, 0.10, 720, aire2)})`}} />
      {gordas.map((g) => (
        <div key={`g${g.i}`} style={{position: 'absolute', left: g.x, top: g.y, width: g.r * 2, height: g.r * 2,
                                     background: `radial-gradient(circle closest-side, ${a(g.col, g.op)} 0%, ${a(g.col, g.op * 0.45)} 34%, ${a(g.col, 0)} 70%)`}} />
      ))}
      {chispas.map((s) => (
        <div key={`s${s.i}`} style={{position: 'absolute', left: s.x, top: s.y, width: s.r, height: s.r,
                                     borderRadius: '50%', background: th.text, opacity: s.tw}} />
      ))}
    </>
  );
};

// (3) BARRIDO: luz diagonal que cruza el cuadro, como un reflector fuera de campo.
// CADA PANEL EMPIEZA EN t=0, así que lo que en t=0 esté fuera de cuadro NO EXISTE para un
// panel de 4-8 s: las tres fases caen dentro del cuadro en t=0 (y también a los 2, 4, 6 s).
// El trabajo grueso lo hace la REJA: dos ondas anchas que se repiten y no se acaban nunca,
// así el cuadro nunca depende de que un haz suelto esté pasando por ahí.
const Barrido: React.FC<TramaProps> = ({th, t, w, h}) => {
  const alto = h * 1.9;
  // medio ancho del elemento YA ROTADO: con 1949 px de alto, 18° lo estiran ~300 px de lado.
  // El recorrido se calcula con eso para que la vuelta del módulo ocurra con el haz
  // completamente fuera de cuadro por los dos extremos (si no, salta a la vista).
  const ext = (ancho: number, ang: number) => {
    const r = (ang * Math.PI) / 180;
    return (ancho / 2) * Math.cos(r) + (alto / 2) * Math.sin(r);
  };
  const haces = [
    {vel: 250, ang: 18, ancho: 0.40, op: 0.24, col: th.text, fase: 0.30},
    {vel: 186, ang: 22, ancho: 0.56, op: 0.19, col: th.accent, fase: 0.62},
    {vel: 138, ang: 15, ancho: 0.26, op: 0.14, col: th.accent2, fase: 0.88},
  ];
  const reja = wrap(t * 0.52, 1);        // 0.52 ciclos/s sobre 380 px = 198 px/s
  const reja2 = wrap(-t * 0.33, 1);      // al revés y más lenta: nunca se anulan las dos
  return (
    <>
      <div style={{position: 'absolute', inset: 0,
                   background: `linear-gradient(158deg, ${th.bgTop} 0%, ${th.cardAlt} 38%, ${th.bgBottom} 100%)`}} />
      {/* foco cálido que respira, anclado fuera de cuadro */}
      <div style={{position: 'absolute', left: -w * 0.25, top: -h * 0.3, width: w * 1.2, height: h * 1.2,
                   background: `radial-gradient(ellipse closest-side at center, ${a(th.accent, 0.20 + Math.sin(t * 0.55) * 0.06)} 0%, ${a(th.accent, 0)} 66%)`}} />
      {/* la reja: dos ondas anchas cruzadas, en sentidos contrarios */}
      <div style={{position: 'absolute', inset: 0,
                   backgroundImage: `repeating-linear-gradient(108deg, ${ondaStops(th.text, 0.16, 380, reja)})`}} />
      <div style={{position: 'absolute', inset: 0,
                   backgroundImage: `repeating-linear-gradient(76deg, ${ondaStops(th.accent, 0.14, 620, reja2)})`}} />
      {haces.map((b, i) => {
        const ancho = w * b.ancho;
        const e = ext(ancho, b.ang);
        const span = w + e * 2;
        const x = wrap(b.fase * span + t * b.vel, span) - (ancho / 2 + e);
        return (
          <div key={`b${i}`} style={{position: 'absolute', left: x, top: -h * 0.4, width: ancho, height: alto,
                                     transform: `rotate(${b.ang}deg)`, transformOrigin: '50% 50%',
                                     background: `linear-gradient(90deg, ${a(b.col, 0)} 0%, ${a(b.col, b.op * 0.5)} 38%, ${a(b.col, b.op)} 50%, ${a(b.col, b.op * 0.5)} 62%, ${a(b.col, 0)} 100%)`}} />
        );
      })}
      {/* polvo en el haz: dos hilos finos que van al revés, para que no se lea como una sola capa */}
      {[0, 1].map((i) => {
        const ang = 18 + i * 4;
        const e = ext(6, ang);
        const span = w + e * 2;
        // van al REVÉS (velocidad negativa): por eso el módulo tiene que ser el positivo
        const x = wrap((0.34 + i * 0.42) * span - t * (150 + i * 52), span) - (3 + e);
        return (
          <div key={`h${i}`} style={{position: 'absolute', left: x, top: -h * 0.4, width: 6, height: alto,
                                     transform: `rotate(${ang}deg)`,
                                     background: `linear-gradient(180deg, ${a(th.text, 0)} 0%, ${a(th.text, 0.24)} 50%, ${a(th.text, 0)} 100%)`}} />
        );
      })}
    </>
  );
};

// (4) ONDAS: la superficie del agua después de la gota. El campo de ondas es un
// repeating-radial-gradient cuya FASE se recalcula cada frame (ver `ondaStops`): se expande
// para siempre desde el origen, sin nacer ni morir ningún anillo, así que no hay salto ni
// hueco por largo que sea el panel. Los aros de trazo del original no bastaban: un stroke de
// 4 px sobre 1080 desaparece al escalar el cuadro (medidor 0.10) — ahora van encima, gruesos,
// solo para dar filo a lo que ya mueve el campo.
const Ondas: React.FC<TramaProps> = ({th, t, w, h, seed}) => {
  const cx = w * (0.28 + random(`oc-${seed}`) * 0.18);
  const cy = h * 0.78;
  const maxR = Math.max(w, h) * 0.95;
  // campo principal: 300 px de periodo a 0.62 ciclos/s = 186 px/s de expansión.
  // La amplitud se quedó en 0.16 (no 0.22) tras mirar los frames: con más, los dos campos
  // cruzados se leían como una DIANA, no como agua. Con 0.16 el medidor sigue dando 1.9 —
  // el doble de la meta — y la imagen respira.
  const ph = wrap(t * 0.62, 1);
  // segunda fuente, arriba y a la derecha, con otro periodo y otra velocidad: dos campos
  // que se cruzan se leen como agua, no como una diana
  const cx2 = w * 0.82;
  const cy2 = h * 0.2;
  const ph2 = wrap(t * 0.44, 1);
  const N = 5;
  const vida = 6;                                   // 6 s de centro a borde ≈ 170 px/s
  const anillos = Array.from({length: N}, (_, i) => {
    const fase = wrap(t / vida + i / N, 1);          // 0..1 continuo
    const r = fase * maxR;
    // entra y sale con rampa: nunca aparece ni desaparece de golpe
    const op = Math.min(fase / 0.12, 1) * Math.max(0, 1 - Math.max(0, fase - 0.5) / 0.5);
    return {r, op: op * 0.42, gw: 12 - fase * 7, i};
  });
  return (
    <>
      <div style={{position: 'absolute', inset: 0,
                   background: `linear-gradient(168deg, ${th.cardAlt} 0%, ${th.bgTop} 30%, ${th.bgBottom} 100%)`}} />
      {/* los dos campos de onda */}
      <div style={{position: 'absolute', inset: 0,
                   backgroundImage: `repeating-radial-gradient(circle at ${cx.toFixed(0)}px ${cy.toFixed(0)}px, ${ondaStops(th.accent, 0.16, 300, ph)})`}} />
      <div style={{position: 'absolute', inset: 0,
                   backgroundImage: `repeating-radial-gradient(circle at ${cx2.toFixed(0)}px ${cy2.toFixed(0)}px, ${ondaStops(th.accent2, 0.10, 440, ph2)})`}} />
      {/* el punto de origen, encendido y latiendo */}
      <div style={{position: 'absolute', left: cx - 300, top: cy - 300, width: 600, height: 600,
                   background: `radial-gradient(circle closest-side, ${a(th.accent, 0.26 + Math.sin(t * 1.3) * 0.08)} 0%, ${a(th.accent, 0.06)} 38%, ${a(th.accent, 0)} 70%)`}} />
      <svg width={w} height={h} style={{position: 'absolute', inset: 0}}>
        {anillos.map((o) => (
          <circle key={`o${o.i}`} cx={cx} cy={cy} r={Math.max(1, o.r)} fill="none"
                  stroke={o.i % 2 ? th.accent2 : th.accent} strokeWidth={Math.max(1, o.gw)} opacity={o.op} />
        ))}
      </svg>
    </>
  );
};
