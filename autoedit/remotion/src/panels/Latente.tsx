import React from 'react';
import {interpolate, random, spring} from 'remotion';
import {Theme} from '../theme';
import {ANTON} from '../fonts';

// Espacio vectorial / latente: los tokens caen en un mapa y los de significado parecido
// quedan pegados. Es de los pocos casos donde animar le gana a una foto (regla del repo:
// el DEFAULT visual es una foto de Codex): aquí el MOVIMIENTO es el contenido — un punto
// quieto no enseña que "perro" y "gato" se atraen, verlos viajar y aterrizar juntos sí.
//
// Banda útil del panel: 528 px de alto por 912 de ancho (ver Panel.tsx SUB_ZONE /
// SAFE_BOTTOM / SAFE_RIGHT). Todo lo de aquí cabe dentro con margen.

const W = 912;
const H_MAPA = 400;          // el mapa; deja aire para título y caption dentro de los 528

export type LatenteSpec = {
  kind: 'latente';
  // x, y en 0..1 dentro del mapa. `g` agrupa por significado (mismo g = mismo color).
  tokens: {t: string; x: number; y: number; g?: number}[];
  fase?: 'mapa' | 'vecinos' | 'pareja';
  par?: [string, string];    // en fase 'pareja', los dos que se conectan
  foco?: string;             // en fase 'vecinos', el token cuyo vecindario se marca
  title?: string;
  caption?: string;
};

// vaivén con periodo propio: el mapa nunca se queda quieto, dure el panel 4 s o 20
const vaiven = (t: number, p: number) => 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / p);

export const Latente: React.FC<{spec: LatenteSpec; th: Theme; frame: number; fps: number; dur?: number}> =
({spec, th, frame, fps, dur}) => {
  const total = Math.max(30, dur ?? 150);
  const t = frame / fps;
  const fase = spec.fase ?? 'mapa';
  const tokens = (spec.tokens ?? []).slice(0, 14);

  // deriva lenta del campo entero (parallax): dos periodos distintos para que no sea un vaivén obvio
  const dx = 16 * (vaiven(t, 17) - 0.5);
  const dy = 10 * (vaiven(t + 3.1, 23) - 0.5);

  const par = spec.par ?? [];
  const esPar = (x: string) => par.some((p) => p.toLowerCase() === x.toLowerCase());
  const foco = spec.foco ?? par[0];

  const pos = tokens.map((tk) => ({
    ...tk,
    px: 46 + tk.x * (W - 92),
    py: 34 + tk.y * (H_MAPA - 68),
  }));
  const uno = pos.find((p) => p.t.toLowerCase() === (par[0] ?? '').toLowerCase());
  const dos = pos.find((p) => p.t.toLowerCase() === (par[1] ?? '').toLowerCase());
  const centro = pos.find((p) => p.t.toLowerCase() === (foco ?? '').toLowerCase());

  // los tokens ATERRIZAN escalonados a lo largo de la primera mitad de la escena
  const paso = Math.max(5, (total * 0.45) / Math.max(1, pos.length));
  // el vínculo / vecindario entra en la segunda mitad, no en el frame 20
  const liga = interpolate(frame, [total * 0.42, total * 0.78], [0, 1],
                           {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  const colorDe = (g?: number) => (g === undefined ? th.muted : [th.accent, th.accent2, th.green, th.red][g % 4]);

  return (
    <div style={{width: '100%'}}>
      {spec.title ? (
        <div style={{display: 'inline-block', background: th.accent, color: '#100F16', padding: '6px 20px',
                     fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 23, letterSpacing: 5,
                     textTransform: 'uppercase', marginBottom: 14}}>{spec.title}</div>
      ) : null}

      <div style={{position: 'relative', width: '100%', height: H_MAPA, borderRadius: 18,
                   border: `2px solid ${th.card}`, overflow: 'hidden'}}>
        {/* rejilla de coordenadas, que es lo que hace que se lea como un ESPACIO */}
        <div style={{position: 'absolute', inset: -40, opacity: 0.5,
                     transform: `translate(${dx}px, ${dy}px)`,
                     backgroundImage: `linear-gradient(${th.muted}44 1px, transparent 1px),
                                       linear-gradient(90deg, ${th.muted}33 1px, transparent 1px)`,
                     backgroundSize: '76px 76px'}} />
        {/* halo de fondo: radial-gradient puro, nunca blur() (WSL2 tira tiles opacos) */}
        <div style={{position: 'absolute', left: `${28 + 6 * vaiven(t, 19)}%`, top: '46%',
                     width: 520, height: 520, marginLeft: -260, marginTop: -260,
                     background: `radial-gradient(circle closest-side, ${th.accent}1C 0%, ${th.accent}00 70%)`}} />

        <svg viewBox={`0 0 ${W} ${H_MAPA}`} style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}}>
          {/* vecindario: el círculo que marca "lo que está cerca significa parecido" */}
          {fase === 'vecinos' && centro ? (
            <>
              <circle cx={centro.px + dx * 0.4} cy={centro.py + dy * 0.4}
                      r={132 * liga} fill="none" stroke={th.accent} strokeWidth={3}
                      strokeDasharray="10 8" opacity={0.85}
                      transform={`rotate(${t * 9} ${centro.px} ${centro.py})`} />
              <circle cx={centro.px + dx * 0.4} cy={centro.py + dy * 0.4}
                      r={132 * liga * (0.72 + 0.06 * vaiven(t, 4.2))} fill={th.accent} opacity={0.07} />
            </>
          ) : null}

          {/* el vínculo del par: la línea que se dibuja entre los dos vectores */}
          {fase === 'pareja' && uno && dos ? (
            <>
              <line x1={uno.px + dx * 0.4} y1={uno.py + dy * 0.4}
                    x2={uno.px + (dos.px - uno.px) * liga + dx * 0.4}
                    y2={uno.py + (dos.py - uno.py) * liga + dy * 0.4}
                    stroke={th.accent} strokeWidth={5} opacity={0.95} />
              <circle cx={uno.px + (dos.px - uno.px) * liga + dx * 0.4}
                      cy={uno.py + (dos.py - uno.py) * liga + dy * 0.4}
                      r={7 + 3 * vaiven(t, 2.6)} fill={th.accent} />
            </>
          ) : null}

          {/* los vectores: flecha desde el origen, que es lo que los vuelve VECTORES y no puntos */}
          {pos.map((p, i) => {
            const ap = spring({frame: frame - i * paso, fps,
                               config: {damping: 14, mass: 0.8, stiffness: 120}, durationInFrames: 22});
            if (ap <= 0.001) return null;
            const ang = random(`ang${p.t}`) * Math.PI * 2;
            const vx = p.px + Math.cos(ang) * 190 * (1 - ap) + dx * 0.4;
            const vy = p.py + Math.sin(ang) * 130 * (1 - ap) + dy * 0.4;
            const destaca = (fase === 'pareja' && esPar(p.t)) ||
                            (fase === 'vecinos' && centro && p.t === centro.t);
            const apaga = (fase === 'pareja' && par.length > 0 && !esPar(p.t)) ? 0.3 : 1;
            const c = destaca ? th.accent : colorDe(p.g);
            const r = (destaca ? 13 : 8) + (destaca ? 2.5 * vaiven(t + i, 3.4) : 0.9 * vaiven(t + i * 0.7, 5.1));
            return (
              <g key={p.t} opacity={Math.min(1, ap * 1.4) * apaga}>
                <line x1={46 + dx * 0.4} y1={H_MAPA - 34 + dy * 0.4} x2={vx} y2={vy}
                      stroke={c} strokeWidth={destaca ? 2.6 : 1.4} opacity={destaca ? 0.7 : 0.28} />
                <circle cx={vx} cy={vy} r={r} fill={c} />
                <text x={vx + r + 10} y={vy + 8} fill={destaca ? th.text : th.muted}
                      fontSize={destaca ? 30 : 24} fontFamily="JetBrains Mono, Consolas, monospace">
                  {p.t}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {spec.caption ? (
        <div style={{marginTop: 14, borderLeft: `6px solid ${th.accent2}`, paddingLeft: 22,
                     fontFamily: ANTON, fontSize: 42, lineHeight: 1.1, color: th.text,
                     textTransform: 'uppercase'}}>{spec.caption}</div>
      ) : null}
    </div>
  );
};
