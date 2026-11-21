// Serie 2, capítulo 26: la oficina. Un escritorio de papel donde tu puesto es un rompecabezas de seis piezas
// (bocetos, subtítulos, tablas, correo, juntas, decidir). La bola con manos cae encima y lo alcanza.
// Remote Labor Index: un mostrador; los proyectos llegan como sobres, la bola los entrega y un cliente de papel
// los sella. En la pared se desenrolla un gráfico con las cifras del leaderboard oficial, y en el MISMO gráfico se
// leen las dos cosas: 78.75% rechazado (escala 0-100) y ×8.5 (la escala se acerca y ocho bloques y medio de 2.5 se
// apilan junto al 21.25). OSWorld: una computadora de papel; la barra de los agentes empieza en 12, la de una
// persona marca 72 y la de los agentes la cruza como flecha abierta («más de 72%», OSWorld-Verified), sin inventar
// una cifra. La bola maneja las ventanas sin un error, pero el trabajo que entrega sale con el sello RECHAZADO.
// El giro: la bola no puede cargar el rompecabezas entero, pero se sueltan piezas de muchos escritorios. Cierra con
// las cuatro esclusas del a21 en escalera: las piezas que pasan se van flotando; la persona mira los huecos y pone
// las manos sobre lo que le queda. Todos los instantes vienen de eventos.json (partitura.py).
import React from "react";
import { azar, caida, Cam, camara, clamp, ease, guionCamara, lerp, prog, resorte, smooth, texto, Vista } from "../../kit";
import { ACENTO, bola, GRIS, Lienzo, mono, PAPEL, serif, sombra, TINTA } from "../../marca";
import { agente } from "../../personaje";
import duracion from "./duracion.json";
import ev from "./eventos.json";

export const DURACION = duracion.dur;
type C = CanvasRenderingContext2D;
type P3 = [number, number, number];
type V2 = [number, number];
type Pt = { x: number; y: number; s: number; zc: number };
type Carrera = { pieza: number; t0: number; llega: number; puertas: number[] };
const CAR = ev.carrera as Carrera[];

// ---------- herramientas ----------
let K: Cam;
let FR = 0, DV = 6;
const P = (v: P3): Pt | null => K.p(v[0], v[1], v[2]);
const frac = (x: number) => x - Math.floor(x);
const tiembla = (j: number) => frac(Math.sin(j * 12.9898 + FR * 78.233) * 43758.5453) - .5;
const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * 6.2832 + f);
const ventana = (t: number, a: number, b: number, fi = .25, fo = .3) => smooth(prog(t, a, a + fi)) * (1 - smooth(prog(t, b, b + fo)));
const L3 = (a: P3, b: P3, k: number): P3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const suma3 = (a: P3, b: P3, k = 1): P3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const neg3 = (a: P3): P3 => [-a[0], -a[1], -a[2]];
const niebla = (p: Pt | null) => (p ? 1 - smooth(prog(p.zc, DV * 2.2, DV * 3.6)) : 0);
function tramos(t: number, v0: number, S: [number, number, number, ((x: number) => number)?][]) {
  let v = v0;
  for (const [a, b, x, f] of S) { if (t <= a) break; v = lerp(v, x, (f ?? ease.inOutCubic)(prog(t, a, b))); }
  return v;
}
function linea(c: C, ax: number, ay: number, bx: number, by: number) { c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); }
function circulo(c: C, x: number, y: number, r: number) { c.beginPath(); c.arc(x, y, Math.max(r, .01), 0, 6.2832); c.fill(); }
function poli(c: C, Q: P3[], fill: string | null, tinta: string | null = TINTA, g = 2.4, vib = .8) {
  const pts: Pt[] = [];
  for (const q of Q) { const p = P(q); if (!p) return; pts.push(p); }
  c.beginPath();
  pts.forEach((p, i) => {
    const j = Q[i][0] * 3.1 + Q[i][1] * 5.7 + Q[i][2] * 2.3;
    const x = p.x + tiembla(j) * vib, y = p.y + tiembla(j + 40) * vib;
    if (i) c.lineTo(x, y); else c.moveTo(x, y);
  });
  c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (tinta) { c.strokeStyle = tinta; c.lineWidth = g; c.lineJoin = "round"; c.stroke(); }
}
function lin(c: C, a: P3, b: P3, g: number, color = TINTA, vib = .8) {
  const A = P(a), B = P(b); if (!A || !B) return;
  const j = a[0] * 2.1 + a[1] * 4.3 + b[2] * 1.7;
  c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round"; c.beginPath();
  c.moveTo(A.x + tiembla(j) * vib, A.y + tiembla(j + 9) * vib); c.lineTo(B.x + tiembla(j + 3) * vib, B.y + tiembla(j + 13) * vib); c.stroke();
}
/** Dibuja en unidades locales (100 = 1 unidad de mundo) sobre un plano: o es el origen, ux y vy los ejes. */
function plano(c: C, o: P3, ux: P3, vy: P3, f: () => void) {
  const a = P(o), b = P(suma3(o, ux)), d = P(suma3(o, vy));
  if (!a || !b || !d) return;
  c.save(); c.transform((b.x - a.x) / 100, (b.y - a.y) / 100, (d.x - a.x) / 100, (d.y - a.y) / 100, a.x, a.y); f(); c.restore();
}
/** Recorte siempre de frente a la cámara, en unidades locales (100 = 1 unidad). */
function at(c: C, w: P3, f: (p: Pt) => void, giro = 0, k = 1) {
  const p = P(w); if (!p) return;
  c.save(); c.translate(p.x, p.y); c.rotate(giro); const e = p.s / 100 * k; c.scale(e, e); f(p); c.restore();
}
function ajusta(c: C, s2: string, px: number, max: number, it = false) { c.font = serif(px, it); const w = c.measureText(s2).width; return w > max ? px * max / w : px; }
function titulo(c: C, t: number, a: number, b: number, s2: string, y: number, px: number, color = TINTA, it = false) {
  const al = smooth(prog(t, a - .04, a + .16)) * (1 - smooth(prog(t, b, b + .22)));
  if (al <= 0) return;
  texto(c, s2, 530, y + (1 - ease.outCubic(prog(t, a - .04, a + .32))) * 18, { fuente: serif(ajusta(c, s2, px, 860, it), it), color, alfa: al });
}
/** Caja de papel alineada a los ejes: solo las caras que mira la cámara. */
type Tonos = { frente: string; lado: string; tapa: string };
const TON: Tonos = { frente: "#E7E1D3", lado: "#D8D1C1", tapa: "#F2EEE5" };
function caja(c: C, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, col: Tonos = TON, g = 2.2) {
  const pos = K.pos;
  if (z1 - z0 < .004) return;
  if (pos[1] < y0) poli(c, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], col.frente, TINTA, g);
  if (pos[1] > y1) poli(c, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], col.frente, TINTA, g);
  if (pos[0] < x0) poli(c, [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]], col.lado, TINTA, g);
  if (pos[0] > x1) poli(c, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], col.lado, TINTA, g);
  if (pos[2] > z1) poli(c, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], col.tapa, TINTA, g);
}
/** Lo que se desvanece se dibuja aparte y se compone de una vez. */
let CAPA: HTMLCanvasElement | null = null;
function capa(c: C, al: number, f: (g: C) => void) {
  if (al > .985) { f(c); return; }
  if (al < .01) return;
  if (!CAPA) { CAPA = document.createElement("canvas"); CAPA.width = 1080; CAPA.height = 1920; }
  const g = CAPA.getContext("2d")!;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.clearRect(0, 0, 1080, 1920);
  f(g);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = al; c.drawImage(CAPA, 0, 0); c.restore();
}

// ---------- colores ----------
const VERDE = "#4E7D57", VERDE_C = "#8DB892", BLANCO = "#FBFAF6", PIEL = "#EFE4D4", HUECO = "#D2C8B3";

// ---------- el mundo (x a la derecha, y hacia el fondo, z hacia arriba) ----------
const ZD = .8, RB = .3;
const X1 = 12, X2 = -12;                                     // mostrador del RLI y computadora de OSWorld
// El rompecabezas: 3 columnas; fila cercana (0,1,2) y fila del fondo (3,4,5).
const PW = .84, PH = .66;
const PC: P3 = [-.28, .1, ZD];
const XS = [0, 1, 2, 3].map((k) => (k - 1.5) * PW);
const SH = [-1, 1, -1];                                      // lengüetas del borde horizontal (y = 0)
const SV = [[1, -1], [-1, 1]];                               // [fila cerca / fondo][borde entre columnas]
function bordeK(A: V2, B: V2, sg: number): V2[] {
  if (!sg) return [A];
  const L = Math.hypot(B[0] - A[0], B[1] - A[1]), ux = (B[0] - A[0]) / L, uy = (B[1] - A[1]) / L, nx = -uy * sg, ny = ux * sg;
  const Q = (s2: number, h: number): V2 => [A[0] + ux * s2 + nx * h, A[1] + uy * s2 + ny * h];
  const out: V2[] = [A, Q(L * .38, 0)];
  const sc = L * .5, hc = .095, R = .088;
  for (let i = 0; i <= 18; i++) { const th = (235 - 290 * i / 18) * Math.PI / 180; out.push(Q(sc + R * Math.cos(th), hc + R * Math.sin(th))); }
  out.push(Q(L * .62, 0));
  return out;
}
function borde(A: V2, B: V2, sg: number, rev: boolean): V2[] {
  const pts = [...bordeK(A, B, sg), B];
  if (rev) pts.reverse();
  pts.pop();
  return pts;
}
const CENTRO: V2[] = [0, 1, 2, 3, 4, 5].map((k) => [(XS[k % 3] + XS[k % 3 + 1]) / 2, k < 3 ? -PH / 2 : PH / 2]);
const FORMA: V2[][] = [0, 1, 2, 3, 4, 5].map((k) => {
  const c0 = k % 3, cerca = k < 3, xl = XS[c0], xr = XS[c0 + 1], yb = cerca ? -PH : 0, yt = cerca ? 0 : PH, fila = cerca ? 0 : 1;
  const pts: V2[] = [
    ...(cerca ? borde([xl, yb], [xr, yb], 0, false) : borde([xl, 0], [xr, 0], SH[c0], false)),
    ...(c0 < 2 ? borde([xr, yb], [xr, yt], SV[fila][c0], false) : borde([xr, yb], [xr, yt], 0, false)),
    ...(cerca ? borde([xl, 0], [xr, 0], SH[c0], true) : borde([xr, yt], [xl, yt], 0, false)),
    ...(c0 > 0 ? borde([xl, yb], [xl, yt], SV[fila][c0 - 1], true) : borde([xl, yt], [xl, yb], 0, false)),
  ];
  return pts.map(([x, y]) => [x - CENTRO[k][0], y - CENTRO[k][1]] as V2);
});
const slot = (k: number, base: P3 = PC): P3 => [base[0] + CENTRO[k][0], base[1] + CENTRO[k][1], base[2]];

// La escalera de esclusas, detrás del escritorio, a la derecha.
const GX = .78;
const GY = (i: number) => 1.85 + .9 * i;
const GZ = (i: number) => ZD + .06 + .44 * i;
const GC = (i: number): P3 => [GX, GY(i), GZ(i) + .5];
const EV = .8;                                              // las piezas viajan un poco más chicas: caben por la compuerta

// ---------- cámara ----------
const V = (tx: number, ty: number, tz: number, yaw: number, pitch: number, dist: number): Vista => ({ tx, ty, tz, yaw, pitch, dist });
const VD0 = V(.22, .2, 1.18, 0, .6, 4.2);
const CLAVES: { t: number; v: Vista; dur?: number; curva?: (x: number) => number }[] = [
  { t: 0, v: V(.1, .0, 1.0, .05, .76, 3.3) },
  { t: .02, v: VD0, dur: 2.6, curva: ease.outCubic },
  { t: ev.examen - .25, v: V(X1 + .05, -.05, 1.25, 0, .48, 4.3), dur: .95, curva: ease.outExpo },
  { t: ev.toma - .3, v: V(X1 - .75, -.15, 1.0, .03, .62, 3.4), dur: 1.2 },
  { t: ev.pregunta - .1, v: V(X1 + .1, .05, 1.3, 0, .45, 4.2), dur: 1.1 },
  { t: ev.pagaria - .2, v: V(X1 + .5, .3, 1.4, -.05, .38, 3.5), dur: 1.3 },
  { t: ev.salio - .25, v: V(X1 + .05, .6, 3.15, 0, .1, 5.3), dur: 1.4 },
  { t: ev.lecturas - .15, v: V(X1, 2.0, 4.3, 0, .02, 4.15), dur: 1.3 },
  { t: ev.dos - .1, v: V(X1 - .05, 2.0, 4.2, 0, .02, 4.0), dur: 1.2 },
  { t: ev.os - .3, v: V(X2 - .3, -.1, 1.5, 0, .3, 4.1), dur: 1.05, curva: ease.outExpo },
  { t: ev.agentes - .35, v: V(X2, 1.4, 4.05, 0, .05, 5.2), dur: 1.2 },
  { t: ev.usar2 - .35, v: V(X2 - .3, .1, 1.55, .03, .22, 3.7), dur: 1.0 },
  { t: ev.terminar - .2, v: V(X2 - .3, -.15, 1.45, 0, .25, 4.0), dur: 1.0 },
  { t: ev.hoy - .3, v: V(.22, .05, 1.15, 0, .58, 4.1), dur: 1.05, curva: ease.outExpo },
  { t: ev.muchos - .55, v: V(0, 5.5, 0, 0, 1.0, 17.5), dur: 1.4 },
  { t: ev.quieres - .05, v: V(.12, .45, 1.35, 0, .48, 4.4), dur: 1.25 },
  { t: ev.preg - .2, v: V(.75, 2.2, 1.62, .5, .3, 6.0), dur: 1.3 },
  { t: ev.corre - .5, v: V(.75, 2.75, 2.05, .46, .26, 4.9), dur: 1.4 },
  { t: ev.esos + .2, v: V(.12, .3, 1.22, .08, .56, 4.0), dur: 2.6, curva: ease.inOutSine },
];
const IMPACTOS: [number, number][] = [[ev.piezas[0] + .02, .25], [ev.bola + .33, .6], [ev.dinero + .35, .5], [ev.sello, 1.0], [ev.completo_e + .05, .8], [ev.sello2, .85]];
function vista(t: number): Vista {
  const v = guionCamara(t, CLAVES);
  let sac = 0;
  for (const [ti, a] of IMPACTOS) if (t >= ti) sac += a * Math.exp(-(t - ti) * 9);
  return { ...v, tx: v.tx + .04 * vaiven(t, 7.3) + sac * .05 * Math.sin(t * 61), tz: v.tz + .035 * vaiven(t, 5.1, 1) + sac * .045 * Math.cos(t * 53),
    yaw: v.yaw + .014 * vaiven(t, 9.1, 2), pitch: v.pitch + .008 * vaiven(t, 6.7), dist: v.dist * (1 + .018 * vaiven(t, 8.3, .5)) };
}

// ---------- el piso y los muros ----------
function piso(c: C) {
  const v = K.v, r = 11;
  c.lineCap = "round";
  for (let gx = Math.round(v.tx) - r; gx <= Math.round(v.tx) + r; gx++) {
    for (let gy = Math.round(v.ty) - 7; gy <= Math.round(v.ty) + 16; gy++) {
      const p = P([gx, gy, 0]); if (!p || p.x < -40 || p.x > 1120 || p.y < -40 || p.y > 1960) continue;
      const a = niebla(p) * .16; if (a < .02) continue;
      const d = Math.max(2, p.s * .045);
      c.globalAlpha = a; c.strokeStyle = TINTA; c.lineWidth = 1.4;
      linea(c, p.x - d, p.y, p.x + d, p.y); linea(c, p.x, p.y - d * .55, p.x, p.y + d * .55);
    }
  }
  c.globalAlpha = 1;
}
function muro(c: C, x0: number, x1: number, y: number, h: number) {
  if (K.pos[1] > y) return;
  poli(c, [[x0, y, 0], [x1, y, 0], [x1, y, h], [x0, y, h]], "#F0EDE5", "rgba(17,17,17,.4)", 2);
  lin(c, [x0, y - .01, .14], [x1, y - .01, .14], 2, "rgba(17,17,17,.5)");
  lin(c, [x0, y, .0], [x1, y, 0], 2.6);
}

// ---------- gente de papel ----------
type Gente = { cliente?: boolean; mira?: V2; ceja?: number; boca?: number; ladea?: number; hz?: number; alfa?: number; inclina?: number };
/** El cuerpo: torso y cabeza, de frente a la cámara. A es la base del torso. Devuelve los hombros en pantalla. */
function genteCuerpo(c: C, A: P3, o: Gente): [V2, V2] | null {
  const p = P(A); if (!p) return null;
  const e = p.s / 100, hz = o.hz ?? 1;
  const inc = o.inclina ?? 0;
  c.save(); c.translate(p.x, p.y); c.scale(e, e * hz); c.rotate(inc);
  // torso
  c.fillStyle = o.cliente ? "#3A3936" : "#D9CEBA"; c.strokeStyle = TINTA; c.lineWidth = 3.2; c.lineJoin = "round";
  c.beginPath(); c.moveTo(-64, 0); c.lineTo(-58, -64); c.quadraticCurveTo(-55, -94, -26, -98); c.lineTo(26, -98); c.quadraticCurveTo(55, -94, 58, -64); c.lineTo(64, 0); c.closePath(); c.fill(); c.stroke();
  if (o.cliente) {
    c.fillStyle = BLANCO; c.beginPath(); c.moveTo(-18, -98); c.lineTo(0, -50); c.lineTo(18, -98); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = TINTA; c.beginPath(); c.moveTo(-5, -92); c.lineTo(5, -92); c.lineTo(8, -60); c.lineTo(0, -50); c.lineTo(-8, -60); c.closePath(); c.fill();
  } else {
    c.strokeStyle = "rgba(17,17,17,.45)"; c.lineWidth = 2.4;
    c.beginPath(); c.moveTo(-20, -98); c.quadraticCurveTo(0, -80, 20, -98); c.stroke();
    for (let k = 0; k < 3; k++) linea(c, -54 + k * 4, -40 + k * 12, -40 + k * 4, -40 + k * 12);
  }
  // cuello y cabeza
  c.fillStyle = PIEL; c.strokeStyle = TINTA; c.lineWidth = 3;
  c.fillRect(-10, -112, 20, 18); linea(c, -10, -112, -10, -97); linea(c, 10, -112, 10, -97);
  c.save(); c.translate(0, -142); c.rotate(o.ladea ?? 0);
  for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx * 34, 4, 7, 10, 0, 0, 6.2832); c.fill(); c.stroke(); }
  c.beginPath(); c.arc(0, 0, 34, 0, 6.2832); c.fill(); c.stroke();
  c.fillStyle = TINTA;
  if (o.cliente) {
    c.beginPath(); c.arc(0, 0, 36, Math.PI * 1.02, Math.PI * 1.98); c.lineTo(32, -10); c.quadraticCurveTo(4, -6, -10, -24); c.quadraticCurveTo(-22, -10, -36, -2); c.closePath(); c.fill();
  } else {
    c.beginPath(); c.arc(0, -2, 37, Math.PI * 1.05, Math.PI * 1.95);
    const pts: V2[] = [[33, -12], [24, -22], [18, -12], [8, -24], [0, -14], [-10, -25], [-16, -13], [-26, -22], [-34, -10]];
    for (const [x, y] of pts) c.lineTo(x, y);
    c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-6, -38); c.quadraticCurveTo(4, -50, 14, -44); c.lineTo(6, -36); c.closePath(); c.fill();
  }
  // ojos que miran
  const [mx, my] = o.mira ?? [0, 0];
  for (const sx of [-1, 1]) {
    c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 2; c.beginPath(); c.ellipse(sx * 12, -1, 6.5, 7.5, 0, 0, 6.2832); c.fill(); c.stroke();
    c.fillStyle = TINTA; circulo(c, sx * 12 + mx * 2.8, -1 + my * 3.2, 3.4);
  }
  const ce = o.ceja ?? 0, sube = 3 * Math.max(ce, 0), pena = 5 * Math.max(-ce, 0);
  c.strokeStyle = TINTA; c.lineWidth = 2.8; c.lineCap = "round";
  for (const sx of [-1, 1]) linea(c, sx * 5, -13 - sube - pena, sx * 18, -12 - sube + pena * .4);
  if (o.cliente) {
    c.lineWidth = 2; c.strokeStyle = TINTA; c.beginPath(); c.arc(-12, -1, 10, 0, 6.2832); c.stroke(); c.beginPath(); c.arc(12, -1, 10, 0, 6.2832); c.stroke(); linea(c, -2, -2, 2, -2);
  }
  c.lineWidth = 2.4; c.beginPath(); c.arc(0, 8, 3.5, Math.PI * .2, Math.PI * .8); c.stroke();
  const b = o.boca ?? 0;
  c.lineWidth = 2.8; c.beginPath(); c.moveTo(-9, 18); c.quadraticCurveTo(0, 18 + b * 7, 9, 18); c.stroke();
  c.restore();
  c.restore();
  const R = (x: number, y: number): V2 => [p.x + (x * Math.cos(inc) - y * hz * Math.sin(inc)) * e, p.y + (x * Math.sin(inc) + y * hz * Math.cos(inc)) * e];
  return [R(-50, -84), R(50, -84)];
}
/** Brazo de manga y mano de papel, del hombro (pantalla) a un punto del mundo. */
function genteBrazo(c: C, h: V2, m: P3, s: number, cliente = false, abre = .5, dobla = 1) {
  const q = P(m); if (!q) return;
  const e = s / 100, w = 22 * e;
  const mx = (h[0] + q.x) / 2, my = (h[1] + q.y) / 2, dx = q.x - h[0], dy = q.y - h[1], d = Math.hypot(dx, dy) || 1;
  const cx = mx - dy / d * 26 * e * dobla, cy = my + dx / d * 26 * e * dobla;
  c.lineCap = "round";
  c.strokeStyle = TINTA; c.lineWidth = w + 5; c.beginPath(); c.moveTo(h[0], h[1]); c.quadraticCurveTo(cx, cy, q.x, q.y); c.stroke();
  c.strokeStyle = cliente ? "#3A3936" : "#D9CEBA"; c.lineWidth = w; c.beginPath(); c.moveTo(h[0], h[1]); c.quadraticCurveTo(cx, cy, q.x, q.y); c.stroke();
  mano(c, q.x, q.y, Math.atan2(q.y - cy, q.x - cx), e, abre);
}
function mano(c: C, x: number, y: number, ang: number, e: number, abre = .5) {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(e, e);
  c.fillStyle = PIEL; c.strokeStyle = TINTA; c.lineWidth = 2.6;
  c.beginPath(); c.ellipse(8, 0, 15, 12, 0, 0, 6.2832); c.fill(); c.stroke();
  c.save(); c.translate(4, -9); c.rotate(-.6 - abre * .5); c.beginPath(); c.ellipse(6, 0, 8, 5, 0, 0, 6.2832); c.fill(); c.stroke(); c.restore();
  c.restore();
}

// ---------- el agente en el mundo ----------
type Bola = { x: number; y: number; z: number; alt?: number; m1: P3; m2: P3; abre?: [number, number]; aplasta?: number };
function bolaW(c: C, b: Bola) {
  const base = P([b.x, b.y, b.z]), cen = P([b.x, b.y, b.z + RB + (b.alt ?? 0)]);
  if (!base || !cen) return;
  const alt = b.alt ?? 0;
  sombra(c, base.x, base.y, RB * base.s * 1.5 / (1 + alt * 1.2), .38 / (1 + alt * 2.2));
  const q1 = P(b.m1), q2 = P(b.m2); if (!q1 || !q2) return;
  const r = RB * cen.s, ap = b.aplasta ?? 0;
  c.save(); c.translate(cen.x, cen.y + r * ap * .3); c.scale(1 + ap * .18, 1 - ap * .18); c.translate(-cen.x, -cen.y);
  agente(c, cen.x, cen.y, r, [q1.x, q1.y], [q2.x, q2.y], { abre1: b.abre?.[0] ?? .6, abre2: b.abre?.[1] ?? .6 });
  c.restore();
}
/** Altura de un salto de entrada: cae desde h y rebota. */
function entra(t: number, ti: number, h = 1.6) {
  if (t < ti) return h + 3;
  return caida(t - ti, h, .4, 30).z;
}

// ---------- los íconos de las piezas (unidades locales, centro en 0,0) ----------
function icono(c: C, k: number) {
  c.strokeStyle = TINTA; c.fillStyle = TINTA; c.lineWidth = 3; c.lineCap = "round"; c.lineJoin = "round";
  if (k === 0) {                                     // bocetos: tres miniaturas y un lápiz
    for (let i = 0; i < 3; i++) { c.strokeRect(-30 + i * 19, -10, 15, 20); c.beginPath(); c.arc(-22.5 + i * 19, -1, 4 + (i % 2) * 2, 0, 6.2832); c.stroke(); }
    c.save(); c.translate(14, -16); c.rotate(.8); c.fillStyle = "#E3C48E"; c.fillRect(-4, -18, 8, 26); c.strokeRect(-4, -18, 8, 26); c.fillStyle = TINTA; c.beginPath(); c.moveTo(-4, 8); c.lineTo(0, 15); c.lineTo(4, 8); c.closePath(); c.fill(); c.restore();
  } else if (k === 1) {                              // subtítulos: un cuadro de película con su renglón
    c.strokeRect(-28, -19, 56, 38);
    for (let i = 0; i < 6; i++) { c.fillRect(-25 + i * 10, -17, 5, 4); c.fillRect(-25 + i * 10, 13, 5, 4); }
    c.beginPath(); c.moveTo(-6, -9); c.lineTo(-6, 3); c.lineTo(5, -3); c.closePath(); c.fill();
    c.lineWidth = 3.4; linea(c, -16, 8, 16, 8);
  } else if (k === 2) {                              // tablas
    c.lineWidth = 2.4; c.strokeRect(-28, -19, 56, 38); c.fillRect(-28, -19, 56, 9);
    for (let i = 1; i < 3; i++) linea(c, -28 + i * 18.7, -10, -28 + i * 18.7, 19);
    for (let j = 1; j < 3; j++) linea(c, -28, -10 + j * 9.7, 28, -10 + j * 9.7);
  } else if (k === 3) {                              // correo que se va
    c.fillStyle = BLANCO; c.beginPath(); c.rect(-26, -16, 44, 32); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-26, -16); c.lineTo(-4, 4); c.lineTo(18, -16); c.stroke();
    c.lineWidth = 3.4; linea(c, 20, 12, 32, 0); linea(c, 32, 0, 24, 0); linea(c, 32, 0, 32, 8);
  } else if (k === 4) {                              // juntas: una mesa con tres cabezas
    c.fillStyle = BLANCO; c.beginPath(); c.ellipse(0, 6, 22, 9, 0, 0, 6.2832); c.fill(); c.stroke();
    c.fillStyle = TINTA; circulo(c, -24, -8, 6.5); circulo(c, 0, -16, 6.5); circulo(c, 24, -8, 6.5);
  } else {                                           // decidir: una firma
    c.lineWidth = 2.6; linea(c, -28, 12, 26, 12);
    c.lineWidth = 3; c.beginPath(); c.moveTo(-24, 6); c.bezierCurveTo(-18, -18, -10, 14, -4, -4); c.bezierCurveTo(0, -14, 6, 10, 12, -2); c.quadraticCurveTo(18, -8, 22, 2); c.stroke();
    c.save(); c.translate(20, -10); c.rotate(.7); c.fillRect(-3, -16, 6, 16); c.beginPath(); c.moveTo(-3, 0); c.lineTo(0, 7); c.lineTo(3, 0); c.closePath(); c.fill(); c.restore();
  }
}

// ---------- piezas, huecos y escritorios ----------
type Ori = { C: P3; U: P3; V: P3 };
const PLANO: Ori = { C: [0, 0, 0], U: [1, 0, 0], V: [0, 1, 0] };
/** Orientación de una pieza: inclinación a (0 plana, π/2 de pie mirando a la cámara) y giro g en su plano. */
function orienta(Cc: P3, a: number, g = 0, rol = 0): Ori {
  const X: P3 = [Math.cos(rol), 0, Math.sin(rol)], V0: P3 = [0, Math.cos(a), Math.sin(a)];
  const U: P3 = [X[0] * Math.cos(g) + V0[0] * Math.sin(g), X[1] * Math.cos(g) + V0[1] * Math.sin(g), X[2] * Math.cos(g) + V0[2] * Math.sin(g)];
  const Vv: P3 = [-X[0] * Math.sin(g) + V0[0] * Math.cos(g), -X[1] * Math.sin(g) + V0[1] * Math.cos(g), -X[2] * Math.sin(g) + V0[2] * Math.cos(g)];
  return { C: Cc, U, V: Vv };
}
const enPlano = (o: Ori, u: number, v: number, dz = 0): P3 => [o.C[0] + o.U[0] * u + o.V[0] * v, o.C[1] + o.U[1] * u + o.V[1] * v, o.C[2] + o.U[2] * u + o.V[2] * v + dz];
function pieza(c: C, k: number, o: Ori, opc: { icono?: boolean; piso?: number; esc?: number; rojo?: number } = {}) {
  const e = opc.esc ?? 1, F = FORMA[k];
  // sombra sobre la mesa cuando se levanta
  if (opc.piso !== undefined) {
    const h = o.C[2] - opc.piso;
    if (h > .02 && h < 2.5) {
      c.save(); c.globalAlpha *= .22 / (1 + h * 2.5);
      poli(c, F.map(([u, v]) => [o.C[0] + u * e + h * .25, o.C[1] + v * e - h * .1, opc.piso! + .003] as P3), "#14120E", null);
      c.restore();
    }
  }
  // canto del cartón y cara
  poli(c, F.map(([u, v]) => enPlano(o, u * e, v * e, -.025)), "#CBC2AF", TINTA, 1.6, .4);
  poli(c, F.map(([u, v]) => enPlano(o, u * e, v * e)), BLANCO, (opc.rojo ?? 0) > .5 ? ACENTO : TINTA, (opc.rojo ?? 0) > .5 ? 3.6 : 2.6, .7);
  if (opc.icono !== false) plano(c, enPlano(o, 0, 0, .001), [o.U[0] * e, o.U[1] * e, o.U[2] * e], neg3([o.V[0] * e, o.V[1] * e, o.V[2] * e]), () => icono(c, k));
}
function hueco(c: C, k: number, base: P3) {
  const s0 = slot(k, base);
  poli(c, FORMA[k].map(([u, v]) => [s0[0] + u, s0[1] + v, s0[2] + .002] as P3), HUECO, null);
  const pts = FORMA[k].map(([u, v]) => P([s0[0] + u, s0[1] + v, s0[2] + .003])).filter(Boolean) as Pt[];
  c.save(); c.setLineDash([9, 8]); c.strokeStyle = "rgba(17,17,17,.75)"; c.lineWidth = 2.6; c.beginPath();
  pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.stroke(); c.restore();
}
function escritorio(c: C, x: number, y: number, w: number, d: number, hz = 1) {
  const z = ZD * hz;
  poli(c, [[x - w / 2 + .05, y - d / 2 - .1, 0], [x + w / 2 + .22, y - d / 2 - .1, 0], [x + w / 2 + .3, y + d / 2 + .12, 0], [x - w / 2 + .1, y + d / 2 + .12, 0]], "rgba(20,18,14,.07)", null);
  caja(c, x - w / 2 + .07, x + w / 2 - .07, y - d / 2 + .07, y + d / 2 - .07, 0, z - .08, { frente: "#E4DDCE", lado: "#D3CBBA", tapa: "#EEE9DE" });
  if (K.pos[1] < y - d / 2) lin(c, [x - w / 2 + .07, y - d / 2 + .065, .12 * hz], [x + w / 2 - .07, y - d / 2 + .065, .12 * hz], 1.8, "rgba(17,17,17,.45)");
  caja(c, x - w / 2, x + w / 2, y - d / 2, y + d / 2, z - .08, z, { frente: "#EAE4D7", lado: "#DAD3C3", tapa: "#F1EDE3" });
}

// ---------- tu escritorio ----------
const D0 = { w: 3.6, d: 2.3 };
const PERS: P3 = [-.62, 1.5, ZD - .62];
function suelta(k: number, t: number) {
  const ini = k === 2 ? ev.pedazos - .05 : ev.pedazos2 + k * .06;
  return ease.outBack(prog(t, ini, ini + .35), 1.6);
}
function carreraDe(k: number) { return CAR.find((r) => r.pieza === k)!; }
/** Dónde está cada pieza de tu rompecabezas: cae al inicio, tiembla cuando la bola quiere cargarlas, se suelta y
 *  corre por las esclusas. `vuela` dice si ya dejó su lugar (entonces se dibuja aparte, ordenada por profundidad). */
function piezaD0(k: number, t: number): { o: Ori; vuela: boolean; alfa: number; pasa: boolean; esc?: number } {
  const s0 = slot(k);
  const L = ev.piezas[k];
  const sd = k % 2 ? 1 : -1;
  // 1. cae y encaja
  if (t < L) {
    const u = prog(t, L - .48, L);
    return { o: orienta([s0[0] + sd * .2 * (1 - u), s0[1] - .3 * (1 - u), s0[2] + 1.7 * (1 - u * u)], (1 - u) * .7, sd * (1 - u) * .8), vuela: false, alfa: u > 0 ? 1 : 0, pasa: false };
  }
  let z = s0[2] + .07 * Math.abs(Math.sin((t - L) * 13)) * Math.exp(-(t - L) * 10);
  // 2. la bola intenta levantar todo el puesto: la orilla derecha sube y tiembla, y se le cae
  const fuerza = ventana(t, ev.noreemp + .2, ev.completo_e - .05, .5, .12);
  const lado = (s0[0] - (PC[0] - 1.5 * PW)) / (3 * PW);
  z += fuerza * (.05 + .1 * lado) * (1 + .25 * Math.sin(t * 47 + k)) + (t > ev.completo_e ? .05 * Math.abs(Math.sin((t - ev.completo_e) * 16)) * Math.exp(-(t - ev.completo_e) * 8) * lado : 0);
  const rolT = -fuerza * .05;
  // 3. se suelta
  const sl = suelta(k, t);
  const R = carreraDe(k);
  const quieta = t < R.t0 ? 1 : 0;
  const alto = k === 2 ? lerp(.42, .14, smooth(prog(t, ev.pedazos2, ev.pedazos2 + .5))) : .14;
  z += sl * alto * quieta;
  const ondea = sl * quieta * (k === 2 ? lerp(1, .5, smooth(prog(t, ev.pedazos2, ev.pedazos2 + .5))) : .5);
  if (t < R.t0) return { o: orienta([s0[0], s0[1], z], ondea * .1 * Math.sin(t * 3.1 + k), ondea * .08 * Math.sin(t * 2.3 + k * 2), rolT + ondea * .06 * Math.sin(t * 2.7 + k)), vuela: false, alfa: 1, pasa: false };
  // 4. la carrera por las esclusas
  const pu = R.puertas, pasa = R.llega >= 4;
  const E1: P3 = [GX, GY(0) - .85, GZ(0) + .55];
  const A0: P3 = [s0[0], s0[1], s0[2] + .14];
  const ER = .95;                                        // de pie, mirando a la cámara
  if (t < R.t0 + .22) {
    const u = ease.inOutCubic(prog(t, R.t0, R.t0 + .22));
    const p = L3(A0, E1, u); p[2] += Math.sin(u * Math.PI) * .35;
    return { o: orienta(p, u * ER, sd * .3 * Math.sin(u * Math.PI)), vuela: true, alfa: 1, pasa, esc: lerp(1, EV, u) };
  }
  const stop = pasa ? 4 : R.llega;
  const pts: P3[] = [E1, ...[0, 1, 2, 3].map(GC)];
  const tms = [R.t0 + .22, ...pu];
  if (!pasa) {
    // llega hasta la compuerta donde se atora, choca, rebota y cae de regreso a su lugar
    const tChoque = pu[stop] - .04, frente: P3 = [GC(stop)[0], GC(stop)[1] - .42, GC(stop)[2]];
    if (t < tChoque) {
      for (let i = 0; i < stop + 1; i++) {
        const a = tms[i], b = i < stop ? tms[i + 1] : tChoque, A = pts[i], B = i < stop ? pts[i + 1] : frente;
        if (t <= b) { const u = ease.inOutSine(prog(t, a, b)); const p = L3(A, B, u); if (i > 0) p[2] += Math.sin(u * Math.PI) * .26; return { o: orienta(p, ER, .05 * Math.sin(t * 9)), vuela: true, alfa: 1, pasa, esc: EV }; }
      }
    }
    const tRebote = tChoque + .16, tCae = tRebote + .62;
    if (t < tRebote) {
      const u = ease.outCubic(prog(t, tChoque, tRebote));
      return { o: orienta(suma3(frente, [0, -.32 * u, .08 * Math.sin(u * Math.PI)]), ER - .25 * u, .25 * u * sd), vuela: true, alfa: 1, pasa, esc: EV };
    }
    if (t < tCae) {
      const u = prog(t, tRebote, tCae);
      const A = suma3(frente, [0, -.32, 0]);
      const p = L3(A, s0, ease.inOutSine(u)); p[2] = lerp(A[2], s0[2], u * u) + Math.sin(u * Math.PI) * .55;
      return { o: orienta(p, (ER - .25) * (1 - ease.inOutCubic(u)), (.25 * sd + sd * 6.2832) * (1 - ease.inOutCubic(u))), vuela: true, alfa: 1, pasa, esc: lerp(EV, 1, u) };
    }
    const dz = .06 * Math.abs(Math.sin((t - tCae) * 14)) * Math.exp(-(t - tCae) * 9);
    return { o: orienta([s0[0], s0[1], s0[2] + dz], 0, 0), vuela: false, alfa: 1, pasa };
  }
  for (let i = 0; i < 4; i++) {
    if (t <= tms[i + 1]) { const u = ease.inOutSine(prog(t, tms[i], tms[i + 1])); const p = L3(pts[i], pts[i + 1], u); if (i > 0) p[2] += Math.sin(u * Math.PI) * .26; return { o: orienta(p, ER, .05 * Math.sin(t * 9)), vuela: true, alfa: 1, pasa, esc: EV }; }
  }
  // pasó las cuatro: se va flotando
  const d = t - pu[3];
  const p: P3 = [GX + .35 * Math.sin(d * 1.3 + k) * Math.min(d, 1) + d * .12 * sd, GY(3) + .4 + d * .55, GZ(3) + .5 + d * 1.05 + d * d * .12];
  return { o: orienta(p, ER - .35 * smooth(prog(d, 0, 2)), .3 * Math.sin(d * 1.7 + k) + d * .25 * sd, .2 * Math.sin(d * 1.1 + k)), vuela: true, alfa: 1 - smooth(prog(d, 3.2, 4.4)), pasa, esc: EV };
}

function bolaD0(t: number): Bola | null {
  const enD0 = t < ev.examen + .1 || t > ev.hoy - .1;
  if (!enD0) return null;
  const x = 1.12, y = -.84;
  let alt = t < ev.examen ? entra(t, ev.bola, 1.5) : entra(t, ev.hoy + .25, 1.4);
  if (t > ev.examen - .2 && t < ev.examen + .1) alt += ease.inCubic(prog(t, ev.examen - .2, ev.examen + .1)) * 3;
  const b: Bola = { x, y, z: ZD, alt, m1: [x - .5, y + .05, ZD + .75], m2: [x + .52, y - .02, ZD + .72], abre: [.6, .6] };
  const cen: P3 = [x, y, ZD + RB + alt];
  const w = (dx: number, dy: number, dz: number): P3 => [x + dx, y + dy, ZD + RB + alt + dz];
  // en el aire: manos arriba
  const aire = smooth(prog(alt, .05, .4));
  b.m1 = L3(w(-.42, .05, -.05), w(-.55, 0, .55), aire); b.m2 = L3(w(.44, 0, -.08), w(.55, 0, .55), aire);
  // «tu trabajo»: alcanza la orilla del rompecabezas
  const der = PC[0] + 1.5 * PW;
  const alc = ventana(t, ev.agarra - .3, ev.examen - .35, .35, .25);
  if (alc > 0) { b.m1 = L3(b.m1, [der + .02, PC[1] - .22, ZD + .04], alc); b.m2 = L3(b.m2, [der + .05, PC[1] + .42, ZD + .04], alc * .85); b.abre = [.3, .3]; }
  // el puesto completo: lo agarra de la orilla, puja, y se le cae
  const puja = ventana(t, ev.noreemp - .15, ev.completo_e - .05, .3, .1);
  if (puja > 0) {
    const sh = .02 * Math.sin(t * 51);
    b.m1 = L3(b.m1, [der + .02, PC[1] - .5, ZD + .06 + sh], puja); b.m2 = L3(b.m2, [der + .02, PC[1] + .5, ZD + .07 - sh], puja);
    b.aplasta = puja * (.25 + .08 * Math.sin(t * 40)); b.abre = [.2, .2];
  }
  if (t > ev.completo_e - .05 && t < ev.completo_e + .9) {
    const d = t - (ev.completo_e - .05);
    b.alt = (b.alt ?? 0) + Math.max(0, .35 * Math.sin(Math.min(d * 6, Math.PI))) * (d < .55 ? 1 : 0);
    const susto = smooth(prog(d, 0, .15)) * (1 - smooth(prog(d, .55, .9)));
    b.m1 = L3(b.m1, w(-.6, -.05, .45), susto); b.m2 = L3(b.m2, w(.6, -.05, .4), susto); b.abre = [.9, .9];
  }
  // la pieza que se suelta: la señala
  const se = ventana(t, ev.pedazos + .1, ev.quieres, .3, .4);
  if (se > 0) b.m1 = L3(b.m1, suma3(slot(2), [.08, .02, .32 + .03 * Math.sin(t * 3)]), se * .7);
  // la carrera: empuja cada pieza hacia la primera compuerta
  for (const R of CAR) {
    const em = ventana(t, R.t0 - .12, R.t0 + .2, .1, .18);
    if (em > 0) { const s0 = slot(R.pieza); b.m1 = L3(b.m1, [s0[0] + .2, s0[1] - .1, ZD + .25], em * (R.pieza === 2 || R.pieza === 1 ? .9 : .45)); b.abre = [.9, .6]; }
  }
  // «esos ya no son tuyos»: les dice adiós
  const adios = ventana(t, ev.esos - .1, ev.gesto + .3, .3, .5);
  if (adios > 0) { b.m2 = L3(b.m2, w(.42 + .12 * Math.sin(t * 9), .1, .62), adios); b.abre = [b.abre![0], .95]; }
  void cen;
  return b;
}
function personaD0(t: number): Gente & { manos: [P3, P3]; abre: number } {
  const g: Gente & { manos: [P3, P3]; abre: number } = { mira: [0, .5], ceja: 0, boca: 0, manos: [[-1.05, .78, ZD + .02], [.05, .82, ZD + .02]], abre: .5 };
  // la bola cae: se echa para atrás y la mira
  const susto = ventana(t, ev.bola + .3, ev.examen, .2, .6);
  g.ceja = susto * .9; g.mira = [lerp(0, .9, susto), lerp(.5, .6, susto)]; g.inclina = -.05 * susto;
  g.manos = [L3(g.manos[0], [-1.0, .95, ZD + .35], susto * .6), L3(g.manos[1], [.15, .98, ZD + .3], susto * .6)];
  // la bola puja: la mira con duda
  const duda = ventana(t, ev.noreemp, ev.reemplaza, .3, .3);
  if (duda > 0) { g.mira = [.9 * duda, .7]; g.ceja = .7 * duda; g.boca = -.2 * duda; }
  // la pieza suelta
  const ve = ventana(t, ev.pedazos, ev.quieres + .4, .2, .3);
  if (ve > 0) { g.mira = [.65, .55 + ve * .3]; g.ceja = .5 * ve; }
  // «el tuyo»: se señala
  const yo = ventana(t, ev.tuyo - .15, ev.nopreg + .4, .2, .3);
  if (yo > 0) { g.manos[1] = L3(g.manos[1], suma3(PERS, [.12, -.18, .95]), yo); g.mira = [0, 0]; g.ceja = .4 * yo; }
  // las piezas se van: las sigue con los ojos
  if (t > ev.corre - .3 && t < ev.esos + 1.6) {
    g.mira = [lerp(.3, .9, smooth(prog(t, ev.corre, ev.corre + .5))), lerp(.6, -.9, smooth(prog(t, ev.corre, ev.esos)))]; g.ceja = .6; g.boca = -.25;
    const alza = ventana(t, ev.esos - .2, ev.gesto - .1, .5, .4);
    g.manos[1] = L3(g.manos[1], [.7, 1.25, ZD + 1.0], alza * .65); g.abre = .5 + alza * .4;
  }
  // el final: mira los huecos y pone las manos sobre lo que le queda; luego te mira
  if (t > ev.esos + 1.0) {
    const k = smooth(prog(t, ev.esos + 1.0, ev.esos + 1.8));
    g.mira = [lerp(g.mira![0], -.1, k), lerp(g.mira![1], 1, k)]; g.ceja = lerp(.6, -.35, k); g.boca = lerp(-.25, -.15, k);
    const m = ease.inOutCubic(prog(t, ev.gesto, ev.gesto + .9));
    g.manos = [L3(g.manos[0], suma3(slot(3), [.05, .08, .03]), m), L3(g.manos[1], suma3(slot(5), [-.08, .08, .03]), m)];
    g.abre = .5 - m * .3;
    const arriba = smooth(prog(t, ev.gesto + 1.0, ev.gesto + 1.8));
    if (arriba > 0) { g.mira = [lerp(g.mira[0], 0, arriba), lerp(g.mira[1], -.1, arriba)]; g.ceja = lerp(g.ceja ?? 0, .15, arriba); g.boca = lerp(g.boca ?? 0, .3, arriba); g.ladea = .06 * arriba; }
  }
  return g;
}
function mesaTuya(c: C, t: number) {
  escritorio(c, 0, 0, D0.w, D0.d);
}

// ---------- la escalera de las cuatro esclusas ----------
function alzaEsclusa(i: number, t: number) {
  const ini = ev.preg + .1 + i * .16;
  return ease.outBack(prog(t, ini, ini + .5), 1.3) * (1 - ease.inCubic(prog(t, ev.esos + .9 + i * .08, ev.esos + 1.5 + i * .08)));
}
/** Las compuertas se abren (se hunden en su escalón) cuando empieza la carrera; solo se cierran de golpe frente a
 *  una pieza que no pasa esa pregunta, y luego se vuelven a abrir. */
function abierta(i: number, t: number) {
  let a = smooth(prog(t, ev.corre - .45 + i * .06, ev.corre - .15 + i * .06));
  for (const R of CAR) if (R.llega === i) { const p = R.puertas[i]; a = Math.min(a, 1 - ease.outCubic(prog(t, p - .26, p - .1)) * (1 - smooth(prog(t, p + .55, p + .85)))); }
  return a;
}
function lampara(i: number, t: number): [number, string] {
  let best = -1, col = "off";
  for (const R of CAR) {
    if (R.llega < i) continue;
    const p = R.puertas[i] + (R.llega === i ? -.04 : -.05);
    if (t >= p && p > best) { best = p; col = R.llega > i ? "v" : "r"; }
  }
  if (best < 0) return [0, "off"];
  return [Math.exp(-(t - best) * 2.2), col];
}
function escalon(c: C, i: number, t: number) {
  const h = alzaEsclusa(i, t); if (h <= .005) return;
  const y0 = GY(i) - .55, y1 = GY(i) + .35;
  caja(c, GX - .76, GX + .76, y0, y1, 0, GZ(i) * clamp(h, 0, 1.2), { frente: "#E8E2D4", lado: "#D5CDBC", tapa: "#F0ECE2" });
}
function esclusa(c: C, i: number, t: number) {
  const h = alzaEsclusa(i, t); if (h <= .01) return;
  const z0 = GZ(i) * clamp(h, 0, 1.2), y = GY(i), H = 1.02 * h;
  const XP = .6;
  // pilares, viga y compuerta de tablas que sube
  for (const sx of [-1, 1]) caja(c, GX + sx * XP - .07, GX + sx * XP + .07, y - .07, y + .07, z0, z0 + H);
  const zb = z0, zt = z0 + .9 * h * (1 - abierta(i, t));
  if (zt - zb > .01) {
    poli(c, [[GX - XP + .07, y, zb], [GX + XP - .07, y, zb], [GX + XP - .07, y, zt], [GX - XP + .07, y, zt]], "#F1ECE0", TINTA, 2.4);
    for (let k = 1; k < 4; k++) { const z = zt - .225 * h * k; if (z > zb + .02) lin(c, [GX - XP + .1, y - .005, z], [GX + XP - .1, y - .005, z], 1.3, "rgba(17,17,17,.3)"); }
  }
  lin(c, [GX - XP + .07, y - .01, z0 + .004], [GX + XP - .07, y - .01, z0 + .004], 3);
  caja(c, GX - XP - .12, GX + XP + .12, y - .09, y + .09, z0 + H, z0 + H + .12);
  // la seña del a21, de frente
  const sz = z0 + H + .12;
  for (const sx of [-1, 1]) lin(c, [GX + sx * .2, y, sz], [GX + sx * .2, y, sz + .14 * h], 3);
  const lado = .92;
  plano(c, [GX - lado / 2, y - .02, sz + .14 * h + lado * h], [lado, 0, 0], [0, 0, -lado * h], () => {
    c.fillStyle = "rgba(20,18,14,.12)"; c.beginPath(); c.roundRect(6, 8, 100, 100, 10); c.fill();
    c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 4.5; c.beginPath(); c.roundRect(0, 0, 100, 100, 10); c.fill(); c.stroke();
    c.save(); c.translate(50, 51); c.scale(.76, .76); ICONOS[i](c, t); c.restore();
  });
  // lámpara
  const [luz, col] = lampara(i, t);
  const L = P([GX - XP, y - .02, z0 + H + .2]);
  if (L) {
    const r = .085 * L.s * h;
    if (luz > .02 && col !== "off") {
      const g = c.createRadialGradient(L.x, L.y, r * .3, L.x, L.y, r * 3.4);
      g.addColorStop(0, col === "v" ? `rgba(120,190,128,${.6 * luz})` : `rgba(233,110,80,${.65 * luz})`); g.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = g; circulo(c, L.x, L.y, r * 3.4);
    }
    if (luz > .3 && col === "v") { const g2 = c.createRadialGradient(L.x - r * .3, L.y - r * .35, r * .05, L.x, L.y, r); g2.addColorStop(0, "#D6F0D8"); g2.addColorStop(.5, VERDE_C); g2.addColorStop(1, VERDE); c.fillStyle = g2; circulo(c, L.x, L.y, r); }
    else if (luz > .3 && col === "r") bola(c, L.x, L.y, r, ACENTO);
    else { c.fillStyle = "#D3CFC6"; circulo(c, L.x, L.y, r); c.fillStyle = "rgba(255,255,255,.7)"; circulo(c, L.x - r * .3, L.y - r * .35, r * .25); }
    c.strokeStyle = TINTA; c.lineWidth = 2; c.beginPath(); c.arc(L.x, L.y, r, 0, 6.2832); c.stroke();
  }
}
// Las señas del a21 (palomita, flecha de regreso, marco, balanza), en su estado de reposo.
const ICONOS: ((c: C, t: number) => void)[] = [
  (c, t) => {
    c.strokeStyle = TINTA; c.lineWidth = 7; c.lineJoin = "round"; c.strokeRect(-34, -34, 68, 68);
    const [luz, col] = lampara(0, t);
    if (col === "v" && luz > .2) { c.strokeStyle = VERDE; c.lineWidth = 11; c.lineCap = "round"; c.beginPath(); c.moveTo(-22, 0); c.lineTo(-6, 18); c.lineTo(26, -26); c.stroke(); }
  },
  (c, t) => {
    const [luz, col] = lampara(1, t);
    const k = col === "r" ? luz : 0;
    c.strokeStyle = k > .2 ? ACENTO : TINTA; c.lineWidth = 9; c.lineCap = "round";
    c.beginPath(); c.arc(0, 0, 32, -.5, 4.1); c.stroke();
    const a = 4.3, ax = Math.cos(a) * 32, ay = Math.sin(a) * 32, tx = -Math.sin(a), ty = Math.cos(a);
    c.fillStyle = c.strokeStyle; c.beginPath(); c.moveTo(ax - tx * 4 + Math.cos(a) * 15, ay - ty * 4 + Math.sin(a) * 15); c.lineTo(ax - tx * 22, ay - ty * 22); c.lineTo(ax - tx * 4 - Math.cos(a) * 15, ay - ty * 4 - Math.sin(a) * 15); c.closePath(); c.fill();
  },
  (c, t) => {
    const [luz, col] = lampara(2, t);
    c.strokeStyle = col === "r" && luz > .2 ? ACENTO : TINTA; c.lineWidth = 4; c.setLineDash([7, 7]); c.strokeRect(-26, -20, 52, 40); c.setLineDash([]);
    c.lineWidth = 9; c.lineCap = "square";
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { c.beginPath(); c.moveTo(sx * 38, sy * 30 - sy * 16); c.lineTo(sx * 38, sy * 30); c.lineTo(sx * 38 - sx * 16, sy * 30); c.stroke(); }
  },
  (c, t) => {
    const [luz, col] = lampara(3, t);
    const th = col === "r" ? .45 * luz : 0;
    c.strokeStyle = TINTA; c.fillStyle = TINTA; c.lineWidth = 5; c.lineCap = "round";
    linea(c, 0, 38, 0, -22); linea(c, -18, 38, 18, 38);
    c.save(); c.translate(0, -24); c.rotate(th); linea(c, -38, 0, 38, 0);
    for (const sx of [-1, 1]) { c.save(); c.translate(sx * 36, 0); c.rotate(-th); c.lineWidth = 2.5; linea(c, 0, 0, -10, 22); linea(c, 0, 0, 10, 22); c.beginPath(); c.moveTo(-15, 22); c.lineTo(15, 22); c.quadraticCurveTo(0, 34, -15, 22); c.fill(); c.restore(); }
    c.restore(); circulo(c, 0, -24, 5);
  },
];

// ---------- la oficina: muchos puestos ----------
const OFI: { x: number; y: number; suelta: number[]; f: number }[] = (() => {
  const r = azar(26), out: { x: number; y: number; suelta: number[]; f: number }[] = [];
  for (const y of [0, 4.3, 8.6, 12.9]) for (const x of [-4.7, 0, 4.7]) {
    if (x === 0 && y === 0) continue;
    const a = Math.floor(r() * 6); let b = Math.floor(r() * 6); if (b === a) b = (a + 3) % 6;
    out.push({ x, y, suelta: r() < .45 ? [a, b] : [a], f: r() * 6.28 });
  }
  return out;
})();
function alzaOfi(i: number, t: number) {
  const o = OFI[i], d = Math.hypot(o.x, o.y);
  const ini = ev.reemplaza + .1 + d * .045;
  return ease.outBack(prog(t, ini, ini + .45), 1.4) * (1 - ease.inCubic(prog(t, ev.quieres + .25 + d * .02, ev.quieres + .75 + d * .02)));
}
function puestoOfi(c: C, i: number, t: number) {
  const h = alzaOfi(i, t); if (h <= .01) return;
  const o = OFI[i];
  const A: P3 = [o.x - .45, o.y + 1.5, (ZD - .62) * h];
  const sueltaT = ev.muchos - .1 + (Math.hypot(o.x, o.y) * .05);
  const sube = ease.outBack(prog(t, sueltaT, sueltaT + .4), 1.6);
  const hombros = genteCuerpo(c, A, { mira: [.3 * Math.sin(o.f), sube > .3 ? .2 : .6], ceja: sube * .6, hz: clamp(h, .01, 1.2) });
  escritorio(c, o.x, o.y, D0.w, D0.d, clamp(h, 0, 1.2));
  const base: P3 = [o.x + PC[0], o.y + PC[1], ZD * clamp(h, 0, 1.2)];
  for (const k of o.suelta) if (sube > .02) hueco(c, k, base);
  for (let k = 0; k < 6; k++) {
    const s0 = slot(k, base), suel = o.suelta.includes(k);
    const z = s0[2] + (suel ? sube * (.85 + .12 * Math.sin(t * 2.4 + k + o.f)) : 0);
    pieza(c, k, orienta([s0[0], s0[1], z], suel ? sube * .25 * Math.sin(t * 1.9 + k) : 0, suel ? sube * .3 * Math.sin(t * 1.3 + o.f) : 0), { icono: true, piso: suel ? base[2] : undefined, rojo: suel ? sube : 0 });
  }
  if (hombros) {
    const p = P(A); if (p) for (const [n, m] of [[0, [o.x - 1.0, o.y + .78, ZD * h + .02]], [1, [o.x + .05, o.y + .82, ZD * h + .02]]] as [number, P3][]) genteBrazo(c, hombros[n], m, p.s);
  }
}

// ---------- el Remote Labor Index: el mostrador ----------
const MOS = { x0: X1 - 1.85, x1: X1 + 1.85, y0: -.75, y1: .45 };
const BAND: P3 = [X1 - 1.15, -.18, ZD];                    // bandeja de entrada
const ATRIL = { C: [X1 + .32, .05, ZD + .36] as P3, a: 1.0 };
const CLI: P3 = [X1 + 1.18, 1.12, ZD - .62];
const BOLA1 = { x: X1 - .55, y: -.42 };
const BILLETES: P3 = [X1 + 1.3, -.45, ZD];
const PILA: P3 = [X1 - .9, -1.45, 0];
type Sobre = { o: Ori; icono: number; etiqueta?: string; sello?: number; pagado?: boolean; arruga?: number; k?: number };
function sobre(c: C, S: Sobre) {
  if ((S.arruga ?? 0) > .5) {
    at(c, S.o.C, () => {
      const r = azar(Math.floor(S.o.C[0] * 31 + S.o.C[1] * 17)), q = 30 * (S.k ?? 1);
      c.fillStyle = "#F1ECE1"; c.strokeStyle = TINTA; c.lineWidth = 2.6; c.beginPath();
      for (let i = 0; i < 11; i++) { const a = i / 11 * 6.2832, rr = q * (.75 + r() * .35); if (i) c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      c.closePath(); c.fill(); c.stroke();
      c.lineWidth = 1.6; c.strokeStyle = "rgba(17,17,17,.5)"; for (let i = 0; i < 4; i++) linea(c, (r() - .5) * q, (r() - .5) * q, (r() - .5) * q, (r() - .5) * q);
      if (!S.pagado) { c.fillStyle = "rgba(192,68,42,.75)"; c.fillRect(-q * .35, -q * .15, q * .6, q * .25); }
    });
    return;
  }
  const k = S.k ?? 1;
  plano(c, S.o.C, [S.o.U[0] * k, S.o.U[1] * k, S.o.U[2] * k], neg3([S.o.V[0] * k, S.o.V[1] * k, S.o.V[2] * k]), () => {
    c.fillStyle = "rgba(20,18,14,.12)"; c.fillRect(-56, -36, 118, 80);
    c.fillStyle = "#F7F2E7"; c.strokeStyle = TINTA; c.lineWidth = 2.8; c.lineJoin = "round"; c.beginPath(); c.rect(-60, -40, 120, 80); c.fill(); c.stroke();
    c.strokeStyle = "rgba(17,17,17,.45)"; c.lineWidth = 2; c.beginPath(); c.moveTo(-60, -40); c.lineTo(0, -4); c.lineTo(60, -40); c.stroke();
    c.save(); c.translate(0, S.etiqueta ? 2 : 10); c.scale(.62, .62); ICONOS_P[S.icono](c); c.restore();
    if (S.etiqueta) texto(c, S.etiqueta, 0, 32, { fuente: serif(ajusta(c, S.etiqueta, 27, 108, true), true), color: TINTA });
    const se = S.sello ?? 0;
    if (se > 0) {
      const pop = lerp(1.25, 1, ease.outCubic(clamp(se * 2.2))), col = S.pagado ? VERDE : ACENTO, txt = S.pagado ? "PAGADO" : "RECHAZADO";
      c.save(); c.translate(0, 4); c.rotate(-.2); c.scale(pop, pop); c.globalAlpha *= clamp(se * 3);
      c.font = mono(S.pagado ? 18 : 15); const w = c.measureText(txt).width + 18;
      c.strokeStyle = col; c.lineWidth = 3.4; c.strokeRect(-w / 2, -15, w, 30); c.lineWidth = 1.4; c.strokeRect(-w / 2 + 4, -11, w - 8, 22);
      texto(c, txt, 0, 6, { fuente: mono(S.pagado ? 18 : 15), color: col });
      c.restore();
    }
  });
}
// Íconos de los proyectos: diseño, video, análisis de datos.
const ICONOS_P: ((c: C) => void)[] = [
  (c) => { c.strokeStyle = TINTA; c.lineWidth = 3.5; c.lineJoin = "round"; c.beginPath(); c.arc(-14, 2, 14, 0, 6.2832); c.stroke(); c.beginPath(); c.moveTo(4, 16); c.lineTo(18, -12); c.lineTo(32, 16); c.closePath(); c.stroke(); c.fillStyle = ACENTO; circulo(c, -14, 2, 5); },
  (c) => { c.strokeStyle = TINTA; c.lineWidth = 3.5; c.beginPath(); c.roundRect(-30, -18, 60, 36, 6); c.stroke(); c.fillStyle = TINTA; c.beginPath(); c.moveTo(-7, -10); c.lineTo(-7, 10); c.lineTo(11, 0); c.closePath(); c.fill(); },
  (c) => { c.fillStyle = TINTA; c.strokeStyle = TINTA; c.lineWidth = 3; linea(c, -30, 18, 30, 18); [10, 22, 16, 30].forEach((h, i) => c.fillRect(-24 + i * 14, 18 - h, 9, h)); },
];
function bandeja(c: C) {
  const [x, y, z] = BAND;
  caja(c, x - .6, x + .6, y - .42, y + .42, z, z + .12, { frente: "#E2DBCB", lado: "#D3CBBA", tapa: "#EDE8DD" });
}
// Los sobres: siete proyectos sin nombre y los tres que el guion nombra, que caen en la bandeja.
const LLEGAN: { t: number; icono: number; etiqueta?: string }[] = (() => {
  const out: { t: number; icono: number; etiqueta?: string }[] = [];
  for (let i = 0; i < 6; i++) out.push({ t: ev.toma + .1 + i * (ev.sobres[0] - ev.toma - .5) / 6, icono: i % 3 });
  ["diseño", "video", "análisis"].forEach((s2, i) => out.push({ t: ev.sobres[i] - .2, icono: i, etiqueta: s2 }));
  return out;
})();
const ENTREGA = ev.pregunta + .15;                          // la bola toma el de arriba
function sobresBandeja(c: C, t: number) {
  const n = LLEGAN.length;
  LLEGAN.forEach((L, i) => {
    if (t < L.t - .5) return;
    if (i === n - 1 && t > ENTREGA) return;                 // el de «análisis» ya lo lleva la bola
    // en el ciclo de sellos la bandeja se va vaciando
    const sale = i < n - 1 ? CICLO.findIndex((q) => q.de === i) : -1;
    if (sale >= 0 && t > CICLO[sale].t) return;
    const u = prog(t, L.t - .5, L.t);
    const reposo: P3 = [BAND[0] + (i % 3 - 1) * .05, BAND[1] + .28 - i * .045, BAND[2] + .16 + i * .012];
    const C0 = suma3(reposo, [-2.2 * (1 - u), -.5 * (1 - u), .2 * (1 - u) + Math.sin(u * Math.PI) * .7]);
    const z = t > L.t ? .03 * Math.abs(Math.sin((t - L.t) * 14)) * Math.exp(-(t - L.t) * 9) : 0;
    sobre(c, { o: orienta(suma3(C0, [0, 0, z]), lerp(1.15, 1.2, u) + (1 - u) * .6, (1 - u) * (i % 2 ? 1.2 : -1)), icono: L.icono, etiqueta: L.etiqueta, k: .82 });
  });
}
// El ciclo de sellos: de la bandeja al atril, sello, y al montón o a la caja de pagados.
const CICLO: { t: number; de: number; pagado: boolean }[] = (ev.ciclo as number[]).map((t, i) => ({ t, de: i < LLEGAN.length - 1 ? LLEGAN.length - 2 - i : -1, pagado: i === ev.pagado }));
const ATR = (): Ori => orienta(ATRIL.C, ATRIL.a, 0);
const enAtril = (): P3 => enPlano(ATR(), 0, .02, .0);
/** El primer sobre: lo lleva la bola, el cliente lo revisa y lo sella en el atril. */
function primerSobre(t: number): Sobre | null {
  if (t < ENTREGA || t > ev.salio + .75) return null;
  const top = LLEGAN[LLEGAN.length - 1];
  const reposo: P3 = [BAND[0] + .05, BAND[1] + .28 - 8 * .045, BAND[2] + .16 + 8 * .012];
  const llega = ev.pregunta + 1.0;
  let C0: P3, a = 1.2, g = 0;
  if (t < llega) {
    const u = ease.inOutCubic(prog(t, ENTREGA + .15, llega));
    C0 = L3(reposo, enAtril(), u); C0[2] += Math.sin(u * Math.PI) * .55 + (t < ENTREGA + .15 ? .12 * prog(t, ENTREGA, ENTREGA + .15) : 0);
    a = lerp(1.2, ATRIL.a, u); g = Math.sin(u * Math.PI) * .25;
  } else if (t < ev.salio + .2) C0 = enAtril();
  else {
    const u = prog(t, ev.salio + .2, ev.salio + .75);
    C0 = L3(enAtril(), PILA, u); C0[2] = lerp(enAtril()[2], .2, u * u) + Math.sin(u * Math.PI) * .8; g = u * 4;
  }
  const se = t > ev.sello ? prog(t, ev.sello, ev.sello + .4) : 0;
  return { o: orienta(C0, a, g), icono: top.icono, etiqueta: top.etiqueta, sello: se, pagado: false, k: .9, arruga: t > ev.salio + .5 ? 1 : 0 };
}
function cicloSobre(t: number, j: number): Sobre | null {
  const q = CICLO[j], t0 = q.t;
  if (t < t0 || t > t0 + 1.2) return null;
  const desde: P3 = q.de >= 0 ? [BAND[0], BAND[1] + .28 - q.de * .045, BAND[2] + .2] : [BAND[0], BAND[1], BAND[2] + .2];
  let C0: P3, a = ATRIL.a, g = 0, arr = 0;
  if (t < t0 + .3) { const u = ease.inOutCubic(prog(t, t0, t0 + .3)); C0 = L3(desde, enAtril(), u); C0[2] += Math.sin(u * Math.PI) * .45; a = lerp(1.2, ATRIL.a, u); }
  else if (t < t0 + .62) C0 = enAtril();
  else {
    const u = prog(t, t0 + .62, t0 + 1.05);
    if (q.pagado) { const dst: P3 = [X1 + 1.4, -.25, ZD + .6]; C0 = L3(enAtril(), dst, ease.inOutCubic(u)); C0[2] += Math.sin(u * Math.PI) * .4; a = lerp(ATRIL.a, 1.4, u); }
    else { C0 = L3(enAtril(), suma3(PILA, [(j % 3 - 1) * .25, (j % 2) * .15, 0]), u); C0[2] = lerp(enAtril()[2], .18, u * u) + Math.sin(u * Math.PI) * .7; g = u * 5; arr = u > .45 ? 1 : 0; }
  }
  const se = t > t0 + .45 ? prog(t, t0 + .45, t0 + .7) : 0;
  return { o: orienta(C0, a, g), icono: j % 3, sello: se, pagado: q.pagado, k: .78, arruga: arr };
}
const PILA_N = (t: number) => (t > ev.salio + .75 ? 1 : 0) + CICLO.filter((q) => !q.pagado && t > q.t + 1.05).length;
function pila(c: C, t: number) {
  const n = PILA_N(t);
  for (let i = 0; i < n; i++) {
    const r = azar(400 + i);
    const w: P3 = [PILA[0] + (r() - .5) * .9, PILA[1] + (r() - .5) * .5, .14 + (i > 6 ? .12 : 0)];
    sobre(c, { o: orienta(w, 0), icono: 0, arruga: 1, k: .78 + r() * .2 });
  }
}
function selloT(t: number): number {
  // 1 = en reposo, 0 = golpeando el atril
  let up = 1;
  if (t > ev.sin - .2 && t < ev.sello) up = lerp(1, 1.7, smooth(prog(t, ev.sin - .2, ev.sin + .4))) * (1 - ease.inCubic(prog(t, ev.sello - .16, ev.sello)));
  else if (t >= ev.sello && t < ev.salio + .6) up = smooth(prog(t, ev.sello + .3, ev.sello + .9));
  for (const q of CICLO) { const g = q.t + .45; if (t > g - .25 && t < g + .3) up = Math.min(up, t < g ? 1 - ease.inCubic(prog(t, g - .22, g)) : smooth(prog(t, g + .05, g + .28))); }
  return up;
}
function selloUso(t: number) {
  let u = ventana(t, ev.sin - .5, ev.salio + .3, .35, .5);
  for (const q of CICLO) u = Math.max(u, ventana(t, q.t + .1, q.t + .62, .15, .2));
  return u;
}
function selloMano(t: number): P3 {
  const up = selloT(t), uso = selloUso(t);
  const arriba = suma3(enAtril(), [-.06, -Math.sin(ATRIL.a) * (.06 + up * .5), Math.cos(ATRIL.a) * (.06 + up * .5) + up * .18]);
  return L3([X1 + .9, -.3, ZD + .16], arriba, uso);
}
function sello(c: C, t: number) { dibujaSello(c, selloMano(t)); }
function dibujaSello(c: C, m: P3) {
  at(c, m, () => {
    c.fillStyle = "#2a2a28"; c.strokeStyle = TINTA; c.lineWidth = 3;
    c.beginPath(); c.roundRect(-26, 8, 52, 14, 3); c.fill();
    c.fillStyle = ACENTO; c.fillRect(-24, 20, 48, 5);
    c.fillStyle = "#6a4a36"; c.fillRect(-6, -24, 12, 34);
    c.fillStyle = "#4a3426"; c.beginPath(); c.arc(0, -30, 14, 0, 6.2832); c.fill();
  });
}
function atril(c: C) {
  const o = ATR(), w = .62, h = .48;
  // pata de atrás
  lin(c, enPlano(o, -.3, .4), [o.C[0] - .3, o.C[1] + .3, ZD], 4);
  lin(c, enPlano(o, .3, .4), [o.C[0] + .3, o.C[1] + .3, ZD], 4);
  poli(c, [enPlano(o, -w, -h), enPlano(o, w, -h), enPlano(o, w, h), enPlano(o, -w, h)], "#E3DACA", TINTA, 2.6);
  lin(c, enPlano(o, -w + .05, -h + .05, .01), enPlano(o, w - .05, -h + .05, .01), 4, "#8a7a63");
}
function billetes(c: C, t: number) {
  if (t < ev.dinero - .45) return;
  const u = prog(t, ev.dinero - .45, ev.dinero);
  const z0 = BILLETES[2] + 2.2 * (1 - u * u);
  const pagados = CICLO.filter((q) => q.pagado && t > q.t + .75).length;
  for (let i = 0; i < 6 - pagados; i++) {
    const o = orienta([BILLETES[0] + (i % 2) * .02, BILLETES[1] - (i % 3) * .01, z0 + i * .028], 0, (i % 3 - 1) * .05);
    billete(c, o, .78);
  }
  // los que revolotean al caer
  if (t < ev.dinero + 1.6 && t > ev.dinero) {
    for (let i = 0; i < 3; i++) {
      const d = t - ev.dinero - i * .12; if (d < 0) continue;
      const p: P3 = [BILLETES[0] + (i - 1) * .5 + Math.sin(d * 5 + i) * .15, BILLETES[1] - .2 + i * .1, ZD + Math.max(.03, 1.6 - d * 1.3)];
      billete(c, orienta(p, .6 + .5 * Math.sin(d * 7 + i), d * 2 + i), .7);
    }
  }
  // el pago: un billete vuela del montón a la bola
  for (const q of CICLO) {
    if (!q.pagado) continue;
    const d = t - (q.t + .7); if (d < 0 || d > 1.6) continue;
    const u = ease.inOutCubic(prog(d, 0, .5));
    const p = L3([BILLETES[0], BILLETES[1], ZD + .2], [BOLA1.x + .15, BOLA1.y + .05, ZD + RB * 2 + .55], u); p[2] += Math.sin(u * Math.PI) * .6;
    billete(c, orienta(p, lerp(0, 1.3, u), u * 3), .78);
  }
}
function billete(c: C, o: Ori, k: number) {
  plano(c, o.C, [o.U[0] * k, o.U[1] * k, o.U[2] * k], neg3([o.V[0] * k, o.V[1] * k, o.V[2] * k]), () => {
    c.fillStyle = "#E3E8D6"; c.strokeStyle = TINTA; c.lineWidth = 2.6; c.beginPath(); c.rect(-40, -20, 80, 40); c.fill(); c.stroke();
    c.lineWidth = 1.6; c.strokeRect(-34, -14, 68, 28); c.beginPath(); c.arc(0, 0, 10, 0, 6.2832); c.stroke();
    texto(c, "$", 0, 7, { fuente: serif(20), color: TINTA });
  });
}
function bolaRLI(t: number): Bola | null {
  if (t < ev.examen || t > ev.os + .2) return null;
  const { x, y } = BOLA1;
  const alt = entra(t, ev.examen + .3, 1.7);
  const w = (dx: number, dy: number, dz: number): P3 => [x + dx, y + dy, ZD + RB + alt + dz];
  const b: Bola = { x, y, z: ZD, alt, m1: w(-.45, .05, -.05), m2: w(.46, 0, -.06), abre: [.6, .6] };
  const aire = smooth(prog(alt, .05, .4));
  b.m1 = L3(b.m1, w(-.55, 0, .5), aire); b.m2 = L3(b.m2, w(.55, 0, .5), aire);
  // se asoma a la bandeja cuando caen los sobres
  const asoma = ventana(t, ev.toma, ev.pregunta, .4, .3);
  if (asoma > 0) b.m1 = L3(b.m1, [BAND[0] + .45, BAND[1] + .1, ZD + .45], asoma * .7);
  // toma el sobre de arriba y lo lleva al atril
  const lleva = ventana(t, ENTREGA - .1, ev.pregunta + 1.1, .2, .3);
  if (lleva > 0) {
    const s = primerSobre(t);
    if (s) { b.m1 = L3(b.m1, suma3(s.o.C, [-.28, -.05, -.05]), lleva); b.m2 = L3(b.m2, suma3(s.o.C, [.28, -.05, -.05]), lleva); b.abre = [.3, .3]; }
  }
  // el sello cae: se desinfla
  const triste = ventana(t, ev.sello, ev.salio + .3, .1, .3);
  if (triste > 0) { b.m1 = L3(b.m1, w(-.45, -.05, -.3), triste); b.m2 = L3(b.m2, w(.45, -.05, -.3), triste); b.aplasta = .15 * triste; }
  // el ciclo: avienta cada sobre al atril; cuando le pagan, recibe el billete
  for (const q of CICLO) {
    const lanza = ventana(t, q.t - .12, q.t + .28, .1, .2);
    if (lanza > 0) { b.m1 = L3(b.m1, [BAND[0] + .1, BAND[1] + .05, ZD + .3], lanza * (t < q.t ? 1 : .3)); b.m2 = L3(b.m2, suma3(enAtril(), [-.3, -.2, .1]), lanza * clamp((t - q.t) * 4)); }
    if (q.pagado) {
      const fest = ventana(t, q.t + 1.05, q.t + 2.2, .15, .4);
      if (fest > 0) { b.m2 = L3(b.m2, w(.25, .05, .62 + .05 * Math.sin(t * 12)), fest); b.m1 = L3(b.m1, w(-.5, 0, .45), fest); b.alt = (b.alt ?? 0) + .1 * Math.abs(Math.sin(t * 9)) * fest; b.abre = [.9, .25]; }
    }
  }
  return b;
}
function cliente(t: number): Gente & { manos: [P3, P3] } {
  const g: Gente & { manos: [P3, P3] } = { cliente: true, mira: [-.4, .3], ceja: 0, boca: 0, manos: [selloMano(t), [X1 + 1.7, .3, ZD + .08]] };
  const lee = ventana(t, ev.pregunta + .9, ev.salio, .3, .3);
  if (lee > 0) { g.mira = [-.85, .8]; g.ceja = lee * (t > ev.sin ? -.2 : .6); g.boca = t > ev.sin ? -.4 : 0; g.ladea = -.08 * lee; }
  if (t > ev.sello && t < ev.salio + .4) { g.mira = [-.3, .2]; g.boca = -.5; g.ceja = -.5; }
  // en el ciclo, el ojo de un lado a otro
  if (t > ev.salio + .4) { g.mira = [-.8 + .25 * Math.sin(t * 5), .7]; g.ceja = -.3; g.boca = CICLO.some((q) => q.pagado && t > q.t + .45 && t < q.t + 1.8) ? .6 : -.3; }
  return g;
}

// ---------- el gráfico de barras de papel ----------
const GW = 290, GH = 344;
/** Un cartel que se desenrolla desde arriba. o es la esquina superior izquierda, en la pared. */
function cartel(c: C, o: P3, u: number, f: () => void) {
  if (u <= .001) return;
  const h = GH * u;
  plano(c, o, [1, 0, 0], [0, 0, -1], () => {
    c.fillStyle = "rgba(20,18,14,.1)"; c.fillRect(8, 10, GW, h);
    c.save(); c.beginPath(); c.rect(-2, -2, GW + 4, h + 2); c.clip();
    c.fillStyle = BLANCO; c.fillRect(0, 0, GW, GH); f();
    c.restore();
    c.strokeStyle = TINTA; c.lineWidth = 3; c.strokeRect(0, 0, GW, h);
    // el rollo
    if (u < .995) { c.fillStyle = "#EDE7DA"; c.beginPath(); c.roundRect(-6, h - 8, GW + 12, 18, 9); c.fill(); c.stroke(); c.strokeStyle = "rgba(17,17,17,.4)"; c.lineWidth = 1.4; linea(c, 0, h + 1, GW, h + 1); }
    // chinche
    c.fillStyle = ACENTO; circulo(c, GW / 2, 10, 7); c.strokeStyle = TINTA; c.lineWidth = 2; c.beginPath(); c.arc(GW / 2, 10, 7, 0, 6.2832); c.stroke();
  });
}
const AX = 64, BY = 312, HP = 214;                       // eje, línea base y alto útil del área de barras
const BAR = [{ x: 98, w: 72 }, { x: 196, w: 72 }];
function barraPapel(c: C, x: number, w: number, h: number, oscura: boolean, borde = TINTA) {
  if (h <= .2) { c.strokeStyle = TINTA; c.lineWidth = 2; linea(c, x, BY, x + w, BY); return; }
  c.fillStyle = "rgba(20,18,14,.14)"; c.fillRect(x + 5, BY - h + 4, w, h - 4);
  c.fillStyle = oscura ? "#2B2A27" : "#EADFCB"; c.fillRect(x, BY - h, w, h);
  c.save(); c.beginPath(); c.rect(x, BY - h, w, h); c.clip();
  c.strokeStyle = oscura ? "rgba(255,255,255,.08)" : "rgba(17,17,17,.12)"; c.lineWidth = 2;
  for (let k = -10; k < 40; k++) linea(c, x + k * 9, BY, x + k * 9 + 60, BY - 60 - h);
  c.restore();
  c.strokeStyle = borde; c.lineWidth = 2.8; c.strokeRect(x, BY - h, w, h);
}
function ejes(c: C, ymax: number, sets: [number[], number, string][]) {
  c.strokeStyle = TINTA; c.lineWidth = 2.6; linea(c, AX, BY, GW - 14, BY); linea(c, AX, BY + 2, AX, BY - HP - 6);
  for (const [vals, al, suf] of sets) {
    if (al <= .01) continue;
    for (const v of vals) {
      const y = BY - v / ymax * HP; if (y < BY - HP - 8) continue;
      c.globalAlpha = al; c.strokeStyle = "rgba(17,17,17,.18)"; c.lineWidth = 1.4; c.setLineDash([4, 6]); if (v > 0) linea(c, AX, y, GW - 14, y); c.setLineDash([]);
      c.strokeStyle = TINTA; c.lineWidth = 2; linea(c, AX - 6, y, AX, y);
      texto(c, v === vals[vals.length - 1] ? `${v}${suf}` : `${v}`, AX - 10, y + 6, { fuente: serif(19), color: GRIS, alin: "right" });
      c.globalAlpha = 1;
    }
  }
}
function rliContenido(c: C, t: number) {
  texto(c, "Remote Labor Index", GW / 2, 50, { fuente: serif(ajusta(c, "Remote Labor Index", 31, 250)), color: TINTA });
  texto(c, "proyectos pagados", GW / 2, 76, { fuente: serif(19, true), color: GRIS });
  // lectura 2: la escala se acerca de 0-100 a 0-26; las barras siguen proporcionales en todo momento
  const zoom = ease.inOutCubic(prog(t, ev.dos + .1, ev.dos + .85));
  const ymax = lerp(100, 26, zoom);
  ejes(c, ymax, [[[0, 50, 100], 1 - zoom, "%"], [[0, 5, 10, 15, 20, 25], zoom, "%"]]);
  const V2V = 21.25;
  const v1 = 2.5 * ease.outCubic(prog(t, ev.d25 - .05, ev.d25 + .55)), v2 = V2V * ease.outCubic(prog(t, ev.d21 - .1, ev.d21 + .7));
  const h1 = v1 / ymax * HP, h2 = v2 / ymax * HP;
  // lectura 1: lo que todavía no sirve, de 21.25 a 100
  const r1 = ease.inOutCubic(prog(t, ev.ochenta - .1, ev.ochenta + .7)) * (1 - smooth(prog(t, ev.dos - .2, ev.dos + .15)));
  if (r1 > 0) {
    const top = BY - h2, hh = (100 - V2V) / ymax * HP * r1, x = BAR[1].x, w = BAR[1].w;
    c.fillStyle = "#F4DCD3"; c.fillRect(x, top - hh, w, hh);
    c.save(); c.beginPath(); c.rect(x, top - hh, w, hh); c.clip(); c.strokeStyle = "rgba(192,68,42,.45)"; c.lineWidth = 2.2;
    for (let k = -30; k < 30; k++) linea(c, x + k * 10, top, x + k * 10 + 60, top - 60); c.restore();
    c.strokeStyle = ACENTO; c.lineWidth = 3; c.strokeRect(x, top - hh, w, hh);
    const la = smooth(prog(t, ev.ochenta + .3, ev.ochenta + .6));
    if (la > 0) {
      c.fillStyle = BLANCO; c.globalAlpha = la * .92; c.fillRect(x - 8, top - hh / 2 - 30, w + 16, 48); c.globalAlpha = 1;
      texto(c, "78.75%", x + w / 2, top - hh / 2 + 6, { fuente: serif(ajusta(c, "78.75%", 34, w + 12)), color: ACENTO, alfa: la });
    }
  }
  barraPapel(c, BAR[0].x, BAR[0].w, h1, true);
  barraPapel(c, BAR[1].x, BAR[1].w, h2, true);
  // lectura 2: ocho bloques y medio de 2.5 junto al 21.25
  const bh = 2.5 / ymax * HP;
  const B: number[] = ev.bloques;
  B.forEach((ti, j) => {
    if (j === 0) { if (t > ti) { const k = ventana(t, ti, 999, .15, .1); c.strokeStyle = ACENTO; c.lineWidth = 3.4 * k; c.strokeRect(BAR[0].x, BY - bh, BAR[0].w, bh); } return; }
    if (t < ti - .3) return;
    const alto = j === 8 ? bh / 2 : bh;
    const u = prog(t, ti - .22, ti);
    const y = BY - j * bh - alto - (1 - u * u) * 28;
    c.globalAlpha = clamp(u * 3);
    c.fillStyle = "#2B2A27"; c.fillRect(BAR[0].x, y, BAR[0].w, alto);
    c.strokeStyle = ACENTO; c.lineWidth = 3.4; c.strokeRect(BAR[0].x, y, BAR[0].w, alto);
    c.globalAlpha = 1;
  });
  // rótulos
  const l1 = smooth(prog(t, ev.d25 + .2, ev.d25 + .5)) * (1 - smooth(prog(t, B[1] - .4, B[1] - .1)));
  texto(c, "2.5%", BAR[0].x + BAR[0].w / 2, BY - h1 - 12, { fuente: serif(34), color: TINTA, alfa: l1 });
  const l2 = smooth(prog(t, ev.d21 + .35, ev.d21 + .65));
  texto(c, "21.25%", BAR[1].x + BAR[1].w / 2, BY - h2 - 12, { fuente: serif(ajusta(c, "21.25%", 34, 98)), color: TINTA, alfa: l2 * (r1 > .02 ? 1 - r1 : 1) });
  const k8 = ease.outBack(prog(t, B[8] + .05, B[8] + .42), 2);
  if (k8 > 0) {
    c.save(); c.translate(BAR[0].x + BAR[0].w / 2, BY - 8.5 * bh - 9); c.scale(k8, k8);
    texto(c, "×8.5", 0, 0, { fuente: serif(ajusta(c, "×8.5", 42, 96, true), true), color: ACENTO }); c.restore();
  }
  const y1 = smooth(prog(t, ev.salio + .5, ev.salio + .9));
  texto(c, "oct 2025", BAR[0].x + BAR[0].w / 2, BY + 30, { fuente: serif(ajusta(c, "oct 2025", 24, 92)), color: TINTA, alfa: y1 });
  texto(c, "hoy", BAR[1].x + BAR[1].w / 2, BY + 30, { fuente: serif(24), color: TINTA, alfa: y1 });
}
function osContenido(c: C, t: number) {
  texto(c, "OSWorld", GW / 2, 50, { fuente: serif(36), color: TINTA });
  texto(c, "tareas en una computadora", GW / 2, 76, { fuente: serif(ajusta(c, "tareas en una computadora", 19, 250, true), true), color: GRIS });
  ejes(c, 100, [[[0, 50, 100], 1, "%"]]);
  // agentes: 12 al principio; hoy cruzan la marca de una persona (72). Más allá de 72 no se pinta una cifra
  // inventada: la barra llega a la marca y sigue como flecha abierta, con el rótulo «más de 72%».
  const cruza = ease.inOutCubic(prog(t, ev.varios + .1, ev.pasan_m + .3));
  const a = 12 * ease.outCubic(prog(t, ev.doce - .05, ev.doce + .45)) + 60 * cruza;
  const p = 72 * ease.outCubic(prog(t, ev.setenta - .15, ev.setenta + .7));
  const yM = BY - 72 / 100 * HP;
  // la marca de una persona, punteada a lo ancho
  const lm = smooth(prog(t, ev.setenta + .4, ev.setenta + .8));
  if (lm > 0) { c.globalAlpha = lm; c.strokeStyle = TINTA; c.lineWidth = 2.4; c.setLineDash([8, 6]); linea(c, AX, yM, GW - 14, yM); c.setLineDash([]); c.globalAlpha = 1; }
  // de dónde empezó
  const m12 = smooth(prog(t, ev.varios + .1, ev.varios + .5));
  barraPapel(c, BAR[0].x, BAR[0].w, a / 100 * HP, true);
  barraPapel(c, BAR[1].x, BAR[1].w, p / 100 * HP, false);
  if (m12 > 0) {
    const y = BY - 12 / 100 * HP;
    c.globalAlpha = m12; c.strokeStyle = "#D8D2C4"; c.lineWidth = 2; c.setLineDash([5, 5]); linea(c, BAR[0].x + 4, y, BAR[0].x + BAR[0].w - 4, y); c.setLineDash([]); c.globalAlpha = 1;
    texto(c, "12%", BAR[0].x + BAR[0].w / 2, y - 7, { fuente: serif(20, true), color: "#D8D2C4", alfa: m12 });
  }
  // la flecha que pasa la marca
  const fl = smooth(prog(t, ev.marca - .2, ev.marca + .25));
  if (fl > 0) {
    const x = BAR[0].x, w = BAR[0].w, alto = 22 * fl;
    c.fillStyle = "#2B2A27"; c.strokeStyle = TINTA; c.lineWidth = 2.8;
    c.beginPath(); c.moveTo(x - 6, yM); c.lineTo(x + w / 2, yM - alto); c.lineTo(x + w + 6, yM); c.closePath(); c.fill(); c.stroke();
  }
  const la = smooth(prog(t, ev.doce + .2, ev.doce + .45)) * (1 - smooth(prog(t, ev.varios, ev.varios + .2)));
  texto(c, "12%", BAR[0].x + BAR[0].w / 2, BY - 12 / 100 * HP - 12, { fuente: serif(36), color: TINTA, alfa: la });
  const lmas = smooth(prog(t, ev.marca, ev.marca + .3));
  texto(c, "más de 72%", BAR[0].x + BAR[0].w / 2 + 4, yM - 30, { fuente: serif(ajusta(c, "más de 72%", 28, 124, true), true), color: ACENTO, alfa: lmas });
  const lp = smooth(prog(t, ev.setenta + .3, ev.setenta + .6));
  texto(c, "72%", BAR[1].x + BAR[1].w / 2, BY - p / 100 * HP - 12, { fuente: serif(36), color: TINTA, alfa: lp * (1 - lmas * .0) });
  texto(c, "hoy: OSWorld-Verified", GW - 14, 95, { fuente: serif(16, true), color: GRIS, alin: "right", alfa: lmas });
  // quién es cada barra
  const q1 = smooth(prog(t, ev.agentes - .1, ev.agentes + .3)), q2 = smooth(prog(t, ev.persona - .1, ev.persona + .25));
  c.save(); c.globalAlpha = q1; c.translate(BAR[0].x + BAR[0].w / 2, BY + 18);
  agente(c, 0, 0, 10, [-20, -6], [20, -8], { abre1: .7, abre2: .7 }); c.restore();
  c.save(); c.globalAlpha = q2; c.translate(BAR[1].x + BAR[1].w / 2, BY + 18);
  c.fillStyle = PIEL; c.strokeStyle = TINTA; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 11, 0, 6.2832); c.fill(); c.stroke();
  c.fillStyle = TINTA; c.beginPath(); c.arc(0, -1, 12, Math.PI * 1.05, Math.PI * 1.95); c.closePath(); c.fill(); circulo(c, -4, 1, 1.5); circulo(c, 4, 1, 1.5);
  c.restore();
}

// ---------- OSWorld: la computadora de papel ----------
const MON = { x: X2, y: .32, z0: ZD + .26, w: 2.2, h: 1.42 };
const BOLA2 = { x: X2 - 1.2, y: -.42 };
const TECLADO: P3 = [X2 - .2, -.38, ZD];
const RATON: P3 = [X2 + .7, -.42, ZD];
function pantalla(c: C, t: number) {
  const o: P3 = [MON.x - MON.w / 2, MON.y - .06, MON.z0 + MON.h];
  // base y cuello
  caja(c, MON.x - .32, MON.x + .32, MON.y - .2, MON.y + .2, ZD, ZD + .05, { frente: "#3a3936", lado: "#2a2a28", tapa: "#4a4946" });
  caja(c, MON.x - .07, MON.x + .07, MON.y, MON.y + .08, ZD + .05, MON.z0 + .1, { frente: "#3a3936", lado: "#2a2a28", tapa: "#4a4946" });
  const enc = smooth(prog(t, ev.osw - .1, ev.osw + .25));
  plano(c, o, [MON.w, 0, 0], [0, 0, -MON.h], () => {
    // 100 locales = todo el monitor en cada eje
    c.save(); c.scale(1, 1);
    c.fillStyle = "rgba(20,18,14,.15)"; c.fillRect(2, 3, 100, 100);
    c.fillStyle = "#2B2A27"; c.beginPath(); c.roundRect(0, 0, 100, 100, 3); c.fill();
    c.restore();
  });
  // la pantalla, en unidades donde 100 = 1 unidad de mundo
  const sx0 = MON.x - MON.w / 2 + .07, sz0 = MON.z0 + MON.h - .07, SW = MON.w - .14, SH2 = MON.h - .14;
  plano(c, [sx0, MON.y - .07, sz0], [1, 0, 0], [0, 0, -1], () => {
    const W = SW * 100, H = SH2 * 100;
    c.fillStyle = enc > .5 ? "#F1EEE6" : "#3A3936"; c.fillRect(0, 0, W, H);
    if (enc < .5) { c.fillStyle = `rgba(241,238,230,${enc * 2})`; c.fillRect(0, 0, W, H); return; }
    c.save(); c.beginPath(); c.rect(0, 0, W, H); c.clip();
    c.globalAlpha = smooth(prog(enc, .5, 1));
    // barra de arriba
    c.fillStyle = "#DCD6C9"; c.fillRect(0, 0, W, 12); c.strokeStyle = TINTA; c.lineWidth = 1.4; linea(c, 0, 12, W, 12);
    c.fillStyle = TINTA; for (let k = 0; k < 4; k++) c.fillRect(10 + k * 22, 4, 14, 4);
    // iconos del escritorio
    for (let k = 0; k < 3; k++) { c.fillStyle = "#E4DED1"; c.strokeStyle = TINTA; c.lineWidth = 1.6; c.fillRect(10, 22 + k * 30, 18, 16); c.strokeRect(10, 22 + k * 30, 18, 16); }
    // ventanas que se abren
    const VEN = [{ x: 40, y: 20, w: 104, h: 58 }, { x: 60, y: 30, w: 104, h: 58 }, { x: 84, y: 24, w: 112, h: 62 }];
    // cada clic hace saltar la ventana que toca; ninguno falla
    const CL: number[] = ev.clics;
    const META: { p: V2; v: number }[] = [{ p: [158, 69], v: 2 }, { p: [70, 25], v: 0 }, { p: [112, 46], v: 1 }, { p: [19, 60], v: -1 }, { p: [158, 69], v: 2 }];
    const salta = (i: number) => { let k = 0; CL.forEach((tc, j) => { if (META[j].v === i) k = Math.max(k, Math.exp(-Math.max(t - tc - .26, 0) * 9) * (t > tc + .26 ? 1 : 0)); }); return k; };
    VEN.forEach((v, i) => {
      const ti = ev.ventanas[i]; if (t < ti) return;
      const k = ease.outBack(prog(t, ti, ti + .28), 1.6) * (1 + .07 * salta(i));
      c.save(); c.translate(v.x + v.w / 2, v.y + v.h / 2); c.scale(k, k);
      c.fillStyle = "rgba(20,18,14,.15)"; c.fillRect(-v.w / 2 + 4, -v.h / 2 + 4, v.w, v.h);
      c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 2.2; c.fillRect(-v.w / 2, -v.h / 2, v.w, v.h); c.strokeRect(-v.w / 2, -v.h / 2, v.w, v.h);
      c.fillStyle = salta(i) > .3 ? VERDE : "#3A3936"; c.fillRect(-v.w / 2, -v.h / 2, v.w, 11);
      c.fillStyle = BLANCO; for (let d = 0; d < 3; d++) circulo(c, v.w / 2 - 8 - d * 8, -v.h / 2 + 5.5, 2.4);
      c.strokeStyle = "rgba(17,17,17,.45)"; c.lineWidth = 2;
      if (i === 0) for (let r = 0; r < 4; r++) linea(c, -v.w / 2 + 10, -v.h / 2 + 24 + r * 11, v.w / 2 - 14 - (r % 2) * 20, -v.h / 2 + 24 + r * 11);
      if (i === 1) { c.fillStyle = "#E3DACA"; for (let r = 0; r < 3; r++) for (let q = 0; q < 4; q++) { c.fillRect(-v.w / 2 + 8 + q * 25, -v.h / 2 + 18 + r * 17, 20, 13); } }
      if (i === 2) {
        for (let r = 0; r < 3; r++) linea(c, -v.w / 2 + 10, -v.h / 2 + 24 + r * 11, v.w / 2 - 20 - r * 10, -v.h / 2 + 24 + r * 11);
        const bx = 18, by = 14, verde = salta(2) > .3;
        c.fillStyle = verde ? VERDE_C : "#E9E2D3"; c.strokeStyle = TINTA; c.lineWidth = 2.2;
        c.beginPath(); c.roundRect(bx - 22, by - 9, 44, 18, 4); c.fill(); c.stroke();
        c.fillStyle = TINTA; c.fillRect(bx - 12, by - 2, 24, 4);
      }
      c.restore();
    });
    // la cuenta de clics: todos bien
    CL.forEach((tc0, j) => {
      const tc = tc0 + .28; if (t < tc) return;
      const k = ease.outBack(prog(t, tc, tc + .25), 2.2);
      c.save(); c.translate(20 + j * 30, H - 18); c.scale(k, k);
      c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 12.5, 0, 6.2832); c.fill(); c.stroke();
      c.lineWidth = 4.2; c.lineCap = "round"; c.strokeStyle = VERDE; c.beginPath(); c.moveTo(-7, 0); c.lineTo(-2, 6); c.lineTo(8, -6); c.stroke();
      c.restore();
    });
    // el cursor: de meta en meta, sin errores
    if (t > ev.usar) {
      const reposo: V2 = [188, 98];
      let cx = reposo[0] + 6 * Math.sin(t * 1.7), cy = reposo[1] + 4 * Math.sin(t * 2.3);
      let prev: V2 = reposo;
      CL.forEach((tc, j) => {
        const va = ease.inOutCubic(prog(t, tc - .02, tc + .24));
        if (t >= tc - .02) { cx = lerp(prev[0], META[j].p[0], va); cy = lerp(prev[1], META[j].p[1], va); }
        prev = META[j].p;
      });
      if (t > CL[4] + .4) { const u = ease.inOutCubic(prog(t, CL[4] + .4, CL[4] + .9)); cx = lerp(prev[0], reposo[0], u); cy = lerp(prev[1], reposo[1], u); }
      c.save(); c.translate(cx, cy); c.fillStyle = TINTA; c.strokeStyle = BLANCO; c.lineWidth = 1.6;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 17); c.lineTo(4.5, 13); c.lineTo(8, 20); c.lineTo(10.5, 19); c.lineTo(7.2, 12); c.lineTo(12.5, 12); c.closePath(); c.fill(); c.stroke();
      c.restore();
    }
    c.restore();
  });
}
function tecladoRaton(c: C, t: number) {
  const o = orienta(TECLADO, .0, 0);
  poli(c, [enPlano(o, -.6, -.22), enPlano(o, .6, -.22), enPlano(o, .6, .22), enPlano(o, -.6, .22)], "#E4DED2", TINTA, 2.2);
  poli(c, [enPlano(o, -.6, -.22, .04), enPlano(o, .6, -.22, .04), enPlano(o, .6, .22, .04), enPlano(o, -.6, .22, .04)], "#F2EEE5", TINTA, 2.2);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 10; k++) {
    const u = -.54 + k * .11, v = .14 - r * .13;
    const pres = t > ev.usar && t < ev.ventanas[2] + .5 && (Math.floor(t * 9 + k * 3 + r * 5) % 7 === 0) ? .02 : 0;
    poli(c, [enPlano(o, u, v, .04 - pres + .015), enPlano(o, u + .09, v, .04 - pres + .015), enPlano(o, u + .09, v - .09, .04 - pres + .015), enPlano(o, u, v - .09, .04 - pres + .015)], "#FBFAF6", "rgba(17,17,17,.6)", 1.2, .3);
  }
  const m = RATON;
  poli(c, [[m[0] - .1, m[1] - .15, ZD + .05], [m[0] + .1, m[1] - .15, ZD + .05], [m[0] + .1, m[1] + .13, ZD + .05], [m[0] - .1, m[1] + .13, ZD + .05]], "#F2EEE5", TINTA, 2.2);
}
function bolaOS(t: number): Bola | null {
  if (t < ev.os - .3 || t > ev.hoy + .2) return null;
  const { x, y } = BOLA2;
  let alt = entra(t, ev.os - .2, 1.3);
  const w = (dx: number, dy: number, dz: number): P3 => [x + dx, y + dy, ZD + RB + alt + dz];
  const b: Bola = { x, y, z: ZD, alt, m1: w(-.45, 0, -.05), m2: w(.45, 0, -.05), abre: [.6, .6] };
  const usa = smooth(prog(t, ev.usar - .2, ev.usar + .2));
  const tecla = .03 * Math.sin(t * 31) * (t < ev.ventanas[2] + .5 ? 1 : 0);
  b.m1 = L3(b.m1, [TECLADO[0] - .3, TECLADO[1] + .02, ZD + .1 + Math.max(0, tecla)], usa);
  b.m2 = L3(b.m2, [RATON[0], RATON[1] + .02, ZD + .13], usa);
  b.abre = [lerp(.6, .25, usa), lerp(.6, .3, usa)];
  // el trabajo terminado: lo sostiene en alto
  const sostiene = ventana(t, ev.terminar + .3, ev.hoy - .3, .3, .2);
  if (sostiene > 0) {
    const E0 = sobreOS(t);
    if (E0) { b.m1 = L3(b.m1, suma3(E0.o.C, [-.42, -.04, -.12]), sostiene); b.m2 = L3(b.m2, suma3(E0.o.C, [.4, -.04, -.12]), sostiene); b.abre = [.3, .3]; }
  }
  // el sello cae: se desinfla
  const triste = smooth(prog(t, ev.sello2, ev.sello2 + .35));
  if (triste > 0) { b.aplasta = .14 * triste; b.m1 = L3(b.m1, w(-.5, -.05, -.25), triste * .7); }
  return b;
}
/** El trabajo que la bola entrega: sale de la pantalla y se queda en sus manos, y el cliente lo sella. */
const SOBRE_OS: P3 = [X2 - .62, -.66, ZD + .82];
function sobreOS(t: number): Sobre | null {
  if (t < ev.terminar || t > ev.hoy + .2) return null;
  const u = ease.inOutCubic(prog(t, ev.terminar + .05, ev.terminar + .6));
  const C0 = L3([X2 + .1, MON.y - .12, MON.z0 + .72], SOBRE_OS, u); C0[2] += Math.sin(u * Math.PI) * .25;
  const se = t > ev.sello2 ? prog(t, ev.sello2, ev.sello2 + .35) : 0;
  return { o: orienta(C0, 1.42, -.06 * (1 - u)), icono: 2, sello: se, pagado: false, k: lerp(.35, .95, u) };
}
function selloClienteOS(t: number): P3 | null {
  if (t < ev.pague - .65 || t > ev.hoy - .1) return null;
  const entra2 = ease.outCubic(prog(t, ev.pague - .65, ev.pague - .15)), sale = ease.inCubic(prog(t, ev.si + .15, ev.si + .7));
  let up = 1;
  if (t > ev.sello2 - .14 && t < ev.sello2 + .7) up = t < ev.sello2 ? 1 - ease.inCubic(prog(t, ev.sello2 - .14, ev.sello2)) : smooth(prog(t, ev.sello2 + .25, ev.sello2 + .7));
  const arriba = suma3(SOBRE_OS, [.06, -.08 - up * .45, up * .3]);
  const fuera: P3 = [X2 + 1.9, -.2, 3.3];
  return L3(L3(fuera, arriba, entra2), fuera, sale);
}
function selloOS(c: C, t: number) {
  const m = selloClienteOS(t); if (!m) return;
  // el brazo del cliente baja desde arriba a la derecha: saco oscuro, puño blanco, mano con el sello
  const q = P(m), h = P([m[0] + 1.7, m[1] + .5, m[2] + 1.9]); if (!q || !h) return;
  const e = q.s / 100, ang = Math.atan2(q.y - h.y, q.x - h.x);
  const kx = q.x + 2 * e, ky = q.y - 28 * e;                      // la mano, sobre la perilla del sello
  const px = kx - Math.cos(ang) * 16 * e, py = ky - Math.sin(ang) * 16 * e;
  const cx2 = kx - Math.cos(ang) * 26 * e, cy2 = ky - Math.sin(ang) * 26 * e;
  c.lineCap = "butt";
  c.strokeStyle = TINTA; c.lineWidth = 26 * e + 5; linea(c, cx2, cy2, h.x, h.y);
  c.strokeStyle = "#3A3936"; c.lineWidth = 26 * e; linea(c, cx2, cy2, h.x, h.y);
  c.strokeStyle = TINTA; c.lineWidth = 20 * e + 4; linea(c, px, py, cx2, cy2);
  c.strokeStyle = BLANCO; c.lineWidth = 20 * e; linea(c, px, py, cx2, cy2);
  c.lineCap = "round";
  dibujaSello(c, m);
  mano(c, kx, ky, ang, e * 1.25, .2);
}
// ---------- polvo de papel que flota delante de todo ----------
function polvo(c: C, t: number) {
  const r = azar(9);
  c.fillStyle = TINTA;
  for (let i = 0; i < 46; i++) {
    const x0 = r() * 1200 - 60, y0 = r() * 2060, v = 14 + r() * 36, f = r() * 6.3, z = 1.6 + r() * 3;
    const y = ((y0 - t * v) % 2060 + 2060) % 2060 - 70, x = x0 + Math.sin(t * .5 + f) * 30;
    c.globalAlpha = .07 + r() * .12; c.fillRect(x, y, z, z);
  }
  c.globalAlpha = 1;
}

// ---------- el cuadro ----------
function dibuja(c: C, t: number) {
  FR = Math.floor(t * 10);
  const v = vista(t);
  K = camara(v, 540, 1060, 1250);
  DV = v.dist;
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  piso(c);
  muro(c, X1 - 5, X1 + 5, 2.05, 9.5);
  muro(c, X2 - 5, X2 + 5, 1.75, 9.5);

  const obj: { z: number; f: () => void }[] = [];
  const pon = (w: P3, f: () => void, dz = 0) => { const p = P(w); if (!p) return; if (p.x < -1600 || p.x > 2700) return; obj.push({ z: p.zc + dz, f }); };

  // ----- tu escritorio, con la persona, el rompecabezas y la bola -----
  const est = [0, 1, 2, 3, 4, 5].map((k) => piezaD0(k, t));
  pon([0, 1.55, ZD + .6], () => {
    const g = personaD0(t);
    const hombros = genteCuerpo(c, PERS, g);
    mesaTuya(c, t);
    est.forEach((s2, k) => { if (s2.vuela || s2.o.C[2] > ZD + .2 || t > CAR.find((r) => r.pieza === k)!.t0) hueco(c, k, PC); });
    // primero las que están en su lugar, luego las que flotan un poco
    const rojo2 = ventana(t, ev.pedazos - .05, ev.pedazos2, .1, .3);
    est.forEach((s2, k) => { if (!s2.vuela && s2.alfa > 0) { c.save(); c.globalAlpha = s2.alfa; pieza(c, k, s2.o, { piso: ZD, rojo: k === 2 ? rojo2 : 0 }); c.restore(); } });
    const p = P(PERS);
    if (hombros && p) { genteBrazo(c, hombros[0], g.manos[0], p.s, false, g.abre, 1); genteBrazo(c, hombros[1], g.manos[1], p.s, false, g.abre, -1); }
    const b = bolaD0(t); if (b) bolaW(c, b);
  }, 0);
  est.forEach((s2, k) => { if (s2.vuela && s2.alfa > .01) pon(s2.o.C, () => { const pc = P(s2.o.C), techo = t > ev.corre + .7 && t < ev.esos - .2 ? 60 : 430; c.save(); c.globalAlpha = s2.alfa * niebla(pc) * (pc ? smooth(prog(pc.y, techo, techo + 210)) : 0); pieza(c, k, s2.o, { esc: s2.esc, piso: s2.o.C[1] < 1.2 ? ZD : undefined }); c.restore(); }, -.05); });
  for (let i = 0; i < 4; i++) {
    if (alzaEsclusa(i, t) > .005) {
      pon([GX, GY(i), GZ(i) * .5], () => escalon(c, i, t), .55);
      pon([GX, GY(i), GZ(i) + .5], () => esclusa(c, i, t), 0);
    }
  }
  // ----- la oficina -----
  OFI.forEach((o, i) => { if (alzaOfi(i, t) > .01) pon([o.x, o.y, ZD], () => { c.save(); c.globalAlpha = niebla(P([o.x, o.y, ZD])); puestoOfi(c, i, t); c.restore(); }, .6); });

  // ----- el mostrador del Remote Labor Index -----
  if (Math.abs(K.v.tx - X1) < 9) {
    pon([X1, 2.05, 4], () => {
      const u = ease.inOutCubic(prog(t, ev.salio + .35, ev.salio + 1.0));
      cartel(c, [X1 - GW / 200, 2.03, 6.25], u, () => rliContenido(c, t));
    }, 0);
    pon([X1, 0, ZD], () => {
      const g = cliente(t);
      const hombros = genteCuerpo(c, CLI, g);
      escritorio(c, X1, (MOS.y0 + MOS.y1) / 2, MOS.x1 - MOS.x0, MOS.y1 - MOS.y0);
      bandeja(c);
      billetes(c, t);
      atril(c);
      sobresBandeja(c, t);
      const s1 = primerSobre(t); if (s1 && t > ENTREGA + .5 && t < ev.salio + .25) sobre(c, s1);
      CICLO.forEach((q, j) => { const s2 = cicloSobre(t, j); if (s2 && t < q.t + .62) sobre(c, s2); });
      const p = P(CLI);
      if (hombros && p) { genteBrazo(c, hombros[0], g.manos[0], p.s, true, .2, 1); sello(c, t); genteBrazo(c, hombros[1], g.manos[1], p.s, true, .5, -1); }
      const b = bolaRLI(t); if (b) bolaW(c, b);
      if (s1 && (t <= ENTREGA + .5 || t >= ev.salio + .25)) sobre(c, s1);
      CICLO.forEach((q, j) => { const s2 = cicloSobre(t, j); if (s2 && t >= q.t + .62) sobre(c, s2); });
    }, .5);
    pon(PILA, () => pila(c, t), 0);
  }
  // ----- la computadora de OSWorld -----
  if (Math.abs(K.v.tx - X2) < 9) {
    pon([X2, 1.75, 4], () => {
      const u = ease.inOutCubic(prog(t, ev.agentes - .05, ev.agentes + .55)) * (1 - ease.inOutCubic(prog(t, ev.usar2 - .45, ev.usar2 + .2)));
      cartel(c, [X2 - GW / 200, 1.73, 6.05], u, () => osContenido(c, t));
    }, 0);
    pon([X2, 0, ZD], () => {
      escritorio(c, X2, 0, 3.4, 1.7);
      pantalla(c, t);
      tecladoRaton(c, t);
      const b = bolaOS(t); if (b) bolaW(c, b);
      const so = sobreOS(t); if (so) sobre(c, so);
      selloOS(c, t);
    }, .3);
  }
  obj.sort((p, q) => q.z - p.z);
  for (const o of obj) o.f();
  polvo(c, t);

  // ---------- lo que va escrito ----------
  titulo(c, t, ev.tu - .05, ev.examen - .2, "¿tu trabajo?", 300, 132, TINTA, true);
  titulo(c, t, ev.rli - .05, ev.pagaria - .3, "Remote Labor Index", 290, 112, TINTA, false);
  titulo(c, t, ev.pagaria - .05, ev.salio - .15, "¿pagaría", 230, 116, TINTA, true);
  titulo(c, t, ev.sin - .05, ev.salio - .15, "sin objeciones?", 350, 116, ACENTO, true);
  titulo(c, t, ev.lecturas - .05, ev.una - .25, "dos lecturas", 250, 124, TINTA, true);
  titulo(c, t, ev.una - .05, ev.dos - .3, "1", 230, 150, ACENTO, true);
  titulo(c, t, ev.nosirve - .05, ev.dos - .3, "no sirven para un cliente", 345, 92, TINTA, true);
  titulo(c, t, ev.dos - .05, ev.os - .3, "2", 230, 150, ACENTO, true);
  titulo(c, t, ev.enunaño - .05, ev.os - .3, "en un año", 345, 104, TINTA, true);
  titulo(c, t, ev.osw - .05, ev.agentes - .4, "OSWorld", 300, 130, TINTA, false);
  titulo(c, t, ev.pedazos - .05, ev.muchos + .9, "pedazos", 290, 150, ACENTO, true);
  titulo(c, t, ev.muchos - .05, ev.quieres - .2, "de muchos puestos", 420, 104, TINTA, true);
  // «no preguntes si te va a quitar el trabajo»: la pregunta se escribe y se tacha
  const q = smooth(prog(t, ev.nopreg + .1, ev.nopreg + .35)) * (1 - smooth(prog(t, ev.preg + .1, ev.preg + .4)));
  if (q > 0) {
    texto(c, "¿me va a quitar", 530, 250, { fuente: serif(104, true), color: TINTA, alfa: q });
    texto(c, "el trabajo?", 530, 365, { fuente: serif(104, true), color: TINTA, alfa: q });
    const tk = ease.outCubic(prog(t, ev.tacha, ev.tacha + .3));
    if (tk > 0) { c.save(); c.globalAlpha = q; c.strokeStyle = ACENTO; c.lineWidth = 11; c.lineCap = "round"; linea(c, 175, 222, 175 + 720 * tk, 222 - 8 * tk); linea(c, 285, 336, 285 + 500 * clamp(tk * 1.4 - .4), 336 - 6 * tk); c.restore(); }
  }
  titulo(c, t, ev.cuatro - .05, ev.corre + .6, "las cuatro preguntas", 250, 108, TINTA, true);
  titulo(c, t, ev.esos - .05, ev.dur + 1, "esos ya no", 230, 124, TINTA, true);
  titulo(c, t, ev.tuyos - .1, ev.dur + 1, "son tuyos", 360, 132, ACENTO, true);
  void resorte; void mono; void tramos;
}

export const Pieza: React.FC = () => <Lienzo dibuja={(c, t) => dibuja(c, t)} preparar={() => ({})} />;
