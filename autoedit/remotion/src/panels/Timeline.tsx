import React from 'react';
import {interpolate, spring} from 'remotion';
import {Theme} from '../theme';
import {ANTON} from '../fonts';

// Línea de tiempo del panel inferior (1080x1026, banda útil 912x528).
//
// El canal cuenta historia de la IA todo el tiempo (1958, 2017 el transformer, 2022
// ChatGPT) y hoy eso son titulares sueltos: el espectador no ve la DISTANCIA entre las
// fechas, que es justo lo que hace la historia interesante. Aquí la línea AVANZA y cada
// hito entra cuando la línea lo alcanza, con una pausa encima: el ritmo cuenta el paso
// del tiempo sin narrarlo.
//
// Todo el recorrido se REPARTE en durationInFrames (paneles de 4 a 20 s): con tiempos
// fijos un panel de 18 s se quedaba 16 congelado — ese bug ya se pagó dos veces en este
// repo (TerminalSlide y los define de jose01).

export type TimelineSpec = {
  kind: 'timeline';
  items: {year: string; text: string; mark?: boolean}[];
  title?: string;
  orient?: 'horizontal' | 'vertical';
};

// Alturas medidas contra los 528 px útiles (ver Panel.tsx: SUB_ZONE / SAFE_BOTTOM).
const MAX_H = 528;
const TITLE_H = 54;      // kicker 26 px × lineHeight 1.2 (explícito abajo) + 22 de margen
const RAIL_H = 60;       // banda donde vive la línea horizontal y sus puntos
const RAIL_X = 250;      // columna de años a la izquierda, en vertical

export const Timeline: React.FC<{spec: TimelineSpec; th: Theme; frame: number; fps: number; dur?: number}> = ({
  spec, th, frame, fps, dur,
}) => {
  const total = dur ?? 150;
  const vertical = spec.orient === 'vertical';
  // Horizontal admite 5 hitos; vertical solo 4 (cada fila necesita alto para el texto).
  const items = (spec.items ?? []).slice(0, vertical ? 4 : 5);
  const n = items.length;
  if (n === 0) return null;

  // Centro de cada hito como fracción del recorrido: coincide con el centro de su columna
  // (o de su fila) porque todas miden lo mismo.
  const cf = items.map((_, i) => (i + 0.5) / n);

  // ── recorrido de la línea: avanza y SE DETIENE en cada hito ──────────────────
  // Los tramos de avance se reparten proporcionales a la distancia y las pausas se
  // escalan con la duración, así el mismo componente respira igual en 4 s que en 20 s.
  const L0 = 8;                       // arranca tras el título
  const L1 = Math.max(L0 + 24, total * 0.82);
  const span = L1 - L0;
  const hold = Math.max(2, span * 0.055);          // pausa sobre cada hito
  const move = Math.max(12, span - n * hold);      // tiempo total de avance
  const stops: number[] = [L0];
  const vals: number[] = [0];
  const llegada: number[] = [];                    // frame en que la línea toca el hito i
  let f = L0;
  let prev = 0;
  for (let i = 0; i < n; i++) {
    f += (cf[i] - prev) * move;
    stops.push(f); vals.push(cf[i]);
    llegada.push(f);
    f += hold;
    stops.push(f); vals.push(cf[i]);               // la pausa: mismo valor, más frames
    prev = cf[i];
  }
  f += (1 - prev) * move;
  stops.push(f); vals.push(1);
  const prog = interpolate(frame, stops, vals, {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // Deriva lentísima de todo el bloque: evita el fotograma muerto en la cola del panel.
  // SIMÉTRICA (+5 → -5) a propósito: el bloque va centrado en los 528 px, así que una deriva
  // de -10 se comía toda la holgura de arriba en el caso más alto (vertical de 4 sin título:
  // 504 px de bloque, 12 de holgura por lado; medido: el título quedaba a 2 px de la zona de
  // subtítulos). Con ±5 quedan 7 px de margen por arriba Y por abajo, y el bloque sigue vivo.
  const deriva = interpolate(frame, [0, total], [5, -5], {extrapolateRight: 'clamp'});
  const tit = spring({frame, fps, config: {damping: 200}, durationInFrames: 14});

  // Tamaños según cuántos hitos entran: con 5 columnas hay 182 px por hito.
  const yearSize = n <= 3 ? 68 : n === 4 ? 58 : 52;
  const markYear = Math.round(yearSize * 1.42);
  const textSize = vertical ? 31 : n <= 3 ? 34 : n === 4 ? 31 : 28;
  const yearRowH = markYear + 10;
  // Renglones que caben en la fila de texto: 4 cuando las columnas son estrechas (5 hitos),
  // 3 si son anchas. El recorte es por LÍNEAS ENTERAS (-webkit-line-clamp), no por píxeles:
  // así la fila mide siempre lo mismo (nunca empuja la línea) y no queda media letra cortada.
  const textLines = n >= 5 ? 4 : 3;
  const textRowH = vertical ? 0 : Math.ceil(textSize * 1.26 * textLines) + 10;

  // Un año es una etiqueta corta, pero "1997-2007" NO se puede partir en dos renglones y a
  // 74 px mide 216 px en una columna de 166: se encoge, jamás se sale por el costado.
  const yearFs = (label: string, base: number) =>
    label.length <= 4 ? base : Math.max(22, Math.round((base * 4.4) / label.length));

  const revelado = (i: number) =>
    spring({frame: frame - llegada[i], fps, config: {damping: 14, mass: 0.8, stiffness: 140}, durationInFrames: 16});

  // ── punto del hito ───────────────────────────────────────────────────────────
  // El hito con mark:true es el ancla del video: más grande, en th.accent y con un pulso
  // CONTINUO hecho con radial-gradient (blur() está prohibido: WSL2 lo rasteriza por
  // tiles y deja rectángulos opacos encima de la escena).
  const punto = (i: number) => {
    const it = items[i];
    const p = revelado(i);
    const r = it.mark ? 42 : 22;
    const P = 40;                                   // periodo del pulso, en frames
    const anillos = it.mark
      ? [0, 0.5].map((off) => {
          const q = ((frame / P) + off) % 1;
          return (
            <div key={off} style={{
              position: 'absolute', left: '50%', top: '50%', width: r * 3.6, height: r * 3.6,
              marginLeft: -r * 1.8, marginTop: -r * 1.8,
              transform: `scale(${0.4 + q * 0.9})`, opacity: (1 - q) * 0.8 * p,
              background: `radial-gradient(circle, ${th.accent}00 40%, ${th.accent}AA 56%, ${th.accent}00 72%)`,
              pointerEvents: 'none',
            }} />
          );
        })
      : null;
    // El hito marcado es un DISCO lleno y los demás aros huecos: la jerarquía la da la
    // forma, no el brillo (paleta sobria; con dos colores llenos ganaba el más cálido
    // aunque no fuera el importante).
    return (
      <>
        {anillos}
        <div style={{
          position: 'absolute', left: '50%', top: '50%', width: r, height: r,
          marginLeft: -r / 2, marginTop: -r / 2, borderRadius: '50%',
          background: it.mark ? th.accent : th.bgBottom,
          border: it.mark ? `4px solid ${th.bgBottom}` : `5px solid ${th.accent2}`,
          boxSizing: 'border-box',
          transform: `scale(${p})`,
        }} />
      </>
    );
  };

  // Cabeza luminosa en la punta de la línea que se dibuja (halo por gradiente, sin blur).
  const cabeza = (
    <div style={{
      position: 'absolute', left: '50%', top: '50%', width: 90, height: 90,
      marginLeft: -45, marginTop: -45,
      background: `radial-gradient(circle, ${th.accent}CC 0%, ${th.accent}44 34%, ${th.accent}00 68%)`,
      opacity: interpolate(prog, [0, 0.04, 0.95, 1], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
    }} />
  );

  // Brillo que barre la parte YA dibujada. El hijo se posiciona en % del ancho del padre
  // (que mide prog del riel), por eso se divide entre prog para que el barrido viaje en
  // coordenadas del riel completo y no se acelere al crecer la línea.
  const barridoFrac = (frame % 90) / 90;
  const barrido = (
    <div style={{
      position: 'absolute', top: 0, bottom: 0, width: '22%',
      left: `${(barridoFrac / Math.max(prog, 0.001)) * 100}%`,
      background: `linear-gradient(90deg, ${th.text}00, ${th.text}55, ${th.text}00)`,
      opacity: prog > 0.02 ? 0.5 : 0,
    }} />
  );

  const titulo = spec.title ? (
    <div style={{
      fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 26, lineHeight: 1.2,
      color: th.muted, letterSpacing: 5, textTransform: 'uppercase', marginBottom: 22,
      textAlign: 'center', opacity: tit,
    }}>{spec.title}</div>
  ) : null;

  // ── vertical: rail a la izquierda, años a un lado y texto al otro ────────────
  if (vertical) {
    // 24 px de holgura reservados: el bloque va centrado, así que la mitad queda arriba y
    // la mitad abajo, y ahí caben los ±5 px de la deriva sin tocar ninguna zona prohibida.
    // Caso más alto medido: 4 hitos sin título = 504 px de bloque, 7 px libres por lado.
    const libre = MAX_H - (spec.title ? TITLE_H : 0) - 24;
    const rowH = Math.min(150, libre / n);
    // Líneas que caben en una fila, medidas con la tipografía MÁS grande (la del hito
    // marcado). Sin este recorte una frase de 3-4 renglones se sale de su fila, pisa la
    // siguiente y la última se derrama por debajo de los 528 px útiles.
    const vLines = Math.max(1, Math.floor((rowH - 10) / ((textSize + 3) * 1.26)));
    return (
      <div style={{width: '100%', transform: `translateY(${deriva}px)`}}>
        {titulo}
        <div style={{position: 'relative', height: rowH * n}}>
          {/* riel apagado + tramo recorrido */}
          <div style={{position: 'absolute', left: RAIL_X - 3, top: 0, bottom: 0, width: 6,
                       background: th.cardAlt, opacity: 0.9}} />
          <div style={{position: 'absolute', left: RAIL_X - 3, top: 0, width: 6, height: `${prog * 100}%`,
                       background: `linear-gradient(180deg, ${th.accent2}, ${th.accent})`}} />
          <div style={{position: 'absolute', left: RAIL_X, top: `${prog * 100}%`}}>{cabeza}</div>
          {items.map((it, i) => {
            const p = revelado(i);
            const size = it.mark ? markYear : yearSize;
            return (
              <div key={i} style={{
                position: 'absolute', left: 0, right: 0, top: rowH * i, height: rowH,
                display: 'flex', alignItems: 'center',
                opacity: Math.min(1, p * 1.4),
              }}>
                <div style={{
                  width: RAIL_X - 30, flexShrink: 0, minWidth: 0, textAlign: 'right', paddingRight: 26,
                  fontFamily: ANTON, fontSize: yearFs(it.year, size), lineHeight: 1,
                  color: it.mark ? th.accent : th.text,
                  transform: `translateX(${-30 * (1 - p)}px)`,
                }}>{it.year}</div>
                <div style={{width: 60, flexShrink: 0}} />
                <div style={{
                  flex: 1, minWidth: 0, fontFamily: 'Georgia, serif',
                  fontSize: it.mark ? textSize + 3 : textSize,
                  lineHeight: 1.26, color: th.text, opacity: it.mark ? 1 : 0.84,
                  display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: vLines,
                  overflow: 'hidden', overflowWrap: 'break-word',
                  transform: `translateX(${34 * (1 - p)}px)`,
                }}>{it.text}</div>
              </div>
            );
          })}
          {/* los puntos van al final para quedar por encima de las filas */}
          {items.map((_, i) => (
            <div key={`d${i}`} style={{position: 'absolute', left: RAIL_X, top: `${cf[i] * 100}%`}}>{punto(i)}</div>
          ))}
        </div>
      </div>
    );
  }

  // ── horizontal (default): años arriba, línea al centro, texto abajo ──────────
  return (
    <div style={{width: '100%', transform: `translateY(${deriva}px)`}}>
      {titulo}
      <div style={{position: 'relative', width: '100%'}}>
        {/* fila de años: alto fijo y alineada al pie para que el año grande del hito
            marcado no empuje la línea hacia abajo */}
        <div style={{display: 'flex', height: yearRowH, alignItems: 'flex-end'}}>
          {items.map((it, i) => {
            const p = revelado(i);
            return (
              <div key={i} style={{
                flex: 1, minWidth: 0, textAlign: 'center', padding: '0 6px',
                fontFamily: ANTON, fontSize: yearFs(it.year, it.mark ? markYear : yearSize), lineHeight: 1,
                color: it.mark ? th.accent : th.text,
                opacity: Math.min(1, p * 1.4),
                // 10 px, no 18: con 18 el año marcado (74 px) se metía en la banda del riel
                // y pisaba su propio punto a mitad de la entrada.
                transform: `translateY(${10 * (1 - p)}px)`,
              }}>{it.year}</div>
            );
          })}
        </div>

        <div style={{position: 'relative', height: RAIL_H}}>
          <div style={{position: 'absolute', left: 0, right: 0, top: RAIL_H / 2 - 3, height: 6,
                       background: th.cardAlt, opacity: 0.9}} />
          <div style={{position: 'absolute', left: 0, top: RAIL_H / 2 - 3, height: 6, width: `${prog * 100}%`,
                       background: `linear-gradient(90deg, ${th.accent2}, ${th.accent})`, overflow: 'hidden'}}>
            {barrido}
          </div>
          <div style={{position: 'absolute', left: `${prog * 100}%`, top: RAIL_H / 2}}>{cabeza}</div>
          {items.map((_, i) => (
            <div key={i} style={{position: 'absolute', left: `${cf[i] * 100}%`, top: RAIL_H / 2}}>{punto(i)}</div>
          ))}
        </div>

        {/* fila de textos: alto fijo y recorte, así la línea no se mueve aunque un hito
            traiga una frase más larga que los demás */}
        <div style={{display: 'flex', height: textRowH, alignItems: 'flex-start', overflow: 'hidden'}}>
          {items.map((it, i) => {
            const p = revelado(i);
            return (
              <div key={i} style={{
                // minWidth 0 + corte de palabra: sin esto una palabra larga ("retroalimentación"
                // mide 240 px a 28 px y la columna son 166) ensancha SU columna, encoge las
                // demás y los textos dejan de caer bajo su punto (los puntos van en % fijos).
                flex: 1, minWidth: 0, padding: '10px 8px 0', textAlign: 'center',
                fontFamily: 'Georgia, serif', fontSize: textSize, lineHeight: 1.26,
                display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: textLines,
                overflow: 'hidden', overflowWrap: 'break-word',
                color: th.text, opacity: Math.min(1, p * 1.4) * (it.mark ? 1 : 0.84),
                transform: `translateY(${-14 * (1 - p)}px)`,
              }}>{it.text}</div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
