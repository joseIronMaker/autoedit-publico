// Serie 2, capítulo 19: la carrera. Un estadio de papel visto desde la tribuna. Abre con dos bolas idénticas que se
// señalan («ChatGPT», «Claude» en el banderín de la espalda) y una tribuna que grita; caen cuatro más y el pleito se
// vuelve un corro en el que todas se señalan. Llueven once banderines de fecha y se clavan en el suelo: el corro huye.
// Cada carrera es una pista que se desenrolla como un rollo de papel y el tiempo es distancia (un mes = 105 px).
// Cada corredor cae junto a su banderín cuando la voz lo nombra y el testigo rojo pasa de mano en mano: un relevo,
// no un podio; quien entrega regresa a su fecha. «¿Le copió?»: la música se calla, Cowork y ChatGPT Work se señalan
// con brazos de hule y la cámara rebobina la pista 4 hasta Manus, encerrando cada fecha en un círculo rojo.
// «También va al revés»: dos testigos cruzan de la pista 3 a la 2 y sus estelas forman una equis. Vista de todo el
// estadio: los relevos y los cruces quedan como una red roja. La cámara se aleja hasta que el estadio es el contenido
// de una ventana de chat; las bolas saltan fuera, se meten en una computadora de papel y una mano de hule sale de la
// pantalla y cierra la ventana. Todos los instantes vienen de eventos.json (partitura.py): dibujo y sonido son los
// mismos números.
import React from "react";
import { azar, caida, clamp, ease, lerp, prog, smooth, texto } from "../../kit";
import { ACENTO, bola, GRIS, Lienzo, mono, PAPEL, serif, sombra, TINTA } from "../../marca";
import { brazo } from "../../personaje";
import duracion from "./duracion.json";
import eventos from "./eventos.json";

export const DURACION = duracion.dur;
type C = CanvasRenderingContext2D;
type Corr = { n: string; sub: string; p: number; mes: number; f: string; cae: number; go: number; fin: number; dice: number; ultimo: boolean; vuelve: number | null; para?: number; medio?: [number, number] };
type Ev = typeof eventos & { corredores: Corr[] };
const ev = eventos as unknown as Ev;

// ---------- herramientas ----------
let FR = 0;
const frac = (x: number) => x - Math.floor(x);
const tiembla = (j: number) => frac(Math.sin(j * 12.9898 + FR * 78.233) * 43758.5453) - .5;
const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * 6.2832 + f);
const ventana = (t: number, a: number, b: number, fi = .25, fo = .3) => smooth(prog(t, a, a + fi)) * (1 - smooth(prog(t, b, b + fo)));
const BLANCO = "#FDFCF8", CANCHA = "#EAE5D8", GRADA = "#E2DCCD";
function ajusta(c: C, s: string, px: number, max: number, it = false) { c.font = serif(px, it); const w = c.measureText(s).width; return w > max ? px * max / w : px; }
function letrero(c: C, t: number, ini: number, fin: number, s: string, y: number, px: number, color = TINTA, it = false, max = 860) {
  const a = smooth(prog(t, ini - .04, ini + .16)) * (1 - smooth(prog(t, fin, fin + .25)));
  if (a <= 0) return;
  const p = ajusta(c, s, px, max, it);
  texto(c, s, 540, y + (1 - ease.outCubic(prog(t, ini - .04, ini + .32))) * 20, { fuente: serif(p, it), color, alfa: a });
}
/** Banda de papel detrás de un letrero en pantalla: lo que pasa abajo se aclara, no se tapa de golpe. */
function banda(c: C, y0: number, y1: number, a: number) {
  if (a <= 0) return;
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, "rgba(244,242,236,0)"); g.addColorStop(.25, `rgba(244,242,236,${.88 * a})`);
  g.addColorStop(.75, `rgba(244,242,236,${.88 * a})`); g.addColorStop(1, "rgba(244,242,236,0)");
  c.fillStyle = g; c.fillRect(0, y0, 1080, y1 - y0);
}
function linea(c: C, ax: number, ay: number, bx: number, by: number, g: number, color = TINTA, vib = 1.4, paso = 140) {
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / paso));
  c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath();
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = lerp(ax, bx, u), y = lerp(ay, by, u), j = x * .013 + y * .029;
    const v = i === 0 || i === n ? 0 : vib;
    if (i === 0) c.moveTo(x + tiembla(j) * v, y + tiembla(j + 9) * v); else c.lineTo(x + tiembla(j) * v, y + tiembla(j + 9) * v);
  }
  c.stroke();
}

// ---------- el mundo ----------
const MX = ev.geo.mx, X0 = ev.geo.x0, LY = ev.geo.ly;
const X = (m: number) => X0 + MX * m;
const ESC = [1, 1, 1, 1.1];
const RB = 60;
const XL0 = -260, XL1 = 4330;                       // extremos de las pistas
const WIN = { x0: -380, x1: 4440, y0: -1060, bar: -880, y1: 2300 };   // la ventana de chat que contiene todo
const FY = [-330, -410, -490, -570], RF = 25;       // filas de la tribuna (de la de enfrente a la del fondo)
const CO = ev.corredores;
const N = CO.length;
const HLB = (p: number, t: number) => (p < 3 ? 92 : lerp(92, 124, ease.outBack(prog(t, ev.grande - .05, ev.grande + .4), 2.2)));
const XS = (i: number) => X(CO[i].mes) + 70 * ESC[CO[i].p];
const SIG = CO.map((c, i) => (c.ultimo ? -1 : i + 1));
const PREV = CO.map((_, i) => SIG.indexOf(i));
const XE = CO.map((c, i) => (c.ultimo ? X(c.para!) + 70 : XS(SIG[i]) - 230 * ESC[c.p]));
const PASO = .25, VUELTA = 330;
// orden en que caen los banderines: primero los que están en cuadro
const ORDEN_CLAVA = [5, 3, 6, 7, 4, 1, 0, 8, 2, 9, 10];

// ---------- cómo corre cada uno ----------
function perfil(u: number, k = .12) { const a = clamp(u); const n = 1 + k * (Math.exp(-1 / k) - 1); return (a + k * (Math.exp(-a / k) - 1)) / n; }
function xCorrida(i: number, t: number) {
  const c = CO[i], xs = XS(i), xe = XE[i];
  if (c.ultimo) return lerp(xs, xe, ease.outCubic(prog(t, c.go, c.fin)));
  if (c.medio) {
    const [tm, mm] = c.medio, xm = X(mm) + 70 * ESC[c.p];
    if (t < tm) return lerp(xs, xm, perfil(prog(t, c.go, tm), .3));
    return lerp(xm, xe, perfil(prog(t, tm, c.fin), .2));
  }
  return lerp(xs, xe, perfil(prog(t, c.go, c.fin)));
}
const VFIN = CO.map((c, i) => (c.ultimo ? 0 : (xCorrida(i, c.fin) - xCorrida(i, c.fin - .02)) / .02));
const TAU = .28;
function xDe(i: number, t: number) {
  const c = CO[i];
  if (t < c.go) return XS(i);
  if (t <= c.fin || c.ultimo) return xCorrida(i, Math.min(t, c.fin));
  const frena = (tt: number) => XE[i] + VFIN[i] * TAU * (1 - Math.exp(-(tt - c.fin) / TAU));
  if (t < c.vuelve!) return frena(t);
  const x1 = frena(c.vuelve!);
  return Math.max(XS(i), x1 - VUELTA * (t - c.vuelve!));
}
function velDe(i: number, t: number) { return (xDe(i, t + .02) - xDe(i, t - .02)) / .04; }

// ---------- quién lleva el testigo de cada pista ----------
function portador(p: number, t: number) {
  let q = CO.findIndex((c) => c.p === p && PREV[CO.indexOf(c)] === -1);
  while (SIG[q] >= 0 && t >= CO[q].fin) q = SIG[q];
  return q;
}

// ---------- cámara ----------
type Cam = { x: number; y: number; z: number };
type Clave = [number, number, Cam | ((t: number) => Cam), ((x: number) => number)?];
const lane = (p: number, x: number, z = 1.55): Cam => ({ x, y: LY[p] + (p < 3 ? 220 : 90), z });
const CLAVES: Clave[] = [
  [0, 3.2, { x: 1170, y: 215, z: 1.34 }, (x) => x],
  [3.25, 4.25, { x: 1170, y: 300, z: 1.0 }],
  [6.5, 7.3, { x: 1340, y: 560, z: .74 }, ease.outCubic],
  [9.25, 10.75, lane(0, 820)],
  [14.7, 16.0, lane(0, 1060)],
  [16.0, 16.7, lane(0, 2095), ease.outExpo],
  [18.3, 20.2, lane(0, 2620)],
  [20.95, 22.8, lane(0, 2800)],
  [22.95, 24.0, lane(1, 1840, 1.3)],
  [31.95, 33.0, lane(2, 1518)],
  [38.4, 40.4, lane(2, 1870)],
  [40.85, 41.9, lane(3, 2020, 1.2)],
  [43.6, 44.5, lane(3, 2157, 1.2)],
  [48.2, 50.4, lane(3, 2948, 1.2)],
  [51.6, 55.2, lane(3, 3120, 1.2)],
  [55.2, 56.3, lane(3, 3578, 1.2)],
  [57.0, 58.7, lane(3, 3720, 1.2)],
  [58.8, 60.1, { x: 3330, y: LY[3] - 230, z: .93 }],
  [64.4, 65.3, { x: 2640, y: LY[3] - 230, z: .93 }],
  [66.1, 66.9, { x: 2180, y: LY[3] - 230, z: .93 }],
  [ev.abre, ev.abre + 1.0, { x: 2700, y: LY[3] - 60, z: .5 }],
  [ev.reves - .1, ev.reves + 1.1, { x: 1700, y: 860, z: 1.02 }],
  [ev.skills[1], ev.skills[2] + .2, { x: 1880, y: 860, z: 1.02 }],
  [ev.agentsmd[0] - .3, ev.agentsmd[0] + .6, { x: 1790, y: 860, z: 1.0 }],
  [ev.nadie, ev.nadie + .95, { x: 2200, y: 900, z: .28 }, ease.outExpo],
  [ev.discuten, ev.discuten + .8, { x: 1760, y: -470, z: 1.25 }],
  [ev.paso, ev.paso + .75, { x: 2200, y: 900, z: .28 }, ease.outCubic],
  [ev.ventana, ev.ventana + 1.3, { x: 2150, y: 3200, z: .19 }],
  [ev.regresa + .1, ev.fin, { x: 2150, y: 3900, z: .245 }, (x) => ease.inOutSine(x)],
];
function camara(t: number): Cam {
  let v: Cam = { x: 1170, y: 210, z: 1.3 };
  for (const [a, b, q, f] of CLAVES) {
    if (t <= a) break;
    const Q = typeof q === "function" ? q(t) : q, k = (f ?? ease.inOutCubic)(prog(t, a, b));
    v = { x: lerp(v.x, Q.x, k), y: lerp(v.y, Q.y, k), z: v.z * (Q.z / v.z) ** k };
  }
  return v;
}

// ---------- fondo: cancha, años, tribuna ----------
function cancha(c: C, t: number) {
  c.fillStyle = CANCHA; c.fillRect(WIN.x0, WIN.bar, WIN.x1 - WIN.x0, WIN.y1 - WIN.bar);
  // tierra: manchas de grano para que el piso no sea un plano muerto
  const r = azar(41);
  c.fillStyle = "rgba(120,110,90,.07)";
  for (let i = 0; i < 320; i++) { const x = WIN.x0 + r() * (WIN.x1 - WIN.x0), y = -280 + r() * 2300, w = 30 + r() * 120; c.fillRect(x, y, w, 3); }
  // líneas de año, pintadas cuando aparece la primera pista
  const a = smooth(prog(t, ev.rollo[0] + .2, ev.rollo[0] + 1.2));
  if (a > 0) {
    c.save(); c.globalAlpha = a;
    for (const [m, s] of [[0, "2024"], [12, "2025"], [24, "2026"]] as [number, string][]) {
      c.setLineDash([18, 22]); linea(c, X(m), -270, X(m), 1950, 4, "rgba(17,17,17,.28)", 1.2); c.setLineDash([]);
      texto(c, s, X(m) + 26, -168, { fuente: serif(132), color: "rgba(17,17,17,.42)", alin: "left" });
    }
    c.restore();
  }
}
function excita(t: number) {
  return Math.max(1 - smooth(prog(t, 2.8, 3.6)), .55 * ventana(t, ev.copian - .1, ev.copian + 1.0, .2, .5), .5 * ventana(t, ev.fans - .2, ev.fans + .5, .15, .5),
    .35 * ventana(t, ev.calla + .3, ev.calla + 1.8, .3, .6), ventana(t, ev.discuten + .2, ev.paso, .3, .4), .45 * ventana(t, ev.todos, ev.todos + .9, .15, .5));
}
function tribuna(c: C, t: number) {
  c.fillStyle = GRADA; c.fillRect(WIN.x0, -660, WIN.x1 - WIN.x0, 370);
  for (let k = 0; k < 4; k++) linea(c, WIN.x0, FY[k] + 32, WIN.x1, FY[k] + 32, 2.5, "rgba(17,17,17,.22)", 1, 260);
  const ex = excita(t);
  for (let k = 3; k >= 0; k--) {
    const r = azar(100 + k);
    for (let x = WIN.x0 + 50 + (k % 2) * 37; x < WIN.x1 - 30; x += 74) {
      const f = r() * 6.28, w = 7 + r() * 4, lleva = r() < .28, grita = r() < .38, tono = r();
      const z = (3 + 26 * ex * (.6 + .4 * r())) * Math.abs(Math.sin(t * w + f)) + 2 * vaiven(t, 1.7 + tono, f);
      const y = FY[k] + 26 - z;
      if (lleva) {
        // banderín de fan: el pleito de la tribuna
        const g = .25 * Math.sin(t * (3 + 6 * ex) + f) * (.4 + ex);
        c.save(); c.translate(x + 14, y - 10); c.rotate(g);
        c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -78); c.stroke();
        const lado = x < 1170 ? "ChatGPT" : "Claude";
        c.fillStyle = BLANCO; c.beginPath(); c.moveTo(0, -78); c.lineTo(96, -62); c.lineTo(0, -44); c.closePath(); c.fill(); c.stroke();
        texto(c, lado, 6, -56, { fuente: serif(17), color: TINTA, alin: "left" });
        c.restore();
      }
      sombra(c, x, FY[k] + 30, 30, .14);
      c.globalAlpha = .62 - .05 * k; bola(c, x, y, RF * (k === 0 ? 1 : .96)); c.globalAlpha = 1;
      if (grita && ex > .2) {
        c.save(); c.globalAlpha = ex * (.5 + .5 * Math.abs(Math.sin(t * 5 + f))); c.strokeStyle = TINTA; c.lineWidth = 3; c.lineCap = "round";
        for (const d of [-1, 0, 1]) { const a2 = -Math.PI / 2 + d * .5; c.beginPath(); c.moveTo(x + Math.cos(a2) * 38, y + Math.sin(a2) * 38); c.lineTo(x + Math.cos(a2) * 58, y + Math.sin(a2) * 58); c.stroke(); }
        c.restore();
      }
    }
  }
  // barandal
  linea(c, WIN.x0, -290, WIN.x1, -290, 6, TINTA, 1.5, 200);
  for (let x = WIN.x0 + 40; x < WIN.x1; x += 240) linea(c, x, -290, x, -250, 4, TINTA, 0);
}

// ---------- pistas ----------
function frente(p: number, t: number) {
  const a = ev.rollo[p], d = p < 3 ? 1.3 : 1.6;
  return lerp(XL0, XL1, ease.inOutCubic(prog(t, a, a + d)));
}
function pista(c: C, p: number, t: number) {
  const xf = frente(p, t); if (xf <= XL0 + 1) return;
  const y = LY[p], h = HLB(p, t);
  c.fillStyle = BLANCO; c.fillRect(XL0, y - h, xf - XL0, 2 * h);
  linea(c, XL0, y - h, xf, y - h, 4); linea(c, XL0, y + h, xf, y + h, 4);
  // marcas de mes en la orilla cercana: el tiempo se lee como distancia
  c.strokeStyle = "rgba(17,17,17,.35)"; c.lineWidth = 3;
  for (let m = 0; m <= 36; m++) { const x = X(m); if (x > xf) break; const L = m % 12 === 0 ? 34 : m % 3 === 0 ? 22 : 12; c.beginPath(); c.moveTo(x, y + h); c.lineTo(x, y + h - L); c.stroke(); }
  // número de la pista pintado en la salida
  texto(c, String(p + 1), 70, y + h * .42, { fuente: serif(h * 1.7, true), color: "rgba(17,17,17,.2)", alfa: smooth(prog(xf, 60, 240)) });
  // el rollo que todavía no se desenrolla
  if (xf < XL1 - 2) {
    const u = prog(xf, XL0, XL1), rr = 46 * (1 - .55 * u) * (p < 3 ? 1 : 1.25);
    const g = c.createLinearGradient(xf - rr, 0, xf + rr, 0);
    g.addColorStop(0, "#E8E3D6"); g.addColorStop(.45, BLANCO); g.addColorStop(1, "#CFC8B6");
    c.fillStyle = g; c.strokeStyle = TINTA; c.lineWidth = 4;
    c.beginPath(); c.roundRect(xf - rr, y - h - 14, 2 * rr, 2 * h + 28, rr); c.fill(); c.stroke();
    c.beginPath(); c.ellipse(xf, y - h - 14 + rr * .5, rr * .55, rr * .28, 0, 0, 7); c.stroke();
  }
}

// ---------- banderín de fecha ----------
function banderin(c: C, i: number, t: number) {
  const co = CO[i], k = ORDEN_CLAVA.indexOf(i), tc = ev.clavan[k];
  if (t < tc - .45) return;
  const e = ESC[co.p], x = X(co.mes) - 10 * e, yb = LY[co.p] - HLB(co.p, t) + 6;
  const cae = 1 - ease.inCubic(prog(t, tc - .45, tc));
  const d = t - tc, tumbo = d > 0 ? .28 * Math.exp(-d * 4.5) * Math.sin(d * 21) : -.12 * cae;
  const H = 300 * e;
  c.save(); c.globalAlpha = 1 - .62 * ventana(t, ev.reves + .2, ev.nadie, .5, .5); c.translate(x, yb - cae * 1500); c.rotate(tumbo + .01 * vaiven(t, 2.3, i));
  linea(c, 0, 0, 0, -H, 6 * e, TINTA, .8, 80);
  // la tela ondea; cuando la voz dice la fecha, late en rojo
  const late = ventana(t, co.dice - .05, co.dice + .7, .08, .5), pop = 1 + .22 * Math.exp(-Math.max(t - co.dice, 0) * 6) * (t > co.dice - .05 ? 1 : 0);
  const W = 150 * e, Hh = 112 * e, o = (u: number, v: number) => Math.sin(t * 3.1 + u * .02 + i) * 6 * u / W + v * 0;
  c.translate(0, -H); c.scale(pop, pop);
  c.fillStyle = late > .5 ? ACENTO : BLANCO; c.strokeStyle = TINTA; c.lineWidth = 4;
  c.beginPath(); c.moveTo(0, 0); c.lineTo(W, o(W, 0)); c.lineTo(W - 26 * e, Hh / 2 + o(W - 26 * e, 0)); c.lineTo(W, Hh + o(W, 0)); c.lineTo(0, Hh); c.closePath(); c.fill(); c.stroke();
  const [mes, an] = co.f.split(" ");
  const col = late > .5 ? BLANCO : TINTA;
  texto(c, mes, 14 * e, 50 * e + o(60, 0), { fuente: serif(56 * e, true), color: col, alin: "left" });
  texto(c, an, 14 * e, 96 * e + o(60, 0), { fuente: mono(36 * e), color: col, alin: "left" });
  c.restore();
}

// ---------- corredores ----------
type Pose = { x: number; y: number; z: number; R: number; m1: [number, number]; m2: [number, number]; a1: number; a2: number; sq: number; viento: number; vis: number; banner: number };
function rebotes(t: number, t0: number, h: number) {
  const z = caida(t - (t0 - Math.sqrt(2 * h / 30)), h, .32, 30).z * 300;
  return z;
}
function aplasta(t: number, t0: number, f = .22) { const d = t - t0; return d > 0 && d < 1 ? f * Math.exp(-d * 8) * Math.cos(d * 24) : 0; }
const RINGC = { x: 1170, y: 470 }, RX = 390, RY = 175;

function poseCorredor(i: number, t: number): Pose | null {
  const c = CO[i];
  if (t < c.cae - .3) return null;
  if (t > ev.saltan[i] + .02) return null;
  const e = ESC[c.p], R = RB * e, y = LY[c.p];
  let x = xDe(i, t);
  const vx = velDe(i, t);
  let z = t < c.cae + 1.2 ? rebotes(t, c.cae, 1.2) : 0;
  let sq = aplasta(t, c.cae, .25);
  const corriendo = Math.abs(vx) > 40;
  if (corriendo) { const ph = (t - c.go - .12) / PASO; z += (vx > 0 ? 15 : 8) * Math.abs(Math.sin(Math.PI * ph)) * clamp(Math.abs(vx) / 200); sq += .05 * Math.cos(2 * Math.PI * ph) * clamp(Math.abs(vx) / 250); }
  // de pie: respira
  z += 3 * Math.abs(vaiven(t, .9 + .07 * i, i));
  const yb = y - R - z;
  let m1: [number, number] = [x - 76 * e, yb + 22 * e + 7 * vaiven(t, 1.3, i)], m2: [number, number] = [x + 78 * e, yb + 18 * e + 7 * vaiven(t, 1.1, i + 1)];
  let a1 = .55, a2 = .55;
  // listo para salir: se agacha con las manos en el piso
  if (t > c.cae + .5 && t < c.go) {
    const k = PREV[i] === -1 ? smooth(prog(t, c.go - .9, c.go - .55)) : smooth(prog(t, c.go - .7, c.go - .4)) * .6;
    sq += -.08 * k; z *= 1 - .7 * k;
    m1 = [lerp(m1[0], x - 40 * e, k), lerp(m1[1], y - 8, k)]; m2 = [lerp(m2[0], x + 52 * e, k), lerp(m2[1], y - 8, k)];
  }
  if (corriendo || (t >= c.go && t < c.fin + .4)) {
    const ph = Math.PI * (t - c.go - .12) / PASO, k = clamp(Math.abs(vx) / 160);
    const dir = vx >= 0 ? 1 : -1;
    m1 = [lerp(m1[0], x - 64 * e * dir - 30 * Math.cos(ph) * dir, k), lerp(m1[1], yb + 12 + 26 * Math.sin(ph), k)];
    m2 = [lerp(m2[0], x + 72 * e * dir + 30 * Math.cos(ph) * dir, k), lerp(m2[1], yb + 4 - 26 * Math.sin(ph), k)];
  }
  // la entrega: el que llega estira la mano hacia adelante, el que recibe hacia atrás
  if (!c.ultimo) {
    const k = ventana(t, c.fin - .38, c.fin + .02, .3, .25);
    if (k > 0) { m2 = [lerp(m2[0], x + 118 * e, k), lerp(m2[1], yb + 6, k)]; a2 = lerp(a2, .15, k); }
  }
  if (PREV[i] >= 0) {
    const k = ventana(t, c.go - .45, c.go + .02, .35, .3);
    if (k > 0) { m2 = [lerp(m2[0], x - 115 * e, k), lerp(m2[1], yb + 6, k)]; a2 = lerp(a2, .9, k); }
  }
  // Manus sorprende: sale disparado como resorte
  if (i === 7) { const d = t - c.cae - .22; if (d > 0 && d < 1.2) { z += 120 * Math.exp(-d * 4) * Math.abs(Math.sin(d * 9)); m1 = [x - 100, yb - 90]; m2 = [x + 100, yb - 90]; a1 = a2 = .95; } }
  // «¿le copió?»: Cowork y ChatGPT Work se señalan con brazos de hule
  if (i === 9 || i === 10) {
    const k = ventana(t, ev.sennalan - .1, ev.circulos[0] + .2, .3, .5);
    if (k > 0) {
      const o = i === 9 ? 10 : 9, xo = xDe(o, t), d = xo - x, L = Math.sign(d) * (Math.min(Math.abs(d) * .3, 300) + 26 * Math.max(0, Math.sin(t * 8 + i)));
      if (d > 0) { m2 = [lerp(m2[0], x + L, k), lerp(m2[1], yb - 95, k)]; a2 = lerp(a2, .02, k); }
      else { m1 = [lerp(m1[0], x + L, k), lerp(m1[1], yb - 95, k)]; a1 = lerp(a1, .02, k); }
    }
  }
  // brinco cuando su fecha se encierra en un círculo
  const ci = [9, 8, 7].indexOf(i);
  if (ci >= 0) { const d = t - ev.circulos[ci] - .35; if (d > 0 && d < .45) z += 50 * Math.sin(Math.PI * d / .45); }
  // los testigos que cruzan de pista
  const tiro = (q: number, din: number[], mano: 1 | 2) => {
    if (i !== q) return;
    const [saca, lanza] = din;
    const k = ventana(t, saca - .15, lanza + .05, .2, .35), sw = smooth(prog(t, lanza - .25, lanza));
    if (k > 0) { const p: [number, number] = [x + (mano === 1 ? -40 : 40) - 60 * sw, yb - 120 + 20 * sw - 40 * (1 - sw) * Math.sin(t * 10)]; if (mano === 1) { m1 = [lerp(m1[0], p[0], k), lerp(m1[1], p[1], k)]; a1 = .2; } else { m2 = [lerp(m2[0], p[0], k), lerp(m2[1], p[1], k)]; a2 = .2; } }
  };
  const atrapa = (q: number, din: number[]) => {
    if (i !== q) return;
    const k = ventana(t, din[2] - .5, din[2] + .5, .25, .5);
    if (k > 0) { m1 = [lerp(m1[0], x - 50, k), lerp(m1[1], yb - 150, k)]; a1 = lerp(.95, .2, smooth(prog(t, din[2] - .05, din[2] + .1))); }
  };
  tiro(5, ev.skills, 2); atrapa(4, ev.skills); tiro(6, ev.agentsmd, 1); atrapa(3, ev.agentsmd);
  if (i === 4 && t > ev.skills[2] + .4) m1 = [x - 62, yb - 40 + 5 * vaiven(t, 1.2)];
  if (i === 3 && t > ev.agentsmd[2] + .4) m1 = [x - 62, yb - 40 + 5 * vaiven(t, 1.2)];
  // «todos copiaron algo»: todas levantan las manos, en ola
  const ola = ventana(t, ev.todos + .05 * (x / 400), ev.todos + 1.1 + .05 * (x / 400), .2, .4);
  if (ola > 0) { m1 = [lerp(m1[0], x - 70, ola), lerp(m1[1], yb - 140, ola)]; m2 = [lerp(m2[0], x + 70, ola), lerp(m2[1], yb - 140, ola)]; a1 = a2 = lerp(a1, .95, ola); z += 26 * ola * Math.abs(Math.sin((t - ev.todos) * 9)); }
  // «ya pasó lo importante»: un brinco general
  { const d = t - ev.importante - .03 * (x / 400); if (d > 0 && d < .4) z += 60 * Math.sin(Math.PI * d / .4); }
  // el banderín de la espalda vuela hacia atrás al correr
  let viento = vx > 10 ? lerp(1, -1, smooth((vx - 10) / 45)) : 1;
  // quien entregó regresa con la bandera por delante: así nunca tapa al que sigue corriendo
  if (!c.ultimo && t >= c.fin) { const llega = c.vuelve! + (xDe(i, c.vuelve!) - XS(i)) / VUELTA; viento = lerp(-1, 1, smooth(prog(t, llega, llega + .35))); }
  // si el siguiente de la pista ya espera muy cerca, la bandera se acomoda hacia atrás para no taparlo
  const sg = SIG[i];
  if (vx <= 20 && sg >= 0 && t > CO[sg].cae - .3 && t < CO[sg].go && XS(sg) - x < 360 && XS(sg) - x > 0) viento = lerp(1, -1, smooth(prog(t, CO[sg].cae - .3, CO[sg].cae + .1)));
  return { x, y, z, R, m1, m2, a1, a2, sq, viento, vis: 1, banner: 1 };
}

function bandera(c: C, x: number, ybola: number, R: number, nombre: string, sub: string, viento: number, t: number, sem: number, tam = 46) {
  const px = x - .3 * R, py = ybola - .2 * R;
  const lean = (1 - viento) * .5 * R;
  const tx = px - lean * .6, ty = ybola - 2.9 * R;
  c.strokeStyle = TINTA; c.lineWidth = 4; c.lineCap = "round"; c.beginPath(); c.moveTo(px, py); c.lineTo(tx, ty); c.stroke();
  c.font = serif(tam); const w1 = c.measureText(nombre).width; c.font = serif(30, true); const w2 = sub ? c.measureText(sub).width : 0;
  const W = Math.max(w1, w2) + 34 * tam / 46, H = sub ? 96 : 64 * tam / 46;
  const ondea = (u: number) => Math.sin(t * 6 + u * .03 + sem) * 5 * u / W * (1.4 - viento * .4);
  c.save(); c.translate(tx, ty);
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 3.5;
  c.beginPath(); c.moveTo(0, 0); c.lineTo(W * viento, ondea(W)); c.lineTo(W * viento, H + ondea(W)); c.lineTo(0, H); c.closePath(); c.fill(); c.stroke();
  const a = Math.abs(viento);
  if (a > .08) {
    c.save(); c.translate(W * viento / 2, 0); c.scale(a, 1);
    texto(c, nombre, 0, 47 * tam / 46 + ondea(W / 2), { fuente: serif(tam), color: TINTA });
    if (sub) texto(c, sub, 0, 82 + ondea(W / 2), { fuente: serif(30, true), color: GRIS });
    c.restore();
  }
  c.restore();
}

function testigo(c: C, x: number, y: number, ang: number, s = 1) {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s);
  c.fillStyle = ACENTO; c.strokeStyle = "#7E2413"; c.lineWidth = 3;
  c.beginPath(); c.roundRect(-38, -11, 76, 22, 10); c.fill(); c.stroke();
  c.fillStyle = "rgba(255,255,255,.35)"; c.fillRect(-30, -7, 56, 4);
  c.restore();
}

function dibujaCorredor(c: C, i: number, P: Pose, t: number, conTestigo: boolean) {
  const co = CO[i], { x, y, z, R } = P;
  const yb = y - R - z;
  sombra(c, x, y + 2, R * 2.1, .32 / (1 + z / 120));
  bandera(c, x, yb, R, co.n, co.sub, P.viento, t, i * 1.7);
  brazo(c, x - 54 * R / 90, yb - 50 * R / 90, P.m1[0], P.m1[1], 90 * R / 90, P.a1, TINTA, 1, R / 90);
  brazo(c, x + 60 * R / 90, yb - 30 * R / 90, P.m2[0], P.m2[1], -100 * R / 90, P.a2, TINTA, 1, R / 90);
  c.save(); c.translate(x, y - z); c.scale(1 + P.sq * .6, 1 - P.sq); c.translate(-x, -(y - z)); bola(c, x, yb, R); c.restore();
  if (conTestigo) testigo(c, P.m2[0], P.m2[1] - 4, -.35 + .2 * Math.sin(t * 8 + i), 1);
}

// ---------- el pleito del arranque ----------
type Bolita = { x: number; y: number; z: number; sq: number; m1: [number, number]; m2: [number, number]; a1: number; a2: number; nombre: string };
const ANG = [Math.PI, 0, Math.PI / 3, 2 * Math.PI / 3, 4 * Math.PI / 3, 5 * Math.PI / 3];    // A, B y los cuatro que caen
const LLEGA = [[960, 470], [1380, 470], [1500, 640], [850, 650], [860, 320], [1480, 310]];
function pleito(t: number): Bolita[] {
  if (t > ev.huyen + 1.8) return [];
  const out: Bolita[] = [];
  const giro = t > ev.copian ? .85 * (t - ev.copian) * (1 - .6 * smooth(prog(t, ev.huyen - .2, ev.huyen + .3))) : 0;
  for (let k = 0; k < 6; k++) {
    const tc = k === 0 ? ev.caeA : k === 1 ? ev.caeB : ev.otros[k - 2];
    const h = k < 2 ? .6 : .9;
    if (t < tc - Math.sqrt(2 * h / 30) - .02) continue;
    let x = LLEGA[k][0], y = LLEGA[k][1];
    const kr = smooth(prog(t, ev.corro - .05, ev.corro + .45));
    const a = ANG[k] + giro;
    x = lerp(x, RINGC.x + RX * Math.cos(a), kr); y = lerp(y, RINGC.y + RY * Math.sin(a), kr);
    let z = t < tc + 1.2 ? caida(t - (tc - Math.sqrt(2 * h / 30)), h, .35, 30).z * 300 : 0;
    // huyen: cada una brinca hacia afuera del corro y se va corriendo
    const hu = t - ev.huyen - k * .07;
    if (hu > 0) {
      const dx = Math.cos(a) || .3, dy = Math.sin(a) * .5;
      const dist = 900 * hu * hu + 260 * hu;
      x += dx * dist; y += dy * dist * .6;
      z += Math.abs(Math.sin(hu * 9)) * 40 + (hu < .35 ? 90 * Math.sin(Math.PI * hu / .35) : 0);
    }
    z += 3 * Math.abs(vaiven(t, .8 + k * .1, k));
    const yb = y - RB - z;
    let m1: [number, number] = [x - 76, yb + 22 + 6 * vaiven(t, 1.2, k)], m2: [number, number] = [x + 78, yb + 18 + 6 * vaiven(t, 1.4, k)];
    let a1 = .55, a2 = .55;
    // A y B se señalan; cada golpe de voz es un piquete
    if (k < 2 && t < ev.corro + .3) {
      const ap = ease.outBack(prog(t, k === 0 ? ev.apuntaA : ev.apuntaB, (k === 0 ? ev.apuntaA : ev.apuntaB) + .22), 1.6);
      let pic = 0; ev.jabs.forEach((j, q) => { const d = t - j; if (q % 2 === k && d > 0 && d < .4) pic += Math.sin(Math.PI * d / .4); });
      const dir = k === 0 ? 1 : -1;
      const L = 100 + 26 * pic;
      const tgt: [number, number] = [x + dir * (L + 12), yb - 44 - 8 * pic];
      if (k === 0) { m2 = [lerp(m2[0], tgt[0], ap), lerp(m2[1], tgt[1], ap)]; a2 = lerp(a2, .02, ap); m1 = [lerp(m1[0], x - 64, ap), lerp(m1[1], yb + 50, ap)]; }
      else { m1 = [lerp(m1[0], tgt[0], ap), lerp(m1[1], tgt[1], ap)]; a1 = lerp(a1, .02, ap); m2 = [lerp(m2[0], x + 64, ap), lerp(m2[1], yb + 50, ap)]; }
    }
    // en el corro, cada una señala a la siguiente
    if (t > ev.corro) {
      const k2 = ventana(t, ev.corro + .1, ev.huyen, .3, .2);
      const a2n = a + Math.PI / 3, nx = RINGC.x + RX * Math.cos(a2n) - x, ny = RINGC.y + RY * Math.sin(a2n) - y, d = Math.hypot(nx, ny) || 1;
      const pk = Math.max(0, Math.sin(t * 7 + k * 1.3)) * 22;
      const tgt: [number, number] = [x + nx / d * (104 + pk), yb - 26 + ny / d * 40];
      if (nx > 0) { m2 = [lerp(m2[0], tgt[0], k2), lerp(m2[1], tgt[1], k2)]; a2 = lerp(a2, .02, k2); }
      else { m1 = [lerp(m1[0], tgt[0], k2), lerp(m1[1], tgt[1], k2)]; a1 = lerp(a1, .02, k2); }
    }
    const sq = aplasta(t, tc, .26);
    out.push({ x, y, z, sq, m1, m2, a1, a2, nombre: k === 0 ? "ChatGPT" : k === 1 ? "Claude" : "" });
  }
  return out.sort((a, b) => a.y - b.y);
}
function dibujaBolita(c: C, b: Bolita, t: number, k: number) {
  const yb = b.y - RB - b.z;
  sombra(c, b.x, b.y + 2, RB * 2.1, .32 / (1 + b.z / 120));
  if (b.nombre) bandera(c, b.x, yb, RB, b.nombre, "", b.nombre === "ChatGPT" ? -1 : 1, t, k, 38);
  brazo(c, b.x - 36, yb - 33, b.m1[0], b.m1[1], b.a1 < .2 ? 12 : 60, b.a1, TINTA, 1, RB / 90);
  brazo(c, b.x + 40, yb - 20, b.m2[0], b.m2[1], b.a2 < .2 ? -12 : -67, b.a2, TINTA, 1, RB / 90);
  c.save(); c.translate(b.x, b.y - b.z); c.scale(1 + b.sq * .6, 1 - b.sq); c.translate(-b.x, -(b.y - b.z)); bola(c, b.x, yb, RB); c.restore();
}

// ---------- la gente que trota con Cowork ----------
function gente(c: C, t: number) {
  if (t < ev.pastor - .2 || t > ev.calla + 1) return;
  const x9 = xDe(9, t);
  for (let k = 0; k < 3; k++) {
    const ent = ease.outCubic(prog(t, ev.pastor + k * .14, ev.pastor + .9 + k * .14));
    const sale = smooth(prog(t, CO[9].medio![0] - .2, CO[9].medio![0] + .5));
    const x = x9 - 170 - k * 95 - 40 * sale * k, y = LY[3] + 90 + lerp(520, 0, ent) - k * 8;
    const z = 22 * Math.abs(Math.sin((t + k * .2) * 9));
    c.save(); c.globalAlpha = clamp(ent * 1.5) * (1 - smooth(prog(t, ev.calla, ev.calla + .8)));
    sombra(c, x, y, 50, .25); c.globalAlpha *= .62; bola(c, x, y - 30 - z, 30); c.restore();
  }
}

// ---------- estelas y arcos rojos ----------
function arcoPunteado(c: C, ax: number, ay: number, bx: number, by: number, H: number, u: number, g = 6, alfa = 1) {
  if (u <= 0) return;
  c.save(); c.globalAlpha = alfa; c.strokeStyle = ACENTO; c.lineWidth = g; c.lineCap = "round"; c.setLineDash([2, g * 3.2]);
  c.beginPath();
  const n = 40;
  for (let k = 0; k <= n * u; k++) { const s = k / n, x = lerp(ax, bx, s), y = lerp(ay, by, s) - H * 4 * s * (1 - s); if (k === 0) c.moveTo(x, y); else c.lineTo(x, y); }
  c.stroke(); c.restore();
}
function tiroPos(q: number, r: number, din: number[], t: number) {
  const P = poseCorredor(q, din[1]) as Pose, Q = poseCorredor(r, din[2]) as Pose;
  const a = q === 5 ? P.m2 : P.m1, b = Q.m1;
  const u = prog(t, din[1], din[2]);
  return { ax: a[0], ay: a[1], bx: b[0], by: b[1], u, x: lerp(a[0], b[0], u), y: lerp(a[1], b[1], u) - 330 * 4 * u * (1 - u) };
}

// ---------- la ventana de chat y la computadora ----------
function marcoVentana(c: C, t: number) {
  const a = smooth(prog(t, ev.ventana + .2, ev.ventana + 1.1));
  if (a <= 0) return;
  c.save(); c.globalAlpha = a;
  // barra de título y caja para escribir: así se reconoce un chat sin ninguna marca
  c.fillStyle = BLANCO; c.fillRect(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.bar - WIN.y0);
  linea(c, WIN.x0, WIN.bar, WIN.x1, WIN.bar, 14, TINTA, 4, 400);
  for (let k = 0; k < 3; k++) { c.fillStyle = k === 0 ? "#C9C3B5" : "#DDD8CC"; c.beginPath(); c.arc(WIN.x0 + 110 + k * 110, (WIN.y0 + WIN.bar) / 2, 34, 0, 7); c.fill(); }
  const xx = WIN.x1 - 120, yx = (WIN.y0 + WIN.bar) / 2;
  c.strokeStyle = TINTA; c.lineWidth = 20; c.lineCap = "round";
  c.beginPath(); c.moveTo(xx - 42, yx - 42); c.lineTo(xx + 42, yx + 42); c.moveTo(xx + 42, yx - 42); c.lineTo(xx - 42, yx + 42); c.stroke();
  // la caja de texto, abajo
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 12;
  c.beginPath(); c.roundRect(WIN.x0 + 200, WIN.y1 - 230, WIN.x1 - WIN.x0 - 400, 170, 85); c.fill(); c.stroke();
  c.fillStyle = "#D5D0C4"; c.fillRect(WIN.x0 + 330, WIN.y1 - 155, 1500, 22);
  c.fillStyle = TINTA; c.beginPath(); c.arc(WIN.x1 - 300, WIN.y1 - 145, 58, 0, 7); c.fill();
  c.strokeStyle = BLANCO; c.lineWidth = 12; c.beginPath(); c.moveTo(WIN.x1 - 300, WIN.y1 - 115); c.lineTo(WIN.x1 - 300, WIN.y1 - 175); c.moveTo(WIN.x1 - 325, WIN.y1 - 150); c.lineTo(WIN.x1 - 300, WIN.y1 - 177); c.lineTo(WIN.x1 - 275, WIN.y1 - 150); c.stroke();
  // el contorno de la ventana
  c.strokeStyle = TINTA; c.lineWidth = 16; c.beginPath(); c.roundRect(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, WIN.y1 - WIN.y0, 60); c.stroke();
  c.restore();
}
const LAP = { x0: 520, x1: 3780, y0: 3050, y1: 4850, base: 5270 };
function computadora(c: C, t: number) {
  const a = smooth(prog(t, ev.ventana + .6, ev.ventana + 1.4));
  if (a <= 0) return;
  const luz = smooth(prog(t, ev.enciende - .1, ev.enciende + .35));
  c.save(); c.globalAlpha = a;
  // el resplandor de la pantalla, cuando enciende
  if (luz > 0) {
    const cx = (LAP.x0 + LAP.x1) / 2, cy = (LAP.y0 + LAP.y1) / 2;
    const g = c.createRadialGradient(cx, cy, 300, cx, cy, 3300);
    g.addColorStop(0, `rgba(255,226,170,${.42 * luz})`); g.addColorStop(.45, `rgba(255,232,190,${.14 * luz})`); g.addColorStop(1, "rgba(255,232,190,0)");
    c.fillStyle = g; c.fillRect(cx - 3400, cy - 3400, 6800, 6800);
  }
  sombra(c, (LAP.x0 + LAP.x1) / 2, LAP.base + 30, 2300, .25);
  // base y teclado
  c.fillStyle = "#F1EDE3"; c.strokeStyle = TINTA; c.lineWidth = 16;
  c.beginPath(); c.moveTo(LAP.x0, LAP.y1); c.lineTo(LAP.x1, LAP.y1); c.lineTo(LAP.x1 + 260, LAP.base); c.lineTo(LAP.x0 - 260, LAP.base); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = "rgba(17,17,17,.35)"; c.lineWidth = 6;
  for (let r = 0; r < 3; r++) { const y = LAP.y1 + 70 + r * 95, s = r / 3; c.beginPath(); c.moveTo(LAP.x0 - 60 - 120 * s, y); c.lineTo(LAP.x1 + 60 + 120 * s, y); c.stroke(); }
  // la tapa
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 16;
  c.beginPath(); c.roundRect(LAP.x0, LAP.y0, LAP.x1 - LAP.x0, LAP.y1 - LAP.y0, 70); c.fill(); c.stroke();
  const ix0 = LAP.x0 + 120, iy0 = LAP.y0 + 120, iw = LAP.x1 - LAP.x0 - 240, ih = LAP.y1 - LAP.y0 - 240;
  const g2 = c.createLinearGradient(0, iy0, 0, iy0 + ih);
  g2.addColorStop(0, luz > 0 ? `rgb(${lerp(205, 255, luz)},${lerp(202, 246, luz)},${lerp(194, 228, luz)})` : "#CDCAC2");
  g2.addColorStop(1, luz > 0 ? `rgb(${lerp(196, 250, luz)},${lerp(193, 232, luz)},${lerp(185, 200, luz)})` : "#C4C1B8");
  c.fillStyle = g2; c.fillRect(ix0, iy0, iw, ih);
  c.lineWidth = 8; c.strokeRect(ix0, iy0, iw, ih);
  c.restore();
}
/** Las bolas: saltan de la ventana al escritorio, crecen (salen a tu mundo) y se meten en la pantalla. */
const DESK_Y = 2880, RDESK = 140;
function escapan(c: C, t: number) {
  if (t < ev.salio - .05) return;
  const lista: { x: number; y: number; z: number; R: number; k: number; dentro: number; m1: [number, number]; m2: [number, number]; a: number }[] = [];
  for (let i = 0; i < N; i++) {
    const ts = ev.saltan[i], tm = ev.meten[i];
    if (t < ts) continue;
    const P0 = poseCorredor(i, ts - .01)!;
    const xd = 60 + i * 412, u = prog(t, ts, ts + .7);
    const x = lerp(P0.x, xd, ease.inOutCubic(u)), yS = lerp(P0.y, DESK_Y, u);
    const R = lerp(P0.R, RDESK, ease.inCubic(u));
    let z = Math.sin(Math.PI * u) * lerp(600, 900, u) + (u >= 1 ? 22 * Math.abs(Math.sin((t - ts) * 7 + i)) : 0);
    // en el escritorio, mirando la pantalla; luego, el clavado
    const v = prog(t, tm - .42, tm);
    const xi = LAP.x0 + 420 + i * ((LAP.x1 - LAP.x0 - 840) / (N - 1)), yi = LAP.y1 - 300;
    let xx = x, yy = yS, RR = R;
    if (v > 0) { xx = lerp(x, xi, ease.inOutCubic(v)); yy = lerp(yS, yi, v); RR = lerp(R, 110, ease.inCubic(v)); z = z * (1 - v) + Math.sin(Math.PI * v) * 700; }
    lista.push({ x: xx, y: yy, z, R: RR, k: i, dentro: t >= tm ? 1 : 0, m1: [xx - RR * 1.3, yy - RR - z - RR * .2], m2: [xx + RR * 1.3, yy - RR - z - RR * .2], a: .9 });
  }
  return lista;
}
function dentroPantalla(c: C, t: number, L: ReturnType<typeof escapan>) {
  if (!L) return;
  const ix0 = LAP.x0 + 120, iy0 = LAP.y0 + 120, iw = LAP.x1 - LAP.x0 - 240, ih = LAP.y1 - LAP.y0 - 240;
  c.save(); c.beginPath(); c.rect(ix0, iy0, iw, ih); c.clip();
  for (const b of L) {
    if (!b.dentro) continue;
    const d = t - ev.meten[b.k];
    const x = b.x + 30 * vaiven(t, 2.2 + b.k * .13, b.k), z = 26 * Math.abs(Math.sin(t * 4 + b.k)) + 60 * Math.exp(-d * 6) * Math.abs(Math.sin(d * 14));
    const R = 110, yb = b.y - R - z;
    // trabajan: las manos van y vienen como si tecleara cada una su propia tarea
    sombra(c, x, b.y, 230, .3);
    const tecl = Math.sin(t * 11 + b.k * 1.3) * 18;
    brazo(c, x - 66, yb - 60, x - 140, yb + 70 + tecl, 110, .4, TINTA, 1, R / 90);
    brazo(c, x + 72, yb - 37, x + 140, yb + 70 - tecl, -120, .4, TINTA, 1, R / 90);
    bola(c, x, yb, R);
  }
  c.restore();
}

// ---------- polvo de papel ----------
function polvo(c: C, t: number) {
  const r = azar(9);
  c.fillStyle = TINTA;
  for (let i = 0; i < 60; i++) {
    const x0 = r() * 1200 - 60, y0 = r() * 2060, v = 14 + r() * 40, f = r() * 6.3, z = 1.6 + r() * 3;
    const y = ((y0 - t * v) % 2060 + 2060) % 2060 - 70, x = x0 + Math.sin(t * .5 + f) * 30;
    c.globalAlpha = .06 + r() * .14; c.fillRect(x, y, z, z);
  }
  c.globalAlpha = 1;
}

// ---------- el cuadro ----------
function dibuja(c: C, t: number) {
  FR = Math.floor(t * 10);
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  const K = camara(t);
  // respiración: la cámara nunca se queda quieta
  const choque = ev.grande, sacude = t > choque ? 18 * Math.exp(-(t - choque) * 6) * Math.sin((t - choque) * 70) : 0;
  const z = K.z * (1 + .012 * vaiven(t, 5.3) + .006 * vaiven(t, 2.9, 1));
  const ox = 9 * vaiven(t, 6.1, .3) + sacude, oy = 11 * vaiven(t, 4.7, 1.1) + sacude * .6;
  c.save();
  c.translate(540 + ox, 960 + oy); c.rotate(.004 * vaiven(t, 7.3, .4)); c.scale(z, z); c.translate(-K.x, -K.y);

  // doblez final de la ventana: todo su contenido se aplasta hacia su centro
  const dob = prog(t, ev.dobla, ev.dobla + .5);
  const wc = (WIN.y0 + WIN.y1) / 2;
  c.save();
  if (dob > 0) { const k = ease.inOutCubic(dob); c.translate((WIN.x0 + WIN.x1) / 2, wc); c.rotate(-.06 * k); c.scale(1 - .08 * k, Math.max(1 - k, .001)); c.translate(-(WIN.x0 + WIN.x1) / 2, -wc); c.globalAlpha = 1 - smooth(prog(dob, .7, 1)); }
  if (dob < 1) {
    cancha(c, t);
    tribuna(c, t);
    for (let p = 0; p < 4; p++) pista(c, p, t);
    // por pista, de la más lejana a la más cercana: banderines, arcos y corredores
    const poses = CO.map((_, i) => poseCorredor(i, t));
    for (let p = 0; p < 4; p++) {
      for (let i = 0; i < N; i++) if (CO[i].p === p) banderin(c, i, t);
      // relevos: quedan como arcos rojos cuando la vista abre
      const aA = smooth(prog(t, ev.nadie + .4, ev.nadie + 1.4)) * (1 - smooth(prog(t, ev.salio, ev.salio + .5)));
      for (let i = 0; i < N; i++) if (CO[i].p === p && SIG[i] >= 0) {
        const u = clamp(prog(t, ev.nadie + .35 + i * .07, ev.nadie + .95 + i * .07));
        arcoPunteado(c, XS(i), LY[p] - 40, XS(SIG[i]), LY[p] - 40, 220, u, 22, aA);
      }
      const bolas = CO.map((co, i) => ({ i, P: poses[i] })).filter((o) => CO[o.i].p === p && o.P) as { i: number; P: Pose }[];
      bolas.sort((a, b) => a.P.x - b.P.x);
      for (const { i, P } of bolas) dibujaCorredor(c, i, P, t, portador(p, t) === i);
      if (p === 3) gente(c, t);
      if (p === 1) pleito(t).forEach((b2, k) => dibujaBolita(c, b2, t, k));
    }
    // círculos rojos alrededor de cada fecha en la pista 4
    [9, 8, 7].forEach((i, k) => {
      const tc = ev.circulos[k]; if (t < tc) return;
      const u = ease.outCubic(prog(t, tc, tc + .45)), aC = 1 - smooth(prog(t, ev.reves + .3, ev.reves + .9));
      const e = ESC[3], cx = X(CO[i].mes) - 10 * e + 75 * e, cy = LY[3] - HLB(3, t) - 300 * e + 56 * e;
      c.save(); c.globalAlpha = aC; c.strokeStyle = ACENTO; c.lineWidth = 9; c.lineCap = "round"; c.beginPath();
      for (let s = 0; s <= u * 1.08; s += .01) { const a = -1.9 + s * 6.4, rr = 130 + 9 * Math.sin(s * 9 + k); const x = cx + Math.cos(a) * rr * 1.18, y = cy + Math.sin(a) * rr; if (s === 0) c.moveTo(x, y); else c.lineTo(x, y); }
      c.stroke(); c.restore();
    });
    // los testigos que cruzan de pista: skills (Anthropic → Codex) y AGENTS.md (OpenAI → Claude Code)
    const cruces: [number, number, number[], string][] = [[5, 4, ev.skills, "skills"], [6, 3, ev.agentsmd, "AGENTS.md"]];
    const aEst = 1 - smooth(prog(t, ev.salio, ev.salio + .5));
    for (const [q, r, din, et] of cruces) {
      if (t < din[0] - .1) continue;
      const P = tiroPos(q, r, din, t);
      if (t >= din[1]) arcoPunteado(c, P.ax, P.ay, P.bx, P.by, 330, P.u, 10, aEst);
      let bx: number, by: number, ang: number;
      if (t < din[1]) { const Q = poseCorredor(q, t)!; const h = q === 5 ? Q.m2 : Q.m1; bx = h[0]; by = h[1] - 6; ang = -.9 + .3 * Math.sin(t * 6); }
      else if (t < din[2]) { bx = P.x; by = P.y; ang = (t - din[1]) * 14; }
      else { const Q = poseCorredor(r, t); if (!Q) continue; bx = Q.m1[0]; by = Q.m1[1] - 6; ang = -1.1 + .2 * Math.sin(t * 5); }
      if (t < ev.saltan[r]) testigo(c, bx, by, ang, 1.15);
      const aE = smooth(prog(t, din[0], din[0] + .25)) * (1 - smooth(prog(t, din[2] + 1.0, din[2] + 1.4)));
      const hx = bx, hy = by;
      if (t > din[2]) { const Q = poseCorredor(r, din[2]); if (Q) { bx = Q.m1[0]; by = Q.m1[1] - 6; } }   // la etiqueta se queda donde atrapó
      if (aE > 0 && t < ev.salio) {
        // una etiqueta de papel amarrada al testigo con un hilo
        c.font = serif(80, true); const w = c.measureText(et).width + 52;
        const lx = clamp(bx + 30, K.x - 480 / K.z + w / 2, K.x + 420 / K.z - w / 2), ly = by - 150 + 8 * Math.sin(t * 4);
        c.save(); c.globalAlpha = aE;
        c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.moveTo(hx, hy); c.quadraticCurveTo(hx + 10, ly + 60, lx - w / 2 + 30, ly + 42); c.stroke();
        c.translate(lx, ly); c.rotate(.04 * Math.sin(t * 3 + bx));
        c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.roundRect(-w / 2, -58, w, 104, 14); c.fill(); c.stroke();
        texto(c, et, 0, 22, { fuente: serif(80, true), color: TINTA });
        c.restore();
      }
    }
  }
  marcoVentana(c, t);
  c.restore();
  computadora(c, t);
  const L = escapan(c, t);
  dentroPantalla(c, t, L);
  // las que todavía van por el aire o están en el escritorio
  if (L) for (const b of L) {
    if (b.dentro) continue;
    const yb = b.y - b.R - b.z;
    sombra(c, b.x, b.y, b.R * 2.2, .3 / (1 + b.z / 400));
    brazo(c, b.x - .6 * b.R, yb - .55 * b.R, b.m1[0], b.m1[1], b.R, .9, TINTA, 1, b.R / 90);
    brazo(c, b.x + .66 * b.R, yb - .33 * b.R, b.m2[0], b.m2[1], -b.R * 1.1, .9, TINTA, 1, b.R / 90);
    bola(c, b.x, yb, b.R);
  }
  // la mano de hule que sale de la pantalla y cierra la ventana
  if (t > ev.brazo - .05) {
    const xx = WIN.x1 - 120, yx = (WIN.y0 + WIN.bar) / 2;
    const sale = ease.outCubic(prog(t, ev.brazo, ev.clic)), vuelve = ease.inOutCubic(prog(t, ev.regresa, ev.regresa + .45));
    const L2 = sale * (1 - vuelve);
    if (L2 > .01) {
      const ox0 = 3150, oy0 = 4000;
      const pr = t < ev.clic ? 0 : Math.exp(-(t - ev.clic) * 10) * 50;
      brazo(c, ox0, oy0, xx + 40, yx + 60 + pr, -900, t < ev.clic - .1 ? .7 : .05, TINTA, L2, 5.2);
    }
  }
  c.restore();

  polvo(c, t);

  // ---------- letreros en pantalla ----------
  letrero(c, t, ev.jabs[1] - .4, ev.otros[0] - .5, "¿Le copió?", 690, 168, TINTA, true);
  letrero(c, t, ev.corro - .05, ev.fechas - .1, "todos se copian", 600, 128, TINTA, true);
  // títulos de cada carrera, sobre su banda de papel
  const titulos: [number, number, string, string][] = [
    [ev.titulo[0], ev.rollo[1] - .5, "el agente programador", "en la nube"],
    [ev.titulo[1], ev.rollo[2] - .5, "el agente", "en tu computadora"],
    [ev.titulo[2], ev.rollo[3] - .5, "", "usar una pantalla"],
    [ev.titulo[3], ev.calla - .4, "la grande", "para todos"],
  ];
  titulos.forEach(([a, b, s1, s2], k) => {
    const al = ventana(t, a - .1, b, .25, .3);
    banda(c, 1300, 1620, al);
    if (s1) letrero(c, t, k === 3 ? ev.grande : a, b, s1, 1390, 76, GRIS);
    letrero(c, t, k === 3 ? a + .1 : a + .35, b, s2, 1520, 128, TINTA, true);
  });
  letrero(c, t, ev.sennalan - .15, ev.circulos[0] - .1, "¿Le copió?", 330, 150, TINTA, true);
  banda(c, 300, 620, ventana(t, ev.nadie + .4, ev.discuten - .1, .25, .3));
  letrero(c, t, ev.nadie + .45, ev.discuten - .25, "Nadie copió todo.", 470, 112, TINTA);
  letrero(c, t, ev.discuten + .45, ev.paso + .1, "¿quién fue primero?", 380, 120, TINTA, true);
  banda(c, 1300, 1600, ventana(t, ev.todos - .1, ev.discuten - .1, .25, .3));
  letrero(c, t, ev.todos, ev.discuten - .25, "Todos copiaron algo.", 1450, 112, ACENTO, true);
}

export const Pieza: React.FC = () => <Lienzo dibuja={(c, t) => dibuja(c, t)} preparar={() => ({})} />;
