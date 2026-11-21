// Serie 2, capítulo 21: las cuatro preguntas. Un canal de agua de papel con cuatro esclusas en fila. Cada tarea es
// un barquito de papel con la bola con manos encima; cada esclusa es una pregunta con su compuerta y su seña:
// 1 una palomita que se puede marcar, 2 una flecha de regreso, 3 un marco por el que hay que caber, 4 una balanza.
// Abre con dos letreros de vendedor que gritan y se rompen; las compuertas se levantan del agua como un libro
// desplegable. Cada ejemplo pasa por su esclusa. Luego la cámara sube y las cuatro quedan apiladas como un
// semáforo: el error de código pasa con cuatro luces verdes, el dinero de la empresa se atora en la segunda.
// Cierra en la orilla: la regla que mide lo inteligente se tacha, el barco lleva una etiqueta de precio y se hunde
// sin ruido; la etiqueta queda flotando. Todos los instantes vienen de eventos.json (partitura.py).
import React from "react";
import { azar, Cam, camara, clamp, ease, guionCamara, lerp, prog, resorte, smooth, texto, Vista } from "../../kit";
import { ACENTO, bola, GRIS, Lienzo, LUZ, mono, PAPEL, serif, sombra, TINTA } from "../../marca";
import { agente } from "../../personaje";
import duracion from "./duracion.json";
import ev from "./eventos.json";

export const DURACION = duracion.dur;
type C = CanvasRenderingContext2D;
type P3 = [number, number, number];
type Pt = { x: number; y: number; s: number; zc: number };

// ---------- herramientas ----------
let K: Cam;
let FR = 0;
let TY = 0, N0 = 4, N1 = 8;                      // niebla de papel, relativa al objetivo de la cámara
const P = (v: P3): Pt | null => K.p(v[0], v[1], v[2]);
const frac = (x: number) => x - Math.floor(x);
const tiembla = (j: number) => frac(Math.sin(j * 12.9898 + FR * 78.233) * 43758.5453) - .5;
const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * 6.2832 + f);
const ventana = (t: number, a: number, b: number, fi = .25, fo = .3) => smooth(prog(t, a, a + fi)) * (1 - smooth(prog(t, b, b + fo)));
const L3 = (a: P3, b: P3, k: number): P3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const suma3 = (a: P3, b: P3, k = 1): P3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const niebla = (y: number) => 1 - .96 * smooth(prog(y - TY, N0, N1));
const cerca = (p: Pt | null) => (p ? smooth(prog(p.zc, 1.8, 3.1)) : 0);
function tramos(t: number, v0: number, S: [number, number, number, ((x: number) => number)?][]) {
  let v = v0;
  for (const [a, b, x, f] of S) { if (t <= a) break; v = lerp(v, x, (f ?? ease.inOutCubic)(prog(t, a, b))); }
  return v;
}
function linea(c: C, ax: number, ay: number, bx: number, by: number) { c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); }
function circulo(c: C, x: number, y: number, r: number) { c.beginPath(); c.arc(x, y, Math.max(r, .01), 0, 6.2832); c.fill(); }

function poli(c: C, Q: P3[], fill: string | null, tinta: string | null = TINTA, g = 2.4, vib = .8) {
  const pts: Pt[] = [];
  for (const q of Q) { const p = P(q); if (!p) return; pts.push(p); }
  c.beginPath();
  pts.forEach((p, i) => {
    const j = Q[i][0] * 3.1 + Q[i][1] * 5.7 + Q[i][2] * 2.3;
    const x = p.x + tiembla(j) * vib, y = p.y + tiembla(j + 40) * vib;
    if (i) c.lineTo(x, y); else c.moveTo(x, y);
  });
  c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (tinta) { c.strokeStyle = tinta; c.lineWidth = g; c.lineJoin = "round"; c.stroke(); }
}
function lin(c: C, a: P3, b: P3, g: number, color = TINTA, vib = .8) {
  const A = P(a), B = P(b); if (!A || !B) return;
  const j = a[0] * 2.1 + a[1] * 4.3 + b[2] * 1.7;
  c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round"; c.beginPath();
  c.moveTo(A.x + tiembla(j) * vib, A.y + tiembla(j + 9) * vib); c.lineTo(B.x + tiembla(j + 3) * vib, B.y + tiembla(j + 13) * vib); c.stroke();
}
/** Dibuja en unidades locales (100 = 1 unidad de mundo) sobre un plano: o es el origen, ux y vy los ejes. */
function plano(c: C, o: P3, ux: P3, vy: P3, f: () => void) {
  const a = P(o), b = P(suma3(o, ux)), d = P(suma3(o, vy));
  if (!a || !b || !d) return;
  c.save(); c.transform((b.x - a.x) / 100, (b.y - a.y) / 100, (d.x - a.x) / 100, (d.y - a.y) / 100, a.x, a.y); f(); c.restore();
}
/** Recorte siempre de frente a la cámara, en unidades locales (100 = 1 unidad). */
function at(c: C, w: P3, f: () => void, giro = 0, k = 1) {
  const p = P(w); if (!p) return;
  c.save(); c.translate(p.x, p.y); c.rotate(giro); const e = p.s / 100 * k; c.scale(e, e); f(); c.restore();
}
/** Recorta al semiplano de la recta AB que contiene a ref. */
function semiplano(c: C, A: Pt, B: Pt, ref: Pt) {
  const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
  let nx = -uy, ny = ux;
  if ((ref.x - A.x) * nx + (ref.y - A.y) * ny < 0) { nx = -nx; ny = -ny; }
  const F = 4000;
  c.beginPath(); c.moveTo(A.x - ux * F, A.y - uy * F); c.lineTo(A.x + ux * F, A.y + uy * F); c.lineTo(A.x + ux * F + nx * F, A.y + uy * F + ny * F); c.lineTo(A.x - ux * F + nx * F, A.y - uy * F + ny * F); c.closePath(); c.clip();
}
function ajusta(c: C, s2: string, px: number, max: number, it = false) { c.font = serif(px, it); const w = c.measureText(s2).width; return w > max ? px * max / w : px; }
function titulo(c: C, t: number, a: number, b: number, s2: string, y: number, px: number, color = TINTA, it = false) {
  const al = smooth(prog(t, a - .04, a + .16)) * (1 - smooth(prog(t, b, b + .22)));
  if (al <= 0) return;
  texto(c, s2, 530, y + (1 - ease.outCubic(prog(t, a - .04, a + .32))) * 18, { fuente: serif(ajusta(c, s2, px, 860, it), it), color, alfa: al });
}

// ---------- el mundo (x a la derecha, y canal adentro, z hacia arriba) ----------
const CW = 1.3, ZB = .42, GY = [5, 10, 15, 20], ESP = 1.75;
const VERDE = "#4E7D57", VERDE_C = "#8DB892", ROJO_C = "#E9896C";
const AGUA = "#DCE2DF", AGUA_O = "#C7D0CC", MURO = "#E4DFD2", BLANCO = "#FBFAF6", HUECO = "#D9D3C4";
const LUZD: P3 = (() => { const v: P3 = [-.45, -.62, .78]; const n = Math.hypot(...v); return [v[0] / n, v[1] / n, v[2] / n]; })();
const espera = (i: number) => GY[i] - ESP;

// ---------- cámara ----------
const V = (tx: number, ty: number, tz: number, yaw: number, pitch: number, dist: number): Vista => ({ tx, ty, tz, yaw, pitch, dist });
const VG = (i: number, dx = 0, yaw = .62) => V(-.25 + dx, espera(i) + .2, 1.8, yaw, .2, 6.0);
const VMAPA = V(0, 13.5, 0, .06, 1.12, 21.5);
const CLAVES: { t: number; v: Vista; dur?: number; curva?: (x: number) => number }[] = [
  { t: 0, v: V(-.45, -.55, 1.85, .55, .1, 5.0) },
  { t: .05, v: V(-.4, -.5, 1.9, .5, .1, 4.4), dur: 2.6, curva: ease.outCubic },
  { t: ev.slam2 - .3, v: V(.2, .15, 1.85, .45, .1, 6.1), dur: .55, curva: ease.outCubic },
  { t: ev.rompe - .25, v: V(.05, -.1, 1.7, .5, .15, 6.8), dur: .6, curva: ease.outCubic },
  { t: ev.surgen[0] - .55, v: V(-.65, 6.6, .9, .38, .6, 17), dur: 1.7 },
  { t: ev.zarpa + .3, v: VG(0), dur: 1.9 },
  { t: ev.duda - .2, v: { ...VG(0), dist: 5.5, tz: 2.0 }, dur: 1.6 },
  { t: ev.dos - .3, v: VG(1), dur: .8, curva: ease.outExpo },
  { t: ev.entraD + .2, v: V(.3, GY[1] + .1, 1.4, .5, .4, 7.4), dur: 1.3 },
  { t: ev.tres - .3, v: VG(2), dur: .8, curva: ease.outExpo },
  { t: ev.cuatro - .3, v: VG(3, -.7, .55), dur: .8, curva: ease.outExpo },
  { t: ev.ahora - .3, v: VMAPA, dur: 1.7 },
  { t: ev.regla - .2, v: { ...VMAPA, ty: 15.6 }, dur: 1.0 },
  { t: ev.revisa - .45, v: V(.2, espera(1) + .3, 1.7, .5, .5, 7.2), dur: 1.0 },
  { t: ev.sig - .35, v: V(.1, -1.6, .8, .45, .36, 12.5), dur: 1.6 },
  { t: ev.preg - .45, v: V(-1.25, -10.9, .85, .55, .1, 5.0), dur: 1.3 },
  { t: ev.cuando + .3, v: V(-.85, -10.95, .25, .5, .3, 4.5), dur: 3.6, curva: ease.inOutSine },
];
const IMPACTOS: [number, number][] = [[ev.slam1, 1], [ev.slam2, 1], [ev.rompe + .15, .6], [ev.chap[0], .5], ...ev.surgen.map((x): [number, number] => [x + .1, .35]),
  [ev.no2 + .4, .5], [ev.no3, .4], [ev.golpe, 1.1], [ev.dno, .7], [ev.unno, .25]];
function vista(t: number): Vista {
  const v = guionCamara(t, CLAVES);
  let sac = 0;
  for (const [ti, a] of IMPACTOS) if (t >= ti) sac += a * Math.exp(-(t - ti) * 8);
  return { ...v, tx: v.tx + .05 * vaiven(t, 7.3) + sac * .07 * Math.sin(t * 61), tz: v.tz + .04 * vaiven(t, 5.1, 1) + sac * .06 * Math.cos(t * 53),
    yaw: v.yaw + .016 * vaiven(t, 9.1, 2), pitch: v.pitch + .008 * vaiven(t, 6.7), dist: v.dist * (1 + .016 * vaiven(t, 8.3, .5)) };
}

// ---------- el canal ----------
const RIZOS = (() => { const r = azar(21); return Array.from({ length: 190 }, () => ({ x: (r() * 2 - 1) * (CW - .18), y: r() * 60 - 18, w: .1 + r() * .22, v: .16 + r() * .16 })); })();
const JUNCOS = (() => { const r = azar(8); return Array.from({ length: 150 }, (_, i) => ({ x: (i % 2 ? 1 : -1) * (CW + .5 + r() * 2.6), y: r() * 60 - 18, h: .25 + r() * .5, n: 2 + Math.floor(r() * 3), f: r() * 6.28 })); })();

function canal(c: C, t: number) {
  const pos = K.pos;
  const yn = Math.max(-18, pos[1] + 1.2), yf = 46;
  poli(c, [[-CW, yn, 0], [CW, yn, 0], [CW, yf, 0], [-CW, yf, 0]], AGUA, null);
  if (pos[0] > -CW) poli(c, [[-CW, yn, 0], [-CW, yf, 0], [-CW, yf, ZB], [-CW, yn, ZB]], MURO, null);
  if (pos[0] < CW) poli(c, [[CW, yn, 0], [CW, yf, 0], [CW, yf, ZB], [CW, yn, ZB]], MURO, null);
  // la orilla cercana tapa el agua que no se ve
  if (pos[0] > CW) poli(c, [[CW, yn, ZB], [CW + 4, yn, ZB], [CW + 4, yf, ZB], [CW, yf, ZB]], PAPEL, null);
  if (pos[0] < -CW) poli(c, [[-CW - 4, yn, ZB], [-CW, yn, ZB], [-CW, yf, ZB], [-CW - 4, yf, ZB]], PAPEL, null);
  // sombra del muro sobre el agua
  for (const sx of [-1, 1]) {
    c.save(); c.globalAlpha = .35; poli(c, [[sx * CW, yn, 0], [sx * (CW - .16), yn, 0], [sx * (CW - .16), yf, 0], [sx * CW, yf, 0]], AGUA_O, null); c.restore();
  }
  // bordes a tinta, por tramos para que tiemblen como dibujo
  for (let y = Math.ceil(yn); y < 40; y += 1) {
    const a = niebla(y); if (a < .04) continue;
    c.globalAlpha = a;
    for (const sx of [-1, 1]) {
      lin(c, [sx * CW, y, ZB], [sx * CW, y + 1, ZB], 2.6);
      lin(c, [sx * (CW + .24), y, ZB], [sx * (CW + .24), y + 1, ZB], 1.6, "rgba(17,17,17,.55)");
      if ((sx < 0 && pos[0] > -CW) || (sx > 0 && pos[0] < CW)) lin(c, [sx * CW, y, 0], [sx * CW, y + 1, 0], 1.8, "rgba(17,17,17,.6)");
      lin(c, [sx * CW, y + .5, ZB], [sx * (CW + .24), y + .5, ZB], 1.3, "rgba(17,17,17,.4)");
    }
  }
  c.globalAlpha = 1;
  // rizos que corren canal abajo: el agua nunca está quieta
  c.lineCap = "round";
  for (const r of RIZOS) {
    let y = r.y + t * r.v; y = ((y + 18) % 60 + 60) % 60 - 18;
    if (y < yn + .3) continue;
    const a = niebla(y) * .55; if (a < .03) continue;
    const A = P([r.x - r.w, y, 0]), B = P([r.x + r.w, y, 0]), M = P([r.x, y - .05, 0]); if (!A || !B || !M) continue;
    c.globalAlpha = a * (.5 + .5 * Math.sin(t * 1.3 + r.y));
    c.strokeStyle = "#8E9A96"; c.lineWidth = Math.max(1, A.s * .012);
    c.beginPath(); c.moveTo(A.x, A.y); c.quadraticCurveTo(M.x, M.y - 2, B.x, B.y); c.stroke();
  }
  c.globalAlpha = 1;
}

function juncos(c: C, t: number) {
  c.lineCap = "round";
  const mapa = 1 - smooth(prog(K.v.pitch, .5, .9));
  if (mapa < .02) return;
  for (const j of JUNCOS) {
    const a = niebla(j.y) * mapa; if (a < .05) continue;
    const base = P([j.x, j.y, ZB]); if (!base || base.zc < 2.2) continue;
    c.globalAlpha = a * .8; c.strokeStyle = TINTA; c.lineWidth = Math.max(1, base.s * .011);
    for (let k = 0; k < j.n; k++) {
      const sw = .07 * Math.sin(t * 1.4 + j.f + k) + (k - (j.n - 1) / 2) * .09;
      const tip = P([j.x + sw, j.y, ZB + j.h * (1 - k * .15)]); if (!tip) continue;
      c.beginPath(); c.moveTo(base.x, base.y); c.quadraticCurveTo(base.x, (base.y + tip.y) / 2, tip.x, tip.y); c.stroke();
    }
  }
  c.globalAlpha = 1;
}

// ---------- salpicaduras ----------
function salpica(c: C, x: number, y: number, ts: number, t: number, tam = 1) {
  const e = t - ts; if (e < 0 || e > 1.4) return;
  const p = P([x, y, 0]); if (!p) return;
  const a = niebla(y);
  // anillo en el agua
  for (let k = 0; k < 2; k++) {
    const q = e - k * .18; if (q <= 0) continue;
    const R = (.25 + q * 1.6) * tam;
    c.save(); c.globalAlpha = a * (1 - smooth(prog(q, .2, 1.1))) * .8; c.strokeStyle = TINTA; c.lineWidth = 2; c.beginPath();
    for (let i = 0; i <= 28; i++) { const g = i / 28 * 6.2832, w = P([x + Math.cos(g) * R, y + Math.sin(g) * R * .9, 0]); if (!w) continue; if (i) c.lineTo(w.x, w.y); else c.moveTo(w.x, w.y); }
    c.stroke(); c.restore();
  }
  // gotas
  const r = azar(Math.floor(x * 97 + y * 13 + ts * 7));
  c.fillStyle = TINTA;
  for (let i = 0; i < 16 * tam; i++) {
    const g = r() * 6.28, v = (.6 + r() * 1.4) * tam, up = (2 + r() * 2.6) * tam;
    const z = up * e - 6 * e * e; if (z < 0) continue;
    const w = P([x + Math.cos(g) * v * e, y + Math.sin(g) * v * e * .6, z]); if (!w) continue;
    c.globalAlpha = a * .85; circulo(c, w.x, w.y, Math.max(1.6, w.s * .025 * (1 - e * .5)));
  }
  c.globalAlpha = 1;
}

// ---------- compuertas ----------
type Estado = { alza: number; pop: number; lamp: number; lampCol: string; icono: (c: C, t: number) => void };
const caja = (c: C, R: (v: P3) => P3, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => {
  const pos = K.pos, f = (x: number, y: number, z: number) => R([x, y, z]);
  if (pos[1] < y0) poli(c, [f(x0, y0, z0), f(x1, y0, z0), f(x1, y0, z1), f(x0, y0, z1)], "#F6F3EC");
  if (pos[0] < x0) poli(c, [f(x0, y0, z0), f(x0, y1, z0), f(x0, y1, z1), f(x0, y0, z1)], "#DCD6C8");
  if (pos[0] > x1) poli(c, [f(x1, y0, z0), f(x1, y1, z0), f(x1, y1, z1), f(x1, y0, z1)], "#DCD6C8");
  if (pos[2] > z1) poli(c, [f(x0, y0, z1), f(x1, y0, z1), f(x1, y1, z1), f(x0, y1, z1)], BLANCO);
};

function abertura(i: number, t: number) {
  const A: [number, number][][] = [
    [[ev.abre1, ev.cierra1], [ev.v[0], ev.v[0] + 1.25], [ev.i1, ev.i1 + 1.3]],
    [[ev.abre2, ev.no2 + .4], [ev.v[1], ev.v[1] + 1.25]],
    [[ev.claro + .05, ev.claro + 1.9], [ev.v[2], ev.v[2] + 1.25]],
    [[ev.v[3], ev.v[3] + 1.7]],
  ];
  let a = 0;
  for (const [x, y] of A[i]) a = Math.max(a, ease.inOutCubic(prog(t, x, x + .55)) * (1 - ease.inCubic(prog(t, y, y + .32))));
  return a;
}

function lampara(i: number, t: number): [number, string] {
  if (t < ev.lamparas[i] || t > ev.preg - .3) return [0, "off"];
  if (t >= ev.mover - .4) {
    if (i === 0 && t >= ev.i1) return [1, "v"];
    if (i === 1 && t >= ev.dno) return [1, "r"];
    return [1, "off"];
  }
  if (t >= ev.v[i]) return [1, "v"];
  return [1, "off"];
}

function compuerta(c: C, i: number, t: number) {
  const y0 = GY[i];
  const sube = t < ev.surgen[i] ? 0 : ease.outBack(prog(t, ev.surgen[i], ev.surgen[i] + .5), 1.3);
  if (sube <= .001) return;
  const fi = (1 - sube) * 1.5;                          // de acostada (libro desplegable) a de pie
  const R = (v: P3): P3 => { const dy = v[1] - y0, z = v[2]; return [v[0], y0 + dy * Math.cos(fi) + z * Math.sin(fi), -dy * Math.sin(fi) + z * Math.cos(fi)]; };
  const RV = (v: P3): P3 => { const r = R(v); return [r[0], r[1] - y0, r[2]]; };
  const pc = P([0, y0, 1.5]);
  const a = niebla(y0) * (pc ? smooth(prog(pc.zc, 4.3, 5.6)) : 0);          // la compuerta que la cámara atraviesa se disuelve
  if (a < .01) return;
  c.save(); c.globalAlpha = a;
  const alza = abertura(i, t) * 1.55;
  const XP = CW + .25;
  // pilares y viga
  for (const sx of [-1, 1]) caja(c, R, sx * XP - .2, sx * XP + .2, y0 - .2, y0 + .2, ZB, 3.0);
  // la compuerta: tablas de papel que suben
  const zb = Math.max(-.1 + alza, 0), zt = 1.25 + alza;
  if (zt > 0) {
    poli(c, [R([-CW + .02, y0, zb]), R([CW - .02, y0, zb]), R([CW - .02, y0, zt]), R([-CW + .02, y0, zt])], "#F1ECE0", TINTA, 2.6);
    for (let k = 1; k < 5; k++) { const z = lerp(-.1, 1.25, k / 5) + alza; if (z > zb + .02) lin(c, R([-CW + .06, y0 - .01, z]), R([CW - .06, y0 - .01, z]), 1.3, "rgba(17,17,17,.35)"); }
    if (alza < .2) { c.save(); c.globalAlpha *= .5; poli(c, [R([-CW + .02, y0 - .01, zb]), R([CW - .02, y0 - .01, zb]), R([CW - .02, y0 - .01, zb + .14]), R([-CW + .02, y0 - .01, zb + .14])], AGUA_O, null); c.restore(); }
    // número pintado, tenue
    plano(c, R([-CW, y0 - .02, zt]), RV([1, y0, 0]), RV([0, y0, -1]), () => {
      texto(c, String(i + 1), CW * 100, 108, { fuente: serif(104, true), color: TINTA, alfa: .14 });
    });
    // gotas al subir
    if (alza > .05) {
      const r = azar(40 + i);
      for (let k = 0; k < 14; k++) {
        const x = (r() * 2 - 1) * (CW - .1), ph = r(), e = frac(t * 1.3 + ph), z = zb - e * e * 4;
        if (z < 0) continue;
        const w = P(R([x, y0, z])); if (w) { c.fillStyle = "#6F7C78"; circulo(c, w.x, w.y, Math.max(1.4, w.s * .018)); }
      }
    }
  }
  caja(c, R, -XP - .32, XP + .32, y0 - .2, y0 + .2, 2.68, 3.05);
  // la seña, recargada hacia atrás para leerse desde abajo y desde arriba
  const lam = .32, u: P3 = [0, Math.sin(lam), Math.cos(lam)];
  for (const sx of [-1, 1]) lin(c, R([sx * .42, y0, 3.05]), R([sx * .42, y0 - .06 + u[1] * .3, 3.05 + u[2] * .3]), 3.2);
  const bc: P3 = [0, y0 - .08, 3.12];
  const o: P3 = [-.65, bc[1] + u[1] * 1.3, bc[2] + u[2] * 1.3];
  plano(c, R(o), RV([1, y0, 0]), RV([0, y0 - u[1], -u[2]]), () => {
    c.fillStyle = "rgba(20,18,14,.12)"; c.beginPath(); c.roundRect(6, 8, 130, 130, 12); c.fill();
    c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.roundRect(0, 0, 130, 130, 12); c.fill(); c.stroke();
    c.fillStyle = TINTA; circulo(c, 14, 14, 3.2); circulo(c, 116, 14, 3.2);
    c.save(); c.translate(65, 66); ICONOS[i](c, t); c.restore();
  });
  // la lámpara, en lo alto del pilar izquierdo
  const [on, col] = lampara(i, t);
  if (on > 0) {
    const pop = ease.outBack(prog(t, ev.lamparas[i], ev.lamparas[i] + .3), 2.2);
    const L = P(R([-XP, y0, 3.0 + .34 * pop]));
    if (L) {
      const r = .3 * L.s * clamp(pop, 0, 1.3);
      const brillo = col === "r" ? .75 + .25 * Math.sin(t * 14) : 1;
      if (col !== "off") {
        const g = c.createRadialGradient(L.x, L.y, r * .3, L.x, L.y, r * 3.2);
        g.addColorStop(0, col === "v" ? `rgba(120,190,128,${.55 * brillo})` : `rgba(233,110,80,${.6 * brillo})`); g.addColorStop(1, "rgba(255,255,255,0)");
        c.fillStyle = g; circulo(c, L.x, L.y, r * 3.2);
      }
      c.fillStyle = TINTA; c.fillRect(L.x - r * .7, L.y + r * .6, r * 1.4, r * .9);
      if (col === "off") { c.fillStyle = "#D3CFC6"; circulo(c, L.x, L.y, r); c.strokeStyle = TINTA; c.lineWidth = Math.max(1.5, r * .12); c.beginPath(); c.arc(L.x, L.y, r, 0, 6.2832); c.stroke(); }
      else bola(c, L.x, L.y, r, ACENTO);
      if (col === "v") { const g2 = c.createRadialGradient(L.x - r * .3, L.y - r * .35, r * .05, L.x, L.y, r); g2.addColorStop(0, "#D6F0D8"); g2.addColorStop(.5, VERDE_C); g2.addColorStop(1, VERDE); c.fillStyle = g2; circulo(c, L.x, L.y, r); }
      if (col === "off") { c.fillStyle = "rgba(255,255,255,.7)"; circulo(c, L.x - r * .3, L.y - r * .35, r * .22); }
    }
  }
  c.restore();
}

// Las señas, dibujadas en el tablero (unidades locales, centro en 0,0).
const ICONOS: ((c: C, t: number) => void)[] = [
  (c, t) => {                                            // 1 palomita
    c.strokeStyle = TINTA; c.lineWidth = 7; c.lineJoin = "round"; c.strokeRect(-34, -34, 68, 68);
    let k = Math.max(prog(t, ev.tick - .05, ev.tick + .28) * (t < ev.entraB + .4 ? 1 : 0), prog(t, ev.v[0] - .1, ev.v[0] + .2) * (t < ev.mover - .4 ? 1 : 0));
    if (t >= ev.i1 - .1 && t < ev.preg) k = prog(t, ev.i1 - .1, ev.i1 + .2);
    if (k > 0) {
      c.strokeStyle = VERDE; c.lineWidth = 11; c.lineCap = "round"; c.beginPath();
      const pts: [number, number][] = [[-22, 0], [-6, 18], [26, -26]];
      const L1 = Math.hypot(16, 18), L2 = Math.hypot(32, 44), d = k * (L1 + L2);
      c.moveTo(...pts[0]);
      if (d <= L1) c.lineTo(lerp(pts[0][0], pts[1][0], d / L1), lerp(pts[0][1], pts[1][1], d / L1));
      else { c.lineTo(...pts[1]); c.lineTo(lerp(pts[1][0], pts[2][0], (d - L1) / L2), lerp(pts[1][1], pts[2][1], (d - L1) / L2)); }
      c.stroke();
    }
    const q = ventana(t, ev.interroga, ev.dos + .4, .2, .3);
    if (q > 0) { c.save(); c.translate(0, 4); c.scale(ease.outBack(clamp(q * 1.4)), ease.outBack(clamp(q * 1.4))); texto(c, "?", 0, 24, { fuente: serif(76, true), color: ACENTO, alfa: q }); c.restore(); }
  },
  (c, t) => {                                            // 2 flecha de regreso
    const gira = -6.2832 * ease.inOutCubic(prog(t, ev.regresa[0], ev.regresa[0] + .8));
    const rompe = prog(t, ev.no2 + .18, ev.no2 + .4) > 0 && t < ev.tres + .5 ? 1 : 0;
    const intenta = rompe ? 0 : .5 * Math.sin(prog(t, ev.no2 - .1, ev.no2 + .2) * Math.PI) * (t < ev.no2 + .2 ? 1 : 0);
    const brillo = ventana(t, ev.regresa[0], ev.regresa[1] - .2, .15, .3);
    c.save(); c.rotate(gira - intenta);
    const col = rompe ? ACENTO : brillo > .1 ? VERDE : TINTA;
    c.strokeStyle = col; c.lineWidth = 9; c.lineCap = "round";
    const a0 = -.5, a1 = rompe ? 3.0 : 4.1;
    c.beginPath(); c.arc(0, 0, 32, a0, a1); c.stroke();
    if (rompe) { c.beginPath(); c.arc(0, 0, 32, 3.55, 4.3); c.stroke(); }
    const ax = Math.cos(4.3) * 32, ay = Math.sin(4.3) * 32, tx = -Math.sin(4.3), ty = Math.cos(4.3);
    c.fillStyle = col; c.beginPath(); c.moveTo(ax - tx * 4 + Math.cos(4.3) * 15, ay - ty * 4 + Math.sin(4.3) * 15); c.lineTo(ax - tx * 22, ay - ty * 22); c.lineTo(ax - tx * 4 - Math.cos(4.3) * 15, ay - ty * 4 - Math.sin(4.3) * 15); c.closePath(); c.fill();
    c.restore();
    if (rompe) {
      const k = ease.outBack(prog(t, ev.no2 + .18, ev.no2 + .45), 2);
      c.save(); c.scale(k, k); c.strokeStyle = ACENTO; c.lineWidth = 6; c.lineCap = "round";
      linea(c, -12, -46, 2, -32); linea(c, 2, -32, -6, -22); linea(c, -6, -22, 8, -10); c.restore();
    }
  },
  (c, t) => {                                            // 3 marco con bordes
    const ok = ventana(t, ev.claro - .05, ev.claro + 1.6, .12, .3), mal = ventana(t, ev.no3, ev.cuatro, .08, .3);
    const col = mal > .1 ? ACENTO : ok > .1 ? VERDE : TINTA;
    c.strokeStyle = col; c.lineWidth = 4; c.setLineDash([7, 7]); c.strokeRect(-26, -20, 52, 40); c.setLineDash([]);
    c.lineWidth = 9; c.lineCap = "square";
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { c.beginPath(); c.moveTo(sx * 38, sy * 30 - sy * 16); c.lineTo(sx * 38, sy * 30); c.lineTo(sx * 38 - sx * 16, sy * 30); c.stroke(); }
  },
  (c, t) => {                                            // 4 balanza
    const th = inclina(t) * .8;
    c.strokeStyle = TINTA; c.fillStyle = TINTA; c.lineWidth = 5; c.lineCap = "round";
    linea(c, 0, 38, 0, -22); linea(c, -18, 38, 18, 38);
    c.save(); c.translate(0, -24); c.rotate(th); linea(c, -38, 0, 38, 0);
    for (const sx of [-1, 1]) { c.save(); c.translate(sx * 36, 0); c.rotate(-th); c.lineWidth = 2.5; linea(c, 0, 0, -10, 22); linea(c, 0, 0, 10, 22); c.beginPath(); c.moveTo(-15, 22); c.lineTo(15, 22); c.quadraticCurveTo(0, 34, -15, 22); c.fill(); c.restore(); }
    c.restore(); circulo(c, 0, -24, 5);
  },
];

/** El marco que delimita la tarea: esquinas que se cierran sobre la carga. Lo que cabe se pone verde; lo que crece
 *  las empuja hacia afuera y las tiñe de rojo. */
function marco(c: C, t: number, w: number, h: number, ini: number, ok: number, mal: number, empuja: number) {
  if (t < ini) return;
  const k = ease.outBack(prog(t, ini, ini + .3), 1.6), e = lerp(1.7, 1, clamp(k));
  const col = mal > .1 ? ACENTO : ok > .1 ? VERDE : TINTA;
  const dx = empuja * 150 + (mal > 0 ? Math.sin(t * 46) * 5 * mal : 0), dy = empuja * 105;
  c.save(); c.globalAlpha *= clamp(k);
  c.strokeStyle = col; c.lineWidth = 8; c.lineCap = "square";
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const x = sx * (w * e + dx), y = sy * (h * e + dy) + 2;
    c.beginPath(); c.moveTo(x, y - sy * 22); c.lineTo(x, y); c.lineTo(x - sx * 22, y); c.stroke();
  }
  c.restore();
}

// ---------- la balanza de la orilla (compuerta 4) ----------
const TIAS: number[] = ev.tias;
function inclina(t: number) {
  let th = 0;
  TIAS.forEach((ti) => { th -= .035 * resorte(t - ti - .22, 1.6, .4); });
  th += .52 * resorte(t - ev.golpe, 1.25, .38);
  th -= .4 * smooth(prog(t, ev.ahora + .2, ev.ahora + 1.2));
  return th;
}
const BAL: P3 = [-CW - 1.45, GY[3] - 1.55, ZB];
function balanza(c: C, t: number) {
  if (t < ev.cuatro - .6 || t > ev.ahora + 1.5) return;
  const a = smooth(prog(t, ev.cuatro - .6, ev.cuatro)) * (1 - smooth(prog(t, ev.ahora + .3, ev.ahora + 1.3)));
  const sale = ease.outBack(prog(t, ev.cuatro - .4, ev.cuatro + .15), 1.4);
  c.save(); c.globalAlpha = a * niebla(BAL[1]);
  const th = inclina(t);
  at(c, BAL, () => {
    c.scale(1.15, 1.15 * clamp(sale, .01, 1.2));
    sombra(c, 0, 0, 90, .25);
    c.strokeStyle = TINTA; c.fillStyle = TINTA; c.lineCap = "round";
    c.lineWidth = 9; linea(c, 0, 0, 0, -215); c.lineWidth = 7; linea(c, -45, 0, 45, 0);
    c.save(); c.translate(0, -215); c.rotate(th);
    c.lineWidth = 7; linea(c, -105, 0, 105, 0);
    for (const sx of [-1, 1]) {
      c.save(); c.translate(sx * 100, 0); c.rotate(-th);
      c.lineWidth = 2.5; linea(c, 0, 0, -40, 92); linea(c, 0, 0, 40, 92);
      c.fillStyle = "#EDE8DC"; c.strokeStyle = TINTA; c.lineWidth = 4;
      c.beginPath(); c.moveTo(-52, 92); c.lineTo(52, 92); c.quadraticCurveTo(0, 124, -52, 92); c.fill(); c.stroke();
      if (sx < 0) tias(c, t);
      else pesa(c, t);
      c.restore();
    }
    c.restore();
    c.fillStyle = TINTA; circulo(c, 0, -215, 11); c.fillStyle = BLANCO; circulo(c, 0, -215, 4);
  });
  c.restore();
}
/** Las tías: caricatura ligera, tres cabecitas de papel con el ceño fruncido. */
function tias(c: C, t: number) {
  c.save(); c.translate(0, 92); c.scale(1.55, 1.55); c.translate(0, -92);
  TIAS.forEach((ti, k) => {
    if (t < ti) return;
    const caeD = ease.outBack(prog(t, ti, ti + .25), 1.6);
    const brinca = t > ev.golpe ? Math.max(0, 70 * Math.sin(Math.min((t - ev.golpe) * 4.2, Math.PI))) * (t - ev.golpe < .75 ? 1 : 0) : 0;
    const x = -30 + k * 30, y = 74 - (1 - caeD) * 140 - brinca - (k === 1 ? 4 : 0);
    c.save(); c.translate(x, y); c.rotate((k - 1) * .18 + Math.sin(t * 9 + k) * .06 * (brinca > 0 ? 3 : 1));
    c.fillStyle = "#E8DCCB"; c.strokeStyle = TINTA; c.lineWidth = 2.6;
    c.beginPath(); c.arc(0, 0, 15, 0, 6.2832); c.fill(); c.stroke();
    c.fillStyle = TINTA; for (let r = 0; r < 5; r++) circulo(c, -12 + r * 6, -13 - (r % 2) * 3, 5.2);   // chongo rizado
    c.lineWidth = 2.4; linea(c, -9, -5, -3, -2); linea(c, 9, -5, 3, -2);                                 // ceño
    circulo(c, -5, 2, 1.8); circulo(c, 5, 2, 1.8);
    c.beginPath(); c.arc(0, 11, 4.5, Math.PI * 1.15, Math.PI * 1.85); c.stroke();
    // vapor de enojo
    const v = (t * 1.6 + k * .33) % 1;
    c.globalAlpha *= (1 - v) * .8; c.strokeStyle = ACENTO; c.lineWidth = 2.2; c.beginPath(); c.moveTo(14, -16 - v * 18); c.quadraticCurveTo(20, -22 - v * 18, 16, -28 - v * 18); c.stroke();
    c.restore();
  });
  c.restore();
}
function pesa(c: C, t: number) {
  const d = ev.diag;
  if (t < d) return;
  const cae = prog(t, d, ev.golpe), y = lerp(-420, 58, cae * cae);
  c.save(); c.translate(0, y);
  c.fillStyle = "#2a2a28"; c.beginPath(); c.moveTo(-46, 32); c.lineTo(46, 32); c.lineTo(34, -26); c.lineTo(-34, -26); c.closePath(); c.fill();
  c.strokeStyle = "#2a2a28"; c.lineWidth = 8; c.beginPath(); c.arc(0, -30, 14, Math.PI, 0); c.stroke();
  c.fillStyle = BLANCO; c.fillRect(-6, -14, 12, 34); c.fillRect(-17, -3, 34, 12);                       // cruz médica
  c.restore();
}

// ---------- el barco ----------
type Barco = {
  x: number; y: number; z?: number; rumbo?: number; bal?: number; cab?: number; esc?: number; alfa?: number;
  m1?: P3; m2?: P3; abre?: [number, number]; carga?: (c: C, t: number) => void; cargaEn?: P3; cargaEsc?: number;
  gorro?: boolean; vacio?: boolean; giroCarga?: number;
};
const BL = 1.3, BH = .48, BB = .56, BK = .76, BBb = .15, RB = .36;
function aMundo(b: Barco, u: number, v: number, w: number): P3 {
  const e = b.esc ?? 1; u *= e; v *= e; w *= e;
  const r = b.bal ?? 0, p = b.cab ?? 0, h = b.rumbo ?? 0;
  const u1 = u * Math.cos(r) - w * Math.sin(r), w1 = u * Math.sin(r) + w * Math.cos(r);
  const v2 = v * Math.cos(p) - w1 * Math.sin(p), w2 = v * Math.sin(p) + w1 * Math.cos(p);
  return [b.x + u1 * Math.cos(h) + v2 * Math.sin(h), b.y - u1 * Math.sin(h) + v2 * Math.cos(h), (b.z ?? 0) + w2];
}
const BM = .55;
const BORDE: [number, number][] = [[0, -BL], [-BB, -BM], [-BB, BM], [0, BL], [BB, BM], [BB, -BM]];
const CARAS: [number, number, number][][] = [
  [[-BB, -BM, BH], [-BB, BM, BH], [-BBb, BK, 0], [-BBb, -BK, 0]], [[-BB, BM, BH], [0, BL, BH], [-BBb, BK, 0]], [[0, -BL, BH], [-BB, -BM, BH], [-BBb, -BK, 0]],
  [[BB, -BM, BH], [BBb, -BK, 0], [BBb, BK, 0], [BB, BM, BH]], [[BB, BM, BH], [BBb, BK, 0], [0, BL, BH]], [[0, -BL, BH], [BBb, -BK, 0], [BB, -BM, BH]],
  [[0, BL, BH], [BBb, BK, 0], [-BBb, BK, 0]], [[0, -BL, BH], [-BBb, -BK, 0], [BBb, -BK, 0]],
];
const BOLA_L: P3 = [0, -.5, BH + RB * .5];
const MANOS = {
  lado: (t: number): [P3, P3] => [[-.8, -.3 + .05 * Math.sin(t * 2.1), BH + .85 + .06 * Math.sin(t * 2.7)], [.8, -.3 + .05 * Math.cos(t * 1.9), BH + .85 + .06 * Math.cos(t * 2.3)]],
  arriba: (t: number): [P3, P3] => [[-1.0, -.35, BH + 1.05 + .08 * Math.sin(t * 9)], [1.0, -.35, BH + 1.05 + .08 * Math.cos(t * 9)]],
  abajo: (): [P3, P3] => [[-.7, -.5, BH + .2], [.7, -.5, BH + .2]],
  carga: (t: number): [P3, P3] => [[-.33, -.22, BH + 1.5 + .03 * Math.sin(t * 2.3)], [.33, -.22, BH + 1.5 + .03 * Math.sin(t * 2.3)]],
};
const mezM = (a: [P3, P3], b: [P3, P3], k: number): [P3, P3] => [L3(a[0], b[0], k), L3(a[1], b[1], k)];

/** Lo que se desvanece se dibuja aparte y se compone de una vez: si no, cada cara transparente deja ver las de atrás. */
let CAPA: HTMLCanvasElement | null = null;
function capa(c: C, al: number, f: (g: C) => void) {
  if (al > .985) { f(c); return; }
  if (!CAPA) { CAPA = document.createElement("canvas"); CAPA.width = 1080; CAPA.height = 1920; }
  const g = CAPA.getContext("2d")!;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.clearRect(0, 0, 1080, 1920);
  f(g);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = al; c.drawImage(CAPA, 0, 0); c.restore();
}
function barco(c0: C, b: Barco, t: number) {
  const cen = P([b.x, b.y, 0]); if (!cen) return;
  const al0 = (b.alfa ?? 1) * niebla(b.y) * cerca(cen);
  if (al0 < .01) return;
  capa(c0, al0, (c) => barcoCuerpo(c, b, t, cen, al0 > .985 ? al0 : 1));
}
function barcoCuerpo(c: C, b: Barco, t: number, cen: Pt, al: number) {
  c.save(); c.globalAlpha = al;
  const hundido = (b.z ?? 0) < -.07;
  // estela en el agua
  if (!hundido || (b.z ?? 0) > -.5) {
    c.save(); c.globalAlpha = al * .55; c.fillStyle = AGUA_O; c.beginPath();
    for (let i = 0; i <= 24; i++) { const g = i / 24 * 6.2832, w = P(aMundo({ ...b, z: 0, bal: 0, cab: 0 }, Math.cos(g) * .78, Math.sin(g) * 1.5, 0)); if (!w) continue; if (i) c.lineTo(w.x, w.y); else c.moveTo(w.x, w.y); }
    c.fill(); c.restore();
    for (let k = 0; k < 2; k++) {
      const q = frac(t * .7 + k * .5), rr = 1 + q * .55;
      c.save(); c.globalAlpha = al * (1 - q) * .5; c.strokeStyle = "#7E8A86"; c.lineWidth = 1.6; c.beginPath();
      for (let i = 0; i <= 24; i++) { const g = i / 24 * 6.2832, w = P(aMundo({ ...b, z: 0, bal: 0, cab: 0 }, Math.cos(g) * .78 * rr, Math.sin(g) * 1.5 * rr, 0)); if (!w) continue; if (i) c.lineTo(w.x, w.y); else c.moveTo(w.x, w.y); }
      c.stroke(); c.restore();
    }
  }
  if (hundido) {
    // lo que está bajo el agua no se ve: recorte por la línea del agua a la altura del barco
    const lado = Math.sign(K.pos[0] - b.x) || 1;
    const A = P([b.x + lado * .5, b.y - 1.5, 0]), B2 = P([b.x + lado * .5, b.y + 1.5, 0]), ref = P([b.x, b.y, 2.5]);
    if (A && B2 && ref) semiplano(c, A, B2, ref);
    c.globalAlpha = al * (1 - smooth(prog(-(b.z ?? 0), .7, 1.15)));
  }
  const pos = K.pos;
  const items: { z: number; f: () => void }[] = [];
  const lw = Math.max(1.4, cen.s * .012);
  // el hueco del barco
  items.push({ z: 1e6, f: () => poli(c, BORDE.map(([u, v]) => aMundo(b, u, v, BH)), HUECO, TINTA, lw) });
  for (const F of CARAS) {
    const W3 = F.map((q) => aMundo(b, q[0], q[1], q[2]));
    const cx = W3.reduce((s2, q) => s2 + q[0], 0) / W3.length, cy = W3.reduce((s2, q) => s2 + q[1], 0) / W3.length, cz = W3.reduce((s2, q) => s2 + q[2], 0) / W3.length;
    const ux = W3[1][0] - W3[0][0], uy = W3[1][1] - W3[0][1], uz = W3[1][2] - W3[0][2], vx = W3[2][0] - W3[0][0], vy = W3[2][1] - W3[0][1], vz = W3[2][2] - W3[0][2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
    const ox = cx - b.x, oy = cy - b.y, oz = cz - ((b.z ?? 0) + BH * .3);
    if (nx * ox + ny * oy + nz * oz < 0) { nx = -nx; ny = -ny; nz = -nz; }
    if (nx * (pos[0] - cx) + ny * (pos[1] - cy) + nz * (pos[2] - cz) <= 0) continue;
    const luz = .6 + .4 * Math.max(0, nx * LUZD[0] + ny * LUZD[1] + nz * LUZD[2]);
    const v = Math.round(lerp(168, 252, luz));
    const pz = P([cx, cy, cz]);
    items.push({ z: pz ? pz.zc : 0, f: () => poli(c, W3, `rgb(${v},${v - 3},${v - 10})`, TINTA, lw) });
  }
  // la vela: un triángulo doblado, de dos caras
  const V3 = [aMundo(b, 0, -.05, BH), aMundo(b, 0, 1.15, BH), aMundo(b, 0, .55, BH + .95)];
  const pv = P(aMundo(b, 0, .55, BH + .3));
  items.push({ z: pv ? pv.zc : 0, f: () => { poli(c, V3, "#F2EEE5", TINTA, lw); lin(c, aMundo(b, 0, .55, BH + .95), aMundo(b, 0, .55, BH + .05), lw * .6, "rgba(17,17,17,.35)", 0); } });
  // la bola con manos
  if (!b.vacio) {
    const bw = aMundo(b, ...BOLA_L), pb = P(bw);
    if (pb) items.push({
      z: pb.zc + .02, f: () => {
        const [m1, m2] = [b.m1 ?? aMundo(b, -.8, -.3, BH + .85), b.m2 ?? aMundo(b, .8, -.3, BH + .85)];
        const q1 = P(m1), q2 = P(m2); if (!q1 || !q2) return;
        const r = RB * (b.esc ?? 1) * pb.s;
        agente(c, pb.x, pb.y, r, [q1.x, q1.y], [q2.x, q2.y], { abre1: b.abre?.[0] ?? .6, abre2: b.abre?.[1] ?? .6 });
        if (b.gorro) {
          c.save(); c.translate(pb.x, pb.y); c.rotate(-.18);
          c.fillStyle = ACENTO; c.beginPath(); c.moveTo(-r * .6, -r * .72); c.lineTo(r * .08, -r * 2.05); c.lineTo(r * .62, -r * .7); c.closePath(); c.fill();
          c.strokeStyle = "#F4D9CF"; c.lineWidth = r * .07; linea(c, -r * .32, -r * 1.1, r * .4, -r * 1.05); linea(c, -r * .12, -r * 1.55, r * .24, -r * 1.52);
          c.fillStyle = TINTA; circulo(c, r * .08, -r * 2.1, r * .15); c.restore();
        }
      },
    });
  }
  items.sort((p, q) => q.z - p.z);
  for (const it of items) it.f();
  if (b.carga) {
    const w = b.cargaEn ?? aMundo(b, 0, -.22, BH + 1.85);
    at(c, w, () => b.carga!(c, t), b.giroCarga ?? 0, (b.cargaEsc ?? 1) * (b.esc ?? 1));
  }
  c.restore();
}

// ---------- lo que cargan ----------
function hojaPapel(c: C, w: number, h: number) {
  c.fillStyle = "rgba(20,18,14,.15)"; c.fillRect(-w / 2 + 4, -h / 2 + 5, w, h);
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 3.5; c.beginPath(); c.rect(-w / 2, -h / 2, w, h); c.fill(); c.stroke();
}
function maquina(c: C, t: number) {
  const gira = t > ev.corre ? (t - ev.corre) * 9 : 0;
  hojaPapel(c, 84, 64);
  c.fillStyle = TINTA; c.beginPath(); c.moveTo(-30, -14); c.lineTo(-30, 14); c.lineTo(-8, 0); c.closePath(); c.fill();
  c.save(); c.translate(18, 0); c.rotate(gira);
  c.fillStyle = TINTA; for (let k = 0; k < 8; k++) { c.save(); c.rotate(k * Math.PI / 4); c.fillRect(-5, -22, 10, 9); c.restore(); }
  circulo(c, 0, 0, 16); c.fillStyle = BLANCO; circulo(c, 0, 0, 6); c.restore();
  if (gira > 0 && t < ev.tick + .6) { c.strokeStyle = TINTA; c.lineWidth = 2.5; for (let k = 0; k < 3; k++) { const q = frac(t * 3 + k / 3); c.globalAlpha *= 1; linea(c, 46 + q * 18, -16 + k * 16, 56 + q * 18, -16 + k * 16); } }
}
function galleta(c: C, t: number) {
  const k = ease.outBack(prog(t, ev.galleta, ev.galleta + .35), 1.6);
  for (const sx of [-1, 1]) {
    c.save(); c.translate(sx * 14 * k, 0); c.rotate(sx * .35 * k);
    c.fillStyle = "#E3C48E"; c.strokeStyle = TINTA; c.lineWidth = 3.5;
    c.beginPath(); c.moveTo(0, -24); c.quadraticCurveTo(sx * 46, -30, sx * 40, 4); c.quadraticCurveTo(sx * 30, 26, 0, 20); c.quadraticCurveTo(sx * 14, 0, 0, -24); c.fill(); c.stroke();
    c.restore();
  }
  if (k > .05) {
    const L = 90 * clamp(k);
    c.save(); c.translate(0, -6); c.rotate(-.12);
    c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 2.2; c.fillRect(-L / 2, -9, L, 18); c.strokeRect(-L / 2, -9, L, 18);
    c.strokeStyle = "rgba(17,17,17,.6)"; c.lineWidth = 2; c.beginPath();
    for (let x = -L / 2 + 8; x < L / 2 - 8; x += 3) c.lineTo(x, Math.sin(x * .7) * 2.2);
    c.stroke(); c.restore();
  }
}
function hojaCambio(c: C, t: number) {
  hojaPapel(c, 62, 80);
  c.strokeStyle = "rgba(17,17,17,.45)"; c.lineWidth = 3; for (let k = 0; k < 5; k++) linea(c, -20, -26 + k * 12, 20 - (k % 2) * 8, -26 + k * 12);
  const dibuja = prog(t, ev.cambio, ev.cambio + .45), borra = prog(t, ev.regresa[0] + .15, ev.regresa[1] - .2);
  const k = Math.max(0, dibuja - borra);
  if (k > 0) {
    c.strokeStyle = ACENTO; c.lineWidth = 5; c.lineCap = "round"; c.beginPath();
    const n = Math.floor(k * 40);
    for (let i = 0; i <= n; i++) { const x = -22 + i * 1.1, y = -10 + Math.sin(i * .9) * 12 + i * .3; if (i) c.lineTo(x, y); else c.moveTo(x, y); }
    c.stroke();
  }
}
function monedaS(c: C) { c.fillStyle = "#E9D8A8"; c.strokeStyle = TINTA; c.lineWidth = 3; circulo(c, 0, 0, 17); c.beginPath(); c.arc(0, 0, 17, 0, 6.2832); c.stroke(); texto(c, "$", 0, 8, { fuente: serif(26), color: TINTA }); }
function sobreS(c: C) {
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.rect(-30, -20, 60, 40); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-30, -20); c.lineTo(0, 4); c.lineTo(30, -20); c.stroke();
}
function respaldo(c: C, t: number) {
  const q = prog(t, ev.borrar + .05, ev.borrar + 1.4);
  const alto = 46 * (1 - q * .85);
  if (q < 1) {
    c.fillStyle = q > 0 ? `rgb(${Math.round(lerp(236, 60, q))},${Math.round(lerp(228, 52, q))},${Math.round(lerp(210, 44, q))})` : "#ECE4D2";
    c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.rect(-26, -alto, 52, alto); c.fill(); c.stroke();
    if (q === 0) { c.fillStyle = TINTA; c.fillRect(-12, -36, 24, 16); c.fillStyle = BLANCO; c.fillRect(-7, -33, 14, 6); }
  }
  if (q > 0 && q < 1) {
    for (let k = 0; k < 5; k++) {
      const x = -20 + k * 10, h = (26 + 14 * Math.sin(t * 17 + k * 2)) * Math.sin(Math.PI * Math.min(q * 1.3, 1));
      c.fillStyle = k % 2 ? ACENTO : "#E9A15A"; c.beginPath(); c.moveTo(x - 7, -alto); c.quadraticCurveTo(x - 4, -alto - h * .6, x + Math.sin(t * 13 + k) * 4, -alto - h); c.quadraticCurveTo(x + 5, -alto - h * .5, x + 7, -alto); c.fill();
    }
  }
  if (q > .1) {
    const r = azar(5);
    for (let k = 0; k < 14; k++) { const e = frac(t * .8 + r()), x = (r() - .5) * 50 + Math.sin(t * 2 + k) * 8; c.fillStyle = "rgba(40,38,34,.7)"; c.globalAlpha *= 1; c.fillRect(x, -alto - e * 120, 4, 4); }
  }
}
function mesa(c: C) {
  hojaPapel(c, 0, 0);
  c.fillStyle = "#EFE9DC"; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.rect(-44, -14, 88, 28); c.fill(); c.stroke();
  c.fillStyle = TINTA; for (let k = 0; k < 6; k++) { const x = -37 + k * 14.8; c.fillRect(x - 5, -26, 10, 9); c.fillRect(x - 5, 17, 10, 9); }
  c.strokeStyle = ACENTO; c.lineWidth = 2; linea(c, -40, 0, 40, 0);
}
function tienda(c: C, t: number) {
  const g = smooth(prog(t, ev.crece[0], ev.crece[1])), der = smooth(prog(t, ev.no3, ev.no3 + .5));
  if (g > 0) {
    // lo que crece no tiene borde: nube de garabatos con flechas hacia todos lados
    const r = azar(3), R = 30 + g * 150;
    c.save();
    c.fillStyle = "rgba(244,242,236,.9)"; c.strokeStyle = TINTA; c.lineWidth = 3.2; c.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = i / 40 * 6.2832, bump = 1 + .14 * Math.sin(a * 7 + t * 3) + .08 * Math.sin(a * 13 - t * 5);
      const sq = 1 + der * .25 * Math.max(0, Math.cos(a)) ** 2;
      const x = Math.cos(a) * R * bump * (1 + der * .35), y = Math.sin(a) * R * bump * .78 * sq;
      if (i) c.lineTo(x, y); else c.moveTo(x, y);
    }
    c.closePath(); c.fill(); c.stroke();
    c.lineWidth = 3; c.lineCap = "round";
    for (let k = 0; k < 12; k++) {
      const a = k / 12 * 6.2832 + r() * .3, d0 = R * .35, d1 = R * (.75 + .2 * Math.sin(t * 4 + k));
      c.strokeStyle = k % 3 ? TINTA : ACENTO; c.fillStyle = c.strokeStyle;
      const x0 = Math.cos(a) * d0, y0 = Math.sin(a) * d0 * .78, x1 = Math.cos(a) * d1, y1 = Math.sin(a) * d1 * .78;
      linea(c, x0, y0, x1, y1);
      const ux = (x1 - x0) / (Math.hypot(x1 - x0, y1 - y0) || 1), uy = (y1 - y0) / (Math.hypot(x1 - x0, y1 - y0) || 1);
      c.beginPath(); c.moveTo(x1 + ux * 8, y1 + uy * 8); c.lineTo(x1 - ux * 6 - uy * 7, y1 - uy * 6 + ux * 7); c.lineTo(x1 - ux * 6 + uy * 7, y1 - uy * 6 - ux * 7); c.closePath(); c.fill();
    }
    c.restore();
  }
  c.save(); c.scale(1 + g * .5, 1 + g * .5);
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.rect(-26, -10, 52, 34); c.fill(); c.stroke();
  for (let k = 0; k < 5; k++) { c.fillStyle = k % 2 ? BLANCO : ACENTO; c.beginPath(); c.moveTo(-30 + k * 12, -10); c.lineTo(-30 + k * 12 + 12, -10); c.lineTo(-30 + k * 12 + 10, -24); c.lineTo(-30 + k * 12 + 2, -24); c.closePath(); c.fill(); }
  c.strokeStyle = TINTA; c.lineWidth = 3; c.strokeRect(-30, -24, 60, 14);
  c.fillStyle = TINTA; c.fillRect(-6, 4, 12, 20);
  c.restore();
}
function pastel(c: C) {
  c.fillStyle = "#F3E7DA"; c.strokeStyle = TINTA; c.lineWidth = 3;
  c.beginPath(); c.rect(-36, -4, 72, 30); c.fill(); c.stroke(); c.beginPath(); c.rect(-24, -26, 48, 22); c.fill(); c.stroke();
  c.strokeStyle = ACENTO; c.lineWidth = 4; c.beginPath(); for (let x = -36; x <= 36; x += 6) c.lineTo(x, 4 + Math.sin(x * .6) * 3); c.stroke();
  for (let k = -1; k <= 1; k++) { c.fillStyle = TINTA; c.fillRect(k * 14 - 2, -40, 4, 14); c.fillStyle = ACENTO; circulo(c, k * 14, -44, 4); }
}
function pastelRoto(c: C) {
  c.fillStyle = "#F3E7DA"; c.strokeStyle = TINTA; c.lineWidth = 3;
  c.beginPath(); c.ellipse(0, 0, 46, 13, 0, 0, 6.2832); c.fill(); c.stroke();
  c.fillStyle = ACENTO; for (let k = -2; k <= 2; k++) { c.beginPath(); c.ellipse(k * 15, -3 + Math.abs(k) * 2, 9, 5, 0, 0, 6.2832); c.fill(); c.fillRect(k * 15 - 2, -2, 4, 10 + (k + 2) % 3 * 4); }
  c.fillStyle = TINTA; c.save(); c.translate(-12, -8); c.rotate(-1.1); c.fillRect(-2, -14, 4, 14); c.restore(); c.save(); c.translate(16, -6); c.rotate(.9); c.fillRect(-2, -14, 4, 14); c.restore();
}
function bicho(c: C, t: number) {
  hojaPapel(c, 66, 76);
  c.strokeStyle = "rgba(17,17,17,.4)"; c.lineWidth = 3; for (let k = 0; k < 5; k++) linea(c, -22, -26 + k * 12, 22 - (k % 2) * 10, -26 + k * 12);
  c.save(); c.translate(4, 2); c.rotate(Math.sin(t * 6) * .1);
  c.strokeStyle = ACENTO; c.lineWidth = 2.5; for (let k = -1; k <= 1; k++) { linea(c, -6, k * 7, -17, k * 9 + Math.sin(t * 20 + k) * 2); linea(c, 6, k * 7, 17, k * 9 - Math.sin(t * 20 + k) * 2); }
  c.fillStyle = ACENTO; c.beginPath(); c.ellipse(0, 0, 9, 13, 0, 0, 6.2832); c.fill(); circulo(c, 0, -14, 6);
  c.restore();
}
function dinero(c: C) {
  for (let k = 0; k < 3; k++) {
    c.save(); c.translate(-6 + k * 6, -k * 7); c.rotate(-.06 + k * .05);
    c.fillStyle = "#E6E9D8"; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.rect(-40, -20, 80, 40); c.fill(); c.stroke();
    c.beginPath(); c.arc(0, 0, 12, 0, 6.2832); c.stroke(); texto(c, "$", 0, 8, { fuente: serif(24), color: TINTA }); c.restore();
  }
}
const QCARGAS: ((c: C, t: number) => void)[] = [
  (c) => { c.strokeStyle = TINTA; c.fillStyle = "#EDE6D8"; c.lineWidth = 3; for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) { const x = -46 + k * 23 + (r % 2) * 11.5; if (x > 40) continue; c.beginPath(); c.rect(x, -40 + r * 17, 22, 16); c.fill(); c.stroke(); } },
  (c) => { c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.rect(-26, -56, 52, 86); c.fill(); c.stroke(); c.fillStyle = TINTA; for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) c.fillRect(-18 + k * 14, -48 + r * 15, 8, 8); },
  (c, t) => { c.strokeStyle = TINTA; c.lineWidth = 4; c.lineCap = "round"; c.beginPath(); for (let i = 0; i < 90; i++) { const a = i * .2 + t * 1.5, r2 = 3 + i * .45; const x = Math.cos(a) * r2, y = Math.sin(a) * r2 * .8; if (i) c.lineTo(x, y); else c.moveTo(x, y); } c.stroke(); },
  (c) => { c.strokeStyle = TINTA; c.fillStyle = "#EDE6D8"; c.lineWidth = 3; const H = (x: number, y: number) => { c.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; c.lineTo(x + Math.cos(a) * 15, y + Math.sin(a) * 15); } c.closePath(); c.fill(); c.stroke(); }; H(0, 0); for (let k = 0; k < 6; k++) H(Math.cos(k * Math.PI / 3 + Math.PI / 6) * 26, Math.sin(k * Math.PI / 3 + Math.PI / 6) * 26); },
];
function etiqueta(c: C) {
  c.fillStyle = "rgba(20,18,14,.15)"; c.beginPath(); c.moveTo(-32, -24 + 5); c.lineTo(48, -24 + 5); c.lineTo(48, 28); c.lineTo(-32, 28); c.lineTo(-50, 5); c.closePath(); c.fill();
  c.fillStyle = "#F6EFE0"; c.strokeStyle = TINTA; c.lineWidth = 3.5; c.beginPath(); c.moveTo(-34, -24); c.lineTo(44, -24); c.lineTo(44, 24); c.lineTo(-34, 24); c.lineTo(-52, 0); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = PAPEL; circulo(c, -36, 0, 5.5); c.beginPath(); c.arc(-36, 0, 5.5, 0, 6.2832); c.stroke();
  texto(c, "$", 8, 15, { fuente: serif(48), color: ACENTO });
}

// ---------- los letreros de los vendedores ----------
const LETR = [
  { x: -1.25, y: .3, ztop: 3.95, w: 2.7, h: 1.85, pole: -(CW + .35), l1: "HACEN", l2: "TODO", slam: ev.slam1, grito: ev.grito1, dir: 1 },
  { x: 1.2, y: 1.2, ztop: 3.5, w: 2.6, h: 1.6, pole: CW + .35, l1: "NO SIRVEN", l2: "PARA NADA", slam: ev.slam2, grito: ev.grito2, dir: -1 },
];
function letrero(c: C, t: number, n: number) {
  const L = LETR[n];
  const ini = L.slam - .34;
  if (t < ini || t > ev.rompe + 2.2) return;
  const sube = n === 0 ? lerp(-2.6, 0, ease.outBack(prog(t, -.12, L.slam), 1.5)) : lerp(-3.2, 0, ease.outBack(prog(t, ini, L.slam), 1.5));
  const tiem = t > L.slam ? Math.exp(-(t - L.slam) * 6) * Math.sin((t - L.slam) * 40) * .05 : 0;
  const grito = ventana(t, L.grito - .1, L.grito + .75, .1, .3);
  const sacude = grito * Math.sin(t * 38) * .025;
  const rot = t > ev.rompe + .12;
  const a = niebla(L.y);
  c.save(); c.globalAlpha = a * (1 - smooth(prog(t, ev.rompe + 1.2, ev.rompe + 2.0)));
  // poste y bocina
  const zb = L.ztop - L.h + sube;
  if (!rot) {
    lin(c, [L.pole, L.y, ZB], [L.pole, L.y, zb + .2], 5.5, TINTA, 0);
    const hp = P([L.pole + (n === 0 ? -.05 : .05), L.y - .05, L.ztop + sube + .35]);
    if (hp) {
      c.save(); c.translate(hp.x, hp.y); const e = hp.s / 100; c.scale(e * -L.dir, e); c.rotate(.22 + sacude * 4);
      c.fillStyle = TINTA; c.beginPath(); c.moveTo(-34, -9); c.lineTo(10, -30); c.lineTo(10, 30); c.lineTo(-34, 9); c.closePath(); c.fill();
      c.fillRect(-48, -10, 16, 20);
      c.fillStyle = "#3a3a37"; c.beginPath(); c.ellipse(10, 0, 7, 30, 0, 0, 6.2832); c.fill();
      if (grito > 0) {
        c.strokeStyle = n === 0 ? ACENTO : TINTA; c.lineWidth = 6; c.lineCap = "round";
        for (let k = 0; k < 3; k++) { const q = frac(t * 2.6 + k / 3); c.globalAlpha = a * grito * (1 - q); c.beginPath(); c.arc(10, 0, 30 + q * 90, -.6, .6); c.stroke(); }
        c.globalAlpha = a;
      }
      c.restore();
    }
  }
  // el cartón: entero, o en dos mitades que caen al canal
  const o: P3 = [L.x - L.w / 2 + tiem + sacude, L.y, L.ztop + sube];
  const ZZ = [[.5, 0], [.44, .2], [.56, .38], [.45, .6], [.55, .8], [.48, 1]];
  const contenido = () => {
    c.fillStyle = "rgba(20,18,14,.13)"; c.fillRect(7, 9, L.w * 100, L.h * 100);
    c.fillStyle = n === 0 ? BLANCO : "#F0EBE0"; c.strokeStyle = TINTA; c.lineWidth = 6; c.beginPath(); c.rect(0, 0, L.w * 100, L.h * 100); c.fill(); c.stroke();
    const k = ease.outBack(prog(t, L.grito - .15, L.grito + .2), 2.2);
    if (n === 0) texto(c, "LOS AGENTES", L.w * 50, 44, { fuente: mono(30), color: TINTA, esp: 4 });
    texto(c, L.l1, L.w * 50, n === 0 ? 114 : 70, { fuente: serif(n === 0 ? 74 : 58), color: TINTA, esp: n === 0 ? 3 : 1 });
    c.save(); c.translate(L.w * 50, n === 0 ? 172 : 136); const zz = t > L.grito - .15 ? lerp(1.25, 1, clamp(k)) : 1; c.scale(zz, zz);
    texto(c, L.l2, 0, 0, { fuente: serif(n === 0 ? 74 : 58), color: n === 0 ? ACENTO : TINTA, esp: n === 0 ? 3 : 1 }); c.restore();
    if (n === 0) {                                       // estrellitas de vendedor
      const r = azar(4);
      for (let i = 0; i < 7; i++) { const x = r() * (L.w * 100 + 60) - 30, y = i % 2 ? r() * 24 - 22 : L.h * 100 + r() * 20, q = (.6 + .5 * Math.sin(t * 7 + i * 2)) * 1.3; c.save(); c.translate(x, y); c.rotate(t * 2 + i); c.scale(q, q); c.fillStyle = ACENTO; c.beginPath(); for (let j = 0; j < 8; j++) { const rr = j % 2 ? 4 : 14, aa = j * Math.PI / 4; c.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } c.closePath(); c.fill(); c.restore(); }
    }
    // la grieta: aparece justo en «falsas»
    const gk = prog(t, ev.grieta, ev.rompe + .05);
    if (gk > 0 && !rot) { c.strokeStyle = ACENTO; c.lineWidth = 6; c.beginPath(); ZZ.forEach(([u, v], i) => { if (v > gk) return; if (i) c.lineTo(u * L.w * 100, v * L.h * 100); else c.moveTo(u * L.w * 100, v * L.h * 100); }); c.stroke(); }
  };
  if (!rot) plano(c, o, [1, 0, 0], [0, 0, -1], contenido);
  else {
    const e = t - (ev.rompe + .12);
    for (const h of [0, 1]) {
      const d = e - h * .1; if (d < 0) { plano(c, o, [1, 0, 0], [0, 0, -1], () => { c.beginPath(); mitad(c, L, h); c.clip(); contenido(); }); continue; }
      const caeZ = 4.6 * d * d, sx = (h ? 1 : -1);
      const hacia = n === 0 ? .9 : -.9;                  // las mitades caen hacia el canal
      const oo: P3 = [o[0] + sx * .25 * d + hacia * d * .8, o[1] - d * .3, o[2] - caeZ];
      if (oo[2] - L.h < -1.6) continue;
      const giro = (sx * .6 + hacia * .4) * d * 1.6;
      plano(c, oo, [1, 0, 0], [0, 0, -1], () => {
        const px = (h ? .62 : .38) * L.w * 100, py = L.h * 50;
        c.translate(px, py); c.rotate(giro); c.translate(-px, -py);
        c.beginPath(); mitad(c, L, h); c.clip(); contenido();
      });
    }
  }
  c.restore();
}
function mitad(c: C, L: typeof LETR[0], h: number) {
  const ZZ = [[.5, 0], [.44, .2], [.56, .38], [.45, .6], [.55, .8], [.48, 1]];
  const W2 = L.w * 100 + 20, H = L.h * 100 + 20;
  if (h === 0) { c.moveTo(-20, -20); ZZ.forEach(([u, v]) => c.lineTo(u * L.w * 100, v * L.h * 100 + (v === 0 ? -20 : v === 1 ? 20 : 0))); c.lineTo(-20, H); }
  else { c.moveTo(W2, -20); ZZ.forEach(([u, v]) => c.lineTo(u * L.w * 100, v * L.h * 100 + (v === 0 ? -20 : v === 1 ? 20 : 0))); c.lineTo(W2, H); }
  c.closePath();
}

// ---------- reparto: dónde está cada barco en cada instante ----------
type Vivo = Barco & { vivo: boolean };
const NADA: Vivo = { x: 0, y: 0, vivo: false };
const bob = (t: number, f: number) => ({ z: .03 * Math.sin(t * 2.2 + f), bal: .045 * Math.sin(t * 1.7 + f), cab: .025 * Math.sin(t * 1.3 + f * 2) });
function sacudida(t: number, ts: number[], a = .2) { let r = 0; for (const x of ts) if (t > x) r += a * Math.exp(-(t - x) * 3.2) * Math.sin((t - x) * 13); return r; }

function barcoA(t: number): Vivo {
  if (t > ev.abre1 + 2.6) return NADA;
  const y = tramos(t, -1.15, [[ev.zarpa, ev.zarpa + 2.2, espera(0)], [ev.abre1 + .35, ev.abre1 + 2.5, GY[0] + 3.4, ease.inCubic]]);
  const b: Vivo = { vivo: true, x: 0, y, ...bob(t, 0), alfa: 1 - smooth(prog(t, ev.abre1 + 1.4, ev.abre1 + 2.5)) };
  const festeja = ventana(t, ev.slam1, ev.slam2 - .4, .2, .3);
  b.bal = (b.bal ?? 0) + sacudida(t, [ev.slam1, ev.slam2], .22) + sacudida(t, [ev.chap[0]], .12) + sacudida(t, ev.surgen, .06) + festeja * .11 * Math.sin(t * 8);
  b.z = (b.z ?? 0) + festeja * .06 * Math.abs(Math.sin(t * 8));
  // manos: asombro, festejo, desánimo, susto, y luego cargan el programa
  let M = MANOS.lado(t);
  M = mezM(M, MANOS.arriba(t), ventana(t, ev.slam1 - .1, ev.slam2 - .4, .2, .3));
  M = mezM(M, MANOS.abajo(), ventana(t, ev.grito2 - .1, ev.rompe - .2, .25, .2));
  M = mezM(M, MANOS.arriba(t), ventana(t, ev.rompe, ev.rompe + .9, .1, .4) * .8);
  M = mezM(M, MANOS.carga(t), smooth(prog(t, ev.prog - .2, ev.prog + .15)));
  const w = (u: number, v: number, z: number) => aMundo(b, u, v, z);
  let m1 = w(...M[0]), m2 = w(...M[1]);
  // la mano derecha sube a marcar la palomita
  const CAJA: P3 = [0, GY[0] + .1, 3.72];
  const alc = ventana(t, ev.tick - .4, ev.tick + .35, .3, .35);
  if (alc > 0) m2 = L3(m2, [CAJA[0] + .05, CAJA[1] - .2, CAJA[2] - .05], alc);
  if (t > ev.prog - .2) { m1 = L3(m1, w(-.15, -.22, BH + 1.5), alc); }
  b.m1 = m1; b.m2 = m2; b.abre = [t > ev.prog ? .25 : .7, alc > .5 ? .2 : .7];
  if (t > ev.prog - .3) {
    const caeC = ease.outBack(prog(t, ev.prog - .3, ev.prog + .05), 1.3);
    b.carga = maquina; b.cargaEn = suma3(L3(m1, m2, alc > 0 ? 0 : .5), [0, 0, .32 + (1 - caeC) * 2.5]);
    if (alc > 0) b.cargaEn = suma3(m1, [.15, 0, .3]);
  }
  return b;
}
function barcoB(t: number): Vivo {
  if (t < ev.entraB || t > ev.dos + 1.5) return NADA;
  const y = tramos(t, espera(0) - 3.2, [[ev.entraB, ev.entraB + 1.25, espera(0), ease.outCubic]]);
  const deriva = smooth(prog(t, ev.interroga, ev.dos + 1.5));
  const b: Vivo = { vivo: true, x: .1 * Math.sin(t * .7) * deriva, y, ...bob(t, 2), rumbo: .5 * deriva * Math.sin((t - ev.interroga) * .9), alfa: smooth(prog(t, ev.entraB, ev.entraB + .4)) };
  let M = mezM(MANOS.lado(t), MANOS.carga(t), 1);
  const w = (u: number, v: number, z: number) => aMundo(b, u, v, z);
  let m1 = w(...M[0]), m2 = w(...M[1]);
  // la mano duda: va hacia la palomita y no se atreve
  const CAJA: P3 = [0, GY[0] - .1, 3.6];
  const va = ventana(t, ev.duda - .1, ev.interroga + .5, .5, .45) * .62;
  if (va > 0) m2 = L3(m2, CAJA, va + Math.sin(t * 22) * .015 * (va > .3 ? 1 : 0));
  b.m1 = m1; b.m2 = va > 0 ? m2 : w(.8, -.3, BH + .9); b.abre = [.3, va > 0 ? .9 : .6];
  b.carga = galleta; b.cargaEn = suma3(m1, [.3, 0, .28]);
  void M;
  return b;
}
function barcoC(t: number): Vivo {
  if (t < ev.dos + .2 || t > ev.tres + .6) return NADA;
  const ida = GY[1] + 1.55;
  const y = tramos(t, espera(1) - 3, [[ev.dos + .25, ev.cambio - .15, espera(1) + .35, ease.outCubic], [ev.abre2 + .25, ev.regresa[0] - .02, ida, ease.inOutCubic], [ev.regresa[0] + .1, ev.regresa[1], espera(1) + .2, ease.inOutCubic],
    [ev.regresa[1] + .05, ev.regresa[1] + 1.3, espera(1) - 3.2, ease.inCubic]]);
  const b: Vivo = { vivo: true, x: -.55, y, ...bob(t, 4), alfa: smooth(prog(t, ev.dos + .2, ev.dos + .6)) * (1 - smooth(prog(t, ev.regresa[1] - .05, ev.regresa[1] + .3))) };
  const w = (u: number, v: number, z: number) => aMundo(b, u, v, z);
  const M = MANOS.carga(t);
  const esc = ventana(t, ev.cambio - .05, ev.cambio + .45, .08, .1);
  b.m1 = w(...M[0]);
  b.m2 = esc > 0 ? suma3(w(.05, -.22, BH + 1.9), [.18 * Math.sin(t * 40), 0, .12 * Math.cos(t * 33)]) : w(...M[1]);
  b.abre = [.3, esc > 0 ? .1 : .4];
  b.carga = hojaCambio; b.cargaEn = w(0, -.22, BH + 1.95);
  return b;
}
function barcoD(t: number): Vivo {
  if (t < ev.entraD || t > ev.no2 + 1.8) return NADA;
  const y = tramos(t, espera(1) - 2.2, [[ev.entraD, ev.pago - .05, GY[1] - .3, ease.outCubic], [ev.pago - .05, ev.no2 + 1.8, GY[1] + 4.5, (x) => x]]);
  const b: Vivo = { vivo: true, x: .22, y, ...bob(t, 6), alfa: smooth(prog(t, ev.entraD, ev.entraD + .3)) * (1 - smooth(prog(t, ev.no2 + .6, ev.no2 + 1.7))), rumbo: .12 * smooth(prog(t, ev.no2, ev.no2 + 1.5)) };
  const w = (u: number, v: number, z: number) => aMundo(b, u, v, z);
  const tira = ventana(t, ev.pago - .1, ev.pago + .25, .1, .2), suelta = ventana(t, ev.correo - .1, ev.correo + .3, .1, .25);
  b.m1 = tira > 0 ? w(-.95, .3, BH + 1.2) : w(-.55, -.25, BH + 1.25);
  b.m2 = suelta > 0 ? w(.6, .5, BH + 1.9) : w(.55, -.25, BH + 1.25);
  b.abre = [t > ev.pago ? .9 : .25, t > ev.correo ? .9 : .25];
  return b;
}
/** Lo que se pierde al pasar la compuerta 2: el pago río abajo, el correo volando, el respaldo en llamas. */
function perdidos(c: C, t: number, D: Vivo) {
  if (!D.vivo && t < ev.entraD) return;
  const aD = D.vivo ? (D.alfa ?? 1) : 1;                // mientras va en el barco, aparece con él
  // la moneda
  if (t > ev.entraD && t < ev.no2 + 2.5) {
    const d = ev.pago;
    let w: P3;
    if (t < d) w = D.vivo ? aMundo(D, -.55, -.25, BH + 1.45) : [0, 0, -9];
    else {
      const e = t - d, x0 = -.3, y0 = GY[1] + .3;
      if (e < .4) { const k = e / .4; w = [lerp(x0 - .1, -.75, k), lerp(y0, y0 + .6, k), BH + 1.45 + 1.2 * k - 3.9 * k * k]; }
      else { const f = e - .4; w = [-.75 + .1 * Math.sin(f * 3), y0 + .6 + f * 2.4 + f * f * .6, .02 + .02 * Math.sin(f * 7)]; salpica(c, -.75, y0 + .6, d + .42, t, .5); }
    }
    const p = P(w);
    if (p && w[2] > -1) { c.save(); c.globalAlpha = niebla(w[1]) * (1 - smooth(prog(t, d + 1.6, d + 2.6))) * (t < d ? aD : 1); c.translate(p.x, p.y); const e2 = p.s / 100 * 1.6; c.scale(e2, e2 * (t > d + .4 ? .45 : 1)); c.rotate(t * (t > d ? 8 : 0)); monedaS(c); c.restore(); }
  }
  // el correo
  if (t > ev.entraD && t < ev.no2 + 2) {
    const d = ev.correo;
    let w: P3, g = 0;
    if (t < d) w = D.vivo ? aMundo(D, .55, -.25, BH + 1.6) : [0, 0, -9];
    else { const e = t - d; const p0 = D.vivo ? aMundo(D, .6, .5, BH + 1.9) : [0, 0, 0] as P3; w = [p0[0] + e * .9, p0[1] + e * 4 + e * e * 2, p0[2] + e * 2.2 + Math.sin(e * 6) * .2]; g = -.3 + Math.sin(e * 5) * .25; }
    const p = P(w);
    if (p && w[2] > -1) { c.save(); c.globalAlpha = niebla(w[1]) * (1 - smooth(prog(t, d + 1.3, d + 2.2))) * (t < d ? aD : 1); c.translate(p.x, p.y); c.rotate(g); const e2 = p.s / 100 * 1.4; c.scale(e2, e2); sobreS(c); c.restore(); }
  }
  // el respaldo, en la proa
  if (D.vivo) { c.save(); c.globalAlpha = aD; at(c, aMundo(D, 0, .62, BH + .02), () => respaldo(c, t), 0, 1.6); c.restore(); }
}
function barcoE(t: number): Vivo {
  if (t < ev.tres + .1 || t > ev.claro + 2.6) return NADA;
  const y = tramos(t, espera(2) - 3, [[ev.tres + .2, ev.doce - .5, espera(2), ease.outCubic], [ev.claro + .25, ev.claro + 1.4, GY[2] + 3.6, ease.inOutCubic]]);
  const b: Vivo = { vivo: true, x: 0, y, ...bob(t, 8), alfa: smooth(prog(t, ev.tres + .1, ev.tres + .5)) * (1 - smooth(prog(t, ev.claro + .85, ev.claro + 1.45))) };
  const w = (u: number, v: number, z: number) => aMundo(b, u, v, z);
  const M = MANOS.carga(t); b.m1 = w(...M[0]); b.m2 = w(...M[1]); b.abre = [.3, .3];
  b.carga = (c, tt) => { mesa(c); marco(c, tt, 66, 44, ev.doce - .25, ventana(tt, ev.claro - .05, ev.claro + 3, .12, .3), 0, 0); }; b.cargaEn = w(0, -.22, BH + 1.72); b.cargaEsc = 1.05;
  return b;
}
function barcoF(t: number): Vivo {
  if (t < ev.entraF || t > ev.cuatro + .7) return NADA;
  const y = tramos(t, espera(2) - 2.4, [[ev.entraF, ev.crece[0] + .1, espera(2) - .25, ease.outCubic], [ev.crece[1] - .3, ev.crece[1], espera(2) + .25, ease.inCubic], [ev.crece[1], ev.no3 + .3, espera(2) - .05, ease.outCubic]]);
  const b: Vivo = { vivo: true, x: 0, y, ...bob(t, 10), alfa: smooth(prog(t, ev.entraF, ev.entraF + .4)) };
  b.bal = (b.bal ?? 0) + sacudida(t, [ev.crece[1], ev.no3], .15);
  const w = (u: number, v: number, z: number) => aMundo(b, u, v, z);
  const g = smooth(prog(t, ev.crece[0], ev.crece[1]));
  const M: [P3, P3] = [[-.33 - g * .5, -.22, BH + 1.5 + g * .4], [.33 + g * .5, -.22, BH + 1.5 + g * .4]];
  b.m1 = w(...M[0]); b.m2 = w(...M[1]); b.abre = [.3 + g * .6, .3 + g * .6];
  b.carga = (c, tt) => { tienda(c, tt); marco(c, tt, 58, 46, ev.crece[0] - .35, 0, ventana(tt, ev.no3, ev.cuatro, .08, .3), g); }; b.cargaEn = w(0, -.22, BH + 1.8 + g * .35);
  return b;
}
function barcoG(t: number): Vivo {
  if (t < ev.cuatro + .1 || t > ev.ahora + .8) return NADA;
  const y = tramos(t, espera(3) - 3, [[ev.cuatro + .2, ev.equivoca1 - .6, espera(3), ease.outCubic]]);
  const b: Vivo = { vivo: true, x: .1, y, ...bob(t, 12), gorro: true, alfa: smooth(prog(t, ev.cuatro + .1, ev.cuatro + .5)) * (1 - smooth(prog(t, ev.ahora, ev.ahora + .7))) };
  b.bal = (b.bal ?? 0) + sacudida(t, [ev.golpe], .12);
  const w = (u: number, v: number, z: number) => aMundo(b, u, v, z);
  const cae = prog(t, ev.equivoca1, ev.equivoca1 + .5);
  const M = cae > 0 ? MANOS.arriba(t) : MANOS.carga(t);
  b.m1 = w(...M[0]); b.m2 = w(...M[1]); b.abre = cae > 0 ? [1, 1] : [.3, .3];
  if (cae < 1) {
    b.carga = (c) => pastel(c); b.cargaEn = suma3(w(0, -.22, BH + 1.8), L3([0, 0, 0], suma3(w(.05, .62, BH + .12), w(0, -.22, BH + 1.8), -1), ease.inCubic(cae)));
    b.giroCarga = cae * 1.2;
  } else { b.carga = (c) => pastelRoto(c); b.cargaEn = w(.05, .62, BH + .12); }
  return b;
}
function barcoH(t: number): Vivo {
  if (t < ev.entraH || t > ev.v[3] + 2.1) return NADA;
  const S: [number, number, number, ((x: number) => number)?][] = [[ev.entraH, ev.v[0] - .1, espera(0), ease.outCubic]];
  for (let k = 0; k < 3; k++) S.push([ev.v[k] + .15, ev.v[k + 1] - .05, espera(k + 1)]);
  S.push([ev.v[3] + .15, ev.v[3] + 2.0, GY[3] + 7, ease.inCubic]);
  const y = tramos(t, -2.5, S);
  const b: Vivo = { vivo: true, x: 0, y, ...bob(t, 14), alfa: smooth(prog(t, ev.entraH, ev.entraH + .4)) * (1 - smooth(prog(t, ev.v[3] + 1.2, ev.v[3] + 2.0))) };
  const w = (u: number, v: number, z: number) => aMundo(b, u, v, z);
  const fest = ventana(t, ev.v[3], ev.v[3] + 2, .2, .3);
  const M = mezM([w(-.33, -.22, BH + 1.5), w(.8, -.3, BH + .9)], [w(-.33, -.22, BH + 1.5), w(.62, -.3, BH + 1.75 + .1 * Math.sin(t * 10))], fest);
  b.m1 = M[0]; b.m2 = M[1]; b.abre = [.3, .5 + fest * .4];
  b.carga = bicho; b.cargaEn = w(-.1, -.22, BH + 1.85); b.cargaEsc = 1 + .9 * smooth(prog(K.v.pitch, .6, 1.0));
  return b;
}
function barcoI(t: number): Vivo {
  if (t < ev.mover - .3 || t > ev.sig + 3.5) return NADA;
  const choque = t > ev.dno ? -.25 * Math.exp(-(t - ev.dno) * 5) * Math.cos((t - ev.dno) * 9) : 0;
  const y = tramos(t, -2.5, [[ev.mover - .3, ev.i1 - .05, espera(0), ease.outCubic], [ev.i1 + .15, ev.dno - .02, espera(1) + .55, ease.inCubic]]) + choque;
  const b: Vivo = { vivo: true, x: 0, y, ...bob(t, 16), alfa: smooth(prog(t, ev.mover - .3, ev.mover + .1)) };
  b.bal = (b.bal ?? 0) + sacudida(t, [ev.dno], .2);
  b.cab = (b.cab ?? 0) + (t > ev.dno ? .12 * Math.exp(-(t - ev.dno) * 4) * Math.sin((t - ev.dno) * 12) : 0);
  const w = (u: number, v: number, z: number) => aMundo(b, u, v, z);
  // «revisa tú»: la bola voltea y te alarga el dinero
  const ofrece = smooth(prog(t, ev.revisa - .3, ev.revisa + .35)) * (1 - smooth(prog(t, ev.sig - .3, ev.sig + .3)));
  const camP = K.pos as P3;
  const hacia = L3(w(-.33, -.22, BH + 1.5), L3(w(0, -.4, BH + 1), camP, .42), ofrece);
  b.m1 = hacia; b.m2 = ofrece > .1 ? L3(w(.8, -.3, BH + .9), L3(w(0, -.4, BH + 1), camP, .3), ofrece * .7) : w(.33, -.22, BH + 1.5);
  b.abre = [.3 + ofrece * .5, .3 + ofrece * .5];
  b.carga = (c) => dinero(c); b.cargaEn = suma3(hacia, [.25, 0, .3]); b.cargaEsc = 1 + ofrece * .3 + .7 * smooth(prog(K.v.pitch, .6, 1.0));
  return b;
}
const QY = [3.1, 0, -3.1, -6.2];
function barcoQ(t: number, k: number): Vivo {
  const ini = ev.sig + .2 + k * .3;
  if (t < ini || t > ev.preg) return NADA;
  const y = tramos(t, QY[k] - 4, [[ini, ini + 1.4, QY[k], ease.outCubic]]);
  const b: Vivo = { vivo: true, x: 0, y, ...bob(t, 20 + k), esc: 1.12, alfa: smooth(prog(t, ini, ini + .4)) * (1 - smooth(prog(t, ev.preg - .7, ev.preg - .1))) };
  const w = (u: number, v: number, z: number) => aMundo(b, u, v, z);
  const M = MANOS.carga(t); b.m1 = w(...M[0]); b.m2 = w(...M[1]); b.abre = [.3, .3];
  const brilla = ventana(t, ev.impres + k * .08, ev.impres + 1.2, .15, .4);
  b.carga = (c, tt) => { QCARGAS[k](c, tt); if (brilla > 0) { c.strokeStyle = ACENTO; c.globalAlpha *= brilla; c.lineWidth = 4; c.setLineDash([6, 8]); c.lineDashOffset = -tt * 40; c.beginPath(); c.arc(0, -8, 72, 0, 6.2832); c.stroke(); c.setLineDash([]); } };
  b.cargaEn = w(0, -.22, BH + 1.95); b.cargaEsc = 1.0;
  return b;
}
// El final: la bola en la orilla, su barco solo en el agua.
const FIN = { bx: -.2, by: -11.0, ax: -CW - .95, ay: -11.35 };
function barcoFin(t: number): Vivo {
  if (t < ev.preg - .6) return NADA;
  const hunde = ease.inCubic(prog(t, ev.cuando - .05, ev.cuando + 1.9));
  const ladea = smooth(prog(t, ev.sale - .1, ev.cuando + .3));
  const b: Vivo = { vivo: true, x: FIN.bx, y: FIN.by, ...bob(t, 30), vacio: true, alfa: smooth(prog(t, ev.preg - .6, ev.preg - .1)) };
  b.z = (b.z ?? 0) * (1 - hunde) - hunde * 1.25;
  b.bal = (b.bal ?? 0) + ladea * .22 + hunde * .25;
  b.cab = (b.cab ?? 0) - ladea * .12 - hunde * .35;
  return b;
}

// ---------- la regla y la etiqueta del final ----------
function finOrilla(c: C, t: number) {
  if (t < ev.preg - .6) return;
  const a = smooth(prog(t, ev.preg - .6, ev.preg - .1));
  const pie = P([FIN.ax, FIN.ay, ZB]); if (!pie) return;
  c.save(); c.globalAlpha = a * cerca(pie);
  // la regla: mide qué tan inteligente es
  const sube = ease.outBack(prog(t, ev.preg + .2, ev.preg + .7), 1.3) * (1 - ease.inCubic(prog(t, ev.caro - .45, ev.caro + .05)));
  if (sube > .01) {
    at(c, [FIN.ax + .15, FIN.ay + 1.45, ZB], () => {
      c.rotate((1 - clamp(sube)) * -1.2);
      c.fillStyle = "#F2E9D2"; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.rect(-14, -300 * sube, 28, 300 * sube); c.fill(); c.stroke();
      c.lineWidth = 2.5; for (let k = 1; k < 15; k++) { const y = -k * 20 * sube; linea(c, -14, y, k % 5 ? -4 : 4, y); }
      const sub = ease.inOutCubic(prog(t, ev.intel - .2, ev.intel + .55)) * sube;
      const ym = -30 - 250 * sub;
      c.fillStyle = ACENTO; c.beginPath(); c.moveTo(16, ym); c.lineTo(34, ym - 12); c.lineTo(34, ym + 12); c.closePath(); c.fill();
      const ap = smooth(prog(t, ev.intel - .1, ev.intel + .15));
      if (ap > 0) {
        c.globalAlpha *= ap;
        c.font = serif(54, true); const tw = c.measureText("inteligente").width;
        c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.rect(40, ym - 36, tw + 30, 58); c.fill(); c.stroke();
        texto(c, "inteligente", 55, ym + 9, { fuente: serif(54, true), color: TINTA, alin: "left" });
        const tk = ease.outCubic(prog(t, ev.tacha, ev.tacha + .22));
        if (tk > 0) { c.strokeStyle = ACENTO; c.lineWidth = 7; c.lineCap = "round"; linea(c, 46, ym - 2, 46 + (tw + 18) * tk, ym - 2 - 8 * tk); }
      }
    });
  }
  // la bola, de pie en la orilla, mirando su barco
  const triste = smooth(prog(t, ev.cuando + .2, ev.cuando + 1.2));
  const bx = FIN.ax, by = FIN.ay;
  const cen = P([bx, by, ZB + RB * .95 + .03 * Math.abs(Math.sin(t * 2.4))]);
  if (cen) {
    const r = RB * cen.s;
    const alcanza = ease.inOutCubic(prog(t, ev.remate - .5, ev.remate + .9));
    const flota: P3 = [FIN.bx + .1, FIN.by + .1, .25];
    const m2w = L3([bx + .55 + triste * .2, by + .1, ZB + .95 - triste * .2 + (t > ev.caro && t < ev.cuando ? .15 * Math.sin(t * 3) : 0)], flota, alcanza * .55);
    const m1 = P([bx - .5, by - .2, ZB + .85 - triste * .35]), m2 = P(m2w);
    if (m1 && m2) {
      sombra(c, pie.x, pie.y, r * 1.6, .3);
      agente(c, cen.x, cen.y, r, [m1.x, m1.y], [m2.x, m2.y], { abre1: .5, abre2: .6 + triste * .3 });
    }
  }
  c.restore();
}
function etiquetaFin(c: C, t: number, B: Vivo) {
  if (t < ev.caro - .1) return;
  const k = ease.outBack(prog(t, ev.caro - .1, ev.caro + .3), 1.4);
  const suelta = prog(t, ev.cuando + .7, ev.cuando + 1.2);
  const punta = B.vivo ? aMundo(B, 0, .55, BH + .95) : [FIN.bx, FIN.by + .5, 1.2] as P3;
  const fl: P3 = [FIN.bx + .25 + .06 * Math.sin(t * 1.1), FIN.by + .1 + .08 * Math.sin(t * .8), .03 * Math.sin(t * 2)];
  const cuelga: P3 = suma3(punta, [.35 + .08 * Math.sin(t * 3.1), -.1, -.55 - (1 - clamp(k)) * 1.6]);
  const w = suelta > 0 ? L3(cuelga, fl, ease.inOutCubic(suelta)) : cuelga;
  const p = P(w), q = P(punta); if (!p) return;
  c.save(); c.globalAlpha = niebla(w[1]);
  if (q && suelta < .5) { c.strokeStyle = TINTA; c.lineWidth = 2; c.globalAlpha *= 1 - suelta * 2; linea(c, q.x, q.y, p.x, p.y); c.globalAlpha = niebla(w[1]); }
  if (suelta > .9) {
    // la etiqueta flota: queda el precio
    const ap = P([fl[0], fl[1], 0]);
    if (ap) { for (let i = 0; i < 2; i++) { const qq = frac(t * .45 + i * .5); c.save(); c.globalAlpha *= (1 - qq) * .5; c.strokeStyle = "#6F7C78"; c.lineWidth = 2; c.beginPath(); c.ellipse(ap.x, ap.y, (40 + qq * 160) * ap.s / 190, (12 + qq * 46) * ap.s / 190, 0, 0, 6.2832); c.stroke(); c.restore(); } }
  }
  const plana = smooth(prog(t, ev.cuando + 1.0, ev.remate + .2));
  c.translate(p.x, p.y); const e = p.s / 100 * 1.5; c.scale(e, e * lerp(1, .6, plana)); c.rotate(lerp(.5 + .2 * Math.sin(t * 2.6), -.08 + .04 * Math.sin(t * 1.3), plana));
  etiqueta(c); c.restore();
}

// ---------- el tablero de la regla: cuatro verdes contra una roja ----------
function regla(c: C, t: number) {
  const a = smooth(prog(t, ev.regla - .1, ev.regla + .2)) * (1 - smooth(prog(t, ev.sig - .4, ev.sig)));
  if (a <= 0) return;
  c.save(); c.globalAlpha = a;
  c.fillStyle = "rgba(244,242,236,.9)"; c.beginPath(); c.roundRect(80, 120, 880, 560 * smooth(prog(t, ev.unno - .3, ev.unno)) + (1 - smooth(prog(t, ev.unno - .3, ev.unno))) * 290, 26); c.fill();
  const foco = (x: number, y: number, col: string, ini: number) => {
    const k = ease.outBack(prog(t, ini, ini + .25), 2.4); if (k <= 0) return;
    const r = 42 * k;
    const g = c.createRadialGradient(x, y, r * .3, x, y, r * 2.6); g.addColorStop(0, col === "v" ? "rgba(120,190,128,.5)" : "rgba(233,110,80,.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g; circulo(c, x, y, r * 2.6);
    if (col === "v") { const g2 = c.createRadialGradient(x - r * .3, y - r * .35, r * .05, x, y, r); g2.addColorStop(0, "#D6F0D8"); g2.addColorStop(.5, VERDE_C); g2.addColorStop(1, VERDE); c.fillStyle = g2; circulo(c, x, y, r); }
    else bola(c, x, y, r, ACENTO);
    c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.stroke();
  };
  for (let k = 0; k < 4; k++) foco(352 + k * 112, 210, "v", ev.regla + k * .1);
  const t1 = smooth(prog(t, ev.trabajar - .05, ev.trabajar + .2));
  texto(c, "déjalo trabajar", 520, 350, { fuente: serif(ajusta(c, "déjalo trabajar", 112, 820, true), true), color: TINTA, alfa: t1 });
  foco(520, 470, "r", ev.unno - .02);
  const t2 = smooth(prog(t, ev.revisa - .05, ev.revisa + .2));
  texto(c, "revisa tú", 520, 620, { fuente: serif(128, true), color: ACENTO, alfa: t2 });
  c.restore();
}

// Rutas punteadas en el mapa: por dónde pasó cada barco.
function rutas(c: C, t: number) {
  const a = ventana(t, ev.regla, ev.sig - .4, .3, .4);
  if (a <= 0) return;
  const tramo = (y0: number, y1: number, k: number, col: string, x: number) => {
    const A = P([x, y0, .05]), B = P([x, lerp(y0, y1, k), .05]); if (!A || !B) return;
    c.save(); c.globalAlpha = a; c.strokeStyle = col; c.lineWidth = 7; c.setLineDash([3, 15]); c.lineCap = "round"; c.lineDashOffset = -t * 60;
    c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke(); c.restore();
  };
  tramo(-1.5, GY[3] + 3, ease.inOutCubic(prog(t, ev.regla, ev.regla + .9)), VERDE, .35);
  if (t > ev.unno - .1) {
    const k = ease.inOutCubic(prog(t, ev.unno - .1, ev.unno + .4));
    tramo(-1.5, espera(1) + .2, k, ACENTO, -.35);
    if (k >= 1) { const X = P([-.35, espera(1) + .55, .05]); if (X) { c.save(); c.globalAlpha = a; c.strokeStyle = ACENTO; c.lineWidth = 8; c.lineCap = "round"; const r = 18; linea(c, X.x - r, X.y - r, X.x + r, X.y + r); linea(c, X.x + r, X.y - r, X.x - r, X.y + r); c.restore(); } }
  }
}

// ---------- polvo de papel que flota delante de todo ----------
function polvo(c: C, t: number) {
  const r = azar(9);
  c.fillStyle = TINTA;
  for (let i = 0; i < 46; i++) {
    const x0 = r() * 1200 - 60, y0 = r() * 2060, v = 14 + r() * 36, f = r() * 6.3, z = 1.6 + r() * 3;
    const y = ((y0 - t * v) % 2060 + 2060) % 2060 - 70, x = x0 + Math.sin(t * .5 + f) * 30;
    c.globalAlpha = .07 + r() * .12; c.fillRect(x, y, z, z);
  }
  c.globalAlpha = 1;
}

// ---------- el cuadro ----------
function dibuja(c: C, t: number) {
  FR = Math.floor(t * 10);
  const v = vista(t);
  K = camara(v, 540, 960, 1250);
  TY = v.ty; N0 = v.dist * .62; N1 = v.dist * 1.22;
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  canal(c, t);
  // niebla de papel: lo lejano se disuelve en la hoja
  {
    const A = P([0, TY + N0, 0]), B = P([0, TY + N1, 0]);
    if (A && B && A.y > B.y) {
      const g = c.createLinearGradient(0, A.y, 0, B.y);
      g.addColorStop(0, "rgba(244,242,236,0)"); g.addColorStop(1, "rgba(244,242,236,.94)");
      c.fillStyle = g; c.fillRect(0, B.y, 1080, A.y - B.y);
      c.fillStyle = "rgba(244,242,236,.94)"; c.fillRect(0, -10, 1080, B.y + 10);
    }
  }
  juncos(c, t);
  // salpicaduras de los letreros y de las compuertas
  ev.chap.forEach((ts, k) => salpica(c, k ? .45 : -.5, k ? 1.0 : .3, ts, t, 1.2));
  ev.surgen.forEach((ts, i) => { for (const x of [-.7, 0, .7]) salpica(c, x, GY[i] - .1, ts + .15, t, .7); });
  salpica(c, 0, GY[1] - .15, ev.no2 + .45, t, .8);
  salpica(c, 0, GY[0] - .15, ev.cierra1 + .5, t, .6);
  if (t > ev.equivoca1 + .4) salpica(c, .7, espera(3) + .2, ev.equivoca1 + .5, t, .7);

  // los objetos, del fondo hacia la cámara
  const obj: { z: number; f: () => void }[] = [];
  const pon = (w: P3, f: () => void, dz = 0) => { const p = P(w); if (p) obj.push({ z: p.zc + dz, f }); };
  for (let i = 0; i < 4; i++) pon([0, GY[i], 1.5], () => compuerta(c, i, t));
  pon(BAL, () => balanza(c, t), -.2);
  LETR.forEach((L, n) => pon([L.x, L.y, 2], () => letrero(c, t, n), -1.5));
  const D = barcoD(t);
  const barcos = [barcoA(t), barcoB(t), barcoC(t), D, barcoE(t), barcoF(t), barcoG(t), barcoH(t), barcoI(t), barcoQ(t, 0), barcoQ(t, 1), barcoQ(t, 2), barcoQ(t, 3)];
  for (const b of barcos) if (b.vivo) pon([b.x, b.y, .5], () => barco(c, b, t));
  pon([.5, GY[1] + 1, 1], () => perdidos(c, t, D), -3);
  const BF = barcoFin(t);
  if (BF.vivo) pon([BF.x, BF.y, .3], () => barco(c, BF, t));
  pon([FIN.ax, FIN.ay, 1], () => finOrilla(c, t), -4);              // la regla y su letrero nunca quedan detrás de la vela
  pon([FIN.bx, FIN.by, 1], () => etiquetaFin(c, t, BF), -1);
  obj.sort((p, q) => q.z - p.z);
  for (const o of obj) o.f();
  rutas(c, t);
  polvo(c, t);

  // ---------- lo que va escrito ----------
  titulo(c, t, ev.surgen[0] - .05, ev.zarpa + .6, "cuatro preguntas", 250, 132, TINTA, true);
  const Q = ["¿se puede comprobar?", "¿se puede deshacer?", "¿está bien delimitado?", "¿quién paga si falla?"];
  const ini = [ev.uno, ev.dos, ev.tres, ev.cuatro], fin = [ev.dos - .3, ev.tres - .3, ev.cuatro - .3, ev.ahora - .3];
  for (let i = 0; i < 4; i++) {
    titulo(c, t, ini[i] - .1, fin[i], String(i + 1), 205, 150, ACENTO, true);
    titulo(c, t, ini[i] + .25, fin[i], Q[i], 330, 104, TINTA, true);
  }
  titulo(c, t, ev.entraH + .25, ev.mover - .35, "arreglar un error", 215, 108, TINTA, true);
  titulo(c, t, ev.entraH + .45, ev.mover - .35, "de código", 325, 108, TINTA, true);
  titulo(c, t, ev.mover - .1, ev.regla - .3, "mover el dinero", 215, 108, TINTA, true);
  titulo(c, t, ev.mover + .1, ev.regla - .3, "de tu empresa", 325, 108, TINTA, true);
  regla(c, t);
  titulo(c, t, ev.caro - .05, ev.dur, "qué tan caro sale", 250, 120, TINTA, false);
  titulo(c, t, ev.equivoca - .05, ev.dur, "cuando se equivoca", 375, 120, ACENTO, true);
  void GRIS; void LUZ; void mono;
}

export const Pieza: React.FC = () => <Lienzo dibuja={(c, t) => dibuja(c, t)} preparar={() => ({})} />;
