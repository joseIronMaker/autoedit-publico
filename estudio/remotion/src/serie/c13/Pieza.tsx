// Epílogo. «No ve palabras: ve pedazos.» Una tira de papel de teletipo y unas tijeras de acero que la cortan donde
// tú nunca cortarías. Cada pedazo se voltea y por detrás es un número de una cajonera de ~200,000 cajones.
// Todos los cortes, números y fusiones salen de t.json, que partitura.py mide con tiktoken (o200k_base, GPT-4o):
// aquí no hay un solo token escrito a mano.
import React from "react";
import { azar, caida, camara, clamp, ease, lerp, prog, resorte, smooth, texto } from "../../kit";
import type { Cam, Vista } from "../../kit";
import { ACENTO, bola, GRIS, Lienzo, LUZ, mono, NOCHE, PAPEL, rotulo, serif, sombra, TINTA } from "../../marca";
import duracion from "./duracion.json";
import KJ from "./t.json";

export const DURACION = duracion.dur;
type Ctx = CanvasRenderingContext2D;
type Tok = [string, number];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const K = KJ as unknown as Record<string, any>;
const DT = K.datos;
const FRASE: Tok[] = DT.frase, FIESTA: Tok[] = DT.fiesta, INOL: Tok[] = DT.inol, OTO: Tok[] = DT.oto, FERRO: Tok[] = DT.ferro;
const PERRO: Tok[] = DT.perro, PUENTE: Tok[] = DT.puente, FINAL: Tok[] = DT.final, LISTA: Tok[] = DT.lista;
const TAU = Math.PI * 2;

// ---------- utilidades ----------
const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * TAU + f);
const hash = (i: number, j = 0) => { const s = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453; return s - Math.floor(s); };
function linea(c: Ctx, ax: number, ay: number, bx: number, by: number) { c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); }
function circulo(c: Ctx, x: number, y: number, r: number) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
const ob = (x: number, s = 1.70158) => (x <= 0 ? 0 : ease.outBack(x, s));
const pop = (t: number, ti: number, d = .26, s = 1.8) => ob(prog(t, ti, ti + d), s);
const tiembla = (t: number, ti: number, a = 1, w = 30, k = 9) => (t > ti ? a * Math.exp(-(t - ti) * k) * Math.sin((t - ti) * w) : 0);
const dentro = (t: number, a: number, b: number, fa = .3, fb = .3) => smooth(prog(t, a - fa, a)) * (1 - smooth(prog(t, b, b + fb)));
/** Recorre claves [t, valor] sin paradas secas: lineal entre claves, con curva propia en la primera y la última. */
function claves(t: number, P: [number, number][], ini = ease.inOutCubic, fin = ease.outCubic) {
  if (t <= P[0][0]) return P[0][1];
  for (let i = 1; i < P.length; i++) {
    if (t <= P[i][0]) {
      const k = prog(t, P[i - 1][0], P[i][0]);
      const f = i === 1 ? ini : i === P.length - 1 ? fin : (x: number) => x;
      return lerp(P[i - 1][1], P[i][1], f(k));
    }
  }
  return P[P.length - 1][1];
}

// ---------- medir texto ----------
let MC: CanvasRenderingContext2D | null = null;
const memo = new Map<string, number>();
function W(s: string, f: string) {
  const k = f + "|" + s; let v = memo.get(k);
  if (v === undefined) { MC!.font = f; v = MC!.measureText(s).width; memo.set(k, v); }
  return v;
}

// ---------- el pedazo de papel ----------
const ESP = .3;                                         // ancho del espacio, que es parte del pedazo
const PAD = .22;
const wTexto = (s: string, px: number) => { const sp = s.startsWith(" "); return W(sp ? s.slice(1) : s, serif(px)) + (sp ? px * ESP : 0); };
const wNum = (n: number, npx: number) => W(String(n), mono(npx));
const wCarta = (s: string, px: number, num?: number, npx?: number, flip = 1) =>
  Math.max(wTexto(s, px) + 2 * px * PAD, num === undefined ? 0 : lerp(0, wNum(num, npx ?? px * .62) + 2 * px * PAD, flip));

/** El espacio de antes: una marca discreta, como ␣. */
function marcaEsp(c: Ctx, x: number, y: number, px: number, a: number) {
  if (a <= .01) return;
  c.save(); c.globalAlpha *= a; c.strokeStyle = GRIS; c.lineWidth = Math.max(2, px * .028); c.lineCap = "round"; c.lineJoin = "round";
  const w = px * .19, h = px * .1, x0 = x + px * .05;
  c.beginPath(); c.moveTo(x0, y - h); c.lineTo(x0, y); c.lineTo(x0 + w, y); c.lineTo(x0 + w, y - h); c.stroke(); c.restore();
}
/** Escribe un token: la marca ocupa el lugar del espacio. alin "left" empieza en x; "center" lo centra. */
function escribe(c: Ctx, s: string, x: number, y: number, px: number, o: { ac?: number; marca?: number; left?: boolean; color?: string; quitaEsp?: number } = {}) {
  const sp = s.startsWith(" "), core = sp ? s.slice(1) : s, wm = sp ? px * ESP * (1 - (o.quitaEsp ?? 0)) : 0, tot = wm + W(core, serif(px));
  const x0 = o.left ? x : x - tot / 2, A = c.globalAlpha;
  if (sp) marcaEsp(c, x0, y, px, (o.marca ?? 1) * (1 - (o.quitaEsp ?? 0)));
  texto(c, core, x0 + wm, y, { fuente: serif(px), color: o.color ?? TINTA, alin: "left", alfa: A });
  if ((o.ac ?? 0) > .01) texto(c, core, x0 + wm, y, { fuente: serif(px), color: ACENTO, alin: "left", alfa: A * (o.ac ?? 0) });
}
type CO = { px: number; num?: number; npx?: number; flip?: number; a?: number; rot?: number; ac?: number; marca?: number; borde?: number; perf?: boolean;
  w?: number; h?: number; papel?: number; sem?: number; t?: number; esc?: number; sombra?: number; numAc?: number };
function bordeMano(c: Ctx, x0: number, y0: number, x1: number, y1: number, r: () => number, lados = [1, 1, 1, 1]) {
  const j = () => (r() - .5) * 2.6;
  const P = [[x0 + j(), y0 + j()], [x1 + j(), y0 + j()], [x1 + j(), y1 + j()], [x0 + j(), y1 + j()]];
  const a0 = c.globalAlpha;
  for (let i = 0; i < 4; i++) {
    if (lados[i] <= .01) continue;
    c.globalAlpha = a0 * Math.min(lados[i], 1);
    const a = P[i], b = P[(i + 1) % 4];
    linea(c, a[0], a[1], b[0], b[1]);
  }
  c.globalAlpha = a0;
}
/** Un pedazo suelto. flip 0 = el texto, 1 = el número de atrás. */
function carta(c: Ctx, x: number, y: number, s: string, o: CO) {
  const a = o.a ?? 1; if (a <= .01) return;
  const px = o.px, npx = o.npx ?? px * .62, h = o.h ?? px * 1.42;
  const w = o.w ?? wCarta(s, px, o.num, npx, o.flip ?? 0);
  const sx = Math.cos((o.flip ?? 0) * Math.PI), atras = sx < 0;
  const e = o.esc ?? 1;
  c.save(); c.translate(x, y); c.rotate(o.rot ?? 0); c.scale(Math.max(Math.abs(sx), .02) * e, e);
  const pap = o.papel ?? 1, sb = (o.sombra ?? 1) * pap;
  if (sb > .01) { c.globalAlpha = a * sb; c.fillStyle = "rgba(20,18,14,.11)"; c.fillRect(-w / 2 + 6, -h / 2 + 10, w, h); }
  if (pap > .01) {
    c.globalAlpha = a * pap; c.fillStyle = atras ? "#E8E3D6" : "#FCFBF7"; c.fillRect(-w / 2, -h / 2, w, h);
    if (o.perf) { c.fillStyle = "#DCD8CD"; for (let k = -w / 2 + 22; k < w / 2 - 12; k += 46) { circulo(c, k, -h / 2 + 13, 5); circulo(c, k, h / 2 - 13, 5); } }
    const bo = o.borde ?? 1;
    if (bo > .01) { c.globalAlpha = a * pap * bo; c.strokeStyle = TINTA; c.lineWidth = 3; c.lineCap = "round"; bordeMano(c, -w / 2, -h / 2, w / 2, h / 2, azar(Math.floor((o.t ?? 0) * 10) * 31 + (o.sem ?? 0) * 7)); }
  }
  c.globalAlpha = a;
  if (atras) {
    if (o.num !== undefined) {
      texto(c, String(o.num), 0, npx * .36, { fuente: mono(npx), color: TINTA, alfa: a });
      if ((o.numAc ?? 0) > .01) texto(c, String(o.num), 0, npx * .36, { fuente: mono(npx), color: ACENTO, alfa: a * (o.numAc ?? 0) });
    }
  } else escribe(c, s, 0, px * .3, px, { ac: o.ac, marca: o.marca });
  c.restore();
}

// ---------- la tira: pedazos que todavía no se separan ----------
type Tira = { toks: Tok[]; px: number; x: number[]; adv: number[]; fin: number; h: number };
function mkTira(toks: Tok[], px: number): Tira {
  let x = 0; const xs: number[] = [], adv: number[] = [];
  for (const [s] of toks) { const w = wTexto(s, px); xs.push(x); adv.push(w); x += w; }
  return { toks, px, x: xs, adv, fin: x, h: px * 1.42 };
}
const SEP = 16, GAP = 64;                                // relleno de cada lado al separarse y empuje de cada corte
type TO = { M: number; MR: number; sep: (j: number) => number; push: (k: number) => number; marca?: number; rot?: (k: number) => number; dy?: (k: number) => number;
  ac?: (k: number) => number; a?: number; perf?: boolean };
function geomTira(T: Tira, sx: number, o: TO, k: number) {
  const n = T.toks.length, sl = k === 0 ? 0 : o.sep(k), sr = k === n - 1 ? 0 : o.sep(k + 1);
  const L = sx + T.x[k] + o.push(k) - (k === 0 ? o.M : sl * SEP), R = sx + T.x[k] + T.adv[k] + o.push(k) + (k === n - 1 ? o.MR : sr * SEP);
  return { L, R, sl, sr, cx: (L + R) / 2 };
}
function pintaTira(c: Ctx, T: Tira, t: number, sx: number, y: number, o: TO) {
  const n = T.toks.length, h = T.h, a = o.a ?? 1;
  if (a <= .01) return;
  for (let pase = 0; pase < 2; pase++) for (let k = 0; k < n; k++) {
    const g = geomTira(T, sx, o, k);
    if (g.R < -80 || g.L > 1160) continue;
    const rot = o.rot ? o.rot(k) : 0, dy = o.dy ? o.dy(k) : 0;
    c.save(); c.translate(g.cx, y + dy); c.rotate(rot); c.globalAlpha = a;
    const x0 = g.L - g.cx, x1 = g.R - g.cx;
    if (pase === 0) {
      c.fillStyle = "rgba(20,18,14,.1)"; c.fillRect(x0 + 6, -h / 2 + 10, x1 - x0, h);
    } else {
      c.fillStyle = "#FCFBF7"; c.fillRect(x0 - .6, -h / 2, x1 - x0 + 1.2, h);
      if (o.perf !== false) {
        c.fillStyle = "#DCD8CD"; const base = sx + o.push(k) - g.cx;
        for (let m = Math.ceil((x0 + 14 - base) / 52); base + m * 52 < x1 - 10; m++) { circulo(c, base + m * 52, -h / 2 + 14, 5.5); circulo(c, base + m * 52, h / 2 - 14, 5.5); }
      }
      c.strokeStyle = TINTA; c.lineWidth = 3.2; c.lineCap = "round";
      const r = azar(Math.floor(t * 10) * 17 + k * 5);
      bordeMano(c, x0, -h / 2, x1, h / 2, r, [1, k === n - 1 ? 1 : g.sr, 1, k === 0 ? 1 : g.sl]);
      c.globalAlpha = a;
      escribe(c, T.toks[k][0], T.x[k] + sx + o.push(k) - g.cx, T.px * .3, T.px, { left: true, ac: o.ac ? o.ac(k) : 0, marca: (o.marca ?? 1) * g.sl });
    }
    c.restore();
  }
}

// ---------- las tijeras de acero ----------
function hoja(c: Ctx, lado: number, ab: number, sombraP: boolean) {
  c.save(); if (sombraP) c.translate(14, 18); c.scale(lado, 1); c.rotate(ab);
  const L = 340;
  c.beginPath(); c.moveTo(3, -30); c.lineTo(3, L); c.quadraticCurveTo(-8, L - 44, -20, L - 130); c.quadraticCurveTo(-46, 130, -42, 12); c.quadraticCurveTo(-34, -34, 3, -30); c.closePath();
  if (sombraP) { c.fillStyle = "rgba(20,18,14,.12)"; c.fill(); }
  else {
    const g = c.createLinearGradient(-46, 0, 4, 0);
    g.addColorStop(0, "#8F8C85"); g.addColorStop(.38, "#E9E7E1"); g.addColorStop(.7, "#BDBAB2"); g.addColorStop(.92, "#F4F2EC"); g.addColorStop(1, "#9E9B94");
    c.fillStyle = g; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 3; c.lineJoin = "round"; c.stroke();
    c.strokeStyle = "rgba(20,18,14,.35)"; c.lineWidth = 1.6; linea(c, -6, 0, -4, L - 36);
  }
  // el mango: negro, con su ojo
  c.strokeStyle = sombraP ? "rgba(20,18,14,.12)" : TINTA; c.lineCap = "round";
  c.lineWidth = 26; c.beginPath(); c.moveTo(-10, -16); c.quadraticCurveTo(16, -100, 50, -168); c.stroke();
  c.lineWidth = 24; c.beginPath(); c.ellipse(84, -246, 52, 74, -.32, 0, TAU); c.stroke();
  if (!sombraP) { c.strokeStyle = "rgba(255,255,255,.18)"; c.lineWidth = 4; c.beginPath(); c.ellipse(84, -246, 60, 82, -.32, 3.6, 4.6); c.stroke(); }
  c.restore();
}
function tijeras(c: Ctx, x: number, y: number, ab: number, esc = 1, alfa = 1, rot = 0) {
  if (alfa <= .01) return;
  c.save(); c.globalAlpha = alfa; c.translate(x, y); c.rotate(rot); c.scale(esc, esc);
  hoja(c, -1, ab, true); hoja(c, 1, ab, true);
  hoja(c, -1, ab, false); hoja(c, 1, ab, false);
  const g = c.createRadialGradient(-5, -6, 2, 0, 0, 17); g.addColorStop(0, "#F4F2EC"); g.addColorStop(1, "#77746E");
  c.fillStyle = TINTA; circulo(c, 0, 0, 19); c.fillStyle = g; circulo(c, 0, 0, 15);
  c.strokeStyle = "#3A3936"; c.lineWidth = 3; linea(c, -9, -4, 9, 4);
  c.restore();
}
/** Abertura: cerrada en cada corte, se vuelve a abrir. */
function abertura(t: number, cortes: number[], base = .33) {
  let k = 0;
  for (const s of cortes) { const d = t - s; if (d > -.075 && d < .24) k = Math.max(k, d < 0 ? smooth((d + .075) / .075) : 1 - smooth(d / .24)); }
  return base * (1 - k) + .012;
}
/** Polvo de papel que salta en el corte. */
function virutas(c: Ctx, x: number, y: number, t: number, cortes: number[]) {
  for (let i = 0; i < cortes.length; i++) {
    const e = t - cortes[i]; if (e < 0 || e > .5) continue;
    const r = azar(i * 41 + 7);
    for (let k = 0; k < 9; k++) {
      const vx = (r() - .5) * 420, vy = -120 - r() * 260, px = x + vx * e, py = y + vy * e + 900 * e * e;
      c.globalAlpha = 1 - e / .5; c.fillStyle = r() < .3 ? ACENTO : "#B9B4A8"; c.fillRect(px, py, 5, 3);
    }
  }
  c.globalAlpha = 1;
}

// ---------- fondo vivo ----------
const LET = "abcdefghijklmnopqrstuvwxyzáéíóúñ";
function fondo(c: Ctx, t: number, a = 1) {
  if (a <= .01) return;
  const r = azar(913);
  c.save(); c.fillStyle = "#D9D5CB";
  for (let i = 0; i < 46; i++) {
    const x0 = r() * 1200 - 60, y0 = r() * 2100, v = 14 + r() * 26, ch = LET[Math.floor(r() * LET.length)], px = 22 + r() * 26, f = r() * 6;
    const y = ((y0 - t * v) % 2100 + 2100) % 2100 - 90, x = x0 + 20 * Math.sin(t * .4 + f);
    c.globalAlpha = a * .55; c.font = serif(Math.round(px), i % 3 === 0); c.fillText(ch, x, y);
  }
  c.restore();
}

/** Una banda de papel detrás de un texto que va sobre otra cosa: nunca texto encima de un dibujo. */
function placa(c: Ctx, y0: number, y1: number, a: number) {
  if (a <= .01) return;
  c.save(); c.globalAlpha = a;
  const g = c.createLinearGradient(0, y0 - 40, 0, y1 + 40);
  g.addColorStop(0, "rgba(244,242,236,0)"); g.addColorStop(40 / (y1 - y0 + 80), "rgba(244,242,236,.97)"); g.addColorStop(1 - 40 / (y1 - y0 + 80), "rgba(244,242,236,.97)"); g.addColorStop(1, "rgba(244,242,236,0)");
  c.fillStyle = g; c.fillRect(-80, y0 - 40, 1240, y1 - y0 + 80); c.restore();
}

// ---------- 1. la bola lee palabras ----------
const XB = 330, YT1 = 980, PX1 = 150;
const GR1 = [[0], [1], [2, 3], [4], [5, 6, 7], [8], [9], [10]];
const RB = 46;
let TF: Tira;
const centroGrupo = (T: Tira, g: number[]) => { const a = T.x[g[0]] + (T.toks[g[0]][0].startsWith(" ") ? T.px * ESP : 0), b = T.x[g[g.length - 1]] + T.adv[g[g.length - 1]]; return (a + b) / 2; };
function sx1(t: number) {
  const H: number[] = K.hops, cw = GR1.map((g) => centroGrupo(TF, g));
  const P: [number, number][] = [[0, 430], [.8, XB + 100 - cw[0]], [H[0] - .34, XB + 70 - cw[0]]];
  H.forEach((h: number, i: number) => P.push([h, XB - cw[i]]));
  let s = claves(t, P, ease.outCubic, (x) => x);
  if (t > H[7]) s += -6 * Math.sin(Math.min(t - H[7], 1.2) * 1.3);
  const cB = centroGrupo(TF, [2, 3, 4, 5, 6, 7]);
  return lerp(s, 540 - cB, ease.inOutCubic(prog(t, K.rebob, K.rebob + .62)));
}
function bola1(t: number) {
  const H: number[] = K.hops, top = YT1 - TF.h / 2;
  const cd = K.caida;
  let x = XB, z = 0;
  if (t < H[0] - .34) z = caida(t - cd.t0, cd.h, cd.rest, cd.g).z * 165;
  else if (t < H[7]) {
    let a = H[0] - .34, b = H[0];
    for (let i = 0; i < 8; i++) { if (t >= H[i]) { a = H[i]; b = H[i + 1] ?? H[i] + .4; } }
    const u = prog(t, a, b), hh = clamp((b - a) * 300, 34, 120);
    z = 4 * hh * u * (1 - u);
  } else {
    z = Math.abs(tiembla(t, H[7], 18, 16, 6));
  }
  // rebobinado: un salto largo hacia «aprendió»
  const kr = prog(t, K.rebob, K.rebob + .62);
  if (kr > 0) {
    const cA = centroGrupo(TF, [2, 3]), xf = sx1(K.rebob + .62) + cA;
    x = lerp(XB, xf, ease.inOutCubic(kr)); z += 4 * 170 * kr * (1 - kr);
    if (kr >= 1) z = Math.abs(tiembla(t, K.rebob + .62, 22, 18, 7));
  }
  return { x, y: top - RB - z, z, top };
}
const TO1 = (t: number): TO => ({ M: 620, MR: 220, sep: () => 0, push: () => 0, marca: 0 });

function escena1(c: Ctx, t: number) {
  const sx = sx1(t);
  // de cerca mientras lee; «te simplifiqué algo» abre el plano
  const zc = lerp(1.32, 1, ease.inOutCubic(prog(t, K.rebob - .1, K.rebob + .7)));
  c.save(); c.translate(XB, YT1); c.scale(zc, zc); c.translate(-XB, -YT1);
  pintaTira(c, TF, t, sx, YT1, { ...TO1(t), ac: (k) => (k >= 8 && k <= 10 ? smooth(prog(t, K.pal - .2, K.pal + .1)) * (1 - smooth(prog(t, K.rebob, K.rebob + .4))) : 0) });
  const b = bola1(t);
  sombra(c, b.x, b.top + 4, RB * 1.5 + b.z * .1, .3 / (1 + b.z * .012));
  bola(c, b.x, b.y, RB);
  c.restore();
  rotulo(c, t, K.simp + .1, K.negro - .1, "Te simplifiqué algo.", 560, 112, TINTA, true);
  // un amago desde la esquina: algo se va a cortar
  const amA = ease.outCubic(prog(t, .12, .55)), amB = ease.inCubic(prog(t, 1.25, 1.85));
  if (amA > 0 && amB < 1) tijeras(c, lerp(1260, 900, amA) + 420 * amB, lerp(-260, 330, amA) - 600 * amB, abertura(t, K.amago) * 1.1, .92, 1, .62);
}

// ---------- 2. el negro: las rayas de corte no caen entre palabras ----------
function escenaNegro(c: Ctx, t: number) {
  c.fillStyle = NOCHE; c.fillRect(-80, -80, 1240, 2080);
  const z = 1 + .05 * prog(t, K.negro, K.antes);
  c.save(); c.translate(540, YT1); c.scale(z, z); c.translate(-540, -YT1);
  const sx = sx1(K.negro);
  pintaTira(c, TF, t, sx, YT1, TO1(t));
  const R: number[] = K.rayas, top = YT1 - TF.h / 2 - 120, bot = YT1 + TF.h / 2 + 120;
  c.strokeStyle = ACENTO; c.lineWidth = 9; c.lineCap = "round"; c.setLineDash([20, 15]);
  for (let j = 1; j < TF.toks.length; j++) {
    const k = ease.outCubic(prog(t, R[j - 1], R[j - 1] + .2)); if (k <= 0) continue;
    const x = sx + TF.x[j];
    c.lineDashOffset = -t * 40; linea(c, x, top, x, lerp(top, bot, k));
  }
  c.setLineDash([]);
  c.restore();
  texto(c, "No ve palabras.", 540, 600, { fuente: serif(132, true), color: LUZ, alfa: smooth(prog(t, K.negro + .02, K.negro + .2)) });
}

// ---------- 3. las tijeras cortan todo ----------
const XS = 760;
const sepEn = (t: number, s: number) => (t < s ? 0 : clamp(resorte(t - s, 2.6, .5), 0, 1.25));
function sx3(t: number) {
  const S: number[] = K.snips;
  const P: [number, number][] = [[K.antes, sx1(K.negro)], [K.antes + .5, XS - TF.x[1] + 300], [K.corta - .05, XS - TF.x[1] + 40]];
  S.forEach((s, j) => P.push([s, XS - TF.x[j + 1]]));
  const ult = S[S.length - 1], v = (TF.x[11] - TF.x[10]) / (ult - S[S.length - 2]);
  if (t > ult) return XS - TF.x[11] - (t - ult) * v * (1 + (t - ult) * .8);
  return claves(t, P, ease.inOutCubic, (x) => x);
}
const yTira3 = (t: number) => lerp(YT1, 520, ease.inOutCubic(prog(t, K.snips[10] + .02, K.snips[10] + .58)));
function escena3(c: Ctx, t: number) {
  const S: number[] = K.snips, sx = sx3(t), y = yTira3(t);
  const sep = (j: number) => sepEn(t, S[j - 1]);
  pintaTira(c, TF, t, sx, y, {
    M: 620, MR: 220, sep, marca: 1,
    push: (k) => { let p = 0; for (let j = k + 1; j < TF.toks.length; j++) p -= GAP * sep(j); return p; },
    rot: (k) => (hash(k, 3) - .5) * .07 * (k === 0 ? 0 : sep(k)), dy: (k) => (hash(k, 9) - .5) * 14 * (k === 0 ? 0 : sep(k)) + tiembla(t, S[k] ?? 99, 8, 30, 10),
  });
}

// ---------- 4. fiesta, inolvidable, otorrinolaringólogo ----------
const YT2 = 520, PX4 = 116;
let TFi: Tira, TIn: Tira, TOt: Tira;
const enTijeras = (T: Tira, j: number) => XS - T.x[j];
const GS = 36;
function feedSlip(t: number, T: Tira, ent: number, cortes: number[], rest: number) {
  const n = cortes.length, sxR = 540 - (T.fin - GS * n) / 2;
  const P: [number, number][] = [[ent, 1160]];
  cortes.forEach((s, j) => P.push([s, enTijeras(T, j + 1)]));
  P.push([rest, sxR]);
  return claves(t, P, ease.outCubic, ease.outCubic);
}
type Slip = { T: Tira; ent: number; cortes: number[]; rest: number; sube: number; fila: number[]; hop: number[] };
let SLIPS: Slip[] = [];
function slipPiezas(t: number, s: Slip) {
  const sx = feedSlip(t, s.T, s.ent, s.cortes, s.rest);
  const sep = (j: number) => sepEn(t, s.cortes[j - 1]);
  const o: TO = { M: 34, MR: 34, sep, marca: 1, push: (k) => { let p = 0; for (let j = k + 1; j < s.T.toks.length; j++) p -= GS * sep(j); return p; } };
  return { sx, o };
}
// Filas del montón (escena 4, escala .8) y de «token» (escena 5, escala 1).
const FILAS: number[][] = [[0], [1, 2, 3], [4, 5, 6], [7, 8]];
let PZ: { s: string; id: number; slip: number; k: number }[] = [];
function layoutFilas(t: number, esc: number, ys: number[], flipK: (i: number) => number) {
  const out: { x: number; y: number; w: number }[] = [];
  FILAS.forEach((fila, r) => {
    const ws = fila.map((i) => wCarta(PZ[i].s, PX4, PZ[i].id, 66, flipK(i)) * esc), g = 26 * esc;
    const tot = ws.reduce((a, b) => a + b, 0) + g * (fila.length - 1);
    let x = 540 - tot / 2;
    fila.forEach((i, q) => { out[i] = { x: x + ws[q] / 2, y: ys[r], w: ws[q] / esc }; x += ws[q] + g; });
  });
  return out;
}
const Y4 = [770, 940, 1110, 1280], Y5 = [690, 870, 1050, 1230];
function flipDe(t: number, i: number) { return ease.inOutCubic(prog(t, K.flips[i], K.flips[i] + .34)); }
function escena4(c: Ctx, t: number) {
  const l4 = layoutFilas(t, .8, Y4, () => 0), l5 = layoutFilas(t, 1, Y5, (i) => flipDe(t, i));
  const k5 = ease.inOutCubic(prog(t, K.cada - .05, K.cada + .55));
  SLIPS.forEach((s, si) => {
    if (t < s.ent) return;
    const { sx, o } = slipPiezas(t, s);
    const kS = ease.inOutCubic(prog(t, s.sube, s.sube + .55));
    if (kS <= 0) {
      pintaTira(c, s.T, t, sx, yTira3(t), { ...o, ac: (k) => s.hop.length ? smooth(prog(t, s.hop[k] - .05, s.hop[k] + .05)) * (1 - smooth(prog(t, s.hop[k] + .45, s.hop[k] + .75))) : 0,
        dy: (k) => -Math.max(0, tiembla(t, s.hop[k] ?? 99, 46, 9, 5)) + (si === 2 ? -Math.max(0, tiembla(t, K.cinco + k * .075, 40, 10, 6)) : 0) });
      return;
    }
    if (t >= K.vuelan) return;                         // desde aquí vuelan a sus cajones
    s.fila.forEach((i, k) => {
      const g = geomTira(s.T, sx, o, k), p4 = l4[i], p5 = l5[i];
      const ola = si === 2 ? -Math.max(0, tiembla(t, K.cinco + k * .08, 44, 10, 6)) : 0;
      const x = lerp(lerp(g.cx, p4.x, kS), p5.x, k5), y = lerp(lerp(YT2, p4.y, kS), p5.y, k5) + ola, esc = lerp(lerp(1, .8, kS), 1, k5);
      const w0 = g.R - g.L;
      carta(c, x, y, PZ[i].s, { px: PX4, h: s.T.h, w: lerp(lerp(w0, p4.w, kS), p5.w, k5), esc, t, sem: i, perf: true, num: PZ[i].id, npx: 66, flip: flipDe(t, i),
        rot: (hash(i, 5) - .5) * .05 * (1 - k5) + tiembla(t, K.flips[i] + .34, .05, 26, 8), numAc: dentro(t, K.flips[i] + .2, K.vuelan - .1, .2, .3) * 0 });
    });
  });
}

// ---------- 5-6. «token», y por detrás un número ----------
function bolaPiso(t: number) {
  const x = lerp(-80, 540, ease.outCubic(prog(t, K.cada + .1, K.token + .3)));
  const z = Math.abs(tiembla(t, K.noLos + .05, 40, 11, 5)) + Math.abs(tiembla(t, K.letras, 30, 12, 6));
  return { x, y: 1440 - RB - z, z };
}
function escena5(c: Ctx, t: number) {
  if (t < K.cada) return;
  const a = smooth(prog(t, K.token - .05, K.token + .12)) * (1 - smooth(prog(t, K.vuelan - .3, K.vuelan)));
  if (a > 0) { c.save(); c.translate(540, 430); const q = pop(t, K.token - .06, .3, 2); c.scale(q, q); texto(c, "token", 0, 0, { fuente: serif(176, true), color: ACENTO, alfa: a }); c.restore(); }
  const b = bolaPiso(t), al = 1 - smooth(prog(t, K.vuelan - .2, K.vuelan + .2));
  if (al > 0 && t > K.cada + .1) { c.save(); c.globalAlpha = al; sombra(c, b.x, 1442, RB * 1.5, .3); bola(c, b.x, b.y, RB); c.restore(); }
}

// ---------- 7-8. la cajonera ----------
const FILAS_C = 24, DW = 1, DH = .62, NCOL = Math.ceil(K.datos.vocab / FILAS_C);
const zFila = (r: number) => (FILAS_C - 1 - r) * DH;
const colDe = (n: number) => Math.floor(n / FILAS_C), filaDe = (n: number) => n % FILAS_C;
const V0: Vista = { tx: 9, ty: 0, tz: 7.4, yaw: -1.12, pitch: 0, dist: 13 };
const V1: Vista = { tx: 60, ty: 0, tz: 7.4, yaw: -1.02, pitch: .02, dist: 34 };
function vistaCaj(t: number): Vista {
  const k01 = ease.inOutCubic(prog(t, K.vuelan + .2, K.piezas + .2));
  const v = { tx: lerp(V0.tx, V1.tx, k01), ty: 0, tz: lerp(V0.tz, V1.tz, k01), yaw: lerp(V0.yaw, V1.yaw, k01), pitch: lerp(V0.pitch, V1.pitch, k01), dist: V0.dist * (V1.dist / V0.dist) ** k01 };
  // el vuelo hasta el cajón 96,439
  const n = PERRO[0][1], cx = colDe(n) + .5, cz = zFila(filaDe(n)) + DH / 2;
  const kv = prog(t, K.perro - .15, K.nueve + .05), kx = ease.inOutCubic(kv);
  if (kv > 0) {
    v.tx = Math.exp(lerp(Math.log(v.tx), Math.log(cx), kx));
    v.tz = lerp(v.tz, cz, ease.inOutCubic(prog(kv, .5, 1)));
    v.yaw = lerp(v.yaw, 0, ease.inOutCubic(prog(kv, .45, 1)));
    v.pitch = lerp(v.pitch, .16, ease.inOutCubic(prog(kv, .5, 1)));
    v.dist = Math.exp(lerp(Math.log(v.dist), Math.log(2.7), ease.inOutCubic(prog(kv, .3, 1)))) * (1 + .5 * Math.sin(Math.PI * kv));
  }
  const ka = prog(t, K.abre, K.modelo);
  v.dist *= 1 - .08 * ease.inOutCubic(ka);
  v.yaw += .01 * vaiven(t, 6.1); v.pitch += .008 * vaiven(t, 5.3, 1);
  return v;
}
const camCaj = (t: number) => camara(vistaCaj(t), 540, 980, 1250);
function cajon(c: Ctx, cam: Cam, col: number, r: number, t: number, sale = 0) {
  const x0 = col * DW, z0 = zFila(r);
  const A = cam.p(x0 + .03, -sale, z0 + .03), B = cam.p(x0 + DW - .03, -sale, z0 + .03), C = cam.p(x0 + DW - .03, -sale, z0 + DH - .03), D = cam.p(x0 + .03, -sale, z0 + DH - .03);
  if (!A || !B || !C || !D) return;
  const w = Math.hypot(B.x - A.x, B.y - A.y);
  if (sale > 0) {
    // el hueco y los costados del cajón que sale
    const a2 = cam.p(x0 + .03, 0, z0 + .03), b2 = cam.p(x0 + DW - .03, 0, z0 + .03), c2 = cam.p(x0 + DW - .03, 0, z0 + DH - .03), d2 = cam.p(x0 + .03, 0, z0 + DH - .03);
    if (a2 && b2 && c2 && d2) {
      c.fillStyle = "#1D1C1A"; c.beginPath(); c.moveTo(a2.x, a2.y); c.lineTo(b2.x, b2.y); c.lineTo(c2.x, c2.y); c.lineTo(d2.x, d2.y); c.closePath(); c.fill();
      c.fillStyle = "#CFC7B6"; c.strokeStyle = TINTA; c.lineWidth = 2.5;
      for (const [p, q, rr, s] of [[d2, c2, C, D], [a2, d2, D, A], [b2, c2, C, B]] as { x: number; y: number }[][]) {
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(q.x, q.y); c.lineTo(rr.x, rr.y); c.lineTo(s.x, s.y); c.closePath(); c.fill(); c.stroke();
      }
    }
  }
  c.fillStyle = "#EEE9DD"; c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.lineTo(C.x, C.y); c.lineTo(D.x, D.y); c.closePath(); c.fill();
  c.strokeStyle = TINTA; c.lineWidth = clamp(w * .012, .6, 3.4); c.stroke();
  if (w < 26) return;
  // portaetiqueta y jalador
  const L = (u: number, v: number) => cam.p(x0 + u * DW, -sale, z0 + v * DH)!;
  const e0 = L(.3, .62), e1 = L(.7, .62), e2 = L(.7, .86), e3 = L(.3, .86);
  c.fillStyle = "#FCFBF7"; c.beginPath(); c.moveTo(e0.x, e0.y); c.lineTo(e1.x, e1.y); c.lineTo(e2.x, e2.y); c.lineTo(e3.x, e3.y); c.closePath(); c.fill(); c.lineWidth = clamp(w * .008, .5, 2.4); c.stroke();
  const j0 = L(.38, .26), j1 = L(.62, .26);
  c.strokeStyle = "#3A3936"; c.lineWidth = clamp(w * .03, 1, 12); c.lineCap = "round"; linea(c, j0.x, j0.y, j1.x, j1.y);
  if (w > 70) {
    const n = col * FILAS_C + r, m = L(.5, .74), u = L(.6, .74), vz = L(.5, .84);
    const ux = (u.x - m.x) / 10, uy = (u.y - m.y) / 10, vx = (vz.x - m.x) / 10, vy = (vz.y - m.y) / 10;
    c.save(); c.transform(ux * .1, uy * .1, -vx * .1, -vy * .1, m.x, m.y);
    const esPerro = n === PERRO[0][1];
    texto(c, String(n), 0, 30, { fuente: mono(150), color: esPerro && t > K.nueve - .2 ? ACENTO : TINTA });
    c.restore();
  }
  void t;
}
function cajonera(c: Ctx, t: number, cam: Cam, alfa: number) {
  if (alfa <= .01) return;
  c.save(); c.globalAlpha = alfa;
  // piso
  const H = FILAS_C * DH;
  const g = c.createLinearGradient(0, 1500, 0, 1920); g.addColorStop(0, "rgba(20,18,14,0)"); g.addColorStop(1, "rgba(20,18,14,.08)");
  c.fillStyle = g; c.fillRect(-60, 1400, 1200, 600);
  // columnas: detalle cerca, solo líneas lejos
  const v = cam.v, cx = Math.floor(v.tx);
  let col = Math.max(0, cx - 60), paso = 1, dibujadas = 0;
  const hor: { x: number; y0: number; y1: number }[] = [];
  while (col < NCOL && dibujadas < 2600) {
    const a = cam.p(col * DW, 0, 0), b = cam.p(col * DW, 0, H), a2 = cam.p((col + 1) * DW, 0, 0);
    if (a && b && a2) {
      const w = Math.abs(a2.x - a.x);
      if (a.x > -40 && a.x < 1120) {
        if (w > 9 && paso === 1) { for (let r = 0; r < FILAS_C; r++) cajon(c, cam, col, r, t, 0); }
        else { c.strokeStyle = TINTA; c.lineWidth = clamp(w * .2, .4, 1.4); c.globalAlpha = alfa * clamp(w / 3, .25, 1); linea(c, a.x, a.y, b.x, b.y); c.globalAlpha = alfa; }
        hor.push({ x: a.x, y0: a.y, y1: b.y });
      }
      if (w < 6 && paso < 4096) paso *= 2;
      dibujadas++;
    }
    col += paso;
  }
  // repisas lejanas
  if (hor.length > 1) {
    c.strokeStyle = TINTA; c.lineWidth = 1;
    for (let r = 0; r <= FILAS_C; r++) {
      c.beginPath();
      hor.forEach((h, i) => { const y = lerp(h.y0, h.y1, r / FILAS_C); if (i) c.lineTo(h.x, y); else c.moveTo(h.x, y); });
      c.stroke();
    }
  }
  c.restore();
}
/** Pedazos que entran cada uno a su cajón. */
function aCajones(c: Ctx, t: number, cam: Cam) {
  const l5 = layoutFilas(t, 1, Y5, () => 1);
  PZ.forEach((p, i) => {
    const a0 = K.vuelan + i * .06, k = ease.inOutCubic(prog(t, a0, a0 + .75));
    if (k >= 1) return;
    const col = colDe(p.id), r = filaDe(p.id), q = cam.p(col + .5, 0, zFila(r) + DH * .5), q2 = cam.p(col + 1, 0, zFila(r) + DH * .5);
    if (!q || !q2) return;
    const wD = Math.max(Math.abs(q2.x - q.x) * 2, 1), w0 = l5[i].w;
    const x = lerp(l5[i].x, q.x, k), y = lerp(l5[i].y, q.y, k) - 260 * Math.sin(Math.PI * k) * (1 - k), esc = lerp(1, wD / w0, k ** .7);
    carta(c, x, y, p.s, { px: PX4, h: PX4 * 1.42, w: w0, esc, t, sem: i, num: p.id, npx: 66, flip: 1, perf: true, a: 1 - smooth(prog(k, .9, 1)) });
  });
}
function mapaPerro(c: Ctx, t: number) {
  const a = smooth(prog(t, K.abre + .5, K.abre + .9)) * (1 - smooth(prog(t, K.modelo - .1, K.modelo + .3)));
  if (a <= .01) return;
  const cx = 540, cy = 1270;
  c.save(); c.globalAlpha = a;
  const g = c.createRadialGradient(cx, cy, 60, cx, cy, 420); g.addColorStop(0, "rgba(244,242,236,1)"); g.addColorStop(.8, "rgba(244,242,236,1)"); g.addColorStop(1, "rgba(244,242,236,0)");
  c.fillStyle = g; c.beginPath(); c.arc(cx, cy, 420, 0, TAU); c.fill();
  c.strokeStyle = "rgba(17,17,17,.55)"; c.lineWidth = 2;
  for (let i = 1; i <= 5; i++) {
    const R = i * 62 * ease.outCubic(prog(t, K.abre + .5 + i * .05, K.abre + 1.1 + i * .05)), r = azar(i * 19);
    if (R < 2) continue;
    c.beginPath();
    for (let k = 0; k <= 48; k++) { const an = k / 48 * TAU, w = 1 + .08 * Math.sin(an * 3 + i) + .04 * Math.sin(an * 5 + r() * 6); const x = cx + Math.cos(an) * R * w, y = cy + Math.sin(an) * R * .7 * w; if (k) c.lineTo(x, y); else c.moveTo(x, y); }
    c.stroke();
  }
  const z = caida(t - (K.abre + .55), 2.2, .42, 30).z * 60;
  sombra(c, cx, cy + 6, 56, .3);
  bola(c, cx, cy - 32 - z, 32);
  texto(c, "perro", cx, cy + 110, { fuente: serif(92, true), color: TINTA, alfa: smooth(prog(t, K.abre + .8, K.abre + 1)) });
  c.restore();
}
function escenaCaj(c: Ctx, t: number) {
  const cam = camCaj(t);
  const aW = smooth(prog(t, K.vuelan - .15, K.vuelan + .45));
  cajonera(c, t, cam, aW);
  // el cajón del perro sale
  const n = PERRO[0][1], col = colDe(n), r = filaDe(n);
  const sale = .95 * ease.outBack(prog(t, K.abre, K.abre + .5), 1.2);
  if (sale > 0) cajon(c, cam, col, r, t, sale);
  if (t < K.vuelan + 1.4) aCajones(c, t, cam);
  // la cuenta del cajón que tienes enfrente (sobre una banda de papel; al llegar, manda la etiqueta del cajón)
  const kv = prog(t, K.perro - .15, K.nueve + .05);
  const aN = smooth(prog(t, K.perro - .2, K.perro + .05)) * (1 - smooth(prog(t, K.nueve + .1, K.nueve + .4)));
  const aG = dentro(t, K.gpt - .05, K.dosc - .3, .2, .2), aD = dentro(t, K.dosc - .12, K.perro - .2, .2, .2);
  placa(c, 220, 470, Math.max(aN, aG, aD));
  if (aN > 0) {
    const v = vistaCaj(t), nn = Math.min(n, Math.max(0, Math.floor(v.tx)) * FILAS_C + filaDe(n));
    texto(c, nn.toLocaleString("en-US"), 540, 380, { fuente: mono(132), color: kv >= 1 ? ACENTO : TINTA, alfa: aN });
  }
  rotulo(c, t, K.gpt - .05, K.dosc - .3, "GPT-4o", 350, 140, TINTA);
  rotulo(c, t, K.gpt + .3, K.dosc - .3, "tokenizador o200k_base", 440, 54, "#5E5C57");
  if (aD > 0) {
    texto(c, "≈ 200,000", 540, 360, { fuente: mono(132), color: TINTA, alfa: aD });
    texto(c, "piezas", 540, 450, { fuente: serif(84, true), color: TINTA, alfa: aD * smooth(prog(t, K.piezas - .1, K.piezas + .1)) });
  }
  // « perro» sale del cajón, y es el mismo punto del mapa
  if (t > K.abre + .1) {
    const k = ease.outCubic(prog(t, K.abre + .1, K.abre + .6)), q = cam.p(col + .5, -sale, zFila(r) + DH * .55);
    if (q) {
      const x = lerp(q.x, 540, k), y = lerp(q.y, 760, k), esc = lerp(.5, 1.25, k);
      const sal = 1 - smooth(prog(t, K.modelo - .1, K.modelo + .3));
      mapaPerro(c, t);
      if (t > K.abre + .9) { c.save(); c.globalAlpha = smooth(prog(t, K.abre + .9, K.abre + 1.1)) * sal; c.strokeStyle = TINTA; c.lineWidth = 3; c.setLineDash([4, 10]); c.lineCap = "round"; linea(c, 540, 860, 540, 1190); c.setLineDash([]); c.restore(); }
      carta(c, x, y, PERRO[0][0], { px: 104, esc, t, sem: 77, a: sal, perf: true });
    }
  }
}

// ---------- 9. la lista del c11, en pedazos ----------
const XL = 150, LB = 780, YFL = [660, 900, 1140], PL = [.66, .21, .13];
function escenaLista(c: Ctx, t: number) {
  fondo(c, t, .8);
  // la tira de arriba: el texto hasta « ad», en pedazos con sus costuras
  const px = 70, ys = 320, ini = FRASE.slice(0, 6);
  const ws = ini.map(([s]) => wCarta(s, px));
  const kGan = ease.inOutCubic(prog(t, K.gana, K.gana + .6));
  const wG = wCarta(LISTA[0][0], px, LISTA[0][1], 54, 1);
  const tot = ws.reduce((a, b) => a + b, 0) + 12 * (ws.length - 1) + (12 + wG) * kGan;
  let x = 540 - tot / 2;
  const aT = smooth(prog(t, K.modelo - .1, K.modelo + .2)) * (1 - smooth(prog(t, K.quien - .4, K.quien - .1)));
  ini.forEach(([s], i) => { carta(c, x + ws[i] / 2, ys, s, { px, t, sem: i + 40, a: aT, perf: false, w: ws[i] }); x += ws[i] + 12; });
  // cursor
  if (kGan < .5 && aT > 0 && (t * 2.2) % 1 < .62) { c.fillStyle = ACENTO; c.globalAlpha = aT; c.fillRect(x + 4, ys - 50, 7, 100); c.globalAlpha = 1; }
  // la caja de la lista
  const ab = clamp(resorte(t - (K.modelo + .1), 1.6, .62)), cierra = smooth(prog(t, K.texto, K.textoE + .25));
  const yC = 470, hC = 930 * ab;
  if (ab > .01 && cierra < 1) {
    c.save(); c.globalAlpha = 1 - cierra;
    c.fillStyle = "#E9E5DA"; c.fillRect(90, yC, 900, hC);
    const g = c.createLinearGradient(0, yC, 0, yC + 70); g.addColorStop(0, "rgba(20,18,14,.3)"); g.addColorStop(1, "rgba(20,18,14,0)");
    c.fillStyle = g; c.fillRect(90, yC, 900, Math.min(70, hC));
    c.strokeStyle = TINTA; c.lineWidth = 4; c.strokeRect(90, yC, 900, hC);
    c.restore();
  }
  const sal = 1 - cierra;
  const TR = [K.adivina - .05, K.adivina + .3, K.real + .1];
  LISTA.forEach(([s, id], i) => {
    const q = pop(t, TR[i], .24, 2.1);
    if (q <= 0 || sal <= 0) return;
    const gana = i === 0 ? smooth(prog(t, K.sig - .1, K.sig + .15)) : 0;
    const vuela = i === 0 && t > K.gana;
    if (!vuela) {
      c.save(); c.translate(XL, YFL[i]); c.scale(q, q); c.globalAlpha = sal;
      escribe(c, s, 0, 0, 132, { left: true, ac: gana }); c.restore();
    }
    texto(c, String(id), 930, YFL[i], { fuente: mono(60), color: GRIS, alin: "right", alfa: sal * smooth(prog(t, TR[i] + .1, TR[i] + .3)) });
    const wb = LB * PL[i] * ease.outCubic(prog(t, K.real - .1 + i * .12, K.real + .6 + i * .12));
    c.globalAlpha = sal; c.fillStyle = gana > .5 ? ACENTO : "#B9B4A8"; c.fillRect(XL, YFL[i] + 40, wb, 54);
    c.strokeStyle = TINTA; c.lineWidth = 2.4; if (wb > 1) c.strokeRect(XL, YFL[i] + 40, wb, 54); c.globalAlpha = 1;
  });
  texto(c, "probabilidades de ejemplo", 540, 1340, { fuente: serif(58, true), color: "#6E6C66", alfa: sal * smooth(prog(t, K.real + .4, K.real + .8)) });
  // el ganador vuela a la tira como número y se traduce otra vez a texto
  if (t > K.gana - .02) {
    const [s, id] = LISTA[0];
    const x1 = x + 12 + wG / 2, xa = XL + wCarta(s, 132) / 2;
    const xx = lerp(xa, x1, kGan), yy = lerp(YFL[0], ys, kGan) - 160 * Math.sin(Math.PI * kGan), esc = lerp(132 / 80, 1, kGan);
    const fl = 1 - ease.inOutCubic(prog(t, K.vuelve, K.vuelve + .36));
    const flipIni = ease.inOutCubic(prog(t, K.gana, K.gana + .3));
    carta(c, xx, yy, s, { px, esc, t, sem: 60, num: id, npx: 54, flip: Math.min(flipIni, fl), a: aT, perf: false, w: wG });
  }
}

// ---------- 10. nadie, a mano ----------
const PXN = 150, YN = 980;
function pluma(c: Ctx, x: number, y: number, rot = 0, s = 1) {
  c.save(); c.translate(x, y); c.rotate(rot + .62); c.scale(s, s);
  c.fillStyle = TINTA; c.beginPath(); c.moveTo(0, 0); c.lineTo(-17, -64); c.quadraticCurveTo(-20, -86, -12, -102); c.lineTo(12, -102); c.quadraticCurveTo(20, -86, 17, -64); c.closePath(); c.fill();
  c.strokeStyle = PAPEL; c.lineWidth = 2.5; linea(c, 0, -12, 0, -58); c.fillStyle = PAPEL; circulo(c, 0, -62, 4.5);
  c.fillStyle = "#262625"; c.fillRect(-15, -420, 30, 322); c.fillStyle = "#6e6c66"; c.fillRect(-15, -110, 30, 9);
  c.restore();
}
function escenaNadie(c: Ctx, t: number) {
  fondo(c, t, .8);
  const s = " inolvidable", w = wCarta(s, PXN), sube = ease.outBack(prog(t, K.quien - .3, K.quien + .15), 1.3), baja = ease.inCubic(prog(t, K.programa - .2, K.programa + .5));
  const y = lerp(1400, YN, sube) + 900 * baja;
  carta(c, 540, y, s, { px: PXN, t, sem: 90, perf: true, w });
  // las tijeras dudan
  const busca = smooth(prog(t, K.quien - .2, K.quien + .3)) * (1 - smooth(prog(t, K.programa - .3, K.programa + .3)));
  if (busca > 0) {
    const xs = 540 + 210 * Math.sin((t - K.quien) * 2.3) * (1 - smooth(prog(t, K.nadie - .2, K.nadie + .3))), yP = lerp(-500, YN - PXN * .71 - 380, busca);
    tijeras(c, xs, yP, .3 + .06 * Math.sin(t * 9), 1, 1, .08 * Math.sin((t - K.quien) * 2.3 + .6));
  }
  // la pluma propone cortes de sílaba: i·nol·vi·da·ble
  const sil = ["i", "inol", "inolvi", "inolvida"], x0 = 540 - w / 2 + PXN * PAD + PXN * ESP;
  const tz: number[] = K.traza, aM = 1 - smooth(prog(t, K.tacha + .5, K.tacha + .9));
  c.save(); c.strokeStyle = "#3A3936"; c.lineWidth = 5; c.lineCap = "round"; c.setLineDash([12, 10]);
  sil.forEach((p, i) => {
    const k = ease.outCubic(prog(t, tz[i], tz[i] + .12)); if (k <= 0) return;
    const xx = x0 + W(p, serif(PXN)); c.globalAlpha = aM; linea(c, xx, y - 110, xx, y - 110 + 220 * k);
  });
  c.restore();
  if (t > tz[0] - .3 && t < K.tacha + .6) {
    const i = Math.min(3, Math.max(0, tz.findIndex((q: number) => t < q + .14)));
    const xx = x0 + W(sil[i < 0 ? 3 : i], serif(PXN)), kk = prog(t, tz[i], tz[i] + .12);
    const sale = ease.inCubic(prog(t, K.tacha + .1, K.tacha + .6));
    pluma(c, xx + 700 * sale, y - 110 + 220 * kk - 500 * sale, -.1, 1);
  }
  const kt = ease.outCubic(prog(t, K.tacha, K.tacha + .2));
  if (kt > 0) { c.save(); c.globalAlpha = aM; c.strokeStyle = ACENTO; c.lineWidth = 16; c.lineCap = "round"; linea(c, 210, y + 150, lerp(210, 880, kt), lerp(y + 150, y - 170, kt)); c.restore(); }
}

// ---------- 11-12. BPE: imanes que se juntan ----------
const PXB = 84, YBP = 790, YBO = 1030, PT = 6, GT = 6;
let ESC_B = 1;
type Est = string[];
function estados(w: number): { t: number; s: Est }[] {
  const L: string[] = w === 0 ? K.letrasP : K.letrasO;
  const out = [{ t: -1, s: L }];
  for (const [tt, ww, st] of K.fusiones as [number, number, string[], number][]) if (ww === w) out.push({ t: tt, s: st });
  return out;
}
let EST: { t: number; s: Est }[][] = [];
const cw = (ch: string) => (ch === " " ? PXB * ESP : W(ch, serif(PXB)));
function xsDe(s: Est, extra: number) {
  // posiciones x de cada letra, fila centrada
  const ws = s.map((p) => [...p].reduce((a, ch) => a + cw(ch), 0) + 2 * PT);
  const tot = ws.reduce((a, b) => a + b, 0) + (GT + extra) * (s.length - 1);
  let x = 540 - tot / 2; const xs: number[] = [], partes: [number, number][] = [];
  s.forEach((p, i) => { let u = x + PT; const a = xs.length; for (const ch of p) { xs.push(u); u += cw(ch); } partes.push([a, xs.length - 1]); x += ws[i] + GT + extra; });
  return { xs, partes, tot };
}
function anchoBPE(t: number, w: number, extra: number) {
  const E = EST[w]; let i = 0;
  for (let k = 1; k < E.length; k++) if (t >= E[k].t) i = k;
  const a = xsDe(E[Math.max(0, i - 1)].s, extra).tot, b = xsDe(E[i].s, extra).tot;
  return lerp(a, b, i === 0 ? 1 : clamp(resorte(t - E[i].t, 3.2, .55), 0, 1.15));
}
function filaBPE(c: Ctx, t: number, w: number, y: number, a: number, extra: number, rompe: number) {
  const E = EST[w]; let i = 0;
  for (let k = 1; k < E.length; k++) if (t >= E[k].t) i = k;
  const cur = xsDe(E[i].s, extra), prev = xsDe(E[Math.max(0, i - 1)].s, extra);
  const kk = i === 0 ? 1 : clamp(resorte(t - E[i].t, 3.2, .55), 0, 1.15);
  const letras = [...E[0].s.join("")];
  const X = letras.map((_, j) => lerp(prev.xs[j], cur.xs[j], kk));
  const flash = i > 0 ? 1 - smooth(prog(t, E[i].t, E[i].t + .5)) : 0;
  const partes = kk < .8 && i > 0 ? prev.partes : cur.partes;
  const nueva = i > 0 ? cur.partes.find(([p, q]) => !prev.partes.some(([r, s]) => r === p && s === q)) : undefined;
  c.save(); c.globalAlpha = a; c.translate(540, y); c.scale(ESC_B, ESC_B); c.translate(-540, -y);
  partes.forEach(([p, q], m) => {
    const L = X[p] - PT, R = X[q] + cw(letras[q]) + PT, h = PXB * 1.36, rr = (hash(m, w + rompe * 0) - .5) * .12 * rompe;
    const dy = -Math.max(0, tiembla(t, K.rompe + m * .05, 18 * rompe, 12, 6));
    c.save(); c.translate((L + R) / 2, y + dy); c.rotate(rr);
    c.fillStyle = "rgba(20,18,14,.1)"; c.fillRect((L - R) / 2 + 4, -h / 2 + 7, R - L, h);
    const esNueva = nueva && nueva[0] === p && nueva[1] === q && kk >= .8;
    c.fillStyle = "#FCFBF7"; c.fillRect((L - R) / 2, -h / 2, R - L, h);
    c.strokeStyle = esNueva ? ACENTO : TINTA; c.lineWidth = esNueva ? lerp(3, 6, flash) : 3;
    bordeMano(c, (L - R) / 2, -h / 2, (R - L) / 2, h / 2, azar(Math.floor(t * 10) * 13 + p * 3 + w * 101));
    c.globalAlpha = a;
    for (let j = p; j <= q; j++) {
      const xx = X[j] - (L + R) / 2;
      if (letras[j] === " ") marcaEsp(c, xx, PXB * .3, PXB, 1);
      else texto(c, letras[j], xx, PXB * .3, { fuente: serif(PXB), color: esNueva ? ACENTO : TINTA, alin: "left", alfa: a });
      if (esNueva && flash < .99) texto(c, letras[j], xx, PXB * .3, { fuente: serif(PXB), color: TINTA, alin: "left", alfa: a * (1 - flash) });
    }
    c.restore();
  });
  c.restore();
}
function montana(c: Ctx, t: number, sube: number) {
  if (sube <= .01) return;
  const off = (1 - sube) * 760, b = Math.floor(t * 10);
  const yTop = (x: number) => 1560 + off - 420 * Math.exp(-(((x - 300) / 230) ** 2)) - 520 * Math.exp(-(((x - 720) / 260) ** 2)) - 160 * Math.exp(-(((x - 1000) / 170) ** 2));
  c.save(); c.font = mono(34); c.textAlign = "center";
  for (let i = 0; i < 29; i++) for (let j = 0; j < 24; j++) {
    const x = i * 39 + (j % 2) * 19, y = 1990 - j * 40;
    const yt = yTop(x); if (y < yt) continue;
    const prof = clamp((y - yt) / 260);
    c.globalAlpha = sube * lerp(.9, .4, prof);
    c.fillStyle = hash(i, j * 7 + b) < .06 ? ACENTO : "#8C8A83";
    c.fillText(LET[Math.floor(hash(i * 3 + b, j) * LET.length)], x, y);
  }
  c.restore();
}
function escenaBPE(c: Ctx, t: number) {
  fondo(c, t, .6);
  const sube = ease.outCubic(prog(t, K.programa - .2, K.programa + .9)) * (1 - ease.inCubic(prog(t, K.bpe - .3, K.bpe + .6)));
  montana(c, t, sube);
  const salen = ease.outBack(prog(t, K.pegando - .55, K.pegando - .05), 1.2), van = ease.inCubic(prog(t, K.porAnos - .1, K.porAnos + .5));
  const yOff = (1 - salen) * 520 - van * 1400;
  const rompe = ease.outCubic(prog(t, K.rompe - .05, K.rompe + .35));
  ESC_B = Math.min(1.3, 870 / anchoBPE(t, 1, 34 * rompe));
  if (salen > 0) {
    filaBPE(c, t, 0, YBP + yOff, salen, 0, 0);
    filaBPE(c, t, 1, YBO + yOff * 1.1, salen, 34 * rompe, rompe);
  }
  // el nombre real
  const aB = smooth(prog(t, K.bpeW - .1, K.bpeW + .12)) * (1 - smooth(prog(t, K.comun - .4, K.comun - .1)));
  if (aB > 0) { c.save(); c.translate(540, 450); const q = pop(t, K.bpeW - .1, .3, 2); c.scale(q, q); texto(c, "BPE", 0, 0, { fuente: serif(220, true), color: ACENTO, alfa: aB }); c.restore(); }
  rotulo(c, t, K.codif - .05, K.comun - .4, "codificación por pares de bytes", 570, 70, TINTA);
  // común / raro
  const fin = 1 - van;
  const wP = xsDe(EST[0][EST[0].length - 1].s, 0);
  const rP = 540 + (wP.xs[wP.xs.length - 1] + cw("o") + PT - 540) * ESC_B;
  if (t > K.comun - .2) texto(c, "común", rP + 36, YBP + PXB * .3 + yOff, { fuente: serif(96, true), color: TINTA, alin: "left", alfa: smooth(prog(t, K.comun - .05, K.comun + .15)) * fin });
  if (t > K.raro - .2) texto(c, "raro", 540, YBO + 190 + yOff, { fuente: serif(96, true), color: ACENTO, alfa: smooth(prog(t, K.raro - .05, K.raro + .15)) * fin });
}

// ---------- 13. ferrocarril: cuatro cajas cerradas ----------
const GY = 1180, PXF = 150, HC = 230, PROF = 36;
function escenaFerro(c: Ctx, t: number) {
  fondo(c, t, .7);
  const sube = ease.inCubic(prog(t, K.importa - .1, K.importa + .7)) * 1500;
  c.save(); c.translate(0, -sube);
  // el suelo
  c.strokeStyle = TINTA; c.lineWidth = 4; c.lineCap = "round";
  const aS = smooth(prog(t, K.porAnos + .35, K.porAnos + .6));
  c.globalAlpha = aS; linea(c, 60, GY, lerp(60, 1020, ease.outCubic(prog(t, K.porAnos + .35, K.porAnos + 1))), GY); c.globalAlpha = 1;
  rotulo(c, t, K.costo - .1, K.cuantas - .25, "contar letras", 640, 124, TINTA, true);
  rotulo(c, t, K.cuantas - .05, K.el - .15, "¿cuántas erres?", 640, 124, TINTA, true);
  // la tira y sus cortes
  const Tf = mkTira(FERRO, PXF), n = 4, cortes: number[] = K.snF;
  const sep = (j: number) => sepEn(t, cortes[j - 1]);
  const ancho = Tf.fin + 30 + [1, 2, 3].reduce((a, j) => a + 76 * clamp(sep(j)), 0);
  const aparece = ob(prog(t, K.porAnos + .8, K.porAnos + 1.25), 1.3);
  if (aparece <= .001) { pintaBolaFerro(c, t); c.restore(); return; }
  const x0 = 540 - ancho / 2;
  const cajaK = (k: number) => ease.inOutCubic(prog(t, cortes[2] + .12 + k * .06, cortes[2] + .5 + k * .06));
  const rayos = smooth(prog(t, K.lasLetras - .05, K.escond + .2));
  // letras r encendidas al preguntar
  const R_IDX = [2, 3, 7, 8];
  const yC = GY - HC / 2 + (1 - aparece) * 300;
  let xx = x0;
  for (let k = 0; k < n; k++) {
    const [s, id] = FERRO[k];
    const pL = k === 0 ? 15 : 15 * clamp(sep(k)), pR = k === 3 ? 15 : 15 * clamp(sep(k + 1)), wk = Tf.adv[k] + pL + pR;
    const cxk = xx + wk / 2;
    const ck = cajaK(k);
    // frente
    c.save(); c.globalAlpha = 1;
    c.fillStyle = "rgba(20,18,14,.1)"; c.fillRect(xx + 6, yC - HC / 2 + 10, wk, HC);
    if (ck < 1) { c.globalAlpha = 1 - ck; c.fillStyle = "#FCFBF7"; c.fillRect(xx - .6, yC - HC / 2, wk + 1.2, HC); c.globalAlpha = 1; }
    // tapa y costado (la caja se arma)
    if (ck > 0) {
      const p = PROF * ck;
      c.fillStyle = "#D9CDB3"; c.beginPath(); c.moveTo(xx, yC - HC / 2); c.lineTo(xx + p, yC - HC / 2 - p); c.lineTo(xx + wk + p, yC - HC / 2 - p); c.lineTo(xx + wk, yC - HC / 2); c.closePath(); c.fill();
      c.strokeStyle = TINTA; c.lineWidth = 3; c.stroke();
      c.fillStyle = "#C3B595"; c.beginPath(); c.moveTo(xx + wk, yC - HC / 2); c.lineTo(xx + wk + p, yC - HC / 2 - p); c.lineTo(xx + wk + p, yC + HC / 2 - p); c.lineTo(xx + wk, yC + HC / 2); c.closePath(); c.fill(); c.stroke();
    }
    // las letras (dentro de la caja cuando se cierra)
    const core = s.startsWith(" ") ? s.slice(1) : s;
    const letrasA = 1 - ck * (1 - rayos);
    let lx = xx + pL + (s.startsWith(" ") ? PXF * ESP : 0);
    if (s.startsWith(" ")) marcaEsp(c, xx + pL, yC + PXF * .3 + 20 * ck, PXF, ck * rayos);
    const offTxt = Tf.x[k] + (s.startsWith(" ") ? PXF * ESP : 0);
    [...core].forEach((ch, q) => {
      const gi = [...FERRO.slice(0, k).map((x) => (x[0].startsWith(" ") ? x[0].slice(1) : x[0])).join("")].length + q;
      const esR = R_IDX.includes(gi), fl = esR ? smooth(prog(t, K.cuantas + .45 + R_IDX.indexOf(gi) * .1, K.cuantas + .55 + R_IDX.indexOf(gi) * .1)) * (1 - smooth(prog(t, K.ferro + .1, K.ferro + .4))) : 0;
      const col = esR && (fl > .5 || rayos > .5) ? ACENTO : TINTA;
      texto(c, ch, lx, yC + PXF * .3 + 20 * ck, { fuente: serif(PXF), color: col, alin: "left", alfa: Math.max(letrasA, 0) });
      lx += W(ch, serif(PXF));
      void offTxt;
    });
    // el frente de cartón tapa las letras; con rayos se vuelve casi transparente
    c.globalAlpha = ck * (1 - rayos * .8);
    c.fillStyle = "#E6DCC4"; c.fillRect(xx, yC - HC / 2, wk, HC);
    c.globalAlpha = 1;
    c.strokeStyle = TINTA; c.lineWidth = 3.2;
    const sL = k === 0 ? 1 : Math.max(clamp(sep(k)), ck), sR = k === 3 ? 1 : Math.max(clamp(sep(k + 1)), ck);
    bordeMano(c, xx, yC - HC / 2, xx + wk, yC + HC / 2, azar(Math.floor(t * 10) * 7 + k), [1, sR, 1, sL]);
    if (ck <= 0) { c.fillStyle = "#FCFBF7"; c.globalAlpha = 0; }
    c.globalAlpha = 1;
    // el número: lo único que la bola ve
    const aNum = ck * (1 - rayos * .55);
    texto(c, String(id), cxk, yC - HC / 2 + (rayos > 0 ? lerp(HC / 2 + 22, 52, rayos) : HC / 2 + 22), { fuente: mono(Math.round(Math.min(lerp(60, 42, rayos), (wk - 18) / (String(id).length * .6)))), color: TINTA, alfa: aNum });
    c.restore();
    xx += wk + 46 * clamp(sep(k + 1)) * (k < 3 ? 1 : 0);
  }
  // papel antes de armar cajas: fondo blanco bajo las letras
  pintaBolaFerro(c, t);
  c.restore();
}
function cajasPos(t: number) {
  const Tf = mkTira(FERRO, PXF), cortes: number[] = K.snF;
  const sep = (j: number) => sepEn(t, cortes[j - 1]);
  const ancho = Tf.fin + 30 + [1, 2, 3].reduce((a, j) => a + 76 * clamp(sep(j)), 0);
  let xx = 540 - ancho / 2; const out: number[] = [];
  for (let k = 0; k < 4; k++) { const wk = Tf.adv[k] + (k === 0 ? 15 : 15 * clamp(sep(k))) + (k === 3 ? 15 : 15 * clamp(sep(k + 1))); out.push(xx + wk / 2 + PROF / 2); xx += wk + 46 * clamp(sep(k + 1)); }
  return out;
}
function pintaBolaFerro(c: Ctx, t: number) {
  const H: number[] = K.cajasH, P = cajasPos(t), topC = GY - HC - PROF;
  let x = lerp(-80, 170, ease.outCubic(prog(t, K.porAnos, K.porAnos + 1.1))), y = GY - RB, sueloY = GY;
  const tante = Math.abs(tiembla(t, K.costo, 30, 12, 6)) + Math.abs(tiembla(t, K.contar + .2, 22, 12, 6));
  y -= tante;
  if (t > H[0] - .3) {
    let a = H[0] - .3, b = H[0], xa = 170, xb = P[0], ya = GY - RB, yb = topC - RB;
    for (let i = 0; i < 4; i++) if (t >= H[i]) { a = H[i]; b = H[i + 1] ?? H[i] + 1; xa = P[i]; xb = P[i + 1] ?? P[i]; ya = topC - RB; yb = topC - RB; }
    const u = prog(t, a, b), hh = t >= H[3] ? 0 : 110;
    x = lerp(xa, xb, ease.inOutSine(u)); y = lerp(ya, yb, u) - 4 * hh * u * (1 - u);
    if (t >= H[3]) y -= Math.abs(tiembla(t, H[3], 18, 14, 6));
    sueloY = topC;
  }
  sombra(c, x, sueloY + 2, RB * 1.4, .28);
  bola(c, x, y, RB);
}

// ---------- 14. la mesa: todo se mide en tokens ----------
const MX0 = 100, MX1 = 980, MY0 = 600, MY1 = 1400;
let LUGAR: { x: number; y: number; r: number }[] = [];
function mesa(c: Ctx, t: number, oy: number) {
  c.save(); c.translate(0, oy);
  c.fillStyle = "rgba(20,18,14,.12)"; c.fillRect(MX0 + 10, MY0 + 18, MX1 - MX0, MY1 - MY0);
  c.fillStyle = "#B69C70"; c.fillRect(MX0, MY1 - 4, MX1 - MX0, 26);
  c.fillStyle = "#D9C7A2"; c.fillRect(MX0, MY0, MX1 - MX0, MY1 - MY0);
  const r = azar(55); c.strokeStyle = "rgba(150,120,72,.35)"; c.lineWidth = 2;
  for (let i = 0; i < 22; i++) {
    const y0 = MY0 + 20 + r() * (MY1 - MY0 - 40), f = r() * 6, A = 6 + r() * 14;
    c.beginPath(); for (let x = MX0 + 10; x <= MX1 - 10; x += 30) { const y = y0 + A * Math.sin(x * .006 + f) + 3 * Math.sin(x * .03 + f * 2); if (x === MX0 + 10) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke();
  }
  c.strokeStyle = TINTA; c.lineWidth = 4; bordeMano(c, MX0, MY0, MX1, MY1, azar(Math.floor(t * 10) * 3 + 1));
  c.restore();
}
function escenaMesa(c: Ctx, t: number) {
  fondo(c, t, .6);
  const entra = (1 - ease.outCubic(prog(t, K.importa - .1, K.importa + .8))) * 1500;
  const sale = ease.inCubic(prog(t, K.asi + .2, K.asi + 1.2)) * 1600;
  const oy = entra + sale;
  mesa(c, t, oy);
  const caen: number[] = K.caen;
  let n = 0;
  PUENTE.forEach(([s, id], i) => {
    const tc = caen[i]; if (t < tc - .35) return;
    if (t >= tc) n++;
    if (ELEGIDOS.includes(i) && t > K.asi + .05) return;   // estos doce suben a la frase final
    const L = LUGAR[i], k = prog(t, tc - .35, tc), alto = (1 - ease.inCubic(k)) * .9;
    const esc = 1 + alto + tiembla(t, tc, .06, 30, 10), ox = alto * 60, oyy = alto * 90;
    carta(c, L.x - ox, L.y - oyy + oy, s, { px: 48, esc, rot: L.r, t, sem: i, sombra: 1 + alto * 2, a: smooth(k * 3), num: id });
  });
  const a = smooth(prog(t, K.sigSerie - .2, K.sigSerie)) * (1 - smooth(prog(t, K.asi + .1, K.asi + .5)));
  if (a > 0) {
    const q = 1 + tiembla(t, caen[Math.max(0, n - 1)] ?? 0, .05, 30, 12);
    c.save(); c.translate(540, 330); c.scale(q, q); texto(c, String(n), 0, 0, { fuente: mono(150), color: TINTA, alfa: a }); c.restore();
    texto(c, "tokens", 540, 420, { fuente: serif(70, true), color: GRIS, alfa: a });
  }
  rotulo(c, t, K.cabe - .05, K.cuesta - .3, "cuánto cabe", 1510, 108, TINTA, true);
  rotulo(c, t, K.cuesta - .05, K.asi + .2, "cuánto cuesta", 1510, 108, ACENTO, true);
}

// ---------- 15. pedacitos que nunca vemos ----------
const LF = [[0, 1, 2, 3], [4, 5, 6], [7, 8], [9, 10, 11]], YF = [640, 830, 1070, 1260], PXF2 = 124, NPX = 66;
function layoutFinal(t: number) {
  const cie = ease.inOutCubic(prog(t, K.cierra, K.cierra + 1.1));
  const out: { x: number; y: number; w: number }[] = [];
  LF.forEach((fila, r) => {
    // con cartas
    const ws = fila.map((i) => { const fl = 1 - ease.inOutCubic(prog(t, K.flipsF[i], K.flipsF[i] + .3)); return wCarta(FINAL[i][0], PXF2, FINAL[i][1], NPX, fl); });
    const tot = ws.reduce((a, b) => a + b, 0) + 22 * (fila.length - 1);
    // como texto corrido: avances reales, sin el espacio del principio de renglón
    const adv = fila.map((i) => wTexto(FINAL[i][0], PXF2));
    const lead = FINAL[fila[0]][0].startsWith(" ") ? PXF2 * ESP : 0;
    const totT = adv.reduce((a, b) => a + b, 0) - lead;
    let x = 540 - tot / 2, xt = 540 - totT / 2 - lead;
    fila.forEach((i, q) => {
      const cxC = x + ws[q] / 2, cxT = xt + adv[q] / 2;
      out[i] = { x: lerp(cxC, cxT, cie), y: YF[r], w: lerp(ws[q], adv[q], cie) };
      x += ws[q] + 22; xt += adv[q];
    });
  });
  return out;
}
const ELEGIDOS = [3, 8, 14, 20, 1, 10, 25, 6, 17, 22, 12, 27];
function escenaFinal(c: Ctx, t: number) {
  fondo(c, t, .6 * (1 - smooth(prog(t, K.cierra, K.cierra + 1))) + .25);
  const lay = layoutFinal(t), cie = ease.inOutCubic(prog(t, K.cierra, K.cierra + 1.1));
  const caen: number[] = K.caen;
  FINAL.forEach(([s, id], i) => {
    const src = ELEGIDOS[i], L = LUGAR[src];
    const t0 = K.asi + .05 + i * .07, k = ease.inOutCubic(prog(t, t0, K.secreto + .3 + i * .06));
    const sube = ease.outCubic(prog(t, t0, t0 + .7));
    const flipA = ease.inOutCubic(prog(t, t0 + .1, t0 + .45));
    const flipB = ease.inOutCubic(prog(t, K.flipsF[i], K.flipsF[i] + .3));
    const fl = flipA * (1 - flipB);
    const enAlto = 1 - k;
    // de la mesa al aire: gira y se acerca a la cámara
    const xM = L.x, yM = L.y + ease.inCubic(prog(t, K.asi + .2, K.asi + 1.2)) * 1600 * 0;
    const xa = lerp(xM, 540 + (hash(i, 2) - .5) * 700, sube), ya = lerp(yM, 900 + (hash(i, 4) - .5) * 900, sube) + 30 * Math.sin(t * 1.3 + i);
    const x = lerp(xa, lay[i].x, k), y = lerp(ya, lay[i].y, k);
    const pxA = lerp(48, PXF2, k), esc = lerp(lerp(1, 1.3, sube), 1, k) * (pxA / PXF2);
    const texto_ = flipA < .5 ? PUENTE[src][0] : s, num = flipA < .5 ? PUENTE[src][1] : id;
    const quitaEsp = 0;
    void quitaEsp;
    if (t < caen[src]) return;
    const esPunto = i === FINAL.length - 1;
    const aPunto = esPunto ? 1 - smooth(prog(t, K.cae - .12, K.cae)) : 1;
    carta(c, x, y, texto_, { px: PXF2, esc, rot: lerp(L.r, (hash(i, 8) - .5) * .5, sube) * enAlto, t, sem: i, num, npx: NPX, flip: fl, w: k > .02 ? lay[i].w : undefined,
      papel: 1 - cie, borde: 1 - cie, marca: 1 - cie, a: aPunto });
  });
  // la bola llega rodando por el renglón y se queda como el punto final
  if (t > K.cae - .75) {
    const p = lay[FINAL.length - 1], r = 21, yb = YF[3] + PXF2 * .3 - r;
    const k = prog(t, K.cae - .75, K.cae), x = lerp(1190, p.x - 2, ease.outCubic(k)) + (k >= 1 ? tiembla(t, K.cae, 7, 22, 7) : 0);
    sombra(c, x, YF[3] + PXF2 * .3 + 2, 34, .3);
    bola(c, x, yb, r);
  }
}

// ---------- el orden del video ----------
function preparar() {
  const cv = document.createElement("canvas"); cv.width = 8; cv.height = 8; MC = cv.getContext("2d");
  TF = mkTira(FRASE, PX1);
  TFi = mkTira(FIESTA, PX4); TIn = mkTira(INOL, PX4); TOt = mkTira(OTO, PX4);
  SLIPS = [
    { T: TFi, ent: K.fiesta - .6, cortes: [], rest: K.fiesta + .3, sube: K.inolv - .55, fila: [0], hop: [K.pedazo + .05] },
    { T: TIn, ent: K.inolv - .5, cortes: K.sInol, rest: K.sInol[1] + .42, sube: K.able + .55, fila: [1, 2, 3], hop: K.hInol },
    { T: TOt, ent: K.oto - .55, cortes: K.sOto, rest: K.sOto[3] + .4, sube: K.sOto[3] + .22, fila: [4, 5, 6, 7, 8], hop: [] },
  ];
  PZ = [...FIESTA, ...INOL, ...OTO].map(([s, id], i) => ({ s, id, slip: i === 0 ? 0 : i < 4 ? 1 : 2, k: i === 0 ? 0 : i < 4 ? i - 1 : i - 4 }));
  EST = [estados(0), estados(1)];
  ESC_B = Math.min(1, 860 / xsDe(EST[1][0].s, 0).tot);
  // lugares en la mesa: rejilla de 5 × 6 con temblor, sin tapar la cuenta
  const r = azar(2026), celdas: number[] = [];
  for (let i = 0; i < 32; i++) celdas.push(i);
  for (let i = celdas.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [celdas[i], celdas[j]] = [celdas[j], celdas[i]]; }
  LUGAR = PUENTE.map((_, i) => { const q = celdas[i], cx = q % 4, cy = Math.floor(q / 4); return { x: MX0 + 140 + cx * 200 + (cy % 2) * 40 + (r() - .5) * 40, y: MY0 + 70 + cy * 94 + (r() - .5) * 16, r: (r() - .5) * .34 }; });
  return {};
}

function escena(c: Ctx, t: number) {
  if (t < K.negro) { fondo(c, t, .8); escena1(c, t); return; }
  if (t < K.antes) { escenaNegro(c, t); return; }
  if (t < K.vuelan + 1.2) {
    const aP = 1 - smooth(prog(t, K.vuelan - .15, K.vuelan + .45));
    fondo(c, t, .8 * aP);
    if (t >= K.vuelan - .15) escenaCaj(c, t);
    if (t < K.snips[10] + 1.6) { escena3(c, t); virutas(c, XS, yTira3(t) - 40, t, K.snips); }
    escena4(c, t);
    // las tijeras: bajan antes de cortar, se quedan para los tres ejemplos y se van con «token»
    if (t < K.cada + .5) {
      // solo bajan para cortar; entre un ejemplo y otro se levantan y dejan ver los pedazos
      const V: [number, number][] = [[-9, K.snips[10] + .25], [K.fiesta - .8, K.fiesta + .1], [K.sInol[0] - .6, K.sInol[1] + .3], [K.sOto[0] - .6, K.sOto[3] + .3]];
      let abajo = 0;
      for (const [a, b] of V) abajo = Math.max(abajo, smooth(prog(t, a - .3, a)) * (1 - smooth(prog(t, b, b + .35))));
      const yP = lerp(-700, yTira3(t) - 175, resorte(t - K.bajan, 1.4, .55)) - (1 - abajo) * 300, vete = ease.inCubic(prog(t, K.cada - .15, K.cada + .4));
      const amago = tiembla(t, K.fiesta - .1, .12, 24, 8);
      tijeras(c, XS, lerp(yP, -620, vete), abertura(t, [...K.snips, ...K.sInol, ...K.sOto]) + amago, 1, 1);
    }
    virutas(c, XS, YT2 - 40, t, [...K.sInol, ...K.sOto]);
    escena5(c, t);
    return;
  }
  if (t < K.modelo + .45) {
    escenaCaj(c, t);
    if (t > K.modelo - .1) {
      const yP = lerp(1990, -60, ease.inOutCubic(prog(t, K.modelo - .1, K.modelo + .45)));
      c.save(); c.beginPath(); c.rect(-80, yP, 1240, 2200); c.clip(); c.fillStyle = PAPEL; c.fillRect(-80, -80, 1240, 2080); escenaLista(c, t); c.restore();
    }
    return;
  }
  if (t < K.quien - .3) { escenaLista(c, t); return; }
  if (t < K.programa + .5) { escenaNadie(c, t); if (t > K.programa - .3) escenaBPE(c, t); return; }
  if (t < K.porAnos + .6) { escenaBPE(c, t); if (t > K.porAnos - .2) escenaFerro(c, t); return; }
  if (t < K.importa + .8) { escenaFerro(c, t); if (t > K.importa - .2) escenaMesa(c, t); return; }
  if (t < K.asi + .1) { escenaMesa(c, t); return; }
  escenaMesa(c, t); escenaFinal(c, t);
}

function dibuja(c: Ctx, t: number) {
  const negro = t >= K.negro && t < K.antes;
  c.fillStyle = negro ? NOCHE : PAPEL; c.fillRect(0, 0, 1080, 1920);
  const z = 1.025 + .012 * Math.sin(t * .83) + .03 * smooth(prog(t, K.fin, DURACION)), dx = 9 * Math.sin(t * .71), dy = 12 * Math.cos(t * .61);
  c.save(); c.translate(540 + dx, 960 + dy); c.rotate(.0045 * Math.sin(t * .47)); c.scale(z, z); c.translate(-540, -960);
  escena(c, t);
  c.restore();
}

export const Pieza: React.FC = () => <Lienzo dibuja={dibuja} preparar={preparar} />;
