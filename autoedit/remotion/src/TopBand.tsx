import React from 'react';
import {AbsoluteFill, random, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Theme, themeOf} from './theme';
import {ANTON} from './fonts';

// Banda superior 1080x660 del composite presentador (host_layout). Kind "headline":
// titular de hook en 2-3 líneas sobre barras de acento, rotado, con entrada spring —
// el "segundo hook" para quien lee antes de escuchar (estilo Morfeo).
export type TopBandSpec = {
  kind: 'headline';
  lines: string[];             // 2-3 líneas MUY cortas (MAYÚS)
  kicker?: string;             // texto mono pequeño arriba (opcional)
};

export const TopBand: React.FC<{spec: TopBandSpec; theme?: string}> = ({spec, theme}) => {
  const th: Theme = themeOf(theme ?? 'violeta');
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;

  const lines = (spec.lines ?? []).slice(0, 3);

  return (
    <AbsoluteFill style={{background: `linear-gradient(165deg, ${th.bgTop} 0%, ${th.bgBottom} 100%)`, overflow: 'hidden'}}>
      {/* partículas de marca (mismas que el fondo del cuerpo) */}
      {new Array(12).fill(0).map((_, i) => {
        const bx = random(`tx${i}`) * width;
        const by = random(`ty${i}`) * height * 0.9;
        const dx = Math.cos(t * 0.5 + i) * 18;
        const dy = Math.sin(t * 0.4 + i * 1.3) * 14;
        return (
          <div key={i} style={{
            position: 'absolute', left: bx + dx, top: by + dy,
            width: 5 + (i % 3) * 2, height: 5 + (i % 3) * 2, borderRadius: '50%',
            background: i % 2 ? th.accent2 : th.accent, opacity: 0.32,
          }} />
        );
      })}
      {/* grano anti-banding (estático) */}
      <svg width={width} height={height} style={{position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity: 0.14, pointerEvents: 'none'}}>
        <filter id="tb-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="2" stitchTiles="stitch" seed="11" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#tb-grain)" />
      </svg>
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <div style={{transform: 'rotate(-2deg)', textAlign: 'center'}}>
          {spec.kicker ? (
            <div style={{
              fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 26, color: '#B9B9D0',
              letterSpacing: 5, textTransform: 'uppercase', marginBottom: 18,
              opacity: spring({frame, fps, durationInFrames: 14}),
            }}>
              {spec.kicker}
            </div>
          ) : null}
          {lines.map((line, i) => {
            const p = spring({
              frame: frame - 4 - i * 5, fps,
              config: {damping: 12, mass: 0.8, stiffness: 140}, durationInFrames: 18,
            });
            const off = (i % 2 === 0 ? -1 : 1) * 60 * (1 - p);
            // alterna cian de marca y blanco: ambos REVIENTAN sobre el fondo oscuro
            // (el accent violeta se perdía sobre el gradiente violeta)
            const bg = i % 2 === 0 ? th.accent2 : '#F5F5F7';
            return (
              <div key={i} style={{transform: `translateX(${off}px)`, opacity: Math.min(1, p * 1.4), marginTop: i ? -6 : 0}}>
                <span style={{
                  display: 'inline-block', background: bg, color: '#0B0B12',
                  fontFamily: ANTON, fontSize: 96, lineHeight: 1.06, letterSpacing: 1,
                  textTransform: 'uppercase', padding: '6px 30px',
                  boxShadow: `0 0 46px ${bg}55, 0 10px 0 rgba(0,0,0,0.3)`,
                }}>
                  {line}
                </span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
