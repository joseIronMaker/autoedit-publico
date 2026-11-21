import React from 'react';
import {AbsoluteFill, random, useCurrentFrame, useVideoConfig} from 'remotion';
import {Theme} from './theme';

const TAU = Math.PI * 2;

// Fondo de marca vivo. Toda la luz se construye con gradientes: no hay blur CSS.
export const Background: React.FC<{th: Theme; children: React.ReactNode}> = ({th, children}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const t = frame / fps;
  const auroras = [
    {x: 0.1, y: 0.04, size: 1.02, color: th.accent, phase: 0.2, speed: 0.22},
    {x: 0.57, y: -0.08, size: 1.12, color: th.accent2, phase: 1.8, speed: 0.17},
    {x: -0.28, y: 0.43, size: 1.18, color: th.accent2, phase: 3.4, speed: 0.13},
    {x: 0.5, y: 0.48, size: 1.08, color: th.accent, phase: 4.7, speed: 0.19},
  ];

  return (
    <AbsoluteFill style={{backgroundColor: '#05060d', overflow: 'hidden'}}>
      <AbsoluteFill style={{background: `linear-gradient(164deg, ${th.bgTop} 0%, #080817 48%, ${th.bgBottom} 100%)`}} />

      {auroras.map((g, i) => {
        const driftX = Math.sin(t * g.speed + g.phase) * width * (0.12 + i * 0.012);
        const driftY = Math.cos(t * (g.speed * 0.83) + g.phase * 1.3) * height * 0.075;
        const pulse = 0.72 + Math.sin(t * (0.55 + i * 0.09) + g.phase) * 0.18;
        const size = width * g.size;
        return <div key={i} style={{position: 'absolute', left: width * g.x + driftX, top: height * g.y + driftY, width: size, height: size * 1.25, borderRadius: '50%', opacity: pulse, background: `radial-gradient(ellipse at center, ${g.color}38 0%, ${g.color}22 25%, ${g.color}0e 46%, ${g.color}00 72%)`}} />;
      })}

      {/* Haces diagonales de baja intensidad que barren el cuadro. */}
      {[0, 1].map((i) => {
        const sweep = ((t * (42 + i * 11) + i * 560) % (width * 2.2)) - width * 0.75;
        return <div key={`beam-${i}`} style={{position: 'absolute', left: sweep, top: -height * 0.25, width: width * 0.58, height: height * 1.45, opacity: 0.075, transform: `rotate(${i ? 19 : 14}deg)`, transformOrigin: '50% 50%', background: `linear-gradient(90deg, transparent 0%, ${i ? th.accent2 : th.accent}14 30%, rgba(255,255,255,0.32) 50%, ${i ? th.accent2 : th.accent}10 68%, transparent 100%)`}} />;
      })}

      {/* Rejilla técnica en perspectiva, desplazada continuamente. */}
      <div style={{position: 'absolute', left: -width * 0.35, top: height * 0.31, width: width * 1.7, height: height * 0.88, opacity: 0.052, transform: 'perspective(900px) rotateX(61deg)', transformOrigin: '50% 100%', backgroundImage: `linear-gradient(${th.accent}66 1px, transparent 1px), linear-gradient(90deg, ${th.accent}55 1px, transparent 1px)`, backgroundSize: '78px 78px', backgroundPosition: `${(t * 8) % 78}px ${(t * 15) % 78}px`}} />

      {/* Campo de partículas en tres planos; algunas llevan una estela integrada. */}
      {Array.from({length: 42}, (_, i) => {
        const layer = i % 3;
        const speed = [9, 18, 31][layer];
        const baseX = random(`particle-x-${i}`) * (width + 240);
        const baseY = height * 0.055 + random(`particle-y-${i}`) * height * 0.76;
        const x = ((baseX + t * speed + Math.sin(t * 0.37 + i) * (5 + layer * 5)) % (width + 240)) - 120;
        const y = baseY + Math.sin(t * (0.25 + layer * 0.08) + i * 1.71) * (8 + layer * 8);
        const dot = 2.2 + layer * 1.5 + random(`particle-r-${i}`) * 2;
        const twinkle = 0.18 + layer * 0.08 + (Math.sin(t * (1.1 + layer * 0.3) + random(`particle-p-${i}`) * TAU) + 1) * 0.11;
        const col = i % 2 ? th.accent2 : th.accent;
        const trail = i % 4 === 0;
        const trailW = trail ? 28 + layer * 20 : dot;
        return <div key={`p-${i}`} style={{position: 'absolute', left: x - trailW, top: y, width: trailW + dot, height: dot, borderRadius: dot, opacity: twinkle, background: trail ? `linear-gradient(90deg, ${col}00 0%, ${col}55 72%, ${col} 100%)` : col, boxShadow: layer === 2 ? `0 0 12px ${col}88` : undefined}} />;
      })}

      {/* Oscurece el centro lo justo para que tipografía y diagramas siempre manden. */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 43%, rgba(4,5,13,0.04) 0%, rgba(4,5,13,0.18) 48%, rgba(4,5,13,0.42) 100%)'}} />
      {children}
      <AbsoluteFill style={{boxShadow: 'inset 0 0 340px 90px rgba(0,0,0,0.58)', pointerEvents: 'none'}} />
      <svg width={width} height={height} style={{position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity: 0.14, pointerEvents: 'none'}}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="2" stitchTiles="stitch" seed="7" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};
