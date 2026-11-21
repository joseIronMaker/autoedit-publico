// Capítulo 12, el último. La bola, que fue la predicción toda la serie, resulta ser el tipo de la máquina de
// escribir: teclea citas perfectas y al pisarlas se revelan huecas. Lo que parecía texto solo era tinta sin nada
// detrás. El repaso es UNA sola cadena de transformaciones: dígitos → bola → recta → pendiente → charco de luz →
// perilla → balanza → hoja que se dobla → red → mapa → palabras con hilos → dígitos otra vez. Cierra con la misma
// tormenta del capítulo 1 (misma semilla, mismos dígitos), que se detiene convertida en lo que decimos nosotros.
// Todos los casos son genéricos a propósito (Fulano, Mengano, n.º 123-456): ninguno copia los casos inventados.
import React from "react";
import { azar, Cam, caida, camara, clamp, curvas, ease, Fuente, lerp, prog, resorte, smooth, texto, Vista } from "../../kit";
import { ACENTO, anillo, bola, cue, GRIS, Lienzo, LUZ, mono, NOCHE, PAPEL, rotulo, serif, sombra, TINTA } from "../../marca";
import palabras from "./palabras.json";
import duracion from "./duracion.json";
import K from "./t.json";
import red from "../c05/red.json";

export const DURACION = duracion.dur;
const T = cue(palabras);
type Ctx = CanvasRenderingContext2D;
type P2 = { x: number; y: number };
const TAU = 6.2832;

const iDijo = T("dijo").i;
const t0 = {
  gpt: T("chatgpt").s, gptF: T("chatgpt").e, nom: T("con nombres").s, fec: T("con fechas").s, cit: T("con citas").s, citF: T("con citas").e,
  nin: T("ninguno existía").s, exi: T("existía").s, exiF: T("existía").e,
  yc: T("y cuando el abogado").s, pre: T("preguntó").s, rea: T("reales").s, gpt2: T("chatgpt le dijo").s, si: T("sí", iDijo).s, siF: T("sí", iDijo).e,
  lo: T("lo multaron").s, mul: T("multaron").s, pero: T("pero eso no fue").s, ment: T("mentira").s, mentF: T("mentira").e,
  para: T("para mentir").s, mtr: T("mentir,").s, nec: T("necesitas").s, ver: T("la verdad").s, verF: T("la verdad").e,
  rec: T("recuerda cómo").s, desp: T("después de según").s, seg: T("según").s, casoF: T("el caso").e,
  viene: T("viene algo").s, sua: T("suena a caso").s, suaF: T("suena a caso").e, desp2: T("después,").s, unum: T("un número que").s, sub: T("suena a cita").s, subF: T("suena a cita").e,
  todo: T("todo encaja").s, nada: T("nada se consultó").s, nadaF: T("nada se consultó").e, aeso: T("a eso le llaman").s, alu: T("alucinación").s, aluF: T("alucinación").e,
  yo: T("yo le diría").s, comp: T("completar").s, compF: T("completar").e, porq: T("porque por dentro").s, arch: T("archivo de hechos").s, arcF: T("archivo de hechos").e,
  hay: T("hay un mapa").s, como: T("de cómo hablamos").s, enese: T("y en ese mapa").s, lov: T("lo verdadero").s, suv: T("lo que suena verdadero").s, cerca: T("viven muy cerca").s, cercaF: T("viven muy cerca").e,
  pore: T("por eso hoy").s, cone: T("conectan").s, bus: T("buscadores").s, doc: T("documentos").s, lea: T("para que lea").s, ant: T("antes de responder").s, res: T("responder").s,
  ayu: T("ayuda mucho").s, noLo: T("no lo arregla").s, noLoF: T("no lo arregla del todo").e, mira: T("mira de dónde").s,
  emp: T("empezó adivinando").s, hoy: T("y hoy").s, sabe: T("parece saber").e, sigue: T("sigue haciendo").s, nun: T("nunca dejó").s, adi: T("de adivinar").e, solo: T("solo aprendió").s, nue: T("nuestras palabras").s, fin: T("nuestras palabras").e,
};
const R = { num: T("un número al azar").s, err: T("un error").s, pen: T("una pendiente").s, sum: T("una suma").s, dob: T("un doblez").s, cul: T("la culpa").s, pun: T("un punto en").s, pal: T("una palabra que").s, emp: t0.emp };

// ---------- utilidades ----------
const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * TAU + f);
const hash = (i: number, j = 0) => { const s = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453; return s - Math.floor(s); };
const sstep = (a: number, b: number, x: number) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
function linea(c: Ctx, ax: number, ay: number, bx: number, by: number) { c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); }
function circulo(c: Ctx, x: number, y: number, r: number) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
const pop = (t: number, ti: number, d = .26, s = 1.8) => ease.outBack(prog(t, ti, ti + d), s);
const pl = (t: number, te: number, A: number, dec = 3.2) => (t > te ? A * Math.exp(-(t - te) * dec) : 0);
function sacudida(t: number, G: [number, number][]) {
  let x = 0, y = 0;
  for (const [g, a] of G) if (t > g && t < g + 1.2) { const e = a * Math.exp(-(t - g) * 7); x += e * Math.sin((t - g) * 61) * .5; y += e * Math.sin((t - g) * 47); }
  return { x, y };
}
/** Línea a mano alzada: vibra a 10 cuadros por segundo, como en el capítulo 1. */
function traza(c: Ctx, P0: [number, number][], k: number, color = TINTA, g = 8, t = 0, vib = 5) {
  if (k <= 0) return;
  const r = azar(Math.floor(t * 10) + 1);
  const P = P0.map(([x, y]) => [x + (r() - .5) * vib, y + (r() - .5) * vib] as [number, number]);
  const L: number[] = [0];
  for (let i = 1; i < P.length; i++) L[i] = L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
  const hasta = L[L.length - 1] * clamp(k);
  c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath(); c.moveTo(P[0][0], P[0][1]);
  for (let i = 1; i < P.length; i++) {
    if (L[i] <= hasta) c.lineTo(P[i][0], P[i][1]);
    else { const q = (hasta - L[i - 1]) / (L[i] - L[i - 1]); c.lineTo(lerp(P[i - 1][0], P[i][0], q), lerp(P[i - 1][1], P[i][1], q)); break; }
  }
  c.stroke();
}
function rimBola(c: Ctx, x: number, y: number, r: number, alfa: number) {
  bola(c, x, y, r);
  if (alfa <= .01) return;
  c.save(); c.globalAlpha = alfa; c.lineCap = "round";
  c.strokeStyle = "rgba(237,234,227,.82)"; c.lineWidth = Math.max(2.4, r * .05); c.beginPath(); c.arc(x, y, r - c.lineWidth / 2, 3.5, 5.3); c.stroke();
  c.strokeStyle = "rgba(237,234,227,.3)"; c.lineWidth = Math.max(1.6, r * .03); c.beginPath(); c.arc(x, y, r - 1, 0, TAU); c.stroke();
  c.restore();
}
function sombraBola(c: Ctx, x: number, y: number, r: number, al = .3) {
  const g = c.createRadialGradient(x + r * .3, y + r * .42, r * .2, x + r * .3, y + r * .42, r * 1.5);
  g.addColorStop(0, `rgba(20,18,14,${al})`); g.addColorStop(1, "rgba(20,18,14,0)");
  c.fillStyle = g; c.beginPath(); c.arc(x + r * .3, y + r * .42, r * 1.5, 0, TAU); c.fill();
}
/** Texto hueco: el contorno sin nada adentro. Es el corazón del capítulo. */
function hueco(c: Ctx, s: string, x: number, y: number, fuente: string, color: string, alfa = 1, g = 2.2, alin: CanvasTextAlign = "left") {
  if (alfa <= .003) return;
  c.save(); c.globalAlpha = alfa; c.font = fuente; c.textAlign = alin; c.strokeStyle = color; c.lineWidth = g; c.lineJoin = "round"; c.strokeText(s, x, y); c.restore();
}
/** La tinta se vacía de arriba hacia abajo y deja el contorno. k = 0 lleno, 1 hueco. */
function vacia(c: Ctx, s: string, x: number, y: number, fuente: string, px: number, color: string, k: number, alfa = 1, alin: CanvasTextAlign = "left") {
  if (k <= 0) { texto(c, s, x, y, { fuente, color, alin, alfa }); return; }
  hueco(c, s, x, y, fuente, color, alfa, Math.max(1.8, px * .022), alin);
  if (k >= 1) return;
  c.save(); c.beginPath(); c.rect(-300, y - px * .86 + k * px * 1.18, 1800, 2000); c.clip();
  texto(c, s, x, y, { fuente, color, alin, alfa }); c.restore();
}

// ---------- la ruta de la bola ----------
type Mov = { ini: number; fin: number; ax: number; ay: number; bx: number; by: number; alto: number; n: number; f?: (x: number) => number };
function enRuta(M: Mov[], t: number): P2 & { h: number } {
  let m = M[0];
  for (const q of M) { if (t < q.ini) break; m = q; }
  const u = prog(t, m.ini, m.fin), e = (m.f ?? ((x: number) => x))(u);
  const h = m.n <= 1 ? 4 * u * (1 - u) : Math.abs(Math.sin(Math.PI * u * m.n));
  return { x: lerp(m.ax, m.bx, e), y: lerp(m.ay, m.by, e) - m.alto * h, h: m.alto * h };
}

// ---------- los seis casos: visiblemente genéricos ----------
const CASOS: [string, string][] = [
  ["Fulano vs. Mengano", "12-03-2019 · n.º 123-456"], ["Zutano vs. Perengano", "05-11-2016 · n.º 234-567"], ["Fulana vs. Empresa S.A.", "30-06-2018 · n.º 345-678"],
  ["Mengana vs. Banco X", "21-01-2017 · n.º 456-789"], ["Perengano vs. Zutana", "09-09-2014 · n.º 567-890"], ["Citano vs. Compañía Y", "17-02-2013 · n.º 678-901"],
];
const XT = 150, YE = [430, 620, 810, 1000, 1190, 1380], RB = 24, PXN = 86, PXS = 40;
const SILABAS = [2, 4, 7, 11, 14, 16, 18];              // Fu·la·no·vs.·Men·ga·no: la bola estampa una sílaba por bote
const REPOSO = { x: 196, y: 1496 }, XC0 = 720, XC1 = 430;
const xCae = (y: number) => lerp(XC0, XC1, (y - K.Y0) / (K.suelo - K.Y0));

// ---------- la tormenta del capítulo 1: mismas celdas, misma semilla ----------
const dig = (i: number, j: number, t: number, a: number, b: number) => Math.floor(((Math.floor(t * lerp(8, 17, a) + b * 40) * 2654435761 + i * 40503 + j * 9973) >>> 0) / 37) % 10;
function celda(i: number, j: number, t: number, a: number, b: number): [number, number] {
  return [60 + i * 80 + Math.sin(t * lerp(.7, 1.6, b) + a * 9) * 11, 50 + j * 88 + Math.cos(t * lerp(.8, 1.4, a) + b * 9) * 11];
}
function tormenta(c: Ctx, t: number, alfa: number, junta: number, cx: number, cy: number, abre = 1e9) {
  if (alfa <= .01) return;
  const col = 13, fil = 22, r = azar(7);
  c.save(); c.font = mono(52); c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = TINTA;
  for (let j = 0; j < fil; j++) for (let i = 0; i < col; i++) {
    const a = r(), b = r(), q = r();
    const d = dig(i, j, t, a, b);
    const [x0, y0] = celda(i, j, t, a, b);
    const dx = x0 - cx, dy = y0 - cy, di = Math.hypot(dx, dy);
    if (di > abre) continue;
    const k = ease.inCubic(prog(junta, q * .55, q * .55 + .45)), gi = k * 1.9;
    const x = cx + (dx * Math.cos(gi) - dy * Math.sin(gi)) * (1 - k), y = cy + (dx * Math.sin(gi) + dy * Math.cos(gi)) * (1 - k);
    c.globalAlpha = alfa * lerp(.16, .86, a) * (1 - k * .2) * clamp((abre - di) / 120);
    if (k < .99) c.fillText(String(d), x, y);
  }
  c.restore();
}
function polvoDigitos(c: Ctx, t: number, color: string, alfa: number) {
  if (alfa <= .01) return;
  const r = azar(41);
  c.save(); c.font = mono(44); c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = color;
  for (let i = 0; i < 36; i++) {
    const x0 = r() * 1260 - 90, y0 = r() * 2100 - 90, v = 30 + r() * 62, f = r() * 6.28, a = r();
    const y = ((y0 - t * v) % 2100 + 2100) % 2100 - 90, x = x0 + Math.sin(t * .6 + f) * 42;
    const d = Math.floor(((Math.floor(t * (3 + a * 5) + f) * 2654435761 + i * 40503) >>> 0) / 37) % 10;
    c.globalAlpha = alfa * (.08 + a * .17);
    c.fillText(String(d), x, y);
  }
  c.restore();
}

// ---------- lo que decimos nosotros ----------
const FRASES = ["te quiero", "¿ya comiste?", "llegué bien", "perdóname", "te extraño", "buenas noches", "¿cómo sigues?", "gracias, mamá", "no te vayas", "ya mero llego", "fue un placer",
  "te lo prometo", "mi abuela decía", "cuídate mucho", "tengo miedo", "¿me acompañas?", "estoy contigo", "feliz cumpleaños", "te lo dije", "ojalá", "aquí estoy", "nunca te olvidé"];
const YF = (j: number) => 50 + j * 88, PXF = 72;
type Car = { ch: string; x: number; i: number; tl: number };

// ---------- la balanza del capítulo 3, redibujada ----------
const XK = [190, 470, 830], YK = 480, RK = 92, YSLOT = 744, XP = 540, YP = 1060, BRAZO = 290, RN = 470, RBM = 56, TMAX = .46;
const fielDe = (s: number) => TMAX * Math.tanh(s / 2.2);
const angPerilla = (v: number) => -Math.PI / 2 + v * Math.PI / 4;
const GUIA: [number, number][][] = [
  [[190, YSLOT], [186, 790], [196, 830], [188, 880]],
  [[470, YSLOT], [462, 830], [330, 800], [312, 880]],
  [[830, YSLOT], [830, 790], [830, 830], [830, 860]],
];
function bez(G: [number, number][], u: number): P2 {
  const a = 1 - u, b0 = a * a * a, b1 = 3 * a * a * u, b2 = 3 * a * u * u, b3 = u * u * u;
  return { x: b0 * G[0][0] + b1 * G[1][0] + b2 * G[2][0] + b3 * G[3][0], y: b0 * G[0][1] + b1 * G[1][1] + b2 * G[2][1] + b3 * G[3][1] };
}
function perilla(c: Ctx, x: number, y: number, Rk: number, ang: number, px: number, py: number) {
  const tx = x + px, ty = y + py;
  const g = c.createRadialGradient(x + Rk * .2, y + Rk * .28, Rk * .5, x + Rk * .2, y + Rk * .28, Rk * 1.5);
  g.addColorStop(0, "rgba(20,18,14,.42)"); g.addColorStop(1, "rgba(20,18,14,0)");
  c.fillStyle = g; c.beginPath(); c.arc(x + Rk * .2, y + Rk * .28, Rk * 1.5, 0, TAU); c.fill();
  c.fillStyle = "#070707";
  for (let k = 0; k <= 4; k++) circulo(c, lerp(x, tx, k / 4), lerp(y, ty, k / 4), Rk * 1.02);
  const N = 34;
  c.fillStyle = "#151514"; c.beginPath();
  for (let i = 0; i < N * 2; i++) {
    const a = ang + i * Math.PI / N, r = Rk * (i % 2 ? 1.05 : .985);
    if (i === 0) c.moveTo(tx + Math.cos(a) * r, ty + Math.sin(a) * r); else c.lineTo(tx + Math.cos(a) * r, ty + Math.sin(a) * r);
  }
  c.closePath(); c.fill();
  const G = c.createConicGradient(-.9, tx, ty);
  [["#E4E1D9", 0], ["#8D8B85", .13], ["#DCD9D1", .26], ["#74726C", .39], ["#D2CFC7", .5], ["#7F7D77", .63], ["#E6E3DB", .76], ["#7A7872", .89], ["#E4E1D9", 1]].forEach(([k, s]) => G.addColorStop(s as number, k as string));
  c.fillStyle = "#050505"; circulo(c, tx, ty, Rk * .8);
  c.fillStyle = G; circulo(c, tx, ty, Rk * .74);
  c.strokeStyle = TINTA; c.lineWidth = Rk * .075; c.lineCap = "round";
  linea(c, tx + Math.cos(ang) * Rk * .2, ty + Math.sin(ang) * Rk * .2, tx + Math.cos(ang) * Rk * .66, ty + Math.sin(ang) * Rk * .66);
  c.fillStyle = ACENTO; circulo(c, tx + Math.cos(ang) * Rk * .9, ty + Math.sin(ang) * Rk * .9, Rk * .062);
}
function maquina(c: Ctx, v: readonly number[], th: number, px: number, py: number) {
  c.lineCap = "round";
  c.save(); c.strokeStyle = TINTA; c.lineWidth = 3.5;
  const a0 = Math.PI / 2 - fielDe(3.2), a1 = Math.PI / 2 - fielDe(-3.2), Rr = RN + 24;
  c.beginPath(); c.arc(XP, YP, Rr, a0, a1); c.stroke();
  for (let s = -3; s <= 3; s++) {
    const a = Math.PI / 2 - fielDe(s);
    c.lineWidth = s === 0 ? 5 : 3; linea(c, XP + Math.cos(a) * Rr, YP + Math.sin(a) * Rr, XP + Math.cos(a) * (Rr + (s === 0 ? 30 : 20)), YP + Math.sin(a) * (Rr + (s === 0 ? 30 : 20)));
  }
  c.restore();
  const al = Math.PI / 2 - fielDe(1), R0 = RN - 30, R1 = RN + 90;
  c.strokeStyle = ACENTO; c.lineWidth = 9; linea(c, XP + Math.cos(al) * R0, YP + Math.sin(al) * R0, XP + Math.cos(al) * R1, YP + Math.sin(al) * R1);
  c.save(); c.globalAlpha = .34; c.strokeStyle = TINTA; c.lineWidth = 4;
  for (let i = 0; i < 3; i++) {
    const G = GUIA[i]; c.beginPath(); c.moveTo(XK[i], YK + RK + 32); c.lineTo(G[0][0], G[0][1]);
    c.bezierCurveTo(G[1][0], G[1][1], G[2][0], G[2][1], G[3][0], G[3][1]); c.stroke();
  }
  c.restore();
  c.strokeStyle = TINTA; c.lineWidth = 5; linea(c, 100, 636, 960, 636);
  c.lineWidth = 10; linea(c, XP, 636, XP, YP);
  const tipx = XP + RN * Math.sin(th), tipy = YP + RN * Math.cos(th), nx = Math.cos(th), ny = -Math.sin(th);
  c.fillStyle = TINTA; c.beginPath(); c.moveTo(XP - nx * 11, YP - ny * 11); c.lineTo(tipx, tipy); c.lineTo(XP + nx * 11, YP + ny * 11); c.closePath(); c.fill();
  c.fillStyle = ACENTO; circulo(c, tipx, tipy, 13);
  const ex = BRAZO * Math.cos(th), ey = BRAZO * Math.sin(th), lx = XP - ex, ly = YP + ey, rx = XP + ex, ry = YP - ey, u = { x: Math.sin(th), y: Math.cos(th) };
  c.fillStyle = TINTA; c.beginPath();
  c.moveTo(lx - u.x * 5, ly - u.y * 5); c.lineTo(XP - u.x * 15, YP - u.y * 15); c.lineTo(rx - u.x * 5, ry - u.y * 5); c.lineTo(rx + u.x * 5, ry + u.y * 5); c.lineTo(XP + u.x * 15, YP + u.y * 15); c.lineTo(lx + u.x * 5, ly + u.y * 5); c.closePath(); c.fill();
  for (const [x, y] of [[lx, ly], [rx, ry]] as [number, number][]) {
    c.lineWidth = 8; c.strokeStyle = TINTA; linea(c, x, y, x, y - 46);
    c.fillStyle = TINTA; c.beginPath(); c.moveTo(x - 122, y - 58); c.lineTo(x + 122, y - 58); c.quadraticCurveTo(x + 100, y - 38, x, y - 38); c.quadraticCurveTo(x - 100, y - 38, x - 122, y - 58); c.fill();
  }
  c.fillStyle = TINTA; circulo(c, XP, YP, 26); c.fillStyle = LUZ; circulo(c, XP, YP, 9);
  c.strokeStyle = TINTA;
  for (let i = 0; i < 3; i++) {
    for (let w = -3; w <= 3; w++) {
      const a = angPerilla(w); c.lineWidth = w === 0 ? 5 : 3.5;
      linea(c, XK[i] + Math.cos(a) * (RK + 14), YK + Math.sin(a) * (RK + 14), XK[i] + Math.cos(a) * (RK + (w === 0 ? 36 : 28)), YK + Math.sin(a) * (RK + (w === 0 ? 36 : 28)));
    }
    perilla(c, XK[i], YK, RK, angPerilla(v[i]), px, py);
  }
}
const TH_FIN = fielDe(-1);
const A_S = [[R.sum + .1, R.sum + .34], [R.sum + .28, R.sum + .52], [R.sum + .46, R.sum + .74]];
function fielR(t: number) {
  const S: [number, number][] = [[A_S[0][1], 1], [A_S[1][1], 2], [A_S[2][1], -1]];
  let p = 0, th = 0;
  for (const [ti, s] of S) { th += (fielDe(s) - fielDe(p)) * resorte(t - ti, 1.5, .34); p = s; }
  return th;
}
function plato(i: number, th: number): P2 {
  const lado = i === 2 ? 1 : -1;
  return { x: XP + lado * BRAZO * Math.cos(th) + [-62, 62, 0][i], y: YP - lado * BRAZO * Math.sin(th) - 58 };
}
function bolasSuma(c: Ctx, t: number) {
  const th = fielR(t), W = [1, 1, 3], TX = ["+1", "+1", "−3"];
  for (let i = 0; i < 3; i++) {
    const [a, b] = A_S[i], r = RBM * W[i] ** .6;
    if (t < a - .04) continue;
    const u = prog(t, a, b) ** 2;
    let p = u < .76 ? bez(GUIA[i], u / .76) : (() => { const e = bez(GUIA[i], 1), q = plato(i, fielR(b)), k = (u - .76) / .24; return { x: lerp(e.x, q.x, k), y: lerp(e.y, q.y - r, k) }; })();
    if (t >= b) { const q = plato(i, th); p = { x: q.x, y: q.y - r }; }
    sombraBola(c, p.x, p.y, r);
    bola(c, p.x, p.y, r, i === 2 ? ACENTO : TINTA);
    texto(c, TX[i], p.x, p.y + r * .34, { fuente: mono(Math.round(r * .98)), color: LUZ });
  }
}

// ---------- la hoja: dos mitades de verdad, un eje real ----------
type V = [number, number];
const U = { x: Math.cos(TH_FIN), y: -Math.sin(TH_FIN) }, N = { x: -Math.sin(TH_FIN), y: -Math.cos(TH_FIN) };
const CUADRO: V[] = [[0, 0], [1080, 0], [1080, 1920], [0, 1920]];
const lado = (p: V) => (p[0] - XP) * N.x + (p[1] - YP) * N.y;
function corta(P: V[], f: (p: V) => number): V[] {
  const out: V[] = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], fa = f(a), fb = f(b);
    if (fa >= 0) out.push(a);
    if ((fa > 0 && fb < 0) || (fa < 0 && fb > 0)) { const r = fa / (fa - fb); out.push([lerp(a[0], b[0], r), lerp(a[1], b[1], r)]); }
  }
  return out;
}
const MITAD_A = corta(CUADRO, lado), MITAD_B = corta(CUADRO, (p) => -lado(p));
/** Un punto de la hoja, de píxeles a mundo, con la mitad de arriba girada phi sobre el fiel. */
function enHoja(p: V, phi: number): [number, number, number] {
  const qx = p[0] - XP, qy = p[1] - YP, a = qx * U.x + qy * U.y, b = qx * N.x + qy * N.y;
  const bp = b > 0 ? b * Math.cos(phi) : b, h = b > 0 ? b * Math.sin(phi) : 0;
  const px = XP + U.x * a + N.x * bp, py = YP + U.y * a + N.y * bp;
  return [(px - 540) / 125, (960 - py) / 125, h / 125];
}
function afin(c: Ctx, cam: Cam, phi: number, arriba: boolean) {
  const sgn = arriba ? 1 : -1;
  const S0 = cam.p(...enHoja([XP, YP], phi)), S1 = cam.p(...enHoja([XP + U.x * 300, YP + U.y * 300], phi)), S2 = cam.p(...enHoja([XP + sgn * N.x * 300, YP + sgn * N.y * 300], phi));
  if (!S0 || !S1 || !S2) return false;
  const mux = (S1.x - S0.x) / 300, muy = (S1.y - S0.y) / 300, mnx = sgn * (S2.x - S0.x) / 300, mny = sgn * (S2.y - S0.y) / 300;
  const a = mux * U.x + mnx * N.x, cc = mux * U.y + mnx * N.y, b = muy * U.x + mny * N.x, d = muy * U.y + mny * N.y;
  c.transform(a, b, cc, d, S0.x - (a * XP + cc * YP), S0.y - (b * XP + d * YP));
  return true;
}
function poliHoja(c: Ctx, cam: Cam, P: V[], phi: number) {
  c.beginPath();
  P.forEach((p, i) => { const q = cam.p(...enHoja(p, phi)); if (q) { if (i === 0) c.moveTo(q.x, q.y); else c.lineTo(q.x, q.y); } });
  c.closePath();
}
type Punto = { x: number; y: number; neg: boolean };
function creaPuntos(): Punto[] {
  const r = azar(1986), out: Punto[] = [];
  while (out.length < 150) {
    const x = 60 + r() * 960, y = 60 + r() * 1800, b = Math.abs(lado([x, y]));
    if (b > 190 && b < 280) continue;
    out.push({ x, y, neg: b <= 190 });
  }
  return out;
}

// ---------- la red del capítulo 5 ----------
type Nodo = { l: number; i: number; x: number; y: number; r: number; sem: number };
type Ar = { l: number; a: Nodo; b: Nodo; w: number; c: number; oa: number; ob: number; bx: Float32Array; by: Float32Array };
const NP = 18, WT = 84;
function creaRed() {
  const r = azar(11), P = (x: number, y: number) => ({ x: 540 + (x - 540) * .96, y: 1336 + (y - 1240) * .92 });
  const nodos: Nodo[][] = red.capas.map((n: number, l: number) => (red.xs as Record<string, number[]>)[String(n)].map((x: number, i: number) => {
    const q = P(x + (l === 4 ? 0 : (r() - .5) * 16), red.ys[l] + (l === 4 ? 0 : (r() - .5) * 20));
    return { l, i, x: q.x, y: q.y, r: red.r[l] * .94, sem: 1 + Math.floor(r() * 900) };
  }));
  const ars: Ar[] = [];
  for (let l = 0; l < 4; l++) nodos[l].forEach((a, i) => nodos[l + 1].forEach((b, k) => ars.push({ l, a, b, w: red.w[l][i][k], c: (red.pasos[0] as any).c[l][i][k], oa: 0, ob: 0, bx: new Float32Array(NP), by: new Float32Array(NP) })));
  nodos.flat().forEach((n) => {
    const abajo = ars.filter((e) => e.a === n).sort((p, q) => p.b.x - q.b.x), arriba = ars.filter((e) => e.b === n).sort((p, q) => p.a.x - q.a.x);
    const tot = (L: Ar[]) => L.reduce((q, e) => q + e.c, 0);
    let u = -tot(abajo) * WT / 2; abajo.forEach((e) => { const w = e.c * WT; e.oa = u + w / 2; u += w; });
    u = -tot(arriba) * WT / 2; arriba.forEach((e) => { const w = e.c * WT; e.ob = u + w / 2; u += w; });
  });
  for (const e of ars) {
    const x0 = e.a.x + e.oa, y0 = e.a.y + e.a.r * .18, x3 = e.b.x + e.ob, y3 = e.b.y - e.b.r * .18, dy = (y3 - y0) * .5;
    for (let j = 0; j < NP; j++) {
      const u = j / (NP - 1), v = 1 - u;
      e.bx[j] = v * v * v * x0 + 3 * v * v * u * x0 + 3 * v * u * u * x3 + u * u * u * x3;
      e.by[j] = v * v * v * y0 + 3 * v * v * u * (y0 + dy) + 3 * v * u * u * (y3 - dy) + u * u * u * y3;
    }
  }
  return { nodos, ars };
}
function circuloMano(c: Ctx, x: number, y: number, r: number, t: number, sem: number, g = 5, color = TINTA, alfa = 1) {
  const q = azar(sem + Math.floor(t * 10) * 53), a0 = q() * 6.28, b1 = q() * .022, b2 = q() * .018, f1 = q() * 6, f2 = q() * 6;
  c.save(); c.globalAlpha *= alfa; c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round"; c.beginPath();
  for (let i = 0; i <= 44; i++) {
    const a = a0 + i / 42 * TAU, rr = r * (1 + b1 * Math.sin(2 * a + f1) + b2 * Math.sin(3 * a + f2) + (i / 44) * .018);
    if (i === 0) c.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.stroke(); c.restore();
}

// ---------- el hilo del capítulo 9 ----------
type OH = { col?: string; alfa?: number; sag?: number; amp?: number; k?: number; seed?: number; soga?: boolean; sombra?: boolean; nudos?: boolean; punta?: number };
function hilo(c: Ctx, ax: number, ay: number, bx: number, by: number, g: number, t: number, o: OH = {}) {
  const alfa = o.alfa ?? 1, k = clamp(o.k ?? 1);
  if (alfa <= .01 || k <= 0 || g <= .05) return;
  const col = o.col ?? TINTA, sag = o.sag ?? 0, amp = o.amp ?? 0, seed = o.seed ?? 0;
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const Nn = Math.round(clamp(L / 24, 6, 44)), b = Math.floor(t * 10), fase = seed * 2.3 + t * 62;
  const Pt = (s: number, i: number, f: number): [number, number] => {
    const j = (hash(seed + i, b) - .5) * 2.2 * Math.sin(Math.PI * s), v = amp * Math.sin(Math.PI * s) * f + j;
    return [ax + dx * s + nx * v, ay + dy * s + ny * v + sag * 4 * s * (1 - s)];
  };
  const pasa = (f: number, ox: number, oy: number) => {
    c.beginPath();
    for (let i = 0; i <= Nn; i++) {
      const s = Math.min(i / Nn, k), q = Pt(s, i, f);
      if (i === 0) c.moveTo(q[0] + ox, q[1] + oy); else c.lineTo(q[0] + ox, q[1] + oy);
      if (s >= k) break;
    }
    c.stroke();
  };
  c.save(); c.lineCap = "round"; c.lineJoin = "round";
  if (o.sombra) { c.strokeStyle = "rgba(20,18,14,.13)"; c.lineWidth = g + 1.5; pasa(Math.cos(fase), 8, 14); }
  c.strokeStyle = col;
  if (amp > 1.2) { c.lineWidth = Math.max(g * .6, 1.6); c.globalAlpha = alfa * .26; for (let j = 1; j < 6; j++) pasa(Math.cos(fase + j * TAU / 6), 0, 0); }
  c.globalAlpha = alfa; c.lineWidth = g; pasa(Math.cos(fase), 0, 0);
  if (o.soga && g >= 8) {
    const f = Math.cos(fase), paso = g * 1.05 / L, ux = dx / L, uy = dy / L;
    c.strokeStyle = "rgba(255,226,206,.34)"; c.lineWidth = Math.max(g * .13, 1.2);
    for (let s = paso; s < k - paso * .5; s += paso) {
      const q = Pt(s, Math.round(s * Nn), f), w = g * .42;
      linea(c, q[0] - nx * w - ux * w * .9, q[1] - ny * w - uy * w * .9, q[0] + nx * w + ux * w * .9, q[1] + ny * w + uy * w * .9);
    }
  }
  const fin = Pt(k, Nn, Math.cos(fase));
  if (o.nudos !== false) { c.fillStyle = col; circulo(c, ax, ay, g * .62 + 3); if (k >= 1) circulo(c, fin[0], fin[1], g * .62 + 3); }
  c.restore();
  if (k < 1 && (o.punta ?? 0) > 0) { c.save(); c.globalAlpha = alfa; bola(c, fin[0], fin[1], o.punta!, TINTA); c.restore(); }
}

// ---------- la máscara de noche: el charco de luz del capítulo 2 ----------
type D = {
  nom: number[][]; sub: number[][]; pol: [number, number][][]; ruta: Mov[]; rutaC: Mov[]; nz: Float32Array;
  mCv: HTMLCanvasElement; mG: CanvasRenderingContext2D; mImg: ImageData; pun: Punto[];
  red: ReturnType<typeof creaRed>; xW: number[]; wW: number[]; xC: number[]; car: Car[][]; cel: { a: number; b: number; q: number }[][]; usa: boolean[][];
  polPal: { x: number; y: number; vx: number; vy: number; r: number }[]; aluP: number[]; compP: number[]; med: number[]; anc: number[]; pts: { x: number; y: number; r: number }[]; nodP: V[];
};
function ruidoEn(n: Float32Array, u: number, v: number) {
  const a = Math.floor(u), b = Math.floor(v), fx = u - a, fy = v - b;
  const i0 = a & 255, i1 = (a + 1) & 255, j0 = (b & 255) << 8, j1 = ((b + 1) & 255) << 8;
  return (n[j0 + i0] * (1 - fx) + n[j0 + i1] * fx) * (1 - fy) + (n[j1 + i0] * (1 - fx) + n[j1 + i1] * fx) * fy;
}
function mascara(c: Ctx, d: D, cx: number, cy: number, Rr: number, rui: number, t: number, alfa = 1) {
  const W = d.mCv.width, H = d.mCv.height, px = d.mImg.data, s = 1080 / W;
  let k = 0;
  for (let j = 0; j < H; j++) {
    const y = (j + .5) * s, dy = (y - cy) * 1.1;
    for (let i = 0; i < W; i++, k += 4) {
      const x = (i + .5) * s, dx = x - cx;
      const n = ruidoEn(d.nz, x * .022 + t * 2.1, y * .022 - t * 1.3);
      const q = Math.sqrt(dx * dx + dy * dy) * (1 - rui * n);
      const a = sstep(Rr * .5, Rr * 1.08, q) * alfa + (hash(i, j + Math.floor(t * 30) % 7) - .5) * .012;
      px[k] = 9; px[k + 1] = 9; px[k + 2] = 10; px[k + 3] = clamp(a) * 255;
    }
  }
  d.mG.putImageData(d.mImg, 0, 0);
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "medium";
  c.drawImage(d.mCv, 0, 0, 1080, 1920);
}

function preparar(): D {
  const cv = document.createElement("canvas"); cv.width = 1000; cv.height = 150;
  const g = cv.getContext("2d", { willReadFrequently: true })!;
  const anchos = (s: string, f: string) => { g.font = f; const A = [0]; for (let k = 1; k <= s.length; k++) A.push(g.measureText(s.slice(0, k)).width); return A; };
  const nom = CASOS.map((q) => anchos(q[0], serif(PXN))), sub = CASOS.map((q) => anchos(q[1], mono(PXS)));
  // Puntos de cada caso: de aquí sale el polvo cuando la bola lo pisa.
  const pol = CASOS.map((q, i) => {
    g.clearRect(0, 0, 1000, 150); g.fillStyle = "#000"; g.textAlign = "left"; g.textBaseline = "alphabetic";
    g.font = serif(PXN); g.fillText(q[0], 0, 80); g.font = mono(PXS); g.fillText(q[1], 0, 142);
    const px = g.getImageData(0, 0, 1000, 150).data, L: [number, number][] = [];
    for (let y = 0; y < 150; y += 2) for (let x = 0; x < 1000; x += 2) if (px[(y * 1000 + x) * 4 + 3] > 128) L.push([XT + x, YE[i] - 80 + y]);
    const r = azar(i + 3), o: [number, number][] = [];
    for (let k = 0; k < 420; k++) o.push(L[Math.floor(r() * L.length)]);
    return o;
  });
  const ruta: Mov[] = [];
  const topeN = (i: number) => YE[i] - 66 - RB, topeS = (i: number) => YE[i] + 62 + 16 + RB;
  ruta.push({ ini: -1, fin: K.lin[0][0], ax: XT, ay: topeN(0) - 90, bx: XT, by: topeN(0), alto: 0, n: 1 });
  K.lin.forEach((L: number[], i: number) => {
    const wN = nom[i][nom[i].length - 1], wS = sub[i][sub[i].length - 1], ns = CASOS[i][0].length, sh = i === 0 ? ns : Math.max(4, Math.round(ns / 3.4));
    ruta.push({ ini: L[0], fin: L[1], ax: XT, ay: topeN(i), bx: XT + wN, by: topeN(i), alto: i === 0 ? 92 : 30, n: i === 0 ? SILABAS.length : sh });
    ruta.push({ ini: L[1], fin: L[2], ax: XT + wN, ay: topeN(i), bx: XT, by: topeS(i), alto: 8, n: 1, f: ease.inOutCubic });
    ruta.push({ ini: L[2], fin: L[3], ax: XT, ay: topeS(i), bx: XT + wS, by: topeS(i), alto: 18, n: 4 });
    if (i < 5) ruta.push({ ini: L[3], fin: K.lin[i + 1][0], ax: XT + wS, ay: topeS(i), bx: XT, by: topeN(i + 1), alto: 14, n: 1, f: ease.inOutCubic });
  });
  const L5 = K.lin[5];
  ruta.push({ ini: L5[3], fin: L5[3] + .3, ax: XT + sub[5][sub[5].length - 1], ay: topeS(5), bx: REPOSO.x, by: REPOSO.y, alto: 56, n: 1, f: ease.inOutCubic });
  ruta.push({ ini: K.salto, fin: t0.nin - .02, ax: REPOSO.x, ay: REPOSO.y, bx: XC0, by: K.Y0, alto: 0, n: 1, f: ease.outCubic });
  // El mundo de las citas.
  const rutaC: Mov[] = [];
  const w1 = anchos("según el caso", serif(120)), xL = 140;
  rutaC.push({ ini: t0.seg - .34, fin: t0.seg - .02, ax: 780, ay: 730, bx: xL, by: 420 - 96, alto: 120, n: 1, f: ease.inOutCubic });
  rutaC.push({ ini: t0.seg, fin: t0.casoF, ax: xL, ay: 420 - 96, bx: xL + w1[w1.length - 1], by: 420 - 96, alto: 34, n: 3 });
  const XM = 140, YM = [928, 1048, 1168], pasoM = (ini: number, a: number, b: number): Mov => ({ ini, fin: ini + .2, ax: XM - 66, ay: YM[a] - 22, bx: XM - 66, by: YM[b] - 22, alto: 26, n: 1 });
  rutaC.push({ ini: t0.viene - .24, fin: t0.viene + .06, ax: xL + w1[w1.length - 1], ay: 420 - 96, bx: XM - 66, by: YM[0] - 22, alto: 60, n: 1, f: ease.inOutCubic });
  rutaC.push(pasoM(t0.viene + .22, 0, 1), pasoM(t0.viene + .46, 1, 2), pasoM(t0.viene + .72, 2, 0));
  rutaC.push({ ini: K.cae1 - .22, fin: K.cae1, ax: XM - 66, ay: YM[0] - 22, bx: 840, by: 590 - 86, alto: 50, n: 1, f: ease.inOutCubic });
  rutaC.push({ ini: t0.unum - .24, fin: t0.unum + .06, ax: 840, ay: 590 - 86, bx: XM - 66, by: YM[0] - 22, alto: 60, n: 1, f: ease.inOutCubic });
  rutaC.push(pasoM(t0.unum + .2, 0, 2), pasoM(t0.unum + .44, 2, 1), pasoM(t0.unum + .66, 1, 0));
  rutaC.push({ ini: K.cae2 - .22, fin: K.cae2, ax: XM - 66, ay: YM[0] - 22, bx: 720, by: 740 - 24, alto: 50, n: 1, f: ease.inOutCubic });
  // Ruido para la niebla.
  const nz = new Float32Array(65536), r = azar(2);
  for (const [cel, am] of [[8, .6], [16, .28], [32, .12]] as [number, number][]) {
    const G = new Float32Array(cel * cel).map(() => r() * 2 - 1), l = 256 / cel;
    for (let j = 0; j < 256; j++) for (let i = 0; i < 256; i++) {
      const u = i / l, v = j / l, a = Math.floor(u), b = Math.floor(v), fx = u - a, fy = v - b, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const q = (p: number, w: number) => G[((w % cel + cel) % cel) * cel + ((p % cel + cel) % cel)];
      nz[j * 256 + i] += am * lerp(lerp(q(a, b), q(a + 1, b), sx), lerp(q(a, b + 1), q(a + 1, b + 1), sx), sy);
    }
  }
  const mCv = document.createElement("canvas"); mCv.width = 135; mCv.height = 240;
  const mG = mCv.getContext("2d", { willReadFrequently: true })!, mImg = mG.createImageData(135, 240);
  // La cinta.
  const xW: number[] = [], wW: number[] = [], xC: number[] = [];
  let x = 0; g.font = serif(PXC);
  for (const p of PALS) { const w = g.measureText(p).width; xW.push(x); wW.push(w); xC.push(x + w / 2); x += w + 52; }
  // Los renglones finales: cada letra sale de una celda de la tormenta.
  const rc = azar(7), cel: { a: number; b: number; q: number }[][] = [];
  for (let j = 0; j < 22; j++) { cel.push([]); for (let i = 0; i < 13; i++) { const a = rc(), b = rc(), q = rc(); cel[j].push({ a, b, q }); } }
  const usa = cel.map((f) => f.map(() => false));
  const car: Car[][] = FRASES.map((s, j) => {
    const f = serif(PXF, j % 3 === 1), L = anchos(s, f), W = L[s.length], x0 = 540 - W / 2;
    return [...s].map((ch, k) => {
      const i = Math.min(12, Math.round(k * 12 / Math.max(s.length - 1, 1)));
      usa[j][i] = true;
      const xc = x0 + (L[k] + L[k + 1]) / 2;
      const dr = Math.hypot(xc - 540, (YF(j) - 960) * .62) / 700;
      return { ch, x: xc, i, tl: lerp(K.fija0, K.fija1, clamp(dr) ** .8) + hash(j, k) * .12 };
    });
  });
  // Polvo de las palabras del repaso.
  const rp = azar(99), polPal: D["polPal"] = [];
  for (let i = 0; i < 520; i++) { const w = PW[Math.floor(rp() * PW.length)]; polPal.push({ x: w.x + (rp() - .5) * w.px * w.s.length * .46, y: w.y - rp() * w.px * .62, vx: (rp() - .5) * 2, vy: (rp() - .5) * 2, r: rp() }); }
  const pts: D["pts"] = [], rq = azar(2013);
  for (let i = 0; i < 260; i++) { const h = CERROS[i % CERROS.length], a = rq() * TAU, q = 11 * Math.sqrt(rq()); pts.push({ x: h.x + Math.cos(a) * q, y: h.y + Math.sin(a) * q, r: rq() }); }
  const dpun = creaPuntos(), nodP: V[] = [];
  for (let i = 0; i < 18; i++) { const p = dpun[i * 7]; nodP.push([p.x, p.y]); }
  return { nom, sub, pol, ruta, rutaC, nz, mCv, mG, mImg, pun: dpun, red: creaRed(), xW, wW, xC, car, cel, usa, polPal, anc: CIT.map((s) => anchos(s, serif(88))[s.length]), med: FRASES.map((s, j) => anchos(s, serif(PXF, j % 3 === 1))[s.length]), aluP: anchos("alucinación", serif(190, true)), compP: anchos("completar", serif(214, true)), pts, nodP };
}

// ---------- 1. el documento se teclea solo ----------
function tecleo(c: Ctx, s: string, pre: number[], x: number, y: number, fuente: string, n: number, color = TINTA, popea = true) {
  const N = Math.min(s.length, Math.floor(n));
  if (N <= 0) return;
  const fijo = popea && n < s.length ? Math.max(N - 2, 0) : N;
  if (fijo > 0) texto(c, s.slice(0, fijo), x, y, { fuente, color, alin: "left" });
  for (let k = fijo; k < N; k++) {
    const e = 1 + .55 * Math.exp(-(n - k - 1) * 2.2);
    c.save(); c.translate(x + pre[k], y); c.scale(e, e); texto(c, s[k], 0, 0, { fuente, color, alin: "left" }); c.restore();
  }
}

function estampa(c: Ctx, s: string, pre: number[], x: number, y: number, fuente: string, t: number, a: number, b: number) {
  const st = (b - a) / SILABAS.length, k = Math.floor((t - a) / st);
  if (t >= b) { texto(c, s, x, y, { fuente, color: TINTA, alin: "left" }); return; }
  if (k < 0) return;
  const N = SILABAS[k], k0 = k > 0 ? SILABAS[k - 1] : 0, age = t - (a + k * st), e = 1 + .34 * Math.exp(-age * 15);
  if (k0 > 0) texto(c, s.slice(0, k0), x, y, { fuente, color: TINTA, alin: "left" });
  c.save(); c.translate(x + pre[k0], y); c.scale(e, e); texto(c, s.slice(k0, N), 0, 0, { fuente, color: TINTA, alin: "left" }); c.restore();
}

function pagina(c: Ctx, a: number) {
  if (a <= .01) return;
  c.save(); c.globalAlpha = a * .62; c.strokeStyle = ACENTO; c.lineWidth = 2.4;
  linea(c, 112, -200, 112, 2200); linea(c, 122, -200, 122, 2200);
  c.globalAlpha = a * .4; c.strokeStyle = GRIS; c.lineWidth = 2; linea(c, 990, -200, 990, 2200);
  c.globalAlpha = a; for (let i = 0; i < 6; i++) texto(c, String(i + 1), 72, YE[i], { fuente: mono(34), color: GRIS });
  c.restore();
}

function desmorona(c: Ctx, d: D, i: number, t: number) {
  const age = t - K.golpes[i]; if (age < 0 || age > 1.7) return;
  const ix = xCae(K.pisos[i]), r = azar(i * 7 + 3);
  c.fillStyle = TINTA;
  for (const [x, y] of d.pol[i]) {
    const q = r(), w = r(), dx = x - ix, e = age - Math.abs(dx) / 1700;
    if (e <= 0) continue;
    c.globalAlpha = clamp(1.3 - e * 1.1) * .92;
    c.fillRect(x + (dx * .55 + (q - .5) * 240) * e, y + (-260 * w) * e + 1500 * e * e, 3.4, 3.4);
  }
  c.globalAlpha = 1;
}

function caso(c: Ctx, t: number, d: D, i: number) {
  const L = K.lin[i], h = K.golpes[i], age = t - h, y = YE[i], ys = y + 62;
  const nN = prog(t, L[0], L[1]) * CASOS[i][0].length, nS = prog(t, L[2], L[3]) * CASOS[i][1].length;
  if (age >= 0) {
    desmorona(c, d, i, t);
    const g = 1700 * age ** 1.15, ix = xCae(K.pisos[i]);
    if (g < 1400) {
      const sal = 12 * Math.exp(-age * 8) * Math.sin(age * 40);
      c.save(); c.beginPath(); c.rect(-300, -300, ix - g + 300, 2600); c.rect(ix + g, -300, 2000, 2600); c.clip();
      hueco(c, CASOS[i][0], XT, y + sal, serif(PXN), TINTA, 1, 2.2);
      hueco(c, CASOS[i][1], XT, ys + sal, mono(PXS), TINTA, 1, 1.5);
      c.restore();
    }
    return;
  }
  // Marcador: primero nombres, luego fechas, luego números.
  for (let q = 0; q < 3; q++) {
    const a = [t0.nom, t0.fec, t0.cit][q] + .22 + i * .06, k = ease.outCubic(prog(t, a, a + .2));
    if (k <= 0) continue;
    const su = d.sub[i];
    if (q === 0) { c.fillStyle = ACENTO; c.fillRect(XT, y + 14, d.nom[i][d.nom[i].length - 1] * k, 6); }
    else {
      const x0 = q === 1 ? XT : XT + su[13], w = q === 1 ? su[10] : su[su.length - 1] - su[13];
      c.fillStyle = "rgba(192,68,42,.26)"; c.fillRect(x0 - 6, ys - 35, (w + 12) * k, 46);
    }
  }
  if (i === 0) estampa(c, CASOS[0][0], d.nom[0], XT, y, serif(PXN), t, L[0], L[1]);
  else tecleo(c, CASOS[i][0], d.nom[i], XT, y, serif(PXN), nN);
  tecleo(c, CASOS[i][1], d.sub[i], XT, ys, mono(PXS), nS, TINTA, false);
}

function globo(c: Ctx, x: number, y: number, w: number, h: number, px: number, py: number, k: number, a = 1) {
  if (k <= .01 || a <= .01) return;
  const ax = px < x ? x - w * .28 : x + w * .28, ab = y + h / 2;
  c.save(); c.globalAlpha = a; c.translate(lerp(px, x, k), lerp(py, y, k)); c.scale(k, k); c.translate(-x, -y);
  c.beginPath(); c.roundRect(x - w / 2, y - h / 2, w, h, 44);
  c.moveTo(ax - 34, ab); c.lineTo(lerp(ax, px, .62), lerp(ab, py, .62)); c.lineTo(ax + 34, ab);
  c.fillStyle = PAPEL; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 5; c.lineJoin = "round"; c.stroke();
  c.fillStyle = PAPEL; c.fillRect(ax - 30, ab - 6, 60, 10);
  c.restore();
}

function sello(c: Ctx, t: number) {
  const a = t - K.sello; if (a < -.14) return;
  const k = a < 0 ? 1 + (-a / .14) * 1.6 : 1 + .06 * Math.exp(-a * 11) * Math.cos(a * 42);
  c.save(); c.translate(540, 760); c.rotate(-.13); c.scale(k, k); c.globalAlpha = a < 0 ? smooth((a + .14) / .14) * .6 : 1;
  c.strokeStyle = ACENTO; c.lineWidth = 13; c.strokeRect(-372, -128, 744, 256); c.lineWidth = 3.5; c.strokeRect(-350, -106, 700, 212);
  texto(c, "MULTA", 0, 62, { fuente: mono(170), color: ACENTO });
  const r = azar(9); c.fillStyle = PAPEL;
  for (let i = 0; i < 300; i++) { const x = (r() - .5) * 760, y = (r() - .5) * 270, s = 1.6 + r() * 5; c.fillRect(x, y, s, s * (.5 + r())); }
  c.restore();
}

function posBolaDoc(t: number, d: D): P2 {
  const G = K.G, Tr = K.tramos;
  if (t >= Tr[0][0] && t < K.golpes[6]) {
    let i = 0; for (let q = 0; q < Tr.length; q++) if (t >= Tr[q][0]) i = q;
    const e = t - Tr[i][0], y = Tr[i][1] + Tr[i][2] * e + .5 * G * e * e;
    return { x: xCae(y), y };
  }
  if (t >= K.golpes[6]) {
    const bx = xCae(K.suelo), s = K.suelo - RB;
    let x = bx, y = s - caida(t - K.golpes[6] + .447, 3, .42, 30).z * 60;
    const ini = t0.gpt2 - .3, fin = t0.gpt2 + .18, u = prog(t, ini, fin);
    if (t >= ini) { const e = ease.inOutCubic(u); x = lerp(bx, 276, e); y = lerp(s, 1400, e) - 200 * 4 * u * (1 - u); }
    if (t >= K.sello) { const a = t - K.sello; y -= 120 * Math.exp(-a * 4.6) * Math.abs(Math.sin(a * 8.5)); }
    return { x, y };
  }
  return enRuta(d.ruta, t);
}

function documento(c: Ctx, t: number, d: D) {
  polvoDigitos(c, t, TINTA, 1);
  const abre = ease.inOutCubic(prog(t, 1.42, 3.2));
  const b = posBolaDoc(t, d);
  const G = K.golpes.slice(0, 6).map((g: number, i: number) => [g, 7 + i * 2] as [number, number]);
  G.push([K.golpes[6], 26], [K.sello, 38]);
  const s = sacudida(t, G);
  c.save();
  const z = lerp(2.25, 1, abre), x = lerp(clamp(b.x, 252, 860), 540, abre), y = lerp(YE[0] - 42, 960, abre);
  const stS = (K.lin[0][1] - K.lin[0][0]) / SILABAS.length, ageS = ((t - K.lin[0][0]) % stS + stS) % stS, carro = t < K.lin[0][1] ? 11 * Math.exp(-ageS * 15) : 0;
  const fN = smooth(prog(t, t0.nom - .1, t0.nom + .3)), fF = smooth(prog(t, t0.fec - .1, t0.fec + .3)), fC = smooth(prog(t, t0.cit - .1, t0.cit + .3)), fS = smooth(prog(t, K.salto - .24, K.salto + .1));
  const zf = lerp(lerp(1, 1.2, fN), 1, fS), xf = lerp(lerp(lerp(lerp(540, 480, fN), 410, fF), 690, fC), 540, fS), yf = lerp(lerp(lerp(lerp(960, 760, fN), 950, fF), 1130, fC), 960, fS);
  const lad = 1 - abre;
  c.translate(540 + s.x, 960 + s.y + carro); c.rotate(-.15 * lad); c.transform(1, 0, -.2 * lad, 1, 0, 0); c.scale(z * zf, z * zf); c.translate(-lerp(x, xf, abre), -lerp(y, yf, abre));
  pagina(c, 1);
  const aTit = smooth(prog(t, 1.7, 2.3)) * (1 - smooth(prog(t, K.golpes[6], K.golpes[6] + .4)));
  texto(c, "Casos citados", XT, 306, { fuente: serif(96), color: TINTA, alin: "left", alfa: aTit });
  for (let i = 0; i < 6; i++) caso(c, t, d, i);
  // Quién está tecleando.
  const aG = smooth(prog(t, t0.gpt, t0.gpt + .18)) * (1 - smooth(prog(t, K.salto - .12, K.salto + .1)));
  texto(c, "ChatGPT", 250, 1528, { fuente: serif(100, true), color: ACENTO, alin: "left", alfa: aG });
  // Ninguno existía.
  if (t > K.golpes[6] - .1 && t < t0.pre + .1) {
    const a = 1 - smooth(prog(t, t0.pre - .25, t0.pre + .05));
    c.save(); c.globalAlpha = a;
    rotulo(c, t, K.golpes[6] - .06, 1e9, "Ninguno", 800, 196, TINTA);
    rotulo(c, t, K.golpes[6] + .1, 1e9, "existía", 1010, 196, ACENTO, true);
    c.restore();
  }
  // ¿Son reales? / Sí.
  const sal = 1 - smooth(prog(t, K.sello - .15, K.sello - .03));
  const k1 = pop(t, t0.pre + .02, .28), k2 = pop(t, t0.si - .06, .3, 2.2);
  globo(c, 470, 470 + 6 * vaiven(t, 2.3), 680, 216, 240, 680, k1, sal);
  if (k1 > .5) texto(c, "¿Son reales?", 470, 505 + 6 * vaiven(t, 2.3), { fuente: serif(112), color: TINTA, alfa: sal * smooth(prog(k1, .5, 1)) });
  const fl = 6 * vaiven(t, 2.3), fl2 = 7 * vaiven(t, 2.9, 1);
  texto(c, "el abogado", 150, 706 + fl, { fuente: serif(84, true), color: GRIS, alin: "left", alfa: sal * smooth(prog(t, t0.pre + .1, t0.pre + .3)) });
  texto(c, "ChatGPT", 276, 1524, { fuente: serif(84, true), color: ACENTO, alfa: smooth(prog(t, t0.gpt2 + .1, t0.gpt2 + .3)) });
  globo(c, 640, 1200 + fl2, 450, 300, 300, 1450, k2);
  if (t >= t0.si - .02) vacia(c, "Sí.", 640, 1272 + 7 * vaiven(t, 2.9, 1), serif(216), 216, TINTA, prog(t, t0.lo - .36, t0.lo - .02), 1, "center");
  sello(c, t);
  // La bola.
  if (t >= t0.gpt2 - .3) sombra(c, b.x, Math.min(b.y + 60, K.suelo + 8), 60, .22);
  const hb = (b as { h?: number }).h ?? 0, rD = lerp(1.5, 1, abre) * RB;
  if (t < t0.nin - .02) sombra(c, b.x + hb * .3, b.y + rD + hb * .62, rD * 1.7 + hb * .22, .36 / (1 + hb * .022));
  // La hoja está inclinada; la bola no: una esfera se ve redonda desde cualquier lado.
  const rB = t < K.golpes[6] ? rD : lerp(RB, 34, smooth(prog(t, K.golpes[6], K.golpes[6] + .3)));
  const q = c.getTransform().transformPoint(new DOMPoint(b.x, b.y));
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); bola(c, q.x, q.y, rB * z * zf * 1.03); c.restore();
  c.restore();
}

// ---------- 2. el negro: para mentir necesitas saber ----------
const YN = 1190, XBN = 410, XFN = 800;
function bandera(c: Ctx, x: number, y: number, k: number, t: number, alto = 250) {
  if (k <= .01) return;
  const ond = Math.sin(t * 5.1) * 5, h = alto * k;
  c.fillStyle = ACENTO; c.fillRect(x - 3, y - h, 6, h);
  c.beginPath(); c.moveTo(x + 3, y - h); c.quadraticCurveTo(x + 48, y - h + 10 + ond, x + 92, y - h + 38 + ond * .4); c.quadraticCurveTo(x + 44, y - h + 54 - ond, x + 3, y - h + 76); c.closePath(); c.fill();
}
function bolaNegro(t: number): P2 {
  const ini = t0.para + .02, h = 2.2;
  const a = caida(t - ini, h, .44, 30).z * 60;
  let x = XBN;
  const y = YN - 40 - (t >= ini ? a : 1e4);
  const hop = prog(t, t0.mtr + .22, t0.mtr + .54);
  x = lerp(XBN, 196, ease.inOutCubic(hop));
  return { x, y: y - Math.sin(hop * Math.PI) * 130 };
}
function negro(c: Ctx, t: number) {
  polvoDigitos(c, t, LUZ, .8);
  const r = azar(3);
  for (let i = 0; i < 70; i++) {
    const a = r() * 6.3, v = 200 + r() * 620, f = (t * .35 + r()) % 1;
    c.fillStyle = LUZ; c.globalAlpha = (1 - f) * .24 * r();
    c.fillRect(540 + Math.cos(a) * (v * f + 80), 900 + Math.sin(a) * (v * f + 80), 3, 3);
  }
  c.globalAlpha = 1;
  const sube = ease.inOutCubic(prog(t, t0.para - .32, t0.para + .16));
  const yA = lerp(800, 236, sube), yB = lerp(1060, 418, sube), es = lerp(1, .66, sube), al = lerp(1, .55, sube);
  texto(c, "eso no fue una", 540, yA, { fuente: serif(lerp(112, 78, sube)), color: LUZ, alfa: al * smooth(prog(t, t0.pero + .02, t0.pero + .18)) });
  if (t >= t0.ment - .06) {
    const z = pop(t, t0.ment - .06, .24, 1.5) * es;
    c.save(); c.translate(540, yB); c.scale(z, z);
    texto(c, "mentira", 0, 0, { fuente: serif(290, true), color: LUZ, alfa: al });
    traza(c, [[-410, -36], [-120, -84], [160, -66], [420, -128]], ease.outCubic(prog(t, t0.mentF - .06, t0.mentF + .1)), ACENTO, 15, t, 3);
    c.restore();
  }
  // La bandera de la verdad, la del capítulo 1.
  const aL = smooth(prog(t, t0.para - .32, t0.para));
  if (aL > 0) {
    c.save(); c.globalAlpha = aL; c.strokeStyle = LUZ; c.lineWidth = 4; linea(c, 80, YN, 1000, YN); c.restore();
    const q = K.quita, qa = prog(t, q, q + .7), b = bolaNegro(t);
    const kf = clamp(resorte(t - t0.para + .04, 3, .5), 0, 1.15) * (1 - smooth(qa * 1.4));
    bandera(c, XFN, YN, kf, t);
    // Polvo de bandera: la verdad no estaba en ningún lado.
    if (qa > 0 && qa < 1) {
      const r2 = azar(5); c.fillStyle = ACENTO;
      for (let i = 0; i < 90; i++) {
        const y0 = YN - r2() * 250, x0 = XFN + (y0 < YN - 170 ? r2() * 90 : (r2() - .5) * 8), vy = 60 + r2() * 160, vx = (r2() - .5) * 90;
        c.globalAlpha = (1 - qa) * .9; c.fillRect(x0 + vx * qa, y0 - vy * qa - 60 * qa * qa, 4, 4);
      }
      c.globalAlpha = 1;
    }
    // Sabe dónde está: la línea punteada la conserva aunque se aleje.
    const kl = smooth(prog(t, t0.para + .36, t0.para + .56)) * (1 - smooth(prog(t, q + .05, q + .42)));
    if (kl > 0) {
      c.save(); c.globalAlpha = kl; c.strokeStyle = LUZ; c.lineWidth = 3.5; c.setLineDash([3, 18]); c.lineCap = "round"; c.lineDashOffset = -t * 40;
      c.beginPath(); c.moveTo(b.x, b.y - 30); c.quadraticCurveTo((b.x + XFN) / 2, YN - 330, XFN, YN - 248); c.stroke(); c.restore();
    }
    rotulo(c, t, t0.ver - .04, q + .1, "la verdad", YN + 130, 112, "#E9896C", true, XFN - 80);
    if (t > t0.para + .02) {
      const ha = c.createRadialGradient(b.x, b.y, 30, b.x, b.y, 150);
      ha.addColorStop(0, "rgba(237,234,227,.3)"); ha.addColorStop(1, "rgba(237,234,227,0)");
      c.fillStyle = ha; c.beginPath(); c.arc(b.x, b.y, 150, 0, TAU); c.fill();
      rimBola(c, b.x, b.y, 40, 1);
    }
  }
}

// ---------- 3. la palabra más creíble, una tras otra ----------
const PALS = ["la", "palabra", "más", "creíble,", "una", "tras", "otra."], PXC = 196, YC = 1090;
const PROB = [.56, .27, .17];
const ESC = 58;                                           // cada palabra sube un escalón
function cinta(c: Ctx, t: number, d: D) {
  polvoDigitos(c, t, TINTA, 1);
  const sale = ease.inCubic(prog(t, t0.seg - .4, t0.seg - .06));
  let cx = d.xC[0], cs = 0;
  for (let i = 1; i < PALS.length; i++) { const q = ease.inOutCubic(prog(t, K.pal[i] - .24, K.pal[i] + .04)); cx = lerp(cx, d.xC[i], q); cs = lerp(cs, i, q); }
  const off = 540 - cx - sale * 1700, offY = cs * ESC;
  const sh = sacudida(t, K.pal.map((g: number) => [g, 6] as [number, number]));
  c.save(); c.translate(sh.x, sh.y);
  rotulo(c, t, t0.rec + .1, K.pal[0] - .3, "Recuerda", 640, 150, TINTA, true);
  rotulo(c, t, t0.rec + .42, K.pal[0] - .3, "cómo funciona", 790, 112, TINTA);
  const yP = (i: number) => YC - i * ESC + offY;
  for (let i = 0; i < PALS.length; i++) {
    const a = K.pal[i]; if (t < a - .1) continue;
    // La palabra cae, y cede bajo el peso de la bola: es un escalón, no un texto.
    const q = ease.outBack(prog(t, a - .1, a + .02), 2.2), cede = t > a ? 22 * Math.exp(-(t - a) * 7) * Math.cos((t - a) * 19) : 0;
    texto(c, PALS[i], off + d.xW[i], yP(i) - (1 - q) * 300 + cede, { fuente: serif(PXC), color: TINTA, alin: "left", alfa: smooth(prog(t, a - .1, a - .04)) });
  }
  const P = (i: number) => ({ x: 540 - cx + d.xW[i] + d.wW[i] / 2, y: yP(i) - 158 });
  let bx = 196, by = YN - 40;
  const ini0 = K.pal[0] - .34, u0 = prog(t, ini0, K.pal[0]);
  if (t >= ini0) { bx = lerp(196, P(0).x, ease.inOutCubic(u0)); by = lerp(YN - 40, P(0).y, ease.inOutCubic(u0)) - 260 * 4 * u0 * (1 - u0) * .6; }
  for (let i = 1; i < PALS.length; i++) {
    const u = prog(t, K.pal[i - 1] + .02, K.pal[i]);
    if (t >= K.pal[i - 1] + .02) { const a = P(i - 1), b = P(i), e = ease.inOutCubic(u); bx = lerp(a.x, b.x, e); by = lerp(a.y, b.y, e) - 150 * 4 * u * (1 - u); }
  }
  const sf = ease.inOutCubic(prog(t, K.pal[6] + .34, t0.seg - .36));
  if (t > K.pal[6] + .34) { bx = lerp(bx, 780, sf); by = lerp(by, 730, sf); }
  c.restore();
  if (t < t0.seg - .34) { sombraBola(c, bx, by, 34, .26); bola(c, bx, by, 34); }
}

// ---------- 4. la cita se arma sola ----------
const LX = 140, Y1 = 420, Y2 = 590, Y3 = 740, XMN = 140, YMN = [928, 1048, 1168];
const M1 = ["Fulano vs. Mengano", "Zutano vs. Perengano", "Mengana vs. Banco X"], M2 = ["n.º 123-456", "n.º 222-333", "n.º 777-888"];
function menu(c: Ctx, t: number, L: string[], ini: number, cae: number, fu: (j: number) => string) {
  L.forEach((s, j) => {
    const a = ini + j * .09, al = smooth(prog(t, a - .04, a + .12)) * (j === 0 ? 1 : 1 - smooth(prog(t, cae - .24, cae - .08)));
    if (al <= 0 || (j === 0 && t >= cae - .22)) return;
    texto(c, s, XMN, YMN[j], { fuente: fu(j), color: j === 0 ? TINTA : GRIS, alin: "left", alfa: al });
    c.save(); c.globalAlpha = al; c.fillStyle = j === 0 ? ACENTO : "#BDBAB1"; c.fillRect(XMN, YMN[j] + 22, PROB[j] * 800 * ease.outCubic(prog(t, a, a + .3)), 11); c.restore();
  });
}
function vuelaFila(c: Ctx, t: number, s: string, cae: number, y: number, pf: (px: number) => string, px0: number, px1: number) {
  if (t < cae - .22) return;
  const u = ease.inOutCubic(prog(t, cae - .22, cae)), b = t > cae ? 7 * Math.exp(-(t - cae) * 8) * Math.sin((t - cae) * 34) : 0;
  texto(c, s, lerp(XMN, LX, u), lerp(YMN[0], y, u) + b, { fuente: pf(Math.round(lerp(px0, px1, u))), color: TINTA, alin: "left" });
}
function cita(c: Ctx, t: number, d: D) {
  const salta = ease.inCubic(prog(t, t0.aeso - .42, t0.aeso - .04)) * -1000;
  c.save(); c.translate(0, salta);
  const clicks = [t0.todo + .1, t0.todo + .27, t0.todo + .44];
  const drena = prog(t, t0.nada + .06, t0.nada + .92);
  const baja = (i: number) => (t > clicks[i] ? 9 * Math.exp(-(t - clicks[i]) * 9) * Math.sin((t - clicks[i]) * 36) : 0);
  // Tres renglones: el primero se teclea, los otros dos caen de un menú.
  const s1 = "según el caso", n1 = prog(t, t0.seg, t0.casoF) * s1.length;
  if (t < t0.nada) texto(c, s1.slice(0, Math.floor(n1)), LX, Y1 + baja(0), { fuente: serif(120), color: TINTA, alin: "left" });
  else vacia(c, s1, LX, Y1, serif(120), 120, TINTA, drena);
  if (t < t0.todo + .9) { menu(c, t, M1, t0.viene - .06, K.cae1, (j) => serif(84, j > 0)); menu(c, t, M2, t0.unum - .06, K.cae2, () => mono(68)); }
  if (t < t0.nada) {
    vuelaFila(c, t, M1[0], K.cae1, Y2 + baja(1), (p) => serif(p), 84, 110);
    vuelaFila(c, t, M2[0], K.cae2, Y3 + baja(2), (p) => mono(p), 68, 86);
  } else {
    vacia(c, M1[0], LX, Y2, serif(110), 110, TINTA, drena * 1.15 - .1);
    vacia(c, M2[0], LX, Y3, mono(86), 86, TINTA, drena * 1.2 - .2);
  }
  // Todo encaja: el marco se cierra.
  const fk = prog(t, t0.todo + .06, t0.todo + .66);
  traza(c, [[100, 300], [990, 300], [990, 800], [100, 800], [100, 300]], fk, TINTA, 6, t, 3.5);
  // Goteo: la tinta no tenía de dónde agarrarse.
  if (t > t0.nada) {
    const r = azar(17); c.fillStyle = TINTA;
    for (let i = 0; i < 34; i++) {
      const x = LX + r() * 720, y0 = [Y1, Y2, Y3][i % 3] + 6, a = t0.nada + .1 + r() * .8, e = t - a, w = 3 + r() * 5;
      if (e <= 0) continue;
      const y = y0 + 1400 * e * e;
      if (y > 2000) continue;
      c.save(); c.translate(x, y); c.scale(1, 1 + clamp(e * 5, 0, 2.4)); c.beginPath(); c.arc(0, 0, w, 0, TAU); c.fill(); c.restore();
    }
  }
  c.restore();
  // La bola es el botón que elige.
  if (t < t0.todo + .12) {
    const b = enRuta(d.rutaC, t);
    sombraBola(c, b.x, b.y, 30, .24); bola(c, b.x, b.y, 30);
  } else bola(c, 720, 716 + salta, 30);
  rotulo(c, t, t0.desp, t0.seg + .7, "Después de", 216, 104, GRIS, true);
  rotulo(c, t, t0.sua - .05, t0.desp2 - .12, "suena a caso", 1400, 128, ACENTO, true);
  rotulo(c, t, t0.sub - .05, t0.todo - .12, "suena a cita", 1400, 128, ACENTO, true);
  const f = t0.aeso - .4;
  rotulo(c, t, t0.todo, f, "Todo encaja.", 1056, 134, TINTA);
  rotulo(c, t, t0.nada, f, "Nada se consultó.", 1236, 118, ACENTO, true);
}

// ---------- 5. alucinación / completar ----------
function ondulada(c: Ctx, d: D, t: number, y: number, gris: number) {
  const s = "alucinación", W = d.aluP[s.length], x0 = 540 - W / 2, f = serif(190, true), k0 = smooth(prog(t, t0.alu - .08, t0.alu + .12)), calma = 1 - gris;
  const col = gris > 0 ? `rgb(${Math.round(lerp(17, 176, gris))},${Math.round(lerp(17, 173, gris))},${Math.round(lerp(17, 165, gris))})` : TINTA;
  for (let i = 0; i < s.length; i++) {
    const x = x0 + d.aluP[i], dy = 16 * calma * Math.sin(t * 6.4 + i * .8), dx = 7 * calma * Math.sin(t * 4.3 + i * 1.3);
    texto(c, s[i], x + dx * 2.2, y + dy * -1.3, { fuente: f, color: ACENTO, alin: "left", alfa: k0 * .28 * calma });
    texto(c, s[i], x + dx, y + dy, { fuente: f, color: col, alin: "left", alfa: k0 });
  }
}
function aluc(c: Ctx, t: number, d: D) {
  const sal = 1 - smooth(prog(t, t0.porq - .22, t0.porq + .08));
  if (sal <= 0) return;
  c.save(); c.globalAlpha = sal;
  rotulo(c, t, t0.aeso - .02, 1e9, "A eso le llaman", 560, 108, TINTA);
  const gris = smooth(prog(t, t0.yo + .1, t0.yo + .4));
  ondulada(c, d, t, 790, gris);
  traza(c, [[116, 776], [400, 738], [700, 754], [968, 712]], ease.outCubic(prog(t, t0.yo + .1, t0.yo + .36)), TINTA, 11, t, 3);
  rotulo(c, t, t0.yo, 1e9, "Yo le diría", 1010, 108, TINTA);
  const s = "completar", W = d.compP[s.length], x0 = 540 - W / 2, y = 1260, f = serif(214, true), n = prog(t, t0.comp - .02, t0.comp + .44) * 7, listo = t >= t0.compF - .1;
  if (t >= t0.comp - .02) {
    const N = Math.min(7, Math.floor(n) + 1);
    texto(c, s.slice(0, N), x0, y, { fuente: f, color: ACENTO, alin: "left" });
    if (N >= 7) texto(c, "ar", x0 + d.compP[7], y, { fuente: f, color: listo ? ACENTO : "#BDBAB1", alin: "left" });
    const bx = x0 + d.compP[N], u = n % 1, by = y - 196 - Math.abs(Math.sin(u * Math.PI)) * 40;
    const hb = listo ? caida(t - t0.compF + .1, 1.6, .4, 30).z * 60 : 0;
    const xF = lerp(bx, x0 + W + 34, smooth(prog(t, t0.compF - .22, t0.compF - .1)));
    sombraBola(c, xF, listo ? y - 26 - hb : by, 28, .24); bola(c, xF, listo ? y - 26 - hb : by, 28);
  }
  c.restore();
}

// ---------- 6. no hay archivo: hay un mapa ----------
const AQ = { x: 300, y: 430, w: 460, h: 880, dx: 92, dy: -66 }, HC = AQ.h / 4;
const CENT = [[370, 620], [740, 800], [350, 1120], [730, 1330]] as [number, number][];
const px2m = (x: number, y: number): [number, number] => [(x - 540) / 41.67, (960 - y) / 41.67];
const CERROS: { x: number; y: number }[] = CENT.map(([x, y]) => { const [a, b] = px2m(x, y); return { x: a, y: b }; });
function anilloPts(cx: number, cy: number, Rr: number, sem: number, n: number) {
  const o: [number, number][] = [], a1 = hash(sem, 1) * 6, a2 = hash(sem, 2) * 6, a3 = hash(sem, 3) * 6;
  for (let j = 0; j <= n; j++) {
    const th = j / n * TAU, q = Rr * (1 + .1 * Math.sin(2 * th + a1) + .07 * Math.sin(3 * th + a2) + .035 * Math.sin(5 * th + a3));
    o.push([cx + Math.cos(th) * q, cy + Math.sin(th) * q]);
  }
  return o;
}
function morfoRect(c: Ctx, x: number, y: number, w: number, h: number, cx: number, cy: number, Rr: number, sem: number, k: number, t: number, g = 3) {
  const n = 64, An = anilloPts(cx, cy, Rr, sem, n), x0 = x + w / 2, y0 = y + h / 2, b = Math.floor(t * 10);
  c.beginPath();
  for (let j = 0; j <= n; j++) {
    const th = j / n * TAU, ct = Math.cos(th), st = Math.sin(th), r = Math.min(w / 2 / Math.max(Math.abs(ct), 1e-3), h / 2 / Math.max(Math.abs(st), 1e-3));
    const px = lerp(x0 + ct * r, An[j][0], k) + (hash(j, b) - .5) * 2.4, py = lerp(y0 + st * r, An[j][1], k) + (hash(j + 70, b) - .5) * 2.4;
    if (j === 0) c.moveTo(px, py); else c.lineTo(px, py);
  }
  c.closePath(); c.lineWidth = g; c.strokeStyle = TINTA; c.stroke();
}
function archivero(c: Ctx, t: number, dy: number) {
  const { x, w, h, dx: ox, dy: oy } = AQ, y = AQ.y + dy;
  c.lineJoin = "round"; c.strokeStyle = TINTA; c.lineWidth = 5;
  c.fillStyle = "#E4E1D8"; c.beginPath(); c.moveTo(x + w, y); c.lineTo(x + w + ox, y + oy); c.lineTo(x + w + ox, y + h + oy); c.lineTo(x + w, y + h); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = "#EFECE4"; c.beginPath(); c.moveTo(x, y); c.lineTo(x + ox, y + oy); c.lineTo(x + w + ox, y + oy); c.lineTo(x + w, y); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = "#F7F5EF"; c.fillRect(x, y, w, h); c.strokeRect(x, y, w, h);
  for (let i = 3; i >= 0; i--) {
    const a = K.caj[i], ab = ease.outBack(prog(t, a, a + .15), 1.3), ci = i < 3 ? ease.inCubic(prog(t, a + .28, a + .4)) : 0, k = ab * (1 - ci);
    const px = -ox * 1.25 * k, py = -oy * 1.25 * k, yi = y + i * HC;
    if (k > .02) {
      c.fillStyle = "#2B2A28"; c.beginPath(); c.moveTo(x + 10, yi + 8); c.lineTo(x + w - 10, yi + 8); c.lineTo(x + w - 10 + px, yi + 8 + py); c.lineTo(x + 10 + px, yi + 8 + py); c.closePath(); c.fill();
      c.lineWidth = 3; c.stroke();
    }
    c.fillStyle = "#F7F5EF"; c.lineWidth = 5;
    c.fillRect(x + 10 + px, yi + 8 + py, w - 20, HC - 16); c.strokeRect(x + 10 + px, yi + 8 + py, w - 20, HC - 16);
    const lx = x + w / 2 + px, ly = yi + HC * .4 + py;
    c.lineWidth = 3; c.strokeRect(lx - 86, ly - 28, 172, 56);
    texto(c, "hechos", lx, ly + 12, { fuente: mono(34), color: TINTA });
    c.lineWidth = 7; c.lineCap = "round"; linea(c, lx - 50, ly + 64, lx + 50, ly + 64);
    // Polvo: lo único que había.
    if (k > .3) {
      const r = azar(i + 40), age = t - a; c.fillStyle = "#8C8A83";
      for (let q = 0; q < 16; q++) { const fx = x + 30 + r() * (w - 60), v = 40 + r() * 60; c.globalAlpha = clamp(1 - age * 2.5) * .7; c.fillRect(fx + px * .5, yi + py * .4 - age * v, 4, 4); }
      c.globalAlpha = 1;
    }
  }
}
const LEJOS = [[2, -24, 1.5, 7], [-9, 22, 1.2, 6], [-21, 8, 1.9, 6], [20, 12, 2.1, 7], [-20, -17, 1.6, 7], [19, -20, 1.7, 6], [8, 38, 1.9, 8], [-8, -40, 2, 8], [32, -6, 1.5, 7], [-33, 1, 1.5, 7], [3.2, -2.4, 1.3, 2.4], [-2.6, 3.4, .9, 2], [7, 1, .8, 2.2], [-5.5, -6.6, .9, 2.4]];
function mapaCam(v: Partial<Vista>) { return camara({ tx: 0, ty: 0, tz: 0, yaw: 0, pitch: 1.55, dist: 30, ...v }, 540, 960, 1250); }
function fuentesMapa(amp: number): Fuente[] {
  return [...CERROS.map((h, i) => ({ x: h.x, y: h.y, a: 2.3 * amp * (i % 2 ? .86 : 1.05), s: 5.6 })), ...LEJOS.map((h) => ({ x: h[0], y: h[1], a: h[2] * amp, s: h[3] }))];
}
function pintaMapa(c: Ctx, cam: Cam, d: D, alfa: number, amp: number, t: number, col = "17,17,17") {
  if (alfa <= .01) return;
  const v = cam.v, Rv = v.dist * .8 + 3;
  curvas(c, cam, fuentesMapa(amp), {
    x0: v.tx - Rv, x1: v.tx + Rv, y0: v.ty - Rv * 1.3, y1: v.ty + Rv * 1.7, paso: v.dist > 40 ? .6 : v.dist > 22 ? .42 : .24,
    niveles: [.12, .26, .42, .6, .8, 1.02, 1.26, 1.52, 1.8, 2.1, 2.42, 2.76], hundir: .2,
    tinta: (_, i) => `rgba(${col},${alfa * (i % 3 === 2 ? .72 : .4)})`, grosor: (i) => (i % 3 === 2 ? 2.8 : 1.6),
  });
  c.fillStyle = `rgba(${col},1)`;
  for (const p of d.pts) {
    const q = cam.p(p.x + Math.sin(t * .5 + p.r * 6) * .06, p.y); if (!q) continue;
    const s = clamp(q.s * .08, 2, 5.5); c.globalAlpha = alfa * clamp(q.s / 30, .3, .75); c.fillRect(q.x - s / 2, q.y - s / 2, s, s);
  }
  c.globalAlpha = 1;
}
const ETIQ = [{ s: "caso", x: -7.4, y: 9.2 }, { s: "juez", x: 3.2, y: 6.6 }, { s: "abogado", x: 3.8, y: -2.6 }, { s: "fecha", x: -7.6, y: -4.2 }, { s: "cita", x: 4.4, y: -9.8 }];
function etiquetas(c: Ctx, cam: Cam, t: number, alfa: number) {
  ETIQ.forEach((e, i) => {
    const a = K.etq[i], p = cam.p(e.x, e.y); if (!p || t < a - .02) return;
    const k = pop(t, a - .02, .22) * alfa, r = .3 * p.s;
    c.save(); c.globalAlpha = alfa; sombra(c, p.x, p.y + r * .7, r * 2.2, .3); bola(c, p.x, p.y, r * k); c.restore();
    texto(c, e.s, p.x, p.y - r - 26, { fuente: serif(84, true), color: TINTA, alfa: alfa * smooth(prog(t, a, a + .14)) });
  });
}
function archivo(c: Ctx, t: number, d: D) {
  const up = t < t0.porq + .52 ? (1 - ease.outExpo(prog(t, t0.porq + .05, t0.porq + .52))) * 1500 : 0;
  const b = t > t0.porq + .3 ? 12 * Math.exp(-(t - t0.porq - .3) * 8) * Math.sin((t - t0.porq - .3) * 30) : 0;
  const mm = (i: number) => ease.inOutCubic(prog(t, t0.hay - .14 + i * .05, t0.hay + .72 + i * .05));
  const m0 = mm(0), kFin = smooth(prog(t, t0.hay + .6, t0.hay + 1.1));
  const cam = mapaCam({});
  rotulo(c, t, t0.arch - .05, t0.hay - .2, "archivo de hechos", 262, 108, TINTA, true);
  traza(c, [[166, 244], [520, 226], [918, 236]], ease.outCubic(prog(t, t0.arcF - .04, t0.arcF + .24)) * (1 - smooth(prog(t, t0.hay - .28, t0.hay - .1))), ACENTO, 10, t, 3);
  if (m0 <= 0) { archivero(c, t, up + b); return; }
  pintaMapa(c, cam, d, kFin, 1, t);
  c.save(); c.globalAlpha = 1 - kFin;
  const { x, y, w } = AQ;
  morfoRect(c, x, y, w, AQ.h, 540, 960, 640, 9, m0, t, 4);
  for (let i = 0; i < 4; i++) {
    const k = mm(i + 1), [cx, cy] = CENT[i];
    morfoRect(c, x + 10, y + i * HC + 8, w - 20, HC - 16, cx, cy, 196, i + 1, k, t, 3.2);
    for (let q = 1; q <= 3; q++) {
      const a = smooth(prog(k, .45 + q * .1, .9)), rr = 196 * (1 - q * .24), P = anilloPts(cx, cy, rr, i + 1, 64);
      if (a <= 0) continue;
      c.save(); c.globalAlpha = (1 - kFin) * a; c.strokeStyle = TINTA; c.lineWidth = 2.4; c.beginPath(); P.forEach((p, j) => { if (j === 0) c.moveTo(p[0], p[1]); else c.lineTo(p[0], p[1]); }); c.closePath(); c.stroke(); c.restore();
    }
    const al = (1 - smooth(m0 * 3));
    if (al > 0) { c.save(); c.globalAlpha = al; const lx = x + w / 2, ly = y + i * HC + HC * .4; c.strokeStyle = TINTA; c.lineWidth = 3; c.strokeRect(lx - 86, ly - 28, 172, 56); texto(c, "hechos", lx, ly + 12, { fuente: mono(34), color: TINTA }); c.restore(); }
  }
  c.restore();
  etiquetas(c, cam, t, 1);
  rotulo(c, t, t0.como - .02, t0.enese - .1, "cómo hablamos", 262, 124, TINTA, true);
}

// ---------- 7. lo verdadero y lo que suena verdadero ----------
const PV = { x: 1.6, y: -1.2 }, PS = { x: 2.9, y: -2.2 };
function vistaMapa(t: number): Partial<Vista> {
  const a = ease.inOutCubic(prog(t, t0.enese - .1, t0.lov + .2)), b = ease.inOutCubic(prog(t, t0.cerca - .2, t0.cercaF));
  return { tx: lerp(lerp(0, 2.25, a), 2.25, b), ty: lerp(lerp(0, -1.7, a), -1.7, b), yaw: lerp(lerp(0, .2, a), .1, b), pitch: lerp(lerp(1.55, 1.2, a), 1.4, b), dist: lerp(lerp(30, 13.5, a), 44, b) };
}
function mapaFondo(c: Ctx, t: number, d: D, a: number) { pintaMapa(c, mapaCam({ ...vistaMapa(t), tz: 0 }), d, .92 * a, 1, t); }
function mapa(c: Ctx, t: number, d: D) {
  const v = vistaMapa(t), cam = mapaCam({ ...v, tz: 0 }), aF = 1;
  pintaMapa(c, cam, d, .92 * aF, 1, t);
  etiquetas(c, cam, t, 1 - smooth(prog(t, t0.enese - .02, t0.enese + .34)));
  const A = cam.p(PV.x, PV.y), B = cam.p(PS.x, PS.y); if (!A || !B) return;
  const kA = pop(t, t0.lov - .06, .26), kB = pop(t, t0.suv + .3, .26), rr = .46;
  const sal = 1 - smooth(prog(t, t0.pore - .16, t0.pore + .1));
  c.save(); c.globalAlpha = sal;
  if (kA > .02) { sombra(c, A.x + 6, A.y + rr * A.s * .8, rr * A.s * 2 * kA, .3); bola(c, A.x, A.y, rr * A.s * kA); }
  if (kB > .02) { sombra(c, B.x + 6, B.y + rr * B.s * .8, rr * B.s * 2 * kB, .3); bola(c, B.x, B.y, rr * B.s * kB, ACENTO); }
  // A esta distancia ya no se distinguen: el anillo los abraza a los dos.
  const ka = smooth(prog(t, t0.cerca + .4, t0.cercaF + .05));
  if (ka > 0) { c.strokeStyle = ACENTO; c.lineWidth = 5; c.beginPath(); c.arc((A.x + B.x) / 2, (A.y + B.y) / 2, lerp(190, 78, ka), 0, TAU * ka); c.stroke(); }
  c.restore();
  const aT = (1 - smooth(prog(t, t0.cerca - .1, t0.cerca + .26))) * sal;
  if (aT > 0) {
    texto(c, "lo verdadero", A.x - 40, A.y - rr * A.s - 58, { fuente: serif(112, true), color: TINTA, alfa: aT * smooth(prog(t, t0.lov, t0.lov + .16)) });
    texto(c, "lo que suena", B.x - 10, B.y + rr * B.s + 112, { fuente: serif(112, true), color: ACENTO, alfa: aT * smooth(prog(t, t0.suv + .22, t0.suv + .4)) });
    texto(c, "verdadero", B.x - 10, B.y + rr * B.s + 224, { fuente: serif(112, true), color: ACENTO, alfa: aT * smooth(prog(t, t0.suv + .36, t0.suv + .52)) });
  }
  rotulo(c, t, t0.cerca + .36, t0.pore - .12, "viven muy cerca", 1420, 128, TINTA, true);
}

// ---------- 8. buscadores y documentos ----------
const YFIL = [896, 980, 1064, 1148, 1232, 1316], XDOC = [270, 540, 810], YDOC = 500, WDOC = 232, HDOC = 280;
const CIT = ["Caso A vs. B", "Caso C vs. D", "Caso E vs. F", "Caso G vs. H", "Caso I vs. J", "Caso K vs. L"];
function tarjeta(c: Ctx, x: number, y: number, k: number, t: number, i: number, lee: number) {
  if (k <= .01) return;
  c.save(); c.translate(x, y); c.rotate((i - 1) * .025 + .006 * vaiven(t, 3 + i, i)); c.scale(k, k);
  c.fillStyle = "rgba(20,18,14,.16)"; c.fillRect(-WDOC / 2 + 9, -HDOC / 2 + 13, WDOC, HDOC);
  c.fillStyle = "#FBFAF6"; c.fillRect(-WDOC / 2, -HDOC / 2, WDOC, HDOC);
  c.strokeStyle = TINTA; c.lineWidth = 3.5; c.strokeRect(-WDOC / 2, -HDOC / 2, WDOC, HDOC);
  for (let j = 0; j < 7; j++) {
    const w = (WDOC - 54) * (.74 + .26 * hash(i, j)), y1 = -HDOC / 2 + 40 + j * 34, ri = clamp(lee * 7 - j);
    c.fillStyle = "#C9C6BD"; c.fillRect(-WDOC / 2 + 27, y1, w, 9);
    if (ri > 0) { c.fillStyle = TINTA; c.fillRect(-WDOC / 2 + 27, y1, w * ri, 9); }
  }
  c.restore();
}
function barra(c: Ctx, k: number, t: number) {
  if (k <= .01) return;
  c.save(); c.translate(540, 250); c.scale(lerp(.6, 1, k), k);
  c.fillStyle = "#FBFAF6"; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.roundRect(-420, -60, 840, 120, 60); c.fill(); c.stroke();
  c.lineWidth = 7; c.beginPath(); c.arc(-352, -8, 21, 0, TAU); c.stroke(); linea(c, -337, 8, -314, 31);
  c.restore();
  const s = "¿existe este caso?", n = Math.floor(prog(t, t0.bus + .1, t0.doc + .1) * s.length);
  texto(c, s.slice(0, n), 248, 275, { fuente: serif(70, true), color: TINTA, alin: "left", alfa: k });
}
function bolaConecta(t: number): P2 {
  let x = 540, y = lerp(-80, 900, ease.inCubic(prog(t, t0.pore - .1, t0.pore + .26)));
  if (t > t0.pore + .26) y = 900 - caida(t - t0.pore - .26 + Math.sqrt(2 * 2 / 30), 2, .4, 30).z * 60;
  for (let i = 0; i < 3; i++) {
    const a = K.lec[i], u = prog(t, a - .16, a + .02);
    if (t >= a - .16) {
      const ax = i === 0 ? 540 : XDOC[i - 1] + 60, ay = i === 0 ? 900 : YDOC + 90;
      const sube = ease.inOutCubic(u); x = lerp(ax, XDOC[i] - 60, sube); y = lerp(ay, YDOC - 90, sube) - 80 * 4 * u * (1 - u);
      const r = prog(t, a + .03, a + .4);
      if (r > 0) { x = XDOC[i] + (hash(i, Math.floor(r * 7)) - .5) * 0 + 70 * Math.sin(r * 7 * 3.1416); y = lerp(YDOC - 90, YDOC + 90, r); }
    }
  }
  const b0 = K.reng[0] - .32, u = prog(t, b0, K.reng[0] - .02);
  if (t >= b0) { const e = ease.inOutCubic(u); x = lerp(XDOC[2], 106, e); y = lerp(YDOC + 90, YFIL[0] - 24, e) - 90 * 4 * u * (1 - u); }
  for (let i = 1; i < 6; i++) {
    const a = i < 5 ? K.reng[i] : K.hue, p = prog(t, a - .12, a);
    if (t >= a - .12) { y = lerp(YFIL[i - 1] - 24, YFIL[i] - 24, p) - 26 * 4 * p * (1 - p); x = 106; }
  }
  return { x, y };
}
function conecta(c: Ctx, t: number, d: D) {
  const aG = 1 - smooth(prog(t, t0.mira - .28, t0.mira + .1));
  const b = bolaConecta(t);
  c.save();
  c.globalAlpha = aG;
  const kB = pop(t, t0.bus - .08, .28), kD = [0, 1, 2].map((i) => pop(t, t0.doc - .08 + i * .13, .26));
  // Hilos de la bola a lo que le conectan.
  const fuera = 1 - smooth(prog(t, K.reng[0] - .34, K.reng[0] - .1));
  hilo(c, b.x, b.y, 540, 310, 3.5, t, { k: ease.outCubic(prog(t, t0.bus - .02, t0.bus + .24)), amp: pl(t, t0.bus + .2, 9, 3), seed: 5, sag: 14, alfa: fuera * aG, nudos: false });
  XDOC.forEach((x, i) => hilo(c, b.x, b.y, x, YDOC + HDOC / 2, 3.5, t, { k: ease.outCubic(prog(t, t0.doc + i * .13, t0.doc + .24 + i * .13)), amp: pl(t, t0.doc + .24 + i * .13, 8, 3), seed: 9 + i, sag: 22, alfa: fuera * aG, nudos: false }));
  barra(c, kB, t);
  XDOC.forEach((x, i) => tarjeta(c, x, YDOC, kD[i], t, i, prog(t, K.lec[i] + .03, K.lec[i] + .4)));
  // Los renglones: cinco con su fuente, uno sin ella.
  for (let i = 0; i < 6; i++) {
    const a = i < 5 ? K.reng[i] : K.hue; if (t < a - .02) continue;
    const y = YFIL[i], n = prog(t, a - .02, a + .12);
    c.save(); c.beginPath(); c.rect(0, y - 80, 150 + 500 * n, 110); c.clip();
    if (i < 5) texto(c, CIT[i], 150, y, { fuente: serif(88), color: TINTA, alin: "left", alfa: aG });
    else hueco(c, CIT[i], 150, y, serif(88), TINTA, aG, 2.2);
    c.restore();
    const xr = 150 + d.anc[i] + 22, xd = XDOC[[1, 2, 1, 2, 2][i % 5]] + [66, -40, 90, 20, 76][i % 5], yd = YDOC + HDOC / 2;
    if (i < 5) hilo(c, xr, y - 24, xd, yd, 2.6, t, { k: ease.outCubic(prog(t, a + .06, a + .22)), amp: pl(t, a + .22, 10, 3.4), seed: 20 + i, sag: 8, alfa: aG, nudos: true });
    else {
      // Este hilo sube, no encuentra nada y se cae.
      const su = ease.outCubic(prog(t, a + .08, a + .42)), cae = ease.inOutCubic(prog(t, a + .46, a + 1)), bx = lerp(xr, 900, su), by = lerp(y - 24, lerp(1010, 1332, cae), su);
      hilo(c, xr, y - 24, lerp(bx, 850, cae), by, 2.6, t, { k: 1, amp: pl(t, a + .46, 6, 3), seed: 33, sag: 70 * cae, col: ACENTO, alfa: aG * su, nudos: false, punta: 0 });
      c.save(); c.globalAlpha = aG; c.fillStyle = ACENTO; const qq = cae > 0 ? 1 : su; circulo(c, lerp(bx, 850, cae), by, 7 * qq); c.restore();
    }
  }
  const aR = smooth(prog(t, K.hue + .5, K.hue + .86));
  if (aR > 0) { c.save(); c.globalAlpha = aG; c.strokeStyle = ACENTO; c.lineWidth = 6; c.beginPath(); c.ellipse(350, YFIL[5] - 28, 306, 76, -.03, -.6, -.6 + TAU * aR); c.stroke(); c.restore(); }
  c.restore();
  c.save(); c.globalAlpha = aG; rotulo(c, t, t0.lea - .02, t0.ayu - .3, "antes de responder", 1470, 116, TINTA, true);
  rotulo(c, t, t0.ayu - .02, t0.noLo - .14, "Ayuda mucho.", 1470, 132, TINTA); rotulo(c, t, t0.noLo, t0.mira - .3, "No lo arregla del todo.", 1470, 104, ACENTO, true); c.restore();
  const ff = ease.inOutCubic(prog(t, t0.mira - .3, t0.mira + .3));
  const q = { x: lerp(b.x, 540, ff), y: lerp(b.y, 960, ff) };
  sombraBola(c, q.x, q.y, 32, .24); bola(c, q.x, q.y, lerp(30, 42, ff));
}

// ---------- 9. el repaso ----------
const YL = 1000, XB = 212, XF = 868;
const PIV = { x: 868, y: YL }, ANG = -.3;
/** La recta del capítulo 1, que luego se inclina: de aquí nace la pendiente. */
function recta(c: Ctx, t: number, a: number, ang: number) {
  if (a <= .01) return;
  c.save(); c.globalAlpha = a; c.translate(PIV.x, PIV.y); c.rotate(ang); c.translate(-PIV.x, -PIV.y);
  c.strokeStyle = TINTA; c.lineWidth = 4; linea(c, -200, YL, 1300, YL);
  c.fillStyle = TINTA; for (let i = -2; i <= 12; i++) c.fillRect(XB + i * 54 - 1.5, YL, 3, 24);
  texto(c, "$0", XB, YL + 72, { fuente: mono(38), color: GRIS }); texto(c, "$3M", XF, YL + 72, { fuente: mono(38), color: GRIS });
  c.restore();
}
function polar(c: Ctx, cx: number, cy: number, Rr: number, sem: number, ry = .62) {
  const n = 56, a1 = hash(sem, 1) * 6, a2 = hash(sem, 2) * 6;
  c.beginPath();
  for (let j = 0; j <= n; j++) {
    const th = j / n * TAU, q = Rr * (1 + .09 * Math.sin(2 * th + a1) + .05 * Math.sin(3 * th + a2));
    const x = cx + Math.cos(th) * q, y = cy + Math.sin(th) * q * ry;
    if (j === 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.closePath(); c.stroke();
}
const VALLE = { x: 640, y: 980 };
function bolaPend(t: number): P2 {
  const k = ease.inOutCubic(prog(t, R.pen - .4, R.pen + .06));
  const s = ease.inOutCubic(prog(t, R.pen - .06, R.sum - .5));
  const x0 = lerp(XB, 640, s);
  const dx = x0 - PIV.x, ang = ANG * k;
  const xr = PIV.x + dx * Math.cos(ang) - (-40) * Math.sin(ang), yr = PIV.y + dx * Math.sin(ang) + (-40) * Math.cos(ang);
  return { x: xr, y: yr };
}
/** La vista de la balanza: entra por la perilla de en medio y sale hasta ver la máquina entera. */
function vistaM(t: number) {
  const e = ease.outExpo(prog(t, R.sum - .14, R.sum + .46));
  return { z: lerp(3.587, .8, e), fx: lerp(470, 540, e), fy: lerp(480, 960, e), sy: lerp(900, 1010, e) };
}
function escenaMaquina(c: Ctx, t: number) {
  const th = fielR(t), v = vistaM(t);
  c.save(); c.translate(540, v.sy); c.scale(v.z, v.z); c.translate(-v.fx, -v.fy);
  maquina(c, [1, 1, -3], th, 4 + 3 * Math.sin(t * .8), 5 + 3 * Math.cos(t * .63));
  bolasSuma(c, t);
  c.restore();
}
function camHoja(t: number): Vista {
  const k = ease.inOutCubic(prog(t, R.dob - .36, R.dob + .5)), m = t > R.dob + .5 ? (t - R.dob - .5) * .05 : 0;
  return { tx: lerp(0, -1.2, k), ty: lerp(0, -3.75, k), tz: 0, yaw: lerp(0, .36, k) + m, pitch: lerp(1.5533, 1.02, k), dist: lerp(12.5, 19.5, k) };
}
function dotsHoja(c: Ctx, d: D, a: number, arriba: boolean, r = 13) {
  if (a <= .01) return;
  c.save(); c.globalAlpha = a;
  for (const p of d.pun) {
    if ((lado([p.x, p.y]) > 0) !== arriba) continue;
    c.fillStyle = p.neg ? TINTA : ACENTO; circulo(c, p.x, p.y, r);
  }
  c.restore();
}
function hojaDoblada(c: Ctx, t: number, d: D, cam: Cam, phi: number, kD: number, aM: number, aH: number) {
  const papel = (P: V[]) => { poliHoja(c, cam, P, phi); c.fillStyle = "#FBFAF6"; c.fill(); };
  c.save(); c.globalAlpha = aH;
  const sh = (P: V[]) => { c.save(); c.translate(14, 22); poliHoja(c, cam, P, phi); c.fillStyle = "rgba(20,18,14,.13)"; c.fill(); c.restore(); };
  sh(MITAD_B);
  papel(MITAD_B);
  c.restore();
  // Mitad de abajo.
  c.save(); poliHoja(c, cam, MITAD_B, phi); c.clip();
  if (afin(c, cam, phi, false)) {
    if (aM > .01) { c.globalAlpha = aM; maquina(c, [1, 1, -3], TH_FIN, 3, 4); bolasSuma(c, t); c.globalAlpha = 1; }
    dotsHoja(c, d, kD * aH, false);
  }
  c.restore();
  if (aH > .01) { poliHoja(c, cam, MITAD_B, phi); c.save(); c.globalAlpha = aH; c.strokeStyle = "rgba(17,17,17,.22)"; c.lineWidth = 2; c.stroke(); c.restore(); }
  // Mitad de arriba: su frente es la balanza, su espalda es la hoja de puntos.
  const frente = phi < Math.PI / 2;
  c.save(); poliHoja(c, cam, MITAD_A, phi);
  const sn = Math.sin(phi), val = Math.round(lerp(251, 214, sn)), vb = Math.round(lerp(246, 208, sn));
  c.fillStyle = `rgba(${val},${val - 1},${vb},${frente ? aH : 1})`; c.fill();
  if (phi > .02) { c.strokeStyle = "rgba(17,17,17,.24)"; c.lineWidth = 2; c.stroke(); }
  c.clip();
  if (afin(c, cam, phi, true)) {
    if (frente && aM > .01) { c.globalAlpha = aM; maquina(c, [1, 1, -3], TH_FIN, 3, 4); bolasSuma(c, t); c.globalAlpha = 1; }
    if (!frente) dotsHoja(c, d, 1, true);
  }
  c.restore();
}
/** Posición en pantalla de un punto de la hoja doblada, para que se vuelva una neurona. */
function dotPantalla(cam: Cam, p: V, phi: number): P2 {
  const q = cam.p(...enHoja(p, phi));
  return q ? { x: q.x, y: q.y } : { x: 540, y: 960 };
}
function redFrente(e: Ar, t: number) {
  const a = K.rg[3 - e.l];
  return ease.inOutSine(prog(t, a, a + .4));
}
function pintaRed(c: Ctx, t: number, d: D, aE: number, aR: number, kN: number, phi: number, cam: Cam, aC: number) {
  const b = Math.floor(t * 10);
  const X = new Float32Array(NP), Y = new Float32Array(NP);
  const nodo = (n: Nodo, idx: number) => { const q = dotPantalla(cam, d.nodP[idx], phi), k = ease.inOutCubic(kN); return { x: lerp(q.x, n.x, k), y: lerp(q.y, n.y, k), r: lerp(13, n.r, k) }; };
  const idx = new Map<Nodo, number>(); let q0 = 0; d.red.nodos.forEach((f) => f.forEach((n) => idx.set(n, q0++)));
  c.lineCap = "round"; c.lineJoin = "round";
  const rin = (e: Ar, id: number) => {
    const r = azar(id * 97 + b * 131 + 7), j1 = (r() - .5) * 5, j2 = (r() - .5) * 4;
    for (let j = 0; j < NP; j++) { const u = j / (NP - 1), s1 = Math.sin(Math.PI * u), s2 = Math.sin(2 * Math.PI * u); X[j] = e.bx[j] + j1 * s1 + j2 * s2; Y[j] = e.by[j]; }
  };
  if (aE > .01) d.red.ars.forEach((e, id) => {
    rin(e, id);
    const k = clamp(aE * 1.4 - ((3 - e.l) * .1));
    if (k <= 0) return;
    c.strokeStyle = TINTA; c.globalAlpha = k * lerp(.42, .92, clamp(e.w * 1.6)) * aC; c.lineWidth = 1.6 + 6.4 * e.w;
    c.beginPath(); c.moveTo(X[0], Y[0]); for (let j = 1; j < NP; j++) c.lineTo(X[j], Y[j]); c.stroke();
  });
  c.globalAlpha = 1;
  for (const f of d.red.nodos) for (const n of f) { const q = nodo(n, idx.get(n)!); if (kN > .7) { c.save(); c.globalAlpha = aC; c.fillStyle = PAPEL; circulo(c, q.x, q.y, q.r); c.restore(); } }
  if (aR > 0) d.red.ars.forEach((e, id) => {
    const k = redFrente(e, t); if (k <= .002) return;
    rin(e, id);
    const w = e.c * WT * 1.3 * aR; if (w <= .02) return;
    const q = (NP - 1) * (1 - k), i0 = Math.floor(q), f = q - i0;
    c.beginPath(); c.moveTo(X[NP - 1], Y[NP - 1]);
    for (let j = NP - 2; j > i0; j--) c.lineTo(X[j], Y[j]);
    if (i0 < NP - 1) c.lineTo(lerp(X[i0], X[i0 + 1], f), lerp(Y[i0], Y[i0 + 1], f));
    c.strokeStyle = ACENTO; c.lineWidth = Math.max(w, 1.1); c.lineCap = k < 1 ? "round" : "butt"; c.globalAlpha = aC; c.stroke();
  });
  c.globalAlpha = 1;
  for (const f of d.red.nodos) for (const n of f) {
    const q = nodo(n, idx.get(n)!), fr = idx.get(n)!;
    if (kN < .7) { c.fillStyle = hash(fr, 2) > .5 ? TINTA : ACENTO; circulo(c, q.x, q.y, q.r); }
    else circuloMano(c, q.x, q.y, q.r, t, n.sem, n.l === 4 ? 6.5 : 5, TINTA, aC);
  }
}
function rectaCulpa(c: Ctx, t: number, a: number) {
  if (a <= .01) return;
  const yr = 1490, n = 540;
  c.save(); c.globalAlpha = a; c.strokeStyle = TINTA; c.lineWidth = 4; linea(c, 100, yr, 980, yr);
  c.fillStyle = TINTA; for (let i = 0; i <= 10; i++) c.fillRect(100 + i * 88 - 1.5, yr, 3, 20);
  bandera(c, 262, yr, .78, t, 250);
  const k = ease.outExpo(prog(t, R.cul - .1, R.cul + .2));
  c.fillStyle = ACENTO; c.fillRect(262, yr - 9, (812 - 262) * k, 18);
  // El tallo: el error sube a la última neurona.
  const k2 = ease.inOutCubic(prog(t, R.cul - .05, K.rg[0] + .02)), W = lerp(10, 54, k2);
  if (k2 > 0) c.fillRect(n - W / 2, lerp(yr, 1336, k2), W, yr - lerp(yr, 1336, k2));
  bola(c, 812, yr - 34, 34);
  c.restore();
}
const PW = [{ s: "Una", px: 124, it: false, x: 290, y: 480 }, { s: "palabra", px: 236, it: false, x: 540, y: 744 }, { s: "que", px: 116, it: false, x: 214, y: 1000 }, { s: "mira", px: 176, it: true, x: 792, y: 1030 },
  { s: "a las", px: 116, it: false, x: 224, y: 1280 }, { s: "otras", px: 250, it: true, x: 620, y: 1420 }];
function palabrasRepaso(c: Ctx, t: number, d: D, cam: Cam) {
  const tiempos = [R.pal, T("palabra que").s, T("que mira").s, T("mira a las").s, T("a las otras").s, T("otras").s];
  const roto = K.roto, q = t - roto, cen = { x: 540, y: 744 - 70 };
  const P0 = d.nodP.map(() => 0); void P0;
  const inicio = (i: number) => { const e = ETIQ[i % ETIQ.length], p = cam.p(e.x * .7, e.y * .7); return p ?? { x: 540, y: 960 }; };
  // Hilos: nacen en «palabra» y buscan a cada una de las otras.
  if (q < .12) PW.forEach((w, i) => {
    if (i === 1) return;
    const a = tiempos[i] - .02, ax = [340, 0, 300, 690, 400, 540][i], ay = [640, 0, 776, 776, 776, 776][i];
    const bx = w.x + (i === 5 ? -40 : 0), by = i === 0 ? w.y + 30 : w.y - w.px * .72;
    const k = ease.outCubic(prog(t, a, a + .2)), g = i === 5 ? lerp(10, 34, ease.outBack(prog(t, tiempos[5], tiempos[5] + .4), 1.3)) : 3.4;
    const roza = pl(t, a + .2, i === 5 ? 18 : 11, 3) + pl(t, tiempos[5] + .1, i === 5 ? 34 : 4, 3);
    hilo(c, ax, ay, bx, by, g, t, { k: k * (1 - clamp(q / .12)), amp: roza, seed: i * 7 + 3, col: i === 5 ? ACENTO : TINTA, soga: i === 5, sombra: true, punta: i === 5 ? 0 : 8 });
    if (k >= 1 && q < 0) for (let m = 0; m < (i === 5 ? 5 : 2); m++) {
      const u = (t * (i === 5 ? 1.1 : .9) + m / (i === 5 ? 5 : 2) + hash(i)) % 1, tam = i === 5 ? 9 : 6;
      c.fillStyle = i === 5 ? "#F4D9C8" : TINTA; circulo(c, lerp(bx, ax, u), lerp(by, ay, u), tam * Math.sin(u * Math.PI));
    }
  });
  if (q < 0) PW.forEach((w, i) => {
    const a = tiempos[i] - .05, k = ease.outBack(prog(t, a, a + .24), 1.9); if (k <= 0) return;
    const ini = inicio(i), u = ease.inOutCubic(prog(t, a - .3, a + .05)), x = lerp(ini.x, w.x, u), y = lerp(ini.y, w.y, u);
    const mir = i > 0 && t > tiempos[i] + .1 ? pl(t, tiempos[i] + .22, 12, 4) * Math.sin((t - tiempos[i]) * 18) : 0;
    c.save(); c.translate(x, y + mir); c.scale(k, k);
    // Halo de papel: el hilo pasa por detrás.
    c.font = serif(w.px, w.it); c.textAlign = "center"; c.strokeStyle = PAPEL; c.lineWidth = 16; c.lineJoin = "round"; c.strokeText(w.s, 0, 0);
    texto(c, w.s, 0, 0, { fuente: serif(w.px, w.it), color: i === 5 ? ACENTO : TINTA });
    c.restore();
  });
  // Se rompe: cada palabra estalla en polvo y el polvo se vuelve dígitos.
  if (q >= 0 && q < .9) {
    c.fillStyle = TINTA;
    for (const p of d.polPal) {
      const e = q, dx = p.x - 540, dy = p.y - 900, L = Math.hypot(dx, dy) || 1, v = 700 + 900 * p.r;
      c.globalAlpha = clamp(1 - e * 1.15) * .95;
      c.fillRect(p.x + dx / L * v * e + p.vx * 60 * e, p.y + dy / L * v * e + p.vy * 60 * e, 4, 4);
    }
    c.globalAlpha = 1;
  }
}
function repaso(c: Ctx, t: number, d: D) {
  // Mira de dónde venimos.
  if (t < R.num + .1) {
    const a = 1 - smooth(prog(t, R.num - .1, R.num));
    polvoDigitos(c, t, TINTA, 1.2);
    rotulo(c, t, t0.mira, R.num - .12, "Mira de dónde venimos", 700, 104, TINTA, true);
    const tiembla = prog(t, R.num - .36, R.num), r = 42 + 36 * tiembla ** 3;
    if (t < R.num) { const x = 540 + (hash(Math.floor(t * 30)) - .5) * 16 * tiembla, y = 960 + (hash(Math.floor(t * 30), 3) - .5) * 16 * tiembla; c.save(); c.globalAlpha = a; sombraBola(c, x, y, r, .24); bola(c, x, y, r); c.restore(); }
  }
  // Un número al azar.
  if (t >= R.num - .04 && t < R.err + .02) {
    const abre = 60 + 2600 * ease.outExpo(prog(t, R.num - .04, R.num + .62));
    tormenta(c, t, 1, prog(t, R.err - .44, R.err - .06), 540, 960, abre);
    if (t < R.err - .3) {
      const a = 1 - smooth(prog(t, R.err - .48, R.err - .3)), k = smooth(prog(t, R.num + .1, R.num + .34));
      c.save(); c.globalAlpha = .92 * a * k; c.fillStyle = PAPEL; c.fillRect(0, 796, 1080, 330); c.restore();
      texto(c, "Un número", 540, 924, { fuente: serif(132), color: TINTA, alfa: a * k });
      texto(c, "al azar", 540, 1058, { fuente: serif(132, true), color: ACENTO, alfa: a * k });
    }
    const rg = prog(t, R.num, R.num + .6);
    if (rg > 0 && rg < 1) { c.save(); c.globalAlpha = (1 - rg) * .9; c.strokeStyle = ACENTO; c.lineWidth = 8; c.beginPath(); c.arc(540, 960, 60 + rg * 900, 0, TAU); c.stroke(); c.restore(); }
  }
  // Un error.
  const aR = smooth(prog(t, R.err - .22, R.err));
  const k = ease.inOutCubic(prog(t, R.pen - .4, R.pen + .06));
  const dark = t >= R.pen - .34 && t < R.sum + .34;
  if (t >= R.err - .24 && t < R.pen + .36) {
    const ang = ANG * k, ap = 1 - smooth(prog(t, R.pen - .1, R.pen + .26));
    recta(c, t, aR * ap, ang);
    const irB = ease.outExpo(prog(t, R.err + .08, R.err + .36)), fa = 1 - smooth(prog(t, R.pen - .3, R.pen - .05));
    if (fa > 0) {
      c.save(); c.globalAlpha = fa; bandera(c, XF, YL, clamp(resorte(t - R.err - .02, 3, .5), 0, 1.15), t);
      c.fillStyle = ACENTO; const xb = XB, w = (XF - XB) * irB; c.fillRect(xb, YL - 9, w, 18);
      texto(c, "$2,999,998", 540, YL + 234, { fuente: mono(112), color: ACENTO, alfa: smooth(prog(t, R.err + .14, R.err + .3)) }); c.restore();
    }
  }
  rotulo(c, t, R.err - .02, R.pen - .34, "Un error", 440, 170, ACENTO, true);
  // La bola: desde que se junta hasta la pendiente.
  if (t >= R.err - .1 && t < R.sum - .1) {
    let x: number, y: number;
    if (t < R.err) { const u = prog(t, R.err - .1, R.err - .02); x = lerp(540, XB, u); y = lerp(960, YL - 40, u * u) - 60 * 4 * u * (1 - u); }
    else if (t < R.pen - .4) { x = XB; y = YL - 40 - caida(t - R.err + Math.sqrt(2 * 1.5 / 30), 1.5, .42, 30).z * 60; }
    else { const p = bolaPend(t); x = p.x; y = p.y; }
    if (!dark) { sombra(c, x, YL + 6, 66, .3); bola(c, x, y, 40); }
  }
  // Una pendiente: el papel se apaga y solo queda lo que alumbra la bola.
  if (dark) {
    const p = bolaPend(t);
    const aF = smooth(prog(t, R.pen - .3, R.pen + .1));
    const cRd = ease.inOutCubic(prog(t, R.pen - .34, R.pen + .34)), contr = ease.inOutCubic(prog(t, R.sum - .5, R.sum - .18));
    const Rp = lerp(lerp(1800, 400, cRd), 330, contr), cx = lerp(p.x, 540, contr), cy = lerp(p.y, 900, contr), rui = lerp(.5, 0, contr);
    const mt = smooth(prog(t, R.sum - .42, R.sum - .16));
    if (mt < 1) {
      const g = c.createRadialGradient(cx, cy, 40, cx, cy, Rp * 1.05);
      g.addColorStop(0, "rgba(244,242,236,0)"); g.addColorStop(.72, "rgba(226,206,172,.24)"); g.addColorStop(1, "rgba(190,150,110,.5)");
      c.save(); c.globalAlpha = aF * (1 - mt); c.fillStyle = g; c.fillRect(0, 0, 1080, 1920);
      c.strokeStyle = TINTA;
      for (let q = 0; q < 16; q++) { c.lineWidth = q % 5 === 0 ? 4 : 2.2; c.globalAlpha = aF * (1 - mt) * (q % 5 === 0 ? 1 : .66); polar(c, VALLE.x, VALLE.y, 56 + q * 66, 3); }
      c.restore();
    }
    if (mt > 0) { c.save(); c.globalAlpha = mt; escenaMaquina(c, t); c.restore(); }
    // Fantasmas fuera de la luz, y el iris que se abre.
    const ab = ease.inCubic(prog(t, R.sum - .12, R.sum + .3));
    if (ab < 1) {
      if (contr < .9) mascara(c, d, cx, cy, Rp, rui, t, 1);
      if (contr > .5) {
        const Ri = lerp(Rp * .98, 1900, ab);
        c.save(); c.globalAlpha = smooth(prog(contr, .5, .9)) * (1 - smooth(prog(ab, .6, 1))); c.fillStyle = NOCHE; c.beginPath(); c.rect(-100, -100, 1300, 2200); c.arc(540, 900, Ri, 0, TAU, true); c.fill("evenodd"); c.restore();
      }
      c.save(); c.globalAlpha = .17 * aF * (1 - contr); c.strokeStyle = LUZ; c.lineWidth = 2;
      for (let q = 4; q < 22; q++) polar(c, VALLE.x, VALLE.y, 56 + q * 66, 3);
      c.restore();
    }
    const aB = 1 - smooth(prog(t, R.sum - .3, R.sum - .12));
    if (aB > 0) { c.save(); c.globalAlpha = aB; sombra(c, cx + 6, cy + 42, 90, .34); rimBola(c, cx, cy, lerp(40, 72, smooth(prog(t, R.pen, R.pen + .4))), .9); c.restore(); }
    rotulo(c, t, R.pen - .04, R.sum - .5, "Una pendiente", 300, 128, LUZ, true);
  }
  // Una suma.
  if (t >= R.sum + .34 && t < R.dob - .34) escenaMaquina(c, t);
  rotulo(c, t, R.sum - .02, R.dob - .36, "Una suma", 250, 128, TINTA, true);
  // Un doblez: la balanza estaba dibujada en una hoja.
  if (t >= R.dob - .36 && t < R.cul + .12) {
    const phi = 3.0 * ease.inOutCubic(prog(t, R.dob - .3, R.dob + .46)), cam = camara(camHoja(t), 540, 1010, 1250);
    const aH = smooth(prog(t, R.dob - .36, R.dob - .14)) * (1 - smooth(prog(t, R.cul - .3, R.cul + .05)));
    const aM = 1 - smooth(prog(t, R.dob - .1, R.dob + .2)), kD = smooth(prog(t, R.dob - .1, R.dob + .26));
    if (t < R.cul) hojaDoblada(c, t, d, cam, phi, kD, aM, Math.max(aH, aM));
    // La recta atraviesa la hoja ya doblada.
    const kL = ease.inOutCubic(prog(t, R.dob + .46, R.dob + .82));
    if (kL > 0) {
      const A = cam.p(...enHoja([XP - U.x * 760 - N.x * 236, YP - U.y * 760 - N.y * 236], phi)), B = cam.p(...enHoja([XP + U.x * 760 - N.x * 236, YP + U.y * 760 - N.y * 236], phi));
      if (A && B) { c.save(); c.globalAlpha = 1 - smooth(prog(t, R.cul - .34, R.cul - .1)); c.strokeStyle = TINTA; c.lineWidth = 9; c.lineCap = "round"; linea(c, A.x, A.y, lerp(A.x, B.x, kL), lerp(A.y, B.y, kL)); bola(c, lerp(A.x, B.x, kL), lerp(A.y, B.y, kL), 27); c.restore(); }
    }
  }
  rotulo(c, t, R.dob - .02, R.cul - .34, "Un doblez", 250, 128, TINTA, true);
  // La culpa viajando hacia atrás.
  if (t >= R.cul - .34 && t < R.pun + .2) {
    const cam = camara(camHoja(R.cul), 540, 1010, 1250), kN = prog(t, R.cul - .32, R.cul + .05), aC = 1 - smooth(prog(t, R.pun - .3, R.pun + .12));
    pintaRed(c, t, d, prog(t, R.cul - .06, R.cul + .3), 1 - smooth(prog(t, R.pun - .36, R.pun - .04)), kN, 3.0, cam, aC);
    rectaCulpa(c, t, smooth(prog(t, R.cul - .2, R.cul + .05)) * aC);
  }
  if (t >= R.cul - .02 && t < R.pun - .32) {
    const a = smooth(prog(t, R.cul - .02, R.cul + .14)) * (1 - smooth(prog(t, R.pun - .5, R.pun - .32)));
    texto(c, "La culpa", 540, 206, { fuente: serif(116, true), color: ACENTO, alfa: a });
    texto(c, "viajando hacia atrás", 540, 324, { fuente: serif(100, true), color: TINTA, alfa: a });
  }
  // Un punto en un mapa.
  if (t >= R.pun - .34) {
    const ap = smooth(prog(t, R.pun - .3, R.pun + .4)) * (1 - smooth(prog(t, R.pal + .3, R.pal + .9))) + 0;
    const cam = mapaCam({ pitch: 1.3, dist: 34 + (t - R.pun) * -2.2, yaw: (t - R.pun) * .04, ty: -1 });
    pintaMapa(c, cam, d, ap * (t < K.roto ? 1 : 0), clamp(ease.outCubic(prog(t, R.pun - .3, R.pun + .5))), t);
    if (t < R.pal + .2) {
      const q = K.bolaM, x = cam.p(CERROS[1].x * .1, CERROS[1].y * .1)!, cae = caida(t - q + Math.sqrt(2 * 7 / 30), 7, .44, 30).z * 60;
      const al = 1 - smooth(prog(t, R.pal - .14, R.pal + .14));
      if (t > q - .68) {
        c.save(); c.globalAlpha = al; sombra(c, x.x, x.y + 6, 92, .36 / (1 + cae * .01)); bola(c, x.x, x.y - 44 - cae, 46); c.restore();
        anillo(c, cam, CERROS[1].x * .1, CERROS[1].y * .1, 1 + (t - q) * 8, ACENTO, al * clamp(1 - (t - q) * 1.2) * (t > q ? 1 : 0), 5);
        texto(c, "perro", x.x, x.y + 108, { fuente: serif(120, true), color: TINTA, alfa: smooth(prog(t, q + .08, q + .26)) * al });
      }
    }
    rotulo(c, t, R.pun - .02, R.pal - .3, "Un punto en un mapa", 262, 106, TINTA, true);
    if (t >= R.pal - .36 && t < R.emp + .1) palabrasRepaso(c, t, d, cam);
  }
}

// ---------- 10. la tormenta otra vez ----------
function banda(c: Ctx, a: number, y0: number, y1: number) {
  if (a <= .01) return;
  c.save(); c.globalAlpha = a * .985; c.fillStyle = PAPEL; c.fillRect(-60, y0, 1200, y1 - y0); c.restore();
}
const LET = "abcdefghijklmnopqrstuvwxyzáéíóúñ";
function finale(c: Ctx, t: number, d: D) {
  polvoDigitos(c, t, TINTA, 1.1 * smooth(prog(t, K.cae, K.cae + 1.4)));
  const f1 = ease.inOutCubic(prog(t, t0.hoy + .05, t0.sabe + .35));
  const junta = prog(t, K.jun, K.bol), abre = t < R.emp + .4 ? 40 + 2700 * ease.outCubic(prog(t, K.roto, R.emp + .2)) : 1e9;
  const cx = 540, cy = 960, b = Math.floor(t * 9);
  c.textAlign = "center"; c.textBaseline = "middle";
  const P = (x: number, y: number, q: number) => {
    const k = ease.inCubic(prog(junta, q * .55, q * .55 + .45)), gi = k * 1.9, dx = x - cx, dy = y - cy;
    return { x: cx + (dx * Math.cos(gi) - dy * Math.sin(gi)) * (1 - k), y: cy + (dx * Math.sin(gi) + dy * Math.cos(gi)) * (1 - k), k };
  };
  // Celdas que no van a ser letra: se apagan.
  const giro = (j: number) => {
    const lk = smooth(prog(t, d.car[j][0].tl - .3, d.car[j][0].tl + .1)), f = j * .4 + t * 1.5;
    return { dx: 250 * Math.sin(f) * f1 * (1 - lk), fondo: lerp(1, .62 + .38 * (.5 + .5 * Math.cos(f)), f1 * (1 - lk)) };
  };
  const calla = 1 - smooth(prog(t, K.fija0 + .1, K.fija1 + .1));
  if (calla > 0) {
    c.font = mono(52); c.fillStyle = TINTA;
    for (let j = 0; j < 22; j++) for (let i = 0; i < 13; i++) {
      const q = d.cel[j][i], [x, y] = celda(i, j, t, q.a, q.b), di = Math.hypot(x - cx, y - cy), mo = d.med[j] / 2 + 46;
      if (di > abre) continue;
      // Dentro de la columna de frases se apaga; a los lados sigue la tormenta.
      const lejos = smooth(clamp((Math.abs(x - 540 - giro(j).dx) - mo) / 40));
      const vis = d.usa[j][i] ? 1 - f1 : 1 - f1 * (1 - lejos * .62);
      if (d.usa[j][i] && f1 >= 1) continue;
      c.globalAlpha = lerp(.16, .86, q.a) * vis * calla * clamp((abre - di) / 120);
      if (c.globalAlpha > .01) c.fillText(String(dig(i, j, t, q.a, q.b)), x, y);
    }
  }
  c.fillStyle = TINTA;
  for (let j = 0; j < 22; j++) {
    const fuente = f1 < .4 ? mono(52) : serif(PXF, j % 3 === 1), gr = giro(j);
    c.font = fuente;
    d.car[j].forEach((ch, k) => {
      const q = d.cel[j][ch.i], [x0, y0] = celda(ch.i, j, t, q.a, q.b), di = Math.hypot(x0 - cx, y0 - cy);
      if (di > abre) return;
      const fijo = t >= ch.tl, ex = fijo ? 0 : Math.sin(t * lerp(.7, 1.6, q.b) + q.a * 9) * 5;
      const X = lerp(x0, ch.x + ex + gr.dx, f1), Y = lerp(y0, YF(j), f1);
      const p = P(X, Y, q.q);
      if (p.k >= .99) return;
      const al = lerp(.16, .86, q.a), tiempoL = fijo ? 1 : 0;
      c.globalAlpha = lerp(lerp(al, .36 + al * .3, f1) * gr.fondo, .86 + .1 * hash(j), tiempoL) * (1 - p.k * .2) * clamp((abre - di) / 120);
      const g = fijo ? ch.ch : f1 < .4 ? String(dig(ch.i, j, t, q.a, q.b)) : LET[Math.floor(hash(j * 13 + k, b + Math.floor(hash(j, k) * 3)) * LET.length) % LET.length];
      c.fillText(ch.ch === " " ? " " : g, p.x, p.y);
    });
  }
  c.globalAlpha = 1; c.textBaseline = "alphabetic";
  // Las palabras que importan, sobre una banda de papel como en el capítulo 1.
  const aE = smooth(prog(t, R.emp - .04, R.emp + .12)) * (1 - smooth(prog(t, t0.hoy - .26, t0.hoy - .04)));
  banda(c, aE, 790, 1130);
  texto(c, "Empezó", 540, 930, { fuente: serif(150), color: TINTA, alfa: aE });
  texto(c, "adivinando", 540, 1072, { fuente: serif(150, true), color: ACENTO, alfa: aE });
  const aN = smooth(prog(t, t0.nun - .04, t0.nun + .14)) * (1 - smooth(prog(t, t0.solo - .24, t0.solo - .04)));
  banda(c, aN, 790, 1130);
  texto(c, "Nunca dejó", 540, 930, { fuente: serif(150), color: TINTA, alfa: aN });
  texto(c, "de adivinar", 540, 1072, { fuente: serif(150, true), color: TINTA, alfa: aN });
  const aS = smooth(prog(t, t0.solo - .04, t0.solo + .14)) * (1 - smooth(prog(t, t0.fin + .1, t0.fin + .6)));
  banda(c, aS, 790, 1130);
  texto(c, "Solo aprendió a hacerlo", 540, 930, { fuente: serif(104), color: TINTA, alfa: aS });
  texto(c, "con nuestras palabras", 540, 1062, { fuente: serif(116, true), color: ACENTO, alfa: aS * smooth(prog(t, t0.nue - .1, t0.nue + .1)) });
  // La bola: se forma con todo lo que dijimos, cae y se queda.
  if (t >= K.bol - .1) {
    const YB = 1146, z = caida(t - K.cae, 3.1, .46, 30).z * 60, r = lerp(14, 52, ease.outBack(prog(t, K.bol - .1, K.bol + .1), 1.4));
    const y = t < K.cae ? YB - 186 : YB - z, q = 1 + .06 * smooth(prog(t, K.cae + 1, DURACION));
    c.save(); c.translate(540, YB); c.scale(q, q); c.translate(-540, -YB);
    if (t >= K.cae - .1) sombra(c, 540, YB + 54, 150, .34 / (1 + (YB - y) * .006));
    bola(c, 540, y, r);
    c.restore();
  }
}

// ---------- el orden del video ----------
function escena(c: Ctx, t: number, d: D) {
  if (t < t0.pero) { documento(c, t, d); return; }
  if (t < t0.rec + .22) {
    c.fillStyle = NOCHE; c.fillRect(-60, -60, 1200, 2040);
    negro(c, t);
    const yP = lerp(1990, -60, ease.inOutCubic(prog(t, t0.rec - .3, t0.rec + .22)));
    if (t >= t0.rec - .3) {
      c.save(); c.beginPath(); c.rect(-60, yP, 1200, 2200); c.clip();
      c.fillStyle = PAPEL; c.fillRect(-60, -60, 1200, 2040); cinta(c, t, d); c.restore();
      const b = bolaNegro(t); if (b.y > yP) { bola(c, 196, YN - 40, 40); }
    }
    return;
  }
  c.fillStyle = PAPEL; c.fillRect(-60, -60, 1200, 2040);
  if (t < t0.seg) cinta(c, t, d);
  if (t >= t0.desp - .3 && t < t0.aeso + .36) {
    polvoDigitos(c, t, TINTA, t < t0.seg ? 0 : 1);
    cita(c, t, d);
  }
  if (t >= t0.aeso - .1 && t < t0.porq + .1) {
    if (t >= t0.aeso + .36) polvoDigitos(c, t, TINTA, 1);
    aluc(c, t, d);
  }
  if (t >= t0.porq && t < t0.enese) {
    polvoDigitos(c, t, TINTA, 1);
    archivo(c, t, d);
  }
  if (t >= t0.enese && t < t0.mira + .1) { polvoDigitos(c, t, TINTA, 1); if (t >= t0.pore) mapaFondo(c, t, d, lerp(1, .24, smooth(prog(t, t0.pore, t0.lea))) * (1 - smooth(prog(t, t0.mira - .3, t0.mira + .1)))); else mapa(c, t, d); }
  if (t >= t0.pore - .1 && t < t0.mira + .3) { conecta(c, t, d); }
  if (t >= t0.mira + .3 - .001 && t < R.emp) repaso(c, t, d);
  if (t >= K.roto) { if (t >= K.roto && t < R.emp) { /* se mezcla con el polvo de las palabras */ } finale(c, t, d); }
}

function dibuja(c: Ctx, t: number, d: D) {
  c.fillStyle = t >= t0.pero && t < t0.rec + .22 ? NOCHE : PAPEL; c.fillRect(0, 0, 1080, 1920);
  const z = 1.03 + .014 * Math.sin(t * .83), dx = 11 * Math.sin(t * .71), dy = 14 * Math.cos(t * .61);
  c.save(); c.translate(540 + dx, 960 + dy); c.rotate(.0055 * Math.sin(t * .47)); c.scale(z, z); c.translate(-540, -960);
  escena(c, t, d);
  c.restore();
}

export const Pieza: React.FC = () => <Lienzo dibuja={dibuja} preparar={preparar} />;
