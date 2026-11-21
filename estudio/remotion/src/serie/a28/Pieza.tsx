// Serie 2, capítulo 28: la fábrica oscura. Una fábrica de papel de noche (naves de dientes de sierra, dos chimeneas)
// apaga sus ventanas una por una mientras adentro las bolas con manos siguen trabajando. StrongDM: tres siluetas en la
// oficina pegada a la fábrica escriben hojas de «qué debe pasar» y las meten por una ranura; un taxímetro en el techo
// baja la bandera y marca la META de $1,000 al día por ingeniero. Un cartel promete «el fin de programar*»; la cámara se
// mete en la letra chica y una lupa recorre cuatro casos: la torre de a22 (una franja la hizo otro compilador y una mano
// humana escribe las pruebas), el navegador de Cursor (lento, piezas que se caen), Gas Town (una colmena que se maneja
// desde un tablero lleno de palancas, sellado EXPERIMENTAL) y un pasillo con candado. Se enciende una ventana: la junta. Humo; al
// irse, el enjambre ordenado de Yegge: 25 bolas, veinte o treinta a la vez. Fábrica a oscuras: una persona pide, comprueba con lupa, y su luz no se apaga.
// Todos los instantes vienen de eventos.json, que escribe partitura.py: dibujo y sonido son los mismos números.
import React from "react";
import { azar, clamp, ease, lerp, prog, resorte, smooth, texto as textoKit } from "../../kit";
import { ACENTO, bola, GRIS, Lienzo, LUZ, mono, NOCHE, PAPEL, serif, sombra, TINTA } from "../../marca";
import { agente, brazo } from "../../personaje";
import duracion from "./duracion.json";
import ev from "./eventos.json";

export const DURACION = duracion.dur;
type C = CanvasRenderingContext2D;
type XY = { x: number; y: number };
const E = ev;

// ---------- herramientas ----------
/** El texto del kit pisa globalAlpha; este lo multiplica, así los fundidos de cada grupo también lo apagan. */
const tx = (c: C, s: string, x: number, y: number, o: Parameters<typeof textoKit>[4]) => textoKit(c, s, x, y, { ...o, alfa: (o.alfa ?? 1) * c.globalAlpha });
let FR = 0;
const TAU = 6.283185;
const frac = (x: number) => x - Math.floor(x);
const hash = (j: number) => frac(Math.sin(j * 12.9898) * 43758.5453);
const tiembla = (j: number) => frac(Math.sin(j * 12.9898 + FR * 78.233) * 43758.5453) - .5;
const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * TAU + f);
const ventana = (t: number, a: number, b: number, fi = .25, fo = .3) => smooth(prog(t, a, a + fi)) * (1 - smooth(prog(t, b, b + fo)));
const brota = (t: number, t0: number, f = 4.2, z = .38) => (t < t0 ? 0 : resorte(t - t0, f, z));
const golpeteo = (t: number, t0: number, amp: number, f = 13, d = 7) => (t < t0 || t > t0 + 2.5 ? 0 : amp * Math.exp(-(t - t0) * d) * Math.sin((t - t0) * f));
const BLANCO = "#FDFCF8", CARTON = "#E6DCC6", CARTON_O = "#CDBF9F", PIEL = "#F3ECDF", HUMO = "#D8D2C5";
const MURO = "#1C1F25", MURO_B = "#23272E", MURO_O = "#3B4049", SUELO = "#101216", ARDE = "#F2DFA8", APAGA = "#333B48", AMBAR = "#FFD27A";

function rgb(h: string): [number, number, number] { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function mez(a: string, b: string, k: number) { const A = rgb(a), B = rgb(b), q = clamp(k); return `rgb(${Math.round(lerp(A[0], B[0], q))},${Math.round(lerp(A[1], B[1], q))},${Math.round(lerp(A[2], B[2], q))})`; }
function rr(c: C, x: number, y: number, w: number, h: number, r: number) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function caja(c: C, x: number, y: number, w: number, h: number, r: number, fill: string | null, ink: string | null = TINTA, g = 5) {
  rr(c, x, y, w, h, r);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (ink) { c.strokeStyle = ink; c.lineWidth = g; c.stroke(); }
}
function linea(c: C, ax: number, ay: number, bx: number, by: number, g: number, color = TINTA) {
  c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round"; c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
}
function circulo(c: C, x: number, y: number, r: number, fill: string | null, ink: string | null = TINTA, g = 4) {
  c.beginPath(); c.arc(x, y, Math.max(r, .1), 0, TAU);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (ink) { c.strokeStyle = ink; c.lineWidth = g; c.stroke(); }
}
/** Brillo cálido sin blur: un degradado radial. */
function halo(c: C, x: number, y: number, r: number, color: string, a: number) {
  if (a <= .005) return;
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${color},${a})`); g.addColorStop(1, `rgba(${color},0)`);
  c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r);
}
/** Rótulo de pantalla: entra con la voz y se va solo. */
function rot(c: C, t: number, ini: number, fin: number, s: string, y: number, px: number, color = LUZ, it = false, x = 540, fuente?: string) {
  const a = smooth(prog(t, ini - .04, ini + .14)) * (1 - smooth(prog(t, fin, fin + .22)));
  if (a > 0) tx(c, s, x, y + (1 - ease.outCubic(prog(t, ini - .04, ini + .3))) * 18, { fuente: fuente ?? serif(px, it), color, alfa: a });
}
/** Hoja con renglones de tinta: nada legible. */
function hoja(c: C, x: number, y: number, w: number, h: number, rot0: number, fill: string, ink: string, sem: number) {
  c.save(); c.translate(x, y); c.rotate(rot0);
  c.fillStyle = fill; c.fillRect(-w / 2, -h / 2, w, h); c.strokeStyle = ink; c.lineWidth = Math.max(w * .025, 1.2); c.strokeRect(-w / 2, -h / 2, w, h);
  const r = azar(sem); c.lineCap = "round"; c.lineWidth = Math.max(h * .035, 1);
  for (let i = 0; i < 5; i++) { const yy = -h / 2 + h * (i + 1.2) / 6.4, x0 = -w / 2 + w * (.12 + .08 * Math.floor(r() * 2)); c.beginPath(); c.moveTo(x0, yy); c.lineTo(x0 + w * (.3 + r() * .45), yy); c.stroke(); }
  c.restore();
}
/** Una caja de cartón (el trabajo terminado). */
function paquete(c: C, x: number, y: number, w: number, h: number, fill: string, ink: string, g: number) {
  c.lineJoin = "round";
  c.beginPath(); c.moveTo(x - w / 2, y - h); c.lineTo(x - w / 2 + w * .18, y - h - h * .28); c.lineTo(x + w / 2 + w * .18, y - h - h * .28); c.lineTo(x + w / 2, y - h); c.closePath();
  c.fillStyle = fill; c.fill(); c.strokeStyle = ink; c.lineWidth = g; c.stroke();
  c.beginPath(); c.moveTo(x + w / 2, y); c.lineTo(x + w / 2 + w * .18, y - h * .28); c.lineTo(x + w / 2 + w * .18, y - h - h * .28); c.lineTo(x + w / 2, y - h); c.closePath(); c.fill(); c.stroke();
  c.fillRect(x - w / 2, y - h, w, h); c.strokeRect(x - w / 2, y - h, w, h);
  linea(c, x - w * .1, y - h, x - w * .1, y - h * .45, g * .7, ink);
}
/** La lupa: aro de tinta, cristal tenue y mango de cartón. */
function lupa(c: C, x: number, y: number, r: number, ang: number, g = 1) {
  c.save(); c.translate(x, y);
  const a2 = ang + Math.PI / 4;
  c.save(); c.rotate(a2); caja(c, r * .98, -r * .14, r * 1.45, r * .28, r * .14, CARTON_O, TINTA, 4 * g); c.restore();
  c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fillStyle = "rgba(205,220,222,.32)"; c.fill(); c.strokeStyle = TINTA; c.lineWidth = r * .16; c.stroke();
  c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = r * .07; c.beginPath(); c.arc(0, 0, r * .66, 3.6, 4.5); c.stroke();
  c.restore();
}
/** La bola del personaje; en la oscuridad le pongo un filo de luna para que se lea. */
function bolaN(c: C, x: number, y: number, r: number, m1: XY, m2: XY, L: number, abre = .6) {
  agente(c, x, y, r, [m1.x, m1.y], [m2.x, m2.y], { abre1: abre, abre2: abre });
  if (L < .98) {
    c.strokeStyle = `rgba(186,200,220,${.9 * (1 - L)})`; c.lineWidth = r * .1; c.lineCap = "round";
    c.beginPath(); c.arc(x, y, r * .88, 3.4, 5.2); c.stroke();
  }
}
/** Una persona de papel, sentada. Gris de recorte, sin cara: nadie real. */
function persona(c: C, x: number, y: number, s: number, fill: string, ink: string, bL: XY, bR: XY, cab = 0) {
  c.save(); c.lineCap = "round"; c.lineJoin = "round";
  const gr = 34 * s;
  const ext = (ax: number, ay: number, bx: number, by: number) => { linea(c, ax, ay, bx, by, gr + 10 * s, ink); linea(c, ax, ay, bx, by, gr, fill); };
  const hom = y - 210 * s;
  ext(x - 80 * s, hom + 16 * s, bL.x, bL.y); ext(x + 80 * s, hom + 16 * s, bR.x, bR.y);
  c.beginPath(); c.moveTo(x - 100 * s, hom); c.lineTo(x + 100 * s, hom); c.lineTo(x + 84 * s, y); c.lineTo(x - 84 * s, y); c.closePath();
  c.fillStyle = fill; c.fill(); c.strokeStyle = ink; c.lineWidth = 7 * s; c.stroke();
  circulo(c, x + cab * 6 * s, hom - 92 * s + Math.abs(cab) * 4 * s, 74 * s, fill, ink, 7 * s);
  c.restore();
}
/** Mano humana que baja desde arriba con su manga. */
function manoArriba(c: C, x: number, y: number, s: number, lapiz: boolean) {
  c.save(); c.translate(x, y); c.scale(s, s); c.lineJoin = "round";
  caja(c, -58, -1700, 116, 1660, 16, HUMO, TINTA, 6);
  linea(c, -56, -62, 56, -62, 5);
  caja(c, -50, -46, 100, 80, 30, PIEL, TINTA, 6);
  for (const dx of [-33, -11, 11]) caja(c, dx - 11, 14, 22, 48, 11, PIEL, TINTA, 5);
  if (lapiz) {
    c.save(); c.translate(24, 30); c.rotate(.5);
    caja(c, -10, -70, 20, 110, 3, CARTON_O, TINTA, 4);
    c.beginPath(); c.moveTo(-10, 40); c.lineTo(10, 40); c.lineTo(0, 66); c.closePath(); c.fillStyle = PIEL; c.fill(); c.stroke();
    c.restore();
  }
  caja(c, 22, 10, 24, 44, 11, PIEL, TINTA, 5);
  c.restore();
}

// ---------- el mundo: la fábrica ----------
const WW = 66, WH = 66 * 1920 / 1080, SW = WW / 1080;          // ventana: 66 × 117.3, y adentro un lienzo de 1080 × 1920
const VEN = Array.from({ length: 16 }, (_, i) => ({ x: -378 + 108 * (i % 8), y: i < 8 ? -330 : -175 }));
const W0 = 4, WF = 6, W7 = 7, WM = 11, W15 = 15;
const DIENTES = [0, 1, 2, 3].map((k) => ({ x0: -460 + 230 * k, x1: -230 + 230 * k }));
const CHIM = [{ x: -300, w: 70, top: -1150, ph: 0 }, { x: -60, w: 56, top: -1010, ph: 1.7 }];
const ANEXO = { x0: 460, x1: 690, top: -240, vx: 575, vy: -135, vw: 180, vh: 120 };
const TAXI = { x: 575, y: -300 };
const CARTEL = { x: -578, y: -272, w: 144, h: 256 };
const SC = CARTEL.w / 1080;                                     // escala del cartel
const NB = { x: 444, y: 1530, s: 192 / 1080 };                   // la letra chica dentro del cartel (lienzo anidado de 1080 × 1920)

// ---------- luces ----------
function apaga(t: number, t0: number) { return t < t0 ? 1 : t < t0 + .05 ? .12 : t < t0 + .1 ? .65 : t < t0 + .14 ? .2 : 0; }
function prende(t: number, t0: number) { return t < t0 ? 0 : t < t0 + .05 ? .7 : t < t0 + .09 ? .2 : t < t0 + .16 ? .85 : 1; }
function luzVentana(i: number, t: number) {
  if (i === WM && t > 50) return t < E.offM ? prende(t, E.enciende) : apaga(t, E.offM);
  if (i === WF && t > 60) {
    let L = prende(t, E.pedir);
    const p = E.parpadeo;
    if (t >= p[0] && t < p[0] + .1) L = .15;
    else if (t >= p[1] && t < p[1] + .07) L = .3;
    else if (t >= p[2] && t < p[2] + .05) L = .5;
    return L;
  }
  return apaga(t, E.apagon[i]);
}
const luzAnexo = (t: number) => apaga(t, E.ultimas[0]);
const luzFarol = (t: number) => apaga(t, E.ultimas[1]);
const luzTaxi = (t: number) => apaga(t, E.ultimas[2]);

// ---------- adentro de cada ventana (lienzo local de 1080 × 1920) ----------
type Pal = { fondo: string; mueble: string; hoja: string; L: number };
const pal = (L: number): Pal => ({ fondo: mez(APAGA, ARDE, L), mueble: mez("#3D4551", CARTON, L), hoja: mez("#A3ADBB", BLANCO, L), L });
const TIPO = [0, 2, 1, 3, 0, 2, 3, 1, 1, 3, 0, 2, 3, 1, 0, 2];

function fondoCuarto(c: C, P: Pal, zz: number) {
  c.fillStyle = P.fondo; c.fillRect(0, 0, 1080, 1920);
  if (P.L > .01) {
    const g = c.createRadialGradient(540, 300, 40, 540, 600, 1300);
    g.addColorStop(0, `rgba(255,246,214,${.75 * P.L})`); g.addColorStop(1, "rgba(255,246,214,0)");
    c.fillStyle = g; c.fillRect(0, 0, 1080, 1920);
  }
  if (P.L < .99) {
    // a oscuras, lo único que alumbra es el trabajo: un resplandor frío detrás de cada bola
    const g = c.createRadialGradient(540, 1180, 60, 540, 1120, 760);
    g.addColorStop(0, `rgba(150,182,226,${.42 * (1 - P.L)})`); g.addColorStop(1, "rgba(150,182,226,0)");
    c.fillStyle = g; c.fillRect(0, 0, 1080, 1920);
  }
  // el piso
  c.fillStyle = `rgba(0,0,0,${.07 + .1 * (1 - P.L)})`; c.fillRect(0, 1560, 1080, 360);
  // la lámpara colgante
  linea(c, 540, -10, 540, 150 + zz, 9);
  c.beginPath(); c.moveTo(450, 230 + zz); c.lineTo(630, 230 + zz); c.lineTo(580, 150 + zz); c.lineTo(500, 150 + zz); c.closePath();
  c.fillStyle = mez("#2A2E35", TINTA, P.L); c.fill();
  circulo(c, 540, 236 + zz, 24, mez("#4A515C", "#FFF6D8", P.L), null);
}

function cuartoGenerico(c: C, i: number, t: number, P: Pal) {
  const ph = i * 1.37, tp = TIPO[i];
  fondoCuarto(c, P, 0);
  if (tp === 0) {
    // escribe en su escritorio
    const B = { x: 540, y: 1060 + Math.sin(t * 3.1 + ph) * 8 };
    const pila = 4 + Math.floor(frac(t / 9 + ph) * 9);
    for (let k = 0; k < pila; k++) hoja(c, 830 + hash(k + i) * 10, 1300 - k * 14, 190, 46, 0, P.hoja, TINTA, k + i * 9);
    bolaN(c, B.x, B.y, 170, { x: 420 + 40 * Math.sin(t * 23 + ph), y: 1300 }, { x: 650 + 34 * Math.sin(t * 19 + ph), y: 1296 }, P.L);
    hoja(c, 540, 1312, 300, 60, 0, P.hoja, TINTA, i * 3);
    caja(c, 120, 1330, 840, 46, 8, P.mueble, TINTA, 9);
    caja(c, 170, 1376, 740, 560, 0, P.mueble, TINTA, 9);
  } else if (tp === 1) {
    // carga una caja de lado a lado
    const u = Math.sin(t * 1.9 + ph), x = 540 + 280 * u, y = 1330 - Math.abs(Math.sin(t * 3.8 + ph)) * 34;
    sombra(c, x, 1560, 190, .25);
    paquete(c, x - 20, y - 250, 240, 180, P.mueble, TINTA, 9);
    bolaN(c, x, y, 160, { x: x - 150, y: y - 300 }, { x: x + 140, y: y - 310 }, P.L);
    for (let k = 0; k < 3; k++) paquete(c, 130 + k * 20, 1560 - k * 150, 200, 150, P.mueble, TINTA, 9);
  } else if (tp === 2) {
    // una banda transportadora
    const v = 230, sep = 360, off = frac((t * v + ph * 100) / sep) * sep;
    caja(c, -20, 1430, 1120, 70, 30, "#2C2C2C", TINTA, 9);
    for (let k = 0; k < 8; k++) circulo(c, 40 + k * 145, 1465, 22, mez("#59606C", HUMO, P.L), TINTA, 6);
    for (let k = -1; k < 4; k++) paquete(c, k * sep + off, 1430, 200, 150, P.mueble, TINTA, 9);
    const k2 = Math.sin(t * 6 + ph);
    bolaN(c, 540, 1050, 170, { x: 400, y: 1250 + 60 * k2 }, { x: 690, y: 1250 - 60 * k2 }, P.L);
  } else {
    // dos se pasan una hoja
    const per = 1.6, u = frac((t + ph) / per), dir = Math.floor((t + ph) / per) % 2;
    const A = { x: 300, y: 1250 }, B = { x: 780, y: 1250 };
    const k = ease.inOutCubic(u), sx = dir ? lerp(B.x - 120, A.x + 120, k) : lerp(A.x + 120, B.x - 120, k), sy = 1050 - Math.sin(Math.PI * u) * 240;
    bolaN(c, A.x, A.y, 140, { x: A.x - 110, y: A.y - 200 }, { x: A.x + 130, y: dir ? A.y - 180 + 70 * k : A.y - 110 - 70 * k }, P.L);
    bolaN(c, B.x, B.y, 140, { x: B.x - 130, y: dir ? B.y - 110 - 70 * k : B.y - 180 + 70 * k }, { x: B.x + 110, y: B.y - 200 }, P.L);
    hoja(c, sx, sy, 210, 260, (u - .5) * 1.2, P.hoja, TINTA, 77 + i);
  }
}

/** La ventana del principio: una bola escribe hojas y otra las sella sin mirarlas. */
function cuartoInicio(c: C, t: number, P: Pal) {
  fondoCuarto(c, P, -60);
  const DA = 760, DB = 1520;
  // la pila de hojas ya selladas
  let sellos = 0;
  for (const tb of E.hojas) if (t > tb + .62 + .36) sellos++;
  const pila = Math.min(sellos, 13);
  for (let k = 0; k < pila; k++) {
    c.save(); c.translate(250 + (hash(k * 3) - .5) * 24, DB - 8 - k * 15); c.rotate((hash(k) - .5) * .12);
    c.fillStyle = P.hoja; c.fillRect(-130, -8, 260, 16); c.strokeStyle = TINTA; c.lineWidth = 4; c.strokeRect(-130, -8, 260, 16);
    c.fillStyle = ACENTO; c.fillRect(60, -6, 40, 12); c.restore();
  }
  // escritorios
  caja(c, 70, DA, 760, 44, 8, P.mueble, TINTA, 9); caja(c, 120, DA + 44, 660, 160, 0, P.mueble, TINTA, 9);
  // bola A: escribe
  const A = { x: 330, y: 520 + Math.sin(t * 4.3) * 7 };
  let tira = 0;
  for (const tb of E.hojas) { const q = prog(t, tb + .26, tb + .4); if (q > 0 && q < 1) tira = Math.sin(Math.PI * q); }
  bolaN(c, A.x, A.y, 170, { x: 470 + 36 * Math.sin(t * 31), y: DA - 18 }, { x: 640 + 30 * Math.sin(t * 27 + 1) + tira * 120, y: DA - 26 - tira * 160 }, P.L);
  // bola B: sella
  const B = { x: 790, y: 1270 + Math.sin(t * 3.7 + 1) * 7 };
  let mano: XY = { x: 900, y: 1340 }, baja = 0;
  for (const tb of E.hojas) {
    const ts = tb + .62;
    const k1 = smooth(prog(t, ts - .14, ts)), k2 = smooth(prog(t, ts + .02, ts + .2));
    if (t > ts - .14 && t < ts + .2) baja = k1 * (1 - k2);
  }
  mano = { x: lerp(900, 600, baja), y: lerp(1300, DB - 120, baja) };
  bolaN(c, B.x, B.y, 170, { x: 620, y: DB - 30 }, mano, P.L);
  // el sello en la mano
  c.save(); c.translate(mano.x, mano.y + 20); caja(c, -60, 30, 120, 40, 8, CARTON_O, TINTA, 7); c.fillStyle = ACENTO; c.fillRect(-54, 70, 108, 10); caja(c, -14, -30, 28, 62, 6, CARTON_O, TINTA, 6); c.restore();
  caja(c, 120, DB, 860, 44, 8, P.mueble, TINTA, 9); caja(c, 170, DB + 44, 760, 400, 0, P.mueble, TINTA, 9);
  // las hojas: nacen, vuelan, se sellan y van a la pila
  for (let k = 0; k < E.hojas.length; k++) {
    const tb = E.hojas[k], age = t - tb;
    if (age < -.05 || age > 1.05) continue;
    let x: number, y: number, r0: number;
    if (age < .3) { x = 560; y = DA - 10; r0 = 0; }
    else if (age < .62) { const u = prog(age, .3, .62); x = lerp(560, 600, u); y = lerp(DA - 10, DB - 10, u * u) - 180 * Math.sin(Math.PI * u); r0 = u * 1.4; }
    else if (age < .8) { x = 600; y = DB - 10; r0 = 0; }
    else { const u = ease.inCubic(prog(age, .8, .98)); x = lerp(600, 250, u); y = DB - 10 - u * 40; r0 = 0; }
    // en el escritorio la hoja está acostada; en el aire se ve de frente, como página
    const alza = smooth(prog(age, .28, .36)) * (1 - smooth(prog(age, .55, .62)));
    if (alza > .02) { hoja(c, x, y - 120 * alza, 230, lerp(34, 300, alza), r0, P.hoja, TINTA, k * 7 + 1); continue; }
    c.save(); c.translate(x, y); c.rotate(r0);
    c.fillStyle = P.hoja; c.fillRect(-140, -22, 280, 34); c.strokeStyle = TINTA; c.lineWidth = 5; c.strokeRect(-140, -22, 280, 34);
    c.lineWidth = 6; for (let j = 0; j < 2; j++) linea(c, -110, -10 + j * 13, -110 + 90 + 70 * hash(k * 5 + j), -10 + j * 13, 5);
    if (age >= .62) { c.strokeStyle = ACENTO; c.lineWidth = 12; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath(); c.moveTo(50, -6); c.lineTo(70, 10); c.lineTo(110, -24); c.stroke(); }
    c.restore();
  }
}

/** La sala de juntas; luego, detrás del humo, el enjambre ordenado de Yegge. */
const JUNTA = [{ x: 540, y: 640 }, { x: 860, y: 880 }, { x: 875, y: 1110 }, { x: 890, y: 1340 }, { x: 160, y: 1340 }, { x: 175, y: 1110 }, { x: 190, y: 880 }];
function cuartoJunta(c: C, t: number, P: Pal) {
  fondoCuarto(c, P, -120);
  // reloj
  const ck = { x: 860, y: 470 }, gira = t > E.juntas ? (t - E.juntas) * 9 : t * .3;
  circulo(c, ck.x, ck.y, 74, BLANCO, TINTA, 8);
  for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; linea(c, ck.x + Math.cos(a) * 58, ck.y + Math.sin(a) * 58, ck.x + Math.cos(a) * 66, ck.y + Math.sin(a) * 66, 4); }
  linea(c, ck.x, ck.y, ck.x + Math.cos(gira - 1.57) * 54, ck.y + Math.sin(gira - 1.57) * 54, 6);
  linea(c, ck.x, ck.y, ck.x + Math.cos(gira / 12 - 1.57) * 36, ck.y + Math.sin(gira / 12 - 1.57) * 36, 9);
  // la mesa
  c.beginPath(); c.moveTo(330, 760); c.lineTo(730, 760); c.lineTo(780, 1440); c.lineTo(290, 1440); c.closePath();
  c.fillStyle = P.mueble; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 9; c.lineJoin = "round"; c.stroke();
  c.fillStyle = mez("#2F353F", CARTON_O, P.L); c.beginPath(); c.moveTo(290, 1440); c.lineTo(780, 1440); c.lineTo(780, 1490); c.lineTo(290, 1490); c.closePath(); c.fill(); c.stroke();
  // magia que no prende: chispas que se apagan y caen
  if (t > E.magia - .1 && t < E.magia + 1.6) {
    const k = prog(t, E.magia - .1, E.magia + 1.6);
    for (let j = 0; j < 9; j++) {
      const a = j / 9 * TAU, x = 540 + Math.cos(a) * 170 * (.4 + k), y = 1040 + Math.sin(a) * 120 - 40 + k * k * 420;
      const s = (1 - k) * 22 + 6, al = 1 - smooth(prog(k, .3, 1));
      c.save(); c.translate(x, y); c.rotate(k * 3 + j); c.globalAlpha *= al;
      c.fillStyle = k < .25 ? "#E3A33A" : GRIS; c.beginPath();
      for (let q = 0; q < 8; q++) { const rr2 = q % 2 ? s * .35 : s, aa = q / 8 * TAU; c.lineTo(Math.cos(aa) * rr2, Math.sin(aa) * rr2); }
      c.closePath(); c.fill(); c.restore();
    }
  }
  // el papel que da la vuelta a la mesa
  const per = .42, t0 = E.empresa;
  const manos: XY[] = JUNTA.map((b) => ({ x: lerp(b.x, 540, .45), y: lerp(b.y, 1100, .35) + 40 }));
  let papel: XY | null = null, quien = 0, pr = 0;
  if (t > t0 && t < E.repetido) {
    const n = Math.floor((t - t0) / per), u = frac((t - t0) / per);
    const a = manos[n % 7], b = manos[(n + 1) % 7];
    quien = n % 7; pr = u;
    papel = { x: lerp(a.x, b.x, ease.inOutCubic(u)), y: lerp(a.y, b.y, ease.inOutCubic(u)) - Math.sin(Math.PI * u) * 90 };
  }
  // copias: todos con la misma hoja
  const kc = ease.outCubic(prog(t, E.repetido, E.repetido + .45));
  JUNTA.forEach((b, j) => {
    const yy = b.y + Math.sin(t * 3.3 + j) * 6;
    const h = manos[j];
    const garabato = kc > .9 ? 1 : 0;
    const m1 = { x: h.x - 60 + garabato * 22 * Math.sin(t * 24 + j), y: h.y - 10 }, m2 = { x: h.x + 60 + garabato * 22 * Math.sin(t * 21 + j * 2), y: h.y - 14 };
    const sostiene = papel && ((j === quien && pr < .5) || (j === (quien + 1) % 7 && pr >= .5));
    if (sostiene && papel) { m2.x = papel.x + 30; m2.y = papel.y + 10; }
    bolaN(c, b.x, yy, 76, j === 0 ? m1 : m1, m2, P.L);
    if (kc > 0) hoja(c, lerp(540, h.x, kc), lerp(1100, h.y - 10, kc), 150 * (.6 + .4 * kc), 110 * (.6 + .4 * kc), (j - 3) * .1 * (1 - kc), P.hoja, TINTA, 501);
  });
  if (papel) hoja(c, papel.x, papel.y, 150, 110, Math.sin(t * 7) * .2, P.hoja, TINTA, 501);
  // malentendidos: lo que dice uno no es lo que oye el otro
  const kb = clamp(brota(t, E.malentendidos, 4.4, .45), 0, 1.15) * (1 - smooth(prog(t, E.humo0 + .2, E.humo0 + .5)));
  if (kb > .01) {
    const kb2 = clamp(brota(t, E.malentendidos + .2, 4.4, .45), 0, 1.15) * (1 - smooth(prog(t, E.humo0 + .2, E.humo0 + .5)));
    const globo = (x: number, y: number, k: number, cola: XY, dib: (c: C) => void) => {
      if (k <= .01) return;
      c.save(); c.translate(x, y); c.scale(k, k);
      c.beginPath(); c.moveTo(-30, 40); c.lineTo(cola.x, cola.y); c.lineTo(20, 40); c.closePath(); c.fillStyle = BLANCO; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 6; c.stroke();
      caja(c, -90, -70, 180, 130, 40, BLANCO, TINTA, 7); dib(c); c.restore();
    };
    globo(760, 680, kb, { x: 70, y: 150 }, (cc) => { cc.strokeStyle = TINTA; cc.lineWidth = 10; cc.strokeRect(-36, -40, 72, 72); });
    globo(330, 680, kb2, { x: -80, y: 160 }, (cc) => { circulo(cc, -12, -4, 38, null, ACENTO, 10); tx(cc, "?", 50, 26, { fuente: serif(90), color: ACENTO }); });
  }
}
function cuartoEnjambre(c: C, t: number, P: Pal) {
  fondoCuarto(c, P, -200);
  // el día completo: sol y luego luna, sobre la sala
  const kd = prog(t, E.dia - .1, E.diaF + .4);
  if (kd > 0 && kd < 1) {
    const arcoSol = (u: number) => ({ x: lerp(140, 940, u), y: 590 - Math.sin(Math.PI * u) * 150 });
    const us = clamp(kd * 1.6), ul = clamp(kd * 1.6 - .6);
    if (us > 0 && us < 1) { const p = arcoSol(us); halo(c, p.x, p.y, 120, "240,170,80", .5 * P.L); circulo(c, p.x, p.y, 44, "#F1C46A", TINTA, 6); }
    if (ul > 0 && ul < 1) { const p = arcoSol(ul); circulo(c, p.x, p.y, 40, "#E9E6DC", TINTA, 6); circulo(c, p.x + 18, p.y - 10, 34, P.fondo, null); }
  }
  // 48 bolas en fila, cada una con su escritorio; las hojas suben por columnas al ritmo
  const COL = 5, FIL = 5, DX = 180, DY = 165, X0 = 180, Y0 = 740;
  for (let r = 0; r < FIL; r++) for (let q = 0; q < COL; q++) {
    const x = X0 + q * DX, y = Y0 + r * DY, fase = q * .45 + r * .3;
    const tec = Math.sin(t * 13 + fase);
    caja(c, x - 72, y + 30, 144, 20, 4, P.mueble, TINTA, 5);
    bolaN(c, x, y - 4 + Math.abs(Math.sin(t * 4.1 + fase)) * -5, 46, { x: x - 40, y: y + 24 + tec * 7 }, { x: x + 40, y: y + 24 - tec * 7 }, P.L);
  }
  for (let q = 0; q < COL; q++) {
    const x = X0 + q * DX, per = .49 * 1.5, z = (t + q * .18) / per, u = frac(z), fila = FIL - 1 - Math.floor(z) % FIL;
    const y = Y0 + fila * DY - ease.inOutCubic(u) * DY;
    hoja(c, x + 54, y - 28 - Math.sin(Math.PI * u) * 40, 60, 44, 0, P.hoja, TINTA, q);
  }
}
/** La ventana del final: una persona pide, recibe y comprueba con lupa. */
function cuartoFinal(c: C, t: number, P: Pal) {
  fondoCuarto(c, P, -60);
  const D = 1390, PX = 360;
  // la lámpara de escritorio, a la izquierda
  if (P.L > .01) { const g = c.createRadialGradient(170, 1060, 20, 380, 1330, 760); g.addColorStop(0, `rgba(255,236,180,${.55 * P.L})`); g.addColorStop(1, "rgba(255,236,180,0)"); c.fillStyle = g; c.fillRect(0, 700, 1080, 900); }
  linea(c, 70, D, 100, 1120, 14); linea(c, 100, 1120, 190, 1030, 14);
  c.beginPath(); c.moveTo(150, 985); c.lineTo(270, 1045); c.lineTo(235, 1095); c.lineTo(118, 1040); c.closePath(); c.fillStyle = mez("#2A2E35", TINTA, P.L); c.fill();
  // la ranura en la pared derecha, a la altura del escritorio
  caja(c, 1000, D - 66, 120, 40, 6, "#15171B", CARTON_O, 8);
  // tiempos
  const kSale = prog(t, E.desliza - .05, E.desliza + .35), kVuelve = ease.outCubic(prog(t, E.regresa - .35, E.regresa + .15));
  const kLupa = ease.inOutCubic(prog(t, E.comprobar + .1, E.bien - .05));
  // la lupa: acostada junto a la mano y luego en alto, entre los ojos y la caja
  const L0: XY = { x: 560, y: D - 22 }, L1: XY = { x: 720, y: 1112 + Math.sin(t * 2.3) * 7 };
  const lp: XY = { x: lerp(L0.x, L1.x, kLupa), y: lerp(L0.y, L1.y, kLupa) - Math.sin(Math.PI * kLupa) * 60 };
  const mango: XY = { x: lp.x - 160, y: lp.y + 160 };
  // la persona
  const esc = t > E.quePedir - .3 && t < E.desliza ? 1 : 0;
  const bR: XY = kLupa > 0 ? { x: lerp(560, mango.x, smooth(kLupa * 3)), y: lerp(D - 34, mango.y, smooth(kLupa * 3)) } : { x: 600 + esc * 34 * Math.sin(t * 22), y: D - 34 - esc * Math.abs(Math.sin(t * 17)) * 12 };
  const asiente = t > E.paloma ? Math.sin((t - E.paloma) * 9) * Math.exp(-(t - E.paloma) * 1.8) : 0;
  persona(c, PX, D - 24, 1.5, mez("#566070", HUMO, P.L), TINTA, { x: 230, y: D - 30 }, bR, kLupa * .8 + asiente);
  // el escritorio
  caja(c, 30, D, 1020, 50, 8, P.mueble, TINTA, 9); caja(c, 90, D + 50, 900, 600, 0, P.mueble, TINTA, 9);
  // la hoja de «qué debe pasar»: se escribe y entra a la ranura
  if (t > E.pedir && kSale < 1) hoja(c, lerp(640, 1080, ease.inCubic(kSale)), D - 16, 250 * (1 - kSale * .4), 34, 0, P.hoja, TINTA, 900);
  // la caja que regresa
  if (kVuelve > 0) {
    const bx = lerp(1120, 820, kVuelve);
    paquete(c, bx, D, 230, 180, mez("#3D4551", CARTON, P.L), TINTA, 8);
    if (t > E.criterio) {
      const u = prog(t, E.criterio, E.criterio + .22);
      c.save(); c.translate(bx + 6, D - 92); c.strokeStyle = ACENTO; c.lineWidth = 24; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath(); c.moveTo(-54, 0);
      if (u < .35) c.lineTo(-54 + 40 * u / .35, 42 * u / .35); else { c.lineTo(-14, 42); c.lineTo(-14 + 80 * (u - .35) / .65, 42 - 100 * (u - .35) / .65); }
      c.stroke(); c.restore();
    }
  }
  if (kLupa > 0) lupa(c, lp.x, lp.y, 100, Math.PI / 2);
  else { c.save(); c.translate(L0.x, L0.y); c.scale(1, .32); lupa(c, 0, 0, 100, Math.PI / 2); c.restore(); }
}
/** El cuarto donde caen las hojas de la persona y de donde sale la caja. */
function cuartoVecino(c: C, t: number, P: Pal) {
  cuartoGenerico(c, W7, t, P);
  const D = 1390;
  const k1 = prog(t, E.desliza + .25, E.desliza + .75), k2 = prog(t, E.regresa - .5, E.regresa - .1);
  if (k1 > 0 && k1 < 1) hoja(c, lerp(-140, 260, ease.outCubic(k1)), D - 30, 200, 34, 0, P.hoja, TINTA, 900);
  if (k2 > 0 && k2 < 1) paquete(c, lerp(260, -160, ease.inCubic(k2)), D, 200, 150, P.mueble, TINTA, 8);
}
/** La ventana 15, junto a la oficina: las hojas entran por la derecha y salen cajas por la izquierda. */
function cuartoBanda(c: C, t: number, P: Pal) {
  fondoCuarto(c, P, 0);
  caja(c, -20, 1430, 1120, 70, 30, "#2C2C2C", TINTA, 9);
  for (let k = 0; k < 8; k++) circulo(c, 40 + k * 145, 1465, 22, mez("#59606C", HUMO, P.L), TINTA, 6);
  const v = 300, sep = 330;
  const base = E.ranura[0] + .35;
  for (let k = -40; k < 40; k++) {
    const t0 = base + k * sep / v * 1.0, age = t - t0;
    if (age < 0) continue;
    const x = 1150 - age * v * (age < 1.2 ? 1 : 1);
    if (x < -200 || x > 1200) continue;
    if (x > 560) hoja(c, x, 1405, 200, 34, 0, P.hoja, TINTA, k + 300);
    else paquete(c, x, 1430, 190, 140, P.mueble, TINTA, 8);
  }
  const k2 = Math.sin(t * 7);
  bolaN(c, 560, 1060, 170, { x: 430, y: 1250 + 50 * k2 }, { x: 690, y: 1250 - 50 * k2 }, P.L);
}
function interior(c: C, i: number, t: number, L: number) {
  const P = pal(L);
  if (i === W0) cuartoInicio(c, t, P);
  else if (i === WM && t > E.aJunta - .5 && t < E.humo0 + .62) cuartoJunta(c, t, P);
  else if (i === WM && t >= E.humo0 + .62) cuartoEnjambre(c, t, P);
  else if (i === WF && t > 60) cuartoFinal(c, t, P);
  else if (i === W7 && t > 60) cuartoVecino(c, t, P);
  else if (i === W15) cuartoBanda(c, t, P);
  else cuartoGenerico(c, i, t, P);
  // humo de paso (ventana de la junta)
  if (i === WM && t > E.humo0 && t < E.humo + 1) humoSala(c, t);
}
function humoSala(c: C, t: number) {
  const sube = ease.outCubic(prog(t, E.humo0, E.humo0 + .55)), va = ease.inOutCubic(prog(t, E.humo - .08, E.humo + .55));
  const r = azar(66);
  // humo de papel: bocanadas en racimo, al fondo más oscuras y adelante más claras
  // rejilla con jitter: así no quedan huecos cuando cambia lo que hay detrás
  const orden = Array.from({ length: 54 }, (_, k) => k).sort((a, b) => hash(a * 3.7) - hash(b * 3.7));
  for (let n = 0; n < 54; n++) {
    const k = orden[n], gx = k % 6, gy = Math.floor(k / 6);
    const x0 = gx * 216 - 20 + (r() - .5) * 90, y0 = gy * 236 + (r() - .5) * 90, R = 175 + r() * 95, cap = n / 54;
    const y = lerp(2300 + r() * 600, y0, sube) - va * (1600 + r() * 900), x = x0 - va * (250 + r() * 700) + Math.sin(t * 1.3 + k) * 22;
    const s = (1 - va * .45) * (1 + .06 * Math.sin(t * 2.1 + k));
    c.globalAlpha = 1 - va * .35;
    const fill = mez("#BDB6A8", "#ECE8DF", cap);
    circulo(c, x, y, R * s, fill, "rgba(17,17,17,.38)", 5);
    circulo(c, x - R * s * .28, y - R * s * .3, R * s * .45, "rgba(255,255,255,.18)", null);
  }
  c.globalAlpha = 1;
}

// ---------- la oficina de StrongDM (lienzo local de 1080 × 720) ----------
function oficina(c: C, t: number, L: number) {
  const P = pal(L);
  c.fillStyle = P.fondo; c.fillRect(0, 0, 1080, 720);
  if (L > .01) halo(c, 540, 120, 760, "255,246,214", .55 * L);
  // ranura en la pared izquierda
  caja(c, -20, 420, 80, 34, 6, "#15171B", CARTON_O, 7);
  const X = [270, 540, 810];
  X.forEach((x, k) => {
    const b = clamp(brota(t, E.tresK[k], 4.6, .42), 0, 1.25);
    const pop = t > E.tresK[k] ? 1 + .12 * Math.sin(Math.PI * clamp((t - E.tresK[k]) / .3)) : 1;
    void b;
    const esc = Math.sin(t * (17 + k * 3) + k), pausa = .5 + .5 * Math.sin(t * 1.3 + k * 2.1);
    c.save(); c.translate(x, 520); c.scale(pop, pop); c.translate(-x, -520);
    persona(c, x, 520, .9, mez("#566070", HUMO, L), TINTA, { x: x - 110, y: 505 - pausa * 10 }, { x: x + 64 + esc * 30 * pausa, y: 498 - Math.abs(esc) * 16 * pausa }, Math.sin(t * 2.3 + k) * .6);
    c.restore();
  });
  caja(c, 30, 520, 1020, 40, 6, P.mueble, TINTA, 8); caja(c, 60, 560, 960, 200, 0, P.mueble, TINTA, 8);
  // cada quien con su hoja; la de la izquierda entra a la ranura
  X.forEach((x, k) => hoja(c, x + 70, 512, 150, 22, 0, P.hoja, TINTA, 40 + k));
  for (const tr of E.ranura) {
    const u = prog(t, tr - .4, tr);
    if (u > 0 && u < 1) hoja(c, lerp(330, 10, ease.inCubic(u)), 470, 150 * (1 - u * .5), 24, 0, P.hoja, TINTA, 49);
  }
}

// ---------- el taxímetro ----------
function taximetro(c: C, t: number) {
  const L = luzTaxi(t);
  c.save(); c.translate(TAXI.x, TAXI.y);
  linea(c, 0, 30, 0, 62, 8, MURO_O);
  if (L > .01) halo(c, 0, 0, 130, "255,210,122", .16 * L);
  // letrero de techo: META
  const kS = ease.outBack(prog(t, E.bandera - .05, E.bandera + .25), 1.8);
  const encS = t > E.bandera ? L : 0;
  c.save(); c.translate(-12, -34); c.scale(1, Math.max(kS, .001));
  c.beginPath(); c.moveTo(-34, 0); c.lineTo(34, 0); c.lineTo(26, -24); c.lineTo(-26, -24); c.closePath();
  c.fillStyle = mez("#3A3D44", "#FBEFE6", encS); c.fill(); c.strokeStyle = TINTA; c.lineWidth = 2.2; c.stroke();
  if (kS > .2) tx(c, "META", 0, -6, { fuente: mono(15), color: mez("#5A3530", ACENTO, encS), alfa: clamp(kS) });
  c.restore();
  // ranura de fichas
  caja(c, 30, -36, 22, 5, 2, "#111", MURO_O, 1);
  // cuerpo
  caja(c, -60, -32, 120, 64, 8, mez("#59544A", "#DCD0B4", Math.max(L, .25)), TINTA, 2.4);
  // la bandera: arriba = libre; abajo = el taxímetro corre
  const kb = t < E.bandera ? 0 : ease.outBack(prog(t, E.bandera, E.bandera + .3), 2.2);
  c.save(); c.translate(-58, -20); c.rotate(lerp(Math.PI / 2, -.5, kb) + golpeteo(t, E.bandera + .3, .12, 18, 6));
  linea(c, 0, 0, -20, 0, 3.4, TINTA);
  caja(c, -40, -8, 22, 16, 2, ACENTO, TINTA, 1.6);
  c.restore();
  circulo(c, -58, -20, 3.6, CARTON_O, TINTA, 1.2);
  // pantalla y dígitos que ruedan
  caja(c, -53, -20, 106, 30, 3, "#0C0D10", TINTA, 1.6);
  const val = t < E.mil ? 0 : 1000 * ease.inOutCubic(prog(t, E.mil, E.milF));
  c.save(); c.beginPath(); c.rect(-51, -18, 102, 26); c.clip();
  const col = mez("#3a3328", AMBAR, L);
  tx(c, "$", -43, 1, { fuente: mono(17), color: col });
  const xs = [-29, -8, 4, 16];          // miles, centenas, decenas, unidades
  tx(c, ",", -19, 1, { fuente: mono(17), color: col });
  tx(c, "/día", 37, 0, { fuente: mono(8.5), color: col, alfa: smooth(prog(t, E.diarios - .05, E.diarios + .15)) });
  for (let p = 0; p < 4; p++) {
    const d = (val / 10 ** (3 - p)) % 10, f = frac(d), n = Math.floor(d);
    const roll = p >= 2 ? f : f > .85 ? (f - .85) / .15 : 0;
    for (const [dd, off] of [[n, -roll], [(n + 1) % 10, 1 - roll]] as [number, number][]) {
      if (Math.abs(off) >= 1) continue;
      tx(c, String(dd), xs[p], 1 + off * 22, { fuente: mono(17), color: col });
    }
  }
  c.restore();
  // fichas que caen
  for (const tf of E.fichas) {
    const u = prog(t, tf - .4, tf); if (u <= 0 || u >= 1) continue;
    const y = lerp(-280, -38, u * u), x = 41 + Math.sin(tf * 9) * 8 * (1 - u);
    c.save(); c.translate(x, y); c.scale(Math.cos(t * 12 + tf * 3), 1);
    circulo(c, 0, 0, 8, "#E9DFC4", TINTA, 1.6); circulo(c, 0, 0, 4.4, null, TINTA, 1); c.restore();
  }
  c.restore();
}

// ---------- el cartel (lienzo local de 1080 × 1920) ----------
function cartel(c: C, t: number, d: D) {
  const Lf = luzFarol(t);
  // papel
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  // contenido
  tx(c, "el fin de", 540, 360, { fuente: serif(130, true), color: TINTA });
  tx(c, "programar", 500, 610, { fuente: serif(222), color: TINTA });
  const ka = 1 + .7 * Math.sin(Math.PI * clamp((t - E.asterisco) / .35)) * (t > E.asterisco ? 1 : 0);
  c.save(); c.translate(d.astX, 520); c.scale(ka, ka); c.rotate(t > E.asterisco ? golpeteo(t, E.asterisco, .5, 16, 5) : 0);
  tx(c, "*", 0, 90, { fuente: serif(230), color: ACENTO }); c.restore();
  // la bola que celebra
  sombra(c, 540, 1300, 220, .3);
  const fe = Math.sin(t * 5) * 18;
  agente(c, 540, 1080, 190, [300, 760 + fe], [790, 760 - fe], { abre1: 1, abre2: 1 });
  // confeti de tinta
  const r = azar(5);
  for (let k = 0; k < 18; k++) { const x = 140 + r() * 800, y = 720 + r() * 560 + Math.sin(t * 2 + k) * 10; c.fillStyle = k % 4 ? TINTA : ACENTO; c.fillRect(x, y, 14, 6); }
  // la letra chica
  tx(c, "*", 150, 1530, { fuente: serif(70), color: ACENTO });
  c.save(); c.translate(NB.x, NB.y); c.scale(NB.s, NB.s); letraChica(c, t); c.restore();
  // marco del cartel
  c.strokeStyle = TINTA; c.lineWidth = 16; c.strokeRect(8, 8, 1064, 1904);
  for (const [x, y] of [[60, 50], [1020, 50], [60, 1870], [1020, 1870]]) { c.save(); c.translate(x, y); c.rotate(x < 500 ? -.6 : .6); c.fillStyle = "rgba(205,191,159,.75)"; c.fillRect(-70, -24, 140, 48); c.restore(); }
  // la luz del farol sobre el papel
  const g = c.createRadialGradient(540, -200, 100, 540, 400, 1900);
  g.addColorStop(0, `rgba(255,214,140,${.22 * Lf})`); g.addColorStop(1, "rgba(255,214,140,0)");
  c.fillStyle = g; c.fillRect(0, 0, 1080, 1920);
  if (Lf < 1) { c.fillStyle = `rgba(10,12,16,${.72 * (1 - Lf)})`; c.fillRect(0, 0, 1080, 1920); }
}

// ---------- la letra chica: lienzo anidado de 1080 × 1920 (a 42× de zoom, es la pantalla) ----------
const LX = 530, LY = 935, LR = 400;
const CASOS = [E.c1, E.c2, E.c3, E.c4];
function posLupa(t: number) { let p = -1; CASOS.forEach((tt, k) => { p = lerp(p, k, ease.inOutCubic(prog(t, tt, tt + .5))); }); return p; }
function letraChica(c: C, t: number) {
  const pos = posLupa(t), act = smooth(prog(t, E.letra - .1, E.letra + .3)) * (1 - smooth(prog(t, E.aJunta, E.aJunta + .4)));
  // renglones de letra chica, grises; se recorren al bajar la lupa
  const desp = (pos + 1) * 420;
  c.strokeStyle = "rgba(120,116,108,.3)"; c.lineCap = "butt"; c.lineWidth = 13;
  const r0 = Math.floor((-260 + desp) / 46) - 1;
  for (let n = r0; n < r0 + 52; n++) {
    const y = n * 46 - desp; if (y < -260 || y > 2100) continue;
    if (n % 9 === 8) continue;                    // un respiro entre párrafos
    c.beginPath();
    let x = -1700 + (n % 9 === 0 ? 120 : 0);
    for (let w = 0; w < 70 && x < 2700; w++) { const L = 22 + hash(n * 61 + w) ** 2 * 150; c.moveTo(x, y); c.lineTo(x + L, y); x += L + 13; }
    c.stroke();
  }
  if (act <= .01) return;
  // el papel se despeja donde van los títulos
  c.save(); c.globalAlpha *= act;
  for (const [y0, y1] of [[110, 450], [1370, 1600]] as [number, number][]) {
    const g = c.createLinearGradient(0, y0 - 40, 0, y1 + 40);
    g.addColorStop(0, "rgba(244,242,236,0)"); g.addColorStop(.12, PAPEL); g.addColorStop(.88, PAPEL); g.addColorStop(1, "rgba(244,242,236,0)");
    c.fillStyle = g; c.fillRect(-100, y0 - 40, 1280, y1 - y0 + 80);
  }
  c.restore();
  // títulos y veredictos
  const nombres: [string, string, number][] = [["el compilador", "de 16 agentes · Anthropic", 70], ["el navegador", "de Cursor", 80], ["Gas Town", "de Steve Yegge", 80], ["con bloqueos", "también de Cursor", 76]];
  rot(c, t, E.letra, E.c1 - .14, "letra chica", 300, 132, TINTA, true);
  nombres.forEach(([a, b, px], k) => {
    const ini = CASOS[k] + .14, fin = k < 3 ? CASOS[k + 1] - .12 : E.aJunta - .2;
    rot(c, t, ini, fin, a, 280, k === 2 ? 124 : 112, TINTA);
    rot(c, t, ini + .12, fin, b, 380, px, "#66625A", true);
  });
  rot(c, t, E.otro, E.c2 - .05, "+ otro compilador", 1470, 86, ACENTO, true);
  rot(c, t, E.pruebas, E.c2 - .05, "+ pruebas de un humano", 1565, 86, TINTA, true);
  rot(c, t, E.lento, E.c3 - .05, "lento", 1470, 92, TINTA, true);
  rot(c, t, E.sinFun, E.c3 - .05, "mucho sin funcionar", 1565, 90, ACENTO, true);
  rot(c, t, E.cualquiera, E.c4 - .05, "no es para cualquiera", 1470, 90, ACENTO, true);
  rot(c, t, E.veinte, E.aJunta - .2, "20 agentes", 1470, 90, TINTA, true);
  rot(c, t, E.dos, E.aJunta - .2, "rinden como 2 o 3", 1565, 90, ACENTO, true);
  // la lupa
  const ent = ease.outBack(prog(t, E.lee + .12, E.lee + .7), 1.1), sal = ease.inCubic(prog(t, E.aJunta - .1, E.aJunta + .35));
  let dip = 0; CASOS.forEach((tt) => { dip += Math.sin(Math.PI * clamp((t - tt) / .5)) * (t > tt && t < tt + .5 ? 1 : 0); });
  const cx = LX + (1 - ent) * 950 - sal * 1300 + vaiven(t, 3.1) * 6, cy = LY + (1 - ent) * 900 + dip * 34 + vaiven(t, 2.3, 1) * 6;
  if (ent <= .001) return;
  // sombra de la lupa sobre el papel
  c.save(); c.translate(cx + 38, cy + 46); c.scale(1, .96);
  const gs = c.createRadialGradient(0, 0, LR * .8, 0, 0, LR * 1.15); gs.addColorStop(0, "rgba(20,18,14,.16)"); gs.addColorStop(1, "rgba(20,18,14,0)");
  c.fillStyle = gs; c.beginPath(); c.arc(0, 0, LR * 1.15, 0, TAU); c.fill(); c.restore();
  // mango
  c.save(); c.translate(cx, cy); c.rotate(Math.PI * .75);
  caja(c, LR + 4, -34, 420, 68, 34, CARTON_O, TINTA, 9); caja(c, LR - 30, -46, 60, 92, 10, "#B7A982", TINTA, 8);
  c.restore();
  // cristal: lo de abajo, aumentado
  c.save(); c.beginPath(); c.arc(cx, cy, LR, 0, TAU); c.clip();
  c.fillStyle = "#FBF8F0"; c.fillRect(cx - LR, cy - LR, LR * 2, LR * 2);
  for (let k = -1; k <= 3; k++) {
    const off = (k - pos) * 880; if (Math.abs(off) > LR * 2 + 60) continue;
    c.save(); c.translate(cx, cy + off);
    if (k === -1) renglonesGrandes(c);
    else { const zc = 1 + .1 * ease.inOutSine(prog(t, CASOS[k] + .45, k < 3 ? CASOS[k + 1] : E.aJunta)); c.scale(zc, zc); [caso1, caso2, caso3, caso4][k](c, t); }
    c.restore();
  }
  const gl = c.createRadialGradient(cx - LR * .35, cy - LR * .4, LR * .1, cx, cy, LR);
  gl.addColorStop(0, "rgba(255,255,255,.18)"); gl.addColorStop(.75, "rgba(255,255,255,0)"); gl.addColorStop(1, "rgba(60,70,72,.14)");
  c.fillStyle = gl; c.fillRect(cx - LR, cy - LR, LR * 2, LR * 2);
  c.restore();
  // aro
  c.strokeStyle = TINTA; c.lineWidth = 30; c.beginPath(); c.arc(cx, cy, LR + 12, 0, TAU); c.stroke();
  c.strokeStyle = "#5B5A55"; c.lineWidth = 6; c.beginPath(); c.arc(cx, cy, LR + 12, 3.5, 4.6); c.stroke();
  c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 10; c.beginPath(); c.arc(cx, cy, LR - 40, 3.65, 4.35); c.stroke();
}
function renglonesGrandes(c: C) {
  c.strokeStyle = "rgba(120,116,108,.7)"; c.lineCap = "round"; c.lineWidth = 30;
  for (let n = -4; n <= 4; n++) { let x = -560 + (n % 2) * 60; c.beginPath(); for (let w = 0; w < 9; w++) { const L = 80 + hash(n * 7 + w) * 200; c.moveTo(x, n * 104); c.lineTo(x + L, n * 104); x += L + 60; } c.stroke(); }
}

// ---------- caso 1: la torre del compilador (la misma de a22) ----------
function pinguino(c: C, x: number, y: number, s: number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.fillStyle = CARTON_O; c.beginPath(); c.ellipse(-15, 50, 15, 6, 0, 0, 7); c.ellipse(15, 50, 15, 6, 0, 0, 7); c.fill();
  c.fillStyle = TINTA; c.beginPath(); c.ellipse(0, 6, 34, 46, 0, 0, 7); c.fill();
  c.fillStyle = BLANCO; c.beginPath(); c.ellipse(0, 18, 22, 30, 0, 0, 7); c.fill();
  c.beginPath(); c.arc(-10, -22, 6.5, 0, 7); c.arc(10, -22, 6.5, 0, 7); c.fill();
  c.fillStyle = TINTA; c.beginPath(); c.arc(-9, -21, 2.8, 0, 7); c.arc(11, -21, 2.8, 0, 7); c.fill();
  c.fillStyle = CARTON_O; c.beginPath(); c.moveTo(-9, -12); c.lineTo(9, -12); c.lineTo(0, -3); c.closePath(); c.fill();
  c.restore();
}
function bandera(c: C, x: number, y: number, w: number, h: number, t: number) {
  const N = 14, ond = (u: number, f: number) => Math.sin(u * 5.5 - t * 7 + f) * 9 * u;
  c.beginPath();
  for (let i = 0; i <= N; i++) { const u = i / N; c.lineTo(x + w * u, y + ond(u, 0)); }
  for (let i = N; i >= 0; i--) { const u = i / N; c.lineTo(x + w * u, y + h + ond(u, .5)); }
  c.closePath(); c.fillStyle = BLANCO; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 5; c.lineJoin = "round"; c.stroke();
  pinguino(c, x + w * .5, y + h * .5 + ond(.5, .25), .72);
}
function caso1(c: C, t: number) {
  const G = 318, TX = -110, TW = 210, TOP = -196;
  linea(c, -440, G, 440, G, 6);
  c.strokeStyle = "rgba(17,17,17,.14)"; c.lineWidth = 3; for (let i = 0; i < 16; i++) { const x = -400 + i * 55; c.beginPath(); c.moveTo(x, G + 16); c.lineTo(x - 22, G + 36); c.stroke(); }
  // ladrillos: cada uno una línea de código
  const otro = (rw: number) => rw >= 8 && rw <= 11;
  const filas = Math.floor((G - TOP) / 17);
  for (let rw = 0; rw < filas; rw++) {
    const y = G - (rw + 1) * 17, off = rw % 2 ? 19 : 0;
    for (let k = -1; k < 7; k++) {
      const x0 = Math.max(TX - TW / 2, TX - TW / 2 + k * 38 - off + 2), x1 = Math.min(TX + TW / 2, TX - TW / 2 + k * 38 - off + 36);
      if (x1 - x0 < 8) continue;
      const cambia = otro(rw) && t > E.otro + (k + 1) * .03 + (rw - 8) * .05;
      c.fillStyle = cambia ? CARTON : BLANCO; c.fillRect(x0, y + 1, x1 - x0, 15);
      c.strokeStyle = TINTA; c.lineWidth = 1.6; c.strokeRect(x0, y + 1, x1 - x0, 15);
      linea(c, x0 + 5, y + 8.5, x0 + 5 + (x1 - x0 - 12) * (.3 + hash(rw * 9 + k) * .6), y + 8.5, 2.2);
    }
  }
  c.strokeStyle = TINTA; c.lineWidth = 6; c.strokeRect(TX - TW / 2 + tiembla(1) * 1.5, TOP, TW, G - TOP);
  for (let mm = 0; mm < 4; mm++) caja(c, TX - TW / 2 + 6 + mm * 54, TOP - 30, 36, 30, 2, BLANCO, TINTA, 4);
  linea(c, TX, TOP - 30, TX, TOP - 150, 7);
  circulo(c, TX, TOP - 156, 8, TINTA, null);
  bandera(c, TX + 4, TOP - 148, 128, 82, t);
  // la franja que hizo otro compilador
  if (t > E.otro - .05) {
    const k = ease.outBack(prog(t, E.otro, E.otro + .35), 1.6), p = .75 + .25 * Math.sin(t * 6);
    const y0 = G - 12 * 17, y1 = G - 8 * 17;
    c.save(); c.globalAlpha *= clamp(k) * p;
    c.strokeStyle = ACENTO; c.lineWidth = 8; c.strokeRect(TX - TW / 2 - 12, y0 - 6, TW + 24, y1 - y0 + 12);
    c.restore();
  }
  // las dieciséis bolitas que la levantan
  for (let i = 0; i < 16; i++) {
    const k = clamp(brota(t, E.dieciseis + i * .035, 4.5, .4), 0, 1.3); if (k <= .01) continue;
    const lado = i < 8 ? -1 : 1, j = i % 8, r = 18 * k;
    const x = TX + lado * (TW / 2 + 28 + (j % 2) * 20), y = G - 24 - j * 60 + Math.sin(t * 5 + i) * 5;
    const pared = TX + lado * (TW / 2 + 2);
    agente(c, x, y, r, [lado < 0 ? x - 26 : pared, y - 26 + Math.sin(t * 9 + i) * 6], [lado < 0 ? pared : x + 26, y - 20 + Math.cos(t * 9 + i) * 6]);
  }
  // la mano humana escribe las pruebas
  if (t > E.humano - .1) {
    const SX = 140, SY0 = -230, SY1 = 250;
    const rev = ease.inOutCubic(prog(t, E.pruebas, E.pruebas + .32));
    if (rev > 0) {
      c.save(); c.beginPath(); c.rect(SX - 10, SY0 - 10, 150, (SY1 - SY0) * rev + 20); c.clip();
      caja(c, SX, SY0, 120, SY1 - SY0, 6, BLANCO, TINTA, 5);
      for (let k = 0; k < 6; k++) caja(c, SX + 34, SY0 + 34 + k * 74, 46, 46, 4, null, TINTA, 4);
      c.restore();
    }
    E.palomas.forEach((tp, k) => {
      const u = prog(t, tp - .02, tp + .12); if (u <= 0) return;
      const bx = SX + 57, by = SY0 + 57 + k * 74;
      c.strokeStyle = TINTA; c.lineWidth = 8; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath(); c.moveTo(bx - 16, by);
      if (u < .4) c.lineTo(bx - 16 + 10 * u / .4, by + 12 * u / .4); else { c.lineTo(bx - 6, by + 12); c.lineTo(bx - 6 + 30 * (u - .4) / .6, by + 12 - 36 * (u - .4) / .6); }
      c.stroke();
    });
    // la punta del lápiz queda 54 px abajo y 5 a la izquierda de la mano
    const baja = ease.outCubic(prog(t, E.humano - .1, E.humano + .35)), sube = ease.inCubic(prog(t, E.palomas[5] + .25, E.palomas[5] + .7));
    let hy = lerp(-700, SY0 - 54, baja), hx = SX + 126;
    if (t > E.pruebas) hy = SY0 + (SY1 - SY0) * rev - 54;
    if (t > E.palomas[0] - .12) {
      let k = 0; while (k < 5 && t > E.palomas[k + 1] - .12) k++;
      const u = prog(t, E.palomas[k] - .12, E.palomas[k] + .1);
      hy = SY0 + 57 + k * 74 - 54 + (u < 1 ? Math.sin(Math.PI * u) * -10 : 0); hx = SX + 62 + 14 * u;
    }
    hy -= sube * 700;
    manoArriba(c, hx + Math.sin(t * 9) * 2, hy, .62, true);
  }
}

// ---------- caso 2: el navegador de cientos de agentes ----------
const PIEZAS: [number, number, number, number, number][] = [[-270, -170, 540, 56, 0], [-270, -96, 250, 178, 1], [0, -96, 270, 178, 2], [-270, 104, 160, 50, 3], [-92, 104, 160, 50, 4], [86, 104, 184, 50, 5], [-270, 176, 540, 36, 6]];
const CAEN = [3, 1, 5, 6, 4];
function caso2(c: C, t: number) {
  const t0 = E.c2;
  caja(c, -300, -250, 600, 482, 22, BLANCO, TINTA, 7);
  c.fillStyle = HUMO; c.fillRect(-296, -246, 592, 50); linea(c, -300, -196, 300, -196, 5);
  for (let k = 0; k < 3; k++) circulo(c, -268 + k * 26, -221, 8, k === 0 ? ACENTO : CARTON_O, TINTA, 2.5);
  caja(c, -170, -238, 440, 32, 16, BLANCO, TINTA, 4);
  // progreso de caracol
  if (t > E.lento - .1) {
    const p = .06 + .2 * ease.outCubic(prog(t, E.lento, E.lento + 9));
    c.fillStyle = ACENTO; c.fillRect(-296, -194, 592 * p, 8);
    const sx = -296 + 592 * p, sy = -200;
    c.save(); c.translate(sx, sy); const st = Math.sin(t * 2.4) * 2;
    c.beginPath(); c.moveTo(-36, 0); c.quadraticCurveTo(-30, -14 + st, 6, -12); c.lineTo(16, -26); c.moveTo(6, -12); c.lineTo(22, -18);
    c.strokeStyle = TINTA; c.lineWidth = 5; c.lineCap = "round"; c.stroke();
    circulo(c, 16, -26, 4, TINTA, null); circulo(c, 22, -18, 4, TINTA, null);
    circulo(c, -20, -22, 20, CARTON, TINTA, 4);
    c.beginPath(); for (let a = 0; a < 12; a += .3) { const rr2 = 16 - a * 1.25; c.lineTo(-20 + Math.cos(a) * rr2, -22 + Math.sin(a) * rr2); } c.lineWidth = 3; c.stroke();
    c.restore();
  }
  // piezas: llegan, y luego varias se caen
  PIEZAS.forEach(([x, y, w, h, id]) => {
    const kin = ease.outBack(prog(t, t0 + .15 + id * .14, t0 + .5 + id * .14), 1.3);
    if (kin <= 0) return;
    const q = CAEN.indexOf(id), tc = q >= 0 ? E.caen[q] : 999;
    if (t > tc) { c.save(); c.setLineDash([12, 9]); c.strokeStyle = ACENTO; c.lineWidth = 5; c.strokeRect(x, y, w, h); c.restore(); }
    const a = Math.max(0, t - tc);
    const dy = (1 - kin) * -420 + 1500 * a * a, rotq = a * (id % 2 ? 2.4 : -2);
    c.save(); c.translate(x + w / 2, y + h / 2 + dy); c.rotate(rotq);
    caja(c, -w / 2, -h / 2, w, h, 8, id === 1 ? "#EDE6D4" : id >= 3 && id <= 5 ? CARTON : "#F6F1E6", TINTA, 4);
    if (id === 1) {
      c.beginPath(); c.moveTo(-w / 2 + 16, h / 2 - 16); c.lineTo(-30, -10); c.lineTo(10, 30); c.lineTo(50, -20); c.lineTo(w / 2 - 16, h / 2 - 16); c.closePath(); c.fillStyle = CARTON_O; c.fill(); c.stroke();
      circulo(c, -50, -48, 18, null, TINTA, 4);
      if (t > E.lento) { c.save(); c.translate(0, -8); c.rotate(t * 1.3); c.strokeStyle = ACENTO; c.lineWidth = 9; c.lineCap = "round"; c.beginPath(); c.arc(0, 0, 30, 0, 4.4); c.stroke(); c.restore(); }
    } else if (id === 2 || id === 0) {
      for (let k = 0; k < (id === 2 ? 6 : 1); k++) linea(c, -w / 2 + 18, -h / 2 + 22 + k * 26 + (id === 0 ? 6 : 0), -w / 2 + 18 + (w - 50) * (.45 + .5 * hash(k + id * 7)), -h / 2 + 22 + k * 26 + (id === 0 ? 6 : 0), 6);
    } else linea(c, -w / 4, 0, w / 4, 0, 6);
    c.restore();
  });
  // el enjambre de bolitas
  const n = t < E.cientos ? 14 : Math.round(lerp(14, 96, smooth(prog(t, E.cientos, E.cientos + .9))));
  for (let b = 0; b < n; b++) {
    const k = clamp(brota(t, b < 14 ? t0 + .1 + b * .03 : E.cientos + (b - 14) * .009, 5, .4), 0, 1.25);
    if (k <= .01) continue;
    const h1 = hash(b * 3.1), h2 = hash(b * 7.7), sp = .5 + hash(b) * .8;
    const x = -270 + 540 * frac(h1 + t * .035 * sp * (b % 2 ? 1 : -1)) + Math.sin(t * 2 + b) * 10;
    const y = -175 + 390 * h2 + Math.sin(t * 2.7 * sp + b) * 14;
    const r = 10 * k;
    agente(c, x, y, r, [x - 14 * k, y - 12 * k + Math.sin(t * 15 + b) * 3], [x + 14 * k, y - 12 * k + Math.cos(t * 15 + b) * 3]);
  }
}

// ---------- caso 3: Gas Town, una colmena que se maneja desde un tablero lleno de palancas ----------
function hexa(c: C, x: number, y: number, r: number, a: number, fill: string, g = 4) {
  c.beginPath(); for (let k = 0; k < 6; k++) { const q = a + k * TAU / 6; c.lineTo(x + Math.cos(q) * r, y + Math.sin(q) * r); } c.closePath();
  c.fillStyle = fill; c.fill(); c.strokeStyle = TINTA; c.lineWidth = g; c.lineJoin = "round"; c.stroke();
}
const PANAL: XY[] = (() => {
  const out: XY[] = [], dx = 47 * Math.sqrt(3);
  ([[4, -262], [5, -192], [4, -122]] as [number, number][]).forEach(([n, y]) => { for (let k = 0; k < n; k++) out.push({ x: (k - (n - 1) / 2) * dx, y }); });
  return out.sort((p, q) => Math.hypot(p.x, p.y + 192) - Math.hypot(q.x, q.y + 192));     // crece del centro hacia afuera
})();
const PALANCAS: XY[] = [...Array.from({ length: 10 }, (_, k) => ({ x: -207 + k * 46, y: 152 })), ...Array.from({ length: 9 }, (_, k) => ({ x: -184 + k * 46, y: 206 }))];
function estadoPalanca(j: number, t: number) {
  // cada palanca empieza arriba o abajo y cambia cuando el orquestador la jala; al final se alborotan todas
  let s = hash(j * 5.3) > .5 ? 1 : -1, ult = -9;
  E.palancas.forEach((tp, k) => { if ((k * 7) % 19 === j && t > tp) { s = -s; ult = tp; } });
  const loco = t > E.cualquiera + .1 ? Math.sin(t * (9 + j % 5) + j) : 0;
  const k = smooth(prog(t, ult, ult + .12));
  return clamp(s * (2 * k - 1) * (ult > 0 ? 1 : 1) + loco * .9, -1, 1);
}
function caso3(c: C, t: number) {
  const ko = clamp(brota(t, E.orq, 4.2, .42), 0, 1.2), loco = t > E.cualquiera + .1 ? 1 : 0;
  // cables del panal al tablero: las señales suben
  if (ko > .05) {
    c.save(); c.setLineDash([7, 9]); c.lineDashOffset = t * 46; c.strokeStyle = `rgba(17,17,17,${.3 * clamp(ko)})`; c.lineWidth = 3;
    PANAL.forEach((p) => { c.beginPath(); c.moveTo(p.x, p.y + 36); c.quadraticCurveTo(p.x, 20, p.x * .55, 70); c.stroke(); });
    c.restore();
  }
  // el panal: cada celda con su bola trabajando
  PANAL.forEach((p, k) => {
    const t1 = E.celdasG[k], s = clamp(brota(t, t1, 4.6, .45), 0, 1.25); if (s <= .01) return;
    hexa(c, p.x, p.y, 47 * s, -Math.PI / 2, k % 3 === 0 ? "#EFE5CC" : CARTON, 4);
    if (t > t1 + .1) { const tc = Math.sin(t * 13 + k); linea(c, p.x - 26, p.y + 24, p.x + 26, p.y + 24, 3.5); agente(c, p.x, p.y - 2, 17, [p.x - 20, p.y + 19 + tc * 3], [p.x + 20, p.y + 19 - tc * 3]); }
  });
  // hojitas que pasan de celda en celda
  if (t > E.celdasG[12] + .2) for (let j = 0; j < 4; j++) {
    const z = (t + j * .37) / 1.1, u = frac(z), n = Math.floor(z) + j * 3;
    const A = PANAL[n % 13], B = PANAL[(n * 5 + 3) % 13]; if (A === B) continue;
    hoja(c, lerp(A.x, B.x, ease.inOutCubic(u)), lerp(A.y, B.y, ease.inOutCubic(u)) - Math.sin(Math.PI * u) * 36 - 6, 22, 16, 0, BLANCO, TINTA, j);
  }
  // el orquestador, asomado detrás del tablero
  const jale = (lado: number): XY => {
    let j = lado < 0 ? 2 : 7;
    E.palancas.forEach((tp, k) => { const jj = (k * 7) % 19; if (t > tp - .25 && ((PALANCAS[jj].x < 0) === (lado < 0))) j = jj; });
    const P2 = PALANCAS[j]; return { x: P2.x + Math.sin(t * 7 + lado) * 4 * (1 - loco) + loco * Math.sin(t * 17 + lado) * 30, y: P2.y - 34 + loco * Math.cos(t * 15) * 16 };
  };
  if (ko > .01) {
    const by = 34 + Math.sin(t * 3.4) * 4;
    agente(c, 0, by, 40 * ko, [-58 * ko, by - 30 * ko], [58 * ko, by - 30 * ko]);
  }
  // el tablero de mandos
  c.beginPath(); c.moveTo(-256, 70); c.lineTo(256, 70); c.lineTo(300, 238); c.lineTo(-300, 238); c.closePath();
  c.fillStyle = "#DCD1B6"; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 6; c.lineJoin = "round"; c.stroke();
  linea(c, -266, 116, 266, 116, 3, "rgba(17,17,17,.35)");
  // relojes de aguja y focos
  [-195, -95, 95, 195].forEach((x, k) => {
    circulo(c, x, 92, 15, BLANCO, TINTA, 3.5);
    const a = -1.2 + .35 * Math.sin(t * (1.3 + k * .4) + k) * ko + loco * t * (6 + k * 3);
    linea(c, x, 92, x + Math.sin(a) * 12, 92 - Math.cos(a) * 12, 3, k === 2 ? ACENTO : TINTA);
  });
  [-145, -45, 45, 145].forEach((x, k) => {
    const on = ko > .3 && Math.sin(t * (loco ? 20 : 4) + k * 1.7) > 0;
    circulo(c, x, 92, 7, on ? (k % 2 ? "#E3A33A" : ACENTO) : "#B9AE93", TINTA, 2.5);
  });
  // las palancas
  PALANCAS.forEach((p, j) => {
    caja(c, p.x - 6, p.y - 4, 12, 22, 3, "#2C2C2C", null);
    const a = estadoPalanca(j, t) * .55, tx2 = p.x + Math.sin(a) * 30, ty2 = p.y - Math.cos(a) * 30;
    linea(c, p.x, p.y + 4, tx2, ty2, 4.5);
    circulo(c, tx2, ty2, 7.5, j % 6 === 2 ? ACENTO : TINTA, null);
  });
  // las manos del orquestador sobre las palancas
  if (ko > .01) {
    const by = 34 + Math.sin(t * 3.4) * 4, h1 = jale(-1), h2 = jale(1);
    brazo(c, -36 * ko, by + 4, lerp(-58, h1.x, ko), lerp(by - 30, h1.y, ko), 40, .5, TINTA, 1, .45 * ko);
    brazo(c, 40 * ko, by + 10, lerp(58, h2.x, ko), lerp(by - 30, h2.y, ko), -40, .5, TINTA, 1, .45 * ko);
  }
  // EXPERIMENTAL: el sello cae sobre el tablero
  if (t > E.experimental - .12) {
    const k = prog(t, E.experimental - .12, E.experimental), sc = t < E.experimental ? lerp(1.9, 1, ease.inCubic(k)) : 1 + golpeteo(t, E.experimental, .035, 30, 12);
    c.save(); c.translate(0, 196); c.rotate(-.09); c.scale(sc, sc); c.globalAlpha *= t < E.experimental ? k : 1;
    c.fillStyle = "rgba(244,242,236,.9)"; c.fillRect(-176, -36, 352, 72);
    c.strokeStyle = ACENTO; c.lineWidth = 7; c.strokeRect(-176, -36, 352, 72); c.lineWidth = 3; c.strokeRect(-166, -26, 332, 52);
    tx(c, "EXPERIMENTAL", 0, 16, { fuente: mono(42), color: ACENTO });
    const r = azar(48); c.fillStyle = "rgba(244,242,236,.85)"; for (let i = 0; i < 60; i++) c.fillRect(-176 + r() * 352, -36 + r() * 72, 2 + r() * 4, 2 + r() * 3);
    c.restore();
  }
  // chispas cuando se alborota: no es para cualquiera
  if (loco) { const r = azar(Math.floor(t * 12)); c.strokeStyle = ACENTO; c.lineWidth = 4; c.lineCap = "round"; for (let i = 0; i < 6; i++) { const x = -240 + r() * 480, y = 80 + r() * 60, a = r() * TAU; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 16, y + Math.sin(a) * 16); c.stroke(); } }
}

// ---------- caso 4: el pasillo con candado ----------
const PASAN = [{ x: 205, y: -64 }, { x: 315, y: 30 }, { x: 214, y: 92 }];
function caso4(c: C, t: number) {
  const PW = 122, PX = 106;
  // paredes del pasillo
  c.fillStyle = "#E3DCCB";
  c.fillRect(-460, -PW - 60, PX + 460, 60); c.fillRect(-460, PW, PX + 460, 60);
  linea(c, -460, -PW, PX, -PW, 8); linea(c, -460, PW, PX, PW, 8);
  c.strokeStyle = "rgba(17,17,17,.2)"; c.lineWidth = 3;
  for (let i = 0; i < 12; i++) { const x = -440 + i * 46; c.beginPath(); c.moveTo(x, -PW - 6); c.lineTo(x - 26, -PW - 40); c.moveTo(x, PW + 6); c.lineTo(x - 26, PW + 40); c.stroke(); }
  // la puerta con barrotes
  caja(c, PX, -PW - 50, 22, PW * 2 + 100, 4, CARTON_O, TINTA, 5);
  // los que ya pasaron
  let pasados = 0; for (let k = 0; k < E.candado.length; k++) if (t > E.candado[k] + .5) pasados++;
  for (let k = 0; k < pasados; k++) {
    const p = PASAN[k], tt = Math.sin(t * 9 + k);
    agente(c, p.x, p.y, 30, [p.x - 34, p.y - 28 + tt * 5], [p.x + 34, p.y - 28 - tt * 5]);
  }
  // la fila atorada: el de adelante cruza cuando abre el candado y los demás se recorren un lugar
  const lugar = (n: number): XY => { const row = [1, 0, 2][n % 3], col = Math.floor(n / 3); return { x: PX - 46 - col * 66 - (row === 1 ? 0 : 26), y: (row - 1) * 72 }; };
  let corre = 0; for (const tk of E.candado) corre += smooth(prog(t, tk + .3, tk + .7));
  for (let q = 19; q >= 0; q--) {
    const tk = q < E.candado.length ? E.candado[q] : 999;
    if (t > tk + .5) continue;                       // ya está del otro lado
    let x: number, y: number;
    if (t >= tk) {
      const u = ease.inOutCubic(prog(t, tk, tk + .5)), p = PASAN[q];
      x = lerp(PX - 46, p.x, u); y = lerp(0, p.y, u) - Math.sin(Math.PI * u) * 40;
    } else {
      const qq = Math.max(q - corre, 0), a = lugar(Math.floor(qq)), b = lugar(Math.ceil(qq)), f = smooth(frac(qq));
      x = lerp(a.x, b.x, f); y = lerp(a.y, b.y, f);
    }
    const j = Math.sin(t * 17 + q * 2.1) * 3.5, jy = Math.cos(t * 13 + q * 1.7) * 3;
    agente(c, x + j, y + jy, 30, [x + j - 30, y - 30 + jy], [x + j + 30, y - 34 - jy]);
  }
  // el candado
  const abre = E.candado.reduce((m, tk) => Math.max(m, ventana(t, tk - .05, tk + .4, .08, .12)), 0);
  c.save(); c.translate(PX + 11, -8);
  c.strokeStyle = TINTA; c.lineWidth = 10; c.beginPath(); c.arc(0, -26 - abre * 22, 22, Math.PI, 0); c.lineTo(22, -10 - abre * 22 + (abre > .5 ? -10 : 0)); c.moveTo(-22, -26 - abre * 22); c.lineTo(-22, -10); c.stroke();
  caja(c, -34, -16, 68, 56, 10, "#B79A53", TINTA, 6);
  circulo(c, 0, 6, 7, TINTA, null); c.fillStyle = TINTA; c.fillRect(-3, 6, 6, 16);
  c.restore();
}

// ---------- el mundo de noche ----------
function cielo(c: C, t: number, v: V) {
  const g = c.createLinearGradient(0, 0, 0, 1920);
  g.addColorStop(0, "#06070A"); g.addColorStop(.55, "#0E1117"); g.addColorStop(1, "#171B23");
  c.fillStyle = g; c.fillRect(0, 0, 1080, 1920);
  const r = azar(31);
  for (let i = 0; i < 90; i++) {
    const x = ((r() * 1300 - v.x * .03) % 1300 + 1300) % 1300 - 110, y = ((r() * 2100 - v.y * .03) % 2100 + 2100) % 2100 - 90, z = 1.4 + r() * 2.6;
    c.globalAlpha = (.25 + .55 * Math.abs(Math.sin(t * (.6 + r() * 1.4) + i))) * (.5 + r() * .5);
    c.fillStyle = LUZ; c.fillRect(x, y, z, z);
  }
  c.globalAlpha = 1;
}
function humoChimenea(c: C, t: number, ch: { x: number; w: number; top: number; ph: number }) {
  const P = .62, vida = 4.4;
  const k0 = Math.floor((t - vida) / P) - 1, k1 = Math.floor(t / P);
  for (let k = k0; k <= k1; k++) {
    const tb = k * P + ch.ph * .1, a = t - tb; if (a < 0 || a > vida) continue;
    const u = a / vida, x = ch.x - 30 * a - 7 * a * a + Math.sin(k * 2.3 + a) * 8, y = ch.top - 10 - 64 * a, R = ch.w * .34 + 16 * a;
    // en pantalla, el humo se deshace antes de llegar a la franja de los rótulos
    const m = c.getTransform(), sy = m.b * x + m.d * y + m.f;
    c.globalAlpha = (1 - u) * .9 * smooth(a / .3) * smooth((sy - 290) / 110);
    circulo(c, x, y, R, "#2A2D33", "#474B54", 2.5);
  }
  c.globalAlpha = 1;
}
function fabrica(c: C, t: number, z: number) {
  // luna
  // la luna se esconde mientras la cámara la pasaría por debajo de «la pregunta cambió» y «¿quién escribe?»
  c.save(); c.globalAlpha *= 1 - ventana(t, E.pregunta - .2, E.pedir + .9, .3, .4);
  circulo(c, 480, -1250, 40, "#E6E2D6", null);
  circulo(c, 468, -1258, 9, "rgba(150,146,136,.35)", null); circulo(c, 492, -1236, 6, "rgba(150,146,136,.35)", null);
  halo(c, 480, -1250, 150, "230,226,214", .1);
  c.restore();
  // chimeneas y humo
  for (const ch of CHIM) {
    humoChimenea(c, t, ch);
    c.fillStyle = MURO_B; c.fillRect(ch.x - ch.w / 2, ch.top, ch.w, -470 - ch.top);
    c.strokeStyle = MURO_O; c.lineWidth = 2.5; c.strokeRect(ch.x - ch.w / 2, ch.top, ch.w, -470 - ch.top);
    c.fillStyle = MURO_O; c.fillRect(ch.x - ch.w / 2 - 6, ch.top - 12, ch.w + 12, 14);
    for (let k = 1; k < 4; k++) linea(c, ch.x - ch.w / 2, ch.top + k * 26, ch.x + ch.w / 2, ch.top + k * 26, 1.2, "rgba(120,126,138,.25)");
  }
  // techo de dientes de sierra
  DIENTES.forEach((d, k) => {
    c.beginPath(); c.moveTo(d.x0, -470); c.lineTo(d.x0, -600); c.lineTo(d.x1, -470); c.closePath();
    c.fillStyle = MURO_B; c.fill(); c.strokeStyle = MURO_O; c.lineWidth = 2.5; c.lineJoin = "round"; c.stroke();
    const L = apaga(t, E.apagon[16 + k]), cx = d.x0 + 52, cy = -510;
    if (L > .01) halo(c, cx, cy, 60, "242,200,120", .25 * L);
    circulo(c, cx, cy, 16, mez(APAGA, ARDE, L), "#0E0F12", 2.4);
    linea(c, cx - 16, cy, cx + 16, cy, 1.4, "#0E0F12"); linea(c, cx, cy - 16, cx, cy + 16, 1.4, "#0E0F12");
  });
  // muro
  c.fillStyle = MURO; c.fillRect(-460, -470, 920, 470);
  c.strokeStyle = "rgba(120,126,138,.09)"; c.lineWidth = 1.2;
  for (let y = -450; y < 0; y += 22) { c.beginPath(); c.moveTo(-460, y); c.lineTo(460, y); c.stroke(); }
  c.strokeStyle = MURO_O; c.lineWidth = 2.5; c.strokeRect(-460, -470, 920, 470);
  c.fillStyle = "#16181D"; c.fillRect(-460, -70, 920, 70); linea(c, -460, -70, 460, -70, 2, MURO_O);
  // resplandor de las ventanas sobre el muro
  VEN.forEach((w, i) => { const L = luzVentana(i, t); if (L > .01) halo(c, w.x, w.y, 105, "242,196,112", .2 * L); });
  // ventanas
  const am = clamp((6.2 - z) / 3);
  VEN.forEach((w, i) => {
    const L = luzVentana(i, t);
    c.save(); c.translate(w.x - WW / 2, w.y - WH / 2);
    c.save(); c.beginPath(); c.rect(0, 0, WW, WH); c.clip(); c.scale(SW, SW);
    interior(c, i, t, L);
    c.restore();
    if (am > .01) {
      c.globalAlpha = am; c.strokeStyle = "#0E0F12"; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(WW / 2, 0); c.lineTo(WW / 2, WH); for (let k = 1; k < 4; k++) { c.moveTo(0, WH * k / 4); c.lineTo(WW, WH * k / 4); } c.stroke();
      c.globalAlpha = 1;
    }
    c.strokeStyle = "#0B0C0F"; c.lineWidth = 2.6; c.strokeRect(0, 0, WW, WH);
    c.fillStyle = MURO_O; c.fillRect(-4, WH, WW + 8, 4.5);
    c.restore();
  });
  // la ranura entre la ventana 15 y la oficina
  caja(c, 420, -152, 30, 6, 1.5, "#0A0B0D", "#8A7F66", 1.2);
  for (const tr of E.ranura) {
    const k = ventana(t, tr - .05, tr + .25, .06, .35); if (k <= .01) continue;
    halo(c, 435, -149, 40, "255,214,140", .55 * k);
    c.save(); c.globalAlpha = k; c.fillStyle = "#FBEFC9"; c.fillRect(422, -151, 26, 4); c.restore();
  }
  for (const tr of E.ranura) VEN.forEach((w, i) => {
    if (luzVentana(i, t) > .5) return;
    const d = tr + .2 + (7 - (i % 8)) * .11 + (i < 8 ? .06 : 0), k = ventana(t, d, d + .16, .05, .4);
    if (k <= .01) return;
    halo(c, w.x, w.y, 80, "160,195,240", .3 * k);
    c.save(); c.globalAlpha = .28 * k; c.fillStyle = "#BFD6F2"; c.fillRect(w.x - WW / 2, w.y - WH / 2, WW, WH); c.restore();
  });
  // la oficina de StrongDM
  const LA = luzAnexo(t);
  c.fillStyle = "#20232A"; c.fillRect(ANEXO.x0, ANEXO.top, ANEXO.x1 - ANEXO.x0, -ANEXO.top);
  c.strokeStyle = MURO_O; c.lineWidth = 2.5; c.strokeRect(ANEXO.x0, ANEXO.top, ANEXO.x1 - ANEXO.x0, -ANEXO.top);
  c.fillStyle = MURO_O; c.fillRect(ANEXO.x0 - 6, ANEXO.top - 8, ANEXO.x1 - ANEXO.x0 + 12, 10);
  if (LA > .01) halo(c, ANEXO.vx, ANEXO.vy, 170, "242,196,112", .2 * LA);
  c.save(); c.translate(ANEXO.vx - ANEXO.vw / 2, ANEXO.vy - ANEXO.vh / 2);
  c.save(); c.beginPath(); c.rect(0, 0, ANEXO.vw, ANEXO.vh); c.clip(); c.scale(ANEXO.vw / 1080, ANEXO.vw / 1080); oficina(c, t, LA); c.restore();
  c.strokeStyle = "#0B0C0F"; c.lineWidth = 2.6; c.strokeRect(0, 0, ANEXO.vw, ANEXO.vh);
  c.fillStyle = MURO_O; c.fillRect(-4, ANEXO.vh, ANEXO.vw + 8, 4.5);
  c.restore();
  taximetro(c, t);
}
function farolYCartel(c: C, t: number, d: D, z: number) {
  const Lf = luzFarol(t);
  // postes
  linea(c, CARTEL.x - 52, CARTEL.y + CARTEL.h / 2, CARTEL.x - 52, 0, 7, "#2B2E35");
  linea(c, CARTEL.x + 52, CARTEL.y + CARTEL.h / 2, CARTEL.x + 52, 0, 7, "#2B2E35");
  // el farol
  const FX = -690, HX = CARTEL.x - 10, HY = -455;
  linea(c, FX, 0, FX, HY - 10, 6, "#2B2E35"); linea(c, FX, HY - 10, HX, HY - 10, 5, "#2B2E35");
  if (Lf > .01) {
    c.save(); c.globalAlpha = .1 * Lf * clamp((14 - z) / 6);
    c.beginPath(); c.moveTo(HX - 14, HY); c.lineTo(HX + 14, HY); c.lineTo(HX + 150, 0); c.lineTo(HX - 150, 0); c.closePath();
    c.fillStyle = "#FFD98C"; c.fill(); c.restore();
    halo(c, HX, 0, 190, "255,214,140", .12 * Lf);
  }
  c.beginPath(); c.moveTo(HX - 20, HY); c.lineTo(HX + 20, HY); c.lineTo(HX + 10, HY - 12); c.lineTo(HX - 10, HY - 12); c.closePath(); c.fillStyle = "#2B2E35"; c.fill();
  circulo(c, HX, HY + 2, 5, mez("#3A3F48", "#FFF1C8", Lf), null);
  if (Lf > .01) halo(c, HX, HY + 4, 40, "255,230,170", .5 * Lf);
  // el cartel
  c.save(); c.translate(CARTEL.x - CARTEL.w / 2, CARTEL.y - CARTEL.h / 2); c.scale(SC, SC);
  cartel(c, t, d);
  c.restore();
}

// ---------- cámara ----------
type V = { x: number; y: number; z: number };
const P = (x: number, y: number, z: number): V => ({ x, y, z });
/** Zoom hacia un punto: el objetivo viaja derecho en pantalla mientras el zoom cambia en escala logarítmica. */
function mezV(a: V, b: V, k: number): V {
  const z = a.z * (b.z / a.z) ** k;
  if (b.z >= a.z) { const f = a.z * (1 - k) / z; return { x: b.x - (b.x - a.x) * f, y: b.y - (b.y - a.y) * f, z }; }
  const f = b.z * k / z; return { x: a.x - (a.x - b.x) * f, y: a.y - (a.y - b.y) * f, z };
}
const V0 = P(20, -690, .78);
const POSTER = P(CARTEL.x, CARTEL.y, 6.4);
const FINO = P(CARTEL.x + (NB.x + 540 * NB.s - 540) * SC, CARTEL.y + (NB.y + 960 * NB.s - 960) * SC, 1080 / (1080 * NB.s * SC));
const CLAVES: [number, number, V, ((x: number) => number)?][] = [
  [0, 0, P(48, -346, 13)],
  [0, 1.35, P(54, -334, 9.4), ease.outCubic],
  [1.35, E.aFab - 1.35, P(54, -331, 10.4), ease.inOutSine],
  [E.aFab, 1.7, V0, ease.outExpo],
  [E.aFab + 1.75, E.aStrong - E.aFab - 1.75, P(30, -700, .83), ease.inOutSine],
  [E.aStrong, 1.15, P(560, -188, 2.85), ease.inOutCubic],
  [E.resto - .25, 1.3, P(450, -182, 2.85)],
  [E.aMeta, .85, P(TAXI.x, TAXI.y + 12, 5.2), ease.inOutCubic],
  [E.aMeta + .9, E.aCartel - E.aMeta - .9, P(TAXI.x, TAXI.y + 12, 5.5), ease.inOutSine],
  [E.aCartel, .7, P(0, -420, 1.15), ease.inOutCubic],
  [E.aCartel + .55, 1.05, POSTER, ease.outExpo],
  [E.aCartel + 1.6, E.ahora - E.aCartel - 1.6, P(CARTEL.x, CARTEL.y - 6, 6.9), ease.inOutSine],
  [E.ahora, 1.15, FINO, ease.outExpo],
  [E.aJunta, .55, P(-300, -330, 1.15), ease.inCubic],
  [E.aJunta + .5, .95, P(VEN[WM].x, VEN[WM].y, 17.6), ease.outExpo],
  [E.humo0 + .45, .3, P(VEN[WM].x + 4, -175, 31)],
  [E.humo - .05, E.veinte30 - E.humo + .5, P(VEN[WM].x, VEN[WM].y, 17.6), ease.inOutCubic],
  [E.pregunta, 1.6, P(110, -660, .8), ease.outExpo],
  [E.quien, 2.3, P(260, -380, 1.5), ease.inOutSine],
  [E.pedir - .1, 1.05, P(330, -287, 4.6), ease.inOutCubic],
  [E.luces, 1.25, P(60, -640, .82), ease.inOutCubic],
  [E.criterio - .3, 3.5, P(VEN[WF].x, -343, 6.4), ease.inOutCubic],
];
function vista(t: number): V {
  let v = CLAVES[0][2];
  for (let i = 1; i < CLAVES.length; i++) {
    const [a, d, b, f] = CLAVES[i];
    if (t < a) break;
    v = mezV(v, b, (f ?? ease.inOutCubic)(prog(t, a, a + d)));
  }
  return v;
}
const GOLPES: [number, number][] = [[E.ningun + .22, 9], [E.revisa, 6], [E.oscura, 5], [E.bandera, 10], [E.asterisco, 7], [E.otro, 5], [E.experimental, 8], [E.caen[0], 5], [E.caen[2], 5], [E.enciende, 4], [E.criterio, 7], [E.ultimas[2] + .05, 6], ...E.candado.map((x) => [x, 3] as [number, number])];
function sacudida(t: number) {
  let x = 0, y = 0;
  for (const [ti, a] of GOLPES) { if (t < ti || t > ti + .8) continue; const u = t - ti; x += a * Math.exp(-u * 8) * Math.sin(u * 71); y += a * .8 * Math.exp(-u * 8) * Math.cos(u * 63); }
  return { x, y };
}

// ---------- capas de pantalla ----------
function polvo(c: C, t: number, color: string, k = 1) {
  const r = azar(18);
  c.fillStyle = color;
  for (let i = 0; i < 70; i++) {
    const x0 = r() * 1200 - 60, y0 = r() * 2060, v = 14 + r() * 40, f = r() * 6.3, z = 1.6 + r() * 3.2;
    const y = ((y0 - t * v) % 2060 + 2060) % 2060 - 70, x = x0 + Math.sin(t * .5 + f) * 36;
    c.globalAlpha = (.06 + r() * .14) * k; c.fillRect(x, y, z, z);
  }
  c.globalAlpha = 1;
}
function rayas(c: C, t: number, oscuro: boolean) {
  for (const t0 of [E.aCartel + .35, E.aJunta + .25]) {
    const k = t - t0; if (k < 0 || k > .55) continue;
    const a = Math.sin(Math.PI * k / .55), r = azar(Math.floor(t0 * 10));
    c.strokeStyle = oscuro ? LUZ : TINTA; c.lineCap = "round";
    for (let i = 0; i < 24; i++) {
      const y = 140 + r() * 1500, L = 220 + r() * 520, x = ((r() * 1600 - k * 3200) % 1600 + 1600) % 1600 - 260;
      c.globalAlpha = a * (.08 + r() * .2); c.lineWidth = 3 + r() * 5; c.beginPath(); c.moveTo(x, y); c.lineTo(x + L, y); c.stroke();
    }
  }
  c.globalAlpha = 1;
}
function rotulos(c: C, t: number) {
  // 1. ningún humano: cae como un sello
  const kN = ease.outBack(prog(t, E.ningun, E.ningun + .26), 1.8), aN = smooth(prog(t, E.ningun - .02, E.ningun + .06)) * (1 - smooth(prog(t, E.aFab + .1, E.aFab + .35)));
  if (aN > .01) tx(c, "ningún humano", 540, lerp(110, 232, kN), { fuente: serif(132), color: LUZ, alfa: aN });
  const fl = prog(t, E.revisa - .08, E.revisa + .14);
  const aV = smooth(prog(t, E.escribe - .04, E.escribe + .12)) * (1 - smooth(prog(t, E.aFab + .1, E.aFab + .35)));
  if (aV > .01) {
    c.save(); c.translate(540, 334); c.scale(1, Math.abs(Math.cos(Math.PI * fl)) + .001);
    tx(c, fl < .5 ? "escribe" : "revisa", 0, 0, { fuente: serif(118, true), color: fl < .5 ? LUZ : "#E06A4E", alfa: aV });
    c.restore();
  }
  // 2. la fábrica
  rot(c, t, E.oscura, E.aStrong - .1, "fábrica oscura", 236, 150, LUZ, true);
  // 3. StrongDM
  rot(c, t, E.strong, E.aMeta - .15, "StrongDM", 210, 132, LUZ);
  rot(c, t, E.tres, E.quePasar - .28, "3 personas", 338, 100, LUZ, true);
  rot(c, t, E.quePasar, E.aMeta - .15, "qué debe pasar", 338, 104, "#F2DFA8", true);
  // 4. la meta
  rot(c, t, E.tokens, E.aCartel - .05, "en tokens", 1312, 96, LUZ, true);
  rot(c, t, E.ingeniero, E.aCartel - .05, "por ingeniero", 1418, 96, LUZ, true);
  // 10. la junta (sobre el cuarto iluminado: tinta)
  rot(c, t, E.magia, E.empresa - .28, "no es magia", 210, 120, TINTA, true);
  rot(c, t, E.empresa, E.humo0 + .2, "es una empresa", 210, 120, TINTA);
  rot(c, t, E.juntas, E.malentendidos - .27, "juntas", 340, 104, ACENTO, true);
  rot(c, t, E.malentendidos, E.repetido - .27, "malentendidos", 340, 104, ACENTO, true);
  rot(c, t, E.repetido, E.humo0 + .2, "trabajo repetido", 340, 104, ACENTO, true);
  // 11. el enjambre
  rot(c, t, E.yegge, E.pregunta + .1, "Steve Yegge", 210, 124, TINTA);
  rot(c, t, E.veinte30, E.dia - .28, "20–30 a la vez", 336, 104, ACENTO, true);
  rot(c, t, E.dia, E.pregunta + .1, "todos los días", 336, 104, ACENTO, true);
  // 12. la pregunta
  rot(c, t, E.pregunta + .3, E.quien - .28, "la pregunta cambió", 236, 112, LUZ, true);
  rot(c, t, E.quien, E.pedir - .1, "¿quién escribe?", 236, 118, LUZ, true);
  if (t > E.tacha && t < E.pedir + .1) {
    const k = ease.outCubic(prog(t, E.tacha, E.tacha + .25)), a = 1 - smooth(prog(t, E.pedir - .1, E.pedir + .1));
    c.save(); c.globalAlpha = a; linea(c, 150, 200, lerp(150, 930, k), 200 + k * 6, 12, "#E06A4E"); c.restore();
  }
  rot(c, t, E.quePedir, E.luces, "qué pedir", 236, 124, LUZ, true);
  rot(c, t, E.comprobar, E.luces, "cómo comprobar", 362, 112, "#E06A4E", true);
  // el final
  const kC = ease.outBack(prog(t, E.criterio, E.criterio + .35), 1.4), aC = smooth(prog(t, E.criterio - .02, E.criterio + .12));
  if (aC > .01) { c.save(); c.translate(540, 262); c.scale(kC, kC); tx(c, "el criterio", 0, 0, { fuente: serif(150, true), color: "#E06A4E", alfa: aC }); c.restore(); }
}

// ---------- el cuadro ----------
type D = { astX: number };
function dibuja(c: CanvasRenderingContext2D, t: number, d: D) {
  FR = Math.floor(t * 10);
  const v = vista(t), sh = sacudida(t);
  const z = v.z * (1 + .012 * vaiven(t, 7.3, .5));
  cielo(c, t, v);
  const ox = 10 * vaiven(t, 8.7) + 5 * vaiven(t, 5.1, 1), oy = 12 * vaiven(t, 10.1, 2);
  c.save();
  c.translate(540 + sh.x, 960 + sh.y); c.rotate(.005 * vaiven(t, 12.7)); c.scale(z, z); c.translate(-v.x - ox / z, -v.y - oy / z);
  // suelo
  c.fillStyle = SUELO; c.fillRect(-2000, 0, 4000, 2600); linea(c, -2000, 0, 2000, 0, 2.5, MURO_O);
  for (let i = 0; i < 26; i++) { const x = -900 + hash(i) * 1800, y = 30 + hash(i + 50) * 500; linea(c, x, y, x - 22, y + 14, 2, "rgba(120,126,138,.12)"); }
  fabrica(c, t, z);
  farolYCartel(c, t, d, z);
  c.restore();
  const enCuarto = t > E.aJunta + 1.1 && t < E.pregunta + .4;
  const enPapel = t > E.ahora + .9 && t < E.aJunta + .3;
  polvo(c, t, enCuarto || enPapel ? TINTA : LUZ, enCuarto || enPapel ? 1 : .8);
  rayas(c, t, !(enCuarto || enPapel));
  rotulos(c, t);
  void NOCHE; void bola; void brazo; void mono;
}

function preparar(): D {
  const cv = document.createElement("canvas").getContext("2d")!;
  cv.font = serif(222);
  const w = cv.measureText("programar").width;
  return { astX: 500 + w / 2 + 40 };
}
export const Pieza: React.FC = () => <Lienzo dibuja={(c, t, d) => dibuja(c, t, d)} preparar={preparar} fondo={NOCHE} />;
