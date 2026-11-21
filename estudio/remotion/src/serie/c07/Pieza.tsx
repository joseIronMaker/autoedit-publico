// Capítulo 7. Hambre y escala: un solo mundo con un plato de loza. La red diminuta se queda sin nada que
// comer, llueven fotos hasta hacer una montaña, la bola resulta ser el personaje de un videojuego cuyos
// pixeles son multiplicaciones de verdad (el tono de cada celda ES su producto), y la montaña se la come
// AlexNet. Las barras del 26.2 y el 15.3 salen del cero y comparten escala: nada de eje recortado.
import React from "react";
import { azar, Cam, camara, clamp, ease, lerp, prog, resorte, smooth, smoother, texto, Vista } from "../../kit";
import { ACENTO, anillo, bola, cue, flecha, GRIS, Lienzo, LUZ, mono, NOCHE, PAPEL, rotulo, serif, sombra, TINTA } from "../../marca";
import palabras from "./palabras.json";
import duracion from "./duracion.json";

export const DURACION = duracion.dur;
const T = cue(palabras);
const QUE = T("que internet").s;

// Los tiempos de Whisper fallan en tres sitios y aquí se corrigen contra el envolvente real de la voz.
const t0 = {
  ya: T("ya sabíamos").s, casi: T("casi todo").s, aqui: T("has visto aquí").s,
  neu: T("neuronas").s, cap: T("capas").s, err: T("error").s, rep: T("repartir").s, cul: T("la culpa").s,
  y: T("y no funcionaba").s, las: T("las redes").s, chi: T("chiquitas").s, len: T("lentas").s, otr: T("otros métodos").s, gan: T("ganaban").s,
  idea: T("la idea era").s, cor: T("correcta").s, le: T("le faltaban").s, dos: T("dos cosas").s, cosas: T("cosas").s,
  pri: T("la primera").s, com: T("comida").s, una: T("una red aprende").s, eje: T("ejemplos").s, nohay: T("casi no había").s, habia: T("había").e,
  hasta: QUE - .22, que: QUE, fotos: T("de fotos").e, equipo: T("un equipo").s, etiq: T("etiquetó").s, mills: T("millones").s, con: T("con ayuda").s, miles: T("miles de personas").s,
  fo1: T("foto por foto").s, fo2: T("por foto").s, fo3: T("por foto").e - .22,
  seg: T("la segunda").s, mus: T("músculo").s, ent: T("entrenar").s, mul: T("multiplicar").s, otra: T("una y otra").s, vez: T("otra vez").e,
  res: T("y resulta").s, tar: T("las tarjetas").s, pin: T("para pintar").s, vid: T("videojuegos").s,
  d12: T("en dos mil").s, junto: T("se juntó").s, red: T("una red llamada").s, alex: T("alexnet").s,
  dt: T("dos tarjetas").s, ven: T("vendían").s, cual: T("cualquier").s, mas: T("de un millón").s - .33, foto2: T("millón de fotos").e,
  conc: T("en el concurso").s, lugar: T("el segundo lugar").s, v26: T("veintiséis").s, cien: T("por ciento").e,
  al2: T("alexnet el quince").s, q15: T("quince").s - .2, nadie: T("nadie había").s, salto: T("salto").s,
  nt: T("y no traía").s, nueva: T("nueva").s, era: T("era casi").s, och: T("los ochenta").s, gde: T("en grande").s,
  por: T("por eso").s, gol: T("de golpe").e - .22, aun: T("aunque").s, esp: T("esperando").s,
  aid: T("a la idea").s, intel: T("faltó inteligencia").e - .7, lef: T("le faltó comida").s + .09, com2: T("le faltó comida").e, fin: DURACION,
};

// ---------- el mundo ----------
const NY = -1.8, RP = 5;                 // la red vive en (0, NY); el plato en el origen
const EJE_Y = 6.3, RM = 8, HM = 10.4;    // la montaña crece detrás de la red, sin enterrarla
type V = Vista & { f: number; cy: number; cx: number };
const VS: Record<string, V> = {
  ini: { tx: 0, ty: -.3, tz: .5, yaw: 0, pitch: .52, dist: 13.5, f: 1250, cy: 1190, cx: 540 },
  red: { tx: 0, ty: NY, tz: .4, yaw: 0, pitch: .46, dist: 8.5, f: 9400, cy: 820, cx: 540 },
  w1: { tx: 0, ty: -.2, tz: .4, yaw: .05, pitch: .6, dist: 13, f: 1250, cy: 1120, cx: 540 },
  w2: { tx: 0, ty: -.2, tz: .4, yaw: -.03, pitch: .5, dist: 14, f: 1250, cy: 1240, cx: 540 },
  med: { tx: 0, ty: NY - .35, tz: .35, yaw: .04, pitch: .46, dist: 7, f: 2300, cy: 1000, cx: 540 },
  mon: { tx: 0, ty: 3, tz: 4.5, yaw: .03, pitch: .13, dist: 36, f: 3000, cy: 1010, cx: 540 },
  her: { tx: 0, ty: -.2, tz: 1.32, yaw: 0, pitch: .12, dist: 14, f: 6500, cy: 900, cx: 540 },
  m2: { tx: 0, ty: 3, tz: 4.5, yaw: -.03, pitch: .13, dist: 36, f: 3000, cy: 1490, cx: 540 },
  fin: { tx: 0, ty: -1.4, tz: .4, yaw: 0, pitch: .52, dist: 10, f: 1800, cy: 1270, cx: 540 },
};
type Clave = { t: number; d: number; v: V; c?: (x: number) => number };
const RUTA: Clave[] = [
  { t: 0, d: 0, v: VS.ini },
  { t: t0.aqui + .55, d: 1.15, v: VS.red },
  { t: t0.las, d: 1.2, v: VS.w1, c: ease.outExpo },
  { t: t0.idea - .3, d: 1.3, v: VS.w2 },
  { t: t0.una - .34, d: 1.05, v: VS.med },
  { t: t0.habia + .04, d: 1.1, v: VS.w1 },
  { t: t0.que + .3, d: 2.9, v: VS.mon },
  { t: t0.fo1 - .46, d: .42, v: VS.her, c: ease.outExpo },
  { t: t0.seg - .62, d: .9, v: VS.mon },
  { t: t0.junto + .85, d: .7, v: VS.m2 },
  { t: t0.aun + .4, d: 0, v: { ...VS.fin, cx: -1700 } },
  { t: t0.aun + .4, d: 2.1, v: VS.fin, c: ease.inOutCubic },
];
const mez = (a: V, b: V, k: number): V => ({ tx: lerp(a.tx, b.tx, k), ty: lerp(a.ty, b.ty, k), tz: lerp(a.tz, b.tz, k), yaw: lerp(a.yaw, b.yaw, k), pitch: lerp(a.pitch, b.pitch, k),
  dist: a.dist * (b.dist / a.dist) ** k, f: a.f * (b.f / a.f) ** k, cy: lerp(a.cy, b.cy, k), cx: lerp(a.cx, b.cx, k) });
function vistaEn(t: number) {
  let v = RUTA[0].v;
  for (let i = 1; i < RUTA.length; i++) {
    const k = RUTA[i]; if (t < k.t) break;
    v = k.d <= 0 ? k.v : mez(v, k.v, (k.c ?? ease.inOutCubic)(prog(t, k.t, k.t + k.d)));
  }
  return v;
}

// ---------- golpes: mueven la cámara, y el sonido nace del mismo instante ----------
const DIG86 = [.46, .74, 1.14, 1.52];
const DIG12 = [t0.d12 + .17, t0.d12 + .4, t0.d12 + .62, t0.d12 + .84];
const GOLPES: [number, number][] = [[.05, 26], ...DIG86.map((x, i) => [x, 16 + i * 4] as [number, number]), [t0.y, 14], [t0.dos, 12], [t0.cosas, 14], ...DIG12.map((x, i) => [x, 16 + i * 4] as [number, number]),
  [t0.q15 + .12, 10], [t0.gol, 30]];
function temblor(t: number) {
  let x = 0, y = 0;
  GOLPES.forEach(([q, a], i) => { const d = t - q; if (d >= 0 && d < .7) { const e = a * Math.exp(-d * 8); x += e * Math.sin(d * 61 + i); y += e * Math.cos(d * 47 + i * 2); } });
  return { x, y };
}

// ---------- fotos: rectángulos e iconos abstractos, nunca imágenes reales ----------
const FW = 300, FH = 372, TAGS = ["gato", "barco", "hongo", "silla", "pez", "árbol", "perro", "taza"];
function icono(c: CanvasRenderingContext2D, tipo: number) {
  c.beginPath();
  const elip = (x: number, y: number, a: number, b: number, r = 0) => { c.moveTo(x + a * Math.cos(r), y + a * Math.sin(r)); c.ellipse(x, y, a, b, r, 0, 6.2832); };
  const tri = (a: number, b: number, d: number, e: number, f: number, g: number) => { c.moveTo(a, b); c.lineTo(d, e); c.lineTo(f, g); c.closePath(); };
  const caja = (x: number, y: number, w: number, h: number) => c.rect(x, y, w, h);
  switch (tipo) {
    case 0: elip(0, .3, .45, .6); elip(-.05, -.42, .34, .3); tri(-.36, -.52, -.34, -.92, -.08, -.66); tri(.26, -.52, .24, -.92, -.02, -.66); elip(.5, .68, .36, .1, -.3); break;
    case 1: c.moveTo(-.85, .3); c.lineTo(.85, .3); c.lineTo(.56, .72); c.lineTo(-.56, .72); c.closePath(); caja(-.04, -.85, .08, 1.2); tri(.1, -.8, .1, .16, .74, .16); tri(-.1, -.5, -.1, .16, -.56, .16); break;
    case 2: c.moveTo(-.8, -.05); c.quadraticCurveTo(0, -1.25, .8, -.05); c.closePath(); c.moveTo(-.2, -.05); c.lineTo(.2, -.05); c.lineTo(.3, .78); c.lineTo(-.3, .78); c.closePath(); break;
    case 3: caja(-.46, -.82, .14, 1.6); caja(-.46, .02, .92, .15); caja(.32, .02, .14, .76); caja(-.46, -.78, .7, .13); break;
    case 4: elip(-.14, 0, .62, .34); tri(.36, 0, .86, -.42, .86, .42); break;
    case 5: elip(0, -.3, .62, .6); elip(-.34, .04, .36, .32); elip(.36, .04, .36, .32); caja(-.09, .1, .18, .72); break;
    case 6: elip(-.04, .12, .6, .27); elip(.62, -.22, .25, .22); tri(.52, -.38, .34, -.1, .5, -.06); caja(-.56, .2, .13, .56); caja(.36, .2, .13, .56); caja(-.26, .2, .1, .5); caja(.14, .2, .1, .5); tri(-.56, 0, -.9, -.34, -.54, .14); elip(.88, -.2, .1, .07); break;
    default: c.moveTo(-.56, -.4); c.lineTo(.4, -.4); c.lineTo(.3, .62); c.lineTo(-.46, .62); c.closePath(); elip(.56, .04, .28, .3); break;
  }
  c.fill("evenodd");
}

type Foto = { x: number; y: number; z: number; ax: number; ay: number; az: number; bx: number; by: number; bz: number; nx: number; ny: number; nz: number; k: number; tl: number;
  dx: number; dy: number; gir: number; col: string; cie: string; sue: string; tipo: number; tag: number; dep: number; rx: number; ry: number };
const FOTO_W = .3, FOTO_H = .372;
const tonos: string[] = []; for (let i = 0; i < 256; i++) { const v = i / 255; const R = lerp(17, 244, v), G = lerp(17, 242, v), B = lerp(17, 236, v); tonos.push(`rgb(${R | 0},${G | 0},${B | 0})`); }
const tono = (v: number) => tonos[Math.round(clamp(v) * 255)];
const alto = (th: number, rho: number) => HM * Math.max(1 - rho, 0) ** 1.25 * (1 + .1 * Math.sin(3 * th + 1) + .06 * Math.sin(7 * th + 2));

const N_MONTE = 2600, CAIDA = 1.15;
const T_LLUVIA = t0.que + .72, D_LLUVIA = 3.1, T_COME = t0.mas + .04, D_COME = 2.05;
const SOLAS = [t0.hasta + .4, t0.que + .36, t0.que + .62];             // las primeras tres caen solas, con silencio entre ellas

type Gente = { th: number; r0: number; v: number; f: number; lleva: boolean };
type Datos = { F: Foto[]; G: Gente[]; H: { x: number; y: number; z: number; tipo: number }[] };

function prepara(): Datos {
  const r = azar(77), F: Foto[] = [];
  for (let i = 0; i < N_MONTE; i++) {
    const u = (i + 1) / N_MONTE, k = Math.cbrt(u);
    const th = Math.PI * (1.01 + r() * .98), rho = Math.sqrt(r()) * .985;
    const rr = RM * k * rho, x = Math.cos(th) * rr, y = EJE_Y + Math.sin(th) * rr, z = alto(th, rho) * k + (r() - .5) * .1;
    const pend = Math.atan(1.25 * HM / RM * Math.max(1 - rho, .02) ** .25 * .8);
    const ux = -Math.sin(th), uy = Math.cos(th), vx = -Math.cos(th) * Math.cos(pend), vy = -Math.sin(th) * Math.cos(pend), vz = Math.sin(pend);
    const a = r() < .84 ? (r() - .5) * 1.2 : r() * 6.28, ca = Math.cos(a), sa = Math.sin(a);
    const e1x = ca * ux + sa * vx, e1y = ca * uy + sa * vy, e1z = sa * vz, e2x = -sa * ux + ca * vx, e2y = -sa * uy + ca * vy, e2z = ca * vz;
    let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
    const luz = clamp(.56 + nx * -.48 + ny * -.12 + nz * .32 + (r() - .5) * .16, .28, 1);
    const b = lerp(.66, 1.01, luz), sc = b * 244, sg = b * 242, sb = b * 236;
    const base = .34 + r() * .52, oscu = lerp(.55, 1, luz);
    F.push({ x, y, z, ax: e1x * FOTO_W, ay: e1y * FOTO_W, az: e1z * FOTO_W, bx: e2x * FOTO_H, by: e2y * FOTO_H, bz: e2z * FOTO_H, nx, ny, nz, k,
      tl: T_LLUVIA + D_LLUVIA * u ** .62, dx: (r() - .5) * 1.6, dy: (r() - .5) * 1.6, gir: 3 + r() * 9, col: `rgb(${Math.min(sc, 253) | 0},${Math.min(sg, 251) | 0},${Math.min(sb, 247) | 0})`,
      cie: tono(base * oscu), sue: tono((base - .22) * oscu), tipo: Math.floor(r() * 8), tag: r() < .72 ? t0.etiq + .06 + 2.6 * (z / HM * .75 + r() * .25) : 1e9, dep: T_COME + D_COME * (1 - k) ** .8 * 1.5, rx: r() * 6.28, ry: r() });
  }
  const G: Gente[] = [];
  for (let i = 0; i < 420; i++) G.push({ th: Math.PI * (1.04 + r() * .92), r0: r(), v: .012 + r() * .018, f: r() * 6.28, lleva: r() < .55 });
  // las tres de "foto por foto", de frente a la cámara
  const H = [{ x: -.76, y: -.24, z: 1.3, tipo: 0 }, { x: 0, y: -.32, z: 1.34, tipo: 1 }, { x: .76, y: -.24, z: 1.3, tipo: 2 }];
  return { F, G, H };
}

/** Una foto en coordenadas locales FW×FH. `tag` se estampa en el borde de abajo. */
function fotoLocal(c: CanvasRenderingContext2D, col: string, cie: string, sue: string, tipo: number, tag = "", tagK = 0) {
  c.fillStyle = col; c.fillRect(0, 0, FW, FH);
  c.strokeStyle = "rgba(30,26,20,.32)"; c.lineWidth = 2; c.strokeRect(0, 0, FW, FH);
  const iw = FW - 44, ih = FH - 104;
  c.save(); c.beginPath(); c.rect(22, 22, iw, ih); c.clip();
  c.fillStyle = cie; c.fillRect(22, 22, iw, ih);
  c.fillStyle = sue; c.fillRect(22, 22 + ih * .68, iw, ih * .4);
  c.translate(FW / 2, 22 + ih * .52); c.scale(100, 100); c.fillStyle = "#181817"; icono(c, tipo);
  c.restore();
  if (tagK > 0) {
    c.save(); c.translate(FW / 2, FH - 41); c.scale(lerp(.5, 1, ease.outBack(tagK)), lerp(.5, 1, ease.outBack(tagK))); c.rotate(-.025);
    c.fillStyle = ACENTO; c.beginPath(); c.roundRect(-118, -33, 236, 66, 8); c.fill();
    texto(c, tag, 0, 18, { fuente: serif(52, true), color: "#FBF7EE" });
    c.restore();
  }
}

function dibujaMonte(c: CanvasRenderingContext2D, cam: Cam, t: number, d: Datos) {
  const F = d.F, N = N_MONTE;
  // qué tan alto va el monte, para no dibujar lo que ya está enterrado
  const kVis = Math.min(prog(t, T_LLUVIA, T_LLUVIA + D_LLUVIA) ** .54, 1);
  const pDep = t < T_COME ? 0 : prog(t, T_COME, T_COME + D_COME * 1.5);
  const kRes = 1 - pDep ** (1 / .8);
  const kTop = Math.min(kVis, kRes);
  const i0 = Math.max(0, Math.floor(N * Math.max(kTop - .3, 0) ** 3));
  for (let i = i0; i < N; i++) {
    const f = F[i], tau = f.tl - t;
    if (tau > CAIDA) break;
    if (t >= f.dep) continue;
    const cae = tau > 0;
    let ox = 0, oy = 0, oz = 0, bx = f.bx, by = f.by, bz = f.bz;
    if (cae) {
      ox = f.dx * tau; oy = f.dy * tau; oz = 15 * tau * tau + 2.2 * tau;
      const a = tau * f.gir, ca = Math.cos(a), sa = Math.sin(a);
      bx = f.bx * ca + f.nx * FOTO_H * sa; by = f.by * ca + f.ny * FOTO_H * sa; bz = f.bz * ca + f.nz * FOTO_H * sa;
    }
    const X = f.x + ox, Y = f.y + oy, Z = f.z + oz;
    const A = cam.p(X - f.ax + bx, Y - f.ay + by, Z - f.az + bz), B = cam.p(X + f.ax + bx, Y + f.ay + by, Z + f.az + bz),
      C = cam.p(X + f.ax - bx, Y + f.ay - by, Z + f.az - bz), D = cam.p(X - f.ax - bx, Y - f.ay - by, Z - f.az - bz);
    if (!A || !B || !C || !D) continue;
    const xm = Math.min(A.x, B.x, C.x, D.x), xM = Math.max(A.x, B.x, C.x, D.x), ym = Math.min(A.y, B.y, C.y, D.y), yM = Math.max(A.y, B.y, C.y, D.y);
    if (xM < -20 || xm > 1100 || yM < -20 || ym > 1940) continue;
    const lado = Math.hypot(B.x - A.x, B.y - A.y);
    const tagK = prog(t, f.tag, f.tag + .22);
    if (lado >= 62) {
      c.save(); c.transform((B.x - A.x) / FW, (B.y - A.y) / FW, (D.x - A.x) / FH, (D.y - A.y) / FH, A.x, A.y);
      fotoLocal(c, f.col, f.cie, f.sue, f.tipo, TAGS[f.tipo], tagK); c.restore();
      continue;
    }
    c.fillStyle = f.col; c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.lineTo(C.x, C.y); c.lineTo(D.x, D.y); c.closePath(); c.fill();
    c.strokeStyle = "rgba(30,26,20,.3)"; c.lineWidth = 1; c.stroke();
    const P = (u: number, v: number) => [lerp(lerp(A.x, B.x, u), lerp(D.x, C.x, u), v), lerp(lerp(A.y, B.y, u), lerp(D.y, C.y, u), v)];
    const a = P(.08, .07), b = P(.92, .07), e = P(.92, .73), g = P(.08, .73);
    c.fillStyle = f.cie; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(e[0], e[1]); c.lineTo(g[0], g[1]); c.closePath(); c.fill();
    if (lado > 15) {
      const q1 = P(.08, .5), q2 = P(.92, .5);
      c.fillStyle = f.sue; c.beginPath(); c.moveTo(q1[0], q1[1]); c.lineTo(q2[0], q2[1]); c.lineTo(e[0], e[1]); c.lineTo(g[0], g[1]); c.closePath(); c.fill();
      const m = P(.5, .4); c.fillStyle = "#1B1B1A"; c.beginPath(); c.arc(m[0], m[1], lado * .17, 0, 7); c.fill();
    }
    if (tagK > 0) {
      const a2 = P(.14, .78), b2 = P(.86, .78), e2 = P(.86, .96), g2 = P(.14, .96);
      c.fillStyle = ACENTO; c.beginPath(); c.moveTo(a2[0], a2[1]); c.lineTo(b2[0], b2[1]); c.lineTo(e2[0], e2[1]); c.lineTo(g2[0], g2[1]); c.closePath(); c.fill();
    }
  }
}

/** Las tres fotos de "foto por foto": van encima de todo y de frente. */
function heroes(c: CanvasRenderingContext2D, cam: Cam, t: number, d: Datos) {
  const veces = [t0.fo1, t0.fo2, t0.fo3];
  d.H.forEach((h, i) => {
    if (t < T_LLUVIA + D_LLUVIA * .8 || t > T_COME) return;
    const w = FOTO_W * 1.15, a = cam.p(h.x - w, h.y, h.z + w * 1.24), b = cam.p(h.x + w, h.y, h.z + w * 1.24), e = cam.p(h.x - w, h.y, h.z - w * 1.24);
    if (!a || !b || !e) return;
    const g = (i - 1) * .03;
    c.save(); c.transform((b.x - a.x) / FW, (b.y - a.y) / FW + g, (e.x - a.x) / FH - g, (e.y - a.y) / FH, a.x, a.y);
    fotoLocal(c, "#FBFAF6", tono(.72 + i * .05), tono(.5 + i * .04), h.tipo, TAGS[h.tipo], prog(t, veces[i] - .03, veces[i] + .14));
    c.restore();
  });
}

function gente(c: CanvasRenderingContext2D, cam: Cam, t: number, d: Datos, a: number) {
  if (a <= .01) return;
  c.save(); c.globalAlpha = a; c.strokeStyle = TINTA; c.fillStyle = TINTA; c.lineCap = "round";
  const tags: [number, number, number][] = [];
  c.lineWidth = 1.7; c.beginPath();
  const cabezas: [number, number, number][] = [];
  for (const g of d.G) {
    const rho = .2 + ((g.r0 - t * g.v) % 1 + 1) % 1 * .74;
    const rr = RM * rho, x = Math.cos(g.th) * rr, y = EJE_Y + Math.sin(g.th) * rr, z = alto(g.th, rho);
    const p = cam.p(x, y, z); if (!p) continue;
    const h = .31 * p.s, ps = Math.sin(t * 9 + g.f) * h * .16;
    c.moveTo(p.x - ps, p.y); c.lineTo(p.x, p.y - h * .5); c.lineTo(p.x + ps, p.y);
    c.moveTo(p.x, p.y - h * .5); c.lineTo(p.x, p.y - h * .86);
    cabezas.push([p.x, p.y - h, h * .16]);
    if (g.lleva) tags.push([p.x + h * .26, p.y - h * .92, h]);
  }
  c.stroke();
  c.beginPath(); for (const [x, y, r] of cabezas) { c.moveTo(x + r, y); c.arc(x, y, r, 0, 6.3); } c.fill();
  c.fillStyle = ACENTO; c.beginPath(); for (const [x, y, h] of tags) c.rect(x, y, h * .42, h * .3); c.fill();
  c.restore();
}

// ---------- el plato ----------
function aro(cam: Cam, r: number, z: number, n = 88) {
  const P: [number, number][] = [];
  for (let i = 0; i < n; i++) { const a = i / n * 6.2832, q = cam.p(Math.cos(a) * r, Math.sin(a) * r, z); if (q) P.push([q.x, q.y]); }
  return P;
}
const poli = (c: CanvasRenderingContext2D, P: [number, number][]) => { c.beginPath(); P.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); };
function caja(P: [number, number][]) {
  let a = 1e9, b = -1e9, e = 1e9, f = -1e9; for (const [x, y] of P) { a = Math.min(a, x); b = Math.max(b, x); e = Math.min(e, y); f = Math.max(f, y); }
  return { cx: (a + b) / 2, cy: (e + f) / 2, a: (b - a) / 2, b: (f - e) / 2 };
}
function plato(c: CanvasRenderingContext2D, cam: Cam) {
  const A = aro(cam, RP, .24), B = aro(cam, RP * .97, .03), Fi = aro(cam, RP * .935, .225), W = aro(cam, RP * .67, .03), W2 = aro(cam, RP * .63, .02);
  const bb = caja(A), bw = caja(W);
  c.save(); c.translate(bb.cx + bb.a * .03, bb.cy + bb.b * .13); c.scale(bb.a * 1.14, bb.b * 1.2);
  let g = c.createRadialGradient(0, 0, .74, 0, 0, 1); g.addColorStop(0, "rgba(40,34,26,.34)"); g.addColorStop(1, "rgba(40,34,26,0)");
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, 1, 0, 7); c.fill(); c.restore();
  c.fillStyle = "#BEB9AE"; poli(c, B); c.fill();
  c.save(); poli(c, A); c.clip(); c.translate(bb.cx - bb.a * .34, bb.cy - bb.b * .42); c.scale(bb.a * 1.9, bb.b * 1.9);
  g = c.createRadialGradient(0, 0, .02, 0, 0, 1); g.addColorStop(0, "#FFFFFD"); g.addColorStop(.55, "#F8F6F0"); g.addColorStop(1, "#DCD8CE");
  c.fillStyle = g; c.fillRect(-3, -3, 6, 6); c.restore();
  c.strokeStyle = "rgba(40,36,30,.5)"; c.lineWidth = 1.6; poli(c, A); c.stroke();
  c.strokeStyle = "rgba(17,17,17,.58)"; c.lineWidth = 2; poli(c, Fi); c.stroke();
  c.save(); poli(c, W); c.clip(); c.translate(bw.cx, bw.cy + bw.b * .3); c.scale(bw.a * 1.5, bw.b * 1.5);
  g = c.createRadialGradient(0, 0, .3, 0, 0, 1); g.addColorStop(0, "#F7F5EF"); g.addColorStop(.7, "#ECE9E1"); g.addColorStop(1, "#CFCBC1");
  c.fillStyle = g; c.fillRect(-3, -3, 6, 6); c.restore();
  c.strokeStyle = "rgba(60,54,46,.3)"; c.lineWidth = 1.4; poli(c, W2); c.stroke();
  c.strokeStyle = "rgba(255,255,255,.9)"; c.lineWidth = 3; poli(c, W); c.stroke();
}

// ---------- las redes ----------
type Nodo = { x: number; y: number; cap: number };
function arma(L: number[], W: number, H: number) {
  const N: Nodo[] = [], A: [number, number, number][] = [], ini: number[] = [];
  const maxL = Math.max(...L);
  L.forEach((n, cap) => { ini.push(N.length); for (let i = 0; i < n; i++) N.push({ x: (i - (n - 1) / 2) * W / Math.max(maxL - 1, 1), y: cap / (L.length - 1) * H, cap }); });
  const r = azar(19);
  for (let cap = 0; cap < L.length - 1; cap++) for (let i = 0; i < L[cap]; i++) for (let j = 0; j < L[cap + 1]; j++) A.push([ini[cap] + i, ini[cap + 1] + j, r()]);
  return { N, A, L };
}
const CHICA = arma([3, 4, 3, 1], .74, .8), GRANDE = arma([6, 9, 10, 8, 6, 3, 1], 900, 600);

/** La red diminuta, parada sobre sus entradas. La cabeza es la bola. */
function redChica(c: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, o: { nodos?: number; lineas?: number; culpa?: number; luz?: boolean; apaga?: number; tiembla?: number; come?: number } = {}) {
  const nd = o.nodos ?? 1, ln = o.lineas ?? 1, cu = o.culpa ?? 0, apaga = o.apaga ?? 0, ti = o.tiembla ?? 0;
  const r = azar(Math.floor(t * 10) + 1);
  const tinta = o.luz ? LUZ : TINTA, H = CHICA.N.length;
  const pos = CHICA.N.map((n, i) => {
    const w = Math.min(1, s / 400) * 2.4;
    const swing = Math.sin(t * 1.9 + n.y * 3) * .012 * n.y * s;
    return [x + n.x * s + swing + (r() - .5) * w + Math.sin(t * 41 + i * 2) * ti * .012 * s, y - n.y * s + (r() - .5) * w] as [number, number];
  });
  const g = Math.max(1.2, s * .0062);
  c.lineCap = "round";
  for (const [a, b, w] of CHICA.A) {
    const ca = CHICA.N[a].cap;
    const k = clamp(ln * 3 - ca);
    if (k <= 0) continue;
    const [ax, ay] = pos[a]; const [bx, by] = pos[b];
    c.strokeStyle = tinta; c.lineWidth = g; c.globalAlpha = lerp(.8, .22, apaga * (o.luz ? 1 : 0));
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(lerp(ax, bx, k), lerp(ay, by, k)); c.stroke();
    c.globalAlpha = 1;
    // el rojo viaja AL REVÉS, de la cabeza a los pies, más gordo donde hay más culpa
    const q = clamp(cu * 3 - (2 - ca));
    if (q > 0) {
      c.strokeStyle = ACENTO; c.lineWidth = g * lerp(1.1, 3.8, w);
      c.beginPath(); c.moveTo(bx, by); c.lineTo(lerp(bx, ax, q), lerp(by, ay, q)); c.stroke();
    }
  }
  for (let i = 0; i < H; i++) {
    const n = CHICA.N[i];
    const q = o.nodos === undefined ? 1 : clamp(nd * H - (H - 1 - i) * .8);
    if (q <= 0) continue;
    const rad = s * .05 * (n.cap === 3 ? 1.22 : 1) * resorte(q * .6, 3, .4) * (1 + (o.come ?? 0) * .35 * (n.cap === 3 ? 1 : .25));
    const [px, py] = pos[i];
    if (o.luz) {
      const off = clamp(apaga * 3.2 - (3 - n.cap));
      c.fillStyle = off > .5 ? "#3a3936" : LUZ; c.beginPath(); c.arc(px, py, Math.max(rad, 1), 0, 7); c.fill();
    } else bola(c, px, py, Math.max(rad, 1.6), cu > .02 && clamp(cu * 3 - (2 - n.cap) - .7) > 0 ? ACENTO : TINTA);
  }
  return pos;
}

/** La idea enorme: fantasma cuando faltan cosas, tinta cuando ya comió. */
function redGrande(c: CanvasRenderingContext2D, cx: number, y: number, s: number, t: number, o: { fantasma?: number; tinta?: number; onda?: number; col?: number; alfa?: number }) {
  const fa = o.fantasma ?? 0, ti = o.tinta ?? 0, al = o.alfa ?? 1;
  if (al <= 0 || (fa <= .01 && ti <= .01)) return;
  const H = 600, r = azar(Math.floor(t * 10) + 3);
  const P = GRANDE.N.map((n) => [cx + n.x * s + (r() - .5) * 2.4, y - n.y * s + (r() - .5) * 2.4] as [number, number]);
  const f = (yy: number, k: number) => clamp((k * 1.3 - yy / H) / .3);
  c.save(); c.globalAlpha = al;
  c.lineWidth = Math.max(.8, 1.3 * s); c.lineCap = "round";
  // fantasma
  if (fa > .01) {
    c.strokeStyle = `rgba(110,106,98,${.5 * fa})`; c.beginPath();
    for (const [a, b] of GRANDE.A) { const y0 = GRANDE.N[a].y; if (f(y0, fa) <= 0) continue; c.moveTo(P[a][0], P[a][1]); c.lineTo(P[b][0], P[b][1]); }
    c.stroke();
    c.strokeStyle = `rgba(90,88,82,${.8 * fa})`; c.lineWidth = Math.max(1.2, 2.4 * s); c.setLineDash([7 * s, 6 * s]); c.lineDashOffset = -t * 18;
    c.fillStyle = PAPEL;
    GRANDE.N.forEach((n, i) => { const q = f(n.y, fa); if (q <= 0) return; c.beginPath(); c.arc(P[i][0], P[i][1], 19 * s * q, 0, 7); c.fill(); c.stroke(); });
    c.setLineDash([]);
  }
  // tinta
  if (ti > .01) {
    c.strokeStyle = "rgba(17,17,17,.6)"; c.lineWidth = Math.max(.8, 1.5 * s); c.beginPath();
    for (const [a, b] of GRANDE.A) { const y0 = GRANDE.N[b].y; if (f(y0, ti) <= 0) continue; c.moveTo(P[a][0], P[a][1]); c.lineTo(P[b][0], P[b][1]); }
    c.stroke();
    const on = o.onda ?? -1, col = o.col ?? 0;
    GRANDE.N.forEach((n, i) => {
      const q = f(n.y, ti); if (q <= 0) return;
      const pu = on < 0 ? 0 : Math.exp(-(((on - n.cap * .34) % 1 + 1) % 1) * 5);
      const rr = (19 + pu * 6) * s * resorte(q, 3, .5) * (n.cap === 6 ? 1.3 : 1);
      bola(c, P[i][0], P[i][1], Math.max(rr, 1), pu * col > .45 ? ACENTO : TINTA);
    });
  }
  c.restore();
  return P;
}

// ---------- tarjeta de video genérica: sin logos ni modelo ----------
function ventilador(c: CanvasRenderingContext2D, x: number, y: number, r: number, a: number) {
  let g = c.createRadialGradient(x - r * .2, y - r * .3, r * .1, x, y, r * 1.08);
  g.addColorStop(0, "#484846"); g.addColorStop(.8, "#121212"); g.addColorStop(1, "#050505");
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 1.08, 0, 7); c.fill();
  c.fillStyle = "#0a0a0a"; c.beginPath(); c.arc(x, y, r * .98, 0, 7); c.fill();
  c.save(); c.translate(x, y); c.rotate(a);
  for (let i = 0; i < 9; i++) {
    c.rotate(6.2832 / 9);
    c.beginPath(); c.moveTo(r * .22, 0); c.quadraticCurveTo(r * .58, -r * .1, r * .94, r * .1); c.quadraticCurveTo(r * .68, r * .42, r * .2, r * .17); c.closePath();
    c.fillStyle = i % 2 ? "#6c6b67" : "#585754"; c.fill();
  }
  c.restore();
  g = c.createRadialGradient(x - r * .08, y - r * .1, 1, x, y, r * .26); g.addColorStop(0, "#A7A59E"); g.addColorStop(1, "#1a1a19");
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r * .26, 0, 7); c.fill();
}
function tarjeta(c: CanvasRenderingContext2D, x: number, y: number, w: number, a: number, alfa = 1) {
  if (alfa <= .01) return;
  const e = w / 1000;
  c.save(); c.globalAlpha = alfa; c.translate(x, y); c.scale(e, e);
  c.fillStyle = "#A5A399"; c.beginPath(); c.roundRect(-44, -16, 62, 420, 8); c.fill();
  c.fillStyle = "#6d6b64"; for (let i = 0; i < 3; i++) { c.beginPath(); c.roundRect(-30, 40 + i * 106, 34, 76, 6); c.fill(); }
  c.fillStyle = "#23221F"; c.fillRect(120, 340, 700, 62);
  c.fillStyle = "#C9C5BA"; for (let i = 0; i < 42; i++) c.fillRect(132 + i * 16, 368, 10, 34);
  const g = c.createLinearGradient(0, 0, 0, 350); g.addColorStop(0, "#3a3a38"); g.addColorStop(.18, "#232322"); g.addColorStop(1, "#0d0d0d");
  c.fillStyle = g; c.beginPath(); c.roundRect(0, 0, 1000, 350, 30); c.fill();
  c.strokeStyle = "rgba(255,255,255,.14)"; c.lineWidth = 3; c.beginPath(); c.moveTo(30, 12); c.lineTo(970, 12); c.stroke();
  ventilador(c, 268, 175, 136, a); ventilador(c, 732, 175, 136, a * 1.07 + .4);
  c.fillStyle = "rgba(255,255,255,.1)"; for (let i = 0; i < 6; i++) c.fillRect(466 + i * 12, 60, 4, 230);
  c.restore();
}

// ---------- los pixeles: cada celda muestra una multiplicación y se pinta con su resultado ----------
const CEL = 40, COLS = 27, FILAS = 49;
const hash = (a: number, b: number, n = 0) => { let h = Math.imul(a * 73856093 ^ b * 19349663 ^ n * 83492791, 2654435761); h ^= h >>> 15; h = Math.imul(h, 2246822519); return ((h ^ (h >>> 13)) >>> 0) / 4294967296; };
const PI0 = 1, PI1 = 24, PJ0 = 4, PJ1 = 26;          // el cuadro del juego dentro de la rejilla
const JU = 18, BOL_X = 8;                            // suelo y columna de la bola
function sc(t: number) { const u = Math.max(t - (t0.res + 1.5), 0); return u < 1 ? 2.5 * u * u : 5 * u - 2.5; }
const PILAR = (m: number) => 15 + 9 * m;
function bolaY(s: number) {
  const bx = BOL_X + s;
  for (let m = 0; m < 4; m++) { const p = (bx - (PILAR(m) - 3)) / 7; if (p > 0 && p < 1) return 5.4 * 4 * p * (1 - p); }
  return 0;
}
/** Color del pixel (0 tinta, 1 papel) en la celda (i,j). -1 = moneda, en acento. */
function pixel(i: number, j: number, s: number) {
  if (i < PI0 || i >= PI1 || j < PJ0 || j >= PJ1) return 1;
  const fx = i - PI0, fy = j - PJ0, wx = fx + s;
  const by = Math.round(JU - 2.5 - bolaY(s)), bdx = fx - BOL_X, bdy = fy - by;
  const d2 = bdx * bdx + bdy * bdy;
  if (d2 < 6.6) return bdx === -1 && bdy === -1 ? .6 : .07 + (d2 > 3.4 ? .07 : 0);
  if (fy >= JU) return fy === JU ? .36 : (Math.floor(wx) + fy) % 2 ? .22 : .28;
  const m = Math.round((wx - 15) / 9), pil = PILAR(m);
  if (m >= 0 && Math.floor(wx) >= pil && Math.floor(wx) < pil + 2 && fy >= JU - 3) return .42;
  if (m >= 0 && Math.floor(wx) >= pil && Math.floor(wx) < pil + 2 && fy >= JU - 9 && fy <= JU - 8 && BOL_X + s < pil) return -1;
  const cerro = JU - 2 - Math.round(2.6 + 2.2 * Math.sin(Math.floor((fx + s * .4) * .5) * .5) + .9 * Math.sin(Math.floor((fx + s * .4) * .5) * 1.3));
  if (fy >= cerro) return .8;
  const nx = Math.floor((fx + s * .3) / 7), ny = 3 + Math.floor(hash(nx, 2) * 4);
  if (fy >= ny && fy < ny + 2 && (fx + Math.floor(s * .3)) % 7 < 5 - (fy === ny ? 2 : 0) && hash(nx, 5) > .35) return .9;
  return .97;
}

function faseNum(t: number) { const u = Math.max(t - t0.ent, 0); return u < 2.9 ? 5 * u + 3 * u * u : 5 * 2.9 + 3 * 2.9 * 2.9 + 22.4 * (u - 2.9); }

function rejilla(c: CanvasRenderingContext2D, t: number, Z: number, cae: number[] | null) {
  const s = sc(t), fi = PI0 + BOL_X + .5, fj = PJ0 + JU - 2.5 - bolaY(s) + .5;
  const k = smooth(prog(Z, 1.05, 1.9));
  const ox = lerp(20, 540 - fi * CEL, k) , oy = lerp(0, 960 - fj * CEL, k);
  const toX = (i: number) => 540 + (ox + i * CEL - 540) * Z, toY = (j: number) => 960 + (oy + j * CEL - 960) * Z;
  const w = CEL * Z, q = faseNum(t);
  const hazTexto = w > 62, gap = Math.min(w * .035, 3.5), paso = lerp(.012, .1, clamp((Z - 1.1) / 2.4));
  c.textAlign = "center"; c.textBaseline = "middle";
  for (let j = 0; j < FILAS; j++) {
    const y0 = toY(j); if (y0 > 1960 || y0 + w < -40) continue;
    for (let i = 0; i < COLS; i++) {
      const x0 = toX(i); if (x0 > 1120 || x0 + w < -40) continue;
      let yy = y0;
      if (cae) { const tf = cae[0] + hash(i, j, 9) * .62 + (FILAS - j) * .006; if (t > tf) { const d = t - tf; yy += 2600 * d * d; if (yy > 1960) continue; } }
      const v = pixel(i, j, s);
      if (v === 1 && !cae && Z < 1.02) continue;
      const ronda = Math.floor(q + hash(i, j) * 3);
      const lz = 1 - paso * Math.floor(hash(i, j, ronda) * 3);
      const prod = (v < 0 ? .6 : v) * lz;              // lo que dice la celda es lo que vale: nunca un número de adorno
      c.fillStyle = v < 0 ? ACENTO : v === 1 ? PAPEL : tono(prod);
      c.fillRect(x0 + gap / 2, yy + gap / 2, w - gap, w - gap);
      if (hazTexto && v !== 1) {
        const a = clamp((w - 62) / 40), col = prod < .55 || v < 0 ? LUZ : TINTA;
        c.globalAlpha = a; c.fillStyle = col; c.font = mono(w * .128);
        c.fillText(`${Math.abs(v < 0 ? .6 : v).toFixed(2)} × ${lz.toFixed(2)}`, x0 + w / 2, yy + w * .4);
        c.font = mono(w * .105); c.globalAlpha = a * .66;
        c.fillText(`= ${prod.toFixed(3)}`, x0 + w / 2, yy + w * .64);
        c.globalAlpha = 1;
      }
    }
  }
  if (Z < 1.06 && !cae) {
    c.strokeStyle = TINTA; c.lineWidth = 5; c.strokeRect(toX(PI0) - 2, toY(PJ0) - 2, (PI1 - PI0) * w + 4, (PJ1 - PJ0) * w + 4);
  }
}

// ---------- detalles ----------
function migas(c: CanvasRenderingContext2D, t: number, color: string, alfa: number) {
  const r = azar(58); c.save(); c.fillStyle = color;
  for (let i = 0; i < 64; i++) {
    const x0 = r() * 1200 - 60, y0 = r() * 2000, v = 26 + r() * 54, f = r() * 6.28, a = r(), w = 8 + a * 22;
    const y = ((y0 + t * v) % 2080) - 80, x = x0 + Math.sin(t * .5 + f) * 34;
    c.save(); c.translate(x, y); c.rotate(t * (.3 + a * .5) + f); c.globalAlpha = alfa * (.06 + a * .14); c.fillRect(-w / 2, -w * .62, w, w * 1.24); c.restore();
  }
  c.restore();
}

function esquirlas(c: CanvasRenderingContext2D, t: number, ti: number, x: number, y: number, n: number, sem: number, color = TINTA, g = 2600) {
  const d = t - ti; if (d < 0 || d > 1) return;
  const r = azar(sem); c.save(); c.fillStyle = color;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI * (.08 + r() * .84), v = 300 + r() * 760, w = 6 + r() * 15, gi = r() * 7;
    const px = x + (r() - .5) * 90 + Math.cos(a) * v * d, py = y + Math.sin(a) * v * d + .5 * g * d * d;
    c.save(); c.translate(px, py); c.rotate(gi + d * 8); c.globalAlpha = (1 - d) * .8; c.fillRect(-w / 2, -w * .6, w, w * 1.2); c.restore();
  }
  c.restore();
}

function digitos(c: CanvasRenderingContext2D, s: string, tiempos: number[], t: number, xs: number[], ys: number[], px: number, rots: number[], g = 9000) {
  c.textAlign = "center"; c.textBaseline = "alphabetic";
  [...s].forEach((ch, i) => {
    const d = tiempos[i] - t, yb = ys[i];
    const y = d > 0 ? yb - .5 * g * d * d : yb;
    if (y < -120) return;
    const aq = d <= 0 ? Math.exp(d * 11) * Math.cos(d * 26) : 0;
    c.save(); c.translate(xs[i], y); c.rotate(rots[i] * (d <= 0 ? 1 : 1 - clamp(d * 3))); c.scale(1 + aq * .1, 1 - aq * .14);
    c.font = serif(px); c.fillStyle = TINTA; c.fillText(ch, 0, 0); c.restore();
  });
}

function cartaDibujo(c: CanvasRenderingContext2D, i: number, t: number) {
  // cada carta es un capítulo ya visto
  c.strokeStyle = TINTA; c.fillStyle = TINTA; c.lineWidth = 5; c.lineCap = "round"; c.lineJoin = "round";
  switch (i) {
    case 0: c.beginPath(); c.moveTo(-95, 60); c.lineTo(95, 60); c.stroke(); bola(c, -70, 34, 24); c.fillStyle = ACENTO; c.fillRect(-46, 52, 124, 15); c.fillRect(76, -40, 7, 100); break;
    case 1: for (let k = 0; k < 4; k++) { c.lineWidth = 3; c.beginPath(); c.ellipse(10, 6, 26 + k * 30, 16 + k * 20, -.4, 0, 7); c.stroke(); } bola(c, 66, 30, 15); break;
    case 2: { const g = c.createRadialGradient(-20, -24, 8, 0, 0, 74); g.addColorStop(0, "#d9d7d0"); g.addColorStop(.6, "#8f8d87"); g.addColorStop(1, "#3a3a38"); c.fillStyle = "#121212"; c.beginPath(); c.arc(0, 0, 84, 0, 7); c.fill(); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 68, 0, 7); c.fill(); c.strokeStyle = TINTA; c.lineWidth = 7; c.beginPath(); c.moveTo(0, 0); c.lineTo(52 * Math.cos(t * 3), 52 * Math.sin(t * 3)); c.stroke(); break; }
    case 3: c.fillStyle = "#E7E4DB"; c.beginPath(); c.moveTo(-90, 70); c.lineTo(-30, -70); c.lineTo(10, 40); c.closePath(); c.fill(); c.stroke(); c.fillStyle = "#C9C5BA"; c.beginPath(); c.moveTo(10, 40); c.lineTo(-30, -70); c.lineTo(90, -40); c.closePath(); c.fill(); c.stroke(); break;
    case 4: { const P = [[-60, 60], [0, 60], [60, 60], [-30, -10], [30, -10], [0, -76]]; c.lineWidth = 3; [[0, 3], [1, 3], [1, 4], [2, 4], [3, 5], [4, 5]].forEach(([a, b], k) => { c.strokeStyle = k > 3 ? ACENTO : TINTA; c.lineWidth = k > 3 ? 7 : 3; c.beginPath(); c.moveTo(P[a][0], P[a][1]); c.lineTo(P[b][0], P[b][1]); c.stroke(); }); P.forEach(([x, y]) => bola(c, x, y, 12)); break; }
    default: { c.lineWidth = 5; c.beginPath(); c.moveTo(-96, 40); c.bezierCurveTo(-50, -120, -20, 130, 10, 0); c.bezierCurveTo(30, -100, 60, 90, 96, -50); c.stroke(); [[-80, 10], [-30, 28], [8, 0], [44, -2], [84, -30]].forEach(([x, y]) => bola(c, x, y, 10)); }
  }
}

function hoja(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rot: number, s = 1) {
  c.translate(x, y); c.rotate(rot); c.scale(s, s);
  c.fillStyle = "rgba(40,34,26,.13)"; c.fillRect(-w / 2 + 6, -h / 2 + 12, w, h);
  c.fillStyle = "#FBFAF5"; c.fillRect(-w / 2, -h / 2, w, h);
  c.strokeStyle = "rgba(40,36,30,.3)"; c.lineWidth = 2; c.strokeRect(-w / 2, -h / 2, w, h);
}

const TIR = 2200;
function foto2D(c: CanvasRenderingContext2D, x: number, y: number, w: number, rot: number, tipo: number, cie = .78, sue = .55, gris = false) {
  const e = w / FW;
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(e, e); c.translate(-FW / 2, -FH / 2);
  if (!gris) { c.fillStyle = "rgba(40,34,26,.16)"; c.fillRect(10, 16, FW, FH); }
  fotoLocal(c, "#FBFAF6", tono(cie), tono(sue), tipo);
  c.restore();
}

/** Fotos enormes pasando junto al lente: dan el tamaño de la tormenta. */
function lluviaCerca(c: CanvasRenderingContext2D, t: number) {
  const r = azar(23);
  for (let i = 0; i < 42; i++) {
    const ti = T_LLUVIA - .1 + r() * (t0.etiq - .95 - T_LLUVIA), w = 150 + r() ** 2 * 380, x = 40 + r() * 1000, v = 1500 + r() * 1400, gi = (r() - .5) * 4, ti0 = r() * 7, tipo = Math.floor(r() * 8), to = .55 + r() * .3;
    const d = t - ti, y = -260 + d * v;
    if (d < 0 || y > 2300) continue;
    foto2D(c, x + Math.sin(d * 2 + i) * 40, y, w, ti0 + gi * d, tipo, to, to - .22);
  }
}

// ---------- la escena ----------
function dibuja(c: CanvasRenderingContext2D, t: number, d: Datos) {
  const negro = t >= t0.y && t < t0.las;
  c.fillStyle = negro ? NOCHE : PAPEL; c.fillRect(0, 0, 1080, 1920);
  const sa = temblor(t);
  const z = 1.03 + .016 * Math.sin(t * .83), dx = 11 * Math.sin(t * .71), dy = 14 * Math.cos(t * .61);
  c.save(); c.translate(540 + dx + sa.x, 900 + dy + sa.y); c.rotate(.006 * Math.sin(t * .47)); c.scale(z, z); c.translate(-540, -900);
  escena(c, t, d, negro);
  c.restore();
}

function escena(c: CanvasRenderingContext2D, t: number, d: Datos, negro: boolean) {
  const tDive = t0.ent - .02;                                  // la bola ya llenó la pantalla
  const enPix = t >= tDive && t < DIG12[0] + 1.4;
  const enBarras = t >= t0.conc - .2 && t < t0.aun + 2.5;
  if (negro) { fondoNegro(c, t); return; }
  if (!enBarras) mundo(c, t, d, tDive);
  if (enPix) capaPixeles(c, t);
  if (t >= DIG12[0] - .6 && t < t0.conc) año2012(c, t, d);
  if (enBarras) capaFinal(c, t);
  if (t >= t0.aun + .4) ultimo(c, t, d);
  if (t >= T_COME + .1 && t < t0.lugar + .1) capaFoto(c, t);
}

function posRed(cam: Cam, hop = 0) { const p = cam.p(0, NY, .04); const a = cam.p(0, NY, .84); return { x: p ? p.x : 540, y: p ? p.y - hop : 960, s: p && a ? p.y - a.y : 100 }; }

function camEn(t: number) {
  const v0 = vistaEn(t);
  const v = { ...v0, yaw: v0.yaw + .012 * Math.sin(t * .31), dist: v0.dist * (1 + .012 * Math.sin(t * .4)) };
  return camara(v, v.cx, v.cy - 1960 * posTiendaK(t), v.f);
}

function mundo(c: CanvasRenderingContext2D, t: number, d: Datos, tDive: number) {
  if (t >= tDive && t < DIG12[0] - .05) return;              // la rejilla tapa todo
  const cam = camEn(t);
  migas(c, t, TINTA, 1);

  // zoom final: la cámara entra por la bola
  const zd = t < tDive ? prog(t, t0.mus + .46, tDive) : 0;
  c.save();
  if (zd > 0) {
    const h = cam.p(0, NY, .8)!, K = Math.exp(ease.inCubic(zd) * 6.1);
    c.translate(lerp(h.x, 540, ease.inOutCubic(zd)), lerp(h.y, 960, ease.inOutCubic(zd))); c.scale(K, K); c.translate(-h.x, -h.y);
  }
  c.save(); c.translate(0, -(1 - prog(t, 0, .05)) * 80); plato(c, cam); c.restore();
  if (t < .9) anillo(c, cam, 0, 0, RP * (.3 + prog(t, .05, .9) * .9), "rgba(30,26,20,1)", (1 - prog(t, .05, .9)) * .5, 2);
  if (t < t0.neu) inicio(c, cam, t);
  if (t >= t0.las && t < t0.una + 4) rivales(c, cam, t);
  if (t < T_COME + D_COME * 1.5 + .2) { if (t >= t0.hasta) { solas(c, cam, t); dibujaMonte(c, cam, t, d);
    gente(c, cam, t, d, smooth(prog(t, t0.con, t0.miles)) * (1 - smooth(prog(t, t0.fo1 - .62, t0.fo1 - .42))));
    // en el acercamiento, un velo de papel aísla las tres fotos
    const velo = smooth(prog(t, t0.fo1 - .44, t0.fo1 - .12)) * (1 - smooth(prog(t, t0.seg - .7, t0.seg - .36)));
    if (velo > 0) { c.fillStyle = `rgba(244,242,236,${.74 * velo})`; c.fillRect(-60, -60, 1200, 2040); }
    heroes(c, cam, t, d); } }
  if (t >= t0.neu - .25 && !(t > t0.fo1 - .4 && t < t0.seg - .42)) redEnMundo(c, cam, t);
  c.restore();
  if (zd <= 0) { rotulosMundo(c, t); }
  if (t >= T_LLUVIA - .1 && t < T_LLUVIA + D_LLUVIA + 2) lluviaCerca(c, t);
}

function inicio(c: CanvasRenderingContext2D, cam: Cam, t: number) {
  // los dígitos caen sobre el plato; la bola salta con cada golpe
  const yBase = (cam.p(0, 1.1, .24)?.y ?? 1100) - 16;
  const salT = ease.inOutCubic(prog(t, t0.ya, t0.ya + .46));
  c.font = serif(190);
  const W = c.measureText("1986").width, fin = [...Array(4).keys()].map((i) => 540 - W / 2 + c.measureText("1986".slice(0, i)).width + c.measureText("1986"[i]).width / 2);
  const px = lerp(420, 190, salT), yy = lerp(yBase, 300, salT);
  const xs = [-1.5, -.5, .5, 1.5].map((k, i) => lerp(540 + k * 206, fin[i], salT));
  if (t < t0.ya + .46) digitos(c, "1986", DIG86, t, xs, [yy, yy, yy, yy], px, [0, 0, 0, 0]);
  DIG86.forEach((q, i) => { esquirlas(c, t, q, 540 + (i - 1.5) * 206, yBase, 12, 40 + i, TINTA); });
  DIG86.forEach((q) => { if (t > q && t < q + .8) anillo(c, cam, 0, 1, 1 + (t - q) * 6, "rgba(30,26,20,1)", (1 - (t - q) / .8) * .35, 2); });

  const saltos: [number, number, number][] = [[-.5, .05, 2.6], [.05, .46, 2.4], [.46, .74, .9], [.74, 1.14, 1.3], [1.14, 1.52, 1.2], [1.52, 2.14, 1.9], [2.14, 2.42, .38], [2.42, 2.58, .1]];
  let z = 0;
  for (const [a, b, h] of saltos) if (t >= a && t < b) { const u = (t - a) / (b - a); z = 4 * h * u * (1 - u); }
  const sal = ease.inOutCubic(prog(t, t0.neu - .42, t0.neu - .06));
  const p = cam.p(0, NY, .3), q = cam.p(0, NY, .3 + z), red = posRed(cam);
  if (p && q) {
    sombra(c, p.x, p.y + 6, 44 * (p.s / 92), .34 / (1 + z) * (1 - sal));
    const rB = Math.min(38 * (p.s / 92), 168);
    bola(c, lerp(q.x, red.x, sal), lerp(Math.max(q.y - rB * .74, 660), red.y - red.s * .8, sal), lerp(rB, red.s * .061, sal));
  }

  // cartas: lo que ya has visto
  const sale = ease.inCubic(prog(t, t0.aqui + .3, t0.aqui + .86));
  if (t > t0.ya + .15 && sale < 1) {
    const r = azar(5);
    for (let i = 0; i < 6; i++) {
      const cx = 248 + (i % 3) * 292, cy = 640 + Math.floor(i / 3) * 500, ro = (r() - .5) * .14, ti = t0.ya + .2 + i * .27;
      const k = ease.outBack(prog(t, ti, ti + .32)), sx = cx < 540 ? -1 : cx > 700 ? 1 : (i < 3 ? -.3 : .3);
      if (k <= 0) continue;
      c.save();
      hoja(c, lerp(540, cx, k) + sx * sale * 900, lerp(2120, cy, k) + (i < 3 ? -sale * 700 : sale * 700), 262, 340, lerp(-.5, ro, k) + sale * sx * .8, 1);
      c.scale(1.05, 1.05); cartaDibujo(c, i, t); c.restore();
    }
  }
}

function solas(c: CanvasRenderingContext2D, cam: Cam, t: number) {
  // Las primeras gotas: el plato vacío recibe tres fotos, una por una, sin prisa.
  const pos = [[-1.7, .6], [1.5, 1.1], [-.2, 2.2]];
  SOLAS.forEach((q, i) => {
    const d = q - t, w = .34, h = .42;
    if (d > .7) return;
    const z = d > 0 ? .1 + 22 * d * d : .1 + Math.abs(Math.sin(Math.min(-d, .5) * 16)) * .15 * Math.exp(d * 8);
    const a = (d > 0 ? d * 8 : 0) + i;
    const A = cam.p(pos[i][0] - w * Math.cos(a), pos[i][1] - w * Math.sin(a), z + h * .3), B = cam.p(pos[i][0] + w * Math.cos(a), pos[i][1] + w * Math.sin(a), z + h * .3), D = cam.p(pos[i][0] - w * Math.cos(a) + h * Math.sin(a), pos[i][1] - w * Math.sin(a) - h * Math.cos(a), z - h * .3);
    if (!A || !B || !D) return;
    c.save(); c.transform((B.x - A.x) / FW, (B.y - A.y) / FW, (D.x - A.x) / FH, (D.y - A.y) / FH, A.x, A.y); fotoLocal(c, "#FBFAF6", tono(.72), tono(.5), [4, 5, 7][i]); c.restore();
  });
}

function rivales(c: CanvasRenderingContext2D, cam: Cam, t: number) {
  // las fotitos de antes de internet: tres, y se acaban
  const P: [number, number, number][] = [[-1.15, -2.9, t0.eje - .3], [1.0, -3.1, t0.nohay - .15], [.1, -3.45, t0.habia - .3]];
  if (t >= t0.una - .3 && t < t0.habia + .6) {
    const pies = cam.p(0, NY, .08)!;
    P.forEach(([x, y, tc], i) => {
      const aparece = ease.outBack(prog(t, t0.una - .24 + i * .16, t0.una + .06 + i * .16)), u = ease.inOutCubic(prog(t, tc, tc + .42));
      if (aparece <= 0 || u >= 1) return;
      const q = cam.p(x, y, .08)!, s = q.s * .78 * lerp(1, .24, u) * aparece;
      foto2D(c, lerp(q.x, pies.x, u), lerp(q.y, pies.y, u) - Math.sin(u * 3.14) * 90, s, lerp((i - 1) * .22, 3.4, u * u), [0, 4, 7][i], .74, .5);
    });
  }
  // otros métodos: esferas gordas que pasan de largo
  if (t >= t0.otr - .3 && t < t0.gan + 1.1) {
    [[.0, 1.05, 1.1], [.38, .85, .5], [.72, 1.3, 2.1]].forEach(([dl, r, y], i) => {
      const u = (t - (t0.otr - .15 + dl)) / 1.05; if (u <= 0 || u >= 1) return;
      const x = lerp(-11, 11, ease.inOutSine(u) * .25 + u * .75);
      const s = cam.p(x, y, 0), a = cam.p(x, y, r + .24); if (!s || !a) return;
      sombra(c, s.x, s.y + 6, r * s.s * 1.5, .3);
      const R = r * a.s, g = c.createRadialGradient(a.x - R * .35, a.y - R * .4, R * .05, a.x, a.y, R);
      g.addColorStop(0, "#DAD7CF"); g.addColorStop(.5, "#9c9a92"); g.addColorStop(1, "#5b5a54"); c.fillStyle = g; c.beginPath(); c.arc(a.x, a.y, R, 0, 7); c.fill();
      for (let k = 1; k < 5; k++) { c.strokeStyle = `rgba(90,88,82,${.34 - k * .05})`; c.lineWidth = 4; c.beginPath(); c.moveTo(a.x - R - k * 46, a.y - R * .6 + k * 22); c.lineTo(a.x - R - k * 46 - 70, a.y - R * .6 + k * 22); c.stroke(); }
    });
  }
}

function redEnMundo(c: CanvasRenderingContext2D, cam: Cam, t: number) {
  const hop = t >= t0.com2 + .9 ? 90 * Math.abs(Math.sin(prog(t, t0.com2 + 1.25, t0.com2 + 1.85) * Math.PI)) : 0;
  const { x, y, s } = posRed(cam);
  const yy = y - hop;
  if (t >= t0.gol) return;
  sombra(c, x, y + 2, s * .62, .3);
  const nodos = prog(t, t0.neu - .14, t0.neu + .3), lineas = prog(t, t0.cap, t0.cap + .6), cul = prog(t, t0.rep + .05, t0.y - .25);
  const tiembla = smooth(prog(t, t0.habia - .1, t0.habia + .4)) * (1 - smooth(prog(t, t0.que, t0.que + .6)));
  // come: cada foto hincha la cabeza un instante
  const veces = [t0.eje + .12, t0.nohay + .27, t0.habia + .12];
  const come = Math.max(...veces.map((q) => (t >= q ? Math.exp(-(t - q) * 6) : 0)));
  redChica(c, x, yy, s, t, { nodos, lineas, culpa: t >= t0.y ? 0 : cul, tiembla, come });
  // error: la cabeza contra una banderita
  const aE = smooth(prog(t, t0.err - .04, t0.err + .2)) * (1 - smooth(prog(t, t0.y - .1, t0.y)));
  if (aE > 0) {
    const hy = yy - s * .8, xf = x + s * .47, k = ease.outCubic(prog(t, t0.err, t0.err + .36));
    c.save(); c.globalAlpha = aE; c.fillStyle = ACENTO; c.fillRect(x + s * .08, hy - s * .012, (xf - x - s * .08) * k, s * .024);
    c.fillRect(xf - 3, hy - s * .1, s * .01, s * .2); c.beginPath(); c.moveTo(xf, hy - s * .1); c.lineTo(xf + s * .075, hy - s * .065); c.lineTo(xf, hy - s * .03); c.closePath(); c.fill(); c.restore();
  }
}

function rotulosMundo(c: CanvasRenderingContext2D, t: number) {
  // el año se queda arriba mientras estamos en 1986
  if (t >= t0.ya + .46 && t < t0.y) texto(c, "1986", 540, 262 + 38 * (1 - prog(t, t0.neu - .6, t0.neu - .1)), { fuente: serif(190), color: TINTA, alfa: 1 - prog(t, t0.y - .1, t0.y) });
  const Y = 1416, P = 142;
  rotulo(c, t, t0.neu, t0.cap - .12, "neuronas", Y, P, TINTA, true);
  rotulo(c, t, t0.cap, t0.err - .12, "capas", Y, P, TINTA, true);
  rotulo(c, t, t0.err, t0.rep - .16, "error", Y, P, ACENTO, true);
  rotulo(c, t, t0.rep, t0.y - .1, "repartir la culpa", Y, 112, ACENTO, true);
  rotulo(c, t, t0.chi - .02, t0.len - .14, "chiquitas", 330, 142, TINTA, true);
  rotulo(c, t, t0.len, t0.otr - .22, "lentas", 330, 142, TINTA, true);
  // barra de carga que casi no avanza
  const aB = smooth(prog(t, t0.len, t0.len + .12)) * (1 - smooth(prog(t, t0.otr - .25, t0.otr - .1)));
  if (aB > 0) {
    c.save(); c.globalAlpha = aB; c.strokeStyle = TINTA; c.lineWidth = 4; c.strokeRect(270, 390, 540, 30); c.fillStyle = TINTA; c.fillRect(276, 396, 8 + (t - t0.len) * 16, 18); c.restore();
  }
  rotulo(c, t, t0.otr, t0.idea - .25, "otros métodos", 330, 122, GRIS, true);
  // la idea: enorme, y vacía
  const aG = smooth(prog(t, t0.idea, t0.cor + .1)), sG = 1 - smooth(prog(t, t0.le - .1, t0.le + .25));
  if (aG * sG > 0) { c.save(); redGrande(c, 540, 1010, 1, t, { fantasma: aG, alfa: sG }); c.restore(); }
  rotulo(c, t, t0.idea, t0.le - .15, "La idea era correcta", 1560, 104, TINTA, false);
  rotulo(c, t, t0.le, t0.una - .2, "Le faltaban", 250, 112, TINTA, false);

  // las dos casillas vacías
  const nd = [t0.dos, t0.cosas];
  if (t > t0.dos - .4 && t < t0.una + .1) {
    nd.forEach((q, i) => {
      const sale = ease.inCubic(prog(t, t0.una - .3, t0.una + .1));
      const d = q - t, x = 110 + i * 470, w = 390, yb = 340, lado = i ? 1 : -1;
      const dx = (d > 0 ? 9000 * d * d : Math.exp(d * 9) * Math.sin(-d * 34) * 22) * lado;
      if (Math.abs(dx) > 1300) return;
      c.save(); c.translate(dx + sale * lado * 1100, 0);
      c.strokeStyle = TINTA; c.lineWidth = 8; c.setLineDash([26, 20]); c.lineDashOffset = -t * 36; c.beginPath(); c.roundRect(x, yb, w, w, 34); c.stroke(); c.setLineDash([]);
      const llena = i === 0 ? ease.outBack(prog(t, t0.com - .05, t0.com + .22)) : 0;
      texto(c, String(i + 1), x + w / 2, yb + 262, { fuente: serif(230), color: GRIS, alfa: .36 * (1 - clamp(llena)) });
      if (llena > 0) { c.save(); c.translate(x + w / 2, yb + w / 2 + 34); c.scale(llena, llena); texto(c, "comida", 0, 0, { fuente: serif(112, true), color: ACENTO }); c.restore(); }
      c.restore();
    });
  }
  rotulo(c, t, t0.eje - .16, t0.nohay - .2, "ejemplos", 330, 142, TINTA, true);
  rotulo(c, t, t0.nohay, t0.hasta + .1, "casi no había", 330, 130, TINTA, true);
  rotulo(c, t, t0.etiq - .1, t0.con - .16, "millones", 330, 150, ACENTO, true);
  rotulo(c, t, t0.con + .02, t0.fo1 - .5, "miles de personas", 330, 118, TINTA, true);
  // la segunda
  if (t >= t0.seg && t < t0.ent) {
    const a = smooth(prog(t, t0.seg, t0.seg + .2));
    texto(c, "La segunda", 540, 230, { fuente: serif(104), color: TINTA, alfa: a });
    const k = ease.outBack(prog(t, t0.mus - .04, t0.mus + .24));
    if (k > 0) { c.save(); c.translate(540, 430); c.scale(k, k); texto(c, "músculo", 0, 0, { fuente: serif(190, true), color: ACENTO }); c.restore(); }
  }
}

function fondoNegro(c: CanvasRenderingContext2D, t: number) {
  c.fillStyle = NOCHE; c.fillRect(-60, -60, 1200, 2040);
  migas(c, t, LUZ, 1.1);
  const v = VS.red, cam = camara(v, v.cx, v.cy, v.f), { x, y, s } = posRed(cam);
  const apaga = prog(t, t0.y + .1, t0.las - .55);
  redChica(c, x, y, s, t, { luz: true, apaga, nodos: 1, lineas: 1 });
  rotulo(c, t, t0.y + .3, t0.las - .1, "no funcionaba", 1416, 136, LUZ, true);
}

function capaPixeles(c: CanvasRenderingContext2D, t: number) {
  // zoom que retrocede: de una celda de la bola a todo el juego
  const u1 = ease.inOutCubic(prog(t, t0.ent, t0.res)), u2 = ease.inOutCubic(prog(t, t0.res, t0.tar + .25));
  const Z = 8.4 * (3.9 / 8.4) ** u1 * (1 / 3.9) ** u2;
  const cae = DIG12[0] - .02;
  if (t < cae) { c.fillStyle = PAPEL; c.fillRect(-60, -60, 1200, 2040); }
  rejilla(c, t, Z, t >= cae ? [cae] : null);
  const dy = t > cae ? 3000 * (t - cae) ** 2 : 0;
  const a = smooth(prog(t, t0.tar - .1, t0.tar + .3));
  if (a > 0 && t < cae + .8) {
    const ent = ease.outExpo(prog(t, t0.tar - .1, t0.tar + .4));
    const y = lerp(2000, 1218, ent) + dy;
    tarjeta(c, 110, y, 830, t * 7);
    texto(c, "tarjeta de video", 540, 1148 + dy, { fuente: serif(104, true), color: ACENTO, alfa: smooth(prog(t, t0.tar + .05, t0.tar + .3)) });
  }
}

function año2012(c: CanvasRenderingContext2D, t: number, d: Datos) {
  const cam = camEn(t), kT0 = posTiendaK(t);
  // 2012 cae sobre la ladera como un letrero en la montaña
  const sale = ease.inCubic(prog(t, t0.red - .2, t0.red + .22));
  const eje = EJE_Y * .92;
  const xs = [-3.7, -1.3, 1.3, 3.7];
  const ys = xs.map((x) => { const q = cam.p(x, eje, HM * (1 - Math.abs(x) / RM) ** 1.25 * .98 - .25); return (q?.y ?? 900) + 8; });
  const sx = xs.map((x) => cam.p(x, eje, 0)!.x);
  if (sale < 1) {
    c.save(); c.globalAlpha = 1 - sale; c.translate(0, -sale * 240);
    digitos(c, "2012", DIG12, t, sx, ys, 360, [-.2, -.08, .08, .2], 12000); c.restore();
    DIG12.forEach((q, i) => esquirlas(c, t, q, sx[i], ys[i], 18, 90 + i, GRIS));
  }
  if (t >= t0.red - .3) {
    // la montaña baja y aparece la red
    c.save(); c.translate(0, -1960 * kT0);
    const P = 1;
    const kT = prog(t, t0.alex - .55, t0.alex + .3);
    const gira = t >= T_COME ? (t - T_COME) * 3.2 : -1;
    const fa = smooth(prog(t, t0.red - .3, t0.red + .1));
    const sal = 1 - smooth(prog(t, t0.foto2 + .2, t0.foto2 + .75));
    redGrande(c, 540, 862, P, t, { fantasma: fa * (1 - kT), tinta: kT, onda: gira, col: 1, alfa: sal });
    const ax = 215, bx = 865;
    c.strokeStyle = TINTA; c.lineWidth = 3;
    tarjetasFinales(c, t, ax, bx, sal);
    fotosSuben(c, cam, t, d);
    texto(c, "AlexNet", 540, 212, { fuente: serif(150, true), color: ACENTO, alfa: smooth(prog(t, t0.alex - .06, t0.alex + .18)) * sal });
    c.restore();
  }
  if (t >= t0.dt - .1 && t <= t0.mas + .6) tienda(c, t);
}

function posTiendaK(t: number) { return ease.inOutCubic(prog(t, t0.dt - .05, t0.dt + .42)) * (1 - ease.inOutCubic(prog(t, t0.mas - .34, t0.mas + .16))); }

function tienda(c: CanvasRenderingContext2D, t: number) {
  const k = posTiendaK(t); if (k <= 0) return;
  c.save(); c.translate(0, 1960 * (1 - k));
  c.fillStyle = PAPEL; c.fillRect(-60, -30, 1200, 2020);
  texto(c, "Cualquier Tienda", 540, 250, { fuente: serif(122, true), color: TINTA });
  // toldo rayado
  const yt = 296, n = 12, w = 1200 / n;
  for (let i = 0; i < n; i++) {
    const x = -60 + i * w, q = Math.sin(t * 2.3 + i * .6) * 3;
    c.fillStyle = i % 2 ? PAPEL : TINTA; c.beginPath(); c.moveTo(x, yt); c.lineTo(x + w, yt); c.lineTo(x + w, yt + 128 + q); c.arc(x + w / 2, yt + 128 + q, w / 2, 0, Math.PI); c.closePath(); c.fill();
    c.strokeStyle = TINTA; c.lineWidth = 2.5; c.stroke();
  }
  // estantes con cajas genéricas
  const r = azar(12), filas = [840, 1220, 1570];
  filas.forEach((y, j) => {
    c.fillStyle = TINTA; c.fillRect(30, y, 1020, 16); c.fillStyle = "rgba(40,34,26,.14)"; c.fillRect(30, y + 16, 1020, 20);
    if (j === 1) return;
    let x = 70;
    while (x < 980) {
      const bw = 110 + r() * 130, bh = 180 + r() * 150, to = .35 + r() * .55;
      c.fillStyle = tono(to); c.fillRect(x, y - bh, bw, bh); c.strokeStyle = "rgba(20,18,14,.5)"; c.lineWidth = 2.5; c.strokeRect(x, y - bh, bw, bh);
      c.strokeStyle = to < .55 ? "rgba(244,242,236,.7)" : "rgba(20,18,14,.55)"; c.beginPath(); c.arc(x + bw / 2, y - bh * .55, bw * .24, 0, 7); c.stroke();
      c.beginPath(); c.moveTo(x + bw * .2, y - bh * .16); c.lineTo(x + bw * .8, y - bh * .16); c.stroke();
      x += bw + 14;
    }
  });
  // las dos tarjetas: en el estante del medio, como cualquier cosa
  [0, 1].forEach((i) => {
    const q = i ? t0.cual + .1 : t0.ven;
    const p = resorte(t - q, 3.2, .5);
    const x = 72 + i * 470, y = 1220 - 184 - p * 54;
    tarjeta(c, x, y, 410, t * .4 * (1 + p * 12));
  });
  c.restore();
}

function tarjetasFinales(c: CanvasRenderingContext2D, t: number, ax: number, bx: number, sal: number) {
  const k = ease.outExpo(prog(t, t0.mas - .34, t0.mas + .4)); if (k <= 0) return;
  const y = lerp(2200, 925, k), w = 300;
  c.save(); c.globalAlpha = sal; c.strokeStyle = TINTA; c.lineWidth = 4; c.lineCap = "round";
  [ax, bx].forEach((x, i) => { c.beginPath(); c.moveTo(x, y); c.lineTo(x * .5 + 270, 868); c.stroke(); });
  c.restore();
  tarjeta(c, ax - w / 2 - 10, y, w, t * 11, sal); tarjeta(c, bx - w / 2 + 3, y, w, t * 11 + 1, sal);
}

function fotosSuben(c: CanvasRenderingContext2D, cam: Cam, t: number, d: Datos) {
  if (t < T_COME) return;
  const dur = .72, r = azar(31);
  for (let i = N_MONTE - 1; i >= 0; i -= 2) {
    const f = d.F[i], u = (t - f.dep) / dur;
    if (u <= 0) continue;
    if (u >= 1) continue;
    const p = cam.p(f.x, f.y, f.z); if (!p) continue;
    const xq = 540 + (f.ry - .5) * 780, yq = 868;
    const e = ease.inCubic(u), w = lerp(46, 15, u);
    const x = lerp(p.x, xq, e) + Math.sin(u * 7 + f.rx) * 46 * (1 - u), y = lerp(p.y, yq, e);
    c.save(); c.translate(x, y); c.rotate(f.rx + u * 5);
    c.fillStyle = f.col; c.fillRect(-w / 2, -w * .62, w, w * 1.24); c.fillStyle = f.cie; c.fillRect(-w * .4, -w * .5, w * .8, w * .76); c.restore();
  }
  void r;
}

function capaFoto(c: CanvasRenderingContext2D, t: number) {
  // La última foto se viene encima y se queda como la foto del concurso.
  const a = t0.foto2 + .32, b = t0.conc + .1, e = b + .46;
  if (t < a) return;
  const u = prog(t, a, b), w0 = u < 1 ? 60 * (2600 / 60) ** ease.inCubic(u) : lerp(2600, 500, ease.outExpo(prog(t, b, e)));
  const sale = ease.inCubic(prog(t, t0.lugar - .34, t0.lugar + .05));
  if (sale >= 1) return;
  const x = u < 1 ? 540 : 540, y = u < 1 ? lerp(760, 960, u) : lerp(960, 620, ease.outExpo(prog(t, b, e)));
  c.save(); c.globalAlpha = 1 - sale; c.translate(0, -sale * 150);
  foto2D(c, x, y, w0, lerp(.3, -.03, Math.min(u * 1.2, 1)), 0, .74, .5, true);
  texto(c, "cinco intentos por foto", 540, 244, { fuente: serif(92, true), color: TINTA, alfa: smooth(prog(t, b + .26, b + .46)) });
  const nombres = ["zorro", "conejo", "gato", "perro", "oso"];
  nombres.forEach((s, i) => {
    const ti = b + .3 + i * .26, k = ease.outBack(prog(t, ti, ti + .22));
    if (k <= 0) return;
    const col = i % 2, X = col ? 760 : 320, Y = 1110 + Math.floor((i + 1) / 2) * 118 + (i === 0 ? 0 : 0);
    const bien = i === 2 && t > t0.lugar - 1.0;
    c.save(); c.translate(i === 0 ? 540 : X, Y); c.scale(k, k);
    c.fillStyle = bien ? ACENTO : "#E7E4DB"; c.beginPath(); c.roundRect(-160, -54, 320, 92, 10); c.fill();
    texto(c, s, 0, 12, { fuente: serif(72, true), color: bien ? "#FBF7EE" : TINTA });
    c.restore();
  });
  c.restore();
}

// ---------- la comparación: mismo cero, misma escala ----------
const BASE = 1392, ESC = 32, XA = 150, XB = 620, AN = 320;
function barras(c: CanvasRenderingContext2D, t: number, baja: number) {
  const ent = smooth(prog(t, t0.lugar - .25, t0.lugar + .15));
  if (ent <= 0) return;
  c.save(); c.globalAlpha = ent;
  const hA = 26.2 * ESC * ease.inOutCubic(prog(t, t0.lugar + .35, t0.v26 + .4)), hB = 15.3 * ESC * ease.outCubic(prog(t, t0.al2 + .12, t0.q15 + .22));
  const yb = BASE + baja;
  texto(c, "ImageNet 2012", 540, 230, { fuente: serif(120), color: TINTA });
  texto(c, "error top-5: menos es mejor", 540, 318, { fuente: mono(48), color: "#5c5a54" });
  const vib = azar(Math.floor(t * 10) + 2);
  const barra = (x: number, h: number, col: string) => {
    if (h < 1) return;
    c.fillStyle = "rgba(40,34,26,.16)"; c.fillRect(x + 12, yb, AN, 16);
    const j = () => (vib() - .5) * 3;
    c.fillStyle = col; c.beginPath(); c.moveTo(x + j(), yb); c.lineTo(x + j(), yb - h + j()); c.lineTo(x + AN + j(), yb - h + j()); c.lineTo(x + AN + j(), yb); c.closePath(); c.fill();
  };
  barra(XA, hA, TINTA); barra(XB, hB, ACENTO);
  c.strokeStyle = TINTA; c.lineWidth = 6; c.lineCap = "round"; c.beginPath(); c.moveTo(136, yb); c.lineTo(974, yb); c.stroke();
  texto(c, "0%", 56, yb + 16, { fuente: mono(40), color: "#5c5a54", alin: "left" });
  const n1 = 26.2 * prog(hA, 0, 26.2 * ESC), n2 = 15.3 * prog(hB, 0, 15.3 * ESC);
  if (hA > 100) texto(c, `${n1.toFixed(1)}%`, XA + AN / 2, yb - hA + 94, { fuente: mono(76), color: LUZ });
  if (hB > 100) texto(c, `${n2.toFixed(1)}%`, XB + AN / 2, yb - hB + 94, { fuente: mono(76), color: "#FBF7EE" });
  texto(c, "2.º lugar", XA + AN / 2, yb + 122, { fuente: serif(76), color: TINTA, alfa: smooth(prog(t, t0.lugar, t0.lugar + .25)) });
  texto(c, "AlexNet", XB + AN / 2, yb + 122, { fuente: serif(84, true), color: ACENTO, alfa: smooth(prog(t, t0.al2 - .06, t0.al2 + .16)) });

  // el salto: las dos alturas unidas por una flecha, sin rótulo que invente otra cifra
  const aS = smooth(prog(t, t0.nadie - .05, t0.nadie + .3));
  if (aS > 0 && baja <= 0) {
    const y1 = yb - 26.2 * ESC, y2 = yb - 15.3 * ESC, xm = XB - 70;
    c.save(); c.globalAlpha = ent * aS; c.strokeStyle = ACENTO; c.lineWidth = 4; c.setLineDash([16, 12]); c.lineDashOffset = -t * 30;
    c.beginPath(); c.moveTo(XA + AN + 6, y1); c.lineTo(XB + AN, y1); c.moveTo(xm - 34, y2); c.lineTo(XB - 4, y2); c.stroke(); c.setLineDash([]);
    flecha(c, xm, y1 + 6, xm, y2 - 4, ACENTO, 9, 36); c.restore();
  }

  // la bola se sienta en la barra y brinca a la otra
  const R = 40, tA = t0.cien - .1, tS = t0.salto - .1, tB = tS + .78;
  if (t >= tA - .5 && baja < 300) {
    const yA = yb - 26.2 * ESC - R, yB = yb - 15.3 * ESC - R;
    let x = XA + AN / 2, y = yA;
    if (t < tA) { const d = tA - t; y = yA - 2600 * d * d; }
    else if (t < tA + .5) { y = yA - Math.abs(Math.sin((t - tA) * 7.2)) * 44 * Math.exp(-(t - tA) * 5); }
    if (t >= tS - .3) {
      const u = prog(t, tS, tB), ag = Math.exp(-(tS - t) * 12) * (t < tS ? 1 : 0);
      x = lerp(XA + AN / 2, XB + AN / 2, u); y = lerp(yA, yB, u) - Math.sin(u * Math.PI) * 300 + ag * 12;
    }
    if (t >= tB) { const d = t - tB; x = XB + AN / 2; y = yB - Math.abs(Math.sin(d * 7)) * 58 * Math.exp(-d * 4.2); }
    c.save(); c.translate(x, y + R); c.scale(1 + (t >= tB ? Math.exp(-(t - tB) * 12) * .14 : 0), 1 - (t >= tB ? Math.exp(-(t - tB) * 12) * .16 : 0)); bola(c, 0, -R, R); c.restore();
  }
  c.restore();
}

function capaFinal(c: CanvasRenderingContext2D, t: number) {
  migas(c, t, TINTA, 1);
  // barras que se hunden en su propia línea
  const baja = ease.inCubic(prog(t, t0.nt - .1, t0.nt + .55)) * 1200;
  if (t < t0.nt + .6) barras(c, t, baja);

  // "gran idea nueva", tachada
  if (t >= t0.nt && t < t0.gde) {
    const a = smooth(prog(t, t0.nt + .42, t0.nt + .66)) * (1 - smooth(prog(t, t0.era + .1, t0.era + .35)));
    texto(c, "gran idea nueva", 540, 800, { fuente: serif(132, true), color: TINTA, alfa: a });
    const k = ease.inOutCubic(prog(t, t0.nueva - .3, t0.nueva + .3));
    if (k > 0 && a > 0) {
      const xb = lerp(30, 1120, k), yb = lerp(770, 752, k);
      c.save(); c.globalAlpha = a; c.strokeStyle = ACENTO; c.lineWidth = 13; c.lineCap = "round"; c.beginPath(); c.moveTo(70, 770); c.lineTo(Math.min(xb, 1000), lerp(770, 752, Math.min(k * 1.15, 1))); c.stroke(); c.restore();
      if (k < 1) bola(c, xb, yb - 32, 34);
    }
  }
  // la misma de los ochenta, en grande
  if (t >= t0.era - .1 && t < t0.por + .7) {
    const g = ease.outBack(prog(t, t0.gde, t0.gde + .6), 1.1);
    const a = smooth(prog(t, t0.era, t0.era + .3));
    const s = lerp(230, 1040, clamp(g, 0, 1.1));
    const y = lerp(1120, 1340, clamp(g));
    const big = smooth(prog(t, t0.gde + .08, t0.gde + .52));
    const sale = ease.inCubic(prog(t, t0.por + .05, t0.por + .7));
    c.save(); c.globalAlpha = a; c.translate(0, -sale * 1500);
    if (big < 1) { c.save(); c.globalAlpha = a * (1 - big); redChica(c, 540, y, s, t, {}); c.restore(); }
    redGrande(c, 540, y + 100, lerp(.36, 1.04, clamp(g)), t, { tinta: big, alfa: big * a });
    texto(c, "1986", 540, 1270, { fuente: mono(72), color: "#5c5a54", alfa: a * (1 - smooth(prog(t, t0.gde - .1, t0.gde + .08))) });
    c.restore();
    rotulo(c, t, t0.och - .1, t0.gde - .06, "la misma", 620, 150, TINTA, true);
    rotulo(c, t, t0.gde, t0.por - .1, "en grande", 330, 160, ACENTO, true);
  }
  // la regla de años: décadas de espera se ven como distancia
  if (t >= t0.por) regla(c, t);
}

const ANIO = (a: number) => (a - 1986) * 118;
function regla(c: CanvasRenderingContext2D, t: number) {
  const YR = 1180;
  const entra = ease.outExpo(prog(t, t0.por + .42, t0.por + .95)), pan = ease.inOutCubic(prog(t, t0.aun + .25, t0.aun + 2.5));
  const xw = lerp(ANIO(2012) - 200, ANIO(1986) - 780, pan);
  const sx = (a: number) => (ANIO(a) - xw) + 540;
  c.save(); c.globalAlpha = entra * (1 - smooth(prog(t, t0.aid - .5, t0.aid - .1)));
  c.strokeStyle = TINTA; c.lineWidth = 6; c.lineCap = "round"; c.beginPath(); c.moveTo(Math.max(sx(1986), -20), YR); c.lineTo(sx(2012), YR); c.stroke();
  for (let a = 1986; a <= 2012; a++) {
    const x = sx(a); if (x < -80 || x > 1160) continue;
    const m = a === 1986 || a === 2012 || a % 5 === 0;
    c.fillStyle = TINTA; c.fillRect(x - 2, YR, 4, m ? 44 : 22);
    if (m) texto(c, String(a), x, YR + 120, { fuente: mono(72), color: a === 2012 ? ACENTO : TINTA });
  }
  c.restore();
  // la red cae al final de la regla
  const gd = t0.gol - t, s = .6;
  if (t >= t0.gol - .5 && t < t0.aun + 2.2) {
    const yy = gd > 0 ? YR - 4600 * gd * gd : YR, ap = gd > 0 ? 0 : Math.exp(gd * 10) * Math.cos(gd * 30);
    c.save(); c.translate(sx(2012) - 30, yy); c.scale(1 + ap * .04, 1 - ap * .06); redGrande(c, 0, 0, s, t, { tinta: 1 }); c.restore();
    esquirlas(c, t, t0.gol, sx(2012) - 30, YR, 34, 77, TINTA);
  }
  rotulo(c, t, t0.por + .62, t0.gol - .62, "inteligencia artificial", 660, 116, TINTA, true);
  rotulo(c, t, t0.gol - .3, t0.aun - .08, "de golpe", 1520, 170, ACENTO, true);
  rotulo(c, t, t0.aun + .05, t0.aid - .3, "décadas esperando", 660, 112, TINTA, true);
}

function ultimo(c: CanvasRenderingContext2D, t: number, d: Datos) {
  const v0 = vistaEn(t), cam = camara({ ...v0, yaw: .012 * Math.sin(t * .31), dist: v0.dist * (1 + .014 * Math.sin(t * .4) - (t - t0.aid) * .004) }, v0.cx, v0.cy, v0.f);
  plato(c, cam);
  const { x, y, s } = posRed(cam);
  const fp = t0.com2 + .3, cae = fp + .5, come = fp + 1.0, llega = come + .4;
  const hop = t > llega ? 96 * Math.max(Math.sin(prog(t, llega, llega + .62) * Math.PI), 0) : 0;
  sombra(c, x, y + 2, s * .62, .3);
  const glo = t > llega ? Math.exp(-(t - llega) * 2.2) : 0;
  redChica(c, x, y - hop, s * (1 + (t > llega ? .28 * ease.outBack(prog(t, llega, llega + .4)) : 0)), t, { tiembla: t < cae ? .5 : 0, come: glo, culpa: 0 });
  if (t > fp && t < llega + .1) {
    const q = cam.p(.9, -3.1, .1)!, dq = cae - t;
    const yy = dq > 0 ? q.y - 3600 * dq * dq : q.y + (dq > -.22 ? Math.sin(-dq * 28) * 14 * Math.exp(dq * 12) : 0);
    const u = ease.inOutCubic(prog(t, come, llega));
    foto2D(c, lerp(q.x, x, u), lerp(yy, y, u) - Math.sin(u * 3.14) * 80, lerp(170, 44, u), lerp((dq > 0 ? dq * 8 : 0) - .2, 2.6, u * u), 5, .74, .5);
  }
  if (t > cae && t < cae + .9) anillo(c, cam, .9, -3.1, .4 + (t - cae) * 4, "rgba(30,26,20,1)", (1 - (t - cae) / .9) * .4, 2);

  const aI = smooth(prog(t, t0.aid, t0.aid + .25)) * (1 - smooth(prog(t, t0.lef - .3, t0.lef - .06)));
  if (aI > 0) {
    texto(c, "A la idea nunca", 540, 300, { fuente: serif(122), color: TINTA, alfa: aI });
    texto(c, "le faltó", 540, 430, { fuente: serif(122), color: TINTA, alfa: aI });
    texto(c, "inteligencia", 540, 590, { fuente: serif(150, true), color: TINTA, alfa: aI * smooth(prog(t, t0.intel - .05, t0.intel + .2)) });
  }
  if (t >= t0.lef) {
    texto(c, "Le faltó", 540, 330, { fuente: serif(132), color: TINTA, alfa: smooth(prog(t, t0.lef, t0.lef + .2)) });
    const k = resorte(t - (t0.com2 - .42), 3.1, .5);
    if (k > 0) { c.save(); c.translate(540, 590); c.scale(k, k); texto(c, "comida", 0, 0, { fuente: serif(250, true), color: ACENTO }); c.restore(); }
  }
}

export const Pieza: React.FC = () => <Lienzo dibuja={dibuja} preparar={prepara} />;
