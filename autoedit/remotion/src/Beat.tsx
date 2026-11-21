import React from 'react';
import {AbsoluteFill} from 'remotion';
import {themeOf} from './theme';
import {KineticSlide} from './beats/KineticSlide';
import {KineticOverVideo} from './beats/KineticOverVideo';
import {TerminalSlide} from './beats/TerminalSlide';
import {CtaCard} from './beats/CtaCard';
import {Receipt} from './beats/Receipt';
import {Cutout} from './beats/Cutout';
import {Mascota} from './beats/Mascota';
import {Showcase} from './Showcase';
import {Perceptron} from './beats/Perceptron';
import {ActivationBend} from './beats/ActivationBend';
import {GradientDescent} from './beats/GradientDescent';
import {Backprop} from './beats/Backprop';
import {LottieBeat} from './beats/LottieBeat';

// Escena "beat" del formato presentador-evidencia. Paramétrica: el pipeline de Python
// pasa {spec, theme, durationInFrames} por --props; spec.type elige el componente.
export type BeatProps = {
  spec: Record<string, any>;
  theme?: string;
  durationInFrames?: number;
};

export const Beat: React.FC<BeatProps> = ({spec, theme}) => {
  const th = themeOf(theme ?? (spec?.theme as string) ?? 'violeta');
  switch (spec?.type) {
    case 'kinetic':
      return <KineticSlide words={spec.words ?? []} variant={spec.variant} th={th} />;
    case 'kinetic_video':
      return <KineticOverVideo words={spec.words ?? []} stanzas={spec.stanzas} veil={spec.veil} video={spec.video} variant={spec.variant} th={th} />;
    case 'terminal':
      return (
        <TerminalSlide
          title={spec.title}
          caption={spec.caption}
          lines={spec.lines ?? []}
          progress={spec.progress}
          watermark={spec.watermark}
          th={th}
        />
      );
    case 'cta':
      return <CtaCard title={spec.title ?? ''} button={spec.button ?? 'SÍGUEME'} sub={spec.sub} handle={spec.handle} th={th} />;
    case 'receipt':
      return <Receipt spec={spec as any} th={th} />;
    case 'cutout':
      return <Cutout spec={spec as any} th={th} />;
    case 'mascota':
      return <Mascota spec={spec as any} th={th} />;
    case 'showcase':
      return <Showcase items={spec.items ?? []} th={th} />;
    case 'perceptron':
      return <Perceptron inputs={spec.inputs} weights={spec.weights} activation={spec.activation} output={spec.output} th={th} />;
    case 'activation_bend':
      return <ActivationBend th={th} />;
    case 'gradient_descent':
      return <GradientDescent th={th} />;
    case 'backprop':
      return <Backprop th={th} />;
    case 'lottie':
      return <LottieBeat src={spec.src} title={spec.title} caption={spec.caption} loop={spec.loop !== false} th={th} />;
    default:
      return <AbsoluteFill style={{backgroundColor: '#0B0B12'}} />;
  }
};
