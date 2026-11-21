// Serie 2, capítulo 16: el equipo. Un piso de papel. Diez bolas idénticas caen del cielo y quedan como pinos de
// boliche frente a la protagonista: ¿diez mejor que una? Llueven 180 tarjetas, cada una con un acomodo de bolitas
// (las configuraciones que midió Google). Lo que se puede partir se parte: la hoja de la fiesta se rasga por sus
// perforaciones, tres bolas corren por carriles separados por lugar, pastel y música, no se tocan, y la protagonista
// (la coordinadora) junta lo que traen en una caja. Lo que va paso por paso no: los carriles se funden en uno, el
// enjambre se mete en fila, se pasa la misma hoja y se estorba; nueve bolas jalan un calendario que no avanza. Los
// errores: un corro de diez hojas y una mancha roja que salta de mano en mano hasta 17; con la protagonista en el
// centro se queda en 4. De cerca: una se equivoca, la otra lo sella como verdad, la mancha crece. Luego dos letreros
// enfrentados, Cognition y Anthropic; el calendario hojea un año y al de Cognition le grapan dos parches. Cierra con
// un cuchillo de papel que solo corta por las perforaciones: el pastel, que va paso por paso, se queda entero.
// Todos los instantes vienen de eventos.json, que escribe partitura.py: dibujo y sonido son los mismos números.
import React from "react";
import { azar, Cam, caida, camara, clamp, ease, guionCamara, lerp, prog, smooth, texto, Vista } from "../../kit";
import { ACENTO, bola, cue, GRIS, Lienzo, mono, PAPEL, rotulo, serif, sombra, TINTA } from "../../marca";
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
  mejor: s("mejor"), google: s("google"), config: s("configuraciones"), dividir: s("dividir"), paso: s("paso por paso"),
  empeoraron: s("empeoraron"), nueve: s("nueve mamás"), unmes: s("en un mes"), verdad: s("como verdad"), contra: s("contradijeron"),
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
const BLANCO = "#FDFCF8", CARTON = "#ECE6D7", CARTON_T = "#F4F0E6", CARTON_L = "#DCD4C1", ROJO = "#E9896C", CARRIL = "#E6E0D2";

function poli(c: C, Q: P3[], fill?: string | null, tinta: string | null = TINTA, g = 3, vib = 1) {
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
/** Dibuja en unidades locales (100 = 1 unidad de mundo) sobre un plano: o es el origen, ux y vy los ejes de 1 unidad. */
function plano(c: C, o: P3, ux: P3, vy: P3, f: () => void) {
  const a = Pv(o), b = Pv([o[0] + ux[0], o[1] + ux[1], o[2] + ux[2]]), d = Pv([o[0] + vy[0], o[1] + vy[1], o[2] + vy[2]]);
  if (!a || !b || !d) return;
  c.save(); c.transform((b.x - a.x) / 100, (b.y - a.y) / 100, (d.x - a.x) / 100, (d.y - a.y) / 100, a.x, a.y); f(); c.restore();
}
/** Plano grande visto de lado: se dibuja en tiras verticales, cada una con su propia transformación y su recorte.
 *  Con una sola transformación afín, un letrero al borde del cuadro se estira hasta llenar media pantalla. */
function planoTiras(c: C, o: P3, ux: P3, vy: P3, W: number, H: number, n: number, f: () => void) {
  const at = (lx: number, ly: number): P3 => [o[0] + ux[0] * lx / 100 + vy[0] * ly / 100, o[1] + ux[1] * lx / 100 + vy[1] * ly / 100, o[2] + ux[2] * lx / 100 + vy[2] * ly / 100];
  for (let j = 0; j < n; j++) {
    const x0 = W * j / n, x1 = W * (j + 1) / n;
    const A = Pv(at(x0, 0)), B = Pv(at(x1, 0)), D = Pv(at(x0, H)), E = Pv(at(x1, H));
    if (!A || !B || !D || !E) continue;
    if (Math.max(A.x, B.x, D.x, E.x) < -20 || Math.min(A.x, B.x, D.x, E.x) > 1100) continue;
    c.save();
    c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.lineTo(E.x, E.y); c.lineTo(D.x, D.y); c.closePath(); c.clip();
    const ax = (B.x - A.x) / (x1 - x0), ay = (B.y - A.y) / (x1 - x0), dx = (D.x - A.x) / H, dy = (D.y - A.y) / H;
    c.transform(ax, ay, dx, dy, A.x - ax * x0, A.y - ay * x0);
    f(); c.restore();
  }
}
/** Una hoja acostada en el piso: el texto se lee desde la cámara de frente. */
function enPiso(c: C, x: number, y: number, z: number, ang: number, f: () => void) {
  plano(c, [x, y, z], [Math.cos(ang), Math.sin(ang), 0], [Math.sin(ang), -Math.cos(ang), 0], f);
}
/** Un recorte de papel siempre de frente a la cámara, en unidades locales (100 = 1 unidad). */
function cartel(c: C, p: P3, f: () => void, giro = 0, k = 1) {
  const q = Pv(p); if (!q) return;
  c.save(); c.translate(q.x, q.y); c.rotate(giro); const e = q.s / 100 * k; c.scale(e, e); f(); c.restore();
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
const arco = (a: P3, b: P3, k: number, alto: number): P3 => { const p = L3(a, b, k); p[2] += alto * 4 * k * (1 - k); return p; };
function ajusta(c: C, s2: string, px: number, max: number, it = false) { c.font = serif(px, it); const w = c.measureText(s2).width; return w > max ? px * max / w : px; }
function textoL(c: C, s2: string, x: number, y: number, px: number, max: number, color = TINTA, it = false, alfa = 1) {
  texto(c, s2, x, y, { fuente: serif(ajusta(c, s2, px, max, it), it), color, alfa });
}

// ---------- el mundo (x a la derecha, y hacia el fondo, z hacia arriba) ----------
const R = .5;
type P2 = [number, number];
const PIN: P2[] = [[0, 0]], PINF: P2[] = [[0, 0]];
for (let r = 0; r < 4; r++) for (let j = 0; j <= r; j++) { PIN.push([.5 + (j - r / 2) * 1.08, -.25 + r * .95]); PINF.push([(j - r / 2) * 1.08, 12.5 + r * .95]); }
const ORILLA: P2[] = [[0, 0]];
for (let b = 1; b <= 10; b++) ORILLA.push(b <= 5 ? [-5.2, 1.0 + (b - 1) * 2.0] : [5.2, 1.0 + (b - 6) * 2.0]);
const OBRERO = [1, 2, 6], XC = [-1.6, 0, 1.6];
const PUESTO: P2[] = [[-1.6, 1.0], [0, 1.1], [1.6, 1.0]];
const Y_LLEGA = 6.25, Y_DEST = 7.0;
const HOJA: P3 = [0, -.2, 0];
const CAJA: P2 = [0, -.2], CAJA_FUERA: P2 = [-3.0, -1.1];
const CAL: P2 = [0, 11.6];
const CROWD: P2[] = [[0, 0], [0, 10.45], [-1.0, 10.8], [1.0, 10.8], [-1.8, 11.45], [1.8, 11.45], [-.55, 9.55], [.55, 9.55], [-1.6, 9.9], [1.6, 9.9], [2.45, 10.0]];
const CENTRO: P2 = [0, 6.2], RA = 2.25, RH = 1.25;
const angA = (b: number) => -Math.PI / 2 + (b - 1) * 2 * Math.PI / 10;
const ANILLO = (b: number): P2 => [RA * Math.cos(angA(b)), CENTRO[1] + RA * Math.sin(angA(b))];
const HOJAA = (b: number): P2 => [RH * Math.cos(angA(b)), CENTRO[1] + RH * Math.sin(angA(b))];
const SALIDA = (b: number): P2 => [b % 2 ? -5.1 : 5.1, 8.6 + b * .45];
const LET = [{ x: -1.62, y: 10.5, ang: .62, nombre: "Cognition" }, { x: 1.62, y: 10.5, ang: -.62, nombre: "Anthropic" }];
const BW = 2.5, BH = 1.75, BZ = 1.85;
const HF: P3 = [0, 10.4, 0];                                   // la hoja final
const HFW = 3.0, HFD = 1.05;
const MOV = (b: number) => b * 0 + 1;

// ---------- trayectorias ----------
const g0 = ev.caida.g, h0 = ev.caida.h, CAE = Math.sqrt(2 * h0 / g0);
const esp = (t: number) => 1.0 - .17 * smooth(prog(t, ev.choque, ev.choque + .7)) * (1 - smooth(prog(t, ev.choque + 2.2, ev.choque + 3.2)))
  - .12 * ventana(t, ev.choque2 - .1, ev.choque2 + .5, .3, .5);
const FILA = (b: number) => (t: number): P3 => [0, 10.2 - (b - 1) * esp(t), 0];
const p3 = (p: P2): P3 => [p[0], p[1], 0];
const RUTAS: { ini: P3; S: Clave[] }[] = [];
{
  const H: Clave[] = [
    [ev.dispersa, ev.dispersa + .9, [0, -.1, 0]], [ev.rafaga + .1, ev.rafaga + .8, [0, -2.05, 0]],
    [ev.funde + .15, ev.funde + .85, [0, .05, 0]], [ev.calendario - .7, ev.calendario + .4, [-2.45, 10.0, 0]],
    [ev.corro - .05, ev.corro + .9, [0, 2.5, 0]], [ev.rebobina, ev.centro, p3(CENTRO), (x) => x],
    [ev.escribe - .55, ev.escribe + .3, [-4.6, 6.8, 0]], [ev.letreros[0] - .95, ev.letreros[0] + .25, [0, 9.35, 0]],
    [ev.nogana + .15, ev.nogana + 1.1, [0, 9.2, 0]], [ev.separa, ev.separa + .6, [0, 8.8, 0]],
  ];
  RUTAS.push({ ini: [-.8, -1.45, 0], S: H });
  for (let b = 1; b <= 10; b++) {
    const S: Clave[] = [[ev.dispersa + .04 * b, ev.dispersa + .95 + .04 * b, p3(ORILLA[b])]];
    const w = OBRERO.indexOf(b);
    if (w >= 0) S.push([ev.equipo + .12 * w, ev.equipo + .8 + .12 * w, p3(PUESTO[w])], [ev.salen, ev.llegan, [XC[w], Y_LLEGA, 0]], [ev.vuelven, ev.vuelven + .85, p3(PUESTO[w])]);
    S.push([ev.todas - 1.0 + .04 * b, ev.llegada[b - 1], FILA(b), (x) => ease.outBack(x, 1.4)]);
    S.push([ev.calendario - .95 + .05 * b, ev.calendario + .15 + .05 * b, p3(CROWD[b])]);
    S.push([ev.corro + .03 * b, ev.corro + .85 + .03 * b, p3(ANILLO(b))]);
    const ti = [10, 1, 2].indexOf(b);
    if (ti >= 0) S.push([ev.escribe - .7 + ti * .06, ev.escribe - .1 + ti * .06, [(ti - 1) * 1.05, ti === 1 ? 2.55 : 2.8, 0]]);
    S.push([ev.letreros[0] - .8 + .03 * b, ev.letreros[0] + .05 + .03 * b, p3(SALIDA(b))]);
    S.push([ev.nogana + .1 + .06 * b, ev.nogana + 1.15 + .06 * b, p3(PINF[b])]);
    S.push([ev.gana - .65 + .02 * b, ev.gana + .15 + .02 * b, [PINF[b][0] < 0 || (PINF[b][0] === 0 && b % 2) ? -5.3 - .2 * (b % 3) : 5.3 + .2 * (b % 3), PINF[b][1] - .4, 0]]);
    if (b === 2) S.push([ev.toman - .2, ev.toman + .45, [-1.5, 11.4, 0]], [ev.toman + .75, ev.toman + 1.7, [-1.72, 11.45, 0]]);
    if (b === 3) S.push([ev.toman - .1, ev.toman + .55, [1.5, 11.4, 0]], [ev.toman + .85, ev.toman + 1.8, [1.72, 11.45, 0]]);
    RUTAS.push({ ini: p3(PIN[b]), S });
  }
}
/** Saltos: [instante, altura, bolas]. */
const SALTOS: [number, number, number[]][] = [
  [ev.caen[9] + .32, .32, [0]], ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((b) => [ev.uno + .28 + b * .045, .2, [b]] as [number, number, number[]]), [ev.sorprende, .55, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]], [ev.coord, .25, [0]], [ev.ochenta, .4, [0, 1, 2, 6]], [ev.junta[2] + .1, .35, [0]],
  ...ev.llegada.map((x, k) => [x - .38, .55, [k + 1]] as [number, number, number[]]),
  [ev.choques[4], .9, [6]], [ev.choque2 + .2, .6, [3]],
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map((b) => [ev.empujan + b * .09, .14, [b]] as [number, number, number[]]),
  [ev.suelta + .05, .75, [1]], [ev.suelta + .3, .2, [0, 10]],
  ...ev.manchas.map((x, k) => [x + .02, .22, [(k % 10) + 1]] as [number, number, number[]]),
  ...ev.manchas4.map((x, k) => [x + .02, .22, [k + 5]] as [number, number, number[]]),
  [ev.verdad, .18, [1]], [ev.crece + .05, .25, [2]], [ev.razon[1] + .1, .3, [0]],
  [ev.remate, .32, [0]], [ev.remate + .12, .18, [1, 4, 5, 6, 7, 8, 9, 10]],
];
const IMPACTOS: [number, number, number][] = [];       // [instante, fuerza, bola] para aplastar
ev.caen.forEach((tc, k) => { const c0 = caida(9, h0, ev.caida.rest, g0); c0.impactos.slice(0, 3).forEach((ti, j) => IMPACTOS.push([tc - CAE + ti, .2 * .45 ** j, k + 1])); });
ev.llegada.forEach((x, k) => { IMPACTOS.push([x, .16, k + 1]); if (k) IMPACTOS.push([x + .03, .1, k]); });
ev.choques.forEach((x, k) => IMPACTOS.push([x, .16, 10 - k]));
IMPACTOS.push([ev.centro, .28, 0], [ev.suelta + .8, .2, 1]);
SALTOS.forEach(([ti, h, bs]) => bs.forEach((b) => IMPACTOS.push([ti + .25 + .4 * Math.sqrt(h), .12 * Math.min(1, h * 2), b])));

function salto(b: number, t: number) {
  let z = 0;
  for (const [ti, h, bs] of SALTOS) {
    if (!bs.includes(b)) continue;
    const d = t - ti, dur = .25 + .4 * Math.sqrt(h);
    if (d > 0 && d < dur) z += h * Math.sin(Math.PI * d / dur);
  }
  if (b === 0 && t > ev.rebobina && t < ev.centro) z += 2.3 * Math.sin(Math.PI * prog(t, ev.rebobina, ev.centro));
  if (b > 0 && t < ev.caen[b - 1] + 2) z += caida(t - (ev.caen[b - 1] - CAE), h0, ev.caida.rest, g0).z;
  return z;
}
function aplasta(b: number, t: number) {
  let a = 0;
  for (const [ti, f, bb] of IMPACTOS) { if (bb !== b) continue; const d = t - ti; if (d > 0 && d < 1) a += f * Math.exp(-d * 9) * Math.cos(d * 26); }
  return a;
}
function posBola(b: number, t: number): P3 {
  const r = RUTAS[b];
  const p = ruta(t, r.ini, r.S);
  const fase = b * 1.7;
  // la multitud empuja hacia el calendario
  if (b >= 1 && b <= 9 && t > ev.empujan - .2 && t < ev.corro) {
    const k = ventana(t, ev.empujan - .2, ev.suelta + .2, .3, .5) * (.08 + .05 * vaiven(t, .23, fase));
    p[0] += (CAL[0] - p[0]) * k * .3; p[1] += (CAL[1] - p[1]) * k * .3;
  }
  if (b === 1 && t > ev.suelta) p[1] -= .55 * ease.outCubic(prog(t, ev.suelta, ev.suelta + .5)) * (1 - smooth(prog(t, ev.corro - .3, ev.corro)));
  return [p[0] + .025 * vaiven(t, 2.3 + b * .17, fase), p[1] + .02 * vaiven(t, 2.9 + b * .13, fase + 1), salto(b, t)];
}

// ---------- manos ----------
type Mano = { p: P3; abre: number };
function manos(b: number, t: number, P: P3): [Mano, Mano] {
  const [x, y, z] = P, zc = z;
  const sw = .05 * vaiven(t, 1.3 + b * .11, b);
  let m1: Mano = { p: [x - .62, y - .14, .3 + zc + sw], abre: .55 }, m2: Mano = { p: [x + .62, y - .14, .3 + zc - sw], abre: .55 };
  // «depende»: todas se encogen de hombros a la vez
  const enc = ventana(t, ev.depende - .12, ev.depende + .85, .18, .35);
  if (enc > 0) {
    m1 = { p: L3(m1.p, [x - .82, y - .1, 1.25 + zc], enc), abre: lerp(.55, .95, enc) };
    m2 = { p: L3(m2.p, [x + .82, y - .1, 1.25 + zc], enc), abre: lerp(.55, .95, enc) };
  }
  if (b === 0) {
    const uno = ventana(t, ev.uno - .2, ev.depende - .15, .2, .15);
    if (uno > 0) m2 = { p: L3(m2.p, [x + .3, y - .3, 1.6 + zc], uno), abre: lerp(.55, .1, uno) };
    // rasga la hoja con las dos manos
    const rg = ventana(t, ev.hoja + .2, ev.coord - .1, .35, .4);
    if (rg > 0) {
      const ab = ease.outCubic(prog(t, ev.rasga[0], ev.rasga[1] + .1));
      m1 = { p: L3(m1.p, [-.55 - ab * .35, HOJA[1] - .25, .32 + .2 * ab], rg), abre: .3 };
      m2 = { p: L3(m2.p, [.55 + ab * .35, HOJA[1] - .25, .32 + .2 * ab], rg), abre: .3 };
    }
    // recibe en la caja
    const cj = ventana(t, ev.junta[0] - .35, ev.funde + .2, .25, .4);
    if (cj > 0) { m1 = { p: L3(m1.p, [CAJA[0] - .7, CAJA[1] - .3, .55], cj), abre: .8 }; m2 = { p: L3(m2.p, [CAJA[0] + .7, CAJA[1] - .3, .55], cj), abre: .8 }; }
    // empuja la caja fuera
    const em = ventana(t, ev.funde - .1, ev.funde + .6, .15, .3);
    if (em > 0) m1 = { p: L3(m1.p, [x - .9, y + .05, .4], em), abre: .9 };
    // sostiene la hoja de pasos
    const hp = ventana(t, ev.pasos[0] - .5, ev.pases[0] + .05, .25, .2);
    if (hp > 0) m2 = { p: L3(m2.p, [x + .25, y + .45, 1.05 + zc], hp), abre: .3 };
    // en el centro del corro ataja la gota
    const at = ventana(t, ev.ataja - .3, ev.ataja + .35, .2, .3);
    if (at > 0) m2 = { p: L3(m2.p, puntoAtaja(), at), abre: lerp(.55, .1, smooth(prog(t, ev.ataja - .05, ev.ataja))) };
    // señala cada letrero
    const sc = ventana(t, ev.letreros[0] + .1, ev.cognition - .5, .3, .3), sa = ventana(t, ev.letreros[1] + .1, ev.cognition - .5, .3, .3);
    if (sc > 0) m1 = { p: L3(m1.p, [x - .75, y + .3, 1.35], sc), abre: .2 };
    if (sa > 0) m2 = { p: L3(m2.p, [x + .75, y + .3, 1.35], sa), abre: .2 };
    const ra = ventana(t, ev.razon[0] - .2, ev.nogana, .25, .4);
    if (ra > 0) { m1 = { p: L3(m1.p, [x - .8, y - .05, 1.4], ra), abre: .9 }; m2 = { p: L3(m2.p, [x + .8, y - .05, 1.4], ra), abre: .9 }; }
    // el cuchillo de papel
    if (t > ev.gana - .2) {
      const k = smooth(prog(t, ev.gana - .2, ev.gana + .35));
      m2 = { p: L3(m2.p, manoCuchillo(t), k), abre: .15 };
      m1 = { p: L3(L3(m1.p, [HF[0] - .95, HF[1] - .45, .05], smooth(prog(t, ev.gana + .2, ev.gana + .7))), [HF[0] - .3, HF[1] - .42, .05], smooth(prog(t, ev.separa, ev.separa + .4))), abre: .9 };
    }
  }
  const w = OBRERO.indexOf(b);
  if (w >= 0 && t > ev.coord && t < ev.funde + .3) {
    const k = ventana(t, ev.coord + .1, ev.funde, .3, .3);
    m1 = { p: L3(m1.p, [x - .25, y - .55, .95 + zc], k), abre: .3 };
    const toma = [ev.lugar, ev.pastel, ev.musica][w];
    const tm = ventana(t, toma - .3, toma + .15, .2, .25);
    if (tm > 0) m2 = { p: L3(m2.p, [XC[w] + .2, Y_DEST - .2, .45], tm), abre: .2 };
  }
  // la fila: quien tiene la hoja la sostiene adelante
  const tien = quienHojaPasos(t);
  if (tien.b === b && t > ev.pases[0] - .05 && t < ev.calendario) m1 = { p: [x - .2, y + .5, 1.05 + zc], abre: .3 };
  // la que jala el calendario
  if (b === 1) {
    const j = ventana(t, ev.jala - .35, ev.suelta + .02, .3, .05);
    if (j > 0) m2 = { p: L3(m2.p, bordePagina(t), j), abre: .15 };
  }
  if (b >= 2 && b <= 9 && t > ev.empujan - .3 && t < ev.corro) {
    const k = ventana(t, ev.empujan - .3, ev.suelta + .3, .3, .4);
    const dx = CAL[0] - x, dy = CAL[1] - y, d = Math.hypot(dx, dy) || 1;
    m1 = { p: L3(m1.p, [x + dx / d * .6 - .2, y + dy / d * .6, .7], k), abre: .9 };
    m2 = { p: L3(m2.p, [x + dx / d * .6 + .2, y + dy / d * .6, .75], k), abre: .9 };
  }
  // de cerca: A escribe, B sella, C recibe
  const cerca = t > ev.escribe - .6 && t < ev.letreros[0];
  if (cerca) {
    const ch = cercaHoja(t);
    if (b === 10) {
      const k = ventana(t, ev.escribe - .5, ev.pasa + .15, .3, .2);
      m1 = { p: L3(m1.p, [x + .25, y - .6, 1.0], k), abre: .3 };
      const pl = ventana(t, ev.escribe - .3, ev.equivoca + .5, .25, .3);
      const px = ch.p[0] + .2 * Math.sin(t * 11), pz = ch.p[2] + .12 * Math.sin(t * 7.3);
      m2 = { p: L3(m2.p, [px + .08, ch.p[1] - .1, pz - .1], pl), abre: .15 };
    }
    if (b === 1) {
      const k = ventana(t, ev.pasa - .2, ev.copia + .1, .25, .2);
      m1 = { p: L3(m1.p, [x - .3, y - .6, 1.0], k), abre: .3 };
      const se = ventana(t, ev.verdad - .45, ev.verdad + .35, .2, .3);
      const golpe = t < ev.verdad ? 1 - ease.inCubic(prog(t, ev.verdad - .3, ev.verdad)) : 0;
      m2 = { p: L3(m2.p, [ch.p[0] + .22, ch.p[1] - .25, ch.p[2] - .05 + .45 * golpe], se), abre: .1 };
    }
    if (b === 2) {
      const k = ventana(t, ev.copia - .1, ev.letreros[0] - .9, .3, .3);
      m1 = { p: L3(m1.p, [x - .3, y - .6, 1.0], k), abre: .3 };
    }
  }
  return [m1, m2];
}

// ---------- la protagonista y el enjambre ----------
function dibujaBola(c: C, P: P3, m1: Mano, m2: Mano, ap: number) {
  const q = Pv([P[0], P[1], R + P[2]]); if (!q) return;
  const r = R * q.s, g = r / 90;
  const sp = Pv([P[0], P[1], 0]); if (sp) sombra(c, sp.x, sp.y, r * 1.55, .34 / (1 + P[2] * 1.3));
  const h1 = Pv(m1.p), h2 = Pv(m2.p);
  const hom1: [number, number] = [q.x - 54 * g, q.y - 50 * g], hom2: [number, number] = [q.x + 60 * g, q.y - 30 * g];
  const b1 = () => { if (h1) brazo(c, hom1[0], hom1[1], h1.x, h1.y, 90 * g, m1.abre, TINTA, 1, g); };
  const b2 = () => { if (h2) brazo(c, hom2[0], hom2[1], h2.x, h2.y, -100 * g, m2.abre, TINTA, 1, g); };
  const d1 = !!h1 && h1.zc < q.zc - .3, d2 = !!h2 && h2.zc < q.zc - .3;
  if (!d1) b1(); if (!d2) b2();
  c.save(); c.translate(q.x, q.y + r); c.scale(1 + ap, 1 - ap); bola(c, 0, -r, r); c.restore();
  if (d1) b1(); if (d2) b2();
}

// ---------- utilería de papel (unidades locales: 100 = 1 unidad de mundo) ----------
function icono(c: C, n: number, k = 1) {
  c.save(); c.scale(k, k); c.lineJoin = "round"; c.lineCap = "round"; c.strokeStyle = TINTA; c.lineWidth = 4;
  if (n === 0) {                                             // lugar: una casita
    c.fillStyle = BLANCO; c.beginPath(); c.moveTo(-22, -2); c.lineTo(0, -22); c.lineTo(22, -2); c.lineTo(22, 22); c.lineTo(-22, 22); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = ACENTO; c.beginPath(); c.moveTo(-27, 0); c.lineTo(0, -26); c.lineTo(27, 0); c.lineTo(22, 4); c.lineTo(0, -16); c.lineTo(-22, 4); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = TINTA; c.fillRect(-6, 8, 12, 14);
  } else if (n === 1) {                                      // pastel: dos pisos y una vela
    c.fillStyle = BLANCO; c.beginPath(); c.rect(-24, 2, 48, 20); c.fill(); c.stroke(); c.beginPath(); c.rect(-16, -12, 32, 14); c.fill(); c.stroke();
    c.strokeStyle = ACENTO; c.beginPath(); c.moveTo(-24, 10); for (let i = 0; i <= 8; i++) c.lineTo(-24 + i * 6, 10 + (i % 2 ? 4 : -1)); c.stroke();
    c.strokeStyle = TINTA; c.beginPath(); c.moveTo(0, -12); c.lineTo(0, -22); c.stroke();
    c.fillStyle = ACENTO; c.beginPath(); c.ellipse(0, -27, 4, 6, 0, 0, 7); c.fill();
  } else {                                                   // música: dos corcheas
    c.fillStyle = TINTA; c.beginPath(); c.ellipse(-12, 14, 9, 7, -.4, 0, 7); c.fill(); c.beginPath(); c.ellipse(14, 8, 9, 7, -.4, 0, 7); c.fill();
    c.lineWidth = 4.5; c.beginPath(); c.moveTo(-4, 12); c.lineTo(-4, -18); c.lineTo(22, -24); c.lineTo(22, 6); c.stroke();
    c.strokeStyle = ACENTO; c.lineWidth = 7; c.beginPath(); c.moveTo(-4, -16); c.lineTo(22, -22); c.stroke();
  }
  c.restore();
}
/** La hoja de la fiesta: tres tramos separados por perforaciones. `quitar`: oculta tramos ya rasgados. */
function tramo(c: C, i: number, w = 90, d = 95, conPasos = false, palabra = false) {
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 3;
  c.beginPath(); c.rect(-w / 2, -d / 2, w, d); c.fill(); c.stroke();
  if (conPasos) {
    icono(c, 1, .9); c.translate(0, 0);
  } else icono(c, i, 1.15);
  if (palabra) textoL(c, ["lugar", "pastel", "música"][i], 0, d / 2 - 12, 22, w - 14, TINTA, true);
}
function perforacion(c: C, x: number, y0: number, y1: number, k = 1) {
  c.save(); c.strokeStyle = ACENTO; c.lineWidth = 3.2 * k; c.setLineDash([6 * k, 6 * k]); c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y1); c.stroke(); c.restore();
}
function hojaPasos(c: C, t: number, ar: number) {
  const W = 130, H = 70;
  c.save(); c.rotate(ar * .25);
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 3.5; c.beginPath(); c.rect(-W / 2, -H / 2, W, H); c.fill(); c.stroke();
  if (ar > 0) { c.strokeStyle = `rgba(17,17,17,${.35 * ar})`; c.lineWidth = 2; c.beginPath(); c.moveTo(-50, -35); c.lineTo(-20, 5); c.lineTo(-40, 35); c.moveTo(30, -35); c.lineTo(15, 0); c.lineTo(45, 35); c.stroke(); }
  for (let k = 0; k < 4; k++) {
    const a = ease.outBack(prog(t, ev.pasos[k] - .05, ev.pasos[k] + .2), 2);
    const x = -46 + k * 31;
    if (a <= 0) continue;
    c.save(); c.translate(x, 2); c.scale(a, a);
    c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 11, 0, 7); c.stroke();
    texto(c, String(k + 1), 0, 7, { fuente: mono(17), color: TINTA }); c.restore();
    if (k < 3 && a >= 1) { c.strokeStyle = ACENTO; c.lineWidth = 2.6; c.beginPath(); c.moveTo(x + 13, 2); c.lineTo(x + 18, 2); c.stroke(); c.fillStyle = ACENTO; c.beginPath(); c.moveTo(x + 21, 2); c.lineTo(x + 16, -2); c.lineTo(x + 16, 6); c.fill(); }
  }
  c.restore();
}
function mancha(c: C, x: number, y: number, r: number, seed: number) {
  if (r <= .3) return;
  const q = azar(seed);
  c.fillStyle = ACENTO; c.beginPath();
  for (let i = 0; i <= 14; i++) { const a = i / 14 * 6.2832, rr = r * (.78 + q() * .4); if (i === 0) c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); c.fill();
  for (let i = 0; i < 5; i++) { const a = q() * 6.28, d = r * (1.15 + q() * .6); c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * (.1 + q() * .14), 0, 7); c.fill(); }
}
function sello(c: C, a: number) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a; c.strokeStyle = ACENTO; c.lineWidth = 7; c.lineCap = "round"; c.lineJoin = "round";
  const k = ease.outBack(clamp(a * 1.3), 2.2); c.scale(k, k);
  c.beginPath(); c.moveTo(-14, 0); c.lineTo(-4, 12); c.lineTo(18, -16); c.stroke(); c.restore();
}
function cuchillo(c: C, ax: number, ay: number, bx: number, by: number, dobla: number, k: number) {
  // ax,ay: mango (la mano); bx,by: la punta
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const mango = L * .28, w = 24 * k;
  c.save(); c.lineJoin = "round"; c.lineWidth = 3.5 * k; c.strokeStyle = TINTA;
  c.fillStyle = TINTA; c.beginPath(); c.moveTo(ax - nx * w * .55, ay - ny * w * .55); c.lineTo(ax + ux * mango - nx * w * .6, ay + uy * mango - ny * w * .6);
  c.lineTo(ax + ux * mango + nx * w * .6, ay + uy * mango + ny * w * .6); c.lineTo(ax + nx * w * .55, ay + ny * w * .55); c.closePath(); c.fill();
  const cx = ax + ux * L * .7 + nx * dobla * L * .25, cy = ay + uy * L * .7 + ny * dobla * L * .25;
  c.fillStyle = "#E4E0D6"; c.beginPath();
  c.moveTo(ax + ux * mango - nx * w * .7, ay + uy * mango - ny * w * .7);
  c.quadraticCurveTo(cx - nx * w * .6, cy - ny * w * .6, bx, by);
  c.quadraticCurveTo(cx + nx * w * .45, cy + ny * w * .45, ax + ux * mango + nx * w * .7, ay + uy * mango + ny * w * .7);
  c.closePath(); c.fill(); c.stroke();
  c.restore();
}

// ---------- 180 tarjetas ----------
const NC = 12, NF = 15, PASO = .62;
const cartaPos = (i: number): P2 => [((i % NC) - (NC - 1) / 2) * PASO, 5.0 + (Math.floor(i / NC) - (NF - 1) / 2) * PASO];
function carta(c: C, i: number) {
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 2.4; c.beginPath(); c.rect(-25, -25, 50, 50); c.fill(); c.stroke();
  const k = i % 5, n = 3 + ((i * 7) % 3), q = azar(i + 3);
  const P: P2[] = [];
  if (k === 0) P.push([0, 0]);
  else if (k === 1) for (let j = 0; j < n; j++) P.push([(j - (n - 1) / 2) * 11, (q() - .5) * 6]);
  else { if (k !== 3) P.push([0, 0]); for (let j = 0; j < n; j++) { const a = j / n * 6.283 + q(); P.push([Math.cos(a) * 14, Math.sin(a) * 14]); } }
  c.strokeStyle = TINTA; c.lineWidth = 1.8; c.beginPath();
  if (k === 2 || k === 4) for (let j = 1; j < P.length; j++) { c.moveTo(0, 0); c.lineTo(P[j][0], P[j][1]); }
  if (k === 3 || k === 4) { const o = k === 4 ? 1 : 0; for (let j = o; j < P.length; j++) { const a = P[j], b = P[j + 1 < P.length ? j + 1 : o]; c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); } }
  c.stroke();
  P.forEach((p, j) => { c.fillStyle = (k === 2 || k === 4) && j === 0 ? ACENTO : TINTA; c.beginPath(); c.arc(p[0], p[1], 4.2, 0, 7); c.fill(); });
}
function cartas(c: C, t: number) {
  if (t < ev.cartas.reduce((a, b) => Math.min(a, b)) - .6 || t > ev.rafaga + 2.2) return;
  for (let i = 0; i < 180; i++) {
    const L = ev.cartas[i]; if (t < L - .55) continue;
    const [x, y] = cartaPos(i);
    let z = 0, X = x, Y = y, ang = ((i * 37) % 11 - 5) * .012, vuelta = 0;
    if (t < L) { const d = L - t; z = 5.5 * d * d; ang += d * 5 * (i % 2 ? 1 : -1); X += Math.sin(d * 9 + i) * .25 * d; }
    const rd = ev.rafaga + (y - .6) * .03 + ((i * 13) % 7) * .02;
    if (t > rd) { const d = t - rd; z = 2.4 * d * d + .6 * d; Y += 9 * d * d + 1.5 * d; X += Math.sin(i * 2.1) * 2.5 * d * d; ang += d * 4 * (i % 2 ? 1 : -1); vuelta = d * 3; }
    if (z > 7) continue;
    const sp = Pv([X, Y, 0]); if (sp && z > .02) sombra(c, sp.x, sp.y, 30 * sp.s / 100, .25 / (1 + z * 2));
    const fl = Math.cos(vuelta);
    plano(c, [X, Y, z], [Math.cos(ang), Math.sin(ang), 0], [Math.sin(ang) * fl, -Math.cos(ang) * fl, Math.sin(vuelta)], () => carta(c, i));
  }
}

// ---------- carriles ----------
function carriles(c: C, t: number) {
  if (t < ev.carriles - .1 || t > ev.calendario + 1.2) return;
  const crece = ease.outCubic(prog(t, ev.carriles, ev.carriles + .85));
  const funde = ease.inOutCubic(prog(t, ev.funde, ev.funde + 1.0));
  const alto = .14 * (1 - ease.inCubic(prog(t, ev.calendario - .1, ev.calendario + .45)));
  const alfa = 1 - smooth(prog(t, ev.calendario + .2, ev.calendario + 1.1));
  c.save(); c.globalAlpha = alfa;
  const lanes = funde > .98 ? [0] : [0, 1, 2];
  for (const k of lanes) {
    const xc = lerp(XC[k], 0, funde);
    const y0 = lerp(1.6, .65, funde), y1 = lerp(1.6 + 5.0 * crece, 10.75, funde);
    const w = .62;
    poli(c, [[xc - w, y0, 0], [xc + w, y0, 0], [xc + w, y1, 0], [xc - w, y1, 0]], CARRIL, null);
    for (const sx of [-1, 1]) {
      const xw = xc + sx * w;
      if (alto > .005) poli(c, [[xw, y0, 0], [xw, y1, 0], [xw, y1, alto], [xw, y0, alto]], CARTON_T, TINTA, 2.6, .6);
      else lin(c, [xw, y0, 0], [xw, y1, 0], 2.6);
    }
    if (alto > .005) poli(c, [[xc - w, y1, 0], [xc + w, y1, 0], [xc + w, y1, alto], [xc - w, y1, alto]], CARTON_L, TINTA, 2.6, .6);
  }
  c.restore();
}

// ---------- la caja de la fiesta ----------
function cajaPos(t: number): P2 {
  const k = ease.inOutCubic(prog(t, ev.funde - .05, ev.funde + .7));
  return [lerp(CAJA[0], CAJA_FUERA[0], k), lerp(CAJA[1], CAJA_FUERA[1], k)];
}
function caja(c: C, t: number, parte: "atras" | "frente") {
  const a = ease.outBack(prog(t, ev.salen + .2, ev.salen + .6), 1.8); if (a <= 0) return;
  const [cx, cy] = cajaPos(t), w = .62 * a, d = .4 * a, h = .42 * a;
  if (parte === "atras") {
    poli(c, [[cx - w, cy + d, 0], [cx + w, cy + d, 0], [cx + w, cy + d, h], [cx - w, cy + d, h]], CARTON_L, TINTA, 2.6);
    poli(c, [[cx - w, cy - d, 0], [cx - w, cy + d, 0], [cx - w, cy + d, h], [cx - w, cy - d, h]], CARTON_L, TINTA, 2.6);
    poli(c, [[cx + w, cy - d, 0], [cx + w, cy + d, 0], [cx + w, cy + d, h], [cx + w, cy - d, h]], CARTON_L, TINTA, 2.6);
    // lo que ya cayó adentro asoma
    for (let k = 0; k < 3; k++) {
      const tk = ev.junta[k]; if (t < tk) continue;
      const rebote = Math.exp(-(t - tk) * 7) * Math.sin((t - tk) * 22) * .08;
      cartel(c, [cx + (k - 1) * .38, cy + .02, h + .1 + rebote], () => icono(c, k, .95));
    }
  } else {
    poli(c, [[cx - w, cy - d, 0], [cx + w, cy - d, 0], [cx + w, cy - d, h], [cx - w, cy - d, h]], CARTON, TINTA, 2.6);
    cartel(c, [cx, cy - d - .01, h * .48], () => { c.strokeStyle = ACENTO; c.lineWidth = 5; c.beginPath(); c.moveTo(-18, -8); c.lineTo(0, 0); c.lineTo(18, -8); c.moveTo(0, 0); c.lineTo(0, 14); c.stroke(); });
  }
}

// ---------- el calendario ----------
function bordePagina(t: number): P3 {
  const lev = ease.outCubic(prog(t, ev.jala, ev.jala + .55)) * (t < ev.suelta ? 1 : 0);
  return [CAL[0] - .42, CAL[1] - .1 - .7 * lev, 1.05 + 1.35 * lev];
}
function calendario(c: C, t: number) {
  const sube = t < ev.letreros[0] - .5
    ? ease.outBack(prog(t, ev.calendario, ev.calendario + .45), 1.5) * (1 - ease.inCubic(prog(t, ev.corro + .1, ev.corro + .6)))
    : ease.outBack(prog(t, ev.letreros[1] + .25, ev.letreros[1] + .7), 1.5) * (1 - ease.inCubic(prog(t, ev.nogana + .1, ev.nogana + .7)));
  if (sube <= 0) return;
  const [x, y] = CAL, z0 = -2.6 * (1 - sube);
  const W2 = .68, Z1 = 1.0 + z0, Z2 = 2.55 + z0;
  lin(c, [x - .45, y + .05, z0], [x - .45, y + .05, Z1], 9 * (Pv([x, y, 1])?.s ?? 100) / 100, "#3a3226");
  lin(c, [x + .45, y + .05, z0], [x + .45, y + .05, Z1], 9 * (Pv([x, y, 1])?.s ?? 100) / 100, "#3a3226");
  poli(c, [[x - W2, y + .02, Z1], [x + W2, y + .02, Z1], [x + W2, y + .02, Z2], [x - W2, y + .02, Z2]], CARTON_L, TINTA, 3);
  // páginas: la de arriba se puede levantar y regresa como resorte; con el año se hojean doce
  const hoja = (num: number, lev: number, vuelo: number) => {
    const yy = y - .02, zb = Z1 + .02 + lev * 1.35, yb = yy - .7 * lev;
    const ang = vuelo * Math.PI;                               // 0: colgada, 1: volteada hacia arriba y atrás
    const top: P3[] = [[x - W2 + .04, yy, Z2 - .1], [x + W2 - .04, yy, Z2 - .1]];
    const bajo: P3 = [0, yb - Math.sin(ang) * 1.2, Z2 - .1 - Math.cos(ang) * (Z2 - .1 - zb)];
    const Q: P3[] = [top[0], top[1], [x + W2 - .04, bajo[1], bajo[2]], [x - W2 + .04, bajo[1], bajo[2]]];
    poli(c, Q, BLANCO, TINTA, 3);
    if (vuelo < .5) plano(c, [x - W2 + .04, yy, Z2 - .1], [1, 0, 0], [0, (bajo[1] - yy) / (Z2 - .1 - bajo[2]) * 0, -1], () => {
      const hgt = (Z2 - .1 - bajo[2]) * 100;
      c.fillStyle = ACENTO; c.fillRect(0, 0, (W2 - .04) * 200, Math.min(26, hgt));
      if (hgt > 60) {
        texto(c, "mes", (W2 - .04) * 100, 20, { fuente: serif(20, true), color: BLANCO });
        texto(c, String(num), (W2 - .04) * 100, Math.min(hgt - 18, 112), { fuente: serif(Math.min(96, hgt * .8)), color: TINTA });
      }
    });
  };
  const rif = prog(t, ev.anio, ev.anio + .85);
  if (rif > 0 && rif < 1) {
    const n = Math.floor(rif * 12), f = rif * 12 - n;
    hoja(((n + 1) % 12) + 1, 0, 0);
    hoja((n % 12) + 1, 0, f);
  } else {
    let lev = 0;
    if (t > ev.jala && t < ev.suelta) lev = ease.outCubic(prog(t, ev.jala, ev.jala + .55));
    if (t >= ev.suelta) { const d = t - ev.suelta; lev = Math.max(0, Math.exp(-d * 6) * Math.cos(d * 30) * .35); }
    if (lev > .02) hoja(2, 0, 0);
    hoja(1, lev, 0);
  }
  // espiral
  for (let i = 0; i < 6; i++) { const q = Pv([x - .5 + i * .2, y - .03, Z2 - .04]); if (q) { c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.arc(q.x, q.y, 6 * q.s / 100, Math.PI * .9, Math.PI * 2.1); c.stroke(); } }
  // un biberón colgado arriba, para que se entienda el chiste
  cartel(c, [x, y - .05, Z2 + .32], () => {
    c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.roundRect(-11, -8, 22, 34, 6); c.fill(); c.stroke();
    c.fillStyle = ACENTO; c.beginPath(); c.roundRect(-13, -14, 26, 8, 3); c.fill(); c.stroke();
    c.fillStyle = BLANCO; c.beginPath(); c.moveTo(-6, -14); c.quadraticCurveTo(0, -30, 6, -14); c.fill(); c.stroke();
    c.strokeStyle = GRIS; c.lineWidth = 2; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(-11, 2 + k * 7); c.lineTo(-4, 2 + k * 7); c.stroke(); }
  }, 0, sube);
}

// ---------- el corro: hojas y manchas ----------
const BLOT = ev.manchas.map((tm, k) => ({ t: tm, hoja: (k % 10) + 1, n: Math.floor(k / 10), seed: 31 + k }));
const BLOT4 = ev.manchas4.map((tm, k) => ({ t: tm, hoja: k + 5, n: 0, seed: 71 + k }));
function radioMancha(t: number, tm: number, k: number, total: number, conj: "a" | "b") {
  const ent = ease.outBack(prog(t, tm, tm + .22), 2.5);
  if (conj === "a") {
    // el rebobinado se las traga en orden inverso
    const sale = smooth(prog(t, ev.rebobina + (total - 1 - k) * .018, ev.rebobina + (total - 1 - k) * .018 + .14));
    return ent * (1 - sale);
  }
  return ent * (1 - smooth(prog(t, ev.escribe - .5, ev.escribe - .1)));
}
function hojasCorro(c: C, t: number) {
  const a = ventana(t, ev.corro + .5, ev.letreros[0] - .9, .4, .4); if (a <= 0) return;
  c.save(); c.globalAlpha = a;
  for (let b = 1; b <= 10; b++) {
    const [hx, hy] = HOJAA(b);
    const ang = angA(b) + Math.PI / 2;
    const ent = ease.outBack(prog(t, ev.corro + .55 + b * .04, ev.corro + .85 + b * .04), 1.6);
    if (ent <= 0) continue;
    enPiso(c, hx, hy, .003, ang, () => {
      c.scale(ent, ent);
      c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 2.6; c.beginPath(); c.rect(-30, -38, 60, 76); c.fill(); c.stroke();
      c.strokeStyle = "rgba(17,17,17,.45)"; c.lineWidth = 2.4;
      for (let l = 0; l < 4; l++) { c.beginPath(); c.moveTo(-20, -24 + l * 13); c.lineTo(14 - (l % 2) * 10, -24 + l * 13); c.stroke(); }
      BLOT.forEach((m, k) => { if (m.hoja === b && t > m.t) mancha(c, m.n ? 10 : -6, m.n ? 18 : -8, 13 * radioMancha(t, m.t, k, 17, "a"), m.seed); });
      BLOT4.forEach((m, k) => { if (m.hoja === b && t > m.t) mancha(c, -6, -8, 13 * radioMancha(t, m.t, k, 4, "b"), m.seed); });
    });
  }
  c.restore();
}
/** Las gotas rojas que saltan de una hoja a la siguiente. */
function gotas(t: number): { p: P3; r: number }[] {
  const out: { p: P3; r: number }[] = [];
  const vuela = (de: number, a: number, k: number) => {
    const A = HOJAA(de), B = HOJAA(a);
    out.push({ p: arco([A[0], A[1], .05], [B[0], B[1], .05], k, 1.0), r: .07 });
  };
  BLOT.forEach((m, k) => { if (k === 0) return; const d = .14; if (t > m.t - d && t < m.t) vuela(BLOT[k - 1].hoja, m.hoja, prog(t, m.t - d, m.t)); });
  BLOT4.forEach((m, k) => { if (k === 0) return; const d = .16; if (t > m.t - d && t < m.t) vuela(BLOT4[k - 1].hoja, m.hoja, prog(t, m.t - d, m.t)); });
  // la quinta: la coordinadora la ataja a medio camino
  if (t > ev.ataja - .2 && t < ev.ataja + .2) {
    const A = HOJAA(8), B = HOJAA(9), k = Math.min(prog(t, ev.ataja - .2, ev.ataja + .12), .45);
    if (t < ev.ataja + .05) out.push({ p: arco([A[0], A[1], .05], [B[0], B[1], .05], k, 1.0), r: .07 });
  }
  return out;
}
function puntoAtaja(): P3 { const A = HOJAA(8), B = HOJAA(9); return arco([A[0], A[1], .05], [B[0], B[1], .05], .45, 1.0); }
function estrella(c: C, t: number) {
  const a = ventana(t, ev.centro + .02, ev.escribe - .5, .35, .3); if (a <= 0) return;
  const P = posBola(0, t);
  c.save(); c.globalAlpha = a; c.setLineDash([10, 12]); c.lineDashOffset = -t * 40;
  for (let b = 1; b <= 10; b++) {
    const k = ease.outCubic(prog(t, ev.centro + .02 + b * .03, ev.centro + .3 + b * .03));
    const Q = ANILLO(b);
    const hl = b === 8 || b === 9 ? ventana(t, ev.ataja - .15, ev.ataja + .3, .1, .3) : 0;
    lin(c, [P[0], P[1], .01], [lerp(P[0], Q[0], k * .8), lerp(P[1], Q[1], k * .8), .01], 3.5 + 3 * hl, hl > .1 ? ACENTO : "rgba(17,17,17,.55)");
  }
  c.restore();
}
function anilloAtaja(c: C, t: number) {
  const d = t - ev.ataja; if (d < 0 || d > .5) return;
  const q = Pv(puntoAtaja()); if (!q) return;
  c.save(); c.globalAlpha = 1 - d / .5; c.strokeStyle = ACENTO; c.lineWidth = 5; c.beginPath(); c.arc(q.x, q.y, (20 + d * 160) * q.s / 120, 0, 7); c.stroke(); c.restore();
}

// ---------- de cerca: la hoja que pasa de mano en mano ----------
function cercaHoja(t: number): { p: P3; quien: number } {
  const A = posBola(10, ev.escribe), B = posBola(1, ev.escribe), Cc = posBola(2, ev.escribe);
  const pA: P3 = [A[0] + .3, A[1] - .65, 1.05], pB: P3 = [B[0] - .25, B[1] - .65, 1.05], pC: P3 = [Cc[0] - .25, Cc[1] - .65, 1.05];
  if (t < ev.pasa) return { p: pA, quien: 10 };
  if (t < ev.pasa + .35) return { p: arco(pA, pB, smooth(prog(t, ev.pasa, ev.pasa + .35)), .35), quien: 1 };
  if (t < ev.copia + .1) return { p: pB, quien: 1 };
  if (t < ev.copia + .45) return { p: arco(pB, pC, smooth(prog(t, ev.copia + .1, ev.copia + .45)), .35), quien: 2 };
  return { p: pC, quien: 2 };
}
function hojaCerca(c: C, t: number) {
  const ap = ventana(t, ev.escribe - .45, ev.letreros[0] - .9, .3, .3); if (ap <= 0) return;
  const { p } = cercaHoja(t);
  cartel(c, p, () => {
    c.globalAlpha = ap;
    c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.rect(-34, -44, 68, 88); c.fill(); c.stroke();
    // lo que escribe A: renglones que avanzan
    const esc2 = prog(t, ev.escribe, ev.equivoca);
    c.strokeStyle = TINTA; c.lineWidth = 2.6;
    for (let l = 0; l < 4; l++) { const k = clamp(esc2 * 4 - l); if (k > 0) { c.beginPath(); c.moveTo(-24, -28 + l * 12); c.lineTo(-24 + 46 * k * (l === 3 ? .5 : 1), -28 + l * 12); c.stroke(); } }
    // la mancha: nace con el tropiezo, la siguiente la copia más grande
    const r1 = 9 * ease.outBack(prog(t, ev.equivoca, ev.equivoca + .2), 2.5);
    const r2 = 7 * ease.outCubic(prog(t, ev.copia + .1, ev.copia + .5));
    const r3 = 24 * ease.outCubic(prog(t, ev.crece, ev.crece + .7));
    mancha(c, 4, 16, r1 + r2 + r3, 5);
    if (t > ev.crece + .2) for (let k = 0; k < 3; k++) { const d = clamp((t - ev.crece - .2 - k * .15) * 1.2); c.fillStyle = ACENTO; c.beginPath(); c.ellipse(-14 + k * 14, 40 + d * 22, 3.5, 6 + d * 8, 0, 0, 7); c.fill(); }
    // el sello de «verdad»
    c.save(); c.translate(20, -12); sello(c, ease.outCubic(prog(t, ev.verdad, ev.verdad + .1))); c.restore();
  }, 0, 1.25);
}
function pluma(c: C, t: number, h: Pt) {
  const a = ventana(t, ev.escribe - .3, ev.pasa - .1, .2, .25); if (a <= 0) return;
  const g = h.s / 100;
  c.save(); c.globalAlpha = a; c.translate(h.x, h.y); c.rotate(-.5); c.fillStyle = TINTA; c.beginPath(); c.roundRect(-5 * g, -48 * g, 10 * g, 50 * g, 3 * g); c.fill();
  c.fillStyle = ACENTO; c.beginPath(); c.moveTo(-5 * g, 2 * g); c.lineTo(5 * g, 2 * g); c.lineTo(0, 16 * g); c.closePath(); c.fill(); c.restore();
}
function selloMano(c: C, t: number, h: Pt) {
  const a = ventana(t, ev.verdad - .45, ev.verdad + .35, .2, .3); if (a <= 0) return;
  const g = h.s / 100;
  c.save(); c.globalAlpha = a; c.translate(h.x, h.y - 6 * g);
  c.fillStyle = "#6b5a3e"; c.beginPath(); c.roundRect(-7 * g, -40 * g, 14 * g, 30 * g, 4 * g); c.fill();
  c.fillStyle = TINTA; c.beginPath(); c.roundRect(-16 * g, -12 * g, 32 * g, 12 * g, 3 * g); c.fill();
  c.fillStyle = ACENTO; c.fillRect(-16 * g, 0, 32 * g, 4 * g); c.restore();
}

// ---------- los letreros ----------
function letrero(c: C, t: number, i: number) {
  const L = LET[i];
  const sube = ease.outBack(prog(t, ev.letreros[i], ev.letreros[i] + .45), 1.4) * (1 - ease.inCubic(prog(t, ev.nogana + .05 + i * .1, ev.nogana + .6 + i * .1)));
  if (sube <= 0) return;
  const n: P2 = [Math.sin(L.ang), -Math.cos(L.ang)], r: P2 = [-n[1], n[0]];
  const emb = (t > ev.choca ? Math.exp(-(t - ev.choca) * 5) * Math.sin((t - ev.choca) * 18) * .14 : 0) * (i ? -1 : 1);
  const x = L.x + emb, y = L.y, zb = -3.6 * (1 - sube);
  const z0 = BZ + zb, z1 = BZ + BH + zb;
  const g = (Pv([x, y, 1])?.s ?? 100) / 100;
  lin(c, [x, y + .05, Math.min(0, zb) + 0], [x, y + .05, z0 + .1], 13 * g, "#3a3226");
  const o: P3 = [x - r[0] * BW / 2, y - r[1] * BW / 2, z1];
  const vx = K.pos[0] - x, vy2 = K.pos[1] - y, vz = K.pos[2] - (z0 + z1) / 2, dv = Math.hypot(vx, vy2, vz) || 1;
  const frente = (vx * n[0] + vy2 * n[1]) / dv;               // 1: de frente; 0: de canto
  const atras = frente < 0;
  poli(c, [o, [x + r[0] * BW / 2, y + r[1] * BW / 2, z1], [x + r[0] * BW / 2, y + r[1] * BW / 2, z0], [x - r[0] * BW / 2, y - r[1] * BW / 2, z0]], atras ? CARTON_L : BLANCO, TINTA, 4);
  const vis = smooth(prog(frente, .2, .4));
  if (vis <= .01) return;
  planoTiras(c, [o[0], o[1], z1 + 1.05], [r[0], r[1], 0], [0, 0, -1], BW * 100, BH * 100 + 310, 14, () => {
    c.globalAlpha *= vis; c.translate(0, 105);
    const W = BW * 100, aN = smooth(prog(t, i ? ev.anthropic : ev.cognition, (i ? ev.anthropic : ev.cognition) + .3));
    textoL(c, L.nombre, W / 2, 40, 40, W - 40, TINTA, false, aN);
    c.strokeStyle = `rgba(17,17,17,${.3 * aN})`; c.lineWidth = 2; c.beginPath(); c.moveTo(60, 56); c.lineTo(W - 60, 56); c.stroke();
    const tc = i ? ev.asi : ev.nocons, lineas = i ? ["así construimos", "uno"] : ["no construyas", "multiagentes"];
    const esc2 = prog(t, tc, tc + 1.2);
    lineas.forEach((ln, k) => {
      const v = clamp(esc2 * 2 - k); if (v <= 0) return;
      const px = ajusta(c, ln, k === 1 && i ? 58 : 50, W - 34, true);
      c.save(); c.font = serif(px, true); const w = c.measureText(ln).width;
      c.beginPath(); c.rect(W / 2 - w / 2 - 4, 60 + k * 50, (w + 8) * v, 60); c.clip();
      texto(c, ln, W / 2, 104 + k * 50, { fuente: serif(px, true), color: TINTA }); c.restore();
    });
    // un año después: dos parches grapados en el de Cognition
    if (i === 0) [ev.revisores, ev.delegacion].forEach((tp, k) => {
      const a = ease.outBack(prog(t, tp - .06, tp + .2), 2.2); if (a <= 0) return;
      c.save(); c.translate(W / 2 + (k ? 18 : -12), 186 + k * 58); c.rotate(k ? .035 : -.03); c.scale(a, a);
      c.fillStyle = "#F1EBDC"; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.rect(-108, -26, 216, 52); c.fill(); c.stroke();
      textoL(c, k ? "+ delegación" : "+ revisores", 0, 13, 40, 196, ACENTO, true);
      c.fillStyle = TINTA; c.fillRect(-90, -30, 26, 5); c.fillRect(64, -30, 26, 5);
      c.restore();
    });
    // los dos tenían razón
    c.save(); c.translate(W - 28, 30); sello(c, ease.outCubic(prog(t, ev.razon[i], ev.razon[i] + .12)) * 1.6); c.restore();
    // en problemas distintos
    const ap = ease.outBack(prog(t, ev.distintos + i * .2, ev.distintos + .35 + i * .2), 1.8);
    if (ap > 0) {
      c.save(); c.translate(W / 2, -54); c.scale(ap, ap);
      c.fillStyle = TINTA; c.fillRect(-90, 30, 5, 28); c.fillRect(85, 30, 5, 28);
      c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.rect(-124, -40, 248, 80); c.fill(); c.stroke();
      textoL(c, i === 0 ? "programar" : "investigar", 30, 17, 54, 164, ACENTO, true);
      // pictograma: cadena o abanico
      c.strokeStyle = ACENTO; c.fillStyle = ACENTO; c.lineWidth = 3;
      if (i === 0) { for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(-98 + k * 18, 0, 5, 0, 7); c.fill(); } c.beginPath(); c.moveTo(-98, 0); c.lineTo(-62, 0); c.stroke(); }
      else { c.beginPath(); c.arc(-98, 0, 5, 0, 7); c.fill(); for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(-98, 0); c.lineTo(-66, k * 16); c.stroke(); c.beginPath(); c.arc(-64, k * 16, 5, 0, 7); c.fill(); } }
      c.restore();
    }
  });
}

// ---------- la hoja final y el cuchillo ----------
const CORTE = [-.5, .5];
function cortado(t: number, k: number) { return prog(t, [ev.corte1, ev.corte2][k], [ev.corte1, ev.corte2][k] + .3); }
function piezaPos(t: number, i: number): P3 {
  const sep = ease.outCubic(prog(t, ev.separa, ev.separa + .5)) * .32;
  let x = HF[0] + (i - 1) * (1.0 + sep), y = HF[1];
  if (i !== 1) {
    const b = i === 0 ? 2 : 3, tb = ev.toman + .55 + (i === 2 ? .1 : 0);
    if (t > tb) { const P = posBola(b, t); const k = smooth(prog(t, tb, tb + .25)); x = lerp(x, P[0] + (i === 0 ? .15 : -.15), k); y = lerp(y, P[1] - .9, k); }
  }
  return [x, y, .004];
}
function hojaFinalBien(c: C, t: number) {
  const cae = prog(t, ev.nogana + .7, ev.nogana + 1.15); if (cae <= 0) return;
  const zc = 1.6 * (1 - ease.inCubic(cae)), ang = (1 - cae) * .5;
  for (let i = 0; i < 3; i++) {
    const P: P3 = cae < 1 ? [HF[0] + (i - 1) * 1.0, HF[1], zc] : piezaPos(t, i);
    enPiso(c, P[0], P[1], P[2], cae < 1 ? ang : 0, () => {
      c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 3;
      c.beginPath(); c.rect(-50, -HFD * 50, 100, HFD * 100); c.fill(); c.stroke();
      if (i === 1) {
        c.save(); c.translate(0, -22); icono(c, 1, .8); c.restore();
        const st = ["1", "2", "3"];
        st.forEach((n, k) => {
          const x = -30 + k * 30;
          c.strokeStyle = TINTA; c.lineWidth = 2.6; c.beginPath(); c.arc(x, 24, 10, 0, 7); c.stroke();
          texto(c, n, x, 30, { fuente: mono(16), color: TINTA });
          if (k < 2) { c.strokeStyle = TINTA; c.lineWidth = 2.6; c.beginPath(); c.moveTo(x + 12, 24); c.lineTo(x + 18, 24); c.stroke(); }
        });
      } else {
        c.save(); c.translate(0, -12); icono(c, i === 0 ? 0 : 2, 1.05); c.restore();
        textoL(c, i === 0 ? "lugar" : "música", 0, 36, 24, 84, TINTA, true);
      }
    });
  }
  // perforaciones: rojas y punteadas; ya cortadas, una línea limpia
  if (cae >= 1) for (let k = 0; k < 2; k++) {
    const cx = CORTE[k], cut = cortado(t, k);
    const sep = ease.outCubic(prog(t, ev.separa, ev.separa + .5)) * .16;
    if (cut < 1 && t < ev.separa) {
      const y0 = HF[1] + HFD / 2, y1 = HF[1] - HFD / 2;
      plano(c, [cx, y0, .006], [1, 0, 0], [0, -1, 0], () => perforacion(c, 0, 0, HFD * 100, 1));
      if (cut > 0) lin(c, [cx, y0, .007], [cx, lerp(y0, y1, cut), .007], 4, TINTA);
    }
    void sep;
  }
  // el intento fallido: dentro del pastel la hoja no cede
  const fx = ventana(t, ev.prueba + .05, ev.prueba + .7, .08, .3);
  if (fx > 0) cartel(c, [HF[0] + .15, HF[1] + .1, .3], () => {
    c.globalAlpha = fx; c.strokeStyle = ACENTO; c.lineWidth = 8; c.lineCap = "round";
    c.beginPath(); c.moveTo(-16, -16); c.lineTo(16, 16); c.moveTo(16, -16); c.lineTo(-16, 16); c.stroke();
  });
}
function puntaCuchillo(t: number): P3 {
  const S: Clave[] = [
    [ev.gana + .1, ev.gana + .6, [.4, HF[1] - .35, .9]],
    [ev.mira, ev.mira + .3, [.05, HF[1], .7]],
    [ev.prueba - .22, ev.prueba, [.05, HF[1] + .08, .05], ease.inCubic], [ev.prueba + .05, ev.prueba + .35, [-.2, HF[1] + .2, .55], ease.outCubic],
    [ev.apunta - .3, ev.apunta + .4, [CORTE[0], HF[1] + HFD / 2 + .02, .12]],
    [ev.corte1 - .06, ev.corte1 + .3, [CORTE[0], HF[1] - HFD / 2 - .02, .03], (x) => x],
    [ev.corte1 + .32, ev.corte2 - .06, [CORTE[1], HF[1] + HFD / 2 + .02, .12]],
    [ev.corte2 - .06, ev.corte2 + .3, [CORTE[1], HF[1] - HFD / 2 - .02, .03], (x) => x],
    [ev.separa, ev.separa + .55, [.8, HF[1] - 1.0, 1.0], ease.outBack],
  ];
  const p = ruta(t, [.6, HF[1] - .7, 1.1], S);
  return [p[0] + .02 * vaiven(t, .9), p[1], p[2] + .02 * vaiven(t, 1.1, 1)];
}
function manoCuchillo(t: number): P3 {
  const p = puntaCuchillo(t), k = ease.inOutCubic(prog(t, ev.separa, ev.separa + .55));
  return L3([p[0] + .26, p[1] - .46, p[2] + .78], [p[0] - .1, p[1] - .65, p[2] - .45], k);
}
function dobla(t: number) { const d = t - ev.prueba; return d > -.02 && d < .5 ? .5 * Math.exp(-Math.max(d, 0) * 7) * Math.cos(Math.max(d, 0) * 30) * smooth(prog(d, -.02, .02)) : 0; }

// ---------- cámara ----------
const V: Record<string, Vista> = {
  ini: { tx: .25, ty: .25, tz: .55, yaw: .05, pitch: .42, dist: 6.4 },
  uno: { tx: -.05, ty: -.1, tz: .65, yaw: .09, pitch: .4, dist: 5.9 },
  cartas: { tx: 0, ty: 5.8, tz: 0, yaw: 0, pitch: 1.3, dist: 9.7 },
  hoja: { tx: 0, ty: -.55, tz: .3, yaw: 0, pitch: .72, dist: 5.6 },
  carriles: { tx: 0, ty: 4.0, tz: .4, yaw: 0, pitch: .8, dist: 8.4 },
  caja: { tx: 0, ty: -.5, tz: .3, yaw: 0, pitch: .64, dist: 5.8 },
  fila: { tx: .1, ty: 3.4, tz: .5, yaw: -.36, pitch: .5, dist: 7.6 },
  calendario: { tx: 0, ty: 10.9, tz: 1.5, yaw: 0, pitch: .24, dist: 4.9 },
  corro: { tx: 0, ty: 5.7, tz: 0, yaw: 0, pitch: 1.05, dist: 7.4 },
  cerca: { tx: 0, ty: 2.75, tz: 1.05, yaw: 0, pitch: .46, dist: 4.2 },
  w8: { tx: 0, ty: 10.3, tz: 2.05, yaw: 0, pitch: .2, dist: 7.0 },
  cog: { tx: LET[0].x, ty: LET[0].y, tz: BZ + BH * .5, yaw: .62, pitch: .1, dist: 4.4 },
  ant: { tx: LET[1].x, ty: LET[1].y, tz: BZ + BH * .5, yaw: -.62, pitch: .1, dist: 4.4 },
  nogana: { tx: 0, ty: 11.3, tz: .3, yaw: 0, pitch: .78, dist: 7.6 },
  fin: { tx: 0, ty: 10.15, tz: .2, yaw: 0, pitch: 1.15, dist: 4.2 },
  cola: { tx: 0, ty: 10.2, tz: .2, yaw: 0, pitch: 1.1, dist: 5.6 },
};
const CL = [
  { t: 0, v: V.ini }, { t: ev.uno - .75, dur: 1.5, v: V.uno }, { t: ev.dispersa - .25, dur: 1.4, v: V.cartas },
  { t: ev.rafaga + .15, dur: 1.1, v: V.hoja }, { t: ev.carriles - .15, dur: 1.3, v: V.carriles }, { t: ev.junta[0] - .55, dur: .9, v: V.caja },
  { t: ev.funde, dur: 1.6, v: V.fila }, { t: ev.calendario - .45, dur: 1.1, v: V.calendario }, { t: ev.corro, dur: 1.3, v: V.corro },
  { t: ev.escribe - .45, dur: 1.0, v: V.cerca }, { t: ev.letreros[0] - .75, dur: 1.3, v: V.w8 }, { t: ev.cognition - .4, dur: .9, v: V.cog },
  { t: ev.anthropic - .4, dur: .9, v: V.ant }, { t: ev.anio - .25, dur: .9, v: V.w8 }, { t: ev.revisores - 1.05, dur: .9, v: V.cog },
  { t: ev.razon[0] - 1.1, dur: 1.0, v: V.w8 }, { t: ev.nogana, dur: 1.4, v: V.nogana }, { t: ev.gana - .2, dur: 1.2, v: V.fin }, { t: ev.separa, dur: 3.0, v: V.cola, curva: smooth },
];
const GOLPES: [number, number][] = [...ev.caen.map((x) => [x, .22] as [number, number]), [ev.ochenta, .35], [ev.choque, .3], [ev.choques[4], .2], [ev.suelta, .3],
  [ev.centro, .45], [ev.verdad, .3], [ev.letreros[0], .35], [ev.letreros[1], .3], [ev.choca, .2], [ev.corte1, .2], [ev.corte2, .25], [ev.menos, .25]];
function sacude(t: number) {
  let x = 0, y = 0;
  for (const [ti, a] of GOLPES) { const d = t - ti; if (d < 0 || d > 1) continue; const e0 = a * Math.exp(-d * 8.5); x += e0 * 12 * Math.sin(d * 71); y += e0 * 14 * Math.cos(d * 57); }
  return { x, y };
}
function camaraDe(t: number) {
  const v = guionCamara(t, CL);
  const r: Vista = { ...v, yaw: v.yaw + .02 * vaiven(t, 7.3), pitch: v.pitch + .016 * vaiven(t, 9.1, 1), dist: v.dist * (1 + .024 * vaiven(t, 6.1, 2) - .012 * prog(t, 0, 3)), tx: v.tx + .08 * vaiven(t, 8.3), ty: v.ty + .07 * vaiven(t, 5.3, 1), tz: v.tz + .04 * vaiven(t, 6.7, 2) };
  return camara(r, 540, 1080, 1250);
}

// ---------- quién tiene cada cosa ----------
const PORTA = [0, 10, 9, 8, 7, 6];
function quienHojaPasos(t: number): { b: number; k: number } {
  let b = 0, k = 1;
  for (let i = 0; i < ev.pases.length; i++) if (t > ev.pases[i]) { b = PORTA[i + 1]; k = smooth(prog(t, ev.pases[i], ev.pases[i] + .24)); }
  return { b, k };
}
function piso(c: C) {
  c.strokeStyle = "rgba(17,17,17,.045)"; c.lineWidth = 2; c.beginPath();
  for (let i = -12; i <= 12; i++) {
    const a = K.p(i * 1.5, -8, 0), b = K.p(i * 1.5, 26, 0), q = K.p(-18, i * 1.5 + 8, 0), r = K.p(18, i * 1.5 + 8, 0);
    if (a && b) { c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); }
    if (q && r) { c.moveTo(q.x, q.y); c.lineTo(r.x, r.y); }
  }
  c.stroke();
}
function polvo(c: C, t: number) {
  const r = azar(16);
  c.fillStyle = TINTA;
  for (let i = 0; i < 60; i++) {
    const x0 = r() * 1200 - 60, y0 = r() * 2060, v = 14 + r() * 36, f = r() * 6.3, z = 1.6 + r() * 3;
    const y = ((y0 - t * v) % 2060 + 2060) % 2060 - 70, x = x0 + Math.sin(t * .5 + f) * 30;
    c.globalAlpha = .06 + r() * .12; c.fillRect(x, y, z, z);
  }
  c.globalAlpha = 1;
}

// ---------- rótulos ----------
function rotulos(c: C, t: number) {
  const Y = 300;
  rotulo(c, t, .9, 2.98, "¿diez agentes", 250, 120, TINTA, true);
  rotulo(c, t, t0.mejor - .05, 2.98, "mejor que uno?", 390, 120, TINTA, true);
  rotulo(c, t, ev.depende, ev.sorprende + .5, "depende", Y + 20, 190, ACENTO, true);
  rotulo(c, t, ev.google, ev.ciento - .3, "Google", Y, 130, TINTA, false);
  rotulo(c, t, ev.ciento, ev.rafaga + .1, "180", Y + 20, 250, ACENTO, true);
  rotulo(c, t, t0.config, ev.rafaga + .1, "configuraciones", Y + 140, 96, TINTA, true);
  rotulo(c, t, t0.dividir - .05, ev.equipo + .1, "se podía dividir", Y, 128, TINTA, true);
  rotulo(c, t, ev.equipo + .4, ev.ochenta - .3, "con coordinador", Y, 128, TINTA, true);
  rotulo(c, t, ev.ochenta, ev.carriles + .2, "+81%", Y + 40, 250, ACENTO, true);
  rotulo(c, t, ev.vuelven, ev.funde - .1, "no se estorban", Y, 132, TINTA, true);
  rotulo(c, t, t0.paso - .05, ev.todas + .3, "paso por paso", Y, 138, TINTA, true);
  rotulo(c, t, t0.empeoraron - .05, ev.menos - .3, "empeoraron", Y, 140, TINTA, true);
  rotulo(c, t, ev.menos, ev.calendario - .1, "−39% a −70%", Y + 20, 150, ACENTO, false);
  rotulo(c, t, t0.nueve - .05, t0.unmes - .3, "nueve mamás", Y, 140, TINTA, true);
  rotulo(c, t, t0.unmes, ev.corro - .1, "un bebé en un mes", Y, 116, ACENTO, true);
  rotulo(c, t, ev.corro + .25, ev.rebobina - .3, "sin coordinador", 240, 104, TINTA, true);
  rotulo(c, t, ev.rebobina, ev.escribe - .35, "con coordinador", 240, 104, TINTA, true);
  // el contador: cuántas manchas hay
  const n17 = ev.manchas.filter((x) => t >= x).length, n4 = ev.manchas4.filter((x) => t >= x).length;
  const a17 = ventana(t, ev.manchas[0], ev.escribe - .35, .1, .3);
  if (a17 > 0 && n17 > 0) {
    const mueve = smooth(prog(t, ev.rebobina, ev.rebobina + .4));
    const lat = ev.manchas[n17 - 1], pulso = Math.exp(-(t - lat) * 12) * .18 * (1 - mueve);
    c.save(); c.translate(lerp(540, 290, mueve), lerp(460, 430, mueve)); const k = lerp(1, .62, mueve) * (1 + pulso); c.scale(k, k);
    texto(c, `×${n17}`, 0, 0, { fuente: serif(230, true), color: mueve > .5 ? GRIS : ACENTO, alfa: a17 }); c.restore();
  }
  const a4 = ventana(t, ev.manchas4[0], ev.escribe - .35, .1, .3);
  if (a4 > 0 && n4 > 0) {
    const lat = ev.manchas4[n4 - 1], pulso = Math.exp(-(t - lat) * 12) * .18;
    c.save(); c.translate(760, 460); c.scale(1 + pulso, 1 + pulso); texto(c, `×${n4}`, 0, 0, { fuente: serif(230, true), color: ACENTO, alfa: a4 }); c.restore();
  }
  rotulo(c, t, ev.equivoca - .05, ev.pasa - .05, "se equivoca", Y, 140, TINTA, true);
  rotulo(c, t, t0.verdad, ev.copia - .3, "como verdad", Y, 140, TINTA, true);
  rotulo(c, t, ev.copia, ev.letreros[0] - .45, "el error crece", Y, 136, ACENTO, true);
  rotulo(c, t, t0.contra - .05, ev.cognition - .45, "se contradijeron", Y, 124, TINTA, true);
  rotulo(c, t, ev.anio, ev.revisores - 1.1, "un año después", Y, 124, TINTA, true);
  rotulo(c, t, ev.nogana, ev.mas - .3, "no gana", Y, 140, TINTA, true);
  rotulo(c, t, ev.mas, ev.gana - .3, "más agentes", Y, 140, TINTA, true);
  const tk = smooth(prog(t, ev.tacha, ev.tacha + .2)) * (1 - smooth(prog(t, ev.gana - .3, ev.gana - .08)));
  if (tk > 0) { c.save(); c.font = serif(140, true); const w = c.measureText("más agentes").width; c.strokeStyle = ACENTO; c.lineWidth = 11; c.lineCap = "round"; c.beginPath(); c.moveTo(540 - w / 2 - 14, Y - 44); c.lineTo(540 - w / 2 - 14 + (w + 28) * tk, Y - 54); c.stroke(); c.restore(); }
  rotulo(c, t, ev.gana + .15, ev.apunta, "gana quien sabe", Y, 124, TINTA, true);
  rotulo(c, t, ev.corte1, DURACION + 1, "se puede partir", Y + 10, 150, ACENTO, true);
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
  cartas(c, t);
  carriles(c, t);
  lineasCoord(c, t);
  // la hoja de la fiesta y sus tres tramos
  hojaFiesta(c, t);
  hojasCorro(c, t);
  estrella(c, t);
  hojaFinalBien(c, t);

  const P = Array.from({ length: 11 }, (_, b) => posBola(b, t));
  const M = P.map((p, b) => manos(b, t, p));
  const L: { d: number; f: () => void }[] = [];
  const add = (p: P3, f: () => void) => { const q = Pv(p); L.push({ d: q ? q.zc : 999, f }); };
  P.forEach((p, b) => add([p[0], p[1], R], () => dibujaBola(c, p, M[b][0], M[b][1], aplasta(b, t))));
  // lo que va de pie: destinos de los carriles, caja, calendario, letreros, gotas
  destinos(c, t, add);
  if (t > ev.salen && t < ev.funde + 1.5) { const [cx, cy] = cajaPos(t); add([cx, cy + .4, .3], () => caja(c, t, "atras")); add([cx, cy - .4, .3], () => caja(c, t, "frente")); }
  if ((t > ev.calendario - .1 && t < ev.corro + .7) || (t > ev.letreros[1] + .2 && t < ev.nogana + 1)) add([CAL[0], CAL[1], 1.5], () => calendario(c, t));
  if (t > ev.letreros[0] - .1 && t < ev.nogana + 1) LET.forEach((l, i) => add([l.x, l.y, 2.4], () => letrero(c, t, i)));
  for (const g of gotas(t)) add(g.p, () => { const q = Pv(g.p); if (q) { c.fillStyle = ACENTO; c.beginPath(); c.arc(q.x, q.y, g.r * q.s, 0, 7); c.fill(); } });
  L.sort((a, b) => b.d - a.d).forEach((o) => o.f());

  // encima: lo que va en las manos
  enManos(c, t, P, M);
  anilloAtaja(c, t);
  hojaCerca(c, t);
  const hA = Pv(M[10][1].p); if (hA) pluma(c, t, hA);
  const hB = Pv(M[1][1].p); if (hB) selloMano(c, t, hB);
  if (t > ev.gana - .25) {
    const tip = Pv(puntaCuchillo(t)), mano = Pv(manoCuchillo(t));
    if (tip && mano) { const a = smooth(prog(t, ev.gana - .25, ev.gana + .1)); c.save(); c.globalAlpha = a; cuchillo(c, mano.x, mano.y, tip.x, tip.y, dobla(t), mano.s / 100); c.restore(); }
  }
  etiquetas(c, t);
  c.restore();
  rotulos(c, t);
}

/** La coordinadora unida a sus tres obreras: líneas punteadas sobre el piso. */
function lineasCoord(c: C, t: number) {
  const a = ventana(t, ev.coord - .05, ev.funde - .2, .3, .3); if (a <= 0) return;
  const P0 = posBola(0, t);
  c.save(); c.globalAlpha = a; c.setLineDash([10, 12]); c.lineDashOffset = -t * 40;
  OBRERO.forEach((b, w) => {
    const k = ease.outCubic(prog(t, ev.coord + w * .08, ev.coord + .4 + w * .08)), Q = posBola(b, t);
    const fuera = t > ev.salen && t < ev.vuelven + .85 ? .35 : 1;
    lin(c, [P0[0], P0[1], .01], [lerp(P0[0], Q[0], k * .82), lerp(P0[1], Q[1], k * .82), .01], 3.5, `rgba(17,17,17,${.55 * fuera})`);
  });
  c.restore();
}
function hojaFiesta(c: C, t: number) {
  if (t < ev.hoja - .45 || t > ev.salen + .4) return;
  const cae = prog(t, ev.hoja - .45, ev.hoja);
  const z = 1.8 * (1 - ease.inCubic(cae)), giro = (1 - cae) * .7;
  for (let i = 0; i < 3; i++) {
    const sep = i === 0 ? ease.outCubic(prog(t, ev.rasga[0], ev.rasga[0] + .3)) : i === 2 ? ease.outCubic(prog(t, ev.rasga[1], ev.rasga[1] + .3)) : 0;
    const va = ease.inOutCubic(prog(t, ev.coord + .05 * i, ev.coord + .55 + .05 * i));
    const x0 = HOJA[0] + (i - 1) * .9 + (i - 1) * sep * .14;
    const tx = XC[i], ty = PUESTO[i][1] - .85;
    const x = lerp(x0, tx, va), y = lerp(HOJA[1], ty, va);
    // al salir, el tramo se lo lleva su bola en la mano
    if (t > ev.salen - .1) continue;
    enPiso(c, x, y, z + .004, giro + (i - 1) * sep * .05, () => tramo(c, i, 90, 95));
  }
  if (cae >= 1 && t < ev.rasga[1] + .02) {
    for (let k = 0; k < 2; k++) {
      if (t > ev.rasga[k]) continue;
      const x = HOJA[0] + (k ? .45 : -.45);
      plano(c, [x, HOJA[1] + .475, .006], [1, 0, 0], [0, -1, 0], () => perforacion(c, 0, 0, 95, 1));
    }
  }
}
/** Lo que está de pie al fondo de cada carril, y lo que las bolas cargan. */
function destinos(c: C, t: number, add: (p: P3, f: () => void) => void) {
  if (t < ev.carriles || t > ev.funde + 1) return;
  for (let k = 0; k < 3; k++) {
    const toma = [ev.lugar, ev.pastel, ev.musica][k];
    const a = ease.outBack(prog(t, ev.carriles + .55 + k * .12, ev.carriles + .9 + k * .12), 1.8) * (1 - ease.inCubic(prog(t, ev.funde, ev.funde + .5)));
    if (a <= 0) continue;
    const p: P3 = [XC[k], Y_DEST, 0];
    add(p, () => {
      const q = Pv(p); if (!q) return;
      sombra(c, q.x, q.y, 40 * q.s / 100, .2);
      if (t < toma) cartel(c, [XC[k], Y_DEST, .62], () => { c.fillStyle = CARTON; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.ellipse(0, 60, 44, 11, 0, 0, 7); c.fill(); c.stroke(); icono(c, k, 2.3); }, 0, a);
      else cartel(c, [XC[k], Y_DEST, .1], () => { c.fillStyle = CARTON; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.ellipse(0, 10, 34, 9, 0, 0, 7); c.fill(); c.stroke(); }, 0, a);
    });
  }
}
function enManos(c: C, t: number, P: P3[], M: [Mano, Mano][]) {
  // tramos y objetos de los tres obreros
  OBRERO.forEach((b, w) => {
    if (t < ev.salen - .1 || t > ev.junta[w] + .1) return;
    const h = Pv(M[b][0].p); if (!h) return;
    const toma = [ev.lugar, ev.pastel, ev.musica][w];
    const tj = ev.junta[w];
    if (t < toma) cartel(c, M[b][0].p, () => { c.translate(0, -30); c.rotate(-.1); c.scale(.62, .62); tramo(c, w, 90, 95); });
    else if (t < tj - .25) cartel(c, M[b][0].p, () => { c.translate(0, -26); const k = ease.outBack(prog(t, toma, toma + .2), 2.2); c.scale(k, k); icono(c, w, 1.35); });
    else {
      const [cx, cy] = cajaPos(t);
      const k = smooth(prog(t, tj - .25, tj));
      const p = arco(M[b][0].p, [cx + (w - 1) * .38, cy + .02, .55], k, .6);
      cartel(c, p, () => { c.translate(0, -26 * (1 - k)); icono(c, w, lerp(1.35, .95, k)); });
    }
  });
  // la hoja de pasos
  if (t > ev.pasos[0] - .45 && t < ev.calendario + .6) {
    const q = quienHojaPasos(t);
    const prev = q.b === 0 ? 0 : PORTA[PORTA.indexOf(q.b) - 1];
    const pos = (b: number): P3 => b === 0 ? M[0][1].p : M[b][0].p;
    let p = q.b === 0 ? pos(0) : arco(pos(prev), pos(q.b), q.k, .5);
    const ar = smooth(prog(t, ev.choque, ev.choque + .5));
    const ap = smooth(prog(t, ev.pasos[0] - .45, ev.pasos[0] - .2));
    if (t > ev.calendario - .2) { const d = t - (ev.calendario - .2); p = [p[0], p[1], Math.max(.02, p[2] - 4.5 * d * d)]; }
    cartel(c, [p[0], p[1], p[2] + .32], () => { c.globalAlpha = ap * (1 - smooth(prog(t, ev.calendario + .2, ev.calendario + .6))); c.scale(1.05, 1.05); hojaPasos(c, t, ar); });
  }
}
function etiquetas(c: C, t: number) {
  if (t < ev.lugar - .25 || t > ev.funde + .2) return;
  ["lugar", "pastel", "música"].forEach((txt, k) => {
    const tk = [ev.lugar, ev.pastel, ev.musica][k];
    const a = smooth(prog(t, tk - .12, tk + .1)) * (1 - smooth(prog(t, ev.vuelven - .25, ev.vuelven - .05)));
    if (a <= .01) return;
    const q = Pv([XC[k], Y_DEST + .2, k === 1 ? 2.55 : 1.45]); if (!q) return;
    c.save(); c.globalAlpha = a; c.translate(q.x, q.y);
    c.font = serif(84, true); const w = c.measureText(txt).width + 40;
    c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.roundRect(-w / 2, -72, w, 104, 10); c.fill(); c.stroke();
    texto(c, txt, 0, 6, { fuente: serif(84, true), color: TINTA });
    c.restore();
  });
}

void MOV; void ROJO;
export const Pieza: React.FC = () => <Lienzo dibuja={(c, t) => dibuja(c, t)} preparar={() => ({})} />;
