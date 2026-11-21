// Serie 2, capítulo 10. Un escritorio de papel visto con cámara 3D. La bola recién contratada lee la nota que le
// dejaste, y el mismo escritorio prueba tres notas. "Hazlo bonito": todos los caminos de la fiesta valen lo mismo
// y la bola gira sin saber por dónde empezar. Una regla por caso: cada regla sale de la nota y se clava como
// estaca; la cerca crece y la bola se atora en el único hueco que nadie previó. La nota con razón: la tinta roja
// de "sorpresa" se sale del papel y se extiende sola, y tapa el camino de mamá y también el de redes, que nadie
// escribió. Esa nota, pegada con cinta, es el prompt de sistema. El arranque le cuelga títulos a la bola y se le
// caen; el cierre deja la nota más corta posible: "Es sorpresa."
// Todos los instantes vienen de eventos.json, que escribe partitura.py: dibujo y sonido son los mismos números.
import React from "react";
import { azar, camara, clamp, ease, lerp, mezclaVista, prog, smooth, texto } from "../../kit";
import type { Cam, Vista } from "../../kit";
import { ACENTO, bola, cue, GRIS, Lienzo, mono, PAPEL, rotulo, serif, sombra, TINTA } from "../../marca";
import { brazo } from "../../personaje";
import palabras from "./palabras.json";
import duracion from "./duracion.json";
import E from "./eventos.json";

export const DURACION = duracion.dur;
const T = cue(palabras);
type Ctx = CanvasRenderingContext2D;
type V3 = [number, number, number];
type Pt = [number, number];

const t0 = {
  agente: T("a un agente").s, eres: T("eres").s, el: T("el mejor").s, mejor: T("mejor").s, experto: T("experto").s, del: T("del mundo").s, mundo: T("mundo").s,
  sirve: T("lo que sirve").s, brillante: T("brillante").s, empezo: T("que empezó hoy").s, genio: T("un genio").s, organizar: T("organizar").s,
  hazlo: T("hazlo").s, bonito: T("bonito").s, regla: T("una regla").s, cada: T("para cada cosa").s, previste: T("no previste").s,
  medio: T("el punto medio").s, paraque: T("para qué").s, esuna: T("es una").s, sorpresa: T("sorpresa").s, asi: T("así que").s, nadade: T("nada de").e,
  mensajes: T("mensajes").s, mama: T("mamá").s, mamaF: T("mamá").e, redes: T("en redes").s, nadie: T("nadie se lo dijo").s,
  sin: T("una regla sin razón").s, obedece: T("se obedece").s, con: T("una regla con razón").s, entiende: T("se entiende").s,
  llamamos: T("le llamamos").s, buen: T("y un buen prompt").s, quieres: T("quieres").s, como: T("cómo se ve").s, terminado: T("terminado").s,
  yque: T("y qué no").s, sinpreg: T("sin preguntarte").s, demas: T("lo demás").s, frases: T("frases mágicas").s, colega: T("colega nuevo").s,
  todo: T("un buen prompt no").s, todoF: T("todo").e, loque: T("lo que no podría").s, fin: palabras[palabras.length - 1].e,
};

// ---------- utilidades ----------
const TAU = Math.PI * 2;
const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * TAU + f);
const ventana = (t: number, a: number, b: number, fi = .25, fo = .3) => smooth(prog(t, a, a + fi)) * (1 - smooth(prog(t, b, b + fo)));
const caidaAt = (t: number, a: number) => (t > a ? t - a : -1);
let FR = 0;
const tiembla = (j: number) => { const s = Math.sin(j * 12.9898 + FR * 78.233) * 43758.5453; return s - Math.floor(s) - .5; };

// ---------- el mundo (unidades del escritorio; z hacia arriba, y se aleja de la cámara) ----------
const H = { x: 0, y: 110 }, RB = 62, S2 = { x: -292, y: -585 }, S3 = { x: -720, y: -560 };
const MESA = { x0: -1150, x1: 1150, y0: -700, y1: 480, g: 74 };
const NW = 340, ND = 530, NX0 = -170, NY0 = -80;          // la nota: esquina lejana izquierda
const PEG = { x: 0, y: -205, w: 230 };                   // la nota más corta, debajo de la grande
const ETQ = { x: 0, y: -30, w: 390, h: 66 };             // la etiqueta "prompt de sistema", pegada a la mesa
type Dest = { id: string; x: number; y: number; alto: number; doblez: number };
// Los caminos de la fiesta salen hacia los lados, no hacia el fondo: arriba del cuadro queda papel para los rótulos.
// Mamá y redes caen justo en la dirección de una estaca y del hueco de la cerca.
const TH_R = Math.atan2(220, 330), TH_M = TH_R + 12 * TAU / 14;
const DEST: Dest[] = [
  { id: "invitados", x: -490, y: 40, alto: 130, doblez: 30 },
  { id: "pastel", x: -330, y: 330, alto: 160, doblez: -30 },
  { id: "redes", x: 330, y: 330, alto: 170, doblez: 0 },
  { id: "mama", x: H.x + 700 * Math.cos(TH_M), y: H.y + 700 * Math.sin(TH_M), alto: 180, doblez: 0 },
];
const IDX = Object.fromEntries(DEST.map((d, i) => [d.id, i])) as Record<string, number>;
function enCamino(d: Dest, u: number): Pt {
  const ax = H.x, ay = H.y, bx = d.x, by = d.y, mx = (ax + bx) / 2, my = (ay + by) / 2, L = Math.hypot(bx - ax, by - ay);
  const cx = mx - (by - ay) / L * d.doblez, cy = my + (bx - ax) / L * d.doblez, q = 1 - u;
  return [q * q * ax + 2 * q * u * cx + u * u * bx, q * q * ay + 2 * q * u * cy + u * u * by];
}

// La cerca: 13 estacas en un anillo alrededor de la bola, con UN hueco hacia redes.
const RF = 182;
const ORDEN = [12, 6, 2, 9, 4, 11, 1, 7, 13, 3, 10, 5, 8];
const angEst = (k: number) => TH_R + k * TAU / 14;
const posEst = (k: number): Pt => [H.x + RF * Math.cos(angEst(k)), H.y + RF * Math.sin(angEst(k))];
const HUECO: Pt = [H.x + (RF - 10) * Math.cos(TH_R), H.y + (RF - 10) * Math.sin(TH_R)];
const EST_MAMA = enCamino(DEST[IDX.mama], .5);

// ---------- la tinta: gotas sembradas a lo largo de dos ríos ----------
type Gota = { x: number; y: number; r: number; t: number };
const GOTAS: Gota[] = (() => {
  const r = azar(1010), out: Gota[] = [];
  const rio = (a: Pt, cc: Pt, b: Pt, n: number, ta: number, tb: number, r0: number, r1: number, lat: number) => {
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), q = 1 - u;
      const x = q * q * a[0] + 2 * q * u * cc[0] + u * u * b[0], y = q * q * a[1] + 2 * q * u * cc[1] + u * u * b[1];
      const dx = 2 * q * (cc[0] - a[0]) + 2 * u * (b[0] - cc[0]), dy = 2 * q * (cc[1] - a[1]) + 2 * u * (b[1] - cc[1]), L = Math.hypot(dx, dy) || 1;
      const rr = lerp(r0, r1, u ** .8);
      for (let k = 0; k < 2; k++) {
        const l = (r() - .5) * 2 * lat * rr;
        out.push({ x: x - dy / L * l, y: y + dx / L * l, r: rr * (.55 + .55 * r()), t: ta + (tb - ta) * u ** 1.1 + (r() - .5) * .1 });
      }
    }
  };
  const O: Pt = [NX0 + NW - 14, NY0 - 112];
  const M = DEST[IDX.mama];
  rio(O, [320, -220], [M.x - 10, M.y - 10], 34, E.mancha0, E.llegaMama, 14, 100, .9);
  rio([270, -60], [160, 150], [326, 312], 34, E.camina + .3, E.llegaRedes, 50, 96, .8);
  return out;
})();

/** Reloj de la tinta: avanza con la voz, se rebobina en "sin razón", vuelve a florecer y se mete a la nota. */
function relojTinta(t: number) {
  const a = E.mancha0 - .05, full = E.llegaRedes + .7;
  if (t < a) return -9;
  if (t < E.rebobina) return t;
  if (t < E.florece) return lerp(Math.min(E.rebobina, full), a - .2, ease.inOutCubic(prog(t, E.rebobina, E.rebobina + .55)));
  if (t < E.vuelve) return lerp(a - .2, full, ease.outCubic(prog(t, E.florece - .05, E.florece + 1.05)));
  return lerp(full, a - .2, ease.inOutCubic(prog(t, E.vuelve, E.vuelve + .8)));
}

// ---------- cámara ----------
const V = (tx: number, ty: number, tz: number, yaw: number, pitch: number, dist: number): Vista => ({ tx, ty, tz, yaw, pitch, dist });
// Cada toma dice también en qué altura de la pantalla cae su centro (cy): así los rótulos tienen papel libre arriba.
type Toma = { t: number; v: Vista; cy: number; dur?: number; curva?: (x: number) => number };
const NOTA_B = V(0, -330, 0, 0, 1.0, 700);                 // la nota de cerca, la bola asomada detrás
const CLAVES: Toma[] = [
  { t: 0, v: V(0, 110, 84, -.36, .3, 470), cy: 960 },
  { t: .02, v: V(0, 110, 70, .16, .27, 360), cy: 1010, dur: 3.3, curva: ease.inOutSine },
  { t: 3.4, v: V(0, 110, 70, .06, .28, 380), cy: 1010, dur: 1.6, curva: ease.inOutSine },
  { t: E.caen - .1, v: V(0, 110, 62, .02, .3, 420), cy: 1010, dur: .55 },
  { t: t0.sirve, v: V(-8, 110, 72, -.1, .26, 350), cy: 1020, dur: 3.4, curva: ease.inOutSine },
  { t: E.abre, v: V(0, 40, 0, 0, .95, 1250), cy: 1080, dur: 1.9 },
  { t: E.abre + 1.9, v: V(0, 20, 0, .04, .97, 1120), cy: 1080, dur: 2.2, curva: ease.inOutSine },
  { t: E.nota0 + .25, v: NOTA_B, cy: 1170, dur: 1.3 },
  { t: E.gira - .05, v: V(0, 80, 0, 0, .98, 1350), cy: 1080, dur: .8 },
  { t: E.tacha - .25, v: NOTA_B, cy: 1170, dur: .6 },
  { t: E.estacas[0] - .3, v: V(60, 40, 0, 0, .98, 1150), cy: 1120, dur: .9 },
  { t: E.rueda, v: V(HUECO[0], HUECO[1], 30, .05, .92, 720), cy: 1180, dur: .7 },
  { t: E.barre, v: NOTA_B, cy: 1170, dur: 1.0 },
  { t: E.mancha0 + .3, v: V(240, -10, 0, -.04, 1.0, 1320), cy: 1080, dur: 1.6 },
  { t: E.rebobina, v: V(270, 20, 0, .03, 1.0, 1260), cy: 1110, dur: 1.0 },
  { t: E.florece - .2, v: V(250, 30, 0, -.03, .98, 1150), cy: 1110, dur: 2.4, curva: ease.inOutSine },
  { t: E.vuelve, v: NOTA_B, cy: 1170, dur: .9 },
  { t: E.etiqueta - .45, v: V(0, -60, 0, 0, 1.12, 520), cy: 1000, dur: .5, curva: ease.outCubic },
  { t: E.arranca - .3, v: NOTA_B, cy: 1170, dur: .8 },
  { t: E.blanco - .3, v: V(-130, -420, 0, 0, 1.02, 800), cy: 1170, dur: .9 },
  { t: E.maquina, v: V(S3.x, S3.y, 64, .02, .24, 390), cy: 1180, dur: .9 },
  { t: E.colega, v: V(S3.x + 40, S3.y, 64, -.05, .24, 430), cy: 1180, dur: 1.0 },
  { t: t0.todo - .1, v: V(0, -560, -160, 0, .74, 1050), cy: 1000, dur: .9 },
  { t: E.corta - .1, v: V(0, -50, 0, 0, .98, 640), cy: 1130, dur: .7 },
  { t: E.toque, v: V(0, -40, 0, 0, .95, 760), cy: 1110, dur: 2.6, curva: ease.inOutSine },
];
function guion(t: number) {
  let v = CLAVES[0].v, cy = CLAVES[0].cy;
  for (let i = 1; i < CLAVES.length; i++) {
    const k = CLAVES[i]; if (t < k.t) break;
    const q = (k.curva ?? ease.inOutCubic)(prog(t, k.t, k.t + (k.dur ?? 1.4)));
    v = mezclaVista(v, k.v, q); cy = lerp(cy, k.cy, q);
  }
  return { v, cy };
}
const GOLPES: [number, number][] = [[E.aterriza, 30], [E.corona, 14], [E.medalla, 12], [E.faja, 14], [E.caidas[0], 6], [E.nota1, 6], [E.atora, 24],
  [E.paraque, 8], [E.llegaMama, 6], [E.llegaRedes, 9], [E.estaca, 7], [E.etiqueta, 14], ...E.cintas.map((x) => [x, 5] as [number, number]),
  ...E.fichas.map((x) => [x, 9] as [number, number]), [E.apreton, 6], [E.rasga, 10], [E.toque, 6], ...E.estacas.map((x) => [x, 3] as [number, number])];

let cam: Cam = camara(V(0, 0, 0, 0, 1, 1000));
// Lo que queda casi pegado a la cámara no se dibuja: proyectado, se vuelve una mancha gigante.
const P = (x: number, y: number, z = 0) => { const p = cam.p(x, y, z); return p && p.zc > 40 ? p : null; };

function camaraEn(t: number) {
  const { v, cy } = guion(t);
  // La deriva se mide en pantalla: en las tomas abiertas también se nota (unos 15 px), no solo en las cerradas.
  const A = Math.max(8, v.dist * .012);
  const w: Vista = { ...v, tx: v.tx + A * vaiven(t, 5.3), ty: v.ty + A * 1.2 * vaiven(t, 6.1, 1), tz: v.tz + 4 * vaiven(t, 4.1, 2), yaw: v.yaw + .016 * vaiven(t, 7.3, 2), dist: v.dist * (1 + .02 * vaiven(t, 4.7)) };
  return camara(w, 540, cy, 1250);
}

// ---------- dibujo en perspectiva ----------
function linea(c: Ctx, ax: number, ay: number, bx: number, by: number) { c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); }
/** Profundidad de un punto frente a la cámara (la misma cuenta que kit.camara). */
function prof([x, y, z]: V3) {
  const v = cam.v, p = Math.min(v.pitch, 1.5533), f = [-Math.sin(v.yaw) * Math.cos(p), Math.cos(v.yaw) * Math.cos(p), -Math.sin(p)];
  return (x - cam.pos[0]) * f[0] + (y - cam.pos[1]) * f[1] + (z - cam.pos[2]) * f[2];
}
/** Polígono proyectado, recortado contra el plano cercano: la mesa pasa por detrás de la cámara en el arranque. */
function poli(c: Ctx, pts: V3[]) {
  const N = 45, out: V3[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], da = prof(a) - N, db = prof(b) - N;
    if (da >= 0) out.push(a);
    if ((da >= 0) !== (db >= 0)) { const k = da / (da - db); out.push([lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]); }
  }
  c.beginPath(); let ok = false;
  for (const [x, y, z] of out) { const p = P(x, y, z); if (!p) continue; if (!ok) { c.moveTo(p.x, p.y); ok = true; } else c.lineTo(p.x, p.y); }
  c.closePath(); return ok;
}
/** Coordenadas locales en el plano horizontal z, alrededor de (x, y): u a la derecha, v hacia la cámara. */
function enPlano(c: Ctx, x: number, y: number, z: number, f: () => void) {
  const o = P(x, y, z), a = P(x + 1, y, z), b = P(x, y - 1, z);
  // La aproximación afín solo vale lejos de la cámara: de cerca y de canto, un renglón se estira en rayas.
  if (!o || !a || !b || o.zc < 220) return;
  c.save(); c.transform(a.x - o.x, a.y - o.y, b.x - o.x, b.y - o.y, o.x, o.y); f(); c.restore();
}
/** Lo mismo en el plano vertical y = cte: u a la derecha, v hacia abajo. */
function enPared(c: Ctx, x: number, y: number, z: number, f: () => void) {
  const o = P(x, y, z), a = P(x + 1, y, z), b = P(x, y, z - 1);
  if (!o || !a || !b || o.zc < 220) return;
  c.save(); c.transform(a.x - o.x, a.y - o.y, b.x - o.x, b.y - o.y, o.x, o.y); f(); c.restore();
}

// ---------- fondo ----------
function polvo(c: Ctx, t: number) {
  const r = azar(9);
  c.fillStyle = TINTA;
  for (let i = 0; i < 80; i++) {
    const x0 = r() * 1200 - 60, y0 = r() * 2060, v = 14 + r() * 40, f = r() * 6.3, z = 1.6 + r() * 3.2;
    const y = ((y0 - t * v) % 2060 + 2060) % 2060 - 70, x = x0 + Math.sin(t * .5 + f) * 30;
    c.globalAlpha = .06 + r() * .14; c.fillRect(x, y, z, z);
  }
  c.globalAlpha = 1;
}

function guirnalda(c: Ctx, t: number) {
  const a = ease.outCubic(prog(t, E.guirnalda - .1, E.guirnalda + .7)); if (a <= 0) return;
  // Se sube y sale del cuadro cuando la cámara se acerca a la nota: arriba queda papel para los rótulos.
  const sube = ease.inCubic(prog(t, E.nota0 + .2, E.nota0 + 1.4)) * 1400; if (sube > 1300) return;
  const n = 12, xa = -660, xb = 660, y = 470, z = 400 + sube;
  const pt = (u: number): V3 => [lerp(xa, xb, u), y, z - 110 * Math.sin(Math.PI * u)];
  c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath();
  for (let i = 0; i <= 40; i++) { const u = a * i / 40, p = P(...pt(u)); if (p) { if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); } }
  c.stroke();
  for (let k = 0; k < n; k++) {
    const u = (k + .5) / n; if (u > a) break;
    const [x, , zz] = pt(u), sw = 14 * vaiven(t, 1.3 + (k % 3) * .2, k) + 30 * Math.exp(-(t - E.guirnalda - u * .7) * 3) * (t > E.guirnalda + u * .7 ? 1 : 0);
    const p1 = P(x - 34, y, zz), p2 = P(x + 34, y, zz), p3 = P(x + sw, y, zz - 86);
    if (!p1 || !p2 || !p3) continue;
    c.fillStyle = k % 3 === 0 ? ACENTO : k % 3 === 1 ? TINTA : "#FFFFFF";
    c.beginPath(); c.moveTo(p1.x, p1.y); c.lineTo(p2.x, p2.y); c.lineTo(p3.x, p3.y); c.closePath(); c.fill();
    c.lineWidth = 2.5; c.strokeStyle = TINTA; c.stroke();
  }
}

function mesa(c: Ctx) {
  const { x0, x1, y0, y1, g } = MESA;
  // patas delanteras
  c.fillStyle = "#D8D2C3"; c.strokeStyle = TINTA; c.lineWidth = 3;
  for (const x of [x0 + 40, x1 - 100]) { if (poli(c, [[x, y0 + 20, -g], [x + 60, y0 + 20, -g], [x + 60, y0 + 20, -1400], [x, y0 + 20, -1400]])) { c.fill(); c.stroke(); } }
  // tapa
  c.fillStyle = "#EAE5D8";
  if (poli(c, [[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]])) { c.fill(); c.lineWidth = 3.5; c.stroke(); }
  // canto frontal rayado
  if (poli(c, [[x0, y0, 0], [x1, y0, 0], [x1, y0, -g], [x0, y0, -g]])) {
    c.fillStyle = "#D6CFBF"; c.fill(); c.save(); c.clip();
    c.strokeStyle = "rgba(17,17,17,.28)"; c.lineWidth = 2.5;
    const a = P(x0, y0, 0), b = P(x1, y0, -g);
    if (a && b) for (let x = a.x - 400; x < b.x + 400; x += 22) linea(c, x, a.y - 10, x - 90, b.y + 10);
    c.restore(); c.strokeStyle = TINTA; c.lineWidth = 3.5; poli(c, [[x0, y0, 0], [x1, y0, 0], [x1, y0, -g], [x0, y0, -g]]); c.stroke();
  }
  // vetas: líneas finas que delatan la perspectiva y la deriva
  c.strokeStyle = "rgba(17,17,17,.075)"; c.lineWidth = 2;
  for (let i = 0; i < 9; i++) {
    const y = lerp(y0 + 60, y1 - 40, i / 8) + (i % 2) * 20;
    c.beginPath(); let ok = false;
    for (let k = 0; k <= 16; k++) {
      const x = lerp(x0 + 30, x1 - 30, k / 16), p = P(x, y + 9 * Math.sin(k * .9 + i * 2), 0);
      if (!p) continue; if (!ok) { c.moveTo(p.x, p.y); ok = true; } else c.lineTo(p.x, p.y);
    }
    c.stroke();
  }
}

// ---------- caminos de la fiesta ----------
function caminos(c: Ctx, t: number) {
  DEST.forEach((d, k) => {
    const nace = E.fiesta[k];
    const rev = ease.outCubic(prog(t, nace, nace + .55)); if (rev <= 0) return;
    const pulso = ventana(t, E.gira, E.tacha - .1, .2, .3);
    const largo = Math.hypot(d.x - H.x, d.y - H.y), n = Math.floor(largo / 24);
    for (let i = 3; i < n - 2; i++) {
      const u = i / n; if (u > rev) break;
      const [x, y] = enCamino(d, u), p = P(x, y, 0); if (!p) continue;
      const onda = pulso * Math.max(0, Math.sin((u * 7 - t * 6 + k) * 1.0)) ** 6;
      c.fillStyle = TINTA; c.globalAlpha = .38 + .5 * onda;
      c.beginPath(); c.arc(p.x, p.y, Math.max(2.2, 6 * p.s) * (1 + .5 * onda), 0, TAU); c.fill();
    }
    c.globalAlpha = 1;
  });
}

// ---------- carteles de la fiesta (de pie sobre la mesa) ----------
type Pal = { f: string; k: string; a: string };
const PAL: Pal = { f: "#FFFFFF", k: TINTA, a: ACENTO }, MOJADO: Pal = { f: ACENTO, k: "#6E1E10", a: "#6E1E10" };
function figura(c: Ctx, id: string, P_: Pal, t: number) {
  c.lineWidth = 4.5; c.strokeStyle = P_.k; c.lineJoin = "round"; c.lineCap = "round";
  if (id === "pastel") {
    c.fillStyle = P_.f; c.beginPath(); c.ellipse(0, -6, 82, 14, 0, 0, TAU); c.fill(); c.stroke();
    c.beginPath(); c.roundRect(-62, -70, 124, 64, 8); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-62, -56); for (let i = 0; i <= 12; i++) c.lineTo(-62 + i * 124 / 12, -56 + (i % 2 ? 9 : 0)); c.stroke();
    c.beginPath(); c.roundRect(-42, -118, 84, 48, 8); c.fill(); c.stroke();
    for (const x of [-20, 0, 20]) {
      c.fillStyle = P_.a; c.fillRect(x - 4, -146, 8, 28);
      c.fillStyle = P_.k; c.beginPath(); c.ellipse(x + Math.sin(t * 9 + x) * 1.5, -156, 5, 9, 0, 0, TAU); c.fill();
    }
  } else if (id === "globos") {
    const B: [number, number, string][] = [[-40, -160, P_.a], [8, -196, P_.f], [46, -150, P_.k]];
    for (const [x, y] of B) { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(x * .3, y * .5, x + Math.sin(t * 1.4 + x) * 4, y + 40); c.stroke(); }
    for (const [x, y, f] of B) {
      const xx = x + Math.sin(t * 1.4 + x) * 4;
      c.fillStyle = f; c.beginPath(); c.ellipse(xx, y, 31, 39, 0, 0, TAU); c.fill(); c.stroke();
      c.fillStyle = P_.k; c.beginPath(); c.moveTo(xx - 6, y + 44); c.lineTo(xx + 6, y + 44); c.lineTo(xx, y + 37); c.fill();
    }
  } else if (id === "invitados") {
    c.fillStyle = P_.f;
    c.beginPath();
    for (const x of [-52, 0, 52]) {
      c.moveTo(x - 9, -78); c.lineTo(x - 30, -64); c.lineTo(x - 26, -56); c.lineTo(x - 10, -62); c.lineTo(x - 14, -28); c.lineTo(x - 18, 0); c.lineTo(x - 6, 0);
      c.lineTo(x, -24); c.lineTo(x + 6, 0); c.lineTo(x + 18, 0); c.lineTo(x + 14, -28); c.lineTo(x + 10, -62); c.lineTo(x + 26, -56); c.lineTo(x + 30, -64); c.lineTo(x + 9, -78); c.closePath();
    }
    c.fill(); c.stroke();
    for (const x of [-52, 0, 52]) { c.beginPath(); c.arc(x, -94, 15, 0, TAU); c.fill(); c.stroke(); }
  } else if (id === "redes") {
    c.fillStyle = P_.k; c.beginPath(); c.roundRect(-44, -170, 88, 170, 16); c.fill();
    c.fillStyle = P_.f; c.beginPath(); c.roundRect(-35, -158, 70, 136, 7); c.fill();
    c.fillStyle = P_.a; c.beginPath();
    const hx = 0, hy = -104, s = 1 + .08 * Math.max(0, Math.sin(t * 5));
    c.moveTo(hx, hy + 20 * s); c.bezierCurveTo(hx - 34 * s, hy - 2 * s, hx - 18 * s, hy - 30 * s, hx, hy - 12 * s); c.bezierCurveTo(hx + 18 * s, hy - 30 * s, hx + 34 * s, hy - 2 * s, hx, hy + 20 * s); c.fill();
    c.strokeStyle = P_.k; c.lineWidth = 4; linea(c, -22, -60, 22, -60); linea(c, -22, -46, 10, -46);
    c.fillStyle = P_.f; c.beginPath(); c.arc(0, -11, 4, 0, TAU); c.fill();
  } else if (id === "mama") {
    c.fillStyle = P_.k; c.fillRect(-4, -82, 8, 82);
    c.fillStyle = P_.f; c.beginPath(); c.roundRect(-78, -184, 156, 96, 24); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-30, -90); c.lineTo(-44, -64); c.lineTo(-6, -90); c.fill(); c.stroke();
    c.fillStyle = P_.f; c.fillRect(-28, -94, 20, 8);
    texto(c, "mamá", 0, -122, { fuente: serif(50, true), color: P_.k });
  } else if (id === "estaca") {
    c.fillStyle = P_.f; c.beginPath(); c.moveTo(-31, -104); c.lineTo(31, -104); c.lineTo(31, -12); c.lineTo(0, 6); c.lineTo(-31, -12); c.closePath(); c.fill(); c.stroke();
    texto(c, "no", -18, -72, { fuente: mono(28), color: P_.a, alin: "left" });
    c.lineWidth = 3.4; c.beginPath();
    for (const [y, w] of [[-52, 44], [-36, 38], [-22, 26]] as Pt[]) { c.moveTo(-20, y); for (let x = 0; x <= w; x += 6) c.lineTo(-20 + x, y + Math.sin(x * .5 + y) * 3); }
    c.stroke();
  }
}

function cartel(c: Ctx, id: string, x: number, y: number, t: number, k: number, mojado = 0, ladeo = 0, plano = 1, alfa = 1) {
  if (k <= .01 || alfa <= .01) return;
  const p = P(x, y, 0); if (!p) return;
  c.save(); c.globalAlpha = alfa;
  sombra(c, p.x, p.y + 2, 70 * p.s, .2 * plano);
  c.translate(p.x, p.y); c.rotate(ladeo); c.scale(p.s * k, p.s * k * plano);
  figura(c, id, PAL, t);
  if (mojado > 0) {
    const h = (id === "globos" ? 240 : id === "mama" ? 190 : 175) * mojado;
    c.save(); c.beginPath(); c.rect(-160, -h, 320, h + 30); c.clip(); figura(c, id, MOJADO, t); c.restore();
  }
  c.restore();
}

// ---------- la nota ----------
let NOF = { dx: 0, dy: 0, dz: 0 };
const nw = (u: number, v: number): V3 => [NX0 + u + NOF.dx, NY0 - v + NOF.dy, NOF.dz];

/** Escribe en la nota de izquierda a derecha. `borra` se come el renglón desde la izquierda. Devuelve la punta. */
function escribe(c: Ctx, partes: [string, string][], u: number, v: number, px: number, k: number, o: { it?: boolean; borra?: number; centro?: boolean; alfa?: number } = {}): V3 | null {
  if (k <= 0) return null;
  const it = o.it ?? true, fu = serif(px, it); c.font = fu;
  const ws = partes.map(([s]) => c.measureText(s).width), W = ws.reduce((a, b) => a + b, 0);
  const u0 = o.centro ? u - W / 2 : u, kk = clamp(k), b = clamp(o.borra ?? 0);
  const [x, y, z] = nw(u0 + W / 2, v);
  enPlano(c, x, y, z, () => {
    c.save(); c.beginPath(); c.rect(-W / 2 - 10 + b * (W + 20), -px * 1.15, (W + 20) * (kk - b), px * 1.7); c.clip();
    let off = -W / 2;
    partes.forEach(([s, col], i) => { texto(c, s, off + ws[i] / 2, 0, { fuente: fu, color: col, alfa: o.alfa ?? 1 }); off += ws[i]; });
    c.restore();
  });
  return nw(u0 + W * kk, v - px * .2);
}

function garabato(c: Ctx, u: number, v: number, w: number, k: number, sem: number, grueso = 3.2, color = TINTA) {
  if (k <= 0) return;
  const [x, y, z] = nw(u + w / 2, v);
  enPlano(c, x, y, z, () => {
    const r = azar(sem);
    c.strokeStyle = color; c.lineWidth = grueso; c.lineCap = "round"; c.beginPath();
    texto(c, "no", -w / 2, 0, { fuente: mono(19), color: ACENTO, alin: "left" });
    const ini = -w / 2 + 32, fin = ini + (w - 32) * clamp(k);
    c.moveTo(ini, -4);
    for (let x2 = ini; x2 <= fin; x2 += 5) c.lineTo(x2, -4 + Math.sin(x2 * .45 + sem) * 4 * (.6 + r() * .5));
    c.stroke();
  });
}

function pluma(c: Ctx, w: V3 | null, t: number, alfa = 1) {
  if (!w || alfa <= .01) return;
  const p = P(w[0], w[1], w[2]); if (!p) return;
  const sc = clamp(p.s * .9, .55, 1.4);
  c.save(); c.globalAlpha = alfa; c.translate(p.x, p.y - 3 + Math.sin(t * 38) * 4 * sc); c.rotate(.62); c.scale(sc, sc);
  c.fillStyle = TINTA; c.beginPath(); c.moveTo(0, 0); c.lineTo(-15, -58); c.quadraticCurveTo(-18, -80, -11, -94); c.lineTo(11, -94); c.quadraticCurveTo(18, -80, 15, -58); c.closePath(); c.fill();
  c.strokeStyle = PAPEL; c.lineWidth = 2.4; linea(c, 0, -10, 0, -52); c.fillStyle = PAPEL; c.beginPath(); c.arc(0, -56, 4, 0, TAU); c.fill();
  c.fillStyle = "#262625"; c.fillRect(-14, -400, 28, 304); c.fillStyle = ACENTO; c.fillRect(-14, -104, 28, 9);
  c.restore();
}

function goma(c: Ctx, w: V3 | null, t: number) {
  if (!w) return;
  const p = P(w[0], w[1], w[2]); if (!p) return;
  const sc = clamp(p.s * .9, .55, 1.4);
  c.save(); c.translate(p.x, p.y + Math.sin(t * 40) * 6 * sc); c.rotate(-.35); c.scale(sc, sc);
  c.fillStyle = "#FFFFFF"; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.roundRect(-54, -60, 108, 64, 10); c.fill(); c.stroke();
  c.fillStyle = ACENTO; c.beginPath(); c.roundRect(-54, -60, 50, 64, [10, 0, 0, 10]); c.fill(); c.stroke();
  c.restore();
}

function cinta(c: Ctx, u: number, v: number, giro: number, k: number) {
  if (k <= 0) return;
  const [x, y, z] = nw(u, v), s = lerp(1.6, 1, ease.outBack(clamp(k), 1.4));
  enPlano(c, x, y, z, () => {
    c.rotate(giro); c.scale(s, s); c.globalAlpha = clamp(k * 3);
    c.fillStyle = "rgba(205,200,186,.82)"; c.strokeStyle = "rgba(17,17,17,.35)"; c.lineWidth = 2;
    c.beginPath(); c.moveTo(-58, -20); for (let i = 0; i <= 6; i++) c.lineTo(-58 + (i % 2) * 5, -20 + i * 40 / 6); c.lineTo(58, 20);
    for (let i = 0; i <= 6; i++) c.lineTo(58 - (i % 2) * 5, 20 - i * 40 / 6); c.closePath(); c.fill(); c.stroke();
  });
}

function hoja(c: Ctx, alfa: number) {
  const q: V3[] = [nw(0, 0), nw(NW, 0), nw(NW, ND - 40), nw(NW - 40, ND), nw(0, ND)];
  c.save(); c.globalAlpha = alfa;
  // sombra corrida
  c.fillStyle = "rgba(20,18,14,.13)";
  if (poli(c, q.map(([x, y, z]) => [x + 10, y - 12, z] as V3))) c.fill();
  c.fillStyle = "#FDFCF8"; c.strokeStyle = TINTA; c.lineWidth = 3.5;
  if (poli(c, q.map(([x, y, z]) => [x + tiembla(1) * 1.5, y + tiembla(2) * 1.5, z] as V3))) { c.fill(); c.stroke(); }
  // la esquina doblada
  c.fillStyle = "#E6E1D3"; if (poli(c, [nw(NW, ND - 40), nw(NW - 40, ND - 40), nw(NW - 40, ND)])) { c.fill(); c.stroke(); }
  c.restore();
}

function contenidoNota(c: Ctx, t: number): V3 | null {
  let punta: V3 | null = null;
  const P1 = (w: V3 | null) => { if (w) punta = w; };
  // 1) Hazlo bonito.
  if (t >= E.bonito[0] && t < E.tacha + .7) {
    const sale = smooth(prog(t, E.tacha + .3, E.tacha + .65));
    const k1 = prog(t, E.bonito[0], E.bonito[0] + .3), k2 = prog(t, E.bonito[0] + .3, E.bonito[1]);
    if (t < E.bonito[1] + .05) { P1(escribe(c, [["Hazlo", TINTA]], NW / 2, 220, 96, k1, { centro: true })); if (k2 > 0) P1(escribe(c, [["bonito.", TINTA]], NW / 2, 325, 96, k2, { centro: true })); }
    else { escribe(c, [["Hazlo", TINTA]], NW / 2, 220, 96, 1, { centro: true, alfa: 1 - sale }); escribe(c, [["bonito.", TINTA]], NW / 2, 325, 96, 1, { centro: true, alfa: 1 - sale }); }
    const tc = prog(t, E.tacha, E.tacha + .25);
    if (tc > 0) {
      const [x, y, z] = nw(NW / 2, 250);
      enPlano(c, x, y, z, () => { c.globalAlpha = 1 - sale; c.strokeStyle = ACENTO; c.lineWidth = 10; c.lineCap = "round"; linea(c, -130, 60, -130 + 260 * tc, 60 - 150 * tc); });
    }
  }
  // 2) Una regla para cada cosa: renglones que se escriben y se arrancan como estacas.
  if (t >= E.renglones[0] - .3 && t < E.barre + .6) {
    const a = 1 - smooth(prog(t, E.barre, E.barre + .5));
    for (let i = 0; i < 13; i++) {
      const w0 = lerp(E.renglones[0] - .25, E.estacas[12] - .75, (i / 12) ** .9), k = prog(t, w0, w0 + .24);
      const v = 60 + i * 35, w = 210 + ((i * 37) % 70);
      c.save(); c.globalAlpha = a; garabato(c, 26, v, w, k, i * 7 + 3); c.restore();
      if (k > 0 && k < 1) punta = nw(26 + w * k, v);
    }
  }
  // 3) La razón.
  if (t >= t0.esuna - .1 && t < E.arranca + 1.1) {
    const rb = (i: number) => prog(t, E.arranca + .1 + i * .2, E.arranca + .36 + i * .2);
    const L1: [string, string][] = [["Es una ", TINTA], ["sorpresa,", ACENTO]];
    // "sin razón": la razón se desvanece de la nota y solo queda la regla; "con razón" vuelve
    const sinRazon = 1 - ventana(t, E.rebobina, E.florece - .15, .35, .3);
    const linea_ = (p: [string, string][], v: number, a: number, b: number, i: number) => { const w = escribe(c, p, 20, v, 58, prog(t, a, b), { borra: rb(i), alfa: i === 0 ? sinRazon : 1 }); if (t < b + .02) P1(w); };
    linea_(L1, 122, t0.esuna, E.r1[1], 0);
    linea_([["así que nada de", TINTA]], 194, t0.asi, t0.nadade + .05, 1);
    linea_([["mensajes a mi", TINTA]], 266, t0.mensajes, t0.mama, 2);
    linea_([["mamá.", TINTA]], 338, t0.mama, t0.mamaF, 3);
  }
  // 4) Las tres cosas.
  if (t >= E.tres - .1 && t < E.rasga + .1) {
    const nums: [string, number][] = [["1", 122], ["2", 200], ["3", 340]];
    nums.forEach(([n, v], i) => {
      const k = ease.outBack(prog(t, E.tres + i * .12, E.tres + i * .12 + .3), 2);
      if (k > 0) { const [x, y, z] = nw(30, v - 16); enPlano(c, x, y, z, () => { c.scale(k, k); texto(c, n, 0, 18, { fuente: serif(62), color: ACENTO }); }); }
    });
    const L = (s: string, v: number, a: number, b: number, col = TINTA) => { const w = escribe(c, [[s, col]], 62, v, 56, prog(t, a, b)); if (t < b + .02) P1(w); };
    L("qué lograr", 122, E.c1[0], E.c1[1] - .3);
    L("cómo se ve", 200, E.c2[0], t0.terminado + .05);
    L("terminado", 262, t0.terminado + .05, E.c2[1] + .05);
    L("qué no hacer", 340, E.c3[0], t0.sinpreg);
    L("sin preguntar", 402, t0.sinpreg, E.c3[1], ACENTO);
    // lo demás: en blanco, para él
    const b = ventana(t, E.blanco, 99, .4);
    if (b > 0) {
      const [x, y, z] = nw(NW / 2, 472);
      enPlano(c, x, y, z, () => {
        c.globalAlpha = b; c.strokeStyle = ACENTO; c.lineWidth = 4; c.setLineDash([14, 12]); c.lineDashOffset = -t * 30;
        c.beginPath(); c.roundRect(-NW / 2 + 18, -40, NW - 72, 82, 10); c.stroke(); c.setLineDash([]);
      });
    }
  }
  return punta;
}

/** Los garabatos de la bola en el espacio en blanco: un globo y un pastelito. */
function dibujosBola(c: Ctx, t: number): V3 | null {
  const k = prog(t, E.lapiz + .15, E.lapiz + 1.6); if (k <= 0) return null;
  const [x, y, z] = nw(NW / 2, 472);
  let fin: Pt = [0, 0];
  enPlano(c, x, y, z, () => {
    c.strokeStyle = TINTA; c.lineWidth = 3.4; c.lineCap = "round"; c.lineJoin = "round";
    const trazos: Pt[][] = [];
    const glob: Pt[] = []; for (let i = 0; i <= 20; i++) { const a = -Math.PI / 2 + i / 20 * TAU; glob.push([60 + Math.cos(a) * 16, -6 + Math.sin(a) * 20]); }
    trazos.push(glob, [[60, 14], [56, 22], [62, 28], [58, 34]]);
    trazos.push([[-90, 26], [-90, -2], [-40, -2], [-40, 26], [-90, 26]], [[-65, -2], [-65, -18]]);
    const total = trazos.reduce((a, s) => a + s.length - 1, 0);
    let rest = k * total;
    for (const s of trazos) {
      c.beginPath(); c.moveTo(s[0][0], s[0][1]);
      for (let i = 1; i < s.length && rest > 0; i++) {
        const q = Math.min(rest, 1), px = lerp(s[i - 1][0], s[i][0], q), py = lerp(s[i - 1][1], s[i][1], q);
        c.lineTo(px, py); fin = [px, py]; rest -= 1;
      }
      c.stroke(); if (rest <= 0) break;
    }
  });
  return [x + fin[0], y - fin[1], z];
}

/** El rollo: la nota que lo dice todo se desenrolla por el canto de la mesa. */
function rollo(c: Ctx, t: number) {
  const L = 760 * ease.inOutCubic(prog(t, t0.todo, t0.todoF + .3)); if (L <= 1) return;
  const ya = NY0 - ND + NOF.dy, borde = MESA.y0 + NOF.dy, plano = Math.min(L, ya - borde), cuelga = Math.max(0, L - (ya - borde));
  const xa = NX0 + 26 + NOF.dx, xb = NX0 + NW - 26 + NOF.dx, z = NOF.dz;
  c.fillStyle = "#FDFCF8"; c.strokeStyle = TINTA; c.lineWidth = 3;
  if (poli(c, [[xa, ya, z], [xb, ya, z], [xb, ya - plano, z], [xa, ya - plano, z]])) { c.fill(); c.stroke(); }
  if (cuelga > 0 && poli(c, [[xa, borde - 2, z], [xb, borde - 2, z], [xb, borde - 2, z - cuelga], [xa, borde - 2, z - cuelga]])) { c.fill(); c.stroke(); }
  // renglones apretados
  const r = azar(55);
  for (let d = 18; d < L - 10; d += 26) {
    const w = 170 + r() * 90, en = d < plano;
    const f = () => { c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); for (let x = 0; x < w; x += 6) c.lineTo(x, Math.sin(x * .4 + d) * 3.2); c.stroke(); };
    if (en) enPlano(c, xa + 22, ya - d, z, f); else enPared(c, xa + 22, borde - 2, z - (d - plano), f);
  }
}

// ---------- la bola ----------
type Mano = Pt | V3;
type Genio = { x: number; y: number; lift: number; sqx: number; sqy: number; phi: number; m1: Mano; m2: Mano; a1: number; a2: number; gafete: number; d1: number };

function hop(t: number, a: number, dur: number, alto: number) { const u = prog(t, a, a + dur); return u > 0 && u < 1 ? Math.sin(Math.PI * u) * alto : 0; }

function genioEn(t: number): Genio {
  let x = H.x, y = H.y, lift = 0, sqx = 1, sqy = 1, phi = 0, a1 = .6, a2 = .6;
  let m1: Mano = [-1.32 + .08 * vaiven(t, 1.7), .22 + .1 * vaiven(t, 2.3)], m2: Mano = [1.32 + .08 * vaiven(t, 1.9, 1), .22 + .1 * vaiven(t, 2.1, 2)];
  const res = Math.sin(t * 2.3) * .018;
  sqy += res; sqx -= res;
  // cae desde arriba del cuadro y rebota
  if (t < E.aterriza) { lift = 340 * (1 - (t / E.aterriza) ** 2); sqy = 1.12; sqx = .9; }
  else {
    const a = t - E.aterriza;
    if (a < 1.2) { lift = 70 * Math.exp(-a * 5) * Math.abs(Math.sin(a * 8)); const g = Math.exp(-a * 7) * Math.cos(a * 30) * .26; sqy -= g; sqx += g * .8; }
  }
  // saluda
  if (t < t0.eres) { const k = ventana(t, E.saludo - .2, t0.eres - .3, .25, .3); m2 = [lerp(1.32, 1.05, k) + Math.sin(t * 13) * .22 * k, lerp(.22, -1.3, k) + Math.sin(t * 15) * .2 * k]; a2 = lerp(.6, 1, k); m1 = [-1.32 - .2 * k, .22 - .25 * k * Math.abs(Math.sin(t * 6))]; }
  lift += hop(t, E.saludo - .1, .4, 70) + hop(t, t0.agente - .1, .38, 55);
  // le cuelgan títulos: se encoge en cada golpe y se infla de orgullo
  for (const g of [E.corona, E.medalla, E.faja]) { const a = t - g; if (a > 0 && a < .6) { const q = Math.exp(-a * 9) * Math.cos(a * 30) * .12; sqy -= q; sqx += q; } }
  const orgullo = ventana(t, E.infla, E.caen + .1, .3, .35);
  if (orgullo > 0) { sqx *= 1 + .1 * orgullo; sqy *= 1 + .1 * orgullo; m1 = [lerp(-1.32, -.95, orgullo), lerp(.22, .55, orgullo)]; m2 = [lerp(1.32, .95, orgullo), lerp(.22, .55, orgullo)]; a1 = a2 = lerp(.6, .1, orgullo); }
  // no sirve: se encoge de hombros
  const hombros = ventana(t, E.encoge - .1, t0.sirve - .05, .25, .3);
  if (hombros > 0) { m1 = [lerp(-1.32, -1.5, hombros), lerp(.22, -.65, hombros)]; m2 = [lerp(1.32, 1.5, hombros), lerp(.22, -.65, hombros)]; a1 = a2 = lerp(.6, 1, hombros); lift += 18 * hombros * Math.abs(Math.sin((t - E.encoge) * 6)); }
  // barre con la mano lo que se le cayó
  const bar = prog(t, t0.sirve + .1, t0.sirve + .55);
  if (bar > 0 && bar < 1) { m2 = [lerp(1.5, -1.9, ease.inOutCubic(bar)), lerp(.6, .95, Math.sin(Math.PI * bar))]; a2 = .9; }
  // brillante: da un saltito
  lift += hop(t, E.brillo, .45, 40);
  if (t >= E.gafete - .05 && t < E.gafete + .3) { const q = Math.exp(-(t - E.gafete) * 10) * .1; sqy -= q; sqx += q; }
  // la nota llega: se asoma a leerla
  const lee = ventana(t, E.nota1, E.gira - .1, .4, .2) + ventana(t, t0.esuna - .3, E.mancha0, .4, .3) + ventana(t, E.tres, E.blanco - .4, .4, .3);
  if (lee > 0) { sqy -= .04 * lee; m2 = [lerp(1.32, .55, lee), lerp(.22, .75, lee)]; a2 = lerp(.6, .3, lee); }
  // hazlo bonito: gira y no sabe hacia dónde ir
  const gi = prog(t, E.gira, E.tacha + .2);
  if (gi > 0 && gi < 1) {
    const a = t - E.gira, env = Math.sin(Math.PI * gi) ** .5;
    phi = TAU * 2.2 * ease.inOutSine(gi);
    x += 70 * Math.sin(a * 5.2) * env; y += 50 * Math.sin(a * 3.7 + 1) * env;
    const w = a * 9;
    m1 = [-1.25 * Math.cos(w), -.5 + .7 * Math.sin(w)]; m2 = [1.25 * Math.cos(w + 1), -.5 - .7 * Math.sin(w + 1)]; a1 = a2 = 1;
    lift += 22 * Math.abs(Math.sin(a * 7)) * env;
  }
  // la cerca: brinca con cada estaca, rueda al hueco y se atora
  for (const e of E.estacas) { const a = t - e; if (a > 0 && a < .4 && t < E.rueda) lift += 16 * Math.exp(-a * 9) * Math.abs(Math.sin(a * 18)); }
  if (t >= E.estacas[0] - .5 && t < E.rueda) { const k = smooth(prog(t, E.estacas[0] - .5, E.estacas[0])); m1 = [-1.1, lerp(.22, -.7, k)]; m2 = [1.1, lerp(.22, -.7, k)]; a1 = a2 = 1; }
  if (t >= E.rueda && t < E.barre + .7) {
    const ida = ease.inCubic(prog(t, E.rueda, E.atora)), vuelve = ease.outBack(prog(t, E.barre + .05, E.barre + .6));
    const k = ida * (1 - vuelve);
    x = lerp(H.x, HUECO[0], k); y = lerp(H.y, HUECO[1], k);
    if (t >= E.atora && t < E.barre + .05) {
      const a = t - E.atora, q = .22 + .1 * Math.exp(-a * 6);
      sqx = 1 - q; sqy = 1 + q * .5;
      x += Math.sin(a * 47) * (2 + 8 * Math.exp(-a * 3)); y += Math.sin(a * 39) * 2;
      m1 = [-.95, -.25 + Math.sin(a * 23) * .08]; m2 = [.95, -.25 + Math.cos(a * 21) * .08]; a1 = a2 = 1;
    }
  }
  // camina hacia redes, frena en la orilla de la tinta, y vuelve
  if (t >= E.camina && t < E.rebobina + .6) {
    const d = DEST[IDX.redes];
    const u = lerp(0, .34, smooth(prog(t, E.camina, E.frena))) - .1 * ease.outBack(prog(t, E.frena, E.frena + .35)) * (t >= E.frena ? 1 : 0);
    const k = 1 - smooth(prog(t, E.rebobina, E.rebobina + .55));
    const [px, py] = enCamino(d, Math.max(0, u * k));
    x = px; y = py;
    lift += t < E.frena ? 20 * Math.abs(Math.sin((t - E.camina) * 9)) : hop(t, E.frena, .3, 26);
    const alto = ventana(t, E.frena, E.rebobina - .2, .15, .3);
    if (alto > 0) { m1 = [lerp(-1.32, -.9, alto), lerp(.22, -1.05, alto)]; m2 = [lerp(1.32, .9, alto), lerp(.22, -1.05, alto)]; a1 = a2 = 1; }
  }
  // regla sin razón: saluda como soldado; con razón: asiente
  const sal = ventana(t, E.saluda - .15, E.florece + .2, .2, .3);
  if (sal > 0) { m2 = [lerp(1.32, .5, sal), lerp(.22, -1.08, sal)]; a2 = lerp(.6, .05, sal); m1 = [lerp(-1.32, -1.15, sal), lerp(.22, .5, sal)]; sqy += .05 * sal; sqx -= .04 * sal; }
  lift += hop(t, E.entiende, .3, 22) + hop(t, E.entiende + .34, .3, 16);
  // lo demás: brinca al lado de la nota y dibuja en el blanco
  // y luego se aparta a la derecha, donde la vuelven máquina; al final regresa a su lugar
  const ida2 = prog(t, E.blanco - .2, E.blanco + .55), ida3 = prog(t, E.maquina - .3, E.maquina + .3), vuelta2 = prog(t, t0.todo - .15, t0.todo + .7);
  if (ida2 > 0 && vuelta2 < 1) {
    const k = ease.inOutCubic(ida2), k3 = ease.inOutCubic(ida3), kv = ease.inOutCubic(vuelta2);
    const ax = lerp(lerp(H.x, S2.x, k), S3.x, k3), ay = lerp(lerp(H.y, S2.y, k), S3.y, k3);
    x = lerp(ax, H.x, kv); y = lerp(ay, H.y, kv);
    lift += Math.sin(Math.PI * ida2) * 150 + Math.sin(Math.PI * ida3) * 150 + Math.sin(Math.PI * vuelta2) * 150;
  }
  // la máquina de frases mágicas: rígida, sacudida por cada ficha
  const maq = ventana(t, E.maquina + .2, E.colega + .1, .3, .3);
  if (maq > 0) { m1 = [-1.25, .62]; m2 = [1.25, .62]; a1 = a2 = .05; sqx += .03 * maq; sqy -= .03 * maq; }
  for (const f of E.fichas) { const a = t - f - .2; if (a > 0 && a < .7) { const q = Math.exp(-a * 7) * Math.cos(a * 34) * .14; sqy -= q; sqx += q; x += Math.sin(a * 60) * 6 * Math.exp(-a * 6); } }
  // colega: le da la mano
  const man = smooth(prog(t, E.mano, E.apreton)) * (1 - smooth(prog(t, t0.todo - .4, t0.todo)));
  if (man > 0) { const sh = t > E.apreton ? Math.sin((t - E.apreton) * 20) * .18 * Math.exp(-(t - E.apreton) * 2.2) : 0; m2 = [lerp(1.32, 1.72, man), lerp(.22, .18, man) + sh]; a2 = lerp(.6, .9, man); }
  // final: se sacude con el jalón, asiente, y le da una palmada a la nota corta
  lift += hop(t, E.rasga, .3, 30) + hop(t, E.asiente, .26, 18) + hop(t, E.asiente + .32, .26, 14);
  // y con un brinco decidido, se pone a trabajar: el golpe al caer suelta el anillo de tinta
  lift += hop(t, E.toque - .34, .34, 60);
  const listo = smooth(prog(t, E.toque + .1, E.toque + .5));
  if (listo > 0) { m2 = [lerp(1.32, 1.1, listo), lerp(.22, -1.15, listo)]; a2 = lerp(.6, 1, listo); m1 = [lerp(-1.32, -1.1, listo), lerp(.22, -1.15, listo)]; a1 = lerp(.6, 1, listo); }
  if (t >= E.lapiz - .2 && t < E.maquina - .25) { const w = dibujosBola_punta(t); if (w) { m2 = w; a2 = .2; } }
  const gafete = t >= E.gafete ? 1 : 0;
  const d1 = t >= E.lapiz - .2 && t < E.maquina - .25 ? -.6 : 1;
  return { x, y, lift, sqx, sqy, phi, m1, m2, a1, a2, gafete, d1 };
}

let PUNTA_BOLA: V3 | null = null;
function dibujosBola_punta(t: number): V3 | null { return t < E.lapiz + .1 ? [NX0 + NW / 2 - 60, NY0 - 472, 40] : PUNTA_BOLA; }

function gafete(c: Ctx, x: number, y: number, R: number, phi: number, k: number) {
  const cf = Math.cos(phi); if (cf < .05 || k <= 0) return;
  const gx = x + Math.sin(phi) * R * .44, w = R * .64 * cf, h = R * .44, gy = y + R * .3 - (1 - ease.outBack(clamp(k), 2)) * R * .4;
  c.save(); c.translate(gx, gy); c.rotate(-.06);
  c.fillStyle = "#FFFFFF"; c.strokeStyle = TINTA; c.lineWidth = Math.max(1.5, R * .025);
  c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, R * .05); c.fill(); c.stroke();
  c.fillStyle = ACENTO; c.fillRect(-w / 2, -h / 2, w, h * .3);
  if (cf > .5) texto(c, "día 1", 0, h * .32, { fuente: mono(Math.max(9, R * .19)), color: TINTA });
  c.restore();
}

function dibujaGenio(c: Ctx, g: Genio, t: number): { x: number; y: number; R: number } | null {
  const base = P(g.x, g.y, 0), cen = P(g.x, g.y, RB + g.lift);
  if (!base || !cen) return null;
  const R = RB * cen.s, G = R / 90;
  const alto = clamp(g.lift / 300);
  sombra(c, base.x, base.y, 150 * G * (1 - alto * .4), .32 * (1 - alto * .7));
  const mano = (m: Mano): Pt => {
    if (m.length === 3) { const p = P(m[0], m[1], m[2]); return p ? [p.x, p.y] : [cen.x, cen.y]; }
    return [cen.x + m[0] * R, cen.y + m[1] * R];
  };
  const h1 = mano(g.m1), h2 = mano(g.m2);
  const cy = cen.y + R * (1 - g.sqy);
  brazo(c, cen.x - 54 * G, cy - 50 * G, h1[0], h1[1], 90 * G, g.a1, TINTA, 1, G);
  brazo(c, cen.x + 60 * G, cy - 30 * G, h2[0], h2[1], -100 * G * g.d1, g.a2, TINTA, 1, G);
  c.save(); c.translate(cen.x, cen.y + R); c.scale(g.sqx, g.sqy); bola(c, 0, -R, R); c.restore();
  gafete(c, cen.x, cy, R * Math.min(g.sqx, 1.1), g.phi, g.gafete);
  return { x: cen.x, y: cy, R };
}

// ---------- el arranque: títulos que le cuelgan y se le caen ----------
function corona(c: Ctx, x: number, y: number, w: number, rot: number) {
  const h = w * .52;
  c.save(); c.translate(x, y); c.rotate(rot);
  c.fillStyle = ACENTO; c.strokeStyle = TINTA; c.lineWidth = Math.max(2, w * .03); c.lineJoin = "round";
  c.beginPath(); c.moveTo(-w / 2, 0); c.lineTo(-w / 2, -h); c.lineTo(-w / 4, -h * .45); c.lineTo(0, -h * 1.08); c.lineTo(w / 4, -h * .45); c.lineTo(w / 2, -h); c.lineTo(w / 2, 0); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = "#FFFFFF"; for (const [px, py] of [[-w / 2, -h], [0, -h * 1.08], [w / 2, -h]]) { c.beginPath(); c.arc(px, py, w * .06, 0, TAU); c.fill(); c.stroke(); }
  c.fillStyle = TINTA; c.fillRect(-w / 2, -h * .2, w, h * .1);
  c.restore();
}
function medalla(c: Ctx, x: number, y: number, r: number, rot: number) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.fillStyle = ACENTO; c.strokeStyle = TINTA; c.lineWidth = Math.max(2, r * .07);
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * r * .2, 0); c.lineTo(s * r * .75, r * 1.9); c.lineTo(s * r * .35, r * 1.65); c.lineTo(s * r * .05, r * 1.95); c.closePath(); c.fill(); c.stroke(); }
  c.fillStyle = "#FFFFFF"; c.beginPath();
  for (let i = 0; i < 24; i++) { const a = i / 24 * TAU, rr = r * (i % 2 ? .86 : 1); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  c.closePath(); c.fill(); c.stroke();
  c.fillStyle = TINTA; c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i / 10 * TAU, rr = r * (i % 2 ? .24 : .58); c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  c.closePath(); c.fill();
  c.restore();
}
function faja(c: Ctx, x: number, y: number, R: number, k: number, rot: number) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.beginPath(); c.rect(-R * 1.4, -R * .21, R * 2.8 * clamp(k), R * .42); c.clip();
  c.fillStyle = "#FFFFFF"; c.strokeStyle = ACENTO; c.lineWidth = Math.max(2, R * .04);
  c.fillRect(-R * 1.4, -R * .19, R * 2.8, R * .38); linea(c, -R * 1.4, -R * .15, R * 1.4, -R * .15); linea(c, -R * 1.4, R * .15, R * 1.4, R * .15);
  c.strokeStyle = TINTA; c.lineWidth = Math.max(1.5, R * .02); c.strokeRect(-R * 1.4, -R * .19, R * 2.8, R * .38);
  texto(c, "EXPERTO", 0, R * .075, { fuente: mono(Math.round(R * .2)), color: TINTA });
  c.restore();
}

type Titulo = { t: number; u: number; v: number; ru: number; rv: number; giro: number; dib: (c: Ctx, x: number, y: number, R: number, rot: number, k: number) => void };
const TITULOS: Titulo[] = [
  { t: E.corona, u: 0, v: -1.0, ru: -1.05, rv: 1.02, giro: -2.2, dib: (c, x, y, R, rot) => corona(c, x, y, R * 1.15, rot) },
  { t: E.medalla, u: .36, v: -.22, ru: 1.2, rv: 1.1, giro: 3.1, dib: (c, x, y, R, rot) => medalla(c, x, y, R * .26, rot) },
  { t: E.faja, u: 0, v: .05, ru: .2, rv: 1.18, giro: .8, dib: (c, x, y, R, rot, k) => faja(c, x, y, R, k, -.55 + rot) },
];

function titulos(c: Ctx, t: number, b: { x: number; y: number; R: number }) {
  if (t > t0.sirve + 1.4) return;
  const { x, y, R } = b;
  TITULOS.forEach((it, i) => {
    if (t < it.t - .25) return;
    let u = it.u, v = it.v, rot = 0, k = 1, plano = 1;
    // llega
    if (it === TITULOS[0]) v = lerp(-3.4, it.v, ease.outBack(prog(t, it.t - .25, it.t), 1.2));
    if (it === TITULOS[1]) k = lerp(2.4, 1, ease.outBack(prog(t, it.t - .12, it.t + .1), 1.6));
    const kf = it === TITULOS[2] ? ease.outCubic(prog(t, it.t - .2, it.t + .12)) : 1;
    // se cae con gravedad y rebota en la mesa
    const a = t - E.caen - i * .05;
    if (a > 0) {
      const g = 13, cae = Math.sqrt(2 * (it.rv - it.v) / g);
      if (a < cae) { v = it.v + .5 * g * a * a; u = lerp(it.u, it.ru, a / cae); rot = it.giro * a; }
      else { const b2 = a - cae; v = it.rv - .14 * Math.exp(-b2 * 7) * Math.abs(Math.sin(b2 * 13)); u = it.ru; rot = it.giro * cae; plano = lerp(1, .6, smooth(b2 / .2)); }
    }
    // la mano los barre fuera del cuadro
    const tb = t0.sirve + .1 + .45 * clamp((1.5 - u) / 3.4);
    const sw = t - tb;
    let dx = 0, dy = 0;
    if (sw > 0) { dx = -4200 * sw; dy = -900 * sw + 2600 * sw * sw; rot += sw * 9; }
    c.save(); c.translate(x + u * R + dx, y + v * R + dy); c.scale(1, plano); it.dib(c, 0, 0, R * k, rot, kf); c.restore();
  });
}

function cita(c: Ctx, t: number) {
  if (t < t0.eres - .1 || t > E.caen + 1.3) return;
  const filas: [string, number, number][][] = [[["«Eres", t0.eres, 0], ["el", t0.el, 0], ["mejor", t0.mejor, 0]], [["experto", t0.experto, 1], ["del", t0.del, 1], ["mundo»", t0.mundo, 1]]];
  const fu = serif(122, true); c.font = fu;
  let i = 0;
  for (const fila of filas) {
    const ws = fila.map(([s]) => c.measureText(s + " ").width), W = ws.reduce((a, b) => a + b, 0) - c.measureText(" ").width;
    let x = 540 - W / 2;
    fila.forEach(([s, tt, f], j) => {
      const k = ease.outBack(prog(t, tt - .06, tt + .2), 1.8), a = smooth(prog(t, tt - .06, tt + .08));
      const cae = t - E.caen - i * .045; i++;
      const dy = cae > 0 ? 3600 * cae * cae : 0, rot = cae > 0 ? (i % 2 ? 1 : -1) * cae * 1.6 : 0;
      const cx = x + ws[j] / 2 - c.measureText(" ").width / 2, cy = 300 + f * 136;
      if (a > 0 && dy < 1800) { c.save(); c.translate(cx, cy + dy); c.rotate(rot); c.scale(k, k); texto(c, s, 0, 0, { fuente: fu, color: TINTA, alfa: a }); c.restore(); }
      x += ws[j];
    });
  }
}

function estrella(c: Ctx, x: number, y: number, r: number, color: string) {
  c.fillStyle = color; c.beginPath();
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU - Math.PI / 2, rr = i % 2 ? r * .28 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath(); c.fill();
}
function brillo(c: Ctx, t: number, b: { x: number; y: number; R: number }, tb: number, color = TINTA) {
  const a = t - tb; if (a < 0 || a > 1.6) return;
  const { x, y, R } = b;
  // un destello que cruza la bola
  if (a < .6) {
    c.save(); c.beginPath(); c.arc(x, y, R * .98, 0, TAU); c.clip();
    c.translate(x + lerp(-1.6, 1.6, a / .6) * R, y); c.rotate(.5);
    const g = c.createLinearGradient(-R * .3, 0, R * .3, 0); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(.5, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g; c.fillRect(-R * .3, -R * 2, R * .6, R * 4); c.restore();
  }
  const S: [number, number, number][] = [[-1.35, -.95, 0], [1.3, -1.2, .12], [1.55, .1, .24], [-1.6, .2, .34]];
  for (const [u, v, d] of S) {
    const k = ease.outBack(prog(a, d, d + .25), 2.4) * (1 - smooth(prog(a, d + .7, d + 1.1)));
    if (k > 0) estrella(c, x + u * R, y + v * R, R * .22 * k, d === .12 ? ACENTO : color);
  }
}

function interroga(c: Ctx, t: number, b: { x: number; y: number; R: number }, ts: number[], color = TINTA, px = 1.1) {
  ts.forEach((tt, i) => {
    const a = t - tt; if (a < 0 || a > 1.1) return;
    const k = ease.outBack(prog(a, 0, .25), 2.2), al = 1 - smooth(prog(a, .7, 1.1));
    const u = [-1.1, 1.0, 0][i % 3], v = [-1.45, -1.6, -2.0][i % 3];
    const R = Math.max(b.R, 80);
    c.save(); c.translate(b.x + u * R, b.y + v * R - a * 30); c.rotate((i % 2 ? .18 : -.15)); c.scale(k, k);
    texto(c, "?", 0, 0, { fuente: serif(Math.round(R * px), true), color, alfa: al }); c.restore();
  });
}

// ---------- la máquina de frases mágicas ----------
function ranura(c: Ctx, t: number, b: { x: number; y: number; R: number }) {
  const k = ease.outBack(prog(t, E.ranura - .1, E.ranura + .25), 2) * (1 - smooth(prog(t, E.colega, E.colega + .25)));
  if (k <= 0) return;
  const { x, y, R } = b, salta = t > E.colega ? -900 * (t - E.colega) ** 1.5 : 0;
  c.save(); c.translate(x, y - R * .97 + salta); c.scale(k, k);
  c.fillStyle = "#3a3a38"; c.strokeStyle = TINTA; c.lineWidth = R * .03;
  c.beginPath(); c.roundRect(-R * .34, -R * .1, R * .68, R * .2, R * .05); c.fill(); c.stroke();
  c.fillStyle = "#050505"; c.fillRect(-R * .22, -R * .025, R * .44, R * .05);
  c.restore();
}
const FICHAS = ["eres el mejor", "¡muy importante!", "abracadabra"];
function fichas(c: Ctx, t: number, b: { x: number; y: number; R: number }) {
  const { x, y, R } = b;
  FICHAS.forEach((s, i) => {
    // cada frase aparece grande, se lee, y se mete por la ranura
    const tt = E.fichas[i], a = t - (tt - .6); if (a < 0 || a > .8) return;
    const lado = i % 2 ? 1 : -1;
    const pop = ease.outBack(clamp(a / .18), 2), u = ease.inCubic(clamp((a - .35) / .25)), mete = clamp((a - .6) / .2);
    const sx = 540 + lado * 70, sy = 600 + i * 30 + Math.sin(a * 9) * 6;
    const px = lerp(sx, x, u), py = lerp(sy, y - R * 1.4, u) + mete * R * .5;
    const sc = lerp(1.05, .3, u) * pop, rot = lerp(lado * .1 + Math.sin(a * 7) * .03, 0, u);
    c.save();
    if (mete > 0) { c.beginPath(); c.rect(0, 0, 1080, y - R * .99); c.clip(); }
    c.translate(px, py); c.rotate(rot); c.scale(sc, sc);
    c.font = mono(70); const w = c.measureText(s).width + 64;
    c.fillStyle = "#FFFFFF"; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.roundRect(-w / 2, -64, w, 108, 14); c.fill(); c.stroke();
    c.strokeStyle = ACENTO; c.lineWidth = 3; c.beginPath(); c.roundRect(-w / 2 + 10, -54, w - 20, 88, 9); c.stroke();
    texto(c, s, 0, 13, { fuente: mono(70), color: TINTA });
    c.restore();
  });
  // chispas mágicas que no sirven de nada
  for (let i = 0; i < 3; i++) {
    const a = t - E.fichas[i] - .2; if (a < 0 || a > .9) continue;
    const r = azar(80 + i);
    for (let j = 0; j < 7; j++) {
      const ang = r() * TAU, d = R * (1.1 + a * 2.4 * (.6 + r() * .5));
      estrella(c, x + Math.cos(ang) * d, y - R * .6 + Math.sin(ang) * d * .7, R * .11 * (1 - a / .9), j % 3 ? TINTA : ACENTO);
    }
  }
}

function manoHumana(c: Ctx, t: number, b: { x: number; y: number; R: number }) {
  const k = ease.outCubic(prog(t, E.mano - .1, E.apreton)) * (1 - smooth(prog(t, t0.todo - .5, t0.todo)));
  if (k <= 0) return;
  const { x, y, R } = b;
  const sh = t > E.apreton ? Math.sin((t - E.apreton) * 20) * .18 * Math.exp(-(t - E.apreton) * 2.2) : 0;
  const hx = x + 1.72 * R + R * .2, hy = y + (.18 + sh) * R;
  const ox = lerp(1250, hx, k);
  c.save();
  c.fillStyle = TINTA; c.beginPath(); c.moveTo(1200, hy - R * .42); c.lineTo(ox + R * .55, hy - R * .34); c.lineTo(ox + R * .55, hy + R * .36); c.lineTo(1200, hy + R * .5); c.closePath(); c.fill();
  c.fillStyle = "#FFFFFF"; c.fillRect(ox + R * .45, hy - R * .36, R * .14, R * .74); c.strokeStyle = TINTA; c.lineWidth = 3; c.strokeRect(ox + R * .45, hy - R * .36, R * .14, R * .74);
  c.fillStyle = "#F1E6D6"; c.lineWidth = 4; c.lineJoin = "round";
  c.beginPath(); c.moveTo(ox + R * .46, hy - R * .3); c.quadraticCurveTo(ox - R * .05, hy - R * .42, ox - R * .3, hy - R * .12);
  c.quadraticCurveTo(ox - R * .4, hy + R * .1, ox - R * .1, hy + R * .2); c.quadraticCurveTo(ox + R * .1, hy + R * .36, ox + R * .46, hy + R * .3); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(ox - R * .05, hy - R * .3); c.quadraticCurveTo(ox - R * .25, hy - R * .5, ox - R * .02, hy - R * .52); c.stroke();
  c.restore();
}

// ---------- la tinta ----------
function tinta(c: Ctx, t: number) {
  const tau = relojTinta(t); if (tau < -1) return;
  const ondea = (i: number) => 1 + .045 * Math.sin(t * 1.7 + i * 1.3);
  for (const [esc, alfa] of [[1.14, .22], [1, .9]] as [number, number][]) {
    c.beginPath(); let hay = false;
    GOTAS.forEach((g, i) => {
      const k = ease.outCubic(prog(tau, g.t, g.t + .7)); if (k <= .01) return;
      const r = g.r * k * esc * ondea(i);
      for (let j = 0; j <= 14; j++) {
        const a = j / 14 * TAU, p = P(g.x + Math.cos(a) * r, g.y + Math.sin(a) * r, 0); if (!p) continue;
        if (j === 0) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y);
      }
      c.closePath(); hay = true;
    });
    if (hay) { c.fillStyle = ACENTO; c.globalAlpha = alfa; c.fill("nonzero"); }
  }
  c.globalAlpha = 1;
}

// ---------- el cuadro ----------
function dibuja(c: Ctx, t: number) {
  FR = Math.floor(t * 10);
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  polvo(c, t);
  cam = camaraEn(t);
  let sx = 0, sy = 0;
  for (const [g, a] of GOLPES) if (t > g && t < g + 1.2) { const e = a * Math.exp(-(t - g) * 8); sx += e * Math.sin((t - g) * 61) * .6; sy += e * Math.sin((t - g) * 47); }
  c.save(); c.translate(sx, sy);

  guirnalda(c, t);
  mesa(c);
  caminos(c, t);

  // la etiqueta del prompt de sistema
  const ke = prog(t, E.etiqueta - .25, E.etiqueta);
  if (ke > 0) {
    enPlano(c, ETQ.x, ETQ.y, 0, () => {
      const s = lerp(1.7, 1, ease.outBack(ke, 1.3)); c.scale(s, s); c.rotate(-.02);
      c.globalAlpha = clamp(ke * 3);
      c.fillStyle = "rgba(20,18,14,.15)"; c.fillRect(-ETQ.w / 2 + 6, -ETQ.h / 2 + 8, ETQ.w, ETQ.h);
      c.fillStyle = ACENTO; c.beginPath(); c.roundRect(-ETQ.w / 2, -ETQ.h / 2, ETQ.w, ETQ.h, 6); c.fill();
      c.fillStyle = "rgba(0,0,0,.18)"; c.fillRect(-ETQ.w / 2, ETQ.h / 2 - 8, ETQ.w, 8);
      texto(c, "prompt de sistema", 0, 14, { fuente: serif(46, true), color: "#FFFFFF" });
    });
  }

  // la nota grande: llega, se queda, y al final la arrancan
  const llega = t >= E.nota0 - .05;
  if (llega) {
    const u = ease.outCubic(prog(t, E.nota0 - .05, E.nota1));
    const vuela = ease.inCubic(prog(t, E.rasga, E.rasga + .5));
    NOF = { dx: 0, dy: -(1 - u) * 760 - vuela * 900, dz: (t < E.nota1 + .3 ? 18 * Math.exp(-(t - E.nota1) * 9) * Math.abs(Math.sin((t - E.nota1) * 16)) * (t > E.nota1 ? 1 : 0) : 0) - vuela * 520 };
    // la nota corta ya estaba debajo
    if (t >= E.rasga) notaCorta(c, t);
    if (vuela < 1) {
      hoja(c, 1 - smooth(prog(vuela, .7, 1)));
      const punta = contenidoNota(c, t);
      PUNTA_BOLA = dibujosBola(c, t);
      rollo(c, t);
      // cintas en las esquinas: nota permanente
      E.cintas.forEach((ct, i) => {
        const esq: [number, number, number][] = [[0, 0, -.75], [NW, 0, .75], [NW, ND, -.75], [0, ND, .75]];
        cinta(c, esq[i][0], esq[i][1], esq[i][2], prog(t, ct - .12, ct + .1));
      });
      tinta(c, t);
      // la pluma de quien escribe, y la goma
      const escribiendo = punta && !(t > E.blanco - .2 && t < E.tres);
      if (escribiendo) pluma(c, punta, t);
      const gb = prog(t, E.arranca + .05, E.arranca + 1.0);
      if (gb > 0 && gb < 1) {
        const fila = Math.min(3, Math.floor(gb * 4)), f = (gb * 4) % 1;
        goma(c, nw(lerp(10, 300, fila % 2 ? 1 - f : f), [122, 194, 266, 338][fila] - 16), t);
      }
    }
  }

  // ---------- objetos de pie, del fondo hacia la cámara ----------
  type Obj = { y: number; f: () => void };
  const objs: Obj[] = [];
  const tau = relojTinta(t);
  DEST.forEach((d, k) => {
    const pop = ease.outBack(prog(t, E.fiesta[k], E.fiesta[k] + .38), 1.8);
    if (pop <= 0) return;
    const moj = d.id === "mama" ? smooth(prog(tau, E.llegaMama - .35, E.llegaMama + .55)) : d.id === "redes" ? smooth(prog(tau, E.llegaRedes - .3, E.llegaRedes + .6)) : 0;
    const salta = E.fiesta[k] < t && t < E.gira + 1.5 ? hop(t, E.gira + k * .12, .3, .12) : 0;
    objs.push({ y: d.y, f: () => cartel(c, d.id, d.x, d.y, t, pop, moj, Math.sin(t * 1.3 + k) * .02 + salta) });
  });
  // la cerca de reglas
  if (t >= E.estacas[0] - .5 && t < E.barre + .7) {
    ORDEN.forEach((kk, i) => {
      const te = E.estacas[i], a = t - (te - .45); if (a < 0) return;
      const [ex, ey] = posEst(kk);
      const sale = nw(26 + 60, 60 + i * 35);
      const u = clamp(a / .45), cae = smooth(prog(t, E.barre + .02 * i, E.barre + .35 + .02 * i));
      const x = lerp(sale[0], ex, u), y = lerp(sale[1], ey, u), z = Math.sin(Math.PI * u) * 240 + sale[2] * (1 - u);
      const rebote = a > .45 ? 1 + .25 * Math.exp(-(a - .45) * 9) * Math.sin((a - .45) * 30) : lerp(.6, 1, u);
      const vecina = kk === 1 ? -1 : kk === 13 ? 1 : 0, empuja = vecina && t > E.atora ? vecina * .26 * (1 - cae) * Math.min(1, (t - E.atora) * 8) : 0;
      objs.push({ y, f: () => {
        if (u < 1) {
          const p = P(x, y, z); if (!p) return;
          c.save(); c.translate(p.x, p.y); c.rotate((1 - u) * 3.5); c.scale(p.s * .9, p.s * .9); figura(c, "estaca", PAL, t); c.restore();
        } else cartel(c, "estaca", x, y, t, rebote, 0, empuja, 1 - cae * .85, 1 - cae);
      } });
    });
  }
  // la regla sola, sin razón, en el camino de mamá
  if (t >= E.estaca - .4 && t < E.vuelve + .5) {
    const k = ease.outBack(prog(t, E.estaca - .2, E.estaca + .05), 1.8), al = 1 - smooth(prog(t, E.vuelve, E.vuelve + .4));
    const moj = smooth(prog(tau, E.llegaMama - .35, E.llegaMama + .55)) * (t > E.florece ? 1 : 0);
    objs.push({ y: EST_MAMA[1], f: () => cartel(c, "estaca", EST_MAMA[0], EST_MAMA[1], t, k, moj, 0, 1, al) });
  }
  const g = genioEn(t);
  let B: { x: number; y: number; R: number } | null = null;
  objs.push({ y: g.y, f: () => { B = dibujaGenio(c, g, t); } });
  objs.sort((a, b) => b.y - a.y).forEach((o) => o.f());
  c.restore();

  // ---------- lo que va encima ----------
  const b = B as { x: number; y: number; R: number } | null;
  if (b) {
    if (t < t0.sirve + 1.4) titulos(c, t, b);
    brillo(c, t, b, E.brillo);
    if (t > E.lapiz - .3 && t < E.maquina - .25) lapiz(c, g, b);
    interroga(c, t, b, E.duda);
    interroga(c, t, b, [E.previste], ACENTO, 1.5);
    ranura(c, t, b);
    fichas(c, t, b);
    manoHumana(c, t, b);
    brillo(c, t, b, E.entiende + .1, ACENTO);
  }
  cita(c, t);
  rotulos(c, t);
}

function lapiz(c: Ctx, g: Genio, b: { x: number; y: number; R: number }) {
  if (g.m2.length !== 3) return;
  const p = P(g.m2[0], g.m2[1], g.m2[2]); if (!p) return;
  const s = b.R / 90;
  c.save(); c.translate(p.x, p.y); c.rotate(Math.PI + .64); c.scale(s, s);
  c.fillStyle = TINTA; c.beginPath(); c.moveTo(0, 0); c.lineTo(-9, -26); c.lineTo(9, -26); c.closePath(); c.fill();
  c.fillStyle = "#FFFFFF"; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.rect(-9, -150, 18, 124); c.fill(); c.stroke();
  c.fillStyle = ACENTO; c.fillRect(-9, -162, 18, 14);
  c.restore();
}

function notaCorta(c: Ctx, t: number) {
  const a = PEG.w / 2;
  const q: V3[] = [[PEG.x - a, PEG.y + a, 0], [PEG.x + a, PEG.y + a, 0], [PEG.x + a, PEG.y - a, 0], [PEG.x - a, PEG.y - a, 0]];
  c.fillStyle = "rgba(20,18,14,.13)"; if (poli(c, q.map(([x, y, z]) => [x + 8, y - 10, z] as V3))) c.fill();
  c.fillStyle = "#FDFCF8"; c.strokeStyle = TINTA; c.lineWidth = 3.5; if (poli(c, q)) { c.fill(); c.stroke(); }
  c.fillStyle = ACENTO; if (poli(c, [q[0], q[1], [PEG.x + a, PEG.y + a - 26, 0], [PEG.x - a, PEG.y + a - 26, 0]])) c.fill();
  enPlano(c, PEG.x, PEG.y + 18, 0, () => texto(c, "Es", 0, 0, { fuente: serif(64, true), color: TINTA }));
  enPlano(c, PEG.x, PEG.y - 52, 0, () => texto(c, "sorpresa.", 0, 0, { fuente: serif(64, true), color: ACENTO }));
  // la palmada final suelta un anillo de tinta
  const a2 = t - E.toque;
  if (a2 > 0 && a2 < 1.4) {
    const r = 120 + a2 * 520;
    c.save(); c.globalAlpha = .55 * (1 - a2 / 1.4); c.strokeStyle = ACENTO; c.lineWidth = 6; c.beginPath();
    for (let j = 0; j <= 48; j++) { const an = j / 48 * TAU, p = P(PEG.x + Math.cos(an) * r, PEG.y + Math.sin(an) * r, 0); if (p) { if (j) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); } }
    c.stroke(); c.restore();
  }
}

function rotulos(c: Ctx, t: number) {
  const Y = 300;
  rotulo(c, t, t0.agente, t0.eres - .42, "un agente", Y, 124, TINTA, true);
  rotulo(c, t, E.brillo - .02, E.abre, "brillante", Y, 164, TINTA, true);
  rotulo(c, t, t0.empezo, E.abre, "que empezó hoy", Y + 140, 104, TINTA, false);
  rotulo(c, t, t0.genio, t0.organizar - .1, "un genio", Y, 136, TINTA, true);
  rotulo(c, t, t0.organizar, E.nota0 + .2, "la fiesta de mamá", Y - 30, 112, ACENTO, true);
  rotulo(c, t, t0.cada - .1, E.rueda, "para cada cosa", Y - 20, 118, TINTA, true);
  rotulo(c, t, t0.previste - .05, E.barre - .1, "no previste", Y - 20, 132, ACENTO, true);
  rotulo(c, t, E.paraque - .05, t0.esuna - .1, "para qué", Y - 20, 176, ACENTO, true);
  rotulo(c, t, t0.redes, E.nadie - .1, "en redes", Y - 40, 124, TINTA, true);
  rotulo(c, t, E.nadie, E.rebobina - .2, "nadie se lo dijo", Y - 40, 112, ACENTO, true);
  rotulo(c, t, t0.sin, t0.con - .2, "regla sin razón", Y - 70, 100, TINTA, false);
  rotulo(c, t, t0.obedece, t0.con - .2, "se obedece", Y + 60, 136, TINTA, true);
  rotulo(c, t, t0.con, E.vuelve - .1, "regla con razón", Y - 70, 100, ACENTO, false);
  rotulo(c, t, t0.entiende, E.vuelve - .1, "se entiende", Y + 60, 136, ACENTO, true);
  rotulo(c, t, E.tres - .05, E.c1[0] - .1, "tres cosas", Y - 60, 120, TINTA, true);
  rotulo(c, t, t0.demas + .55, E.maquina - .1, "déjaselo a él", Y - 40, 118, ACENTO, true);
  rotulo(c, t, t0.frases - .05, E.colega - .1, "frases mágicas", Y - 40, 128, ACENTO, true);
  rotulo(c, t, t0.colega - .05, t0.todo - .2, "colega nuevo", Y - 40, 128, TINTA, true);
  rotulo(c, t, t0.todo, E.rasga, "no le dice todo", Y - 40, 112, TINTA, true);
  rotulo(c, t, t0.loque - .05, 999, "lo que no", Y - 60, 118, TINTA, true);
  rotulo(c, t, t0.loque + .3, 999, "podría adivinar", Y + 70, 118, ACENTO, true);
}

export const Pieza: React.FC = () => <Lienzo dibuja={(c, t) => dibuja(c, t)} preparar={() => ({})} />;
