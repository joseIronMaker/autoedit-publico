// Serie 2, capítulo 8. Un solo mundo: una mesa de verdad, vista con cámara 3D, y un control remoto enorme que le cae
// encima al agente más inteligente del mundo. La bola camina sobre los botones: los aprieta con todo el cuerpo y
// no ve qué hay debajo, solo lee etiquetas. El mismo salto sobre el mismo botón manda la invitación a mamá o a los
// invitados según lo que diga el papel. La mesa es la del capítulo 5: cada botón nuevo empuja las notas de la
// fiesta fuera de ella. Todo lo que se lee en pantalla es también papel pegado: las palabras de este capítulo son
// etiquetas. Cierra regresando al primer botón, porque un agente las lee por primera vez cada vez.
import React from "react";
import { azar, camara, Cam, clamp, ease, guionCamara, lerp, prog, resorte, smooth, texto, Vista } from "../../kit";
import { ACENTO, bola, cue, GRIS, Lienzo, LUZ, mono, NOCHE, PAPEL, serif, sombra, TINTA } from "../../marca";
import { agente, brazo } from "../../personaje";
import palabras from "./palabras.json";
import duracion from "./duracion.json";
import EV from "./eventos.json";

export const DURACION = duracion.dur;
type Ctx = CanvasRenderingContext2D;
type P2 = [number, number];
const T = cue(palabras);
const s = (f: string, d = 0) => T(f, d).s, e = (f: string, d = 0) => T(f, d).e;
const seg = (t: number, a: number, b: number, c: number, d: number) => smooth(prog(t, a, b)) * (1 - smooth(prog(t, c, d)));
const pulso = (a: number, baja = .05, sube = .26) => (a < 0 ? 0 : a < baja ? a / baja : Math.max(0, 1 - (a - baja) / sube));
const BLANCO = "#FFFDF8", TIBIA = "#FFE8AE", ROJO_N = "#E9896C";

const t0 = {
  eso: s("eso le"), dando: e("eso le estás dando"), control: s("control"), remoto: s("remoto"), sin: s("sin etiquetas"), cuarenta: s("con cuarenta"), botF: e("con cuarenta botones"),
  imag: s("imagina"), mala: s("mala"), malaF: e("mala herramienta"), mas: s("más"), inteF: e("inteligente"), solo: s("solo lee"), enviar: s("enviar"),
  que: s("qué envía"), quien: s("a quién"), tuAg: s("tu agente"), adiv: s("adivinar"), mama: s("mamá"), fiesta: s("fiesta"), ahora: s("ahora llámala"),
  mismo: s("mismo modelo"), otro: s("otro resultado"), pasa: s("pasa lo mismo"), resp: s("respuestas"), falla: s("si algo"), error: s("error"), ciego: s("se queda ciego"),
  yMas: s("y más no"), cadaH: s("cada herramienta"), mesa: s("mesa"), mesaF: e("en la mesa"), porEso: s("por eso diseñar"), agente: s("para un agente"), prog: s("para un programador"),
  una: s("una persona"), unaF: e("una vez"), unAg: s("un agente las"), prim: s("por primera"), primF: e("primera vez"), cada: s("cada vez"),
};

// ---------- medidas del mundo ----------
const MESA = { x0: -6.7, x1: 6.7, y0: -10.6, y1: 17.2 };
const H = .5, ALTO = .15, TOPE = H + ALTO, RB = .56;
const CX = [-1.71, -.57, .57, 1.71];
const fila = (r: number) => 3.6 - r;
const BE = { x: CX[1], y: fila(6) };           // el botón de enviar
const BR = { x: CX[2], y: fila(2) };           // el botón de reservar
const DIA = { x: CX[3] - .14, y: fila(1) };    // la etiqueta del día
const LIB = .5, LIBX = 1.25, LIBY = .9, TORRE_Y = -6.15;
const CARD = { x0: -1.72, x1: 1.72, y1: BE.y + 4.55 };
const MAMA = { x: -3.4, y: 12 };
const INV = Array.from({ length: 12 }, (_, i) => ({ x: 1.25 + (i % 4) * 1.26, y: 14.2 - Math.floor(i / 4) * 1.45, f: i * 1.7 }));

const NOMBRES = ["buscar|lugar", "ver|fechas", "reservar|mesa", "cancelar|mesa", "pedir|pastel", "cambiar|pastel", "comprar|globos", "ver|menú", "traer|mariachi", "pedir|flores", "leer|correo", "responder|correo", "llamar", "colgar", "pagar", "pedir|factura", "hacer|lista", "borrar|lista", "ver|mapa", "pedir|taxi", "buscar|foto", "imprimir", "guardar", "abrir|archivo", "enviar|mensaje", "enviar|invitación", "enviar|recordatorio", "enviar|factura", "contar|invitados", "ver|respuestas", "cambiar|fecha", "cambiar|lugar", "ver|clima", "poner|música", "apagar|música", "pedir|sillas", "pedir|mesas", "dividir|cuenta", "avisar", "terminar"];

type Tecla = { x: number; y: number; col: number; fil: number; ini: number; base: boolean; id: number };
const COLS = [-5.13, -3.99, -2.85, -1.71, -.57, .57, 1.71, 2.85, 3.99, 5.13];
const pasoCol = (x: number) => (Math.abs(x) < 2 ? -1 : Math.abs(x) < 3 ? (x > 0 ? 1 : 2) : Math.abs(x) < 4.5 ? (x > 0 ? 4 : 5) : x > 0 ? 7 : 8);
const pasoFil = (f: number) => (f < 10 ? -1 : f === 10 ? 0 : f === 11 ? 3 : 6);
const TECLAS: Tecla[] = [];
for (let f = 0; f < 13; f++) for (const x of COLS) {
  const pc = pasoCol(x), pf = pasoFil(f), base = pc < 0 && pf < 0, k = Math.max(pc, pf);
  const col = CX.indexOf(x);
  TECLAS.push({ x, y: fila(f), col, fil: f, ini: base ? -1 : EV.CRECE[k] + .03 + .012 * (Math.abs(x) + f), base, id: base ? f * 4 + col : -1 });
}
TECLAS.sort((a, b) => b.y - a.y);

const NOTAS = [
  { x: -4.72, y: -3.6, w: 2.7, h: 3.5, g: -.07, tit: "invitados", cae: 5, fy: 0 },
  { x: 4.72, y: -4.8, w: 2.6, h: 3.1, g: .08, tit: "pastel", cae: 4, fy: 0 },
  { x: 4.68, y: 1.9, w: 2.72, h: 3.2, g: -.05, tit: "no come|mariscos", cae: 7, fy: 0 },
  { x: -4.66, y: 2.8, w: 2.6, h: 3, g: .06, tit: "le gustan|los boleros", cae: 8, fy: 0 },
];

// ---------- primitivas 3D ----------
function rrPuntos(x0: number, y0: number, x1: number, y1: number, r: number, n = 5) {
  const P: P2[] = [];
  const A = (cx: number, cy: number, a0: number) => { for (let i = 0; i <= n; i++) { const a = a0 + i / n * Math.PI / 2; P.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  A(x1 - r, y1 - r, 0); A(x0 + r, y1 - r, Math.PI / 2); A(x0 + r, y0 + r, Math.PI); A(x1 - r, y0 + r, Math.PI * 1.5);
  return P;
}
type V3 = [number, number, number];
/** Recorta el polígono contra el plano cercano de la cámara antes de proyectar: si no, al cruzarlo salen triángulos negros. */
function recorta(cam: Cam, Q: V3[]) {
  const pp = Math.min(cam.v.pitch, 1.5533), yw = cam.v.yaw, fw = [Math.cos(pp) * -Math.sin(yw), Math.cos(pp) * Math.cos(yw), -Math.sin(pp)];
  const zc = (q: V3) => (q[0] - cam.pos[0]) * fw[0] + (q[1] - cam.pos[1]) * fw[1] + (q[2] - cam.pos[2]) * fw[2];
  const N = .4, out: V3[] = [];
  for (let i = 0; i < Q.length; i++) {
    const a = Q[i], b = Q[(i + 1) % Q.length], za = zc(a), zb = zc(b);
    if (za >= N) out.push(a);
    if ((za >= N) !== (zb >= N)) { const u = (N - za) / (zb - za); out.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)]); }
  }
  return out;
}
function poli(c: Ctx, cam: Cam, Q: V3[]) {
  c.beginPath(); let f = true;
  for (const q of recorta(cam, Q)) { const p = cam.p(q[0], q[1], q[2]); if (!p) continue; if (f) { c.moveTo(p.x, p.y); f = false; } else c.lineTo(p.x, p.y); }
  c.closePath();
}
function anillo3(c: Ctx, cam: Cam, pts: P2[], z: number, dx = 0, dy = 0, k = 1) {
  poli(c, cam, pts.map(([x, y]): V3 => [dx + x * k, dy + y * k, z]));
}
/** Pone el contexto sobre un plano horizontal: 100 unidades locales = 1 del mundo. x local → +x; y local → hacia la cámara. */
function plano(c: Ctx, cam: Cam, x: number, y: number, z: number, g: number, fn: () => void) {
  const o = cam.p(x, y, z), a = cam.p(x + 1, y, z), b = cam.p(x, y - 1, z);
  // Demasiado cerca de la cámara la aproximación afín se dispara: mejor no dibujar que pintar una cuña negra.
  if (!o || !a || !b || o.zc < 1.6 || a.zc < 1.2 || b.zc < 1.2) return;
  c.save(); c.transform((a.x - o.x) / 100, (a.y - o.y) / 100, (b.x - o.x) / 100, (b.y - o.y) / 100, o.x, o.y);
  if (g) c.rotate(g);
  fn(); c.restore();
}
function caja(c: Ctx, cam: Cam, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, top: string, fr: string, lado: string) {
  const [cx, , cz] = cam.pos;
  if (cz > z1) { poli(c, cam, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]); c.fillStyle = top; c.fill(); }
  if (cx > x1) { poli(c, cam, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]); c.fillStyle = lado; c.fill(); }
  if (cx < x0) { poli(c, cam, [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]]); c.fillStyle = lado; c.fill(); }
  poli(c, cam, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]]); c.fillStyle = fr; c.fill();
}

// ---------- cámara ----------
const yBE = BE.y;
const V: Record<string, Vista> = {
  abre: { tx: 0, ty: -6.1, tz: .72, yaw: -.15, pitch: .13, dist: 4.7 },
  torre: { tx: 0, ty: -6.1, tz: 1.62, yaw: .13, pitch: .12, dist: 6.4 },
  golpe: { tx: 0, ty: -5.2, tz: .5, yaw: .05, pitch: .46, dist: 9.4 },
  arriba: { tx: 0, ty: -1.4, tz: 0, yaw: .1, pitch: .92, dist: 13.2 },
  trin0: { tx: .1, ty: -3.7, tz: .75, yaw: .03, pitch: .27, dist: 4.4 },
  trin1: { tx: .2, ty: 1.2, tz: .75, yaw: -.05, pitch: .32, dist: 4.4 },
  cenit: { tx: 0, ty: -1.3, tz: 0, yaw: -.07, pitch: 1.12, dist: 13.4 },
  bajo: { tx: -.7, ty: -3.4, tz: .5, yaw: .2, pitch: .42, dist: 8.2 },
  rayos: { tx: 0, ty: -1.75, tz: 0, yaw: .05, pitch: 1.12, dist: 10.6 },
  tecla: { tx: .02, ty: yBE + 1.95, tz: .6, yaw: -.015, pitch: 1.08, dist: 5.1 },
  teclaB: { tx: -.15, ty: yBE + 1.8, tz: .6, yaw: .09, pitch: 1.04, dist: 4.75 },
  teclaC: { tx: .1, ty: yBE + 1.65, tz: .6, yaw: -.07, pitch: 1.02, dist: 4.5 },
  cartaB: { tx: -.12, ty: yBE + 2.05, tz: .6, yaw: .07, pitch: 1.1, dist: 5.4 },
  tecla2: { tx: .05, ty: yBE + 1.55, tz: .6, yaw: .02, pitch: 1.0, dist: 4.5 },
  alto: { tx: -.2, ty: yBE + 1.7, tz: .6, yaw: 0, pitch: .96, dist: 7.6 },
  sobrevuelo: { tx: -1.4, ty: 8.6, tz: .6, yaw: -.05, pitch: .98, dist: 9.4 },
  mama: { tx: MAMA.x + .1, ty: MAMA.y - .1, tz: 1.75, yaw: -.1, pitch: .36, dist: 5 },
  fork: { tx: 0, ty: 10.1, tz: .4, yaw: .0, pitch: .8, dist: 11.8 },
  pant: { tx: .15, ty: 3.45, tz: .5, yaw: -.01, pitch: 1, dist: 6.6 },
  mesa: { tx: 0, ty: -.9, tz: 0, yaw: .0, pitch: 1.2, dist: 19 },
  dos: { tx: 2.28, ty: -7.35, tz: .6, yaw: .0, pitch: 1.08, dist: 3.9 },
  medio: { tx: .05, ty: -.3, tz: 0, yaw: .06, pitch: 1.06, dist: 11.4 },
  lee0: { tx: -.3, ty: fila(0) + .3, tz: .5, yaw: -.03, pitch: .96, dist: 5.6 },
  lee1: { tx: -.3, ty: fila(9) + .6, tz: .5, yaw: .03, pitch: .96, dist: 5.6 },
  vuelo: { tx: -.2, ty: 0, tz: .5, yaw: .0, pitch: .96, dist: 10 },
  fin: { tx: -.1, ty: 3.92, tz: .5, yaw: -.03, pitch: 1.0, dist: 5.9 },
  cierre: { tx: 0, ty: 2.9, tz: .2, yaw: .04, pitch: 1.04, dist: 8.2 },
};
const CAM = [
  { t: 0, v: V.abre },
  { t: .05, v: V.torre, dur: 2.9, curva: ease.inOutSine },
  { t: EV.SLAM - .06, v: V.golpe, dur: .34, curva: ease.outExpo },
  { t: EV.SLAM + .56, v: V.arriba, dur: 1.5 },
  { t: t0.imag - .1, v: V.trin0, dur: .62, curva: ease.outCubic },
  { t: t0.imag + .54, v: V.trin1, dur: 2.2, curva: ease.inOutSine },
  { t: t0.cuarenta - .12, v: V.cenit, dur: .95 },
  { t: t0.eso - .34, v: V.bajo, dur: .95 },
  { t: EV.VE - .55, v: V.rayos, dur: .85 },
  { t: t0.solo - .32, v: V.tecla, dur: .95 },
  { t: EV.NOMBRE, v: V.teclaB, dur: 3.2, curva: ease.inOutSine },
  { t: EV.ESCRIBE[0] - .2, v: V.teclaC, dur: 2.4, curva: ease.inOutSine },
  { t: t0.tuAg - .1, v: V.tecla2, dur: 1 },
  { t: EV.J1 - .02, v: V.alto, dur: .5 },
  { t: EV.KL1 + .06, v: V.sobrevuelo, dur: .5, curva: ease.inOutSine },
  { t: EV.KL1 + .46, v: V.mama, dur: .62, curva: ease.inOutCubic },
  { t: EV.REGRESA, v: V.tecla, dur: .5, curva: ease.outExpo },
  { t: EV.L2[0], v: V.cartaB, dur: 3.2, curva: ease.inOutSine },
  { t: EV.J2 + .1, v: V.alto, dur: .5 },
  { t: EV.KL2 + .1, v: V.fork, dur: .75 },
  { t: t0.pasa - .5, v: V.pant, dur: 1 },
  { t: t0.yMas - .1, v: V.mesa, dur: 1.2 },
  { t: EV.DOS - .3, v: V.dos, dur: .7 },
  { t: EV.RESET, v: V.medio, dur: .7 },
  { t: EV.REBOBINA, v: V.lee0, dur: .5 },
  { t: EV.LEE[0], v: V.lee1, dur: EV.LEE[1] - EV.LEE[0], curva: (x: number) => x },
  { t: EV.BORRA + .04, v: V.vuelo, dur: .5 },
  { t: EV.LAND - .46, v: V.fin, dur: .6, curva: ease.outCubic },
  { t: EV.LAND + .5, v: V.cierre, dur: 2.7, curva: ease.inOutSine },
];
function vista(t: number): Vista {
  const v = guionCamara(t, CAM);
  return { ...v, yaw: v.yaw + .013 * Math.sin(t * .37) + .007 * Math.sin(t * .91), pitch: v.pitch + .011 * Math.sin(t * .29), dist: v.dist * (1 + .012 * Math.sin(t * .53)), tx: v.tx + .05 * Math.sin(t * .41), ty: v.ty + .05 * Math.cos(t * .33) };
}
const GOLPES: [number, number][] = [[EV.SLAM, 42], ...EV.H.map((h, i) => [h, 9 + i * 3] as [number, number]), [EV.KL1, 14], [EV.KL2, 14], [EV.KL3, 12], [EV.KL4, 10], [EV.PEGA, 9], [EV.LAND, 20], [EV.TOSTADA, 6]];
function sacude(t: number): P2 {
  let x = 0, y = 0;
  for (const [g, a] of GOLPES) { const d = t - g; if (d < 0 || d > .9) continue; const k = a * Math.exp(-d * 8); x += k * Math.sin(d * 61); y += k * Math.cos(d * 73); }
  return [x, y];
}

// ---------- la mesa y las notas ----------
function pintaMesa(c: Ctx, cam: Cam, t: number) {
  const { x0, x1, y0, y1 } = MESA, g = .75;
  poli(c, cam, [[x0, y0, 0], [x1, y0, 0], [x1, y0, -g], [x0, y0, -g]]); c.fillStyle = "#D9D5CA"; c.fill();
  c.strokeStyle = TINTA; c.lineWidth = 3; c.stroke();
  if (cam.pos[0] > x1) { poli(c, cam, [[x1, y0, 0], [x1, y1, 0], [x1, y1, -g], [x1, y0, -g]]); c.fillStyle = "#CFCBBF"; c.fill(); c.stroke(); }
  if (cam.pos[0] < x0) { poli(c, cam, [[x0, y0, 0], [x0, y1, 0], [x0, y1, -g], [x0, y0, -g]]); c.fillStyle = "#CFCBBF"; c.fill(); c.stroke(); }
  poli(c, cam, [[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]]); c.fillStyle = "#FBFAF5"; c.fill();
  c.strokeStyle = "rgba(17,17,17,.6)"; c.lineWidth = 2.6; c.stroke();
  // Motas ancladas a la mesa: al mover la cámara se ve que es un plano de verdad.
  const r = azar(41); c.fillStyle = "rgba(17,17,17,.17)";
  for (let i = 0; i < 150; i++) { const p = cam.p(lerp(x0, x1, r()), lerp(y0, y1, r()), 0), z = 1 + r() * 1.7; if (p) c.fillRect(p.x, p.y, z * Math.min(p.s / 90, 2.6), z * Math.min(p.s / 90, 2.6)); }
}
function pasoNota(n: typeof NOTAS[number], t: number, B: Cuerpo) {
  const lado = Math.sign(n.x), borde = lado > 0 ? B.x1 : -B.x0;
  const tc = EV.CRECE[n.cae] + .08, a = t - tc;
  const x = Math.abs(n.x) < borde + n.w / 2 + .04 ? lado * (borde + n.w / 2 + .04) : n.x;
  // La ráfaga del golpe levanta las notas: papel que se asienta con retraso.
  const v = t - EV.SLAM - n.w * .04, sopla = v > 0 && v < 1.5 ? Math.sin(Math.PI * v / 1.5) : 0;
  const cae = a > 0 && t < EV.RESET + 2 ? a : 0;
  return { x: x + lado * (cae * 2.2), y: n.y + lado * .12 * sopla, z: .012 + sopla * 1.15 - 11 * cae * cae, g: n.g + sopla * lado * .5 * Math.sin(v * 8) + lado * cae * 2.3, alfa: 1 - smooth(prog(cae, .42, .62)) };
}
function pintaNotas(c: Ctx, cam: Cam, t: number, B: Cuerpo) {
  NOTAS.forEach((n, i) => {
    let q = pasoNota(n, t, B);
    // con menos herramientas vuelve a haber lugar: las notas caen otra vez a la mesa
    if (t > EV.RESET + .2) { const u = ease.outBack(prog(t, EV.RESET + .3 + i * .14, EV.RESET + .75 + i * .14), 1.2); q = { x: n.x, y: n.y, z: .012 + (1 - u) * 6, g: n.g + (1 - u) * 1.2, alfa: smooth(prog(t, EV.RESET + .3 + i * .14, EV.RESET + .45 + i * .14)) }; }
    if (q.alfa <= 0) return;
    if (q.z > .05) { const p = cam.p(q.x, q.y, 0); if (p) sombra(c, p.x, p.y, 110 * p.s / 100, .22 / (1 + q.z)); }
    c.save(); c.globalAlpha = q.alfa;
    const zq = Math.max(q.z, -6), cg = Math.cos(q.g), sg = Math.sin(q.g);
    const esq = (lx: number, ly: number, dz = 0): V3 => [q.x + (lx * cg - ly * sg), q.y - (lx * sg + ly * cg), zq + dz];
    const W2 = n.w / 2, H2 = n.h / 2;
    poli(c, cam, [esq(-W2 + .08, -H2 + .12, -.004), esq(W2 + .08, -H2 + .12, -.004), esq(W2 + .08, H2 + .12, -.004), esq(-W2 + .08, H2 + .12, -.004)]); c.fillStyle = "rgba(20,18,14,.13)"; c.fill();
    poli(c, cam, [esq(-W2, -H2), esq(W2, -H2), esq(W2, H2), esq(-W2, H2)]); c.fillStyle = BLANCO; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 2.6; c.stroke();
    plano(c, cam, q.x, q.y, zq, q.g, () => {
      const h = n.h * 100, w = n.w * 100;
      c.fillStyle = TINTA; c.fillRect(-52, -h / 2 - 12, 104, 26);
      n.tit.split("|").forEach((l, i, A) => texto(c, l, 0, -h / 2 + 96 + i * 66 - (A.length - 1) * 8, { fuente: serif(62, i === 0), color: TINTA }));
      c.fillStyle = "rgba(17,17,17,.55)";
      for (let i = 0; i < 4; i++) c.fillRect(-w / 2 + 34, 40 + i * 34, w - 68 - (i * 37) % 70, 6);
    });
    c.restore();
  });
}

// ---------- el remoto ----------
type Cuerpo = { x0: number; x1: number; y0: number; y1: number };
function cuerpoEn(t: number): Cuerpo {
  const C = EV.CRECE;
  const p = (k: number, d: number) => d * Math.min(1.04, resorte(t - C[k], 3.2, .55));
  let x1 = 2.6 + p(1, 1.14) + p(4, 1.14) + p(7, 1.14), x0 = -2.6 - p(2, 1.14) - p(5, 1.14) - p(8, 1.14), y0 = -6.2 - p(0, 1) - p(3, 1) - p(6, 1);
  const r = smooth(prog(t, EV.RESET, EV.RESET + .42));
  return { x0: lerp(x0, -2.6, r), x1: lerp(x1, 2.6, r), y0: lerp(y0, -6.2, r), y1: 6.2 };
}
function pintaCuerpo(c: Ctx, cam: Cam, B: Cuerpo, zb: number) {
  const pts = rrPuntos(B.x0, B.y0, B.x1, B.y1, .62, 6);
  // sombra de contacto hecha a capas: sin blur
  if (zb < 1) for (let i = 5; i >= 0; i--) { anillo3(c, cam, rrPuntos(B.x0 - i * .13 + .05, B.y0 - i * .13 - .1, B.x1 + i * .13 + .05, B.y1 + i * .13 - .1, .62 + i * .1, 4), .002); c.fillStyle = `rgba(30,26,18,${.055 * (1 - zb)})`; c.fill(); }
  const arriba = cam.pos[2] > zb + H, N = 7;
  for (let k = 0; k <= N; k++) {
    const z = zb + H * (arriba ? k / N : 1 - k / N);
    anillo3(c, cam, pts, z); c.fillStyle = k === N && !arriba ? "#050505" : "#0B0B0A"; c.fill();
  }
  if (!arriba) return;
  anillo3(c, cam, pts, zb + H);
  const a = cam.p(B.x0, B.y1, zb + H), b = cam.p(B.x1, B.y0, zb + H);
  if (a && b) { const g = c.createLinearGradient(a.x, a.y, b.x, b.y); g.addColorStop(0, "#3A3935"); g.addColorStop(.42, "#1F1F1D"); g.addColorStop(.7, "#262523"); g.addColorStop(1, "#141413"); c.fillStyle = g; c.fill(); }
  c.strokeStyle = "rgba(255,255,255,.2)"; c.lineWidth = 2.4; c.stroke();
}
const CAPA = rrPuntos(-.49, -.4, .49, .4, .17, 3);
function rayoEn(y: number, t: number) {
  const [a, b] = EV.RAYOS; if (t < a || t > b + .5) return 0;
  const yb = lerp(6.8, -7.2, ease.inOutSine(prog(t, a, b))), d = Math.abs(y - yb);
  return 1 - smooth(prog(d, 1.1, 2.1));
}
function rendija(c: Ctx, cam: Cam, x: number, y: number, k: number, a: number) {
  if (a <= 0) return;
  c.save(); c.globalAlpha = a;
  anillo3(c, cam, CAPA, H + .004, x, y, k); c.fillStyle = "#0A0908"; c.fill();
  c.restore();
}
function glifo(c: Ctx, n: number, col: string) {
  c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 4.4; c.lineCap = "round"; c.lineJoin = "round";
  const lin = (...p: number[]) => { c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.stroke(); };
  switch (n % 8) {
    case 0: c.strokeRect(-30, -20, 60, 40); lin(-30, -20, 0, 6, 30, -20); break;                                    // sobre
    case 1: c.beginPath(); c.arc(-6, -6, 18, 0, 7); c.stroke(); lin(8, 8, 26, 26); break;                           // lupa
    case 2: lin(-28, 22, 28, 22); lin(-24, 22, -24, -2, 24, -2, 24, 22); lin(0, -2, 0, -18); break;                 // pastel
    case 3: c.strokeRect(-26, -24, 52, 48); lin(-26, -10, 26, -10); lin(-12, 4, -2, 4); lin(6, 4, 14, 4); break;     // calendario
    case 4: lin(-22, -22, -8, -22, -4, -8, -12, -2, 2, 12, 8, 4, 22, 8, 22, 22, 12, 24, -6, 16, -22, -6, -22, -22); break; // teléfono
    case 5: lin(-18, -14, 18, -14); lin(-14, -14, -10, 24, 10, 24, 14, -14); lin(-6, -22, 6, -22); break;            // basura
    case 6: c.strokeRect(-30, -18, 60, 38); lin(-30, -6, 30, -6); lin(-20, 10, -8, 10); break;                       // tarjeta
    default: c.beginPath(); c.arc(-10, 4, 15, 0, 7); c.stroke(); lin(2, -6, 28, -24); lin(20, -18, 28, -10); break;  // llave
  }
}
function pegadaEn(k: Tecla) { return k.id < 0 ? 99 : lerp(EV.ETIQ[0], EV.ETIQ[1] - .1, (k.fil * 4 + (k.fil % 2 ? 3 - k.col : k.col)) / 39); }
function apagada(k: Tecla, t: number) {
  return smooth(prog(t, EV.SOPLA + k.fil * .035, EV.SOPLA + k.fil * .035 + .3)) * (1 - smooth(prog(t, EV.REBOBINA + k.fil * .04, EV.REBOBINA + k.fil * .04 + .2)));
}
function filaLeida(t: number) {
  if (t >= EV.BORRA + .2 || t < EV.LEE[0]) return -1;
  return prog(t, EV.LEE[0], EV.LEE[1]) * 10 - .5;
}
function etiquetaTecla(c: Ctx, cam: Cam, k: Tecla, t: number, z: number) {
  const ti = pegadaEn(k); if (t < ti) return;
  const ap = ease.outBack(prog(t, ti, ti + .12), 2.2), ag = apagada(k, t), re = pulso(t - (EV.REBOBINA + k.fil * .04), .05, .25);
  const lee = filaLeida(t), hecho = lee >= k.fil;
  c.save(); c.globalAlpha = 1 - ag * .8;
  plano(c, cam, k.x, k.y, z + .006, 0, () => {
    c.scale(ap * (1 + re * .12), ap * (1 + re * .12));
    c.fillStyle = hecho ? "#F1E2D6" : BLANCO; c.strokeStyle = "rgba(17,17,17,.75)"; c.lineWidth = 2.2;
    c.beginPath(); c.roundRect(-45, -33, 90, 66, 7); c.fill(); c.stroke();
    // de lejos, y al cerrar, las etiquetas se vuelven garabato: la única palabra que se lee al final es «cada vez»
    const lt = (cam.pos[2] - z < 8.5 ? 1 : 0) * (1 - smooth(prog(t, EV.LAND + .5, EV.LAND + 1.5)));
    if (lt > 0) {
      const L = NOMBRES[k.id].split("|");
      L.forEach((l, i) => texto(c, l, 0, (L.length === 1 ? 7 : -5 + i * 22), { fuente: serif(l.length > 9 ? 18 : 21, i === 1), color: TINTA, alfa: lt }));
      if (hecho) { c.fillStyle = ACENTO; c.fillRect(-34, 22, 68, 3.4); }
    }
    if (lt < 1) { c.save(); c.globalAlpha *= 1 - lt; c.fillStyle = "rgba(17,17,17,.7)"; c.fillRect(-30, -12, 60, 6); c.fillRect(-30, 6, 42, 6); c.restore(); }
  });
  c.restore();
}
function hundida(k: Tecla, t: number) {
  let h = 0;
  if (k.id >= 0) { const d = t - (EV.ONDA + k.fil * .068 + k.col * .024); if (d > 0 && d < .4) h = Math.max(h, pulso(d, .05, .14) * .9); }
  if (k.x === BE.x && k.y === BE.y) for (const g of [EV.KL1, EV.KL2]) h = Math.max(h, pulso(t - g, .04, .34));
  if (k.x === BR.x && k.y === BR.y) for (const g of [EV.KL3, EV.KL4]) h = Math.max(h, pulso(t - g, .04, .34));
  for (let i = 0; i < EV.PUL.length; i++) if (k === PRESION[i]) h = Math.max(h, pulso(t - EV.PUL[i], .06, .18));
  return h;
}
const PRESION = [[2, 3], [5, 1], [7, 2]].map(([f, cc]) => TECLAS.find((q) => q.fil === f && q.col === cc)!);
function pintaTecla(c: Ctx, cam: Cam, k: Tecla, t: number) {
  const fin = EV.RESET + .3, sale = k.base ? 0 : smooth(prog(t, EV.RESET - .02, fin));
  const ap = k.base ? 1 : ease.outBack(prog(t, k.ini, k.ini + .16), 2) * (1 - sale);
  if (ap <= .01) return;
  const h = hundida(k, t), z1 = H + ALTO * (1 - h * .8) * ap, rx = k.base ? rayoEn(k.y, t) : 0;
  rendija(c, cam, k.x, k.y, 1.06 * ap, Math.min(1, ap * 1.5));
  if (rx > 0) {
    c.save(); c.globalAlpha = rx;
    plano(c, cam, k.x, k.y, H + .01, 0, () => { glifo(c, k.id * 3 + k.fil, k.id % 5 === 0 ? ROJO_N : LUZ); });
    c.restore();
  }
  c.save(); c.globalAlpha = 1 - rx * .96;
  anillo3(c, cam, CAPA, H + (z1 - H) * .4, k.x, k.y, ap); c.fillStyle = "#5F5D55"; c.fill();
  anillo3(c, cam, CAPA, z1, k.x, k.y, ap);
  const a = cam.p(k.x - .49, k.y + .4, z1), b = cam.p(k.x + .49, k.y - .4, z1);
  if (a && b) {
    const g = c.createLinearGradient(a.x, a.y, b.x, b.y);
    const rojo = k.x === BE.x && k.y === BE.y ? clamp(pulso(t - EV.KL1, .04, .6) + pulso(t - EV.KL2, .04, .6)) : 0;
    if (rojo > .05) { g.addColorStop(0, ROJO_N); g.addColorStop(1, ACENTO); } else { g.addColorStop(0, "#F4F1E9"); g.addColorStop(.55, "#DEDAD0"); g.addColorStop(1, "#C2BEB2"); }
    c.fillStyle = g; c.fill();
  }
  c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 1.6; c.stroke();
  if (k.id >= 0) etiquetaTecla(c, cam, k, t, z1);
  c.restore();
}
function pintaCabeza(c: Ctx, cam: Cam, t: number, zb: number) {
  const z = zb + H + .004;
  // rendija por donde sale el papel
  anillo3(c, cam, rrPuntos(-1.7, 5.66, 1.7, 5.86, .08, 2), z); c.fillStyle = "#020202"; c.fill(); c.strokeStyle = "rgba(255,255,255,.3)"; c.lineWidth = 2; c.stroke();
  // pantalla
  const pant = rrPuntos(-1.95, 4.36, 1.95, 5.42, .13, 3);
  anillo3(c, cam, pant, z); c.fillStyle = "#050403"; c.fill(); c.strokeStyle = "rgba(255,255,255,.22)"; c.lineWidth = 2.4; c.stroke();
  const p = cam.p(2.2, 5.05, z); if (p) { const lz = rojoLed(t); c.fillStyle = lz > .5 ? ACENTO : "#3a1a14"; c.beginPath(); c.arc(p.x, p.y, 9 * p.s / 110, 0, 7); c.fill(); }
}
function rojoLed(t: number) { return t > EV.ROJO && t < EV.TOSTADA ? (Math.sin(t * 8.4) > -.25 ? 1 : .12) : .2; }
function textoPantalla(c: Ctx, cam: Cam, t: number, noche = false) {
  const z = H + .01, ap = rojoLed(t);
  if (t >= EV.KL3 + .08 && t < EV.ROJO) {
    const r = azar(Math.floor(t * 24));
    plano(c, cam, 0, 4.89, z, 0, () => { c.fillStyle = "rgba(233,137,108,.55)"; for (let i = 0; i < 16; i++) if (r() > .5) c.fillRect(-170 + i * 22, -30 + r() * 44, 16, 12); });
  }
  if (t >= EV.ROJO && t < EV.TOSTADA + .5) {
    const P = cam.p(0, 4.89, z);
    if (P) { const G = c.createRadialGradient(P.x, P.y, 10, P.x, P.y, 420 * P.s / 170), f = .55 * ap * (1 - prog(t, EV.TOSTADA, EV.TOSTADA + .4)); G.addColorStop(0, `rgba(192,68,42,${f})`); G.addColorStop(1, "rgba(192,68,42,0)"); c.fillStyle = G; c.fillRect(P.x - 900, P.y - 900, 1800, 1800); }
    plano(c, cam, 0, 4.89, z, 0, () => texto(c, "error 500", 0, 21, { fuente: mono(60), color: ap > .5 ? "#FF6A4A" : "#6e2a1c" , alfa: 1 - prog(t, EV.TOSTADA, EV.TOSTADA + .4) }));
  }
  if (t >= EV.KL4 + .02 && t < EV.CRECE[3]) plano(c, cam, 0, 4.89, z, 0, () => texto(c, "reservado", 0, 20, { fuente: mono(56), color: TIBIA, alfa: smooth(prog(t, EV.KL4 + .02, EV.KL4 + .1)) * (1 - smooth(prog(t, EV.CRECE[3] - .3, EV.CRECE[3]))) }));
}
function pintaRemoto(c: Ctx, cam: Cam, t: number, B: Cuerpo, zb: number) {
  pintaCuerpo(c, cam, B, zb);
  if (cam.pos[2] < zb + H) return;
  pintaCabeza(c, cam, t, zb);
  textoPantalla(c, cam, t);
  if (t >= EV.SLAM + .02) {
    // barrido de rayos: lo que hay de verdad debajo de cada botón; la bola no lo ve
    for (const k of TECLAS) pintaTecla(c, cam, k, t);
    const [a, b] = EV.RAYOS;
    if (t > a && t < b) {
      const yb = lerp(6.8, -7.2, ease.inOutSine(prog(t, a, b))), L = cam.p(-2.6, yb, H + .08), R = cam.p(2.6, yb, H + .08);
      if (L && R) { c.strokeStyle = ACENTO; c.lineWidth = 6; c.beginPath(); c.moveTo(L.x - 40, L.y); c.lineTo(R.x + 40, R.y); c.stroke(); c.strokeStyle = "rgba(255,190,160,.8)"; c.lineWidth = 2; c.stroke(); }
    }
  }
}

// ---------- papeles sobre el remoto ----------
function tira(c: Ctx, cam: Cam, x: number, y: number, w: number, h: number, g: number, z: number, fn: () => void, escala = 1, alfa = 1) {
  if (alfa <= 0) return;
  c.save(); c.globalAlpha = alfa;
  plano(c, cam, x, y, z, g, () => {
    c.scale(escala, escala);
    c.fillStyle = "rgba(0,0,0,.35)"; c.fillRect(-w * 50 + 7, -h * 50 + 11, w * 100, h * 100);
    c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 2.6; c.beginPath(); c.rect(-w * 50, -h * 50, w * 100, h * 100); c.fill(); c.stroke();
    fn();
  });
  c.restore();
}
function escribe(c: Ctx, tx: string, x: number, y: number, fu: string, col: string, u: number, lapiz = true) {
  if (u <= 0) return;
  c.save(); c.font = fu; const w = c.measureText(tx).width;
  c.beginPath(); c.rect(x - 10, y - 90, (w + 20) * u, 130); c.clip();
  texto(c, tx, x, y, { fuente: fu, color: col, alin: "left" }); c.restore();
  if (lapiz && u < 1) pinchaLapiz(c, x + w * u, y);
}
function pinchaLapiz(c: Ctx, x: number, y: number) {
  c.save(); c.translate(x, y - 4 + Math.sin(x * .3) * 5); c.rotate(.62);
  c.fillStyle = "#222"; c.beginPath(); c.moveTo(0, 0); c.lineTo(-10, -32); c.lineTo(10, -32); c.closePath(); c.fill();
  c.fillStyle = TIBIA; c.fillRect(-13, -56, 26, 24); c.fillStyle = TINTA; c.fillRect(-14, -220, 28, 166); c.fillStyle = "#8E8B84"; c.fillRect(-14, -240, 28, 20); c.fillStyle = ACENTO; c.fillRect(-14, -270, 28, 30);
  c.restore();
}
function pintaTag(c: Ctx, cam: Cam, t: number) {
  if (t < EV.TAG || t >= EV.PEGA + .3) return;
  const va = prog(t, EV.PEGA - .2, EV.PEGA + .3);
  // Primero la ficha con los dos campos; luego se encoge a una sola palabra: enviar.
  const ap = ease.outBack(prog(t, EV.TAG, EV.TAG + .22), 2), en = smooth(prog(t, EV.ENCOGE, EV.ENCOGE + .36));
  const w = lerp(3.3, 1.72, en), h = lerp(1.7, .84, en), x = lerp(0, BE.x + .55, en), y = lerp(BE.y + 2.2, BE.y + 1.8, en);
  tira(c, cam, x + va * 1.8, y - va * .6, w, h, -.015 - va * 1.4, TOPE + .03 + va * 2.4, () => {
    const a = 1 - smooth(prog(t, EV.ENCOGE - .12, EV.ENCOGE + .1));
    if (a > 0) {
      c.save(); c.globalAlpha *= a;
      texto(c, "nombre", -135, -24, { fuente: serif(60, true), color: TINTA, alin: "left", alfa: smooth(prog(t, EV.NOMBRE - .1, EV.NOMBRE + .1)) });
      texto(c, "descripción", -135, 50, { fuente: serif(50), color: ACENTO, alin: "left", alfa: smooth(prog(t, EV.DESC - .1, EV.DESC + .1)) });
      c.restore();
    }
    escribe(c, "enviar", -72, 19, serif(62, true), TINTA, prog(t, EV.ESCRIBE[0] - .06, lerp(EV.ESCRIBE[0], EV.ESCRIBE[1], .6)));
  }, ap, 1 - smooth(prog(va, .4, 1)));
}
function pintaCarta(c: Ctx, cam: Cam, t: number) {
  if (t < EV.PEGA || t > pegadaEn(TECLAS.find((k) => k.id === 25)!) + .1) return;
  const a = t - EV.PEGA, sl = a < .12 ? lerp(1.5, 1, ease.outCubic(a / .12)) : 1 + .02 * Math.exp(-(a - .12) * 9) * Math.cos((a - .12) * 30);
  const r = ease.inOutCubic(prog(t, t0.pasa - .62, t0.pasa - .2));
  const g1 = ease.outCubic(prog(t, EV.L3[0] - .2, EV.L3[0] + .1)), g2 = ease.outCubic(prog(t, EV.L4[0] - .2, EV.L4[0] + .08));
  const alto = lerp(lerp(1.86, 2.68, g1), 3.3, g2), w = CARD.x1 - CARD.x0;
  const yc = CARD.y1 - alto / 2;
  tira(c, cam, lerp(0, BE.x, r), lerp(yc, BE.y, r), lerp(w, .9, r), lerp(alto, .66, r), -.012 * (1 - r), TOPE + .02, () => {
    const L = -w * 50 + 22, Y = -alto * 50;
    const a1 = 1 - r;
    if (r > .9) { const L2 = ["enviar", "invitación"]; L2.forEach((l, i) => texto(c, l, 0, -5 + i * 22, { fuente: serif(l.length > 9 ? 18 : 21, i === 1), color: TINTA, alfa: smooth(prog(r, .9, 1)) })); }
    if (a1 < .1) return;
    c.save(); c.globalAlpha *= a1;
    escribe(c, "enviar invitación", L, Y + 76, serif(50, true), TINTA, prog(t, EV.L1[0] - .06, lerp(EV.L1[0], EV.L1[1], .62)));
    escribe(c, "a un contacto", L, Y + 144, serif(50, true), TINTA, prog(t, EV.L2[0] - .06, lerp(EV.L2[0], EV.L2[1], .62)));
    if (g1 > .1) { c.fillStyle = "rgba(17,17,17,.5)"; c.fillRect(L, Y + 176, 296 * prog(t, EV.L3[0] - .2, EV.L3[0]), 3); }
    escribe(c, "úsala para invitados", L, Y + 232, serif(36), TINTA, prog(t, EV.L3[0] - .02, lerp(EV.L3[0], EV.L3[1], .66)));
    escribe(c, "nunca con la festejada", L, Y + 294, serif(36, true), ACENTO, prog(t, EV.L4[0] - .12, lerp(EV.L4[0], EV.L4[1], .7)));
    c.restore();
  }, sl);
}
function pintaFijas(c: Ctx, cam: Cam, t: number) {
  if (t < t0.pasa - .4 || t > EV.CRECE[0] + .2) return;
  const a = smooth(prog(t, t0.pasa - .4, t0.pasa)) * (1 - smooth(prog(t, EV.CRECE[0] - .1, EV.CRECE[0] + .2)));
  tira(c, cam, BR.x - .45, fila(0) + .05, 1.72, .7, .01, TOPE + .02, () => texto(c, "reservar", 0, 14, { fuente: serif(46, true), color: TINTA }), 1, a);
  // el día: la mano lo voltea cuando la nota dice domingo
  const v = prog(t, EV.VOLTEA, EV.VOLTEA + .3), sy = Math.abs(Math.cos(v * Math.PI)), dom = v > .5;
  c.save(); c.globalAlpha = a;
  plano(c, cam, DIA.x, DIA.y, TOPE + .02, 0, () => {
    c.scale(1, Math.max(sy, .04));
    c.fillStyle = dom ? ACENTO : BLANCO; c.strokeStyle = TINTA; c.lineWidth = 2.4; c.beginPath(); c.roundRect(-68, -33, 136, 66, 6); c.fill(); c.stroke();
    texto(c, dom ? "domingo" : "sábado", 0, 12, { fuente: serif(40, true), color: dom ? BLANCO : TINTA });
  });
  c.restore();
}

function pintaDos(c: Ctx, cam: Cam, t: number) {
  if (t < EV.DOS - .3 || t > EV.RESET + .05) return;
  const sale = 1 - smooth(prog(t, EV.RESET - .1, EV.RESET + .05));
  [[1.71, "enviar"], [2.85, "mandar"]].forEach(([x, v], i) => {
    const a = t - (EV.DOS - .26 + i * .2), sl = a < 0 ? 0 : a < .12 ? lerp(1.5, 1, ease.outCubic(a / .12)) : 1 + .02 * Math.exp(-(a - .12) * 9) * Math.cos((a - .12) * 30);
    if (sl <= 0) return;
    tira(c, cam, x as number, fila(10) + .02, 1.08, .8, i ? .02 : -.02, TOPE + .04, () => {
      texto(c, v as string, 0, -6, { fuente: serif(27, true), color: TINTA });
      texto(c, "invitación", 0, 24, { fuente: serif(23), color: TINTA });
    }, sl, sale);
  });
}

// ---------- libros del arranque ----------
const LIBROS = [{ top: "#2A2A28", fr: "#141413", lado: "#EDE9DF", lin: PAPEL, s: -1 }, { top: "#D15A40", fr: ACENTO, lado: "#EDE9DF", lin: "#F6D3C7", s: 1 }, { top: "#FBFAF5", fr: "#ECE8DE", lado: "#E0DCD0", lin: TINTA, s: -1 }, { top: "#8F8D85", fr: "#6F6D66", lado: "#EDE9DF", lin: BLANCO, s: 1 }];
function pintaLibros(c: Ctx, cam: Cam, t: number) {
  if (t >= EV.SLAM) return;
  LIBROS.forEach((b, i) => {
    const h = EV.H[i], a0 = i === 0 ? -.2 : h - .19, u = ease.outCubic(prog(t, a0, h - .03));
    if (t < a0) return;
    const x = b.s * (1 - u) * 8, z = i * LIB, ax = i % 2 ? .06 : -.05, x0 = x - LIBX + ax, x1 = x + LIBX + ax, y0 = TORRE_Y - LIBY, y1 = TORRE_Y + LIBY;
    caja(c, cam, x0, x1, y0, y1, z, z + LIB, b.top, b.fr, b.lado);
    const A = cam.p(x0 + .22, y0, z + LIB * .68), B = cam.p(x1 - .3, y0, z + LIB * .68), C = cam.p(x0 + .22, y0, z + LIB * .34);
    if (A && B && C) { c.strokeStyle = b.lin; c.lineWidth = 7; c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke(); c.lineWidth = 4; c.beginPath(); c.moveTo(C.x, C.y); c.lineTo(lerp(C.x, B.x, .5), C.y + (B.y - A.y) * .5); c.stroke(); }
  });
}
function librosVuelan(c: Ctx, t: number) {
  const a = t - EV.SLAM; if (a < 0 || a > 1.4) return;
  LIBROS.forEach((b, i) => {
    const sx = i % 2 ? 1 : -1, x = 540 + sx * (150 + 1100 * a + i * 30), y = 1130 + i * 70 - 1500 * a + 2300 * a * a;
    c.save(); c.translate(x, y); c.rotate(sx * a * (6 + i)); c.fillStyle = b.fr; c.strokeStyle = TINTA; c.lineWidth = 5;
    c.beginPath(); c.rect(-150, -46, 300, 92); c.fill(); c.stroke(); c.fillStyle = b.lin; c.fillRect(-120, -14, 200, 8); c.restore();
  });
}
function polvoGolpe(c: Ctx, cam: Cam, t: number) {
  const a = t - EV.SLAM; if (a < 0 || a > 1.3) return;
  const r = azar(12), f = ease.outCubic(a / .9);
  for (let i = 0; i < 74; i++) {
    const lado = r(), xb = lado < .5 ? (r() - .5) * 5.2 : (lado < .75 ? -2.7 : 2.7), yb = lado < .5 ? -6.3 : -6.2 + r() * 6, dx = (lado < .5 ? (r() - .5) * 2 : (lado < .75 ? -1 : 1) * r()) * 3, dy = lado < .5 ? -r() * 3.4 : (r() - .5) * 1;
    const p = cam.p(xb + dx * f, yb + dy * f, .1 + r() * 2.4 * Math.sin(Math.min(a * 3.4, 3.14))); if (!p) continue;
    c.globalAlpha = (1 - smooth(prog(a, .5, 1.25))) * (.3 + r() * .55); c.fillStyle = i % 5 === 0 ? ACENTO : TINTA;
    const z = (2 + r() * 8) * p.s / 90; c.fillRect(p.x, p.y, z, z * .7);
  }
  c.globalAlpha = 1;
}

/** Birrete: (x, y) es el centro de la base. r es el radio de la bola que lo lleva. */
function birrete(c: Ctx, x: number, y: number, r: number, giro: number, k = 1) {
  c.save(); c.translate(x, y); c.rotate(giro); c.scale(r / 100, r / 100);
  c.lineJoin = "round";
  c.fillStyle = "#1a1a19"; c.strokeStyle = PAPEL; c.lineWidth = 7;
  c.beginPath(); c.moveTo(-66, -28); c.quadraticCurveTo(0, 26, 66, -28); c.lineTo(66, -66); c.lineTo(-66, -66); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = "#101010"; c.beginPath(); c.moveTo(-130, -74); c.lineTo(0, -128 * k); c.lineTo(130, -74); c.lineTo(0, -22); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = "#3A3A38"; c.beginPath(); c.moveTo(-96, -74); c.lineTo(0, -114 * k); c.lineTo(40, -98); c.lineTo(-58, -58); c.closePath(); c.fill();
  c.strokeStyle = ACENTO; c.lineWidth = 7; c.lineCap = "round"; c.beginPath(); c.moveTo(0, -75); c.lineTo(112, -66); c.lineTo(116, -10); c.stroke();
  c.fillStyle = ACENTO; c.beginPath(); c.arc(0, -75, 10, 0, 7); c.fill(); c.fillRect(106, -12, 20, 34);
  c.restore();
}

// ---------- la bola ----------
type Salto = [number, number, number, number, number];
const SALE = EV.SALE;
const RUTA: Salto[] = [
  [SALE, SALE + .36, -1.2, -7.6, 1.1],
  [t0.dando - .28, t0.dando + .02, -1.2, -7.6, .34],
  [EV.SUBE, EV.SUBE + .42, CX[1], fila(9), .9],
  [EV.PIES[0], EV.PIES[0] + .36, CX[2], fila(8), .34], [EV.PIES[1], EV.PIES[1] + .36, CX[0], fila(7), .34], [EV.PIES[2], EV.PIES[2] + .36, BE.x, BE.y, .34],
  [EV.J1, EV.KL1, BE.x, BE.y, 2.2],
  [EV.J2, EV.KL2, BE.x, BE.y, 2.2],
  [EV.TROTE[0], EV.TROTE[0] + .3, CX[2], fila(5), .5], [EV.TROTE[1], EV.TROTE[1] + .3, CX[2], fila(4), .5], [EV.TROTE[2], EV.TROTE[2] + .3, CX[2], fila(3), .5], [EV.TROTE[3], EV.TROTE[3] + .3, BR.x, BR.y, .5],
  [EV.J3, EV.KL3, BR.x, BR.y, 1.3],
  [EV.KL4 - .4, EV.KL4, BR.x, BR.y, 1],
  [EV.CRECE[3] - .1, EV.CRECE[3] + .3, 2.85, fila(2), .8], [EV.CRECE[4] + .02, EV.CRECE[4] + .36, 3.99, fila(2), .8], [EV.CRECE[5] + .14, EV.CRECE[5] + .48, 5.13, fila(2), .8],
  [EV.DOS - .42, EV.DOS + .14, 2.28, fila(12), 2.2],
  [EV.RESET - .02, EV.RESET + .56, CX[1], fila(0), 3],
  ...Array.from({ length: 9 }, (_, i): Salto => { const d = (EV.LEE[1] - EV.LEE[0]) / 9; return [EV.LEE[0] + i * d, EV.LEE[0] + (i + .9) * d, CX[1], fila(i + 1), .34]; }),
  [EV.BORRA + .02, EV.LAND, CX[1], fila(1), 4.4],
];
const sobreMando = (x: number, y: number, B: Cuerpo) => x > B.x0 - .05 && x < B.x1 + .05 && y > B.y0 - .05 && y < B.y1 + .05;
function posBola(t: number) {
  let x = 0, y = -6.66, fin = -9, z0 = 0, B = cuerpoEn(t);
  for (let i = 0; i < RUTA.length; i++) {
    const [a, b, X, Y, h] = RUTA[i];
    if (t < a) { const fa = a - t, car = fa < .1 && b - a > .3 ? (1 - fa / .1) * .16 : 0; return { x, y, z: sobreMando(x, y, B) ? TOPE : 0, aire: false, edad: t - fin, carga: car }; }
    const z1 = sobreMando(X, Y, B) ? TOPE : 0;
    if (t < b) { const u = (t - a) / (b - a); return { x: lerp(x, X, u), y: lerp(y, Y, u), z: lerp(z0, z1, u) + 4 * h * u * (1 - u), aire: true, edad: 9, carga: 0, u }; }
    x = X; y = Y; z0 = z1; fin = b;
  }
  return { x, y, z: sobreMando(x, y, B) ? TOPE : 0, aire: false, edad: t - fin, carga: 0 };
}
function bolaTorre(t: number) {
  const H_ = EV.H, n = H_.filter((h) => t >= h).length;
  if (n < 4) { const a = n ? H_[n - 1] : -.07, b = H_[n], u = prog(t, a, b); return { z: lerp(n * LIB, (n + 1) * LIB, u) + 5.2 * u * (1 - u), edad: 9, n }; }
  return { z: 4 * LIB, edad: t - H_[3], n };
}
function dibujaBola(c: Ctx, x: number, y: number, R: number, m1: P2, m2: P2, ab1: number, ab2: number, sqY: number, sqX: number, t: number) {
  const g = R / 90, M1: P2 = [x + m1[0] * R, y + m1[1] * R], M2: P2 = [x + m2[0] * R, y + m2[1] * R];
  c.save(); c.translate(x, y + R); c.scale(sqX, sqY); c.translate(-x, -(y + R));
  // borde de papel recortado: sobre el remoto negro la bola se seguiría viendo
  brazo(c, x - 54 * g, y - 50 * g, M1[0], M1[1], 90 * g, ab1, PAPEL, 1, g * 1.38);
  brazo(c, x + 60 * g, y - 30 * g, M2[0], M2[1], -100 * g, ab2, PAPEL, 1, g * 1.38);
  c.fillStyle = PAPEL; c.beginPath(); c.arc(x, y, R + 6 * Math.max(g, .55), 0, 7); c.fill();
  agente(c, x, y, R, M1, M2, { abre1: ab1, abre2: ab2 });
  c.restore();
}
function pintaBola(c: Ctx, cam: Cam, t: number) {
  const b = posBola(t), p = cam.p(b.x, b.y, b.z + RB); if (!p) return;
  const f = cam.p(b.x, b.y, sobreMando(b.x, b.y, cuerpoEn(t)) ? TOPE : 0), R = RB * p.s;
  if (f) sombra(c, f.x, f.y, R * 1.45, .36 / (1 + (b.z - TOPE > 0 ? b.z : 0) * .7));
  const sq = !b.aire ? .24 * Math.exp(-b.edad * 10) * Math.cos(b.edad * 26) : 0;
  const q = 1 - sq - b.carga + (b.aire ? .06 : 0), o = 1 + sq * .8 + b.carga * .6 - (b.aire ? .03 : 0);
  let m1: P2 = [-1.5 + .08 * Math.sin(t * 2.3), .28 + .12 * Math.sin(t * 3.1)], m2: P2 = [1.5 - .08 * Math.sin(t * 2.1), .28 + .12 * Math.cos(t * 2.7)], a1 = .6, a2 = .6;
  if (b.aire) { m1 = [-1.35, -1.05]; m2 = [1.35, -1.05]; a1 = a2 = .85; }
  const en = (a: number, c2: number) => t >= a && t < c2;
  if (en(t0.eso, EV.SUBE) && !b.aire) { m1 = [-1.5, -.9 + .1 * Math.sin(t * 5)]; m2 = [1.5, -.9 - .1 * Math.sin(t * 5)]; a1 = a2 = .95; }                                         // ¿esto me das?
  if (en(EV.VE - .2, EV.TAG) && !b.aire) { m1 = [-1.75, -.2 + .55 * Math.sin(t * 7)]; m2 = [1.75, -.2 + .55 * Math.cos(t * 7)]; a1 = a2 = .95; }                                     // a tientas
  if (en(EV.TAG, EV.QUE - .1)) { const v = Math.sin(t * 3.4) * .1; m1 = [-1.05 + v, -1.5]; m2 = [1.05 + v, -1.56]; a1 = a2 = .55; }                                                   // lee la ficha
  if (en(EV.QUE - .1, EV.ORBF)) { const v = Math.sin(t * 11) * .14; m1 = [-1.16, -1.1 + v]; m2 = [1.16, -1.1 - v]; a1 = a2 = .5; }                                                   // se rasca la cabeza
  if (en(EV.ORBF, EV.J1 - .1)) {
    const dd = EV.DEDOS, n = Math.max(dd.filter((d) => t >= d).length - 1, 0), lista: P2[] = [[CX[0], fila(6)], [CX[2], fila(6)], [CX[0], fila(7)], [CX[2], fila(7)], [CX[1], fila(7)]];
    const pc = cam.p(lista[n][0], lista[n][1], TOPE + .2);
    if (pc) { m2 = [(pc.x - p.x) / R, (pc.y - p.y) / R - .4 * Math.exp(-(t - dd[n]) * 10)]; a2 = .08; }
    m1 = [-1.3, .4]; a1 = .4;
  }
  if (en(EV.PEGA, EV.J2 - .1)) { const v = Math.sin(t * 5) * .1; m1 = [-1.45, -.7 + v]; m2 = [1.45, -.75 - v]; a1 = a2 = .8; }
  if (en(EV.TROTE[3] + .4, EV.J3)) { const v = Math.sin(t * 3) * .08; m1 = [-1.45, -.05 + v]; m2 = [1.45, -.05 - v]; }
  if (en(EV.KL3 + .15, EV.NEGRO)) { const v = Math.sin(t * 9) * .1; m1 = [-1.2, -1.2 + v]; m2 = [1.2, -1.2 - v]; a1 = a2 = .95; }
  if (en(EV.TOSTADA - .1, EV.VOLTEA)) { const v = Math.sin(t * 3.6) * .1; m1 = [-.85 + v, -1.4]; m2 = [.8 + v, -1.45]; a1 = a2 = .7; }
  if (en(EV.VOLTEA - .06, EV.VOLTEA + .34)) { const pc = cam.p(DIA.x, DIA.y, TOPE + .1); if (pc) { m2 = [(pc.x - p.x) / R, (pc.y - p.y) / R]; a2 = .3; } }
  if (en(EV.CRECE[5] + .5, EV.DOS - .42)) { const ad = smooth(prog(t, EV.CRECE[5] + .5, EV.CRECE[7])); m2 = [1.5 + ad * 3.4, .4 + Math.sin(t * 20) * .1]; a2 = 1; }              // se estira por la nota que se va
  if (en(EV.DOS + .14, EV.RESET)) {
    // Dos parecidas: las manos van de una a otra cada vez más rápido y se quedan temblando en medio.
    const u = prog(t, EV.DOS + .14, EV.PARA), fr = lerp(3.4, 11, u * u), lado = Math.sin(t * fr * 2.6), trem = t > EV.PARA - .25 ? 1 : 0, vb = Math.sin(t * 62) * .05;
    const l = trem ? 0 : lado;
    m1 = [lerp(-1.05, -1.0, Math.max(-l, 0)) + vb, lerp(-.75, -1.45, Math.max(-l, 0))]; m2 = [lerp(1.05, 1.0, Math.max(l, 0)) - vb, lerp(-.75, -1.45, Math.max(l, 0))];
    a1 = a2 = .22;
  }
  if (en(EV.ETIQ[0], EV.REBOBINA)) { m1 = [-1.4, -.1 + .1 * Math.sin(t * 4)]; m2 = [1.4, -.1 + .1 * Math.cos(t * 4)]; }
  if (en(EV.LEE[0], EV.BORRA) && !0) { m1 = [-1.2, 1.15]; m2 = [1.2, 1.15]; a1 = a2 = .2; }
  if (t >= EV.LAND + .3) { const u = (t - EV.LAND) * 1.15, pc = cam.p(CX[0], fila(0) - .1, TOPE); if (pc) { const v = (u % 1.6) / 1.6; m1 = [(pc.x - p.x) / R - .3 + v * .6, (pc.y - p.y) / R + .55]; a1 = .12; } m2 = [1.4, .4]; }
  const jita = en(EV.PARA - .25, EV.RESET) ? Math.sin(t * 58) * 4 : 0;
  const ve = en(EV.PUL[0] - .05, EV.REBOBINA) ? -Math.abs(Math.sin((t - EV.PUL[0]) * 5.6)) * 26 * Math.exp(-(t - EV.PUL[0]) * .3) : 0;
  dibujaBola(c, p.x + jita, p.y + ve, R, m1, m2, a1, a2, q, o, t);
  if (en(EV.DOS + .4, EV.RESET)) {
    // Una interrogación que nace y se queda arriba.
    texto(c, "?", p.x + jita, p.y - R * 2.2 + Math.sin(t * 5) * 8, { fuente: serif(190, true), color: ACENTO, alfa: smooth(prog(t, EV.DOS + .4, EV.DOS + .7)) });
  }
  if (t >= EV.LAND + .13) birrete(c, p.x, p.y - R * .88, R * .92, -.09 + .02 * Math.sin(t * 2));
  else if (t >= EV.LAND - .32) { const u = prog(t, EV.LAND - .32, EV.LAND + .13); birrete(c, p.x + (1 - u) * 240, p.y - R * .88 - (1 - u * u) * 980, R * .92, -.09 + (1 - u) * 6.5); }
}

/** En el arranque: torre de libros y aplastada. Luego las manitas asoman bajo el remoto. */
function pintaArranque(c: Ctx, cam: Cam, t: number) {
  if (t < EV.SLAM) {
    pintaLibros(c, cam, t);
    const b = bolaTorre(t), p = cam.p(0, TORRE_Y, b.z + RB); if (!p) return;
    const R = RB * p.s, sq = .24 * Math.exp(-b.edad * 9) * Math.cos(b.edad * 25);
    const f = cam.p(0, TORRE_Y, b.n * LIB); if (f) sombra(c, f.x, f.y, R * 1.2, .3 / (1 + (b.z - b.n * LIB) * .5));
    const mira = smooth(prog(t, EV.SLAM - .62, EV.SLAM - .3));
    const sub = b.n < 4 ? Math.sin(t * 9) * .3 : .08 * Math.sin(t * 7);
    let m1: P2 = [lerp(-1.42, -.62, mira), lerp(-.7 - sub, -1.9, mira)], m2: P2 = [lerp(1.42, .62, mira), lerp(-.7 + sub, -1.9, mira)];
    dibujaBola(c, p.x, p.y, R, m1, m2, .9, .9, 1 - sq, 1 + sq * .8, t);
    // el birrete cae justo en «mundo» y se queda hasta el golpe
    const u = prog(t, EV.BIRRETE - .34, EV.BIRRETE);
    if (u > 0) birrete(c, p.x + (1 - u) * 90, p.y - R * .9 - (1 - u * u) * 1000, R * 1.02, -.06 + (1 - u) * 5);
    return;
  }
}
function pintaAplastada(c: Ctx, cam: Cam, t: number) {
  if (t < EV.SLAM || t >= SALE) return;
  const p = cam.p(0, -6.62, .2); if (!p) return;
  const R = RB * p.s, a = t - EV.SLAM;
  c.save(); c.translate(p.x, p.y); c.scale(1.5, .46); c.fillStyle = PAPEL; c.beginPath(); c.arc(0, 0, R + 5, 0, 7); c.fill(); bola(c, 0, 0, R); c.restore();
  const v = Math.sin(a * 21), w = Math.cos(a * 17);
  brazo(c, p.x - R * .7, p.y + R * .12, p.x - R * 1.7 - v * 18, p.y + R * .9 + w * 12, 18, .9, TINTA, smooth(prog(a, .16, .4)), R / 90 * .9);
  brazo(c, p.x + R * .7, p.y + R * .12, p.x + R * 1.7 + w * 18, p.y + R * .9 - v * 12, -18, .9, TINTA, smooth(prog(a, .24, .48)), R / 90 * .9);
}
function birreteVuela(c: Ctx, t: number) {
  const a = t - EV.SLAM; if (a < 0 || a > 1.1) return;
  birrete(c, 620 + 760 * a, 760 - 1500 * a + 900 * a * a, 170, a * 12);
}

// ---------- mamá y los invitados ----------
function pelotita(c: Ctx, x: number, y: number, r: number) {
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = Math.max(r * .1, 2.2); c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  const g = c.createRadialGradient(x - r * .3, y - r * .36, r * .1, x, y, r); g.addColorStop(0, "rgba(140,138,131,0)"); g.addColorStop(.72, "rgba(140,138,131,.07)"); g.addColorStop(1, "rgba(120,118,110,.42)"); c.fillStyle = g; c.fill(); c.stroke();
}
function pintaMama(c: Ctx, x: number, y: number, k: number, t: number, recibe: boolean) {
  // (x, y) es el punto donde se apoya el sillón en la mesa. k: 100 = escala 1:1 a píxeles.
  const a = recibe ? t - EV.LLEGA1 : -9, s2 = recibe ? t - EV.SUSTO : -9;
  const salto = s2 > 0 ? Math.abs(Math.sin(Math.min(s2, 1) * 6.6)) * 62 * Math.exp(-s2 * 2) : 0;
  c.save(); c.translate(x, y); c.scale(k / 100, k / 100);
  // lámpara
  c.strokeStyle = TINTA; c.lineWidth = 6; c.beginPath(); c.moveTo(218, 4); c.lineTo(218, -300); c.stroke();
  c.fillStyle = TINTA; c.beginPath(); c.ellipse(218, 6, 44, 12, 0, 0, 7); c.fill();
  c.fillStyle = "#F3DFA8"; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.moveTo(166, -300); c.lineTo(190, -386); c.lineTo(246, -386); c.lineTo(270, -300); c.closePath(); c.fill(); c.stroke();
  // sillón
  c.fillStyle = "#3A3936"; c.strokeStyle = TINTA; c.lineWidth = 5;
  c.beginPath(); c.roundRect(-134, -252, 268, 256, 62); c.fill(); c.stroke();
  c.fillStyle = "#57554F"; c.beginPath(); c.roundRect(-164, -128, 70, 132, 30); c.fill(); c.stroke(); c.beginPath(); c.roundRect(94, -128, 70, 132, 30); c.fill(); c.stroke();
  // ella
  const by = -128 - salto, r = 88;
  const ojo = s2 > 0 ? 1.3 : 1;
  pelotita(c, 0, by, r);
  c.fillStyle = "#4A4944"; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.arc(0, by - r - 14, 34, 0, 7); c.fill(); c.stroke();
  c.strokeStyle = "#4A4944"; c.lineWidth = 9; c.beginPath(); c.arc(0, by, r - 5, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
  c.strokeStyle = TINTA; c.lineWidth = 4.5; c.fillStyle = "rgba(255,255,255,.65)";
  for (const sx of [-1, 1]) { c.beginPath(); c.arc(sx * 34, by - 8, 24 * ojo, 0, 7); c.fill(); c.stroke(); c.fillStyle = TINTA; c.beginPath(); c.arc(sx * 34 + (s2 > 0 ? 0 : 3), by - 8 + (s2 > 0 ? 0 : 5), 5.5, 0, 7); c.fill(); c.fillStyle = "rgba(255,255,255,.65)"; }
  c.beginPath(); c.moveTo(-10, by - 8); c.lineTo(10, by - 8); c.stroke();
  c.fillStyle = TINTA; if (s2 > 0) { c.beginPath(); c.ellipse(0, by + 46, 14, 20, 0, 0, 7); c.fill(); } else { c.lineWidth = 4; c.beginPath(); c.arc(0, by + 30, 18, .3, 2.84); c.stroke(); }
  // tejido: dos agujas y una bufanda roja que crece; deja de tejer cuando llega el sobre
  if (a < 0 || !recibe) {
    const v = Math.sin(t * 7) * 12;
    c.strokeStyle = TINTA; c.lineWidth = 11; c.lineCap = "round"; c.beginPath(); c.moveTo(-72, by + 36); c.quadraticCurveTo(-72, by + 92, -18, by + 84 + v); c.moveTo(72, by + 36); c.quadraticCurveTo(72, by + 92, 18, by + 84 - v); c.stroke();
    c.strokeStyle = GRIS; c.lineWidth = 4; c.beginPath(); c.moveTo(-18, by + 84 + v); c.lineTo(34, by + 62); c.moveTo(18, by + 84 - v); c.lineTo(-34, by + 62); c.stroke();
    c.fillStyle = ACENTO; c.fillRect(-26, by + 92, 52, 46 + Math.sin(t * .8) * 4);
  } else {
    c.strokeStyle = TINTA; c.lineWidth = 11; c.lineCap = "round"; c.beginPath(); c.moveTo(-70, by + 30); c.lineTo(-104, by - 20); c.moveTo(70, by + 30); c.lineTo(104, by - 20); c.stroke();
  }
  c.restore();
}
function pintaSalita(c: Ctx, cam: Cam, t: number, recibe: boolean) {
  const p = cam.p(MAMA.x, MAMA.y, 0); if (!p) return;
  anillo3(c, cam, Array.from({ length: 40 }, (_, i): P2 => [Math.cos(i / 40 * 6.283) * 2.5, Math.sin(i / 40 * 6.283) * 1.4]), .004, MAMA.x, MAMA.y - .1);
  c.fillStyle = "#EFEBDF"; c.fill(); c.strokeStyle = "rgba(17,17,17,.5)"; c.lineWidth = 2.6; c.stroke();
  sombra(c, p.x, p.y, 2 * p.s, .28);
  pintaMama(c, p.x, p.y, p.s * .62 * 1.3, t, recibe);
}
function gorrito(c: Ctx, x: number, y: number, r: number, k: number) {
  c.fillStyle = ACENTO; c.beginPath(); c.moveTo(x - r * .6, y - r * .62); c.lineTo(x, y - r * .62 - r * 1.2 * k); c.lineTo(x + r * .6, y - r * .62); c.closePath(); c.fill();
  c.fillStyle = TINTA; c.beginPath(); c.arc(x, y - r * .62 - r * 1.24 * k, r * .17, 0, 7); c.fill();
}
function pintaInvitados(c: Ctx, cam: Cam, t: number, felices: boolean) {
  INV.forEach((q, i) => {
    const p = cam.p(q.x, q.y, .34); if (!p) return;
    const f = cam.p(q.x, q.y, 0); if (f) sombra(c, f.x, f.y, 44 * p.s / 100, .22);
    const ll = EV.LLEGA2 + i * .075, a = felices ? t - ll : -9, r = .34 * p.s;
    const hop = a > 0 ? Math.abs(Math.sin(a * 6 + q.f)) * 18 * p.s / 90 * Math.exp(-a * .35) : Math.abs(Math.sin(t * 1.4 + q.f)) * 3;
    pelotita(c, p.x, p.y - hop, r);
    if (a > 0) gorrito(c, p.x, p.y - hop, r, ease.outBack(prog(a, 0, .2), 2.4));
  });
}
function sobre(c: Ctx, x: number, y: number, w: number, g: number, sello = true) {
  c.save(); c.translate(x, y); c.rotate(g); const h = w * .66;
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = Math.max(w * .035, 2.4); c.lineJoin = "round";
  c.beginPath(); c.rect(-w / 2, -h / 2, w, h); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-w / 2, -h / 2); c.lineTo(0, h * .12); c.lineTo(w / 2, -h / 2); c.stroke();
  if (sello) { c.fillStyle = ACENTO; c.beginPath(); c.arc(0, h * .1, w * .09, 0, 7); c.fill(); }
  c.restore();
}
type P3 = [number, number, number];
const Q3 = (a: P3, b: P3, d: P3, u: number): P3 => { const v = 1 - u; return [v * v * a[0] + 2 * v * u * b[0] + u * u * d[0], v * v * a[1] + 2 * v * u * b[1] + u * u * d[1], v * v * a[2] + 2 * v * u * b[2] + u * u * d[2]]; };
function vuelos(c: Ctx, cam: Cam, t: number) {
  const P0: P3 = [0, 5.76, H + .1];
  if (t > EV.KL1 && t < EV.LLEGA1 + .2) {
    const u = ease.inOutSine(prog(t, EV.KL1 + .02, EV.LLEGA1)), Pm: P3 = [-2.6, 8.4, 6.5], P1: P3 = [MAMA.x + .1, MAMA.y - .9, 1.2], q = Q3(P0, Pm, P1, u), p = cam.p(q[0], q[1], q[2]);
    c.save(); c.strokeStyle = ACENTO; c.lineWidth = 6; c.setLineDash([3, 22]); c.lineCap = "round"; c.beginPath(); let f = true;
    for (let i = 0; i <= 36; i++) { const w = cam.p(...Q3(P0, Pm, P1, u * i / 36)); if (!w) continue; if (f) { c.moveTo(w.x, w.y); f = false; } else c.lineTo(w.x, w.y); }
    c.stroke(); c.restore();
    if (p && u < 1) sobre(c, p.x, p.y, 150 * Math.min(p.s / 110, 1.5), Math.sin(t * 9) * .22 + .1);
  }
  if (t > EV.KL2 && t < EV.LLEGA2 + 1.1) {
    // la misma estela roja de la primera vez, ahora hacia los invitados
    const u0 = ease.inOutSine(prog(t, EV.KL2 + .02, EV.LLEGA2)), Pm0: P3 = [2.6, 8.6, 5.6], P10: P3 = [3.2, 12.8, .9];
    c.save(); c.strokeStyle = ACENTO; c.lineWidth = 6; c.setLineDash([3, 22]); c.lineCap = "round"; c.globalAlpha = 1 - smooth(prog(t, EV.LLEGA2 + .5, EV.LLEGA2 + 1.1)); c.beginPath(); let f0 = true;
    for (let i = 0; i <= 36; i++) { const w = cam.p(...Q3(P0, Pm0, P10, u0 * i / 36)); if (!w) continue; if (f0) { c.moveTo(w.x, w.y); f0 = false; } else c.lineTo(w.x, w.y); }
    c.stroke(); c.restore();
    INV.forEach((q, i) => {
      const ll = EV.LLEGA2 + i * .075, u = ease.inOutSine(prog(t, EV.KL2 + .02 + i * .016, ll));
      if (u >= 1) return;
      const Pm: P3 = [2.6, 8.6, 5.6], P1: P3 = [q.x, q.y, .6], w = Q3(P0, Pm, P1, u), p = cam.p(w[0], w[1], w[2]);
      if (p) sobre(c, p.x, p.y, 118 * Math.min(p.s / 90, 1.4), Math.sin(t * 8 + i) * .24, false);
    });
  }
}
function pintaTarjeta(c: Ctx, cam: Cam, t: number) {
  if (t < EV.ABRE || t >= EV.REGRESA + .24) return;
  const a = t - EV.ABRE, z = ease.outBack(prog(a, 0, .34), 1.6), sale = smooth(prog(t, EV.REGRESA, EV.REGRESA + .2));
  const w = 720, h = 410, x = 540, y = 430 - sale * 300;
  c.save(); c.translate(x, y); c.rotate(-.035 + .01 * Math.sin(t * 2)); c.scale(z, z); c.globalAlpha = 1 - sale;
  c.fillStyle = "rgba(20,18,14,.2)"; c.fillRect(-w / 2 + 12, -h / 2 + 18, w, h);
  c.fillStyle = ACENTO; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.rect(-w / 2, -h / 2, w, h); c.fill(); c.stroke();
  c.strokeStyle = "rgba(255,240,225,.6)"; c.lineWidth = 3; c.strokeRect(-w / 2 + 22, -h / 2 + 22, w - 44, h - 44);
  texto(c, "¡Fiesta", 0, -62, { fuente: serif(140, true), color: BLANCO });
  texto(c, "sorpresa!", 0, 72, { fuente: serif(140, true), color: BLANCO });
  texto(c, "para mamá", 0, 158, { fuente: serif(64), color: "#FBD9CC" });
  // una sola raya: la sorpresa se acabó
  const r = ease.inOutCubic(prog(t, EV.TACHA, EV.TACHA + .26));
  if (r > 0) { c.strokeStyle = TINTA; c.lineWidth = 15; c.lineCap = "round"; c.beginPath(); c.moveTo(-250, 34); c.lineTo(lerp(-250, 256, r), 34 + 22 * r); c.stroke(); }
  c.restore();
  const m = t - EV.MIJO;
  if (m > 0) {
    const zz = ease.outBack(prog(m, 0, .2), 2);
    c.save(); c.translate(236, 830); c.scale(zz * .9, zz * .9); c.globalAlpha = 1 - sale;
    c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.roundRect(-176, -64, 352, 128, 56); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(118, 54); c.lineTo(190, 110); c.lineTo(62, 62); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = BLANCO; c.fillRect(66, 44, 66, 20);
    texto(c, "ay, mijo.", 0, 26, { fuente: serif(88, true), color: TINTA });
    c.restore();
  }
}

// ---------- órbita de preguntas ----------
function orbita(c: Ctx, cam: Cam, t: number, atras: boolean) {
  const [a, b] = [EV.QUE - .12, EV.ORBF]; if (t < a || t > b + .2) return;
  const q = posBola(t), p = cam.p(q.x, q.y, q.z + RB); if (!p) return;
  const R = RB * p.s, ap = ease.outBack(prog(t, a, a + .3)) * (1 - ease.inOutCubic(prog(t, b - .1, b + .2)));
  const it = t < EV.QUIEN - .08 ? 0 : 1, M = 4;
  for (let i = 0; i < M; i++) {
    const an = i / M * 6.283 + t * 3.1, x = p.x + Math.cos(an) * R * 2.7 * ap, y = p.y - R * .25 + Math.sin(an) * R * .55 * ap;
    if ((Math.sin(an) < 0) !== atras) continue;
    const k = lerp(1.15, 1.65, (Math.sin(an) + 1) / 2);
    c.save(); c.translate(x, y); c.scale(k * ap, k * ap);
    if (it === 0) {
      if (i === 0) sobre(c, 0, 0, 96, .1);
      if (i === 1) { c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 3.4; c.fillRect(-40, -52, 80, 104); c.strokeRect(-40, -52, 80, 104); c.fillStyle = TINTA; for (let j = 0; j < 4; j++) c.fillRect(-28, -34 + j * 22, 56 - j * 8, 5); }
      if (i === 2) { c.fillStyle = "#E7D2AC"; c.strokeStyle = TINTA; c.lineWidth = 3.4; c.fillRect(-42, -36, 84, 72); c.strokeRect(-42, -36, 84, 72); c.fillStyle = TINTA; c.fillRect(-6, -36, 12, 72); }
      if (i === 3) { c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 3.4; c.fillRect(-48, -36, 96, 72); c.strokeRect(-48, -36, 96, 72); c.fillStyle = ACENTO; c.beginPath(); c.arc(-18, -8, 11, 0, 7); c.fill(); c.fillStyle = TINTA; c.beginPath(); c.moveTo(-40, 26); c.lineTo(-6, -8); c.lineTo(38, 26); c.closePath(); c.fill(); }
    } else {
      pelotita(c, 0, 0, 40);
      if (i === 1) { c.fillStyle = "#4A4944"; c.beginPath(); c.arc(0, -46, 15, 0, 7); c.fill(); }
      if (i === 2) gorrito(c, 0, 0, 40, 1);
      texto(c, "?", 0, 18, { fuente: serif(56, true), color: TINTA });
    }
    c.restore();
  }
}

// ---------- la mano de una persona ----------
function pulgar(c: Ctx, tx: number, ty: number) {
  // Sale de abajo a la derecha. Un solo trazo a tinta sobre papel: una persona de verdad junto al agente.
  const bx = tx + 560, by = ty + 760, a = Math.atan2(by - ty, bx - tx), L = Math.hypot(bx - tx, by - ty);
  c.save(); c.translate(tx, ty); c.rotate(a);
  c.lineJoin = "round"; c.lineCap = "round";
  c.beginPath(); c.moveTo(L, -192); c.bezierCurveTo(L * .62, -176, 250, -108, 96, -84); c.bezierCurveTo(10, -80, -40, -42, -40, 0); c.bezierCurveTo(-40, 42, 10, 86, 96, 86); c.bezierCurveTo(250, 112, L * .62, 150, L, 228); c.closePath();
  const g = c.createLinearGradient(0, -120, 0, 150); g.addColorStop(0, "#F7F1E4"); g.addColorStop(.6, "#EBE3D2"); g.addColorStop(1, "#D5CBB6");
  c.fillStyle = g; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 7; c.stroke();
  c.fillStyle = BLANCO; c.lineWidth = 5; c.beginPath(); c.moveTo(66, -46); c.bezierCurveTo(10, -44, -8, -24, -8, 0); c.bezierCurveTo(-8, 26, 10, 46, 66, 48); c.bezierCurveTo(100, 40, 104, -40, 66, -46); c.closePath(); c.fill(); c.stroke();
  c.lineWidth = 5; c.beginPath(); c.moveTo(196, -70); c.quadraticCurveTo(214, 0, 198, 76); c.moveTo(224, -66); c.quadraticCurveTo(242, 0, 228, 76); c.stroke();
  c.restore();
}
function dedos(c: Ctx, x: number, y: number, ent: number) {
  // Las cuatro yemas que abrazan el canto izquierdo.
  for (let i = 0; i < 4; i++) {
    const yy = y + i * 118, xx = x - (1 - ent) * 260;
    c.fillStyle = "#EFE8D8"; c.strokeStyle = TINTA; c.lineWidth = 6; c.beginPath(); c.roundRect(xx - 190, yy - 50, 230, 104, 50); c.fill(); c.stroke();
    c.fillStyle = BLANCO; c.lineWidth = 3.6; c.beginPath(); c.roundRect(xx - 14, yy - 30, 44, 62, 14); c.fill(); c.stroke();
  }
}
function pintaMano(c: Ctx, cam: Cam, t: number) {
  if (t < EV.MANO || t > EV.REBOBINA + .4) return;
  const ent = ease.outCubic(prog(t, EV.MANO, EV.MANO + .5)) * (1 - ease.inOutCubic(prog(t, EV.REBOBINA - .05, EV.REBOBINA + .3)));
  if (ent <= 0) return;
  const pts = PRESION.map((k) => cam.p(k.x, k.y, TOPE + .1)!);
  let x = pts[0].x, y = pts[0].y, baja = 0;
  const P = EV.PUL;
  if (t < P[0]) { baja = .55 + .08 * Math.sin(t * 4); }
  else {
    const n = P.filter((q) => t >= q).length - 1, a = t - P[n], d = n < 2 ? P[n + 1] - P[n] : 1;
    const de = pts[n], a2 = pts[Math.min(n + 1, 2)], v = smooth(prog(a, .12, d - .03));
    x = lerp(de.x, a2.x, v); y = lerp(de.y, a2.y, v);
    baja = Math.max(0, .6 * Math.sin(Math.PI * clamp((a - .1) / Math.max(d - .1, .1))));
  }
  // el camino que el pulgar ya se sabe: tres botones sin mirar
  const cam3 = Math.min(EV.PUL.filter((q) => t >= q).length, 3), al = 1 - smooth(prog(t, EV.REBOBINA - .1, EV.REBOBINA + .2));
  if (cam3 > 0 && al > 0) {
    c.save(); c.globalAlpha = al; c.strokeStyle = ACENTO; c.lineWidth = 7; c.setLineDash([3, 20]); c.lineCap = "round"; c.lineDashOffset = -t * 60;
    c.beginPath(); c.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < cam3; i++) c.lineTo(pts[i].x, pts[i].y);
    if (cam3 < 3 && t > EV.PUL[0]) c.lineTo(x, y);
    c.stroke(); c.setLineDash([]); c.fillStyle = ACENTO;
    for (let i = 0; i < cam3; i++) { c.beginPath(); c.arc(pts[i].x, pts[i].y, 13, 0, 7); c.fill(); }
    c.restore();
  }
  const dx = (1 - ent) * 900, dy = (1 - ent) * 900;
  const izq = cam.p(-2.6, fila(1), H);
  if (izq) dedos(c, izq.x + 6, izq.y, ent);
  pulgar(c, x + dx + baja * 30, y + dy - baja * 62);
}

// ---------- texto: papel pegado ----------
function marbete(c: Ctx, t: number, ini: number, fin: number, tx: string, x: number, y: number, px: number, o: { rojo?: boolean; it?: boolean; giro?: number; noche?: boolean } = {}) {
  const a = t - ini; if (a < 0 || t > fin + .26) return;
  const { rojo = false, it = true, giro = -.016 } = o;
  const fu = serif(px, it);
  c.save(); c.font = fu; const w = c.measureText(tx).width + px * .72, h = px * 1.3;
  const z = a < .13 ? lerp(1.55, 1, ease.outCubic(a / .13)) : 1 + .03 * Math.exp(-(a - .13) * 10) * Math.cos((a - .13) * 32);
  const sal = smooth(prog(t, fin, fin + .24));
  c.translate(x, y + sal * 42); c.rotate(giro + sal * .1); c.scale(z, z); c.globalAlpha = clamp(a / .05) * (1 - sal);
  c.fillStyle = "rgba(20,18,14,.3)"; c.fillRect(-w / 2 + 8, -h / 2 + 11, w, h);
  const j = azar(Math.floor(t * 9) * 3 + tx.length), q = (v: number) => v + (j() - .5) * 3;
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 3.6; c.lineJoin = "round";
  c.beginPath(); c.moveTo(q(-w / 2), q(-h / 2)); c.lineTo(q(w / 2), q(-h / 2)); c.lineTo(q(w / 2), q(h / 2)); c.lineTo(q(-w / 2), q(h / 2)); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = "rgba(192,68,42,.3)"; c.save(); c.translate(0, -h / 2); c.rotate(.03); c.fillRect(-62, -13, 124, 26); c.restore();
  texto(c, tx, 0, px * .33, { fuente: fu, color: rojo ? ACENTO : TINTA });
  c.restore();
}
function polvillo(c: Ctx, t: number, alfa: number, col: string) {
  const r = azar(9); c.fillStyle = col;
  for (let i = 0; i < 60; i++) {
    const x0 = r() * 1200 - 60, y0 = r() * 2060, v = 16 + r() * 40, f = r() * 6.3, z = 1.6 + r() * 3.2;
    const y = ((y0 - t * v) % 2060 + 2060) % 2060 - 70, x = x0 + Math.sin(t * .55 + f) * 34;
    c.globalAlpha = alfa * (.08 + r() * .17); c.fillRect(x, y, z, z);
  }
  c.globalAlpha = 1;
}
function chispas(c: Ctx, cam: Cam, t: number) {
  const a = t - EV.KL3; if (a < 0 || a > .8) return;
  const p = cam.p(BR.x, BR.y, TOPE + .1); if (!p) return;
  const r = azar(5);
  for (let i = 0; i < 28; i++) {
    const an = r() * 6.28, v = 180 + r() * 620, x = p.x + Math.cos(an) * v * a, y = p.y + Math.sin(an) * v * a * .6 - 180 * a + 700 * a * a;
    c.strokeStyle = i % 3 ? "#FF8A5C" : TIBIA; c.lineWidth = 4; c.globalAlpha = 1 - smooth(prog(a, .25, .75));
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - Math.cos(an) * 26, y - Math.sin(an) * 16); c.stroke();
  }
  c.globalAlpha = 1;
}

// ---------- oscuridad y la nota que la rompe ----------
function apagon(c: Ctx, cam: Cam, t: number) {
  if (t < EV.NEGRO || t > EV.TOSTADA + 1) return;
  const P = cam.p(0, 5.76, H);
  const r = ease.inOutCubic(prog(t, EV.TOSTADA, EV.TOSTADA + .85)) * 2600;
  if (r <= 0 || !P) { c.fillStyle = NOCHE; c.fillRect(-60, -60, 1200, 2040); }
  else {
    const g = c.createRadialGradient(P.x, P.y - 180, Math.max(r * .55, 1), P.x, P.y - 180, r + 60);
    g.addColorStop(0, "rgba(9,9,10,0)"); g.addColorStop(1, "rgba(9,9,10,1)"); c.fillStyle = g; c.fillRect(-60, -60, 1200, 2040);
  }
  // en lo oscuro solo queda la luz roja que no explica nada, y la bola a tientas
  if (t < EV.TOSTADA + .2) {
    const bb = posBola(t), p = cam.p(bb.x, bb.y, bb.z + RB), o = 1 - prog(t, EV.TOSTADA, EV.TOSTADA + .2);
    textoPantalla(c, cam, t, true);
    if (p) {
      const R = RB * p.s, v = Math.sin(t * 4.4), w = Math.cos(t * 3.7), g2 = R / 90;
      c.save(); c.globalAlpha = o;
      const hg = c.createRadialGradient(p.x, p.y - R, R * .6, p.x, p.y - R, R * 3.2), lf = .22 * rojoLed(t); hg.addColorStop(0, `rgba(192,68,42,${lf})`); hg.addColorStop(1, "rgba(192,68,42,0)"); c.fillStyle = hg; c.fillRect(p.x - 500, p.y - 500, 1000, 1000);
      brazo(c, p.x - 54 * g2, p.y - 50 * g2, p.x - R * (1.8 + .24 * v), p.y - R * (.3 - .4 * w), 90 * g2, .95, LUZ, 1, g2);
      brazo(c, p.x + 60 * g2, p.y - 30 * g2, p.x + R * (1.8 + .24 * w), p.y - R * (.3 + .4 * v), -100 * g2, .95, LUZ, 1, g2);
      c.fillStyle = NOCHE; c.strokeStyle = LUZ; c.lineWidth = 5; c.beginPath(); c.arc(p.x, p.y, R, 0, 7); c.fill(); c.stroke();
      c.restore();
    }
    // la rendija se entibia antes de que salga el papel
    const br = prog(t, EV.BRILLA - .1, EV.TOSTADA);
    if (P && br > 0) {
      const L = cam.p(-1.7, 5.76, H), RR = cam.p(1.7, 5.76, H);
      const g3 = c.createRadialGradient(P.x, P.y, 6, P.x, P.y, 260 + 240 * br); g3.addColorStop(0, `rgba(255,226,160,${.5 * br})`); g3.addColorStop(1, "rgba(255,226,160,0)"); c.fillStyle = g3; c.fillRect(P.x - 600, P.y - 600, 1200, 1200);
      if (L && RR) { c.strokeStyle = TIBIA; c.lineWidth = 5 + 4 * br; c.lineCap = "round"; c.globalAlpha = br; c.beginPath(); c.moveTo(L.x, L.y); c.lineTo(RR.x, RR.y); c.stroke(); c.globalAlpha = 1; }
    }
  }
}
function tostada(c: Ctx, cam: Cam, t: number) {
  if (t < EV.TOSTADA || t > EV.CRECE[1]) return;
  const P = cam.p(0, 5.76, H); if (!P) return;
  const u = ease.outBack(prog(t, EV.TOSTADA, EV.TOSTADA + .34), 1.3), sale = ease.inOutCubic(prog(t, EV.KL4 + .6, EV.KL4 + 1)), w = 3.4 * P.s * 1.32, h = 400;
  const y0 = P.y - lerp(u * (h + 8), -20, sale);
  c.save(); c.beginPath(); c.rect(-60, -60, 1200, P.y + 62); c.clip();
  c.translate(P.x, y0); c.rotate(.006 * Math.sin(t * 2));
  c.fillStyle = "rgba(0,0,0,.14)"; c.fillRect(-w / 2 + 10, 14, w, h);
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.rect(-w / 2, 0, w, h + 30); c.fill(); c.stroke();
  // borde dentado de impresora
  c.fillStyle = PAPEL; for (let i = 0; i < 26; i++) { c.beginPath(); c.moveTo(-w / 2 + i * w / 26, -2); c.lineTo(-w / 2 + (i + .5) * w / 26, 12); c.lineTo(-w / 2 + (i + 1) * w / 26, -2); c.closePath(); c.fill(); }
  const a1 = smooth(prog(t, EV.L5 - .03, EV.L5 + .14)), a2 = smooth(prog(t, EV.L6 - .03, EV.L6 + .14));
  texto(c, "ese día", 0, 128, { fuente: serif(104), color: TINTA, alfa: a1 });
  texto(c, "está cerrado", 0, 224, { fuente: serif(104), color: TINTA, alfa: smooth(prog(t, EV.L5 + .36, EV.L5 + .5)) });
  texto(c, "prueba el domingo", 0, 340, { fuente: serif(102, true), color: ACENTO, alfa: a2 });
  c.restore();
}

function pintaFinal(c: Ctx, cam: Cam, t: number) {
  if (t < EV.LAND) return;
  // la última etiqueta: se pega donde estuvo el error
  const a2 = t - EV.LAND, sl = a2 < .12 ? lerp(1.6, 1, ease.outCubic(a2 / .12)) : 1 + .016 * Math.exp(-(a2 - .12) * 9) * Math.cos((a2 - .12) * 30);
  tira(c, cam, 0, 5.03, 3.96, 1.24, -.012, H + .07, () => texto(c, "cada vez.", 0, 25, { fuente: serif(82, true), color: ACENTO }), sl);
}

// ---------- el cuadro ----------
function dibuja(c: Ctx, t: number) {
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  const v = vista(t), cam = camara(v, 540, 900, 1250), B = cuerpoEn(t), [sx, sy] = sacude(t);
  c.save(); c.translate(sx, sy);
  pintaMesa(c, cam, t);
  pintaNotas(c, cam, t, B);
  const verDiorama = t > EV.KL1 - .2 && t < t0.pasa + .7;
  if (verDiorama) { const r = t < EV.REGRESA + .3; pintaSalita(c, cam, t, r); pintaInvitados(c, cam, t, !r); }
  // sobre la bola cae todo: ella va debajo hasta que se arrastra
  pintaArranque(c, cam, t);
  const u = prog(t, EV.SLAM - .36, EV.SLAM), a = t - EV.SLAM;
  if (t >= EV.SLAM - .36) {
    const zb = t < EV.SLAM ? lerp(9, 0, u * u) : .3 * Math.exp(-a * 7) * Math.abs(Math.sin(a * 13));
    pintaRemoto(c, cam, t, B, zb);
    if (t >= EV.SLAM) {
      pintaFijas(c, cam, t); pintaTag(c, cam, t); pintaCarta(c, cam, t); pintaDos(c, cam, t); pintaFinal(c, cam, t);
    }
  } else if (t > EV.SLAM - 1) {
    // la sombra llega antes que el remoto
    const k = prog(t, EV.SLAM - 1, EV.SLAM - .36);
    c.fillStyle = `rgba(17,15,12,${k * .3})`; c.fillRect(-60, -60, 1200, 2040);
  }
  pintaAplastada(c, cam, t);
  if (t >= SALE) { orbita(c, cam, t, true); pintaBola(c, cam, t); orbita(c, cam, t, false); }
  polvoGolpe(c, cam, t);
  librosVuelan(c, t); birreteVuela(c, t);
  vuelos(c, cam, t);
  chispas(c, cam, t);
  apagon(c, cam, t);
  tostada(c, cam, t);
  pintaTarjeta(c, cam, t);
  pintaMano(c, cam, t);
  polvillo(c, t, 1, t >= EV.NEGRO && t < EV.TOSTADA ? LUZ : TINTA);
  // ---------- papel con palabras ----------
  marbete(c, t, s("agente") - .04, EV.SLAM - .08, "el agente", 540, 1370, 104, { giro: .012 });
  marbete(c, t, t0.mas - .02, EV.SLAM - .08, "más inteligente", 540, 1514, 106);
  marbete(c, t, t0.mala, t0.imag - .28, "mala herramienta", 540, 1500, 118, { rojo: true });
  marbete(c, t, t0.sin, t0.cuarenta - .1, "sin etiquetas", 540, 300, 120);
  marbete(c, t, t0.cuarenta + .02, t0.eso - .34, "cuarenta botones", 540, 180, 112);
  marbete(c, t, t0.eso + .02, EV.VE - .55, "eso le estás dando", 540, 300, 112, { rojo: true });
  marbete(c, t, EV.VE - .04, t0.solo - .3, "no ve", 540, 150, 140, { rojo: true });
  marbete(c, t, EV.QUE, EV.ORBF + .06, "¿qué envía?", 330, 340, 108);
  marbete(c, t, EV.QUIEN, EV.ORBF + .06, "¿a quién?", 740, 490, 108, { rojo: true, giro: .022 });
  marbete(c, t, EV.ORBF + .1, EV.J1 - .08, "va a adivinar", 540, 300, 112);
  marbete(c, t, t0.mismo, t0.otro - .2, "mismo modelo", 540, 216, 120);
  marbete(c, t, t0.otro, t0.pasa - .4, "otro resultado", 540, 216, 124, { rojo: true });
  marbete(c, t, t0.resp - .04, EV.J3 + .1, "las respuestas", 540, 350, 112);
  marbete(c, t, EV.NEGRO + .3, EV.BRILLA - .3, "ciego", 540, 1470, 128, {});
  marbete(c, t, s("sabe qué"), EV.CRECE[0] - .3, "sabe qué hacer", 540, 1480, 112, { rojo: true });
  marbete(c, t, t0.yMas + .3, t0.cadaH - .1, "más no es mejor", 540, 170, 118);
  marbete(c, t, t0.mesa - .5, EV.DOS - .2, "lugar en la mesa", 540, 170, 118, { rojo: true });
  marbete(c, t, EV.DOS + .1, EV.RESET - .04, "dos parecidas", 540, 196, 116);
  marbete(c, t, t0.agente - .04, t0.prog - .3, "para un agente", 540, 190, 116, { rojo: true });
  marbete(c, t, t0.prog - .04, t0.una - .16, "para un programador", 520, 190, 104);
  marbete(c, t, t0.una, EV.REBOBINA - .1, "una vez", 300, 190, 130);
  marbete(c, t, t0.prim - .04, EV.BORRA - .02, "por primera vez", 540, 196, 116, { rojo: true });
  c.restore();
}

export const Pieza: React.FC = () => <Lienzo dibuja={(c, t) => dibuja(c, t)} preparar={() => ({})} />;
