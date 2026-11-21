import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Theme, themeOf} from './theme';
import {ANTON} from './fonts';
import {Fondo, FondoSpec} from './panels/Fondo';
import {Stat, StatSpec} from './panels/Stat';
import {Reveal, RevealSpec} from './panels/Reveal';
import {Timeline, TimelineSpec} from './panels/Timeline';
import {Mosaico, MosaicoSpec, Cita, CitaSpec} from './panels/Mosaico';
import {Latente, LatenteSpec} from './panels/Latente';
import {Completa, CompletaSpec} from './panels/Completa';

// Panel INFERIOR (1080x1026) del formato "José grabado": él graba su cara en la mitad
// de arriba (720x596 nativos) y deja el resto en negro a propósito como lienzo.
// Es el inverso del composite de host_layout (cara abajo, banda arriba).
//
// Los primeros SUB_ZONE px se dejan libres: ahí se queman los subtítulos ASS, justo
// bajo la costura con la cara, que es donde la UI de TikTok no tapa nada.
const SUB_ZONE = 168;

// alpha en sufijo hex (#RRGGBBAA). Las tarjetas van translúcidas para que el fondo
// animado se vea a través: si son opacas, tapan el único movimiento del panel.
// Ken Burns CÍCLICO: un interpolate repartido sobre la duración se diluye en los paneles
// largos (un zoom del 13% en 19 s son 0.02% por frame: se lee como foto fija, y así salió
// la gráfica de temperatura del jose08, parada 19 s de 19). Con periodo propio el
// movimiento por frame es el mismo dure el panel 4 s o 20.
const vaiven = (t: number, periodo: number) => 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / periodo);

const a = (hex: string, alpha: number) =>
  hex + Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0').toUpperCase();

// TikTok TAPA el pie del video con el nombre de usuario, el copy y la barra de progreso.
// Medido sobre el jose06 ya publicado (José, 23-ago-2026: "sube más el contenido donde
// colocas slides, se tapa con el copy"): la primera línea de esa UI cae en y≈1594 del
// frame de 1920, o sea a ~326 px del final. Todo el contenido del panel vive ARRIBA de
// esa franja; solo las fotos y los clips siguen sangrando hasta el borde (una imagen
// medio tapada se ve bien, un titular medio tapado no).
const SAFE_BOTTOM = 330;
// El riel de acciones (corazón / comentar / compartir) se come la derecha en el teléfono.
const SAFE_RIGHT = 104;

// `fondo` lo pone autoedit/fondos.py: es la capa que evita que 61 de cada 100 paneles
// vivan sobre el mismo degradado muerto. Cualquier kind lo acepta.
export type PanelSpec = {fondo?: FondoSpec} & (
  | {kind: 'headline'; lines: string[]; kicker?: string; strike?: number}
  | {kind: 'define'; term: string; body: string; label?: string}
  | {kind: 'flow'; steps: string[]; title?: string}
  | {kind: 'compare'; title?: string; left: {head: string; body: string}; right: {head: string; body: string}; verdict?: string}
  | {kind: 'bar'; label: string; value: number; caption?: string; scale?: string}
  | {kind: 'photo'; images: string[]; caption?: string}
  // — herramientas REALES del motor, traídas al panel inferior —
  | {kind: 'plot'; image: string; title?: string; caption?: string}      // gráfica que salió de correr sklearn
  | {kind: 'shot'; image: string; url_label?: string; title?: string; caption?: string}  // screenshot REAL
  | {kind: 'clip'; video: string; lines?: string[]; caption?: string}    // clip Omni/Veo ya pagado
  | {kind: 'mascota'; image: string; sign_text?: string; caption?: string}
  | {kind: 'code'; lines: string[]; caption?: string}
  | {kind: 'neural'; mode: 'neurona' | 'red'; layers?: number[]; labels?: string[];
     title?: string; caption?: string; highlight?: 'suma' | 'bias' | 'activacion'}
  // — piezas nuevas contra la monotonía (23-ago-2026) —
  | StatSpec | RevealSpec | TimelineSpec | MosaicoSpec | CitaSpec | LatenteSpec | CompletaSpec
);

const Grain: React.FC<{w: number; h: number}> = ({w, h}) => (
  <svg width={w} height={h} style={{position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity: 0.13, pointerEvents: 'none'}}>
    <filter id="pn-grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="2" stitchTiles="stitch" seed="7" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="100%" height="100%" filter="url(#pn-grain)" />
  </svg>
);

export const Panel: React.FC<{spec: PanelSpec; theme?: string}> = ({spec, theme}) => {
  const th: Theme = themeOf(theme ?? 'violeta');
  const frame = useCurrentFrame();
  const {fps, width, height, durationInFrames} = useVideoConfig();
  const t = frame / fps;
  const lleno = spec.kind === 'photo' || spec.kind === 'clip';   // sangran hasta el borde
  const inner: React.CSSProperties = lleno
    ? {position: 'absolute', left: 0, right: 0, top: SUB_ZONE, bottom: 0}
    : {
        position: 'absolute', left: 0, right: 0, top: SUB_ZONE, bottom: SAFE_BOTTOM,
        padding: `0 ${SAFE_RIGHT}px 0 64px`, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      };

  const conFondo = !!spec.fondo;
  return (
    <AbsoluteFill style={{background: `linear-gradient(178deg, ${th.bgTop} 0%, ${th.bgBottom} 100%)`, overflow: 'hidden'}}>
      {conFondo ? <Fondo spec={spec.fondo!} th={th} frame={frame} fps={fps} dur={durationInFrames} /> : null}
      {/* halo de acento: radial-gradient, NUNCA blur() (WSL2 tira tiles opacos).
          Con fondo propio se apaga: dos decoraciones encimadas ensucian la imagen. */}
      <div style={{display: conFondo ? 'none' : 'block',
        position: 'absolute', left: -160, top: SUB_ZONE - 80, width: 720, height: 720,
        background: `radial-gradient(circle, ${th.accent}22 0%, ${th.accent}00 68%)`,
      }} />
      <div style={{display: conFondo ? 'none' : 'block',
        position: 'absolute', right: -200, bottom: -180, width: 760, height: 760,
        background: `radial-gradient(circle, ${th.accent2}1E 0%, ${th.accent2}00 68%)`,
      }} />
      {(conFondo ? [] : new Array(10).fill(0)).map((_, i) => {
        const bx = random(`px${i}`) * width;
        const by = SUB_ZONE + random(`py${i}`) * (height - SUB_ZONE) * 0.94;
        return (
          <div key={i} style={{
            position: 'absolute',
            left: bx + Math.cos(t * 0.45 + i) * 16,
            top: by + Math.sin(t * 0.38 + i * 1.2) * 12,
            width: 4 + (i % 3) * 2, height: 4 + (i % 3) * 2, borderRadius: '50%',
            background: i % 2 ? th.accent2 : th.accent, opacity: 0.26,
          }} />
        );
      })}
      {/* costura: línea de acento que separa la cara del panel */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 4,
                   background: `linear-gradient(90deg, ${th.accent}00, ${th.accent}CC 22%, ${th.accent2}CC 78%, ${th.accent2}00)`}} />

      <div style={inner}>
        {spec.kind === 'headline' ? <Headline spec={spec} th={th} frame={frame} fps={fps} /> : null}
        {spec.kind === 'define' ? <Define spec={spec} th={th} frame={frame} fps={fps} dur={durationInFrames} /> : null}
        {spec.kind === 'flow' ? <Flow spec={spec} th={th} frame={frame} fps={fps} dur={durationInFrames} /> : null}
        {spec.kind === 'compare' ? <Compare spec={spec} th={th} frame={frame} fps={fps} dur={durationInFrames} /> : null}
        {spec.kind === 'bar' ? <Bar spec={spec} th={th} frame={frame} fps={fps} dur={durationInFrames} /> : null}
        {spec.kind === 'photo' ? <Photo spec={spec} th={th} frame={frame} fps={fps} dur={durationInFrames} /> : null}
        {spec.kind === 'plot' ? <Plot spec={spec} th={th} frame={frame} fps={fps} dur={durationInFrames} /> : null}
        {spec.kind === 'shot' ? <Shot spec={spec} th={th} frame={frame} fps={fps} dur={durationInFrames} /> : null}
        {spec.kind === 'clip' ? <Clip spec={spec} th={th} frame={frame} fps={fps} dur={durationInFrames} /> : null}
        {spec.kind === 'mascota' ? <Mascotita spec={spec} th={th} frame={frame} fps={fps} /> : null}
        {spec.kind === 'code' ? <Code spec={spec} th={th} frame={frame} fps={fps} dur={durationInFrames} /> : null}
        {spec.kind === 'neural' ? <Neural spec={spec} th={th} frame={frame} fps={fps} dur={durationInFrames} /> : null}
        {spec.kind === 'stat' ? <Stat spec={spec} th={th} frame={frame} fps={fps} dur={durationInFrames} /> : null}
        {spec.kind === 'reveal' ? <Reveal spec={spec} th={th} frame={frame} fps={fps} dur={durationInFrames} /> : null}
        {spec.kind === 'timeline' ? <Timeline spec={spec} th={th} frame={frame} fps={fps} dur={durationInFrames} /> : null}
        {spec.kind === 'mosaico' ? <Mosaico spec={spec} th={th} frame={frame} fps={fps} dur={durationInFrames} /> : null}
        {spec.kind === 'cita' ? <Cita spec={spec} th={th} frame={frame} fps={fps} dur={durationInFrames} /> : null}
        {spec.kind === 'latente' ? <Latente spec={spec} th={th} frame={frame} fps={fps} dur={durationInFrames} /> : null}
        {spec.kind === 'completa' ? <Completa spec={spec} th={th} frame={frame} fps={fps} dur={durationInFrames} /> : null}
      </div>
      <Grain w={width} h={height} />
    </AbsoluteFill>
  );
};

type P<K> = {spec: Extract<PanelSpec, {kind: K}>; th: Theme; frame: number; fps: number; dur?: number};

const Headline: React.FC<P<'headline'>> = ({spec, th, frame, fps}) => {
  const lines = (spec.lines ?? []).slice(0, 3);
  return (
    <div style={{textAlign: 'center', transform: 'rotate(-1.5deg)'}}>
      {spec.kicker ? (
        <div style={{
          fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 26, color: th.muted,
          letterSpacing: 5, textTransform: 'uppercase', marginBottom: 22,
          opacity: spring({frame, fps, durationInFrames: 14}),
        }}>{spec.kicker}</div>
      ) : null}
      {lines.map((line, i) => {
        const p = spring({frame: frame - 3 - i * 5, fps, config: {damping: 13, mass: 0.8, stiffness: 145}, durationInFrames: 18});
        const bg = i % 2 === 0 ? th.accent2 : '#F1EFEA';
        const tachado = spec.strike === i;
        const sp = tachado ? spring({frame: frame - 20 - i * 5, fps, config: {damping: 200}, durationInFrames: 14}) : 0;
        return (
          <div key={i} style={{transform: `translateX(${(i % 2 === 0 ? -1 : 1) * 56 * (1 - p)}px)`, opacity: Math.min(1, p * 1.4), marginTop: i ? 10 : 0}}>
            <span style={{position: 'relative', display: 'inline-block', background: bg, color: '#100F16',
                          fontFamily: ANTON, fontSize: 92, lineHeight: 1.05, letterSpacing: 1,
                          textTransform: 'uppercase', padding: '8px 28px'}}>
              {line}
              {tachado ? (
                <span style={{position: 'absolute', left: '4%', top: '52%', height: 9, width: `${92 * sp}%`,
                              background: th.red, transform: 'rotate(-2deg)'}} />
              ) : null}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const Define: React.FC<P<'define'>> = ({spec, th, frame, fps, dur}) => {
  const total = dur ?? 150;
  const p = spring({frame, fps, config: {damping: 14, mass: 0.9, stiffness: 130}, durationInFrames: 20});
  // Una tarjeta de definición se queda QUIETA, y estos paneles duran 8-15 s: eso rompe
  // la regla de los 3 segundos. El cuerpo se revela palabra por palabra, el término
  // lleva un subrayado que crece, y todo el bloque sube muy despacio durante el panel.
  const sub = interpolate(frame, [12, 40], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const deriva = interpolate(frame, [0, total], [0, -14], {extrapolateRight: 'clamp'});
  const palabras = (spec.body ?? '').split(' ');
  return (
    <div style={{width: '100%', opacity: Math.min(1, p * 1.5),
                 transform: `translateY(${28 * (1 - p) + deriva}px)`}}>
      <div style={{display: 'inline-block', background: th.accent, color: '#100F16', padding: '6px 20px',
                   fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 24, letterSpacing: 6,
                   textTransform: 'uppercase', marginBottom: 26}}>
        {spec.label ?? 'definición'}
      </div>
      <div style={{fontFamily: ANTON, fontSize: 92, lineHeight: 1.0, color: th.text,
                   textTransform: 'uppercase', letterSpacing: 0.5}}>
        {spec.term}
      </div>
      <div style={{height: 8, width: `${sub * 100}%`, maxWidth: 560, marginTop: 14, marginBottom: 26,
                   background: `linear-gradient(90deg, ${th.accent2}, ${th.accent})`}} />
      <div style={{borderLeft: `6px solid ${th.accent2}`, paddingLeft: 26,
                   fontFamily: 'Georgia, serif', fontSize: 41, lineHeight: 1.3, color: th.text}}>
        {palabras.map((w, i) => (
          <span key={i} style={{
            opacity: spring({frame: frame - 18 - i * 2, fps, config: {damping: 200}, durationInFrames: 10}),
          }}>{w}{i < palabras.length - 1 ? ' ' : ''}</span>
        ))}
      </div>
    </div>
  );
};

const Flow: React.FC<P<'flow'>> = ({spec, th, frame, fps, dur}) => {
  const steps = (spec.steps ?? []).slice(0, 4);
  // el escalonado se REPARTE en la escena: en un panel largo los pasos entran despacio
  const paso = Math.max(11, ((dur ?? 150) * 0.55) / Math.max(1, steps.length));
  return (
    <div style={{width: '100%'}}>
      {spec.title ? (
        <div style={{fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 26, color: th.muted,
                     letterSpacing: 5, textTransform: 'uppercase', marginBottom: 30, textAlign: 'center'}}>
          {spec.title}
        </div>
      ) : null}
      {steps.map((s, i) => {
        const p = spring({frame: frame - i * paso, fps, config: {damping: 15, mass: 0.9, stiffness: 130}, durationInFrames: 20});
        return (
          <div key={i} style={{display: 'flex', alignItems: 'center', gap: 22, marginBottom: 16,
                               opacity: Math.min(1, p * 1.5), transform: `translateX(${-44 * (1 - p)}px)`}}>
            <div style={{flex: '0 0 auto', width: 60, height: 60, borderRadius: 14, background: th.accent,
                         color: '#100F16', fontFamily: ANTON, fontSize: 36,
                         display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{i + 1}</div>
            <div style={{flex: 1, background: a(th.card, 0.72), border: `2px solid ${a(th.cardAlt, 0.9)}`, borderRadius: 16,
                         padding: '15px 24px', fontFamily: ANTON, fontSize: 44, color: th.text,
                         textTransform: 'uppercase', letterSpacing: 0.5}}>{s}</div>
          </div>
        );
      })}
    </div>
  );
};

const Compare: React.FC<P<'compare'>> = ({spec, th, frame, fps, dur}) => {
  const total = dur ?? 150;
  const col = (d: {head: string; body: string}, i: number, color: string) => {
    const p = spring({frame: frame - i * Math.max(9, total * 0.14), fps, config: {damping: 15, mass: 0.9, stiffness: 130}, durationInFrames: 20});
    return (
      <div style={{flex: 1, background: a(th.card, 0.72), border: `3px solid ${color}`, borderRadius: 20,
                   padding: '26px 22px', opacity: Math.min(1, p * 1.5),
                   transform: `translateY(${30 * (1 - p)}px)`}}>
        <div style={{fontFamily: ANTON, fontSize: 46, color, textTransform: 'uppercase', marginBottom: 14}}>{d.head}</div>
        <div style={{fontFamily: 'Georgia, serif', fontSize: 36, lineHeight: 1.3, color: th.text}}>{d.body}</div>
      </div>
    );
  };
  const v = spring({frame: frame - Math.max(34, total * 0.58), fps, config: {damping: 15}, durationInFrames: 18});
  return (
    <div style={{width: '100%'}}>
      {spec.title ? (
        <div style={{fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 26, color: th.muted,
                     letterSpacing: 5, textTransform: 'uppercase', marginBottom: 26, textAlign: 'center'}}>{spec.title}</div>
      ) : null}
      <div style={{display: 'flex', gap: 22, alignItems: 'stretch'}}>
        {col(spec.left, 0, th.accent2)}
        {col(spec.right, 1, th.accent)}
      </div>
      {spec.verdict ? (
        <div style={{marginTop: 26, textAlign: 'center', opacity: Math.min(1, v * 1.5),
                     fontFamily: ANTON, fontSize: 58, color: th.text, textTransform: 'uppercase'}}>
          {spec.verdict}
        </div>
      ) : null}
    </div>
  );
};

const Bar: React.FC<P<'bar'>> = ({spec, th, frame, fps, dur}) => {
  const total = dur ?? 150;
  const p = interpolate(frame, [8, Math.max(30, total * 0.55)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const pct = Math.round(spec.value * p);
  const cap = spring({frame: frame - Math.max(30, total * 0.55), fps,
                      config: {damping: 16, mass: 0.9, stiffness: 120}, durationInFrames: 18});
  return (
    <div style={{width: '100%'}}>
      <div style={{fontFamily: ANTON, fontSize: 54, color: th.text, textTransform: 'uppercase',
                   marginBottom: 22, letterSpacing: 0.5}}>{spec.label}</div>
      <div style={{display: 'flex', alignItems: 'center', gap: 24}}>
        <div style={{flex: 1, position: 'relative', height: 116, borderRadius: 16, background: a(th.cardAlt, 0.7),
                     border: `2px solid ${th.card}`, overflow: 'hidden'}}>
          <div style={{position: 'absolute', inset: 0, width: `${spec.value * p}%`,
                       background: `linear-gradient(90deg, ${th.accent2}, ${th.accent})`}} />
        </div>
        <div style={{flex: '0 0 auto', minWidth: 190, textAlign: 'right',
                     fontFamily: ANTON, fontSize: 84, color: th.text, lineHeight: 1}}>{pct}%</div>
      </div>
      {spec.scale ? (
        <div style={{marginTop: 12, fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 24,
                     color: th.muted, letterSpacing: 3, textTransform: 'uppercase'}}>{spec.scale}</div>
      ) : null}
      {spec.caption ? (
        <div style={{marginTop: 26, borderLeft: `6px solid ${th.accent2}`, paddingLeft: 24,
                     fontFamily: 'Georgia, serif', fontSize: 40, lineHeight: 1.3, color: th.text,
                     opacity: Math.min(1, cap * 1.4), transform: `translateX(${22 * (1 - cap)}px)`}}>{spec.caption}</div>
      ) : null}
    </div>
  );
};

const Photo: React.FC<P<'photo'>> = ({spec, th, frame, fps, dur}) => {
  const total = dur ?? 150;
  const imgs = (spec.images ?? []).slice(0, 3);
  const each = total / Math.max(1, imgs.length);
  const fade = fps * 0.5;
  return (
    <div style={{position: 'absolute', inset: 0}}>
      {imgs.map((src, i) => {
        const ini = i * each;
        const op = imgs.length === 1 ? 1 : interpolate(
          frame, [ini - fade, ini + fade * 0.4, ini + each - fade, ini + each + fade * 0.6],
          [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
        );
        // Ken Burns CÍCLICO, no repartido: un 9% de zoom en un panel de 15 s son 0.02%
        // por frame y la foto se lee como fija (mismo bug que tenían shot y plot).
        const tf = frame / fps;
        // Estas fotos son documentales MUY oscuras: un zoom lento sobre sombra no cambia
        // casi ningún píxel (medido: 0.17-0.35 de movimiento, por debajo del umbral de
        // 0.35 con el que se detecta un panel congelado). Hace falta recorrido de verdad:
        // periodo más corto y más amplitud, que además se lee como cámara viva.
        const z = 1.08 + 0.15 * vaiven(tf + i * 2.3, 6.5);
        const mx = 4.0 * (vaiven(tf + i * 1.7, 9) - 0.5) * 2;
        const my = 3.0 * (vaiven(tf + i * 3.1, 11.5) - 0.5) * 2;
        return (
          <Img key={i} src={staticFile(src)} style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: 'cover', opacity: op,
            transform: `scale(${z}) translate(${mx}%, ${my}%)`,
          }} />
        );
      })}
      {/* velo inferior para que el caption se lea sin blur */}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: SAFE_BOTTOM + 300,
                   background: `linear-gradient(180deg, ${th.bgBottom}00, ${th.bgBottom}EE 62%)`}} />
      {spec.caption ? (
        <div style={{position: 'absolute', left: 56, right: SAFE_RIGHT, bottom: SAFE_BOTTOM + 26,
                     textAlign: 'center',
                     fontFamily: ANTON, fontSize: 54, color: th.text, textTransform: 'uppercase', lineHeight: 1.08}}>
          {spec.caption}
        </div>
      ) : null}
    </div>
  );
};


// ─────────────────── herramientas reales traídas al panel ───────────────────

// Gráfica que salió de EJECUTAR el modelo (ml_demo.run_model_code): no es un dibujo.
const Plot: React.FC<P<'plot'>> = ({spec, th, frame, fps, dur}) => {
  const total = dur ?? 150;
  const enter = spring({frame, fps, config: {damping: 14, mass: 0.8, stiffness: 125}, durationInFrames: 18});
  const tp = frame / fps;
  const zoom = 0.94 + 0.06 * vaiven(tp, 9.5);
  const deriva = -7 * vaiven(tp + 1.8, 13);
  const cap = spring({frame: frame - 26, fps, config: {damping: 15}, durationInFrames: 16});
  return (
    <div style={{width: '100%', opacity: Math.min(1, enter * 1.4), transform: `translateY(${26 * (1 - enter)}px)`}}>
      {spec.title ? (
        <div style={{display: 'inline-block', background: th.accent, color: '#100F16', padding: '6px 20px',
                     fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 23, letterSpacing: 5,
                     textTransform: 'uppercase', marginBottom: 18}}>{spec.title}</div>
      ) : null}
      <div style={{width: '100%', height: 372, overflow: 'hidden', borderRadius: 18,
                   border: `2px solid ${th.card}`, background: a(th.cardAlt, 0.55)}}>
        <Img src={staticFile(spec.image)} style={{width: '100%', height: '100%', objectFit: 'contain',
                                                  transform: `scale(${zoom}) translateX(${deriva}px)`}} />
      </div>
      {spec.caption ? (
        <div style={{marginTop: 16, borderLeft: `6px solid ${th.accent2}`, paddingLeft: 22,
                     fontFamily: 'Georgia, serif', fontSize: 34, lineHeight: 1.28, color: th.text,
                     opacity: Math.min(1, cap * 1.4)}}>{spec.caption}</div>
      ) : null}
    </div>
  );
};

// Screenshot REAL dentro de un mock de navegador. Regla de realidad: lo real se
// muestra con material real, nunca con un dibujo.
const Shot: React.FC<P<'shot'>> = ({spec, th, frame, fps, dur}) => {
  const total = dur ?? 150;
  const enter = spring({frame, fps, config: {damping: 14, mass: 0.8, stiffness: 120}, durationInFrames: 18});
  // un 7% de zoom en toda la escena da 0.3 de movimiento medio: se lee como una foto fija.
  // Ken Burns de verdad = zoom mayor MÁS paneo vertical, que además enseña más página.
  const ts = frame / fps;
  const zoom = 1.02 + 0.10 * vaiven(ts, 11);
  const pan = -6 * vaiven(ts + 2.6, 15);
  return (
    <div style={{width: '100%', opacity: Math.min(1, enter * 1.4), transform: `translateY(${28 * (1 - enter)}px)`}}>
      {spec.title ? (
        <div style={{display: 'inline-block', fontFamily: ANTON, fontSize: 42, color: '#100F16',
                     background: th.accent2, padding: '7px 22px', borderRadius: 12,
                     textTransform: 'uppercase', marginBottom: 16, transform: 'rotate(-1.2deg)'}}>{spec.title}</div>
      ) : null}
      <div style={{borderRadius: 16, overflow: 'hidden', border: `2px solid ${th.card}`, background: '#15161C'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#1E2027'}}>
          {['#C66864', '#DEB05C', '#8CB084'].map((c) => (
            <div key={c} style={{width: 13, height: 13, borderRadius: '50%', background: c}} />
          ))}
          <div style={{flex: 1, marginLeft: 12, background: '#0F1015', borderRadius: 8, padding: '7px 14px',
                       fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 22, color: th.muted}}>
            {spec.url_label ?? ''}
          </div>
        </div>
        <div style={{height: 356, overflow: 'hidden'}}>
          <Img src={staticFile(spec.image)} style={{width: '100%', objectFit: 'cover', objectPosition: 'top',
                                                    transform: `scale(${zoom}) translateY(${pan}%)`}} />
        </div>
      </div>
      {spec.caption ? (
        <div style={{marginTop: 16, fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 24,
                     color: th.muted, letterSpacing: 2}}>{spec.caption}</div>
      ) : null}
    </div>
  );
};

// Clip Omni/Veo YA PAGADO de la biblioteca, con titular encima.
const Clip: React.FC<P<'clip'>> = ({spec, th, frame, fps, dur}) => {
  const lines = (spec.lines ?? []).slice(0, 3);
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <OffthreadVideo src={staticFile(spec.video)} muted
                      style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover'}} />
      <div style={{position: 'absolute', inset: 0,
                   background: `linear-gradient(180deg, ${th.bgBottom}66 0%, ${th.bgBottom}CC 78%)`}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, bottom: SAFE_BOTTOM,
                   display: 'flex', flexDirection: 'column', alignItems: 'center',
                   justifyContent: 'center', padding: `0 ${SAFE_RIGHT}px 0 56px`}}>
        {lines.map((line, i) => {
          const p = spring({frame: frame - 4 - i * 6, fps, config: {damping: 13, mass: 0.8, stiffness: 145}, durationInFrames: 18});
          const bg = i % 2 === 0 ? th.accent2 : '#F1EFEA';
          return (
            <div key={i} style={{transform: `translateX(${(i % 2 === 0 ? -1 : 1) * 50 * (1 - p)}px)`,
                                 opacity: Math.min(1, p * 1.4), marginTop: i ? 10 : 0}}>
              <span style={{display: 'inline-block', background: bg, color: '#100F16', fontFamily: ANTON,
                            fontSize: 84, lineHeight: 1.05, textTransform: 'uppercase', padding: '6px 26px'}}>{line}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Mascotita: React.FC<P<'mascota'>> = ({spec, th, frame, fps}) => {
  const pop = spring({frame, fps, config: {damping: 11, mass: 0.7, stiffness: 150}, durationInFrames: 18});
  const bob = Math.sin(frame / 12) * 8;
  const cap = spring({frame: frame - 10, fps, config: {damping: 13}, durationInFrames: 16});
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 30, width: '100%'}}>
      <Img src={staticFile(spec.image)} style={{
        width: 300, height: 'auto', imageRendering: 'pixelated',
        transform: `scale(${pop}) translateY(${bob}px)`,
      }} />
      <div style={{flex: 1, opacity: Math.min(1, cap * 1.4), transform: `translateX(${26 * (1 - cap)}px)`}}>
        {spec.sign_text ? (
          <div style={{background: th.card, border: `3px solid ${th.accent2}`, borderRadius: 18, padding: '22px 26px',
                       fontFamily: ANTON, fontSize: 56, color: th.text, textTransform: 'uppercase', lineHeight: 1.1}}>
            {spec.sign_text}
          </div>
        ) : null}
        {spec.caption ? (
          <div style={{marginTop: 16, fontFamily: 'Georgia, serif', fontSize: 38, color: th.muted, lineHeight: 1.3}}>
            {spec.caption}
          </div>
        ) : null}
      </div>
    </div>
  );
};

// Código tecleándose. El tecleo se ESTIRA a la duración de la escena: con velocidad fija
// una terminal de 14 s terminaba de escribir en 2 y se quedaba congelada 12 (ag01, 17-ago).
const Code: React.FC<P<'code'>> = ({spec, th, frame, fps, dur}) => {
  const total = dur ?? 150;
  const lines = spec.lines ?? [];
  const chars = lines.reduce((n, l) => n + l.length, 0) || 1;
  const cpf = Math.min(2.2, Math.max(0.35, chars / (total * 0.72)));
  let restante = Math.floor(frame * cpf);
  const KW = /(import|from|as|def|return|for|in|if|else|None|True|False|with|print)/g;
  return (
    <div style={{width: '100%', background: a('#0F1015', 0.80), border: `2px solid ${th.card}`, borderRadius: 16,
                 padding: '26px 30px', fontFamily: 'JetBrains Mono, Consolas, monospace'}}>
      {lines.map((l, i) => {
        const n = Math.max(0, Math.min(l.length, restante));
        restante -= l.length;
        const visible = l.slice(0, n);
        const activa = n > 0 && n < l.length;
        const partes = visible.split(KW);
        return (
          <div key={i} style={{fontSize: 28, lineHeight: 1.42, color: th.text, whiteSpace: 'pre-wrap',
                               minHeight: 40, opacity: n > 0 ? 1 : 0.15}}>
            <span style={{color: th.muted, marginRight: 16}}>{String(i + 1).padStart(2, ' ')}</span>
            {partes.map((x, k) => (
              <span key={k} style={{color: KW.test(x) ? th.accent : (x.trim().startsWith('#') ? th.muted : th.text)}}>{x}</span>
            ))}
            {activa && Math.floor(frame / 8) % 2 === 0 ? (
              <span style={{background: th.accent2, color: th.accent2}}>|</span>
            ) : null}
          </div>
        );
      })}
      {spec.caption ? (
        <div style={{marginTop: 20, fontSize: 26, color: th.muted, letterSpacing: 2}}>{spec.caption}</div>
      ) : null}
    </div>
  );
};


// La neurona y la red, dibujadas. Es la ÚNICA parte del video de redes neuronales que no
// se puede fotografiar ni capturar: el movimiento (la señal entrando, las capas
// conectándose) ES el contenido, que es justo cuando se permite animar en vez de la foto.
const Neural: React.FC<P<'neural'>> = ({spec, th, frame, fps, dur}) => {
  const total = dur ?? 150;
  const W = 950, H = 430;
  // construccion repartida: en un panel de 17 s la red no puede quedar armada al segundo 1
  const esc = Math.max(1, (total * 0.5) / 90);
  const nodo = (cx: number, cy: number, r: number, color: string, retraso0: number) => {
    const retraso = retraso0 * esc;
    const p = spring({frame: frame - retraso, fps, config: {damping: 12, mass: 0.7, stiffness: 150}, durationInFrames: 16});
    return <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r * p} fill={th.cardAlt} stroke={color} strokeWidth={4} />;
  };
  const arista = (x1: number, y1: number, x2: number, y2: number, retraso0: number, k: string) => {
    const retraso = retraso0 * esc;
    const p = interpolate(frame, [retraso, retraso + 14 * esc], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    return <line key={k} x1={x1} y1={y1} x2={x1 + (x2 - x1) * p} y2={y1 + (y2 - y1) * p}
                 stroke={th.muted} strokeWidth={2.4} opacity={0.75} />;
  };
  // pulso que recorre la red: la señal entrando, no un adorno
  const pulso = (frame % Math.max(30, total * 0.45)) / Math.max(30, total * 0.45);

  let dibujo: React.ReactNode = null;
  if (spec.mode === 'neurona') {
    const entradas = [90, 215, 340];
    const cx = 470, cy = 215;
    dibujo = (
      <>
        {entradas.map((y, i) => arista(150, y, cx - 52, cy, 6 + i * 4, `e${i}`))}
        {arista(cx + 52, cy, 700, cy, 26, 'sal')}
        {arista(700 + 60, cy, 860, cy, 40, 'sal2')}
        {entradas.map((y, i) => nodo(120, y, 30, th.accent2, i * 4))}
        {nodo(cx, cy, 54, th.accent, 14)}
        <circle cx={730} cy={cy} r={spring({frame: frame - 34, fps, config: {damping: 12}, durationInFrames: 16}) * 44}
                fill="none" stroke={th.accent2} strokeWidth={4} />
        <text x={cx} y={cy + 12} textAnchor="middle" fill={th.text} fontSize={34} fontFamily="Georgia, serif">Σ</text>
        <text x={730} y={cy + 12} textAnchor="middle" fill={th.text} fontSize={26} fontFamily="Georgia, serif">f</text>
        <text x={120} y={y0(entradas)} textAnchor="middle" fill={th.muted} fontSize={22}
              fontFamily="JetBrains Mono, monospace">entradas</text>
        <text x={cx} y={cy + 92} textAnchor="middle" fill={th.muted} fontSize={22}
              fontFamily="JetBrains Mono, monospace">multiplica + bias</text>
        <text x={730} y={cy + 82} textAnchor="middle" fill={th.muted} fontSize={22}
              fontFamily="JetBrains Mono, monospace">activación</text>
        <circle cx={150 + (700 - 150) * pulso} cy={cy} r={9} fill={th.accent} opacity={0.9} />
      </>
    );
  } else {
    const capas = spec.layers ?? [3, 3, 3, 1];
    const paso = W / (capas.length + 0.6);
    const pos = capas.map((n, c) => {
      const x = paso * (c + 0.8);
      const gap = H / (n + 1);
      return Array.from({length: n}, (_, i) => ({x, y: gap * (i + 1)}));
    });
    dibujo = (
      <>
        {pos.slice(0, -1).map((capa, c) =>
          capa.map((a, i) =>
            pos[c + 1].map((b, j) => arista(a.x, a.y, b.x, b.y, c * 16 + (i + j) * 2, `a${c}${i}${j}`)),
          ),
        )}
        {pos.map((capa, c) => capa.map((n, i) => nodo(n.x, n.y, 26, c === 0 ? th.accent2 : th.accent, c * 14 + i * 3)))}
        {pos.flatMap((capa, c) => capa.map((n, i) => (
          <circle key={`p${c}${i}`} cx={n.x} cy={n.y} r={26}
                  fill={th.accent} opacity={Math.max(0, 0.55 - Math.abs(pulso * pos.length - c) * 0.55)} />
        )))}
        {pos.map((capa, c) => (
          <text key={`t${c}`} x={capa[0].x} y={H - 6} textAnchor="middle" fill={th.muted} fontSize={20}
                fontFamily="JetBrains Mono, monospace">
            {(spec.labels ?? [])[c] ?? (c === 0 ? 'entrada' : c === pos.length - 1 ? 'salida' : `capa ${c}`)}
          </text>
        ))}
      </>
    );
  }

  return (
    <div style={{width: '100%'}}>
      {spec.title ? (
        <div style={{display: 'inline-block', background: th.accent, color: '#100F16', padding: '6px 20px',
                     fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 23, letterSpacing: 5,
                     textTransform: 'uppercase', marginBottom: 16}}>{spec.title}</div>
      ) : null}
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet"
           style={{width: '100%', height: 372, display: 'block'}}>{dibujo}</svg>
      {spec.caption ? (
        <div style={{marginTop: 12, borderLeft: `6px solid ${th.accent2}`, paddingLeft: 22,
                     fontFamily: 'Georgia, serif', fontSize: 34, lineHeight: 1.28, color: th.text}}>{spec.caption}</div>
      ) : null}
    </div>
  );
};

const y0 = (ys: number[]) => ys[ys.length - 1] + 52;
