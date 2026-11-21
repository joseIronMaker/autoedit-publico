// Capítulo 9. Una frase convertida en telar: las palabras son grandes, y de cada una salen hilos de verdad, con
// grosor, tensión y sonido, que buscan a las otras. El grosor del hilo ES cuánto le importa; una palabra mirada se
// mueve. Arranca con el objeto: un trofeo que no cabe en una maleta. Cambiar UNA palabra voltea todo el telar.
// Lo que pasa por un hilo vuelve: pedazos de papel recortado de cada palabra, tantos como le importó.
// Ningún grosor es un dato medido: es un dibujo de la idea, y por eso no lleva números.
import React from "react";
import { azar, caida, camara, clamp, curvas, ease, Fuente, lerp, mezclaVista, muestreaTexto, prog, resorte, smooth, texto, Vista } from "../../kit";
import { ACENTO, anillo, bola, bolaMundo, cue, GRIS, Lienzo, LUZ, mono, NOCHE, PAPEL, rotulo, serif, TINTA } from "../../marca";
import palabras from "./palabras.json";
import duracion from "./duracion.json";

export const DURACION = duracion.dur;
const T = cue(palabras);
type Ctx = CanvasRenderingContext2D;
type P2 = { x: number; y: number };

const iSeg = T("el trofeo no cabía en la maleta porque era muy chica").i;
const iUna = T("una palabra sola").i;
const t0 = {
  mal1: T("maleta").s, era1: T("era").s, gr1: T("grande").s,
  q1: T("qué era grande").s, gr2: T("grande", 12).s, el2: T("el trofeo claro").s, tro2: T("trofeo claro").s, clar: T("claro").s,
  aho: T("ahora").s, camb: T("cambia").s, pal: T("palabra").s, palF: T("palabra").e,
  lee: palabras[iSeg].s, chica: T("chica").s, chicaF: T("chica").e,
  q2: T("qué era chica").s, lam: T("la maleta tú").s, mal2: T("maleta tú").s,
  tu: T("tú lo").s, res: T("resolviste").s, sin: T("sin pensar").s, pens: T("pensar").s, amaq: T("a una máquina").s, costo: T("costó").s, deca: T("décadas").s, decaF: T("décadas").e,
  porq: T("porque leía").s, leia: T("leía").s, por2: T("por palabra").s, cuando: T("y para cuando").s, fin: T("final").s, ya: T("ya se le").s, prin: T("principio").s, prinF: T("principio").e,
  truco: T("truco").s, simple: T("simple").s, aten: T("atención cada").s, cada: T("cada palabra mira").s, mira: T("mira a todas").s, todas: T("todas").s, dem: T("demás y").s, preg: T("pregunta").s,
  quien: T("quién de ustedes").s, imp: T("importa").s, impF: T("importa").e,
  lap: T("la palabra chica busca").s, chi: T("chica busca").s, busca: T("busca").s,
  mt: T("mira a trofeo").s, tro: T("trofeo poco").s, poco: T("poco").s, mm: T("mira a maleta").s, mal: T("maleta mucho").s, mucho: T("mucho").s,
  yse: T("y se queda").s, mez: T("mezcla").s, ped: T("un pedazo").s, una: T("cada una según").s, seg: T("según cuánto").s, imp2: T("importó").s, imp2F: T("importó").e,
  pore: T("por eso banco").s, ban: T("banco no es").s, mismo: T("mismo punto").s, pun: T("punto").s, me: T("me senté").s, sen: T("senté").s, ban2: T("banco que").s, elb: T("el banco me cobró").s, cob: T("cobró").s,
  msus: T("mira a sus").s, vec: T("vecinas").s, mue: T("se mueve").s, mueF: T("se mueve").e,
  nadie: T("nadie programó").s, prog: T("programó").s, mir: T("miradas").s, salen: T("salen").s, err: T("error").s, como: T("como todo").s, dem2: T("demás en").s,
  en17: T("en dos mil").s, die: T("diecisiete").s, inv: T("investigadores").s, goo: T("google").s, pub: T("publicaron").s, art: T("artículo con").s, tit: T("título").s, ins: T("insolente").s,
  la: T("la atención es todo").s, ate2: T("atención es").s, es: T("es todo").s, todo: T("todo lo que").s, lo: T("lo que necesitas").s, nec: T("necesitas").s, necF: T("necesitas").e,
  ten: T("tenían razón").s, raz: T("razón").s, de: T("de ese artículo").s, sale: T("sale la t").s, la2: T("la t de").s, tt: T("t de chatgpt").s, gpt: T("chatgpt").s, gptF: T("chatgpt").e,
  una2: palabras[iUna].s, pa: T("palabra sola").s, sola: T("sola").s, casi: T("casi no").s, sig0: T("significa nada").s, nada: T("nada").s, nadaF: T("nada").e,
  sig: T("significa según").s, seg2: T("según a").s, quien2: T("quién mira").s, mira2: T("mira", iUna).s, miraF: T("mira", iUna).e,
};

// ---------- utilidades ----------
const TAU = 6.2832;
const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * TAU + f);
const hash = (i: number, j = 0) => { const s = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453; return s - Math.floor(s); };
function tramos(t: number, v0: number, S: [number, number, number, ((x: number) => number)?][]) {
  let v = v0;
  for (const [a, b, x, f] of S) { if (t <= a) break; v = lerp(v, x, (f ?? smooth)(prog(t, a, b))); }
  return v;
}
function linea(c: Ctx, ax: number, ay: number, bx: number, by: number) { c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); }
function circulo(c: Ctx, x: number, y: number, r: number) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
/** Un golpe que se apaga: lo que hace una cuerda o un objeto que recibió un tirón. */
const pulso = (age: number, w = 17, dec = 4) => (age > 0 ? Math.exp(-age * dec) * Math.sin(age * w) : 0);
const pl = (t: number, te: number, A: number, dec = 3.2) => (t > te ? A * Math.exp(-(t - te) * dec) : 0);
function hex(a: string) { return [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)]; }
function tinta(a: string, b: string, k: number) { const A = hex(a), B = hex(b), q = clamp(k); return `rgb(${Math.round(lerp(A[0], B[0], q))},${Math.round(lerp(A[1], B[1], q))},${Math.round(lerp(A[2], B[2], q))})`; }
function camaraPlana(c: Ctx, z: number, x: number, y: number, r = 0) { c.translate(540, 960); c.rotate(r); c.scale(z, z); c.translate(-x, -y); }
const sacudida = (t: number, G: [number, number][]) => {
  let sx = 0, sy = 0;
  for (const [g, a] of G) if (t > g) { const e = a * Math.exp(-(t - g) * 8); sx += e * Math.sin((t - g) * 61) * .55; sy += e * Math.sin((t - g) * 47); }
  return { sx, sy };
};

/** Letra por letra, centrado en x: cada letra recibe su propio [dx, dy, giro]. */
function letras(c: Ctx, s: string, x: number, y: number, fuente: string, color: string, alfa: number, f: (i: number) => [number, number, number]) {
  if (alfa <= .003) return;
  c.save(); c.font = fuente; c.fillStyle = color; c.globalAlpha = alfa; c.textAlign = "left"; c.textBaseline = "alphabetic";
  const W = c.measureText(s).width;
  for (let i = 0; i < s.length; i++) {
    const a = c.measureText(s.slice(0, i)).width, b = c.measureText(s.slice(0, i + 1)).width, w = b - a, [dx, dy, r] = f(i);
    c.save(); c.translate(x - W / 2 + a + w / 2 + dx, y + dy); c.rotate(r); c.fillText(s[i], -w / 2, 0); c.restore();
  }
  c.restore();
}

/** Astillas que saltan de un choque: balísticas, misma física para todas. */
function astillas(c: Ctx, x: number, y: number, age: number, seed: number, n: number, v = 620, ancho = 300, col = TINTA) {
  if (age <= 0 || age > 1) return;
  const r = azar(seed);
  c.save(); c.fillStyle = col;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI * (.08 + r() * .84), s = v * (.4 + r() * .8), l = 4 + r() * 9, x0 = x + (r() - .5) * ancho, f = r() * 6;
    const px = x0 + Math.cos(a) * s * age, py = y + Math.sin(a) * s * age + 1500 * age * age;
    c.globalAlpha = (1 - age) ** .7 * .9;
    c.save(); c.translate(px, py); c.rotate(f + age * 9); c.fillRect(-l / 2, -l / 4, l, l / 2); c.restore();
  }
  c.restore();
}

/** Pelusas de hilo que flotan muy tenues detrás: el papel nunca está vacío del todo. */
function pelusas(c: Ctx, t: number, alfa: number, col = TINTA) {
  if (alfa <= .01) return;
  const r = azar(909);
  c.save(); c.strokeStyle = col; c.lineCap = "round"; c.lineWidth = 2;
  for (let i = 0; i < 34; i++) {
    const x0 = r() * 1200, y0 = r() * 2100, v = 7 + r() * 13, f = r() * 6, L = 16 + r() * 34, q = r();
    const y = ((y0 - t * v) % 2100 + 2100) % 2100 - 90, x = (x0 + 16 * Math.sin(t * .32 + f)) % 1200 - 60;
    c.globalAlpha = alfa * (.25 + q * .6);
    const a = f + t * (.2 + q * .3);
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a) * L * .5 + 7 * Math.sin(a * 2), y + Math.sin(a) * L * .5, x + Math.cos(a + .6) * L, y + Math.sin(a + .6) * L); c.stroke();
  }
  c.restore();
}

// ---------- el hilo ----------
type OH = { col?: string; alfa?: number; sag?: number; amp?: number; fase?: number; modo?: number; k?: number; seed?: number; soga?: boolean; sombra?: boolean; nudos?: boolean; punta?: number };

/** Un hilo tenso entre dos puntos. Cuando vibra se ve como una cuerda de verdad: un huso borroso que se va cerrando. */
function hilo(c: Ctx, ax: number, ay: number, bx: number, by: number, g: number, t: number, o: OH = {}) {
  const alfa = o.alfa ?? 1, k = clamp(o.k ?? 1);
  if (alfa <= .01 || k <= 0 || g <= .05) return;
  const col = o.col ?? TINTA, sag = o.sag ?? 0, amp = o.amp ?? 0, seed = o.seed ?? 0, modo = o.modo ?? 1;
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const N = Math.round(clamp(L / 24, 6, 44)), b = Math.floor(t * 10), fase = o.fase ?? (seed * 2.3 + t * 62);
  const P = (s: number, i: number, f: number): [number, number] => {
    const j = (hash(seed + i, b) - .5) * 2.2 * Math.sin(Math.PI * s);
    const v = amp * Math.sin(Math.PI * modo * s) * f + j;
    return [ax + dx * s + nx * v, ay + dy * s + ny * v + sag * 4 * s * (1 - s)];
  };
  const traza = (f: number, ox: number, oy: number) => {
    c.beginPath();
    for (let i = 0; i <= N; i++) {
      const s = Math.min(i / N, k), q = P(s, i, f);
      if (i === 0) c.moveTo(q[0] + ox, q[1] + oy); else c.lineTo(q[0] + ox, q[1] + oy);
      if (s >= k) break;
    }
    c.stroke();
  };
  c.save(); c.lineCap = "round"; c.lineJoin = "round";
  if (o.sombra) { c.strokeStyle = "rgba(20,18,14,.13)"; c.lineWidth = g + 1.5; traza(Math.cos(fase), 8, 14); }
  c.strokeStyle = col;
  if (amp > 1.2) {
    c.lineWidth = Math.max(g * .6, 1.6); c.globalAlpha = alfa * .26;
    for (let j = 1; j < 6; j++) traza(Math.cos(fase + j * TAU / 6), 0, 0);
  }
  c.globalAlpha = alfa; c.lineWidth = g; traza(Math.cos(fase), 0, 0);
  // Una soga gruesa se ve torcida: hebras en diagonal sobre el cuerpo.
  if (o.soga && g >= 8) {
    const f = Math.cos(fase), paso = g * 1.05 / L, ux = dx / L, uy = dy / L;
    c.strokeStyle = col === TINTA ? "rgba(244,242,236,.2)" : "rgba(255,226,206,.34)"; c.lineWidth = Math.max(g * .13, 1.2);
    for (let s = paso; s < k - paso * .5; s += paso) {
      const q = P(s, Math.round(s * N), f), w = g * .42;
      linea(c, q[0] - nx * w - ux * w * .9, q[1] - ny * w - uy * w * .9, q[0] + nx * w + ux * w * .9, q[1] + ny * w + uy * w * .9);
    }
  }
  const fin = P(k, N, Math.cos(fase));
  if (o.nudos !== false) { c.fillStyle = col; circulo(c, ax, ay, g * .62 + 3); if (k >= 1) circulo(c, fin[0], fin[1], g * .62 + 3); }
  c.restore();
  if (k < 1 && (o.punta ?? 0) > 0) { c.save(); c.globalAlpha = alfa; bola(c, fin[0], fin[1], o.punta!, col === TINTA ? TINTA : col); c.restore(); }
}

// ---------- la frase ----------
type Pal = { s: string; px: number; it: boolean; x: number; y: number; w: number };
type Datos = { P: Pal[]; polvo: [number, number][][]; aten: [number, number][]; mapa: { x: number; y: number; a: number; s: number }[]; puntos: { x: number; y: number; r: number }[] };
const BIG = 300, SM = 118, MIZ = 92, MDER = 972;
const iEL = 0, iTRO = 1, iNO = 2, iCAB = 3, iEN = 4, iLA = 5, iMAL = 6, iPOR = 7, iERA = 8, iMUY = 9, iCHI = 10, iGRA = 11;
const Y = [372, 524, 858, 1006, 1402];

function prepara(): Datos {
  const g = document.createElement("canvas").getContext("2d")!;
  const W = (s: string, px: number, it = false) => { g.font = serif(px, it); return g.measureText(s).width; };
  const P: Pal[] = [];
  const pon = (s: string, px: number, it: boolean, x: number, y: number) => { const w = W(s, px, it); P.push({ s, px, it, x, y, w }); return x + w; };
  const fila = (ss: string[], y: number) => {                         // renglón de palabras chicas, alineado a la derecha
    const esp = SM * .26, tot = ss.reduce((a, s) => a + W(s, SM), 0) + esp * (ss.length - 1);
    let x = MDER - tot; for (const s of ss) x = pon(s, SM, false, x, y) + esp;
  };
  const xe = pon("El", SM, false, MIZ, Y[0]) + 26;
  pon("trofeo", BIG, false, xe, Y[0]);
  fila(["no", "cabía", "en", "la"], Y[1]);
  pon("maleta", BIG, false, MDER - W("maleta", BIG), Y[2]);
  fila(["porque", "era", "muy"], Y[3]);
  pon("chica", BIG, true, MIZ, Y[4]);
  pon("grande", BIG, true, MIZ, Y[4]);
  const polvo = P.map((p, i) => muestreaTexto(p.s, serif(p.px, p.it), Math.ceil(p.w + 40), Math.ceil(p.px * 1.4), Math.round(p.w * p.px / 900), 31 + i));
  const r = azar(88);
  const mapa: Datos["mapa"] = [], puntos: Datos["puntos"] = [];
  const nube = (cx: number, cy: number, sx: number, n: number) => { for (let i = 0; i < n; i++) { const x = cx + (r() + r() - 1) * sx, y = cy + (r() + r() - 1) * sx; mapa.push({ x, y, a: .14 + r() * .1, s: .95 + r() * .35 }); puntos.push({ x, y, r: .05 + r() * .06 }); } };
  nube(SILLA[0], SILLA[1], 1.9, 42); nube(DINERO[0], DINERO[1], 1.9, 42); nube(-5, -3, 2.4, 16); nube(5, 3, 2.4, 16); nube(-5, 5.5, 2, 12); nube(5, -6, 2, 12);
  return { P, polvo, aten: muestreaTexto("atención", serif(270, true), 1040, 420, 2400, 7), mapa, puntos };
}

function pos(d: Datos, i: number, t: number) {
  const p = d.P[i]; let x = p.x + 3.6 * vaiven(t, 3.1 + i * .17, i), y = p.y + 4.6 * vaiven(t, 2.7 + i * .13, i * 2), r = 0;
  for (const [j, ti, ax, ay] of TIRONES) {
    if ((j !== i && !(j === iCHI && i === iGRA)) || t < ti) continue;
    const e = pulso(t - ti, 16, 3.6); x += ax * e; y += ay * e; r += (ax + ay) * .00042 * e;
  }
  return { x, y, r };
}
function ancla(d: Datos, i: number, u: number, arriba: boolean, t: number): P2 {
  const p = d.P[i], q = pos(d, i, t);
  return { x: q.x + p.w * u, y: q.y + (arriba ? -p.px * .6 : p.px * .07) };
}
const centro = (d: Datos, i: number, t: number, u = .5): P2 => { const p = d.P[i], q = pos(d, i, t); return { x: q.x + p.w * u, y: q.y - p.px * .24 }; };

/** Texto con halo de papel: los hilos pasan POR DETRÁS y nunca le ensucian la letra a la palabra. */
function conHalo(c: Ctx, s: string, x: number, y: number, fuente: string, color: string, a: number, halo: number, fondo = PAPEL) {
  if (a <= .003) return;
  c.save(); c.font = fuente; c.textAlign = "center"; c.textBaseline = "alphabetic"; c.globalAlpha = a; c.lineJoin = "round";
  if (halo > 0) { c.strokeStyle = fondo; c.lineWidth = halo; c.strokeText(s, x, y); }
  c.fillStyle = color; c.fillText(s, x, y); c.restore();
}
function palabra(c: Ctx, d: Datos, i: number, t: number, o: { alfa?: number; col?: string; esc?: number; dy?: number } = {}) {
  const p = d.P[i], q = pos(d, i, t), a = o.alfa ?? 1, e = o.esc ?? 1;
  if (a <= .003) return;
  c.save(); c.translate(q.x + p.w / 2, q.y + (o.dy ?? 0) - p.px * .24); c.rotate(q.r); c.scale(e, e);
  conHalo(c, p.s, 0, p.px * .24, serif(p.px, p.it), o.col ?? TINTA, a, p.px === BIG ? 20 : 14); c.restore();
}

// ---------- 1. el trofeo que no cabe ----------
const H = [.93, t0.mal1 + .16, t0.era1 + .02, t0.gr1 - .02];
const YMAL = 1570, HMAL = 372, WMAL = 580, M0 = t0.gr1 + .42, M1 = t0.q1 - .06, GR = 3000, S0 = .9, S1 = 1.26;
const ROT = [-.2, -.05, .14, -.09, .04, 0];

function syMal(t: number) {
  let e = 0;
  H.forEach((h, k) => { if (t > h) e += [.17, .2, .22, .1][k] * Math.exp(-(t - h) * 8) * Math.cos((t - h) * 26); });
  return tramos(t, 1, [[H[0], H[0] + .1, .97], [H[1], H[1] + .1, .92], [H[2], H[2] + .1, .85], [H[3] - .02, H[3] + .14, .44, ease.outCubic]]) - e;
}
const borde = (t: number) => YMAL - HMAL * syMal(t);
function copaEn(t: number) {
  const b = borde(t);
  if (t < H[0]) { const q = prog(t, 0, H[0]); return { y: 810 + 170 * t + 266 * t * t + (b - 1198) * q ** 6, r: lerp(ROT[0], ROT[1], q ** 2) }; }
  for (let k = 0; k < 3; k++) if (t < H[k + 1]) {
    const D = H[k + 1] - H[k], u = t - H[k];
    return { y: b - GR / 2 * u * (D - u), r: lerp(ROT[k + 1], ROT[k + 2], smooth(u / D)) };
  }
  return { y: b, r: lerp(ROT[4], ROT[5], smooth(prog(t, H[3], H[3] + .25))) };
}

function copa(c: Ctx, x: number, y: number, sx: number, sy: number, rot: number) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(sx, sy);
  const G = c.createLinearGradient(-310, -600, 310, -400);
  [["#2a2a29", 0], ["#101010", .34], ["#070707", .62], ["#1c1c1b", .86], ["#3f3e3a", 1]].forEach(([k, s]) => G.addColorStop(s as number, k as string));
  c.lineCap = "round"; c.lineJoin = "round";
  for (const k of [-1, 1]) {
    c.strokeStyle = "#111110"; c.lineWidth = 40; c.beginPath(); c.moveTo(k * 276, -768); c.bezierCurveTo(k * 500, -790, k * 490, -500, k * 150, -462); c.stroke();
    c.strokeStyle = "rgba(214,212,204,.34)"; c.lineWidth = 5; c.beginPath(); c.moveTo(k * 296, -776); c.bezierCurveTo(k * 478, -784, k * 470, -530, k * 190, -484); c.stroke();
  }
  c.fillStyle = G; c.beginPath(); c.moveTo(-300, -826);
  c.bezierCurveTo(-300, -570, -196, -410, -46, -372); c.bezierCurveTo(-26, -320, -26, -250, -44, -196); c.lineTo(44, -196); c.bezierCurveTo(26, -250, 26, -320, 46, -372);
  c.bezierCurveTo(196, -410, 300, -570, 300, -826); c.closePath(); c.fill();
  // Brillo fijo arriba a la izquierda: fuera de donde va la palabra.
  c.fillStyle = "rgba(233,230,221,.55)"; c.beginPath(); c.moveTo(-268, -786); c.bezierCurveTo(-262, -730, -256, -700, -238, -664); c.bezierCurveTo(-246, -710, -246, -750, -240, -786); c.closePath(); c.fill();
  c.fillStyle = "rgba(233,230,221,.3)"; c.beginPath(); c.moveTo(-220, -786); c.bezierCurveTo(-218, -750, -216, -736, -208, -712); c.bezierCurveTo(-212, -740, -210, -764, -206, -786); c.closePath(); c.fill();
  // Boca de la copa.
  c.fillStyle = "#44433f"; c.beginPath(); c.ellipse(0, -826, 302, 38, 0, 0, TAU); c.fill();
  c.fillStyle = "#040404"; c.beginPath(); c.ellipse(0, -824, 280, 26, 0, 0, TAU); c.fill();
  // Peana de tres pisos: más ancha que la boca de la maleta.
  const G2 = c.createLinearGradient(-340, 0, 340, 0);
  [["#34332f", 0], ["#0f0f0f", .3], ["#090909", .7], ["#3a3935", 1]].forEach(([k, s]) => G2.addColorStop(s as number, k as string));
  c.fillStyle = "#171716"; c.beginPath(); c.roundRect(-112, -204, 224, 54, 10); c.fill();
  c.fillStyle = G2; c.beginPath(); c.roundRect(-214, -156, 428, 66, 8); c.fill();
  c.fillStyle = G2; c.beginPath(); c.roundRect(-340, -94, 680, 94, 8); c.fill();
  c.strokeStyle = "rgba(233,230,221,.28)"; c.lineWidth = 4; linea(c, -316, -78, 316, -78);
  c.restore();
}

function maletaObj(c: Ctx, x: number, ybase: number, sy: number, bulto: number, tapa = 1) {
  const W = WMAL, h = HMAL * sy;
  c.save(); c.translate(x, ybase); c.lineJoin = "round";
  // Tapa abierta, detrás: se ve por dentro.
  if (tapa > 0) {
    const tp = 214 * tapa;
    c.fillStyle = "#2b2a27"; c.beginPath(); c.moveTo(-W / 2 + 18, -h); c.lineTo(-W / 2 + 56, -h - tp); c.quadraticCurveTo(0, -h - tp - 8, W / 2 - 56, -h - tp); c.lineTo(W / 2 - 18, -h); c.closePath(); c.fill();
    c.fillStyle = "#6b6962"; c.beginPath(); c.moveTo(-W / 2 + 44, -h); c.lineTo(-W / 2 + 72, -h - tp + 20); c.lineTo(W / 2 - 72, -h - tp + 20); c.lineTo(W / 2 - 44, -h); c.closePath(); c.fill();
    c.strokeStyle = "#2b2a27"; c.lineWidth = 2.5;
    for (let k = 1; k < 6; k++) { const y = -h - tp * k / 6; linea(c, -W / 2 + 44 + 28 * k / 6, y, W / 2 - 44 - 28 * k / 6, y); }
  }
  const G = c.createLinearGradient(0, -h, 0, 0);
  G.addColorStop(0, "#272725"); G.addColorStop(.5, "#141413"); G.addColorStop(1, "#080808");
  c.fillStyle = G; c.beginPath(); c.moveTo(-W / 2 + 30, -h); c.lineTo(W / 2 - 30, -h);
  c.quadraticCurveTo(W / 2 + bulto, -h, W / 2 + bulto * .4 + 3, -h + 34);
  c.quadraticCurveTo(W / 2 + bulto * 1.8, -h / 2, W / 2 + bulto * .2, -28); c.quadraticCurveTo(W / 2 + bulto * .2, 0, W / 2 - 30, 0); c.lineTo(-W / 2 + 30, 0);
  c.quadraticCurveTo(-W / 2 - bulto * .2, 0, -W / 2 - bulto * .2, -28); c.quadraticCurveTo(-W / 2 - bulto * 1.8, -h / 2, -W / 2 - bulto * .4 - 3, -h + 34); c.quadraticCurveTo(-W / 2 - bulto, -h, -W / 2 + 30, -h);
  c.closePath(); c.fill();
  c.strokeStyle = "rgba(237,234,227,.3)"; c.lineWidth = 3; c.setLineDash([16, 12]);
  linea(c, -W / 2 + 34, -h + 40 * sy, W / 2 - 34, -h + 40 * sy); linea(c, -W / 2 + 34, -36 * sy, W / 2 - 34, -36 * sy); c.setLineDash([]);
  const metal = (px: number, py: number, kx: number, ky: number) => {
    const m = c.createLinearGradient(px, py, px + kx * 70, py + ky * 70); m.addColorStop(0, "#D5D2CA"); m.addColorStop(1, "#6d6b65"); c.fillStyle = m;
    c.beginPath(); c.moveTo(px, py + ky * 12); c.quadraticCurveTo(px, py, px + kx * 12, py); c.lineTo(px + kx * 62, py); c.quadraticCurveTo(px + kx * 28, py + ky * 24 * sy, px, py + ky * 62 * sy); c.closePath(); c.fill();
  };
  metal(-W / 2 + 4, -h + 3, 1, 1); metal(W / 2 - 4, -h + 3, -1, 1); metal(-W / 2 + 4, -3, 1, -1); metal(W / 2 - 4, -3, -1, -1);
  for (const k of [-1, 1]) { c.fillStyle = "#B9B6AE"; c.beginPath(); c.roundRect(k * 150 - 32, -h - 8, 64, 32, 6); c.fill(); c.fillStyle = "#3b3a37"; c.fillRect(k * 150 - 8, -h + 2, 16, 12); }
  c.restore();
}

function golpe(c: Ctx, t: number, d: Datos) {
  const u = ease.inOutCubic(prog(t, M0, M1));
  const { sx, sy } = sacudida(t, [[H[0], 28], [H[1], 34], [H[2], 32], [H[3], 66]]);
  const z = 1 + .03 * smooth(prog(t, 0, H[3])) + .03 * ease.outCubic(prog(t, H[3], H[3] + .3));
  c.save(); camaraPlana(c, lerp(z, 1, u), 540 + sx + 5 * vaiven(t, 1.7), 960 + sy, .006 * vaiven(t, 2.3));
  const C = copaEn(t), crece = ease.outBack(prog(t, H[3] - .02, H[3] + .24), 2.2), s0 = lerp(S0, S1, crece);
  const hitE = H.reduce((e, h) => e + (t > h ? Math.exp(-(t - h) * 11) : 0), 0);
  const sqx = s0 * (1 + .1 * hitE), sqy = s0 * (1 - .13 * hitE), sMal = syMal(t), esc = 1 - ease.inCubic(prog(u, 0, .85));

  // Rayas de la caída.
  if (t < H[0] + .05) {
    const r = azar(5), a = 1 - prog(t, H[0] - .06, H[0] + .05);
    c.save(); c.strokeStyle = TINTA; c.lineCap = "round";
    for (let i = 0; i < 16; i++) {
      const x = 90 + r() * 900, L = 240 + r() * 400, y0 = C.y - 820 * S0 - L * (.2 + r() * .7) + r() * 40;
      c.globalAlpha = a * .24 * (.5 + r() * .5); c.lineWidth = 1.5 + r() * 2.2; linea(c, x, y0, x, y0 + L);
    }
    c.restore();
  }

  // Dónde está cada palabra: en su objeto, y luego en su sitio de la frase.
  const wx = 540 + Math.sin(C.r) * 610 * sqy, wy = C.y - Math.cos(C.r) * 610 * sqy;
  const P1 = d.P[iTRO], P6 = d.P[iMAL], q1 = pos(d, iTRO, t), q6 = pos(d, iMAL, t);
  const pxC = lerp(196 * s0, P1.px, u), xT = lerp(wx, q1.x + P1.w / 2, u), yT = lerp(wy + 64 * s0, q1.y, u);
  const yFrente = YMAL - HMAL * sMal * .5, xM = lerp(540, q6.x + P6.w / 2, u), yL = lerp(yFrente + 54, q6.y, u);

  // La maleta se encoge alrededor de su palabra.
  if (esc > 0) {
    c.save(); c.translate(xM, yL - 54 * esc); c.scale(esc, esc); c.translate(-540, -yFrente);
    maletaObj(c, 540, YMAL, sMal, [0, 12, 26, 40, 74][H.filter((h) => t > h).length], 1 - smooth(prog(t, H[3], H[3] + .12)));
    c.restore();
    copa(c, xT + (540 - wx) * esc, yT - 64 * s0 * esc + (C.y - wy) * esc, sqx * esc, sqy * esc, C.r);
  }

  // Las palabras, con las letras sueltas: cada golpe las hace saltar.
  const brinco = (i: number, A: number) => {
    let dx = 0, dy = 0, r = 0;
    H.forEach((h, k) => { const e = t - h; if (e > 0 && e < 1.3) { const q = Math.exp(-e * 6) * Math.abs(Math.sin(e * 15 + i * .7)) * A * (1 + k * .22); dy -= q; dx += q * (hash(i, k) - .5) * 1.4; r += q * (hash(k, i) - .5) * .01; } });
    return [dx, dy, r] as [number, number, number];
  };
  const oscuro = 1 - smooth(prog(esc, .3, .62));
  letras(c, "trofeo", xT, yT, serif(Math.round(pxC)), tinta(LUZ, TINTA, oscuro), 1, (i) => brinco(i, 42 * (1 - u)));
  c.save();
  const pxM = lerp(160, P6.px, u);
  if (u <= 0) { c.translate(0, yL); c.scale(1, lerp(1, sMal, .85)); c.translate(0, -yL); }
  letras(c, "maleta", xM, yL, serif(Math.round(pxM)), tinta(LUZ, TINTA, oscuro), 1, (i) => brinco(i + 3, 34 * (1 - u)));
  c.restore();

  H.forEach((h, k) => { astillas(c, 540, borde(h) + 4, t - h, 300 + k, 18 + k * 8, 640 + k * 120, 620, TINTA); });
  c.restore();

  // Lo demás de la frase aparece ya en su sitio.
  if (u > .3) {
    c.save(); camaraPlana(c, 1, 540, 960);
    CHICAS.forEach((i, k) => palabra(c, d, i, t, { alfa: smooth(prog(t, M0 + .4 + k * .012, M0 + .5 + k * .012)) }));
    const e = ease.outBack(prog(t, M0 + .42, M0 + .62), 1.8);
    palabra(c, d, iGRA, t, { alfa: smooth(prog(t, M0 + .42, M0 + .5)), esc: lerp(.7, 1, e) });
    c.restore();
  }
}
const CHICAS = [iEL, iNO, iCAB, iEN, iLA, iPOR, iERA, iMUY];

// ---------- 2. el telar ----------
// Todas las palabras miran a una sola. Cambia la última palabra de la frase y el centro del telar salta de trofeo a maleta.
const tCae = t0.pal + .1, tSello = t0.chica - .03;
const TOG = [t0.res + .02, t0.res + .36, t0.sin + .08, t0.pens + .22];
const CAMBIOS: [number, number][] = [[-9, 0], [tSello, 1], [TOG[0], 0], [TOG[1], 1], [TOG[2], 0], [TOG[3], 1]];
const cfgEn = (t: number) => { let k = 0; for (let i = 0; i < CAMBIOS.length; i++) if (t >= CAMBIOS[i][0]) k = i; return k; };
const CENTROS = [iTRO, iMAL];

type Hi = { i: number; g: number; ts: number; u: number };
const AR = t0.clar - .08;
const HILOS: Hi[] = [
  { i: iCHI, g: 22, ts: 0, u: .2 },
  { i: iCAB, g: 11, ts: AR, u: .5 },
  { i: iERA, g: 9, ts: AR + .09, u: .4 },
  { i: iMUY, g: 5, ts: AR + .18, u: .5 },
  { i: iPOR, g: 6.5, ts: AR + .27, u: .4 },
  { i: iLA, g: 4.5, ts: AR + .36, u: .5 },
  { i: iEN, g: 3.5, ts: AR + .45, u: .5 },
  { i: iNO, g: 5.5, ts: AR + .54, u: .5 },
  { i: iEL, g: 3.6, ts: AR + .63, u: .6 },
];
const LANZA = .2;

/** Extremos de un hilo para una configuración: nace en la palabra y termina escondido detrás de la palabra mirada. */
function extremos(d: Datos, h: Hi, cf: number, j: number, t: number) {
  const hub = CENTROS[cf], de = h.i === iCHI && cf === 0 ? iGRA : h.i;
  const arriba = d.P[hub].y < d.P[de].y - 10;
  if (j === 0) return { A: ancla(d, de, cf ? .27 : .13, true, t), B: cf ? ancla(d, iMAL, .03, false, t) : ancla(d, iTRO, .12, false, t) };
  const P = d.P[hub], S = d.P[de], igual = Math.abs(S.y - P.y) < 10, arribaDe = S.y < P.y - 10;
  const u = lerp(.5, clamp((S.x + S.w * h.u - P.x) / P.w, .06, .94), .82);
  if (igual) return { A: ancla(d, de, h.u, false, t), B: ancla(d, hub, .03, false, t) };
  return { A: ancla(d, de, h.u, !arribaDe, t), B: ancla(d, hub, u, arribaDe, t) };
}

function telar(c: Ctx, d: Datos, t: number) {
  const nCf = cfgEn(t), cf = CAMBIOS[nCf][1], tc = CAMBIOS[nCf][0];
  const suelta = smooth(prog(t, tCae - .05, tCae + .45));
  const rompe = smooth(prog(t, t0.amaq - .05, t0.amaq + .7));
  HILOS.forEach((h, j) => {
    const ts = h.ts || t0.q1 + .02;
    if (t < ts) return;
    const E = extremos(d, h, cf, j, t);
    let A = E.A, B = E.B, g = h.g, sag = 0, k = 1, col = TINTA;
    const seed = 40 + j * 7;
    let amp = pl(t, ts + LANZA, 16, 3);
    const principal = j === 0;
    // El hilo principal duda antes de decidir: primero se acerca a «maleta», luego se clava en «trofeo».
    if (principal && t < t0.tro2 + .2) {
      const P = ancla(d, iMAL, .02, false, t), Tp = ancla(d, iTRO, .12, false, t), med = { x: lerp(P.x - 50, Tp.x, .5), y: lerp(P.y, Tp.y, .5) + 30 };
      const q = ease.outCubic(prog(t, t0.q1 + .02, t0.gr2 + .1)), v = smooth(prog(t, t0.gr2 + .18, t0.el2 + .22));
      const w = 1 - smooth(prog(t, t0.el2 + .1, t0.tro2));
      const bus = { x: lerp(lerp(A.x, P.x - 50, q), med.x, v) + 26 * w * Math.sin(t * 8.3), y: lerp(lerp(A.y - 30, P.y + 12, q), med.y, v) + 16 * w * Math.sin(t * 6.1) };
      const fin = ease.outBack(prog(t, t0.tro2 - .02, t0.tro2 + .1), 2.4);
      B = { x: lerp(bus.x, B.x, fin), y: lerp(bus.y, B.y, fin) };
      g = lerp(5, h.g, ease.outCubic(prog(t, t0.tro2 - .02, t0.tro2 + .16)));
      sag = 26 * (1 - fin); amp = 2 * (1 - fin);
    } else if (principal) amp = pl(t, t0.tro2 + .08, 36, 3.2);
    else k = t < ts + LANZA ? ease.outCubic(prog(t, ts, ts + LANZA)) : 1;

    // Se cayó «grande»: el telar se afloja; el hilo que colgaba de ella queda suelto.
    if (t >= tCae - .05 && t < tSello) {
      const sw = 22 * Math.sin(t * 1.9 + j * 1.7) * suelta;
      if (principal) {
        const D = { x: B.x + sw * 1.4 + 14 * suelta, y: B.y + 700 };
        A = { x: lerp(A.x, D.x, suelta), y: lerp(A.y, D.y, suelta) };
      }
      sag = suelta * (principal ? 8 : 90 + j * 22) * (1 + .14 * Math.sin(t * 2.3 + j * 2));
      amp = pl(t, tCae, 9, 3);
      g *= lerp(1, .8, suelta);
    }
    // Sello: cada hilo salta a su nueva palabra, uno tras otro.
    if (t >= tSello) {
      const ret = j * .014, whip = ease.outBack(prog(t, tc + ret, tc + ret + .15), 1.9);
      if (whip < 1) {
        const prev = extremos(d, h, 1 - cf, j, t);
        const ox = nCf === 1 && principal ? { x: prev.B.x, y: prev.B.y + 700 } : prev.A;
        A = { x: lerp(ox.x, A.x, whip), y: lerp(ox.y, A.y, whip) };
        B = { x: lerp(prev.B.x, B.x, whip), y: lerp(prev.B.y, B.y, whip) };
        sag = (1 - whip) * (nCf === 1 ? 40 : 10);
      }
      amp = pl(t, tc + ret + .1, (principal ? 40 : 24) * (nCf > 1 ? .5 : 1), 2.9);
      if (principal) {
        col = cf ? tinta(TINTA, ACENTO, smooth(prog(t, tc, tc + .08))) : TINTA;
        g = cf ? lerp(h.g, 30, smooth(prog(t, t0.mal2 - .1, t0.mal2 + .25))) : h.g;
        amp += pl(t, t0.mal2, 36, 3);
      }
    }
    // «A una máquina»: se sueltan y se caen de la hoja.
    let alfa = 1;
    if (rompe > 0) {
      sag += rompe * 90; alfa = 1 - smooth(prog(t, t0.amaq + .25, t0.costo + .25));
      A = { x: A.x, y: A.y + rompe * 150 * (j % 3 === 0 ? 1 : .35) }; g *= 1 - rompe * .3; amp *= 1 - rompe;
    }
    hilo(c, A.x, A.y, B.x, B.y, g, t, { col, sag, amp, seed, k, soga: g >= 9, sombra: true, alfa, punta: k < 1 ? 11 : 0, nudos: true });
  });
}

const iPalFin = (t: number) => (CAMBIOS[cfgEn(t)][1] ? iCHI : iGRA);
function rebota(k: number, t: number) {            // la palabra brinca al ser leída otra vez
  const ti = palabras[iSeg + k].s;
  return t > ti ? Math.exp(-(t - ti) * 8.5) * Math.sin((t - ti) * 15) : 0;
}

function cartel(c: Ctx, t: number, d: Datos) {
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  pelusas(c, t, .2);
  const cz = camaraCartel(t);
  c.save(); camaraPlana(c, cz.z, cz.x, cz.y, cz.r);
  const atenua = 1 - .62 * smooth(prog(t, t0.amaq, t0.deca));
  telar(c, d, t);
  const lee = (i: number) => (t > t0.lee - .1 && t < t0.q2 ? rebota(i, t) : 0);
  // La palabra mirada crece un poco: la atención pesa.
  const nCf = cfgEn(t), hubE = (i: number) => {
    if (t < tSello) return i === iTRO ? .035 * smooth(prog(t, t0.tro2, t0.tro2 + .2)) * (1 - smooth(prog(t, tCae, tCae + .3))) : 0;
    return i === CENTROS[CAMBIOS[nCf][1]] ? .04 * smooth(prog(t, CAMBIOS[nCf][0], CAMBIOS[nCf][0] + .12)) * (1 - smooth(prog(t, t0.amaq, t0.amaq + .4))) : 0;
  };
  for (let i = 0; i <= iMUY; i++) palabra(c, d, i, t, { alfa: atenua, esc: 1 + .06 * lee(i) + hubE(i) });
  // La palabra final: tiembla, se cae a pedazos, y otra llega como un sello.
  if (t < tCae) {
    const tr = smooth(prog(t, t0.camb, t0.pal)), p = d.P[iGRA], q = pos(d, iGRA, t);
    letras(c, p.s, q.x + p.w / 2, q.y, serif(p.px, true), TINTA, 1, (i) => [Math.sin(t * 61 + i * 2) * 8 * tr, Math.cos(t * 53 + i) * 8 * tr, Math.sin(t * 47 + i) * .03 * tr]);
  } else if (t < tSello) {
    const p = d.P[iGRA], q = pos(d, iGRA, tCae);
    letras(c, p.s, q.x + p.w / 2, q.y, serif(p.px, true), TINTA, 1, (i) => {
      const e = Math.max(t - tCae - (5 - i) * .05, 0), f = hash(i, 7) - .5;
      return [f * 500 * e, 1800 * e * e, f * 5 * e];
    });
    const a = smooth(prog(t, tCae + .3, tCae + .7)) * .6, b = azar(Math.floor(t * 10));
    c.save(); c.strokeStyle = TINTA; c.globalAlpha = a; c.lineWidth = 4; c.setLineDash([26, 18]); c.lineCap = "round";
    linea(c, MIZ + 8 + b() * 2, Y[4] + 14 + b() * 2, MIZ + 540, Y[4] + 14 + b() * 2); c.setLineDash([]); c.restore();
  } else {
    const i = iPalFin(t), tc = CAMBIOS[nCf][0], e = t - tc;
    const es = lerp(nCf === 1 ? 3 : 1.3, 1, ease.outExpo(prog(e, 0, .14)));
    const chiq = smooth(prog(t, t0.amaq, t0.deca));
    palabra(c, d, i, t, { esc: es, col: i === iCHI ? tinta(ACENTO, TINTA, chiq) : TINTA, alfa: atenua });
    if (nCf === 1 && e < .8) {
      const p = d.P[iCHI], q = pos(d, iCHI, t), r = ease.outCubic(prog(e, .09, .8));
      c.save(); c.globalAlpha = (1 - r) * .85; c.strokeStyle = ACENTO; c.lineWidth = 16 * (1 - r) + 2; c.beginPath(); c.arc(q.x + p.w / 2, q.y - 80, 190 + r * 760, 0, TAU); c.stroke(); c.restore();
      astillas(c, q.x + p.w / 2, q.y + 20, e - .1, 77, 44, 900, 560, ACENTO);
    }
  }
  c.restore();

  rotulo(c, t, t0.sin - .05, t0.amaq - .25, "sin pensar", 1548, 160, TINTA, true);
  // Décadas: una regla sin números que pasa de largo y una bola que apenas avanza.
  const rg = smooth(prog(t, t0.amaq - .05, t0.amaq + .3)) * (1 - smooth(prog(t, t0.porq - .05, t0.porq + .25)));
  if (rg > 0) {
    c.save(); c.globalAlpha = rg; c.strokeStyle = TINTA; c.lineWidth = 4; linea(c, 0, YRIEL, 1080, YRIEL);
    const v = 2200 * ease.outCubic(prog(t, t0.amaq, t0.porq)) + t * 30;
    for (let i = 0; i < 12; i++) { const x = ((i * 100 - v) % 1200 + 1200) % 1200 - 60; c.lineWidth = i % 4 === 0 ? 6 : 3.5; linea(c, x, YRIEL, x, YRIEL + (i % 4 === 0 ? 30 : 16)); }
    c.restore();
    bola(c, xBolaRiel(t), YRIEL - 34, 34);
  }
  conHalo(c, "décadas", 540, 1576, serif(190, true), ACENTO, smooth(prog(t, t0.deca - .08, t0.deca + .1)) * (1 - smooth(prog(t, t0.porq - .05, t0.porq + .2))), 0);
}
const YRIEL = 1392, CYL = 1064;
const xBolaRiel = (t: number) => lerp(-60, 130, ease.outCubic(prog(t, t0.amaq, t0.porq)));

const CAMC: { t: number; z: number; x: number; y: number; d: number; f?: (x: number) => number }[] = [
  { t: t0.q1, z: 1.05, x: 500, y: 900, d: 1.2 },
  { t: t0.clar - .1, z: 1, x: 540, y: 960, d: .8 },
  { t: t0.camb, z: 1.04, x: 500, y: 1010, d: 1 },
  { t: t0.lee - .3, z: 1.02, x: 540, y: 980, d: 1.5 },
  { t: t0.chica - .02, z: 1, x: 540, y: 960, d: .25, f: ease.outCubic },
  { t: t0.q2 - .1, z: 1.06, x: 500, y: 1060, d: .9 },
  { t: t0.lam - .15, z: 1.06, x: 560, y: 830, d: .8 },
  { t: t0.tu - .2, z: 1, x: 540, y: 960, d: .7 },
  { t: t0.sin - .4, z: 1, x: 540, y: CYL, d: .6 },
];
function camaraCartel(t: number) {
  let z = 1, x = 540, y = 960;
  for (const k of CAMC) { if (t <= k.t) break; const q = (k.f ?? ease.inOutCubic)(prog(t, k.t, k.t + k.d)); z = lerp(z, k.z, q); x = lerp(x, k.x, q); y = lerp(y, k.y, q); }
  const { sx, sy } = sacudida(t, [[t0.tro2 + .08, 14], [tCae + .35, 10], [tSello + .06, 70], [t0.mal2, 16], ...TOG.map((g): [number, number] => [g, 9])]);
  return { z: z * (1 + .008 * vaiven(t, 4.9)), x: x + 8 * vaiven(t, 6.1) + sx, y: y + 10 * vaiven(t, 4.3, 1) + sy, r: .0032 * vaiven(t, 7.3, 2) };
}

const TIRONES: [number, number, number, number][] = [
  [iTRO, t0.tro2 + .08, -10, 36],
  ...HILOS.slice(1).map((h, j): [number, number, number, number] => [iTRO, h.ts + LANZA, 3 * (j % 2 ? 1 : -1), 9]),
  ...HILOS.slice(1).map((h): [number, number, number, number] => [h.i, h.ts - .02, 0, -12]),
  ...[iEL, iTRO, iNO, iCAB, iEN, iLA, iMAL, iPOR, iERA, iMUY].map((i): [number, number, number, number] => [i, tSello + .03 + i * .012, (i % 2 ? 1 : -1) * 10, -34]),
  [iMAL, t0.mal2, -16, 44],
  ...TOG.map((tg, k): [number, number, number, number] => [k % 2 ? iMAL : iTRO, tg, 0, 22]),
  // chica busca
  [iTRO, t0.tro + .3, 0, 10],
  [iMAL, t0.mucho - .02, -20, 64],
  [iCHI, t0.mucho - .02, 8, -26],
];

// ---------- 3. leía palabra por palabra ----------
const ORDEN = [iEL, iTRO, iNO, iCAB, iEN, iLA, iMAL, iPOR, iERA, iMUY, iCHI];
const tLee = (k: number) => lerp(t0.leia - .02, t0.fin + .28, k / 10);
const cyLectura = (t: number) => lerp(CYL, 960, ease.inOutCubic(prog(t, t0.porq, tLee(3))));
function bolaLectora(d: Datos, t: number): P2 {
  const top = (k: number) => { const i = ORDEN[k], p = d.P[i], q = pos(d, i, t); return { x: q.x + p.w * .5, y: q.y - p.px * (p.px === BIG ? .5 : .62) - 36 }; };
  if (t < tLee(0)) {
    const q = ease.inOutCubic(prog(t, t0.porq - .05, tLee(0))), a = { x: xBolaRiel(t0.porq), y: YRIEL - 34 + cyLectura(t) - 960 }, b = top(0);
    return { x: lerp(a.x, b.x, q), y: lerp(a.y, b.y, q) - 260 * Math.sin(Math.PI * q) };
  }
  for (let k = 0; k < ORDEN.length - 1; k++) if (t < tLee(k + 1)) {
    const a = top(k), b = top(k + 1), q = prog(t, tLee(k), tLee(k + 1));
    return { x: lerp(a.x, b.x, q), y: lerp(a.y, b.y, q) - (90 + Math.abs(a.y - b.y) * .3) * Math.sin(Math.PI * q) };
  }
  return top(ORDEN.length - 1);
}

function polvoPal(c: Ctx, d: Datos, i: number, k: number, t: number) {
  if (k <= 0 || k >= 1) return;
  const p = d.P[i], q = pos(d, i, t), R = d.polvo[i], cx = q.x + p.w / 2, cy = q.y - p.px * .24;
  c.save(); c.fillStyle = TINTA;
  for (let n = 0; n < R.length; n++) {
    const h = hash(n, i + 2), e = clamp((k - h * .5) / .5), s = e * e;
    if (e <= 0) continue;
    c.globalAlpha = (1 - e) * .85;
    const l = 2 + hash(i, n) * 2.6;
    c.fillRect(cx + R[n][0] - s * (120 + 260 * h) + 26 * Math.sin(n + t * 2) * e, cy + R[n][1] + s * (150 + 500 * hash(n, 9)), l, l);
  }
  c.restore();
}

function lectura(c: Ctx, t: number, d: Datos) {
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  pelusas(c, t, .2);
  const z = 1 + .03 * prog(t, t0.porq, t0.prinF);
  c.save(); camaraPlana(c, z, 540 + 8 * vaiven(t, 6.1), cyLectura(t) + 10 * vaiven(t, 4.3, 1), .003 * vaiven(t, 7.3, 2));
  ORDEN.forEach((i, k) => {
    const tk = tLee(k), ult = k === 10;
    const llegada = t > tk ? Math.exp(-(t - tk) * 9) * Math.sin((t - tk) * 15) : 0;
    const pierde = ult ? 0 : clamp(prog(t, tk + .35 + (10 - k) * .03, t0.ya + .5 + k * .05));
    const a = (t < tk ? .38 : 1) * (ult ? 1 : 1 - pierde ** .75);
    palabra(c, d, i, t, { alfa: a, dy: 16 * llegada, col: ult && t > tk ? ACENTO : TINTA });
    if (!ult) polvoPal(c, d, i, pierde, t);
  });
  // Al final quiere mirar atrás: un hilo sube y ya no hay nada que agarrar.
  const ini = t0.prin - .25;
  if (t > ini) {
    const A = ancla(d, iCHI, .14, true, t), up = ease.outCubic(prog(t, ini, ini + .42)), cae = smooth(prog(t, ini + .55, ini + 1.1));
    const fin = ancla(d, iTRO, .12, false, t), B = { x: fin.x + 50 * cae, y: lerp(fin.y, A.y - 30, cae) };
    hilo(c, A.x, A.y, B.x, B.y, 5, t, { k: up, sag: 44 * cae, amp: 4 * (1 - cae), seed: 5, punta: 10, alfa: 1 - smooth(prog(t, ini + 1, ini + 1.5)), nudos: false });
  }
  const b = bolaLectora(d, t);
  bola(c, b.x, b.y, 34);
  c.restore();
}

// ---------- 4. atención ----------
const AT0 = t0.truco - .4, PXAT = 270, YAT = 900;
type Pz = { x0: number; y0: number; xf: number; yf: number; h: number; q: number };
let CACHE: Pz[] | null = null;
function particulasAten(d: Datos): Pz[] {
  const out: Pz[] = [], r = azar(4);
  d.aten.forEach(([xf, yf], n) => {
    const i = ORDEN[n % 10], p = d.P[i], R = d.polvo[i][n % d.polvo[i].length];
    out.push({ x0: p.x + p.w / 2 + R[0] - 200 * r(), y0: p.y - 40 + R[1] + 300 * r(), xf: 540 + xf, yf: YAT + yf, h: r(), q: r() });
  });
  return out;
}
function puntoI(c: Ctx) {
  c.save(); c.font = serif(PXAT, true); const W = c.measureText("atención").width, a = c.measureText("atenc").width, b = c.measureText("atenci").width; c.restore();
  return -W / 2 + (a + b) / 2 + 14;
}
function atencion(c: Ctx, t: number, d: Datos) {
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  pelusas(c, t, .2);
  const Z = CACHE ?? (CACHE = particulasAten(d));
  const arma = t0.aten - .1, listo = t0.aten + .36;
  const a = smooth(prog(t, AT0, AT0 + .7)), gira = t - AT0, cierra = ease.inCubic(prog(t, arma - .55, listo));
  const Rg = lerp(350, 230, prog(t, AT0, arma));
  if (t < listo) {
    c.save(); c.fillStyle = TINTA;
    for (const p of Z) {
      const f = p.h * TAU + gira * (.8 + p.q * .55) + cierra * 4, R = Rg * (.55 + p.h * .9), ex = 540 + Math.cos(f) * R * 1.3, ey = 940 + Math.sin(f) * R * 1.1 + 30 * Math.sin(gira * 1.3 + p.q * 7);
      const ori = smooth(prog(t, AT0, AT0 + 1.4));
      const x = lerp(lerp(p.x0, ex, ori), p.xf, cierra), y = lerp(lerp(p.y0, ey, ori), p.yf, cierra);
      c.globalAlpha = a * .75; const l = 2.5 + p.q * 2.6; c.fillRect(x, y, l, l);
    }
    c.restore();
  }
  palabraAten(c, t);
  // La bola se sienta como el punto de la i.
  const r = 30, cae = ease.outBack(prog(t, listo - .34, listo), 1.6);
  c.save(); c.globalAlpha = smooth(prog(t, AT0 - .2, AT0 + .3));
  bola(c, lerp(540, 540 + puntoI(c), cae), lerp(1120, YAT - 118, cae), r); c.restore();
}
/** «atención» sale volando hacia arriba justo cuando vuelven las palabras. */
function palabraAten(c: Ctx, t: number) {
  const listo = t0.aten + .36, sale = t0.cada - .05, sl = ease.inCubic(prog(t, sale, sale + .34));
  const q = smooth(prog(t, listo - .2, listo)), e = (1 + .05 * pulso(t - listo, 18, 5)) * (1 + sl * .14);
  if (t < listo - .2 || sl >= 1) return;
  c.save(); c.translate(540, YAT - sl * 800); c.scale(e, e);
  texto(c, "atención", 0, 86, { fuente: serif(PXAT, true), color: ACENTO, alfa: q * (1 - sl) }); c.restore();
  if (t >= sale) { c.save(); c.globalAlpha = 1 - sl; bola(c, 540 + puntoI(c), YAT - 118 - sl * 800, 30); c.restore(); }
}

// ---------- 5. todas con todas ----------
function pares() {
  const out: [number, number][] = [];
  for (let i = 0; i < ORDEN.length; i++) for (let j = i + 1; j < ORDEN.length; j++) out.push([ORDEN[i], ORDEN[j]]);
  return out;
}
const PARES = pares();
/** Lo que queda cuando cada una decide quién le importa. */
const IMPORTA: Record<string, number> = { [`${iMAL},${iCHI}`]: 22, [`${iTRO},${iCAB}`]: 10, [`${iEL},${iTRO}`]: 6, [`${iMUY},${iCHI}`]: 8, [`${iLA},${iMAL}`]: 7, [`${iNO},${iCAB}`]: 5, [`${iPOR},${iERA}`]: 4, [`${iEN},${iLA}`]: 3 };
const ZW = .98, CYW = 1004;

function todas(c: Ctx, t: number, d: Datos) {
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  pelusas(c, t, .2);
  const aleja = ease.inOutCubic(prog(t, t0.cada, t0.dem));
  const z = lerp(1.03, ZW, aleja), cy = lerp(960, CYW, aleja);
  const { sx, sy } = sacudida(t, [[t0.mira + .1, 9], [t0.imp, 12]]);
  c.save(); camaraPlana(c, z, 540 + 8 * vaiven(t, 6.1) + sx, cy + 10 * vaiven(t, 4.3, 1) + sy, .003 * vaiven(t, 7.3, 2));
  const sel = smooth(prog(t, t0.imp - .1, t0.impF + .1)), va = smooth(prog(t, t0.lap - .1, t0.lap + .5));
  const ola = t0.mira - .08, dur = t0.dem + .2 - ola, deriva = t > t0.preg ? 1 : 0;
  PARES.forEach(([a, b], n) => {
    const ka = ORDEN.indexOf(a), ti = ola + dur * ((ka + hash(n, 1) * 1.2) / 11);
    if (t < ti) return;
    const w = IMPORTA[`${a},${b}`] ?? 0, wr = hash(n, 4) * 1.1 + 1.1;
    const ab = d.P[b].y <= d.P[a].y;
    const A = ancla(d, a, .15 + hash(n, 2) * .7, ab, t), B = ancla(d, b, .15 + hash(n, 3) * .7, !ab, t);
    const g = lerp(wr, Math.max(w, 1), sel), alfa = lerp(.7 + hash(n, 5) * .28, w ? 1 : .1, sel) * (1 - va);
    const col = a === iMAL && b === iCHI && sel > .5 ? ACENTO : TINTA;
    const k = ease.outCubic(prog(t, ti, ti + .28));
    hilo(c, A.x, A.y, B.x, B.y, g, t, { k, amp: pl(t, ti + .28, 9, 2.2) + (w ? pl(t, t0.imp, 18, 3) : 0) + 1.3 * (1 - sel) * deriva, sag: (hash(n, 6) - .5) * 44 * (1 - sel), seed: n * 3, alfa, nudos: w > 0 && sel > .5, soga: g >= 9, col });
    // Mientras pregunta, algo viaja por cada hilo.
    if (deriva && sel < 1 && n % 3 === 0) {
      const s = (t * .8 + hash(n, 8)) % 1;
      c.save(); c.globalAlpha = (1 - sel) * (1 - va); c.fillStyle = TINTA; circulo(c, lerp(A.x, B.x, s), lerp(A.y, B.y, s), 5); c.restore();
    }
  });
  ORDEN.forEach((i, k) => {
    const ti = t0.cada - .05 + k * .05, q = ease.outBack(prog(t, ti, ti + .24)), lig = hash(i, 11) * 6 * deriva;
    const f = i === iCHI || i === iTRO || i === iMAL ? 1 : lerp(1, 0, va);
    palabra(c, d, i, t, { alfa: smooth(prog(t, ti, ti + .12)) * f, esc: lerp(.6, 1, q), dy: lig * Math.sin(t * 5 + k), col: i === iCHI ? ACENTO : TINTA });
  });
  c.restore();
  rotulo(c, t, t0.quien - .06, t0.lap - .25, "¿quién de ustedes", 1462, 118, TINTA, true);
  rotulo(c, t, t0.quien + .22, t0.lap - .25, "me importa?", 1574, 118, ACENTO, true);
}

// ---------- 6. chica busca ----------
function camBusca(t: number) {
  const K = [
    { t: t0.chi - .1, z: 1.06, y: 1320, x: 540, d: .8 },
    { t: t0.mt, z: 1.04, y: 640, x: 520, d: t0.tro + .28 - t0.mt },
    { t: t0.mm - .1, z: 1.08, y: 1090, x: 540, d: .7 },
    { t: t0.mucho - .02, z: .98, y: 980, x: 540, d: .35 },
  ];
  let z = ZW, x = 540, y = CYW;
  for (const k of K) { if (t <= k.t) break; const q = ease.inOutCubic(prog(t, k.t, k.t + k.d)); z = lerp(z, k.z, q); x = lerp(x, k.x, q); y = lerp(y, k.y, q); }
  const { sx, sy } = sacudida(t, [[t0.tro + .3, 5], [t0.mucho - .02, 64]]);
  return { z: z * (1 + .007 * vaiven(t, 4.9)), x: x + 7 * vaiven(t, 6.1) + sx, y: y + 9 * vaiven(t, 4.3, 1) + sy, r: .003 * vaiven(t, 7.3, 2) };
}
const TIRA = (t: number) => (t > t0.mucho - .02 ? 48 * Math.min(resorte(t - (t0.mucho - .02), 2.6, .35), 1.3) : 0);
const UPelo = [.1, .14], USoga = [.27, .03];

/** Los dos hilos de «chica»: el más fino y el más grueso de la pieza. */
function dibujaHilosChica(c: Ctx, t: number, d: Datos, alfaH = 1) {
  const hair = ease.inOutCubic(prog(t, t0.mt + .08, t0.tro + .26)), soga = ease.outCubic(prog(t, t0.mm + .1, t0.mal + .24));
  const PMal = ancla(d, iMAL, USoga[1], false, t), PTro = ancla(d, iTRO, UPelo[1], false, t);
  PMal.y += TIRA(t);
  const CH = ancla(d, iCHI, UPelo[0], true, t), CM = ancla(d, iCHI, USoga[0], true, t);
  const ant = smooth(prog(t, t0.busca - .1, t0.busca + .25)) * (1 - smooth(prog(t, t0.mt - .2, t0.mt + .15)));
  if (ant > 0) for (let i = 0; i < 11; i++) {
    const u = i / 10, A = ancla(d, iCHI, lerp(.08, .92, u), true, t), fa = -1.57 + (u - .5) * 1.9 + .42 * Math.sin(t * 2.6 + i * 1.7), L = (210 + 120 * hash(i, 3)) * ant;
    hilo(c, A.x, A.y, A.x + Math.cos(fa) * L, A.y + Math.sin(fa) * L, 2.6, t, { amp: 8, modo: 2, seed: i + 200, alfa: ant * .9, nudos: false, sag: 14 * Math.sin(t * 3 + i) });
  }
  if (hair > 0) hilo(c, CH.x, CH.y, PTro.x, PTro.y, 2.2, t, { k: hair, amp: pl(t, t0.tro + .26, 13, 2.4), seed: 300, punta: 9, sombra: true, alfa: alfaH });
  if (soga > 0) {
    const crece = smooth(prog(t, t0.mucho - .1, t0.mucho + .08));
    hilo(c, CM.x, CM.y, PMal.x, PMal.y, lerp(12, 42, crece), t, { k: soga, amp: pl(t, t0.mal + .24, 12, 3) + pl(t, t0.mucho, 40, 2.7), seed: 301, punta: 18, soga: true, sombra: true, col: tinta(TINTA, ACENTO, crece), alfa: alfaH });
  }
}

function escenaBusca(c: Ctx, t: number, d: Datos) {
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  pelusas(c, t, .2);
  const K = camBusca(t);
  c.save(); camaraPlana(c, K.z, K.x, K.y, K.r);
  dibujaHilosChica(c, t, d);
  palabra(c, d, iTRO, t);
  palabra(c, d, iMAL, t, { dy: TIRA(t), esc: 1 - .02 * pulso(t - t0.mucho, 13, 3) });
  palabra(c, d, iCHI, t, { col: ACENTO, esc: 1 + .03 * pulso(t - t0.mucho, 13, 3) });
  rotulo(c, t, t0.poco - .05, t0.mm - .22, "poco", 562, 180, GRIS, true, 690);
  rotulo(c, t, t0.mucho - .04, t0.yse + .1, "mucho", 1168, 200, ACENTO, true, 716);
  c.restore();
}

// ---------- 7. la mezcla: papel recortado ----------
// Cada trozo es un recorte de la palabra original: viaja por su hilo y se pega en el collage. Al final su tamaño
// dice cuánto le importó, sin un solo número.
type Tz = { i: number; u0: number; u1: number; t0: number; dur: number; col: string; via: 0 | 1 | 2; esc: number };
const TZ: Tz[] = [
  { i: iMAL, u0: .0, u1: .36, t0: t0.mez - .12, dur: .7, col: TINTA, via: 1, esc: 1.16 },
  { i: iMAL, u0: .64, u1: 1, t0: t0.mez + .16, dur: .7, col: TINTA, via: 1, esc: 1.16 },
  { i: iTRO, u0: .46, u1: .66, t0: t0.ped - .1, dur: 1.1, col: "#6d6b65", via: 0, esc: .46 },
  { i: iCHI, u0: 0, u1: .44, t0: t0.yse + .1, dur: .5, col: ACENTO, via: 2, esc: .82 },
  { i: iCHI, u0: .44, u1: .64, t0: t0.yse + .26, dur: .5, col: ACENTO, via: 2, esc: .82 },
];
const ORDENC = [3, 0, 2, 1, 4], YC = 1282;

function plazas(d: Datos, k: number) {
  const es = TZ.map((z) => lerp(1, z.esc, k)), W = TZ.map((z, n) => d.P[z.i].w * (z.u1 - z.u0) * es[n]), GAP = 12;
  const tot = ORDENC.reduce((a, n) => a + W[n], 0) + GAP * (ORDENC.length - 1), E = Math.min(1, 880 / tot);
  let x = 540 - tot * E / 2; const xs: number[] = [];
  ORDENC.forEach((n) => { xs[n] = x + W[n] * E / 2; x += (W[n] + GAP) * E; });
  return { xs, e: es.map((q) => q * E) };
}

function recorte(c: Ctx, d: Datos, z: Tz, x: number, y: number, r: number, e: number) {
  const p = d.P[z.i], w = p.w * (z.u1 - z.u0), h = p.px * 1.02, oy = p.px * .3;
  c.save(); c.translate(x, y); c.rotate(r); c.scale(e, e);
  c.fillStyle = "rgba(20,18,14,.14)"; c.fillRect(-w / 2 + 7, -h / 2 + 11, w, h);
  c.fillStyle = "#FBFAF6"; c.fillRect(-w / 2, -h / 2, w, h);
  c.strokeStyle = "rgba(17,17,17,.28)"; c.lineWidth = 2 / Math.max(e, .3); c.strokeRect(-w / 2, -h / 2, w, h);
  c.beginPath(); c.rect(-w / 2, -h / 2, w, h); c.clip();
  texto(c, p.s, -w / 2 - p.w * z.u0, oy, { fuente: serif(p.px, p.it), color: z.col, alin: "left" });
  c.restore();
}

function mezcla(c: Ctx, t: number, d: Datos) {
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  pelusas(c, t, .2);
  const cae = ease.inOutCubic(prog(t, t0.imp2F + .06, t0.imp2F + .46));
  const K = camBusca(t), q = ease.inOutCubic(prog(t, t0.yse - .1, t0.yse + .8));
  const { sx, sy } = sacudida(t, [...TZ.map((z) => [z.t0 + z.dur, 10] as [number, number]), [t0.seg, 8]]);
  c.save(); camaraPlana(c, lerp(K.z, 1, q), lerp(K.x, 540, q) + sx, lerp(K.y, 960, q) + sy, K.r);
  const salen = 1 - smooth(prog(t, t0.imp2 - .1, t0.imp2F));
  dibujaHilosChica(c, t, d, salen);
  const hueco = (i: number) => {
    const p = d.P[i], q2 = pos(d, i, t), dy = i === iMAL ? TIRA(t) : 0;
    c.save(); c.beginPath(); c.rect(-40, -40, 1160, 2000);
    for (const z of TZ) if (z.i === i && t > z.t0) c.rect(q2.x + p.w * z.u0 - 2, q2.y + dy - p.px, p.w * (z.u1 - z.u0) + 4, p.px * 1.34);
    c.clip("evenodd");
    palabra(c, d, i, t, { alfa: i === iCHI ? 1 - smooth(prog(t, t0.yse + .26, t0.yse + .6)) : salen, dy, col: i === iCHI ? ACENTO : TINTA }); c.restore();
  };
  hueco(iTRO); hueco(iMAL); hueco(iCHI);
  rotulo(c, t, t0.mucho - .04, t0.yse + .1, "mucho", 1168, 200, ACENTO, true, 716);
  const kS = ease.outBack(prog(t, t0.seg - .02, t0.seg + .4), 1.6), PZ = plazas(d, kS);
  TZ.forEach((z, k) => {
    if (t < z.t0) return;
    const p = d.P[z.i], q2 = pos(d, z.i, z.t0);
    const ox = q2.x + p.w * (z.u0 + z.u1) / 2, oy = q2.y - p.px * .24 + (z.i === iMAL ? 48 : 0);
    const r0 = hash(k, 2) - .5, u = ease.inOutCubic(prog(t, z.t0, z.t0 + z.dur));
    // Va hasta el hilo, baja por él y aterriza con un golpecito.
    const A = z.i === iTRO ? ancla(d, iTRO, UPelo[1], false, z.t0) : ancla(d, iMAL, USoga[1], false, z.t0);
    const mx = z.via === 2 ? ox : A.x, my = z.via === 2 ? oy : A.y + 70;
    const x = u < .4 ? lerp(ox, mx, smooth(u / .4)) : lerp(mx, PZ.xs[k], smooth((u - .4) / .6));
    const y = u < .4 ? lerp(oy, my, smooth(u / .4)) : lerp(my, YC, smooth((u - .4) / .6));
    const land = t > z.t0 + z.dur ? pulso(t - z.t0 - z.dur, 16, 5) : 0;
    const e = lerp(1, PZ.e[k], smooth(u)) * (1 + .08 * land) * (1 - cae * .97);
    recorte(c, d, z, lerp(x, 540, cae), lerp(y, 1060, cae), r0 * .08 * (1 - cae) + (1 - u) * r0 * .5, Math.max(e, .01));
  });
  c.restore();
}

// ---------- 8. banco, en el mapa ----------
// Un hilo solo jala: por eso cada frase está del lado hacia donde arrastra la bola.
const SILLA: [number, number] = [-.9, 3.1], DINERO: [number, number] = [.9, -3.1];
const POS_S: [number, number] = [-.35, 2.05], POS_D: [number, number] = [.35, -1.5];
const tVuelaB = t0.imp2F + .46, tCaeB = t0.ban - .535 + .04;
const tJal1 = t0.sen + .02, tJal2 = t0.cob - .05, tVaiv = [t0.mue - .3, t0.mue + .34];
const YF1 = 262, YF2 = 1560;

function xyBanco(t: number): [number, number] {
  const a = ease.outBack(prog(t, tJal1, tJal1 + .62), 1.3), b = ease.outBack(prog(t, tJal2, tJal2 + .72), 1.3);
  const c0 = ease.inOutCubic(prog(t, tVaiv[0], tVaiv[0] + .42)), c1 = ease.outBack(prog(t, tVaiv[1], tVaiv[1] + .48), 1.5);
  return [0, 1].map((i) => lerp(lerp(lerp(lerp(0, POS_S[i], a), POS_D[i], b), POS_S[i], c0), POS_D[i], c1)) as [number, number];
}
const VB: Vista = { tx: 0, ty: 0, tz: 0, yaw: -.06, pitch: 1.14, dist: 10.6 };
function vistaMapa(t: number): Vista {
  const q = ease.inOutCubic(prog(t, t0.ban, t0.me));
  const v = mezclaVista({ ...VB, pitch: .8, dist: 9.4, yaw: -.2 }, VB, q);
  return { ...v, tx: .05 * Math.sin(t * .41), ty: .05 * Math.cos(t * .37), yaw: v.yaw + .035 * Math.sin(t * .47), pitch: v.pitch + .02 * Math.sin(t * .6), dist: v.dist * (1 + .02 * Math.sin(t * .53)) };
}

const FRASE1 = ["me", "senté", "en", "el", "banco"], FRASE2 = ["el", "banco", "me", "cobró"];
function frase(c: Ctx, F: string[], y: number, alfa: number, marca: number, px = 112) {
  const xs = medidaFrase(c, F, px);
  F.forEach((s, i) => texto(c, s, xs[i], y, { fuente: serif(px, true), color: i === marca ? ACENTO : TINTA, alfa }));
  return xs;
}
function medidaFrase(c: Ctx, F: string[], px = 112) {
  c.save(); c.font = serif(px, true); const esp = px * .27, ws = F.map((s) => c.measureText(s).width), tot = ws.reduce((a, b) => a + b, 0) + esp * (F.length - 1); c.restore();
  let x = 540 - tot / 2; return F.map((_, i) => { const m = x + ws[i] / 2; x += ws[i] + esp; return m; });
}

function escenaMapa(c: Ctx, t: number, d: Datos) {
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  const sale = smooth(prog(t, t0.nadie - .25, t0.nadie + .35));
  const v = vistaMapa(t), cam = camara(v, 540, 960);
  const lleg = tCaeB + .535, rev = smooth(prog(t, lleg, lleg + 1)) * (1 - sale), crece = smooth(prog(t, lleg, lleg + 1.5));
  const fuentes: Fuente[] = [];
  for (const m of d.mapa) fuentes.push({ x: m.x + .1 * Math.sin(t * .8 + m.x), y: m.y + .1 * Math.cos(t * .7 + m.y), a: m.a * crece, s: m.s });
  const R = v.dist * 1.05 + 3;
  if (rev > 0) curvas(c, cam, fuentes, {
    x0: v.tx - R * .8, x1: v.tx + R * .8, y0: v.ty - R, y1: v.ty + R, paso: .18, niveles: [.14, .3, .5, .75, 1.05, 1.45, 1.95, 2.5],
    hundir: .24, tinta: (_, i) => `rgba(17,17,17,${rev * (i % 3 === 2 ? .72 : .4)})`, grosor: (i) => (i % 3 === 2 ? 2.8 : 1.6),
  });
  c.fillStyle = TINTA;
  for (const m of d.puntos) { const p = cam.p(m.x, m.y, 0); if (!p) continue; c.globalAlpha = rev * .78; c.beginPath(); c.arc(p.x, p.y, clamp(m.r * p.s, 2, 6.5), 0, TAU); c.fill(); }
  c.globalAlpha = 1;
  const etq = (s: string, x: number, y: number, ti: number) => {
    const q = cam.p(x, y, 0); if (!q) return;
    const a = smooth(prog(t, ti, ti + .3)) * (1 - sale);
    bolaMundo(c, cam, x, y, 0, .15, TINTA, a);
    conHalo(c, s, q.x, q.y - 38, serif(94, true), TINTA, a, 12);
  };
  etq("silla", -2.25, 3.05, t0.me); etq("parque", 1.95, 3.5, t0.sen);
  etq("dinero", -2.75, -2.95, t0.elb); etq("cuenta", 2.5, -3.1, t0.cob);

  const zb = t < lleg + 3 ? caida(t - tCaeB, 4.3, .44).z : 0, [bx, by] = xyBanco(t);
  // El sitio de antes se queda marcado: son dos puntos distintos.
  const g1 = smooth(prog(t, tJal2 + .05, tJal2 + .4)) * (1 - sale);
  if (g1 > 0) anillo(c, cam, POS_S[0], POS_S[1], .46, TINTA, g1 * .85, 5);
  const g2 = smooth(prog(t, tVaiv[0] + .1, tVaiv[0] + .4)) * (1 - sale);
  if (g2 > 0) anillo(c, cam, POS_D[0], POS_D[1], .46, ACENTO, g2 * .85, 5);

  const P = cam.p(bx, by, zb + .4), xs1 = medidaFrase(c, FRASE1), xs2 = medidaFrase(c, FRASE2);
  const en1 = smooth(prog(t, t0.me - .05, t0.me + .15)), en2 = smooth(prog(t, t0.elb - .1, t0.elb + .1));
  const manda2 = t >= tJal2 && !(t >= tVaiv[0] && t < tVaiv[1]);          // cuál de las dos frases está jalando
  const manda1 = t >= tJal1 - .16 && !manda2;
  const a1 = en1 * (manda1 ? 1 : .3) * (1 - smooth(prog(t, t0.nadie - .45, t0.nadie - .12))), a2 = en2 * (manda2 ? 1 : .3);
  if (P) {
    const lan1 = ease.outCubic(prog(t, tJal1 - .14, tJal1 + .04)), lan2 = ease.outCubic(prog(t, tJal2 - .16, tJal2 + .02));
    const pul = pl(t, tJal1 + .04, 20, 3) + pl(t, tJal2 + .02, 20, 3) + pl(t, tVaiv[0] + .1, 16, 3) + pl(t, tVaiv[1], 16, 3);
    const baja = (xw: number, g: number, n: number) => { if (manda1 && t < t0.nadie) hilo(c, xw, YF1 + 24, P.x, P.y, g, t, { k: lan1, amp: pul, seed: n, soga: g >= 9, sombra: true, punta: lan1 < 1 ? 11 : 0 }); };
    const sube = (xw: number, g: number, n: number, cl = TINTA) => { if (manda2 && t < t0.nadie) hilo(c, xw, YF2 - 86, P.x, P.y, g, t, { k: lan2, amp: pul, seed: n, soga: g >= 9, sombra: true, punta: lan2 < 1 ? 11 : 0, col: cl }); };
    baja(xs1[0], 4, 700); baja(xs1[1], 20, 701); baja(xs1[2], 2.4, 702); baja(xs1[3], 3, 703);
    sube(xs2[0], 3, 710); sube(xs2[2], 5, 712); sube(xs2[3], 22, 713, ACENTO);
  }
  frase(c, FRASE1, YF1, a1, 1);
  frase(c, FRASE2, YF2, a2, 3);

  if (P && t < t0.nadie && t >= tCaeB) {
    bolaMundo(c, cam, bx, by, zb, .4, TINTA, 1);
    const r = .4 * P.s;
    conHalo(c, "banco", P.x + r + 22 + 118, P.y + 34, serif(112, true), TINTA, smooth(prog(t, t0.ban, t0.ban + .2)), 14);
  }
  rotulo(c, t, t0.mismo - .1, t0.me - .2, "no es el mismo punto", YF1, 112, TINTA);
  if (t < tCaeB + .1) {
    // Del collage a la bola: el salto que deja caer el punto.
    const sp = cam.p(0, 0, 4.3 + .4)!;
    bola(c, 540, lerp(1060, sp.y, ease.outCubic(prog(t, tVuelaB - .1, tCaeB))), .4 * sp.s);
  }
}

// ---------- 9. nadie las programó ----------
const YBM = 852, YPE = 1340, RP = 72, XMETA = 862;
const PASOS = [0, .3, .6, .9].map((q) => t0.salen + q);
const GR0 = [8, 8, 8, 8], GRF = [4, 2, 3, 22];
const VALS = [[-1.5, .6, 2, -2.2], [-.3, 1.5, 1.2, -1], [-1.2, .2, 2.3, .4], [-1.8, -.6, 1.5, 1.6], [-2.4, -1, 1, 2.7]];
const XBOLA = [176, 408, 590, 730, 846];
const angPer = (v: number) => -Math.PI / 2 + v * Math.PI / 4;

function perilla(c: Ctx, x: number, y: number, R: number, ang: number) {
  c.fillStyle = "rgba(20,18,14,.16)"; circulo(c, x + 7, y + 11, R * 1.08);
  c.fillStyle = "#151514"; c.beginPath();
  const N = 22;
  for (let i = 0; i < N * 2; i++) { const a = ang + i * Math.PI / N, r = R * (i % 2 ? 1.05 : .985); if (i === 0) c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  c.closePath(); c.fill();
  const G = c.createConicGradient(-.9, x, y);
  [["#E4E1D9", 0], ["#8D8B85", .13], ["#DCD9D1", .26], ["#74726C", .39], ["#D2CFC7", .5], ["#7F7D77", .63], ["#E6E3DB", .76], ["#7A7872", .89], ["#E4E1D9", 1]].forEach(([k, s]) => G.addColorStop(s as number, k as string));
  c.fillStyle = "#050505"; circulo(c, x, y, R * .8);
  c.fillStyle = G; circulo(c, x, y, R * .74);
  c.strokeStyle = TINTA; c.lineWidth = R * .08; c.lineCap = "round";
  linea(c, x + Math.cos(ang) * R * .2, y + Math.sin(ang) * R * .2, x + Math.cos(ang) * R * .66, y + Math.sin(ang) * R * .66);
  c.fillStyle = ACENTO; circulo(c, x + Math.cos(ang) * R * .9, y + Math.sin(ang) * R * .9, R * .07);
}

function perillas(c: Ctx, t: number) {
  const entra = smooth(prog(t, t0.nadie, t0.nadie + .3));
  const sale = ease.inCubic(prog(t, t0.en17 - .3, t0.en17 + .2));
  if (entra <= 0) return;
  const xs = medidaFrase(c, FRASE2);
  let n = 0;
  PASOS.forEach((p, i) => { n = lerp(n, i + 1, ease.outBack(prog(t, p, p + .2), 2)); });
  const fi = clamp(Math.floor(n), 0, VALS.length - 2), fr = n - fi;
  const cam = camara(vistaMapa(t0.nadie), 540, 960), o = cam.p(POS_D[0], POS_D[1], .4)!, llega = ease.inOutCubic(prog(t, t0.nadie, t0.nadie + .5));
  const xb = lerp(o.x, lerp(XBOLA[fi], XBOLA[fi + 1], fr), llega), yb = lerp(o.y, YBM + 8 * vaiven(t, 2.9), llega);
  const cae = sale * 900;                                            // al salir, todo se va por abajo
  const yp = (_i: number) => YPE + cae, po = (i: number) => clamp(resorte(t - (t0.nadie + .22 + i * .09), 2.6, .42), 0, 1.15);
  xs.forEach((x, i) => {
    const v = lerp(VALS[fi][i], VALS[fi + 1][i], fr), g = lerp(GR0[i], GRF[i], clamp(n / 4));
    const am = PASOS.reduce((a, p) => a + pl(t, p + .04, 14, 3.4), 0);
    if (po(i) > .02) {
      hilo(c, x, yp(i) - RP, xb, yb + cae, g, t, { k: clamp(po(i)), amp: am, seed: 800 + i, sombra: true, soga: g >= 9, col: i === 3 ? ACENTO : TINTA, alfa: entra });
      c.save(); c.translate(x, yp(i)); c.scale(po(i), po(i)); perilla(c, 0, 0, RP, angPer(v) + .05 * Math.sin(t * 1.3 + i)); c.restore();
    }
  });
  // El error es la distancia entre la bola y donde debía caer.
  const aE = smooth(prog(t, t0.salen - .25, t0.salen));
  if (aE > 0) {
    const y = YBM - 96 + cae;
    c.save(); c.globalAlpha = aE; c.fillStyle = ACENTO; c.fillRect(Math.min(xb, XMETA), y - 12, Math.max(Math.abs(XMETA - xb), 4), 24); c.restore();
    texto(c, "error", 540, y - 44, { fuente: serif(150, true), color: ACENTO, alfa: aE * (1 - smooth(prog(t, t0.como, t0.como + .3))) });
  }
  c.save(); c.globalAlpha = entra * .9; c.strokeStyle = TINTA; c.lineWidth = 5; c.setLineDash([12, 10]); c.beginPath(); c.arc(XMETA, YBM + cae, 58, t * .5, t * .5 + TAU); c.stroke(); c.setLineDash([]); c.restore();
  bola(c, xb, yb + cae, 46);
  const fin = t0.como - .04, e = prog(t, fin, fin + .7);
  if (e > 0 && e < 1) { c.save(); c.globalAlpha = (1 - e) * .8; c.strokeStyle = ACENTO; c.lineWidth = 8; c.beginPath(); c.arc(XMETA, YBM, 62 + e * 300, 0, TAU); c.stroke(); c.restore(); }
}

function escenaPerillas(c: Ctx, t: number, d: Datos) {
  escenaMapa(c, t, d);
  perillas(c, t);
  rotulo(c, t, t0.nadie - .05, t0.salen - .2, "Nadie programó", 230, 132, TINTA);
  rotulo(c, t, t0.mir - .34, t0.salen - .2, "esas miradas", 366, 132, TINTA, true);
}

// ---------- 10. el artículo ----------
const LIN = [
  { s: "La atención", y: 420, ti: t0.la + .02 },
  { s: "es todo", y: 690, ti: t0.es - .04 },
  { s: "lo que", y: 960, ti: t0.lo - .04 },
  { s: "necesitas.", y: 1230, ti: t0.nec - .04 },
];
const ALTOT = 232, ANT = 432, PXT = 196;
const cuelgue = (t: number, ti: number) => (t > ti ? 1 - Math.min(resorte(t - ti, 2.4, .36), 1.1) : 1) * -170;
function vaivenCadena(t: number, k: number) {
  let r = .006 * Math.sin(t * 1.3 + k);
  LIN.forEach((L, j) => { if (t > L.ti && j >= k - 1) r += .026 * Math.exp(-(t - L.ti) * 1.5) * Math.sin((t - L.ti) * 5.6 + k * .5) * (j === k ? 1 : .6); });
  if (t > t0.ten) r += .06 * Math.exp(-(t - t0.ten) * 1.35) * Math.sin((t - t0.ten) * 5.2 + k * .5);
  return r;
}
function articulo(c: Ctx, t: number) {
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  pelusas(c, t, .2);
  const baja = ease.inOutCubic(prog(t, t0.de - .2, t0.tt - .1)), sub = lerp(0, 452, baja);
  c.save(); camaraPlana(c, 1 + .012 * vaiven(t, 5.3), 540 + 7 * vaiven(t, 6.3), 960 + 8 * vaiven(t, 4.1, 1) + sub, .002 * vaiven(t, 7.1));

  // 2017 cae como un peso.
  const cae = t0.en17 + .55, q = resorte(t - (cae - .24), 3, .36), y17 = lerp(-300, 700, Math.min(q, 1.14)), sube = ease.inOutCubic(prog(t, t0.tit - .3, t0.tit + .22));
  const yFin = lerp(y17, 190, sube), pxA = lerp(350, 104, sube), aG = smooth(prog(t, t0.goo - .05, t0.goo + .12));
  if (t > cae - .3) { c.save(); c.translate(lerp(540, 372, sube), yFin); c.scale(pxA / 350, pxA / 350); texto(c, "2017", 0, 124, { fuente: serif(350), color: TINTA }); c.restore(); }
  texto(c, "Google", lerp(540, 650, sube), lerp(1020, 228, sube), { fuente: serif(Math.round(lerp(160, 104, sube)), true), color: TINTA, alfa: aG });
  rotulo(c, t, t0.tit + .12, t0.la - .16, "un título", 860, 150, TINTA);
  rotulo(c, t, t0.ins - .1, t0.la - .16, "casi insolente", 1030, 170, ACENTO, true);
  if (t > cae) astillas(c, 540, 840, t - cae - .15, 700, 30, 700, 640);

  // Los que lo firmaron: ocho bolitas que entran rodando y se van al llegar el título.
  const ve = ease.inOutCubic(prog(t, t0.art - .25, t0.tit + .15));
  if (t > t0.inv - .1 && ve < 1) for (let i = 0; i < 8; i++) {
    const a = t0.inv - .08 + i * .075, e = ease.outBack(prog(t, a, a + .3), 1.5), x = lerp(-60, 170 + i * 106, e) + ve * 1400, y = 1198 - 60 * Math.abs(Math.sin(prog(t, a, a + .3) * Math.PI)) - 12 * Math.abs(Math.sin(t * 5 + i));
    bola(c, x, y, 34);
  }

  // Dos hilos bajan del techo y esperan tensos; cada renglón cuelga del anterior.
  const lanz = ease.outCubic(prog(t, t0.tit, t0.ins)), XI = [-372, 372], tiembla = pl(t, t0.ins + .1, 8, 1) + 1.8;
  LIN.forEach((L, k) => {
    const en = t > L.ti, r = vaivenCadena(t, k), cy = L.y + cuelgue(t, L.ti);
    XI.forEach((xr, j) => {
      const yy = cy - ALTOT / 2 + Math.sin(r) * xr, xx = 540 + xr * Math.cos(r);
      if (k === 0 && !en) { hilo(c, 540 + xr, -30, 540 + xr, lerp(-30, 300, lanz), 3.6, t, { amp: tiembla, seed: 900 + j, punta: lanz < 1 ? 9 : 0, nudos: false }); return; }
      if (!en) return;
      const rp = k === 0 ? 0 : vaivenCadena(t, k - 1), Lp = LIN[Math.max(k - 1, 0)];
      const xp = k === 0 ? 540 + xr : 540 + xr * Math.cos(rp), yp = k === 0 ? -30 : Lp.y + cuelgue(t, Lp.ti) + ALTOT / 2 + Math.sin(rp) * xr;
      hilo(c, xp, yp, xx, yy, 3.6, t, { amp: pl(t, L.ti + .1, 10, 2.6) + pl(t, t0.ten, 9, 2) + 1, seed: 900 + j + k * 3 });
    });
  });
  for (let k = LIN.length - 1; k >= 0; k--) {
    const L = LIN[k], en = t > L.ti, r = vaivenCadena(t, k), cy = L.y + cuelgue(t, L.ti);
    if (en) {
      c.save(); c.translate(540, cy); c.rotate(r);
      c.fillStyle = "rgba(20,18,14,.12)"; c.fillRect(-ANT + 8, -ALTOT / 2 + 12, ANT * 2, ALTOT);
      c.fillStyle = "#FBFAF6"; c.fillRect(-ANT, -ALTOT / 2, ANT * 2, ALTOT);
      c.strokeStyle = "rgba(17,17,17,.3)"; c.lineWidth = 2; c.strokeRect(-ANT, -ALTOT / 2, ANT * 2, ALTOT);
      if (k === 1) {
        c.font = serif(PXT); const w0 = c.measureText("es ").width, w1 = c.measureText("todo").width;
        texto(c, "es ", -(w0 + w1) / 2, 62, { fuente: serif(PXT), color: TINTA, alin: "left" });
        texto(c, "todo", -(w0 + w1) / 2 + w0, 62, { fuente: serif(PXT), color: ACENTO, alin: "left" });
      } else texto(c, L.s, 0, 62, { fuente: serif(PXT, k === 3), color: TINTA });
      c.restore();
    }
  }

  // La T de ChatGPT sale de ahí.
  if (t > t0.de - .1) {
    const r = vaivenCadena(t, 3), yCola = 1230 + ALTOT / 2 + cuelgue(t, LIN[3].ti) + Math.sin(r) * 150;
    const ta = ease.outCubic(prog(t, t0.sale - .2, t0.tt - .02)), xT = 826, yT = 1790;
    hilo(c, 690, yCola, xT, yT - 176, lerp(5, 20, ta), t, { k: ta, col: ACENTO, soga: true, amp: pl(t, t0.tt, 30, 3), seed: 950, punta: 14, sombra: true });
    if (t > t0.tt - .04) {
      const e = ease.outBack(prog(t, t0.tt - .04, t0.tt + .2), 2);
      c.save(); c.translate(xT, yT); c.scale(e, e); texto(c, "T", 0, 0, { fuente: serif(250), color: ACENTO }); c.restore();
      c.save(); c.font = serif(250); const wT = c.measureText("T").width; c.restore();
      texto(c, "ChatGP", xT - wT / 2 - 3, yT, { fuente: serif(250), color: TINTA, alin: "right", alfa: smooth(prog(t, t0.gpt - .05, t0.gpt + .18)) });
      texto(c, "de Transformer", 540, yT + 128, { fuente: serif(100, true), color: "#55534E", alfa: smooth(prog(t, t0.gpt + .12, t0.gpt + .34)) });
    }
  }
  c.restore();
}

// ---------- 11. sola ----------
const YSOLA = 1400, tNegro = t0.gptF + .55;
function final(c: Ctx, t: number) {
  c.fillStyle = NOCHE; c.fillRect(0, 0, 1080, 1920);
  pelusas(c, t, .14, LUZ);
  const z = 1 + .022 * prog(t, tNegro, t0.sig) + .02 * prog(t, t0.sig, t0.sig + 7);
  c.save(); camaraPlana(c, z, 540 + 7 * vaiven(t, 6.1), 1040 + 9 * vaiven(t, 4.3, 1), .0025 * vaiven(t, 7.3));
  const sola = 1 - .84 * smooth(prog(t, t0.sola, t0.nada + .3));
  const tl = t0.miraF - .1, luz = smooth(prog(t, tl + .22, tl + .4));
  const sep = 28 * smooth(prog(t, t0.casi, t0.nada + .4)) * (1 - luz);
  // Hilos cortados que se caen.
  for (let i = 0; i < 7; i++) {
    const e = t - tNegro, x = 150 + i * 130 + 18 * Math.sin(i * 2.4), yy = e * (90 + i * 16) + e * e * 130;
    hilo(c, x, YSOLA - 330 + yy, x + 40 * Math.sin(i * 1.7) + e * 10, YSOLA - 150 + yy, 3.4, t, { col: LUZ, sag: 18, seed: i + 960, alfa: (1 - smooth(prog(e, .5, 2.1))) * .7, nudos: false });
  }
  letras(c, "chica", 540, YSOLA, serif(320, true), tinta("#4a4945", LUZ, Math.max(sola, luz)), 1, (i) => [(i - 2) * sep, 5 * Math.sin(t * .9 + i * 1.4) * (1 - luz), .012 * Math.sin(t * .7 + i) * (1 - luz)]);
  // La última frase, de arriba abajo; de «mira» baja el último hilo.
  const ll = (s: string, y: number, ti: number, px: number, col2: string, it = false) => {
    if (t <= ti) return;
    const q = lerp(.86, 1, ease.outBack(prog(t, ti, ti + .24)));
    c.save(); c.translate(540, y); c.scale(q, q); texto(c, s, 0, 0, { fuente: serif(px, it), color: col2, alfa: smooth(prog(t, ti, ti + .1)) }); c.restore();
  };
  ll("Significa", 420, t0.sig - .02, 190, LUZ);
  ll("según a quién", 600, t0.seg2 - .04, 160, LUZ);
  ll("mira.", 840, t0.mira2 - .06, 240, ACENTO, true);
  if (t > tl - .02) {
    const k = ease.outCubic(prog(t, tl - .02, tl + .22));
    hilo(c, 540, 884, 540, YSOLA - 214, 24, t, { k, col: ACENTO, soga: true, amp: pl(t, tl + .22, 40, 1.05), seed: 990, punta: 16, fase: (t - tl) * 74 });
  }
  const e = prog(t, tl + .22, tl + 1.4);
  if (e > 0 && e < 1) { c.save(); c.globalAlpha = (1 - e) * .75; c.strokeStyle = ACENTO; c.lineWidth = 7; c.beginPath(); c.arc(540, YSOLA - 90, 170 + e * 560, 0, TAU); c.stroke(); c.restore(); }
  c.restore();
}

// ---------- el montaje ----------
function dibuja(c: Ctx, t: number, d: Datos) {
  if (t < M1) { c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920); pelusas(c, t, .2); golpe(c, t, d); }
  else if (t < t0.porq) cartel(c, t, d);
  else if (t < AT0 + .3) { lectura(c, t, d); if (t > AT0) { c.save(); c.globalAlpha = smooth(prog(t, AT0, AT0 + .3)); atencion(c, t, d); c.restore(); } }
  else if (t < t0.cada) atencion(c, t, d);
  else if (t < t0.chi) { todas(c, t, d); palabraAten(c, t); }
  else if (t < t0.yse) escenaBusca(c, t, d);
  else if (t < tVuelaB) mezcla(c, t, d);
  else if (t < t0.en17 + .2) escenaPerillas(c, t, d);
  else if (t < tNegro) articulo(c, t);
  else final(c, t);
}
void mono;

export const Pieza: React.FC = () => <Lienzo dibuja={dibuja} preparar={prepara} />;
