// Serie 2, capítulo 6c. La mesa de la bola, vista desde el techo. Abre en el mapa de parecidos del capítulo
// anterior: la pregunta cae, el círculo busca y no contesta. Sobre la mesa caen tres notas boca abajo; ninguna
// sola contesta. El mapa vuelve debajo de ellas y el círculo atrapa las dos que se parecen a la pregunta,
// pero la tercera queda lejos. Luego un corcho entra debajo de las mismas notas: las páginas se arrugan, las
// palabras se recortan, se vuelven cosas con chincheta y se atan con hilo rojo. La bola sigue el hilo con el
// dedo y llega. Armarlo cuesta. La otra salida es una lupa: busca, lo que encuentra le dice qué buscar
// después. Al final, tres caminos hacia la misma pregunta, y la bola elige uno sola.
// Todos los tiempos vienen de t.json, que escribe partitura.py: dibujo y sonido son los mismos números.
import React from "react";
import { azar, Cam, clamp, curvas, ease, Fuente, lerp, prog, resorte, smooth, texto } from "../../kit";
import { ACENTO, GRIS, Lienzo, LUZ, mono, PAPEL, rotulo, serif, sombra, TINTA } from "../../marca";
import { agente } from "../../personaje";
import { brazo } from "../../personaje";
import A from "./t.json";
import duracion from "./duracion.json";

export const DURACION = duracion.dur;
type C = CanvasRenderingContext2D;
type P = [number, number];
type R = { x: number; y: number; w: number; h: number };
type Pal = { x: number; y: number; w: number };
type D = { veta: HTMLCanvasElement; corcho: HTMLCanvasElement; pal: Pal[][] };

// ---------- el mundo ----------
const KRAFT = "#CFBC98", HOJA = "#FDFCF8", OSCURO = "#161514", ROJO = "#E9896C", HILO = "#B42F1B", CORCHO = "#B98B5A";
const MESA: R = { x: 40, y: 190, w: 1000, h: 1440 };
const TAB: R = { x: 60, y: 405, w: 960, h: 1090 };
const MAPA: R = { x: 80, y: 300, w: 920, h: 1180 };
const MAPA2: R = { x: 70, y: 690, w: 450, h: 640 };
const NW = 440, NH = 340, FN = 66, LH = 80;
const NB: [number, number, number][] = [[300, 720, -.05], [750, 790, .045], [520, 1190, -.025]];
const NM: P[] = [[330, 960], [665, 620], [758, 1118]];
const Q: P = [480, 790];
const QC: P = [540, 345], QW = 860, QH = 330;
const RB = 80;
const NOTAS = [
  { l: ["Tu mamá", "no come", "mariscos."], k: [[0, "mamá"], [2, "mariscos"]] as [number, string][] },
  { l: ["El sábado", "reservamos", "en La Perla."], k: [[0, "sábado"], [2, "La Perla"]] as [number, string][] },
  { l: ["La Perla", "es una", "marisquería."], k: [[0, "La Perla"], [2, "marisquería"]] as [number, string][] },
];
const PREG = ["¿El restaurante", "del sábado le sirve", "a tu mamá?"];
const RESP = ["hay que cambiar", "de restaurante"];

// ---------- herramientas ----------
let FR = 0;
const frac = (x: number) => x - Math.floor(x);
const tiembla = (j: number) => frac(Math.sin(j * 12.9898 + FR * 78.233) * 43758.5453) - .5;
const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * 6.2832 + f);
const salto = (k: number, h: number) => (k <= 0 || k >= 1 ? 0 : h * 4 * k * (1 - k));
const en = (t: number, a: number, b: number) => t >= a && t < b;
const ven = (t: number, a: number, b: number, c0: number, d0: number) => smooth(prog(t, a, b)) * (1 - smooth(prog(t, c0, d0)));
const L2 = (a: P, b: P, k: number): P => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
function circulo(c: C, x: number, y: number, r: number) { c.beginPath(); c.arc(x, y, Math.max(r, .1), 0, 6.2832); c.fill(); }
function linea(c: C, ax: number, ay: number, bx: number, by: number) { c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); }
const ID = { p: (x: number, y: number) => ({ x, y, s: 1, zc: 1 }) } as unknown as Cam;
/** Recorre [tiempo, valor] con curva suave por tramo: nada se detiene en seco. */
function ruta(t: number, K: [number, P][]): P {
  if (t <= K[0][0]) return K[0][1];
  for (let i = 1; i < K.length; i++) if (t < K[i][0]) return L2(K[i - 1][1], K[i][1], ease.inOutSine(prog(t, K[i - 1][0], K[i][0])));
  return K[K.length - 1][1];
}

// ---------- cámara ----------
type V = [number, number, number];
const V0: V = [470, 760, 1.75];
const CAM: [number, number, V, ((x: number) => number)?][] = [
  [0, A.revela, [480, 790, 2.02], ease.inOutSine],
  [A.revela, 1.3, [540, 900, 1], ease.inOutCubic],
  [A.flip[0] - .35, .7, [420, 800, 1.16]], [A.flip[1] - .35, .8, [640, 860, 1.16]], [A.flip[2] - .35, .8, [540, 1070, 1.16]],
  [A.ninguna[0] - .55, .8, [540, 900, 1]],
  [A.mapa, 1.0, [540, 920, .94]], [A.tercera, 1.1, [600, 990, .9]], [A.buscador - .4, 1, [530, 900, .95]],
  [A.paraeso, .9, [540, 905, 1]], [A.sigue, 1.0, [520, 890, 1.03]], [A.cambiar - .1, .8, [540, 900, 1]],
  [A.armar, .9, [540, 905, .94]], [A.salida, .8, [540, 900, 1]], [A.bs - .2, .8, [555, 870, 1.02]],
  [A.agentica, 1, [540, 885, 1]], [A.caminos - .8, 1, [540, 880, .98]],
  [A.nuevo, 1.0, [540, 1060, 1.1]], [A.antes + .3, 1.0, [540, 990, 1.03]], [A.hoy, .8, [540, 900, .98]],
  [A.buscar + .2, 1.6, [540, 780, 1.02]], [A.finvoz + .2, DURACION - A.finvoz - .2, [540, 830, .95], ease.inOutSine],
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
const GOLPES: [number, number][] = [[A.cae, 30], [A.caen[0], 7], [A.caen[1], 7], [A.caen[2], 9], [A.guardar + .25, 16], [A.llega + .45, 6], [A.cambiar + .15, 8],
  [A.microsoft + .1, 10], [A.salida + .6, 8], [A.encontro + .45, 12], [A.finvoz + .45, 7]];
function sacude(t: number): P {
  let x = 0, y = 0;
  for (const [ti, a] of GOLPES) { const d = t - ti; if (d < 0 || d > .8) continue; const e0 = a * Math.exp(-d * 9); x += e0 * Math.sin(d * 61); y += e0 * Math.cos(d * 47); }
  return [x, y];
}

// ---------- la mesa ----------
function mesa(c: C, d: D) {
  const { x, y, w, h } = MESA;
  c.fillStyle = "rgba(28,22,14,.15)"; c.fillRect(x + 16, y + 24, w, h);
  c.drawImage(d.veta, x, y, w, h);
  c.strokeStyle = TINTA; c.lineWidth = 6; c.strokeRect(x, y, w, h);
  const L = 140, G = 40;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    c.save(); c.translate(x + (sx > 0 ? w : 0), y + (sy > 0 ? h : 0)); c.scale(-sx, -sy);
    c.fillStyle = "#1b1b1a"; c.beginPath(); c.moveTo(-10, -10); c.lineTo(L, -10); c.lineTo(L, G); c.lineTo(G, G); c.lineTo(G, L); c.lineTo(-10, L); c.closePath(); c.fill();
    c.fillStyle = "#77746c"; for (const [a, b] of [[12, 12], [L - 24, 12], [12, L - 24]]) circulo(c, a, b, 7);
    c.restore();
  }
}
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

// ---------- el mapa de parecidos (el mismo del capítulo anterior) ----------
type Idea = { w: string; x: number; y: number; l: number };
const IDEAS: Idea[] = [
  { w: "mamá", x: 190, y: 1085, l: 0 }, { w: "tía", x: 140, y: 1215, l: 1 }, { w: "familia", x: 300, y: 1170, l: 1 },
  { w: "sábado", x: 850, y: 505, l: 0 }, { w: "domingo", x: 880, y: 720, l: 0 }, { w: "fiesta", x: 560, y: 430, l: 0 },
  { w: "restaurante", x: 640, y: 900, l: 1 }, { w: "reservar", x: 410, y: 610, l: -1 },
  { w: "marisquería", x: 900, y: 1270, l: -1 }, { w: "camarón", x: 420, y: 1300, l: -1 }, { w: "ceviche", x: 770, y: 1440, l: 1 },
  { w: "pastel", x: 200, y: 1360, l: 1 }, { w: "postre", x: 330, y: 1440, l: 1 }, { w: "globos", x: 210, y: 450, l: 1 }, { w: "boleros", x: 150, y: 680, l: 1 },
];
const FUENTES = [[220, 1110, 1, 150], [760, 560, 1, 160], [780, 1300, 1, 170], [260, 1400, .8, 120], [570, 940, .8, 120], [170, 620, .8, 110], [420, 420, .7, 120]];
const PUNTOS: P[] = (() => { const r = azar(404), L: P[] = []; while (L.length < 110) { const x = MAPA.x + 20 + r() * (MAPA.w - 40), y = MAPA.y + 20 + r() * (MAPA.h - 40); if (IDEAS.every((q) => Math.hypot(q.x - x, q.y - y) > 60)) L.push([x, y]); } return L; })();
const enR = (R0: R, p: P): P => [R0.x + (p[0] - MAPA.x) * R0.w / MAPA.w, R0.y + (p[1] - MAPA.y) * R0.h / MAPA.h];

/** El mapa como hoja de tinta: kx recorta desde la izquierda (rollo a la derecha), ky desde abajo (rollo arriba). */
function mapa(c: C, t: number, R0: R, kx: number, ky: number, o: { ideas?: number; brillo?: (i: number) => number; etiq?: boolean; mueve?: (i: number) => P; calla?: number } = {}) {
  const x0 = R0.x + R0.w * kx, y1 = R0.y + R0.h * ky;
  if (x0 >= R0.x + R0.w - 1 || y1 <= R0.y + 1) return;
  const sc = R0.w / MAPA.w;
  c.save();
  c.fillStyle = "rgba(20,16,12,.22)"; c.fillRect(x0 + 12, R0.y + 16, R0.x + R0.w - x0, y1 - R0.y);
  c.beginPath(); c.rect(x0, R0.y, R0.x + R0.w - x0, y1 - R0.y); c.clip();
  c.fillStyle = OSCURO; c.fillRect(R0.x, R0.y, R0.w, R0.h);
  const F: Fuente[] = FUENTES.map(([x, y, a, s], i) => { const p = enR(R0, [x + 22 * vaiven(t, 7 + i, i), y + 18 * vaiven(t, 9 + i, i * 2)]); return { x: p[0], y: p[1], a, s: s * sc }; });
  curvas(c, ID, F, { x0: R0.x, x1: R0.x + R0.w, y0: R0.y, y1: R0.y + R0.h, paso: 13 * Math.max(sc, .6), niveles: [.18, .38, .6, .84], tinta: (_, i) => `rgba(237,234,227,${.13 + i * .06})`, grosor: (i) => 1.6 + i * .5 });
  PUNTOS.forEach((q, i) => { const p = enR(R0, q); c.fillStyle = `rgba(237,234,227,${.22 + .2 * (.5 + .5 * Math.sin(t * 1.7 + i * 2.1))})`; circulo(c, p[0], p[1], 4 * Math.max(sc, .7)); });
  const ki = o.ideas ?? 1;
  if (ki > 0) IDEAS.forEach((q, i) => {
    const dm = o.mueve ? o.mueve(i) : [0, 0], p = enR(R0, [q.x + dm[0], q.y + dm[1]]), b = o.brillo ? o.brillo(i) : 0;
    c.fillStyle = b > .5 ? "#fff" : LUZ; circulo(c, p[0], p[1], (9 + 7 * b) * Math.max(sc, .7));
    if (o.etiq === false) return;
    const px = 40;
    const lx = q.l === 0 ? p[0] : p[0] + q.l * 18, ly = q.l === 0 ? p[1] - 22 : p[1] + 13;
    texto(c, q.w, lx, ly, { fuente: serif(px, true), color: b > .5 ? "#fff" : "rgba(237,234,227,.82)", alfa: ki * (o.calla ?? 1), alin: q.l < 0 ? "right" : q.l > 0 ? "left" : "center" });
  });
  c.restore();
  // el rollo
  if (kx > .001) { c.fillStyle = "#0b0a09"; c.beginPath(); c.roundRect(x0 - 22, R0.y - 14, 44, R0.h + 28, 22); c.fill(); c.fillStyle = "rgba(237,234,227,.3)"; c.fillRect(x0 - 8, R0.y - 6, 5, R0.h + 12); }
  if (ky < .999) { c.fillStyle = "#0b0a09"; c.beginPath(); c.roundRect(R0.x - 14, y1 - 22, R0.w + 28, 44, 22); c.fill(); c.fillStyle = "rgba(237,234,227,.3)"; c.fillRect(R0.x - 6, y1 - 10, R0.w + 12, 5); }
}
/** Cuándo se ve la hoja grande y cuánto. */
function mapaEstado(t: number): [number, number] | null {
  if (t < A.preg + 1.7) return [ease.inOutCubic(prog(t, A.preg + .35, A.preg + 1.4)), 1];
  if (t > A.mapa - .05 && t < A.paraeso + 1.2) return [0, ease.inOutCubic(prog(t, A.mapa, A.mapa + .9)) * (1 - ease.inOutCubic(prog(t, A.paraeso + .25, A.paraeso + 1.1)))];
  return null;
}
function anilloR(t: number) {
  if (t < A.revela + 1) return ease.outCubic(prog(t, A.anillo, 2.9)) * 330 * (1 - ease.inCubic(prog(t, A.contestar - .05, A.contestar + .3)));
  return ease.outCubic(prog(t, A.buscador, A.atrapa)) * 300 * (1 - smooth(prog(t, A.paraeso, A.paraeso + .4)));
}
/** Gancho: lo parecido se acerca a la pregunta… y al no contestar, regresa de golpe a su lugar. */
const tToque = (d: number) => A.anillo + (1 - (1 - d / 330) ** (1 / 3)) * (2.9 - A.anillo);
function jalaIdea(t: number) {
  return (i: number): P => {
    if (t > A.revela + 2) return [0, 0];
    const q = IDEAS[i], d = Math.hypot(q.x - Q[0], q.y - Q[1]); if (d > 325) return [0, 0];
    const th = tToque(d), k = smooth(prog(t, th, th + .55)) * .38 * (t < A.contestar ? 1 : 1 - resorte(t - A.contestar, 2.6, .3));
    return [(Q[0] - q.x) * k, (Q[1] - q.y) * k];
  };
}
/** Pulsos de sonar que salen de la pregunta mientras busca. */
const PINGS = [0, 1, 2, 3].map((j) => A.anillo + j * .75).filter((x) => x < A.contestar - .25);
function pings(c: C, t: number) {
  for (const ti of PINGS) {
    const a = t - ti; if (a < 0 || a > 1.3) continue;
    c.save(); c.globalAlpha = (1 - a / 1.3) * .75; c.strokeStyle = ROJO; c.lineWidth = 4; c.beginPath(); c.arc(Q[0], Q[1], 40 + a / 1.3 * 470, 0, 7); c.stroke(); c.restore();
  }
}
function brilloIdea(t: number) {
  return (i: number) => {
    const q = IDEAS[i], r = anilloR(t);
    return r > 0 && Math.hypot(q.x - Q[0], q.y - Q[1]) < r ? 1 : 0;
  };
}

// ---------- notas ----------
type NS = { x: number; y: number; r: number; s: number; z: number; flip: number; a: number; corte: number; hueco: number; arruga: number; marca: number[]; borde: number; gris: number };
function notaEn(i: number, t: number): NS | null {
  const [bx, by, br] = NB[i], tc = A.caen[i];
  if (t < tc - .5) return null;
  let x = bx, y = by, r = br, s = 1, z = 0;
  if (t < tc) { const k = prog(t, tc - .5, tc); z = (1 - k * k) * 1.6; r = br + (1 - k) * (i % 2 ? .6 : -.6); }
  else z = salto((t - tc) / .28, .12);
  const flip = ease.inOutCubic(prog(t, A.flip[i], A.flip[i] + .45));
  z += salto(prog(t, A.flip[i], A.flip[i] + .45), .35);
  const sh = t - A.ninguna[i] - .22;
  if (sh > 0 && sh < 1) x += Math.sin(sh * 34) * 16 * Math.exp(-sh * 5);
  // al mapa y de regreso
  const tv = i === 2 ? A.tercera - .15 : A.vuela + i * .14, dv = i === 2 ? .8 : .55;
  const km = ease.inOutCubic(prog(t, tv, tv + dv)), tb = A.paraeso + .05 + i * .08, kb = ease.inOutCubic(prog(t, tb, tb + .6));
  const mm = km * (1 - kb);
  x = lerp(x, NM[i][0], mm); y = lerp(y, NM[i][1], mm); s = lerp(1, .56, mm); r = lerp(r, r * .3, mm);
  z += salto(prog(t, tv, tv + dv), i === 2 ? .9 : .5) + salto(prog(t, tb, tb + .6), .5);
  if (i < 2) z += salto((t - A.atrapa - i * .1) / .35, .25);
  const marca = NOTAS[i].k.map((_, j) => smooth(prog(t, A.marca[i * 2 + j] - .05, A.marca[i * 2 + j] + .3)) * (1 - smooth(prog(t, A.vuela - .3, A.vuela))));
  const borde = i < 2 ? smooth(prog(t, A.atrapa - .05 + i * .1, A.atrapa + .15 + i * .1)) * (1 - kb) : smooth(prog(t, A.tercera, A.tercera + .2)) * (1 - smooth(prog(t, A.parece + .9, A.fuera)));
  const gris = i === 2 ? smooth(prog(t, A.fuera - .1, A.fuera + .3)) * (1 - kb) * .18 : 0;
  const corte = smooth(prog(t, A.paginas - .05, A.paginas + .3));
  const hueco = t > A.paginas + .42 ? 1 : 0;
  const arruga = prog(t, A.paginas + .45, A.paginas + .8);
  if (t > A.paginas + 1.8) return null;
  return { x, y, r, s, z, flip, a: 1, corte, hueco, arruga, marca, borde, gris };
}
/** Una nota: n<3 es una de las tres; n>=3 es una de tantas (semilla). */
function nota(c: C, d: D, n: number, x: number, y: number, r: number, s: number, o: Partial<NS> & { luz?: number; sinTexto?: boolean } = {}) {
  const z = o.z ?? 0, sc = s * (1 + z * .22), flip = o.flip ?? 1;
  const fx = Math.cos(Math.PI * flip), frente = fx < 0;
  c.save(); c.globalAlpha *= o.a ?? 1;
  // sombra
  c.save(); c.translate(x + (10 + z * 34) * s, y + (14 + z * 46) * s); c.rotate(r); c.scale(sc * Math.max(Math.abs(fx), .02), sc);
  c.fillStyle = `rgba(28,20,12,${clamp(.24 - z * .06, .06, .24)})`; c.fillRect(-NW / 2, -NH / 2, NW, NH); c.restore();
  c.translate(x, y); c.rotate(r); c.scale(sc * Math.max(Math.abs(fx), .02), sc);
  c.fillStyle = frente ? HOJA : "#ECE7DA"; c.strokeStyle = TINTA; c.lineWidth = 3 / Math.max(s, .4);
  c.beginPath(); c.rect(-NW / 2, -NH / 2, NW, NH); c.fill(); c.stroke();
  if (!frente) {
    c.strokeStyle = "rgba(17,17,17,.1)"; c.lineWidth = 3; for (let k = 0; k < 5; k++) linea(c, -NW / 2 + 30, -NH / 2 + 60 + k * 54, NW / 2 - 30, -NH / 2 + 60 + k * 54);
    if (n < 3) texto(c, String(n + 1), 0, 66, { fuente: serif(200, true), color: ACENTO });
  } else if (n < 3) {
    const N = NOTAS[n];
    N.l.forEach((s0, li) => {
      const yy = -LH + li * LH + 22;
      if (o.sinTexto) return;
      if (o.hueco) {
        // las palabras ya se fueron: solo lo que no era cosa
        c.save(); c.font = serif(FN, true); c.fillStyle = TINTA; c.textAlign = "left";
        let resto = s0;
        const tot = c.measureText(s0).width; let xx = -tot / 2;
        for (const [lj, w] of N.k) if (lj === li) { const ix = resto.indexOf(w); if (ix >= 0) { const antes = resto.slice(0, ix); c.fillText(antes, xx, yy); xx += c.measureText(antes + w).width; resto = resto.slice(ix + w.length); } }
        c.fillText(resto, xx, yy); c.restore();
      } else texto(c, s0, 0, yy, { fuente: serif(FN, true), color: TINTA });
    });
    N.k.forEach(([li], j) => {
      const p = d.pal[n][j], m = o.marca ? o.marca[j] : 0;
      if (m > 0) { c.strokeStyle = ACENTO; c.lineWidth = 7; c.lineCap = "round"; linea(c, p.x - p.w / 2, p.y + 16, p.x - p.w / 2 + p.w * m, p.y + 16); }
      const cr = o.corte ?? 0;
      if (cr > 0 && !o.hueco) { c.save(); c.globalAlpha *= cr; c.setLineDash([12, 9]); c.strokeStyle = ACENTO; c.lineWidth = 4; c.strokeRect(p.x - p.w / 2 - 14, p.y - 58, p.w + 28, 80); c.restore(); }
      void li;
    });
  } else {
    const rr = azar(n * 31);
    texto(c, ["pastel", "globos", "tía Lupe", "piñata", "invitados", "lunes", "regalo", "boleros", "velas", "primos", "mesa", "música", "pastel", "flores"][n % 14], -NW / 2 + 34, -NH / 2 + 90, { fuente: serif(76, true), color: TINTA, alin: "left" });
    c.fillStyle = "rgba(17,17,17,.75)";
    for (let k = 0; k < 3; k++) { c.beginPath(); c.roundRect(-NW / 2 + 34, -NH / 2 + 150 + k * 48, (NW - 80) * (.45 + rr() * .5), 12, 6); c.fill(); }
  }
  // cinta
  c.fillStyle = "rgba(226,214,184,.78)"; c.save(); c.translate(0, -NH / 2); c.rotate(-.04); c.fillRect(-64, -20, 128, 40); c.restore();
  if ((o.borde ?? 0) > .01) { c.save(); c.globalAlpha *= o.borde!; c.strokeStyle = ACENTO; c.lineWidth = 12 / Math.max(s, .4); c.strokeRect(-NW / 2 - 8, -NH / 2 - 8, NW + 16, NH + 16); c.restore(); }
  if ((o.luz ?? 0) > .01) { c.save(); c.globalAlpha *= o.luz!; c.strokeStyle = ACENTO; c.lineWidth = 16; c.strokeRect(-NW / 2 - 10, -NH / 2 - 10, NW + 20, NH + 20); c.restore(); }
  if ((o.gris ?? 0) > .01) { c.fillStyle = `rgba(22,21,20,${o.gris})`; c.fillRect(-NW / 2, -NH / 2, NW, NH); }
  c.restore();
}
/** Un papel hecho bola. */
function bolaPapel(c: C, x: number, y: number, rad: number, rot: number, seed: number) {
  const r = azar(seed);
  c.save(); c.translate(x, y); c.rotate(rot);
  c.fillStyle = "rgba(28,20,12,.2)"; circulo(c, 8, 12, rad);
  c.fillStyle = HOJA; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath();
  for (let i = 0; i < 14; i++) { const a = i / 14 * 6.2832, q = rad * (.82 + r() * .3); if (i) c.lineTo(Math.cos(a) * q, Math.sin(a) * q); else c.moveTo(Math.cos(a) * q, Math.sin(a) * q); }
  c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = "rgba(17,17,17,.35)"; c.lineWidth = 2;
  for (let i = 0; i < 6; i++) { const a = r() * 6.28, b = a + 1 + r() * 2; linea(c, Math.cos(a) * rad * .2, Math.sin(a) * rad * .2, Math.cos(b) * rad * .75, Math.sin(b) * rad * .75); }
  c.restore();
}

// ---------- la pregunta ----------
function preguntaEn(t: number): { p: P; m: number; s: number; z: number; flip: number; a: number } | null {
  if (t < .05) return null;
  if (t < A.cae) { const k = prog(t, .05, A.cae); return { p: Q, m: 0, s: 1, z: (1 - k * k) * 2.2, flip: 0, a: 1 }; }
  if (t < A.vuela - .1) {
    const k = ease.inOutCubic(prog(t, A.preg, A.preg + .55));
    return { p: L2(Q, QC, k), m: k, s: 1, z: salto(prog(t, A.preg, A.preg + .55), .6) + salto((t - A.cae) / .3, .2), flip: 0, a: 1 };
  }
  if (t < A.paraeso + .8) {
    const k = ease.inOutCubic(prog(t, A.vuela - .1, A.vuela + .45));
    return { p: L2(QC, Q, k), m: 1 - k, s: 1, z: salto(prog(t, A.vuela - .1, A.vuela + .45), .6), flip: 0, a: 1 - smooth(prog(t, A.paraeso + .2, A.paraeso + .6)) };
  }
  if (t > A.caminos - .55) {
    const k = prog(t, A.caminos - .55, A.caminos - .1);
    return { p: QC, m: 1, s: 1, z: (1 - k * k) * 1.2, flip: ease.inOutCubic(prog(t, A.encontro - .1, A.encontro + .4)), a: smooth(k * 3) };
  }
  return null;
}
function pregunta(c: C, t: number) {
  const e0 = preguntaEn(t); if (!e0) return;
  const { p, m, z, flip, a } = e0;
  const w = lerp(150, QW, m), h = lerp(110, QH, m), sc = 1 + z * .25, fx = Math.cos(Math.PI * flip), atras = fx < 0;
  c.save(); c.globalAlpha = a;
  c.save(); c.translate(p[0] + 10 + z * 40, p[1] + 14 + z * 50); c.scale(sc * Math.abs(fx), sc); c.fillStyle = `rgba(28,20,12,${clamp(.25 - z * .06, .05, .25)})`; c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, lerp(30, 8, m)); c.fill(); c.restore();
  c.translate(p[0], p[1]); c.scale(sc * Math.max(Math.abs(fx), .02), sc);
  c.fillStyle = HOJA; c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, lerp(30, 8, m)); c.fill();
  if (m < 1) { c.globalAlpha = a * (1 - m); c.fillStyle = ACENTO; c.fill(); c.globalAlpha = a; }
  if (m > .2) { c.strokeStyle = ACENTO; c.lineWidth = 9; c.stroke(); }
  if (m < .5) texto(c, "?", 0, 34, { fuente: serif(104, true), color: "#fff", alfa: 1 - m * 2 });
  const kt = smooth(prog(m, .6, 1));
  if (kt > 0 && !atras) PREG.forEach((s0, i) => texto(c, s0, 0, -72 + i * 92, { fuente: serif(82, true), color: TINTA, alfa: kt }));
  if (atras) {
    RESP.forEach((s0, i) => texto(c, s0, 0, -28 + i * 96, { fuente: serif(88, true), color: i === 0 ? TINTA : TINTA }));
    const kc = smooth(prog(t, A.encontro + .3, A.encontro + .6));
    if (kc > 0) { c.strokeStyle = ACENTO; c.lineWidth = 12; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath(); c.moveTo(-380, -110); c.lineTo(-380 + 30 * Math.min(kc * 2, 1), -110 + 30 * Math.min(kc * 2, 1)); if (kc > .5) c.lineTo(-350 + 60 * (kc - .5) * 2, -80 - 70 * (kc - .5) * 2); c.stroke(); }
  }
  c.restore();
}
/** El "?" grande del gancho: el mapa no contesta. */
function signo(c: C, t: number) {
  const k = ease.outBack(prog(t, A.contestar - .05, A.contestar + .25), 2.2) * (1 - smooth(prog(t, A.preg - .2, A.preg + .1)));
  if (k <= 0) return;
  c.save(); c.translate(Q[0] + 120, Q[1] - 120); c.rotate(.12 + .05 * Math.sin(t * 3)); c.scale(k, k);
  texto(c, "?", 0, 60, { fuente: serif(230, true), color: ROJO });
  c.restore();
}

// ---------- el tablero ----------
const COSA: Record<string, P> = { sabado: [270, 615], perla: [800, 695], mariscos: [790, 1195], mama: [280, 1130] };
const CW = 280, CH = 330;
const RECORTES: { n: number; j: number; a: string; ord: number }[] = [
  { n: 1, j: 0, a: "sabado", ord: 0 }, { n: 1, j: 1, a: "perla", ord: 1 }, { n: 0, j: 1, a: "mariscos", ord: 2 }, { n: 0, j: 0, a: "mama", ord: 3 },
  { n: 2, j: 0, a: "perla", ord: 4.3 }, { n: 2, j: 1, a: "mariscos", ord: 5.3 },
];
const vueloR = (r0: { ord: number }) => A.cosas + .05 + r0.ord * .1;
const naceCosa = (k: string) => Math.min(...RECORTES.filter((r0) => r0.a === k).map((r0) => vueloR(r0) + .4));
const tabX = (t: number) => -1150 * (1 - ease.outCubic(prog(t, A.guardar - .35, A.guardar + .25))) - 1180 * ease.inCubic(prog(t, A.salida - .05, A.salida + .6));
const HILOS: { a: string; b: string; f: string; t: number }[] = [
  { a: "sabado", b: "perla", f: "reservamos", t: A.conectan }, { a: "mama", b: "mariscos", f: "no come", t: A.nocome - .08 }, { a: "perla", b: "mariscos", f: "sirve", t: A.sirve - .08 },
];
function ancla(a: P, b: P): P {
  const dx = b[0] - a[0], dy = b[1] - a[1], k = Math.min((CW / 2 - 24) / Math.max(Math.abs(dx), 1e-3), (CH / 2 - 24) / Math.max(Math.abs(dy), 1e-3));
  return [a[0] + dx * k, a[1] + dy * k];
}
function hiloGeo(i: number): [P, P, P] {
  const h = HILOS[i];
  // el hilo de La Perla a los mariscos sale por el costado: abajo está su nombre
  const a: P = i === 2 ? [COSA.perla[0] - CW / 2 + 22, COSA.perla[1] + 60] : ancla(COSA[h.a], COSA[h.b]);
  const b: P = i === 2 ? [COSA.mariscos[0] - CW / 2 + 30, COSA.mariscos[1] - CH / 2 + 24] : ancla(COSA[h.b], COSA[h.a]);
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return [a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + L * .07], b];
}
const qb = (g: [P, P, P], u: number): P => { const v = 1 - u; return [v * v * g[0][0] + 2 * v * u * g[1][0] + u * u * g[2][0], v * v * g[0][1] + 2 * v * u * g[1][1] + u * u * g[2][1]]; };
function trazoHilo(c: C, g: [P, P, P], u0: number, u1: number, ancho: number, color: string, vib = 1.2) {
  if (u1 <= u0) return;
  c.strokeStyle = color; c.lineWidth = ancho; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath();
  for (let k = 0; k <= 26; k++) { const u = lerp(u0, u1, k / 26), p = qb(g, u), j = k * 3.7 + g[0][0]; const x = p[0] + tiembla(j) * vib, y = p[1] + tiembla(j + 9) * vib; if (k) c.lineTo(x, y); else c.moveTo(x, y); }
  c.stroke();
}
function chincheta(c: C, x: number, y: number, s: number, golpe = 0) {
  const e0 = s * (1 + .5 * golpe);
  c.fillStyle = "rgba(28,20,12,.3)"; circulo(c, x + 7 * s, y + 9 * s, 15 * e0);
  const g = c.createRadialGradient(x - 5 * e0, y - 6 * e0, 2, x, y, 17 * e0);
  g.addColorStop(0, "#F09C82"); g.addColorStop(.45, "#C8402A"); g.addColorStop(1, "#6E1E10");
  c.fillStyle = g; circulo(c, x, y, 16 * e0);
  c.fillStyle = "rgba(255,255,255,.75)"; circulo(c, x - 6 * e0, y - 6 * e0, 4 * e0);
}
// los dibujos de cada cosa
function icono(c: C, k: string, t: number) {
  c.lineJoin = "round"; c.lineCap = "round";
  if (k === "sabado") {
    c.fillStyle = "#fff"; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.rect(-90, -80, 180, 160); c.fill(); c.stroke();
    c.fillStyle = ACENTO; c.fillRect(-90, -80, 180, 46); texto(c, "SÁB", 0, -45, { fuente: mono(36), color: "#fff" });
    c.fillStyle = TINTA; for (const dx of [-50, 50]) { c.beginPath(); c.roundRect(dx - 6, -96, 12, 30, 6); c.fill(); }
    for (let r = 0; r < 3; r++) for (let q = 0; q < 5; q++) { c.fillStyle = r === 1 && q === 3 ? ACENTO : "rgba(17,17,17,.55)"; c.fillRect(-74 + q * 30, -18 + r * 30, 18, 18); }
  } else if (k === "perla") {
    c.fillStyle = "#fff"; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.rect(-92, -40, 184, 122); c.fill(); c.stroke();
    for (let i = 0; i < 6; i++) { c.fillStyle = i % 2 ? "#fff" : ACENTO; c.beginPath(); c.moveTo(-100 + i * 33.3, -40); c.lineTo(-100 + (i + 1) * 33.3, -40); c.lineTo(-100 + (i + 1) * 33.3, -12); c.arc(-100 + (i + .5) * 33.3, -12, 16.6, 0, Math.PI); c.closePath(); c.fill(); c.stroke(); }
    c.fillStyle = TINTA; c.fillRect(-20, 22, 40, 60);
    c.fillStyle = "#fff"; c.beginPath(); c.moveTo(-74, -42); c.lineTo(74, -42); c.lineTo(54, -96); c.lineTo(-54, -96); c.closePath(); c.fill(); c.stroke();
    // la concha con su perla
    c.beginPath(); c.moveTo(-34, -52); for (let i = 0; i <= 8; i++) { const a = Math.PI + i / 8 * Math.PI; c.lineTo(Math.cos(a) * 34, -52 + Math.sin(a) * 34 * .9); } c.closePath(); c.stroke();
    const g = c.createRadialGradient(-4, -66, 1, 0, -62, 13); g.addColorStop(0, "#fff"); g.addColorStop(1, "#C9C2B2"); c.fillStyle = g; circulo(c, 0, -62, 12);
  } else if (k === "mariscos") {
    const paso = t;
    c.save(); c.scale(.92, .92); c.translate(0, 18);
    c.strokeStyle = ACENTO; c.fillStyle = ACENTO; c.lineWidth = 8;
    for (const l of [-1, 1]) {
      for (let i = 0; i < 3; i++) { const w = Math.sin(paso * 6 + i * 2 + l) * 6; c.beginPath(); c.moveTo(l * 50, 6 + i * 11); c.quadraticCurveTo(l * (98 - i * 4), -8 + i * 24 + w, l * (106 - i * 12), 34 + i * 19 + w); c.stroke(); }
      c.lineWidth = 11; c.beginPath(); c.moveTo(l * 48, -18); c.quadraticCurveTo(l * 96, -32, l * 86, -66); c.stroke(); c.lineWidth = 8;
      c.beginPath(); c.ellipse(l * 86, -84, 25, 30, l * .3, 0, 7); c.fill();
      c.fillStyle = "#fff"; c.beginPath(); c.moveTo(l * 84, -80); c.lineTo(l * 72, -118); c.lineTo(l * 102, -116); c.closePath(); c.fill(); c.fillStyle = ACENTO;
      c.lineWidth = 6; linea(c, l * 18, -36, l * 22, -62); c.lineWidth = 8;
      c.fillStyle = TINTA; circulo(c, l * 22, -68, 9); c.fillStyle = ACENTO;
    }
    c.beginPath(); c.ellipse(0, 0, 66, 46, 0, 0, 7); c.fill();
    c.strokeStyle = "rgba(253,252,248,.55)"; c.lineWidth = 4; c.beginPath(); c.arc(0, -8, 34, .4, 2.74); c.stroke();
    c.restore();
  } else if (k === "mama") {
    c.fillStyle = "#EFEAE0"; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.ellipse(0, 0, 86, 100, 0, 0, 7); c.fill(); c.stroke();
    c.save(); c.beginPath(); c.ellipse(0, 0, 80, 94, 0, 0, 7); c.clip();
    c.fillStyle = TINTA; c.beginPath(); c.ellipse(0, 112, 80, 64, 0, 0, 7); c.fill();
    circulo(c, 0, -12, 40); circulo(c, 0, -62, 22);
    c.restore();
    c.fillStyle = ACENTO; c.beginPath(); c.moveTo(56, 64); c.bezierCurveTo(56, 52, 76, 50, 76, 64); c.bezierCurveTo(76, 50, 96, 52, 96, 64); c.bezierCurveTo(96, 78, 76, 88, 76, 94); c.bezierCurveTo(76, 88, 56, 78, 56, 64); c.fill();
  }
}
const ETQ: Record<string, string> = { sabado: "sábado", perla: "La Perla", mariscos: "mariscos", mama: "mamá" };
function cosa(c: C, k: string, x: number, y: number, s: number, rot: number, t: number, pulso = 0, tacha = 0) {
  const e0 = s * (1 + .12 * pulso);
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(e0, e0);
  c.fillStyle = "rgba(28,20,12,.24)"; c.fillRect(-CW / 2 + 10, -CH / 2 + 14, CW, CH);
  c.fillStyle = HOJA; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.rect(-CW / 2, -CH / 2, CW, CH); c.fill(); c.stroke();
  c.save(); c.translate(0, -40); icono(c, k, t); c.restore();
  texto(c, ETQ[k], 0, CH / 2 - 26, { fuente: serif(64, true), color: TINTA });
  if (pulso > .01) { c.strokeStyle = ACENTO; c.lineWidth = 10; c.globalAlpha = pulso; c.strokeRect(-CW / 2 - 8, -CH / 2 - 8, CW + 16, CH + 16); c.globalAlpha = 1; }
  if (tacha > 0) { c.strokeStyle = ACENTO; c.lineWidth = 16; c.lineCap = "round"; const q = CW * .42; linea(c, -q, -q, -q + 2 * q * Math.min(tacha * 2, 1), -q + 2 * q * Math.min(tacha * 2, 1)); if (tacha > .5) linea(c, q, -q, q - 2 * q * (tacha - .5) * 2, -q + 2 * q * (tacha - .5) * 2); }
  c.restore();
}
function bandera(c: C, x: number, y: number, s0: string, k: number, rot: number) {
  if (k <= 0) return;
  c.save(); c.translate(x, y); c.rotate(rot); const e0 = clamp(k, 0, 1.3); c.scale(e0, e0);
  c.font = serif(60, true); const w = c.measureText(s0).width + 44, h = 82;
  c.fillStyle = "rgba(28,20,12,.24)"; c.fillRect(-w / 2 + 8, -h / 2 + 10, w, h);
  c.fillStyle = "#fff"; c.strokeStyle = HILO; c.lineWidth = 4; c.beginPath(); c.rect(-w / 2, -h / 2, w, h); c.fill(); c.stroke();
  texto(c, s0, 0, 20, { fuente: serif(60, true), color: HILO });
  c.restore();
}
/** Dónde va el dedo de la bola cuando sigue el hilo. */
const TRAZO: [number, number, number, boolean][] = [[0, A.sigue + .25, A.unacosa - .05, false], [2, A.unacosa + .05, A.siguiente - .05, false], [1, A.siguiente + .05, A.llega - .05, true]];
function dedo(t: number): P | null {
  if (t < A.sigue - .25 || t > A.llega + .9) return null;
  const g0 = hiloGeo(0);
  if (t < TRAZO[0][1]) return L2(COSA.sabado, g0[0], smooth(prog(t, A.sigue - .25, TRAZO[0][1])));
  for (let k = 0; k < 3; k++) {
    const [i, a, b, rev] = TRAZO[k], g = hiloGeo(i);
    if (t < a) { const [ip, , bp, rp] = TRAZO[k - 1]; const gp = hiloGeo(ip); return L2(rp ? gp[0] : gp[2], rev ? g[2] : g[0], smooth(prog(t, bp, a))); }
    if (t < b) { const u = ease.inOutSine(prog(t, a, b)); return qb(g, rev ? 1 - u : u); }
  }
  return L2(hiloGeo(1)[0], COSA.mama, smooth(prog(t, A.llega - .05, A.llega + .3)));
}
const SUELTA: Record<number, number> = { 0: A.tambien - .1 };
const PINES_ARMAR = [[0, 0], [0, 1], [2, 0], [1, 1], [2, 1], [1, 0]] as [number, number][];
const tPin = (i: number) => A.armar + .12 + i * .26;
const NUEVAS: [number, number, number][] = [[535, 488, .2], [215, 1415, -.16], [880, 1425, .12]];
function tablero(c: C, t: number, d: D) {
  const ox = tabX(t);
  if (t < A.guardar - .4 || ox < -1170) return;
  c.save(); c.translate(ox, 0);
  const { x, y, w, h } = TAB;
  c.fillStyle = "rgba(28,20,12,.25)"; c.fillRect(x + 14, y + 20, w, h);
  c.drawImage(d.corcho, x, y, w, h);
  c.strokeStyle = "#3a2c1c"; c.lineWidth = 18; c.strokeRect(x + 9, y + 9, w - 18, h - 18);
  c.strokeStyle = TINTA; c.lineWidth = 3; c.strokeRect(x, y, w, h);
  // las cosas
  const rot: Record<string, number> = { sabado: -.04, perla: .035, mariscos: -.02, mama: .03 };
  for (const k of Object.keys(COSA)) {
    const tn = naceCosa(k); if (t < tn - .02) continue;
    const s = lerp(.35, 1, ease.outBack(prog(t, tn - .02, tn + .3), 1.6));
    const merges = RECORTES.filter((r0) => r0.a === k).map((r0) => vueloR(r0) + .4).filter((x0) => x0 > tn + .01);
    let pul = merges.reduce((m0, x0) => Math.max(m0, Math.exp(-Math.max(t - x0, 0) * 5) * (t > x0 ? 1 : 0)), 0);
    const nombra: Record<string, number[]> = { mama: [A.nm, A.llega + .1], mariscos: [A.mar1, A.mar2, A.siguiente], perla: [A.perla, A.unacosa], sabado: [A.sigue + .2] };
    for (let q = 0; q < 7; q++) { const tq = A.microsoft + .2 + q * 1.5; if (tq > A.armar - .4) break; if (q % 3 === 0) { nombra.sabado.push(tq); if (q) nombra.mama.push(tq); } else nombra[q % 3 === 1 ? "perla" : "mariscos"].push(tq); }
    for (const tt of nombra[k]) pul = Math.max(pul, ven(t, tt - .08, tt + .08, tt + .5, tt + .8));
    const tacha = k === "perla" ? ease.outCubic(prog(t, A.restaurante - .1, A.restaurante + .4)) * (1 - smooth(prog(t, A.microsoft - .3, A.microsoft))) : 0;
    cosa(c, k, COSA[k][0], COSA[k][1], s, rot[k] + .02 * vaiven(t, 3.1, k.length), t, pul, tacha);
  }
  // GraphRAG: una luz recorre el grafo, cosa por cosa, una y otra vez
  const kr = ven(t, A.microsoft + .2, A.microsoft + .5, A.armar - .3, A.armar);
  if (kr > 0) {
    const ciclo = ((t - A.microsoft - .2) / 1.5) % 3, i0 = Math.floor(ciclo), u = ciclo - i0, [hi, , , rev] = TRAZO[i0], g = hiloGeo(hi);
    const p = qb(g, rev ? 1 - u : u);
    c.save(); c.globalAlpha = kr;
    const gl = c.createRadialGradient(p[0], p[1], 2, p[0], p[1], 46); gl.addColorStop(0, "rgba(255,230,200,.95)"); gl.addColorStop(.35, "rgba(233,137,108,.55)"); gl.addColorStop(1, "rgba(233,137,108,0)");
    c.fillStyle = gl; circulo(c, p[0], p[1], 46); c.restore();
  }
  // hilos
  HILOS.forEach((hh, i) => {
    const u = ease.outCubic(prog(t, hh.t, hh.t + .45)); if (u <= 0) return;
    let g = hiloGeo(i);
    const tz = SUELTA[i];
    if (tz !== undefined && t > tz) {                                  // se zafa una chincheta: el hilo cuelga
      const k = ease.outBack(prog(t, tz, tz + .5), 1.4);
      const caido: P = [g[0][0] + 60, g[0][1] + 300];
      g = [L2(g[0], caido, k), [lerp(g[1][0], g[0][0] + 160, k), lerp(g[1][1], g[1][1] + 280, k)], g[2]];
    }
    const nudo = PINES_ARMAR.some(([hi], pi) => hi === i && en(t, tPin(pi), tPin(pi) + .3)) ? 6 : 1.2;
    trazoHilo(c, g, 0, u, 6, HILO, nudo);
    // el tramo que ya recorrió el dedo
    const tr = TRAZO.find((q) => q[0] === i);
    if (tr) {
      const kk = prog(t, tr[1], tr[2]), apaga = 1 - smooth(prog(t, A.microsoft - .4, A.microsoft));
      if (kk > 0 && apaga > 0) { c.save(); c.globalAlpha = apaga; if (tr[3]) trazoHilo(c, g, 1 - ease.inOutSine(kk), 1, 13, ACENTO, 1); else trazoHilo(c, g, 0, ease.inOutSine(kk), 13, ACENTO, 1); c.restore(); }
    }
    const gp = PINES_ARMAR.map(([hi, e1], pi) => (hi === i ? [e1, pi] : null)).filter(Boolean) as [number, number][];
    const golpe = (e1: number) => { const q = gp.find((z0) => z0[0] === e1); if (!q) return 0; const dt = t - tPin(q[1]); return dt > 0 && dt < .3 ? Math.sin(dt / .3 * Math.PI) : 0; };
    if (!(SUELTA[i] !== undefined && t > SUELTA[i])) chincheta(c, g[0][0], g[0][1], 1, golpe(0));
    if (u > .98) chincheta(c, g[2][0], g[2][1], 1, golpe(1));
    const tz2 = SUELTA[i];
    if (tz2 !== undefined && t > tz2) {                                 // al zafarse, la etiqueta se cae
      const a = t - tz2, m0 = qb(hiloGeo(i), .5);
      if (a < .9) { c.save(); c.globalAlpha = 1 - smooth(prog(a, .45, .9)); bandera(c, m0[0] - 90 * a, m0[1] + 120 * a + 1100 * a * a, hh.f, 1, -.04 - a * 2.2); c.restore(); }
    } else {
      const m = qb(g, .5);
      bandera(c, m[0], m[1], hh.f, ease.outBack(prog(t, hh.t + .25, hh.t + .55), 2), (i - 1) * .04 + .015 * vaiven(t, 2.7, i));
    }
  });
  // las chinchetas que salieron volando
  for (const [hs, tz] of Object.entries(SUELTA)) {
    const a = t - tz, g = hiloGeo(Number(hs)), dir = Number(hs) === 0 ? -1 : 1; if (a < 0) continue;
    const v = Math.min(a, .55);
    chincheta(c, g[0][0] + dir * 230 * v, g[0][1] - 260 * v + 470 * v * v, 1);
  }
  // las notas nuevas que nadie ha clavado
  NUEVAS.forEach(([nx, ny, nr], i) => {
    const ti = A.aldia + .3 + i * .25; if (t < ti - .35) return;
    const k = prog(t, ti - .35, ti);
    nota(c, d, 4 + i * 3, nx, ny, nr + (1 - k) * .8, .42, { z: (1 - k * k) * 1.5, flip: 1 });
  });
  c.restore();
}
function calendario(c: C, t: number) {
  const k = ease.outBack(prog(t, A.aldia - .25, A.aldia + .1), 1.5) * (1 - smooth(prog(t, A.salida - .2, A.salida + .2)));
  if (k <= 0) return;
  const DIAS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
  const n = Math.floor(clamp((t - A.aldia) / .2, 0, 6)), f = clamp((t - A.aldia) / .2 - n, 0, 1);
  c.save(); c.translate(850, 275); c.scale(k, k); c.rotate(.05);
  c.fillStyle = "rgba(28,20,12,.25)"; c.fillRect(-88, -86, 190, 200);
  c.fillStyle = "#fff"; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.rect(-95, -95, 190, 200); c.fill(); c.stroke();
  const dia = (i: number, alt: number) => { c.fillStyle = ACENTO; c.fillRect(-95, -95, 190, 54 * alt); texto(c, DIAS[i % 7], 0, -55, { fuente: mono(40), color: "#fff" }); texto(c, String(3 + i), 0, 70, { fuente: serif(104), color: TINTA }); };
  dia(n + (f > 0 && n < 6 ? 1 : 0), 1);
  if (f > 0 && n < 6 && t - A.aldia < 1.4) { c.save(); c.scale(1, 1 - f); c.fillStyle = "#fff"; c.fillRect(-95, -95, 190, 200); c.strokeRect(-95, -95, 190, 200); dia(n, 1); c.restore(); }
  c.fillStyle = TINTA; for (const dx of [-50, 50]) { c.beginPath(); c.roundRect(dx - 7, -112, 14, 36, 7); c.fill(); }
  c.restore();
}

// ---------- recortes: las palabras se vuelven cosas ----------
function recortes(c: C, t: number, d: D) {
  if (t < A.paginas + .4 || t > A.cosas + 1.2) return;
  for (const r0 of RECORTES) {
    const [bx, by, br] = NB[r0.n], p = d.pal[r0.n][r0.j];
    const x0 = bx + Math.cos(br) * p.x - Math.sin(br) * (p.y - 20), y0 = by + Math.sin(br) * p.x + Math.cos(br) * (p.y - 20);
    const tf = vueloR(r0), k = ease.inOutCubic(prog(t, tf, tf + .42));
    if (k >= 1) continue;
    const dst = COSA[r0.a], x = lerp(x0, dst[0] + tabX(t), k), y = lerp(y0, dst[1], k), z = .25 + salto(prog(t, tf, tf + .42), .9), s = lerp(1, .6, k) * (1 + z * .2);
    const w = p.w + 28, h = 80;
    c.save(); c.translate(x + 8 + z * 30, y + 10 + z * 40); c.rotate(br); c.fillStyle = "rgba(28,20,12,.22)"; c.fillRect(-w / 2 * s, -h / 2 * s, w * s, h * s); c.restore();
    c.save(); c.translate(x, y); c.rotate(br + k * .4 * (r0.ord % 2 ? 1 : -1)); c.scale(s, s);
    c.fillStyle = HOJA; c.fillRect(-w / 2, -h / 2, w, h);
    c.setLineDash([12, 9]); c.strokeStyle = ACENTO; c.lineWidth = 4; c.strokeRect(-w / 2, -h / 2, w, h); c.setLineDash([]);
    texto(c, NOTAS[r0.n].k[r0.j][1], 0, 22, { fuente: serif(FN, true), color: TINTA });
    c.restore();
  }
}
function papeles(c: C, t: number) {
  for (let i = 0; i < 3; i++) {
    const a = t - (A.paginas + .62 + i * .07); if (a < 0 || a > 1.4) continue;
    const [bx, by] = NB[i], dir = [-1, 1, .2][i];
    bolaPapel(c, bx + dir * 380 * a, by + 140 * a + 900 * a * a, 70, a * 6 * dir, 50 + i);
  }
}

// ---------- la lupa y lo que encuentra ----------
const SPREAD: { x: number; y: number; r: number; n: number }[] = (() => {
  const r = azar(77), L: { x: number; y: number; r: number; n: number }[] = [];
  const COL = [200, 425, 650, 870], FIL = [560, 770, 980, 1190];
  FIL.forEach((y, fi) => COL.forEach((x, ci) => {
    const n = fi === 1 && ci === 2 ? 1 : fi === 3 && ci === 0 ? 2 : fi === 2 && ci === 1 ? 0 : 3 + fi * 4 + ci;
    L.push({ x: x + (r() - .5) * 30, y: y + (r() - .5) * 30, r: (r() - .5) * .22, n });
  }));
  return L;
})();
const IDX = (n: number) => SPREAD.findIndex((q) => q.n === n);
const GEN = [IDX(3 + 3), IDX(3 + 4), IDX(3 + 14)];                      // la cadena genérica de "otra vez"
const tSpread = (i: number) => A.salida + .5 + ((i * 7) % 16) * .05;
const salSpread = (t: number) => 1300 * ease.inCubic(prog(t, A.boris - .7, A.boris + .1));
const LEE: P[] = [[540, 565], [540, 1015]];
const levanta = (t: number, j: number) => (j === 0 ? ease.inOutCubic(prog(t, A.ap1, A.ap1 + .5)) : ease.inOutCubic(prog(t, A.ap2, A.ap2 + .5)));
function luzGen(t: number, g: number) {
  const ti = [A.unavez + .85, A.otravez + .85, A.conlo + .7][g];
  return smooth(prog(t, ti - .1, ti + .1)) * (1 - smooth(prog(t, A.bs - .5, A.bs - .2)));
}
function regado(c: C, t: number, d: D) {
  if (t < A.salida + .1 || t > A.boris + .2) return;
  const sx = salSpread(t);
  SPREAD.forEach((q, i) => {
    const ti = tSpread(i); if (t < ti - .4) return;
    if (q.n === 1 && levanta(t, 0) > 0) return;
    if (q.n === 2 && levanta(t, 1) > 0) return;
    const k = prog(t, ti - .4, ti), g = GEN.indexOf(i);
    nota(c, d, q.n, q.x + sx, q.y, q.r + (1 - k) * .9, .48, { z: (1 - k * k) * 1.8, flip: 1, luz: g >= 0 ? luzGen(t, g) : 0 });
  });
  // "con lo que ya encontró": pistas que vuelan a la lupa y el rastro de la cadena
  const tr = smooth(prog(t, A.otravez + .2, A.otravez + .5)) * (1 - smooth(prog(t, A.bs - .5, A.bs - .2)));
  if (tr > 0) {
    const pts = GEN.map((i) => [SPREAD[i].x + sx, SPREAD[i].y] as P);
    c.save(); c.globalAlpha = tr; c.strokeStyle = ACENTO; c.lineWidth = 6; c.setLineDash([3, 16]); c.lineCap = "round"; c.lineDashOffset = -t * 70;
    const u1 = prog(t, A.otravez + .2, A.otravez + .85), u2 = prog(t, A.conlo + .1, A.conlo + .7);
    linea(c, pts[0][0], pts[0][1], lerp(pts[0][0], pts[1][0], u1), lerp(pts[0][1], pts[1][1], u1));
    if (u2 > 0) linea(c, pts[1][0], pts[1][1], lerp(pts[1][0], pts[2][0], u2), lerp(pts[1][1], pts[2][1], u2));
    c.restore();
  }
  // las que encontró, en grande para leerlas
  const dim = smooth(prog(t, A.ap1, A.ap1 + .4)) * (1 - smooth(prog(t, A.boris - .7, A.boris - .3)));
  if (dim > 0) { c.fillStyle = `rgba(207,188,152,${.62 * dim})`; c.fillRect(MESA.x, MESA.y, MESA.w, MESA.h); }
  [1, 2].forEach((n, j) => {
    const k = levanta(t, j); if (k <= 0) return;
    const q = SPREAD[IDX(n)], dst = LEE[j];
    const x = lerp(q.x, dst[0], k) + sx, y = lerp(q.y, dst[1], k), s = lerp(.48, 1, k), z = salto(prog(t, j ? A.ap2 : A.ap1, (j ? A.ap2 : A.ap1) + .5), .6);
    const mk = j === 0 ? [smooth(prog(t, A.ap1 + .45, A.ap1 + .75)), smooth(prog(t, A.perla3 - .05, A.perla3 + .3))] : [0, smooth(prog(t, A.marisq2 - .05, A.marisq2 + .3))];
    nota(c, d, n, x, y, lerp(q.r, 0, k), s, { z, flip: 1, marca: j === 0 ? [mk[0], 0] : [smooth(prog(t, A.ap2 + .45, A.ap2 + .75)), 0] });
    // el círculo rojo de la pista
    const ci = mk[1]; const p = d.pal[n][j === 0 ? 1 : 1];
    if (ci > 0 && k > .9) { c.save(); c.translate(x + p.x, y + p.y - 20); c.strokeStyle = ACENTO; c.lineWidth = 7; c.lineCap = "round"; c.beginPath(); c.ellipse(0, 0, p.w / 2 + 12, 50, -.04, -1.9, -1.9 + 6.6 * ci); c.stroke(); c.restore(); }
  });
  // de "La Perla" a "La Perla": una pista lleva a la otra
  const kt = ease.outCubic(prog(t, A.marisq2 + .25, A.marisq2 + .8)) * (1 - smooth(prog(t, A.boris - .7, A.boris - .3)));
  if (kt > 0) {
    const a = LEE[0], b = LEE[1], pa = d.pal[1][1], pb = d.pal[2][0];
    const ax = a[0] + pa.x + sx + pa.w / 2 + 30, ay = a[1] + pa.y - 20, bx = b[0] + pb.x + sx + pb.w / 2 + 30, by = b[1] + pb.y - 20;
    c.save(); c.strokeStyle = ACENTO; c.lineWidth = 7; c.setLineDash([3, 17]); c.lineCap = "round"; c.lineDashOffset = -t * 70;
    c.beginPath(); c.moveTo(ax, ay); const cx = Math.max(ax, bx) + 150; c.quadraticCurveTo(cx, (ay + by) / 2, lerp(ax, bx, kt), lerp(ay, by, kt)); c.stroke(); c.restore();
  }
}
function lupaD(c: C, x: number, y: number, s: number, rot: number, alfa = 1) {
  c.save(); c.globalAlpha = alfa; c.translate(x, y); c.rotate(rot); c.scale(s, s);
  c.fillStyle = "rgba(28,20,12,.18)"; circulo(c, 14, 18, 66);
  c.strokeStyle = TINTA; c.lineWidth = 20; c.lineCap = "round"; linea(c, 44, 44, 98, 98);
  c.fillStyle = "rgba(255,255,255,.2)"; circulo(c, 0, 0, 58);
  c.strokeStyle = TINTA; c.lineWidth = 13; c.beginPath(); c.arc(0, 0, 60, 0, 7); c.stroke();
  c.strokeStyle = "rgba(255,255,255,.85)"; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, 44, 3.5, 4.5); c.stroke();
  c.restore();
}
/** La lupa: dónde está su lente y si la bola la sostiene. */
function lupaEn(t: number): { p: P; tiene: boolean; s: number } | null {
  if (t < A.masagente - .15) return null;
  if (t < A.boris + .2) {
    return { p: ruta(t, [
      [A.masagente - .1, [690, 1300]], [A.unavez, [690, 1270]], [A.unavez + .25, [200, 560]], [A.unavez + .85, [870, 560]], [A.otravez + .2, [870, 560]], [A.otravez + .85, [200, 770]],
      [A.conlo + .1, [200, 770]], [A.conlo + .7, [650, 1190]], [A.bs - .4, [650, 1190]], [A.bs + .05, [200, 980]], [A.ap1 - .55, [425, 940]], [A.ap1 - .1, [650, 770]],
      [A.ap1 + .3, [650, 770]], [A.ap1 + .8, [880, 880]], [A.bp - .05, [880, 880]], [A.bp + .4, [650, 1190]], [A.ap2 - .55, [425, 1180]], [A.ap2 - .1, [200, 1190]],
      [A.ap2 + .3, [200, 1190]], [A.ap2 + .85, [880, 1150]], [A.boris + .2, [860, 1250]],
    ]), tiene: true, s: 1 };
  }
  if (t < A.antes + .1) {
    return { p: ruta(t, [[A.boris + .2, [860, 1250]], ...[0, 1, 2, 3].flatMap((j) => [[tSalto(j) - .22, palabraCod(j)], [tSalto(j) + .14, palabraCod(j)]] as [number, P][]), [A.conto + .4, [870, 1300]], [A.funcionaba, [870, 1300]], [A.funcionaba + .3, CPAG[0]], [A.funcionaba + .6, CPAG[0]], [A.funcionaba + .95, CPAG[1]], [A.funcionaba + 1.25, CPAG[1]],
      [A.funcionaba + 1.6, CPAG[2]], [A.funcionaba + 1.9, CPAG[2]], [A.solo + .3, [700, 1250]], [A.caminos - .2, [700, 1220]], [A.ninguno - .1, [690, 1210]], [A.antes + .1, [700, 1230]]]), tiene: true, s: 1 };
  }
  if (t < A.hoy + .25) { const k = ease.outCubic(prog(t, A.antes + .1, A.antes + .5)); return { p: L2([700, 1230], [735, 1410], k), tiene: false, s: 1 }; }
  if (t < A.finvoz + .05) {
    const b = bolaEn(t);
    return { p: ruta(t, [[A.hoy + .25, [735, 1410]], [A.hoy + .6, [680, 1180]], [A.decide - .4, [300, 1000]], [A.decide + .05, [540, 960]], [A.buscar - .05, [780, 1000]],
      [A.buscar + .25, [540, b.p[1] - 190]], [A.finvoz + .05, [540, b.p[1] - 170]]]), tiene: true, s: 1 };
  }
  const b = bolaEn(t).p;
  const k = ease.outCubic(prog(t, A.finvoz + .05, A.finvoz + .45));
  return { p: L2([540, b[1] - 170], [330, 790], k), tiene: k < .6, s: 1 };
}
function etiqueta(c: C, t: number, lp: P) {
  const palabra = t < A.ahora + .45 ? "sábado" : "La Perla";
  const k = (t < A.ahora + .45 ? ease.outBack(prog(t, A.bs - .1, A.bs + .2), 2) * (1 - ease.inCubic(prog(t, A.ahora, A.ahora + .22))) : ease.outBack(prog(t, A.ahora + .4, A.ahora + .62), 2)) * (1 - smooth(prog(t, A.boris - .5, A.boris - .2)));
  if (t < A.bs - .1 || k <= 0) return;
  const x = lp[0] - 30 + 6 * vaiven(t, .9), y = lp[1] + 120;
  c.strokeStyle = TINTA; c.lineWidth = 3; linea(c, lp[0] - 40, lp[1] + 46, x, y - 30);
  c.save(); c.translate(x, y); c.rotate(-.08 + .05 * vaiven(t, 1.3)); c.scale(k, k);
  c.font = serif(62, true); const w = c.measureText(palabra).width + 40;
  c.fillStyle = "rgba(28,20,12,.24)"; c.fillRect(-w / 2 + 6, -34, w, 80);
  c.fillStyle = "#fff"; c.strokeStyle = ACENTO; c.lineWidth = 5; c.beginPath(); c.rect(-w / 2, -40, w, 80); c.fill(); c.stroke();
  texto(c, palabra, 0, 18, { fuente: serif(62, true), color: ACENTO });
  c.restore();
}
/** "La Perla" se despega de la nota y se vuelve lo siguiente que busca. */
function pistaVuela(c: C, t: number, d: D) {
  const k = ease.inOutCubic(prog(t, A.ahora, A.ahora + .45)); if (k <= 0 || k >= 1) return;
  const pa = d.pal[1][1], a: P = [LEE[0][0] + pa.x, LEE[0][1] + pa.y - 20], l = lupaEn(t); if (!l) return;
  const b: P = [l.p[0] - 30, l.p[1] + 120], p = L2(a, b, k), z = salto(k, .8);
  c.save(); c.translate(p[0], p[1] - z * 60); c.scale(1 + z * .2, 1 + z * .2); c.rotate(k * .3);
  c.fillStyle = "#fff"; c.strokeStyle = ACENTO; c.lineWidth = 4; c.setLineDash([10, 8]); c.beginPath(); c.rect(-pa.w / 2 - 14, -40, pa.w + 28, 80); c.fill(); c.stroke(); c.setLineDash([]);
  texto(c, "La Perla", 0, 20, { fuente: serif(FN, true), color: ACENTO }); c.restore();
}
/** Las pistas genéricas de "otra vez": una bolita roja vuela de la nota a la lupa. */
function chispas(c: C, t: number) {
  [[A.otravez + .05, 0], [A.conlo - .05, 1]].forEach(([ti, g]) => {
    const k = ease.inOutCubic(prog(t, ti, ti + .3)); if (k <= 0 || k >= 1) return;
    const q = SPREAD[GEN[g]], l = lupaEn(t); if (!l) return;
    const p = L2([q.x, q.y], l.p, k);
    c.fillStyle = ACENTO; circulo(c, p[0], p[1] - salto(k, 70), 16);
  });
}

// ---------- Claude Code: la palabra de Boris Cherny ----------
const CPAG: P[] = [[800, 800], [800, 1015], [800, 1230]];
// Mientras se nombra a Boris Cherny, el código ya está sobre la mesa y la lupa salta de palabra en palabra.
const GRID: P[] = [[262, 800], [540, 785], [818, 800], [262, 1045], [540, 1030], [818, 1045]];
const GROT = [-.05, .03, -.02, .04, -.03, .05];
const SALTOS: { p: number; k: number; x: number }[] = [{ p: 0, k: 2, x: -40 }, { p: 4, k: 4, x: 30 }, { p: 2, k: 1, x: -20 }, { p: 3, k: 5, x: 50 }];
const tSalto = (j: number) => A.boris + .55 + j * .55;
const palabraCod = (j: number): P => { const q = SALTOS[j], g = GRID[q.p]; return [g[0] + q.x * .5, g[1] + (-NH / 2 + 53 + q.k * 40) * .5]; };
function codigo(c: C, t: number) {
  if (t < A.boris - .4 || t > A.caminos + .3) return;
  const sal = ease.inCubic(prog(t, A.caminos - .8, A.caminos - .2));
  const ap = ease.outCubic(prog(t, A.conto, A.conto + .45));
  const junta = ease.inOutCubic(prog(t, A.conto - .05, A.conto + .55));
  const abre = ease.inOutCubic(prog(t, A.funcionaba - .3, A.funcionaba + .2));
  for (let i = 6; i >= 0; i--) {
    const base: P = [740 + (i - 3) * 6, 1010 - i * 7], col = CPAG[i % 3];
    let x0: number, y0: number, r0: number, z = 0;
    if (i < 6) {
      const ll = A.boris - .3 + i * .07, kl = ease.outCubic(prog(t, ll, ll + .38));
      if (kl <= 0) continue;
      x0 = lerp(GRID[i][0], base[0], junta) + (1 - kl) * 420; y0 = lerp(GRID[i][1], base[1], junta) - (1 - kl) * 260; r0 = lerp(GROT[i], (i - 3) * .05, junta) + (1 - kl) * .6;
      z = (1 - kl) * 1.2;
    } else { if (ap <= 0) continue; x0 = base[0] + (1 - ap) * 500; y0 = base[1]; r0 = (i - 3) * .05; }
    const x = lerp(x0, col[0], i < 3 ? abre : 0) + 600 * sal, y = lerp(y0, col[1], i < 3 ? abre : 0);
    const r = lerp(r0, (i - 1) * .02, i < 3 ? abre : 0), s = .5 * (1 + z * .2);
    if (i >= 3 && abre > .95) continue;
    c.save(); c.translate(x, y); c.rotate(r); c.scale(s, s);
    c.fillStyle = "rgba(28,20,12,.2)"; c.fillRect(-NW / 2 + 12 + z * 40, -NH / 2 + 14 + z * 50, NW, NH);
    c.fillStyle = HOJA; c.strokeStyle = TINTA; c.lineWidth = 5; c.fillRect(-NW / 2, -NH / 2, NW, NH); c.strokeRect(-NW / 2, -NH / 2, NW, NH);
    const rr = azar(90 + i);
    for (let k = 0; k < 7; k++) { c.fillStyle = "rgba(17,17,17,.6)"; c.beginPath(); c.roundRect(-NW / 2 + 40 + (rr() < .4 ? 50 : 0), -NH / 2 + 46 + k * 40, (NW - 140) * (.3 + rr() * .6), 14, 7); c.fill(); }
    // la palabra que encontró la lupa en esta página
    SALTOS.forEach((q, j) => {
      if (q.p !== i) return;
      const kw = smooth(prog(t, tSalto(j) + .02, tSalto(j) + .18)) * (1 - junta);
      if (kw > 0) { c.fillStyle = ACENTO; c.globalAlpha = kw; c.beginPath(); c.roundRect(q.x - 70, -NH / 2 + 40 + q.k * 40, 140, 26, 9); c.fill(); c.globalAlpha = 1; }
    });
    c.restore();
  }
  // el rastro de palabra en palabra
  const kr = 1 - junta;
  if (kr > 0) {
    c.save(); c.globalAlpha = kr; c.strokeStyle = ACENTO; c.lineWidth = 6; c.setLineDash([3, 15]); c.lineCap = "round"; c.lineDashOffset = -t * 70;
    for (let j = 0; j < 3; j++) { const u = ease.outCubic(prog(t, tSalto(j) + .1, tSalto(j + 1))); if (u <= 0) continue; const a = palabraCod(j), b = palabraCod(j + 1); linea(c, a[0], a[1], lerp(a[0], b[0], u), lerp(a[1], b[1], u)); }
    c.restore();
  }
  // la pestaña: código
  const kt = ease.outBack(prog(t, A.boris - .05, A.boris + .3), 1.6) * (1 - abre);
  if (kt > 0) { const px = lerp(540, 740, junta), py = lerp(655, 870, junta); c.save(); c.globalAlpha = clamp(kt); c.translate(px + 600 * sal, py); c.rotate(-.04); c.scale(clamp(kt, 0, 1.2), clamp(kt, 0, 1.2)); c.fillStyle = TINTA; c.beginPath(); c.roundRect(-115, -52, 230, 92, 10); c.fill(); texto(c, "código", 0, 18, { fuente: serif(70, true), color: "#fff" }); c.restore(); }
  // el rastro de la lupa
  const u = [prog(t, A.funcionaba + .6, A.funcionaba + .95), prog(t, A.funcionaba + 1.25, A.funcionaba + 1.6)];
  const ap2 = 1 - smooth(prog(t, A.caminos - .9, A.caminos - .5));
  c.save(); c.globalAlpha = ap2; c.strokeStyle = ACENTO; c.lineWidth = 6; c.setLineDash([3, 16]); c.lineCap = "round"; c.lineDashOffset = -t * 70;
  u.forEach((k, i) => { if (k > 0) { const a = CPAG[i], b = CPAG[i + 1]; c.beginPath(); c.moveTo(a[0] - 120, a[1]); c.quadraticCurveTo(a[0] - 220, (a[1] + b[1]) / 2, lerp(a[0] - 120, b[0] - 120, k), lerp(a[1], b[1], k)); c.stroke(); } });
  c.restore();
  // los pedazos que van a parar al mapa vectorial
  for (let j = 0; j < 6; j++) {
    const ti = A.vectorial + .15 + j * .09, k = ease.inOutCubic(prog(t, ti, ti + .4));
    if (k <= 0 || k >= 1) continue;
    const dst = enR(MAPA2, PUNTOS[j * 7]);
    const p = L2([740, 1000], dst, k);
    c.fillStyle = HOJA; c.strokeStyle = TINTA; c.lineWidth = 2; c.save(); c.translate(p[0], p[1] - salto(k, 120)); c.rotate(k * 4); c.fillRect(-26, -20, 52, 40); c.strokeRect(-26, -20, 52, 40); c.restore();
  }
}
function mapa2(c: C, t: number) {
  if (t < A.vectorial - .5 || t > A.caminos + .3) return;
  const k = ease.outCubic(prog(t, A.vectorial - .4, A.vectorial + .15)), sal = ease.inCubic(prog(t, A.caminos - .8, A.caminos - .2));
  const R0 = { ...MAPA2, x: MAPA2.x - 560 * (1 - k) - 600 * sal };
  mapa(c, t, R0, 0, 1, { etiq: false });
  // los pedazos ya convertidos en puntos
  for (let j = 0; j < 6; j++) {
    const kk = smooth(prog(t, A.vectorial + .5 + j * .09, A.vectorial + .7 + j * .09)); if (kk <= 0) continue;
    const p = enR(R0, PUNTOS[j * 7]); c.fillStyle = "#fff"; circulo(c, p[0], p[1], 11 * kk * (1 + .3 * Math.sin(t * 3 + j)));
  }
  texto(c, "base vectorial", R0.x + R0.w / 2, R0.y + 76, { fuente: serif(62, true), color: LUZ, alfa: smooth(prog(t, A.vectorial, A.vectorial + .3)) });
}

// ---------- tres caminos ----------
const CAMINOS: { p: [P, P, P]; k: string; t: number; e: string[] }[] = [
  { p: [[540, 1240], [10, 880], [470, 510]], k: "mapa", t: A.caminos, e: ["mapa"] },
  { p: [[540, 1240], [540, 880], [540, 510]], k: "hilos", t: A.hilos, e: ["hilos"] },
  { p: [[540, 1240], [1070, 880], [610, 510]], k: "buscar", t: A.volver, e: ["volver", "a buscar"] },
];
const CANCHO = 176;
function franja(g: [P, P, P], u: number): P[] {
  const L: P[] = [], Rr: P[] = [];
  for (let k = 0; k <= 36; k++) {
    const s = u * k / 36, p = qb(g, s), q = qb(g, Math.min(s + .01, 1)), o = qb(g, Math.max(s - .01, 0));
    const dx = q[0] - o[0], dy = q[1] - o[1], n = Math.hypot(dx, dy) || 1, w = CANCHO / 2 * lerp(.55, 1, Math.min(s * 3, 1));
    L.push([p[0] - dy / n * w, p[1] + dx / n * w]); Rr.push([p[0] + dy / n * w, p[1] - dx / n * w]);
  }
  return [...L, ...Rr.reverse()];
}
function caminos(c: C, t: number, d: D) {
  if (t < A.caminos - .2) return;
  const dimA = smooth(prog(t, A.antes, A.antes + .4)) * (1 - smooth(prog(t, A.hoy, A.hoy + .4)));
  const orden = [0, 2, 1];
  for (const i of orden) {
    const cm = CAMINOS[i], u = ease.outCubic(prog(t, cm.t - .1, cm.t + .55)); if (u <= .005) continue;
    const pol = franja(cm.p, u);
    const traza = () => { c.beginPath(); pol.forEach((p, j) => (j ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); };
    c.save();
    c.fillStyle = "rgba(28,20,12,.22)"; c.beginPath(); pol.forEach((p, j) => (j ? c.lineTo(p[0] + 12, p[1] + 16) : c.moveTo(p[0] + 12, p[1] + 16))); c.closePath(); c.fill();
    c.beginPath(); pol.forEach((p, j) => (j ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath();
    c.fillStyle = i === 0 ? OSCURO : i === 1 ? CORCHO : "#DCCCAA"; c.fill();
    c.save(); c.clip();
    if (i === 1) c.drawImage(d.corcho, 240, 300, 600, 900);
    const r = azar(300 + i);
    for (let k = 0; k < 26; k++) {
      const s = r() * u, p = qb(cm.p, s), off = (r() - .5) * 120;
      if (i === 0) { c.fillStyle = `rgba(237,234,227,${.3 + .3 * Math.sin(t * 2 + k)})`; circulo(c, p[0] + off, p[1] + (r() - .5) * 30, 6); }
    }
    if (i === 0) { c.strokeStyle = "rgba(237,234,227,.22)"; c.lineWidth = 2; for (let k = 0; k < 5; k++) { const p = qb(cm.p, (k + .5) / 5 * u); c.beginPath(); c.ellipse(p[0], p[1], 60 + 10 * vaiven(t, 3 + k), 30, k, 0, 7); c.stroke(); } }
    if (i === 1) {
      const pts: P[] = []; for (let k = 0; k <= 6; k++) { const s = k / 6 * u, p = qb(cm.p, s); pts.push([p[0] + (k % 2 ? 42 : -42), p[1]]); }
      c.strokeStyle = HILO; c.lineWidth = 6; c.beginPath(); pts.forEach((p, j) => (j ? c.lineTo(p[0] + tiembla(j) * 1.4, p[1]) : c.moveTo(p[0], p[1]))); c.stroke();
      const sube = bolaEn(t);                                           // el tramo que la bola ya recorrió, encendido
      if (t > A.buscar) { const yb = sube.p[1]; c.strokeStyle = ACENTO; c.lineWidth = 12; c.beginPath(); let ini = false; pts.forEach((p) => { if (p[1] >= yb - 40) { if (ini) c.lineTo(p[0], p[1]); else { c.moveTo(p[0], p[1]); ini = true; } } }); c.stroke(); }
      pts.forEach((p) => chincheta(c, p[0], p[1], .8));
    }
    if (i === 2) {
      const pts: P[] = []; for (let k = 1; k <= 4; k++) { const s = (k - .3) / 4 * u, p = qb(cm.p, s); pts.push([p[0] + (k % 2 ? 34 : -34), p[1]]); }
      c.strokeStyle = ACENTO; c.lineWidth = 5; c.setLineDash([3, 14]); c.lineCap = "round"; c.lineDashOffset = -t * 60; c.beginPath(); pts.forEach((p, j) => (j ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke(); c.setLineDash([]);
      pts.forEach((p, j) => { c.save(); c.translate(p[0], p[1]); c.rotate((j % 2 ? .1 : -.12)); c.fillStyle = HOJA; c.strokeStyle = TINTA; c.lineWidth = 3; c.fillRect(-42, -32, 84, 64); c.strokeRect(-42, -32, 84, 64); c.fillStyle = "rgba(17,17,17,.6)"; for (let q = 0; q < 3; q++) c.fillRect(-30, -18 + q * 14, 50 - q * 8, 6); c.restore(); });
    }
    c.restore();
    traza(); c.strokeStyle = TINTA; c.lineWidth = 4; c.lineJoin = "round"; c.stroke();
    // "ninguno gana siempre": la luz pasa de uno a otro sin quedarse
    const ciclo = t - A.ninguno, luz = ciclo > 0 && ciclo < 1.6 ? Math.max(0, Math.sin(Math.PI * clamp((ciclo - i * .38) / .5))) : 0;
    if (luz > .01) { c.globalAlpha = luz; c.strokeStyle = ACENTO; c.lineWidth = 12; c.stroke(); c.globalAlpha = 1; }
    if (dimA > 0) { c.fillStyle = `rgba(207,188,152,${.55 * dimA})`; c.fill(); }
    c.restore();
  }
  // los nombres de cada camino
  CAMINOS.forEach((cm, i) => {
    const k = ease.outBack(prog(t, cm.t + .05, cm.t + .35), 1.8) * (i === 1 ? 1 - smooth(prog(t, A.buscar + .1, A.buscar + .4)) : 1);
    if (k <= 0) return;
    const p = qb(cm.p, i === 1 ? .52 : .5);
    c.save(); c.translate(p[0], p[1] + (i === 1 ? 0 : 20)); c.rotate((i - 1) * .05 + .015 * vaiven(t, 2.3, i)); c.scale(k, k);
    c.font = serif(66, true); const w = Math.max(...cm.e.map((s0) => c.measureText(s0).width)) + 40, h = cm.e.length * 74 + 22;
    c.fillStyle = "rgba(28,20,12,.25)"; c.fillRect(-w / 2 + 8, -h / 2 + 10, w, h);
    c.fillStyle = "#fff"; c.strokeStyle = TINTA; c.lineWidth = 4; c.fillRect(-w / 2, -h / 2, w, h); c.strokeRect(-w / 2, -h / 2, w, h);
    cm.e.forEach((s0, j) => texto(c, s0, 0, -h / 2 + 64 + j * 74, { fuente: serif(66, true), color: TINTA }));
    c.restore();
  });
}
/** Antes: una mano ajena le pone las páginas enfrente. */
const HOJAS_MANO: P[] = [[420, 1150], [560, 1120], [690, 1160]];
function manoAjena(c: C, t: number, d: D) {
  if (t < A.antes - .2 || t > A.hoy + .7) return;
  const ti = [A.alguien - .05, A.alguien + .45, A.paginas2 - .05];
  const ent = ease.outCubic(prog(t, A.antes - .2, A.antes + .5)), sal = ease.inCubic(prog(t, A.hoy - .05, A.hoy + .5));
  let obj: P = [760, 1160];
  ti.forEach((x0, i) => { const k = ven(t, x0 - .35, x0, x0 + .1, x0 + .4); obj = L2(obj, HOJAS_MANO[i], k); });
  const base: P = [1300, 1900];
  const p = L2(L2(base, obj, ent), [1350, 2100], sal);
  // las hojas que ya dejó
  HOJAS_MANO.forEach((q, i) => {
    if (t < ti[i]) return;
    const k = prog(t, ti[i], ti[i] + .2), arr2 = sal;
    nota(c, d, 3 + i * 5, lerp(q[0], 1300, arr2), lerp(q[1], 1900, arr2), (i - 1) * .1, .42, { z: (1 - k) * .4, flip: 1, sinTexto: false });
  });
  const g = 2.1;
  brazo(c, base[0], base[1], p[0], p[1], -140, .25, TINTA, 1, g * 1.14);
  brazo(c, base[0], base[1], p[0], p[1], -140, .25, "#F7F4EC", 1, g);
  // la hoja que trae en la mano
  const lleva = ti.findIndex((x0) => t > x0 - .9 && t < x0);
  if (lleva >= 0 && sal < .01) nota(c, d, 3 + lleva * 5, p[0] - 40, p[1] - 60, -.2, .42, { z: .5, flip: 1 });
}

// ---------- la bola ----------
const B0: P = [840, 1440];
const MOV: [number, number, P, number][] = [
  [A.mapa + .2, .55, [520, 1458], 170], [A.paraeso + .15, .55, [540, 1445], 170],
  [A.armar + .1, .28, [410, 1445], 70], [A.armar + .5, .28, [680, 1445], 70], [A.armar + .9, .28, [540, 1445], 70],
  [A.funcionaba - .65, .45, [580, 1450], 90], [A.caminos - .7, .5, [540, 1330], 120],
  [A.buscar + .12, .4, [540, 1090], 130], [A.buscar + .6, .4, [540, 860], 130], [A.cuando + .05, .45, [540, 690], 130],
];
const BRINCOS: [number, number][] = [[A.caen[2] + .15, 40], [A.llega + .05, 60], [A.ap1 + .05, 30], [A.marisq2 + .15, 40], [A.encontro + .45, 50], [A.masagente, 40]];
function bolaEn(t: number): { p: P; h: number; sq: number } {
  let p: P = B0, h = 0, ult = -9;
  for (const [t0, d, to, alt] of MOV) {
    if (t < t0) break;
    const k = prog(t, t0, t0 + d);
    if (k < 1) { h = salto(k, alt); p = L2(p, to, smooth(k)); break; }
    p = to; ult = t0 + d;
  }
  for (const [ti, a] of BRINCOS) h += salto((t - ti) / .38, a);
  h += Math.abs(vaiven(t, 1.9)) * 6;
  const w = t - ult, sq = w > 0 && w < .45 ? Math.sin(w / .45 * Math.PI) * Math.exp(-w * 4) * .16 : 0;
  return { p, h, sq };
}
type M = [number, number, number];
function manosEn(t: number, b: P, h: number): [M, M] {
  const bx = b[0], by = b[1] - h;
  let m1: M = [bx - 150 + vaiven(t, 1.3) * 10, by - 105 + vaiven(t, 1.7, 1) * 12, .6], m2: M = [bx + 150 + vaiven(t, 1.5, 2) * 10, by - 105 + vaiven(t, 1.1) * 12, .6];
  const mix = (a: M, q: M, k: number): M => [lerp(a[0], q[0], k), lerp(a[1], q[1], k), lerp(a[2], q[2], k)];
  // el gancho: la bola espera fuera de cuadro, con las manos abajo
  let k = ven(t, -1, 0, A.revela, A.revela + .5);
  m1 = mix(m1, [bx - 140, by + 10, .5], k); m2 = mix(m2, [bx + 140, by + 10, .5], k);
  // frente al tablero, las manos abajo: que no tapen los nombres de las cosas
  k = ven(t, A.paraeso + .5, A.paraeso + .9, A.salida, A.salida + .3);
  m1 = mix(m1, [bx - 135, by - 12 + vaiven(t, 1.7, 1) * 8, .6], k); m2 = mix(m2, [bx + 135, by - 12 + vaiven(t, 1.1) * 8, .6], k);
  // sobre el mapa, las manos abajo: que no tapen las notas chicas
  k = ven(t, A.mapa + .7, A.mapa + 1.0, A.paraeso + .2, A.paraeso + .6);
  m1 = mix(m1, [bx - 135, by - 5 + vaiven(t, 1.7, 1) * 8, .6], k); m2 = mix(m2, [bx + 125, by - 5 + vaiven(t, 1.1) * 8, .6], k);
  // lee la pregunta: señala hacia arriba
  k = ven(t, A.preg + .1, A.preg + .5, A.caen[0] - .5, A.caen[0] - .1);
  m1 = mix(m1, [bx - 180, by - 300, 1], k);
  // voltea cada nota
  for (let i = 0; i < 3; i++) {
    k = ven(t, A.flip[i] - .3, A.flip[i], A.flip[i] + .45, A.flip[i] + .75);
    const q: M = [NB[i][0] + (i === 1 ? 120 : 150), NB[i][1] + NH * .32, .9];
    if (i === 1) m2 = mix(m2, q, k); else m1 = mix(m1, q, k);
  }
  // ninguna sola: se encoge de hombros
  k = ven(t, A.ninguna[0] - .1, A.ninguna[0] + .2, A.entre - .3, A.entre);
  m1 = mix(m1, [bx - 240, by - 40, 1], k); m2 = mix(m2, [bx + 220, by - 40, 1], k);
  // "entre las tres": apunta al centro
  k = ven(t, A.entre - .2, A.entre + .1, A.mapa, A.mapa + .3);
  m1 = mix(m1, [520, 960, .2], k);
  // "un buscador": señala la pregunta en el mapa
  k = ven(t, A.buscador - .3, A.buscador, A.fuera + .3, A.fuera + .6);
  m2 = mix(m2, [Q[0] + 12, Q[1] + 112, .2], k);
  // sigue el hilo con el dedo
  const dd = dedo(t);
  if (dd) { k = ven(t, A.sigue - .25, A.sigue, A.llega + .55, A.llega + .9); m2 = mix(m2, [dd[0], dd[1], .15], k); }
  // clava chinchetas
  PINES_ARMAR.forEach(([hi, e1], pi) => {
    const ti = tPin(pi), g = hiloGeo(hi), q = e1 ? g[2] : g[0];
    k = ven(t, ti - .14, ti, ti + .04, ti + .16);
    if (pi % 2) m2 = mix(m2, [q[0], q[1] + 14, .1], k); else m1 = mix(m1, [q[0], q[1] + 14, .1], k);
  });
  // "también": se le zafa el grafo, se lleva las manos a la cabeza y va a volver a clavarlo
  k = ven(t, A.tambien - .2, A.tambien + .1, A.tambien + .5, A.tambien + .8);
  m1 = mix(m1, [bx - 70, by - 150, 1], k); m2 = mix(m2, [bx + 70, by - 150, 1], k);
  const suelto = hiloGeo(0)[0];
  k = ven(t, A.tambien + .55, A.tambien + 1.0, A.salida - .25, A.salida + .05);
  m1 = mix(m1, [suelto[0] + 60, suelto[1] + 300, .9], k);
  // "más de agente": agarra la lupa
  const l = lupaEn(t);
  if (l && l.tiene) { k = smooth(prog(t, A.masagente - .2, A.masagente + .05)) * (t > A.hoy - .1 && t < A.hoy + .35 ? smooth(prog(t, A.hoy + .1, A.hoy + .35)) : 1); m2 = mix(m2, [l.p[0] + 66, l.p[1] + 76, .9], k); }
  // antes: brazos caídos
  k = ven(t, A.antes + .1, A.antes + .5, A.hoy, A.hoy + .3);
  m1 = mix(m1, [bx - 130, by + 30, .1], k); m2 = mix(m2, [bx + 130, by + 30, .1], k);
  // "hoy": la otra mano también decide
  k = ven(t, A.decide - .4, A.decide - .1, A.buscar + .1, A.buscar + .4);
  m1 = mix(m1, [bx - 200, by - 200, 1], k);
  return [m1, m2];
}
function laBola(c: C, t: number, oscuro: boolean) {
  const { p, h, sq } = bolaEn(t);
  const [m1, m2] = manosEn(t, p, h);
  sombra(c, p[0], p[1] + RB * .9, RB * 1.7, clamp(.34 - h * .0012, .08, .34));
  c.save(); c.translate(p[0], p[1] + RB); c.scale(1 + sq * .8, 1 - sq); c.translate(-p[0], -p[1] - RB);
  const y = p[1] - h;
  if (oscuro) {
    const g = RB / 90, col = "rgba(237,234,227,.9)";
    brazo(c, p[0] - 54 * g, y - 50 * g, m1[0], m1[1], 90 * g, m1[2], col, 1, g * 1.4);
    brazo(c, p[0] + 60 * g, y - 30 * g, m2[0], m2[1], -100 * g, m2[2], col, 1, g * 1.4);
    c.fillStyle = col; circulo(c, p[0], y, RB + 5);
  }
  agente(c, p[0], y, RB, [m1[0], m1[1]], [m2[0], m2[1]], { abre1: m1[2], abre2: m2[2] });
  c.restore();
  // un "?" cuando no le alcanza
  const kq = ease.outBack(prog(t, A.ninguna[0], A.ninguna[0] + .25), 2) * (1 - smooth(prog(t, A.entre - .2, A.entre + .1)));
  if (kq > 0) texto(c, "?", p[0] + RB * 1.3, y - RB * .9, { fuente: serif(Math.round(150 * clamp(kq, 0, 1.4)), true), color: ACENTO, base: "middle" });
}
function laLupa(c: C, t: number) {
  const l = lupaEn(t); if (!l) return;
  const k = ease.outBack(prog(t, A.masagente - .15, A.masagente + .2), 2);
  const rot = l.tiene ? -.05 + .06 * vaiven(t, 1.4) : .5;
  lupaD(c, l.p[0], l.p[1], clamp(k, 0, 1.4), rot);
  etiqueta(c, t, l.p);
}

// ---------- pantalla: rótulos y fichas que no viven en la mesa ----------
function ficha(c: C, x: number, y: number, w: number, h: number, k: number, rot: number, f: () => void, borde = TINTA) {
  if (k <= 0) return;
  c.save(); c.translate(x, y); c.rotate(rot); const e0 = lerp(1.25, 1, clamp(k)); c.scale(e0, e0); c.globalAlpha = clamp(k);
  c.fillStyle = "rgba(28,20,12,.22)"; c.fillRect(-w / 2 + 10, -h / 2 + 14, w, h);
  c.fillStyle = HOJA; c.fillRect(-w / 2, -h / 2, w, h); c.strokeStyle = borde; c.lineWidth = 8; c.strokeRect(-w / 2 + 8, -h / 2 + 8, w - 16, h - 16);
  f(); c.restore();
}
/** Texto que se escribe letra por letra, sin moverse de su lugar. */
function escribe(c: C, s0: string, x: number, y: number, f: string, color: string, k: number) {
  if (k <= 0) return;
  c.save(); c.font = f; const w = c.measureText(s0).width; c.restore();
  texto(c, s0.slice(0, Math.ceil(s0.length * clamp(k))), x - w / 2, y, { fuente: f, color, alin: "left" });
}
function pantalla(c: C, t: number) {
  // gancho: una franja de tinta para que el título no pise las palabras del mapa
  const kn = 1 - smooth(prog(t, A.revela, A.revela + .5));
  if (kn > 0) { const g = c.createLinearGradient(0, 0, 0, 470); g.addColorStop(0, `rgba(22,21,20,${.99 * kn})`); g.addColorStop(.74, `rgba(22,21,20,${.98 * kn})`); g.addColorStop(1, "rgba(22,21,20,0)"); c.fillStyle = g; c.fillRect(0, 0, 1080, 470); }
  // gancho
  rotulo(c, t, A.anillo + .55, A.revela + .2, "ningún mapa", 210, 120, LUZ, true);
  rotulo(c, t, A.anillo + .75, A.revela + .2, "de parecidos", 335, 120, LUZ, true);
  // el grafo
  rotulo(c, t, A.grafo, A.paginas - .1, "grafo de conocimiento", 335, 100, ACENTO, true);
  rotulo(c, t, A.paginas, A.cosas - .1, "no páginas", 330, 124, TINTA, true);
  rotulo(c, t, A.cosas, A.conectan - .1, "cosas", 335, 136, TINTA, true);
  rotulo(c, t, A.conectan, A.nm - .2, "y cómo se conectan", 330, 100, TINTA, true);
  // la conclusión
  const kc = ease.outBack(prog(t, A.cambiar - .05, A.cambiar + .3), 1.6) * (1 - smooth(prog(t, A.microsoft - .35, A.microsoft - .05)));
  ficha(c, 540, 255, 820, 250, kc, -.025, () => { texto(c, RESP[0], 0, -14, { fuente: serif(90, true), color: TINTA }); texto(c, RESP[1], 0, 80, { fuente: serif(90, true), color: ACENTO }); }, ACENTO);
  // Microsoft Research, 2024
  const ks = ease.outBack(prog(t, A.microsoft - .1, A.microsoft + .15), 2) * (1 - smooth(prog(t, A.armar - .3, A.armar)));
  if (ks > 0) {
    const s = lerp(1.8, 1, clamp(ks)), kg = smooth(prog(t, A.graphrag - .05, A.graphrag + .2));
    c.save(); c.translate(540, 288); c.rotate(-.03); c.scale(s, s); c.globalAlpha = clamp(ks);
    c.fillStyle = "rgba(253,252,248,.94)"; c.beginPath(); c.roundRect(-400, -90, 800, 180, 12); c.fill();
    c.strokeStyle = ACENTO; c.lineWidth = 7; c.stroke();
    texto(c, "MICROSOFT RESEARCH · 2024", 0, lerp(16, 62, kg), { fuente: mono(42), color: ACENTO });
    if (kg > 0) texto(c, "GraphRAG", 0, 14 + (1 - kg) * 14, { fuente: serif(112), color: TINTA, alfa: kg });
    c.restore();
  }
  rotulo(c, t, A.armar, A.aldia - .1, "armarlo cuesta", 330, 112, TINTA, true);
  rotulo(c, t, A.aldia, A.salida - .25, "mantenerlo", 285, 100, TINTA, true, 420);
  rotulo(c, t, A.aldia + .15, A.salida - .25, "al día", 395, 112, ACENTO, true, 420);
  rotulo(c, t, A.salida, A.unavez - .1, "otra salida", 330, 124, TINTA, true);
  rotulo(c, t, A.unavez, A.otravez - .1, "una vez", 330, 130, TINTA, true);
  rotulo(c, t, A.otravez, A.bs - .3, "otra vez", 330, 130, ACENTO, true);
  rotulo(c, t, A.busqueda - .1, A.boris - .7, "búsqueda agéntica", 315, 104, ACENTO, true);
  // Boris Cherny: solo por escrito
  const kb = ease.outBack(prog(t, A.boris - .15, A.boris + .2), 1.4) * (1 - smooth(prog(t, A.caminos - .9, A.caminos - .55)));
  ficha(c, 540, 385 - 300 * smooth(prog(t, A.caminos - .9, A.caminos - .55)), 860, 300, kb, -.02, () => {
    texto(c, "LO QUE CONTÓ", 0, -92, { fuente: mono(34), color: GRIS, esp: 4 });
    escribe(c, "Boris Cherny", 0, 12, serif(110), TINTA, prog(t, A.boris - .05, A.boris + .55));
    escribe(c, "creador de Claude Code", 0, 98, serif(66, true), ACENTO, prog(t, A.creador - .1, A.creador + .75));
  });
  rotulo(c, t, A.engeneral - .05, A.caminos - .9, "en general", 628, 100, ACENTO, true);
  rotulo(c, t, A.ninguno, A.nuevo - .15, "ninguno gana siempre", 1550, 92, TINTA, true);
  rotulo(c, t, A.quien - .1, A.antes - .15, "quién elige", 1555, 124, ACENTO, true);
  rotulo(c, t, A.antes, A.hoy - .1, "antes", 1555, 124, TINTA, true);
  rotulo(c, t, A.hoy, A.cuando - .1, "hoy", 1555, 140, ACENTO, true);
}

// ---------- la escena ----------
function mundo(c: C, t: number, d: D) {
  mesa(c, d);
  const me = mapaEstado(t);
  if (me) mapa(c, t, MAPA, me[0], me[1], { brillo: brilloIdea(t), mueve: jalaIdea(t), calla: 1 - .5 * smooth(prog(t, A.vuela, A.vuela + .6)) });
  if (me && t < A.contestar + .2) pings(c, t);
  // el círculo del buscador
  const r = anilloR(t);
  if (r > 2 && me) { c.save(); c.strokeStyle = ACENTO; c.lineWidth = 7; c.globalAlpha = .9; c.beginPath(); c.arc(Q[0], Q[1], r, 0, 7); c.stroke(); c.globalAlpha = .18; c.fillStyle = ACENTO; c.fill(); c.restore(); }
  // "la que menos se parece": la distancia de la pregunta a cada nota; la tercera, la más larga
  for (let i = 0; i < 3; i++) {
    const kd = ease.outCubic(prog(t, A.parece - .25 + i * .18, A.parece + .35 + i * .18)) * (1 - smooth(prog(t, A.paraeso, A.paraeso + .3)));
    if (kd <= 0) continue;
    c.save(); c.strokeStyle = i === 2 ? ROJO : "rgba(237,234,227,.75)"; c.lineWidth = i === 2 ? 7 : 5; c.setLineDash([4, 16]); c.lineCap = "round"; c.lineDashOffset = -t * 40;
    linea(c, Q[0], Q[1], lerp(Q[0], NM[i][0], kd), lerp(Q[1], NM[i][1], kd)); c.restore();
  }
  tablero(c, t, d);
  mapa2(c, t);
  codigo(c, t);
  regado(c, t, d);
  caminos(c, t, d);
  // "ninguna, sola": cada nota contra la pregunta, y el hilo no aguanta
  for (let i = 0; i < 3; i++) {
    const k = ven(t, A.ninguna[i] - .08, A.ninguna[i] + .14, A.ninguna[i] + .4, A.ninguna[i] + .62); if (k <= 0) continue;
    const a: P = [QC[0] + (i - 1) * 200, QC[1] + QH / 2 - 6], b: P = [NB[i][0], NB[i][1] - NH / 2 + 10], u = ease.outCubic(prog(t, A.ninguna[i] - .08, A.ninguna[i] + .14));
    c.save(); c.globalAlpha = k; c.strokeStyle = ACENTO; c.lineWidth = 6; c.setLineDash([3, 14]); c.lineCap = "round"; linea(c, a[0], a[1], lerp(a[0], b[0], u), lerp(a[1], b[1], u) + 40 * (1 - k)); c.restore();
  }
  // "la respuesta está entre las tres": hilos que solo se ven en los huecos
  const kt = ven(t, A.entre - .15, A.entre + .45, A.mapa - .1, A.mapa + .2);
  if (kt > 0) {
    c.save(); c.globalAlpha = kt; c.strokeStyle = ACENTO; c.lineWidth = 7; c.setLineDash([4, 15]); c.lineCap = "round"; c.lineDashOffset = -t * 50;
    for (let i = 0; i < 3; i++) { const a = NB[i], b = NB[(i + 1) % 3], u = ease.outCubic(prog(t, A.entre - .15 + i * .12, A.entre + .3 + i * .12)); linea(c, a[0], a[1], lerp(a[0], b[0], u), lerp(a[1], b[1], u)); }
    c.restore();
  }
  for (let i = 0; i < 3; i++) {
    const n = notaEn(i, t); if (!n) continue;
    if (n.arruga > 0) {
      if (n.arruga < .55) nota(c, d, i, n.x, n.y, n.r + n.arruga * .6, n.s * lerp(1, .35, n.arruga / .55), { ...n, hueco: 1, sinTexto: n.arruga > .25 });
      continue;
    }
    nota(c, d, i, n.x, n.y, n.r, n.s, { ...n, hueco: n.hueco });
  }
  const kq = ease.outBack(prog(t, A.tres - .1, A.tres + .2), 2.2) * (1 - smooth(prog(t, A.mapa - .1, A.mapa + .15)));
  if (kq > 0) { c.save(); c.translate(445, 960); c.rotate(.08 * Math.sin(t * 4)); const e0 = clamp(kq, 0, 1.4) * (1 + .08 * Math.sin(t * 9)); c.scale(e0, e0); c.fillStyle = ACENTO; circulo(c, 0, 0, 46); texto(c, "?", 0, 4, { fuente: serif(84, true), color: "#fff", base: "middle" }); c.restore(); }
  papeles(c, t);
  recortes(c, t, d);
  pregunta(c, t);
  signo(c, t);
  pistaVuela(c, t, d);
  chispas(c, t);
  calendario(c, t);
  const me2 = mapaEstado(t), b = bolaEn(t).p;
  laBola(c, t, !!me2 && me2[1] > .9 && b[1] < MAPA.y + MAPA.h * me2[1] + 60 && b[0] > MAPA.x + MAPA.w * me2[0]);
  laLupa(c, t);
  manoAjena(c, t, d);
}
function dibuja(c: C, t: number, d: D) {
  FR = Math.floor(t * 10);
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  const [vx, vy, vz] = camara(t), [sx, sy] = sacude(t);
  const z = vz * (1 + .012 * Math.sin(t * .83));
  c.save();
  c.translate(540 + sx + 12 * Math.sin(t * .71), 900 + sy + 14 * Math.cos(t * .61));
  c.rotate(.006 * Math.sin(t * .47));
  c.scale(z, z); c.translate(-vx, -vy);
  mundo(c, t, d);
  c.restore();
  const oscuro = t < A.revela + .6;
  motas(c, t, oscuro ? LUZ : TINTA, 1);
  pantalla(c, t);
  const a = smooth(prog(t, DURACION - .7, DURACION - .05));
  if (a > 0) { c.fillStyle = `rgba(244,242,236,${a * .8})`; c.fillRect(0, 0, 1080, 1920); }
}

// ---------- preparar ----------
function preparar(): D {
  const veta = document.createElement("canvas"); veta.width = MESA.w; veta.height = MESA.h;
  const g = veta.getContext("2d")!, r = azar(505);
  g.fillStyle = KRAFT; g.fillRect(0, 0, MESA.w, MESA.h);
  for (let i = 0; i < 200; i++) {
    const y = r() * MESA.h, am = 2 + r() * 11, q = r() * 6.3;
    g.strokeStyle = `rgba(96,72,40,${.05 + r() * .13})`; g.lineWidth = 1 + r() * 2.4; g.beginPath();
    for (let x = -30; x <= MESA.w + 30; x += 30) { const yy = y + Math.sin(x / 170 + q) * am + Math.sin(x / 61 + q * 2) * am * .3; if (x < 0) g.moveTo(x, yy); else g.lineTo(x, yy); }
    g.stroke();
  }
  const corcho = document.createElement("canvas"); corcho.width = TAB.w; corcho.height = TAB.h;
  const k = corcho.getContext("2d")!, r2 = azar(606);
  k.fillStyle = CORCHO; k.fillRect(0, 0, TAB.w, TAB.h);
  for (let i = 0; i < 9000; i++) {
    const x = r2() * TAB.w, y = r2() * TAB.h, s = .8 + r2() * 3.2, v = r2();
    k.fillStyle = v < .5 ? `rgba(90,58,28,${.12 + r2() * .25})` : v < .85 ? `rgba(226,190,140,${.1 + r2() * .25})` : `rgba(60,36,16,${.2 + r2() * .3})`;
    k.beginPath(); k.ellipse(x, y, s, s * (.6 + r2() * .6), r2() * 3, 0, 7); k.fill();
  }
  const m = document.createElement("canvas").getContext("2d")!;
  m.font = serif(FN, true);
  const pal = NOTAS.map((N) => N.k.map(([li, w]) => {
    const L = N.l[li], tot = m.measureText(L).width, ix = L.indexOf(w), x0 = -tot / 2 + m.measureText(L.slice(0, ix)).width, ww = m.measureText(w).width;
    return { x: x0 + ww / 2, y: -LH + li * LH + 22, w: ww };
  }));
  return { veta, corcho, pal };
}

export const Pieza: React.FC = () => <Lienzo dibuja={dibuja} preparar={preparar} />;
void GRIS;
