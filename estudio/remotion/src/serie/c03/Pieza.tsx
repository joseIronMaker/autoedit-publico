// Capítulo 3. Una pieza mecánica de verdad: perillas de metal, bolas que ruedan a una balanza, un fiel que
// cruza un límite. La MISMA pieza es la celda de un campo enorme: el video entra a la palabra "ChatGPT" hasta
// quedarse con una sola, y al final sale hasta ver la palabra otra vez. Pesos de la decisión: +1, +1, −3.
// Una bola es un dato × su peso; su número viaja impreso. Cuando deja de llover el dato vale 0 y la bola
// desaparece aunque la perilla siga en −3: los pesos no cambian, cambian las entradas.
import React from "react";
import { azar, clamp, ease, lerp, muestreaTexto, prog, resorte, smooth, texto } from "../../kit";
import { ACENTO, bola, cue, flecha, GRIS, Lienzo, LUZ, mono, NOCHE, PAPEL, rotulo, serif, TINTA } from "../../marca";
import palabras from "./palabras.json";
import duracion from "./duracion.json";

export const DURACION = duracion.dur;
const T = cue(palabras);
type Ctx = CanvasRenderingContext2D;

const t0 = {
  gpt: T("chatgpt").s, pieza: T("pieza").s, rep: T("repetida").s, yesa: T("y esa pieza").s, cabe: T("cabe").s, linea: T("línea").s, secu: T("secundaria").s,
  imag: T("imagina").s, sales: T("sales a correr").s, buen: T("hace buen clima").s, un: T("un punto").s, punto: T("un punto").e, dorm: T("dormiste").s, otro: T("otro punto").s,
  llov: T("está lloviendo").s, menos: T("menos tres").s, tres: T("menos tres").e, pero: T("pero no todo").s, igual: T("igual").s, lluv: T("la lluvia").s, mas: T("más que").s, sueno: T("el sueño").s,
  cada: T("cada dato").s, multi: T("multiplica").s, impo: T("su importancia").s, esa: T("esa importancia").s, llam: T("llamamos").s, peso: T("peso").s,
  luego: T("luego").s, suma: T("suma").s, todo: T("suma todo").e, si: T("si pasa").s, lim: T("límite").s, sal: T("sales", T("límite").i).s, sino: T("si no pasa").s, queda: T("te quedas").s,
  feli: T("felicidades").s, acabas: T("acabas").s, neu: T("una neurona artificial").s, ning: T("ninguna otra").s, art: T("artificial").s, mul: T("multiplicar").s, sum: T("sumar").s, dec: T("decidir").s, nada: T("nada más").s,
  inv: T("la inventaron").s, mil: T("mil novecientos").s, papel: T("en papel").s, insp: T("inspirados").s, pero2: T("pero no te").s, parece: T("se parece").s, verdad: T("de verdad").s, loq: T("lo que un").s,
  avion: T("avión").s, pajaro: T("pájaro").s, ylos: T("y los pesos").s, pesos: T("pesos").s, peri: T("perillas").s, habla: T("hablamos").s, nadie: T("nadie").s, mano: T("mano").s, salen: T("salen").s,
  una: T("una sola neurona").s, nosabe: T("no sabe").s, correr: T("qué es correr").e, ni: T("ni qué").s, lluvia: T("la lluvia", 80).s, lluviaF: T("la lluvia", 80).e, ygpt: T("y chatgpt").s, solo: T("solo tiene").s, much: T("muchísimas").s, fin: palabras[palabras.length - 1].e,
};

// ---------- utilidades ----------
function linea(c: Ctx, ax: number, ay: number, bx: number, by: number) { c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); }
function circulo(c: Ctx, x: number, y: number, r: number) { c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill(); }
function tramos(t: number, v0: number, S: [number, number, number, ((x: number) => number)?][]) {
  let v = v0;
  for (const [a, b, x, f] of S) { if (t <= a) break; v = lerp(v, x, (f ?? smooth)(prog(t, a, b))); }
  return v;
}
const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * 6.2832 + f);

// ---------- la máquina, en píxeles de reposo ----------
const XK = [190, 470, 830], YK = 480, RK = 92, YSLOT = 744;
const XP = 540, YP = 1060, BRAZO = 290, RN = 470, RB = 56, TMAX = .46, LIMITE = 1;
const fielDe = (s: number) => TMAX * Math.tanh(s / 2.2);
const angPerilla = (v: number) => -Math.PI / 2 + v * Math.PI / 4;
const radioDe = (w: number) => RB * Math.abs(w) ** .6;

// Tiempos de llegada de cada bola: el mismo instante mueve la balanza y suena (partitura.py los repite).
const A = {
  a0: [t0.un - .03, t0.punto + .05], a1: [t0.otro - .03, t0.otro + .55], a2: [t0.tres - .3, t0.tres + .08],
  sube0: t0.pero, baja: t0.cada - .12,
  b0: [t0.luego + .08, t0.luego + .63], b1: [t0.luego + .4, t0.luego + .95], b2: [t0.suma - .12, t0.todo - .25],
  sin: t0.si + .12, vuelve: t0.sino + .1, c2: [t0.sino + .3, t0.sino + .82],
};

/** s = suma que siente la balanza; cada clave es un cambio de carga con su propio resorte. */
const KS: [number, number, number, number][] = [
  [A.a0[1], 1, 1.5, .3], [A.a1[1], 2, 1.5, .3], [A.a2[1], -1, 2, .3],
  [A.sube0 + .12, 0, 1, .55],
  [t0.lluv + .2, -2, .9, .42],
  [A.baja + .15, 0, 1.1, .5],
  [A.b0[1], 1, 1.5, .3], [A.b1[1], 2, 1.5, .3], [A.b2[1], -1, 2, .3],
  [A.sin + .45, 2, 1.25, .36], [A.c2[1], -1, 2, .3],
];
function fiel(t: number) {
  let p = 0, th = 0;
  for (const [ti, s, f, z] of KS) { th += (fielDe(s) - fielDe(p)) * resorte(t - ti, f, z); p = s; }
  return th;
}
function plato(i: number, th: number) {
  const lado = i === 2 ? 1 : -1;
  return { x: XP + lado * BRAZO * Math.cos(th) + [-62, 62, 0][i], y: YP - lado * BRAZO * Math.sin(th) - 58 };
}

const GUIA: [number, number][][] = [
  [[190, YSLOT], [186, 790], [196, 830], [188, 880]],
  [[470, YSLOT], [462, 830], [330, 800], [312, 880]],
  [[830, YSLOT], [830, 790], [830, 830], [830, 860]],
];
function bez(G: [number, number][], u: number) {
  const a = 1 - u, b0 = a * a * a, b1 = 3 * a * a * u, b2 = 3 * a * u * u, b3 = u * u * u;
  return { x: b0 * G[0][0] + b1 * G[1][0] + b2 * G[2][0] + b3 * G[3][0], y: b0 * G[0][1] + b1 * G[1][1] + b2 * G[2][1] + b3 * G[3][1] };
}
function viaje(i: number, u: number, tFin: number, r: number) {
  if (u < .76) return bez(GUIA[i], u / .76);
  const e = bez(GUIA[i], 1), p = plato(i, fiel(tFin));
  const k = (u - .76) / .24;
  return { x: lerp(e.x, p.x, k), y: lerp(e.y, p.y - r, k) };
}

function valores(t: number): [number, number, number] {
  const tiembla = (ti: number, a = .22) => (t > ti ? a * Math.exp(-(t - ti) * 6) * Math.sin((t - ti) * 34) : 0);
  const m = t0.multi;
  const v0 = tramos(t, 0, [[t0.un - .22, t0.un + .14, 1, ease.outBack]]) + tiembla(m + .02) + tiembla(t0.peso - .05, .16);
  const v1 = tramos(t, 0, [[t0.otro - .22, t0.otro + .14, 1, ease.outBack]]) + tiembla(m + .22) + tiembla(t0.peso - .05, .16);
  const v2 = tramos(t, 0, [[t0.menos - .24, t0.menos + .3, -3, ease.outBack], [t0.pero + .1, t0.igual, -1], [t0.lluv + .05, t0.mas + .02, -3, ease.inOutCubic]]) + tiembla(m + .42, .34) + tiembla(t0.peso - .05, .16);
  return [v0, v1, v2];
}

type Bo = { x: number; y: number; w: number; rojo: number; txt: string; a: number; i: number };

function bolas(t: number): Bo[] {
  const th = fiel(t), out: Bo[] = [];
  const hop = (ti: number, h = 46) => (t > ti ? h * Math.exp(-(t - ti) * 5) * Math.abs(Math.sin((t - ti) * 10)) : 0);
  const enPlato = (i: number, r: number) => { const p = plato(i, th); return { x: p.x, y: p.y - r }; };
  const ranura = (i: number, r: number) => ({ x: XK[i], y: YSLOT + (r - RB) * .5 });
  const ida = (i: number, [a, b]: number[], r: number) => viaje(i, prog(t, a, b) ** 2, b, r);
  // Los dos de la izquierda: + 1 y + 1.
  for (const i of [0, 1]) {
    const a1 = i === 0 ? A.a0 : A.a1, a2 = i === 0 ? A.b0 : A.b1, sube = i === 0 ? A.sube0 : A.baja;
    if (t < a1[0] - .08) continue;
    const r = RB, multiplico = t > t0.multi + .05 + i * .2;
    let p: { x: number; y: number };
    if (t < a1[1]) p = ida(i, a1, r);
    else if (t < sube) { p = enPlato(i, r); p.y -= hop(A.a2[1], i === 1 ? 62 : 54) + hop(t0.mas, i === 1 ? 50 : 0); }
    else if (t < sube + .55) p = viaje(i, 1 - smooth(prog(t, sube, sube + .55)), sube, r);
    else if (t < a2[0]) p = ranura(i, r);
    else if (t < a2[1]) p = ida(i, a2, r);
    else { p = enPlato(i, r); p.y -= hop(A.b2[1], 44); }
    const pasada2 = t >= A.sube0 && t < a2[0] && !multiplico && (i === 0 || t >= A.baja);
    const escondida = i === 0 ? (1 - smooth(prog(t, sube + .4, sube + .62))) + smooth(prog(t, A.baja + .1, A.baja + .4)) : 1;
    out.push({ ...p, w: 1, rojo: 0, txt: pasada2 ? "1" : "+1", a: smooth(prog(t, a1[0] - .08, a1[0] + .04)) * clamp(escondida), i });
  }
  // La lluvia.
  const hin = t0.multi + .55;
  const w = tramos(t, 0, [[t0.menos - .24, t0.menos + .25, 3, ease.outCubic], [t0.pero + .1, t0.igual, 1], [t0.lluv + .05, t0.mas + .02, 3, ease.inOutCubic],
    [A.baja, A.baja + .5, 1], [hin, hin + .55, 3, ease.outBack], [A.sin, A.sin + .6, 0, ease.inOutCubic], [A.vuelve, A.c2[0], 3, ease.outCubic]]);
  if (w > .02 && t > t0.menos - .26) {
    const r = radioDe(w);
    let p: { x: number; y: number };
    if (t < A.a2[0]) p = ranura(2, r);
    else if (t < A.a2[1]) p = ida(2, A.a2, r);
    else if (t < A.baja) p = enPlato(2, r);
    else if (t < A.baja + .55) p = viaje(2, 1 - smooth(prog(t, A.baja, A.baja + .55)), A.baja, r);
    else if (t < A.b2[0]) p = ranura(2, r);
    else if (t < A.b2[1]) p = ida(2, A.b2, r);
    else if (t < A.sin + .7) p = enPlato(2, r);
    else if (t < A.c2[0]) p = ranura(2, r);
    else if (t < A.c2[1]) p = ida(2, A.c2, r);
    else p = enPlato(2, r);
    const rojo = t < A.baja ? 1 : tramos(t, 1, [[A.baja, A.baja + .4, 0], [hin, hin + .3, 1]]);
    const unidad = t >= A.baja && t < hin;
    const n = Math.round(w);
    out.push({ ...p, w, rojo, txt: unidad ? "1" : `−${Math.max(n, 1)}`, a: 1, i: 2 });
  }
  return out;
}

function dibujaBola(c: Ctx, b: Bo) {
  const r = radioDe(b.w);
  c.save(); c.globalAlpha = b.a;
  sombraBola(c, b.x, b.y, r);
  if (b.rojo < 1) bola(c, b.x, b.y, r);
  if (b.rojo > 0) { c.globalAlpha = b.a * b.rojo; bola(c, b.x, b.y, r, ACENTO); }
  c.restore();
  if (r > 26) texto(c, b.txt, b.x, b.y + r * .34, { fuente: mono(Math.round(r * .98)), color: LUZ, alfa: b.a });
}
function sombraBola(c: Ctx, x: number, y: number, r: number) {
  const g = c.createRadialGradient(x + r * .22, y + r * .3, r * .3, x + r * .22, y + r * .3, r * 1.34);
  g.addColorStop(0, "rgba(20,18,14,.3)"); g.addColorStop(1, "rgba(20,18,14,0)");
  c.fillStyle = g; c.beginPath(); c.arc(x + r * .22, y + r * .3, r * 1.34, 0, 6.2832); c.fill();
}

/** Perilla de metal: falda moleteada que gira, tapa cepillada cuyo brillo NO gira (la luz no se mueve). */
function perilla(c: Ctx, x: number, y: number, R: number, ang: number, px: number, py: number, det = true) {
  const tx = x + px, ty = y + py;
  if (det) {
    const g = c.createRadialGradient(x + R * .2, y + R * .28, R * .5, x + R * .2, y + R * .28, R * 1.5);
    g.addColorStop(0, "rgba(20,18,14,.42)"); g.addColorStop(1, "rgba(20,18,14,0)");
    c.fillStyle = g; c.beginPath(); c.arc(x + R * .2, y + R * .28, R * 1.5, 0, 6.2832); c.fill();
  }
  c.fillStyle = "#070707";
  for (let k = 0; k <= 4; k++) circulo(c, lerp(x, tx, k / 4), lerp(y, ty, k / 4), R * 1.02);
  const N = det ? 34 : 16;
  c.fillStyle = "#151514"; c.beginPath();
  for (let i = 0; i < N * 2; i++) {
    const a = ang + i * Math.PI / N, r = R * (i % 2 ? 1.05 : .985);
    if (i === 0) c.moveTo(tx + Math.cos(a) * r, ty + Math.sin(a) * r); else c.lineTo(tx + Math.cos(a) * r, ty + Math.sin(a) * r);
  }
  c.closePath(); c.fill();
  if (det) {
    c.lineWidth = Math.max(R * .018, 1); c.lineCap = "butt";
    for (let i = 0; i < N; i++) {
      const a = ang + (i * 2 + 1) * Math.PI / N;
      const l = Math.cos(a + 2.2); if (l < .12) continue;
      c.strokeStyle = `rgba(214,212,204,${.72 * l * l})`;
      linea(c, tx + Math.cos(a) * R * .9, ty + Math.sin(a) * R * .9, tx + Math.cos(a) * R * 1.03, ty + Math.sin(a) * R * 1.03);
    }
  }
  const G = c.createConicGradient(-.9, tx, ty);
  [["#E4E1D9", 0], ["#8D8B85", .13], ["#DCD9D1", .26], ["#74726C", .39], ["#D2CFC7", .5], ["#7F7D77", .63], ["#E6E3DB", .76], ["#7A7872", .89], ["#E4E1D9", 1]].forEach(([k, s]) => G.addColorStop(s as number, k as string));
  c.fillStyle = "#050505"; circulo(c, tx, ty, R * .8);
  c.fillStyle = G; circulo(c, tx, ty, R * .74);
  c.strokeStyle = TINTA; c.lineWidth = R * .075; c.lineCap = "round";
  linea(c, tx + Math.cos(ang) * R * .2, ty + Math.sin(ang) * R * .2, tx + Math.cos(ang) * R * .66, ty + Math.sin(ang) * R * .66);
  c.fillStyle = ACENTO; circulo(c, tx + Math.cos(ang) * R * .9, ty + Math.sin(ang) * R * .9, R * .062);
}

function escalaPerilla(c: Ctx, x: number, y: number, R: number) {
  c.strokeStyle = TINTA; c.lineCap = "round";
  for (let v = -3; v <= 3; v++) {
    const a = angPerilla(v); c.lineWidth = v === 0 ? 5 : 3.5;
    linea(c, x + Math.cos(a) * (R + 14), y + Math.sin(a) * (R + 14), x + Math.cos(a) * (R + (v === 0 ? 36 : 28)), y + Math.sin(a) * (R + (v === 0 ? 36 : 28)));
  }
}

function maquina(c: Ctx, v: readonly number[], th: number, px: number, py: number, o: { arco?: number; lim?: number; guias?: number; det?: boolean; repisa?: number } = {}) {
  const det = o.det ?? true, guias = o.guias ?? 1, arco = o.arco ?? 1, lim = o.lim ?? 0, repisa = o.repisa ?? 1;
  c.lineCap = "round";
  // Escala del fiel, fija al papel.
  if (arco > 0) {
    c.save(); c.globalAlpha = arco; c.strokeStyle = TINTA; c.lineWidth = 3.5;
    const a0 = Math.PI / 2 - fielDe(3.2), a1 = Math.PI / 2 - fielDe(-3.2), R = RN + 24;
    c.beginPath(); c.arc(XP, YP, R, a0, a1); c.stroke();
    for (let s = -3; s <= 3; s++) {
      const a = Math.PI / 2 - fielDe(s);
      c.lineWidth = s === 0 ? 5 : 3; linea(c, XP + Math.cos(a) * R, YP + Math.sin(a) * R, XP + Math.cos(a) * (R + (s === 0 ? 30 : 20)), YP + Math.sin(a) * (R + (s === 0 ? 30 : 20)));
    }
    c.restore();
  }
  if (lim > 0) {
    const a = Math.PI / 2 - fielDe(LIMITE), R0 = RN + 24 - 54 * ease.outCubic(lim), R1 = RN + 24 + 66 * ease.outCubic(lim);
    c.strokeStyle = ACENTO; c.lineWidth = 9; linea(c, XP + Math.cos(a) * R0, YP + Math.sin(a) * R0, XP + Math.cos(a) * R1, YP + Math.sin(a) * R1);
  }
  // Guías por donde bajan las bolas.
  if (guias > 0) {
    c.save(); c.globalAlpha = guias * .34; c.strokeStyle = TINTA; c.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
      const G = GUIA[i]; c.beginPath(); c.moveTo(XK[i], YK + RK + 32); c.lineTo(G[0][0], G[0][1]);
      c.bezierCurveTo(G[1][0], G[1][1], G[2][0], G[2][1], G[3][0], G[3][1]); c.stroke();
    }
    c.restore();
  }
  if (repisa > 0) {
    c.save(); c.globalAlpha = repisa; c.strokeStyle = TINTA; c.lineWidth = 5; linea(c, 100, 636, 960, 636);
    c.lineWidth = 10; linea(c, XP, 636, XP, YP); c.restore();
  }
  // El fiel: cuelga del pivote, su punta es lo único con color.
  const tipx = XP + RN * Math.sin(th), tipy = YP + RN * Math.cos(th);
  const nx = Math.cos(th), ny = -Math.sin(th);
  c.fillStyle = TINTA; c.beginPath(); c.moveTo(XP - nx * 11, YP - ny * 11); c.lineTo(tipx, tipy); c.lineTo(XP + nx * 11, YP + ny * 11); c.closePath(); c.fill();
  c.fillStyle = ACENTO; circulo(c, tipx, tipy, 13);
  // Cruz de la balanza.
  const ex = BRAZO * Math.cos(th), ey = BRAZO * Math.sin(th);
  const lx = XP - ex, ly = YP + ey, rx = XP + ex, ry = YP - ey;
  c.fillStyle = TINTA; c.beginPath(); const u = { x: Math.sin(th), y: Math.cos(th) };
  c.moveTo(lx - u.x * 5, ly - u.y * 5); c.lineTo(XP - u.x * 15, YP - u.y * 15); c.lineTo(rx - u.x * 5, ry - u.y * 5); c.lineTo(rx + u.x * 5, ry + u.y * 5); c.lineTo(XP + u.x * 15, YP + u.y * 15); c.lineTo(lx + u.x * 5, ly + u.y * 5); c.closePath(); c.fill();
  for (const [x, y] of [[lx, ly], [rx, ry]] as [number, number][]) {
    c.lineWidth = 8; c.strokeStyle = TINTA; linea(c, x, y, x, y - 46);
    c.fillStyle = TINTA; c.beginPath(); c.moveTo(x - 122, y - 58); c.lineTo(x + 122, y - 58); c.quadraticCurveTo(x + 100, y - 38, x, y - 38); c.quadraticCurveTo(x - 100, y - 38, x - 122, y - 58); c.fill();
  }
  c.fillStyle = TINTA; circulo(c, XP, YP, 26); c.fillStyle = LUZ; circulo(c, XP, YP, 9);
  // Perillas.
  for (let i = 0; i < 3; i++) {
    escalaPerilla(c, XK[i], YK, RK);
    perilla(c, XK[i], YK, RK, angPerilla(v[i]), px, py, det);
  }
}

// ---------- el campo: la misma pieza, repetida ----------
type Datos = { on: Uint8Array; W: number; H: number; iObj: number; jObj: number; correr: [number, number][]; lluvia: [number, number][]; arbol: Seg[][] };
type Seg = [number, number, number, number, number]; // x0 y0 x1 y1 nacimiento
const PASO = 5, ALTO = 1.3;

function prepara(): Datos {
  const cv = document.createElement("canvas"); cv.width = 1080; cv.height = 520;
  const g = cv.getContext("2d", { willReadFrequently: true })!;
  g.font = serif(300); const k = 872 / g.measureText("ChatGPT").width; g.font = serif(Math.round(300 * k));
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#000"; g.strokeStyle = "#000"; g.lineWidth = 3;
  g.fillText("ChatGPT", 540, 260); g.strokeText("ChatGPT", 540, 260);
  const px = g.getImageData(0, 0, 1080, 520).data;
  const W = 200, H = 140, on = new Uint8Array((2 * W + 1) * (2 * H + 1));
  let iObj = 0, jObj = 0, mejor = 1e9;
  for (let j = -H; j <= H; j++) for (let i = -W; i <= W; i++) {
    const x = Math.round(540 + i * PASO), y = Math.round(260 + j * PASO * ALTO);
    if (x < 0 || x >= 1080 || y < 0 || y >= 520) continue;
    if (px[(y * 1080 + x) * 4 + 3] > 90) {
      on[(j + H) * (2 * W + 1) + i + W] = 1;
      const d = i * i + j * j * 1.7; if (d < mejor) { mejor = d; iObj = i; jObj = j; }
    }
  }
  return { on, W, H, iObj, jObj, correr: muestreaTexto("correr", serif(170, true), 720, 260, 1500, 5), lluvia: muestreaTexto("lluvia", serif(170, true), 720, 260, 1500, 9), arbol: neuronaReal() };
}

/** La pieza sola sigue decidiendo: el fiel va y viene por encima y por debajo del límite. */
const cicloFiel = (t: number) => { const p = 1.5, f = (t / p) % 1, q = Math.floor(t / p) % 2; const a = q ? fielDe(2) : fielDe(-1), b = q ? fielDe(-1) : fielDe(2); return lerp(a, b, Math.min(resorte(f * p, 1.7, .34), 1.25)); };
const hash = (i: number, j: number) => { const s = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453; return s - Math.floor(s); };

function campo(c: Ctx, d: Datos, t: number, Z: number, cx: number, cy: number, o: { todos?: number; vec?: number; radio?: number; ola?: number } = {}) {
  const todos = o.todos ?? 0, vec = o.vec ?? 1, radio = o.radio ?? 1e9, ola = o.ola ?? -1;
  const SX = 540, SY = 960, H = ALTO * Z;
  const i0 = Math.floor(cx - 590 / Z), i1 = Math.ceil(cx + 590 / Z), j0 = Math.floor((cy - 1010) / 1 / H + 0), j1 = 0;
  const jA = Math.floor((cy * Z - 1010) / H), jB = Math.ceil((cy * Z + 1010) / H);
  void j0; void j1;
  const esta = (i: number, j: number) => { const a = i + d.W, b = j + d.H; return a >= 0 && b >= 0 && a <= 2 * d.W && b <= 2 * d.H && d.on[b * (2 * d.W + 1) + a] === 1; };
  const brilla = (i: number, j: number) => {
    const h = hash(i, j), f = (t / (1.3 + 2.2 * hash(j, i)) + h) % 1;
    return f < .055;
  };
  const dist = (i: number, j: number) => Math.hypot(i - d.iObj, (j - d.jObj) * ALTO);
  const k0 = 1 - smooth(prog(Z, 13, 17)), k1 = smooth(prog(Z, 8.5, 13)) * (1 - smooth(prog(Z, 46, 58))), k2 = smooth(prog(Z, 34, 48)) * (1 - smooth(prog(Z, 190, 230))), k3 = smooth(prog(Z, 150, 200));
  if (k0 > 0) {
    c.save(); c.globalAlpha = k0;
    const a = Z * .92, b = H * .92;
    c.fillStyle = "#C2BFB6";
    const p = Math.max(Z * .34, 1.7);
    for (let j = jA; j <= jB; j++) for (let i = i0; i <= i1; i++) {
      if (esta(i, j)) continue;
      c.fillRect(SX + (i - cx) * Z - p / 2, SY + j * H - cy * Z - p / 2, p, p);
    }
    c.fillStyle = TINTA;
    for (let j = jA; j <= jB; j++) for (let i = i0; i <= i1; i++) {
      if (!esta(i, j) || brilla(i, j)) continue;
      c.fillRect(SX + (i - cx) * Z - a / 2, SY + j * H - cy * Z - b / 2, a, b);
    }
    c.fillStyle = ACENTO;
    for (let j = jA; j <= jB; j++) for (let i = i0; i <= i1; i++) {
      if (!esta(i, j) || !brilla(i, j)) continue;
      c.fillRect(SX + (i - cx) * Z - a / 2 - .4, SY + j * H - cy * Z - b / 2 - .4, a + .8, b + .8);
    }
    c.restore();
  }
  if (k1 > 0) {
    c.save();
    for (let j = jA; j <= jB; j++) for (let i = i0; i <= i1; i++) {
      const e = esta(i, j), X = SX + (i - cx) * Z, Y = SY + j * H - cy * Z;
      c.globalAlpha = k1 * lerp(e ? 1 : .22, 1, todos);
      c.fillStyle = TINTA;
      const r = Z * .16;
      c.fillRect(X - Z * .35 - r / 2, Y - Z * .48 - r / 2, r, r); c.fillRect(X - Z * .07 - r / 2, Y - Z * .48 - r / 2, r, r); c.fillRect(X + Z * .29 - r / 2, Y - Z * .48 - r / 2, r, r);
      const th = .3 * Math.sin(t * (1.2 + hash(i, j)) + hash(j, i) * 6);
      c.fillRect(X - Z * .32, Y + Z * .08 + th * Z * .1, Z * .64, Math.max(Z * .05, 1));
      c.fillStyle = e && brilla(i, j) ? ACENTO : TINTA;
      c.fillRect(X + th * Z * .5 - Z * .04, Y + Z * .46, Z * .08, Z * .08);
    }
    c.restore();
  }
  if (k2 > 0) {
    c.save();
    for (let j = jA; j <= jB; j++) for (let i = i0; i <= i1; i++) {
      const e = esta(i, j), X = SX + (i - cx) * Z, Y = SY + j * H - cy * Z;
      c.globalAlpha = k2 * lerp(e ? 1 : .22, 1, todos);
      c.fillStyle = TINTA; c.strokeStyle = TINTA; c.lineWidth = Math.max(Z * .012, 1); c.lineCap = "round";
      const th = TMAX * .7 * Math.sin(t * (1.2 + hash(i, j)) + hash(j, i) * 6);
      for (let k = 0; k < 3; k++) {
        const x = X + (XK[k] - 540) / 1000 * Z, y = Y + (YK - 960) / 1000 * Z;
        circulo(c, x, y, RK / 1000 * Z);
      }
      const px = (XP - 540) / 1000 * Z, py = (YP - 960) / 1000 * Z, br = BRAZO / 1000 * Z;
      linea(c, X + px - br * Math.cos(th), Y + py + br * Math.sin(th), X + px + br * Math.cos(th), Y + py - br * Math.sin(th));
      const n = RN / 1000 * Z;
      linea(c, X + px, Y + py, X + px + n * Math.sin(th), Y + py + n * Math.cos(th));
      if (e && brilla(i, j)) { c.fillStyle = ACENTO; circulo(c, X + px + n * Math.sin(th), Y + py + n * Math.cos(th), Z * .018); }
    }
    c.restore();
  }
  if (k3 > 0) {
    const s = Z / 1000;
    for (let j = jA; j <= jB; j++) for (let i = i0; i <= i1; i++) {
      const X = SX + (i - cx) * Z, Y = SY + j * H - cy * Z;
      const obj = i === d.iObj && j === d.jObj, e = esta(i, j);
      const dd = dist(i, j);
      const pop = obj ? 1 : smooth(clamp((radio - dd) / .8));
      const al = obj ? 1 : vec * pop * lerp(e ? 1 : .22, 1, todos);
      if (al <= .01) continue;
      const q = hash(i, j), w = hash(j, i);
      const th = obj ? cicloFiel(t) : TMAX * .7 * Math.sin(t * (1.2 + q) + w * 6);
      const v = obj ? [1, 1, -3] : [Math.round(q * 6) - 3, Math.round(w * 6) - 3, Math.round(((q + w) % 1) * 6) - 3];
      const r = obj ? 0 : Math.sin(t * (.8 + w)) * .35;
      c.save(); c.globalAlpha = k3 * al;
      c.translate(X, Y); const es = s * (obj ? 1 : lerp(.6, 1, pop)); c.scale(es, es); c.translate(-540, -960);
      maquina(c, [v[0] + r, v[1] - r, v[2] + r], th, 3, 4, { det: Z > 250, lim: 0 });
      c.restore();
    }
  }
  // La ola final: cada celda decide al pasar el frente.
  if (ola > 0 && Z < 14) {
    c.save(); c.fillStyle = ACENTO;
    const a = Z * .92, b = H * .92;
    for (let j = jA; j <= jB; j++) for (let i = i0; i <= i1; i++) {
      if (!esta(i, j)) continue;
      const X = SX + (i - cx) * Z, Y = SY + j * H - cy * Z;
      const dr = Math.hypot(X - 540, Y - 900) - ola;
      if (dr > 0 || dr < -150) continue;
      c.globalAlpha = 1 + dr / 150;
      c.fillRect(X - a / 2 - .4, Y - b / 2 - .4, a + .8, b + .8);
    }
    c.restore();
  }
}

// ---------- cuaderno y la línea ----------
const LINEA = "ax + by + cz > L", YL = 960;

function cuaderno(c: Ctx, sp: number, a: number) {
  if (a <= 0) return;
  c.save(); c.globalAlpha = a; c.strokeStyle = "#BDBAB1"; c.lineWidth = 3;
  for (let k = -9; k <= 9; k++) {
    const y = YL + (k + .5) * sp + 40;
    if (y < -20 || y > 1940) continue;
    linea(c, 0, y, 1080, y);
  }
  c.strokeStyle = ACENTO; c.lineWidth = 3.5; linea(c, 104, 0, 104, 1920);
  c.restore();
}

function ecuacion(c: Ctx, hasta: number, alfa = 1) {
  c.save(); c.beginPath(); c.rect(0, 0, hasta, 1920); c.clip();
  texto(c, LINEA, 128, YL + 40 + 75 - 20, { fuente: serif(150, true), color: TINTA, alin: "left", alfa });
  c.restore();
}

function pluma(c: Ctx, x: number, y: number, rot = 0, s = 1) {
  c.save(); c.translate(x, y); c.rotate(rot + .62); c.scale(s, s);
  c.fillStyle = TINTA; c.beginPath(); c.moveTo(0, 0); c.lineTo(-17, -64); c.quadraticCurveTo(-20, -86, -12, -102); c.lineTo(12, -102); c.quadraticCurveTo(20, -86, 17, -64); c.closePath(); c.fill();
  c.strokeStyle = PAPEL; c.lineWidth = 2.5; linea(c, 0, -12, 0, -58); c.fillStyle = PAPEL; circulo(c, 0, -62, 4.5);
  c.fillStyle = "#262625"; c.fillRect(-15, -420, 30, 322); c.fillStyle = "#6e6c66"; c.fillRect(-15, -110, 30, 9);
  c.restore();
}

function palomita(c: Ctx, x: number, y: number, k: number) {
  if (k <= 0) return;
  const P: [number, number][] = [[x - 70, y - 6], [x - 18, y + 52], [x + 96, y - 92]];
  const L0 = Math.hypot(52, 58), L1 = Math.hypot(114, 144), h = k * (L0 + L1);
  c.strokeStyle = ACENTO; c.lineWidth = 15; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath(); c.moveTo(P[0][0], P[0][1]);
  if (h <= L0) c.lineTo(lerp(P[0][0], P[1][0], h / L0), lerp(P[0][1], P[1][1], h / L0));
  else { c.lineTo(P[1][0], P[1][1]); c.lineTo(lerp(P[1][0], P[2][0], (h - L0) / L1), lerp(P[1][1], P[2][1], (h - L0) / L1)); }
  c.stroke();
}

/** El cuaderno nunca se queda quieto: la cámara se acerca despacio al renglón y respira. */
function deriva(c: Ctx, t: number, a: number, b: number, z = .07) {
  const q = 1 + z * prog(t, a, b);
  c.translate(540, YL + 40); c.scale(q, q); c.translate(-540 + 6 * vaiven(t, 3.7), -(YL + 40) + 11 * vaiven(t, 2.9, 1));
}

function apertura(c: Ctx, t: number, d: Datos) {
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  const Z0 = PASO, Z1 = 1000, u0 = .8;
  const lento = Z0 * 1.28 ** prog(t, 0, u0);
  const buceo = ease.inOutCubic(prog(t, u0 - .05, t0.pieza + .02));
  let Z = lento * (Z1 / lento) ** buceo;
  const rebota = t > t0.pieza ? Math.exp(-(t - t0.pieza) * 7) * Math.sin((t - t0.pieza) * 22) * .07 : 0;
  Z *= 1 + rebota;
  const abre = ease.outBack(prog(t, t0.rep - .08, t0.rep + .36));
  if (t >= t0.rep - .08) Z = lerp(Z, 330, abre);
  const objX = d.iObj, objY = d.jObj * ALTO;
  const c0x = 0, c0y = 60 / Z0;
  let cx = objX + (c0x - objX) * (Z0 / Z), cy = objY + (c0y - objY) * (Z0 / Z);
  if (t >= t0.pieza) { cx = objX; cy = objY; }
  const sp = lerp(1900, 150, ease.inCubic(prog(t, t0.cabe - .32, t0.cabe + .1)));
  const prensa = t >= t0.cabe - .32;
  if (!prensa) {
    const vec = 1 - smooth(prog(t, t0.yesa - .05, t0.yesa + .3));
    campo(c, d, t, Z, cx, cy, { todos: t >= t0.rep - .3 ? smooth(prog(t, t0.rep - .3, t0.rep)) : 0, vec: t >= t0.yesa - .05 ? vec : 1, ola: 40 + (t * 950) % 900 });
    return;
  }
  // Las dos rayas del cuaderno aprietan la máquina hasta que cabe en un renglón.
  const hueco = YL + 40, m = .33;
  deriva(c, t, t0.cabe, t0.imag);
  const sq = clamp((sp - 28) / (1240 * m), .02, 1);
  const revela = lerp(100, 1000, prog(t, t0.linea - .12, t0.secu + .12));
  const escr = t >= t0.linea - .12;
  c.save();
  if (escr) { c.beginPath(); c.rect(revela, 0, 1200, 1920); c.clip(); }
  c.translate(540, hueco); c.scale(m, m * sq); c.translate(-540, -940);
  maquina(c, [1, 1, -3], fielDe(-1) * .6, 2, 3, { det: true });
  c.restore();
  const pega = t > t0.cabe + .1 ? Math.exp(-(t - t0.cabe - .1) * 9) * Math.sin((t - t0.cabe - .1) * 40) * 10 : 0;
  c.strokeStyle = "#BDBAB1"; c.lineWidth = 3;
  const a = smooth(prog(t, t0.cabe - .32, t0.cabe - .1));
  c.save(); c.globalAlpha = a; c.strokeStyle = TINTA; c.lineWidth = lerp(9, 3, smooth(prog(t, t0.cabe + .1, t0.linea)));
  linea(c, 0, hueco - sp / 2 - pega, 1080, hueco - sp / 2 - pega); linea(c, 0, hueco + sp / 2 + pega, 1080, hueco + sp / 2 + pega); c.restore();
  cuaderno(c, 150, smooth(prog(t, t0.cabe + .05, t0.linea)));
  if (escr) {
    ecuacion(c, revela);
    if (t < t0.secu + .4) pluma(c, revela + 4, YL + 40 + 75 - 40 + Math.sin(t * 34) * 16, 0);
  }
  palomita(c, 800, 1290, ease.inOutCubic(prog(t, t0.secu + .42, t0.secu + .85)));
}

// ---------- la balanza decide ----------
function lluvia(c: Ctx, t: number, a: number) {
  if (a <= .01) return;
  const r = azar(77);
  c.save(); c.strokeStyle = "#6E6C66"; c.lineCap = "round";
  for (let i = 0; i < 150; i++) {
    const x0 = r() * 1300, y0 = r() * 2100, v = 1500 + r() * 900, l = 40 + r() * 70, g = 1.6 + r() * 2.2;
    const y = (y0 + t * v) % 2100 - 90, x = ((x0 - t * v * .16) % 1300 + 1300) % 1300 - 110;
    c.globalAlpha = a * (.2 + .32 * (g - 1.6) / 2.2); c.lineWidth = g;
    linea(c, x, y, x - l * .16, y + l);
  }
  c.restore();
}

const CAM: { t: number; z: number; x: number; y: number; d: number; f?: (x: number) => number }[] = [
  { t: t0.imag - .05, z: 1, x: 540, y: 960, d: .62, f: (x) => ease.outBack(x, 1.1) },
  { t: t0.buen - .25, z: 1.16, x: 372, y: 840, d: .9 },
  { t: t0.dorm - .25, z: 1.16, x: 500, y: 840, d: .8 },
  { t: t0.llov - .25, z: 1.13, x: 640, y: 830, d: .8 },
  { t: t0.tres - .12, z: 1, x: 540, y: 960, d: .3, f: ease.outCubic },
  { t: t0.pero + .2, z: 1.14, x: 540, y: 930, d: 1 },
  { t: t0.lluv, z: 1.2, x: 540, y: 960, d: 1.1 },
  { t: t0.cada - .2, z: 1, x: 540, y: 880, d: .7 },
  { t: t0.esa - .2, z: 1.1, x: 510, y: 780, d: 1.4 },
  { t: t0.luego - .1, z: 1, x: 540, y: 960, d: .8 },
  { t: t0.si + .42, z: 1.22, x: 540, y: 1175, d: .75 },
  { t: t0.sino, z: 1.26, x: 540, y: 1185, d: 1 },
];
const GOLPES: [number, number][] = [[A.a0[1], 3], [A.a1[1], 3], [A.a2[1], 22], [t0.mas, 12], [A.b0[1], 3], [A.b1[1], 3], [A.b2[1], 24], [A.c2[1], 20]];
function camaraM(t: number) {
  let z = .33, x = 540, y = 960;
  for (const k of CAM) { if (t <= k.t) break; const q = (k.f ?? ease.inOutCubic)(prog(t, k.t, k.t + k.d)); z = lerp(z, k.z, q); x = lerp(x, k.x, q); y = lerp(y, k.y, q); }
  let sx = 0, sy = 0;
  for (const [g, a] of GOLPES) if (t > g) { const e = a * Math.exp(-(t - g) * 7); sx += e * Math.sin((t - g) * 61) * .5; sy += e * Math.sin((t - g) * 47); }
  return { z: z * (1 + .007 * vaiven(t, 5.1)), x: x + 7 * vaiven(t, 6.7) + sx, y: y + 9 * vaiven(t, 4.3, 1) + sy, roll: .0035 * vaiven(t, 7.9, 2) };
}

function escenaBalanza(c: Ctx, t: number) {
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  const ll = smooth(prog(t, t0.llov - .1, t0.llov + .3)) * (1 - smooth(prog(t, t0.cada - .3, t0.cada + .2))) * 1
    + smooth(prog(t, t0.suma - .4, t0.suma)) * (1 - smooth(prog(t, A.sin, A.sin + .35))) + smooth(prog(t, A.vuelve, A.vuelve + .25));
  lluvia(c, t, ll);
  const cam = camaraM(t), th = fiel(t), v = valores(t);
  const sq = lerp(.3, 1, ease.outBack(prog(t, t0.imag - .05, t0.imag + .42)));
  c.save(); c.translate(540, 960); c.rotate(cam.roll); c.scale(cam.z, cam.z * sq); c.translate(-cam.x, -cam.y);
  const px = 6 * Math.sin(t * .8) + (cam.x - 540) * -.02, py = 5 * Math.cos(t * .63) + (cam.y - 960) * -.012;
  const lim = prog(t, t0.lim - .25, t0.lim + .1);
  maquina(c, v, th, px, py, { lim, guias: 1 - smooth(prog(t, t0.multi - .3, t0.multi)) + smooth(prog(t, t0.luego - .4, t0.luego - .1)) });

  // Etiquetas de cada perilla.
  const et = (s: string, i: number, ti: number) => {
    const a = smooth(prog(t, ti, ti + .22)) * (1 - smooth(prog(t, t0.pero - .15, t0.pero + .1)));
    texto(c, s, XK[i], 338 + (1 - ease.outCubic(prog(t, ti, ti + .34))) * 22, { fuente: serif(88, true), color: i === 2 && t > t0.tres ? ACENTO : TINTA, alfa: a });
  };
  et("clima", 0, t0.buen); et("sueño", 1, t0.dorm); et("lluvia", 2, t0.llov);

  // Quién pesa más.
  const zsue = smooth(prog(t, t0.sueno - .1, t0.sueno + .12)) * (1 - smooth(prog(t, t0.cada - .3, t0.cada - .1)));
  const zllu = smooth(prog(t, t0.lluv + .02, t0.lluv + .24)) * (1 - smooth(prog(t, t0.cada - .3, t0.cada - .1)));
  if (zllu > 0 || zsue > 0) {
    const pa = plato(1, th), pb = plato(2, th);
    texto(c, "sueño", pa.x, pa.y - 2 * RB - 34, { fuente: serif(92, true), color: TINTA, alfa: zsue });
    texto(c, "lluvia", pb.x - 10, pb.y + 136, { fuente: serif(92, true), color: ACENTO, alfa: zllu });
  }

  // Las bolas, con su número.
  const B = bolas(t);
  for (const b of B) dibujaBola(c, b);

  // Cada dato se multiplica por su peso.
  const ex = (s: string, i: number, ti: number) => {
    const a = smooth(prog(t, ti, ti + .2)) * (1 - smooth(prog(t, t0.luego - .3, t0.luego - .05)));
    texto(c, s, [190, 440, 816][i], 944 + (1 - ease.outBack(prog(t, ti, ti + .34))) * 18, { fuente: mono(84), color: i === 2 ? ACENTO : TINTA, alfa: a });
  };
  ex("1×1", 0, t0.multi); ex("1×1", 1, t0.multi + .2); ex("1×−3", 2, t0.multi + .42);

  // Anillo que señala las perillas al nombrarlas.
  const an = smooth(prog(t, t0.esa + .1, t0.esa + .5)) * (1 - smooth(prog(t, t0.luego - .3, t0.luego)));
  if (an > 0) for (let i = 0; i < 3; i++) {
    c.save(); c.globalAlpha = an * (.6 + .4 * vaiven(t, .9, i)); c.strokeStyle = ACENTO; c.lineWidth = 7;
    c.beginPath(); c.arc(XK[i] + px, YK + py, RK + 50, 0, 6.2832); c.stroke(); c.restore();
  }
  c.restore();

  // Lo que va en pantalla, fijo, por encima de la cámara.
  rotulo(c, t, t0.sales - .2, t0.buen - .3, "¿Salgo a correr?", 250, 124, TINTA, true);
  rotulo(c, t, t0.pero, t0.lluv - .1, "No todo pesa igual", 262, 108, TINTA);
  rotulo(c, t, t0.peso - .06, t0.luego - .12, "peso", 230, 190, ACENTO, true);
  // La cuenta se escribe sola, un sumando por bola.
  if (t > A.b0[1] - .06 && t < t0.si + .55) {
    const a = 1 - smooth(prog(t, t0.si + .3, t0.si + .55));
    const w = (s: string, n: number, ti: number, col = TINTA) => texto(c, s, 165 + n * 57.6, 262 + (1 - ease.outBack(prog(t, ti, ti + .22))) * 24, { fuente: mono(96), color: col, alin: "left", alfa: a * smooth(prog(t, ti, ti + .1)) });
    w("+1", 0, A.b0[1]); w("+1", 3, A.b1[1]); w("−3", 6, A.b2[1], ACENTO);
    w("= −1", 9, A.b2[1] + .3);
  }
  // La decisión: las dos zonas de la escala, a cada lado de la raya.
  const lit = (s: string, x: number, ini: number, col: string, fin = 1e9) => {
    if (t < ini) return;
    const q = ease.outBack(prog(t, ini, ini + .26), 2), g = smooth(prog(t, fin, fin + .3));
    c.save(); c.translate(x, 1558); c.scale(q, q);
    texto(c, s, 0, 0, { fuente: serif(132, true), color: GRIS, alfa: g * .75 });
    texto(c, s, 0, 0, { fuente: serif(132, true), color: col, alfa: 1 - g }); c.restore();
  };
  const aL = smooth(prog(t, t0.lim - .08, t0.lim + .12)) * (1 - smooth(prog(t, t0.sal - .42, t0.sal - .22)));
  texto(c, "límite", 812, 1556, { fuente: serif(112, true), color: ACENTO, alfa: aL });
  lit("sales", 800, t0.sal - .2, ACENTO, t0.sino + .1);
  lit("te quedas", 330, t0.queda - .14, TINTA);
}

// ---------- el corte: te señala a ti ----------
function negro(c: Ctx, t: number) {
  c.fillStyle = NOCHE; c.fillRect(0, 0, 1080, 1920);
  const a = t0.feli, k = ease.inOutCubic(prog(t, a + .02, a + 1)), CX = 540, CY = 850;
  const cam = camaraM(a - .02), th = fiel(a - .02);
  const pv = { x: 540 + (XP - cam.x) * cam.z, y: 960 + (YP - cam.y) * cam.z };
  const tp = { x: 540 + (XP + RN * Math.sin(th) - cam.x) * cam.z, y: 960 + (YP + RN * Math.cos(th) - cam.y) * cam.z };
  const bx = lerp(pv.x, CX, ease.outCubic(k)), by = lerp(pv.y, CY, ease.outCubic(k)), tx = lerp(tp.x, CX, k), ty = lerp(tp.y, CY, k);
  const r = lerp(14, 124, k ** 2.2);
  // Confeti de papel: se celebra algo que nadie había notado.
  const az = azar(41);
  for (let i = 0; i < 44; i++) {
    const x0 = az() * 1080, v = 150 + az() * 170, f = az() * 6.3, s = az(), tam = 13 + az() * 17, dl = az() * 1.5, col = az() < .3 ? ACENTO : LUZ;
    const e = t - a - .12 - dl; if (e <= 0) continue;
    const y = -30 + e * v + Math.sin(e * 2 + f) * 16, x = x0 + Math.sin(e * 1.6 + f) * 42;
    if (y > 1960) continue;
    c.save(); c.translate(x, y); c.rotate(f + e * (1 + s)); c.scale(1, Math.cos(e * (4 + s * 5) + f)); c.fillStyle = col; c.globalAlpha = .62; c.fillRect(-tam / 2, -tam / 3, tam, tam * .66); c.restore();
  }
  c.strokeStyle = LUZ; c.lineCap = "round";
  if (k < .995) { c.fillStyle = LUZ; const nx = ty - by, ny = bx - tx, L = Math.hypot(nx, ny) || 1, w = 10; c.beginPath(); c.moveTo(bx + nx / L * w, by + ny / L * w); c.lineTo(tx, ty); c.lineTo(bx - nx / L * w, by - ny / L * w); c.closePath(); c.fill(); }
  // Las tres entradas y la salida nacen alrededor de ti.
  const e = ease.outCubic(prog(t, t0.acabas - .1, t0.acabas + .55));
  if (e > 0) {
    const X = [230, 540, 850], Y0 = 590;
    for (let i = 0; i < 3; i++) {
      const dx = CX - X[i], dy = CY - Y0, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
      const fx = lerp(CX - ux * r, X[i], e), fy = lerp(CY - uy * r, Y0, e);
      c.lineWidth = 5; linea(c, fx, fy, CX - ux * (r + 6), CY - uy * (r + 6));
      if (e > .25) {
        const q = ((t * .9 + i * .31) % 1);
        c.fillStyle = LUZ; circulo(c, lerp(X[i], CX - ux * r, q), lerp(Y0, CY - uy * r, q), 9 * e);
        c.save(); c.translate(fx, fy); c.scale(e, e); perilla(c, 0, 0, 46, angPerilla([1, 1, -3][i]) + .08 * Math.sin(t * 1.7 + i), 1, 2, false); c.restore();
      }
    }
    flecha(c, CX, CY + r + 6, CX, lerp(CY + r + 6, 1120, e), LUZ, 6, 26);
  }
  if (k > .96) {
    const p = prog(t, a + .98, a + 1.7);
    if (p < 1) { c.save(); c.globalAlpha = (1 - p) * .9; c.strokeStyle = ACENTO; c.lineWidth = 7; c.beginPath(); c.arc(CX, CY, r + p * 300, 0, 6.2832); c.stroke(); c.restore(); }
  }
  bola(c, tx, ty, r * (1 + .03 * Math.sin((t - a) * 4)), ACENTO);
  if (k > .9) texto(c, "tú", CX, CY + 36, { fuente: serif(118, true), color: LUZ, alfa: smooth(prog(k, .9, 1)) });
  texto(c, "Felicidades.", CX, 450, { fuente: serif(150), color: LUZ, alfa: smooth(prog(t, a, a + .1)) });
  texto(c, "Acabas de ser", CX, 1252, { fuente: serif(92), color: LUZ, alfa: smooth(prog(t, t0.acabas, t0.acabas + .2)) });
  texto(c, "una neurona artificial", CX, 1372, { fuente: serif(102, true), color: "#E9896C", alfa: smooth(prog(t, t0.neu, t0.neu + .25)) });
}

// ---------- multiplicar, sumar, decidir ----------
function filas(c: Ctx, t: number) {
  const fila = (s: string, y: number, ti: number) => {
    const z = ease.outBack(prog(t, ti - .05, ti + .22));
    texto(c, s, 396, y + 42, { fuente: serif(136, true), color: TINTA, alin: "left", alfa: smooth(prog(t, ti - .05, ti + .1)) });
    return z;
  };
  const z1 = fila("multiplicar", 610, t0.mul), z2 = fila("sumar", 900, t0.sum), z3 = fila("decidir", 1190, t0.dec);
  // Perilla que gira y agranda la bola.
  if (z1 > 0) {
    const g = tramos(t, 0, [[t0.mul + .05, t0.mul + .55, -3, ease.inOutCubic]]);
    c.save(); c.translate(150, 610); c.scale(z1, z1); escalaPerilla(c, 0, 0, 66); perilla(c, 0, 0, 66, angPerilla(g), 3, 4); c.restore();
    const r = lerp(22, 54, ease.inOutCubic(prog(t, t0.mul + .05, t0.mul + .55)));
    bola(c, 306, 610 + 54 - r, r * z1);
  }
  // Dos bolas que se juntan.
  if (z2 > 0) {
    const k = ease.inOutCubic(prog(t, t0.sum + .05, t0.sum + .45));
    bola(c, lerp(120, 240, k), 900, 48 * z2); bola(c, lerp(350, 240, k), 900, 48 * z2);
    if (k >= 1) bola(c, 240, 900, 48 + 20 * ease.outBack(prog(t, t0.sum + .45, t0.sum + .7)));
  }
  // El fiel cruza la raya.
  if (z3 > 0) {
    const a = lerp(-.52, .46, ease.outBack(prog(t, t0.dec + .02, t0.dec + .4)));
    c.save(); c.translate(240, 1060); c.scale(z3, z3);
    c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 200, Math.PI / 2 - .7, Math.PI / 2 + .7); c.stroke();
    c.strokeStyle = ACENTO; c.lineWidth = 9; linea(c, 165 * Math.sin(.18), 165 * Math.cos(.18), 235 * Math.sin(.18), 235 * Math.cos(.18));
    c.fillStyle = TINTA; const x = 190 * Math.sin(a), y = 190 * Math.cos(a), n = Math.cos(a), m = -Math.sin(a);
    c.beginPath(); c.moveTo(-n * 9, -m * 9); c.lineTo(x, y); c.lineTo(n * 9, m * 9); c.closePath(); c.fill();
    c.fillStyle = ACENTO; circulo(c, x, y, 11); c.fillStyle = TINTA; circulo(c, 0, 0, 15); c.restore();
  }
}

function escenaLinea(c: Ctx, t: number) {
  // Nada más: las filas se aplastan en la misma línea del principio.
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  const sp = lerp(1900, 150, ease.inCubic(prog(t, t0.nada - .22, t0.nada + .14)));
  const sq = clamp((sp - 20) / 1000, .02, 1), a = 1 - smooth(prog(t, t0.nada, t0.nada + .15));
  if (a > 0) {
    c.save(); c.globalAlpha = a; c.translate(540, YL + 40); c.scale(1, sq); c.translate(-540, -900); c.translate(0, 8 * vaiven(t, 3.1)); filas(c, t); c.restore();
  }
  const pega = t > t0.nada + .14 ? Math.exp(-(t - t0.nada - .14) * 9) * Math.sin((t - t0.nada - .14) * 40) * 10 : 0;
  const k = smooth(prog(t, t0.nada - .22, t0.nada - .05));
  if (k > 0) {
    const hueco = YL + 40; c.save(); c.globalAlpha = k * (1 - smooth(prog(t, t0.nada + .4, t0.nada + .8))); c.strokeStyle = TINTA; c.lineWidth = 8;
    linea(c, 0, hueco - sp / 2 - pega, 1080, hueco - sp / 2 - pega); linea(c, 0, hueco + sp / 2 + pega, 1080, hueco + sp / 2 + pega); c.restore();
  }
  if (t > t0.nada + .1) {
    deriva(c, t, t0.nada + .1, t0.inv + .4, .05);
    cuaderno(c, 150, smooth(prog(t, t0.nada + .1, t0.nada + .5)));
    ecuacion(c, 1080, smooth(prog(t, t0.nada + .13, t0.nada + .26)));
  }
}

// ---------- 1943: papel, avión y pájaro ----------
function neuronaReal(): Seg[][] {
  const r = azar(1943), capas: Seg[][] = [[], [], [], [], [], []];
  const rama = (x: number, y: number, a: number, L: number, ini: number, n: number) => {
    const pasos = 3 + Math.floor(r() * 3);
    for (let k = 0; k < pasos; k++) {
      a += (r() - .5) * .62;
      const x2 = x + Math.cos(a) * L / pasos, y2 = y + Math.sin(a) * L / pasos;
      capas[Math.min(n, 5)].push([x, y, x2, y2, ini]); x = x2; y = y2; ini += .028;
    }
    if (n < 5) {
      const h = n < 2 ? 3 : 2;
      for (let k = 0; k < h; k++) rama(x, y, a + (k - (h - 1) / 2) * (.5 + r() * .36), L * (.68 + r() * .14), ini, n + 1);
    }
  };
  for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * .56 + (r() - .5) * .2; rama(Math.cos(a) * 34, Math.sin(a) * 34, a, 118 + r() * 42, 0, 0); }
  rama(6, 34, 1.42, 260, .06, 3);
  return capas;
}

function dibujaNeurona(c: Ctx, d: Datos, x: number, y: number, k: number, s = 1) {
  if (k <= 0) return;
  c.save(); c.translate(x, y); c.scale(s, s); c.strokeStyle = TINTA; c.lineCap = "round";
  d.arbol.forEach((cap, n) => {
    c.lineWidth = [9, 6, 4.2, 3, 2.2, 1.6][n]; c.beginPath();
    const h = k * 1.02;
    for (const [a, b, e, f, ini] of cap) {
      if (ini > h) continue;
      const q = clamp((h - ini) / .03);
      c.moveTo(a, b); c.lineTo(lerp(a, e, q), lerp(b, f, q));
    }
    c.stroke();
  });
  c.fillStyle = TINTA; c.beginPath();
  for (let i = 0; i <= 9; i++) { const a = i / 9 * 6.2832, r = 46 * smooth(k * 4) * (1 + .22 * Math.sin(a * 3 + 1)); if (i) c.lineTo(Math.cos(a) * r, Math.sin(a) * r); else c.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  c.closePath(); c.fill();
  c.fillStyle = "#6e6c66"; circulo(c, 3, -2, 15 * smooth(k * 4));
  c.restore();
}

function pajaro(c: Ctx, x: number, y: number, s: number, fase: number, rot = 0) {
  const f = Math.sin(fase), g = Math.cos(fase);
  const ala = (esc: number, dx: number, tono: string) => {
    const ty = (-190 * f - 16) * esc, tx = (-120 + 52 * g) * esc + dx;
    c.fillStyle = tono; c.beginPath(); c.moveTo(52 + dx, -18);
    c.quadraticCurveTo(lerp(40, tx, .35) + dx * .2, ty * .86 - 6, tx, ty);
    c.quadraticCurveTo(tx + 10, ty * .36, -60 + dx, -2);
    c.closePath(); c.fill();
  };
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  ala(.72, 26, "#3a3a38");
  c.fillStyle = TINTA; c.beginPath(); c.moveTo(172, -8); c.lineTo(134, -22); c.quadraticCurveTo(112, -40, 76, -32); c.quadraticCurveTo(14, -30, -62, -10);
  c.lineTo(-196, -26 - 10 * g); c.lineTo(-170, 2); c.lineTo(-204, 24 + 10 * g); c.lineTo(-62, 10); c.quadraticCurveTo(20, 32, 84, 16); c.quadraticCurveTo(116, 8, 172, -8); c.fill();
  c.fillStyle = PAPEL; circulo(c, 116, -19, 4.6);
  ala(1, 0, TINTA);
  c.restore();
}

// El avión: la hoja se dobla de verdad, con sus caras y sombras.
type V3 = [number, number, number];
const HOJA: Record<string, [V3, V3, V3, V3]> = (() => {
  const P: Record<string, [V3, V3, V3, V3]> = {};
  const dup = (n: string, a: [number, number], b: [number, number], c: [number, number], d: V3) => {
    P[n + "L"] = [[a[0], a[1], 0], [b[0], b[1], 0], [c[0], c[1], 0], d];
    P[n + "R"] = [[-a[0], a[1], 0], [-b[0], b[1], 0], [-c[0], c[1], 0], [-d[0], d[1], d[2]]];
  };
  P.N = [[0, 1.4, 0], [0, 1.4, 0], [0, 1.4, 0], [0, 1.42, 0]];
  P.D = [[0, -1.4, 0], [0, -1.4, 0], [0, -1.4, 0], [0, -1.26, -.46]];
  dup("T", [-1, 1.4], [0, .4], [0, .4], [-.02, .4, 0]);
  dup("A", [-1, .4], [-1, .4], [0, -.014], [-.05, -.02, 0]);
  dup("B", [-1, -1.014], [-1, -1.014], [-1, -1.014], [-1.02, -1.02, .16]);
  dup("C", [-1, -1.4], [-1, -1.4], [-1, -1.4], [-.98, -1.34, .16]);
  dup("Q", [-.34, -1.4], [-.34, -1.4], [-.34, -1.4], [-.03, -1.3, 0]);
  return P;
})();
const CARAS: [string, string, string, number][] = [
  ["N", "BL", "QL", 0], ["BL", "CL", "QL", 0], ["N", "QL", "D", 0], ["N", "BR", "QR", 0], ["BR", "CR", "QR", 0], ["N", "QR", "D", 0],
  ["N", "AL", "BL", .01], ["N", "AR", "BR", .01], ["N", "TL", "AL", .02], ["N", "TR", "AR", .02],
];

function hojaDoblada(c: Ctx, X: number, Y: number, U: number, plg: number, tilt: number, gira: number, ladeo: number, alfa = 1) {
  const ks = [ease.inOutCubic(clamp(plg)), ease.inOutCubic(clamp(plg - 1)), ease.inOutCubic(clamp(plg - 2))];
  const pos = (n: string): V3 => {
    const q = HOJA[n]; const m = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k) + Math.sin(k * Math.PI) * .22 * (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) > .05 ? 1 : 0)];
    let p = m(q[0], q[1], ks[0]); p = m(p, q[2], ks[1]); p = m(p, q[3], ks[2]); return p;
  };
  const rot = (p: V3): V3 => {
    const [x0, y0, z0] = p;
    const cl = Math.cos(ladeo), sl = Math.sin(ladeo); const x1 = x0 * cl + z0 * sl, z1 = -x0 * sl + z0 * cl;
    const ct = Math.cos(tilt), st = Math.sin(tilt); const y2 = y0 * ct - z1 * st, z2 = y0 * st + z1 * ct;
    const cg = Math.cos(gira), sg = Math.sin(gira);
    return [x1 * cg - y2 * sg, x1 * sg + y2 * cg, z2];
  };
  const C = CARAS.map(([a, b, d, cap]) => {
    const A = rot(pos(a)), B = rot(pos(b)), D = rot(pos(d));
    const ux = B[0] - A[0], uy = B[1] - A[1], uz = B[2] - A[2], vx = D[0] - A[0], vy = D[1] - A[1], vz = D[2] - A[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, L = Math.hypot(nx, ny, nz) || 1;
    return { A, B, D, luz: Math.abs(nz / L) * .72 + Math.max((nx - ny) / L, 0) * .22, z: (A[2] + B[2] + D[2]) / 3 + cap };
  }).sort((a, b) => a.z - b.z);
  c.save(); c.globalAlpha = alfa; c.lineJoin = "round"; c.lineWidth = 2.4;
  const pr = (p: V3) => { const q = 1 / (1 - p[2] / 7); return [X + p[0] * U * q, Y - p[1] * U * q]; };
  for (const f of C) {
    const a = pr(f.A), b = pr(f.B), e = pr(f.D), v = Math.round(lerp(150, 252, clamp(f.luz + .1)));
    c.fillStyle = `rgb(${v},${v - 2},${v - 8})`; c.strokeStyle = "#3b3a37";
    c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(e[0], e[1]); c.closePath(); c.fill(); c.stroke();
  }
  c.restore();
}

function escenaPapel(c: Ctx, t: number, d: Datos) {
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  const zc = 1 + .055 * prog(t, t0.inv + .4, t0.pajaro);
  c.save(); c.translate(540, 900); c.scale(zc, zc); c.rotate(.012 * vaiven(t, 4.3)); c.translate(-540 + 10 * vaiven(t, 5.3), -900 + 14 * vaiven(t, 3.9, 1));
  const ks = ease.inOutCubic(prog(t, t0.inv - .08, t0.inv + .7));
  const W = 1080 / 2, H = 960, w = lerp(W + 20, 245, ks), h = lerp(H + 20, 343, ks), cy = lerp(960, 1190, ks), cx = 540;
  const pl = prog(t, t0.pero2 - .05, t0.parece + .45) * 3;
  const ng = ease.outCubic(prog(t, t0.insp - .1, t0.parece + .7));
  const retira = smooth(prog(t, t0.pajaro - .34, t0.pajaro - .02));
  // La neurona de verdad: dibujada a tinta, sin parecerse en nada a la pieza.
  if (t > t0.insp - .1) dibujaNeurona(c, d, 540, 668 + 8 * vaiven(t, 3.4), ng * (1 - retira), .76 + .04 * prog(t, t0.insp, t0.pajaro));
  rotulo(c, t, t0.verdad - .3, t0.pajaro - .3, "neurona de verdad", 196, 104, TINTA, true);

  if (pl <= 0) {
    // La hoja del cuaderno se aleja.
    const es = w / (W + 20);
    c.save();
    for (let i = 5; i > 0; i--) { c.fillStyle = `rgba(20,18,14,${.028 * ks})`; c.fillRect(cx - w - i * 3 + 8, cy - h - i * 3 + 12, 2 * w + i * 6, 2 * h + i * 6); }
    c.fillStyle = "#FBFAF6"; c.fillRect(cx - w, cy - h, 2 * w, 2 * h);
    c.beginPath(); c.rect(cx - w, cy - h, 2 * w, 2 * h); c.clip();
    c.translate(cx, cy); c.scale(es, es); c.translate(-540, -960 - 40 * ks);
    cuaderno(c, 150, 1); ecuacion(c, 1080); c.restore();
    const z = ease.outBack(prog(t, t0.mil - .05, t0.mil + .4), 1.4);
    const sale = 1 - smooth(prog(t, t0.insp - .25, t0.insp + .02));
    if (z > 0) {
      c.save(); c.translate(540, 500); c.scale(z, z);
      texto(c, "1943", 0, 0, { fuente: serif(310), color: TINTA, alfa: sale }); c.restore();
    }
    rotulo(c, t, t0.papel - .3, t0.insp - .25, "McCulloch y Pitts", 660, 88, "#55534E", true);
  } else {
    // La hoja se dobla y vuela. U=245 px por unidad de hoja.
    const lanz = prog(t, t0.avion - .3, t0.pajaro + 1.6);
    const gira = lerp(0, -1.5, ease.inOutCubic(prog(lanz, 0, .22)));
    const x = lerp(lerp(540, 340, ease.inOutCubic(prog(lanz, 0, .16))), 1460, ease.inOutSine(prog(lanz, .13, 1)) ** 1.25);
    const y0 = 1190 + (lanz > 0 ? -120 * ease.inOutCubic(prog(lanz, 0, .3)) : 0);
    const cae = ease.inCubic(prog(lanz, .62, 1)) * 760;
    const y = y0 + cae + 18 * Math.sin(t * 5.2) * prog(lanz, .1, .3);
    const tilt = lerp(0, -.92, ease.inOutCubic(prog(pl, 2, 3)));
    const U = lerp(245, 190, ease.inOutCubic(prog(lanz, 0, .25)));
    const ladeo = .16 * Math.sin(t * 3.4) * prog(lanz, 0, .2);
    hojaDoblada(c, x, y, U, pl, tilt, gira - cae * .0012, ladeo);
  }

  // El pájaro aletea y se va: lo único vivo del cuadro.
  if (t > t0.pajaro - .2) {
    const e = t - (t0.pajaro - .2), z = ease.outBack(prog(e, 0, .3));
    const x = 440 + e * 190 + e * e * 26, y = 560 - e * 150 + 22 * Math.sin(e * 12.6 + 1);
    pajaro(c, x, y, 1.5 * z, e * 12.6, -.12);
  }
  c.restore();
}

// ---------- la perilla gigante ----------
const ZG = 3.26;
const vGig = (t: number) => {
  const pasos = [0, .36, .72, 1.08].map((q) => t0.salen + q);
  const base = 2.3 + .28 * Math.sin((t - t0.ylos) * 1.7) + tramos(t, 0, [[t0.peri - .1, t0.peri + .5, -1.3, ease.outBack], [t0.habla, t0.habla + .55, 1.3, ease.outBack]]);
  const vals = [.75, -.9, -2.2, -3];
  let v = base;
  pasos.forEach((p, i) => { v = lerp(v, vals[i], ease.outBack(prog(t, p, p + .24), 2)); });
  return v;
};
const BARRA = (t: number) => {
  const pasos = [0, .36, .72, 1.08].map((q) => t0.salen + q), W = [800, 500, 280, 130, 44];
  let w = W[0];
  pasos.forEach((p, i) => { w = lerp(w, W[i + 1], ease.outCubic(prog(t, p, p + .2))); });
  return w;
};

function escenaPerilla(c: Ctx, t: number, d: Datos) {
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  const sube = t < t0.pesos ? resorte(t - (t0.ylos - .15), 1.7, .5) : 1;
  const y = lerp(2300, 1000, Math.min(sube, 1.04));
  const atras = ease.inOutCubic(prog(t, t0.una - .28, t0.una + .75));
  const Z = ZG * (.46 / ZG) ** atras;
  const qx = (540 - 830) * 0 + 830, qy = 480 + (960 - y) / ZG;
  const cx = lerp(540, qx, (.46 / Z - 1) / (.46 / ZG - 1) * 1), cy = lerp(960, qy, (.46 / Z - 1) / (.46 / ZG - 1));
  void d;
  const v = [1, 1, vGig(t)];
  const px = (7 * Math.sin(t * .9) + 16 * (Z / ZG)), py = 6 * Math.cos(t * .7) + 10 * (Z / ZG);
  const th = cicloFiel(t);
  c.save(); c.translate(540, 960); c.scale(Z, Z); c.translate(-cx, -cy);
  maquina(c, v, th, px / Math.max(Z, 1) * 1.2, py / Math.max(Z, 1) * 1.2, { repisa: smooth(prog(t, t0.una - .28, t0.una + .1)), guias: smooth(prog(t, t0.una - .28, t0.una + .1)), arco: smooth(prog(t, t0.una - .28, t0.una + .1)) });
  c.restore();
  // pesos = perillas
  rotulo(c, t, t0.pesos - .05, t0.habla + .55, "pesos", 330, 210, ACENTO, true);
  // Nadie los escribe a mano: una pluma lo intenta y se tacha.
  if (t > t0.nadie - .15 && t < t0.una - .1) {
    const s = 1 - smooth(prog(t, t0.salen - .3, t0.salen));
    const k = prog(t, t0.nadie, t0.mano - .05), hasta = lerp(390, 700, k);
    c.save(); c.beginPath(); c.rect(0, 0, hasta, 1920); c.clip();
    texto(c, "−3", 540, 440, { fuente: serif(260, true), color: TINTA, alfa: s }); c.restore();
    if (k < 1) pluma(c, hasta + 4, 420 + Math.sin(t * 30) * 34, 0, 1.1);
    const q = ease.outCubic(prog(t, t0.mano, t0.mano + .22));
    if (q > 0) { c.save(); c.globalAlpha = s; c.strokeStyle = ACENTO; c.lineWidth = 16; c.lineCap = "round"; linea(c, 330, 460, lerp(330, 760, q), lerp(460, 280, q)); c.restore(); }
  }
  // Salen del error: la barra de siempre empuja la perilla sola.
  const eA = smooth(prog(t, t0.salen - .24, t0.salen)) * (1 - smooth(prog(t, t0.una - .3, t0.una)));
  if (eA > 0) {
    c.save(); c.globalAlpha = eA; c.fillStyle = ACENTO; c.fillRect(140, 1420, BARRA(t), 26); c.restore();
    texto(c, "error", 540, 1560, { fuente: serif(140, true), color: ACENTO, alfa: eA });
  }
}

function particulas(c: Ctx, P: [number, number][], x: number, y: number, k: number, tx: number, ty: number, t: number) {
  if (k >= 1) return;
  c.fillStyle = TINTA;
  for (let i = 0; i < P.length; i++) {
    const h = hash(i, 3), q = ease.inCubic(clamp((k - h * .4) / .6));
    const a = x + P[i][0], b = y + P[i][1];
    const e = q * q;
    c.globalAlpha = 1 - e * .3;
    c.fillRect(lerp(a, tx, e) + Math.sin(i + t * 6) * q * 26, lerp(b, ty, e) + q * Math.cos(i * 2.3) * 40, 4.4, 4.4);
  }
  c.globalAlpha = 1;
}

function escenaSola(c: Ctx, t: number, d: Datos) {
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  // Sin cortes: Z viene de la perilla gigante y solo se abre al final.
  const empuja = (1 + .1 * prog(t, t0.una + .78, t0.ygpt)) * (1 + .3 * smooth(prog(t, t0.ygpt - .2, t0.solo + .1)));
  const Zb = 460 * empuja;
  const a = ease.inOutCubic(prog(t, t0.solo - .02, t0.much + 2.05));
  const Z = Math.max(Zb * (PASO / Zb) ** (a ** .82), PASO) * (1 - .012 * Math.max(t - (t0.much + 2.05), 0));
  const objX = d.iObj, objY = d.jObj * ALTO, c0y = 60 / PASO;
  const flota = 1 - smooth(prog(t, t0.solo, t0.solo + .5));
  const cx = objX * (1 - PASO / Z) + flota * .012 * vaiven(t, 3.1), cy = objY + (c0y - objY) * (PASO / Z) + flota * .016 * vaiven(t, 2.3, 1);
  const radio = t > t0.solo ? (t - t0.solo) ** 3 * 34 + (t - t0.solo) * 3 : -1;
  const ola = t > t0.much + 2.1 ? (t - t0.much - 2.1) * 1000 : -1;
  campo(c, d, t, Z, cx, cy, { radio, ola });
  // Palabras que la pieza nunca entendió: se le deshacen en un número.
  const y = 440;
  const en = (s: string, ini: number, fin: number, P: [number, number][], tx: number) => {
    if (t < ini || t > fin + .56) return;
    if (t < fin) { const q = ease.outBack(prog(t, ini, ini + .2)); texto(c, s, 540, y + 56, { fuente: serif(Math.round(170 * q), true), color: TINTA }); }
    else particulas(c, P.map(([a, b]) => [a + 540, b]) as [number, number][], 0, y, prog(t, fin, fin + .55), tx, 790, t);
  };
  en("correr", t0.nosabe + .35, t0.correr + .12, d.correr, 540 + (XK[0] - 540) * .46);
  en("lluvia", t0.lluvia, t0.lluviaF + .05, d.lluvia, 540 + (XK[2] - 540) * .46);
  const numero = (ti: number, x: number) => {
    const q = ease.outBack(prog(t, ti, ti + .26)) * (1 - smooth(prog(t, t0.ygpt + .55, t0.ygpt + .85)));
    if (q > 0) { const yb = 960 + (YSLOT - 960) * Z / 1000; bola(c, x * 1 + (540 - x) * (1 - Z / 460), yb, 40 * q); texto(c, "1", x + (540 - x) * (1 - Z / 460), yb + 18, { fuente: mono(50), color: LUZ, alfa: q }); }
  };
  rotulo(c, t, t0.ygpt + .16, t0.solo - .1, "ChatGPT", 320, 150, TINTA);
  rotulo(c, t, t0.ning - .05, t0.solo - .1, "ninguna otra pieza", 1570, 104, ACENTO, true);
  numero(t0.correr + .7, 540 + (XK[0] - 540) * .46);
  numero(t0.lluviaF + .55, 540 + (XK[2] - 540) * .46);
}

function dibuja(c: Ctx, t: number, d: Datos) {
  if (t < t0.imag - .05) apertura(c, t, d);
  else if (t < t0.feli) escenaBalanza(c, t);
  else if (t < t0.mul - .02) negro(c, t);
  else if (t < t0.inv - .08) escenaLinea(c, t);
  else if (t < t0.ylos + .3) {
    escenaPapel(c, t, d);
    if (t > t0.ylos - .15) escenaPerillaEncima(c, t, d);
  } else if (t < t0.una + .78) escenaPerilla(c, t, d);
  else escenaSola(c, t, d);
}

/** La perilla sube por delante mientras el avión cae. */
function escenaPerillaEncima(c: Ctx, t: number, _d: Datos) {
  const sube = resorte(t - (t0.ylos - .15), 1.7, .5), y = lerp(2300, 1000, Math.min(sube, 1.04));
  c.save(); c.translate(540, y); c.scale(ZG, ZG); c.translate(-830, -480);
  escalaPerilla(c, 830, 480, RK); perilla(c, 830, 480, RK, angPerilla(vGig(t)), 2, 2.5);
  c.restore();
}

export const Pieza: React.FC = () => <Lienzo dibuja={dibuja} preparar={prepara} />;
