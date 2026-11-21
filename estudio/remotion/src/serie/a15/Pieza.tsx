// Serie 2, capítulo 15: los planos. Todo pasa en una pared de cartón perforado donde se clavan circuitos de canicas
// de papel y madera. Abre con la bola con manos poniendo su riel pieza por pieza delante de sí misma, a toda prisa
// (un agente); un lápiz traza una rampa recta, la bola guarda las manos y baja sola al vaso: lo más simple que funciona.
// Luego dos franjas: en la de arriba tú dibujas el riel y la bola lo recorre (flujo); en la de abajo la bola decide y
// pone su propio camino, cada pieza cuesta una moneda y en el enredo queda escondida la pieza rota. Caen cinco módulos
// de juguete que forman una torre, y la cámara la baja tramo por tramo: encadenar, enrutar, paralelizar, orquestador y
// evaluador, cada uno con su riel y el encargo de la fiesta. Se aleja: la torre y otras dos hechas con las mismas
// piezas. Se apagan todas menos dos. Al final la bola, con una pila de rieles, frente a dos caminos: deja la pila,
// guarda las manos y rueda por el riel trazado hasta el vaso.
// Todos los instantes vienen de eventos.json, que escribe partitura.py: dibujo y sonido son los mismos números.
import React from "react";
import { azar, clamp, ease, lerp, prog, smooth, texto } from "../../kit";
import { ACENTO, bola, cue, GRIS, Lienzo, mono, PAPEL, rotulo, serif, TINTA } from "../../marca";
import { brazo } from "../../personaje";
import palabras from "./palabras.json";
import duracion from "./duracion.json";
import ev from "./eventos.json";

export const DURACION = duracion.dur;
const T = cue(palabras);
const s = (f: string, d = 0) => T(f, d).s;

type C = CanvasRenderingContext2D;
type V = [number, number];
type Pt = { x: number; y: number; a: number };

// ---------- utilidades ----------
let FR = 0;
const frac = (x: number) => x - Math.floor(x);
const tiembla = (j: number) => frac(Math.sin(j * 12.9898 + FR * 78.233) * 43758.5453) - .5;
const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * 6.2832 + f);
const ventana = (t: number, a: number, b: number, fi = .25, fo = .3) => smooth(prog(t, a, a + fi)) * (1 - smooth(prog(t, b, b + fo)));
const rueda = (x: number) => .4 * x + .6 * x * x;                 // una canica que baja acelera
const brinco = (t: number, a: number, h: number, k = 7, w = 18) => (t > a ? h * Math.exp(-(t - a) * k) * Math.abs(Math.sin((t - a) * w)) : 0);

const BLANCO = "#FBFAF6", HUECO = "#DCD7CB", TABLA = "#EEEADF", MADERA = "#CFAB78", VETA = "rgba(105,72,36,.32)";
const GRAFITO = "#3b3a37", ROJO2 = "#E9896C", ORO = "#E6D29C";
const G = 22, RC = 40;
const BX = 1700, TX = 6000, MESA = 1700, MH = 1250, DXc = 10140;

// ---------- rutas ----------
type Ruta = { p: V[]; L: number[]; tot: number };
function ruta(p: V[]): Ruta {
  const L = [0];
  for (let i = 1; i < p.length; i++) L.push(L[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  return { p, L, tot: L[L.length - 1] };
}
function suave(p: V[], n = 8): V[] {
  const out: V[] = [];
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[Math.max(i - 1, 0)], p1 = p[i], p2 = p[i + 1], p3 = p[Math.min(i + 2, p.length - 1)];
    for (let k = 0; k < n; k++) {
      const u = k / n, u2 = u * u, u3 = u2 * u;
      const f = (a: number, b: number, c2: number, d: number) => .5 * (2 * b + (-a + c2) * u + (2 * a - 5 * b + 4 * c2 - d) * u2 + (-a + 3 * b - 3 * c2 + d) * u3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(p[p.length - 1]);
  return out;
}
function en(r: Ruta, u: number): Pt {
  const d = clamp(u) * r.tot;
  let i = 1;
  while (i < r.p.length - 1 && r.L[i] < d) i++;
  const a = r.p[i - 1], b = r.p[i], k = (d - r.L[i - 1]) / Math.max(r.L[i] - r.L[i - 1], 1e-6);
  return { x: lerp(a[0], b[0], k), y: lerp(a[1], b[1], k), a: Math.atan2(b[1] - a[1], b[0] - a[0]) };
}
/** Centro de una canica de radio R apoyada encima del riel. */
function sobre(r: Ruta, u: number, R: number, g = G): Pt {
  const q = en(r, u);
  let nx = Math.sin(q.a), ny = -Math.cos(q.a);
  if (ny > 0) { nx = -nx; ny = -ny; }
  return { x: q.x + nx * (g / 2 + R), y: q.y + ny * (g / 2 + R), a: q.a };
}
const ps = (r: Ruta, u: number, R = RC, g = G): V => { const q = sobre(r, u, R, g); return [q.x, q.y]; };

type Pierna = { a: number; b: number; r?: Ruta; f?: (x: number) => number; de?: V; a2?: V; fijo?: V; oculta?: boolean; arco?: number; R?: number };
/** Dónde está una canica: la última pierna que ya empezó manda. */
function trayecto(t: number, P: Pierna[], R = RC): V | null {
  let i = -1;
  for (let k = 0; k < P.length; k++) if (P[k].a <= t) i = k;
  if (i < 0) return null;
  const p = P[i], k = prog(t, p.a, p.b);
  if (p.oculta) return null;
  if (p.r) return ps(p.r, (p.f ?? rueda)(k), p.R ?? R);
  if (p.fijo) return p.fijo;
  if (p.de && p.a2) {
    const ar = p.arco ?? 0;
    return [lerp(p.de[0], p.a2[0], k), ar ? lerp(p.de[1], p.a2[1], k) - ar * Math.sin(Math.PI * k) : lerp(p.de[1], p.a2[1], k * k)];
  }
  return null;
}

// ---------- piezas de dibujo ----------
function camino(c: C, pts: V[], j0 = 0) {
  c.beginPath();
  pts.forEach((p, i) => { const x = p[0] + tiembla(j0 + i * 1.7) * 1.3, y = p[1] + tiembla(j0 + i * 2.3 + 9) * 1.3; if (i) c.lineTo(x, y); else c.moveTo(x, y); });
}
function tramoRuta(r: Ruta, de: number, a: number): V[] {
  const d0 = clamp(de) * r.tot, d1 = clamp(a) * r.tot, out: V[] = [];
  const q0 = en(r, de); out.push([q0.x, q0.y]);
  for (let i = 1; i < r.p.length - 1; i++) if (r.L[i] > d0 && r.L[i] < d1) out.push(r.p[i]);
  const q1 = en(r, a); out.push([q1.x, q1.y]);
  return out;
}
function clavo(c: C, x: number, y: number, s = 1) {
  c.fillStyle = MADERA; c.strokeStyle = TINTA; c.lineWidth = 2.5 * s;
  c.beginPath(); c.arc(x, y, 9 * s, 0, 7); c.fill(); c.stroke();
  c.fillStyle = "rgba(255,255,255,.5)"; c.beginPath(); c.arc(x - 3 * s, y - 3 * s, 3 * s, 0, 7); c.fill();
}
/** Riel de papel visto de frente: banda blanca con borde de tinta, sombra sobre la pared y clavijas de madera.
 *  lapiz < 1 lo deja como trazo de grafito (recién dibujado). */
function riel(c: C, r: Ruta, o: { de?: number; a?: number; g?: number; lapiz?: number; clavos?: boolean; tinta?: string; relleno?: string; alfa?: number } = {}) {
  const de = o.de ?? 0, a = o.a ?? 1, g = o.g ?? G, lp = o.lapiz ?? 1;
  if (a <= de + .001) return;
  const pts = tramoRuta(r, de, a), j0 = r.p[0][0] * .013 + r.p[0][1] * .007;
  c.save(); c.globalAlpha *= o.alfa ?? 1; c.lineJoin = "round"; c.lineCap = "round";
  if (lp < 1) {
    c.strokeStyle = GRAFITO; c.lineWidth = 4.5; c.globalAlpha *= 1 - smooth(prog(lp, .5, 1));
    camino(c, pts, j0); c.stroke(); c.globalAlpha /= Math.max(1 - smooth(prog(lp, .5, 1)), 1e-3);
  }
  if (lp > 0) {
    const w = lerp(4, g, ease.outBack(clamp(lp), 1.6));
    c.save(); c.translate(6, 10); c.strokeStyle = "rgba(30,24,16,.13)"; c.lineWidth = w + 7; camino(c, pts, j0); c.stroke(); c.restore();
    c.strokeStyle = o.tinta ?? TINTA; c.lineWidth = w + 5; camino(c, pts, j0); c.stroke();
    c.strokeStyle = o.relleno ?? BLANCO; c.lineWidth = Math.max(w - 1.5, 1); camino(c, pts, j0); c.stroke();
    if (w > 10) { c.save(); c.translate(0, -w * .22); c.strokeStyle = "rgba(160,150,132,.45)"; c.lineWidth = 2.5; camino(c, pts, j0); c.stroke(); c.restore(); }
    if (o.clavos !== false && lp > .6) {
      const L = (a - de) * r.tot, n = Math.max(1, Math.round(L / 260));
      for (let i = 0; i <= n; i++) { const q = en(r, lerp(de, a, i / n)); clavo(c, q.x, q.y + w / 2 + 7, Math.min(1, w / G)); }
    }
  }
  c.restore();
}
function canica(c: C, x: number, y: number, R: number, tipo = "v", giro = 0, alfa = 1) {
  if (alfa <= .01) return;
  c.save(); c.globalAlpha *= alfa;
  const sg = c.createRadialGradient(x + R * .35, y + R * .5, R * .2, x + R * .35, y + R * .5, R * 1.35);
  sg.addColorStop(0, "rgba(30,24,16,.22)"); sg.addColorStop(1, "rgba(30,24,16,0)");
  c.fillStyle = sg; c.beginPath(); c.arc(x + R * .35, y + R * .5, R * 1.35, 0, 7); c.fill();
  if (tipo === "r") bola(c, x, y, R, ACENTO);
  else if (tipo === "k") bola(c, x, y, R);
  else {
    const g = c.createRadialGradient(x - R * .35, y - R * .4, R * .05, x, y, R);
    if (tipo === "m") { g.addColorStop(0, "#EBD3A8"); g.addColorStop(.55, "#C79B62"); g.addColorStop(1, "#8A6338"); }
    else { g.addColorStop(0, "#FFFFFF"); g.addColorStop(.35, "#E6EBE9"); g.addColorStop(.85, "#B5C0BD"); g.addColorStop(1, "#8D9996"); }
    c.fillStyle = g; c.beginPath(); c.arc(x, y, R, 0, 7); c.fill();
    c.save(); c.beginPath(); c.arc(x, y, R * .96, 0, 7); c.clip(); c.translate(x, y); c.rotate(giro);
    if (tipo === "m") { c.strokeStyle = "rgba(95,62,28,.45)"; c.lineWidth = Math.max(1.5, R * .06); for (let k = -2; k <= 2; k++) { c.beginPath(); c.ellipse(0, k * R * .34, R * 1.1, R * .22, 0, 0, 7); c.stroke(); } }
    else { c.fillStyle = "rgba(25,25,24,.82)"; c.beginPath(); c.moveTo(-R * .9, R * .15); c.quadraticCurveTo(0, -R * .55, R * .9, -R * .15); c.quadraticCurveTo(0, R * .2, -R * .9, R * .15); c.fill();
      c.fillStyle = "rgba(192,68,42,.75)"; c.beginPath(); c.moveTo(-R * .7, R * .1); c.quadraticCurveTo(0, -R * .3, R * .7, -R * .1); c.quadraticCurveTo(0, R * .05, -R * .7, R * .1); c.fill(); }
    c.restore();
    c.strokeStyle = TINTA; c.lineWidth = Math.max(2, R * .075); c.beginPath(); c.arc(x, y, R, 0, 7); c.stroke();
  }
  c.fillStyle = "rgba(255,255,255,.85)"; c.beginPath(); c.ellipse(x - R * .36, y - R * .42, R * .2, R * .13, -.6, 0, 7); c.fill();
  c.restore();
}
/** Bolita de papel arrugado: el borrador. rug 0 = redonda. */
function bolita(c: C, x: number, y: number, R: number, rug: number, alfa = 1) {
  if (alfa <= .01) return;
  const r = azar(23);
  c.save(); c.globalAlpha *= alfa; c.beginPath();
  for (let i = 0; i < 15; i++) { const a = i / 15 * 6.2832, k = 1 + rug * (r() - .5) * .5; const px = x + Math.cos(a) * R * k, py = y + Math.sin(a) * R * k; if (i) c.lineTo(px, py); else c.moveTo(px, py); }
  c.closePath(); c.fillStyle = BLANCO; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 3; c.lineJoin = "round"; c.stroke();
  c.strokeStyle = "rgba(17,17,17,.5)"; c.lineWidth = 2;
  for (let i = 0; i < 4; i++) { const a = r() * 6.28, l = R * (.3 + r() * .5); c.beginPath(); c.moveTo(x + Math.cos(a) * R * .2, y + Math.sin(a) * R * .2); c.lineTo(x + Math.cos(a + .6) * l, y + Math.sin(a + .6) * l); c.stroke(); }
  c.restore();
}
function poli(c: C, P: V[], fill: string, g = 4, tinta = TINTA) {
  c.beginPath(); P.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath();
  c.fillStyle = fill; c.fill(); c.strokeStyle = tinta; c.lineWidth = g; c.lineJoin = "round"; c.stroke();
}
/** Caja de cartón vista de frente, con tapa y costado. sac = cuánto tiembla mientras trabaja. */
function caja(c: C, x: number, y: number, w: number, h: number, t: number, sac = 0, D = 30, DY = 24) {
  const dx = sac * 4 * Math.sin(t * 61), dy = sac * 3 * Math.sin(t * 47 + 1);
  c.save(); c.translate(dx, dy);
  c.fillStyle = "rgba(30,24,16,.12)"; c.fillRect(x + 12, y + 14, w + D, h);
  poli(c, [[x + w, y], [x + w + D, y - DY], [x + w + D, y + h - DY], [x + w, y + h]], "#DAD3C4");
  poli(c, [[x, y], [x + D, y - DY], [x + w + D, y - DY], [x + w, y]], "#EFEBE2");
  c.fillStyle = BLANCO; c.fillRect(x, y, w, h); c.strokeStyle = TINTA; c.lineWidth = 5; c.strokeRect(x, y, w, h);
  c.restore();
}
function hoyo(c: C, x: number, y: number, w: number, h = w * .3) {
  c.fillStyle = "#26231F"; c.beginPath(); c.ellipse(x, y, w / 2, h / 2, 0, 0, 7); c.fill();
}
function embudo(c: C, x: number, y: number, w = 120) {
  poli(c, [[x - w / 2, y], [x + w / 2, y], [x + w * .17, y + 56], [x + w * .17, y + 82], [x - w * .17, y + 82], [x - w * .17, y + 56]], BLANCO, 4);
  hoyo(c, x, y, w - 10, 16);
}
/** Vaso de papel: primero el fondo (antes de la canica) y luego el cuerpo (encima). */
function vasoFondo(c: C, x: number, y: number, w: number) { hoyo(c, x, y, w, w * .2); }
function vasoCuerpo(c: C, x: number, y: number, w: number, h: number) {
  c.fillStyle = "rgba(30,24,16,.13)"; c.beginPath(); c.moveTo(x - w / 2 + 12, y + 12); c.lineTo(x + w / 2 + 12, y + 12); c.lineTo(x + w * .38 + 12, y + h + 12); c.lineTo(x - w * .38 + 12, y + h + 12); c.fill();
  poli(c, [[x - w / 2, y], [x + w / 2, y], [x + w * .38, y + h], [x - w * .38, y + h]], BLANCO, 5);
  c.strokeStyle = "rgba(17,17,17,.35)"; c.lineWidth = 3; c.beginPath(); c.moveTo(x - w * .44, y + h * .28); c.lineTo(x + w * .44, y + h * .28); c.stroke();
  c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.ellipse(x, y, w / 2, w * .1, 0, 0, Math.PI); c.stroke();
}
function lupa(c: C, x: number, y: number, r = 56, a = 1) {
  if (a <= .01) return;
  c.save(); c.globalAlpha *= a; c.translate(x, y);
  c.fillStyle = "rgba(220,232,232,.35)"; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
  c.strokeStyle = TINTA; c.lineWidth = r * .2; c.lineCap = "round"; c.beginPath(); c.arc(0, 0, r, 0, 7); c.stroke();
  c.beginPath(); c.moveTo(r * .72, r * .72); c.lineTo(r * 1.5, r * 1.5); c.stroke();
  c.strokeStyle = "rgba(255,255,255,.8)"; c.lineWidth = r * .08; c.beginPath(); c.arc(0, 0, r * .7, 3.6, 4.4); c.stroke();
  c.restore();
}
/** Lápiz con la punta en (x, y). */
function lapiz(c: C, x: number, y: number, rot = -.5, s = 1) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  c.fillStyle = "rgba(30,24,16,.16)"; c.fillRect(-4, -440, 40, 400);
  c.lineWidth = 3; c.strokeStyle = TINTA; c.lineJoin = "round";
  c.fillStyle = "#E8CFA2"; c.beginPath(); c.moveTo(0, 0); c.lineTo(-16, -62); c.lineTo(16, -62); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = TINTA; c.beginPath(); c.moveTo(0, 0); c.lineTo(-6, -22); c.lineTo(6, -22); c.closePath(); c.fill();
  c.fillStyle = "#2E2E2C"; c.fillRect(-16, -392, 32, 330); c.strokeRect(-16, -392, 32, 330);
  c.strokeStyle = "rgba(255,255,255,.18)"; c.beginPath(); c.moveTo(-5, -70); c.lineTo(-5, -385); c.stroke();
  c.strokeStyle = TINTA; c.fillStyle = "#B4B0A6"; c.fillRect(-16, -420, 32, 28); c.strokeRect(-16, -420, 32, 28);
  c.fillStyle = ROJO2; c.fillRect(-16, -452, 32, 32); c.strokeRect(-16, -452, 32, 32);
  c.restore();
}
function palomita(c: C, x: number, y: number, k: number, color = ACENTO, s = 1) {
  if (k <= 0) return;
  const P: V[] = [[x - 60 * s, y - 4 * s], [x - 16 * s, y + 44 * s], [x + 80 * s, y - 76 * s]];
  const L0 = Math.hypot(44, 48) * s, L1 = Math.hypot(96, 120) * s, h = clamp(k) * (L0 + L1);
  c.save(); c.strokeStyle = color; c.lineWidth = 14 * s; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath(); c.moveTo(P[0][0], P[0][1]);
  if (h <= L0) c.lineTo(lerp(P[0][0], P[1][0], h / L0), lerp(P[0][1], P[1][1], h / L0));
  else { c.lineTo(P[1][0], P[1][1]); c.lineTo(lerp(P[1][0], P[2][0], (h - L0) / L1), lerp(P[1][1], P[2][1], (h - L0) / L1)); }
  c.stroke(); c.restore();
}
function tache(c: C, x: number, y: number, k: number, s = 1, color = TINTA) {
  if (k <= 0) return;
  c.save(); c.strokeStyle = color; c.lineWidth = 15 * s; c.lineCap = "round";
  const a = clamp(k * 2), b = clamp(k * 2 - 1), r = 52 * s;
  c.beginPath(); c.moveTo(x - r, y - r); c.lineTo(lerp(x - r, x + r, a), lerp(y - r, y + r, a)); c.stroke();
  if (b > 0) { c.beginPath(); c.moveTo(x + r, y - r); c.lineTo(lerp(x + r, x - r, b), lerp(y - r, y + r, b)); c.stroke(); }
  c.restore();
}
function sobreCarta(c: C, x: number, y: number, s: number, g = 0, a = 1) {
  if (a <= .01) return;
  c.save(); c.translate(x, y); c.rotate(g); c.scale(s, s); c.globalAlpha *= a;
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 5; c.lineJoin = "round";
  c.beginPath(); c.rect(-50, -33, 100, 66); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-50, -33); c.lineTo(0, 8); c.lineTo(50, -33); c.stroke();
  c.fillStyle = ACENTO; c.beginPath(); c.arc(0, 8, 7, 0, 7); c.fill();
  c.restore();
}
function hojaLista(c: C, x: number, y: number, s: number, a = 1) {
  if (a <= .01) return;
  c.save(); c.translate(x, y); c.scale(s, s); c.globalAlpha *= a;
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.rect(-34, -44, 68, 88); c.fill(); c.stroke();
  c.lineWidth = 4; for (let i = 0; i < 4; i++) { c.strokeRect(-24, -30 + i * 19, 9, 9); c.beginPath(); c.moveTo(-8, -26 + i * 19); c.lineTo(22 - (i % 2) * 10, -26 + i * 19); c.stroke(); }
  c.restore();
}
function casa(c: C, x: number, y: number, s: number, t: number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  poli(c, [[-46, -6], [0, -46], [46, -6], [46, 42], [-46, 42]], BLANCO, 5);
  poli(c, [[-12, 42], [-12, 12], [12, 12], [12, 42]], "#D9D2C2", 4);
  c.fillStyle = TINTA; c.fillRect(22, -40, 12, 22);
  for (let k = 0; k < 3; k++) { const f = frac(t * .9 + k / 3); c.globalAlpha = (1 - f) * .55; c.fillStyle = GRIS; c.beginPath(); c.arc(28 + Math.sin(f * 6 + k) * 6, -50 - f * 60, 7 + f * 9, 0, 7); c.fill(); }
  c.restore();
}
function pastel(c: C, x: number, y: number, s: number, t: number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  poli(c, [[-50, 10], [50, 10], [50, 44], [-50, 44]], BLANCO, 5);
  poli(c, [[-34, -18], [34, -18], [34, 10], [-34, 10]], "#F3E7E2", 5);
  c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); for (let i = 0; i <= 8; i++) { const px = -50 + i * 12.5; if (i) c.quadraticCurveTo(px - 6, 24, px, 16); else c.moveTo(px, 16); } c.stroke();
  c.fillStyle = TINTA; c.fillRect(-3, -42, 6, 24);
  const fl = 1 + .25 * Math.sin(t * 23) + .15 * Math.sin(t * 37);
  c.fillStyle = ACENTO; c.beginPath(); c.ellipse(0, -52, 7, 12 * fl, 0, 0, 7); c.fill();
  c.restore();
}
function nota(c: C, x: number, y: number, s: number, t: number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const b = Math.abs(Math.sin(t * 6)) * 10;
  c.fillStyle = TINTA; c.strokeStyle = TINTA; c.lineWidth = 6;
  c.beginPath(); c.ellipse(-22, 28 - b, 15, 11, -.4, 0, 7); c.fill(); c.beginPath(); c.ellipse(26, 18 - b * .6, 15, 11, -.4, 0, 7); c.fill();
  c.beginPath(); c.moveTo(-9, 26 - b); c.lineTo(-9, -36 - b); c.lineTo(39, -46 - b * .6); c.lineTo(39, 16 - b * .6); c.stroke();
  c.lineWidth = 9; c.beginPath(); c.moveTo(-9, -32 - b); c.lineTo(39, -42 - b * .6); c.stroke();
  c.restore();
}
function moneda(c: C, x: number, y: number, s = 1, g = 0) {
  c.save(); c.translate(x, y); c.scale(s * Math.max(.25, Math.abs(Math.cos(g))), s);
  c.fillStyle = ORO; c.strokeStyle = TINTA; c.lineWidth = 3.5; c.beginPath(); c.arc(0, 0, 26, 0, 7); c.fill(); c.stroke();
  c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 19, 0, 7); c.stroke();
  texto(c, "$", 0, 11, { fuente: serif(32), color: TINTA });
  c.restore();
}
function pieza(c: C, x: number, y: number, ang: number, s = 1, L = 80) {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s);
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.roundRect(-L / 2, -11, L, 22, 8); c.fill(); c.stroke();
  c.strokeStyle = "rgba(160,150,132,.6)"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-L / 2 + 8, -4); c.lineTo(L / 2 - 8, -4); c.stroke();
  c.restore();
}
function repisa(c: C, x0: number, x1: number, y: number) {
  c.fillStyle = "rgba(30,24,16,.13)"; c.fillRect(x0 + 10, y + 12, x1 - x0, 22);
  c.fillStyle = MADERA; c.strokeStyle = TINTA; c.lineWidth = 4; c.fillRect(x0, y, x1 - x0, 22); c.strokeRect(x0, y, x1 - x0, 22);
  c.strokeStyle = VETA; c.lineWidth = 2; c.beginPath(); c.moveTo(x0 + 12, y + 9); c.lineTo(x1 - 30, y + 8); c.stroke();
  clavo(c, x0 + 26, y + 34, .8); clavo(c, x1 - 26, y + 34, .8);
}
function maderaRect(c: C, x: number, y: number, w: number, h: number, vetas = true) {
  c.fillStyle = MADERA; c.fillRect(x, y, w, h);
  if (vetas) { c.strokeStyle = VETA; c.lineWidth = 2; const n = Math.max(1, Math.floor(w / 14)); for (let i = 1; i < n; i++) { c.beginPath(); c.moveTo(x + i * w / n + Math.sin(i * 3) * 2, y + 6); c.lineTo(x + i * w / n + Math.sin(i * 5) * 4, y + h - 6); c.stroke(); } }
  c.strokeStyle = TINTA; c.lineWidth = 4; c.strokeRect(x, y, w, h);
}

// ======================================================================================================
// 1. APERTURA: la bola pone su riel delante de sí misma; luego, la rampa simple
// ======================================================================================================
const RA = 74, GA = 24;
const PRE = [ruta([[60, -130], [1000, 60]]), ruta([[1010, 190], [60, 380]])];       // lo que ya construyó antes del primer cuadro
const SA = [ruta([[40, 520], [1000, 710]]), ruta([[1010, 850], [60, 1040]]), ruta([[70, 1180], [700, 1300]])];
const TA = [ev.A1, ev.A2, ev.A3];
const RS = ruta([[700, 1306], [385, 1466]]);
const VA = { x: 345, y: 1470, w: 196, h: 124 };
const YH = 390;                                                                         // la hoja de la guía
type Pieza = { j: number; i: number; ts: number };
const PIEZAS_A: Pieza[] = [];
TA.forEach(([a, b], j) => { for (let i = 0; i < ev.N[j]; i++) PIEZAS_A.push({ j, i, ts: a + i * (b - a) / ev.N[j] - .1 }); });

function bolaA(t: number): { x: number; y: number; dir: number; j: number } {
  for (let j = 0; j < 3; j++) {
    const [a, b] = TA[j];
    if (t < b || j === 2 && t < ev.rueda[0]) {
      if (j > 0 && t < a) {
        const p = sobre(SA[j - 1], 1, RA, GA), q = sobre(SA[j], 0, RA, GA), k = prog(t, TA[j - 1][1], a);
        return { x: lerp(p.x, q.x, k), y: lerp(p.y, q.y, k * k), dir: j % 2 ? -1 : 1, j };
      }
      const q = sobre(SA[j], prog(t, a, b), RA, GA);
      const tam = j === 2 && t > ev.frena ? 10 * Math.exp(-(t - ev.frena) * 3.5) * Math.sin((t - ev.frena) * 13) : 0;
      return { x: q.x + tam, y: q.y, dir: j % 2 ? -1 : 1, j };
    }
  }
  if (t < ev.vaso - .09) { const q = sobre(RS, rueda(prog(t, ev.rueda[0], ev.vaso - .09)), RA, GA); return { x: q.x, y: q.y, dir: -1, j: 3 }; }
  const p = sobre(RS, 1, RA, GA), k = prog(t, ev.vaso - .09, ev.vaso);
  return { x: lerp(p.x, VA.x, k), y: lerp(p.y, VA.y + 6, k * k) - brinco(t, ev.vaso, 16), dir: -1, j: 4 };
}

/** Papelitos que salta cada pieza al caer en su sitio. */
function polvoPieza(c: C, x: number, y: number, edad: number, semilla: number) {
  if (edad < 0 || edad > .45) return;
  const r = azar(semilla);
  c.fillStyle = TINTA;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI * (.15 + .7 * r()), v = 160 + r() * 260;
    c.globalAlpha = .7 * (1 - edad / .45);
    c.fillRect(x + Math.cos(a) * v * edad, y + Math.sin(a) * v * edad + 500 * edad * edad, 6, 6);
  }
  c.globalAlpha = 1;
}

function escenaA(c: C, t: number) {
  PRE.forEach((r) => { for (let i = 0; i < 7; i++) riel(c, r, { de: i / 7 + .004, a: (i + 1) / 7 - .004, g: GA, clavos: i % 2 === 0 }); });
  for (const P of PIEZAS_A) {
    if (t < P.ts) continue;
    const n = ev.N[P.j], k = ease.outBack(prog(t, P.ts, P.ts + .12), 2.2), drop = (1 - prog(t, P.ts, P.ts + .1)) * -26;
    const m = en(SA[P.j], (P.i + .5) / n);
    c.save(); c.translate(0, drop);
    c.translate(m.x, m.y); c.scale(lerp(.5, 1, k), lerp(.5, 1, k)); c.translate(-m.x, -m.y);
    riel(c, SA[P.j], { de: P.i / n + .004, a: (P.i + 1) / n - .004, g: GA, clavos: P.i % 2 === 0 });
    c.restore();
    polvoPieza(c, m.x, m.y - 10, t - P.ts, P.j * 10 + P.i);
  }
  // la rampa simple: un trazo de lápiz que se vuelve riel
  const lp = prog(t, ev.lapiz[0], ev.lapiz[1]);
  const kv = ease.outBack(prog(t, ev.lapiz[1] - .05, ev.lapiz[1] + .25), 2);
  if (lp > 0) {
    riel(c, RS, { a: ease.inOutCubic(lp), g: GA, lapiz: prog(t, ev.lapiz[1], ev.lapiz[1] + .3) });
    if (kv > 0) { c.save(); c.translate(VA.x, VA.y + VA.h); c.scale(kv, kv); c.translate(-VA.x, -VA.y - VA.h); vasoFondo(c, VA.x, VA.y, VA.w); c.restore(); }
  }
  // la bola
  const b = bolaA(t), g = RA / 90;
  const recoge = 1 - ease.inCubic(prog(t, ev.guarda[0], ev.guarda[1]));
  const prox = PIEZAS_A.find((P) => P.ts > t - .02);
  const ant = [...PIEZAS_A].reverse().find((P) => P.ts <= t - .02);
  const sobreCabeza: V = [b.x - b.dir * 26, b.y - RA * 1.75 + 6 * vaiven(t, .23)];
  let frente: V = [b.x + b.dir * 150, b.y - 40], llevo = false;
  if (prox && t < ev.frena) {
    const ph = prog(t, ant ? ant.ts : prox.ts - .2, prox.ts);
    const m = en(SA[prox.j], (prox.i + .5) / ev.N[prox.j]);
    frente = [lerp(sobreCabeza[0], m.x, ease.inOutCubic(ph)), lerp(sobreCabeza[1], m.y - 16, ease.inOutCubic(ph)) - 40 * Math.sin(Math.PI * ph)];
    llevo = ph < .97;
  } else if (t >= ev.frena) {
    const q = prog(t, ev.frena, ev.frena + .25);
    frente = [b.x + b.dir * lerp(150, 220, q) + 16 * vaiven(t, .5), b.y - 60 - 40 * q];   // tantea: ya no hay piezas
  }
  const atras: V = [b.x - b.dir * 100, b.y - RA * 1.6 + 8 * vaiven(t, .31, 1)];
  const quedan = t < ev.A3[0] ? 3 : t < ev.frena - .2 ? 1 : 0;
  if (recoge > .02) {
    c.save();
    if (b.dir < 0) { c.translate(b.x, 0); c.scale(-1, 1); c.translate(-b.x, 0); }
    const f1: V = b.dir < 0 ? [2 * b.x - frente[0], frente[1]] : atras, f2: V = b.dir < 0 ? [2 * b.x - atras[0], atras[1]] : frente;
    brazo(c, b.x - 54 * g, b.y - 50 * g, f1[0], f1[1], 90 * g, .55, TINTA, recoge, g * (.4 + .6 * recoge));
    brazo(c, b.x + 60 * g, b.y - 30 * g, f2[0], f2[1], -100 * g, t >= ev.frena ? .85 : .5, TINTA, recoge, g * (.4 + .6 * recoge));
    c.restore();
    for (let k = 0; k < quedan; k++) pieza(c, atras[0], atras[1] - 24 - k * 22, .1 * vaiven(t, .4, k), 1.05 * recoge);
    if (llevo) pieza(c, frente[0], frente[1] - 20, b.dir * .2, 1.05);
  }
  if (b.j === 4) vasoFondo(c, VA.x, VA.y, VA.w);
  bola(c, b.x, b.y, RA);
  if (lp > 0 && t < ev.lapiz[1] + .3) { const q = en(RS, ease.inOutCubic(lp)); lapiz(c, q.x, q.y, -.55 + .05 * Math.sin(t * 30)); }
  if (kv > 0) { c.save(); c.translate(VA.x, VA.y + VA.h); c.scale(kv, kv); c.translate(-VA.x, -VA.y - VA.h); vasoCuerpo(c, VA.x, VA.y, VA.w, VA.h); c.restore(); }
  palomita(c, VA.x + 200, VA.y + 20, ease.inOutCubic(prog(t, ev.palomita, ev.palomita + .35)));
  if (t > ev.hoja - .05) hojaGuia(c, t);
}

function hojaGuia(c: C, t: number) {
  const k = ease.outCubic(prog(t, ev.hoja, ev.hoja + .35)), cae = (1 - k) * -1100;
  const asienta = t > ev.hoja + .35 ? .02 * Math.exp(-(t - ev.hoja - .35) * 6) * Math.sin((t - ev.hoja - .35) * 30) : 0;
  c.save(); c.translate(540, YH + cae); c.rotate(-.025 + asienta + .004 * vaiven(t, 3.1)); c.translate(-540, -YH);
  c.fillStyle = "rgba(30,24,16,.14)"; c.fillRect(162, YH + 22, 790, 640);
  c.fillStyle = "#FFFEFA"; c.fillRect(140, YH, 800, 640); c.strokeStyle = TINTA; c.lineWidth = 4; c.strokeRect(140, YH, 800, 640);
  c.strokeStyle = "rgba(140,138,131,.35)"; c.lineWidth = 2; for (let y = YH + 360; y < YH + 630; y += 58) { c.beginPath(); c.moveTo(170, y); c.lineTo(910, y); c.stroke(); }
  texto(c, "Building effective", 540, YH + 140, { fuente: serif(90, true), color: TINTA });
  texto(c, "agents", 540, YH + 232, { fuente: serif(90, true), color: TINTA });
  texto(c, "Anthropic · diciembre de 2024", 540, YH + 306, { fuente: mono(40), color: GRIS });
  const nota1 = prog(t, ev.nota1 - .05, ev.nota1 + .5), nota2 = prog(t, ev.nota2 - .05, ev.nota2 + .45);
  const esc = (s2: string, y: number, k2: number) => {
    if (k2 <= 0) return;
    c.save(); c.beginPath(); c.rect(0, y - 110, 160 + 760 * k2, 150); c.clip();
    texto(c, s2, 540, y, { fuente: serif(106, true), color: ACENTO }); c.restore();
    if (k2 < 1) lapiz(c, 160 + 760 * k2, y - 30 + 10 * Math.sin(t * 40), -.4, .8);
  };
  esc("lo más simple", YH + 450, nota1); esc("que funcione", YH + 580, nota2);
  c.fillStyle = ACENTO; c.beginPath(); c.arc(540, YH + 26, 15, 0, 7); c.fill();
  c.fillStyle = "rgba(255,255,255,.6)"; c.beginPath(); c.arc(535, YH + 21, 5, 0, 7); c.fill();
  c.restore();
}

// ======================================================================================================
// 2. FLUJO Y AGENTE: tú dibujas el riel / la bola pone el suyo
// ======================================================================================================
const RBf = 60, GB = 20;
const RF = ruta(suave([[170, 622], [280, 650], [400, 712], [520, 760], [640, 742], [740, 800], [800, 858]], 8));
const VB = { x: 862, y: 862, w: 176, h: 120 };
const CB = ruta(suave([[150, 1350], [330, 1372], [470, 1362], [610, 1430], [760, 1545], [820, 1690], [700, 1800], [520, 1770], [430, 1630], [560, 1500],
  [740, 1610], [870, 1820], [790, 1990], [560, 2070], [330, 1990], [230, 1800], [330, 1640], [520, 1690], [650, 1900], [480, 2110], [230, 2100], [140, 1900], [200, 1700]], 10));
const PB = ev.piezasB, NB = PB.length, TLB = CB.tot / (NB + 1), KROTA = Math.floor(NB * .42);
const PILA: V = [835, 1425];

function avanceB(t: number) {
  if (t < PB[0]) return 0;
  let k = 0;
  while (k < NB - 1 && PB[k + 1] <= t) k++;
  return Math.max(0, (k + Math.min(1, (t - PB[k]) / .14) - .45) * TLB);
}
function bolaB(t: number) {
  const q = sobre(CB, avanceB(t) / CB.tot, RBf, GB);
  const caeK = prog(t, ev.dos + .04, ev.dos + .34);
  const impaciente = t > ev.dos + .8 && t < ev.arranca ? Math.abs(Math.sin((t - ev.dos) * 7.5)) * 26 * smooth(prog(t, ev.dos + .8, ev.dos + 1.2)) : 0;
  return { x: q.x, y: q.y - (1 - caeK * caeK) * 700 * (t < ev.dos + .34 ? 1 : 0) - brinco(t, ev.dos + .34, 22) - impaciente, a: q.a };
}
function monedaPlana(c: C, x: number, y: number) {
  c.fillStyle = "#C8AE6A"; c.strokeStyle = TINTA; c.lineWidth = 3;
  c.beginPath(); c.ellipse(x, y + 7, 34, 11, 0, 0, Math.PI); c.lineTo(x - 34, y); c.ellipse(x, y, 34, 11, 0, Math.PI, 0, true); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = ORO; c.beginPath(); c.ellipse(x, y, 34, 11, 0, 0, 7); c.fill(); c.stroke();
}

function escenaB(c: C, t: number) {
  c.save(); c.translate(BX, 0);
  const vaArriba = 1 - smooth(prog(t, ev.bajaB, ev.bajaB + .45));             // la franja del flujo se va cuando bajamos
  const lin = prog(t, ev.giroB + .3, ev.giroB + .7);
  if (lin > 0) { c.save(); c.globalAlpha = vaArriba; c.strokeStyle = "rgba(17,17,17,.45)"; c.lineWidth = 3; c.setLineDash([2, 14]); c.lineDashOffset = -t * 40; c.lineCap = "round"; c.beginPath(); c.moveTo(60, 960); c.lineTo(60 + 960 * lin, 960); c.stroke(); c.restore(); }
  texto(c, "flujo", 100, 420, { fuente: serif(124, true), color: TINTA, alin: "left", alfa: smooth(prog(t, ev.flujo - .05, ev.flujo + .2)) * vaArriba });
  texto(c, "workflow", 106, 480, { fuente: mono(40), color: GRIS, alin: "left", alfa: smooth(prog(t, ev.flujo + .1, ev.flujo + .35)) * vaArriba });
  texto(c, "agente", 100, 1120, { fuente: serif(124, true), color: TINTA, alin: "left", alfa: smooth(prog(t, ev.agente - .05, ev.agente + .2)) * vaArriba });
  texto(c, "agent", 106, 1180, { fuente: mono(40), color: GRIS, alin: "left", alfa: smooth(prog(t, ev.agente + .1, ev.agente + .35)) * vaArriba });

  // ----- arriba: tú dibujas el camino, el modelo lo recorre -----
  if (vaArriba > .01) {
    c.save(); c.globalAlpha = vaArriba;
    repisa(c, 90, 250, 632);
    const dib = prog(t, ev.dibuja[0], ev.dibuja[1]), gros = prog(t, ev.engrosa[0], ev.engrosa[1]);
    if (dib > 0) riel(c, RF, { de: .06, a: lerp(.06, 1, ease.inOutCubic(dib)), g: GB, lapiz: gros });
    if (gros > .3) vasoFondo(c, VB.x, VB.y, VB.w);
    const k = prog(t, ev.recorre[0], ev.recorre[1] - .1), caeK = prog(t, ev.dos - .06, ev.dos + .25);
    let x: number, y: number;
    if (t < ev.recorre[0]) { const q = sobre(RF, 0, RBf, GB); x = q.x + 7 * Math.sin(t * 2.7) * smooth(prog(t, ev.dos + .5, ev.dos + 1)); y = q.y - (1 - caeK * caeK) * 600 - brinco(t, ev.dos + .25, 22); }
    else if (k < 1) { const q = sobre(RF, rueda(k), RBf, GB); x = q.x; y = q.y; }
    else { const q = sobre(RF, 1, RBf, GB), kk = prog(t, ev.recorre[1] - .1, ev.recorre[1] + .02); x = lerp(q.x, VB.x, kk); y = lerp(q.y, VB.y + 6, kk * kk) - brinco(t, ev.recorre[1] + .02, 14); }
    if (t > ev.dos - .06) bola(c, x, y, RBf);
    const llega = prog(t, ev.dibuja[0] - .9, ev.dibuja[0]);
    if (llega > 0 && dib <= 0) { const q = en(RF, .06), k = ease.inOutCubic(llega); lapiz(c, lerp(1250, q.x, k), lerp(760, q.y, k) - 60 * Math.sin(Math.PI * k), .7); }
    if (dib > 0 && dib < 1) { const q = en(RF, lerp(.06, 1, ease.inOutCubic(dib))); lapiz(c, q.x, q.y, .7 + .06 * Math.sin(t * 28)); }
    if (gros > .3) vasoCuerpo(c, VB.x, VB.y, VB.w, VB.h);
    c.restore();
  }

  // ----- abajo: el agente pone sus piezas -----
  repisa(c, 70, 240, 1360);
  const puestas = PB.filter((x) => x <= t).length;
  for (let k = 0; k < puestas; k++) {
    const kk = ease.outBack(prog(t, PB[k], PB[k] + .12), 2.2), m = en(CB, (k + .5) * TLB / CB.tot);
    const rota = k === KROTA && t > ev.rota;
    c.save(); c.translate(m.x, m.y); c.scale(lerp(.5, 1, kk), lerp(.5, 1, kk)); c.translate(-m.x, -m.y);
    if (rota) {
      const parp = .55 + .45 * Math.abs(Math.sin(t * 4.2));
      riel(c, CB, { de: k * TLB / CB.tot + .002, a: (k + .38) * TLB / CB.tot, g: GB, tinta: ACENTO, relleno: "#F6DDD5", clavos: false, alfa: parp });
      riel(c, CB, { de: (k + .62) * TLB / CB.tot, a: (k + 1) * TLB / CB.tot - .002, g: GB, tinta: ACENTO, relleno: "#F6DDD5", clavos: false, alfa: parp });
    } else riel(c, CB, { de: k * TLB / CB.tot + .0025, a: (k + 1) * TLB / CB.tot - .0025, g: GB, clavos: k % 3 === 0 });
    c.restore();
    polvoPieza(c, m.x, m.y - 10, t - PB[k], 300 + k);
  }
  // duda: tres caminos posibles, él escoge uno
  if (t > ev.duda[0] - .05 && t < ev.decide + .5) {
    const b = bolaB(t), a = ventana(t, ev.duda[0], ev.decide + .1, .15, .3);
    [-.75, -.1, .55].forEach((o, i) => {
      const L = 200 + 20 * Math.sin(t * 5 + i), ang = o + .08 * vaiven(t, .6, i), esEste = i === 2 && t > ev.decide;
      c.save(); c.globalAlpha = a * (esEste ? 1 : t > ev.decide ? 1 - prog(t, ev.decide, ev.decide + .25) : .8);
      c.strokeStyle = esEste ? ACENTO : TINTA; c.lineWidth = 7; c.setLineDash([4, 18]); c.lineCap = "round"; c.lineDashOffset = -t * 80;
      c.beginPath(); c.moveTo(b.x + 40, b.y + 20); c.lineTo(b.x + 40 + Math.cos(ang) * L, b.y + 20 + Math.sin(ang) * L); c.stroke(); c.restore();
    });
  }
  // monedas: cada pieza cuesta una, y se apilan
  const mon = ev.monedas;
  for (let i = 0; i < mon.length; i++) {
    const a = mon[i] + .05; if (t < a) continue;
    const k = prog(t, a, a + .42), q = sobre(CB, avanceB(a) / CB.tot, RBf, GB);
    const dest: V = [PILA[0] + (i % 2) * 5 - 2, PILA[1] - i * 15];
    if (k < 1) moneda(c, lerp(q.x, dest[0], ease.inOutCubic(k)), lerp(q.y - 70, dest[1], k) - 240 * Math.sin(Math.PI * k), 1.25, t * 14 + i);
    else monedaPlana(c, dest[0], dest[1] - brinco(t, a + .42, 8, 12, 25));
  }
  // la bola, con el brazo de adelante poniendo la siguiente pieza
  if (t > ev.dos) {
    const b = bolaB(t), g = RBf / 90;
    const brota = ease.outBack(prog(t, ev.agente - .02, ev.agente + .3), 1.3);
    let k = 0; while (k < NB - 1 && PB[k + 1] <= t) k++;
    const sig = Math.min(k + 1, NB - 1), dest = en(CB, (sig + .5) * TLB / CB.tot);
    const ph = t < PB[0] ? 0 : prog(t, PB[k], PB[sig]);
    const arriba: V = [b.x - 10, b.y - RBf * 1.8];
    let fr: V = [lerp(arriba[0], dest.x, ease.inOutCubic(ph)), lerp(arriba[1], dest.y - 14, ease.inOutCubic(ph)) - 30 * Math.sin(Math.PI * ph)];
    const dudando = t > ev.duda[0] && t < ev.decide;
    if (dudando) fr = [b.x + 130 + 20 * vaiven(t, .5), b.y - 100 + 16 * vaiven(t, .37)];
    let at: V = [b.x - 100, b.y - RBf * 1.5 + 8 * vaiven(t, .3)];
    if (t > ev.lupa[0]) {
      const u = t - ev.lupa[0], lx = 500 + 300 * Math.sin(u * 1.9 + .3), ly = 1800 + 210 * Math.sin(u * 2.7 + 1.2);
      at = [lx - 86, ly + 86];
      fr = [b.x + 110, b.y - 70 + 10 * vaiven(t, .8)];
      brazo(c, b.x - 54 * g, b.y - 50 * g, at[0], at[1], 120 * g, .3, TINTA, brota, g);
      lupa(c, lx, ly, 80, smooth(prog(t, ev.lupa[0], ev.lupa[0] + .2)));
      brazo(c, b.x + 60 * g, b.y - 30 * g, fr[0], fr[1], -100 * g, .7, TINTA, brota, g);
    } else if (brota > .02) {
      brazo(c, b.x - 54 * g, b.y - 50 * g, at[0], at[1], 90 * g, .55, TINTA, brota, g);
      brazo(c, b.x + 60 * g, b.y - 30 * g, fr[0], fr[1], -100 * g, .5, TINTA, brota, g);
      if (t > PB[0] - .1 && (ph < .97 || dudando)) pieza(c, fr[0] + (dudando ? 10 : 0), fr[1] - 18, dudando ? .1 * vaiven(t, .3) : .2, .95);
    }
    bola(c, b.x, b.y, RBf);
  }
  c.restore();
}

// ======================================================================================================
// 3. LA TORRE: cinco módulos, cada uno su tramo de riel
// ======================================================================================================
type Caja = { x: number; y: number; w: number; h: number };
const dentroDe = (t: number, I: number[][]) => I.some(([a, b]) => t >= a && t <= b);
const sacude = (t: number, I: number[][]) => (dentroDe(t, I) ? 1 : 0);

function tablero(c: C, det: boolean) {
  c.fillStyle = "rgba(30,24,16,.10)"; c.fillRect(44, 18, 1020, MH);
  c.fillStyle = TABLA; c.fillRect(30, 0, 1020, MH);
  if (det) { c.fillStyle = HUECO; for (let y = 52; y < MH - 40; y += 64) for (let x = 78; x < 1020; x += 64) { c.beginPath(); c.arc(x, y, 4.5, 0, 7); c.fill(); } }
  maderaRect(c, 0, 0, 34, MH); maderaRect(c, 1046, 0, 34, MH); maderaRect(c, 0, MH - 30, 1080, 30, false);
  hoyo(c, 540, MH - 15, 100, 18);
}
function escribe(c: C, s2: string, x: number, y: number, px: number, k: number, color = TINTA, it = false) {
  if (k <= 0) return;
  c.save(); c.font = serif(px, it); const w = c.measureText(s2).width;
  c.beginPath(); c.rect(x - w / 2 - 10, y - px, (w + 20) * clamp(k), px * 1.4); c.clip();
  texto(c, s2, x, y, { fuente: serif(px, it), color }); c.restore();
}

// ----- M1: encadenar -----
const M1 = { A: { x: 90, y: 200, w: 470, h: 270 }, B: { x: 420, y: 715, w: 500, h: 240 },
  R2: ruta([[596, 452], [948, 590]]), R3: ruta([[455, 1004], [110, 1092]]), R4: ruta([[130, 1140], [490, 1194]]) };
function piernasM1(c4: number[][], sale: number): Pierna[] {
  const [[a0, b0], [a1], [a2, b2]] = c4;
  return [
    { a: a0, b: b0 - .1, de: [260, -420], a2: [260, 150] },
    { a: b0 - .1, b: a1 + .02, de: [260, 150], a2: [260, 222] },
    { a: a1 + .02, b: a2, oculta: true },
    { a: a2, b: b2 - .17, r: M1.R2 },
    { a: b2 - .17, b: b2, de: ps(M1.R2, 1), a2: [882, 722] },
    { a: b2, b: sale, oculta: true },
    { a: sale, b: sale + .45, r: M1.R3 },
    { a: sale + .45, b: sale + .58, de: ps(M1.R3, 1), a2: ps(M1.R4, 0) },
    { a: sale + .58, b: sale + .98, r: M1.R4 },
    { a: sale + .98, b: sale + 1.15, de: ps(M1.R4, 1), a2: [540, 1300] },
    { a: sale + 1.15, b: 1e9, oculta: true },
  ];
}
const P1 = [piernasM1(ev.m1.c1, ev.m1.sale1), piernasM1(ev.m1.c2, ev.m1.sale2)];
const C1 = [ev.m1.c1, ev.m1.c2], SAL1 = [ev.m1.sale1, ev.m1.sale2];

function modulo1(c: C, τ: number, t: number, vivo: number) {
  riel(c, M1.R2); riel(c, M1.R3); riel(c, M1.R4);
  for (let j = 0; j < 2; j++) {
    const p = trayecto(τ, P1[j]); if (!p) continue;
    canica(c, p[0], p[1], RC, "v", p[0] / RC, vivo);
    if (τ >= C1[j][2][0] && τ < SAL1[j]) hojaLista(c, p[0] + 4, p[1] - 4, .55, vivo);
    if (τ >= SAL1[j]) sobreCarta(c, p[0], p[1] - 2, .66, -.1, vivo);
  }
  const sA = sacude(τ, C1.map((x) => x[1])), sB = sacude(τ, [[C1[0][3][0], SAL1[0]], [C1[1][3][0], SAL1[1]]]);
  const A = M1.A, B = M1.B;
  caja(c, A.x, A.y, A.w, A.h, t, sA * vivo); caja(c, B.x, B.y, B.w, B.h, t, sB * vivo);
  hoyo(c, 272, 188, 96, 18); hoyo(c, 897, 703, 96, 18);
  hojaLista(c, A.x + 66, A.y + 74, .9); sobreCarta(c, B.x + 76, B.y + 60, .85, -.08);
  escribe(c, "lista de", A.x + A.w / 2 + 34, A.y + 132, 94, prog(t, ev.m1.lista - .05, ev.m1.lista + .3));
  escribe(c, "invitados", A.x + A.w / 2 + 24, A.y + 232, 94, prog(t, ev.m1.lista + .2, ev.m1.lista + .55));
  escribe(c, "invitaciones", B.x + B.w / 2 + 24, B.y + 196, 90, prog(t, ev.m1.invit - .05, ev.m1.invit + .45));
  // salen las invitaciones
  const k = τ - ev.m1.sobres;
  if (k > 0 && k < 1.25) {
    const r = azar(51);
    for (let i = 0; i < 9; i++) {
      const vx = (r() - .45) * 700, vy = -700 - r() * 420, g0 = (r() - .5) * 2;
      sobreCarta(c, 700 + vx * k, 690 + vy * k + 1000 * k * k, .9, g0 + k * (r() - .5) * 6, vivo * (1 - smooth(prog(k, .8, 1.2))));
    }
  }
  embudo(c, 260, 24, 150);
}

// ----- M2: enrutar -----
const M2 = { bx: 222, by: 316, R: 92, cuna: [560, 350] as V, piv: [560, 420] as V,
  carriles: [ruta([[560, 424], [445, 562], [165, 768], [235, 892]]), ruta([[560, 424], [560, 566], [690, 706], [530, 888]]), ruta([[560, 424], [675, 562], [930, 768], [835, 892]])],
  cajas: [{ x: 70, y: 980, w: 250, h: 190 }, { x: 410, y: 980, w: 250, h: 190 }, { x: 716, y: 980, w: 226, h: 190 }] as Caja[],
  tipos: ["r", "v", "m"] };
const TIPO2 = ["r", "m", "v"], CARRIL2 = [0, 2, 1];
const LLEGA2 = [ev.m2.llega[0], Math.max(ev.m2.llega[1], ev.m2.suelta[0] + .2), ev.m2.llega[2]];
const P2 = [0, 1, 2].map((i): Pierna[] => {
  const ll = LLEGA2[i], su = ev.m2.suelta[i], le = ev.m2.lleno[i], cj = M2.cajas[CARRIL2[i]], r = M2.carriles[CARRIL2[i]];
  const P: Pierna[] = [
    { a: ll - .5, b: ll - .14, de: [560, -80], a2: [560, 150] },
    { a: ll - .14, b: ll, de: [560, 150], a2: M2.cuna },
    { a: ll, b: su, fijo: M2.cuna },
    { a: su, b: le - .16, r },
    { a: le - .16, b: le, de: ps(r, 1), a2: [cj.x + cj.w / 2 + 15, cj.y - 2] },
    { a: le, b: 1e9, oculta: true },
  ];
  if (i === 2) { P[5] = { a: le, b: ev.m2.sale, oculta: true }; P.push({ a: ev.m2.sale, b: ev.m2.sale + .32, de: [540, 1190], a2: [540, 1320] }, { a: ev.m2.sale + .32, b: 1e9, oculta: true }); }
  return P;
});
const angCarril = (i: number) => { const r = M2.carriles[i]; return Math.atan2(r.p[1][1] - r.p[0][1], r.p[1][0] - r.p[0][0]); };

function modulo2(c: C, τ: number, t: number, vivo: number) {
  M2.carriles.forEach((r) => riel(c, r, { de: r.L[1] / r.tot }));
  let ang = angCarril(1);
  for (let i = 0; i < 3; i++) { const a0 = ev.m2.mira[i] + .22; if (τ > a0) ang = lerp(i ? angCarril(CARRIL2[i - 1]) : angCarril(1), angCarril(CARRIL2[i]), ease.outBack(prog(τ, a0, a0 + .25), 1.6)); }
  for (let i = 0; i < 3; i++) { const p = trayecto(τ, P2[i]); if (p) canica(c, p[0], p[1], RC, TIPO2[i], p[0] / RC + p[1] / 50, vivo); }
  const [px, py] = M2.piv, L = M2.carriles[1].L[1];
  riel(c, ruta([[px, py], [px + Math.cos(ang) * L, py + Math.sin(ang) * L]]), { clavos: false });
  const pal: V = [px - Math.cos(ang) * 76 - 24, py - Math.sin(ang) * 76 - 44];
  c.strokeStyle = TINTA; c.lineWidth = 12; c.lineCap = "round"; c.beginPath(); c.moveTo(px, py); c.lineTo(pal[0], pal[1]); c.stroke();
  c.fillStyle = ACENTO; c.beginPath(); c.arc(pal[0], pal[1], 15, 0, 7); c.fill();
  clavo(c, px, py, 1.3);
  c.strokeStyle = TINTA; c.lineWidth = 7; c.beginPath(); c.arc(M2.cuna[0], M2.cuna[1] + 4, RC + 14, .25, Math.PI - .25); c.stroke();
  M2.cajas.forEach((b, i) => {
    const tocada = ev.m2.lleno.findIndex((x, k) => CARRIL2[k] === i && τ > x && τ < x + .3);
    caja(c, b.x, b.y, b.w, b.h, t, tocada >= 0 ? 1 : 0);
    hoyo(c, b.x + b.w / 2 + 15, b.y - 12, 90, 16);
    canica(c, b.x + b.w / 2, b.y + b.h / 2 + 4, 54, M2.tipos[i], .5);
  });
  for (let k = 0; k < 3; k++) {
    const x = ev.m2.lleno[k], b = M2.cajas[CARRIL2[k]];
    palomita(c, b.x + b.w / 2 + 10, b.y - 70, ease.inOutCubic(prog(τ, x + .05, x + .3)) * (1 - smooth(prog(τ, x + 1.6, x + 1.9))), ACENTO, .7);
  }
  const g = M2.R / 90;
  let lu: V = [M2.bx + 80, M2.by - 210];
  for (let i = 0; i < 3; i++) { const a = ev.m2.mira[i] - .15, b = ev.m2.suelta[i]; const k = ventana(τ, a, b - .05, .2, .2); if (k > 0) lu = [lerp(lu[0], M2.cuna[0] - 6, k), lerp(lu[1], M2.cuna[1] - 8, k)]; }
  const mira = [0, 1, 2].some((i) => τ > ev.m2.mira[i] - .1 && τ < ev.m2.suelta[i]);
  lu = [lu[0] + 6 * vaiven(t, .5), lu[1] + 5 * vaiven(t, .43, 1)];
  repisa(c, 90, 360, M2.by + M2.R - 2);
  brazo(c, M2.bx - 54 * g, M2.by - 50 * g, lu[0] - 82, lu[1] + 78, 110 * g, .3, TINTA, 1, g);
  brazo(c, M2.bx + 60 * g, M2.by - 30 * g, pal[0] - 4, pal[1] + 6, -60 * g, .3, TINTA, 1, g);
  bola(c, M2.bx, M2.by + (mira ? -5 : 0), M2.R);
  lupa(c, lu[0], lu[1], 62);
  embudo(c, 560, 20, 150);
}

// ----- M3: paralelizar -----
const COL3 = [170, 510, 830];
const M3 = { S: { x: 110, y: 160, w: 820, h: 120 }, carril: COL3.map((x) => ruta([[x - 62, 320], [x + 70, 410], [x - 70, 506], [x + 22, 584]])),
  est: COL3.map((x) => ({ x: x - 120, y: 652, w: 240, h: 232 })),
  junta: [ruta([[170, 944], [420, 1046]]), ruta([[510, 944], [492, 1036]]), ruta([[830, 944], [612, 1046]])] };
const P3 = [0, 1, 2].map((i): Pierna[] => {
  const e3 = ev.m3, x = COL3[i], r = M3.carril[i], jr = M3.junta[i];
  return [
    { a: e3.suelta, b: e3.llega - .13, r },
    { a: e3.llega - .13, b: e3.llega, de: ps(r, 1), a2: [x + 12, 650] },
    { a: e3.llega, b: e3.junta, oculta: true },
    { a: e3.junta, b: e3.junta + .42, r: jr },
    { a: e3.junta + .42, b: e3.junta + .58, de: ps(jr, 1), a2: [520, 1090] },
    { a: e3.junta + .58, b: e3.junta + .8, de: [520, 1090], a2: [540, 1320] },
    { a: e3.junta + .8, b: 1e9, oculta: true },
  ];
});
const P3t: Pierna[] = [{ a: ev.m3.entra - .45, b: ev.m3.entra, de: [540, -80], a2: [560, 170] }, { a: ev.m3.entra, b: 1e9, oculta: true }];
function modulo3(c: C, τ: number, t: number, vivo: number) {
  M3.carril.forEach((r) => riel(c, r)); M3.junta.forEach((r) => riel(c, r));
  const pt = trayecto(τ, P3t, 46); if (pt) canica(c, pt[0], pt[1], 46, "r", pt[0] / 46, vivo);
  for (let i = 0; i < 3; i++) { const p = trayecto(τ, P3[i]); if (p) canica(c, p[0], p[1], RC, "v", p[0] / RC + p[1] / 40, vivo); }
  const S = M3.S;
  caja(c, S.x, S.y, S.w, S.h, t, τ > ev.m3.entra && τ < ev.m3.suelta ? 1 : 0);
  hoyo(c, 572, 148, 96, 18);
  for (let i = 0; i < 3; i++) hoyo(c, COL3[i] - 62, S.y + S.h - 8, 70, 16);
  const trabaja = τ > ev.m3.llega && τ < ev.m3.junta;
  const NOM = ["lugar", "pastel", "música"], TT = [ev.m3.lugar, ev.m3.pastel, ev.m3.musica];
  M3.est.forEach((b, i) => {
    caja(c, b.x, b.y, b.w, b.h, t + i, trabaja ? .55 : 0, 24, 20);
    hoyo(c, b.x + b.w / 2 + 12, b.y - 10, 84, 15);
    const ix = b.x + b.w / 2, iy = b.y + 84, z = 1.3 + (trabaja ? .07 * Math.sin(t * 9 + i * 2) : 0);
    if (i === 0) casa(c, ix, iy, z, trabaja ? t : 0); else if (i === 1) pastel(c, ix, iy, z, trabaja ? t : 0); else nota(c, ix, iy, z, trabaja ? t : 0);
    escribe(c, NOM[i], ix, b.y + b.h - 22, 84, prog(t, TT[i] - .05, TT[i] + .3));
  });
  embudo(c, 520, 1056, 160);
  embudo(c, 540, 20, 150);
}

// ----- M4: orquestador -----
const M4 = { bx: 540, by: 268, R: 95, embudos: [[170, 470], [395, 500], [685, 500], [910, 470]] as V[], copa: [540, 1000] as V };
const CARR4 = [
  ruta(suave([[170, 556], [145, 720], [360, 900], [478, 982]], 6)), ruta(suave([[395, 586], [330, 740], [470, 895], [512, 982]], 6)),
  ruta(suave([[685, 586], [750, 740], [610, 895], [568, 982]], 6)), ruta(suave([[910, 556], [935, 720], [720, 900], [602, 982]], 6)),
];
const MANOS4: V = [540, 112], RP = 28;
const P4 = [0, 1, 2, 3].map((i): Pierna[] => {
  const l = ev.m4.lanza[i], cp = ev.m4.copa[i], [ex, ey] = M4.embudos[i];
  return [
    { a: ev.m4.parte, b: l, fijo: [MANOS4[0] + (i - 1.5) * 30, MANOS4[1] + (i % 2) * 16] },
    { a: l, b: l + .3, de: [MANOS4[0] + (i - 1.5) * 30, MANOS4[1]], a2: [ex, ey - 34], arco: 160 },
    { a: l + .3, b: l + .42, de: [ex, ey - 34], a2: [ex, ey + 66] },
    { a: l + .42, b: cp - .1, r: CARR4[i] },
    { a: cp - .1, b: cp, de: ps(CARR4[i], 1, RP), a2: [M4.copa[0] - 54 + i * 36, M4.copa[1] + 4] },
    { a: cp, b: ev.m4.estira + .4, fijo: [M4.copa[0] - 54 + i * 36, M4.copa[1] + 4] },
    { a: ev.m4.estira + .4, b: 1e9, oculta: true },
  ];
});
function copa4(τ: number) {
  const sube = ease.inOutCubic(prog(τ, ev.m4.estira + .28, ev.m4.estira + .5)) * (1 - ease.inOutCubic(prog(τ, ev.m4.vierte + .45, ev.m4.vierte + .8)));
  const gira = ease.inOutCubic(prog(τ, ev.m4.vierte, ev.m4.vierte + .2)) * (1 - ease.inOutCubic(prog(τ, ev.m4.vierte + .45, ev.m4.vierte + .75)));
  return { x: M4.copa[0], y: M4.copa[1] - 50 * sube, g: .95 * gira };
}
function modulo4(c: C, τ: number, t: number, vivo: number) {
  CARR4.forEach((r) => riel(c, r));
  const cp = copa4(τ), S = 1.15;
  c.save(); c.translate(cp.x, cp.y); c.rotate(cp.g); c.scale(S, S); hoyo(c, 0, 0, 220, 38); c.restore();
  const fus = prog(τ, ev.m4.estira + .3, ev.m4.estira + .45);
  for (let i = 0; i < 4; i++) {
    const p = trayecto(τ, P4[i], RP); if (!p) continue;
    let [x, y] = p;
    if (τ >= ev.m4.copa[i]) y += cp.y - M4.copa[1] - brinco(τ, ev.m4.copa[i], 12);
    if (τ > ev.m4.estira + .3) { x = lerp(x, cp.x, fus); y = lerp(y, cp.y + 4, fus); }
    canica(c, x, y, RP, "v", x / RP, vivo * (1 - fus * .9));
  }
  if (τ > ev.m4.estira + .38 && τ < ev.m4.vierte + .6) {
    const k = prog(τ, ev.m4.vierte + .08, ev.m4.vierte + .45);
    canica(c, lerp(cp.x, cp.x + 80, k), lerp(cp.y - 6, 1320, k * k), 44 * ease.outBack(prog(τ, ev.m4.estira + .38, ev.m4.estira + .55), 2), "r", 0, vivo);
  }
  c.save(); c.translate(cp.x, cp.y); c.rotate(cp.g); c.scale(S, S);
  poli(c, [[-112, 0], [112, 0], [80, 70], [26, 100], [14, 160], [70, 182], [-70, 182], [-14, 160], [-26, 100], [-80, 70]], BLANCO, 5);
  c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.ellipse(0, 0, 112, 18, 0, 0, Math.PI); c.stroke();
  c.restore();
  M4.embudos.forEach(([x, y]) => embudo(c, x, y, 130));
  const g = M4.R / 90;
  repisa(c, 400, 680, M4.by + M4.R - 4);
  let h1: V = [M4.bx - 64, MANOS4[1] + 36], h2: V = [M4.bx + 64, MANOS4[1] + 36];
  const tiene = τ > ev.m4.atrapa - .05 && τ < ev.m4.lanza[3] + .05;
  if (!tiene) { h1 = [M4.bx - 165, M4.by - 40 + 10 * vaiven(t, .7)]; h2 = [M4.bx + 165, M4.by - 40 + 10 * vaiven(t, .7, 2)]; }
  for (let i = 0; i < 4; i++) {
    const l = ev.m4.lanza[i], k = prog(τ, l - .1, l + .18);
    if (k > 0 && k < 1) { const tgt = M4.embudos[i]; const h: V = [lerp(MANOS4[0], tgt[0] * .6 + MANOS4[0] * .4, ease.outCubic(k)), lerp(MANOS4[1] + 20, MANOS4[1] - 24, k)]; if (i < 2) h1 = h; else h2 = h; }
  }
  const est = ventana(τ, ev.m4.estira, ev.m4.vierte + .55, .28, .3);
  if (est > 0) h2 = [lerp(h2[0], cp.x + 24, est), lerp(h2[1], cp.y + 170, est)];
  brazo(c, M4.bx - 54 * g, M4.by - 50 * g, h1[0], h1[1], 80 * g, tiene ? .25 : .6, TINTA, 1, g);
  brazo(c, M4.bx + 60 * g, M4.by - 30 * g, h2[0], h2[1], est > .1 ? -40 * g : -90 * g, tiene || est > .5 ? .25 : .6, TINTA, 1, g);
  bola(c, M4.bx, M4.by, M4.R);
  if (τ > ev.m4.atrapa - .4 && τ < ev.m4.parte + .02) {
    const k = prog(τ, ev.m4.atrapa - .4, ev.m4.atrapa);
    canica(c, MANOS4[0], lerp(-80, MANOS4[1], k * k), 46, "r", 0, vivo);
  }
  if (τ > ev.m4.parte && τ < ev.m4.parte + .35) {
    const k = prog(τ, ev.m4.parte, ev.m4.parte + .35), r = azar(8);
    for (let i = 0; i < 10; i++) { const a = r() * 6.28, v = 130 + r() * 170; c.fillStyle = `rgba(192,68,42,${1 - k})`; c.fillRect(MANOS4[0] + Math.cos(a) * v * k, MANOS4[1] + Math.sin(a) * v * k + 200 * k * k, 11, 11); }
  }
  embudo(c, 540, 20, 150);
}

// ----- M5: evaluador -----
const M5 = { bx: 790, by: 300, R: 92, trabajo: [790, 132] as V, Ein: ruta([[560, 112], [680, 160]]), E2: ruta([[660, 456], [470, 584]]),
  rev: { x: 150, y: 610, w: 290, h: 250 }, lente: [292, 736] as V, elev: { x: 84, y0: 945, y1: 150 },
  Rv: ruta([[150, 118], [652, 186]]), Rx: ruta([[452, 906], [692, 1016]]), Rx2: ruta([[680, 1086], [556, 1184]]) };
const e5 = ev.m5;
const P5: Pierna[] = [
  { a: e5.atrapa - .75, b: e5.atrapa - .48, de: [540, -80], a2: [548, 92] },
  { a: e5.atrapa - .48, b: e5.atrapa - .14, r: M5.Ein },
  { a: e5.atrapa - .14, b: e5.atrapa, de: ps(M5.Ein, 1), a2: M5.trabajo },
  { a: e5.atrapa, b: e5.tira, fijo: M5.trabajo },
  { a: e5.tira, b: e5.tira + .15, de: M5.trabajo, a2: ps(M5.E2, 0), arco: 40 },
  { a: e5.tira + .15, b: e5.revisa - .06, r: M5.E2 },
  { a: e5.revisa - .06, b: e5.revisa, de: ps(M5.E2, 1), a2: [420, 600] },
  { a: e5.revisa, b: e5.cae, oculta: true },
  { a: e5.cae, b: e5.cae + .16, de: [190, 870], a2: [M5.elev.x, M5.elev.y0 - 10] },
  { a: e5.cae + .16, b: e5.sube[0], fijo: [M5.elev.x, M5.elev.y0 - 10] },
  { a: e5.sube[0], b: e5.sube[1], de: [M5.elev.x, M5.elev.y0 - 10], a2: [M5.elev.x, M5.elev.y1 - 10], arco: 0.0001 },
  { a: e5.sube[1], b: e5.vuelve - .1, r: M5.Rv, f: (x) => x },
  { a: e5.vuelve - .1, b: e5.vuelve, de: ps(M5.Rv, 1), a2: M5.trabajo },
  { a: e5.vuelve, b: e5.tira2, fijo: M5.trabajo },
  { a: e5.tira2, b: e5.tira2 + .1, de: M5.trabajo, a2: ps(M5.E2, 0), arco: 30 },
  { a: e5.tira2 + .1, b: e5.palomita - .14, r: M5.E2 },
  { a: e5.palomita - .14, b: e5.palomita - .06, de: ps(M5.E2, 1), a2: [420, 600] },
  { a: e5.palomita - .06, b: e5.sale, oculta: true },
  { a: e5.sale, b: e5.sale + .4, r: M5.Rx },
  { a: e5.sale + .4, b: e5.sale + .5, de: ps(M5.Rx, 1), a2: ps(M5.Rx2, 0) },
  { a: e5.sale + .5, b: e5.sale + .8, r: M5.Rx2 },
  { a: e5.sale + .8, b: e5.sale + 1, de: ps(M5.Rx2, 1), a2: [540, 1320] },
  { a: e5.sale + 1, b: 1e9, oculta: true },
];
function cubeta5(τ: number) {
  if (τ < e5.sube[0]) return M5.elev.y0;
  if (τ < e5.sube[1]) return lerp(M5.elev.y0, M5.elev.y1, ease.inOutCubic(prog(τ, e5.sube[0], e5.sube[1])));
  return lerp(M5.elev.y1, M5.elev.y0, ease.inOutCubic(prog(τ, e5.sube[1] + .2, e5.sube[1] + 1.1)));
}
function modulo5(c: C, τ: number, t: number, vivo: number) {
  riel(c, M5.Ein); riel(c, M5.E2); riel(c, M5.Rv); riel(c, M5.Rx); riel(c, M5.Rx2);
  const E = M5.elev, yc = cubeta5(τ), gira = (yc - E.y0) / 30;
  c.strokeStyle = TINTA; c.lineWidth = 6; c.beginPath(); c.moveTo(E.x - 30, E.y1 - 14); c.lineTo(E.x - 30, E.y0 + 22); c.moveTo(E.x + 30, E.y1 - 14); c.lineTo(E.x + 30, E.y0 + 22); c.stroke();
  c.save(); c.setLineDash([12, 16]); c.lineDashOffset = gira * 30; c.strokeStyle = GRIS; c.lineWidth = 5; c.beginPath(); c.moveTo(E.x + 30, E.y1); c.lineTo(E.x + 30, E.y0); c.stroke(); c.restore();
  for (const y of [E.y1 - 18, E.y0 + 24]) { c.fillStyle = MADERA; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.arc(E.x, y, 34, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.moveTo(E.x, y); c.lineTo(E.x + Math.cos(gira) * 30, y + Math.sin(gira) * 30); c.stroke(); }
  const vuelca = ventana(τ, e5.sube[1] - .05, e5.sube[1] + .15, .1, .2);
  const p = trayecto(τ, P5, RC);
  const rug = smooth(prog(τ, e5.hace[0], e5.hace[1])), pul = smooth(prog(τ, e5.pule[0], e5.pule[1]));
  const dibCanica = (x: number, y: number, R: number) => {
    if (rug < .02) canica(c, x, y, R, "v", x / R, vivo);
    else if (pul < 1) { bolita(c, x, y, R * (1 + .08 * rug), rug * (1 - pul), vivo * (1 - pul)); if (pul > 0) canica(c, x, y, R, "r", 0, vivo * pul); }
    else canica(c, x, y, R, "r", x / R, vivo);
  };
  const conMarble = (τ > e5.atrapa - .05 && τ < e5.tira + .05) || (τ > e5.vuelve - .05 && τ < e5.tira2 + .05);
  if (p && !conMarble) dibCanica(p[0], p[1], RC);
  c.save(); c.translate(E.x, yc); c.rotate(-.9 * vuelca);
  poli(c, [[-50, -36], [50, -36], [38, 20], [-38, 20]], BLANCO, 4); c.restore();
  const R5 = M5.rev, revisando = (τ > e5.revisa && τ < e5.cae) || (τ > e5.palomita - .06 && τ < e5.sale);
  caja(c, R5.x, R5.y, R5.w, R5.h, t, revisando ? .5 : 0);
  hoyo(c, 420, 598, 90, 16);
  const trampa = ventana(τ, e5.cae - .04, e5.cae + .2, .06, .2), puerta = ventana(τ, e5.sale - .05, e5.sale + .3, .06, .25);
  c.strokeStyle = TINTA; c.lineWidth = 8; c.lineCap = "round";
  c.beginPath(); c.moveTo(R5.x + 16, R5.y + R5.h); c.lineTo(R5.x + 16 + Math.cos(1.3 * trampa) * 100, R5.y + R5.h + Math.sin(1.3 * trampa) * 100); c.stroke();
  c.beginPath(); c.moveTo(R5.x + R5.w - 100, R5.y + R5.h); c.lineTo(R5.x + R5.w - 100 + Math.cos(1.3 * puerta) * 100, R5.y + R5.h + Math.sin(1.3 * puerta) * 100); c.stroke();
  const [lx, ly] = M5.lente;
  c.fillStyle = "#E9EEEE"; c.beginPath(); c.arc(lx, ly, 84, 0, 7); c.fill();
  if (revisando) { c.save(); c.beginPath(); c.arc(lx, ly, 82, 0, 7); c.clip(); dibCanica(lx + 6 * Math.sin(t * 9), ly, RC * 1.6); c.restore(); }
  c.strokeStyle = TINTA; c.lineWidth = 11; c.beginPath(); c.arc(lx, ly, 84, 0, 7); c.stroke();
  c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 6; c.beginPath(); c.arc(lx, ly, 60, 3.7, 4.4); c.stroke();
  const kT = prog(τ, e5.tache, e5.tache + .18), kP = prog(τ, e5.palomita, e5.palomita + .25);
  if (kT > 0 && τ < e5.tache + 1) { c.save(); c.globalAlpha = 1 - smooth(prog(τ, e5.tache + .7, e5.tache + 1)); tache(c, 295, 490, ease.outCubic(kT) * 1.2, 1.15); c.restore(); }
  if (kP > 0 && τ < e5.palomita + 1.6) { c.save(); c.globalAlpha = 1 - smooth(prog(τ, e5.palomita + 1.2, e5.palomita + 1.6)); palomita(c, 300, 500, ease.outCubic(kP), ACENTO, 1.15); c.restore(); }
  const g = M5.R / 90;
  repisa(c, 660, 930, M5.by + M5.R - 4);
  let h1: V = [M5.bx - 160, M5.by - 30 + 8 * vaiven(t, .7)], h2: V = [M5.bx + 120, M5.by - 70 + 8 * vaiven(t, .8, 1)];
  if (conMarble) {
    const am = (τ > e5.hace[0] && τ < e5.hace[1]) ? 18 * Math.sin(τ * 26) : (τ > e5.pule[0] && τ < e5.pule[1]) ? 14 : 0;
    const ga = (τ > e5.pule[0] && τ < e5.pule[1]) ? τ * 40 : 0;
    h1 = [M5.trabajo[0] - 56 - Math.abs(am) + Math.cos(ga) * am * .5, M5.trabajo[1] + 24 + Math.sin(ga) * am * .5];
    h2 = [M5.trabajo[0] + 56 + Math.abs(am) - Math.cos(ga) * am * .5, M5.trabajo[1] + 24 - Math.sin(ga) * am * .5];
  }
  for (const tt of [e5.tira, e5.tira2]) { const k = ventana(τ, tt - .05, tt + .12, .05, .2); if (k > 0) h1 = [lerp(h1[0], 640, k), lerp(h1[1], 400, k)]; }
  brazo(c, M5.bx - 54 * g, M5.by - 50 * g, h1[0], h1[1], 70 * g, conMarble ? .2 : .6, TINTA, 1, g);
  brazo(c, M5.bx + 60 * g, M5.by - 30 * g, h2[0], h2[1], -70 * g, conMarble ? .2 : .6, TINTA, 1, g);
  bola(c, M5.bx, M5.by, M5.R);
  if (p && conMarble) dibCanica(p[0], p[1], RC);
  embudo(c, 540, 20, 150);
}

// la torre en el mundo
const LOOP: [number, number][] = [[31.0, 35.45], [35.0, 40.05], [40.0, 46.05], [45.6, 50.15], [50.0, 55.3]];
const tau = (k: number, t: number) => { const [a, b] = LOOP[k - 1]; return t < b ? t : a + ((t - b) % (b - a)); };
const tauOtra = (k: number, t: number, off: number) => { const [a, b] = LOOP[k - 1]; return a + (((t + off - a) % (b - a)) + (b - a)) % (b - a); };
const MODS = [modulo1, modulo2, modulo3, modulo4, modulo5];
const NOMBRES = ["encadenar", "enrutar", "paralelizar", "orquestador", "evaluador"];
const origenY = (k: number) => MESA - (6 - k) * MH;
const llegaMod = (k: number) => ev.caen[5 - k];
const encendido = (k: number, t: number) => {
  if (k < 3) return 1;
  const a = ev.apagan[5 - k], q = prog(t, a, a + .16);
  return q <= 0 ? 1 : q >= 1 ? 0 : (Math.sin(q * 40) > 0 ? .9 : .2) * (1 - q);
};

function dibujaModulo(c: C, k: number, τ: number, t: number, on: number, det: boolean) {
  c.save(); c.globalAlpha *= lerp(.13, 1, on);
  tablero(c, det);
  // lo que cae desde arriba no se dibuja fuera de su tablero: en la torre pasaba por encima de los rótulos
  c.beginPath(); c.rect(-40, -6, 1160, MH + 130); c.clip();
  MODS[k - 1](c, τ, t, on > .5 ? 1 : 0);
  c.restore();
}
function torre(c: C, t: number, z: number) {
  for (let k = 5; k >= 1; k--) {
    const L = llegaMod(k);
    if (t < L - .5) continue;
    const cae = t < L ? -2600 * ((L - t) / .5) ** 2 : -brinco(t, L, 26, 9, 20);
    const salto = t > ev.presume ? -brinco(t, ev.presume + (k - 1) * .07, 60, 8, 14) : 0;
    c.save(); c.translate(TX, origenY(k) + cae + salto);
    dibujaModulo(c, k, tau(k, t), t, encendido(k, t), z > .35);
    const pulso = k === 1 ? ventana(t, ev.una, ev.dos2 + .9, .1, .4) : k === 2 ? ventana(t, ev.dos2, ev.antes, .1, .4) : 0;
    if (pulso > 0) { c.save(); c.globalAlpha = pulso; c.strokeStyle = ACENTO; c.lineWidth = 14 + 6 * Math.sin(t * 7); c.strokeRect(-14, -10, 1108, MH + 8); c.restore(); }
    c.restore();
  }
  const vis = smooth(prog(t, ev.otras, ev.otras + .3)) * (1 - smooth(prog(t, ev.apaga, ev.apaga + .4)));
  if (vis > 0) {
    const OTRAS: { x: number; mods: number[] }[] = [{ x: TX - 1650 + 108, mods: [2, 1, 5] }, { x: TX + 1650 + 108, mods: [1, 3, 4, 5] }];
    OTRAS.forEach((o, n) => {
      o.mods.forEach((k, j) => {
        const L = ev.otras + .2 + (o.mods.length - 1 - j) * .1 + n * .05, sc = .8;
        if (t < L - .4) return;
        const cae = t < L ? -2600 * ((L - t) / .4) ** 2 : -brinco(t, L, 20, 9, 20);
        const salto = t > ev.presume ? -brinco(t, ev.presume + (n * 3 + j) * .06, 50, 8, 14) : 0;
        c.save(); c.globalAlpha = vis; c.translate(o.x, MESA - (o.mods.length - j) * MH * sc + cae + salto); c.scale(sc, sc);
        dibujaModulo(c, k, tauOtra(k, t, 1.3 * j + n * .7), t, 1, false);
        c.restore();
      });
    });
  }
}

// ======================================================================================================
// 4. LA PREGUNTA: dos caminos (coordenadas de pantalla con la cámara en reposo, pasadas al mundo)
// ======================================================================================================
const RD = 92, GD = 22;
const W = (x: number, y: number): V => [DXc - 540 + x, y - 20];
const BD: V = W(470, 560);
const PASOS = [ruta([W(330, 672), W(110, 800)]), ruta([W(130, 892), W(560, 1032)]), ruta([W(545, 1122), W(290, 1232)])];
const VD = { x: W(225, 0)[0], y: W(0, 1316)[1], w: 214, h: 140 };
const TD = ev.tramosD;
const PD: Pierna[] = [
  { a: TD[0], b: TD[1], de: BD, a2: W(338, 560), arco: .0001 },
  { a: TD[1], b: TD[2], de: W(338, 560), a2: ps(PASOS[0], 0, RD, GD) },
  { a: TD[2], b: TD[3], r: PASOS[0], R: RD },
  { a: TD[3], b: TD[4], de: ps(PASOS[0], 1, RD, GD), a2: ps(PASOS[1], 0, RD, GD) },
  { a: TD[4], b: TD[5], r: PASOS[1], R: RD },
  { a: TD[5], b: TD[6], de: ps(PASOS[1], 1, RD, GD), a2: ps(PASOS[2], 0, RD, GD) },
  { a: TD[6], b: TD[7], r: PASOS[2], R: RD },
  { a: TD[7], b: TD[8], de: ps(PASOS[2], 1, RD, GD), a2: [VD.x, VD.y + 4] },
  { a: TD[8], b: 1e9, fijo: [VD.x, VD.y + 4] },
];
function escenaD(c: C, t: number) {
  // la torre enorme que todavía no existe: puro contorno punteado
  const fant = prog(t, ev.enorme - .05, ev.enorme + .9) * (1 - smooth(prog(t, ev.cara, ev.cara + .8)));
  if (fant > 0) {
    const [cx] = W(540, 0);
    c.save(); c.strokeStyle = "rgba(17,17,17,.5)"; c.lineWidth = 9; c.setLineDash([26, 20]); c.lineDashOffset = -t * 60;
    for (let j = 0; j < 9; j++) {
      const k = clamp(fant * 9 - j); if (k <= 0) break;
      const y1 = W(0, 600)[1] - j * 760, y0 = y1 - 760 * k, w = 700 + (j % 3) * 80;
      c.strokeRect(cx - w / 2, y0, w, y1 - y0);
      c.beginPath(); c.moveTo(cx - w / 2 + 60, y1 - 160); c.lineTo(cx - w / 2 + 60 + (w - 140) * k, y1 - 160 - 300 * k); c.stroke();
    }
    c.restore();
  }
  // las repisas
  const [r0x, r0y] = W(320, 650), [r1x] = W(780, 0);
  repisa(c, r0x, r1x, r0y);
  const [v0x, v0y] = W(110, 1458), [v1x] = W(345, 0);
  repisa(c, v0x, v1x, v0y);
  // el riel trazado: tres pasos, uno debajo del otro
  const lp = prog(t, ev.lapiz2[0], ev.lapiz2[1]);
  if (lp > 0) {
    const gros = prog(t, ev.lapiz2[1], ev.lapiz2[1] + .3);
    PASOS.forEach((r, i) => { const k = clamp(lp * 3 - i); if (k > 0) riel(c, r, { a: ease.inOutCubic(k), g: GD, lapiz: gros }); });
    vasoFondo(c, VD.x, VD.y, VD.w);
  }
  // la ruta que seguiría: punteado rojo sobre los pasos
  const ruta2 = ventana(t, ev.siga - .1, ev.rueda2[0] + .3, .3, .3);
  if (ruta2 > 0) {
    c.save(); c.globalAlpha = ruta2; c.strokeStyle = ACENTO; c.lineWidth = 8; c.setLineDash([3, 20]); c.lineCap = "round"; c.lineDashOffset = -t * 90;
    c.beginPath();
    const P: V[] = [W(440, 600), ...PASOS.flatMap((r) => [r.p[0], r.p[1]]).map(([x, y]): V => [x, y - 52]), [VD.x, VD.y - 30]];
    P.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke(); c.restore();
  }
  // el otro camino: rieles que todavía no existen
  const otro = ventana(t, ev.decidir - .25, ev.suelta + .3, .3, .5);
  if (otro > 0) {
    c.save(); c.globalAlpha = otro * (t < ev.pasos0 ? 1 : .45); c.strokeStyle = TINTA; c.lineWidth = 10; c.setLineDash([5, 22]); c.lineCap = "round"; c.lineDashOffset = -t * 70;
    const O = W(790, 670);
    const R3: V[][] = [[O, [O[0] + 120, O[1] + 170], [O[0] + 60, O[1] + 420]], [O, [O[0] - 40, O[1] + 300], [O[0] + 90, O[1] + 620]], [O, [O[0] + 150, O[1] + 60], [O[0] + 220, O[1] + 280]], [[O[0] - 40, O[1] + 300], [O[0] - 210, O[1] + 520]]];
    R3.forEach((L, i) => {
      const b = .15 + .85 * smooth(prog(t, ev.decidir - .2 + i * .15, ev.decidir + .4 + i * .15));
      c.beginPath(); c.moveTo(L[0][0], L[0][1]);
      for (let j = 1; j < L.length; j++) c.lineTo(lerp(L[j - 1][0], L[j][0], b), lerp(L[j - 1][1], L[j][1], b) + 12 * vaiven(t, 1.1 + i * .2));
      c.stroke();
    });
    c.restore();
  }
  // la pila de rieles: primero en brazos, luego en la repisa
  const deja = ease.inOutCubic(prog(t, ev.deja - .25, ev.deja + .05));
  const tamb = t < ev.deja ? .05 + .07 * smooth(prog(t, ev.antes, ev.enorme + .6)) : .01;
  const [pdx, pdy] = W(680, 634);
  const pilaX = lerp(BD[0], pdx, deja), pilaY = lerp(BD[1] - RD - 74, pdy, deja);
  // la bola
  let [bx, by] = BD;
  const p = trayecto(t, PD, RD);
  if (p) [bx, by] = p;
  if (t > ev.fin) by -= brinco(t, ev.fin, 20, 6, 15);
  const g = RD / 90, recoge = 1 - ease.inCubic(prog(t, ev.guarda2[0], ev.guarda2[1]));
  let h1: V = [bx - 120, by - 150 + 8 * vaiven(t, .9)], h2: V = [bx + 120, by - 150 + 8 * vaiven(t, .8, 1)];
  if (t < ev.deja + .1) { h1 = [pilaX - 76, pilaY + 30]; h2 = [pilaX + 76, pilaY + 30]; }
  const ofrece = ventana(t, ev.decidir - .2, ev.suelta, .35, .25);
  const [ox, oy] = W(870, 600);
  const piezaMano: V = [lerp(bx + 120, ox, ofrece), lerp(by - 150, oy, ofrece) + 10 * vaiven(t, .6)];
  const conPieza = t > ev.deja + .1 && t < ev.suelta + .2;
  if (conPieza) h2 = [piezaMano[0] - 10, piezaMano[1] + 24];
  const regresa = prog(t, ev.suelta, ev.suelta + .25);
  if (regresa > 0 && regresa < 1) h2 = [lerp(ox, pdx, regresa), lerp(oy + 30, pdy - 200, regresa)];
  if (recoge > .02 && t < ev.rueda2[0] + .05) {
    brazo(c, bx - 54 * g, by - 50 * g, h1[0], h1[1], 90 * g, t < ev.deja + .1 ? .2 : .55, TINTA, recoge, g * (.4 + .6 * recoge));
    brazo(c, bx + 60 * g, by - 30 * g, h2[0], h2[1], -100 * g, t < ev.deja + .1 || conPieza ? .2 : .55, TINTA, recoge, g * (.4 + .6 * recoge));
  }
  for (let j = 0; j < 8; j++) {
    if (j === 7 && t < ev.suelta + .2 && t > ev.deja + .1) continue;
    const ang = tamb * Math.sin(t * 5.3 + j * .7) * (j + 1) * .5;
    pieza(c, pilaX + ang * 60 * (t < ev.deja ? 1 : 0), pilaY - j * 24, ang, 1.25, 130);
  }
  if (conPieza) pieza(c, piezaMano[0], piezaMano[1], .12 * vaiven(t, .7), 1.25, 130);
  if (t > TD[7]) vasoFondo(c, VD.x, VD.y, VD.w);
  bola(c, bx, by, RD);
  if (lp > 0 && lp < 1) { const i = Math.min(2, Math.floor(lp * 3)), q = en(PASOS[i], ease.inOutCubic(clamp(lp * 3 - i))); lapiz(c, q.x, q.y, -.4 + .06 * Math.sin(t * 30)); }
  if (lp > 0) vasoCuerpo(c, VD.x, VD.y, VD.w, VD.h);
}

// ======================================================================================================
// cámara, pared y mesa
// ======================================================================================================
type K3 = { x: number; y: number; z: number };
type CK = { t: number; x: number | ((t: number) => number); y: number | ((t: number) => number); z: number; d: number; f?: (x: number) => number };
function vuela(a: K3, b: K3, k: number): K3 {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const z = a.z * (b.z / a.z) ** k;
  const w = Math.abs(b.z - a.z) < 1e-4 ? 1 - k : (1 / z - 1 / b.z) / (1 / a.z - 1 / b.z);
  return { x: b.x + (a.x - b.x) * w, y: b.y + (a.y - b.y) * w, z };
}
const VISTA: K3 = { x: TX + 540, y: -1550, z: .21 };
const VISTA2: K3 = { x: TX + 540, y: MESA - 4000, z: .175 };
const DOS: K3 = { x: TX + 540, y: MESA - 5000 - 10, z: .5 };
const MZ = (k: number): K3 => ({ x: TX + 540, y: origenY(k) + 620, z: 1 });
const sigueX = (t: number) => lerp(540, bolaA(t - .08).x, .5);
const sigueY = (t: number) => bolaA(t - .08).y - 230;
const CK: CK[] = [
  { t: -1, x: sigueX, y: sigueY, z: 1.3, d: 0 },
  { t: ev.frena - .15, x: 540, y: 1130, z: .95, d: .9 },
  { t: ev.hoja + .4, x: 540, y: 1110, z: 1.02, d: 4.2, f: (x) => x },
  { t: ev.giroB, x: BX + 540, y: 960, z: 1, d: .5 },
  { t: ev.giroB + .55, x: BX + 560, y: 905, z: 1.07, d: 2.6, f: ease.inOutSine },
  { t: ev.recorre[1] + .1, x: BX + 540, y: 1000, z: 1.04, d: 2.5, f: (x) => x },
  { t: ev.bajaB, x: BX + 505, y: 1745, z: 1.08, d: .75 },
  { t: ev.torre, ...VISTA, d: .85 },
  { t: ev.zoom1, ...MZ(1), d: 1.0 },
  { t: ev.zoom2, ...MZ(2), d: .6 },
  { t: ev.zoom3, ...MZ(3), d: .6 },
  { t: ev.zoom4, ...MZ(4), d: .6 },
  { t: ev.zoom5, ...MZ(5), d: .6 },
  { t: ev.vista, ...VISTA, d: 1.0 },
  { t: ev.otras - .2, ...VISTA2, d: .8 },
  { t: ev.apaga + .35, ...DOS, d: 1.4 },
  { t: ev.antes - .25, x: DXc, y: 940, z: 1, d: 1.0 },
  { t: ev.enorme - .05, x: DXc, y: -500, z: .45, d: .75 },
  { t: ev.hazte - .15, x: DXc, y: 940, z: 1, d: .75 },
  { t: ev.fin - .3, x: DXc - 60, y: 1000, z: 1.05, d: 2.4, f: ease.inOutSine },
];
const GOLPES: [number, number][] = [[ev.A1[1] + .2, 10], [ev.A2[1] + .18, 10], [ev.vaso, 7], ...ev.caen.map((x): [number, number] => [x, 12]), [ev.apaga, 5], [ev.deja, 7], [ev.fin, 8]];
function camara(t: number) {
  const val = (v: number | ((t: number) => number)) => (typeof v === "number" ? v : v(t));
  let cur: K3 = { x: val(CK[0].x), y: val(CK[0].y), z: CK[0].z };
  for (let i = 1; i < CK.length; i++) {
    const k = CK[i]; if (t < k.t) break;
    cur = vuela(cur, { x: val(k.x), y: val(k.y), z: k.z }, (k.f ?? ease.inOutCubic)(prog(t, k.t, k.t + k.d)));
  }
  let sx = 0, sy = 0;
  for (const [g, a] of GOLPES) if (t > g && t < g + 1) { const q = a * Math.exp(-(t - g) * 8); sx += q * Math.sin((t - g) * 57); sy += q * Math.sin((t - g) * 43 + 1); }
  return { x: cur.x + (9 * vaiven(t, 6.3) + sx) / cur.z, y: cur.y + (11 * vaiven(t, 4.9, 1) + sy) / cur.z, z: cur.z * (1 + .012 * vaiven(t, 5.7, 2)), r: .004 * vaiven(t, 8.1) };
}

function pared(c: C, K: { x: number; y: number; z: number }) {
  if (K.z < .42) return;
  const hw = 600 / K.z, hh = 1020 / K.z, P = 60;
  c.save(); c.globalAlpha = smooth(prog(K.z, .42, .6)); c.fillStyle = HUECO;
  for (let y = Math.floor((K.y - hh) / P) * P; y < K.y + hh; y += P) for (let x = Math.floor((K.x - hw) / P) * P; x < K.x + hw; x += P) { c.beginPath(); c.arc(x + ((y / P) % 2) * 0, y, 4, 0, 7); c.fill(); }
  c.restore();
}
function mesa(c: C, K: { x: number; y: number; z: number }) {
  const x0 = 4300, x1 = 11200;
  if (K.y + 1100 / K.z < MESA - 60) return;
  c.fillStyle = "rgba(30,24,16,.18)"; c.fillRect(x0, MESA + 120, x1 - x0, 60);
  c.fillStyle = "#DCC59C"; c.fillRect(x0, MESA - 40, x1 - x0, 40);
  c.fillStyle = "#B88F5B"; c.fillRect(x0, MESA, x1 - x0, 120);
  c.strokeStyle = VETA; c.lineWidth = 3; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(x0, MESA + 30 + i * 30); c.lineTo(x1, MESA + 26 + i * 32); c.stroke(); }
  c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.moveTo(x0, MESA - 40); c.lineTo(x1, MESA - 40); c.moveTo(x0, MESA); c.lineTo(x1, MESA); c.moveTo(x0, MESA + 120); c.lineTo(x1, MESA + 120); c.stroke();
}
function polvo(c: C, t: number) {
  const r = azar(9);
  c.fillStyle = TINTA;
  for (let i = 0; i < 60; i++) {
    const x0 = r() * 1200 - 60, y0 = r() * 2060, v = 16 + r() * 40, f = r() * 6.3, z = 1.6 + r() * 3;
    const y = ((y0 - t * v) % 2060 + 2060) % 2060 - 70, x = x0 + Math.sin(t * .55 + f) * 30;
    c.globalAlpha = .06 + r() * .14; c.fillRect(x, y, z, z);
  }
  c.globalAlpha = 1;
}

// ======================================================================================================
// textos en pantalla
// ======================================================================================================
const aPantalla = (K: { x: number; y: number; z: number }, x: number, y: number): V => [540 + (x - K.x) * K.z, 960 + (y - K.y) * K.z];
const NOMBRE_T = [ev.nombre[0], ev.nombre[1], ev.nombre[2], ev.nombre[3], ev.nombre[4]];
const FIN_T = [ev.zoom2, ev.zoom3, ev.zoom4, ev.zoom5, ev.vista];
const TITULOS = ["Encadenar", "Enrutar", "Paralelizar", "Orquestador", "Evaluador"];
const INGLES = ["prompt chaining", "routing", "parallelization", "orchestrator-workers", "evaluator-optimizer"];

function textos(c: C, t: number, K: { x: number; y: number; z: number }) {
  rotulo(c, t, s("casi"), ev.hoja - .1, "casi no usarlos", 1548, 126, ACENTO, true);
  rotulo(c, t, s("libertad") - .1, s("pero más costo") - .15, "más libertad", 290, 124, TINTA, true);
  rotulo(c, t, s("pero más costo") - .05, ev.errores - .15, "más costo", 290, 124, TINTA, true);
  rotulo(c, t, ev.errores - .05, ev.torre - .05, "errores", 270, 124, ACENTO, true);
  rotulo(c, t, s("difíciles") - .05, ev.torre - .05, "difíciles de encontrar", 366, 78, TINTA, true);
  rotulo(c, t, s("cinco piezas") - .05, ev.zoom1 + .1, "cinco piezas", 215, 124, TINTA, true);
  // números junto a cada módulo mientras caen
  for (let k = 1; k <= 5; k++) {
    const L = llegaMod(k), a = smooth(prog(t, L, L + .2)) * (1 - smooth(prog(t, ev.zoom1, ev.zoom1 + .3)));
    if (a <= 0) continue;
    const [, y] = aPantalla(K, TX + 540, origenY(k) + MH / 2);
    texto(c, String(k), 760, y + 40, { fuente: serif(110, true), color: k === 1 ? ACENTO : TINTA, alfa: a });
  }
  for (let k = 0; k < 5; k++) {
    const a = smooth(prog(t, NOMBRE_T[k] - .05, NOMBRE_T[k] + .15)) * (1 - smooth(prog(t, FIN_T[k] - .15, FIN_T[k] + .1)));
    if (a <= 0) continue;
    texto(c, TITULOS[k], 540, 228 + (1 - ease.outCubic(prog(t, NOMBRE_T[k] - .05, NOMBRE_T[k] + .3))) * 18, { fuente: serif(130), color: TINTA, alfa: a });
    texto(c, INGLES[k], 540, 296, { fuente: mono(40), color: GRIS, alfa: a * smooth(prog(t, NOMBRE_T[k] + .1, NOMBRE_T[k] + .35)) });
  }
  // repaso: los cinco nombres junto a la torre
  for (let k = 1; k <= 5; k++) {
    const a = smooth(prog(t, ev.nombres + (k - 1) * .2, ev.nombres + (k - 1) * .2 + .2)) * (1 - smooth(prog(t, ev.otras - .3, ev.otras)));
    if (a <= 0) continue;
    const [x, y] = aPantalla(K, TX, origenY(k) + MH / 2);
    texto(c, NOMBRES[k - 1], x - 34, y + 24, { fuente: serif(76, true), color: TINTA, alin: "right", alfa: a });
  }
  rotulo(c, t, s("cualquier") - .05, ev.apaga - .1, "cualquier sistema", 300, 116, TINTA, true);
  rotulo(c, t, ev.una - .05, ev.antes - .2, "una o dos", 226, 124, ACENTO, true);
  rotulo(c, t, ev.cara - .05, ev.lapiz2[0] + .4, "la pregunta más cara", 286, 108, TINTA, true);
  rotulo(c, t, ev.decidir - .05, ev.pasos0 - .2, "¿decidir solo?", 286, 120, TINTA, true);
  rotulo(c, t, ev.pasos0 + .05, ev.fin + .2, "¿o seguir los pasos?", 286, 104, TINTA, true);
}

// ======================================================================================================
function dibuja(c: C, t: number) {
  FR = Math.floor(t * 10);
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  const K = camara(t);
  c.save(); c.translate(540, 960); c.rotate(K.r); c.scale(K.z, K.z); c.translate(-K.x, -K.y);
  const hw = 620 / K.z, hh = 1040 / K.z;
  const ve = (x0: number, x1: number, y0: number, y1: number) => K.x + hw > x0 && K.x - hw < x1 && K.y + hh > y0 && K.y - hh < y1;
  pared(c, K);
  mesa(c, K);
  if (t < ev.giroB + 1 && ve(-200, 1300, -300, 1700)) escenaA(c, t);
  if (t > ev.giroB - .3 && t < ev.torre + 1.2 && ve(BX - 200, BX + 1300, 200, 2400)) escenaB(c, t);
  if (t > ev.torre - .3 && ve(TX - 2600, TX + 3700, MESA - 6600, MESA + 300)) torre(c, t, K.z);
  if (t > ev.antes - .5 && ve(DXc - 800, DXc + 800, -7000, MESA + 400)) escenaD(c, t);
  c.restore();
  const banda = ventana(t, ev.zoom1 + .55, ev.vista + .1, .3, .4);
  if (banda > 0) {
    const gr = c.createLinearGradient(0, 0, 0, 345);
    gr.addColorStop(0, "rgba(244,242,236,1)"); gr.addColorStop(.86, "rgba(244,242,236,1)"); gr.addColorStop(1, "rgba(244,242,236,0)");
    c.save(); c.globalAlpha = banda; c.fillStyle = gr; c.fillRect(0, 0, 1080, 345); c.restore();
  }
  polvo(c, t);
  textos(c, t, K);
}

export const Pieza: React.FC = () => <Lienzo dibuja={(c, t) => dibuja(c, t)} preparar={() => ({})} />;
