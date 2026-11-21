// Serie 2, capítulo 24: el problema del milenio. Una hoja con agua y tinta que gira de verdad: cinco vórtices de
// núcleo suave (Lamb-Oseen) que se pasean, ruido de rizo de fondo y paredes que no dejan escapar el agua. Miles de
// partículas siguen ese campo y dejan estela; cada gota de tinta es una línea material que el agua estira en espiral.
// Sobre el agua flota una medalla de un millón de dólares que la bola no alcanza. OpenAI anuncia: la bola se
// multiplica en ~10,000 agentes, un reloj corre 88 horas y manos humanas dirigen desde arriba. "¿Es verdad?": se
// congelan. Con el golpe de la música entra el sello EN REVISIÓN y desde ahí baja sin terminar de caer: dos hojas que
// no empatan, una mano que empuja el agua (fuerza externa) y se va, una lupa que no encuentra error. Lo demostrado,
// más abajo en la mesa: la medalla de oro cae y rebota; la conjetura de Erdős se rompe y nueve firmas se palomean;
// diez «resueltos» se voltean y son recortes viejos. Cierra con una pila de pruebas que crece hasta casi tocar el
// sello y una sola persona con lupa al pie. El sello no cae; la música termina sola.
import React, { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { loadFont } from "@remotion/google-fonts/InstrumentSerif";
import { azar, caida, clamp, ease, lerp, prog, resorte, smooth, texto } from "../../kit";
import { ACENTO, bola, GRIS, Lienzo, mono, PAPEL, serif, sombra, TINTA } from "../../marca";
import { agente, brazo } from "../../personaje";
import duracion from "./duracion.json";
import ev from "./eventos.json";

export const DURACION = duracion.dur;
type C = CanvasRenderingContext2D;
type V2 = [number, number];
const E = ev;

// "Erdős" lleva ő: está en latin-ext, que la marca no carga.
const extI = loadFont("italic", { subsets: ["latin-ext"] });
const extN = loadFont("normal", { subsets: ["latin-ext"] });

// ---------- utilidades ----------
const TAU = 6.283185;
const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * TAU + f);
const ventana = (t: number, a: number, b: number, fi = .25, fo = .3) => smooth(prog(t, a, a + fi)) * (1 - smooth(prog(t, b, b + fo)));
const hash = (a: number, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
let FR = 0;
const tiembla = (j: number) => hash(j, FR) - .5;
function linea(c: C, ax: number, ay: number, bx: number, by: number) { c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); }
function circulo(c: C, x: number, y: number, r: number) { c.beginPath(); c.arc(x, y, Math.max(r, .01), 0, TAU); c.fill(); }
function tramos(t: number, v0: number, S: [number, number, number, ((x: number) => number)?][]) {
  let v = v0;
  for (const [a, b, x, f] of S) { if (t <= a) break; v = lerp(v, x, (f ?? ease.inOutCubic)(prog(t, a, b))); }
  return v;
}
function trazo(c: C, P: V2[], k: number) {          // dibuja la fracción k de una polilínea
  if (k <= 0 || P.length < 2) return;
  let L = 0; const seg: number[] = [];
  for (let i = 1; i < P.length; i++) { const d = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); seg.push(d); L += d; }
  let r = L * clamp(k);
  c.beginPath(); c.moveTo(P[0][0], P[0][1]);
  for (let i = 1; i < P.length && r > 0; i++) {
    const d = seg[i - 1], q = Math.min(1, r / d);
    c.lineTo(lerp(P[i - 1][0], P[i][0], q), lerp(P[i - 1][1], P[i][1], q)); r -= d;
  }
  c.stroke();
}

// ---------- texto en pantalla ----------
function rot(c: C, t: number, a: number, b: number, s: string, y: number, px: number, color = TINTA, it = false, maxW = 900, x = 540) {
  const al = smooth(prog(t, a - .04, a + .14)) * (1 - smooth(prog(t, b, b + .22)));
  if (al <= 0) return;
  c.save(); c.font = serif(px, it); const w = c.measureText(s).width; c.restore();
  const p = w > maxW ? Math.floor(px * maxW / w) : px;
  texto(c, s, x, y + (1 - ease.outCubic(prog(t, a - .04, a + .3))) * 18, { fuente: serif(p, it), color, alfa: al });
}
/** Una línea con dos tintas: [["sin ella, ", TINTA], ["sigue abierta", ACENTO]]. */
function rot2(c: C, t: number, a: number, b: number, partes: [string, string][], y: number, px: number, it = true, maxW = 900) {
  const al = smooth(prog(t, a - .04, a + .14)) * (1 - smooth(prog(t, b, b + .22)));
  if (al <= 0) return;
  c.save(); c.font = serif(px, it);
  let ws = partes.map(([s]) => c.measureText(s).width), W = ws.reduce((p, q) => p + q, 0);
  let f = px;
  if (W > maxW) { f = Math.floor(px * maxW / W); c.font = serif(f, it); ws = partes.map(([s]) => c.measureText(s).width); W = ws.reduce((p, q) => p + q, 0); }
  c.restore();
  let x = 540 - W / 2; const dy = (1 - ease.outCubic(prog(t, a - .04, a + .3))) * 18;
  partes.forEach(([s, col], i) => { texto(c, s, x, y + dy, { fuente: serif(f, it), color: col, alfa: al, alin: "left" }); x += ws[i]; });
}
/** Niebla de papel detrás del texto cuando lo de atrás está lleno. */
function niebla(c: C, y0: number, y1: number, a: number) {
  if (a <= .01) return;
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, "rgba(244,242,236,0)"); g.addColorStop(.28, `rgba(244,242,236,${.93 * a})`); g.addColorStop(.75, `rgba(244,242,236,${.93 * a})`); g.addColorStop(1, "rgba(244,242,236,0)");
  c.fillStyle = g; c.fillRect(0, y0, 1080, y1 - y0);
}

// =====================================================================================================
// EL AGUA. Campo de velocidades programado: vórtices de Lamb-Oseen + ruido de rizo + paredes + gotas + la mano.
// =====================================================================================================
const DT = 1 / 30;
const YO0: V2 = [140, 1250];                 // dónde vive la bola al principio
const HX = 230, HY = 470, HW = 720, HH = 900, HCX = HX + HW / 2, HCY = HY + HH / 2;
const FX0 = HX + 14, FX1 = HX + HW - 14, FY0 = HY + 14, FY1 = HY + HH - 14;
// cx, cy, amplitud x/y, periodos x/y, fase, intensidad (Γ/2π), radio del núcleo
const VOR = [
  [430, 720, 50, 70, 11, 13, 0, 26000, 95], [760, 690, 55, 55, 14, 9.5, 1.3, -24000, 90], [595, 960, 70, 60, 12.5, 15, 2.1, 30000, 110],
  [420, 1180, 45, 50, 9, 12, 3.7, -22000, 85], [770, 1170, 50, 60, 10.5, 8, 4.4, 25000, 85],
];
const NK = [[.0118, .0064, 1900, .35, 0], [-.0071, .0109, 1600, -.27, 2], [.0047, -.0131, 1300, .22, 4.1]];
const q30 = (t: number) => Math.round(t / DT) * DT;
const GOTAS: [number, number, number][] = [
  [.12, 540, 860], [q30(E.anuncio), 420, 1130], [q30(E.ns), 760, 1150], [q30(E.milenio), 660, 650],
  [q30(E.experto + .15), 800, 930], [q30(E.hasta), 460, 760], [q30(E.sello + 1.2), 400, 1250],
];
const VIDA_GOTA = 12;

/** La mano del experto: punta, cuánto empuja (intensidad del dipolo) y si se ve. */
function manoFuerza(t: number) {
  const a = E.fuerza - .55, b = E.sinella;
  if (t < a - .1 || t > b + 1.2) return { x: 1400, y: 960, k: 0, ve: 0 };
  const x = tramos(t, 1400, [[a - .1, E.empuja - .05, 1010, ease.outCubic], [E.empuja, E.empuja + .75, 690, ease.outCubic], [b, b + .75, 1400, ease.inCubic]])
    + (t > E.empuja + .75 && t < b ? 16 * Math.sin((t - E.empuja) * 5.2) : 0);
  const k = 52000 * smooth(prog(t, E.empuja - .05, E.empuja + .25)) * (1 - .45 * smooth(prog(t, E.empuja + .8, E.empuja + 1.4))) * (1 - smooth(prog(t, b, b + .3)));
  return { x, y: 960 + 10 * Math.sin(t * 1.7), k, ve: 1 };
}

type Par = { n: number; vx: Float64Array; vy: Float64Array; vk: Float64Array; va: Float64Array; ph: Float64Array; gn: number; gx: Float64Array; gy: Float64Array; gs: Float64Array };
const nuevoPar = (): Par => ({ n: 0, vx: new Float64Array(8), vy: new Float64Array(8), vk: new Float64Array(8), va: new Float64Array(8), ph: new Float64Array(3), gn: 0, gx: new Float64Array(8), gy: new Float64Array(8), gs: new Float64Array(8) });
function parametros(t: number, P: Par) {
  let n = 0;
  for (const v of VOR) {
    P.vx[n] = v[0] + v[2] * Math.sin(t / v[4] * TAU + v[6]); P.vy[n] = v[1] + v[3] * Math.sin(t / v[5] * TAU + v[6] * 1.7);
    P.vk[n] = v[7]; P.va[n] = v[8] * v[8]; n++;
  }
  const m = manoFuerza(t);
  if (m.k > 1) {
    P.vx[n] = m.x - 30; P.vy[n] = m.y - 80; P.vk[n] = m.k; P.va[n] = 3600; n++;
    P.vx[n] = m.x - 30; P.vy[n] = m.y + 80; P.vk[n] = -m.k; P.va[n] = 3600; n++;
  }
  P.n = n;
  for (let j = 0; j < 3; j++) P.ph[j] = NK[j][3] * t + NK[j][4];
  P.gn = 0;
  for (const [td, gx, gy] of GOTAS) if (t >= td && t < td + 1.6) { P.gx[P.gn] = gx; P.gy[P.gn] = gy; P.gs[P.gn] = 22700 * Math.exp(-(t - td) / .22); P.gn++; }
}
function vel(x: number, y: number, P: Par, o: Float64Array) {
  let u = 0, v = 0;
  for (let i = 0; i < P.n; i++) {
    const dx = x - P.vx[i], dy = y - P.vy[i], r2 = dx * dx + dy * dy + 1e-3;
    const f = P.vk[i] * (1 - Math.exp(-r2 / P.va[i])) / r2;
    u -= f * dy; v += f * dx;
  }
  for (let j = 0; j < 3; j++) { const q = NK[j][2] * Math.cos(NK[j][0] * x + NK[j][1] * y + P.ph[j]); u += q * NK[j][1]; v -= q * NK[j][0]; }
  for (let g = 0; g < P.gn; g++) { const dx = x - P.gx[g], dy = y - P.gy[g], r2 = dx * dx + dy * dy + 400; u += P.gs[g] * dx / r2; v += P.gs[g] * dy / r2; }
  // Paredes que resbalan: la velocidad hacia el borde se apaga, la que corre a lo largo se queda.
  const W = 64;
  if (u < 0 && x - FX0 < W) u *= Math.max(x - FX0, 0) / W; if (u > 0 && FX1 - x < W) u *= Math.max(FX1 - x, 0) / W;
  if (v < 0 && y - FY0 < W) v *= Math.max(y - FY0, 0) / W; if (v > 0 && FY1 - y < W) v *= Math.max(FY1 - y, 0) / W;
  o[0] = u; o[1] = v;
}
const _o = new Float64Array(2), _o2 = new Float64Array(2);
function rk2(x: number, y: number, P: Par, o: Float64Array) {
  vel(x, y, P, _o); const xm = x + _o[0] * DT * .5, ym = y + _o[1] * DT * .5;
  vel(xm, ym, P, _o2); o[0] = x + _o2[0] * DT; o[1] = y + _o2[1] * DT;
}

// ---------- partículas trazadoras: estado incremental, idéntico al calculado desde cero ----------
const NT = 2600, HL = 14, LMAX = 136;
let ATEN = 1;
const LV = new Int32Array(NT), OF = new Int32Array(NT);
for (let k = 0; k < NT; k++) { LV[k] = 75 + Math.floor(hash(k, 1) * 60); OF[k] = Math.floor(hash(k, 2) * LV[k]); }
const semilla = (k: number, n: number): V2 => [lerp(FX0 + 6, FX1 - 6, hash(k * 1.37 + n * 7.91, 3)), lerp(FY0 + 6, FY1 - 6, hash(k * 2.11 + n * 3.17, 4))];
const SIM = { i: -1e9, x: new Float64Array(NT), y: new Float64Array(NT), hx: new Float32Array(NT * HL), hy: new Float32Array(NT * HL), hn: new Uint8Array(NT), hp: new Uint8Array(NT) };
const PS = nuevoPar(), _r = new Float64Array(2);
function empuja(k: number, x: number, y: number) {
  const p = SIM.hp[k]; SIM.hx[k * HL + p] = x; SIM.hy[k * HL + p] = y;
  SIM.hp[k] = (p + 1) % HL; if (SIM.hn[k] < HL) SIM.hn[k]++;
}
function nace(k: number, i: number) {
  const n = Math.floor((i + OF[k]) / LV[k]), [x, y] = semilla(k, n);
  SIM.x[k] = x; SIM.y[k] = y; SIM.hn[k] = 0; SIM.hp[k] = 0; empuja(k, x, y);
}
function paso(i: number) {               // de i a i+1
  parametros(i * DT, PS);
  for (let k = 0; k < NT; k++) {
    if ((i + 1 + OF[k]) % LV[k] === 0) { nace(k, i + 1); continue; }
    rk2(SIM.x[k], SIM.y[k], PS, _r); SIM.x[k] = _r[0]; SIM.y[k] = _r[1]; empuja(k, _r[0], _r[1]);
  }
  SIM.i = i + 1;
}
function simula(I: number) {
  if (SIM.i > I || I - SIM.i > 160) { const i0 = I - LMAX - 1; for (let k = 0; k < NT; k++) nace(k, i0); SIM.i = i0; }
  while (SIM.i < I) paso(SIM.i);
}

// ---------- precálculo: gotas (líneas materiales) y la medalla ----------
type Datos = { anillos: { td: number; np: number; ns: number; p: Float32Array }[]; gente: Float32Array; ng: number; firmas: V2[][] };
/** La medalla flota con el agua y un resorte suave la regresa a su lugar. */
const RUTA = (() => {
  const P = nuevoPar(), o = new Float64Array(2), N = Math.ceil(DURACION / DT) + 4, med = new Float32Array(N * 2);
  let x = 380, y = 1140;
  for (let i = 0; i < N; i++) {
    const t = i * DT;
    med[i * 2] = x; med[i * 2 + 1] = y;
    parametros(t, P); vel(x, y, P, o);
    const antes = t < E.alcanza + .15, hx = antes ? 380 : 610, hy = antes ? 1130 : 930, K = antes ? 1.4 : .35;
    const suelta = t > E.alcanza - .05 && t < E.alcanza + .7 ? 2.2 : 1;
    x += (o[0] * .7 * suelta + K * (hx - x)) * DT; y += (o[1] * .7 * suelta + K * (hy - y)) * DT;
  }
  return med;
})();
const medallaEn = (t: number): [number, number, number] => {
  const i = clamp(Math.floor(t / DT), 0, RUTA.length / 2 - 2), f = t / DT - i;
  const ang = .22 * Math.sin(t * .6) + TAU * ease.inOutCubic(prog(t, E.alcanza, E.alcanza + 1.4));
  return [lerp(RUTA[i * 2], RUTA[i * 2 + 2], f), lerp(RUTA[i * 2 + 1], RUTA[i * 2 + 3], f), ang];
};
const NP = 560;
let DAT: Datos | null = null;
function prepara(): Datos {
  if (DAT) return DAT;
  const P = nuevoPar(), o = new Float64Array(2);
  const anillos = GOTAS.map(([td, gx, gy]) => {
    const ns = Math.round(VIDA_GOTA / DT), p = new Float32Array((ns + 1) * NP * 2);
    for (let m = 0; m < NP; m++) { const a = m / NP * TAU; p[m * 2] = gx + Math.cos(a) * 14; p[m * 2 + 1] = gy + Math.sin(a) * 14; }
    const i0 = Math.round(td / DT);
    for (let s = 0; s < ns; s++) {
      parametros((i0 + s) * DT, P);
      const A = s * NP * 2, B = (s + 1) * NP * 2;
      for (let m = 0; m < NP; m++) { rk2(p[A + m * 2], p[A + m * 2 + 1], P, o); p[B + m * 2] = o[0]; p[B + m * 2 + 1] = o[1]; }
    }
    return { td, np: NP, ns, p };
  });
  // ~10,000 agentes alrededor de la hoja, en filas ordenadas (rejilla hexagonal); la hoja y la bola, libres.
  const r = azar(24), cand: number[] = [];
  for (let fy = 0, gy = -1560; gy < 3060; gy += 38, fy++) for (let gx = -1300 + (fy % 2) * 22; gx < 2480; gx += 44) {
    if (gx > HX - 40 && gx < HX + HW + 40 && gy > HY - 40 && gy < HY + HH + 40) continue;
    if (Math.hypot(gx - YO0[0], gy - YO0[1]) < 105) continue;
    cand.push(gx, gy, r());
  }
  const idx = Array.from({ length: cand.length / 3 }, (_, i) => i).sort((p, q) => cand[p * 3 + 2] - cand[q * 3 + 2]).slice(0, 10000);
  const gente = new Float32Array(idx.length * 4);
  idx.forEach((i, k) => { gente[k * 4] = cand[i * 3]; gente[k * 4 + 1] = cand[i * 3 + 1]; gente[k * 4 + 2] = Math.hypot(cand[i * 3] - YO0[0], cand[i * 3 + 1] - YO0[1]); gente[k * 4 + 3] = hash(k, 9) * TAU; });
  // Nueve firmas a mano: garabatos con su propia letra.
  const firmas: V2[][] = [];
  for (let f = 0; f < 9; f++) {
    const q = azar(300 + f * 17), P2: V2[] = [];
    const n = 5 + Math.floor(q() * 4), w = 150 + q() * 40;
    for (let i = 0; i <= 90; i++) {
      const u = i / 90, x2 = -w / 2 + u * w;
      let y2 = 0; for (let h = 1; h <= 3; h++) y2 += Math.sin(u * TAU * (n * .5 + h * q()) + q() * 6) * (14 / h);
      P2.push([x2 + Math.sin(u * TAU * n) * 14, y2 - Math.cos(u * TAU * n) * 10]);
    }
    firmas.push(P2);
  }
  DAT = { anillos, gente, ng: idx.length, firmas };
  return DAT;
}
// =====================================================================================================
// El sello, la pila y la cámara
// =====================================================================================================
const SX = HCX, SY = HCY, SW = 300, SD = 100, SB = 168;     // huella del sello (mitades) y alto del bloque
function altSello(t: number) {
  if (t < E.sello - .6) return 4000;
  if (t < E.sello) return lerp(1900, 800, ease.inCubic(prog(t, E.sello - .6, E.sello)));
  const s = t - E.sello;
  let h = 600 + 200 * Math.exp(-s / 15) - 46 * Math.exp(-s * 4.2) * Math.sin(s * 15);       // frena en el aire
  if (t > E.jalon) { const j = t - E.jalon; h -= 42 * (1 - Math.exp(-j * 9)) + 18 * Math.exp(-j * 5) * Math.sin(j * 22); }   // el jalón
  return h;
}
const H_FIN = altSello(DURACION), PILA_MAX = H_FIN - 46;
function altPila(t: number) {
  const a = E.producir - .05;
  if (t < a) return 0;
  return PILA_MAX * (1 - Math.exp(-(t - a) / .95)) * (1 - .02 * Math.exp(-(t - a)));
}
const PW = 250, PD = 150;                    // mitades de la hoja de la pila

type Cam = { x: number; y: number; z: number; r: number };
const MED_MILLON = medallaEn(E.millon + .3);
const CAM: { t: number; x: number; y: number; z: number; d: number; f?: (x: number) => number }[] = [
  { t: .12, x: 545, y: 960, z: 1.0, d: 1.0, f: ease.outExpo },
  { t: E.millon - .25, x: MED_MILLON[0], y: MED_MILLON[1], z: 1.45, d: .75 },
  { t: E.casi - .15, x: 545, y: 960, z: 1.0, d: .8 },
  { t: E.sept, x: 560, y: 935, z: 1.05, d: 4 },
  { t: E.dice + .1, x: 545, y: 960, z: 1.02, d: .6 },
  { t: E.modelo - .25, x: 260, y: 1190, z: 1.3, d: .7 },
  { t: E.diezmil - .1, x: 330, y: 1120, z: .82, d: .55 },
  { t: E.agentes + .05, x: 570, y: 930, z: .47, d: 1.15 },
  { t: E.verdad - .1, x: 570, y: 900, z: .52, d: 1.2 },
  { t: E.sabe - .05, x: 580, y: 840, z: .8, d: 1.7 },
  { t: E.clay + 1, x: 580, y: 850, z: .83, d: 6 },
  { t: E.mates, x: 595, y: 860, z: .83, d: 3 },
  { t: E.experto, x: 625, y: 860, z: .82, d: 2.5 },
  { t: E.hasta - .3, x: 575, y: 845, z: .83, d: 2.5 },
  { t: E.paneo, x: 570, y: 1780, z: 1, d: 1.7, f: ease.outCubic },
  { t: E.brutal - .04, x: 570, y: 1790, z: 1.06, d: .18, f: ease.outCubic },
  { t: E.brutal + .2, x: 570, y: 1790, z: 1.0, d: .9 },
  { t: E.mayo - 1.05, x: 570, y: 2760, z: 1, d: 1.0 },
  { t: E.papelones - .45, x: 570, y: 3760, z: 1, d: 1.0 },
  { t: E.regreso, x: 570, y: 690, z: .93, d: 1.15, f: ease.inOutCubic },
  { t: E.lodificil - .2, x: 530, y: 740, z: 1.0, d: 2.6 },
  { t: E.cierta, x: 550, y: 720, z: .94, d: 4.5 },
];
const SACUDE: [number, number][] = [[.12, 16], [E.sello, 24], [E.jalon, 14], [E.refuto, 12], [E.empuja, 8], [E.brutal, 10]];
function camaraEn(t: number): Cam {
  let x = 548, y = 975, z = 1.1;
  for (const k of CAM) { if (t <= k.t) break; const q = (k.f ?? ease.inOutCubic)(prog(t, k.t, k.t + k.d)); x = lerp(x, k.x, q); y = lerp(y, k.y, q); z = z * (k.z / z) ** q; }
  let sx = 0, sy = 0;
  for (const [g, a] of SACUDE) if (t > g && t < g + 1.2) { const e = a * Math.exp(-(t - g) * 7); sx += e * Math.sin((t - g) * 61) * .6; sy += e * Math.sin((t - g) * 47); }
  return { x: x + 9 * vaiven(t, 6.1) + sx, y: y + 11 * vaiven(t, 4.7, 1) + sy, z: z * (1 + .012 * vaiven(t, 5.3)), r: .006 * vaiven(t, 7.7, 2) };
}
const aPantalla = (K: Cam, x: number, y: number): V2 => [540 + (x - K.x) * K.z, 960 + (y - K.y) * K.z];

// =====================================================================================================
// Piezas
// =====================================================================================================
function hojaPapel(c: C, x: number, y: number, w: number, h: number, fondo = "#FCFBF7") {
  c.fillStyle = "rgba(30,26,20,.10)"; c.fillRect(x + 10, y + 14, w, h);
  c.fillStyle = fondo; c.beginPath();
  c.moveTo(x + tiembla(1) * 1.4, y + tiembla(2) * 1.4); c.lineTo(x + w + tiembla(3) * 1.4, y + tiembla(4) * 1.4);
  c.lineTo(x + w + tiembla(5) * 1.4, y + h + tiembla(6) * 1.4); c.lineTo(x + tiembla(7) * 1.4, y + h + tiembla(8) * 1.4); c.closePath(); c.fill();
  c.strokeStyle = "rgba(17,17,17,.42)"; c.lineWidth = 2.4; c.stroke();
}

/** El agua: anillos de tinta (líneas materiales) y partículas con estela, recortados a la hoja. */
function agua(c: C, t: number, d: Datos, z: number) {
  c.save(); c.beginPath(); c.rect(HX + 3, HY + 3, HW - 6, HH - 6); c.clip();
  // anillos: velo ancho y trazo fino
  for (const an of d.anillos) {
    const s = Math.round((t - an.td) / DT); if (s < 0 || s > an.ns) continue;
    const a = smooth(prog(t, an.td, an.td + .1)) * (1 - smooth(prog(t, an.td + VIDA_GOTA - 3.5, an.td + VIDA_GOTA)));
    if (a <= 0) continue;
    const B = s * an.np * 2;
    c.beginPath(); c.moveTo(an.p[B], an.p[B + 1]);
    for (let m = 1; m < an.np; m++) c.lineTo(an.p[B + m * 2], an.p[B + m * 2 + 1]);
    c.closePath();
    c.lineJoin = "round"; c.lineCap = "round";
    c.strokeStyle = `rgba(17,17,17,${.07 * a})`; c.lineWidth = 22; c.stroke();
    c.strokeStyle = `rgba(17,17,17,${.12 * a})`; c.lineWidth = 9; c.stroke();
    c.strokeStyle = `rgba(17,17,17,${.85 * a})`; c.lineWidth = 3.2; c.stroke();
  }
  // partículas
  const I = Math.round(t / DT); simula(I);
  const cubos: Path2D[] = [new Path2D(), new Path2D(), new Path2D(), new Path2D()], gruesas = new Path2D();
  for (let k = 0; k < NT; k++) {
    const n = SIM.hn[k]; if (n < 2) continue;
    const L = LV[k], edad = (I + OF[k]) % L, resta = L - edad;
    const al = Math.min(1, edad / 10) * Math.min(1, resta / 22);
    const cb = al > .8 ? 3 : al > .55 ? 2 : al > .3 ? 1 : 0;
    const P = k % 9 === 0 ? gruesas : cubos[cb];
    const p0 = SIM.hp[k];
    for (let j = 0; j < n; j++) {
      const q = ((p0 - n + j) % HL + HL) % HL, x = SIM.hx[k * HL + q], y = SIM.hy[k * HL + q];
      if (j === 0) P.moveTo(x, y); else P.lineTo(x, y);
    }
  }
  c.lineCap = "round"; c.lineJoin = "round";
  const lw = Math.max(2.1, 1.3 / z);
  [.12, .24, .36, .5].forEach((a, i) => { c.strokeStyle = `rgba(17,17,17,${a * ATEN})`; c.lineWidth = lw; c.stroke(cubos[i]); });
  c.strokeStyle = `rgba(17,17,17,${.55 * ATEN})`; c.lineWidth = lw * 2; c.stroke(gruesas);
  c.restore();
}

function gotaCayendo(c: C, t: number) {
  for (const [td, gx, gy] of GOTAS) {
    if (t < td - .45 || t > td + .7) continue;
    if (t < td) {
      const h = 520 * ((td - t) / .45) ** 2;
      sombra(c, gx, gy, 30, .3 * (1 - h / 520));
      c.fillStyle = TINTA; c.beginPath(); c.ellipse(gx, gy - h - 8, 13, 19, 0, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(gx - 9, gy - h - 16); c.lineTo(gx, gy - h - 46); c.lineTo(gx + 9, gy - h - 16); c.fill();
    } else {
      const a = t - td, r = azar(Math.round(td * 100));
      c.strokeStyle = `rgba(17,17,17,${.6 * (1 - a / .7)})`; c.lineWidth = 3; c.beginPath(); c.arc(gx, gy, 20 + a * 260, 0, TAU); c.stroke();
      c.fillStyle = TINTA;
      for (let i = 0; i < 12; i++) {
        const ang = i / 12 * TAU + r(), v = 260 + r() * 200, x = gx + Math.cos(ang) * v * a, y = gy + Math.sin(ang) * v * a * .8 - (380 * a - 900 * a * a);
        if (a < .45) circulo(c, x, y, 6 * (1 - a / .45) + 1.5);
      }
    }
  }
}

function medalla(c: C, x: number, y: number, R: number, ang: number, tipo: "millon" | "oro" | "mini", brillo = 0, alfa = 1) {
  if (alfa <= .01) return;
  c.save(); c.globalAlpha = alfa; c.translate(x, y);
  const g = c.createRadialGradient(R * .16, R * .22, R * .6, R * .16, R * .22, R * 1.35);
  g.addColorStop(0, "rgba(20,18,14,.35)"); g.addColorStop(1, "rgba(20,18,14,0)");
  c.fillStyle = g; circulo(c, R * .16, R * .22, R * 1.35);
  c.rotate(ang);
  const oro = tipo === "oro";
  const L = c.createLinearGradient(-R, -R, R, R);
  (oro ? [["#E9CF8A", 0], ["#A9822F", .3], ["#E2C273", .55], ["#8C6923", .8], ["#D8B663", 1]] : [["#F1EFE9", 0], ["#A3A098", .3], ["#E6E3DC", .55], ["#8D8A82", .8], ["#DEDBD3", 1]])
    .forEach(([k, s]) => L.addColorStop(s as number, k as string));
  c.fillStyle = oro ? "#4a3510" : "#1b1b1a"; circulo(c, 0, 0, R);
  c.fillStyle = L; circulo(c, 0, 0, R * .94);
  c.strokeStyle = oro ? "rgba(74,53,16,.7)" : "rgba(17,17,17,.55)"; c.lineWidth = Math.max(R * .025, 1.2);
  c.beginPath(); c.arc(0, 0, R * .8, 0, TAU); c.stroke();
  for (let i = 0; i < 40; i++) { const a = i / 40 * TAU; linea(c, Math.cos(a) * R * .84, Math.sin(a) * R * .84, Math.cos(a) * R * .9, Math.sin(a) * R * .9); }
  if (tipo === "millon") {
    texto(c, "US$", 0, -R * .2, { fuente: serif(Math.round(R * .26), true), color: "#1b1b1a", alfa });
    texto(c, "1,000,000", 0, R * .2, { fuente: serif(Math.round(R * .38)), color: "#1b1b1a", alfa });
  }
  if (oro) texto(c, "ORO", 0, R * .2, { fuente: serif(Math.round(R * .56)), color: "#4a3510", alfa });
  if (brillo > 0) {
    const b = c.createLinearGradient(-R, 0, R, 0), p = lerp(-.4, 1.4, brillo);
    b.addColorStop(clamp(p - .2), "rgba(255,255,255,0)"); b.addColorStop(clamp(p), "rgba(255,255,255,.75)"); b.addColorStop(clamp(p + .2), "rgba(255,255,255,0)");
    c.fillStyle = b; circulo(c, 0, 0, R * .94);
  }
  c.restore();
}

/** Sello de goma visto de frente y desde arriba: huella en (x, y), su panza a altura h. */
function sello(c: C, t: number, h: number, sobre = 0) {
  const x = SX + 6 * vaiven(t, 3.3), y = SY, rot = .014 * vaiven(t, 2.9, 1) + .02 * Math.exp(-Math.max(t - E.sello, 0) * 3) * Math.sin((t - E.sello) * 13);
  // sombra en lo que tiene debajo (agua o pila), más dura cuanto más cerca
  const hr = h - sobre, k = clamp(1 - hr / 1700), rs = SW * .95 + hr * .12;
  c.save(); c.translate(x, y - sobre); c.scale(1, .4);
  const sg = c.createRadialGradient(0, 0, 10, 0, 0, rs);
  sg.addColorStop(0, `rgba(20,18,14,${.62 * k})`); sg.addColorStop(.55, `rgba(20,18,14,${.42 * k})`); sg.addColorStop(1, "rgba(20,18,14,0)");
  c.fillStyle = sg; circulo(c, 0, 0, rs); c.restore();
  c.save(); c.translate(x, y - h + SD); c.rotate(rot); c.translate(0, -SD);
  // goma roja y bloque de madera (cara frontal + tapa)
  const yb = SD;                                      // borde frontal inferior, relativo
  c.lineJoin = "round";
  c.fillStyle = "#6F2112"; c.fillRect(-SW + 8, yb - 26, SW * 2 - 16, 26);
  c.fillStyle = ACENTO; c.fillRect(-SW + 8, yb - 8, SW * 2 - 16, 8);
  const cara = yb - 26;
  c.fillStyle = "#EFE6D2"; c.strokeStyle = TINTA; c.lineWidth = 5;
  c.beginPath(); c.rect(-SW, cara - SB, SW * 2, SB); c.fill(); c.stroke();
  c.fillStyle = "#F8F2E4"; c.beginPath(); c.moveTo(-SW, cara - SB); c.lineTo(-SW + 30, cara - SB - SD * 2 + 30); c.lineTo(SW - 30, cara - SB - SD * 2 + 30); c.lineTo(SW, cara - SB); c.closePath(); c.fill(); c.stroke();
  for (let i = 0; i < 4; i++) { c.strokeStyle = "rgba(120,90,50,.18)"; c.lineWidth = 2; linea(c, -SW + 20, cara - SB + 26 + i * 30, SW - 20, cara - SB + 22 + i * 30 + (i % 2) * 6); }
  texto(c, "EN REVISIÓN", 0, cara - SB / 2 + 30, { fuente: mono(86), color: ACENTO, esp: 3 });
  // cuello y perilla
  const ty = cara - SB - SD + 15;
  c.fillStyle = "#2a2a28"; c.fillRect(-24, ty - 84, 48, 84);
  c.fillStyle = "#555451"; c.fillRect(-24, ty - 84, 13, 84);
  bola(c, 0, ty - 122, 64);
  c.restore();
}

function pila(c: C, t: number, P: number) {
  if (P <= 1) return;
  const x0 = SX, y0 = SY + 10, n = Math.floor(P / 4.2), yb = y0 + PD;
  sombra(c, x0 + 20, yb + 6, PW * 1.25, .35);
  // frente: el canto de cada hoja, cada una un poco movida; de vez en cuando una sobresale
  for (let i = 0; i < n; i++) {
    const zz = i * 4.2, sale = hash(i, 8) < .12 ? (hash(i, 9) - .5) * 70 : 0;
    const dx = (hash(i, 5) - .5) * 18 + Math.sin(i * .21) * 10 + sale, ww = PW + (hash(i, 6) - .5) * 10;
    c.fillStyle = hash(i, 7) < .5 ? "#FBFAF6" : "#F0EDE5";
    c.fillRect(x0 - ww + dx, yb - zz - 4.2, ww * 2, 4.2);
    c.fillStyle = `rgba(17,17,17,${.18 + .2 * hash(i, 10)})`; c.fillRect(x0 - ww + dx, yb - zz - 1, ww * 2, 1.3);
  }
  // sombra lateral: el bloque tiene volumen
  const g = c.createLinearGradient(x0 + PW - 60, 0, x0 + PW + 20, 0); g.addColorStop(0, "rgba(20,18,14,0)"); g.addColorStop(1, "rgba(20,18,14,.16)");
  c.fillStyle = g; c.fillRect(x0 + PW - 60, yb - P, 90, P);
  // la hoja de arriba, con renglones
  const dx = (hash(n, 5) - .5) * 18 + Math.sin(n * .21) * 10, yt = yb - P - PD;
  c.fillStyle = "#FCFBF7"; c.strokeStyle = "rgba(17,17,17,.6)"; c.lineWidth = 3;
  c.beginPath(); c.rect(x0 - PW + dx, yt - PD, PW * 2, PD * 2); c.fill(); c.stroke();
  c.fillStyle = "rgba(17,17,17,.42)";
  for (let r = 0; r < 5; r++) c.fillRect(x0 - PW + dx + 40, yt - PD + 46 + r * 50, (PW * 2 - 80) * (.55 + .45 * hash(r + n, 7)), 7);
}

function manoHumana(c: C, x: number, y: number, ang: number, s: number, pose: "apunta" | "empuja", alfa = 1) {
  if (alfa <= .01) return;
  c.save(); c.globalAlpha = alfa; c.translate(x, y); c.rotate(ang); c.scale(s, s);
  // el eje local: la mano apunta hacia +x; el brazo viene de -x
  c.lineJoin = "round"; c.lineCap = "round"; c.strokeStyle = TINTA; c.lineWidth = 6;
  c.fillStyle = "#3a3936"; c.beginPath(); c.rect(-1200, -58, 1060, 116); c.fill(); c.stroke();            // manga
  c.fillStyle = "#FCFBF7"; c.beginPath(); c.rect(-150, -50, 34, 100); c.fill(); c.stroke();               // puño de camisa
  c.fillStyle = "#F3E9DD";
  if (pose === "apunta") {
    c.beginPath(); c.roundRect(-118, -54, 150, 108, 34); c.fill(); c.stroke();                            // palma
    for (let i = 0; i < 3; i++) { c.beginPath(); c.roundRect(10, -10 + i * 22 - 8, 52, 30, 14); c.fill(); c.stroke(); }   // dedos doblados
    c.beginPath(); c.roundRect(20, -54, 170, 34, 16); c.fill(); c.stroke();                               // índice
    c.beginPath(); c.roundRect(-60, -78, 80, 30, 14); c.fill(); c.stroke();                               // pulgar
  } else {
    c.beginPath(); c.roundRect(-118, -64, 150, 128, 36); c.fill(); c.stroke();
    for (let i = 0; i < 4; i++) { c.beginPath(); c.roundRect(20, -60 + i * 30, 118 - Math.abs(i - 1.5) * 16, 28, 13); c.fill(); c.stroke(); }
    c.beginPath(); c.roundRect(-40, -96, 90, 34, 15); c.fill(); c.stroke();
  }
  c.restore();
}

function lupa(c: C, x: number, y: number, R: number, ang: number, alfa = 1) {
  if (alfa <= .01) return;
  c.save(); c.globalAlpha = alfa; c.translate(x, y);
  c.strokeStyle = TINTA; c.lineCap = "round";
  c.lineWidth = R * .22; linea(c, Math.cos(ang) * R * 1.05, Math.sin(ang) * R * 1.05, Math.cos(ang) * R * 2.3, Math.sin(ang) * R * 2.3);
  c.lineWidth = R * .13; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.stroke();
  const g = c.createLinearGradient(-R, -R, R, R); g.addColorStop(0, "rgba(255,255,255,.55)"); g.addColorStop(.4, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(255,255,255,.18)");
  c.fillStyle = g; circulo(c, 0, 0, R * .94);
  c.restore();
}

function reloj(c: C, x: number, y: number, R: number, horas: number, a: number) {
  if (a <= .01) return;
  c.save(); c.globalAlpha = a; c.translate(x, y);
  sombra(c, 6, R * 1.02, R * .9, .25);
  c.fillStyle = "#FCFBF7"; c.strokeStyle = TINTA; c.lineWidth = 9; circulo(c, 0, 0, R); c.beginPath(); c.arc(0, 0, R, 0, TAU); c.stroke();
  c.fillStyle = TINTA; c.fillRect(-16, -R - 30, 32, 24); c.fillRect(-30, -R - 40, 60, 14);
  for (let i = 0; i < 12; i++) { const q = i / 12 * TAU; c.lineWidth = i % 3 ? 3 : 6; linea(c, Math.sin(q) * R * .78, -Math.cos(q) * R * .78, Math.sin(q) * R * .9, -Math.cos(q) * R * .9); }
  const am = horas / 12 * TAU, amin = horas * TAU;
  c.lineWidth = 9; linea(c, 0, 0, Math.sin(am) * R * .48, -Math.cos(am) * R * .48);
  c.strokeStyle = ACENTO; c.lineWidth = 5; linea(c, 0, 0, Math.sin(amin) * R * .74, -Math.cos(amin) * R * .74);
  c.fillStyle = TINTA; circulo(c, 0, 0, 10);
  c.restore();
}

/** Una persona vista de espaldas, sin cara: cabeza, saco y una mano en alto con la lupa. */
function persona(c: C, x: number, y: number, s: number, alza: number, a: number) {
  if (a <= .01) return;
  c.save(); c.globalAlpha = a; c.translate(x, y); c.scale(s, s);
  sombra(c, 0, 0, 46, .35);
  c.fillStyle = TINTA; c.strokeStyle = TINTA; c.lineCap = "round"; c.lineJoin = "round";
  c.lineWidth = 11; linea(c, -10, -4, -12, -52); linea(c, 10, -4, 12, -52);
  c.beginPath(); c.moveTo(-26, -50); c.lineTo(26, -50); c.lineTo(20, -122); c.lineTo(-20, -122); c.closePath(); c.fill();
  circulo(c, 0, -142, 19);
  const hx = lerp(34, 52, alza), hy = lerp(-84, -168, alza);
  c.lineWidth = 9; linea(c, 18, -116, hx, hy); linea(c, -18, -116, -30, -72);
  c.restore();
  const [lx, ly] = lupaDePersona(x, y, s, alza);
  lupa(c, lx, ly, 44 * s, 2.35, a);
}
const lupaDePersona = (x: number, y: number, s: number, alza: number): V2 => [x + (lerp(34, 52, alza) + 36) * s, y + (lerp(-84, -168, alza) - 40) * s];

// ---------- la bola protagonista: dónde está y qué hacen sus manos ----------
const SITIO: [number, number, V2][] = [
  [E.paneo + .15, E.paneo + 1.9, [360, 1990]], [E.mayo - 1.05, E.mayo - .05, [570, 2700]], [E.papelones - .45, E.papelones + .55, [570, 4160]], [E.regreso, E.regreso + 1.1, [905, 1080]],
];
function yo(t: number) {
  let x = YO0[0], y = YO0[1], salto = 0;
  for (const [a, b, [px, py]] of SITIO) { if (t <= a) break; const q = ease.inOutCubic(prog(t, a, b)); x = lerp(x, px, q); y = lerp(y, py, q); if (q > 0 && q < 1) salto = Math.abs(Math.sin(q * Math.PI * 3)) * 70; }
  return { x, y: y - salto - Math.abs(Math.sin(t * 2.2)) * 6, r: 66, suelo: y + 66 };
}

// =====================================================================================================
// Escenas
// =====================================================================================================
function polvo(c: C, t: number, K: Cam) {
  const r = azar(9);
  c.fillStyle = TINTA;
  for (let i = 0; i < 80; i++) {
    const x0 = r() * 1300, y0 = r() * 2200, v = 14 + r() * 40, f = r() * 6.3, z = 1.6 + r() * 3.2, px = .25 + r() * .5;
    const y = ((y0 - t * v - K.y * px) % 2200 + 2200) % 2200 - 140, x = ((x0 + Math.sin(t * .5 + f) * 30 - K.x * px) % 1300 + 1300) % 1300 - 110;
    c.globalAlpha = .07 + r() * .14; c.fillRect(x, y, z, z);
  }
  c.globalAlpha = 1;
}

function multitud(c: C, t: number, d: Datos, a: number, modo: 0 | 1) {
  if (a <= .01) return;
  const cuerpo = new Path2D(), manos = new Path2D();
  const congela = modo === 0 ? Math.min(t, E.verdad + .05) : t, mira = modo === 0 ? smooth(prog(t, E.verdad, E.verdad + .3)) : 0;
  for (let k = 0; k < d.ng; k++) {
    const x = d.gente[k * 4], y0 = d.gente[k * 4 + 1], dist = d.gente[k * 4 + 2], f = d.gente[k * 4 + 3];
    let p: number;
    if (modo === 0) {
      const ta = E.diezmil + dist * .0003, tf = E.sabe + .2 + (4200 - dist) * .00016;
      p = ease.outBack(prog(t, ta, ta + .3), 2.2) * (1 - smooth(prog(t, tf, tf + .3)));
    } else p = a;
    if (p <= .01) continue;
    const r = 12 * p, y = y0 - Math.abs(Math.sin(congela * 5 + f)) * 4 * p;
    cuerpo.moveTo(x + r, y); cuerpo.arc(x, y, r, 0, TAU);
    const w = Math.sin(congela * 8 + f * 2), L = 13 * p;
    const a1 = lerp(-2.15 + .35 * w, -1.9, mira), a2 = lerp(-1.0 - .35 * w, -1.25, mira);
    manos.moveTo(x - r * .7, y - r * .7); manos.lineTo(x - r * .7 + Math.cos(a1) * L, y - r * .7 + Math.sin(a1) * L);
    manos.moveTo(x + r * .7, y - r * .7); manos.lineTo(x + r * .7 + Math.cos(a2) * L, y - r * .7 + Math.sin(a2) * L);
  }
  c.save(); c.globalAlpha = modo === 0 ? 1 : a;
  c.fillStyle = "#1d1d1c"; c.fill(cuerpo);
  c.strokeStyle = TINTA; c.lineWidth = 3.4; c.lineCap = "round"; c.stroke(manos);
  c.restore();
}

/** Las dos hojas que no empatan: renglones unidos por hilos; dos se cruzan y uno se queda sin pareja. */
function hojasQueNoEmpatan(c: C, t: number) {
  const ent = ease.outCubic(prog(t, E.mates, E.mates + .7)), sal = ease.inCubic(prog(t, E.experto - .1, E.experto + .5));
  if (ent <= 0 || sal >= 1) return;
  const yc = 1000, w = 320, h = 560;
  const xl = lerp(-300, 372, ent) - sal * 900, xr = lerp(1460, 812, ent) + sal * 900;
  const rot = (1 - ent) * .3;
  const fil = (i: number) => yc - h / 2 + 150 + i * 56;
  // tablero detrás: aquí se comparan, sin agua ni medalla de por medio
  const ab = smooth(prog(t, E.mates + .1, E.mates + .5)) * (1 - smooth(prog(t, E.experto - .1, E.experto + .3)));
  if (ab > 0) {
    c.save(); c.globalAlpha = ab;
    c.fillStyle = "rgba(30,26,20,.12)"; c.beginPath(); c.roundRect(186, yc - h / 2 - 40, 808, h + 92, 22); c.fill();
    c.fillStyle = "#E9E5DB"; c.strokeStyle = "rgba(17,17,17,.4)"; c.lineWidth = 3; c.beginPath(); c.roundRect(176, yc - h / 2 - 50, 808, h + 92, 22); c.fill(); c.stroke();
    c.restore();
  }
  // izquierda: versión formal, renglones de bloques cortos (símbolos, no código)
  for (const [cx, lado] of [[xl, 0], [xr, 1]] as [number, number][]) {
    c.save(); c.translate(cx, yc); c.rotate(lado ? -.035 - rot : .03 + rot); c.translate(-cx, -yc);
    hojaPapel(c, cx - w / 2, yc - h / 2, w, h);
    const resalta = lado ? smooth(prog(t, E.texto, E.texto + .2)) : smooth(prog(t, E.formal, E.formal + .2));
    texto(c, lado ? "el texto" : "versión formal", cx, yc - h / 2 + 76, { fuente: serif(56, true), color: resalta > .5 ? ACENTO : TINTA, alfa: .55 + .45 * resalta });
    c.strokeStyle = "rgba(17,17,17,.3)"; c.lineWidth = 2; linea(c, cx - w / 2 + 30, yc - h / 2 + 100, cx + w / 2 - 30, yc - h / 2 + 100);
    c.fillStyle = TINTA; c.strokeStyle = TINTA; c.lineWidth = 3.4; c.lineCap = "round";
    for (let i = 0; i < 7; i++) {
      const y = fil(i);
      if (!lado) {
        let x = cx - w / 2 + 34; const q = azar(40 + i);
        while (x < cx + w / 2 - 50) { const L = 14 + q() * 34; c.globalAlpha = .82; c.fillRect(x, y - 9, L, 16); x += L + 9 + q() * 9; if (q() < .25) { c.beginPath(); c.arc(x + 6, y - 1, 7, 0, TAU); c.stroke(); x += 22; } }
        c.globalAlpha = 1;
      } else {
        c.beginPath();
        for (let k = 0; k <= 40; k++) { const u = k / 40, x = cx - w / 2 + 34 + u * (w - 80 - (i % 3) * 30), yy = y + Math.sin(u * 23 + i) * 6 + Math.sin(u * 61 + i * 2) * 2.5; if (k) c.lineTo(x, yy); else c.moveTo(x, yy); }
        c.stroke();
      }
    }
    c.restore();
  }
  // hilos entre renglones: cinco empatan, dos se cruzan, uno se queda solo
  const pares: [number, number, boolean][] = [[0, 0, true], [1, 1, true], [2, 2, true], [3, 4, false], [4, 3, false], [5, 5, true], [6, -1, false]];
  const kh = prog(t, E.nodicen - .2, E.nodicen + .9), rojo = smooth(prog(t, E.exacto - .1, E.exacto + .2));
  pares.forEach(([i, j, bien], n) => {
    const q = clamp(kh * 7 - n * .8); if (q <= 0) return;
    const ax = xl + w / 2 - 18, ay = fil(i), bx = xr - w / 2 + 18, by = j >= 0 ? fil(j) : fil(i) + 30;
    c.save(); c.lineWidth = bien ? 5 : 8; c.lineCap = "round";
    c.strokeStyle = bien ? "rgba(17,17,17,.55)" : rojo > .5 ? ACENTO : "rgba(17,17,17,.55)";
    if (j >= 0) trazo(c, [[ax, ay], [lerp(ax, bx, .35), ay], [lerp(ax, bx, .65), by], [bx, by]], q);
    else { c.setLineDash([4, 14]); trazo(c, [[ax, ay], [lerp(ax, bx, .55), by]], q); c.setLineDash([]); if (rojo > 0) texto(c, "?", lerp(ax, bx, .62), by + 30, { fuente: serif(96, true), color: ACENTO, alfa: rojo }); }
    c.restore();
  });
}

function tarjetaErdos(c: C, t: number, cx: number, cy: number, rompe: number, alfa: number) {
  const w = 680, h = 330, gap = ease.outCubic(rompe) * 250, caeY = rompe > 0 ? 260 * Math.max(0, rompe - .25) ** 2 : 0;
  const zig: V2[] = []; const q = azar(77);
  for (let i = 0; i <= 12; i++) zig.push([(q() - .5) * 34, -h / 2 + i * h / 12]);
  for (const lado of [-1, 1]) {
    c.save(); c.translate(cx + lado * gap, cy + caeY); c.rotate(lado * rompe * .22);
    const borde = () => {
      c.beginPath();
      if (rompe <= 0) c.rect(-w / 2, -h / 2, w, h);
      else { c.moveTo(lado * w / 2, -h / 2); for (const [zx, zy] of zig) c.lineTo(zx, zy); c.lineTo(lado * w / 2, h / 2); c.closePath(); }
    };
    borde(); c.save(); c.clip();
    c.fillStyle = "#FCFBF7"; c.fillRect(-w / 2, -h / 2, w, h);
    texto(c, "conjetura de Erdős", 0, -h / 2 + 92, { fuente: serif(76, true), color: TINTA, alfa });
    c.strokeStyle = TINTA; c.lineWidth = 3.4;
    for (let r = 0; r < 3; r++) { c.beginPath(); for (let k = 0; k <= 40; k++) { const u = k / 40, x = -w / 2 + 70 + u * (w - 140 - r * 60), y = -h / 2 + 160 + r * 52 + Math.sin(u * 27 + r) * 6; if (k) c.lineTo(x, y); else c.moveTo(x, y); } c.stroke(); }
    c.restore();
    borde(); c.strokeStyle = "rgba(17,17,17,.6)"; c.lineWidth = 3; c.stroke();
    c.restore();
  }
  if (rompe <= 0) { c.fillStyle = ACENTO; circulo(c, cx, cy - h / 2 + 2, 13); }
}

function recorte(c: C, t: number, x: number, y: number, k: number, gira: number, llega: number, sella: number) {
  if (llega <= 0) return;
  const w = 370, h = 150, sx = Math.cos(gira * Math.PI), atras = sx < 0;
  c.save(); c.translate(x, y); c.rotate((hash(k, 3) - .5) * .12 + (1 - llega) * (hash(k, 4) - .5) * 2); c.scale(Math.max(Math.abs(sx), .02) * lerp(.4, 1, llega), lerp(.4, 1, llega));
  c.fillStyle = "rgba(30,26,20,.14)"; c.fillRect(-w / 2 + 8, -h / 2 + 10, w, h);
  if (!atras) {
    c.fillStyle = "#FCFBF7"; c.strokeStyle = "rgba(17,17,17,.55)"; c.lineWidth = 3; c.beginPath(); c.rect(-w / 2, -h / 2, w, h); c.fill(); c.stroke();
    c.fillStyle = "rgba(17,17,17,.45)"; for (let r = 0; r < 3; r++) c.fillRect(-w / 2 + 26, -h / 2 + 34 + r * 30, 150 - r * 30, 6);
    if (sella > 0) {
      const z = lerp(1.9, 1, ease.outCubic(sella));
      c.save(); c.translate(70, 6); c.rotate(-.12); c.scale(z, z); c.globalAlpha = clamp(sella * 3);
      c.strokeStyle = ACENTO; c.lineWidth = 5; c.strokeRect(-104, -38, 208, 76);
      texto(c, "«resuelto»", 0, 16, { fuente: serif(50, true), color: ACENTO }); c.restore();
    }
  } else {
    // recorte de un libro viejo: papel amarillento, orilla rasgada, letra chica en dos columnas
    const q = azar(500 + k);
    c.fillStyle = "#E3D9C1"; c.strokeStyle = "rgba(80,60,30,.5)"; c.lineWidth = 2;
    c.beginPath();
    for (let i = 0; i <= 24; i++) { const u = i / 24; c.lineTo(-w / 2 + u * w, -h / 2 + (q() - .5) * 10); }
    for (let i = 0; i <= 10; i++) c.lineTo(w / 2 + (q() - .5) * 10, -h / 2 + i / 10 * h);
    for (let i = 24; i >= 0; i--) c.lineTo(-w / 2 + i / 24 * w, h / 2 + (q() - .5) * 10);
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = "rgba(60,45,20,.55)";
    for (let col = 0; col < 2; col++) for (let r = 0; r < 7; r++) c.fillRect(-w / 2 + 20 + col * (w / 2), -h / 2 + 22 + r * 17, w / 2 - 44 - (r === 6 ? 60 : q() * 16), 4);
    c.strokeStyle = "rgba(60,45,20,.6)"; c.lineWidth = 2; c.beginPath(); c.arc(w / 2 - 50, h / 2 - 40, 18, 0, TAU); c.stroke();
  }
  c.restore();
}

// =====================================================================================================
function dibuja(c: C, t: number, d: Datos) {
  FR = Math.floor(t * 10);
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  const K = camaraEn(t);
  polvo(c, t, K);
  c.save(); c.translate(540, 960); c.rotate(K.r); c.scale(K.z, K.z); c.translate(-K.x, -K.y);

  // ---------- la multitud ----------
  if (t > E.diezmil - .1 && t < E.sabe + 1.6) multitud(c, t, d, 1, 0);
  const vuelve = ventana(t, E.producir - .3, E.lodificil, .5, .8);
  if (vuelve > 0) {
    multitud(c, t, d, vuelve, 1);
  }
  // ---------- la hoja con agua ----------
  const verHoja = K.y < 2700;
  const [mx, my, ma] = medallaEn(t);
  const P = altPila(t);
  if (verHoja) {
    hojaPapel(c, HX, HY, HW, HH);
    const fa = ventana(t, E.ecuaciones - .05, E.milenio + .4, .5, .5);
    ATEN = 1 - .55 * fa;
    agua(c, t, d, K.z);
    ATEN = 1;
    gotaCayendo(c, t);
    // flechas de velocidad: lo que describen las ecuaciones
    if (fa > 0) {
      parametros(t, PS); const o = new Float64Array(2);
      c.strokeStyle = ACENTO; c.fillStyle = ACENTO; c.lineCap = "round";
      for (let gy = HY + 64; gy < HY + HH - 30; gy += 86) for (let gx = HX + 56; gx < HX + HW - 30; gx += 86) {
        const w2 = clamp((fa * 1.4 - (gx - HX) / HW * .4)); if (w2 <= 0) continue;
        vel(gx, gy, PS, o); const sp = Math.hypot(o[0], o[1]) + 1e-6, L = clamp(sp * .34, 14, 70) * w2, ux = o[0] / sp, uy = o[1] / sp;
        c.globalAlpha = w2; c.lineWidth = 6;
        linea(c, gx - ux * L / 2, gy - uy * L / 2, gx + ux * L / 2, gy + uy * L / 2);
        c.beginPath(); c.moveTo(gx + ux * (L / 2 + 13), gy + uy * (L / 2 + 13)); c.lineTo(gx + ux * L / 2 - uy * 11, gy + uy * L / 2 + ux * 11); c.lineTo(gx + ux * L / 2 + uy * 11, gy + uy * L / 2 - ux * 11); c.closePath(); c.fill();
      }
      c.globalAlpha = 1;
    }
    // la medalla del millón: flota; al final se queda en la pila, a la orilla del sello
    const brillo = prog(t, E.millon - .05, E.millon + .55) + (t > E.premio && t < E.premio + .7 ? prog(t, E.premio, E.premio + .6) : 0);
    if (P < 1) medalla(c, mx, my, 120, ma, "millon", brillo % 1);
    hojasQueNoEmpatan(c, t);
    // la mano del experto empuja el agua
    const mf = manoFuerza(t);
    if (mf.ve && mf.x < 1390) manoHumana(c, mf.x + 70, mf.y, Math.PI, 1.05, "empuja");
    // la lupa que busca el error
    const la = ventana(t, E.hasta - .1, E.pero + .2, .4, .4);
    if (la > 0) {
      const u = prog(t, E.hasta, E.pero + .4), lx = lerp(360, 820, u) + 60 * Math.sin(u * 7), ly = 800 + 280 * Math.sin(u * 4.4) + 40 * Math.cos(u * 11);
      c.save(); c.globalAlpha = la; c.beginPath(); c.arc(lx, ly, 120, 0, TAU); c.clip();
      c.fillStyle = "#FCFBF7"; c.fillRect(lx - 130, ly - 130, 260, 260);
      c.translate(lx, ly); c.scale(1.8, 1.8); c.translate(-lx, -ly); agua(c, t, d, K.z * 1.8); c.restore();
      lupa(c, lx, ly, 124, .8, la);
    }
    // la pila y el sello
    pila(c, t, P);
    if (P >= 1) {
      const sube = smooth(prog(t, E.producir - .05, E.producir + .5));
      medalla(c, lerp(mx, SX + 150, sube), lerp(my, SY + 116 - P, sube), lerp(120, 92, sube), ma * (1 - sube), "millon", 0);
    }
    const h = altSello(t);
    if (h < 3000) sello(c, t, h, P);
  }

  if (vuelve > 0) {
    // hojas que vuelan a la pila
    const q = azar(88);
    for (let i = 0; i < 120; i++) {
      const k = Math.floor(q() * d.ng), t0 = E.producir - .1 + q() * 3.0, u = prog(t, t0, t0 + .55), dx = (q() - .5) * 300, dy = (q() - .5) * 140;
      if (u <= 0 || u >= 1) continue;
      const ax = d.gente[k * 4], ay = d.gente[k * 4 + 1], bx = SX + dx, by = SY + 60 - altPila(t0 + .55) + dy;
      const x = lerp(ax, bx, u), y = lerp(ay, by, u) - Math.sin(u * Math.PI) * 300;
      c.save(); c.translate(x, y); c.rotate(u * 9 + i); c.scale(1, .55 + .45 * Math.cos(u * 12 + i));
      c.fillStyle = "#FCFBF7"; c.strokeStyle = "rgba(17,17,17,.6)"; c.lineWidth = 3; c.fillRect(-46, -58, 92, 116); c.strokeRect(-46, -58, 92, 116); c.restore();
    }
  }

  // ---------- lo demostrado (más abajo en la mesa) ----------
  if (K.y > 1100) {
    // A1: la medalla de oro cae y rebota; la bola la levanta
    const A1x = 740, A1y = 2010, tc = E.julio + .25;
    if (t > tc && t < E.mayo + 1.2) {
      const cd = caida(t - tc, 7.5, .42, 30), hz = cd.z * 110;
      const levanta = ease.outBack(prog(t, E.oro - .15, E.oro + .35)) * (1 - smooth(prog(t, E.mayo - 1.45, E.mayo - 1.1))), yb = yo(Math.min(t, E.mayo - 1.45));
      const ox = lerp(A1x, yb.x + 20, levanta), oy = lerp(A1y - hz, yb.y - 205, levanta);
      const ao = 1 - smooth(prog(t, E.mayo - .75, E.mayo - .3));      // se queda en su mesa; se apaga antes de cruzar los rótulos
      if (levanta < .5) sombra(c, A1x, A1y + 30, 110, ao * .3 / (1 + hz / 200));
      c.save(); c.globalAlpha = ao; c.strokeStyle = ACENTO; c.lineWidth = 34; c.lineCap = "butt";
      linea(c, ox - 30, oy - 70, ox - 80, oy - 230); linea(c, ox + 30, oy - 70, ox + 80, oy - 230); c.restore();
      medalla(c, ox, oy, 98, .1 * Math.sin(t * 2), "oro", prog(t, E.oro + .2, E.oro + .9), ao);
    }
    // A2: la conjetura de Erdős y las nueve firmas
    if (t > E.mayo - .6 && t < E.papelones + 1.2) {
      const cy = 2400 + 30 * (1 - ease.outBack(prog(t, E.mayo + .1, E.mayo + .6)));
      const aE = smooth(prog(t, E.mayo, E.mayo + .35));
      c.save(); c.globalAlpha = aE;
      tarjetaErdos(c, t, 570, cy, prog(t, E.refuto - .05, E.refuto + .7), aE);
      c.restore();
      const fs = ease.outCubic(prog(t, E.nueve - .3, E.nueve + .3));
      if (fs > 0) {
        const sx = 570, sy = 3045 + (1 - fs) * 300, w = 820, h = 330;
        c.save(); c.globalAlpha = fs; hojaPapel(c, sx - w / 2, sy - h / 2, w, h);
        for (let f = 0; f < 9; f++) {
          const col = f % 3, fila = Math.floor(f / 3), x = sx - w / 2 + 140 + col * 270, y = sy - h / 2 + 72 + fila * 96;
          c.strokeStyle = "rgba(17,17,17,.35)"; c.lineWidth = 2; linea(c, x - 100, y + 26, x + 90, y + 26);
          const tf = E.firmas[f], k = prog(t, tf - .14, tf + .12);
          c.strokeStyle = TINTA; c.lineWidth = 3.2; c.lineCap = "round"; c.lineJoin = "round";
          c.save(); c.translate(x - 20, y); c.scale(.55, .55); trazo(c, d.firmas[f], k); c.restore();
          const pk = prog(t, tf + .08, tf + .26);
          if (pk > 0) { c.strokeStyle = ACENTO; c.lineWidth = 8; trazo(c, [[x + 66, y - 4], [x + 82, y + 14], [x + 112, y - 28]], pk); }
        }
        c.restore();
      }
    }
    // A3: diez «resueltos» que eran recortes viejos
    if (t > E.papelones - .6 && t < E.regreso + 1.4) {
      for (let k = 0; k < 10; k++) {
        const col = k % 2, fila = Math.floor(k / 2), x = 570 + (col ? 198 : -198), y = 3330 + fila * 172;
        const yb = yo(t), ll = ease.outBack(prog(t, E.llegan[k], E.llegan[k] + .4));
        const lx = lerp(yb.x, x, clamp(ll)), ly = lerp(yb.y - 60, y, clamp(ll));
        recorte(c, t, lx, ly + Math.sin(t * 1.6 + k) * 4, k, ease.inOutCubic(prog(t, E.voltea[k], E.voltea[k] + .32)), ll, prog(t, E.sellos10[k], E.sellos10[k] + .14));
      }
    }
  }

  // ---------- la bola protagonista ----------
  {
    const b = yo(t), Rb = b.r;
    let m1: V2 = [b.x - 100 + 10 * Math.sin(t * 2.1), b.y - 86 + 9 * Math.sin(t * 2.6)], m2: V2 = [b.x + 100 + 8 * Math.cos(t * 2.3), b.y - 76 + 9 * Math.sin(t * 2.4)];
    let ab1 = .5 + .3 * Math.sin(t * 2.2), ab2 = .5 + .3 * Math.sin(t * 2.7);
    const mueve = (q: number, p1: V2, p2: V2, a1: number, a2: number) => {
      if (q <= 0) return;
      m1 = [lerp(m1[0], p1[0], q), lerp(m1[1], p1[1], q)]; m2 = [lerp(m2[0], p2[0], q), lerp(m2[1], p2[1], q)]; ab1 = lerp(ab1, a1, q); ab2 = lerp(ab2, a2, q);
    };
    // estira la mano a la medalla... y la corriente se la lleva
    const alc = smooth(prog(t, .2, E.alcanza)) * (1 - smooth(prog(t, E.alcanza + .45, E.alcanza + 1.3)));
    if (alc > 0) { m2 = [lerp(m2[0], mx - 60, alc), lerp(m2[1], my + 30, alc)]; ab2 = t > E.alcanza ? lerp(.9, .05, prog(t, E.alcanza, E.alcanza + .25)) : .9; }
    // el modelo interno: un anillo rojo late
    const am = ventana(t, E.modelo - .1, E.diezmil + .3, .2, .4);
    if (am > 0) { c.save(); c.globalAlpha = am * (.55 + .45 * vaiven(t, .45)); c.strokeStyle = ACENTO; c.lineWidth = 9; c.beginPath(); c.arc(b.x, b.y, Rb + 26 + 8 * vaiven(t, .45), 0, TAU); c.stroke(); c.restore(); }
    // ¿es verdad?: alza la vista. Tampoco confirmado: hombros arriba.
    const arriba = ventana(t, E.verdad, E.sello + 2, .2, .6) + ventana(t, E.confirmado, E.paneo + .5, .15, .3);
    mueve(arriba, [b.x - 120, b.y - 150], [b.x + 120, b.y - 150], 1, 1);
    // sin prisa: tamborilea
    const tam = ventana(t, E.prisa, E.mates, .2, .3);
    mueve(tam, [b.x - 60, b.y - 40 + 14 * Math.abs(Math.sin(t * 11))], [b.x + 70, b.y - 30 + 14 * Math.abs(Math.sin(t * 11 + 1.5))], .2, .2);
    // levanta la medalla de oro
    mueve(ventana(t, E.oro - .15, E.mayo - 1.45, .4, .35), [b.x - 30, b.y - 175], [b.x + 70, b.y - 175], .15, .15);
    // rompe la tarjeta
    const ag = ventana(t, E.refuto - .45, E.refuto + .9, .3, .5);
    if (ag > 0) { const r2 = ease.outCubic(prog(t, E.refuto - .05, E.refuto + .7)); mueve(ag, [570 - 60 - r2 * 230, 2400 + 150 + r2 * 40], [570 + 60 + r2 * 230, 2400 + 150 + r2 * 40], .1, .1); }
    // lanza las tarjetas, presume... y se le caen las manos
    mueve(ventana(t, E.papelones + .2, E.voltea[3], .3, .4), [b.x - 140, b.y - 190], [b.x + 140, b.y - 190], 1, 1);
    mueve(ventana(t, E.voltea[3], E.regreso + .2, .4, .4), [b.x - 92, b.y + 70], [b.x + 92, b.y + 70], .1, .1);
    // lanza hojas a la pila
    const la = ventana(t, E.producir - .2, E.lodificil - .3, .2, .4);
    if (la > 0) { const w = Math.sin((t - E.producir) * 13); mueve(la, [b.x - 160 - w * 50, b.y - 150 - w * 40], [b.x - 90 + w * 40, b.y - 190 + w * 50], .9, .9); }
    agente(c, b.x, b.y, Rb, m1, m2, { abre1: ab1, abre2: ab2, piso: b.suelo + 4, sombra: .3 });
  }

  // ---------- la persona con lupa ----------
  const PX = 180, PY = 1170, PS2 = .8;
  const pa = smooth(prog(t, E.lodificil - .1, E.lodificil + .5));
  if (pa > 0) {
    const alza = Math.min(smooth(prog(t, E.alguien, E.alguien + .6)) + .2 * smooth(prog(t, E.golpeFinal - .2, E.golpeFinal + .3)), 1.15);
    persona(c, PX - (1 - pa) * 80, PY, PS2, alza, pa);
    const gl = prog(t, E.golpeFinal - .05, E.golpeFinal + .9);
    if (gl > 0 && gl < 1) {
      const [lx, ly] = lupaDePersona(PX, PY, PS2, alza);
      const g = c.createRadialGradient(lx, ly, 2, lx, ly, 170 * gl + 20);
      g.addColorStop(0, `rgba(192,68,42,${.6 * (1 - gl)})`); g.addColorStop(1, "rgba(192,68,42,0)");
      c.fillStyle = g; circulo(c, lx, ly, 170 * gl + 20);
    }
  }
  c.restore();

  // =========================== encima de la cámara ===========================
  // reloj de 88 horas y manos humanas que dirigen desde arriba
  const rel = ventana(t, E.horas - .2, E.sabe + .3, .3, .5);
  if (rel > 0) {
    const hrs = 88 * ease.inOutCubic(prog(t, E.horas, E.horasF));
    const yr = 330 - (1 - ease.outBack(prog(t, E.horas - .2, E.horas + .25))) * 60;
    niebla(c, yr - 220, yr + 300, rel);
    reloj(c, 230, yr, 118, hrs, rel);
    texto(c, `${Math.round(hrs)} h`, 230, yr + 220, { fuente: mono(76), color: TINTA, alfa: rel });
  }
  const hu = ventana(t, E.humanos - .15, E.sabe + .2, .45, .5);
  if (hu > 0) {
    const baja = ease.outCubic(prog(t, E.humanos - .15, E.humanos + .5));
    manoHumana(c, 640 + 30 * Math.sin(t * 2.3), lerp(-420, 330, baja) + 20 * Math.sin(t * 3.1), Math.PI / 2 + .25 * Math.sin(t * 1.9), .9, "apunta", hu);
    manoHumana(c, 880 + 24 * Math.sin(t * 2.0 + 1), lerp(-480, 250, baja) + 16 * Math.sin(t * 2.6), Math.PI / 2 + .3 + .22 * Math.sin(t * 2.2 + 1), .8, "apunta", hu);
  }
  // los siete Problemas del Milenio
  const sie = ventana(t, E.milenio - .05, E.dice + .2, .2, .4);
  if (sie > 0) {
    for (let i = 0; i < 7; i++) {
      const q = ease.outBack(prog(t, E.siete[i], E.siete[i] + .3)), x = 540 + (i - 3) * 118;
      if (q > 0) { medalla(c, x, 1548, 44 * q, i * .7, "mini"); if (i === 3) { c.strokeStyle = ACENTO; c.lineWidth = 6; c.globalAlpha = sie; c.beginPath(); c.arc(x, 1548, 58 * q, 0, TAU); c.stroke(); c.globalAlpha = 1; } }
    }
  }

  // ---------- rótulos ----------
  const lleno = ventana(t, E.diezmil - .35, E.sabe + .6, .3, .6) + ventana(t, E.producir - .2, E.lodificil + .2, .4, .5);
  niebla(c, 1290, 1650, Math.min(1, lleno));
  niebla(c, 1400, 1660, ventana(t, E.lodificil - .1, E.finvoz + 9, .5, .4));
  const A = 1470, B = 1568;
  // gancho
  rot(c, t, .3, E.millon - .25, "¿Lo resolvió una IA?", 300, 108, TINTA, true);
  rot(c, t, E.casi, E.sept - .35, "casi nadie puede", 250, 92, TINTA, false);
  rot(c, t, E.comprobar, E.sept - .35, "comprobarlo", 375, 124, ACENTO, true);
  // el anuncio
  rot(c, t, E.sept, E.ns - 1.15, "septiembre", 215, 78, GRIS, false);
  rot(c, t, E.ns - .9, E.dice - .1, "un resultado sobre", 215, 78, GRIS, false);
  rot(c, t, E.openai, E.ns - .3, "OpenAI anunció", 345, 116, TINTA, true);
  rot(c, t, E.ns, E.dice - .1, "Navier-Stokes", 345, 140, TINTA, true);
  rot(c, t, E.ecuaciones, E.milenio - .3, "cómo se mueven los fluidos", 1490, 90, TINTA, true);
  rot(c, t, E.milenio, E.dice - .3, "Problemas del Milenio", 1452, 96, TINTA, false);
  // cómo dice que lo hizo
  rot(c, t, E.dice, E.verdad - .3, "según OpenAI", 1415, 66, GRIS, false);
  rot(c, t, E.modelo, E.diezmil - .3, "un modelo interno", 1530, 104, TINTA, true);
  rot2(c, t, E.diezmil, E.humanos - .3, [["unos ", TINTA], ["10,000", ACENTO], [" agentes", TINTA]], 1530, 104);
  rot(c, t, E.humanos, E.verdad - .3, "con humanos dirigiendo", 1530, 96, TINTA, true);
  rot(c, t, E.verdad, E.sabe + .5, "¿Es verdad?", 1530, 150, ACENTO, true);
  // el sello: bloque de dudas
  rot(c, t, E.clay, E.mates - .3, "Instituto Clay:", A, 88, TINTA, false);
  rot(c, t, E.aparente, E.prisa - .3, "«aparentemente resuelto»", B, 88, ACENTO, true);
  rot(c, t, E.prisa, E.mates - .2, "revisará sin prisa", B, 88, TINTA, true);
  rot(c, t, E.mates, E.experto - .3, "unos matemáticos:", A, 88, TINTA, false);
  rot(c, t, E.nodicen, E.experto - .2, "no dicen exactamente lo mismo", B, 84, TINTA, true, 900);
  rot(c, t, E.experto, E.fondo - .3, "un experto:", A, 88, TINTA, false);
  rot2(c, t, E.fuerza - .05, E.fondo - .15, [["usa una ", TINTA], ["fuerza externa", ACENTO]], B, 92);
  rot(c, t, E.fondo, E.hasta - .3, "la pregunta de fondo,", A, 88, TINTA, false);
  rot2(c, t, E.sinella, E.hasta - .2, [["sin ella, ", TINTA], ["sigue abierta", t > E.abierta - .05 ? ACENTO : "rgba(0,0,0,0)"]], B, 96);
  rot(c, t, E.hasta, E.pero - .15, "hasta hoy,", A, 88, TINTA, false);
  rot(c, t, E.hasta + .5, E.pero - .3, "nadie ha encontrado un error", B, 86, TINTA, true, 900);
  rot2(c, t, E.pero, E.paneo + .1, [["pero tampoco ", TINTA], ["está confirmado", ACENTO]], B, 92);
  // lo demostrado
  rot(c, t, E.demostrado, E.julio - .2, "lo demostrado", 830, 92, GRIS, false);
  rot(c, t, E.modesto, E.brutal - .3, "es más modesto", 970, 116, TINTA, true);
  rot(c, t, E.brutal, E.julio - .2, "y aun así, brutal", 970, 132, ACENTO, true);
  rot(c, t, E.julio, E.oro - .3, "julio de 2025", A, 88, GRIS, false);
  rot(c, t, E.gemini, E.oro - .3, "Gemini", B, 120, TINTA, true);
  rot(c, t, E.oro, E.mayo - .5, "nivel de oro", A, 110, ACENTO, true);
  rot(c, t, E.olimpiada, E.mayo - .5, "en la Olimpiada de Matemáticas", B, 78, TINTA, false);
  rot(c, t, E.mayo, E.papelones - .5, "mayo de 2026", 215, 80, GRIS, false);
  rot(c, t, E.modeloOAI, E.papelones - .5, "un modelo de OpenAI", 330, 104, TINTA, true);
  // "refutó" entra cuando la tarjeta ya se abrió lo suficiente para que quepa en el hueco
  const rf = ease.outBack(prog(t, E.refuto + .38, E.refuto + .62), 1.6);
  if (rf > 0 && t < E.papelones - .3) { const [rx, ry] = aPantalla(K, 570, 2420); texto(c, "refutó", rx, ry + 30, { fuente: serif(Math.round(128 * Math.min(rf, 1.06)), true), color: ACENTO, alfa: clamp(rf) * (1 - smooth(prog(t, E.papelones - .7, E.papelones - .3))) }); }
  rot(c, t, E.nueve, E.papelones - .5, "nueve matemáticos", A, 100, TINTA, false);
  rot(c, t, E.firmas[0], E.papelones - .5, "verificaron la prueba", B, 88, ACENTO, true);
  rot(c, t, E.papelones, E.yaresueltos - .4, "papelones", B - 20, 140, ACENTO, true);
  rot(c, t, E.presumio, E.regreso - .2, "se presumió:", 215, 80, GRIS, false);
  rot(c, t, E.gpt5, E.regreso - .2, "GPT-5, «diez resueltos»", 335, 104, TINTA, true);
  rot(c, t, E.yaresueltos - .1, E.regreso + .1, "ya estaban resueltos", B - 20, 112, ACENTO, true);
  // el cierre
  rot(c, t, E.producir, E.lodificil - .3, "producir una prueba", A, 96, TINTA, false);
  rot(c, t, E.dificil1, E.lodificil - .2, "ya no es lo difícil", B, 104, TINTA, true);
  rot(c, t, E.lodificil, E.cierta - .3, "lo difícil es", A + 20, 96, TINTA, false);
  const al = smooth(prog(t, E.alguien - .05, E.alguien + .2)) * (1 - smooth(prog(t, E.cierta - .2, E.cierta + .1)));
  if (al > 0) {                       // "alguien": un anillo rojo señala a la única persona
    const [px, py] = aPantalla(K, PX + 10, PY - 75);
    c.save(); c.globalAlpha = al * (.6 + .4 * vaiven(t, .5)); c.strokeStyle = ACENTO; c.lineWidth = 7;
    c.beginPath(); c.arc(px, py, (118 + 8 * vaiven(t, .5)) * K.z, 0, TAU); c.stroke(); c.restore();
  }
  rot(c, t, E.cierta, 999, "si es cierta.", 1530, 156, ACENTO, true);
}

export const Pieza: React.FC = () => {
  const [h] = useState(() => delayRender("latin-ext"));
  const [listo, setListo] = useState(false);
  useEffect(() => {
    Promise.all([extI.waitUntilDone(), extN.waitUntilDone()])
      .then(() => Promise.all([document.fonts.load(serif(100, true), "ő"), document.fonts.load(serif(100), "ő")]))
      .then(() => setListo(true), () => setListo(true));
  }, []);
  useEffect(() => { if (listo) continueRender(h); }, [listo, h]);
  return listo ? <Lienzo dibuja={dibuja} preparar={prepara} /> : null;
};
