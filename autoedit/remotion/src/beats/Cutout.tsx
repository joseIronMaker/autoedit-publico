import React from 'react';
import {AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Theme} from '../theme';
import {Background} from '../Background';
import {ANTON} from '../fonts';

// Escena cutout estilo vox ADAPTADA a la marca neón: ilustración cartoon recortada
// (PNG alpha, generada por codex + rembg) que entra deslizándose con rebote sobre el
// fondo oscuro de marca, con rim-glow de acento; keyword en card rotada.
export type CutoutSpec = {
  type: 'cutout';
  image: string;                                   // 'dyn/….png' (recorte transparente)
  keyword?: string;                                // texto de la card (MAYÚS corto)
  from?: 'left' | 'right' | 'bottom' | 'diag';     // dirección de entrada
};

const UNIT: Record<string, [number, number]> = {
  left: [-1, 0], right: [1, 0], bottom: [0, 1], diag: [-1, 1],
};

export const Cutout: React.FC<{spec: CutoutSpec; th: Theme}> = ({spec, th}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const [ux, uy] = UNIT[spec.from ?? 'bottom'] ?? [0, 1];

  const p = spring({frame, fps, config: {damping: 13, mass: 0.8, stiffness: 130}, durationInFrames: 18});
  const x = ux * 430 * (1 - p);
  const y = uy * 430 * (1 - p);
  // flotación sutil para que el recorte no quede muerto tras aterrizar
  const bob = Math.sin(frame / 14) * 7;

  const textFrom: [number, number] = uy !== 0 ? [1, 0] : [0, 1];
  const q = spring({frame: frame - 7, fps, config: {damping: 12, mass: 0.8, stiffness: 140}, durationInFrames: 18});
  const kx = textFrom[0] * 460 * (1 - q);
  const ky = textFrom[1] * 460 * (1 - q);

  return (
    <AbsoluteFill>
      <Background th={th}>
        <AbsoluteFill style={{justifyContent: 'flex-start', alignItems: 'center'}}>
          <div style={{position: 'relative', transform: `translate(${x}px, ${y + bob}px)`, marginTop: 235}}>
            {/* rim-glow SIN filtros (drop-shadow + blur del fondo tumbaban el raster
                de Chrome sin GPU): un radial detrás del recorte da el mismo halo */}
            <div style={{
              position: 'absolute', left: '50%', top: '52%', width: 1040, height: 1140,
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(48% 46% at 50% 50%, ${th.accent2}30 0%, ${th.accent2}12 45%, rgba(0,0,0,0) 72%)`,
            }} />
            <Img
              src={staticFile(spec.image)}
              style={{width: 900, height: 1000, objectFit: 'contain', position: 'relative'}}
            />
          </div>
        </AbsoluteFill>
        {/* la card va ARRIBA de la zona de subtítulos karaoke (margin_v 16%) */}
        {spec.keyword ? (
          <AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 520}}>
            <div style={{transform: `translate(${kx}px, ${ky}px) rotate(-1.4deg)`}}>
              <div style={{
                background: th.accent2, borderRadius: 22, padding: '22px 44px', maxWidth: 940,
                boxShadow: `0 0 60px ${th.accent2}55, 0 14px 0 rgba(0,0,0,0.35)`,
              }}>
                <span style={{
                  fontFamily: ANTON, fontSize: 86, lineHeight: 1.04, letterSpacing: 1,
                  color: '#0B0B12', textTransform: 'uppercase', textAlign: 'center', display: 'block',
                }}>
                  {spec.keyword}
                </span>
              </div>
            </div>
          </AbsoluteFill>
        ) : null}
      </Background>
    </AbsoluteFill>
  );
};
