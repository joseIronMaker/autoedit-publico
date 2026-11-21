import React from 'react';
import {AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Theme} from '../theme';
import {ANTON, INTER} from '../fonts';

// Mascota del canal (robot pixel-art) como pattern interrupt: pose PNG con pop de
// entrada + bob idle, caption en pill y, si la pose es "cartel", texto sobre el cartel.
export type MascotaSpec = {
  type: 'mascota';
  image: string;          // 'dyn/<pose>.png'
  caption?: string;       // pill inferior (lowercase corto)
  sign_text?: string;     // texto del cartel (solo pose 'cartel')
};

export const Mascota: React.FC<{spec: MascotaSpec; th: Theme}> = ({spec, th}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const pop = spring({frame, fps, config: {damping: 11, mass: 0.7, stiffness: 150}, durationInFrames: 18});
  const bob = Math.sin(frame / 12) * 9;
  const cap = spring({frame: frame - 9, fps, config: {damping: 13}, durationInFrames: 16});

  return (
    <AbsoluteFill style={{backgroundColor: '#0B0B12'}}>
      {/* glow central sutil de marca (fondo plano = sin banding) */}
      <AbsoluteFill style={{
        background: `radial-gradient(58% 40% at 50% 44%, ${th.accent2}1E 0%, rgba(0,0,0,0) 70%)`,
      }} />
      <AbsoluteFill style={{
        background: `radial-gradient(70% 45% at 50% 90%, ${th.accent}14 0%, rgba(0,0,0,0) 70%)`,
      }} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <div style={{position: 'relative', transform: `scale(${0.72 + 0.28 * pop}) translateY(${bob}px)`}}>
          <Img
            src={staticFile(spec.image)}
            style={{
              height: 860, objectFit: 'contain', imageRendering: 'pixelated',
              filter: `drop-shadow(0 0 44px ${th.accent2}44) drop-shadow(0 20px 26px rgba(0,0,0,0.55))`,
            }}
          />
          {spec.sign_text ? (
            // el cartel de la pose 'cartel' queda arriba del personaje; el texto va centrado ahí
            <div style={{
              position: 'absolute', top: '9%', left: '50%', transform: 'translateX(-50%) rotate(-1deg)',
              width: '56%', textAlign: 'center',
            }}>
              <span style={{
                fontFamily: ANTON, fontSize: 54, lineHeight: 1.05, color: '#16161E',
                textTransform: 'uppercase',
              }}>
                {spec.sign_text}
              </span>
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
      {spec.caption ? (
        <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 460}}>
          <div style={{
            transform: `translateY(${(1 - cap) * 60}px)`, opacity: cap,
            background: 'rgba(6,6,12,0.82)', border: '1px solid #33334A', borderRadius: 999,
            padding: '18px 44px',
          }}>
            <span style={{fontFamily: INTER, fontWeight: 800, fontSize: 46, color: '#FFFFFF'}}>
              {spec.caption}
            </span>
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
