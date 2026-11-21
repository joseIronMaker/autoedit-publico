import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Theme} from './theme';
import {ANTON, INTER} from './fonts';
import {resolveIcon} from './ConceptIcons';

const CONTENT_TOP = 0.22;
const CONTENT_BOTTOM = 0.7;

// "Glass" sin backdrop-filter: gradiente translúcido sólido + borde neón + highlight interno.
const cardBg = (th: Theme) => `linear-gradient(135deg, ${th.card}f0 0%, ${th.cardAlt}e0 100%)`;
const cardShadow = (th: Theme) =>
  `0 22px 60px rgba(0,0,0,0.5), 0 0 34px ${th.accent}22, inset 0 1px 0 rgba(255,255,255,0.09)`;

const springIn = (frame: number, fps: number, delay: number, cfg?: object) =>
  spring({frame: frame - delay, fps, config: {damping: 13, stiffness: 110, mass: 0.75, ...cfg}});

// ---------- Título con barra de acento ----------
export const Title: React.FC<{title: string; th: Theme}> = ({title, th}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const s = spring({frame, fps, config: {damping: 14, stiffness: 90, mass: 0.9}});
  const y = interpolate(s, [0, 1], [40, 0]);
  const barW = interpolate(spring({frame: frame - 6, fps, config: {damping: 15, stiffness: 120}}), [0, 1], [0, width * 0.26]);
  return (
    <div style={{position: 'absolute', top: height * 0.075, width, textAlign: 'center', transform: `translateY(${y}px)`, opacity: s}}>
      <div style={{fontFamily: ANTON, fontSize: height * 0.05, letterSpacing: 1, color: th.text, textTransform: 'uppercase', textShadow: `0 0 40px ${th.accent}88`, padding: '0 6%', lineHeight: 1.06}}>
        {title}
      </div>
      <div style={{width: barW, height: 12, margin: '20px auto 0', borderRadius: 6, background: `linear-gradient(90deg, ${th.accent}, ${th.accent2})`, boxShadow: `0 0 24px ${th.accent2}aa`}} />
    </div>
  );
};

const NumberBadge: React.FC<{n: number; th: Theme; a: number; size?: number; phase?: number}> = ({n, th, a, size = 100, phase = 0}) => {
  const pulse = (Math.sin(phase * 2.1) + 1) / 2;
  return <div style={{position: 'relative', width: size * 1.28, height: size * 1.28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: a}}>
    <div style={{position: 'absolute', inset: -size * 0.3, borderRadius: '50%', transform: `scale(${0.9 + pulse * 0.18})`, opacity: 0.34 + pulse * 0.24, background: `radial-gradient(circle, ${th.accent}66 0%, ${th.accent2}24 40%, ${th.accent}00 72%)`}} />
    <div style={{position: 'absolute', width: size * 1.17, height: size * 1.17, borderRadius: '50%', border: `2px dashed ${th.accent}88`, transform: `rotate(${phase * 22}deg)`, boxShadow: `0 0 16px ${th.accent}44`}} />
    <div
      style={{
      position: 'relative',
      width: size,
      height: size,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `radial-gradient(circle at 35% 30%, ${th.accent2}, ${th.accent})`,
      boxShadow: `0 0 32px ${th.accent2}aa, 0 0 64px ${th.accent}55, inset 0 2px 6px rgba(255,255,255,0.35)`,
    }}
  >
    <span style={{fontFamily: ANTON, fontSize: size * 0.56, color: '#0A0A0F', lineHeight: 1, marginTop: 4}}>{n}</span>
    </div>
  </div>;
};

// ---------- flow / list ----------
export const Rows: React.FC<{items: string[]; th: Theme; flow: boolean}> = ({items, th, flow}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const list = items.slice(0, 5);
  const n = Math.max(1, list.length);
  const top = height * CONTENT_TOP;
  const bottom = height * CONTENT_BOTTOM;
  const rowH = Math.min(height * 0.15, (bottom - top) / n);
  const cardH = rowH - 30;
  const cardW = width * 0.84;
  const x = (width - cardW) / 2;
  const t = frame / fps;
  return (
    <>
      {list.map((it, i) => {
        const ConceptIcon = resolveIcon(it);
        const s = springIn(frame, fps, 10 + i * 9);
        const ty = interpolate(s, [0, 1], [105, 0]);
        const enterScale = interpolate(s, [0, 1], [0.9, 1]);
        const rotateX = interpolate(s, [0, 1], [18, 0]);
        const breathe = 1 + Math.sin(t * 1.18 + i * 1.43) * 0.009;
        const float = Math.sin(t * 1.35 + i * 1.7) * 7;
        const y = top + i * rowH + float;
        const words = it.split(/(\s+)/);
        const wordIndexes = words.map((word, index) => ({index, length: word.replace(/[^\p{L}\p{N}]/gu, '').length})).filter((word) => word.length > 0);
        const keywordIndex = wordIndexes.reduce((best, word) => word.length >= best.length ? word : best, {index: -1, length: -1}).index;
        const glareCycle = ((frame + i * 37) % 150) / 150;
        return (
          <div
            key={i}
            style={{
              position: 'absolute', left: x, top: y, width: cardW, height: cardH,
              transform: `perspective(900px) translateY(${ty}px) rotateX(${rotateX}deg) scale(${enterScale * breathe})`, transformOrigin: '50% 100%', opacity: s,
              display: 'flex', alignItems: 'center', gap: 34, padding: '0 46px',
              borderRadius: 34, background: cardBg(th), border: `1.5px solid ${th.accent}66`, boxShadow: cardShadow(th), overflow: 'hidden',
            }}
          >
            <div style={{position: 'absolute', top: '-35%', left: '-28%', width: '18%', height: '175%', opacity: 0.28, transform: `translateX(${glareCycle * cardW * 1.55}px) rotate(17deg)`, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)'}} />
            {[0, 1, 2].map((p) => {
              const progress = ((frame * (0.75 + p * 0.12) + i * 23 + p * 46) % 145) / 145;
              const col = p % 2 ? th.accent2 : th.accent;
              return <div key={p} style={{position: 'absolute', left: 20 + progress * (cardW - 80), top: cardH * (0.2 + p * 0.28) + Math.sin(t * 2 + p + i) * 5, width: 5 + p, height: 5 + p, borderRadius: '50%', opacity: 0.2 + Math.sin(progress * Math.PI) * 0.42, background: col, boxShadow: `0 0 10px ${col}`}} />;
            })}
            {ConceptIcon ? <>
              <div style={{position: 'absolute', left: 16, top: 14, zIndex: 3, width: 34, height: 34, borderRadius: 17, display: 'flex', alignItems: 'center', justifyContent: 'center', background: th.accent2, color: '#090A10', fontFamily: ANTON, fontSize: 20, boxShadow: `0 0 14px ${th.accent2}88`}}>{i + 1}</div>
              <ConceptIcon th={th} size={Math.min(120, cardH * 0.8)} frame={frame} fps={fps}/>
            </> : <NumberBadge n={i + 1} th={th} a={s} size={Math.min(96, cardH * 0.62)} phase={t + i * 0.8} />}
            <div style={{position: 'relative', zIndex: 1, flex: 1, minWidth: 0, fontFamily: INTER, fontWeight: 700, fontSize: height * 0.03, color: th.text, lineHeight: 1.08, letterSpacing: -1}}>{words.map((word, wi) => <span key={wi} style={wi === keywordIndex ? {color: i % 2 ? th.accent2 : th.accent, textShadow: `0 0 12px ${i % 2 ? th.accent2 : th.accent}88`} : undefined}>{word}</span>)}</div>
          </div>
        );
      })}
      {flow && list.slice(0, -1).map((_, i) => {
        const cs = springIn(frame, fps, 18 + i * 9, {mass: 0.6});
        const cy = top + i * rowH + cardH;
        const connectorH = Math.max(12, rowH - cardH);
        const energy = ((frame + i * 19) % 38) / 38;
        return (
          <div key={`c${i}`} style={{position: 'absolute', left: width / 2 - 2, top: cy, width: 4, height: connectorH, opacity: cs, borderRadius: 4, background: `linear-gradient(180deg, ${th.accent}18, ${th.accent2}99, ${th.accent}18)`, boxShadow: `0 0 10px ${th.accent2}55`}}>
            <div style={{position: 'absolute', left: -12, top: energy * connectorH - 3, width: 28, height: 7, borderRadius: 7, background: `linear-gradient(90deg, ${th.accent2}00, ${th.accent2}88, ${th.accent})`, boxShadow: `0 0 14px ${th.accent}`}} />
          </div>
        );
      })}
    </>
  );
};

// ---------- compare (✗ vs ✓) ----------
export const Compare: React.FC<{items: string[]; th: Theme}> = ({items, th}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const list = items.slice(0, 6);
  const top = height * CONTENT_TOP;
  const bottom = height * CONTENT_BOTTOM;
  const colW = width * 0.43;
  const lx = width * 0.265;
  const rx = width * 0.735;
  const rows = Math.max(1, Math.ceil(list.length / 2));
  const rowH = Math.min(height * 0.14, (bottom - top - 120) / rows);
  const t = frame / fps;
  const hs = spring({frame: frame - 4, fps, config: {damping: 10, stiffness: 150, mass: 0.65}});
  return (
    <>
      {([['✗', lx, th.red], ['✓', rx, th.green]] as const).map(([sym, cx, col], k) => (
        <div key={k} style={{position: 'absolute', left: cx - 70, top: top - 18, width: 140, height: 118, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `translateY(${interpolate(hs, [0, 1], [-28, 0])}px) scale(${interpolate(hs, [0, 1], [0.25, 1]) * (1 + Math.sin(t * 2.1 + k) * 0.025)})`, opacity: hs}}>
          <div style={{position: 'absolute', inset: -22, borderRadius: '50%', background: `radial-gradient(circle, ${col}66 0%, ${col}20 38%, ${col}00 72%)`, opacity: 0.65 + Math.sin(t * 2.1 + k) * 0.18}} />
          <div style={{position: 'relative', fontFamily: INTER, fontWeight: 900, fontSize: 78, color: col as string, textShadow: `0 0 20px ${col}99`}}>{sym}</div>
        </div>
      ))}
      <div style={{position: 'absolute', left: width / 2 - 1, top: top + 82, width: 2, height: bottom - top - 64, opacity: 0.18 + (Math.sin(t * 2.4) + 1) * 0.08, background: `linear-gradient(180deg, transparent, ${th.accent}99, ${th.accent2}99, transparent)`, boxShadow: `0 0 18px ${th.accent}66`}} />
      <div style={{position: 'absolute', left: width / 2 - 28, top: top + 74, width: 56, textAlign: 'center', fontFamily: ANTON, fontSize: 22, letterSpacing: 3, color: th.muted, opacity: 0.5 + Math.sin(t * 2.4) * 0.14}}>VS</div>
      {list.map((it, i) => {
        const s = springIn(frame, fps, 16 + i * 8);
        const left = i % 2 === 0;
        const cx = left ? lx : rx;
        const col = left ? th.red : th.green;
        const cardH = rowH - 18;
        const float = Math.sin(t * 1.25 + i) * 4;
        const breathe = 1 + Math.sin(t * 1.45 + i * 1.3) * 0.009;
        const enterX = interpolate(s, [0, 1], [left ? -150 : 150, 0]);
        const enterScale = interpolate(s, [0, 1], [0.86, 1]);
        const rotateY = interpolate(s, [0, 1], [left ? -18 : 18, 0]);
        const y = top + 110 + Math.floor(i / 2) * rowH + float;
        const words = it.split(/(\s+)/);
        const wordIndexes = words.map((word, index) => ({index, length: word.replace(/[^\p{L}\p{N}]/gu, '').length})).filter((word) => word.length > 0);
        const keywordIndex = wordIndexes.reduce((best, word) => word.length >= best.length ? word : best, {index: -1, length: -1}).index;
        const glare = ((frame + i * 31) % 140) / 140;
        return (
          <div key={i} style={{position: 'absolute', left: cx - colW / 2, top: y, width: colW, height: cardH, opacity: s, transform: `perspective(900px) translateX(${enterX}px) rotateY(${rotateY}deg) scale(${enterScale * breathe})`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 32px', borderRadius: 25, background: `linear-gradient(135deg, ${th.card}f2, ${th.cardAlt}e8)`, boxShadow: `0 20px 50px rgba(0,0,0,.46), 0 0 30px ${col}38, inset 0 1px 0 rgba(255,255,255,.1)`, border: `1.5px solid ${col}88`, overflow: 'hidden'}}>
            <div style={{position: 'absolute', inset: 0, background: `radial-gradient(circle at ${left ? '0%' : '100%'} 50%, ${col}25, ${col}00 58%)`}} />
            <div style={{position: 'absolute', top: '-35%', left: '-30%', width: '18%', height: '180%', opacity: 0.28, transform: `translateX(${glare * colW * 1.65}px) rotate(16deg)`, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.65), transparent)'}} />
            <div style={{position: 'relative', fontFamily: INTER, fontWeight: 700, fontSize: height * 0.021, color: th.text, textAlign: 'center', lineHeight: 1.14}}>{words.map((word, wi) => <span key={wi} style={wi === keywordIndex ? {color: col, textShadow: `0 0 12px ${col}88`} : undefined}>{word}</span>)}</div>
          </div>
        );
      })}
    </>
  );
};

// ---------- bars ----------
type BarItem = {label: string; value: number; display?: string};
const animatedDisplay = (display: string | undefined, value: number, progress: number) => {
  const source = display ?? String(value);
  const match = source.match(/-?[\d.,]+/);
  if (!match) return {text: source, numeric: false};
  const decimals = (match[0].split('.')[1] ?? '').length;
  const target = Number(match[0].replace(/,/g, ''));
  if (!Number.isFinite(target)) return {text: source, numeric: false};
  const counted = target * progress;
  const number = counted.toLocaleString('en-US', {minimumFractionDigits: decimals, maximumFractionDigits: decimals});
  return {text: source.replace(match[0], number), numeric: true};
};
export const Bars: React.FC<{items: BarItem[]; th: Theme}> = ({items, th}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const list = items.filter((it) => it && it.label).slice(0, 5);
  if (!list.length) return null;
  const vmax = Math.max(...list.map((it) => Math.abs(it.value) || 1));
  const top = height * CONTENT_TOP;
  const bottom = height * CONTENT_BOTTOM;
  const rowH = Math.min(height * 0.12, (bottom - top) / list.length);
  const barH = rowH * 0.4;
  const x0 = width * 0.1;
  const maxW = width * 0.7;
  const t = frame / fps;
  return (
    <>
      {list.map((it, i) => {
        const s = springIn(frame, fps, 10 + i * 8, {stiffness: 90, damping: 15});
        const progress = Math.max(0, Math.min(1, s));
        const y = top + i * rowH + Math.sin(t * 1.3 + i) * 3;
        const ratio = Math.abs(it.value) / vmax;
        const targetW = maxW * (0.08 + 0.92 * ratio);
        const w = targetW * progress;
        const isMax = Math.abs(it.value) === vmax;
        const pulse = (Math.sin(t * 2.2 + i) + 1) / 2;
        const glare = ((frame + i * 29) % 120) / 120;
        const shown = animatedDisplay(it.display, it.value, progress);
        return (
          <div key={i} style={{position: 'absolute', left: x0, top: y, opacity: interpolate(s, [0, 0.3], [0, 1], {extrapolateRight: 'clamp'}), transform: `translateX(${interpolate(s, [0, 1], [-45, 0])}px) scale(${1 + Math.sin(t * 1.25 + i) * 0.006})`}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 14, fontFamily: INTER, fontWeight: 700, fontSize: height * 0.021, color: th.text, marginBottom: 12}}><span style={{position: 'relative', width: 14, height: 14, borderRadius: '50%', background: isMax ? th.accent2 : th.accent, boxShadow: `0 0 ${12 + pulse * 12}px ${isMax ? th.accent2 : th.accent}`}} />{it.label}</div>
            <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
              <div style={{position: 'relative', width: Math.max(w, 3), height: barH, borderRadius: barH / 2, overflow: 'hidden', background: `linear-gradient(90deg, ${th.accent}, ${th.accent2})`, boxShadow: `0 0 ${isMax ? 28 + pulse * 12 : 20}px ${isMax ? th.accent2 : th.accent}77`, transform: `scaleY(${isMax ? 1 + pulse * 0.06 : 1})`, transformOrigin: 'left center'}}>
                <div style={{position: 'absolute', top: 0, left: '-20%', width: '16%', height: '100%', transform: `translateX(${glare * (targetW * 1.45)}px) skewX(-18deg)`, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.85), transparent)'}} />
              </div>
              <div style={{fontFamily: ANTON, fontSize: height * 0.026, color: isMax ? th.accent2 : th.text, minWidth: width * 0.13, opacity: shown.numeric ? 1 : interpolate(progress, [0.55, 1], [0, 1], {extrapolateLeft: 'clamp'})}}>{shown.text}</div>
            </div>
          </div>
        );
      })}
    </>
  );
};

// ---------- neural_net ----------
export const NeuralNet: React.FC<{spec: {layers?: number[]; in_label?: string; out_label?: string}; th: Theme}> = ({spec, th}) => {
  const frame = useCurrentFrame();
  const {fps, width, height} = useVideoConfig();
  const layers = (spec.layers && spec.layers.length >= 2 ? spec.layers : [3, 4, 4, 2]).map((n) => Math.max(1, Math.min(6, Math.round(n)))).slice(0, 5);
  const L = layers.length;
  const top = height * CONTENT_TOP + 20;
  const bottom = height * CONTENT_BOTTOM - 40;
  const x0 = width * 0.10;      // la red llenaba poco: se ensancha de 0.16→0.10
  const x1 = width * 0.90;
  const xs = layers.map((_, i) => x0 + (i * (x1 - x0)) / (L - 1));
  const r = Math.max(20, Math.min(46, (bottom - top) / (Math.max(...layers) * 2.6)));
  const pos = (li: number) => {
    const n = layers[li];
    const gap = (bottom - top) / (n + 1);
    return Array.from({length: n}, (_, k) => ({x: xs[li], y: top + gap * (k + 1)}));
  };
  const t = frame / fps;
  const alpha = (delaySec: number) => interpolate(t, [delaySec, delaySec + 0.45], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const lf = height * 0.024;   // etiquetas legibles en celular
  const waveDuration = 2.5;
  const wave = (offset: number) => ((t - 0.55 + offset + waveDuration * 10) % waveDuration) / waveDuration;
  const layerActivation = (li: number, k: number) => {
    const layerPoint = li / Math.max(1, L - 1);
    return Math.max(...[0, 0.34, 0.68].map((offset) => {
      const distance = Math.abs(wave(offset) - layerPoint);
      const wrapped = Math.min(distance, 1 - distance);
      return Math.max(0, 1 - wrapped / 0.18) * (0.86 + Math.sin(k * 2.3 + li) * 0.1);
    }));
  };
  return (
    <svg width={width} height={height} style={{position: 'absolute', inset: 0}}>
      <defs>
        <radialGradient id="node-cyan"><stop offset="0%" stopColor={th.accent} stopOpacity=".8"/><stop offset="48%" stopColor={th.accent} stopOpacity=".22"/><stop offset="100%" stopColor={th.accent} stopOpacity="0"/></radialGradient>
        <radialGradient id="node-magenta"><stop offset="0%" stopColor={th.accent2} stopOpacity=".8"/><stop offset="48%" stopColor={th.accent2} stopOpacity=".22"/><stop offset="100%" stopColor={th.accent2} stopOpacity="0"/></radialGradient>
      </defs>
      {Array.from({length: L - 1}, (_, li) => {
        const a = alpha(0.4 + (li + 1) * 0.45);
        if (a <= 0) return null;
        return pos(li).map((p1, ai) =>
          pos(li + 1).map((p2, bi) => {
            const segmentStart = li / (L - 1);
            const segmentEnd = (li + 1) / (L - 1);
            const pulses = [0, 0.34, 0.68].map((offset) => wave(offset));
            const nearest = Math.max(...pulses.map((p) => p >= segmentStart && p <= segmentEnd ? 1 - Math.abs(p - (segmentStart + segmentEnd) / 2) / (segmentEnd - segmentStart) : 0));
            return <g key={`${li}-${ai}-${bi}`}>
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={th.muted} strokeWidth={1.5} opacity={0.16 * a} />
              <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={li === L - 2 ? th.accent2 : th.accent} strokeWidth={2.5 + nearest * 1.5} opacity={nearest * 0.62 * a} />
              {pulses.map((p, pi) => {
                if (p < segmentStart || p > segmentEnd) return null;
                const local = (p - segmentStart) / (segmentEnd - segmentStart);
                const px = p1.x + (p2.x - p1.x) * local;
                const py = p1.y + (p2.y - p1.y) * local;
                const color = li === L - 2 ? th.accent2 : th.accent;
                return <g key={pi}><circle cx={px} cy={py} r={11} fill={color} opacity={0.13}/><circle cx={px} cy={py} r={4.5} fill="#FFFFFF" opacity={0.9} stroke={color} strokeWidth={2}/></g>;
              })}
            </g>;
          })
        );
      })}
      {Array.from({length: L}, (_, li) => {
        const a = alpha(0.4 + li * 0.45);
        if (a <= 0) return null;
        return pos(li).map((p, k) => (
          <g key={`${li}-${k}`}>
            {(() => {
              const hot = layerActivation(li, k);
              const edgeColor = li === 0 ? th.accent : li === L - 1 ? th.accent2 : (hot > 0.3 ? th.accent : th.muted);
              const aura = 0.14 + (Math.sin(t * 1.7 + li + k) + 1) * 0.04 + hot * 0.28;
              return <>
                <circle cx={p.x} cy={p.y} r={r * (1.75 + hot * 0.5)} fill={li === L - 1 ? 'url(#node-magenta)' : 'url(#node-cyan)'} opacity={aura * a} />
                <circle cx={p.x} cy={p.y} r={r * (1 + hot * 0.12)} fill={hot > 0.18 ? edgeColor : th.card} stroke={edgeColor} strokeWidth={2.5 + hot * 1.5} opacity={a} />
                <circle cx={p.x - r * 0.28} cy={p.y - r * 0.3} r={r * 0.18} fill="#FFFFFF" opacity={(0.24 + hot * 0.45) * a} />
              </>;
            })()}
          </g>
        ));
      })}
      {spec.in_label && <text x={width * 0.06} y={bottom + 46} fill={th.accent} fontFamily={INTER} fontWeight={700} fontSize={lf} textAnchor="start" opacity={alpha(0.5)} stroke={th.bgBottom} strokeWidth={3} paintOrder="stroke">{spec.in_label}</text>}
      {spec.out_label && <text x={width * 0.94} y={bottom + 46} fill={th.accent2} fontFamily={INTER} fontWeight={700} fontSize={lf} textAnchor="end" opacity={alpha(0.5)} stroke={th.bgBottom} strokeWidth={3} paintOrder="stroke">{spec.out_label}</text>}
    </svg>
  );
};

// ---------- big_text ----------
export const BigText: React.FC<{items: string[]; th: Theme}> = ({items, th}) => {
  const frame = useCurrentFrame();
  const {fps, width, height, durationInFrames} = useVideoConfig();
  const list = items.slice(0, 3);
  if (!list.length) return null;
  const slot = Math.max(fps * 0.8, (durationInFrames * 0.92) / list.length);
  const idx = Math.min(Math.floor(frame / slot), list.length - 1);
  const local = frame - idx * slot;
  const s = spring({frame: local, fps, config: {damping: 12, stiffness: 120, mass: 0.6}});
  const op = interpolate(local, [0, 4], [0, 1], {extrapolateRight: 'clamp'});
  const words = list[idx].split(' ');
  const last = words[words.length - 1];
  const ty = interpolate(s, [0, 1], [55, 0]);
  return (
    <div style={{position: 'absolute', top: 0, left: 0, width, height: height * 0.72, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8%'}}>
      <div style={{transform: `translateY(${ty}px)`, opacity: op, textAlign: 'center', fontFamily: ANTON, fontSize: height * 0.072, lineHeight: 1.14, textTransform: 'uppercase', color: th.text, textShadow: `0 0 50px ${th.accent}66`}}>
        {words.map((w, i) => (
          <span key={i} style={{color: w === last ? th.accent2 : th.text}}>{w}{' '}</span>
        ))}
      </div>
    </div>
  );
};
