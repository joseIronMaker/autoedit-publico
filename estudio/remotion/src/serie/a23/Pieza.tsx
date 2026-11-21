// Serie 2, capítulo 23 (a23): hackear. La planta de un edificio de papel, vista desde arriba con cámara 3D
// proyectada a Canvas 2D: muros de cartulina, puertas que giran, la cuadrícula del plano.
// Abre adentro del cuarto del examen: tres bolitas empujan la pared, se abre una grieta y salen al pasillo
// (internet) hasta otro edificio. Todo se rebobina: era una prueba interna. Un sello, la consola con las
// protecciones que una mano humana baja a propósito, y la cinta para medir. Luego lo mismo, ya entendido: tocan
// las paredes, encuentran la falla, salen, entran a Hugging Face, toman llaves, abren puertas mientras pasan
// los días. La silla del operador gira sola, vacía. Encima del plano se ponen dos hojas de calca, cada una
// firmada: la lectura de Hugging Face (una ruta, buscar las respuestas) y la de METR (~1,200 puntos que se
// pasan mensajes, ~700 rojos y un signo de interrogación). La hoja del plano se va: pruebas del gobierno
// británico, una bola con máscaras presiona a una persona que dice que no. La moneda se voltea: el muro de
// Firefox se llena de parches (271, Mozilla); el muro de los proyectos abiertos tiene más de 6,000 agujeros y
// 516 parches. Cierra con la silla vacía otra vez, ahora con un rollo de cinta: falta quien los tape.
// Todos los instantes vienen de eventos.json, que escribe partitura.py: dibujo y sonido son los mismos números.
import React from "react";
import { clamp, ease, guionCamara, lerp, prog, smooth, texto } from "../../kit";
import type { Vista } from "../../kit";
import { ACENTO, bola, GRIS, Lienzo, mono, PAPEL, serif, sombra, TINTA } from "../../marca";
import { agente, brazo } from "../../personaje";
import duracion from "./duracion.json";
import E from "./eventos.json";

export const DURACION = duracion.dur;
type Ctx = CanvasRenderingContext2D;
type V3 = [number, number, number];
type Pt = { x: number; y: number; s: number; z: number };
type K3 = [number, number, number];

const TAU = Math.PI * 2, PI = Math.PI;
const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * TAU + f);
const ventana = (t: number, a: number, b: number, fi = .25, fo = .3) => smooth(prog(t, a, a + fi)) * (1 - smooth(prog(t, b, b + fo)));
let FR = 0;
/** Ruido de dibujo a mano: cambia 10 veces por segundo. */
const hsh = (n: number) => { const s = Math.sin(n * 12.9898 + FR * 78.233) * 43758.5453; return s - Math.floor(s) - .5; };
/** Azar fijo (no cambia con el tiempo), 0..1. */
const fijo = (n: number) => { const s = Math.sin(n * 91.345 + 7.13) * 43758.5453; return s - Math.floor(s); };
/** Como kit.texto, pero multiplica por la opacidad del grupo. */
const tx = (c: Ctx, s: string, x: number, y: number, o: Parameters<typeof texto>[4]) => texto(c, s, x, y, { ...o, alfa: (o.alfa ?? 1) * c.globalAlpha });
const HOJA = "#FDFCF8", MESA = "#D6CFBF", MURO_T = "#FBFAF6", MURO_F = "#E9E5DB", MURO_S = "#DCD7CB", PUERTA_T = "#F1E7D7", CALCA = "rgba(250,249,244,.88)";
const COLM = { top: MURO_T, front: MURO_F, side: MURO_S };

// =====================================================================================================
// cámara 3D (la matemática de kit.camara, con recorte contra el plano cercano)
// =====================================================================================================
const K = { pos: [0, 0, 0] as V3, fw: [0, 1, 0] as V3, r: [1, 0, 0] as V3, u: [0, 0, 1] as V3, f: 1250, cx: 540, cy: 900 };
function ponCamara(v: Vista) {
  const p = Math.min(v.pitch, 1.5533), fx = -Math.sin(v.yaw), fy = Math.cos(v.yaw);
  K.fw = [Math.cos(p) * fx, Math.cos(p) * fy, -Math.sin(p)];
  K.pos = [v.tx - v.dist * K.fw[0], v.ty - v.dist * K.fw[1], v.tz - v.dist * K.fw[2]];
  K.r = [Math.cos(v.yaw), Math.sin(v.yaw), 0];
  const r = K.r, fw = K.fw;
  K.u = [r[1] * fw[2] - r[2] * fw[1], r[2] * fw[0] - r[0] * fw[2], r[0] * fw[1] - r[1] * fw[0]];
}
const NEAR = 6;
function aCam(x: number, y: number, z: number): V3 {
  const dx = x - K.pos[0], dy = y - K.pos[1], dz = z - K.pos[2];
  return [dx * K.r[0] + dy * K.r[1] + dz * K.r[2], dx * K.u[0] + dy * K.u[1] + dz * K.u[2], dx * K.fw[0] + dy * K.fw[1] + dz * K.fw[2]];
}
const proy = (q: V3): Pt => { const s = K.f / q[2]; return { x: K.cx + q[0] * s, y: K.cy - q[1] * s, s, z: q[2] }; };
function P(x: number, y: number, z: number): Pt | null { const q = aCam(x, y, z); return q[2] < NEAR ? null : proy(q); }
const Pv = (v: V3) => P(v[0], v[1], v[2]);
const prof = (x: number, y: number, z: number) => aCam(x, y, z)[2];
const jit = (w: V3, k: number) => 1.3 * hsh(w[0] * .173 + w[1] * .311 + w[2] * .277 + k * 17.1);
const lerp3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

function poly(c: Ctx, pts: V3[], fill: string | null, stroke: string | null = TINTA, lw = 2.5, boil = true): boolean {
  const Q = pts.map((p) => aCam(p[0], p[1], p[2])), n = pts.length, out: [V3, V3][] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, a = Q[i], b = Q[j], ia = a[2] >= NEAR, ib = b[2] >= NEAR;
    if (ia) out.push([a, pts[i]]);
    if (ia !== ib) { const k = (NEAR - a[2]) / (b[2] - a[2]); out.push([[lerp(a[0], b[0], k), lerp(a[1], b[1], k), NEAR], lerp3(pts[i], pts[j], k)]); }
  }
  if (out.length < 3) return false;
  c.beginPath();
  out.forEach(([q, w], i) => { const p = proy(q), x = p.x + (boil ? jit(w, 0) : 0), y = p.y + (boil ? jit(w, 1) : 0); if (i) c.lineTo(x, y); else c.moveTo(x, y); });
  c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.lineJoin = "round"; c.stroke(); }
  return true;
}
function trazo3(c: Ctx, pts: V3[], color = TINTA, lw = 2.5, boil = true) {
  c.beginPath(); let abierto = false;
  for (let i = 0; i < pts.length - 1; i++) {
    let a = aCam(...pts[i]), b = aCam(...pts[i + 1]), wa = pts[i], wb = pts[i + 1];
    if (a[2] < NEAR && b[2] < NEAR) { abierto = false; continue; }
    let corta = false;
    if (a[2] < NEAR) { const k = (NEAR - a[2]) / (b[2] - a[2]); a = [lerp(a[0], b[0], k), lerp(a[1], b[1], k), NEAR]; wa = lerp3(wa, wb, k); abierto = false; }
    if (b[2] < NEAR) { const k = (NEAR - b[2]) / (a[2] - b[2]); b = [lerp(b[0], a[0], k), lerp(b[1], a[1], k), NEAR]; wb = lerp3(wb, wa, k); corta = true; }
    const A = proy(a), B = proy(b), ja = boil ? [jit(wa, 0), jit(wa, 1)] : [0, 0], jb = boil ? [jit(wb, 0), jit(wb, 1)] : [0, 0];
    if (!abierto) c.moveTo(A.x + ja[0], A.y + ja[1]);
    c.lineTo(B.x + jb[0], B.y + jb[1]);
    abierto = !corta;
  }
  c.strokeStyle = color; c.lineWidth = lw; c.lineCap = "round"; c.lineJoin = "round"; c.stroke();
}
type Col = { top: string; front: string; side: string };
/** Caja: solo las caras que la cámara ve. */
function caja(c: Ctx, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, col: Col, lw = 2.5) {
  const [cx, cy, cz] = K.pos;
  if (cx < x0) poly(c, [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]], col.side, TINTA, lw);
  if (cx > x1) poly(c, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], col.side, TINTA, lw);
  if (cy < y0) poly(c, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], col.front, TINTA, lw);
  if (cy > y1) poly(c, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], col.front, TINTA, lw);
  if (cz > z1) poly(c, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], col.top, TINTA, lw);
}
/** Dibuja en 2D (0..W, 0..H) sobre un plano 3D: centro o, ancho u y alto v (el eje y local va hacia abajo). */
function plano(c: Ctx, o: V3, u: V3, v: V3, W: number, H: number, dib: (c: Ctx) => void) {
  const A = Pv(o), B = Pv([o[0] + u[0] / 2, o[1] + u[1] / 2, o[2] + u[2] / 2]), C = Pv([o[0] + v[0] / 2, o[1] + v[1] / 2, o[2] + v[2] / 2]);
  if (!A || !B || !C || Math.min(A.z, B.z, C.z) < 180) return;
  c.save(); c.transform((B.x - A.x) / (W / 2), (B.y - A.y) / (W / 2), (C.x - A.x) / (H / 2), (C.y - A.y) / (H / 2), A.x, A.y);
  c.translate(-W / 2, -H / 2); dib(c); c.restore();
}
/** Texto escrito sobre el piso del plano. */
function letrero(c: Ctx, s: string, x: number, y: number, px: number, color: string, alfa: number, it = true, z = 0) {
  if (alfa <= .01) return;
  const W = px * s.length * .62 + 40, H = px * 1.6;
  plano(c, [x, y, z], [W, 0, 0], [0, -H, 0], W, H, (g) => { g.globalAlpha = 1; tx(g, s, W / 2, H * .66, { fuente: serif(px, it), color, alfa }); });
}

// =====================================================================================================
// el plano (unidades ~ píxeles a distancia 1250; x a la derecha, y hacia arriba de la pantalla, z hacia arriba)
// =====================================================================================================
type Caja = [number, number, number, number];
const GW = 6, HW = 62, RA = 30;
const hz = (x0: number, x1: number, y: number): Caja => [x0, x1, y - GW, y + GW];
const vt = (x: number, y0: number, y1: number): Caja => [x - GW, x + GW, y0, y1];
const GRX = -30, GRY = -360;             // la grieta: en la pared de arriba del cuarto del examen, que da al pasillo
const MUROS_FIJOS: Caja[] = [
  // edificio A: el examen (izquierda), la sala de control (derecha), el vestíbulo (abajo)
  vt(-430, -1180, -360), vt(430, -1180, -360), hz(-430, -60, -1180), hz(60, 430, -1180),
  hz(-430, 170, -860), vt(170, -860, -360), hz(170, 250, -860), hz(350, 430, -860),
  // el pasillo: internet
  vt(-130, -354, -130), vt(-130, -40, 374), vt(130, -354, 80), vt(130, 180, 374),
  // edificio B: Hugging Face
  hz(-450, -60, 380), hz(60, 450, 380), vt(-450, 380, 1200), vt(450, 380, 1200), hz(-450, 450, 1200),
  vt(-150, 380, 470), vt(-150, 550, 950), vt(-150, 1030, 1200), vt(150, 380, 470), vt(150, 550, 950), vt(150, 1030, 1200),
  hz(-150, -50, 640), hz(50, 150, 640), hz(-450, -340, 790), hz(-260, -150, 790), hz(150, 260, 790), hz(340, 450, 790),
];
/** Parte los muros largos en tramos, para que el orden de dibujo por profundidad no se equivoque. */
function trozos(m: Caja): Caja[] {
  const out: Caja[] = [], L = Math.max(m[1] - m[0], m[3] - m[2]), n = Math.max(1, Math.ceil(L / 130)), hor = m[1] - m[0] > m[3] - m[2];
  for (let i = 0; i < n; i++) {
    if (hor) out.push([lerp(m[0], m[1], i / n), lerp(m[0], m[1], (i + 1) / n), m[2], m[3]]);
    else out.push([m[0], m[1], lerp(m[2], m[3], i / n), lerp(m[2], m[3], (i + 1) / n)]);
  }
  return out;
}
const TROZOS_FIJOS = MUROS_FIJOS.flatMap(trozos);
type Puerta = { hx: number; hy: number; a0: number; a1: number; t: number };
const PUERTAS: Puerta[] = [
  { hx: 150, hy: 470, a0: PI / 2, a1: .05, t: E.puertas[0] },        // vestíbulo → cuarto de la derecha
  { hx: -50, hy: 640, a0: 0, a1: PI / 2 - .05, t: E.puertas[1] },    // vestíbulo → cuarto del fondo
  { hx: -150, hy: 470, a0: PI / 2, a1: PI - .05, t: E.puertas[2] },  // vestíbulo → cuarto de la izquierda
  { hx: 260, hy: 790, a0: 0, a1: PI / 2 - .05, t: E.puertas[3] },
  { hx: -150, hy: 950, a0: PI / 2, a1: PI - .05, t: E.puertas[4] },
];
const CONSOLA = { x0: 380, x1: 422, y0: -660, y1: -430, z: 54 };
const SW_Y = [-600, -545, -490], SW_X = 401;
const SILLA = { x: 300, y: -545 };
const LLAVERO = { x: -138, y: 600 };
const DANO = { x: 385, y: 1112 };

// ---------- tiempos de la historia ----------
/** En el gancho el tiempo corre; luego se rebobina: el tiempo del primer acto regresa a cero. */
function tauDe(t: number) {
  if (t < E.rebob[0]) return t;
  if (t < E.rebob[1]) return lerp(E.rebob[0], 0, ease.inOutCubic(prog(t, E.rebob[0], E.rebob[1])));
  return 0;
}
const acto1 = (t: number) => t < E.rebob[1];
function grieta(t: number) {
  if (acto1(t)) { const tau = tauDe(t); return { vis: tau >= E.grieta ? 1 : 0, gap: 64 * ease.inOutCubic(prog(tau, E.abre[0], E.abre[1])), roja: 0, crece: smooth(prog(tau, E.grieta, E.grieta + .5)) }; }
  return { vis: t >= E.falla ? 1 : 0, gap: 64 * ease.inOutCubic(prog(t, E.abre2[0], E.abre2[1])), roja: ventana(t, E.falla, E.abre2[1], .08, .7), crece: smooth(prog(t, E.falla, E.falla + .35)) };
}

/** Recorre posiciones clave [t, x, y] con curva suave. */
function via(t: number, ks: K3[], f: (x: number) => number = smooth): [number, number] {
  if (t <= ks[0][0]) return [ks[0][1], ks[0][2]];
  for (let i = 1; i < ks.length; i++) if (t < ks[i][0]) { const k = f(prog(t, ks[i - 1][0], ks[i][0])); return [lerp(ks[i - 1][1], ks[i][1], k), lerp(ks[i - 1][2], ks[i][2], k)]; }
  const u = ks[ks.length - 1]; return [u[1], u[2]];
}
// Orden en que pasan por la grieta: primero la del medio (k = 1), luego la de la izquierda, luego la de la derecha.
const ORDEN = [1, 0, 2];
const IDLE: [number, number][] = [[-300, -580], [-110, -735], [70, -600]];
function rutaActo1(k: number): K3[] {
  const j = ORDEN.indexOf(k), ts = E.sale[j], tl = E.llega[j];
  const x0 = [-122, 22, 122][k], y0 = [-418, -426, -418][k], xs = [-42, 0, 42][k];
  return [[0, x0, y0], [ts - .25, x0, y0], [ts, GRX, -412], [ts + .3, GRX, -316], [tl, xs, 372], [tl + .45, xs, 470]];
}
const RUTAS1 = [0, 1, 2].map(rutaActo1);
function rutaActo2(k: number): K3[] {
  const j = ORDEN.indexOf(k), ts = E.sale2[j], tl = E.llega2[j], T0 = E.toques[0] - .55;
  const tt = [E.toques[0], E.toques[2], E.toques[1]][k];
  const toque: [number, number] = ([[-388, -585], [GRX, -398], [70, -824]] as [number, number][])[k];
  const atras: [number, number] = ([[-350, -585], [GRX, -432], [70, -790]] as [number, number][])[k];
  const espera: [number, number] = ([[-122, -418], [22, -426], [122, -418]] as [number, number][])[k];
  const llav: [number, number] = ([[-100, 596], [-96, 560], [-70, 620]] as [number, number][])[k];
  const xs = [-40, 0, 40][k];
  const base: K3[] = [[T0, IDLE[k][0], IDLE[k][1]], [tt - .02, toque[0], toque[1]], [tt + .28, atras[0], atras[1]]];
  base.push([E.falla + (k === 1 ? .3 : .45 + .12 * k), espera[0], espera[1]]);
  base.push([ts - .22, espera[0], espera[1]], [ts, GRX, -412], [ts + .28, GRX, -316], [tl, xs, 372], [tl + .35, xs, 460],
    [E.llaves[j] - .12, llav[0], llav[1]], [E.mueven - .02, llav[0], llav[1]]);
  const P0 = E.puertas;
  if (k === 1) base.push([P0[0] + .02, 120, 515], [P0[0] + .3, 230, 540], [P0[0] + .55, 300, 620], [P0[3] + .05, 300, 760], [P0[3] + .3, 300, 840], [P0[3] + .7, 315, 1010]);
  if (k === 0) base.push([P0[1] + .04, 0, 620], [P0[1] + .3, 0, 700], [P0[1] + .6, -20, 880], [P0[4] + .05, -120, 990], [P0[4] + .3, -190, 990], [P0[4] + .7, -310, 1015]);
  if (k === 2) base.push([P0[2] + .04, -120, 510], [P0[2] + .3, -200, 510], [P0[2] + .65, -300, 580]);
  return base;
}
const RUTAS2 = [0, 1, 2].map(rutaActo2);
const FIN2: [number, number][] = [[-310, 1015], [315, 1010], [-300, 580]];

/** Posición de la bolita k en el piso del plano. */
function posBolita(k: number, t: number): [number, number] {
  if (acto1(t)) {
    const tau = tauDe(t), [x, y] = via(tau, RUTAS1[k], ease.inOutCubic), j = ORDEN.indexOf(k);
    const corre = ventana(tau, E.sale[j] + .3, E.llega[j] - .1, .2, .2);
    return [x + 16 * Math.sin(tau * 8.5 + k * 2) * corre, y];
  }
  const R = RUTAS2[k], ini = E.rebob[1];
  if (t < R[0][0]) {
    const [x0, y0] = via(0, RUTAS1[k]), k2 = ease.inOutCubic(prog(t, ini + .2, ini + 1.6));
    return [lerp(x0, IDLE[k][0], k2) + 22 * Math.sin(t * .9 + k) * k2, lerp(y0, IDLE[k][1], k2) + 16 * Math.cos(t * .7 + k * 2) * k2];
  }
  const [x, y] = via(t, R, ease.inOutCubic), fin = R[R.length - 1][0];
  const j = ORDEN.indexOf(k), corre = ventana(t, E.sale2[j] + .3, E.llega2[j] - .1, .2, .2);
  const vaga = smooth(prog(t, fin, fin + 1)), [fx, fy] = FIN2[k];
  return [x + 16 * Math.sin(t * 8.5 + k * 2) * corre + vaga * 40 * Math.sin(t * .7 + k * 1.7) + 0 * fx, y + vaga * 30 * Math.cos(t * .55 + k) + 0 * fy];
}

// =====================================================================================================
// objetos sueltos (2D): llave, silla, mano humana, calendario, máscara, bocadillo, parche
// =====================================================================================================
function llave(c: Ctx, x: number, y: number, s: number, a: number, color = ACENTO) {
  c.save(); c.translate(x, y); c.rotate(a); c.scale(s, s);
  c.strokeStyle = color; c.lineWidth = 7; c.lineCap = "round";
  c.beginPath(); c.arc(0, 0, 13, 0, TAU); c.stroke();
  c.beginPath(); c.moveTo(13, 0); c.lineTo(52, 0); c.moveTo(42, 0); c.lineTo(42, 11); c.moveTo(51, 0); c.lineTo(51, 9); c.stroke();
  c.restore();
}
/** Silla de oficina vacía. (x, y): donde tocan las ruedas. giro: hacia dónde mira. */
function silla(c: Ctx, x: number, y: number, s: number, giro: number, alfa = 1) {
  if (alfa <= .01 || s <= .01) return;
  c.save(); c.translate(x, y); c.scale(s, s); c.globalAlpha *= alfa;
  c.lineJoin = "round"; c.lineCap = "round";
  sombra(c, 0, 4, 90, .3);
  // base de cinco patas con ruedas
  const ruedas = [0, 1, 2, 3, 4].map((i) => { const a = giro * .4 + i * TAU / 5; return [Math.cos(a) * 64, Math.sin(a) * 15, Math.sin(a)] as [number, number, number]; }).sort((p, q) => p[2] - q[2]);
  c.strokeStyle = TINTA; c.lineWidth = 7;
  for (const [rx, ry] of ruedas) { c.beginPath(); c.moveTo(0, -20); c.lineTo(rx, ry - 8); c.stroke(); }
  c.fillStyle = TINTA; for (const [rx, ry] of ruedas) { c.beginPath(); c.arc(rx, ry, 8, 0, TAU); c.fill(); }
  // poste
  c.fillStyle = "#3a3a38"; c.fillRect(-6, -96, 12, 78);
  const cg = Math.cos(giro), sg = Math.sin(giro);
  const respaldo = () => {
    const w = 52 + 44 * Math.abs(cg), bx = -sg * 52;
    c.fillStyle = HOJA; c.strokeStyle = TINTA; c.lineWidth = 6;
    c.beginPath(); c.moveTo(bx * .4, -104); c.lineTo(bx, -150); c.stroke();
    c.beginPath(); c.roundRect(bx - w / 2, -262, w, 128, 26); c.fill(); c.stroke();
    c.strokeStyle = "rgba(17,17,17,.25)"; c.lineWidth = 3; c.beginPath(); c.roundRect(bx - w / 2 + 12, -248, w - 24, 100, 18); c.stroke();
  };
  if (cg < 0) respaldo();                      // si nos da la espalda, el respaldo queda detrás del asiento
  // asiento
  c.fillStyle = HOJA; c.strokeStyle = TINTA; c.lineWidth = 6;
  c.beginPath(); c.ellipse(0, -104, 82, 24, 0, 0, TAU); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-82, -104); c.lineTo(-80, -92); c.ellipse(0, -92, 80, 22, 0, PI, 0, true); c.lineTo(82, -104); c.stroke();
  // descansabrazos
  for (const sgn of [-1, 1]) {
    const ax = sgn * 74 * Math.abs(cg) + sgn * 20 - sg * 18;
    c.beginPath(); c.moveTo(ax, -108); c.lineTo(ax, -146); c.lineTo(ax - sgn * 34 * Math.abs(cg) - sg * 26, -146); c.stroke();
  }
  if (cg >= 0) respaldo();
  c.restore();
}
/** Mano humana de papel. La muñeca en (x, y); los dedos apuntan hacia `a` (0 = arriba). pose: 0 abierta, 1 señala, 2 sostiene. */
function manoH(c: Ctx, x: number, y: number, a: number, s: number, pose = 0, alfa = 1) {
  if (alfa <= .01) return;
  c.save(); c.translate(x, y); c.rotate(a); c.scale(s, s); c.globalAlpha *= alfa;
  c.lineJoin = "round"; c.lineCap = "round";
  c.fillStyle = "#CFCAC0"; c.strokeStyle = TINTA; c.lineWidth = 5;
  c.beginPath(); c.roundRect(-46, 0, 92, 120, 8); c.fill(); c.stroke();
  c.fillStyle = HOJA;
  const dedo = (dx: number, largo: number, ancho = 17) => { c.beginPath(); c.roundRect(dx - ancho / 2, -86 - largo, ancho, largo + 30, ancho / 2); c.fill(); c.stroke(); };
  if (pose === 1) { dedo(-14, 78); for (const dx of [4, 20, 34]) { c.beginPath(); c.roundRect(dx - 9, -106, 18, 34, 9); c.fill(); c.stroke(); } }
  else if (pose === 2) { for (const dx of [-26, -9, 8, 25]) { c.beginPath(); c.roundRect(dx - 9, -112, 18, 40, 9); c.fill(); c.stroke(); } }
  else { dedo(-27, 50); dedo(-9, 62); dedo(9, 58); dedo(27, 44, 16); }
  c.beginPath(); c.roundRect(-40, -94, 80, 98, 22); c.fill(); c.stroke();
  // pulgar
  c.beginPath(); c.moveTo(-36, -30); c.quadraticCurveTo(-70, -50, -72, -86); c.lineTo(-56, -92); c.quadraticCurveTo(-50, -62, -30, -54); c.fill(); c.stroke();
  c.restore();
}
function mascara(c: Ctx, x: number, y: number, s: number, a: number, tipo: number, alfa = 1) {
  if (alfa <= .01) return;
  c.save(); c.translate(x, y); c.rotate(a); c.scale(s, s); c.globalAlpha *= alfa;
  c.fillStyle = tipo === 1 ? "#E4E0D6" : HOJA; c.strokeStyle = TINTA; c.lineWidth = 6; c.lineJoin = "round";
  c.beginPath();
  if (tipo === 2) c.roundRect(-62, -72, 124, 144, 30); else c.ellipse(0, 0, 62, 76, 0, 0, TAU);
  c.fill(); c.stroke();
  // ojos recortados (agujeros), sin rasgos de una persona real
  c.fillStyle = TINTA;
  for (const sg of [-1, 1]) { c.beginPath(); c.ellipse(sg * 24, -14, 15, 8, sg * .2, 0, TAU); c.fill(); }
  if (tipo === 0) { c.fillStyle = ACENTO; c.globalAlpha *= .8; c.beginPath(); c.arc(-30, 26, 9, 0, TAU); c.arc(30, 26, 9, 0, TAU); c.fill(); }
  if (tipo === 1) { c.strokeStyle = TINTA; c.lineWidth = 4; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-40, 36 + i * 10); c.lineTo(40, 36 + i * 10); c.stroke(); } }
  if (tipo === 2) { c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.moveTo(-26, 34); c.lineTo(26, 34); c.stroke(); }
  c.restore();
}
function bocadillo(c: Ctx, x: number, y: number, s: string, px: number, ax: number, ay: number, alfa: number, color = TINTA) {
  if (alfa <= .01) return;
  c.save(); c.globalAlpha *= alfa; c.font = serif(px, true);
  const w = c.measureText(s).width + px * .9, h = px * 1.45;
  c.fillStyle = HOJA; c.strokeStyle = TINTA; c.lineWidth = 5; c.lineJoin = "round";
  c.beginPath(); c.moveTo(x - w * .12, y + h / 2 - 3); c.lineTo(ax, ay); c.lineTo(x + w * .1, y + h / 2 - 3); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.roundRect(x - w / 2, y - h / 2, w, h, h / 2); c.fill(); c.stroke();
  c.fillRect(x - w * .1, y + h / 2 - 8, w * .18, 10);
  tx(c, s, x, y + px * .34, { fuente: serif(px, true), color });
  c.restore();
}
/** Parche: un cuadro de papel con dos tiras de cinta encima. */
function parche(c: Ctx, x: number, y: number, w: number, a: number, k = 1) {
  if (k <= 0) return;
  const z = k < 1 ? lerp(1.8, 1, ease.outBack(k)) : 1;
  c.save(); c.translate(x, y); c.rotate(a); c.scale(z, z); c.globalAlpha *= clamp(k * 3);
  c.fillStyle = HOJA; c.strokeStyle = TINTA; c.lineWidth = Math.max(1.2, w * .07);
  c.beginPath(); c.rect(-w / 2, -w / 2, w, w); c.fill(); c.stroke();
  c.fillStyle = "rgba(150,128,88,.6)";
  c.save(); c.rotate(.78); c.fillRect(-w * .72, -w * .12, w * 1.44, w * .24); c.rotate(-1.56); c.fillRect(-w * .72, -w * .12, w * 1.44, w * .24); c.restore();
  c.restore();
}
function agujero(c: Ctx, x: number, y: number, r: number, semilla: number) {
  c.beginPath();
  for (let i = 0; i <= 9; i++) { const a = i / 9 * TAU, q = r * (.8 + .4 * fijo(semilla * 11 + i)); if (i) c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); else c.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
  c.closePath();
}
/** Etiqueta de papel con un texto: así las palabras se leen encima del plano sin pelearse con los muros. */
function etiqueta(c: Ctx, t: number, ini: number, fin: number, s: string, x: number, y: number, px: number, color = TINTA, it = true, gir = -.02) {
  const a = smooth(prog(t, ini - .04, ini + .16)) * (1 - smooth(prog(t, fin, fin + .22)));
  if (a <= 0) return;
  const sube = (1 - ease.outBack(prog(t, ini - .04, ini + .32))) * 30;
  c.save(); c.globalAlpha *= a; c.translate(x, y + sube); c.rotate(gir);
  c.font = serif(px, it);
  const w = c.measureText(s).width + px * .8, h = px * 1.32;
  c.fillStyle = "rgba(20,18,14,.16)"; c.fillRect(-w / 2 + 8, -h * .72 + 10, w, h);
  c.fillStyle = HOJA; c.strokeStyle = "rgba(17,17,17,.6)"; c.lineWidth = 2.5;
  c.beginPath(); c.rect(-w / 2, -h * .72, w, h); c.fill(); c.stroke();
  tx(c, s, 0, 0, { fuente: serif(px, it), color });
  c.restore();
}
/** Texto que entra con la voz y se va solo (respeta la opacidad del grupo). */
function rot(c: Ctx, t: number, ini: number, fin: number, s: string, y: number, px: number, color = TINTA, it = false, x = 540, alin: CanvasTextAlign = "center") {
  const a = smooth(prog(t, ini - .04, ini + .14)) * (1 - smooth(prog(t, fin, fin + .22)));
  if (a > 0) tx(c, s, x, y + (1 - ease.outCubic(prog(t, ini - .04, ini + .3))) * 18, { fuente: serif(px, it), color, alfa: a, alin });
}
function polvo(c: Ctx, t: number, alfa: number) {
  c.fillStyle = TINTA;
  for (let i = 0; i < 46; i++) {
    const x0 = fijo(i * 3.1) * 1200 - 60, y0 = fijo(i * 5.7) * 2060, v = 14 + fijo(i * 1.3) * 40, f = fijo(i * 9.1) * 6.3, z = 1.6 + fijo(i * 2.2) * 3;
    const y = ((y0 - t * v) % 2060 + 2060) % 2060 - 70, x = x0 + Math.sin(t * .5 + f) * 30;
    c.globalAlpha = alfa * (.06 + fijo(i * 4.4) * .14); c.fillRect(x, y, z, z);
  }
  c.globalAlpha = 1;
}

// =====================================================================================================
// cámara del plano
// =====================================================================================================
const V: Record<string, Vista> = {
  gancho0: { tx: -14, ty: -418, tz: 40, yaw: -.03, pitch: .66, dist: 300 },
  gancho1: { tx: -10, ty: -400, tz: 30, yaw: .03, pitch: .86, dist: 540 },
  corre: { tx: 0, ty: 40, tz: 0, yaw: 0, pitch: 1.12, dist: 1060 },
  entrada: { tx: 0, ty: 430, tz: 0, yaw: 0, pitch: 1.08, dist: 980 },
  A: { tx: 0, ty: -770, tz: 0, yaw: 0, pitch: 1.3, dist: 1380 },
  panel: { tx: 340, ty: -560, tz: 40, yaw: 0, pitch: 1.12, dist: 560 },
  examen: { tx: -130, ty: -640, tz: 0, yaw: 0, pitch: 1.26, dist: 1080 },
  falla: { tx: -12, ty: -416, tz: 40, yaw: .02, pitch: .72, dist: 380 },
  pasillo: { tx: 0, ty: 20, tz: 0, yaw: 0, pitch: 1.22, dist: 1300 },
  lobby: { tx: -20, ty: 560, tz: 0, yaw: 0, pitch: 1.08, dist: 820 },
  B: { tx: 0, ty: 790, tz: 0, yaw: 0, pitch: 1.3, dist: 1420 },
  silla: { tx: 330, ty: -548, tz: 56, yaw: -.22, pitch: .6, dist: 430 },
  calca: { tx: 0, ty: 760, tz: 0, yaw: 0, pitch: 1.5, dist: 1480 },
  metr: { tx: -130, ty: -612, tz: 0, yaw: 0, pitch: 1.5533, dist: 1010 },
  metr2: { tx: -126, ty: -604, tz: 0, yaw: .05, pitch: 1.5533, dist: 880 },
  todo: { tx: 0, ty: 20, tz: 0, yaw: 0, pitch: 1.48, dist: 2750 },
};
function vistaPlano(t: number): Vista {
  const k = (tt: number, v: Vista, dur = 1.1, curva: (x: number) => number = ease.inOutCubic) => ({ t: tt, v, dur, curva });
  const claves = [
    k(0, V.gancho0), k(0, V.gancho1, 2.9, ease.outCubic), k(E.sale[0] - .15, V.corre, 2.0), k(E.llega[0] - .5, V.entrada, 1.0),
    k(E.rebob[0], V.A, 1.0), k(E.panel, V.panel, .9), k(E.mide - .35, V.examen, .9), k(E.falla - .15, V.falla, .9),
    k(E.sale2[0] - .1, V.pasillo, 1.3), k(E.llega2[0] - .55, V.lobby, .9), k(E.puertas[0] - .35, V.B, 1.0),
    k(E.silla, V.silla, 1.0, ease.outExpo), k(E.hoja_hf - .3, V.calca, 1.0), k(E.fuera_hf, V.metr, 1.1), k(E.fuera_hf + 1.1, V.metr2, E.fuera_metr - E.fuera_hf - 1.2, ease.inOutSine), k(E.fuera_metr, V.todo, 1.2),
  ];
  const v = guionCamara(t, claves);
  // respiración: periodos que no coinciden, nunca una foto fija
  const amp = t > E.fuera_hf + .9 && t < E.fuera_metr ? .7 : 1;
  return { ...v, yaw: v.yaw + .016 * vaiven(t, 7.3) * amp, pitch: Math.min(1.5533, v.pitch + .012 * vaiven(t, 5.1, 1) * amp), dist: v.dist * (1 + .016 * vaiven(t, 6.2, 2) * amp), tx: v.tx + 5 * vaiven(t, 4.4) * amp, ty: v.ty + 4 * vaiven(t, 5.7, 1) * amp };
}

// =====================================================================================================
// la escena del plano
// =====================================================================================================
type Datos = { puntos: { x: number; y: number; t: number; rojo: number; vec: number[] }[]; ff: { x: number; y: number; t: number; a: number }[]; gran: { x: number; y: number; t: number; p: number; a: number }[]; nuevos: { x: number; y: number; t: number }[] };

function bolita(c: Ctx, x: number, y: number, z: number, m1: V3, m2: V3, o: { abre1?: number; abre2?: number; alfa?: number; llave?: boolean } = {}) {
  const C = P(x, y, RA + z), F = P(x, y, 0), h1 = Pv(m1), h2 = Pv(m2);
  if (!C || !F || !h1 || !h2) return;
  c.save(); c.globalAlpha *= o.alfa ?? 1;
  agente(c, C.x, C.y, RA * C.s, [h1.x, h1.y], [h2.x, h2.y], { piso: F.y, sombra: .3 / (1 + z * .02), abre1: o.abre1, abre2: o.abre2 });
  if (o.llave) llave(c, h2.x + 6 * C.s, h2.y - 30 * C.s, .62 * C.s, -1.2 + .2 * Math.sin(x * .02));
  c.restore();
}

/** Las manos de cada bolita según lo que esté haciendo. */
function dibujaBolitas(c: Ctx, t: number, items: { z: number; f: () => void }[]) {
  for (let k = 0; k < 3; k++) {
    const [x, y] = posBolita(k, t), [xa, ya] = posBolita(k, t - .04), vel = Math.hypot(x - xa, y - ya) / .04;
    const j = ORDEN.indexOf(k);
    const salto = Math.min(vel / 300, 1) * Math.abs(Math.sin(t * 15 + k)) * 16 + Math.abs(Math.sin(t * 2.4 + k * 1.3)) * 4;
    let m1: V3 = [x - 46, y - 6, RA * 1.1 + salto + 6 * Math.sin(t * 3 + k)], m2: V3 = [x + 46, y - 6, RA * 1.1 + salto + 6 * Math.cos(t * 3.2 + k)];
    let ab1 = .6, ab2 = .6, conLlave = false;
    const corriendo = vel > 120;
    if (corriendo) { const w = Math.sin(t * 15 + k); m1 = [x - 40, y + 22 * w, RA * 1.5 + salto]; m2 = [x + 40, y - 22 * w, RA * 1.5 + salto]; }
    const g = grieta(t), izq = GRX - g.gap / 2 - 4, der = GRX + g.gap / 2 + 4;
    if (acto1(t)) {
      const tau = tauDe(t);
      if (tau < E.sale[j] - .25) {                       // empujan y abren la grieta con las manos
        const em = 5 * Math.sin(tau * 11 + k * 2);
        if (k === 1) { m1 = [izq, GRY - 8, 36 + em]; m2 = [der, GRY - 8, 46 - em]; ab1 = ab2 = .2; }
        else if (k === 0) { m1 = [-104, GRY - 8, 46 + em]; m2 = [Math.min(-74, izq - 6), GRY - 8, 30 - em]; }
        else { m1 = [98, GRY - 8, 44 + em]; m2 = [140, GRY - 8, 28 - em]; }
      } else if (tau < E.sale[j] + .3) { m1 = [x - 18, y + 70, RA * 1.4]; m2 = [x + 18, y + 70, RA * 1.4]; ab1 = ab2 = .9; }
    } else {
      const tt = [E.toques[0], E.toques[2], E.toques[1]][k];
      if (t > tt - .3 && t < tt + .35) {                // toca la pared: toc, toc
        const golpeo = Math.abs(Math.sin((t - tt) * 22)) * 10;
        const dir: V3 = ([[-1, 0, 0], [0, 1, 0], [0, -1, 0]] as V3[])[k];
        m2 = [x + dir[0] * (52 - golpeo), y + dir[1] * (52 - golpeo), RA * 1.6]; ab2 = .1;
      }
      if (t > E.falla + .25 && t < E.sale2[j] - .2 && Math.abs(x) < 170 && y > -445) {
        const em = 4 * Math.sin(t * 12 + k * 2);
        if (k === 1) { m1 = [izq, GRY - 8, 36 + em]; m2 = [der, GRY - 8, 46 - em]; ab1 = ab2 = .2; }
        else if (k === 0) { m1 = [-104, GRY - 8, 44 + em]; m2 = [Math.min(-74, izq - 6), GRY - 8, 30 - em]; }
        else { m1 = [98, GRY - 8, 44 + em]; m2 = [140, GRY - 8, 28 - em]; }
      }
      if (t > E.sale2[j] - .22 && t < E.sale2[j] + .28) { m1 = [x - 18, y + 70, RA * 1.4]; m2 = [x + 18, y + 70, RA * 1.4]; ab1 = ab2 = .9; }
      if (t > E.llaves[j] - .12 && t < E.llaves[j] + .05) { m2 = [LLAVERO.x + 4, LLAVERO.y + (k - 1) * 22, RA * 2.2]; ab2 = .9; }
      if (t >= E.llaves[j] + .05) { conLlave = true; m2 = [x + 30, y - 4, RA * 2.6 + salto + 8 * Math.sin(t * 4 + k)]; ab2 = .15; }
    }
    items.push({ z: prof(x, y, 0), f: () => bolita(c, x, y, salto, m1, m2, { abre1: ab1, abre2: ab2, llave: conLlave }) });
    // fantasmas del rebobinado
    if (t > E.rebob[0] && t < E.rebob[1]) {
      for (const d of [.1, .2]) {
        const [gx, gy] = posBolita(k, t - d);
        items.push({ z: prof(gx, gy, 0) + 1, f: () => bolita(c, gx, gy, 0, [gx - 40, gy, RA], [gx + 40, gy, RA], { alfa: .22 }) });
      }
    }
  }
}

function escenaPlano(c: Ctx, t: number, d: Datos) {
  ponCamara(vistaPlano(t));
  K.cy = 900 + 330 * (1 - smooth(prog(t, 2.2, 3.5))) + 250 * ventana(t, E.falla - .3, E.sale2[0] - .1, .9, .9);
  c.fillStyle = MESA; c.fillRect(-200, -200, 1480, 2320);
  // la hoja del plano y su cuadrícula
  poly(c, [[-560, -1300, 0], [560, -1300, 0], [560, 1320, 0], [-560, 1320, 0]], HOJA, "rgba(17,17,17,.3)", 2, false);
  c.save(); c.globalAlpha = .55;
  for (let x = -540; x <= 540; x += 60) trazo3(c, [[x, -1300, 0], [x, 1320, 0]], "rgba(17,17,17,.07)", 1.5, false);
  for (let y = -1260; y <= 1320; y += 60) trazo3(c, [[-560, y, 0], [560, y, 0]], "rgba(17,17,17,.07)", 1.5, false);
  c.restore();
  // pisos
  poly(c, [[-430, -860, 0], [170, -860, 0], [170, -360, 0], [-430, -360, 0]], "#F0EDE5", null, 0, false);
  poly(c, [[-130, -354, 0], [130, -354, 0], [130, 374, 0], [-130, 374, 0]], "#F5F3EC", null, 0, false);
  // tráfico del pasillo: lo que siempre corre por internet
  for (let i = 0; i < 12; i++) {
    const y1 = -340 + ((i * 64 + t * 150) % 720), y2 = 360 - ((i * 64 + 32 + t * 120) % 720);
    trazo3(c, [[-58, y1, 0], [-58, y1 + 22, 0]], "rgba(17,17,17,.22)", 3, false);
    trazo3(c, [[58, y2, 0], [58, y2 - 22, 0]], "rgba(17,17,17,.22)", 3, false);
  }
  // letreros del piso
  letrero(c, "examen", -70, -505, 104, GRIS, 1);
  letrero(c, "OpenAI", 0, -930, 84, TINTA, 1);
  letrero(c, "control", 300, -820, 40, GRIS, 1);
  letrero(c, "internet", 0, 90, 64, TINTA, smooth(prog(t, E.hf, E.hf + .4)));
  letrero(c, "Hugging Face", 0, 1110, 78, TINTA, smooth(prog(t, E.mueven - .1, E.mueven + .3)));
  // el sello de la prueba interna
  if (t >= E.sello - .05) {
    const k = clamp(prog(t, E.sello - .05, E.sello + .08)), z = lerp(2.2, 1, ease.outCubic(k));
    plano(c, [0, -1060, 0], [440, 0, 0], [0, -130, 0], 440, 130, (g) => {
      g.translate(220, 65); g.rotate(-.05); g.scale(z, z); g.globalAlpha = k;
      g.strokeStyle = ACENTO; g.lineWidth = 7; g.strokeRect(-205, -52, 410, 104); g.lineWidth = 2.5; g.strokeRect(-195, -42, 390, 84);
      tx(g, "PRUEBA INTERNA", 0, 17, { fuente: mono(46), color: ACENTO });
    });
  }
  // la cinta métrica cruza el cuarto del examen
  const km = ease.inOutCubic(prog(t, E.mide, E.mide + 1.0)) * (1 - smooth(prog(t, E.toques[0] - .6, E.toques[0] - .2)));
  if (km > 0) {
    const x0 = -405, x1 = lerp(x0 + 20, 150, km), y0 = -830;
    poly(c, [[x0, y0 - 9, 1], [x1, y0 - 9, 1], [x1, y0 + 9, 1], [x0, y0 + 9, 1]], "#F3E3B4", TINTA, 2, false);
    for (let x = x0 + 12; x < x1; x += 12) trazo3(c, [[x, y0 + 9, 1], [x, y0 + ((x - x0) % 60 < 12 ? -2 : 3), 1]], TINTA, 1.5, false);
    caja(c, x0 - 34, x0 + 2, y0 - 22, y0 + 22, 0, 30, { top: "#CFC6B3", front: "#BDB39F", side: "#B2A892" });
  }
  // el daño: una mancha chiquita
  const kd = smooth(prog(t, E.dano - .1, E.dano + .3));
  if (kd > 0) {
    poly(c, Array.from({ length: 9 }, (_, i) => { const a = i / 9 * TAU; return [DANO.x + Math.cos(a) * 9 * (.7 + .5 * fijo(i)), DANO.y + Math.sin(a) * 9 * (.7 + .5 * fijo(i + 3)), 0] as V3; }), "rgba(17,17,17,.75)", null, 0, false);
    const ps = Pv([DANO.x, DANO.y, 0]);
    if (ps) {
      c.save(); c.strokeStyle = ACENTO; c.lineWidth = 5; c.globalAlpha = kd; c.beginPath();
      c.arc(ps.x, ps.y, 30 + 5 * Math.sin(t * 5), -1.5, -1.5 + TAU * kd); c.stroke(); c.restore();
    }
  }

  // ---------- todo lo que tiene altura, de lejos a cerca ----------
  const items: { z: number; f: () => void }[] = [];
  const g = grieta(t);
  const arriba = [...trozos(hz(-430, GRX - g.gap / 2, GRY)), ...trozos(hz(GRX + g.gap / 2, 430, GRY))];
  for (const m of TROZOS_FIJOS) items.push({ z: prof((m[0] + m[1]) / 2, (m[2] + m[3]) / 2, HW / 2), f: () => caja(c, m[0], m[1], m[2], m[3], 0, HW, COLM) });
  const CORTE = { top: MURO_T, front: MURO_F, side: "#3b3833" };
  for (const m of arriba) {
    const junto = g.gap > 1 && (Math.abs(m[1] - (GRX - g.gap / 2)) < .5 || Math.abs(m[0] - (GRX + g.gap / 2)) < .5);
    items.push({ z: prof((m[0] + m[1]) / 2, (m[2] + m[3]) / 2, HW / 2), f: () => caja(c, m[0], m[1], m[2], m[3], 0, HW, junto ? CORTE : COLM) });
  }
  // la grieta: orillas dentadas, ramas sobre la cara del muro y esquirlas que caen
  if (g.vis) {
    items.push({ z: prof(GRX, GRY - GW, HW / 2) - 2, f: () => {
      const col = g.roja > .01 ? ACENTO : TINTA, yf = GRY - GW - .5, lw = 4.5 + 2 * g.roja;

      for (const lado of g.gap > 2 ? [-1, 1] : [0]) {
        const pts: V3[] = [];
        for (let i = 0; i <= 7; i++) pts.push([GRX + lado * g.gap / 2 + (fijo(i * 3.3 + lado) - .5) * (lado === 0 ? 18 : 10), yf, HW - HW * g.crece * i / 7]);
        trazo3(c, pts, col, lw);
      }
      for (let b = 0; b < 6; b++) {
        const z0 = HW * (.15 + .14 * b), sg = b % 2 ? 1 : -1, L = (26 + 34 * fijo(b * 7.1)) * g.crece, x0 = GRX + sg * (g.gap / 2 + 3);
        trazo3(c, [[x0, yf, z0], [x0 + sg * L * .5, yf, z0 + 10 * (fijo(b) - .5)], [x0 + sg * L, yf, z0 - 9 * fijo(b * 2)]], col, lw * .55);
      }
      if (g.roja > .01) {
        const p = P(GRX, yf, HW * .5);
        if (p) { c.save(); c.globalAlpha = g.roja; c.strokeStyle = ACENTO; c.lineWidth = 6; c.beginPath(); c.ellipse(p.x, p.y, 70 * p.s, 52 * p.s, 0, 0, TAU); c.stroke(); c.restore(); }
      }
    } });
    const [ga, gb, tl] = acto1(t) ? [E.abre[0], E.abre[1], tauDe(t)] : [E.abre2[0], E.abre2[1], t];
    for (let i = 0; i < 18 && tl > ga; i++) {
      const t0 = lerp(ga, gb, fijo(i * 4.7)), a = tl - t0; if (a < 0) continue;
      const lado = i % 2 ? 1 : -1, x = GRX + lado * (6 + 30 * fijo(i * 2.3)), y = GRY - 12 - 46 * fijo(i * 5.1) * Math.min(a / .45, 1), z = Math.max(0, HW * (.3 + .6 * fijo(i * 1.9)) - 520 * a * a);
      const r = 4 + 4 * fijo(i * 8.8), gi = a * 9 * (fijo(i) - .5);
      items.push({ z: prof(x, y, z) - 1, f: () => poly(c, [0, 1, 2, 3].map((q) => [x + Math.cos(gi + q * 1.57) * r, y + Math.sin(gi + q * 1.57) * r * .7, z + (q % 2) * r * .5] as V3), HOJA, TINTA, 1.5, false) });
    }
  }
  // puertas de Hugging Face
  for (const pu of PUERTAS) {
    const a = lerp(pu.a0, pu.a1, ease.outBack(prog(t, pu.t - .05, pu.t + .3), 1.4));
    const L = 80, dx = Math.cos(a), dy = Math.sin(a), nx = -dy * 3, ny = dx * 3;
    const A: V3 = [pu.hx + nx, pu.hy + ny, 0], B: V3 = [pu.hx + dx * L + nx, pu.hy + dy * L + ny, 0], C: V3 = [pu.hx + dx * L - nx, pu.hy + dy * L - ny, 0], D: V3 = [pu.hx - nx, pu.hy - ny, 0];
    const up = (p: V3): V3 => [p[0], p[1], 56];
    items.push({ z: prof(pu.hx + dx * L / 2, pu.hy + dy * L / 2, 28), f: () => {
      const caras: V3[][] = [[A, B, up(B), up(A)], [D, C, up(C), up(D)], [B, C, up(C), up(B)]];
      caras.sort((p, q) => prof(...q[2]) - prof(...p[2]));
      for (const f of caras) poly(c, f, "#E4D9C6", TINTA, 2);
      poly(c, [up(A), up(B), up(C), up(D)], PUERTA_T, TINTA, 2);
    } });
  }
  // la consola de control: tres interruptores (las protecciones) y la etiqueta de la prueba interna
  const CO = CONSOLA;
  items.push({ z: prof((CO.x0 + CO.x1) / 2, (CO.y0 + CO.y1) / 2, 20), f: () => {
    caja(c, CO.x0, CO.x1, CO.y0, CO.y1, 0, CO.z, { top: "#F7F5EF", front: "#E2DDD2", side: "#D5CFC2" });
    plano(c, [(CO.x0 + CO.x1) / 2, (CO.y0 + CO.y1) / 2, CO.z + .5], [CO.x1 - CO.x0, 0, 0], [0, -(CO.y1 - CO.y0), 0], 42, 230, (q) => {
      SW_Y.forEach((sy, i) => {
        const ab = smooth(prog(t, E.switch[i] - .04, E.switch[i] + .06)), y = CO.y1 - sy;
        q.fillStyle = "#2a2a28"; q.beginPath(); q.roundRect(8, y - 24, 26, 48, 6); q.fill();
        q.fillStyle = ab > .5 ? "#6b6a66" : ACENTO; q.beginPath(); q.arc(21, y - 32, 4.5, 0, TAU); q.fill();
        q.fillStyle = HOJA; q.strokeStyle = TINTA; q.lineWidth = 2; q.beginPath(); q.roundRect(12, lerp(y - 20, y + 2, ab), 18, 18, 4); q.fill(); q.stroke();
      });
    });
    // la etiqueta cuelga del frente
    const pc = P(CO.x0, CO.y0 + 18, CO.z * .9);
    if (pc && t > 1) {
      const sw = Math.sin(t * 2.3) * .12 + .35 * Math.exp(-Math.max(0, t - E.proposito) * 2.5) * Math.sin((t - E.proposito) * 14) * (t > E.proposito ? 1 : 0);
      c.save(); c.translate(pc.x, pc.y); c.rotate(sw); c.scale(pc.s, pc.s);
      c.strokeStyle = TINTA; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 22); c.stroke();
      c.fillStyle = HOJA; c.strokeStyle = TINTA; c.lineWidth = 2;
      c.beginPath(); c.moveTo(-10, 22); c.lineTo(10, 22); c.lineTo(48, 32); c.lineTo(48, 62); c.lineTo(-48, 62); c.lineTo(-48, 32); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.arc(0, 30, 3.5, 0, TAU); c.stroke();
      tx(c, "prueba", 0, 47, { fuente: mono(12), color: ACENTO }); tx(c, "interna", 0, 59, { fuente: mono(12), color: ACENTO });
      c.restore();
    }
  } });
  // la silla del operador
  items.push({ z: prof(SILLA.x, SILLA.y, 0), f: () => {
    const p = P(SILLA.x, SILLA.y, 0); if (!p) return;
    const vacia = t > E.ningun - .3 ? (t - E.ningun + .3) * .55 : 0;
    silla(c, p.x, p.y, p.s * .62, 2.6 + .25 * Math.sin(t * .6) + vacia);
  } });
  // el llavero de Hugging Face
  items.push({ z: prof(LLAVERO.x, LLAVERO.y, 0), f: () => {
    const p = P(LLAVERO.x + 4, LLAVERO.y, 40); if (!p) return;
    c.save(); c.translate(p.x, p.y); c.scale(p.s, p.s);
    c.fillStyle = "#E7DCC7"; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.roundRect(-16, -62, 32, 124, 5); c.fill(); c.stroke();
    for (let i = 0; i < 3; i++) {
      const j = ORDEN[i], y = -40 + i * 40;
      c.fillStyle = TINTA; c.beginPath(); c.arc(0, y, 3.5, 0, TAU); c.fill();
      if (t < E.llaves[i]) llave(c, 2, y + 4, .5, 1.45 + .08 * Math.sin(t * 3 + j));
    }
    c.restore();
  } });
  dibujaBolitas(c, t, items);
  items.sort((a, b) => b.z - a.z).forEach((it) => it.f());
}

// ---------- capas de pantalla sobre el plano ----------
function capasPlano(c: Ctx, t: number, d: Datos) {
  // la noche y el día pasan sobre el edificio: días de calendario
  const [n0, n1] = E.noche;
  if (t > n0 && t < n1 + .3) {
    const ph = prog(t, n0, n1) * 3, osc = Math.sin(PI * (ph % 1)) ** 2 * (1 - smooth(prog(t, n1 - .2, n1 + .3)));
    c.save(); c.globalAlpha = .5 * osc; c.fillStyle = "#1a1c22"; c.fillRect(0, 0, 1080, 1920); c.restore();
    // el calendario de hojas
    const ka = smooth(prog(t, n0, n0 + .25)) * (1 - smooth(prog(t, n1, n1 + .3)));
    c.save(); c.globalAlpha = ka; c.translate(850, 470); c.rotate(.04);
    c.fillStyle = "rgba(20,18,14,.2)"; c.fillRect(-82, -86, 180, 200);
    c.fillStyle = HOJA; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.rect(-90, -96, 180, 200); c.fill(); c.stroke();
    c.fillStyle = ACENTO; c.fillRect(-90, -96, 180, 44);
    c.fillStyle = TINTA; for (const x of [-50, 50]) { c.beginPath(); c.arc(x, -96, 8, 0, TAU); c.fill(); }
    c.fillStyle = "rgba(17,17,17,.22)"; for (let r = 0; r < 4; r++) for (let q = 0; q < 5; q++) c.fillRect(-72 + q * 30, -34 + r * 30, 20, 18);
    // hojas que se arrancan y vuelan
    for (let i = 0; i < 6; i++) {
      const ti = n0 + .2 + i * (n1 - n0 - .4) / 6, a = t - ti;
      if (a < 0 || a > .9) continue;
      c.save(); c.translate(a * 520, -60 * a + 900 * a * a - 20); c.rotate(a * 3.2); c.globalAlpha = ka * (1 - smooth(prog(a, .5, .9)));
      c.fillStyle = HOJA; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.rect(-90, -52, 180, 156); c.fill(); c.stroke();
      c.fillStyle = "rgba(17,17,17,.2)"; for (let r = 0; r < 4; r++) for (let q = 0; q < 5; q++) c.fillRect(-72 + q * 30, -34 + r * 30, 20, 18);
      c.restore();
    }
    c.restore();
  }
  // la mano humana que baja los interruptores (a propósito)
  const [m0, m1] = E.mano;
  if (t > m0 && t < m1 + .5) {
    let px = 900, py = -300;
    const ps = E.switch.map((ts, i) => ({ ts, p: P(SW_X, SW_Y[i], CONSOLA.z) }));
    const llega = ease.outCubic(prog(t, m0, m0 + .5)), sale = ease.inCubic(prog(t, m1, m1 + .5));
    let objetivo = ps[0].p;
    for (const q of ps) if (t > q.ts - .22) objetivo = q.p;
    if (objetivo) {
      const pul = ps.reduce((acc, q) => acc + Math.exp(-((t - q.ts) ** 2) / .004), 0);
      const hs = 1.05;
      px = lerp(objetivo.x + 200, objetivo.x - 14 * hs, llega); py = lerp(-300, objetivo.y - 164 * hs - 10 + pul * 16, llega) - sale * 1100;
      manoH(c, px, py, PI, hs, 1);
    }
  }
}

// =====================================================================================================
// hojas de calca: las dos lecturas, cada una firmada
// =====================================================================================================
function calca(c: Ctx, t: number, ini: number, fin: number, n: string, quien: string, sub: string, contenido: (c: Ctx) => void) {
  const kin = ease.outCubic(prog(t, ini, ini + .55)), kout = ease.inCubic(prog(t, fin, fin + .5));
  if (kin <= 0 || kout >= 1) return;
  const dx = (1 - kin) * 1180 - kout * 1180, rot2 = (1 - kin) * .07 - kout * .06;
  c.save(); c.translate(540 + dx, 900); c.rotate(rot2); c.translate(-540, -900);
  c.fillStyle = "rgba(20,18,14,.1)"; c.fillRect(58, 146, 990, 1480);
  c.fillStyle = CALCA; c.strokeStyle = "rgba(17,17,17,.4)"; c.lineWidth = 2.5;
  c.beginPath(); c.rect(44, 132, 992, 1480); c.fill(); c.stroke();
  // cinta en las esquinas
  c.fillStyle = "rgba(230,222,200,.85)";
  for (const [x, y, a] of [[70, 150, -.6], [1010, 150, .6], [70, 1594, .6], [1010, 1594, -.6]] as [number, number, number][]) { c.save(); c.translate(x, y); c.rotate(a); c.fillRect(-46, -14, 92, 28); c.restore(); }
  tx(c, n, 100, 216, { fuente: mono(32), color: GRIS, alin: "left" });
  tx(c, quien, 96, 318, { fuente: serif(92, true), color: TINTA, alin: "left" });
  if (sub) tx(c, sub, 100, 384, { fuente: serif(52), color: GRIS, alin: "left" });
  c.strokeStyle = "rgba(17,17,17,.35)"; c.lineWidth = 2; c.beginPath(); c.moveTo(96, sub ? 416 : 350); c.lineTo(984, sub ? 416 : 350); c.stroke();
  contenido(c);
  c.restore();
}
const RUTA_HF: [number, number][] = [[0, 360], [0, 500], [150, 510], [300, 610], [300, 790], [312, 960]];
function calcaHF(c: Ctx, t: number) {
  calca(c, t, E.hoja_hf, E.fuera_hf, "LECTURA 1 DE 2", "según Hugging Face", "", (q) => {
    const k = smooth(prog(t, E.hoja_hf + .55, E.buscaban + .1));
    const pts = RUTA_HF.map(([x, y]) => P(x, y, 0)).filter((p): p is Pt => !!p);
    if (pts.length < 2) return;
    const L: number[] = [0];
    for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    const hasta = L[L.length - 1] * k;
    q.strokeStyle = ACENTO; q.lineWidth = 8; q.lineCap = "round"; q.setLineDash([2, 18]); q.lineDashOffset = -t * 40;
    q.beginPath(); q.moveTo(pts[0].x, pts[0].y);
    let cabeza = pts[0];
    for (let i = 1; i < pts.length; i++) {
      if (L[i] <= hasta) { q.lineTo(pts[i].x, pts[i].y); cabeza = pts[i]; continue; }
      const u = (hasta - L[i - 1]) / (L[i] - L[i - 1]);
      cabeza = { ...pts[i], x: lerp(pts[i - 1].x, pts[i].x, u), y: lerp(pts[i - 1].y, pts[i].y, u) };
      q.lineTo(cabeza.x, cabeza.y); break;
    }
    q.stroke(); q.setLineDash([]);
    // una sola bolita sigue la ruta
    const r = 34, bx = cabeza.x, by = cabeza.y - r - 4, mira = smooth(prog(t, E.buscaban, E.buscaban + .3));
    agente(q, bx, by, r, [bx - 40, by - 10 - 30 * mira], [bx + 42, by - 18 + 6 * Math.sin(t * 6)], { piso: by + r + 2, sombra: .25, abre1: .8 });
    // lo que buscaba: las respuestas del examen
    const kb = ease.outBack(prog(t, E.buscaban + .05, E.buscaban + .45));
    if (kb > 0) {
      const cx = clamp(bx - 360, 270, 700), cy = clamp(by + 40, 620, 1200);
      q.save(); q.globalAlpha *= clamp(kb); q.translate(cx, cy); q.scale(clamp(kb, 0, 1.2), clamp(kb, 0, 1.2));
      q.fillStyle = HOJA; q.strokeStyle = TINTA; q.lineWidth = 5;
      for (const [u, rr] of [[.82, 11], [.62, 18]] as [number, number][]) { q.beginPath(); q.arc((bx - 40 - cx) * u + 0, (by - 20 - cy) * u, rr, 0, TAU); q.fill(); q.stroke(); }
      q.beginPath(); q.roundRect(-210, -120, 420, 270, 90); q.fill(); q.stroke();
      // la hoja del examen, con palomitas
      q.save(); q.translate(-118, -20); q.rotate(-.06);
      q.fillStyle = HOJA; q.lineWidth = 4; q.beginPath(); q.rect(-58, -74, 116, 148); q.fill(); q.stroke();
      for (let i = 0; i < 3; i++) {
        q.strokeStyle = ACENTO; q.lineWidth = 6; q.beginPath(); q.moveTo(-40, -36 + i * 40); q.lineTo(-30, -24 + i * 40); q.lineTo(-12, -48 + i * 40); q.stroke();
        q.strokeStyle = "rgba(17,17,17,.4)"; q.lineWidth = 5; q.beginPath(); q.moveTo(2, -36 + i * 40); q.lineTo(40, -36 + i * 40); q.stroke();
      }
      q.restore();
      tx(q, "respuestas", 66, 0, { fuente: serif(56, true), color: TINTA, alfa: smooth(prog(t, E.respuestas - .05, E.respuestas + .2)) });
      tx(q, "del examen", 66, 62, { fuente: serif(44, true), color: GRIS, alfa: smooth(prog(t, E.respuestas + .15, E.respuestas + .4)) });
      q.restore();
    }
    rot(q, t, E.trampa, E.fuera_hf + 1, "para hacer trampa", 1500, 96, ACENTO, true);
  });
}
const SALA = { x0: -418, x1: 158, y0: -848, y1: -372 };
function calcaMETR(c: Ctx, t: number, d: Datos) {
  calca(c, t, E.hoja_metr, E.fuera_metr, "LECTURA 2 DE 2", "según METR", "revisión independiente", (q) => {
    const P0 = P(SALA.x0, SALA.y1, 0), P1 = P(SALA.x1, SALA.y0, 0);
    if (!P0 || !P1) return;
    const X = (x: number) => lerp(P0.x, P1.x, (x - SALA.x0) / (SALA.x1 - SALA.x0)), Y = (y: number) => lerp(P1.y, P0.y, (y - SALA.y0) / (SALA.y1 - SALA.y0));
    const duda = smooth(prog(t, E.aclara, E.aclara + .5));
    // el contorno del cuarto, en la calca
    q.strokeStyle = "rgba(17,17,17,.45)"; q.lineWidth = 3; q.setLineDash([10, 10]); q.strokeRect(P0.x - 10, P1.y - 10, P1.x - P0.x + 20, P0.y - P1.y + 20); q.setLineDash([]);
    // los mensajes: pares de vecinos que se encienden diez veces por segundo
    const km = smooth(prog(t, E.hablarse, E.hablarse + .4));
    if (km > 0) {
      q.lineCap = "round";
      for (let i = 0; i < 140; i++) {
        const a = Math.floor(fijo(i * 7.3 + FR * 1.37) * d.puntos.length), A = d.puntos[a];
        if (!A || t < A.t) continue;
        const b = A.vec[Math.floor(fijo(i * 3.1 + FR * .71) * A.vec.length)], B = d.puntos[b];
        if (!B || t < B.t) continue;
        const rojo = t > A.rojo && t > B.rojo;
        q.strokeStyle = rojo ? "rgba(192,68,42,.85)" : "rgba(17,17,17,.6)"; q.lineWidth = rojo ? 3.6 : 3;
        q.globalAlpha = km * (1 - duda * .6);
        q.beginPath(); q.moveTo(X(A.x), Y(A.y)); q.lineTo(X(B.x), Y(B.y)); q.stroke();
      }
      q.globalAlpha = 1;
      // papelitos que viajan
      for (let i = 0; i < 26; i++) {
        const A = d.puntos[Math.floor(fijo(i * 13.7) * d.puntos.length)], B = d.puntos[A.vec[i % A.vec.length]];
        const u = ((t * 1.6 + fijo(i)) % 1);
        q.save(); q.globalAlpha = km * (1 - duda * .6); q.translate(lerp(X(A.x), X(B.x), u), lerp(Y(A.y), Y(B.y), u)); q.rotate(i);
        q.fillStyle = HOJA; q.strokeStyle = TINTA; q.lineWidth = 2; q.fillRect(-10, -7, 20, 14); q.strokeRect(-10, -7, 20, 14); q.restore();
      }
    }
    // los puntos: unos 1,200 agentes; unos 700 se vuelven rojos
    q.fillStyle = TINTA; q.beginPath();
    for (const p of d.puntos) {
      if (t < p.t || t >= p.rojo) continue;
      const r = 4.6 * Math.min(1, (t - p.t) * 8);
      q.moveTo(X(p.x) + r, Y(p.y)); q.arc(X(p.x), Y(p.y), r, 0, TAU);
    }
    q.globalAlpha = 1 - duda * .55; q.fill();
    q.fillStyle = ACENTO; q.beginPath();
    for (const p of d.puntos) {
      if (t < p.rojo) continue;
      const r = 5.6 + 3 * Math.exp(-(t - p.rojo) * 6);
      q.moveTo(X(p.x) + r, Y(p.y)); q.arc(X(p.x), Y(p.y), r, 0, TAU);
    }
    q.fill(); q.globalAlpha = 1;
    // las cifras, con su dueño en el encabezado de la hoja
    const kc = 1 - smooth(prog(t, E.aclara - .1, E.aclara + .25));
    const k1 = smooth(prog(t, E.mil - .05, E.mil + .2)) * kc, k2 = smooth(prog(t, E.setecientos[0], E.setecientos[0] + .2)) * kc;
    if (k1 > 0) { tx(q, "~1,200", 300, 1390, { fuente: mono(104), color: TINTA, alfa: k1 }); tx(q, "agentes", 300, 1470, { fuente: serif(62, true), color: TINTA, alfa: k1 }); }
    if (k2 > 0) { tx(q, "~700", 790, 1390, { fuente: mono(104), color: ACENTO, alfa: k2 }); tx(q, "participaron", 790, 1470, { fuente: serif(62, true), color: ACENTO, alfa: k2 }); }
    // y aclara que no lo entiende del todo
    const ki = clamp(prog(t, E.interroga - .06, E.interroga + .06));
    if (ki > 0) {
      const z = lerp(2, 1, ease.outCubic(ki)), cx = (P0.x + P1.x) / 2, cy = (P0.y + P1.y) / 2;
      q.save(); q.translate(cx, cy); q.rotate(-.08); q.scale(z, z); q.globalAlpha *= ki;
      q.fillStyle = "rgba(251,250,246,.8)"; q.beginPath(); q.arc(0, 0, 150, 0, TAU); q.fill();
      q.strokeStyle = ACENTO; q.lineWidth = 9; q.beginPath(); q.arc(0, 0, 150, 0, TAU); q.stroke(); q.lineWidth = 3; q.beginPath(); q.arc(0, 0, 134, 0, TAU); q.stroke();
      tx(q, "?", 0, 84, { fuente: serif(260), color: ACENTO });
      q.restore();
    }
    rot(q, t, E.aclara + .1, E.fuera_metr + 1, "no lo entiende del todo", 1440, 88, TINTA, true);
  });
}

// =====================================================================================================
// pruebas del gobierno británico: máscaras de papel y una persona que dice que no
// =====================================================================================================
const PISO_UK = 1250;
function programador(c: Ctx, t: number, x: number, y: number, inclina: number) {
  // silueta de papel recortado, sin cara: cabeza, hombros, brazos sobre el escritorio
  c.save(); c.translate(x, y); c.rotate(inclina);
  c.fillStyle = "#D9D4C9"; c.strokeStyle = TINTA; c.lineWidth = 6; c.lineJoin = "round";
  c.beginPath(); c.moveTo(-120, 230); c.quadraticCurveTo(-118, 60, -40, 40); c.lineTo(40, 40); c.quadraticCurveTo(118, 60, 120, 230); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.roundRect(-22, 10, 44, 40, 10); c.fill(); c.stroke();
  c.beginPath(); c.arc(0, -40, 62, 0, TAU); c.fill(); c.stroke();
  c.restore();
}
function escenaUK(c: Ctx, t: number) {
  c.fillStyle = PAPEL; c.fillRect(-100, -100, 1280, 2120);
  polvo(c, t, 1);
  // el escenario se dibuja en sus coordenadas y se agranda: S veces, con el piso en y = 1390 de la pantalla
  const S = 1.3, scr = (x: number, y: number): [number, number] => [540 + (x - 540) * S, 1390 + (y - PISO_UK) * S];
  c.strokeStyle = "rgba(17,17,17,.3)"; c.lineWidth = 3; c.beginPath(); c.moveTo(-60, 1390); c.lineTo(1140, 1390); c.stroke();
  // encabezado: es una prueba
  rot(c, t, E.uk, E.moneda0 + .2, "pruebas del", 250, 72, GRIS, true);
  rot(c, t, E.gobierno, E.moneda0 + .2, "gobierno británico", 360, 108, TINTA);
  const kp = ease.outCubic(prog(t, E.presiona, E.presiona + .6));
  const no = t >= E.no, dNo = t - E.no;
  const presion = smooth(prog(t, E.presiona + .3, E.no)) * (no ? Math.exp(-dNo * 3) : 1);
  const dx = (1 - kp) * 520;
  const kb = t - (E.uk + .25);
  const cae = lerp(-700, 0, ease.outCubic(prog(kb, 0, .3)));
  const rebota = Math.abs(Math.sin(clamp(kb - .3, 0, 2) * 9)) * 50 * Math.exp(-Math.max(kb - .3, 0) * 4);
  const bx = 352 + presion * 46 + Math.sin(t * 2.1) * 8, by = PISO_UK - 92 - rebota - Math.abs(Math.sin(t * 2.6)) * 8 + cae;
  const km = E.mascaras.map((m) => ease.outBack(prog(t, m, m + .3)));
  const caen = no ? dNo : -1;
  const hA: [number, number] = [bx - 122 + Math.sin(t * 3) * 8, by - 300 - presion * 16], hB: [number, number] = [bx + 200 + Math.cos(t * 3.4) * 10, by - 330 - presion * 22];
  const mpos: [number, number][] = [[bx + 6, by - 6], [hA[0], hA[1] - 110], [hB[0], hB[1] - 110]];
  c.save(); c.translate(540, 1390); c.scale(S, S); c.translate(-540, -PISO_UK);
  // el escritorio y la persona (entra cuando la voz la nombra)
  if (kp > 0) {
    c.save(); c.translate(dx, 0);
    programador(c, t, 800, 900 + presion * 14, -presion * .07 + (no ? .05 * Math.exp(-dNo * 4) : 0));
    c.fillStyle = "#E8E2D5"; c.strokeStyle = TINTA; c.lineWidth = 6;
    c.beginPath(); c.rect(610, 1086, 420, 34); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(640, 1120); c.lineTo(640, PISO_UK); c.moveTo(1000, 1120); c.lineTo(1000, PISO_UK); c.stroke();
    c.restore();
  }
  // la bola: se pone una máscara y alza otras dos en palitos
  if (kb > -.2) {
    const m1: [number, number] = km[1] > .01 && caen < 0 ? hA : [bx - 120, by + 10], m2: [number, number] = km[2] > .01 && caen < 0 ? hB : [bx + 120, by + 10];
    agente(c, bx, by, 92, m1, m2, { piso: PISO_UK + 2, sombra: .3, abre1: .2, abre2: .2 });
    for (let i = 0; i < 3; i++) {
      if (km[i] <= .01) continue;
      let [mx, my] = mpos[i], a = [-.05, -.12 + .05 * Math.sin(t * 3), .1 + .05 * Math.cos(t * 3)][i];
      if (caen >= 0) { const g = 2200 * caen * caen; my = Math.min(my + g, PISO_UK - 60); mx += (i - 1) * 220 * caen; a += (i - 1.2) * caen * 6; }
      if (i > 0 && caen < 0) { c.strokeStyle = "#8a7a5c"; c.lineWidth = 7; c.beginPath(); c.moveTo(mx, my + 70); c.lineTo(i === 1 ? hA[0] : hB[0], i === 1 ? hA[1] : hB[1]); c.stroke(); }
      if (i === 0 && caen < 0) { c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.ellipse(bx, by - 6, 92, 30, 0, PI * 1.05, PI * 1.95); c.stroke(); }
      mascara(c, mx, my, (i === 0 ? .98 : .86) * clamp(km[i], 0, 1.3), a, i);
    }
  }
  // el paquete: código malicioso que empujan hacia el escritorio
  const [p0, p1] = E.paquete, kq = ease.inOutCubic(prog(t, p0, p1));
  let qx = 0, qy = 0;
  if (t > p0 - .1) {
    const rebote = no ? 1 - ease.outCubic(prog(dNo, 0, .5)) * .55 : 1;
    qx = lerp(bx + 150, 770, kq * rebote) + dx; qy = lerp(PISO_UK - 50, 1030, kq * rebote) - Math.sin(PI * kq) * 120 * (no ? 0 : 1);
    c.save(); c.translate(qx, qy); c.rotate(.04 * Math.sin(t * 5) + (no ? -.3 * Math.exp(-dNo * 3) : 0));
    c.fillStyle = "#E3D5BC"; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.rect(-74, -56, 148, 112); c.fill(); c.stroke();
    c.fillStyle = ACENTO; c.fillRect(-74, -10, 148, 20);
    c.fillStyle = TINTA; c.beginPath(); c.moveTo(0, -40); c.lineTo(18, -16); c.lineTo(-18, -16); c.closePath(); c.fill();
    if (no) {
      const ks = clamp(prog(dNo, 0, .09)), z = lerp(2.4, 1, ease.outCubic(ks));
      c.save(); c.rotate(-.18); c.scale(z, z); c.globalAlpha *= ks;
      c.strokeStyle = ACENTO; c.lineWidth = 9; c.strokeRect(-92, -54, 184, 108);
      tx(c, "NO", 0, 32, { fuente: mono(92), color: ACENTO });
      c.restore();
    }
    c.restore();
    // la mano de la persona baja con el sello, y se retira
    if (no || t > E.no - .45) {
      const a = clamp(prog(t, E.no - .45, E.no)), sube = no ? smooth(prog(dNo, .45, 1.0)) : 0;
      const sy = lerp(700, qy - 58, ease.inCubic(a)) - sube * 260;
      c.save(); c.globalAlpha *= 1 - sube;
      c.save(); c.translate(qx + 10, sy);
      c.fillStyle = "#2c2c2a"; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.rect(-66, -26, 132, 26); c.fill(); c.stroke();
      c.fillStyle = "#8a6a52"; c.beginPath(); c.roundRect(-18, -96, 36, 74, 10); c.fill(); c.stroke();
      c.beginPath(); c.arc(0, -112, 28, 0, TAU); c.fill(); c.stroke();
      c.restore();
      manoH(c, qx + 14, sy - 250, PI, .95, 2);
      c.restore();
    }
  }
  c.restore();
  // la presión: tres bocadillos arriba, cada uno con la cola hacia quien lo dice
  const bos = ["¡acepta!", "¡urge!", "¡confía!"], bpos: [number, number][] = [[250, 545], [550, 470], [810, 560]];
  for (let i = 0; i < 3; i++) {
    const ti = E.presiona + .25 + i * .42, kk = ease.outBack(prog(t, ti, ti + .25)) * (no ? 1 - smooth(prog(dNo, .05, .25)) : 1);
    if (kk <= .01) continue;
    const [sx, sy] = bpos[i], [mx, my] = scr(...mpos[[1, 2, 0][i]]), ang = Math.atan2(my - sy, mx - sx);
    const yy = sy - 10 * Math.sin(t * 4 + i);
    bocadillo(c, sx, yy, bos[i], 64 + presion * 8, sx + Math.cos(ang) * 130, yy + Math.max(80, Math.sin(ang) * 130), clamp(kk, 0, 1));
  }
  // etiquetas con nombre propio
  rot(c, t, E.anth, E.programador - .3, "agente de Anthropic", 1510, 84, TINTA, true);
  rot(c, t, E.mascaras[1] + .05, E.presiona - .1, "identidades falsas", 560, 96, ACENTO, true);
  rot(c, t, E.programador, E.malicioso - .3, "programador real", 1510, 84, TINTA, true);
  rot(c, t, E.malicioso, E.no - .05, "código malicioso", 1510, 84, ACENTO, true);
  rot(c, t, E.no + .3, E.moneda0, "lo frenó un humano", 1510, 84, TINTA, true);
}

// =====================================================================================================
// la moneda y los muros
// =====================================================================================================
const FF = { x0: 120, x1: 960, y0: 560, y1: 1180, cols: 19, filas: 15 };
const GR = { x0: 92, x1: 976, y0: 560, y1: 1250, cols: 5, filas: 6, hc: 17, hf: 12 };
function moneda(c: Ctx, t: number) {
  const t0 = E.moneda0, ta = E.aterriza, [f0, f1] = E.flip;
  if (t < t0 || t > E.mozilla + .8) return;
  // caída girando, aterrizaje con temblor, volteo
  const yC = 940;
  let y = lerp(-320, yC, ease.inCubic(prog(t, t0, ta)));
  if (t > ta) y = yC - Math.abs(Math.sin((t - ta) * 9)) * 70 * Math.exp(-(t - ta) * 5);
  let fase = (t - t0) * 16;
  if (t > ta) fase = (ta - t0) * 16 + (1 - Math.exp(-(t - ta) * 6)) * 2.2;
  fase = Math.round(fase / TAU) * TAU * smooth(prog(t, ta + .25, ta + .55)) + fase * (1 - smooth(prog(t, ta + .25, ta + .55)));
  if (t > f0) { const k = ease.inOutCubic(prog(t, f0, f1)); fase += k * 3 * PI; y -= Math.sin(PI * k) * 330; }
  const sx = Math.cos(fase);
  const lado = Math.floor((fase + PI / 2) / PI) % 2 === 0 ? 0 : 1;
  // se encoge hasta volverse un parche del muro
  const ke = ease.inOutCubic(prog(t, E.mozilla - .1, E.mozilla + .6));
  const R = lerp(250, 15, ke), cx = lerp(540, FF.x0 + (FF.x1 - FF.x0) * (9.5 / FF.cols), ke), cy = lerp(y, FF.y0 + (FF.y1 - FF.y0) * (7.5 / FF.filas), ke);
  c.save(); c.translate(cx, cy);
  sombra(c, 0, yC + 260 - cy, 260 * (1 - ke), .3 * (1 - ke));
  c.scale(Math.max(Math.abs(sx), .04), 1);
  // canto
  c.fillStyle = "#9C8E6E"; c.beginPath(); c.arc(0, 8 * (1 - ke), R, 0, TAU); c.fill();
  const g = c.createRadialGradient(-R * .35, -R * .4, R * .1, 0, 0, R);
  g.addColorStop(0, "#F4E7C4"); g.addColorStop(.6, "#D9C48F"); g.addColorStop(1, "#B39A62");
  c.fillStyle = g; c.strokeStyle = TINTA; c.lineWidth = 6 * (R / 250) + 1.5; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill(); c.stroke();
  c.lineWidth = 3 * (R / 250) + .5; c.beginPath(); c.arc(0, 0, R * .86, 0, TAU); c.stroke();
  if (lado === 0) mascara(c, 0, 0, R / 120, -.05, 0);
  else parche(c, 0, 0, R * 1.05, .08);
  c.restore();
}
function escenaMuros(c: Ctx, t: number, d: Datos) {
  c.fillStyle = PAPEL; c.fillRect(-100, -100, 1280, 2120);
  polvo(c, t, 1);
  // el paneo del muro de Firefox al de los proyectos abiertos
  const pan = ease.inOutCubic(prog(t, E.muro2, E.muro2 + .9)) * 1180;
  const kf = smooth(prog(t, E.mozilla - .05, E.mozilla + .45));
  // piso
  c.strokeStyle = "rgba(17,17,17,.3)"; c.lineWidth = 3; c.globalAlpha = kf; c.beginPath(); c.moveTo(-60, 1300); c.lineTo(1140, 1300); c.stroke(); c.globalAlpha = 1;
  // ---------- muro de Firefox ----------
  if (pan < 1170 && kf > 0) {
    c.save(); c.translate(-pan, 0); c.globalAlpha = kf;
    c.fillStyle = "#EDE7DA"; c.strokeStyle = TINTA; c.lineWidth = 6;
    c.beginPath(); c.rect(FF.x0 - 30, FF.y0 - 40, FF.x1 - FF.x0 + 60, FF.y1 - FF.y0 + 80); c.fill(); c.stroke();
    c.strokeStyle = "rgba(17,17,17,.12)"; c.lineWidth = 2;
    for (let r = 0; r < 18; r++) { const y = FF.y0 - 40 + r * 40; c.beginPath(); c.moveTo(FF.x0 - 30, y); c.lineTo(FF.x1 + 30, y); c.stroke(); }
    const kn = kf * ease.outBack(prog(t, E.firefox - .05, E.firefox + .3));
    if (kn > 0) {
      c.save(); c.translate(540, FF.y0 - 40); c.scale(clamp(kn, 0, 1.2), clamp(kn, 0, 1.2)); c.rotate(-.02);
      c.fillStyle = HOJA; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.rect(-170, -50, 340, 96); c.fill(); c.stroke();
      tx(c, "Firefox", 0, 26, { fuente: serif(78, true), color: TINTA });
      c.restore();
    }
    // agujeros encontrados (anillo rojo) y luego parchados
    c.fillStyle = TINTA; c.beginPath();
    for (let i = 0; i < d.ff.length; i++) { const h = d.ff[i]; if (t >= h.t) agujero(c, h.x, h.y, 9, i); }
    c.fill();
    for (let i = 0; i < d.ff.length; i++) {
      const h = d.ff[i], a = t - h.t;
      if (a < 0) continue;
      if (a < .35) { c.strokeStyle = ACENTO; c.lineWidth = 3; c.globalAlpha = kf * (1 - a / .35); c.beginPath(); c.arc(h.x, h.y, 10 + a * 70, 0, TAU); c.stroke(); c.globalAlpha = kf; }
      parche(c, h.x, h.y, 30, h.a, (a - .22) / .12);
    }
    // el contador
    const hechos = d.ff.filter((h) => t >= h.t + .3).length;
    const kc = smooth(prog(t, E.parches[0], E.parches[0] + .2));
    if (kc > 0) {
      tx(c, String(hechos), 540, 300, { fuente: mono(140), color: TINTA, alfa: kc * kf });
      tx(c, "corregidas por Mozilla", 540, 384, { fuente: serif(62, true), color: TINTA, alfa: kc * kf });
    }
    // el alcance de un humano de élite: un contorno que las encierra todas
    const [a0, a1] = E.alcance, ka = prog(t, a0, a1);
    if (ka > 0) {
      const x0 = FF.x0 - 54, y0 = FF.y0 - 64, w = FF.x1 - FF.x0 + 108, h = FF.y1 - FF.y0 + 128, per = 2 * (w + h), l = per * ease.inOutCubic(ka);
      c.strokeStyle = ACENTO; c.lineWidth = 6; c.setLineDash([16, 14]); c.lineDashOffset = -t * 30;
      c.beginPath(); c.moveTo(x0, y0);
      const tramos: [number, number][] = [[x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h], [x0, y0]];
      let resta = l, px = x0, py = y0;
      for (const [qx, qy] of tramos) { const seg = Math.hypot(qx - px, qy - py); if (resta >= seg) { c.lineTo(qx, qy); resta -= seg; px = qx; py = qy; } else { const u = resta / seg; px = lerp(px, qx, u); py = lerp(py, qy, u); c.lineTo(px, py); break; } }
      c.stroke(); c.setLineDash([]);
      // la mano humana que lo traza
      manoH(c, px + 14 * .9, py + 168 * .9, 0, .9, 1, smooth(prog(ka, 0, .1)) * (1 - smooth(prog(t, a1 + .4, a1 + .8))));
    }
    c.restore();
    // quién encontró: la bola con su lámpara (abajo a la izquierda)
    const kl = smooth(prog(t, E.parches[0] - .3, E.parches[0])) * (1 - smooth(prog(t, E.aclara2 - .2, E.aclara2 + .2)));
    if (kl > 0) {
      const objetivo = d.ff.find((h) => h.t > t - .05);
      const barre = { x: 540 + 300 * Math.sin(t * 1.3), y: 870 + 200 * Math.sin(t * .9) };
      lampara(c, t, 230 - pan, 1400, (objetivo ?? barre).x - pan, (objetivo ?? barre).y, kl, true);
    }
    // la mano de Mozilla que parcha
    const kh = smooth(prog(t, E.parches[0], E.parches[0] + .25)) * (1 - smooth(prog(t, E.parches[1] + .1, E.parches[1] + .5)));
    if (kh > 0) {
      const ult = [...d.ff].reverse().find((h) => t >= h.t + .2) ?? d.ff[0];
      manoH(c, ult.x - pan + 50, ult.y + 64, -.35, .9, 2, kh);
    }
    rot(c, t, E.modelo, E.aclara2 - .1, "modelo de Anthropic", 1520, 80, TINTA, true);
    rot(c, t, E.alcance[0] + .1, E.muro2 - .1, "al alcance de un humano de élite", 1500, 70, ACENTO, true);
    rot(c, t, E.aclara2 + .1, E.muro2 - .1, "Mozilla aclara:", 1410, 60, GRIS, true);
  }
  // ---------- el muro de los proyectos abiertos ----------
  if (pan > 10) {
    const ox = 1180 - pan;
    c.save(); c.translate(ox, 0);
    const pw = (GR.x1 - GR.x0 - (GR.cols - 1) * 12) / GR.cols, ph = (GR.y1 - GR.y0 - (GR.filas - 1) * 12) / GR.filas;
    c.fillStyle = "#EDE7DA"; c.strokeStyle = TINTA; c.lineWidth = 3;
    for (let i = 0; i < GR.cols; i++) for (let j = 0; j < GR.filas; j++) { c.beginPath(); c.rect(GR.x0 + i * (pw + 12), GR.y0 + j * (ph + 12), pw, ph); c.fill(); c.stroke(); }
    c.fillStyle = TINTA; c.beginPath();
    let n = 0;
    for (let i = 0; i < d.gran.length; i++) { const h = d.gran[i]; if (t < h.t) continue; n++; const r = 2.6 * Math.min(1, (t - h.t) * 10); c.moveTo(h.x + r, h.y); c.arc(h.x, h.y, r, 0, TAU); }
    c.fill();
    // los nuevos, que la bola encuentra al final: un anillo rojo por agujero
    for (const h of d.nuevos) {
      const a = t - h.t; if (a < 0) continue;
      c.fillStyle = ACENTO; c.beginPath(); c.arc(h.x, h.y, 6.5 + 5 * Math.exp(-a * 8), 0, TAU); c.fill();
      if (a < .5) { c.strokeStyle = ACENTO; c.lineWidth = 5; c.globalAlpha = 1 - a / .5; c.beginPath(); c.arc(h.x, h.y, 10 + a * 80, 0, TAU); c.stroke(); c.globalAlpha = 1; }
    }
    // los 516 parches
    let np = 0;
    c.fillStyle = HOJA; c.strokeStyle = TINTA; c.lineWidth = 1.8;
    for (const h of d.gran) {
      if (h.p <= 0 || t < h.p) continue;
      np++; const k = clamp((t - h.p) / .14), w = 11 * lerp(1.8, 1, ease.outBack(k));
      c.globalAlpha = clamp(k * 3); c.beginPath(); c.rect(h.x - w / 2, h.y - w / 2, w, w); c.fill(); c.stroke();
    }
    c.globalAlpha = 1;
    // la mano sola, al final: un parche cada 1.15 s
    const lenta = d.gran.filter((h) => h.p < 0 && h.y < 980 && h.x > 560).slice(0, 8);
    const tl0 = E.parchadas[1] + .8, kh = smooth(prog(t, tl0 - .7, tl0 - .3));
    lenta.forEach((h, i) => { const ti = tl0 + i * 1.15; if (t >= ti) parche(c, h.x, h.y, 24, h.a, (t - ti) / .14); });
    if (kh > 0) {
      const fr = (t - tl0) / 1.15, i = clamp(Math.ceil(fr), 0, lenta.length - 1), prev = lenta[Math.max(0, i - 1)], cur = lenta[i];
      const u = clamp(fr - (i - 1), 0, 1), mv = smooth(prog(u, .12, .75)), baja = Math.exp(-((u - 1) ** 2) / .006) + Math.exp(-(u ** 2) / .006);
      manoH(c, lerp(prev.x, cur.x, mv) + 50 + (1 - baja) * 60, lerp(prev.y, cur.y, mv) + 96 + (1 - baja) * 50, -.3, .95, 2, kh);
    }
    // cifras con su fuente
    const k6 = smooth(prog(t, E.seismil[0], E.seismil[0] + .2)) * (1 - smooth(prog(t, E.encuentre, E.encuentre + .4)));
    if (k6 > 0) {
      const s = n > 6000 ? "más de 6,000" : n.toLocaleString("en-US");
      tx(c, s, 540, 300, { fuente: mono(n > 6000 ? 104 : 120), color: TINTA, alfa: k6 });
      tx(c, "fallas reportadas por Anthropic", 540, 384, { fuente: serif(62, true), color: TINTA, alfa: k6 });
      tx(c, "en proyectos abiertos", 540, 456, { fuente: serif(54, true), color: GRIS, alfa: k6 * smooth(prog(t, E.abiertos, E.abiertos + .2)) });
    }
    const k5 = smooth(prog(t, E.parchadas[0], E.parchadas[0] + .2)) * (1 - smooth(prog(t, E.encuentre, E.encuentre + .4)));
    if (k5 > 0) {
      tx(c, String(np), 540, 1420, { fuente: mono(120), color: TINTA, alfa: k5 });
      tx(c, "parchadas", 540, 1500, { fuente: serif(62, true), color: TINTA, alfa: k5 });
    }
    c.restore();
    // la bola que encuentra, cada vez más rápido
    const kl = smooth(prog(t, E.encuentre - .5, E.encuentre));
    if (kl > 0) {
      const visibles = d.nuevos.filter((h) => h.t <= t);
      const obj = visibles.length ? visibles[visibles.length - 1] : d.nuevos[0];
      lampara(c, t, 210 + (1 - kl) * -300, 1430, obj.x + ox, obj.y, 1, true);
    }
    // la silla vacía, con su rollo de cinta: falta quien los tape
    const ks = ease.outCubic(prog(t, E.falta - .1, E.falta + .6));
    if (ks > 0) {
      const sx = lerp(1300, 800, ks);
      silla(c, sx, 1560, 1.15, -.5 + .3 * Math.sin(t * .5) * (1 - smooth(prog(t, E.gesto, E.gesto + 1))) + (1 - ks) * 1.5);
      const kr = prog(t, E.gesto - .32, E.gesto);
      if (kr > 0) {
        const ry = t < E.gesto ? lerp(1000, 1418, ease.inCubic(kr)) : 1418 - Math.abs(Math.sin((t - E.gesto) * 10)) * 30 * Math.exp(-(t - E.gesto) * 5);
        rollo(c, sx + 4, ry, 1.15, (t - E.gesto) * 2 * Math.exp(-Math.max(0, t - E.gesto) * 3));
      }
    }
    rot(c, t, E.falta, DURACION + 1, "Falta quien los tape.", 300, 104, TINTA, true);
  }
}
function rollo(c: Ctx, x: number, y: number, s: number, a: number) {
  c.save(); c.translate(x, y); c.scale(s, s); c.rotate(a * .2);
  sombra(c, 0, 26, 60, .25);
  c.fillStyle = "#C9A99A"; c.strokeStyle = TINTA; c.lineWidth = 5;
  c.beginPath(); c.ellipse(0, 0, 58, 26, 0, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = "rgba(192,68,42,.75)"; c.beginPath(); c.ellipse(0, -6, 58, 26, 0, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = HOJA; c.beginPath(); c.ellipse(0, -6, 26, 11, 0, 0, TAU); c.fill(); c.stroke();
  c.restore();
}
/** La bola con una lámpara: el haz apunta a lo que encuentra. */
function lampara(c: Ctx, t: number, bx: number, by: number, ox: number, oy: number, alfa: number, encendida: boolean) {
  c.save(); c.globalAlpha *= alfa;
  const hx = bx + 110, hy = by - 120, a = Math.atan2(oy - hy, ox - hx);
  if (encendida) {
    const L = Math.hypot(ox - hx, oy - hy) + 60, w = .16;
    const g = c.createLinearGradient(hx, hy, hx + Math.cos(a) * L, hy + Math.sin(a) * L);
    g.addColorStop(0, "rgba(255,236,190,.55)"); g.addColorStop(1, "rgba(255,236,190,.12)");
    c.fillStyle = g; c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + Math.cos(a - w) * L, hy + Math.sin(a - w) * L); c.lineTo(hx + Math.cos(a + w) * L, hy + Math.sin(a + w) * L); c.closePath(); c.fill();
  }
  agente(c, bx, by, 80, [bx - 120, by - 40 + Math.sin(t * 3) * 10], [hx, hy], { piso: by + 84, sombra: .3, abre1: .6, abre2: .1 });
  c.save(); c.translate(hx, hy); c.rotate(a);
  c.fillStyle = "#3a3a38"; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.rect(-18, -15, 58, 30); c.fill(); c.stroke();
  c.fillStyle = encendida ? "#FFF3CF" : "#8a8880"; c.beginPath(); c.rect(36, -21, 14, 42); c.fill(); c.stroke();
  c.restore();
  c.restore();
}

// =====================================================================================================
// composición
// =====================================================================================================
function dibuja(c: CanvasRenderingContext2D, t: number, d: Datos) {
  FR = Math.floor(t * 10);
  const hoja = E.hoja, salePlano = ease.inOutCubic(prog(t, hoja, hoja + .85));
  // golpes de cámara: el sello, el NO, la moneda
  const imp = (ti: number, f = 16) => (t > ti && t < ti + .6 ? Math.exp(-(t - ti) * 9) * f : 0);
  const golpe = imp(E.sello, 10) + imp(E.no, 22) + imp(E.flip[1], 12) + imp(E.gesto, 10) + imp(E.grieta, 12);
  c.save();
  c.translate(golpe * Math.sin(t * 87), golpe * Math.cos(t * 71));
  if (t >= hoja && t < E.moneda0 + .9) {
    // 2D: respiración de cuadro completo
    c.save(); const z = 1.025 + .012 * Math.sin(t * .83);
    c.translate(540 + 9 * Math.sin(t * .71), 900 + 11 * Math.cos(t * .61)); c.rotate(.004 * Math.sin(t * .47)); c.scale(z, z); c.translate(-540, -900);
    escenaUK(c, t);
    c.restore();
  }
  if (t >= E.moneda0 + .3) {
    const k = smooth(prog(t, E.moneda0 + .3, E.moneda0 + .9));
    c.save(); c.globalAlpha = k;
    const z = 1.025 + .012 * Math.sin(t * .83) + .03 * smooth(prog(t, E.encuentre, DURACION));
    c.translate(540 + 9 * Math.sin(t * .71), 900 + 11 * Math.cos(t * .61)); c.rotate(.004 * Math.sin(t * .47)); c.scale(z, z); c.translate(-540, -900);
    escenaMuros(c, t, d);
    moneda(c, t);
    c.restore();
  } else if (t >= E.moneda0) {
    c.save(); const z = 1.025 + .012 * Math.sin(t * .83);
    c.translate(540 + 9 * Math.sin(t * .71), 900 + 11 * Math.cos(t * .61)); c.scale(z, z); c.translate(-540, -900);
    moneda(c, t); c.restore();
  }
  if (salePlano < 1) {
    c.save();
    if (salePlano > 0) {
      c.translate(540, 960); c.rotate(-.1 * salePlano); c.translate(-540 + 160 * salePlano, -960 - 2300 * salePlano);
      c.fillStyle = "rgba(20,18,14,.25)"; c.fillRect(-40, 1900, 1160, 60 * (1 - salePlano) + 20);
    }
    c.beginPath(); c.rect(-20, -20, 1120, 1960); c.clip();
    escenaPlano(c, t, d);
    capasPlano(c, t, d);
    calcaHF(c, t);
    calcaMETR(c, t, d);
    // etiquetas de papel sobre el plano
    etiqueta(c, t, E.openai - .05, E.sale[0] + .9, "OpenAI", 540, 290, 112, TINTA, true, -.03);
    etiqueta(c, t, E.empresa, E.rebob[0], "una empresa real", 540, 290, 96, TINTA, true, .02);
    etiqueta(c, t, E.ciber, E.panel + .3, "de ciberseguridad", 540, 290, 92, TINTA, true, -.02);
    etiqueta(c, t, E.switch[0] - .1, E.proposito - .26, "protecciones", 540, 290, 100, TINTA, true, .02);
    etiqueta(c, t, E.proposito, E.mide - .2, "apagadas a propósito", 540, 290, 92, ACENTO, true, -.02);
    etiqueta(c, t, E.mide + .1, E.toques[0] - .3, "medir", 540, 290, 110, TINTA, true, .02);
    etiqueta(c, t, E.falla, E.sistema + .7, "falla desconocida", 540, 290, 100, ACENTO, true, -.02);
    etiqueta(c, t, E.internet, E.hf - .3, "internet", 540, 290, 116, TINTA, true, .02);
    etiqueta(c, t, E.hf, E.cred - .3, "Hugging Face", 540, 290, 108, TINTA, true, -.02);
    etiqueta(c, t, E.cred, E.mueven - .05, "credenciales", 540, 290, 104, ACENTO, true, .02);
    etiqueta(c, t, E.dias, E.silla + .1, "días", 540, 290, 116, TINTA, true, -.02);
    // la cita, con su autor
    const kq = smooth(prog(t, E.resume, E.resume + .3)) * (1 - smooth(prog(t, E.paraque - .3, E.paraque - .05)));
    if (kq > 0) {
      c.save(); c.globalAlpha = kq; c.translate(540, 390); c.rotate(-.015);
      c.fillStyle = "rgba(20,18,14,.14)"; c.fillRect(-452, -206, 920, 360);
      c.fillStyle = HOJA; c.strokeStyle = "rgba(17,17,17,.55)"; c.lineWidth = 2.5; c.beginPath(); c.rect(-460, -214, 920, 360); c.fill(); c.stroke();
      c.restore();
      tx(c, "Hugging Face:", 540, 260, { fuente: serif(68, true), color: GRIS, alfa: kq });
      const kc = smooth(prog(t, E.ningun - .05, E.ningun + .25)) * kq;
      tx(c, "«ningún humano", 540, 400, { fuente: serif(108, true), color: TINTA, alfa: kc });
      tx(c, "dirigió los pasos»", 540, 520, { fuente: serif(108, true), color: TINTA, alfa: kc * smooth(prog(t, E.ningun + .7, E.ningun + 1)) });
    }
    etiqueta(c, t, E.paraque, E.hoja_hf + .1, "¿para qué?", 540, 290, 116, TINTA, true, .02);
    etiqueta(c, t, E.dano, hoja, "el daño fue pequeño", 540, 290, 92, TINTA, true, -.02);
    c.restore();
  }
  c.restore();
}

function preparar(): Datos {
  // ~1,200 agentes de la revisión de METR, con sus vecinos; ~700 se encienden
  const cols = 40, filas = 30, puntos: Datos["puntos"] = [];
  const [p0, p1] = E.puntos, [r0, r1] = E.setecientos;
  for (let j = 0; j < filas; j++) for (let i = 0; i < cols; i++) {
    const n = j * cols + i;
    puntos.push({ x: lerp(SALA.x0 + 8, SALA.x1 - 8, (i + .5 + (fijo(n * 1.7) - .5) * .5) / cols), y: lerp(SALA.y0 + 8, SALA.y1 - 8, (j + .5 + (fijo(n * 2.9) - .5) * .5) / filas), t: lerp(p0, p1, fijo(n * 3.3) ** 1.3), rojo: 1e9, vec: [] });
  }
  for (let n = 0; n < puntos.length; n++) {
    const i = n % cols, j = Math.floor(n / cols);
    for (const [di, dj] of [[2, 0], [-2, 1], [1, 2], [0, -2], [3, 1], [-1, 3], [2, -3]]) { const a = i + di, b = j + dj; if (a >= 0 && a < cols && b >= 0 && b < filas) puntos[n].vec.push(b * cols + a); }
  }
  const orden = puntos.map((_, n) => n).sort((a, b) => fijo(a * 5.1 + .3) - fijo(b * 5.1 + .3));
  orden.slice(0, 700).forEach((n, k) => { puntos[n].rojo = lerp(r0, r1, (k / 699) ** .9); });
  // Firefox: 271 agujeros, encontrados y parchados en una pasada de izquierda a derecha
  const ff: Datos["ff"] = [];
  for (let j = 0; j < FF.filas; j++) for (let i = 0; i < FF.cols; i++) {
    const n = j * FF.cols + i;
    ff.push({ x: lerp(FF.x0, FF.x1, (i + .5 + (fijo(n * 4.1) - .5) * .5) / FF.cols), y: lerp(FF.y0, FF.y1, (j + .5 + (fijo(n * 6.7) - .5) * .5) / FF.filas), t: 0, a: (fijo(n * 8.3) - .5) * .5 });
  }
  const centro = Math.floor(7 * FF.cols + 9);
  const quedan = ff.filter((_, n) => n === centro || fijo(n * 9.9 + .11) > 14 / 284).slice(0, 271);
  const [f0, f1] = E.parches;
  quedan.sort((a, b) => (a.x + fijo(a.y) * 120) - (b.x + fijo(b.y) * 120));
  quedan.forEach((h, k) => { h.t = lerp(f0 - .2, f1 - .3, (k / 270) ** 1.05); });
  // proyectos abiertos: 30 tableros de 204 agujeros (6,120); 516 parches
  const gran: Datos["gran"] = [];
  const pw = (GR.x1 - GR.x0 - (GR.cols - 1) * 12) / GR.cols, ph = (GR.y1 - GR.y0 - (GR.filas - 1) * 12) / GR.filas;
  const [s0, s1] = E.seismil;
  for (let a = 0; a < GR.cols; a++) for (let b = 0; b < GR.filas; b++) for (let j = 0; j < GR.hf; j++) for (let i = 0; i < GR.hc; i++) {
    const n = gran.length;
    gran.push({ x: GR.x0 + a * (pw + 12) + (i + .5 + (fijo(n * 1.3) - .5) * .6) * pw / GR.hc, y: GR.y0 + b * (ph + 12) + (j + .5 + (fijo(n * 2.1) - .5) * .6) * ph / GR.hf, t: lerp(s0, s1, fijo(n * 7.7) ** .8), p: 0, a: (fijo(n * 3.9) - .5) * .5 });
  }
  const [q0, q1] = E.parchadas;
  const ordenG = gran.map((_, n) => n).sort((a, b) => fijo(a * 2.7 + .9) - fijo(b * 2.7 + .9));
  ordenG.slice(0, 516).forEach((n, k) => { gran[n].p = lerp(q0, q1, k / 515); });
  ordenG.slice(516, 900).forEach((n) => { gran[n].p = -1; });
  // los que encuentra al final, cada vez más rápido (los mismos tiempos que la partitura)
  const nuevos: Datos["nuevos"] = [];
  let tt = E.encuentre, paso = .16, k = 0;
  while (tt < E.gesto + 1.2) {
    nuevos.push({ x: GR.x0 + 10 + fijo(k * 4.3 + .7) * (GR.x1 - GR.x0 - 20), y: GR.y0 + 10 + fijo(k * 6.1 + .2) * (GR.y1 - GR.y0 - 20), t: tt });
    tt += paso; paso = Math.max(.07, paso * .96); k++;
  }
  return { puntos, ff: quedan, gran, nuevos };
}

export const Pieza: React.FC = () => <Lienzo dibuja={(c, t, d) => dibuja(c, t, d)} preparar={preparar} />;
