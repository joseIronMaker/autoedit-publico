import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from '../Background';
import {ANTON, INTER} from '../fonts';
import {Theme} from '../theme';

const progress = (frame: number, from: number, to: number) =>
  interpolate(frame, [from, to], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

const smooth = (n: number) => n * n * (3 - 2 * n);

const cyanPoints = [
  [0.17, 0.72], [0.25, 0.61], [0.29, 0.79], [0.37, 0.66],
  [0.43, 0.82], [0.48, 0.69], [0.18, 0.48], [0.34, 0.52],
];
const magentaPoints = [
  [0.48, 0.27], [0.57, 0.39], [0.64, 0.21], [0.69, 0.43],
  [0.76, 0.28], [0.83, 0.47], [0.72, 0.13], [0.88, 0.32],
];

export const Perceptron: React.FC<{
  inputs?: string[];
  weights?: number[];
  activation?: string;
  output?: string;
  th: Theme;
}> = ({
  inputs = ['x₁', 'x₂', 'x₃'],
  weights = [0.8, -0.5, 1.2],
  activation: _activation,
  output = 'decisión',
  th,
}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const cycle = Math.round(fps * 6.5);
  const f = frame % cycle;
  const intro = spring({frame: f, fps, config: {damping: 18, stiffness: 100}});
  const opacity = intro * (1 - progress(f, cycle - 12, cycle - 1));

  const shownInputs = (inputs.length ? inputs : ['x₁', 'x₂', 'x₃']).slice(0, 3);
  while (shownInputs.length < 3) shownInputs.push(`x${shownInputs.length + 1}`);
  const shownWeights = shownInputs.map((_, i) =>
    Number.isFinite(weights[i]) ? weights[i] : [0.8, -0.5, 1.2][i],
  );

  const leftX = width * 0.045;
  const gap = width * 0.018;
  const panelW = (width - leftX * 2 - gap) / 2;
  const rightX = leftX + panelW + gap;
  const panelY = height * 0.305;
  const panelH = height * 0.305;
  const midY = panelY + panelH * 0.53;

  const inputX = leftX + panelW * 0.09;
  const inputYs = [midY - panelH * 0.27, midY, midY + panelH * 0.27];
  const sumX = leftX + panelW * 0.41;
  const signX = leftX + panelW * 0.68;
  const outputX = leftX + panelW * 0.91;
  const signalPhase = (f - 24) / 82;
  const sumGlow = smooth(progress(f, 44, 72));
  const signGlow = smooth(progress(f, 69, 98));
  const outputGlow = smooth(progress(f, 94, 122));

  const plotX = rightX + panelW * 0.08;
  const plotY = panelY + panelH * 0.17;
  const plotW = panelW * 0.84;
  const plotH = panelH * 0.61;
  const pointsIn = progress(f, 16, 52);
  const lineIn = smooth(progress(f, 58, 92));
  const tilt = interpolate(smooth(progress(f, 98, 142)), [0, 1], [0.68, 0.5]);
  const lineY1 = plotY + plotH * (0.83 - tilt * 0.08);
  const lineY2 = plotY + plotH * (0.19 + tilt * 0.08);

  const pulse = (offset: number, span: number) => {
    const raw = signalPhase - offset;
    const p = ((raw / span) % 1 + 1) % 1;
    return {p, alpha: raw > 0 ? Math.sin(p * Math.PI) : 0};
  };

  return (
    <Background th={th}>
      <AbsoluteFill style={{opacity, transform: `scale(${0.985 + intro * 0.015})`}}>
        <div style={{position: 'absolute', top: height * 0.2, width, textAlign: 'center'}}>
          <div style={{fontFamily: ANTON, fontSize: 82, lineHeight: 0.95, letterSpacing: 4, color: th.text, textShadow: `0 0 26px ${th.accent}66`}}>
            UNA NEURONA
          </div>
          <div style={{marginTop: 14, fontFamily: INTER, fontSize: 22, fontWeight: 900, letterSpacing: 4, color: th.accent}}>
            SIN ACTIVACIÓN AÚN: SOLO UNA RECTA
          </div>
        </div>

        <div style={{position: 'absolute', left: leftX, top: height * 0.282, width: panelW, textAlign: 'center', fontFamily: INTER, fontWeight: 900, fontSize: 21, letterSpacing: 4, color: th.accent}}>
          EL MECANISMO
        </div>
        <div style={{position: 'absolute', left: rightX, top: height * 0.282, width: panelW, textAlign: 'center', fontFamily: INTER, fontWeight: 900, fontSize: 21, letterSpacing: 4, color: th.accent2}}>
          EL RESULTADO
        </div>

        <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
          <defs>
            <radialGradient id="per-cyan">
              <stop offset="0%" stopColor={th.accent} stopOpacity=".72"/>
              <stop offset="42%" stopColor={th.accent} stopOpacity=".22"/>
              <stop offset="100%" stopColor={th.accent} stopOpacity="0"/>
            </radialGradient>
            <radialGradient id="per-magenta">
              <stop offset="0%" stopColor={th.accent2} stopOpacity=".68"/>
              <stop offset="42%" stopColor={th.accent2} stopOpacity=".2"/>
              <stop offset="100%" stopColor={th.accent2} stopOpacity="0"/>
            </radialGradient>
            <linearGradient id="per-line" x1="0" x2="1">
              <stop stopColor={th.accent}/>
              <stop offset="1" stopColor={th.accent2}/>
            </linearGradient>
            <clipPath id="per-plot">
              <rect x={plotX} y={plotY} width={plotW} height={plotH} rx="18"/>
            </clipPath>
          </defs>

          <rect x={leftX} y={panelY} width={panelW} height={panelH} rx="30" fill={`${th.card}e8`} stroke={th.accent} strokeOpacity=".36"/>
          <rect x={rightX} y={panelY} width={panelW} height={panelH} rx="30" fill={`${th.card}e8`} stroke={th.accent2} strokeOpacity=".36"/>

          {shownInputs.map((label, i) => {
            const y = inputYs[i];
            const endX = sumX - 43;
            const endY = midY + (i - 1) * 19;
            const beam = pulse(i * 0.06, 0.7);
            const px = inputX + 25 + (endX - inputX - 25) * beam.p;
            const py = y + (endY - y) * beam.p;
            return (
              <g key={`${label}-${i}`}>
                <line x1={inputX + 25} y1={y} x2={endX} y2={endY} stroke={th.accent} strokeWidth="3" opacity=".42"/>
                <circle cx={inputX} cy={y} r="25" fill={th.cardAlt} stroke={th.accent} strokeWidth="3"/>
                <text x={inputX} y={y + 7} textAnchor="middle" fill={th.text} fontFamily={INTER} fontWeight="900" fontSize="19">{label}</text>
                <rect x={inputX + 40} y={y - 18} width="93" height="32" rx="16" fill="#0b0d20" stroke={th.accent} strokeOpacity=".55"/>
                <text x={inputX + 86} y={y + 3} textAnchor="middle" fill={th.accent} fontFamily={INTER} fontWeight="800" fontSize="14">
                  w{i + 1} = {shownWeights[i] >= 0 ? '+' : '−'}{Math.abs(shownWeights[i]).toFixed(1)}
                </text>
                <circle cx={px} cy={py} r="18" fill="url(#per-cyan)" opacity={beam.alpha}/>
                <circle cx={px} cy={py} r="5" fill="#fff" opacity={beam.alpha}/>
              </g>
            );
          })}

          <line x1={sumX} y1={midY - 78} x2={sumX} y2={midY - 43} stroke={th.accent2} strokeWidth="3"/>
          <circle cx={sumX} cy={midY - 87} r="9" fill={th.accent2}/>
          <text x={sumX + 15} y={midY - 82} fill={th.accent2} fontFamily={INTER} fontWeight="900" fontSize="15">bias w₀</text>
          <circle cx={sumX} cy={midY} r={64 + sumGlow * 13} fill="url(#per-cyan)" opacity={sumGlow}/>
          <circle cx={sumX} cy={midY} r="43" fill={th.cardAlt} stroke={th.accent} strokeWidth={3 + sumGlow * 2}/>
          <text x={sumX} y={midY + 13} textAnchor="middle" fill={th.text} fontFamily={ANTON} fontSize="43">Σ</text>
          <text x={sumX} y={midY + 65} textAnchor="middle" fill={th.muted} fontFamily={INTER} fontWeight="800" fontSize="14">SUMA LINEAL</text>

          <line x1={sumX + 43} y1={midY} x2={signX - 64} y2={midY} stroke={th.accent} strokeWidth="4" opacity={0.4 + signGlow * 0.55}/>
          {(() => {
            const beam = pulse(0.34, 0.32);
            const x = sumX + 43 + (signX - 64 - sumX - 43) * beam.p;
            return <><circle cx={x} cy={midY} r="18" fill="url(#per-cyan)" opacity={beam.alpha}/><circle cx={x} cy={midY} r="5" fill="#fff" opacity={beam.alpha}/></>;
          })()}
          <rect x={signX - 64} y={midY - 54} width="128" height="108" rx="20" fill={th.cardAlt} stroke={th.accent2} strokeWidth={2 + signGlow * 2}/>
          <text x={signX} y={midY - 22} textAnchor="middle" fill={th.accent2} fontFamily={INTER} fontWeight="900" fontSize="15" letterSpacing="1">DECISIÓN</text>
          <text x={signX} y={midY + 5} textAnchor="middle" fill={th.text} fontFamily={INTER} fontWeight="900" fontSize="17">signo:</text>
          <text x={signX} y={midY + 31} textAnchor="middle" fill={th.text} fontFamily={INTER} fontWeight="800" fontSize="14">
            <tspan fill={th.accent}>+ → sí</tspan><tspan fill={th.muted}> · </tspan><tspan fill={th.accent2}>− → no</tspan>
          </text>

          <line x1={signX + 64} y1={midY} x2={outputX - 24} y2={midY} stroke={th.accent2} strokeWidth={3 + outputGlow * 2}/>
          {(() => {
            const beam = pulse(0.69, 0.28);
            const x = signX + 64 + (outputX - 24 - signX - 64) * beam.p;
            return <circle cx={x} cy={midY} r="17" fill="url(#per-magenta)" opacity={beam.alpha}/>;
          })()}
          <circle cx={outputX} cy={midY} r={45 + outputGlow * 11} fill="url(#per-magenta)" opacity={outputGlow}/>
          <circle cx={outputX} cy={midY} r="24" fill={outputGlow > 0.5 ? th.accent2 : th.cardAlt} stroke={th.accent2} strokeWidth="3"/>
          <circle cx={outputX} cy={midY} r="7" fill="#fff"/>
          <text x={outputX} y={midY + 49} textAnchor="middle" fill={th.text} fontFamily={INTER} fontWeight="900" fontSize="13">{output}</text>

          <rect x={plotX} y={plotY} width={plotW} height={plotH} rx="18" fill="#090b1c" stroke={th.muted} strokeOpacity=".3"/>
          {[0.25, 0.5, 0.75].map((v) => <line key={`h${v}`} x1={plotX} y1={plotY + plotH * v} x2={plotX + plotW} y2={plotY + plotH * v} stroke={th.muted} opacity=".12"/>)}
          {[0.25, 0.5, 0.75].map((v) => <line key={`v${v}`} x1={plotX + plotW * v} y1={plotY} x2={plotX + plotW * v} y2={plotY + plotH} stroke={th.muted} opacity=".12"/>)}
          <g clipPath="url(#per-plot)">
            {cyanPoints.map(([x, y], i) => {
              const a = smooth(progress(pointsIn, i / 12, i / 12 + 0.25));
              return <circle key={`c${i}`} cx={plotX + x * plotW} cy={plotY + y * plotH} r={8 + a * 3} fill={th.accent} opacity={a}/>;
            })}
            {magentaPoints.map(([x, y], i) => {
              const a = smooth(progress(pointsIn, i / 12, i / 12 + 0.25));
              return <circle key={`m${i}`} cx={plotX + x * plotW} cy={plotY + y * plotH} r={8 + a * 3} fill={th.accent2} opacity={a}/>;
            })}
            <line x1={plotX - 10} y1={lineY1} x2={plotX + plotW + 10} y2={lineY2} stroke="#fff" strokeWidth="14" opacity={lineIn * 0.1}/>
            <line x1={plotX - 10} y1={lineY1} x2={plotX + plotW + 10} y2={lineY2} stroke="url(#per-line)" strokeWidth="5" opacity={lineIn} pathLength="1" strokeDasharray="1" strokeDashoffset={1 - lineIn}/>
          </g>
          <text x={plotX + plotW / 2} y={plotY + plotH + 37} textAnchor="middle" fill={th.text} fontFamily={ANTON} fontSize="27" letterSpacing="1">
            1 NEURONA = 1 RECTA
          </text>
          <text x={plotX + plotW / 2} y={plotY + plotH + 62} textAnchor="middle" fill={th.muted} fontFamily={INTER} fontWeight="800" fontSize="15">
            Frontera lineal
          </text>
        </svg>

        <div style={{position: 'absolute', top: height * 0.625, left: width * 0.12, width: width * 0.76, height: height * 0.095, borderRadius: 25, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${th.card}ee, ${th.cardAlt}dd)`, border: `1px solid ${th.accent}55`, boxShadow: '0 18px 48px rgba(0,0,0,.38)'}}>
          <div style={{fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 34, fontWeight: 800, color: th.text}}>
            z = <span style={{color: th.accent2, textShadow: `0 0 12px ${th.accent2}`}}>w₀</span> + <span style={{color: th.accent, textShadow: `0 0 12px ${th.accent}`}}>Σ</span> xᵢ·wᵢ
          </div>
          <div style={{marginTop: 8, fontFamily: INTER, fontSize: 18, fontWeight: 900, letterSpacing: 2, color: th.muted}}>
            SOLO SUMA Y PESOS → UNA RECTA
          </div>
          <div style={{marginTop: 5, fontFamily: INTER, fontSize: 15, fontWeight: 800, letterSpacing: 1.5, color: th.text}}>
            YA CORTA EL PLANO · LA ACTIVACIÓN VIENE DESPUÉS
          </div>
        </div>
      </AbsoluteFill>
    </Background>
  );
};
