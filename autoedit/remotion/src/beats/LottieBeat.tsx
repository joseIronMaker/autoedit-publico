import React, {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Lottie, type LottieAnimationData} from '@remotion/lottie';
import type {Theme} from '../theme';
import {Background} from '../Background';
import {Title} from '../scenes';

// Beat "lottie": reproduce una animación profesional (.json de After Effects /
// LottieFiles) dentro de la franja de contenido, con el fondo y la paleta del canal.
// El .json se sirve desde public/dyn (lo copia remotion_scenes.stage_asset).
export const LottieBeat: React.FC<{
  src: string;
  title?: string;
  caption?: string;
  loop?: boolean;
  th: Theme;
}> = ({src, title, caption, loop = true, th}) => {
  const {width, height} = useVideoConfig();
  const frame = useCurrentFrame();
  const [data, setData] = useState<LottieAnimationData | null>(null);
  const [handle] = useState(() => delayRender('cargando lottie'));

  useEffect(() => {
    fetch(staticFile(src))
      .then((r) => r.json())
      .then((json) => {
        setData(json);
        continueRender(handle);
      })
      .catch((e) => {
        // sin animación no se tumba la escena: queda el fondo + título
        console.error('lottie', e);
        continueRender(handle);
      });
  }, [handle, src]);

  // franja de contenido: nada por debajo del 70% (ahí van los subtítulos)
  const top = height * (title ? 0.20 : 0.12);
  const bottom = height * (caption ? 0.62 : 0.68);
  const alto = bottom - top;
  const entrada = Math.min(1, frame / 8);

  return (
    <Background th={th}>
      {title ? <Title title={title} th={th} /> : null}
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'flex-start'}}>
        <div
          style={{
            position: 'absolute',
            top,
            left: width * 0.05,
            width: width * 0.9,
            height: alto,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: entrada,
            transform: `scale(${0.96 + 0.04 * entrada})`,
          }}
        >
          {data ? (
            <Lottie
              animationData={data}
              loop={loop}
              style={{width: '100%', height: '100%'}}
            />
          ) : null}
        </div>
        {caption ? (
          <div
            style={{
              position: 'absolute',
              top: height * 0.645,
              left: width * 0.07,
              width: width * 0.86,
              textAlign: 'center',
              fontFamily: 'Inter, system-ui, sans-serif',
              fontWeight: 800,
              fontSize: height * 0.028,
              letterSpacing: 1.2,
              color: th.accent,
              opacity: Math.min(1, Math.max(0, (frame - 10) / 10)),
            }}
          >
            {caption}
          </div>
        ) : null}
      </AbsoluteFill>
    </Background>
  );
};
