// Serie 2, capítulo 6b. La mesa del capítulo 5 (kraft, veta, escuadras negras), vista desde el techo, y detrás
// una biblioteca que no se acaba. La bola no se sabe tus documentos: va, busca, trae tres páginas y contesta
// leyéndolas. Luego los libreros se hunden y el piso se vuelve el mapa de significados: un plano de tinta donde
// lo parecido vive cerca. Ahí cae cada pedazo de tus documentos, cae la pregunta, y un círculo trae lo más
// cercano: el pastel aunque escribiste postre, y a veces la marisquería aunque pediste sin mariscos. Al final la
// biblioteca se levanta otra vez y la bola cita de dónde sacó cada cosa.
// Todos los tiempos vienen de t.json, que escribe partitura.py: dibujo y sonido son los mismos números.
import React from "react";
import { azar, Cam, camara, clamp, curvas, ease, Fuente, guionCamara, lerp, prog, resorte, smooth, texto, Vista } from "../../kit";
import { ACENTO, anillo, bola, flecha, GRIS, Lienzo, LUZ, mono, NOCHE, PAPEL, rotulo, serif, sombra, TINTA } from "../../marca";
import { agente, brazo } from "../../personaje";
import A from "./t.json";
import duracion from "./duracion.json";

export const DURACION = duracion.dur;
type C = CanvasRenderingContext2D;
type P3 = [number, number, number];
type Q = { x: number; y: number; s: number; zc: number };
type Sprites = Record<string, HTMLCanvasElement>;
type D = { spr: Sprites };

// ---------- el mundo ----------
const KRAFT = "#CFBC98", CANTO = "#9C8560", BLANCO = "#FDFCF8", ROJO = "#E9896C", TINTA_M = "#161514";
const W = 4.1, H = 4.2, GT = .34, PISO = -6.4, RB = .95;
const B0: P3 = [0, -2.75, 0];
const SLOT: P3[] = [[-2.72, 1.15, 0], [0, 1.2, 0], [2.72, 1.15, 0]];
const PW = 2.35, PH = 2.95;
const RESP: P3 = [2.6, -2.55, 0];
const ALTO = 12.2, GR = 1.8, PER = 7.2, LY0 = 7.8, SEGL = 6, NSEG = 22;
const MX0 = -24, MX1 = 24, MY0 = 7.6, MY1 = 80;
const BM: P3 = [1, 14.4, PISO];                                     // donde se para la bola sobre el mapa
const Q1: P3 = [-4.4, 20.7, PISO], Q2: P3 = [3, 30.2, PISO];         // donde caen las dos preguntas
const ORIGEN: P3 = [-8.6, 15.2, PISO];

// ---------- herramientas ----------
let FR = 0;
const frac = (x: number) => x - Math.floor(x);
const tiembla = (j: number) => frac(Math.sin(j * 12.9898 + FR * 78.233) * 43758.5453) - .5;
const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * 6.2832 + f);
const salto = (k: number, h: number) => (k <= 0 || k >= 1 ? 0 : h * 4 * k * (1 - k));
const en = (t: number, a: number, b: number) => t >= a && t < b;
const L3 = (a: P3, b: P3, k: number): P3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const suma = (a: P3, b: P3): P3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const golpeK = (t: number, ti: number, d = .35) => (t < ti ? 0 : Math.exp(-(t - ti) / d * 3));
function circulo(c: C, x: number, y: number, r: number) { c.beginPath(); c.arc(x, y, Math.max(r, .1), 0, 6.2832); c.fill(); }
function linea(c: C, ax: number, ay: number, bx: number, by: number) { c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); }

function poli(c: C, cam: Cam, P: P3[], fill?: string, tinta?: string, g = 3, vib = 1) {
  c.beginPath();
  for (let i = 0; i < P.length; i++) {
    const q = cam.p(P[i][0], P[i][1], P[i][2]);
    if (!q) return;
    const j = P[i][0] * 3.1 + P[i][1] * 5.7 + P[i][2] * 2.3;
    const x = q.x + tiembla(j) * vib, y = q.y + tiembla(j + 40) * vib;
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (tinta) { c.strokeStyle = tinta; c.lineWidth = g; c.lineJoin = "round"; c.stroke(); }
}
function lin(c: C, cam: Cam, a: P3, b: P3, g: number, color = TINTA) {
  const P = cam.p(a[0], a[1], a[2]), R = cam.p(b[0], b[1], b[2]);
  if (!P || !R) return;
  c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round"; c.beginPath(); c.moveTo(P.x, P.y); c.lineTo(R.x, R.y); c.stroke();
}
/** Sprite sobre un cuadrilátero (a arriba-izq, b arriba-der, d abajo-izq). sy0/sh0: qué franja del sprite. */
function imagen(c: C, q: { x: number; y: number }[], spr: HTMLCanvasElement, sy0 = 0, sh0 = spr.height) {
  const sw = spr.width, [a, b, , d] = q;
  c.save(); c.transform((b.x - a.x) / sw, (b.y - a.y) / sw, (d.x - a.x) / sh0, (d.y - a.y) / sh0, a.x, a.y);
  c.drawImage(spr, 0, sy0, sw, sh0, 0, 0, sw, sh0); c.restore();
}
/** Igual, pero partido en una rejilla n×m: de cerca, una cara larga y alta necesita perspectiva en los dos sentidos. */
function cara(c: C, cam: Cam, P: P3[], spr: HTMLCanvasElement, n: number, frac0 = 1, m = 1, sombraZ = 0) {
  const sw = spr.width, sh = spr.height * frac0;
  const en2 = (u: number, v: number) => L3(L3(P[0], P[1], u), L3(P[3], P[2], u), v);
  for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
    const u0 = i / n, u1 = (i + 1) / n, v0 = j / m, v1 = (j + 1) / m;
    const a = cam.p(...en2(u0, v0)), b = cam.p(...en2(u1, v0)), d = cam.p(...en2(u0, v1)), e = cam.p(...en2(u1, v1));
    if (!a || !b || !d || !e) continue;
    // lo que queda pegado a la lente va en sombra: un polígono exacto, sin textura que se deforme
    const k = sombraZ > 0 ? clamp((sombraZ - Math.min(a.zc, b.zc, d.zc, e.zc)) / (sombraZ * .5)) : 0;
    if (k < 1) {
      const w = (u1 - u0) * sw, h = (v1 - v0) * sh;
      c.save(); c.transform((b.x - a.x) / w, (b.y - a.y) / w, (d.x - a.x) / h, (d.y - a.y) / h, a.x, a.y);
      c.drawImage(spr, u0 * sw, v0 * sh, Math.min(w + 1.5, sw - u0 * sw), Math.min(h + 1.5, spr.height - v0 * sh), 0, 0, w + 1.5, h + 1.5); c.restore();
    }
    if (k > 0) {
      c.fillStyle = `rgba(34,30,26,${k})`; c.strokeStyle = c.fillStyle; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(e.x, e.y); c.lineTo(d.x, d.y); c.closePath(); c.fill(); c.stroke();
    }
  }
}
const esquinas = (x: number, y: number, z: number, w: number, h: number, r: number, ix = 0, iy = 0): P3[] => {
  const cs = Math.cos(r), sn = Math.sin(r);
  const P = (u: number, v: number): P3 => [x + u * cs - v * sn, y + u * sn + v * cs, z + u * ix + v * iy];
  return [P(-w / 2, h / 2), P(w / 2, h / 2), P(w / 2, -h / 2), P(-w / 2, -h / 2)];
};
function proy(cam: Cam, P: P3[]) { const Q = P.map((p) => cam.p(p[0], p[1], p[2])); return Q.every(Boolean) ? (Q as Q[]) : null; }
/** Hoja plana con su sombra dura de papel recortado. */
function hoja(c: C, cam: Cam, x: number, y: number, z: number, w: number, h: number, r: number, spr: HTMLCanvasElement | null, o: { suelo?: number; alfa?: number; ix?: number; iy?: number; marco?: string } = {}) {
  const suelo = o.suelo ?? 0, dz = Math.max(z - suelo, 0);
  c.save(); c.globalAlpha = o.alfa ?? 1;
  if (z > suelo - .2) poli(c, cam, esquinas(x + .06 + dz * .16, y - .08 - dz * .12, suelo + .004, w * (1 + dz * .02), h * (1 + dz * .02), r), `rgba(28,20,12,${clamp(.28 - dz * .03, .05, .28)})`);
  const P = esquinas(x, y, z, w, h, r, o.ix ?? 0, o.iy ?? 0);
  poli(c, cam, P, BLANCO, o.marco ?? TINTA, Math.max(1.4, .02 * (cam.p(x, y, z)?.s ?? 80)), .7);
  const q = proy(cam, P);
  if (q && spr) imagen(c, q, spr);
  c.restore();
}
/** Una caja en 3D: tapa y las caras que se ven. */
function caja3(c: C, cam: Cam, x: number, y: number, z: number, w: number, h: number, alto: number, r: number, tapa: string, lado: string, tinta = TINTA) {
  const T0 = esquinas(x, y, z + alto, w, h, r), B = esquinas(x, y, z, w, h, r);
  const cx = cam.pos[0], cy = cam.pos[1];
  for (const [i, j] of [[3, 2], [2, 1], [1, 0], [0, 3]]) {
    const mx = (T0[i][0] + T0[j][0]) / 2 - x, my = (T0[i][1] + T0[j][1]) / 2 - y;
    if (mx * (cx - x) + my * (cy - y) <= mx * mx + my * my) continue;
    poli(c, cam, [T0[i], T0[j], B[j], B[i]], lado, tinta, 2, .5);
  }
  poli(c, cam, T0, tapa, tinta, 2.4, .6);
}

// ---------- la bola: dónde está ----------
type Mov = [number, number, P3, number];
const MOV: Mov[] = [
  [A.va, .52, [0, 14.6, PISO], 3.4], [A.va + .62, .3, [-.7, 16.4, PISO], .6], [A.trae - .02, .62, B0, 4.2],
  [A.truco + .15, .62, [0, 13.4, PISO], 3.2], [A.imagina + .95, .5, BM, .9],
  [A.yo - .12, .7, B0, 4.6], [A.ir + .05, .45, [0, 14.4, PISO], 3.2], [A.buscar + .05, .55, B0, 4.2],
 [A.decirte + .3, .36, [-1.95, -3.15, 0], .7],                       // se hace a un lado para que se vean las citas
];
function bolaEn(t: number): { p: P3; aterriza: number; enMesa: boolean } {
  let p: P3 = [...B0], ult = -9;
  for (const [t0, d, to, ap] of MOV) {
    if (t < t0) break;
    const k = prog(t, t0, t0 + d);
    const q = L3(p, to, smooth(k * .7 + k * k * .3));
    q[2] += salto(k, ap);
    p = k < 1 ? q : [...to];
    if (k >= 1) ult = t0 + d;
  }
  // el golpe de la carpeta y los brincos de gusto
  for (const [ti, h] of [[A.bam, .9], [A.falta + .05, .25], [A.recupera, .2], [A.escribe, .2], [A.tambien, .25], [A.pastel2, .45]] as [number, number][]) p[2] += salto((t - ti) / .42, h);
  if (ult > 0) p[2] += salto((t - ult) / .3, .35) * (t - ult < .3 ? 1 : 0);
  p[2] += Math.abs(vaiven(t, 1.9)) * .05;
  const enMesa = Math.abs(p[0]) < W && Math.abs(p[1]) < H && p[2] > -.5;
  return { p, aterriza: ult, enMesa };
}
const bolaFija = (t: number) => bolaEn(t).p;

// ---------- manos ----------
type Mano = [number, number, number, number];                        // x, y, z, abre
function manosEn(t: number, b: P3): [Mano, Mano] {
  const sw = vaiven(t, 1.3) * .12, sw2 = vaiven(t, 1.7, 1) * .12;
  let m1: Mano = [b[0] - 1.35, b[1] - .2 + sw, b[2] + 1.9 + sw2, .6], m2: Mano = [b[0] + 1.35, b[1] - .2 - sw, b[2] + 1.9 - sw2, .6];
  const mix = (a: Mano, q: Mano, k: number): Mano => [lerp(a[0], q[0], k), lerp(a[1], q[1], k), lerp(a[2], q[2], k), lerp(a[3], q[3], k)];
  const ven = (a: number, b0: number, c0: number, d0: number) => smooth(prog(t, a, b0)) * (1 - smooth(prog(t, c0, d0)));
  // se cubre de la carpeta que cae
  let k = ven(-1, 0, A.bam + .15, A.bam + .5);
  m1 = mix(m1, [b[0] - .75, b[1] + .55, b[2] + 2.4, .9], k); m2 = mix(m2, [b[0] + .75, b[1] + .55, b[2] + 2.4, .9], k);
  // "y no le hace falta": se encoge de hombros y la manda lejos
  k = ven(A.falta - .1, A.falta + .15, A.flick - .1, A.flick + .1);
  m1 = mix(m1, [b[0] - 1.85, b[1] + .5, b[2] + 2.2, 1], k); m2 = mix(m2, [b[0] + 1.85, b[1] + .5, b[2] + 2.2, 1], k);
  k = ven(A.flick - .12, A.flick, A.flick + .12, A.flick + .45);
  m2 = mix(m2, [.6, 1.1, .5, .9], k);
  // libros: se tapa la cabeza
  k = ven(A.cabe - .3, A.cabe, A.asi - .2, A.asi + .2);
  m1 = mix(m1, [b[0] - .6, b[1] + .2, b[2] + 2.5, .9], k); m2 = mix(m2, [b[0] + .6, b[1] + .2, b[2] + 2.5, .9], k);
  // busca: la mano izquierda se mete al librero
  k = ven(A.busca - .25, A.busca + .05, A.busca + .45, A.trae);
  m1 = mix(m1, [-2.6, b[1] + .8, PISO + 3.2 + vaiven(t, .3) * .2, .9], k);
  // pone las tres páginas
  A.pag.forEach((ti, i) => {
    const kk = ven(ti - .2, ti, ti + .02, ti + .22);
    const s = SLOT[i];
    if (i === 0) m1 = mix(m1, [s[0], s[1] - .6, .3, 1], kk); else m2 = mix(m2, [s[0], s[1] - .6, .3, 1], kk);
  });
  // escribe la respuesta
  k = ven(A.leyendo - .15, A.leyendo + .05, A.primero - .1, A.primero + .15);
  m2 = mix(m2, [RESP[0] - .6 + vaiven(t, .23) * .3 + ((t - A.leyendo) % .9) * .9, RESP[1] + .1 + vaiven(t, .17) * .1, .35, .2], k);
  // en el pasillo: levanta dos tarjetas
  k = ven(A.como - .3, A.como, A.imagina + .2, A.imagina + .45);
  m1 = mix(m1, [b[0] - 1.55, b[1] - .4, b[2] + 2.5 + vaiven(t, 1.1) * .08, .8], k); m2 = mix(m2, [b[0] + 1.55, b[1] - .4, b[2] + 2.5 + vaiven(t, 1.3) * .08, .8], k);
  // lanza la pregunta
  k = ven(A.pregunta - .35, A.pregunta - .05, A.pregunta + .05, A.pregunta + .3);
  m1 = mix(m1, [b[0] - 1.1, b[1] - .6, b[2] + 2.9, .8], k);
  // atrapa los tres pedazos y los sostiene
  k = ven(A.mascerca + .3, A.mascerca + .6, A.tambien2 + .2, A.tambien2 + .5);
  m2 = mix(m2, [b[0] + 1.4, b[1] + .3, b[2] + 2.4, .9], k);
  // "postre" / "pastel": las enseña
  k = ven(A.encuentra - .2, A.encuentra + .1, A.tambien2 + .2, A.tambien2 + .5);
  m1 = mix(m1, [b[0] - 1.5, b[1] - .3, b[2] + 2.6, .9], k); m2 = mix(m2, [b[0] + 1.5, b[1] - .3, b[2] + 2.7, .9], k);
  // escribe "restaurante sin mariscos"
  k = ven(A.pides - .2, A.pides + .1, A.puede - .25, A.puede - .05);
  m1 = mix(m1, [b[0] - 1.3, b[1] - .7, b[2] + 2.4, .9], k);
  m2 = mix(m2, [b[0] + .3 + ((t - A.pides) % .8) * 1.2, b[1] - .9, b[2] + 2.3 + vaiven(t, .2) * .1, .2], k);
  // la lanza
  k = ven(A.puede - .2, A.puede - .02, A.puede + .05, A.puede + .3);
  m1 = mix(m1, [b[0] - .8, b[1] + .4, b[2] + 3.1, .8], k);
  // recibe las tres páginas
  k = ven(A.traer + .1, A.traer + .4, A.yo + .4, A.yo + .7);
  m2 = mix(m2, [b[0] + 1.45, b[1] - .2, b[2] + 2.5, .9], k);
  // las acomoda en la mesa otra vez
  [0, 1, 2].forEach((i) => {
    const ti = A.yo + .72 + i * .16, kk = ven(ti - .16, ti, ti + .02, ti + .2), s = SLOT[i];
    if (i === 0) m1 = mix(m1, [s[0], s[1] - .6, .3, 1], kk); else m2 = mix(m2, [s[0], s[1] - .6, .3, 1], kk);
  });
  // vuelve con una página nueva y la pone donde estaba la mala
  k = ven(A.decirte - .2, A.decirte, A.decirte + .05, A.decirte + .3);
  m2 = mix(m2, [SLOT[2][0], SLOT[2][1] - .6, .3, 1], k);
  // señala de dónde lo sacó: toca cada página
  A.cola.forEach((ti, i) => {
    const kk = ven(ti - .14, ti, ti + .06, ti + .24), s = SLOT[i];
    m2 = mix(m2, [s[0] + PW * .28, s[1] - PH / 2 - .45, .3, .2], kk);
  });
  return [m1, m2];
}

// ---------- la biblioteca ----------
type Seg = { x: number; y0: number; y1: number; v: number; prim: boolean; dd: number };
const SEGS: Seg[] = [];
for (let k = 0; k < 10; k++) for (const sg of [-1, 1]) {
  const x = sg * (PER / 2 + k * PER);
  for (let i = 0; i < NSEG; i++) SEGS.push({ x, y0: LY0 + i * SEGL, y1: LY0 + (i + 1) * SEGL, v: (k * 5 + i * 7 + (sg > 0 ? 1 : 0)) % 3, prim: i === 0, dd: Math.hypot(x, LY0 + (i + .5) * SEGL - 13) });
}
function hundido(t: number, s: Seg) {
  const d = s.dd / 60;
  const brota = ease.outBack(prog(t, A.biblio - .12 + d * .55, A.biblio + .42 + d * .55), 1.3);
  const baja = smooth(prog(t, A.imagina - .12 + d * .8, A.imagina + .7 + d * .8));
  const sube = ease.outBack(prog(t, A.ir - .35 + d * .4, A.ir + .2 + d * .4), 1.2);
  return 1 - Math.max(brota * (1 - baja), sube);
}
function libreros(c: C, cam: Cam, t: number, d: D) {
  const vis: { s: Seg; h: number; zc: number }[] = [];
  for (const s of SEGS) {
    const h = Math.min(ALTO * (1 - hundido(t, s)), ALTO * 1.08);
    if (h < .03) continue;
    const pc = cam.p(s.x, (s.y0 + s.y1) / 2, PISO + h / 2); if (!pc) continue;
    if (pc.x < -900 || pc.x > 1980) continue;
    vis.push({ s, h, zc: pc.zc });
  }
  vis.sort((a, b) => b.zc - a.zc);
  for (const v of vis) segmento(c, cam, v.s, v.h, v.zc, d);
}
function segmento(c: C, cam: Cam, s: Seg, h: number, zc: number, d: D) {
  const g = GR / 2, z0 = PISO, z1 = PISO + h, cx = cam.pos[0], cy = cam.pos[1];
  const niebla = clamp((zc - 40) / 125);
  if (niebla > .985) return;
  const nieblaF = (P: P3[]) => { if (niebla > .02) poli(c, cam, P, `rgba(244,242,236,${niebla})`, undefined, 0, 0); };
  const xf = cx < s.x - g ? s.x - g : cx > s.x + g ? s.x + g : null;
  if (xf !== null) {
    const P: P3[] = [[xf, s.y0, z1], [xf, s.y1, z1], [xf, s.y1, z0], [xf, s.y0, z0]];
    poli(c, cam, P, "#2a2622", undefined, 0, 0);
    if (zc < 95) cara(c, cam, P, d.spr["lomos" + s.v], zc < 12 ? 14 : zc < 22 ? 8 : zc < 36 ? 4 : zc < 60 ? 2 : 1, Math.min(h / ALTO, 1), zc < 12 ? 8 : zc < 22 ? 4 : zc < 36 ? 2 : 1, 5.5);
    else poli(c, cam, P, "#8d826f", undefined, 0, 0);
    nieblaF(P);
  }
  if (s.prim && cy < s.y0) {
    const P: P3[] = [[s.x - g, s.y0, z1], [s.x + g, s.y0, z1], [s.x + g, s.y0, z0], [s.x - g, s.y0, z0]];
    poli(c, cam, P, "#24201c", "#0d0c0b", 2, .4); nieblaF(P);
  }
  if (cam.pos[2] > z1) {
    const P: P3[] = [[s.x - g, s.y0, z1], [s.x + g, s.y0, z1], [s.x + g, s.y1, z1], [s.x - g, s.y1, z1]];
    poli(c, cam, P, "#3d372f", "rgba(10,9,8,.8)", 1.4, .3); nieblaF(P);
  }
}

// ---------- la mesa ----------
function mesa(c: C, cam: Cam, d: D) {
  const P = cam.pos, tp: P3[] = [[-W, H, 0], [W, H, 0], [W, -H, 0], [-W, -H, 0]];
  if (cam.v.pitch < 1.2) for (const [x, y] of [[-W + .35, -H + .35], [W - .35, -H + .35], [-W + .35, H - .35], [W - .35, H - .35]]) {
    if (y > 0 && P[1] < 0 && cam.v.pitch > .9) continue;
    lin(c, cam, [x, y, -GT], [x, y, PISO], .5 * (cam.p(x, y, -1)?.s ?? 90), "#2f281f");
  }
  if (P[1] < -H) poli(c, cam, [[-W, -H, 0], [W, -H, 0], [W, -H, -GT], [-W, -H, -GT]], CANTO, TINTA, 3);
  if (P[0] > W) poli(c, cam, [[W, -H, 0], [W, H, 0], [W, H, -GT], [W, -H, -GT]], CANTO, TINTA, 3);
  if (P[0] < -W) poli(c, cam, [[-W, -H, 0], [-W, H, 0], [-W, H, -GT], [-W, -H, -GT]], CANTO, TINTA, 3);
  poli(c, cam, tp, KRAFT, TINTA, 4.5, .8);
  const q = proy(cam, tp);
  if (q) {
    c.save(); c.beginPath(); q.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.clip();
    if (cam.v.pitch > .75) imagen(c, q, d.spr.veta); else cara(c, cam, tp, d.spr.veta, 6);
    c.restore();
  }
}
function escuadras(c: C, cam: Cam) {
  const SG = [[-1, 1], [1, 1], [1, -1], [-1, -1]];
  SG.forEach(([sx, sy]) => {
    const L = 1.25, G = .34, z = .03, x = sx * W, y = sy * H, g = sx * .1, h = sy * .1;
    const L1: P3[] = [[x + g, y + h, z], [x - sx * L, y + h, z], [x - sx * L, y - sy * G, z], [x - sx * G, y - sy * G, z], [x - sx * G, y - sy * L, z], [x + g, y - sy * L, z]];
    poli(c, cam, L1, "#1b1b1a", "#000", 2, .5);
    for (const [a1, b1] of [[x - sx * .22, y - sy * .02], [x - sx * .9, y - sy * .02], [x - sx * .02, y - sy * .9]]) { const p = cam.p(a1, b1, z); if (p) { c.fillStyle = "#77746c"; circulo(c, p.x, p.y, Math.max(3, .07 * p.s)); } }
  });
}
function piso(c: C, cam: Cam) {
  c.strokeStyle = "rgba(17,17,17,.055)"; c.lineWidth = 2; c.beginPath();
  for (let i = -14; i <= 14; i++) {
    const a = cam.p(i * 3, -30, PISO), b = cam.p(i * 3, 60, PISO), q = cam.p(-42, i * 3 + 15, PISO), r = cam.p(42, i * 3 + 15, PISO);
    if (a && b) { c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); }
    if (q && r) { c.moveTo(q.x, q.y); c.lineTo(r.x, r.y); }
  }
  c.stroke();
  poli(c, cam, [[-W + .9, H - .9, PISO], [W + .9, H - .9, PISO], [W + .9, -H - .9, PISO], [-W + .9, -H - .9, PISO]], "rgba(28,22,14,.14)", undefined, 0, 0);
}

// ---------- la carpeta de tus documentos ----------
function carpetaEn(t: number): { x: number; y: number; z: number; r: number; s: number } | null {
  if (t < A.flick) {
    const k = prog(t, -.02, A.bam);
    return { x: 0, y: 1.0, z: 7 * (1 - k * k), r: -.05 + (1 - k) * .5, s: 1 };
  }
  if (t < A.flick + 1.1) { const a = t - A.flick; return { x: 1.2 * a, y: 1.0 + 9 * a + 6 * a * a, z: .1 + salto(a / 1.1, 1.5), r: -.05 + a * 2.4, s: 1 }; }
  if (t > A.pedazo - .6 && t < A.pedazo + .5) {              // regresa volando y se abre sobre el mapa
    const k = prog(t, A.pedazo - .6, A.pedazo + .35);
    return { x: lerp(-4, 0, k), y: lerp(48, 27, k), z: PISO + lerp(16, 8.5, k), r: k * 3.2, s: 1 + .2 * k };
  }
  return null;
}
function carpeta(c: C, cam: Cam, t: number, d: D) {
  const f = carpetaEn(t); if (!f) return;
  const suelo = f.z > PISO + 1 && t > A.pedazo - 1 ? PISO : 0;
  const ab = t > A.pedazo ? ease.outCubic(prog(t, A.pedazo + .2, A.pedazo + .45)) : 0;
  // hojas que se le salen con el golpe
  const a = t - A.bam;
  if (a > 0 && t < A.flick + 1) {
    const r = azar(5), va = Math.max(t - A.flick, 0);
    for (let i = 0; i < 9; i++) {
      const an = r() * 6.28, v = 4.2 + r() * 2.6, vida = .5 + r() * .6, gi = (r() - .5) * 4, q = Math.min(a, vida), dx = Math.cos(an) * v * q * (1 - q / (2 * vida)), dy = Math.sin(an) * v * .8 * q * (1 - q / (2 * vida));
      const x = dx + va * (1.5 + i * .2) + Math.sin(t * 1.3 + i) * .03, y = 1 + dy + va * (8 + i * .7) + va * va * 6;
      hoja(c, cam, x, y, -.03 + i * .004 + salto(a / vida, .5) + salto(va / 1, .9), 1.7, 2.1, an + q * gi + va * gi * 1.5, d.spr.doc, { alfa: 1 - smooth(prog(va, .6, 1)) });
    }
  }
  hoja(c, cam, f.x, f.y, f.z, 3.4 * f.s, 4.2 * f.s * (1 - ab * .9), f.r, d.spr.carpeta, { suelo, alfa: 1 - ab });
}

// ---------- los huecos de lo que no conoce ----------
const HUECO: [string, number][] = [["menú", A.menu], ["familia", A.familia], ["ayer", A.ayer]];
function huecos(c: C, cam: Cam, t: number) {
  if (t < A.menu - .3 || t > A.pag[2] + .1) return;
  HUECO.forEach(([s, ti], i) => {
    if (t > A.pag[i]) return;
    const a = ease.outBack(prog(t, ti - .25, ti + .05)), [x, y] = SLOT[i];
    if (a <= 0) return;
    const P = esquinas(x, y, .01, PW, PH, 0), q = proy(cam, P); if (!q) return;
    c.save(); c.globalAlpha = clamp(a);
    c.setLineDash([14, 12]); c.lineDashOffset = -t * 20; c.strokeStyle = "rgba(17,17,17,.6)"; c.lineWidth = 4;
    c.beginPath(); q.forEach((p, j) => (j ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.stroke(); c.setLineDash([]);
    const m = cam.p(x, y + .75, .01), qm = cam.p(x, y - .45, .01);
    if (m && qm) {
      texto(c, s, m.x, m.y, { fuente: serif(Math.round(.55 * m.s), true), color: "rgba(17,17,17,.62)", base: "middle" });
      const z = lerp(1.8, 1, clamp(a));
      texto(c, "?", qm.x, qm.y, { fuente: serif(Math.round(1.3 * qm.s * z), true), color: ACENTO, base: "middle" });
    }
    c.restore();
  });
}

// ---------- los libros que no caben ----------
type Libro = { x: number; y: number; r: number; t: number; z: number; w: number; h: number; e: number; col: number; cae: number; vx: number; vy: number };
const LIBROS: Libro[] = (() => {
  const r = azar(61), L: Libro[] = [], hechos: Libro[] = [];
  A.libros.forEach((ti, i) => {
    const borde = i > 20 && r() < .45;
    const x = borde ? (r() < .5 ? -1 : 1) * (3.3 + r() * 1.2) : (r() - .5) * 6.6, y = borde ? (r() - .5) * 6 : (r() - .55) * 6.4;
    const w = 1.5 + r() * .5, h = 2.1 + r() * .5, e = .32 + r() * .2;
    let z = 0;
    for (const o of hechos) if (Math.hypot(o.x - x, o.y - y) < 1.5) z = Math.max(z, o.z + o.e);
    const l: Libro = { x, y, r: (r() - .5) * 1.4, t: ti, z, w, h, e, col: Math.floor(r() * 5), cae: borde ? ti + .05 : 99, vx: Math.sign(x) * (2 + r() * 2), vy: (r() - .5) * 2 };
    if (!borde) hechos.push(l);
    L.push(l);
  });
  return L;
})();
const TAPAS = ["#1d1c1a", "#E6E1D4", "#9b8b6c", "#56534d", "#C9BFA8"];
const LADOS = ["#0c0c0b", "#cfc8b6", "#7a6c52", "#3b3935", "#aea38b"];
function libroEn(l: Libro, t: number): P3 | null {
  const a = t - l.t;
  if (a < -.42) return null;
  let x = l.x, y = l.y, z = l.z;
  if (a < 0) z += 10 * (a / .42) ** 2;
  if (t > l.cae) { const b = t - l.cae; x += l.vx * b; y += l.vy * b; z -= 22 * b * b; if (z < PISO) z = PISO + salto((z - PISO) / -6, 0); }
  // se van a la biblioteca: suben y se pierden a lo lejos
  const v = t - (A.asi + .15 + (l.t - A.libros[0]) * .35);
  if (v > 0) { const k = v / 1.1; if (k > 1) return null; x = lerp(x, x * 3, k); y = lerp(y, 40 + l.x * 4, k * k); z = z + salto(k, 9) + k * 4; }
  return [x, y, Math.max(z, PISO)];
}
function libros(c: C, cam: Cam, t: number, debajo: boolean) {
  if (t < A.cabe - .5 || t > A.asi + 2.2) return;
  const vis = LIBROS.map((l) => ({ l, p: libroEn(l, t) })).filter((v) => v.p && (v.p[2] < -.4) === debajo) as { l: Libro; p: P3 }[];
  vis.sort((a, b) => a.p[2] - b.p[2] || a.l.t - b.l.t);
  for (const { l, p } of vis) {
    const a = t - l.t, gira = a < 0 ? -a * 3 : 0;
    if (p[2] > -.3) poli(c, cam, esquinas(p[0] + .06, p[1] - .08, .004, l.w, l.h, l.r), "rgba(28,20,12,.22)", undefined, 0, 0);
    caja3(c, cam, p[0], p[1], p[2], l.w, l.h, l.e, l.r + gira, TAPAS[l.col], LADOS[l.col]);
    if (l.col !== 1) lin(c, cam, [p[0] - l.w * .3, p[1] + l.h * .38, p[2] + l.e + .01], [p[0] + l.w * .3, p[1] + l.h * .38, p[2] + l.e + .01], 2, l.col === 0 ? "#6c6a64" : "rgba(17,17,17,.5)");
  }
}

// ---------- páginas: dónde está cada una ----------
type Pag = { spr: string; desde: number; hasta: number; slot: number; llega: number; carga: number };
const PAGS: Pag[] = [
  { spr: "menu", desde: A.busca + .3, hasta: A.tambien2, slot: 0, llega: A.pag[0], carga: 0 },
  { spr: "familia", desde: A.busca + .3, hasta: A.tambien2, slot: 1, llega: A.pag[1], carga: 1 },
  { spr: "ayer", desde: A.busca + .3, hasta: A.tambien2, slot: 2, llega: A.pag[2], carga: 2 },
  { spr: "fonda", desde: A.traer + .46, hasta: 999, slot: 0, llega: A.yo + .72, carga: 0 },
  { spr: "taqueria", desde: A.traer + .46, hasta: 999, slot: 1, llega: A.yo + .88, carga: 1 },
  { spr: "marisq", desde: A.traer + .46, hasta: A.saber + .2, slot: 2, llega: A.yo + 1.04, carga: 2 },
  { spr: "asador", desde: A.buscar - .1, hasta: 999, slot: 2, llega: A.decirte, carga: 0 },
];
/** La lupa se lleva la página de la marisquería. */
const SACA = A.trajo + .35;
function paginas(c: C, cam: Cam, t: number, d: D, mano: P3) {
  for (const p of PAGS) {
    if (t < p.desde || t > p.hasta) continue;
    const s = SLOT[p.slot];
    if (t < p.llega - .2) continue;                               // en la mano: se dibuja con la bola
    const k = prog(t, p.llega - .2, p.llega);
    let x = lerp(mano[0], s[0], k), y = lerp(mano[1], s[1], k), z = lerp(mano[2], 0, k * k) + .012 * p.carga;
    const r = lerp(.4 - p.carga * .2, (p.slot - 1) * .04, k);
    if (p.spr === "marisq" && t > SACA) { const a = t - SACA; x += 5 * a * a + 2.6 * a; y -= .4 * a; }
    hoja(c, cam, x, y, z + .01, PW, PH, r, d.spr[p.spr]);
    if (t < A.truco) contorno(c, cam, esquinas(x, y, z + .02, PW + .2, PH + .2, r), marcaA(t));
    if ((p.spr === "asador" || p.spr === "fonda" || p.spr === "taqueria") && t > A.cola[0] - .1) pestana(c, cam, x, y, t, p.slot);
  }
}
function pestana(c: C, cam: Cam, x: number, y: number, t: number, i: number) {
  const k = ease.outBack(prog(t, A.cola[i] - .05, A.cola[i] + .2), 2);
  if (k <= 0) return;
  const p = cam.p(x + PW * .28, y - PH / 2 - .32, .02); if (!p) return;
  const s = p.s / 100 * 1.45 * clamp(k, 0, 1.3);
  c.save(); c.translate(p.x, p.y); c.scale(s, s);
  c.fillStyle = ACENTO; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.roundRect(-10, -40, 74, 80, 10); c.fill(); c.stroke();
  texto(c, String(i + 1), 28, 22, { fuente: mono(56), color: "#fff" });
  c.restore();
}
const marca = (t: number, a: number, b: number) => smooth(prog(t, a - .05, a + .15)) * (1 - smooth(prog(t, b - .2, b)));
const marcaR = (t: number) => Math.max(marca(t, A.recupera, A.despues), marca(t, A.rec, A.bautizo));
const marcaA = (t: number) => marca(t, A.aum, A.bautizo);
const marcaG = (t: number) => Math.max(marca(t, A.escribe, A.eso), marca(t, A.gen, A.bautizo));
function contorno(c: C, cam: Cam, P: P3[], k: number) {
  if (k <= .01) return;
  const q = proy(cam, P); if (!q) return;
  c.save(); c.globalAlpha = k; c.strokeStyle = ACENTO; c.lineWidth = 7; c.lineJoin = "round";
  c.beginPath(); q.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.stroke(); c.restore();
}
/** "recupera": de lo hondo de la biblioteca a la mesa. */
function trayecto(c: C, cam: Cam, t: number) {
  const k = marcaR(t); if (k <= .01) return;
  const a = cam.p(0, 34, PISO + 3), b = cam.p(0, H + .2, .8); if (!a || !b) return;
  c.save(); c.globalAlpha = k; c.strokeStyle = ACENTO; c.lineWidth = 6; c.setLineDash([3, 16]); c.lineCap = "round"; c.lineDashOffset = -t * 120;
  linea(c, a.x, a.y, b.x, b.y); c.setLineDash([]); flecha(c, b.x, b.y - 60, b.x, b.y, ACENTO, 6, 26); c.restore();
}
function respuesta(c: C, cam: Cam, t: number, d: D) {
  if (t < A.leyendo - .1) return;
  const spr = t > A.donde - .05 ? "resp3" : t > A.yo + 1.2 ? "resp2" : t < A.tambien2 ? "resp1" : null;
  if (!spr) return;
  const k = spr === "resp2" ? prog(t, A.yo + 1.2, A.contestaAsi) : 1;
  const z = spr === "resp2" ? 3 * (1 - k) ** 2 : 0;
  hoja(c, cam, RESP[0], RESP[1], z + .005, 2.5, 1.75, .05, d.spr[spr]);
  contorno(c, cam, esquinas(RESP[0], RESP[1], .01, 2.75, 2, .05), marcaG(t));
  // de dónde lo sacó: cada número de la respuesta, a su página
  if (spr === "resp3") A.cola.forEach((ti, i) => {
    const u = ease.outCubic(prog(t, ti - .05, ti + .25)); if (u <= 0) return;
    const a = cam.p(RESP[0] - .1 + [.55, .25, .7][i], RESP[1] + .45 - i * .3, .02), s0 = SLOT[i], b = cam.p(s0[0] + PW * .28, s0[1] - PH / 2 - .45, .02);
    if (!a || !b) return;
    c.save(); c.strokeStyle = ACENTO; c.lineWidth = 6.5; c.setLineDash([2, 13]); c.lineCap = "round"; c.lineDashOffset = -t * 60;
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(lerp(a.x, b.x, u), lerp(a.y, b.y, u)); c.stroke(); c.restore();
  });
  if (spr === "resp1") {                                          // se escribe al ritmo de la mano
    const q = proy(cam, esquinas(RESP[0], RESP[1], .006, 2.5, 1.75, .05));
    const u = prog(t, A.leyendo, A.primero);
    if (q && u < 1) {
      c.save(); c.fillStyle = BLANCO; c.beginPath();
      const rr = esquinas(RESP[0] + 2.5 * u / 2 - .05, RESP[1] - .1, .007, 2.5 * (1 - u) + .1, 1.4, .05), qq = proy(cam, rr);
      if (qq) { qq.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.fill(); }
      c.restore();
    }
  }
}

// ---------- el mapa de significados ----------
type Idea = { w: string; x: number; y: number; g: number; l: number };          // l: -1 a la izquierda, 0 arriba, 1 a la derecha
const IDEAS: Idea[] = [
  { w: "postre", x: -5.3, y: 19.3, g: 1, l: -1 }, { w: "pastel", x: -3.9, y: 19, g: 1, l: 1 },
  { w: "flan", x: -7.3, y: 20.6, g: .8, l: -1 }, { w: "helado", x: -2.3, y: 21.5, g: .8, l: 1 }, { w: "galletas", x: -6.7, y: 17.5, g: .8, l: -1 },
  { w: "globos", x: 4.4, y: 19.4, g: .8, l: 0 }, { w: "piñata", x: 7, y: 20.6, g: .8, l: 0 }, { w: "invitados", x: 6, y: 17.2, g: .8, l: 1 },
  { w: "fonda", x: -.7, y: 28.8, g: .8, l: -1 }, { w: "taquería", x: 1.1, y: 27.4, g: .8, l: -1 }, { w: "restaurante", x: -.9, y: 31.2, g: .8, l: 0 },
  { w: "marisquería", x: 4, y: 30.8, g: 1, l: 0 }, { w: "camarón", x: 6.7, y: 29.1, g: .8, l: 1 }, { w: "cangrejo", x: 7.4, y: 31.6, g: .8, l: 1 }, { w: "ceviche", x: 5.4, y: 27.6, g: .8, l: 1 },
  { w: "bolero", x: -7, y: 32, g: .85, l: 0 }, { w: "mariachi", x: -4.9, y: 34.6, g: .8, l: 1 }, { w: "guitarra", x: -8.4, y: 35.4, g: .8, l: 0 },
  { w: "mamá", x: 0, y: 47.6, g: .85, l: 0 }, { w: "tía", x: -2.3, y: 49.1, g: .8, l: 0 }, { w: "primos", x: .9, y: 50.4, g: .8, l: 1 },
  { w: "lluvia", x: 12.6, y: 48, g: .7, l: 0 }, { w: "coche", x: -11, y: 25, g: .7, l: 0 }, { w: "perro", x: 11, y: 26.4, g: .7, l: 0 }, { w: "lunes", x: -11.4, y: 50.4, g: .7, l: 0 },
];
const TIDEA = (i: number) => (i < 2 ? A.imagina + .55 : A.ideas[Math.min(i, A.ideas.length - 1)]);
const MOTAS: P3[] = (() => { const r = azar(404), L: P3[] = []; while (L.length < 150) { const x = MX0 + 1 + r() * (MX1 - MX0 - 2), y = MY0 + 1 + r() * (MY1 - MY0 - 2); if (IDEAS.every((q) => Math.hypot(q.x - x, q.y - y) > 1.6)) L.push([x, y, r()]); } return L; })();
const FUENTES: Fuente[] = [
  { x: -5, y: 19.6, a: 1, s: 2.1 }, { x: 5.8, y: 19.1, a: 1, s: 1.8 }, { x: .1, y: 29.2, a: .9, s: 1.9 }, { x: 5.6, y: 29.8, a: 1, s: 2 },
  { x: -6.8, y: 34, a: 1, s: 1.9 }, { x: -.4, y: 49, a: .9, s: 1.9 }, { x: 12.6, y: 48, a: .6, s: 2.1 }, { x: -11, y: 25, a: .6, s: 2.1 }, { x: 11, y: 26.4, a: .6, s: 2 }, { x: -11.4, y: 50.4, a: .6, s: 2 },
];
// pedazos de tus documentos: dónde cae cada uno y qué dice
type Pz = { x: number; y: number; r: number; k: string; t: number; atrapa?: number };
const PEDAZOS: Pz[] = [
  { x: -3.1, y: 20.1, r: .2, k: "tres", t: A.pedazos[0], atrapa: 1 }, { x: -6.2, y: 21.6, r: -.3, k: "flan", t: A.pedazos[1], atrapa: 1 },
  { x: -5.3, y: 17.7, r: .4, k: "lin", t: A.pedazos[2], atrapa: 1 }, { x: 7.7, y: 19, r: -.2, k: "lin", t: A.pedazos[3] },
  { x: 4.6, y: 29.9, r: .25, k: "mar", t: A.pedazos[4], atrapa: 2 }, { x: 2, y: 28.3, r: -.15, k: "lin", t: A.pedazos[5], atrapa: 2 },
  { x: 1.8, y: 30.1, r: .3, k: "lin", t: A.pedazos[6], atrapa: 2 }, { x: -8.8, y: 30.4, r: .1, k: "lin", t: A.pedazos[7] },
  { x: -1, y: 48.4, r: -.25, k: "nota", t: A.pedazos[8] }, { x: 11.6, y: 47, r: .35, k: "lin", t: A.pedazos[9] },
  { x: -2.8, y: 26, r: -.1, k: "lin", t: A.pedazos[10] }, { x: -10.2, y: 24, r: .2, k: "lin", t: A.pedazos[11] },
  { x: 9.5, y: 26.9, r: -.3, k: "lin", t: A.pedazos[12] }, { x: -5.8, y: 35.6, r: .15, k: "lin", t: A.pedazos[13] },
];
const ESTALLA: P3 = [0, 25, PISO + 7];
const anillo1 = (t: number) => ease.outCubic(prog(t, A.trae2 + .1, A.mascerca - .05)) * 2.5 * (1 - smooth(prog(t, A.encuentra, A.encuentra + .4)));
const anillo2 = (t: number) => ease.outCubic(prog(t, A.traer, A.traer + .14)) * 2.2 * (1 - smooth(prog(t, A.enmapa - .1, A.enmapa + .3)));
function pedazoEn(pz: Pz, t: number, mano: P3): P3 | null {
  const a = t - pz.t;
  if (a < -.5) return null;
  if (a < 0) { const k = 1 + a / .5; const q = L3(ESTALLA, [pz.x, pz.y, PISO], k); q[2] = lerp(ESTALLA[2], PISO, k * k) + salto(k, 2); return q; }
  const vuela = pz.atrapa === 1 ? A.mascerca + .15 : pz.atrapa === 2 ? A.traer + .12 : 999, dv = pz.atrapa === 2 ? .36 : .45;
  if (t < vuela) return [pz.x, pz.y, PISO + .02];
  const k = prog(t, vuela, vuela + dv);
  if (k >= 1) return null;                                         // ya está en la mano
  const q = L3([pz.x, pz.y, PISO], mano, smooth(k)); q[2] += salto(k, 2.4); return q;
}
function mapaK(t: number) { return ease.inOutCubic(prog(t, A.imagina + .2, A.mapa + .9)) * (1 - smooth(prog(t, A.yo + .25, A.yo + 1.3))); }
function mapa(c: C, cam: Cam, t: number, d: D) {
  const k = mapaK(t); if (k <= 0) return;
  const yU = lerp(MY0, MY1, k), z = PISO + .01;
  const R: P3[] = [[MX0, yU, z], [MX1, yU, z], [MX1, MY0, z], [MX0, MY0, z]];
  const q = proy(cam, R); if (!q) return;
  poli(c, cam, R, TINTA_M, "rgba(237,234,227,.5)", 3, .4);
  const camP = { ...cam, p: (x: number, y: number, zz = 0) => cam.p(x, y, zz + PISO + .02) } as Cam;
  c.save(); c.beginPath(); q.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.clip();
  // vecindarios: curvas de nivel del parecido
  const kc = smooth(prog(t, A.parecidas - .2, A.parecidas + .9));
  if (kc > 0) curvas(c, camP, FUENTES.map((f) => ({ ...f, a: f.a * kc })), { x0: -15, x1: 15, y0: MY0, y1: Math.min(yU, 56), paso: .4, niveles: [.18, .38, .6, .84], tinta: (_, i) => `rgba(237,234,227,${.16 + i * .07})`, grosor: (i) => 1.8 + i * .5 });
  // lo que no tiene nombre
  for (const [x, y, s] of MOTAS) {
    if (y > yU) continue;
    const ap = smooth(prog(t, A.lugar - .6 + s * 1.2, A.lugar - .4 + s * 1.2)); if (ap <= 0) continue;
    const p = cam.p(x, y, z); if (p) { c.fillStyle = `rgba(237,234,227,${.4 * ap})`; circulo(c, p.x, p.y, .12 * p.s); }
  }
  c.restore();
  // el rollo que se desenrolla
  if (k < .995) {
    const a = cam.p(MX0 - .4, yU, PISO + .42), b = cam.p(MX1 + .4, yU, PISO + .42);
    if (a && b) { c.strokeStyle = "#0c0b0a"; c.lineCap = "round"; c.lineWidth = .9 * a.s; linea(c, a.x, a.y, b.x, b.y); c.strokeStyle = "rgba(237,234,227,.4)"; c.lineWidth = .1 * a.s; linea(c, a.x, a.y - .25 * a.s, b.x, b.y - .25 * b.s); }
  }
}
/** Lo que va encima del mapa: ideas con nombre, pedazos, preguntas, el círculo y las flechas. */
function sobreMapa(c: C, cam: Cam, t: number, d: D, mano: P3, lanza: P3) {
  const k = mapaK(t); if (k <= 0) return;
  const yU = lerp(MY0, MY1, k), z = PISO + .02, apaga = 1 - smooth(prog(t, A.saber, A.saber + .5));
  // los pedazos
  for (const pz of PEDAZOS) {
    const p = pedazoEn(pz, t, mano); if (!p || (p[1] > yU && p[2] < PISO + .1)) continue;
    const resalta = (pz.atrapa === 1 && t > A.mascerca - .1 && t < A.mascerca + .15) || (pz.atrapa === 2 && t > A.traer && t < A.traer + .12);
    hoja(c, cam, p[0], p[1], p[2], .95, 1.2, pz.r + (p[2] - PISO) * .3, d.spr["pz_" + pz.k], { suelo: PISO, marco: resalta ? ACENTO : TINTA });
  }
  // las ideas
  IDEAS.forEach((q, i) => {
    if (q.y > yU) return;
    const ti = TIDEA(i), a = smooth(prog(t, ti, ti + .2)) * apaga;
    if (a <= 0) return;
    const p = cam.p(q.x, q.y, z); if (!p) return;
    const pop = 1 + .6 * Math.exp(-Math.max(t - ti, 0) * 9);
    const dest = (q.w === "pastel" || q.w === "postre") && t > A.pastel - .1 && t < A.pedazo ? 1 : (q.w === "marisquería" && t > A.enmapa - .1 && t < A.yo) ? 1 : 0;
    c.fillStyle = dest ? "#fff" : LUZ; circulo(c, p.x, p.y, .24 * p.s * pop);
    const px = clamp(.8 * q.g * p.s, 40, dest ? 124 : 92);
    const lx = q.l === 0 ? p.x : p.x + q.l * (.42 * p.s), ly = q.l === 0 ? p.y - .4 * p.s - px * .12 : p.y + px * .3;
    texto(c, q.w, lx, ly, { fuente: serif(Math.round(px), true), color: dest ? "#fff" : "rgba(237,234,227,.86)", alfa: a, alin: q.l < 0 ? "right" : q.l > 0 ? "left" : "center" });
  });
  // pastel junto a postre: el corchete que dice "cerca"
  const kp = smooth(prog(t, A.postre - .1, A.postre + .2)) * (1 - smooth(prog(t, A.pedazo - .4, A.pedazo)));
  if (kp > 0) {
    const a = cam.p(IDEAS[0].x, IDEAS[0].y, z), b = cam.p(IDEAS[1].x, IDEAS[1].y, z);
    if (a && b) { c.save(); c.globalAlpha = kp; c.strokeStyle = ROJO; c.lineWidth = .1 * a.s; c.lineCap = "round"; c.beginPath(); c.moveTo(a.x, a.y + .45 * a.s); c.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + .9 * a.s, b.x, b.y + .45 * b.s); c.stroke(); c.restore(); }
  }
  // las preguntas
  pregunta(c, cam, t, Q1, A.pregunta, A.tambien, "postre", lanza, A.pides);
  pregunta(c, cam, t, Q2, A.puede, A.traer, "sin mariscos", lanza, A.yo + .2);
  const r1 = anillo1(t), r2 = anillo2(t);
  if (r2 > .02) { const cc = { ...cam, p: (x: number, y: number, zz = 0) => cam.p(x, y, zz + PISO + .03) } as Cam; anillo(c, cc, Q2[0], Q2[1], r2, ACENTO, 1, 6); }
  if (r1 > .02) { const cc = { ...cam, p: (x: number, y: number, zz = 0) => cam.p(x, y, zz + PISO + .03) } as Cam; anillo(c, cc, Q1[0], Q1[1], r1, ACENTO, 1 - smooth(prog(t, A.encuentra - .2, A.encuentra + .3)), 6); }
  // vectores: flechas desde un origen
  const kv = smooth(prog(t, A.vectores - .15, A.vectores + .2)) * (1 - smooth(prog(t, A.encuentra - .3, A.encuentra)));
  if (kv > 0) {
    const o = cam.p(ORIGEN[0], ORIGEN[1], z);
    const dst: P3[] = [[IDEAS[0].x, IDEAS[0].y, z], [IDEAS[1].x, IDEAS[1].y, z], [Q1[0], Q1[1], z], [IDEAS[15].x, IDEAS[15].y, z], [IDEAS[11].x, IDEAS[11].y, z]];
    if (o) {
      c.fillStyle = LUZ; circulo(c, o.x, o.y, .26 * o.s * kv);
      dst.forEach((p3, i) => {
        const u = ease.outCubic(prog(t, A.vectores - .1 + i * .09, A.vectores + .25 + i * .09)); if (u <= 0) return;
        const p = cam.p(lerp(ORIGEN[0], p3[0], u), lerp(ORIGEN[1], p3[1], u), z); if (!p) return;
        c.save(); c.globalAlpha = kv; flecha(c, o.x, o.y, p.x, p.y, i === 2 ? ROJO : LUZ, Math.max(3, .07 * p.s), Math.max(16, .4 * p.s)); c.restore();
      });
    }
  }
  // cerquísima: la distancia entre "sin mariscos" y "marisquería"
  const kq = smooth(prog(t, A.cerquisima - .1, A.cerquisima + .15)) * (1 - smooth(prog(t, A.yo - .3, A.yo)));
  if (kq > 0) {
    const a = cam.p(Q2[0], Q2[1], z), b = cam.p(IDEAS[11].x, IDEAS[11].y, z);
    if (a && b) {
      const u = ease.outCubic(prog(t, A.cerquisima - .1, A.cerquisima + .25)), pulso = 1 + .35 * Math.exp(-Math.max(t - A.cerquisima, 0) * 5) * Math.abs(Math.sin((t - A.cerquisima) * 14));
      c.save(); c.globalAlpha = kq; c.strokeStyle = "#fff"; c.lineWidth = 6; c.lineCap = "round"; linea(c, a.x, a.y, lerp(a.x, b.x, u), lerp(a.y, b.y, u));
      c.strokeStyle = ROJO; c.lineWidth = 5; c.beginPath(); c.arc(a.x, a.y, .5 * a.s * pulso, 0, 7); c.stroke();
      c.strokeStyle = "#fff"; c.beginPath(); c.arc(b.x, b.y, .5 * b.s * pulso, 0, 7); c.stroke(); c.restore();
    }
  }
}
function pregunta(c: C, cam: Cam, t: number, P: P3, sale: number, cae: number, s: string, mano: P3, fin: number) {
  if (t < sale - .05 || t > fin) return;
  const k = prog(t, sale, cae);
  const q = L3(mano, P, smooth(k)); q[2] = lerp(mano[2], PISO + .03, k * k) + salto(k, 3.2);
  const a = 1 - smooth(prog(t, fin - .4, fin));
  const p = cam.p(q[0], q[1], q[2]); if (!p) return;
  if (k >= 1) { const pulso = s === "postre" && t > A.postre2 - .1 && t < A.postre2 + .6 ? 1 + .3 * Math.sin((t - A.postre2) * 20) : 1; c.save(); c.globalAlpha = a; c.fillStyle = ACENTO; circulo(c, p.x, p.y, .3 * p.s * pulso); c.restore(); }
  const px = clamp(.8 * p.s, 44, 110);
  c.save(); c.globalAlpha = a; c.font = serif(Math.round(px), true);
  const abajo = s !== "postre", w = c.measureText(s).width + px * .7, h = px * 1.25, y0 = p.y + (k >= 1 ? (abajo ? 1 : -1) * (.4 * p.s + h * .62) : 0);
  c.translate(p.x, y0); c.rotate((1 - k) * 4 + (k >= 1 ? -.03 : 0));
  c.fillStyle = ACENTO; c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, h * .18); c.fill();
  texto(c, s, 0, px * .3, { fuente: serif(Math.round(px), true), color: "#fff" });
  c.restore();
}

// ---------- el cangrejo de la marisquería ----------
function cangrejo(c: C, x: number, y: number, e0: number, paso = 0) {
  c.save(); c.translate(x, y); c.scale(e0, e0); c.strokeStyle = ACENTO; c.fillStyle = ACENTO; c.lineCap = "round"; c.lineWidth = 8;
  for (const l of [-1, 1]) {
    for (let i = 0; i < 3; i++) { const w = Math.sin(paso * 14 + i * 2 + l) * 10; c.beginPath(); c.moveTo(l * 50, 6 + i * 11); c.quadraticCurveTo(l * (98 - i * 4), -8 + i * 24 + w, l * (106 - i * 12), 34 + i * 19 + w); c.stroke(); }
    c.lineWidth = 11; c.beginPath(); c.moveTo(l * 48, -18); c.quadraticCurveTo(l * 96, -32, l * 86, -66); c.stroke(); c.lineWidth = 8;
    const ab = .15 + .15 * Math.sin(paso * 9 + l);
    c.beginPath(); c.ellipse(l * 86, -84, 25, 30, l * .3, 0, 7); c.fill();
    c.fillStyle = TINTA_M; c.beginPath(); c.moveTo(l * 84, -80); c.lineTo(l * (76 - ab * 30), -118); c.lineTo(l * (100 + ab * 20), -116); c.closePath(); c.fill(); c.fillStyle = ACENTO;
    c.lineWidth = 6; c.beginPath(); c.moveTo(l * 18, -36); c.lineTo(l * 22, -66); c.stroke(); c.lineWidth = 8;
    c.fillStyle = TINTA; circulo(c, l * 22, -72, 9); c.fillStyle = ACENTO;
  }
  c.beginPath(); c.ellipse(0, 0, 66, 46, 0, 0, 7); c.fill();
  c.strokeStyle = "rgba(253,252,248,.55)"; c.lineWidth = 4; c.beginPath(); c.arc(0, -8, 34, .4, 2.74); c.stroke(); c.restore();
}
function cangrejoEn(t: number, mano: P3): { p: P3; paso: number } | null {
  const a = t - A.marisq - .14;
  if (a < 0 || t > A.yo - .1) return null;
  if (a < .5) { const q = L3(mano, [2.4, 16.6, PISO], a / .5); q[2] = lerp(mano[2] + .4, PISO, (a / .5) ** 2) + salto(a / .5, 2.5); return { p: q, paso: a }; }
  const b = a - .5, u = ease.inOutSine(clamp(b / 3.7));
  return { p: [lerp(2.4, 3.1, u) + Math.sin(u * 5) * .5, lerp(16.6, 27.2, u), PISO], paso: u < 1 ? b : b * 2.2 };
}

// ---------- detalles de la bola ----------
function perilla(c: C, x: number, y: number, R: number, ang: number) {
  c.fillStyle = "#050505"; circulo(c, x, y, R * 1.06);
  const G = c.createConicGradient(-.9, x, y);
  ([["#E4E1D9", 0], ["#8D8B85", .13], ["#DCD9D1", .26], ["#74726C", .39], ["#D2CFC7", .5], ["#7F7D77", .63], ["#E6E3DB", .76], ["#7A7872", .89], ["#E4E1D9", 1]] as [string, number][]).forEach(([k, s]) => G.addColorStop(s, k));
  c.fillStyle = G; circulo(c, x, y, R * .82);
  c.strokeStyle = TINTA; c.lineWidth = R * .12; c.lineCap = "round";
  linea(c, x + Math.cos(ang) * R * .16, y + Math.sin(ang) * R * .16, x + Math.cos(ang) * R * .72, y + Math.sin(ang) * R * .72);
  c.fillStyle = ACENTO; circulo(c, x + Math.cos(ang) * R * .92, y + Math.sin(ang) * R * .92, R * .1);
}
function candado(c: C, x: number, y: number, s: number, cierre: number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.strokeStyle = "#2a2a28"; c.lineWidth = 10; c.lineCap = "round";
  const a = lerp(-14, 0, cierre);
  c.beginPath(); c.moveTo(-22, 8); c.lineTo(-22, -22 + a); c.arc(0, -22 + a, 22, Math.PI, 0); c.lineTo(22, 4 + a); c.stroke();
  const g = c.createLinearGradient(-36, 0, 36, 40); g.addColorStop(0, "#E9896C"); g.addColorStop(.5, ACENTO); g.addColorStop(1, "#7E2413");
  c.fillStyle = g; c.beginPath(); c.roundRect(-38, 4, 76, 60, 10); c.fill();
  c.fillStyle = "#2a100a"; circulo(c, 0, 28, 7); c.fillRect(-3, 28, 6, 18);
  c.restore();
}
/** La ventana a lo que aprendió: tres perillas que se quedan fijas con candado. */
function ventana(c: C, x: number, y: number, r: number, t: number) {
  const k1 = smooth(prog(t, A.aprendio + .1, A.aprendio + .45)) * (1 - smooth(prog(t, A.noconoce - .1, A.noconoce + .2)));
  const k2 = smooth(prog(t, A.saber + .1, A.saber + .45)) * (1 - smooth(prog(t, A.ir - .15, A.ir + .1)));
  const k = Math.max(k1, k2); if (k <= .01) return;
  const ri = r * .8 * k;
  c.fillStyle = "#050505"; circulo(c, x, y, ri + 3);
  const g = c.createRadialGradient(x, y - ri * .2, 6, x, y, ri); g.addColorStop(0, "#EDEAE2"); g.addColorStop(1, "#BDBAB2");
  c.fillStyle = g; circulo(c, x, y, ri);
  if (k < .7) return;
  const gira = k1 > 0 ? clamp((t - A.aprendio - .3) / (A.fijo - A.aprendio - .3)) : 1;
  const tem = t > A.fijo && k1 > 0 ? .12 * Math.exp(-(t - A.fijo) * 12) * Math.sin((t - A.fijo) * 60) : 0;
  const sac = k2 > 0 && t > A.mas ? .08 * Math.exp(-(t - A.mas) * 8) * Math.sin((t - A.mas) * 50) : 0;
  [-.9, 2.2, .4].forEach((a0, i) => perilla(c, x - r * .42 + i * r * .42, y - r * .2, r * .2, a0 + gira * 9 * (i === 1 ? -1 : 1) * (k1 > 0 ? 1 : 0) + tem + sac));
  const cae = k1 > 0 ? ease.outBack(prog(t, A.fijo - .14, A.fijo), 1.4) : 1;
  if (cae > 0) candado(c, x + (k2 > 0 ? Math.sin(t * 50) * 4 * Math.exp(-Math.max(t - A.mas, 0) * 6) * (t > A.mas ? 1 : 0) : 0), y + r * .28 - (1 - clamp(cae)) * r * .6, r * .0062, k1 > 0 ? clamp(prog(t, A.fijo - .04, A.fijo + .04)) : 1);
}
function lupaD(c: C, x: number, y: number, e0: number, color = TINTA) {
  c.save(); c.translate(x, y); c.scale(e0, e0); c.strokeStyle = color; c.lineWidth = 13; c.lineCap = "round";
  c.beginPath(); c.arc(-8, -8, 34, 0, 7); c.stroke(); c.lineWidth = 16; c.beginPath(); c.moveTo(18, 18); c.lineTo(46, 46); c.stroke(); c.restore();
}
function pluma(c: C, x: number, y: number, a: number, s: number, color = TINTA) {
  c.save(); c.translate(x, y); c.rotate(a); c.scale(s, s);
  c.fillStyle = color; c.beginPath(); c.moveTo(0, 0); c.lineTo(-11, -34); c.lineTo(11, -34); c.closePath(); c.fill();
  c.beginPath(); c.roundRect(-11, -170, 22, 136, 5); c.fill();
  c.fillStyle = "#EDEAE3"; c.fillRect(-11, -60, 22, 7);
  c.restore();
}
/** Tarjeta que la bola sostiene frente a la cámara. */
function tarjeta(c: C, x: number, y: number, w: number, h: number, rot: number, f: (w: number, h: number) => void, fondo = BLANCO, borde = TINTA) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.fillStyle = "rgba(20,16,12,.18)"; c.fillRect(-w / 2 + w * .04, -h / 2 + h * .05, w, h);
  c.fillStyle = fondo; c.strokeStyle = borde; c.lineWidth = Math.max(3, w * .014); c.beginPath(); c.rect(-w / 2, -h / 2, w, h); c.fill(); c.stroke();
  f(w, h); c.restore();
}
function pastelD(c: C, x: number, y: number, s: number) {
  c.save(); c.translate(x, y); c.scale(s, s); c.lineJoin = "round"; c.lineWidth = 6; c.strokeStyle = TINTA;
  c.fillStyle = "#F3EBDD"; c.beginPath(); c.ellipse(0, 30, 90, 24, 0, 0, 7); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-90, 30); c.lineTo(-90, -30); c.ellipse(0, -30, 90, 24, 0, Math.PI, 0, true); c.lineTo(90, 30); c.ellipse(0, 30, 90, 24, 0, 0, Math.PI); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = "#fff"; c.beginPath(); c.ellipse(0, -30, 90, 24, 0, 0, 7); c.fill(); c.stroke();
  c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.moveTo(-90, 0); c.quadraticCurveTo(0, 26, 90, 0); c.stroke();
  for (const dx of [-40, 0, 40]) { c.fillStyle = ACENTO; circulo(c, dx, -36 + Math.abs(dx) * .1, 11); }
  c.fillStyle = TINTA; c.fillRect(-4, -98, 8, 48); c.fillStyle = ACENTO; c.beginPath(); c.ellipse(0, -110, 8, 14, 0, 0, 7); c.fill();
  c.restore();
}
function postreD(c: C, x: number, y: number, s: number) {
  c.save(); c.translate(x, y); c.scale(s, s); c.lineJoin = "round"; c.lineWidth = 6; c.strokeStyle = TINTA;
  c.fillStyle = "#fff"; c.beginPath(); c.moveTo(-70, -10); c.lineTo(70, -10); c.lineTo(36, 60); c.lineTo(-36, 60); c.closePath(); c.fill(); c.stroke();
  c.lineWidth = 3; for (const dx of [-30, -10, 10, 30]) linea(c, dx * 1.6 / 1.6, -6, dx * .7, 56);
  c.lineWidth = 6; c.fillStyle = "#F3EBDD"; c.beginPath(); c.arc(-28, -22, 30, Math.PI, 0); c.arc(18, -34, 36, Math.PI, 0); c.arc(52, -18, 22, Math.PI, 0); c.lineTo(70, -10); c.lineTo(-70, -10); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = ACENTO; circulo(c, 18, -78, 14);
  c.restore();
}

// ---------- la bola, con lo que trae en las manos ----------
function laBola(c: C, cam: Cam, t: number, d: D) {
  const { p: b, aterriza } = bolaEn(t);
  const pc = cam.p(b[0], b[1], b[2] + RB); if (!pc) return;
  const r = RB * pc.s;
  const suelo = Math.abs(b[0]) < W && Math.abs(b[1]) < H && b[2] > -1 ? 0 : PISO;
  const ps = cam.p(b[0] + .1, b[1] - .05, suelo + .01);
  if (ps) sombra(c, ps.x, ps.y, r * 1.4 * (1 + (b[2] - suelo) * .06), clamp(.34 - (b[2] - suelo) * .04, .08, .34));
  const [m1, m2] = manosEn(t, b), q1 = cam.p(m1[0], m1[1], m1[2]), q2 = cam.p(m2[0], m2[1], m2[2]);
  if (!q1 || !q2) return;
  const w = aterriza > 0 ? t - aterriza : 9;
  const est = w > 0 && w < .5 ? -Math.sin(w / .5 * Math.PI) * Math.exp(-w * 3) * .18 : 0;
  c.save(); c.translate(pc.x, pc.y + r); c.scale(1 - est * .8, 1 + est); c.translate(-pc.x, -pc.y - r);
  const osc = suelo === PISO ? mapaK(t) : 0;
  if (osc > .05) {                                                 // sobre el mapa de tinta: un contorno de papel
    const g = r / 90, col = `rgba(237,234,227,${osc})`;
    brazo(c, pc.x - 54 * g, pc.y - 50 * g, q1.x, q1.y, 90 * g, m1[3], col, 1, g * 1.4);
    brazo(c, pc.x + 60 * g, pc.y - 30 * g, q2.x, q2.y, -100 * g, m2[3], col, 1, g * 1.4);
    c.fillStyle = col; circulo(c, pc.x, pc.y, r + Math.max(4, r * .07));
  }
  agente(c, pc.x, pc.y, r, [q1.x, q1.y], [q2.x, q2.y], { abre1: m1[3], abre2: m2[3] });
  c.restore();
  ventana(c, pc.x, pc.y, r, t);
  const e0 = q2.s / 100;
  // signo de pregunta: no se sabe tus documentos
  const kq = ease.outBack(prog(t, A.preg, A.preg + .2), 2) * (1 - smooth(prog(t, A.falta - .1, A.falta + .1)));
  if (kq > 0) texto(c, "?", pc.x + r * 1.5, pc.y - r * .6, { fuente: serif(Math.round(r * 2.1 * clamp(kq, 0, 1.4)), true), color: ACENTO, base: "middle" });
  // la pluma de escribir
  if (en(t, A.leyendo, A.primero) || en(t, A.pides, A.puede - .1)) pluma(c, q2.x + 4, q2.y - 20 * e0, .25, e0 * .9);
  // lo que lee: una línea punteada a cada página
  const kl = smooth(prog(t, A.contesta - .1, A.contesta + .2)) * (1 - smooth(prog(t, A.primero - .2, A.primero + .1)));
  if (kl > 0) {
    const u = Math.max(t - A.contesta, 0), i = Math.floor(u / .55) % 3, s = SLOT[i], dst = cam.p(s[0] - .6 + (u % .55) * 2.2, s[1] + .4, .02);
    if (dst) { c.save(); c.globalAlpha = kl; c.strokeStyle = ACENTO; c.lineWidth = 5; c.setLineDash([2, 15]); c.lineCap = "round"; c.lineDashOffset = -t * 90; linea(c, pc.x, pc.y - r * .3, dst.x, dst.y); c.setLineDash([]); c.fillStyle = ACENTO; circulo(c, dst.x, dst.y, 8); c.restore(); }
  }
  // páginas en la mano
  for (const p of PAGS) {
    if (t < p.desde || t > p.llega - .2) continue;
    const mano = p.desde < A.busca + 1 && t < A.busca + .5 ? q1 : q2;
    const ss = mano.s / 100 * .8;
    c.save(); c.translate(mano.x + (p.carga - 1) * 26 * ss, mano.y - 70 * ss - p.carga * 10 * ss); c.rotate(-.15 + p.carga * .15);
    c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 3; c.fillRect(-PW * 50 * ss, -PH * 50 * ss, PW * 100 * ss, PH * 100 * ss); c.strokeRect(-PW * 50 * ss, -PH * 50 * ss, PW * 100 * ss, PH * 100 * ss);
    c.drawImage(d.spr[p.spr], -PW * 50 * ss, -PH * 50 * ss, PW * 100 * ss, PH * 100 * ss);
    c.restore();
  }
  // pasillo: "postre" y "pastel", primero como palabras y luego como significados
  const kt = smooth(prog(t, A.como - .2, A.como + .1));
  if (kt > 0 && t < A.imagina + .5) {
    const suelta = prog(t, A.imagina + .2, A.imagina + .55);
    const sig = smooth(prog(t, A.signif, A.signif + .3));
    const cw = Math.min(2.5 * q1.s, 360), ch = cw * lerp(.62, 1.05, sig);
    ([[q1, "postre", -1], [q2, "pastel", 1]] as [Q, string, number][]).forEach(([qq, s, ll]) => {
      if (suelta >= 1) return;
      c.save(); c.globalAlpha = 1 - suelta;
      tarjeta(c, qq.x + ll * cw * .1, qq.y - ch * .52 + suelta * 300, cw * kt, ch * kt, ll * .05 + suelta * ll, (w, h) => {
        texto(c, s, 0, -h / 2 + w * .26, { fuente: serif(Math.round(w * .24), true), color: TINTA });
        if (sig > 0) { c.save(); c.globalAlpha *= sig; (ll < 0 ? postreD : pastelD)(c, 0, h * .18, w / 420); c.restore(); }
      });
      c.restore();
    });
    // ≠ entre palabras, ≈ entre significados
    if (suelta < 1) {
      const mx = (q1.x + q2.x) / 2, my = Math.min(q1.y, q2.y) - ch * .5;
      const ne = smooth(prog(t, A.iguales - .1, A.iguales + .1)) * (1 - sig), ap = sig;
      if (ne > 0) texto(c, "≠", mx, my, { fuente: serif(Math.round(cw * .45)), color: ACENTO, alfa: ne * (1 - suelta), base: "middle" });
      if (ap > 0) texto(c, "≈", mx, my, { fuente: serif(Math.round(cw * .45 * (1 + .4 * Math.exp(-(t - A.signif) * 6)))), color: ACENTO, alfa: ap * (1 - suelta), base: "middle" });
    }
  }
  // los pedazos atrapados, en la mano derecha
  const atr = (g: number, t0: number, t1: number) => t > t0 && t < t1 ? PEDAZOS.filter((p) => p.atrapa === g) : [];
  const enMano = atr(1, A.mascerca + .6, A.encuentra - .1);
  enMano.forEach((pz, i) => {
    const ss = q2.s / 100 * .9;
    c.save(); c.translate(q2.x + (i - 1) * 30 * ss, q2.y - 60 * ss - i * 8 * ss); c.rotate(-.2 + i * .2);
    c.drawImage(d.spr["pz_" + pz.k], -48 * ss, -60 * ss, 96 * ss, 120 * ss); c.strokeStyle = TINTA; c.lineWidth = 2; c.strokeRect(-48 * ss, -60 * ss, 96 * ss, 120 * ss);
    c.restore();
  });
  // "por eso encuentra el pastel": lo enseña en grande
  const ke = smooth(prog(t, A.encuentra - .1, A.encuentra + .25)) * (1 - smooth(prog(t, A.tambien2 + .1, A.tambien2 + .4)));
  if (ke > 0) {
    const cw = Math.min(2.6 * q1.s, 470) * ke, ch = cw * 1.25, kk = 1 + .25 * Math.exp(-Math.max(t - A.pastel2, 0) * 8) * (t > A.pastel2 ? 1 : 0);
    tarjeta(c, clamp(q1.x, cw * .6 + 30, 1080 - cw * .6 - 110), clamp(q1.y - ch * .5, ch * .6 + 380, 1500 - ch * .6), cw * kk, ch * kk, -.05, (w, h) => {
      texto(c, "pastel", 0, -h / 2 + w * .25, { fuente: serif(Math.round(w * .22), true), color: TINTA });
      pastelD(c, 0, h * .14, w / 360);
      texto(c, "de tres leches", 0, h / 2 - w * .1, { fuente: serif(Math.round(w * .1), true), color: GRIS });
    });
  }
  // "restaurante sin mariscos": la escribe y la levanta
  const kr = smooth(prog(t, A.pides - .1, A.pides + .2)) * (1 - smooth(prog(t, A.puede - .15, A.puede)));
  if (kr > 0) {
    const cw = Math.min(2.9 * q1.s, 640) * kr, ch = cw * .55, u = prog(t, A.pides + .15, A.porque - .1);
    tarjeta(c, clamp(q1.x + cw * .35, cw * .55 + 30, 1080 - cw * .55 - 110), clamp(q1.y - ch * .55, 640, 1450), cw, ch, -.04, (w, h) => {
      c.save(); c.beginPath(); c.rect(-w / 2, -h / 2, w * u, h); c.clip();
      texto(c, "restaurante", 0, -h * .06, { fuente: serif(Math.round(w * .15), true), color: TINTA });
      texto(c, "sin mariscos", 0, h * .3, { fuente: serif(Math.round(w * .15), true), color: TINTA });
      c.restore();
      const sl = smooth(prog(t, A.sin, A.sin + .2));
      if (sl > 0) { c.strokeStyle = ACENTO; c.lineWidth = w * .016; c.lineCap = "round"; c.font = serif(Math.round(w * .15), true); const tw = c.measureText("sin mariscos").width, sw2 = c.measureText("sin").width; linea(c, -tw / 2, h * .37, -tw / 2 + sw2 * sl, h * .37); }
    }, BLANCO, ACENTO);
  }
}

// ---------- la mano del narrador, con su lupa ----------
function lupaEn(t: number): P3 | null {
  if (t < A.veo - .45 || t > SACA + .9) return null;
  const P: [number, P3][] = [[A.veo - .45, [9, -1, 1.6]], [A.veo, [SLOT[0][0], SLOT[0][1], 1.1]], [A.veo + .38, [SLOT[1][0], SLOT[1][1], 1.1]], [A.trajo - .1, [SLOT[2][0], SLOT[2][1], 1.1]], [SACA, [SLOT[2][0], SLOT[2][1] + .1, .9]], [SACA + .9, [12, .6, 1.2]]];
  for (let i = 1; i < P.length; i++) if (t < P[i][0]) { const k = smooth(prog(t, P[i - 1][0], P[i][0])); return L3(P[i - 1][1], P[i][1], k); }
  return P[P.length - 1][1];
}
function manoLupa(c: C, cam: Cam, t: number, d: D) {
  const l = lupaEn(t); if (!l) return;
  const p = cam.p(l[0], l[1], l[2]); if (!p) return;
  const R = 1.05 * p.s, g = p.s / 100 * 1.9;
  brazo(c, 1300, p.y + 700, p.x + R * .75, p.y + R * .75, -120, .2, TINTA, 1, g * 1.16);
  brazo(c, 1300, p.y + 700, p.x + R * .75, p.y + R * .75, -120, .2, "#F7F4EC", 1, g);
  c.save(); c.beginPath(); c.arc(p.x, p.y, R, 0, 7); c.clip();
  c.fillStyle = "rgba(255,255,255,.12)"; c.fillRect(p.x - R, p.y - R, 2 * R, 2 * R);
  // lo de abajo, más grande
  const i = Math.round(clamp((l[0] + 2.72) / 2.72, 0, 2)), s = SLOT[i];
  const pagina = PAGS.filter((q) => q.slot === i && t > q.llega && t < q.hasta)[0];
  if (pagina && Math.abs(l[0] - s[0]) < 1.2) {
    const a = cam.p(s[0] - PW / 2, s[1] + PH / 2, .02), b = cam.p(s[0] + PW / 2, s[1] - PH / 2, .02);
    if (a && b) { c.translate(p.x, p.y); c.scale(1.7, 1.7); c.translate(-p.x, -p.y); c.fillStyle = BLANCO; c.fillRect(a.x, a.y, b.x - a.x, b.y - a.y); c.drawImage(d.spr[pagina.spr], a.x, a.y, b.x - a.x, b.y - a.y); }
  }
  c.restore();
  c.strokeStyle = TINTA; c.lineWidth = R * .16; c.beginPath(); c.arc(p.x, p.y, R, 0, 7); c.stroke();
  c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = R * .05; c.beginPath(); c.arc(p.x, p.y, R * .8, 3.6, 4.4); c.stroke();
  c.strokeStyle = TINTA; c.lineWidth = R * .22; c.lineCap = "round"; linea(c, p.x + R * .78, p.y + R * .78, p.x + R * 1.35, p.y + R * 1.35);
  // la mala: la marca y se la lleva
  const kx = smooth(prog(t, A.trajo + .05, A.trajo + .25));
  if (kx > 0 && t < SACA + .5) { c.save(); c.globalAlpha = kx * (1 - smooth(prog(t, SACA + .2, SACA + .5))); c.strokeStyle = ACENTO; c.lineWidth = R * .14; c.lineCap = "round"; const m = R * .55 * kx; linea(c, p.x - m, p.y - m, p.x + m, p.y + m); linea(c, p.x + m, p.y - m, p.x - m, p.y + m); c.restore(); }
}

// ---------- rótulos y objetos de pantalla ----------
function rag(c: C, t: number) {
  if (t < A.rag - .2 || t > A.truco + .3) return;
  const sale = 1 - smooth(prog(t, A.truco - .2, A.truco + .2));
  const fila = smooth(prog(t, A.bautizo - .1, A.bautizo + .4));                // de columna con palabras a fila con sello
  const L: [string, string, number][] = [["R", "recuperación", A.rec], ["A", "aumentada", A.aum], ["G", "generación", A.gen]];
  L.forEach(([l, w, tw], i) => {
    const ti = A.rag - .05 + i * .17, k = ease.outBack(prog(t, ti - .12, ti), 1.6);
    if (k <= 0) return;
    const x = lerp(170, 360 + i * 180, fila), y = lerp(215 + i * 165, 250, fila), s = lerp(2.2, 1, clamp(k)) * lerp(1, 1.08, fila);
    c.save(); c.globalAlpha = sale; c.translate(x, y); c.scale(s, s); c.rotate((i - 1) * .03);
    c.fillStyle = "rgba(20,16,12,.2)"; c.beginPath(); c.roundRect(-64, -60, 140, 140, 14); c.fill();
    const g = c.createLinearGradient(0, -70, 0, 70); g.addColorStop(0, "#2d2c2a"); g.addColorStop(1, "#121211");
    c.fillStyle = g; c.beginPath(); c.roundRect(-70, -70, 140, 140, 14); c.fill();
    texto(c, l, 0, 40, { fuente: serif(118), color: "#F7F5EE" });
    c.restore();
    const kw = smooth(prog(t, tw - .04, tw + .16)) * (1 - fila) * sale;
    if (kw > 0) {
      c.save(); c.globalAlpha = kw; c.translate(275, y);
      texto(c, w, 0, 30 + (1 - kw) * 12, { fuente: serif(96, true), color: tw === A.rec ? ACENTO : TINTA, alin: "left" });
      c.restore();
    }
  });
  const ks = ease.outBack(prog(t, A.facebook - .12, A.facebook + .06), 2);
  if (ks > 0) {
    const s = lerp(1.9, 1, clamp(ks));
    c.save(); c.globalAlpha = sale; c.translate(540, 445); c.rotate(-.04); c.scale(s, s);
    c.strokeStyle = ACENTO; c.lineWidth = 8; c.beginPath(); c.roundRect(-330, -66, 660, 124, 10); c.stroke();
    texto(c, "FACEBOOK · 2020", 0, 22, { fuente: mono(66), color: ACENTO });
    c.restore();
  }
}
function letrero(c: C, t: number) {
  const k = resorte(t - A.base + .25, 2.2, .3) * (1 - smooth(prog(t, A.encuentra - .4, A.encuentra)));
  if (t < A.base - .25 || k <= .001) return;
  const y = lerp(-260, 320, k), sw = Math.sin((t - A.base) * 3.1) * .05 * Math.exp(-(t - A.base) * 1.2);
  c.save(); c.translate(540, y - 250); c.rotate(sw); c.translate(0, 250);
  c.strokeStyle = "#B9B5AC"; c.lineWidth = 5; for (const dx of [-330, 330]) { c.setLineDash([10, 6]); linea(c, dx, -600, dx, -112); } c.setLineDash([]);
  c.fillStyle = "rgba(0,0,0,.35)"; c.fillRect(-420 + 14, -112 + 18, 840, 230);
  c.fillStyle = "#F7F5EE"; c.fillRect(-420, -112, 840, 230); c.strokeStyle = TINTA; c.lineWidth = 4; c.strokeRect(-404, -96, 808, 198);
  texto(c, "base de datos", 0, -12, { fuente: serif(98, true), color: TINTA });
  texto(c, "vectorial", 0, 80, { fuente: serif(98, true), color: ACENTO });
  c.restore();
}
function nota(c: C, t: number) {
  const k = ease.outBack(prog(t, A.mama - .2, A.mama + .05), 1.6) * (1 - smooth(prog(t, A.puede - .3, A.puede)));
  if (k <= 0) return;
  const s = lerp(1.6, 1, clamp(k));
  c.save(); c.translate(540, 330); c.rotate(-.04); c.scale(s, s); c.globalAlpha = clamp(k);
  c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(-330 + 12, -120 + 16, 660, 240);
  c.fillStyle = BLANCO; c.fillRect(-330, -120, 660, 240); c.strokeStyle = ACENTO; c.lineWidth = 9; c.strokeRect(-316, -106, 632, 212);
  texto(c, "mi mamá no", 0, -12, { fuente: serif(96, true), color: TINTA });
  texto(c, "come mariscos", 0, 78, { fuente: serif(96, true), color: ACENTO });
  c.restore();
}
function pantalla(c: C, t: number) {
  const oscuro = mapaK(t) > .6;
  const tin = oscuro ? LUZ : TINTA, roj = oscuro ? ROJO : ACENTO;
  rotulo(c, t, A.falta, A.aprendio - .2, "no le hace falta", 1545, 116, TINTA, true);
  rotulo(c, t, A.fijo - .1, A.noconoce - .2, "quedó fijo", 1460, 150, ACENTO, true);
  rotulo(c, t, A.cabe - .05, A.biblio - .1, "no cabe", 300, 170, ACENTO, true);
  rotulo(c, t, A.biblio + .2, A.asi + .3, "una biblioteca", 330, 130, TINTA, true);
  rotulo(c, t, A.va - .05, A.busca - .1, "va", 175, 170, TINTA, true);
  rotulo(c, t, A.busca, A.trae - .1, "busca", 175, 170, TINTA, true);
  rotulo(c, t, A.trae, A.contesta - .1, "trae", 175, 170, ACENTO, true);
  rotulo(c, t, A.primero, A.despues - .1, "primero", 200, 96, TINTA, false);
  rotulo(c, t, A.recupera - .05, A.despues - .1, "recupera", 330, 150, ACENTO, true);
  rotulo(c, t, A.despues, A.eso - .2, "después", 200, 96, TINTA, false);
  rotulo(c, t, A.escribe - .05, A.eso - .2, "escribe", 330, 150, ACENTO, true);
  rotulo(c, t, A.lugar - .7, A.parecidas - .2, "un mapa", 250, 150, LUZ, true);
  rotulo(c, t, A.parecidas, A.pastel - .25, "las parecidas, cerca", 250, 100, LUZ, true);
  rotulo(c, t, A.pedazo, A.pregunta - .15, "cada pedazo", 250, 130, LUZ, true);
  rotulo(c, t, A.pregunta, A.trae2 - .1, "tu pregunta", 250, 130, ROJO, true);
  rotulo(c, t, A.trae2 + .1, A.lugares - .15, "lo más cerca", 250, 130, LUZ, true);
  rotulo(c, t, A.vectores - .05, A.base - .45, "vectores", 250, 150, LUZ, true);
  rotulo(c, t, A.tambien2 + .3, A.pides - .15, "se equivoca", 270, 150, ROJO, true);
  rotulo(c, t, A.enmapa, A.parecido - .2, "cerquísima", 250, 130, LUZ, true);
  rotulo(c, t, A.parecido, A.yo - .3, "parecido", 230, 130, LUZ, true);
  rotulo(c, t, A.correcto - .05, A.yo - .3, "no es correcto", 380, 120, ROJO, true);
  rotulo(c, t, A.veo - .1, A.saber - .2, "qué páginas trajo", 1545, 112, TINTA, true);
  rotulo(c, t, A.mas - .3, A.ir - .15, "no lo hace saber más", 1460, 104, TINTA, true);
  rotulo(c, t, A.ir, A.decirte - .1, "ir a buscar", 190, 140, TINTA, true);
  rotulo(c, t, A.cola[2] + 1.05, DURACION, "de dónde lo sacó", 190, 120, ACENTO, true);
  void tin; void roj;
}

// ---------- cámara ----------
const V: Record<string, Vista> = {
  caida: { tx: 0, ty: -.9, tz: 0, yaw: 0, pitch: 1.5533, dist: 9.4 }, acerca: { tx: .35, ty: -1.5, tz: 0, yaw: .05, pitch: 1.5533, dist: 7.6 }, top: { tx: 0, ty: -.75, tz: 0, yaw: 0, pitch: 1.5533, dist: 10.6 },
  bola: { tx: 0, ty: -3.2, tz: 1, yaw: 0, pitch: 1.5533, dist: 5.4 }, tres4: { tx: 0, ty: .4, tz: 0, yaw: 0, pitch: .85, dist: 16 },
  revela: { tx: 0, ty: 24, tz: 0, yaw: 0, pitch: .3, dist: 48 }, viaje: { tx: 0, ty: 8, tz: -1.5, yaw: 0, pitch: .52, dist: 27 },
  lee: { tx: 0, ty: .8, tz: 0, yaw: 0, pitch: .64, dist: 15 }, rag: { tx: 0, ty: 7, tz: -1, yaw: 0, pitch: .26, dist: 26 },
  pasillo: { tx: 0, ty: 14.4, tz: PISO + 1.25, yaw: 0, pitch: .17, dist: 8.2 }, mapa: { tx: 0, ty: 25.5, tz: PISO, yaw: 0, pitch: 1.2, dist: 25 },
  postres: { tx: -4.5, ty: 19.6, tz: PISO, yaw: 0, pitch: 1.25, dist: 11 }, bolaMapa: { tx: -1.4, ty: 16.6, tz: PISO + .8, yaw: 0, pitch: .9, dist: 12 },
  escribe: { tx: 2.7, ty: 15.1, tz: PISO + 1.4, yaw: 0, pitch: .86, dist: 8.8 }, cerq: { tx: 3.5, ty: 31.8, tz: PISO, yaw: 0, pitch: 1.3, dist: 8.6 }, trae2: { tx: .6, ty: 15.6, tz: PISO + 1.8, yaw: 0, pitch: .9, dist: 10 },
  fin: { tx: 0, ty: 9, tz: -1, yaw: 0, pitch: .5, dist: 28 }, cita: { tx: -.75, ty: .3, tz: 0, yaw: 0, pitch: .72, dist: 12.6 }, final: { tx: 0, ty: 9, tz: -1, yaw: 0, pitch: .46, dist: 31 },
};
const CL = [
  { t: 0, v: V.caida }, { t: A.bam + .15, dur: A.falta - A.bam + .3, v: V.acerca, curva: smooth }, { t: A.flick - .1, dur: .6, v: V.caida }, { t: A.aprendio - .2, dur: .5, v: V.bola }, { t: A.noconoce - .25, dur: .6, v: V.top },
  { t: A.mesa - .05, dur: 1.1, v: V.tres4 }, { t: A.revela - .15, dur: 1.7, v: V.revela, curva: ease.outCubic },
  { t: A.asi + .5, dur: 1.1, v: V.viaje }, { t: A.contesta - .2, dur: .9, v: V.lee }, { t: A.primero - .35, dur: 1.1, v: V.rag },
  { t: A.truco - .05, dur: 1.2, v: V.pasillo }, { t: A.imagina + .1, dur: 1.7, v: V.mapa },
  { t: A.pastel - .3, dur: .8, v: V.postres }, { t: A.pedazo - .35, dur: .9, v: V.mapa },
  { t: A.encuentra - .25, dur: .8, v: V.bolaMapa }, { t: A.tambien2, dur: .8, v: V.mapa },
  { t: A.pides - .15, dur: .7, v: V.escribe }, { t: A.puede - .2, dur: .5, v: V.mapa }, { t: A.traer + .05, dur: .5, v: V.trae2 }, { t: A.enmapa - .2, dur: .8, v: V.cerq },
  { t: A.yo - .15, dur: .9, v: V.top }, { t: A.saber - .1, dur: .5, v: V.bola }, { t: A.ir - .1, dur: 1, v: V.fin },
  { t: A.decirte - .05, dur: .8, v: V.cita }, { t: A.cola[2] + .3, dur: 1.5, v: V.final, curva: ease.inOutCubic },
];
const GOLPES: [number, number][] = [[A.bam, 26], [A.fijo, 8], [A.revela, 10], [A.pag[0], 5], [A.pag[2], 5], [A.rag, 9], [A.facebook, 10], [A.tambien, 6], [A.equivoca, 12], [A.traer, 6], [A.decirte, 5]];
function sacude(t: number) {
  let x = 0, y = 0;
  for (const [ti, a] of GOLPES) { const d = t - ti; if (d < 0 || d > .8) continue; const e0 = a * Math.exp(-d * 9); x += e0 * Math.sin(d * 61); y += e0 * Math.cos(d * 47); }
  return [x, y];
}
function camaraDe(t: number) {
  const v = guionCamara(t, CL);
  const r: Vista = { ...v, yaw: v.yaw + .018 * vaiven(t, 7.3), pitch: Math.min(1.5533, v.pitch + .016 * vaiven(t, 9.1, 1)), dist: v.dist * (1 + .022 * vaiven(t, 6.1, 2)), tx: v.tx + .1 * vaiven(t, 8.3), ty: v.ty + .08 * vaiven(t, 5.3, 1) };
  return camara(r, 540, 960, 1250);
}

// ---------- la escena ----------
function motas(c: C, t: number, color: string, alfa: number) {
  const r = azar(16);
  c.fillStyle = color;
  for (let i = 0; i < 70; i++) {
    const x0 = r() * 1200 - 60, y0 = r() * 2060, v = 16 + r() * 40, f = r() * 6.3, z = 1.6 + r() * 3.2;
    const y = ((y0 - t * v) % 2060 + 2060) % 2060 - 70, x = x0 + Math.sin(t * .55 + f) * 36;
    c.globalAlpha = alfa * (.08 + r() * .18); c.fillRect(x, y, z, z);
  }
  c.globalAlpha = 1;
}
function escena(c: C, cam: Cam, t: number, d: D) {
  const { p: b } = bolaEn(t);
  const [m1, m2] = manosEn(t, b);
  const mano: P3 = [m2[0], m2[1], m2[2]], lanza: P3 = [m1[0], m1[1], m1[2]];
  piso(c, cam);
  mapa(c, cam, t, d);
  libreros(c, cam, t, d);
  sobreMapa(c, cam, t, d, mano, lanza);
  const cg = cangrejoEn(t, mano);
  if (cg && cg.p[1] > H + .5) { const p = cam.p(cg.p[0], cg.p[1], cg.p[2] + .4); if (p) cangrejo(c, p.x, p.y, p.s / 100 * 1.05, cg.paso); }
  const detras = b[1] > H + .3 && b[2] < -.5;
  if (detras) laBola(c, cam, t, d);
  libros(c, cam, t, true);
  mesa(c, cam, d);
  escuadras(c, cam);
  huecos(c, cam, t);
  respuesta(c, cam, t, d);
  paginas(c, cam, t, d, mano);
  trayecto(c, cam, t);
  carpeta(c, cam, t, d);
  libros(c, cam, t, false);
  if (!detras) laBola(c, cam, t, d);
  if (cg && cg.p[1] <= H + .5) { const p = cam.p(cg.p[0], cg.p[1], cg.p[2] + .4); if (p) cangrejo(c, p.x, p.y, p.s / 100 * 1.05, cg.paso); }
  manoLupa(c, cam, t, d);
}
function dibuja(c: C, t: number, d: D) {
  FR = Math.floor(t * 10);
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  const [sx, sy] = sacude(t);
  c.save(); c.translate(sx, sy);
  const cam = camaraDe(t);
  escena(c, cam, t, d);
  c.restore();
  motas(c, t, mapaK(t) > .6 && cam.v.pitch > .9 ? LUZ : TINTA, 1);
  rag(c, t);
  letrero(c, t);
  nota(c, t);
  pantalla(c, t);
  const a = smooth(prog(t, DURACION - 1.2, DURACION - .2));
  if (a > 0) { c.fillStyle = `rgba(244,242,236,${a})`; c.fillRect(0, 0, 1080, 1920); }
}

// ---------- sprites ----------
const PX = 120;
function lienzo(w: number, h: number, f: (g: C, W: number, H: number) => void, px = PX) {
  const cv = document.createElement("canvas");
  cv.width = Math.ceil(w * px); cv.height = Math.ceil(h * px);
  const g = cv.getContext("2d")!;
  g.scale(px / 100, px / 100);
  f(g, w * 100, h * 100);
  return cv;
}
function renglones(g: C, x: number, y: number, w: number, n: number, paso: number, sem: number, grueso = 7, color = TINTA) {
  const r = azar(sem);
  g.fillStyle = color;
  for (let i = 0; i < n; i++) { g.beginPath(); g.roundRect(x, y + i * paso, w * (.56 + r() * .44), grueso, grueso / 2); g.fill(); }
}
function cubiertos(g: C, x: number, y: number, e0: number) {
  g.save(); g.translate(x, y); g.scale(e0, e0); g.strokeStyle = TINTA; g.lineWidth = 6; g.lineCap = "round";
  g.beginPath(); g.moveTo(-14, -30); g.lineTo(-14, 34); for (const k of [-24, -14, -4]) { g.moveTo(k, -30); g.lineTo(k, -8); } g.moveTo(-24, -8); g.lineTo(-4, -8); g.stroke();
  g.lineWidth = 7; g.beginPath(); g.moveTo(16, 34); g.lineTo(16, -30); g.quadraticCurveTo(30, -18, 22, 0); g.lineTo(16, 0); g.stroke(); g.restore();
}
function restaurante(nombre: string, sem: number, extra?: (g: C, w: number, h: number) => void) {
  return lienzo(PW, PH, (g, w) => {
    texto(g, nombre, 22, 66, { fuente: serif(nombre.length > 9 ? 44 : 54, true), color: TINTA, alin: "left" });
    cubiertos(g, w - 34, 44, .7);
    for (let k = 0; k < 5; k++) texto(g, "★", 24 + k * 30, 106, { fuente: serif(28), color: k < 3 + sem % 3 ? TINTA : "rgba(17,17,17,.2)", alin: "left" });
    if (extra) extra(g, w, PH * 100); else renglones(g, 22, 136, w - 44, 6, 22, sem, 6);
  });
}
function hazSprites(): Sprites {
  const S: Sprites = {};
  S.veta = lienzo(8.2, 8.4, (g, w, h) => {
    g.fillStyle = KRAFT; g.fillRect(0, 0, w, h);
    const r = azar(505);
    for (let i = 0; i < 150; i++) {
      const y = r() * h, am = 2 + r() * 11, q = r() * 6.3;
      g.strokeStyle = `rgba(96,72,40,${.05 + r() * .13})`; g.lineWidth = 1 + r() * 2.4; g.beginPath();
      for (let x = -30; x <= w + 30; x += 30) { const yy = y + Math.sin(x / 170 + q) * am + Math.sin(x / 61 + q * 2) * am * .3; if (x < 0) g.moveTo(x, yy); else g.lineTo(x, yy); }
      g.stroke();
    }
  }, 110);
  S.carpeta = lienzo(3.4, 4.2, (g, w, h) => {
    g.fillStyle = "#fff"; g.strokeStyle = TINTA; g.lineWidth = 3;
    for (const [dx, dy, a] of [[18, -6, .05], [-10, 4, -.04]]) { g.save(); g.translate(w / 2 + dx, h / 2 + dy); g.rotate(a); g.fillRect(-w / 2 + 14, -h / 2 + 6, w - 28, h - 12); g.strokeRect(-w / 2 + 14, -h / 2 + 6, w - 28, h - 12); g.restore(); }
    g.fillStyle = "#D8C08E"; g.beginPath(); g.moveTo(0, 30); g.lineTo(110, 30); g.lineTo(130, 6); g.lineTo(220, 6); g.lineTo(240, 30); g.lineTo(w, 30); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "#fff"; g.fillRect(40, 130, w - 80, 170); g.strokeRect(40, 130, w - 80, 170);
    texto(g, "tus", w / 2, 198, { fuente: serif(62, true), color: TINTA });
    texto(g, "documentos", w / 2, 272, { fuente: serif(62, true), color: TINTA });
  });
  S.doc = lienzo(1.7, 2.1, (g, w) => { renglones(g, 18, 26, w - 36, 7, 22, 9, 6); });
  S.menu = lienzo(PW, PH, (g, w) => {
    texto(g, "Menú", w / 2, 70, { fuente: serif(64, true), color: TINTA }); cubiertos(g, w / 2, 112, .55);
    const r = azar(3);
    for (let i = 0; i < 6; i++) { const y = 160 + i * 22; g.fillStyle = TINTA; g.fillRect(24, y, 60 + r() * 60, 6); g.fillStyle = "rgba(17,17,17,.35)"; for (let x = 150; x < w - 50; x += 12) g.fillRect(x, y + 2, 4, 3); g.fillStyle = TINTA; g.fillRect(w - 46, y, 22, 6); }
  });
  S.familia = lienzo(PW, PH, (g, w) => {
    texto(g, "Familia", 22, 66, { fuente: serif(56, true), color: TINTA, alin: "left" });
    ["mamá", "tía Lupe", "los primos", "abuelo"].forEach((s, i) => { g.strokeStyle = TINTA; g.lineWidth = 3; g.strokeRect(24, 100 + i * 44, 20, 20); texto(g, s, 56, 120 + i * 44, { fuente: serif(36, i === 0), color: i === 0 ? ACENTO : TINTA, alin: "left" }); });
  });
  S.ayer = lienzo(PW, PH, (g, w, h) => {
    texto(g, "Ayer", w / 2, 64, { fuente: serif(62), color: TINTA }); g.fillStyle = TINTA; g.fillRect(16, 80, w - 32, 4); g.fillRect(16, 88, w - 32, 1.5);
    g.fillStyle = "#D9D5CB"; g.fillRect(20, 102, w * .48, 86); g.strokeStyle = TINTA; g.lineWidth = 2; g.strokeRect(20, 102, w * .48, 86);
    renglones(g, w * .56, 104, w * .38, 4, 22, 13, 5); renglones(g, 20, 204, w * .42, 4, 20, 17, 5); renglones(g, w * .52, 204, w * .42, 4, 20, 19, 5);
  });
  S.fonda = restaurante("Fonda", 2);
  S.taqueria = restaurante("Taquería", 4);
  S.asador = restaurante("Asador", 6);
  S.marisq = restaurante("Marisquería", 1, (g, w) => { cangrejo(g, w / 2, 210, .62); });
  S.resp1 = lienzo(2.5, 1.75, (g, w) => { texto(g, "respuesta", 18, 40, { fuente: mono(22), color: GRIS, alin: "left" }); renglones(g, 18, 62, w - 36, 4, 26, 71, 7); });
  S.resp2 = lienzo(2.5, 1.75, (g, w) => { texto(g, "te recomiendo", 18, 44, { fuente: serif(34, true), color: GRIS, alin: "left" }); texto(g, "la Marisquería", 18, 108, { fuente: serif(44, true), color: TINTA, alin: "left" }); renglones(g, 18, 132, w - 60, 1, 22, 72, 6); });
  S.resp3 = lienzo(2.5, 1.75, (g, w) => {
    texto(g, "respuesta", 18, 40, { fuente: mono(22), color: GRIS, alin: "left" });
    const r = azar(73);
    for (let i = 0; i < 3; i++) { const y = 62 + i * 30, l = (w - 80) * (.6 + r() * .3); g.fillStyle = TINTA; g.beginPath(); g.roundRect(18, y, l, 7, 3.5); g.fill(); texto(g, String(i + 1), 28 + l, y + 10, { fuente: mono(24), color: ACENTO, alin: "left" }); }
  });
  for (let v = 0; v < 3; v++) S["lomos" + v] = lienzo(SEGL, ALTO, (g, w, h) => {
    const r = azar(900 + v * 17);
    g.fillStyle = "#2a2622"; g.fillRect(0, 0, w, h);
    const tabla = 26, n = 6, alto = (h - tabla) / n;
    for (let f = 0; f < n; f++) {
      const y0 = tabla + f * alto, base = y0 + alto - tabla * .5;
      g.fillStyle = "#1a1714"; g.fillRect(0, y0, w, alto - tabla * .5);
      let x = 12;
      while (x < w - 20) {
        const bw = 14 + r() * 26, bh = alto * (.62 + r() * .3), col = r();
        const color = col < .28 ? "#E6E1D4" : col < .5 ? "#C9BFA8" : col < .66 ? "#9b8b6c" : col < .8 ? "#56534d" : col < .9 ? "#7c6a50" : "#d8d2c4";
        if (r() < .08 && x < w - 60) { g.save(); g.translate(x, base); g.rotate(-.18); g.fillStyle = color; g.fillRect(0, -bh, bw, bh); g.restore(); x += bw + 14; continue; }
        g.fillStyle = color; g.fillRect(x, base - bh, bw, bh);
        g.fillStyle = "rgba(0,0,0,.18)"; g.fillRect(x + bw - 3, base - bh, 3, bh);
        if (bw > 22) { g.fillStyle = "rgba(17,17,17,.35)"; g.fillRect(x + 4, base - bh * .8, bw - 8, 3); g.fillRect(x + 4, base - bh * .25, bw - 8, 3); }
        x += bw + 1.5;
        if (r() < .06) x += 30 + r() * 40;
      }
      g.fillStyle = "#3d372f"; g.fillRect(0, y0 + alto - tabla * .5, w, tabla * .5);
    }
    g.fillStyle = "#3d372f"; g.fillRect(0, 0, w, tabla); g.fillRect(0, 0, 10, h); g.fillRect(w - 10, 0, 10, h);
    g.fillStyle = "rgba(0,0,0,.35)"; g.fillRect(w - 10, 0, 2, h);
  }, 70);
  // pedazos: trozos de tus documentos
  const pz = (f: (g: C, w: number, h: number) => void) => lienzo(.95, 1.2, (g, w, h) => { g.fillStyle = BLANCO; g.fillRect(0, 0, w, h); f(g, w, h); });
  S.pz_lin = pz((g, w) => renglones(g, 10, 16, w - 20, 5, 19, 31, 5));
  S.pz_tres = pz((g, w) => { pastelD(g, w / 2, 66, .4); renglones(g, 10, 98, w - 20, 1, 10, 32, 5); });
  S.pz_flan = pz((g, w) => { postreD(g, w / 2, 68, .38); renglones(g, 10, 100, w - 20, 1, 10, 33, 5); });
  S.pz_mar = pz((g, w) => { cangrejo(g, w / 2, 70, .3); renglones(g, 10, 100, w - 20, 1, 10, 34, 5); });
  S.pz_nota = pz((g, w, h) => { g.strokeStyle = ACENTO; g.lineWidth = 4; g.strokeRect(6, 6, w - 12, h - 12); renglones(g, 14, 30, w - 28, 3, 22, 35, 6); });
  return S;
}

export const Pieza: React.FC = () => <Lienzo dibuja={dibuja} preparar={() => ({ spr: hazSprites() })} fondo={PAPEL} />;
