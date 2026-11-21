import React from 'react';
import {Easing, Img, interpolate, spring, staticFile} from 'remotion';
import {Theme} from '../theme';
import {ANTON} from '../fonts';

// Panel ANTES/DESPUÉS. El `compare` que ya existe son dos tarjetas de texto quietas lado a
// lado: eso informa pero no retiene. Aquí el cambio OCURRE en pantalla (una cortina que
// destapa, unas franjas que caen, una tarjeta que gira), que es el gesto que la gente se
// queda a ver hasta el final.
//
// PRESUPUESTO DE ALTO (medido sobre Panel.tsx): la banda útil del panel inferior son
// 1026 - SUB_ZONE(168) - SAFE_BOTTOM(330) = 528 px de alto por 1080 - SAFE_RIGHT(104) - 64
// de padding = 912 px de ancho. La suma estática es 516 (escenario 380 + 16 de aire + 120
// de caption), pero el TOPE lo garantiza la estructura: el contenedor de fuera recorta a
// MAX_H, así que ni la animación de entrada ni un caption largo pueden morder la franja
// donde TikTok pinta el copy. (Verificado: @remotion/bundler inyecta `* {box-sizing:
// border-box}` también al renderizar, así que el borde de 2 px NO suma alto.)
const MAX_H = 528;         // tope duro de la banda útil
const STAGE_H_CAP = 380;   // con caption debajo
const STAGE_H_SOLO = 470;  // sin caption, el escenario se queda con casi todo
const CAPTION_MAX = 120;   // 3 líneas de 40 px; más largo se recorta a propósito
const STAGE_W = 912;       // ancho real del escenario, para la corrección de perspectiva
const PERSP = 1500;
const CHIP_MAX = 420;      // dos chips + aire caben en los 908 px de la fila

export type RevealSpec = {
  kind: 'reveal';
  before: {image?: string; text?: string; label: string};
  after: {image?: string; text?: string; label: string};
  mode?: 'cortina' | 'persiana' | 'flip';
  caption?: string;
  bands?: number; // solo 'persiana': 5-7 franjas (default 6)
};

type Cara = {image?: string; text?: string; label: string};
type Rol = 'antes' | 'despues';

// Alpha en hex de dos dígitos: los colores del Theme son #RRGGBB y el repo les concatena
// el alpha (#RRGGBBAA). Nunca escribimos un color a mano.
const hexA = (a: number) => Math.round(Math.min(1, Math.max(0, a)) * 255).toString(16).padStart(2, '0');

// El tamaño del titular sale del largo del texto: una cara puede traer "12 SEGUNDOS" o una
// frase de 60 caracteres y las dos tienen que caber en el mismo escenario sin desbordar.
const tamano = (txt: string, alto: number) => {
  const n = txt.length;
  const base = n <= 12 ? 92 : n <= 22 ? 74 : n <= 38 ? 58 : n <= 60 ? 46 : 36;
  // en el escenario chico (con caption) bajamos un escalón para no comernos el aire
  return alto < 420 ? Math.round(base * 0.88) : base;
};

// ─────────────────────────── una cara del antes/después ───────────────────────────
// Funciona con foto, con texto grande, o con las dos cosas (foto + rótulo abajo), porque
// muchas veces no hay material real que enseñar y la cara tiene que sostenerse sola.
const Face: React.FC<{cara: Cara; th: Theme; frame: number; total: number; rol: Rol; alto: number}> =
({cara, th, frame, total, rol, alto}) => {
  const antes = rol === 'antes';
  const texto = (cara.text ?? '').trim() || (cara.image ? '' : cara.label);
  // Ken Burns opuesto por cara: el ANTES se acerca y el DESPUÉS se aleja, así el corte
  // entre los dos se nota aunque las dos fotos se parezcan.
  const zoom = antes
    ? interpolate(frame, [0, total], [1.04, 1.13], {extrapolateRight: 'clamp'})
    : interpolate(frame, [0, total], [1.12, 1.03], {extrapolateRight: 'clamp'});
  const fondo = antes
    ? `linear-gradient(152deg, ${th.cardAlt} 0%, ${th.bgBottom} 100%)`
    : `linear-gradient(152deg, ${th.card} 0%, ${th.bgTop} 100%)`;
  const halo = antes ? th.accent2 : th.accent;

  return (
    <div style={{position: 'absolute', inset: 0, background: fondo, overflow: 'hidden'}}>
      {cara.image ? (
        <Img src={staticFile(cara.image)} style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', transform: `scale(${zoom})`,
        }} />
      ) : (
        // halo de acento por radial-gradient: PROHIBIDO blur() (WSL2 tira tiles opacos).
        // Los dos topes salen del MISMO token: si el de salida fuera otro color, el
        // degradado a alpha 0 no sería el mismo halo.
        <div style={{
          position: 'absolute', left: antes ? -120 : 'auto', right: antes ? 'auto' : -120,
          top: -80, width: 620, height: 620,
          background: `radial-gradient(circle, ${halo}22 0%, ${halo}00 68%)`,
        }} />
      )}
      {texto ? (
        <>
          {cara.image ? (
            // velo para que el rótulo se lea sobre la foto sin recurrir a sombras
            <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: alto * 0.55,
                         background: `linear-gradient(180deg, ${th.bgBottom}00, ${th.bgBottom}E6 72%)`}} />
          ) : null}
          <div style={{
            position: 'absolute', left: 0, right: 0,
            ...(cara.image ? {bottom: 26} : {top: 0, bottom: 0, display: 'flex', alignItems: 'center'}),
            padding: '0 38px', justifyContent: 'center',
          }}>
            <div style={{
              width: '100%', textAlign: 'center', fontFamily: ANTON,
              fontSize: cara.image ? Math.min(52, tamano(texto, alto)) : tamano(texto, alto),
              lineHeight: 1.06, letterSpacing: 0.5, textTransform: 'uppercase',
              // una palabra sola más larga que la caja (una URL, un nombre técnico) se
              // parte en vez de salirse y que el overflow se la coma a la mitad
              overflowWrap: 'break-word',
              // el contraste lo da el VALOR: el ANTES en hueso apagado, el DESPUÉS pleno
              color: antes ? th.muted : th.text,
            }}>{texto}</div>
          </div>
        </>
      ) : null}
      {/* borde de identidad: frío para el antes, cálido para el después */}
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 5,
                   background: antes ? th.muted : th.accent, opacity: antes ? 0.5 : 0.95}} />
    </div>
  );
};

// Etiqueta ANTES / DESPUÉS. Fondo sólido siempre: tiene que leerse encima de lo que sea
// que esté pasando debajo (foto clara, franja a medio caer, tarjeta girando).
// `label` viene del guion y es texto libre: sin el tope de ancho, dos etiquetas largas
// (medido: 31 caracteres cada una = 1187 px en una fila de 868) se imprimen una encima de
// la otra en el centro del escenario.
const Chip: React.FC<{text: string; th: Theme; rol: Rol; pos: React.CSSProperties}> = ({text, th, rol, pos}) => (
  <div style={{
    position: 'absolute', zIndex: 5, ...pos,
    fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 23, letterSpacing: 4,
    textTransform: 'uppercase', padding: '8px 18px', borderRadius: 10, whiteSpace: 'nowrap',
    boxSizing: 'border-box', maxWidth: CHIP_MAX, overflow: 'hidden', textOverflow: 'ellipsis',
    ...(rol === 'antes'
      ? {background: th.cardAlt, color: th.text, border: `2px solid ${th.muted}80`}
      : {background: th.accent, color: '#100F16', border: `2px solid ${th.accent}`}),
  }}>{text}</div>
);

export const Reveal: React.FC<{spec: RevealSpec; th: Theme; frame: number; fps: number; dur?: number}> =
({spec, th, frame, fps, dur}) => {
  const total = Math.max(30, dur ?? 150);
  const modo = spec.mode ?? 'cortina';
  const hayCap = Boolean(spec.caption && spec.caption.trim());
  const H = hayCap ? STAGE_H_CAP : STAGE_H_SOLO;
  const enter = spring({frame, fps, config: {damping: 14, mass: 0.8, stiffness: 125}, durationInFrames: 18});
  // el caption entra cuando el cambio ya empezó a verse, no antes (si no, spoilea)
  const cap = spring({frame: frame - total * 0.34, fps, config: {damping: 16}, durationInFrames: 16});

  const antesCara = <Face cara={spec.before} th={th} frame={frame} total={total} rol="antes" alto={H} />;
  const despuesCara = <Face cara={spec.after} th={th} frame={frame} total={total} rol="despues" alto={H} />;

  // ─────────────── cortina ───────────────
  // Una línea de acento barre de izquierda a derecha destapando el DESPUÉS sobre el ANTES.
  // El barrido ocupa el 68% de la escena (no 20 frames): un panel dura 4-20 s y una
  // animación corta deja cientos de frames congelados — ese bug ya se pagó dos veces aquí.
  let escena: React.ReactNode = null;
  if (modo === 'cortina') {
    const ini = Math.max(4, total * 0.12);
    const fin = Math.max(ini + 24, total * 0.80);
    const p = interpolate(frame, [ini, fin], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    const bob = Math.sin(frame / 9) * 5;                       // el tirador nunca queda quieto
    const opTirador = interpolate(frame, [fin - 4, fin + 12], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    escena = (
      <>
        {antesCara}
        <div style={{position: 'absolute', inset: 0, clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`}}>
          {despuesCara}
        </div>
        <div style={{position: 'absolute', top: 0, bottom: 0, left: `${p * 100}%`, width: 0, zIndex: 4, opacity: opTirador}}>
          <div style={{position: 'absolute', top: 0, bottom: 0, left: -75, width: 150,
                       background: `radial-gradient(ellipse at center, ${th.accent}38 0%, ${th.accent}00 70%)`}} />
          <div style={{position: 'absolute', top: 0, bottom: 0, left: -3, width: 6, background: th.accent}} />
          <div style={{position: 'absolute', top: '50%', left: -28, marginTop: -49 + bob,
                       width: 56, height: 98, borderRadius: 28, background: th.accent, color: '#100F16',
                       display: 'flex', alignItems: 'center', justifyContent: 'center',
                       fontFamily: ANTON, fontSize: 30, letterSpacing: 2}}>‹›</div>
        </div>
        {/* el DESPUÉS nace a la izquierda y el ANTES sobrevive a la derecha: cada etiqueta
            se planta sobre el territorio que de verdad le toca */}
        <Chip text={spec.after.label} th={th} rol="despues" pos={{left: 20, top: 18}} />
        <Chip text={spec.before.label} th={th} rol="antes" pos={{right: 20, top: 18}} />
      </>
    );
  } else if (modo === 'persiana') {
    // ─────────────── persiana ───────────────
    // El después entra en franjas horizontales escalonadas, alternando el lado de entrada.
    const N = Math.min(7, Math.max(5, Math.round(spec.bands ?? 6)));
    const ini = Math.max(3, total * 0.10);
    const win = Math.max(24, total * 0.74);
    const cada = win * 0.46;                       // se solapan: cascada, no cola de espera
    const paso = N > 1 ? (win - cada) / (N - 1) : 0;
    // Bordes ENTEROS y contiguos: con H/N fraccionario (380/6 = 63.33) quedaban 4 filas de
    // costura donde se veía el ANTES por debajo, y no se iban al terminar la animación.
    const bordes = new Array(N + 1).fill(0).map((_, i) => Math.round((i * H) / N));
    const franjas = new Array(N).fill(0).map((_, i) => {
      const t0 = ini + i * paso;
      // MISMO easing para la franja y para su filo: antes la franja iba con ease-out y el
      // filo lineal, así que el filo se quedaba a media pantalla del borde que marcaba.
      const p = interpolate(frame, [t0, t0 + cada], [0, 1],
        {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
      return {p, der: i % 2 === 1, y0: bordes[i], y1: bordes[i + 1]};
    });
    // UNA sola instancia de la cara del después, recortada en franjas con un mask-image de
    // N capas. Antes se montaba la cara N veces (hasta 8 <Img> por frame con el `antes`,
    // el doble del presupuesto del repo); ahora son 2 <Img> como en los otros dos modos.
    // Medido en el Chrome 149 headless de este equipo: corta exacto y sin costuras.
    const capas = franjas.map(({p, der}) => {
      const q = (p * 100).toFixed(3);
      const r = (100 - p * 100).toFixed(3);
      return der
        ? `linear-gradient(to right, #0000 0 ${r}%, #000 ${r}% 100%)`
        : `linear-gradient(to right, #000 0 ${q}%, #0000 ${q}% 100%)`;
    }).join(',');
    const tamanos = franjas.map((f) => `100% ${f.y1 - f.y0}px`).join(',');
    const sitios = franjas.map((f) => `0px ${f.y0}px`).join(',');
    const mascara: React.CSSProperties = {
      maskImage: capas, WebkitMaskImage: capas,
      maskSize: tamanos, WebkitMaskSize: tamanos,
      maskPosition: sitios, WebkitMaskPosition: sitios,
      maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat',
    };
    escena = (
      <>
        {antesCara}
        <div style={{position: 'absolute', inset: 0, ...mascara}}>
          {despuesCara}
        </div>
        {franjas.map((f, i) => (
          <React.Fragment key={i}>
            {i > 0 ? (
              <div style={{position: 'absolute', left: 0, right: 0, top: f.y0, height: 2,
                           background: th.accent, opacity: 0.3 * f.p}} />
            ) : null}
            {/* filo encendido en la cabeza de cada franja mientras viaja */}
            {f.p > 0.01 && f.p < 0.99 ? (
              <div style={{position: 'absolute', top: f.y0, height: f.y1 - f.y0, width: 5, background: th.accent,
                           ...(f.der ? {left: `${(1 - f.p) * 100}%`} : {left: `${f.p * 100}%`}), opacity: 0.85}} />
            ) : null}
          </React.Fragment>
        ))}
        <Chip text={spec.before.label} th={th} rol="antes" pos={{left: 20, top: 18}} />
        <Chip text={spec.after.label} th={th} rol="despues" pos={{right: 20, top: 18}} />
      </>
    );
  } else {
    // ─────────────── flip ───────────────
    // rotateY con perspective (permitido; lo prohibido es blur/drop-shadow). Las etiquetas
    // viajan DENTRO de cada cara: la de atrás va pre-rotada 180°, así se lee derecha.
    const g0 = Math.max(6, total * 0.30);
    const g1 = Math.max(g0 + 20, total * 0.66);
    const g = interpolate(frame, [g0, g1], [0, 180],
      {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)});
    const vaiven = Math.sin(frame / 34) * 3.2;   // respiración: la tarjeta nunca se congela
    const giro = g + vaiven;
    const rad = (giro * Math.PI) / 180;
    const medio = Math.abs(Math.sin(rad));       // 0 de frente, 1 de canto
    // Con perspective el filo que se ACERCA crece: medido en Chrome, la tarjeta se salía
    // 12.7 px del escenario a ~16° y ~168° y el overflow:hidden le rebanaba las esquinas
    // justo al empezar y al terminar el giro. Deshacemos la proyección en vez de aplicar
    // un 7 % plano (que encogía donde no hacía falta y no donde sí).
    const proy = (Math.abs(Math.cos(rad)) * PERSP) / (PERSP - (STAGE_W / 2) * medio);
    const esc = Math.min(1, 1 / Math.max(1, proy)) * (1 - 0.05 * medio);
    const sombra = `${th.bgBottom}${hexA(0.42 * medio)}`;  // se oscurece de canto, sin filter
    const carota = (nodo: React.ReactNode, chip: React.ReactNode, atras: boolean) => (
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 20, overflow: 'hidden',
        backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
        transform: atras ? 'rotateY(180deg)' : undefined,
      }}>
        {nodo}
        <div style={{position: 'absolute', inset: 0, background: sombra}} />
        {chip}
      </div>
    );
    escena = (
      <div style={{position: 'absolute', inset: 0, perspective: PERSP}}>
        <div style={{position: 'absolute', inset: 0, transformStyle: 'preserve-3d',
                     transform: `rotateY(${giro}deg) scale(${esc})`}}>
          {carota(antesCara, <Chip text={spec.before.label} th={th} rol="antes" pos={{left: 20, top: 18}} />, false)}
          {carota(despuesCara, <Chip text={spec.after.label} th={th} rol="despues" pos={{left: 20, top: 18}} />, true)}
        </div>
      </div>
    );
  }

  // El de fuera SOLO recorta: es el que garantiza el tope de 528 px pase lo que pase con la
  // entrada. El de dentro es el que se mueve; antes la traslación de entrada vivía en el
  // contenedor de fuera y empujaba el bloque 26 px hacia abajo, o sea dentro de la franja
  // donde TikTok pinta el copy (el contenido solo tiene 6 px de aire por abajo).
  return (
    <div style={{width: '100%', maxHeight: MAX_H, overflow: 'hidden'}}>
      <div style={{opacity: Math.min(1, enter * 1.4), transform: `translateY(${18 * (1 - enter)}px)`}}>
        <div style={{position: 'relative', width: '100%', height: H, borderRadius: 20, boxSizing: 'border-box',
                     overflow: 'hidden', border: `2px solid ${th.card}`, background: th.bgBottom}}>
          {escena}
        </div>
        {hayCap ? (
          <div style={{marginTop: 16, maxHeight: CAPTION_MAX, overflow: 'hidden',
                       borderLeft: `6px solid ${th.accent2}`, paddingLeft: 22,
                       fontFamily: 'Georgia, serif', fontSize: 32, lineHeight: 1.25, color: th.text,
                       opacity: Math.min(1, cap * 1.4), transform: `translateX(${20 * (1 - cap)}px)`}}>
            {spec.caption}
          </div>
        ) : null}
      </div>
    </div>
  );
};
