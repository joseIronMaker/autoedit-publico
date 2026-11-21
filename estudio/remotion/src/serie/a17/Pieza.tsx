// Serie 2, capítulo 17: los primeros. Una cinta métrica de papel recorre la mesa y el tiempo es distancia
// (un mes, 1.25 unidades). En marzo de 2023 cae un disco de vinil con una raya roja; la bola con manos es la
// aguja: corre parada en el frente y el disco gira bajo sus pies. Cuando llega a la raya, cada vuelta la
// avienta un surco atrás y le saca una moneda: el mismo surco para siempre. El humo de la fricción la tapa y
// escribe «humo». La cámara retrocede por la cinta a octubre de 2022 (ReAct: dos engranes que se turnan),
// avanza a junio de 2023 (el botón rojo del a02) y sube: todas las piezas en la mesa, y la bola se pierde.
// En marzo de 2024 cae un cartel enorme que sacude toda la mesa; luego, un sello. En octubre de 2024 la bola usa
// una computadora de papel, lenta y torpe, y acierta. El disco brinca por la cinta hasta ella y esta vez la bola
// salta la raya y llega al centro. Dos marcas idénticas en la cinta, y la cinta se enrolla en su estuche.
// Los instantes vienen de eventos.json, que escribe partitura.py: dibujo y sonido no se desfasan.
import React from "react";
import { azar, camara, clamp, ease, guionCamara, lerp, muestreaTexto, prog, smooth, texto } from "../../kit";
import type { Cam, Vista } from "../../kit";
import { ACENTO, bola, cue, GRIS, Lienzo, mono, PAPEL, rotulo, serif, sombra, TINTA } from "../../marca";
import { brazo } from "../../personaje";
import palabras from "./palabras.json";
import duracion from "./duracion.json";
import ev from "./eventos.json";

export const DURACION = duracion.dur;
type Ctx = CanvasRenderingContext2D;
type Pt = { x: number; y: number; s: number; zc: number };
const T = cue(palabras);
const s_ = (f: string, d = 0) => T(f, d).s, e_ = (f: string, d = 0) => T(f, d).e;
const E = ev;
const F = E.fis;
const TAU2 = Math.PI * 2;

// ---------- el mundo: x a lo ancho, y a lo largo de la cinta (el tiempo), z hacia arriba ----------
const U = 1.25;
const Y = { oct22: 1 * U, mar23: 6 * U, jun23: 9 * U, mar24: 18 * U, oct24: 25 * U };
const CINTA0 = -3 * U, ESTUCHE = 43.2, ANCHO = 1.0;
const D0 = { x: 2.1, y: Y.mar23 }, RD = 1.4;            // el disco en marzo de 2023
const D1 = { x: 2.0, y: 34.0 };                        // donde aterriza al final: casi dos años después
const SALTOS_D = [D0, { x: -2.6, y: 14.6 }, { x: -2.9, y: 21.0 }, { x: -2.6, y: 28.0 }, D1];
const ENG = { x: 2.25, y: Y.oct22 + .55 };
const BOT = { x: 2.1, y: Y.jun23 + .3 };
const CART = { x: 1.6, y: Y.mar24 + .9 }, CART_H = 5.6;
const PANT = { x: 2.35, y: Y.oct24 + .5 };
const SILLA = { x: .9, y: Y.oct24 - .35 };
const RATON = { x: 1.55, y: Y.oct24 - .8 };
const CONT = { x: 3.35, y: Y.mar23 + 1.7 };
const MARCA_A = 41.0, MARCA_B = 38.6;
const RB = .52;                                         // radio de la bola

// ---------- utilidades ----------
const seg = (t: number, a: number, b: number, c: number, d: number) => smooth(prog(t, a, b)) * (1 - smooth(prog(t, c, d)));
function tramos(t: number, v0: number, S: [number, number, number, ((x: number) => number)?][]) {
  let v = v0;
  for (const [a, b, x, f] of S) { if (t <= a) break; v = lerp(v, x, (f ?? smooth)(prog(t, a, b))); }
  return v;
}
const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * TAU2 + f);
const ultimo = (L: number[], t: number) => { let r = -99; for (const x of L) if (x <= t) r = x; return r; };
const golpeDesde = (t: number, t0: number, f = 9, d = 5) => (t < t0 ? 0 : Math.exp(-(t - t0) * d) * Math.cos((t - t0) * f * TAU2 * .25));

// ---------- física del disco (la misma que en partitura.py) ----------
function rho(t: number) {
  const S = F.seg;
  if (t < S[0][0]) return F.wd * (t - S[0][0]);
  let r = 0, w = F.wd;
  for (let i = 0; i < S.length; i++) {
    const [ti, wT, tau] = S[i];
    if (t < ti) break;
    const tf = i + 1 < S.length ? Math.min(t, S[i + 1][0]) : t;
    const a = tf - ti, ex = Math.exp(-a / tau);
    r += wT * a + (w - wT) * tau * (1 - ex);
    w = wT + (w - wT) * ex;
  }
  return r;
}
const T_CAE = Math.sqrt(2 * E.disco_h / 30);
/** Centro del disco y su altura: cae, rebota, espera dos años y brinca por la cinta. */
function discoPos(t: number) {
  if (t < E.disco) {
    // Entra planeando como frisbee desde el primer cuadro y cae justo cuando dice "apareció".
    const u = clamp((t + .25) / (E.disco + .25)), k = ease.inOutSine(u);
    return { x: lerp(4.4, D0.x, k), y: lerp(D0.y + 3.2, D0.y, k), z: Math.max(3.6 * (1 - u * u) + .2 * Math.sin(u * 9) * (1 - u), 0) };
  }
  if (t < E.vuela) {
    const b = t - E.disco, v = 30 * T_CAE * .28, d = 2 * v / 30;
    return { x: D0.x, y: D0.y, z: b < d ? Math.max(v * b - 15 * b * b, 0) : 0 };
  }
  const L = [E.vuela, ...E.brincos];
  for (let k = 0; k < L.length - 1; k++) {
    if (t < L[k + 1]) {
      const u = prog(t, L[k], L[k + 1]), A = SALTOS_D[k], B = SALTOS_D[k + 1];
      const h = k === 3 ? 1.9 : 1.4;
      // el último brinco pasa por la orilla de la mesa, sobre la cabeza de la bola, y no toca la computadora
      return { x: lerp(A.x, B.x, k === 3 ? ease.inCubic(u) : ease.inOutSine(u)), y: lerp(A.y, B.y, u), z: 4 * h * u * (1 - u) };
    }
  }
  const b = t - E.aterriza, v = 1.6, d = 2 * v / 20;
  return { x: D1.x, y: D1.y, z: b < d ? v * b - 10 * b * b : 0 };
}
/** Distancia del centro a la que corre la bola (es la aguja). */
function radioBola(t: number) {
  if (t >= E.sube) {
    if (t < E.toca) return F.r0;
    return lerp(F.r0, F.rfin, ease.inOutSine(prog(t, E.toca, E.termina)));
  }
  if (t < E.aguja) return F.r0;
  if (t < E.saltos[0]) return lerp(F.r0, F.rs, prog(t, E.aguja, E.saltos[0]));
  const k = ultimo(E.saltos, t);
  const u = clamp(rho(t) - rho(k));
  return F.rs + F.surco * (1 - u) * smooth(prog(t, k, k + .08));
}

// ---------- cámara ----------
const V = (tx: number, ty: number, tz: number, yaw: number, pitch: number, dist: number): Vista => ({ tx, ty, tz, yaw, pitch, dist });
const tSus = s_("sus números"), tEnM24 = s_("en marzo de dos mil veinticuatro"), tEnO24 = s_("en octubre de ese año");
const CLAVES: { t: number; v: Vista; dur?: number; curva?: (x: number) => number }[] = [
  { t: -1, v: V(1.0, -3.4, .3, .07, .55, 5.6) },
  { t: -.2, v: V(1.2, 7.1, .65, -.04, .64, 6.9), dur: .78, curva: ease.outExpo },
  { t: E.bola - .35, v: V(1.25, 7.0, .7, -.07, .62, 7.0), dur: 1.2 },
  { t: E.meta - .35, v: V(1.6, 7.2, .85, -.08, .6, 5.7), dur: .6 },
  { t: E.toma - .1, v: V(1.3, 7.0, .65, -.02, .64, 6.7), dur: 1.0 },
  { t: E.nombre - .25, v: V(1.25, 6.9, .7, .07, .6, 7.3), dur: 1.3 },
  { t: E.viral - .08, v: V(1.45, 7.2, .8, -.05, .64, 6.2), dur: .25, curva: ease.outExpo },
  { t: E.viral + .5, v: V(1.35, 7.1, .75, .03, .6, 7.2), dur: 1.4 },
  { t: E.dando - .35, v: V(1.85, 6.5, .45, -.16, .78, 4.9), dur: .7 },
  { t: E.gastando - .05, v: V(1.5, 6.0, .3, .09, .74, 6.6), dur: .8 },
  { t: s_("sin terminar") - .25, v: V(1.95, 7.3, 1.05, -.04, .5, 4.7), dur: .6 },
  { t: E.humo0 - .1, v: V(1.45, 6.9, 1.7, .03, .55, 8.0), dur: 1.8 },
  { t: E.atras, v: V(1.3, Y.oct22 + .3, 1.25, .05, .56, 7.4), dur: 2.05, curva: ease.inOutCubic },
  { t: E.react - .4, v: V(1.75, Y.oct22 + .6, 1.6, -.04, .46, 6.4), dur: 1.0 },
  { t: E.pensar - .35, v: V(2.15, Y.oct22 + .55, 1.05, -.06, .44, 4.9), dur: 1.0 },
  { t: E.adelante, v: V(1.55, Y.jun23 + .7, .75, -.03, .9, 5.3), dur: 1.0, curva: ease.inOutCubic },
  { t: E.papelito - .3, v: V(1.85, Y.jun23 + .55, .9, -.06, .78, 4.6), dur: .9 },
  { t: E.piezas - .25, v: V(1.45, 6.5, 0, 0, 1.3, 12.2), dur: 1.0 },
  { t: tEnM24 - .45, v: V(1.05, Y.mar24 - .2, .9, -.03, .62, 6.8), dur: .95 },
  { t: E.cartel - .5, v: V(1.6, CART.y, 3.3, 0, .3, 7.4), dur: .6 },
  { t: E.cita - .1, v: V(1.75, CART.y, 2.55, .035, .32, 7.5), dur: 3.3, curva: ease.inOutSine },
  { t: E.sacude - .04, v: V(1.5, 15.2, 0, 0, .95, 15.5), dur: .45, curva: ease.outExpo },
  { t: tSus - .35, v: V(1.6, CART.y, 2.1, 0, .36, 7.0), dur: .75 },
  { t: E.tumba[0] - .5, v: V(1.6, CART.y - 2.4, 1.4, .05, .78, 9.4), dur: 1.0 },
  { t: tEnO24 - .4, v: V(1.25, Y.oct24 - .05, .8, -.03, .62, 6.8), dur: .9 },
  { t: E.viendo - .25, v: V(1.75, Y.oct24 + .2, 1.0, -.08, .52, 5.6), dur: 1.2 },
  { t: E.lento - .25, v: V(2.15, Y.oct24 + .45, 1.2, -.04, .44, 4.6), dur: 1.0 },
  { t: E.acierta - .15, v: V(1.75, Y.oct24 + .2, 1.0, .03, .5, 5.7), dur: .8 },
  { t: E.giro, v: V(1.4, 16.0, 0, 0, .62, 18), dur: 1.1 },
  { t: E.vuela - .1, v: V(1.3, 27.5, 0, 0, .8, 13), dur: E.aterriza - E.vuela, curva: ease.inOutSine },
  { t: E.toca - .25, v: V(1.7, D1.y + .15, .65, -.05, .66, 5.8), dur: .8 },
  { t: E.marcas - .3, v: V(1.25, 40.1, 0, 0, 1.17, 6.6), dur: 1.0 },
  { t: E.clack + .05, v: V(1.7, 36.5, .5, .02, .62, 11), dur: 2.0, curva: ease.inOutSine },
];

// ---------- sacudidas: cada pieza brinca cuando le llega la onda ----------
function brinco(t: number, y: number) {
  let z = 0;
  for (const [t0, A, y0] of [[E.cartel, .35, CART.y], [E.sacude, 1.5, CART.y]] as [number, number, number][]) {
    const a = t - t0 - Math.abs(y - y0) / 38;
    if (a > 0 && a < 1.2) z += A * Math.abs(Math.sin(a * 9)) * Math.exp(-a * 4.2);
  }
  return z;
}
function temblor(t: number) {
  let k = 0;
  for (const [t0, A] of [[E.clava, 5], [E.disco, 10], [E.cartel, 26], [E.sacude, 34], [E.sello, 9], [E.aterriza, 9], [E.clack, 8]] as [number, number][])
    if (t >= t0 && t < t0 + 1) k += A * Math.exp(-(t - t0) * 7);
  for (const x of E.saltos) if (t >= x && t < x + .4) k += 3 * Math.exp(-(t - x) * 12);
  return k;
}

// ---------- estado por cuadro ----------
let CAM: Cam;
let NIEBLA = [10, 20];
let TT = 0;
function P(x: number, y: number, z = 0): Pt | null { return CAM.p(x, y, z); }
/** Lo que queda pegado a la cámara o muy abajo del cuadro no se dibuja: un objeto parado ahí se vuelve gigante. */
const fuera = (p: Pt) => p.zc < 1.6 || p.y > 2300;
function delante(x: number, y: number) { const p = P(x, y, 0); return p && !fuera(p) ? p.zc : -1; }
function niebla(zc: number) { return 1 - smooth(prog(zc, NIEBLA[0], NIEBLA[1])); }
function hervor(seed: number) { const r = azar(seed * 977 + Math.floor(TT * 10)); return [(r() - .5) * 1.3, (r() - .5) * 1.3]; }

/** Un objeto de papel parado: se dibuja en unidades locales (100 = 1 unidad), con y hacia arriba negativa. */
function parado(c: Ctx, x: number, y: number, z: number, fn: (c: Ctx, k: number) => void, o: { esc?: number; rot?: number; alfa?: number; sy?: number; seed?: number } = {}) {
  const p = P(x, y, z); if (!p || fuera(p)) return;
  const a = (o.alfa ?? 1) * niebla(p.zc); if (a <= .01) return;
  const k = p.s / 100 * (o.esc ?? 1);
  c.save(); c.globalAlpha *= a; c.translate(p.x, p.y);
  if (o.seed !== undefined) { const [hx, hy] = hervor(o.seed); c.translate(hx, hy); }
  if (o.rot) c.rotate(o.rot);
  c.scale(k, k * (o.sy ?? 1));
  fn(c, k);
  c.restore();
}
/** Texto acostado sobre la mesa. */
function textoPlano(c: Ctx, s: string, x: number, y: number, alto: number, color: string, alfa: number, it = false) {
  const o = P(x, y, .012), a = P(x + 1, y, .012), b = P(x, y + 1, .012);
  if (!o || !a || !b || alfa <= .01) return;
  c.save(); c.globalAlpha *= alfa * niebla(o.zc);
  c.transform((a.x - o.x) / 100, (a.y - o.y) / 100, -(b.x - o.x) / 100, -(b.y - o.y) / 100, o.x, o.y);
  texto(c, s, 0, 0, { fuente: serif(alto * 100, it), color, base: "middle" });
  c.restore();
}
function aro(c: Ctx, cx: number, cy: number, z: number, r: number, n = 56, a0 = 0, a1 = TAU2) {
  c.beginPath(); let ok = false;
  for (let i = 0; i <= n; i++) {
    const a = lerp(a0, a1, i / n), p = P(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z);
    if (!p) continue;
    if (!ok) { c.moveTo(p.x, p.y); ok = true; } else c.lineTo(p.x, p.y);
  }
}
function linea3(c: Ctx, A: [number, number, number], B: [number, number, number]) {
  const a = P(...A), b = P(...B); if (!a || !b) return;
  c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
}

// ---------- la mesa y la cinta ----------
function mesa(c: Ctx, t: number) {
  // Fibras del papel ancladas al mundo: dan paralaje cuando la cámara viaja por la cinta.
  const v = CAM.v, cx = Math.floor(v.tx / 1.6), cy = Math.floor(v.ty / 1.6), R = Math.ceil(v.dist / 1.6) + 6;
  c.strokeStyle = TINTA; c.lineWidth = 1.6;
  for (let j = cy - 4; j <= cy + R * 2; j++) for (let i = cx - R; i <= cx + R; i++) {
    const r = azar((i * 7919 + j * 104729) >>> 0);
    for (let k = 0; k < 2; k++) {
      const x = (i + r()) * 1.6, y = (j + r()) * 1.6, a = r() * 6.3, l = .12 + r() * .22;
      if (Math.abs(x) < .62) continue;
      const p = P(x, y), q = P(x + Math.cos(a) * l, y + Math.sin(a) * l); if (!p || !q) continue;
      c.globalAlpha = .1 * niebla(p.zc); c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); c.stroke();
    }
  }
  c.globalAlpha = 1;
}
/** La cinta métrica: `jala` la recoge hacia el estuche al final. */
function cinta(c: Ctx, t: number, jala: number) {
  const y0 = CINTA0 + jala, y1 = ESTUCHE - .55;
  if (y0 >= y1) return;
  const W = ANCHO / 2;
  // sombra y cuerpo, en tramos para que la niebla los apague con la distancia
  for (let y = Math.max(y0, CAM.v.ty - 30); y < y1; y += .5) {
    const ya = y, yb = Math.min(y + .52, y1);
    const a = P(-W, ya, .01), b = P(W, ya, .01), c2 = P(W, yb, .01), d = P(-W, yb, .01);
    const sa = P(-W + .06, ya, 0), sb = P(W + .1, ya, 0), sc = P(W + .1, yb, 0), sd = P(-W + .06, yb, 0);
    if (!a || !b || !c2 || !d || !sa || !sb || !sc || !sd) continue;
    const al = niebla(a.zc); if (al <= .01) continue;
    c.globalAlpha = al * .16; c.fillStyle = "#3a352c"; c.beginPath(); c.moveTo(sa.x, sa.y + 3); c.lineTo(sb.x + 4, sb.y + 3); c.lineTo(sc.x + 4, sc.y + 3); c.lineTo(sd.x, sd.y + 3); c.fill();
    c.globalAlpha = al; c.fillStyle = "#FDFBF4"; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(c2.x, c2.y); c.lineTo(d.x, d.y); c.closePath(); c.fill();
    c.strokeStyle = TINTA; c.lineWidth = clamp(.022 * a.s, 1, 5);
    c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(d.x, d.y); c.moveTo(b.x, b.y); c.lineTo(c2.x, c2.y); c.stroke();
  }
  // marcas: cada mes una raya, cada medio mes una chica, cada año una completa con su número
  const m0 = Math.ceil((y0 - jala) / (U / 2)), m1 = Math.floor((y1 - jala) / (U / 2));
  for (let k = m0; k <= m1; k++) {
    const y = k * U / 2 + jala; if (y < y0 || y > y1) continue;
    const p = P(-W, y, .015); if (!p) continue;
    const al = niebla(p.zc); if (al <= .01) continue;
    const mes = ((k / 2) % 12 + 12) % 12, entero = k % 2 === 0, anio = entero && Math.round(mes) === 4;   // y=0 es septiembre
    const L = anio ? ANCHO : entero ? .36 : .18;
    const q = P(-W + L, y, .015); if (!q) continue;
    c.globalAlpha = al; c.strokeStyle = TINTA; c.lineWidth = clamp((anio ? .05 : .026) * p.s, 1, 9);
    c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); c.stroke();
    const n = 2022 + Math.round((k / 2 + 8) / 12);
    if (anio && n <= 2025) textoPlano(c, String(n), .02, y + .36, .4, TINTA, al);
  }
  // la punta de la cinta: un gancho de lámina
  const g = P(0, y0, .02), g2 = P(0, y0, .2);
  if (g && g2 && y0 > CAM.v.ty - 30) {
    const al = niebla(g.zc); c.globalAlpha = al;
    const a = P(-W - .06, y0, .01), b = P(W + .06, y0, .01), a2 = P(-W - .06, y0, .22), b2 = P(W + .06, y0, .22);
    if (a && b && a2 && b2) { c.fillStyle = "#8a877f"; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(b2.x, b2.y); c.lineTo(a2.x, a2.y); c.closePath(); c.fill(); c.stroke(); }
  }
  c.globalAlpha = 1;
}

// ---------- piezas ----------
function bandera(c: Ctx, t: number, y: number, t0: number, l1: string, l2: string, cae = -1) {
  const primera = t0 < 1;                                  // la del arranque ya viene cayendo en el cuadro 0
  if (t < t0 - (primera ? .8 : .45)) return;
  const a = t - t0;
  const z = a < 0 ? (primera ? 10 : 16) * a * a : 0;
  const bam = a > 0 ? Math.exp(-a * 3.2) * Math.sin(a * 22) * .08 : 0;
  const vuelca = -ease.inCubic(prog(t, E.enrolla + .25, E.enrolla + .7)) * 1.48 + (t > E.enrolla + .7 ? Math.exp(-(t - E.enrolla - .7) * 6) * Math.sin((t - E.enrolla - .7) * 30) * .05 : 0);
  const tumba = vuelca + (cae > 0 ? ease.outCubic(prog(t, cae, cae + .45)) * -1.42 + (t > cae + .45 ? Math.exp(-(t - cae - .45) * 6) * Math.sin((t - cae) * 30) * .04 : 0) : 0);
  const ola = brinco(t, y);
  parado(c, .48, y, z + ola, (g) => {
    const H = 300;
    g.rotate(bam + tumba + .012 * vaiven(t, 2.3, y));
    g.strokeStyle = TINTA; g.lineWidth = 6; g.lineCap = "round"; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -H); g.stroke();
    // tela, hacia la izquierda: cuelga sobre la cinta y nunca tapa la pieza
    const w = 196, h = 132, top = -H + 14;
    g.beginPath(); g.moveTo(0, top);
    for (let i = 0; i <= 10; i++) { const u = i / 10; g.lineTo(-u * w, top + Math.sin(u * 5 + t * 3.1 + y) * 6 * u); }
    for (let i = 10; i >= 0; i--) { const u = i / 10; g.lineTo(-u * w, top + h + Math.sin(u * 5 + t * 3.1 + y + .4) * 6 * u); }
    g.closePath(); g.fillStyle = "#FDFCF8"; g.fill(); g.strokeStyle = TINTA; g.lineWidth = 5; g.stroke();
    texto(g, l1, -w + 16, top + 56, { fuente: serif(54, true), color: TINTA, alin: "left" });
    texto(g, l2, -w + 16, top + 112, { fuente: serif(54), color: TINTA, alin: "left" });
    // cabeza del alfiler
    const b = g.createRadialGradient(-6, -H - 8, 2, 0, -H, 22);
    b.addColorStop(0, "#F08A6B"); b.addColorStop(.5, ACENTO); b.addColorStop(1, "#6D1C0E");
    g.fillStyle = b; g.beginPath(); g.arc(0, -H, 20, 0, 7); g.fill();
  }, { seed: Math.round(y * 10) });
}
function sombraEn(c: Ctx, x: number, y: number, r: number, alfa: number) {
  const p = P(x, y, 0); if (!p) return;
  sombra(c, p.x, p.y, r * p.s, alfa * niebla(p.zc));
}

/** El disco: vinil en perspectiva, surcos, brillo fijo, etiqueta y la raya roja que gira con él. */
function disco(c: Ctx, t: number, D: { x: number; y: number; z: number }, extra: { surco: number; rB: number; fin: number }) {
  const z = D.z + .06, rot = rho(t) * TAU2;
  if (delante(D.x, D.y) < RD + 1.2) return;
  const p0 = P(D.x, D.y, 0); if (!p0) return;
  const al = niebla(p0.zc); if (al <= .01) return;
  c.save(); c.globalAlpha *= al;
  sombraEn(c, D.x + .06, D.y - .05, RD * 1.18, .42 / (1 + D.z * 1.4));
  // canto
  aro(c, D.x, D.y, z - .06, RD); c.fillStyle = "#050505"; c.fill();
  aro(c, D.x, D.y, z, RD); c.fillStyle = "#171716"; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 3; c.stroke();
  // brillo: dos gajos que no giran
  for (const a0 of [.18, .68]) {
    c.beginPath(); const A = a0 * TAU2, B = A + .5;
    const q0 = P(D.x + Math.cos(A) * .5, D.y + Math.sin(A) * .5, z);
    if (q0) c.moveTo(q0.x, q0.y);
    for (let i = 0; i <= 12; i++) { const a = lerp(A, B, i / 12), q = P(D.x + Math.cos(a) * 1.25, D.y + Math.sin(a) * 1.25, z); if (q) c.lineTo(q.x, q.y); }
    for (let i = 12; i >= 0; i--) { const a = lerp(A, B, i / 12), q = P(D.x + Math.cos(a) * .5, D.y + Math.sin(a) * .5, z); if (q) c.lineTo(q.x, q.y); }
    c.closePath(); c.fillStyle = "rgba(255,255,255,.075)"; c.fill();
  }
  c.strokeStyle = "rgba(255,255,255,.09)"; c.lineWidth = 1.4;
  for (let r = .5; r < 1.27; r += .055) { aro(c, D.x, D.y, z, r, 48); c.stroke(); }
  // lo que la bola ya recorrió
  if (extra.surco > 0) {
    c.globalAlpha = al * extra.surco; c.strokeStyle = ACENTO; c.lineWidth = clamp(.035 * p0.s, 2, 8);
    aro(c, D.x, D.y, z, extra.rB, 72); c.stroke(); c.globalAlpha = al;
  }
  // la raya: un tramo radial roto, gira con el disco
  {
    const A = rot + F.th_s * TAU2, r2 = azar(5);
    c.strokeStyle = ACENTO; c.lineWidth = clamp(.045 * p0.s, 2, 10); c.lineCap = "round"; c.beginPath();
    for (let i = 0; i <= 7; i++) {
      const r = lerp(.7, .95, i / 7), d = (r2() - .5) * .07, q = P(D.x + Math.cos(A + d) * r, D.y + Math.sin(A + d) * r, z);
      if (q) { if (i === 0) c.moveTo(q.x, q.y); else c.lineTo(q.x, q.y); }
    }
    c.stroke();
  }
  // etiqueta
  aro(c, D.x, D.y, z, .44); c.fillStyle = PAPEL; c.fill();
  aro(c, D.x, D.y, z, .4); c.strokeStyle = ACENTO; c.lineWidth = clamp(.02 * p0.s, 1, 4); c.stroke();
  for (let k = 0; k < 3; k++) {
    const A = rot + k * 2.1, q = P(D.x + Math.cos(A) * .28, D.y + Math.sin(A) * .28, z), q2 = P(D.x + Math.cos(A + .7) * .28, D.y + Math.sin(A + .7) * .28, z);
    if (q && q2) { c.strokeStyle = TINTA; c.lineWidth = clamp(.03 * p0.s, 1, 6); c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(q2.x, q2.y); c.stroke(); }
  }
  // fin del recorrido: un anillo tenue junto a la etiqueta
  if (extra.fin > 0) { c.globalAlpha = al * extra.fin; aro(c, D.x, D.y, z, .5); c.setLineDash([4, 10]); c.strokeStyle = PAPEL; c.lineWidth = 3; c.stroke(); c.setLineDash([]); }
  c.restore();
}
/** La tarjeta de la meta ensartada en el eje del disco. */
function tarjeta(c: Ctx, t: number, D: { x: number; y: number; z: number }, palomita: number) {
  if (t < E.meta - .5 || delante(D.x, D.y) < RD + 1.2) return;
  const a = t - E.meta, caeZ = a < 0 ? 18 * a * a : 0, bam = a > 0 ? Math.exp(-a * 5) * Math.sin(a * 26) * .1 : 0;
  parado(c, D.x, D.y, D.z + .06, (g) => {
    g.strokeStyle = "#8a877f"; g.lineWidth = 7; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -56); g.stroke();
    g.translate(0, -caeZ * 100); g.rotate(bam);
    g.fillStyle = "#FDFCF8"; g.strokeStyle = TINTA; g.lineWidth = 5;
    g.beginPath(); g.roundRect(-68, -150, 136, 96, 8); g.fill(); g.stroke();
    texto(g, "meta", -10, -88, { fuente: serif(46, true), color: TINTA });
    g.lineWidth = 4; g.strokeRect(30, -118, 26, 26);
    if (palomita > 0) {
      g.strokeStyle = ACENTO; g.lineWidth = 9; g.lineCap = "round"; g.beginPath();
      const k = palomita; g.moveTo(30, -106); g.lineTo(lerp(30, 41, clamp(k * 2)), lerp(-106, -92, clamp(k * 2)));
      if (k > .5) g.lineTo(lerp(41, 66, clamp(k * 2 - 1)), lerp(-92, -134, clamp(k * 2 - 1)));
      g.stroke();
    }
  }, { seed: 4 });
}

/** La bola con manos. m1 y m2 son las manos en unidades relativas al centro (x a la derecha, y hacia arriba). */
function laBola(c: Ctx, x: number, y: number, z: number, m1: [number, number], m2: [number, number], o: { abre1?: number; abre2?: number; piso?: number; alfa?: number; pregunta?: number } = {}) {
  const p = P(x, y, z); if (!p || fuera(p)) return;
  const al = (o.alfa ?? 1) * niebla(p.zc); if (al <= .01) return;
  const r = RB * p.s, cx = p.x, cy = p.y - r;
  c.save(); c.globalAlpha *= al;
  const pb = P(x, y, o.piso ?? 0);
  if (pb) sombra(c, pb.x, pb.y, r * 1.5, .32 / (1 + (z - (o.piso ?? 0)) * 1.5));
  const g = r / 90;
  const M1: [number, number] = [cx + m1[0] * p.s, cy - m1[1] * p.s], M2: [number, number] = [cx + m2[0] * p.s, cy - m2[1] * p.s];
  brazo(c, cx - 54 * g, cy - 50 * g, M1[0], M1[1], 90 * g, o.abre1 ?? .6, TINTA, 1, g);
  brazo(c, cx + 60 * g, cy - 30 * g, M2[0], M2[1], -100 * g, o.abre2 ?? .6, TINTA, 1, g);
  bola(c, cx, cy, r);
  if (o.pregunta && o.pregunta > 0) texto(c, "?", cx + r * .2, cy - r * 1.35 - 8 * o.pregunta, { fuente: serif(Math.max(r * 1.7, 70), true), color: ACENTO, alfa: o.pregunta });
  c.restore();
}

function engrane(g: Ctx, R: number, n: number, a: number, activo: number) {
  g.save(); g.rotate(a); g.beginPath();
  const w = TAU2 / n;
  for (let i = 0; i < n; i++) {
    const b = i * w;
    for (const [q, r] of [[0, R * .8], [.16, R * .8], [.28, R], [.6, R], [.72, R * .8]] as [number, number][]) {
      const X = Math.cos(b + q * w) * r, Yy = Math.sin(b + q * w) * r;
      if (i === 0 && q === 0) g.moveTo(X, Yy); else g.lineTo(X, Yy);
    }
  }
  g.closePath(); g.fillStyle = activo > .01 ? `rgba(233,137,108,${.25 + .35 * activo})` : "#FDFCF8"; g.fill();
  g.strokeStyle = activo > .5 ? ACENTO : TINTA; g.lineWidth = 6; g.stroke();
  g.beginPath(); g.arc(0, 0, R * .5, 0, 7); g.stroke();
  g.fillStyle = TINTA; g.beginPath(); g.arc(0, 0, R * .14, 0, 7); g.fill();
  for (let k = 0; k < 3; k++) { const A = k * 2.094; g.beginPath(); g.moveTo(Math.cos(A) * R * .14, Math.sin(A) * R * .14); g.lineTo(Math.cos(A) * R * .5, Math.sin(A) * R * .5); g.stroke(); }
  g.restore();
}
/** ReAct: una hoja que se levanta como libro desplegable y dos engranes que se turnan. */
function react(c: Ctx, t: number) {
  if (t < E.oct22 - 1) return;
  const ola = brinco(t, ENG.y);
  const k = ease.outBack(prog(t, E.articulo, E.articulo + .55), 1.4);
  const kg = [ease.outBack(prog(t, E.propuso, E.propuso + .45), 2), ease.outBack(prog(t, E.propuso + .18, E.propuso + .63), 2)];
  const turnos = E.turnos;
  const vueltas = (lado: number) => {
    let n = 0, act = 0;
    for (let i = lado; i < turnos.length; i += 2) {
      if (turnos[i] > t) break;
      const u = prog(t, turnos[i], turnos[i] + .28); n += ease.outBack(u, 2.2); act = Math.max(act, 1 - smooth(prog(t, turnos[i] + .32, turnos[i] + .55)));
    }
    return { n, act };
  };
  const g0 = vueltas(0), g1 = vueltas(1);
  // la hoja, acostada y luego de pie
  if (k < .02) {
    const a = P(ENG.x - 1.5, ENG.y - .9, .01), b = P(ENG.x + 1.5, ENG.y - .9, .01), c2 = P(ENG.x + 1.5, ENG.y + .9, .01), d = P(ENG.x - 1.5, ENG.y + .9, .01);
    if (a && b && c2 && d) { c.globalAlpha = niebla(a.zc); c.fillStyle = "#FDFCF8"; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(c2.x, c2.y); c.lineTo(d.x, d.y); c.closePath(); c.fill(); c.stroke(); c.globalAlpha = 1; }
    return;
  }
  parado(c, ENG.x, ENG.y + .4, ola, (g) => {
    g.scale(1, k);
    g.fillStyle = "#FDFCF8"; g.strokeStyle = TINTA; g.lineWidth = 5;
    g.beginPath(); g.moveTo(-160, 0); g.lineTo(-160, -350); g.lineTo(130, -350); g.lineTo(160, -320); g.lineTo(160, 0); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "#E7E3D8"; g.beginPath(); g.moveTo(130, -350); g.lineTo(130, -320); g.lineTo(160, -320); g.closePath(); g.fill(); g.stroke();
    const aT = smooth(prog(t, E.react - .05, E.react + .2));
    texto(g, "ReAct", 0, -262, { fuente: serif(96, true), color: TINTA, alfa: aT });
    g.fillStyle = TINTA; g.globalAlpha *= .22; for (let i = 0; i < 3; i++) g.fillRect(-124, -232 + i * 16, 248 - (i % 2) * 80, 6); g.globalAlpha /= .22;
    const aL = smooth(prog(t, E.pensar - .05, E.pensar + .15)), aR = smooth(prog(t, E.actuar - .05, E.actuar + .15));
    texto(g, "pensar", -80, -162, { fuente: serif(50, true), color: g0.act > .5 ? ACENTO : TINTA, alfa: aL });
    texto(g, "actuar", 80, -162, { fuente: serif(50, true), color: g1.act > .5 ? ACENTO : TINTA, alfa: aR });
  }, { seed: 7 });
  for (const [lado, gx] of [[0, -.8], [1, .8]] as [number, number][]) {
    const kk = kg[lado]; if (kk <= .01) continue;
    const st = lado === 0 ? g0 : g1;
    parado(c, ENG.x + gx, ENG.y, ola, (g) => {
      g.strokeStyle = TINTA; g.lineWidth = 7; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -66 * kk); g.stroke();
      g.translate(0, -66 * kk); g.scale(kk, kk);
      engrane(g, 60, 9, (lado === 0 ? 1 : -1) * st.n * TAU2 / 9 + (lado ? .35 : 0), st.act);
    }, { seed: 11 + lado });
  }
}
/** El botón del a02: consola oscura y domo rojo. */
function domo(g: Ctx, r: number, baja: number) {
  const h = r * (.86 - baja * .4), f = g.createRadialGradient(-r * .34, -h * .72, r * .06, 0, -h * .3, r * 1.14);
  f.addColorStop(0, "#F08A6B"); f.addColorStop(.44, ACENTO); f.addColorStop(1, "#6D1C0E");
  g.fillStyle = f; g.beginPath(); g.moveTo(-r, 0); g.bezierCurveTo(-r, -h * 1.32, r, -h * 1.32, r, 0); g.closePath(); g.fill();
  g.strokeStyle = TINTA; g.lineWidth = 5; g.stroke();
}
function boton(c: Ctx, t: number) {
  if (t < E.boton - .05) return;
  const k = ease.outBack(prog(t, E.boton, E.boton + .5), 2.2), ola = brinco(t, BOT.y);
  const baja = seg(t, E.clac - .05, E.clac, E.clac + .22, E.clac + .45);
  parado(c, BOT.x, BOT.y, ola, (g) => {
    g.scale(1, k);
    g.fillStyle = "#1b1b1a"; g.fillRect(-62, -78, 124, 78);
    g.fillStyle = "#3b3a37"; g.fillRect(-74, -92, 148, 18);
    g.strokeStyle = "#6c6a64"; g.lineWidth = 3; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-40 + i * 20, -62); g.lineTo(-40 + i * 20, -14); g.stroke(); }
    g.translate(0, -92); domo(g, 50, baja);
    if (baja > .3) { const q = g.createRadialGradient(0, -30, 4, 0, -30, 130); q.addColorStop(0, `rgba(255,120,80,${.45 * baja})`); q.addColorStop(1, "rgba(255,120,80,0)"); g.fillStyle = q; g.fillRect(-140, -170, 280, 280); }
  }, { seed: 13, esc: 1.45 });
  // el papelito llega volando y aprieta
  const a = prog(t, E.papelito, E.clac);
  if (t >= E.papelito && t < E.clac + 1.4) {
    let x, y, z, rot;
    if (t < E.clac) { x = lerp(-2.6, BOT.x, a); y = lerp(BOT.y - 1.4, BOT.y - .05, a); z = lerp(2.4, 1.45, a) + Math.sin(a * Math.PI) * 1.3; rot = a * 9; }
    else { const b = t - E.clac; x = BOT.x + .8 * Math.min(b * 2, 1); y = BOT.y - .3; z = Math.max(1.45 + 1.6 * b - 6 * b * b, 0) + ola; rot = 9 + b * 5; }
    parado(c, x, y, z, (g) => {
      g.rotate(rot); g.fillStyle = "#FDFCF8"; g.strokeStyle = TINTA; g.lineWidth = 4;
      g.beginPath(); g.rect(-26, -17, 52, 34); g.fill(); g.stroke();
      g.fillStyle = TINTA; g.fillRect(-16, -6, 32, 4); g.fillRect(-16, 3, 22, 4);
    });
  }
}
/** El viral: una tarjeta donde alguien cuenta con palitos, cada vez más rápido. Mucho, sin una cifra inventada. */
const palitos = (t: number) => Math.min(60, Math.floor(9 * Math.max(t - E.viral, 0) ** 1.2));
function contador(c: Ctx, t: number) {
  if (t < E.viral - .1 || t > E.humo + 1.6) return;
  const k = ease.outBack(prog(t, E.viral - .05, E.viral + .35), 2) * (1 - smooth(prog(t, E.humo0 + .4, E.humo0 + .9)));
  if (k <= .01) return;
  parado(c, CONT.x, CONT.y, 0, (g) => {
    g.scale(k, k);
    g.strokeStyle = TINTA; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -175); g.stroke();
    g.translate(0, -25);
    g.fillStyle = "#FDFCF8"; g.lineWidth = 5; g.beginPath(); g.roundRect(-78, -268, 156, 120, 10); g.fill(); g.stroke();
    const n = Math.min(palitos(t), 45);
    g.strokeStyle = TINTA; g.lineWidth = 5; g.lineCap = "round";
    for (let i = 0; i < n; i++) {
      const gi = Math.floor(i / 5), j = i % 5, col = gi % 3, row = Math.floor(gi / 3);
      const x0 = -60 + col * 44, y0 = -254 + row * 36;
      const r = azar(i * 13 + 1), dx = (r() - .5) * 3;
      g.beginPath();
      if (j < 4) { g.moveTo(x0 + j * 8 + dx, y0); g.lineTo(x0 + j * 8 - dx, y0 + 26); } else { g.moveTo(x0 - 5, y0 + 22); g.lineTo(x0 + 30, y0 + 4); }
      g.stroke();
    }
  }, { seed: 17 });
}
/** El cartel: cae del cielo, se planta y sacude la mesa. */
function cartel(c: Ctx, t: number) {
  if (t < E.cartel - .55) return;
  const a = t - E.cartel;
  const z = a < 0 ? 26 * a * a : 0;
  const ap = a > 0 ? Math.exp(-a * 6) * Math.cos(a * 34) * .045 : 0, ap2 = t > E.sacude ? Math.exp(-(t - E.sacude) * 5) * Math.cos((t - E.sacude) * 30) * .05 : 0;
  const sello = prog(t, E.sello - .12, E.sello);
  const cae = ease.inCubic(prog(t, E.tumba[0], E.tumba[1]));
  if (cae >= .999) return;
  parado(c, CART.x, CART.y, z + brinco(t, CART.y) * .4, (g) => {
    g.scale(1 + ap * .4 + ap2 * .3, (1 - ap - ap2) * Math.cos(cae * Math.PI / 2));
    g.fillStyle = TINTA; g.fillRect(-170, -70, 22, 70); g.fillRect(148, -70, 22, 70);
    const W = 250, H = 560, B = -60;
    g.fillStyle = "#FDFCF8"; g.strokeStyle = TINTA; g.lineWidth = 8;
    g.beginPath(); g.rect(-W, B - H, W * 2, H); g.fill(); g.stroke();
    g.lineWidth = 3; g.strokeRect(-W + 14, B - H + 14, W * 2 - 28, H - 28);
    texto(g, "Devin", 0, B - H + 112, { fuente: serif(104), color: TINTA });
    const aC = smooth(prog(t, E.cita - .05, E.cita + .25));
    texto(g, "se presentó como", 0, B - H + 176, { fuente: serif(40, true), color: GRIS, alfa: aC });
    const L = ["«el primer ingeniero", "de software", "con IA»"];
    L.forEach((s, i) => texto(g, s, 0, B - H + 250 + i * 64, { fuente: serif(54, true), color: TINTA, alfa: smooth(prog(t, E.cita + i * .32, E.cita + i * .32 + .2)) }));
    if (sello > 0) {
      const k2 = ease.outCubic(sello);
      g.save(); g.translate(0, B - 98); g.rotate(-.1); g.scale(lerp(2.4, 1, k2), lerp(2.4, 1, k2)); g.globalAlpha *= clamp(sello * 1.4);
      g.strokeStyle = ACENTO; g.lineWidth = 8; g.strokeRect(-178, -66, 356, 132);
      g.lineWidth = 3; g.strokeRect(-166, -54, 332, 108);
      texto(g, "NÚMEROS", 0, -8, { fuente: mono(52), color: ACENTO });
      texto(g, "DISCUTIDOS", 0, 46, { fuente: mono(52), color: ACENTO });
      g.restore();
    }
  }, { seed: 19 });
}
/** El cartel ya acostado sobre la mesa: la promesa quedó ahí. */
function cartelAcostado(c: Ctx, t: number) {
  if (t < E.tumba[1] - .02) return;
  const y0 = CART.y - CART_H - .7, y1 = CART.y, x0 = CART.x - 2.5, x1 = CART.x + 2.5;
  const rebote = golpeDesde(t, E.tumba[1], 9, 7) * .05;
  const Q = [P(x0, y0, .02 + rebote), P(x1, y0, .02 + rebote), P(x1, y1, .02), P(x0, y1, .02)];
  if (Q.some((q) => !q) || delante(CART.x, y0) < 1) return;
  const q = Q as Pt[], al = niebla(q[0].zc);
  c.save(); c.globalAlpha = al;
  c.fillStyle = "rgba(40,35,28,.16)"; c.beginPath(); q.forEach((p, i) => (i ? c.lineTo(p.x + 6, p.y + 5) : c.moveTo(p.x + 6, p.y + 5))); c.fill();
  c.fillStyle = "#FDFCF8"; c.strokeStyle = TINTA; c.lineWidth = clamp(.05 * q[0].s, 2, 8);
  c.beginPath(); q.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.fill(); c.stroke();
  c.restore();
  // de cabeza para quien lo ve desde el pasado: el texto queda hacia la cámara
  textoPlano(c, "Devin", CART.x, y0 + 4.9, .95, TINTA, al);
  for (let i = 0; i < 3; i++) { const a = P(CART.x - 1.8 + (i % 2) * .3, y0 + 3.6 - i * .55, .03), b = P(CART.x + 1.8 - (i % 2) * .5, y0 + 3.6 - i * .55, .03); if (a && b) { c.globalAlpha = al * .35; c.strokeStyle = TINTA; c.lineWidth = clamp(.12 * a.s, 2, 16); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); c.globalAlpha = 1; } }
  const s1 = P(CART.x - 1.8, y0 + 1.6, .03), s2 = P(CART.x + 1.8, y0 + 1.6, .03), s3 = P(CART.x + 1.8, y0 + .4, .03), s4 = P(CART.x - 1.8, y0 + .4, .03);
  if (s1 && s2 && s3 && s4) { c.globalAlpha = al; c.strokeStyle = ACENTO; c.lineWidth = clamp(.07 * s1.s, 2, 10); c.beginPath(); c.moveTo(s1.x, s1.y); c.lineTo(s2.x, s2.y); c.lineTo(s3.x, s3.y); c.lineTo(s4.x, s4.y); c.closePath(); c.stroke(); c.globalAlpha = 1; }
}
/** La computadora de papel: pantalla con tres casillas y un botón; el cursor lento, torpe y que al final acierta. */
function cursorEn(t: number): [number, number] {
  const ini: [number, number] = [-80, 40];
  const OK: [number, number] = [70, 52];
  let x = ini[0], y = ini[1];
  if (t < E.raton) return [x, y];
  const tr: [number, number, number, number, number][] = [
    [E.raton, E.raton + .9, -40, 30, 0],
    [E.lento, E.torpe - .1, -22, 34, 0],
    [E.torpe, E.torpe + .22, 108, -64, 1],
    [E.torpe + .3, E.torpe + .55, 90, -40, 0],
    [E.equis[0] - .3, E.equis[0] - .02, -78, -36, 0],
    [E.equis[1] - .25, E.equis[1] - .02, 74, -36, 0],
    [E.aun, E.acierta - .05, OK[0], OK[1], 0],
  ];
  for (const [a, b, X, Yy, brusco] of tr) {
    if (t <= a) break;
    const u = (brusco ? ease.outExpo : ease.inOutCubic)(prog(t, a, b));
    x = lerp(x, X, u); y = lerp(y, Yy, u);
  }
  // torpe: tiembla al pasarse
  const w = seg(t, E.torpe, E.torpe + .2, E.torpe + .9, E.torpe + 1.1);
  return [x + Math.sin(t * 41) * 7 * w, y + Math.cos(t * 37) * 6 * w];
}
/** Cuando el disco aterriza detrás, el golpe tumba la computadora de papel: queda acostada, con su palomita. */
const pliegue = (t: number) => ease.inCubic(prog(t, E.aterriza - .12, E.aterriza + .22));
function computadoraAcostada(c: Ctx, t: number) {
  if (pliegue(t) < .999) return;
  const x0 = PANT.x - 1.28, x1 = PANT.x + 1.28, y0 = PANT.y - 2.3, y1 = PANT.y - .1;
  const Q = [P(x0, y0, .02), P(x1, y0, .02), P(x1, y1, .02), P(x0, y1, .02)];
  if (Q.some((q) => !q) || delante(PANT.x, y0) < 1) return;
  const q = Q as Pt[], al = niebla(q[0].zc);
  c.save(); c.globalAlpha = al;
  c.fillStyle = "#FDFCF8"; c.strokeStyle = TINTA; c.lineWidth = clamp(.05 * q[0].s, 2, 8);
  c.beginPath(); q.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.fill(); c.stroke();
  const a = P(PANT.x - .45, y0 + 1.0, .03), b = P(PANT.x - .15, y0 + .7, .03), d = P(PANT.x + .45, y0 + 1.5, .03);
  if (a && b && d) { c.strokeStyle = ACENTO; c.lineWidth = clamp(.1 * a.s, 2, 14); c.lineCap = "round"; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(d.x, d.y); c.stroke(); }
  c.restore();
}
function computadora(c: Ctx, t: number) {
  if (t < E.compu - .05 || pliegue(t) >= .999) return;
  const k = ease.outBack(prog(t, E.compu, E.compu + .55), 1.8) * Math.cos(pliegue(t) * Math.PI / 2);
  parado(c, PANT.x, PANT.y, 0, (g) => {
    g.scale(1, k);
    g.fillStyle = TINTA; g.fillRect(-60, -12, 120, 12); g.fillRect(-12, -52, 24, 42);
    g.fillStyle = "#FDFCF8"; g.strokeStyle = TINTA; g.lineWidth = 6;
    g.beginPath(); g.roundRect(-128, -228, 256, 178, 12); g.fill(); g.stroke();
    g.fillStyle = "#ECE8DE"; g.fillRect(-112, -212, 224, 146);
    g.translate(0, -139);
    // tres casillas y el botón
    const cas = [-78, 0, 78];
    cas.forEach((cx, i) => { g.strokeStyle = TINTA; g.lineWidth = 3; g.fillStyle = "#FDFCF8"; g.beginPath(); g.rect(cx - 28, -58, 56, 46); g.fill(); g.stroke(); g.fillStyle = TINTA; g.fillRect(cx - 16, -42, 32, 5); g.fillRect(cx - 16, -30, 20, 5); void i; });
    const ok = smooth(prog(t, E.acierta, E.acierta + .12));
    g.fillStyle = ok > 0 ? ACENTO : "#FDFCF8"; g.strokeStyle = ACENTO; g.lineWidth = 4;
    g.beginPath(); g.roundRect(28, 30, 92, 44, 22); g.fill(); g.stroke();
    texto(g, "listo", 74, 60, { fuente: serif(30, true), color: ok > 0 ? "#FDFCF8" : ACENTO });
    // errores
    E.equis.forEach((te: number, i: number) => {
      const a = smooth(prog(t, te, te + .08)) * (1 - smooth(prog(t, E.aun + .2, E.aun + .5)));
      if (a <= 0) return;
      const cx = i === 0 ? -78 : 78;
      g.save(); g.globalAlpha *= a; g.strokeStyle = ACENTO; g.lineWidth = 8; g.lineCap = "round";
      g.beginPath(); g.moveTo(cx - 22, -60); g.lineTo(cx + 22, -12); g.moveTo(cx + 22, -60); g.lineTo(cx - 22, -12); g.stroke(); g.restore();
    });
    if (ok > 0) {
      g.save(); g.strokeStyle = ACENTO; g.lineWidth = 10; g.lineCap = "round"; g.globalAlpha *= ok;
      const s = ease.outBack(prog(t, E.acierta, E.acierta + .35), 2.4);
      g.translate(-20, 14); g.scale(s, s); g.beginPath(); g.moveTo(-26, 0); g.lineTo(-6, 20); g.lineTo(30, -26); g.stroke(); g.restore();
    }
    // cursor
    if (t >= E.raton - .2) {
      const [x, y] = cursorEn(t), clic = [...E.equis, E.acierta].some((q: number) => t >= q - .03 && t < q + .12);
      g.save(); g.translate(x, y); g.scale(clic ? .86 : 1, clic ? .86 : 1);
      g.fillStyle = TINTA; g.strokeStyle = "#FDFCF8"; g.lineWidth = 3;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 34); g.lineTo(9, 26); g.lineTo(16, 40); g.lineTo(22, 37); g.lineTo(15, 23); g.lineTo(27, 23); g.closePath(); g.fill(); g.stroke();
      g.restore();
    }
  }, { seed: 23 });
}
function raton(c: Ctx, t: number) {
  if (t < E.raton - .7) return;
  const [x, y] = cursorEn(t), a = smooth(prog(t, E.raton - .7, E.raton - .4)) * (1 - pliegue(t));
  parado(c, RATON.x + (x + 80) / 260, RATON.y + (y - 40) / -320, 0, (g) => {
    g.fillStyle = "#FDFCF8"; g.strokeStyle = TINTA; g.lineWidth = 4;
    g.beginPath(); g.ellipse(0, -16, 26, 17, 0, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(0, -33); g.lineTo(0, -18); g.stroke();
  }, { alfa: a });
}
/** El estuche de la cinta métrica. */
function estuche(c: Ctx, t: number) {
  const golpe = golpeDesde(t, E.clack, 7, 5);
  parado(c, 0, ESTUCHE, 0, (g) => {
    g.translate(0, golpe * 8); g.rotate(golpe * .05);
    const R = 72;
    g.fillStyle = "#FDFCF8"; g.strokeStyle = TINTA; g.lineWidth = 7;
    g.beginPath(); g.roundRect(-R - 8, -R * 2 - 6, R * 2 + 16, R * 2 + 6, 26); g.fill(); g.stroke();
    g.lineWidth = 4; g.beginPath(); g.arc(0, -R - 3, R * .62, 0, 7); g.stroke();
    g.beginPath(); g.arc(0, -R - 3, R * .2, 0, 7); g.fillStyle = TINTA; g.fill();
    g.fillStyle = ACENTO; g.beginPath(); g.roundRect(-18, -R * 2 - 22, 36, 18, 5); g.fill();
    g.fillStyle = TINTA; g.fillRect(-52, -14, 104, 10);
  }, { seed: 29 });
}
function alfiler(c: Ctx, t: number, y: number, t0: number, jala: number) {
  if (t < t0 - .35) return;
  const yy = y + jala; if (yy > ESTUCHE - .5) return;
  const a = t - t0, z = a < 0 ? 22 * a * a : 0, bam = a > 0 ? Math.exp(-a * 4) * Math.sin(a * 24) * .1 : 0;
  // la marca en la cinta
  const p = P(-ANCHO / 2, yy, .02), q = P(ANCHO / 2, yy, .02);
  if (p && q && a > 0) { c.strokeStyle = ACENTO; c.lineWidth = clamp(.07 * p.s, 2, 14); c.globalAlpha = niebla(p.zc); c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); c.stroke(); c.globalAlpha = 1; }
  parado(c, 0, yy, z, (g) => {
    g.rotate(bam);
    g.strokeStyle = TINTA; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -64); g.stroke();
    const b = g.createRadialGradient(-7, -76, 2, 0, -68, 24);
    b.addColorStop(0, "#F08A6B"); b.addColorStop(.5, ACENTO); b.addColorStop(1, "#6D1C0E");
    g.fillStyle = b; g.beginPath(); g.arc(0, -70, 22, 0, 7); g.fill();
  });
}

// ---------- humo ----------
// Humo de tinta, no de partículas borrosas: bocanadas de papel con contorno, como en un grabado, y letras punteadas.
type Dat = { humo: [number, number][] };
function preparar(): Dat {
  return { humo: muestreaTexto("humo", serif(300, true), 900, 420, 1100, 3) };
}
function humo(c: Ctx, t: number, d: Dat) {
  if (t < E.humo0 - .2 || t > E.humo0 + 16) return;
  const r = azar(41), src = { x: D0.x, y: D0.y - .9 };
  const nubes: { zc: number; x: number; y: number; r: number; a: number }[] = [];
  for (let i = 0; i < 48; i++) {
    const tb = E.humo0 + r() * (E.humo - E.humo0 + .3), vx = (r() - .5) * .5, vz = .22 + r() * .4, ox = (r() - .5) * 2.4, oy = (r() - .5) * 1.2, ph = r() * 6.3, fin = E.atras + .2 + r() * 2.2;
    const a = t - tb; if (a < 0) continue;
    const x = src.x + ox * smooth(clamp(a / 1.2)) + vx * a + Math.sin(a * .9 + ph) * .15, y = src.y + oy * smooth(clamp(a / 1.2)) + .3, z = .25 + vz * a + .35 * smooth(clamp(a / .8));
    const p = P(x, y, z); if (!p || fuera(p)) continue;
    const crece = ease.outBack(clamp(a / .45), 1.6), encoge = 1 - ease.inCubic(prog(t, fin, fin + 1.1));
    const rad = (.3 + .28 * smooth(clamp(a / 1.6)) + Math.min(a, 4) * .03) * p.s * crece * encoge;
    if (rad < 1) continue;
    nubes.push({ zc: p.zc, x: p.x, y: p.y, r: rad, a: niebla(p.zc) });
  }
  // Una sola silueta: primero todos los círculos en tinta un poco más grandes, luego todos en papel. Queda el contorno de la nube.
  const w = 4;
  c.fillStyle = TINTA;
  for (const n of nubes) { c.globalAlpha = n.a; c.beginPath(); c.arc(n.x, n.y, n.r + w, 0, 7); c.fill(); }
  c.fillStyle = "#E9E5DB";
  for (const n of nubes) { c.globalAlpha = 1; c.beginPath(); c.arc(n.x, n.y, n.r, 0, 7); c.fill(); }
  // unos rizos de grabado por dentro, pocos
  c.strokeStyle = TINTA; c.lineCap = "round";
  nubes.forEach((n, i) => { if (i % 3) return; c.globalAlpha = n.a * .55; c.lineWidth = clamp(n.r * .035, 1.2, 3); c.beginPath(); c.arc(n.x + n.r * .15, n.y + n.r * .2, n.r * .55, 3.6, 5.4); c.stroke(); });
  c.globalAlpha = 1;
  // las letras, arriba de la columna: puntos de tinta, nítidos
  const H = d.humo, N = H.length;
  c.fillStyle = "#3f3b35";
  for (let i = 0; i < N; i++) {
    const tb = E.humo - .95 + (i / N) * .5 + r() * .15, a = t - tb; if (a < 0) continue;
    const [hx, hy] = H[i];
    const k = ease.inOutCubic(clamp(a / .75));
    const drift = Math.max(t - (E.humo + .9), 0);
    const x = lerp(src.x + (r() - .5) * .6, D0.x + .35 + hx / 190, k) + Math.sin(t * 1.3 + i) * .02 * (1 + drift * 2) + (r() - .5) * drift * .35;
    const z = lerp(.9 + r() * .5, 3.55 - hy / 190, k) + drift * (.22 + r() * .25);
    const p = P(x, src.y + .2, z); if (!p || fuera(p)) continue;
    const rad = (.034 + .03 * (1 - k)) * p.s * (1 - smooth(prog(t, E.humo + 1.4, E.humo + 2.8 + r())));
    if (rad < .4) continue;
    c.globalAlpha = smooth(clamp(a / .3)) * niebla(p.zc);
    c.beginPath(); c.arc(p.x, p.y, rad, 0, 7); c.fill();
  }
  c.globalAlpha = 1;
}

// ---------- monedas ----------
function monedas(c: Ctx, t: number, items: { zc: number; f: () => void }[]) {
  const g = E.g;
  E.monedas.forEach((m, i: number) => {
    if (t < m.t) return;
    const pos = { x: D0.x, y: D0.y - F.rs - .05 };
    const a = Math.min(t, m.tl) - m.t;
    let x = pos.x + m.vx * a, y = pos.y + m.vy * a, z = Math.max(.95 + m.vz * a - g / 2 * a * a, 0);
    let plano = false;
    if (t > m.tl) {
      const b = t - m.tl, v = 1.1, d = 2 * v / g;
      if (b < d) z = v * b - g / 2 * b * b; else if (b < d * 1.4) { const b2 = b - d; z = Math.max(.35 * v * b2 - g / 2 * b2 * b2, 0); } else { z = 0; plano = true; }
      x += m.vx * .12 * smooth(clamp(b / .4)); y += m.vy * .12 * smooth(clamp(b / .4));
    }
    z += brinco(t, y);
    const p = P(x, y, z); if (!p) return;
    items.push({
      zc: p.zc, f: () => {
        const al = niebla(p.zc); if (al <= .01) return;
        c.save(); c.globalAlpha = al;
        if (plano && z < .01) {
          aro(c, x, y, .02, .17, 24); c.fillStyle = "#D8D2C2"; c.fill(); c.strokeStyle = TINTA; c.lineWidth = clamp(.025 * p.s, 1, 4); c.stroke();
          textoPlano(c, "$", x, y, .2, TINTA, al);
        } else {
          sombraEn(c, x, y, .2, .25);
          const gi = Math.cos((t - m.t) * 14 + i), r = .17 * p.s;
          c.translate(p.x, p.y - r); c.scale(Math.max(Math.abs(gi), .12), 1);
          c.fillStyle = "#D8D2C2"; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill(); c.stroke();
          if (Math.abs(gi) > .4) texto(c, "$", 0, r * .35, { fuente: serif(r * 1.1), color: TINTA });
        }
        c.restore();
      },
    });
  });
}

// ---------- confeti ----------
function confeti(c: Ctx, t: number) {
  const a0 = t - E.viral; if (a0 < 0 || a0 > 3.2) return;
  const r = azar(61);
  for (let i = 0; i < 130; i++) {
    const ang = r() * TAU2, v = 1.2 + r() * 2.6, vz = 3 + r() * 4.2, ph = r() * 6.3, col = i % 3 === 0 ? ACENTO : i % 3 === 1 ? TINTA : GRIS, del = r() * .12;
    const a = a0 - del; if (a < 0) continue;
    const fr = 1 - Math.exp(-a * 1.6);
    const x = D0.x + Math.cos(ang) * v * fr / 1.6 + Math.sin(a * 5 + ph) * .1, y = D0.y + Math.sin(ang) * v * fr / 1.6, z = 1.0 + vz * fr / 1.6 - 1.4 * a;
    if (z < 0) continue;
    const p = P(x, y, z); if (!p) continue;
    c.save(); c.translate(p.x, p.y); c.rotate(a * 7 + ph); c.scale(1, Math.cos(a * 9 + ph));
    c.globalAlpha = (1 - smooth(prog(a, 2.4, 3.2))) * niebla(p.zc); c.fillStyle = col;
    c.fillRect(-.06 * p.s, -.03 * p.s, .12 * p.s, .06 * p.s); c.restore();
  }
  c.globalAlpha = 1;
}

// ---------- la bola: dónde está y qué hace ----------
const CAMINO: [number, number][] = [[1.8, 6.3], [.9, 4.9], [2.7, 3.2], [1.1, 2.9], [1.7, 4.5], [3.4, 6.0], [3.7, 9.2], [2.4, 12.4], [.9, 10.3], [2.7, 9.3], [1.5, 11.2], [4.8, 8.4], [7.2, 7.4], [10.5, 6.8]];
function enCamino(u: number): [number, number] {
  const n = CAMINO.length - 1, k = clamp(u) * n, i = Math.min(Math.floor(k), n - 1), f = k - i;
  const Q = (j: number) => CAMINO[clamp(j, 0, n)];
  const a = Q(i - 1), b = Q(i), c2 = Q(i + 1), d = Q(i + 2), f2 = f * f, f3 = f2 * f;
  const cr = (j: 0 | 1) => .5 * (2 * b[j] + (c2[j] - a[j]) * f + (2 * a[j] - 5 * b[j] + 4 * c2[j] - d[j]) * f2 + (3 * b[j] - a[j] - 3 * c2[j] + d[j]) * f3);
  return [cr(0), cr(1)];
}
const T_PERD = [E.pierde + .25, E.perdida + .75];        // la bola recorre el camino enredado
function uCamino(t: number) { return ease.inOutSine(prog(t, T_PERD[0], T_PERD[1])) * .82 + .18 * ease.inCubic(prog(t, E.perdida + .45, E.perdida + 1.0)); }

function bolaYMas(c: Ctx, t: number, items: { zc: number; f: () => void }[]) {
  const add = (x: number, y: number, z: number, f: () => void) => { const p = P(x, y, z); if (p) items.push({ zc: p.zc - .05, f }); };
  const corre = (w: number, tropiezo: number): [[number, number], [number, number], number] => {
    const k = Math.sin(t * w);
    if (tropiezo > 0) return [[-1.0, .7 + .5 * tropiezo], [1.05, .75 + .4 * tropiezo], .9];
    return [[-.85 + .25 * k, -.1 + .25 * Math.abs(k)], [.9 - .25 * k, -.05 + .25 * Math.abs(Math.cos(t * w))], .35];
  };
  // 1. cae al disco y se queda parada al frente
  const D = discoPos(t);
  if (t >= E.bola - .5 && t < T_PERD[0]) {
    if (!D) return;
    const rB = radioBola(t);
    const x = D.x, y = D.y - rB;
    let z = D.z + .06 + brinco(t, y);
    const a = t - E.bola;
    if (a < 0) z += 26 * a * a; else z += Math.abs(Math.sin(a * 8)) * .3 * Math.exp(-a * 4);
    let m1: [number, number] = [-.85, -.15], m2: [number, number] = [.9, -.1], ab = .5;
    // enorme: los brazos se salen del cuadro
    const en = seg(t, E.enorme, E.enorme + .35, E.enormeF, E.enormeF + .45);
    if (en > 0) { m1 = [lerp(-.85, -4.6, en), lerp(-.15, 1.1, en)]; m2 = [lerp(.9, 4.6, en), lerp(-.1, 1.2, en)]; ab = lerp(.5, 1, en); }
    // la meta: la mira; se agacha y arranca
    const mira = seg(t, E.meta - .1, E.meta + .2, E.toma, E.toma + .3);
    if (mira > 0) m2 = [lerp(m2[0], .5, mira), lerp(m2[1], 1.0, mira)];
    const agacha = seg(t, E.toma, E.toma + .4, E.aguja - .1, E.aguja + .05);
    z -= agacha * .08;
    if (t >= E.aguja && t < E.pierde + .2) {
      const ul = ultimo(E.saltos, t), tr = t - ul < .38 ? Math.sin(Math.PI * (t - ul) / .38) : 0;
      [m1, m2, ab] = corre(14, tr);
      z += Math.abs(Math.sin(t * 14)) * .06 + tr * .32;
      const fiesta = seg(t, E.viral, E.viral + .2, E.viral + 1.0, E.viral + 1.4);
      if (fiesta > 0 && tr === 0) { m1 = [lerp(m1[0], -1.0, fiesta), lerp(m1[1], 1.1, fiesta)]; m2 = [lerp(m2[0], 1.0, fiesta), lerp(m2[1], 1.15, fiesta)]; }
    }
    if (t >= E.pierde - .1) { const k = prog(t, E.pierde - .1, E.pierde + .2); m1 = [lerp(m1[0], -.8, k), lerp(m1[1], .3, k)]; m2 = [lerp(m2[0], .8, k), lerp(m2[1], .3, k)]; z += Math.sin(Math.PI * k) * .25; }
    const z0 = D.z + .06;
    if (delante(D.x, D.y) < RD + 1.2) return;
    add(x, y, z, () => laBola(c, x, y, z, m1, m2, { abre1: ab, abre2: ab, piso: z0 }));
    return;
  }
  // 2. perdida: un camino enredado y sale del cuadro
  if (t >= T_PERD[0] && t < E.perdida + 1.0) {
    const u = uCamino(t), [x, y] = enCamino(u), z = Math.abs(Math.sin(t * 11)) * .18;
    const pr = smooth(prog(t, E.perdida - .1, E.perdida + .15));
    const k = Math.sin(t * 13);
    add(x, y, z, () => laBola(c, x, y, z, [-.8 + .3 * k, .4], [.85 - .3 * k, .45], { abre1: .9, abre2: .9, pregunta: pr }));
    return;
  }
  // 3. octubre de 2024: cae frente a la computadora
  if (t >= E.llega_bola - .55 && t < E.sube - .55) {
    const a = t - E.llega_bola, z = a < 0 ? 22 * a * a : Math.abs(Math.sin(a * 8)) * .25 * Math.exp(-a * 4);
    const [cx, cy] = cursorEn(t);
    const enRaton = smooth(prog(t, E.raton - .5, E.raton - .1)) * (1 - smooth(prog(t, E.acierta + .3, E.acierta + .6)));
    const mx = RATON.x + (cx + 80) / 260 - SILLA.x, my = .05;
    let m2: [number, number] = [lerp(.95, mx, enRaton), lerp(-.1, my, enRaton)], m1: [number, number] = [-.85, -.12];
    const yay = seg(t, E.acierta, E.acierta + .2, E.acierta + .9, E.acierta + 1.2);
    if (yay > 0) { m1 = [lerp(m1[0], -1.0, yay), lerp(m1[1], 1.2, yay)]; m2 = [lerp(m2[0], 1.0, yay), lerp(m2[1], 1.2, yay)]; }
    const sorpresa = smooth(prog(t, E.giro + 1.5, E.vuela));
    if (sorpresa > 0) { m1 = [lerp(m1[0], -.6, sorpresa), lerp(m1[1], .7, sorpresa)]; }
    void cy;
    add(SILLA.x, SILLA.y, z, () => laBola(c, SILLA.x, SILLA.y, z, m1, m2, { abre2: enRaton > .5 ? .2 : .6 }));
    // la mirada: de la bola a la pantalla
    const mir = seg(t, E.viendo, E.viendo + .3, E.lento - .3, E.lento);
    if (mir > 0) {
      const a2 = P(SILLA.x + .3, SILLA.y, .55), b2 = P(PANT.x - .3, PANT.y, 1.4);
      if (a2 && b2) items.push({ zc: -1, f: () => { c.save(); c.globalAlpha = mir; c.strokeStyle = ACENTO; c.lineWidth = 5; c.setLineDash([3, 16]); c.lineCap = "round"; c.lineDashOffset = -t * 90; c.beginPath(); c.moveTo(a2.x, a2.y); c.lineTo(b2.x, b2.y); c.stroke(); c.restore(); } });
    }
    return;
  }
  // 4. salta al disco que llegó y esta vez llega al centro
  if (t >= E.sube - .55 && D) {
    const u = prog(t, E.sube - .55, E.sube);
    const rB = radioBola(t), xd = D.x, yd = D.y - rB;
    const x = lerp(SILLA.x, xd, ease.inOutSine(u)), y = lerp(SILLA.y, yd, u);
    let z = lerp(0, D.z + .06, u) + Math.sin(Math.PI * u) * 1.3;
    let m1: [number, number] = [-.9, .5], m2: [number, number] = [.95, .55], ab = .7;
    if (t >= E.toca) {
      const ub = ultimo(E.baches, t), hop = t - ub < .4 ? Math.sin(Math.PI * (t - ub) / .4) : 0;
      [m1, m2, ab] = corre(15, 0);
      z += Math.abs(Math.sin(t * 15)) * .06 + hop * .45;
      const gana = smooth(prog(t, E.termina, E.termina + .3));
      if (gana > 0) { const w = Math.sin(t * 7) * .15; m1 = [lerp(m1[0], -1.0, gana), lerp(m1[1], 1.25 + w, gana)]; m2 = [lerp(m2[0], 1.0, gana), lerp(m2[1], 1.25 - w, gana)]; ab = lerp(ab, 1, gana); z -= Math.abs(Math.sin(t * 15)) * .06 * gana; z += Math.abs(Math.sin((t - E.termina) * 6)) * .12 * gana * Math.exp(-(t - E.termina) * .8); }
    }
    add(x, y, z, () => laBola(c, x, y, z, m1, m2, { abre1: ab, abre2: ab, piso: u >= 1 ? D.z + .06 : 0 }));
  }
}

// ---------- el cuadro ----------
function dibuja(c: Ctx, t: number, d: Dat) {
  TT = t;
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  // respiración y golpes de cámara
  const sh = temblor(t);
  const z = 1.03 + .014 * vaiven(t, 7.3) ;
  c.save();
  c.translate(540 + 10 * vaiven(t, 8.8) + sh * Math.sin(t * 83), 960 + 12 * vaiven(t, 10.3, 1) + sh * Math.cos(t * 71));
  c.rotate(.005 * vaiven(t, 13.4) + sh * .0009 * Math.sin(t * 57)); c.scale(z, z); c.translate(-540, -960);
  const v = guionCamara(t, CLAVES);
  const vv = { ...v, yaw: v.yaw + .018 * vaiven(t, 9.1), pitch: v.pitch + .01 * vaiven(t, 6.7, 2) };
  CAM = camara(vv, 540, 1150 - 170 * smooth(clamp((v.pitch - .8) / .4)) - 170 * seg(t, E.giro - .2, E.giro + .8, E.vuela + .2, E.vuela + 1.0), 1250);
  const lejos = 1 + 1.8 * seg(t, E.giro - .2, E.giro + .6, E.aterriza, E.aterriza + .6) + 1.2 * (1 - smooth(prog(t, .2, .7)));
  NIEBLA = [v.dist * 1.2 * lejos, v.dist * 2.1 * lejos];
  escena(c, t, d);
  c.restore();
  capa(c, t);
}

function escena(c: Ctx, t: number, d: Dat) {
  mesa(c, t);
  const jala = t < E.enrolla ? 0 : (ESTUCHE - CINTA0 + .3) * ease.inCubic(prog(t, E.enrolla, E.clack));
  cinta(c, t, jala);
  cartelAcostado(c, t);
  computadoraAcostada(c, t);
  // el camino de la bola perdida, dibujado sobre la mesa
  if (t >= T_PERD[0] && t < E.cartel) {
    const u = uCamino(t), al = 1 - smooth(prog(t, tEnM24 - .2, tEnM24 + .4));
    c.save(); c.globalAlpha = al * .9; c.strokeStyle = ACENTO; c.lineWidth = 9; c.setLineDash([2, 15]); c.lineCap = "round"; c.beginPath();
    for (let i = 0; i <= 260; i++) { const w = i / 260 * u, [x, y] = enCamino(w), p = P(x, y, .02); if (p) { if (i === 0) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y); } }
    c.stroke(); c.restore();
  }
  // anillos de "todas las piezas"
  E.ping.forEach((tp: number, i: number) => {
    const a = t - tp; if (a < 0 || a > 1.2) return;
    const P0 = [ENG, D0, BOT][i];
    c.save(); c.globalAlpha = (1 - a / 1.2) * .9; c.strokeStyle = ACENTO; c.lineWidth = 5; aro(c, P0.x, P0.y, .02, 1.5 + a * 1.6, 64); c.stroke(); c.restore();
  });

  const items: { zc: number; f: () => void }[] = [];
  const add = (x: number, y: number, z: number, f: () => void, dz = 0) => { const p = P(x, y, z); if (p) items.push({ zc: p.zc + dz, f }); };
  // banderas
  ([[Y.mar23, E.clava, "marzo", "2023", -1], [Y.oct22, E.oct22, "octubre", "2022", -1], [Y.jun23, E.jun23, "junio", "2023", -1], [Y.mar24, E.mar24, "marzo", "2024", E.cartel - .02], [Y.oct24, E.oct24, "octubre", "2024", -1]] as [number, number, string, string, number][])
    .forEach(([y, t0, a, b, cae]) => add(.48, y, 0, () => bandera(c, t, y, t0, a, b, cae)));
  // el disco y su tarjeta
  const D = discoPos(t);
  if (D) {
    const surco = t >= E.saltos[0] && t < E.pierde + 4 ? .35 + .5 * smooth(prog(t, E.saltos[0], E.saltos[0] + 3)) : t >= E.toca && t < E.termina + .4 ? .6 : 0;
    const rB = t >= E.sube ? radioBola(t) : F.rs + .02;
    const fin = seg(t, E.toca, E.toca + .2, E.termina, E.termina + .4);
    const Dz = { ...D, z: D.z + brinco(t, D.y) };
    add(D.x, D.y, Dz.z, () => disco(c, t, Dz, { surco, rB, fin }), .4);
    const pal = smooth(prog(t, E.termina - .02, E.termina + .3));
    add(D.x, D.y, Dz.z + .5, () => tarjeta(c, t, Dz, pal), .2);
  }
  add(CONT.x, CONT.y, 0, () => contador(c, t));
  monedas(c, t, items);
  add(ENG.x, ENG.y + .4, 0, () => react(c, t), .3);
  add(BOT.x, BOT.y, 0, () => boton(c, t));
  add(CART.x, CART.y, 0, () => cartel(c, t), .5);
  add(PANT.x, PANT.y, 0, () => computadora(c, t), .3);
  add(RATON.x, RATON.y, 0, () => raton(c, t));
  bolaYMas(c, t, items);
  add(0, ESTUCHE, 0, () => estuche(c, t), .2);
  add(0, MARCA_A + jala, 0, () => alfiler(c, t, MARCA_A, E.marcas + .1, jala));
  add(0, MARCA_B + jala, 0, () => alfiler(c, t, MARCA_B, E.igual - .25, jala));
  items.sort((a, b) => b.zc - a.zc);
  for (const it of items) { c.save(); it.f(); c.restore(); }
  confeti(c, t);
  humo(c, t, d);
  // las dos marcas: idénticas, y cada una con su nombre
  if (t >= E.adelantarse - .1 && t < E.clack + .4) {
    const pA = P(0, MARCA_A, .5), pB = P(0, MARCA_B, .5);
    if (pA && pB) {
      const x = 670, sale = E.enrolla;
      rotulo(c, t, E.adelantarse, sale, "adelantarse", pA.y + 6, 106, TINTA, true, x);
      rotulo(c, t, s_("dos años") - .02, sale, "dos años", pA.y + 100, 86, GRIS, true, x);
      const aI = smooth(prog(t, E.igual - .05, E.igual + .15)) * (1 - smooth(prog(t, sale, sale + .22)));
      if (aI > 0) texto(c, "=", x, (pA.y + pB.y) / 2 + 66, { fuente: serif(170), color: ACENTO, alfa: aI });
      rotulo(c, t, E.equivocarse, sale, "equivocarse", pB.y + 46, 106, TINTA, true, x);
    }
  }
}

/** Lo que vive en la pantalla y no en la mesa: rótulos y etiquetas. */
function capa(c: Ctx, t: number) {
  motas(c, t);
  rotulo(c, t, E.nombre, E.dando - .3, "AutoGPT", 330, 160, TINTA, true);
  rotulo(c, t, s_("openai") - .05, E.piezas - .3, "OpenAI", 250, 92, GRIS);
  rotulo(c, t, s_("llamadas") - .05, E.piezas - .3, "llamadas a funciones", 372, 100, TINTA, true);
  rotulo(c, t, s_("anthropic") - .05, E.lento - .2, "Anthropic", 250, 92, GRIS);
  rotulo(c, t, s_("computadora") - .05, E.lento - .2, "uso de computadora", 372, 104, TINTA, true);
  rotulo(c, t, E.lento, E.torpe - .1, "lento", 330, 150, TINTA, true);
  rotulo(c, t, E.torpe, E.errores - .1, "torpe", 330, 150, TINTA, true);
  rotulo(c, t, E.errores, E.aun - .1, "lleno de errores", 330, 120, TINTA, true);
  rotulo(c, t, s_("impresionante") - .05, E.giro - .1, "impresionante", 330, 136, ACENTO, true);
  rotulo(c, t, s_("autogpt no falló") - .05, E.vuela - .1, "AutoGPT", 330, 150, TINTA, true);
}
function motas(c: Ctx, t: number) {
  const r = azar(9);
  c.fillStyle = TINTA;
  for (let i = 0; i < 60; i++) {
    const x0 = r() * 1200 - 60, y0 = r() * 2060, v = 14 + r() * 40, f = r() * 6.3, z = 1.6 + r() * 3.2;
    const y = ((y0 - t * v) % 2060 + 2060) % 2060 - 70, x = x0 + Math.sin(t * .55 + f) * 30;
    c.globalAlpha = .07 + r() * .14; c.fillRect(x, y, z, z);
  }
  c.globalAlpha = 1;
}

export const Pieza: React.FC = () => <Lienzo dibuja={dibuja} preparar={preparar} />;
