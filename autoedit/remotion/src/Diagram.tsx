import React from 'react';
import {themeOf} from './theme';
import {Background} from './Background';
import {Title, Rows, Compare, Bars, NeuralNet, BigText} from './scenes';

// spec = el mismo dict que consume diagrams.py (type + campos por tipo).
export type DiagramSpec = {
  type: string;
  title?: string;
  items?: any[];
  layers?: number[];
  in_label?: string;
  out_label?: string;
};

export type DiagramProps = {
  spec: DiagramSpec;
  theme?: string;
  durationInFrames?: number;
};

export const Diagram: React.FC<DiagramProps> = ({spec, theme}) => {
  const th = themeOf(theme ?? (spec as any).theme);
  const type = spec.type;
  return (
    <Background th={th}>
      {type !== 'big_text' && spec.title ? <Title title={spec.title} th={th} /> : null}
      {type === 'flow' || type === 'list' ? (
        <Rows items={(spec.items ?? []).map(String)} th={th} flow={type === 'flow'} />
      ) : type === 'compare' ? (
        <Compare items={(spec.items ?? []).map(String)} th={th} />
      ) : type === 'bars' ? (
        <Bars items={(spec.items ?? []) as any} th={th} />
      ) : type === 'neural_net' ? (
        <NeuralNet spec={spec} th={th} />
      ) : type === 'big_text' ? (
        <BigText items={(spec.items ?? []).map(String)} th={th} />
      ) : null}
    </Background>
  );
};
