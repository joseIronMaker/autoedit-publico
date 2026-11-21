import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Theme} from '../theme';
import {ANTON} from '../fonts';

export type KineticWord = {
  text: string;
  serif?: boolean;
  accent?: boolean;
};

export const KineticSlide: React.FC<{
  words: KineticWord[];
  variant?: 'accent' | 'dark' | 'light';
  th: Theme;
}> = ({words, variant = 'dark', th}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const backgroundColor =
    variant === 'accent' ? th.accent : variant === 'light' ? '#F2F2F6' : '#0B0B12';
  const baseColor = variant === 'light' ? '#101018' : '#FFFFFF';

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        alignItems: 'center',
        justifyContent: 'center',
        padding: '90px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          justifyContent: 'center',
          columnGap: 34,
          rowGap: 8,
          textAlign: 'center',
        }}
      >
        {words.map((word, index) => {
          const entrance = spring({
            frame: frame - index * 5,
            fps,
            config: {damping: 12, stiffness: 120, mass: 0.8},
          });
          const translateY = interpolate(entrance, [0, 1], [40, 0]);
          const scale = interpolate(entrance, [0, 1], [0.92, 1]);
          const accentColor = variant === 'accent' ? '#0B0B12' : variant === 'light' ? th.accent : th.accent2;
          // tamaño adaptativo: las frases largas se ENCOGEN en vez de cortarse en el
          // borde (nowrap + 185px desbordaba con >~10 caracteres)
          const baseSize = word.serif ? 170 : 185;
          const fitSize = baseSize * Math.min(1, 9.5 / Math.max(4, word.text.length));

          return (
            <span
              key={`${word.text}-${index}`}
              style={{
                display: 'inline-block',
                color: word.accent ? accentColor : baseColor,
                fontFamily: word.serif ? 'Georgia, "Times New Roman", serif' : ANTON,
                fontSize: fitSize,
                fontStyle: word.serif ? 'italic' : 'normal',
                fontWeight: word.serif ? 500 : 400,
                lineHeight: 1.05,
                textTransform: word.serif ? 'none' : 'uppercase',
                opacity: entrance,
                transform: `translateY(${translateY}px) scale(${scale})`,
                whiteSpace: 'nowrap',
              }}
            >
              {word.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
