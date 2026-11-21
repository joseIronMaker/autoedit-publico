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

const ease = (value: number) => value * value * (3 - 2 * value);

export const GradientDescent: React.FC<{th: Theme}> = ({th}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const cycle = Math.round(fps * 6.6);
  const f = frame % cycle;
  const intro = spring({frame: f, fps, config: {damping: 20, stiffness: 110, mass: 0.8}});
  const fadeOut = 1 - ease(clamp(f, cycle - 10, cycle - 1));

  const centerX = width * 0.54;
  const span = width * 0.43;
  const valleyY = height * 0.565;
  const rise = height * 0.235;
  const curveY = (x: number) => valleyY - rise * Math.pow((x - centerX) / span, 2);

  const samples = Array.from({length: 61}, (_, i) => {
    const x = width * 0.07 + (width * 0.9 * i) / 60;
    return {x, y: curveY(x)};
  });
  const curvePath = samples.map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const fillPath = `${curvePath} L ${samples[samples.length - 1].x} ${height * 0.61} L ${samples[0].x} ${height * 0.61} Z`;

  // Con η fijo sobre una parábola, cada actualización acorta la distancia al mínimo.
  const normalizedSteps = [-1, -0.58, -0.336, -0.195, -0.113, -0.052, 0];
  const points = normalizedSteps.map((u) => {
    const x = centerX + u * span * 0.86;
    return {x, y: curveY(x)};
  });
  const stepStart = 28;
  const stepFrames = 23;
  const rawStep = Math.max(0, (f - stepStart) / stepFrames);
  const activeStep = Math.min(points.length - 1, Math.floor(rawStep));
  const stepPhase = rawStep - Math.floor(rawStep);
  const move = ease(clamp(stepPhase, 0.35, 0.92));
  const from = points[activeStep];
  const to = points[Math.min(activeStep + 1, points.length - 1)];
  const ballX = from.x + (to.x - from.x) * move;
  const ballY = from.y + (to.y - from.y) * move;
  const settled = ease(clamp(f, stepStart + stepFrames * 5.75, stepStart + stepFrames * 6.25));
  const settlePulse = 0.86 + Math.sin((f / fps) * Math.PI * 4) * 0.12;

  const slope = (2 * rise * (from.x - centerX)) / (span * span);
  const tangentLength = 105;
  const tangentNorm = Math.sqrt(1 + slope * slope);
  // En la ladera izquierda el gradiente apunta arriba/izquierda.
  const gradDx = -tangentLength / tangentNorm;
  const gradDy = slope * gradDx;
  const arrowOpacity = activeStep < points.length - 1
    ? ease(clamp(stepPhase, 0.02, 0.25)) * (1 - ease(clamp(stepPhase, 0.55, 0.86)))
    : 0;
  const pathProgress = ease(clamp(f, 5, 38));

  return (
    <Background th={th}>
      <AbsoluteFill style={{opacity: fadeOut, transform: `scale(${0.985 + intro * 0.015})`}}>
        <div style={{position: 'absolute', top: height * 0.205, left: 0, width, textAlign: 'center'}}>
          <div style={{fontFamily: ANTON, fontSize: 82, lineHeight: 0.95, letterSpacing: 4, color: th.text, textShadow: `0 0 24px ${th.accent}55`}}>
            GRADIENT DESCENT
          </div>
          <div style={{marginTop: 15, fontFamily: INTER, fontSize: 25, fontWeight: 800, letterSpacing: 3.2, color: th.muted}}>
            BAJA LA MONTAÑA DEL ERROR
          </div>
        </div>

        <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
          <defs>
            <linearGradient id="gd-curve" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={th.accent} />
              <stop offset="1" stopColor={th.accent2} />
            </linearGradient>
            <linearGradient id="gd-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={th.accent} stopOpacity="0.2" />
              <stop offset="0.58" stopColor={th.accent2} stopOpacity="0.08" />
              <stop offset="1" stopColor={th.accent2} stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gd-arrow" x1="1" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor={th.accent2} />
              <stop offset="1" stopColor="#FF8BD1" />
            </linearGradient>
            <radialGradient id="gd-ball-glow">
              <stop offset="0" stopColor={th.accent} stopOpacity="0.72" />
              <stop offset="0.28" stopColor={th.accent} stopOpacity="0.28" />
              <stop offset="1" stopColor={th.accent} stopOpacity="0" />
            </radialGradient>
            <radialGradient id="gd-min-glow">
              <stop offset="0" stopColor={th.green} stopOpacity="0.75" />
              <stop offset="0.3" stopColor={th.green} stopOpacity="0.26" />
              <stop offset="1" stopColor={th.green} stopOpacity="0" />
            </radialGradient>
            <marker id="gd-gradient-head" markerWidth="12" markerHeight="12" refX="9" refY="6" orient="auto">
              <path d="M 0 0 L 12 6 L 0 12 Z" fill={th.accent2} />
            </marker>
            <marker id="gd-step-head" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 Z" fill={th.accent} />
            </marker>
          </defs>

          <rect x={width * 0.045} y={height * 0.297} width={width * 0.91} height={height * 0.315} rx={36} fill="#070914" fillOpacity="0.78" stroke={th.muted} strokeOpacity="0.2" strokeWidth={2} />
          <path d={fillPath} fill="url(#gd-fill)" opacity={pathProgress} />
          <path d={curvePath} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - pathProgress} fill="none" stroke="url(#gd-curve)" strokeWidth={10} strokeLinecap="round" />
          <path d={curvePath} fill="none" stroke="#FFFFFF" strokeOpacity="0.2" strokeWidth={2} strokeLinecap="round" />

          <line x1={centerX} y1={valleyY + 8} x2={centerX} y2={valleyY + 62} stroke={th.green} strokeWidth={3} strokeDasharray="7 8" opacity={0.55 + settled * 0.45} />
          <text x={centerX} y={valleyY + 91} textAnchor="middle" fill={th.green} fontFamily={INTER} fontSize={21} fontWeight={900} letterSpacing={2}>MÍNIMO</text>

          {points.slice(0, -1).map((point, i) => {
            const hasPassed = activeStep > i || (activeStep === i && move > 0.08);
            if (!hasPassed) return null;
            const age = Math.max(0, activeStep - i + move);
            const opacity = Math.max(0.1, 0.52 - age * 0.065);
            return (
              <g key={`trail-${i}`} opacity={opacity}>
                <circle cx={point.x} cy={point.y} r={24} fill="url(#gd-ball-glow)" />
                <circle cx={point.x} cy={point.y} r={7} fill={th.accent} />
              </g>
            );
          })}

          {activeStep < points.length - 1 ? (
            <g opacity={arrowOpacity}>
              <line x1={from.x} y1={from.y - 18} x2={from.x + gradDx} y2={from.y + gradDy - 18} stroke="url(#gd-arrow)" strokeWidth={8} strokeLinecap="round" markerEnd="url(#gd-gradient-head)" />
              <text x={from.x + gradDx - 4} y={from.y + gradDy - 41} textAnchor="middle" fill={th.accent2} fontFamily={INTER} fontSize={20} fontWeight={900}>∇J</text>
              <line x1={from.x + 20} y1={from.y + 11} x2={to.x - 22} y2={to.y - 8} stroke={th.accent} strokeWidth={4} strokeDasharray="9 8" strokeLinecap="round" markerEnd="url(#gd-step-head)" opacity="0.8" />
            </g>
          ) : null}

          <circle cx={ballX} cy={ballY} r={settled ? 82 * settlePulse : 68} fill={settled ? 'url(#gd-min-glow)' : 'url(#gd-ball-glow)'} />
          <circle cx={ballX} cy={ballY} r={settled ? 25 + settlePulse * 3 : 22} fill={settled ? th.green : th.accent} stroke="#FFFFFF" strokeOpacity="0.82" strokeWidth={3} />
          <circle cx={ballX - 7} cy={ballY - 8} r={6} fill="#FFFFFF" opacity="0.8" />

          <g opacity={ease(clamp(f, 18, 34))}>
            <rect x={width * 0.08} y={height * 0.525} width={286} height={53} rx={16} fill="#090B18" fillOpacity="0.92" stroke={th.accent2} strokeOpacity="0.5" />
            <text x={width * 0.08 + 143} y={height * 0.525 + 34} textAnchor="middle" fill={th.text} fontFamily={INTER} fontSize={20} fontWeight={800}>
              <tspan fill={th.accent2}>∇J</tspan><tspan> = la pendiente</tspan>
            </text>
            <rect x={width * 0.655} y={height * 0.49} width={284} height={53} rx={16} fill="#090B18" fillOpacity="0.92" stroke={th.accent} strokeOpacity="0.5" />
            <text x={width * 0.655 + 142} y={height * 0.49 + 34} textAnchor="middle" fill={th.text} fontFamily={INTER} fontSize={20} fontWeight={800}>
              <tspan fill={th.accent}>η</tspan><tspan> = tamaño del paso</tspan>
            </text>
          </g>
        </svg>

        <div style={{position: 'absolute', top: height * 0.64, left: width * 0.12, width: width * 0.76, height: 82, borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(8,10,23,0.96), rgba(20,12,34,0.94))', border: `2px solid ${settled ? `${th.green}99` : `${th.accent}66`}`, boxShadow: `0 0 30px ${settled ? `${th.green}30` : `${th.accent}22`}`}}>
          <div style={{fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace', fontSize: 39, fontWeight: 700, color: th.text, letterSpacing: 1}}>
            W ← W − <span style={{color: th.accent}}>η</span>·<span style={{color: th.accent2}}>∇J</span>
          </div>
        </div>
      </AbsoluteFill>
    </Background>
  );
};
