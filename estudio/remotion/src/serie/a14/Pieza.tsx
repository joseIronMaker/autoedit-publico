// Serie 2, capítulo 14: las llaves. La mesa de la serie con tres cosas de papel encima: a la izquierda un buzón (por su
// ranura entran correos de extraños), a la derecha un fichero (el cajón de tus contactos) y al fondo una puerta (la
// salida). Tu mano blanca no le da a la bola un corazón de papel: le da un llavero. Cada llave abre una cosa. Con una o
// dos no pasa nada: el papelito de un extraño agarra una tarjeta y se estrella contra la puerta cerrada. Con las tres se
// cierra un lazo rojo y la tarjeta de mamá sale por la puerta. Suben las barandillas: una baranda alrededor de la mesa,
// un filtro en la ranura y otro en la puerta, un calendario que se ve y no se borra, una caja de vidrio que se traga el
// desastre y la tarjeta «¿pago?». Luego se forman en fila entre la bola y la puerta, con los huecos en distintos sitios:
// lo que pasa una lo para la siguiente. La última es tu mano con dos botones; con la costumbre aprieta «sí» sin mirar y
// acaba poniéndole cinta. El último papelito sale por la puerta que dejaste abierta tú, no la bola.
// Todos los instantes vienen de eventos.json, que escribe partitura.py: dibujo y sonido son los mismos números.
import React from "react";
import { azar, Cam, camara, clamp, ease, guionCamara, lerp, prog, resorte, smooth, texto, Vista } from "../../kit";
import { ACENTO, bola, cue, Lienzo, mono, PAPEL, rotulo, serif, sombra, TINTA } from "../../marca";
import { brazo } from "../../personaje";
import palabras from "./palabras.json";
import duracion from "./duracion.json";
import ev from "./eventos.json";

export const DURACION = duracion.dur;
const T = cue(palabras);
const s = (f: string, d = 0) => T(f, d).s;
type C = CanvasRenderingContext2D;
type P3 = [number, number, number];
type Pt = { x: number; y: number; s: number; zc: number };

const t0 = {
  confianza: s("confianza"), llaves: s("llaves"), tres: s("tres llaves"), nunca: s("nunca"), nombre: s("simon"), trifecta: s("la trifecta"),
  primera: s("primera"), datos: s("datos privados"), segunda: s("segunda"), contenido: s("contenido"), tercera: s("tercera"), hacia: s("hacia"),
  unaodos: s("con una o dos"), manejable: s("manejable"), lastres1: s("las tres"), simple: s("un simple"), sacar: s("sacar"), agente: s("tu agente"),
  lastres: s("las tres", T("ahí están").i), guard: s("guardrails"), baran: s("las barandillas"), filtros: s("filtros"), entra: s("lo que entra"), sale: s("lo que sale"),
  permisos: s("permisos"), ver: s("ver"), pero: s("pero no"), borrar: s("borrarlo"), caja: s("una caja"), nosalga: s("no salga"), simple2: s("lo más simple"),
  ninguna: s("ninguna"), ponen: s("se ponen"), unatras: s("una tras"), trampa: s("una trampa"), anthropic: s("anthropic"), doble: s("doble"),
  norompe: s("no se rompe"), serompe: s("se rompe cuando te"), cansas: s("te cansas"),
};

// ---------- herramientas ----------
let FR = 0;
let K: Cam;
const frac = (x: number) => x - Math.floor(x);
const tiembla = (j: number) => frac(Math.sin(j * 12.9898 + FR * 78.233) * 43758.5453) - .5;
const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * 6.2832 + f);
const ventana = (t: number, a: number, b: number, fi = .25, fo = .3) => smooth(prog(t, a, a + fi)) * (1 - smooth(prog(t, b, b + fo)));
const L3 = (a: P3, b: P3, k: number): P3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const Pv = (v: P3): Pt | null => K.p(v[0], v[1], v[2]);
const esc = (v: P3) => (Pv(v)?.s ?? 110) / 110;
const mezcla = (a: string, b: string, k: number) => {
  const h = (x: string) => [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16));
  const A = h(a), B = h(b);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], clamp(k)))).join(",")})`;
};

function poli(c: C, Q: P3[], fill?: string | CanvasGradient | null, tinta: string | null = TINTA, g = 3, vib = 1) {
  c.beginPath();
  for (let i = 0; i < Q.length; i++) {
    const q = Pv(Q[i]); if (!q) return;
    const j = Q[i][0] * 3.1 + Q[i][1] * 5.7 + Q[i][2] * 2.3;
    const x = q.x + tiembla(j) * vib, y = q.y + tiembla(j + 40) * vib;
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (tinta) { c.strokeStyle = tinta; c.lineWidth = g; c.lineJoin = "round"; c.stroke(); }
}
function lin(c: C, a: P3, b: P3, g: number, color = TINTA) {
  const A = Pv(a), B = Pv(b); if (!A || !B) return;
  c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round"; c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke();
}
/** Dibuja en unidades locales (100 = 1 unidad de mundo) sobre un plano: o es la esquina, ux y vy los ejes de 1 unidad. */
function plano(c: C, o: P3, ux: P3, vy: P3, f: () => void) {
  const a = Pv(o), b = Pv([o[0] + ux[0], o[1] + ux[1], o[2] + ux[2]]), d = Pv([o[0] + vy[0], o[1] + vy[1], o[2] + vy[2]]);
  if (!a || !b || !d) return;
  c.save(); c.transform((b.x - a.x) / 100, (b.y - a.y) / 100, (d.x - a.x) / 100, (d.y - a.y) / 100, a.x, a.y); f(); c.restore();
}
type Clave = [number, number, P3 | ((t: number) => P3), ((x: number) => number)?];
function ruta(t: number, ini: P3, S: Clave[]): P3 {
  let v: P3 = [...ini];
  for (const [a, b, q, f] of S) {
    if (t <= a) break;
    const Q = typeof q === "function" ? q(t) : q;
    v = L3(v, Q, (f ?? ease.inOutCubic)(prog(t, a, b)));
  }
  return v;
}

// ---------- el mundo (unidades de mesa; x a la derecha, y hacia el fondo, z hacia arriba) ----------
const KRAFT = "#CFBC98", CANTO = "#9C8560", BLANCO = "#FDFCF8", CARTON = "#ECE6D7", CARTON_T = "#F4F0E6", CARTON_L = "#DCD4C1", ROJO = "#E9896C", CINTA = "#E4D6B4";
const W = 4.4, H = 4.6, GT = .34, PISO = -5.4;
const BX = 0, BY = -2.2, RB = .95;
const BZN = { x0: -3.45, x1: -1.95, y0: .6, y1: 1.8, z1: 1.6 };
const FCH = { x0: 1.85, x1: 3.55, y0: .5, y1: 1.9, z1: 1.3 };
const DR = { x0: 2.0, x1: 3.4, z0: .12, z1: 1.1, largo: 1.3, sale: 1.05 };
const PTA = { x0: -.8, x1: .8, y: 3.7, z1: 2.7 };
const RANURA: P3 = [-2.7, BZN.y0, 1.08];
const CER_B: P3 = [-2.7, BZN.y0 - .03, .5];
const XA = -.8, XB = .7, XC = .05, YC = [-.6, .6, 1.8, 3.0], Y0 = -1.1, YPUERTA = 3.75, VEL = 4.5;
const AW = .24, AH = .56, PW = 1.45, PH = 1.25, GW = .34, GH = .82;
const SI: P3 = [.81, YC[3] - .1, .72], NO: P3 = [1.23, YC[3] - .1, .72];

const sacaCajon = (t: number) => DR.sale * ease.outCubic(prog(t, ev.cajon, ev.cajon + .45));
const cerFichero = (t: number): P3 => [2.7, FCH.y0 - sacaCajon(t) - .03, .45];
function angPuerta(t: number) {
  if (t >= ev.abre2) return 1.62 * ease.outBack(prog(t, ev.abre2, ev.abre2 + .6), 1.3);
  if (t >= ev.cierra - .14) { const k = prog(t, ev.cierra - .14, ev.cierra); return 1.55 * (1 - k * k) + (t > ev.cierra ? .06 * Math.exp(-(t - ev.cierra) * 9) * Math.abs(Math.sin((t - ev.cierra) * 30)) : 0); }
  if (t >= ev.puerta) return 1.55 * ease.outBack(prog(t, ev.puerta, ev.puerta + .75), 1.2);
  return 0;
}
/** Un punto de la hoja de la puerta: u = distancia desde la bisagra (derecha), z = altura. */
function enHoja(t: number, u: number, z: number): P3 {
  const a = angPuerta(t);
  return [PTA.x1 - u * Math.cos(a), PTA.y - u * Math.sin(a), z];
}
const cerPuerta = (t: number) => { const p = enHoja(t, 1.3, 1.25); return [p[0], p[1] - .04, p[2]] as P3; };
const tapaBuzon = (t: number) => ease.outBack(prog(t, ev.tapa, ev.tapa + .3), 1.6);

// ---------- el lazo rojo: buzón → bola → fichero → puerta → afuera → buzón ----------
const RUTA: [number, number][] = [[-2.7, .42], [-2.2, -.5], [-1.2, -1.0], [0, -1.15], [1.2, -.85], [2.1, -.78], [2.7, -.75], [1.9, -.1],
  [1.2, 1.15], [.5, 2.65], [0, 3.35], [0, 3.95], [-.7, 4.3], [-1.9, 4.3], [-2.7, 3.45], [-2.7, 2.0]];
const IB = 3, IF = 6, IP = 10, IA = 11;
const RM: { x: number; y: number; u: number }[] = [];
const UI: number[] = [];
{
  const n = RUTA.length, pts: [number, number, number][] = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = RUTA[Math.max(i - 1, 0)], p1 = RUTA[i], p2 = RUTA[i + 1], p3 = RUTA[Math.min(i + 2, n - 1)];
    UI[i] = pts.length;
    for (let k = 0; k < 12; k++) {
      const u = k / 12, u2 = u * u, u3 = u2 * u;
      const f = (a: number, b: number, c2: number, d: number) => .5 * (2 * b + (-a + c2) * u + (2 * a - 5 * b + 4 * c2 - d) * u2 + (-a + 3 * b - 3 * c2 + d) * u3);
      pts.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1]), i]);
    }
  }
  UI[n - 1] = pts.length;
  pts.push([RUTA[n - 1][0], RUTA[n - 1][1], n - 1]);
  let L = 0;
  pts.forEach((p, i) => { if (i) L += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]); RM.push({ x: p[0], y: p[1], u: L }); });
  RM.forEach((p) => (p.u /= L));
}
const U = (i: number) => RM[UI[i]].u;
function enRuta(u: number): [number, number] {
  const k = clamp(u);
  let i = 1; while (i < RM.length - 1 && RM[i].u < k) i++;
  const a = RM[i - 1], b = RM[i], f = (k - a.u) / Math.max(b.u - a.u, 1e-6);
  return [lerp(a.x, b.x, f), lerp(a.y, b.y, f)];
}
function trazoRuta(c: C, u0: number, u1: number, color: string, g: number, dash: number[], off = 0, z = .03) {
  c.beginPath(); let ini = false;
  for (const p of RM) {
    if (p.u < u0 || p.u > u1) continue;
    const q = Pv([p.x, p.y, z]); if (!q) { ini = false; continue; }
    if (!ini) { c.moveTo(q.x, q.y); ini = true; } else c.lineTo(q.x, q.y);
  }
  const [x, y] = enRuta(u1), q = Pv([x, y, z]); if (q && ini) c.lineTo(q.x, q.y);
  c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round"; c.lineJoin = "round"; c.setLineDash(dash); c.lineDashOffset = off; c.stroke(); c.setLineDash([]);
}

// ---------- cámara ----------
const V: Record<string, Vista> = {
  cerca0: { tx: .85, ty: -2.45, tz: 1.95, yaw: .32, pitch: .16, dist: 7.8 },
  cerca: { tx: .62, ty: -2.45, tz: 1.75, yaw: .1, pitch: .24, dist: 5.4 },
  mesa: { tx: 0, ty: .3, tz: .3, yaw: 0, pitch: .76, dist: 10.8 },
  fichero: { tx: 1.85, ty: -.45, tz: .7, yaw: -.3, pitch: .55, dist: 6.8 },
  buzon: { tx: -2.15, ty: -.3, tz: .8, yaw: .3, pitch: .55, dist: 6.8 },
  puerta: { tx: 0, ty: 1.2, tz: 1.0, yaw: 0, pitch: .6, dist: 8.4 },
  alta: { tx: 0, ty: .1, tz: 0, yaw: 0, pitch: .95, dist: 12.2 },
  buzon2: { tx: -2.45, ty: .2, tz: .7, yaw: -.42, pitch: .55, dist: 6.2 },
  puerta2: { tx: .1, ty: 2.5, tz: 1.0, yaw: -.1, pitch: .72, dist: 7.4 },
  cal: { tx: -1.15, ty: -1.85, tz: .9, yaw: .08, pitch: .5, dist: 6.3 },
  bola: { tx: 0, ty: -2.2, tz: 1.15, yaw: 0, pitch: .5, dist: 7.8 },
  pago: { tx: .25, ty: -2.3, tz: 1.7, yaw: -.06, pitch: .42, dist: 8.0 },
  fila: { tx: .15, ty: .85, tz: .3, yaw: -.12, pitch: 1.0, dist: 10.4 },
  reja: { tx: .45, ty: 2.85, tz: .92, yaw: -.12, pitch: .8, dist: 5.6 },
  fila2: { tx: .15, ty: .9, tz: .3, yaw: -.08, pitch: 1.0, dist: 10.6 },
  fin: { tx: .4, ty: 2.8, tz: .6, yaw: -.1, pitch: .78, dist: 5.4 },
};
const CL = [
  { t: 0, v: V.cerca0 }, { t: .01, dur: 3.0, v: V.cerca, curva: ease.outCubic }, { t: ev.sube, dur: 2.3, v: V.mesa }, { t: ev.k1 - 1.15, dur: 1.0, v: V.fichero },
  { t: ev.toss[0] - .25, dur: 1.0, v: V.buzon }, { t: ev.k3 - 1.0, dur: 1.0, v: V.puerta }, { t: ev.quita - .45, dur: 1.2, v: V.mesa },
  { t: ev.barandas - .35, dur: 1.4, v: V.alta }, { t: ev.filtroE - .45, dur: .75, v: V.buzon2 }, { t: ev.filtroS - .12, dur: .6, v: V.puerta2 },
  { t: ev.calendario - .45, dur: .85, v: V.cal }, { t: ev.caja - .75, dur: .8, v: V.bola }, { t: ev.pago - .9, dur: 1.0, v: V.pago },
  { t: ev.giro, dur: 1.5, v: V.fila }, { t: ev.trampa - .35, dur: 1.2, v: V.reja }, { t: ev.seguridad - .2, dur: 1.4, v: V.fila2 },
  { t: ev.final - .25, dur: 4.2, v: V.fin, curva: smooth },
];
const GOLPES: [number, number][] = [[ev.aterriza, .35], [ev.cierra, .7], [ev.choca, .3], [ev.caja, .9], [ev.topa.a, .25], [ev.topa.b, .25], [ev.topa.c, .3], [ev.cinta, .45], [ev.topaF, .3], [ev.tres, .3]];
function sacude(t: number) {
  let x = 0, y = 0;
  for (const [ti, a] of GOLPES) {
    const d = t - ti; if (d < 0 || d > 1) continue;
    const e0 = a * Math.exp(-d * 8.5);
    x += e0 * 12 * Math.sin(d * 71); y += e0 * 14 * Math.cos(d * 57);
  }
  return { x, y };
}
function camaraDe(t: number) {
  const v = guionCamara(t, CL);
  const r: Vista = { ...v, yaw: v.yaw + .02 * vaiven(t, 7.3), pitch: v.pitch + .016 * vaiven(t, 9.1, 1), dist: v.dist * (1 + .022 * vaiven(t, 6.1, 2)), tx: v.tx + .1 * vaiven(t, 8.3), ty: v.ty + .08 * vaiven(t, 5.3, 1), tz: v.tz + .05 * vaiven(t, 6.7, 2) };
  return camara(r, 540, 1070, 1250);
}

// ---------- las manos de la bola ----------
const R1: P3 = [-1.05, -2.4, .45], R2: P3 = [.95, -2.6, 2.05], R2b: P3 = [1.2, -2.65, 1.55];
function mano2(t: number): P3 {
  const S: Clave[] = [
    [.25, 1.7, [1.15, -2.62, 2.42]], [ev.tacha - .05, ev.cuelga - .1, R2, ease.outCubic],
    [ev.cae - .1, ev.aterriza, [.95, -2.6, 1.9]], [ev.aterriza, ev.aterriza + .45, R2, ease.outBack],
    [ev.sube + .2, ev.sube + 1.8, R2b],
    [ev.k1 - .6, ev.k1 - .08, cerFichero], [ev.cajon + .6, ev.mama + .4, R2b],
    [ev.toss[0] - .3, ev.toss[0], [.35, -2.95, 1.75]], [ev.toss[0] + .05, ev.toss[0] + .4, R2b],
    [ev.toss[1] - .05, ev.toss[1] + .28, [.4, -2.95, 1.75]], [ev.toss[1] + .32, ev.toss[1] + .7, R2b],
    [ev.k3 - .62, ev.k3 - .08, cerPuerta], [ev.puerta + .4, ev.puerta + .95, R2b],
    [ev.quita - .5, ev.quita - .12, [1.65, -2.6, 1.85]], [ev.quita + .3, ev.quita + .7, R2b],
    [ev.devuelve - .5, ev.devuelve - .12, [1.65, -2.6, 1.85]], [ev.devuelve + .3, ev.devuelve + .7, R2b],
    [ev.lee - .15, ev.lee + .25, [2.65, -.25, .85]], [ev.lee + .32, ev.lee + .75, [.8, -3.0, 1.75]], [ev.etqC + .6, ev.etqC + 1.0, R2b],
    [ev.tres - .25, ev.tres + .05, [1.05, -2.65, 2.25], ease.outBack], [ev.tres + .5, ev.tres + 1.0, R2b],
  ];
  const p = ruta(t, R2, S);
  const r = .05 * (t < ev.sube ? 1 : .6);
  return [p[0] + r * vaiven(t, 1.9), p[1], p[2] + r * vaiven(t, 1.3, 1)];
}
const LANZA: [number, number][] = [[ev.lanza.a0, XC], [ev.lanza.a, XA], [ev.lanza.b, XB], [ev.lanza.c, XC], [ev.falla, XA], [ev.final, XC]];
function mano1(t: number): P3 {
  const S: Clave[] = [
    [ev.toss[0] - .1, ev.toss[0] + .3, [-.35, -2.95, 1.75]], [ev.toss[0] + .35, ev.k2 - .08, CER_B], [ev.k2 + .25, ev.toss[1] - .05, [-.3, -2.95, 1.75]],
    [ev.toss[1] + .15, ev.toss[1] + .5, R1],
    [ev.avion - .55, ev.avion - .15, [-.5, -2.4, 1.95]], [ev.avion - .12, ev.avion + .12, [-.2, -1.55, 2.15], ease.outCubic], [ev.avion + .4, ev.avion + .8, R1],
    [ev.recibe[0] - .55, ev.recibe[0] - .12, [-2.5, -.1, .72]], [ev.recibe[2] + .45, ev.envia - .25, [-.5, -2.4, 1.95]],
    [ev.envia - .12, ev.envia + .12, [-.2, -1.55, 2.15], ease.outCubic], [ev.envia + .4, ev.envia + .8, R1],
    [ev.ver - .5, ev.ver - .05, [-1.95, -2.1, 1.35]], [ev.palomita + .3, ev.goma - .2, [-1.25, -2.7, 1.3]],
    [ev.goma - .15, ev.candado - .02, [-2.05, -2.05, .95]], [ev.candado + .02, ev.candado + .22, [-1.2, -2.75, 1.3], ease.outCubic], [ev.candado + .5, ev.caja - .6, R1],
    [ev.tinta - .65, ev.tinta - .15, [-.6, -2.8, 1.45]], [ev.tinta - .12, ev.tinta + .08, [-.3, -2.95, 1.2]], [ev.sandbox, ev.sandbox + .5, R1],
    [ev.pago - .75, ev.pago - .3, [-.55, -2.8, 2.05], ease.outBack], [ev.giro + .2, ev.giro + .8, R1],
  ];
  for (const [tl, x] of LANZA) S.push([tl - .45, tl - .1, [x, Y0 - .05, .22]], [tl + .06, tl + .4, R1]);
  S.sort((a, b) => a[0] - b[0]);
  const p = ruta(t, R1, S);
  const mueve = ev.ver - .05 < t && t < ev.palomita + .3 ? .12 : 0;      // la lupa recorre el calendario
  return [p[0] + .04 * vaiven(t, 2.1) + mueve * vaiven(t, .45), p[1], p[2] + .04 * vaiven(t, 1.6, 2)];
}
// Tu mano: entra desde abajo a la derecha, como si fuera la tuya.
const SOBRE_TARJETA: P3 = [1.45, -2.75, 2.45];
function manoTu(t: number): { p: P3; abre: number; vis: boolean } {
  const anillo2 = (tt: number): P3 => { const m = mano2(tt); return [m[0] + .42, m[1] + .05, m[2] + .15]; };
  const ARRIBA: P3 = [1.1, YC[3] - .5, 1.35];
  const S: Clave[] = [
    [-.2, 1.5, [1.35, -2.6, 2.6], ease.outCubic], [ev.tacha - .1, ev.suelta + .15, [1.65, -2.65, 2.8]], [ev.cuelga - .2, ev.cae - .06, [1.0, -2.6, 2.8]],
    [ev.aterriza + .2, ev.aterriza + 1.1, [5.8, -4.2, 3.2], ease.inCubic],
    [ev.quita - .6, ev.quita - .05, anillo2], [ev.quita + .15, ev.quita + .7, [2.55, -3.0, 2.25]], [ev.devuelve - .55, ev.devuelve - .05, anillo2],
    [ev.devuelve + .2, ev.devuelve + 1.0, [6.2, -4.4, 3.2], ease.inCubic],
    [ev.mano - .15, ev.mano + .55, SOBRE_TARJETA, ease.outCubic], [ev.giro + .1, ev.giro + 1.4, ARRIBA],
    [ev.no - .22, ev.no, NO, ease.inCubic], [ev.no + .1, ev.no + .4, ARRIBA],
  ];
  // Con la costumbre: primero lee la tarjeta con el dedo, luego mira de reojo, luego ni eso.
  ev.si.forEach((ti, i) => {
    if (i === 0) S.push([ti - 1.0, ti - .65, [XC + .05, 3.0, 2.1]], [ti - .5, ti - .3, ARRIBA]);
    if (i === 1) S.push([ti - .55, ti - .35, [XC + .4, 2.95, 1.95]]);
    const pre = i < 2 ? .25 : .12;
    S.push([ti - pre, ti, SI, ease.inCubic], [ti + .04, ti + (i < 2 ? .3 : .13), [1.0, YC[3] - .4, i < 2 ? 1.3 : 1.05]]);
  });
  S.push([ev.cinta - .4, ev.cinta, SI, ease.inCubic], [ev.cinta + .5, ev.seguridad + 1.4, [1.3, YC[3] - .25, .3]],
    [ev.final + .4, ev.remate + .3, [2.6, 1.1, -1.4], ease.inCubic]);
  S.sort((a, b) => a[0] - b[0]);
  const p = ruta(t, [3.6, -3.4, 3.7], S);
  const vis = t < ev.aterriza + 1.15 || (t > ev.quita - .65 && t < ev.devuelve + 1.05) || t > ev.mano - .2;
  const abre = t < ev.suelta ? .75 : t < ev.cae ? .3 : t < ev.mano ? .55 : t > ev.cinta + .4 ? lerp(.3, .95, smooth(prog(t, ev.cinta + .4, ev.seguridad + 1))) : .2;
  return { p: [p[0] + .04 * vaiven(t, 2.3), p[1], p[2] + .04 * vaiven(t, 1.7, 1)], abre, vis };
}

// ---------- el llavero ----------
function quienTieneAnillo(t: number, h1: Pt | null, h2: Pt | null, tu: Pt | null): { x: number; y: number } | null {
  if (!h2) return null;
  const arco = (a: Pt | { x: number; y: number }, b: Pt | { x: number; y: number }, k: number, alto = 140) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) - alto * 4 * k * (1 - k) });
  if (t < ev.cuelga) return null;
  if (t < ev.cae) return tu ? { x: tu.x - 6, y: tu.y + 18 } : null;
  if (t < ev.aterriza) return tu ? arco({ x: tu.x - 6, y: tu.y + 18 }, h2, ease.inCubic(prog(t, ev.cae, ev.aterriza)), 0) : h2;
  if (h1 && t >= ev.toss[0] && t < ev.toss[1] + .3) {
    if (t < ev.toss[0] + .3) return arco(h2, h1, smooth(prog(t, ev.toss[0], ev.toss[0] + .3)));
    if (t < ev.toss[1]) return h1;
    return arco(h1, h2, smooth(prog(t, ev.toss[1], ev.toss[1] + .3)));
  }
  return h2;
}
const IMPULSOS: [number, number][] = [[ev.aterriza, .7], ...ev.abanico.map((x) => [x, .35] as [number, number]), [ev.juntas, .45], [ev.toss[0] + .3, .5], [ev.toss[1] + .3, .5],
  [ev.k1, .3], [ev.k2, .3], [ev.k3, .3], [ev.quita, .55], [ev.devuelve, .55], [ev.tres, .45], [ev.lee + .3, .25], [ev.caja, .3]];
function vaivenLlave(t: number, i: number) {
  let a = .05 * vaiven(t, 1.7 + i * .23, i);
  for (const [ti, A] of IMPULSOS) { const d = t - ti; if (d > 0 && d < 3) a += A * Math.exp(-d * 2.6) * Math.sin(d * 10 + i * 1.3) * (i === 1 ? .7 : 1); }
  return a;
}
function rojoLlave(t: number, i: number) {
  const k = [ev.k1, ev.k2, ev.k3][i], et = [ev.etqC, ev.etqB, ev.etqP][i];
  return Math.max(ventana(t, k - .05, k + .5, .1, .4), ventana(t, ev.lazo + .3 * i, ev.sale + .9, .15, .5), smooth(prog(t, et, et + .2)) * (t < ev.lazo + 30 ? 1 : 1));
}
function llave(c: C, x: number, y: number, ang: number, k: number, rojo: number, n: number) {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(k, k);
  const relleno = mezcla(BLANCO, ACENTO, rojo), tinta = TINTA;
  c.lineJoin = "round"; c.lineWidth = 5; c.strokeStyle = tinta; c.fillStyle = relleno;
  c.beginPath(); c.moveTo(-8, 44); c.lineTo(-8, 150); c.lineTo(10, 150); c.lineTo(10, 142); c.lineTo(30, 142); c.lineTo(30, 130); c.lineTo(20, 130); c.lineTo(20, 122); c.lineTo(32, 122); c.lineTo(32, 110); c.lineTo(10, 110); c.lineTo(10, 44); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.arc(0, 32, 27, 0, 7); c.fill(); c.stroke();
  c.fillStyle = PAPEL; c.beginPath(); c.arc(0, 15, 6, 0, 7); c.fill(); c.stroke();
  texto(c, String(n), 0, 46, { fuente: mono(24), color: rojo > .5 ? BLANCO : TINTA });
  c.restore();
}
function llavero(c: C, t: number, pos: { x: number; y: number }, k: number, sinTercera: boolean) {
  const rr = 21 * k, cx = pos.x, cy = pos.y + rr * .9;
  const abre = 1 - Math.exp(-Math.max(t - ev.abanico[0], 0) * 5);
  const base = [lerp(-.1, -.52, abre), 0, lerp(.1, .52, abre)];
  for (let i = 0; i < 3; i++) {
    if (i === 2 && sinTercera) continue;
    const a = base[i] + vaivenLlave(t, i);
    const ax = cx + Math.sin(a) * rr, ay = cy + Math.cos(a) * rr;
    llave(c, ax - Math.sin(a) * 8 * k, ay - Math.cos(a) * 8 * k, -a, k * .78, rojoLlave(t, i), i + 1);
  }
  c.strokeStyle = TINTA; c.lineWidth = 5.5 * k; c.beginPath(); c.arc(cx, cy, rr, 0, 7); c.stroke();
}

// ---------- utilería de papel (en pantalla, anclada a un punto 3D) ----------
function sobre(c: C, x: number, y: number, k: number, giro = 0, sello = 0, tache = 0) {
  c.save(); c.translate(x, y); c.rotate(giro); c.scale(k, k);
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 4.5; c.lineJoin = "round";
  c.beginPath(); c.rect(-52, -34, 104, 68); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-52, -34); c.lineTo(0, 6); c.lineTo(52, -34); c.stroke();
  if (sello > 0) { c.globalAlpha *= sello; c.strokeStyle = ACENTO; c.lineWidth = 4; c.beginPath(); c.arc(30, 14, 14, 0, 7); c.stroke(); texto(c, "?", 30, 22, { fuente: serif(26), color: ACENTO }); c.globalAlpha /= sello; }
  if (tache > 0) {
    c.strokeStyle = ACENTO; c.lineWidth = 9; c.lineCap = "round"; const q = 30 * clamp(tache * 2), w = 30 * clamp(tache * 2 - 1);
    c.beginPath(); c.moveTo(-30, -24); c.lineTo(-30 + q * 2, -24 + q * 1.6); if (w > 0) { c.moveTo(30, -24); c.lineTo(30 - w * 2, -24 + w * 1.6); } c.stroke();
  }
  c.restore();
}
function papelito(c: C, x: number, y: number, k: number, giro = 0, fondo = BLANCO) {
  c.save(); c.translate(x, y); c.rotate(giro); c.scale(k, k);
  c.fillStyle = fondo; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.moveTo(-40, -26); c.lineTo(40, -30); c.lineTo(42, 26); c.lineTo(-42, 28); c.closePath(); c.fill(); c.stroke();
  c.lineWidth = 4; c.lineCap = "round";
  c.strokeStyle = TINTA; c.beginPath(); c.moveTo(-28, -12); for (let i = 0; i < 6; i++) c.lineTo(-28 + i * 11, -12 + (i % 2 ? -4 : 3)); c.stroke();
  c.strokeStyle = ACENTO; c.beginPath(); c.moveTo(-28, 8); for (let i = 0; i < 6; i++) c.lineTo(-28 + i * 11, 8 + (i % 2 ? -4 : 3)); c.stroke();
  c.restore();
}
function tarjeta(c: C, x: number, y: number, k: number, giro = 0, nombre = "", tache = 0) {
  c.save(); c.translate(x, y); c.rotate(giro); c.scale(k, k);
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 4.5; c.beginPath(); c.roundRect(-58, -38, 116, 76, 6); c.fill(); c.stroke();
  c.fillStyle = TINTA; c.beginPath(); c.arc(-30, -8, 11, 0, 7); c.fill(); c.beginPath(); c.arc(-30, 18, 18, Math.PI, 0); c.fill();
  if (nombre) texto(c, nombre, 22, 8, { fuente: serif(32, true), color: ACENTO });
  else { c.fillRect(-6, -14, 46, 6); c.fillRect(-6, 2, 34, 6); }
  if (tache > 0) {
    c.strokeStyle = ACENTO; c.lineWidth = 9; c.lineCap = "round"; const q = clamp(tache * 2), w = clamp(tache * 2 - 1);
    c.beginPath(); c.moveTo(-40, -28); c.lineTo(-40 + 80 * q, -28 + 56 * q); if (w > 0) { c.moveTo(40, -28); c.lineTo(40 - 80 * w, -28 + 56 * w); } c.stroke();
  }
  c.restore();
}
function avion(c: C, x: number, y: number, k: number, ang: number) {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(k, k);
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 4; c.lineJoin = "round";
  c.beginPath(); c.moveTo(58, 0); c.lineTo(-44, -30); c.lineTo(-24, 0); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = "#E7E1D2"; c.beginPath(); c.moveTo(58, 0); c.lineTo(-44, 26); c.lineTo(-24, 0); c.closePath(); c.fill(); c.stroke();
  c.restore();
}
function corazon(c: C, x: number, y: number, k: number, giro = 0) {
  c.save(); c.translate(x, y); c.rotate(giro); c.scale(k, k);
  c.fillStyle = ACENTO; c.strokeStyle = TINTA; c.lineWidth = 5; c.lineJoin = "round";
  c.beginPath(); c.moveTo(0, 42); c.bezierCurveTo(-60, 6, -56, -42, -24, -42); c.bezierCurveTo(-8, -42, 0, -28, 0, -18); c.bezierCurveTo(0, -28, 8, -42, 24, -42); c.bezierCurveTo(56, -42, 60, 6, 0, 42); c.closePath(); c.fill(); c.stroke();
  c.restore();
}
function lupa(c: C, x: number, y: number, k: number, giro = 0) {
  c.save(); c.translate(x, y); c.rotate(giro); c.scale(k, k);
  c.fillStyle = "rgba(220,232,232,.45)"; c.strokeStyle = TINTA; c.lineWidth = 9; c.beginPath(); c.arc(0, -40, 34, 0, 7); c.fill(); c.stroke();
  c.lineCap = "round"; c.lineWidth = 12; c.beginPath(); c.moveTo(0, -6); c.lineTo(0, 30); c.stroke();
  c.restore();
}
function goma(c: C, x: number, y: number, k: number, giro = 0) {
  c.save(); c.translate(x, y); c.rotate(giro); c.scale(k, k);
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.roundRect(-20, -62, 40, 70, 6); c.fill(); c.stroke();
  c.fillStyle = "#BDB6A6"; c.beginPath(); c.roundRect(-20, -62, 40, 24, 6); c.fill(); c.stroke();
  c.restore();
}
function tintero(c: C, x: number, y: number, k: number, giro = 0) {
  c.save(); c.translate(x, y); c.rotate(giro); c.scale(k, k);
  c.fillStyle = TINTA; c.beginPath(); c.roundRect(-22, -56, 44, 52, 8); c.fill();
  c.fillStyle = "#3a3a38"; c.fillRect(-12, -70, 24, 16);
  c.restore();
}
function moneda(c: C, x: number, y: number, k: number, giro = 0) {
  c.save(); c.translate(x, y); c.scale(k * Math.max(.2, Math.abs(Math.cos(giro))), k);
  c.fillStyle = "#D9CFB8"; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.arc(0, -40, 30, 0, 7); c.fill(); c.stroke();
  c.lineWidth = 3; c.beginPath(); c.arc(0, -40, 21, 0, 7); c.stroke();
  texto(c, "$", 0, -29, { fuente: serif(34), color: TINTA });
  c.restore();
}
function candado(c: C, x: number, y: number, k: number, color = TINTA) {
  c.save(); c.translate(x, y); c.scale(k, k);
  c.strokeStyle = color; c.lineWidth = 7; c.beginPath(); c.arc(0, -14, 16, Math.PI, 0); c.lineTo(16, 0); c.moveTo(-16, 0); c.lineTo(-16, -14); c.stroke();
  c.fillStyle = color; c.beginPath(); c.roundRect(-24, -2, 48, 38, 5); c.fill();
  c.fillStyle = BLANCO; c.beginPath(); c.arc(0, 14, 5, 0, 7); c.fill(); c.fillRect(-2, 14, 4, 12);
  c.restore();
}
function cerradura(c: C, x: number, y: number, k: number) {
  c.fillStyle = TINTA; c.beginPath(); c.arc(x, y - 4 * k, 7 * k, 0, 7); c.fill();
  c.beginPath(); c.moveTo(x - 4 * k, y); c.lineTo(x + 4 * k, y); c.lineTo(x + 6 * k, y + 14 * k); c.lineTo(x - 6 * k, y + 14 * k); c.closePath(); c.fill();
}
function etiqueta(c: C, x: number, y: number, txt: string, k: number, a: number, rojo: number) {
  if (a <= .01) return;
  c.save(); c.globalAlpha = a; c.translate(x, y); c.scale(k, k);
  c.font = serif(62, true); const w = c.measureText(txt).width + 54;
  c.fillStyle = BLANCO; c.strokeStyle = mezcla(TINTA, ACENTO, rojo); c.lineWidth = 4.5;
  c.beginPath(); c.roundRect(-w / 2, -50, w, 78, 8); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(0, 28); c.lineTo(0, 64); c.stroke();
  texto(c, txt, 0, 4, { fuente: serif(62, true), color: mezcla(TINTA, ACENTO, rojo) });
  c.restore();
}

// ---------- la mesa ----------
const VETAS: P3[][] = [];
{
  const r = azar(14);
  for (let i = 0; i < 46; i++) {
    const y0 = -H + r() * 2 * H, f = r() * 6, a = .03 + r() * .05, pts: P3[] = [];
    for (let x = -W; x <= W + .01; x += .55) pts.push([x, y0 + Math.sin(x * .7 + f) * .08 + (r() - .5) * .02, .002 + a * 0]);
    VETAS.push(pts);
  }
}
function piso(c: C) {
  c.strokeStyle = "rgba(17,17,17,.05)"; c.lineWidth = 2; c.beginPath();
  for (let i = -9; i <= 9; i++) {
    const a = K.p(i * 2.4, -24, PISO), b = K.p(i * 2.4, 24, PISO), q = K.p(-24, i * 2.4, PISO), r = K.p(24, i * 2.4, PISO);
    if (a && b) { c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); }
    if (q && r) { c.moveTo(q.x, q.y); c.lineTo(r.x, r.y); }
  }
  c.stroke();
  poli(c, [[-W + 1, H - 1, PISO], [W + 1, H - 1, PISO], [W + 1, -H - 1, PISO], [-W + 1, -H - 1, PISO]], "rgba(28,22,14,.12)", null);
}
function mesa(c: C, t: number) {
  const P = K.pos;
  for (const [x, y] of [[-W + .35, H - .35], [W - .35, H - .35], [-W + .35, -H + .35], [W - .35, -H + .35]]) lin(c, [x, y, -GT], [x, y, PISO], 26 * esc([x, y, -2]), "#3a3226");
  if (P[1] < -H) poli(c, [[-W, -H, 0], [W, -H, 0], [W, -H, -GT], [-W, -H, -GT]], CANTO, TINTA, 3);
  if (P[0] > W) poli(c, [[W, -H, 0], [W, H, 0], [W, H, -GT], [W, -H, -GT]], CANTO, TINTA, 3);
  if (P[0] < -W) poli(c, [[-W, -H, 0], [-W, H, 0], [-W, H, -GT], [-W, -H, -GT]], CANTO, TINTA, 3);
  poli(c, [[-W, H, 0], [W, H, 0], [W, -H, 0], [-W, -H, 0]], KRAFT, TINTA, 4.5, .8);
  c.lineWidth = 1.6;
  VETAS.forEach((v, i) => {
    c.strokeStyle = `rgba(94,70,36,${.07 + (i % 4) * .025})`; c.beginPath();
    v.forEach((p, j) => { const q = Pv(p); if (q) { if (j) c.lineTo(q.x, q.y); else c.moveTo(q.x, q.y); } });
    c.stroke();
  });
  // la luz de afuera se derrama sobre la mesa cuando la puerta está abierta
  const luz = clamp(angPuerta(t) / 1.2) * (1 - .55 * mallaPuerta(t));
  if (luz > .01) {
    const A = Pv([PTA.x0, PTA.y, .004]), B = Pv([PTA.x1, PTA.y, .004]), Cc = Pv([1.9, 1.3, .004]), D = Pv([-1.9, 1.3, .004]);
    if (A && B && Cc && D) {
      const g = c.createLinearGradient(0, A.y, 0, D.y);
      g.addColorStop(0, `rgba(255,246,222,${.75 * luz})`); g.addColorStop(1, "rgba(255,246,222,0)");
      c.fillStyle = g; c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.lineTo(Cc.x, Cc.y); c.lineTo(D.x, D.y); c.closePath(); c.fill();
    }
  }
}

// ---------- el buzón ----------
function cajaPapel(c: C, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, g: number, col = { front: CARTON, top: CARTON_T, side: CARTON_L }) {
  const [cx, cy, cz] = K.pos;
  if (cx < x0) poli(c, [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]], col.side, TINTA, g);
  if (cx > x1) poli(c, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], col.side, TINTA, g);
  if (cy < y0) poli(c, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], col.front, TINTA, g);
  if (cz > z1) poli(c, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], col.top, TINTA, g);
}
function buzon(c: C, t: number) {
  const B = BZN, g = 3.4 * esc([-2.7, 1.2, .8]);
  cajaPapel(c, B.x0, B.x1, B.y0, B.y1, 0, B.z1, g);
  // techo redondo de buzón
  plano(c, [B.x0, B.y0 - .002, B.z1], [1, 0, 0], [0, 0, -1], () => {
    c.fillStyle = TINTA; c.beginPath(); c.roundRect(30, 38, 100, 18, 9); c.fill();                       // ranura
    const tp = tapaBuzon(t);
    c.fillStyle = CARTON_T; c.strokeStyle = TINTA; c.lineWidth = 3.5;
    c.beginPath(); c.roundRect(24, 30 - tp * 22, 112, 26 - tp * 14, 5); c.fill(); c.stroke();             // la tapa se levanta
    const et = smooth(prog(t, ev.etqB - .05, ev.etqB + .2)) * (1 - smooth(prog(t, ev.barandas - .3, ev.barandas)));
    c.globalAlpha = 1;
    // un sobre pintado al frente: se lee "buzón" sin palabras
    c.save(); c.translate(80, 98); c.scale(.6, .6); c.strokeStyle = TINTA; c.lineWidth = 6; c.strokeRect(-52, -34, 104, 68); c.beginPath(); c.moveTo(-52, -34); c.lineTo(0, 6); c.lineTo(52, -34); c.stroke(); c.restore();
    c.fillStyle = TINTA; c.beginPath(); c.arc(80, 112 + 4, 0, 0, 7); c.fill();
    void et;
  });
  const q = Pv(CER_B); if (q) cerradura(c, q.x, q.y, q.s / 110 * 1.2);
}

// ---------- el fichero ----------
function fichero(c: C, t: number) {
  const F = FCH, g = 3.4 * esc([2.7, 1.2, .6]), d = sacaCajon(t);
  cajaPapel(c, F.x0, F.x1, F.y0, F.y1, 0, F.z1, g);
  if (d < .01) { cajonFrente(c, t, F.y0 - .002); return; }
  // el cajón afuera: lados, tarjetas dentro y el frente
  const y0 = F.y0 - d, y1 = y0 + DR.largo;
  if (K.pos[0] < DR.x0) poli(c, [[DR.x0, y0, DR.z0], [DR.x0, Math.min(y1, F.y0), DR.z0], [DR.x0, Math.min(y1, F.y0), DR.z1], [DR.x0, y0, DR.z1]], CARTON_L, TINTA, g);
  if (K.pos[0] > DR.x1) poli(c, [[DR.x1, y0, DR.z0], [DR.x1, Math.min(y1, F.y0), DR.z0], [DR.x1, Math.min(y1, F.y0), DR.z1], [DR.x1, y0, DR.z1]], CARTON_L, TINTA, g);
  poli(c, [[DR.x0, y0, DR.z1 - .02], [DR.x1, y0, DR.z1 - .02], [DR.x1, F.y0, DR.z1 - .02], [DR.x0, F.y0, DR.z1 - .02]], "#3b352c", TINTA, g * .8);
  const ROBADA = [ev.agarra1, ev.agarra2];
  for (let i = 5; i >= 0; i--) {
    const yy = y0 + .22 + i * .15;
    if (yy > F.y0 - .05) continue;
    const quitada = (i === 3 && t > ROBADA[0] - .02) || (i === 1 && t > ROBADA[1] - .02);
    if (quitada) continue;
    const alto = DR.z1 + .12 + (i % 3) * .05 + (i === 1 ? .2 * smooth(prog(t, ev.mama - .1, ev.mama + .15)) : 0);
    poli(c, [[2.2, yy, .3], [3.2, yy, .3], [3.2, yy, alto], [2.2, yy, alto]], BLANCO, TINTA, g * .7, .4);
    const xt = 2.3 + (i * .19) % .7;
    poli(c, [[xt, yy, alto], [xt + .3, yy, alto], [xt + .3, yy, alto + .1], [xt, yy, alto + .1]], i === 1 ? ACENTO : BLANCO, TINTA, g * .6, .3);
  }
  cajonFrente(c, t, y0);
}
function cajonFrente(c: C, t: number, y: number) {
  const g = 3.4 * esc([2.7, y, .6]);
  poli(c, [[DR.x0, y, DR.z0], [DR.x1, y, DR.z0], [DR.x1, y, DR.z1], [DR.x0, y, DR.z1]], CARTON_T, TINTA, g);
  plano(c, [DR.x0, y - .002, DR.z1], [1, 0, 0], [0, 0, -1], () => {
    c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 3.5; c.beginPath(); c.rect(45, 16, 60, 34); c.fill(); c.stroke();
    c.fillStyle = TINTA; c.beginPath(); c.arc(63, 30, 6, 0, 7); c.fill(); c.beginPath(); c.arc(63, 46, 10, Math.PI, 0); c.fill(); c.fillRect(74, 26, 24, 4); c.fillRect(74, 36, 18, 4);
  });
  const q = Pv([2.7, y - .03, .45]); if (q) cerradura(c, q.x, q.y, q.s / 110 * 1.2);
}

// ---------- la puerta ----------
function puerta(c: C, t: number) {
  const g = 3.6 * esc([0, PTA.y, 1.3]), a = angPuerta(t);
  // el hueco: afuera hay luz
  const abierta = clamp(a / .4);
  const H0 = Pv([PTA.x0, PTA.y, 0]), H1 = Pv([PTA.x1, PTA.y, PTA.z1]);
  if (abierta > 0 && H0 && H1) {
    const cx = (H0.x + H1.x) / 2, cy = (H0.y + H1.y) / 2;
    const gr = c.createRadialGradient(cx, cy, 10, cx, cy, Math.abs(H1.x - H0.x) * 1.1);
    gr.addColorStop(0, "#FFFDF6"); gr.addColorStop(.6, "#FBF1D9"); gr.addColorStop(1, "#EFE0BC");
    poli(c, [[PTA.x0, PTA.y, 0], [PTA.x1, PTA.y, 0], [PTA.x1, PTA.y, PTA.z1], [PTA.x0, PTA.y, PTA.z1]], gr, null);
    // rayos de luz que salen por la puerta
    c.save(); c.globalAlpha = .25 * abierta * (1 - .6 * mallaPuerta(t));
    const Bq = Pv([0, PTA.y, PTA.z1 * .55]);
    if (Bq) {
      for (let i = 0; i < 7; i++) {
        const an = -1.1 + i * .37 + .04 * vaiven(t, 3 + i);
        const gg = c.createLinearGradient(Bq.x, Bq.y, Bq.x + Math.sin(an) * 520, Bq.y + Math.cos(an) * 520);
        gg.addColorStop(0, "rgba(255,248,226,.9)"); gg.addColorStop(1, "rgba(255,248,226,0)");
        c.fillStyle = gg; c.beginPath(); c.moveTo(Bq.x, Bq.y); c.lineTo(Bq.x + Math.sin(an - .08) * 520, Bq.y + Math.cos(an - .08) * 520); c.lineTo(Bq.x + Math.sin(an + .08) * 520, Bq.y + Math.cos(an + .08) * 520); c.closePath(); c.fill();
      }
    }
    c.restore();
  }
  // el marco
  const M = .12;
  poli(c, [[PTA.x0 - M, PTA.y, 0], [PTA.x0, PTA.y, 0], [PTA.x0, PTA.y, PTA.z1], [PTA.x0 - M, PTA.y, PTA.z1]], CARTON_T, TINTA, g);
  poli(c, [[PTA.x1, PTA.y, 0], [PTA.x1 + M, PTA.y, 0], [PTA.x1 + M, PTA.y, PTA.z1], [PTA.x1, PTA.y, PTA.z1]], CARTON_T, TINTA, g);
  poli(c, [[PTA.x0 - M, PTA.y, PTA.z1], [PTA.x1 + M, PTA.y, PTA.z1], [PTA.x1 + M, PTA.y, PTA.z1 + M], [PTA.x0 - M, PTA.y, PTA.z1 + M]], CARTON_T, TINTA, g);
  // la hoja
  const LW = PTA.x1 - PTA.x0, Z1 = PTA.z1 - .03;
  const hoja: P3[] = [enHoja(t, 0, .02), enHoja(t, LW, .02), enHoja(t, LW, Z1), enHoja(t, 0, Z1)];
  poli(c, hoja, a > 1.2 ? CARTON_L : BLANCO, TINTA, g);
  const o = enHoja(t, LW, Z1), o2 = enHoja(t, LW - 1, Z1);
  if (Math.cos(a) > .12) plano(c, o, [o2[0] - o[0], o2[1] - o[1], o2[2] - o[2]], [0, 0, -1], () => {
    c.strokeStyle = TINTA; c.lineWidth = 3; c.strokeRect(22, 22, LW * 100 - 44, 100); c.strokeRect(22, 142, LW * 100 - 44, 100);
    c.fillStyle = TINTA; c.beginPath(); c.arc(22, 132, 8, 0, 7); c.fill();
  });
  const q = Pv(cerPuerta(t)); if (q && Math.cos(a) > .3) cerradura(c, q.x, q.y, q.s / 110 * 1.2);
}

// ---------- barandillas ----------
const POSTES: [number, number][] = [];
{
  const ruta2: [number, number][] = [[1.2, 4.35], [4.15, 4.35], [4.15, -4.35], [-4.15, -4.35], [-4.15, 4.35], [-1.2, 4.35]];
  let Lt = 0; const seg = ruta2.slice(1).map((p, i) => { const l = Math.hypot(p[0] - ruta2[i][0], p[1] - ruta2[i][1]); Lt += l; return l; });
  for (let k = 0; k < 22; k++) {
    let d = Lt * k / 21, i = 0; while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
    const f = d / seg[i]; POSTES.push([lerp(ruta2[i][0], ruta2[i + 1][0], f), lerp(ruta2[i][1], ruta2[i + 1][1], f)]);
  }
}
const altoPoste = (t: number, k: number) => {
  const ti = ev.barandas + k * (ev.barandasF - ev.barandas) / 22;
  return 1.0 * clamp(resorte(t - ti, 3.4, .45), 0, 1.25) * (1 - smooth(prog(t, ev.giro - .1 + k * .015, ev.giro + .45 + k * .015)));
};
function poste(c: C, t: number, k: number) {
  const h = altoPoste(t, k); if (h < .01) return;
  const [x, y] = POSTES[k], g = esc([x, y, .4]);
  lin(c, [x, y, 0], [x, y, h], 12 * g);
  lin(c, [x, y, 0], [x, y, h], 6 * g, BLANCO);
  if (k < 21) {
    const h2 = altoPoste(t, k + 1);
    if (h2 > .01) {
      const [x2, y2] = POSTES[k + 1], hh = Math.min(h, h2);
      lin(c, [x, y, hh], [x2, y2, hh], 10 * g); lin(c, [x, y, hh], [x2, y2, hh], 4.5 * g, BLANCO);
      lin(c, [x, y, hh * .5], [x2, y2, hh * .5], 4 * g);
    }
  }
}

// ---------- filtros, calendario, caja ----------
const mallaBuzon = (t: number) => clamp(resorte(t - ev.filtroE, 3, .5), 0, 1.15) * (1 - smooth(prog(t, ev.giro - .2, ev.giro + .3)));
const mallaPuerta = (t: number) => clamp(resorte(t - ev.filtroS, 3, .5), 0, 1.15) * (1 - smooth(prog(t, ev.giro - .2, ev.giro + .3)));
function malla(c: C, x0: number, x1: number, y: number, alto: number, k: number) {
  if (k < .01) return;
  const a = k * Math.PI / 2, pt = (x: number, h: number): P3 => [x, y - h * Math.cos(a), h * Math.sin(a)];
  const g = esc([(x0 + x1) / 2, y, alto / 2]);
  c.save(); c.globalAlpha = clamp(k * 3);
  poli(c, [pt(x0, 0), pt(x1, 0), pt(x1, alto), pt(x0, alto)], "rgba(253,252,248,.35)", TINTA, 4 * g);
  if (k < .3) { c.restore(); return; }
  c.strokeStyle = "rgba(17,17,17,.75)"; c.lineWidth = 1.8 * g; c.beginPath();
  const n = Math.round((x1 - x0) / .12), m = Math.round(alto / .12);
  for (let i = 1; i < n; i++) { const A = Pv(pt(lerp(x0, x1, i / n), 0)), B = Pv(pt(lerp(x0, x1, i / n), alto)); if (A && B) { c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); } }
  for (let j = 1; j < m; j++) { const A = Pv(pt(x0, alto * j / m)), B = Pv(pt(x1, alto * j / m)); if (A && B) { c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); } }
  c.stroke(); c.restore();
}
const CAL = { x0: -2.6, x1: -1.3, y: -1.62, alto: 1.15 };
function calendario(c: C, t: number) {
  const k = clamp(resorte(t - ev.calendario, 3, .5), 0, 1.15) * (1 - smooth(prog(t, ev.giro - .2, ev.giro + .3)));
  if (k < .01) return;
  const a = k * 1.3, pt = (x: number, h: number): P3 => [x, CAL.y + h * Math.cos(a) * .3 + (1 - k) * 0, h * Math.sin(a)];
  const o = pt(CAL.x0, CAL.alto), b = pt(CAL.x0, 0);
  const g = esc([-1.95, CAL.y, .5]);
  poli(c, [[CAL.x0, CAL.y + .35, 0], [CAL.x1, CAL.y + .35, 0], pt(CAL.x1, CAL.alto), pt(CAL.x0, CAL.alto)], CARTON_L, TINTA, 3 * g);
  poli(c, [pt(CAL.x0, 0), pt(CAL.x1, 0), pt(CAL.x1, CAL.alto), pt(CAL.x0, CAL.alto)], BLANCO, TINTA, 3.5 * g);
  const vy: P3 = [(b[0] - o[0]) / CAL.alto, (b[1] - o[1]) / CAL.alto, (b[2] - o[2]) / CAL.alto];
  plano(c, o, [1, 0, 0], vy, () => {
    c.fillStyle = ACENTO; c.fillRect(0, 0, 130, 24);
    c.strokeStyle = TINTA; c.lineWidth = 2;
    for (let i = 0; i <= 5; i++) { c.beginPath(); c.moveTo(10 + i * 22, 34); c.lineTo(10 + i * 22, 106); c.stroke(); }
    for (let j = 0; j <= 4; j++) { c.beginPath(); c.moveTo(10, 34 + j * 18); c.lineTo(120, 34 + j * 18); c.stroke(); }
    c.fillStyle = TINTA; for (let i = 0; i < 3; i++) c.fillRect(14 + (i * 2 + 1) * 22 % 110, 40 + i * 18, 12, 6);
    // palomita: ver sí
    const pk = smooth(prog(t, ev.palomita, ev.palomita + .22));
    if (pk > 0) { c.strokeStyle = TINTA; c.lineWidth = 7; c.lineCap = "round"; c.beginPath(); c.moveTo(70, 66); c.lineTo(70 + 12 * clamp(pk * 2), 66 + 12 * clamp(pk * 2)); if (pk > .5) c.lineTo(82 + 30 * (pk - .5) * 2, 78 - 40 * (pk - .5) * 2); c.stroke(); }
    // candado: borrar no
    const ck = ease.outBack(prog(t, ev.candado, ev.candado + .25), 2.2);
    if (ck > 0) { c.save(); c.translate(36, 70); c.scale(ck * .9, ck * .9); c.fillStyle = "rgba(253,252,248,.9)"; c.beginPath(); c.arc(0, 0, 38, 0, 7); c.fill(); c.strokeStyle = ACENTO; c.lineWidth = 5; c.stroke(); candado(c, 0, -6, .8, ACENTO); c.restore(); }
  });
}
const CAJA = { x0: -1.3, x1: 1.3, y0: -3.5, y1: -.9, z1: 2.4 };
function altoCaja(t: number) {
  if (t < ev.caja - .4) return 99;
  if (t < ev.levanta) { const a = t - (ev.caja - .4); if (a < .4) return 7 * (1 - (a / .4) ** 2); const r = a - .4; return r < .5 ? .25 * Math.abs(Math.sin(r * 6.3)) * Math.exp(-r * 6) : 0; }
  return 8 * ease.inCubic(prog(t, ev.levanta, ev.levanta + .7));
}
const MANCHAS: [number, number, number, number][] = [[-.55, -3.5, 1.5, .0], [.35, -3.5, 1.15, .09], [-1.3, -2.3, 1.7, .18], [1.3, -2.0, 1.3, .27], [.0, -3.5, 1.85, .36]];
function caja(c: C, t: number, parte: "atras" | "frente") {
  const dz = altoCaja(t); if (dz > 20 || t > ev.levanta + .72) return;
  const B = CAJA, g = 3 * esc([0, -2.2, 1]);
  const v = (x: number, y: number, z: number): P3 => [x, y, z + dz];
  const vidrio = "rgba(196,214,214,.16)";
  if (parte === "atras") {
    poli(c, [v(B.x0, B.y1, 0), v(B.x1, B.y1, 0), v(B.x1, B.y1, B.z1), v(B.x0, B.y1, B.z1)], vidrio, TINTA, g);
    poli(c, [v(B.x0, B.y0, 0), v(B.x0, B.y1, 0), v(B.x0, B.y1, B.z1), v(B.x0, B.y0, B.z1)], vidrio, TINTA, g);
    poli(c, [v(B.x1, B.y0, 0), v(B.x1, B.y1, 0), v(B.x1, B.y1, B.z1), v(B.x1, B.y0, B.z1)], vidrio, TINTA, g);
    manchas(c, t, dz, false);
    return;
  }
  manchas(c, t, dz, true);
  poli(c, [v(B.x0, B.y0, 0), v(B.x1, B.y0, 0), v(B.x1, B.y0, B.z1), v(B.x0, B.y0, B.z1)], vidrio, TINTA, g);
  poli(c, [v(B.x0, B.y0, B.z1), v(B.x1, B.y0, B.z1), v(B.x1, B.y1, B.z1), v(B.x0, B.y1, B.z1)], "rgba(220,232,232,.2)", TINTA, g);
  // brillo del vidrio
  const A = Pv(v(B.x0 + .25, B.y0, B.z1 - .2)), Bq = Pv(v(B.x0 + .55, B.y0, .25));
  if (A && Bq) { c.save(); c.globalAlpha = .55; c.strokeStyle = BLANCO; c.lineWidth = 14 * esc([0, -3.5, 1]); c.lineCap = "round"; c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(Bq.x, Bq.y); c.stroke(); c.restore(); }
  // la etiqueta, pegada al vidrio
  const ek = ease.outBack(prog(t, ev.sandbox, ev.sandbox + .3), 1.8);
  if (ek > 0) plano(c, v(.1, B.y0 - .01, .62), [1, 0, 0], [0, 0, -1], () => {
    c.save(); c.translate(70, 22); c.rotate(-.04); c.scale(ek, ek);
    c.fillStyle = CINTA; c.strokeStyle = "rgba(17,17,17,.5)"; c.lineWidth = 2; c.beginPath(); c.rect(-68, -21, 136, 42); c.fill(); c.stroke();
    texto(c, "sandbox", 0, 9, { fuente: mono(25), color: TINTA }); c.restore();
  });
}
function manchas(c: C, t: number, dz: number, frente: boolean) {
  MANCHAS.forEach(([x, y, z, d], i) => {
    const enFrente = Math.abs(y - CAJA.y0) < .01;
    if (enFrente !== frente) return;
    const ti = ev.tinta + .12 + d;
    // la gota vuela desde el tintero
    const ini: P3 = [-.3, -2.95, 1.3];
    if (t < ti && t > ti - .14) { const k = prog(t, ti - .14, ti); const q = Pv([lerp(ini[0], x, k), lerp(ini[1], y, k), lerp(ini[2], z, k) + .3 * Math.sin(k * 3.14) + dz]); if (q) { c.fillStyle = TINTA; c.beginPath(); c.arc(q.x, q.y, 8 * q.s / 110, 0, 7); c.fill(); } }
    if (t < ti) return;
    const a = t - ti, r = .16 + .05 * (i % 2), esc2 = ease.outBack(prog(a, 0, .12), 2), escurre = .35 * ease.outCubic(prog(a, .1, 1.6));
    const q = Pv([x, y, z + dz]); if (!q) return;
    const R = r * q.s * esc2;
    const rn = azar(40 + i);
    c.fillStyle = TINTA; c.beginPath();
    for (let k = 0; k <= 14; k++) { const an = k / 14 * 6.28, rr = R * (.75 + rn() * .5); if (k) c.lineTo(q.x + Math.cos(an) * rr, q.y + Math.sin(an) * rr * .9); else c.moveTo(q.x + Math.cos(an) * rr, q.y + Math.sin(an) * rr * .9); }
    c.closePath(); c.fill();
    const q2 = Pv([x, y, z - escurre + dz]); if (q2) { c.strokeStyle = TINTA; c.lineWidth = R * .35; c.lineCap = "round"; c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(q2.x, q2.y); c.stroke(); }
  });
}

// ---------- las capas en fila ----------
type Capa = { y: number; arcos: number[]; hoyos: [number, number, number][]; icono: string };
const CAPAS: Capa[] = [
  { y: YC[0], arcos: [XA, XC, XB], hoyos: [[-.35, .85, .13], [1.1, .95, .11]], icono: "embudo" },
  { y: YC[1], arcos: [XC, XB], hoyos: [[-.75, .8, .15], [.4, 1.0, .1]], icono: "calendario" },
  { y: YC[2], arcos: [XC, 1.12], hoyos: [[-.6, .9, .13]], icono: "caja" },
  { y: YC[3], arcos: [], hoyos: [], icono: "pago" },
];
const subeCapa = (t: number, i: number) => clamp(resorte(t - ev.capas[i], 2.8, .5), 0, 1.12);
const tamHueco = (t: number, i: number, j: number) => (i === 0 ? ease.outBack(prog(t, ev.huecos[Math.min(j, 2)], ev.huecos[Math.min(j, 2)] + .2), 2) : 1);
function puntoCapa(i: number, a: number, x: number, h: number): P3 { return [x, CAPAS[i].y - h * Math.cos(a), h * Math.sin(a)]; }
function anguloReja(t: number) {
  let g = 0;
  for (const ti of ev.si) { const d = t - ti; if (d > 0 && d < .7) g = Math.max(g, 1.25 * Math.sin(Math.PI * clamp(d / .6)) ** .6); }
  if (t > ev.cinta) g = Math.max(g, 1.4 * ease.outBack(prog(t, ev.cinta + .1, ev.cinta + .6), 1.4) + (t > ev.remate ? .12 * ease.outBack(prog(t, ev.remate, ev.remate + .4), 2) : 0));
  return g;
}
function capa(c: C, t: number, i: number) {
  const k = subeCapa(t, i); if (k < .005 || t > 0 && t < ev.giro) return;
  const a = k * Math.PI / 2, C0 = CAPAS[i], g = esc([0, C0.y, 1]);
  const pt = (x: number, h: number) => Pv(puntoCapa(i, a, x, h));
  const al = smooth(prog(t, ev.capas[i], ev.capas[i] + .12));
  c.save(); c.globalAlpha = al;
  // contorno con los arcos mordidos abajo
  const arcos = [...C0.arcos, ...(i === 3 ? [XC] : [])].sort((p, q) => p - q);
  c.beginPath();
  const mueve = (x: number, h: number, primero = false) => { const q = pt(x, h); if (!q) return; if (primero) c.moveTo(q.x, q.y); else c.lineTo(q.x, q.y); };
  mueve(-PW, 0, true);
  arcos.forEach((x, j) => {
    const kk = i === 3 ? 1 : tamHueco(t, i, j), w = (i === 3 ? GW : AW) * kk, h = (i === 3 ? GH : AH) * kk;
    mueve(x - w, 0); mueve(x - w, h - w);
    for (let s2 = 0; s2 <= 10; s2++) { const an = Math.PI - s2 / 10 * Math.PI; mueve(x + Math.cos(an) * w, h - w + Math.sin(an) * w); }
    mueve(x + w, 0);
  });
  mueve(PW, 0); mueve(PW, PH); mueve(-PW, PH);
  c.closePath();
  C0.hoyos.forEach(([x, h, r], j) => {
    const rr = r * (i === 0 ? tamHueco(t, i, j) : 1);
    for (let s2 = 0; s2 <= 16; s2++) { const an = s2 / 16 * 6.2832; mueve(x + Math.cos(an) * rr, h + Math.sin(an) * rr, s2 === 0); }
    c.closePath();
  });
  c.fillStyle = i % 2 ? "#F7F3EA" : BLANCO; c.fill("evenodd");
  c.strokeStyle = TINTA; c.lineWidth = 3.6 * g; c.lineJoin = "round"; c.stroke();
  // icono de la capa, arriba a la izquierda
  const o = puntoCapa(i, a, -PW + .12, PH - .1), o2 = puntoCapa(i, a, -PW + .12, PH - 1.1);
  plano(c, o, [1, 0, 0], [o2[0] - o[0], o2[1] - o[1], o2[2] - o[2]], () => icono(c, C0.icono));
  c.restore();
  if (i === 3) reja(c, t, a, g);
}
function icono(c: C, n: string) {
  c.strokeStyle = TINTA; c.fillStyle = TINTA; c.lineWidth = 5; c.lineJoin = "round"; c.lineCap = "round";
  if (n === "embudo") { c.beginPath(); c.moveTo(6, 8); c.lineTo(66, 8); c.lineTo(42, 40); c.lineTo(42, 62); c.lineTo(30, 62); c.lineTo(30, 40); c.closePath(); c.stroke(); for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(14 + i * 13, 14); c.lineTo(20 + i * 9, 30); c.stroke(); } }
  if (n === "calendario") { c.strokeRect(6, 8, 62, 52); c.fillStyle = ACENTO; c.fillRect(6, 8, 62, 13); candado(c, 37, 40, .48); }
  if (n === "caja") { c.strokeRect(8, 22, 44, 40); c.beginPath(); c.moveTo(8, 22); c.lineTo(24, 8); c.lineTo(68, 8); c.lineTo(52, 22); c.moveTo(68, 8); c.lineTo(68, 48); c.lineTo(52, 62); c.stroke(); }
}
/** La última capa es tuya: una pluma de barrera sobre el arco y dos botones pintados en la hoja. */
function reja(c: C, t: number, a: number, g: number) {
  const ga = clamp(anguloReja(t) / 1.25) * Math.PI / 2;
  const sobre = (x: number, h: number): P3 => { const p = puntoCapa(3, a, x, h); return [p[0], p[1] - .02, p[2]]; };
  // botones
  const o = sobre(.56, 1.18), abajo: P3 = [0, Math.cos(a), -Math.sin(a)];
  const hund = (tiempos: number[]) => { let d = 0; for (const ti of tiempos) { const x = t - ti; if (x > -.03 && x < .2) d = Math.max(d, 1 - Math.abs(x - .05) / .15); } return d; };
  const siAbajo = t > ev.cinta ? 1 : hund(ev.si), noAbajo = hund([ev.no]);
  plano(c, o, [1, 0, 0], abajo, () => {
    for (const [cx, txt, d, col] of [[26, "sí", siAbajo, TINTA], [68, "no", noAbajo, ACENTO]] as [number, string, number, string][]) {
      c.fillStyle = "#BDB6A6"; c.beginPath(); c.arc(cx, 42, 19, 0, 7); c.fill();
      c.fillStyle = d > .5 ? "#EFEAE0" : BLANCO; c.strokeStyle = col; c.lineWidth = 3.4; c.beginPath(); c.arc(cx - 1 + d * 2, 39 + d * 3, 18 - d * 1.5, 0, 7); c.fill(); c.stroke();
      texto(c, txt, cx - 1 + d * 2, 47 + d * 3, { fuente: serif(24, true), color: col });
    }
    const ck = ease.outCubic(prog(t, ev.cinta - .08, ev.cinta + .04));
    if (ck > 0) {
      c.save(); c.translate(26, 42); c.rotate(-.55); c.globalAlpha = clamp(ck * 2) * .82;
      const L = 34 * ck; c.fillStyle = CINTA; c.strokeStyle = "rgba(17,17,17,.5)"; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(-L, -7); for (let i = 0; i <= 4; i++) c.lineTo(L + (i % 2 ? 3 : 0), -7 + i * 3.5); c.lineTo(-L, 7); for (let i = 0; i <= 4; i++) c.lineTo(-L - (i % 2 ? 3 : 0), 7 - i * 3.5); c.closePath(); c.fill(); c.stroke();
      c.restore();
    }
  });
  // la pluma: cerrada atraviesa el arco; abierta queda de pie
  const px = XC + GW + .1, ph = .2, L = .9, gr = .062;
  const dx = -Math.cos(ga), dh = Math.sin(ga), nx = -dh, nh = dx;
  const seg = (u0: number, u1: number): P3[] => [sobre(px + dx * u0 + nx * gr, ph + dh * u0 + nh * gr), sobre(px + dx * u1 + nx * gr, ph + dh * u1 + nh * gr),
    sobre(px + dx * u1 - nx * gr, ph + dh * u1 - nh * gr), sobre(px + dx * u0 - nx * gr, ph + dh * u0 - nh * gr)];
  poli(c, seg(0, L), BLANCO, TINTA, 3 * g, .4);
  for (let k = 1; k < 5; k += 2) poli(c, seg(L * k / 5, L * (k + 1) / 5), ACENTO, null);
  poli(c, seg(0, L), null, TINTA, 3 * g, .4);
  const q = Pv(sobre(px, ph)); if (q) { c.fillStyle = TINTA; c.beginPath(); c.arc(q.x, q.y, 9 * g, 0, 7); c.fill(); c.fillStyle = BLANCO; c.beginPath(); c.arc(q.x, q.y, 3.5 * g, 0, 7); c.fill(); }
}
// ---------- los papelitos ----------
type Vuelo = { x: number; y: number; z: number; giro: number; a: number; carta?: boolean };
/** Un papelito en la fila: sale de la bola y avanza hasta topar (o hasta la puerta). */
function papelFila(t: number, tl: number, x: number, topa: number | null, fin = 99): Vuelo | null {
  if (t < tl - .05 || t > fin) return null;
  const yTopa = topa === null ? 99 : YC[topa] - .12;
  const y = Y0 + Math.max(t - tl, 0) * VEL;
  if (y < yTopa) {
    const salida = Math.max(y - YPUERTA, 0);
    return { x, y: Math.min(y, YPUERTA + 2.5), z: .1 + .05 * Math.sin(t * 20) + salida * .25, giro: .08 * Math.sin(t * 13), a: 1 - smooth(prog(y, YPUERTA + .6, YPUERTA + 2.2)) };
  }
  const tt = tl + (yTopa - Y0) / VEL, d = t - tt;
  const reb = .45 * ease.outCubic(prog(d, 0, .35));
  return { x, y: yTopa - reb, z: .1 + .5 * Math.sin(Math.PI * clamp(d / .35)) * Math.exp(-d * 2), giro: d * 5 * Math.exp(-d * 3), a: 1 - smooth(prog(d, 1.6, 2.2)) };
}
function vuelosFila(t: number): Vuelo[] {
  const out: Vuelo[] = [];
  const L = ev.lanza;
  for (const v of [papelFila(t, L.a0, XC, null, L.a0 + 2.2), papelFila(t, L.a, XA, 1, L.a + 3.5), papelFila(t, L.b, XB, 2, L.b + 3.5), papelFila(t, L.c, XC, 3, L.c + 4),
    papelFila(t, ev.falla, XA, 1, ev.falla + 3.5), papelFila(t, ev.final, XC, null, ev.final + 2.4)]) if (v) out.push({ ...v, carta: true });
  return out;
}

// ---------- tarjetas de aprobación (sobre la reja) ----------
const PIDE = ["¿pago?", "¿envío?", "¿borro?", "¿instalo?", "¿pago?", "¿reenvío?", "¿compro?"];
function tarjetasPide(c: C, t: number) {
  const tiempos = [...ev.si.map((ti, i) => ({ ti, ini: ti - (i === 0 ? 1.15 : i === 1 ? .62 : .32), i })),
    ...[0, 1, 2, 3].map((k) => ({ ti: ev.cinta + .55 + k * .32, ini: ev.cinta + .3 + k * .32, i: 7 + k }))];
  for (const { ti, ini, i } of tiempos) {
    if (t < ini || t > ti + .5) continue;
    const llega = ease.outBack(prog(t, ini, ini + .2), 1.6), va = ease.inCubic(prog(t, ti + .02, ti + .42));
    const p = L3([XC - .1, 3.05, 1.9], [XC, 4.2, .5], va), q = Pv([p[0], p[1], p[2] - (1 - llega) * .5]); if (!q) continue;
    const k = q.s / 150 * (1 - va * .5);
    c.save(); c.globalAlpha = clamp(llega * 2) * (1 - smooth(prog(va, .6, 1))); c.translate(q.x, q.y); c.rotate(.04 * Math.sin(i * 2.1)); c.scale(k, k);
    c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.roundRect(-150, -62, 300, 112, 10); c.fill(); c.stroke();
    texto(c, PIDE[i % PIDE.length], 0, 18, { fuente: serif(78, true), color: TINTA });
    c.restore();
  }
}

// ---------- la bola ----------
function saltoBola(t: number) {
  let z = 0;
  for (const [ti, h] of [...ev.brincos.map((b, i) => [b, [.22, .27, .22][i]]), [ev.aterriza, -.06], [ev.tres, .35], [ev.caja + .05, -.08], [ev.mama, .12], [ev.sale + .1, .1]] as [number, number][]) {
    const d = t - ti; if (d > 0 && d < .5) z += h * Math.sin(Math.PI * d / .5);
  }
  return z + .03 * vaiven(t, 1.4);
}
function abre1(t: number) { return t > ev.ver - .5 && t < ev.sandbox ? .2 : .6; }
function abre2(t: number) { return t < ev.aterriza ? .95 : .25; }
function agenteMundo(c: C, t: number, h1: Pt | null, h2: Pt | null) {
  const p = Pv([BX, BY, RB + saltoBola(t)]); if (!p) return;
  const r = RB * p.s, g = r / 90;
  const sp = Pv([BX, BY, 0]); if (sp) sombra(c, sp.x, sp.y, r * 1.55, .34);
  const hom1: [number, number] = [p.x - 54 * g, p.y - 50 * g], hom2: [number, number] = [p.x + 60 * g, p.y - 30 * g];
  const b1 = () => { if (h1) brazo(c, hom1[0], hom1[1], h1.x, h1.y, 90 * g, abre1(t), TINTA, 1, g); };
  const b2 = () => { if (h2) brazo(c, hom2[0], hom2[1], h2.x, h2.y, -100 * g, abre2(t), TINTA, 1, g); };
  const d1 = !!h1 && h1.zc < p.zc - .4, d2 = !!h2 && h2.zc < p.zc - .4;
  if (!d1) b1(); if (!d2) b2();
  bola(c, p.x, p.y, r);
  if (d1) b1(); if (d2) b2();
}
function enMano1(c: C, t: number, h1: Pt) {
  const g = h1.s / 110;
  if (t > ev.ver - .5 && t < ev.palomita + .45) lupa(c, h1.x + 6 * g, h1.y - 4 * g, g * .9, -.3);
  if (t > ev.palomita + .45 && t < ev.candado + .7) goma(c, h1.x, h1.y - 6 * g, g * .9, -.5 + (t > ev.candado ? .5 * Math.exp(-(t - ev.candado) * 6) * Math.sin((t - ev.candado) * 30) : 0));
  if (t > ev.tinta - .7 && t < ev.sandbox + .2) tintero(c, h1.x, h1.y - 4 * g, g * .9, lerp(0, 2.1, ease.outBack(prog(t, ev.tinta - .1, ev.tinta + .1))));
  if (t > ev.pago - .8 && t < ev.giro + .3) moneda(c, h1.x, h1.y - 6 * g, g * .9, t * 3);
  for (const [tl] of LANZA) if (t > tl - .2 && t < tl) papelito(c, h1.x, h1.y - 10 * g, g * .55, .2);
}

// ---------- rótulos ----------
type Rot = [number, number, string, number, string, boolean, number?];
const ROTS: Rot[] = [
  [t0.confianza - .05, ev.cuelga - .05, "confianza", 136, TINTA, true], [t0.llaves, 99, "llaves", 170, ACENTO, true], [t0.tres, 99, "tres llaves", 140, TINTA, false],
  [t0.nunca, ev.sube + .4, "nunca juntas", 140, ACENTO, true], [t0.nombre - .05, 99, "Simon Willison", 112, TINTA, false, -10], [t0.trifecta, 99, "la trifecta letal", 136, ACENTO, true],
  [t0.primera, 99, "1", 190, ACENTO, true, 10], [t0.datos, 99, "datos privados", 128, TINTA, true], [t0.segunda, 99, "2", 190, ACENTO, true, 10],
  [t0.contenido, 99, "contenido de extraños", 110, TINTA, true], [t0.tercera, 99, "3", 190, ACENTO, true, 10], [t0.hacia, ev.quita, "hacia afuera", 128, TINTA, true],
  [t0.unaodos, 99, "una o dos", 130, TINTA, false], [t0.manejable, ev.devuelve - .1, "manejable", 136, TINTA, true], [t0.simple, 99, "un simple texto", 124, TINTA, true],
  [t0.sacar, t0.agente - .3, "sacar tus datos", 130, ACENTO, true], [t0.lastres, ev.barandas - .25, "las tres", 170, ACENTO, true], [t0.guard - .05, 99, "guardrails", 100, TINTA, false],
  [t0.baran, 99, "barandillas", 140, ACENTO, true], [t0.filtros, 99, "filtros", 140, TINTA, true], [t0.entra, ev.filtroS - .05, "lo que entra", 128, TINTA, true],
  [t0.sale, 99, "lo que sale", 128, TINTA, true], [t0.permisos, 99, "permisos", 140, TINTA, true], [t0.ver, 99, "ver", 150, TINTA, true], [t0.pero, 99, "borrar", 150, ACENTO, true],
  [t0.caja, ev.levanta - .2, "caja cerrada", 136, TINTA, true], [t0.ninguna, 99, "ninguna es perfecta", 112, TINTA, true], [t0.unatras, ev.trampa - .15, "una tras otra", 128, TINTA, true],
  [t0.trampa, 99, "una trampa muy humana", 104, ACENTO, true], [t0.anthropic, ev.seguridad - .3, "Anthropic", 92, TINTA, false, -95], [t0.norompe, 99, "no se rompe", 140, TINTA, true],
  [t0.serompe, 99, "se rompe", 150, ACENTO, true], [t0.cansas, DURACION + 1, "te cansas de revisarlo", 108, ACENTO, true],
];
ROTS.forEach((r, i) => { if (i < ROTS.length - 1) r[1] = Math.min(r[1], ROTS[i + 1][0] - .3); });
function tacha(c: C, t: number, txt: string, px: number, a: number, b: number, y: number) {
  const k = smooth(prog(t, a, a + .2)), al = 1 - smooth(prog(t, b, b + .22));
  if (k <= 0 || al <= 0) return;
  c.save(); c.globalAlpha = al; c.font = serif(px, true); const w = c.measureText(txt).width; c.strokeStyle = ACENTO; c.lineWidth = 11; c.lineCap = "round";
  c.beginPath(); c.moveTo(540 - w / 2 - 14, y - px * .3); c.lineTo(540 - w / 2 - 14 + (w + 28) * k, y - px * .36); c.stroke(); c.restore();
}
function rotulos(c: C, t: number) {
  const Y = 300;
  for (const [a, b, txt, px, col, it, dy] of ROTS) rotulo(c, t, a, b, txt, Y + (dy ?? 0), px, col, it);
  tacha(c, t, "confianza", 136, ev.tacha, ROTS[0][1], Y);
  const borrar = ROTS.find((r) => r[2] === "borrar")!;
  tacha(c, t, "borrar", 150, ev.candado, borrar[1], Y);
  rotulo(c, t, t0.doble, ev.seguridad - .3, "×2", 385, 190, ACENTO, true);
  rotulo(c, t, t0.doble + .3, ev.seguridad - .3, "sesiones con autoaprobación", 458, 54, TINTA, true);
}

// ---------- todo junto ----------
function dibuja(c: C, t: number) {
  FR = Math.floor(t * 10);
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  polvo(c, t);
  K = camaraDe(t);
  const sh = sacude(t);
  c.save(); c.translate(sh.x, sh.y);
  piso(c);
  mesa(c, t);
  const fila = t > ev.giro - .2;
  // lazo y caminos, pintados sobre la mesa
  const gR = 11 * esc([0, 0, 0]);
  if (t > ev.sobre1 - .2 && t < ev.devuelve + .4) {
    const a = ventana(t, ev.sobre1 - .2, ev.devuelve, .3, .4);
    c.save(); c.globalAlpha = a * .85; trazoRuta(c, 0, U(IP), TINTA, gR * .55, [3, 15 * esc([0, 0, 0])], -t * 60); c.restore();
  }
  const lazoK = Math.max(ease.inOutCubic(prog(t, ev.lazo, ev.lazo + 1.0)) * (1 - smooth(prog(t, ev.sale + 1.4, ev.sale + 2.0))), smooth(prog(t, ev.tres - .25, ev.tres + .1)) * (1 - smooth(prog(t, ev.giro - .3, ev.giro + .2))));
  if (lazoK > .005) {
    const off = -t * 90;
    c.save(); c.globalAlpha = .18; trazoRuta(c, 0, lazoK, ROJO, gR * 3.2, []); c.restore();
    trazoRuta(c, 0, lazoK, ACENTO, gR, [14 * esc([0, 0, 0]), 12 * esc([0, 0, 0])], off);
  }
  if (t > ev.final) {
    const yF = Math.min(Y0 + (t - ev.final) * VEL, YPUERTA + 2.4), A = Pv([XC, Y0, .03]), B = Pv([XC, yF, .03]);
    if (A && B) { c.save(); c.strokeStyle = ACENTO; c.lineWidth = gR; c.setLineDash([14 * esc([0, 1, 0]), 12 * esc([0, 1, 0])]); c.lineDashOffset = -t * 90; c.lineCap = "round"; c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke(); c.restore(); }
  }

  const h1 = Pv(mano1(t)), h2 = Pv(mano2(t));
  const tu = manoTu(t), tuP = tu.vis ? Pv(tu.p) : null;
  // objetos ordenados por profundidad
  const L: { d: number; f: () => void }[] = [];
  const add = (p: P3, f: () => void) => { const q = Pv(p); L.push({ d: q ? q.zc : 999, f }); };
  add([0, PTA.y + .3, 1.3], () => puerta(c, t));
  add([-2.7, 1.2, .8], () => buzon(c, t));
  add([2.7, 1.2, .6], () => fichero(c, t));
  add([-2.7, BZN.y0 - .2, .7], () => malla(c, -3.4, -2.0, BZN.y0 - .15, 1.45, mallaBuzon(t)));
  add([0, PTA.y - .2, 1.2], () => malla(c, -.75, .75, PTA.y - .12, 2.35, mallaPuerta(t)));
  add([-1.95, CAL.y, .5], () => calendario(c, t));
  POSTES.forEach(([x, y], k) => add([x, y, .4], () => poste(c, t, k)));
  add([0, CAJA.y1 + .1, 1.2], () => caja(c, t, "atras"));
  add([BX, BY, RB], () => agenteMundo(c, t, h1, h2));
  add([0, CAJA.y0 - .2, 1.2], () => caja(c, t, "frente"));
  if (fila) {
    CAPAS.forEach((cp, i) => add([0, cp.y, 1.1], () => capa(c, t, i)));
    for (const v of vuelosFila(t)) add([v.x, v.y, v.z], () => { const q = Pv([v.x, v.y, v.z + .12]); if (q) { c.save(); c.globalAlpha = v.a; papelito(c, q.x, q.y, q.s / 110 * .95, v.giro, ROJO); c.restore(); } });
  }
  for (const v of vuelos(c, t)) add(v.p, () => v.f());
  L.sort((a, b) => b.d - a.d).forEach((o) => o.f());

  // encima de todo: lo que va en las manos
  if (h1) enMano1(c, t, h1);
  const pr = h2 ? h2.s / 110 : 1;
  const an = quienTieneAnillo(t, h1, h2, tuP);
  const sinTercera = t > ev.quita && t < ev.devuelve;
  if (an) llavero(c, t, an, pr * (t < ev.sube ? 1 : 1.05), sinTercera);
  // tu mano
  if (tuP) {
    const g = clamp(tuP.s / 110 * 1.05, .8, 2.6);
    const ax = 1320, ay = 1760;
    brazo(c, ax, ay, tuP.x, tuP.y, 70 * g, tu.abre, TINTA, 1, g * 1.18);
    brazo(c, ax, ay, tuP.x, tuP.y, 70 * g, tu.abre, "#F7F4EC", 1, g);
    if (t < ev.suelta) corazon(c, tuP.x - 4 * g, tuP.y - 34 * g, g * .95, .08 * vaiven(t, 1.1));
    if (sinTercera) { const k3 = pr * 1.05; llave(c, tuP.x - 6, tuP.y + 14 * g, .25 * vaiven(t, 1.3) + vaivenLlave(t, 2) * .6, k3 * .78, rojoLlave(t, 2), 3); }
    if (t > ev.cinta - .5 && t < ev.cinta) { c.save(); c.translate(tuP.x - 30 * g, tuP.y - 10 * g); c.rotate(-.5); c.fillStyle = CINTA; c.fillRect(-44 * g, -10 * g, 88 * g, 20 * g); c.restore(); }
  }
  // el corazón que se cae
  if (t >= ev.suelta && t < ev.suelta + 1.6) {
    const d = t - ev.suelta, q = Pv(manoTu(ev.suelta).p);
    if (q) { const g = q.s / 110 * 1.05; corazon(c, q.x - 4 * g + 70 * Math.sin(d * 4.5) * d, q.y - 34 * g + 1100 * d * d, g * .95, .08 + d * 2.4 * Math.sin(d * 3)); }
  }
  etiquetas(c, t);
  if (fila) tarjetasPide(c, t);
  tarjetaPago(c, t);
  c.restore();
  rotulos(c, t);
}

/** Lo que vuela por la mesa: sobres, el papelito del extraño, tarjetas, aviones. */
function vuelos(c: C, t: number): { p: P3; f: () => void }[] {
  const out: { p: P3; f: () => void }[] = [];
  const bill = (p: P3, f: (q: Pt) => void) => out.push({ p, f: () => { const q = Pv(p); if (q) f(q); } });
  const k0 = (q: Pt) => q.s / 110;
  // sobres de extraños que salen de la ranura (acto 2)
  ev.sobres.forEach((ti, i) => {
    if (t < ti || t > ev.quita + .5) return;
    const d = t - ti, dest: P3 = [-2.7 + (i - 1) * .55, -.15 - i * .12, .04 + i * .03];
    const k = ease.outCubic(prog(d, 0, .5)), z = d < .5 ? lerp(RANURA[2], dest[2], k * k) + .4 * Math.sin(Math.PI * k) : dest[2];
    const p: P3 = [lerp(RANURA[0], dest[0], k), lerp(RANURA[1], dest[1], k), z];
    const a = 1 - smooth(prog(t, ev.quita, ev.quita + .4));
    bill(p, (q) => { c.save(); c.globalAlpha = a; sobre(c, q.x, q.y, k0(q) * .62, (i - 1) * .3 + (1 - k) * 1.2, 1); c.restore(); });
  });
  // avión de papel (acto 2) y mensajes enviados (acto 4)
  for (const ta of [ev.avion, ev.envia]) {
    if (t < ta || t > ta + 1.2) continue;
    const k = prog(t, ta, ta + 1.05), p0: P3 = [-.2, -1.55, 2.15], p1: P3 = [0, PTA.y, 1.5], p2: P3 = [0, PTA.y + 2.2, 2.1];
    const p = k < .75 ? L3(p0, p1, ease.inOutCubic(k / .75)) : L3(p1, p2, (k - .75) / .25);
    p[2] += .5 * Math.sin(Math.PI * Math.min(k / .75, 1));
    const q0 = Pv(p), q1 = Pv(k < .75 ? L3(p0, p1, ease.inOutCubic(k / .75 + .02)) : p2);
    const ang = q0 && q1 ? Math.atan2(q1.y - q0.y, q1.x - q0.x) : 0;
    bill(p, (q) => { c.save(); c.globalAlpha = 1 - smooth(prog(k, .85, 1)); if (ta === ev.avion) avion(c, q.x, q.y, k0(q) * .8, ang); else sobre(c, q.x, q.y, k0(q) * .62, ang * .3); c.restore(); });
  }
  // el papelito del extraño por el camino (acto 3)
  const recorrido = (ts: [number, number][], conCarta: number, carta: string, topa: number | null, salta = 0) => {
    if (t < ts[0][0] || t > ts[ts.length - 1][0] + (topa ? 1.6 : .2)) return;
    let u = ts[0][1];
    for (let i = 1; i < ts.length; i++) if (t >= ts[i - 1][0]) u = lerp(ts[i - 1][1], ts[i][1], smooth(prog(t, ts[i - 1][0], ts[i][0])));
    let [x, y] = enRuta(u), z = .08 + .06 * Math.abs(Math.sin(t * 9)), gi = .1 * Math.sin(t * 7);
    if (topa !== null && t > topa) { const d = t - topa; y -= .5 * ease.outCubic(prog(d, 0, .3)); z = .08 + .45 * Math.sin(Math.PI * clamp(d / .3)) * Math.exp(-d * 3); gi = d * 4; }
    const sale = Math.max(0, u - U(IA));
    const a = topa !== null ? 1 - smooth(prog(t, ev.lazo - .4, ev.lazo)) : 1 - smooth(prog(u, .97, 1));
    // el sobre de donde sale
    if (t < ts[0][0] + .3) { const k = prog(t, ts[0][0], ts[0][0] + .3); bill([lerp(RANURA[0], x, k), lerp(RANURA[1], y, k), lerp(RANURA[2], .1, k)], (q) => sobre(c, q.x, q.y, k0(q) * .62, 0, 1)); return; }
    bill([x, y, z + salta * 0 + sale * 0], (q) => {
      c.save(); c.globalAlpha = a;
      papelito(c, q.x, q.y - 12 * k0(q), k0(q) * 1.15, gi);
      if (t > conCarta) tarjeta(c, q.x + 24 * k0(q), q.y - 52 * k0(q), k0(q) * .95, gi * .5 - .15, carta);
      c.restore();
    });
  };
  recorrido([[ev.sobre1, 0], [ev.sobre1 + .3, .015], [ev.sobre1 + .62, U(IB)], [ev.agarra1, U(IF)], [ev.choca, U(IP) - .012]], ev.agarra1, "", ev.choca);
  recorrido([[ev.sobre2, 0], [ev.sobre2 + .3, .015], [ev.lee2 - .1, U(IB)], [ev.lee2 + .12, U(IB) + .01], [ev.agarra2, U(IF)], [ev.sale, U(IP)], [ev.sale + .25, U(IA)], [ev.sale + 1.5, 1]], ev.agarra2, "mamá", null);
  // la tarjeta de mamá asoma del fichero (acto 2)
  if (t > ev.mama - .1 && t < ev.mama + 1.6) {
    const k = ease.outBack(prog(t, ev.mama - .1, ev.mama + .2), 1.5) * (1 - smooth(prog(t, ev.mama + 1.1, ev.mama + 1.5)));
    bill([2.5, FCH.y0 - DR.sale + .45, DR.z1 + .4 + k * .8], (q) => { c.save(); c.globalAlpha = clamp(k * 2); tarjeta(c, q.x, q.y, k0(q) * (.7 + .6 * k), -.06, "mamá"); c.restore(); });
  }
  // los correos que recibe y la tarjeta que lee (acto 4)
  ev.recibe.forEach((ti, i) => {
    if (t < ti || t > ev.envia + .1) return;
    const k = ease.outCubic(prog(t, ti, ti + .32)), m = mano1(t);
    const p: P3 = [lerp(RANURA[0], m[0], k), lerp(RANURA[1], m[1], k), lerp(RANURA[2], m[2] + .18 + i * .08, k) + .3 * Math.sin(Math.PI * k)];
    bill(p, (q) => sobre(c, q.x, q.y - 10 * k0(q), k0(q) * .6, (i - 1) * .25, 1));
  });
  if (t > ev.lee + .2 && t < ev.etqC + .9) {
    const m = mano2(t);
    bill([m[0], m[1] - .05, m[2] + .25], (q) => { c.save(); c.globalAlpha = 1 - smooth(prog(t, ev.etqC + .6, ev.etqC + .9)); tarjeta(c, q.x, q.y - 16 * k0(q), k0(q) * .75, -.08, ""); c.restore(); });
  }
  // filtros: lo que entra rebota, lo que sale se queda
  if (t > ev.sobreE - .05 && t < ev.filtroS + .4) {
    const d = t - ev.sobreE, yHit = BZN.y0 - .3, k = clamp(d / (ev.choqueE - ev.sobreE));
    let y = lerp(RANURA[1], yHit, k), z = RANURA[2] - .25;
    if (t > ev.choqueE) { const r = t - ev.choqueE; y = yHit + .12 * Math.sin(Math.min(r, .25) * 12) * Math.exp(-r * 6) + .55 * smooth(prog(r, .45, .85)); }
    const tache = prog(t, ev.choqueE + .1, ev.choqueE + .3), a = 1 - smooth(prog(t, ev.choqueE + .7, ev.choqueE + .95));
    bill([RANURA[0], y, z], (q) => { c.save(); c.globalAlpha = a; sobre(c, q.x, q.y, k0(q) * .7, .05, 1, tache); c.restore(); });
  }
  if (t > ev.tarjetaS && t < ev.calendario + .3) {
    const yHit = PTA.y - .45, p0: P3 = [2.45, -.45, 1.3], p1: P3 = [.1, yHit, 1.25];
    const k = ease.inOutCubic(prog(t, ev.tarjetaS, ev.choqueS)), r = Math.max(t - ev.choqueS, 0);
    const p = L3(p0, p1, k); p[2] += .4 * Math.sin(Math.PI * k) - (r > .35 ? 1.2 * ease.inCubic(prog(r, .35, .75)) : 0); p[1] -= .1 * Math.sin(Math.min(r, .25) * 12) * Math.exp(-r * 6);
    const tache = prog(t, ev.choqueS + .1, ev.choqueS + .3), a = 1 - smooth(prog(t, ev.calendario - .2, ev.calendario + .2));
    bill(p, (q) => { c.save(); c.globalAlpha = a; tarjeta(c, q.x, q.y, k0(q) * .7, .1 + r * 2, "mamá", tache); c.restore(); });
  }
  return out;
}

function etiquetas(c: C, t: number) {
  const sale = 1 - smooth(prog(t, ev.barandas - .3, ev.barandas + .1));
  const rojo = smooth(prog(t, ev.tres - .1, ev.tres + .15));
  for (const [ti, p, txt] of [[ev.etqC, [2.7, 1.1, 2.2], "contactos"], [ev.etqB, [-2.7, 1.2, 2.4], "correos"], [ev.etqP, [0, PTA.y, 3.3], "mensajes"]] as [number, P3, string][]) {
    const k = ease.outBack(prog(t, ti - .05, ti + .25), 1.8);
    const q = Pv(p); if (!q || k <= 0) continue;
    etiqueta(c, q.x, q.y, txt, clamp(k) * 1.25, clamp(k * 2) * sale, rojo);
  }
}
function tarjetaPago(c: C, t: number) {
  if (t < ev.pago - .1 || t > ev.giro + .9) return;
  const k = ease.outBack(prog(t, ev.pago - .1, ev.pago + .2), 1.7), va = smooth(prog(t, ev.giro + .1, ev.giro + .8));
  const q = Pv([.95, -2.65, 3.0 - va * .3]); if (!q) return;
  const g = q.s / 110 * .95 * (1 - va * .6);
  c.save(); c.globalAlpha = clamp(k * 2) * (1 - va); c.translate(q.x, q.y); c.rotate(.04 * vaiven(t, 2.2)); c.scale(g * k, g * k);
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.roundRect(-150, -100, 300, 200, 12); c.fill(); c.stroke();
  texto(c, "¿pago?", 0, -18, { fuente: serif(82, true), color: TINTA });
  for (const [x, txt, col] of [[-62, "sí", TINTA], [62, "no", ACENTO]] as [number, string, string][]) {
    c.strokeStyle = col; c.lineWidth = 4; c.beginPath(); c.roundRect(x - 50, 28, 100, 52, 26); c.stroke();
    texto(c, txt, x, 66, { fuente: serif(44, true), color: col });
  }
  c.restore();
}

function polvo(c: C, t: number) {
  const r = azar(9);
  c.fillStyle = TINTA;
  for (let i = 0; i < 60; i++) {
    const x0 = r() * 1200 - 60, y0 = r() * 2060, v = 14 + r() * 36, f = r() * 6.3, z = 1.6 + r() * 3;
    const y = ((y0 - t * v) % 2060 + 2060) % 2060 - 70, x = x0 + Math.sin(t * .5 + f) * 30;
    c.globalAlpha = .06 + r() * .12; c.fillRect(x, y, z, z);
  }
  c.globalAlpha = 1;
}

export const Pieza: React.FC = () => <Lienzo dibuja={(c, t) => dibuja(c, t)} preparar={() => ({})} />;
