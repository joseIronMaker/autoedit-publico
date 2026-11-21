import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../Background';
import {ANTON, INTER} from '../fonts';
import {Theme} from '../theme';

const clamp = (value: number, from: number, to: number) =>
  interpolate(value, [from, to], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const smooth = (n: number) => n * n * (3 - 2 * n);
const pulse = (value: number, center: number, width: number) =>
  Math.max(0, 1 - Math.abs(value - center) / width);

type Point = {x: number; y: number; layer: number; index: number};
type Edge = {from: Point; to: Point; layer: number; index: number};

export const Backprop: React.FC<{th: Theme}> = ({th}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const cycle = Math.round(fps * 7);
  const f = frame % cycle;
  const phaseFrames = cycle / 2;
  const isForward = f < phaseFrames;
  const local = isForward ? f : f - phaseFrames;
  const phaseProgress = local / phaseFrames;
  const intro = spring({frame: f, fps, config: {damping: 20, stiffness: 120, mass: 0.75}});
  const seam = 1 - smooth(clamp(f, cycle - 8, cycle - 1));

  const layerXs = [width * 0.11, width * 0.36, width * 0.63, width * 0.86];
  const layerCounts = [3, 4, 4, 1];
  const networkTop = height * 0.345;
  const networkBottom = height * 0.565;
  const layers: Point[][] = layerCounts.map((count, layer) =>
    Array.from({length: count}, (_, index) => ({
      x: layerXs[layer],
      y: count === 1
        ? (networkTop + networkBottom) / 2
        : networkTop + ((networkBottom - networkTop) * index) / (count - 1),
      layer,
      index,
    })),
  );
  const edges: Edge[] = [];
  layers.slice(0, -1).forEach((nodes, layer) => {
    nodes.forEach((from) => {
      layers[layer + 1].forEach((to) => {
        edges.push({from, to, layer, index: edges.length});
      });
    });
  });

  const forwardTravel = smooth(clamp(phaseProgress, 0.08, 0.72));
  const backwardTravel = smooth(clamp(phaseProgress, 0.08, 0.88));
  const errorIn = isForward
    ? smooth(clamp(phaseProgress, 0.7, 0.86))
    : 1 - smooth(clamp(phaseProgress, 0.08, 0.3));
  const forwardOpacity = isForward ? 1 : 0.22;
  const backwardOpacity = isForward ? 0.18 : 1;

  return (
    <Background th={th}>
      <AbsoluteFill style={{opacity: seam, transform: `scale(${0.985 + intro * 0.015})`}}>
        <div style={{position: 'absolute', top: height * 0.202, left: 0, width, textAlign: 'center'}}>
          <div style={{fontFamily: ANTON, fontSize: 84, lineHeight: 0.95, letterSpacing: 4, color: th.text, textShadow: `0 0 24px ${isForward ? th.accent : th.accent2}66`}}>
            BACKPROPAGATION
          </div>
          <div style={{marginTop: 17, height: 38, fontFamily: INTER, fontSize: isForward ? 31 : 29, fontWeight: 800, letterSpacing: isForward ? 3.8 : 1.8, color: isForward ? th.accent : th.accent2}}>
            {isForward ? 'ADELANTE: PREDICE' : 'ATRÁS: REPARTE LA CULPA (REGLA DE LA CADENA)'}
          </div>
        </div>

        <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
          <defs>
            <radialGradient id="bp-cyan-glow">
              <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="0.18" stopColor={th.accent} stopOpacity="0.85" />
              <stop offset="1" stopColor={th.accent} stopOpacity="0" />
            </radialGradient>
            <radialGradient id="bp-magenta-glow">
              <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
              <stop offset="0.18" stopColor={th.accent2} stopOpacity="0.88" />
              <stop offset="1" stopColor={th.accent2} stopOpacity="0" />
            </radialGradient>
            <radialGradient id="bp-error-glow">
              <stop offset="0" stopColor={th.red} stopOpacity="0.65" />
              <stop offset="0.35" stopColor={th.red} stopOpacity="0.2" />
              <stop offset="1" stopColor={th.red} stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect x={width * 0.045} y={height * 0.307} width={width * 0.91} height={height * 0.292} rx={34} fill="#070914" fillOpacity="0.78" stroke={isForward ? th.accent : th.accent2} strokeOpacity="0.22" strokeWidth={2} />

          {edges.map((edge) => {
            const layerStart = isForward ? edge.layer / 3 : (2 - edge.layer) / 3;
            const travel = isForward ? forwardTravel : backwardTravel;
            const segmentProgress = clamp(travel, layerStart, layerStart + 0.34);
            const stagger = ((edge.from.index * 3 + edge.to.index * 5) % 7) * 0.012;
            const p = smooth(clamp(segmentProgress, stagger, 0.78 + stagger));
            const from = isForward ? edge.from : edge.to;
            const to = isForward ? edge.to : edge.from;
            const px = from.x + (to.x - from.x) * p;
            const py = from.y + (to.y - from.y) * p;
            const active = pulse(segmentProgress, 0.48 + stagger, 0.48);
            const gradientFlash = !isForward ? pulse(segmentProgress, 0.72 + stagger, 0.19) : 0;
            const mx = edge.from.x + (edge.to.x - edge.from.x) * 0.52;
            const my = edge.from.y + (edge.to.y - edge.from.y) * 0.52;
            return (
              <g key={`edge-${edge.index}`}>
                <line x1={edge.from.x} y1={edge.from.y} x2={edge.to.x} y2={edge.to.y} stroke={isForward ? th.accent : th.accent2} strokeWidth={1.5 + active * 1.4} opacity={0.16 + active * 0.26} />
                <circle cx={px} cy={py} r={22} fill={isForward ? 'url(#bp-cyan-glow)' : 'url(#bp-magenta-glow)'} opacity={active} />
                <circle cx={px} cy={py} r={4.5} fill="#FFFFFF" opacity={active} />
                {!isForward && gradientFlash > 0.03 ? (
                  <g opacity={gradientFlash}>
                    <rect x={mx - 33} y={my - 13} width={66} height={25} rx={8} fill="#090A17" stroke={th.accent2} strokeOpacity="0.72" />
                    <text x={mx} y={my + 5} textAnchor="middle" fill={th.accent2} fontFamily={'Consolas, "Liberation Mono", monospace'} fontSize={20} fontWeight={700}>∂J/∂w</text>
                  </g>
                ) : null}
              </g>
            );
          })}

          {layers.flat().map((node) => {
            const order = isForward ? node.layer / 3 : (3 - node.layer) / 3;
            const travel = isForward ? forwardTravel : backwardTravel;
            const lit = smooth(clamp(travel, order - 0.05, order + 0.12));
            const correction = !isForward ? pulse(backwardTravel, order + 0.1, 0.14) : 0;
            const color = isForward ? th.accent : th.accent2;
            return (
              <g key={`node-${node.layer}-${node.index}`}>
                <circle cx={node.x} cy={node.y} r={40 + correction * 18} fill={isForward ? 'url(#bp-cyan-glow)' : 'url(#bp-magenta-glow)'} opacity={0.18 + lit * 0.7} />
                <circle cx={node.x} cy={node.y} r={21 + correction * 3} fill={lit > 0.45 ? color : th.cardAlt} stroke={color} strokeWidth={2.5 + correction * 3} />
                <circle cx={node.x - 6} cy={node.y - 7} r={5} fill="#FFFFFF" opacity={0.18 + lit * 0.7} />
              </g>
            );
          })}

          {['ENTRADA', 'CAPA 1', 'CAPA 2', 'SALIDA'].map((label, i) => (
            <text key={label} x={layerXs[i]} y={height * 0.556} textAnchor="middle" fill={i === 3 && errorIn > 0.2 ? th.red : th.muted} fontFamily={INTER} fontSize={25} fontWeight={800} letterSpacing={1.6}>{label}</text>
          ))}

          <g opacity={errorIn}>
            <line x1={layerXs[3] + 28} y1={(networkTop + networkBottom) / 2} x2={width * 0.935} y2={height * 0.455} stroke={th.red} strokeWidth={3} strokeDasharray="6 6" />
            <circle cx={width * 0.935} cy={height * 0.455} r={48 + errorIn * 12} fill="url(#bp-error-glow)" />
            <circle cx={width * 0.935} cy={height * 0.455} r={27} fill="#160811" stroke={th.red} strokeWidth={3} />
            <text x={width * 0.935} y={height * 0.451} textAnchor="middle" fill={th.text} fontFamily={INTER} fontSize={21} fontWeight={800}>ŷ ≠ y</text>
            <text x={width * 0.935} y={height * 0.478} textAnchor="middle" fill={th.red} fontFamily={INTER} fontSize={24} fontWeight={900}>ERROR</text>
            <text x={width * 0.845} y={height * 0.405} textAnchor="middle" fill={th.accent} fontFamily={INTER} fontSize={22} fontWeight={800}>PREDICCIÓN ŷ</text>
          </g>
        </svg>

        <div style={{position: 'absolute', top: height * 0.585, left: width * 0.105, width: width * 0.79, height: 78, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(8,10,23,0.97), rgba(23,10,33,0.95))', border: `2px solid ${isForward ? `${th.accent}55` : `${th.accent2}88`}`, boxShadow: `0 0 28px ${isForward ? `${th.accent}22` : `${th.accent2}30`}`}}>
          <div style={{fontFamily: 'Consolas, "Liberation Mono", monospace', fontSize: 35, fontWeight: 700, color: th.text, letterSpacing: 0.5}}>
            <span style={{color: th.accent2}}>∂J/∂w</span> = <span style={{color: th.red}}>∂J/∂ŷ</span> · <span style={{color: th.accent}}>∂ŷ/∂w</span>
          </div>
        </div>

        <div style={{position: 'absolute', top: height * 0.648, left: width * 0.07, width: width * 0.86, textAlign: 'center', fontFamily: INTER, fontSize: 33, fontWeight: 800, letterSpacing: 1.2, color: th.text}}>
          <span style={{color: th.accent2}}>BACKPROP CALCULA</span> EL GRADIENTE
          <div style={{marginTop: 8, fontSize: 23, letterSpacing: 2.2, color: th.muted}}>
            LUEGO GRADIENT DESCENT LO APLICA
          </div>
        </div>

        <div style={{position: 'absolute', top: height * 0.292, left: width * 0.07, fontFamily: INTER, fontSize: 23, fontWeight: 800, letterSpacing: 1.4, color: th.accent, opacity: forwardOpacity}}>SEÑAL →</div>
        <div style={{position: 'absolute', top: height * 0.292, right: width * 0.07, fontFamily: INTER, fontSize: 23, fontWeight: 800, letterSpacing: 1.4, color: th.accent2, opacity: backwardOpacity}}>← ERROR + GRADIENTES</div>
      </AbsoluteFill>
    </Background>
  );
};
