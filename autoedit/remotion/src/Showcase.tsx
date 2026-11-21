import React from 'react';
import {
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {Background} from './Background';
import {ANTON} from './fonts';
import {Theme} from './theme';

type ShowcaseItem = {label: string; image: string};

const clamp = {
  extrapolateLeft: 'clamp' as const,
  extrapolateRight: 'clamp' as const,
};

const keywordIndex = (parts: string[]) =>
  parts.reduce(
    (best, part, index) => {
      const length = part.replace(/[^\p{L}\p{N}]/gu, '').length;
      return length >= best.length ? {index, length} : best;
    },
    {index: -1, length: -1},
  ).index;

const ShowcaseCard: React.FC<{
  item: ShowcaseItem;
  index: number;
  segmentStart: number;
  segmentDuration: number;
  isLast: boolean;
  th: Theme;
}> = ({item, index, segmentStart, segmentDuration, isLast, th}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const localFrame = frame - segmentStart;
  const accent = index % 2 === 0 ? th.accent : th.accent2;
  const overlap = Math.min(8, segmentDuration * 0.18);
  const entrance = spring({
    frame: localFrame,
    fps,
    config: {damping: 16, stiffness: 95, mass: 0.9},
  });
  const fadeIn = interpolate(localFrame, [0, overlap], [0, 1], clamp);
  const fadeOut = isLast
    ? 1
    : interpolate(localFrame, [segmentDuration - overlap, segmentDuration], [1, 0], clamp);
  const opacity = Math.min(entrance, fadeIn) * fadeOut;
  const exitScale = interpolate(
    localFrame,
    [segmentDuration - overlap, segmentDuration],
    [1, 0.975],
    clamp,
  );
  const enterScale = interpolate(entrance, [0, 1], [0.9, 1]);
  const enterX = interpolate(entrance, [0, 1], [index % 2 === 0 ? 72 : -72, 0]);

  const progress = interpolate(localFrame, [0, segmentDuration], [0, 1], clamp);
  const imageScale = interpolate(progress, [0, 1], [1.05, 1.14]);
  const panX = interpolate(progress, [0, 1], [index % 2 === 0 ? -1.8 : 1.8, index % 2 === 0 ? 1.8 : -1.8]);
  const panY = interpolate(progress, [0, 1], [-1.1, 1.1]);

  const labelEntrance = spring({
    frame: localFrame - 6,
    fps,
    config: {damping: 17, stiffness: 105, mass: 0.8},
  });
  const labelY = interpolate(labelEntrance, [0, 1], [44, 0]);
  const labelOpacity = Math.min(labelEntrance, fadeOut);
  const words = item.label.toUpperCase().split(/(\s+)/);
  const keyIndex = keywordIndex(words);

  const panelWidth = width * 0.86;
  // el 28% inferior es de los subtítulos: con panel 0.58 + top 0.13 la etiqueta caía en
  // 0.735 y se encimaba con el subtítulo (visto en ln03, 27-jul). Panel y etiqueta suben.
  const panelHeight = height * 0.52;
  const panelLeft = (width - panelWidth) / 2;
  const panelTop = height * 0.105;
  const glareProgress = interpolate(
    localFrame,
    [segmentDuration * 0.18, segmentDuration * 0.7],
    [0, 1],
    clamp,
  );
  const glareOpacity = interpolate(
    glareProgress,
    [0, 0.08, 0.88, 1],
    [0, 0.48, 0.48, 0],
    clamp,
  );

  return (
    <div style={{position: 'absolute', inset: 0, opacity, pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left: panelLeft,
          top: panelTop,
          width: panelWidth,
          height: panelHeight,
          transform: `translateX(${enterX}px) scale(${enterScale * exitScale})`,
          transformOrigin: '50% 50%',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: -54,
            borderRadius: 82,
            opacity: 0.82,
            background: `radial-gradient(ellipse at center, ${accent}50 0%, ${accent}24 36%, ${accent}00 72%)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            borderRadius: 40,
            border: `2px solid ${accent}bb`,
            backgroundColor: th.card,
            boxShadow: `0 26px 70px rgba(0,0,0,0.58), 0 0 30px ${accent}66, inset 0 0 62px rgba(0,0,0,0.68)`,
          }}
        >
          <Img
            src={staticFile(item.image)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `translate(${panX}%, ${panY}%) scale(${imageScale})`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              boxShadow: 'inset 0 0 76px 18px rgba(2,3,10,0.62)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '-18%',
              left: '-32%',
              width: '18%',
              height: '140%',
              opacity: glareOpacity,
              transform: `translateX(${glareProgress * panelWidth * 1.65}px) skewX(-16deg)`,
              background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.72), ${accent}70, transparent)`,
            }}
          />
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: panelTop + panelHeight + height * 0.025,
          left: width * 0.06,
          width: width * 0.88,
          textAlign: 'center',
          fontFamily: ANTON,
          fontSize: height * 0.045,
          lineHeight: 1.02,
          letterSpacing: 1.5,
          color: th.text,
          opacity: labelOpacity,
          transform: `translateY(${labelY}px)`,
        }}
      >
        {words.map((word, wordIndex) => (
          <span
            key={`${word}-${wordIndex}`}
            style={wordIndex === keyIndex ? {color: accent, textShadow: `0 0 18px ${accent}88`} : undefined}
          >
            {word}
          </span>
        ))}
      </div>
    </div>
  );
};

export const Showcase: React.FC<{items: ShowcaseItem[]; th: Theme}> = ({items, th}) => {
  const frame = useCurrentFrame();
  const {durationInFrames, width, height} = useVideoConfig();
  const list = items.filter((item) => item?.label && item?.image).slice(0, 4);

  if (list.length === 0) {
    return <Background th={th}>{null}</Background>;
  }

  const segmentDuration = durationInFrames / list.length;
  const activeIndex = Math.min(list.length - 1, Math.floor(frame / segmentDuration));

  return (
    <Background th={th}>
      <div
        style={{
          position: 'absolute',
          top: height * 0.057,
          left: width * 0.14,
          width: width * 0.72,
          height: 10,
          display: 'flex',
          gap: 13,
          zIndex: 10,
        }}
      >
        {list.map((_, index) => {
          const active = index === activeIndex;
          const accent = activeIndex % 2 === 0 ? th.accent : th.accent2;
          return (
            <div
              key={index}
              style={{
                flex: 1,
                height: active ? 10 : 6,
                marginTop: active ? 0 : 2,
                borderRadius: 999,
                background: active ? accent : `${th.muted}44`,
                boxShadow: active ? `0 0 18px ${accent}` : undefined,
              }}
            />
          );
        })}
      </div>

      {list.map((item, index) => (
        <ShowcaseCard
          key={`${item.image}-${index}`}
          item={item}
          index={index}
          segmentStart={index * segmentDuration}
          segmentDuration={segmentDuration}
          isLast={index === list.length - 1}
          th={th}
        />
      ))}
    </Background>
  );
};
