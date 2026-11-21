import {
  AbsoluteFill,
  interpolate,
  OffthreadVideo,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {ANTON} from '../fonts';
import type {Theme} from '../theme';
import type {KineticWord} from './KineticSlide';

// el movimiento va con PERIODO PROPIO: un interpolate sobre durationInFrames se diluye en
// una escena larga (un zoom de 6% en 27 s se lee como foto fija)
const vaiven = (t: number, p: number) => 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / p);

export const KineticOverVideo: React.FC<{
  words: KineticWord[];
  // estrofas: el rótulo cambia a lo largo de la escena. Sin ellas se comporta como antes
  // (una sola frase quieta), que es lo que esperan los videos ya aprobados.
  stanzas?: KineticWord[][];
  // fuerza del velo oscuro sobre el clip (1 = el de siempre). Se baja cuando el METRAJE
  // es el contenido y no un mero fondo: con 1 el video queda a luma ~20 y no se ve.
  veil?: number;
  video: string;
  variant?: 'dark' | 'accent';
  th: Theme;
}> = ({words, stanzas, veil = 1, video, variant = 'dark', th}) => {
  const frame = useCurrentFrame();
  const {durationInFrames, fps} = useVideoConfig();
  const t = frame / fps;
  const videoScale = 1.05 + 0.05 * vaiven(t, 11);
  const grupos: KineticWord[][] =
    stanzas && stanzas.length ? stanzas : [words];
  const porGrupo = durationInFrames / grupos.length;
  const iGrupo = Math.min(grupos.length - 1, Math.floor(frame / porGrupo));
  const frameGrupo = frame - iGrupo * porGrupo;
  const visibles = grupos[iGrupo];
  // salida de la estrofa anterior: se desvanece en los ultimos 8 cuadros de su turno
  const cierre = Math.max(2, Math.min(10, porGrupo * 0.15));
  const salida =
    grupos.length > 1
      ? interpolate(frameGrupo, [porGrupo - cierre, porGrupo - cierre / 5], [1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      : 1;

  return (
    <AbsoluteFill style={{overflow: 'hidden', backgroundColor: '#06060C'}}>
      <OffthreadVideo
        src={staticFile(video)}
        loop
        muted
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${videoScale})`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(6,6,12,${0.72 * veil}) 0%, rgba(6,6,12,${
            0.35 * veil
          }) 45%, rgba(6,6,12,${0.78 * veil}) 100%)`,
        }}
      />
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          padding: 90,
        }}
      >
        <AbsoluteFill
          style={{
            background: `radial-gradient(closest-side, rgba(6,6,12,${
              0.8 * veil
            }), rgba(6,6,12,0) 70%)`,
          }}
        />
        <div
          style={{
            position: 'relative',
            width: '100%',
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'baseline',
            justifyContent: 'center',
            columnGap: 34,
            rowGap: 8,
            textAlign: 'center',
            lineHeight: 1.05,
          }}
        >
          {visibles.map((word, index) => {
            const entrance = spring({
              frame: frameGrupo - index * 5,
              fps,
              config: {damping: 12, stiffness: 120, mass: 0.8},
            });
            const translateY = interpolate(entrance, [0, 1], [40, 0]);
            const scale = interpolate(entrance, [0, 1], [0.92, 1]);
            const baseSize = word.serif ? 170 : 185;
            const fitSize =
              baseSize * Math.min(1, 9.5 / Math.max(4, word.text.length));

            return (
              <span
                key={`${word.text}-${index}`}
                style={{
                  display: 'inline-block',
                  color: word.accent
                    ? variant === 'accent'
                      ? th.accent
                      : th.accent2
                    : '#FFFFFF',
                  fontFamily: word.serif
                    ? 'Georgia, "Times New Roman", serif'
                    : ANTON,
                  fontSize: fitSize,
                  fontStyle: word.serif ? 'italic' : 'normal',
                  fontWeight: word.serif ? 500 : 400,
                  lineHeight: 1.05,
                  textTransform: word.serif ? 'none' : 'uppercase',
                  opacity: entrance * salida,
                  transform: `translateY(${translateY}px) scale(${scale})`,
                  whiteSpace: 'nowrap',
                  textShadow: '0 3px 8px rgba(0,0,0,0.55)',
                }}
              >
                {word.text}
              </span>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
