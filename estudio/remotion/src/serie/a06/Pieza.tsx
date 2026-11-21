// Serie 2, capítulo 6. La misma mesa del capítulo 5, vista desde el techo: kraft, escuadras negras y la nota del
// marco rojo. La bola nueva cae hacia la mesa, una goma lo borra todo y lo único que sobrevive es un libro de
// actas negro con esquinas rojas. En el capítulo 5 fuera de la mesa no había nada; aquí aparece un archivero, y lo
// que lo vuelve memoria es que se relee: sin la nota, la bola no sabe nada. Lo que se daña después es esa misma
// hoja: la goma se come un "no", alguien escribe "reguetón" con pluma roja y demasiadas hojas tapan la mesa.
// Todos los tiempos vienen de t.json, que escribe partitura.py: dibujo y sonido son los mismos números.
import React from "react";
import { azar, clamp, ease, lerp, prog, resorte, smooth, texto } from "../../kit";
import { ACENTO, bola, flecha, GRIS, Lienzo, LUZ, mono, NOCHE, PAPEL, rotulo, serif, TINTA } from "../../marca";
import { brazo } from "../../personaje";
import A from "./t.json";
import duracion from "./duracion.json";

export const DURACION = duracion.dur;
type Ctx = CanvasRenderingContext2D;
type Pt = [number, number];
type Pag = (c: Ctx, t: number) => void;
type D = { f: HTMLCanvasElement; b: HTMLCanvasElement; fc: Ctx; bc: Ctx; veta: HTMLCanvasElement; patron: CanvasPattern };

const TAU = Math.PI * 2;
const MESA = { x: 60, y: 250, w: 960, h: 960 };
const KRAFT = "#CFBC98", HOJA = "#FFFFFF";
const PW = 440, PH = 620, HD = 2.4, BY = 730, PT = BY - PH / 2, NY = 722;
const BP: Pt = [540, 1180];
const FX = 1900;

const en = (t: number, a: number, b: number) => t >= a && t < b;
const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * TAU + f);
function tramos(t: number, v0: number, S: [number, number, number, ((x: number) => number)?][]) {
  let v = v0;
  for (const [a, b, x, f] of S) { if (t <= a) break; v = lerp(v, x, (f ?? smooth)(prog(t, a, b))); }
  return v;
}
function linea(c: Ctx, ax: number, ay: number, bx: number, by: number) { c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); }
function circulo(c: Ctx, x: number, y: number, r: number) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
function caja(c: Ctx, x: number, y: number, w: number, h: number, r: number) { c.beginPath(); c.roundRect(x, y, w, h, r); }

/** Sombra suave sin blur: capas que se abren. */
function sombraPlana(c: Ctx, x: number, y: number, w: number, h: number, r: number, alfa = .1, alt = 0) {
  for (const [e, a] of [[2, 1], [8, .62], [16, .4], [28, .22]]) {
    c.fillStyle = `rgba(20,18,14,${alfa * a})`;
    caja(c, x - e + 7 + alt * 40, y - e + 10 + alt * 56, w + e * 2, h + e * 2, r + e); c.fill();
  }
}
/** Escribe de izquierda a derecha, como una mano. Devuelve dónde va la punta. */
function escr(c: Ctx, s: string, x: number, y: number, fu: string, k: number, color = TINTA): Pt {
  c.font = fu;
  const w = c.measureText(s).width;
  const q = clamp(k);
  if (q > 0) {
    c.save(); c.beginPath(); c.rect(x - 8, y - 260, (w + 24) * q, 360); c.clip();
    texto(c, s, x, y, { fuente: fu, color, alin: "left" }); c.restore();
  }
  return [x + w * q, y - 8];
}
/** La mano va a cada evento y regresa al reposo. */
function alcance(t: number, L: { t: number; p: Pt }[], reposo: Pt, pre = .13, post = .2): Pt {
  for (const e of L) {
    if (t >= e.t - pre && t < e.t + post) {
      const k = t < e.t ? smooth(prog(t, e.t - pre, e.t)) : 1 - smooth(prog(t, e.t + .03, e.t + post));
      return [lerp(reposo[0], e.p[0], k), lerp(reposo[1], e.p[1], k)];
    }
  }
  return reposo;
}

// ---------- cámara y luz ----------
type V = [number, number, number];
const V0: V = [540, 830, 1], DER: V = [762, 736, 2.12];
const CAM: [number, number, V, ((x: number) => number)?][] = [
  [-1, .01, [540, 770, 1.1]],
  [A.cal - .3, .5, V0],
  [A.modelo + .02, .72, [540, 1060, 3]],
  [A.tel - .58, .58, [540, 900, 1.12]],
  [A.lev + .1, .55, V0],
  [A.plaf + .04, .62, [540, NY + 12, 2.0]],
  [A.norec - .28, .5, V0],
  [A.leer - .25, .85, [346, 766, 1.62]],
  [A.pag - .05, .62, DER],
  [A.cierra - .24, .6, [540, 800, 1.12]],
  [A.c1 - .14, .52, DER],
  [A.seq - .12, .52, [FX, 900, 1], ease.inOutCubic],
  [A.c2 - .4, .46, DER],
  [A.cam - .34, .46, [FX, 900, 1]],
  [A.c3 - .38, .46, V0],
  [A.lee2 - .15, .85, DER],
  [A.cierra3 - .12, .62, [540, 800, 1.12]],
  [A.cerrado3 + .5, 3.2, [540, 720, 1.2], ease.inOutSine],
];
function camara(t: number): V {
  let v = V0;
  for (const [a, d, b, f] of CAM) {
    if (t <= a) break;
    const k = (f ?? ease.inOutCubic)(prog(t, a, a + d));
    v = [lerp(v[0], b[0], k), lerp(v[1], b[1], k), v[2] * (b[2] / v[2]) ** k];
  }
  return v;
}
const GOLPES: [number, number][] = [[A.cae, 34], [A.cal, 16], [A.lunes + .1, 10], [A.libro0, 30], [A.fijo, 14], [A.tel, 12], [A.slam1 + .18, 9], [A.nueva, 10], [A.plaf, 12], [A.librot, 24], [A.cae2, 10],
  [A.cerrado, 26], [A.charola, 24], [A.cree, 22], [A.llena, 12], [A.cuad + .1, 14], [A.cerrado3, 12]];
function sacude(t: number): Pt {
  let x = 0, y = 0;
  for (const [ti, a] of GOLPES) { const d = t - ti; if (d < 0 || d > .8) continue; const e = a * Math.exp(-d * 9); x += e * Math.sin(d * 61); y += e * Math.cos(d * 47); }
  return [x, y];
}
/** Sol de ventana cruzando la mesa: el paso del tiempo es lo que nunca se detiene en este capítulo. */
function persianas(c: Ctx, t: number) {
  const P = 460, x0 = (t * 92 + 40 * Math.sin(t * .4)) % P;
  c.save(); c.translate(540, 960); c.rotate(-.5);
  for (let i = -4; i <= 4; i++) {
    const x = i * P + x0, g = c.createLinearGradient(x - P / 2, 0, x + P / 2, 0);
    g.addColorStop(0, "rgba(58,48,28,0)"); g.addColorStop(.5, "rgba(58,48,28,.1)"); g.addColorStop(1, "rgba(58,48,28,0)");
    c.fillStyle = g; c.fillRect(x - P / 2, -1500, P, 3000);
  }
  c.restore();
}
function motas(c: Ctx, t: number, color: string, alfa: number) {
  const r = azar(16);
  c.fillStyle = color;
  for (let i = 0; i < 80; i++) {
    const x0 = r() * 1200 - 60, y0 = r() * 2060, v = 18 + r() * 40, f = r() * 6.3, z = 1.6 + r() * 3.2;
    const y = ((y0 - t * v) % 2060 + 2060) % 2060 - 70, x = x0 + Math.sin(t * .55 + f) * 36;
    c.globalAlpha = alfa * (.08 + r() * .18); c.fillRect(x, y, z, z);
  }
  c.globalAlpha = 1;
}

// ---------- el agente, visto desde arriba ----------
function pj(c: Ctx, x: number, y: number, r: number, m1: Pt, m2: Pt, o: { a1?: number; a2?: number; alt?: number; largo?: number; gorro?: number; cofia?: boolean } = {}) {
  const alt = o.alt ?? 0, R = r * (1 + alt), g = R / 90, L = o.largo ?? 1;
  const sx = x + R * .2 + alt * 110, sy = y + R * .3 + alt * 150, sr = R * 1.32 * (1 + alt * .3), sa = .36 / (1 + alt * 1.6);
  const G = c.createRadialGradient(sx, sy, R * .3, sx, sy, sr);
  G.addColorStop(0, `rgba(20,18,14,${sa})`); G.addColorStop(1, "rgba(20,18,14,0)");
  c.fillStyle = G; c.beginPath(); c.arc(sx, sy, sr, 0, TAU); c.fill();
  if (L > .01) {
    brazo(c, x - 54 * g, y - 40 * g, m1[0], m1[1], 80 * g, o.a1 ?? .6, TINTA, L, g);
    brazo(c, x + 60 * g, y - 30 * g, m2[0], m2[1], -90 * g, o.a2 ?? .6, TINTA, L, g);
  }
  bola(c, x, y, R);
  if (o.gorro !== undefined) gorro(c, x, y, R, o.gorro);
  if (o.cofia) cofia(c, x, y, R);
}
function gorro(c: Ctx, x: number, y: number, r: number, rot: number) {
  c.save(); c.translate(x, y - r * .62); c.rotate(rot);
  const h = r * 1.5, b = r * .6;
  c.fillStyle = ACENTO; c.beginPath(); c.moveTo(-b, 0); c.lineTo(0, -h); c.lineTo(b, 0); c.quadraticCurveTo(0, r * .26, -b, 0); c.fill();
  c.strokeStyle = "rgba(255,244,235,.8)"; c.lineWidth = r * .07;
  for (const k of [.32, .62]) { const w = b * (1 - k); c.beginPath(); c.moveTo(-w, -h * k + r * .02); c.quadraticCurveTo(0, -h * k + r * .15, w, -h * k + r * .02); c.stroke(); }
  c.fillStyle = TINTA; circulo(c, 0, -h, r * .17);
  c.restore();
}
function cofia(c: Ctx, x: number, y: number, r: number) {
  c.save(); c.translate(x, y - r * .78);
  c.fillStyle = "#fff"; c.strokeStyle = TINTA; c.lineWidth = r * .07;
  c.beginPath(); c.moveTo(-r * .64, r * .1); c.lineTo(-r * .46, -r * .46); c.quadraticCurveTo(0, -r * .6, r * .46, -r * .46); c.lineTo(r * .64, r * .1); c.quadraticCurveTo(0, r * .34, -r * .64, r * .1); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = ACENTO; c.fillRect(-r * .07, -r * .32, r * .14, r * .42); c.fillRect(-r * .2, -r * .18, r * .4, r * .14);
  c.restore();
}
function nube(c: Ctx, x: number, y: number, w: number, h: number, k: number, bx: number, by: number, f: () => void) {
  if (k <= .01) return;
  for (let i = 0; i < 3; i++) { const u = .3 + i * .22, m = lerp(bx, x, u), n = lerp(by, y, u); c.fillStyle = "#fff"; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.arc(m, n, (10 + i * 6) * k, 0, TAU); c.fill(); c.stroke(); }
  c.save(); c.translate(x, y); c.scale(k, k);
  const B: [number, number, number][] = [];
  for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, q = 1 + .12 * Math.sin(i * 2.3); B.push([Math.cos(a) * w * .36 * q, Math.sin(a) * h * .3 * q, h * .28]); }
  c.fillStyle = "#fff"; c.strokeStyle = TINTA; c.lineWidth = 5;
  for (const [a, b, r] of B) { c.beginPath(); c.arc(a, b, r, 0, TAU); c.stroke(); }
  for (const [a, b, r] of B) circulo(c, a, b, r - 1.5);
  c.fillRect(-w * .36, -h * .3, w * .72, h * .6);
  f();
  c.restore();
}
function globo(c: Ctx, x: number, y: number, w: number, h: number, px: number, py: number, L: string[], fs: number, it = true, color = TINTA, alfa = 1) {
  c.fillStyle = "#fff"; c.strokeStyle = TINTA; c.lineWidth = 6; caja(c, x - w / 2, y - h / 2, w, h, 44); c.fill(); c.stroke();
  const bx = clamp(px, x - w / 2 + 70, x + w / 2 - 70), by = py < y ? y - h / 2 : y + h / 2;
  c.beginPath(); c.moveTo(bx - 36, by); c.lineTo(px, py); c.lineTo(bx + 36, by); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = "#fff"; c.fillRect(bx - 32, by - 7, 64, 14);
  L.forEach((s, i) => texto(c, s, x, y + (i - (L.length - 1) / 2) * fs * 1.08 + fs * .3, { fuente: serif(fs, it), color, alfa }));
}

// ---------- garabatos ----------
function camaron(c: Ctx, x: number, y: number, s: number, rot: number) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  c.strokeStyle = TINTA; c.fillStyle = "#fff"; c.lineWidth = 4.5; c.lineCap = "round"; c.lineJoin = "round";
  c.beginPath(); c.arc(0, 0, 54, -2.5, .9); c.arc(0, 0, 18, .9, -2.5, true); c.closePath(); c.fill(); c.stroke();
  for (let i = 1; i < 6; i++) { const a = lerp(-2.5, .9, i / 6); linea(c, Math.cos(a) * 19, Math.sin(a) * 19, Math.cos(a) * 53, Math.sin(a) * 53); }
  const tx = Math.cos(.9) * 36, ty = Math.sin(.9) * 36;
  c.beginPath(); c.moveTo(tx - 12, ty + 6); c.lineTo(tx - 26, ty + 34); c.lineTo(tx + 2, ty + 18); c.lineTo(tx + 22, ty + 28); c.lineTo(tx + 12, ty - 2); c.stroke();
  const hx = Math.cos(-2.5) * 36, hy = Math.sin(-2.5) * 36;
  c.beginPath(); c.moveTo(hx - 6, hy + 6); c.quadraticCurveTo(hx - 50, hy + 36, hx - 80, hy + 2); c.moveTo(hx - 2, hy - 4); c.quadraticCurveTo(hx - 44, hy - 20, hx - 66, hy - 48); c.stroke();
  c.fillStyle = TINTA; circulo(c, hx + 8, hy + 2, 5.5);
  c.restore();
}
function guitarra(c: Ctx, x: number, y: number, s: number, rot: number, vibra = 0) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  c.strokeStyle = TINTA; c.fillStyle = "#fff"; c.lineWidth = 4.5; c.lineCap = "round";
  c.beginPath(); c.moveTo(0, -32);
  c.bezierCurveTo(38, -32, 34, 2, 22, 8); c.bezierCurveTo(56, 16, 54, 74, 0, 74); c.bezierCurveTo(-54, 74, -56, 16, -22, 8); c.bezierCurveTo(-34, 2, -38, -32, 0, -32); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.arc(0, 26, 15, 0, TAU); c.stroke();
  c.fillStyle = TINTA; c.fillRect(-6, -112, 12, 96); c.fillRect(-11, -136, 22, 28);
  c.lineWidth = 1.8;
  for (const k of [-4, 0, 4]) { c.beginPath(); c.moveTo(k, -110); c.quadraticCurveTo(k + vibra * Math.sin(k + 60), -20, k, 60); c.stroke(); }
  c.restore();
}
function langosta(c: Ctx, x: number, y: number, s: number, rot: number, t: number) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  const O = "#7E2413";
  c.lineCap = "round"; c.lineJoin = "round";
  // antenas
  c.strokeStyle = O; c.lineWidth = 3.5;
  for (const k of [-1, 1]) { c.beginPath(); c.moveTo(k * 12, -112); c.bezierCurveTo(k * 70, -190, k * 130, -170, k * (150 + 6 * Math.sin(t * 5 + k)), -250); c.stroke(); }
  // patas
  c.lineWidth = 7;
  for (const k of [-1, 1]) for (let i = 0; i < 4; i++) { const y0 = -36 + i * 26; c.beginPath(); c.moveTo(k * 52, y0); c.quadraticCurveTo(k * 118, y0 - 8, k * (136 + 4 * Math.sin(t * 7 + i)), y0 + 34); c.stroke(); }
  // tenazas
  for (const k of [-1, 1]) {
    const w = .05 * Math.sin(t * 6 + k);
    c.save(); c.translate(k * 44, -74); c.rotate(k * (.34 + w));
    c.strokeStyle = ACENTO; c.lineWidth = 22; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(k * 62, -22, k * 72, -84); c.stroke();
    c.fillStyle = ACENTO; c.beginPath(); c.moveTo(k * 40, -92); c.bezierCurveTo(k * 6, -150, k * 26, -218, k * 88, -236); c.bezierCurveTo(k * 70, -194, k * 88, -178, k * 104, -170); c.bezierCurveTo(k * 116, -196, k * 142, -204, k * 158, -206); c.bezierCurveTo(k * 168, -136, k * 130, -84, k * 40, -92); c.fill();
    c.strokeStyle = O; c.lineWidth = 3; c.stroke();
    c.restore();
  }
  // cola
  c.fillStyle = ACENTO; c.strokeStyle = O; c.lineWidth = 3;
  for (const a of [-.9, -.45, 0, .45, .9]) { c.save(); c.translate(0, 196); c.rotate(a); c.beginPath(); c.ellipse(0, 40, 24, 50, 0, 0, TAU); c.fill(); c.stroke(); c.restore(); }
  for (let i = 5; i >= 0; i--) { const w = 58 - i * 5; caja(c, -w, 70 + i * 22 - 8, w * 2, 36, 16); c.fill(); c.stroke(); }
  // caparazón
  const G = c.createRadialGradient(-16, -40, 8, 0, -10, 112); G.addColorStop(0, "#E9896C"); G.addColorStop(.55, ACENTO); G.addColorStop(1, "#7E2413");
  c.fillStyle = G; c.beginPath(); c.moveTo(0, -128); c.bezierCurveTo(58, -116, 72, -30, 62, 76); c.lineTo(-62, 76); c.bezierCurveTo(-72, -30, -58, -116, 0, -128); c.fill(); c.stroke();
  c.fillStyle = TINTA; circulo(c, -20, -104, 7); circulo(c, 20, -104, 7);
  c.restore();
}
function bocina(c: Ctx, x: number, y: number, s: number, p: number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  sombraPlana(c, -110, -160, 220, 320, 22, .16);
  c.fillStyle = "#171716"; caja(c, -110, -160, 220, 320, 22); c.fill();
  for (const [yy, r] of [[-78, 44], [56, 76]] as Pt[]) {
    const g = c.createRadialGradient(0, yy, 4, 0, yy, r * (1 + p * .16));
    g.addColorStop(0, "#5c5a56"); g.addColorStop(.3, "#1e1e1d"); g.addColorStop(.8, "#33322f"); g.addColorStop(1, "#090909");
    c.fillStyle = g; circulo(c, 0, yy, r * (1 + p * .16));
    c.strokeStyle = "#8c8a83"; c.lineWidth = 3; c.beginPath(); c.arc(0, yy, r * (1 + p * .16), 0, TAU); c.stroke();
  }
  c.restore();
}
function candado(c: Ctx, x: number, y: number, s: number, cierre: number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.strokeStyle = "#2a2a28"; c.lineWidth = 10; c.lineCap = "round";
  const a = lerp(-14, 0, cierre);
  c.beginPath(); c.moveTo(-22, 8); c.lineTo(-22, -22 + a); c.arc(0, -22 + a, 22, Math.PI, 0); c.lineTo(22, 4 + a); c.stroke();
  const g = c.createLinearGradient(-36, 0, 36, 40); g.addColorStop(0, "#E9896C"); g.addColorStop(.5, ACENTO); g.addColorStop(1, "#7E2413");
  c.fillStyle = g; caja(c, -38, 4, 76, 60, 10); c.fill();
  c.fillStyle = "#2a100a"; circulo(c, 0, 28, 7); c.fillRect(-3, 28, 6, 18);
  c.restore();
}
function perilla(c: Ctx, x: number, y: number, R: number, ang: number) {
  c.fillStyle = "#050505"; circulo(c, x, y, R * 1.06);
  const G = c.createConicGradient(-.9, x, y);
  ([["#E4E1D9", 0], ["#8D8B85", .13], ["#DCD9D1", .26], ["#74726C", .39], ["#D2CFC7", .5], ["#7F7D77", .63], ["#E6E3DB", .76], ["#7A7872", .89], ["#E4E1D9", 1]] as [string, number][]).forEach(([k, s]) => G.addColorStop(s, k));
  c.fillStyle = G; circulo(c, x, y, R * .82);
  c.strokeStyle = TINTA; c.lineWidth = R * .12; c.lineCap = "round";
  linea(c, x + Math.cos(ang) * R * .16, y + Math.sin(ang) * R * .16, x + Math.cos(ang) * R * .72, y + Math.sin(ang) * R * .72);
  c.fillStyle = ACENTO; circulo(c, x + Math.cos(ang) * R * .92, y + Math.sin(ang) * R * .92, R * .1);
}
function goma(c: Ctx, x: number, y: number, rot: number, s: number) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  sombraPlana(c, -190, -100, 380, 200, 26, .14);
  const g = c.createLinearGradient(0, -100, 0, 100); g.addColorStop(0, "#D4573C"); g.addColorStop(1, "#A63620");
  c.fillStyle = g; caja(c, -190, -100, 380, 200, 26); c.fill();
  c.fillStyle = "#F1EFE7"; c.fillRect(-40, -100, 230, 200);
  c.fillStyle = TINTA; c.fillRect(-40, -100, 12, 200);
  c.strokeStyle = TINTA; c.lineWidth = 6; caja(c, -190, -100, 380, 200, 26); c.stroke();
  c.restore();
}
function pluma(c: Ctx, x: number, y: number, a: number, s: number, color = TINTA) {
  c.save(); c.translate(x, y); c.rotate(a); c.scale(s, s);
  c.fillStyle = color; c.beginPath(); c.moveTo(0, 0); c.lineTo(-11, -34); c.lineTo(11, -34); c.closePath(); c.fill();
  caja(c, -11, -170, 22, 136, 5); c.fill();
  c.fillStyle = "#EDEAE3"; c.fillRect(-11, -60, 22, 7);
  c.restore();
}

// ---------- la mesa ----------
function mesa(c: Ctx, d: D) {
  const { x, y, w, h } = MESA;
  sombraPlana(c, x, y, w, h, 4, .13);
  c.drawImage(d.veta, x, y, w, h);
  c.strokeStyle = TINTA; c.lineWidth = 6; c.strokeRect(x, y, w, h);
}
function escuadras(c: Ctx) {
  const { x, y, w, h } = MESA, L = 140, G = 40;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    c.save(); c.translate(x + (sx > 0 ? w : 0), y + (sy > 0 ? h : 0)); c.scale(-sx, -sy);
    c.fillStyle = "#1b1b1a"; c.beginPath(); c.moveTo(-10, -10); c.lineTo(L, -10); c.lineTo(L, G); c.lineTo(G, G); c.lineTo(G, L); c.lineTo(-10, L); c.closePath(); c.fill();
    c.fillStyle = "#77746c"; for (const [a, b] of [[12, 12], [L - 24, 12], [12, L - 24]]) circulo(c, a, b, 7);
    c.restore();
  }
}

// ---------- el gancho ----------
const ESC: [string, number, number, number, number, number, boolean, string][] = [
  ["la fiesta", 120, 410, 138, -.03, -.3, true, ACENTO], ["sábado", 700, 372, 92, .03, -.1, false, TINTA],
  ["mamá", 130, 572, 124, .02, .0, false, TINTA], ["boleros", 650, 556, 112, -.02, .12, true, TINTA],
  ["pastel", 130, 760, 104, -.02, .3, true, TINTA], ["sin mariscos", 640, 744, 70, .02, .42, true, ACENTO],
  ["invitados", 120, 944, 104, .02, .55, false, TINTA], ["globos", 726, 926, 104, -.03, .66, true, TINTA],
  ["la mesa", 150, 1124, 110, -.02, .8, true, TINTA], ["el regalo", 610, 1120, 106, .02, .92, false, TINTA],
];
function escritos(c: Ctx, t: number) {
  const salto = t > A.cae ? Math.exp(-(t - A.cae) * 6) * Math.sin((t - A.cae) * 27) : 0;
  ESC.forEach(([s, x, y, px, rot, ti, it, color], i) => {
    const k = prog(t, ti, ti + .3);
    if (k <= 0) return;
    c.save(); c.translate(x, y - salto * (24 + i * 3)); c.rotate(rot + salto * .03 * (i % 2 ? 1 : -1));
    escr(c, s, 0, 0, serif(px, it), k, color); c.restore();
  });
  c.strokeStyle = ACENTO; c.lineWidth = 7; c.lineCap = "round";
  if (t > .4) { c.beginPath(); c.moveTo(120, 434); c.quadraticCurveTo(300, 458, 590, 420); c.stroke(); }
  if (t > .6) flecha(c, 530, 548, 630, 530, TINTA, 6, 22);
  if (t > .8) flecha(c, 400, 918, 700, 900, TINTA, 6, 22);
}
const GP: Pt[] = [[1260, 250], [-180, 400], [1260, 550], [-180, 700], [1260, 850], [-180, 1000], [1260, 1150], [-180, 1300]];
const GL = GP.slice(1).map((p, i) => Math.hypot(p[0] - GP[i][0], p[1] - GP[i][1]));
const GT = GL.reduce((a, b) => a + b, 0);
function ptoGoma(k: number) {
  let d = k * GT;
  for (let i = 0; i < GL.length; i++) {
    if (d <= GL[i] || i === GL.length - 1) {
      const u = clamp(d / GL[i]), A0 = GP[i], B0 = GP[i + 1];
      return { x: lerp(A0[0], B0[0], u), y: lerp(A0[1], B0[1], u), i, a: Math.atan2(B0[1] - A0[1], B0[0] - A0[0]) };
    }
    d -= GL[i];
  }
  return { x: 0, y: 0, i: 0, a: 0 };
}
const kGoma = (t: number) => prog(t, A.borra0, A.borra1) ** .92;
function trazoGoma(c: Ctx, t: number, d: D) {
  const k = kGoma(t);
  if (k <= 0) return;
  const p = ptoGoma(k), { x, y, w, h } = MESA;
  c.save(); c.translate(x, y); c.beginPath(); c.rect(3, 3, w - 6, h - 6); c.clip();
  c.strokeStyle = d.patron; c.lineWidth = 320; c.lineJoin = "round"; c.lineCap = "round";
  c.beginPath(); c.moveTo(GP[0][0] - x, GP[0][1] - y);
  for (let i = 1; i <= p.i; i++) c.lineTo(GP[i][0] - x, GP[i][1] - y);
  c.lineTo(p.x - x, p.y - y); c.stroke();
  c.restore();
}
function polvoGoma(c: Ctx, t: number, t0: number, t1: number, punto: (u: number) => Pt, n = 90, tam = 1) {
  const r = azar(23);
  c.fillStyle = "#6e6c66";
  for (let i = 0; i < n; i++) {
    const u = r(), nace = lerp(t0, t1, u), a = t - nace, vx = (r() - .5) * 520 * tam, vy = (r() - .5) * 520 * tam, z = (3 + r() * 8) * tam, jx = (r() - .5) * 150 * tam, jy = (r() - .5) * 120 * tam;
    if (a < 0 || a > .62) continue;
    const [x, y] = punto(u);
    c.globalAlpha = 1 - a / .62;
    c.fillRect(x + jx + vx * a, y + jy + vy * a + 500 * a * a, z * 1.6, z * .7);
  }
  c.globalAlpha = 1;
}
function hojasChoque(c: Ctx, t: number) {
  const a = t - A.cae; if (a < 0 || a > 1.15) return;
  const r = azar(41);
  for (let i = 0; i < 16; i++) {
    const ang = r() * TAU, v = 700 + r() * 800, gi = (r() - .5) * 10, w = 110 + r() * 90, h = w * 1.3;
    const x = 540 + Math.cos(ang) * (70 + v * a), y = 730 + Math.sin(ang) * (70 + v * a * .9);
    c.save(); c.translate(x, y); c.rotate(gi * a); c.scale(1 + a * .5, 1 + a * .5);
    c.fillStyle = "rgba(20,18,14,.12)"; c.fillRect(-w / 2 + 12, -h / 2 + 16, w, h);
    c.fillStyle = HOJA; c.strokeStyle = TINTA; c.lineWidth = 4; c.fillRect(-w / 2, -h / 2, w, h); c.strokeRect(-w / 2, -h / 2, w, h);
    c.fillStyle = TINTA; for (let k = 0; k < 4; k++) c.fillRect(-w / 2 + 14, -h / 2 + 24 + k * 26, w - 28 - k * 10, 6);
    c.restore();
  }
}

// ---------- calendario, café y papelitos ----------
const CX = 540, CY = 600, DIAS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom", "lunes"];
const NOTAS: [number, number, number, string, boolean][] = [
  [212, 410, -.12, "llaves", false], [872, 398, .1, "pagar luz", false], [194, 800, .07, "leche", false], [884, 770, -.06, "cita 9:00", false], [540, 950, -.03, "mamá", true],
];
const cuenta = (L: number[], t: number) => L.filter((x) => t >= x).length;
const sumidero = (t: number) => ease.inCubic(prog(t, A.libro0 - .24, A.libro0 - .02));
function pagCal(c: Ctx, dia: string, x: number, y: number, rot: number, s: number) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  c.fillStyle = "rgba(20,18,14,.14)"; c.fillRect(-300 + 12, -250 + 16, 600, 500);
  c.fillStyle = HOJA; c.strokeStyle = TINTA; c.lineWidth = 5; c.fillRect(-300, -250, 600, 500); c.strokeRect(-300, -250, 600, 500);
  texto(c, dia, 0, 86, { fuente: serif(dia === "lunes" ? 228 : 270), color: dia === "lunes" ? ACENTO : TINTA });
  c.restore();
}
function calendario(c: Ctx, t: number) {
  const su = sumidero(t);
  if (su >= 1) return;
  const k = ease.inCubic(prog(t, A.cal - .26, A.cal)), s = lerp(1.5, 1, k) * lerp(1, .5, su);
  const i = cuenta(A.rasga, t), x = lerp(CX, 540, su), y = lerp(lerp(-640, CY, k), BY, su);
  c.save(); c.translate(x, y); c.scale(s, s); c.translate(-CX, -CY);
  sombraPlana(c, CX - 306, CY - 330, 612, 620, 8, .16);
  c.fillStyle = "#171716"; c.fillRect(CX - 306, CY - 330, 612, 92);
  c.fillStyle = "#ddd"; for (const dx of [-170, 170]) { c.fillStyle = PAPEL; circulo(c, CX + dx, CY - 284, 16); c.fillStyle = "#171716"; circulo(c, CX + dx, CY - 284, 7); }
  c.strokeStyle = TINTA; c.lineWidth = 4; for (let q = 3; q > 0; q--) c.strokeRect(CX - 306 + q * 3, CY - 240 + q * 4, 606, 512);
  pagCal(c, DIAS[Math.min(i, 7)], CX, CY + 10, 0, 1);
  c.restore();
  for (let j = 0; j < Math.min(i, 7); j++) {
    const a = t - A.rasga[j], dir = j % 2 ? -1 : 1;
    if (a > 1) continue;
    pagCal(c, DIAS[j], CX + dir * (a * 700 + 1500 * a * a), CY + 10 - 340 * a + 1300 * a * a, dir * (.2 + a * 2.6), 1 + a * .25);
  }
}
function taza(c: Ctx, t: number) {
  const k = ease.outCubic(prog(t, A.cafe - .1, A.cafe + .18));
  if (t > A.libro0 - .3) return;
  const x = lerp(880, 934, k), y = lerp(1070, 1160, k), a = k * 2.2;
  c.save(); c.translate(x, y); c.rotate(a);
  c.fillStyle = "rgba(20,18,14,.16)"; circulo(c, 10, 14, 86);
  c.fillStyle = "#fff"; c.strokeStyle = TINTA; c.lineWidth = 6;
  caja(c, 70, -18, 54, 36, 16); c.fill(); c.stroke();
  c.beginPath(); c.arc(0, 0, 80, 0, TAU); c.fill(); c.stroke();
  if (k < .4) { c.fillStyle = "#17120E"; circulo(c, 0, 0, 62); }
  c.restore();
}
function manchaCafe(c: Ctx, t: number) {
  const k = ease.outExpo(prog(t, A.cafe, A.cafe + .42));
  if (k <= 0 || t > A.libro0) return;
  const su = sumidero(t);
  const r = azar(61), N = 26, cx = 826, cy = 968, R = 200 * k * (1 - su);
  const P: Pt[] = [];
  for (let i = 0; i < N; i++) { const a = i / N * TAU, q = .58 + r() * .62; P.push([cx + Math.cos(a) * R * q * 1.1, cy + Math.sin(a) * R * q * .9]); }
  c.fillStyle = "#17120E"; c.beginPath();
  for (let i = 0; i < N; i++) { const p = P[i], q = P[(i + 1) % N], mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2; if (i === 0) c.moveTo(mx, my); else c.quadraticCurveTo(p[0], p[1], mx, my); }
  c.closePath(); c.fill();
  for (let i = 0; i < 18; i++) { const a = r() * TAU, d = R * (1.05 + r() * .7); circulo(c, cx + Math.cos(a) * d, cy + Math.sin(a) * d * .9, 4 + r() * 13 * k); }
}
function papelitos(c: Ctx, t: number) {
  const su = sumidero(t);
  if (su >= 1) return;
  NOTAS.forEach(([x, y, r, s, rojo], i) => {
    const a = t - A.notas[i]; if (a < -.1) return;
    const q = ease.inCubic(prog(a, -.1, 0)), z = lerp(1.7, 1, q) * lerp(1, .5, su) + .1 * Math.exp(-Math.max(a, 0) * 16);
    c.save(); c.translate(lerp(x, 540, su), lerp(y, BY, su)); c.rotate(r + su * 1.6); c.scale(z, z);
    c.fillStyle = "rgba(20,18,14,.16)"; c.fillRect(-132 + 8, -108 + 12, 264, 216);
    c.fillStyle = rojo ? ACENTO : HOJA; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.moveTo(-132, -108); c.lineTo(132, -108); c.lineTo(132, 76); c.lineTo(100, 108); c.lineTo(-132, 108); c.closePath(); c.fill(); c.stroke();
    texto(c, s, 0, 18, { fuente: serif(66, true), color: rojo ? "#fff" : TINTA });
    c.restore();
  });
}

// ---------- el cuaderno ----------
function rayas(c: Ctx, margen = true) {
  c.fillStyle = "#FBFAF4"; c.fillRect(0, 0, PW, PH);
  c.strokeStyle = "rgba(50,70,100,.17)"; c.lineWidth = 1.8;
  for (let y = 62; y < PH - 10; y += 46) linea(c, 0, y, PW, y);
  if (margen) { c.strokeStyle = "rgba(192,68,42,.5)"; c.lineWidth = 2.2; linea(c, 52, 0, 52, PH); }
}
const BLANCA: Pag = (c) => rayas(c);
function tapaDe(etq: string, f?: (c: Ctx, t: number) => void, rojo = false): Pag {
  return (c, t) => {
    const g = c.createLinearGradient(0, 0, PW, PH); g.addColorStop(0, "#2B2A28"); g.addColorStop(.5, "#141413"); g.addColorStop(1, "#080808");
    c.fillStyle = g; c.fillRect(0, 0, PW, PH);
    c.strokeStyle = "rgba(255,255,255,.04)"; c.lineWidth = 1.5;
    for (let i = -PH; i < PW; i += 9) linea(c, i, 0, i + PH, PH);
    c.fillStyle = ACENTO; c.fillRect(0, 0, 58, PH);
    c.fillStyle = "rgba(0,0,0,.28)"; c.fillRect(54, 0, 5, PH);
    c.fillStyle = ACENTO;
    for (const y of [0, PH]) { c.beginPath(); c.moveTo(PW, y); c.lineTo(PW - 96, y); c.lineTo(PW, y === 0 ? 96 : PH - 96); c.closePath(); c.fill(); }
    c.fillStyle = "#F7F5EE"; c.fillRect(100, 150, 290, 150);
    c.strokeStyle = TINTA; c.lineWidth = 3; c.strokeRect(108, 158, 274, 134);
    if (f) f(c, t); else texto(c, etq, 245, 244, { fuente: serif(rojo ? 74 : 84, true), color: rojo ? ACENTO : TINTA });
  };
}
const AV: [string, string, number][] = [["reservé el salón", "it", 186], ["invité a todos", "ro", 278], ["falta el pastel", "it", 370]];
const P_AV: Pag = (c, t) => {
  rayas(c);
  texto(c, "avances", 246, 88, { fuente: serif(64, true), color: TINTA });
  c.strokeStyle = TINTA; c.lineWidth = 3; linea(c, 150, 102, 342, 102);
  for (const [s, f, y] of AV) texto(c, s, 66, y, { fuente: f === "it" ? serif(50, true) : serif(50), color: TINTA, alin: "left" });
  const k = smooth(prog(t, A.subr, A.subr + .36));
  if (k > 0) { c.strokeStyle = ACENTO; c.lineWidth = 5; c.lineCap = "round"; linea(c, 62, 386, lerp(62, 372, k), 386); }
  escr(c, "pedí el pastel", 66, 462, serif(50, true), prog(t, A.escr2, A.escr2 + .58));
};
const P_HOY: Pag = (c) => rayas(c);

// Hospital: el expediente se queda en la cama, cambian las enfermeras.
const TURNO: [number, number, number][] = [[A.turnos - .1, A.hosp + .5, 0], [A.hosp + .34, A.exp - .4, 1], [A.exp - .56, A.fin, 2]];
const P_HOSP: Pag = (c, t) => {
  rayas(c, false);
  const alarma = smooth(prog(t, A.yesto, A.yesto + .3));
  const pulso = alarma * (.5 + .5 * Math.sin(t * 22));
  // reloj
  c.fillStyle = "#fff"; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.arc(76, 76, 50, 0, TAU); c.fill(); c.stroke();
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; c.lineWidth = 3; linea(c, 76 + Math.cos(a) * 41, 76 + Math.sin(a) * 41, 76 + Math.cos(a) * 46, 76 + Math.sin(a) * 46); }
  const hora = tramos(t, 0, [[A.pag, A.hosp + .5, 3], [A.hosp + .5, A.exp - .5, 7, smooth], [A.exp - .5, A.yesto, 11]]) * TAU / 12 - Math.PI / 2;
  const min = hora * 12;
  c.lineWidth = 5; c.lineCap = "round"; linea(c, 76, 76, 76 + Math.cos(hora) * 26, 76 + Math.sin(hora) * 26);
  c.lineWidth = 3.5; linea(c, 76, 76, 76 + Math.cos(min) * 38, 76 + Math.sin(min) * 38);
  // monitor
  c.fillStyle = "#121211"; caja(c, 208, 26, 214, 102, 10); c.fill();
  c.save(); caja(c, 216, 34, 198, 86, 6); c.clip();
  if (pulso > 0) { c.fillStyle = `rgba(192,68,42,${pulso * .34})`; c.fillRect(216, 34, 198, 86); }
  c.strokeStyle = "#E9896C"; c.lineWidth = 4; c.lineJoin = "round"; c.beginPath();
  const fase = (x: number) => { const v = ((x / 90 - t * lerp(1.28, 6, alarma)) % 1 + 1) % 1; return (v < .08 ? -v * 180 : v < .14 ? -14 + (v - .08) * 800 : v < .2 ? 34 - (v - .14) * 690 : 0) * lerp(1, 1.3, alarma); };
  for (let x = 216; x < 416; x += 2) { const y = 80 + fase(x); if (x === 216) c.moveTo(x, y); else c.lineTo(x, y); }
  c.stroke(); c.restore();
  // cama
  sombraPlana(c, 124, 156, 192, 300, 12, .1);
  c.fillStyle = "#fff"; c.strokeStyle = TINTA; c.lineWidth = 5; caja(c, 124, 156, 192, 300, 12); c.fill(); c.stroke();
  c.fillStyle = "#EFEDE5"; caja(c, 146, 170, 148, 62, 14); c.fill(); c.stroke();
  c.fillStyle = "#F7F5EE"; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.arc(220, 208, 30, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = "#E3E0D7"; c.fillRect(127, 246, 186, 208);
  c.strokeStyle = "rgba(17,17,17,.35)"; c.lineWidth = 3; linea(c, 127, 246, 313, 246);
  c.beginPath(); c.moveTo(170, 272); c.quadraticCurveTo(152, 360, 180, 440); c.moveTo(270, 272); c.quadraticCurveTo(290, 360, 260, 440); c.stroke();
  // el expediente, colgado a los pies
  c.fillStyle = "#141413"; c.fillRect(186, 440, 68, 86); c.fillStyle = ACENTO; c.fillRect(186, 440, 12, 86); c.fillRect(240, 440, 14, 14); c.fillRect(240, 512, 14, 14);
  c.fillStyle = "#F7F5EE"; c.fillRect(204, 462, 42, 22);
  // enfermeras
  for (const [a, b, i] of TURNO) {
    if (t < a || t > b + .6) continue;
    const e = ease.outCubic(prog(t, a, a + .52)), s = ease.inCubic(prog(t, b, b + .5));
    const x = lerp(PW + 90, 226, e) + lerp(0, -350, s), y = 574 + Math.sin((t - a) * 9) * (e < 1 || s > 0 ? 7 : 2);
    const lee = smooth(prog(t, a + .4, a + .6)) * (1 - smooth(prog(t, b - .06, b + .08)));
    if (lee > 0) { c.save(); c.globalAlpha = lee; c.strokeStyle = ACENTO; c.lineWidth = 3.6; c.setLineDash([2, 10]); c.lineCap = "round"; c.lineDashOffset = -t * 50; linea(c, x, y - 50, 220 + 12 * Math.sin(t * 7), 496); c.restore(); }
    pj(c, x, y, 44, [x - 62, y - 42], [lerp(x + 80, 236, lee), lerp(y - 20, 520, lee)], { a1: .4, cofia: true });
  }
  if (alarma > 0) { c.fillStyle = `rgba(192,68,42,${pulso * .1})`; c.fillRect(0, 0, PW, PH); }
};

// La nota: lo que se daña en las consecuencias está en esta misma hoja.
const L0 = 46;
const noK = (t: number) => 1 - smooth(prog(t, A.mal, A.mal + .42));
function nota(c: Ctx, t: number, o: { nivel?: boolean; esc?: number } = {}) {
  c.fillStyle = "#FDFCF8"; c.fillRect(0, 0, PW, PH);
  c.strokeStyle = ACENTO; c.lineWidth = 7; c.strokeRect(10, 10, PW - 20, PH - 20);
  texto(c, "para la fiesta", PW / 2, 62, { fuente: mono(26), color: GRIS });
  if (o.esc !== undefined) {
    const v = (i: number) => clamp(o.esc! * 5 - i), fu2 = serif(76, true);
    escr(c, "Tu mamá", L0, 142, serif(80), v(0)); escr(c, "no come", L0, 226, fu2, v(1)); escr(c, "mariscos", L0, 310, fu2, v(2));
    if (v(3) >= 1) camaron(c, 356, 256, .6, .1);
    escr(c, "Le gustan", L0, 416, fu2, v(3)); escr(c, "los boleros", L0, 500, fu2, v(4));
    if (v(4) >= 1) guitarra(c, 372, 400, .54, .22);
    return;
  }
  const luz = (ini: number) => (o.nivel ? lerp(.3, 1, smooth(prog(t, ini - .12, ini + .1))) : 1);
  const fu = serif(76, true), L = L0;
  texto(c, "Tu mamá", L, 142, { fuente: serif(80), color: TINTA, alin: "left", alfa: luz(A.mama) });
  const no = noK(t);
  c.font = fu;
  const wNo = c.measureText("no ").width;
  texto(c, "no", L, 226, { fuente: fu, color: TINTA, alin: "left", alfa: no * luz(A.mama + .6) });
  if (no < 1) { c.save(); c.globalAlpha = (1 - no) * .12; c.fillStyle = TINTA; c.beginPath(); c.ellipse(L + 36, 204, 60, 26, -.1, 0, TAU); c.fill(); c.restore(); }
  texto(c, "come", L + wNo, 226, { fuente: fu, color: TINTA, alin: "left", alfa: luz(A.mama + .6) });
  texto(c, "mariscos", L, 310, { fuente: fu, color: TINTA, alin: "left", alfa: luz(A.mar - .1) });
  c.save(); c.globalAlpha = luz(A.mar - .1); camaron(c, 356, 256, .6, .1); c.restore();
  const x = smooth(prog(t, A.mar + .5, A.mar + .72)) * no;
  if (x > 0) {
    c.strokeStyle = ACENTO; c.lineWidth = 8; c.lineCap = "round"; c.globalAlpha = x;
    linea(c, 316, 208, lerp(316, 400, x), lerp(208, 306, x)); linea(c, 400, 208, lerp(400, 316, x), lerp(208, 306, x)); c.globalAlpha = 1;
  }
  texto(c, "Le gustan", L, 416, { fuente: fu, color: TINTA, alin: "left", alfa: luz(A.le) });
  const yB = 500;
  texto(c, "los boleros", L, yB, { fuente: fu, color: TINTA, alin: "left", alfa: luz(A.bol - .1) * lerp(1, .42, smooth(prog(t, A.escr3 + .1, A.escr3 + .4))) });
  const vib = t > A.bol ? 3 * Math.exp(-(t - A.bol) * 2.4) * Math.sin(t * 90) : 0;
  c.save(); c.globalAlpha = luz(A.bol - .1); guitarra(c, 372, 400, .54, .22, vib); c.restore();
  const tacha = prog(t, A.escr3 - .1, A.escr3 + .16);
  if (tacha > 0) { c.strokeStyle = ACENTO; c.lineWidth = 8; c.lineCap = "round"; linea(c, 40, yB - 22, lerp(40, 366, tacha), yB - 22 + 8 * Math.sin(tacha * 3)); }
  escr(c, "reguetón", L, 584, serif(84, true), prog(t, A.escr3 + .2, A.escr3 + .94), ACENTO);
}
const P_NOTA: Pag = (c, t) => nota(c, t);
const finTxt = (c: Ctx, t: number) => {
  rayas(c);
  const fu = serif(84, true);
  escr(c, "Lee lo que", 66, 158, fu, prog(t, A.lee2 + .02, A.alguien - .04));
  escr(c, "alguien", 66, 262, fu, prog(t, A.alguien, A.escribio));
  escr(c, "escribió…", 66, 366, fu, prog(t, A.escribio, A.escribio + .9));
  escr(c, "sobre ti.", 66, 510, serif(112, true), prog(t, A.sobre, A.tiF), ACENTO);
};

const T_NOTAS = tapaDe("notas"), T_AV = tapaDe("avances"), T_CUAD = tapaDe("cuaderno", (c) => texto(c, "cuaderno", 245, 244, { fuente: serif(72, true), color: TINTA }));
const T_FIN = tapaDe("", (c, t) => { escr(c, "sobre ti", 120, 244, serif(84, true), prog(t, A.cerrado3 - .05, A.cerrado3 + .5), ACENTO); });

function pinta(x: Ctx, p: Pag, t: number) { x.setTransform(HD, 0, 0, HD, 0, 0); x.clearRect(0, 0, PW, PH); p(x, t); }
/** Una hoja gira sobre el lomo y se curva: tiras verticales, cada una con su propia altura y su propia sombra. */
function voltea(c: Ctx, d: D, t: number, hx: number, y: number, front: Pag, back: Pag, th: number) {
  pinta(d.fc, front, t); pinta(d.bc, back, t);
  const N = 54, F = 1500, du = PW / N, bend = .95 * Math.sin(th);
  const X = [0], Z = [0], An = [th];
  for (let i = 0; i < N; i++) { const a = th + bend * ((i + .5) / N - .5); An.push(a); X.push(X[i] + Math.cos(a) * du); Z.push(Z[i] + Math.sin(a) * du); }
  const Sx = X.map((x, i) => hx + x * (F / (F - Z[i]))), tw = PW * HD, th2 = PH * HD;
  const ex = Sx[N], sa = .26 * Math.sin(th);
  c.fillStyle = `rgba(20,18,14,${sa})`;
  if (ex > hx) c.fillRect(hx, y - PH / 2, ex - hx + 34, PH); else c.fillRect(ex - 34, y - PH / 2, hx - ex + 34, PH);
  for (let i = 0; i < N; i++) {
    const dx = Sx[i + 1] - Sx[i], s = F / (F - (Z[i] + Z[i + 1]) / 2), h = PH * s, yy = y - h / 2;
    if (Math.abs(dx) < .02) continue;
    const l = Math.abs(Math.cos(An[i + 1])), sh = .3 * (1 - l);
    if (dx > 0) {
      c.drawImage(d.f, i / N * tw, 0, tw / N, th2, Sx[i], yy, dx + .8, h);
      if (sh > .01) { c.fillStyle = `rgba(20,18,14,${sh})`; c.fillRect(Sx[i], yy, dx + .8, h); }
    } else {
      c.drawImage(d.b, (1 - (i + 1) / N) * tw, 0, tw / N, th2, Sx[i + 1], yy, -dx + .8, h);
      if (sh > .01) { c.fillStyle = `rgba(20,18,14,${sh})`; c.fillRect(Sx[i + 1], yy, -dx + .8, h); }
    }
  }
}
type Flip = { front: Pag; back: Pag; th: number };
function pestanas(c: Ctx, hx: number, y: number, k: number, usadas: number) {
  [0, 1, 2].forEach((i) => {
    const q = ease.outBack(prog(k, i * .18, i * .18 + .5));
    if (q <= 0) return;
    const yy = y - 200 + i * 130, w = 64 * q * (i < usadas ? .5 : 1);
    c.fillStyle = ACENTO; c.strokeStyle = TINTA; c.lineWidth = 4;
    caja(c, hx + PW - 6, yy, w + 8, 92, 8); c.fill(); c.stroke();
    if (w > 40) texto(c, String(i + 1), hx + PW + 26, yy + 62, { fuente: mono(44), color: "#fff" });
  });
}
function libro(c: Ctx, d: D, t: number, hx: number, y: number, L: Pag | null, R: Pag, flip?: Flip) {
  const yt = y - PH / 2, x0 = L ? hx - PW : hx, w = L ? PW * 2 : PW;
  sombraPlana(c, x0 - 8, yt - 8, w + 16, PH + 16, 8, .15);
  c.fillStyle = "#0C0C0C"; caja(c, x0 - 10, yt - 10, w + 20, PH + 20, 8); c.fill();
  c.fillStyle = "#D9D6CC"; c.fillRect(x0 + 2, yt + PH + 2, w - 2, 5);
  c.save(); c.translate(hx, yt); c.beginPath(); c.rect(0, 0, PW, PH); c.clip(); R(c, t);
  let g = c.createLinearGradient(0, 0, 70, 0); g.addColorStop(0, "rgba(20,18,14,.3)"); g.addColorStop(1, "rgba(20,18,14,0)");
  if (L || flip) { c.fillStyle = g; c.fillRect(0, 0, 70, PH); }
  c.restore();
  if (L) {
    c.save(); c.translate(hx - PW, yt); c.beginPath(); c.rect(0, 0, PW, PH); c.clip(); L(c, t);
    g = c.createLinearGradient(PW - 70, 0, PW, 0); g.addColorStop(0, "rgba(20,18,14,0)"); g.addColorStop(1, "rgba(20,18,14,.3)");
    c.fillStyle = g; c.fillRect(PW - 70, 0, 70, PH);
    c.restore();
  }
  if (flip) voltea(c, d, t, hx, y, flip.front, flip.back, flip.th);
}

// ---------- el archivero: está FUERA de la mesa ----------
const abierto = (t: number) => tramos(t, 0, [
  [A.cajon1, A.cajon1 + .26, 1], [A.slam1 - .02, A.slam1 + .16, 0, ease.inCubic], [A.cajon2, A.cajon2 + .26, 1], [A.plaf - .1, A.plaf + .14, 0],
  [A.quita - .12, A.quita + .1, 1], [A.quita + .4, A.quita + .56, 0], [A.lee - .16, A.lee + .04, 1], [A.lee + .42, A.lee + .6, 0], [A.ant - .04, A.ant + .22, 1], [A.ant + .5, A.ant + .72, 0],
]);
function archivero(c: Ctx, t: number) {
  const e = smooth(prog(t, A.guarda - .34, A.guarda + .06)) * (1 - smooth(prog(t, A.ant + .8, A.ant + 1.2)));
  if (e <= 0) return;
  const dy = lerp(-300, 0, e), ab = abierto(t);
  c.save(); c.translate(0, dy);
  // cajón
  const h = 170 * ab;
  if (ab > .01) {
    c.fillStyle = "rgba(20,18,14,.16)"; c.fillRect(296, 238, 500, h + 14);
    c.fillStyle = "#E7E4DA"; c.strokeStyle = TINTA; c.lineWidth = 6; c.fillRect(290, 216, 500, h + 12); c.strokeRect(290, 216, 500, h + 12);
    c.lineWidth = 3; c.strokeStyle = "rgba(17,17,17,.5)"; for (let i = 1; i < 6; i++) { const y = 216 + (h + 12) * i / 6; linea(c, 300, y, 780, y); }
    c.fillStyle = "#121211"; c.fillRect(430, 224, 220, Math.max(h - 4, 0));
    c.fillStyle = ACENTO; c.fillRect(430, 224, 22, Math.max(h - 4, 0));
    c.fillStyle = TINTA; caja(c, 480, 216 + h + 20, 120, 16, 6); c.fill();
  }
  // mueble
  sombraPlana(c, 130, 6, 820, 226, 10, .14);
  const g = c.createLinearGradient(0, 6, 0, 232); g.addColorStop(0, "#2d2c2a"); g.addColorStop(1, "#121211");
  c.fillStyle = g; caja(c, 130, 6, 820, 226, 10); c.fill();
  c.fillStyle = "#F7F5EE"; c.fillRect(350, 70, 380, 112);
  c.strokeStyle = TINTA; c.lineWidth = 3; c.strokeRect(358, 78, 364, 96);
  texto(c, "archivo", 540, 152, { fuente: serif(90, true), color: TINTA });
  c.restore();
}

// ---------- la nota sobre la mesa ----------
function notaEn(t: number) {
  const k = tramos(t, 0, [[A.entra - .24, A.slam1 - .04, 1, ease.inOutCubic], [A.plaf - .66, A.plaf, 0, ease.inCubic], [A.quita - .04, A.quita + .24, 1, ease.inOutCubic], [A.lee - .05, A.lee + .22, 0, ease.inCubic]]);
  const fuera = ease.inCubic(prog(t, A.ant, A.ant + .36));
  return { x: 540 - fuera * 1100, y: lerp(NY, 280, k), r: Math.sin(k * Math.PI) * .55 + (t < A.plaf ? 0 : -.015), s: lerp(1, .42, k) * (1 + .3 * Math.sin(k * Math.PI)), k };
}
const P_MESA: [number, number, number, string][] = [[210, 560, -.1, "instrucciones"], [874, 610, .09, "herramientas"], [200, 960, .07, "lo que platicaron"]];
function hojasMesa(c: Ctx, t: number) {
  const fuera = ease.inCubic(prog(t, A.ant, A.ant + .32)), abre = smooth(prog(t, A.plaf, A.plaf + .4)) * (1 - smooth(prog(t, A.norec - .3, A.norec)));
  P_MESA.forEach(([x, y, r, s], i) => {
    const e = ease.outCubic(prog(t, A.sale + .1 + i * .09, A.sale + .5 + i * .09));
    if (e <= 0) return;
    const dir = i === 1 ? 1 : -1;
    c.save(); c.translate(x + dir * (1 - e) * 700 + dir * fuera * 900 + dir * abre * 190, y); c.rotate(r);
    c.fillStyle = "rgba(20,18,14,.12)"; c.fillRect(-160 + 8, -210 + 12, 320, 420);
    c.fillStyle = HOJA; c.strokeStyle = TINTA; c.lineWidth = 4; c.fillRect(-160, -210, 320, 420); c.strokeRect(-160, -210, 320, 420);
    c.fillStyle = "rgba(17,17,17,.5)"; for (let k = 0; k < 6; k++) c.fillRect(-130, -60 + k * 42, 260 - (k % 3) * 44, 7);
    texto(c, s, 0, -130, { fuente: mono(s.length > 13 ? 26 : 34), color: TINTA });
    c.restore();
  });
}
function lectura(c: Ctx, t: number, ax: number, ay: number, bx: number, by: number, a: number) {
  if (a <= 0) return;
  c.save(); c.globalAlpha = a; c.strokeStyle = ACENTO; c.lineWidth = 5; c.setLineDash([2, 15]); c.lineCap = "round"; c.lineDashOffset = -t * 90;
  linea(c, ax, ay, bx, by); c.setLineDash([]); c.fillStyle = ACENTO; circulo(c, bx, by, 8); c.restore();
}

// ---------- la mesa de la fiesta ----------
function fiesta(c: Ctx, t: number) {
  const x0 = FX - 300, x1 = FX + 300, y0 = 340, y1 = 1500;
  c.fillStyle = PAPEL; c.fillRect(FX - 900, -300, 1900, 2500);
  // sillas
  c.fillStyle = "#141413";
  for (const lado of [-1, 1]) for (let i = 0; i < 5; i++) { const y = 470 + i * 215; caja(c, FX + lado * 372 - 52, y - 58, 104, 116, 14); c.fill(); }
  sombraPlana(c, x0, y0, x1 - x0, y1 - y0, 10, .1);
  c.fillStyle = "#fff"; c.strokeStyle = TINTA; c.lineWidth = 6; caja(c, x0, y0, x1 - x0, y1 - y0, 10); c.fill(); c.stroke();
  c.strokeStyle = "rgba(17,17,17,.14)"; c.lineWidth = 3; for (const dx of [-200, 200]) linea(c, FX + dx, y0, FX + dx, y1);
  for (const lado of [-1, 1]) for (let i = 0; i < 5; i++) { const y = 470 + i * 215, x = FX + lado * 214; c.fillStyle = "#F4F2EC"; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.arc(x, y, 62, 0, TAU); c.fill(); c.stroke(); c.lineWidth = 2; c.beginPath(); c.arc(x, y, 44, 0, TAU); c.stroke(); }
  // lugar de mamá
  c.fillStyle = "#F7F5EE"; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.arc(FX, 470, 80, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = "#fff"; caja(c, FX - 94, 370, 188, 62, 6); c.fill(); c.stroke();
  texto(c, "mamá", FX, 418, { fuente: serif(50, true), color: TINTA });
  const pulso = t > A.cree ? Math.exp(-(((t - A.cree) * 96 / 60) % 1) * 5) : 0;
  // charola y langosta
  const c0 = A.seq + .08, u = prog(t, c0, A.charola), q = ease.inCubic(u);
  if (t >= c0) {
    const hx = FX, hy = lerp(1720, 800, q), s = lerp(1.25, 1, q);
    const bx = FX, by = lerp(2000, 1190, ease.inOutCubic(u)) + (t > A.charola ? -Math.abs(Math.sin((t - A.charola) * 6)) * 46 * Math.exp(-(t - A.charola) * 2.2) : 0);
    const baile = t > A.cree ? 1 : 0;
    const bxx = bx + baile * 58 * Math.sin((t - A.cree) * 96 / 60 * Math.PI), byy = by - baile * 46 * pulso;
    c.save(); c.translate(hx, hy + pulso * 6); c.scale(s, s);
    sombraPlana(c, -196, -292, 392, 584, 170, .13);
    const g = c.createLinearGradient(-190, -280, 190, 280); g.addColorStop(0, "#F5F3EE"); g.addColorStop(.5, "#B9B7B0"); g.addColorStop(1, "#EFEDE6");
    c.fillStyle = g; c.strokeStyle = TINTA; c.lineWidth = 6; c.beginPath(); c.ellipse(0, 0, 196, 292, 0, 0, TAU); c.fill(); c.stroke();
    c.lineWidth = 2.5; c.beginPath(); c.ellipse(0, 0, 164, 258, 0, 0, TAU); c.stroke();
    langosta(c, 0, 26, .78, 0, t);
    c.restore();
    const atado = t < A.charola;
    const m1: Pt = atado ? [hx - 150 * s, hy + 240 * s] : t > A.cree ? [bxx - 240, byy - 230 + 30 * Math.sin(t * 9)] : [bx - 250, by - 240 + 40 * Math.sin(t * 7)];
    const m2: Pt = atado ? [hx + 150 * s, hy + 240 * s] : t > A.cree ? [bxx + 240, byy - 230 - 30 * Math.sin(t * 9)] : [bx + 250, by - 240 - 40 * Math.sin(t * 7)];
    pj(c, bxx, byy, 96, m1, m2, { a1: .75, a2: .75, gorro: -.12 + (t > A.cree ? .2 * Math.sin(t * 9) : 0) });
    // lo que cree ahora
    const kn = ease.outBack(prog(t, A.cam + .1, A.cam + .36));
    if (t > A.cam) {
      const cam = t > A.cree;
      nube(c, FX, 1412, 640, 230, kn, bxx, byy + 70, () => {
        const z = cam ? 1 + .16 * Math.exp(-(t - A.cree) * 7) : 1;
        c.save(); c.scale(z, z);
        texto(c, cam ? "reguetón" : "boleros", 0, 36, { fuente: serif(118, true), color: cam ? ACENTO : TINTA });
        c.restore();
      });
    }
  }
  if (t > A.cree) {
    const k = ease.outBack(prog(t, A.cree - .03, A.cree + .1)), s = lerp(1.6, 1, clamp(k));
    bocina(c, FX - 420, 1060, s * (1 + pulso * .05), pulso);
    bocina(c, FX + 420, 1060, s * (1 + pulso * .05), pulso);
    const r = azar(72);
    for (let i = 0; i < 90; i++) {
      const x0c = FX - 560 + r() * 1120, v = 200 + r() * 360, f = r() * 6.3, col = i % 4 === 0 ? ACENTO : TINTA;
      const y = ((r() * 1900 + (t - A.cree) * v) % 1900) - 60, x = x0c + Math.sin(t * 2 + f) * 34;
      if (y < 290) continue;
      c.save(); c.translate(x, y); c.rotate(t * 3 + f); c.fillStyle = col; c.fillRect(-10, -5, 20, 10); c.restore();
    }
  }
}

// ---------- la mesa se vuelve a llenar ----------
const N_H = A.papeles.length;
const POS_H: [number, number, number, number][] = (() => {
  const r = azar(606), L: [number, number, number, number][] = [];
  for (let i = 0; i < N_H; i++) {
    const tarde = i / N_H;
    const x = tarde > .78 ? r() * 1300 - 110 : 110 + r() * 860, y = tarde > .78 ? 90 + r() * 1800 : 300 + r() * 860;
    L.push([x, y, (r() - .5) * 1.5, r()]);
  }
  return L;
})();
function montonHojas(c: Ctx, t: number) {
  if (t < A.dem - .3 || t > A.racha + 1.1) return;
  for (let i = 0; i < N_H; i++) {
    const a = t - A.papeles[i]; if (a < -.2) break;
    const [x0, y0, r0, q] = POS_H[i];
    const fa = prog(a, -.2, 0), s = lerp(2.1, 1, ease.inCubic(fa));
    const v = t - A.racha - q * .24;
    let x = x0, y = y0, r = r0;
    if (v > 0) { x -= 3000 * v * v + 500 * v; y += -420 * v + 200 * Math.sin(v * 6 + i); r += v * (3 + q * 5) * (i % 2 ? 1 : -1); }
    if (x < -300) continue;
    c.save(); c.translate(x, y); c.rotate(r); c.scale(s, s);
    c.fillStyle = "rgba(20,18,14,.13)"; c.fillRect(-120 + 7, -155 + 10, 240, 310);
    c.fillStyle = HOJA; c.strokeStyle = TINTA; c.lineWidth = 3.2; c.fillRect(-120, -155, 240, 310); c.strokeRect(-120, -155, 240, 310);
    c.fillStyle = "rgba(17,17,17,.62)";
    for (let k = 0; k < 6; k++) c.fillRect(-98, -124 + k * 44, 196 - ((i + k) % 3) * 40, 7);
    if (i % 6 === 0) { c.fillStyle = ACENTO; c.fillRect(-98, -128, 80, 11); }
    c.restore();
  }
}

// ---------- no se parece a la tuya ----------
const N_C = 220;
function suave(P: Pt[], cerrada: boolean): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(i - 1, 0)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(i + 2, P.length - 1)];
    for (let k = 0; k < 14; k++) {
      const u = k / 14, u2 = u * u, u3 = u2 * u;
      const f = (a: number, b: number, c0: number, d: number) => .5 * (2 * b + (c0 - a) * u + (2 * a - 5 * b + 4 * c0 - d) * u2 + (3 * b - a - 3 * c0 + d) * u3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(P[P.length - 1]);
  if (cerrada) out.push(P[0]);
  return out;
}
function remuestrea(P: Pt[], n: number): Pt[] {
  const L = [0];
  for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  const out: Pt[] = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const d = L[L.length - 1] * i / (n - 1);
    while (j < L.length - 2 && L[j + 1] < d) j++;
    const u = (d - L[j]) / Math.max(L[j + 1] - L[j], 1e-6);
    out.push([lerp(P[j][0], P[j + 1][0], u), lerp(P[j][1], P[j + 1][1], u)]);
  }
  return out;
}
const CABEZA = remuestrea(suave(([[352, 1400], [346, 1240], [272, 1110], [214, 960], [208, 790], [268, 620], [400, 520], [566, 500], [710, 552], [794, 672], [812, 770], [792, 816], [826, 880], [884, 972], [842, 1004], [812, 1024], [838, 1062], [812, 1090], [830, 1122], [800, 1152], [796, 1208], [750, 1244], [650, 1240], [600, 1282], [598, 1400]] as Pt[]).map(([x, y]) => [530 + (x - 540) * .94, 290 + (y - 500) * .96] as Pt), false).concat([[530 + (352 - 540) * .94, 290 + 900 * .96]]), N_C);
const LOMO: Pt[] = (() => {
  const x0 = 320, x1 = 760, y0 = BY - PH / 2, y1 = BY + PH / 2;
  return remuestrea([[x0 + 40, y1], [x0, y1], [x0, y0], [x1, y0], [x1, y1], [x0 + 40, y1]], N_C);
})();
const NEUR: Pt[] = (() => {
  const r = azar(88), L: Pt[] = [];
  while (L.length < 30) { const a = r() * TAU, d = Math.sqrt(r()); const x = 490 + Math.cos(a) * d * 226, y = 568 + Math.sin(a) * d * 208; if (L.every((p) => Math.hypot(p[0] - x, p[1] - y) > 62)) L.push([x, y]); }
  return L;
})();
const AR: [number, number][] = (() => {
  const L: [number, number][] = [];
  NEUR.forEach((p, i) => NEUR.forEach((q, j) => { if (j > i && Math.hypot(p[0] - q[0], p[1] - q[1]) < 150) L.push([i, j]); }));
  return L;
})();
function cabeza(c: Ctx, t: number, d: D) {
  const u = smooth(prog(t, A.memoria - .25, A.tuya + .1)), k = ease.inOutCubic(prog(t, A.separ + .12, A.cuad + .08));
  if (u <= 0 || t > A.cuad + .14) return;
  const n = Math.floor(u * (N_C - 1));
  // la red de adentro: se teje sola, y se va al volverse rectángulo
  const a = smooth(prog(t, A.memoria + .9, A.tuya)) * (1 - smooth(prog(k, 0, .35)));
  if (a > 0) {
    c.save(); c.globalAlpha = a; c.strokeStyle = "rgba(17,17,17,.55)"; c.lineWidth = 3;
    AR.forEach(([i, j]) => linea(c, NEUR[i][0], NEUR[i][1], NEUR[j][0], NEUR[j][1]));
    c.fillStyle = TINTA; NEUR.forEach((p) => circulo(c, p[0], p[1], 8));
    AR.forEach(([i, j], q) => { if (q % 3) return; const v = ((t * .9 + q * .173) % 1), p = NEUR[i], w = NEUR[j]; c.fillStyle = ACENTO; circulo(c, lerp(p[0], w[0], v), lerp(p[1], w[1], v), 8); });
    c.restore();
  }
  c.beginPath();
  for (let i = 0; i <= n; i++) { const x = lerp(CABEZA[i][0], LOMO[i][0], k), y = lerp(CABEZA[i][1], LOMO[i][1], k); if (i === 0) c.moveTo(x, y); else c.lineTo(x, y); }
  if (k > 0) { c.closePath(); c.fillStyle = `rgba(16,16,15,${smooth(prog(k, .25, 1))})`; c.fill(); }
  c.strokeStyle = TINTA; c.lineWidth = 8; c.lineJoin = "round"; c.lineCap = "round"; c.stroke();
}

// ---------- el mundo ----------
function mundo(c: Ctx, t: number, d: D) {
  const [vx] = camara(t);
  mesa(c, d);
  if (vx > 1000) { fiesta(c, t); if (vx > 1600) return; }
  const antesTel = t < A.tel + .1;
  // gancho
  if (t < A.borra1 + .05) escritos(c, t);
  if (t < A.borra1 + .05) trazoGoma(c, t, d);
  escuadras(c);
  if (en(t, A.cal - .28, A.libro0 + .1)) { manchaCafe(c, t); taza(c, t); calendario(c, t); papelitos(c, t); }

  if (t < A.borra0 + .2) hojasChoque(c, t);
  // bola del gancho y del modelo
  if (antesTel) bolaInicial(c, t, d);
  if (t < A.borra1 + .3 && t >= A.borra0) {
    const k = kGoma(t), p = ptoGoma(k);
    polvoGoma(c, t, A.borra0, A.borra1, (u) => { const q = ptoGoma(u); return [q.x, q.y]; });
    if (t < A.borra1 + .02) goma(c, p.x, p.y, p.a * .25 + (p.i % 2 ? .12 : -.12), 1.04);
  }

  // la hoja, el archivero y las bolas que hacen fila
  if (en(t, A.lev - .1, A.sale2 + .5)) {
    if (t < A.ant + .5) hojasMesa(c, t);
    const n = notaEn(t);
    if (n.k < .985 && t < A.ant + .5) {
      c.save(); c.translate(n.x, n.y); c.rotate(n.r); c.scale(n.s, n.s);
      sombraPlana(c, -PW / 2, -PH / 2, PW, PH, 3, .11, (n.s - 1) * 2);
      c.translate(-PW / 2, -PH / 2); nota(c, t, { nivel: t > A.plaf, esc: t < A.plaf - 1 ? prog(t, A.lev + .1, A.cajon1 - .06) : undefined }); c.restore();
    }
    bolaEscribe(c, t);
  }
  if (en(t, A.tel - .46, A.lev + .55)) telefono(c, t);
  if (en(t, A.ant, A.cerrado + .1)) turnos(c, t, d);
  if (en(t, A.ant - .2, A.ant + 1.3) || en(t, A.guarda - .4, A.ant)) archivero(c, t);
  if (en(t, A.cerrado - .2, A.racha + .2)) consecuencias(c, t, d);
  if (t >= A.racha && t < A.fin + 1) cierre(c, t, d);
  if (t >= A.dem - .3 && t < A.racha + 1.2) montonHojas(c, t);
  if (en(t, A.llena + .1, A.racha + .1)) {
    const k = ease.outBack(prog(t, A.llena + .15, A.llena + .45));
    brazo(c, 560, 1040, 600 + 30 * Math.sin(t * 13), lerp(1040, 580, k), 40, .8 + .2 * Math.sin(t * 13), TINTA, 1, 1.2);
  }
  cabeza(c, t, d);
  if (t > A.norecu - .05) lampara(c, t);
}

function bolaInicial(c: Ctx, t: number, d: D) {
  const iT = cuenta(A.rasga, t);
  let alt = 0;
  if (t < A.cae) alt = 1.85 * (1 - (t / A.cae) ** 2);
  else alt = .26 * Math.abs(Math.sin((t - A.cae) * 6.6)) * Math.exp(-(t - A.cae) * 3.1);
  alt += .62 * Math.sin(Math.PI * prog(t, A.hop - .17, A.hop + .22));
  alt += t > A.libro0 ? .24 * Math.abs(Math.sin((t - A.libro0) * 7)) * Math.exp(-(t - A.libro0) * 3.4) : 0;
  const x = 540, y = lerp(730, BP[1], ease.outBack(prog(t, A.cal - .06, A.cal + .28), 1.1)) - 120 * smooth(prog(t, A.modelo, A.modelo + .6));
  let m1: Pt, m2: Pt;
  const L = 1 - smooth(prog(t, A.modelo, A.modelo + .34));
  if (t < A.borra0) { m1 = [x - 230 + 66 * Math.sin(t * 21), y - 250 + 50 * Math.cos(t * 26)]; m2 = [x + 240 + 66 * Math.cos(t * 19), y - 230 + 50 * Math.sin(t * 24)]; }
  else if (t < A.cal) { const q = smooth(prog(t, A.borra0, A.borra0 + .3)); m1 = [x - lerp(230, 280, q), y - lerp(250, 60, q) - 30 * Math.sin(t * 8)]; m2 = [x + lerp(240, 280, q), y - lerp(230, 60, q) + 30 * Math.sin(t * 8)]; }
  else {
    const R1: Pt = [x - 250, y - 130 + 24 * Math.sin(t * 5)], R2: Pt = [x + 250, y - 130 + 24 * Math.cos(t * 5.3)];
    const L1 = A.rasga.filter((_, i) => i % 2 === 1).map((q) => ({ t: q, p: [CX - 270, CY + 240] as Pt }));
    const L2 = A.rasga.filter((_, i) => i % 2 === 0).map((q) => ({ t: q, p: [CX + 270, CY + 240] as Pt }));
    L1.push(...A.notas.filter((_, i) => i % 2 === 0).map((q) => ({ t: q, p: [NOTAS[A.notas.indexOf(q)][0], NOTAS[A.notas.indexOf(q)][1]] as Pt })));
    L2.push(...A.notas.filter((_, i) => i % 2 === 1).map((q) => ({ t: q, p: [NOTAS[A.notas.indexOf(q)][0], NOTAS[A.notas.indexOf(q)][1]] as Pt })));
    L2.push({ t: A.cafe - .06, p: [870, 1070] });
    m1 = alcance(t, L1, R1); m2 = alcance(t, L2, R2);
  }
  // Un golpe de plática lo sacude; el puñado de perillas de adentro no se entera.
  let dx = 0;
  for (const g of A.golpes) { const a = t - g; if (a > 0 && a < .5) dx += 7 * Math.exp(-a * 9) * Math.sin(a * 42); }
  const conGorro = t < A.hop - .05;
  pj(c, x + dx, y, 90, m1, m2, { alt, largo: L, a1: .8, a2: .8, gorro: conGorro ? -.14 + .1 * Math.sin(t * 8) : undefined });
  if (!conGorro && t < A.hop + .9) { const a = t - A.hop + .05; gorro(c, x + 820 * a, y - 300 * a + 1100 * a * a - 60, 90 * (1 + alt), -.14 + a * 7); }
  // perillas: lo aprendido
  const ri = 74 * smooth(prog(t, A.modelo + .28, A.modelo + .74));
  if (ri > 1) {
    c.fillStyle = "#050505"; circulo(c, x + dx, y, ri + 3);
    const g = c.createRadialGradient(x + dx, y - 16, 6, x + dx, y, ri); g.addColorStop(0, "#EDEAE2"); g.addColorStop(1, "#BDBAB2");
    c.fillStyle = g; circulo(c, x + dx, y, ri);
    if (ri > 60) {
      const v = smooth(prog(t, A.gira - .02, A.gira + .26)), vel = (A.fijo - A.gira) * 16;
      const spin = (i: number) => { const u = clamp((t - A.gira) / (A.fijo - A.gira)); const tem = t > A.fijo ? .1 * Math.exp(-(t - A.fijo) * 12) * Math.sin((t - A.fijo) * 60) : 0; return v * vel * u * (i === 1 ? -1 : 1) + tem; };
      [-.9, 2.2, .4].forEach((a0, i) => perilla(c, x + dx - 46 + i * 46, y - 22, 21, a0 + spin(i)));
      const cae = ease.outBack(prog(t, A.fijo - .12, A.fijo + .02), 1.4);
      if (cae > 0) candado(c, x + dx, y + 26 - (1 - clamp(cae)) * 60, .58, clamp(prog(t, A.fijo - .04, A.fijo + .04)));
    }
  }
  if (t > A.preg0 && t < A.cal - .2) texto(c, "?", x + 190, y - 26, { fuente: serif(190, true), color: ACENTO, alfa: smooth(prog(t, A.preg0, A.preg0 + .1)) });
  // el libro cae encima
  if (t > A.libro0 - .24 && t < A.modelo + .6) {
    const k = ease.inCubic(prog(t, A.libro0 - .24, A.libro0)), s = lerp(2.7, 1, k), sale = ease.inCubic(prog(t, A.modelo - .14, A.modelo + .26));
    c.save(); c.translate(540 - sale * 1100, BY); c.scale(s, s); c.translate(-540, -BY);
    libro(c, d, t, 320, BY, null, T_NOTAS);
    c.restore();
    if (k >= 1 && t < A.libro0 + .4) anilloChoque(c, t - A.libro0);
  }
}
function anilloChoque(c: Ctx, a: number) {
  const q = ease.outCubic(a / .4);
  c.save(); c.globalAlpha = (1 - q) * .5; c.strokeStyle = TINTA; c.lineWidth = 8 * (1 - q) + 1; caja(c, 320 - q * 160, BY - PH / 2 - q * 160, PW + q * 320, PH + q * 320, 20); c.stroke(); c.restore();
}
function telefono(c: Ctx, t: number) {
  const x = lerp(1820, 540, ease.outCubic(prog(t, A.tel - .46, A.tel)));
  const lev = ease.outCubic(prog(t, A.lev, A.lev + .5));
  const y = 900 - lev * 1900, s = 1 + lev * .18;
  c.save(); c.translate(x, y); c.scale(s, s);
  sombraPlana(c, -290, -570, 580, 1140, 70, .17, lev);
  const g = c.createLinearGradient(-290, -570, 290, 570); g.addColorStop(0, "#2B2A28"); g.addColorStop(1, "#080808");
  c.fillStyle = g; caja(c, -290, -570, 580, 1140, 70); c.fill();
  c.fillStyle = PAPEL; caja(c, -264, -544, 528, 1088, 48); c.fill();
  c.fillStyle = "#0E0E0E"; caja(c, -68, -530, 136, 34, 16); c.fill();
  const b1 = ease.outBack(prog(t, A.tel + .1, A.tel + .36));
  if (b1 > 0) { c.save(); c.translate(26, -290); c.scale(clamp(b1), clamp(b1)); c.fillStyle = "#1a1a19"; caja(c, -214, -92, 440, 184, 40); c.fill(); texto(c, "¿te acuerdas", 6, -10, { fuente: serif(70), color: "#F7F5EE" }); texto(c, "de mí?", 6, 64, { fuente: serif(70), color: "#F7F5EE" }); c.restore(); }
  const b2 = ease.outBack(prog(t, A.tel2 - .06, A.tel2 + .2));
  if (b2 > 0) { c.save(); c.translate(-10, 60); c.scale(clamp(b2), clamp(b2)); c.fillStyle = "#fff"; c.strokeStyle = TINTA; c.lineWidth = 5; caja(c, -236, -128, 480, 256, 40); c.fill(); c.stroke(); texto(c, "¡Claro!", 4, -24, { fuente: serif(92, true), color: TINTA }); texto(c, "Te recuerdo.", 4, 76, { fuente: serif(92, true), color: ACENTO }); c.restore(); }
  c.fillStyle = "#fff"; c.strokeStyle = "rgba(17,17,17,.5)"; c.lineWidth = 3; caja(c, -230, 440, 460, 66, 32); c.fill(); c.stroke();
  c.restore();
}
function bolaEscribe(c: Ctx, t: number) {
  // Primera bola: escribe, guarda y se va. Segunda: llega en blanco y le ponen la nota enfrente.
  const [bx, by] = BP;
  const salen = ease.inCubic(prog(t, A.sale, A.sale + .42));
  if (t < A.sale + .46) {
    const x = bx + salen * 900, k = prog(t, A.lev + .1, A.cajon1 - .06);
    const reng: [number, number][] = [[66, 134], [66, 226], [66, 310], [66, 416], [66, 500]], i = Math.min(Math.floor(k * 5), 4), u = k * 5 - i;
    const px = 520 - PW / 2 + reng[i][0] + u * 280 + 14 * Math.sin(t * 34), py = NY - PH / 2 + reng[i][1] + 8 * Math.sin(t * 41);
    const ocupado = t < A.cajon1;
    const m2: Pt = ocupado ? [px, py + 30] : [x + 240, by - 120 + 20 * Math.sin(t * 6)];
    const m1: Pt = t > A.entra - .3 && t < A.slam1 ? [lerp(x - 230, 540, smooth(prog(t, A.entra - .3, A.entra - .06))), lerp(by - 130, 380, smooth(prog(t, A.entra - .3, A.entra - .06)))] : [x - 240 + 16 * Math.sin(t * 5), by - 120];
    pj(c, x, by, 90, m1, m2, { a1: .7, a2: .25, largo: 1 - salen * .8 });
    if (ocupado) pluma(c, m2[0] + 4, m2[1] - 26, .22, .9);
  }
  if (t >= A.nueva - .3) {
    const a = t - A.nueva;
    const alt = a < 0 ? 1.7 * (1 - ((a + .3) / .3) ** 2) : .2 * Math.abs(Math.sin(a * 7)) * Math.exp(-a * 3.2);
    const R1: Pt = [bx - 250 + 16 * Math.sin(t * 3), by - 110];
    const R2: Pt = [bx + 250, by - 110 + 18 * Math.cos(t * 3.4)];
    const sal = ease.inCubic(prog(t, A.sale2, A.sale2 + .36));
    const x = bx + sal * 900;
    const norm = smooth(prog(t, A.plaf + .3, A.plaf + .5)) * (1 - smooth(prog(t, A.norec - .3, A.norec)));
    // sostiene la hoja por las esquinas: nada encima de lo que se lee
    const m1: Pt = [lerp(R1[0], 540 - PW / 2 + 8, norm), lerp(R1[1], NY + PH / 2 + 4, norm)];
    const m2b: Pt = [lerp(lerp(R2[0], x + 180, sal), 540 + PW / 2 - 8, norm), lerp(R2[1], NY + PH / 2 + 4, norm)];
    const verNota = smooth(prog(t, A.lee + .16, A.lee + .34)) * (1 - smooth(prog(t, A.ant - .2, A.ant)));
    const q = (t - A.lee) * 1.1 % 1;
    const rx = 540 - PW / 2 + 60 + q * 290, ry = NY - PH / 2 + (t - A.lee < 1.1 ? 226 : 416);
    pj(c, x, by, 90, m1, m2b, { alt, a1: .6, a2: .6, largo: 1 - sal * .8 });
    lectura(c, t, bx, by - 80, rx, ry, verNota);
    const nu = t < A.quita + .22 ? smooth(prog(t, A.norec - .24, A.norec - .02)) : ease.outBack(prog(t, A.lee + .3, A.lee + .56));
    const kn = (t > A.quita + .22 && t < A.lee + .3 ? 0 : nu) * (1 - smooth(prog(t, A.ant - .3, A.ant)));
    nube(c, 850, 1130, 330, 230, kn, bx + 96, by, () => { camaron(c, -74, -10, .6, .1); c.strokeStyle = ACENTO; c.lineWidth = 7; c.lineCap = "round"; linea(c, -122, -50, -30, 42); linea(c, -30, -50, -122, 42); guitarra(c, 78, 10, .5, .24); });
    if (en(t, A.quita + .3, A.lee + .1)) {
      const z = ease.outBack(prog(t, A.quita + .3, A.quita + .46));
      texto(c, "?", 850, 1190, { fuente: serif(230 * clamp(z), true), color: ACENTO });
      polvoGoma(c, t, A.quita + .2, A.quita + .32, () => [850, 1130], 40, .8);
    }
  }
}
function turnos(c: Ctx, t: number, d: D) {
  const [bx, by] = BP;
  // el libro baja del cajón
  const b = ease.inCubic(prog(t, A.librot - .28, A.librot));
  const yB = lerp(280, BY, b), s = lerp(.5, 1, b) + Math.sin(Math.PI * b) * .3;
  const th = Math.PI * ease.inOutSine(prog(t, A.abre, A.abre + .7));
  const hx = lerp(320, 540, smooth(prog(t, A.abre + .1, A.abre + .7)));
  if (t < A.abre) {
    c.save(); c.translate(540, yB); c.scale(s, s); c.translate(-540, -BY);
    libro(c, d, t, 320, BY, null, T_AV); c.restore();
  } else if (t < A.abre + .7) {
    libro(c, d, t, hx, BY, null, P_HOY, { front: T_AV, back: P_AV, th });
  } else if (t < A.pag) {
    libro(c, d, t, 540, BY, P_AV, P_HOY);
  } else if (t < A.pag + .56) {
    libro(c, d, t, 540, BY, P_AV, P_HOSP, { front: P_HOY, back: BLANCA, th: Math.PI * ease.inOutSine(prog(t, A.pag, A.pag + .56)) });
  } else if (t < A.cierra) {
    libro(c, d, t, 540, BY, BLANCA, P_HOSP);
  } else if (t < A.cerrado) {
    const k = prog(t, A.cierra, A.cerrado);
    libro(c, d, t, lerp(540, 320, smooth(k)), BY, null, P_HOSP, { front: T_AV, back: BLANCA, th: Math.PI * (1 - ease.inCubic(k)) });
  }
  // proyectos largos: una fila que no se acaba
  if (en(t, A.largos - .2, A.leer + .8)) {
    for (let i = 0; i < 8; i++) {
      const x = 96 + i * 126, a = t - (A.largos + i * .085), y = 1330 + Math.sin(t * 3 + i * 1.3) * 7;
      if (a < -.14) continue;
      const alt = a < 0 ? 1.2 * (a / .14) ** 2 : .22 * Math.abs(Math.sin(a * 9)) * Math.exp(-a * 3.6);
      pj(c, x, y, 40, [x - 48, y - 40 + 8 * Math.sin(t * 5 + i)], [x + 48, y - 40 - 8 * Math.sin(t * 5 + i)], { alt, a1: .7, a2: .7 });
    }
  }
  // la bola de turno
  const enHosp = en(t, A.pag + .3, A.cierra);
  if (t >= A.cae2 - .3 && t < A.cerrado - .2 && !enHosp) {
    const a = t - A.cae2;
    const alt = a < 0 ? 1.7 * (1 - ((a + .3) / .3) ** 2) : .2 * Math.abs(Math.sin(a * 7)) * Math.exp(-a * 3.2);
    const x = t >= A.cierra ? lerp(-260, bx, ease.outCubic(prog(t, A.cierra, A.cierra + .28))) : lerp(bx, 430, smooth(prog(t, A.leer - .3, A.leer + .4)));
    const haciaTapa = smooth(prog(t, A.abre - .3, A.abre));
    const cruza = ease.inOutSine(prog(t, A.abre, A.abre + .7));
    const eR: Pt = [lerp(740, 150, cruza), 880 - Math.sin(cruza * Math.PI) * 120];
    const R2: Pt = [x + 250, by - 110 + 18 * Math.cos(t * 3.4)];
    const conLibro = t < A.abre + .74;
    const m2: Pt = conLibro ? [lerp(R2[0], eR[0], haciaTapa), lerp(R2[1], eR[1], haciaTapa)] : R2;
    const kE = prog(t, A.escr2, A.escr2 + .58);
    const R1: Pt = [x - 250 + 16 * Math.sin(t * 3), by - 110];
    const escribe = smooth(prog(t, A.escr2 - .2, A.escr2)) * (1 - smooth(prog(t, A.escr2 + .6, A.escr2 + .8)));
    const m1: Pt = [lerp(R1[0], 166 + kE * 290 + 8 * Math.sin(t * 40), escribe), lerp(R1[1], PT + 462 + 26, escribe)];
    pj(c, x, by, 90, m1, m2, { alt, a1: .6, a2: .7 });
    if (escribe > .5) pluma(c, m1[0] + 4, m1[1] - 26, .22, .9);
    const ve = smooth(prog(t, A.leer - .05, A.leer + .2)) * (1 - smooth(prog(t, A.pag - .3, A.pag)));
    const u = ((t - A.leer) / 1.6) % 1, rengl = Math.min(Math.floor((t - A.leer) / 1.2), 2);
    const lx = t > A.ante ? 180 + 170 * ((t * .8) % 1) : 140 + u * 240, ly = PT + (t > A.ante ? 370 : [186, 278, 370][rengl]) - 16;
    lectura(c, t, x - 16, by - 88, lx, ly, ve);
    if (en(t, A.preg, A.abre)) texto(c, "?", x + 196, by + 44, { fuente: serif(250 * ease.outBack(prog(t, A.preg, A.preg + .18)), true), color: ACENTO });
  }
}
function consecuencias(c: Ctx, t: number, d: D) {
  const [bx, by] = BP;
  // cerrado con sus tres pestañas
  if (t < A.c1 - .1) {
    libro(c, d, t, 320, BY, null, T_AV);
    pestanas(c, 320, BY, prog(t, A.cerrado + .04, A.cerrado + .46), 0);
    const R1: Pt = [bx - 250, by - 110], R2: Pt = [bx + 250, by - 110];
    const va = smooth(prog(t, A.c1 - .4, A.c1 - .12));
    pj(c, bx, by, 90, [R1[0] + 16 * Math.sin(t * 3), R1[1]], [lerp(R2[0], 800, va), lerp(R2[1], BY - 150, va)], { a1: .6, a2: .3 });
  } else if (t < A.c1 + .42) {
    const k = prog(t, A.c1 - .1, A.c1 + .42);
    libro(c, d, t, lerp(320, 540, smooth(k)), BY, null, P_NOTA, { front: T_AV, back: BLANCA, th: Math.PI * ease.inOutSine(k) });
    pestanas(c, lerp(320, 540, smooth(k)), BY, 1, 1);
    pj(c, bx, by, 90, [bx - 250, by - 110], [lerp(800, 1000, k), BY - 150], { a1: .6, a2: .2 });
  } else {
    libro(c, d, t, 540, BY, BLANCA, P_NOTA);
  }
  // la goma se come el "no"
  if (en(t, A.mal - .3, A.mal + .78)) {
    const a = prog(t, A.mal - .3, A.mal - .04), s = 1 - smooth(prog(t, A.mal + .5, A.mal + .78));
    const rub = t > A.mal - .04 && t < A.mal + .5 ? Math.sin((t - A.mal) * 34) : 0;
    const x = lerp(1120, 620, smooth(a)) + (1 - s) * 800 + rub * 46, y = lerp(700, 626, smooth(a)) + rub * 6;
    polvoGoma(c, t, A.mal, A.mal + .5, () => [610, 620], 40, .34);
    goma(c, x, y, -.2, .42);
  }
  // alguien más
  if (en(t, A.c2, A.cam + .1)) {
    const yB = PT + 500, entra = ease.outCubic(prog(t, A.c2 + .1, A.escr3 - .1));
    const kT = prog(t, A.escr3 - .1, A.escr3 + .16), kE = prog(t, A.escr3 + .2, A.escr3 + .94);
    const xM = kE > 0 ? 586 + kE * 300 : lerp(586, 912, kT), yM = kE > 0 ? PT + 584 - 14 + 8 * Math.sin(t * 40) : yB - 24;
    const sale = ease.inCubic(prog(t, A.escr3 + 1, A.cam));
    const hx = lerp(1320, xM, entra) + sale * 600, hy = lerp(1060, yM, entra) + sale * 60;
    brazo(c, 1420, 1060, hx, hy + 22, 120, .3, ACENTO, 1, .62);
    pluma(c, hx + 2, hy - 2, .28, .92, ACENTO);
  }
  // la mesa otra vez
  if (t > A.c3 - .4) {
    const a = t - A.c3, x = bx + 8 * Math.sin(t * 8), y = by + Math.abs(Math.sin(t * 7)) * -10;
    const m1: Pt = [x - 260 + 120 * Math.sin(t * 14), y - 240 + 80 * Math.cos(t * 11)], m2: Pt = [x + 260 + 120 * Math.cos(t * 13), y - 240 + 80 * Math.sin(t * 12)];
    pj(c, x, y, 90, m1, m2, { a1: .9, a2: .9, alt: a < 0 ? 0 : 0 });
  }
}
function cierre(c: Ctx, t: number, d: D) {
  // Después de la racha la mesa queda vacía. La bola dibuja tu cabeza; se vuelve un cuaderno.
  const [bx, by] = BP;
  const dib = smooth(prog(t, A.memoria - .3, A.memoria));
  const u = smooth(prog(t, A.memoria - .25, A.tuya + .1));
  if (t < A.norecu) {
    const n = Math.floor(u * (N_C - 1)), p = CABEZA[n];
    const k = t > A.separ ? 1 : 0, x = lerp(bx, 920, dib), y = lerp(by, 1320, dib);
    const a = t - A.racha;
    const alt = a < .3 ? 0 : .16 * Math.abs(Math.sin(a * 6)) * Math.exp(-a * 3);
    const m2: Pt = k ? [x - 30, y - 200 + 14 * Math.sin(t * 4)] : dib > .5 ? [p[0], p[1]] : [x + 150, y - 140];
    pj(c, x, y, 76, [x + 150, y - 120 + 14 * Math.cos(t * 4)], m2, { alt, a1: .6, a2: .3 });
    if (!k && dib > .5) pluma(c, p[0] + 2, p[1] - 2, .3, .9);
  }
  // el libro: nace de la cabeza
  if (t >= A.cuad + .1) {
    const k = prog(t, A.cerrado3 - .46, A.cerrado3);
    const ab = prog(t, A.lee2 - .12, A.lee2 + .5);
    if (t < A.lee2 - .12) {
      libro(c, d, t, 320, BY, null, T_CUAD);
      if (t < A.cuad + .5) { c.save(); c.globalAlpha = 1 - (t - A.cuad - .1) / .4; const q = (t - A.cuad - .1) / .4; c.strokeStyle = TINTA; c.lineWidth = 6; caja(c, 320 - q * 110, BY - PH / 2 - q * 110, PW + q * 220, PH + q * 220, 14); c.stroke(); c.restore(); }
    } else if (t < A.lee2 + .5) {
      libro(c, d, t, lerp(320, 540, smooth(ab)), BY, null, finTxt, { front: T_CUAD, back: BLANCA, th: Math.PI * ease.inOutSine(ab) });
    } else if (t < A.cierra3) {
      libro(c, d, t, 540, BY, BLANCA, finTxt);
    } else if (t < A.cerrado3) {
      libro(c, d, t, lerp(540, 320, smooth(k)), BY, null, finTxt, { front: T_FIN, back: BLANCA, th: Math.PI * (1 - ease.inCubic(k)) });
    } else {
      libro(c, d, t, 320, BY, null, T_FIN);
    }
  }
  // la última bola: no sabe quién eres
  if (t >= A.quien - .2) {
    const a = t - A.quien - .1;
    const alt = a < 0 ? 1.1 * (1 - ((a + .2) / .2) ** 2) : .14 * Math.abs(Math.sin(a * 6.4)) * Math.exp(-a * 3.2);
    const R1: Pt = [bx - 250 + 12 * Math.sin(t * 2.3), by - 110], R2: Pt = [bx + 250, by - 110 + 12 * Math.cos(t * 2.7)];
    const toca = (q: number, a0: number) => Math.exp(-Math.max(a0 - q, 0) * 12) * (a0 > q ? 1 : 0);
    const pat = t > A.cerrado3 + .35 ? 1 : 0, b = t - A.cerrado3;
    const m2: Pt = pat ? [640, 880 - 24 * (toca(.7, b) + toca(1.05, b)) * Math.sin(Math.min((b - .7) * 16, 3.14))] : t > A.cerrado3 ? [lerp(R2[0], 640, smooth(prog(b, 0, .35))), lerp(R2[1], 880, smooth(prog(b, 0, .35)))] : R2;
    const v = smooth(prog(t, A.lee2, A.lee2 + .7)) * (1 - smooth(prog(t, A.cierra3 - .1, A.cierra3 + .3))), xB = lerp(bx, 762, v);
    pj(c, xB, by, 90, [lerp(R1[0], 552, v), lerp(R1[1], BY + PH / 2 + 8, v)], [lerp(m2[0], 972, v), lerp(m2[1], BY + PH / 2 + 8, v)], { alt, a1: .6, a2: .7 });
    if (t < A.lee2 - .2) texto(c, "?", bx + 200, by + 40, { fuente: serif(170 * ease.outBack(prog(t, A.quien + .34, A.quien + .5)), true), color: ACENTO });
  }
}
function lampara(c: Ctx, t: number) {
  const k = smooth(prog(t, A.norecu - .05, A.norecu + .02));
  const a = 22 * Math.sin(t * .9), b = 10 * Math.cos(t * .71);
  const fin = smooth(prog(t, A.cerrado3 + 1.2, A.fin - .55));
  const cx = lerp(540 + a, 566, fin), cy = lerp(800 + b, 646, fin), R = lerp(960 + 24 * Math.sin(t * 1.3), 215, fin);
  c.save(); c.globalCompositeOperation = "multiply"; c.globalAlpha = k; c.fillStyle = "#FFF1DC"; c.fillRect(-1600, -1800, 5000, 5000); c.restore();
  const G = c.createRadialGradient(cx, cy, R * .12, cx, cy, R);
  G.addColorStop(0, "rgba(9,9,10,0)"); G.addColorStop(.46, "rgba(9,9,10,.08)"); G.addColorStop(.74, "rgba(9,9,10,.62)"); G.addColorStop(.92, "rgba(9,9,10,.97)"); G.addColorStop(1, "rgba(9,9,10,1)");
  c.save(); c.globalAlpha = k; c.fillStyle = G; c.fillRect(-1600, -1800, 5000, 5000); c.restore();
  const r = azar(93);
  for (let i = 0; i < 46; i++) {
    const x0 = 120 + r() * 840, y0 = 330 + r() * 1100, v = 12 + r() * 26, f = r() * 6.3;
    const x = x0 + Math.sin(t * .5 + f) * 42 + a, y = 330 + ((y0 - 330 - t * v) % 1100 + 1100) % 1100;
    c.fillStyle = `rgba(255,236,190,${k * (1 - fin) * (.12 + r() * .34)})`; circulo(c, x, y, 2 + r() * 3.4);
  }
  const ne = smooth(prog(t, A.fin - .55, A.fin - .12));
  if (ne > 0) { c.fillStyle = `rgba(9,9,10,${ne})`; c.fillRect(-1600, -1800, 5000, 5000); }
}

// ---------- lo que va sobre la pantalla ----------
const G_S: [number, number, number, string[]][] = [
  [-190, 1560, 560, ["hola"]],
  [1290, 1400, 880, ["me llamo Ana"]],
  [-280, 760, 440, ["mi mamá no", "come mariscos"]],
];
function pantalla(c: Ctx, t: number) {
  rotulo(c, t, A.hop + .1, A.cal - .42, "olvida todo", 560, 168, ACENTO, true);
  rotulo(c, t, A.rasga[1] - .04, 4.92, "durante días", 240, 112, TINTA, true);
  rotulo(c, t, 5.1, A.cafe + .5, "igual que tú", 240, 112, TINTA);
  if (en(t, A.modelo, A.tel)) {
    rotulo(c, t, A.modelo + .42, A.gira - .1, "un modelo", 280, 118, TINTA);
    rotulo(c, t, A.golpes[0] - .22, A.gira - .1, "no aprende", 450, 164, ACENTO, true);
    rotulo(c, t, A.fijo, A.tel - .5, "quedó fijo", 420, 190, ACENTO, true);
    A.golpes.forEach((g, i) => {
      const [x0, y0, ang, L] = G_S[i], rad = 276, a = (ang / 1000) * TAU;
      const hx = 540 + Math.cos(a) * rad, hy = 900 + Math.sin(a) * rad;
      const u = prog(t, g - .4, g), d = t - g;
      if (u <= 0) return;
      const vx = hx > 540 ? 980 : -980, vy = -420;
      const x = d < 0 ? lerp(x0, hx, u * u) : hx + vx * d, y = d < 0 ? lerp(y0, hy, u * u) : hy + vy * d + 2600 * d * d;
      if (y > 2300 || x < -500 || x > 1600) return;
      const w = L.length > 1 ? 540 : Math.max(260, L[0].length * 38), h = L.length > 1 ? 224 : 140;
      c.save(); c.translate(x, y); c.rotate((d > 0 ? d * 4.2 : .05) * (hx > 540 ? 1 : -1));
      globo(c, 0, 0, w, h, hx > 540 ? -w * .42 : w * .42, h * .86, L, 72, false);
      c.restore();
    });
    const k = ease.outBack(prog(t, A.sello - .04, A.sello + .22), 2);
    if (k > 0) {
      const aS = clamp(k) * (1 - smooth(prog(t, A.tel - .62, A.tel - .4)));
      c.save(); c.translate(540, 1446); c.rotate(-.05); c.scale(lerp(1.8, 1, clamp(k)), lerp(1.8, 1, clamp(k))); c.globalAlpha = aS;
      c.strokeStyle = ACENTO; c.lineWidth = 8; c.beginPath(); c.roundRect(-300, -74, 600, 128, 10); c.stroke();
      texto(c, "ENTRENADO", 0, 16, { fuente: mono(84), color: ACENTO, alfa: aS }); c.restore();
    }
  }
  rotulo(c, t, A.lev + .42, A.guarda - .36, "hizo otra cosa", 240, 112, TINTA, true);
  rotulo(c, t, A.norec, A.lee - .1, "no lo recuerda", 1534, 112, TINTA, true);
  rotulo(c, t, A.lee, A.ant - .1, "lo lee", 1548, 180, ACENTO, true);
  rotulo(c, t, A.ant + .1, A.largos - .1, "Anthropic", 1538, 124, TINTA);
  rotulo(c, t, A.largos, A.cadauno - .3, "proyectos largos", 1536, 108, TINTA, true);
  rotulo(c, t, A.preg, A.prim - .1, "sin saber nada", 1536, 112, ACENTO, true);
  rotulo(c, t, A.avances - .06, A.ante - .1, "archivo de avances", 230, 100, TINTA, true);
  rotulo(c, t, A.ante, A.pag + .1, "lo que dejó el anterior", 226, 96, TINTA, true);
  rotulo(c, t, A.turnos + .34, A.cada, "turnos", 172, 126, TINTA, true);
  rotulo(c, t, A.cada + .5, A.yesto, "el expediente", 172, 116, TINTA, true);
  rotulo(c, t, A.cierra + .1, A.c1 - .2, "consecuencias", 1536, 134, ACENTO, true);
  rotulo(c, t, A.c1 + .2, A.seq - .12, "la nota está mal", 172, 108, TINTA, true);
  rotulo(c, t, A.charola - .24, A.c2 - .5, "con toda seguridad", 200, 106, ACENTO, true);
  if (en(t, A.charola + .46, A.c2 - .4)) {
    const k = ease.outBack(prog(t, A.charola + .46, A.charola + .66), 1.3), a = 1 - smooth(prog(t, A.c2 - .6, A.c2 - .4));
    c.save(); c.globalAlpha = a; c.translate(540, 1414); c.scale(clamp(k), clamp(k));
    globo(c, 0, 0, 800, 268, 0, -170, ["¡Le encantan", "los mariscos!"], 96, true, TINTA, a);
    c.restore();
  }
  rotulo(c, t, A.c2 + .1, A.cam - .3, "alguien más", 172, 128, TINTA, true);
  rotulo(c, t, A.cree - .3, A.c3 - .4, "cambia lo que cree", 190, 104, TINTA, true);
  if (en(t, A.dem - .04, A.llena + .1)) {
    const k = ease.outBack(prog(t, A.dem - .04, A.dem + .16), 1.8), s = lerp(1.7, 1, clamp(k));
    c.save(); c.translate(540, 196); c.rotate(-.025); c.scale(s, s);
    c.fillStyle = "#fff"; c.strokeStyle = ACENTO; c.lineWidth = 8; caja(c, -320, -92, 640, 164, 12); c.fill(); c.stroke();
    texto(c, "demasiado", 0, 30, { fuente: serif(132, true), color: ACENTO });
    c.restore();
  }
  rotulo(c, t, s_nosep, A.tuya - .04, "no se parece", 240, 118, TINTA, true);
  rotulo(c, t, A.tuya, A.separ - .1, "a la tuya", 240, 132, ACENTO, true);
  rotulo(c, t, A.separ, A.norecu - .12, "a un cuaderno", 240, 124, TINTA, true);
  rotulo(c, t, A.quien - .1, A.lee2 - .2, "quién eres", 176, 128, LUZ, true);
}
const s_nosep = A.tuya - 1.5;

function dibuja(c: Ctx, t: number, d: D) {
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  const [vx, vy, vz] = camara(t), [sx, sy] = sacude(t);
  const z = vz * (1 + .011 * Math.sin(t * .83));
  c.save();
  c.translate(540 + sx + 12 * Math.sin(t * .71), 900 + sy + 14 * Math.cos(t * .61));
  c.rotate(.0055 * Math.sin(t * .47));
  c.scale(z, z); c.translate(-vx, -vy);
  mundo(c, t, d);
  c.restore();
  const dark = t >= A.norecu - .05;
  if (!dark) { persianas(c, t); motas(c, t, TINTA, 1); }
  pantalla(c, t);
}

function preparar(): D {
  const mk = () => { const x = document.createElement("canvas"); x.width = Math.round(PW * HD); x.height = Math.round(PH * HD); return x; };
  const f = mk(), b = mk(), fc = f.getContext("2d")!;
  const veta = document.createElement("canvas"); veta.width = MESA.w; veta.height = MESA.h;
  const g = veta.getContext("2d")!, r = azar(505);
  g.fillStyle = KRAFT; g.fillRect(0, 0, MESA.w, MESA.h);
  for (let i = 0; i < 170; i++) {
    const y = r() * MESA.h, am = 2 + r() * 11, q = r() * 6.3;
    g.strokeStyle = `rgba(96,72,40,${.05 + r() * .13})`; g.lineWidth = 1 + r() * 2.4; g.beginPath();
    for (let x = -30; x <= MESA.w + 30; x += 30) { const yy = y + Math.sin(x / 170 + q) * am + Math.sin(x / 61 + q * 2) * am * .3; if (x < 0) g.moveTo(x, yy); else g.lineTo(x, yy); }
    g.stroke();
  }
  return { f, b, fc, bc: b.getContext("2d")!, veta, patron: fc.createPattern(veta, "no-repeat")! };
}
export const Pieza: React.FC = () => <Lienzo dibuja={dibuja} preparar={preparar} />;
