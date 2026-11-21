// Serie 2, capítulo 11: el examen. Un mundo de papel que la cámara recorre de estación en estación.
// La bola lanza una moneda y cae águila: alguien sella "FUNCIONA". Una calculadora da 4, 4, 4; la bola da tres
// fiestas distintas. El lunes la fiesta sale entera y el martes, con la misma nota, sin pastel. Una palabra de la
// nota ("invitados" → "contactos") arregla una fiesta y le avisa a mamá en otras tres. Regresamos a la moneda, ya
// entendida: "siempre cae águila", y a la siguiente cae sol. Entonces cae del cielo la máquina de exámenes: veinte
// mesitas corren la fiesta en paralelo, tres casillas califican cada una y sale "17 de 20" (un ejemplo, no un
// dato). El número se vuelve la recta del capítulo 1 de la serie 1, pero quien la mira es una persona. Cierra con
// dos bolas iguales: el juguete de cuerda lanza la moneda; el producto tiene detrás el examen escrito.
// Todos los instantes vienen de eventos.json, que escribe partitura.py: dibujo y sonido son los mismos números.
import React from "react";
import { azar, caida, clamp, ease, lerp, prog, smooth, texto } from "../../kit";
import { ACENTO, bola, cue, GRIS, Lienzo, LUZ, mono, NOCHE, PAPEL, rotulo, serif, sombra, TINTA } from "../../marca";
import { agente } from "../../personaje";
import palabras from "./palabras.json";
import duracion from "./duracion.json";
import E from "./eventos.json";

export const DURACION = duracion.dur;
const T = cue(palabras);
type Ctx = CanvasRenderingContext2D;
type Pt = [number, number];
type Vuelo = typeof E.v1;

const TAU = Math.PI * 2;
const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * TAU + f);
const ventana = (t: number, a: number, b: number, fi = .25, fo = .3) => smooth(prog(t, a, a + fi)) * (1 - smooth(prog(t, b, b + fo)));
const pulso = (t: number, a: number, dur = .5) => (t > a && t < a + dur ? Math.sin(Math.PI * (t - a) / dur) : 0);
let FR = 0;
/** texto() del kit pisa globalAlpha: este lo multiplica por el alfa del grupo en que se dibuja. */
const tx = (c: CanvasRenderingContext2D, s: string, x: number, y: number, o: Parameters<typeof texto>[4]) => texto(c, s, x, y, { ...o, alfa: (o.alfa ?? 1) * c.globalAlpha });
const tiembla = (j: number) => { const s = Math.sin(j * 12.9898 + FR * 78.233) * 43758.5453; return s - Math.floor(s) - .5; };
const HOJA = "#FDFCF8", MESA = "#EAE5D8", CANTO = "#D6CFBF", PIEL = "#F1E6D6", METAL = "#57534B";

const t0 = {
  como: T("cómo sabes").s, que: T("que tu agente").s, funciona: T("funciona").s, siempre: T("siempre cae").s,
  muchas: T("muchas veces").s, antes: T("antes de").s, vuelves: T("vuelves").s, sin: T("sin un error").s, nadie: T("nadie").s,
  casi: T("casi nunca").s, esel: T("es el modelo").s, adivinas: T("adivinas").s,
};

// ---------- estaciones del mundo y cámara ----------
const S = { A: [0, 0], B: [1500, 0], C: [3000, 0], E: [0, 2600], H: [1500, 2600], I: [3000, 2600] } as const;
type Est = keyof typeof S;
const NOTA = { x: 800, y: 470, w: 260, h: 270, giro: .05 };
type Clave = { t: number; e: Est; x: number; y: number; z: number; dur?: number; curva?: (x: number) => number };
const CLAVES: Clave[] = [
  { t: 0, e: "A", x: 505, y: 1040, z: 1.36 },
  { t: 0, e: "A", x: 540, y: 1020, z: 1.2, dur: 1.9, curva: ease.inOutSine },
  { t: E.v1.tl, e: "A", x: 565, y: 1070, z: 1.32, dur: 2.3, curva: ease.inOutSine },
  { t: E.sello - .75, e: "A", x: 560, y: 1000, z: 1.15, dur: .6 },
  { t: E.nolo - .1, e: "A", x: 545, y: 995, z: 1.2, dur: 1.2, curva: ease.inOutSine },
  { t: E.panB, e: "B", x: 540, y: 960, z: 1, dur: .6, curva: ease.outExpo },
  { t: E.panB + .7, e: "B", x: 548, y: 975, z: 1.035, dur: 3.5, curva: ease.inOutSine },
  { t: E.panC, e: "C", x: 540, y: 905, z: 1.08, dur: .6, curva: ease.outExpo },
  { t: E.panC + .7, e: "C", x: 545, y: 915, z: 1.11, dur: 5, curva: ease.inOutSine },
  { t: E.zoomD, e: "C", x: NOTA.x, y: NOTA.y + 140, z: 2.9, dur: .9 },
  { t: E.cartas - .25, e: "C", x: NOTA.x, y: NOTA.y + 150, z: 2.8, dur: 1.2, curva: ease.inOutSine },
  { t: E.panA, e: "A", x: 560, y: 1010, z: 1.2, dur: .75, curva: ease.outExpo },
  { t: E.dice - .3, e: "A", x: 570, y: 1030, z: 1.27, dur: 1.8, curva: ease.inOutSine },
  { t: E.bajaE, e: "E", x: 540, y: 790, z: .9, dur: .8 },
  { t: E.lista - .4, e: "E", x: 540, y: 880, z: .95, dur: 1.0 },
  { t: E.lista + 1.2, e: "E", x: 512, y: 890, z: .99, dur: 1.6, curva: ease.inOutSine },
  { t: E.palanca + 1.2, e: "E", x: 530, y: 880, z: 1.0, dur: 2.5, curva: ease.inOutSine },
  { t: E.zoomF, e: "E", x: 540, y: 860, z: 1.25, dur: .7 },
  { t: E.numero, e: "E", x: 540, y: 640, z: 1.3, dur: .55 },
  { t: E.abre - .2, e: "E", x: 545, y: 800, z: .92, dur: .7 },
  { t: E.palanca2 - .5, e: "E", x: 512, y: 810, z: .94, dur: .6 },
  { t: E.panH, e: "H", x: 540, y: 960, z: 1, dur: .7, curva: ease.outExpo },
  { t: E.panH + .75, e: "H", x: 575, y: 945, z: 1.07, dur: 4.6, curva: ease.inOutSine },
  { t: E.persona - .1, e: "H", x: 540, y: 1070, z: .86, dur: 1.3 },
  { t: E.panI, e: "I", x: 540, y: 1010, z: 1.14, dur: .7, curva: ease.outExpo },
  { t: E.alguien - .2, e: "I", x: 575, y: 1000, z: 1.15, dur: 1.4, curva: ease.inOutSine },
  { t: E.nomides - .3, e: "I", x: 505, y: 1000, z: 1.15, dur: 1.2 },
  { t: E.v4.tl + .1, e: "I", x: 520, y: 1000, z: 1.21, dur: 2.8, curva: ease.inOutSine },
];
type Cam = { x: number; y: number; z: number };
const mundo = (e: Est, x: number, y: number): Pt => [S[e][0] + x, S[e][1] + y];
function camaraEn(t: number): Cam {
  const w0 = mundo(CLAVES[0].e, CLAVES[0].x, CLAVES[0].y);
  let x = w0[0], y = w0[1], z = CLAVES[0].z;
  for (let i = 1; i < CLAVES.length; i++) {
    const k = CLAVES[i]; if (t < k.t) break;
    const q = (k.curva ?? ease.inOutCubic)(prog(t, k.t, k.t + (k.dur ?? 1.2)));
    const [wx, wy] = mundo(k.e, k.x, k.y);
    x = lerp(x, wx, q); y = lerp(y, wy, q); z = z * (k.z / z) ** q;
  }
  // La cámara sigue a la moneda cuando sube: el piso se va, el papel corre.
  for (const F of [E.v1, E.v2, E.v4]) {
    if (t < F.t0 - .05 || t > F.tl + .1) continue;
    const m = estadoVuelo(F, t); if (!m || !m.aire) continue;
    y += .9 * Math.min(0, m.y - F.y0);
  }
  return { x, y, z };
}
const GOLPES: [number, number][] = [[E.v1.tl, 10], [E.sello, 16], [E.v2.tl, 8], [E.golpea, 13], [E.v3.tl, 4], [E.maquina, 30],
  [E.palanca + .25, 8], [E.palanca2 + .25, 7], [E.diecisiete, 6], [E.v4.tl, 9], [E.falta, 5], [E.pastel + .2, 4], [E.tu, 5]];

// ---------- la moneda ----------
const AF = (cara: number) => (cara > 0 ? Math.PI / 3 : 2 * Math.PI / 3);
/** Posición y giro de una moneda lanzada. a: ángulo de volteo; cos(a) > 0 enseña el águila. */
function estadoVuelo(F: Vuelo, t: number) {
  if (t < F.t0) return null;
  const dur = F.tl - F.t0, aF = AF(F.cara), aL = aF + F.d0;
  const N = Math.round((F.a0 + F.giros * TAU - aL) / TAU), aFin = aL + N * TAU;
  const tau = t - F.t0;
  if (tau < dur) {
    const y = F.y0 - F.v0 * tau + .5 * E.G * tau * tau;
    // Los lanzamientos altos vienen hacia la cámara: la moneda crece en lo alto del arco.
    const s = 1 + (F.v0 > 2000 ? .62 : 0) * Math.sin(Math.PI * tau / dur) ** 1.4;
    return { x: lerp(F.x0, F.x1, tau / dur), y, a: lerp(F.a0, aFin, tau / dur), aire: true, alto: F.y1 - y, u: -1, s };
  }
  const u = tau - dur, W = F.wob, acel = (F.f1 - F.f0) / W;
  const d = u < W ? F.d0 * (1 - u / W) ** 1.6 : 0;
  const fase = TAU * (F.f0 * u + .5 * acel * u * u);
  const rb = u < .14 ? Math.sin(Math.PI * u / .14) * 24 : u < .23 ? Math.sin(Math.PI * (u - .14) / .09) * 6 : 0;
  return { x: F.x1 + 5 * d * Math.sin(fase), y: F.y1 - rb, a: aF + d * Math.cos(fase), aire: false, alto: rb, u, s: 1 };
}

function aguila(c: Ctx, col: string) {
  c.fillStyle = col; c.strokeStyle = col; c.lineJoin = "round"; c.lineCap = "round";
  // ala de atrás
  c.beginPath(); c.moveTo(-4, -16); c.bezierCurveTo(-18, -40, -36, -58, -50, -68);
  c.lineTo(-47, -55); c.lineTo(-60, -54); c.lineTo(-51, -43); c.lineTo(-63, -38); c.lineTo(-50, -30); c.lineTo(-56, -21); c.lineTo(-30, -14); c.closePath(); c.fill();
  // ala de enfrente
  c.beginPath(); c.moveTo(8, -18); c.bezierCurveTo(22, -46, 44, -68, 64, -72);
  c.lineTo(57, -59); c.lineTo(70, -55); c.lineTo(59, -45); c.lineTo(70, -37); c.lineTo(55, -31); c.lineTo(62, -21); c.lineTo(40, -15); c.lineTo(22, 0); c.closePath(); c.fill();
  // cuerpo
  c.beginPath(); c.moveTo(-15, -27); c.bezierCurveTo(-27, -6, -19, 22, 0, 34); c.bezierCurveTo(10, 40, 23, 36, 25, 22); c.bezierCurveTo(27, 4, 17, -16, 6, -27); c.closePath(); c.fill();
  // cola
  c.beginPath(); c.moveTo(4, 30); c.lineTo(31, 51); c.lineTo(22, 54); c.lineTo(28, 63); c.lineTo(12, 53); c.lineTo(8, 61); c.lineTo(-2, 38); c.closePath(); c.fill();
  // cabeza y pico
  c.beginPath(); c.arc(-18, -35, 12.5, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(-28, -41); c.quadraticCurveTo(-45, -41, -43, -28); c.lineTo(-37, -32); c.lineTo(-28, -30); c.closePath(); c.fill();
  // serpiente
  c.lineWidth = 4.5; c.beginPath(); c.moveTo(-41, -30); c.bezierCurveTo(-58, -20, -36, -8, -52, 6); c.stroke();
  // patas sobre el nopal
  c.lineWidth = 5.5; c.beginPath(); c.moveTo(-5, 32); c.lineTo(-11, 49); c.moveTo(10, 34); c.lineTo(12, 49); c.stroke();
  c.beginPath(); c.ellipse(0, 58, 21, 10, 0, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(-26, 66, 13, 8, -.45, 0, TAU); c.ellipse(26, 66, 13, 8, .45, 0, TAU); c.fill();
}
function sol(c: Ctx, col: string) {
  c.fillStyle = col;
  c.beginPath(); c.arc(0, 0, 29, 0, TAU); c.fill();
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * TAU, l = i % 2 ? 54 : 68, w = i % 2 ? .1 : .14;
    c.beginPath(); c.moveTo(Math.cos(a - w) * 35, Math.sin(a - w) * 35); c.lineTo(Math.cos(a) * l, Math.sin(a) * l); c.lineTo(Math.cos(a + w) * 35, Math.sin(a + w) * 35); c.closePath(); c.fill();
  }
}
/** La moneda de canto a de frente: k = cos(a) aplana la cara, el canto estriado se ve cuando se inclina. */
function moneda(c: Ctx, x: number, y: number, R: number, a: number, cara?: number) {
  let k = Math.cos(a);
  if (cara !== undefined) k = cara > 0 ? Math.max(k, .07) : Math.min(k, -.07);
  const ak = Math.max(Math.abs(k), .035), s = Math.sqrt(Math.max(0, 1 - k * k)), g = R * .14 * s, dir = k >= 0 ? 1 : -1;
  c.save(); c.translate(x, y);
  // canto
  c.fillStyle = "#8C887F"; c.strokeStyle = TINTA; c.lineWidth = 3.5;
  c.beginPath(); c.ellipse(0, dir * g, R, R * ak, 0, 0, TAU); c.fill();
  c.fillRect(-R, Math.min(0, dir * g), 2 * R, Math.abs(g));
  c.beginPath(); c.ellipse(0, dir * g, R, R * ak, 0, dir > 0 ? 0 : Math.PI, dir > 0 ? Math.PI : TAU); c.stroke();
  c.beginPath(); c.moveTo(-R, 0); c.lineTo(-R, dir * g); c.moveTo(R, 0); c.lineTo(R, dir * g); c.stroke();
  if (g > 3) {
    c.strokeStyle = "rgba(17,17,17,.32)"; c.lineWidth = 1.6; c.beginPath();
    for (let i = 1; i < 30; i++) { const th = i / 30 * Math.PI, xx = -R * Math.cos(th), yy = dir * R * ak * Math.sin(th); c.moveTo(xx, yy); c.lineTo(xx, yy + dir * g); }
    c.stroke();
  }
  // cara
  c.save(); c.scale(1, ak);
  const gr = c.createLinearGradient(-R, -R, R, R);
  gr.addColorStop(0, "#FBFAF5"); gr.addColorStop(.45, "#D6D2C9"); gr.addColorStop(1, "#9E9A91");
  c.fillStyle = gr; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
  c.strokeStyle = "rgba(17,17,17,.38)"; c.lineWidth = R * .035; c.beginPath(); c.arc(0, 0, R * .86, 0, TAU); c.stroke();
  c.fillStyle = "rgba(17,17,17,.42)";
  for (let i = 0; i < 36; i++) { const b = i / 36 * TAU; c.beginPath(); c.arc(Math.cos(b) * R * .925, Math.sin(b) * R * .925, R * .022, 0, TAU); c.fill(); }
  c.scale(R / 100, R / 100);
  // relieve: luz arriba a la izquierda, tinta encima
  c.save(); c.translate(-1.8, -1.8); (k >= 0 ? aguila : sol)(c, "rgba(255,255,255,.85)"); c.restore();
  (k >= 0 ? aguila : sol)(c, METAL);
  c.restore();
  // brillo que cruza al girar
  const br = Math.max(0, Math.sin(a * 2 + .6)) ** 6 * .5;
  if (br > .02) {
    c.save(); c.scale(1, ak); c.beginPath(); c.arc(0, 0, R, 0, TAU); c.clip();
    const lg = c.createLinearGradient(-R, -R, R, R);
    lg.addColorStop(.3, "rgba(255,255,255,0)"); lg.addColorStop(.5, `rgba(255,255,255,${br})`); lg.addColorStop(.7, "rgba(255,255,255,0)");
    c.fillStyle = lg; c.fillRect(-R, -R, 2 * R, 2 * R); c.restore();
  }
  c.strokeStyle = TINTA; c.lineWidth = 3.5; c.beginPath(); c.ellipse(0, 0, R, R * ak, 0, 0, TAU); c.stroke();
  c.restore();
}
function sombraMoneda(c: Ctx, x: number, y: number, R: number, alto: number) {
  sombra(c, x, y + 4, R * (1.25 + alto / 900), .34 / (1 + alto / 180));
}

// ---------- figuras de la fiesta (hechas a mano, unidad ≈ 150 px de alto) ----------
function pastel(c: Ctx, t: number, rojo = ACENTO) {
  c.lineWidth = 4.5; c.strokeStyle = TINTA; c.lineJoin = "round";
  c.fillStyle = "#FFFFFF"; c.beginPath(); c.ellipse(0, -6, 82, 14, 0, 0, TAU); c.fill(); c.stroke();
  c.beginPath(); c.roundRect(-62, -70, 124, 64, 8); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-62, -56); for (let i = 0; i <= 12; i++) c.lineTo(-62 + i * 124 / 12, -56 + (i % 2 ? 9 : 0)); c.stroke();
  c.beginPath(); c.roundRect(-42, -118, 84, 48, 8); c.fill(); c.stroke();
  for (const x of [-20, 0, 20]) {
    c.fillStyle = rojo; c.fillRect(x - 4, -146, 8, 28);
    c.fillStyle = TINTA; c.beginPath(); c.ellipse(x + Math.sin(t * 9 + x) * 1.5, -156, 5, 9, 0, 0, TAU); c.fill();
  }
}
function pastelFantasma(c: Ctx, t: number, a: number) {
  c.save(); c.globalAlpha *= a; c.setLineDash([10, 9]); c.lineDashOffset = -t * 30; c.lineWidth = 4; c.strokeStyle = TINTA;
  c.beginPath(); c.ellipse(0, -6, 82, 14, 0, 0, TAU); c.stroke();
  c.beginPath(); c.roundRect(-62, -70, 124, 64, 8); c.stroke(); c.beginPath(); c.roundRect(-42, -118, 84, 48, 8); c.stroke();
  c.restore();
}
function globos(c: Ctx, n: number, t: number) {
  const B: [number, number, string][] = [[-40, -160, ACENTO], [8, -196, "#FFFFFF"], [46, -150, TINTA]];
  c.lineWidth = 3; c.strokeStyle = TINTA;
  for (const [x, y] of B.slice(0, n)) { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(x * .3, y * .5, x + Math.sin(t * 1.4 + x) * 4, y + 40); c.stroke(); }
  for (const [x, y, f] of B.slice(0, n)) {
    const xx = x + Math.sin(t * 1.4 + x) * 4;
    c.fillStyle = f; c.lineWidth = 4.5; c.beginPath(); c.ellipse(xx, y, 31, 39, 0, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = TINTA; c.beginPath(); c.moveTo(xx - 6, y + 44); c.lineTo(xx + 6, y + 44); c.lineTo(xx, y + 37); c.fill();
  }
}
function invitado(c: Ctx, x: number, fantasma = 0) {
  c.lineWidth = 4.5; c.strokeStyle = TINTA; c.lineJoin = "round";
  c.save();
  if (fantasma) { c.setLineDash([8, 7]); c.globalAlpha *= fantasma; }
  c.fillStyle = fantasma ? "rgba(0,0,0,0)" : "#FFFFFF";
  c.beginPath();
  c.moveTo(x - 9, -78); c.lineTo(x - 30, -64); c.lineTo(x - 26, -56); c.lineTo(x - 10, -62); c.lineTo(x - 14, -28); c.lineTo(x - 18, 0); c.lineTo(x - 6, 0);
  c.lineTo(x, -24); c.lineTo(x + 6, 0); c.lineTo(x + 18, 0); c.lineTo(x + 14, -28); c.lineTo(x + 10, -62); c.lineTo(x + 26, -56); c.lineTo(x + 30, -64); c.lineTo(x + 9, -78); c.closePath();
  if (!fantasma) c.fill(); c.stroke();
  c.beginPath(); c.arc(x, -94, 15, 0, TAU); if (!fantasma) c.fill(); c.stroke();
  c.restore();
}
function telefono(c: Ctx, t: number, k: number) {
  if (k < 0) return;
  const v = k > 0 && k < 1 ? Math.sin(t * 60) * 6 : 0;
  c.save(); c.translate(v, 0);
  c.fillStyle = TINTA; c.beginPath(); c.roundRect(-30, -116, 60, 116, 12); c.fill();
  c.fillStyle = "#FFFFFF"; c.beginPath(); c.roundRect(-23, -106, 46, 90, 5); c.fill();
  c.fillStyle = ACENTO; c.beginPath(); c.roundRect(-18, -98, 36, 26, 5); c.fill();
  c.restore();
  // la burbuja: el mensaje ya le llegó
  const b = ease.outBack(clamp(k), 2);
  if (b <= .01) return;
  c.save(); c.translate(52, -150); c.scale(b, b); c.rotate(-.06);
  c.fillStyle = ACENTO; c.beginPath(); c.roundRect(-74, -42, 148, 74, 20); c.fill();
  c.beginPath(); c.moveTo(-44, 28); c.lineTo(-58, 58); c.lineTo(-20, 30); c.fill();
  tx(c, "mamá", 0, 12, { fuente: serif(52, true), color: "#FFFFFF" });
  c.restore();
}
function guirnalda(c: Ctx, x0: number, x1: number, y: number, comba: number, t: number, n: number, a = 1) {
  if (a <= .01) return;
  const pt = (u: number): Pt => [lerp(x0, x1, u), y + comba * Math.sin(Math.PI * u)];
  c.save(); c.globalAlpha *= a; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath();
  for (let i = 0; i <= 40; i++) { const [x, yy] = pt(i / 40); if (i) c.lineTo(x, yy); else c.moveTo(x, yy); }
  c.stroke();
  for (let k = 0; k < n; k++) {
    const u = (k + .5) / n, [x, yy] = pt(u), sw = 10 * vaiven(t, 1.4 + (k % 3) * .2, k);
    c.fillStyle = k % 3 === 0 ? ACENTO : k % 3 === 1 ? TINTA : "#FFFFFF";
    c.beginPath(); c.moveTo(x - 30, yy); c.lineTo(x + 30, yy); c.lineTo(x + sw, yy + 74); c.closePath(); c.fill();
    c.lineWidth = 2.5; c.strokeStyle = TINTA; c.stroke();
  }
  c.restore();
}

/** Una fiesta en miniatura sobre su mesita. (0,0) es el centro; mide unos 170 de ancho. */
type Fiesta = { pastel: number; globos: number; invitados: number; mama?: number; dinero?: number; falta?: number; extra?: number; agente?: boolean };
function fiestita(c: Ctx, F: Fiesta, t: number, pop = 1, semilla = 0) {
  if (pop <= .01) return;
  c.save(); c.lineCap = "round";
  // piso y mesa
  c.strokeStyle = "rgba(17,17,17,.35)"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-80, 46); c.lineTo(80, 46); c.stroke();
  c.fillStyle = MESA; c.strokeStyle = TINTA; c.lineWidth = 3;
  c.beginPath(); c.rect(-44, 16, 88, 14); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-36, 30); c.lineTo(-36, 46); c.moveTo(36, 30); c.lineTo(36, 46); c.stroke();
  const s = ease.outBack(clamp(pop), 1.8);
  // globos atados a la mesa
  if (F.globos) { c.save(); c.translate(-40, 16); c.scale(.28 * s, .28 * s); globos(c, F.globos, t + semilla); c.restore(); }
  if (F.pastel) { c.save(); c.translate(0, 16); c.scale(.25 * s * (F.pastel > 1 ? 1.05 : .9), .25 * s * (F.pastel > 1 ? 1.15 : .85)); pastel(c, t); c.restore(); }
  if (F.falta) { c.save(); c.translate(0, 16); c.scale(.25, .25); pastelFantasma(c, t, F.falta); c.restore(); }
  for (let i = 0; i < F.invitados; i++) { c.save(); c.translate(52 + i * 15, 46); c.scale(.3 * s, .3 * s); invitado(c, 0); c.restore(); }
  if (F.extra) { c.save(); c.translate(52 + F.invitados * 15, 46); c.scale(.3 * ease.outBack(clamp(F.extra), 2.4), .3 * ease.outBack(clamp(F.extra), 2.4)); invitado(c, 0); c.restore(); }
  if (F.agente) {
    const h = Math.abs(Math.sin(t * 5.2 + semilla)) * 6 * s;
    agente(c, -66, 34 - h, 11, [-78, 18 - h - 6 * Math.sin(t * 7 + semilla)], [-52, 16 - h + 6 * Math.sin(t * 7 + semilla)], { piso: 46, sombra: .2 });
  }
  if (F.dinero && F.dinero > 0) {
    const k = ease.outBack(clamp(F.dinero), 2.2);
    c.save(); c.translate(0, -42 - 6 * Math.sin(t * 6)); c.scale(k, k); c.rotate(-.08);
    c.fillStyle = ACENTO; c.beginPath(); c.roundRect(-48, -22, 96, 40, 8); c.fill();
    tx(c, "$$$", 0, 11, { fuente: mono(30), color: "#FFFFFF" }); c.restore();
  }
  if (F.mama !== undefined && F.mama >= 0) { c.save(); c.translate(26, 8); c.scale(.4, .4); telefono(c, t, F.mama); c.restore(); }
  c.restore();
}

// ---------- herramientas sueltas ----------
function hojaPapel(c: Ctx, x: number, y: number, w: number, h: number, giro = 0, fondo = HOJA, grosor = 4) {
  c.save(); c.translate(x, y); c.rotate(giro);
  c.fillStyle = "rgba(20,18,14,.12)"; c.fillRect(-w / 2 + 8, -h / 2 + 10, w, h);
  c.fillStyle = fondo; c.strokeStyle = TINTA; c.lineWidth = grosor;
  c.beginPath(); c.moveTo(-w / 2 + tiembla(1) * 2, -h / 2 + tiembla(2) * 2); c.lineTo(w / 2 + tiembla(3) * 2, -h / 2 + tiembla(4) * 2);
  c.lineTo(w / 2 + tiembla(5) * 2, h / 2 + tiembla(6) * 2); c.lineTo(-w / 2 + tiembla(7) * 2, h / 2 + tiembla(8) * 2); c.closePath(); c.fill(); c.stroke();
  c.restore();
}
function palomita(c: Ctx, x: number, y: number, s: number, k: number, color = TINTA, g = 7) {
  if (k <= 0) return;
  const P: Pt[] = [[-1, 0], [-.3, .7], [1, -.9]], L1 = Math.hypot(.7, .7), L2 = Math.hypot(1.3, 1.6), L = (L1 + L2) * clamp(k);
  c.save(); c.translate(x, y); c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round"; c.lineJoin = "round";
  c.beginPath(); c.moveTo(P[0][0] * s, P[0][1] * s);
  if (L <= L1) c.lineTo(lerp(P[0][0], P[1][0], L / L1) * s, lerp(P[0][1], P[1][1], L / L1) * s);
  else { c.lineTo(P[1][0] * s, P[1][1] * s); c.lineTo(lerp(P[1][0], P[2][0], (L - L1) / L2) * s, lerp(P[1][1], P[2][1], (L - L1) / L2) * s); }
  c.stroke(); c.restore();
}
function tache(c: Ctx, x: number, y: number, s: number, k: number, color = ACENTO, g = 7) {
  if (k <= 0) return;
  c.save(); c.translate(x, y); c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round";
  const a = clamp(k * 2), b = clamp(k * 2 - 1);
  c.beginPath(); c.moveTo(-s, -s); c.lineTo(lerp(-s, s, a), lerp(-s, s, a)); c.stroke();
  if (b > 0) { c.beginPath(); c.moveTo(s, -s); c.lineTo(lerp(s, -s, b), lerp(-s, s, b)); c.stroke(); }
  c.restore();
}
/** Círculo a mano alzada que se dibuja solo. */
function circulo(c: Ctx, x: number, y: number, rx: number, ry: number, k: number, color = ACENTO, g = 6) {
  if (k <= 0) return;
  c.save(); c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round"; c.beginPath();
  const n = 60, fin = 1.12 * clamp(k);
  for (let i = 0; i <= n * fin; i++) { const u = i / n, a = -1.9 + u * TAU, r = 1 + .06 * Math.sin(u * 9) + .05 * u; const px = x + Math.cos(a) * rx * r, py = y + Math.sin(a) * ry * r; if (i) c.lineTo(px, py); else c.moveTo(px, py); }
  c.stroke(); c.restore();
}
/** Pluma de quien escribe, en pantalla: el punto llega ya transformado. */
function pluma(c: Ctx, x: number, y: number, t: number, alfa = 1, sc = 1) {
  if (alfa <= .01) return;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = alfa;
  c.translate(x, y - 3 + Math.sin(t * 38) * 4); c.rotate(.62); c.scale(sc, sc);
  c.fillStyle = TINTA; c.beginPath(); c.moveTo(0, 0); c.lineTo(-15, -58); c.quadraticCurveTo(-18, -80, -11, -94); c.lineTo(11, -94); c.quadraticCurveTo(18, -80, 15, -58); c.closePath(); c.fill();
  c.strokeStyle = PAPEL; c.lineWidth = 2.4; c.beginPath(); c.moveTo(0, -10); c.lineTo(0, -52); c.stroke(); c.fillStyle = PAPEL; c.beginPath(); c.arc(0, -56, 4, 0, TAU); c.fill();
  c.fillStyle = "#262625"; c.fillRect(-14, -420, 28, 324); c.fillStyle = ACENTO; c.fillRect(-14, -104, 28, 9);
  c.restore();
}
function aPantalla(c: Ctx, x: number, y: number): Pt { const m = c.getTransform(); return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f]; }
/** Una mano humana con manga de saco que entra por la izquierda y agarra algo en (x, y). */
function manoHumana(c: Ctx, x: number, y: number, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = TINTA; c.beginPath(); c.moveTo(-900, -40); c.lineTo(-58, -34); c.lineTo(-58, 40); c.lineTo(-900, 60); c.closePath(); c.fill();
  c.fillStyle = "#FFFFFF"; c.strokeStyle = TINTA; c.lineWidth = 3; c.fillRect(-66, -36, 14, 74); c.strokeRect(-66, -36, 14, 74);
  c.fillStyle = PIEL; c.lineWidth = 4; c.lineJoin = "round";
  c.beginPath(); c.moveTo(-54, -30); c.quadraticCurveTo(-10, -44, 18, -24); c.quadraticCurveTo(34, -6, 22, 14); c.quadraticCurveTo(6, 34, -54, 30); c.closePath(); c.fill(); c.stroke();
  c.lineWidth = 3; c.beginPath(); c.moveTo(4, -14); c.quadraticCurveTo(16, -4, 8, 8); c.moveTo(-10, -18); c.quadraticCurveTo(2, -6, -6, 10); c.stroke();
  c.restore();
}

// ---------- fondo ----------
function polvo(c: Ctx, t: number, K: Cam) {
  const r = azar(9), PX = 1600, PY = 2400;
  const fiesta = 1 - smooth(prog(K.y, 1500, 2200));
  for (let i = 0; i < 96; i++) {
    const wx0 = r() * PX, wy0 = r() * PY, v = 10 + r() * 30, f = r() * 6.3, z = 1.6 + r() * 3.2, al = .06 + r() * .16, conf = i % 6 === 0;
    const wx = wx0 + Math.sin(t * .5 + f) * 30, wy = wy0 - t * v;
    const dx = (((wx - K.x + PX / 2) % PX) + PX) % PX - PX / 2, dy = (((wy - K.y + PY / 2) % PY) + PY) % PY - PY / 2;
    const x = 540 + dx * K.z, y = 960 + dy * K.z;
    if (conf) {
      if (fiesta <= .01) continue;
      c.save(); c.translate(x, y); c.rotate(t * (1 + r()) + f); c.globalAlpha = .22 * fiesta; c.fillStyle = i % 12 === 0 ? ACENTO : TINTA; c.fillRect(-9, -4, 18, 8); c.restore();
    } else { c.globalAlpha = al; c.fillStyle = TINTA; c.fillRect(x, y, z, z); }
  }
  c.globalAlpha = 1;
}

// ================= ESTACIÓN A: la moneda =================
const A = { mesa: 1185, frente: 1330, canto: 1400, ag: { x: 320, y: 1130, r: 115 }, sello: { x: 590, y: 790, giro: -.07 } };
const RM = 85;                                        // radio de la moneda
function mesaA(c: Ctx) {
  c.fillStyle = CANTO; c.strokeStyle = TINTA; c.lineWidth = 3.5;
  for (const x of [80, 1000]) { c.beginPath(); c.rect(x, A.canto, 52, 900); c.fill(); c.stroke(); }
  c.fillStyle = MESA; c.beginPath(); c.moveTo(-500, A.mesa + tiembla(1) * 2); c.lineTo(1600, A.mesa + tiembla(2) * 2); c.lineTo(1600, A.frente); c.lineTo(-500, A.frente); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = CANTO; c.beginPath(); c.rect(-500, A.frente, 2100, A.canto - A.frente); c.fill(); c.stroke();
  c.save(); c.beginPath(); c.rect(-500, A.frente, 2100, A.canto - A.frente); c.clip();
  c.strokeStyle = "rgba(17,17,17,.25)"; c.lineWidth = 2.5; for (let x = -500; x < 1700; x += 24) { c.beginPath(); c.moveTo(x, A.frente - 6); c.lineTo(x - 70, A.canto + 6); c.stroke(); }
  c.restore();
  c.strokeStyle = "rgba(17,17,17,.08)"; c.lineWidth = 2;
  for (let i = 0; i < 4; i++) { const y = lerp(A.mesa + 30, A.frente - 22, i / 3); c.beginPath(); c.moveTo(-500, y); for (let x = -500; x <= 1600; x += 100) c.lineTo(x, y + 5 * Math.sin(x * .01 + i * 2)); c.stroke(); }
}
/** Dónde está la moneda de la estación A en cada instante. */
function monedaA(t: number): { x: number; y: number; a: number; alto: number; cara?: number; enMano?: boolean; s?: number } {
  const REP: Pt = [E.v1.x1, E.v1.y1], MANO: Pt = [E.v1.x0, E.v1.y0];
  if (t < E.v2.t0 && t >= E.recoge) {
    // salta de la mesa a la mano, volteándose de frente
    const u = ease.inOutCubic(prog(t, E.recoge, E.recoge + .42));
    return { x: lerp(REP[0], MANO[0], u), y: lerp(REP[1], MANO[1], u) - Math.sin(Math.PI * u) * 150, a: lerp(AF(1), 0, u) + Math.sin(Math.PI * u) * Math.PI * 2, alto: 120 * Math.sin(Math.PI * u), enMano: u >= 1 };
  }
  for (const F of [E.v3, E.v2, E.v1]) {
    const m = estadoVuelo(F, t); if (!m) continue;
    return { x: m.x, y: m.y, a: m.a, alto: Math.max(0, m.alto), cara: m.aire ? undefined : F.cara, s: m.s };
  }
  return { x: MANO[0], y: MANO[1], a: 0, alto: 0, enMano: true };
}
function agenteA(c: Ctx, t: number, M: ReturnType<typeof monedaA>) {
  const { x: X, y: Y, r: R } = A.ag, q = R / 95;
  let bx = X + 3 * vaiven(t, 1.7), by = Y + 4 * vaiven(t, 1.1);
  let m1: Pt = [X - 150 * q, Y + 30 * q + 10 * vaiven(t, 1.3)], m2: Pt = [X + 150 * q, Y - 110 * q], ab1 = .6, ab2 = .6;
  // el tirón del pulgar: lanza
  for (const L of [E.v1.t0, E.v2.t0]) {
    const d = t - L; if (d < -.35 || d > .7) continue;
    const arma = d < 0 ? smooth(prog(d, -.35, -.05)) : 0, suelta = d >= 0 ? Math.exp(-d * 5) : 0;
    m2 = [E.v1.x0 + 10 - 30 * arma + 30 * suelta, E.v1.y0 + 40 + 30 * arma - 80 * suelta]; ab2 = .2 + .8 * suelta;
  }
  if (M.enMano && t > E.v1.t0 + .3) { m2 = [M.x - 6, M.y + RM * .55]; ab2 = .25; }
  // mientras la moneda vuela: las dos manos arriba, mirando
  const vuela = (F: Vuelo) => ventana(t, F.t0 + .15, F.tl - .25, .3, .35);
  const mira = Math.max(vuela(E.v1), vuela(E.v2));
  if (mira > 0) { m1 = [lerp(m1[0], X - 125 * q, mira), lerp(m1[1], Y - 200 * q, mira)]; m2 = [lerp(m2[0], X + 135 * q, mira), lerp(m2[1], Y - 210 * q, mira)]; ab1 = lerp(ab1, 1, mira); ab2 = lerp(ab2, 1, mira); }
  // se asoma a la moneda caída y la señala
  const asoma = ventana(t, E.v1.tl + .2, E.sello - .7, .5, .4) + ventana(t, E.v2.tl + .4, E.golpea - .55, .4, .2);
  if (asoma > 0) { bx += 22 * asoma; m2 = [lerp(m2[0], E.v1.x1 - 70, asoma), lerp(m2[1], E.v1.y1 - 50, asoma)]; ab2 = lerp(ab2, .15, asoma); }
  // alcanza la moneda para el segundo lanzamiento
  const alcanza = ventana(t, E.recoge - .35, E.recoge, .3, .1);
  if (alcanza > 0) { m2 = [lerp(m2[0], E.v1.x1 - 50, alcanza), lerp(m2[1], E.v1.y1 - 20, alcanza)]; ab2 = lerp(ab2, .9, alcanza); }
  // "no lo sabes": se encoge de hombros
  const encoge = ventana(t, E.nolo - .05, E.panB - .3, .2, .4);
  if (encoge > 0) { const h = 18 * pulso(t, E.nolo, .45); by -= h; m1 = [lerp(m1[0], X - 175 * q, encoge), lerp(m1[1], Y - 120 * q, encoge)]; m2 = [lerp(m2[0], X + 175 * q, encoge), lerp(m2[1], Y - 120 * q, encoge)]; ab1 = lerp(ab1, 1, encoge); ab2 = lerp(ab2, 1, encoge); }
  // el manotazo a la mesa
  const sube = smooth(prog(t, E.golpea - .45, E.golpea - .12)), baja = ease.inCubic(prog(t, E.golpea - .12, E.golpea)), queda = 1 - smooth(prog(t, E.golpea + .2, E.golpea + .7));
  if (t > E.golpea - .45 && t < E.golpea + .7) {
    const top: Pt = [540, 930], mesa: Pt = [540, A.mesa + 10];
    m2 = t < E.golpea ? [lerp(top[0], mesa[0], baja), lerp(lerp(m2[1], top[1], sube), mesa[1], baja)] : [lerp(m2[0], mesa[0], queda), lerp(m2[1], mesa[1], queda)];
    ab2 = 1;
  }
  // cae sol: las manos a la cabeza
  const ups = ventana(t, E.v3.tl + .05, E.bajaE + .4, .25, .3);
  if (ups > 0) { m1 = [lerp(m1[0], X - 80 * q, ups), lerp(m1[1], Y - 150 * q, ups)]; m2 = [lerp(m2[0], X + 80 * q, ups), lerp(m2[1], Y - 150 * q, ups)]; ab1 = lerp(ab1, .9, ups); ab2 = lerp(ab2, .9, ups); by += 6 * ups; }
  // salta al soltar la moneda
  by -= 30 * pulso(t, E.v1.t0 + .02, .34) + 26 * pulso(t, E.v2.t0, .34);
  agente(c, bx, by, R, m1, m2, { abre1: ab1, abre2: ab2, piso: A.mesa + 62, sombra: .3 });
}
function sello(c: Ctx, t: number) {
  const { x, y, giro } = A.sello;
  // la marca de tinta queda en la pared
  if (t >= E.sello) {
    const k = 1 + .05 * Math.exp(-(t - E.sello) * 14);
    c.save(); c.translate(x, y); c.rotate(giro); c.scale(k, k); c.globalAlpha = .9;
    c.strokeStyle = ACENTO; c.lineWidth = 10; c.beginPath(); c.roundRect(-290, -88, 580, 176, 18); c.stroke();
    c.lineWidth = 3.5; c.beginPath(); c.roundRect(-272, -70, 544, 140, 11); c.stroke();
    palomita(c, -226, 2, 36, 1, ACENTO, 13);
    tx(c, "FUNCIONA", 62, 30, { fuente: mono(82), color: ACENTO, esp: 3 });
    // poros del sello: el papel se asoma
    const r = azar(5); c.fillStyle = PAPEL;
    for (let i = 0; i < 120; i++) { c.globalAlpha = .5 + r() * .5; const s = 2 + r() * 6; c.fillRect(-280 + r() * 560, -82 + r() * 164, s, s * .7); }
    c.restore();
  }
  // el sello de goma que baja y se va
  const baja = ease.inCubic(prog(t, E.sello - .3, E.sello)), sube = ease.inCubic(prog(t, E.sello + .16, E.sello + .55));
  if (t > E.sello - .3 && sube < 1) {
    const dy = -1300 * (1 - baja) - 1500 * sube + (t > E.sello && t < E.sello + .16 ? 6 : 0);
    c.save(); c.translate(x, y + dy); c.rotate(giro);
    c.fillStyle = ACENTO; c.fillRect(-296, -14, 592, 24);
    c.fillStyle = "#7A5236"; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.roundRect(-310, -100, 620, 90, 12); c.fill(); c.stroke();
    c.fillStyle = "#9C6C48"; c.fillRect(-300, -94, 600, 15);
    c.fillStyle = "#6A452C"; c.beginPath(); c.moveTo(-44, -100); c.lineTo(-34, -250); c.lineTo(34, -250); c.lineTo(44, -100); c.closePath(); c.fill(); c.stroke();
    const g = c.createRadialGradient(-24, -318, 6, 0, -302, 76); g.addColorStop(0, "#B07A50"); g.addColorStop(1, "#5A3A24");
    c.fillStyle = g; c.beginPath(); c.arc(0, -304, 70, 0, TAU); c.fill(); c.stroke();
    c.restore();
  }
}
function estacionA(c: Ctx, t: number) {
  mesaA(c);
  sello(c, t);
  const M = monedaA(t);
  if (!M.enMano) sombraMoneda(c, M.x, E.v1.y1, RM, M.alto);
  agenteA(c, t, M);
  moneda(c, M.x, M.y, RM * (M.s ?? 1), M.a, M.cara);
  // la etiqueta del sol, cuando la conclusión se cae
  const aS = ventana(t, E.v3.tl + .1, E.bajaE + .5, .2, .3);
  if (aS > 0) { const k = ease.outBack(clamp((t - E.v3.tl - .1) / .25), 2); c.save(); c.translate(M.x + 190, M.y + 20); c.rotate(-.05); c.scale(k, k); tx(c, "sol", 0, 0, { fuente: serif(110, true), color: ACENTO, alfa: aS }); c.restore(); }
  if (t > E.v3.tl - .02 && t < E.v3.tl + .9) circulo(c, M.x, M.y + 4, 150, 82, prog(t, E.v3.tl + .05, E.v3.tl + .45), ACENTO, 6);
}

// ================= ESTACIÓN B: programa contra agente =================
const B = { calc: { x: 96, y: 470, w: 270, h: 400 }, tickets: [480, 670, 860], yT: 670, ag: { x: 225, y: 1350, r: 104 }, cartas: [490, 680, 870], yC: 1335 };
const VARIANTES_B: Fiesta[] = [{ pastel: 1, globos: 3, invitados: 3 }, { pastel: 0, globos: 2, invitados: 3 }, { pastel: 2, globos: 1, invitados: 2, mama: 1 }];
function estacionB(c: Ctx, t: number) {
  tx(c, "programa", 96, 405, { fuente: serif(112), color: TINTA, alin: "left" });
  tx(c, "agente", 96, 1050, { fuente: serif(112), color: TINTA, alin: "left" });
  // calculadora
  const { x, y, w, h } = B.calc;
  c.fillStyle = "rgba(20,18,14,.12)"; c.beginPath(); c.roundRect(x + 12, y + 14, w, h, 26); c.fill();
  c.fillStyle = HOJA; c.strokeStyle = TINTA; c.lineWidth = 5.5; c.beginPath(); c.roundRect(x + tiembla(1) * 2, y + tiembla(2) * 2, w, h, 26); c.fill(); c.stroke();
  c.fillStyle = NOCHE; c.beginPath(); c.roundRect(x + 22, y + 26, w - 44, 96, 12); c.fill();
  tx(c, "2+2", x + w - 40, y + 98, { fuente: mono(64), color: LUZ, alin: "right" });
  const pres = (i: number) => E.teclas.reduce((a, tt) => a + pulso(t, tt - .02, .16), 0) * (i === 8 ? 1 : 0);
  for (let i = 0; i < 9; i++) {
    const cx = x + 30 + (i % 3) * 74, cy = y + 150 + Math.floor(i / 3) * 74, d = pres(i) * 6;
    c.fillStyle = i === 8 ? ACENTO : "#FFFFFF"; c.strokeStyle = TINTA; c.lineWidth = 3.5;
    c.beginPath(); c.roundRect(cx, cy + d, 62, 58, 9); c.fill(); c.stroke();
    if (i === 8) tx(c, "=", cx + 31, cy + d + 44, { fuente: mono(44), color: "#FFFFFF" });
  }
  c.fillStyle = NOCHE; c.fillRect(x + w - 7, B.yT - 100, 14, 200);
  // los boletos: siempre 4
  E.teclas.forEach((tt, i) => {
    const u = ease.outBack(prog(t, tt + .04, tt + .42), 1.3); if (u <= 0) return;
    const bx = lerp(x + w - 60, B.tickets[i], u), giro = (i - 1) * .04 + .02 * vaiven(t, 2.3, i);
    c.save(); c.beginPath(); c.rect(x + w, 0, 1200, 2000); c.clip();
    hojaPapel(c, bx, B.yT + 3 * vaiven(t, 1.9, i), 150, 220, giro);
    tx(c, "4", bx, B.yT + 52, { fuente: mono(150), color: TINTA });
    c.restore();
  });
  const aI = smooth(prog(t, E.igual, E.igual + .2));
  if (aI > 0) for (const xx of [575, 765]) tx(c, "=", xx, B.yT + 22, { fuente: mono(58), color: TINTA, alfa: aI });
  // el agente y su encargo
  const { x: ax, y: ay, r } = B.ag;
  const lanza = E.salidas.reduce((a, tt) => a + pulso(t, tt - .12, .3), 0);
  const by = ay - 12 * Math.abs(Math.sin(t * 2.4)) - 16 * lanza;
  const ny = by - 175 + 6 * vaiven(t, 1.6);
  hojaPapel(c, ax - 95, ny, 170, 92, -.12);
  tx(c, "fiesta", ax - 95, ny + 16, { fuente: serif(58, true), color: TINTA });
  agente(c, ax, by, r, [ax - 120, by - 120], [ax + 150 + 30 * lanza, by - 60 - 40 * lanza], { abre1: .3, abre2: .5 + .5 * lanza, piso: ay + r + 4, sombra: .28 });
  E.salidas.forEach((tt, i) => {
    const u = ease.outCubic(prog(t, tt, tt + .32)); if (u <= 0) return;
    const cx = lerp(ax + 160, B.cartas[i], u), cy = lerp(by - 70, B.yC, u) - Math.sin(Math.PI * u) * 140, sc = lerp(.3, 1, ease.outBack(clamp(u), 1.6));
    c.save(); c.translate(cx, cy + 4 * vaiven(t, 2.1, i)); c.rotate((i - 1) * .05 + (1 - u) * 1.2); c.scale(sc, sc);
    hojaPapel(c, 0, 0, 176, 236, 0);
    c.translate(-4, 34); c.scale(.98, .98); fiestita(c, { ...VARIANTES_B[i], mama: VARIANTES_B[i].mama ? clamp((t - tt - .3) / .3) : undefined }, t, 1, i);
    c.restore();
  });
  const tD = Math.max(E.distinto, E.salidas[2] + .25), aD = smooth(prog(t, tD, tD + .2));
  if (aD > 0) for (const xx of [585, 775]) {
    c.save(); c.translate(xx, B.yC - 168); c.scale(lerp(1.6, 1, ease.outBack(aD)), lerp(1.6, 1, ease.outBack(aD))); c.globalAlpha = aD;
    c.fillStyle = ACENTO; c.beginPath(); c.arc(0, 0, 36, 0, TAU); c.fill(); tx(c, "≠", 0, 21, { fuente: mono(60), color: "#FFFFFF" }); c.restore();
  }
}

// ================= ESTACIÓN C: lunes y martes =================
const C = { mesa: 1150, piso: 1460, mx0: 380, mx1: 740, pastel: 560, globos: 395, invitados: 822, ag: { x: 210, y: 1360, r: 100 } };
function calendario(c: Ctx, t: number) {
  const x0 = 160, x1 = 500, y0 = 310, y1 = 610;
  c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.moveTo(195, 285); c.lineTo(330, 222); c.lineTo(465, 285); c.stroke();
  c.fillStyle = TINTA; c.beginPath(); c.arc(330, 220, 9, 0, TAU); c.fill();
  // hojas de atrás: el grueso del bloc
  for (let i = 3; i >= 1; i--) { c.fillStyle = i % 2 ? "#F1EEE6" : HOJA; c.strokeStyle = "rgba(17,17,17,.5)"; c.lineWidth = 2; c.fillRect(x0 + i * 3, y0 + i * 5, x1 - x0, y1 - y0); c.strokeRect(x0 + i * 3, y0 + i * 5, x1 - x0, y1 - y0); }
  const pagina = (dia: string, tag: string, check: number) => {
    c.fillStyle = HOJA; c.strokeStyle = TINTA; c.lineWidth = 3.5; c.beginPath(); c.rect(x0, y0, x1 - x0, y1 - y0); c.fill(); c.stroke();
    c.fillStyle = ACENTO; c.fillRect(x0, y0, x1 - x0, 62);
    tx(c, tag, (x0 + x1) / 2, y0 + 46, { fuente: mono(40), color: "#FFFFFF", esp: 4 });
    tx(c, dia, (x0 + x1) / 2, y0 + 210, { fuente: serif(124, true), color: TINTA });
    palomita(c, 400, 540, 46, check, ACENTO, 11);
  };
  pagina("martes", "MAÑANA", 0);
  // la hoja del lunes: se arranca y cae girando
  const u = prog(t, E.arranca, E.arranca + .75);
  if (u < 1) {
    c.save();
    if (u > 0) { c.translate(x1, y0); c.rotate(ease.inCubic(u) * 1.1 + u * .3); c.translate(-x1 + u * -60, -y0 + 1200 * u * u); c.globalAlpha = 1 - smooth(prog(u, .7, 1)); }
    pagina("lunes", "HOY", prog(t, E.perfecta, E.perfecta + .3));
    c.restore();
  }
  // la anilla
  c.fillStyle = TINTA; c.beginPath(); c.roundRect(x0 - 8, y0 - 26, x1 - x0 + 16, 30, 6); c.fill();
}
function notaC(c: Ctx, t: number) {
  const { x, y, w, h, giro } = NOTA;
  const meneo = .06 * Math.sin((t - E.encargo) * 22) * Math.exp(-Math.max(0, t - E.encargo) * 4) * (t > E.encargo ? 1 : 0);
  c.save(); c.translate(x, y); c.rotate(giro + meneo + .006 * vaiven(t, 3.1));
  hojaPapel(c, 0, 0, w, h, 0, HOJA, 3);
  const L = (s: string, yy: number, it: boolean, col = TINTA) => tx(c, s, -104, yy, { fuente: serif(34, it), color: col, alin: "left" });
  L("Fiesta sorpresa", -76, true); L("para mamá.", -36, true); L("Avisa a tus", 22, false); L("invitados.", 62, false);
  // la palabra cambiada
  c.font = serif(34); const wI = c.measureText("invitados.").width;
  const kT = ease.inOutCubic(prog(t, E.tacha, E.tacha + .35));
  if (kT > 0) { c.strokeStyle = ACENTO; c.lineWidth = 4.5; c.lineCap = "round"; c.beginPath(); c.moveTo(-108, 51); c.lineTo(-108 + (wI + 10) * kT, 49); c.stroke(); }
  const kE = prog(t, E.escribe[0], E.escribe[1]);
  let punta: Pt | null = null;
  if (kT > 0 && kT < 1) punta = [-108 + (wI + 10) * kT, 50];
  if (kE > 0) {
    c.font = serif(36, true); const wC = c.measureText("contactos.").width;
    c.save(); c.beginPath(); c.rect(-110, 74, (wC + 6) * kE + 2, 50); c.clip();
    tx(c, "contactos.", -104, 108, { fuente: serif(36, true), color: ACENTO, alin: "left" }); c.restore();
    if (kE < 1) punta = [-104 + wC * kE, 104];
  }
  // la chinche
  const g = c.createRadialGradient(-6, -h / 2 + 4, 2, 0, -h / 2 + 10, 20); g.addColorStop(0, "#E9896C"); g.addColorStop(1, "#7E2413");
  c.fillStyle = g; c.beginPath(); c.arc(0, -h / 2 + 12, 16, 0, TAU); c.fill();
  const P = punta ? aPantalla(c, punta[0], punta[1]) : null;
  c.restore();
  return P;
}
function mesaC(c: Ctx, t: number, borra: number) {
  const { mesa, piso, mx0, mx1 } = C;
  c.strokeStyle = "rgba(17,17,17,.3)"; c.lineWidth = 3; c.beginPath(); c.moveTo(-200, piso); c.lineTo(1300, piso); c.stroke();
  c.fillStyle = CANTO; c.strokeStyle = TINTA; c.lineWidth = 3.5;
  for (const x of [mx0 + 24, mx1 - 54]) { c.beginPath(); c.rect(x, mesa + 120, 30, piso - mesa - 120); c.fill(); c.stroke(); }
  c.fillStyle = MESA; c.beginPath(); c.rect(mx0 - 20, mesa - 16 + tiembla(3), mx1 - mx0 + 40, 18); c.fill(); c.stroke();
  // mantel con festón
  c.fillStyle = HOJA; c.beginPath(); c.moveTo(mx0 - 20, mesa + 2); c.lineTo(mx1 + 20, mesa + 2); c.lineTo(mx1 + 20, mesa + 100);
  for (let i = 10; i >= 0; i--) { const xx = lerp(mx0 - 20, mx1 + 20, i / 10); c.quadraticCurveTo(xx + 20, mesa + 132, xx, mesa + 100); }
  c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = ACENTO; c.lineWidth = 3; c.beginPath(); c.moveTo(mx0 - 20, mesa + 30); c.lineTo(mx1 + 20, mesa + 30); c.stroke();
  void borra;
}
function estacionC(c: Ctx, t: number) {
  const zoom = smooth(prog(t, E.zoomD, E.zoomD + .5)) * (1 - smooth(prog(t, E.panA, E.panA + .4)));
  calendario(c, t);
  guirnalda(c, 120, 960, 748, 46, t, 9, smoothstepIn(t, E.items[1]) * (1 - zoom));
  mesaC(c, t, zoom);
  // qué hay en la fiesta: aparece el lunes, se borra al arrancar la hoja, vuelve el martes (sin pastel)
  const ciclo = (i: number) => {
    const a = ease.outBack(prog(t, E.items[i] - .02, E.items[i] + .3), 1.8), b = 1 - ease.inCubic(prog(t, E.arranca + .05 + i * .05, E.arranca + .3 + i * .05)), v = ease.outBack(prog(t, E.vuelven[i], E.vuelven[i] + .3), 1.8);
    return t < E.arranca + .05 ? a : t < E.vuelven[i] ? b : v;
  };
  c.save(); c.globalAlpha = 1 - zoom;
  const kG = ciclo(0);
  if (kG > 0) { c.save(); c.translate(C.globos, C.mesa - 6); c.scale(1.02 * kG, 1.02 * kG); globos(c, 3, t); c.restore(); }
  const kP = t < E.arranca + .05 ? ease.outBack(prog(t, E.pastel, E.pastel + .3), 1.6) : 1 - ease.inCubic(prog(t, E.arranca + .05, E.arranca + .3));
  if (kP > 0) { const cae = (1 - ease.outCubic(prog(t, E.pastel, E.pastel + .22))) * -260; c.save(); c.translate(C.pastel, C.mesa - 14 + cae); c.scale(1.2 * Math.min(1, kP + .3), 1.2 * kP); pastel(c, t); c.restore(); }
  const kI = ciclo(2);
  if (kI > 0) { c.save(); c.translate(C.invitados, C.piso); c.scale(1.3 * kI, 1.3 * kI); for (const xx of [-50, 0, 50]) invitado(c, xx); c.restore(); }
  // el hueco del pastel, el martes
  const aF = smooth(prog(t, E.olvida, E.olvida + .3));
  if (aF > 0) {
    c.save(); c.translate(C.pastel, C.mesa - 14); c.scale(1.2, 1.2); pastelFantasma(c, t, aF); c.restore();
    circulo(c, C.pastel, C.mesa - 100, 150, 130, prog(t, E.falta - .05, E.falta + .4), ACENTO, 7);
    const q = smooth(prog(t, E.falta, E.falta + .25));
    if (q > 0) tx(c, "¿y el pastel?", 540, 694, { fuente: serif(104, true), color: ACENTO, alfa: q });
  }
  // la bola: ¡ta-da!, los dos días
  const { x, y, r } = C.ag;
  const td = Math.max(ventana(t, E.tada[0] - .05, E.arranca - .2, .2, .3), ventana(t, E.tada[1] - .05, E.zoomD, .2, .3));
  const brinco = 30 * (pulso(t, E.tada[0] - .05, .4) + pulso(t, E.tada[1] - .05, .4));
  const by = y - brinco + 4 * vaiven(t, 1.2);
  agente(c, x, by, r, [lerp(x - 130, x - 150, td), lerp(by + 20, by - 170, td)], [lerp(x + 140, x + 160, td), lerp(by + 10, by - 180, td)], { abre1: lerp(.4, 1, td), abre2: lerp(.4, 1, td), piso: C.piso, sombra: .3 });
  c.restore();
  return notaC(c, t);
}
function smoothstepIn(t: number, a: number) { return smooth(prog(t, a - .05, a + .4)); }

/** Las cuatro fiestas que salen con la palabra nueva: una mejora, tres le avisan a mamá. Se dibujan en
 *  unidades de pantalla bajo la nota, porque la cámara está a 2.8× sobre ella. */
function cartasD(c: Ctx, t: number) {
  if (t < E.cartas || t > E.panA + .8) return;
  const Z = 2.8, cx = NOTA.x, cy = NOTA.y + 150;
  const pos: Pt[] = [[352, 1135], [728, 1135], [352, 1425], [728, 1425]];
  const V: Fiesta[] = [{ pastel: 1, globos: 2, invitados: 2 }, { pastel: 1, globos: 3, invitados: 3 }, { pastel: 2, globos: 1, invitados: 3 }, { pastel: 1, globos: 2, invitados: 2 }];
  pos.forEach(([sx, sy], i) => {
    const u = ease.outBack(prog(t, E.cartas + i * .08, E.cartas + i * .08 + .4), 1.4); if (u <= 0) return;
    c.save(); c.translate(cx + (sx - 540) / Z, cy + (sy - 960) / Z - (1 - u) * 160 / Z); c.scale(1 / Z, 1 / Z); c.rotate((i % 2 ? .02 : -.025) + .01 * vaiven(t, 2.3, i));
    c.scale(clamp(u * 1.2), clamp(u * 1.2));
    hojaPapel(c, 0, 0, 360, 272, 0);
    const rompe = i > 0 ? clamp((t - E.rompe[i - 1]) / .3) : 0, mejora = i === 0 ? clamp((t - E.mejora) / .3) : 0;
    c.save(); c.translate(-20, 30); c.scale(1.66, 1.66);
    fiestita(c, { ...V[i], extra: i === 0 && t > E.mejora ? mejora : 0, mama: i > 0 && t > E.rompe[i - 1] ? rompe : undefined, agente: true }, t, 1, i);
    c.restore();
    if (i === 0 && mejora > 0) { const k = ease.outBack(mejora, 2); c.save(); c.translate(140, -94); c.scale(k, k); c.fillStyle = "#FFFFFF"; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, 38, 0, TAU); c.fill(); c.stroke(); palomita(c, 2, 3, 17, 1, TINTA, 8); c.restore(); }
    if (i > 0 && rompe > 0) { const k = ease.outBack(rompe, 2); c.save(); c.translate(140, -94); c.scale(k, k); c.fillStyle = ACENTO; c.beginPath(); c.arc(0, 0, 38, 0, TAU); c.fill(); tache(c, 0, 0, 14, 1, "#FFFFFF", 8); c.restore(); }
    c.restore();
  });
}

// ================= ESTACIÓN E: la máquina de exámenes =================
const M = { x0: 140, x1: 940, y0: 380, y1: 1450, dx0: 210, dx1: 870, dy0: 420, dy1: 560, wx0: 200, wx1: 880, wy0: 600, wy1: 1250, piv: [140, 950] as Pt };
const COLS = 4, FILAS = 5, TW = (M.wx1 - M.wx0) / COLS, TH = (M.wy1 - M.wy0) / FILAS;
const centroMesita = (i: number): Pt => [M.wx0 + TW * (i % COLS + .5), M.wy0 + TH * (Math.floor(i / COLS) + .5)];
function variante(i: number, corrida: number): Fiesta {
  const r = azar(1000 + i * 37 + corrida * 911);
  return { pastel: r() < .55 ? 1 : 2, globos: 1 + Math.floor(r() * 3), invitados: 2 + Math.floor(r() * 2), agente: true };
}
function corridaEn(t: number, i: number) {
  // cuántas corridas ya alcanzaron a esta mesita (la ola avanza de mesita en mesita)
  let n = 0;
  E.corridas.forEach((tt) => { if (t > tt + i * .018) n++; });
  return n;
}
function palanca(c: Ctx, t: number) {
  const tirar = (a: number) => ease.inOutCubic(prog(t, a, a + .25)) * (1 - ease.inOutCubic(prog(t, a + .5, a + .85)));
  const k = Math.max(tirar(E.palanca), tirar(E.palanca2));
  const th = lerp(-2.2, -4.08, k), L = 190, [px, py] = M.piv;
  const kx = px + Math.cos(th) * L, ky = py + Math.sin(th) * L;
  c.strokeStyle = TINTA; c.lineWidth = 16; c.lineCap = "round"; c.beginPath(); c.moveTo(px, py); c.lineTo(kx, ky); c.stroke();
  c.fillStyle = "#3a3a38"; c.beginPath(); c.arc(px, py, 22, 0, TAU); c.fill();
  bola(c, kx, ky, 30, ACENTO);
  // la mano que tira
  const mano = (a: number) => ventana(t, a - .35, a + .55, .3, .3);
  const hm = Math.max(mano(E.palanca), mano(E.palanca2));
  if (hm > 0) manoHumana(c, lerp(kx - 600, kx + 10, ease.outCubic(hm)), ky + 10, 1.6);
}
function textoPantalla(t: number): string {
  if (t >= E.palanca2 + .3) return "   de 20";
  if (t >= E.numero + .2) { const n = E.cuenta.filter((x) => t >= x).length; return `${n} de 20`; }
  if (t >= E.preguntas[2]) return "¿avisó a mamá?";
  if (t >= E.preguntas[1]) return "¿invitó a todos?";
  if (t >= E.preguntas[0]) return "¿presupuesto?";
  if (t >= E.zoomF) return "20 fiestas";
  if (t >= E.corridas[0]) return `corrida ${corridaEn(t, 0)} de 5`;
  if (t >= E.rubrica) return "3 casillas";
  if (t >= E.lista) return "20 encargos";
  return Math.floor(t * 2) % 2 ? "_" : " ";
}
/** Dos cifras que ruedan como tragamonedas: se está midiendo otra vez. */
function rodillo(c: Ctx, t: number, x0: number, yc: number, px: number) {
  c.save(); c.beginPath(); c.rect(x0 - 10, yc - px * .62, px * 1.3, px * 1.24); c.clip();
  for (let d = 0; d < 2; d++) {
    // decenas: solo 0 y 1 (nunca más de 20); unidades: giran rápido
    const v = (t - E.palanca2) * (d ? 23 : 7) + d * 3.3, n = Math.floor(v), f = v - n, base = d ? 10 : 2;
    for (let k = -1; k <= 1; k++) tx(c, String(((n + k) % base + base) % base), x0 + d * px * .6 + px * .3, yc + px * .36 + (k - f) * px * 1.05 * -1, { fuente: mono(px), color: "#E9896C" });
  }
  c.restore();
}
function iconoRubrica(c: Ctx, j: number, x: number, y: number, s: number) {
  c.save(); c.translate(x, y); c.scale(s, s); c.strokeStyle = TINTA; c.lineWidth = 4; c.fillStyle = "#FFFFFF";
  if (j === 0) { c.beginPath(); c.roundRect(-34, -22, 68, 44, 6); c.fill(); c.stroke(); tx(c, "$", 0, 13, { fuente: serif(40), color: TINTA }); }
  else if (j === 1) { c.scale(.36, .36); for (const xx of [-40, 0, 40]) invitado(c, xx); }
  else { c.scale(.34, .34); c.translate(0, 60); telefono(c, 0, 0); }
  c.restore();
}
function maquina(c: Ctx, t: number) {
  // cae del cielo y aplasta tantito al llegar
  const tc = .34, a = t - (E.maquina - tc);
  if (a < 0) return;
  const dy = a < tc ? -1600 * (1 - (a / tc) ** 2) : 0, u = a - tc;
  const sq = u > 0 ? .07 * Math.exp(-u * 7) * Math.cos(u * 26) : 0;
  c.save(); c.translate(540, M.y1 + 40 + dy); c.scale(1 + sq * .6, 1 - sq); c.translate(-540, -(M.y1 + 40));
  sombra(c, 540, M.y1 + 44, 520, .3);
  // patas
  c.fillStyle = TINTA; for (const x of [230, 850]) { c.beginPath(); c.roundRect(x - 34, M.y1 - 10, 68, 50, 8); c.fill(); }
  // tolva de encargos, arriba a la izquierda
  c.fillStyle = HOJA; c.strokeStyle = TINTA; c.lineWidth = 5;
  c.beginPath(); c.moveTo(180, 250); c.lineTo(400, 250); c.lineTo(320, M.y0 + 4); c.lineTo(260, M.y0 + 4); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = NOCHE; c.beginPath(); c.ellipse(290, 252, 110, 14, 0, 0, TAU); c.fill();
  // gabinete
  c.fillStyle = "rgba(20,18,14,.1)"; c.beginPath(); c.roundRect(M.x0 + 12, M.y0 + 14, M.x1 - M.x0, M.y1 - M.y0, 36); c.fill();
  c.fillStyle = HOJA; c.strokeStyle = TINTA; c.lineWidth = 6;
  c.beginPath(); c.roundRect(M.x0 + tiembla(11) * 2, M.y0 + tiembla(12) * 2, M.x1 - M.x0, M.y1 - M.y0, 36); c.fill(); c.stroke();
  // remaches
  c.fillStyle = TINTA; for (const [x, y] of [[170, 410], [910, 410], [170, 1420], [910, 1420]]) { c.beginPath(); c.arc(x, y, 6, 0, TAU); c.fill(); }
  // pantalla
  c.fillStyle = NOCHE; c.beginPath(); c.roundRect(M.dx0, M.dy0, M.dx1 - M.dx0, M.dy1 - M.dy0, 18); c.fill();
  const s = textoPantalla(t), grande = t >= E.numero + .2;
  c.font = mono(grande ? 96 : 62); const wS = c.measureText(s).width, px = (grande ? 96 : 62) * Math.min(1, 600 / wS);
  const late = t >= E.diecisiete && t < E.palanca2 ? 1 + .06 * Math.exp(-(t - E.diecisiete) * 6) : 1;
  c.save(); c.translate(540, (M.dy0 + M.dy1) / 2 + px * .36); c.scale(late, late);
  tx(c, s, 0, 0, { fuente: mono(px), color: s.startsWith("17") ? "#E9896C" : LUZ }); c.restore();
  if (t >= E.palanca2 + .3) rodillo(c, t, 540 - wS * px / (grande ? 96 : 62) / 2, (M.dy0 + M.dy1) / 2, px);
  // ventana con las veinte mesitas
  c.fillStyle = "rgba(190,205,205,.16)"; c.strokeStyle = TINTA; c.lineWidth = 5;
  c.beginPath(); c.roundRect(M.wx0, M.wy0, M.wx1 - M.wx0, M.wy1 - M.wy0, 12); c.fill(); c.stroke();
  mesitas(c, t);
  c.strokeStyle = "rgba(17,17,17,.35)"; c.lineWidth = 2;
  for (let i = 1; i < COLS; i++) { c.beginPath(); c.moveTo(M.wx0 + i * TW, M.wy0); c.lineTo(M.wx0 + i * TW, M.wy1); c.stroke(); }
  for (let j = 1; j < FILAS; j++) { c.beginPath(); c.moveTo(M.wx0, M.wy0 + j * TH); c.lineTo(M.wx1, M.wy0 + j * TH); c.stroke(); }
  // reflejo del vidrio
  const g = c.createLinearGradient(M.wx0, M.wy0, M.wx0 + 260, M.wy0 + 260); g.addColorStop(0, "rgba(255,255,255,.35)"); g.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = g; c.beginPath(); c.moveTo(M.wx0 + 10, M.wy0 + 10); c.lineTo(M.wx0 + 200, M.wy0 + 10); c.lineTo(M.wx0 + 10, M.wy0 + 200); c.closePath(); c.fill();
  // la rúbrica: tres casillas
  const kR = ease.outCubic(prog(t, E.rubrica, E.rubrica + .35));
  c.save(); c.beginPath(); c.rect(M.x0 + 6, 1270, M.x1 - M.x0 - 12, 150); c.clip();
  c.translate((1 - kR) * -800, 0);
  hojaPapel(c, 540, 1340, 640, 110, 0, HOJA, 4);
  for (let j = 0; j < 3; j++) {
    const k = ease.outBack(prog(t, E.iconos[j], E.iconos[j] + .3), 2), x = 330 + j * 210;
    if (k <= 0) continue;
    iconoRubrica(c, j, x - 34, 1352, k);
    c.strokeStyle = TINTA; c.lineWidth = 4; c.strokeRect(x + 22, 1322, 40, 40);
    palomita(c, x + 42, 1342, 13, prog(t, E.iconos[j] + .15, E.iconos[j] + .35), TINTA, 6);
  }
  c.restore();
  // las instrucciones, enchufadas arriba a la derecha, con su candado
  instrucciones(c, t);
  palanca(c, t);
  c.restore();
  // los encargos caen a la tolva
  E.cartasCaen.forEach((tt, i) => {
    const u = prog(t, tt, tt + .32); if (u <= 0 || u >= 1) return;
    const x = 290 + (i % 5 - 2) * 18 + Math.sin(i * 7) * 20, y = lerp(-260, 300, u * u), r = azar(i + 50);
    c.save(); c.beginPath(); c.rect(-200, -2000, 1600, 2256); c.clip();
    c.translate(x, y); c.rotate((r() - .5) * 1.4 + u * 2 * (r() - .5));
    c.fillStyle = "#FFFFFF"; c.strokeStyle = TINTA; c.lineWidth = 3.5; c.beginPath(); c.rect(-46, -32, 92, 64); c.fill(); c.stroke();
    c.lineWidth = 3; c.beginPath(); c.moveTo(-30, -12); c.lineTo(28, -12); c.moveTo(-30, 4); c.lineTo(16, 4); c.stroke();
    c.fillStyle = ACENTO; c.fillRect(-30, 14, 22, 8);
    c.restore();
  });
}
function instrucciones(c: Ctx, t: number) {
  const x = 810, y = 300, w = 170, h = 160;
  const ed = prog(t, E.edita[0], E.edita[1]);
  c.save(); c.translate(x, y); c.rotate(.05);
  hojaPapel(c, 0, 0, w, h, 0, HOJA, 3.5);
  c.strokeStyle = TINTA; c.lineWidth = 3.5; c.lineCap = "round";
  const rr = azar(77);
  for (let i = 0; i < 4; i++) { c.beginPath(); const y0 = -46 + i * 26; c.moveTo(-60, y0); for (let xx = -60; xx < 40 - (i % 2) * 30; xx += 8) c.lineTo(xx, y0 + Math.sin(xx * .4 + i) * 3 * (.6 + rr() * .5)); c.stroke(); }
  c.strokeStyle = ACENTO; c.beginPath(); c.moveTo(-60, 52); for (let xx = -60; xx < 40; xx += 8) c.lineTo(xx, 52 + Math.sin(xx * .5) * 3); c.stroke();
  if (ed > 0) {
    c.strokeStyle = ACENTO; c.lineWidth = 5; c.beginPath(); c.moveTo(-64, 26); c.lineTo(-64 + 90 * clamp(ed * 2), 24); c.stroke();
    const e2 = clamp(ed * 2 - 1); c.lineWidth = 3.5; c.beginPath(); c.moveTo(-60, 2); for (let xx = -60; xx < -60 + 110 * e2; xx += 8) c.lineTo(xx, 2 + Math.sin(xx * .6) * 4); c.stroke();
  }
  const P = ed > 0 && ed < 1 ? aPantalla(c, ed < .5 ? -64 + 90 * ed * 2 : -60 + 110 * (ed * 2 - 1), ed < .5 ? 24 : 4) : null;
  // candado: se cierra "antes de cambiar nada" y se abre "ahora sí"
  const cerrado = smooth(prog(t, E.candado - .15, E.candado)) * (1 - smooth(prog(t, E.abre - .1, E.abre + .05)));
  const visible = ventana(t, E.candado - .6, E.abre + .3, .3, .3);
  if (visible > 0) {
    c.save(); c.globalAlpha = visible; c.translate(54, 50);
    c.strokeStyle = TINTA; c.lineWidth = 8; c.beginPath(); c.arc(0, -24 - 16 * (1 - cerrado), 20, Math.PI, 0); c.lineTo(20, -6 - 16 * (1 - cerrado)); c.stroke();
    c.fillStyle = ACENTO; c.beginPath(); c.roundRect(-30, -12, 60, 46, 8); c.fill();
    c.fillStyle = "#FFFFFF"; c.beginPath(); c.arc(0, 6, 6, 0, TAU); c.fill(); c.fillRect(-2, 6, 4, 14);
    c.restore();
  }
  c.restore();
  if (P) pluma(c, P[0], P[1], t, 1, .8);
}
function mesitas(c: Ctx, t: number) {
  const corriendo = t >= E.palanca && t < E.zoomF;
  const rehace = t >= E.palanca2 + .3 && t < E.panH + .5;
  for (let i = 0; i < 20; i++) {
    const [x, y] = centroMesita(i);
    const n = corridaEn(t, i);
    const vac = n === 0;
    c.save(); c.translate(x, y + 6);
    // pop de cada corrida y de "veinte fiestas distintas"
    let pop = 1;
    if (n > 0 && t < E.mesitas[i]) pop = ease.outBack(prog(t, E.corridas[n - 1] + i * .018, E.corridas[n - 1] + i * .018 + .3), 1.8);
    if (t >= E.mesitas[i] && t < E.mesitas[i] + .3) pop = lerp(.5, 1, ease.outBack(prog(t, E.mesitas[i], E.mesitas[i] + .3), 2.2));
    let F: Fiesta = vac ? { pastel: 0, globos: 0, invitados: 0 } : variante(i, corriendo && t < E.mesitas[i] ? n : 99);
    if (rehace) F = variante(i, 200 + Math.floor((t + i * .07) * 7));
    // las tres que reprueban
    const falla = (j: number) => !rehace && i === E.FALLAN[j] && t >= E.casillas[j][i];
    if (falla(0)) F = { ...F, dinero: clamp((t - E.casillas[0][i]) / .3) };
    if (falla(1)) F = { ...F, invitados: Math.max(1, F.invitados - 1) };
    if (falla(2)) F = { ...F, mama: clamp((t - E.casillas[2][i]) / .3) };
    const malas = [0, 1, 2].filter(falla).length;
    if (malas) { c.fillStyle = "rgba(192,68,42,.1)"; c.fillRect(-TW / 2 + 3, -TH / 2 - 3, TW - 6, TH - 6); }
    c.save(); c.scale(.92, .92); c.translate(-8, -6);
    fiestita(c, F, t, pop, i * 1.7);
    if (falla(1)) { c.save(); c.translate(52 + (F.invitados) * 15, 46); c.scale(.3, .3); invitado(c, 0, .9); c.restore(); }
    c.restore();
    // casillas: arriba a la derecha de cada mesita
    if (!vac) for (let j = 0; j < 3; j++) {
      const bx = 6 + j * 25, byy = -TH / 2 + 10;
      c.fillStyle = "#FFFFFF"; c.strokeStyle = TINTA; c.lineWidth = 2.5; c.fillRect(bx, byy, 20, 20); c.strokeRect(bx, byy, 20, 20);
      if (rehace) { if ((Math.floor(t * 9 + i * 1.3 + j * 2.1) % 3) === 0) { c.fillStyle = "rgba(17,17,17,.25)"; c.fillRect(bx + 3, byy + 3, 14, 14); } continue; }
      const tt = E.casillas[j][i]; if (t < tt) continue;
      const k = prog(t, tt, tt + .14);
      if (i === E.FALLAN[j]) tache(c, bx + 10, byy + 10, 7, k, ACENTO, 4.5); else palomita(c, bx + 10, byy + 11, 8, k, TINTA, 4);
    }
    // la cuenta: cada mesita que pasa destella
    const kc = E.pasan.indexOf(i);
    if (kc >= 0 && t > E.cuenta[kc] && t < E.cuenta[kc] + .5) {
      const u = (t - E.cuenta[kc]) / .5;
      c.strokeStyle = TINTA; c.globalAlpha = 1 - u; c.lineWidth = 5; c.beginPath(); c.roundRect(-TW / 2 + 6 - u * 8, -TH / 2 - u * 8, TW - 12 + u * 16, TH - 12 + u * 16, 10); c.stroke(); c.globalAlpha = 1;
    }
    c.restore();
  }
}
function estacionE(c: Ctx, t: number) {
  maquina(c, t);
}

// ================= ESTACIÓN H: la recta de la serie 1 =================
const H = { y: 900, x0: 120, x1: 960 };
const xV = (v: number) => H.x0 + (v - 10) * (H.x1 - H.x0) / 10;
function persona(c: Ctx, x: number, y: number, s: number) {
  const g = c.createRadialGradient(x - 60 * s, y - 70 * s, 10 * s, x, y + 200 * s, 520 * s);
  g.addColorStop(0, "#4a4a48"); g.addColorStop(.35, "#1d1d1c"); g.addColorStop(1, "#060606");
  c.fillStyle = g;
  c.beginPath(); c.moveTo(x - 360 * s, y + 700 * s);
  c.bezierCurveTo(x - 360 * s, y + 300 * s, x - 250 * s, y + 230 * s, x - 92 * s, y + 200 * s);
  c.lineTo(x - 70 * s, y + 110 * s); c.lineTo(x + 70 * s, y + 110 * s); c.lineTo(x + 92 * s, y + 200 * s);
  c.bezierCurveTo(x + 250 * s, y + 230 * s, x + 360 * s, y + 300 * s, x + 360 * s, y + 700 * s); c.closePath(); c.fill();
  c.beginPath(); c.ellipse(x - 122 * s, y + 10 * s, 20 * s, 38 * s, .1, 0, TAU); c.ellipse(x + 122 * s, y + 10 * s, 20 * s, 38 * s, -.1, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(x, y, 126 * s, 152 * s, 0, 0, TAU); c.fill();
  // pelo: unos trazos de luz
  c.strokeStyle = "rgba(237,234,227,.13)"; c.lineWidth = 4 * s; c.lineCap = "round";
  for (let i = 0; i < 9; i++) { const a = -2.6 + i * .28; c.beginPath(); c.arc(x, y + 10 * s, (110 - (i % 3) * 14) * s, a, a + .5); c.stroke(); }
}
function estacionH(c: Ctx, t: number) {
  const kL = prog(t, E.traza[0], E.traza[1]);
  if (kL <= 0) return;
  // la recta y sus marcas
  c.strokeStyle = TINTA; c.lineWidth = 4; c.lineCap = "round"; c.beginPath(); c.moveTo(H.x0 - 60, H.y + tiembla(31)); c.lineTo(lerp(H.x0 - 60, H.x1 + 30, ease.outCubic(kL)), H.y + tiembla(32)); c.stroke();
  for (let v = 10; v <= 20; v++) {
    const x = xV(v), a = smooth(prog(kL, (v - 10) / 12, (v - 10) / 12 + .2)); if (a <= 0) continue;
    c.globalAlpha = a; c.fillStyle = TINTA; c.fillRect(x - 2, H.y, 4, v % 5 === 0 ? 36 : 20); c.globalAlpha = 1;
    if (v % 5 === 0) tx(c, String(v), Math.min(x, 936), H.y + 92, { fuente: mono(54), color: GRIS, alfa: a });
  }
  // la bandera de la verdad: 20 de 20
  const kB = ease.outBack(prog(t, E.bandera, E.bandera + .35), 1.6);
  if (kB > 0) {
    const top = H.y - 340 * kB;
    c.fillStyle = ACENTO; c.fillRect(H.x1 - 4, top, 8, H.y - top);
    const ond = 10 * vaiven(t, .9);
    c.beginPath(); c.moveTo(H.x1 - 4, top); c.quadraticCurveTo(H.x1 - 66, top + 24 + ond, H.x1 - 124, top + 50); c.quadraticCurveTo(H.x1 - 66, top + 76 - ond, H.x1 - 4, top + 100); c.closePath(); c.fill();
  }
  // la bola: cae en 17 y luego, con lo aprendido, salta a 19
  const sal = ease.inOutCubic(prog(t, E.salta, E.salta + .45));
  const v = lerp(17, 19, sal), x = xV(v);
  const caeZ = caida(t - E.caeBola, 4, .42, 34).z * 60;
  const arco = Math.sin(Math.PI * sal) * 170;
  const rb = t > E.salta + .45 ? caida(t - (E.salta + .45), .5, .38, 34).z * 60 : 0;
  const R = 64, yB = H.y - R - 4 - (t < E.salta ? caeZ : arco + rb);
  // la barra de error: lo que falta para 20
  const kE = ease.inOutCubic(prog(t, E.barra[0], E.barra[1]));
  if (kE > 0) {
    const pulsa = 1 + .5 * pulso(t, E.error, .6);
    c.fillStyle = ACENTO; const alto = 26 * pulsa; c.fillRect(x, H.y - alto / 2, (H.x1 - x) * kE, alto);
  }
  if (t > E.caeBola) {
    sombra(c, x, H.y + 6, 96, .3 / (1 + (t < E.salta ? caeZ : arco) * .012));
    const m = 6 * vaiven(t, 1.1);
    agente(c, x, yB, R, [x - 100, yB + 24 + m], [x + 92, yB - 46 - m], { abre1: .5, abre2: .7 });
    const a17 = smooth(prog(t, E.caeBola + .3, E.caeBola + .5)) * (1 - smooth(prog(t, E.salta, E.salta + .2)));
    if (a17 > 0) tx(c, "17", x - 6, H.y - 232, { fuente: mono(92), color: TINTA, alfa: a17 });
  }
  const aE = ventana(t, E.error, E.persona - .2, .2, .35);
  if (aE > 0) tx(c, "error", Math.min((x + H.x1) / 2, 700), H.y + 250, { fuente: serif(170, true), color: ACENTO, alfa: aE });
  // la persona que mira el número
  const kP = ease.outCubic(prog(t, E.persona, E.persona + 1.1));
  if (kP > 0) {
    const yP = lerp(2300, 1430, kP);
    // lo que mira: una línea punteada roja que va de su cabeza a la barra
    const aM = smooth(prog(t, E.mira, E.mira + .3));
    if (aM > 0) {
      c.save(); c.globalAlpha = aM; c.strokeStyle = ACENTO; c.lineWidth = 5; c.setLineDash([3, 18]); c.lineCap = "round"; c.lineDashOffset = -t * 90;
      c.beginPath(); c.moveTo(380, yP - 160); c.quadraticCurveTo(620, yP - 520, (x + H.x1) / 2, H.y + 30); c.stroke(); c.restore();
    }
    persona(c, 320, yP, 1);
    const kT = smooth(prog(t, E.tu, E.tu + .2));
    if (kT > 0) { c.save(); c.globalAlpha = kT * (.6 + .4 * Math.exp(-(t - E.tu) * 3)); c.strokeStyle = ACENTO; c.lineWidth = 7; c.beginPath(); c.ellipse(320, yP, 140 + 30 * Math.exp(-(t - E.tu) * 5), 166 + 30 * Math.exp(-(t - E.tu) * 5), 0, 0, TAU); c.stroke(); c.restore(); }
  }
}

// ================= ESTACIÓN I: juguete y producto =================
const I = { piso: 1380, top: 1150, izq: 300, der: 780, r: 95 };
function pedestal(c: Ctx, x: number, etiqueta: string) {
  c.fillStyle = "rgba(20,18,14,.1)"; c.fillRect(x - 150 + 12, I.top + 12, 300, I.piso - I.top);
  c.fillStyle = MESA; c.strokeStyle = TINTA; c.lineWidth = 4;
  c.beginPath(); c.rect(x - 160, I.top - 20 + tiembla(41), 320, 22); c.fill(); c.stroke();
  c.fillStyle = HOJA; c.beginPath(); c.rect(x - 150, I.top + 2, 300, I.piso - I.top - 2); c.fill(); c.stroke();
  c.font = serif(88, true); const w = c.measureText(etiqueta).width, px = Math.min(88, 88 * 268 / w);
  tx(c, etiqueta, x, I.top + 140, { fuente: serif(px, true), color: TINTA });
}
function llave(c: Ctx, x: number, y: number, giro: number) {
  c.fillStyle = "#B9B5AC"; c.strokeStyle = TINTA; c.lineWidth = 4;
  c.beginPath(); c.rect(x - 46, y - 8, 50, 16); c.fill(); c.stroke();
  const k = Math.cos(giro), ak = Math.abs(k);
  for (const sgn of [-1, 1]) {
    c.beginPath(); c.ellipse(x - 62, y + sgn * 30 * k, 18, 26 * ak + 3, 0, 0, TAU);
    c.fillStyle = sgn * k > 0 ? "#D2CEC5" : "#A9A59C"; c.fill(); c.stroke();
  }
  c.fillStyle = "#8C887F"; c.beginPath(); c.arc(x - 60, y, 10, 0, TAU); c.fill(); c.stroke();
}
function examen(c: Ctx, t: number) {
  const k = ease.outCubic(prog(t, E.alguien, E.alguien + .5)); if (k <= 0) return null;
  const x = 790, y = lerp(1300, 900, k), w = 270, h = 430;
  c.save(); c.translate(x, y); c.rotate(-.035 + .004 * vaiven(t, 3.3));
  hojaPapel(c, 0, 0, w, h, 0, HOJA, 4);
  c.fillStyle = TINTA; c.beginPath(); c.roundRect(-46, -h / 2 - 16, 92, 34, 8); c.fill();
  tx(c, "examen", 0, -h / 2 + 76, { fuente: serif(62, true), color: TINTA });
  const kE = prog(t, E.escribe2[0], E.escribe2[1]);
  let P: Pt | null = null;
  for (let i = 0; i < 6; i++) {
    const yy = -h / 2 + 128 + i * 40, u = clamp(kE * 6 - i);
    if (u <= 0) break;
    c.strokeStyle = TINTA; c.lineWidth = 3; c.strokeRect(-110, yy - 12, 22, 22);
    c.lineWidth = 3.5; c.lineCap = "round"; c.beginPath(); c.moveTo(-76, yy);
    const largo = 150 - (i % 3) * 30;
    for (let xx = 0; xx <= largo * u; xx += 7) c.lineTo(-76 + xx, yy + Math.sin(xx * .35 + i * 2) * 3);
    c.stroke();
    if (u < 1) P = aPantalla(c, -76 + largo * u, yy);
  }
  c.restore();
  return P;
}
function estacionI(c: Ctx, t: number) {
  c.strokeStyle = "rgba(17,17,17,.3)"; c.lineWidth = 3; c.beginPath(); c.moveTo(-300, I.piso); c.lineTo(1400, I.piso); c.stroke();
  const P = examen(c, t);
  pedestal(c, I.izq, "juguete"); pedestal(c, I.der, "producto");
  // el juguete de cuerda: se le da cuerda y no para de brincar
  const cuerda = smooth(prog(t, E.juguete, E.juguete + .3));
  const finCuerda = E.v4.tl + E.v4.wob;
  const agotado = smooth(prog(t, finCuerda - .3, finCuerda + .4));
  const mueve = cuerda * (1 - agotado);
  const gK = t < finCuerda ? (t - E.juguete) * 9 * cuerda : (finCuerda - E.juguete) * 9;
  const yJ = I.top - 20 - I.r - mueve * Math.abs(Math.sin(t * TAU * 2)) * 16 + agotado * 12;
  const kL = ease.outBack(prog(t, E.juguete - .1, E.juguete + .25), 2);
  if (kL > 0) { c.save(); c.translate(I.izq - I.r + 6, yJ - 10); c.scale(kL, kL); llave(c, 0, 0, gK); c.restore(); }
  const sw = mueve * Math.sin(t * TAU * 2);
  // el lanzamiento final sale de su mano derecha
  const d = t - E.v4.t0, arma = d < 0 ? smooth(prog(d, -.35, -.05)) : 0, suelta = d >= 0 && d < .7 ? Math.exp(-d * 5) : 0;
  let m2: Pt = [I.izq + 140, yJ - 60 + 40 * sw];
  if (d > -.4 && d < .8) m2 = [E.v4.x0 + 8 - 30 * arma + 30 * suelta, E.v4.y0 + 30 * arma - 70 * suelta];
  const mira = ventana(t, E.v4.t0 + .2, E.v4.tl - .2, .3, .35);
  if (mira > 0) m2 = [lerp(m2[0], I.izq + 120, mira), lerp(m2[1], yJ - 190, mira)];
  const m1: Pt = agotado > 0 ? [lerp(I.izq - 140, I.izq - 120, agotado), lerp(yJ - 60 - 40 * sw, yJ + 70, agotado)] : [lerp(I.izq - 140, I.izq - 120, mira), lerp(yJ - 60 - 40 * sw, yJ - 190, mira)];
  if (agotado > 0) m2 = [lerp(m2[0], I.izq + 120, agotado), lerp(m2[1], yJ + 70, agotado)];
  agente(c, I.izq, yJ, I.r, m1, m2, { abre1: .5 + .5 * mira, abre2: .3 + .7 * Math.max(mira, suelta), piso: I.top - 20, sombra: .25 });
  // el producto: quieto, con el examen detrás
  const yP = I.top - 20 - I.r + 4 * vaiven(t, 1.6);
  agente(c, I.der, yP, I.r, [I.der - 140, yP + 40 + 6 * vaiven(t, 1.3)], [I.der + 140, yP + 40 - 6 * vaiven(t, 1.3)], { abre1: .4, abre2: .4, piso: I.top - 20, sombra: .25 });
  // el mismo modelo
  const aI = smooth(prog(t, E.igual2, E.igual2 + .25)) * (1 - smooth(prog(t, E.alguien, E.alguien + .4)));
  if (aI > 0) {
    c.save(); c.translate(540, 1080); c.scale(lerp(1.5, 1, ease.outBack(aI)), lerp(1.5, 1, ease.outBack(aI)));
    tx(c, "=", 0, 30, { fuente: serif(170), color: TINTA, alfa: aI });
    c.restore();
  }
  // la moneda del final
  const m = estadoVuelo(E.v4, t);
  if (m) {
    sombraMoneda(c, m.x, E.v4.y1, RM * .9, Math.max(0, m.alto));
    moneda(c, m.x, m.y, RM * .9 * m.s, m.a, m.aire ? undefined : E.v4.cara);
  } else if (t > E.v4.t0 - .4) { const k = ease.outBack(prog(t, E.v4.t0 - .4, E.v4.t0 - .2), 2); moneda(c, E.v4.x0, E.v4.y0, RM * .9 * k, 0); }
  if (P) pluma(c, P[0], P[1], t, 1, .9);
}

// ---------- rótulos en pantalla ----------
function rotulos(c: Ctx, t: number) {
  const fin = E.v1.tl + .75;
  if (t < fin + .3) {
    const a = 1 - smooth(prog(t, fin, fin + .25));
    tx(c, "¿Cómo sabes", 540, 236, { fuente: serif(104), color: TINTA, alfa: a });
    tx(c, "que tu agente", 540, 356, { fuente: serif(104), color: TINTA, alfa: a * smooth(prog(t, t0.que - .05, t0.que + .12)) });
    const k = smooth(prog(t, t0.funciona - .05, t0.funciona + .1));
    if (k > 0) { c.save(); c.translate(540, 520); c.scale(lerp(1.25, 1, ease.outBack(k)), lerp(1.25, 1, ease.outBack(k))); tx(c, "¿funciona?", 0, 0, { fuente: serif(176, true), color: ACENTO, alfa: a * k }); c.restore(); }
  }
  rotulo(c, t, E.nolo, E.panB - .15, "no lo sabes.", 330, 132, TINTA, true);
  // A': la conclusión que se cae
  if (t > t0.siempre - .1 && t < E.bajaE + .4) {
    rotulo(c, t, t0.siempre, E.bajaE, "«siempre cae águila»", 330, 100, TINTA, true);
    const k = ease.inOutCubic(prog(t, E.tachaFrase, E.tachaFrase + .3));
    if (k > 0) { c.save(); c.globalAlpha = 1 - smooth(prog(t, E.bajaE, E.bajaE + .22)); c.strokeStyle = ACENTO; c.lineWidth = 9; c.lineCap = "round"; c.beginPath(); c.moveTo(150, 300); c.lineTo(lerp(150, 935, k), 296 - 8 * k); c.stroke(); c.restore(); }
  }
  // E
  if (t > E.maquina - .1 && t < E.lista + .3) {
    const k = smooth(prog(t, E.maquina, E.maquina + .12)) * (1 - smooth(prog(t, E.lista - .3, E.lista)));
    c.save(); c.translate(540, 318); c.scale(lerp(1.4, 1, ease.outBack(clamp((t - E.maquina) / .3), 2)), lerp(1.4, 1, ease.outBack(clamp((t - E.maquina) / .3), 2)));
    tx(c, "evals", 0, 0, { fuente: serif(204, true), color: ACENTO, alfa: k }); c.restore();
    rotulo(c, t, E.examenes, E.lista - .3, "exámenes automáticos", 418, 80, TINTA);
  }
  rotulo(c, t, t0.muchas, t0.antes - .1, "muchas veces", 230, 100, TINTA, true);
  rotulo(c, t, t0.antes, E.zoomF, "antes de cambiar nada", 230, 92, TINTA, true);
  rotulo(c, t, t0.vuelves, E.panH, "y vuelves a medir", 260, 100, TINTA, true);
  // H
  rotulo(c, t, t0.sin, E.persona - .15, "sin un error medido", 300, 96, TINTA);
  rotulo(c, t, t0.nadie, E.persona - .15, "nadie aprende", 430, 126, TINTA, true);
  rotulo(c, t, E.mira - .1, E.panI - .15, "quien aprende", 300, 100, TINTA);
  if (t > E.tu - .05 && t < E.panI) {
    const k = smooth(prog(t, E.tu - .05, E.tu + .1)) * (1 - smooth(prog(t, E.panI - .3, E.panI)));
    c.save(); c.translate(540, 470); c.scale(lerp(1.3, 1, ease.outBack(clamp((t - E.tu) / .3), 2)), lerp(1.3, 1, ease.outBack(clamp((t - E.tu) / .3), 2)));
    tx(c, "eres tú", 0, 0, { fuente: serif(180, true), color: ACENTO, alfa: k }); c.restore();
  }
  // I y J
  rotulo(c, t, E.panI + .3, t0.casi - .1, "la diferencia", 300, 104, TINTA);
  rotulo(c, t, t0.casi, E.alguien - .2, "casi nunca", 300, 104, TINTA);
  rotulo(c, t, t0.esel, E.alguien - .2, "es el modelo", 430, 126, TINTA, true);
  if (t > E.nomides - .05) {
    const a = smooth(prog(t, E.nomides - .05, E.nomides + .15));
    tx(c, "Lo que no mides", 540, 300 + (1 - ease.outCubic(prog(t, E.nomides - .05, E.nomides + .3))) * 18, { fuente: serif(112), color: TINTA, alfa: a });
    const k = smooth(prog(t, t0.adivinas - .08, t0.adivinas + .1));
    if (k > 0) { c.save(); c.translate(540, 462); c.scale(lerp(1.3, 1, ease.outBack(clamp((t - t0.adivinas + .08) / .35), 2)), lerp(1.3, 1, ease.outBack(clamp((t - t0.adivinas + .08) / .35), 2))); tx(c, "lo adivinas.", 0, 0, { fuente: serif(168, true), color: ACENTO, alfa: k }); c.restore(); }
  }
}

// ---------- el cuadro ----------
const DIBUJA: Record<Est, (c: Ctx, t: number) => Pt | null | void> = { A: estacionA, B: estacionB, C: estacionC, E: estacionE, H: estacionH, I: estacionI };
const CAJA: Record<Est, [number, number, number, number]> = { A: [-300, -1700, 1400, 2400], B: [-100, 0, 1200, 1900], C: [-100, 0, 1200, 1900], E: [-500, -2000, 1200, 2100], H: [-200, 300, 1300, 2600], I: [-300, -800, 1400, 2200] };
function dibuja(c: Ctx, t: number) {
  FR = Math.floor(t * 10);
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  const K = camaraEn(t);
  let sx = 0, sy = 0;
  for (const [g, a] of GOLPES) if (t > g && t < g + 1.2) { const e = a * Math.exp(-(t - g) * 8); sx += e * Math.sin((t - g) * 61) * .6; sy += e * Math.sin((t - g) * 47); }
  const br = 1 + .012 * vaiven(t, 7.7);
  c.save();
  c.translate(540 + 9 * vaiven(t, 8.9) + sx, 960 + 11 * vaiven(t, 10.3, 1) + sy); c.rotate(.004 * vaiven(t, 13.1, 2)); c.scale(br, br); c.translate(-540, -960);
  polvo(c, t, K);
  c.translate(540, 960); c.scale(K.z, K.z); c.translate(-K.x, -K.y);
  const vx0 = K.x - 560 / K.z - 60, vx1 = K.x + 560 / K.z + 60, vy0 = K.y - 1000 / K.z - 60, vy1 = K.y + 1000 / K.z + 60;
  let pluC: Pt | null = null;
  (Object.keys(S) as Est[]).forEach((e) => {
    const [ox, oy] = S[e], [a, b, cc, d] = CAJA[e];
    if (ox + cc < vx0 || ox + a > vx1 || oy + d < vy0 || oy + b > vy1) return;
    c.save(); c.translate(ox, oy);
    const r = DIBUJA[e](c, t);
    if (e === "C") { cartasD(c, t); if (r) pluC = r as Pt; }
    c.restore();
  });
  if (pluC) pluma(c, (pluC as Pt)[0], (pluC as Pt)[1], t, 1, 1.1);
  c.restore();
  rotulos(c, t);
}

export const Pieza: React.FC = () => <Lienzo dibuja={(c, t) => dibuja(c, t)} preparar={() => ({})} />;
