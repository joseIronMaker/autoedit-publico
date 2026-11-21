import React from 'react';
import {Img, interpolate, random, spring, staticFile} from 'remotion';
import {Theme} from '../theme';
import {ANTON} from '../fonts';

// Panel inferior del formato "José grabado". La banda útil mide 1080-104 (riel de
// corazón/comentar/compartir) - 64 (margen izquierdo) de ancho por SOLO 528 px de alto
// (1026 - 168 de subtítulos quemados - 330 que tapa la UI de TikTok con el copy).
// Los dos componentes de este archivo se cierran a esa altura A PROPÓSITO: lo que se
// salga de ahí no se recorta bonito, se pierde.
const MAX_H = 528;
const GAP = 14;
// Ancho útil real dentro del `inner` de Panel.tsx (1080 - 104 del riel - 64 de margen).
// Se usa SOLO para estimar cuántas líneas ocupa un caption (no se puede medir el DOM
// desde el render de Remotion): con eso se calcula el alto del velo.
const BAND_W = 912;

// ─────────────────────────────── 1) Mosaico ───────────────────────────────
// Varias fotos a la vez en rejilla. Rompe la pared de texto sin gastar un clip de video.

export type MosaicoSpec = {
  kind: 'mosaico';
  images: string[];      // rutas relativas a remotion/public (staticFile), 1-4; la primera manda
  caption?: string;      // titular corto sobre el velo inferior
  focus?: number;        // índice que se DESTACA a la mitad de la escena (las otras se atenúan)
};

// Direcciones de Ken Burns por tile. Distintas a propósito: si todas se movieran igual el
// mosaico parecería una sola foto haciendo zoom.
const KB_DIRS: Array<[number, number]> = [
  [1, 0.55], [-1, -0.45], [0.6, -1], [-0.7, 0.9],
];

const Tile: React.FC<{
  src: string; i: number; f: number; th: Theme; frame: number; fps: number;
  total: number; delay: number; focused: boolean; dimmed: boolean;
}> = ({src, i, f, th, frame, fps, total, delay, focused, dimmed}) => {
  // Entrada escalonada. OJO: la entrada NUNCA puede empujar el tile fuera de la banda de
  // 528 px (arriba están los subtítulos quemados y a la derecha el riel de acciones), así
  // que entra ENCOGIDA y subiendo — sin desplazamiento lateral, que era lo que sacaba la
  // foto por el borde derecho mientras ya se veía a media opacidad.
  const p = spring({frame: frame - delay, fps, config: {damping: 15, mass: 0.9, stiffness: 130}, durationInFrames: 20});
  const dir = KB_DIRS[i % KB_DIRS.length];
  // el Ken Burns se REPARTE en toda la escena: un panel dura 4-20 s y la rejilla nunca
  // puede quedarse quieta (si la animación se acaba en 20 frames, el resto es una foto fija)
  const jitter = random(`kb-${i}-${src}`);
  const z = interpolate(frame, [0, total], [1.09, 1.09 + 0.07 + jitter * 0.05], {extrapolateRight: 'clamp'});
  const tx = interpolate(frame, [0, total], [0, dir[0] * 2.6], {extrapolateRight: 'clamp'});
  const ty = interpolate(frame, [0, total], [0, dir[1] * 2.6], {extrapolateRight: 'clamp'});
  // el foco entra a MITAD de escena: primero se ve el conjunto, después manda una
  const mid = total * 0.5;
  const foco = interpolate(frame, [mid - fps * 0.4, mid + fps * 0.7], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  // El foco NO escala la caja del tile: en las rejillas de 1, 2 y 3 fotos el tile mide los
  // 528 px completos y un scale(1.07) lo sacaba 18 px por arriba (encima de los subtítulos)
  // y 32 px por la derecha (dentro del riel). El zoom va DENTRO del marco, que ya recorta.
  const zoomFoco = focused ? 1 + 0.09 * foco : 1;
  const opacidad = Math.min(1, p * 1.4) * (dimmed ? 1 - 0.55 * foco : 1);

  return (
    <div style={{
      flex: `${f} 1 0`, position: 'relative', overflow: 'hidden', borderRadius: 18,
      border: `2px solid ${th.card}`, boxSizing: 'border-box', background: th.cardAlt,
      opacity: opacidad, minWidth: 0, minHeight: 0,
      transform: `translateY(${18 * (1 - p)}px) scale(${0.94 + 0.06 * p})`,
      zIndex: focused ? 3 : 1,
    }}>
      <Img src={staticFile(src)} style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
        transform: `scale(${z * zoomFoco}) translate(${tx}%, ${ty}%)`,
      }} />
      {/* anillo de foco: div con opacidad animada en vez de outline con umbral (el outline
          aparecía de golpe). Va DENTRO del tile: no desplaza el layout ni pide desenfoque. */}
      {focused ? (
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 16, pointerEvents: 'none',
          border: `3px solid ${th.accent}`, boxSizing: 'border-box', opacity: foco,
        }} />
      ) : null}
    </div>
  );
};

const Fila: React.FC<{children: React.ReactNode; f?: number}> = ({children, f}) => (
  <div style={{display: 'flex', flexDirection: 'row', gap: GAP, flex: f ? `${f} 1 0` : 1, minWidth: 0, minHeight: 0}}>{children}</div>
);
const Columna: React.FC<{children: React.ReactNode; f?: number}> = ({children, f}) => (
  <div style={{display: 'flex', flexDirection: 'column', gap: GAP, flex: f ? `${f} 1 0` : 1, minHeight: 0, minWidth: 0}}>{children}</div>
);

export const Mosaico: React.FC<{spec: MosaicoSpec; th: Theme; frame: number; fps: number; dur?: number}> = ({spec, th, frame, fps, dur}) => {
  // dur=0 reventaría los interpolate ([0,0] no es monótono creciente): se asegura ≥1
  const total = Math.max(1, dur ?? 150);
  const imgs = (spec.images ?? []).slice(0, 4);
  const n = Math.max(1, imgs.length);
  // el escalonado también se reparte: en un panel de 20 s las fotos entran de a poco
  const paso = Math.min(30, Math.max(7, (total * 0.28) / n));
  // con UNA sola foto no hay nada con qué contrastar: el "foco" solo la haría crecer
  const foco = n >= 2 && typeof spec.focus === 'number' && spec.focus >= 0 && spec.focus < n ? spec.focus : -1;
  // sin fotos no hay mosaico: mejor un panel vacío que un staticFile(undefined) que revienta
  // el render entero a la mitad de la cola de videos
  if (imgs.length === 0) return null;

  const T = (i: number, f: number) => (
    <Tile key={i} src={imgs[i]} i={i} f={f} th={th} frame={frame} fps={fps} total={total}
          delay={i * paso} focused={foco === i} dimmed={foco >= 0 && foco !== i} />
  );

  // Rejilla DISEÑADA: una manda y las otras acompañan. Nunca todas del mismo tamaño.
  let grid: React.ReactNode;
  if (n === 1) grid = <Fila>{T(0, 1)}</Fila>;
  else if (n === 2) grid = <Fila>{T(0, 1.5)}{T(1, 1)}</Fila>;
  else if (n === 3) grid = <Fila>{T(0, 1.45)}<Columna f={1}>{T(1, 1)}{T(2, 1)}</Columna></Fila>;
  else grid = (
    <Fila>
      <Columna f={1.35}>{T(0, 2)}{T(3, 1)}</Columna>
      <Columna f={1}>{T(1, 1)}{T(2, 1)}</Columna>
    </Fila>
  );

  const cap = spring({frame: frame - Math.min(34, paso * n), fps, config: {damping: 16, mass: 0.9, stiffness: 120}, durationInFrames: 18});

  // El caption se encoge si es largo: a 46 px fijos un titular de 120 caracteres se iba a
  // 5 líneas (≈280 px), o sea MÁS ALTO que el velo, y las dos primeras líneas quedaban
  // sobre la foto pelada, ilegibles. Medido con Anton real en Chrome headless.
  const capTxt = spec.caption ?? '';
  const capFs = capTxt.length <= 44 ? 46 : capTxt.length <= 90 ? 40 : 34;
  const capW = BAND_W - 44;                                   // left/right 22
  const capLineas = Math.max(1, Math.ceil(capTxt.length / Math.floor(capW / (capFs * 0.47))));
  const velo = Math.min(310, Math.max(210, 36 + capLineas * capFs * 1.06 + 66));

  return (
    <div style={{position: 'relative', width: '100%', height: MAX_H, maxHeight: '100%', flexShrink: 0,
                 display: 'flex', flexDirection: 'column'}}>
      {grid}
      {capTxt ? (
        <>
          {/* velo de degradado (NUNCA blur: WSL2 rasteriza por software y tira tiles opacos) */}
          <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: velo, borderRadius: 18,
                       background: `linear-gradient(180deg, ${th.bgBottom}00 0%, ${th.bgBottom}D9 52%, ${th.bgBottom}F2 100%)`,
                       pointerEvents: 'none', zIndex: 4}} />
          <div style={{position: 'absolute', left: 22, right: 22, bottom: 18, zIndex: 5,
                       opacity: Math.min(1, cap * 1.4), transform: `translateY(${18 * (1 - cap)}px)`}}>
            <div style={{height: 6, width: 88, marginBottom: 12,
                         background: `linear-gradient(90deg, ${th.accent}, ${th.accent2})`}} />
            <div style={{fontFamily: ANTON, fontSize: capFs, lineHeight: 1.06, color: th.text,
                         textTransform: 'uppercase', letterSpacing: 0.5, overflowWrap: 'anywhere'}}>
              {capTxt}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

// ───────────────────────────────── 2) Cita ─────────────────────────────────
// La frase que se lee sola: tesis del video y postura propia de José.

export type CitaSpec = {
  kind: 'cita';
  text: string;
  source?: string;       // "José, 2026" / "medido en 40 corridas" — chiquito, monospace
  highlight?: string[];  // palabras (o frases) que se pintan con th.accent y se subrayan
};

// Normaliza para comparar: sin acentos, sin puntuación, en minúsculas. Así "modelo."
// y "Modelo" cuentan como la misma palabra que llega en highlight.
const norm = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const Cita: React.FC<{spec: CitaSpec; th: Theme; frame: number; fps: number; dur?: number}> = ({spec, th, frame, fps, dur}) => {
  const total = Math.max(1, dur ?? 150);
  const texto = (spec.text ?? '').trim();
  const words = texto.split(/\s+/).filter(Boolean);

  // Tamaño según lo larga que sea la frase. La escalera llega hasta 24 px A PROPÓSITO:
  // con el corte anterior (todo lo de >180 caracteres a 36 px) una cita de 423 caracteres
  // medía 556 px y el `overflow: hidden` se comía la última línea Y la fuente, sin avisar.
  // Medido con Anton real en Chrome headless a 912 px de ancho: el peor caso de toda la
  // escalera (866 caracteres) da 517 px. Óptimo real de la pieza: 40-120 caracteres.
  const nchar = texto.length;
  const fs = nchar <= 34 ? 84 : nchar <= 60 ? 72 : nchar <= 90 ? 60 : nchar <= 130 ? 50
    : nchar <= 180 ? 42 : nchar <= 240 ? 36 : nchar <= 320 ? 32 : nchar <= 440 ? 28 : 24;

  // Entra por GRUPOS de palabras: letra a letra se lee como terminal y de golpe no da
  // ritmo. Y el escalonado se reparte en la escena para que no quede congelada al segundo 1.
  const gsize = words.length <= 8 ? 2 : 3;
  const grupos = Math.max(1, Math.ceil(words.length / gsize));
  // el piso de 5 frames podía dejar la última palabra (y la fuente) fuera de un panel corto:
  // se re-ajusta para que el texto SIEMPRE termine de escribirse antes del 62% de la escena
  const paso = Math.min(Math.min(26, Math.max(5, (total * 0.55) / grupos)), (total * 0.62) / grupos);

  const marcadas = new Set<string>();
  (spec.highlight ?? []).forEach((h) => h.split(/\s+/).forEach((w) => {
    const k = norm(w);
    if (k) marcadas.add(k);
  }));

  const finTexto = grupos * paso;
  const src = spring({frame: frame - Math.min(finTexto + 8, Math.max(0, total - 22)), fps,
                      config: {damping: 16, mass: 0.9, stiffness: 120}, durationInFrames: 18});
  // deriva lentísima y SIMÉTRICA (+6 → -6): 20 s de texto quieto se sienten muertos, pero
  // como el bloque va centrado en la banda, una deriva de -12 de corrido le comía píxeles
  // por arriba (zona de subtítulos) en las citas más largas.
  const deriva = interpolate(frame, [0, total], [6, -6], {extrapolateRight: 'clamp'});

  // sin texto no hay cita: dos comillas flotando solas se ven como un panel roto
  if (words.length === 0) return null;

  return (
    <div style={{position: 'relative', width: '100%', maxHeight: MAX_H, overflow: 'hidden',
                 padding: '84px 0 62px', boxSizing: 'border-box', transform: `translateY(${deriva}px)`}}>
      {/* comillas decorativas: valor bajo sobre el fondo, nunca un color encendido.
          zIndex 0 para que NO se pinten encima del texto (son posicionadas y, sin esto,
          el navegador las pinta después del bloque en flujo). */}
      <div style={{position: 'absolute', left: 0, top: 0, fontFamily: 'Georgia, serif', fontSize: 190,
                   lineHeight: 0.78, color: th.muted, opacity: 0.17, pointerEvents: 'none', zIndex: 0}}>&ldquo;</div>
      <div style={{position: 'absolute', right: 0, bottom: 6, fontFamily: 'Georgia, serif', fontSize: 190,
                   lineHeight: 0.78, color: th.muted, opacity: 0.17, pointerEvents: 'none', zIndex: 0}}>&rdquo;</div>

      <div style={{fontFamily: ANTON, fontSize: fs, lineHeight: 1.1, letterSpacing: 0.5,
                   textTransform: 'uppercase', color: th.text, position: 'relative', zIndex: 1}}>
        {words.map((w, i) => {
          const g = Math.floor(i / gsize);
          const d = g * paso;
          const p = spring({frame: frame - d, fps, config: {damping: 200}, durationInFrames: 12});
          const hot = marcadas.has(norm(w));
          // el subrayado se DIBUJA justo después de que la palabra aterriza
          const sub = hot
            ? interpolate(frame, [d + 8, d + 8 + Math.max(8, fps * 0.45)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
            : 0;
          return (
            <span key={i} style={{
              display: 'inline-block', position: 'relative', marginRight: fs * 0.24,
              color: hot ? th.accent : th.text,
              // una palabra larga en inline-block NO puede partirse sola: "otorrinolaringológicamente"
              // a 84 px medía 1008 px y se salía 96 px por la derecha, justo sobre el riel de
              // acciones. Con esto parte dentro de la banda.
              maxWidth: '100%', overflowWrap: 'anywhere',
              opacity: p, transform: `translateY(${14 * (1 - p)}px)`,
            }}>
              {w}
              {hot ? (
                <span style={{position: 'absolute', left: 0, bottom: -2, height: Math.max(5, fs * 0.09),
                              width: `${sub * 100}%`, background: th.accent2}} />
              ) : null}
            </span>
          );
        })}
      </div>

      {spec.source ? (
        <div style={{marginTop: 26, fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 24,
                     color: th.muted, letterSpacing: 3, textTransform: 'uppercase', position: 'relative', zIndex: 1,
                     opacity: Math.min(1, src * 1.4), transform: `translateX(${-16 * (1 - src)}px)`}}>
          — {spec.source}
        </div>
      ) : null}
    </div>
  );
};
