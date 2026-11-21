// Serie 2, capítulo 2. Un solo mundo en corte, como un plano de arquitecto: arriba el cuarto de papel donde
// vive la bola, una losa rayada en medio y abajo, a oscuras, lo que de verdad pasa. Todo lo que la bola
// alcanza a tocar es papel, por eso el botón del arranque se rasga. Lo único que cruza la losa es un tubo
// neumático: entra un papelito, un muñeco de hojalata sin nada en la cabeza lo lee y aprieta el botón real.
import React from "react";
import { azar, clamp, ease, lerp, prog, smooth, texto } from "../../kit";
import { ACENTO, bola, cue, GRIS, Lienzo, LUZ, mono, NOCHE, PAPEL, rotulo, serif, sombra, TINTA } from "../../marca";
import { agente, brazo } from "../../personaje";
import palabras from "./palabras.json";
import duracion from "./duracion.json";

export const DURACION = duracion.dur;
type Ctx = CanvasRenderingContext2D;
type P = [number, number];
const T = cue(palabras);
const s = (f: string, d = 0) => T(f, d).s, e = (f: string, d = 0) => T(f, d).e;

const t0 = {
  sec: s("secreto"), jam: s("jamás"), hecho: s("ha hecho"), nada: s("nada ni"), ni1: s("ni mandar"), msj: s("mensaje ni"), ni2: s("ni reservar"), mesa1: s("mesa nada"), nada2: s("nada cuando"),
  cuando: s("cuando parece"), hizo: s("lo hizo"), solo: s("solo escribió"), escr: s("escribió"), escrF: e("solo escribió"),
  tu: s("tu agente"), agente: s("agente está"), fiesta: s("la fiesta"), necesita: s("necesita"), mesa: s("mesa para"), doce: s("doce el"), sab: s("sábado no"),
  no: s("no puede"), llamar: s("llamar"), rest: s("restaurante"), restF: e("al restaurante"), lo: s("lo único"), escr2: s("escribir así"), asi: s("así que"), pap: s("papelito muy"), ordF: e("muy ordenado"),
  herr: s("herramienta"), res: s("reservar personas"), per: s("personas"), d12: s("doce día"), dia: s("día"), sab2: s("sábado y"), sab2F: e("día sábado"),
  y: s("y se detiene"), det: s("detiene"), queda: s("se queda"), esp: s("esperando"), espF: e("queda esperando"),
  afu: s("afuera"), prog: s("programa normal"), sin: s("sin nada"), intel: s("inteligencia como"), como: s("como un"), mens: s("mensajero toma"), toma: s("toma el"), hace: s("hace la"), llam: s("llamada de"), verd: s("verdad regresa"), verdF: e("llamada de verdad"),
  reg: s("regresa"), resp: s("respuesta"), hay: s("hay mesa a"), ocho: s("ocho"), ochoF: e("las ocho"),
  ape: s("y apenas"), modelo: s("modelo te"), listo: s("listo"), enc: s("encontré"), lugF: e("encontré lugar"),
  esto: s("a esto"), func: s("function"), llam2: s("llamada a funciones"), apa: s("apareció"), jun: s("junio"), dosF: e("mil veintitrés"),
  par: s("parece un"), det2: s("detalle"), es: s("es el momento"), leng: s("lenguaje"), acc: s("acción"), si: s("si sabe"), puede: s("puede manejar"), cual: s("cualquier"), mun: s("mundo"), sint: s("sin tocarlo"), tocF: e("sin tocarlo"),
  tam: s("y también"), cuen: e("te cuenta"), quien: s("quien"), noes: s("no es la"), esm: s("es el mensajero"), ahi: s("ahí está"), pue: s("puerta"), yahi: s("y ahí"), lla: s("llave"), llaF: e("la llave"),
  maq: s("la máquina nunca"), nun: s("nunca"), apr: s("aprieta el"), botF: e("el botón"), sol: s("solo escribe"), esc3: s("escribe que"), alg: s("alguien"), apr2: s("apriete"), fin: e("lo apriete"),
};
const H1 = .27, H2 = 1.2;                               // los dos golpes del arranque
const CLAC = t0.llam + .16, CLAC2 = t0.acc - .03, CLAC3 = t0.fin + .62;   // cuándo aprieta el mensajero (partitura.py los repite)
const CLAC_D = t0.func + .92;                           // el ejemplo del plano general
const CIERRA = t0.pue + .05, ECHA = t0.llaF + .32, TOPE = t0.llaF + .96, ABRE = t0.maq - .02;   // puerta, cerrojo, choque, reabre
const POM = [t0.nun - .02, t0.apr + .42];                 // los dos golpes de la mano contra el piso, encima del botón

// ---------- medidas del mundo ----------
const PISO = 760, LOSA = 860, SUELO = 1500;
const BX = 235, BY = 670, BR = 90;
const HOJA = { x: 530, y: 530, w: 240, h: 300 };
const TRAY = { x: 430, y: 1195 }, HOP = { x: 430, y: 1040 };
const MX = 215, HOMBRO: P = [MX + 62, 1310];
const PT = { x: 590, y: 1040, w: 340, h: 460 };
const BOT = { x: 745, y: 1320 };
const REPOSO: P = [345, 1340];
const ROJO_N = "#E9896C", TIBIA = "#FFE8AE";
const seg = (t: number, a: number, b: number, c: number, d: number) => smooth(prog(t, a, b)) * (1 - smooth(prog(t, c, d)));
function tramos(t: number, v0: number, S: [number, number, number, ((x: number) => number)?][]) {
  let v = v0;
  for (const [a, b, x, f] of S) { if (t <= a) break; v = lerp(v, x, (f ?? smooth)(prog(t, a, b))); }
  return v;
}
/** Movimiento de máquina: avanza a tirones, cada diente es un paso. */
function escalon(u: number, n: number) { const k = clamp(u) * n, i = Math.floor(k), f = k - i; return Math.min(1, (i + ease.inOutCubic(clamp(f * 1.7))) / n); }

// ---------- el tubo: una sola curva para dibujar, viajar y sonar ----------
const CTRL: P[] = [[742, 452], [772, 520], [838, 592], [905, 560], [945, 480], [992, 530], [960, 640], [930, 720], [930, 800], [930, 880], [905, 945], [830, 978], [740, 932], [650, 888], [560, 925], [478, 972], [436, 1000], [HOP.x, HOP.y]];
const TUBO: { x: number; y: number; l: number }[] = (() => {
  const out: { x: number; y: number; l: number }[] = [];
  const Q = (i: number) => CTRL[clamp(i, 0, CTRL.length - 1)];
  let l = 0, px = CTRL[0][0], py = CTRL[0][1];
  for (let i = 0; i < CTRL.length - 1; i++) for (let k = 0; k < 24; k++) {
    const u = k / 24, a = Q(i - 1), b = Q(i), c = Q(i + 1), d = Q(i + 2), u2 = u * u, u3 = u2 * u;
    const f = (j: 0 | 1) => .5 * (2 * b[j] + (c[j] - a[j]) * u + (2 * a[j] - 5 * b[j] + 4 * c[j] - d[j]) * u2 + (3 * b[j] - a[j] - 3 * c[j] + d[j]) * u3);
    const x = f(0), y = f(1); l += Math.hypot(x - px, y - py); px = x; py = y; out.push({ x, y, l });
  }
  out.push({ x: HOP.x, y: HOP.y, l: l + Math.hypot(HOP.x - px, HOP.y - py) });
  return out;
})();
const LARGO = TUBO[TUBO.length - 1].l;
function enTubo(u: number) {
  const L = clamp(u) * LARGO; let i = 1;
  while (i < TUBO.length - 1 && TUBO[i].l < L) i++;
  const a = TUBO[i - 1], b = TUBO[i], k = (L - a.l) / Math.max(b.l - a.l, 1e-6);
  return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), a: Math.atan2(b.y - a.y, b.x - a.x) };
}
const U_LOSA = (() => { for (const p of TUBO) if (p.y >= LOSA) return p.l / LARGO; return .5; })();

/** Cada viaje del papelito por el tubo: ida baja, vuelta sube. */
const VIAJES: { a: number; b: number; ida: boolean; marca?: boolean }[] = [
  { a: t0.y + .02, b: t0.espF + 1.2, ida: true, marca: true },
  { a: t0.ochoF + .86, b: t0.ape - .06, ida: false },
  { a: t0.func - .05, b: t0.func + .72, ida: true },
  { a: CLAC_D + .3, b: CLAC_D + 1.0, ida: false },
  { a: t0.leng - .05, b: t0.acc - .24, ida: true },
  { a: t0.tocF + .5, b: t0.quien - .3, ida: true },
  { a: t0.esc3 - .1, b: t0.fin + .1, ida: true },
];
// El primer viaje va en dos tramos: despacio por el cuarto mientras la bola espera, rápido al cruzar la losa.
function avance(v: (typeof VIAJES)[number], t: number) {
  if (v.marca) { const q = t0.espF - .02; return t < q ? lerp(0, U_LOSA, ease.inOutSine(prog(t, v.a, q))) : lerp(U_LOSA, 1, ease.inOutSine(prog(t, q, v.b))); }
  const u = ease.inOutCubic(prog(t, v.a, v.b));
  return v.ida ? u : 1 - u;
}
function papelViajando(t: number) {
  for (const v of VIAJES) if (t >= v.a && t < v.b) { const p = enTubo(avance(v, t)); return { ...p, ida: v.ida }; }
  return null;
}

// ---------- cámara ----------
type Clave = [number, number, number, number, number, ((x: number) => number)?];
const ANCHO: [number, number, number] = [540, 945, .97];
const CAM: Clave[] = [
  [t0.jam - .1, 540, 500, 1.12, .5, ease.outCubic],
  [t0.nada2 - .1, 540, 540, 1.3, 1.6, ease.outCubic],
  [t0.solo - .2, 530, 500, 1.15, .7],
  [t0.tu - .05, 540, 470, 1.12, .8],
  [t0.no - .12, 250, 545, 1.3, .55],
  [t0.lo - .1, 450, 520, 1.42, 1],
  [t0.asi, 530, 546, 3.25, 1.1],
  [t0.sab2F + .3, 470, 520, 1.34, .7],
  [t0.espF + .9, 330, 1240, 1.72, .2],
  [t0.toma - .25, 492, 1240, 1.4, .5],
  [t0.verd + .1, 1790, 1250, 1.55, .36, ease.outExpo],
  [t0.reg - .4, 340, 1270, 1.7, .36, ease.outExpo],
  [t0.hay - .62, 345, 1180, 2.55, .5],
  [t0.ochoF + 1.05, 500, 505, 1.16, .2],
  [t0.esto - .15, ...ANCHO, 1, ease.inOutCubic],
  [t0.par - .1, 716, 470, 3.1, .9],
  [t0.es - .1, ...ANCHO, .95],
  [t0.si - .1, 400, 540, 1.32, .8],
  [t0.puede - .15, ...ANCHO, .7],
  [t0.tam + .3, 330, 1240, 1.72, 2.6, ease.inOutSine],
  [t0.noes - .05, 300, 625, 1.3, .36, ease.outExpo],
  [t0.esm - .3, 330, 1240, 1.78, .36, ease.outExpo],
  [t0.ahi - .1, 690, 1270, 1.7, .9],
  [t0.llaF + .3, 560, 1270, 1.32, .5],
  [t0.maq - .08, ...ANCHO, .7],
];
function camaraDe(t: number) {
  let x = 540, y = 425, z = 1.24;
  for (const [ti, cx, cy, cz, d, f] of CAM) {
    if (t < ti) break;
    const k = (f ?? ease.inOutCubic)(prog(t, ti, ti + d));
    x = lerp(x, cx, k); y = lerp(y, cy, k); z = z * (cz / z) ** k;
  }
  // Dos veces la cámara se sube al tubo y sigue al papelito.
  const p = papelViajando(t - .05);
  const w = Math.max(seg(t, t0.espF - .08, t0.espF + .3, t0.espF + 1, t0.espF + 1.35), seg(t, t0.ochoF + .9, t0.ochoF + 1.1, t0.ape - .3, t0.ape));
  if (p && w > 0) { x = lerp(x, p.x, w); y = lerp(y, p.y, w); z = lerp(z, 1.5, w); }
  return { x, y, z };
}

// ---------- piezas comunes ----------
function pedazos(c: Ctx, t: number, ini: number, n: number, x: number, y: number, pot: number, seed: number, bajo = false) {
  const a = t - ini; if (a < 0 || a > 1.5) return;
  const r = azar(seed);
  for (let i = 0; i < n; i++) {
    const an = bajo ? -.35 + r() * 3.84 : r() * 6.28, v = pot * (.35 + r()), g = (r() - .5) * 11, w = 12 + r() * 34, h = 8 + r() * 22;
    c.save(); c.translate(x + (r() - .5) * 240 + Math.cos(an) * v * a, y + (r() - .5) * 120 + Math.sin(an) * v * a + 1100 * a * a); c.rotate(g * a + i);
    c.globalAlpha = 1 - smooth(prog(a, .9, 1.45)); c.fillStyle = i % 5 === 0 ? ACENTO : "#FDFCF8"; c.strokeStyle = TINTA; c.lineWidth = 2;
    c.fillRect(-w / 2, -h / 2, w, h); c.strokeRect(-w / 2, -h / 2, w, h); c.restore();
  }
}
function motas(c: Ctx, t: number, color: string, y0: number, alto: number, seed: number, n: number, alfa: number) {
  const r = azar(seed); c.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const x0 = r() * 1500 - 200, yy = r() * alto, v = 18 + r() * 54, f = r() * 6.3, z = 2.4 + r() * 5;
    const y = y0 + (((yy - t * v) % alto) + alto) % alto, x = x0 + Math.sin(t * .6 + f) * 42;
    c.globalAlpha = alfa * (.14 + r() * .3); c.fillRect(x, y, z, z);
  }
  c.globalAlpha = 1;
}
function lapiz(c: Ctx, x: number, y: number, a: number, L = 130) {
  c.save(); c.translate(x, y); c.rotate(a);
  c.fillStyle = "#E8DFC9"; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(22, -9); c.lineTo(22, 9); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = TINTA; c.beginPath(); c.moveTo(0, 0); c.lineTo(8, -3.3); c.lineTo(8, 3.3); c.closePath(); c.fill();
  c.fillStyle = "#2a2a28"; c.fillRect(22, -9, L - 40, 18);
  c.fillStyle = "#6c6a64"; c.fillRect(22, -3, L - 40, 3);
  c.fillStyle = ACENTO; c.fillRect(L - 18, -9, 18, 18);
  c.restore();
}
function gorro(c: Ctx, x: number, y: number, r: number, inc = 0) {
  const g = r / 96;
  c.save(); c.translate(x, y); c.rotate(inc); c.scale(g, g);
  c.fillStyle = ACENTO; c.beginPath(); c.moveTo(-84, -62); c.lineTo(26, -240); c.lineTo(74, -56); c.closePath(); c.fill();
  c.fillStyle = TINTA; c.beginPath(); c.arc(26, -244, 19, 0, 7); c.fill(); c.restore();
}
function papelito(c: Ctx, x: number, y: number, a: number, luz: boolean, L = 66) {
  c.save(); c.translate(x, y); c.rotate(a);
  if (luz) { const g = c.createRadialGradient(0, 0, 8, 0, 0, 120); g.addColorStop(0, "rgba(255,240,205,.5)"); g.addColorStop(1, "rgba(255,240,205,0)"); c.fillStyle = g; c.fillRect(-130, -130, 260, 260); }
  c.fillStyle = "#FFFFFF"; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.roundRect(-L / 2, -14, L, 28, 7); c.fill(); c.stroke();
  c.fillStyle = TINTA; for (let i = 0; i < 3; i++) c.fillRect(-L / 2 + 8 + i * 13, -9, 2.5, 18);
  c.fillStyle = ACENTO; c.fillRect(L / 2 - 20, -14, 10, 28);
  c.restore();
}

// ---------- los sprites de papel: lo que la bola cree que toca ----------
type Sp = { cv: HTMLCanvasElement; P: P[] };
function zig(W: number, H: number, seed: number) {
  const r = azar(seed), P: P[] = [], n = Math.round(H / 24);
  for (let i = 0; i <= n; i++) P.push([W * .5 + (r() - .5) * W * .17 + Math.sin(i * .9 + seed) * W * .05, H * i / n]);
  return P;
}
const enZig = (P: P[], y: number) => { const n = P.length - 1, k = clamp(y / P[n][1]) * n, i = Math.min(n - 1, Math.floor(k)); return lerp(P[i][0], P[i + 1][0], k - i); };
function lienzo(W: number, H: number, dib: (g: Ctx) => void, seed: number): Sp {
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d")!;
  g.fillStyle = "#FDFCF8"; g.fillRect(0, 0, W, H); dib(g);
  g.strokeStyle = TINTA; g.lineWidth = 6; g.strokeRect(3, 3, W - 6, H - 6);
  return { cv, P: zig(W, H, seed) };
}
function domo(g: Ctx, x: number, y: number, r: number, baja = 0) {
  const h = r * (.86 - baja * .34), f = g.createRadialGradient(x - r * .34, y - h * .72, r * .06, x, y - h * .3, r * 1.14);
  f.addColorStop(0, "#F08A6B"); f.addColorStop(.44, ACENTO); f.addColorStop(1, "#6D1C0E");
  g.fillStyle = f; g.beginPath(); g.moveTo(x - r, y); g.bezierCurveTo(x - r, y - h * 1.32, x + r, y - h * 1.32, x + r, y); g.closePath(); g.fill();
  g.strokeStyle = TINTA; g.lineWidth = 5; g.stroke();
}
function hacerSprites() {
  const boton = lienzo(460, 580, (g) => {
    g.fillStyle = "#1b1b1a"; g.fillRect(70, 372, 320, 208);
    g.fillStyle = "#3b3a37"; g.fillRect(44, 348, 372, 34);
    g.strokeStyle = "#6c6a64"; g.lineWidth = 3; for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(92 + i * 34, 410); g.lineTo(76 + i * 34, 560); g.stroke(); }
    domo(g, 230, 348, 172);
  }, 11);
  { // la oreja doblada delata que es una hoja
    const g = boton.cv.getContext("2d")!;
    g.fillStyle = PAPEL; g.beginPath(); g.moveTo(460, 0); g.lineTo(390, 0); g.lineTo(460, 70); g.closePath(); g.fill();
    g.fillStyle = "#E3E0D6"; g.strokeStyle = TINTA; g.lineWidth = 5; g.beginPath(); g.moveTo(390, 3); g.lineTo(390, 70); g.lineTo(457, 70); g.closePath(); g.fill(); g.stroke();
  }
  const sobre = lienzo(320, 230, (g) => {
    g.strokeStyle = TINTA; g.lineWidth = 7; g.beginPath(); g.moveTo(8, 10); g.lineTo(160, 130); g.lineTo(312, 10); g.moveTo(8, 222); g.lineTo(120, 100); g.moveTo(312, 222); g.lineTo(200, 100); g.stroke();
    g.fillStyle = ACENTO; g.beginPath(); g.arc(160, 130, 26, 0, 7); g.fill();
  }, 23);
  const mesa = lienzo(380, 250, (g) => {
    g.fillStyle = TINTA; g.fillRect(40, 118, 300, 16); g.fillRect(66, 134, 14, 112); g.fillRect(300, 134, 14, 112);
    g.fillStyle = "#fff"; g.strokeStyle = TINTA; g.lineWidth = 4; g.fillRect(112, 42, 156, 76); g.strokeRect(112, 42, 156, 76);
    g.fillStyle = ACENTO; g.font = serif(36, true); g.textAlign = "center"; g.fillText("reservada", 190, 92);
  }, 37);
  return { boton, sobre, mesa };
}
type Dat = ReturnType<typeof hacerSprites> & { tubo: Path2D };
function preparar(): Dat {
  const tubo = new Path2D();
  TUBO.forEach((p, i) => (i ? tubo.lineTo(p.x, p.y) : tubo.moveTo(p.x, p.y)));
  return { ...hacerSprites(), tubo };
}

/** La hoja viva: se dibuja por renglones para doblarse y rasgarse como papel, sin hacer ningún trazo a mano. */
function hojaViva(c: Ctx, sp: Sp, x: number, piso: number, t: number, o: { sq: number; ola: number; abre: number; tip: number }) {
  const W = sp.cv.width, H = sp.cv.height, paso = 5, y0 = piso - H * o.sq;
  sombra(c, x, piso + 4, W * .7, .3);
  for (let j = 0; j < H; j += paso) {
    const v = j / H, dx = o.ola * Math.sin(v * 5.5 + t * 24) * (1 - v) ** 1.4, y = y0 + j * o.sq, tx = enZig(sp.P, j), ab = j < o.tip ? o.abre * (o.tip - j) : 0;
    if (ab > .2) {
      c.drawImage(sp.cv, 0, j, tx, paso, x - W / 2 + dx - ab, y, tx, paso * o.sq + .7);
      c.drawImage(sp.cv, tx, j, W - tx, paso, x - W / 2 + tx + dx + ab, y, W - tx, paso * o.sq + .7);
    } else c.drawImage(sp.cv, 0, j, W, paso, x - W / 2 + dx, y, W, paso * o.sq + .7);
  }
  if (o.tip > 8) for (const lado of [-1, 1]) {
    c.beginPath();
    for (let j = 0; j < o.tip; j += 10) { const v = j / H, dx = o.ola * Math.sin(v * 5.5 + t * 24) * (1 - v) ** 1.4, ab = o.abre * (o.tip - j), X = x - W / 2 + enZig(sp.P, j) + dx + lado * ab, Y = y0 + j * o.sq; if (j) c.lineTo(X, Y); else c.moveTo(X, Y); }
    c.strokeStyle = "#FFFFFF"; c.lineWidth = 7; c.stroke(); c.strokeStyle = TINTA; c.lineWidth = 2; c.stroke();
  }
}
function mitad(c: Ctx, sp: Sp, lado: -1 | 1) {
  const W = sp.cv.width, H = sp.cv.height, X = lado < 0 ? 0 : W;
  c.save(); c.beginPath(); c.moveTo(X, 0); for (const [x, y] of sp.P) c.lineTo(x, y); c.lineTo(X, H); c.closePath(); c.clip(); c.drawImage(sp.cv, 0, 0); c.restore();
  c.beginPath(); sp.P.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.strokeStyle = "#FFFFFF"; c.lineWidth = 7; c.stroke(); c.strokeStyle = TINTA; c.lineWidth = 2; c.stroke();
}
/** Dos mitades que caen de lado. barre: el golpe de aire de «Nada» se las lleva. */
function caer(c: Ctx, sp: Sp, x: number, piso: number, ini: number, t: number, barre: number) {
  const a = t - ini; if (a < 0) return;
  const W = sp.cv.width, H = sp.cv.height;
  for (const lado of [-1, 1] as const) {
    const g = lado * Math.min(1.5708, .1 + 2.4 * a + 2.2 * a * a);
    c.save(); c.translate(x + lado * (W * .5 + a * 40) + (t > barre ? lado * (t - barre) ** 1.5 * 3800 : 0), piso + 3); c.rotate(g);
    c.translate(-(lado < 0 ? 0 : W), -H); mitad(c, sp, lado); c.restore();
  }
}
function brota(c: Ctx, sp: Sp, x: number, piso: number, k: number) {
  const W = sp.cv.width, H = sp.cv.height;
  sombra(c, x, piso + 4, W * .7, .26 * clamp(k));
  c.save(); c.translate(x, piso); c.scale(1, k); c.drawImage(sp.cv, -W / 2, -H); c.restore();
}

// ---------- el mensajero ----------
const fin_brazo: [number, number, number, number][] = (() => {
  const K: [number, number, number, number][] = [[0, REPOSO[0], REPOSO[1], .7]];
  const a = (t: number, x: number, y: number, ab: number) => K.push([t, x, y, ab]);
  const v = t0.toma;
  a(v - .02, REPOSO[0], REPOSO[1], .8); a(v + .4, TRAY.x, TRAY.y - 12, .9); a(v + .5, TRAY.x, TRAY.y - 12, .08);      // toma el papelito
  a(v + .9, MX + 14, 1112, .08); a(v + 1.04, MX + 14, 1112, .9);                                                       // lo mete a la cabeza
  a(t0.hace + .02, MX + 14, 1112, .9); a(CLAC - .24, BOT.x, 1186, .08); a(CLAC, BOT.x, 1252, .08);                     // aprieta
  a(t0.reg - .42, BOT.x, 1252, .08); a(t0.reg - .1, REPOSO[0], REPOSO[1], .9);
  a(t0.resp - .02, REPOSO[0], REPOSO[1], .9); a(t0.resp + .36, MX + 150, 1388, .9); a(t0.resp + .46, MX + 150, 1388, .08);  // toma la respuesta
  a(t0.hay - .1, 348, 1212, .08); a(t0.ochoF + .36, 348, 1212, .08); a(t0.ochoF + .74, HOP.x, 1092, .08); a(t0.ochoF + .84, HOP.x, 1092, .9); a(t0.ochoF + 1.2, REPOSO[0], REPOSO[1], .8);
  a(CLAC_D - .34, REPOSO[0], REPOSO[1], .8); a(CLAC_D - .1, BOT.x, 1186, .08); a(CLAC_D, BOT.x, 1252, .08); a(CLAC_D + .16, BOT.x, 1252, .08); a(CLAC_D + .5, REPOSO[0], REPOSO[1], .8);
  a(CLAC2 - .36, REPOSO[0], REPOSO[1], .8); a(CLAC2 - .1, BOT.x, 1186, .08); a(CLAC2, BOT.x, 1252, .08); a(CLAC2 + .5, BOT.x, 1252, .08); a(CLAC2 + .9, REPOSO[0], REPOSO[1], .8);
  a(t0.quien - .1, REPOSO[0], REPOSO[1], .8); a(t0.quien + .34, TRAY.x, TRAY.y - 12, .9); a(t0.quien + .46, TRAY.x, TRAY.y - 12, .08); a(t0.quien + .96, 510, 1240, .08);  // lo sostiene: decide él
  a(t0.ahi - .2, 510, 1240, .08); a(t0.ahi + .24, REPOSO[0], REPOSO[1], .08);
  a(TOPE - .42, REPOSO[0], REPOSO[1], .08); a(TOPE, 628, 1216, .08); a(TOPE + .18, 568, 1224, .08); a(TOPE + .6, REPOSO[0], REPOSO[1], .8);   // choca con la puerta
  a(CLAC3 - .42, REPOSO[0], REPOSO[1], .8); a(CLAC3 - .1, BOT.x, 1186, .08); a(CLAC3, BOT.x, 1252, .08);
  return K;
})();
function finBrazo(t: number): { x: number; y: number; ab: number } {
  const K = fin_brazo;
  if (t <= K[0][0]) return { x: K[0][1], y: K[0][2], ab: K[0][3] };
  for (let i = 1; i < K.length; i++) if (t < K[i][0]) {
    const a = K[i - 1], b = K[i], u = prog(t, a[0], b[0]), bajando = b[2] > a[2] + 40 && Math.abs(b[1] - a[1]) < 2;
    const m = bajando ? ease.inCubic(u) : escalon(u, 4);
    return { x: lerp(a[1], b[1], m), y: lerp(a[2], b[2], m), ab: lerp(a[3], b[3], smooth(u)) };
  }
  const k = K[K.length - 1]; return { x: k[1], y: k[2], ab: k[3] };
}
function presion(t: number) {
  const P = [[CLAC, t0.reg - .42], [CLAC_D, CLAC_D + .16], [CLAC2, CLAC2 + .5], [CLAC3, 999]];
  let v = 0; for (const [a, b] of P) v = Math.max(v, smooth(prog(t, a - .07, a)) * (1 - smooth(prog(t, b, b + .1))));
  return v;
}
function engrane(c: Ctx, x: number, y: number, R: number, n: number, a: number, relleno: string, linea: string) {
  c.save(); c.translate(x, y); c.rotate(a); c.beginPath();
  const w = 6.2832 / n;
  for (let i = 0; i < n; i++) {
    const b = i * w;
    for (const [q, r] of [[0, R * .78], [.18, R * .78], [.28, R], [.62, R], [.72, R * .78]] as P[]) { const X = Math.cos(b + q * w) * r, Y = Math.sin(b + q * w) * r; if (i === 0 && q === 0) c.moveTo(X, Y); else c.lineTo(X, Y); }
  }
  c.closePath(); c.fillStyle = relleno; c.fill(); c.strokeStyle = linea; c.lineWidth = 3; c.stroke();
  c.beginPath(); c.arc(0, 0, R * .24, 0, 7); c.fillStyle = NOCHE; c.fill(); c.stroke();
  c.restore();
}
function giroMens(t: number) {
  return t * 1.5 + 16 * smooth(prog(t, CLAC - .9, CLAC + .6)) + 11 * smooth(prog(t, t0.reg, t0.hay)) + 9 * smooth(prog(t, CLAC2 - .4, CLAC2 + .5)) + 9 * smooth(prog(t, t0.esm, t0.esm + .8)) + 14 * smooth(prog(t, CLAC3 - .6, CLAC3 + .8));
}
function mensajero(c: Ctx, t: number, papelDentro: boolean) {
  const tapa = Math.max(tramos(t, 0, [[t0.sin, t0.sin + .16, 1, ease.outBack], [t0.como + .25, t0.como + .42, 0]]), seg(t, t0.toma + .55, t0.toma + .8, t0.toma + 1.15, t0.toma + 1.3), seg(t, t0.esm + .12, t0.esm + .3, t0.esm + .9, t0.esm + 1.1));
  const salta = Math.exp(-Math.max(t - t0.sin, 0) * 2.2) * (t > t0.sin ? 1 : 0), brinca = t > t0.esm ? Math.exp(-(t - t0.esm) * 1.8) : 0, ca = Math.max(salta, brinca);
  const gorra = ease.outBack(prog(t, t0.mens - .1, t0.mens + .28), 2.4);
  const tiembla = (Math.abs(Math.sin(t * 2.4)) * 1.6 + Math.sin(giroMens(t) * 6) * 1.1) * (t > CLAC - .1 && t < CLAC + .5 ? 3 : 1);
  c.save(); c.translate(MX, SUELO);
  // riel y ruedas
  c.fillStyle = "#2a2926"; c.strokeStyle = "#8d8b84"; c.lineWidth = 3;
  c.beginPath(); c.roundRect(-100, -30, 200, 30, 8); c.fill(); c.stroke();
  for (const x of [-64, 64]) engrane(c, x, -14, 22, 9, giroMens(t) * (x < 0 ? 1 : -1), "#55544f", "#8d8b84");
  c.translate(0, -tiembla);
  // cuerpo de hojalata con remaches
  const g = c.createLinearGradient(-72, 0, 72, 0); g.addColorStop(0, "#807E77"); g.addColorStop(.42, "#AEABA2"); g.addColorStop(1, "#54524C");
  c.fillStyle = g; c.strokeStyle = LUZ; c.lineWidth = 4; c.beginPath(); c.roundRect(-74, -236, 148, 208, 14); c.fill(); c.stroke();
  c.fillStyle = "#3a3936"; for (const [x, y] of [[-60, -222], [60, -222], [-60, -44], [60, -44]]) { c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); }
  c.fillStyle = NOCHE; c.beginPath(); c.arc(-8, -136, 62, 0, 7); c.fill();
  engrane(c, -22, -148, 34, 11, giroMens(t) * 1.3, "#C9C6BC", "#6c6a64"); engrane(c, 26, -116, 22, 7, -giroMens(t) * 2, "#8d8b84", "#55544f");
  c.strokeStyle = LUZ; c.lineWidth = 3; c.beginPath(); c.arc(-8, -136, 62, 0, 7); c.stroke();
  c.fillStyle = "#1b1b1a"; c.fillRect(44, -116, 30, 10);        // ranura de la impresora
  // llave de cuerda
  c.save(); c.translate(-74, -130); c.rotate(giroMens(t) * .5); c.scale(1, Math.abs(Math.cos(t * 3)) * .7 + .3); c.strokeStyle = "#C9C6BC"; c.lineWidth = 7; c.beginPath(); c.moveTo(0, 0); c.lineTo(-30, 0); c.stroke(); c.fillStyle = "#807E77"; c.beginPath(); c.arc(-40, -16, 14, 0, 7); c.arc(-40, 16, 14, 0, 7); c.fill(); c.restore();
  // cuello
  c.fillStyle = "#54524C"; c.fillRect(-20, -258, 40, 24);
  // cabeza: una lata hueca
  c.save(); c.translate(0, -258);
  c.fillStyle = NOCHE; c.strokeStyle = LUZ; c.lineWidth = 4; c.beginPath(); c.rect(-58, -90, 116, 90); c.fill();
  if (papelDentro && t < t0.reg) { c.fillStyle = "#fff"; c.fillRect(-26, -78, 52, 62); c.fillStyle = TINTA; for (let i = 0; i < 4; i++) c.fillRect(-18, -68 + i * 12, 36, 3); }
  // el resorte: lo único que hay dentro
  if (tapa > .02 || ca > .02) {
    const L = 92 + 150 * Math.max(ca, .35) * Math.abs(Math.cos((t - (t > t0.esm ? t0.esm : t0.sin)) * 7.5)) * smooth(tapa);
    c.strokeStyle = "#E4E1D8"; c.lineWidth = 7; c.beginPath(); c.moveTo(0, -8);
    for (let i = 1; i <= 16; i++) c.lineTo((i % 2 ? 1 : -1) * 28, -8 - L * i / 16);
    c.stroke(); c.fillStyle = "#E4E1D8"; c.fillRect(-34, -14 - L, 68, 9);
  }
  const h = c.createLinearGradient(-58, 0, 58, 0); h.addColorStop(0, "#807E77"); h.addColorStop(.42, "#BDBAB0"); h.addColorStop(1, "#5e5c56");
  c.fillStyle = h; c.fillRect(-58, -50, 116, 50); c.strokeStyle = LUZ; c.strokeRect(-58, -90, 116, 90);
  c.fillStyle = NOCHE; c.fillRect(-58, -90, 116, 34);
  c.fillStyle = "#1b1b1a"; c.fillRect(-40, -34, 80, 6);
  c.fillStyle = "#1b1b1a"; for (const x of [-26, 26]) { c.beginPath(); c.arc(x, -44, 5, 0, 7); c.fill(); }
  // tapa con bisagra atrás
  c.save(); c.translate(-58, -90); c.rotate(-tapa * 1.75);
  c.fillStyle = "#AEABA2"; c.strokeStyle = LUZ; c.lineWidth = 4; c.beginPath(); c.rect(-4, -10, 124, 12); c.fill(); c.stroke();
  if (gorra > .01) { c.save(); c.translate(58, -12 - (1 - clamp(gorra)) * 240); c.fillStyle = "#1f1f1e"; c.strokeStyle = LUZ; c.lineWidth = 3; c.beginPath(); c.moveTo(-52, 0); c.quadraticCurveTo(-46, -42, 0, -44); c.quadraticCurveTo(46, -42, 52, 0); c.closePath(); c.fill(); c.stroke(); c.fillStyle = "#1f1f1e"; c.beginPath(); c.moveTo(48, 0); c.lineTo(100, 8); c.lineTo(46, 12); c.closePath(); c.fill(); c.stroke(); c.restore(); }
  c.restore();
  c.restore();
  c.restore();
}
/** Brazo de tijera: las barras miden lo mismo siempre, por eso al estirarse se adelgaza. */
function tijera(c: Ctx, f: { x: number; y: number; ab: number }) {
  const [ax, ay] = HOMBRO, dx = f.x - ax, dy = f.y - ay, L = Math.hypot(dx, dy), n = 9, b = 62, a = Math.atan2(dy, dx), st = L / n, h = Math.sqrt(Math.max(b * b - st * st, 16)) / 2;
  c.save(); c.translate(ax, ay); c.rotate(a);
  c.strokeStyle = "#C9C6BC"; c.lineWidth = 6; c.lineCap = "round"; c.beginPath();
  for (let i = 0; i < n; i++) { c.moveTo(i * st, -h); c.lineTo((i + 1) * st, h); c.moveTo(i * st, h); c.lineTo((i + 1) * st, -h); }
  c.stroke(); c.fillStyle = "#54524C";
  for (let i = 0; i < n; i++) { c.beginPath(); c.arc((i + .5) * st, 0, 5, 0, 7); c.fill(); }
  c.restore();
  c.save(); c.translate(ax, ay); c.fillStyle = "#C9C6BC"; c.strokeStyle = LUZ; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 18, 0, 7); c.fill(); c.stroke(); c.restore();
  // pinza que siempre apunta hacia abajo
  c.save(); c.translate(f.x, f.y);
  c.fillStyle = "#AEABA2"; c.strokeStyle = LUZ; c.lineWidth = 3; c.beginPath(); c.roundRect(-20, -18, 40, 26, 6); c.fill(); c.stroke();
  const ab = lerp(4, 30, f.ab);
  c.strokeStyle = "#C9C6BC"; c.lineWidth = 8; c.beginPath(); c.moveTo(-10, 6); c.lineTo(-ab, 24); c.lineTo(-ab * .6, 42); c.moveTo(10, 6); c.lineTo(ab, 24); c.lineTo(ab * .6, 42); c.stroke();
  c.restore();
}

// ---------- la puerta y el botón real ----------
function cuarto(c: Ctx, t: number) {
  const { x, y, w, h } = PT, g = c.createRadialGradient(x + w / 2, y + h * .38, 30, x + w / 2, y + h * .5, 460), late = .9 + .08 * Math.sin(t * 5.3) + .04 * Math.sin(t * 13);
  g.addColorStop(0, TIBIA); g.addColorStop(.55, "#E9B85C"); g.addColorStop(1, "#8A5A22");
  c.fillStyle = g; c.fillRect(x, y, w, h);
  // haz de luz que sale al piso
  c.save(); c.globalAlpha = .2 * late; c.fillStyle = TIBIA; c.beginPath(); c.moveTo(x, y + h); c.lineTo(x + w, y + h); c.lineTo(x + w + 110, y + h + 90); c.lineTo(x - 110, y + h + 90); c.closePath(); c.fill(); c.restore();
  const p = presion(t);
  // consola
  c.fillStyle = "#1b1b1a"; c.fillRect(BOT.x - 112, BOT.y + 12, 224, SUELO - BOT.y - 12);
  c.fillStyle = "#3b3a37"; c.fillRect(BOT.x - 132, BOT.y, 264, 18);
  c.strokeStyle = "#6c6a64"; c.lineWidth = 3; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(BOT.x - 80 + i * 32, BOT.y + 44); c.lineTo(BOT.x - 80 + i * 32, BOT.y + 120); c.stroke(); }
  domo(c, BOT.x, BOT.y, 76, p);
  if (p > .4) { const q = c.createRadialGradient(BOT.x, BOT.y - 30, 6, BOT.x, BOT.y - 30, 200); q.addColorStop(0, `rgba(255,120,80,${.42 * p})`); q.addColorStop(1, "rgba(255,120,80,0)"); c.fillStyle = q; c.fillRect(BOT.x - 200, BOT.y - 230, 400, 400); }
}
function marcoYHoja(c: Ctx, t: number, ap: number, cerr: number) {
  const { x, y, w, h } = PT, cs = Math.cos(ap * 1.36), d = 26 * Math.sin(ap * 1.36), xL = x + w - w * cs;
  c.fillStyle = "#1f1e1c"; c.strokeStyle = "#8d8b84"; c.lineWidth = 4;
  c.beginPath(); c.moveTo(x + w, y); c.lineTo(x + w, y + h); c.lineTo(xL, y + h + d); c.lineTo(xL, y - d); c.closePath();
  const g = c.createLinearGradient(xL, 0, x + w, 0); g.addColorStop(0, "#5e5c56"); g.addColorStop(.5, "#3b3a37"); g.addColorStop(1, "#2a2926");
  c.fillStyle = g; c.fill(); c.stroke();
  // tableros, en la perspectiva de la hoja
  c.strokeStyle = "rgba(237,234,227,.42)"; c.lineWidth = 3;
  for (const [a, b] of [[.1, .44], [.54, .9]]) { const X = (u: number) => lerp(xL, x + w, u); c.beginPath(); c.moveTo(X(.14), y + h * a); c.lineTo(X(.86), y + h * a); c.lineTo(X(.86), y + h * b); c.lineTo(X(.14), y + h * b); c.closePath(); c.stroke(); }
  // chapa con ojo de cerradura
  const kx = lerp(xL, x + w, .1), ky = y + h * .5;
  c.fillStyle = "#AEABA2"; c.beginPath(); c.roundRect(kx - 26 * cs - 2, ky - 46, 52 * cs + 4, 92, 8); c.fill();
  c.fillStyle = NOCHE; c.beginPath(); c.ellipse(kx, ky - 10, 10 * cs + 1, 11, 0, 0, 7); c.fill(); c.fillRect(kx - 4 * cs, ky - 10, 8 * cs, 28);
  // cerrojo: entra al marco
  if (cerr > .01) { c.fillStyle = "#C9C6BC"; c.strokeStyle = LUZ; c.lineWidth = 3; c.beginPath(); c.roundRect(x + 60 - 96 * cerr, ky - 92, 110, 26, 6); c.fill(); c.stroke(); }
  // marco
  c.strokeStyle = LUZ; c.lineWidth = 8; c.beginPath(); c.moveTo(x, SUELO); c.lineTo(x, y); c.lineTo(x + w, y); c.lineTo(x + w, SUELO); c.stroke();
}
function llave(c: Ctx, x: number, y: number, giro: number, esc = 1) {
  c.save(); c.translate(x, y); c.scale(esc, esc * (Math.cos(giro) * .86 + (Math.cos(giro) >= 0 ? .14 : -.14)));
  c.strokeStyle = ACENTO; c.fillStyle = ACENTO; c.lineWidth = 15; c.lineCap = "round";
  c.beginPath(); c.moveTo(0, 0); c.lineTo(-150, 0); c.stroke();
  c.lineWidth = 16; c.beginPath(); c.arc(-192, 0, 44, 0, 7); c.stroke();
  c.fillRect(-46, 0, 14, 34); c.fillRect(-20, 0, 14, 26);
  c.restore();
}
function restaurante(c: Ctx, t: number) {
  const x = 1790, r = seg(t, t0.verd + .3, t0.verd + .44, t0.reg - .5, t0.reg - .3);
  c.fillStyle = "#2a2926"; c.strokeStyle = LUZ; c.lineWidth = 5; c.fillRect(x - 250, 1050, 500, 450); c.strokeRect(x - 250, 1050, 500, 450);
  texto(c, "restaurante", x, 1128, { fuente: serif(86, true), color: LUZ });
  for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? LUZ : ACENTO; c.beginPath(); c.moveTo(x - 250 + i * 50, 1160); c.lineTo(x - 200 + i * 50, 1160); c.lineTo(x - 210 + i * 50, 1210); c.lineTo(x - 260 + i * 50, 1210); c.closePath(); c.fill(); }
  const g = c.createRadialGradient(x - 40, 1340, 20, x - 40, 1340, 320); g.addColorStop(0, r > 0 ? TIBIA : "#6c5a3a"); g.addColorStop(1, r > 0 ? "#B9822F" : "#2f2a22");
  c.fillStyle = g; c.fillRect(x - 210, 1240, 330, 210); c.strokeStyle = LUZ; c.lineWidth = 5; c.strokeRect(x - 210, 1240, 330, 210);
  c.fillStyle = "#1b1b1a"; c.fillRect(x + 150, 1250, 74, 250);
  // teléfono que suena
  const sac = r * Math.sin(t * 56) * 7;
  c.save(); c.translate(x - 44 + sac, 1400);
  c.fillStyle = TINTA; c.beginPath(); c.moveTo(-70, 40); c.lineTo(-44, -30); c.lineTo(44, -30); c.lineTo(70, 40); c.closePath(); c.fill();
  c.lineWidth = 26; c.strokeStyle = TINTA; c.lineCap = "round"; c.beginPath(); c.moveTo(-74, -52 - r * 14); c.quadraticCurveTo(0, -84 - r * 14, 74, -52 - r * 14); c.stroke();
  c.restore();
  if (r > 0) for (let i = 0; i < 3; i++) {
    const a = ((t * 2.6 + i / 3) % 1); c.strokeStyle = `rgba(192,68,42,${(1 - a) * r})`; c.lineWidth = 7;
    for (const lado of [-1, 1]) { c.beginPath(); c.arc(x - 44, 1340, 100 + a * 120, lado < 0 ? 2.6 : -.5, lado < 0 ? 3.7 : .5); c.stroke(); }
  }
}

// ---------- cualquier programa ----------
const PROG: { x: number; y: number; r: number }[] = [
  { x: 150, y: 1130, r: .26 }, { x: 395, y: 1215, r: .52 }, { x: 640, y: 1125, r: .68 }, { x: 860, y: 1190, r: .82 },
  { x: 215, y: 1400, r: .45 }, { x: 545, y: 1420, r: .6 }, { x: 850, y: 1420, r: .86 },
];
function icono(c: Ctx, i: number, k: number) {
  c.lineWidth = 7; c.strokeStyle = LUZ; c.fillStyle = "#1f1e1c"; c.lineCap = "round"; c.lineJoin = "round";
  const on = k > 0, pop = on ? Math.exp(-k * 5) : 0;
  c.scale(1 + pop * .22, 1 + pop * .22);
  if (i === 0) { c.translate(on ? Math.sin(k * 6) * 5 : 0, on ? -Math.abs(Math.sin(k * 4)) * 8 : 0); c.beginPath(); c.rect(-74, -50, 148, 100); c.fill(); c.stroke(); c.beginPath(); c.moveTo(-74, -50); c.lineTo(0, 10); c.lineTo(74, -50); c.stroke(); if (on) { c.fillStyle = ROJO_N; c.beginPath(); c.arc(0, 12, 12, 0, 7); c.fill(); } }
  if (i === 1) { c.beginPath(); c.roundRect(-64, -64, 128, 128, 10); c.fill(); c.stroke(); c.fillStyle = LUZ; c.fillRect(-64, -64, 128, 26); for (let a = 0; a < 3; a++) for (let b = 0; b < 4; b++) { c.fillStyle = on && a === 1 && b === 2 ? ROJO_N : "#8d8b84"; c.fillRect(-48 + b * 26, -24 + a * 26, 16, 16); } }
  if (i === 2) { if (on) { const g = c.createRadialGradient(0, -12, 8, 0, -12, 170); g.addColorStop(0, "rgba(255,226,160,.75)"); g.addColorStop(1, "rgba(255,226,160,0)"); c.fillStyle = g; c.fillRect(-180, -190, 360, 360); } c.fillStyle = on ? TIBIA : "#1f1e1c"; c.beginPath(); c.arc(0, -14, 50, .55, 2.6, true); c.lineTo(-20, 54); c.lineTo(20, 54); c.closePath(); c.fill(); c.stroke(); c.beginPath(); c.moveTo(-18, 70); c.lineTo(18, 70); c.stroke(); }
  if (i === 3) { c.translate(on ? Math.sin(k * 8) * 7 : 0, 0); c.beginPath(); c.moveTo(-78, -48); c.lineTo(-52, -48); c.lineTo(-30, 26); c.lineTo(58, 26); c.lineTo(72, -28); c.lineTo(-44, -28); c.stroke(); for (const x of [-20, 44]) { c.beginPath(); c.arc(x, 48, 11, 0, 7); c.fill(); c.stroke(); } if (on) { c.fillStyle = ROJO_N; c.fillRect(-12, -14, 44, 30); } }
  if (i === 4) { c.rotate(on ? -.1 + Math.sin(k * 5) * .03 : 0); c.beginPath(); c.roundRect(-86, -54, 172, 108, 12); c.fill(); c.stroke(); c.fillStyle = LUZ; c.fillRect(-86, -28, 172, 18); c.fillStyle = on ? ROJO_N : "#8d8b84"; c.fillRect(-64, 12, 40, 26); }
  if (i === 5) { c.beginPath(); c.moveTo(-92, 26); c.lineTo(-92, -2); c.lineTo(-58, -8); c.lineTo(-32, -44); c.lineTo(36, -44); c.lineTo(66, -8); c.lineTo(92, 2); c.lineTo(92, 26); c.closePath(); c.fill(); c.stroke(); for (const x of [-52, 52]) { c.beginPath(); c.arc(x, 30, 19, 0, 7); c.fill(); c.stroke(); } if (on) { const g = c.createRadialGradient(100, 8, 2, 100, 8, 100); g.addColorStop(0, "rgba(255,226,160,.8)"); g.addColorStop(1, "rgba(255,226,160,0)"); c.fillStyle = g; c.fillRect(92, -90, 110, 200); } }
  if (i === 6) { c.translate(0, on ? -Math.abs(Math.sin(k * 7)) * 16 * Math.exp(-k * 2) : 0); c.fillStyle = on ? ROJO_N : "#1f1e1c"; c.beginPath(); c.arc(0, -22, 48, 2.6, .55); c.lineTo(0, 62); c.closePath(); c.fill(); c.stroke(); c.fillStyle = NOCHE; c.beginPath(); c.arc(0, -22, 17, 0, 7); c.fill(); c.stroke(); }
}
const SALE_P = (i: number) => t0.cual - .22 + i * .23;
function programas(c: Ctx, t: number) {
  const nace = smooth(prog(t, t0.puede - .1, t0.cual + .1)), apaga = (i: number) => smooth(prog(t, t0.tam + i * .08, t0.tam + .3 + i * .08));
  if (nace <= 0 || t > t0.tam + 1.2) return;
  PROG.forEach((o, i) => {
    const q = enTubo(o.r), bx = o.x, by = o.y - 92, cx = bx, cy = q.y + 60, viva = nace * (1 - apaga(i));
    if (viva <= .01) return;
    const L = 900;
    c.save(); c.strokeStyle = "#8d8b84"; c.lineWidth = 16; c.lineCap = "round"; c.setLineDash([L * viva, L]);
    const rama = new Path2D(); rama.moveTo(q.x, q.y); rama.quadraticCurveTo(cx, cy, bx, by);
    c.stroke(rama); c.strokeStyle = "#141413"; c.lineWidth = 9; c.stroke(rama); c.setLineDash([]); c.restore();
    // varios papelitos por rama: entre más avanza, más seguido
    for (let k = 0; k < 4; k++) {
      const a = SALE_P(i) + k * Math.max(.34, .62 - k * .1), u = prog(t, a, a + .34);
      if (t >= a && t < a + .34) { const w = 1 - u, x = w * w * q.x + 2 * w * u * cx + u * u * bx, y = w * w * q.y + 2 * w * u * cy + u * u * by; c.fillStyle = "#fff"; c.fillRect(x - 11, y - 11, 22, 22); c.fillStyle = ACENTO; c.fillRect(x - 11, y - 3, 22, 6); }
    }
    const lle = SALE_P(i) + .34, k = t - lle, ra = k > 0 ? (k % .7) : 9;
    c.save(); c.translate(o.x, o.y); c.globalAlpha = smooth(clamp(viva * 2)); c.scale(lerp(.3, 1, ease.outBack(clamp(viva))), lerp(.3, 1, ease.outBack(clamp(viva)))); icono(c, i, k); c.restore();
    if (ra < .36) { c.strokeStyle = `rgba(233,137,108,${1 - ra / .36})`; c.lineWidth = 5; c.beginPath(); c.arc(o.x, o.y, 90 + ra * 240, 0, 7); c.stroke(); }
  });
}

// ---------- lo que la bola escribe ----------
const FUE = (px: number) => mono(px), FVA = (px: number) => serif(px, true);
const XT = HOJA.x - 102;
const CAMPOS = [
  { et: "herramienta", val: "reservar", y: HOJA.y - 104, tA: t0.herr - .04, tB: t0.herr + .62, tC: t0.res - .04, tD: t0.res + .42 },
  { et: "personas", val: "12", y: HOJA.y - 8, tA: t0.per - .04, tB: t0.per + .64, tC: t0.d12 - .04, tD: t0.d12 + .3 },
  { et: "día", val: "sábado", y: HOJA.y + 88, tA: t0.dia - .04, tB: t0.dia + .26, tC: t0.sab2 - .04, tD: t0.sab2 + .44 },
];
function ancho(c: Ctx, s2: string, f: string) { c.font = f; return c.measureText(s2).width; }
function trazado(c: Ctx, s2: string, x: number, y: number, f: string, col: string, k: number, px = 46) {
  if (k <= 0) return;
  const w = ancho(c, s2, f);
  c.save(); c.beginPath(); c.rect(x - px * .1, y - px * 1.2, (w + px * .3) * k, px * 1.7); c.clip();
  texto(c, s2, x, y, { fuente: f, color: col, alin: "left" }); c.restore();
}
/** Dónde está la punta del lápiz: sigue exactamente lo que se va escribiendo. */
function puntaHoja(c: Ctx, t: number): { x: number; y: number; esc: boolean } {
  const tr: { a: number; b: number; x0: number; x1: number; y: number }[] = [];
  for (const f of CAMPOS) {
    tr.push({ a: f.tA, b: f.tB, x0: XT, x1: XT + ancho(c, f.et, FUE(20)), y: f.y });
    tr.push({ a: f.tC, b: f.tD, x0: XT, x1: XT + ancho(c, f.val, FVA(46)), y: f.y + 46 });
  }
  if (t < tr[0].a) return { x: lerp(HOJA.x + 110, XT, smooth(prog(t, t0.pap, tr[0].a))), y: lerp(HOJA.y + 120, tr[0].y, smooth(prog(t, t0.pap, tr[0].a))), esc: false };
  for (let i = 0; i < tr.length; i++) {
    const q = tr[i];
    if (t < q.b) return { x: lerp(q.x0, q.x1, prog(t, q.a, q.b)), y: q.y - 8 + Math.sin(t * 44) * 5, esc: true };
    const n = tr[i + 1];
    if (n && t < n.a) { const u = smooth(prog(t, q.b, n.a)); return { x: lerp(q.x1, n.x0, u), y: lerp(q.y, n.y, u) - Math.sin(u * 3.14) * 14, esc: false }; }
  }
  const z = tr[tr.length - 1];
  return { x: z.x1, y: z.y - 8, esc: false };
}
function hojaEscrita(c: Ctx, t: number) {
  for (const f of CAMPOS) {
    trazado(c, f.et, XT, f.y, FUE(20), "#6c6a64", prog(t, f.tA, f.tB));
    trazado(c, f.val, XT, f.y + 46, FVA(46), f.val === "12" ? ACENTO : TINTA, prog(t, f.tC, f.tD));
  }
}
function globoRespuesta(c: Ctx, x: number, y: number, t: number) {
  c.save(); c.translate(x, y);
  c.fillStyle = "#fff"; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.rect(-104, -68, 208, 136); c.fill(); c.stroke();
  texto(c, "hay mesa", 0, -6, { fuente: serif(50, true), color: TINTA });
  texto(c, "a las 8", 0, 48, { fuente: serif(50, true), color: ACENTO });
  c.restore();
}

// ---------- la bola ----------
type Est = { x: number; y: number; m1: P; m2: P; a1: number; a2: number; lap?: { x: number; y: number; a: number } };
function estado(c: Ctx, t: number): Est {
  const bob = Math.sin(t * 2.2) * 8, r1 = (a: number) => Math.sin(t * 1.9 + a) * 16;
  // Arranque: dos golpes y luego la rasga con las manos
  if (t < H1) { const y = lerp(-80, 92, (t / H1) ** 1.5), k = prog(t, H1 - .1, H1); return { x: 540, y, m1: [540 - lerp(120, 70, k), lerp(y - 190, y + 80, k)], m2: [540 + lerp(120, 70, k), lerp(y - 190, y + 80, k)], a1: .05, a2: .05 }; }
  if (t < H2) { const u = prog(t, H1, H2), y = 92 - 4 * 300 * u * (1 - u), al = Math.sin(u * 3.14), k = prog(t, H2 - .12, H2); return { x: 540 + Math.sin(u * 6.28) * 40, y, m1: [540 - lerp(lerp(90, 210, al), 70, k), lerp(y + lerp(60, -170, u), y + 80, k)], m2: [540 + lerp(lerp(90, 210, al), 70, k), lerp(y + lerp(60, -170, u), y + 80, k)], a1: .1, a2: .1 }; }
  if (t < t0.jam) {
    const u = prog(t, H2, t0.jam), tip = 580 * ease.inCubic(u) * .92 + 46, y = 96 + 300 * smooth(u), sac = Math.sin(t * 58) * (3 + u * 7), yM = y - 40;
    const tope = PISO - 580, ab = abreRip(t) * Math.max(tip - (yM - tope), 0) + 58 + 20 * Math.sin(t * 19) * u;
    return { x: 540 + sac, y, m1: [540 - ab, yM], m2: [540 + ab, yM], a1: .15, a2: .15 };
  }
  // Cae al piso
  const pisoB = PISO - BR + 2;
  if (t < t0.ni1 - .1) { const a = t - t0.jam, q = .36, y = a < q ? lerp(396, pisoB, a * a / (q * q)) : pisoB - Math.abs(Math.sin((a - q) * 5.2)) * 130 * Math.exp(-(a - q) * 3); return { x: 540, y, m1: [540 - 210, y - 70 + r1(0)], m2: [540 + 210, y - 70 + r1(1)], a1: .85, a2: .85 }; }
  const salto = (a: number, b: number) => Math.sin(Math.PI * prog(t, a, b)) * 120;
  // Ni mandar un mensaje / ni reservar una mesa
  if (t < t0.nada2 - .05) {
    const bx = tramos(t, 540, [[t0.ni1 - .1, t0.ni1 + .25, 590], [t0.ni2 - .1, t0.ni2 + .25, 470]]), by = pisoB - salto(t0.ni1 - .1, t0.ni1 + .25) - salto(t0.ni2 - .1, t0.ni2 + .25) + bob * .4;
    const ga = (ti: number) => seg(t, ti - .24, ti - .02, ti + .26, ti + .5);
    const g1 = ga(t0.msj + .02), g2 = ga(t0.mesa1 + .02);
    return { x: bx, y: by, m1: [lerp(bx - 170, 300, g2), lerp(by + 30 + r1(0), 640, g2)], m2: [lerp(bx + 170, 790, g1), lerp(by + 30 + r1(1), 640, g1)], a1: lerp(.7, .05, g2), a2: lerp(.7, .05, g1) };
  }
  // Se queda solo; le cae un lápiz
  if (t < t0.solo - .1) { return { x: 540, y: pisoB + bob * .25, m1: [370, pisoB + 56 + r1(0) * .2], m2: [710, pisoB + 56 + r1(1) * .2], a1: .7, a2: .7 }; }
  if (t < t0.tu) {
    const u = prog(t, t0.escr - .02, t0.escr + .78), ch = ancho(c, "escribió", serif(176, true)), tipX = 540 - ch / 2 + ch * u, tipY = 330 + Math.sin(t * 40) * 9 + (u >= 1 ? -40 : 0), k = smooth(prog(t, t0.solo - .1, t0.escr));
    const bx = lerp(540, 380, smooth(prog(t, t0.solo - .1, t0.solo + .3))), tx = lerp(726, tipX, k), ty = lerp(628, tipY, k), ang = lerp(-1.57, -.88 + 2.3, k);
    return { x: bx, y: pisoB + bob * .2, m1: [bx - 170, pisoB + 40 + r1(0) * .4], m2: [tx + 44, ty + 68], a1: .7, a2: .2, lap: { x: tx, y: ty, a: ang } };
  }
  // Regresa a su lugar con gorro
  const anda = (a: number, b: number, x0: number, x1: number) => ({ x: lerp(x0, x1, smooth(prog(t, a, b))), hop: Math.abs(Math.sin(prog(t, a, b) * 9.42)) * 56 * (t > a && t < b ? 1 : 0) });
  if (t < t0.no - .05) {
    const a = anda(t0.tu, t0.tu + .8, 380, BX), y = BY - a.hop + bob * .5, sub = smooth(prog(t, t0.fiesta, t0.fiesta + .2)) * (1 - smooth(prog(t, t0.fiesta + .55, t0.fiesta + .9)));
    return { x: a.x, y, m1: [a.x - 150, lerp(y + 40, y - 170, sub) + r1(0)], m2: [a.x + 150, lerp(y + 40, y - 170, sub) + r1(1)], a1: .8, a2: .8 };
  }
  // El teléfono de papel
  if (t < t0.lo - .1) {
    const lev = seg(t, t0.llamar - .1, t0.llamar + .12, t0.restF + .25, t0.restF + .45), y = BY + bob * .4;
    return { x: BX, y, m1: [lerp(BX - 150, 70, lev), lerp(y + 46, 470, lev)], m2: [BX + 150, y + 46 + r1(1)], a1: lerp(.7, .08, lev), a2: .7 };
  }
  // Escribe
  if (t < t0.sab2F + .9) {
    const q = puntaHoja(c, t), en = smooth(prog(t, t0.lo + .3, t0.escr2)), y = BY + bob * .35, tx = lerp(HOJA.x + 40, q.x, en), ty = lerp(BY - 190, q.y, en);
    return { x: BX, y, m1: [BX - 150, y + 46 + r1(0)], m2: [tx + 14, ty + 110], a1: .7, a2: .22, lap: { x: tx, y: ty, a: 1.3 } };
  }
  const pasa = smooth(prog(t, t0.sab2F + .85, t0.y + .1));
  if (t < t0.y + .3) { return { x: BX, y: BY, m1: [BX - 150, BY + 46], m2: [lerp(HOJA.x, 722, pasa), lerp(HOJA.y + 40, 440, pasa)], a1: .7, a2: .2 }; }
  // Se detiene. Quieta de verdad: lo que se mueve es el mundo.
  if (t < t0.ape) { const k = smooth(prog(t, t0.y + .3, t0.det + .3)); return { x: BX, y: BY, m1: [BX - 150, lerp(BY + 46, BY + 74, k)], m2: [lerp(722, BX + 150, k), lerp(440, BY + 74, k)], a1: .7, a2: .7 }; }
  // Recibe la respuesta
  if (t < t0.esto - .1) {
    const brinco = Math.abs(Math.sin(prog(t, t0.ape + .35, t0.ape + 1.25) * 6.28)) * 62 * (t > t0.ape + .35 && t < t0.ape + 1.25 ? 1 : 0), y = BY - brinco + bob * .5;
    const lee = seg(t, t0.ape, t0.ape + .2, t0.modelo + .2, t0.modelo + .5);
    return { x: BX, y, m1: [BX - 150, y + 40 + r1(0)], m2: [lerp(BX + 150, BX + 150, lee), lerp(y + 40, 560, lee)], a1: .7, a2: lerp(.7, .1, lee) };
  }
  if (t >= t0.par - .15 && t < t0.es - .05) {
    const k = seg(t, t0.par - .15, t0.par + .25, t0.es - .4, t0.es - .05), mx = 640 + Math.sin(t * 4) * 5, my = 470 + Math.sin(t * 5.3) * 5;
    return { x: BX, y: BY + bob * .45, m1: [BX - 150, BY + 46 + r1(0)], m2: [lerp(BX + 150, mx, k), lerp(BY + 46, my, k)], a1: .7, a2: lerp(.7, .12, k) };
  }
  // Escribe y manda papelitos
  const rapido = t >= t0.si - .1 && t < t0.sint;
  const ya = BY + bob * .45;
  if (t < t0.tam) {
    const arriba = smooth(prog(t, t0.sint, t0.sint + .2));
    const tx = HOJA.x + Math.sin(t * (rapido ? 15 : 5)) * 76, ty = HOJA.y + Math.sin(t * (rapido ? 23 : 7)) * 96;
    const mano: P = [lerp(tx + 14, BX + 110, arriba), lerp(ty + 110, BY - 230, arriba)];
    return { x: BX, y: ya, m1: [lerp(BX - 150, BX - 110, arriba), lerp(ya + 46 + r1(0), BY - 230, arriba)], m2: mano, a1: lerp(.7, .95, arriba), a2: lerp(.22, .95, arriba), lap: arriba < .5 ? { x: tx, y: ty, a: 1.3 } : undefined };
  }
  if (t < t0.maq - .05) {
    const en = seg(t, t0.noes, t0.noes + .2, t0.esm, t0.esm + .3);     // «no es»: abre las manos, sin culpa
    return { x: BX, y: ya, m1: [BX - lerp(140, 190, en), lerp(BY + 60, BY - 130, en)], m2: [BX + lerp(140, 190, en), lerp(BY + 60, BY - 130, en)], a1: lerp(.7, .95, en), a2: lerp(.7, .95, en) };
  }
  // La mano baja, estirada, hasta chocar con el piso. No hay manera.
  const va = seg(t, t0.maq, POM[0] - .14, POM[1] + .3, t0.sol - .05);
  if (t < t0.sol) {
    const alza = Math.abs(Math.sin(Math.PI * prog(t, POM[0], POM[1]))) * 118;
    return { x: BX + va * 26, y: ya, m1: [BX - 140, BY + 60], m2: [lerp(BX + 150, BOT.x, va), lerp(BY + 46, PISO - 24 - alza, va)], a1: .7, a2: lerp(.7, .06, va) };
  }
  const es = smooth(prog(t, t0.sol, t0.sol + .2)), fuera = smooth(prog(t, t0.esc3 + .1, t0.esc3 + .4)), tx = lerp(HOJA.x - 60, HOJA.x + 90, prog(t, t0.sol + .1, t0.esc3)), ty = HOJA.y + 40 + Math.sin(t * 34) * 12 * (1 - fuera);
  // Termina con el lápiz en la mano: es todo lo que tiene.
  const hx = lerp(lerp(BX + 150, tx + 14, es), BX + 152, fuera), hy = lerp(lerp(BY + 46, ty + 110, es), BY - 40, fuera);
  return { x: BX, y: ya, m1: [BX - 140, BY + 60 + r1(0) * .4], m2: [hx, hy], a1: .7, a2: lerp(.7, .22, es), lap: es > .5 ? { x: hx - 14, y: hy - 110, a: 1.3 } : undefined };
}
function abreRip(t: number) { return lerp(.03, .34, smooth(prog(t, H2 + .1, t0.jam))); }

// ---------- objetos del cuarto ----------
function banderines(c: Ctx, t: number) {
  const k = ease.outBack(prog(t, t0.tu, t0.tu + .5), 1.2); if (k <= 0) return;
  const y0 = -170 * (1 - k) + 22, pts: P[] = [];
  for (let i = 0; i <= 14; i++) { const u = i / 14; pts.push([-80 + 1240 * u, y0 + 32 * Math.sin(u * Math.PI) + Math.sin(t * 1.6 + u * 5) * 6]); }
  c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
  pts.slice(0, -1).forEach(([x, y], i) => {
    const g = Math.sin(t * 2.3 + i * 1.7) * .16;
    c.save(); c.translate(x + 44, y + 2); c.rotate(g); c.fillStyle = i % 3 === 0 ? ACENTO : i % 3 === 1 ? TINTA : "#fff"; c.strokeStyle = TINTA; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-34, 0); c.lineTo(34, 0); c.lineTo(0, 62); c.closePath(); c.fill(); c.stroke(); c.restore();
  });
}
function caballete(c: Ctx, t: number, sale: number) {
  const dx = (1 - ease.outBack(prog(t, t0.tu + .3, t0.tu + .85), 1.1)) * 900;
  if (dx > 880) return;
  c.save(); c.translate(dx, 0);
  c.strokeStyle = TINTA; c.lineWidth = 10; c.lineCap = "round";
  c.beginPath(); c.moveTo(450, 700); c.lineTo(405, PISO - 2); c.moveTo(610, 700); c.lineTo(655, PISO - 2); c.moveTo(530, 390); c.lineTo(530, PISO - 2); c.stroke();
  c.fillStyle = "#D9D5CA"; c.strokeStyle = TINTA; c.lineWidth = 6; c.beginPath(); c.roundRect(395, 362, 270, 340, 8); c.fill(); c.stroke();
  c.fillStyle = TINTA; c.fillRect(495, 356, 70, 22);
  if (sale > 0) { c.globalAlpha *= sale; c.fillStyle = "#FFFFFF"; c.fillRect(HOJA.x - HOJA.w / 2, HOJA.y - HOJA.h / 2, HOJA.w, HOJA.h); c.strokeStyle = "rgba(17,17,17,.3)"; c.lineWidth = 2; c.strokeRect(HOJA.x - HOJA.w / 2, HOJA.y - HOJA.h / 2, HOJA.w, HOJA.h); c.globalAlpha = 1; }
  c.restore();
}
function telefonoPapel(c: Ctx, t: number, x: number, m: P) {
  const k = ease.outBack(prog(t, t0.no - .1, t0.no + .2), 1.4) * (1 - smooth(prog(t, t0.lo - .3, t0.lo + .1))); if (k <= 0) return;
  const lev = seg(t, t0.llamar - .1, t0.llamar + .12, t0.restF + .25, t0.restF + .45), mole = smooth(prog(t, t0.llamar + .12, t0.rest + .2));
  c.save(); c.translate(x, PISO); c.scale(1.3, k * 1.3);
  c.fillStyle = "#FDFCF8"; c.strokeStyle = TINTA; c.lineWidth = 6;
  c.beginPath(); c.moveTo(-96, 0); c.lineTo(-60, -120); c.lineTo(60, -120); c.lineTo(96, 0); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.arc(0, -56, 38, 0, 7); c.stroke(); for (let i = 0; i < 8; i++) { c.beginPath(); c.arc(Math.cos(i * .785) * 26, -56 + Math.sin(i * .785) * 26, 5, 0, 7); c.stroke(); }
  c.restore();
  // el auricular: en cuanto lo levanta se dobla, porque es papel
  const ax = lerp(x - 118, m[0] - 40, lev), ay = lerp(PISO - 186 * k, m[1], lev), bx = lerp(x + 118, m[0] + 92, lev), by = lerp(PISO - 186 * k, m[1] + 210 * mole, lev);
  c.save(); c.globalAlpha = clamp(k); c.lineCap = "round"; c.strokeStyle = TINTA; c.lineWidth = 42;
  c.beginPath(); c.moveTo(ax, ay); c.quadraticCurveTo((ax + bx) / 2 + 40 * mole, (ay + by) / 2 - lerp(38, -30, mole), bx, by); c.stroke();
  c.strokeStyle = "#FDFCF8"; c.lineWidth = 31; c.stroke(); c.restore();
}
function nube(c: Ctx, t: number) {
  const a = ease.outBack(prog(t, t0.necesita - .05, t0.necesita + .3), 1.3) * (1 - smooth(prog(t, t0.no - .35, t0.no - .05)));
  if (a <= .01) return;
  const x = 640, y = 330;
  c.save(); c.translate(x, y); c.scale(a, a); c.translate(-x, -y);
  c.fillStyle = "#FFFFFF"; c.strokeStyle = TINTA; c.lineWidth = 6;
  c.beginPath(); c.roundRect(x - 330, y - 200, 660, 400, 120); c.fill(); c.stroke();
  for (const [q, w, r] of [[250, 610, 20], [292, 568, 30]]) { c.beginPath(); c.arc(q as number, w as number, r as number, 0, 7); c.fill(); c.stroke(); }
  // la mesa vista desde arriba, con las sillas de una en una
  const yM = y - 18;
  c.fillStyle = "#EDE9DF"; c.strokeStyle = TINTA; c.lineWidth = 6; c.beginPath(); c.roundRect(x - 230, yM - 44, 460, 88, 12); c.fill(); c.stroke();
  for (let i = 0; i < 12; i++) {
    const ti = t0.mesa + .04 + i * .054, k = ease.outBack(prog(t, ti, ti + .14), 2.2); if (k <= 0) continue;
    const X = x - 195 + (i % 6) * 78, Y = yM + (i < 6 ? -84 : 84);
    c.save(); c.translate(X, Y); c.scale(k, k); c.fillStyle = ACENTO; c.beginPath(); c.roundRect(-27, -22, 54, 44, 10); c.fill(); c.restore();
  }
  c.restore();
}

// ---------- el mundo ----------
function fondo(c: Ctx, t: number, h: (i: number) => number, L: number) {
  c.fillStyle = PAPEL; c.fillRect(-4000, -3000, 9000, 3000 + PISO + 6);
  motas(c, t, TINTA, -80, 900, 9, 110, 1);
  c.fillStyle = NOCHE; c.fillRect(-4000, LOSA, 9000, 4000);
  if (L > 0) {
    // pared del fondo: hiladas muy tenues que dan escala y se mueven con la cámara
    c.strokeStyle = `rgba(237,234,227,${.06 * L})`; c.lineWidth = 2;
    for (let j = 0; j < 7; j++) { const y = 930 + j * 86; c.beginPath(); c.moveTo(-300, y + h(j) * 2); c.lineTo(2300, y - h(j + 9) * 2); c.stroke(); }
    motas(c, t, LUZ, LOSA, 760, 3, 90, L);
    c.strokeStyle = `rgba(237,234,227,${.42 * L})`; c.lineWidth = 3; c.beginPath(); c.moveTo(-400, SUELO); c.lineTo(2400, SUELO); c.stroke();
  }
}
function losa(c: Ctx, h: (i: number) => number) {
  c.fillStyle = "#E7E3D8"; c.fillRect(-4000, PISO, 9000, LOSA - PISO);
  c.strokeStyle = "rgba(17,17,17,.62)"; c.lineWidth = 3.5; c.beginPath();
  for (let i = -6; i < 100; i++) { const x = i * 30; c.moveTo(x + h(i) * 3, LOSA); c.lineTo(x + 100 + h(i + 40) * 3, PISO); }
  c.stroke();
  c.fillStyle = TINTA; c.fillRect(-4000, PISO - 3, 9000, 9); c.fillRect(-4000, LOSA - 3, 9000, 7);
}
function dibujaTubo(c: Ctx, t: number, d: Dat, L: number) {
  const flujo = papelViajando(t) ? 1 : 0, vel = flujo ? 760 : 60;
  const estira = (fn: () => void) => { c.save(); c.lineCap = "round"; c.lineJoin = "round"; fn(); c.restore(); };
  // cuarto: tinta sobre papel
  estira(() => {
    c.beginPath(); c.rect(-4000, -3000, 9000, 3000 + LOSA); c.clip();
    c.strokeStyle = TINTA; c.lineWidth = 46; c.stroke(d.tubo); c.strokeStyle = "#E4E8E6"; c.lineWidth = 34; c.stroke(d.tubo);
    c.setLineDash([4, 26]); c.lineDashOffset = -t * vel; c.strokeStyle = `rgba(17,17,17,${flujo ? .5 : .24})`; c.lineWidth = 5; c.stroke(d.tubo); c.setLineDash([]);
  });
  const pv = papelViajando(t), enOscuro = L <= 0 && pv && pv.y >= LOSA - 30;
  if (L > 0 || enOscuro) {
    const q = L > 0 ? 1 : .9;
    estira(() => {
      c.beginPath(); c.rect(-4000, LOSA, 9000, 4000); c.clip();
      c.globalAlpha = q; c.strokeStyle = "#8d8b84"; c.lineWidth = 46; c.stroke(d.tubo); c.strokeStyle = "#141413"; c.lineWidth = 34; c.stroke(d.tubo);
      c.setLineDash([4, 26]); c.lineDashOffset = -t * vel; c.strokeStyle = `rgba(237,234,227,${flujo ? .6 : .28})`; c.lineWidth = 5; c.stroke(d.tubo); c.setLineDash([]);
    });
    c.save(); c.globalAlpha = q; c.fillStyle = "#AEABA2"; c.strokeStyle = LUZ; c.lineWidth = 4;
    c.beginPath(); c.moveTo(HOP.x - 34, HOP.y - 8); c.lineTo(HOP.x + 34, HOP.y - 8); c.lineTo(HOP.x + 58, HOP.y + 40); c.lineTo(HOP.x - 58, HOP.y + 40); c.closePath(); c.fill(); c.stroke(); c.restore();
  }
  // collarines
  for (let i = 0; i < 14; i++) {
    const u = (i + .6) / 14, p = enTubo(u), dark = p.y >= LOSA, nx = -Math.sin(p.a), ny = Math.cos(p.a);
    if (dark && L <= 0 && !enOscuro) continue;
    c.strokeStyle = dark ? "#AEABA2" : TINTA; c.lineWidth = 12; c.lineCap = "butt";
    c.beginPath(); c.moveTo(p.x - nx * 30, p.y - ny * 30); c.lineTo(p.x + nx * 30, p.y + ny * 30); c.stroke();
  }
  // A oscuras, el papelito alumbra el pedazo de tubo por donde va; lo demás no existe todavía.
  if (enOscuro && pv) {
    const g = c.createRadialGradient(pv.x, pv.y, 110, pv.x, pv.y, 380); g.addColorStop(0, "rgba(9,9,10,0)"); g.addColorStop(1, "rgba(9,9,10,1)");
    c.save(); c.beginPath(); c.rect(-4000, LOSA, 9000, 4000); c.clip(); c.fillStyle = g; c.fillRect(-4000, LOSA, 9000, 4000); c.restore();
  }
  // boca del tubo
  const b = enTubo(0), succ = t >= t0.y - .06 && t < t0.y + .34 ? Math.sin(prog(t, t0.y - .06, t0.y + .34) * 3.14) : 0;
  c.save(); c.translate(b.x, b.y); c.rotate(b.a + 3.14);
  c.fillStyle = "#2a2a28"; c.strokeStyle = TINTA; c.lineWidth = 5;
  c.beginPath(); c.moveTo(-6, -24); c.lineTo(56 + succ * 8, -54 - succ * 10); c.lineTo(56 + succ * 8, 54 + succ * 10); c.lineTo(-6, 24); c.closePath(); c.fill(); c.stroke(); c.restore();
}
function papelesExteriores(c: Ctx, t: number) {
  // Primer papelito: cae a la charola, el brazo lo lleva a la cabeza
  const f = finBrazo(t);
  const cae = (a: number, b: number) => lerp(HOP.y + 34, TRAY.y - 22, ease.inCubic(prog(t, a, b)));
  const ll1 = t0.espF + 1.2;
  if (t >= ll1 && t < t0.toma + .5) papelito(c, TRAY.x, cae(ll1, ll1 + .22), 0, false);
  if (t >= t0.toma + .5 && t < t0.toma + 1.08) { const dentro = prog(t, t0.toma + .9, t0.toma + 1.08); papelito(c, f.x, f.y + 44 + dentro * 34, 1.57, false); }
  // La respuesta: sale de la ranura, la pinza la levanta y se lee
  const sale = smooth(prog(t, t0.reg + .1, t0.resp + .24));
  if (t >= t0.reg + .1 && t < t0.resp + .46) {
    c.fillStyle = "#fff"; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.rect(MX + 74, SUELO - 270 + 148, 92 * sale, 42); c.fill(); c.stroke();
  }
  if (t >= t0.resp + .46 && t < t0.ochoF + .36) globoRespuesta(c, f.x, f.y + 108, t);
  if (t >= t0.ochoF + .36 && t < t0.ochoF + .86) { const k = smooth(prog(t, t0.ochoF + .36, t0.ochoF + .6)); if (k < 1) globoRespuesta(c, f.x, f.y + 108 - 40 * k, t); else papelito(c, f.x, f.y + 44, 1.57, false); }
  // El de «quien decide»
  const ll2 = t0.tocF + .5 + (t0.quien - .3 - t0.tocF - .5);
  if (t >= ll2 && t < t0.quien + .46) papelito(c, TRAY.x, cae(ll2, ll2 + .2), 0, false);
  if (t >= t0.quien + .46 && t < t0.ahi + .24) papelito(c, f.x, f.y + 44, 1.57, false);
  if (t >= t0.ahi + .24 && t < TOPE + .1) papelito(c, f.x, f.y + 44, 1.57, false);
  // El último
  const ll3 = t0.fin + .1;
  if (t >= ll3) papelito(c, TRAY.x, cae(ll3, ll3 + .2), 0, false);
}

// ---------- rótulos en pantalla ----------
function capa(c: Ctx, t: number) {
  const pie = 1495;
  rotulo(c, t, t0.jam, t0.ni1 - .25, "jamás", 350, 210, ACENTO, true);
  rotulo(c, t, t0.hecho, t0.ni1 - .25, "ha hecho nada", 500, 112, TINTA);
  rotulo(c, t, t0.fiesta - .04, t0.mesa - .14, "la fiesta de tu mamá", pie, 106, LUZ, true);
  rotulo(c, t, t0.mesa, t0.no - .3, "12 el sábado", pie, 130, LUZ, true);
  rotulo(c, t, t0.no, t0.lo - .2, "no puede llamar", pie, 116, LUZ);
  rotulo(c, t, t0.escr2 - .1, t0.asi + .4, "escribir", pie, 170, ROJO_N, true);
  rotulo(c, t, t0.det - .05, t0.queda - .1, "se detiene", pie, 150, LUZ, true);
  rotulo(c, t, t0.queda, t0.espF + .34, "esperando", pie, 150, LUZ, true);
  rotulo(c, t, t0.afu, t0.prog - .18, "afuera", pie, 170, LUZ, true);
  rotulo(c, t, t0.prog, t0.sin - .12, "un programa normal", pie, 104, LUZ);
  rotulo(c, t, t0.sin + .1, t0.como - .12, "nada de inteligencia", pie, 104, ROJO_N, true);
  rotulo(c, t, t0.como, t0.toma - .2, "mensajero", pie, 150, LUZ, true);
  rotulo(c, t, t0.modelo - .08, t0.listo - .15, "el modelo", 215, 130, TINTA, true);
  rotulo(c, t, t0.func - .05, t0.apa - .1, "function calling", 190, 136, TINTA, true);
  rotulo(c, t, t0.llam2 - .04, t0.apa - .1, "llamada a funciones", 272, 78, TINTA);
  const k = ease.outBack(prog(t, t0.jun - .08, t0.jun + .16), 2.2) * (1 - smooth(prog(t, t0.par - .35, t0.par - .08)));
  if (k > 0) { c.save(); c.translate(540, 196); c.rotate(-.045); const q = lerp(1.8, 1, clamp(k)); c.scale(q, q); c.globalAlpha = clamp(k); c.strokeStyle = ACENTO; c.lineWidth = 8; c.strokeRect(-326, -74, 652, 138); texto(c, "junio de 2023", 0, 24, { fuente: mono(70), color: ACENTO }); c.restore(); }
  rotulo(c, t, t0.par + .05, t0.es - .2, "un detalle", 300, 124, TINTA, true);
  rotulo(c, t, t0.leng - .1, t0.acc + .9, "el lenguaje", 228, 136, TINTA, true);
  rotulo(c, t, t0.acc - .02, t0.si - .2, "acción", 1540, 164, ROJO_N, true);
  rotulo(c, t, t0.cual - .04, t0.sint - .12, "cualquier programa", 222, 112, TINTA, true);
  rotulo(c, t, t0.sint, t0.tam + .3, "sin tocarlo", 232, 150, ACENTO, true);
  rotulo(c, t, t0.quien - .02, t0.noes - .06, "quien decide", pie, 130, LUZ, true);
  rotulo(c, t, t0.noes + .02, t0.esm - .36, "no es la IA", 416, 136, TINTA, true);
  rotulo(c, t, t0.esm, t0.ahi - .14, "es el mensajero", pie, 122, ROJO_N, true);
  rotulo(c, t, t0.pue - .1, t0.yahi - .1, "la puerta", pie, 150, LUZ, true);
  rotulo(c, t, t0.lla - .1, t0.llaF + .5, "la llave", pie, 150, ROJO_N, true);
  rotulo(c, t, t0.nun - .04, t0.sol - .16, "nunca", 176, 160, ACENTO, true);
  rotulo(c, t, t0.apr - .02, t0.sol - .16, "aprieta el botón", 258, 80, TINTA);
  rotulo(c, t, t0.sol, 999, "solo escribe", 226, 152, TINTA, true);
}

function dibuja(c: Ctx, t: number, d: Dat) {
  const sem = Math.floor(t * 10), h = (i: number) => { const x = Math.sin(i * 127.1 + sem * 311.7) * 43758.5453; return x - Math.floor(x) - .5; };
  // Golpes de cámara: uno por cada impacto de verdad
  const gol = (a: number, f = 1, dur = .5) => (t >= a && t < a + dur ? f * Math.exp(-(t - a) * 8) : 0);
  const gs = gol(H1, 1.3) + gol(H2, 1.7) + gol(t0.jam, 1.5) + gol(t0.jam + .36, .9) + gol(t0.nada2, 1.2, .7) + gol(CLAC, 1) + gol(CLAC2, 1.3) + gol(CLAC3, 1.6, .8) + gol(CIERRA + .3, 1.5) + gol(ECHA, .8) + gol(TOPE, 1) + gol(POM[0], .75) + gol(POM[1], .6);
  const tir = t > H2 && t < t0.jam ? prog(t, H2, t0.jam) ** 1.5 * .6 : 0;
  const cam = camaraDe(t), z = cam.z * (1 + .014 * Math.sin(t * .83) + .07 * gs);
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  c.save();
  c.translate(540 + 12 * Math.sin(t * .71) + (gs + tir) * 22 * Math.sin(t * 83), 860 + 14 * Math.cos(t * .61) + (gs + tir) * 20 * Math.cos(t * 71));
  c.rotate(.007 * Math.sin(t * .47) + gs * .012 * Math.sin(t * 61));
  c.scale(z, z); c.translate(-cam.x, -cam.y);
  escena(c, t, d, h);
  c.restore();
  // El cuarto se apaga cuando la voz baja; no es corte, la cámara sigue en el mismo mundo.
  capa(c, t);
}

function luzDe(t: number) {
  const on = t0.espF + 1.34;
  if (t < on) return 0;
  const a = t - on, chispa = a < .3 ? (a < .05 || (a > .12 && a < .17) ? 1 : .08) : 1;
  return chispa * tramos(t, 1, [[t0.tam + .1, t0.tam + 1.2, .3], [t0.ahi - .1, t0.ahi + .5, 1]]);
}

function escena(c: Ctx, t: number, d: Dat, h: (i: number) => number) {
  const L = luzDe(t);
  fondo(c, t, h, L);
  const conCuarto = t >= t0.tu;

  // ---------- lo de afuera ----------
  if (L > 0) {
    const atenua = 1 - .88 * seg(t, t0.puede - .1, t0.cual + .1, t0.tam + .6, t0.tam + 1.4);
    const ap = tramos(t, 1, [[CIERRA, CIERRA + .3, 0, ease.inCubic], [ABRE, ABRE + .34, 1, ease.outCubic]]);
    const cerr = tramos(t, 0, [[ECHA, ECHA + .1, 1], [ABRE - .16, ABRE - .02, 0]]);
    c.save();
    // cable al restaurante: el pulso rojo es la llamada de verdad
    c.strokeStyle = "#55544f"; c.lineWidth = 7; c.lineCap = "round"; c.beginPath(); c.moveTo(BOT.x + 112, SUELO - 22); c.lineTo(1640, SUELO - 22); c.stroke();
    for (const [a, b] of [[CLAC, t0.verd + .34], [t0.reg - .6, t0.reg - .26]] as P[]) if (t >= a && t < b) { const u = prog(t, a, b), x = lerp(BOT.x + 112, 1640, a === CLAC ? u : 1 - u); c.fillStyle = ACENTO; c.beginPath(); c.arc(x, SUELO - 22, 15, 0, 7); c.fill(); }
    restaurante(c, t);
    cuarto(c, t);
    marcoYHoja(c, t, ap, cerr);
    // lámpara: la que le da su lugar al muñeco
    const fo = seg(t, t0.esm - .05, t0.esm + .08, t0.ahi, t0.pue + .6) * .36 + .13;
    const cono = c.createLinearGradient(0, 900, 0, SUELO); cono.addColorStop(0, `rgba(255,240,205,${fo * 1.6})`); cono.addColorStop(1, `rgba(255,240,205,${fo * .25})`);
    c.fillStyle = cono; c.beginPath(); c.moveTo(MX - 34, 900); c.lineTo(MX + 34, 900); c.lineTo(MX + 210, SUELO); c.lineTo(MX - 210, SUELO); c.closePath(); c.fill();
    c.fillStyle = "#6c6a64"; c.beginPath(); c.moveTo(MX - 62, 906); c.lineTo(MX + 62, 906); c.lineTo(MX + 30, 870); c.lineTo(MX - 30, 870); c.closePath(); c.fill();
    // charola
    c.strokeStyle = "#AEABA2"; c.lineWidth = 8; c.beginPath(); c.moveTo(TRAY.x, TRAY.y); c.lineTo(TRAY.x, SUELO); c.stroke();
    c.fillStyle = "#807E77"; c.strokeStyle = LUZ; c.lineWidth = 3; c.beginPath(); c.moveTo(TRAY.x - 62, TRAY.y - 14); c.lineTo(TRAY.x + 62, TRAY.y - 14); c.lineTo(TRAY.x + 46, TRAY.y + 6); c.lineTo(TRAY.x - 46, TRAY.y + 6); c.closePath(); c.fill(); c.stroke();
    mensajero(c, t, t >= t0.toma + 1.08);
    const f = finBrazo(t);
    tijera(c, f);
    c.restore();
    papelesExteriores(c, t);
    // la llave
    if (t >= t0.lla - .7 && t < ABRE + .34) {
      const kx = PT.x + PT.w * .1, ky = PT.y + PT.h * .5 - 6;
      const u = ease.outCubic(prog(t, t0.lla - .6, t0.lla + .1)) * (1 - ease.inCubic(prog(t, ABRE - .04, ABRE + .34))), giro = smooth(prog(t, t0.llaF - .1, ECHA)) * 1.57 - smooth(prog(t, ABRE - .34, ABRE - .08)) * 1.57;
      llave(c, lerp(kx - 480, kx + 22, u), lerp(ky - 260, ky, u), giro, .9);
    }
    // sombra: L apaga todo; `foco` deja solo al muñeco en su charco de luz
    const foco = 1 - clamp((L - .3) / .7), base = 1 - clamp(L / .3);
    if (1 - atenua > .01 || foco > .01 || base > .01) {
      c.save(); c.beginPath(); c.rect(-4000, LOSA, 9000, 4000); c.clip();
      const g = c.createRadialGradient(MX + 70, 1290, 200, MX + 70, 1290, 620); g.addColorStop(0, `rgba(9,9,10,${base})`); g.addColorStop(1, `rgba(9,9,10,${Math.max(foco * .96, base)})`);
      c.fillStyle = g; c.fillRect(-4000, LOSA, 9000, 4000);
      c.fillStyle = `rgba(9,9,10,${1 - atenua})`; c.fillRect(-4000, LOSA, 9000, 4000); c.restore();
    }
  }
  programas(c, t);

  // ---------- el cuarto ----------
  losa(c, h);
  banderines(c, t);
  const sinPapel = t >= t0.sab2F + 1.05 && t < t0.esto;
  if (conCuarto) {
    caballete(c, t, 1);
    if (t >= t0.lo && t < t0.y) {
      if (!sinPapel) { c.save(); c.translate(0, 0); hojaEscrita(c, t); c.restore(); }
    }
  }
  if (t >= t0.esto && t < t0.par - .1 || t >= t0.es && t < t0.tam || t >= t0.sol) {
    // Las líneas solo crecen mientras la mano escribe: si la mano se va, se quedan como están.
    const vel = t >= t0.si - .1 && t < t0.sint ? 2.2 : .8, q = t >= t0.sol ? clamp(prog(t, t0.sol, t0.esc3 + .1) * .94) : t >= t0.sint ? .94 : (t * vel) % 1;
    c.fillStyle = "#6c6a64";
    for (let i = 0; i < 7; i++) { const u = clamp(q * 7 - i); if (u > 0) c.fillRect(HOJA.x - 100, HOJA.y - 118 + i * 40, (i % 3 === 2 ? 130 : 196) * u, 9); }
  }
  if (conCuarto) dibujaTubo(c, t, d, L); else { c.fillStyle = "rgba(0,0,0,0)"; }

  // El papelito sale del caballete, se enrolla y se va
  if (sinPapel && t < t0.y + .12) {
    const k = smooth(prog(t, t0.sab2F + .85, t0.y + .02));
    const x = lerp(HOJA.x, 722, k), y = lerp(HOJA.y, 438, k), w = lerp(HOJA.w, 66, smooth(prog(t, t0.sab2F + 1, t0.sab2F + 1.5)));
    papelito(c, x, y, lerp(0, enTubo(0).a, k), false, w);
  }
  const via = papelViajando(t);
  if (via) papelito(c, via.x, via.y, via.a, via.y >= LOSA && L <= 0);
  if (t >= t0.par - .1 && t < t0.es - .05) papelito(c, lerp(674, 708, ease.outCubic(prog(t, t0.par - .05, t0.es - .4))), lerp(458, 442, ease.outCubic(prog(t, t0.par - .05, t0.es - .4))), .35, false);
  if (t >= t0.ape - .06 && t < t0.modelo + .4) {
    const k = smooth(prog(t, t0.ape - .06, t0.ape + .2)), x = lerp(742, BX + 232, k), y = lerp(452, 470, k) - Math.sin(k * 3.14) * 90;
    c.save(); c.globalAlpha = 1 - smooth(prog(t, t0.modelo + .1, t0.modelo + .4)); c.translate(x, y); c.scale(lerp(.5, 1, k), lerp(.5, 1, k)); globoRespuesta(c, 0, 0, t); c.restore();
  }

  // ---------- arranque: el botón de papel ----------
  const est = estado(c, t);
  if (t < t0.jam + 1) {
    const dg = t >= H2 ? t - H2 : t >= H1 ? t - H1 : 9;
    const sq = 1 - (t >= H1 ? .1 * Math.exp(-dg * 7) * Math.cos(dg * 22) : 0);
    const ola = t >= H1 ? 26 * Math.exp(-dg * 3.6) : 0;
    if (t < t0.jam) {
      const u = prog(t, H2, t0.jam), tip = t < H2 ? 0 : 580 * ease.inCubic(u) * .92 + 46;
      hojaViva(c, d.boton, 540, PISO, t, { sq, ola: ola + (t > H2 ? 5 : 0), abre: abreRip(t), tip });
      if (t < H1) { c.strokeStyle = "rgba(17,17,17,.55)"; c.lineWidth = 5; for (let i = 0; i < 6; i++) { const x = 396 + i * 58, y = est.y - 300 - (i % 2) * 90; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 220); c.stroke(); } }
    } else {
      const a = t - t0.jam;
      for (const lado of [-1, 1] as const) {
        c.save(); c.translate(540 + lado * (120 + a * 1500), PISO + 340 * a * a); c.rotate(lado * (.34 + a * 2.6)); c.translate(lado < 0 ? -230 : -230, -580); mitad(c, d.boton, lado); c.restore();
      }
    }
  }
  pedazos(c, t, H1, 16, 540, 200, 760, 41);
  pedazos(c, t, H2, 26, 540, 210, 900, 42);
  pedazos(c, t, t0.jam, 70, 540, 470, 1250, 43, true);

  // ---------- ni mensaje ni mesa ----------
  if (t >= t0.ni1 - .1 && t < t0.nada2 + .8) {
    const rS = t0.msj + .02, rM = t0.mesa1 + .02;
    if (t < rS) brota(c, d.sobre, 790, PISO, ease.outBack(prog(t, t0.ni1 - .1, t0.ni1 + .22), 2)); else caer(c, d.sobre, 790, PISO, rS, t, t0.nada2);
    if (t >= t0.ni2 - .1) { if (t < rM) brota(c, d.mesa, 290, PISO, ease.outBack(prog(t, t0.ni2 - .1, t0.ni2 + .22), 2)); else caer(c, d.mesa, 290, PISO, rM, t, t0.nada2); }
    pedazos(c, t, rS, 22, 790, 620, 700, 44); pedazos(c, t, rM, 22, 290, 620, 700, 45);
  }

  // ---------- un lápiz que cae: lo único que le queda ----------
  if (t >= t0.cuando && t < t0.solo + .2) {
    const a = prog(t, t0.cuando + .06, t0.hizo), y = lerp(-300, 628, a * a), vib = t > t0.hizo ? Math.exp(-(t - t0.hizo) * 6) * Math.sin((t - t0.hizo) * 42) * .1 : 0;
    if (t < t0.solo - .08) lapiz(c, 726, y, -1.57 + (1 - a) * 7 + vib, 150);
  }
  // Lo que escribió: una palabra, y es lo único que ha producido
  const cf = ease.outCubic(1 - prog(t, t0.tu - .34, t0.tu - .02));
  if (t >= t0.escr - .02 && cf > 0) {
    c.save(); c.globalAlpha = cf; const ch = ancho(c, "escribió", serif(176, true));
    trazado(c, "escribió", 540 - ch / 2, 396, serif(176, true), ACENTO, prog(t, t0.escr - .02, t0.escr + .78), 176); c.restore();
  }
  // Se apaga un poco el cuarto cuando la voz baja
  const som = seg(t, t0.tam + .2, t0.tam + 1.3, t0.noes - .3, t0.noes - .05) * .62 + seg(t, t0.esm - .3, t0.esm - .1, t0.ahi + .2, t0.maq) * .5;
  if (som > 0) { c.fillStyle = `rgba(9,9,10,${som})`; c.fillRect(-4000, -3000, 9000, 3000 + LOSA); }

  for (const q of POM) if (t >= q && t < q + .32) {
    const k = (t - q) / .32;
    c.strokeStyle = `rgba(17,17,17,${1 - k})`; c.lineWidth = 6; c.lineCap = "round";
    for (const a of [-2.75, -2.3, -1.57, -.84, -.39]) { c.beginPath(); c.moveTo(BOT.x + Math.cos(a) * (46 + k * 44), PISO - 8 + Math.sin(a) * (46 + k * 44)); c.lineTo(BOT.x + Math.cos(a) * (84 + k * 74), PISO - 8 + Math.sin(a) * (84 + k * 74)); c.stroke(); }
  }
  telefonoPapel(c, t, 34, est.m1);
  nube(c, t);

  // ---------- la bola ----------
  const conPiso = t >= t0.jam + .1 || t < 0;
  agente(c, est.x, est.y, BR, est.m1, est.m2, { abre1: est.a1, abre2: est.a2, piso: conPiso ? PISO + 6 : undefined, sombra: .32 });
  if (est.lap) lapiz(c, est.lap.x, est.lap.y, est.lap.a, 150);
  // gorro de fiesta: cae al oír «agente»
  if (t >= t0.agente - .3) {
    const k = ease.outBack(prog(t, t0.agente - .3, t0.agente + .02), 1.6);
    gorro(c, est.x, est.y - (1 - k) * 280, BR, Math.sin(t * 2.2) * .04);
  }
  // los tres puntos: está esperando y no sabe hacer otra cosa
  const pu = seg(t, t0.queda - .04, t0.queda + .1, t0.ape - .1, t0.ape + .1);
  if (pu > 0) for (let i = 0; i < 3; i++) { const q = ((t * 1.6 - i * .22) % 1 + 1) % 1, r = 13 + 7 * Math.exp(-q * 6); c.fillStyle = `rgba(17,17,17,${pu})`; c.beginPath(); c.arc(est.x - 54 + i * 54, est.y - 262 - Math.exp(-q * 6) * 12, r, 0, 7); c.fill(); }

  // ---------- el globo: «listo, encontré lugar» ----------
  const gl = ease.outBack(prog(t, t0.listo - .1, t0.listo + .2), 1.5) * (1 - smooth(prog(t, t0.esto - .4, t0.esto - .08)));
  if (gl > .01) {
    const x = 570, y = 300;
    c.save(); c.translate(x - 200, y + 110); c.scale(gl, gl); c.translate(-(x - 200), -(y + 110));
    c.fillStyle = "#fff"; c.strokeStyle = TINTA; c.lineWidth = 6; c.beginPath(); c.roundRect(x - 310, y - 160, 620, 300, 56); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(x - 190, y + 136); c.lineTo(x - 260, y + 230); c.lineTo(x - 110, y + 136); c.closePath(); c.fill(); c.stroke(); c.fillStyle = "#fff"; c.fillRect(x - 192, y + 126, 80, 16);
    texto(c, "listo,", x, y - 40, { fuente: serif(112, true), color: TINTA });
    texto(c, "encontré lugar", x, y + 76, { fuente: serif(92, true), color: ACENTO, alfa: smooth(prog(t, t0.enc - .05, t0.enc + .1)) });
    c.restore();
  }
}

export const Pieza: React.FC = () => <Lienzo dibuja={dibuja} preparar={preparar} />;
