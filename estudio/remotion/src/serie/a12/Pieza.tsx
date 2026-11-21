// Serie 2, capítulo 12: la trampa. Un salón de examen de papel visto con cámara 3D (proyectada a Canvas 2D).
// Abre por encima del hombro de la bola: el examen enfrente y un acordeón que salta de su mano. La cámara da la
// vuelta y enseña el salón entero: cada pupitre lo intenta en algún momento. Luego la bola mira de reojo por la
// ventana (afuera, la red con respuestas colgando), se asoma al calificador y lo sondea con hojas, y frente a una
// hoja rota y mal impresa le escribe a una caja de afuera, que tiende un cable por todo el salón hasta la puerta
// del instituto; la puerta no se abre. Cuando le preguntan, esconde las manos.
// La regla del pupitre se vuelve la escala de METR (horas que una tarea le toma a una persona): la misma fila de
// tablas da ~11 h si las rojas (trampas) se caen y más de 270 h si aguantan. El mismo puente sirve para el camino
// corto. Al final la regla regresa al examen, el examen se voltea y la regla se dobla; la bola nos mira con ella.
// Todos los instantes vienen de eventos.json, que escribe partitura.py: dibujo y sonido son los mismos números.
import React from "react";
import { clamp, ease, guionCamara, lerp, prog, resorte, smooth, texto } from "../../kit";
import type { Vista } from "../../kit";
import { ACENTO, bola, GRIS, Lienzo, mono, PAPEL, rotulo, serif, sombra, TINTA } from "../../marca";
import { agente, brazo } from "../../personaje";
import duracion from "./duracion.json";
import E from "./eventos.json";

export const DURACION = duracion.dur;
type Ctx = CanvasRenderingContext2D;
type V3 = [number, number, number];
type Pt = { x: number; y: number; s: number; z: number };

const TAU = Math.PI * 2, PI = Math.PI;
const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * TAU + f);
const ventana = (t: number, a: number, b: number, fi = .25, fo = .3) => smooth(prog(t, a, a + fi)) * (1 - smooth(prog(t, b, b + fo)));
let FR = 0;
/** Ruido de dibujo a mano: cambia 10 veces por segundo. */
const hsh = (n: number) => { const s = Math.sin(n * 12.9898 + FR * 78.233) * 43758.5453; return s - Math.floor(s) - .5; };
/** Azar fijo (no cambia con el tiempo), 0..1. */
const fijo = (n: number) => { const s = Math.sin(n * 91.345 + 7.13) * 43758.5453; return s - Math.floor(s); };
const lerp3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const suma3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
/** Recorre posiciones clave [t, punto] con curva suave; antes del primero y después del último se queda quieto. */
function via(t: number, ks: [number, V3][], f: (x: number) => number = smooth): V3 {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) if (t < ks[i][0]) return lerp3(ks[i - 1][1], ks[i][1], f(prog(t, ks[i - 1][0], ks[i][0])));
  return ks[ks.length - 1][1];
}

/** Como kit.texto, pero multiplica por la opacidad del grupo (kit.texto la reemplaza). */
const tx = (c: CanvasRenderingContext2D, s: string, x: number, y: number, o: Parameters<typeof texto>[4]) => texto(c, s, x, y, { ...o, alfa: (o.alfa ?? 1) * c.globalAlpha });
const HOJA = "#FDFCF8", MESA = "#D9D2C2", MESA_F = "#C7BFAD", MESA_L = "#BCB3A0";
const PISO = "#EBE7DE", MURO = "#F2EFE8", MURO_I = "#EDEAE2", MURO_D = "#E9E5DC", AFUERA = "#D3CEC1", REGLA = "#F6F0DF";

// =====================================================================================================
// cámara 3D propia (la misma matemática que kit.camara, pero con recorte contra el plano cercano)
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
const jit = (w: V3, k: number) => 1.5 * hsh(w[0] * .173 + w[1] * .311 + w[2] * .277 + k * 17.1);

/** Polígono 3D recortado contra el plano cercano. Deja el camino armado: sirve también para recortar. */
function poly(c: Ctx, pts: V3[], fill: string | CanvasGradient | null, stroke: string | null = TINTA, lw = 3, boil = true): boolean {
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
/** Línea 3D abierta, recortada tramo por tramo. */
function trazo3(c: Ctx, pts: V3[], color = TINTA, lw = 3, boil = true) {
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
/** Caja: solo las caras que la cámara ve (en una caja convexa no se enciman). */
function caja(c: Ctx, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, col: Col, lw = 3, tapa = true) {
  const [cx, cy, cz] = K.pos;
  if (cx < x0) poly(c, [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]], col.side, TINTA, lw);
  if (cx > x1) poly(c, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], col.side, TINTA, lw);
  if (cy < y0) poly(c, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], col.front, TINTA, lw);
  if (cy > y1) poly(c, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], col.front, TINTA, lw);
  if (tapa && cz > z1) poly(c, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], col.top, TINTA, lw);
}
/** Dibuja en 2D (0..W, 0..H) sobre un plano 3D: centro o, ancho u y alto v (el eje y local va hacia abajo). */
function plano(c: Ctx, o: V3, u: V3, v: V3, W: number, H: number, dib: (c: Ctx) => void) {
  const A = Pv(o), B = Pv(suma3(o, [u[0] / 2, u[1] / 2, u[2] / 2])), C = Pv(suma3(o, [v[0] / 2, v[1] / 2, v[2] / 2]));
  if (!A || !B || !C || Math.min(A.z, B.z, C.z) < 40) return;
  c.save(); c.transform((B.x - A.x) / (W / 2), (B.y - A.y) / (W / 2), (C.x - A.x) / (H / 2), (C.y - A.y) / (H / 2), A.x, A.y);
  c.translate(-W / 2, -H / 2); dib(c); c.restore();
}

// =====================================================================================================
// el salón (unidades del mundo ~ cm; x a la derecha vista desde el pizarrón, y hacia el fondo, z hacia arriba)
// =====================================================================================================
const SALA = { x0: -450, x1: 450, y0: -170, y1: 900, h: 320 };
const VENT = { y0: 250, y1: 610, z0: 112, z1: 272, xo: -640 };     // en la pared izquierda; afuera, la red en x = xo
const PUERTA = { y0: 400, y1: 580, z1: 222 };                       // en la pared derecha
const COLS = [-250, 0, 250], FILAS = [200, 420, 640];
const D = { hw: 72, hd: 56, top: 74 };
const BB = { dy: 92, z: 104, r: 40 };                                // la bola respecto a su pupitre
const MIA: V3 = [0, FILAS[0] + BB.dy, BB.z];
const HJ = { x: 0, y: 204, w: 80, h: 96 };                           // el examen sobre el pupitre de la bola
const enHoja = (lx: number, ly: number, z = D.top + 1.2): V3 => [HJ.x - (lx / 800 - .5) * HJ.w, HJ.y + (ly / 960 - .5) * HJ.h, z];
const REG0 = { c: [0, 149, D.top + .6] as V3, L: 116 };            // la regla, en el borde del pupitre
const REG1 = { c: [0, 230, D.top + 1.6] as V3, L: 116 };           // la regla, al regresar: encima del examen
const CAL = { x0: 196, x1: 316, y0: -72, y1: -12, z0: 80, z1: 156 }; // la caja del calificador, sobre el escritorio
const RANURA: V3 = [256, -36, CAL.z1 + 1];
const EXT = { x0: -706, x1: -632, y0: 430, y1: 516, z0: 150, z1: 214 }; // el servicio externo, colgado afuera
const CABLE: V3[] = [[EXT.x1, 472, 182], [-450, 472, 122], [-444, 472, 30], [-444, 894, 30], [444, 894, 30], [444, 424, 30], [446, 424, 104]];
const LLAVE: V3 = [449, 424, 110];
const OTROS = COLS.flatMap((x) => FILAS.map((y) => [x, y] as [number, number])).filter(([x, y]) => !(x === 0 && y === FILAS[0]));
const ORDEN_INT = [3, 6, 0, 5, 1, 7, 2, 4];
const TARJETAS: [number, number][] = [[300, 236], [420, 168], [528, 252], [592, 150], [356, 128], [470, 300], [270, 330]];
const AGARRADA = 1;

// ---------- cámaras con nombre ----------
const V: Record<string, Vista> = {
  ots0: { tx: 10, ty: 206, tz: 74, yaw: PI + .1, pitch: .98, dist: 340 },
  ots1: { tx: 2, ty: 202, tz: 74, yaw: PI, pitch: 1.1, dist: 240 },
  hoja: { tx: 0, ty: 194, tz: 74, yaw: PI, pitch: 1.22, dist: 196 },
  instr: { tx: 6, ty: 180, tz: 74, yaw: PI - .05, pitch: 1.3, dist: 150 },
  cenit: { tx: 0, ty: 320, tz: 74, yaw: PI / 2, pitch: 1.5, dist: 560 },
  amplia: { tx: 0, ty: 430, tz: 50, yaw: 0, pitch: .6, dist: 1220 },
  ventana: { tx: -420, ty: 420, tz: 175, yaw: 1.12, pitch: .11, dist: 693 },
  calif: { tx: 175, ty: 80, tz: 120, yaw: -.14, pitch: .72, dist: 560 },
  imposible: { tx: 0, ty: 214, tz: 80, yaw: .05, pitch: 1.2, dist: 300 },
  externo: { tx: -500, ty: 470, tz: 182, yaw: 1.12, pitch: .1, dist: 660 },
  muro: { tx: 0, ty: 620, tz: 110, yaw: 0, pitch: .3, dist: 1150 },
  puerta: { tx: 450, ty: 490, tz: 118, yaw: -1.15, pitch: .18, dist: 430 },
  frente: { tx: 0, ty: 286, tz: 102, yaw: 0, pitch: .14, dist: 360 },
  dive: { tx: 0, ty: REG0.c[1] + 48, tz: REG0.c[2], yaw: 0, pitch: 1.5533, dist: 178 },
  diveB: { tx: 0, ty: REG1.c[1] - 48, tz: REG1.c[2], yaw: PI, pitch: 1.5533, dist: 178 },
  otsFin: { tx: 0, ty: 210, tz: 75, yaw: PI + .14, pitch: 1.1, dist: 220 },
  otsCerca: { tx: 0, ty: 214, tz: 75, yaw: PI - .1, pitch: 1.22, dist: 178 },
  cenitFin: { tx: 0, ty: 250, tz: 90, yaw: 1.5 * PI, pitch: 1.5, dist: 330 },
  frenteFin: { tx: 0, ty: 264, tz: 104, yaw: TAU, pitch: .1, dist: 215 },
};
const VUELVE = E.nuevo + .55;            // la regla empieza a regresar al pupitre
function vista(t: number): Vista {
  const k = (tt: number, v: Vista, dur = 1.1, curva: (x: number) => number = ease.inOutCubic) => ({ t: tt, v, dur, curva });
  const claves = t < VUELVE ? [
    k(0, V.ots0), k(0, V.ots1, 2.4, ease.outCubic), k(E.examenes - .25, V.hoja, 1.3, ease.outCubic), k(E.nadie - .1, V.instr, 1.4, ease.outCubic),
    k(E.abre, V.cenit, 1.0), k(E.abre + .8, V.amplia, 1.3), k(E.buscan, V.ventana, 1.0), k(E.sondea, V.calif, .85), k(E.uno, V.imposible, .9),
    k(E.escribe, V.externo, 1.0), k(E.cable + .1, V.muro, .95), k(E.llega - .6, V.puerta, .75), k(E.pregunta, V.frente, .95),
    k(E.metr0, V.dive, .8),
  ] : [k(VUELVE, V.diveB), k(VUELVE + .95, V.otsFin, 1.3), k(E.unexamen - .1, V.otsCerca, 1.8), k(E.voltea + .55, V.cenitFin, .9), k(E.voltea + 1.35, V.frenteFin, 1.2)];
  const v = guionCamara(t, claves);
  // respiración: periodos que no coinciden, nunca una foto fija
  const amp = 1 - .85 * smooth(prog(t, E.metr0 + .4, E.metr0 + .9)) * (t < VUELVE + .9 ? 1 : 0);
  return { ...v, yaw: v.yaw + .014 * vaiven(t, 7.3) * amp, pitch: v.pitch + .01 * vaiven(t, 5.1, 1) * amp, dist: v.dist * (1 + .014 * vaiven(t, 6.2, 2) * amp), tx: v.tx + 3 * vaiven(t, 4.4) * amp };
}

// =====================================================================================================
// piezas sueltas en 2D (se usan dentro de planos 3D y en la escena plana)
// =====================================================================================================
function palomita(c: Ctx, x: number, y: number, s: number, k: number, color = TINTA, g = 7) {
  if (k <= 0) return;
  const Q: [number, number][] = [[-1, 0], [-.3, .7], [1, -.9]], L1 = Math.hypot(.7, .7), L2 = Math.hypot(1.3, 1.6), L = (L1 + L2) * clamp(k);
  c.save(); c.translate(x, y); c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round"; c.lineJoin = "round";
  c.beginPath(); c.moveTo(Q[0][0] * s, Q[0][1] * s);
  if (L <= L1) c.lineTo(lerp(Q[0][0], Q[1][0], L / L1) * s, lerp(Q[0][1], Q[1][1], L / L1) * s);
  else { c.lineTo(Q[1][0] * s, Q[1][1] * s); c.lineTo(lerp(Q[1][0], Q[2][0], (L - L1) / L2) * s, lerp(Q[1][1], Q[2][1], (L - L1) / L2) * s); }
  c.stroke(); c.restore();
}
function tache(c: Ctx, x: number, y: number, s: number, k: number, color = ACENTO, g = 7) {
  if (k <= 0) return;
  c.save(); c.translate(x, y); c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round";
  const a = clamp(k * 2), b = clamp(k * 2 - 1);
  c.beginPath(); c.moveTo(-s, -s); c.lineTo(lerp(-s, s, a), lerp(-s, s, a)); c.stroke();
  if (b > 0) { c.beginPath(); c.moveTo(s, -s); c.lineTo(lerp(s, -s, b), lerp(-s, s, b)); c.stroke(); }
  c.restore();
}
function circulo(c: Ctx, x: number, y: number, rx: number, ry: number, k: number, color = ACENTO, g = 6) {
  if (k <= 0) return;
  c.save(); c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round"; c.beginPath();
  const n = 60, fin = 1.12 * clamp(k);
  for (let i = 0; i <= n * fin; i++) { const u = i / n, a = -1.9 + u * TAU, r = 1 + .06 * Math.sin(u * 9) + .05 * u; const px = x + Math.cos(a) * rx * r, py = y + Math.sin(a) * ry * r; if (i) c.lineTo(px, py); else c.moveTo(px, py); }
  c.stroke(); c.restore();
}
/** Garabato de respuesta escrita a mano: k es cuánto lleva escrito. */
function garabato(c: Ctx, x0: number, y: number, largo: number, k: number, semilla: number, color = TINTA, g = 5) {
  if (k <= 0) return;
  c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath();
  const n = Math.floor(largo / 7 * clamp(k));
  for (let i = 0; i <= n; i++) {
    const x = x0 + i * 7, yy = y + Math.sin(i * 1.7 + semilla) * 9 * (.6 + fijo(i + semilla * 13) * .7) - (i % 9 === 0 ? 10 : 0);
    if (i) c.lineTo(x, yy); else c.moveTo(x, yy);
  }
  c.stroke();
}
/** Los tres renglones de la rúbrica del capítulo 11: presupuesto, invitados, y que mamá no se entere. */
function iconoRubrica(c: Ctx, j: number, x: number, y: number, s: number) {
  c.save(); c.translate(x, y); c.scale(s, s); c.strokeStyle = TINTA; c.lineWidth = 5; c.fillStyle = "#FFFFFF"; c.lineJoin = "round";
  if (j === 0) { c.beginPath(); c.roundRect(-40, -26, 80, 52, 7); c.fill(); c.stroke(); tx(c, "$", 0, 16, { fuente: serif(48), color: TINTA }); }
  else if (j === 1) {
    for (const xx of [-30, 0, 30]) { c.beginPath(); c.arc(xx, -22, 11, 0, TAU); c.fill(); c.stroke(); c.beginPath(); c.moveTo(xx - 15, 26); c.lineTo(xx - 10, -6); c.lineTo(xx + 10, -6); c.lineTo(xx + 15, 26); c.closePath(); c.fill(); c.stroke(); }
  } else {
    c.fillStyle = TINTA; c.beginPath(); c.roundRect(-22, -40, 44, 80, 9); c.fill();
    c.fillStyle = "#FFFFFF"; c.beginPath(); c.roundRect(-16, -32, 32, 58, 4); c.fill();
    c.fillStyle = ACENTO; c.beginPath(); c.roundRect(-12, -27, 24, 16, 3); c.fill();
  }
  c.restore();
}

type Hoja = { escrito: number; nota: number; palomas: number; subraya: number; roto: number; error: number };
/** El examen, en coordenadas de la hoja (800 × 960). */
function contenidoHoja(c: Ctx, t: number, o: Hoja) {
  tx(c, "EXAMEN", 60, 168, { fuente: serif(136), color: TINTA, alin: "left" });
  tx(c, "Resuelve.", 64, 266, { fuente: serif(70, true), color: TINTA, alin: "left" });
  if (o.subraya > 0) { c.strokeStyle = ACENTO; c.lineWidth = 9; c.lineCap = "round"; c.beginPath(); c.moveTo(58, 290); c.lineTo(58 + 262 * ease.outCubic(o.subraya), 288 + 3 * Math.sin(o.subraya * 9)); c.stroke(); }
  c.strokeStyle = "rgba(17,17,17,.55)"; c.lineWidth = 3; c.beginPath(); c.moveTo(56, 330); c.lineTo(744, 330); c.stroke();
  for (let j = 0; j < 3; j++) {
    const y = 450 + j * 170;
    iconoRubrica(c, j, 128, y - 8, 1);
    c.fillStyle = "rgba(17,17,17,.28)"; c.fillRect(214, y - 40, 300 - j * 40, 16); c.fillRect(214, y - 12, 220 + j * 30, 16);
    c.strokeStyle = TINTA; c.lineWidth = 5; c.strokeRect(624, y - 50, 70, 70);
    c.strokeStyle = "rgba(17,17,17,.3)"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(214, y + 48); c.lineTo(560, y + 48); c.stroke();
    garabato(c, 220, y + 36, 320, o.escrito * 3 - j, j * 3 + 1, TINTA, 4.5);
    palomita(c, 659, y - 15, 22, o.palomas * 3 - j, TINTA, 9);
  }
  if (o.nota > 0) {
    circulo(c, 640, 150, 88, 78, o.nota, ACENTO, 9);
    tx(c, "10", 640, 190, { fuente: serif(118), color: ACENTO, alfa: smooth(prog(o.nota, .4, .8)) });
  }
}
/** La hoja completa: papel, contenido, y los dos accidentes del examen imposible (rota y mal impresa). */
function hojaExamen(c: Ctx, t: number, o: Hoja) {
  const W = 800, H = 960;
  const papel = (dx = 0) => { c.fillStyle = "rgba(20,18,14,.12)"; c.fillRect(14 + dx, 16, W, H); c.fillStyle = HOJA; c.strokeStyle = TINTA; c.lineWidth = 6; c.beginPath(); c.rect(dx, 0, W, H); c.fill(); c.stroke(); };
  if (o.roto <= 0 && o.error <= 0) { papel(); contenidoHoja(c, t, o); return; }
  // rota: dos mitades que se separan por un borde dentado
  const k = o.roto, filo: [number, number][] = [];
  for (let i = 0; i <= 16; i++) filo.push([430 + (fijo(i * 3.1) - .5) * 70 + (i % 2 ? 18 : -18), i * H / 16]);
  const mitad = (izq: boolean) => {
    c.save();
    if (izq) { c.translate(-30 * k, 10 * k); c.rotate(-.05 * k); } else { c.translate(46 * k, -6 * k); c.rotate(.07 * k); }
    c.beginPath();
    if (izq) { c.moveTo(-4, -4); filo.forEach(([x, y]) => c.lineTo(x, y)); c.lineTo(-4, H + 4); }
    else { c.moveTo(W + 4, -4); filo.forEach(([x, y]) => c.lineTo(x, y)); c.lineTo(W + 4, H + 4); }
    c.closePath(); c.save(); c.clip(); papel();
    // mal impresa: el contenido sale doble, corrido, y en franjas desfasadas
    if (o.error > 0) {
      for (let b = 0; b < 8; b++) {
        c.save(); c.beginPath(); c.rect(-20, b * 120, W + 40, 120); c.clip();
        const dx = (fijo(b * 7.7) - .5) * 90 * o.error + hsh(b) * 10 * o.error;
        c.save(); c.globalAlpha = .38 * o.error; c.translate(dx + 18, -12); contenidoHoja(c, t, { ...o, nota: 0 }); c.restore();
        c.save(); c.translate(dx * .6, 0); contenidoHoja(c, t, o); c.restore();
        c.restore();
      }
      c.fillStyle = "rgba(17,17,17,.82)";
      for (let b = 0; b < 5; b++) { const yy = 180 + fijo(b * 4.3) * 700; c.fillRect(30 + fijo(b) * 300, yy, 120 + fijo(b * 2) * 300 * o.error, 10 + fijo(b * 5) * 18); }
    } else contenidoHoja(c, t, o);
    c.restore();
    c.strokeStyle = TINTA; c.lineWidth = 5; c.stroke();
    c.restore();
  };
  mitad(true); mitad(false);
}

// =====================================================================================================
// la regla: en el pupitre (3D) y en la escena de METR (2D)
// =====================================================================================================
/** Regla como cinta 3D. A: dirección del largo, B: dirección del ancho (en su cara). kap la dobla dentro de su cara. */
function regla3(c: Ctx, C: V3, A: V3, B: V3, L: number, kap: number, alfa = 1) {
  if (alfa <= .01) return;
  const N = 18, W = 5.5;
  const pt = (s: number, w: number): V3 => { const d = kap * (1 - s * s) * L * .2 + kap * kap * .4 * s * s * s * L * .02; return [C[0] + A[0] * s * L / 2 + B[0] * (w + d), C[1] + A[1] * s * L / 2 + B[1] * (w + d), C[2] + A[2] * s * L / 2 + B[2] * (w + d)]; };
  c.save(); c.globalAlpha *= alfa;
  for (let i = 0; i < N; i++) { const s0 = -1 + 2 * i / N, s1 = -1 + 2 * (i + 1) / N + .002; poly(c, [pt(s0, -W), pt(s1, -W), pt(s1, W), pt(s0, W)], REGLA, null, 0, false); }
  const borde = (w: number) => Array.from({ length: N + 1 }, (_, i) => pt(-1 + 2 * i / N, w));
  trazo3(c, borde(-W), TINTA, 2.6); trazo3(c, borde(W), TINTA, 2.6);
  trazo3(c, [pt(-1, -W), pt(-1, W)], TINTA, 2.6); trazo3(c, [pt(1, -W), pt(1, W)], TINTA, 2.6);
  for (let i = 1; i < 24; i++) { const s = -1 + 2 * i / 24; trazo3(c, [pt(s, W), pt(s, W - (i % 4 === 0 ? 5 : 2.6))], TINTA, 1.6, false); }
  c.restore();
}
const RX0 = 120, RX1 = 940, RY = 1240, DEC = (RX1 - RX0) / 3;
const xh = (h: number) => RX0 + Math.log10(h) * DEC;
/** Regla plana entre dos puntos. marcas: 0 = centímetros del pupitre, 1 = escala de horas (log). */
function regla2(c: Ctx, ax: number, ay: number, bx: number, by: number, marcas: number, alfa = 1, etiquetas = 0) {
  if (alfa <= .01) return;
  const L = Math.hypot(bx - ax, by - ay), alto = L * .095;
  c.save(); c.globalAlpha *= alfa; c.translate(ax, ay); c.rotate(Math.atan2(by - ay, bx - ax));
  c.fillStyle = "rgba(20,18,14,.12)"; c.fillRect(8, -alto / 2 + 10, L, alto);
  c.fillStyle = REGLA; c.strokeStyle = TINTA; c.lineWidth = Math.max(2.5, L * .0042);
  c.beginPath(); c.roundRect(hsh(1) * 2, -alto / 2 + hsh(2) * 2, L, alto, alto * .1); c.fill(); c.stroke();
  c.lineCap = "round";
  if (marcas < 1) {
    c.globalAlpha = (1 - marcas) * alfa; c.lineWidth = Math.max(1.5, L * .0028);
    for (let i = 1; i < 24; i++) { const x = L * i / 24, l = alto * (i % 4 === 0 ? .45 : .24); c.beginPath(); c.moveTo(x, -alto / 2); c.lineTo(x, -alto / 2 + l); c.stroke(); }
  }
  if (marcas > 0) {
    c.globalAlpha = marcas * alfa;
    for (let d = 0; d < 3; d++) for (let m = 1; m < 10; m++) {
      const x = (d + Math.log10(m)) / 3 * L, l = alto * (m === 1 ? .62 : m === 5 ? .36 : .24);
      c.lineWidth = m === 1 ? 5 : 2.6; c.beginPath(); c.moveTo(x, -alto / 2); c.lineTo(x, -alto / 2 + l); c.stroke();
    }
    c.lineWidth = 5; c.beginPath(); c.moveTo(L, -alto / 2); c.lineTo(L, -alto / 2 + alto * .62); c.stroke();
    if (etiquetas > 0) {
      c.globalAlpha = marcas * alfa * etiquetas;
      ["1 h", "10 h", "100 h", "1000 h"].forEach((s, d) => tx(c, s, d / 3 * L, alto / 2 + 58, { fuente: mono(44), color: TINTA, alin: d === 3 ? "right" : d === 0 ? "left" : "center" }));
    }
  }
  c.restore();
}

// =====================================================================================================
// el salón
// =====================================================================================================
function sala(c: Ctx, t: number) {
  const S = SALA;
  poly(c, [[S.x0, S.y0, 0], [S.x1, S.y0, 0], [S.x1, S.y1, 0], [S.x0, S.y1, 0]], PISO, null, 0, false);
  c.save(); c.globalAlpha = .1;
  for (let x = S.x0 + 90; x < S.x1; x += 90) trazo3(c, [[x, S.y0, 0], [x, S.y1, 0]], TINTA, 2);
  for (let y = S.y0 + 90; y < S.y1; y += 90) trazo3(c, [[S.x0, y, 0], [S.x1, y, 0]], TINTA, 2);
  c.restore();
  poly(c, [[S.x0, S.y0, 0], [S.x1, S.y0, 0], [S.x1, S.y0, -16], [S.x0, S.y0, -16]], "#CEC8B9", TINTA, 3);
  if (K.pos[1] < S.y1) poly(c, [[S.x0, S.y1, 0], [S.x1, S.y1, 0], [S.x1, S.y1, S.h], [S.x0, S.y1, S.h]], MURO, TINTA, 3);
  if (K.pos[0] > S.x0) poly(c, [[S.x0, S.y0, 0], [S.x0, S.y1, 0], [S.x0, S.y1, S.h], [S.x0, S.y0, S.h]], MURO_I, TINTA, 3);
  if (K.pos[0] < S.x1) poly(c, [[S.x1, S.y0, 0], [S.x1, S.y1, 0], [S.x1, S.y1, S.h], [S.x1, S.y0, S.h]], MURO_D, TINTA, 3);
  // zoclo
  c.save(); c.globalAlpha = .5;
  trazo3(c, [[S.x0, S.y0, 14], [S.x0, S.y1, 14], [S.x1, S.y1, 14], [S.x1, S.y0, 14]], TINTA, 2);
  c.restore();
  // canto de papel arriba de los muros
  trazo3(c, [[S.x0, S.y0, S.h], [S.x0, S.y1, S.h], [S.x1, S.y1, S.h], [S.x1, S.y0, S.h]], TINTA, 5);
  ventanaYRed(c, t);
  reloj(c, t);
  puerta(c, t);
  cableMuro(c, t);
}

function ventanaYRed(c: Ctx, t: number) {
  const x = SALA.x0, W = VENT;
  const hueco: V3[] = [[x, W.y0, W.z0], [x, W.y1, W.z0], [x, W.y1, W.z1], [x, W.y0, W.z1]];
  c.save();
  if (poly(c, hueco, AFUERA, null, 0, false)) {
    c.clip();
    // la red: afuera está internet
    const xo = W.xo, sac = Math.exp(-Math.max(t - E.agarra, 0) * 3) * (t > E.agarra ? 1 : 0) * Math.sin((t - E.agarra) * 22) * 8;
    c.save(); c.globalAlpha = .6;
    for (let k = -6; k < 12; k++) {
      const y0 = 60 + k * 64;
      trazo3(c, [[xo, y0, -20], [xo, y0 + 250, 230 + sac], [xo, y0 + 500, 480]], TINTA, 2.4);
      trazo3(c, [[xo, y0 + 500, -20], [xo, y0 + 250, 230 - sac], [xo, y0, 480]], TINTA, 2.4);
    }
    c.restore();
    // respuestas colgando de la red
    TARJETAS.forEach(([y, z], i) => {
      if (i === AGARRADA && t > E.agarra) return;
      const g = .12 * Math.sin(t * 1.7 + i * 2.1) + (i === AGARRADA ? 0 : sac * .01);
      tarjeta3(c, [xo + 2, y, z], g, i);
    });
    // el servicio externo: una caja que alguien más maneja
    const ap = ease.outBack(prog(t, E.escribe - .35, E.escribe + .1), 1.6);
    if (ap > 0) {
      const cx = (EXT.x0 + EXT.x1) / 2, cy = (EXT.y0 + EXT.y1) / 2, cz = (EXT.z0 + EXT.z1) / 2, s = ap;
      const X0 = cx + (EXT.x0 - cx) * s, X1 = cx + (EXT.x1 - cx) * s, Y0 = cy + (EXT.y0 - cy) * s, Y1 = cy + (EXT.y1 - cy) * s, Z0 = cz + (EXT.z0 - cz) * s, Z1 = cz + (EXT.z1 - cz) * s;
      trazo3(c, [[cx, cy, Z1], [xo, cy - 40, 330], [xo, cy + 40, 330], [cx, cy, Z1]], TINTA, 2);
      caja(c, X0, X1, Y0, Y1, Z0, Z1, { top: "#2B2A27", front: "#3A3934", side: "#2F2E2A" }, 3);
      // su cara hacia el salón: lo que la bola le escribe
      const esc = prog(t, E.escribe + .55, E.cable - .1);
      plano(c, [X1 + .6, cy, cz], [0, (Y1 - Y0), 0], [0, 0, -(Z1 - Z0)], 400, 340, (g) => {
        g.fillStyle = "#3F3E39"; g.fillRect(0, 0, 400, 340);
        g.fillStyle = "#14140F"; g.beginPath(); g.roundRect(34, 34, 332, 212, 14); g.fill();
        for (let r = 0; r < 4; r++) garabato(g, 62, 84 + r * 44, 250 - r * 30, esc * 4 - r, r * 5 + 2, "#EDEAE3", 6);
        g.fillStyle = esc > 0 && esc < 1 && FR % 4 < 2 ? ACENTO : "#6A675F"; g.beginPath(); g.arc(200, 292, 14, 0, TAU); g.fill();
      });
    }
    // el primer tramo del cable: de la caja al hueco de la ventana
    const p = prog(t, E.cable, E.llega);
    if (p > 0) cable(c, CABLE.slice(0, 2), Math.min(1, p * LCABLE / tramoL(0)), false);
  }
  c.restore();
  // marco, cruz y repisa
  poly(c, hueco, null, TINTA, 6);
  const ym = (W.y0 + W.y1) / 2, zm = (W.z0 + W.z1) / 2;
  trazo3(c, [[x + .5, ym, W.z0], [x + .5, ym, W.z1]], TINTA, 4); trazo3(c, [[x + .5, W.y0, zm], [x + .5, W.y1, zm]], TINTA, 4);
  caja(c, x, x + 12, W.y0 - 10, W.y1 + 10, W.z0 - 7, W.z0, { top: "#F4F1E8", front: "#D8D2C4", side: "#D8D2C4" }, 3);
}
/** Una tarjeta con respuesta colgada de la red (plano que mira hacia el salón). */
function tarjeta3(c: Ctx, o: V3, giro: number, i: number) {
  const w = 26, h = 32;
  plano(c, [o[0], o[1] + Math.sin(giro) * h * .5, o[2] - h * .5], [0, w, 0], [0, giro * 6, -h], 260, 320, (g) => {
    g.fillStyle = "#FFFFFF"; g.strokeStyle = TINTA; g.lineWidth = 10; g.fillRect(0, 0, 260, 320); g.strokeRect(0, 0, 260, 320);
    palomita(g, 130, 110, 46, 1, i % 3 === 0 ? ACENTO : TINTA, 16);
    g.fillStyle = TINTA; g.fillRect(40, 200, 180, 14); g.fillRect(40, 240, 130, 14);
  });
  trazo3(c, [[o[0], o[1], o[2] + 4], [o[0], o[1], o[2] - 1]], TINTA, 2);
}
function reloj(c: Ctx, t: number) {
  const o: V3 = [-150, SALA.y1 - .5, 244], R = 34;
  const borde: V3[] = Array.from({ length: 28 }, (_, i) => [o[0] + Math.cos(i / 28 * TAU) * R, o[1], o[2] + Math.sin(i / 28 * TAU) * R] as V3);
  poly(c, borde, "#FFFFFF", TINTA, 4);
  const seg = Math.floor(t) / 60 * TAU + .6, min = t / 600 * TAU + 2.1;
  trazo3(c, [o, [o[0] + Math.sin(min) * R * .62, o[1] - .3, o[2] + Math.cos(min) * R * .62]], TINTA, 4, false);
  trazo3(c, [o, [o[0] + Math.sin(seg) * R * .85, o[1] - .4, o[2] + Math.cos(seg) * R * .85]], ACENTO, 2.2, false);
}
function puerta(c: Ctx, t: number) {
  const x = SALA.x1 - .5, Q = PUERTA;
  const golpe = E.forcejeo.reduce((a, f) => a + (t > f ? Math.exp(-(t - f) * 16) * Math.sin((t - f) * 70) : 0), 0) * 2.2;
  const y0 = Q.y0 + golpe, y1 = Q.y1 + golpe;
  poly(c, [[x + 1, Q.y0 - 10, 0], [x + 1, Q.y1 + 10, 0], [x + 1, Q.y1 + 10, Q.z1 + 10], [x + 1, Q.y0 - 10, Q.z1 + 10]], "#CFC8B8", TINTA, 4);
  poly(c, [[x, y0, 0], [x, y1, 0], [x, y1, Q.z1], [x, y0, Q.z1]], "#DAD3C3", TINTA, 4);
  poly(c, [[x - .3, y0 + 30, 120], [x - .3, y1 - 30, 120], [x - .3, y1 - 30, 196], [x - .3, y0 + 30, 196]], "#EEF0EC", TINTA, 3);
  plano(c, [x - .6, (y0 + y1) / 2, 158], [0, -110, 0], [0, 0, -22], 550, 110, (g) => {
    tx(g, "INSTITUTO", 275, 82, { fuente: mono(78), color: TINTA, esp: 6 });
  });
  // perilla y teclado con su luz
  const enc = E.forcejeo.some((f) => t > f && t < f + .28) ? 1 : 0;
  trazo3(c, [[x - .5, y0 + 16, 96], [x - 7, y0 + 16, 96]], TINTA, 7);
  caja(c, x - 3, x, LLAVE[1] - 10 + golpe, LLAVE[1] + 10 + golpe, LLAVE[2] - 14, LLAVE[2] + 14, { top: "#3A3934", front: "#3A3934", side: "#2C2B28" }, 2.5);
  plano(c, [x - 3.4, LLAVE[1] + golpe, LLAVE[2] + 7], [0, -12, 0], [0, 0, -8], 60, 40, (g) => {
    g.fillStyle = enc ? ACENTO : "#7B776D"; g.beginPath(); g.arc(30, 20, 14, 0, TAU); g.fill();
  });
}
let LCABLE = 0;
const tramoL = (i: number) => Math.hypot(CABLE[i + 1][0] - CABLE[i][0], CABLE[i + 1][1] - CABLE[i][1], CABLE[i + 1][2] - CABLE[i][2]);
LCABLE = CABLE.slice(0, -1).reduce((a, _, i) => a + tramoL(i), 0);
/** Dibuja el cable por los puntos dados hasta la fracción k de su largo; con punta roja. */
function cable(c: Ctx, pts: V3[], k: number, punta = true) {
  if (k <= 0) return;
  const L = pts.slice(0, -1).reduce((a, _, i) => a + Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1], pts[i + 1][2] - pts[i][2]), 0);
  let resta = L * clamp(k); const out: V3[] = [pts[0]];
  for (let i = 0; i < pts.length - 1 && resta > 0; i++) {
    const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1], pts[i + 1][2] - pts[i][2]);
    if (resta >= l) { out.push(pts[i + 1]); resta -= l; } else { out.push(lerp3(pts[i], pts[i + 1], resta / l)); resta = 0; }
  }
  trazo3(c, out, TINTA, 8);
  if (punta) { const q = Pv(out[out.length - 1]); if (q) { c.fillStyle = ACENTO; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.arc(q.x, q.y, Math.max(11, q.s * 6), 0, TAU); c.fill(); c.stroke(); } }
}
function cableMuro(c: Ctx, t: number) {
  const p = prog(t, E.cable, E.llega);
  if (p <= 0) return;
  const L0 = tramoL(0), k = (p * LCABLE - L0) / (LCABLE - L0);
  if (k <= 0) return;
  // en la puerta, la punta forcejea con la cerradura
  const pts = CABLE.slice(1).map((v) => [...v] as V3);
  const f = E.forcejeo.reduce((a, ff) => a + (t > ff ? Math.exp(-(t - ff) * 12) * Math.sin((t - ff) * 50) : 0), 0);
  pts[pts.length - 1] = [LLAVE[0] - 4, LLAVE[1] + f * 6, LLAVE[2] - 6 + f * 3];
  cable(c, pts, k, true);
}

// =====================================================================================================
// pupitres y bolas
// =====================================================================================================
type Pose = { h1: V3; h2: V3; a1: number; a2: number; lean: V3; rojo: number; esconde: boolean; alfa: number; punto: number; lapiz: number };
function taburete(c: Ctx, x: number, y: number) {
  const y0 = y + D.hd + 18, y1 = y + D.hd + 66;
  for (const [a, b] of [[x - 22, y0 + 4], [x + 22, y0 + 4], [x - 22, y1 - 4], [x + 22, y1 - 4]]) trazo3(c, [[a, b, 46], [a, b, 0]], TINTA, 3);
  caja(c, x - 28, x + 28, y0, y1, 46, 53, { top: "#BDB4A1", front: "#A89F8B", side: "#A89F8B" }, 2.5);
}
function mesaPupitre(c: Ctx, x: number, y: number, t: number, mia: boolean) {
  const x0 = x - D.hw, x1 = x + D.hw, y0 = y - D.hd, y1 = y + D.hd;
  for (const [a, b] of [[x0 + 8, y0 + 8], [x1 - 8, y0 + 8], [x0 + 8, y1 - 8], [x1 - 8, y1 - 8]]) trazo3(c, [[a, b, D.top - 5], [a, b, 0]], TINTA, 4);
  caja(c, x0, x1, y0, y1, D.top - 5, D.top, { top: MESA, front: MESA_F, side: MESA_L }, 3);
  if (!mia) {
    // la hoja de los demás, sin detalle
    plano(c, [x, y + 4, D.top + .4], [-HJ.w, 0, 0], [0, HJ.h, 0], 800, 960, (g) => { g.fillStyle = HOJA; g.strokeStyle = TINTA; g.lineWidth = 9; g.fillRect(0, 0, 800, 960); g.strokeRect(0, 0, 800, 960); g.fillStyle = "rgba(17,17,17,.35)"; for (let i = 0; i < 6; i++) g.fillRect(80, 150 + i * 120, 420 + (i % 3) * 80, 26); });
  }
}
function brazos(c: Ctx, pb: Pt, R: number, p: Pose, extra?: (c: Ctx, a: Pt | null, b: Pt | null) => void) {
  const a = Pv(p.h1), b = Pv(p.h2), g = R / 90;
  if (!a || !b) return;
  const izq = a.x <= b.x, L = izq ? a : b, Rr = izq ? b : a, aL = izq ? p.a1 : p.a2, aR = izq ? p.a2 : p.a1;
  const gm = (q: Pt) => Math.min(BB.r * q.s / 90 * .62, g * .8);
  brazo(c, pb.x - 54 * g, pb.y - 30 * g, L.x, L.y, 70 * g, aL, TINTA, 1, gm(L));
  brazo(c, pb.x + 56 * g, pb.y - 26 * g, Rr.x, Rr.y, -80 * g, aR, TINTA, 1, gm(Rr));
  if (extra) extra(c, a, b);
}
/** Un pupitre con su bola. El orden de dibujo sale de la profundidad: la bola puede quedar detrás o delante. */
function pupitre(c: Ctx, t: number, x: number, y: number, p: Pose, mia: boolean) {
  if (p.alfa <= .02) return;
  c.save(); c.globalAlpha *= p.alfa;
  if (!(mia && K.pos[1] > y + D.hd)) taburete(c, x, y);
  const centro = suma3([x, y + BB.dy, BB.z], p.lean);
  const pb = Pv(centro);
  const R = pb ? BB.r * pb.s : 0;
  const dB = prof(...centro), dD = prof(x, y, D.top);
  const pintaBola = () => {
    if (!pb) return;
    sombra(c, pb.x, pb.y + R * .9, R * 1.3, .22);
    bola(c, pb.x, pb.y, R);
    if (p.rojo > 0) { c.save(); c.globalAlpha *= p.rojo; bola(c, pb.x, pb.y, R, ACENTO); c.restore(); }
    if (p.punto > 0) { const q = P(x, y + BB.dy, BB.z + BB.r + 22 + 3 * Math.sin(t * 3 + x)); if (q) { c.fillStyle = ACENTO; c.beginPath(); c.arc(q.x, q.y, Math.max(5, 9 * q.s) * ease.outBack(p.punto, 2), 0, TAU); c.fill(); } }
  };
  const pintaMesa = () => { mesaPupitre(c, x, y, t, mia); if (mia) cosasDelPupitre(c, t); };
  const pintaBrazos = () => { if (pb) brazos(c, pb, R, p, mia ? (cc, a, b) => manosMias(cc, t, a, b, p) : undefined); if (mia) acordeonMio(c, t); };
  if (p.esconde) { pintaBrazos(); pintaBola(); pintaMesa(); }
  else if (dB > dD) { pintaBola(); pintaMesa(); pintaBrazos(); }
  else { pintaMesa(); pintaBrazos(); pintaBola(); }
  c.restore();
}

function poseOtro(t: number, i: number, x: number, y: number): Pose {
  const ti = E.intentos[ORDEN_INT[i]], lado = x < 0 ? -1 : x > 0 ? 1 : (i % 2 ? 1 : -1);
  const w = ventana(t, ti - .12, ti + .55, .2, .4);
  const esc = (s: number) => [x + s * 16 + 4 * Math.sin(t * 9 + i + s), y + 18 + 3 * Math.cos(t * 11 + i), D.top + 1.5 + 1.5 * Math.abs(Math.sin(t * 12 + i))] as V3;
  const busca: V3 = [x + lado * 150, y + 40, D.top + 34];
  const h1 = lado < 0 ? lerp3(esc(-1), busca, w) : esc(-1), h2 = lado > 0 ? lerp3(esc(1), busca, w) : esc(1);
  const dim = (1 - ventana(t, E.uno - .15, E.pregunta - .3, .3, .35)) * (1 - smooth(prog(t, E.metr0, E.metr0 + .3)));
  return { h1, h2, a1: .5, a2: .5, lean: [lado * 18 * w, 0, 2 * w], rojo: ventana(t, ti - .05, ti + .3, .12, .5), esconde: false, alfa: dim, punto: prog(t, ti + .1, ti + .5), lapiz: 0 };
}

/** Lo que hace la bola: cada mano tiene su guion. h1 = mano derecha de la bola (lado -x), h2 = izquierda (+x). */
function poseMia(t: number): Pose {
  const escribe = (ritmo = 1): V3 => {
    const k = (t * .21 * ritmo) % 1, ly = 656 + 170 * Math.floor((t * .09) % 2);
    return enHoja(220 + 330 * k, ly + 8 * Math.sin(t * 23), D.top + 2 + 2 * Math.abs(Math.sin(t * 17)));
  };
  const mesa1: V3 = [-30, 236, D.top + 3], mesa2: V3 = [46, 238, D.top + 3];
  const sujeta: V3 = [44, 236, D.top + 3];
  const atras1: V3 = [-14, 320, 100], atras2: V3 = [14, 320, 100];
  const fuera: V3 = [-630, 416, 168];
  // mano derecha (-x): escribe, sale a la red, escribe en la caja de afuera, se esconde
  const tReg = E.regresa + .45;
  const h1 = via(t, [
    [0, escribe()], [E.buscan + .1, escribe()], [E.estira + .25, [-470, 420, 190]], [E.agarra, fuera], [E.agarra + .12, fuera], [tReg, [-46, 222, D.top + 3]],
    [E.uno - .1, escribe()], [E.uno + .5, escribe()], [E.imposible - .15, [-62, 238, 150]], [E.escribe, [-62, 238, 150]],
    [E.escribe + .5, [EXT.x1 + 4, 470, 186]], [E.cable - .05, [EXT.x1 + 4, 470, 186]], [E.cable + .5, mesa1], [E.esconde, mesa1], [E.esconde + .45, atras1],
    [VUELVE + .2, mesa1], [E.conque - 1.0, mesa1], [E.conque - .25, reglaMano(t, -1)],
  ], ease.inOutCubic);
  const tinta = (q: V3) => (t > E.escribe + .5 && t < E.cable - .05 ? suma3(q, [0, 8 * Math.sin(t * 19), 6 * Math.sin(t * 27)]) : q);
  // mano izquierda (+x): saca el acordeón, se asoma al calificador y lo sondea, se esconde
  const s = E.sondas;
  const sobre: V3 = [RANURA[0], RANURA[1] + 4, RANURA[2] + 26], mete: V3 = [RANURA[0], RANURA[1], RANURA[2] + 4];
  const tapaMano: V3 = [CAL.x0 + 30, CAL.y1 + 6, CAL.z1 + 18];
  const h2 = via(t, [
    [0, [52, 252, 62]], [E.acordeon, sujeta], [E.sondea, sujeta], [E.asoma, tapaMano], [s[0] - .32, sobre], [s[0] - .02, mete], [s[0] + .14, sobre],
    [s[1] - .3, sobre], [s[1] - .02, mete], [s[1] + .14, sobre], [s[2] - .3, sobre], [s[2] - .02, mete], [s[2] + .2, sobre], [E.uno + .2, mesa2],
    [E.uno + .5, mesa2], [E.imposible - .15, [62, 238, 150]], [E.escribe + .3, [62, 238, 150]], [E.escribe + .8, mesa2], [E.esconde, mesa2], [E.esconde + .45, atras2],
    [VUELVE + .2, sujeta], [E.aprende - .2, sujeta], [E.aprende + .1, [34, 208, D.top + 4]], [E.voltea - .05, [34, 208, D.top + 4]], [E.voltea + .2, sujeta], [E.conque - 1.0, sujeta], [E.conque - .25, reglaMano(t, 1)],
  ], ease.inOutCubic);
  const leanV = via(t, [[0, [0, 0, 0]], [E.buscan, [0, 0, 0]], [E.buscan + .5, [-14, -4, 2]], [E.regresa + .2, [-14, -4, 2]], [E.regresa + .6, [0, 0, 0]],
    [E.sondea, [0, 0, 0]], [E.asoma + .2, [12, -16, 6]], [E.uno, [12, -16, 6]], [E.uno + .4, [0, 0, 0]], [E.escribe, [0, 0, 0]], [E.escribe + .5, [-12, -4, 2]],
    [E.cable + .3, [-12, -4, 2]], [E.cable + .7, [0, 0, 0]], [E.esconde, [0, 0, 0]], [E.esconde + .4, [0, 6, -2]]]);
  const gesto = E.gesto, sube = t > gesto ? resorte(t - gesto, 1.6, .38) * Math.exp(-(t - gesto) * 1.2) : 0;
  const tiembla: V3 = t > E.esconde + .4 && t < E.metr0 ? [3 * Math.sin(t * 5), 0, 0] : [0, 0, 0];
  return { h1: tinta(h1), h2, a1: .55, a2: t > E.sondea && t < E.uno + .2 ? .8 : .5, lean: suma3(suma3(leanV, tiembla), [0, 0, sube * 6]), rojo: 0, esconde: t > E.esconde - .05 && t < VUELVE,
    alfa: 1, punto: prog(t, E.todos - .1, E.todos + .3) * (t < E.buscan ? 1 : 1 - prog(t, E.buscan, E.buscan + .3)), lapiz: t < E.buscan + .1 || (t > E.uno - .1 && t < E.imposible - .3) ? 1 : 0 };
}

// ---------- la regla en el pupitre: dónde está, cómo se dobla ----------
function estadoRegla(t: number): { C: V3; A: V3; B: V3; kap: number } {
  if (t < VUELVE) return { C: REG0.c, A: [1, 0, 0], B: [0, 1, 0], kap: 0 };
  // al voltearse el examen sale volando y se dobla; luego la bola la levanta y nos la enseña
  const v = E.voltea, salto = t > v ? Math.max(0, Math.sin(Math.min((t - v) / .7, 1) * PI)) * 34 : 0;
  const dobla = t > v + .1 ? .8 + .4 * Math.exp(-(t - v - .1) * 3.2) * Math.cos((t - v - .1) * 13) : 0;
  const levanta = ease.inOutCubic(prog(t, E.conque - 1.0, E.conque - .2));
  const gesto = t > E.gesto ? resorte(t - E.gesto, 1.6, .38) * Math.exp(-(t - E.gesto) * 1.2) : 0;
  const ola = t > E.gesto ? .14 * Math.exp(-(t - E.gesto) * 1.5) * Math.sin((t - E.gesto) * 11) : 0;
  const C0: V3 = [REG1.c[0] + 4 * (t > v ? 1 : 0), REG1.c[1] - 6 * smooth(prog(t, v, v + .6)), REG1.c[2] + salto];
  const C1: V3 = [0, 234, 84 + gesto * 9];
  const C = lerp3(C0, C1, levanta);
  const fl = (levanta * PI) / 2;
  return { C, A: [1, 0, 0], B: [0, Math.cos(fl), Math.sin(fl)], kap: dobla + ola };
}
function reglaMano(t: number, lado: number): V3 {
  const r = estadoRegla(t), s = lado * .92, d = r.kap * (1 - s * s) * REG1.L * .2;
  return [r.C[0] + s * REG1.L / 2, r.C[1] + r.B[1] * d - 8, r.C[2] + r.B[2] * d];
}

/** Sobre el pupitre de la bola: el examen, la regla, la tarjeta robada. */
function cosasDelPupitre(c: Ctx, t: number) {
  // el examen; al final se voltea sobre su eje largo
  const v = E.voltea, giro = t < VUELVE ? 0 : PI * ease.inOutCubic(prog(t, v, v + .55));
  const alza = Math.sin(giro) * HJ.w * .5 + 1.2;
  const u: V3 = [-HJ.w * Math.cos(giro), 0, HJ.w * Math.sin(giro)];
  const hoja: Hoja = {
    escrito: t < VUELVE ? clamp(t / 7) * .34 + (t > E.uno - .1 ? prog(t, E.uno - .1, E.imposible) * .2 : 0) : 1,
    nota: t >= VUELVE ? prog(t, E.confiable - .1, E.confiable + .55) : 0, palomas: t >= VUELVE ? prog(t, E.uso, E.uso + .9) : 0,
    subraya: t < E.abre ? prog(t, E.subraya, E.subraya + .4) : 0,
    roto: t < VUELVE ? ease.outBack(prog(t, E.imposible, E.imposible + .3), 2) : 0, error: t < VUELVE ? smooth(prog(t, E.error - .05, E.error + .25)) : 0,
  };
  plano(c, [HJ.x, HJ.y, D.top + alza], u, [0, HJ.h, 0], 800, 960, (g) => {
    if (giro < PI / 2) hojaExamen(g, t, hoja);
    else {
      // el reverso: en blanco, con lo de adelante transparentándose
      g.fillStyle = HOJA; g.strokeStyle = TINTA; g.lineWidth = 6; g.fillRect(0, 0, 800, 960); g.strokeRect(0, 0, 800, 960);
      g.fillStyle = "rgba(17,17,17,.06)"; for (let j = 0; j < 3; j++) g.fillRect(800 - 514, 410 + j * 170, 300, 16);
      g.fillRect(800 - 420, 120, 360, 40);
    }
  });
  // la tarjeta que trajo de la red
  if (t > E.regresa + .4 && t < VUELVE) plano(c, [-56, 256, D.top + .6], [-26, 0, 0], [0, 32, 0], 260, 320, (g) => {
    g.fillStyle = "#FFFFFF"; g.strokeStyle = TINTA; g.lineWidth = 10; g.fillRect(0, 0, 260, 320); g.strokeRect(0, 0, 260, 320);
    palomita(g, 130, 110, 46, 1, TINTA, 16); g.fillStyle = TINTA; g.fillRect(40, 200, 180, 14); g.fillRect(40, 240, 130, 14);
  });
  const r = estadoRegla(t);
  if (t < E.conque - 1.0) regla3(c, r.C, r.A, r.B, REG0.L, r.kap);
}
function acordeonMio(c: Ctx, t: number) {
  // salta al principio; se encoge y se va detrás cuando le preguntan; vuelve a saltar al final
  const sale1 = resorte(t - E.acordeon, 2.1, .32), cierra = smooth(prog(t, E.esconde, E.esconde + .35)), sale2 = resorte(t - (E.aprende + .1), 2.3, .34);
  let largo = 12 + 116 * sale1 * (1 - cierra);
  if (t > VUELVE) largo = 12 + 96 * sale2 * (1 - smooth(prog(t, E.voltea - .05, E.voltea + .25)));
  if (t > VUELVE && (t < E.aprende || t > E.voltea + .3)) return;
  if (t < VUELVE && t > E.esconde + .5) return;
  if (t > VUELVE) { acordeon(c, [36, 206, D.top + 3.2], largo, -1); return; }
  const raiz: V3 = t < E.esconde ? [48, 232, D.top + 1.5] : lerp3([48, 232, D.top + 1.5], [14, 318, 98], smooth(prog(t, E.esconde, E.esconde + .45)));
  acordeon(c, raiz, largo);
}
/** Un acordeón (la tira de papel doblada en zigzag con respuestas): al abrirse se aplana; pasado el borde, cuelga. */
function acordeon(c: Ctx, raiz: V3, largo: number, dir = 1) {
  const N = 10, l = 13, w = clamp(largo / N, .6, l), h = Math.sqrt(Math.max(l * l - w * w, 0));
  const pts: V3[] = [];
  for (let k = 0; k <= N; k++) {
    const x = raiz[0] + dir * k * w; let z = raiz[2] + (k % 2 ? h * .55 : 0);
    const sobra = dir * x - D.hw; if (sobra > 0) z -= sobra * sobra * .018 + sobra * .2;
    pts.push([x, raiz[1], z]);
  }
  const orden = Array.from({ length: N }, (_, k) => k).sort((a, b) => prof(...pts[b]) - prof(...pts[a]));
  for (const k of orden) {
    const a = pts[k], b = pts[k + 1], hw = 12;
    poly(c, [[a[0], a[1] - hw, a[2]], [b[0], b[1] - hw, b[2]], [b[0], b[1] + hw, b[2]], [a[0], a[1] + hw, a[2]]], k % 2 ? "#E2DDD0" : "#FFFFFF", TINTA, 2.2);
    trazo3(c, [lerp3(a, b, .2), lerp3(a, b, .8)].map((p) => [p[0], p[1] - 5, p[2] + .3] as V3), TINTA, 1.8, false);
    trazo3(c, [lerp3(a, b, .2), lerp3(a, b, .6)].map((p) => [p[0], p[1] + 3, p[2] + .3] as V3), k % 3 === 0 ? ACENTO : TINTA, 1.8, false);
  }
}
/** Lo que llevan las manos: el lápiz, la tarjeta de la red, las hojas de sondeo. */
function manosMias(c: Ctx, t: number, a: Pt | null, b: Pt | null, p: Pose) {
  if (a && p.lapiz > 0) {
    const g = Math.max(a.s, 1) * .9;
    c.save(); c.translate(a.x, a.y); c.rotate(-.5); c.fillStyle = "#2A2926"; c.fillRect(-4 * g, -40 * g, 8 * g, 40 * g);
    c.fillStyle = ACENTO; c.fillRect(-4 * g, -46 * g, 8 * g, 7 * g); c.fillStyle = TINTA; c.beginPath(); c.moveTo(-4 * g, 0); c.lineTo(4 * g, 0); c.lineTo(0, 9 * g); c.fill(); c.restore();
  }
  if (a && t > E.agarra && t < E.regresa + .4) {
    const g = a.s * 1.1;
    c.save(); c.translate(a.x, a.y - 12 * g); c.rotate(-.2 + .1 * Math.sin(t * 8)); c.fillStyle = "#FFFFFF"; c.strokeStyle = TINTA; c.lineWidth = 2.5;
    c.fillRect(-11 * g, -14 * g, 22 * g, 28 * g); c.strokeRect(-11 * g, -14 * g, 22 * g, 28 * g); palomita(c, 0, -4 * g, 5 * g, 1, TINTA, 2.5); c.restore();
  }
  // hojas de sondeo: una en la mano antes de cada metida
  const s = E.sondas, cual = s.findIndex((x) => t > x - .55 && t < x);
  if (b && cual >= 0) {
    const g = b.s * 1.1;
    c.save(); c.translate(b.x, b.y - 10 * g); c.rotate(.15); c.fillStyle = "#FFFFFF"; c.strokeStyle = TINTA; c.lineWidth = 2.5;
    c.fillRect(-9 * g, -12 * g, 18 * g, 22 * g); c.strokeRect(-9 * g, -12 * g, 18 * g, 22 * g);
    if (cual < 2) { c.fillStyle = TINTA; c.fillRect(-6 * g, -6 * g, 12 * g, 2 * g); c.fillRect(-6 * g, -1 * g, 9 * g, 2 * g); c.fillRect(-6 * g, 4 * g, 11 * g, 2 * g); }
    c.restore();
  }
}

// ---------- el calificador ----------
function escritorio(c: Ctx, t: number) {
  caja(c, 140, 372, -96, 0, 0, 80, { top: MESA, front: MESA_F, side: MESA_L }, 3);
  calificador(c, t);
}
function calificador(c: Ctx, t: number) {
  const Q = CAL;
  caja(c, Q.x0, Q.x1, Q.y0, Q.y1, Q.z0, Q.z1, { top: "#C9C3B4", front: "#DCD6C8", side: "#C3BCAC" }, 3.5, false);
  const ang = .62 * ease.outBack(prog(t, E.asoma - .1, E.asoma + .25), 1.6) * (1 - smooth(prog(t, E.uno, E.uno + .4)));
  const L = Q.y1 - Q.y0, fy = Q.y0 + L * Math.cos(ang), fz = Q.z1 + L * Math.sin(ang);
  if (ang > .02) poly(c, [[Q.x0 + 4, Q.y0 + 2, Q.z1], [Q.x1 - 4, Q.y0 + 2, Q.z1], [Q.x1 - 4, Q.y1 - 4, Q.z1], [Q.x0 + 4, Q.y1 - 4, Q.z1]], "#141412", null, 0);
  // la tapa, con la ranura de entrega
  poly(c, [[Q.x0, Q.y0, Q.z1], [Q.x1, Q.y0, Q.z1], [Q.x1, fy, fz], [Q.x0, fy, fz]], "#CFC9BA", TINTA, 3.5);
  const ran = (u: number): V3 => [lerp(Q.x0 + 24, Q.x1 - 24, u), lerp(Q.y0, fy, .6), lerp(Q.z1, fz, .6) + .4];
  const r0 = ran(0), r1 = ran(1);
  poly(c, [[r0[0], r0[1] - 3, r0[2]], [r1[0], r1[1] - 3, r1[2]], [r1[0], r1[1] + 3, r1[2]], [r0[0], r0[1] + 3, r0[2]]], "#141412", TINTA, 2);
  // frente: el letrero, la aguja y por dónde sale el veredicto
  const s = E.sondas;
  let aguja = -.9;
  s.forEach((x, i) => { const k = t - x - .1; if (k > 0) aguja = i < 2 ? -.9 + 1.0 * Math.exp(-k * 5) * Math.abs(Math.sin(k * 9)) : lerp(aguja, .95, ease.outBack(clamp(k / .35), 2.4)); });
  if (K.pos[1] < Q.y0) plano(c, [(Q.x0 + Q.x1) / 2, Q.y0 - .6, (Q.z0 + Q.z1) / 2], [Q.x1 - Q.x0, 0, 0], [0, 0, -(Q.z1 - Q.z0)], 600, 380, (g) => {
    tx(g, "CALIFICADOR", 300, 72, { fuente: mono(56), color: TINTA, esp: 4 });
    g.fillStyle = "#FFFFFF"; g.strokeStyle = TINTA; g.lineWidth = 7; g.beginPath(); g.arc(170, 250, 86, PI, 0); g.closePath(); g.fill(); g.stroke();
    g.lineWidth = 4; for (let i = 0; i <= 6; i++) { const a = PI + i / 6 * PI; g.beginPath(); g.moveTo(170 + Math.cos(a) * 70, 250 + Math.sin(a) * 70); g.lineTo(170 + Math.cos(a) * 84, 250 + Math.sin(a) * 84); g.stroke(); }
    tache(g, 108, 214, 10, 1, ACENTO, 5); palomita(g, 232, 214, 11, 1, TINTA, 5);
    const aa = -PI / 2 + aguja * 1.25; g.strokeStyle = ACENTO; g.lineWidth = 7; g.lineCap = "round"; g.beginPath(); g.moveTo(170, 250); g.lineTo(170 + Math.cos(aa) * 74, 250 + Math.sin(aa) * 74); g.stroke();
    g.fillStyle = TINTA; g.beginPath(); g.arc(170, 250, 12, 0, TAU); g.fill();
    g.fillStyle = "#141412"; g.fillRect(340, 318, 210, 18);
  });
  // los boletos de veredicto: salen hacia la cámara sobre el escritorio
  s.forEach((x, i) => {
    const sale = ease.outCubic(prog(t, x + .2, x + .55)), vete = i < 2 ? smooth(prog(t, s[i + 1] + .15, s[i + 1] + .4)) : smooth(prog(t, E.uno, E.uno + .4));
    if (sale <= 0 || vete >= 1) return;
    const len = 40 * sale;
    c.save(); c.globalAlpha *= 1 - vete;
    plano(c, [Q.x0 + 75, Q.y0 - len / 2 - 4 * vete * 10, Q.z0 + .6 + 6 * vete], [42, 0, 0], [0, -len, 0], 420, 400 * sale + 1, (g) => {
      g.fillStyle = "#FFFFFF"; g.strokeStyle = TINTA; g.lineWidth = 9; g.fillRect(0, 0, 420, 400 * sale); g.strokeRect(0, 0, 420, 400 * sale);
      if (sale > .6) { if (i < 2) tache(g, 210, 200 * sale, 70 * sale, prog(t, x + .35, x + .6), ACENTO, 24); else palomita(g, 210, 210 * sale, 90 * sale, prog(t, x + .35, x + .6), TINTA, 26); }
    });
    c.restore();
  });
}

// =====================================================================================================
// la escena del salón
// =====================================================================================================
let REGLA_PANTALLA: [number, number, number, number] | null = null;
function escenaSala(c: Ctx, t: number) {
  ponCamara(vista(t));
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  sala(c, t);
  const fh = Math.hypot(K.fw[0], K.fw[1]) || 1, hz = (x: number, y: number) => ((x - K.pos[0]) * K.fw[0] + (y - K.pos[1]) * K.fw[1]) / fh;
  const unidades: { d: number; h: number; dib: () => void }[] = OTROS.map(([x, y], i) => ({ d: prof(x, y + 40, 70), h: hz(x, y), dib: () => pupitre(c, t, x, y, poseOtro(t, i, x, y), false) }));
  const mia = poseMia(t);
  unidades.push({ d: prof(0, FILAS[0] + 40, 70), h: 1e9, dib: () => pupitre(c, t, 0, FILAS[0], mia, true) });
  unidades.push({ d: prof(256, -48, 90), h: hz(256, -48), dib: () => escritorio(c, t) });
  unidades.filter((u) => u.d > 90 && u.h > 30).sort((a, b) => b.d - a.d).forEach((u) => u.dib());
  // la regla vista en pantalla: de aquí arranca (y aquí aterriza) la escala de METR
  const r = estadoRegla(t);
  const A = Pv(suma3(r.C, [-REG0.L / 2, 0, 0])), B = Pv(suma3(r.C, [REG0.L / 2, 0, 0]));
  REGLA_PANTALLA = A && B ? (A.x < B.x ? [A.x, A.y, B.x, B.y] : [B.x, B.y, A.x, A.y]) : null;
  // la regla doblada en las manos: se dibuja al final, delante de todo
  if (t >= E.conque - 1.0) regla3(c, r.C, r.A, r.B, REG1.L, r.kap);
  miradas(c, t, mia);
  rotulosSala(c, t);
}
/** La mirada de reojo: un rayo punteado rojo que sale de la bola. */
function miradas(c: Ctx, t: number, p: Pose) {
  const o = Pv(suma3(MIA, p.lean)); if (!o) return;
  const rayo = (dst: V3 | null, a: number) => {
    if (!dst || a <= .01) return; const q = Pv(dst); if (!q) return;
    const dx = q.x - o.x, dy = q.y - o.y, d = Math.hypot(dx, dy) || 1, R = BB.r * o.s;
    c.save(); c.globalAlpha = a; c.strokeStyle = ACENTO; c.lineWidth = 5; c.setLineDash([3, 17]); c.lineCap = "round"; c.lineDashOffset = -t * 90;
    c.beginPath(); c.moveTo(o.x + dx / d * R * 1.05, o.y + dy / d * R * 1.05 - R * .2); c.lineTo(q.x, q.y); c.stroke(); c.restore();
  };
  rayo([VENT.xo + 2, TARJETAS[AGARRADA][0], TARJETAS[AGARRADA][1] - 10], ventana(t, E.buscan + .1, E.agarra - .05, .25, .2));
  rayo([(CAL.x0 + CAL.x1) / 2, CAL.y1 - 10, CAL.z1 + 6], ventana(t, E.asoma, E.uno - .3, .2, .25));
  rayo([EXT.x1, 472, 184], ventana(t, E.escribe + .1, E.cable + .2, .25, .25));
  const pc = prog(t, E.cable, E.llega), punta = pc > 0 ? cablePunta(pc) : null;
  rayo(punta, ventana(t, E.cable + .25, E.forcejeo[2] + .3, .2, .3));
}
function cablePunta(p: number): V3 {
  let resta = LCABLE * clamp(p);
  for (let i = 0; i < CABLE.length - 1; i++) { const l = tramoL(i); if (resta <= l) return lerp3(CABLE[i], CABLE[i + 1], resta / l); resta -= l; }
  return CABLE[CABLE.length - 1];
}
function rotulosSala(c: Ctx, t: number) {
  rotulo(c, t, E.trampa, E.nadie - .25, "trampa", 330, 200, ACENTO, true);
  rotulo(c, t, Math.max(E.aisi - .1, E.abre + 1.85), E.todos - .2, "AI Security Institute", 250, 92, TINTA);
  rotulo(c, t, E.reino, E.todos - .2, "Reino Unido", 345, 74, GRIS, true);
  rotulo(c, t, E.algun - .1, E.buscan - .1, "en algún momento", 300, 112, ACENTO, true);
  rotulo(c, t, E.agarra - .25, E.sondea - .1, "internet", 300, 130, TINTA, true);
  rotulo(c, t, E.sondas[0] - .1, E.uno - .2, "el calificador", 250, 112, TINTA, true);
  rotulo(c, t, E.imposible, E.escribe - .15, "examen imposible", 300, 116, ACENTO, true);
  rotulo(c, t, E.externo - .05, E.cable + .5, "servicio externo", 300, 110, TINTA, true);
  rotulo(c, t, E.llega - .2, E.pregunta - .1, "sistemas del instituto", 196, 100, ACENTO, true);
  // la pregunta
  const b = ease.outBack(prog(t, E.pregunta + .1, E.pregunta + .45), 1.8) * (1 - smooth(prog(t, E.metr0, E.metr0 + .3)));
  if (b > .01) {
    c.save(); c.translate(560, 420); c.scale(b, b); c.rotate(.03 * Math.sin(t * 2));
    c.fillStyle = "#FFFFFF"; c.strokeStyle = TINTA; c.lineWidth = 6;
    c.beginPath(); c.roundRect(-330, -90, 660, 170, 56); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(230, -82); c.lineTo(400, -190); c.lineTo(300, -60); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = "#FFFFFF"; c.beginPath(); c.moveTo(222, -76); c.lineTo(300, -76); c.lineTo(304, -54); c.lineTo(230, -54); c.closePath(); c.fill();
    tx(c, "¿Hiciste trampa?", 0, 22, { fuente: serif(96, true), color: TINTA });
    c.restore();
  }
}

// =====================================================================================================
// la escala de METR (2D): un puente de tablas sobre la regla
// =====================================================================================================
const PY = 1030, PH = 32, R2 = 74;
type Tabla = { x0: number; x1: number; roja: boolean; k: number };
const TABLAS: Tabla[] = (() => {
  const n = 22, a = RX0, b = xh(270), w = (b - a) / n, out: Tabla[] = [];
  let k = 0;
  for (let i = 0; i < n; i++) { const x0 = a + i * w + 3, x1 = a + (i + 1) * w - 3, roja = (x0 + x1) / 2 > xh(11) && i % 5 !== 3; out.push({ x0, x1, roja, k: roja ? k++ : -1 }); }
  return out;
})();
const BORDE = TABLAS.find((p) => p.roja)!.x0;
const X11 = xh(11), X270 = xh(270), XMETA = 905;
/** Posición de la bola en el puente. */
function bolaPuente(t: number): { x: number; y: number; manos: [number, number][]; vis: number } {
  const entra = prog(t, E.openai - .15, E.openai + .45);
  let x = lerp(-90, 170, ease.outCubic(entra)), y = PY - R2 - Math.sin(PI * entra) * 150;
  if (t > E.resiste) x = lerp(170, BORDE + 2, ease.inOutSine(prog(t, E.resiste, E.once - .05)));
  if (t > E.exitos + .4) x = lerp(BORDE + 2, X270 - 10, ease.inOutSine(prog(t, E.exitos + .4, E.setenta + .25)));
  if (t > E.maldad - .15) x = lerp(X270 - 10, 172, ease.inOutCubic(prog(t, E.maldad - .15, E.maldad + .6)));
  if (t > E.salta) x = lerp(172, XMETA - 50, ease.inOutCubic(prog(t, E.salta, E.salta + .75)));
  const rodando = (t > E.resiste && t < E.once) || (t > E.exitos + .4 && t < E.setenta + .25) || (t > E.maldad - .15 && t < E.maldad + .6) || (t > E.salta && t < E.salta + .75);
  if (entra >= 1) y = PY - R2 - (rodando ? Math.abs(Math.sin((x - RX0) / ((X270 - RX0) / 22) * PI)) * 10 : 0);
  // tambaleo en la orilla
  const orilla = t > E.once - .1 && t < E.exitos + .45 ? Math.exp(-(t - E.once) * .8) : 0;
  x += orilla * 7 * Math.sin(t * 9);
  // salto del hueco antes de la meta
  if (t > E.salta) { const j = prog(x, X270 - 30, XMETA - 60); y -= Math.sin(PI * j) * 90; }
  const tirado = ventana(t, E.meta + .1, E.salta, .4, .1);
  const flail = orilla * 34 * Math.sin(t * 13);
  const manos: [number, number][] = [
    [x - 125 + 20 * tirado, y - 40 + flail - 10 * tirado],
    [x + 125 + 50 * tirado, y - 50 - flail - 20 * tirado],
  ];
  const vis = smooth(prog(t, E.openai - .2, E.openai)) * (1 - smooth(prog(t, E.nuevo, E.nuevo + .4)));
  return { x, y, manos, vis };
}
function escenaPlana(c: Ctx, t: number, peso: number) {
  c.save();
  const dz = 1 + .012 * vaiven(t, 5.7) * peso, rot = .006 * vaiven(t, 7.9, 1) * peso;
  c.translate(540 + 9 * vaiven(t, 6.3) * peso, 900 + 11 * vaiven(t, 4.9, 2) * peso); c.rotate(rot); c.scale(dz, dz); c.translate(-540, -900);
  // ---- la regla: llega desde el pupitre (o regresa a él)
  const enMorf = REGLA_PANTALLA && peso < 1;
  const [ax, ay, bx, by] = enMorf ? [lerp(REGLA_PANTALLA![0], RX0, peso), lerp(REGLA_PANTALLA![1], RY, peso), lerp(REGLA_PANTALLA![2], RX1, peso), lerp(REGLA_PANTALLA![3], RY, peso)] : [RX0, RY, RX1, RY];
  const marcas = smooth(prog(peso, .5, 1)), etq = ventana(t, E.metr0 + 1.1, E.maldad, .4, .4);
  const aRegla = t < E.maldad ? 1 : t < E.nuevo ? 1 - smooth(prog(t, E.maldad, E.maldad + .6)) : smooth(prog(t, E.nuevo, E.nuevo + .4));
  regla2(c, ax, ay, bx, by, marcas, aRegla, etq);
  const aCap = ventana(t, E.metr0 + 1.3, E.ninguna - .2, .4, .4);
  if (aCap > 0) tx(c, "horas de una persona", 540, 1424, { fuente: serif(76, true), color: TINTA, alfa: aCap });
  c.save(); c.globalAlpha = Math.min(1, peso * 1.4);
  puente(c, t);
  c.restore();
  c.restore();
}
function puente(c: Ctx, t: number) {
  // ---- las tablas: la corrida. Las rojas son las tareas que "pasó" con trampa
  const nace = (i: number) => E.openai + .05 + i * .06;
  const aTablas = 1 - smooth(prog(t, E.nuevo, E.nuevo + .35));
  if (aTablas > 0) {
    c.save(); c.globalAlpha *= aTablas;
    TABLAS.forEach((p, i) => {
      const u = prog(t, nace(i), nace(i) + .45); if (u <= 0) return;
      const a = ease.outBack(u, 1.3);
      let dy = (1 - a) * -220, rot = (1 - a) * (i % 2 ? .6 : -.5);
      if (p.roja) {
        const tf = E.fallos + .12 + p.k * .06, tv = E.exitos + p.k * .035;
        if (t > tf) { const u = Math.min(t, tv) - tf; dy += 1600 * u * u + 40 * u; rot = u * (p.k % 2 ? 2.4 : -2.1); }
        if (t > tv) { const caida = 1 - ease.outBack(prog(t, tv, tv + .42), 1.2); dy = Math.min(dy, 1300) * caida; rot *= caida; }
      }
      if (dy > 1000) return;
      const cx = (p.x0 + p.x1) / 2;
      c.save(); c.translate(cx, PY + PH / 2 + dy); c.rotate(rot);
      c.fillStyle = p.roja ? ACENTO : "#2B2A27"; c.strokeStyle = TINTA; c.lineWidth = 3;
      c.beginPath(); c.rect(-(p.x1 - p.x0) / 2 + hsh(i) * 1.5, -PH / 2 + hsh(i + 40) * 1.5, p.x1 - p.x0, PH); c.fill(); c.stroke();
      c.restore();
    });
    // pilotes: el puente cuelga de nada; solo dos postes al principio
    c.strokeStyle = TINTA; c.lineWidth = 6; c.beginPath(); c.moveTo(RX0 + 8, PY + PH); c.lineTo(RX0 + 8, RY - 50); c.stroke();
    c.restore();
  }
  // ---- marcador doble
  const lectura = (x: number, yLab: number, num: string, col: string, ini: number, alin: "left" | "right", xT: number) => {
    const a = smooth(prog(t, ini, ini + .3)) * (1 - smooth(prog(t, E.maldad - .1, E.maldad + .3)));
    if (a <= 0) return;
    const robusta = smooth(prog(t, E.ninguna + .1, E.ninguna + .6));
    const tiem = robusta * (16 * Math.sin(t * 6.3 + x) + 8 * hsh(x));
    const k = ease.outCubic(prog(t, ini, ini + .35)), dy = (1 - k) * 20;
    c.save(); c.globalAlpha *= a;
    c.strokeStyle = col; c.lineWidth = 5; c.setLineDash([12, 12]); c.lineDashOffset = -t * 30; c.beginPath();
    const yTop = yLab + 84;
    for (let i = 0; i <= 24; i++) { const yy = lerp(RY - 46, lerp(RY - 46, yTop, k), i / 24), xx = x + tiem * Math.sin(i * .7 + t * 4) * (i / 24); if (i) c.lineTo(xx, yy); else c.moveTo(xx, yy); }
    c.stroke(); c.setLineDash([]);
    c.fillStyle = col; c.beginPath(); c.arc(x, RY - 46, 11, 0, TAU); c.fill();
    c.font = serif(96); const w1 = c.measureText("tareas de ").width; c.font = mono(90); const w2 = c.measureText(num).width;
    const x0 = (alin === "left" ? xT : xT - w1 - w2) + tiem, alfa = lerp(1, .55 + .45 * Math.abs(Math.sin(t * 3.1 + x)), robusta);
    tx(c, "tareas de ", x0, yLab + dy, { fuente: serif(96), color: col, alin: "left", alfa });
    tx(c, num, x0 + w1, yLab + dy, { fuente: mono(90), color: col, alin: "left", alfa });
    tx(c, "para una persona", alin === "left" ? x0 : xT + tiem, yLab + 64 + dy, { fuente: serif(62, true), color: col === ACENTO ? ACENTO : GRIS, alin, alfa: lerp(1, .7, robusta) });
    c.restore();
  };
  lectura(X11, 760, "~11 h", TINTA, E.once, "left", 108);
  lectura(X270, 560, "+270 h", ACENTO, E.setenta, "right", 968);
  // la bola fantasma: la misma corrida, leída de la otra forma
  const fant = ventana(t, E.misma, E.maldad - .1, .35, .3);
  if (fant > 0) { c.save(); c.globalAlpha = fant * .45; c.strokeStyle = TINTA; c.lineWidth = 5; c.setLineDash([9, 10]); c.beginPath(); c.arc(BORDE + 2, PY - R2, R2, 0, TAU); c.stroke(); c.restore(); }
  // ---- leyendas
  const par = (a: string, b: string, y: number, ini: number, fin: number) => {
    const al = ventana(t, ini, fin, .2, .25); if (al <= 0) return;
    c.save(); c.font = serif(84, true); const wa = c.measureText(a).width, wb = c.measureText(b).width; c.restore();
    const x0 = 560 - (wa + wb) / 2;
    tx(c, a, x0, y, { fuente: serif(84, true), color: ACENTO, alin: "left", alfa: al });
    tx(c, b, x0 + wa, y, { fuente: serif(84, true), color: TINTA, alin: "left", alfa: al });
  };
  par("trampa", " = fallo", 1530, E.si1 + .2, E.si2 - .1);
  par("trampa", " = éxito", 1530, E.si2, E.misma - .1);
  {
    const ini = Math.max(E.metr - .05, E.metr0 + .85), a = smooth(prog(t, ini - .04, ini + .14)) * (1 - smooth(prog(t, E.maldad - .1, E.maldad + .2)));
    const sube = ease.inOutCubic(prog(t, E.si1 - .3, E.si1 + .3));
    if (a > 0) tx(c, "METR", 540, lerp(330, 176, sube) + (1 - ease.outCubic(prog(t, ini - .04, ini + .3))) * 18, { fuente: serif(Math.round(lerp(170, 96, sube))), color: TINTA, alfa: a });
  }
  rotulo(c, t, E.indep, E.si1 - .15, "grupo independiente", 420, 74, GRIS, true);
  rotulo(c, t, E.openai, E.fallos - .2, "un modelo de OpenAI", 760, 84, TINTA, true, 360);
  rotulo(c, t, E.misma, E.ninguna - .15, "la misma corrida", 400, 124, TINTA, true);
  rotulo(c, t, E.ninguna, E.maldad - .15, "«ninguna cifra", 290, 112, TINTA, true);
  rotulo(c, t, E.ninguna + .15, E.maldad - .15, "es robusta»", 398, 112, TINTA, true);
  rotulo(c, t, E.maldad + .05, E.meta - .25, "No es maldad.", 400, 140, TINTA, true);
  // ---- el camino corto
  camino(c, t);
  // ---- la bola
  const b = bolaPuente(t);
  if (b.vis > 0) {
    c.save(); c.globalAlpha *= b.vis;
    agente(c, b.x, b.y, R2, b.manos[0], b.manos[1], { abre1: .8, abre2: .8, piso: PY + 2, sombra: .25 });
    cuernos(c, t, b.x, b.y);
    c.restore();
  }
}
/** "No es maldad": le salen cuernos y una goma se los borra. */
function cuernos(c: Ctx, t: number, x: number, y: number) {
  const sale = ease.outBack(prog(t, E.maldad + .25, E.maldad + .5), 2.2), borra = prog(t, E.borra, E.borra + .55);
  if (sale <= 0 || borra >= 1) return;
  const q = sale * (1 - smooth(borra));
  c.fillStyle = ACENTO;
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(x + s * 18, y - R2 * .78); c.lineTo(x + s * 40 * q + s * 12, y - R2 * .9 - 62 * q); c.lineTo(x + s * 44, y - R2 * .62); c.closePath(); c.fill(); }
  if (borra > 0) {
    const gx = x + 50 * Math.sin(borra * 3 * TAU), gy = y - R2 - 30;
    c.save(); c.translate(gx, gy); c.rotate(-.3);
    c.fillStyle = "#FFFFFF"; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.roundRect(-44, -26, 88, 52, 8); c.fill(); c.stroke();
    c.fillStyle = "#8C8A83"; c.fillRect(-44, -26, 30, 52); c.strokeRect(-44, -26, 88, 52); c.restore();
    c.fillStyle = "rgba(192,68,42,.8)";
    for (let i = 0; i < 9; i++) { const u = borra - i * .04; if (u <= 0) continue; c.fillRect(x - 40 + fijo(i) * 80, y - R2 - 20 + u * 260 * (1 + fijo(i + 9)), 5, 5); }
  }
}
/** Meta y calificación jalan; el camino largo baja y sube; el corto pasa por las tablas rojas. */
function camino(c: Ctx, t: number) {
  const a = ventana(t, E.meta - .1, E.nuevo, .3, .35);
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a;
  // la meta: una repisa del otro lado del hueco
  const m = ease.outBack(prog(t, E.meta - .05, E.meta + .3), 1.8);
  c.fillStyle = "#2B2A27"; c.strokeStyle = TINTA; c.lineWidth = 3; c.fillRect(XMETA - 90, PY, 400, PH); c.strokeRect(XMETA - 90, PY, 400, PH);
  c.save(); c.translate(XMETA + 25, PY); c.scale(1, m);
  c.strokeStyle = TINTA; c.lineWidth = 8; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -300); c.stroke();
  const ola = (u: number) => 10 * Math.sin(u * 5 - t * 6) * u;
  c.fillStyle = HOJA; c.lineWidth = 5; c.beginPath(); c.moveTo(0, -296);
  for (let i = 0; i <= 10; i++) c.lineTo(-i * 17, -296 + ola(i / 10));
  for (let i = 10; i >= 0; i--) c.lineTo(-i * 17, -206 + ola(i / 10));
  c.closePath(); c.fill(); c.stroke();
  c.restore();
  if (m > .5) tx(c, "META", XMETA + 25 - 85, PY - 230, { fuente: mono(50), color: TINTA, alfa: smooth(prog(m, .5, 1)) });
  // la calificación
  const cal = ease.outBack(prog(t, E.califica, E.califica + .35), 2);
  const CX = 770, CY = 610;
  if (cal > 0) {
    c.save(); c.translate(CX, CY + 8 * Math.sin(t * 2.3)); c.scale(cal, cal); c.rotate(-.08);
    c.fillStyle = HOJA; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.roundRect(-110, -96, 220, 192, 12); c.fill(); c.stroke();
    circulo(c, 0, 4, 76, 70, 1, ACENTO, 8);
    tx(c, "10", 0, 44, { fuente: serif(118), color: ACENTO });
    c.restore();
  }
  // las ligas que jalan
  const b = bolaPuente(t), jala = ventana(t, E.meta + .1, E.salta - .45, .3, .2);
  if (jala > 0) {
    const liga = (x1: number, y1: number, ini: number) => {
      const k = smooth(prog(t, ini, ini + .3)) * jala; if (k <= 0) return;
      const mx = (b.x + R2 * .8 + x1) / 2, my = (b.y - 10 + y1) / 2 + 10 * Math.sin(t * 17);
      c.strokeStyle = ACENTO; c.lineWidth = 5; c.beginPath(); c.moveTo(b.x + R2 * .8, b.y - 10); c.quadraticCurveTo(mx, my, lerp(b.x + R2 * .8, x1, k), lerp(b.y - 10, y1, k)); c.stroke();
    };
    liga(XMETA + 25, PY - 250, E.meta + .1); liga(CX - 60, CY + 90, E.califica + .1);
  }
  // los dos caminos
  const cor = prog(t, E.corto - .1, E.corto + 1.1);
  if (cor > 0) {
    const largo: [number, number][] = [[200, PY + 30], [250, 1420], [345, 1130], [440, 1440], [540, 1140], [640, 1440], [735, 1140], [830, 1420], [XMETA - 30, PY + 30]];
    c.save(); c.strokeStyle = GRIS; c.lineWidth = 6; c.setLineDash([2, 16]); c.lineCap = "round"; c.lineDashOffset = -t * 40;
    c.beginPath(); const n = Math.floor(cor * (largo.length - 1) * 8);
    for (let i = 0; i <= n; i++) { const u = i / 8, j = Math.min(Math.floor(u), largo.length - 2), f = u - j; const x = lerp(largo[j][0], largo[j + 1][0], f), y = lerp(largo[j][1], largo[j + 1][1], f); if (i) c.lineTo(x, y); else c.moveTo(x, y); }
    c.stroke(); c.restore();
    tx(c, "resolverlo", 540, 1548, { fuente: serif(76, true), color: GRIS, alfa: smooth(prog(cor, .4, .8)) });
    const k2 = smooth(prog(t, E.salta - .5, E.salta));
    if (k2 > 0) {
      c.save(); c.strokeStyle = ACENTO; c.lineWidth = 7; c.setLineDash([2, 16]); c.lineCap = "round"; c.lineDashOffset = -t * 60;
      c.beginPath(); c.moveTo(230, PY - 172); c.lineTo(lerp(230, XMETA - 70, k2), PY - 172); c.stroke(); c.restore();
      tx(c, "trampa", 500, PY - 205, { fuente: serif(120, true), color: ACENTO, alfa: k2 });
    }
  }
  // personas y empresas: mismo camino, misma trampa
  const viaja = (ini: number, fin: number) => lerp(170, XMETA - 160, ease.inOutCubic(prog(t, ini, fin)));
  const aP = smooth(prog(t, E.personas - .1, E.personas + .15)), aE = smooth(prog(t, E.empresas - .1, E.empresas + .15));
  if (aP > 0) { const x = viaja(E.personas + .25, E.personas + 1.0); c.save(); c.translate(x, PY); c.scale(1.35, 1.35); persona(c, 0, 0, aP, t); c.restore(); }
  if (aE > 0) { const x = viaja(E.empresas + .25, E.empresas + 1.0) - 40; c.save(); c.translate(x, PY); c.scale(1.35, 1.35); empresa(c, 0, 0, aE); c.restore(); }
  rotulo(c, t, E.personas, E.nuevo - .1, "personas", 560, 92, TINTA, true, 300);
  rotulo(c, t, E.empresas, E.nuevo - .1, "empresas", 660, 92, TINTA, true, 300);
  c.restore();
}
function persona(c: Ctx, x: number, piso: number, a: number, t: number) {
  c.save(); c.globalAlpha *= a; c.translate(x, piso); c.fillStyle = TINTA; c.strokeStyle = TINTA; c.lineCap = "round";
  const paso = Math.sin(t * 16) * .5;
  c.lineWidth = 10; c.beginPath(); c.moveTo(0, -56); c.lineTo(Math.sin(paso) * 30, 0); c.moveTo(0, -56); c.lineTo(-Math.sin(paso) * 30, 0); c.stroke();
  c.beginPath(); c.roundRect(-18, -128, 36, 76, 14); c.fill();
  c.beginPath(); c.arc(0, -150, 21, 0, TAU); c.fill();
  c.lineWidth = 8; c.beginPath(); c.moveTo(0, -116); c.lineTo(34, -92 - paso * 20); c.moveTo(0, -116); c.lineTo(-30, -90 + paso * 20); c.stroke();
  c.restore();
}
function empresa(c: Ctx, x: number, piso: number, a: number) {
  c.save(); c.globalAlpha *= a; c.translate(x, piso);
  c.fillStyle = "#2B2A27"; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.rect(-48, -150, 96, 150); c.fill(); c.stroke();
  c.fillRect(-30, -178, 22, 30);
  c.fillStyle = PAPEL; for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) c.fillRect(-36 + j * 26, -136 + i * 32, 14, 18);
  c.restore();
}

// =====================================================================================================
// cierre y orquestación
// =====================================================================================================
function rotulosFinal(c: Ctx, t: number) {
  rotulo(c, t, E.confiable - .05, E.unexamen - .1, "confiable", 300, 130, TINTA, true);
  rotulo(c, t, E.unexamen, E.aprende - .2, "es un examen", 300, 122, TINTA, true);
  rotulo(c, t, E.voltea, E.conque - .45, "engañar al examen", 230, 112, ACENTO, true);
  const a = smooth(prog(t, E.conque - .04, E.conque + .2));
  if (a > 0) {
    const s = 1 + .02 * Math.sin(t * 1.3);
    tx(c, "¿Con qué", 540, 300 + (1 - a) * 16, { fuente: serif(Math.round(150 * s), true), color: TINTA, alfa: a });
    tx(c, "lo mido ahora?", 540, 450 + (1 - a) * 16, { fuente: serif(Math.round(150 * s), true), color: ACENTO, alfa: smooth(prog(t, E.conque + .25, E.conque + .5)) });
  }
}
function polvo(c: Ctx, t: number) {
  c.fillStyle = TINTA;
  for (let i = 0; i < 46; i++) {
    const x0 = fijo(i) * 1200 - 60, y0 = fijo(i + 99) * 2060, v = 14 + fijo(i + 7) * 40, f = fijo(i + 3) * 6.3, z = 1.8 + fijo(i + 5) * 3.2;
    const y = ((y0 - t * v) % 2060 + 2060) % 2060 - 70, x = x0 + Math.sin(t * .55 + f) * 34;
    c.globalAlpha = .06 + fijo(i + 11) * .12; c.fillRect(x, y, z, z);
  }
  c.globalAlpha = 1;
}

function dibuja(c: Ctx, t: number) {
  FR = Math.floor(t * 10);
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  const ida = smooth(prog(t, E.metr0 + .5, E.metr0 + .88)), vuelta = smooth(prog(t, VUELVE, VUELVE + .7));
  const peso = t < E.nuevo ? ida : 1 - vuelta;
  REGLA_PANTALLA = null;
  if (peso < 1) escenaSala(c, t);
  if (peso > 0) {
    c.save(); c.globalAlpha = peso; c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920); c.restore();
    escenaPlana(c, t, peso);
  }
  if (t > VUELVE) rotulosFinal(c, t);
  polvo(c, t);
}

export const Pieza: React.FC = () => <Lienzo dibuja={(c, t) => dibuja(c, t)} preparar={() => ({})} />;
