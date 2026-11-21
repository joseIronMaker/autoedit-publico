import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Theme} from '../theme';
import {ANTON, INTER} from '../fonts';

export const CtaCard: React.FC<{
  title: string;
  button: string;
  sub?: string;
  handle?: string;
  th: Theme;
}> = ({title, button, sub, handle, th}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const titleEntrance = spring({frame, fps, config: {damping: 14, stiffness: 105, mass: 0.85}});
  const buttonEntrance = spring({
    frame: frame - 6,
    fps,
    config: {damping: 9, stiffness: 115, mass: 0.75},
  });
  const subEntrance = spring({frame: frame - 14, fps, config: {damping: 15, stiffness: 110}});
  const pulse = 1 + Math.sin((Math.max(0, frame - 18) / 40) * Math.PI * 2) * 0.015 + 0.015;
  const buttonScale = interpolate(buttonEntrance, [0, 1], [0.8, 1]) * (frame >= 18 ? pulse : 1);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0B0B12',
        backgroundImage: `radial-gradient(circle at 18% 25%, ${th.accent}1F 0%, transparent 38%), radial-gradient(circle at 82% 76%, ${th.accent2}1F 0%, transparent 40%)`,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 90,
        overflow: 'hidden',
      }}
    >
      <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', textAlign: 'center'}}>
        {handle ? (
          <div
            style={{
              marginBottom: 34,
              padding: '12px 26px',
              border: '1px solid #33334A',
              borderRadius: 999,
              color: th.accent2,
              fontFamily: 'JetBrains Mono, Consolas, monospace',
              fontSize: 25,
              opacity: titleEntrance,
            }}
          >
            {handle}
          </div>
        ) : null}

        <div
          style={{
            maxWidth: 900,
            color: '#FFFFFF',
            fontFamily: ANTON,
            fontSize: 92,
            lineHeight: 1.05,
            textTransform: 'uppercase',
            opacity: titleEntrance,
            transform: `translateY(${interpolate(titleEntrance, [0, 1], [46, 0])}px)`,
          }}
        >
          {title}
        </div>

        <div
          style={{
            marginTop: 58,
            padding: '30px 70px',
            borderRadius: 999,
            backgroundColor: '#FFFFFF',
            color: '#0B0B12',
            fontFamily: INTER,
            fontSize: 46,
            fontWeight: 800,
            lineHeight: 1,
            boxShadow: '0 18px 60px rgba(255,255,255,0.18)',
            opacity: buttonEntrance,
            transform: `scale(${buttonScale})`,
          }}
        >
          {button}
        </div>

        {sub ? (
          <div
            style={{
              marginTop: 42,
              color: '#9696B0',
              fontFamily: 'JetBrains Mono, Consolas, monospace',
              fontSize: 34,
              lineHeight: 1.35,
              textTransform: 'lowercase',
              opacity: subEntrance,
              transform: `translateY(${interpolate(subEntrance, [0, 1], [18, 0])}px)`,
            }}
          >
            {sub}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
