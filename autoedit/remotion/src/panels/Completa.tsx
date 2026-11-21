import React from 'react';
import {interpolate} from 'remotion';
import {Theme} from '../theme';
import {ANTON} from '../fonts';

// LA MÁQUINA COMPLETANDO TEXTO: el modelo escribe token a token delante de ti.
//
// Es la imagen canónica de un LLM y sustituye a la tarjeta de texto que decía "una
// máquina que completa texto" — decirlo con letras es una slide; verlo escribirse es la
// demostración. Aquí el MOVIMIENTO ES EL CONTENIDO, que es la única excepción a la regla
// de "la foto le gana a la animación".
//
// modo 'candidatos': antes de cada token aparece la lista de opciones con su
// probabilidad y la elegida VUELA al texto. Eso enseña de un golpe que el modelo no sabe
// la palabra: escoge de una distribución.

export type CompletaSpec = {
  kind: 'completa';
  prompt: string;                 // lo que le escribiste tú
  tokens: string[];               // lo que va escribiendo el modelo, token a token
  candidatos?: string[][];        // por token: ["grande 62%", "negro 17%", "muy 10%"]
  modo?: 'simple' | 'candidatos';
  label?: string;
  caption?: string;
};

export const Completa: React.FC<{spec: CompletaSpec; th: Theme; frame: number; fps: number; dur?: number}> =
({spec, th, frame, fps, dur}) => {
  const total = Math.max(30, dur ?? 150);
  const t = frame / fps;
  const tokens = (spec.tokens ?? []).slice(0, 14);
  const modo = spec.modo ?? 'simple';
  const cands = spec.candidatos ?? [];

  // El ritmo se REPARTE en la escena: con velocidad fija, un panel de 13 s termina de
  // escribir en 2 y se queda congelado 11 (ese bug ya se pagó dos veces en este repo).
  const arranque = Math.min(fps * 0.9, total * 0.10);
  const ventana = total - arranque - Math.min(fps * 0.8, total * 0.10);
  const cada = ventana / Math.max(1, tokens.length);

  const escritos: number[] = [];          // índices ya escritos
  let enVuelo = -1;                       // el que está siendo elegido ahora
  let vuelo = 0;                          // 0..1 dentro de su turno
  tokens.forEach((_, i) => {
    const t0 = arranque + i * cada;
    const p = (frame - t0) / cada;
    if (p >= 1) escritos.push(i);
    else if (p >= 0) { enVuelo = i; vuelo = p; }
  });

  const cursorOn = Math.floor(frame / 7) % 2 === 0;
  // el bloque respira con periodo propio para que nunca haya un frame idéntico al anterior
  const respira = 1 + 0.008 * Math.sin((2 * Math.PI * t) / 6.5);

  return (
    <div style={{width: '100%'}}>
      <div style={{display: 'inline-block', background: th.accent, color: '#100F16', padding: '6px 20px',
                   fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 23, letterSpacing: 5,
                   textTransform: 'uppercase', marginBottom: 14}}>
        {spec.label ?? 'el modelo escribe'}
      </div>

      <div style={{position: 'relative', width: '100%', minHeight: 300,
                   background: `${th.card}B8`, border: `2px solid ${th.cardAlt}`, borderRadius: 18,
                   padding: '26px 30px', transform: `scale(${respira})`, transformOrigin: 'top left'}}>
        <div style={{fontFamily: 'Georgia, serif', fontSize: 44, lineHeight: 1.38, color: th.text}}>
          <span style={{color: th.muted}}>{spec.prompt}</span>
          {tokens.map((tk, i) => {
            if (escritos.includes(i)) {
              // recién aterrizado: un destello corto y se apaga
              const edad = (frame - (arranque + (i + 1) * cada)) / Math.max(1, fps * 0.55);
              const fresco = Math.max(0, 1 - edad);
              return (
                <span key={i} style={{
                  color: th.text,
                  background: fresco > 0 ? `${th.accent}${Math.round(fresco * 90).toString(16).padStart(2, '0')}` : 'transparent',
                  borderRadius: 6,
                }}>{tk}</span>
              );
            }
            return null;
          })}
          {enVuelo >= 0 && modo === 'simple' ? (
            <span style={{color: th.accent, opacity: Math.min(1, vuelo * 2.2)}}>{tokens[enVuelo]}</span>
          ) : null}
          <span style={{color: th.accent2, opacity: cursorOn ? 1 : 0.12}}>▌</span>
        </div>

        {/* la lista de candidatos: enseña que ELIGE, no que sabe */}
        {modo === 'candidatos' && enVuelo >= 0 && cands[enVuelo] ? (
          <div style={{position: 'absolute', left: 30, right: 30, bottom: -8,
                       display: 'flex', gap: 12, alignItems: 'flex-end',
                       opacity: interpolate(vuelo, [0, 0.12, 0.72, 0.92], [0, 1, 1, 0],
                                            {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
            {cands[enVuelo].slice(0, 4).map((c, k) => {
              const elegido = k === 0;
              // el elegido SUBE hacia el texto en la segunda mitad del turno
              const sube = elegido ? interpolate(vuelo, [0.55, 0.95], [0, -46],
                                                 {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 0;
              return (
                <div key={k} style={{
                  transform: `translateY(${sube}px)`,
                  background: elegido ? th.accent : th.cardAlt,
                  color: elegido ? '#100F16' : th.muted,
                  border: `2px solid ${elegido ? th.accent : th.card}`,
                  borderRadius: 10, padding: '8px 16px',
                  fontFamily: 'JetBrains Mono, Consolas, monospace',
                  fontSize: elegido ? 27 : 23, fontWeight: elegido ? 700 : 400,
                }}>{c}</div>
              );
            })}
          </div>
        ) : null}
      </div>

      {spec.caption ? (
        <div style={{marginTop: modo === 'candidatos' ? 48 : 18,
                     borderLeft: `6px solid ${th.accent2}`, paddingLeft: 22,
                     fontFamily: ANTON, fontSize: 40, lineHeight: 1.1, color: th.text,
                     textTransform: 'uppercase'}}>{spec.caption}</div>
      ) : null}
    </div>
  );
};
