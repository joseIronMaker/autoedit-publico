// Capítulo 5. Una red de verdad: el rojo NO está coreografiado. red.py le hace backpropagation y de ahí sale cada grosor
// (culpa de la conexión = peso × señal × culpa de a quien alimentó) y cada giro de perilla (el gradiente tal cual). Con esa culpa
// lo que entra a una neurona es lo que sale de ella, así que esto es un Sankey honesto: el rojo se reparte, no se inventa.
// Abajo lo que cae (la señal, por gravedad); hacia arriba, contra la gravedad, lo que regresa.
import React from "react";
import { azar, caida, clamp, ease, lerp, prog, resorte, smooth, texto } from "../../kit";
import { ACENTO, bola, GRIS, Lienzo, LUZ, mono, NOCHE, PAPEL, rotulo, serif, sombra, TINTA } from "../../marca";
import duracion from "./duracion.json";
import red from "./red.json";
import t0 from "./t.json";

export const DURACION = duracion.dur;
type Ctx = CanvasRenderingContext2D;

const NP = 24, WT = 84, YR = 1440, XV = 262, X0 = 812, KGIRO = 40;
const CICLOS = t0.ciclos;
const xDe = (y: number) => lerp(XV, X0, (y - red.verdad) / (red.pasos[0].y - red.verdad));

type Nodo = { l: number; i: number; x: number; y: number; z: number; px: number; py: number; s: number; r: number; c: number[]; sem: number; choques: number[] };
type Arista = {
  id: number; l: number; i: number; k: number; a: Nodo; b: Nodo; oa: number; ob: number;
  bx: Float32Array; by: Float32Array; X: Float32Array; Y: Float32Array; nx: number; ny: number;
  c: number[]; dw: number[]; w: number; xd: number; yd: number; rd: number; ud: number; xp: number; yp: number; golpes: [number, number][];
};
type Datos = { nodos: Nodo[][]; aristas: Arista[]; ruta: Arista[]; malla: Path2D[]; gotas: Float32Array[] };

// ---------- apertura: la bola baja rebotando de neurona en neurona. La misma cuenta da el dibujo y el sonido ----------
const G_INI = 8000, R_BOLA = 38;
const CHOQUES = t0.plinko.map((h) => {
  const x = (red.xs as Record<string, number[]>)[String(red.capas[h.l])][h.i], y = red.ys[h.l] - red.r[h.l] - R_BOLA * .9;
  return { t: h.t, x, y };
});
const TRAMOS = (() => {
  const P = [{ t: 0, x: 470, y: 120 }, ...CHOQUES, { t: t0.golpe, x: 812, y: YR - 34 }];
  return P.slice(1).map((b, i) => { const a = P[i], d = b.t - a.t; return { a, b, d, v: (b.y - a.y - .5 * G_INI * d * d) / d }; });
})();
function bolaAp(t: number): [number, number] {
  for (const q of TRAMOS) if (t <= q.b.t) { const u = t - q.a.t; return [lerp(q.a.x, q.b.x, u / q.d), q.a.y + q.v * u + .5 * G_INI * u * u]; }
  return [812, YR - 34];
}

// ---------- la red tiene fondo: cada neurona a su profundidad, y todo gira despacio alrededor de la salida ----------
type Pose = { cy: number; sy: number; cp: number; sp: number };
function poseEn(t: number): Pose {
  const k = smooth(prog(t, 9.4, 11.6));
  const yaw = k * (.22 * Math.sin(t * .29 + .6) + .1 * Math.sin(t * .67 + 1.3)), pit = k * (.13 + .06 * Math.sin(t * .41));
  return { cy: Math.cos(yaw), sy: Math.sin(yaw), cp: Math.cos(pit), sp: Math.sin(pit) };
}
const F3 = 1700;
function proy(P: Pose, x: number, y: number, z: number): [number, number, number] {
  const X = x - 540, Y = y - 1240, X1 = X * P.cy + z * P.sy, Z1 = -X * P.sy + z * P.cy;
  const Y1 = Y * P.cp - Z1 * P.sp, Z2 = -Y * P.sp + Z1 * P.cp, s = F3 / (F3 + Z2);
  return [540 + X1 * s, 1240 + Y1 * s, s];
}

function construye(): Datos {
  const r = azar(11), rz = azar(5);
  const nodos: Nodo[][] = red.capas.map((n, l) => {
    const xs = (red.xs as Record<string, number[]>)[String(n)];
    return xs.map((x, i) => {
      const xx = x + (l === 4 ? 0 : (r() - .5) * 16), yy = red.ys[l] + (l === 4 ? 0 : (r() - .5) * 20);
      return { l, i, x: xx, y: yy, z: l === 4 ? 0 : (rz() - .5) * (l === 3 ? 240 : 460), px: xx, py: yy, s: 1, r: red.r[l], c: [], sem: 1 + Math.floor(r() * 900), choques: [] };
    });
  });
  const aristas: Arista[] = [];
  for (let l = 0; l < 4; l++) nodos[l].forEach((a, i) => nodos[l + 1].forEach((b, k) => {
    aristas.push({
      id: aristas.length, l, i, k, a, b, oa: 0, ob: 0, bx: new Float32Array(NP), by: new Float32Array(NP), X: new Float32Array(NP), Y: new Float32Array(NP), nx: 0, ny: 0,
      c: red.pasos.map((p) => p.c[l][i][k]), dw: red.pasos.map((p) => p.dw[l][i][k]), w: red.w[l][i][k], xd: 0, yd: 0, rd: 16, ud: .5, xp: 0, yp: 0, golpes: [],
    });
  }));
  nodos.forEach((capa, l) => capa.forEach((n) => { n.c = red.pasos.map((_, s) => aristas.filter((e) => (l < 4 ? e.a === n : e.b === n)).reduce((q, e) => q + e.c[s], 0)); }));
  // Sankey: en cada neurona las conexiones se acomodan lado a lado, ordenadas, y los anchos suman de verdad.
  nodos.flat().forEach((n) => {
    const abajo = aristas.filter((e) => e.a === n).sort((p, q) => p.b.x - q.b.x);
    const arriba = aristas.filter((e) => e.b === n).sort((p, q) => p.a.x - q.a.x);
    let u = -n.c[0] * WT / 2;
    abajo.forEach((e) => { const w = e.c[0] * WT; e.oa = u + w / 2; u += w; });
    u = -n.c[0] * WT / 2;
    arriba.forEach((e) => { const w = e.c[0] * WT; e.ob = u + w / 2; u += w; });
  });
  for (const e of aristas) {
    const x0 = e.a.x + e.oa, y0 = e.a.y + e.a.r * .18, x3 = e.b.x + e.ob, y3 = e.b.y - e.b.r * .18, dy = (y3 - y0) * .5;
    for (let j = 0; j < NP; j++) {
      const u = j / (NP - 1), v = 1 - u;
      e.bx[j] = v * v * v * x0 + 3 * v * v * u * x0 + 3 * v * u * u * x3 + u * u * u * x3;
      e.by[j] = v * v * v * y0 + 3 * v * v * u * (y0 + dy) + 3 * v * u * u * (y3 - dy) + u * u * u * y3;
    }
    const L = Math.hypot(x3 - x0, y3 - y0);
    e.nx = -(y3 - y0) / L; e.ny = (x3 - x0) / L;
  }
  // Perillas: la de más culpa escoge sitio primero.
  const puestos: [number, number, number][] = [];
  [...aristas].sort((p, q) => q.c[0] - p.c[0]).forEach((e) => {
    const rd = 15 + 15 * Math.sqrt(e.c[0]);
    let mejor = .5, dm = -1;
    for (const s of [.5, .42, .58, .34, .66, .27, .73, .2, .8]) {
      const j = Math.round(s * (NP - 1));
      const d = Math.min(9999, ...puestos.map((p) => Math.hypot(p[0] - e.bx[j], p[1] - e.by[j]) - p[2] - rd));
      if (d > 10) { mejor = s; dm = d; break; }
      if (d > dm) { mejor = s; dm = d; }
    }
    const j = Math.round(mejor * (NP - 1));
    e.xd = e.bx[j]; e.yd = e.by[j]; e.rd = rd; e.ud = j / (NP - 1); puestos.push([e.xd, e.yd, rd]);
  });
  // Cuerdas: quién vibra y cuándo.
  for (const e of aristas) {
    const q = Math.sqrt(e.c[0]);
    t0.plinko.forEach((h) => { if ((e.a.l === h.l && e.a.i === h.i) || (e.b.l === h.l && e.b.i === h.i)) e.golpes.push([h.t, 13]); });
    e.golpes.push([finRojo(e), 3 + 20 * q]);
    e.golpes.push([t0.mueve, 7 + 26 * q]);
    CICLOS.forEach((cc) => e.golpes.push([cc.t + cc.d * (.86), (2 + 14 * q) * Math.sqrt(1 - cc.de / 14)]));
    e.golpes.sort((p, q2) => p[0] - q2[0]);
  }
  t0.plinko.forEach((h) => nodos[h.l][h.i].choques.push(h.t));
  // La ruta de más culpa, de la salida al principio: es la que sube en el negro.
  const ruta: Arista[] = [];
  let n = nodos[4][0];
  for (let l = 3; l >= 0; l--) {
    const e = aristas.filter((q) => q.b === n).sort((p, q) => q.c[0] - p.c[0])[0];
    ruta.push(e); n = e.a;
  }
  return { nodos, aristas, ruta, ...mallaGrande(nodos) };
}

/** "Millones": un embudo enorme que termina en las cinco entradas de la red pequeña. */
function mallaGrande(nodos: Nodo[][]) {
  const r = azar(23), LM = 24;
  const capas: [number, number][][] = [nodos[0].map((n) => [n.x, n.y])];
  for (let l = 1; l <= LM; l++) {
    const n = 5 + Math.round(l * 5.6), half = 420 + l * 150, y = 310 - l * 372, f: [number, number][] = [];
    for (let i = 0; i < n; i++) f.push([540 - half + 2 * half * (i + (r() - .5) * .7) / (n - 1), y + (r() - .5) * 120]);
    capas.push(f);
  }
  const malla = [0, 1, 2].map(() => new Path2D());
  const ligas: number[][][] = capas.map((f) => f.map(() => []));
  for (let l = 1; l <= LM; l++) capas[l].forEach((p, i) => {
    const m = capas[l - 1].length, c0 = i / (capas[l].length - 1) * (m - 1);
    for (let v = 0; v < 6; v++) {
      const j = clamp(Math.round(c0 + (r() - .5) * 7), 0, m - 1), q = capas[l - 1][j];
      ligas[l][i].push(j);
      malla.forEach((P) => { P.moveTo(p[0] + (r() - .5) * 18, p[1] + (r() - .5) * 18); P.lineTo(q[0] + (r() - .5) * 18, q[1] + (r() - .5) * 18); });
    }
  });
  const gotas: Float32Array[] = [];
  for (let g = 0; g < 460; g++) {
    let l = LM, i = Math.floor(r() * capas[LM].length);
    const v: number[] = [];
    while (l >= 1) { v.push(...capas[l][i]); i = ligas[l][i][Math.floor(r() * ligas[l][i].length)]; l--; }
    v.push(...capas[0][i]);
    for (let q = 1; q < 5; q++) { const c = nodos[q]; const n = c[Math.floor(r() * c.length)]; v.push(n.x, n.y); }
    gotas.push(Float32Array.from(v));
  }
  return { malla, gotas };
}

// ---------- tiempos del rojo ----------
function iniRojo(e: Arista) {
  if (e.l === 3) return e.i === 0 ? t0.fC : t0.fA;
  return e.l === 2 ? t0.f2 : e.l === 1 ? t0.f1 : t0.f0;
}
function durRojo(e: Arista) {
  if (e.l === 3) return e.i === 0 ? t0.dC : t0.dA;
  return e.l === 2 ? t0.d2 : e.l === 1 ? t0.d1 : t0.d0;
}
function finRojo(e: Arista) { return iniRojo(e) + durRojo(e); }
const frenteHeroe = (e: Arista, t: number) => ease.inOutSine(prog(t, iniRojo(e), finRojo(e)));

/** En qué ciclo adelante-atrás vamos. */
function cicloDe(t: number) {
  for (let j = CICLOS.length - 1; j >= 0; j--) if (t >= CICLOS[j].t) return t < CICLOS[j].t + CICLOS[j].d * 1.02 ? { c: CICLOS[j], f: prog(t, CICLOS[j].t, CICLOS[j].t + CICLOS[j].d) } : null;
  return null;
}
const frenteCiclo = (e: Arista, f: number) => { const a = .32 + (3 - e.l) * .125; return ease.inOutSine(prog(f, a, a + .15)); };

function salida(t: number) {
  const P = red.pasos;
  let y = lerp(P[0].y, P[1].y, ease.outCubic(prog(t, t0.mueve + .08, t0.mueve + 1.05)));
  for (const cc of CICLOS) y = lerp(y, P[cc.a].y, ease.inOutCubic(prog(t, cc.t + cc.d * .84, cc.t + cc.d)));
  y = lerp(y, P[9].y, ease.inOutCubic(prog(t, t0.preg + t0.dPreg - .3, t0.preg + t0.dPreg + .4)));
  y = lerp(y, P[13].y, ease.inOutCubic(prog(t, t0.ultimo, t0.culpaF + .05)));
  return y;
}
const giro = (e: Arista, t: number) => e.dw[0] * KGIRO * resorte(t - t0.mueve, 3.4, .36);

// ---------- las cuerdas ----------
function fija(D: Datos, t: number) {
  const tick = Math.floor(t * 10), P = poseEn(t);
  for (const f of D.nodos) for (const n of f) {
    let dx = 0, dy = 0;
    for (const h of n.choques) { const a = t - h; if (a > 0 && a < 1) { const q = 14 * Math.exp(-a * 7) * Math.sin(a * 44); dx += q * .5; dy += q; } }
    const [x, y, s] = proy(P, n.x, n.y, n.z);
    n.px = x + dx; n.py = y + dy; n.s = s;
  }
  for (const e of D.aristas) {
    const r = azar(e.id * 97 + tick * 131 + 7);
    const j1 = (r() - .5) * 5, j2 = (r() - .5) * 4, j3 = (r() - .5) * 2.4, j4 = (r() - .5) * 2.4;
    let A = 0;
    for (const [ts, a] of e.golpes) {
      const age = t - ts;
      if (age < 0) break;
      if (age < 1.6) A += a * Math.exp(-age * 3.3) * Math.sin(age * 41 + e.id);
    }
    for (let j = 0; j < NP; j++) {
      const u = j / (NP - 1), s1 = Math.sin(Math.PI * u), s2 = Math.sin(2 * Math.PI * u);
      const [x, y] = proy(P, e.bx[j] + (j1 * s1 + j2 * s2) + j3 * s1 * s1 + A * s1 * e.nx, e.by[j] + j4 * s1 * s2 + A * s1 * e.ny, lerp(e.a.z, e.b.z, u));
      e.X[j] = x; e.Y[j] = y;
    }
    const [xd, yd] = proy(P, e.xd, e.yd, lerp(e.a.z, e.b.z, e.ud));
    e.xp = xd; e.yp = yd;
  }
}

function trazo(c: Ctx, e: Arista) {
  c.beginPath(); c.moveTo(e.X[0], e.Y[0]);
  for (let j = 1; j < NP; j++) c.lineTo(e.X[j], e.Y[j]);
  c.stroke();
}

/** El rojo de una conexión: de la neurona de abajo hacia la de arriba, hasta `k`. */
function rojo(c: Ctx, e: Arista, k: number, ancho: number, t: number, color = ACENTO) {
  if (k <= .002 || ancho <= .02) return;
  const q = (NP - 1) * (1 - clamp(k)), i0 = Math.floor(q), f = q - i0;
  c.beginPath(); c.moveTo(e.X[NP - 1], e.Y[NP - 1]);
  for (let j = NP - 2; j > i0; j--) c.lineTo(e.X[j], e.Y[j]);
  if (i0 < NP - 1) c.lineTo(lerp(e.X[i0], e.X[i0 + 1], f), lerp(e.Y[i0], e.Y[i0 + 1], f));
  c.strokeStyle = color; c.lineWidth = Math.max(ancho, 1.1); c.lineCap = k < 1 ? "round" : "butt"; c.lineJoin = "round"; c.setLineDash([]);
  c.stroke();
  if (ancho > 5) {                                      // sigue subiendo: el rojo nunca se ve quieto
    c.strokeStyle = "rgba(244,178,146,.34)"; c.lineWidth = Math.max(2, ancho * .1); c.lineCap = "round";
    c.setLineDash([54, 130]); c.lineDashOffset = -t * 300 - e.id * 37;
    c.stroke(); c.setLineDash([]);
  }
}

function circuloMano(c: Ctx, x: number, y: number, r: number, t: number, sem: number, g = 5, color = TINTA, alfa = 1, vueltas = 1.06) {
  const q = azar(sem + Math.floor(t * 10) * 53), a0 = q() * 6.28, b1 = q() * .022, b2 = q() * .018, f1 = q() * 6, f2 = q() * 6;
  c.save(); c.globalAlpha *= alfa; c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round"; c.beginPath();
  const n = 42 * vueltas;
  for (let i = 0; i <= n; i++) {
    const a = a0 + i / 42 * 6.2832, rr = r * (1 + b1 * Math.sin(2 * a + f1) + b2 * Math.sin(3 * a + f2) + (i / n) * .018);
    if (i === 0) c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.stroke(); c.restore();
}

function discoPapel(c: Ctx, n: Nodo, color = PAPEL) { c.fillStyle = color; c.beginPath(); c.arc(n.px, n.py, n.r * n.s, 0, 7); c.fill(); }

/** Radio del núcleo rojo: su diámetro es exactamente el rojo que entra. */
const rNucleo = (n: Nodo, paso: number) => Math.min(n.c[paso] * WT / 2 * 1.08, n.r * .9);

// ---------- perilla pequeña: el mismo objeto del capítulo 3, reducido ----------
function dial(c: Ctx, x: number, y: number, R: number, ang: number, ang1: number, arco: number, alfa: number) {
  if (alfa <= .01) return;
  c.save(); c.globalAlpha = alfa; c.translate(x, y);
  c.fillStyle = "rgba(20,18,14,.22)"; c.beginPath(); c.arc(R * .12, R * .16, R * 1.1, 0, 7); c.fill();
  c.fillStyle = "#121211"; c.beginPath();
  const N = 14;
  for (let i = 0; i < N * 2; i++) {
    const a = ang + i * Math.PI / N, r = R * (i % 2 ? 1.06 : .95);
    if (i === 0) c.moveTo(Math.cos(a) * r, Math.sin(a) * r); else c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  c.closePath(); c.fill();
  const G = c.createConicGradient(-.9, 0, 0);
  ([["#E4E1D9", 0], ["#8D8B85", .16], ["#DCD9D1", .33], ["#74726C", .5], ["#D2CFC7", .66], ["#7F7D77", .83], ["#E4E1D9", 1]] as [string, number][]).forEach(([k, s]) => G.addColorStop(s, k));
  c.fillStyle = G; c.beginPath(); c.arc(0, 0, R * .7, 0, 7); c.fill();
  c.strokeStyle = TINTA; c.lineWidth = Math.max(R * .13, 2.4); c.lineCap = "round";
  c.beginPath(); c.moveTo(Math.cos(ang) * R * .12, Math.sin(ang) * R * .12); c.lineTo(Math.cos(ang) * R * .66, Math.sin(ang) * R * .66); c.stroke();
  if (arco > 0 && Math.abs(ang1 - ang) > .01) {
    c.strokeStyle = ACENTO; c.lineWidth = Math.max(R * .24, 4); c.lineCap = "round";
    c.beginPath(); c.arc(0, 0, R * 1.34, ang, lerp(ang, ang1, arco), ang1 < ang); c.stroke();
  }
  c.restore();
}

// ---------- la recta de c01: lo que dijo, lo que era, y la barra entre los dos ----------
function recta(c: Ctx, t: number, alfa: number) {
  if (alfa <= .01) return;
  const y = salida(t), xB0 = xDe(y);
  c.save(); c.globalAlpha = alfa;
  c.strokeStyle = TINTA; c.fillStyle = TINTA; c.lineWidth = 4; c.lineCap = "round"; c.beginPath(); c.moveTo(100, YR); c.lineTo(980, YR); c.stroke();
  for (let i = 0; i <= 10; i++) c.fillRect(100 + i * 88 - 1.5, YR, 3, 20);
  // bandera: la verdad
  const ond = Math.sin(t * 5.1) * 5;
  c.fillStyle = ACENTO; c.fillRect(XV - 3, YR - 196, 6, 196);
  c.beginPath(); c.moveTo(XV + 3, YR - 196); c.quadraticCurveTo(XV + 48, YR - 186 + ond, XV + 88, YR - 160 + ond * .4); c.quadraticCurveTo(XV + 44, YR - 142 - ond, XV + 3, YR - 124); c.closePath(); c.fill();
  // la bola sale de la neurona y cae a la recta
  let xB = xB0, yB = YR - 34;
  if (t < t0.golpe) {
    [xB, yB] = bolaAp(t);
  } else {
    const h = caida(t - t0.golpe + Math.sqrt(2 * 1.5 / 30), 1.5, .44, 30).z;
    yB -= h * 60;
  }
  const k9 = prog(t, t0.ultimo, t0.culpaF + .05);
  if (k9 > 0 && k9 < 1) yB -= Math.sin(k9 * Math.PI) * 150;
  if (t > t0.culpaF + .05) yB -= caida(t - t0.culpaF - .05 + Math.sqrt(2 * 1.2 / 30), 1.2, .4, 30).z * 34;
  const am = smooth(prog(t, t0.golpe, t0.golpe + .04));
  const xBar = lerp(xB, XV, ease.outExpo(prog(t, t0.golpe + .02, t0.golpe + .36)));
  if (am > 0) { c.fillStyle = ACENTO; c.fillRect(Math.min(xBar, xB0), YR - 9, Math.abs(xB0 - xBar), 18); }
  if (t >= t0.golpe) sombra(c, xB0, YR + 6, 70, .34 * clamp(1 - (YR - 34 - yB) / 170));
  const rB = lerp(R_BOLA, 34, smooth(prog(t, t0.golpe - .3, t0.golpe)));
  if (t < t0.golpe) {                                     // en el aire: sombra sobre el papel, despegada
    const g = c.createRadialGradient(xB + 34, yB + 46, 4, xB + 34, yB + 46, rB * 1.5);
    g.addColorStop(0, "rgba(20,18,14,.3)"); g.addColorStop(1, "rgba(20,18,14,0)");
    c.fillStyle = g; c.beginPath(); c.arc(xB + 34, yB + 46, rB * 1.5, 0, 7); c.fill();
  }
  bola(c, xB, yB, rB);
  // le atinó: tres anillos en la bandera
  for (let i = 0; i < 3; i++) {
    const r = prog(t, t0.culpaF + .05 + i * .17, t0.culpaF + 1.05 + i * .17);
    if (r <= 0 || r >= 1) continue;
    c.save(); c.globalAlpha = (1 - r) * .9; c.strokeStyle = ACENTO; c.lineWidth = 6 * (1 - r) + 1; c.beginPath(); c.arc(xB0, YR - 34, 40 + r * 150, 0, 7); c.stroke(); c.restore();
  }
  c.restore();
}

// ---------- la red en papel ----------
type OptRed = { tinta: number; tintaN?: (n: Nodo) => number; engorda?: (e: Arista) => number; frente: (e: Arista) => number; escala: number | ((e: Arista) => number); paso: number; nucleo: (n: Nodo) => number; color?: string };
function dibujaRed(c: Ctx, D: Datos, t: number, o: OptRed) {
  c.lineCap = "round"; c.lineJoin = "round"; c.strokeStyle = TINTA;
  for (const e of D.aristas) {
    c.globalAlpha = o.tinta * lerp(.42, .92, clamp(e.w * 1.6));
    c.lineWidth = 1.6 + 6.4 * e.w + (o.engorda ? o.engorda(e) : 0);
    trazo(c, e);
  }
  c.globalAlpha = 1;
  for (const f of D.nodos) for (const n of f) discoPapel(c, n);
  const esc = o.escala;
  for (const e of D.aristas) {
    const k = o.frente(e); if (k <= 0) continue;
    const q = typeof esc === "number" ? esc : esc(e);
    rojo(c, e, k, e.c[o.paso] * WT * q, t, o.color);
  }
  for (const f of D.nodos) for (const n of f) {
    const q = o.nucleo(n);
    if (q > .01) { c.fillStyle = o.color ?? ACENTO; c.beginPath(); c.arc(n.px, n.py, Math.max(rNucleo(n, o.paso) * q, q * 1.5), 0, 7); c.fill(); }
    const salto = t > t0.mueve && t < t0.mueve + 1 ? .2 * Math.exp(-(t - t0.mueve) * 6) * Math.cos((t - t0.mueve) * 34) : 0;
    let bote = 0;
    for (const h of n.choques) if (t > h) bote += .22 * Math.exp(-(t - h) * 9);
    circuloMano(c, n.px, n.py, n.r * n.s * (1 + salto + bote), t, n.sem, n.l === 4 ? 6.5 : 5, TINTA, o.tinta * (o.tintaN ? o.tintaN(n) : 1));
  }
}

function nucleoHeroe(n: Nodo, t: number, D: Datos) {
  if (n.l === 4) return smooth(prog(t, t0.empiezas + .2, t0.empiezas + .8));
  const ini = n.l === 3 ? (n.i === 0 ? t0.fC + t0.dC : t0.fA + t0.dA) : n.l === 2 ? t0.f2 + t0.d2 : n.l === 1 ? t0.f1 + t0.d1 : t0.f0 + t0.d0;
  return resorte(t - ini + .08, 4.5, .5);
}

function cuentas(c: Ctx, D: Datos, t: number, ini: number, fin: number) {
  // Lo que empujó: cuentas negras que bajan por las tres conexiones de la neurona de salida, del tamaño de lo que aportan.
  for (const e of D.aristas) {
    if (e.l !== 3) continue;
    const per = .62, r0 = 7 + 34 * Math.sqrt(e.c[0]);
    for (let n = 0; n < 8; n++) {
      const u = (t - ini) / per - n * .62 - e.i * .13;
      if (u < 0 || u > 1) continue;
      if (ini + (n + 1) * per * .62 > fin + .6) continue;
      const j = Math.min(NP - 2, Math.floor((.3 + .7 * u * u) * (NP - 1)));
      bola(c, e.X[j], e.Y[j], r0 * (.6 + .4 * Math.sin(Math.PI * u)) * smooth(u / .16));
    }
  }
}

/** En cada vuelta la señal baja primero: cuentas por las conexiones que más cargan. */
function cuentasCiclo(c: Ctx, D: Datos, f: number) {
  if (f > .3) return;
  for (const e of D.aristas) {
    if (e.c[0] < .05) continue;
    const u = f / .3 * 4 - e.l;
    if (u < 0 || u > 1) continue;
    const j = Math.min(NP - 1, Math.floor(u * (NP - 1)));
    bola(c, e.X[j], e.Y[j], (7 + 22 * Math.sqrt(e.c[0])) * (e.l === 3 ? 1 - u * .9 : 1));
  }
}

/** La sangre de la recta sube por el tallo: abajo se ensancha como la raíz de un árbol. */
function tallo(c: Ctx, D: Datos, t: number) {
  const k = ease.inOutCubic(prog(t, t0.empiezas - .05, t0.empiezas + .62)), seca = 1 - smooth(prog(t, t0.mueve + .05, t0.mueve + .8));
  if (k <= 0 || seca <= 0) return;
  const W = lerp(14, WT, ease.outCubic(k)) * seca, yT = lerp(YR - 4, 1250, k), b = 74 * k * seca, h = Math.min(W / 2, (YR - yT) * .6 + 1);
  c.fillStyle = ACENTO; c.beginPath();
  c.moveTo(540 - W / 2 - b, YR + 9);
  c.quadraticCurveTo(540 - W / 2, YR + 6, 540 - W / 2, Math.max(yT + h, YR - 96 * k));
  c.lineTo(540 - W / 2, yT + h);
  c.ellipse(540, yT + h, W / 2, h, 0, Math.PI, 0);
  c.lineTo(540 + W / 2, Math.max(yT + h, YR - 96 * k));
  c.quadraticCurveTo(540 + W / 2, YR + 6, 540 + W / 2 + b, YR + 9);
  c.closePath(); c.fill();
  const n = D.nodos[4][0];
  circuloMano(c, n.px, n.py, n.r, t, n.sem, 6.5, TINTA, 1);
}

/** La salida grita, y el grito se muere antes de llegar a la primera capa de en medio. */
function ondas(c: Ctx, t: number) {
  const ini = t0.error - .1, fin = t0.durante;
  if (t < ini || t > fin + 1) return;
  for (let i = 0; i < 12; i++) {
    const ti = ini + i * .68; if (ti > fin) break;
    const k = prog(t, ti, ti + 1.05);
    if (k <= 0 || k >= 1) continue;
    c.save(); c.globalAlpha = (1 - k) ** 1.5 * .9; c.strokeStyle = ACENTO; c.lineWidth = lerp(9, 2, k);
    c.beginPath(); c.arc(540, 1240, 66 + k * 92, 0, 7); c.stroke(); c.restore();
  }
}

const iniPreg = (l: number) => t0.preg + (3 - l) * t0.dPreg * .235;
const frentePreg = (e: Arista, t: number) => ease.inOutSine(prog(t, iniPreg(e.l), iniPreg(e.l) + t0.dPreg * .3));

/** La pregunta viaja: un signo por conexión, del tamaño de la culpa que trae, y se queda en cada nodo. */
function preguntas(c: Ctx, D: Datos, t: number) {
  const nace = resorte(t - t0.pregunta + .1, 4.4, .46);
  const sal = 1 - smooth(prog(t, t0.aprender - 1.05, t0.aprender - .7));
  texto(c, "?", 540, 1294, { fuente: serif(170 * clamp(nace, 0, 1.2), true), color: ACENTO, alfa: sal * smooth(prog(t, t0.pregunta - .1, t0.pregunta)) });
  for (const e of D.aristas) {
    if (e.c[0] < .03) continue;
    const k = frentePreg(e, t); if (k <= 0) continue;
    const q = (NP - 1) * (1 - k), j = Math.floor(q), f = q - j, jj = Math.min(NP - 1, j + 1);
    const x = lerp(e.X[j], e.X[jj], f), y = lerp(e.Y[j], e.Y[jj], f), px = 62 + 150 * Math.sqrt(e.c[0]);
    c.save(); c.fillStyle = PAPEL; c.globalAlpha = sal * .86 * (e.l === 0 || k < 1 ? 1 : 0); c.beginPath(); c.arc(x, y - px * .22, px * .42, 0, 7); c.fill(); c.restore();
    const aq = sal * (e.l === 0 || k < 1 ? 1 : 0);
    if (aq > .01) { c.save(); c.globalAlpha = aq; c.font = serif(px, true); c.textAlign = "center"; c.strokeStyle = ACENTO; c.lineWidth = 2.6; c.lineJoin = "round"; c.strokeText("?", x, y + px * .1); c.fillStyle = ACENTO; c.fillText("?", x, y + px * .1); c.restore(); }
  }
}

/** Dibuja una palabra de atrás hacia adelante, como el rojo: la última letra primero. */
function alReves(c: Ctx, s: string, x: number, y: number, fuente: string, color: string, k: number, alfa: number) {
  if (k <= 0 || alfa <= 0) return 0;
  c.save(); c.font = fuente; c.textAlign = "left"; c.textBaseline = "alphabetic"; c.fillStyle = color;
  const W = c.measureText(s).width, x0 = x - W / 2, n = s.length;
  let frente = x0 + W;
  for (let i = n - 1; i >= 0; i--) {
    const q = clamp((k * (n + 4) - (n - 1 - i)) / 4);
    if (q <= 0) continue;
    const xi = x0 + c.measureText(s.slice(0, i)).width;
    c.globalAlpha = alfa * smooth(q);
    c.fillText(s[i], xi + (1 - ease.outCubic(q)) * 26, y);
    frente = Math.min(frente, xi);
  }
  c.restore();
  return frente;
}

// ---------- la hoja que tapa las capas de en medio ----------
const YH0 = 438, YH1 = 1124;
const RASGA: [number, number][] = (() => { const r = azar(77), p: [number, number][] = []; for (let i = 0; i <= 22; i++) p.push([520 + (r() - .5) * 90 + Math.sin(i * .7) * 26, lerp(YH0 - 12, YH1 + 12, i / 22)]); return p; })();
const RAYAS: [number, number, number][] = (() => { const r = azar(31), p: [number, number, number][] = []; for (let i = 0; i < 60; i++) p.push([(r() - .5) * 8, (r() - .5) * 8, (r() - .5) * .34]); return p; })();

function contenidoHoja(c: Ctx, t: number) {
  c.fillStyle = "#E8E4D9"; c.fillRect(-300, YH0 - 20, 1700, YH1 - YH0 + 40);
  c.strokeStyle = "rgba(17,17,17,.055)"; c.lineWidth = 3;
  for (let i = -20; i < 80; i++) { c.beginPath(); c.moveTo(i * 26 - 300, YH1 + 20); c.lineTo(i * 26 + 390, YH0 - 20); c.stroke(); }
  const n = Math.floor(ease.inOutSine(prog(t, t0.anios - .2, t0.finF + .1)) * 39.999) + (t >= t0.anios - .2 ? 1 : 0);
  // Palitos de preso: un año tras otro, y nada.
  const xG = (g: number) => 148 + g * 164, yF = (f: number) => 735 + f * 196;
  c.strokeStyle = TINTA; c.lineCap = "round"; c.lineWidth = 8;
  for (let m = 0; m < Math.min(n, RAYAS.length); m++) {
    const g = Math.floor(m / 5), f = Math.floor(g / 5), gx = g % 5, q = m % 5, R = RAYAS[m];
    const x = xG(gx), y = yF(f);
    const age = t - (t0.anios - .2 + (t0.finF - t0.anios + .3) * Math.acos(1 - 2 * m / 40) / Math.PI);
    const k = ease.outCubic(clamp(age / .09) || 1);
    c.beginPath();
    if (q < 4) { const xx = x + q * 27 + R[0]; c.moveTo(xx, y - 62 + R[1]); c.lineTo(xx + R[2] * 40 * k, y - 62 + 124 * k + R[1]); }
    else { c.moveTo(x - 20 + R[0], y + 52 + R[1]); c.lineTo(x - 20 + 128 * k, y + 52 - 112 * k + R[1]); }
    c.stroke();
  }
  rotuloMundo(c, t, t0.escond, "capas escondidas", 540, 578, 116, TINTA, true);
}
function rotuloMundo(c: Ctx, t: number, ini: number, s: string, x: number, y: number, px: number, color: string, it = false) {
  const a = smooth(prog(t, ini - .04, ini + .16));
  if (a > 0) texto(c, s, x, y + (1 - ease.outCubic(prog(t, ini - .04, ini + .3))) * 18, { fuente: serif(px, it), color, alfa: a });
}

function hoja(c: Ctx, t: number) {
  const entra = ease.outExpo(prog(t, t0.durante - .22, t0.durante + .34));
  const sale = ease.inOutCubic(prog(t, t0.sol + .1, t0.sol + .95));
  if (entra <= 0 || sale >= 1) return;
  const dx = (1 - entra) * -1300;
  const mitad = (lado: number) => {
    const d = dx + lado * sale * 1250, rot = lado * sale * .13 + .0045 * Math.sin(t * 2.3) + .0025 * Math.sin(t * 5.1);
    c.save(); c.translate(d + 540, 780); c.rotate(rot); c.translate(-540, -780);
    // sombra propia: la hoja está encima del dibujo
    if (sale <= 0) {
      const g = c.createLinearGradient(0, YH0 - 26, 0, YH0); g.addColorStop(0, "rgba(20,18,14,0)"); g.addColorStop(1, "rgba(20,18,14,.16)");
      c.fillStyle = g; c.fillRect(-300, YH0 - 26, 1700, 26);
      const h = c.createLinearGradient(0, YH1, 0, YH1 + 30); h.addColorStop(0, "rgba(20,18,14,.2)"); h.addColorStop(1, "rgba(20,18,14,0)");
      c.fillStyle = h; c.fillRect(-300, YH1, 1700, 30);
    }
    c.beginPath();
    const borde = lado < 0 ? -320 : 1420;
    c.moveTo(borde, YH0); for (const [x, y] of RASGA) c.lineTo(x, clamp(y, YH0, YH1)); c.lineTo(borde, YH1); c.closePath(); c.clip();
    contenidoHoja(c, t);
    c.restore();
  };
  mitad(-1); mitad(1);
}

// ---------- la cadena, por debajo de todo ----------
const Y_CADENA = 2000;
function fraccion(c: Ctx, a: string, b: string, x: number, y: number, color: string, px = 82) {
  texto(c, a, x, y - 22, { fuente: mono(px), color });
  c.fillStyle = color; c.fillRect(x - 86, y - 7, 172, 7);
  texto(c, b, x, y + 80, { fuente: mono(px), color });
}
function eslabon(c: Ctx, x: number, y: number, rx: number, ry: number, g: number, rojoK: number) {
  const elipse = (rr: number) => { c.beginPath(); c.ellipse(x, y, rx * rr, ry * rr, 0, 0, 7); };
  c.strokeStyle = TINTA; c.lineWidth = g; elipse(1); c.stroke();
  c.strokeStyle = "#4b4a47"; c.lineWidth = g * .26; elipse(1); c.stroke();
  if (rojoK > 0) { c.save(); c.globalAlpha = rojoK; c.strokeStyle = ACENTO; c.lineWidth = g; elipse(1); c.stroke(); c.restore(); }
}
function cadena(c: Ctx, t: number) {
  const age = t - (t0.debajo + .42);
  if (age < 0 || t > t0.hizo + 1) return;
  const cae = resorte(age, 2.2, .34), giroC = .1 * Math.exp(-age * .55) * Math.sin(age * 3.1) + .012 * Math.sin(t * 1.3);
  const Y0 = Y_CADENA - 80 - (1 - cae) * 1500;
  c.save(); c.translate(540, Y0); c.rotate(giroC); c.translate(-540, -Y0);
  c.lineCap = "round";
  const YS = [Y0 + 340, Y0 + 742, Y0 + 1144], F: [string, string][] = [["∂h", "∂w"], ["∂y", "∂h"], ["∂E", "∂y"]];
  const dur = t0.prepa - t0.regla + .1;
  const enc = (i: number) => smooth(prog(t, t0.regla - .12 + (2 - i) * dur / 3, t0.regla - .12 + (3 - i) * dur / 3));
  // de la que cuelga
  c.strokeStyle = TINTA; c.lineWidth = 20; c.beginPath(); c.moveTo(540, Y0 - 1000); c.lineTo(540, YS[0] - 160); c.stroke();
  YS.forEach((y, i) => {
    if (i < 2) {
      // eslabón de canto entre dos de frente
      const my = (y + YS[i + 1]) / 2;
      c.strokeStyle = TINTA; c.lineWidth = 30; c.beginPath(); c.moveTo(540, my - 66); c.lineTo(540, my + 66); c.stroke();
      c.strokeStyle = "#4b4a47"; c.lineWidth = 7; c.beginPath(); c.moveTo(540, my - 66); c.lineTo(540, my + 66); c.stroke();
      if (enc(i) > 0) { c.save(); c.globalAlpha = enc(i); c.strokeStyle = ACENTO; c.lineWidth = 30; c.beginPath(); c.moveTo(540, my - 66); c.lineTo(540, my + 66); c.stroke(); c.restore(); }
    }
    eslabon(c, 540, y, 198, 158, 30, enc(i));
    fraccion(c, F[i][0], F[i][1], 540, y, enc(i) > .5 ? ACENTO : TINTA);
  });
  c.restore();
}

// ---------- el artículo: solo texto ----------
const Y_CITA = 4000;
function cita(c: Ctx, D: Datos, t: number) {
  if (t < t0.hizo - 1 || t > t0.cadavez + .6) return;
  const Y = Y_CITA, sale = smooth(prog(t, t0.uno - .05, t0.uno + .42));
  // Mientras se cuenta la historia, la red no se detiene.
  c.save(); c.translate(540, Y + 1530); c.scale(.42, .42); c.translate(-540, -1440);
  laRed(c, D, t);
  const fc = cicloDe(t);
  if (fc) cuentasCiclo(c, D, fc.f);
  c.strokeStyle = TINTA; c.lineWidth = 4; c.lineCap = "butt"; c.beginPath(); c.moveTo(540, 1298); c.lineTo(540, YR); c.stroke();
  recta(c, t, 1);
  c.restore();
  const L = ["Learning", "representations", "by back-propagating", "errors"];
  const cps = 30, ini = t0.hizo + .3, F = serif(102, true), y0 = Y + 240, dy = 106;
  let antes = 0;
  L.forEach((s, i) => {
    const q = Math.floor(clamp((t - ini) * cps - antes, 0, s.length));
    antes += s.length;
    if (q > 0) texto(c, s.slice(0, q), 540, y0 + i * dy, { fuente: F, color: TINTA, alfa: 1 - sale });
  });
  // El propio título dice lo que acabas de ver: propagar errores hacia atrás.
  const roj = smooth(prog(t, t0.anio - .55, t0.anio - .25)) * (1 - sale);
  if (roj > 0) {
    c.font = F; const w = c.measureText(L[2]).width, w0 = c.measureText("by ").width, xs = 540 - w / 2;
    c.save(); c.fillStyle = PAPEL; c.globalAlpha = roj; c.fillRect(xs + w0 - 4, y0 + 2 * dy - 86, w - w0 + 12, 118); c.fillRect(380, y0 + 3 * dy - 74, 320, 100); c.restore();
    texto(c, "back-propagating", xs + w0, y0 + 2 * dy, { fuente: F, color: ACENTO, alin: "left", alfa: roj });
    texto(c, "errors", 540, y0 + 3 * dy, { fuente: F, color: ACENTO, alfa: roj });
  }
  // Autores: el renglón se mide, nada de posiciones a ojo.
  const Fa = serif(78), yA = Y + 690, aA = smooth(prog(t, t0.anio - .9, t0.anio - .65)), GR = "#5F5D57";
  c.font = Fa;
  const a = "Rumelhart, ", b = "Hinton", z = " y Williams", wa = c.measureText(a).width, wb = c.measureText(b).width, wz = c.measureText(z).width, x0 = 540 - (wa + wb + wz) / 2;
  texto(c, a, x0, yA, { fuente: Fa, color: GR, alin: "left", alfa: aA * (1 - sale) });
  texto(c, z, x0 + wa + wb, yA, { fuente: Fa, color: GR, alin: "left", alfa: aA * (1 - sale) });
  const h = ease.inOutCubic(prog(t, t0.uno + .1, t0.geof + .05)), px = lerp(78, 216, h);
  texto(c, b, lerp(x0 + wa + wb / 2, 540, h), lerp(yA, Y + 520, h), { fuente: serif(px), color: TINTA, alfa: aA });
  if (t >= t0.anio) {
    const k = resorte(t - t0.anio, 3.6, .42), e = lerp(1.5, 1, clamp(k));
    c.save(); c.translate(540, Y + 900); c.scale(e, e);
    texto(c, "1986", 0, 0, { fuente: serif(214), color: TINTA, alfa: smooth(prog(t, t0.anio, t0.anio + .08)) * (1 - sale) });
    c.restore();
    texto(c, "Nature", 540, Y + 990, { fuente: serif(72, true), color: GR, alfa: smooth(prog(t, t0.anio + .4, t0.anio + .6)) * (1 - sale) });
  }
  rotuloMundo(c, t, t0.geof, "Geoffrey", 540, Y + 320, 136, TINTA, true);
  rotuloMundo(c, t, t0.nobel, "Nobel de Física", 540, Y + 700, 118, TINTA, true);
  if (t >= t0.veinte) { const k = resorte(t - t0.veinte, 3.4, .42), e = lerp(1.4, 1, clamp(k)); c.save(); c.translate(540, Y + 920); c.scale(e, e); texto(c, "2024", 0, 0, { fuente: serif(200), color: ACENTO, alfa: smooth(prog(t, t0.veinte, t0.veinte + .1)) }); c.restore(); }
}

// ---------- el negro: solo lo que regresa ----------
function negro(c: Ctx, D: Datos, t: number) {
  c.fillStyle = NOCHE; c.fillRect(0, 0, 1080, 1920);
  const age = t - t0.corte, z = 1 + age * .012, dy = 60;
  c.save(); c.translate(540, 960 + dy); c.scale(z, z); c.translate(-540, -960);
  c.strokeStyle = LUZ; c.lineCap = "round";
  for (const e of D.aristas) { c.globalAlpha = .1 + .14 * clamp(e.w * 1.6); c.lineWidth = 1.4 + 4 * e.w; trazo(c, e); }
  c.globalAlpha = 1;
  for (const f of D.nodos) for (const n of f) { c.fillStyle = NOCHE; c.beginPath(); c.arc(n.px, n.py, n.r * n.s, 0, 7); c.fill(); circuloMano(c, n.px, n.py, n.r * n.s, t, n.sem, 3.5, LUZ, .24); }
  const sube = ease.inOutSine(prog(t, t0.regresar + .02, t0.vino - .05)) * 4;
  const late = 1 + .3 * Math.exp(-((Math.max(t - t0.corte, 0) * 1.5) % 1) * 5);
  c.fillStyle = ACENTO; c.beginPath(); c.arc(540, 1240, 14 * (t < t0.regresar ? late : 1) + sube * 2, 0, 7); c.fill();
  let hx = 540, hy = 1240;
  D.ruta.forEach((e, i) => {
    const k = clamp(sube - i);
    if (k <= 0) return;
    rojo(c, e, k, 15 - i * 1.6, t);
    const q = (NP - 1) * (1 - k), j = Math.floor(q);
    hx = e.X[j]; hy = e.Y[j];
    if (k >= 1) { c.fillStyle = ACENTO; c.beginPath(); c.arc(e.a.px, e.a.py, 15, 0, 7); c.fill(); }
  });
  if (t >= t0.regresar && sube < 4) {
    const g = c.createRadialGradient(hx, hy, 0, hx, hy, 150);
    g.addColorStop(0, "rgba(232,110,74,.6)"); g.addColorStop(.3, "rgba(192,68,42,.22)"); g.addColorStop(1, "rgba(192,68,42,0)");
    c.fillStyle = g; c.beginPath(); c.arc(hx, hy, 150, 0, 7); c.fill();
  }
  c.restore();
  rotulo(c, t, t0.donde, 99, "por donde vino", 196, 124, LUZ, true);
}

// ---------- el mundo ----------
type Clave = { t: number; ax: number; ay: number; sx: number; sy: number; z: number; d: number; cur: (x: number) => number };
const C = (t: number, ax: number, ay: number, sx: number, sy: number, z: number, d = 1, cur = ease.inOutCubic): Clave => ({ t, ax, ay, sx, sy, z, d, cur });
const ZDIAL = 2.25;
const CLAVES: Clave[] = [
  C(0, 540, 1440, 540, 1500, .94),
  C(t0.tiene - .14, 540, 1440, 540, 1490, .172, 2.05),
  C(t0.una - .1, 540, 1440, 540, 1480, .3, 1.9),
  C(t0.porque - .24, 540, 1240, 540, 1130, 1.3, .85, ease.outExpo),
  C(t0.las - .25, 540, 1440, 540, 1500, 1, 1),
  C(t0.durante + .3, 540, 1440, 540, 1516, 1.05, 3.6, ease.inOutSine),
  C(t0.sol - .1, 540, 1440, 540, 1500, 1, .8),
  C(t0.vuelve, 540, 1240, 540, 1130, 1.42, .001),
  C(t0.quien2 - .1, 540, 1180, 540, 1100, 1.28, 1.5),
  C(t0.cada - .1, 540, 960, 540, 880, 1.18, 1.7),
  C(t0.capa - .3, 540, 660, 540, 800, 1.12, 1.3),
  C(t0.hasta - .15, 540, 470, 540, 700, 1.1, 1),
  C(t0.principio + .15, 540, 1440, 540, 1500, 1, 1.3),
  C(t0.sabe - .08, 540, 1190, 540, 700, ZDIAL, .62, ease.outExpo),      // tres perillas de cerca: las mismas tres conexiones de antes
  C(t0.moverse - .14, 540, 1440, 540, 1500, 1, .44, ease.inOutCubic),   // y de golpe la red entera
  C(t0.aesto - .45, 540, 780, 540, 480, .62, 1),
  C(t0.debajo - .12, 540, 2960, 540, 960, 1, .95),
  C(t0.hizo - .15, 540, 4960, 540, 960, 1, .9),
  C(t0.cadavez - .5, 540, 1440, 540, 1500, 1, .62, ease.inOutCubic),
  C(t0.solo, 540, 1440, 540, 1558, 1, 1.4),
  C(t0.aprender - .95, 540, 780, 540, 480, .62, .95),
];
function camaraEn(t: number) {
  if (t < t0.tiene - .14) {
    // Apertura: la cámara cae con la bola y se abre justo para ver dónde pega.
    const k = ease.inOutCubic(prog(t, t0.golpe - .5, t0.golpe - .04)), z = lerp(1.62, .94, k), [bx] = bolaAp(Math.min(t, t0.golpe));
    const cy0 = lerp(170, 1190, clamp(t / 1.3));
    return { cx: lerp(540 + (bx - 540) * .4, 540, k), cy: lerp(cy0, 1440 - 540 / .94, k), z };
  }
  const k0 = CLAVES[0];
  let ax = k0.ax, ay = k0.ay, sx = k0.sx, sy = k0.sy, z = k0.z;
  for (let i = 1; i < CLAVES.length; i++) {
    const q = CLAVES[i];
    if (t < q.t) break;
    const k = q.cur(prog(t, q.t, q.t + q.d));
    ax = lerp(ax, q.ax, k); ay = lerp(ay, q.ay, k); sx = lerp(sx, q.sx, k); sy = lerp(sy, q.sy, k); z = z * (q.z / z) ** k;
  }
  return { cx: ax - (sx - 540) / z, cy: ay - (sy - 960) / z, z };
}

function polvo(c: Ctx, t: number) {
  const r = azar(9);
  for (let i = 0; i < 46; i++) {
    const x0 = r() * 1180 - 50, y0 = r() * 2040, v = 22 + r() * 46, f = r() * 6.28, a = r(), roj = i % 3 === 0;
    const y = ((y0 - t * v) % 2040 + 2040) % 2040 - 60, x = x0 + Math.sin(t * .5 + f) * 26;
    c.fillStyle = roj ? ACENTO : TINTA; c.globalAlpha = .05 + a * (roj ? .16 : .08);
    c.beginPath(); c.arc(x, y, 2 + a * 3.4, 0, 7); c.fill();
  }
  c.globalAlpha = 1;
}

/** La red con lo que le toque en este instante: el recorrido largo, una vuelta o la pregunta. */
function laRed(c: Ctx, D: Datos, t: number) {
  const f = cicloDe(t);
  const enHeroe = t >= t0.vuelve && t < t0.mueve + 1;
  const enPreg = t >= t0.preg;
  const paso = f ? f.c.de : enPreg ? 8 : 0;
  const drena = 1 - smooth(prog(t, t0.mueve + .05, t0.mueve + .8));
  const seca = f ? 1 - smooth(prog(f.f, .86, 1)) : 1;
  let tinta = 1;
  if (t >= t0.solo - .3) tinta = lerp(1, .32, smooth(prog(t, t0.solo - .3, t0.solo + .3)));
  if (t >= t0.aprender - .4) tinta = lerp(tinta, .6, smooth(prog(t, t0.aprender - .4, t0.aprender + .4)));
  const finRojoC = 1 - smooth(prog(t, t0.fin + .5, t0.dur - .2));
  // "Nunca se enteran": las capas de en medio se apagan, no hay nada que les llegue.
  const dormidas = smooth(prog(t, t0.medio - .1, t0.medio + .3)) * (1 - smooth(prog(t, t0.durante, t0.durante + .3)));
  const pesan = ease.outCubic(prog(t, t0.pesaron - .12, t0.pesaron + .25)) * (1 - smooth(prog(t, t0.les + .1, t0.les + .9)));
  dibujaRed(c, D, t, {
    tinta, paso,
    tintaN: (n) => (n.l >= 1 && n.l <= 3 ? 1 - .62 * dormidas : 1),
    engorda: (e) => (e.l === 3 && e.i > 0 ? pesan * 12 : 0),
    frente: (e) => (enHeroe ? frenteHeroe(e, t) : f ? frenteCiclo(e, f.f) : enPreg ? frentePreg(e, t) : 0),
    escala: enHeroe ? drena : enPreg ? finRojoC : seca,
    nucleo: (n) => (enHeroe ? nucleoHeroe(n, t, D) * drena : f ? prog(f.f, .3 + (4 - n.l) * .125 - .02, .3 + (4 - n.l) * .125 + .05) * seca : 0),
  });
}

function mundo(c: Ctx, D: Datos, t: number, z: number) {
  const mallaA = smooth(prog(t, t0.tiene, t0.tiene + 1.2)) * (1 - smooth(prog(t, t0.porque - .3, t0.porque + .15)));
  if (mallaA > .003) {
    c.save(); c.globalAlpha = mallaA * .3; c.strokeStyle = TINTA; c.lineWidth = 1.05 / z; c.lineCap = "butt";
    c.stroke(D.malla[Math.floor(t * 8) % 3]);
    c.restore();
    // la señal que baja por millones de caminos y termina en un punto
    c.fillStyle = TINTA;
    D.gotas.forEach((g, i) => {
      const n = g.length / 2 - 1, ini = t0.mill - .1 + (i % 97) / 97 * (t0.una - t0.mill + .3), u = (t - ini) / 1.7;
      if (u <= 0 || u >= 1) return;
      const q = u * u * n, j = Math.min(n - 1, Math.floor(q)), f = q - j, x = lerp(g[j * 2], g[j * 2 + 2], f), y = lerp(g[j * 2 + 1], g[j * 2 + 3], f), r = 2.7 / z;
      c.globalAlpha = mallaA * .9; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    });
    c.globalAlpha = 1;
  }

  const verRed = t < t0.debajo + 1 || t > t0.cadavez - .6;
  if (verRed) {
    laRed(c, D, t);
    if (t >= t0.quien2 - .1 && t < t0.les + .3) cuentas(c, D, t, t0.quien2 - .05, t0.les);
    if (cicloDe(t)) cuentasCiclo(c, D, cicloDe(t)!.f);
    if (t >= t0.conex - .1 && t < t0.mueve + 1.6) {
      const arco = ease.inOutCubic(prog(t, t0.sabe + .02, t0.cuanto + .3)) * (1 - smooth(prog(t, t0.mueve + .35, t0.mueve + .7)));
      const fuera = 1 - smooth(prog(t, t0.mueve + .95, t0.mueve + 1.5));
      const ver = (e: Arista) => { const a0 = -1.3 + e.w * 3; return [a0 + giro(e, t), a0 + e.dw[0] * KGIRO]; };
      for (const e of D.aristas) {
        const pop = t > t0.mueve ? .55 * Math.exp(-(t - t0.mueve) * 6.5) : 0;
        const R = e.rd * clamp(resorte(t - (t0.conex - .1) - (e.a.y - 300) / 1000 * .55 - (e.id % 7) * .012, 5, .5), 0, 1.2) * (1 + pop);
        const [a, b] = ver(e);
        dial(c, e.xp, e.yp, R, a, b, arco, fuera);
      }
    }
    // tallo: de la recta a la neurona de salida
    c.strokeStyle = TINTA; c.lineWidth = 4; c.lineCap = "butt"; c.beginPath(); c.moveTo(540, 1240 + 58); c.lineTo(540, YR); c.stroke();
    tallo(c, D, t);
    recta(c, t, 1);
    ondas(c, t);
    if (t > t0.esta && t < t0.empujo) circuloMano(c, 540, 1240, 84, t, 5, 8, ACENTO, 1 - smooth(prog(t, t0.empujo - .5, t0.empujo)), 1.1 * ease.outCubic(prog(t, t0.esta, t0.esta + .5)));
    if (t > t0.otra && t < t0.nada) {
      const e = D.aristas.find((q) => q.l === 3 && q.i === 0)!, j = Math.floor(NP * .52);
      circuloMano(c, e.X[j], e.Y[j], 50, t, 8, 6, TINTA, 1 - smooth(prog(t, t0.nada - .24, t0.nada - .04)), 1.1 * ease.outCubic(prog(t, t0.otra, t0.otra + .4)));
    }
    if (t >= t0.preg) preguntas(c, D, t);
    hoja(c, t);
  }
  cadena(c, t);
  cita(c, D, t);
}

function pantalla(c: Ctx, t: number) {
  // ---------- apertura ----------
  const fueraA = 1 - smooth(prog(t, t0.tiene - .05, t0.tiene + .3));
  if (fueraA > 0) {
    const g = c.createLinearGradient(0, 300, 0, 470);
    g.addColorStop(0, "rgba(244,242,236,.97)"); g.addColorStop(1, "rgba(244,242,236,0)");
    c.save(); c.globalAlpha = fueraA; c.fillStyle = "rgba(244,242,236,.97)"; c.fillRect(-60, -60, 1200, 360); c.fillStyle = g; c.fillRect(-60, 300, 1200, 170); c.restore();
  }
  texto(c, "Tu red", 540, 200, { fuente: serif(158), color: TINTA, alfa: fueraA });
  if (t >= t0.equi - .12) {
    const k = resorte(t - t0.golpe + .05, 4, .4);
    c.save(); c.translate(540, 340); const e = lerp(1.2, 1, clamp(k)); c.scale(e, e);
    texto(c, "se equivocó.", 0, 0, { fuente: serif(142, true), color: ACENTO, alfa: smooth(prog(t, t0.equi - .12, t0.equi + .1)) * fueraA });
    c.restore();
  }

  // ---------- millones, una sola ----------
  const velo = (y0: number, y1: number, a: number) => {
    if (a <= .01) return;
    const g = c.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, "rgba(244,242,236,0)"); g.addColorStop(.2, "rgba(244,242,236,.94)"); g.addColorStop(.8, "rgba(244,242,236,.94)"); g.addColorStop(1, "rgba(244,242,236,0)");
    c.save(); c.globalAlpha = a; c.fillStyle = g; c.fillRect(-60, y0, 1200, y1 - y0); c.restore();
  };
  const aMill = smooth(prog(t, t0.mill - .05, t0.mill + .25)) * (1 - smooth(prog(t, t0.quien - .4, t0.quien - .1)));
  velo(-320, 500, aMill);
  rotulo(c, t, t0.mill - .05, t0.quien - .1, "millones", 280, 190, TINTA, true);
  rotulo(c, t, t0.mill + .4, t0.quien - .1, "de conexiones", 400, 104, TINTA);
  rotulo(c, t, t0.una, t0.quien - .1, "una sola respuesta mala", 1570, 92, ACENTO, true);

  // ---------- la pregunta ----------
  if (t >= t0.quien - .1 && t < t0.porque + .1) {
    const salir = 1 - smooth(prog(t, t0.porque - .42, t0.porque - .24));
    velo(-420, 1170, salir * smooth(prog(t, t0.quien - .1, t0.quien + .1)));
    const cae = (s: string, y: number, px: number, ti: number, color: string, it: boolean) => {
      const k = resorte(t - ti + .04, 4.6, .44);
      if (t < ti - .04) return;
      c.save(); c.translate(540, y); const e = lerp(1.7, 1, clamp(k)); c.scale(e, e);
      texto(c, s, 0, 0, { fuente: serif(px, it), color, alfa: smooth(prog(t, ti - .04, ti + .05)) * salir });
      c.restore();
    };
    cae("¿De quién", 580, 200, t0.quien, TINTA, false);
    cae("fue la", 738, 150, t0.fue, TINTA, false);
    cae("culpa?", 994, 306, t0.culpa, ACENTO, true);
  }

  rotulo(c, t, t0.error - .06, t0.salida - .2, "error", 1520, 120, ACENTO, true);
  rotulo(c, t, t0.salida - .12, t0.las - .25, "solo en la salida", 1520, 112, ACENTO, true);
  rotulo(c, t, t0.nunca - .08, t0.durante + .25, "nunca se enteran", 240, 112, TINTA, true);
  rotulo(c, t, t0.gran - .1, t0.finF + .55, "el gran problema", 240, 116, TINTA, false);
  rotulo(c, t, t0.casi - .05, t0.corte + 1, "casi infantil", 240, 132, ACENTO, true);

  rotulo(c, t, t0.dijo - .06, t0.empujo - .3, "dijo mal", 1140, 104, ACENTO, true, 824);
  rotulo(c, t, t0.mas - .05, t0.cada + .1, "más culpa", 1176, 92, ACENTO, true, 800);
  rotulo(c, t, t0.nada - .05, t0.cada + .1, "casi nada", 1168, 92, TINTA, true, 200);

  // De cerca: lo que cada una de las tres debe moverse, tal cual sale de la cuenta.
  const zoomA = smooth(prog(t, t0.sabe, t0.sabe + .24)) * (1 - smooth(prog(t, t0.moverse - .3, t0.moverse - .1)));
  if (zoomA > 0) {
    const g = c.createLinearGradient(0, 420, 0, 540);
    g.addColorStop(0, "rgba(244,242,236,.985)"); g.addColorStop(1, "rgba(244,242,236,0)");
    c.save(); c.globalAlpha = zoomA; c.fillStyle = "rgba(244,242,236,.985)"; c.fillRect(-60, -60, 1200, 480); c.fillStyle = g; c.fillRect(-60, 420, 1200, 120); c.restore();
    const lista: [number, number][] = [[0, 232], [1, 536], [2, 862]];
    lista.forEach(([i, x], n) => {
      const v = (red.pasos[0].dw[3][i][0]).toFixed(3).replace("-", "−");
      texto(c, v, x, 404, { fuente: mono(62), color: i === 0 ? TINTA : ACENTO, alfa: zoomA * smooth(prog(t, t0.exact + .25 + n * .14, t0.exact + .45 + n * .14)) });
    });
  }
  rotulo(c, t, t0.sabe + .24, t0.moverse - .42, "exactamente cuánto", 250, 112, TINTA, true);
  rotulo(c, t, t0.cadavez + .75, t0.cadavez + 1.45, "una cara", 240, 122, TINTA, true);
  rotulo(c, t, t0.cadavez + 1.5, t0.cadavez + 2.2, "una voz", 240, 122, TINTA, true);
  rotulo(c, t, t0.cadavez + 2.25, t0.cadavez + 3.1, "un idioma", 240, 122, TINTA, true);

  // ---------- el nombre: se escribe al revés ----------
  if (t >= t0.retro - .3 && t < t0.debajo + .2) {
    const f = 1 - smooth(prog(t, t0.debajo - .28, t0.debajo + .02));
    const k = prog(t, t0.retro - .3, t0.retro + 1.05);
    const xf = alReves(c, "retropropagación", 540, 1170, serif(136, true), ACENTO, k, f);
    if (k < 1) { c.fillStyle = ACENTO; c.globalAlpha = f; c.fillRect(xf, 1200, 972 - xf, 7); c.globalAlpha = 1; }
    alReves(c, "backpropagation", 540, 1340, serif(120), TINTA, prog(t, t0.back - .2, t0.back + .7), f);
  }

  rotulo(c, t, t0.regla - .05, t0.hizo - .2, "la regla de la cadena", 1462, 100, TINTA, true);
  rotulo(c, t, t0.prepa - .05, t0.hizo - .2, "cálculo de prepa", 1566, 84, TINTA);

  rotulo(c, t, t0.nadie1 - .05, t0.nadie2 - .25, "Nadie la regaña.", 240, 118, TINTA);
  rotulo(c, t, t0.nadie2 - .05, t0.solo - .2, "Nadie le explica.", 240, 118, TINTA);
  rotulo(c, t, t0.pregunta - .1, t0.cuanto2 - .2, "una pregunta", 240, 124, TINTA, true);
  rotulo(c, t, t0.cuanto2 - .05, t0.aprender - .95, "¿cuánto fue", 180, 128, TINTA, true);
  rotulo(c, t, t0.cuanto2 + .4, t0.aprender - .95, "culpa tuya?", 318, 128, ACENTO, true);

  // ---------- cierre ----------
  if (t >= t0.aprender - .1) {
    const a = smooth(prog(t, t0.aprender - .06, t0.aprender + .16));
    texto(c, "Aprender,", 540, 1040, { fuente: serif(104), color: TINTA, alfa: a });
    texto(c, "para una máquina,", 540, 1150, { fuente: serif(104), color: TINTA, alfa: smooth(prog(t, t0.aprender + .45, t0.aprender + .65)) });
    texto(c, "es repartir bien", 540, 1296, { fuente: serif(134, true), color: TINTA, alfa: smooth(prog(t, t0.repartir - .25, t0.repartir)) });
    const b = resorte(t - t0.bien - .12, 3.2, .5);
    c.save(); c.translate(540, 1506); const e = lerp(.9, 1, clamp(b)); c.scale(e, e);
    texto(c, "la culpa.", 0, 0, { fuente: serif(216, true), color: ACENTO, alfa: smooth(prog(t, t0.bien + .1, t0.bien + .34)) });
    c.restore();
  }
}

function dibuja(c: CanvasRenderingContext2D, t: number, D: Datos) {
  fija(D, t);
  if (t >= t0.corte && t < t0.vuelve) { negro(c, D, t); return; }
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  polvo(c, t);
  // golpe del impacto y de la pregunta
  const sac = (ti: number, a: number) => (t > ti ? a * Math.exp(-(t - ti) * 9) * Math.sin((t - ti) * 62) : 0);
  const sh = sac(t0.golpe, 12) + sac(t0.culpa, 16) + sac(t0.mueve, 13);
  const cam = camaraEn(t), br = 1 + .012 * Math.sin(t * .83), dx = 9 * Math.sin(t * .71) + sh, dy = 11 * Math.cos(t * .61) + sh * .6;
  c.save(); c.translate(540 + dx, 960 + dy); c.rotate(.0055 * Math.sin(t * .47)); c.scale(cam.z * br, cam.z * br); c.translate(-cam.cx, -cam.cy);
  mundo(c, D, t, cam.z * br);
  c.restore();
  c.save(); c.translate(540 + dx * .5, 960 + dy * .5); c.scale(1 + .006 * Math.sin(t * .6), 1 + .006 * Math.sin(t * .6)); c.translate(-540, -960);
  pantalla(c, t);
  c.restore();
}

export const Pieza: React.FC = () => <Lienzo dibuja={dibuja} preparar={construye} />;
