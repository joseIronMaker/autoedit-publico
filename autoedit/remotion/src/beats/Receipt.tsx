import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Theme} from '../theme';
import {Background} from '../Background';
import {ANTON} from '../fonts';

// "Recibo" real: screenshot dentro de un mock de navegador (como los shorts de evidencia).
// La imagen hace un zoom lento y, si hay highlight, una caja de acento resalta la franja
// clave mientras el resto se atenúa. Nada de backdrop-filter (parpadea en headless).
export type ReceiptSpec = {
  type: 'receipt';
  image: string;              // ruta staticFile ('dyn/….png')
  title?: string;             // chip arriba del panel (MAYÚS corto)
  url_label?: string;         // texto de la barra de dirección
  highlight?: {y: number; h: number}; // franja a resaltar, fracciones 0-1 de la imagen
  caption?: string;           // pie mono pequeño (fuente/procedencia)
};

export const Receipt: React.FC<{spec: ReceiptSpec; th: Theme}> = ({spec, th}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();

  const enter = spring({frame, fps, config: {damping: 14, mass: 0.8, stiffness: 120}, durationInFrames: 18});
  const y = (1 - enter) * 90;
  // zoom lento continuo sobre la imagen (vida, sin marear)
  const zoom = interpolate(frame, [0, durationInFrames], [1.0, 1.06]);
  const hl = spring({frame: frame - 22, fps, config: {damping: 13}, durationInFrames: 20});

  return (
    <AbsoluteFill>
      <Background th={th}>
        {/* paddingBottom: deja libre el ~16% inferior para los subtítulos karaoke */}
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', paddingBottom: 280}}>
          <div style={{transform: `translateY(${y}px)`, width: 980}}>
            {spec.title ? (
              <div style={{
                display: 'inline-block', fontFamily: ANTON, fontSize: 52, color: '#0B0B12',
                background: th.accent2, padding: '10px 30px', borderRadius: 14,
                textTransform: 'uppercase', letterSpacing: 1, marginBottom: 26,
                transform: 'rotate(-1.2deg)',
                boxShadow: `0 0 44px ${th.accent2}55`,
              }}>
                {spec.title}
              </div>
            ) : null}
            <div style={{
              borderRadius: 26, overflow: 'hidden', background: '#11111A',
              border: '1px solid #26263A', boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
            }}>
              {/* barra de navegador */}
              <div style={{
                height: 64, display: 'flex', alignItems: 'center', gap: 10,
                padding: '0 24px', background: '#171722', borderBottom: '1px solid #26263A',
              }}>
                {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => (
                  <div key={c} style={{width: 16, height: 16, borderRadius: 8, background: c}} />
                ))}
                {spec.url_label ? (
                  <div style={{
                    flex: 1, marginLeft: 14, height: 36, borderRadius: 18, background: '#0E0E16',
                    color: '#8A8AA5', fontFamily: 'JetBrains Mono, Consolas, monospace',
                    fontSize: 24, display: 'flex', alignItems: 'center', paddingLeft: 18,
                  }}>
                    {spec.url_label}
                  </div>
                ) : null}
              </div>
              {/* screenshot con zoom + highlight */}
              <div style={{position: 'relative', overflow: 'hidden', maxHeight: 1280}}>
                <Img
                  src={staticFile(spec.image)}
                  style={{width: '100%', display: 'block', transform: `scale(${zoom})`, transformOrigin: '50% 30%'}}
                />
                {spec.highlight ? (
                  <>
                    {/* atenúa arriba y abajo de la franja */}
                    <div style={{position: 'absolute', left: 0, right: 0, top: 0,
                      height: `${spec.highlight.y * 100}%`, background: `rgba(5,5,10,${0.5 * hl})`}} />
                    <div style={{position: 'absolute', left: 0, right: 0,
                      top: `${(spec.highlight.y + spec.highlight.h) * 100}%`, bottom: 0,
                      background: `rgba(5,5,10,${0.5 * hl})`}} />
                    <div style={{
                      position: 'absolute', left: 8, right: 8,
                      top: `${spec.highlight.y * 100}%`, height: `${spec.highlight.h * 100}%`,
                      border: `5px solid ${th.accent2}`, borderRadius: 12,
                      boxShadow: `0 0 34px ${th.accent2}88, inset 0 0 24px ${th.accent2}22`,
                      opacity: hl,
                    }} />
                  </>
                ) : null}
              </div>
            </div>
            {spec.caption ? (
              <div style={{
                marginTop: 20, fontFamily: 'JetBrains Mono, Consolas, monospace',
                fontSize: 26, color: th.muted, textAlign: 'center', letterSpacing: 2,
                textTransform: 'uppercase',
              }}>
                {spec.caption}
              </div>
            ) : null}
          </div>
        </AbsoluteFill>
      </Background>
    </AbsoluteFill>
  );
};
