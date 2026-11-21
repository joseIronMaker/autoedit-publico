// Serie 2, capítulo 5. Un solo mundo visto desde arriba: una mesa de tamaño fijo. Todo lo que el agente sabe está
// encima de ella, y fuera no hay nada: las persianas se cierran justo en su borde. La bola despierta sin recuerdos
// en cada paso (relevador, "?", barre la mesa con la mirada) y jamás se lleva nada consigo: lo único que persiste
// son las hojas. La nota de los mariscos queda enterrada, una prensa lo aplasta todo en un resumen y un pedazo se
// pierde. El brazo blanco es quien sirve la mesa: al final la barre y deja solo lo que importa.
// Todos los instantes de hojas, pasos y golpes vienen de eventos.json, que escribe partitura.py.
import React from "react";
import { azar, Cam, camara, clamp, ease, guionCamara, lerp, prog, resorte, smooth, texto, Vista } from "../../kit";
import { ACENTO, cue, Lienzo, LUZ, mono, NOCHE, PAPEL, rotulo, serif, sombra, TINTA } from "../../marca";
import { agente, brazo } from "../../personaje";
import palabras from "./palabras.json";
import duracion from "./duracion.json";
import ev from "./eventos.json";

export const DURACION = duracion.dur;
const T = cue(palabras);
const s = (f: string) => T(f).s, e = (f: string) => T(f).e;
type C = CanvasRenderingContext2D;
type P3 = [number, number, number];
type Sprites = Record<string, HTMLCanvasElement>;
type D = { spr: Sprites };

const t0 = {
  memoria: s("memoria"), de: s("de un pez"), pez: s("pez"), paso: s("paso"), vuelven: s("le vuelven"), todo: s("todo"), lee: s("lo lee"), desde: s("desde cero"), cero: s("cero"),
  imag: s("imagínalo"), empl: s("empleado"), brill: s("brillante"), desp: s("despierta"), sin: s("sin recuerdos"), cadaP: s("cada pocos"), frente: s("frente a"), mesa: s("una mesa"),
  unico: s("lo único"), encima: s("encima"), esaF: e("esa mesa"), instr: s("instrucciones"), herr: s("herramientas"), plat: s("lo que ya"), arch: s("los archivos"), abrio: e("abrió"),
  eso: s("a eso"), ctx: s("contexto"), mesa2: s("la mesa tiene"), tam: s("tamaño"), fijo: s("fijo"), msg: s("cada mensaje"), ocupa: s("ocupa espacio"), res: s("cada resultado"), ocupa2: T("ocupa", T("cada resultado").i).s,
  va: s("va a buscar"), rest: s("restaurantes"), trae: s("y trae"), veinte: s("veinte"), llena: s("la mesa se"), llenaF: e("se llena"), raro: s("y aquí"), algoR: s("algo raro"), nof: s("no falla"), vuelve: s("se vuelve"), torpe: s("torpe"),
  olvida: s("se le olvida"), mamá: s("tu mamá"), mar: s("mariscos"), porque: s("porque esa"), abajo: s("hasta abajo"), abajoF: e("hasta abajo"), cuando: s("cuando ya"), cabe: s("cabe nada"), cabeF: e("cabe nada"), hay: s("hay que"),
  al: s("y al"), algo: s("algo se"), algoF: e("algo se pierde"), por: s("por eso"), empezar: s("empezar brillante"), acabar: s("y acabar"), conf: s("confundido"), aunque: s("aunque"), mismo: s("el mismo"), mismoF: e("el mismo"),
  hoy: s("hoy casi"), prompts: s("prompts"), mag: s("mágicos"), magF: e("mágicos"), habla: s("se habla"), ing: s("ingeniería"), qe: s("qué entra"), qs: s("qué sale"), yc: s("y cuándo"), ycF: e("y cuándo"),
  nog: s("no gana"), mas: s("más información"), masF: e("más información"), gana: s("gana quien le deja"), sobre: s("sobre la"), solo: s("solo lo"), imp: s("importa"), impF: e("importa"),
};
const BAM = ev.bam;
const TINT_OSC = ev.sh + .4;                                  // desde aquí, fuera de la mesa no hay nada
const PASOS = ev.pasos as [number, number][];

// ---------- el mundo ----------
const ROJO = "#E9896C", KRAFT = "#CFBC98", CANTO = "#9C8560", BLANCO = "#FDFCF8";
const W = 4.1, H = 4.2, GT = .34, PISO = -6.4, RB = .94;
const B0: P3 = [-.2, -5.66, .3];
const PEC = { x: 3.55, y: -5.8, z: -.7, r: 1.05 };
const NOTA = { x: .55, y: -2.6, w: 4.4, h: 2.4, r: -.03 };

// ---------- herramientas ----------
let FR = 0;
const frac = (x: number) => x - Math.floor(x);
const tiembla = (j: number) => frac(Math.sin(j * 12.9898 + FR * 78.233) * 43758.5453) - .5;
const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * 6.2832 + f);
const salto = (k: number, h: number) => (k <= 0 || k >= 1 ? 0 : h * 4 * k * (1 - k));

function poli(c: C, cam: Cam, P: P3[], fill?: string, tinta?: string, g = 3, vib = 1) {
  c.beginPath();
  for (let i = 0; i < P.length; i++) {
    const q = cam.p(P[i][0], P[i][1], P[i][2]);
    if (!q) return;
    const j = P[i][0] * 3.1 + P[i][1] * 5.7 + P[i][2] * 2.3;
    const x = q.x + tiembla(j) * vib, y = q.y + tiembla(j + 40) * vib;
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (tinta) { c.strokeStyle = tinta; c.lineWidth = g; c.lineJoin = "round"; c.stroke(); }
}
function lin(c: C, cam: Cam, a: P3, b: P3, g: number, color = TINTA) {
  const A = cam.p(a[0], a[1], a[2]), B = cam.p(b[0], b[1], b[2]);
  if (!A || !B) return;
  c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round"; c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke();
}
/** Dibuja en unidades locales (100 = 1 unidad de mundo) sobre un plano de la mesa. */
function plano(c: C, cam: Cam, o: P3, ux: P3, vy: P3, f: () => void) {
  const a = cam.p(o[0], o[1], o[2]), b = cam.p(o[0] + ux[0], o[1] + ux[1], o[2] + ux[2]), d = cam.p(o[0] + vy[0], o[1] + vy[1], o[2] + vy[2]);
  if (!a || !b || !d) return;
  c.save(); c.transform((b.x - a.x) / 100, (b.y - a.y) / 100, (d.x - a.x) / 100, (d.y - a.y) / 100, a.x, a.y); f(); c.restore();
}
type Tr = [number, number, number, number, number, number?];
function ruta(t: number, ini: [number, number, number, number], S: Tr[], curva: (x: number) => number = smooth) {
  const v: [number, number, number, number] = [...ini];
  for (const q of S) {
    if (t <= q[0]) break;
    const k = curva(prog(t, q[0], q[1]));
    v[0] = lerp(v[0], q[2], k); v[1] = lerp(v[1], q[3], k); v[2] = lerp(v[2], q[4], k);
    if (q[5] !== undefined) v[3] = lerp(v[3], q[5], k);
  }
  return v;
}

// ---------- las hojas ----------
type Hoja = {
  k: string; x: number; y: number; w: number; h: number; r: number; t: number; z: number; cae: number; alto: number; f: number; sem: number;
  fin?: number; sale?: number; vx?: number; vy?: number; gira?: number; pr?: number; lleva?: number; queda?: boolean;
};
const CEL = .2, NG = 72;
const mapa = () => new Float32Array(NG * NG);
function apila(m: Float32Array, h: Hoja, escribe = true) {
  const cs = Math.cos(h.r), sn = Math.sin(h.r), EP = .055;
  let top = 0;
  const celdas: number[] = [];
  for (let j = 0; j < NG; j++) for (let i = 0; i < NG; i++) {
    const x = -7.2 + i * CEL - h.x, y = -7.2 + j * CEL - h.y, u = x * cs + y * sn, v = -x * sn + y * cs;
    if (Math.abs(u) <= h.w / 2 && Math.abs(v) <= h.h / 2) { celdas.push(j * NG + i); top = Math.max(top, m[j * NG + i]); }
  }
  h.z = top + EP;
  if (escribe) for (const q of celdas) m[q] = h.z;
}
let SEM = 1;
const hoja = (k: string, x: number, y: number, w: number, h: number, r: number, t: number, f: number, o: Partial<Hoja> = {}): Hoja => ({ k, x, y, w, h, r, t, z: 0, cae: .36, alto: 5.2, f, sem: SEM++, ...o });
const HOJAS: Hoja[] = [];
const VARIAS = ["r0", "r1", "r2", "r3", "r4", "r5", "r6", "r7"];
const REVUELTAS = ["r0", "msg", "r1", "res", "r2", "charla", "r3", "arch", "r4", "msg", "r5", "res", "r6", "r7"];

// Lo que se sirve en la mesa antes de los restaurantes.
const A1 = mapa();
const pon1 = (h: Hoja) => { apila(A1, h); HOJAS.push(h); return h; };
pon1(hoja("instr", -2.05, 1.95, 3.5, 4.1, -.05, ev.instr, 1, { cae: .5, alto: 7.5 }));
pon1(hoja("herr", 2.05, 2.05, 3.4, 3.9, .06, ev.herr, 1, { cae: .5, alto: 7.5 }));
pon1(hoja("charla", -2.74, -1.9, 2.6, 3.1, .05, ev.charla, 1));
const LA_NOTA = pon1(hoja("nota", NOTA.x, NOTA.y, NOTA.w, NOTA.h, NOTA.r, ev.nota, 1, { cae: .5, alto: 7 }));
pon1(hoja("arch", 2.8, -.4, 2.4, 2.6, -.09, ev.arch[0], 1));
pon1(hoja("arch", .15, -.2, 2.4, 2.6, .07, ev.arch[1], 1));
const SIT = [[-1.0, -.9, .12], [1.5, -.75, -.1], [-2.5, .3, .06]];
ev.msg.forEach((t, i) => pon1(hoja("msg", SIT[i][0], SIT[i][1], 2.6, 1.5, SIT[i][2], t, 1, { alto: 4.5 })));
pon1(hoja("res", .1, 2.5, 3, 3.5, -.11, ev.res[0], 1));
pon1(hoja("res", -3.1 + 3.4, -.3, 3, 3.5, .09, ev.res[1], 1));
const POS = [[-2.5, 2.05], [0, 2.1], [2.5, 2.1], [-2.8, .5], [-.4, .9], [2.4, .7], [1, 1.6], [-2.4, -1.1], [.3, -.8], [2.7, -1.2], [-1, -.3], [1.4, -.2], [-2.7, -2.3], [2.75, -2.25], [-.9, -2.1], [1.6, -1.6], [.9, -2.3], [-.5, -2.3], [1.95, -2.35], [.15, -1.55]];
{
  const r = azar(21);
  POS.forEach(([x, y], i) => {
    const m = i === 19;
    pon1(hoja(m ? "mar" : VARIAS[i % 8], x + (r() - .5) * .25, y + (r() - .5) * .25, 3.3, 4, m ? -.04 : (r() - .5) * .34, ev.pag[i], 1, { cae: .3, alto: 4.2 }));
  });
}
// Las dos que se le resbalan cuando se vuelve torpe.
{
  const a = hoja("r2", -2.8, -.6, 3.3, 4, .3, ev.pag[19] + .7, 1, { sale: ev.slip[0], vx: -4.2, vy: -1, gira: 1.2, alto: 3 }); apila(A1, a, false); HOJAS.push(a);
  const b = hoja("r5", 2.9, -1.4, 3.3, 4, -.26, ev.pag[19] + 1.05, 1, { sale: ev.slip[1], vx: 4.4, vy: -1.3, gira: -1.1, alto: 3 }); apila(A1, b, false); HOJAS.push(b);
}
// Pelar la pila: cada hoja encima de la nota sube y pasa junto a la cámara, de arriba hacia abajo.
const PILA = HOJAS.filter((h) => h.z > LA_NOTA.z - 1e-4 && h !== LA_NOTA).sort((a, b) => b.z - a.z || b.t - a.t);
PILA.forEach((h, i) => (h.pr = i));
const NP = PILA.length;
const Z_TOP = Math.max(...HOJAS.map((h) => h.z));
// Lo que ya no cabe: cae, resbala y se va al vacío.
{
  const r = azar(5);
  ev.ext.forEach((t, i) => {
    const l = i % 2 ? 1 : -1, x = l * (2.4 + r()), y = -3 + r() * 6;
    const h = hoja(VARIAS[i % 8], x, y, 3.3, 4, (r() - .5) * .6, t, 1, { sale: t + .14, vx: l * (5 + r() * 2), vy: (r() - .5) * 2, gira: (r() - .5) * 3, alto: 2.4 });
    apila(A1, h, false); HOJAS.push(h);
  });
}
HOJAS.forEach((h) => { if (h.f === 1) h.fin = BAM; });

// Después de la prensa: un solo resumen, y la mesa se vuelve a llenar.
const RSM = { x: 0, y: -2.15, w: 4.6, h: 3.9, r: -.02 };
const A2 = mapa();
const pon2 = (h: Hoja) => { apila(A2, h); HOJAS.push(h); return h; };
pon2(hoja("rsm", RSM.x, RSM.y, RSM.w, RSM.h, RSM.r, BAM, 2, { cae: .001, alto: 0 }));
// Lo que no se resume: las instrucciones y las herramientas viajan completas en cada paso.
pon2(hoja("instr", -2.05, 1.95, 3.5, 4.1, -.05, BAM, 2, { cae: .001, alto: 0, queda: true }));
pon2(hoja("herr", 2.05, 2.05, 3.4, 3.9, .06, BAM, 2, { cae: .001, alto: 0, queda: true }));
{
  const r = azar(33);
  ev.rapidas.forEach((t, i) => {
    pon2(hoja(REVUELTAS[i % 14], (r() - .5) * 5.4, -2.4 + r() * 4.4, 3.1, 3.7, (r() - .5) * .8, t, 2, { cae: .26, alto: 4 }));
  });
}
const LA_MAGICA = pon2(hoja("mag", -.2, -1.2, 3.6, 2.5, -.08, ev.magica, 2, { cae: 1.7, alto: 5, sale: ev.quitaM + .02, vx: 16, vy: 2.4, gira: 7 }));
// Las de encima son las que la mano se lleva cuando decide "qué sale".
const P2 = HOJAS.filter((h) => h.f === 2 && h.k !== "rsm" && !h.queda && h !== LA_MAGICA).sort((a, b) => b.z - a.z);
P2.slice(0, 9).forEach((h) => { h.sale = ev.sale + (W - h.x) * .012; h.vx = -15; h.vy = (h.y + 6) * .06; h.gira = -3; });
const ENTRA = pon2(hoja("res", .3, .6, 3, 3.5, .05, ev.entra, 3, { cae: .2, alto: 1.8, lleva: ev.entra - 1.05 }));
const CUANDO = pon2(hoja("r6", -1.1, -1.5, 3.3, 4, -.05, ev.cuando, 3, { cae: .16, alto: 2.2, lleva: ev.sale + .62 }));
{
  const r = azar(77);
  ev.diluvio.forEach((t, i) => {
    const x = (r() - .5) * 9.2, y = -3.1 + r() * 4.7;
    pon2(hoja(REVUELTAS[(i * 3) % 14], x, y, 3.2, 3.8, (r() - .5) * 1.5, t, 3, { cae: .22, alto: 2.6 }));
  });
}
{
  const r = azar(9);
  HOJAS.forEach((h) => {
    if (h.f > 1 && h.sale === undefined && !h.queda) { h.sale = ev.barre + .08 + (h.x + W) / (2 * W) * .46; h.vx = 13 + r() * 9; h.vy = -1 - r() * 5; h.gira = (r() - .5) * 8; }
  });
  HOJAS.forEach((h) => { if (h.k === "rsm") h.vy = 1; });
}
const NOTA_F = hoja("nota", .15, -2.1, 4.4, 2.4, -.02, ev.notaF, 4, { cae: .18, alto: 1.4, lleva: ev.notaF - 1.05 });
apila(mapa(), NOTA_F); HOJAS.push(NOTA_F);

// ---------- la pila bajo la cámara ----------
const bajo = (t: number) => smooth(prog(t, ev.entierra[1] - .1, ev.entierra[1] + .55)) * (1 - smooth(prog(t, BAM + 1.25, BAM + 1.9)));
const zK = (t: number) => lerp(1, 4.6, bajo(t));
function zPrensa(t: number) {
  if (t < ev.prensa) return 17;
  if (t < BAM) return lerp(17, .14, ease.inCubic(prog(t, ev.prensa, BAM)));
  if (t < BAM + .42) return .14;
  return lerp(.14, 19, ease.inCubic(prog(t, BAM + .42, BAM + 1.25)));
}
const kPila = (t: number) => (t >= BAM ? 1 : clamp(zPrensa(t) / (Z_TOP * zK(t) + .001), .04, 1));
const cuerpo = (t: number) => (t >= BAM ? 0 : Z_TOP * (zK(t) - 1) * kPila(t));         // alto de la resma bajo las hojas sueltas

type Est = { x: number; y: number; z: number; zb: number; r: number; ix: number; iy: number };
function estado(h: Hoja, t: number): Est | null {
  if (h.lleva !== undefined ? t < h.lleva : t < h.t - h.cae) return null;
  if (h.fin !== undefined && t >= h.fin) return null;
  if (h === LA_NOTA && bajo(t) > .5) return null;                   // de lado, la nota es la capa roja de la resma
  let x = h.x, y = h.y, r = h.r, ix = 0, iy = 0, z = h.f === 1 ? h.z * kPila(t) + cuerpo(t) : h.z;
  const zb = z;
  if (h.f === 2 && h !== LA_MAGICA && h.k !== "rsm" && !h.queda && t > t0.ing) {     // ingeniería: lo que hay en la mesa se acomoda
    const a0 = t0.ing + (h.sem % 11) * .045, o = ease.outBack(prog(t, a0, a0 + .62), 1.3);
    x = lerp(x, Math.round(h.x / 2.75) * 2.75, o); y = lerp(y, Math.round((h.y + .3) / 2.5) * 2.5 - .3, o); r = lerp(r, 0, o);
  }
  if (h.lleva !== undefined && t < h.t - h.cae) {
    const m = manoG(t);
    x = m[0] + .2; y = m[1] - .3; z = m[2] - .12; r += vaiven(t, 1.1) * .03;
    return { x, y, z, zb: h.z, r, ix: .02, iy: -.03 };
  }
  const kc = (h.t - t) / h.cae;
  if (kc > 0) {
    z += h.alto * kc * kc;
    x += Math.sin(kc * 5 + h.sem) * .5 * kc; y += Math.cos(kc * 4 + h.sem * 2) * .4 * kc;
    r += kc * 1.1 * (h.sem % 2 ? 1 : -1);
    ix = kc * .3 * Math.sin(kc * 7 + h.sem); iy = kc * .26 * Math.cos(kc * 6 + h.sem);
  }
  if (h.sale !== undefined && t > h.sale && h.vx !== undefined) {
    const a = t - h.sale;
    x += h.vx * a; y += (h.vy ?? 0) * a; r += (h.gira ?? 0) * a;
    z += .9 * Math.sin(Math.min(a * 4.5, 3.14));
    const fuera = Math.max(Math.abs(x) - W - .4, Math.abs(y) - H - .4);
    if (fuera > 0) {
      const tf = fuera / Math.hypot(h.vx, h.vy ?? 0);
      z -= 16 * tf * tf; ix = Math.sin(a * 6 + h.sem) * .4; iy = Math.cos(a * 5 + h.sem) * .4;
    }
    if (z < -24 || Math.abs(x) > 19) return null;
  }
  if (h.pr !== undefined && t < ev.entierra[1] + .2) {
    const [a, b] = ev.pela, [c0, d] = ev.entierra;
    const tU = a + (b - a) * h.pr / NP, tD = c0 + (d - c0) * (NP - 1 - h.pr) / NP;
    if (t < tD) { const u = t - tU; if (u > 0) { z += 14 * u + 70 * u * u; if (z > 40) return null; } } else { const v = 1 - clamp((t - tD) / .15); z += 12 * v * v; }
  }
  return { x, y, z, zb, r, ix, iy };
}
const esquinas = (x: number, y: number, z: number, w: number, h: number, r: number, ix = 0, iy = 0): P3[] => {
  const cs = Math.cos(r), sn = Math.sin(r);
  const P = (u: number, v: number): P3 => [x + u * cs - v * sn, y + u * sn + v * cs, z + u * ix + v * iy];
  return [P(-w / 2, h / 2), P(w / 2, h / 2), P(w / 2, -h / 2), P(-w / 2, -h / 2)];
};
function imagen(c: C, q: { x: number; y: number }[], spr: HTMLCanvasElement) {
  const sw = spr.width, sh = spr.height, [a, b, , d] = q;
  c.save(); c.transform((b.x - a.x) / sw, (b.y - a.y) / sw, (d.x - a.x) / sh, (d.y - a.y) / sh, a.x, a.y); c.drawImage(spr, 0, 0); c.restore();
}
function dibujaHoja(c: C, cam: Cam, h: Hoja, st: Est, d: D, t: number) {
  const P = esquinas(st.x, st.y, st.z, h.w, h.h, st.r, st.ix, st.iy);
  const Q = P.map((p) => cam.p(p[0], p[1], p[2]));
  if (Q.some((q) => !q)) return;
  const q = Q as NonNullable<(typeof Q)[0]>[];
  const sM = q[0].s, baja = cam.v.pitch < 1;
  if (!baja && st.z > -.2) {                                       // sombra dura de papel recortado: se cierra al aterrizar
    const dz = Math.max(st.z - st.zb, 0), aS = clamp(.3 - dz * .035, .04, .3);
    const S = esquinas(st.x + .06 + dz * .17, st.y - .08 - dz * .14, Math.min(st.zb, st.z - .001), h.w * (1 + dz * .02), h.h * (1 + dz * .02), st.r);
    poli(c, cam, S, `rgba(28,20,12,${aS})`);
  }
  if (cam.v.pitch < 1.25 && st.zb > .001) {                        // canto del papel
    const dz = .07;
    const m: [number, number][] = [[0, 1], [1, 2], [2, 3], [3, 0]];
    for (const [i, j] of m) poli(c, cam, [P[i], P[j], [P[j][0], P[j][1], P[j][2] - dz], [P[i][0], P[i][1], P[i][2] - dz]], "#E6E1D4", "rgba(17,17,17,.75)", 1.4, 0);
  }
  const sinBase = h.k === "rsm";
  if (!sinBase) poli(c, cam, P, BLANCO, TINTA, Math.max(1.6, .024 * sM), .8);
  if (cam.v.pitch > .5 || Math.abs(st.z - st.zb) > .05) {
    imagen(c, q, d.spr[h.k]);
    if (h.k === "mar" && t >= ev.sello) {
      const k = ease.outBack(prog(t, ev.sello, ev.sello + .12), 1.1);
      const O = esquinas(st.x, st.y - 1.26, st.z, 2.95 * lerp(1.4, 1, k), .92 * lerp(1.4, 1, k), st.r + .05);
      const O2 = O.map((p) => cam.p(p[0], p[1], p[2]));
      if (O2.every(Boolean)) imagen(c, O2 as NonNullable<(typeof O2)[0]>[], d.spr.sello);
    }
  }
  // luz: lo de abajo se apaga
  if (h.f === 1 && t < BAM) {
    const hon = clamp(1 - h.z / Z_TOP);
    if (hon > .02 && cam.v.pitch > .9 && h !== LA_NOTA) poli(c, cam, P, `rgba(26,18,10,${.1 * hon})`);
  }
}

/** De lado la pila es una resma: capas finas, y casi hasta abajo la nota, una raya roja que asoma. */
const CAPAS = (() => {
  const r = azar(8), o: { dx: number; dy: number; rz: number; w: number; h: number }[] = [];
  for (let i = 0; i < 52; i++) o.push({ dx: (r() - .5) * .3, dy: (r() - .5) * .3, rz: (r() - .5) * .036, w: 7.5 + r() * .5, h: 7.6 + r() * .5 });
  return o;
})();
function resma(c: C, cam: Cam, t: number) {
  const Hb = cuerpo(t); if (Hb < .02 || !LA_NOTA) return;
  const n = CAPAS.length, dz = Hb / n, cx = cam.pos[0], cy = cam.pos[1];
  CAPAS.forEach((q, i) => {
    const roja = i === 3, w = roja ? q.w + .34 : q.w, h = roja ? q.h + .5 : q.h;
    const A = esquinas(q.dx, q.dy, (i + 1) * dz, w, h, q.rz), B = esquinas(q.dx, q.dy, i * dz, w, h, q.rz);
    const col = roja ? ACENTO : i % 2 ? "#F7F4EC" : "#E7E2D6", tin = roja ? ACENTO : "rgba(17,17,17,.42)";
    if (cy < -h / 2) poli(c, cam, [A[3], A[2], B[2], B[3]], col, tin, 1.2, .4);
    if (cx > w / 2) poli(c, cam, [A[2], A[1], B[1], B[2]], roja ? ACENTO : "#D8D3C6", tin, 1.2, .4);
    if (cx < -w / 2) poli(c, cam, [A[3], A[0], B[0], B[3]], roja ? ACENTO : "#D8D3C6", tin, 1.2, .4);
    if (i === n - 1) poli(c, cam, A, "#F2EEE4", TINTA, 2, .5);
  });
}

// ---------- sprites ----------
const PX = 240;
function lienzo(w: number, h: number, f: (g: C, W: number, H: number) => void) {
  const cv = document.createElement("canvas");
  cv.width = Math.ceil(w * PX); cv.height = Math.ceil(h * PX);
  const g = cv.getContext("2d")!;
  g.scale(PX / 100, PX / 100);
  f(g, w * 100, h * 100);
  return cv;
}
function renglones(g: C, x: number, y: number, w: number, n: number, paso: number, sem: number, grueso = 7, color = TINTA) {
  const r = azar(sem);
  g.fillStyle = color;
  for (let i = 0; i < n; i++) { g.beginPath(); g.roundRect(x, y + i * paso, w * (.56 + r() * .44), grueso, grueso / 2); g.fill(); }
}
function lupaD(g: C, x: number, y: number, e0: number, color = TINTA) {
  g.save(); g.translate(x, y); g.scale(e0, e0); g.strokeStyle = color; g.lineWidth = 13; g.lineCap = "round";
  g.beginPath(); g.arc(-8, -8, 34, 0, 7); g.stroke(); g.lineWidth = 16; g.beginPath(); g.moveTo(18, 18); g.lineTo(46, 46); g.stroke(); g.restore();
}
function sobreD(g: C, x: number, y: number, e0: number) {
  g.save(); g.translate(x, y); g.scale(e0, e0); g.strokeStyle = TINTA; g.lineWidth = 8; g.lineJoin = "round";
  g.beginPath(); g.rect(-50, -34, 100, 68); g.stroke(); g.beginPath(); g.moveTo(-50, -34); g.lineTo(0, 8); g.lineTo(50, -34); g.stroke(); g.restore();
}
function telefonoD(g: C, x: number, y: number, e0: number) {
  g.save(); g.translate(x, y); g.scale(e0, e0); g.rotate(-.7); g.fillStyle = TINTA;
  g.beginPath(); g.roundRect(-52, -14, 104, 26, 13); g.fill(); g.beginPath(); g.roundRect(-58, -8, 36, 34, 10); g.fill(); g.beginPath(); g.roundRect(22, -8, 36, 34, 10); g.fill(); g.restore();
}
function calendarioD(g: C, x: number, y: number, e0: number) {
  g.save(); g.translate(x, y); g.scale(e0, e0); g.strokeStyle = TINTA; g.fillStyle = TINTA; g.lineWidth = 8;
  g.strokeRect(-42, -36, 84, 76); g.fillRect(-42, -36, 84, 22);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) g.fillRect(-28 + i * 22, -2 + j * 20, 11, 11); g.restore();
}
function cubiertos(g: C, x: number, y: number, e0: number) {
  g.save(); g.translate(x, y); g.scale(e0, e0); g.strokeStyle = TINTA; g.lineWidth = 6; g.lineCap = "round";
  g.beginPath(); g.moveTo(-14, -30); g.lineTo(-14, 34); for (const k of [-24, -14, -4]) { g.moveTo(k, -30); g.lineTo(k, -8); } g.moveTo(-24, -8); g.lineTo(-4, -8); g.stroke();
  g.lineWidth = 7; g.beginPath(); g.moveTo(16, 34); g.lineTo(16, -30); g.quadraticCurveTo(30, -18, 22, 0); g.lineTo(16, 0); g.stroke(); g.restore();
}
function cangrejo(g: C, x: number, y: number, e0: number) {
  g.save(); g.translate(x, y); g.scale(e0, e0); g.strokeStyle = ACENTO; g.fillStyle = ACENTO; g.lineCap = "round"; g.lineWidth = 8;
  for (const l of [-1, 1]) {
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(l * 50, 6 + i * 11); g.quadraticCurveTo(l * (98 - i * 4), -8 + i * 24, l * (106 - i * 12), 34 + i * 19); g.stroke(); }
    g.lineWidth = 11; g.beginPath(); g.moveTo(l * 48, -18); g.quadraticCurveTo(l * 96, -32, l * 86, -66); g.stroke(); g.lineWidth = 8;
    g.beginPath(); g.ellipse(l * 86, -84, 25, 30, l * .3, 0, 7); g.fill();
    g.fillStyle = BLANCO; g.beginPath(); g.moveTo(l * 84, -80); g.lineTo(l * 76, -118); g.lineTo(l * 100, -116); g.closePath(); g.fill(); g.fillStyle = ACENTO;
    g.lineWidth = 6; g.beginPath(); g.moveTo(l * 18, -36); g.lineTo(l * 22, -66); g.stroke(); g.lineWidth = 8;
    g.fillStyle = TINTA; g.beginPath(); g.arc(l * 22, -72, 9, 0, 7); g.fill(); g.fillStyle = ACENTO;
  }
  g.beginPath(); g.ellipse(0, 0, 66, 46, 0, 0, 7); g.fill();
  g.strokeStyle = "rgba(253,252,248,.55)"; g.lineWidth = 4; g.beginPath(); g.arc(0, -8, 34, .4, 2.74); g.stroke(); g.restore();
}
function notaD(g: C, w: number, h: number) {
  g.fillStyle = BLANCO; g.fillRect(0, 0, w, h);
  g.strokeStyle = ACENTO; g.lineWidth = 7; g.strokeRect(10, 10, w - 20, h - 20);
  texto(g, "mi mamá no", w / 2, h * .45, { fuente: serif(78, true), color: TINTA });
  texto(g, "come mariscos", w / 2, h * .79, { fuente: serif(78, true), color: ACENTO });
}
function hazSprites(): Sprites {
  const S: Sprites = {};
  S.instr = lienzo(3.5, 4.1, (g, w, h) => {
    texto(g, "instrucciones", 26, 58, { fuente: mono(23), color: "#6c6a64", alin: "left" });
    texto(g, "la fiesta", 26, 150, { fuente: serif(84, true), color: TINTA, alin: "left" });
    texto(g, "de mamá", 26, 232, { fuente: serif(84, true), color: ACENTO, alin: "left" });
    for (let i = 0; i < 3; i++) { g.strokeStyle = TINTA; g.lineWidth = 4; g.strokeRect(28, 276 + i * 42, 22, 22); }
    renglones(g, 66, 284, w - 96, 3, 42, 4);
  });
  S.herr = lienzo(3.4, 3.9, () => undefined);
  S.herr = lienzo(3.4, 3.9, (g, w) => {
    texto(g, "herramientas", 26, 58, { fuente: mono(23), color: "#6c6a64", alin: "left" });
    lupaD(g, w * .29, 150, 1.05); sobreD(g, w * .71, 150, 1.08); telefonoD(g, w * .29, 290, 1.05); calendarioD(g, w * .71, 290, 1.05);
  });
  S.charla = lienzo(2.6, 3.1, (g, w) => {
    g.strokeStyle = TINTA; g.lineWidth = 5; g.fillStyle = BLANCO;
    g.beginPath(); g.roundRect(18, 26, w - 74, 100, 26); g.stroke(); renglones(g, 42, 54, w - 130, 3, 20, 3, 6);
    g.fillStyle = TINTA; g.beginPath(); g.roundRect(56, 156, w - 74, 118, 26); g.fill(); renglones(g, 80, 186, w - 130, 3, 26, 8, 7, BLANCO);
  });
  S.arch = lienzo(2.4, 2.6, (g, w, h) => {
    g.fillStyle = "#E9DFC8"; g.strokeStyle = TINTA; g.lineWidth = 5;
    g.beginPath(); g.moveTo(16, 44); g.lineTo(16, h - 16); g.lineTo(w - 16, h - 16); g.lineTo(w - 16, 44); g.lineTo(112, 44); g.lineTo(96, 18); g.lineTo(32, 18); g.lineTo(16, 44); g.closePath(); g.fill(); g.stroke();
    renglones(g, 40, 84, w - 80, 6, 26, 12, 6);
  });
  S.msg = lienzo(2.6, 1.5, (g, w, h) => {
    g.fillStyle = TINTA; g.beginPath(); g.arc(46, 46, 22, 0, 7); g.fill();
    renglones(g, 84, 32, w - 112, 3, 34, 19, 9);
  });
  S.res = lienzo(3, 3.5, (g, w, h) => {
    g.fillStyle = TINTA; g.fillRect(0, 0, w, 62);
    texto(g, "resultado", 22, 42, { fuente: mono(26), color: BLANCO, alin: "left" });
    renglones(g, 26, 92, w - 52, 4, 28, 31, 7);
    g.strokeStyle = "rgba(17,17,17,.75)"; g.lineWidth = 4; g.strokeRect(26, 210, w - 52, 112);
    renglones(g, 44, 232, w - 88, 3, 28, 37, 7);
  });
  const NOM = ["Taquería", "Pizzería", "Sushi", "Cantina", "Asador", "Bistró", "Fonda", "Cocina"];
  NOM.forEach((n, i) => {
    S["r" + i] = lienzo(3.3, 4, (g, w, h) => {
      texto(g, n, 28, 92, { fuente: serif(76), color: TINTA, alin: "left" });
      cubiertos(g, w - 56, 62, 1.05);
      for (let k = 0; k < 5; k++) texto(g, "★", 30 + k * 40, 148, { fuente: serif(38), color: k < 3 + i % 3 ? TINTA : "rgba(17,17,17,.2)", alin: "left" });
      renglones(g, 28, 188, w - 56, 6, 30, 40 + i, 7);
      g.strokeStyle = "rgba(17,17,17,.55)"; g.lineWidth = 3; g.strokeRect(28, 186 + 180, w - 56, 26);
    });
  });
  S.mar = lienzo(3.3, 4, (g, w, h) => {
    texto(g, "Mariscos", w / 2, 96, { fuente: serif(92), color: TINTA });
    cangrejo(g, w / 2, 214, 1);
  });
  S.sello = lienzo(2.95, .92, (g, w, h) => {
    g.strokeStyle = ACENTO; g.lineWidth = 9; g.strokeRect(9, 9, w - 18, h - 18);
    texto(g, "RESERVADO", w / 2, h / 2 + 20, { fuente: mono(56), color: ACENTO });
    g.globalCompositeOperation = "destination-out"; const r = azar(3); for (let i = 0; i < 90; i++) { g.beginPath(); g.arc(r() * w, r() * h, r() * 2.6 + .6, 0, 7); g.fill(); }
  });
  S.nota = lienzo(4.4, 2.4, notaD);
  S.mag = lienzo(3.6, 2.5, (g, w, h) => {
    g.strokeStyle = TINTA; g.lineWidth = 4; g.strokeRect(12, 12, w - 24, h - 24); g.strokeRect(22, 22, w - 44, h - 44);
    texto(g, "prompt", w / 2, 114, { fuente: serif(76, true), color: TINTA }); texto(g, "mágico", w / 2, 192, { fuente: serif(76, true), color: ACENTO });
  });
  S.rsm = lienzo(4.6, 3.9, (g, w, h) => {
    g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w, h * .7); g.lineTo(w - 28, h * .74); g.lineTo(w - 52, h * .81); g.lineTo(w - 84, h * .8); g.lineTo(w - 108, h * .9); g.lineTo(w - 146, h * .89); g.lineTo(w - 164, h); g.lineTo(0, h); g.closePath();
    g.fillStyle = BLANCO; g.fill(); g.strokeStyle = TINTA; g.lineWidth = 3.5; g.stroke();
    texto(g, "resumen", 30, 86, { fuente: serif(86, true), color: TINTA, alin: "left" });
    g.fillStyle = TINTA; g.fillRect(32, 106, w - 64, 5);
    texto(g, "la fiesta de mamá", 32, 180, { fuente: serif(62), color: TINTA, alin: "left" });
    texto(g, "buscó restaurantes", 32, 252, { fuente: serif(62), color: TINTA, alin: "left" });
    texto(g, "ya reservó", 32, 324, { fuente: serif(62), color: TINTA, alin: "left" });
  });
  S.fra = lienzo(3.5, 1.9, (g, w, h) => {
    g.beginPath(); g.moveTo(14, 18); g.lineTo(w - 10, 4); g.lineTo(w - 26, 52); g.lineTo(w - 6, 98); g.lineTo(w - 30, 140); g.lineTo(w - 14, h - 8); g.lineTo(34, h - 18); g.lineTo(6, 120); g.lineTo(26, 74); g.closePath();
    g.fillStyle = BLANCO; g.fill(); g.strokeStyle = ACENTO; g.lineWidth = 6; g.stroke();
    texto(g, "no come", w / 2 - 4, 80, { fuente: serif(72, true), color: TINTA });
    texto(g, "mariscos", w / 2 - 4, 150, { fuente: serif(72, true), color: ACENTO });
  });
  S.veta = lienzo(8.2, 8.4, (g, w, h) => {
    g.fillStyle = KRAFT; g.fillRect(0, 0, w, h);
    const r = azar(14);
    for (let i = 0; i < 74; i++) {
      const y = r() * h, a = .05 + r() * .09;
      g.strokeStyle = `rgba(94,70,36,${a})`; g.lineWidth = .8 + r() * 2.2; g.beginPath(); g.moveTo(-10, y);
      for (let x = 0; x <= w + 40; x += 40) g.lineTo(x, y + Math.sin(x * .007 + i) * 7 + (r() - .5) * 2);
      g.stroke();
    }
  });
  return S;
}

// ---------- la mesa ----------
function mesa(c: C, cam: Cam, d: D, t: number) {
  const P = cam.pos, tp: P3[] = [[-W, H, 0], [W, H, 0], [W, -H, 0], [-W, -H, 0]];
  if (cam.v.pitch < 1) for (const [x, y] of [[-W + .3, -H + .3], [W - .3, -H + .3]]) { lin(c, cam, [x, y, -GT], [x, y, PISO], 26 * (cam.p(x, y, -1)?.s ?? 90) / 100, "#3a3226"); }
  if (P[1] < -H) poli(c, cam, [[-W, -H, 0], [W, -H, 0], [W, -H, -GT], [-W, -H, -GT]], CANTO, TINTA, 3);
  if (P[0] > W) poli(c, cam, [[W, -H, 0], [W, H, 0], [W, H, -GT], [W, -H, -GT]], CANTO, TINTA, 3);
  if (P[0] < -W) poli(c, cam, [[-W, -H, 0], [-W, H, 0], [-W, H, -GT], [-W, -H, -GT]], CANTO, TINTA, 3);
  poli(c, cam, tp, KRAFT, TINTA, 4.5, .8);
  const Q = tp.map((p) => cam.p(p[0], p[1], p[2]));
  if (Q.every(Boolean) && cam.v.pitch > .9) {
    const q = Q as NonNullable<(typeof Q)[0]>[];
    c.save(); c.beginPath(); q.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.clip();
    imagen(c, q, d.spr.veta);
    c.restore();
  }
}
function escuadras(c: C, cam: Cam, t: number) {
  const SG = [[-1, 1], [1, 1], [1, -1], [-1, -1]];
  SG.forEach(([sx, sy], i) => {
    const a = t - ev.esq[i]; if (a < -.24) return;
    const k = clamp(1 - (a + .24) / .24), z = 5 * k * k + .03, L = 1.25, G = .34;
    const x = sx * W, y = sy * H, g = sx * .1, h = sy * .1;
    const L1: P3[] = [[x + g, y + h, z], [x - sx * L, y + h, z], [x - sx * L, y - sy * G, z], [x - sx * G, y - sy * G, z], [x - sx * G, y - sy * L, z], [x + g, y - sy * L, z]];
    poli(c, cam, L1, "#1b1b1a", "#000", 2, .5);
    const q = [[x - sx * .22, y - sy * .02], [x - sx * .9, y - sy * .02], [x - sx * .02 + g * 0, y - sy * .9]];
    for (const [a1, b1] of q) { const p = cam.p(a1, b1, z); if (p) { c.fillStyle = "#77746c"; c.beginPath(); c.arc(p.x, p.y, Math.max(3, .07 * p.s), 0, 7); c.fill(); } }
  });
}
function piso(c: C, cam: Cam) {
  c.strokeStyle = "rgba(17,17,17,.06)"; c.lineWidth = 2; c.beginPath();
  for (let i = -8; i <= 8; i++) {
    const a = cam.p(i * 2.4, -22, PISO), b = cam.p(i * 2.4, 22, PISO), q = cam.p(-22, i * 2.4, PISO), r = cam.p(22, i * 2.4, PISO);
    if (a && b) { c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); }
    if (q && r) { c.moveTo(q.x, q.y); c.lineTo(r.x, r.y); }
  }
  c.stroke();
  poli(c, cam, [[-W + .9, H - .9, PISO], [W + .9, H - .9, PISO], [W + .9, -H - .9, PISO], [-W + .9, -H - .9, PISO]], "rgba(28,22,14,.16)");
}
function pez(c: C, x: number, y: number, l: number, ang: number, flex: number) {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(l / 100, l / 100);
  const b = 15 * flex, bb = 34 * flex;
  c.fillStyle = ACENTO; c.strokeStyle = TINTA; c.lineWidth = 6; c.lineJoin = "round";
  c.beginPath(); c.moveTo(-86, b + bb * .3); c.lineTo(-136, -32 + bb); c.quadraticCurveTo(-118, b + bb * .6, -136, 34 + bb); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(100, 0); c.quadraticCurveTo(46, -56, -30, -36 + b * .6); c.quadraticCurveTo(-68, -22 + b, -92, b + bb * .3); c.quadraticCurveTo(-68, 26 + b, -30, 38 + b * .6); c.quadraticCurveTo(46, 58, 100, 0); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = "rgba(253,252,248,.5)"; c.lineWidth = 4;
  for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(-40 + i * 26, b * (1 - i / 4) * .6, 15, -1.1, 1.1); c.stroke(); }
  c.fillStyle = BLANCO; c.beginPath(); c.arc(58, -12, 13, 0, 7); c.fill(); c.fillStyle = TINTA; c.beginPath(); c.arc(61, -12, 6.5, 0, 7); c.fill();
  c.restore();
}

// ---------- el pez del arranque ----------
const FP: [number, number, number, number, number, number][] = [         // t0, t1, x0, y0, x1, y1: cada salto sobre la mesa
  [-.32, ev.F[0], 2, -.7, -.9, -1.5], [ev.F[0], ev.F[1], -.9, -1.5, 1.2, -2.3], [ev.F[1], ev.F[2], 1.2, -2.3, .12, -3.25],
];
function pezEn(t: number): { x: number; y: number; z: number; ang: number; flex: number } | null {
  if (t >= ev.plop) return null;
  for (let i = 0; i < 3; i++) {
    const [a, b, x0, y0, x1, y1] = FP[i];
    if (t < b) { const k = prog(t, a, b); return { x: lerp(x0, x1, k), y: lerp(y0, y1, k), z: salto(k, 2.6 - i * .35), ang: Math.atan2(y0 - y1, x1 - x0) + k * 6.28 * (i === 1 ? -1 : 1) * .6, flex: Math.sin(t * 44) }; }
  }
  const sub = smooth(prog(t, ev.F[2] + .14, ev.F[2] + .44));
  if (t < ev.tira - .04) return { x: lerp(.12, -.05, sub), y: lerp(-3.25, -3.75, sub), z: lerp(0, 1.5, sub) + vaiven(t, .36) * .06, ang: .15 + vaiven(t, .7) * .06, flex: Math.sin(t * 30) * (.5 + .4 * Math.sin(t * 5)) };
  if (t < ev.tira + .1) { const k = prog(t, ev.tira - .04, ev.tira + .1); return { x: -.05, y: -3.75, z: lerp(1.5, 0, k * k), ang: .15, flex: .5 }; }
  if (t < ev.cola[0]) { const k = prog(t, ev.tira + .1, ev.cola[0]); return { x: lerp(-.05, .6, k), y: lerp(-3.75, -3.5, k), z: salto(k, .9), ang: .1 + k * 2.4, flex: Math.sin(t * 40) }; }
  if (t < ev.cola[1]) { const k = prog(t, ev.cola[0], ev.cola[1]); return { x: lerp(.6, 2.2, k), y: lerp(-3.5, -3.9, k), z: salto(k, 1.1), ang: 2.5 + k * 3, flex: Math.sin(t * 40) }; }
  const k = prog(t, ev.cola[1], ev.plop);
  return { x: lerp(2.2, PEC.x, k), y: lerp(-3.9, PEC.y, k), z: salto(k, 1.5) + lerp(0, PEC.z, k), ang: 5.5 + k * 3, flex: Math.sin(t * 40) };
}
function gotas(c: C, cam: Cam, t: number) {
  for (const [ti, sx, sy] of [[ev.F[0], -.9, -1.5], [ev.F[1], 1.2, -2.3], [ev.tira + .1, -.05, -3.75], [ev.cola[0], .6, -3.5]] as number[][]) {
    const a = t - ti; if (a < 0 || a > .7) continue;
    const r = azar(Math.round(ti * 100));
    for (let i = 0; i < 12; i++) {
      const an = r() * 6.28, v = 2.6 + r() * 3.4, vz = 3 + r() * 4;
      const z = vz * a - 12 * a * a; if (z < 0) continue;
      const p = cam.p(sx + Math.cos(an) * v * a, sy + Math.sin(an) * v * a, z); if (!p) continue;
      c.fillStyle = "#fff"; c.strokeStyle = "rgba(17,17,17,.6)"; c.lineWidth = 2; c.beginPath(); c.arc(p.x, p.y, Math.max(3, .11 * p.s * (1 - a)), 0, 7); c.fill(); c.stroke();
    }
    for (let i = 0; i < 9; i++) {                                    // manchas de agua en la mesa, que se secan
      const an = r() * 6.28, d0 = r() * 1.1, p = cam.p(sx + Math.cos(an) * d0, sy + Math.sin(an) * d0, 0); if (!p) continue;
      c.fillStyle = `rgba(90,66,36,${.26 * (1 - a / .7)})`; c.beginPath(); c.arc(p.x, p.y, (.1 + r() * .16) * p.s, 0, 7); c.fill();
    }
  }
}
function pecera(c: C, cam: Cam, t: number) {
  const p = cam.p(PEC.x, PEC.y, PEC.z); if (!p) return;
  const r = PEC.r * p.s;
  sombra(c, p.x + 16, p.y + 20, r * 1.5, .22);
  c.fillStyle = "rgba(190,205,205,.3)"; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.arc(p.x, p.y, r, 0, 7); c.fill(); c.stroke();
  c.strokeStyle = "rgba(17,17,17,.34)"; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y, r * .84, 0, 7); c.stroke();
  const a = t - ev.plop;
  if (a > 0 && a < 1.3) for (let i = 0; i < 3; i++) {
    const k = clamp((a - i * .12) / 1); if (k <= 0) continue;
    c.strokeStyle = `rgba(17,17,17,${.4 * (1 - k)})`; c.lineWidth = 3; c.beginPath(); c.arc(p.x, p.y, r * .84 * k, 0, 7); c.stroke();
  }
  if (t >= ev.plop) { const an = t * 1.9; pez(c, p.x + Math.cos(an) * r * .5, p.y + Math.sin(an) * r * .5, r * .34, an + 1.57, Math.sin(t * 13) * .6); }
  c.strokeStyle = "rgba(255,255,255,.75)"; c.lineWidth = 7; c.lineCap = "round"; c.beginPath(); c.arc(p.x, p.y, r * .9, 3.6, 4.5); c.stroke();
}

// ---------- la bola ----------
const R1: [number, number, number] = [-1.85, -4.02, .12], R2: [number, number, number] = [1.45, -4.02, .12];
const TF = ev.tira - .24;                        // el paso del arranque
const M1: Tr[] = [
  [.26, ev.F[0], -.9, -1.5, .1, .35], [ev.F[0] + .1, ev.F[0] + .48, -1.8, -3.2, .9, .9], [ev.F[2] - .24, ev.F[2], -.5, -3.3, .2, .15],
  [ev.F[2] + .14, ev.F[2] + .44, -.72, -3.78, 1.6, .15], [ev.tira - .06, ev.tira + .02, -1, -3.74, 1.6, 1], [ev.tira + .3, ev.tira + .8, R1[0], R1[1], R1[2], .6],
  [t0.lee - .3, t0.lee + .1, -1.8, -1.4, .9, .5], [ev.quita - .2, ev.quita + .2, R1[0], R1[1], R1[2], .6],
  [ev.paf[0] - .24, ev.paf[0], -1.7, -2.7, .03, .9], [t0.unico + .25, t0.unico + .85, -3.3, -1, .05, 1], [t0.encima - .3, t0.encima + .4, -2.5, 2.2, .05, 1], [t0.esaF - .1, t0.esaF + .35, -1.7, -3.2, .1, .8],
  [ev.charla - .5, ev.charla, -2.6, -2.6, .2, .7], [ev.nota + .1, ev.nota + .4, -2, -3.4, .1, .4], [t0.eso - .4, t0.eso, R1[0], R1[1], R1[2], .6],
  [ev.tira2 - 1.15, ev.tira2 - .6, -W - .02, -1.6, .08, .1], [ev.esq[1] - .02, ev.esq[1] + .16, -2.7, -3.9, .1, 1], [t0.msg - .1, t0.msg + .3, R1[0], R1[1], R1[2], .6],
];
const M2: Tr[] = [
  [ev.F[1] - .22, ev.F[1], 1.2, -2.3, .1, .35], [ev.F[1] + .1, ev.F[1] + .32, 1.5, -3, .8, .9], [ev.F[2] - .24, ev.F[2], .74, -3.3, .2, .15],
  [ev.F[2] + .14, ev.F[2] + .44, .62, -3.78, 1.6, .15], [ev.tira - .06, ev.tira + .02, .92, -3.74, 1.6, 1], [ev.tira + .3, ev.tira + .8, R2[0], R2[1], R2[2], .6],
  [t0.lee - .2, t0.lee + .2, 1.9, -1.2, 1.05, .8], [ev.quita - .2, ev.quita + .2, R2[0], R2[1], R2[2], .6],
  [ev.paf[1] - .24, ev.paf[1], 1.3, -2.7, .03, .9], [t0.unico + .5, t0.unico + 1.1, 3.3, -.4, .05, 1], [t0.encima - .1, t0.encima + .5, 2.4, 2.2, .05, 1], [t0.esaF, t0.esaF + .4, 1.4, -3.2, .1, .8],
  [ev.herr - .4, ev.herr + .05, 1.9, .9, .25, .7], [ev.herr + .3, ev.herr + .7, R2[0], R2[1], R2[2], .6],
  [ev.tira2 - 1.15, ev.tira2 - .6, W + .02, -1.6, .08, .1], [ev.esq[2] - .02, ev.esq[2] + .16, 2.5, -3.9, .1, 1], [t0.msg - .1, t0.msg + .3, R2[0], R2[1], R2[2], .6],
  // la lupa sale de la mesa a buscar
  [ev.lupa - .1, ev.lupa + .5, 1.5, -.5, 1.2, .3], [t0.rest - .1, t0.rest + .5, 3.5, 2.3, 1, .3], [ev.pag[0] + .1, ev.pag[0] + .7, R2[0], R2[1], R2[2], .6],
  // el sello
  [ev.sello - .85, ev.sello - .32, .8, -2.4, 3, .2], [ev.sello - .1, ev.sello, .2, -2.75, .62, .1], [ev.sello + .22, ev.sello + .6, R2[0], R2[1], R2[2], .6],
];
const M1b: Tr[] = [
  [ev.slip[0] - .3, ev.slip[0] + .05, -3.4, -.8, .4, 1], [ev.slip[0] + .2, ev.slip[0] + .4, -4.2, -1.2, .1, .1], [ev.slip[1] - .1, ev.slip[1] + .3, R1[0], R1[1], R1[2], .6],
  [ev.pela[0] - .1, ev.pela[0] + .3, -1.7, -4.7, .1, .5], [ev.entierra[0], ev.entierra[0] + .5, R1[0], R1[1], R1[2], .6],
  [t0.conf, t0.conf + .4, .3, -3.2, .6, .9], [t0.aunque, t0.aunque + .5, R1[0], R1[1], R1[2], .6],
  [ev.pasoF + .4, ev.pasoF + .9, -1.2, -3.1, .1, .9],
];
const M2b: Tr[] = [
  [ev.slip[1] - .25, ev.slip[1] + .1, 3.5, -1.5, .4, 1], [ev.slip[1] + .25, ev.slip[1] + .45, 4.3, -2, .1, .1], [ev.slip[1] + .55, ev.slip[1] + .95, R2[0], R2[1], R2[2], .6],
  [ev.pela[0] - .1, ev.pela[0] + .3, 1.3, -4.7, .1, .5], [ev.entierra[0], ev.entierra[0] + .5, R2[0], R2[1], R2[2], .6],
  [t0.conf + .1, t0.conf + .5, -.7, -3.3, .7, .9], [t0.aunque, t0.aunque + .5, R2[0], R2[1], R2[2], .6],
  [ev.barre - .6, ev.barre - .3, R2[0], R2[1], R2[2], .6], [ev.pasoF + .45, ev.pasoF + .9, 1.3, -3.2, .1, .9], [ev.palomita - .2, ev.palomita, NOTA_F.x + 1.8, NOTA_F.y + .55, .08, .1], [ev.palomita + .2, ev.palomita + .5, 1.3, -3.25, .1, .9],
];
const M1T = [...M1, ...M1b].sort((a, b) => a[0] - b[0]), M2T = [...M2, ...M2b].sort((a, b) => a[0] - b[0]);
const INI1: [number, number, number, number] = [-1.5, -2.2, 1.7, 1], INI2: [number, number, number, number] = [2.1, -3, 1, 1];
const ultimo = (t: number) => { let u = -1; for (const p of PASOS) if (p[0] <= t) u = p[0]; return u; };
function sueno(t: number) {
  let v = 0;
  for (const [p] of PASOS) v = Math.max(v, smooth(prog(t, p - .24, p)) * (1 - smooth(prog(t, p + .1, p + .2))));
  return v;
}
function manosEn(t: number) {
  const a2 = ruta(t, INI1, M1T), b2 = ruta(t, INI2, M2T);
  const tor = smooth(prog(t, t0.vuelve - .1, t0.vuelve + .4)) * (1 - smooth(prog(t, t0.olvida - .4, t0.olvida - .1)));
  const conf = smooth(prog(t, t0.acabar, t0.conf + .2)) * (1 - smooth(prog(t, t0.aunque - .1, t0.aunque + .3)));
  const j = .07 + tor * .5 + conf * .55, sn = sueno(t);
  a2[0] += vaiven(t, 1.37) * j + (tor + conf) * Math.sin(t * 13) * .25; a2[1] += vaiven(t, 1.13, 1) * j; a2[3] = lerp(a2[3], .2, sn);
  b2[0] += vaiven(t, 1.21, 2) * j - (tor + conf) * Math.sin(t * 11) * .3; b2[1] += vaiven(t, 1.49, 3) * j; b2[3] = lerp(b2[3], .2, sn);
  a2[2] *= 1 - sn * .7; b2[2] *= 1 - sn * .7;
  return [a2, b2];
}
function bolaEn(t: number): P3 {
  let z = B0[2] + vaiven(t, 1.9) * .05, x = B0[0] + vaiven(t, 3.3) * .07, y = B0[1];
  const u = ultimo(t);
  if (u >= 0) { const k = (t - u - .1) / .5; z += salto(k, .7); }
  z -= sueno(t) * .22;
  for (const [ti, h] of [[ev.todo, 1], [BAM, 1.5], [ev.sello, .3], [ev.F[2], .25]]) { const k = (t - ti) / .42; z += salto(k, h); }
  const conf = smooth(prog(t, t0.conf - .2, t0.conf + .2)) * (1 - smooth(prog(t, t0.aunque - .05, t0.aunque + .25)));
  x += Math.sin(t * 8) * .2 * conf;
  return [x, y, z];
}
function corbata(c: C, x: number, y: number, r: number, a: number, alfa: number) {
  if (alfa <= .01) return;
  c.save(); c.translate(x, y - r * .08); c.rotate(a); c.globalAlpha = alfa; c.scale(r / 94, r / 94);
  c.fillStyle = ACENTO; c.strokeStyle = TINTA; c.lineWidth = 3; c.lineJoin = "round";
  c.beginPath(); c.moveTo(-20, -56); c.lineTo(20, -56); c.lineTo(13, -26); c.lineTo(-13, -26); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-13, -26); c.lineTo(13, -26); c.lineTo(28, 58); c.lineTo(0, 84); c.lineTo(-28, 58); c.closePath(); c.fill(); c.stroke();
  c.strokeStyle = "rgba(253,252,248,.5)"; c.lineWidth = 5; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-19 - i * 3, 2 + i * 26); c.lineTo(19 + i * 3, 18 + i * 26); c.stroke(); }
  c.restore();
}
function destello(c: C, x: number, y: number, e0: number, alfa: number) {
  if (alfa <= .01 || e0 <= 0) return;
  c.save(); c.translate(x, y); c.rotate(.2); c.globalAlpha = alfa; c.fillStyle = "#fff"; c.strokeStyle = TINTA; c.lineWidth = 3;
  c.beginPath();
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.2832, l = i % 2 ? e0 * .14 : e0; if (i) c.lineTo(Math.cos(a) * l, Math.sin(a) * l); else c.moveTo(Math.cos(a) * l, Math.sin(a) * l); }
  c.closePath(); c.fill(); c.stroke(); c.restore();
}
function brilloEn(t: number) {
  const a = (t: number, ti: number) => (t < ti ? 0 : resorte(t - ti, 5, .4) * (1 - smooth(prog(t, ti + .75, ti + 1.05))));
  return Math.max(a(t, t0.brill + .05), a(t, t0.empezar + .3));
}
function laBola(c: C, cam: Cam, t: number, osc: number) {
  const b = bolaEn(t), p = cam.p(b[0], b[1], b[2]); if (!p) return;
  const r = RB * p.s;
  if (osc > 0) {                                                     // la bola se queda fuera de la luz: su charco de luz tenue
    const pz = cam.p(b[0], b[1] - .1, -1.4) ?? p, R = r * 2.5;
    const g = c.createRadialGradient(pz.x, pz.y, r * .2, pz.x, pz.y, R);
    g.addColorStop(0, `rgba(176,158,126,${.62 * osc})`); g.addColorStop(.55, `rgba(120,104,80,${.3 * osc})`); g.addColorStop(1, "rgba(120,104,80,0)");
    c.fillStyle = g; c.beginPath(); c.arc(pz.x, pz.y, R, 0, 7); c.fill();
  } else { const pz = cam.p(b[0] + .3, b[1] - .3, PISO + .1); if (pz) sombra(c, pz.x, pz.y, r * 1.5, .22); }
  const [m1, m2] = manosEn(t), q1 = cam.p(m1[0], m1[1], m1[2]), q2 = cam.p(m2[0], m2[1], m2[2]);
  if (!q1 || !q2) return;
  // despierta de golpe: se estira, cae aplastada y vuelve; antes de cada paso se hunde
  const u0 = ultimo(t), w = u0 >= 0 ? t - u0 - .1 : 9, sn = sueno(t);
  const est = w > 0 && w < .75 ? Math.sin(Math.min(w / .5, 1) * Math.PI) * Math.exp(-w * 2.4) * .2 - (w > .45 ? Math.sin((w - .45) / .3 * Math.PI) * .07 : 0) : 0;
  const sx = 1 - est * .8 + sn * .06, sy = 1 + est - sn * .08;
  c.save(); c.translate(p.x, p.y + r); c.scale(sx, sy); c.translate(-p.x, -p.y - r);
  agente(c, p.x, p.y, r, [q1.x, q1.y], [q2.x, q2.y], { abre1: m1[3], abre2: m2[3] });
  c.restore();
  if (w > .02 && w < .5) {
    const a = 1 - w / .5;
    c.save(); c.strokeStyle = osc > .5 ? LUZ : TINTA; c.globalAlpha = a; c.lineWidth = Math.max(4, r * .06); c.lineCap = "round";
    for (const an of [-2.1, -1.57, -1.04]) { const r0 = r * (1.25 + w * .9), r1 = r0 + r * .32; c.beginPath(); c.moveTo(p.x + Math.cos(an) * r0, p.y + Math.sin(an) * r0); c.lineTo(p.x + Math.cos(an) * r1, p.y + Math.sin(an) * r1); c.stroke(); }
    c.restore();
  }
  if (osc > 0) { c.strokeStyle = `rgba(255,240,214,${.5 * osc})`; c.lineWidth = Math.max(2.5, r * .03); c.lineCap = "round"; c.beginPath(); c.arc(p.x, p.y, r - 1, 3.5, 5.9); c.stroke(); }
  const sal = t >= t0.empl ? ease.outBack(prog(t, t0.empl, t0.empl + .3)) : 0;
  corbata(c, p.x, p.y, r, vaiven(t, 1.3) * .06 + (t - ultimo(t) < .5 ? Math.sin((t - ultimo(t)) * 22) * .22 * (1 - (t - ultimo(t)) * 2) : 0), clamp(sal));
  const br = brilloEn(t);
  destello(c, p.x - r * .5, p.y - r * .55, br * r * .95, 1);
  destello(c, p.x + r * .62, p.y + r * .2, br * r * .42, .9);
  // herramientas en mano
  if (t > ev.lupa && t < ev.pag[0] + .4) { const a = smooth(prog(t, ev.lupa, ev.lupa + .2)) * (1 - smooth(prog(t, ev.pag[0], ev.pag[0] + .3))); c.save(); c.globalAlpha = a; c.lineWidth = 4; const e0 = q2.s / 100 * 1.5; c.fillStyle = "rgba(255,255,255,.14)"; c.beginPath(); c.arc(q2.x - 2 * e0, q2.y - 78 * e0, 34 * e0, 0, 7); c.fill(); lupaD(c, q2.x, q2.y - 70 * e0, e0, osc > .5 ? LUZ : TINTA); c.restore(); }
  if (t > ev.sello - .85 && t < ev.sello + .55) {
    const a = smooth(prog(t, ev.sello - .85, ev.sello - .7)) * (1 - smooth(prog(t, ev.sello + .35, ev.sello + .55)));
    const e0 = q2.s / 100;
    c.save(); c.globalAlpha = a; c.translate(q2.x - 2 * e0, q2.y + 6 * e0); c.rotate(.1);
    c.fillStyle = TINTA; c.strokeStyle = LUZ; c.lineWidth = 3; c.beginPath(); c.roundRect(-126 * e0, -50 * e0, 252 * e0, 100 * e0, 12 * e0); c.fill(); c.stroke();
    c.fillStyle = ACENTO; c.beginPath(); c.arc(0, 0, 36 * e0, 0, 7); c.fill(); c.restore();
  }
  const am = smooth(prog(t, t0.mismo - .5, t0.mismo - .2)) * (1 - smooth(prog(t, t0.hoy - .3, t0.hoy)));
  if (am > 0) { c.save(); c.globalAlpha = am; c.strokeStyle = ROJO; c.lineWidth = 7; c.setLineDash([3, 19]); c.lineCap = "round"; c.lineDashOffset = -t * 70; c.beginPath(); c.arc(p.x, p.y, r * 1.34, 0, 7); c.stroke(); c.restore(); }
  // ¿y yo qué hacía?
  const u = ultimo(t);
  if (u >= 0) {
    const sig = PASOS.find((q) => q[0] > u)?.[0] ?? 1e9, dur = Math.min(1.15, sig - u - .15), ed = t - u - .12;
    if (ed > 0 && ed < dur) {
      const kk = resorte(ed, 5.5, .42) * (1 - smooth(prog(ed, dur - .16, dur)));
      c.save(); c.translate(p.x + r * 1.42, p.y - r * .9); c.scale(kk, kk);
      texto(c, "?", 0, 0, { fuente: serif(190 * Math.min(1.25, r / 94), true), color: osc > .5 ? ROJO : ACENTO, base: "middle" });
      c.restore();
    }
  }
  // confundido: las preguntas se le amontonan
  const nf = smooth(prog(t, t0.conf - .1, t0.conf + .3)) * (1 - smooth(prog(t, t0.aunque, t0.aunque + .25)));
  if (nf > 0) for (let i = 0; i < 6; i++) {
    const a = t * (1.9 + i * .1) + i * 1.05;
    texto(c, "?", p.x + Math.cos(a) * r * (1.75 + .2 * Math.sin(t * 3 + i)), p.y + Math.sin(a) * r * 1.5 - r * .1, { fuente: serif(96 + i * 10, true), color: ROJO, alfa: nf, base: "middle" });
  }
}

// ---------- la mano que sirve la mesa ----------
const G0: [number, number, number, number] = [-13, -.6, 2.6, .5];
const GR: Tr[] = [
  [ev.todo - 1, ev.todo - .24, .1, -.9, 2.6, .4], [ev.todo + .2, ev.todo + .68, G0[0], G0[1], G0[2], .5],
  [ev.quita - .55, ev.quita - .12, .1, -.9, 1.5, .4], [ev.quita + .02, ev.quita + .5, G0[0], G0[1], G0[2], .5],
  [ev.quitaM - .5, ev.quitaM - .06, -1.6, -1.2, .7, .1], [ev.quitaM - .03, ev.quitaM + .08, .6, -1.1, .7, 1], [ev.quitaM + .24, ev.quitaM + .7, G0[0], G0[1], G0[2], .5],
  [ev.entra - 1.05, ev.entra - .22, .3, .9, 2, .3], [ev.entra + .02, ev.entra + .3, G0[0], G0[1], G0[2], .6],
  [ev.sale - .46, ev.sale - .04, 2, .9, .7, .9], [ev.sale + .02, ev.sale + .4, G0[0], G0[1], G0[2], .2],
  [ev.sale + .62, ev.sale + .98, -1, -1.2, 2.3, .3], [ev.cuando - .16, ev.cuando + .08, -1, -1.2, 2.4, 1], [ev.cuando + .22, ev.cuando + .6, G0[0], G0[1], G0[2], .6],
  [ev.barre - .55, ev.barre - .04, -6.2, -1.6, .9, 1], [ev.barre + .06, ev.barre + .68, 6.4, -1.3, 1, 1], [ev.barre + .86, ev.barre + 1.4, G0[0], G0[1], G0[2], .6],
  [ev.notaF - 1.05, ev.notaF - .2, NOTA_F.x + .25, NOTA_F.y + .3, 1.6, .3], [ev.notaF + .05, ev.notaF + .55, G0[0], G0[1], G0[2], .6],
];
function manoG(t: number) { return ruta(t, G0, GR); }
function manoGrande(c: C, cam: Cam, t: number) {
  const m = manoG(t), p = cam.p(m[0], m[1], m[2]); if (!p || m[0] < -12.6) return;
  const x0 = -320, y0 = 1120 + (p.y - 900) * .3, g = 2 * p.s / 100, dob = 70 * Math.sin(t * .7 + .4) + 90;
  brazo(c, x0, y0, p.x, p.y, dob, m[3], TINTA, 1, g * 1.16);
  brazo(c, x0, y0, p.x, p.y, dob, m[3], "#F7F4EC", 1, g);
}

// ---------- el bloque de "todo" ----------
function bloque(c: C, cam: Cam, t: number, d: D) {
  if (t < ev.todo - .96 || t > ev.quita + .46) return;
  const BW = 3.8, BH = 4.7, BZ = 1.1, m = manoG(t);
  let x = .1, y = -.9, z = 0, aplasta = 1;
  if (t < ev.todo - .2) { x = m[0] + .1; y = m[1]; z = m[2] - BZ * .9; } else if (t < ev.todo) { const k = prog(t, ev.todo - .2, ev.todo); z = lerp(1.6, 0, k * k); } else if (t > ev.quita) { x = m[0] + .1; y = m[1]; z = m[2] - BZ; } else { const a = t - ev.todo; aplasta = 1 - .22 * Math.exp(-a * 11) * Math.cos(a * 34); }
  const zt = z + BZ * aplasta;
  const S = esquinas(x + .1 + z * .17, y - .12 - z * .14, .003, BW, BH, -.02);
  poli(c, cam, S, `rgba(28,20,12,${clamp(.38 - z * .05, .1, .38)})`);
  const P = esquinas(x, y, zt, BW, BH, -.02), P0 = esquinas(x, y, z, BW, BH, -.02);
  for (const [i, j] of [[3, 2], [2, 1], [0, 3]]) {
    poli(c, cam, [P[i], P[j], P0[j], P0[i]], "#E6E1D4", TINTA, 2.5);
    for (let k = 1; k < 8; k++) { const f = k / 8; lin(c, cam, [lerp(P[i][0], P0[i][0], f), lerp(P[i][1], P0[i][1], f), lerp(P[i][2], P0[i][2], f)], [lerp(P[j][0], P0[j][0], f), lerp(P[j][1], P0[j][1], f), lerp(P[j][2], P0[j][2], f)], 1.4, "rgba(17,17,17,.5)"); }
  }
  poli(c, cam, P, BLANCO, TINTA, 3.4, .8);
  const Q = P.map((p) => cam.p(p[0], p[1], p[2]));
  if (Q.every(Boolean)) imagen(c, Q as NonNullable<(typeof Q)[0]>[], d.spr.res);
  // hojeo: cada página se levanta y pasa
  ev.hojeo.forEach((ti, i) => {
    const a = t - ti; if (a < 0 || a > .26) return;
    const k = a / .26, an = k * 3.05, sn = Math.sin(an), cs = Math.cos(an), xL = x - BW / 2, yT = y + BH / 2, yB = y - BH / 2, ww = BW * (1 - .62 * sn);
    const Pg: P3[] = [[xL, yT, zt + .02], [xL + ww * cs, yT, zt + .02 + ww * sn], [xL + ww * cs, yB, zt + .02 + ww * sn], [xL, yB, zt + .02]];
    c.save(); c.globalAlpha = 1 - smooth(prog(k, .55, .8));
    poli(c, cam, Pg, cs > 0 ? BLANCO : "#EFEAE0", TINTA, 2.5, .6);
    const Q2 = Pg.map((p) => cam.p(p[0], p[1], p[2]));
    if (cs > .1 && Q2.every(Boolean)) imagen(c, Q2 as NonNullable<(typeof Q2)[0]>[], d.spr[VARIAS[i % 8]]);
    c.restore();
  });
}

// ---------- leer la mesa: la mirada barre solo lo que hay encima ----------
function mesaEnPantalla(cam: Cam) {
  const Q = ([[-W, H, 0], [W, H, 0], [W, -H, 0], [-W, -H, 0]] as P3[]).map((p) => cam.p(p[0], p[1], p[2]));
  return Q.every(Boolean) ? (Q as NonNullable<(typeof Q)[0]>[]) : null;
}
function lectura(c: C, cam: Cam, t: number) {
  const b = bolaEn(t), p = cam.p(b[0], b[1], b[2]), M = mesaEnPantalla(cam);
  if (!p || !M) return;
  for (const [ti, l] of PASOS) {
    if (l <= 0) continue;
    const a = ti + .22, k = prog(t, a, a + l);
    if (k <= 0 || k >= 1) continue;
    const env = smooth(k / .14) * smooth((1 - k) / .14), ang = -1.5708 + lerp(-.72, .72, k), med = .2, R = 2400;
    c.save(); c.beginPath(); M.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y))); c.closePath(); c.clip();
    c.fillStyle = `rgba(22,15,8,${.36 * env})`;
    c.beginPath(); c.rect(-60, -60, 1200, 2040); c.moveTo(p.x, p.y); c.lineTo(p.x + Math.cos(ang - med) * R, p.y + Math.sin(ang - med) * R); c.lineTo(p.x + Math.cos(ang + med) * R, p.y + Math.sin(ang + med) * R); c.closePath(); c.fill("evenodd");
    c.globalAlpha = env; c.strokeStyle = ACENTO; c.lineWidth = 5; c.setLineDash([3, 18]); c.lineCap = "round"; c.lineDashOffset = -t * 130;
    c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + Math.cos(ang) * R, p.y + Math.sin(ang) * R); c.stroke();
    c.restore();
  }
}

// ---------- la prensa ----------
function prensa(c: C, cam: Cam, t: number) {
  const z = zPrensa(t); if (z > 16.9 && t < BAM) return; if (t > BAM + 1.25) return;
  const PW = 4.85, PD = 4.85, G = 1.15, zt = z + G;
  for (const [x, y] of [[-2.9, 1], [2.9, 1]]) lin(c, cam, [x, y, zt], [x, y, zt + 26], 30, "#3b3b38");
  const q = (x: number, y: number, h: number): P3 => [x, y, h];
  poli(c, cam, [q(-PW, PD, zt), q(PW, PD, zt), q(PW, -PD, zt), q(-PW, -PD, zt)], "#232321", "#000", 2);
  if (cam.pos[0] > PW) poli(c, cam, [q(PW, -PD, zt), q(PW, PD, zt), q(PW, PD, z), q(PW, -PD, z)], "#101010", "#000", 2);
  if (cam.pos[0] < -PW) poli(c, cam, [q(-PW, -PD, zt), q(-PW, PD, zt), q(-PW, PD, z), q(-PW, -PD, z)], "#101010", "#000", 2);
  const fr: P3[] = [q(-PW, -PD, zt), q(PW, -PD, zt), q(PW, -PD, z), q(-PW, -PD, z)];
  poli(c, cam, fr, "#171716", LUZ, 2.5);
  const Q = fr.map((p) => cam.p(p[0], p[1], p[2]));
  if (Q.every(Boolean)) {
    const [a, b, cc, d] = Q as NonNullable<(typeof Q)[0]>[];
    c.save(); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(cc.x, cc.y); c.lineTo(d.x, d.y); c.closePath(); c.clip();
    c.fillStyle = ACENTO; const tira = (b.x - a.x) / 26;
    for (let i = -2; i < 30; i += 2) { const x = a.x + i * tira; c.beginPath(); c.moveTo(x, a.y - 10); c.lineTo(x + tira, a.y - 10); c.lineTo(x + tira - 18, a.y + 30); c.lineTo(x - 18, a.y + 30); c.closePath(); c.fill(); }
    c.restore();
    c.save(); c.transform((b.x - a.x) / 1000, (b.y - a.y) / 1000, (d.x - a.x) / 130, (d.y - a.y) / 130, a.x, a.y);
    texto(c, "RESUMEN", 500, 104, { fuente: mono(74), color: LUZ, esp: 16 }); c.restore();
  }
}
function trozos(c: C, cam: Cam, t: number) {
  const a = t - BAM; if (a < 0 || a > 2.6) return;
  const r = azar(11);
  for (let i = 0; i < 170; i++) {
    const lado = r() * 4, u = r() * 2 - 1;
    const x0 = lado < 1 ? -W : lado < 2 ? W : u * W, y0 = lado < 2 ? u * H : lado < 3 ? -H : H, an = Math.atan2(y0, x0) + (r() - .5) * 1.1;
    const v = 3 + r() * 11, vz = 1 + r() * 8, tam = .1 + r() * .24, gi = (r() - .5) * 15, roj = i % 11 === 0;
    const z = .3 + vz * a - 7 * a * a; if (z < -9) continue;
    const p = cam.p(x0 + Math.cos(an) * v * a * (1 - a * .2), y0 + Math.sin(an) * v * a * (1 - a * .2), z); if (!p) continue;
    const e0 = tam * p.s;
    c.save(); c.translate(p.x, p.y); c.rotate(gi * a); c.globalAlpha = 1 - smooth(prog(a, 1.5, 2.6));
    c.fillStyle = roj ? ACENTO : BLANCO; c.strokeStyle = TINTA; c.lineWidth = 2; c.beginPath(); c.rect(-e0 / 2, -e0 * .36, e0, e0 * .72); c.fill(); c.stroke(); c.restore();
  }
}
/** El pedazo que se pierde: sale disparado de la prensa, cae por el borde y se apaga en el vacío. */
function fragEst(t: number) {
  const a = t - BAM, k = prog(t, t0.algo - .1, t0.algo + 2.1);
  const sube = 1 - Math.exp(-a * 2.1), lado = smooth(k / .62);
  const x = lerp(lerp(3.3, 2.1, sube), 3.45, smooth(k / .28)) - lerp(0, .4, smooth(prog(k, .5, .8))) + vaiven(t, 1.7) * .08;
  const y = lerp(lerp(-1.6, 2.05, sube), -5.75, lado);
  const z = lerp(.2, 2.7, sube) - 12 * k * k + vaiven(t, 1.3) * .12;
  return { x, y, z, r: .14 + Math.sin(a * 1.5) * .07 + k * k * 2, ix: Math.sin(a * 1.9) * .14, iy: Math.cos(a * 1.6) * .16, k };
}
function fragmento(c: C, cam: Cam, t: number, d: D) {
  const f = fragEst(t);
  const P = esquinas(f.x, f.y, f.z, 2.7, 1.47, f.r, f.ix, f.iy), Q = P.map((p) => cam.p(p[0], p[1], p[2]));
  if (!Q.every(Boolean)) return;
  const al = 1 - smooth(prog(f.k, .78, 1));
  if (f.z > .2) { const dz = f.z - .06; poli(c, cam, esquinas(f.x + .06 + dz * .17, f.y - .08 - dz * .14, .06, 2.7 * (1 + dz * .02), 1.47 * (1 + dz * .02), f.r), `rgba(20,14,8,${clamp(.34 - dz * .03, .08, .34) * al})`); }
  c.save(); c.globalAlpha = al; imagen(c, Q as NonNullable<(typeof Q)[0]>[], d.spr.fra); c.restore();
}

/** Lo mágico brilla mientras cae. Aterriza y no pasa nada. */
function chispas(c: C, cam: Cam, t: number) {
  const a = ev.magica - 1.7; if (t < a || t > ev.magica + .5) return;
  const st = estado(LA_MAGICA, t); if (!st) return;
  const r = azar(41), sale = 1 - smooth(prog(t, ev.magica, ev.magica + .45));
  for (let i = 0; i < 16; i++) {
    const an = r() * 6.28, ra = 1.5 + r() * 1.3, f = r() * 6.28, v = 3 + r() * 5;
    const p = cam.p(st.x + Math.cos(an) * ra * 1.25, st.y + Math.sin(an) * ra * .9, st.z + .1); if (!p) continue;
    const e0 = (Math.sin(t * v + f) * .5 + .5) ** 2 * (.16 + r() * .22) * p.s * sale;
    destello(c, p.x, p.y, e0, sale);
  }
}

// ---------- texto que tropieza ----------
function torpe(c: C, t: number, ini: number, fin: number, s0: string, y: number, px: number, color: string) {
  const al = smooth(prog(t, ini - .04, ini + .12)) * (1 - smooth(prog(t, fin, fin + .2))); if (al <= 0) return;
  c.font = serif(px, true);
  const an = [...s0].map((l) => c.measureText(l).width), tot = an.reduce((a, b) => a + b, 0);
  let x = 540 - tot / 2;
  [...s0].forEach((l, i) => {
    const r = azar(i + 3), g0 = (r() - .5) * .5, dy = (r() - .5) * 46, tp = t - ini - i * .05;
    const cae = Math.exp(-Math.max(tp, 0) * 2.2);
    c.save(); c.translate(x + an[i] / 2, y + lerp(dy, 0, cae) + Math.sin(t * 7 + i * 2) * 6); c.rotate(lerp(g0, 0, cae) + Math.sin(t * 5 + i) * .04);
    texto(c, l, 0, 0, { fuente: serif(px, true), color, alfa: al }); c.restore();
    x += an[i];
  });
}

// ---------- cámara ----------
const V: Record<string, Vista> = {
  cerca: { tx: .05, ty: -2.9, tz: 0, yaw: 0, pitch: 1.22, dist: 7.9 }, abre: { tx: .4, ty: -2.2, tz: 0, yaw: 0, pitch: 1.3, dist: 10.6 },
  bola: { tx: -.2, ty: -3.9, tz: 0, yaw: 0, pitch: 1.18, dist: 7.2 }, larga: { tx: 0, ty: -1, tz: 0, yaw: 0, pitch: 1.4, dist: 11.6 },
  tira: { tx: 0, ty: -1.1, tz: 0, yaw: 0, pitch: 1.36, dist: 11 }, lejos: { tx: 0, ty: -1, tz: 0, yaw: 0, pitch: 1.42, dist: 12.1 },
  mete: { tx: 0, ty: -1.1, tz: 0, yaw: 0, pitch: 1.37, dist: 11.2 }, cang: { tx: .2, ty: -2.2, tz: 0, yaw: 0, pitch: 1.36, dist: 7.6 },
  sobre: { tx: NOTA.x, ty: NOTA.y, tz: 0, yaw: 0, pitch: 1.5533, dist: 10 }, nota: { tx: NOTA.x, ty: NOTA.y + .3, tz: 0, yaw: 0, pitch: 1.5533, dist: 6.1 },
  baja: { tx: 0, ty: -.6, tz: 1.5, yaw: -.3, pitch: .3, dist: 13.6 }, arriba: { tx: 0, ty: -1, tz: 0, yaw: 0, pitch: 1.46, dist: 11.8 },
  cierre: { tx: .1, ty: -1.25, tz: 0, yaw: 0, pitch: 1.38, dist: 11 }, empuja: { tx: .1, ty: -1.2, tz: 0, yaw: .045, pitch: 1.37, dist: 10.6 },
  gira1: { tx: 0, ty: -1.05, tz: 0, yaw: .075, pitch: 1.38, dist: 11.4 }, gira2: { tx: 0, ty: -1, tz: 0, yaw: -.055, pitch: 1.43, dist: 11.7 }, lejos2: { tx: 0, ty: -.9, tz: 0, yaw: 0, pitch: 1.42, dist: 12.6 },
};
const CL = [
  { t: 0, v: V.cerca }, { t: ev.tira - .3, dur: 1, v: V.abre }, { t: ev.quita - .1, dur: .8, v: V.bola }, { t: t0.frente - .1, dur: 1.2, v: V.larga },
  { t: ev.tira2 - 1.4, dur: 1, v: V.tira }, { t: t0.msg - .3, dur: 4.6, v: V.empuja, curva: smooth }, { t: ev.pag[0] - .3, dur: 1.2, v: V.lejos }, { t: t0.raro, dur: 4, v: V.mete, curva: smooth },
  { t: t0.olvida - .1, dur: 1.2, v: V.cang }, { t: ev.pela[0] - .04, dur: .36, v: V.sobre }, { t: ev.pela[0] + .3, dur: .95, v: V.nota, curva: ease.outCubic },
  { t: ev.entierra[0], dur: 1.15, v: V.baja }, { t: BAM + 1.05, dur: 1, v: V.arriba }, { t: t0.por, dur: 1.2, v: V.larga }, { t: t0.hoy - .3, dur: 2.2, v: V.gira1 }, { t: t0.ing - .1, dur: 1.3, v: V.gira2, curva: ease.outCubic },
  { t: t0.nog - .2, dur: 1.4, v: V.lejos2 }, { t: ev.barre + 1.2, dur: 2, v: V.larga }, { t: ev.notaF + .4, dur: 2.2, v: V.cierre },
];
const GOLPES = ev.golpes as [number, number][];
function sacude(t: number) {
  let x = 0, y = 0, z = 0;
  for (const [ti, a] of GOLPES) {
    const d = t - ti; if (d < 0 || d > 1) continue;
    const e0 = a * Math.exp(-d * 8.5);
    x += e0 * 11 * Math.sin(d * 71); y += e0 * 13 * Math.cos(d * 57); z += e0 * .008;
  }
  return { x, y, z };
}
function camaraDe(t: number) {
  const v = guionCamara(t, CL);
  const q = 1 - smooth(prog(t, ev.pela[0], ev.pela[0] + .3)) * (1 - smooth(prog(t, ev.entierra[0], ev.entierra[0] + .4))) * .8;
  const r: Vista = { ...v, yaw: v.yaw + q * .02 * vaiven(t, 7.3), pitch: Math.min(1.5533, v.pitch + q * .018 * vaiven(t, 9.1, 1)), dist: v.dist * (1 + q * .024 * vaiven(t, 6.1, 2)), tx: v.tx + q * .11 * vaiven(t, 8.3), ty: v.ty + q * .09 * vaiven(t, 5.3, 1) };
  return camara(r, 540, 960, 1250);
}

// ---------- rótulos ----------
function rotulos(c: C, t: number) {
  rotulo(c, t, t0.memoria, ev.tira - .34, "la memoria", 215, 122, TINTA, false);
  rotulo(c, t, t0.de, ev.tira - .34, "de un pez", 350, 166, ACENTO, true);
  rotulo(c, t, t0.todo, t0.lee - .06, "todo", 270, 200, ACENTO, true);
  rotulo(c, t, t0.lee, ev.quita - .25, "lo lee", 170, 104, TINTA, false);
  rotulo(c, t, t0.desde, ev.quita - .25, "desde cero", 305, 150, ACENTO, true);
  rotulo(c, t, t0.empl, t0.desp - .2, "empleado brillante", 240, 112, TINTA, true);
  rotulo(c, t, t0.sin, t0.frente - .16, "sin recuerdos", 225, 134, ACENTO, true);
  rotulo(c, t, t0.cadaP, t0.frente - .16, "cada pocos segundos", 350, 100, TINTA, false);
  rotulo(c, t, t0.unico, t0.instr - .3, "lo único que sabe", 215, 110, LUZ, false);
  rotulo(c, t, t0.encima, t0.instr - .3, "lo que hay encima", 335, 106, ROJO, true);
  rotulo(c, t, t0.instr, t0.herr - .14, "sus instrucciones", 280, 116, LUZ, true);
  rotulo(c, t, t0.herr, t0.plat - .12, "sus herramientas", 280, 116, LUZ, true);
  rotulo(c, t, t0.plat, t0.arch - .14, "lo que ya platicaron", 280, 102, LUZ, true);
  rotulo(c, t, t0.arch, t0.ctx - .4, "los archivos que abrió", 280, 104, LUZ, true);
  rotulo(c, t, t0.ctx, t0.mesa2 - .2, "contexto", 300, 176, ROJO, true);
  rotulo(c, t, t0.tam, t0.msg - .2, "tamaño fijo", 300, 160, LUZ, false);
  rotulo(c, t, t0.msg, t0.res - .16, "cada mensaje", 205, 106, LUZ, false);
  rotulo(c, t, t0.ocupa, t0.res - .16, "ocupa espacio", 325, 106, ROJO, true);
  rotulo(c, t, t0.res, t0.va - .24, "cada resultado", 205, 106, LUZ, false);
  rotulo(c, t, t0.ocupa2, t0.va - .24, "ocupa espacio", 325, 106, ROJO, true);
  rotulo(c, t, t0.rest - .05, ev.pag[0] - .1, "restaurantes", 290, 130, LUZ, true);
  const n = ev.pag.filter((q) => q <= t).length;
  if (t >= ev.pag[0] && t < t0.llena + .3) { const a = 1 - smooth(prog(t, t0.llena + .08, t0.llena + .26)); texto(c, String(n), 400, 300, { fuente: serif(190, true), color: ROJO, alin: "right", alfa: a }); texto(c, "páginas", 430, 300, { fuente: serif(104), color: LUZ, alin: "left", alfa: a }); }
  rotulo(c, t, t0.llena + .28, t0.raro - .3, "se llena", 300, 150, LUZ, true);
  rotulo(c, t, t0.algoR - .1, t0.nof - .12, "algo raro", 300, 140, ROJO, true);
  rotulo(c, t, t0.nof, t0.vuelve - .2, "no falla de golpe", 300, 118, LUZ, false);
  rotulo(c, t, t0.vuelve, t0.olvida - .36, "se vuelve", 178, 104, LUZ, false);
  torpe(c, t, t0.torpe - .1, t0.olvida - .36, "torpe", 335, 180, ROJO);
  rotulo(c, t, t0.abajo, ev.entierra[0] - .26, "hasta abajo", 250, 150, LUZ, true);
  rotulo(c, t, t0.cabe - .32, ev.prensa + .2, "ya no cabe nada", 210, 112, LUZ, false);
  rotulo(c, t, t0.algo, t0.por - .3, "algo se pierde", 270, 136, ROJO, true);
  rotulo(c, t, t0.empezar, t0.acabar - .1, "empezar brillante", 280, 118, LUZ, true);
  rotulo(c, t, t0.acabar, t0.aunque - .1, "acabar confundido", 280, 118, ROJO, true);
  rotulo(c, t, t0.aunque, t0.hoy - .34, "el mismo modelo", 280, 124, LUZ, false);
  rotulo(c, t, t0.prompts - .08, t0.habla - .3, "prompts mágicos", 290, 124, LUZ, true);
  const kt = smooth(prog(t, t0.magF - .2, t0.magF + .1));
  if (kt > 0 && t < t0.habla - .1) { c.save(); c.globalAlpha = 1 - smooth(prog(t, t0.habla - .3, t0.habla - .1)); c.strokeStyle = ROJO; c.lineWidth = 13; c.lineCap = "round"; c.beginPath(); c.moveTo(150, 270); c.lineTo(lerp(150, 930, kt), lerp(270, 250, kt)); c.stroke(); c.restore(); }
  rotulo(c, t, t0.ing, t0.qe - .16, "ingeniería", 205, 126, LUZ, false);
  rotulo(c, t, t0.ing + .36, t0.qe - .16, "de contexto", 335, 126, ROJO, true);
  rotulo(c, t, t0.qe, t0.qs - .14, "qué entra", 300, 140, LUZ, true);
  rotulo(c, t, t0.qs, t0.yc - .1, "qué sale", 300, 140, LUZ, true);
  rotulo(c, t, t0.yc, t0.nog - .36, "y cuándo", 300, 140, ROJO, true);
  rotulo(c, t, t0.mas, t0.gana - .3, "más información", 290, 124, LUZ, false);
  rotulo(c, t, t0.gana, t0.solo - .12, "gana quien le deja", 210, 106, LUZ, false);
  rotulo(c, t, t0.sobre, t0.solo - .12, "sobre la mesa", 330, 124, ROJO, true);
  const finT = DURACION;
  rotulo(c, t, t0.solo, finT, "solo lo que", 170, 112, LUZ, false);
  rotulo(c, t, t0.imp - .02, finT, "importa", 310, 168, ROJO, true);
}

// ---------- la escena ----------
function lucesAl(t: number) {
  let a = 0;
  for (const [p] of PASOS) {
    const d = t - p; if (d < -.05 || d > .3) continue;
    const q = d < 0 ? (d + .05) / .05 : d < .1 ? 1 - (Math.floor(d * 60) % 2) * .35 : 1 - (d - .1) / .2;
    a = Math.max(a, q * .78);
  }
  return a;
}
function persianas(c: C, M: { x: number; y: number }[] | null, k: number) {
  if (!M) return;
  const S = [[-60, -60], [1140, -60], [1140, 1980], [-60, 1980]];
  c.fillStyle = NOCHE; c.beginPath(); c.rect(-60, -60, 1200, 2040);
  M.forEach((q, i) => { const x = lerp(S[i][0], q.x, k), y = lerp(S[i][1], q.y, k); if (i) c.lineTo(x, y); else c.moveTo(x, y); });
  c.closePath(); c.fill("evenodd");
}
function motas(c: C, t: number, color: string, alfa: number) {
  const r = azar(9);
  c.fillStyle = color;
  for (let i = 0; i < 60; i++) {
    const x0 = r() * 1200 - 60, y0 = r() * 2060, v = 14 + r() * 40, f = r() * 6.3, z = 1.6 + r() * 3.2;
    const y = ((y0 - t * v) % 2060 + 2060) % 2060 - 70, x = x0 + Math.sin(t * .55 + f) * 34;
    c.globalAlpha = alfa * (.08 + r() * .18); c.fillRect(x, y, z, z);
  }
  c.globalAlpha = 1;
}
function escena(c: C, cam: Cam, t: number, d: D) {
  const kP = clamp(ease.inOutCubic(prog(t, ev.sh, ev.sh + .4)));
  const osc = kP;
  const M = mesaEnPantalla(cam);
  if (kP < 1) { piso(c, cam); pecera(c, cam, t); persianas(c, M, kP); }
  // el pedazo cae por debajo de la mesa
  if (t >= BAM && t < t0.por + 1) { const f = fragEst(t); if (f.z < 0) fragmento(c, cam, t, d); }
  mesa(c, cam, d, t);
  // borde de contexto: la línea que dice hasta dónde llega
  const kC = smooth(prog(t, t0.ctx - .05, t0.ctx + .5)) * (1 - smooth(prog(t, t0.mesa2 + .2, t0.mesa2 + .6)));
  bloque(c, cam, t, d);
  const vivas: { h: Hoja; st: Est }[] = [];
  for (const h of HOJAS) { const st = estado(h, t); if (st) vivas.push({ h, st }); }
  vivas.sort((a, b) => a.st.z - b.st.z || a.h.t - b.h.t);
  resma(c, cam, t);
  for (const { h, st } of vivas) dibujaHoja(c, cam, h, st, d, t);
  if (t > ev.pela[0] + .2 && t < ev.entierra[1] + .2) {                       // abajo no llega la luz
    const k = smooth(prog(t, ev.pela[0] + .2, ev.pela[1])) * (1 - smooth(prog(t, ev.entierra[0], ev.entierra[0] + .3)));
    const n = cam.p(NOTA.x, NOTA.y, LA_NOTA.z);
    if (n) { const g = c.createRadialGradient(n.x, n.y, 300, n.x, n.y, 1000); g.addColorStop(0, "rgba(6,5,4,0)"); g.addColorStop(.42, `rgba(6,5,4,${.7 * k})`); g.addColorStop(1, `rgba(6,5,4,${.97 * k})`); c.fillStyle = g; c.fillRect(-60, -60, 1200, 2040); }
  }
  if (kC > 0 && M) {
    c.save(); c.globalAlpha = kC; c.strokeStyle = ROJO; c.lineWidth = 8; c.setLineDash([26, 16]); c.lineDashOffset = -t * 90; c.lineCap = "round";
    const per = smooth(prog(t, t0.ctx - .05, t0.ctx + .5)) * 4; c.beginPath();
    for (let i = 0; i < 4; i++) { const f = clamp(per - i); if (f <= 0) break; const a = M[i], b = M[(i + 1) % 4]; if (i === 0) c.moveTo(a.x, a.y); c.lineTo(lerp(a.x, b.x, f), lerp(a.y, b.y, f)); } c.stroke(); c.restore();
  }
  if (kP > 0 && t < ev.pela[0] + .1 || t > BAM + 1.6) {                     // la lámpara: las orillas de la mesa ya no reciben tanta luz
    const n = cam.p(0, -.2, 0);
    if (n) { const R = 7.2 * n.s, g = c.createRadialGradient(n.x, n.y, R * .4, n.x, n.y, R); g.addColorStop(0, "rgba(9,7,5,0)"); g.addColorStop(1, `rgba(9,7,5,${.5 * kP})`); c.fillStyle = g; c.fillRect(-60, -60, 1200, 2040); }
  }
  chispas(c, cam, t);
  escuadras(c, cam, t);
  lectura(c, cam, t);
  prensa(c, cam, t);
  trozos(c, cam, t);
  const pz = pezEn(t);
  if (pz && !(pz.z < 0 && kP > 0)) {
    const p = cam.p(pz.x, pz.y, pz.z), ps = cam.p(pz.x + pz.z * .18, pz.y - pz.z * .14, 0);
    if (ps && pz.z < 3 && !(pz.x > W || pz.y < -H)) { c.save(); c.translate(ps.x, ps.y); c.scale(1, .62); c.rotate(pz.ang); c.fillStyle = `rgba(28,20,12,${clamp(.34 - pz.z * .07, .08, .34)})`; c.beginPath(); c.ellipse(0, 0, 130 * ps.s / 100, 50 * ps.s / 100, 0, 0, 7); c.fill(); c.restore(); }
    gotas(c, cam, t);
    if (p) pez(c, p.x, p.y, 1.32 * p.s, pz.ang, pz.flex);
  }
  laBola(c, cam, t, osc);
  manoGrande(c, cam, t);
  if (t >= BAM && t < t0.por + 1) { const f = fragEst(t); if (f.z >= 0) fragmento(c, cam, t, d); }
  // la palomita final, sobre la nota
  if (t >= ev.palomita) {
    const k = ease.outExpo(prog(t, ev.palomita - .02, ev.palomita + .26));
    const a = cam.p(NOTA_F.x + 1.62, NOTA_F.y + .9, .2), b = cam.p(NOTA_F.x + 1.86, NOTA_F.y + .58, .2), f = cam.p(NOTA_F.x + 2.55, NOTA_F.y + 1.62, .2);
    if (a && b && f) { c.save(); c.strokeStyle = ACENTO; c.lineWidth = .13 * a.s; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(lerp(a.x, b.x, clamp(k * 2.4)), lerp(a.y, b.y, clamp(k * 2.4))); if (k > .42) c.lineTo(lerp(b.x, f.x, clamp((k - .42) / .58)), lerp(b.y, f.y, clamp((k - .42) / .58))); c.stroke(); c.restore(); }
  }
}
function dibuja(c: C, t: number, d: D) {
  FR = Math.floor(t * 10);
  const osc = t >= TINT_OSC;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = osc ? NOCHE : PAPEL; c.fillRect(0, 0, 1080, 1920);
  const sh = sacude(t), z = 1 + sh.z;
  c.save(); c.translate(540 + sh.x, 900 + sh.y); c.scale(z, z); c.translate(-540, -900);
  escena(c, camaraDe(t), t, d);
  motas(c, t, osc ? LUZ : TINTA, osc ? .8 : 1);
  c.restore();
  const l = lucesAl(t);
  if (l > 0) { c.fillStyle = `rgba(6,6,7,${l})`; c.fillRect(0, 0, 1080, 1920); }
  rotulos(c, t);
  const a = smooth(prog(t, DURACION - 1.5, DURACION - .35));
  if (a > 0) { c.fillStyle = `rgba(9,9,10,${a})`; c.fillRect(0, 0, 1080, 1920); }
}

export const Pieza: React.FC = () => <Lienzo dibuja={(c, t, d: D) => dibuja(c, t, d)} preparar={() => ({ spr: hazSprites() })} fondo={PAPEL} />;
