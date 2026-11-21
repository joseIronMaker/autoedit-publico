import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import type {Theme} from '../theme';

type TerminalLine = {
  prompt?: boolean;
  text: string;
  accent?: boolean;
};

export const TerminalSlide: React.FC<{
  title?: string;
  caption?: string;
  lines: (TerminalLine | string)[];
  progress?: {label: string};
  watermark?: string;
  th: Theme;
}> = ({title, caption, lines: rawLines, progress, watermark, th}) => {
  // El guion escribe las líneas como TEXTO PLANO; el componente las quería como
  // objetos {text}. `line.text.length` reventaba y el beat caía a big_text — o sea,
  // la tarjeta de texto que no queremos (ln15/ln16/ln19, 29-jul). Se aceptan ambas.
  const lines: TerminalLine[] = (rawLines ?? [])
    .map((l) => (typeof l === 'string' ? {text: l} : l))
    .filter((l): l is TerminalLine => Boolean(l) && typeof l.text === 'string');
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  // El tecleo se ESTIRA a lo que dura la escena. Con velocidad fija (2.2 ch/frame) una
  // terminal de 20 s terminaba de escribir en 2 s y se quedaba congelada 18: freezedetect
  // marcó 10.6 s de frame idéntico en el ag01 (17-ago). La regla de los 3 segundos dice
  // que nada se queda quieto más de 3-4 s, y esto se lo saltaba en cada beat `terminal`.
  const totalChars = lines.reduce((sum, line) => sum + line.text.length, 0) || 1;
  const charsPerFrame = Math.min(2.2, Math.max(0.35, totalChars / (durationInFrames * 0.78)));
  const lineDurations = lines.map((line) => Math.max(1, Math.ceil(line.text.length / charsPerFrame)));
  const lineStarts = lineDurations.map((_, index) =>
    lineDurations.slice(0, index).reduce((sum, duration) => sum + duration, 0),
  );
  const typingEnd = lineDurations.reduce((sum, duration) => sum + duration, 0);
  const activeLine = lines.findIndex((line, index) => {
    const visibleCharacters = Math.floor((frame - lineStarts[index]) * charsPerFrame);
    return frame >= lineStarts[index] && visibleCharacters < line.text.length;
  });
  const cursorVisible = Math.floor(frame / 15) % 2 === 0;
  // cuando ya no se teclea, el cursor vive al final de la última línea
  const cursorLine = activeLine >= 0 ? activeLine : lines.length - 1;
  const progressValue = interpolate(frame, [typingEnd, durationInFrames - fps * 0.4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        background: 'radial-gradient(circle at center, #101019 0%, #0A0A0F 66%, #050508 100%)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 80,
        overflow: 'hidden',
      }}
    >
      {watermark ? (
        <div
          style={{
            position: 'absolute',
            top: 54,
            right: 60,
            color: '#55556A',
            fontFamily: 'JetBrains Mono, Consolas, monospace',
            fontSize: 22,
            letterSpacing: 3,
            textTransform: 'uppercase',
          }}
        >
          {watermark}
        </div>
      ) : null}

      <div
        style={{
          // la tarjeta CRECE cuando hay pocas líneas: con 3 o 4 quedaba un rectángulo
          // pequeño en medio de un cuadro vacío y el QC visual lo marcaba como escena en
          // blanco (medido en el curso de Python, 30-ago-2026). El tipo también sube:
          // en un teléfono, 40 px sobre 1920 de alto es texto de nota al pie.
          width: lines.length <= 4 ? 1010 : 920,
          borderRadius: 26,
          overflow: 'hidden',
          backgroundColor: '#11111A',
          border: '1px solid #26263A',
          boxShadow: '0 30px 90px rgba(0,0,0,0.38)',
        }}
      >
        <div
          style={{
            height: 86,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            padding: '0 30px',
            borderBottom: '1px solid #26263A',
          }}
        >
          <div style={{display: 'flex', gap: 14}}>
            {['#FF5F57', '#FEBC2E', '#28C840'].map((color) => (
              <div key={color} style={{width: 18, height: 18, borderRadius: '50%', backgroundColor: color}} />
            ))}
          </div>
          <div
            style={{
              position: 'absolute',
              left: 130,
              right: 130,
              textAlign: 'center',
              color: '#77778D',
              fontFamily: 'JetBrains Mono, Consolas, monospace',
              fontSize: 24,
            }}
          >
            {title ?? caption ?? 'terminal'}
          </div>
        </div>

        <div style={{padding: lines.length <= 4 ? '76px 56px 84px' : '52px 56px 58px'}}>
          <div style={{
            fontFamily: 'JetBrains Mono, Consolas, monospace',
            fontSize: lines.length <= 4 ? 52 : 40,
            lineHeight: lines.length <= 4 ? 2.15 : 1.9,
          }}>
            {lines.map((line, index) => {
              const characterCount = Math.max(0, Math.floor((frame - lineStarts[index]) * charsPerFrame));
              const visibleText = line.text.slice(0, characterCount);
              const showCursor = cursorLine === index && cursorVisible;

              return (
                <div key={`${line.text}-${index}`} style={{minHeight: '1.9em', whiteSpace: 'pre-wrap'}}>
                  {line.prompt ? <span style={{color: th.accent2}}>$ </span> : null}
                  <span style={{color: line.accent ? th.accent2 : line.prompt ? '#FFFFFF' : '#C9C9DE'}}>
                    {visibleText}
                  </span>
                  {showCursor ? (
                    <span style={{display: 'inline-block', width: 22, height: 40, marginLeft: 5, backgroundColor: th.accent2, verticalAlign: -5}} />
                  ) : null}
                </div>
              );
            })}
          </div>

          {progress ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                marginTop: 38,
                opacity: interpolate(frame, [typingEnd, typingEnd + 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
              }}
            >
              <div style={{height: 14, flex: 1, overflow: 'hidden', borderRadius: 7, backgroundColor: '#1E1E2E'}}>
                <div
                  style={{
                    width: `${Math.max(0, Math.min(1, progressValue)) * 100}%`,
                    height: '100%',
                    borderRadius: 7,
                    backgroundColor: th.accent2,
                    boxShadow: `0 0 24px ${th.accent2}`,
                  }}
                />
              </div>
              <div style={{color: '#77778D', fontFamily: 'JetBrains Mono, Consolas, monospace', fontSize: 25}}>
                {progress.label}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </AbsoluteFill>
  );
};
