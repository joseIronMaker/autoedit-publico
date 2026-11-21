// Capítulo 6. Un solo modelo de verdad, de principio a fin: 11 puntos, un polinomio de grado 10 y ridge con
// lambda que baja. La curva que se retuerce, el pico sobre el hueco, la U del error en lo escondido y la curva
// suave del final salen TODAS de `ajuste()`: nada está dibujado a mano. Lo que sí es dibujo es el lobo.
import React from "react";
import { azar, caida, clamp, ease, lerp, prog, smooth, texto } from "../../kit";
import { ACENTO, bola, cue, flecha, Lienzo, LUZ, mono, NOCHE, PAPEL, rotulo, serif, sombra, TINTA } from "../../marca";
import palabras from "./palabras.json";
import duracion from "./duracion.json";
import ev from "./ev.json";

export const DURACION = duracion.dur;
const T = cue(palabras);
const HOJA = "#FBFAF5", CORAL = "#E9896C";
const iCierre = T("un modelo no vale").i;

const t0 = {
  diez: T("diez").s, noS: ev.hojas[ev.hojas.length - 1] + .3, nadaE: T("y no saber nada").e,
  mira: T("mira").s, aqui: T("aquí están").s, pides: T("y le pides").s, curva: T("una curva").s,
  simple: T("es simple").s, equivoca: T("y se equivoca").s, sigue: T("sigue entrenando").s, dobla: T("se dobla").s, retuerce: T("se retuerce").s, toca: T("y toca").s, puntoE: T("cada punto").e,
  error: T("error").s, cero: T("cero").s, perfecto: T("perfecto").s,
  aprendio: T("se aprendió").s, resp: T("las respuestas").s, materia: T("no la materia").s, esto: T("a esto").s, sobre: T("sobreajuste").s, raro: T("y puede ser").s,
  inv: T("unos investigadores").s, prop: T("a propósito").s, todos: T("todos los lobos").s, nieve: T("en la nieve").s, acierta: T("acertaba").s, parece: T("parecía brillante").s,
  hasta: T("hasta que").s, fijaba: T("se fijaba").s, noMira: T("no miraba").s,
  pe: T("por eso se esconde").s, parte: T("una parte").s, jamas: T("jamás la ve").s, entrena: T("mientras entrena").s, ese: T("ese es").s,
  cuando: T("y cuando el error").s, pero: T("pero en lo").s, esc: T("en lo escondido").s, subir: T("empieza a subir").e, ahi: T("ahí se detiene").s, todo: T("todo").s,
  modelo: T("un modelo no vale").s, porQue: T("por lo que acierta", iCierre).s, yaVio: T("en lo que ya vio", iCierre).s, yaVioE: T("en lo que ya vio", iCierre).e, vale: T("vale por lo que acierta en lo que nunca").s,
  fin: palabras[palabras.length - 1].e,
};

// ---------- el modelo ----------
const XS = [-.984, -.882, -.751, -.577, -.409, -.22, -.003, .568, .747, .856, .988];
const YS = [-.39, -.5, -.216, -.279, -.046, -.074, .232, .463, .349, .524, .348];
const XH = [-.941, -.813, -.775, -.71, -.679, -.444, -.386, -.105, .032, .094, .225, .255, .368, .413, .519, .831];
const YH = [-.467, -.395, -.333, -.352, -.171, -.104, -.164, .235, .159, .051, .151, .294, .257, .399, .306, .491];
const GRADO = 10, XN = .307, L_MEJOR = -1.6025, L_INI = 2, L_FIN = -4.7;

function leg(x: number) { const p = [1, x]; for (let k = 1; k < GRADO; k++) p[k + 1] = ((2 * k + 1) * x * p[k] - k * p[k - 1]) / (k + 1); return p; }
const A = XS.map(leg), B = XH.map(leg);
const N = GRADO + 1;
const ATA = Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => A.reduce((s, f) => s + f[i] * f[j], 0)));
const ATY = Array.from({ length: N }, (_, i) => A.reduce((s, f, k) => s + f[i] * YS[k], 0));

/** Ridge con penalización que crece con el grado: las formas simples llegan antes que los dobleces. */
function ajuste(logL: number) {
  const M = ATA.map((f, i) => [...f, ATY[i]]), lam = 10 ** logL;
  for (let i = 0; i < N; i++) M[i][i] += lam * (1 + i) ** 3;
  for (let i = 0; i < N; i++) {
    let p = i; for (let k = i + 1; k < N; k++) if (Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k;
    [M[i], M[p]] = [M[p], M[i]];
    for (let k = i + 1; k < N; k++) { const f = M[k][i] / M[i][i]; for (let j = i; j <= N; j++) M[k][j] -= f * M[i][j]; }
  }
  const w = new Array(N).fill(0);
  for (let i = N - 1; i >= 0; i--) { let s = M[i][N]; for (let j = i + 1; j < N; j++) s -= M[i][j] * w[j]; w[i] = s / M[i][i]; }
  return w;
}
const val = (w: number[], f: number[]) => f.reduce((s, p, i) => s + p * w[i], 0);
const rmse = (w: number[], F: number[][], Y: number[]) => Math.sqrt(F.reduce((s, f, i) => s + (val(w, f) - Y[i]) ** 2, 0) / Y.length);
const W_MEJOR = ajuste(L_MEJOR), W_FIN = ajuste(-10);
const YN = val(W_MEJOR, leg(XN));                                       // el dato nuevo: justo donde cae la curva buena
const FN = val(W_FIN, leg(XN));                                         // lo que dijo la curva retorcida ahí mismo
const NE = 200;
const ER: number[] = [], EV: number[] = [];
for (let i = 0; i < NE; i++) { const w = ajuste(lerp(L_INI, L_FIN, i / (NE - 1))); ER.push(rmse(w, A, YS)); EV.push(rmse(w, B, YH)); }
const E_MIN = EV.indexOf(Math.min(...EV)) / (NE - 1);

const GX = Array.from({ length: 280 }, (_, i) => -1 + 2 * i / 279), GL = GX.map(leg);

type Mapa = { ox: number; oy: number; sx: number; sy: number };
const MA: Mapa = { ox: 528, oy: 905, sx: 396, sy: 640 }, M1: Mapa = { ox: 528, oy: 1080, sx: 396, sy: 430 }, M2: Mapa = { ox: 528, oy: 690, sx: 396, sy: 400 }, M3: Mapa = { ox: 530, oy: 395, sx: 330, sy: 118 }, M4: Mapa = { ox: 528, oy: 1190, sx: 396, sy: 430 };
const mez = (a: Mapa, b: Mapa, k: number): Mapa => ({ ox: lerp(a.ox, b.ox, k), oy: lerp(a.oy, b.oy, k), sx: lerp(a.sx, b.sx, k), sy: lerp(a.sy, b.sy, k) });
const px = (M: Mapa, x: number) => M.ox + x * M.sx, py = (M: Mapa, v: number) => M.oy - v * M.sy;
type Pt = [number, number];

/** La curva en pantalla, con vibración de dibujo a mano a 10 cuadros por segundo. */
function curvaP(w: number[], M: Mapa, t: number, semilla: number, amp = 2.4): Pt[] {
  const r = azar(Math.floor(t * 10) * 7 + semilla), a = r() * 6.28, b = r() * 6.28, d = r() * 6.28;
  return GX.map((x, i) => [px(M, x) + amp * .6 * Math.sin(i * .08 + d), py(M, val(w, GL[i])) + amp * (Math.sin(i * .055 + a) + .6 * Math.sin(i * .16 + b))]);
}

function traza(c: CanvasRenderingContext2D, P: Pt[], a: number, b: number, color: string, g: number) {
  if (b <= a) return;
  const L = [0]; for (let i = 1; i < P.length; i++) L[i] = L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
  const ini = L[L.length - 1] * a, fin = L[L.length - 1] * clamp(b);
  c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath();
  let abierto = false;
  for (let i = 0; i < P.length; i++) {
    if (L[i] < ini) continue;
    if (L[i] > fin) { const k = (fin - L[i - 1]) / (L[i] - L[i - 1]); c.lineTo(lerp(P[i - 1][0], P[i][0], k), lerp(P[i - 1][1], P[i][1], k)); break; }
    if (!abierto) { c.moveTo(P[i][0], P[i][1]); abierto = true; } else c.lineTo(P[i][0], P[i][1]);
  }
  c.stroke();
}

function sombraR(c: CanvasRenderingContext2D, x: number, y: number, r: number, a: number) {
  if (a <= .01) return;
  const g = c.createRadialGradient(x, y, r * .15, x, y, r);
  g.addColorStop(0, `rgba(20,18,14,${a})`); g.addColorStop(1, "rgba(20,18,14,0)");
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
}

/** Bola que cae SOBRE la hoja: la vemos desde arriba, así que caer es encogerse y acercarse a su sombra. */
function bolaHoja(c: CanvasRenderingContext2D, x: number, y: number, r: number, z: number, tinte = TINTA) {
  const s = 1 + z * .42, off = z * 22;
  sombraR(c, x + off * .55, y + off * .8 + r * .22, r * (1.75 + z * .34), .32 / (1 + z * .55));
  bola(c, x, y - z * 5, r * s, tinte);
}

function anillo(c: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, a: number, g = 5) {
  if (a <= .01) return;
  c.save(); c.globalAlpha = a; c.strokeStyle = color; c.lineWidth = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); c.restore();
}

/** Golpes de cámara: decaen rápido y nunca desplazan nada de su sitio. */
const GOLPES: [number, number][] = [...ev.hojas.slice(0, ev.iDiez).map((h) => [h, 8] as [number, number]), [ev.hojas[ev.iDiez], 20], [t0.perfecto, 9], [ev.falla, 26], [ev.diez2, 9], [ev.sello, 10], [t0.todo, 16], [t0.fin, 7]];
function sacude(t: number) {
  let x = 0, y = 0;
  for (const [ti, a] of GOLPES) { const d = t - ti; if (d < 0 || d > .7) continue; const e = a * Math.exp(-d * 9); x += e * Math.sin(d * 71); y += e * Math.cos(d * 59); }
  return { x, y };
}

// ---------- papel ----------
function rejilla(c: CanvasRenderingContext2D, t: number, a: number) {
  if (a <= .005) return;
  c.save(); c.globalAlpha = a * .08; c.strokeStyle = TINTA; c.lineWidth = 2;
  const p = 90, dx = (t * 5) % p, dy = (t * 3.4) % p;
  c.beginPath();
  for (let x = -p; x < 1200; x += p) { c.moveTo(x + dx, -80); c.lineTo(x + dx, 2000); }
  for (let y = -p; y < 2020; y += p) { c.moveTo(-80, y + dy); c.lineTo(1160, y + dy); }
  c.stroke(); c.restore();
}

function motas(c: CanvasRenderingContext2D, t: number, color: string, a: number) {
  const r = azar(19);
  c.save(); c.fillStyle = color;
  for (let i = 0; i < 70; i++) {
    const x0 = r() * 1260 - 90, y0 = r() * 2100, v = 12 + r() * 34, f = r() * 6.28, q = r();
    const y = ((y0 - t * v) % 2100 + 2100) % 2100 - 90, x = x0 + Math.sin(t * .5 + f) * 36;
    c.globalAlpha = a * (.07 + q * .13);
    c.beginPath(); c.arc(x, y, 2 + q * 3, 0, 7); c.fill();
  }
  c.restore();
}

// ---------- la apertura: exámenes que caen ----------
const HW = 860, HH = 1180;
const LINEAS = Array.from({ length: 6 }, (_, i) => {
  const r = azar(90 + i), P: Pt[][] = []; let x = -360;
  while (x < 200) { const L = 60 + r() * 150, w: Pt[] = []; const a = r() * 6, b = r() * 6; for (let u = 0; u <= L; u += 9) w.push([x + u, Math.sin(u * .045 + a) * 8 + Math.sin(u * .14 + b) * 5]); P.push(w); x += L + 28; }
  return { P, y: 150 + i * 72 };
});

function anilloMano(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, g: number, color: string, semilla: number, t: number) {
  const r = azar(Math.floor(t * 10) * 3 + semilla), a0 = -2.3, n = 90, b = r() * 6.28;
  c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round"; c.beginPath();
  for (let i = 0; i <= n; i++) {
    const u = i / n, a = a0 + u * 6.28 * 1.1, d = 1 + .06 * u + .012 * Math.sin(i * .3 + b);
    const X = x + Math.cos(a) * rx * d, Y = y + Math.sin(a) * ry * d; i ? c.lineTo(X, Y) : c.moveTo(X, Y);
  }
  c.stroke();
}

function diezSello(c: CanvasRenderingContext2D, x: number, y: number, esc: number, rot: number, t: number, semilla = 3, alfa = 1) {
  if (alfa <= .01) return;
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(esc, esc); c.globalAlpha = alfa;
  anilloMano(c, 0, 0, 104, 92, 8, ACENTO, semilla, t);
  texto(c, "10", -4, 4, { fuente: serif(150, true), color: ACENTO, base: "middle", alfa });
  c.restore();
}

function hoja(c: CanvasRenderingContext2D, x: number, y: number, rot: number, esc: number, t: number, i: number, o: { cae?: number; pulso?: number }) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(esc, esc);
  for (let k = 3; k >= 1; k--) { c.fillStyle = `rgba(20,18,14,${.045})`; c.fillRect(-HW / 2 + k * 3 + 4, -HH / 2 + k * 4 + 6, HW, HH); }
  c.fillStyle = HOJA; c.fillRect(-HW / 2, -HH / 2, HW, HH);
  c.strokeStyle = "rgba(20,18,14,.16)"; c.lineWidth = 2; c.strokeRect(-HW / 2, -HH / 2, HW, HH);
  texto(c, "Nombre: una IA", -372, -468, { fuente: serif(84, true), color: TINTA, alin: "left" });
  c.fillStyle = TINTA; c.fillRect(-372, -446, 744, 4);
  const cae = o.cae ?? 0;
  c.save(); c.beginPath(); c.rect(-HW / 2, -HH / 2, HW, HH); c.clip();
  LINEAS.forEach((l, j) => {
    const k = ease.inCubic(prog(cae, j * .07, j * .07 + .62)), dy = k * 1050, gi = k * (j % 2 ? .32 : -.28);
    if (k >= 1) return;
    c.save(); c.translate(0, l.y + dy); c.rotate(gi);
    c.strokeStyle = TINTA; c.lineWidth = 6; c.lineCap = "round"; c.lineJoin = "round";
    for (const w of l.P) { c.beginPath(); w.forEach(([a, b], m) => (m ? c.lineTo(a, b) : c.moveTo(a, b))); c.stroke(); }
    c.strokeStyle = ACENTO; c.lineWidth = 10; c.beginPath(); c.moveTo(286, 0); c.lineTo(306, 20); c.lineTo(352, -30); c.stroke();
    c.restore();
  });
  c.restore();
  const p = o.pulso ?? 0;
  c.save(); c.translate(70, -170); c.rotate(-.1); c.scale(1 + p * .16, 1 + p * .16);
  anilloMano(c, 0, 0, 290, 244, 13, ACENTO, 11 + i, t);
  texto(c, "10", -6, 8, { fuente: serif(430, true), color: ACENTO, base: "middle" });
  c.restore();
  c.restore();
}

function apertura(c: CanvasRenderingContext2D, t: number) {
  const k = ease.inOutCubic(prog(t, t0.nadaE + .1, t0.mira + .08)), Z = lerp(1, 3.1, k), a = 1 - smooth(prog(t, t0.mira + .05, t0.mira + .5));
  if (a <= 0) return;
  c.save(); c.globalAlpha = a; c.translate(540, 1010); c.scale(Z, Z); c.translate(-540, -1010);
  const H = ev.hojas;
  const ult = H.reduce((n, h, i) => (t >= h - .2 ? i : n), 0);
  for (let i = a < 1 ? ult : Math.max(0, ult - 3); i <= ult; i++) {
    const r = azar(30 + i), dx = (r() - .5) * 26, dy = (r() - .5) * 22, gi = (r() - .5) * .06;
    const age = t - H[i], u = ease.inCubic(prog(age, -.2, 0));
    const rebote = Math.exp(-Math.max(age, 0) * 16) * Math.sin(Math.max(age, 0) * 30) * .012;
    hoja(c, 540 + dx * (i < H.length - 1 ? 1 : 0) + (1 - u) * (i % 2 ? 90 : -70), 790 + dy * (i < H.length - 1 ? 1 : 0) - (1 - u) * 130, (i < H.length - 1 ? gi : 0) + (1 - u) * (i % 2 ? .1 : -.08), lerp(1.8, 1, u) + rebote, t, i, {
      cae: i === H.length - 1 ? prog(t, t0.noS, t0.noS + .86) : 0,
      pulso: i >= ev.iDiez ? Math.exp(-Math.max(t - t0.diez, 0) * 3.6) : 0,
    });
  }
  c.restore();
  rotulo(c, t, t0.noS + .02, t0.nadaE + .22, "y no saber nada", 1530, 132, ACENTO, true);
}

// ---------- la curva y sus puntos ----------
function rutaL(t: number) {
  const K: [number, number][] = [[t0.curva, .25], [t0.simple, .05], [t0.equivoca, -.5], [t0.sigue, -.8], [t0.dobla, -2.3], [t0.dobla + .62, -3.5], [t0.retuerce + .75, -5], [t0.toca, -5.3], [t0.puntoE, -8], [t0.cero, -10.5]];
  if (t <= K[0][0]) return K[0][1];
  for (let i = 1; i < K.length; i++) if (t < K[i][0]) return lerp(K[i - 1][1], K[i][1], smooth(prog(t, K[i - 1][0], K[i][0])));
  return K[K.length - 1][1];
}

function contador(c: CanvasRenderingContext2D, v: number, color: string, a: number, esc = 1) {
  if (a <= .01) return;
  c.save(); c.translate(540, 232); c.scale(esc, esc);
  texto(c, "error", -66, 0, { fuente: serif(116), color, alin: "right", alfa: a });
  texto(c, v.toFixed(3), -26, 0, { fuente: mono(118), color, alin: "left", alfa: a });
  c.restore();
}

function curvaYBolas(c: CanvasRenderingContext2D, t: number) {
  const M = mez(MA, M1, ease.inOutCubic(prog(t, t0.dobla + .25, t0.retuerce + .7))), w = ajuste(rutaL(t));
  const sale = ease.inCubic(prog(t, t0.raro - .08, t0.raro + .58));
  const amp = 2.4 + 5 * smooth(prog(t, t0.esto, t0.sobre)) * (1 - smooth(prog(t, t0.raro, t0.raro + .3)));
  const P = curvaP(w, M, t, 2, amp);
  const yN = py(M, YN), xN = px(M, XN), yF = py(M, FN);

  // la materia
  if (t >= t0.materia - .05) traza(c, curvaP(W_MEJOR, M, t, 9, 1.8), sale, ease.inOutSine(prog(t, t0.materia - .05, t0.materia + .85)), ACENTO, 9);
  // la curva del modelo
  if (t >= t0.curva - .05) traza(c, P, sale, ease.inOutSine(prog(t, t0.curva - .05, t0.curva + 1.05)), TINTA, 9);

  // lo que se equivoca: la barra del capítulo 1, una por punto
  const aB = smooth(prog(t, t0.equivoca - .1, t0.equivoca + .35)) * (1 - smooth(prog(t, t0.error - .3, t0.error)));
  if (aB > 0) XS.forEach((x, i) => {
    const k = ease.outCubic(prog(t, t0.equivoca - .05 + i * .03, t0.equivoca + .3 + i * .03));
    const a = py(M, YS[i]), b = py(M, val(w, A[i]));
    if (Math.abs(b - a) < 2) return;
    c.save(); c.globalAlpha = aB; c.strokeStyle = ACENTO; c.lineWidth = 11; c.lineCap = "butt"; c.beginPath(); c.moveTo(px(M, x), a); c.lineTo(px(M, x), lerp(a, b, k)); c.stroke(); c.restore();
  });

  // los puntos caen sobre la hoja
  XS.forEach((x, i) => {
    const age = t - ev.bolas[i]; if (age < 0) return;
    const X = px(M, x); let Y = py(M, YS[i]);
    const z = caida(age, ev.BH, ev.BR, ev.BG).z;
    const se = ease.inCubic(prog(t, t0.raro + i * .03, t0.raro + .55 + i * .03));
    Y += se * 1100;
    const toque = Math.max(0, Math.exp(-Math.max(t - ev.toques[i], 0) * 8) * (t >= ev.toques[i] ? 1 : 0));
    const ola = t >= t0.resp + i * .06 ? Math.exp(-(t - t0.resp - i * .06) * 8) : 0;
    bolaHoja(c, X, Y, 24 * (1 + .34 * toque + .26 * ola), z);
    if (t >= ev.toques[i]) { const k = prog(t, ev.toques[i], ev.toques[i] + .55); anillo(c, X, Y, 26 + k * 74, TINTA, (1 - k) * .6, 4); }
  });

  // el dato nuevo
  if (t >= ev.ahora - .02) {
    const a = smooth(prog(t, ev.ahora - .02, ev.ahora + .24));
    const bob = t < ev.caida_n ? Math.sin((t - ev.ahora) * 3.1) * .32 : 0;
    const se = ease.inCubic(prog(t, t0.raro + .1, t0.raro + .7));
    // la barra enorme: de lo que era a lo que dijo
    const kB = ease.outExpo(prog(t, ev.falla, ev.falla + .55)), aBar = 1 - smooth(prog(t, t0.materia - .35, t0.materia));
    if (kB > 0 && aBar > 0) { c.save(); c.globalAlpha = aBar; c.fillStyle = ACENTO; c.fillRect(xN - 8, lerp(yN, yF, kB), 16, Math.abs(yN - lerp(yN, yF, kB))); c.restore(); }
    c.save(); c.globalAlpha = a;
    bolaHoja(c, xN, yN + se * 1100, 26, caida(t - ev.caida_n, ev.NH, ev.NR, ev.BG).z + bob, ACENTO);
    c.restore();
    const r = prog(t, ev.falla, ev.falla + 1);
    if (r > 0 && r < 1) { anillo(c, xN, yN, 30 + ease.outCubic(r) * 560, ACENTO, (1 - r) * .8, 7); anillo(c, xN, yN, 30 + ease.outCubic(r) * 340, ACENTO, (1 - r) * .5, 4); }
  }

  // el error, en vivo: el del polinomio que se está viendo
  const aC = smooth(prog(t, t0.sigue - .12, t0.sigue + .15)) * (1 - smooth(prog(t, t0.perfecto - .22, t0.perfecto - .05)));
  const pz = t >= t0.cero ? Math.exp(-(t - t0.cero) * 5.5) : 0;
  contador(c, t >= t0.cero ? 0 : rmse(w, A, YS), t >= t0.cero - .02 ? ACENTO : TINTA, aC, 1 + pz * .12);
  const kN = ease.outExpo(prog(t, ev.falla, ev.falla + .55));
  contador(c, Math.abs(FN - YN) * kN, ACENTO, smooth(prog(t, ev.falla, ev.falla + .12)) * (1 - smooth(prog(t, t0.aprendio - .2, t0.aprendio))), 1 + Math.exp(-Math.max(t - ev.falla, 0) * 5) * .12);

  // el diez de la curva, y se cae con el golpe del dato nuevo
  if (t >= t0.perfecto - .1) {
    const age = t - t0.perfecto, u = ease.inCubic(prog(age, -.1, 0)), se = prog(t, ev.falla + .04, ev.falla + 1.15);
    diezSello(c, 842, 540 + ease.inCubic(se) * 1500, lerp(2.1, 1, u), -.1 + se * 1.5, t, 7, u * (se >= 1 ? 0 : 1));
  }

  rotulo(c, t, t0.aqui, t0.pides - .08, "sus ejemplos", 232, 116);
  rotulo(c, t, t0.pides + .02, t0.equivoca - .22, "que los explique", 232, 112, TINTA, true);
  rotulo(c, t, t0.equivoca, t0.sigue - .14, "se equivoca un poco", 232, 104);
  rotulo(c, t, t0.perfecto, ev.ahora - .12, "Perfecto.", 232, 128, ACENTO, true);
  rotulo(c, t, ev.ahora, ev.falla - .1, "un dato nuevo", 232, 124, ACENTO, true);
  rotulo(c, t, t0.resp - .02, t0.raro - .1, "las respuestas", 232, 124);
  rotulo(c, t, t0.materia, t0.esto - .1, "no la materia", 1530, 124, ACENTO, true);
  rotulo(c, t, t0.sobre - .25, t0.raro - .1, "sobreajuste", 1530, 176, ACENTO, true);
  rotulo(c, t, t0.raro + .66, t0.inv - .08, "más raro todavía", 900, 122, TINTA, true);
}

// ---------- el lobo y el perro: dibujos, no fotos ----------
function spline(C: number[][], paso = 12): Pt[] {
  const n = C.length, out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = C[(i - 1 + n) % n], p1 = C[i], p2 = C[(i + 1) % n], p3 = C[(i + 2) % n];
    const q1 = p1.length > 2 ? 0 : .5, q2 = p2.length > 2 ? 0 : .5;
    const m1 = [(p2[0] - p0[0]) * q1, (p2[1] - p0[1]) * q1], m2 = [(p3[0] - p1[0]) * q2, (p3[1] - p1[1]) * q2];
    const k = Math.max(2, Math.floor(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / paso));
    for (let j = 0; j < k; j++) {
      const s = j / k, a = 2 * s ** 3 - 3 * s ** 2 + 1, b = s ** 3 - 2 * s ** 2 + s, d = -2 * s ** 3 + 3 * s ** 2, e = s ** 3 - s ** 2;
      out.push([a * p1[0] + b * m1[0] + d * p2[0] + e * m2[0], a * p1[1] + b * m1[1] + d * p2[1] + e * m2[1]]);
    }
  }
  return out;
}
const LOBO_C = [[978, 206, 1], [936, 178], [896, 160], [868, 136], [850, 114], [840, 84], [822, 48, 1], [802, 88], [794, 106, 1], [780, 80], [754, 46, 1], [744, 100], [726, 132], [692, 150], [646, 172], [606, 178], [520, 192], [420, 204], [320, 208], [240, 210], [182, 226], [140, 258],
  [110, 302], [82, 362], [62, 428], [50, 482], [40, 530, 1], [66, 516], [70, 546, 1], [98, 510], [122, 466], [146, 410], [160, 366],
  [156, 420], [134, 474], [146, 530], [140, 580], [126, 606, 1], [200, 606, 1], [196, 572], [198, 524], [214, 468], [250, 414], [292, 372],
  [312, 404], [288, 472], [294, 540], [284, 606, 1], [348, 606, 1], [342, 552], [346, 482], [372, 404], [400, 356],
  [470, 352], [560, 372], [612, 392],
  [614, 470], [608, 540], [598, 606, 1], [662, 606, 1], [656, 540], [664, 470], [678, 402],
  [698, 404], [708, 480], [704, 545], [694, 606, 1], [762, 606, 1], [756, 540], [760, 470], [772, 404],
  [794, 384, 1], [790, 358], [816, 332, 1], [810, 306], [830, 278], [850, 256], [884, 246], [930, 242], [966, 230]];
const PERRO_C = [[716, 150, 1], [676, 130], [642, 116], [624, 92], [616, 54], [606, 14, 1], [590, 44], [582, 66, 1], [572, 40], [552, 12, 1], [538, 70], [520, 112], [488, 156], [452, 222], [410, 300], [372, 376], [346, 440],
  [318, 462], [272, 446], [244, 404], [236, 354], [254, 310, 1], [204, 330], [186, 384], [198, 442], [240, 496], [300, 530],
  [304, 566, 1], [508, 566, 1], [502, 540], [470, 520], [456, 480], [486, 440], [520, 400], [536, 460], [540, 530], [534, 566, 1], [600, 566, 1], [594, 520], [592, 440], [602, 352], [622, 300, 1], [618, 276], [640, 232], [642, 196], [680, 190], [712, 178]];
const LOBO_P = spline(LOBO_C), PERRO_P = spline(PERRO_C);

function forma(c: CanvasRenderingContext2D, P: Pt[], ox: number, oy: number, s: number, flip: boolean, cx: number, color: string, t: number, amp: number) {
  const r = azar(Math.floor(t * 10) * 13 + 1), a = r() * 6.28, b = r() * 6.28;
  c.fillStyle = color; c.beginPath();
  P.forEach(([x, y], i) => {
    const X = ox + (flip ? 2 * cx - x : x) * s + amp * Math.sin(i * .31 + a), Y = oy + y * s + amp * Math.cos(i * .23 + b);
    i ? c.lineTo(X, Y) : c.moveTo(X, Y);
  });
  c.closePath(); c.fill();
}

type Rect = { x: number; y: number; w: number; h: number };
const FULL: Rect = { x: -60, y: -60, w: 1200, h: 2040 };
const mezR = (a: Rect, b: Rect, k: number): Rect => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k) });
/** Dónde queda el lobo en una foto: mismas proporciones en la tarjeta y a pantalla completa. */
const lugar = (R: Rect) => { const s = R.w * .72 / 1000; return { s, ox: R.x + R.w / 2 - 500 * s, oy: R.y + R.h * .72 - 606 * s, hy: R.y + R.h * .3 }; };

const COPOS = (() => { const r = azar(77); return Array.from({ length: 170 }, () => ({ u: r(), v: r(), d: r(), f: r() * 6.28 })); })();
const frac = (x: number) => x - Math.floor(x);
function copo(i: number, t: number, R: Rect) {
  const q = COPOS[i], y = frac(q.v + t * lerp(.05, .13, q.d)), x = frac(q.u + .014 * Math.sin(t * (.6 + q.d) + q.f) + t * .007);
  return { x: R.x + x * R.w, y: R.y + y * R.h, r: lerp(1.6, 6.8, q.d * q.d) };
}
function copos(c: CanvasRenderingContext2D, R: Rect, t: number, n: number, esc: number, color: string, a: number, min = 0, max = 1) {
  c.save(); c.fillStyle = color; c.globalAlpha = a;
  for (let i = 0; i < n; i++) {
    if (COPOS[i].d < min || COPOS[i].d > max) continue;
    const p = copo(i, t, R); c.beginPath(); c.arc(p.x, p.y, p.r * esc, 0, 7); c.fill();
  }
  c.restore();
}

type Foto = { animal: "lobo" | "perro"; suelo: "nieve" | "pasto"; flip: boolean; col: number; fil: number; ent: number; de: number; tira?: number; tick?: number };
const FOTOS: Foto[] = [
  { animal: "lobo", suelo: "nieve", flip: true, col: 0, fil: 0, ent: ev.cartas[0], de: -1, tick: 0 },
  { animal: "perro", suelo: "pasto", flip: false, col: 1, fil: 0, ent: ev.cartas[1], de: 1, tick: 1 },
  { animal: "lobo", suelo: "pasto", flip: true, col: 0, fil: 1, ent: ev.cartas[2], de: -1, tira: ev.rechazos[0] },
  { animal: "perro", suelo: "pasto", flip: true, col: 1, fil: 1, ent: ev.cartas[3], de: 1, tick: 3 },
  { animal: "lobo", suelo: "nieve", flip: false, col: 0, fil: 2, ent: ev.cartas[4], de: -1, tick: 4 },
  { animal: "perro", suelo: "nieve", flip: false, col: 1, fil: 2, ent: ev.cartas[5], de: 1, tira: ev.rechazos[1] },
  { animal: "lobo", suelo: "nieve", flip: false, col: 0, fil: 1, ent: ev.rechazos[0] + .42, de: -1, tick: 2 },
  { animal: "perro", suelo: "pasto", flip: true, col: 1, fil: 2, ent: ev.rechazos[1] + .42, de: 1, tick: 5 },
];
const CW = 410, CH = 362, CX = [285, 755], CY = [492, 872, 1252];

function foto(c: CanvasRenderingContext2D, R: Rect, t: number, f: { animal: string; suelo: string; flip: boolean }, o: { esc?: number; n?: number; gris?: number; sem?: number } = {}) {
  const esc = o.esc ?? 1, nieve = f.suelo === "nieve", L = lugar(R);
  c.save(); c.beginPath(); c.rect(R.x, R.y, R.w, R.h); c.clip();
  const g = c.createLinearGradient(0, R.y, 0, L.hy);
  g.addColorStop(0, nieve ? "#8B8A83" : "#E7E4DA"); g.addColorStop(1, nieve ? "#BFBDB4" : "#F2EFE6");
  c.fillStyle = g; c.fillRect(R.x, R.y, R.w, L.hy - R.y + 6);
  c.fillStyle = nieve ? "#FAF9F5" : "#CFCBB8";
  c.beginPath(); c.moveTo(R.x, R.y + R.h); c.lineTo(R.x, L.hy);
  for (let i = 0; i <= 26; i++) { const u = i / 26; c.lineTo(R.x + u * R.w, L.hy + (Math.sin(u * 6.1 + 1) * .012 + Math.sin(u * 13 + .4) * .005) * R.h); }
  c.lineTo(R.x + R.w, R.y + R.h); c.closePath(); c.fill();
  if (nieve) {
    c.strokeStyle = "#E4E2DA"; c.lineWidth = Math.max(2, R.h * .009); c.lineCap = "round";
    [[.1, .46, .46], [.55, .55, .4], [.02, .84, .5], [.5, .9, .46]].forEach(([u, v, l]) => { c.beginPath(); c.moveTo(R.x + u * R.w, R.y + v * R.h); c.quadraticCurveTo(R.x + (u + l / 2) * R.w, R.y + (v - .035) * R.h, R.x + (u + l) * R.w, R.y + v * R.h); c.stroke(); });
    copos(c, R, t, o.n ?? 46, esc, "#FFFFFF", .95, 0, .55);
  } else {
    const r = azar(o.sem ?? 5);
    c.save(); c.strokeStyle = TINTA; c.lineCap = "round"; c.globalAlpha = .5; c.lineWidth = Math.max(1.6, R.w * .0048);
    c.beginPath();
    for (let i = 0; i < 46; i++) {
      const x = R.x + r() * R.w, y = L.hy + r() ** .8 * (R.y + R.h - L.hy), l = R.h * (.018 + r() * .02);
      for (const d of [-.5, 0, .5]) { c.moveTo(x + d * l * .5, y); c.lineTo(x + d * l, y - l * (1 - Math.abs(d) * .4)); }
    }
    c.stroke(); c.restore();
  }
  const cuerpo = o.gris !== undefined ? `rgba(17,17,17,${lerp(1, .22, o.gris)})` : TINTA;
  sombra(c, L.ox + 500 * L.s, L.oy + 612 * L.s, 620 * L.s, nieve ? .32 : .26);
  if (f.animal === "lobo") forma(c, LOBO_P, L.ox, L.oy, L.s, f.flip, 500, cuerpo, t, Math.max(.5, 1.8 * L.s * 1.1));
  else { const s = L.s * 1.06, ox = R.x + R.w / 2 - 450 * s, oy = R.y + R.h * .72 - 566 * s; forma(c, PERRO_P, ox, oy, s, f.flip, 450, cuerpo, t, .6); }
  if (nieve) copos(c, R, t, o.n ?? 46, esc, "#FFFFFF", .95, .55, 1);
  c.restore();
}

function carta(c: CanvasRenderingContext2D, F: Foto, x: number, y: number, rot: number, t: number, i: number) {
  c.save(); c.translate(x, y); c.rotate(rot);
  for (let k = 3; k >= 1; k--) { c.fillStyle = "rgba(20,18,14,.05)"; c.fillRect(-CW / 2 + k * 2 + 3, -CH / 2 + k * 3 + 4, CW, CH); }
  c.fillStyle = "#FFFFFF"; c.fillRect(-CW / 2, -CH / 2, CW, CH);
  foto(c, { x: -CW / 2 + 15, y: -CH / 2 + 15, w: CW - 30, h: CH - 90 }, t, F, { sem: 5 + i });
  texto(c, F.animal, -CW / 2 + 22, CH / 2 - 18, { fuente: serif(62, true), color: TINTA, alin: "left" });
  if (F.tick !== undefined) {
    const k = ease.outCubic(prog(t, ev.aciertos[F.tick], ev.aciertos[F.tick] + .14));
    if (k > 0) {
      const Pk: Pt[] = [[CW / 2 - 92, CH / 2 - 42], [CW / 2 - 70, CH / 2 - 20], [CW / 2 - 26, CH / 2 - 66]];
      traza(c, Pk, 0, k, ACENTO, 11);
    }
  }
  if (F.tira !== undefined) {
    const a = ease.outCubic(prog(t, F.tira - .02, F.tira + .1)), b = ease.outCubic(prog(t, F.tira + .08, F.tira + .2));
    c.strokeStyle = ACENTO; c.lineWidth = 15; c.lineCap = "round";
    if (a > 0) { c.beginPath(); c.moveTo(-160, -130); c.lineTo(lerp(-160, 160, a), lerp(-130, 90, a)); c.stroke(); }
    if (b > 0) { c.beginPath(); c.moveTo(160, -130); c.lineTo(lerp(160, -160, b), lerp(-130, 90, b)); c.stroke(); }
  }
  c.restore();
}

function selloTexto(c: CanvasRenderingContext2D, s: string, x: number, y: number, px_: number, rot: number, t: number, ti: number, a: number) {
  const age = t - ti; if (age < -.1 || a <= .01) return;
  const k = ease.inCubic(prog(age, -.1, 0)), esc = lerp(1.9, 1, k);
  const r = azar(Math.floor(t * 10) + 5), vib = (r() - .5) * .004;
  c.save(); c.translate(x, y); c.rotate(rot + vib); c.scale(esc, esc); c.globalAlpha = k * a;
  c.font = serif(px_); const w = c.measureText(s).width + 70, h = px_ * 1.3;
  c.strokeStyle = ACENTO; c.lineWidth = 8; c.strokeRect(-w / 2, -h / 2, w, h); c.lineWidth = 3; c.strokeRect(-w / 2 + 12, -h / 2 + 12, w - 24, h - 24);
  c.fillStyle = ACENTO; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(s, 0, 4);
  c.restore();
}

function lobos(c: CanvasRenderingContext2D, t: number) {
  const zp = ease.inOutCubic(prog(t, t0.hasta - .05, t0.hasta + 1.35));
  const Z = 1 + zp * 2.6, ax = CX[0], ay = CY[0];
  if (zp < .45) {
    c.save(); c.translate(ax, ay); c.scale(Z, Z); c.translate(-ax, -ay); c.globalAlpha = 1 - smooth(prog(zp, .08, .42));
    FOTOS.forEach((F, i) => {
      if (i === 0 || t < F.ent) return;
      const k = ease.outCubic(prog(t, F.ent, F.ent + .36)), vuela = F.tira !== undefined ? ease.inCubic(prog(t, F.tira + .26, F.tira + .6)) : 0;
      if (vuela >= 1) return;
      const r0 = (i % 2 ? .012 : -.012) * (i % 3 ? 1 : -1), x = CX[F.col] + (1 - k) * F.de * 720 + vuela * F.de * 760, y = CY[F.fil] + Math.sin(t * 1.15 + i) * 3.5 - vuela * 60;
      carta(c, F, x, y, r0 + (1 - k) * F.de * .32 + vuela * F.de * .5 + Math.sin(t * .9 + i * 2) * .0035, t, i);
    });
    c.restore();
  }
  // la carta 0 es la que se abre hasta llenar la pantalla
  const F = FOTOS[0];
  if (t >= F.ent) {
    const k = ease.outCubic(prog(t, F.ent, F.ent + .36));
    const bx = CX[0] + (1 - k) * F.de * 720, by = CY[0] + Math.sin(t * 1.15) * 3.5 * (1 - zp), rot = ((1 - k) * F.de * .32 - .012) * (1 - zp);
    if (zp <= 0) carta(c, F, bx, by, rot, t, 0);
    else {
      const R0: Rect = { x: bx - CW / 2 + 15, y: by - CH / 2 + 15, w: CW - 30, h: CH - 90 }, R = mezR(R0, FULL, zp);
      c.fillStyle = "#FFFFFF"; const m = 15 * (1 - zp);
      c.fillRect(R.x - m, R.y - m, R.w + 2 * m, R.h + 2 * m + 60 * (1 - zp));
      const gris = smooth(prog(t, t0.noMira + .05, t0.noMira + .55));
      foto(c, R, t, F, { esc: lerp(1, 2.1, zp), n: Math.round(lerp(46, 150, zp)), gris });
      texto(c, F.animal, R.x + 7, R.y + R.h + 56 * (1 - zp), { fuente: serif(62, true), color: TINTA, alin: "left", alfa: 1 - smooth(zp * 3) });
    }
  }
  // el diez, ya en el cielo de la primera foto
  if (t >= ev.diez2 - .1) {
    const k = ease.outCubic(prog(t, F.ent, F.ent + .36)), R0: Rect = { x: CX[0] - CW / 2 + 15, y: CY[0] - CH / 2 + 15, w: CW - 30, h: CH - 90 }, R = mezR(R0, FULL, zp);
    const age = t - ev.diez2, u = ease.inCubic(prog(age, -.1, 0));
    diezSello(c, R.x + R.w * .76, R.y + R.h * lerp(.16, .17, zp), lerp(2.2, 1, u) * lerp(.36, .95, zp), -.1, t, 13, u * k);
  }

  const aS = 1 - smooth(prog(t, t0.hasta - .2, t0.hasta + .1));
  selloTexto(c, "A PROPÓSITO", 540, 160, 100, -.03, t, t0.prop + .04, aS);
  texto(c, "Ribeiro et al., 2016", 540, 284, { fuente: mono(36), color: TINTA, alfa: aS * smooth(prog(t, t0.prop + .4, t0.prop + .7)) * .72 });
  rotulo(c, t, t0.prop + .85, t0.todos - .12, "fotos de lobos y de perros", 1530, 86, TINTA, true);
  rotulo(c, t, t0.todos, t0.nieve - .1, "todos los lobos", 1530, 112);
  rotulo(c, t, t0.nieve - .02, t0.acierta - .12, "en la nieve", 1530, 124, ACENTO, true);
  rotulo(c, t, t0.acierta, t0.parece - .1, "Acertaba casi siempre", 1530, 96);
  rotulo(c, t, t0.parece, t0.hasta - .12, "Parecía brillante", 1530, 112, ACENTO, true);
  rotulo(c, t, t0.hasta + .55, t0.noMira - .1, "¿en qué se fijaba?", 330, 96, TINTA, true, 400);
  rotulo(c, t, t0.noMira, ev.miraba, "No miraba al animal", 330, 88, TINTA, false, 388);

  // la mira busca sobre el animal, y no encuentra nada que encender
  if (zp > .9 && t < t0.noMira + .5) {
    const L = lugar(FULL);
    const S: Pt[] = [[870, 180], [430, 300], [190, 340], [700, 480], [860, 190]];
    const q = prog(t, t0.fijaba - .55, t0.noMira - .05) * (S.length - 1), i = Math.min(Math.floor(q), S.length - 2), u = ease.inOutCubic(q - i);
    const x = L.ox + (1000 - lerp(S[i][0], S[i + 1][0], u)) * L.s, y = L.oy + lerp(S[i][1], S[i + 1][1], u) * L.s;
    const rp = prog(t, t0.noMira + .02, t0.noMira + .5);
    const a = smooth(prog(t, t0.fijaba - .6, t0.fijaba - .4)) * (1 - rp);
    c.save(); c.globalAlpha = a; c.strokeStyle = ACENTO; c.lineWidth = 8; c.translate(x, y); c.rotate(t * .9);
    const r = 92 + rp * 130;
    c.beginPath(); c.arc(0, 0, r, 0, 7); c.stroke();
    for (let k = 0; k < 4; k++) { c.rotate(1.5708); c.beginPath(); c.moveTo(r - 18, 0); c.lineTo(r + 28, 0); c.stroke(); }
    c.restore();
  }
}

// ---------- el negro: lo único que miraba ----------
const CEL = 38;
type Celda = { x: number; y: number; h: number; f: number; ret: number };
function preparar() {
  const L = lugar(FULL), r = azar(404), Q = LOBO_P.map(([x, y]) => [L.ox + (1000 - x) * L.s, L.oy + y * L.s] as Pt), cel: Celda[] = [];
  for (let y = L.hy + 10; y < 1990; y += CEL) for (let x = -60; x < 1150; x += CEL) {
    const cx = x + CEL / 2, cy = y + CEL / 2;
    let d = 1e9; for (let i = 0; i < Q.length; i += 2) d = Math.min(d, Math.hypot(Q[i][0] - cx, Q[i][1] - cy));
    const ruido = .5 + .28 * Math.sin(cx * .011 + cy * .007 + 1) + .2 * Math.sin(cx * .004 - cy * .013 + 4) + (r() - .5) * .22;
    const borde = smooth(prog(y, L.hy, L.hy + 150));
    cel.push({ x, y, h: clamp((.3 + ruido * .6) * borde), f: r() * 6.28, ret: .05 + .5 * clamp(1 - d / 640) + r() * .12 });
  }
  const paleta: string[] = [];
  const P: [number, number[]][] = [[0, [20, 8, 6]], [.32, [110, 30, 16]], [.62, [192, 68, 42]], [.86, [228, 122, 92]], [1, [240, 170, 140]]];
  for (let i = 0; i < 64; i++) {
    const u = i / 63, j = Math.max(0, P.findIndex(([q]) => q >= u) - 1), a = P[j], b = P[j + 1], k = prog(u, a[0], b[0]);
    paleta.push(`rgb(${a[1].map((v, q) => Math.round(lerp(v, b[1][q], k))).join(",")})`);
  }
  return { cel, paleta };
}
type Datos = ReturnType<typeof preparar>;

function negro(c: CanvasRenderingContext2D, t: number, d: Datos) {
  c.fillStyle = NOCHE; c.fillRect(-60, -60, 1200, 2040);
  const age = t - ev.miraba, L = lugar(FULL);
  for (const q of d.cel) {
    const a = age - q.ret; if (a < 0 || q.h <= .01) continue;
    const h = clamp(q.h * smooth(a / .16) * (1 + .1 * Math.sin(t * 2.7 + q.f) + .05 * Math.sin(t * 6.1 + q.f * 2)) + Math.exp(-a * 8) * .42 * q.h);
    c.fillStyle = d.paleta[Math.round(h * 63)]; c.fillRect(q.x + 1, q.y + 1, CEL - 2, CEL - 2);
  }
  // Donde está el animal no hay nada: un agujero con su forma.
  forma(c, LOBO_P, L.ox, L.oy, L.s, true, 500, NOCHE, t, 1.6);
  copos(c, FULL, t, 150, 2.1, LUZ, .62);
  rotulo(c, t, ev.miraba + .02, t0.pe, "Miraba", 262, 112, LUZ);
  rotulo(c, t, ev.miraba + .32, t0.pe, "la nieve", 440, 188, CORAL, true);
}

// ---------- los datos, el sobre y las dos curvas ----------
const TOT = XS.length + XH.length;
const ORDEN_H = (() => { const r = azar(61), o = XH.map((_, i) => i); for (let i = o.length - 1; i > 0; i--) { const k = Math.floor(r() * (i + 1)); [o[i], o[k]] = [o[k], o[i]]; } return o; })();
const SX = 180, SW = 720, SH = 400, S_TOP = 1120, S_H = 225;

function sobreAtras(c: CanvasRenderingContext2D, dy: number, k: number) {
  const y = S_TOP + dy;
  c.fillStyle = "#E2DFD4"; c.fillRect(SX, y, SW, SH);
  if (k < .5) {
    const ap = y - S_H * Math.cos(k * Math.PI);
    c.fillStyle = "#E9E6DC"; c.strokeStyle = "rgba(20,18,14,.3)"; c.lineWidth = 3; c.lineJoin = "round";
    c.beginPath(); c.moveTo(SX, y); c.lineTo(SX + SW / 2, ap); c.lineTo(SX + SW, y); c.closePath(); c.fill(); c.stroke();
  }
}
function sobreFrente(c: CanvasRenderingContext2D, dy: number, k: number) {
  const y = S_TOP + dy;
  for (let i = 3; i >= 1; i--) { c.fillStyle = "rgba(20,18,14,.05)"; c.fillRect(SX + i * 3 + 3, y + SH, SW, i * 5 + 3); }
  c.fillStyle = HOJA; c.strokeStyle = "rgba(20,18,14,.3)"; c.lineWidth = 3; c.lineJoin = "round";
  c.beginPath(); c.moveTo(SX, y); c.lineTo(SX + SW / 2, y + 170); c.lineTo(SX + SW, y); c.lineTo(SX + SW, y + SH); c.lineTo(SX, y + SH); c.closePath(); c.fill(); c.stroke();
  if (k >= .5) {
    const ap = y - S_H * Math.cos(k * Math.PI);
    c.fillStyle = "#F7F5EE"; c.beginPath(); c.moveTo(SX, y); c.lineTo(SX + SW / 2, ap); c.lineTo(SX + SW, y); c.closePath(); c.fill(); c.stroke();
    sombraR(c, SX + SW / 2, ap + 18, 90, .18 * smooth(prog(k, .5, 1)));
  }
}

/** Paso de entrenamiento: 0 es la curva más simple, 1 ya está sobreajustando. */
function avance(t: number) {
  if (t < t0.jamas) return 0;
  if (t < t0.cuando) return lerp(0, .27, prog(t, t0.jamas, t0.cuando));
  if (t < t0.pero) return lerp(.27, E_MIN, ease.inOutSine(prog(t, t0.cuando, t0.pero)) * .35 + prog(t, t0.cuando, t0.pero) * .65);
  if (t < t0.ahi) return lerp(E_MIN, 1, ease.inOutSine(prog(t, t0.pero, t0.subir)));
  const d = t - t0.ahi;                                                  // rueda de regreso al fondo del valle
  return E_MIN + (1 - E_MIN) * Math.exp(-d * 4.4) * Math.cos(d * 6);
}
const E_Y0 = 1300, E_Y1 = 640, E_X0 = 170, E_X1 = 925;
const xE = (e: number) => lerp(E_X0, E_X1, e), yE = (v: number) => lerp(E_Y0, E_Y1, v / .46);
const aE = (A_: number[], e: number) => { const q = clamp(e) * (NE - 1), i = Math.min(Math.floor(q), NE - 2); return lerp(A_[i], A_[i + 1], q - i); };

function tramo(A_: number[], a: number, b: number, t: number, semilla: number): Pt[] {
  const r = azar(Math.floor(t * 10) * 5 + semilla), f = r() * 6.28, g = r() * 6.28, P: Pt[] = [], n = Math.max(2, Math.ceil((b - a) * 120));
  for (let i = 0; i <= n; i++) { const e = lerp(a, b, i / n); P.push([xE(e), yE(aE(A_, e)) + 2 * Math.sin(i * .19 + f) + 1.2 * Math.sin(i * .47 + g)]); }
  return P;
}

function plotError(c: CanvasRenderingContext2D, t: number) {
  const aEje = smooth(prog(t, t0.cuando - .15, t0.cuando + .4)) * (1 - smooth(prog(t, t0.modelo - .74, t0.modelo - .4)));
  if (aEje <= 0) return;
  const aV = avance(t), kPen = ease.inOutCubic(prog(t, t0.cuando - .1, t0.cuando + .45));
  const e = aV * kPen, eMax = t >= t0.ahi ? 1 : e, kE = ease.inOutCubic(prog(t, t0.cuando - .1, t0.cuando + .35));
  c.save(); c.globalAlpha = aEje;
  c.strokeStyle = TINTA; c.lineWidth = 5; c.lineCap = "round";
  c.beginPath(); c.moveTo(E_X0, lerp(E_Y0, E_Y1 - 30, 0)); c.lineTo(E_X0, lerp(E_Y0, E_Y1 - 30, kE)); c.moveTo(E_X0, E_Y0); c.lineTo(lerp(E_X0, E_X1 + 20, kE), E_Y0); c.stroke();
  texto(c, "error", 128, 596, { fuente: serif(78, true), color: TINTA, alin: "left", alfa: aEje * kE });
  texto(c, "entrenando", 540, 1392, { fuente: serif(78, true), color: TINTA, alfa: aEje * kE });
  flecha(c, 730, 1366, 830, 1366, TINTA, 6, 22);

  const stop = smooth(prog(t, t0.todo, t0.todo + .35));
  // la brecha: lo que ya no es aprender
  const eC = (() => { for (let i = NE - 1; i > 0; i--) if (EV[i] < ER[i]) return i / (NE - 1); return E_MIN; })();
  if (eMax > eC) {
    const a = tramo(ER, eC, eMax, t, 3), b = tramo(EV, eC, eMax, t, 4).reverse();
    c.save(); c.globalAlpha = aEje * .13 * (1 - stop * .55); c.fillStyle = ACENTO; c.beginPath(); [...a, ...b].forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); c.restore();
  }
  // tras el alto, lo que iba a pasar queda como un fantasma
  if (eMax > e + .002) {
    c.save(); c.globalAlpha = aEje * lerp(.9, .24, stop);
    traza(c, tramo(ER, e, eMax, t, 5), 0, 1, TINTA, 9); traza(c, tramo(EV, e, eMax, t, 6), 0, 1, ACENTO, 9);
    c.restore();
  }
  if (e > .002) { traza(c, tramo(ER, 0, e, t, 1), 0, 1, TINTA, 9); traza(c, tramo(EV, 0, e, t, 2), 0, 1, ACENTO, 9); }

  // la línea del alto cae como una guillotina
  const kL = ease.inCubic(prog(t, t0.todo - .22, t0.todo));
  if (kL > 0) {
    const x = xE(E_MIN), ya = lerp(560, E_Y1 - 30, kL);
    c.fillStyle = TINTA; c.fillRect(x - 5, E_Y1 - 30, 10, (E_Y0 - E_Y1 + 30) * kL);
    if (kL < 1) c.fillRect(x - 5, ya, 10, 0);
  }

  bola(c, xE(e), yE(aE(ER, e)), 19);
  c.restore();
  rotulo(c, t, T("en lo que ya vio").s, t0.modelo - .78, "lo que ya vio", 1264, 80, TINTA, true, 372);
  rotulo(c, t, t0.esc, t0.modelo - .78, "lo escondido", 730, 84, ACENTO, true, 365);
  rotulo(c, t, t0.todo - .1, t0.modelo - .78, "ahí se detiene todo", 1528, 104, TINTA, true);
}

function datos(c: CanvasRenderingContext2D, t: number) {
  const kP = ease.inOutCubic(prog(t, t0.cuando - .35, t0.cuando + .55)), kF = ease.inOutCubic(prog(t, t0.modelo - .42, t0.modelo + .58));
  const M = mez(mez(M2, M3, kP), M4, kF), r = lerp(lerp(19, 11, kP), 24, kF);
  M.oy += kF * 8 * Math.sin(t * .95);
  const dyS = (1 - ease.outBack(prog(t, t0.pe + .35, t0.pe + .95))) * 620 + ease.inCubic(prog(t, t0.cuando - .4, t0.cuando + .2)) * 760 + Math.sin(t * 1.5) * 7;
  const kS = ease.inOutCubic(prog(t, ev.cierra_sobre, ev.sello - .02));
  const verSobre = dyS < 700;
  if (verSobre) sobreAtras(c, dyS, kS);

  // la curva del modelo
  const e = avance(t);
  const aCur = smooth(prog(t, t0.jamas - .1, t0.jamas + .35));
  if (aCur > 0) {
    c.save(); c.globalAlpha = aCur;
    traza(c, curvaP(ajuste(lerp(L_INI, L_FIN, e)), M, t, 4, lerp(2.4, 1.6, kP)), 0, ease.inOutSine(prog(t, t0.jamas - .1, t0.jamas + .75)), TINTA, lerp(lerp(8, 5, kP), 9, kF));
    c.restore();
  }

  // copos que, al volver el papel, son bolas: mismas posiciones, tinta invertida
  for (let i = 0; i < TOT; i++) {
    const es = i >= XS.length, j = i - XS.length;
    const k0 = copo(i * 3 + 2, t0.pe, FULL), u = ease.outCubic(prog(t, t0.pe + i * .007, t0.pe + .78 + i * .007));
    const xb = es ? XH[j] : XS[i], yb = es ? YH[j] : YS[i];
    let x = lerp(k0.x, px(M, xb), u), y = lerp(k0.y, py(M, yb), u);
    const R = lerp(k0.r * 2.1, r, u);
    if (es) {
      const orden = ORDEN_H.indexOf(j), ts = ev.saltos[orden], h = prog(t, ts, ts + .42);
      if (h >= 1) continue;
      const q = ease.inOutSine(h);
      x = lerp(x, 300 + orden * 32, q); y = lerp(y, S_TOP + dyS + 240, ease.inCubic(h)) - Math.sin(h * Math.PI) * 120;
      const roja = t >= t0.parte + orden * .025;
      const pz = roja ? Math.exp(-(t - t0.parte - orden * .025) * 7) : 0;
      bola(c, x, y, R * (1 + pz * .4), roja ? ACENTO : TINTA);
    } else {
      // tras el diez, una ola: los puntos que ya conocía dan por bueno al nuevo
      const ti = t0.fin + 1 + i * .07, ola = t >= ti ? Math.exp(-(t - ti) * 6) : 0;
      sombraR(c, x + 3, y + 7, R * 1.55, .2 * u);
      bola(c, x, y, R * (1 + ola * .3));
    }
  }
  if (verSobre) sobreFrente(c, dyS, kS);

  plotError(c, t);

  // el sello del sobre: la misma pieza roja que luego escribe la curva de lo escondido
  if (t >= ev.sello - .05) {
    const k = ease.outBack(prog(t, ev.sello - .05, ev.sello + .14), 2.2), vu = ease.inOutCubic(prog(t, t0.cuando - .3, t0.cuando + .15));
    const x0 = SX + SW / 2, y0 = S_TOP + S_H - 4 + dyS;
    const eP = avance(t) * ease.inOutCubic(prog(t, t0.cuando - .1, t0.cuando + .45));
    const xF = xE(eP), yF = yE(aE(EV, eP));
    const aF = 1 - smooth(prog(t, t0.modelo - .74, t0.modelo - .4));
    c.save(); c.globalAlpha = aF;
    bola(c, lerp(x0, xF, vu), lerp(y0, yF, vu) - Math.sin(vu * Math.PI) * 120, lerp(54 * k, 19, vu), ACENTO);
    c.restore();
  }

  rotulo(c, t, t0.parte - .05, t0.jamas - .25, "una parte de los datos", 232, 96, ACENTO, true);
  rotulo(c, t, t0.jamas, t0.ese - .1, "jamás la ve", 232, 132, TINTA, true);
  rotulo(c, t, t0.ese, t0.cuando - .4, "el examen de verdad", 232, 102, ACENTO, true);

  // el cierre
  if (t >= t0.modelo - .1) {
    const salir = 1 - smooth(prog(t, t0.vale - .34, t0.vale - .08));
    texto(c, "Un modelo no vale", 540, 300, { fuente: serif(106), color: TINTA, alfa: salir * smooth(prog(t, t0.modelo - .05, t0.modelo + .15)) });
    texto(c, "por lo que acierta", 540, 416, { fuente: serif(106), color: TINTA, alfa: salir * smooth(prog(t, t0.porQue - .05, t0.porQue + .15)) });
    texto(c, "en lo que ya vio", 540, 532, { fuente: serif(106), color: TINTA, alfa: salir * smooth(prog(t, t0.yaVio - .05, t0.yaVio + .15)) });
    const kT = ease.outCubic(prog(t, t0.yaVioE - .3, t0.yaVioE + .02));
    if (kT > 0 && salir > 0) { c.save(); c.globalAlpha = salir; c.strokeStyle = ACENTO; c.lineWidth = 11; c.lineCap = "round"; c.beginPath(); c.moveTo(250, 500); c.lineTo(lerp(250, 830, kT), lerp(500, 512, kT)); c.stroke(); c.restore(); }

    const aV = smooth(prog(t, t0.vale - .05, t0.vale + .16));
    texto(c, "Vale por lo que acierta", 540, 340, { fuente: serif(106), color: TINTA, alfa: aV });
    const nv = T("lo que nunca vio").s;
    const zf = 1 + Math.max(t - nv, 0) * .008;
    c.save(); c.translate(540, 520); c.scale(zf, zf);
    texto(c, "en lo que nunca vio", 0, 0, { fuente: serif(110, true), color: ACENTO, alfa: smooth(prog(t, nv - .05, nv + .16)) });
    c.restore();

    // el mismo dato nuevo, ahora sobre la curva que se equivocaba un poco
    const tCae = t0.fin - Math.sqrt(2 * ev.NH / ev.BG);
    if (t >= tCae) {
      const X = px(M, XN), Y = py(M, YN);
      bolaHoja(c, X, Y, 26, caida(t - tCae, ev.NH, ev.NR, ev.BG).z, ACENTO);
      for (let i = 0; i < 3; i++) { const q = prog(t, t0.fin + i * .16, t0.fin + i * .16 + 1.1); if (q > 0 && q < 1) anillo(c, X, Y, 30 + ease.outCubic(q) * 250, ACENTO, (1 - q) * .75, 5); }
    }
    if (t >= t0.fin + .42) {
      const u = ease.inCubic(prog(t, t0.fin + .42, t0.fin + .52));
      diezSello(c, 790, 1400, lerp(2.2, 1.1, u), -.1, t, 17, u);
    }
  }
}

function dibuja(c: CanvasRenderingContext2D, t: number, d: Datos) {
  const neg = t >= ev.miraba && t < t0.pe;
  c.fillStyle = neg ? NOCHE : PAPEL; c.fillRect(0, 0, 1080, 1920);
  const s = sacude(t);
  const z = 1.03 + .02 * Math.sin(t * .83), dx = 15 * Math.sin(t * .71) + s.x, dy = 17 * Math.cos(t * .61) + s.y;
  c.save(); c.translate(540 + dx, 900 + dy); c.rotate(.0075 * Math.sin(t * .47)); c.scale(z, z); c.translate(-540, -900);
  if (neg) { negro(c, t, d); c.restore(); return; }
  c.fillStyle = PAPEL; c.fillRect(-60, -60, 1200, 2040);
  rejilla(c, t, smooth(prog(t, t0.mira - .2, t0.mira + .7)));
  motas(c, t, TINTA, 1);
  if (t > t0.raro + .3 && t < t0.inv + 1.2) copos(c, FULL, t, 110, 2.3, "#B7B5AC", smooth(prog(t, t0.raro + .3, t0.raro + .85)) * (1 - smooth(prog(t, t0.inv + .55, t0.inv + 1.15))));
  if (t < t0.mira + 1) apertura(c, t);
  if (t >= Math.min(...ev.bolas) && t < t0.inv + .4) curvaYBolas(c, t);
  if (t >= t0.inv - .05 && t < ev.miraba) lobos(c, t);
  if (t >= t0.pe) datos(c, t);
  c.restore();
}

export const Pieza: React.FC = () => <Lienzo dibuja={dibuja} preparar={preparar} />;
