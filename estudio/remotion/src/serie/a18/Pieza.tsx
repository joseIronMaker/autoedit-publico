// Serie 2, capítulo 18: el claw. Un teléfono de papel cae en la mesa y de su pantalla sale una garra de alambre que
// chasquea. Su autor (solo su nombre escrito) lo sube a internet y el teléfono flota hasta un letrero donde los nombres
// se escriben y se tachan con la voz: Warelay → Clawdbot → Moltbot → OpenClaw. Siguiendo el alambre de la garra se
// llega a la computadora: ahí corre la bola, que mete la mano en tu teléfono, recibe tu mensaje y hace cosas en la
// máquina. Una mano con un sobre de Anthropic tacha Clawdbot; un odómetro de estrellas llega a 100,000. Llega la
// factura: un recibo cae, un solo clic, y la garra se voltea contra la computadora. Moltbook es una multitud de
// bolitas que presume "1.5 millones"; la lámpara de Wiz entra por el cajón abierto de la base de datos e ilumina
// detrás a unas 17,000 personas con los hilos, y del cajón sale un enjambre de llaves. En febrero el autor cruza la
// puerta de OpenAI y el letrero entra a la caja de la fundación. La gente normal lo prueba: manos con teléfonos.
// Cierra con la bola viviendo en un chat y su garra tocando las cosas de alguien, con un candado abierto colgando.
// Todos los instantes vienen de eventos.json, que escribe partitura.py: dibujo y sonido son los mismos números.
import React from "react";
import { azar, clamp, ease, lerp, prog, resorte, smooth, texto as textoKit } from "../../kit";
import { ACENTO, bola, GRIS, Lienzo, mono, PAPEL, serif, sombra, TINTA } from "../../marca";
import { brazo } from "../../personaje";
import duracion from "./duracion.json";
import ev from "./eventos.json";

export const DURACION = duracion.dur;
type C = CanvasRenderingContext2D;
type XY = { x: number; y: number };
type D = { spr: HTMLCanvasElement };

// ---------- herramientas ----------
/** El texto del kit pisa globalAlpha; este lo multiplica, así los fundidos de cada grupo también lo apagan. */
const texto = (c: CanvasRenderingContext2D, s: string, x: number, y: number, o: Parameters<typeof textoKit>[4]) => textoKit(c, s, x, y, { ...o, alfa: (o.alfa ?? 1) * c.globalAlpha });
let FR = 0;
const frac = (x: number) => x - Math.floor(x);
const tiembla = (j: number) => frac(Math.sin(j * 12.9898 + FR * 78.233) * 43758.5453) - .5;
const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * 6.2832 + f);
const ventana = (t: number, a: number, b: number, fi = .25, fo = .3) => smooth(prog(t, a, a + fi)) * (1 - smooth(prog(t, b, b + fo)));
const brota = (t: number, t0: number, f = 4.2, z = .38) => (t < t0 ? 0 : resorte(t - t0, f, z));
const golpeteo = (t: number, t0: number, amp: number, f = 13, d = 7) => (t < t0 ? 0 : amp * Math.exp(-(t - t0) * d) * Math.sin((t - t0) * f));
const BLANCO = "#FDFCF8", CARTON = "#E6DCC6", CARTON_O = "#CDBF9F", PIEL = "#F3ECDF", ROJO = "#E9896C", HUMO = "#D8D2C5", MESA = "#ECE7DC";

function rr(c: C, x: number, y: number, w: number, h: number, r: number) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function caja(c: C, x: number, y: number, w: number, h: number, r: number, fill: string | null, ink: string | null = TINTA, g = 5) {
  rr(c, x, y, w, h, r);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (ink) { c.strokeStyle = ink; c.lineWidth = g; c.stroke(); }
}
function linea(c: C, ax: number, ay: number, bx: number, by: number, g: number, color = TINTA) {
  c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round"; c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
}
function ajusta(c: C, s: string, px: number, max: number, f: (p: number) => string) { c.font = f(px); const w = c.measureText(s).width; return w > max ? px * max / w : px; }
/** Texto que se escribe de izquierda a derecha con una plumilla en el borde. */
function escribe(c: C, s: string, x: number, y: number, fuente: string, k: number, color = TINTA, alin: CanvasTextAlign = "center", pluma = true) {
  if (k <= 0) return;
  c.save(); c.font = fuente;
  const w = c.measureText(s).width, x0 = alin === "center" ? x - w / 2 : alin === "left" ? x : x - w;
  const px = parseFloat(fuente.match(/(\d+(\.\d+)?)px/)![1]);
  c.beginPath(); c.rect(x0 - 20, y - px * 1.1, (w + 40) * clamp(k), px * 1.5); c.clip();
  texto(c, s, x0, y, { fuente, color, alin: "left" });
  c.restore();
  if (pluma && k < 1) { const xp = x0 + w * k; c.fillStyle = color; c.beginPath(); c.arc(xp, y - px * .3 + Math.sin(k * 40) * px * .18, 6, 0, 7); c.fill(); }
}
/** Tachón a mano: una línea que tiembla, de izquierda a derecha. */
function tacha(c: C, x0: number, x1: number, y: number, k: number, color: string, g = 11, sem = 1) {
  if (k <= 0) return;
  const r = azar(sem), n = 14, xe = lerp(x0, x1, clamp(k));
  c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath();
  for (let i = 0; i <= n; i++) {
    const x = lerp(x0, x1, i / n); if (x > xe) break;
    const yy = y + (r() - .5) * 9 + (i / n - .5) * 16;
    if (i === 0) c.moveTo(x, yy); else c.lineTo(x, yy);
  }
  c.lineTo(xe, y + (k - .5) * 16); c.stroke();
}
function estrella(c: C, x: number, y: number, r: number, ang: number, fill: string, ink: string | null = TINTA) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = ang - Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? r * .45 : r; if (i === 0) c.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q); else c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
  c.closePath(); c.fillStyle = fill; c.fill(); if (ink) { c.strokeStyle = ink; c.lineWidth = Math.max(2, r * .12); c.lineJoin = "round"; c.stroke(); }
}
function globo(c: C, x: number, y: number, w: number, h: number, fill: string, ink: string | null, cola: -1 | 0 | 1, g = 5) {
  c.beginPath(); c.roundRect(x - w / 2, y - h / 2, w, h, Math.min(h * .45, 46));
  if (cola) { const bx = x + cola * w * .3; c.moveTo(bx - 18 * cola, y + h / 2 - 2); c.lineTo(bx + 16 * cola, y + h / 2 + h * .32); c.lineTo(bx + 26 * cola, y + h / 2 - 2); }
  c.fillStyle = fill; c.fill(); if (ink) { c.strokeStyle = ink; c.lineWidth = g; c.lineJoin = "round"; c.stroke(); }
  if (cola) { c.fillStyle = fill; c.fillRect(x + cola * w * .3 - 20, y + h / 2 - 6, 50, 9); }
}
function llave(c: C, x: number, y: number, ang: number, s: number, color = TINTA) {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s);
  c.strokeStyle = color; c.lineWidth = 6; c.beginPath(); c.arc(-26, 0, 13, 0, 7); c.stroke();
  c.fillStyle = color; c.fillRect(-13, -3.5, 46, 7); c.fillRect(20, 2, 6, 11); c.fillRect(29, 2, 5, 8);
  c.restore();
}
/** Mano de papel. Muñeca en (x,y), los dedos apuntan hacia ang (0 = arriba). dedo: 0 puño, 1 índice estirado. */
function mano(c: C, x: number, y: number, ang: number, s: number, o: { piel?: string; manga?: string; tinta?: string; dedo?: number; largoManga?: number } = {}) {
  const piel = o.piel ?? PIEL, ink = o.tinta ?? TINTA, d = o.dedo ?? 1;
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s);
  c.lineJoin = "round";
  caja(c, -60, 4, 120, o.largoManga ?? 900, 14, o.manga ?? HUMO, ink, 6);
  caja(c, -50, -96, 100, 104, 34, piel, ink, 6);
  for (const [dx, dy] of [[-30, -98], [-6, -102], [18, -98]] as [number, number][]) caja(c, dx - 13 + (d > .5 ? 0 : 0), dy - 22 + (d > .5 ? 14 : 0), 26, 40, 13, piel, ink, 5);
  if (d > 0) caja(c, 26, -96 - 118 * d, 28, 22 + 118 * d, 14, piel, ink, 5);
  c.save(); c.translate(-48, -30); c.rotate(-.75); caja(c, -14, -70, 28, 78, 14, piel, ink, 5); c.restore();
  c.restore();
}
/** Una persona de papel recortado, sin cara. piso = y de los pies. */
function persona(c: C, x: number, piso: number, h: number, o: { tinte?: string; tinta?: string; bL?: number; bR?: number; paso?: number; alfa?: number } = {}) {
  const a = o.alfa ?? 1; if (a <= .01) return;
  const fill = o.tinte ?? HUMO, ink = o.tinta ?? TINTA;
  c.save(); c.globalAlpha *= a; c.lineCap = "round"; c.lineJoin = "round";
  const cad = piso - h * .44, hom = piso - h * .75, r = h * .1, cab = piso - h + r, gr = h * .085;
  const extrem = (ax: number, ay: number, bx: number, by: number) => { linea(c, ax, ay, bx, by, gr + 9, ink); linea(c, ax, ay, bx, by, gr, fill); };
  const p = o.paso ?? 0, L = h * .44;
  for (const sg of [-1, 1]) extrem(x + sg * h * .05, cad, x + sg * h * .05 + Math.sin(sg * p) * L, cad + Math.cos(sg * p) * L);
  const bra = (sg: number, an: number) => extrem(x + sg * h * .12, hom + gr * .4, x + sg * h * .12 + sg * Math.sin(an) * h * .33, hom + gr * .4 + Math.cos(an) * h * .33);
  bra(-1, o.bL ?? .12); bra(1, o.bR ?? .12);
  c.beginPath(); c.moveTo(x - h * .15, hom); c.lineTo(x + h * .15, hom); c.lineTo(x + h * .12, cad + h * .03); c.lineTo(x - h * .12, cad + h * .03); c.closePath();
  c.fillStyle = fill; c.fill(); c.strokeStyle = ink; c.lineWidth = 5; c.stroke();
  c.beginPath(); c.arc(x, cab, r, 0, 7); c.fillStyle = fill; c.fill(); c.stroke();
  c.restore();
}
/** Dónde quedan las manos de `persona` (para colgarles cosas). */
function manosDe(x: number, piso: number, h: number, bL: number, bR: number): [XY, XY] {
  const hom = piso - h * .75 + h * .085 * .4;
  return [{ x: x - h * .12 - Math.sin(bL) * h * .33, y: hom + Math.cos(bL) * h * .33 }, { x: x + h * .12 + Math.sin(bR) * h * .33, y: hom + Math.cos(bR) * h * .33 }];
}
/** Teléfono de papel. dentro() dibuja la pantalla con (0,0) en su centro. */
function telefono(c: C, x: number, y: number, w: number, h: number, ang: number, dentro?: (sw: number, sh: number) => void) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.translate(tiembla(x * .01) * 1.4, tiembla(y * .01 + 3) * 1.4);
  caja(c, -w / 2, -h / 2, w, h, w * .17, TINTA, null);
  const m = w * .065, sw = w - 2 * m, sh = h - m * 4.2;
  caja(c, -sw / 2, -sh / 2, sw, sh, w * .09, BLANCO, null);
  if (dentro) { c.save(); rr(c, -sw / 2, -sh / 2, sw, sh, w * .09); c.clip(); dentro(sw, sh); c.restore(); }
  caja(c, -w * .12, -h / 2 + m * .7, w * .24, m * .5, 6, "#3b3a37", null);
  c.restore();
}
function puntoTel(x: number, y: number, ang: number, lx: number, ly: number): XY {
  return { x: x + lx * Math.cos(ang) - ly * Math.sin(ang), y: y + lx * Math.sin(ang) + ly * Math.cos(ang) };
}
/** El agujero por donde la garra atraviesa la pantalla. */
function agujero(c: C, p: XY, r: number, a: number) {
  if (a <= .01) return;
  c.save(); c.globalAlpha *= a; c.translate(p.x, p.y);
  c.fillStyle = TINTA; c.beginPath(); c.ellipse(0, 0, r, r * .62, -.3, 0, 7); c.fill();
  c.strokeStyle = TINTA; c.lineWidth = 3;
  for (let i = 0; i < 6; i++) { const an = i * 1.05 + .3; c.beginPath(); c.moveTo(Math.cos(an) * r, Math.sin(an) * r * .62); c.lineTo(Math.cos(an) * r * 1.9, Math.sin(an) * r * 1.4); c.stroke(); }
  c.restore();
}

// ---------- cámara: cada región tiene coordenadas locales de pantalla (zoom 1, centro 540,900) ----------
type V = { x: number; y: number; z: number };
const A_MESA: XY = { x: 0, y: 0 }, A_LETRERO: XY = { x: 0, y: -1500 }, A_PLAZA: XY = { x: 3200, y: -300 }, A_PUERTA: XY = { x: 1450, y: -1500 };
const W = (a: XY, lx: number, ly: number): XY => ({ x: a.x + lx - 540, y: a.y + ly - 900 });
const vw = (a: XY, lx: number, ly: number, z: number): V => { const p = W(a, lx, ly); return { x: p.x, y: p.y, z }; };
const CLAVES: [number, number, V, ((x: number) => number)?][] = [
  [0, 0, vw(A_MESA, 330, 1185, 1.52)],
  [ev.autor - .15, 1.1, vw(A_MESA, 225, 1040, .9)],
  [ev.sube + .15, 1.6, vw(A_LETRERO, 540, 900, 1)],
  [ev.idea + .08, .8, vw(A_MESA, 560, 1010, 1.1)],
  [ev.telefono - .1, 1.0, vw(A_MESA, 330, 1190, 1.3)],
  [ev.envia + .05, .75, vw(A_MESA, 560, 1010, 1.1)],
  [ev.arriba, .8, vw(A_LETRERO, 540, 900, 1)],
  [ev.quita + .05, .8, vw(A_MESA, 560, 1010, 1.1)],
  [ev.latigazo, .55, vw(A_PLAZA, 540, 900, 1), ease.outExpo],
  [ev.latigazo2, .65, vw(A_PUERTA, 540, 900, 1), ease.outExpo],
  [ev.caja - .05, .7, vw(A_LETRERO, 540, 900, 1)],
  [ev.atras - .15, 1.4, { x: 350, y: -1050, z: .5 }],
];
function vista(t: number): V {
  let v = CLAVES[0][2];
  for (let i = 1; i < CLAVES.length; i++) {
    const [a, d, b, f] = CLAVES[i];
    if (t < a) break;
    const k = (f ?? ease.inOutCubic)(prog(t, a, a + d));
    v = { x: lerp(v.x, b.x, k), y: lerp(v.y, b.y, k), z: v.z * (b.z / v.z) ** k };
  }
  return v;
}
const GOLPES: [number, number][] = [[ev.cae, 16], [ev.aterriza, 12], [ev.factura, 24], [ev.clic, 7], [ev.agarra, 12], [ev.sacude, 16], [ev.cierra, 10], [ev.solapas[1], 6], [ev.latigazo + .5, 8]];
function sacudida(t: number) {
  let x = 0, y = 0;
  for (const [ti, a] of GOLPES) { if (t < ti || t > ti + .8) continue; const u = t - ti; x += a * Math.exp(-u * 8) * Math.sin(u * 71); y += a * .8 * Math.exp(-u * 8) * Math.cos(u * 63); }
  return { x, y };
}

// ---------- fondo ----------
function polvo(c: C, t: number) {
  const r = azar(18);
  c.fillStyle = TINTA;
  for (let i = 0; i < 80; i++) {
    const x0 = r() * 1200 - 60, y0 = r() * 2060, v = 14 + r() * 40, f = r() * 6.3, z = 1.6 + r() * 3.2;
    const y = ((y0 - t * v) % 2060 + 2060) % 2060 - 70, x = x0 + Math.sin(t * .5 + f) * 36;
    c.globalAlpha = .07 + r() * .16; c.fillRect(x, y, z, z);
  }
  c.globalAlpha = 1;
}

// ---------- 1-3. el teléfono principal ----------
const PH_W = 300, PH_H = 560;
const PH_MESA = W(A_MESA, 325, 1290), PH_COLGADO = W(A_LETRERO, 540, 1290);
function telPos(t: number): { x: number; y: number; ang: number; sq: number } {
  if (t < ev.cae) { const k = t / ev.cae; return { x: PH_MESA.x, y: PH_MESA.y - 640 * (1 - k * k), ang: -.06 + (1 - k) * .1, sq: 0 }; }
  const sq = golpeteo(t, ev.cae, .07, 30, 9) + golpeteo(t, ev.aterriza, .06, 30, 9);
  if (t < ev.sube) return { x: PH_MESA.x, y: PH_MESA.y, ang: -.06, sq };
  const t1 = ev.sube + 1.7;
  if (t < t1) {
    const k = ease.inOutCubic(prog(t, ev.sube, t1));
    return { x: lerp(PH_MESA.x, PH_COLGADO.x, k) - Math.sin(k * Math.PI) * 140, y: lerp(PH_MESA.y, PH_COLGADO.y, k) - Math.sin(k * Math.PI) * 60, ang: lerp(-.06, 0, k) + Math.sin(k * Math.PI) * .25, sq: 0 };
  }
  const t2 = ev.idea + .06;
  if (t < t2) return { x: PH_COLGADO.x, y: PH_COLGADO.y, ang: .035 * Math.sin((t - t1) * 2.2) * Math.exp(-(t - t1) * .25) + .02 * vaiven(t, 3.1) + golpeteo(t, ev.clawdbot, .06, 9, 2.5), sq: 0 };
  if (t < ev.aterriza) { const k = prog(t, t2, ev.aterriza); return { x: lerp(PH_COLGADO.x, PH_MESA.x, k), y: lerp(PH_COLGADO.y, PH_MESA.y, k * k), ang: lerp(0, -.06, k) + Math.sin(k * 3) * .12, sq: 0 }; }
  return { x: PH_MESA.x, y: PH_MESA.y, ang: -.06 + .008 * vaiven(t, 4.3) + golpeteo(t, ev.vibra, .025, 60, 6), sq };
}
/** Punta de la garra en coordenadas de mundo, más su apertura. */
function garraDe(t: number, P: ReturnType<typeof telPos>, compu: { x: number; y: number }): { tip: XY; abre: number; largo: number; doblez: number } {
  const base = puntoTel(P.x, P.y, P.ang, 18, -60);
  let lx = -120 + 55 * vaiven(t, 1.6) + 20 * vaiven(t, .7, 2), ly = -365 + 30 * vaiven(t, 2.1, 1);
  let abre = .55 + .25 * vaiven(t, 1.3);
  for (const s of [...ev.snap, ...ev.snap2]) {
    const u = t - s;
    if (u > -.14 && u < .4) { abre = u < 0 ? lerp(abre, 1, prog(u, -.14, -.03)) : lerp(.0, abre, smooth(prog(u, .06, .4))); const em = u < 0 ? smooth(prog(u, -.14, 0)) : 1 - smooth(prog(u, .02, .35)); lx -= 40 * em; ly -= 60 * em; }
  }
  const cae = smooth(prog(t, ev.aburrido - .1, ev.aburrido + .5)) * (1 - smooth(prog(t, ev.clawdbot - .15, ev.clawdbot + .2)));
  lx = lerp(lx, -205, cae); ly = lerp(ly, 30, cae); abre = lerp(abre, .7, cae);
  let tip = puntoTel(P.x, P.y, P.ang, lx, ly);
  // La garra agarra la burbuja y la empuja al alambre.
  // El ataque: se voltea hacia la computadora y la aprieta.
  const v = smooth(prog(t, ev.voltea, ev.agarra)) * (1 - smooth(prog(t, ev.latigazo + .4, ev.latigazo + .6)));
  if (v > 0) {
    const objetivo = { x: compu.x - 250 + 8 * Math.sin(t * 40) * smooth(prog(t, ev.agarra, ev.agarra + .1)), y: compu.y + 120 };
    const k = ease.inOutCubic(v);
    tip = { x: lerp(tip.x, objetivo.x, k) - Math.sin(k * Math.PI) * 120, y: lerp(tip.y, objetivo.y, k) - Math.sin(k * Math.PI) * 160 };
    abre = t > ev.agarra ? .02 : lerp(abre, 1, k);
  }
  const largo = t < ev.garra ? 0 : clamp(ease.outBack(prog(t, ev.garra, ev.garra + .3), 2.2), 0, 1.15);
  return { tip: { x: lerp(base.x, tip.x, Math.min(largo, 1.15)), y: lerp(base.y, tip.y, Math.min(largo, 1.15)) }, abre, largo: Math.min(largo, 1), doblez: lerp(70, -90, v) };
}

// ---------- la mesa y la computadora (región A_MESA) ----------
const MON = { x: 690, y: 680, w: 500, h: 400 };
const BOLA_M = { x: 846, y: 774, r: 64 };
function mesa(c: C, t: number) {
  const a = 1 - smooth(prog(t, ev.latigazo, ev.latigazo + .3)) + smooth(prog(t, ev.atras, ev.atras + .5));
  if (a <= .01) return;
  c.save(); c.globalAlpha *= clamp(a);
  c.fillStyle = MESA; c.fillRect(-900, 950, 2900, 900);
  linea(c, -900, 950, 2000, 950, 5);
  const k = t < ev.compu ? 0 : clamp(resorte(t - ev.compu, 3.6, .45), 0, 1.2);
  if (k > 0) {
    c.save(); c.translate(0, 1000); c.scale(1, k); c.translate(0, -1000);
    // teclado
    c.save(); c.translate(690, 990); c.transform(1, 0, -.35, 1, 0, 0);
    caja(c, -200, -18, 400, 50, 10, BLANCO, TINTA, 5);
    c.fillStyle = TINTA; for (let i = 0; i < 14; i++) for (let j = 0; j < 2; j++) c.fillRect(-184 + i * 26.5, -8 + j * 20, 18, 10);
    c.restore();
    c.restore();
  }
  c.restore();
}
function monitor(c: C, t: number) {
  const k = t < ev.compu ? 0 : clamp(resorte(t - ev.compu, 3.6, .45), 0, 1.2);
  const fuera = smooth(prog(t, ev.latigazo, ev.latigazo + .3)) * (1 - smooth(prog(t, ev.atras, ev.atras + .5)));
  if (k <= .01 || fuera > .99) return;
  const sac = t > ev.agarra && t < ev.latigazo + .5 ? (5 + 9 * Math.exp(-(t - ev.sacude) * 3) * (t > ev.sacude ? 1 : 0)) * Math.sin(t * 52) : 0;
  c.save(); c.globalAlpha *= 1 - fuera; c.translate(0, 950); c.scale(1, k); c.translate(sac, -950);
  // pie
  c.fillStyle = TINTA; c.beginPath(); c.moveTo(MON.x - 40, MON.y + MON.h / 2 - 4); c.lineTo(MON.x + 40, MON.y + MON.h / 2 - 4); c.lineTo(MON.x + 26, 935); c.lineTo(MON.x - 26, 935); c.fill();
  caja(c, MON.x - 130, 930, 260, 22, 8, TINTA, null);
  caja(c, MON.x - MON.w / 2, MON.y - MON.h / 2, MON.w, MON.h, 26, TINTA, null);
  const sx = MON.x - MON.w / 2 + 22, sy = MON.y - MON.h / 2 + 22, sw = MON.w - 44, sh = MON.h - 44;
  caja(c, sx, sy, sw, sh, 12, BLANCO, null);
  c.save(); rr(c, sx, sy, sw, sh, 12); c.clip();
  pantallaCompu(c, t, sx, sy, sw, sh);
  c.restore();
  c.restore();
}
/** Lo que pasa dentro de la computadora: ventanas que la bola abre, y el rojo del ataque. */
function pantallaCompu(c: C, t: number, sx: number, sy: number, sw: number, sh: number) {
  // ventana calendario
  const v1 = brota(t, ev.ventana, 4.5, .4);
  if (v1 > 0.01) {
    c.save(); c.translate(sx + 130, sy + 110); c.scale(v1, v1);
    caja(c, -110, -86, 220, 172, 10, BLANCO, TINTA, 5); c.fillStyle = TINTA; c.fillRect(-110, -86, 220, 30);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) caja(c, -96 + i * 50, -44 + j * 42, 40, 32, 4, null, GRIS, 3);
    const kc = smooth(prog(t, ev.circulo, ev.circulo + .3));
    if (kc > 0) { c.strokeStyle = ACENTO; c.lineWidth = 7; c.beginPath(); c.arc(-96 + 2 * 50 + 20, -44 + 42 + 16, 28, -1.4, -1.4 + 6.4 * kc); c.stroke(); }
    c.restore();
  }
  const v2 = brota(t, ev.ventana + .22, 4.5, .4);
  if (v2 > 0.01) {
    c.save(); c.translate(sx + 340, sy + 92); c.scale(v2, v2);
    caja(c, -100, -66, 200, 132, 10, BLANCO, TINTA, 5);
    for (let i = 0; i < 3; i++) {
      caja(c, -82, -44 + i * 38, 24, 24, 4, null, TINTA, 4);
      c.fillStyle = GRIS; c.fillRect(-46, -36 + i * 38, 112 - i * 18, 9);
      const tt = ev.palomas[Math.min(i, 1)] + (i === 2 ? .14 : 0);
      const kp = smooth(prog(t, tt, tt + .12));
      if (kp > 0) { c.strokeStyle = ACENTO; c.lineWidth = 6; c.lineCap = "round"; c.beginPath(); c.moveTo(-78, -32 + i * 38); c.lineTo(-70, -24 + i * 38); c.lineTo(-70 + 22 * kp, -46 + i * 38); c.stroke(); }
    }
    c.restore();
  }
  // la bola vive aquí: corre en tu computadora
  const kb = brota(t, ev.bola, 4.6, .38);
  if (kb > .01) {
    const bx = BOLA_M.x + 4 * vaiven(t, 1.7), by = BOLA_M.y - Math.abs(Math.sin(t * 3.1)) * 6 * (t < ev.agarra ? 1 : 0) - (t > ev.agarra && t < ev.latigazo ? Math.abs(Math.sin(t * 17)) * 18 : 0);
    const r = BOLA_M.r * kb, g = r / 90;
    // mano derecha: trabaja en las ventanas
    let h2: XY = { x: bx + 60 * g + 70, y: by - 120 + 10 * vaiven(t, .9) };
    if (t > ev.hace - .1 && t < ev.sobre + .5) {
      const sec: [number, XY][] = [[ev.hace, { x: sx + 140, y: sy + 140 }], [ev.circulo, { x: sx + 250, y: sy + 150 }], [ev.palomas[0], { x: sx + 270, y: sy + 70 }], [ev.palomas[1], { x: sx + 280, y: sy + 110 }], [ev.sobre - .1, { x: bx + 150, y: by - 200 }]];
      for (const [ti, p] of sec) if (t > ti - .18) h2 = { x: lerp(h2.x, p.x, smooth(prog(t, ti - .18, ti))), y: lerp(h2.y, p.y, smooth(prog(t, ti - .18, ti))) };
    }
    if (t > ev.agarra && t < ev.latigazo) h2 = { x: bx + 40 + 30 * Math.sin(t * 19), y: by - 170 + 26 * Math.cos(t * 23) };
    sombra(c, bx, sy + sh - 6, r * 1.4, .25);
    brazo(c, bx + 60 * g, by - 30 * g, h2.x, h2.y, -100 * g, t > ev.agarra && t < ev.latigazo ? 1 : .6, TINTA, kb, g);
    bola(c, bx, by, r);
  }
  // el sobre de la invitación sale volando
  if (t > ev.sobre && t < ev.sobre + 1) {
    const u = t - ev.sobre;
    c.save(); c.translate(sx + sw - 120 + u * 520, sy + 120 - u * 420 + u * u * 120); c.rotate(-.2 + u * 1.2);
    caja(c, -40, -27, 80, 54, 3, BLANCO, TINTA, 4); c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.moveTo(-40, -27); c.lineTo(0, 4); c.lineTo(40, -27); c.stroke(); c.restore();
  }
  // el ataque: la pantalla se llena de órdenes en rojo
  const ka = smooth(prog(t, ev.agarra, ev.agarra + .25));
  if (ka > 0 && t < ev.latigazo + .6) {
    c.save(); c.globalAlpha = ka * .5; c.fillStyle = ACENTO; c.fillRect(sx, sy, sw, sh); c.restore();
    const r = azar(66);
    c.save(); c.globalAlpha = ka;
    const n = Math.floor((t - ev.agarra) * 24);
    for (let i = 0; i < Math.min(n, 13); i++) { c.fillStyle = i % 3 ? TINTA : "#7E2413"; c.fillRect(sx + 26 + r() * 30, sy + 24 + i * 26, 90 + r() * 300, 11); }
    c.restore();
  }
}
/** El alambre del brazo izquierdo de la bola, que va de la computadora a tu teléfono. */
function alambre(c: C, t: number, P: ReturnType<typeof telPos>) {
  if (t < ev.traza || t > ev.latigazo + .5) return;
  const kb = brota(t, ev.bola, 4.6, .38), g = BOLA_M.r / 90;
  const S = W(A_MESA, BOLA_M.x - 54 * g + 4 * vaiven(t, 1.7), BOLA_M.y - 50 * g);
  const Pp = puntoTel(P.x, P.y, P.ang, 30, 40);
  const k = ease.inOutCubic(prog(t, ev.traza, ev.bola));
  const dob = 150;
  if (k < 1 || kb < .3) {
    // el trazo: se sigue el alambre desde el teléfono hasta encontrar a la bola
    const mx = (S.x + Pp.x) / 2, my = (S.y + Pp.y) / 2, dx = Pp.x - S.x, dy = Pp.y - S.y, d = Math.hypot(dx, dy);
    const cx = mx - dy / d * dob, cy = my + dx / d * dob;
    c.strokeStyle = TINTA; c.lineWidth = 17 * g; c.lineCap = "round"; c.beginPath();
    for (let i = 0; i <= 40; i++) {
      const u = 1 - i / 40 * k, a = 1 - u;
      const x = a * a * S.x + 2 * a * u * cx + u * u * Pp.x, y = a * a * S.y + 2 * a * u * cy + u * u * Pp.y;
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.stroke();
    if (k > 0 && k < 1) {
      const u = 1 - k, a = 1 - u, x = a * a * S.x + 2 * a * u * cx + u * u * Pp.x, y = a * a * S.y + 2 * a * u * cy + u * u * Pp.y;
      c.fillStyle = ACENTO; c.beginPath(); c.arc(x, y, 13, 0, 7); c.fill();
    }
  }
  if (kb >= .3) brazo(c, S.x, S.y, Pp.x, Pp.y, dob, .5, TINTA, 1, g);
}

// ---------- el mensaje: "como a un amigo" ----------
function mensajeGrande(c: C, t: number, P: ReturnType<typeof telPos>) {
  if (t < ev.escribe - .05 || t > ev.llega + .1) return;
  const g = BOLA_M.r / 90;
  const S = W(A_MESA, BOLA_M.x - 54 * g, BOLA_M.y - 50 * g), Pp = puntoTel(P.x, P.y, P.ang, 30, 40);
  const k0 = brota(t, ev.escribe, 4, .45);
  const viaje = ease.inOutCubic(prog(t, ev.envia, ev.llega));
  // al viajar, el globo sigue la curva del alambre de vuelta a la bola
  const dob = 150, mx = (S.x + Pp.x) / 2, my = (S.y + Pp.y) / 2, dx = Pp.x - S.x, dy = Pp.y - S.y, d = Math.hypot(dx, dy);
  const cx = mx - dy / d * dob, cy = my + dx / d * dob, u = 1 - viaje, a = 1 - u;
  const pv = { x: a * a * S.x + 2 * a * u * cx + u * u * Pp.x, y: a * a * S.y + 2 * a * u * cy + u * u * Pp.y };
  const ini = W(A_MESA, 177, 916);
  const x = lerp(ini.x, pv.x, smooth(prog(t, ev.envia - .05, ev.envia + .2))), y = lerp(ini.y, pv.y, smooth(prog(t, ev.envia - .05, ev.envia + .2)));
  const esc = k0 * lerp(.8, .1, ease.inCubic(viaje));
  if (esc < .02) return;
  c.save(); c.translate(x, y); c.scale(esc, esc); c.rotate(-.03);
  globo(c, 0, 0, 590, 230, TINTA, null, 1);
  const txt = "¿me armas la fiesta|de mamá?".split("|");
  const n = Math.floor(prog(t, ev.escribe + .05, ev.escribeF - .1) * 26);
  let q = n;
  txt.forEach((s, i) => { const vis = s.slice(0, Math.max(0, q)); q -= s.length; texto(c, vis, -255, -18 + i * 84, { fuente: serif(68, true), color: BLANCO, alin: "left" }); });
  c.restore();
}
function burbujasChat(c: C, t: number, sw: number, sh: number) {
  // chat de fondo: siempre hay conversación
  const y0 = -sh / 2;
  caja(c, -sw / 2, y0, sw, 64, 0, "#EFECE5", null);
  c.fillStyle = TINTA; c.beginPath(); c.arc(-sw / 2 + 40, y0 + 32, 17, 0, 7); c.fill();
  c.fillStyle = GRIS; c.fillRect(-sw / 2 + 70, y0 + 26, 90, 12);
  const items: [number, number, number, boolean][] = [[-.62, 120, 0, false], [-.42, 150, 0, true], [-.2, 110, ev.mensajes[0], false], [.0, 170, ev.mensajes[1], true], [.2, 130, ev.mensajes[2], false]];
  for (const [fy, w, ti, mio] of items) {
    const k = ti ? brota(t, ti, 5, .45) : 1; if (k < .02) continue;
    c.save(); c.translate(mio ? sw / 2 - w / 2 - 18 : -sw / 2 + w / 2 + 18, fy * sh); c.scale(k, k);
    globo(c, 0, 0, w, 52, mio ? TINTA : "#E6E2D9", null, 0); c.restore();
  }
}
/** El botón trampa que llega al chat (un solo clic). */
function botonTrampa(c: C, t: number, sw: number, sh: number) {
  const k = brota(t, ev.boton, 5, .42); if (k < .02 || t > ev.latigazo + .6) return;
  const pr = t > ev.clic - .04 && t < ev.clic + .2 ? .86 : 1;
  c.save(); c.translate(-sw / 2 + 120, sh * .34); c.scale(k, k);
  globo(c, 0, 0, 200, 120, "#E6E2D9", null, 0);
  c.scale(pr, pr); caja(c, -70, -28, 140, 56, 28, ACENTO, TINTA, 4);
  c.restore();
}

// ---------- 2 y 4. el letrero (región A_LETRERO) ----------
const LET = { x: 540, y: 660, w: 800, h: 540 };
const FILAS = [{ s: "Warelay", y: 505, f: (p: number) => mono(p), px: 88 }, { s: "Clawdbot", y: 625, f: (p: number) => serif(p), px: 112 },
  { s: "Moltbot", y: 745, f: (p: number) => serif(p), px: 112 }, { s: "OpenClaw", y: 885, f: (p: number) => serif(p, true), px: 138 }];
function letreroBaja(t: number) { return ease.inCubic(prog(t, ev.baja, ev.baja + .75)) * 790; }
function letrero(c: C, t: number) {
  const vis = t > ev.sube + .4 && t < ev.atras + 2.5;
  if (!vis) return;
  const a = smooth(prog(t, ev.sube + .4, ev.sube + 1));
  const toque = ev.toques.reduce((s, ti) => s + golpeteo(t, ti, .02, 11, 4), 0) + golpeteo(t, ev.tacha2, .02, 9, 3);
  const ang = .012 * vaiven(t, 3.7) + toque + golpeteo(t, ev.clawdbot, .015, 8, 3);
  const baja = letreroBaja(t);
  c.save(); c.globalAlpha *= a;
  // cuerdas
  c.strokeStyle = TINTA; c.lineWidth = 3;
  for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(LET.x + sx * 300, -400); c.lineTo(LET.x + sx * 300 + Math.sin(ang) * 400, LET.y - LET.h / 2 + baja); c.stroke(); }
  c.translate(LET.x, LET.y - LET.h / 2 + baja); c.rotate(ang); c.translate(-LET.x, -(LET.y - LET.h / 2));
  c.translate(tiembla(5) * 1.2, tiembla(9) * 1.2);
  caja(c, LET.x - LET.w / 2, LET.y - LET.h / 2, LET.w, LET.h, 14, BLANCO, TINTA, 7);
  c.fillStyle = TINTA; for (const sx of [-1, 1]) { c.beginPath(); c.arc(LET.x + sx * 300, LET.y - LET.h / 2 + 22, 9, 0, 7); c.fill(); }
  // los nombres, en el orden de la voz
  const esc: [number, number][] = [[ev.warelay, ev.warelayF + .05], [ev.clawdbot, ev.clawdbotF + .1], [ev.moltbot, ev.moltbot + .55], [ev.openclaw, ev.subraya - .05]];
  FILAS.forEach((f, i) => {
    const k = prog(t, esc[i][0], esc[i][1]);
    c.font = f.f(f.px); const w = c.measureText(f.s).width;
    escribe(c, f.s, LET.x, f.y, f.f(f.px), k, i === 0 ? GRIS : TINTA);
    if (i === 0) tacha(c, LET.x - w / 2 - 14, LET.x + w / 2 + 14, f.y - f.px * .3, prog(t, ev.tacha1, ev.tacha1 + .28), TINTA, 10, 3);
    if (i === 1) tacha(c, LET.x - w / 2 - 14, LET.x + w / 2 + 14, f.y - f.px * .3, prog(t, ev.tacha2, ev.tacha2 + .26), ACENTO, 13, 4);
    if (i === 2) tacha(c, LET.x - w / 2 - 14, LET.x + w / 2 + 14, f.y - f.px * .3, prog(t, ev.tacha3, ev.tacha3 + .25), TINTA, 10, 5);
    if (i === 3) { const ku = prog(t, ev.subraya, ev.subraya + .3); if (ku > 0) linea(c, LET.x - w / 2, f.y + 26, LET.x - w / 2 + w * ease.outCubic(ku), f.y + 20, 9, ACENTO); }
  });
  c.restore();
}
/** Se habla de él: globos que brotan alrededor. */
function comentarios(c: C, t: number) {
  if (t < ev.burbujas[0] - .05 || t > ev.idea + 1.2) return;
  const r = azar(12);
  const vuela = ease.inCubic(prog(t, ev.idea - .05, ev.idea + .9));
  ev.burbujas.forEach((ti, i) => {
    const lado = i % 2 ? 1 : -1;
    const x = 540 + lado * (210 + r() * 210), y = 1020 + r() * 520, w = 120 + r() * 90, h = 70 + r() * 30, rot = (r() - .5) * .3, tipo = Math.floor(r() * 3);
    const k = brota(t, ti, 5.5, .4); if (k < .02) return;
    const p = W(A_LETRERO, x - vuela * 900 * (1 + r()), y - vuela * 300 * r());
    c.save(); c.translate(p.x, p.y + 4 * vaiven(t, .8 + i * .03, i)); c.rotate(rot + vuela * 2); c.scale(k, k);
    globo(c, 0, 0, w, h, BLANCO, TINTA, lado as 1 | -1, 4);
    if (tipo === 0) { c.fillStyle = TINTA; for (let j = 0; j < 3; j++) { c.beginPath(); c.arc(-24 + j * 24, 0, 7, 0, 7); c.fill(); } }
    else if (tipo === 1) texto(c, "!!", 0, 18, { fuente: serif(56), color: ACENTO });
    else { c.fillStyle = GRIS; c.fillRect(-w / 2 + 20, -12, w - 40, 9); c.fillRect(-w / 2 + 20, 6, (w - 40) * .6, 9); }
    c.restore();
  });
}
/** La mano de Anthropic: deja un sobre, del sobre sale "Claude", tacha Clawdbot. */
function manoSobre(c: C, t: number) {
  if (t < ev.anthropic - .1 || t > ev.tres[0] + 1) return;
  const L = (x: number, y: number) => W(A_LETRERO, x, y);
  const sobreEn = { x: 600, y: 1330 };
  const entra = ease.outCubic(prog(t, ev.anthropic, ev.anthropic + .6));
  const vuelaS = ease.inCubic(prog(t, ev.tres[0] - .1, ev.tres[0] + .6));
  // el sobre
  const sb = { x: lerp(1300, sobreEn.x, entra) + vuelaS * 900, y: lerp(1750, sobreEn.y, entra) - ev.toques.reduce((s, ti) => s + Math.max(0, golpeteo(t, ti, 26, 16, 9)), 0) - vuelaS * 300 };
  const P = L(sb.x, sb.y);
  c.save(); c.translate(P.x, P.y); c.rotate(-.04 + vuelaS);
  const ab = smooth(prog(t, ev.abre - .1, ev.abre + .15));
  if (ab > 0) { c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.moveTo(-190, -120); c.lineTo(0, -120 - 120 * ab); c.lineTo(190, -120); c.closePath(); c.fill(); c.stroke(); }
  // la tarjeta que sale: "Claude"
  const kc = ease.outBack(prog(t, ev.abre + .05, ev.claude), 1.4);
  if (kc > 0) { c.save(); c.translate(0, -kc * 215); caja(c, -180, -74, 360, 148, 8, BLANCO, TINTA, 5); texto(c, "Claude", 0, 34, { fuente: serif(104, true), color: TINTA }); c.restore(); }
  caja(c, -190, -120, 380, 240, 6, BLANCO, TINTA, 6);
  if (ab < 1) { c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.moveTo(-190, -120); c.lineTo(0, -120 + 110 * (1 - ab * 2)); c.lineTo(190, -120); c.closePath(); if (ab < .5) { c.fill(); c.stroke(); } }
  texto(c, "Anthropic", 0, 62, { fuente: serif(78), color: TINTA });
  c.restore();
  // la mano: entra con el sobre, lo golpetea y luego tacha con el plumón rojo
  const tachaK = prog(t, ev.tacha2, ev.tacha2 + .26);
  let hx = sb.x + 120, hy = sb.y + 80, ang = -.5;
  const sube = smooth(prog(t, ev.claude - .1, ev.tacha2));
  const fila = FILAS[1];
  if (sube > 0) { hx = lerp(hx, lerp(255, 830, ease.inOutCubic(tachaK)) + 40, sube); hy = lerp(hy, fila.y - fila.px * .3 + 205, sube); ang = lerp(ang, -.25, sube); }
  const sale = ease.inCubic(prog(t, ev.tacha2 + .3, ev.tacha2 + .9));
  hx += sale * 700; hy += sale * 500;
  const H = L(hx, hy);
  // el plumón
  c.save(); c.translate(H.x, H.y); c.rotate(ang);
  if (sube > .2) { caja(c, -16 + 10, -250, 30, 120, 6, ACENTO, TINTA, 4); caja(c, -6 + 10, -268, 12, 22, 3, TINTA, null); }
  c.restore();
  mano(c, H.x, H.y, ang, .9, { dedo: sube > .2 ? 0 : 1, manga: "#BDB6A6", largoManga: 1100 });
}

// ---------- 5. el contador de estrellas ----------
function contador(c: C, t: number) {
  if (t < ev.fines - .2 || t > ev.quita + .3) return;
  const a = smooth(prog(t, ev.fines - .2, ev.fines + .2));
  const P = W(A_LETRERO, 540, 1250);
  const v = 100000 * ease.outCubic(prog(t, ev.rueda[0], ev.rueda[1]));
  c.save(); c.globalAlpha *= a; c.translate(P.x, P.y + (1 - ease.outBack(prog(t, ev.fines - .2, ev.fines + .3))) * 200);
  caja(c, -350, -100, 700, 200, 18, TINTA, null);
  estrella(c, -262, 0, 62, .1 * vaiven(t, 1.4), ACENTO, null);
  // seis ruedas, como un odómetro
  const DIG = 6, cw = 72, x0 = -180;
  for (let i = 0; i < DIG; i++) {
    const pot = 10 ** (DIG - 1 - i);
    const dig = Math.floor(v / pot) % 10;
    const resto = v % pot;
    const gira = pot === 1 ? frac(v) : smooth(clamp((resto - (pot - pot / 30)) / (pot / 30)));
    const x = x0 + i * (cw + 8) + (i >= 3 ? 26 : 0);
    caja(c, x - cw / 2, -78, cw, 156, 8, BLANCO, null);
    c.save(); rr(c, x - cw / 2, -78, cw, 156, 8); c.clip();
    texto(c, String(dig), x, 40 - gira * 150, { fuente: mono(118), color: TINTA });
    texto(c, String((dig + 1) % 10), x, 40 + 150 - gira * 150, { fuente: mono(118), color: TINTA });
    c.restore();
    if (i === 2) texto(c, ",", x + cw / 2 + 16, 60, { fuente: mono(90), color: BLANCO });
  }
  c.restore();
  const kg = smooth(prog(t, ev.github, ev.github + .25));
  if (kg > 0) { const G = W(A_LETRERO, 540, 1478); texto(c, "en GitHub", G.x, G.y, { fuente: serif(100, true), color: TINTA, alfa: kg * a }); }
}
function lluviaEstrellas(c: C, t: number) {
  if (t < ev.estrellas[0] - .8 || t > ev.quita + .3) return;
  c.save(); c.translate(540 - A_LETRERO.x, 900 - A_LETRERO.y);
  const r = azar(41), pila = new Array(12).fill(0);
  ev.estrellas.forEach((ti, i) => {
    const bin = Math.floor(r() * 12), x = 215 + bin * 59 + (r() - .5) * 20, rot0 = r() * 6, tam = 26 + r() * 12;
    const yS = 1150 - pila[bin] * 24 - tam * .6; pila[bin]++;
    if (t < ti - .7) return;
    const dt = t - ti;
    let y: number, rot: number;
    if (dt < 0) { const k = (dt + .7) / .7; y = lerp(-80, yS, k * k); rot = rot0 + dt * 6; }
    else { y = yS - Math.abs(Math.sin(dt * 9)) * 26 * Math.exp(-dt * 6); rot = rot0; }
    const P = W(A_LETRERO, x, y);
    estrella(c, P.x, P.y, tam, rot, i % 4 === 0 ? ACENTO : BLANCO);
  });
  c.restore();
}

// ---------- 6-7. la factura ----------
function recibo(c: C, t: number) {
  if (t < ev.recibo - .05 || t > ev.quita + 1) return;
  const L0 = 1250;
  const k = prog(t, ev.recibo, ev.factura);
  let yT = lerp(-1300, 290, k * k);
  const largo = lerp(260, L0, ease.outCubic(k));
  yT -= ease.inCubic(prog(t, ev.quita, ev.quita + .65)) * 1900;
  const P = W(A_LETRERO, 540, yT);
  c.save(); c.translate(P.x, P.y); c.rotate(.02 + golpeteo(t, ev.factura, .03, 20, 6));
  c.beginPath(); c.moveTo(-300, 0); c.lineTo(300, 0); c.lineTo(300, largo);
  for (let i = 0; i <= 20; i++) c.lineTo(300 - i * 30, largo + (i % 2 ? 22 : 0));
  c.closePath(); c.fillStyle = BLANCO; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 6; c.stroke();
  texto(c, "FACTURA", 0, 150, { fuente: mono(104), color: TINTA });
  c.setLineDash([12, 12]); linea(c, -250, 210, 250, 210, 4); c.setLineDash([]);
  const r = azar(7);
  for (let i = 0; i < 6; i++) { const y = 290 + i * 74; if (y > largo - 60) break; c.fillStyle = GRIS; c.fillRect(-250, y, 160 + r() * 140, 14); c.fillRect(150, y, 90, 14); }
  // el sello: falla grave
  const ks = prog(t, ev.falla - .08, ev.falla + .06);
  if (ks > 0) {
    const e = lerp(1.7, 1, ease.outCubic(ks));
    c.save(); c.translate(0, 640); c.rotate(-.13); c.scale(e, e); c.globalAlpha *= clamp(ks * 2);
    c.strokeStyle = ACENTO; c.lineWidth = 9; c.beginPath(); c.roundRect(-245, -150, 490, 300, 16); c.stroke();
    texto(c, "FALLA", 0, -20, { fuente: mono(118), color: ACENTO }); texto(c, "GRAVE", 0, 112, { fuente: mono(118), color: ACENTO });
    c.restore();
  }
  c.restore();
}
/** El clic y el atacante. */
function ataque(c: C, t: number, garra: XY) {
  if (t < ev.boton || t > ev.latigazo + .6) return;
  // tu mano: un solo clic
  const kM = ventana(t, ev.clic - .55, ev.clic + .35, .45, .4);
  if (kM > 0) {
    const P = telPos(t), b = puntoTel(P.x, P.y, P.ang, -PH_W / 2 + 18 + 120, (PH_H - 4.2 * PH_W * .065) * .34);
    const pr = t > ev.clic - .04 && t < ev.clic + .2 ? 12 : 0;
    mano(c, b.x - 2 + (1 - kM) * -300, b.y + 215 + pr + (1 - kM) * 700, -.18, 1, { dedo: 1, manga: "#E7E2D6" });
    const ko = prog(t, ev.clic, ev.clic + .5);
    if (ko > 0 && ko < 1) { c.save(); c.globalAlpha = 1 - ko; c.strokeStyle = ACENTO; c.lineWidth = 7; c.beginPath(); c.arc(b.x, b.y, 40 + ko * 160, 0, 7); c.stroke(); c.restore(); }
  }
  // el atacante: una mano oscura que toma el hilo de la garra
  const kA = ease.outCubic(prog(t, ev.atacante - .1, ev.atacante + .45)) * (1 - smooth(prog(t, ev.latigazo, ev.latigazo + .3)));
  if (kA > 0) {
    const H = W(A_MESA, lerp(-300, 170, kA) + 10 * vaiven(t, .7), 640 + 14 * vaiven(t, .9) - (t > ev.voltea ? 40 * smooth(prog(t, ev.voltea, ev.agarra)) : 0));
    const ata = smooth(prog(t, ev.atacante + .25, ev.atacante + .5));
    if (ata > 0) { c.strokeStyle = ACENTO; c.lineWidth = 5; c.beginPath(); c.moveTo(H.x + 50, H.y - 40); c.quadraticCurveTo(lerp(H.x, garra.x, .5), lerp(H.y, garra.y, .5) + 60 * (1 - ata), lerp(H.x + 50, garra.x, ata), lerp(H.y - 40, garra.y, ata)); c.stroke(); }
    mano(c, H.x, H.y, 1.75, 1.15, { dedo: 0, piel: "#2a2927", manga: TINTA, tinta: "#55534e", largoManga: 1200 });
  }
}

// ---------- 8-10. Moltbook (región A_PLAZA) ----------
type Mu = { x: number; y: number; r: number; t0: number; f: number; fila: number };
const MULTI: Mu[] = (() => {
  const r = azar(1500), out: Mu[] = [];
  for (let j = 0; j < 15; j++) {
    const u = j / 14, y = 905 + u ** 1.2 * 640, rad = 8 + 25 * u ** 1.25, paso = rad * 3.1;
    const xmin = y > 1010 ? 330 : 40;
    for (let x = xmin + (j % 2) * paso * .5; x < 1060; x += paso * (.85 + r() * .3)) out.push({ x: x + (r() - .5) * rad * .5, y: y + (r() - .5) * rad * .4, r: rad * (.85 + r() * .3), t0: ev.multitud + (14 - j) * .055 + r() * .12, f: r() * 6.3, fila: j });
  }
  return out;
})();
const TITIRITEROS = [{ x: 400, h: 600 }, { x: 560, h: 640 }, { x: 720, h: 610 }, { x: 880, h: 650 }, { x: 240, h: 560 }, { x: 1010, h: 580 }];
function plaza(c: C, t: number, d: D) {
  if (t < ev.latigazo - .1 || t > ev.latigazo2 + .8) return;
  c.save(); c.translate(A_PLAZA.x - 540, A_PLAZA.y - 900);
  // el piso
  c.fillStyle = MESA; c.fillRect(-400, 880, 1900, 900); linea(c, -400, 880, 1500, 880, 5);
  // lo de atrás: oscuro hasta que entra la luz
  const osc = smooth(prog(t, ev.oscuro, ev.oscuro + .7));
  const barre = prog(t, ev.revela, ev.revela + .9);
  if (osc > 0) {
    const gr = c.createLinearGradient(0, 200, 0, 900);
    gr.addColorStop(0, `rgba(17,17,17,${.86 * osc})`); gr.addColorStop(.85, `rgba(17,17,17,${.78 * osc})`); gr.addColorStop(1, "rgba(17,17,17,0)");
    c.fillStyle = gr; c.fillRect(-400, -200, 1900, 1100);
  }
  // la luz que encontró Wiz
  const luz = smooth(barre);
  if (luz > 0) {
    const xl = lerp(250, 1100, ease.inOutCubic(barre));
    c.save();
    c.beginPath(); c.moveTo(250, 1080); c.lineTo(Math.max(xl - 520, -100), 160); c.lineTo(xl + 120, 160); c.closePath(); c.clip();
    const g = c.createRadialGradient(xl - 150, 520, 40, xl - 150, 520, 700);
    g.addColorStop(0, "rgba(255,236,190,.95)"); g.addColorStop(.6, "rgba(246,232,200,.85)"); g.addColorStop(1, "rgba(244,240,230,.55)");
    c.fillStyle = g; c.fillRect(-400, 100, 1900, 1000);
    c.restore();
    const todo = smooth(prog(t, ev.revela + .7, ev.revela + 1.4));
    if (todo > 0) {
      const g2 = c.createRadialGradient(650, 560, 60, 650, 560, 760);
      g2.addColorStop(0, `rgba(250,236,200,${.95 * todo})`); g2.addColorStop(1, `rgba(240,234,220,${.75 * todo})`);
      c.fillStyle = g2; c.fillRect(-400, 100, 1900, 800);
    }
  }
  // los titiriteros: solo se ven donde hay luz
  const vis = (x: number) => (luz > 0 ? clamp((lerp(250, 1100, ease.inOutCubic(barre)) + 80 - x) / 200) : 0);
  const hilosDe: { a: XY; b: XY }[] = [];
  const cruces: XY[] = [];
  TITIRITEROS.forEach((p, i) => {
    const v = vis(p.x); cruces.push({ x: p.x, y: 0 }); if (v <= .01) return;
    const piso = 1010, bL = .55 + .06 * vaiven(t, 1.3, i), bR = .55 + .06 * vaiven(t, 1.1, i + 2);
    persona(c, p.x, piso, p.h, { bL, bR, alfa: v, tinte: "#C9C1AF" });
    const [m1, m2] = manosDe(p.x, piso, p.h, bL, bR);
    const cx = (m1.x + m2.x) / 2 + 6 * vaiven(t, 1.7, i), cy = (m1.y + m2.y) / 2;
    cruces[i] = { x: cx, y: cy };
    c.save(); c.globalAlpha *= v; linea(c, m1.x - 24, m1.y, m2.x + 24, m2.y, 10); linea(c, cx, cy - 40, cx, cy + 40, 10); c.restore();
  });
  // la multitud
  const visibles = MULTI.filter((m) => t > m.t0);
  // los hilos: de cada cruceta a las bolitas que tiene enfrente
  c.save(); c.strokeStyle = TINTA; c.lineWidth = 1.8;
  TITIRITEROS.forEach((p, i) => {
    const v = vis(p.x); if (v <= .02) return;
    const cz = cruces[i], cerca = visibles.filter((m) => m.fila >= 1 && m.fila <= 9 && Math.abs(m.x - p.x) < 150);
    cerca.forEach((m, k) => {
      if (k % 2) return;
      const my = m.y - m.r - Math.abs(Math.sin(t * 2.6 + m.f)) * m.r * .5 - m.r;
      c.globalAlpha = .55 * v; c.beginPath(); c.moveTo(cz.x + ((k % 9) - 4) * p.h * .07, cz.y); c.lineTo(m.x, my); c.stroke();
    });
  });
  c.restore();
  const sp = d.spr;
  for (const m of visibles) {
    const k = clamp(resorte(t - m.t0, 5, .4), 0, 1.25);
    const bote = Math.abs(Math.sin(t * 2.6 + m.f)) * m.r * .5;
    const x = m.x, y = m.y - m.r - bote;
    const ar = m.r * 1.35, brz = .9 * vaiven(t, .9, m.f);
    c.globalAlpha = .38 + .62 * (m.fila / 14);
    c.strokeStyle = TINTA; c.lineWidth = Math.max(1.5, m.r * .16); c.lineCap = "round";
    c.beginPath(); c.moveTo(x - m.r * .6, y - m.r * .3); c.lineTo(x - ar, y - ar * (1.1 + .3 * brz)); c.moveTo(x + m.r * .6, y - m.r * .3); c.lineTo(x + ar, y - ar * (1.1 - .3 * brz)); c.stroke();
    const rr2 = m.r * k;
    c.drawImage(sp, x - rr2 * 1.111, y - rr2 * 1.111, rr2 * 2.222, rr2 * 2.222);
  }
  c.globalAlpha = 1;
  // publican: globitos sobre la multitud
  const r = azar(52);
  ev.posts.forEach((ti) => {
    const m = MULTI[Math.floor(r() * MULTI.length)];
    for (let rep = 0; rep < 3; rep++) {
      const t0 = ti + rep * 1.05; if (t < t0 || t > t0 + 1.1 || t > ev.oscuro) continue;
      const u = t - t0, k = brota(t, t0, 5, .4) * (1 - smooth(prog(u, .75, 1.1)));
      c.save(); c.translate(m.x + rep * 90 - 90, m.y - m.r * 3.4 - u * 60); c.scale(k * Math.max(.5, m.r / 22), k * Math.max(.5, m.r / 22));
      globo(c, 0, 0, 80, 44, BLANCO, TINTA, -1, 3.5); c.fillStyle = TINTA; for (let j = 0; j < 3; j++) { c.beginPath(); c.arc(-20 + j * 20, 0, 5, 0, 7); c.fill(); } c.restore();
    }
  });
  // el título y la pancarta: lo que presumía
  const aT = ventana(t, ev.moltbook, ev.wiz, .2, .4);
  if (aT > 0) escribe(c, "Moltbook", 540, 480, serif(140), prog(t, ev.moltbook, ev.moltbook + .5) * aT, TINTA, "center", aT > .9);
  const kp = ease.outBack(prog(t, ev.presume, ev.presume + .55), 1.3) * (1 - ease.inCubic(prog(t, ev.wiz - .15, ev.wiz + .35)));
  if (kp > 0.01) {
    const yP = lerp(1150, 720, kp) + 6 * vaiven(t, .7);
    linea(c, 380, yP + 90, 380, yP + 360, 10); linea(c, 700, yP + 90, 700, yP + 360, 10);
    c.save(); c.translate(540, yP); c.rotate(.02 * vaiven(t, 1.1));
    caja(c, -330, -95, 660, 190, 10, BLANCO, TINTA, 7);
    escribe(c, "1.5 millones", 0, 42, serif(124, true), prog(t, ev.millon, ev.millon + .45), ACENTO, "center", false);
    const bri = ventana(t, ev.millon + .5, ev.millon + 1.1, .1, .3);
    if (bri > 0) for (let i = 0; i < 4; i++) estrella(c, -310 + i * 206, -110 + (i % 2) * 210, 22 * bri, t * 3 + i, ACENTO, null);
    c.restore();
  }
  // la base de datos: archivero con el cajón abierto
  archivero(c, t);
  lampara(c, t);
  llavesVuelan(c, t);
  c.restore();
}
function archivero(c: C, t: number) {
  const k = clamp(resorte(t - (ev.multitud + .2), 3.6, .45), 0, 1.2);
  if (k <= .01) return;
  c.save(); c.translate(0, 1520); c.scale(1, k); c.translate(0, -1520);
  caja(c, 60, 1000, 250, 520, 10, CARTON, TINTA, 6);
  for (let i = 1; i < 3; i++) { caja(c, 76, 1000 + i * 172 + 12, 218, 148, 6, null, TINTA, 4); caja(c, 160, 1000 + i * 172 + 70, 50, 16, 6, TINTA, null); }
  // el cajón de arriba, abierto: expuesto
  const ab = 60 + 70 * smooth(prog(t, ev.expuesta, ev.expuesta + .2)) + golpeteo(t, ev.expuesta, 18, 30, 8);
  c.fillStyle = TINTA; c.fillRect(76, 1014, 218, 150);
  const brilla = smooth(prog(t, ev.cajon, ev.cajon + .3)) * (1 - smooth(prog(t, ev.llaves + 2, ev.llaves + 3)));
  if (brilla > 0) { const g = c.createRadialGradient(185, 1060, 10, 185, 1060, 200); g.addColorStop(0, `rgba(255,232,170,${brilla})`); g.addColorStop(1, "rgba(255,232,170,0)"); c.fillStyle = g; c.fillRect(-60, 860, 460, 400); }
  c.save(); c.translate(ab, 30);
  c.fillStyle = BLANCO; for (let i = 0; i < 5; i++) { c.save(); c.translate(110 + i * 34, 1010 - (i % 2) * 20); c.rotate((i - 2) * .12); caja(c, -22, -40, 44, 70, 3, BLANCO, TINTA, 3); c.restore(); }
  c.beginPath(); c.moveTo(76, 1014); c.lineTo(294, 1014); c.lineTo(294, 1164); c.lineTo(76, 1164); c.closePath(); c.fillStyle = CARTON; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 5; c.stroke();
  caja(c, 160, 1076, 50, 16, 6, TINTA, null);
  c.restore();
  // papeles que salen volando al quedar expuesta
  if (t > ev.expuesta && t < ev.expuesta + 1.6) {
    const r = azar(88);
    for (let i = 0; i < 9; i++) {
      const u = t - ev.expuesta, vx = (r() - .2) * 380, vy = -300 - r() * 380;
      c.save(); c.globalAlpha = 1 - smooth(prog(u, 1, 1.6)); c.translate(300 + vx * u, 1030 + vy * u + 420 * u * u); c.rotate(u * (r() - .5) * 8); caja(c, -26, -34, 52, 68, 3, BLANCO, TINTA, 3); c.restore();
    }
  }
  c.restore();
  // la etiqueta: el nombre técnico
  const ke = ease.outBack(prog(t, ev.cajon, ev.cajon + .35), 1.4) * (1 - smooth(prog(t, ev.latigazo2 - .3, ev.latigazo2)));
  if (ke > 0.01) { c.save(); c.translate(185, 1370); c.rotate(-.04); c.scale(ke, ke); caja(c, -150, -52, 300, 104, 8, BLANCO, TINTA, 5); texto(c, "base de datos", 0, 22, { fuente: serif(66, true), color: TINTA }); c.restore(); }
}
function lampara(c: C, t: number) {
  if (t < ev.wiz - .1 || t > ev.cajon + .6) return;
  const k = ease.outCubic(prog(t, ev.wiz, ev.wiz + .8));
  const dentro = ease.inOutCubic(prog(t, ev.entra, ev.cajon));
  const x = lerp(lerp(-260, 250, k), 205, dentro), y = lerp(760, 1090, dentro) + 10 * vaiven(t, .9);
  const ang = lerp(.18, 1.25, dentro), esc = lerp(1, .55, dentro);
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(esc, esc);
  // haz de luz hacia adelante
  const g = c.createLinearGradient(150, 0, 520, 0); g.addColorStop(0, "rgba(255,232,170,.75)"); g.addColorStop(1, "rgba(255,232,170,0)");
  c.fillStyle = g; c.beginPath(); c.moveTo(150, -46); c.lineTo(520, -170); c.lineTo(520, 170); c.lineTo(150, 46); c.closePath(); c.fill();
  caja(c, -170, -40, 240, 80, 14, TINTA, null);
  c.fillStyle = TINTA; c.beginPath(); c.moveTo(66, -40); c.lineTo(150, -64); c.lineTo(150, 64); c.lineTo(66, 40); c.closePath(); c.fill();
  c.fillStyle = "#FFE8AE"; c.fillRect(140, -54, 12, 108);
  texto(c, "Wiz", -52, 22, { fuente: serif(66, true), color: BLANCO });
  c.restore();
  const kN = ventana(t, ev.wizN - .1, ev.entra + .2, .2, .3);
  if (kN > 0) texto(c, "Wiz", lerp(-260, 250, k) - 20, 650, { fuente: serif(112, true), color: TINTA, alfa: kN });
}
function llavesVuelan(c: C, t: number) {
  if (t < ev.llaves || t > ev.latigazo2 + .7) return;
  const r = azar(1515), N = 130, u = t - ev.llaves;
  for (let i = 0; i < N; i++) {
    const sal = i / N * 1.1, f = r() * 6.3, fila = r(), col = r(), vel = .35 + r() * .3, tam = .75 + r() * .45, dir = r() < .5 ? -1 : 1;
    const ui = u - sal; if (ui < 0) continue;
    const salida = { x: 240 + ui * 500, y: 1050 - ui * 820 };
    // una bandada: cada llave tiene su lugar en una nube ancha que deriva
    const nube = { x: -40 + col * 1160 + 40 * Math.sin(t * vel * 2 + f) + 60 * Math.sin(t * .7), y: 400 + fila * 460 + 30 * Math.cos(t * vel * 2.4 + f) };
    const k = smooth(prog(ui, .05, .85));
    const lib = ease.inCubic(prog(t, ev.aire, ev.aire + 1.2));
    let x = lerp(salida.x, nube.x, k), y = lerp(salida.y, nube.y, k);
    x += lib * (nube.x - 540) * 1.6; y -= lib * (400 + fila * 700);
    llave(c, x, y, -.4 + .5 * Math.sin(t * 3 * dir + f), tam, i % 7 === 0 ? ACENTO : TINTA);
  }
}

// ---------- 11. febrero: la puerta y la caja ----------
function puerta(c: C, t: number) {
  if (t < ev.latigazo2 - .1 || t > ev.caja + 1) return;
  c.save(); c.translate(A_PUERTA.x - 540, A_PUERTA.y - 900);
  c.fillStyle = MESA; c.fillRect(-500, 1360, 2000, 800); linea(c, -500, 1360, 1500, 1360, 5);
  const X0 = 540, X1 = 930, Y0 = 560, Y1 = 1360;
  const ab = smooth(prog(t, ev.puerta, ev.puerta + .45)) * (1 - ease.inCubic(prog(t, ev.cierra - .2, ev.cierra)));
  // adentro: luz
  c.fillStyle = TINTA; c.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
  if (ab > 0) {
    const g = c.createLinearGradient(X0, 0, X1, 0); g.addColorStop(0, `rgba(255,240,200,${ab})`); g.addColorStop(1, `rgba(250,226,170,${ab})`); c.fillStyle = g; c.fillRect(X0, Y0, X1 - X0, Y1 - Y0);
    const g2 = c.createRadialGradient(X0, 1360, 20, X0, 1360, 520); g2.addColorStop(0, `rgba(255,236,190,${.55 * ab})`); g2.addColorStop(1, "rgba(255,236,190,0)"); c.fillStyle = g2; c.fillRect(X0 - 520, 840, 520, 600);
  }
  // el autor camina y entra
  const ka = ease.inOutCubic(prog(t, ev.camina - .3, ev.openai + .35));
  const xa = lerp(110, 735, ka), paso = Math.sin(ka * 20) * .42 * (ka > 0 && ka < 1 ? 1 : 0);
  const adentro = smooth(prog(t, ev.openai, ev.openai + .4));
  if (t > ev.latigazo2 && adentro < 1) {
    c.save();
    if (xa > X0 - 110) { c.beginPath(); c.rect(-500, 0, X0 + 3, 2000); c.rect(X0, Y0, X1 - X0, Y1 - Y0); c.clip(); }
    persona(c, xa, 1360, 700 * lerp(1, .9, adentro), { paso, bL: .15 - paso * .5, bR: .15 + paso * .5, alfa: 1 - adentro * .7 });
    c.restore();
    const kt = ventana(t, ev.latigazo2 + .2, ev.openai + .1, .3, .3);
    if (kt > 0) escribe(c, "Steinberger", 290, 470, serif(100, true), prog(t, ev.camina, ev.camina + .5) * kt, TINTA, "center", kt > .9);
  }
  // la hoja de la puerta, con bisagra a la izquierda y el nombre escrito
  const w = (X1 - X0) * Math.cos(ab * 1.35);
  caja(c, X0, Y0, w, Y1 - Y0, 4, CARTON, TINTA, 6);
  if (w > 30) {
    c.save(); c.translate(X0, 0); c.scale(w / (X1 - X0), 1);
    caja(c, 36, 640, X1 - X0 - 72, 150, 6, BLANCO, TINTA, 5);
    texto(c, "OpenAI", (X1 - X0) / 2, 742, { fuente: serif(108), color: TINTA });
    c.fillStyle = TINTA; c.beginPath(); c.arc(X1 - X0 - 40, 990, 14, 0, 7); c.fill();
    c.restore();
  }
  // el marco
  c.strokeStyle = TINTA; c.lineWidth = 18; c.lineJoin = "miter"; c.beginPath(); c.moveTo(X0 - 9, Y1); c.lineTo(X0 - 9, Y0 - 9); c.lineTo(X1 + 9, Y0 - 9); c.lineTo(X1 + 9, Y1); c.stroke();
  c.restore();
}
function cajaFundacion(c: C, t: number, adelante: boolean) {
  if (t < ev.caja - .1 || t > ev.atras + 2.5) return;
  const P = W(A_LETRERO, 540, 0);
  const k = ease.outBack(prog(t, ev.caja, ev.caja + .6), 1.2);
  const y0 = lerp(2100, 1130, k);
  c.save(); c.translate(P.x - 540, P.y);
  if (!adelante) {
    // fondo de la caja
    c.fillStyle = CARTON_O; c.fillRect(110, y0 - 30, 860, 60);
  } else {
    caja(c, 100, y0, 880, 340, 6, CARTON, TINTA, 7);
    c.strokeStyle = "rgba(17,17,17,.25)"; c.lineWidth = 3; linea(c, 100, y0 + 40, 980, y0 + 40, 3, "rgba(17,17,17,.25)");
    escribe(c, "fundación", 540, y0 + 225, serif(124, true), prog(t, ev.solapas[0] - .25, ev.solapas[0] + .3), TINTA, "center", false);
    // las solapas se cierran: giran desde su bisagra hasta quedar acostadas encima
    for (const [i, sg] of [[0, -1], [1, 1]] as [number, number][]) {
      const cie = clamp(ease.outBack(prog(t, ev.solapas[i] - .22, ev.solapas[i]), 1.1), 0, 1.04);
      const hx = sg < 0 ? 100 : 980, phi = lerp(-.28, 1.57, cie), L = 440;
      const dx = -sg * Math.sin(phi), dy = -Math.cos(phi), nx = -dy * sg * -1, ny = dx * sg * -1;
      const g = 26;
      c.beginPath(); c.moveTo(hx, y0); c.lineTo(hx + dx * L, y0 + dy * L); c.lineTo(hx + dx * L + nx * g, y0 + dy * L + ny * g); c.lineTo(hx + nx * g, y0 + ny * g); c.closePath();
      c.fillStyle = i ? CARTON : CARTON_O; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 6; c.lineJoin = "round"; c.stroke();
    }
  }
  c.restore();
}

// ---------- la cinta de fechas (en pantalla) ----------
const MES = 210;
const NOMBRES: [number, string][] = [[14, "mar 2023"], [26, "mar 2024"], [33, "oct 2024"], [46, "nov 2025"], [48, "ene 2026"], [49, "feb 2026"]];
function cintaPos(t: number) {
  let p = 46.5;
  const K: [number, number, number][] = [[ev.enero, 48.4, .7], [ev.fines, 48.88, .6], [ev.febrero, 49.5, .7], [ev.atras + .1, 14.5, 1.1], [ev.adelante - .05, 48.9, 1.0]];
  for (const [a, v, d] of K) { if (t < a) break; p = lerp(p, v, ease.inOutCubic(prog(t, a, a + d))); }
  return p;
}
function pinRojo(c: C, x: number, y: number, r: number) {
  const b = c.createRadialGradient(x - r * .3, y - r * .4, r * .1, x, y, r);
  b.addColorStop(0, "#F08A6B"); b.addColorStop(.5, ACENTO); b.addColorStop(1, "#6D1C0E");
  c.fillStyle = b; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
}
/** La cinta métrica del capítulo anterior: el tiempo es distancia. Al principio se desenrolla desde la derecha. */
function cinta(c: C, t: number) {
  const vis = Math.max(ventana(t, ev.cinta, ev.idea - .3, .35, .5), ventana(t, ev.tres[0] - .5, ev.corta - .2, .35, .35), ventana(t, ev.febrero - .35, ev.telefonos[4], .35, .5));
  if (vis <= .01) return;
  const centro = smooth(prog(t, ev.atras, ev.atras + .6));
  const comp = ease.inOutCubic(prog(t, ev.atras + .05, ev.atras + .75));          // la cinta se aleja: caben tres años
  const primera = t < ev.idea;
  const y = lerp(268, 760, centro) - (primera ? 0 : (1 - ease.outCubic(vis)) * 260), s = lerp(1, 1.2, centro);
  const p = lerp(cintaPos(t), 31.7, comp), mes = MES * lerp(1, .097, comp);
  // la punta con su gancho de lámina: en la primera aparición la cinta sale de su estuche
  const xIzq = primera ? lerp(760, -700, ease.outCubic(prog(t, ev.cinta - .05, ev.cinta + .75))) : -700;
  c.save(); c.translate(540, y); c.rotate(-.012); c.scale(s, s);
  c.fillStyle = "rgba(58,53,44,.16)"; c.fillRect(xIzq + 6, -58, 700 - xIzq, 128);
  caja(c, xIzq, -64, 700 - xIzq, 128, 0, "#FDFBF4", null);
  linea(c, xIzq, -64, 700, -64, 4); linea(c, xIzq, 64, 700, 64, 4);
  c.save(); c.beginPath(); c.rect(xIzq, -70, 1400, 140); c.clip();
  const m0 = Math.floor(p - 600 / mes), m1 = Math.ceil(p + 600 / mes);
  for (let m = m0; m <= m1; m++) {
    const x = (m - p) * mes;
    // cada mes una raya, cada medio mes una chica, cada año una completa con su número
    if (m % 12 === 0) { linea(c, x, 64, x, -64, 6); if (comp > .01) texto(c, String(2022 + m / 12), x + 12, -18, { fuente: serif(50), color: TINTA, alin: "left", alfa: comp }); }
    else if (m % 3 === 0 || comp < .5) linea(c, x, 64, x, 18, 4);
    if (comp < .5) linea(c, x + mes / 2, 64, x + mes / 2, 41, 3);
  }
  if (comp < .99) for (const [m, nom] of NOMBRES) {
    const x = (m + .5 - p) * mes; if (Math.abs(x) > 760) continue;
    const cerca = 1 - smooth(clamp(Math.abs(x) / 160));
    texto(c, nom, x, -4, { fuente: serif(60 + 14 * cerca, true), color: cerca > .5 ? ACENTO : TINTA, alfa: 1 - comp });
  }
  c.restore();
  if (primera && xIzq > -699) { caja(c, xIzq - 22, -78, 26, 156, 3, "#8a877f", TINTA, 3); }
  // los agentes de antes
  const viejos: [number, number][] = [[14.5, ev.viejos[0]], [26.5, ev.viejos[1]], [33.5, ev.viejos[2]]];
  const vaS = 1 - smooth(prog(t, ev.telefonos[3], ev.telefonos[5]));
  for (const [m, ti] of viejos) {
    const k = brota(t, ti, 5, .4) * vaS; if (k < .02) continue;
    const x = (m - p) * mes;
    c.save(); c.globalAlpha *= .5; bola(c, x, -64 - 38 * k, 38 * k); c.restore();
  }
  const kn = brota(t, ev.adelante + .1, 5, .4) * vaS;
  if (kn > .02) { const x = (48.9 - p) * mes; brazo(c, x + 30, -110, x + 110, -190, -30, .7, TINTA, kn, .5); bola(c, x, -64 - 42 * kn, 42 * kn); }
  // tres días: tres alfileres chicos
  ev.tres.forEach((ti, i) => { const k = brota(t, ti, 6, .4) * (1 - smooth(prog(t, ev.corta - .3, ev.corta))); if (k > .02) pinRojo(c, 34 + i * 30, 44, 10 * k); });
  // el alfiler: la fecha de la que habla la voz
  if (comp < .99) { c.globalAlpha = (1 - comp) * (primera ? smooth(clamp(-xIzq / 160)) : 1); linea(c, 0, -64, 0, -98, 5); pinRojo(c, 0, -100, 19); c.globalAlpha = 1; }
  c.restore();
}

// ---------- 12-14. la gente normal, y el final ----------
const GENTE = [
  { x: 105, y: 1130, s: .62, m: "#C9C1AF" }, { x: 300, y: 1090, s: .66, m: "#E7E2D6" }, { x: 790, y: 1090, s: .66, m: "#BDB6A6" }, { x: 975, y: 1130, s: .62, m: "#D8D2C5" },
  { x: 200, y: 1420, s: .82, m: "#E7E2D6" }, { x: 880, y: 1420, s: .82, m: "#C9C1AF" }, { x: 640, y: 1360, s: .78, m: "#D8D2C5" }, { x: 430, y: 1380, s: .8, m: "#BDB6A6" },
  { x: 540, y: 1520, s: 1, m: "#E7E2D6" },
];
const COSAS = { llaves: { x: 805, y: 560 }, cartera: { x: 835, y: 950 }, foto: { x: 830, y: 1290 } };
let CAPA = { fx: 540, fy: 900, z: 1, cx: 540, cy: 900 };
const aCapa = (p: XY): XY => ({ x: (p.x - CAPA.fx) / CAPA.z + CAPA.cx, y: (p.y - CAPA.fy) / CAPA.z + CAPA.cy });
/** Las cosas de una persona cualquiera, en pantalla: llaves, cartera, foto. */
function cosasFinales(c: C, t: number) {
  const a = ventana(t, ev.toca - .55, 999, .4, .1); if (a <= 0) return;
  const tq = (i: number) => golpeteo(t, ev.toques2[i], .22, 22, 6);
  const sube = (i: number) => (1 - ease.outBack(prog(t, ev.toca - .55 + i * .12, ev.toca - .1 + i * .12), 1.4)) * 60;
  c.save(); c.globalAlpha *= a;
  const pc = COSAS.cartera;
  c.save(); c.translate(pc.x, pc.y + sube(1)); c.rotate(.08 + tq(1)); c.scale(1.25, 1.25); caja(c, -100, -66, 200, 132, 14, "#B9A98A", TINTA, 6); caja(c, -100, -66, 200, 56, 14, "#A8977A", TINTA, 5); c.fillStyle = TINTA; c.beginPath(); c.arc(74, -12, 9, 0, 7); c.fill(); c.restore();
  const pf = COSAS.foto;
  c.save(); c.translate(pf.x, pf.y + sube(2)); c.rotate(-.1 + tq(2)); c.scale(1.2, 1.2); caja(c, -88, -104, 176, 208, 4, BLANCO, TINTA, 5); caja(c, -72, -88, 144, 136, 2, "#DCD6C9", null);
  c.fillStyle = GRIS; c.beginPath(); c.moveTo(-72, 48); c.lineTo(-22, -12); c.lineTo(14, 26); c.lineTo(40, 4); c.lineTo(72, 48); c.closePath(); c.fill(); c.fillStyle = ACENTO; c.beginPath(); c.arc(42, -52, 14, 0, 7); c.fill(); c.restore();
  const L = COSAS.llaves, tl = golpeteo(t, ev.toques2[0], .35, 20, 5) + golpeteo(t, ev.asienta + .1, .18, 14, 3);
  const alza = ease.inOutCubic(prog(t, ev.asienta + .05, ev.asienta + .65)) * 34;
  c.save(); c.translate(L.x, L.y + sube(0) - alza); c.scale(1.3, 1.3);
  c.strokeStyle = TINTA; c.lineWidth = 6; c.beginPath(); c.arc(0, 0, 30, 0, 7); c.stroke();
  for (let i = 0; i < 3; i++) { const an = 1.2 + i * .5 + tl; llave(c, Math.cos(an) * 70, Math.sin(an) * 70, an, 1.3, i === 1 ? ACENTO : TINTA); }
  c.restore();
  c.restore();
}
function gente(c: C, t: number) {
  if (t < ev.telefonos[0] - .1) return;
  const acerca = ease.inOutCubic(prog(t, ev.acerca, ev.acerca + 1.05));
  // la cámara de esta capa se acerca al teléfono del centro
  const foco = GENTE[8], z = lerp(1, 1.6, acerca) * (1 + .01 * vaiven(t, 6.1));
  const fx = lerp(540, 400, acerca) + 6 * vaiven(t, 7.3), fy = lerp(900, 640, acerca) + 8 * vaiven(t, 8.1, 1);
  CAPA = { fx, fy, z, cx: lerp(540, foco.x, acerca), cy: lerp(900, foco.y - 500, acerca) };
  c.save();
  c.translate(fx, fy); c.scale(z, z); c.translate(-CAPA.cx, -CAPA.cy);
  // el chatbot más listo: nadie lo pidió
  const kc = brota(t, ev.chatbot, 4, .42) * (1 - ease.inCubic(prog(t, ev.desinfla, ev.desinfla + .55)));
  if (kc > .02) {
    const inf = 1 + .18 * smooth(prog(t, ev.listo, ev.listo + .25));
    const caeY = ease.inCubic(prog(t, ev.desinfla, ev.desinfla + .55)) * 500;
    c.save(); c.translate(540, 560 + caeY); c.rotate(.05 * vaiven(t, 1.2) + caeY * .001); c.scale(kc * inf, kc * inf * lerp(1, .6, prog(t, ev.desinfla, ev.desinfla + .5)));
    globo(c, 0, 0, 380, 190, BLANCO, TINTA, -1, 7);
    c.fillStyle = TINTA; for (let j = 0; j < 3; j++) { c.beginPath(); c.arc(-60 + j * 60, 10, 16, 0, 7); c.fill(); }
    // birrete
    c.save(); c.translate(40, -118); c.rotate(-.12);
    c.fillStyle = TINTA; c.beginPath(); c.moveTo(-120, 0); c.lineTo(0, -46); c.lineTo(120, 0); c.lineTo(0, 46); c.closePath(); c.fill();
    c.fillRect(-58, 8, 116, 44); linea(c, 60, 0, 96, 70, 5, ACENTO); c.fillStyle = ACENTO; c.beginPath(); c.arc(96, 76, 12, 0, 7); c.fill();
    c.restore(); c.restore();
  }
  GENTE.forEach((g, i) => {
    const k = clamp(resorte(t - ev.telefonos[i], 3.4, .5), 0, 1.15); if (k <= .005) return;
    const esFoco = i === 8;
    const sale = esFoco ? 0 : ease.inCubic(prog(t, ev.acerca, ev.acerca + .8));
    const x = g.x + (g.x - 540) * sale * 1.4, y = g.y + (1 - k) * 900 + sale * 500 + 6 * vaiven(t, 1.4, i);
    const s = g.s, ang = (g.x - 540) * .0004 + .03 * vaiven(t, 2.1, i);
    if (esFoco) { finalTelefono(c, t, x, y, s, ang); return; }
    c.save(); c.globalAlpha *= 1 - sale;
    telefono(c, x, y - 300 * s, PH_W * s, PH_H * s, ang, (sw, sh) => burbujasMini(c, sw, sh, i));
    // la mano que lo sostiene
    mano(c, x - 10 * s, y + 10 * s, ang + .05, s * .95, { dedo: 0, manga: g.m });
    // su garrita
    const kg = brota(t, ev.garras + i * .04, 5, .4);
    if (kg > .02) {
      const b = puntoTel(x, y - 300 * s, ang, 10 * s, -40 * s);
      const lado = g.x < 540 ? -1 : 1;
      const giro = smooth(prog(t, ev.listo - .1, ev.listo + .3)) * (1 - smooth(prog(t, ev.desinfla + .2, ev.desinfla + .6)));
      const hx = b.x + lado * (120 + 60 * giro) * s + 14 * vaiven(t, 1.1, i), hy = b.y - (260 - 120 * giro) * s;
      agujero(c, b, 16 * s, kg);
      brazo(c, b.x, b.y, hx, hy, lado * 40 * s, .5 + .3 * vaiven(t, .8, i), TINTA, kg, .62 * s);
    }
    c.restore();
  });
  c.restore();
}
function burbujasMini(c: C, sw: number, sh: number, i: number) {
  const r = azar(70 + i);
  for (let k = 0; k < 4; k++) { const mio = r() > .5, w = sw * (.35 + r() * .3); globo(c, mio ? sw / 2 - w / 2 - 10 : -sw / 2 + w / 2 + 10, -sh * .36 + k * sh * .17, w, sh * .1, mio ? TINTA : "#E6E2D9", null, 0); }
}
/** El teléfono de una persona cualquiera: la bola vive en el chat y su garra toca sus cosas. */
function finalTelefono(c: C, t: number, x: number, y: number, s: number, ang: number) {
  const cy = y - 300 * s;
  const kb = brota(t, ev.vive, 4.4, .4);
  const bLocal = { x: -25, y: 60 };
  const B = puntoTel(x, cy, ang, bLocal.x * s, bLocal.y * s);
  // el teléfono con la bola adentro
  const P = { x, y: cy };
  telefono(c, P.x, P.y, PH_W * s, PH_H * s, ang, (sw, sh) => {
    const r = azar(5);
    ev.burbujas2.forEach((ti, k) => { const kk = brota(t, ti, 5, .42); if (kk < .02) return; const mio = k % 2 === 1, w = sw * (.42 + r() * .2); c.save(); c.translate(mio ? sw / 2 - w / 2 - 12 : -sw / 2 + w / 2 + 12, -sh * .36 + k * sh * .15); c.scale(kk, kk); globo(c, 0, 0, w, sh * .1, mio ? TINTA : "#E6E2D9", null, 0); c.restore(); });
    burbujasMini(c, sw, sh, 99);
  });
  // la bola en el chat
  if (kb > .02) {
    const r = 70 * s * kb, g = r / 90;
    const bx = B.x + 3 * vaiven(t, 1.3), by = B.y - Math.abs(Math.sin(t * 2.7)) * 8 * s;
    // mano izquierda: saluda adentro
    brazo(c, bx - 54 * g, by - 50 * g, bx - 120 * s, by - 150 * s + 20 * vaiven(t, .8), 90 * g, .7, TINTA, kb, g);
    bola(c, bx, by, r);
    // mano derecha: sale del teléfono a tocar las cosas
    const toca = prog(t, ev.toca, ev.toca + .45);
    if (toca > 0) {
      const obj: [number, XY][] = ([[ev.toca, { x: 740, y: 520 }], [ev.toques2[0], { x: 780, y: 545 }], [ev.toques2[1], { x: 770, y: 925 }], [ev.toques2[2], { x: 770, y: 1245 }], [ev.candado - .55, { x: 772, y: 560 }], [ev.asienta + .65, { x: 772, y: 526 }]] as [number, XY][]).map(([ti, p]) => [ti, aCapa(p)]);
      let h: XY = { x: bx + 120 * s, y: by - 100 * s };
      for (const [ti, p] of obj) if (t > ti - .25) h = { x: lerp(h.x, p.x, ease.inOutCubic(prog(t, ti - .25, ti))), y: lerp(h.y, p.y, ease.inOutCubic(prog(t, ti - .25, ti))) };
      const abre = t > ev.asienta ? lerp(.6, .05, smooth(prog(t, ev.asienta, ev.asienta + .3))) : .55 + .3 * vaiven(t, .6);
      const hh = { x: h.x + 6 * vaiven(t, 1.7) * (t > ev.asienta + .3 ? .3 : 1), y: h.y + 6 * vaiven(t, 1.9, 1) * (t > ev.asienta + .3 ? .3 : 1) };
      brazo(c, bx + 60 * g, by - 30 * g, hh.x, hh.y, -160 * s, abre, TINTA, ease.outCubic(toca), g);
      // el candado abierto cuelga del alambre
      candadoColgado(c, t, { x: bx + 60 * g, y: by - 30 * g }, hh);
    }
  }
  // la mano que lo sostiene
  mano(c, x - 10 * s, y + 10 * s, ang + .05, s * .95, { dedo: 0, manga: GENTE[8].m });
}
function candadoColgado(c: C, t: number, a: XY, b: XY) {
  if (t < ev.candado - .5) return;
  const u = .8, p = { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) - 22 };
  const cae = ease.inCubic(prog(t, ev.candado - .5, ev.candado));
  const y0 = lerp(-200, p.y, cae);
  const dt = t - ev.candado;
  const th = dt < 0 ? 0 : .55 * Math.exp(-dt * .9) * Math.sin(dt * 4.2) + .25 * Math.exp(-Math.max(0, t - ev.inseguro) * 1.5) * Math.sin(Math.max(0, t - ev.inseguro) * 6) * (t > ev.inseguro ? 1 : 0);
  c.save(); c.translate(p.x, y0); c.rotate(th); c.scale(.7, .7);
  // arco abierto: una pata se sale del cuerpo
  const ab = .35 + .25 * smooth(prog(t, ev.inseguro, ev.inseguro + .3));
  c.strokeStyle = TINTA; c.lineWidth = 14; c.lineCap = "round";
  c.beginPath(); c.moveTo(-34, 96); c.lineTo(-34, 22); c.arc(0, 22, 34, Math.PI, 0); c.stroke();
  c.save(); c.translate(34, 22); c.rotate(-ab); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 40); c.stroke(); c.restore();
  caja(c, -64, 92, 128, 108, 14, ACENTO, TINTA, 6);
  c.fillStyle = TINTA; c.beginPath(); c.arc(0, 136, 12, 0, 7); c.fill(); c.fillRect(-5, 136, 10, 32);
  c.restore();
}

// ---------- letreros en pantalla: el término real ----------
function rotulos(c: C, t: number) {
  const r1 = ventana(t, ev.ejecutar, ev.latigazo - .45, .2, .25);
  if (r1 > 0) { const e = ease.outBack(prog(t, ev.ejecutar, ev.ejecutar + .35), 1.5); texto(c, "ejecutar", 720, 1170 + (1 - e) * 30, { fuente: serif(124, true), color: ACENTO, alfa: r1 }); texto(c, "código", 720, 1300 + (1 - e) * 30, { fuente: serif(124, true), color: ACENTO, alfa: r1 * smooth(prog(t, ev.agarra - .1, ev.agarra + .1)) }); }
  const r2 = ventana(t, ev.diecisiete, ev.llavesT - .1, .2, .25);
  if (r2 > 0) texto(c, "unas 17,000 personas", 540, 330, { fuente: serif(ajusta(c, "unas 17,000 personas", 106, 900, (p) => serif(p, true)), true), color: ACENTO, alfa: r2 });
  const r3 = ventana(t, ev.llavesT, ev.latigazo2 - .1, .2, .25);
  if (r3 > 0) texto(c, "1.5 millones de llaves", 540, 330, { fuente: serif(ajusta(c, "1.5 millones de llaves", 106, 900, (p) => serif(p, true)), true), color: ACENTO, alfa: r3 });
}

/** Rayas de velocidad mientras la cámara cruza el papel vacío entre regiones. */
function rayas(c: C, t: number) {
  for (const [t0, dir] of [[ev.latigazo, -1], [ev.latigazo2, 1]] as [number, number][]) {
    const k = prog(t, t0 - .02, t0 + .5); if (k <= 0 || k >= 1) continue;
    const a = Math.sin(Math.PI * k) ** .7, r = azar(Math.floor(t0 * 10));
    c.save(); c.strokeStyle = TINTA; c.lineCap = "round";
    for (let i = 0; i < 26; i++) {
      const y = 160 + r() * 1500, L = 220 + r() * 520, x = ((r() * 1600 + dir * k * 2600) % 1600 + 1600) % 1600 - 260;
      c.globalAlpha = a * (.18 + r() * .4); c.lineWidth = 3 + r() * 6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + L, y); c.stroke();
    }
    c.restore();
  }
}

// ---------- el cuadro ----------
function dibuja(c: C, t: number, d: D) {
  FR = Math.floor(t * 10);
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  polvo(c, t);
  const v = vista(t), sh = sacudida(t);
  const z = v.z * (1 + .012 * vaiven(t, 7.7, .5));
  const ox = 9 * vaiven(t, 8.9) + 5 * vaiven(t, 5.3, 1), oy = 11 * vaiven(t, 10.3, 2);
  c.save();
  c.translate(540 + sh.x, 900 + sh.y); c.rotate(.005 * vaiven(t, 13.1)); c.scale(z, z); c.translate(-v.x - ox, -v.y - oy);
  // mundo
  c.save(); c.translate(A_MESA.x - 540, A_MESA.y - 900);
  mesa(c, t);
  monitor(c, t);
  c.restore();
  cajaFundacion(c, t, false);
  // el letrero se recorta contra el frente de la caja cuando baja
  c.save(); c.translate(A_LETRERO.x - 540, A_LETRERO.y - 900);
  if (t > ev.baja - .1) { c.beginPath(); c.rect(-1000, -3000, 3000, 3000 + 1130 + 6); c.clip(); }
  lluviaEstrellas(c, t);
  letrero(c, t);
  c.restore();
  cajaFundacion(c, t, true);
  contador(c, t);
  comentarios(c, t);
  // el teléfono y su garra
  const P = telPos(t);
  const comp = W(A_MESA, MON.x, MON.y);
  const G = garraDe(t, P, comp);
  if (t < ev.latigazo + .6 && P) {
    alambre(c, t, P);
    // cuerda del letrero al teléfono mientras cuelga
    if (t > ev.sube + 1.5 && t < ev.idea + .06) { const top = puntoTel(P.x, P.y, P.ang, 0, -PH_H / 2); c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.moveTo(PH_COLGADO.x, W(A_LETRERO, 0, LET.y + LET.h / 2).y); c.lineTo(top.x, top.y); c.stroke(); }
    if (t > ev.idea + .06 && t < ev.idea + .5) { const top = puntoTel(P.x, P.y, P.ang, 0, -PH_H / 2); const yq = W(A_LETRERO, 0, LET.y + LET.h / 2).y; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.moveTo(PH_COLGADO.x, yq); c.lineTo(PH_COLGADO.x + 20, yq + 60 - (t - ev.idea) * 200); c.stroke(); void top; }
    sombra(c, P.x, PH_MESA.y + PH_H / 2 + 6, 190, t < ev.sube || t > ev.aterriza ? .3 : 0);
    c.save(); c.translate(P.x, P.y + PH_H / 2); c.scale(1 + P.sq, 1 - P.sq); c.translate(-P.x, -(P.y + PH_H / 2));
    telefono(c, P.x, P.y, PH_W, PH_H, P.ang, (sw, sh2) => { burbujasChat(c, t, sw, sh2); botonTrampa(c, t, sw, sh2); });
    c.restore();
    const base = puntoTel(P.x, P.y, P.ang, 18, -60);
    agujero(c, base, 30, clamp(G.largo * 3));
    if (G.largo > 0) brazo(c, base.x, base.y, G.tip.x, G.tip.y, G.doblez, G.abre, TINTA, G.largo, 1.25);
    mensajeGrande(c, t, P);
    ataque(c, t, G.tip);
  }
  manoSobre(c, t);
  recibo(c, t);
  // el autor, al principio
  if (t > ev.autor - .1 && t < ev.idea) {
    const k = clamp(resorte(t - ev.autor, 3.4, .45), 0, 1.2);
    const A = W(A_MESA, -50, 1650);
    const arriba = smooth(prog(t, ev.sube - .15, ev.sube + .2)) * (1 - smooth(prog(t, ev.sube + .9, ev.sube + 1.5)));
    c.save(); c.translate(0, A.y); c.scale(1, k); c.translate(0, -A.y);
    persona(c, A.x, A.y, 720, { bL: lerp(.2, 2.7, arriba), bR: lerp(.25, 2.5, arriba) });
    c.restore();
    const kn = prog(t, ev.nombre, ev.nombreF);
    const N = W(A_MESA, 190, 750);
    c.save(); c.globalAlpha *= 1 - smooth(prog(t, ev.sube + .05, ev.sube + .4));
    escribe(c, "Peter Steinberger", N.x, N.y, serif(ajusta(c, "Peter Steinberger", 104, 860, (p) => serif(p, true)), true), kn, TINTA);
    c.restore();
  }
  plaza(c, t, d);
  puerta(c, t);
  c.restore();
  // velo al alejarse: el pasado queda atrás
  const velo = smooth(prog(t, ev.atras - .05, ev.atras + .45));
  if (velo > 0) { c.fillStyle = `rgba(244,242,236,${velo})`; c.fillRect(0, 0, 1080, 1920); if (velo > .5) polvo(c, t); }
  const velo2 = smooth(prog(t, ev.acerca, ev.acerca + .8));
  if (velo2 > 0) { c.fillStyle = PAPEL; c.globalAlpha = velo2; c.fillRect(0, 0, 1080, 1920); c.globalAlpha = 1; polvo(c, t); }
  rayas(c, t);
  cosasFinales(c, t);
  gente(c, t);
  cinta(c, t);
  rotulos(c, t);
}

function preparar(): D {
  const spr = document.createElement("canvas"); spr.width = 200; spr.height = 200;
  bola(spr.getContext("2d")!, 100, 100, 90);
  return { spr };
}
export const Pieza: React.FC = () => <Lienzo dibuja={(c, t, d) => dibuja(c, t, d)} preparar={preparar} />;
