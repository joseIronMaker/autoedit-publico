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

const smooth = (value: number) => value * value * (3 - 2 * value);

type MoonPoint = {
  x: number;
  y: number;
  color: 'cyan' | 'magenta';
  key: string;
};

export const ActivationBend: React.FC<{th: Theme}> = ({th}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const duration = Math.round(fps * 7);
  const localFrame = frame % duration;
  const t = localFrame / fps;

  const intro = spring({
    frame: localFrame,
    fps,
    config: {damping: 20, stiffness: 115, mass: 0.75},
  });
  const loopOut = 1 - smooth(clamp(localFrame, duration - 10, duration - 1));
  const functionsIn = smooth(clamp(t, 1.85, 2.35));
  const functionsOut = 1 - smooth(clamp(t, 4.35, 4.72));
  const functionOpacity = functionsIn * functionsOut;
  const solution = smooth(clamp(t, 4.45, 5.15));
  const failure = 1 - smooth(clamp(t, 4.48, 5.05));
  const titleShift = smooth(clamp(t, 1.75, 2.2));
  const successPulse = 0.72 + Math.sin(t * Math.PI * 2.2) * 0.12;

  const top = height * 0.22;
  const bottom = height * 0.7;
  const panelX = width * 0.055;
  const panelW = width * 0.89;
  const plotLeft = width * 0.13;
  const plotRight = width * 0.87;
  const moonCenterY = height * 0.505;

  const points: MoonPoint[] = [];
  const count = 18;
  for (let i = 0; i < count; i++) {
    const ratio = i / (count - 1);
    const angle = ratio * Math.PI;
    const jitter = ((i % 3) - 1) * height * 0.0022;
    points.push({
      x: width * (0.18 + ratio * 0.5),
      y: moonCenterY - Math.sin(angle) * height * 0.064 + jitter,
      color: 'cyan',
      key: `cyan-${i}`,
    });
    points.push({
      x: width * (0.32 + ratio * 0.5),
      y: moonCenterY - height * 0.014 + Math.sin(angle) * height * 0.064 - jitter,
      color: 'magenta',
      key: `magenta-${i}`,
    });
  }

  const wrongKeys = new Set(['cyan-13', 'cyan-15', 'magenta-2']);
  const straightPath = `M ${width * 0.13} ${height * 0.526} L ${width * 0.87} ${height * 0.466}`;
  const curvedPath = `M ${width * 0.12} ${height * 0.535} C ${width * 0.25} ${height * 0.518}, ${width * 0.27} ${height * 0.452}, ${width * 0.43} ${height * 0.458} C ${width * 0.58} ${height * 0.462}, ${width * 0.58} ${height * 0.535}, ${width * 0.72} ${height * 0.54} C ${width * 0.79} ${height * 0.543}, ${width * 0.84} ${height * 0.521}, ${width * 0.89} ${height * 0.505}`;

  const graphX = width * 0.105;
  const graphY = height * 0.345;
  const graphW = width * 0.79;
  const graphH = height * 0.102;
  const sigmoidPath = `M ${graphX + graphW * 0.05} ${graphY + graphH * 0.76} C ${graphX + graphW * 0.28} ${graphY + graphH * 0.76}, ${graphX + graphW * 0.31} ${graphY + graphH * 0.22}, ${graphX + graphW * 0.48} ${graphY + graphH * 0.22}`;
  const tanhPath = `M ${graphX + graphW * 0.52} ${graphY + graphH * 0.78} C ${graphX + graphW * 0.65} ${graphY + graphH * 0.78}, ${graphX + graphW * 0.68} ${graphY + graphH * 0.18}, ${graphX + graphW * 0.95} ${graphY + graphH * 0.18}`;
  const drawFunctions = smooth(clamp(t, 2.1, 3.25));
  const drawBoundary = smooth(clamp(t, 4.65, 5.65));

  const heading = t < 1.82
    ? 'SIN ACTIVACIÓN = SOLO RECTAS'
    : t < 4.48
      ? 'LA ACTIVACIÓN AGREGA NO-LINEALIDAD'
      : 'LA RED YA PUEDE CURVARSE';
  const caption = t < 1.82
    ? 'apiles lo que apiles, solo rectas'
    : t < 4.48
      ? 'sigmoide y tanh: curvas por sí solas'
      : 'ahora sí: la red se curva';

  return (
    <Background th={th}>
      <AbsoluteFill style={{opacity: loopOut, transform: `scale(${0.985 + intro * 0.015})`}}>
        <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
          <defs>
            <radialGradient id="activation-cyan-glow">
              <stop offset="0" stopColor={th.accent} stopOpacity="0.4" />
              <stop offset="1" stopColor={th.accent} stopOpacity="0" />
            </radialGradient>
            <radialGradient id="activation-magenta-glow">
              <stop offset="0" stopColor={th.accent2} stopOpacity="0.4" />
              <stop offset="1" stopColor={th.accent2} stopOpacity="0" />
            </radialGradient>
            <radialGradient id="activation-success-glow">
              <stop offset="0" stopColor={th.green} stopOpacity="0.42" />
              <stop offset="1" stopColor={th.green} stopOpacity="0" />
            </radialGradient>
            <linearGradient id="activation-boundary-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={th.accent} />
              <stop offset="0.52" stopColor="#F5F5F7" />
              <stop offset="1" stopColor={th.accent2} />
            </linearGradient>
          </defs>

          <rect x={panelX} y={top} width={panelW} height={bottom - top} rx={38} fill="#070914" fillOpacity="0.82" stroke={th.muted} strokeOpacity="0.22" strokeWidth={2} />
          <circle cx={width * 0.29} cy={moonCenterY} r={width * 0.24} fill="url(#activation-cyan-glow)" opacity={0.3} />
          <circle cx={width * 0.71} cy={moonCenterY} r={width * 0.24} fill="url(#activation-magenta-glow)" opacity={0.3} />

          <g opacity={functionOpacity}>
            <rect x={graphX} y={graphY} width={graphW} height={graphH} rx={24} fill="#0B0D1A" fillOpacity="0.96" stroke={th.muted} strokeOpacity="0.3" strokeWidth={2} />
            <line x1={graphX + graphW * 0.04} y1={graphY + graphH * 0.5} x2={graphX + graphW * 0.96} y2={graphY + graphH * 0.5} stroke={th.muted} strokeOpacity="0.24" strokeWidth={2} />
            <line x1={graphX + graphW * 0.265} y1={graphY + graphH * 0.12} x2={graphX + graphW * 0.265} y2={graphY + graphH * 0.86} stroke={th.muted} strokeOpacity="0.2" strokeWidth={2} />
            <line x1={graphX + graphW * 0.735} y1={graphY + graphH * 0.12} x2={graphX + graphW * 0.735} y2={graphY + graphH * 0.86} stroke={th.muted} strokeOpacity="0.2" strokeWidth={2} />
            <path d={sigmoidPath} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - drawFunctions} fill="none" stroke={th.accent} strokeWidth={8} strokeLinecap="round" />
            <path d={tanhPath} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - drawFunctions} fill="none" stroke={th.accent2} strokeWidth={8} strokeLinecap="round" />
            <text x={graphX + graphW * 0.265} y={graphY + graphH * 0.96} fill={th.accent} fontFamily={INTER} fontSize={18} fontWeight={900} textAnchor="middle">SIGMOIDE · σ(x)=1/(1+e⁻ˣ)</text>
            <text x={graphX + graphW * 0.735} y={graphY + graphH * 0.96} fill={th.accent2} fontFamily={INTER} fontSize={18} fontWeight={900} textAnchor="middle">TANH</text>
          </g>

          <g opacity={0.5 + intro * 0.5}>
            {points.map((point) => {
              const color = point.color === 'cyan' ? th.accent : th.accent2;
              return (
                <g key={point.key} transform={`translate(${point.x} ${point.y}) scale(${0.55 + intro * 0.45})`}>
                  <circle r={width * 0.019} fill={point.color === 'cyan' ? 'url(#activation-cyan-glow)' : 'url(#activation-magenta-glow)'} />
                  <circle r={width * 0.0064} fill={color} stroke="#FFFFFF" strokeOpacity={0.72} strokeWidth={1.6} />
                  {wrongKeys.has(point.key) ? (
                    <circle r={width * 0.0125} fill="none" stroke={th.red} strokeWidth={4} opacity={failure} />
                  ) : null}
                </g>
              );
            })}
          </g>

          <path d={straightPath} fill="none" stroke="#D7DAE5" strokeWidth={7} strokeDasharray="17 13" strokeLinecap="round" opacity={failure * (1 - functionOpacity * 0.55)} />

          <g opacity={solution}>
            <path d={curvedPath} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - drawBoundary} fill="none" stroke="#060812" strokeWidth={20} strokeLinecap="round" />
            <path d={curvedPath} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - drawBoundary} fill="none" stroke="url(#activation-boundary-gradient)" strokeWidth={9} strokeLinecap="round" />
            <circle cx={width * 0.86} cy={height * 0.572} r={width * 0.055} fill="url(#activation-success-glow)" opacity={successPulse} />
            <circle cx={width * 0.86} cy={height * 0.572} r={width * 0.024} fill={th.green} />
            <path d={`M ${width * 0.847} ${height * 0.572} L ${width * 0.857} ${height * 0.579} L ${width * 0.876} ${height * 0.562}`} fill="none" stroke="#07120B" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </svg>

        <div style={{position: 'absolute', top: height * 0.242, left: width * 0.08, width: width * 0.84, textAlign: 'center'}}>
          <div style={{fontFamily: ANTON, fontSize: 73, lineHeight: 0.95, letterSpacing: 3, color: th.text, textShadow: `0 0 22px ${th.accent}45`}}>NO-LINEALIDAD</div>
          <div style={{marginTop: 12, minHeight: 36, fontFamily: INTER, fontSize: 22, lineHeight: 1.1, fontWeight: 900, letterSpacing: 1.5, color: t < 1.82 ? th.red : t < 4.48 ? (titleShift < 0.5 ? th.text : th.accent) : th.green}}>{heading}</div>
        </div>

        <div style={{position: 'absolute', top: height * 0.625, left: width * 0.09, width: width * 0.82, textAlign: 'center'}}>
          <div style={{display: 'inline-block', padding: '11px 24px', borderRadius: 16, background: '#0A0D18EE', border: `2px solid ${t < 1.82 ? th.red : t < 4.48 ? th.accent : th.green}`, boxShadow: `0 0 24px ${t < 1.82 ? `${th.red}33` : t < 4.48 ? `${th.accent}33` : `${th.green}3D`}`, fontFamily: INTER, fontSize: 23, lineHeight: 1.15, fontWeight: 850, color: th.text}}>
            {caption}
          </div>
        </div>
      </AbsoluteFill>
    </Background>
  );
};
