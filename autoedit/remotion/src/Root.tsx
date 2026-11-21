import React from 'react';
import {Composition} from 'remotion';
import {Diagram, DiagramProps} from './Diagram';
import {Beat, BeatProps} from './Beat';
import {TopBand} from './TopBand';
import {Panel} from './Panel';

const FPS = 30;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Diagram"
        component={Diagram}
        durationInFrames={150}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{
          spec: {type: 'flow', title: 'Cómo crea', items: ['Aprende patrones', 'Los combina', 'Crea algo nuevo']},
          theme: 'violeta',
          durationInFrames: 150,
        } as DiagramProps}
        calculateMetadata={({props}) => ({
          durationInFrames: (props as DiagramProps).durationInFrames ?? 150,
          fps: FPS,
        })}
      />
      <Composition
        id="Beat"
        component={Beat}
        durationInFrames={150}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{
          spec: {
            type: 'kinetic',
            words: [{text: 'te', serif: true}, {text: 'PREGUNTA'}, {text: 'lo que', serif: true}, {text: 'NO VES', accent: true}],
            variant: 'dark',
          },
          theme: 'violeta',
          durationInFrames: 150,
        } as BeatProps}
        calculateMetadata={({props}) => ({
          durationInFrames: (props as BeatProps).durationInFrames ?? 150,
          fps: FPS,
        })}
      />
      <Composition
        id="TopBand"
        component={TopBand as React.FC<any>}
        durationInFrames={150}
        fps={FPS}
        width={1080}
        height={660}
        defaultProps={{
          spec: {kind: 'headline', lines: ['MEJOR QUE GPT', 'PERO GRATIS'], kicker: 'ia con josé'},
          theme: 'violeta',
          durationInFrames: 150,
        }}
        calculateMetadata={({props}) => ({
          durationInFrames: (props as any).durationInFrames ?? 150,
          fps: FPS,
        })}
      />
      <Composition
        id="Panel"
        component={Panel as React.FC<any>}
        durationInFrames={150}
        fps={FPS}
        width={1080}
        height={1026}
        defaultProps={{
          spec: {kind: 'define', term: 'Agente', body: 'Un modelo de lenguaje metido en un bucle, con herramientas.'},
          theme: 'violeta',
          durationInFrames: 150,
        }}
        calculateMetadata={({props}) => ({
          durationInFrames: (props as any).durationInFrames ?? 150,
          fps: FPS,
        })}
      />
    </>
  );
};
