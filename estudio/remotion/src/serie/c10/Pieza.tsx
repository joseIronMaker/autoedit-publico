// Capítulo 10. Todo el video es papel. Las letras G, P y T son bloques sólidos: el contorno sale de la fuente
// de verdad y se extruye en 3D, con caras, sombra y hueco en la mesa. La G escupe hojas, la P se las traga y
// la T cae entera sobre una frase: la lectura vieja salta palabra por palabra y olvida, ésta la cubre de un
// golpe. Esa hoja es el piso cero de una torre de hojas iguales por donde suben cinco puntos. La torre se
// reparte en miles de pedazos, vuelve a crecer sobre ellos y, al final, de lo alto sale la lista: el papel
// se desenrolla como un travesaño y lo que queda en pantalla es la T del principio, ya entendida.
import React from "react";
import { azar, Cam, caida, camara, clamp, ease, lerp, muestreaTexto, prog, resorte, smooth, texto, Vista } from "../../kit";
import { ACENTO, anillo, bola, GRIS, Lienzo, LUZ, mono, NOCHE, PAPEL, rotulo, serif, sombra, TINTA } from "../../marca";
import duracion from "./duracion.json";
import t0 from "./t.json";

export const DURACION = duracion.dur;
type Ctx = CanvasRenderingContext2D;
type V3 = [number, number, number];
type P2 = [number, number];
type M3 = number[];

const TAU = 6.2832;
const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * TAU + f);
const hash = (i: number, j = 0) => { const s = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453; return s - Math.floor(s); };
function tramos(t: number, v0: number, S: [number, number, number, ((x: number) => number)?][]) {
  let v = v0;
  for (const [a, b, x, f] of S) { if (t <= a) break; v = lerp(v, x, (f ?? smooth)(prog(t, a, b))); }
  return v;
}
function linea(c: Ctx, ax: number, ay: number, bx: number, by: number) { c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); }
function circulo(c: Ctx, x: number, y: number, r: number) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }

// ---------- álgebra mínima ----------
const mm = (a: M3, b: M3): M3 => [
  a[0] * b[0] + a[1] * b[3] + a[2] * b[6], a[0] * b[1] + a[1] * b[4] + a[2] * b[7], a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
  a[3] * b[0] + a[4] * b[3] + a[5] * b[6], a[3] * b[1] + a[4] * b[4] + a[5] * b[7], a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
  a[6] * b[0] + a[7] * b[3] + a[8] * b[6], a[6] * b[1] + a[7] * b[4] + a[8] * b[7], a[6] * b[2] + a[7] * b[5] + a[8] * b[8]];
const mv = (m: M3, x: number, y: number, z: number): V3 => [m[0] * x + m[1] * y + m[2] * z, m[3] * x + m[4] * y + m[5] * z, m[6] * x + m[7] * y + m[8] * z];
const rX = (a: number): M3 => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; };
const rY = (a: number): M3 => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
const rZ = (a: number): M3 => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; };
const LZ = Math.hypot(.44, .38, .81), LUZ3: V3 = [-.44 / LZ, .38 / LZ, .81 / LZ];
const SX = .3, SY = -.26;                                               // hacia dónde cae la sombra por unidad de altura

// ---------- el mundo: dónde está cada cosa ----------
const H = 8.8, E = 2.2, KT = 1.27, HT = H * KT;                          // alto y grueso de los bloques; la T es la importante: mide lo que la frase
const XG = -1.1, XP = .9, XT = -.5;
const YG0 = 11.4, YT0 = -11.4, ABRE = 5;
const separa = (t: number) => ease.inOutCubic(prog(t, t0.ycasi, t0.signif + .3));
const yG = (t: number) => YG0 + ABRE * separa(t), yT = (t: number) => YT0 - ABRE * separa(t);
const FT = YT0 - ABRE - HT / 2;                                          // el pie de la T, ya separada
const TX = XT, TY = FT + HT + .18;                                        // la frase queda justo bajo el travesaño cuando la T cae de espaldas
const LX = 9.6, LY = 5;                                                  // una hoja de la torre
const NF = 36, NMAX = 100, DZ_A = 4.2, DZ_B = .62, DZ_C = .3;
const FUENTE = 104, UX = 84;                                             // px de la frase, y cuántos px son una unidad: la frase mide lo que el travesaño
const FRASE = ["mi", "perro", "le", "ladra", "al"];
let XW = [-3.2, -1.6, 0, 1.6, 3.2];                                      // centros de palabra; se miden con la fuente

const V = (x: number, y: number, z: number, yaw: number, pitch: number, dist: number): Vista => ({ tx: x, ty: y, tz: z, yaw, pitch, dist });

// Los puntos: la primera capa los mueve mucho y cada capa siguiente menos. Eso es lo que se ve como «afinar».
const XC = [-3.7, -1.75, .1, 1.95, 3.75], YC = [-.95, 1.05, -1.25, .95, -.8], PHI = [.4, 2.1, 3.9, 1.2, 5.1], PSI = [1.9, .3, 4.4, 2.6, .9];
const base = (f: number, k: number): P2 => { const e = Math.exp(-f / 8); return [XC[k] + .5 * e * Math.sin(.9 * f + PHI[k]), YC[k] + .62 * e * Math.cos(.7 * f + PSI[k])]; };
function PF(v: number, k: number): P2 {
  if (v <= 1) { const b = base(1, k); return [lerp(XW[k], b[0], v), lerp(0, b[1], v)]; }
  return base(v, k);
}
// Quién le importa a quién: filas = la que mira. No es un dato real, es la forma del dibujo: perro mira a ladra y a mi.
const PESOS = [[0, .62, .05, .23, .1], [.32, 0, .05, .52, .11], [.08, .34, 0, .48, .1], [.06, .56, .16, 0, .22], [.05, .12, .22, .61, 0]];

const alto = (t: number) => tramos(t, 0, [[t0.aten - .4, t0.aten + .18, 1, ease.inOutCubic], [t0.sig - .12, t0.capa + .05, 2, ease.inOutCubic], [t0.otra2 - .22, t0.otra2_e - .05, 3, ease.inOutCubic], [t0.capas - .3, t0.anterior + .2, NF - 1, ease.inOutSine]]);
const acomodo = (t: number) => tramos(t, 0, [[t0.aten - .4, t0.aten + .18, .58, ease.inOutCubic], [t0.yse, t0.acom + .34, 1, (x) => ease.outBack(x, 1.5)], [t0.capa + .05, t0.capa_e + .22, 2, (x) => ease.outBack(x, 1.5)], [t0.otra2_e - .08, t0.otra2_e + .18, 3], [t0.capas - .3, t0.anterior + .2, NF - 1, ease.inOutSine]]);
const dzDe = (t: number) => tramos(t, DZ_A, [[t0.decenas - .25, t0.ycada + .3, DZ_B, ease.inOutCubic]]);
function nacePiso(f: number) {
  if (f === 0) return -9;
  if (f === 1) return t0.pasa - .1;
  if (f === 2) return t0.pasa2 - .1;
  if (f === 3) return t0.yotra - .1;
  return t0.decenas - .1 + (f - 4) / (NF - 5) * 1.5;
}
const naceAlta = (f: number) => t0.pudo - .2 + (f / (NMAX - 7)) ** .85 * 1.45;
const naceFinal = (f: number) => (f < NMAX - 6 ? -9 : t0.apil + (f - (NMAX - 6)) * .085);

// ---------- cámara ----------
const CY_INI = -1.5, VUELA = t0.repartir - .5;
const CAM_MACRO = (): V3 => { const p = PF(1, 1); return [TX + p[0], TY + p[1], DZ_A + 2.06]; };
type Clave = { t: number; v: Vista; d?: number; f?: (x: number) => number; arco?: number };
function claves(): Clave[] {
  const m = CAM_MACRO();
  return [
    { t: -9, v: V(0, CY_INI, 0, -.05, 1.22, 27.5) },
    // Órbita de ida y vuelta: las letras se ven por los dos lados. Acaba justo donde acababa antes.
    { t: t0.tres - .14, v: V(0, CY_INI - .4, 0, .4, 1.02, 27), d: .95, f: ease.inOutCubic },
    { t: t0.ycasi - .22, v: V(0, CY_INI, 0, -.3, 1.02, 27.5), d: .72, f: ease.inOutCubic },
    { t: t0.nadie - .05, v: V(0, CY_INI, 0, .13, 1.1, 31), d: t0.ycasi + 1.55 - t0.nadie + .05, f: ease.inOutCubic },
    { t: t0.laG - .14, v: V(XG, YG0 + ABRE - 1.5, 0, .2, 1, 14), d: .62, f: ease.outExpo },
    { t: t0.G + .6, v: V(XG, YG0 + ABRE - 1.5, 0, .25, .97, 13), d: 1.1, f: ease.inOutSine },
    { t: t0.prod - .1, v: V(XG + .4, YG0 + ABRE - 1, 0, .3, .92, 15.5), d: 1.5, f: ease.inOutSine },
    { t: t0.laP - .14, v: V(XP, -1.7, 0, -.22, 1.04, 15.5), d: .55, f: ease.outExpo },
    { t: t0.P + .55, v: V(XP, -1.7, 0, -.17, 1.02, 14.2), d: 1.3, f: ease.inOutSine },
    { t: t0.ya + .1, v: V(XP, -1.7, 0, -.1, .98, 17.5), d: 2.1, f: ease.inOutSine },
    { t: t0.yla - .12, v: V(XT, YT0 - ABRE, 0, .1, 1.08, 16), d: .55, f: ease.outExpo },
    { t: t0.imp - .42, v: V(XT, FT + .2, 6.2, -.14, .12, 13.8), d: .95, f: ease.inOutCubic },
    { t: t0.transf, v: V(XT, FT + .2, 6.2, -.3, .08, 13), d: 1.5, f: ease.inOutSine },
    { t: t0.antes - .1, v: V(TX, TY + .1, 0, 0, 1.24, 12.2), d: .95, f: ease.inOutCubic, arco: .62 },
    { t: t0.redes + .3, v: V(TX, TY + .15, 0, 0, 1.21, 11.2), d: t0.caeT - t0.redes - .3, f: ease.inOutSine },
    { t: t0.primero, v: V(TX, TY - .2, .9, -.36, .68, 13.6), d: 1.5, f: ease.inOutCubic },
    { t: t0.pasa - .1, v: V(TX, TY, DZ_A * .98, -.2, .58, 13), d: 1.3, f: ease.inOutCubic },
    { t: t0.cada - .2, v: V(TX, TY - .25, DZ_A * .92, -.12, .84, 11.8), d: 1, f: ease.inOutCubic },
    { t: t0.ysale - .05, v: V(m[0], m[1] - .15, m[2], -.1, .46, 4.15), d: 1.5, f: ease.inOutCubic },
    { t: t0.yano, v: V(m[0], m[1] - .1, m[2], .05, .43, 3.9), d: 2.6, f: ease.inOutSine },
    { t: t0.entonces - .25, v: V(TX, TY, DZ_A * 2, .16, .72, 13), d: .8, f: ease.outExpo },
    { t: t0.yotra - .12, v: V(TX, TY, DZ_A * 2.95, .3, .7, 13.4), d: .7, f: ease.inOutCubic },
    { t: t0.decenas - .2, v: V(TX, TY, 13.4, .55, .42, 26), d: 1.5, f: ease.inOutCubic },
    { t: t0.ycada, v: V(TX, TY, 13.4, .9, .4, 25.6), d: 2.5, f: ease.inOutSine },
    { t: t0.como, v: V(TX, TY, 13.2, 1.08, .4, 25.4), d: 1.8, f: ease.inOutSine },
    { t: VUELA, v: V(TX, TY + 2, 0, 0, 1.5, 15), d: .8, f: ease.inOutCubic },
    { t: t0.miles - .12, v: V(TX, TY + 19.8, 0, 0, 1.52, 38), d: .75, f: ease.outExpo },
    { t: t0.por - .05, v: V(TX, TY + 2, 13, -.3, .13, 42), d: .85, f: ease.inOutCubic },
    { t: t0.crecer, v: V(TX, TY, 19, -.34, .1, 31), d: 1.3, f: ease.outCubic },
    // ---- el corte a negro: la cámara salta ----
    { t: t0.yeso, v: V(TX, TY, 24.6, -.26, .2, 15), d: .01, f: (x) => x },
    { t: t0.yeso + .02, v: V(TX, TY, 24.2, .12, .2, 14.2), d: t0.neu - t0.yeso, f: (x) => x },
    { t: t0.neu - .3, v: V(TX, TY, 33.2, -.1, .3, 12.9), d: .9, f: ease.inOutCubic },
    { t: t0.apil - .05, v: V(TX, TY, 22, -.42, .2, 29), d: 1.1, f: ease.inOutCubic },
    { t: t0.unat - .25, v: V(TX, TY, 20.9, .4, .17, 35.5), d: 2.3, f: ease.inOutSine },
    { t: t0.ydeesa - .36, v: V(TX, TY, 1, .3, .03, 10.5), d: .5, f: ease.inOutCubic },
    { t: t0.ydeesa + .15, v: V(TX, TY, 30.8, .3, .03, 10.5), d: t0.sale2 - t0.ydeesa - .15, f: (x) => x ** 1.5 },
    { t: t0.sale2 + .42, v: V(TX, TY, 19.9, 0, .045, 40), d: t0.lista - t0.sale2 - .62, f: ease.inOutCubic },
    { t: t0.fin, v: V(TX, TY, 19.9, 0, .045, 41.6), d: 3.4, f: ease.inOutSine },
  ];
}
const KC = claves();
function vista(t: number): Vista {
  let a = KC[0].v;
  for (let i = 1; i < KC.length; i++) {
    const k = KC[i];
    if (t < k.t) break;
    const q = (k.f ?? ease.inOutCubic)(prog(t, k.t, k.t + (k.d ?? 1)));
    a = { tx: lerp(a.tx, k.v.tx, q), ty: lerp(a.ty, k.v.ty, q), tz: lerp(a.tz, k.v.tz, q), yaw: lerp(a.yaw, k.v.yaw, q), pitch: lerp(a.pitch, k.v.pitch, q), dist: a.dist * (k.v.dist / a.dist) ** q * (1 + (k.arco ?? 0) * Math.sin(q * Math.PI)) };
  }
  // Respiración: no se apaga nunca, y su periodo no coincide con nada.
  const m = a.dist > 8 ? 1 : .35;
  return { ...a, yaw: a.yaw + .012 * m * vaiven(t, 5.3), pitch: a.pitch + .009 * m * vaiven(t, 4.1, 1), tx: a.tx + .05 * m * a.dist * .1 * vaiven(t, 6.7, 2), ty: a.ty + .05 * m * a.dist * .1 * vaiven(t, 7.9), dist: a.dist * (1 + .007 * vaiven(t, 3.7)) };
}
const GOLPES: [number, number][] = [
  [t0.g1, 34], [t0.g2, 30], [t0.g3, 42], [t0.son, 15], [t0.tres, 17], [t0.bajaG, 20], [t0.bajaT, 24], [t0.bajaP, 8], [t0.asienta, 12], [t0.paraT, 30], [t0.golpeT, 84], [t0.es + .34, 18], [t0.gram_e - .02, 10], [t0.logica_e - .02, 10], [t0.apil + .03, 14],
];
function temblor(t: number) {
  let x = 0, y = 0;
  for (const [g, a] of GOLPES) if (t > g) { const e = a * Math.exp(-(t - g) * 8); x += e * Math.sin((t - g) * 61) * .55; y += e * Math.sin((t - g) * 47 + .6); }
  // El suelo avisa: algo enorme viene antes de que se vea.
  if (t > t0.frase && t < t0.golpeT) { const e = 9 * prog(t, t0.frase, t0.caeT) ** 2; x += e * Math.sin(t * 73) * .6; y += e * Math.sin(t * 91); }
  return [x, y];
}

// ---------- datos caros, una sola vez ----------
type Glifo = { loops: Float32Array[]; ancho: number };
type D = {
  G: Glifo; P: Glifo; T: Glifo; pts: P2[][]; fib: Float32Array; hojasG: Vuelo[]; hojasP: Vuelo[];
  sx: Float32Array; sy: Float32Array; sz: Float32Array; gx: Float32Array; gy: Float32Array; h: Float32Array; chip: HTMLCanvasElement; chipOn: HTMLCanvasElement;
};
type Vuelo = { b: number; x: number; y: number; vx: number; vy: number; vz: number; a: number; w1: number; w2: number; w3: number; tipo: number; es: number };

/** Sigue el borde de la letra en la fuente real y devuelve lazos suaves: exterior antihorario, agujeros horario. */
function traza(ch: string): Glifo {
  const Z = 340, W = 480, A = 470, BASE = 390;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = A;
  const g = cv.getContext("2d", { willReadFrequently: true })!;
  g.font = serif(Z); g.textAlign = "center"; g.textBaseline = "alphabetic"; g.fillStyle = "#000";
  g.fillText(ch, W / 2, BASE);
  const px = g.getImageData(0, 0, W, A).data;
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < A && px[(y * W + x) * 4 + 3] > 128;
  const sig = new Map<number, number[]>();
  const clave = (x: number, y: number) => y * (W + 2) + x;
  const pon = (a: number, b: number, e: number, f: number) => { const k = clave(a, b); const l = sig.get(k); if (l) l.push(clave(e, f)); else sig.set(k, [clave(e, f)]); };
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let y = 0; y < A; y++) for (let x = 0; x < W; x++) {
    if (!on(x, y)) continue;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x + 1); y0 = Math.min(y0, y); y1 = Math.max(y1, y + 1);
    if (!on(x, y - 1)) pon(x, y, x + 1, y);
    if (!on(x + 1, y)) pon(x + 1, y, x + 1, y + 1);
    if (!on(x, y + 1)) pon(x + 1, y + 1, x, y + 1);
    if (!on(x - 1, y)) pon(x, y + 1, x, y);
  }
  const k = H / (y1 - y0), xc = (x0 + x1) / 2, yc = (y0 + y1) / 2;
  const loops: Float32Array[] = [];
  while (sig.size) {
    const ini = sig.keys().next().value as number;
    const cam: number[] = [];
    let cur = ini;
    for (;;) {
      const l = sig.get(cur); if (!l) break;
      const nx = l.pop()!; if (!l.length) sig.delete(cur);
      cam.push(cur); cur = nx; if (cur === ini) break;
    }
    if (cam.length < 40) continue;
    const n = cam.length, VENT = 4, xs = new Float32Array(n), ys = new Float32Array(n);
    const X = cam.map((q) => q % (W + 2)), Y = cam.map((q) => Math.floor(q / (W + 2)));
    for (let i = 0; i < n; i++) { let a = 0, b = 0; for (let j = -VENT; j <= VENT; j++) { const q = (i + j + n) % n; a += X[q]; b += Y[q]; } xs[i] = a / (2 * VENT + 1); ys[i] = b / (2 * VENT + 1); }
    const PASO = 6, m = Math.floor(n / PASO), out = new Float32Array(m * 2);
    for (let i = 0; i < m; i++) { const q = (m - 1 - i) * PASO; out[i * 2] = (xs[q] - xc) * k; out[i * 2 + 1] = (yc - ys[q]) * k; }   // al revés: exterior antihorario
    loops.push(out);
  }
  return { loops, ancho: (x1 - x0) * k };
}

// Lo que llevan las hojas: siempre escritura de algún tipo (poema, párrafo, código, tabla, partitura, lista). Nada de dibujitos.
const GARABATO = [
  [[-.3, .42, .16, .42], [-.3, .31, .26, .31], [-.3, .2, .06, .2], [-.3, .02, .24, .02], [-.3, -.09, .3, -.09], [-.3, -.2, 0, -.2], [-.3, -.38, .2, -.38], [-.3, -.49, .12, -.49]],
  [[-.36, .46, .36, .46], [-.36, .36, .36, .36], [-.36, .26, .36, .26], [-.36, .16, .36, .16], [-.36, .06, .36, .06], [-.36, -.04, .36, -.04], [-.36, -.14, .36, -.14], [-.36, -.24, .36, -.24], [-.36, -.34, .1, -.34]],
  [[-.34, .42, -.08, .42], [-.2, .28, .24, .28], [-.2, .14, .14, .14], [-.06, 0, .3, 0], [-.06, -.14, .2, -.14], [-.2, -.28, .1, -.28], [-.34, -.42, -.16, -.42]],
  [[-.36, .42, .36, .42], [-.36, .26, .36, .26], [-.36, .1, .36, .1], [-.36, -.06, .36, -.06], [-.36, -.22, .36, -.22], [-.36, -.38, .36, -.38], [-.12, .42, -.12, -.38], [.12, .42, .12, -.38]],
  [[-.36, .36, .36, .36], [-.36, .3, .36, .3], [-.36, .24, .36, .24], [-.36, .18, .36, .18], [-.36, .12, .36, .12], [-.36, -.12, .36, -.12], [-.36, -.18, .36, -.18], [-.36, -.24, .36, -.24], [-.36, -.3, .36, -.3], [-.36, -.36, .36, -.36]],
  [[-.34, .4, -.28, .4], [-.2, .4, .3, .4], [-.34, .22, -.28, .22], [-.2, .22, .18, .22], [-.34, .04, -.28, .04], [-.2, .04, .32, .04], [-.34, -.14, -.28, -.14], [-.2, -.14, .12, -.14], [-.34, -.32, -.28, -.32], [-.2, -.32, .26, -.32]],
];

function prepara(): D {
  const g = document.createElement("canvas").getContext("2d")!;
  g.font = serif(FUENTE);
  const anchoEsp = g.measureText(" ").width;
  const anchos = FRASE.map((w) => g.measureText(w).width);
  const total = anchos.reduce((a, b) => a + b, 0) + anchoEsp * (FRASE.length - 1);
  let x = -total / 2;
  XW = anchos.map((w) => { const m = x + w / 2; x += w + anchoEsp; return m / UX; });
  const pts = FRASE.map((w, i) => muestreaTexto(w, serif(FUENTE), 400, 180, 460, 11 + i));
  const r = azar(10);
  const fib = new Float32Array(2600 * 4);
  for (let i = 0; i < 2600; i++) {
    const a = r() * TAU, l = .06 + r() * .2, X = -34 + r() * 68, Y = -66 + r() * 110;
    fib[i * 4] = X; fib[i * 4 + 1] = Y; fib[i * 4 + 2] = X + Math.cos(a) * l; fib[i * 4 + 3] = Y + Math.sin(a) * l;
  }
  const hojasG: Vuelo[] = [];
  for (let i = 0; i < 18; i++) hojasG.push({ b: i < 3 ? t0.gen_e - .25 + i * .2 : t0.prod - .2 + (i - 3) * .09 + r() * .05, x: XG + (r() - .5) * 2.4, y: yG(99) + (r() - .5) * 3, vx: (r() - .5) * (i < 3 ? 4 : 12), vy: -3 + r() * (i < 3 ? 6 : 12), vz: i < 3 ? 7 : 15 + r() * 8, a: r() * 6, w1: 1 + r() * 3, w2: 1.5 + r() * 3, w3: (r() - .5) * 3, tipo: i % 6, es: 2.3 + r() * 1.2 });
  const hojasP: Vuelo[] = [];
  const NP = 130, durP = t0.antesde + .15 - t0.ya;
  for (let i = 0; i < NP; i++) hojasP.push({ b: t0.ya - .35 + durP * (i / NP) ** .72, x: 0, y: 0, vx: 0, vy: 0, vz: 0, a: r() * TAU, w1: 1 + r() * 2, w2: 1 + r() * 2, w3: 7 + r() * 5, tipo: i % 6, es: 2 + r() * .9 });
  // Los pedazos: 36 hojas de 12×7 son 3 024 fichas, y caen barajadas en una rejilla de 42×72: exacta, sin huecos.
  const NX = 12, NY = 7, CO = 42, RO = 72, N = NF * NX * NY, PAS = .92;
  const sx = new Float32Array(N), sy = new Float32Array(N), sz = new Float32Array(N), gx = new Float32Array(N), gy = new Float32Array(N), h = new Float32Array(N);
  const orden = Array.from({ length: N }, (_, i) => i);
  for (let i = N - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [orden[i], orden[j]] = [orden[j], orden[i]]; }
  for (let i = 0; i < N; i++) {
    const f = Math.floor(i / (NX * NY)), q = i % (NX * NY), ix = q % NX, iy = Math.floor(q / NX);
    sx[i] = TX + ((ix + .5) / NX - .5) * LX; sy[i] = TY + ((iy + .5) / NY - .5) * LY; sz[i] = f * DZ_B;
    const o = orden[i], cx = o % CO, cy = Math.floor(o / CO);
    gx[i] = TX + (cx - CO / 2 + .5) * PAS; gy[i] = TY + (cy - RO / 2 + .5) * PAS; h[i] = r();
  }
  const sprite = (on: boolean) => {
    const cv = document.createElement("canvas"); cv.width = 64; cv.height = 64;
    const q = cv.getContext("2d")!;
    q.fillStyle = "#6e6c66";
    for (let i = 0; i < 6; i++) { const u = 13 + i * 7.6; q.fillRect(u, 0, 3.4, 64); q.fillRect(0, u, 64, 3.4); }
    q.fillStyle = "#141413"; q.fillRect(7, 7, 50, 50);
    q.fillStyle = "#2c2c2a"; q.fillRect(9, 9, 46, 3);
    q.fillStyle = on ? ACENTO : "#34332f"; q.fillRect(19, 19, 26, 26);
    if (on) { q.fillStyle = "#E9896C"; q.fillRect(23, 23, 18, 18); }
    return cv;
  };
  return { G: traza("G"), P: traza("P"), T: traza("T"), pts, fib, hojasG, hojasP, sx, sy, sz, gx, gy, h, chip: sprite(false), chipOn: sprite(true) };
}

// ---------- el papel de la mesa ----------
function fibras(c: Ctx, cam: Cam, d: D, alfa = 1) {
  c.save(); c.strokeStyle = `rgba(74,70,58,${.085 * alfa})`; c.lineWidth = 1; c.beginPath();
  for (let i = 0; i < 2600; i++) {
    const A = cam.p(d.fib[i * 4], d.fib[i * 4 + 1], 0), B = A && cam.p(d.fib[i * 4 + 2], d.fib[i * 4 + 3], 0);
    if (A && B && A.x > -40 && A.x < 1120 && A.y > -40 && A.y < 1960) { c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); }
  }
  c.stroke(); c.restore();
}
function motas(c: Ctx, t: number, color: string, alfa: number, cam: Cam) {
  if (alfa <= .01) return;
  const r = azar(55), tv = cam.v;
  c.save(); c.fillStyle = color;
  for (let i = 0; i < 80; i++) {
    const X = (r() - .5) * 2, Y = (r() - .5) * 2, Z = r(), f = r() * TAU, vel = .4 + r() * .8, a = r();
    const e = tv.dist * .55;
    const P = cam.p(tv.tx + X * e + .4 * e * .1 * Math.sin(t * .31 * vel + f), tv.ty + Y * e + .4 * e * .1 * Math.cos(t * .27 * vel + f), tv.tz + (Z - .5) * e + ((t * vel * .06 + r()) % 1) * e * .14);
    if (!P) continue;
    c.globalAlpha = alfa * (.05 + a * .16);
    circulo(c, P.x, P.y, clamp(P.s * .022, 1, 3.4));
  }
  c.restore();
}

// ---------- letras sólidas ----------
type Pose = (u: number, v: number, w: number) => V3;

function solido(c: Ctx, cam: Cam, g: Glifo, pose: Pose, R: M3, o: { rayas?: number; alfa?: number; lado?: number } = {}) {
  const vis = cam.pos, loops = g.loops;
  const F: V3[][] = [], B: V3[][] = [];
  const pf: ({ x: number; y: number } | null)[][] = [], pb: ({ x: number; y: number } | null)[][] = [];
  for (const L of loops) {
    const n = L.length / 2, a: V3[] = [], b: V3[] = [], pa: ({ x: number; y: number } | null)[] = [], pz: ({ x: number; y: number } | null)[] = [];
    for (let i = 0; i < n; i++) {
      const f = pose(L[i * 2], L[i * 2 + 1], E), h = pose(L[i * 2], L[i * 2 + 1], 0);
      a.push(f); b.push(h); pa.push(cam.p(f[0], f[1], f[2])); pz.push(cam.p(h[0], h[1], h[2]));
    }
    F.push(a); B.push(b); pf.push(pa); pb.push(pz);
  }
  const Q: { d: number; a: { x: number; y: number }; b: { x: number; y: number }; e: { x: number; y: number }; f: { x: number; y: number }; v: number }[] = [];
  loops.forEach((L, q) => {
    const n = L.length / 2;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, du = L[j * 2] - L[i * 2], dv = L[j * 2 + 1] - L[i * 2 + 1], ln = Math.hypot(du, dv) || 1;
      const N = mv(R, dv / ln, -du / ln, 0), m = F[q][i];
      if (N[0] * (vis[0] - m[0]) + N[1] * (vis[1] - m[1]) + N[2] * (vis[2] - m[2]) <= 0) continue;
      const a = pf[q][i], b = pf[q][j], e = pb[q][j], f = pb[q][i];
      if (!a || !b || !e || !f) continue;
      const l = N[0] * LUZ3[0] + N[1] * LUZ3[1] + N[2] * LUZ3[2];
      const dd = (m[0] - vis[0]) ** 2 + (m[1] - vis[1]) ** 2 + (m[2] - vis[2]) ** 2;
      Q.push({ d: dd, a, b, e, f, v: Math.round(lerp(26, o.lado ?? 112, clamp(l * .55 + .45) ** 1.5)) });
    }
  });
  Q.sort((x, y) => y.d - x.d);
  c.save(); c.globalAlpha = o.alfa ?? 1; c.lineJoin = "round"; c.lineWidth = 1.2;
  for (const q of Q) {
    const k = `rgb(${q.v},${q.v - 1},${q.v - 5})`;
    c.fillStyle = k; c.strokeStyle = k;
    c.beginPath(); c.moveTo(q.a.x, q.a.y); c.lineTo(q.b.x, q.b.y); c.lineTo(q.e.x, q.e.y); c.lineTo(q.f.x, q.f.y); c.closePath(); c.fill(); c.stroke();
  }
  const NF_ = mv(R, 0, 0, 1), m0 = pose(0, 0, E);
  const frente = NF_[0] * (vis[0] - m0[0]) + NF_[1] * (vis[1] - m0[1]) + NF_[2] * (vis[2] - m0[2]) > 0;
  const cara = frente ? pf : pb;
  const entero = cara.every((l) => l.every(Boolean));
  if (entero) {
    c.beginPath();
    for (const l of cara) { l.forEach((p, i) => { if (i === 0) c.moveTo(p!.x, p!.y); else c.lineTo(p!.x, p!.y); }); c.closePath(); }
    const A = cam.p(...pose(-H * .4, H * .5, E)), Z = cam.p(...pose(H * .4, -H * .5, E));
    if (frente) {
      if (A && Z) {
        const gr = c.createLinearGradient(A.x, A.y, Z.x, Z.y);
        gr.addColorStop(0, "#343432"); gr.addColorStop(.38, "#191918"); gr.addColorStop(1, "#080808");
        c.fillStyle = gr;
      } else c.fillStyle = TINTA;
    } else { const gr = c.createLinearGradient(A?.x ?? 0, A?.y ?? 0, Z?.x ?? 0, Z?.y ?? 1000); gr.addColorStop(0, "#2a2a29"); gr.addColorStop(1, "#0c0c0c"); c.fillStyle = gr; }
    c.fill("evenodd");
    if (frente && (o.rayas ?? 0) > 0) {
      c.save(); c.clip("evenodd");
      c.strokeStyle = PAPEL; c.globalAlpha = (o.alfa ?? 1) * clamp(o.rayas!) * .85; c.lineWidth = 2.2 + 2.4 * clamp(o.rayas! - 1);
      for (let i = 1; i < 30; i++) {
        const a = cam.p(...pose(-H, -H / 2 + i * H / 30, E)), b = cam.p(...pose(H, -H / 2 + i * H / 30, E));
        if (a && b) linea(c, a.x, a.y, b.x, b.y);
      }
      c.restore();
    }
    c.strokeStyle = "rgba(255,255,255,.2)"; c.lineWidth = 2; c.stroke();
  }
  c.restore();
}

function sombraSolido(c: Ctx, cam: Cam, g: Glifo, pose: Pose, fuerza = 1) {
  c.beginPath();
  let altoM = 0;
  for (const L of g.loops) {
    const n = L.length / 2; let prim = true;
    for (let i = 0; i < n; i += 2) {
      const f = pose(L[i * 2], L[i * 2 + 1], E), h = pose(L[i * 2], L[i * 2 + 1], 0);
      const q = f[2] > h[2] ? f : h;
      altoM = Math.max(altoM, q[2]);
      const P = cam.p(q[0] + q[2] * SX, q[1] + q[2] * SY, 0);
      if (!P) continue;
      if (prim) { c.moveTo(P.x, P.y); prim = false; } else c.lineTo(P.x, P.y);
    }
    c.closePath();
  }
  const pen = (cam.f / cam.v.dist) * (.12 + altoM * .05), al = fuerza / (1 + altoM * .1);
  c.save(); c.lineJoin = "round"; c.lineCap = "round";
  for (let i = 0; i < 12; i++) { c.lineWidth = (3.2 - i * .27) * pen; c.strokeStyle = `rgba(22,20,16,${(.012 + i * .0026) * al})`; c.stroke(); }
  c.fillStyle = `rgba(22,20,16,${.3 * al})`; c.fill("evenodd");
  c.restore();
}

/** El hueco que deja la letra en la mesa: paredes interiores y fondo con una luz que sube. */
function hueco(c: Ctx, cam: Cam, g: Glifo, x: number, y: number, rz: number, abre: number, tono: string) {
  if (abre <= 0) return;
  const R = rZ(rz), Pd = 5.5;
  const W = (u: number, v: number, z: number): V3 => { const q = mv(R, u, v, 0); return [x + q[0], y + q[1], z]; };
  c.save(); c.beginPath();
  for (const L of g.loops) {
    const n = L.length / 2;
    for (let i = 0; i < n; i++) { const w = W(L[i * 2], L[i * 2 + 1], 0), P = cam.p(w[0], w[1], w[2]); if (P) { if (i === 0) c.moveTo(P.x, P.y); else c.lineTo(P.x, P.y); } }
    c.closePath();
  }
  c.fillStyle = "#0a0a0a"; c.fill("evenodd"); c.clip("evenodd");
  const Q: { d: number; pts: { x: number; y: number }[]; v: number }[] = [];
  for (const L of g.loops) {
    const n = L.length / 2;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, du = L[j * 2] - L[i * 2], dv = L[j * 2 + 1] - L[i * 2 + 1], ln = Math.hypot(du, dv) || 1;
      const N = mv(R, -dv / ln, du / ln, 0);                            // hacia adentro del hueco
      const a = W(L[i * 2], L[i * 2 + 1], 0), b = W(L[j * 2], L[j * 2 + 1], 0), e = W(L[j * 2], L[j * 2 + 1], -Pd), f = W(L[i * 2], L[i * 2 + 1], -Pd);
      const vis = cam.pos;
      if (N[0] * (vis[0] - a[0]) + N[1] * (vis[1] - a[1]) + N[2] * (vis[2] - a[2]) <= 0) continue;
      const pa = cam.p(...a), pb = cam.p(...b), pe = cam.p(...e), pf = cam.p(...f);
      if (!pa || !pb || !pe || !pf) continue;
      const l = N[0] * LUZ3[0] + N[1] * LUZ3[1] + N[2] * LUZ3[2];
      Q.push({ d: -((a[0] - vis[0]) ** 2 + (a[1] - vis[1]) ** 2), pts: [pa, pb, pe, pf], v: Math.round(lerp(120, 225, clamp(l * .5 + .5))) });
    }
  }
  Q.sort((p, q) => p.d - q.d);
  for (const q of Q) {
    const gr = c.createLinearGradient(q.pts[0].x, q.pts[0].y, q.pts[3].x, q.pts[3].y);
    gr.addColorStop(0, `rgb(${q.v},${q.v - 2},${q.v - 8})`); gr.addColorStop(1, "#141412");
    c.fillStyle = gr; c.strokeStyle = gr; c.lineWidth = 1;
    c.beginPath(); c.moveTo(q.pts[0].x, q.pts[0].y); for (let i = 1; i < 4; i++) c.lineTo(q.pts[i].x, q.pts[i].y); c.closePath(); c.fill(); c.stroke();
  }
  const P = cam.p(x, y, -Pd);
  if (P) {
    const r = 5.5 * P.s, gr = c.createRadialGradient(P.x, P.y, 0, P.x, P.y, r);
    gr.addColorStop(0, tono); gr.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = gr; c.fillRect(P.x - r, P.y - r, 2 * r, 2 * r);
  }
  c.restore();
}

/** Una hoja que vuela, con lo que lleva escrito. */
function hojaVuelo(c: Ctx, cam: Cam, x: number, y: number, z: number, R: M3, w: number, tipo: number, alfa = 1) {
  const h = w * 1.3;
  const q = (u: number, v: number) => { const p = mv(R, u * w, v * h, 0); return cam.p(x + p[0], y + p[1], z + p[2]); };
  const a = q(-.5, .5), b = q(.5, .5), e = q(.5, -.5), f = q(-.5, -.5);
  if (!a || !b || !e || !f) return;
  const n = mv(R, 0, 0, 1), l = Math.abs(n[0] * LUZ3[0] + n[1] * LUZ3[1] + n[2] * LUZ3[2]);
  const v = Math.round(lerp(216, 254, l));
  c.save(); c.globalAlpha = alfa; c.fillStyle = `rgb(${v},${v - 1},${v - 6})`; c.strokeStyle = "#45433e"; c.lineWidth = 1.8; c.lineJoin = "round";
  c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(e.x, e.y); c.lineTo(f.x, f.y); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = TINTA; c.lineWidth = Math.max(1.6, a.x === b.x ? 2 : Math.hypot(a.x - b.x, a.y - b.y) * .016); c.lineCap = "round"; c.beginPath();
  for (const [p0, p1, p2, p3] of GARABATO[tipo]) { const A = q(p0, p1), B = q(p2, p3); if (A && B) { c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); } }
  c.stroke(); c.restore();
}

function polvoGolpe(c: Ctx, cam: Cam, t: number, ti: number, x: number, y: number, Rm: number, sem: number) {
  const e = t - ti;
  if (e < 0 || e > 1.1) return;
  const r = azar(sem);
  anillo(c, cam, x, y, Rm * ease.outCubic(e / .8), TINTA, (1 - clamp(e / .8)) * .34, 3);
  c.save(); c.fillStyle = TINTA;
  for (let i = 0; i < 70; i++) {
    const a = r() * TAU, v = Rm * (.5 + r() * .8), s = 2 + r() * 4, de = r() * .1, q = 1 - Math.exp(-(e - de) * 3.4);
    if (e < de) continue;
    const zz = Math.max(0, 5 * r() * (e - de) - 6 * (e - de) ** 2);
    const P = cam.p(x + Math.cos(a) * v * q, y + Math.sin(a) * v * q, zz);
    if (!P) continue;
    c.globalAlpha = (1 - e / 1.1) * .55; c.fillRect(P.x, P.y, s, s);
  }
  c.restore();
}

const caidaZ = (t: number, ti: number, alto_: number, g = 150) => (t < ti ? alto_ : caida(t - ti, alto_, .2, g).z);
// Caen sobre la línea de vista: en el cuadro 0 la G ya llena la pantalla y solo se encoge hasta su lugar.
const CX0 = -.47, CY0 = CY_INI - 9.4, CZ0 = 25.8;
const vistaX = (X: number, z: number) => lerp(X, CX0, z / CZ0), vistaY = (Y: number, z: number) => lerp(Y, CY0, z / CZ0);
const llegaG = t0.g1 - Math.sqrt(2 * 19 / 150), llegaP = t0.g2 - Math.sqrt(2 * 12 / 150), llegaT = t0.g3 - Math.sqrt(2 * 12 / 150);

// ---------- el arranque: «son tres letras» es un péndulo de Newton ----------
// La T golpea a la P en «son», la P a la G en «tres»; la G sale girando y en «letras» la T da la vuelta entera y
// la P gira como moneda. En «y casi» se levantan en ola, en «nadie» dicen que no, y en «sabe» se dejan caer.
// Todo vuelve a cero en `FIN_AP`: de ahí en adelante manda el código de siempre.
const FIN_AP = t0.asienta + .08;
type Mov = { dy: number; dz: number; rx: number; ry: number; rz: number };
function movLetra(t: number, i: number): Mov {
  let dy = 0, dz = 0, rx = 0, ry = 0, rz = 0;
  if (i === 2) {                                                         // T
    dy += 1.45 * ease.inCubic(prog(t, t0.g3 + .1, t0.son)) * (1 - ease.outCubic(prog(t, t0.son, t0.son + .24)));
    const p = prog(t, t0.letras, t0.bajaT);
    if (p > 0 && p < 1) { dz += 7.4 * 4 * p * (1 - p); rx += TAU * ease.inOutSine(p); }
  } else if (i === 1) {                                                  // P
    const ida = prog(t, t0.son, t0.tres) ** .7, vuelve = ease.outCubic(prog(t, t0.tres, t0.tres + .26));
    dy += 2.55 * ida * (1 - vuelve); rz += .16 * ida * (1 - vuelve);
    const p = prog(t, t0.letras + .02, t0.bajaP);
    if (p > 0 && p < 1) { dz += 3 * 4 * p * (1 - p); rz += TAU * ease.outCubic(p); }
  } else {                                                               // G
    const p = prog(t, t0.tres, t0.bajaG);
    if (p > 0 && p < 1) { dy += 2.3 * Math.sin(p * Math.PI); dz += 7.2 * 4 * p * (1 - p); ry += TAU * ease.inOutSine(p); }
  }
  // Rebote de cada aterrizaje.
  const ti = [t0.bajaG, t0.bajaP, t0.bajaT][i];
  if (t > ti) dz += .9 * Math.exp(-(t - ti) * 7) * Math.abs(Math.sin((t - ti) * 15));
  const s = t0.ycasi + .02 + i * .12, L = H * (i === 2 ? KT : 1) / 2;
  // La T se deja caer antes: el rótulo aparece justo donde ella estaba levantada.
  const fin = i === 2 ? t0.sabe - .2 : t0.sabe;
  const a = [.82, .82, .6][i] * ease.outBack(prog(t, s, s + .3), 1.4) * (1 - ease.inCubic(prog(t, fin, fin + .22)));
  rx += a; dz += L * Math.sin(Math.max(a, 0)); dy -= L * (1 - Math.cos(a));
  if (t > t0.nadie) rz += .3 * Math.sin((t - t0.nadie) * 25 + i * .7) * Math.exp(-(t - t0.nadie) * 1.5) * (1 - smooth(prog(t, t0.sabe, t0.asienta)));
  return { dy, dz, rx, ry, rz };
}

function arranque(c: Ctx, cam: Cam, t: number, d: D) {
  const L = [
    { g: d.G, k: 1, X: XG, Y: yG(t), rz: .05, ini: llegaG, h: 19, pie: 0 },
    { g: d.P, k: 1, X: XP, Y: 0, rz: -.035, ini: llegaP, h: 12, pie: 0 },
    { g: d.T, k: KT, X: XT, Y: yT(t), rz: 0, ini: llegaT, h: 12, pie: HT / 2 },
  ];
  const todo = L.flatMap((q, i) => {
    if (i > 0 && t <= q.ini) return [];
    const z = caidaZ(t, q.ini, q.h), m = movLetra(t, i);
    const ox = vistaX(q.X, z), oy = vistaY(q.Y - q.pie, z) + q.pie + m.dy;
    const R = mm(rZ(q.rz + m.rz), mm(rX(m.rx), rY(m.ry)));
    const pose: Pose = (u, v, w) => { const p = mv(R, u * q.k, v * q.k, w - E / 2); return [ox + p[0], oy + p[1], z + m.dz + E / 2 + p[2]]; };
    return [{ g: q.g, pose, R, alto: z + m.dz }];
  });
  for (const q of todo) sombraSolido(c, cam, q.g, q.pose);
  todo.sort((a, b) => a.alto - b.alto);
  for (const q of todo) solido(c, cam, q.g, q.pose, q.R);
  polvoGolpe(c, cam, t, t0.g1, XG, yG(t), 10, 3);
  polvoGolpe(c, cam, t, t0.g2, XP, 0, 10, 5);
  polvoGolpe(c, cam, t, t0.son, .2, -5.1, 5, 31);
  polvoGolpe(c, cam, t, t0.tres, 0, 5.7, 5, 37);
  polvoGolpe(c, cam, t, t0.bajaG, XG, yG(t), 9, 41);
  polvoGolpe(c, cam, t, t0.bajaT, XT, yT(t), 11, 43);
}

function escenaLetras(c: Ctx, cam: Cam, t: number, d: D) {
  if (t < FIN_AP) arranque(c, cam, t, d);
  // --- la G ---
  if (t >= FIN_AP && t < t0.laP + .6) {
    const z = caidaZ(t, llegaG, 19), rz = .05, Y = yG(t), al = 1.98 * ease.outBack(prog(t, t0.G + .1, t0.G + .7), 1.25), Rb = rZ(rz);
    const bis = -d.G.ancho / 2;
    const R = mm(Rb, rY(-al));
    const pose: Pose = (u, v, w) => { const q = mv(Rb, bis + (u - bis) * Math.cos(al) - w * Math.sin(al), v, 0); return [vistaX(XG, z) + q[0], vistaY(Y, z) + q[1], z + (u - bis) * Math.sin(al) + w * Math.cos(al)]; };
    hueco(c, cam, d.G, XG, Y, rz, al, "rgba(192,68,42,.5)");
    sombraSolido(c, cam, d.G, pose);
    solido(c, cam, d.G, pose, R);
    polvoGolpe(c, cam, t, t0.g1, XG, Y, 10, 3);
  }
  // --- la P ---
  if (t >= FIN_AP && t < t0.yla + .6) {
    const z = caidaZ(t, llegaP, 12), rz = -.035, Y = 0, al = 1.98 * ease.outBack(prog(t, t0.P + .05, t0.P + .62), 1.25), Rb = rZ(rz);
    const bis = -d.P.ancho / 2;
    const R = mm(Rb, rY(-al));
    const pose: Pose = (u, v, w) => { const q = mv(Rb, bis + (u - bis) * Math.cos(al) - w * Math.sin(al), v, 0); return [vistaX(XP, z) + q[0], vistaY(Y, z) + q[1], z + (u - bis) * Math.sin(al) + w * Math.cos(al)]; };
    hueco(c, cam, d.P, XP, Y, rz, al, "rgba(214,206,186,.55)");
    tragadas(c, cam, t, d, true);
    sombraSolido(c, cam, d.P, pose);
    solido(c, cam, d.P, pose, R);
    polvoGolpe(c, cam, t, t0.g2, XP, Y, 10, 5);
  }
  // --- la T: la única que no se abre. Se pone de pie. ---
  if (t >= FIN_AP && t < t0.antes - .2) dibujaT(c, cam, t, d);
  polvoGolpe(c, cam, t, t0.g3, XT, yT(t), 11, 8);
  // ¿qué significan?
  if (t > t0.signif - .5 && t < t0.laG + .1) {
    const a = smooth(prog(t, t0.sabe + .1, t0.sabe + .32)) * (1 - smooth(prog(t, t0.laG - .2, t0.laG + .05)));
    enPlano(c, cam, 0, -7.6, 0, 39, () => texto(c, "¿qué significan?", 0, 0, { fuente: serif(118, true), color: TINTA, alfa: a }));
  }
  // Hojas nuevas: salen de la G a chorro.
  if (t > t0.gen_e - .3 && t < t0.laP + .5) {
    for (const h of d.hojasG) {
      const e = t - h.b; if (e <= 0) continue;
      const z = -2 + h.vz * e - 3 * e * e;
      if (z > cam.pos[2] - 3) continue;
      const R = mm(mm(rZ(h.a + h.w3 * e), rX(h.w1 * e)), rY(h.w2 * e * .6));
      hojaVuelo(c, cam, h.x + h.vx * e, h.y + h.vy * e, z, R, h.es, h.tipo);
    }
  }
  if (t > t0.ya - .4 && t < t0.yla + .6) tragadas(c, cam, t, d, false);
  // Tú, chiquito, frente a todo lo que ya leyó.
  if (t > t0.contigo - .55 && t < t0.yla + .6) {
    const k = ease.outCubic(prog(t, t0.contigo - .55, t0.contigo + .2));
    const x = lerp(XP + 15, XP + 3.8, k), y = -4.6;
    const P = cam.p(x, y, 0);
    if (P) {
      sombra(c, P.x, P.y + 2, 1.1 * P.s * 1.5, .3);
      const Q = cam.p(x, y, .7);
      if (Q) bola(c, Q.x, Q.y, .7 * Q.s, ACENTO);
      texto(c, "tú", P.x, P.y + 136, { fuente: serif(96, true), color: ACENTO, alfa: smooth(prog(t, t0.contigo, t0.contigo + .2)) });
    }
  }
}

/** Las hojas que entran a la P, en espiral. Debajo de la mesa solo se ven a través del hueco. */
function tragadas(c: Ctx, cam: Cam, t: number, d: D, adentro: boolean) {
  const vida = .72;
  if (adentro) {
    c.save(); c.beginPath();
    const R = rZ(-.035);
    for (const L of d.P.loops) {
      const n = L.length / 2;
      for (let i = 0; i < n; i++) { const q = mv(R, L[i * 2], L[i * 2 + 1], 0), P = cam.p(XP + q[0], q[1], 0); if (P) { if (i === 0) c.moveTo(P.x, P.y); else c.lineTo(P.x, P.y); } }
      c.closePath();
    }
    c.clip("evenodd");
  }
  for (const h of d.hojasP) {
    const e = (t - h.b) / vida;
    if (e <= 0 || e >= 1) continue;
    const q = e * e, ang = h.a + (1 - q) * 3.4, rad = 17 * (1 - q) ** 1.5 + .5, z = lerp(9.5, -6, q);
    if ((z < 0) !== adentro) continue;
    if (z > cam.pos[2] - 3) continue;
    const R = mm(rZ(ang * 1.4 + h.w1), rX(h.w2 * e * 3 + .3));
    hojaVuelo(c, cam, XP + Math.cos(ang) * rad - .3, Math.sin(ang) * rad + .4, z, R, h.es * (1 - q * .4), h.tipo);
  }
  if (adentro) c.restore();
}

/** Texto acostado sobre un plano del mundo; `ux` es cuántos px locales son una unidad. */
function enPlano(c: Ctx, cam: Cam, x: number, y: number, z: number, ux: number, fn: () => void) {
  const o = cam.p(x, y, z), a = cam.p(x + 1, y, z), b = cam.p(x, y + 1, z);
  if (!o || !a || !b) return;
  c.save(); c.transform((a.x - o.x) / ux, (a.y - o.y) / ux, -(b.x - o.x) / ux, -(b.y - o.y) / ux, o.x, o.y);
  fn(); c.restore();
}

function dibujaT(c: Ctx, cam: Cam, t: number, d: D) {
  const z = caidaZ(t, llegaT, 12), pie = yT(t) - HT / 2;
  const de = ease.outBack(prog(t, t0.imp - .3, t0.paraT), 1.15);
  const cae = prog(t, t0.caeT, t0.golpeT);
  const reb = t > t0.golpeT ? Math.exp(-(t - t0.golpeT) * 9) * Math.abs(Math.sin((t - t0.golpeT) * 15)) : 0;
  const sube = t0.golpeT + .62, va = ease.inCubic(prog(t, sube, sube + .52));
  // De pie se le ve el frente; cae de espaldas, al derecho, y luego se vuelve a levantar por debajo del cuadro.
  const th = t < t0.caeT ? Math.PI / 2 * Math.min(de, 1.04) : t < sube ? Math.PI / 2 * (1 - cae * cae) + .05 * reb : Math.PI / 2 * va;
  if (t > sube && va > .9) return;
  const rz = .02 * (1 - clamp(de));
  const R = mm(rZ(rz), rX(th));
  const cs = Math.cos(th), sn = Math.sin(th);
  const pose: Pose = (u, v, w) => { const vv = (v + H / 2) * KT; return [vistaX(XT, z) + u * KT, vistaY(pie, z) + vv * cs - w * sn, z + vv * sn + w * cs]; };
  sombraSolido(c, cam, d.T, pose);
  const rayas = 2 * ease.inOutSine(prog(t, t0.transf + .2, t0.transf_e + .2)) * (1 - smooth(prog(t, t0.antes, t0.antes + .5)));
  solido(c, cam, d.T, pose, R, { rayas, lado: lerp(112, 44, smooth(prog(t, t0.antes - .1, t0.antes + .3))) });
  polvoGolpe(c, cam, t, t0.paraT, XT, FT, 13, 13);
  polvoGolpe(c, cam, t, t0.golpeT, TX, TY, 17, 21);
}

// ---------- la frase ----------
const aterriza = (k: number) => t0.saltos[k][0] + t0.saltos[k][1];

function hojaPlana(c: Ctx, cam: Cam, z: number, f: number, t: number, o: { lx?: number; ly?: number; alfa?: number; color?: string; tinta?: string; seg?: number; onda?: number; gr?: number; rot?: number; rejilla?: number }) {
  const lx = (o.lx ?? LX) / 2, ly = (o.ly ?? LY) / 2, n = o.seg ?? 4, on = o.onda ?? 0, rot = o.rot ?? 0, cr = Math.cos(rot), sr = Math.sin(rot);
  const pt = (u: number, v: number) => cam.p(TX + u * cr - v * sr, TY + u * sr + v * cr, z + on * (Math.sin(u * .55 + t * .8 + f * 1.3) * .5 + Math.sin(v * .9 - t * .63 + f * .7) * .5));
  const pa = new Path2D();
  let prim = true, dentro = false;
  const pon = (u: number, v: number) => {
    const P = pt(u, v); if (!P) return;
    if (P.x > -200 && P.x < 1280 && P.y > -200 && P.y < 2120) dentro = true;
    if (prim) { pa.moveTo(P.x, P.y); prim = false; } else pa.lineTo(P.x, P.y);
  };
  for (let i = 0; i < n; i++) pon(-lx + 2 * lx * i / n, -ly);
  for (let i = 0; i < n; i++) pon(lx, -ly + 2 * ly * i / n);
  for (let i = 0; i < n; i++) pon(lx - 2 * lx * i / n, ly);
  for (let i = 0; i < n; i++) pon(-lx, ly - 2 * ly * i / n);
  pa.closePath();
  if (!dentro) return;
  c.save(); c.globalAlpha = o.alfa ?? 1; c.fillStyle = o.color ?? "#FBFAF6"; c.fill(pa);
  const rj = o.rejilla ?? 0;
  if (rj > .02) {
    c.beginPath();
    for (let i = 1; i < 10; i++) { const a = pt(-lx + 2 * lx * i / 10, -ly), b = pt(-lx + 2 * lx * i / 10, ly); if (a && b) { c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); } }
    for (let j = 1; j < 5; j++) { const a = pt(-lx, -ly + 2 * ly * j / 5), b = pt(lx, -ly + 2 * ly * j / 5); if (a && b) { c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); } }
    c.strokeStyle = `rgba(96,92,80,${.17 * rj})`; c.lineWidth = 1; c.stroke();
  }
  c.globalAlpha = 1; c.strokeStyle = o.tinta ?? "#47453f"; c.lineWidth = o.gr ?? 2; c.lineJoin = "round"; c.stroke(pa); c.restore();
}

/** Las palabras acostadas en la hoja: leídas, olvidadas, recuperadas de golpe y selladas. */
function palabras(c: Ctx, cam: Cam, t: number, d: D) {
  const junta = (k: number) => prog(t, t0.vuelve + .02 + k * .05, t0.punto + .1 + k * .05);
  const y0 = TY - .42;
  const entra = smooth(prog(t, t0.antes + .25, t0.antes + .8));
  for (let k = 0; k < 5; k++) {
    const x = TX + XW[k];
    const lee = t > aterriza(k) - .12;
    const roto = k < 4 ? prog(t, aterriza(k) + .42, aterriza(k) + 1.15) : 0;
    const vuelve = ease.inOutCubic(prog(t, t0.lee - .1, t0.compl + .1));
    const disp = roto * (1 - vuelve);
    const sellada = t > t0.golpeT;
    const q = junta(k);
    if (q >= 1) continue;
    const alfaBase = t > t0.lee ? lerp(.3, 1, vuelve) : lee ? 1 : .3;
    if (disp < .004 && q <= 0) {
      enPlano(c, cam, x, y0, .01, UX, () => {
        texto(c, FRASE[k], 0, 0, { fuente: serif(FUENTE), color: TINTA, alfa: alfaBase * entra });
        if (sellada) { c.strokeStyle = TINTA; c.lineWidth = 2.4; c.font = serif(FUENTE); c.textAlign = "center"; c.strokeText(FRASE[k], 0, 0); }
      });
    } else {
      const P = d.pts[k];
      c.save(); c.fillStyle = TINTA;
      for (let i = 0; i < P.length; i++) {
        const h = hash(i, k), g = hash(k, i);
        const px = P[i][0] / UX, py = -P[i][1] / UX;
        const s = ease.outCubic(clamp(disp * 1.2 - h * .2));
        const j = ease.inCubic(clamp(q * 1.4 - h * .4));
        const X = lerp(x + px + (h - .5) * 2.6 * s + 1.1 * s * s, x, j), Y = lerp(y0 + .34 + py - s * (.6 + g * 2.6), TY, j);
        const Pp = cam.p(X, Y, .02 + j * .5);
        if (!Pp) continue;
        c.globalAlpha = alfaBase * (1 - s * s * .9);
        const r = 3.4 * Pp.s / 104; c.fillRect(Pp.x - r / 2, Pp.y - r / 2, r, r);
      }
      c.restore();
    }
  }
  // La bola que lee es la de «tú»: «leían como tú». Como la pelotita del karaoke, una palabra a la vez.
  if (t > t0.redes && t < t0.lee) {
    const x0 = TX + XW[0] - 1.25, e0 = t - t0.redes;
    let x = lerp(TX - 9, x0, ease.outCubic(prog(t, t0.redes, t0.tu + .1))), z = .9 * Math.abs(Math.sin(e0 * 5.5)) * Math.exp(-e0 * .5);
    for (let i = 0; i < 5; i++) {
      const [s, du] = t0.saltos[i];
      if (t < s) break;
      const p = prog(t, s, s + du), a = i === 0 ? x0 : TX + XW[i - 1], b = TX + XW[i];
      x = lerp(a, b, ease.inOutSine(p)); z = 4 * 1.7 * p * (1 - p);
    }
    if (t > aterriza(4)) { const e = t - aterriza(4); z = Math.max(0, 1.1 * Math.abs(Math.sin(e * 5)) * Math.exp(-e * 2.5)); }
    const a = 1 - smooth(prog(t, t0.lee - .4, t0.lee - .1));
    const y = TY + 1.2, S = cam.p(x, y, 0), Q = cam.p(x, y, z + .36);
    if (S && Q) {
      c.save(); c.globalAlpha = a;
      sombra(c, S.x, S.y, .42 * S.s * (2 + z * .4), .4 / (1 + z)); bola(c, Q.x, Q.y, .36 * Q.s, ACENTO); c.restore();
    }
  }
}

// ---------- la torre ----------
/** Un hilo se curva EN la hoja, no sobre ella: de ida y de vuelta forman una lente y las bolas no los tapan. */
function arcoHilo(a: P2, b: P2, u: number, alt: number): V3 {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, h = 4 * u * (1 - u);
  return [lerp(a[0], b[0], u) - dy / L * alt * .95 * h, lerp(a[1], b[1], u) + dx / L * alt * .95 * h, .12 + Math.abs(alt) * .3 * h];
}
function hilo(c: Ctx, cam: Cam, a: P2, b: P2, z: number, ancho: number, color: string, alfa: number, k: number, t: number, sem: number, alt: number, n = 12) {
  if (alfa <= .01 || k <= 0) return;
  const r = azar(Math.floor(t * 10) * 97 + sem);
  c.save(); c.globalAlpha = alfa; c.strokeStyle = color; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath();
  let s = 1, prim = true;
  for (let i = 0; i <= n; i++) {
    const u = i / n * k;
    const q = arcoHilo(a, b, u, alt), P = cam.p(TX + q[0], TY + q[1], z + q[2]);
    if (!P) continue;
    s = P.s;
    const j = i === 0 || i === n ? 0 : 2.4;
    const x = P.x + (r() - .5) * j, y = P.y + (r() - .5) * j;
    if (prim) { c.moveTo(x, y); prim = false; } else c.lineTo(x, y);
  }
  c.lineWidth = Math.max(ancho * s / 96, .8); c.stroke(); c.restore();
}

function hilos(c: Ctx, cam: Cam, t: number, v: number, z: number, crece: number, alfa: number, f: number, gordo = 1) {
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
    if (i === j) continue;
    const w = PESOS[i][j];
    const a = PF(v, i), b = PF(v, j);
    const perro = i === 1;
    // Primero mira perro, y un instante después todas las demás.
    const dl = perro ? 0 : .3 + i * .05, k = ease.outCubic(clamp(crece * 2.2 - dl));
    const alt = (perro ? .95 : .55 + w) * (i < j ? 1 : -1);
    hilo(c, cam, a, b, z, (2.2 + w * 24) * gordo, perro ? ACENTO : TINTA, alfa * (perro ? 1 : .42 + w * .6), k, t, i * 7 + j * 13 + f * 3, alt);
    if (k >= 1 && w > .1) {
      // Lo que viaja: un pedazo de la otra palabra, de regreso hacia la que mira.
      for (let m = 0; m < 3; m++) {
        const u = 1 - ((t * .9 + m / 3 + hash(i, j)) % 1);
        const q = arcoHilo(a, b, u, alt), P = cam.p(TX + q[0], TY + q[1], z + q[2]);
        if (!P) continue;
        c.save(); c.globalAlpha = alfa; c.fillStyle = perro ? ACENTO : TINTA;
        circulo(c, P.x, P.y, Math.max((4 + w * 12) * gordo * P.s / 96, 1.4)); c.restore();
      }
    }
  }
}

function bolita(c: Ctx, cam: Cam, x: number, y: number, zB: number, zE: number, r: number, tinte: string, alfa = 1) {
  const S = cam.p(x, y, zB), Q = cam.p(x, y, zB + zE + r * .9);
  if (!S || !Q) return;
  c.save(); c.globalAlpha = alfa;
  sombra(c, S.x, S.y, r * S.s * (1.7 + zE * .3), .4 / (1 + zE * 1.1));
  bola(c, Q.x, Q.y, r * Q.s, tinte); c.restore();
}

const rico = (t: number) => smooth(prog(t, t0.este - .04, t0.este + .36));
const aPerro = (t: number) => smooth(prog(t, t0.ysale + .25, t0.ysale + .5)) * (1 - smooth(prog(t, t0.entonces - .3, t0.entonces - .08)));
function pulsoTorre(t: number) {
  let p = 0;
  for (const b of [t0.como + .02, t0.mismo, t0.mismo + .17, t0.tiempo]) if (t > b) p += Math.exp(-(t - b) * 6.5);
  return clamp(p);
}

/** Lo que queda en cada hoja cuando los puntos ya pasaron: sus cinco marcas y los hilos que más pesaron. */
function huella(c: Ctx, cam: Cam, f: number, z: number, alfa: number, pulso: number, t: number) {
  if (alfa <= .01) return;
  for (const [i, j] of [[1, 3], [1, 0], [3, 4], [0, 2]]) hilo(c, cam, PF(f, i), PF(f, j), z, 3.4 + pulso * 7, i === 1 ? ACENTO : TINTA, alfa * lerp(.62, 1, pulso), 1, t, i * 5 + j * 11 + f * 3, .3, 6);
  c.save(); c.globalAlpha = alfa;
  for (let k = 0; k < 5; k++) {
    const p = PF(f, k), P = cam.p(TX + p[0], TY + p[1], z + .04);
    if (!P) continue;
    c.fillStyle = k === 1 ? ACENTO : TINTA;
    circulo(c, P.x, P.y, Math.max((.19 + pulso * .13) * P.s, 1.6));
  }
  c.restore();
}

function torreInicio(c: Ctx, cam: Cam, t: number, d: D) {
  const dz = dzDe(t), u = alto(t), v = acomodo(t);
  const camZ = cam.pos[2];
  const N = u > 2.5 || t > t0.decenas - .3 ? NF : 4;
  const orden: number[] = [];
  for (let f = 0; f < N; f++) orden.push(f);
  orden.sort((a, b) => Math.abs(b * dz - camZ) - Math.abs(a * dz - camZ));
  const fb = Math.min(Math.floor(u), NF - 1), fr = u - fb;
  const flota = 1.75 * ease.inOutCubic(prog(t, t0.ysale, t0.transfd_e - .1)) * (1 - ease.outExpo(prog(t, t0.entonces - .25, t0.entonces + .35)));
  const dens = smooth(prog(t, t0.decenas - .2, t0.ycada));
  const estela = smooth(prog(t, t0.decenas, t0.capas + .1));
  const aM = aPerro(t), pul = pulsoTorre(t);
  const rB = lerp(.54, .36, dens);
  for (const f of orden) {
    const na = nacePiso(f);
    if (t < na) continue;
    const e = t - na, z0 = f * dz;
    const ent = clamp(resorte(e, 2.1, .46), 0, 1.15);
    const z = z0 + (1 - Math.min(ent, 1)) * 2.8 * (1 - dens * .4);
    const arriba = camZ > z;
    const cosas = () => {
      if (f > 0 && f < fb + (fr > .5 ? 1 : 0)) huella(c, cam, f, z, smooth((u - f) * 1.4), pul, t);
      // Estelas: los cinco caminos, de este piso al siguiente.
      if (estela > 0 && f < NF - 1) {
        const fin = Math.min(u, f + 1);
        if (fin > f) {
          for (let k = 0; k < 5; k++) {
            const a = PF(f, k), b = PF(lerp(f, f + 1, fin - f), k);
            const A = cam.p(TX + a[0], TY + a[1], f * dz), B = cam.p(TX + b[0], TY + b[1], fin * dz);
            if (!A || !B) continue;
            c.save(); c.globalAlpha = estela * (k === 1 ? 1 : .8); c.strokeStyle = k === 1 ? ACENTO : TINTA; c.lineWidth = k === 1 ? 5 : 3; c.lineCap = "round"; linea(c, A.x, A.y, B.x, B.y); c.restore();
          }
        }
      }
      // Los hilos de cada piso.
      if (f === 1) { const a = t0.cada - .12, b = t0.ysale + .1; hilos(c, cam, t, v, z, prog(t, a, a + .8), 1 - smooth(prog(t, b - .3, b)), f); }
      if (f === 2) { const a = t0.capa - .2, b = t0.yotra + .12; hilos(c, cam, t, v, z, prog(t, a, a + .4), 1 - smooth(prog(t, b - .3, b)), f); }
      if (f === 3) { const a = t0.otra2_e - .32, b = t0.decenas + .1; hilos(c, cam, t, v, z, prog(t, a, a + .3), 1 - smooth(prog(t, b - .3, b)), f); }
      if (f > 3 && t > t0.decenas && Math.abs(u - f) < 1.4) hilos(c, cam, t, Math.min(v, f), z, 1, (1 - Math.abs(u - f) / 1.4) * .85, f, .7);
      // Los puntos.
      if (f === fb && t > t0.vuelve) {
        for (const k of [0, 2, 3, 4, 1]) {
          const p = PF(v, k);
          const pop = ease.outBack(prog(t, t0.punto + .02 + k * .05, t0.punto + .26 + k * .05), 2.4);
          if (pop <= 0) continue;
          const hop = 4 * fr * (1 - fr) * .5;
          const vive = .09 * (1 + Math.sin(t * 2.3 + k * 1.3));
          bolita(c, cam, TX + p[0], TY + p[1], z + fr * dz, flota * .9 + hop + vive, rB * pop, k === 1 && rico(t) > .5 ? ACENTO : TINTA, 1 - aM);
        }
      }
    };
    if (!arriba) cosas();
    hojaPlana(c, cam, z, f, t, { alfa: f === 0 ? smooth(prog(t, t0.antes - .2, t0.antes + .3)) : lerp(.86, .44, dens) * Math.min(ent, 1), seg: 4, onda: f === 0 ? 0 : .12, gr: lerp(2.6, 2, dens), rot: (1 - Math.min(ent, 1)) * .22, rejilla: (1 - dens) * Math.min(ent, 1) });
    if (f === 0 && t < t0.punto + .4) palabras(c, cam, t, d);
    if (arriba) cosas();
    // Las palabras de la frase, sobre cada punto.
    if (f === fb && t > t0.punto + .1 && t < t0.decenas + .2) {
      const al = smooth(prog(t, t0.punto + .1, t0.punto + .4)) * (1 - smooth(prog(t, t0.decenas - .25, t0.decenas + .1))) * (1 - aM);
      for (let k = 0; k < 5; k++) {
        const p = PF(v, k), Q = cam.p(TX + p[0], TY + p[1], z + fr * dz + 1.75 + flota * .9);
        if (Q) texto(c, FRASE[k], Q.x, Q.y - 8, { fuente: serif(k === 1 ? 80 : 68, true), color: k === 1 ? ACENTO : "#33322e", alfa: al });
      }
    }
  }
}

/** El punto "perro" de cerca: solo y liso a secas; con sus hilos, sus palabras y pedazos de ellas cuando ya leyó su frase. */
function bolaPerro(c: Ctx, cam: Cam, t: number, d: D) {
  const m = CAM_MACRO(), s = cam.p(m[0], m[1], m[2]);
  if (!s) return;
  const a = aPerro(t);
  if (a <= 0) return;
  const seco = smooth(prog(t, t0.yano - .3, t0.yano + .1)) * (1 - rico(t));
  const k = rico(t);
  const late = t > t0.este ? Math.exp(-(t - t0.este - .05) * 5) * Math.sin((t - t0.este - .05) * 18) * .06 : 0;
  const R = lerp(.54, .66, smooth(prog(t, t0.ysale + .2, t0.yano))) * s.s * (1 + late);
  const x = s.x, y = s.y;
  const ll = ease.outExpo(prog(t, t0.este - .06, t0.este + .44));
  c.save(); c.globalAlpha = a;
  // La órbita se cierra alrededor de todo: «en esta frase».
  const anillo2 = ease.inOutCubic(prog(t, t0.enesta - .1, t0.frase2_e + .1));
  const RX = 330, RY = 372, AX = 430, AY = 478;
  if (anillo2 > 0) {
    c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath();
    const r = azar(Math.floor(t * 10) + 3);
    for (let i = 0; i <= 90 * anillo2; i++) { const q = -1.57 + i / 90 * TAU, X = x + Math.cos(q) * AX + (r() - .5) * 2.4, Y = y + Math.sin(q) * AY + (r() - .5) * 2.4; if (i === 0) c.moveTo(X, Y); else c.lineTo(X, Y); }
    c.stroke();
  }
  if (ll > 0) {
    const PAL: [string, number, number][] = [["ladra", -.5, 13], ["mi", 3.56, 8], ["le", 2.42, 3.5], ["al", .84, 4]];
    for (const [w, ang0, g] of PAL) {
      const ang = ang0 + .1 * vaiven(t, 5.3, ang0), far = lerp(1.9, 1, ll);
      const wx = x + Math.cos(ang) * RX * far, wy = y + Math.sin(ang) * RY * far;
      const ux = x + Math.cos(ang) * R * .96, uy = y + Math.sin(ang) * R * .96;
      const hx = lerp(wx, ux, .1), hy = lerp(wy, uy, .1);                // el hilo no llega hasta la letra: no se monta en ella
      const r = azar(Math.floor(t * 10) + Math.round(g) * 3);
      c.strokeStyle = ACENTO; c.lineWidth = g; c.lineCap = "round"; c.beginPath(); c.moveTo(hx, hy);
      for (let i = 1; i <= 10; i++) { const q = i / 10, b0 = i === 10 ? 0 : (r() - .5) * 2.6; c.lineTo(lerp(hx, ux, q) + b0, lerp(hy, uy, q) + b0); }
      c.stroke();
      c.fillStyle = ACENTO;
      for (let i = 0; i < 3; i++) { const q = (t * 1.1 + i / 3 + ang0) % 1; circulo(c, lerp(hx, ux, q), lerp(hy, uy, q), (g * .5 + 3.5) * smooth(q * 6) * smooth((1 - q) * 6) * ll); }
      texto(c, w, wx, wy + (Math.sin(ang) > 0 ? 62 : -6), { fuente: serif(96, true), color: TINTA, alfa: a * ll });
    }
  }
  sombra(c, x + 14, y + R * 1.62, R * 1.3, .3);
  bola(c, x, y, R);
  if (seco > 0) {
    c.globalAlpha = a * seco * .92;
    const g = c.createRadialGradient(x - R * .34, y - R * .38, R * .05, x, y, R);
    g.addColorStop(0, "#C9C6BD"); g.addColorStop(.5, "#96948C"); g.addColorStop(1, "#54524C");
    c.fillStyle = g; circulo(c, x, y, R);
  }
  c.globalAlpha = a;
  if (k > 0) {
    c.globalAlpha = a * k; bola(c, x, y, R, ACENTO); c.globalAlpha = a;
    // Lo que le llegó de cada palabra: anillos que se quedan. Liso era «a secas»; esto ya es su contexto.
    c.lineWidth = 3;
    [.42, .6, .76, .9].forEach((q, i) => {
      const ap = ease.outCubic(prog(t, t0.este + .05 + i * .12, t0.este + .5 + i * .12));
      if (ap <= 0) return;
      c.strokeStyle = `rgba(250,226,214,${.5 * ap})`; c.beginPath(); c.ellipse(x - R * .04, y - R * .04, R * q * ap, R * q * ap, 0, 0, TAU); c.stroke();
    });
  }
  c.globalAlpha = a;
  if (R > 90) {
    texto(c, "perro", x, y + R * .15, { fuente: serif(Math.round(R * .5)), color: LUZ, alfa: a });
  }
  c.restore();
}

// ---------- miles de pedazos ----------
function pulsoChips(t: number) {
  let p = 0;
  for (const b of [t0.miles, t0.chips + .03, t0.chips + .36, t0.por + .02, t0.pudo, t0.crecer, t0.tanto]) if (t > b) p += Math.exp(-(t - b) * 5.2);
  return clamp(p);
}

function alfombra(c: Ctx, cam: Cam, t: number, d: D) {
  const ev = clamp(Math.abs(Math.sin(cam.v.pitch)), .05, 1), pu = pulsoChips(t);
  const encima: number[] = [], vuelan: number[] = [];
  c.save();
  const N = d.h.length, Pm = .46;
  for (let i = 0; i < N; i++) {
    const k = ease.inOutCubic(prog(t, VUELA + d.h[i] * .3, VUELA + d.h[i] * .3 + .62));
    if (k < 1) { vuelan.push(i, k); continue; }
    const P = cam.p(d.gx[i], d.gy[i], 0);
    if (!P || P.x < -40 || P.x > 1120 || P.y < -40 || P.y > 1960) continue;
    const w = P.s * .86, hh = w * ev;
    c.drawImage(d.chip, P.x - w / 2, P.y - hh / 2, w, hh);
    if (pu > .02) encima.push(P.x - w / 2, P.y - hh / 2, w, hh);
  }
  if (pu > .02) {
    c.globalAlpha = pu;
    for (let i = 0; i < encima.length; i += 4) c.drawImage(d.chipOn, encima[i], encima[i + 1], encima[i + 2], encima[i + 3]);
    c.globalAlpha = 1;
  }
  if (vuelan.length) {
    ["#FDFCF8", "#F4F1E9", "#E6E2D8"].forEach((col, m) => {
      c.beginPath();
      for (let q = 0; q < vuelan.length; q += 2) {
        const i = vuelan[q], k = vuelan[q + 1];
        if (i % 3 !== m) continue;
        const x = lerp(d.sx[i], d.gx[i], k), y = lerp(d.sy[i], d.gy[i], k), z = lerp(d.sz[i], 0, k) + 1.3 * Math.sin(k * Math.PI), e = lerp(.4, Pm, k);
        const A = cam.p(x - e, y - e, z), B = cam.p(x + e, y - e, z), C = cam.p(x + e, y + e, z), D_ = cam.p(x - e, y + e, z);
        if (!A || !B || !C || !D_) continue;
        c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.lineTo(C.x, C.y); c.lineTo(D_.x, D_.y); c.closePath();
      }
      c.fillStyle = col; c.fill();
    });
  }
  c.restore();
}

/** La torre ya alta: papeles con su canto, un poco desalineados, como una pila de verdad. */
/** Ondas que recorren la pila: cada hoja se desliza y vuelve, igual que la anterior. Es «repetida» dicho con las manos. */
const ONDAS_T: [number, number, number, number][] = [[t0.unat - .15, 1.5, .34, 1], [t0.repe - .08, .95, .95, 1], [t0.repe + .5, .95, -.8, 1]];
function ondaT(t: number, f: number) {
  let dx = 0;
  for (const [s, du, am, sen] of ONDAS_T) {
    const q = (t - s) / du; if (q <= 0 || q >= 1.15) continue;
    const c0 = sen > 0 ? 1.05 - q * 1.15 : q * 1.15 - .05, e = (f / NMAX - c0) / .055;
    dx += am * Math.exp(-e * e);
  }
  return dx;
}

function torreAlta(c: Ctx, cam: Cam, t: number, o: { nace: (f: number) => number; hueco?: (f: number) => number; resalta?: (f: number) => number; tinta?: (f: number) => number; ancho?: (f: number) => number; onda?: boolean }) {
  const camZ = cam.pos[2], camX = cam.pos[0], arr: number[] = [];
  const zD = (f: number) => f * DZ_C + (o.hueco?.(f) ?? 0);
  for (let f = NMAX - 1; f >= 0; f--) if (t >= o.nace(f)) arr.push(f);
  arr.sort((a, b) => Math.abs(zD(b) - camZ) - Math.abs(zD(a) - camZ));
  c.save(); c.lineJoin = "round";
  for (const f of arr) {
    const e = t - o.nace(f), ent = Math.min(clamp(resorte(e, 2.6, .5), 0, 1.1), 1);
    const z = zD(f) + (1 - ent) * 1.8;
    const an = o.ancho?.(f) ?? 1, a = LX / 2 * an, b = LY / 2 * an, tin = o.tinta?.(f) ?? 0, TH = lerp(.19, .29, tin);
    const ox = TX + .06 * Math.sin(f * 2.3 + t * .42) + .05 * Math.sin(f * .7) + (o.onda ? ondaT(t, f) : 0), oy = TY + .05 * Math.cos(f * 1.7 - t * .37);
    const A = cam.p(ox - a, oy - b, z), B = cam.p(ox + a, oy - b, z), C = cam.p(ox + a, oy + b, z), D_ = cam.p(ox - a, oy + b, z);
    const A1 = cam.p(ox - a, oy - b, z - TH), B1 = cam.p(ox + a, oy - b, z - TH), C1 = cam.p(ox + a, oy + b, z - TH), D1 = cam.p(ox - a, oy + b, z - TH);
    if (!A || !B || !C || !D_ || !A1 || !B1 || !C1 || !D1) continue;
    if (Math.max(A.y, A1.y) < -60 && Math.max(C.y, C1.y) < -60) continue;
    if (Math.min(A.y, A1.y) > 1980 && Math.min(C.y, C1.y) > 1980) continue;
    const r = o.resalta?.(f) ?? 0;
    const v = Math.round(lerp(252, 22, tin));
    if (camZ > z || tin > .02) {
      c.fillStyle = `rgb(${v},${v - 1},${v - 5})`;
      c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.lineTo(C.x, C.y); c.lineTo(D_.x, D_.y); c.closePath(); c.fill();
    }
    const lado = camX > ox + a ? 1 : camX < ox - a ? -1 : 0;
    if (lado) {
      const P = lado > 0 ? [B, C, C1, B1] : [A, D_, D1, A1], v2 = Math.round(lerp(206, 10, tin));
      c.fillStyle = `rgb(${v2},${v2 - 2},${v2 - 8})`;
      c.beginPath(); c.moveTo(P[0].x, P[0].y); c.lineTo(P[1].x, P[1].y); c.lineTo(P[2].x, P[2].y); c.lineTo(P[3].x, P[3].y); c.closePath(); c.fill();
    }
    const v3 = Math.round(lerp(238, 16, tin));
    c.fillStyle = r > .02 ? `rgb(${Math.round(lerp(v3, 192, r))},${Math.round(lerp(v3, 68, r))},${Math.round(lerp(v3, 42, r))})` : `rgb(${v3},${v3 - 2},${v3 - 7})`;
    c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.lineTo(B1.x, B1.y); c.lineTo(A1.x, A1.y); c.closePath(); c.fill();
    c.strokeStyle = tin > .5 ? "rgba(244,242,236,.7)" : "#4d4b45"; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(A1.x, A1.y); c.lineTo(B1.x, B1.y);
    if (lado) { const Q = lado > 0 ? [B1, C1] : [A1, D1]; c.moveTo(Q[0].x, Q[0].y); c.lineTo(Q[1].x, Q[1].y); }
    c.stroke();
  }
  c.restore();
}

// ---------- no hay módulo de gramática ----------
type Modulo = { txt: string; lado: number; f: number; ini: number; fija: number; tacha: number; cae: number; cierra: number };
const FG = 80;
const MODS: Modulo[] = [
  { txt: "gramática", lado: 1, f: FG, ini: t0.no1 - .05, fija: t0.modulo + .1, tacha: t0.gram + .06, cae: t0.gram_e + .02, cierra: t0.gram_e + .3 },
  { txt: "lógica", lado: -1, f: FG + 7, ini: t0.no2 - .12, fija: t0.otro + .1, tacha: t0.logica + .02, cae: t0.logica_e + .02, cierra: t0.logica_e + .3 },
];
const AL_M = 1.7;
const huecoM = (t: number) => (f: number) => { let g = 0; for (const m of MODS) if (f > m.f) g += AL_M * 1.12 * smooth(prog(t, m.ini, m.ini + .3)) * (1 - ease.inCubic(prog(t, m.cierra - .14, m.cierra))); return g; };

function caja(c: Ctx, cam: Cam, x: number, y: number, z: number, R: M3, w: number, l: number, h: number, txt: string, tacha: number, alfa: number) {
  const P = (u: number, v: number, q: number) => { const p = mv(R, u, v, q); return cam.p(x + p[0], y + p[1], z + p[2]); };
  const a = w / 2, b = l / 2, e = h / 2;
  const fc: [number[][], string][] = [
    [[[-a, -b, -e], [a, -b, -e], [a, -b, e], [-a, -b, e]], "#171716"],
    [[[-a, b, e], [a, b, e], [a, -b, e], [-a, -b, e]], "#2c2b29"],
    [[[a, -b, -e], [a, b, -e], [a, b, e], [a, -b, e]], "#0e0e0d"],
    [[[-a, b, -e], [-a, -b, -e], [-a, -b, e], [-a, b, e]], "#0e0e0d"],
  ];
  c.save(); c.globalAlpha = alfa; c.lineJoin = "round";
  for (const [cara, col] of fc) {
    const q = cara.map((p) => P(p[0], p[1], p[2]));
    if (q.some((p) => !p)) continue;
    const ar = (q[1]!.x - q[0]!.x) * (q[2]!.y - q[0]!.y) - (q[1]!.y - q[0]!.y) * (q[2]!.x - q[0]!.x);
    if (ar > 0) continue;
    c.fillStyle = col; c.strokeStyle = LUZ; c.lineWidth = 2.4;
    c.beginPath(); q.forEach((p, i) => { if (i === 0) c.moveTo(p!.x, p!.y); else c.lineTo(p!.x, p!.y); }); c.closePath(); c.fill(); c.stroke();
  }
  const o = P(0, -b, 0), ux = P(1, -b, 0), uz = P(0, -b, 1);
  if (o && ux && uz) {
    const K = 96;
    c.save(); c.transform((ux.x - o.x) / K, (ux.y - o.y) / K, (o.x - uz.x) / K, (o.y - uz.y) / K, o.x, o.y);
    texto(c, txt, 0, 38, { fuente: serif(118, true), color: LUZ });
    if (tacha > 0) { c.strokeStyle = ACENTO; c.lineWidth = 14; c.lineCap = "round"; linea(c, -a * 78, 44, lerp(-a * 78, a * 78, ease.outCubic(tacha)), lerp(44, -44, ease.outCubic(tacha))); }
    c.restore();
  }
  c.restore();
}

function modulos(c: Ctx, cam: Cam, t: number) {
  for (const m of MODS) {
    if (t < m.ini || t > m.cae + 1.2) continue;
    const k = ease.outCubic(prog(t, m.ini + .04, m.fija));
    const e = Math.max(0, t - m.cae);
    const x = TX + m.lado * (lerp(16, 0, k) + 5 * e * e + .8 * e), z = m.f * DZ_C + AL_M * .56 - 15 * e * e;
    const R = mm(rZ(m.lado * e * .4), rY(m.lado * e * 1.9));
    caja(c, cam, x, TY, z, R, LX * .94, LY * .96, AL_M, m.txt, prog(t, m.tacha, m.tacha + .2), 1);
  }
}

// ---------- una hoja de cerca: neuronas, pesos, atención ----------
function perillaChica(c: Ctx, x: number, y: number, R: number, ang: number) {
  const so = c.createRadialGradient(x + R * .16, y + R * .22, R * .5, x + R * .16, y + R * .22, R * 1.5);
  so.addColorStop(0, "rgba(20,18,14,.36)"); so.addColorStop(1, "rgba(20,18,14,0)");
  c.fillStyle = so; circulo(c, x + R * .16, y + R * .22, R * 1.5);
  c.fillStyle = "#0a0a0a"; circulo(c, x, y, R * 1.05);
  const G = c.createConicGradient(-.9, x, y);
  [["#E4E1D9", 0], ["#8D8B85", .13], ["#DCD9D1", .26], ["#74726C", .39], ["#D2CFC7", .5], ["#7F7D77", .63], ["#E6E3DB", .76], ["#7A7872", .89], ["#E4E1D9", 1]].forEach(([k, s]) => G.addColorStop(s as number, k as string));
  c.fillStyle = G; circulo(c, x, y, R * .8);
  c.strokeStyle = TINTA; c.lineWidth = R * .1; c.lineCap = "round"; linea(c, x + Math.cos(ang) * R * .2, y + Math.sin(ang) * R * .2, x + Math.cos(ang) * R * .68, y + Math.sin(ang) * R * .68);
  c.fillStyle = ACENTO; circulo(c, x + Math.cos(ang) * R * .9, y + Math.sin(ang) * R * .9, R * .09);
}

function tarjeta(c: Ctx, cam: Cam, t: number) {
  const a0 = t0.neu + .2, bj = t0.apil - .02;
  if (t < a0 || t > bj + .3) return;
  const ang = 1.22 * ease.outBack(prog(t, a0, a0 + .62), 1.3) * (1 - ease.inCubic(prog(t, bj, bj + .24)));
  const z0 = (NMAX - 7) * DZ_C + .35, cs = Math.cos(ang), sn = Math.sin(ang);
  const W = (a: number, b: number) => cam.p(TX + a, TY + LY / 2 - b * cs, z0 + b * sn);
  const P = [W(-LX / 2, 0), W(LX / 2, 0), W(LX / 2, LY), W(-LX / 2, LY)];
  if (P.some((q) => !q)) return;
  c.save();
  c.beginPath(); P.forEach((p, i) => { if (i === 0) c.moveTo(p!.x, p!.y); else c.lineTo(p!.x, p!.y); }); c.closePath();
  c.fillStyle = "#FDFCF8"; c.fill(); c.strokeStyle = "#47453f"; c.lineWidth = 2.8; c.stroke();
  c.beginPath(); for (let i = 1; i < 10; i++) { const a = W(-LX / 2 + LX * i / 10, 0), b = W(-LX / 2 + LX * i / 10, LY); if (a && b) { c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); } }
  for (let j = 1; j < 5; j++) { const a = W(-LX / 2, LY * j / 5), b = W(LX / 2, LY * j / 5); if (a && b) { c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); } }
  c.strokeStyle = "rgba(96,92,80,.16)"; c.lineWidth = 1; c.stroke();
  c.restore();
  const col = [-3.7, -1.85, 0, 1.85, 3.7], F = [2.75, 3.65, 2.45, 3.55, 2.65];
  const Q = col.map((a, i) => W(a, F[i])!);
  const hl = prog(t, t0.aten2 - .05, t0.aten2 + .5);
  if (hl > 0) {
    c.save(); c.lineCap = "round";
    [[0, 1, 7], [1, 3, 13], [1, 2, 4], [2, 3, 8], [3, 4, 9], [0, 3, 3.5], [1, 4, 3.5]].forEach(([i, j, g], n) => {
      const k = ease.outCubic(clamp(hl * 2 - n * .12)); if (k <= 0) return;
      const a = Q[i], b = Q[j], r = azar(Math.floor(t * 10) + n * 7), mx = (a.x + b.x) / 2, my = Math.min(a.y, b.y) - 62 - n * 10;
      c.strokeStyle = (i === 1 || j === 1) ? ACENTO : TINTA; c.lineWidth = g; c.beginPath(); c.moveTo(a.x, a.y);
      for (let s = 1; s <= 10; s++) { const u = s / 10 * k, v = 1 - u; c.lineTo(v * v * a.x + 2 * u * v * mx + u * u * b.x + (r() - .5) * 2.4, v * v * a.y + 2 * u * v * my + u * u * b.y + (r() - .5) * 2.4); }
      c.stroke();
    });
    c.restore();
  }
  Q.forEach((q, i) => { const z = ease.outBack(prog(t, t0.neu + .3 + i * .05, t0.neu + .54 + i * .05), 2); if (z > 0) bola(c, q.x, q.y, 52 * z, i === 1 ? ACENTO : TINTA); });
  col.forEach((a, i) => {
    const z = ease.outBack(prog(t, t0.pesos + i * .05, t0.pesos + .26 + i * .05), 1.8);
    if (z <= 0) return;
    const p = W(a, .98)!;
    perillaChica(c, p.x, p.y, 52 * z, -1.57 + [1.2, -.9, .5, -1.6, .9][i] + .55 * Math.sin(t * 1.8 + i * 1.7));
  });
}

// ---------- el final: la lista es el travesaño, y la tinta cierra la T ----------
const INK = t0.seg + .62, INK_D = 1.35;

function final(c: Ctx, cam: Cam, t: number) {
  const top = cam.p(TX, TY - LY / 2, (NMAX - 1) * DZ_C);
  if (!top) return;
  const cx = top.x, yb = top.y - 6;
  const sube = ease.outExpo(prog(t, t0.sale2 - .08, t0.sale2 + .5));
  const ab = ease.inOutCubic(prog(t, t0.lista - .03, t0.lista + .46));
  const Y0 = yb - 452, Y1 = yb, X0 = 104, X1 = 976;
  const ink = ease.inOutSine(prog(t, INK - .1, INK + .5));
  c.font = serif(86);
  const anchoF = c.measureText("mi perro le ladra al").width, xHueco = 150 + anchoF + 22, largoH = 150;
  if (ab > 0) {
    const xa = lerp(cx, X0, ab), xb = lerp(cx, X1, ab);
    c.save();
    for (let i = 5; i > 0; i--) { c.fillStyle = "rgba(20,18,14,.024)"; c.fillRect(xa - i * 3 + 6, Y0 - i * 2 + 10, xb - xa + i * 6, Y1 - Y0 + i * 5); }
    c.fillStyle = "#FDFCF8"; c.fillRect(xa, Y0, xb - xa, Y1 - Y0);
    c.strokeStyle = TINTA; c.lineWidth = lerp(2.4, 9, ink); c.strokeRect(xa, Y0, xb - xa, Y1 - Y0);
    // Los rollos de las puntas: con la tinta se alargan hacia abajo, y son los remates de la T.
    const cae = ease.outBack(prog(t, INK + .05, INK + .6), 1.4) * 96;
    for (const [x, s] of [[xa, -1], [xb, 1]] as [number, number][]) {
      const gr = c.createLinearGradient(x - 16, 0, x + 16, 0);
      gr.addColorStop(0, s < 0 ? "#3b3a37" : "#FFFFFF"); gr.addColorStop(.5, "#E2DFD6"); gr.addColorStop(1, s < 0 ? "#FFFFFF" : "#3b3a37");
      c.fillStyle = gr; c.fillRect(x - 15, Y0 - 14, 30, Y1 - Y0 + 28);
      c.strokeStyle = TINTA; c.lineWidth = 2.4; c.strokeRect(x - 15, Y0 - 14, 30, Y1 - Y0 + 28);
      if (ink > 0) {
        c.fillStyle = TINTA; c.globalAlpha = ink;
        c.beginPath(); c.moveTo(x + 17 * s, Y0 - 16); c.lineTo(x - 17 * s, Y0 - 16); c.lineTo(x - 17 * s, Y1 + 16 + cae * .5); c.lineTo(x + 17 * s, Y1 + 16 + cae); c.closePath(); c.fill();
        c.globalAlpha = 1;
      }
    }
    c.beginPath(); c.rect(xa + 15, Y0, xb - xa - 30, Y1 - Y0); c.clip();
    texto(c, "mi perro le ladra al", 150, Y0 + 104, { fuente: serif(86), color: TINTA, alin: "left", alfa: smooth(prog(t, t0.lista + .1, t0.lista + .35)) });
    c.strokeStyle = TINTA; c.lineWidth = 6; c.globalAlpha = smooth(prog(t, t0.lista + .25, t0.lista + .5)); linea(c, xHueco, Y0 + 114, xHueco + largoH, Y0 + 114); c.globalAlpha = 1;
    const fila = (s: string, pct: number, n: number, ti: number) => {
      const y = Y0 + 216 + n * 94, e = smooth(prog(t, ti, ti + .16));
      texto(c, s, 150, y, { fuente: serif(86, true), color: n === 0 ? ACENTO : TINTA, alin: "left", alfa: e });
      const W = 290 * pct / 40 * ease.outCubic(prog(t, ti + .04, ti + .5)) * (1 + .012 * vaiven(t, 1.9, n));
      c.fillStyle = n === 0 ? ACENTO : TINTA; c.globalAlpha = e; c.fillRect(424, y - 46, W, 46); c.globalAlpha = 1;
      texto(c, `${pct}%`, 900, y, { fuente: mono(60), color: n === 0 ? ACENTO : TINTA, alin: "right", alfa: smooth(prog(t, ti + .2, ti + .4)) });
    };
    fila("cartero", 40, 0, t0.qua - .02); fila("gato", 25, 1, t0.pal - .02); fila("vecino", 15, 2, t0.pod - .02);
    c.restore();
  }
  // La bola: sale de lo alto, flota, y al final cae en el hueco de la frase. Queda ahí, sin elegir.
  if (t > t0.sale2 - .08) {
    const yFl = yb - 176 - 12 * vaiven(t, 1.3);
    let x = cx, y = lerp(yb, yFl, sube), r = 42;
    const so = t0.lista - .12;
    if (t > so) { y = lerp(yFl, Y0 - 44, ease.outCubic(prog(t, so, so + .32))); r = 36; }
    const sl = t0.seg - .1;
    if (t > sl) {
      const xFin = xHueco + largoH / 2, e = t - sl, cb = caida(e - .36, 5, .42, 60).z * 13;
      x = lerp(cx, xFin, ease.inOutSine(prog(t, sl, sl + .36)));
      y = e < .36 ? Y0 - 44 - Math.sin(e / .36 * Math.PI) * 70 : Y0 + 111 - 34 - cb;
      r = 34;
    }
    bola(c, x, y + (t > t0.seg + 1.4 ? 1.6 * vaiven(t, .9) : 0), r);
  }
  rotulo(c, t, t0.sola - .05, t0.lista - .2, "una sola cosa", 262, 124, TINTA, true);
  if (t > t0.seg) {
    const a = smooth(prog(t, t0.seg + .1, t0.seg + .4));
    texto(c, "números", 236, Y1 + 150, { fuente: serif(62, true), color: GRIS, alfa: a });
    texto(c, "de ejemplo", 236, Y1 + 216, { fuente: serif(62, true), color: GRIS, alfa: a });
  }
}

// ---------- el orden del video ----------
function dibuja(c: Ctx, t: number, d: D) {
  const v = vista(t), cam = camara(v, 540, 960, 1250);
  const [sx, sy] = temblor(t);
  const noche = t >= t0.yeso && t < t0.neu + .4;
  c.fillStyle = noche ? NOCHE : PAPEL; c.fillRect(0, 0, 1080, 1920);

  // La marea de luz sube desde abajo: el papel vuelve.
  const yM = lerp(2000, -40, ease.inOutCubic(prog(t, t0.neu - .3, t0.neu + .32)));
  if (noche && t > t0.neu - .3) { c.fillStyle = PAPEL; c.fillRect(0, yM, 1080, 2000); }

  c.save(); c.translate(sx, sy);
  const repartido = t > VUELA, enNoche = t >= t0.yeso;
  if (!noche) fibras(c, cam, d, t < t0.yeso ? 1 : smooth(prog(t, t0.neu + .4, t0.neu + 1)));
  if (t < t0.primero + .9) escenaLetras(c, cam, t, d);
  if (t > t0.antes - .2 && t < VUELA + .16) torreInicio(c, cam, t, d);
  if (t >= t0.antes - .2 && t < t0.primero) dibujaT(c, cam, t, d);
  if (t > t0.ysale && t < t0.entonces) bolaPerro(c, cam, t, d);
  if (repartido && !enNoche) {
    c.save(); c.globalAlpha = smooth(prog(t, VUELA, VUELA + .14)); alfombra(c, cam, t, d); c.restore();
    if (t > t0.pudo - .2) torreAlta(c, cam, t, { nace: naceAlta });
  }
  if (enNoche) {
    const aRes = smooth(prog(t, t0.repe - .15, t0.repe + .2));
    const ola = prog(t, t0.ydeesa + .15, t0.sale2) ** 1.5;
    const tin = prog(t, INK, INK + INK_D), pie = ease.outBack(prog(t, INK + INK_D - .14, INK + INK_D + .4), 1.6);
    torreAlta(c, cam, t, {
      nace: t < t0.apil ? (f) => (f < NMAX - 6 ? -9 : 1e9) : naceFinal, hueco: huecoM(t), onda: t > t0.unat - .2,
      resalta: (f) => {
        let r = 0;
        if (aRes > 0 && t < t0.ydeesa) r = clamp(Math.abs(ondaT(t, f)) * 1.3);
        if (ola > 0 && ola < 1) r = Math.max(r, 1 - clamp(Math.abs(f / NMAX - ola * 1.02) * 14));
        return r;
      },
      tinta: tin > 0 ? (f) => smooth((f / NMAX - (1 - tin * 1.1)) * 16) : undefined,
      ancho: pie > 0 ? (f) => 1 + (f < 6 ? pie * .95 * (1 - f / 6) ** 2.4 : 0) : undefined,
    });
    if (noche && t < t0.neu) modulos(c, cam, t);
    tarjeta(c, cam, t);
  }
  c.restore();

  // Las hojas nuevas no atraviesan el rótulo: se desvanecen antes de llegar a él.
  if (t > t0.decenas - .3 && t < t0.ycada + .4) {
    const a = smooth(prog(t, t0.decenas - .3, t0.decenas)) * (1 - smooth(prog(t, t0.ycada, t0.ycada + .4)));
    const g = c.createLinearGradient(0, 300, 0, 470);
    g.addColorStop(0, `rgba(244,242,236,${a})`); g.addColorStop(1, "rgba(244,242,236,0)");
    c.fillStyle = g; c.fillRect(0, 300, 1080, 170); c.fillStyle = `rgba(244,242,236,${a})`; c.fillRect(0, 0, 1080, 300);
  }

  // El negro no es plano: la luz solo alcanza un tramo de la torre.
  if (noche) {
    const k = 1 - smooth(prog(t, t0.neu - .3, t0.neu + .1));
    if (k > 0) {
      const g = c.createRadialGradient(540, 1020, 260, 540, 1020, 1120);
      g.addColorStop(0, "rgba(9,9,10,0)"); g.addColorStop(.55, `rgba(9,9,10,${.5 * k})`); g.addColorStop(1, `rgba(9,9,10,${k})`);
      c.fillStyle = g; c.fillRect(0, 0, 1080, 1920);
    }
  }
  motas(c, t, noche ? LUZ : "#3a3833", noche ? .7 : 1, cam);
  textos(c, t);
  if (t > t0.unat - .2) final(c, cam, t);
}

function textos(c: Ctx, t: number) {
  const r = (a: number, b: number, s: string, y: number, px: number, col = TINTA, it = false) => rotulo(c, t, a, b, s, y, px, col, it);
  r(t0.gen - .9, t0.laP - .22, "generativo", 1520, 150, TINTA, true);
  r(t0.pre - .95, t0.yla - .22, "preentrenado", 1530, 136, TINTA, true);
  r(t0.transf + .1, t0.antes - .15, "transformer", 300, 176, ACENTO, true);
  r(t0.lento, t0.lee - .3, "lento,", 1370, 130, TINTA);
  r(t0.olv - .05, t0.lee - .3, "y olvidando", 1510, 130, ACENTO, true);
  r(t0.golpeT, t0.primero + .35, "de un jalón", 640, 172, ACENTO, true);
  r(t0.aten - .1, t0.demas_e, "atención", 280, 150, TINTA, true);
  r(t0.yse, t0.ysale - .05, "se acomoda", 280, 130, TINTA, true);
  r(t0.transfd - .1, t0.yano - .2, "transformada", 280, 140, TINTA, true);
  r(t0.perro1, t0.es - .12, "perro a secas", 1530, 136, GRIS, true);
  r(t0.este, t0.entonces - .3, "este perro,", 300, 160, TINTA);
  r(t0.enesta, t0.entonces - .3, "en esta frase", 1578, 150, ACENTO, true);
  r(t0.decenas, t0.ycada - .1, "decenas de capas", 260, 118, TINTA);
  r(t0.afina - .2, t0.como - .3, "cada una afina", 260, 124, TINTA, true);
  r(t0.mismo - .1, VUELA - .16, "al mismo tiempo", 260, 122, ACENTO, true);
  r(t0.miles - .05, t0.por - .2, "miles de chips", 330, 140, TINTA);
  r(t0.pract - .1, t0.no1 - .2, "prácticamente todo", 250, 116, LUZ);
  r(t0.todo - .05, t0.no1 - .2, "lo que hay", 372, 116, LUZ, true);
  r(t0.no1 - .02, t0.neu - .3, "no hay", 300, 170, LUZ, true);
  r(t0.neu + .2, t0.apil - .1, "neuronas", 240, 124, TINTA);
  r(t0.pesos - .02, t0.apil - .1, "pesos", 372, 124, TINTA);
  r(t0.aten2 + .02, t0.apil - .1, "y atención", 504, 124, ACENTO, true);
  r(t0.apil - .04, t0.unat - .25, "apilados", 380, 190, ACENTO, true);
  r(t0.unat - .04, t0.ydeesa - .5, "una torre", 240, 130, TINTA);
  r(t0.misma - .3, t0.ydeesa - .5, "de la misma idea,", 372, 110, TINTA, true);
  r(t0.repe - .05, t0.ydeesa - .5, "repetida", 512, 134, ACENTO, true);
}

export const Pieza: React.FC = () => <Lienzo dibuja={dibuja} preparar={prepara} />;
