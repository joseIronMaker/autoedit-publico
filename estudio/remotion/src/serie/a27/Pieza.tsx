// Serie 2, capítulo 27: los desastres. Una puerta de papel con un letrero colgado de la manija: «NO TOCAR». Es una
// frase colgada como si fuera cerradura. Detrás, la base de datos de la empresa: un archivero lleno de fichas. La bola
// con manos lleva en su llavero la llave real de ese cuarto. Abre con un adelanto (el letrero cae, la llave gira, la
// puerta revienta y las fichas salen volando hacia la cámara) que se rebobina. Luego en orden: el nombre de Lemkin se
// escribe, su mano (solo una mano, con su nombre) deja a la bola, le avienta el llavero y cuelga el letrero. La bola lo
// lee, asiente y abre con su llave; las fichas se deshacen en polvo. Pide perdón en un globo; en otro globo quema todas
// las versiones; era falso: el globo se rasga y la mano de Lemkin saca un respaldo y las fichas vuelven. Personitas de
// papel recortado y reportes, «según Lemkin». Las esclusas de a21 pasan rápido. La sombra con cuernos pierde los
// cuernos. Tres ecos: la bandera de a04, la ruleta de c11 y las llaves de a14. El contador de Stanford. Un pasillo de
// puertas con letreros: la misma forma. El letrero como candado que no es; la frase como una liga que resiste pero cede.
// Cierra con el letrero deshecho como papel mojado y una mano que, en vez de escribir otro, le quita la llave a la bola.
// Todos los instantes vienen de eventos.json (partitura.py): dibujo y sonido son los mismos números.
import React from "react";
import { azar, Cam, caida, camara, clamp, ease, guionCamara, lerp, prog, resorte, smooth, texto, Vista } from "../../kit";
import { ACENTO, bola, GRIS, Lienzo, mono, PAPEL, serif, sombra, TINTA } from "../../marca";
import { agente, brazo } from "../../personaje";
import duracion from "./duracion.json";
import ev from "./eventos.json";

export const DURACION = duracion.dur;
type C = CanvasRenderingContext2D;
type P3 = [number, number, number];
type Pt = { x: number; y: number; s: number; zc: number };
type XY = [number, number];

// ---------- herramientas ----------
let FR = 0;
const frac = (x: number) => x - Math.floor(x);
const tiembla = (j: number) => frac(Math.sin(j * 12.9898 + FR * 78.233) * 43758.5453) - .5;
const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * 6.2832 + f);
const ventana = (t: number, a: number, b: number, fi = .25, fo = .3) => smooth(prog(t, a, a + fi)) * (1 - smooth(prog(t, b, b + fo)));
const L2 = (a: XY, b: XY, k: number): XY => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
const BLANCO = "#FBFAF6", CARTON = "#E4DFD2", MANO = "#F7F4EC", ROJO_C = "#E9896C";
const hash = (i: number) => frac(Math.sin(i * 91.17 + 3.1) * 43758.5453);
const mezcla = (a: string, b: string, k: number) => {
  const h = (x: string) => [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16));
  const A = h(a), B = h(b);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], clamp(k)))).join(",")})`;
};
function linea(c: C, ax: number, ay: number, bx: number, by: number) { c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); }
function circulo(c: C, x: number, y: number, r: number) { c.beginPath(); c.arc(x, y, Math.max(r, .01), 0, 6.2832); c.fill(); }
/** Polígono a tinta con la vibración del dibujo a mano. */
function quad(c: C, P: XY[], fill: string | null, tinta: string | null = TINTA, g = 3, vib = .9, sem = 0) {
  c.beginPath();
  P.forEach(([x, y], i) => {
    const j = sem + i * 7.31;
    const X = x + tiembla(j) * vib, Y = y + tiembla(j + 3.3) * vib;
    if (i) c.lineTo(X, Y); else c.moveTo(X, Y);
  });
  c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (tinta) { c.strokeStyle = tinta; c.lineWidth = g; c.lineJoin = "round"; c.stroke(); }
}
function ajusta(c: C, s: string, px: number, max: number, it: boolean) { c.font = serif(px, it); const w = c.measureText(s).width; return w > max ? px * max / w : px; }
/** Rótulo en pantalla con un halo de papel: lo que pase detrás no compite con la letra. */
function titulo(c: C, t: number, a: number, b: number, s: string, y: number, px: number, color = TINTA, it = true, fo = .25) {
  const al = smooth(prog(t, a - .04, a + .16)) * (1 - smooth(prog(t, b, b + fo)));
  if (al <= .003) return;
  const p = ajusta(c, s, px, 860, it);
  c.font = serif(p, it);
  const w = c.measureText(s).width, rx = w * .5 + 70, ry = p * .62;
  c.save(); c.globalAlpha = al * .85; c.translate(540, y - p * .3); c.scale(1, ry / rx);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, "rgba(244,242,236,1)"); g.addColorStop(.62, "rgba(244,242,236,.9)"); g.addColorStop(1, "rgba(244,242,236,0)");
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, rx, 0, 6.2832); c.fill(); c.restore();
  texto(c, s, 540, y + (1 - ease.outCubic(prog(t, a - .04, a + .32))) * 18, { fuente: serif(p, it), color, alfa: al });
}
/** Polvo de papel en pantalla: siempre flota algo. */
function polvo(c: C, t: number, alfa = 1) {
  const r = azar(9);
  c.fillStyle = TINTA;
  for (let i = 0; i < 64; i++) {
    const x0 = r() * 1200 - 60, y0 = r() * 2060, v = 14 + r() * 40, f = r() * 6.3, z = 1.6 + r() * 3.2;
    const y = ((y0 - t * v) % 2060 + 2060) % 2060 - 70, x = x0 + Math.sin(t * .55 + f) * 30;
    c.globalAlpha = alfa * (.06 + r() * .14); c.fillRect(x, y, z, z);
  }
  c.globalAlpha = 1;
}

// ---------- el rebobinado: el adelanto es una función de τ, y rebobinar es recorrer τ hacia atrás ----------
const RW0 = ev.rebobina, RW1 = ev.rebobina + .65;
function tau(t: number) {
  if (t < RW0) return t;
  if (t < RW1) return lerp(RW0, -.6, ease.inOutCubic(prog(t, RW0, RW1)));
  return -9;
}
const enAdelanto = (t: number) => t < RW1;

// ---------- el cuarto: geometría (x a la derecha, y hacia abajo, d hacia adentro del cuarto) ----------
const YF = 1420, DX0 = 550, DX1 = 910, DY0 = 620, DW = DX1 - DX0;
const VP = { x: 730, y: 600 }, FOC = 1400;
const DA0 = 430, DA1 = 600, AX0 = 620, AX1 = 840, AY0 = 880, DB = 820;
const BX = 228, RB = 95, BY = YF - RB, KX = DX0 + 48;
const U_PER = DW - 48, PERILLA_Y = 1062, CHAPA_Y = 984;
const CLAVO: XY = [DX0 - 140, 1066];
function pr(x: number, y: number, d: number) { const k = FOC / Math.max(FOC + d, 30); return { x: VP.x + (x - VP.x) * k, y: VP.y + (y - VP.y) * k, k }; }
const prXY = (x: number, y: number, d: number): XY => { const p = pr(x, y, d); return [p.x, p.y]; };
/** Punto de la hoja de la puerta a `u` de la bisagra, a la altura y. La puerta abre hacia adentro. */
function enHoja(th: number, u: number, y: number) { return pr(DX1 - u * Math.cos(th), y, u * Math.sin(th)); }

// ---------- cámara del cuarto ----------
type K2 = { t: number; x: number; y: number; z: number; d?: number; f?: (x: number) => number };
function viaje(t: number, L: K2[]) {
  let x = L[0].x, y = L[0].y, z = L[0].z;
  for (let i = 1; i < L.length; i++) {
    const k = L[i]; if (t < k.t) break;
    const u = (k.f ?? ease.inOutCubic)(prog(t, k.t, k.t + (k.d ?? 1.2)));
    x = lerp(x, k.x, u); y = lerp(y, k.y, u); z = z * (k.z / z) ** u;
  }
  return { x, y, z };
}
const CAM: K2[] = [
  { t: 0, x: 600, y: 1175, z: 1.95 },
  { t: .02, x: 560, y: 1090, z: 1.12, d: 2.1, f: ease.outCubic },
  { t: ev.revienta - .05, x: 615, y: 1060, z: 1.03, d: .45, f: ease.outCubic },
  { t: RW0, x: 560, y: 1030, z: 1.05, d: .8 },
  { t: ev.julio + .3, x: 590, y: 1030, z: 1.0, d: 2.0 },
  { t: ev.suelta - .9, x: 480, y: 1000, z: 1.08, d: 1.2 },
  { t: ev.ordena, x: 520, y: 1000, z: 1.12, d: 1.2 },
  { t: ev.lee - .25, x: 420, y: 1130, z: 1.3, d: .9 },
  { t: ev.gira - .1, x: 610, y: 1010, z: 1.06, d: 1.0 },
  { t: ev.perdon - .3, x: 440, y: 1040, z: 1.06, d: 1.0 },
  { t: ev.destruido - .45, x: 540, y: 960, z: .98, d: 1.0 },
  { t: ev.falso + .35, x: 620, y: 1060, z: 1.06, d: .9 },
  { t: ev.cuatromil - .25, x: 560, y: 1000, z: .92, d: 1.0 },
  { t: ev.maldad - .02, x: 430, y: 1080, z: 1.04, d: .01 },
  { t: ev.termino - .35, x: 400, y: 1000, z: 1.1, d: 1.0 },
  { t: ev.invento - .35, x: 470, y: 990, z: 1.0, d: .8 },
  { t: ev.llaves - .25, x: 330, y: 1060, z: 1.25, d: .8 },
  { t: ev.orden - .02, x: 585, y: 1150, z: 1.8, d: .01 },
  { t: ev.orden + .05, x: 570, y: 1140, z: 1.6, d: 2.6, f: ease.outCubic },
  { t: ev.frase - .2, x: 590, y: 1130, z: 1.45, d: 1.4 },
  { t: ev.sugiere - .1, x: 520, y: 1130, z: 1.18, d: 1.0 },
  { t: ev.regla - .1, x: 580, y: 1170, z: 1.48, d: 1.0 },
  { t: ev.quita - .25, x: 480, y: 1100, z: 1.2, d: 1.0 },
  { t: ev.fin + .2, x: 520, y: 1070, z: 1.05, d: 3.0, f: ease.inOutSine },
];
const GOLPES: [number, number][] = [[ev.cae, .35], [ev.julio - .22, .25], [ev.gira0, .15], [ev.revienta, 1], [ev.suelta + .38, .45], [ev.gira, .15], [ev.abre, .2],
  [ev.rompe, .5], [ev.recupera + .9, .3], [ev.falsos, .2], [ev.cuernos, .25], [ev.termino + .25, .3], [ev.invento + 1.2, .2], [ev.cerradura, .25],
  [ev.noloes, .45], [ev.fuerte + .6, .4], [ev.toma, .3], [ev.fin + .25, .25]];
function sacudida(t: number) {
  let a = 0;
  for (const [ti, A] of GOLPES) if (t >= ti && t < ti + 1.2) a += A * Math.exp(-(t - ti) * 8);
  return { x: a * 9 * Math.sin(t * 61), y: a * 7 * Math.cos(t * 53) };
}

// ---------- la puerta ----------
function anguloPuerta(t: number) {
  if (enAdelanto(t)) {
    const ta = tau(t);
    if (ta < ev.revienta) return 0;
    return Math.min(1.45, 1.3 * ease.outBack(prog(ta, ev.revienta, ev.revienta + .34), 1.8));
  }
  if (t < ev.vuelve + 1) return 1.22 * ease.inOutCubic(prog(t, ev.abre, ev.abre + .95));
  if (t < ev.noloes) return 0;
  const aj = .34 * ease.outBack(prog(t, ev.noloes + .72, ev.noloes + 1.05), 2);
  const empuje = smooth(prog(t, ev.sugiere + .35, ev.fuerte + .25)) * (1 - ease.outCubic(prog(t, ev.fuerte + .55, ev.fuerte + .78)));
  const d = t - ev.fuerte - .78, rebote = d > 0 ? .07 * Math.exp(-d * 4) * Math.sin(d * 16) : 0;
  const cierra = 1 - ease.inOutCubic(prog(t, ev.regla + .05, ev.regla + .7));
  return (aj + .5 * empuje + rebote) * cierra;
}

function pared(c: C, t: number, sombraBola: number) {
  c.fillStyle = PAPEL; c.fillRect(-900, -900, 2900, YF + 900);
  // papel tapiz: rayas casi invisibles, ancladas a la pared
  c.fillStyle = "rgba(17,17,17,.03)";
  for (let x = -900; x < 2000; x += 84) c.fillRect(x, -900, 2, YF + 880);
  // luz que entra de arriba a la derecha
  const g = c.createRadialGradient(980, 260, 40, 980, 260, 1300);
  g.addColorStop(0, "rgba(255,248,232,.5)"); g.addColorStop(1, "rgba(255,248,232,0)");
  c.fillStyle = g; c.fillRect(-900, -900, 2900, YF + 900);
  // la sombra de la bola en la pared (solo cuando la luz la proyecta)
  if (sombraBola > .01) sombraEnPared(c, t, sombraBola);
  // zoclo
  quad(c, [[-900, YF - 26], [2000, YF - 26], [2000, YF], [-900, YF]], CARTON, null);
  c.strokeStyle = TINTA; c.lineWidth = 3; linea(c, -900, YF - 26, 2000, YF - 26);
  // piso con duelas que fugan
  c.fillStyle = "#E8E3D6"; c.fillRect(-900, YF, 2900, 1500);
  c.strokeStyle = "rgba(17,17,17,.14)"; c.lineWidth = 2;
  for (let i = -16; i <= 16; i++) { const x = VP.x + i * 150; const a = pr(x, YF, 0), b = pr(x, YF, -1150); linea(c, a.x, a.y, b.x, b.y); }
  for (const d of [-120, -300, -540, -860]) { const a = pr(-1400, YF, d), b = pr(2800, YF, d); linea(c, a.x, a.y, b.x, b.y); }
  c.strokeStyle = TINTA; c.lineWidth = 3.5; linea(c, -900, YF, 2000, YF);
}

/** La sombra de la bola en la pared: con cuernos y garras de villano hasta que la voz dice que no fue maldad. */
function sombraEnPared(c: C, t: number, a: number) {
  const x = BX - 150, y = BY - 215 + Math.sin(t * 2.3) * 5, R = RB * 1.5;
  const quita = t - ev.cuernos, ino = smooth(prog(quita, .1, .7));
  const col = "#CBC8C1";
  c.save(); c.globalAlpha = a;
  c.strokeStyle = col; c.fillStyle = col; c.lineCap = "round"; c.lineJoin = "round";
  // brazos: garras abiertas a los lados; luego caen, inocentes
  for (const sx of [-1, 1]) {
    const hx = x + sx * lerp(235, 200, ino), hy = y + lerp(-30, 90, ino) + 8 * Math.sin(t * 2 + sx);
    c.lineWidth = 26; c.beginPath(); c.moveTo(x + sx * R * .6, y - R * .2); c.quadraticCurveTo(x + sx * (R + 30), y - lerp(110, 10, ino), hx, hy); c.stroke();
    const base = Math.atan2(hy - (y - lerp(110, 10, ino)), hx - (x + sx * (R + 30)));
    c.lineWidth = 15;
    for (const k of [-1, 0, 1]) { const ang = base + k * lerp(.6, .35, ino); c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + Math.cos(ang) * lerp(56, 40, ino), hy + Math.sin(ang) * lerp(56, 40, ino)); c.stroke(); }
    circulo(c, hx, hy, 18);
  }
  circulo(c, x, y, R);
  for (const sx of [-1, 1]) {
    const vuela = quita > 0 ? quita : 0;
    if (vuela > 1.2) continue;
    const ox = sx * (R * .48 + vuela * 220), oy = -R * .78 - vuela * 520 + vuela * vuela * 1100;
    c.save(); c.translate(x + ox, y + oy); c.rotate(sx * (.3 + vuela * 7)); c.scale(sx * 1.25, 1.25);
    c.globalAlpha = a * (1 - smooth(prog(vuela, .55, 1.15)));
    c.fillStyle = vuela > 0 ? "#9d9a93" : col;
    // cuerno de diablo: base angosta y punta curva hacia afuera
    c.beginPath(); c.moveTo(-17, 24); c.quadraticCurveTo(-16, -44, 54, -92); c.quadraticCurveTo(6, -34, 19, 24); c.closePath(); c.fill();
    c.restore();
  }
  c.restore();
}

/** Un letrero en blanco: el que se iba a escribir y no se escribe. */
function letreroBlanco(c: C, t: number, x: number, y: number, k: number, a: number, cae: number) {
  if (a <= .01) return;
  c.save(); c.translate(x, y + 1400 * cae * cae); c.scale(k * clamp(a, 0, 1.2), k * clamp(a, 0, 1.2)); c.rotate(.04 * Math.sin(t * 2.1) + cae * 1.6);
  c.globalAlpha = 1 - smooth(prog(cae, .5, 1));
  c.strokeStyle = TINTA; c.lineWidth = 3;
  if (cae <= 0) { c.beginPath(); c.moveTo(-105, 74); c.lineTo(0, 0); c.lineTo(105, 74); c.stroke(); }
  c.fillStyle = "rgba(20,18,14,.12)"; c.beginPath(); c.roundRect(-163, 71, 340, 172, 8); c.fill();
  c.fillStyle = BLANCO; c.lineWidth = 4; c.beginPath(); c.roundRect(-170, 62, 340, 172, 8); c.fill(); c.stroke();
  c.fillStyle = PAPEL; c.lineWidth = 2.5; for (const sx of [-1, 1]) { c.beginPath(); c.arc(sx * 105, 76, 6.5, 0, 6.2832); c.fill(); c.stroke(); }
  c.strokeStyle = "rgba(17,17,17,.18)"; c.lineWidth = 2; c.setLineDash([6, 8]); linea(c, -110, 186, 110, 186); c.setLineDash([]);
  c.restore();
}

function marcoPuerta(c: C) {
  quad(c, [[DX0 - 34, DY0 - 34], [DX1 + 34, DY0 - 34], [DX1 + 34, YF], [DX0 - 34, YF]], CARTON, TINTA, 3.5, .9, 1);
  c.strokeStyle = "rgba(17,17,17,.35)"; c.lineWidth = 2;
  linea(c, DX0 - 20, DY0 - 20, DX1 + 20, DY0 - 20);
}

/** El cuarto de atrás: paredes en perspectiva, piso iluminado por la puerta y el archivero. */
function interior(c: C, t: number, th: number, cajones: (i: number) => number, fichas: (c: C, i: number, open: number, dF: number) => void, gente: (d0: number, d1: number) => void) {
  const A = pr(DX0, DY0, DB), B = pr(DX1, DY0, DB), Cc = pr(DX1, YF, DB), D = pr(DX0, YF, DB);
  c.save();
  c.beginPath(); c.rect(DX0, DY0, DW, YF - DY0); c.clip();
  c.fillStyle = "#2b2925"; c.fillRect(DX0, DY0, DW, YF - DY0);
  quad(c, [[DX0, DY0], [A.x, A.y], [D.x, D.y], [DX0, YF]], "#34312c", null);
  quad(c, [[DX1, DY0], [B.x, B.y], [Cc.x, Cc.y], [DX1, YF]], "#2f2c28", null);
  quad(c, [[A.x, A.y], [B.x, B.y], [Cc.x, Cc.y], [D.x, D.y]], "#211f1c", null);
  quad(c, [[DX0, YF], [DX1, YF], [Cc.x, Cc.y], [D.x, D.y]], "#4a463e", null);
  // la luz de la puerta abierta sobre el piso del cuarto
  const lu = smooth(prog(th, .05, .9));
  if (lu > 0) {
    const g = c.createLinearGradient(0, YF, 0, D.y);
    g.addColorStop(0, `rgba(255,246,226,${.42 * lu})`); g.addColorStop(1, "rgba(255,246,226,0)");
    c.fillStyle = g; c.beginPath(); c.moveTo(DX0, YF); c.lineTo(DX1, YF); c.lineTo(lerp(Cc.x, D.x, .2), Cc.y); c.lineTo(lerp(D.x, Cc.x, .25), D.y); c.closePath(); c.fill();
  }
  c.strokeStyle = "rgba(237,234,227,.18)"; c.lineWidth = 1.5;
  linea(c, A.x, A.y, DX0, DY0); linea(c, D.x, D.y, DX0, YF); linea(c, B.x, B.y, DX1, DY0); linea(c, Cc.x, Cc.y, DX1, YF);
  gente(DA1, DB);
  archivero(c, t, cajones, fichas);
  gente(0, DA0);
  c.restore();
}

const NCAJ = 4, CAJ_H = 112, CAJ_P = 130, NFICHAS = 10;
const cajY = (i: number) => AY0 + 22 + i * CAJ_P;
function archivero(c: C, t: number, cajones: (i: number) => number, fichas: (c: C, i: number, open: number, dF: number) => void) {
  // cuerpo: frente y tapa
  const f = (x: number, y: number) => prXY(x, y, DA0), b = (x: number, y: number) => prXY(x, y, DA1);
  sombraCaja(c);
  quad(c, [b(AX0, AY0), b(AX1, AY0), f(AX1, AY0), f(AX0, AY0)], "#CFC8B8", TINTA, 2.2, .7, 11);
  quad(c, [f(AX0, AY0), f(AX1, AY0), f(AX1, YF), f(AX0, YF)], CARTON, TINTA, 2.6, .7, 12);
  // rótulo de la base de datos, en la tapa
  for (let i = 0; i < NCAJ; i++) {
    const o = cajones(i);
    const y0 = cajY(i), y1 = y0 + CAJ_H, dF = DA0 - 175 * o;
    // hueco del cajón (siempre se ve la rendija)
    quad(c, [f(AX0 + 10, y0), f(AX1 - 10, y0), f(AX1 - 10, y1), f(AX0 + 10, y1)], o > .02 ? "#2a2824" : "#D7D0C0", "rgba(17,17,17,.5)", 1.6, .5, 20 + i);
    if (o > .02) {
      // la caja del cajón vista desde arriba, y sus fichas
      quad(c, [f(AX0 + 14, y0), f(AX1 - 14, y0), prXY(AX1 - 14, y0, dF), prXY(AX0 + 14, y0, dF)], "#3d3a34", "rgba(17,17,17,.6)", 1.6, .5, 30 + i);
      fichas(c, i, o, dF);
    }
    const p0 = prXY(AX0 + 8, y0 - 2, dF), p1 = prXY(AX1 - 8, y0 - 2, dF), p2 = prXY(AX1 - 8, y1, dF), p3 = prXY(AX0 + 8, y1, dF);
    quad(c, [p0, p1, p2, p3], "#ECE6D8", TINTA, 2.4, .7, 40 + i);
    const cx = (p0[0] + p1[0]) / 2, k = pr(0, 0, dF).k;
    c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 1.6;
    c.beginPath(); c.rect(cx - 32 * k, p0[1] + 18 * k, 64 * k, 26 * k); c.fill(); c.stroke();
    c.fillStyle = TINTA; c.beginPath(); c.roundRect(cx - 30 * k, p0[1] + 62 * k, 60 * k, 12 * k, 6 * k); c.fill();
  }
}
function sombraCaja(c: C) {
  const a = prXY((AX0 + AX1) / 2, YF, (DA0 + DA1) / 2);
  c.save(); c.translate(a[0], a[1]); c.scale(1, .28);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, 190);
  g.addColorStop(0, "rgba(0,0,0,.5)"); g.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = g; circulo(c, 0, 0, 190); c.restore();
}

/** Una ficha de pie dentro del cajón, a profundidad d. */
function ficha(c: C, d: number, y0: number, alza: number, alfa: number, j: number) {
  const x0 = AX0 + 26, x1 = AX1 - 26, top = y0 - 30 - alza, bot = y0 + 40 - alza;
  c.save(); c.globalAlpha *= alfa;
  quad(c, [prXY(x0, top, d), prXY(x1, top, d), prXY(x1, bot, d), prXY(x0, bot, d)], j % 3 === 0 ? "#F3EEE2" : BLANCO, "rgba(17,17,17,.75)", 1.4, .4, 60 + j);
  const a = prXY(x0 + 14, top + 12, d), b = prXY(x0 + 60 + (j % 4) * 14, top + 12, d);
  c.strokeStyle = j % 5 === 0 ? ACENTO : "rgba(17,17,17,.6)"; c.lineWidth = 2; linea(c, a[0], a[1], b[0], b[1]);
  c.restore();
}
/** Polvo de una ficha que se borra: sube, se abre y se apaga. edad 0..1. */
function polvoFicha(c: C, d: number, y0: number, edad: number, sem: number) {
  if (edad <= 0 || edad >= 1) return;
  const r = azar(sem), cen = pr((AX0 + AX1) / 2, y0 - 40 - edad * 160, d);
  c.fillStyle = TINTA;
  for (let k = 0; k < 16; k++) {
    const ang = r() * 6.28, v = 20 + r() * 110, sube = 40 + r() * 220;
    const x = cen.x + (r() - .5) * 140 * cen.k + Math.cos(ang) * v * edad * cen.k;
    const y = cen.y + Math.sin(ang) * v * .4 * edad - sube * edad * cen.k;
    c.globalAlpha = Math.sin(Math.PI * edad) * .75; const z = 2 + r() * 3.4; c.fillRect(x, y, z, z);
  }
  c.globalAlpha = 1;
}

// ---------- el adelanto: fichas que vuelan hacia la cámara ----------
const VUELOS = Array.from({ length: 44 }, (_, k) => {
  const r = azar(300 + k);
  return { i: k % 4, j: Math.floor(k / 4), t0: ev.revienta + .1 + Math.floor(k / 4) * .085 + (k % 4) * .02 + r() * .05, dur: .8 + r() * .35,
    dx: (r() - .5) * 1300, sube: -150 - r() * 420, giro: (r() - .5) * 7, vuelta: 3 + r() * 6, x0: AX0 + 40 + r() * 140 };
});
function cajonAdelanto(i: number, ta: number) { return ease.outBack(prog(ta, ev.revienta + .05 + i * .035, ev.revienta + .4 + i * .035), 1.5); }
function fichasAdelanto(c: C, ta: number) {
  const vivas = VUELOS.map((v) => ({ v, p: (ta - v.t0) / v.dur })).filter((o) => o.p > 0 && o.p < 1);
  const L = vivas.map(({ v, p }) => ({ v, p, d: DA0 - 80 - 1700 * p ** 1.5 }));
  L.sort((a, b) => b.d - a.d);
  for (const { v, p, d } of L) {
    const y = cajY(v.i) - 30 + v.sube * p + 520 * p * p;
    const q = pr(v.x0 + v.dx * p, y, d);
    if (q.k > 7) continue;
    c.save(); c.translate(q.x, q.y); c.rotate(v.giro * p); c.scale(q.k, q.k * Math.cos(v.vuelta * p));
    c.globalAlpha = 1 - smooth(prog(q.k, 3.2, 6.5));
    c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 2.2;
    c.beginPath(); c.rect(-75, -48, 150, 96); c.fill(); c.stroke();
    c.strokeStyle = (v.i + v.j) % 4 === 0 ? ACENTO : "rgba(17,17,17,.6)"; c.lineWidth = 3;
    linea(c, -58, -26, 10, -26); c.strokeStyle = "rgba(17,17,17,.35)"; c.lineWidth = 2; linea(c, -58, -6, 50, -6); linea(c, -58, 12, 34, 12); linea(c, -58, 30, 44, 30);
    c.restore();
  }
}

// ---------- fichas de la historia: se borran en polvo y regresan con el respaldo ----------
function edadFicha(i: number, j: number, t: number) {
  const r = hash(i * 31 + j);
  const tb = ev.vacia + .14 + j * .05 + i * .07 + r * .1;
  const tr = ev.recupera + .15 + (3 - i) * .07 + (NFICHAS - 1 - j) * .03 + r * .05;
  const a = clamp((t - tb) / .9);
  if (t < ev.recupera) return a;
  return Math.min(a, 1 - clamp((t - tr) / .45));
}
function cajonHistoria(i: number, t: number) {
  let o = ease.outBack(prog(t, ev.vacia - .3 + i * .06, ev.vacia + .05 + i * .06), 1.4);
  o *= 1 - ease.inOutCubic(prog(t, ev.recupera + .8 + i * .05, ev.recupera + 1.1 + i * .05));
  if (i === 0) o = Math.max(o, ease.outBack(prog(t, ev.cuatromil - .35, ev.cuatromil - .05), 1.3));
  if (t > ev.vuelve + 1) o = 0;
  return o;
}

// ---------- el letrero ----------
type Letrero = { x: number; y: number; k: number; ang: number; mojado: number; cae: number; sueltas: number; candado: number; rompe: number; subraya: number };
function vaivenLetrero(t: number) {
  let a = .03 * vaiven(t, 2.3) + .014 * vaiven(t, 1.1, 1);
  const ta = enAdelanto(t) ? tau(t) : t;
  const L: [number, number][] = enAdelanto(t) ? [[ev.cae, .55], [ev.revienta + .02, .95]]
    : [[ev.cuelga, .5], [ev.abre, .3], [ev.noloes + .72, .32], [ev.esfrase, .18], [ev.fuerte + .6, .25], [ev.regla + .1, .2]];
  for (const [ti, A] of L) { const d = ta - ti; if (d > 0 && d < 7) a += A * Math.exp(-d * 1.45) * Math.sin(d * 5.3); }
  return a;
}
/** Dónde está el letrero, o null si no está en escena. `hook` es el punto de donde cuelga. */
function letreroDe(t: number, th: number, manoP: XY | null): Letrero | null {
  const base = { mojado: 0, cae: 0, sueltas: 0, candado: 0, rompe: 0, subraya: 0 };
  const kp = enHoja(th, U_PER, PERILLA_Y);
  if (enAdelanto(t)) {
    const ta = tau(t);
    if (ta < -.5) return null;
    const dy = ta < ev.cae ? -430 * (1 - ((ta + .2) / (ev.cae + .2)) ** 2) : 0;
    return { ...base, x: kp.x, y: kp.y + dy, k: kp.k, ang: vaivenLetrero(t) * (ta < ev.cae ? .2 : 1) };
  }
  if (t < ev.ordena + .25) return null;
  if (t < ev.cuelga && manoP) return { ...base, x: manoP[0] - 4, y: manoP[1] + 34, k: 1, ang: .06 * Math.sin(t * 5) };
  if (t > ev.vuelve + 1 && t < ev.maldad - .1) return null;
  const sub = smooth(prog(t, ev.lee + .15, ev.lee + .85)) * (1 - smooth(prog(t, ev.abre, ev.abre + .4)));
  return {
    ...base, x: kp.x, y: kp.y, k: kp.k, ang: vaivenLetrero(t), subraya: sub,
    mojado: smooth(prog(t, ev.regla + .1, ev.regla + .8)), cae: prog(t, ev.regla + .8, ev.regla + 1.5),
    sueltas: smooth(prog(t, ev.esfrase - .05, ev.esfrase + .4)) * (1 - smooth(prog(t, ev.sugiere + .2, ev.sugiere + .8))),
    candado: smooth(prog(t, ev.cerradura - .05, ev.cerradura + .35)), rompe: prog(t, ev.noloes, ev.noloes + .9),
  };
}
const LETRAS = "NO TOCAR";
function letrero(c: C, t: number, L: Letrero) {
  c.save(); c.translate(L.x, L.y); c.scale(L.k, L.k);
  const W = 340, H = 172, Y0 = 62;
  // cordón
  if (L.cae <= 0) {
    c.save(); c.rotate(L.ang);
    c.strokeStyle = TINTA; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-105, Y0 + 12); c.lineTo(0, 0); c.lineTo(105, Y0 + 12); c.stroke();
    c.restore();
  }
  const piezas = L.cae > 0 ? 2 : 1;
  for (let p = 0; p < piezas; p++) {
    c.save();
    if (L.cae > 0) {
      // se rompe por la mitad, empapado, y cae al piso a deshacerse
      const s = p === 0 ? -1 : 1, q = L.cae, caeY = Math.min(1500 * q * q, (YF - L.y) / L.k - Y0 - H - 4);
      c.translate(s * 40 * q, caeY); c.rotate(L.ang + s * .5 * q);
      const aplasta = smooth(prog(q, .55, 1));
      c.translate(0, Y0 + H); c.scale(1 + .25 * aplasta, 1 - .7 * aplasta); c.translate(0, -(Y0 + H));
      c.beginPath(); if (s < 0) c.rect(-400, -50, 400 + 6 * Math.sin(t * 3), 500); else c.rect(6 * Math.sin(t * 3), -50, 400, 500); c.clip();
    } else c.rotate(L.ang);
    // la hoja: con agua se oscurece y se le cae la panza
    const m = L.mojado, sag = 46 * m;
    c.fillStyle = "rgba(20,18,14,.12)"; c.beginPath(); c.roundRect(-W / 2 + 7, Y0 + 9, W, H, 8); c.fill();
    c.fillStyle = mezcla(BLANCO, "#C9C1AE", m); c.strokeStyle = TINTA; c.lineWidth = 4; c.lineJoin = "round";
    c.beginPath();
    c.moveTo(-W / 2, Y0); c.lineTo(W / 2, Y0);
    c.quadraticCurveTo(W / 2 + 6 * m, Y0 + H * .6, W / 2 - 10 * m, Y0 + H + sag * .4);
    c.quadraticCurveTo(0, Y0 + H + sag * 1.6, -W / 2 + 10 * m, Y0 + H + sag * .4);
    c.quadraticCurveTo(-W / 2 - 6 * m, Y0 + H * .6, -W / 2, Y0);
    c.closePath(); c.fill(); c.stroke();
    c.fillStyle = PAPEL; c.strokeStyle = TINTA; c.lineWidth = 2.5;
    for (const sx of [-1, 1]) { c.beginPath(); c.arc(sx * 105, Y0 + 14, 6.5, 0, 6.2832); c.fill(); c.stroke(); }
    // el texto: letras que se aflojan, tinta que escurre
    c.font = serif(84); const tw = c.measureText(LETRAS).width;
    let x = -tw / 2;
    for (let i = 0; i < LETRAS.length; i++) {
      const ch = LETRAS[i], w = c.measureText(ch).width;
      const s2 = L.sueltas, j = i * 3.7;
      const ox = s2 * (Math.sin(t * 2.3 + j) * 12 + tiembla(j) * 3), oy = s2 * (Math.cos(t * 1.9 + j) * 16 - 10 * Math.sin(i));
      const rot = s2 * Math.sin(t * 1.6 + j) * .3;
      c.save(); c.translate(x + w / 2 + ox, Y0 + 108 + oy + sag * .5 * Math.sin(Math.PI * (x + tw / 2) / tw)); c.rotate(rot);
      if (m > 0) texto(c, ch, 0, 4 + 10 * m, { fuente: serif(84), color: TINTA, alfa: .25 * m, alin: "center" });
      texto(c, ch, 0, 0, { fuente: serif(84), color: TINTA, alfa: 1 - .65 * m, alin: "center" });
      if (m > .05 && ch !== " ") {
        const largo = 70 * m * (.5 + hash(i) * .8);
        c.strokeStyle = `rgba(17,17,17,${.55 * (1 - m * .3)})`; c.lineWidth = 4 * (1 - m * .4); c.lineCap = "round";
        linea(c, (hash(i + 9) - .5) * w * .5, 4, (hash(i + 9) - .5) * w * .5, 4 + largo);
        c.fillStyle = `rgba(17,17,17,.45)`; circulo(c, (hash(i + 9) - .5) * w * .5, 6 + largo, 5 * m);
      }
      c.restore();
      x += w;
    }
    // subrayado rojo: la bola lo está leyendo
    if (L.subraya > 0) { c.strokeStyle = ACENTO; c.lineWidth = 6; c.lineCap = "round"; linea(c, -tw / 2, Y0 + 124, -tw / 2 + tw * L.subraya, Y0 + 124); }
    texto(c, "sin permiso", 0, Y0 + 158 + sag * .8, { fuente: serif(36, true), color: GRIS, alfa: 1 - .7 * m });
    c.restore();
  }
  // el candado que no es: contorno rojo punteado que se arma alrededor y se rompe en pedazos
  if (L.candado > 0 && L.rompe < 1) {
    const a = L.candado, R = L.rompe;
    c.save(); c.rotate(L.ang);
    c.strokeStyle = ACENTO; c.lineWidth = 7; c.setLineDash([16, 12]); c.lineDashOffset = -t * 30; c.lineCap = "round";
    const seg = (dx: number, dy: number, g: number, f: () => void) => {
      c.save(); if (R > 0) { c.translate(dx * R * 60, dy * R * 60 + 900 * R * R); c.rotate(g * R); } c.globalAlpha = a * (1 - smooth(prog(R, .45, 1))); f(); c.restore();
    };
    const e = lerp(1.25, 1, ease.outBack(a, 1.4));
    c.scale(e, e);
    seg(-1, -.4, -1.2, () => { c.beginPath(); c.arc(0, Y0 - 6, 108, Math.PI, Math.PI * 1.5); c.stroke(); });
    seg(1, -.4, 1.2, () => { c.beginPath(); c.arc(0, Y0 - 6, 108, Math.PI * 1.5, Math.PI * 2); c.stroke(); });
    seg(-1, .2, -.6, () => { c.beginPath(); c.moveTo(-W / 2 - 22, Y0 - 6); c.lineTo(-W / 2 - 22, Y0 + H + 22); c.lineTo(0, Y0 + H + 22); c.stroke(); });
    seg(1, .2, .6, () => { c.beginPath(); c.moveTo(0, Y0 + H + 22); c.lineTo(W / 2 + 22, Y0 + H + 22); c.lineTo(W / 2 + 22, Y0 - 6); c.lineTo(-W / 2 - 22, Y0 - 6); c.stroke(); });
    c.restore();
  }
  c.restore();
}

// ---------- llaves ----------
function llave(c: C, x: number, y: number, ang: number, k: number, relleno: string) {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(k, k);
  c.lineJoin = "round"; c.lineWidth = 5; c.strokeStyle = TINTA; c.fillStyle = relleno;
  c.beginPath(); c.moveTo(-8, 44); c.lineTo(-8, 150); c.lineTo(10, 150); c.lineTo(10, 142); c.lineTo(30, 142); c.lineTo(30, 130); c.lineTo(20, 130); c.lineTo(20, 122); c.lineTo(32, 122); c.lineTo(32, 110); c.lineTo(10, 110); c.lineTo(10, 44); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.arc(0, 32, 27, 0, 7); c.fill(); c.stroke();
  c.fillStyle = PAPEL; c.beginPath(); c.arc(0, 15, 6, 0, 7); c.fill(); c.stroke();
  c.restore();
}
/** El llavero colgando de una mano. n llaves; la primera es la del cuarto (roja). */
function llavero(c: C, t: number, x: number, y: number, k: number, n: number, rojo: number, sinCuarto = false, impulso = 0) {
  const rr = 21 * k, cx = x, cy = y + rr * .9;
  for (let i = n - 1; i >= 0; i--) {
    if (i === 0 && sinCuarto) continue;
    const base = n === 1 ? 0 : lerp(-.75, .75, i / (n - 1));
    const a = base + .06 * vaiven(t, 1.5 + i * .21, i) + impulso * Math.sin(t * 9 + i) * .3;
    const ax = cx + Math.sin(a) * rr, ay = cy + Math.cos(a) * rr;
    const rel = i === 0 ? ACENTO : mezcla(BLANCO, ACENTO, rojo);
    llave(c, ax - Math.sin(a) * 8 * k, ay - Math.cos(a) * 8 * k, -a, k * (i === 0 ? .82 : .7), rel);
  }
  c.strokeStyle = TINTA; c.lineWidth = 5.5 * k; c.beginPath(); c.arc(cx, cy, rr, 0, 7); c.stroke();
}
/** La llave metida en la chapa, vista de frente: solo se ve la cabeza, que gira. */
function llaveEnChapa(c: C, x: number, y: number, k: number, giro: number) {
  c.save(); c.translate(x, y); c.scale(k, k); c.rotate(giro);
  c.fillStyle = TINTA; c.fillRect(-7, -6, 14, 30);
  c.fillStyle = ACENTO; c.strokeStyle = TINTA; c.lineWidth = 5;
  c.beginPath(); c.ellipse(0, 46, 26, 30, 0, 0, 7); c.fill(); c.stroke();
  c.fillStyle = PAPEL; c.beginPath(); c.arc(0, 56, 6, 0, 7); c.fill(); c.stroke();
  c.restore();
}

// ---------- la puerta, la perilla y la chapa ----------
function hojaPuerta(c: C, th: number) {
  const a = enHoja(th, DW, DY0), b = enHoja(th, DW, YF);
  const tono = mezcla(BLANCO, "#CFC9BB", smooth(prog(th, .1, 1.3)));
  quad(c, [[a.x, a.y], [DX1, DY0], [DX1, YF], [b.x, b.y]], tono, TINTA, 3.5, .9, 3);
  // filo interior: una línea a 18 px del canto
  const ia = enHoja(th, DW - 20, DY0 + 20), ib = enHoja(th, DW - 20, YF - 20), ja = enHoja(th, 20, DY0 + 20), jb = enHoja(th, 20, YF - 20);
  c.save(); c.globalAlpha = .28; quad(c, [[ia.x, ia.y], [ja.x, ja.y], [jb.x, jb.y], [ib.x, ib.y]], null, TINTA, 1.6, .6, 5); c.restore();
  // chapa (cerrojo) y perilla
  const ch = enHoja(th, U_PER, CHAPA_Y), pe = enHoja(th, U_PER, PERILLA_Y);
  const sx = Math.max(.25, Math.cos(th) * .7 + .3);
  c.save(); c.translate(ch.x, ch.y); c.scale(ch.k * sx, ch.k);
  c.fillStyle = "#D8D1C2"; c.strokeStyle = TINTA; c.lineWidth = 3; circulo(c, 0, 0, 24); c.beginPath(); c.arc(0, 0, 24, 0, 7); c.stroke();
  c.fillStyle = TINTA; circulo(c, 0, -5, 6); c.beginPath(); c.moveTo(-4, -2); c.lineTo(4, -2); c.lineTo(6, 12); c.lineTo(-6, 12); c.closePath(); c.fill();
  c.restore();
  c.save(); c.translate(pe.x, pe.y); c.scale(pe.k * sx, pe.k);
  c.fillStyle = "#D8D1C2"; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.roundRect(-16, -36, 32, 72, 14); c.fill(); c.stroke();
  const g = c.createRadialGradient(-8, -8, 2, 0, 0, 24); g.addColorStop(0, "#fff"); g.addColorStop(.5, "#BDB6A6"); g.addColorStop(1, "#6d685e");
  c.fillStyle = g; circulo(c, 0, 0, 22); c.beginPath(); c.arc(0, 0, 22, 0, 7); c.stroke();
  c.restore();
}

// ---------- la bola ----------
type Bola = { x: number; y: number; m1: XY; m2: XY; a1: number; a2: number; aro: XY | null; nL: number; rojo: number; sinCuarto: boolean; enChapa: number; giro: number; imp: number; alfa: number };
function bolaAdelanto(ta: number, th: number): Bola | null {
  if (ta < ev.rueda - .02) return null;
  const k = ease.outCubic(prog(ta, ev.rueda, ev.rueda + .8));
  const dr = ta - ev.revienta, rec = dr > 0 ? 42 * Math.exp(-dr * 4.5) * Math.sin(Math.min(dr * 8, 3.14)) : 0;
  const x = lerp(-200, BX, k) - rec, y = BY - Math.abs(Math.sin(k * 8)) * 26 * (1 - k);
  const m1: XY = [x - 150 + 8 * Math.sin(ta * 2.1), y - 30 + 6 * Math.cos(ta * 2.6)];
  const m2d: XY = [x + 150 + 6 * Math.sin(ta * 1.9), y - 64 + 6 * Math.cos(ta * 1.7)];
  const ch = enHoja(th, U_PER, CHAPA_Y);
  const alcanza = smooth(prog(ta, ev.llave0, ev.llave0 + .26)) * (1 - smooth(prog(ta, ev.revienta + .05, ev.revienta + .45)));
  const m2 = L2(m2d, [ch.x - 34, ch.y + 44], alcanza);
  const enChapa = alcanza > .97 && ta < ev.revienta + .08 ? 1 : 0;
  return { x, y, m1, m2, a1: .6, a2: enChapa ? .25 : .5, aro: enChapa ? null : m2, nL: 1, rojo: 0, sinCuarto: false, enChapa, giro: smooth(prog(ta, ev.gira0, ev.gira0 + .16)) * 1.57, imp: dr > 0 && dr < 2 ? Math.exp(-dr * 2) : 0, alfa: 1 };
}
function bolaHistoria(t: number, th: number, manoP: XY | null): Bola | null {
  if (t < ev.suelta - .75) return null;
  let x = BX, y = BY - 4 * (1 + Math.sin(t * 2.3));
  let m1: XY = [x - 150 + 10 * Math.sin(t * 1.7), y - 30 + 8 * Math.cos(t * 2.1)];
  let m2: XY = [x + 135 + 8 * Math.sin(t * 1.9), y - 70 + 8 * Math.cos(t * 1.6)];
  let a1 = .6, a2 = .5, aro: XY | null = null, nL = 1, rojo = 0, enChapa = 0, giro = 0, sinCuarto = false, imp = 0;
  const caidaY = BY - 418;
  if (t < ev.suelta && manoP) {                          // la lleva la mano de Lemkin
    x = manoP[0] - 10; y = manoP[1] + RB + 16;
    m1 = [x - 86, y + 66 + 8 * Math.sin(t * 7)]; m2 = [x + 86, y + 66 + 8 * Math.cos(t * 7)]; a1 = a2 = .9;
    return { x, y, m1, m2, a1, a2, aro, nL, rojo, sinCuarto, enChapa, giro, imp, alfa: 1 };
  }
  const dc = t - ev.suelta;
  if (dc < 2.5) {
    const z = caida(dc, 2.2, .4, 30).z;
    y = BY - z * 190 * (caidaY < BY ? 1 : 0);
    const susto = 1 - smooth(prog(dc, .3, 1.1));
    m1 = L2(m1, [x - 130, y - 140], susto); m2 = L2(m2, [x + 130, y - 140], susto); a1 = a2 = lerp(.6, 1, susto);
  }
  // el llavero: lo atrapa con la mano derecha
  const atrapa = ev.lanza + .42;
  if (t >= atrapa - .3) {
    const v = ventana(t, atrapa - .3, atrapa + .05, .2, .35);
    m2 = L2(m2, [m2[0] + 60, m2[1] - 90], v);
    if (t >= atrapa) aro = m2;
  }
  // lee el letrero y asiente
  const inclina = ventana(t, ev.lee - .1, ev.llave + .2, .35, .4);
  x += 22 * inclina;
  if (t > ev.entiende && t < ev.entiende + .6) y += 13 * Math.abs(Math.sin((t - ev.entiende) / .6 * Math.PI * 2));
  // la llave en la chapa: la de la historia y la de «no lo es»
  for (const [l0, g0, s0] of [[ev.llave, ev.gira, ev.abre + .15], [ev.noloes + .1, ev.noloes + .62, ev.noloes + 1.0]]) {
    const ch = enHoja(th, U_PER, CHAPA_Y);
    const al = smooth(prog(t, l0, l0 + .45)) * (1 - smooth(prog(t, s0, s0 + .4)));
    if (al > 0) {
      m2 = L2(m2, [ch.x - 34, ch.y + 44], al);
      if (al > .97 && t < s0 + .05) { enChapa = 1; giro = smooth(prog(t, g0, g0 + .16)) * 1.57; a2 = .25; }
    }
  }
  // perdón: manos juntas; «no hay manera»: manos abiertas; «era falso»: susto
  const perd = ventana(t, ev.perdon - .1, ev.dijo - .2, .35, .4);
  m1 = L2(m1, [x - 30, y + 30], perd); m2 = L2(m2, [x + 50, y + 26], perd); y += 12 * perd;
  const abre = ventana(t, ev.nohay - .15, ev.falso - .1, .35, .3);
  m1 = L2(m1, [x - 200, y - 130 + 10 * Math.sin(t * 3)], abre); m2 = L2(m2, [x + 200, y - 140 + 10 * Math.cos(t * 3)], abre); if (abre > .5) a1 = a2 = 1;
  const sus = ventana(t, ev.falso, ev.lemkin + .3, .15, .5);
  m1 = L2(m1, [x - 120, y - 190], sus); m2 = L2(m2, [x + 110, y - 200], sus); y -= 30 * sus * Math.abs(Math.sin((t - ev.falso) * 6));
  // muñecos: se asoma, abrumada
  const ab = ventana(t, ev.cuatromil, ev.vuelve, .4, .3);
  m1 = L2(m1, [x - 90, y - 150 + 14 * Math.sin(t * 6)], ab); m2 = L2(m2, [x + 100, y - 150 + 14 * Math.cos(t * 6)], ab);
  // no fue maldad: manos abiertas, inocente
  const ino = ventana(t, ev.cuernos - .1, ev.termino - .3, .3, .4);
  m1 = L2(m1, [x - 170, y - 70], ino); m2 = L2(m2, [x + 170, y - 80], ino); if (ino > .5) { a1 = a2 = 1; }
  // eco 1: la bandera en la mano izquierda
  const ban = ventana(t, ev.termino - .15, ev.invento - .2, .25, .35);
  m1 = L2(m1, [x - 118, y - 190 + 40 * smooth(prog(t, ev.sinhaber, ev.sinhaber + .6))], ban); if (ban > .5) a1 = .15;
  // eco 2: mira la ruleta, manos arriba
  const rul = ventana(t, ev.invento, ev.llaves - .2, .3, .3);
  m1 = L2(m1, [x - 150, y - 150], rul);
  // eco 3: levanta el llavero; las llaves se multiplican
  const lev = ventana(t, ev.llaves - .1, ev.stanford, .35, .3);
  m2 = L2(m2, [x - 10, y - 310 + 6 * Math.sin(t * 2)], lev);
  if (t > ev.llaves - .1 && t < ev.stanford + 1) {
    nL = 1 + Math.min(5, Math.floor(Math.max(0, (t - ev.muchas + .05) / .11)));
    rojo = smooth(prog(t, ev.nodebia, ev.nodebia + .3));
    imp = t > ev.muchas ? Math.exp(-(t - ev.muchas) * 1.5) : 0;
  }
  // la liga: empuja la puerta
  const emp = ventana(t, ev.sugiere + .2, ev.fuerte + .55, .4, .25);
  if (emp > 0) {
    const pe = enHoja(th, U_PER - 30, PERILLA_Y + 40);
    m2 = L2(m2, [pe.x - 30, pe.y], emp); a2 = lerp(a2, 1, emp);
    if (t > ev.fuerte + .55) m2 = [m2[0] - 60 * Math.exp(-(t - ev.fuerte - .55) * 3), m2[1]];
  }
  // le quitan la llave
  if (t > ev.toma) { sinCuarto = true; }
  if (t > ev.llaveF + .2) { const b = smooth(prog(t, ev.llaveF + .2, ev.llaveF + 1.1)); m2 = L2(m2, [x + 120, y + 10], b); a2 = lerp(a2, 1, b); }
  if (enChapa) aro = null; else aro = t >= atrapa ? m2 : null;
  return { x, y, m1, m2, a1, a2, aro, nL, rojo, sinCuarto, enChapa, giro, imp, alfa: 1 };
}
function dibujaBola(c: C, t: number, b: Bola, th: number) {
  agente(c, b.x, b.y, RB, b.m1, b.m2, { abre1: b.a1, abre2: b.a2, piso: YF + 4, sombra: .3 });
  if (b.enChapa) {
    const ch = enHoja(th, U_PER, CHAPA_Y);
    llaveEnChapa(c, ch.x, ch.y, ch.k, b.giro);
    // el aro cuelga de la cabeza de la llave
    c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.arc(ch.x + Math.sin(b.giro) * 30, ch.y + 92 + Math.cos(b.giro) * -8, 20, 0, 7); c.stroke();
  } else if (b.aro) {
    llavero(c, t, b.aro[0], b.aro[1] + 18, b.nL > 1 ? 1.3 : 1, b.nL, b.rojo, b.sinCuarto, b.imp);
  }
}

// ---------- la mano de Lemkin (y al final, la tuya) ----------
type Mano = { x: number; y: number; abre: number; tag: number; ax: number; ay: number };
function tramosXY(t: number, P: [number, number, number, number, ((x: number) => number)?][]): [number, number, number] {
  let x = P[0][1], y = P[0][2], a = P[0][3];
  for (let i = 1; i < P.length; i++) {
    const [t1, x1, y1, a1, f] = P[i], t0 = P[i - 1][0];
    if (t <= t0) break;
    const u = (f ?? ease.inOutCubic)(prog(t, t0, t1));
    x = lerp(x, x1, u); y = lerp(y, y1, u); a = lerp(a, a1, u);
  }
  return [x, y, a];
}
function manoDe(t: number, pAro: XY | null): Mano | null {
  let P: [number, number, number, number, ((x: number) => number)?][] | null = null, tag = 0;
  if (t > ev.suelta - 1.0 && t < ev.vete + .7) {
    const atr = ev.ordena + .3;
    P = [[ev.suelta - 1.0, 1420, 640, .3], [ev.suelta - .25, BX + 12, 792, .25, ease.outCubic], [ev.suelta, BX + 12, 792, .25], [ev.suelta + .14, BX + 20, 780, 1],
      [ev.suelta + .7, 430, 660, .9], [ev.lanza - .35, 760, 740, .3], [ev.lanza, 800, 700, .3], [ev.lanza + .12, 690, 660, 1, ease.outCubic],
      [atr, 1420, 720, .5], [atr + .55, 870, 900, .3, ease.outCubic], [ev.cuelga, KX + 4, PERILLA_Y - 34, .3], [ev.cuelga + .3, 660, 940, 1], [ev.vete, 720, 900, 1], [ev.vete + .6, 1420, 760, .8]];
    tag = ventana(t, ev.suelta - .9, ev.vete + .3, .4, .3);
  } else if (t > ev.lemkin - .3 && t < ev.segun + .9) {
    P = [[ev.lemkin - .3, 1420, 1180, .8], [ev.lemkin + .3, 860, 1320, .9, ease.outCubic], [ev.lemkin + .45, 860, 1320, .3], [ev.recupera + .35, 820, 790, .3, ease.outCubic],
      [ev.segun - .1, 830, 770, .3], [ev.segun + .9, 1420, 700, .5]];
    tag = ventana(t, ev.lemkin - .2, ev.segun + .3, .3, .3);
  } else if (t > ev.pide - .45 && t < ev.pideF + .8) {
    P = [[ev.pide - .45, 1420, 1100, .35], [ev.pide + .2, KX + 36, 1128, .35, ease.outCubic], [ev.pideF - .1, KX + 30, 1134, .35], [ev.pideF + .8, 1420, 1060, .5, ease.inCubic]];
  } else if (t > ev.quita - .25 && pAro) {
    const kx = pAro[0] + 8, ky = pAro[1] + 120;
    P = [[ev.quita - .25, 1420, 1000, .6], [ev.toma - .05, kx + 30, ky - 30, .9, ease.outCubic], [ev.toma + .1, kx + 30, ky - 30, .15], [ev.llaveF + .55, 810, 840, .15, ease.outBack],
      [DURACION, 830, 800, .15]];
  }
  if (!P) return null;
  const [x, y, a] = tramosXY(t, P);
  return { x: x + 6 * Math.sin(t * 2.2), y: y + 5 * Math.cos(t * 1.8), abre: a, tag, ax: Math.max(x + 520, 1450), ay: y + 210 };
}
function dibujaMano(c: C, m: Mano, t: number) {
  const g = 1.25;
  brazo(c, m.ax, m.ay, m.x, m.y, -70 * g, m.abre, TINTA, 1, g * 1.2);
  brazo(c, m.ax, m.ay, m.x, m.y, -70 * g, m.abre, MANO, 1, g);
  if (m.tag > .01) {
    // la etiqueta con su nombre, atada a la muñeca: es lo único que sabemos de él, y es lo único que se dibuja
    const tx = lerp(m.x, m.ax, .2), ty = lerp(m.y, m.ay, .2) - 36;
    c.save(); c.globalAlpha = m.tag; c.translate(tx, ty + 6 * Math.sin(t * 2.4)); c.rotate(-.08 + .04 * Math.sin(t * 1.7));
    c.font = serif(46, true); const w = c.measureText("Lemkin").width + 44;
    c.strokeStyle = TINTA; c.lineWidth = 2.5; linea(c, -w / 2 - 4, 0, -w / 2 - 30, 30);
    c.fillStyle = BLANCO; c.beginPath(); c.roundRect(-w / 2, -34, w, 62, 8); c.fill(); c.stroke();
    texto(c, "Lemkin", 0, 12, { fuente: serif(46, true), color: TINTA });
    c.restore();
  }
}

// ---------- globos ----------
function globo(c: C, cx: number, cy: number, w: number, h: number, cola: XY, k: number, dentro?: () => void) {
  c.save();
  c.translate(cola[0], cola[1]); c.scale(k, k); c.translate(-cola[0], -cola[1]);
  c.fillStyle = "rgba(20,18,14,.1)"; c.beginPath(); c.roundRect(cx - w / 2 + 9, cy - h / 2 + 11, w, h, 60); c.fill();
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 5; c.lineJoin = "round";
  c.beginPath(); c.roundRect(cx - w / 2, cy - h / 2, w, h, 60); c.fill(); c.stroke();
  const bx = clamp(cola[0], cx - w / 2 + 70, cx + w / 2 - 110), by = cy + h / 2;
  c.beginPath(); c.moveTo(bx, by - 3); c.lineTo(cola[0], cola[1]); c.lineTo(bx + 56, by - 3); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = BLANCO; c.fillRect(bx + 4, by - 8, 48, 10);
  if (dentro) dentro();
  c.restore();
}
/** Una versión del archivero, en miniatura, que se quema de abajo hacia arriba. */
function version(c: C, x: number, y: number, q: number, n: number, t: number) {
  const w = 108, h = 150;
  c.save(); c.translate(x, y);
  const curva = smooth(prog(q, .75, 1));
  c.scale(1 - .12 * curva, 1 - .45 * curva); c.translate(0, 40 * curva);
  // intacta
  quad(c, [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]], CARTON, TINTA, 3, .7, 70 + n);
  c.strokeStyle = TINTA; c.lineWidth = 2.2;
  for (let i = 1; i < 4; i++) linea(c, -w / 2 + 8, -h / 2 + i * h / 4, w / 2 - 8, -h / 2 + i * h / 4);
  for (let i = 0; i < 4; i++) { c.fillStyle = TINTA; c.fillRect(-12, -h / 2 + i * h / 4 + 14, 24, 6); }
  texto(c, `v${n}`, 0, -h / 2 - 14, { fuente: mono(28), color: GRIS });
  // lo quemado: de abajo hacia arriba, con un borde de brasa irregular
  if (q > 0) {
    const fy = h / 2 - (h + 30) * clamp(q);
    c.save(); c.beginPath(); c.moveTo(-w, h); c.lineTo(-w, fy);
    for (let i = 0; i <= 12; i++) { const xx = -w / 2 - 6 + i * (w + 12) / 12; c.lineTo(xx, fy + Math.sin(i * 2.7 + n) * 10 + tiembla(i + n * 13) * 6); }
    c.lineTo(w, fy); c.lineTo(w, h); c.closePath(); c.clip();
    c.fillStyle = "#1a1917"; c.fillRect(-w / 2 - 8, -h / 2 - 50, w + 16, h + 100);
    c.restore();
    if (q < 1.05) {
      c.strokeStyle = ACENTO; c.lineWidth = 5; c.beginPath();
      for (let i = 0; i <= 12; i++) { const xx = -w / 2 - 6 + i * (w + 12) / 12, yy = fy + Math.sin(i * 2.7 + n) * 10 + tiembla(i + n * 13) * 6; if (i) c.lineTo(xx, yy); else c.moveTo(xx, yy); }
      c.stroke();
      const r = azar(n * 7 + FR);
      for (let i = 0; i < 9; i++) {
        const ex = (r() - .5) * w, ey = fy - r() * 70;
        const g = c.createRadialGradient(ex, ey, 0, ex, ey, 22);
        g.addColorStop(0, "rgba(233,110,70,.55)"); g.addColorStop(1, "rgba(233,110,70,0)");
        c.fillStyle = g; circulo(c, ex, ey, 22);
        c.fillStyle = ACENTO; c.fillRect(ex, ey - 10, 4, 4);
      }
    }
  }
  c.restore();
}

// ---------- muñecos de papel recortado ----------
function muneco(c: C, x: number, y: number, k: number, abre: number, espejo: boolean) {
  if (abre <= .01) return;
  c.save(); c.translate(x, y); c.scale(k * abre * (espejo ? -1 : 1), k);
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 2.4 / k; c.lineJoin = "round";
  c.beginPath();
  c.moveTo(-50, -58); c.lineTo(-24, -62); c.lineTo(-14, -70);
  c.arc(0, -84, 15, Math.PI * .72, Math.PI * .28, false);
  c.lineTo(24, -62); c.lineTo(50, -58); c.lineTo(50, -46); c.lineTo(22, -44); c.lineTo(20, -24); c.lineTo(28, 0); c.lineTo(8, 0); c.lineTo(0, -18);
  c.lineTo(-8, 0); c.lineTo(-28, 0); c.lineTo(-20, -24); c.lineTo(-22, -44); c.lineTo(-50, -46); c.closePath();
  c.fill(); c.stroke();
  c.setLineDash([4, 5]); c.strokeStyle = "rgba(17,17,17,.4)"; c.lineWidth = 1.6 / k; linea(c, 50, -60, 50, -44); c.setLineDash([]);
  c.restore();
}
const FILAS = [{ d: -40, n: 9, t: 0 }, { d: -250, n: 8, t: .3 }, { d: -480, n: 7, t: .55 }];
function munecosFila(c: C, t: number, fila: number, a: number) {
  const F = FILAS[fila], t0 = ev.cuatromil + .15 + F.t;
  const u = ease.outCubic(prog(t, t0, t0 + 1.25));
  if (u <= 0) return;
  for (const lado of [-1, 1]) for (let j = 0; j < F.n; j++) {
    const ab = clamp(u * F.n - j);
    if (ab <= 0) continue;
    const x = VP.x + lado * (j + .5) * 100, p = pr(x, YF + 2, F.d);
    c.save(); c.globalAlpha = a;
    muneco(c, p.x, p.y + Math.abs(Math.sin(t * 5 + j + fila)) * -4 * p.k, p.k * 1.05, ab, (j % 2 === 1) !== (lado < 0));
    c.restore();
  }
}
/** El cuarto de adentro, lleno: miles de recortes pequeñitos. */
function multitud(c: C, t: number, a: number, d0: number, d1: number) {
  const u = smooth(prog(t, ev.cuatromil + .3, ev.ficticias + .6));
  if (u <= 0 || a <= 0) return;
  c.save(); c.globalAlpha = a;
  for (let fi = 0; fi < 12; fi++) {
    const d = DB - 40 - fi * 62, n = 9 + fi;
    if (d < d0 || d >= d1) continue;
    for (let j = 0; j < n; j++) {
      if (hash(fi * 40 + j) > u * 1.1) continue;
      const x = DX0 + (j + .5) / n * DW + (fi % 2) * 12, p = pr(x, YF, d);
      muneco(c, p.x, p.y + Math.sin(t * 4 + j + fi) * 1.5, p.k * .62, 1, (j + fi) % 2 === 0);
    }
  }
  c.restore();
}
/** Reportes que salen volando del cajón y caen dando vueltas. */
function reportes(c: C, t: number, a: number) {
  for (let k = 0; k < 6; k++) {
    const t0 = ev.reportes - .15 + k * .14, d = t - t0;
    if (d < 0) continue;
    const r = azar(500 + k), dx = (r() - .5) * 760, fx = r() * 6;
    const sube = Math.min(d, .5), baja = Math.max(0, d - .5);
    const x = VP.x + dx * Math.min(d / .7, 1) + 40 * Math.sin(d * 3 + fx) * (d > .5 ? 1 : 0);
    const y = 980 - 520 * sube + 900 * sube * sube + Math.min(baja * 220, 520 + r() * 120);
    c.save(); c.globalAlpha = a; c.translate(x, y); c.rotate(.5 * Math.sin(d * 2.6 + fx) + (r() - .5) * .4); c.scale(1, .82 + .18 * Math.cos(d * 4 + fx));
    c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 2.6;
    c.beginPath(); c.rect(-80, -104, 160, 208); c.fill(); c.stroke();
    c.fillStyle = TINTA; c.fillRect(-60, -82, 90, 9);
    c.fillStyle = "rgba(17,17,17,.35)"; c.fillRect(-60, -62, 110, 5); c.fillRect(-60, -50, 80, 5);
    for (let b = 0; b < 4; b++) { const hb = 30 + ((k * 7 + b * 13) % 50); c.fillStyle = b === 2 ? ACENTO : TINTA; c.fillRect(-54 + b * 30, 80 - hb, 20, hb); }
    c.strokeStyle = TINTA; c.lineWidth = 2; linea(c, -62, 82, 64, 82);
    c.restore();
  }
}

// ---------- ecos ----------
function bandera(c: C, t: number, x: number, y: number, k: number, flojo: number) {
  c.save(); c.translate(x, y); c.scale(k, k);
  c.strokeStyle = TINTA; c.lineWidth = 9; c.lineCap = "round"; linea(c, 0, 60, 0, -380);
  c.fillStyle = TINTA; circulo(c, 0, -384, 11);
  const n = 26, W = 300, A = 150;
  for (let i = 0; i < n; i++) {
    const v = (i + .5) / n, ola = Math.sin(v * 7 - t * 9) * 24 * v * (1 - flojo * .85);
    const ang = flojo * 1.35;
    const px = Math.cos(ang) * v * W, py = -370 + Math.sin(ang) * v * W + ola;
    c.save(); c.translate(px, py); c.rotate(ang);
    c.fillStyle = mezcla(ACENTO, "#8E2E1B", .18 * (1 + Math.cos(v * 7 - t * 9)) * (1 - flojo * .5)); c.fillRect(0, 0, W / n + 1.5, A * (1 - .15 * flojo));
    c.restore();
  }
  // el letrero de la tela, que se inclina con ella
  c.save(); const ang = flojo * 1.35; c.translate(0, -370); c.rotate(ang);
  texto(c, "¡ya terminé!", W / 2, A / 2 + 16, { fuente: serif(54, true), color: PAPEL, alfa: 1 - .6 * flojo });
  c.restore();
  c.restore();
}
const SECTORES = [{ p: .64, roja: true }, { p: .13 }, { p: .06 }, { p: .05 }, { p: .03 }, { p: .03 }, { p: .02 }, { p: .02 }, { p: .02 }];
function ruleta(c: C, t: number, x: number, y: number, k: number) {
  const t0 = ev.invento - .05, fin = ev.creible + .15;
  const u = prog(t, t0, fin);
  // gira y frena; al final el sector rojo queda bajo la flecha
  const giro = -Math.PI / 2 - SECTORES[0].p * Math.PI + 14 * (1 - (1 - u) ** 3) - 14 + .03 * Math.sin(t * 1.3);
  c.save(); c.translate(x, y); c.scale(k, k);
  sombra(c, 0, 250, 200, .2);
  c.fillStyle = TINTA; c.beginPath(); c.moveTo(-26, 228); c.lineTo(26, 228); c.lineTo(12, 196); c.lineTo(-12, 196); c.closePath(); c.fill();
  let a = giro;
  for (const s of SECTORES) {
    const b = a + s.p * 6.2832;
    c.fillStyle = s.roja ? ACENTO : BLANCO; c.strokeStyle = TINTA; c.lineWidth = 3;
    c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 200, a, b); c.closePath(); c.fill(); c.stroke();
    a = b;
  }
  c.lineWidth = 6; c.beginPath(); c.arc(0, 0, 200, 0, 7); c.stroke();
  c.fillStyle = TINTA; circulo(c, 0, 0, 16);
  // la bolita: da vueltas por el borde y cae en el sector rojo
  const ba = -Math.PI / 2 + 22 * (1 - (1 - u) ** 2.4) - 22;
  const rad = lerp(178, 150, smooth(prog(u, .85, 1)));
  bola(c, Math.cos(ba) * rad, Math.sin(ba) * rad - (u < .9 ? Math.abs(Math.sin(u * 40)) * 6 : 0), 15);
  // la flecha
  c.fillStyle = TINTA; c.beginPath(); c.moveTo(0, -196); c.lineTo(-22, -238); c.lineTo(22, -238); c.closePath(); c.fill();
  c.restore();
}
function insignia(c: C, t: number, x: number, y: number, k: number, cual: number) {
  if (k <= .01) return;
  c.save(); c.translate(x, y + 6 * Math.sin(t * 2 + cual)); c.scale(k, k);
  c.fillStyle = "rgba(20,18,14,.1)"; circulo(c, 6, 8, 64);
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 64, 0, 7); c.fill(); c.stroke();
  if (cual === 0) { c.strokeStyle = TINTA; c.lineWidth = 5; linea(c, -18, 40, -18, -40); c.fillStyle = ACENTO; c.beginPath(); c.moveTo(-16, -40); c.lineTo(34, -26); c.lineTo(-16, -10); c.closePath(); c.fill(); }
  if (cual === 1) { c.fillStyle = ACENTO; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 40, -2.4, 1.6); c.closePath(); c.fill(); c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 40, 0, 7); c.stroke(); }
  if (cual === 2) llave(c, 0, -46, 0, .55, ACENTO);
  c.restore();
}

// ---------- el cuarto entero ----------
function cuarto(c: C, t: number) {
  const cam = viaje(t, CAM), sh = sacudida(t);
  const z = cam.z * (1 + .012 * vaiven(t, 8.3, .5));
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  c.save();
  c.translate(540 + sh.x + 8 * vaiven(t, 7.3), 960 + sh.y + 10 * vaiven(t, 6.1, 1)); c.rotate(.004 * vaiven(t, 9.7, 2)); c.scale(z, z); c.translate(-cam.x, -cam.y);
  const th = anguloPuerta(t), ta = tau(t), adel = enAdelanto(t);
  const somb = ventana(t, ev.maldad + .2, ev.mismos + .3, .4, .5);
  pared(c, t, somb);
  marcoPuerta(c);
  // el cuarto de atrás
  if (th > .002) {
    const cajones = (i: number) => (adel ? cajonAdelanto(i, ta) : cajonHistoria(i, t));
    interior(c, t, th, cajones, (c2, i, open, dF) => {
      for (let j = NFICHAS - 1; j >= 0; j--) {
        const d = dF + 18 + j * 17;
        if (d > DA0 - 4) continue;
        if (adel) { if (ta < VUELOS[i + j * 4]?.t0 || j * 4 + i >= VUELOS.length) ficha(c2, d, cajY(i), 0, 1, j + i * 10); continue; }
        const ed = edadFicha(i, j, t);
        if (ed < .4) ficha(c2, d, cajY(i), ed * 140, 1 - smooth(ed / .4), j + i * 10);
        polvoFicha(c2, d, cajY(i), ed, i * 50 + j);
      }
    }, (d0, d1) => multitud(c, t, ventana(t, ev.cuatromil, ev.vuelve + .8, .3, .2), d0, d1));
  }
  hojaPuerta(c, th);
  // la mano y el letrero que trae
  const mano = !adel ? manoDe(t, null) : null;
  const L = letreroDe(t, th, mano ? [mano.x, mano.y] : null);
  // la liga: de la perilla al clavo del marco
  if (!adel && t > ev.sugiere && t < ev.regla + .8) {
    const a = ventana(t, ev.sugiere + .05, ev.regla + .2, .3, .5), pe = enHoja(th, U_PER, PERILLA_Y);
    const largo = Math.hypot(pe.x - CLAVO[0], pe.y - CLAVO[1]), tens = clamp((largo - 170) / 150);
    c.save(); c.globalAlpha = a;
    c.fillStyle = TINTA; circulo(c, CLAVO[0], CLAVO[1], 11); c.fillStyle = "#8a8478"; circulo(c, CLAVO[0] - 3, CLAVO[1] - 3, 4);
    c.strokeStyle = ACENTO; c.lineCap = "round"; c.lineWidth = lerp(20, 8, tens);
    const vib = tens > .6 ? Math.sin(t * 70) * 6 * tens : 0, mx = (pe.x + CLAVO[0]) / 2, my = (pe.y + CLAVO[1]) / 2 + lerp(40, 0, tens) + vib;
    c.beginPath(); c.moveTo(CLAVO[0], CLAVO[1]); c.quadraticCurveTo(mx, my, pe.x - 6, pe.y + 8); c.stroke();
    c.restore();
  }
  // la bola
  const B = adel ? bolaAdelanto(ta, th) : (t < ev.vuelve + 1 || t > ev.maldad - .1 ? bolaHistoria(t, th, mano ? [mano.x, mano.y] : null) : null);
  const enMano = !adel && !!mano && t < ev.cuelga;
  const tB = ev.regla + 1.05;                       // el letrero en blanco llega cuando el mojado ya cayó
  if (!adel && t > tB && t < ev.pideF + 1.0) {
    const pe = enHoja(th, U_PER, PERILLA_Y);
    letreroBlanco(c, t, pe.x, pe.y, pe.k, ease.outBack(prog(t, tB, tB + .35), 1.6), prog(t, ev.pideF + .05, ev.pideF + .85));
  }
  if (L && !enMano) letrero(c, t, L);
  // eco 1: la bandera (detrás del brazo)
  if (!adel && B && t > ev.termino - .2 && t < ev.invento + .2) {
    const k = ease.outBack(prog(t, ev.termino - .1, ev.termino + .25), 1.6) * (1 - smooth(prog(t, ev.invento - .3, ev.invento + .1)));
    if (k > .01) bandera(c, t, B.m1[0] + 4, B.m1[1] + 10, k * .95, smooth(prog(t, ev.sinhaber + .05, ev.sinhaber + .75)));
  }
  if (B) dibujaBola(c, t, B, th);
  // la bola lee el letrero: una línea punteada de ella a las letras
  if (!adel && B && L && t > ev.lee - .05 && t < ev.llave + .2) {
    const a = ventana(t, ev.lee - .05, ev.llave - .05, .2, .25);
    c.save(); c.globalAlpha = a; c.strokeStyle = ACENTO; c.lineWidth = 6; c.setLineDash([4, 16]); c.lineCap = "round"; c.lineDashOffset = -t * 80;
    c.beginPath(); c.moveTo(B.x + 62, B.y - 52); c.lineTo(L.x - 70 * L.k, L.y + 150 * L.k); c.stroke(); c.restore();
  }
  // filas de muñecos delante de la bola
  if (!adel) { const am = ventana(t, ev.cuatromil, ev.vuelve + .8, .2, .2); for (let f = 0; f < FILAS.length; f++) munecosFila(c, t, f, am); }
  if (!adel) reportes(c, t, ventana(t, ev.reportes - .2, ev.vuelve + .8, .1, .2));
  // el llavero en el aire
  if (!adel && t > ev.lanza - .02 && t < ev.lanza + .42) {
    const u = prog(t, ev.lanza, ev.lanza + .42), M = manoDe(ev.lanza, null), Bb = bolaHistoria(ev.lanza + .42, 0, null);
    if (M && Bb) { const x = lerp(M.x - 6, Bb.m2[0], u), y = lerp(M.y + 16, Bb.m2[1] + 18, u) - 260 * 4 * u * (1 - u); llavero(c, t, x, y, 1, 1, 0, false, 1); }
  }
  // la mano blanca, con lo que lleve
  const manoF = !adel ? manoDe(t, B?.aro ?? null) : null;
  if (manoF) {
    if (t > ev.suelta + .6 && t < ev.lanza) {
      const ap = ease.outBack(prog(t, ev.suelta + .7, ev.suelta + 1.0), 2);
      if (ap > .01) llavero(c, t, manoF.x - 6, manoF.y + 16, ap, 1, 0);
    }
    // el respaldo
    if (t > ev.lemkin + .35 && t < ev.segun + .9) {
      c.save(); c.translate(manoF.x - 20, manoF.y + 70); c.rotate(-.06 + .03 * Math.sin(t * 2));
      c.fillStyle = "#E8DDC2"; c.strokeStyle = TINTA; c.lineWidth = 4;
      c.beginPath(); c.moveTo(-120, -50); c.lineTo(-60, -50); c.lineTo(-46, -66); c.lineTo(10, -66); c.lineTo(22, -50); c.lineTo(120, -50); c.lineTo(120, 80); c.lineTo(-120, 80); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = BLANCO; c.fillRect(-80, -10, 160, 50); c.strokeRect(-80, -10, 160, 50);
      texto(c, "respaldo", 0, 24, { fuente: mono(30), color: TINTA });
      c.restore();
    }
    // la pluma: iba a escribir otro letrero
    if (t > ev.pide - .45 && t < ev.pideF + .8) {
      c.save(); c.translate(manoF.x - 30, manoF.y + 30); c.rotate(-.7 + .05 * Math.sin(t * 9));
      c.fillStyle = TINTA; c.beginPath(); c.roundRect(-9, -120, 18, 150, 6); c.fill();
      c.beginPath(); c.moveTo(-9, 30); c.lineTo(9, 30); c.lineTo(0, 62); c.closePath(); c.fill();
      c.restore();
    }
    dibujaMano(c, manoF, t);
    // la llave que se lleva
    if (t > ev.toma) llave(c, manoF.x - 18, manoF.y + 20, .12 * Math.sin(t * 2.6) + .2 * Math.exp(-(t - ev.llaveF) * 3) * Math.sin(t * 14), .95, ACENTO);
  }
  // el letrero en la mano se dibuja encima de la mano
  if (enMano && L) letrero(c, t, L);
  // globos
  globos(c, t, B);
  // insignias de los ecos
  if (!adel && t > ev.mismos - .1 && t < ev.llaves + .6) {
    const P: XY[] = [[300, 700], [520, 676], [740, 700]], usos = [ev.termino, ev.invento, ev.llaves];
    for (let i = 0; i < 3; i++) {
      const k = ease.outBack(prog(t, ev.mismos + .1 + i * .2, ev.mismos + .45 + i * .2), 1.8) * (1 - smooth(prog(t, usos[i] - .2, usos[i] + .15)));
      insignia(c, t, P[i][0], P[i][1], k * (1 + .4 * smooth(prog(t, usos[i] - .2, usos[i] + .15))), i);
    }
  }
  // eco 2: la ruleta
  if (!adel && t > ev.invento - .2 && t < ev.llaves + .1) {
    const k = ease.outBack(prog(t, ev.invento - .15, ev.invento + .2), 1.5) * (1 - smooth(prog(t, ev.llaves - .25, ev.llaves + .05)));
    if (k > .01) ruleta(c, t, 450, 790, k);
  }
  // el adelanto: fichas hacia la cámara
  if (adel && th > .01) fichasAdelanto(c, ta);
  c.restore();
  polvo(c, t, .9);
  titulosCuarto(c, t);
  // rebobinar: dos triángulos
  const rw = ventana(t, RW0 + .08, RW1 - .1, .08, .12);
  if (rw > 0) {
    c.save(); c.globalAlpha = rw * (.7 + .3 * Math.sin(t * 30)); c.fillStyle = ACENTO;
    for (const dx of [-30, 40]) { c.beginPath(); c.moveTo(540 + dx - 46, 330); c.lineTo(540 + dx + 24, 290); c.lineTo(540 + dx + 24, 370); c.closePath(); c.fill(); }
    c.restore();
  }
}

function globos(c: C, t: number, B: Bola | null) {
  if (!B || t < ev.perdon - .2 || t > ev.falso + 1.4) return;
  const cola: XY = [B.x + 40, B.y - RB - 14];
  // 1: el perdón
  const k1 = ease.outBack(prog(t, ev.perdon - .1, ev.perdon + .25), 1.6) * (1 - ease.inCubic(prog(t, ev.dijo - .25, ev.dijo - .05)));
  if (k1 > .01) {
    globo(c, 350, 870, 640, 250, cola, k1, () => {
      texto(c, "error catastrófico", 350, 856, { fuente: serif(74, true), color: TINTA });
      texto(c, "de juicio", 350, 938, { fuente: serif(74, true), color: TINTA });
    });
  }
  // 2: «no hay manera de recuperarlos», que se agranda con las versiones quemadas y luego se rasga
  const k2 = ease.outBack(prog(t, ev.dijo - .05, ev.dijo + .3), 1.6);
  if (k2 <= .01) return;
  const crece = ease.inOutCubic(prog(t, ev.destruido - .45, ev.destruido + .15));
  const cx = lerp(350, 540, crece), cy = lerp(870, 840, crece), w = lerp(640, 860, crece), h = lerp(250, 560, crece);
  const rompe = prog(t, ev.rompe, ev.rompe + .95);
  const dibujaContenido = () => {
    globo(c, cx, cy, w, h, cola, k2, () => {
      const ty = lerp(cy - 14, cy - h / 2 + 96, crece), px = lerp(74, 62, crece);
      texto(c, "no hay manera", cx, ty, { fuente: serif(px, true), color: TINTA });
      texto(c, "de recuperarlos", cx, ty + px * 1.1, { fuente: serif(px, true), color: TINTA });
      if (crece > .02) {
        c.save(); c.globalAlpha = crece;
        for (let n = 0; n < 5; n++) {
          const q = prog(t, ev.todas - .55 + n * .2, ev.todas + .65 + n * .2);
          version(c, cx - 320 + n * 160, cy + 130, q, n + 1, t);
        }
        c.restore();
      }
    });
  };
  if (rompe <= 0) { dibujaContenido(); return; }
  // se rasga: dos mitades que caen
  for (const s of [-1, 1]) {
    c.save();
    const q = rompe;
    c.translate(s * 120 * q, 1300 * q * q); c.translate(cx, cy); c.rotate(s * .55 * q); c.translate(-cx, -cy);
    c.beginPath();
    c.moveTo(cx, cy - h / 2 - 80);
    for (let i = 0; i <= 14; i++) c.lineTo(cx + Math.sin(i * 2.3) * 22 + (i % 2 ? 10 : -10), cy - h / 2 - 80 + i * (h + 400) / 14);
    c.lineTo(cx + s * 1200, cy + h); c.lineTo(cx + s * 1200, cy - h); c.closePath(); c.clip();
    c.globalAlpha = 1 - smooth(prog(q, .55, 1));
    dibujaContenido();
    c.restore();
  }
}

function titulosCuarto(c: C, t: number) {
  titulo(c, t, ev.base, RW0 - .2, "la base de datos", 300, 118);
  titulo(c, t, ev.empresa, RW0 - .2, "de la empresa", 405, 84, GRIS);
  // la fecha como sello
  const s = ease.outBack(prog(t, ev.julio - .36, ev.julio - .14), 2.2), sa = 1 - smooth(prog(t, ev.jason - .3, ev.jason));
  if (s > 0 && sa > 0) {
    c.save(); c.globalAlpha = sa; c.translate(540, 360); c.rotate(-.07); c.scale(lerp(1.8, 1, clamp(s)), lerp(1.8, 1, clamp(s)));
    c.strokeStyle = ACENTO; c.lineWidth = 7; c.beginPath(); c.roundRect(-300, -86, 600, 150, 12); c.stroke();
    c.lineWidth = 2.5; c.beginPath(); c.roundRect(-284, -72, 568, 122, 8); c.stroke();
    texto(c, "julio 2025", 0, 28, { fuente: serif(118), color: ACENTO });
    c.restore();
  }
  // Jason Lemkin: se escribe a mano
  const esc = prog(t, ev.jason - .05, ev.jason + .75);
  const aJ = 1 - smooth(prog(t, ev.replit - .45, ev.replit - .15));
  if (esc > 0 && aJ > 0) {
    c.save(); c.globalAlpha = aJ;
    c.font = serif(126); const w = c.measureText("Jason Lemkin").width;
    const x0 = 540 - w / 2, xr = x0 + w * ease.inOutSine(esc);
    c.save(); c.beginPath(); c.rect(0, 180, xr, 220); c.clip();
    texto(c, "Jason Lemkin", 540, 340, { fuente: serif(126), color: TINTA });
    c.restore();
    if (esc < 1) { c.save(); c.translate(xr, 330 + Math.sin(t * 40) * 8); c.rotate(.5); c.fillStyle = TINTA; c.beginPath(); c.roundRect(-6, -120, 12, 110, 4); c.fill(); c.beginPath(); c.moveTo(-6, -10); c.lineTo(6, -10); c.lineTo(0, 10); c.closePath(); c.fill(); c.restore(); }
    c.restore();
  }
  titulo(c, t, ev.fundador, ev.replit - .45, "un fundador conocido", 452, 66, GRIS, true, .3);
  titulo(c, t, ev.replit - .1, ev.ordena - .1, "el agente de Replit", 330, 104);
  titulo(c, t, ev.ordena + .2, ev.lee - .1, "no cambiar nada", 330, 100);
  titulo(c, t, ev.permiso, ev.lee - .1, "sin permiso", 450, 112, ACENTO);
  titulo(c, t, ev.prod - .35, ev.perdon - .2, "los datos de", 300, 78, GRIS);
  titulo(c, t, ev.prod, ev.perdon - .2, "producción", 420, 140, ACENTO);
  titulo(c, t, ev.todas, ev.falso - .35, "todas las versiones", 330, 96);
  titulo(c, t, ev.falso, ev.lemkin + .7, "era falso", 380, 160, ACENTO);
  titulo(c, t, ev.segun, ev.vuelve + .3, "según Lemkin", 240, 66, GRIS);
  titulo(c, t, ev.cuatromil, ev.reportes - .4, "4,000", 400, 170);
  titulo(c, t, ev.ficticias - .1, ev.reportes - .4, "personas ficticias", 510, 84, TINTA);
  titulo(c, t, ev.reportes, ev.vuelve + .3, "reportes falsos", 420, 120, ACENTO);
  titulo(c, t, ev.maldad + .3, ev.mismos - .4, "no fue maldad", 340, 120);
  titulo(c, t, ev.mismos, ev.termino - .4, "los mismos fallos", 330, 112);
  titulo(c, t, ev.termino, ev.invento - .45, "dijo que terminó", 330, 100);
  titulo(c, t, ev.sinhaber, ev.invento - .45, "sin haber terminado", 446, 88, ACENTO);
  titulo(c, t, ev.invento, ev.llaves - .25, "inventó", 290, 104);
  titulo(c, t, ev.creible - .05, ev.llaves - .25, "lo más creíble", 400, 96, ACENTO);
  titulo(c, t, ev.muchas - .1, ev.stanford + .2, "llaves", 330, 126);
  titulo(c, t, ev.nodebia, ev.stanford + .2, "que no debía tener", 450, 88, ACENTO);
  titulo(c, t, ev.lenguaje - .05, ev.cerradura - .4, "lenguaje natural", 330, 116);
  titulo(c, t, ev.cerradura - .05, ev.noloes - .35, "¿una cerradura?", 330, 116);
  titulo(c, t, ev.noloes, ev.frase - .4, "no lo es", 340, 150, ACENTO);
  titulo(c, t, ev.frase, ev.sugiere - .25, "«no toques producción»", 330, 84);
  titulo(c, t, ev.esfrase, ev.sugiere - .25, "es una frase", 446, 100, ACENTO);
  titulo(c, t, ev.sugiere + .1, ev.regla - .15, "una sugerencia", 330, 110);
  titulo(c, t, ev.fuerte, ev.regla - .15, "muy fuerte", 450, 120, ACENTO);
  titulo(c, t, ev.regla + .2, ev.quita - .1, "la regla de verdad", 330, 104);
  titulo(c, t, ev.pide, ev.quita - .1, "no se le pide", 450, 100, ACENTO);
  titulo(c, t, ev.quita + .3, DURACION + 1, "se le quita la llave.", 370, 112);
}

// ---------- las esclusas (a21), de pasada ----------
let K: Cam;
let TY = 0;
const P = (v: P3): Pt | null => K.p(v[0], v[1], v[2]);
const niebla = (y: number) => 1 - .96 * smooth(prog(y - TY, 5, 9));
function poli(c: C, Q: P3[], fill: string | null, tinta: string | null = TINTA, g = 2.4, vib = .8) {
  const pts: Pt[] = [];
  for (const q of Q) { const p = P(q); if (!p) return; pts.push(p); }
  c.beginPath();
  pts.forEach((p, i) => { const j = Q[i][0] * 3.1 + Q[i][1] * 5.7 + Q[i][2] * 2.3; const x = p.x + tiembla(j) * vib, y = p.y + tiembla(j + 40) * vib; if (i) c.lineTo(x, y); else c.moveTo(x, y); });
  c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (tinta) { c.strokeStyle = tinta; c.lineWidth = g; c.lineJoin = "round"; c.stroke(); }
}
function lin3(c: C, a: P3, b: P3, g: number, color = TINTA) {
  const A = P(a), B = P(b); if (!A || !B) return;
  c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round"; linea(c, A.x, A.y, B.x, B.y);
}
function at(c: C, w: P3, f: () => void, k = 1) { const p = P(w); if (!p) return; c.save(); c.translate(p.x, p.y); const e = p.s / 100 * k; c.scale(e, e); f(); c.restore(); }
const CW = 1.3, ZB = .42, GY = [5, 10, 15, 20];
const AGUA = "#DCE2DF", AGUA_O = "#C7D0CC", MURO = "#E4DFD2";
const VC = (tx: number, ty: number, tz: number, yaw: number, pitch: number, dist: number): Vista => ({ tx, ty, tz, yaw, pitch, dist });
const CLAVES_C = [
  { t: 0, v: VC(0, 7, .5, .3, .5, 12) },
  { t: ev.vuelve + .05, v: VC(0, 10, .4, .22, .6, 17.5), dur: 1.6, curva: ease.outCubic },
  { t: ev.deshacer - .35, v: VC(-.25, GY[1] - 1.45, 1.8, .6, .2, 6.2), dur: .8, curva: ease.outExpo },
  { t: ev.quien - .4, v: VC(-1.0, GY[3] - 1.4, 1.6, .5, .2, 6.8), dur: .8, curva: ease.outExpo },
];
const RIZOS = (() => { const r = azar(21); return Array.from({ length: 160 }, () => ({ x: (r() * 2 - 1) * (CW - .18), y: r() * 50 - 12, w: .1 + r() * .22, v: .16 + r() * .16 })); })();
function canalAgua(c: C, t: number) {
  const pos = K.pos, yn = Math.max(-14, pos[1] + 1.2), yf = 38;
  poli(c, [[-CW, yn, 0], [CW, yn, 0], [CW, yf, 0], [-CW, yf, 0]], AGUA, null);
  if (pos[0] > -CW) poli(c, [[-CW, yn, 0], [-CW, yf, 0], [-CW, yf, ZB], [-CW, yn, ZB]], MURO, null);
  if (pos[0] < CW) poli(c, [[CW, yn, 0], [CW, yf, 0], [CW, yf, ZB], [CW, yn, ZB]], MURO, null);
  if (pos[0] > CW) poli(c, [[CW, yn, ZB], [CW + 4, yn, ZB], [CW + 4, yf, ZB], [CW, yf, ZB]], PAPEL, null);
  if (pos[0] < -CW) poli(c, [[-CW - 4, yn, ZB], [-CW, yn, ZB], [-CW, yf, ZB], [-CW - 4, yf, ZB]], PAPEL, null);
  for (let y = Math.ceil(yn); y < 34; y += 1) {
    const a = niebla(y); if (a < .04) continue;
    c.globalAlpha = a;
    for (const sx of [-1, 1]) { lin3(c, [sx * CW, y, ZB], [sx * CW, y + 1, ZB], 2.6); lin3(c, [sx * (CW + .24), y, ZB], [sx * (CW + .24), y + 1, ZB], 1.4, "rgba(17,17,17,.5)"); }
  }
  c.globalAlpha = 1;
  for (const r of RIZOS) {
    let y = r.y + t * r.v; y = ((y + 12) % 50 + 50) % 50 - 12;
    if (y < yn + .3) continue;
    const a = niebla(y) * .55; if (a < .03) continue;
    const A = P([r.x - r.w, y, 0]), B = P([r.x + r.w, y, 0]), M = P([r.x, y - .05, 0]); if (!A || !B || !M) continue;
    c.globalAlpha = a * (.5 + .5 * Math.sin(t * 1.3 + r.y)); c.strokeStyle = "#8E9A96"; c.lineWidth = Math.max(1, A.s * .012);
    c.beginPath(); c.moveTo(A.x, A.y); c.quadraticCurveTo(M.x, M.y - 2, B.x, B.y); c.stroke();
  }
  c.globalAlpha = 1;
}
function caja3(c: C, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) {
  const pos = K.pos;
  if (pos[1] < y0) poli(c, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], "#F6F3EC");
  if (pos[0] < x0) poli(c, [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]], "#DCD6C8");
  if (pos[0] > x1) poli(c, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], "#DCD6C8");
  if (pos[2] > z1) poli(c, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], BLANCO);
}
function icono(c: C, i: number, t: number) {
  c.strokeStyle = TINTA; c.fillStyle = TINTA; c.lineCap = "round"; c.lineJoin = "round";
  if (i === 0) { c.lineWidth = 7; c.strokeRect(-34, -34, 68, 68); }
  if (i === 1) {
    const duda = smooth(prog(t, ev.nosabia - .05, ev.nosabia + .25));
    const gira = -6.2832 * ease.inOutCubic(prog(t, ev.deshacer + .2, ev.deshacer + 1.0));
    if (duda < 1) {
      c.save(); c.globalAlpha *= 1 - duda; c.rotate(gira); c.lineWidth = 9; c.beginPath(); c.arc(0, 0, 32, -.5, 4.1); c.stroke();
      const ax = Math.cos(4.3) * 32, ay = Math.sin(4.3) * 32, tx = -Math.sin(4.3), ty = Math.cos(4.3);
      c.beginPath(); c.moveTo(ax - tx * 4 + Math.cos(4.3) * 15, ay - ty * 4 + Math.sin(4.3) * 15); c.lineTo(ax - tx * 22, ay - ty * 22); c.lineTo(ax - tx * 4 - Math.cos(4.3) * 15, ay - ty * 4 - Math.sin(4.3) * 15); c.closePath(); c.fill();
      c.restore();
    }
    if (duda > 0) { const k = ease.outBack(duda, 2.4); c.save(); c.scale(k, k); c.rotate(.12 * Math.sin(t * 7)); texto(c, "?", 0, 30, { fuente: serif(104, true), color: ACENTO }); c.restore(); }
  }
  if (i === 2) {
    c.lineWidth = 4; c.setLineDash([7, 7]); c.strokeRect(-26, -20, 52, 40); c.setLineDash([]); c.lineWidth = 9; c.lineCap = "square";
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { c.beginPath(); c.moveTo(sx * 38, sy * 30 - sy * 16); c.lineTo(sx * 38, sy * 30); c.lineTo(sx * 38 - sx * 16, sy * 30); c.stroke(); }
  }
  if (i === 3) {
    const th = inclinaBal(t) * .8;
    c.lineWidth = 5; linea(c, 0, 38, 0, -22); linea(c, -18, 38, 18, 38);
    c.save(); c.translate(0, -24); c.rotate(th); linea(c, -38, 0, 38, 0);
    for (const sx of [-1, 1]) { c.save(); c.translate(sx * 36, 0); c.rotate(-th); c.lineWidth = 2.5; linea(c, 0, 0, -10, 22); linea(c, 0, 0, 10, 22); c.beginPath(); c.moveTo(-15, 22); c.lineTo(15, 22); c.quadraticCurveTo(0, 34, -15, 22); c.fill(); c.restore(); }
    c.restore(); circulo(c, 0, -24, 5);
  }
}
function compuerta(c: C, i: number, t: number) {
  const y0 = GY[i], pc = P([0, y0, 1.5]);
  const a = niebla(y0) * (pc ? smooth(prog(pc.zc, 4.3, 5.6)) : 0);
  if (a < .01) return;
  c.save(); c.globalAlpha = a;
  const XP = CW + .25;
  for (const sx of [-1, 1]) caja3(c, sx * XP - .2, sx * XP + .2, y0 - .2, y0 + .2, ZB, 3.0);
  poli(c, [[-CW + .02, y0, -.1], [CW - .02, y0, -.1], [CW - .02, y0, 1.25], [-CW + .02, y0, 1.25]], "#F1ECE0", TINTA, 2.6);
  for (let k = 1; k < 5; k++) { const z = lerp(-.1, 1.25, k / 5); lin3(c, [-CW + .06, y0 - .01, z], [CW - .06, y0 - .01, z], 1.3, "rgba(17,17,17,.35)"); }
  caja3(c, -XP - .32, XP + .32, y0 - .2, y0 + .2, 2.68, 3.05);
  for (const sx of [-1, 1]) lin3(c, [sx * .42, y0, 3.05], [sx * .42, y0 - .05, 3.2], 3.2);
  at(c, [0, y0 - .06, 3.72], () => {
    c.fillStyle = "rgba(20,18,14,.12)"; c.beginPath(); c.roundRect(-59, -59, 130, 130, 12); c.fill();
    c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.roundRect(-65, -65, 130, 130, 12); c.fill(); c.stroke();
    c.fillStyle = TINTA; circulo(c, -51, -51, 3.2); circulo(c, 51, -51, 3.2);
    icono(c, i, t);
  });
  // lámpara: la de la segunda parpadea, nadie sabe
  const L = P([-XP, y0, 3.38]);
  if (L) {
    const r = .3 * L.s;
    const duda = i === 1 && t > ev.nosabia ? .5 + .5 * Math.sin(t * 13) : 0;
    c.fillStyle = TINTA; c.fillRect(L.x - r * .7, L.y + r * .6, r * 1.4, r * .9);
    if (duda > 0) { const g = c.createRadialGradient(L.x, L.y, r * .3, L.x, L.y, r * 3); g.addColorStop(0, `rgba(233,110,80,${.55 * duda})`); g.addColorStop(1, "rgba(233,110,80,0)"); c.fillStyle = g; circulo(c, L.x, L.y, r * 3); bola(c, L.x, L.y, r, ACENTO); }
    else { c.fillStyle = "#D3CFC6"; circulo(c, L.x, L.y, r); c.strokeStyle = TINTA; c.lineWidth = Math.max(1.5, r * .12); c.beginPath(); c.arc(L.x, L.y, r, 0, 6.2832); c.stroke(); }
  }
  c.restore();
}
function inclinaBal(t: number) { return .5 * resorte(t - ev.el, 1.25, .38) - .06 * smooth(prog(t, ev.quien, ev.quien + .4)); }
function balanza(c: C, t: number) {
  const BAL: P3 = [-CW - 1.35, GY[3] - 1.3, ZB];
  const a = smooth(prog(t, ev.quien - .6, ev.quien)) * niebla(BAL[1]);
  if (a < .01) return;
  const th = inclinaBal(t);
  c.save(); c.globalAlpha = a;
  at(c, BAL, () => {
    sombra(c, 0, 0, 90, .25);
    c.strokeStyle = TINTA; c.fillStyle = TINTA; c.lineCap = "round";
    c.lineWidth = 9; linea(c, 0, 0, 0, -215); c.lineWidth = 7; linea(c, -45, 0, 45, 0);
    c.save(); c.translate(0, -215); c.rotate(th);
    c.lineWidth = 7; linea(c, -105, 0, 105, 0);
    for (const sx of [-1, 1]) {
      c.save(); c.translate(sx * 100, 0); c.rotate(-th);
      c.lineWidth = 2.5; linea(c, 0, 0, -40, 92); linea(c, 0, 0, 40, 92);
      c.fillStyle = "#EDE8DC"; c.strokeStyle = TINTA; c.lineWidth = 4;
      c.beginPath(); c.moveTo(-52, 92); c.lineTo(52, 92); c.quadraticCurveTo(0, 124, -52, 92); c.fill(); c.stroke();
      if (sx < 0) bola(c, 0, 66, 26);
      else {
        // el que paga: su nombre en una tarjeta, y la pesa que le cae
        c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.roundRect(-46, 46, 92, 40, 5); c.fill(); c.stroke();
        texto(c, "Lemkin", 0, 76, { fuente: serif(30, true), color: TINTA });
        const cae = prog(t, ev.el - .32, ev.el), y = lerp(-460, 22, cae * cae);
        if (t > ev.el - .32) { c.fillStyle = "#2a2a28"; c.beginPath(); c.moveTo(-40, y + 22); c.lineTo(40, y + 22); c.lineTo(30, y - 26); c.lineTo(-30, y - 26); c.closePath(); c.fill(); c.strokeStyle = "#2a2a28"; c.lineWidth = 8; c.beginPath(); c.arc(0, y - 30, 13, Math.PI, 0); c.stroke(); }
      }
      c.restore();
    }
    c.restore();
    c.fillStyle = TINTA; circulo(c, 0, -215, 11); c.fillStyle = BLANCO; circulo(c, 0, -215, 4);
  });
  c.restore();
}
function barquito(c: C, t: number) {
  const y = GY[1] - 1.75, w: P3 = [.05 * Math.sin(t * .9), y, .02 * Math.sin(t * 2.1)];
  const p = P(w); if (!p) return;
  c.save(); c.globalAlpha = niebla(y);
  at(c, w, () => {
    c.rotate(.03 * Math.sin(t * 1.7));
    c.fillStyle = "rgba(120,135,130,.35)"; c.beginPath(); c.ellipse(0, 6, 110, 18, 0, 0, 7); c.fill();
    c.fillStyle = "#EDE8DC"; c.strokeStyle = TINTA; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-96, -34); c.lineTo(96, -34); c.lineTo(62, 4); c.lineTo(-62, 4); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = "#F7F3EA"; c.beginPath(); c.moveTo(-96, -34); c.lineTo(0, -18); c.lineTo(96, -34); c.closePath(); c.fill(); c.stroke();
    // carga: el archivero en miniatura
    quad(c, [[18, -128], [70, -128], [70, -34], [18, -34]], CARTON, TINTA, 2.5, .5, 90);
    c.lineWidth = 1.6; for (let i = 1; i < 4; i++) linea(c, 22, -128 + i * 23.5, 66, -128 + i * 23.5);
    agente(c, -30, -72, 36, [-78, -110 + 4 * Math.sin(t * 3)], [12, -132 + 4 * Math.cos(t * 3)], { abre1: .6, abre2: .6 });
  });
  c.restore();
}
function esclusas(c: C, t: number) {
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  const v = guionCamara(t, CLAVES_C);
  let sac = 0; if (t > ev.el) sac = Math.exp(-(t - ev.el) * 8);
  const vv = { ...v, tx: v.tx + .05 * vaiven(t, 7.3) + sac * .07 * Math.sin(t * 61), tz: v.tz + .04 * vaiven(t, 5.1, 1), yaw: v.yaw + .016 * vaiven(t, 9.1, 2), dist: v.dist * (1 + .016 * vaiven(t, 8.3, .5)) };
  K = camara(vv); TY = vv.ty;
  canalAgua(c, t);
  for (let i = 3; i >= 0; i--) {
    if (i === 0) barquito(c, t);
    if (i === 2) balanza(c, t);
    compuerta(c, i, t);
  }
  polvo(c, t, .8);
  titulo(c, t, ev.preguntas - .05, ev.deshacer - .3, "las cuatro preguntas", 330, 104);
  titulo(c, t, ev.deshacer - .1, ev.quien - .45, "2", 236, 110, ACENTO);
  titulo(c, t, ev.deshacer, ev.quien - .45, "¿se podía deshacer?", 350, 92);
  titulo(c, t, ev.nosabia, ev.quien - .45, "él no lo sabía", 1470, 100, ACENTO);
  titulo(c, t, ev.quien - .1, ev.maldad + .4, "4", 236, 110, ACENTO);
  titulo(c, t, ev.quien, ev.maldad + .4, "¿quién pagaba?", 350, 92);
  titulo(c, t, ev.el, ev.maldad + .4, "él", 1490, 170, ACENTO);
}

// ---------- Stanford ----------
function contador(c: C, t: number) {
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  c.save(); c.translate(540 + 8 * vaiven(t, 6.7), 960 + 10 * vaiven(t, 5.3, 1)); c.scale(1 + .015 * vaiven(t, 7.9), 1 + .015 * vaiven(t, 7.9)); c.translate(-540, -960);
  // papelitos de incidentes que se acumulan
  const fin = ev.fin362, n = Math.floor(clamp((t - ev.stanford - .3) / (fin - ev.stanford - .3)) * 62);
  for (let k = 0; k < 62; k++) {
    const r = azar(700 + k), t0 = ev.stanford + .3 + (k / 62) * (fin - ev.stanford - .3), d = t - t0;
    if (d < 0) continue;
    const xf = 160 + r() * 760, yf = 1520 - Math.floor(k / 9) * 16 - r() * 10;
    const y = Math.min(600 + d * d * 2200, yf), x = xf + Math.sin(d * 5 + r() * 6) * 30 * (y < yf ? 1 : 0);
    c.save(); c.globalAlpha = smooth(d / .15); c.translate(x, y); c.rotate((r() - .5) * 1.4 + (y < yf ? d * 3 : 0));
    c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 2; c.beginPath(); c.rect(-34, -22, 68, 44); c.fill(); c.stroke();
    c.fillStyle = r() > .6 ? ACENTO : "rgba(17,17,17,.5)"; c.fillRect(-24, -10, 30, 6); c.fillStyle = "rgba(17,17,17,.3)"; c.fillRect(-24, 4, 44, 5);
    c.restore();
  }
  void n;
  // los dígitos: tragamonedas hasta 233, después odómetro hasta 362
  const TW = 230, TH = 330, GAP = 26, cy = 960;
  const obj233 = [2, 3, 3];
  const N = t < ev.n362 ? 233 : 233 + 129 * ease.inOutCubic(prog(t, ev.n362, ev.fin362));
  for (let k = 0; k < 3; k++) {
    const x = 540 + (k - 1) * (TW + GAP);
    c.save(); c.translate(x, cy);
    c.fillStyle = "rgba(20,18,14,.14)"; c.beginPath(); c.roundRect(-TW / 2 + 9, -TH / 2 + 12, TW, TH, 18); c.fill();
    c.fillStyle = TINTA; c.beginPath(); c.roundRect(-TW / 2, -TH / 2, TW, TH, 18); c.fill();
    c.save(); c.beginPath(); c.roundRect(-TW / 2 + 8, -TH / 2 + 8, TW - 16, TH - 16, 12); c.clip();
    let v: number;
    if (t < ev.n233) {
      const para = ev.n233 - (2 - k) * .16;
      const u = prog(t, ev.stanford + .4, para);
      v = obj233[k] + 30 * (1 - ease.outCubic(u));
    } else {
      const p = 10 ** (2 - k), base = Math.floor(N / p) % 10;
      const resto = (N % p) / p;
      v = k === 2 ? N % 10 : base + (resto > .9 ? (resto - .9) / .1 : 0);
    }
    const d0 = Math.floor(v), fr = v - d0;
    for (const [dd, off] of [[d0, -fr], [d0 + 1, 1 - fr]] as [number, number][]) {
      texto(c, String(((dd % 10) + 10) % 10), 0, 100 + off * TH, { fuente: serif(300), color: PAPEL });
    }
    const g = c.createLinearGradient(0, -TH / 2, 0, TH / 2);
    g.addColorStop(0, "rgba(9,9,10,.8)"); g.addColorStop(.25, "rgba(9,9,10,0)"); g.addColorStop(.75, "rgba(9,9,10,0)"); g.addColorStop(1, "rgba(9,9,10,.8)");
    c.fillStyle = g; c.fillRect(-TW / 2, -TH / 2, TW, TH);
    c.restore();
    c.strokeStyle = "rgba(237,234,227,.25)"; c.lineWidth = 2; linea(c, -TW / 2 + 8, 0, TW / 2 - 8, 0);
    c.restore();
  }
  // los años
  const a24 = ventana(t, ev.n233, ev.n362 - .1, .2, .3), a25 = smooth(prog(t, ev.fin362 - .2, ev.fin362 + .1));
  texto(c, "2024", 540, cy + TH / 2 + 110, { fuente: mono(64), color: GRIS, alfa: a24 });
  texto(c, "2025", 540, cy + TH / 2 + 110, { fuente: mono(64), color: ACENTO, alfa: a25 });
  c.restore();
  polvo(c, t, .8);
  titulo(c, t, ev.stanford + .3, ev.forma + .4, "Stanford", 300, 140);
  titulo(c, t, ev.incidentes, ev.forma + .4, "incidentes documentados de IA", 420, 74, GRIS);
}

// ---------- el pasillo: todos los desastres tienen la misma forma ----------
const LETREROS = ["no borres nada", "no toques producción", "no pagues sin preguntar", "solo lectura", "no mandes correos", "no publiques"];
function pasillo(c: C, t: number) {
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  const cz = lerp(-350, 2787, ease.inOutCubic(prog(t, ev.forma + .05, ev.orden + .32)));
  const F2 = 960, VX = 540 + 10 * vaiven(t, 6.1), VY = 860 + 8 * vaiven(t, 5.3, 1);
  const pj = (X: number, Y: number, Z: number) => { const dz = Z - cz; if (dz < 20) return null; const s = F2 / dz; return { x: VX + X * s, y: VY + Y * s, s }; };
  const XW = 440, YP = 326, YT = -1150, ZE = 3320, YD = -474, YK = -32;
  const Q = (pts: P3[], fill: string | null, tinta: string | null = TINTA, g = 2.6) => {
    const S = pts.map((p) => pj(p[0], p[1], p[2])); if (S.some((s) => !s)) return;
    quad(c, S.map((s) => [s!.x, s!.y] as XY), fill, tinta, g, .7, pts[0][2] * .01);
  };
  const zn = cz + 25;
  Q([[-XW, YT, zn], [-XW, YT, ZE], [-XW, YP, ZE], [-XW, YP, zn]], "#E3DED2", null);
  Q([[XW, YT, zn], [XW, YT, ZE], [XW, YP, ZE], [XW, YP, zn]], "#DED8CB", null);
  Q([[-XW, YP, zn], [XW, YP, zn], [XW, YP, ZE], [-XW, YP, ZE]], "#E3DED1", null);
  Q([[-XW, YT, zn], [XW, YT, zn], [XW, YT, ZE], [-XW, YT, ZE]], "#F0EDE6", null);
  Q([[-XW, YT, ZE], [XW, YT, ZE], [XW, YP, ZE], [-XW, YP, ZE]], PAPEL, TINTA, 2.6);
  for (const [a, b] of [[[-XW, YP], [XW, YP]], [[-XW, YT], [XW, YT]]] as [XY, XY][]) {
    for (const sx of [a, b]) { const A = pj(sx[0], sx[1], zn), B = pj(sx[0], sx[1], ZE); if (A && B) { c.strokeStyle = TINTA; c.lineWidth = 2.6; linea(c, A.x, A.y, B.x, B.y); } }
  }
  // la puerta del fondo: la nuestra, de frente
  const puertaF = (X0: number, X1: number, Z: number) => {
    Q([[X0 - 34, YD - 34, Z], [X1 + 34, YD - 34, Z], [X1 + 34, YP, Z], [X0 - 34, YP, Z]], CARTON, TINTA, 2.6);
    Q([[X0, YD, Z], [X1, YD, Z], [X1, YP, Z], [X0, YP, Z]], BLANCO, TINTA, 3);
    const k = pj(X0 + 48, YK, Z); if (k) { c.fillStyle = "#BDB6A6"; circulo(c, k.x, k.y, 20 * k.s); c.strokeStyle = TINTA; c.lineWidth = 2; c.beginPath(); c.arc(k.x, k.y, 20 * k.s, 0, 7); c.stroke(); }
    if (k) letreroChico(c, t, k.x, k.y, k.s, "NO TOCAR", 99, true);
  };
  puertaF(-65, 295, ZE - 1);
  for (const sx of [-1, 1]) { const A = pj(sx * XW, YP - 30, zn), B = pj(sx * XW, YP - 30, ZE); if (A && B) { c.strokeStyle = "rgba(17,17,17,.4)"; c.lineWidth = 2; linea(c, A.x, A.y, B.x, B.y); } }
  // puertas laterales, de lejos a cerca
  const PZ = [2700, 2280, 1860, 1440, 1020, 600];
  PZ.forEach((Z, i) => {
    const sx = i % 2 ? 1 : -1, X = sx * XW;
    Q([[X, YD - 34, Z - 24], [X, YD - 34, Z + 384], [X, YP, Z + 384], [X, YP, Z - 24]], CARTON, TINTA, 2.4);
    Q([[X, YD, Z], [X, YD, Z + 360], [X, YP, Z + 360], [X, YP, Z]], BLANCO, TINTA, 2.8);
    const k = pj(X - sx * 4, YK, Z + 46);
    if (k) { c.fillStyle = "#BDB6A6"; circulo(c, k.x, k.y, 18 * k.s); letreroChico(c, t, k.x - sx * 70 * k.s, k.y, k.s, LETREROS[i], i, false); }
  });
  polvo(c, t, .8);
  titulo(c, t, ev.misma - .05, ev.orden + .2, "la misma forma", 1480, 116);
}
function letreroChico(c: C, t: number, x: number, y: number, k: number, txt: string, i: number, grande: boolean) {
  c.save(); c.translate(x, y); c.scale(k, k); c.rotate(.04 * Math.sin(t * 1.9 + i));
  c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.moveTo(-105, 74); c.lineTo(0, 0); c.lineTo(105, 74); c.stroke();
  c.fillStyle = BLANCO; c.lineWidth = 4; c.beginPath(); c.roundRect(-170, 62, 340, 172, 8); c.fill(); c.stroke();
  const px = grande ? 84 : ajusta(c, txt, 60, 290, true);
  texto(c, txt, 0, grande ? 170 : 162, { fuente: serif(px, !grande), color: TINTA });
  c.restore();
}

// ---------- todo junto: escenas y hojas que se deslizan ----------
type Escena = (c: C, t: number) => void;
function hoja(c: C, t: number, vieja: Escena, nueva: Escena, t0: number, dir: "arriba" | "abajo" | "izq" | "der", dur = .62) {
  const k = ease.inOutCubic(prog(t, t0, t0 + dur));
  if (k <= 0) { vieja(c, t); return; }
  if (k >= 1) { nueva(c, t); return; }
  vieja(c, t);
  let x = 0, y = 0;
  if (dir === "arriba") y = 1920 * (1 - k); else if (dir === "abajo") y = -1920 * (1 - k); else if (dir === "izq") x = 1080 * (1 - k); else x = -1080 * (1 - k);
  // sombra de la hoja sobre la escena vieja
  c.save();
  const g = dir === "arriba" ? c.createLinearGradient(0, y - 60, 0, y) : dir === "abajo" ? c.createLinearGradient(0, y + 1980, 0, y + 1920) : dir === "izq" ? c.createLinearGradient(x - 60, 0, x, 0) : c.createLinearGradient(x + 1140, 0, x + 1080, 0);
  g.addColorStop(0, "rgba(20,18,14,0)"); g.addColorStop(1, "rgba(20,18,14,.28)");
  c.fillStyle = g; if (dir === "arriba") c.fillRect(0, y - 60, 1080, 60); else if (dir === "abajo") c.fillRect(0, y + 1920, 1080, 60); else if (dir === "izq") c.fillRect(x - 60, 0, 60, 1920); else c.fillRect(x + 1080, 0, 60, 1920);
  c.beginPath(); c.rect(x, y, 1080, 1920); c.clip(); c.translate(x, y);
  nueva(c, t);
  c.restore();
}
function dibuja(c: C, t: number) {
  FR = Math.floor(t * 10);
  if (t < ev.maldad - .1) hoja(c, t, cuarto, esclusas, ev.vuelve, "arriba");
  else if (t < ev.stanford - .1) hoja(c, t, esclusas, cuarto, ev.maldad, "abajo");
  else if (t < ev.forma - .1) hoja(c, t, cuarto, contador, ev.stanford, "izq");
  else if (t < ev.orden - .1) hoja(c, t, contador, pasillo, ev.forma, "arriba");
  else {
    // del pasillo a nuestra puerta: la cámara ya va encima; un fundido corto la cambia por la del cuarto
    const k = smooth(prog(t, ev.orden - .05, ev.orden + .3));
    if (k < 1) pasillo(c, t);
    if (k > 0) capa(c, k, (g) => cuarto(g, t));
  }
}
let CAPA: HTMLCanvasElement | null = null;
function capa(c: C, al: number, f: (g: C) => void) {
  if (al > .995) { f(c); return; }
  if (!CAPA) { CAPA = document.createElement("canvas"); CAPA.width = 1080; CAPA.height = 1920; }
  const g = CAPA.getContext("2d")!;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.clearRect(0, 0, 1080, 1920);
  f(g);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = al; c.drawImage(CAPA, 0, 0); c.restore();
}

export const Pieza: React.FC = () => <Lienzo dibuja={(c, t) => dibuja(c, t)} preparar={() => ({})} />;
