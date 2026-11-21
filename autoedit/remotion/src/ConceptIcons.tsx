import React from 'react';
import {Theme} from './theme';

export type ConceptIconProps = {th: Theme; size: number; frame: number; fps: number};
export type ConceptIcon = React.FC<ConceptIconProps>;

const cycle = (frame: number, fps: number, seconds: number, offset = 0) =>
  ((frame / fps + offset) % seconds) / seconds;
const pulse = (frame: number, fps: number, offset = 0) =>
  (Math.sin((frame / fps) * Math.PI * 1.35 + offset) + 1) / 2;

const IconFrame: React.FC<ConceptIconProps & {children: React.ReactNode}> = ({th, size, frame, fps, children}) => {
  const p = pulse(frame, fps);
  return <div style={{position: 'relative', width: size, height: size, flexShrink: 0}}>
    <div style={{position: 'absolute', inset: -size * 0.2, borderRadius: '50%', opacity: 0.38 + p * 0.22, transform: `scale(${0.9 + p * 0.1})`, background: `radial-gradient(circle, ${th.accent}55 0%, ${th.accent2}22 42%, ${th.accent}00 72%)`}} />
    <svg viewBox="0 0 120 120" width={size} height={size} style={{position: 'relative', overflow: 'visible'}}>
      <defs><linearGradient id="concept-gradient" x1="0" y1="0" x2="1" y2="1"><stop stopColor={th.accent}/><stop offset="1" stopColor={th.accent2}/></linearGradient></defs>
      {children}
    </svg>
  </div>;
};
const common = (th: Theme) => ({fill: 'none', stroke: th.accent, strokeWidth: 4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const});

export const IconData: ConceptIcon = (p) => {
  const q = cycle(p.frame, p.fps, 2.4);
  return <IconFrame {...p}><g {...common(p.th)}><path d="M31 59v30c0 8 58 8 58 0V59"/><ellipse cx="60" cy="59" rx="29" ry="10"/><path d="M31 74c0 8 58 8 58 0"/></g>{[0,.33,.66].map((o,i)=>{const y=12+(((q+o)%1)*42); return <g key={i}><rect x={43+i*8} y={y} width="11" height="8" rx="2" fill={i%2?p.th.accent2:p.th.accent} opacity={.45+q*.45}/><line x1={48+i*8} y1={y+9} x2={48+i*8} y2={y+16} stroke={p.th.accent} opacity=".35"/></g>})}</IconFrame>;
};

export const IconGpu: ConceptIcon = (p) => {
  const step = Math.floor((p.frame / p.fps * 5) % 9);
  return <IconFrame {...p}><g {...common(p.th)}><rect x="24" y="24" width="72" height="72" rx="10"/><rect x="37" y="37" width="46" height="46" rx="5"/>{[18,30,42,54,66,78,90,102].map((v,i)=><line key={i} x1={i<4?v+12:i>3?24:v} y1={i<4?18:i>3?102:v} x2={i<4?v+12:i>3?18:v} y2={i<4?24:i>3?96:v}/>)}</g>{Array.from({length:9},(_,i)=><rect key={i} x={42+(i%3)*13} y={42+Math.floor(i/3)*13} width="9" height="9" rx="2" fill={i===step?p.th.accent2:p.th.accent} opacity={i===step?1:.28} stroke={p.th.accent} strokeWidth="1"/>)}</IconFrame>;
};

export const IconCode: ConceptIcon = (p) => {
  const typed = Math.floor(cycle(p.frame,p.fps,3)*4);
  return <IconFrame {...p}><g {...common(p.th)}><path d="M32 25c-9 0-9 8-9 16v8c0 7-5 10-10 11 5 1 10 4 10 11v8c0 8 0 16 9 16M88 25c9 0 9 8 9 16v8c0 7 5 10 10 11-5 1-10 4-10 11v8c0 8 0 16-9 16"/></g>{[0,1,2].map(i=><line key={i} x1="40" y1={43+i*18} x2={40+(i<typed?34-(i%2)*9:0)} y2={43+i*18} stroke={i===1?p.th.accent2:p.th.accent} strokeWidth="5" strokeLinecap="round"/>)}<rect x={42+(typed===3?32:0)} y="75" width="3" height="11" fill={p.th.text} opacity={Math.floor(p.frame/(p.fps*.45))%2}/></IconFrame>;
};

export const IconBrain: ConceptIcon = (p) => {
  const q=cycle(p.frame,p.fps,2.8);
  const nodes=[[60,57],[35,34],[84,31],[27,77],[91,82],[59,96]];
  return <IconFrame {...p}><g stroke={p.th.accent} strokeWidth="3" fill="none">{nodes.slice(1).map((n,i)=><line key={i} x1="60" y1="57" x2={n[0]} y2={n[1]}/>)}</g>{nodes.map((n,i)=><g key={i}><circle cx={n[0]} cy={n[1]} r={i?7:11} fill={i%2?p.th.accent2:p.th.accent} opacity=".22"/><circle cx={n[0]} cy={n[1]} r={i?3.5:5} fill={i%2?p.th.accent2:p.th.accent}/></g>)}{nodes.slice(1).map((n,i)=>{const z=(q+i*.17)%1;return <circle key={i} cx={60+(n[0]-60)*z} cy={57+(n[1]-57)*z} r="3" fill={p.th.text}/>})}</IconFrame>;
};

export const IconNetwork: ConceptIcon = (p) => {
  const q=cycle(p.frame,p.fps,3); const ns=[[22,61],[48,25],[91,35],[99,82],[55,96]]; const es=[[0,1],[1,2],[2,3],[3,4],[4,0],[1,3]];
  return <IconFrame {...p}>{es.map((e,i)=>{const a=ns[e[0]],b=ns[e[1]],z=(q+i*.19)%1;return <g key={i}><line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={p.th.muted} strokeWidth="2" opacity=".55"/><circle cx={a[0]+(b[0]-a[0])*z} cy={a[1]+(b[1]-a[1])*z} r="3.5" fill={i%2?p.th.accent2:p.th.accent}/></g>})}{ns.map((n,i)=><circle key={i} cx={n[0]} cy={n[1]} r="7" fill={p.th.card} stroke={i%2?p.th.accent2:p.th.accent} strokeWidth="4"/>)}</IconFrame>;
};

export const IconClock: ConceptIcon = (p) => {const a=(p.frame/p.fps)*2.5;return <IconFrame {...p}><circle cx="60" cy="61" r="40" {...common(p.th)}/><path d="M36 21h48M45 15h30" {...common(p.th)}/>{Array.from({length:8},(_,i)=>{const z=i*Math.PI/4;return <line key={i} x1={60+32*Math.cos(z)} y1={61+32*Math.sin(z)} x2={60+37*Math.cos(z)} y2={61+37*Math.sin(z)} stroke={p.th.accent2} strokeWidth="3"/>})}<line x1="60" y1="61" x2={60+27*Math.cos(a)} y2={61+27*Math.sin(a)} stroke={p.th.text} strokeWidth="5" strokeLinecap="round"/><circle cx="60" cy="61" r="6" fill={p.th.accent2}/></IconFrame>};

export const IconMoney: ConceptIcon = (p) => {const q=cycle(p.frame,p.fps,2.5);return <IconFrame {...p}><g {...common(p.th)}><rect x="20" y="37" width="67" height="43" rx="6"/><circle cx="54" cy="58" r="12"/><path d="M25 47c6 0 9-3 9-6M82 70c-6 0-9 3-9 6"/></g><text x="54" y="65" textAnchor="middle" fontSize="20" fontWeight="800" fill={p.th.accent2}>$</text><g transform={`translate(0 ${10-q*22})`} opacity={Math.sin(q*Math.PI)}><line x1="95" y1="58" x2="95" y2="76" stroke={p.th.accent} strokeWidth="5"/><line x1="86" y1="67" x2="104" y2="67" stroke={p.th.accent} strokeWidth="5"/></g><ellipse cx="72" cy="91" rx="18" ry="6" fill={p.th.accent2} opacity=".35"/><path d="M54 86c0 8 36 8 36 0" stroke={p.th.accent2} strokeWidth="4" fill="none"/></IconFrame>};

export const IconRobot: ConceptIcon = (p) => {const b=pulse(p.frame,p.fps);return <IconFrame {...p}><g {...common(p.th)}><rect x="24" y="37" width="72" height="56" rx="15"/><line x1="60" y1="37" x2="60" y2="22"/><circle cx="60" cy="18" r={5+b*3} fill={p.th.accent2}/><path d="M42 76q18 12 36 0"/></g><rect x="37" y="52" width="14" height="10" rx="5" fill={p.th.accent}/><rect x="69" y="52" width="14" height="10" rx="5" fill={p.th.accent2}/></IconFrame>};

export const IconChart: ConceptIcon = (p) => {const q=(Math.sin(p.frame/p.fps*1.3)+1)/2;return <IconFrame {...p}><g {...common(p.th)}><path d="M20 96V22M20 96h82"/><path d="M28 69l22-20 18 9 29-32"/><path d="M83 25h15v15"/></g>{[0,1,2,3].map((i)=><rect key={i} x={31+i*17} y={88-(18+i*9)*(.72+q*.28)} width="10" height={(18+i*9)*(.72+q*.28)} rx="2" fill={i%2?p.th.accent2:p.th.accent} opacity=".65"/>)}</IconFrame>};

export const IconLock: ConceptIcon = (p) => {const a=p.frame/p.fps*28;return <IconFrame {...p}><circle cx="60" cy="61" r="49" fill="none" stroke={p.th.accent2} strokeWidth="2" strokeDasharray="10 8" transform={`rotate(${a} 60 61)`}/><path d="M35 51h50v44H35zM45 51V39c0-20 30-20 30 0v12" {...common(p.th)}/><circle cx="60" cy="70" r="6" fill={p.th.accent2}/><line x1="60" y1="75" x2="60" y2="84" stroke={p.th.accent2} strokeWidth="5"/></IconFrame>};

export const IconCloud: ConceptIcon = (p) => {const q=cycle(p.frame,p.fps,2.8);return <IconFrame {...p}><path d="M30 76h59c20 0 20-29 2-31-5-24-39-29-49-8-22-3-29 30-12 39z" {...common(p.th)}/>{[0,.5].map((o,i)=>{const z=(q+o)%1;return <g key={i} opacity={Math.sin(z*Math.PI)}><line x1={48+i*23} y1={92-z*39} x2={48+i*23} y2={100-z*39} stroke={i?p.th.accent2:p.th.accent} strokeWidth="4"/><path d={i?'M42 93l6 7 6-7':'M65 99l6-7 6 7'} fill="none" stroke={i?p.th.accent:p.th.accent2} strokeWidth="4"/></g>})}</IconFrame>};

export const IconSpark: ConceptIcon = (p) => {const b=pulse(p.frame,p.fps);return <IconFrame {...p}><path d="M60 15c5 27 10 35 35 40-25 5-30 14-35 42-5-28-10-37-35-42 25-5 30-13 35-40z" fill="url(#concept-gradient)" stroke={p.th.text} strokeWidth="2" transform={`translate(60 55) scale(${.8+b*.16}) translate(-60 -55)`}/>{[[25,25],[96,22],[98,91],[24,94]].map((n,i)=><path key={i} d={`M${n[0]} ${n[1]-7}v14M${n[0]-7} ${n[1]}h14`} stroke={i%2?p.th.accent2:p.th.accent} strokeWidth="3" opacity={.3+((b+i*.31)%1)*.7}/>)}</IconFrame>};

export const IconLayers: ConceptIcon = (p) => {const q=Math.sin(p.frame/p.fps*1.4);return <IconFrame {...p}>{[2,1,0].map((i)=><path key={i} d="M16 46l44-23 44 23-44 23z" fill={i===0?p.th.card:'none'} stroke={i%2?p.th.accent2:p.th.accent} strokeWidth="4" transform={`translate(0 ${i*17+q*i*2})`} opacity={1-i*.18}/>)}</IconFrame>};

export const IconEye: ConceptIcon = (p) => {const b=pulse(p.frame,p.fps), scan=cycle(p.frame,p.fps,2.4);return <IconFrame {...p}><path d="M10 60q50-48 100 0-50 48-100 0z" {...common(p.th)}/><circle cx="60" cy="60" r={13+b*5} fill={p.th.card} stroke={p.th.accent2} strokeWidth="4"/><circle cx="60" cy="60" r={5+b*2} fill={p.th.text}/><line x1={20+scan*80} y1="35" x2={20+scan*80} y2="85" stroke={p.th.accent} strokeWidth="2" opacity=".7"/></IconFrame>};

const normalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const mappings: Array<[RegExp, ConceptIcon]> = [
  [/dato|data/,IconData],[/gpu|chip|paralelo|hardware/,IconGpu],[/software|codigo|code|programa|libreria|pytorch|python/,IconCode],
  [/neurona|cerebro|perceptr/,IconBrain],[/red|network|conex/,IconNetwork],[/tiempo|rapido|veloc|hora|segundo/,IconClock],
  [/dinero|costo|precio|ahorr|venta|\$/,IconMoney],[/crece|crecimiento|aumenta|sube|escala/,IconChart],[/seguridad|privac|riesgo|protege|candado/,IconLock],
  [/nube|cloud/,IconCloud],[/crea|genera|inventa|magia|arte/,IconSpark],[/modelo|capa|arquitect|llm|gpt/,IconLayers],
  [/vision|imagen|\bve\b|detecta|reconoce/,IconEye],[/robot|agente|maquina|\bia\b/,IconRobot],
];
export const resolveIcon = (text: string): ConceptIcon | null => {
  const value=normalize(text);
  return mappings.find(([pattern])=>pattern.test(value))?.[1] ?? null;
};
