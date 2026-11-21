// Serie 2, capítulo 9: el arnés. Un motor enorme y reluciente ruge sobre una mesa sin ir a ningún lado: es el
// modelo. Pieza por pieza se le arma alrededor un coche de papel (el arnés) y la bola con manos lo maneja.
// El metal es lo único sólido del cuadro; el papel tiembla como dibujo a mano. El arranque y el final son la
// misma imagen partida en dos: arriba el motor con arnés va (y al final llega), abajo el mismo motor se queda.
// Todos los instantes vienen de `eventos.json`, que escribe partitura.py: el rugido sale de la misma curva REV.
import React from "react";
import { clamp, ease, lerp, prog, resorte, smooth, texto } from "../../kit";
import { ACENTO, bola, cue, flecha, GRIS, Lienzo, mono, PAPEL, rotulo, serif, sombra, TINTA } from "../../marca";
import { agente } from "../../personaje";
import palabras from "./palabras.json";
import duracion from "./duracion.json";
import EVJ from "./eventos.json";

export const DURACION = duracion.dur;
const T = cue(palabras);
type Ctx = CanvasRenderingContext2D;
type P2 = [number, number];
const E = EVJ as unknown as Record<string, number>;
const L = EVJ as unknown as { HERR: number[]; CAJAS: number[]; PERNOS: number[]; REV: number[][] };
const fin = (f: string) => T(f).e;

// ---------- utilidades ----------
const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * 6.2832 + f);
const hash = (a: number, b = 0) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); };
const entra = (t: number, a: number, d = .3) => smooth(prog(t, a, a + d));
const sale = (t: number, a: number, d = .3) => 1 - smooth(prog(t, a, a + d));
const pop = (t: number, a: number, d = .4, s = 1.7) => clamp(ease.outBack(prog(t, a, a + d), s), 0, 1.3);
let BT = 0;                                                   // cuadro de "hervor": el papel tiembla a 10 fps
const jit = (i: number, a = 1.5) => (hash(i * 1.37 + 3.1, BT) - .5) * 2 * a;

function rev(t: number) {
  const R = L.REV;
  if (t <= R[0][0]) return R[0][1];
  for (let i = 0; i < R.length - 1; i++) if (t < R[i + 1][0]) return lerp(R[i][1], R[i + 1][1], (t - R[i][0]) / (R[i + 1][0] - R[i][0]));
  return R[R.length - 1][1];
}
function arcoPts(cx: number, cy: number, r: number, a0: number, a1: number, n = 6): P2[] {
  const o: P2[] = [];
  for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  return o;
}
function rrPts(x: number, y: number, w: number, h: number, r: number): P2[] {
  return [...arcoPts(x + r, y + r, r, Math.PI, Math.PI * 1.5, 3), ...arcoPts(x + w - r, y + r, r, -Math.PI / 2, 0, 3),
    ...arcoPts(x + w - r, y + h - r, r, 0, Math.PI / 2, 3), ...arcoPts(x + r, y + h - r, r, Math.PI / 2, Math.PI, 3)];
}
function camino(c: Ctx, pts: P2[], cerrado = true, sem = 0, a = 1.5) {
  c.beginPath();
  pts.forEach(([x, y], i) => { const X = x + jit(sem + i * 2, a), Y = y + jit(sem + i * 2 + 1, a); if (i) c.lineTo(X, Y); else c.moveTo(X, Y); });
  if (cerrado) c.closePath();
}
/** Un recorte de papel: sombra corrida, relleno y trazo de tinta que hierve. */
function recorte(c: Ctx, pts: P2[], sem: number, o: { fill?: string; g?: number; sombra?: number; tinta?: string } = {}) {
  if ((o.sombra ?? 1) > 0) { c.save(); c.translate(8, 10); camino(c, pts, true, sem, 0); c.fillStyle = `rgba(20,18,14,${.1 * (o.sombra ?? 1)})`; c.fill(); c.restore(); }
  camino(c, pts, true, sem); c.fillStyle = o.fill ?? HOJA; c.fill();
  c.lineWidth = o.g ?? 5; c.strokeStyle = o.tinta ?? TINTA; c.lineJoin = "round"; c.stroke();
}
function circ(c: Ctx, x: number, y: number, r: number) { c.beginPath(); c.arc(x, y, Math.max(r, .01), 0, 6.2832); }
function linea(c: Ctx, ax: number, ay: number, bx: number, by: number) { c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); }
function gradV(c: Ctx, y0: number, y1: number, st: [number, string][]) { const g = c.createLinearGradient(0, y0, 0, y1); for (const [k, v] of st) g.addColorStop(k, v); return g; }

const HOJA = "#FBFAF6", MANILA = "#E8E0CB", LAPIZ = "#BAB5A9", MESA_T = "#E2DCCD", MESA_F = "#CFC7B4";
const CROMO: [number, string][] = [[0, "#fbfaf6"], [.14, "#a3a19a"], [.3, "#f4f3ee"], [.47, "#403f3b"], [.63, "#bebcb5"], [.82, "#6d6b66"], [1, "#d8d6cf"]];

// ---------- el mundo, en píxeles de reposo ----------
const PISO = 1166, MX = 745, MY_C = 1060;
const RR = { x: 270, y: 1081, r: 85 }, RD = { x: 800, y: 1081, r: 85 };
const AS = { x: 425, y: 932 }, VOL = { x: 538, y: 898, r: 42 }, TAB = { x: 590, y: 852, w: 122, h: 90 };
const TIN = { x: 503, y: 986 }, BOT = { x: 700, y: 846 }, LLAVE = { x: 612, y: 928 };
const TOPE = 958, PILA = 30, RB = 62;
const ESTANTE = { x: 326, y: 846 };          // repisa de manuales sobre el respaldo
const CUERPO: P2[] = [[95, 1056], ...arcoPts(125, 990, 30, Math.PI, Math.PI * 1.5, 4), [316, 960], [330, 986], [546, 986], [556, 966], [606, 966], [616, 1004],
  ...arcoPts(918, 1032, 28, -Math.PI / 2, 0, 4), [950, 1056]];
const CUERPO_X: P2[] = [[102, 1056], [102, 966], [312, 966], [322, 986], [546, 986], [552, 958], [612, 958], [618, 998], [940, 998], [952, 1022], [952, 1056]];
const HOJAS: [number, number][] = [[40, .1], [140, -.2], [370, .25], [520, -.1], [640, .3], [890, -.15], [1010, .2], [-120, .05]];

// ---------- el motor: lo único de metal ----------
type Mot = { llama?: number; tos?: number; brillo?: number; resplandor?: number; ver?: number };
function motor(c: Ctx, t: number, x: number, y: number, s: number, rv: number, o: Mot = {}) {
  const v = .7 + 4.6 * rv * rv;
  const dx = v * (Math.sin(t * 93) + .5 * Math.sin(t * 151 + 2)), dy = v * .8 * Math.sin(t * 71 + 1);
  c.save(); c.translate(x, y); c.scale(s, s);
  if ((o.resplandor ?? 0) > 0) {
    const g = c.createRadialGradient(0, -250, 30, 0, -250, 520);
    g.addColorStop(0, `rgba(255,236,190,${.75 * o.resplandor!})`); g.addColorStop(.5, `rgba(255,226,170,${.25 * o.resplandor!})`); g.addColorStop(1, "rgba(255,226,170,0)");
    c.fillStyle = g; c.fillRect(-560, -800, 1120, 1000);
  }
  sombra(c, 0, 2, 260, .32);
  c.translate(dx, dy); c.rotate(.005 * rv * Math.sin(t * 57));
  humo(c, t, rv, o.tos ?? 0);
  c.lineJoin = "round";
  // cárter
  c.beginPath(); c.moveTo(-142, -58); c.lineTo(142, -58); c.lineTo(124, -8); c.quadraticCurveTo(120, 0, 108, 0); c.lineTo(-108, 0); c.quadraticCurveTo(-120, 0, -124, -8); c.closePath();
  c.fillStyle = gradV(c, -58, 0, [[0, "#57554f"], [.35, "#2a2927"], [.8, "#131312"], [1, "#2e2d2b"]]); c.fill(); c.strokeStyle = TINTA; c.lineWidth = 4; c.stroke();
  c.fillStyle = "#8f8d86"; for (let i = -4; i <= 4; i++) { circ(c, i * 29, -49, 4.5); c.fill(); }
  // bloque
  c.beginPath(); c.roundRect(-170, -224, 340, 170, 16);
  c.fillStyle = gradV(c, -224, -54, [[0, "#6c6a65"], [.12, "#3b3a37"], [.5, "#1d1c1b"], [.88, "#2f2e2c"], [1, "#5b5954"]]); c.fill(); c.stroke();
  for (let i = -3; i <= 3; i++) { c.strokeStyle = "rgba(255,255,255,.07)"; c.lineWidth = 7; linea(c, i * 42, -214, i * 42, -64); c.strokeStyle = "rgba(0,0,0,.4)"; c.lineWidth = 2; linea(c, i * 42 + 6, -214, i * 42 + 6, -64); }
  for (const px of [-96, 0, 96]) { c.fillStyle = "#77756f"; circ(c, px, -100, 14); c.fill(); c.strokeStyle = TINTA; c.lineWidth = 3; c.stroke(); c.fillStyle = "#b9b7b0"; circ(c, px - 4, -104, 5); c.fill(); }
  // polea del cigüeñal: gira con las revoluciones
  const ang = t * (9 + 46 * rv);
  c.fillStyle = "#151514"; circ(c, 188, -112, 48); c.fill();
  c.strokeStyle = "#cfcdc6"; c.lineWidth = 7; circ(c, 188, -112, 38); c.stroke();
  c.strokeStyle = "#8d8b84"; c.lineWidth = 6; for (let k = 0; k < 3; k++) { const a = ang + k * 2.094; linea(c, 188, -112, 188 + Math.cos(a) * 34, -112 + Math.sin(a) * 34); }
  c.fillStyle = "#e9e7e0"; circ(c, 188, -112, 9); c.fill();
  // banda
  c.save(); c.strokeStyle = "#0c0c0c"; c.lineWidth = 11; c.lineCap = "round";
  linea(c, 150 - 26, -368, 188 - 44, -112); linea(c, 150 + 28, -368, 188 + 46, -112);
  c.strokeStyle = "rgba(220,218,210,.75)"; c.lineWidth = 3; c.setLineDash([9, 23]); c.lineDashOffset = -t * (160 + 900 * rv);
  linea(c, 150 - 26, -368, 188 - 44, -112); c.lineDashOffset = t * (160 + 900 * rv); linea(c, 150 + 28, -368, 188 + 46, -112);
  c.restore();
  // tapa de punterías (cromo)
  const tapa = new Path2D(); tapa.roundRect(-162, -292, 324, 76, 22);
  c.fillStyle = gradV(c, -292, -216, CROMO); c.fill(tapa); c.strokeStyle = TINTA; c.lineWidth = 4; c.stroke(tapa);
  c.strokeStyle = "rgba(30,30,28,.45)"; c.lineWidth = 3; for (let i = 0; i < 8; i++) linea(c, -130 + i * 36, -284, -114 + i * 36, -224);
  c.fillStyle = "#3a3936"; for (let i = 0; i < 6; i++) { circ(c, -135 + i * 54, -224, 5); c.fill(); }
  // múltiple y soplador
  c.fillStyle = "#24231f"; c.beginPath(); c.moveTo(-124, -290); c.lineTo(-104, -314); c.lineTo(104, -314); c.lineTo(124, -290); c.closePath(); c.fill(); c.strokeStyle = TINTA; c.stroke();
  const sopl = new Path2D(); sopl.roundRect(-112, -414, 224, 104, 10);
  c.fillStyle = gradV(c, -414, -310, CROMO); c.fill(sopl); c.strokeStyle = TINTA; c.lineWidth = 4; c.stroke(sopl);
  for (let i = 0; i < 7; i++) { const yy = -400 + i * 13; c.strokeStyle = "rgba(20,20,18,.42)"; c.lineWidth = 3; linea(c, -104, yy, 104, yy); c.strokeStyle = "rgba(255,255,255,.6)"; c.lineWidth = 2; linea(c, -104, yy + 3, 104, yy + 3); }
  const hoc = new Path2D(); hoc.rect(110, -396, 34, 54);
  c.fillStyle = gradV(c, -396, -342, CROMO); c.fill(hoc); c.stroke(hoc);
  c.fillStyle = "#151514"; circ(c, 150, -368, 31); c.fill();
  c.strokeStyle = "#d8d6cf"; c.lineWidth = 5; circ(c, 150, -368, 22); c.stroke();
  c.strokeStyle = "#8d8b84"; c.lineWidth = 5; for (let k = 0; k < 3; k++) { const a = ang * 1.4 + k * 2.094; linea(c, 150, -368, 150 + Math.cos(a) * 19, -368 + Math.sin(a) * 19); }
  // sombrero con toma de aire y mariposa
  const som = new Path2D(); som.moveTo(-84, -414); som.lineTo(-64, -490); som.lineTo(56, -490); som.lineTo(84, -414); som.closePath();
  c.fillStyle = gradV(c, -490, -414, CROMO); c.fill(som); c.stroke(som);
  c.fillStyle = "#0d0d0c"; c.beginPath(); c.ellipse(70, -454, 15, 31, 0, 0, 6.2832); c.fill();
  c.strokeStyle = "#9c9a93"; c.lineWidth = 3; const mf = Math.sin(t * (6 + 40 * rv)) * .9 * rv; linea(c, 70 - Math.cos(mf) * 4, -454 - 26 * Math.cos(mf), 70 + Math.cos(mf) * 4, -454 + 26 * Math.cos(mf));
  // escapes: cuatro tubos de cromo que suben hacia atrás
  const tubos = [-122, -56, 10, 76];
  c.lineCap = "round";
  for (const px of tubos) {
    c.strokeStyle = TINTA; c.lineWidth = 30; c.beginPath(); c.moveTo(px, -168); c.quadraticCurveTo(px + 4, -214, px - 42, -250); c.stroke();
    c.strokeStyle = "#a9a7a0"; c.lineWidth = 21; c.stroke();
    c.strokeStyle = "#f6f5f0"; c.lineWidth = 6; c.beginPath(); c.moveTo(px - 5, -170); c.quadraticCurveTo(px - 2, -212, px - 44, -244); c.stroke();
    c.fillStyle = "#0b0b0b"; c.beginPath(); c.ellipse(px - 44, -252, 13, 7, -.75, 0, 6.2832); c.fill();
  }
  llamas(c, t, rv, tubos, o.llama ?? 0);
  // el brillo que barre el cromo
  const cromo = new Path2D(); cromo.addPath(tapa); cromo.addPath(sopl); cromo.addPath(som); cromo.addPath(hoc);
  c.save(); c.clip(cromo);
  const barre = (u: number, a: number) => {
    if (a <= 0 || u <= 0 || u >= 1) return;
    const bx = lerp(-330, 330, u);
    c.fillStyle = `rgba(255,255,255,${a})`; c.beginPath(); c.moveTo(bx - 20, -520); c.lineTo(bx + 34, -520); c.lineTo(bx - 120, -180); c.lineTo(bx - 174, -180); c.closePath(); c.fill();
  };
  barre(((t + .7) / 3.9) % 1 * 1.5 - .25, .62);
  barre(prog(t, o.brillo ?? -9, (o.brillo ?? -9) + .55), .85);
  c.restore();
  // destellos de estrella
  for (let k = 0; k < 3; k++) {
    const p = 2.3 + k * .7, f = ((t + k * 1.3) % p) / p;
    if (f < .14) {
      const q = Math.sin(f / .14 * Math.PI), sx = [-90, 60, 20][k], sy = [-268, -398, -476][k];
      c.fillStyle = "#fff"; c.globalAlpha = q;
      c.beginPath(); c.moveTo(sx, sy - 26 * q); c.lineTo(sx + 5, sy - 5); c.lineTo(sx + 26 * q, sy); c.lineTo(sx + 5, sy + 5); c.lineTo(sx, sy + 26 * q); c.lineTo(sx - 5, sy + 5); c.lineTo(sx - 26 * q, sy); c.lineTo(sx - 5, sy - 5); c.closePath(); c.fill();
      c.globalAlpha = 1;
    }
  }
  c.restore();
}

function llamas(c: Ctx, t: number, rv: number, tubos: number[], extra: number) {
  const k = clamp((rv - .78) / .22) + extra;
  if (k <= .01) return;
  tubos.forEach((px, i) => {
    const l = (46 + 84 * k) * (.72 + .28 * Math.sin(t * 47 + i * 2.1)), x0 = px - 50, y0 = -258;
    const ux = -.62, uy = -.78, nx = -uy, ny = ux;
    for (const [w, col, f] of [[22, ACENTO, 1], [11, "#FFF3DE", .62]] as [number, string, number][]) {
      c.fillStyle = col; c.beginPath(); c.moveTo(x0 + nx * w * .5, y0 + ny * w * .5);
      c.quadraticCurveTo(x0 + ux * l * f * .5 + nx * w, y0 + uy * l * f * .5 + ny * w, x0 + ux * l * f, y0 + uy * l * f);
      c.quadraticCurveTo(x0 + ux * l * f * .5 - nx * w, y0 + uy * l * f * .5 - ny * w, x0 - nx * w * .5, y0 - ny * w * .5); c.closePath(); c.fill();
    }
  });
}

/** Humo de los escapes: bocanadas periódicas, función pura de t. */
function humo(c: Ctx, t: number, rv: number, tos: number) {
  const P = .16, n = Math.floor(t / P);
  for (let j = 0; j < 9; j++) {
    const tn = (n - j) * P, a = t - tn, i = ((n - j) % 4 + 4) % 4, px = [-122, -56, 10, 76][i] - 44;
    if (a < 0 || a > 1.4) continue;
    const r = 7 + a * 44 * (.6 + rv), x = px - a * 70 - a * a * 30, y = -258 - a * 120;
    c.fillStyle = `rgba(120,118,112,${(1 - a / 1.4) * .22 * (.25 + rv)})`; circ(c, x, y, r); c.fill();
  }
  if (tos > 0) {
    for (let j = 0; j < 6; j++) {
      const a = tos * 1.2 - j * .12; if (a < 0 || a > 1.1) continue;
      const x = -40 - a * 120 + j * 20, y = -270 - a * 220 - j * 12, r = 30 + a * 90;
      c.fillStyle = `rgba(22,21,20,${(1 - a / 1.1) * .75})`; circ(c, x, y, r); c.fill();
    }
  }
}

// ---------- piezas de papel ----------
function rueda(c: Ctx, x: number, y: number, r: number, ang: number, frenos = 0, aprieta = 0, gris = 0) {
  c.save(); c.translate(x, y);
  sombra(c, 0, r - 2, r * 1.3, .25);
  c.fillStyle = "#121211"; circ(c, jit(91, 1), jit(92, 1), r); c.fill();
  c.strokeStyle = "#3b3a37"; c.lineWidth = r * .1; circ(c, 0, 0, r * .8); c.stroke();
  c.strokeStyle = "rgba(240,238,232,.55)"; c.lineWidth = 4; c.lineCap = "round";
  for (let k = 0; k < 6; k++) { const a = ang + k * 1.047; c.beginPath(); c.arc(0, 0, r * .9, a, a + .3); c.stroke(); }
  c.fillStyle = HOJA; circ(c, 0, 0, r * .56); c.fill(); c.strokeStyle = TINTA; c.lineWidth = 4; c.stroke();
  if (frenos > 0) {
    c.globalAlpha = frenos; c.strokeStyle = "#77756f"; c.lineWidth = r * .12; circ(c, 0, 0, r * .4); c.stroke();
    c.fillStyle = "#4b4a46"; for (let k = 0; k < 8; k++) { const a = ang + k * .785; circ(c, Math.cos(a) * r * .4, Math.sin(a) * r * .4, 2.6); c.fill(); }
    c.globalAlpha = 1;
  }
  c.fillStyle = TINTA; for (let k = 0; k < 5; k++) { const a = ang + k * 1.2566; circ(c, Math.cos(a) * r * .24, Math.sin(a) * r * .24, 4.5); c.fill(); }
  if (frenos > 0) {
    // la mordaza: entra desde arriba y aprieta el disco
    const a = -2.25, d = r * lerp(.9, .44, frenos) + aprieta * -4;
    c.save(); c.rotate(a + Math.PI / 2); c.translate(0, -d);
    c.globalAlpha = clamp(frenos * 2) * (1 - gris * .65);
    c.fillStyle = TINTA; c.beginPath(); c.roundRect(-20, -22, 40, 40, 8); c.fill();
    c.fillStyle = "#e9e6de"; c.fillRect(-10, -12, 20, 5);
    c.restore();
  }
  c.restore();
}

function hoja(c: Ctx, x: number, y: number, w: number, h: number, rot: number, sem: number, lineas = 4) {
  c.save(); c.translate(x, y); c.rotate(rot);
  recorte(c, [[-w / 2, -h / 2], [w / 2 - 14, -h / 2], [w / 2, -h / 2 + 14], [w / 2, h / 2], [-w / 2, h / 2]], sem, { g: 3.5, sombra: .7 });
  c.strokeStyle = "rgba(17,17,17,.55)"; c.lineWidth = 3;
  for (let i = 0; i < lineas; i++) { const yy = -h / 2 + h * (i + 1.2) / (lineas + 1.4); linea(c, -w / 2 + 12, yy, w / 2 - 12 - (i % 3) * w * .12, yy); }
  c.restore();
}
/** Hoja acostada sobre la mesa (vista un poco desde arriba). */
function hojaPlana(c: Ctx, x: number, y: number, rot: number, sem: number, a = 1) {
  if (a <= 0) return;
  c.save(); c.globalAlpha = a; c.translate(x, y); c.scale(1, .3); c.rotate(rot);
  recorte(c, [[-44, -32], [44, -32], [44, 32], [-44, 32]], sem, { g: 7, sombra: .5 });
  c.restore();
}
function lupa(c: Ctx, x: number, y: number, s: number, rot = 0) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  c.fillStyle = "rgba(210,226,226,.5)"; circ(c, 0, 0, 22); c.fill();
  c.strokeStyle = TINTA; c.lineWidth = 7; c.lineCap = "round"; circ(c, 0, 0, 22); c.stroke(); linea(c, 16, 16, 40, 40);
  c.restore();
}
function sobre(c: Ctx, x: number, y: number, s: number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  recorte(c, [[-26, -17], [26, -17], [26, 17], [-26, 17]], 41, { g: 3.5, sombra: .5 });
  c.strokeStyle = TINTA; c.lineWidth = 3.5; c.beginPath(); c.moveTo(-26, -17); c.lineTo(0, 4); c.lineTo(26, -17); c.stroke();
  c.restore();
}
function pluma(c: Ctx, x: number, y: number, rot = 0, s = 1) {
  c.save(); c.translate(x, y); c.rotate(rot + .55); c.scale(s, s);
  c.fillStyle = TINTA; c.beginPath(); c.moveTo(0, 0); c.lineTo(-14, -52); c.quadraticCurveTo(-16, -70, -10, -82); c.lineTo(10, -82); c.quadraticCurveTo(16, -70, 14, -52); c.closePath(); c.fill();
  c.strokeStyle = PAPEL; c.lineWidth = 2.5; linea(c, 0, -10, 0, -46);
  c.fillStyle = "#262625"; c.fillRect(-12, -330, 24, 252); c.fillStyle = "#6e6c66"; c.fillRect(-12, -90, 24, 8);
  c.restore();
}

/** El tintero, sobre el borde de la cabina. `vuelca` 0-1 lo tumba hacia el frente. */
function tintero(c: Ctx, vuelca: number) {
  c.save(); c.translate(TIN.x + 17, TIN.y); c.rotate(vuelca * 1.75); c.translate(-17, 0);
  recorte(c, [[0, 0], [0, -26], [6, -32], [10, -32], [10, -40], [24, -40], [24, -32], [28, -32], [34, -26], [34, 0]], 61, { g: 4, fill: "#2b2b2a", sombra: .6 });
  c.fillStyle = "rgba(255,255,255,.35)"; c.fillRect(5, -24, 5, 18);
  c.restore();
}

/** La mancha de tinta: crece sobre la puerta, recortada a la carrocería. `k` 0-1. */
function mancha(c: Ctx, k: number) {
  if (k <= .005) return;
  c.save(); camino(c, CUERPO, true, 0, 0); c.clip();
  c.fillStyle = "#0e0e0e";
  const fuentes: [number, number, number][] = [[520, 990, 70], [470, 1010, 60], [430, 1030, 54], [560, 1030, 56], [400, 1048, 40], [610, 1046, 44], [480, 1052, 50]];
  fuentes.forEach(([x, y, r], i) => { const q = clamp(k * 1.6 - i * .09); if (q > 0) { circ(c, x, y, r * ease.outCubic(q)); c.fill(); } });
  for (let i = 0; i < 6; i++) { const q = clamp(k * 1.4 - .3 - i * .05); if (q <= 0) continue; const x = 395 + i * 48 + hash(i, 4) * 20, w = 12 + hash(i, 6) * 10; c.beginPath(); c.roundRect(x, 980, w, 40 + 70 * q * (.6 + hash(i, 8) * .6), w / 2); c.fill(); }
  c.restore();
}

type Kit = {
  chasis: number; carro: number; volante: number; frenos: number; aprieta: number; tablero: number; herr: number[]; manu: number; remolque: number;
  boton: number; botonK: number; llave: number; llaveGiro: number; nombre: number; texto: string; tinta: number; vuelca: number; gris: number; rojo: number;
  rv: number; giro: number; volGiro: number; motorS: number; motorY: number; aviso: number; estilo: 0 | 1; abre: number; llama: number; tos: number; brillo: number; resplandor: number;
  ruedaD: { dx: number; dy: number; a: number } | null; piloto: null | { x: number; y: number; m1: P2; m2: P2; a1?: number; a2?: number }; ayudante: number; aguja: number;
};
const KIT0: Kit = {
  chasis: 0, carro: 0, volante: 0, frenos: 0, aprieta: 0, tablero: 0, herr: [0, 0, 0], manu: 0, remolque: 0, boton: 0, botonK: 0, llave: 0, llaveGiro: 0, nombre: 0, texto: "",
  tinta: 0, vuelca: 0, gris: 0, rojo: 0, rv: .4, giro: 0, volGiro: 0, motorS: 1, motorY: PISO, aviso: 0, estilo: 0, abre: 0, llama: 0, tos: 0, brillo: -9, resplandor: 0,
  ruedaD: null, piloto: null, ayudante: 0, aguja: 0,
};

function remolque(c: Ctx, t: number, k: number, ayu: number, giro: number, alfa: number) {
  if (k <= 0) return;
  c.save(); c.globalAlpha = alfa;
  c.translate(-20, PISO); c.scale(clamp(k, 0, 1.2), clamp(k, 0, 1.2)); c.translate(20, -PISO);
  c.strokeStyle = TINTA; c.lineWidth = 9; linea(c, -70, 1046, 100, 1046);
  c.fillStyle = TINTA; circ(c, 100, 1046, 9); c.fill();
  // la mesita del ayudante y su bola
  if (ayu > 0) {
    const a = clamp(ayu);
    c.save(); c.globalAlpha = alfa * a;
    const bx = -262, by = 934 + Math.abs(Math.sin(t * 3.1)) * -8;
    const s1 = Math.sin(t * 5.3), s2 = Math.sin(t * 4.1 + 1);
    agente(c, bx, by, 50 * ease.outBack(a), [bx + 76 + s1 * 14, 946 + s2 * 8], [bx + 132 + s2 * 18, 948 + s1 * 6], { abre1: .5 + .3 * s1, abre2: .5 + .3 * s2 });
    c.strokeStyle = TINTA; c.lineWidth = 5; linea(c, -210, 960, -110, 960); linea(c, -196, 960, -196, 994); linea(c, -124, 960, -124, 994);
    for (let i = 0; i < 3; i++) { c.save(); c.translate(-160 + i * 4 + Math.sin(t * 2 + i) * 3, 954 - i * 4); c.scale(1, .3); c.fillStyle = HOJA; c.strokeStyle = TINTA; c.lineWidth = 6; c.beginPath(); c.rect(-32, -22, 64, 44); c.fill(); c.stroke(); c.restore(); }
    c.restore();
  }
  recorte(c, [[-330, 994], [-70, 994], [-70, 1052], [-330, 1052]], 71, { g: 5 });
  c.strokeStyle = LAPIZ; c.lineWidth = 3; linea(c, -320, 1012, -80, 1012);
  rueda(c, -200, 1100, 64, giro * 85 / 64);
  c.restore();
}

function rack(c: Ctx, t: number, K: Kit, gr: number) {
  // herramientas de pie sobre la cubierta trasera: lupa, hoja, sobre
  const [h0, h1, h2] = K.herr;
  c.save(); c.globalAlpha = 1 - gr * .65;
  if (h0 > 0 || h1 > 0 || h2 > 0) { c.strokeStyle = TINTA; c.lineWidth = 6; linea(c, 104, 960, 296, 960); }
  if (h0 > 0) lupa(c, 132, 912, 1.05 * h0, -.5 + .05 * Math.sin(t * 2));
  if (h1 > 0) { c.save(); c.translate(198, 922); c.scale(h1, h1); hoja(c, 0, 0, 50, 66, .08, 51, 4); c.restore(); }
  if (h2 > 0) sobre(c, 262, 936, 1.05 * h2);
  // manuales
  if (K.manu > 0) {
    const k = clamp(K.manu, 0, 1.25);
    c.save(); c.translate(ESTANTE.x, ESTANTE.y); c.scale(k, k);
    c.strokeStyle = TINTA; c.lineWidth = 5; linea(c, -50, 0, 50, 0);
    for (let i = 0; i < 4; i++) {
      if (i === 2 && K.abre > 0) continue;
      const x = -40 + i * 22, h = 58 + (i % 2) * 8;
      c.fillStyle = i % 2 ? HOJA : "#2a2a28"; c.strokeStyle = TINTA; c.lineWidth = 3.5;
      c.beginPath(); c.roundRect(x, -h, 18, h, 3); c.fill(); c.stroke();
      c.strokeStyle = i % 2 ? TINTA : "#d9d6ce"; c.lineWidth = 2; linea(c, x + 4, -h + 12, x + 14, -h + 12);
    }
    if (K.abre > 0) {
      // el manual que se necesita: sube, se voltea y se abre
      const a = K.abre, sube = ease.outCubic(clamp(a * 2)), abre = smooth(clamp(a * 2 - .6));
      c.translate(10 + 30 * sube, -62 - 110 * sube); c.scale(1 + 1.1 * sube, 1 + 1.1 * sube);
      const w = lerp(9, 46, abre);
      for (const lado of [-1, 1]) {
        c.fillStyle = HOJA; c.strokeStyle = TINTA; c.lineWidth = 2.5;
        c.beginPath(); c.moveTo(0, -30); c.quadraticCurveTo(lado * w * .5, -36, lado * w, -30); c.lineTo(lado * w, 30); c.quadraticCurveTo(lado * w * .5, 24, 0, 30); c.closePath(); c.fill(); c.stroke();
        if (abre > .3) { c.strokeStyle = "rgba(17,17,17,.55)"; c.lineWidth = 2; for (let i = 0; i < 4; i++) linea(c, lado * 7, -16 + i * 11, lado * (w - 7), -16 + i * 11); }
      }
      // hojas que pasan
      if (abre > .2 && abre < 1) { const f = (t * 14) % 1; c.fillStyle = HOJA; c.beginPath(); c.moveTo(0, -30); c.lineTo(Math.cos(f * Math.PI) * w, -30); c.lineTo(Math.cos(f * Math.PI) * w, 30); c.lineTo(0, 30); c.closePath(); c.fill(); c.stroke(); }
    }
    c.restore();
  }
  c.restore();
}

/** El coche completo alrededor del motor, en coordenadas del mundo (mira a la derecha). */
function coche(c: Ctx, t: number, K: Kit) {
  const gr = K.gris, cuerpo = K.estilo ? CUERPO_X : CUERPO;
  const papel = (f: () => void) => { c.save(); c.globalAlpha *= 1 - gr * .68; f(); c.restore(); };
  remolque(c, t, K.remolque, K.ayudante, K.giro, 1 - gr * .68);
  rack(c, t, K, gr);
  // asiento
  if (K.carro > 0) papel(() => { c.save(); c.translate(0, 1056); c.scale(1, clamp(K.carro, 0, 1.2)); c.translate(0, -1056); recorte(c, rrPts(300, 846, 50, 150, 18), 81, { g: 5 }); c.restore(); });
  // motor
  motor(c, t, MX, K.motorY, K.motorS, K.rv, { llama: K.llama, tos: K.tos, brillo: K.brillo, resplandor: K.resplandor });
  // tablero
  if (K.tablero > 0) papel(() => {
    const k = clamp(K.tablero, 0, 1.25);
    c.save(); c.translate(TAB.x + TAB.w / 2, TAB.y + TAB.h); c.scale(1, k); c.translate(-(TAB.x + TAB.w / 2), -(TAB.y + TAB.h));
    c.strokeStyle = TINTA; c.lineWidth = 8; linea(c, TAB.x + 30, TAB.y + TAB.h, TAB.x + 22, 990);
    recorte(c, rrPts(TAB.x, TAB.y, TAB.w, TAB.h, 14), 101, { g: 5 });
    for (const [gx, base] of [[TAB.x + 32, -2.4], [TAB.x + 88, -2.1]] as [number, number][]) {
      c.strokeStyle = TINTA; c.lineWidth = 3.5; circ(c, gx, TAB.y + 34, 21); c.stroke();
      for (let i = 0; i < 5; i++) { const a = -3.6 + i * .55; linea(c, gx + Math.cos(a) * 15, TAB.y + 34 + Math.sin(a) * 15, gx + Math.cos(a) * 20, TAB.y + 34 + Math.sin(a) * 20); }
      const a = base + K.aguja + K.rv * 1.9 + .08 * Math.sin(t * 13 + gx);
      c.lineWidth = 3; linea(c, gx, TAB.y + 34, gx + Math.cos(a) * 17, TAB.y + 34 + Math.sin(a) * 17);
    }
    // foco de aviso
    const enc = K.aviso > 0 && Math.sin(t * 26) > -.2;
    if (enc) { const g = c.createRadialGradient(TAB.x + 60, TAB.y + 72, 2, TAB.x + 60, TAB.y + 72, 40); g.addColorStop(0, "rgba(192,68,42,.55)"); g.addColorStop(1, "rgba(192,68,42,0)"); c.fillStyle = g; circ(c, TAB.x + 60, TAB.y + 72, 40); c.fill(); }
    c.fillStyle = enc ? ACENTO : "#e6e2d8"; circ(c, TAB.x + 60, TAB.y + 72, 8); c.fill(); c.strokeStyle = TINTA; c.lineWidth = 3; c.stroke();
    // ranura de la llave
    c.fillStyle = TINTA; circ(c, LLAVE.x, LLAVE.y, 6); c.fill();
    c.restore();
  });
  if (K.llave > 0) papel(() => {
    c.save(); c.translate(LLAVE.x, LLAVE.y); c.rotate(K.llaveGiro * 1.57); c.scale(K.llave * 1.7, K.llave * 1.7);
    c.fillStyle = "#d9d5c9"; c.strokeStyle = TINTA; c.lineWidth = 3.5;
    c.beginPath(); c.arc(-30, 0, 15, 0, 6.2832); c.fill(); c.stroke();
    c.fillStyle = PAPEL; circ(c, -34, 0, 5); c.fill(); c.stroke();
    c.fillStyle = "#d9d5c9"; c.beginPath(); c.rect(-16, -5, 18, 10); c.fill(); c.stroke();
    c.restore();
  });
  // botón para regresar
  if (K.boton > 0) papel(() => {
    const k = clamp(K.boton, 0, 1.3);
    c.save(); c.translate(BOT.x, BOT.y + 6); c.scale(k, k);
    c.fillStyle = TINTA; c.beginPath(); c.roundRect(-24, -4, 48, 12, 4); c.fill();
    const h = 14 * (1 - K.botonK * .75);
    c.fillStyle = ACENTO; c.beginPath(); c.ellipse(0, -4 - h, 20, 9, 0, 0, 6.2832); c.fill(); c.fillRect(-20, -4 - h, 40, h); c.beginPath(); c.ellipse(0, -4, 20, 9, 0, 0, 3.1416); c.fill();
    c.fillStyle = "rgba(255,255,255,.4)"; c.beginPath(); c.ellipse(-6, -6 - h, 8, 3.5, 0, 0, 6.2832); c.fill();
    c.restore();
  });
  // volante
  if (K.volante > 0) papel(() => {
    c.strokeStyle = TINTA; c.lineWidth = 9; c.lineCap = "round"; c.globalAlpha *= clamp(K.volante * 2);
    linea(c, VOL.x + 8, VOL.y + 12, 576, 978);
    c.globalAlpha = 1 - gr * .68;
    c.save(); c.translate(VOL.x, VOL.y); c.scale(clamp(K.volante, 0, 1.2), clamp(K.volante, 0, 1.2)); c.rotate(K.volGiro);
    c.lineWidth = 9; circ(c, 0, 0, VOL.r); c.stroke();
    c.lineWidth = 6; for (let k = 0; k < 3; k++) { const a = -1.5708 + k * 2.094; linea(c, 0, 0, Math.cos(a) * VOL.r, Math.sin(a) * VOL.r); }
    c.fillStyle = TINTA; circ(c, 0, 0, 9); c.fill();
    c.restore();
  });
  // la bola al volante
  if (K.piloto) {
    const p = K.piloto;
    agente(c, p.x, p.y, RB, p.m1, p.m2, { abre1: p.a1 ?? .55, abre2: p.a2 ?? .55 });
  }
  // chasis y ruedas
  if (K.chasis > 0) papel(() => {
    const k = clamp(K.chasis, 0, 1.25);
    c.save(); c.translate(0, PISO); c.scale(1, k); c.translate(0, -PISO);
    c.strokeStyle = TINTA; c.lineWidth = 12; linea(c, 160, 1062, 930, 1062);
    c.restore();
  });
  // carrocería: se despliega desde el piso como libro de pop-up
  if (K.carro > 0) papel(() => {
    c.save(); c.translate(0, 1056); c.scale(1, clamp(K.carro, 0, 1.2)); c.translate(0, -1056);
    tintero(c, K.vuelca);
    recorte(c, cuerpo, 111, { g: 6, fill: K.estilo ? "#34322e" : HOJA });
    c.strokeStyle = LAPIZ; c.lineWidth = 3; linea(c, 120, 1040, 930, 1040);
    c.strokeStyle = "rgba(17,17,17,.25)"; c.lineWidth = 3; linea(c, 556, 990, 556, 1050);
    // el nombre pintado en la puerta
    if (K.nombre > 0 && K.texto) {
      c.save(); c.beginPath(); c.rect(370, 960, 330 * K.nombre, 120); c.clip();
      texto(c, K.texto, 386, 1036, { fuente: serif(62, true), color: K.estilo ? PAPEL : TINTA, alin: "left" });
      c.restore();
    }
    mancha(c, K.tinta);
    c.restore();
  });
  // ruedas, con frenos
  if (K.chasis > 0) papel(() => {
    const k = clamp(K.chasis, 0, 1.25);
    c.save(); c.translate(0, PISO); c.scale(k, k); c.translate(0, -PISO);
    rueda(c, RR.x, RR.y, RR.r, K.giro, K.frenos, K.aprieta, gr);
    const d = K.ruedaD ?? { dx: 0, dy: 0, a: 0 };
    rueda(c, RD.x + d.dx, RD.y + d.dy, RD.r, K.giro + d.a, K.frenos, K.aprieta, gr);
    c.restore();
  });
  // el contorno rojo del arnés: todo lo que no es motor
  if (K.rojo > 0) {
    c.save(); c.globalAlpha = K.rojo; c.strokeStyle = ACENTO; c.lineWidth = 6; c.setLineDash([16, 11]); c.lineDashOffset = -t * 70; c.lineJoin = "round";
    camino(c, cuerpo.map(([x, y]) => [x, y] as P2), true, 0, 0); c.stroke();
    circ(c, RR.x, RR.y, RR.r + 8); c.stroke(); circ(c, RD.x, RD.y, RD.r + 8); c.stroke();
    if (K.volante > .5) { circ(c, VOL.x, VOL.y, VOL.r + 10); c.stroke(); }
    if (K.tablero > .5) { c.beginPath(); c.roundRect(TAB.x - 8, TAB.y - 8, TAB.w + 16, TAB.h + 16, 18); c.stroke(); }
    if (K.carro > .5) { c.beginPath(); c.roundRect(292, 838, 66, 166, 22); c.stroke(); }
    c.restore();
  }
}

// ---------- la mesa y su mundo ----------
function mesa(c: Ctx, x0: number, x1: number, y: number, sem: number, patas: number[]) {
  for (const px of patas) recorte(c, [[px - 18, y + 40], [px + 18, y + 40], [px + 14, y + 470], [px - 14, y + 470]], sem + px, { g: 5, fill: MESA_F, sombra: .7 });
  recorte(c, [[x0 + 26, y - 48], [x1 - 26, y - 48], [x1, y + 12], [x0, y + 12]], sem, { g: 5, fill: MESA_T, sombra: 0 });
  recorte(c, [[x0, y + 12], [x1, y + 12], [x1, y + 44], [x0, y + 44]], sem + 9, { g: 5, fill: MESA_F });
}

function polvo(c: Ctx, t: number, x0: number, x1: number, y0: number, y1: number) {
  c.fillStyle = TINTA;
  for (let i = 0; i < 60; i++) {
    const a = hash(i, 1), b = hash(i, 2), v = 14 + hash(i, 3) * 40;
    const x = x0 + a * (x1 - x0) + Math.sin(t * .5 + i) * 30, y = y0 + ((b * (y1 - y0) - t * v) % (y1 - y0) + (y1 - y0)) % (y1 - y0);
    c.globalAlpha = .06 + hash(i, 4) * .14; c.fillRect(x, y, 2 + hash(i, 5) * 3, 2 + hash(i, 5) * 3);
  }
  c.globalAlpha = 1;
}

function calendario(c: Ctx, x: number, y: number, s: number, t: number, flips: number[], meses: string[], a: number) {
  if (a <= 0) return;
  c.save(); c.globalAlpha = a; c.translate(x, y); c.scale(s, s); c.rotate(.03 * vaiven(t, 3.1));
  recorte(c, rrPts(-120, -130, 240, 280, 14), 131, { g: 5 });
  let n = 0; for (const f of flips) if (t >= f + .1) n++;
  const pag = (k: number) => { texto(c, meses[Math.min(k, meses.length - 1)].split(" ")[0], 0, 30, { fuente: serif(76, true), color: TINTA }); texto(c, meses[Math.min(k, meses.length - 1)].split(" ")[1], 0, 100, { fuente: mono(46), color: GRIS }); };
  pag(n);
  // la hoja que se arranca vuela hacia arriba
  const ul = flips.findIndex((f) => t >= f && t < f + .32);
  if (ul >= 0) {
    const u = (t - flips[ul]) / .32;
    c.save(); c.translate(0, -110); c.rotate(-u * 1.2); c.translate(u * 160, -u * 260); c.globalAlpha = a * (1 - u);
    recorte(c, rrPts(-114, 0, 228, 250, 10), 141 + ul, { g: 3, sombra: 0 }); c.translate(0, 110);
    texto(c, meses[Math.min(ul, meses.length - 1)].split(" ")[0], 0, 30, { fuente: serif(76, true), color: TINTA }); c.restore();
  }
  c.fillStyle = TINTA; for (let i = 0; i < 6; i++) { c.beginPath(); c.roundRect(-92 + i * 36, -146, 12, 32, 6); c.fill(); }
  c.restore();
}

function paquete(c: Ctx, t: number, x: number, y: number, ic: number, a: number, sem: number) {
  if (a <= 0) return;
  c.save(); c.globalAlpha = a; c.translate(x, y); c.scale(1.6, 1.6);
  recorte(c, [[-60, 0], [60, 0], [60, 96], [-60, 96]], sem, { g: 5, fill: MANILA });
  c.strokeStyle = TINTA; c.lineWidth = 3; linea(c, 0, 0, 0, 96); linea(c, -60, 48, 60, 48);
  c.translate(0, 48);
  c.fillStyle = HOJA; circ(c, 0, 0, 31); c.fill(); c.strokeStyle = TINTA; c.lineWidth = 3; c.stroke();
  if (ic === 0) { c.fillStyle = TINTA; c.save(); c.scale(.6, .6); agenteIcono(c); c.restore(); }
  if (ic === 1) { for (let i = 0; i < 3; i++) { c.fillStyle = i % 2 ? HOJA : TINTA; c.fillRect(-15 + i * 11, -16, 9, 32); c.strokeRect(-15 + i * 11, -16, 9, 32); } }
  if (ic === 2) { c.fillStyle = ACENTO; c.beginPath(); c.ellipse(0, -3, 16, 8, 0, 0, 6.2832); c.fill(); c.fillRect(-16, -3, 32, 9); c.fillStyle = TINTA; c.fillRect(-20, 7, 40, 6); }
  if (ic === 3) { c.fillStyle = ACENTO; c.fillRect(-14, -16, 28, 26); c.fillStyle = TINTA; c.fillRect(-22, 10, 44, 7); }
  c.restore();
}
function agenteIcono(c: Ctx) { bola(c, 0, 4, 22); c.strokeStyle = TINTA; c.lineWidth = 5; linea(c, -14, -10, -30, -28); linea(c, 14, -10, 30, -28); }

function tope(c: Ctx, t: number, x: number, k: number, pernos: number[]) {
  if (k <= 0) return;
  c.save(); c.translate(x, PISO); c.scale(clamp(k, 0, 1.2), clamp(k, 0, 1.2));
  sombra(c, 0, 0, 80, .35);
  c.fillStyle = TINTA; c.beginPath(); c.roundRect(-46, -16, 92, 16, 3); c.fill();
  const g = c.createLinearGradient(-28, 0, 28, 0); g.addColorStop(0, "#7E2413"); g.addColorStop(.35, ACENTO); g.addColorStop(.7, "#d86a50"); g.addColorStop(1, "#8f2c18");
  c.fillStyle = g; c.beginPath(); c.moveTo(-28, -16); c.lineTo(-24, -96); c.lineTo(24, -96); c.lineTo(28, -16); c.closePath(); c.fill(); c.strokeStyle = TINTA; c.lineWidth = 4; c.stroke();
  c.strokeStyle = "rgba(17,17,17,.35)"; c.lineWidth = 3; for (let i = 0; i < 3; i++) linea(c, -22, -36 - i * 20, 22, -46 - i * 20);
  pernos.forEach((a, i) => {
    const px = i ? 36 : -36;
    c.fillStyle = "#c9c7c0"; circ(c, px, -16, 8); c.fill(); c.strokeStyle = TINTA; c.lineWidth = 2.5; c.stroke();
    c.strokeStyle = TINTA; c.lineWidth = 2.5; linea(c, px - Math.cos(a) * 6, -16 - Math.sin(a) * 2, px + Math.cos(a) * 6, -16 + Math.sin(a) * 2);
  });
  c.restore();
}

function cocheFantasma(c: Ctx, x: number, y: number, s: number, a: number, var_: number) {
  if (a <= 0) return;
  c.save(); c.globalAlpha = a; c.translate(x, y); c.scale(s, s); c.translate(-525, -1166);
  c.strokeStyle = "#7f7a6f"; c.lineWidth = 3.2 / s; c.lineJoin = "round";
  const P = var_ % 2 ? CUERPO_X : CUERPO;
  c.beginPath(); P.forEach(([px, py], i) => { if (i) c.lineTo(px, py - var_ % 3 * 6); else c.moveTo(px, py); }); c.closePath(); c.fillStyle = "rgba(251,250,246,.6)"; c.fill(); c.stroke();
  c.beginPath(); c.roundRect(600, 780, 300, 220, 20); c.stroke();
  circ(c, RR.x, RR.y, RR.r); c.stroke(); circ(c, RD.x, RD.y, RD.r); c.stroke();
  c.fillStyle = ACENTO; for (const [px, py] of [[958, 1120], [-120, 1020], [258, 920], [700, 846]]) { if (px < 0) continue; circ(c, px, py, 16); c.fill(); }
  c.restore();
}

function laptop(c: Ctx, tapa: number, base: number) {
  if (base > 0) {
    c.save(); c.globalAlpha = base;
    recorte(c, [[-640, 1600], [1720, 1600], [1880, 1980], [-800, 1980]], 161, { g: 8, fill: "#d9d4c8", sombra: 0 });
    c.fillStyle = "#c3bdae"; c.strokeStyle = "rgba(17,17,17,.45)"; c.lineWidth = 3;
    for (let r = 0; r < 4; r++) for (let i = 0; i < 18; i++) {
      const y = 1640 + r * 70, sh = (y - 1600) / 380, x = lerp(-600, -760, sh) + i * lerp(126, 144, sh);
      c.beginPath(); c.roundRect(x, y, lerp(106, 122, sh), 54, 8); c.fill(); c.stroke();
    }
    c.restore();
  }
  if (tapa > 0) {
    c.save(); c.translate(0, 1600); c.scale(1, tapa); c.translate(0, -1600);
    recorte(c, rrPts(-560, -880, 2200, 2470, 60), 171, { g: 9, fill: "#2a2a28", sombra: .8 });
    c.fillStyle = "#EEEBE3"; c.beginPath(); c.roundRect(-500, -820, 2080, 2340, 24); c.fill();
    c.strokeStyle = "rgba(17,17,17,.06)"; c.lineWidth = 3; for (let i = 0; i < 24; i++) linea(c, -500, -760 + i * 100, 1580, -760 + i * 100);
    c.restore();
  }
}

function carpeta(c: Ctx, k: number, t: number) {
  if (k <= 0) return;
  c.save(); c.translate(540, 1180); c.scale(1, clamp(k, 0, 1.15)); c.translate(-540, -1180);
  recorte(c, [[30, 560], [560, 560], [600, 440], [1030, 440], [1050, 560], [1050, 1180], [30, 1180]], 181, { g: 6, fill: MANILA });
  texto(c, "tu proyecto", 815, 535, { fuente: serif(100, true), color: TINTA });
  c.restore();
  void t;
}

function navegador(c: Ctx, t: number, baja: number, rasga: number) {
  if (baja <= 0 || rasga >= 1) return;
  const y0 = -1300 * (1 - baja);
  const X0 = 20, X1 = 1060, Y0 = 430 + y0, Y1 = 1290 + y0, BL = 64, BA = 128;
  const mitad = (lado: number) => {
    c.save();
    if (rasga > 0) {
      const u = rasga, px = lado < 0 ? X0 + 200 : X1 - 200;
      c.translate(px, Y1); c.rotate(lado * u * 1.2); c.translate(lado * u * 260, 900 * u * u); c.translate(-px, -Y1);
      c.globalAlpha = 1 - smooth(prog(u, .6, 1));
    }
    c.beginPath();
    const corte: P2[] = []; for (let i = 0; i <= 14; i++) corte.push([540 + (hash(i, 7) - .5) * 70 + (i - 7) * 6, lerp(Y0, Y1, i / 14)]);
    if (lado < 0) { c.moveTo(X0, Y0); corte.forEach(([x, y]) => c.lineTo(x, y)); c.lineTo(X0, Y1); }
    else { c.moveTo(X1, Y0); corte.forEach(([x, y]) => c.lineTo(x, y)); c.lineTo(X1, Y1); }
    c.closePath(); c.clip();
    c.fillStyle = "#F7F5EF"; c.beginPath(); c.rect(X0, Y0, X1 - X0, Y1 - Y0); c.rect(X0 + BL, Y0 + BA, X1 - X0 - 2 * BL, Y1 - Y0 - BA - BL); c.fill("evenodd");
    c.strokeStyle = TINTA; c.lineWidth = 7; c.strokeRect(X0, Y0, X1 - X0, Y1 - Y0); c.lineWidth = 5; c.strokeRect(X0 + BL, Y0 + BA, X1 - X0 - 2 * BL, Y1 - Y0 - BA - BL);
    c.fillStyle = TINTA; for (let i = 0; i < 3; i++) { circ(c, X0 + 62 + i * 44, Y0 + 64, 15); c.fill(); }
    c.fillStyle = "#e4e0d6"; c.beginPath(); c.roundRect(X0 + 220, Y0 + 36, 660, 56, 28); c.fill(); c.lineWidth = 4; c.stroke();
    c.strokeStyle = "rgba(17,17,17,.12)"; c.lineWidth = 3; for (let i = 0; i < 9; i++) linea(c, X0 + 10, Y0 + BA + 40 + i * 80, X0 + BL - 10, Y0 + BA + 40 + i * 80);
    c.restore();
  };
  mitad(-1); mitad(1);
  void t;
}

function casa(c: Ctx, t: number, x: number, y: number, s: number, fiesta: number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  recorte(c, [[-150, 0], [-150, -230], [150, -230], [150, 0]], 191, { g: 6 });
  recorte(c, [[-180, -226], [0, -360], [180, -226]], 192, { g: 6, fill: "#2b2a28" });
  recorte(c, [[-44, 0], [-44, -130], [44, -130], [44, 0]], 193, { g: 5, fill: MANILA });
  c.fillStyle = TINTA; circ(c, 28, -64, 6); c.fill();
  recorte(c, rrPts(-128, -200, 64, 56, 6), 194, { g: 4, fill: "#f3e7c4" }); recorte(c, rrPts(64, -200, 64, 56, 6), 195, { g: 4, fill: "#f3e7c4" });
  // banderines y globos
  c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.moveTo(-150, -226); c.quadraticCurveTo(0, -170, 150, -226); c.stroke();
  for (let i = 0; i < 7; i++) { const u = (i + .5) / 7, bx = lerp(-150, 150, u), by = -226 + 56 * 4 * u * (1 - u) * .5; c.fillStyle = i % 2 ? ACENTO : TINTA; c.beginPath(); c.moveTo(bx - 14, by); c.lineTo(bx + 14, by); c.lineTo(bx, by + 30); c.closePath(); c.fill(); }
  for (let i = 0; i < 3; i++) {
    const bx = 150 + 22 + i * 40, by = -300 - i * 30 + 8 * Math.sin(t * 2 + i) - 40 * fiesta;
    c.strokeStyle = TINTA; c.lineWidth = 2; linea(c, 150, -120, bx, by + 34);
    c.fillStyle = i === 1 ? ACENTO : HOJA; c.beginPath(); c.ellipse(bx, by, 26, 32, 0, 0, 6.2832); c.fill(); c.lineWidth = 3.5; c.stroke();
  }
  c.restore();
}

function confeti(c: Ctx, t: number, t0: number, x: number, y: number, n = 90) {
  const a = t - t0; if (a < 0) return;
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + (hash(i, 11) - .5) * 2.4, v = 500 + hash(i, 12) * 900, g = 900;
    const px = x + Math.cos(ang) * v * a * Math.exp(-a * .9) + Math.sin(a * 3 + i) * 20 * a;
    const py = y + Math.sin(ang) * v * a * Math.exp(-a * .9) + .5 * g * a * a * .5;
    c.save(); c.translate(px, py); c.rotate(a * (4 + hash(i, 13) * 6)); c.globalAlpha = 1 - smooth(prog(a, 2.6, 3.4));
    c.fillStyle = i % 3 === 0 ? ACENTO : i % 3 === 1 ? TINTA : "#d8d2c2"; c.fillRect(-9, -5, 18, 10 * Math.abs(Math.cos(a * 7 + i))); c.restore();
  }
}

// ---------- el estado del coche en cada instante ----------
function manos(t: number): { m1: P2; m2: P2; a1: number; a2: number } {
  const wob = (k: number) => 6 * Math.sin(t * 2.7 + k);
  const enVolante: [P2, P2] = [[VOL.x - 30 + wob(1), VOL.y - 26 + wob(2)], [VOL.x + 34 + wob(3), VOL.y + 12 + wob(4)]];
  const arriba: [P2, P2] = [[AS.x - 130 + 24 * Math.sin(t * 7), AS.y - 170 + 16 * Math.sin(t * 9)], [AS.x + 120 + 20 * Math.sin(t * 8 + 1), AS.y - 190 + 14 * Math.sin(t * 6)]];
  let m1 = arriba[0], m2 = arriba[1], a1 = .9, a2 = .9;
  const v = smooth(prog(t, E.VOLANTE + .12, E.VOLANTE + .38));
  m1 = mix(m1, enVolante[0], v); m2 = mix(m2, enVolante[1], v); a1 = lerp(.9, .2, v); a2 = lerp(.9, .2, v);
  // herramientas: la mano de atrás toma la lupa y la levanta
  const h = smooth(prog(t, L.HERR[0] - .05, L.HERR[0] + .25)) * (1 - smooth(prog(t, L.HERR[2] + .35, E.BARRE - .1)));
  m1 = mix(m1, [150, 880 - 50 * smooth(prog(t, L.HERR[1], L.HERR[2]))], h);
  // permisos: gira la llave
  const k = smooth(prog(t, E.PERM + .25, E.PERM + .45)) * (1 - smooth(prog(t, E.PERM + .8, E.PERM + 1.1)));
  m2 = mix(m2, [LLAVE.x - 30, LLAVE.y - 4], k);
  // la falla: estira el brazo y atrapa la rueda
  const f = smooth(prog(t, E.ARREGLA - .25, E.ARREGLA)) * (1 - smooth(prog(t, E.ARREGLA + .2, E.ARREGLA + .5)));
  m2 = mix(m2, [RD.x + ruedaFuera(E.ARREGLA).dx + 10, RD.y - 60], f);
  // leer y cambiar archivos
  const l = smooth(prog(t, E.LEE, E.LEE + .3)) * (1 - smooth(prog(t, E.VERDAD + .05, E.VERDAD + .3)));
  m1 = mix(m1, [260, 720], l);
  // tinta y botón
  const r1 = smooth(prog(t, E.RIEGA - .14, E.RIEGA)), r2 = smooth(prog(t, E.REBOB - .3, E.REBOB - .08)), r3 = smooth(prog(t, E.REBOB + .35, E.REBOB + .65));
  m2 = mix(mix(mix(m2, [TIN.x + 10, TIN.y - 30], r1 * (1 - r2)), [BOT.x, BOT.y - 14], r2 * (1 - r3)), m2, 0);
  // manual: voltea a verlo con la mano de atrás
  const ma = smooth(prog(t, E.ABRE + .1, E.ABRE + .35)) * (1 - smooth(prog(t, E.CIERRA - .2, E.CIERRA + .1)));
  m1 = mix(m1, [ESTANTE.x + 6, ESTANTE.y - 90], ma);
  // a fondo: festeja al llegar
  return { m1, m2, a1, a2 };
}
const mix = (a: P2, b: P2, k: number): P2 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

function ruedaFuera(t: number) {
  const a0 = E.FALLA + .08;
  if (t < a0) return { dx: 0, dy: 0, a: 0 };
  const vuelve = ease.outBack(prog(t, E.ARREGLA + .02, E.ARREGLA + .32), 1.3);
  const u = Math.min(t, E.ARREGLA) - a0;
  const dx = 250 * (1 - Math.exp(-u * 2.6)), dy = -150 * Math.max(0, Math.sin(Math.min(u / .42, 1) * Math.PI)) - 46 * Math.max(0, Math.sin(clamp((u - .42) / .22) * Math.PI));
  return { dx: lerp(dx, 0, vuelve), dy: lerp(dy, 0, vuelve), a: lerp(dx / 85, 0, vuelve) };
}

function cocheEn(t: number): Kit {
  const K: Kit = { ...KIT0, herr: [0, 0, 0] };
  K.chasis = ease.outBack(prog(t, E.CHASIS, E.CHASIS + .5), 1.4);
  K.carro = ease.outBack(prog(t, E.CARROC, E.CARROC + .5), 1.3);
  K.volante = ease.outBack(prog(t, E.VOLANTE + .05, E.VOLANTE + .38), 1.6);
  K.frenos = ease.outBack(prog(t, E.FRENOS, E.FRENOS + .22), 1.2);
  K.aprieta = Math.exp(-Math.max(t - E.FRENOS - .12, 0) * 6) * (t > E.FRENOS + .12 ? 1 : 0) + (t > E.FRENA ? 0 : 0);
  K.tablero = ease.outBack(prog(t, E.TABLERO, E.TABLERO + .4), 1.6);
  K.herr = L.HERR.map((h) => ease.outBack(prog(t, h, h + .3), 2));
  K.motorY = lerp(PISO, MY_C, ease.outBack(prog(t, E.CHASIS + .1, E.CHASIS + .5), 1.2));
  K.rv = rev(t);
  K.llave = ease.outBack(prog(t, E.PERM, E.PERM + .25), 1.5);
  K.llaveGiro = ease.outBack(prog(t, E.PERM + .38, E.PERM + .5), 2);
  K.aviso = t > E.FALLA + .05 && t < E.ARREGLA + .25 ? 1 : 0;
  K.tos = t > E.FALLA && t < E.FALLA + 1 ? (t - E.FALLA) : 0;
  K.ruedaD = ruedaFuera(t);
  K.nombre = prog(t, E.CLAUDE, E.CLAUDEF + .12); K.texto = "Claude Code";
  K.manu = ease.outBack(prog(t, E.MANU + .3, E.MANU + .6), 1.8);
  K.abre = t > E.ABRE && t < E.CIERRA + .2 ? clamp((t - E.ABRE) / .7) * (1 - smooth(prog(t, E.CIERRA - .15, E.CIERRA + .15))) : 0;
  K.remolque = ease.outBack(prog(t, E.AYUD + .3, E.AYUD + .7), 1.3);
  K.ayudante = ease.outBack(prog(t, E.AYUD + .55, E.AYUD + .9), 1.5);
  K.boton = ease.outBack(prog(t, E.BOTON + .3, E.BOTON + .55), 2);
  K.botonK = Math.exp(-Math.max(t - E.REBOB + .06, 0) * 7) * (t > E.REBOB - .06 ? 1 : 0);
  const rebob = smooth(prog(t, E.REBOB, E.REBOB + .6));
  K.vuelca = ease.outBack(prog(t, E.RIEGA, E.RIEGA + .22), 1.2) * (1 - rebob);
  K.tinta = smooth(prog(t, E.RIEGA + .1, E.REBOB - .05)) * (1 - rebob);
  K.gris = smooth(prog(t, E.NADA, E.NADA + .5)) * (1 - smooth(prog(t, E.ABURR - .1, E.ABURR + .4)));
  K.resplandor = smooth(prog(t, E.NADA + .1, E.NADA + .7)) * (1 - smooth(prog(t, E.ABURR - .1, E.ABURR + .5)));
  K.rojo = smooth(prog(t, E.HARNESS - .05, E.HARNESS + .3)) * (1 - smooth(prog(t, L.HERR[0] - .55, L.HERR[0] - .2)))
    + smooth(prog(t, E.ALRED + .1, E.ALRED + .5)) * (1 - smooth(prog(t, E.IMPORTA - .2, E.IMPORTA + .1))) * .9;
  K.brillo = t < E.MESA ? E.POTENTE : t < E.HARNESS ? E.CHASIS + .5 : t < E.ALRED ? E.NADA + .3 : E.IMPORTA;
  K.llama = 0;
  // a manejar: el volante gira solo un poco, las ruedas giran cuando el coche "va"
  K.volGiro = .25 * Math.sin(t * 1.3) + .15 * Math.sin(t * 2.9);
  const piloto = manos(t);
  // de pie en la mesa, empuja el motor, y el asiento la sube
  let x = AS.x, y = AS.y;
  const anda = prog(t, E.MESA - .3, E.MESA + .8);
  if (t < E.CARROC + .7) {
    x = lerp(-150, AS.x, ease.outCubic(anda)); y = PISO - RB - Math.abs(Math.sin(anda * Math.PI * 4)) * 50 * (1 - anda * .6);
    const sube = ease.outBack(prog(t, E.CARROC + .2, E.CARROC + .62), 1.4);
    y = lerp(y, AS.y, sube);
  }
  let { m1, m2 } = piloto;
  const { a1, a2 } = piloto;
  if (t < E.VOLANTE + .1) {
    // empuja el motor: no se mueve
    const em = smooth(prog(t, E.NINGUN - .1, E.NINGUN + .15)) * (1 - smooth(prog(t, E.NINGUN + 1.1, E.NINGUN + 1.4)));
    const emp = Math.sin(Math.max(t - E.NINGUN, 0) * 9) * 8;
    m1 = mix(m1, [MX - 172 + emp, PISO - 150], em); m2 = mix(m2, [MX - 170 + emp, PISO - 70], em);
    x += em * (18 + emp);
    if (t < E.MESA - .3) { m1 = [x - 80, y - 60]; m2 = [x + 80, y - 60]; }
  }
  K.piloto = { x: x + Math.sin(t * 2.3) * 3, y: y + Math.sin(t * 3.1) * 3, m1, m2, a1, a2 };
  return K;
}

// ---------- cámara ----------
type CK = { t: number; z: number; x: number; y: number; d?: number; f?: (x: number) => number };
const CAM: CK[] = [
  { t: 0, z: .8, x: 745, y: 503 },
  { t: E.SUBE, z: 1.22, x: 745, y: 900, d: 1.0 },
  { t: E.POTENTE - .12, z: 1.36, x: 745, y: 880, d: .4, f: ease.outCubic },
  { t: E.MESA - .15, z: .95, x: 600, y: 990, d: .9 },
  { t: E.CHASIS - .1, z: .88, x: 530, y: 960, d: .8 },
  { t: E.VOLANTE - .2, z: 1.45, x: 520, y: 950, d: .5 },
  { t: E.FRENOS - .22, z: 1.55, x: 320, y: 1040, d: .5 },
  { t: E.TABLERO - .22, z: 1.55, x: 620, y: 930, d: .5 },
  { t: E.INGLES - .2, z: 1.0, x: 530, y: 860, d: .8 },
  { t: L.HERR[0] - .3, z: 1.75, x: 240, y: 910, d: .5 },
  { t: E.BARRE - .15, z: 1.0, x: 420, y: 1000, d: .55 },
  { t: E.PERM - .2, z: 1.45, x: 610, y: 930, d: .5 },
  { t: E.FALLA - .35, z: 1.05, x: 660, y: 990, d: .55 },
  { t: E.FAMOSO - .1, z: 1.12, x: 540, y: 880, d: 1.6 },
  { t: E.FEB - .3, z: 1.35, x: 330, y: 640, d: .6 },
  { t: E.CLAUDE - .35, z: 1.5, x: 545, y: 1000, d: .5 },
  { t: E.WEB - .2, z: .88, x: 540, y: 900, d: .7 },
  { t: E.COMPU - .1, z: .42, x: 540, y: 820, d: 1.0 },
  { t: E.PROY - .1, z: .82, x: 540, y: 890, d: .9 },
  { t: E.LEE - .15, z: 1.12, x: 380, y: 840, d: .6 },
  { t: E.VERDAD + .3, z: .85, x: 540, y: 900, d: .8 },
  { t: L.CAJAS[0] - .2, z: .8, x: 520, y: 840, d: .7 },
  { t: E.IMITA - .1, z: .62, x: 540, y: 720, d: .9 },
  { t: E.REGLAS - .1, z: 1.15, x: 800, y: 1000, d: .7 },
  { t: E.AYUD - .25, z: 1.12, x: -20, y: 980, d: .6 },
  { t: E.MANU - .2, z: 1.4, x: 330, y: 840, d: .55 },
  { t: E.BOTON - .2, z: 1.35, x: 600, y: 920, d: .5 },
  { t: E.RIEGA - .3, z: 1.12, x: 540, y: 970, d: .5 },
  { t: E.NADA - .1, z: .78, x: 330, y: 820, d: 1.1 },
  { t: E.ALRED - .1, z: .86, x: 560, y: 860, d: 1.2 },
  { t: E.IMPORTA - .05, z: .78, x: 420, y: 860, d: .3, f: ease.outCubic },
  { t: E.OPENAI - .3, z: 1.0, x: 540, y: 540, d: 1.0 },
  { t: E.CODEX - .3, z: 1.25, x: 540, y: 330, d: .6 },
  { t: E.YO - .1, z: 1.0, x: 540, y: 540, d: .8 },
  { t: E.SIENTES - .2, z: 1.65, x: 480, y: 930, d: .8 },
];
const GOLPES: [number, number][] = [[E.ATERRIZA, 26], [E.INUTIL, 12], [E.POTENTE, 10], [E.CHASIS + .5, 6], [E.FALLA, 10], [E.VERDAD + .15, 6],
  [E.REGLAS + .42, 12], [E.SLAM, 30], [E.AYUD + .35, 5], [E.IMPORTA, 24], [E.ARRANCA + .2, 10]];
function camara(t: number) {
  let z = CAM[0].z, x = CAM[0].x, y = CAM[0].y;
  for (const k of CAM) { if (t <= k.t) break; const q = (k.f ?? ease.inOutCubic)(prog(t, k.t, k.t + (k.d ?? 1))); z = lerp(z, k.z, q); x = lerp(x, k.x, q); y = lerp(y, k.y, q); }
  let sx = 0, sy = 0;
  for (const [g, a] of GOLPES) if (t > g) { const e = a * Math.exp(-(t - g) * 7); sx += e * Math.sin((t - g) * 61) * .6; sy += e * Math.sin((t - g) * 47); }
  const rr = rev(t) ** 2; sx += rr * 2.2 * Math.sin(t * 83); sy += rr * 1.6 * Math.sin(t * 67);
  return { z: z * (1 + .012 * vaiven(t, 5.3)), x: x + 9 * vaiven(t, 6.1) + sx / z, y: y + 11 * vaiven(t, 4.4, 1) + sy / z, r: .004 * vaiven(t, 7.7, 2) };
}
type Cam = ReturnType<typeof camara>;
const aPantalla = (cam: Cam, x: number, y: number): P2 => [540 + (x - cam.x) * cam.z, 960 + (y - cam.y) * cam.z];

// ---------- el mundo de la mesa ----------
function mundo(c: Ctx, t: number, cam: Cam) {
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  c.save(); c.translate(540, 960); c.rotate(cam.r); c.scale(cam.z, cam.z); c.translate(-cam.x, -cam.y);
  polvo(c, t, -600, 1700, -400, 2000);
  const K = cocheEn(t);
  // laptop: se abre detrás
  const tapa = ease.outCubic(prog(t, E.COMPU - .15, E.COMPU + .55)) * (1 - ease.inCubic(prog(t, E.PROY - .25, E.PROY + .2)));
  laptop(c, tapa, smooth(prog(t, E.COMPU - .15, E.COMPU + .3)) * (1 - smooth(prog(t, E.PROY + .1, E.PROY + .5))));
  // calendario en la pared
  const MESES = ["marzo 2024", "abril 2024", "mayo 2024", "junio 2024", "julio 2024", "agosto 2024", "sept. 2024", "oct. 2024", "nov. 2024", "dic. 2024", "enero 2025", "febrero 2025"];
  const flips = Array.from({ length: 11 }, (_, k) => E.FEB + k * (E.FEBF - E.FEB) / 11);
  const aCal = pop(t, E.FEB - .5, .4) * sale(t, E.WEB - .3, .3);
  if (aCal > 0) calendario(c, 250, 560 - 60 * (1 - clamp(aCal)), 1, t, flips, MESES, clamp(aCal));
  // carpeta del proyecto, con archivos de verdad
  const kc = ease.outBack(prog(t, E.PROY, E.PROY + .45), 1.2) * (1 - smooth(prog(t, L.CAJAS[0] - .7, L.CAJAS[0] - .2)));
  if (kc > 0) {
    carpeta(c, kc, t);
    for (let i = 0; i < 4; i++) {
      if (i === 1 && t > E.LEE - .05 && t < E.VERDAD + .2) continue;
      hoja(c, 150 + i * 110, 760 + (i % 2) * 24 + (1 - clamp(kc)) * 300, 120, 170, (i - 1.5) * .06, 201 + i * 9, 5);
    }
  }
  // fantasmas: otros coches que imitan las piezas
  const aF = sale(t, E.REGLAS - .3, .5);
  if (t > E.IMITA - .1 && aF > 0) for (let i = 0; i < 14; i++) {
    const fila = i % 2, col = Math.floor(i / 2), a = entra(t, E.IMITA + i * .05, .25) * aF * .8;
    cocheFantasma(c, -300 + col * 260 + fila * 130, 210 + fila * 160, .26, a, i);
  }
  // los paquetes cuelgan de un hilo
  const PQ = [{ x: 140, ic: 0, usa: E.AYUD, dest: [-120, 1000] }, { x: 380, ic: 1, usa: E.MANU, dest: [ESTANTE.x, ESTANTE.y - 20] }, { x: 630, ic: 2, usa: E.BOTON, dest: [BOT.x, BOT.y] }, { x: 880, ic: 3, usa: E.REGLAS, dest: [TOPE, 1100] }];
  const hilo = entra(t, L.CAJAS[0] - .5, .4) * sale(t, E.NADA - .2, .4);
  if (hilo > 0) { c.save(); c.globalAlpha = hilo; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.moveTo(-500, 380); c.quadraticCurveTo(540, 420, 1600, 380); c.stroke(); c.restore(); }
  PQ.forEach((p, i) => {
    const ll = L.CAJAS[i];
    if (t < ll - .05 || t > p.usa + .32) return;
    let y = lerp(-500, 410, ease.outBack(prog(t, ll - .05, ll + .3), 1.1));
    let x = p.x, rot = .1 * Math.sin((t - ll) * 4.2) * Math.exp(-(t - ll) * 1.2) + .03 * Math.sin(t * 1.7 + i);
    if (t > p.usa) { const u = prog(t, p.usa, p.usa + .3); x = lerp(p.x, p.dest[0], u); y = lerp(410, p.dest[1] - 70, ease.inCubic(u)); rot += u * 2; }
    c.save(); c.translate(x, y); c.rotate(rot);
    if (t < p.usa) { c.strokeStyle = TINTA; c.lineWidth = 3; linea(c, 0, -20, 0, 0); }
    paquete(c, t, 0, 0, p.ic, 1, 211 + i * 5); c.restore();
    void x;
  });
  // repisa de Codex: entra con OpenAI y se va al volver a nuestro coche
  const rep = ease.outCubic(prog(t, E.OPENAI - .3, E.OPENAI + .5)) * (1 - ease.inCubic(prog(t, E.SIENTES - .1, E.SIENTES + .5)));
  if (rep > 0) {
    c.save(); c.translate(1500 * (1 - rep), 0);
    recorte(c, [[40, 470], [1040, 470], [1040, 500], [40, 500]], 221, { g: 5, fill: MESA_T });
    c.strokeStyle = TINTA; c.lineWidth = 5; linea(c, 120, 500, 160, 560); linea(c, 960, 500, 920, 560);
    c.translate(540, 470); c.scale(.82, .82); c.translate(-525, -PISO);
    const KX: Kit = { ...KIT0, chasis: 1, carro: 1, volante: 1, frenos: 1, tablero: 1, herr: [1, 1, 1], manu: 1, estilo: 1, motorY: MY_C, rv: rev(t) * .9, motorS: motorX(t),
      nombre: prog(t, E.CODEX, E.CODEX + .4), texto: "Codex", volGiro: .2 * Math.sin(t * 1.7), giro: 0 };
    const mm = manos(E.HARNESS);
    KX.piloto = { x: AS.x, y: AS.y + Math.sin(t * 2.9) * 3, m1: mm.m1, m2: mm.m2, a1: .2, a2: .2 };
    coche(c, t, KX);
    if (t > E.CODEX - .3 && t < E.CODEX + .7) { const u = prog(t, E.CODEX, E.CODEX + .4); pluma(c, 386 + 200 * u, 1030 + Math.sin(t * 34) * 14, 0, .9); }
    c.restore();
  }
  // cada pocos meses: el calendario vuelve y se deshoja
  const aCal2 = pop(t, E.MESES - .35, .35) * sale(t, E.SIENTES - .25, .3);
  if (aCal2 > 0) {
    const M2 = ["marzo 2025", "abril 2025", "mayo 2025", "junio 2025", "julio 2025", "agosto 2025", "sept. 2025", "oct. 2025", "nov. 2025", "dic. 2025", "enero 2026", "feb. 2026", "marzo 2026"];
    calendario(c, 170, -40 - 50 * (1 - clamp(aCal2)), 1, t, Array.from({ length: 12 }, (_, k) => E.MESES + k * .09), M2, clamp(aCal2));
  }
  // el ejemplo más famoso: un reflector cae sobre el coche
  const refl = entra(t, E.FAMOSO - .15, .3) * sale(t, E.FEB - .45, .3);
  if (refl > 0) {
    c.save(); c.fillStyle = `rgba(9,9,10,${.34 * refl})`; c.beginPath(); c.rect(-1400, -1400, 4200, 4400);
    c.moveTo(430, -600); c.lineTo(110, 1200); c.lineTo(1000, 1200); c.lineTo(650, -600); c.closePath(); c.fill("evenodd"); c.restore();
  }
  // la mesa
  const rebota = t > E.ATERRIZA ? 10 * Math.exp(-(t - E.ATERRIZA) * 8) * Math.sin((t - E.ATERRIZA) * 30) : 0;
  c.save(); c.translate(0, rebota * .4);
  mesa(c, -440, 1080, 1180, 301, [-380, 120, 960]);
  c.restore();
  // hojas de la mesa: brincan con el golpe y luego se ordenan solas en una pila
  HOJAS.forEach(([hx, hr], i) => {
    const salto = t > E.ATERRIZA ? 70 * Math.exp(-(t - E.ATERRIZA) * 4) * Math.abs(Math.sin((t - E.ATERRIZA) * 9 + i)) : 0;
    const vuela = prog(t, E.BARRE + .2 + i * .07, E.BARRE + .62 + i * .07);
    const x = lerp(hx, PILA, ease.inOutCubic(vuela)), y = lerp(1160 - salto, PISO - 6 - i * 6, ease.inOutCubic(vuela)) - Math.sin(vuela * Math.PI) * 140;
    hojaPlana(c, x, y, lerp(hr + salto * .01, 0, vuela), 311 + i * 3);
  });
  // el tope: llega con el paquete y se atornilla
  const kt = t > E.REGLAS + .3 ? ease.outBack(prog(t, E.REGLAS + .3, E.REGLAS + .45), 1.5) : 0;
  const pernos = L.PERNOS.map((p) => ease.outCubic(prog(t, p, p + .45)) * 14);
  tope(c, t, TOPE, kt, pernos);
  // nuestro coche, o el motor solo
  const dx = cocheDx(t), dy = cocheDy(t);
  c.save(); c.translate(dx, dy);
  if (t < E.CHASIS) {
    const caida = caeMotor(t, E.ATERRIZA);
    const ui = t - E.INUTIL, brinco = ui > 0 && ui < 1.05 ? -42 * Math.abs(Math.sin(ui * Math.PI / .33)) * (1 - ui / 1.1) : 0;
    const K0 = { ...K, motorY: PISO + caida + brinco };
    if (t > E.MESA - .3) agente(c, K.piloto!.x, K.piloto!.y, RB, K.piloto!.m1, K.piloto!.m2, { abre1: .7, abre2: .7, piso: PISO, sombra: .25 });
    motor(c, t, MX, K0.motorY, 1, K.rv, { brillo: E.POTENTE, llama: t > E.POTENTE && t < E.POTENTE + .8 ? .7 * sale(t, E.POTENTE + .4, .4) : 0, tos: ui > .55 && ui < 1.6 ? ui - .55 : 0 });
    etiqueta(c, t);
  } else {
    K.giro = (t > E.ARRANCA ? (t - E.ARRANCA) ** 2 * 9 : 0) + dx / 85;
    K.llama = (t > E.IMPORTA && t < E.IMPORTA + .7 ? sale(t, E.IMPORTA + .3, .4) : 0) + (t > E.EMBISTE && t < E.SLAM + .2 ? .8 : 0);
    K.motorS = motorX(t, true);
    coche(c, t, K);
    etiqueta(c, t, K.motorY);
    // la pluma escribe el nombre
    if (t > E.CLAUDE - .35 && t < E.ANTH + .6) {
      const u = prog(t, E.CLAUDE, E.CLAUDEF + .12), va = smooth(prog(t, E.CLAUDE - .35, E.CLAUDE)), regresa = smooth(prog(t, E.ANTH + .2, E.ANTH + .55));
      const px = lerp(lerp(TIN.x + 17, 392, va), TIN.x + 17, regresa) + 320 * u * (1 - regresa), py = lerp(lerp(TIN.y - 30, 1028, va), TIN.y - 40, regresa) + Math.sin(t * 34) * 12 * (u > 0 && u < 1 ? 1 : 0);
      pluma(c, px, py, 0, .95);
    }
    // ◀◀ al regresar
    const rb = entra(t, E.REBOB, .12) * sale(t, E.REBOB + .7, .25);
    if (rb > 0) { c.save(); c.globalAlpha = rb; c.fillStyle = ACENTO; for (let k = 0; k < 2; k++) { const bx = 760 - k * 44 - 30 * prog(t, E.REBOB, E.REBOB + .7); c.beginPath(); c.moveTo(bx, 800); c.lineTo(bx + 40, 776); c.lineTo(bx + 40, 824); c.closePath(); c.fill(); } c.restore(); }
    // chispas contra el tope
    if (t > E.SLAM && t < E.SLAM + .5) { const a = t - E.SLAM; c.strokeStyle = ACENTO; c.lineWidth = 4; for (let i = 0; i < 10; i++) { const an = -Math.PI / 2 + (hash(i, 21) - .5) * 2.6, v = 300 + hash(i, 22) * 500; const x0 = TOPE - 34 - dx + Math.cos(an) * v * a, y0 = 1110 + Math.sin(an) * v * a + 900 * a * a; c.globalAlpha = 1 - a / .5; linea(c, x0, y0, x0 - Math.cos(an) * 18, y0 - Math.sin(an) * 18); } c.globalAlpha = 1; }
  }
  c.restore();
  // la hoja que se lee y se cambia
  if (t > E.LEE - .05 && t < E.VERDAD + .2) {
    const u = smooth(prog(t, E.LEE, E.LEE + .3)), d = smooth(prog(t, E.VERDAD - .05, E.VERDAD + .15));
    const x = lerp(260, 300, u), y = lerp(784, 610, u * (1 - d)) + d * 150, s = lerp(1, 1.5, u * (1 - d));
    c.save(); c.translate(x, y); c.scale(s, s);
    hoja(c, 0, 0, 120, 170, lerp(-.02, -.1, u), 210, 5);
    const tachar = prog(t, E.CAMBIA, E.CAMBIA + .22), nueva = prog(t, E.CAMBIA + .24, E.CAMBIA + .65);
    c.strokeStyle = ACENTO; c.lineWidth = 4.5; c.lineCap = "round";
    if (tachar > 0) linea(c, -46, -14, lerp(-46, 40, tachar), -18);
    if (nueva > 0) { c.beginPath(); for (let i = 0; i <= 30 * nueva; i++) { const xx = -44 + i * 2.8, yy = -2 + Math.sin(i * 1.3) * 3; if (i) c.lineTo(xx, yy); else c.moveTo(xx, yy); } c.stroke(); }
    const lu = prog(t, E.LEE + .3, E.CAMBIA - .05);
    if (lu > 0 && lu < 1) lupa(c, lerp(-40, 40, (lu * 2.2) % 1), lerp(-50, 40, lu), 1.1, -.3);
    c.restore();
  }
  // la página web que no era: cae y se rasga
  navegador(c, t, ease.outBack(prog(t, E.WEB, E.WEB + .45), 1.1), prog(t, E.RASGA, E.RASGA + .8));
  // el anillo alrededor del motor
  const an = prog(t, E.ALRED, E.ALRED + .75) * sale(t, E.IMPORTA - .1, .3);
  if (an > 0) {
    c.save(); c.strokeStyle = ACENTO; c.lineWidth = 9; c.lineCap = "round"; c.setLineDash([2, 20]); c.lineDashOffset = -t * 60;
    c.beginPath(); c.ellipse(MX + dx, 830, 300, 330, -.1, -1.6, -1.6 + 6.2832 * ease.inOutCubic(Math.min(an * 1.3, 1))); c.stroke(); c.restore();
  }
  c.restore();
}

function caeMotor(t: number, tl: number) {
  if (t < tl) { const u = tl - t; return -(600 * u + .5 * 2733 * u * u); }
  return -26 * Math.exp(-(t - tl) * 9) * Math.abs(Math.sin((t - tl) * 16));
}
function cocheDx(t: number) {
  let d = 0;
  if (t > E.EMBISTE && t < E.SLAM) d = 44 * ease.inCubic(prog(t, E.EMBISTE, E.SLAM));
  if (t >= E.SLAM) d = 44 * (1 - Math.min(resorte(t - E.SLAM, 2.6, .35), 1.15));
  return d;
}
function cocheDy(t: number) {
  const salto = t > E.IMPORTA ? -70 * Math.max(0, Math.sin(Math.min((t - E.IMPORTA) / .42, 1) * Math.PI)) - 14 * Math.max(0, Math.sin(clamp((t - E.IMPORTA - .42) / .2) * Math.PI)) : 0;
  const bache = t > E.SIENTES - .2 && t < E.SPLIT ? 7 * Math.abs(Math.sin(t * 7.3)) + 4 * Math.sin(t * 13) : 0;
  return salto + bache;
}
/** Los motores se alcanzan: crecen por turnos. */
function motorX(t: number, nuestro = false) {
  const pasos = nuestro
    ? [[E.ALCANZ + .5, 1.22], [E.UNOS + .4, 1.36], [E.MESES + .2, 1.2], [E.MESES + .55, 1.3], [E.SIENTES - .3, 1]]
    : [[E.ALCANZ, 1.18], [E.UNOS, 1.3], [E.MESES, 1.34], [E.MESES + .4, 1.24], [E.SIENTES - .3, 1]];
  let s = 1;
  for (const [a, v] of pasos) s = lerp(s, v, ease.outBack(prog(t, a, a + .3), 1.8));
  return s;
}

/** La etiqueta de papel que cuelga del motor: «modelo». */
function etiqueta(c: Ctx, t: number, my = PISO) {
  const a = entra(t, T("modelo", 3).s - .15, .3) * sale(t, E.CHASIS - .2, .3);
  if (a <= 0) return;
  const ax = MX - 70, ay = my - 488, sw = .35 * Math.sin(t * 2.2) * Math.exp(-Math.max(t - T("modelo", 3).s, 0) * .6) + .08 * Math.sin(t * 1.3);
  c.save(); c.globalAlpha = a; c.translate(ax, ay); c.rotate(.5 + sw);
  c.strokeStyle = TINTA; c.lineWidth = 3; linea(c, 0, 0, 0, -110);
  c.translate(0, -110); c.rotate(-.5);
  recorte(c, [[10, 0], [-30, -40], [-290, -40], [-290, 40], [-30, 40]], 341, { g: 4 });
  c.fillStyle = PAPEL; circ(c, -18, 0, 7); c.fill(); c.strokeStyle = TINTA; c.lineWidth = 3; c.stroke();
  texto(c, "modelo", -160, 22, { fuente: serif(74, true), color: TINTA });
  c.restore();
}

// ---------- escenario de la carretera (arranque y final) ----------
function carretera(c: Ctx, t: number, oy: number, final: boolean) {
  c.save(); c.translate(0, oy);
  c.fillStyle = "#EDE9DF"; c.fillRect(0, -1200, 1080, 2100);
  const piso = 760;
  // velocidad: en el final frena frente a la casa
  const llegaU = final ? ease.outCubic(prog(t, E.DECIDE, E.FRENA)) : 0;
  const recorrido = final ? (t - E.SPLIT) * 900 * (1 - llegaU * .4) + 900 * llegaU * 1.6 : t * 1500 + (t > E.GENIO ? (t - E.GENIO) * 900 : 0);
  // nubes
  c.fillStyle = "#E1DBCD"; c.strokeStyle = "rgba(17,17,17,.25)"; c.lineWidth = 3; c.beginPath(); c.moveTo(0, piso);
  for (let x = 0; x <= 1080; x += 20) { const u = x + recorrido * .15; c.lineTo(x, piso - 70 - 50 * Math.sin(u / 170) - 30 * Math.sin(u / 61 + 1)); }
  c.lineTo(1080, piso); c.closePath(); c.fill(); c.stroke();
  // postes que pasan
  for (let i = 0; i < 6; i++) {
    const x = ((i * 260 - recorrido * .9) % 1560 + 1560) % 1560 - 240;
    c.strokeStyle = TINTA; c.lineWidth = 7; linea(c, x, piso - 4, x, piso - 150);
    recorte(c, [[x - 30, piso - 190], [x + 30, piso - 190], [x + 30, piso - 140], [x - 30, piso - 140]], 411 + i, { g: 4, sombra: .5 });
  }
  // el camino
  c.fillStyle = "#cfc9bb"; c.fillRect(0, piso, 1080, 70);
  c.strokeStyle = TINTA; c.lineWidth = 6; linea(c, 0, piso, 1080, piso);
  c.strokeStyle = HOJA; c.lineWidth = 8; c.setLineDash([60, 50]); c.lineDashOffset = recorrido; linea(c, 0, piso + 36, 1080, piso + 36); c.setLineDash([]);
  // la casa de la fiesta
  const xc = final ? lerp(1500, 868, ease.outCubic(prog(t, E.DECIDE - .3, E.FRENA))) : 2000;
  if (xc < 1400) casa(c, t, xc, piso, .78, entra(t, E.FRENA, .5));
  // el coche
  const K: Kit = { ...KIT0, chasis: 1, carro: 1, volante: 1, frenos: 1, tablero: 1, motorY: MY_C, rv: final ? rev(t) : rev(t), giro: recorrido / 85 * .6,
    volGiro: .2 * Math.sin(t * 2), herr: final ? [1, 1, 1] : [0, 0, 0], manu: final ? 1 : 0, remolque: final ? 1 : 0, ayudante: final ? 1 : 0, boton: final ? 1 : 0, llave: final ? 1 : 0, llaveGiro: 1,
    nombre: final ? 1 : 0, texto: "Claude Code" };
  K.aprieta = final ? Math.exp(-Math.max(t - E.FRENA, 0) * 3) * (t > E.FRENA - .2 ? 1 : 0) : 0;
  K.llama = !final && t > E.GENIO && t < E.GENIO + .7 ? sale(t, E.GENIO + .3, .4) : final && t > E.VEL && t < E.VEL + .7 ? sale(t, E.VEL + .3, .4) : 0;
  const fiesta = final ? entra(t, E.FRENA + .25, .3) : 0;
  const mm = manos(E.HARNESS);
  const brinca = fiesta * Math.abs(Math.sin((t - E.FRENA) * 7)) * 30;
  K.piloto = { x: AS.x, y: AS.y - brinca, m1: fiesta > 0 ? mix(mm.m1, [AS.x - 120, AS.y - 210 - brinca], fiesta) : mm.m1, m2: fiesta > 0 ? mix(mm.m2, [AS.x + 110, AS.y - 220 - brinca], fiesta) : mm.m2, a1: lerp(.2, 1, fiesta), a2: lerp(.2, 1, fiesta) };
  const boost = !final && t > E.GENIO ? 80 * Math.sin(Math.min((t - E.GENIO) / .8, 1) * Math.PI) : 0;
  const cx = final ? lerp(400, 450, llegaU) : 540 + boost;
  const nariz = final ? .035 * Math.exp(-Math.max(t - E.FRENA, 0) * 4) * (t > E.FRENA ? Math.cos((t - E.FRENA) * 14) : 0) : 0;
  const s = final ? .6 : .72;
  // líneas de velocidad
  c.strokeStyle = "rgba(17,17,17,.35)"; c.lineWidth = 4;
  for (let i = 0; i < 9; i++) { const yy = piso - 40 - i * 34, l = 90 + hash(i, 31) * 140, x0 = ((cx - 280 - hash(i, 32) * 300 - recorrido * 1.4) % 600 + 600) % 600 - 300 + cx - 600; c.globalAlpha = .7 * (1 - llegaU); linea(c, x0, yy, x0 + l, yy); }
  c.globalAlpha = 1;
  c.save(); c.translate(cx, piso + Math.abs(Math.sin(t * 9)) * -3); c.rotate(nariz); c.scale(s, s); c.translate(-525, -PISO);
  K.rojo = !final ? entra(t, E.ARNES0 - .05, .3) : 0;
  coche(c, t, K);
  c.restore();
  if (final) confeti(c, t, E.FRENA + .15, xc - 40, piso - 200);
  c.restore();
}

/** Abajo, al final: la misma mesa del principio y el mismo motor, ahora con ruedas pero sin arnés. */
function mesaFinal(c: Ctx, t: number, oy: number) {
  c.save(); c.translate(0, oy);
  c.fillStyle = PAPEL; c.fillRect(0, -200, 1080, 2400);
  const cam = { z: .8, x: 745, y: 503, r: 0 };
  const g = t > E.CAE2 ? 22 * Math.exp(-(t - E.CAE2) * 7) : 0;
  c.translate(540 + g * Math.sin(t * 61), 960 + g * Math.sin(t * 47)); c.scale(cam.z, cam.z); c.translate(-cam.x, -cam.y);
  polvo(c, t, 0, 1400, 300, 1700);
  mesa(c, -440, 1080, 1180, 501, [120, 960]);
  HOJAS.forEach(([hx, hr], i) => { const salto = t > E.CAE2 ? 70 * Math.exp(-(t - E.CAE2) * 4) * Math.abs(Math.sin((t - E.CAE2) * 9 + i)) : 0; hojaPlana(c, hx, 1160 - salto, hr, 511 + i * 3); });
  const caida = caeMotor(t, E.CAE2);
  const rv = Math.max(rev(t), t > E.FIN + 1.4 ? .05 : .5);
  const gira = t > E.CAE2 ? (t - E.CAE2) * 30 : 0;
  // patina sin ir a ningún lado
  const pat = t > E.DECIDE ? Math.sin((t - E.DECIDE) * 5.3) * 14 * sale(t, E.FIN + 1.3, .6) : 0;
  c.save(); c.translate(pat, caida); c.rotate(t > E.DECIDE ? .025 * Math.sin((t - E.DECIDE) * 6.1) * sale(t, E.FIN + 1.3, .6) : 0);
  const K: Kit = { ...KIT0, chasis: 1, motorY: MY_C, rv, giro: gira, tos: t > E.FIN + 1.4 ? (t - E.FIN - 1.4) : 0 };
  K.llama = t > E.VEL && t < E.VEL + .7 ? sale(t, E.VEL + .3, .4) : 0;
  coche(c, t, K);
  // humo de llanta quemada
  if (t > E.DECIDE) for (let i = 0; i < 12; i++) { const a = ((t - E.DECIDE) * 1.3 + i / 12) % 1; const x = (i % 2 ? RR.x : RD.x) - a * 160, y = PISO - 10 - a * 140; c.fillStyle = `rgba(120,118,112,${(1 - a) * .28 * sale(t, E.FIN + 1.3, .6)})`; circ(c, x, y, 24 + a * 70); c.fill(); }
  c.restore();
  c.restore();
}

// ---------- rótulos (pantalla) ----------
/** Leyenda al pie de la escena, sobre un respaldo de papel para que las patas de la mesa no la crucen. */
function leyenda(c: Ctx, t: number, ini: number, fin: number, s: string, y: number, px: number, color = TINTA) {
  const a = smooth(prog(t, ini - .04, ini + .14)) * (1 - smooth(prog(t, fin, fin + .22)));
  if (a <= 0) return;
  c.save(); c.font = serif(px, true); const w = c.measureText(s).width; c.restore();
  const yy = y + (1 - ease.outCubic(prog(t, ini - .04, ini + .3))) * 18;
  c.save(); c.globalAlpha = a * .93; c.fillStyle = PAPEL; c.beginPath(); c.roundRect(540 - w / 2 - 36, yy - px * .8, w + 72, px * 1.12, 22); c.fill(); c.restore();
  texto(c, s, 540, yy, { fuente: serif(px, true), color, alfa: a });
}
function rotulos(c: Ctx, t: number, cam: Cam) {
  // arranque (genio y arnés viven en la tira de arriba)
  rotulo(c, t, E.INUTIL, E.SUBE - .1, "inútil", 1080, 140, TINTA, true, 250);
  // el coche se arma
  leyenda(c, t, E.VOLANTE + .15, E.FRENOS - .25, "volante", 1470, 120, TINTA);
  leyenda(c, t, E.FRENOS + .12, E.TABLERO - .25, "frenos", 1470, 120, TINTA);
  leyenda(c, t, E.TABLERO + .15, E.INGLES - .2, "tablero", 1470, 120, TINTA);
  // arnés → harness
  rotulo(c, t, E.INGLES, E.HARNESS - .06, "arnés", 330, 150, TINTA, true);
  rotulo(c, t, E.HARNESS, L.HERR[0] - .3, "harness", 330, 170, ACENTO, true);
  // Claude Code
  leyenda(c, t, E.ANTH, E.WEB - .2, "de Anthropic", 1430, 96, GRIS);
  leyenda(c, t, fin("su mesa") + .12, E.PERM - .12, "contexto", 1470, 120, ACENTO);
  // las piezas que todos copian
  leyenda(c, t, fin("al modelo") + .12, E.AYUD - .2, "hooks", 1470, 124, ACENTO);
  leyenda(c, t, fin("propia mesa") + .05, E.MANU - .2, "subagents", 1470, 124, ACENTO);
  leyenda(c, t, fin("necesita") + .02, E.BOTON - .2, "skills", 1470, 124, ACENTO);
  leyenda(c, t, E.REBOB + .25, E.NADA - .1, "checkpoints", 1470, 124, ACENTO);
  // inteligencia vs ingeniería
  rotulo(c, t, E.INTEL1 - .05, E.ABURR - .15, "inteligencia", 330, 140, TINTA, true);
  if (t > E.INTEL1 && t < E.ABURR) { const [mx, my] = aPantalla(cam, MX, 560); c.save(); c.globalAlpha = entra(t, E.INTEL1, .25) * sale(t, E.ABURR - .3, .2); flecha(c, 540, 380, mx, my - 20, ACENTO, 7, 28); c.restore(); }
  rotulo(c, t, E.ABURR - .05, E.IMPORTA - .2, "ingeniería aburrida", 330, 112, TINTA, true);
  // OpenAI
  rotulo(c, t, E.OPENAI, E.YO - .2, "OpenAI", 250, 92, GRIS, false);
  rotulo(c, t, E.HENG, E.YO - .2, "harness engineering", 360, 104, TINTA, true);
  // final
  const av = entra(t, E.VEL - .08, .2) * sale(t, E.DECIDE - .1, .25);
  if (av > 0) {
    c.save(); c.globalAlpha = av;
    recorte(c, rrPts(330, 842, 420, 112, 22), 611, { g: 4 });
    texto(c, "velocidad", 540, 922, { fuente: serif(96, true), color: TINTA });
    flecha(c, 540, 832, 540, 712, ACENTO, 7, 26); flecha(c, 540, 964, 540, 1090, ACENTO, 7, 26);
    c.restore();
  }
  rotulo(c, t, E.LLEGA, E.DUR + 1, "llegas", 250, 170, ACENTO, true);
}

// ---------- el sol y la luna: todos los días ----------
function dias(c: Ctx, t: number) {
  const a = entra(t, E.DIAS - .2, .2) * sale(t, E.ARRANCA - .1, .3);
  if (a <= 0) return;
  const g = (t - E.DIAS + .2) * 4.6;
  const noche = (1 - Math.cos(g)) / 2;
  c.save(); c.globalAlpha = a * noche * .1; c.fillStyle = "#09090A"; c.fillRect(0, 0, 1080, 1920); c.restore();
  c.save(); c.globalAlpha = a; c.translate(540, 1300);
  for (const [k, sol] of [[0, true], [Math.PI, false]] as [number, boolean][]) {
    const an = -Math.PI / 2 + g + k, x = Math.cos(an) * 520, y = Math.sin(an) * 1000;
    if (y > -500) continue;
    c.save(); c.translate(x, y); c.scale(1.5, 1.5);
    if (sol) { c.fillStyle = HOJA; c.strokeStyle = TINTA; c.lineWidth = 5; for (let i = 0; i < 10; i++) { const b = i * .628 + t; linea(c, Math.cos(b) * 62, Math.sin(b) * 62, Math.cos(b) * 90, Math.sin(b) * 90); } circ(c, 0, 0, 50); c.fill(); c.stroke(); }
    else { c.fillStyle = "#2b2a28"; circ(c, 0, 0, 46); c.fill(); c.fillStyle = PAPEL; circ(c, 20, -12, 40); c.fill(); }
    c.restore();
  }
  c.restore();
}

// ---------- todo junto ----------
function dibuja(c: Ctx, t: number) {
  BT = Math.floor(t * 10);
  const cam = camara(t);
  // arriba la carretera, abajo la mesa: una tira de papel que se recorre
  const ysA = t < E.SUBE ? 900 : lerp(900, -80, ease.inOutCubic(prog(t, E.SUBE, E.SUBE + .7)));
  const enFinal = t >= E.SPLIT;
  if (!enFinal) {
    mundo(c, t, cam);
    if (t < E.SIENTES + 2) dias(c, t);
    rotulos(c, t, cam);
    if (ysA > -60) {
      c.save(); c.beginPath(); c.rect(0, 0, 1080, ysA); c.clip(); carretera(c, t, ysA - 900, false);
      rotulo(c, t, E.GENIO, E.ARNES0 - .2, "genio", 250 + ysA - 900, 150, TINTA, true);
      rotulo(c, t, E.ARNES0, E.SUBE + .4, "arnés", 250 + ysA - 900, 150, ACENTO, true);
      c.restore();
      borde(c, ysA);
      if (t < E.GENIO) rotulosArranque(c, t);
    }
    return;
  }
  // final: dos tiras que se cierran sobre el cuadro
  const ysF = lerp(-80, 900, ease.outCubic(prog(t, E.SPLIT, E.SPLIT + .55)));
  const ybF = lerp(2000, 900, ease.outCubic(prog(t, E.SPLIT, E.SPLIT + .55)));
  if (ybF > ysF + 1) { c.save(); c.beginPath(); c.rect(0, ysF, 1080, ybF - ysF); c.clip(); mundo(c, t, cam); c.restore(); }
  c.save(); c.beginPath(); c.rect(0, ybF, 1080, 1920 - ybF); c.clip(); mesaFinal(c, t, ybF - 900); c.restore();
  c.save(); c.beginPath(); c.rect(0, 0, 1080, ysF); c.clip(); carretera(c, t, ysF - 900, true); c.restore();
  borde(c, ysF); borde(c, ybF);
  const rs = smooth(prog(t, E.SPLIT + .3, E.SPLIT + .6));
  c.save(); c.globalAlpha = rs; rotulos(c, t, cam); c.restore();
}
function rotulosArranque(c: Ctx, t: number) {
  const a = entra(t, .12, .25) * sale(t, E.GENIO - .1, .25);
  if (a <= 0) return;
  c.save(); c.globalAlpha = a;
  recorte(c, rrPts(290, 838, 500, 100, 20), 601, { g: 4 });
  texto(c, "mismo modelo", 540, 912, { fuente: serif(78, true), color: TINTA });
  flecha(c, 540, 828, 540, 700, ACENTO, 7, 26); flecha(c, 540, 948, 540, 1080, ACENTO, 7, 26);
  c.restore();
}
function borde(c: Ctx, y: number) {
  if (y < -20 || y > 1940) return;
  c.fillStyle = "rgba(20,18,14,.12)"; c.fillRect(0, y, 1080, 14);
  c.strokeStyle = TINTA; c.lineWidth = 6; c.beginPath(); for (let i = 0; i <= 24; i++) { const x = i * 45, yy = y + jit(700 + i, 2); if (i) c.lineTo(x, yy); else c.moveTo(x, yy); } c.stroke();
}

export const Pieza: React.FC = () => <Lienzo dibuja={(c, t) => dibuja(c, t)} preparar={() => ({})} />;
