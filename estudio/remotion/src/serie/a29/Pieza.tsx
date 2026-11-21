// Serie 2, capítulo 29 (a29): ataques. Una maqueta de papel sobre una mesa, con cámara 3D proyectada a Canvas 2D.
// La maqueta es un tablero en espiral de 32 casillas: la red SIMULADA del AI Security Institute del Reino Unido.
// La bola con manos lo recorre paso por paso hasta la meta. Luego, diez intentos: en abril llegan tres; con una
// versión más nueva, seis. La cámara se va a la derecha de la mesa: un reloj de arena que se duplica (uno, dos,
// cuatro, ocho) y la línea de los modelos más recientes por encima de la tendencia. De vuelta en el tablero, los
// modelos abiertos son una fila de bolas blancas en la misma pista, unos meses atrás, que llega a donde estaban las
// negras y se multiplica. El freno: la música se detiene, todo se queda quieto y una balanza queda pareja. La
// maqueta no tiene defensores; a su izquierda, un edificio real con guardias de papel y un signo de interrogación.
// Un calendario se tacha solo. La cámara sube al muro de a23 (los mismos 6,120 agujeros y 516 parches): la defensa
// encuentra rápido, pero la fila de espera es una mano humana que tapa uno por uno. Cierra con la carrera entre
// agujeros y parches, empatada; la pista de música termina en ese mismo cuadro.
// Todos los instantes vienen de eventos.json, que escribe partitura.py: dibujo y sonido son los mismos números.
import React from "react";
import { camara, clamp, ease, guionCamara, lerp, mezclaVista, prog, resorte, smooth, texto } from "../../kit";
import type { Cam, Vista } from "../../kit";
import { ACENTO, bola, GRIS, Lienzo, mono, PAPEL, serif, sombra, TINTA } from "../../marca";
import { agente, brazo } from "../../personaje";
import duracion from "./duracion.json";
import E0 from "./eventos.json";

export const DURACION = duracion.dur;
type Ctx = CanvasRenderingContext2D;
type V3 = [number, number, number];
type Corredor = { t0: number; dt: number; para: number; cae?: number; llega?: number };
const E = E0;
const C1 = E0.c1 as Corredor[], C2 = E0.c2 as Corredor[];

const TAU = Math.PI * 2, PI = Math.PI;
const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * TAU + f);
const ventana = (t: number, a: number, b: number, fi = .25, fo = .3) => smooth(prog(t, a, a + fi)) * (1 - smooth(prog(t, b, b + fo)));
let FR = 0;
/** Ruido de dibujo a mano: cambia 10 veces por segundo. */
const hsh = (n: number) => { const s = Math.sin(n * 12.9898 + FR * 78.233) * 43758.5453; return s - Math.floor(s) - .5; };
/** Azar fijo (no cambia con el tiempo), 0..1. Es la misma función de a23: el muro sale idéntico. */
const fijo = (n: number) => { const s = Math.sin(n * 91.345 + 7.13) * 43758.5453; return s - Math.floor(s); };
/** Como kit.texto, pero multiplica por la opacidad del grupo. */
const tx = (c: Ctx, s: string, x: number, y: number, o: Parameters<typeof texto>[4]) => texto(c, s, x, y, { ...o, alfa: (o.alfa ?? 1) * c.globalAlpha });
const HOJA = "#FDFCF8";

// =====================================================================================================
// cámara 3D (kit.camara) y primitivas con temblor de dibujo
// =====================================================================================================
let K: Cam = camara({ tx: 0, ty: 0, tz: 0, yaw: 0, pitch: 1, dist: 1500 });
const P = (x: number, y: number, z: number) => K.p(x, y, z);
const prof = (x: number, y: number, z: number) => { const q = K.p(x, y, z); return q ? q.zc : -1; };
const jit = (x: number, y: number, z: number, k: number) => 1.2 * hsh(x * .173 + y * .311 + z * .277 + k * 17.1);
type Col = { top: string; front: string; side: string };
function poly(c: Ctx, pts: V3[], fill: string | null, stroke: string | null = TINTA, lw = 2.5) {
  const Q = pts.map((p) => P(p[0], p[1], p[2]));
  if (Q.some((q) => !q)) return;
  c.beginPath();
  Q.forEach((q, i) => { const x = q!.x + jit(pts[i][0], pts[i][1], pts[i][2], 0), y = q!.y + jit(pts[i][0], pts[i][1], pts[i][2], 1); if (i) c.lineTo(x, y); else c.moveTo(x, y); });
  c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.lineJoin = "round"; c.stroke(); }
}
function caja(c: Ctx, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, col: Col, lw = 2.5) {
  const [cx, cy, cz] = K.pos;
  if (cx < x0) poly(c, [[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]], col.side, TINTA, lw);
  if (cx > x1) poly(c, [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], col.side, TINTA, lw);
  if (cy < y0) poly(c, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], col.front, TINTA, lw);
  if (cy > y1) poly(c, [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], col.front, TINTA, lw);
  if (cz > z1) poly(c, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], col.top, TINTA, lw);
}
/** Dibuja en 2D (0..W, 0..H, y local hacia abajo = hacia la cámara) sobre un plano horizontal del mundo. */
function enPlano(c: Ctx, o: V3, W: number, H: number, dib: (c: Ctx) => void) {
  const A = P(o[0], o[1], o[2]), B = P(o[0] + W / 2, o[1], o[2]), C = P(o[0], o[1] - H / 2, o[2]);
  if (!A || !B || !C) return;
  c.save(); c.transform((B.x - A.x) / (W / 2), (B.y - A.y) / (W / 2), (C.x - A.x) / (H / 2), (C.y - A.y) / (H / 2), A.x, A.y);
  c.translate(-W / 2, -H / 2); dib(c); c.restore();
}

// =====================================================================================================
// textos de papel
// =====================================================================================================
/** Etiqueta de papel con un texto (la misma de a23). */
function etiqueta(c: Ctx, t: number, ini: number, fin: number, s: string, x: number, y: number, px: number, color = TINTA, it = true, gir = -.02) {
  const a = smooth(prog(t, ini - .04, ini + .16)) * (1 - smooth(prog(t, fin, fin + .22)));
  if (a <= 0) return;
  const sube = (1 - ease.outBack(prog(t, ini - .04, ini + .32))) * 30;
  c.save(); c.globalAlpha *= a; c.translate(x, y + sube); c.rotate(gir);
  c.font = serif(px, it);
  const w = c.measureText(s).width + px * .8, h = px * 1.32;
  c.fillStyle = "rgba(20,18,14,.16)"; c.fillRect(-w / 2 + 8, -h * .72 + 10, w, h);
  c.fillStyle = HOJA; c.strokeStyle = "rgba(17,17,17,.6)"; c.lineWidth = 2.5;
  c.beginPath(); c.rect(-w / 2, -h * .72, w, h); c.fill(); c.stroke();
  tx(c, s, 0, 0, { fuente: serif(px, it), color });
  c.restore();
}
/** Texto que entra con la voz y se va solo (respeta la opacidad del grupo). */
function rot(c: Ctx, t: number, ini: number, fin: number, s: string, y: number, px: number, color = TINTA, it = false, x = 540, fuente?: string) {
  const a = smooth(prog(t, ini - .04, ini + .14)) * (1 - smooth(prog(t, fin, fin + .22)));
  if (a > 0) tx(c, s, x, y + (1 - ease.outCubic(prog(t, ini - .04, ini + .3))) * 18, { fuente: fuente ?? serif(px, it), color, alfa: a });
}
function polvo(c: Ctx, t: number, alfa: number) {
  c.fillStyle = TINTA;
  for (let i = 0; i < 46; i++) {
    const x0 = fijo(i * 3.1) * 1200 - 60, y0 = fijo(i * 5.7) * 2060, v = 14 + fijo(i * 1.3) * 40, f = fijo(i * 9.1) * 6.3, z = 1.6 + fijo(i * 2.2) * 3;
    const y = ((y0 - t * v) % 2060 + 2060) % 2060 - 70, x = x0 + Math.sin(t * .5 + f) * 30;
    c.globalAlpha = alfa * (.06 + fijo(i * 4.4) * .14); c.fillRect(x, y, z, z);
  }
  c.globalAlpha = 1;
}
const CREDITO = "AI Security Institute · Reino Unido";
const GRIS2 = "#66635C";

// =====================================================================================================
// el tablero: espiral de 32 casillas sobre una base de cartón, meta al centro
// =====================================================================================================
const ST = 150, HT = 66, ZB = 24, ZT = 40, ZM = 60, RB = 30, BASE = 520;
const CEL: [number, number][] = (() => {
  const o: [number, number][] = [];
  for (let c = 0; c < 6; c++) o.push([c, 0]);
  for (let r = 1; r < 6; r++) o.push([5, r]);
  for (let c = 4; c >= 0; c--) o.push([c, 5]);
  for (let r = 4; r >= 1; r--) o.push([0, r]);
  for (let c = 1; c <= 4; c++) o.push([c, 1]);
  for (let r = 2; r <= 4; r++) o.push([4, r]);
  for (let c = 3; c >= 1; c--) o.push([c, 4]);
  for (let r = 3; r >= 2; r--) o.push([1, r]);
  return o;
})();
const PT = CEL.map(([cc, r]) => [(cc - 2.5) * ST, (r - 2.5) * ST] as [number, number]);
const SALIDA: [number, number] = [PT[0][0], PT[0][1] - 200];
const COL_BASE: Col = { top: "#E4DCCB", front: "#CDC3AF", side: "#C2B8A3" };
const COL_CAS: Col = { top: HOJA, front: "#E6E0D3", side: "#D9D2C4" };
const COL_META: Col = { top: "#F3E9D9", front: "#DCCFB9", side: "#D0C2AB" };
const tile = (i: number): V3 => (i >= 32 ? [0, 0, ZM] : [PT[i][0], PT[i][1], ZT]);

// ---------- el recorrido del gancho ----------
const durHook = (k: number) => (k === 31 ? .3 : k < 7 ? .24 : Math.min(.14, (E.h0[k + 1] ?? 9) - E.h0[k] - .01));
const pisada = (i: number) => (i === 0 ? -1 : E.h0[i - 1] + durHook(i - 1));          // cuándo cae en la casilla i
const META_LLEGA = E.h0[31] + .3;

type Ruta = { saltos: number[]; dur: (k: number) => number; alto: (k: number) => number; lugar: (i: number) => V3 };
/** Salto k: de i = k-1 a i = k (i = -1 es la salida). */
function enRuta(R: Ruta, t: number) {
  let n = 0;
  while (n < R.saltos.length && t >= R.saltos[n]) n++;
  if (n === 0) return { p: R.lugar(-1), aire: 0, i: -1 };
  const k = n - 1, d = R.dur(k), f = clamp((t - R.saltos[k]) / d);
  if (f >= 1) return { p: R.lugar(k), aire: 0, i: k };
  const a = R.lugar(k - 1), b = R.lugar(k), e = ease.inOutSine(f);
  return { p: [lerp(a[0], b[0], e), lerp(a[1], b[1], e), lerp(a[2], b[2], e) + R.alto(k) * 4 * f * (1 - f)] as V3, aire: Math.sin(PI * f), i: k - 1 + f };
}
const RUTA_HOOK: Ruta = { saltos: E.h0, dur: durHook, alto: (k) => (k === 31 ? 110 : k < 7 ? 70 : 40), lugar: (i) => tile(i + 1) };

/** Dónde queda cada corredor: un hueco propio en la salida, un desvío dentro de la casilla y un lugar en la meta. */
function hueco(j: number) {
  const a = fijo(j * 3.7) * TAU, r = 10 + fijo(j * 5.1) * 16;
  return { ox: Math.cos(a) * r, oy: Math.sin(a) * r * .7, sx: SALIDA[0] + ((j % 5) - 2) * 66, sy: SALIDA[1] + 30 - Math.floor(j / 5) * 70 };
}
function metaSlot(r: number): [number, number] {
  if (r === 0) return [-10, -8];
  if (r < 6) return [Math.cos(r * 1.26 + .4) * 70, Math.sin(r * 1.26 + .4) * 66];
  return [Math.cos(r * 1.57 + 1.1) * 104, Math.sin(r * 1.57 + 1.1) * 100];
}
function rutaCorredor(b: Corredor, j: number, rango: number): Ruta {
  const h = hueco(j), saltos: number[] = [];
  const n = b.para;
  for (let k = 0; k < n; k++) saltos.push(b.t0 + k * b.dt);
  if (b.llega !== undefined) saltos.push(b.llega);
  const ms = metaSlot(rango);
  return {
    saltos, dur: (k) => (k === 32 ? .2 : b.dt * .82), alto: (k) => (k === 32 ? 90 : 16 + b.dt * 160),
    lugar: (i) => (i < 0 ? [h.sx, h.sy, 0] : i >= 32 ? [ms[0], ms[1], ZM] : [PT[i][0] + h.ox, PT[i][1] + h.oy, ZT]),
  };
}
function rangos(C: Corredor[]) {
  const ok = C.map((b, j) => ({ j, l: b.llega ?? 1e9 })).filter((x) => x.l < 1e8).sort((a, b) => a.l - b.l);
  const r = C.map(() => 0);
  ok.forEach((x, k) => { r[x.j] = k; });
  return r;
}
const R1 = rangos(C1), R2 = rangos(C2);
const RUTAS1 = C1.map((b, j) => rutaCorredor(b, j, R1[j])), RUTAS2 = C2.map((b, j) => rutaCorredor(b, j, R2[j]));
const llegados = (C: Corredor[], t: number) => C.filter((b) => b.llega !== undefined && t >= b.llega + .2).length;

// ---------- los modelos de la fila de adelante (negros) y la de atrás (blancos, abiertos) ----------
const NEGRAS = [28, 29, 30];
const BLANCAS = [17, 18, 19, 20, 21];
const MULTITUD = Array.from({ length: 26 }, (_, k) => ({ i: Math.floor(fijo(k * 7.3 + .2) * 32), ox: (fijo(k * 2.9) - .5) * 70, oy: (fijo(k * 4.1) - .5) * 60, t: E.cualquiera + .05 + k * .028 }));

// =====================================================================================================
// personajes
// =====================================================================================================
type Pose = { aire?: number; fase?: number; color?: "negra" | "blanca" | "gris"; giro?: number; alfa?: number; manos?: "arriba" | "lado" | "fiesta"; escala?: number };
/** La bola con manos, puesta en el mundo 3D: (wx, wy, wz) es el punto donde toca el piso. */
function bolaMundo(c: Ctx, wx: number, wy: number, wz: number, piso: number, r: number, o: Pose = {}) {
  const C = P(wx, wy, wz + r), F = P(wx, wy, piso);
  if (!C || !F) return;
  const R = r * C.s * (o.escala ?? 1), g = R / 90;
  if (R < 1) return;
  c.save(); c.globalAlpha *= o.alfa ?? 1;
  const alto = Math.max(0, wz - piso);
  sombra(c, F.x, F.y, 150 * g * (1 + alto * .004), .3 / (1 + alto * .02));
  if (o.giro) { const B = P(wx, wy, wz)!; c.translate(B.x, B.y); c.rotate(o.giro); c.translate(-B.x, -B.y); }
  const up = o.aire ?? 0, w = o.fase ?? 0;
  let m1: [number, number] = [C.x - R * 1.6 + R * .3 * up, C.y - R * .3 - R * 1.1 * up + R * .16 * Math.sin(w)];
  let m2: [number, number] = [C.x + R * 1.6 - R * .3 * up, C.y - R * .4 - R * 1.1 * up + R * .16 * Math.cos(w * 1.2)];
  if (o.manos === "arriba" || o.manos === "fiesta") { const s = o.manos === "fiesta" ? Math.sin(w * 2.4) * R * .3 : 0; m1 = [C.x - R * 1.15, C.y - R * 1.9 + s]; m2 = [C.x + R * 1.15, C.y - R * 1.9 - s]; }
  const color = o.color ?? "negra";
  if (color === "negra") agente(c, C.x, C.y, R, m1, m2, { abre1: .6, abre2: .6 });
  else {
    const tinta = color === "gris" ? "#8C8A83" : TINTA;
    brazo(c, C.x - 54 * g, C.y - 50 * g, m1[0], m1[1], 90 * g, .6, tinta, 1, g);
    brazo(c, C.x + 60 * g, C.y - 30 * g, m2[0], m2[1], -100 * g, .6, tinta, 1, g);
    if (color === "gris") { c.globalAlpha *= .55; bola(c, C.x, C.y, R); }
    else {
      const gr = c.createRadialGradient(C.x - R * .34, C.y - R * .38, R * .05, C.x, C.y, R);
      gr.addColorStop(0, "#FFFFFF"); gr.addColorStop(.55, "#EEEAE0"); gr.addColorStop(1, "#C9C2B2");
      c.fillStyle = gr; c.beginPath(); c.arc(C.x, C.y, R, 0, TAU); c.fill();
      c.strokeStyle = TINTA; c.lineWidth = Math.max(1.5, R * .09); c.stroke();
    }
  }
  c.restore();
}

/** Guardia de papel recortado: figura plana parada en su base. (x, y) = los pies; s = px por unidad. */
function guardia(c: Ctx, x: number, y: number, s: number, t: number, fase: number, alfa = 1, punteado = false, mira = 1) {
  if (alfa <= .01 || s <= .01) return;
  c.save(); c.translate(x, y); c.scale(s * mira, s); c.globalAlpha *= alfa; c.lineJoin = "round"; c.lineCap = "round";
  const p = punteado ? 0 : Math.sin(t * 7 + fase);
  c.strokeStyle = punteado ? ACENTO : TINTA; c.lineWidth = 5;
  if (punteado) c.setLineDash([9, 9]);
  if (!punteado) { c.fillStyle = "rgba(20,18,14,.18)"; c.beginPath(); c.ellipse(0, 0, 34, 9, 0, 0, TAU); c.fill(); }
  c.beginPath(); c.moveTo(-6, -62); c.lineTo(-12 + p * 9, 0); c.moveTo(6, -62); c.lineTo(12 - p * 9, 0); c.stroke();
  c.fillStyle = punteado ? "rgba(0,0,0,0)" : "#3B4250";
  c.beginPath(); c.roundRect(-24, -122, 48, 66, 12); c.fill(); c.stroke();
  c.fillStyle = punteado ? "rgba(0,0,0,0)" : HOJA;
  c.beginPath(); c.arc(0, -140, 17, 0, TAU); c.fill(); c.stroke();
  c.fillStyle = punteado ? "rgba(0,0,0,0)" : "#3B4250";
  c.beginPath(); c.rect(-18, -162, 36, 12); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(16, -152); c.lineTo(30, -150); c.stroke();
  // brazo con linterna
  c.beginPath(); c.moveTo(18, -110); c.lineTo(44, -84 + p * 4); c.stroke();
  if (!punteado) { c.fillStyle = "#E9D9A8"; c.beginPath(); c.rect(40, -94 + p * 4, 20, 12); c.fill(); c.stroke(); }
  c.setLineDash([]);
  c.restore();
}

// =====================================================================================================
// objetos sueltos: reloj de arena, bandera, balanza, calendario, mano humana, parche
// =====================================================================================================
function reloj(c: Ctx, x: number, y: number, h: number, t: number, fase: number, alfa = 1, giro = 0, arenaFija = -1) {
  if (h < 3 || alfa <= .01) return;
  const w = h * .6, cap = h * .1, gh = h - 2 * cap, lw = Math.max(1.3, h * .028);
  c.save(); c.translate(x, y); c.globalAlpha *= alfa; c.lineJoin = "round";
  if (giro) { c.translate(0, -h / 2); c.rotate(giro); c.translate(0, h / 2); }
  const gx = w * .4, nk = w * .07, top = -h + cap, bot = -cap, mid = -h / 2;
  const vid = () => {
    c.beginPath(); c.moveTo(-gx, top);
    c.bezierCurveTo(-gx, mid - gh * .2, -nk, mid - gh * .08, -nk, mid); c.bezierCurveTo(-nk, mid + gh * .08, -gx, mid + gh * .2, -gx, bot);
    c.lineTo(gx, bot);
    c.bezierCurveTo(gx, mid + gh * .2, nk, mid + gh * .08, nk, mid); c.bezierCurveTo(nk, mid - gh * .08, gx, mid - gh * .2, gx, top);
    c.closePath();
  };
  vid(); c.fillStyle = "rgba(214,226,224,.55)"; c.fill();
  const k = arenaFija >= 0 ? arenaFija : ((t / 3.6 + fase) % 1 + 1) % 1;
  c.save(); vid(); c.clip();
  c.fillStyle = "#D6AE64";
  const arriba = (gh / 2) * .78 * (1 - k);
  c.fillRect(-gx, mid - arriba, 2 * gx, arriba);
  const ab = (gh / 2) * .78 * k;
  c.beginPath(); c.moveTo(-gx, bot); c.lineTo(-gx, bot - ab * .5); c.quadraticCurveTo(0, bot - ab * 1.5, gx, bot - ab * .5); c.lineTo(gx, bot); c.closePath(); c.fill();
  if (k < .97) c.fillRect(-lw * .4, mid, lw * .8, bot - mid - ab * .9);
  c.restore();
  vid(); c.strokeStyle = TINTA; c.lineWidth = lw; c.stroke();
  c.strokeStyle = "rgba(255,255,255,.8)"; c.lineWidth = lw * 1.4; c.beginPath(); c.moveTo(-gx * .62, top + gh * .08); c.quadraticCurveTo(-gx * .75, mid - gh * .2, -nk * 2.2, mid - gh * .06); c.stroke();
  c.fillStyle = "#B99569"; c.strokeStyle = TINTA; c.lineWidth = lw;
  c.beginPath(); c.rect(-w / 2, -h, w, cap); c.fill(); c.stroke();
  c.beginPath(); c.rect(-w / 2, -cap, w, cap); c.fill(); c.stroke();
  c.lineWidth = lw * 1.3; c.beginPath(); c.moveTo(-w * .44, top); c.lineTo(-w * .44, bot); c.moveTo(w * .44, top); c.lineTo(w * .44, bot); c.stroke();
  c.restore();
}
function bandera(c: Ctx, t: number, x: number, y: number, z: number, alto: number, alfa: number) {
  const A = P(x, y, z), B = P(x, y, z + alto);
  if (!A || !B || alfa <= .01) return;
  c.save(); c.globalAlpha *= alfa;
  c.strokeStyle = TINTA; c.lineWidth = Math.max(2, 6 * A.s); c.lineCap = "round";
  c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke();
  const L = 92 * B.s, H = 58 * B.s;
  c.fillStyle = ACENTO; c.strokeStyle = TINTA; c.lineWidth = Math.max(1.5, 3 * B.s); c.beginPath();
  for (let i = 0; i <= 10; i++) { const u = i / 10; c.lineTo(B.x + L * u, B.y + Math.sin(t * 6 - u * 4) * 7 * B.s * u + H * .5 * u * u * 0); }
  for (let i = 10; i >= 0; i--) { const u = i / 10; c.lineTo(B.x + L * u, B.y + H * (1 - u * .45) + Math.sin(t * 6 - u * 4) * 7 * B.s * u); }
  c.closePath(); c.fill(); c.stroke();
  c.restore();
}
/** Mano humana de papel (la misma de a23). pose: 0 abierta, 1 señala, 2 sostiene. */
function manoH(c: Ctx, x: number, y: number, a: number, s: number, pose = 0, alfa = 1) {
  if (alfa <= .01) return;
  c.save(); c.translate(x, y); c.rotate(a); c.scale(s, s); c.globalAlpha *= alfa;
  c.lineJoin = "round"; c.lineCap = "round";
  c.fillStyle = "#CFCAC0"; c.strokeStyle = TINTA; c.lineWidth = 5;
  c.beginPath(); c.roundRect(-46, 0, 92, 120, 8); c.fill(); c.stroke();
  c.fillStyle = HOJA;
  const dedo = (dx: number, largo: number, ancho = 17) => { c.beginPath(); c.roundRect(dx - ancho / 2, -86 - largo, ancho, largo + 30, ancho / 2); c.fill(); c.stroke(); };
  if (pose === 1) { dedo(-14, 78); for (const dx of [4, 20, 34]) { c.beginPath(); c.roundRect(dx - 9, -106, 18, 34, 9); c.fill(); c.stroke(); } }
  else if (pose === 2) { for (const dx of [-26, -9, 8, 25]) { c.beginPath(); c.roundRect(dx - 9, -112, 18, 40, 9); c.fill(); c.stroke(); } }
  else { dedo(-27, 50); dedo(-9, 62); dedo(9, 58); dedo(27, 44, 16); }
  c.beginPath(); c.roundRect(-40, -94, 80, 98, 22); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-36, -30); c.quadraticCurveTo(-70, -50, -72, -86); c.lineTo(-56, -92); c.quadraticCurveTo(-50, -62, -30, -54); c.fill(); c.stroke();
  c.restore();
}
/** Parche: un cuadro de papel con dos tiras de cinta encima (el mismo de a23). */
function parche(c: Ctx, x: number, y: number, w: number, a: number, k = 1) {
  if (k <= 0) return;
  const z = k < 1 ? lerp(1.8, 1, ease.outBack(k)) : 1;
  c.save(); c.translate(x, y); c.rotate(a); c.scale(z, z); c.globalAlpha *= clamp(k * 3);
  c.fillStyle = HOJA; c.strokeStyle = TINTA; c.lineWidth = Math.max(1.2, w * .07);
  c.beginPath(); c.rect(-w / 2, -w / 2, w, w); c.fill(); c.stroke();
  c.fillStyle = "rgba(150,128,88,.6)";
  c.save(); c.rotate(.78); c.fillRect(-w * .72, -w * .12, w * 1.44, w * .24); c.rotate(-1.56); c.fillRect(-w * .72, -w * .12, w * 1.44, w * .24); c.restore();
  c.restore();
}
/** La bola con una lámpara (la de a23): el haz apunta a lo que encuentra. */
function lampara(c: Ctx, t: number, bx: number, by: number, ox: number, oy: number, alfa: number, r = 80) {
  if (alfa <= .01) return;
  c.save(); c.globalAlpha *= alfa;
  const g = r / 80, hx = bx + 110 * g, hy = by - 120 * g, a = Math.atan2(oy - hy, ox - hx);
  const L = Math.hypot(ox - hx, oy - hy) + 50, w = .15;
  const gr = c.createLinearGradient(hx, hy, hx + Math.cos(a) * L, hy + Math.sin(a) * L);
  gr.addColorStop(0, "rgba(255,236,190,.55)"); gr.addColorStop(1, "rgba(255,236,190,.1)");
  c.fillStyle = gr; c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + Math.cos(a - w) * L, hy + Math.sin(a - w) * L); c.lineTo(hx + Math.cos(a + w) * L, hy + Math.sin(a + w) * L); c.closePath(); c.fill();
  agente(c, bx, by, r, [bx - 120 * g, by - 40 * g + Math.sin(t * 3) * 10 * g], [hx, hy], { piso: by + 84 * g, sombra: .3, abre1: .6, abre2: .1 });
  c.save(); c.translate(hx, hy); c.rotate(a); c.scale(g, g);
  c.fillStyle = "#3a3a38"; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.rect(-18, -15, 58, 30); c.fill(); c.stroke();
  c.fillStyle = "#FFF3CF"; c.beginPath(); c.rect(36, -21, 14, 42); c.fill(); c.stroke();
  c.restore();
  c.restore();
}

// =====================================================================================================
// cámara del mundo
// =====================================================================================================
const X0 = 1550, SP = 205, HR = 92;                       // las torres de relojes de arena, a la derecha
const ED = { x0: -1330, x1: -880, y0: -80, y1: 250, z1: 620 };   // el edificio real, a la izquierda
const V: Record<string, Vista> = {
  tablero: { tx: 0, ty: 0, tz: 0, yaw: 0, pitch: 1.05, dist: 1620 },
  carrera: { tx: 40, ty: -20, tz: 0, yaw: 0, pitch: 1.1, dist: 1450 },
  carrera2: { tx: 40, ty: 30, tz: 0, yaw: -.04, pitch: 1.13, dist: 1370 },
  carrera3: { tx: 50, ty: -30, tz: 0, yaw: .05, pitch: 1.04, dist: 1500 },
  brecha: { tx: -90, ty: 60, tz: 0, yaw: -.22, pitch: .92, dist: 1300 },
  multitud: { tx: 10, ty: 0, tz: 0, yaw: .08, pitch: 1.04, dist: 1700 },
  r0: { tx: X0 + 6, ty: 0, tz: 46, yaw: -.06, pitch: .22, dist: 430 },
  r1: { tx: X0 + .5 * SP, ty: 0, tz: 96, yaw: -.03, pitch: .2, dist: 760 },
  r2: { tx: X0 + SP, ty: 0, tz: 190, yaw: -.02, pitch: .19, dist: 1060 },
  r3: { tx: X0 + 1.5 * SP, ty: 0, tz: 370, yaw: 0, pitch: .18, dist: 1430 },
  r4: { tx: X0 + 1.75 * SP, ty: 0, tz: 500, yaw: .02, pitch: .17, dist: 1660 },
  tablero2: { tx: -30, ty: 40, tz: 0, yaw: .03, pitch: 1.0, dist: 1600 },
  vacio: { tx: 0, ty: 0, tz: 0, yaw: -.05, pitch: .88, dist: 1820 },
  edificio: { tx: -500, ty: 140, tz: 330, yaw: 0, pitch: .7, dist: 2400 },
};
function vista(t: number): Vista {
  const k = (tt: number, v: Vista, dur = 1.1, curva: (x: number) => number = ease.inOutCubic) => ({ t: tt, v, dur, curva });
  let v = guionCamara(t, [
    k(0, V.tablero),
    k(E.divide - .5, V.carrera, 1.2), k(E.divide + .8, V.carrera2, 3.2, ease.inOutSine), k(E.reset - .1, V.carrera3, 1.0), k(E.reset + .9, V.carrera2, 2.4, ease.inOutSine),
    k(E.pan1, V.r0, 1.05),
    k(E.reloj[1] - .2, V.r1, .75, ease.outCubic), k(E.reloj[2] - .2, V.r2, .75, ease.outCubic), k(E.reloj[3] - .2, V.r3, .85, ease.outCubic),
    k(E.recientes - .25, V.r4, 1.0), k(E.pan2, V.tablero2, 1.35), k(E.atras - .5, V.brecha, 1.6, ease.inOutSine), k(E.enmeses - .1, V.multitud, 1.3), k(E.sindef - .35, V.vacio, 1.1), k(E.pan3, V.edificio, 1.5),
  ]);
  if (t < 3.3) {
    // el gancho: la cámara va pegada a la bola (posición suavizada, sin los botes) y luego se aleja
    const H = E.h0; let u = 0;
    if (t > H[0]) { u = 32; for (let k = 0; k < 31; k++) if (t < H[k + 1]) { u = k + (t - H[k]) / (H[k + 1] - H[k]); break; } }
    const a = tile(Math.floor(u)), b = tile(Math.min(32, Math.floor(u) + 1)), f = u - Math.floor(u);
    const sigue: Vista = { tx: lerp(a[0], b[0], f) + 60, ty: lerp(a[1], b[1], f) + 70, tz: 40, yaw: -.14 + .04 * t, pitch: .7, dist: 500 };
    v = mezclaVista(sigue, v, ease.inOutCubic(prog(t, 1.2, 3.25)));
  }
  return { ...v, yaw: v.yaw + .014 * vaiven(t, 7.3), pitch: v.pitch + .01 * vaiven(t, 5.1, 1), dist: v.dist * (1 + .014 * vaiven(t, 6.2, 2)), tx: v.tx + 7 * vaiven(t, 4.4), ty: v.ty + 6 * vaiven(t, 5.7, 1) };
}

// =====================================================================================================
// el mundo de la mesa
// =====================================================================================================
type Item = { z: number; f: () => void };
function mundo(c: Ctx, t: number) {
  K = camara(vista(t), 540, 1000, 1250);
  const tb = Math.min(t, E.freno0 - .05);                 // el tiempo de las bolas: el freno lo detiene
  const items: Item[] = [];

  // ---------- la maqueta ----------
  caja(c, -BASE, BASE, -BASE, BASE, 0, ZB, COL_BASE, 3);
  const borra = 1 - smooth(prog(t, E.divide, E.divide + .5));
  const orden = PT.map((_, i) => i).sort((a, b) => prof(PT[b][0], PT[b][1], ZT) - prof(PT[a][0], PT[a][1], ZT));
  const meta = () => {
    caja(c, -142, 142, -142, 142, ZB, ZM, COL_META, 2.5);
    enPlano(c, [0, 0, ZM], 260, 260, (g) => {
      g.strokeStyle = "rgba(192,68,42,.35)"; g.lineWidth = 4; g.setLineDash([10, 10]);
      g.beginPath(); g.arc(130, 130, 96, 0, TAU); g.stroke(); g.setLineDash([]);
    });
  };
  const dMeta = prof(0, 0, ZM);
  let metaHecha = false;
  for (const i of orden) {
    if (!metaHecha && prof(PT[i][0], PT[i][1], ZT) < dMeta) { meta(); metaHecha = true; }
    const [x, y] = PT[i];
    const ola = Math.sin(PI * clamp((t - E.ola - i * .021) / .28)) * 16;
    const pis = t < E.divide + .6 && t >= pisada(i) ? smooth(prog(t, pisada(i), pisada(i) + .12)) * borra : 0;
    const top = pis > 0 ? `rgba(${Math.round(lerp(253, 244, pis))},${Math.round(lerp(252, 214, pis))},${Math.round(lerp(248, 202, pis))},1)` : HOJA;
    caja(c, x - HT, x + HT, y - HT, y + HT, ZB, ZT + ola, { ...COL_CAS, top }, 2.5);
    enPlano(c, [x - HT * .52, y + HT * .5, ZT + ola], 70, 50, (g) => tx(g, String(i + 1), 35, 40, { fuente: mono(40), color: pis > .5 ? ACENTO : "#9C998F" }));
  }
  if (!metaHecha) meta();
  // la huella del camino: una línea punteada que une las casillas, para que se lea la espiral
  c.save(); c.strokeStyle = "rgba(17,17,17,.2)"; c.lineWidth = 3; c.setLineDash([4, 12]); c.lineCap = "round"; c.beginPath();
  for (let i = 0; i <= 32; i++) { const p = tile(i), q = P(p[0], p[1], p[2] + 1); if (q) { if (i) c.lineTo(q.x, q.y); else c.moveTo(q.x, q.y); } }
  c.stroke(); c.restore();

  // la bandera de la meta
  const kb = t < META_LLEGA ? smooth(prog(t, META_LLEGA - .5, META_LLEGA - .3)) * 0 + ease.outBack(prog(t, META_LLEGA - .05, META_LLEGA + .3)) : 1;
  items.push({ z: prof(96, 96, ZM), f: () => bandera(c, t, 96, 96, ZM, 170 * clamp(kb, 0, 1.2), clamp(kb * 3)) });

  // ---------- la bola del gancho ----------
  if (t < E.divide + .05) {
    let p: V3, aire = 0, manos: Pose["manos"] = undefined;
    if (t < E.regresa[0]) {
      const r = enRuta(RUTA_HOOK, t); p = r.p; aire = r.aire;
      if (t > META_LLEGA) { p = [p[0], p[1], p[2] + Math.abs(Math.sin((t - META_LLEGA) * 6)) * 26 * Math.exp(-(t - META_LLEGA) * 1.5)]; manos = "fiesta"; }
    } else {
      const f = clamp((t - E.regresa[0]) / (E.regresa[1] - E.regresa[0])), e = ease.inOutSine(f);
      p = [lerp(0, SALIDA[0], e), lerp(0, SALIDA[1] + 30, e), lerp(ZM, 0, e) + 340 * 4 * f * (1 - f)];
      aire = Math.sin(PI * f);
      if (f >= 1) p = [SALIDA[0], SALIDA[1] + 30, Math.abs(Math.sin((t - E.regresa[1]) * 7)) * 30 * Math.exp(-(t - E.regresa[1]) * 3)];
    }
    const piso = p[2] > ZM - 1 || Math.abs(p[0]) < 142 && Math.abs(p[1]) < 142 ? (Math.abs(p[0]) < 142 && Math.abs(p[1]) < 142 ? ZM : ZT) : Math.abs(p[0]) < BASE && Math.abs(p[1]) < BASE ? ZT : 0;
    const crece = t > E.divide - .12 ? 1 - smooth(prog(t, E.divide - .12, E.divide + .05)) : 1;
    items.push({ z: prof(p[0], p[1], p[2]) - 1, f: () => bolaMundo(c, p[0], p[1], p[2], Math.min(piso, p[2]), RB, { aire, fase: t * 3, manos, escala: crece }) });
  }

  // ---------- los dos lotes de diez intentos ----------
  const lote = (C: Corredor[], RU: Ruta[], ini: number, fin: number, entra: "divide" | "cae") => {
    if (t < ini || t > fin + .45) return;
    const sale = 1 - smooth(prog(t, fin, fin + .4));
    C.forEach((b, j) => {
      const R = RU[j], h = hueco(j);
      let { p, aire } = enRuta(R, t);
      let esc = 1;
      if (entra === "divide") { const k = prog(t, E.divide, E.divide + .32); esc = ease.outBack(k); if (k < 1) p = [lerp(SALIDA[0], h.sx, ease.outCubic(k)), lerp(SALIDA[1] + 30, h.sy, ease.outCubic(k)), p[2] + 60 * Math.sin(PI * k)]; }
      else { const k = prog(t, ini + j * .02, ini + j * .02 + .2); if (k < 1) p = [p[0], p[1], p[2] + (1 - ease.inCubic(k)) * 320]; }
      const cayo = b.cae !== undefined && t >= b.cae;
      const giro = cayo ? (j % 2 ? 1 : -1) * 1.35 * ease.outBack(prog(t, b.cae!, b.cae! + .3)) : 0;
      const llego = b.llega !== undefined && t >= b.llega + .2;
      const bote = llego ? Math.abs(Math.sin((t - b.llega! - .2) * 8 + j)) * 14 * Math.exp(-(t - b.llega! - .2) * 2.5) : 0;
      const enMeta = llego || (R.saltos.length === 33 && t >= R.saltos[32]);
      const piso = enMeta && llego ? ZM : p[0] >= -BASE && p[0] <= BASE && p[1] >= -BASE && p[1] <= BASE ? (llego ? ZM : ZT) : 0;
      const pz = p[2] + bote;
      items.push({ z: prof(p[0], p[1], p[2]) - 1, f: () => bolaMundo(c, p[0], p[1], pz, Math.min(piso, p[2]), RB * 1.05, { aire, fase: t * 3 + j, color: cayo ? "gris" : "negra", giro, alfa: sale, manos: llego ? "fiesta" : undefined, escala: esc }) });
    });
  };
  lote(C1, RUTAS1, E.divide, E.reset, "divide");
  lote(C2, RUTAS2, E.reset + .05, E.pan1 + 1.0, "cae");

  // ---------- los modelos de adelante y los abiertos ----------
  if (t > E.pan2 - .3) {
    const ka = smooth(prog(t, E.pan2 - .3, E.pan2 + .3));
    NEGRAS.forEach((i, j) => {
      const bt = Math.abs(Math.sin(tb * 4.2 + j * 1.3)) * 10;
      items.push({ z: prof(PT[i][0] - 22, PT[i][1] + 12, ZT) - 1, f: () => bolaMundo(c, PT[i][0] - 22, PT[i][1] + 12, ZT + bt, ZT, RB, { fase: tb * 3 + j, alfa: ka }) });
    });
    BLANCAS.forEach((i0, j) => {
      const ruta: Ruta = { saltos: Array.from({ length: 11 }, (_, k) => E.avanza[j] + k * E.avanza_dt), dur: () => E.avanza_dt * .85, alto: () => 34, lugar: (i) => { const q = tile(i0 + i + 1); return [q[0] + (q[2] === ZM ? 40 : 22), q[1] - (q[2] === ZM ? 60 : 10), q[2]]; } };
      const { p, aire } = enRuta(ruta, tb);
      const bt = aire > 0 ? 0 : Math.abs(Math.sin(tb * 3.6 + j * 2.1)) * 8;
      const piso = p[2] > ZM - 1 ? ZM : ZT;
      items.push({ z: prof(p[0], p[1], p[2]) - 1, f: () => bolaMundo(c, p[0], p[1], p[2] + bt, Math.min(piso, p[2]), RB * .92, { aire, fase: tb * 3 + j, color: "blanca", alfa: ka }) });
    });
    for (const m of MULTITUD) {
      if (t < m.t) continue;
      const k = ease.outBack(prog(t, m.t, m.t + .3), 2.2), q = tile(m.i);
      const bt = Math.abs(Math.sin(tb * 3.3 + m.ox)) * 7;
      items.push({ z: prof(q[0] + m.ox, q[1] + m.oy, ZT) - 1, f: () => bolaMundo(c, q[0] + m.ox, q[1] + m.oy, ZT + bt, ZT, RB * .74, { fase: tb * 3 + m.oy, color: "blanca", escala: clamp(k, 0, 1.3) }) });
    }
  }

  // ---------- los relojes de arena ----------
  if (t > E.reloj[0] - .5) {
    const n = [1, 2, 4, 8];
    for (let i = 0; i < 4; i++) for (let j = 0; j < n[i]; j++) {
      const t1 = E.reloj[i] + j * .055;
      if (t < t1 - (i === 0 ? .35 : 0)) continue;
      let x = X0 + i * SP, z = j * HR;
      if (i === 0) { const f = prog(t, t1 - .35, t1); z = lerp(380, 0, ease.inCubic(f)) + (t > t1 ? Math.abs(Math.sin((t - t1) * 9)) * 40 * Math.exp(-(t - t1) * 6) : 0); }
      else {
        const u = prog(t, t1, t1 + .36), src = Math.floor(j / 2), xs = X0 + (i - 1) * SP, zs = src * HR, e = ease.inOutCubic(u);
        x = lerp(xs, x, e); z = lerp(zs, z, e) + 150 * Math.sin(PI * u);
      }
      // el primero se voltea al decir «duración»: arranca el tiempo
      const g0 = E.duracion - .15, g1 = E.duracion + .3;
      const giro = i === 0 && t > g0 && t < g1 ? PI * ease.inOutCubic(prog(t, g0, g1)) : 0;
      if (i === 0 && t > g0 && t < g1) z += 50 * Math.sin(PI * prog(t, g0, g1));
      const arena = i === 0 && j === 0 ? (t < g1 ? .97 : ((t - g1) / 3.6) % 1) : -1;
      const xx = x, zz = z, fase = fijo(i * 10 + j);
      items.push({ z: prof(xx, 0, zz) - zz * .001, f: () => { const A = P(xx, 0, zz), B = P(xx, 0, zz + HR); if (A && B) reloj(c, A.x, A.y, A.y - B.y, t, fase, 1, giro, arena); } });
    }
  }

  // ---------- el edificio real y sus guardias ----------
  if (t > E.pan3 - 1) {
    items.push({ z: prof((ED.x0 + ED.x1) / 2, ED.y0, ED.z1 / 2), f: () => edificio(c, t) });
    for (let g = 0; g < 4; g++) {
      const [gx, gy, mira] = ronda((t * .055 + g * .25) % 1);
      items.push({ z: prof(gx, gy, 0) - 2, f: () => { const A = P(gx, gy, 0); if (A) guardia(c, A.x, A.y, A.s * 1.75, t, g * 1.7, smooth(prog(t, E.pan3 - .6, E.pan3)), false, mira); } });
    }
  }

  items.sort((a, b) => b.z - a.z).forEach((it) => it.f());

  // ---------- lo que se dibuja encima del mundo ----------
  encimaDelTablero(c, t);
  relojesEncima(c, t);
  realEncima(c, t);
}

/** El camino de los guardias: un rectángulo alrededor del edificio. Devuelve x, y y hacia dónde miran. */
function ronda(u: number): [number, number, number] {
  const m = 110, x0 = ED.x0 - m, x1 = ED.x1 + m, y0 = ED.y0 - m, y1 = ED.y1 + m;
  const w = x1 - x0, h = y1 - y0, L = 2 * (w + h);
  let d = u * L;
  if (d < w) return [x0 + d, y0, 1]; d -= w;
  if (d < h) return [x1, y0 + d, 1]; d -= h;
  if (d < w) return [x1 - d, y1, -1]; d -= w;
  return [x0, y1 - d, -1];
}
function edificio(c: Ctx, t: number) {
  const { x0, x1, y0, y1, z1 } = ED;
  caja(c, x0, x1, y0, y1, 0, z1, { top: "#E6E0D2", front: "#F3EFE5", side: "#DDD5C6" }, 3);
  const [px] = K.pos;
  // ventanas de la fachada y del costado que se ve
  for (let r = 0; r < 9; r++) for (let q = 0; q < 5; q++) {
    const wx0 = lerp(x0 + 30, x1 - 30, q / 5) + 8, wx1 = wx0 + (x1 - x0 - 60) / 5 - 16, wz0 = 110 + r * 52, wz1 = wz0 + 34;
    const luz = fijo(r * 7 + q * 3) > .55 ? "#F2D99A" : "#C9CFD2";
    poly(c, [[wx0, y0 - .5, wz0], [wx1, y0 - .5, wz0], [wx1, y0 - .5, wz1], [wx0, y0 - .5, wz1]], luz, TINTA, 1.5);
  }
  if (px > x1) for (let r = 0; r < 9; r++) for (let q = 0; q < 3; q++) {
    const wy0 = lerp(y0 + 30, y1 - 30, q / 3) + 8, wy1 = wy0 + (y1 - y0 - 60) / 3 - 16, wz0 = 110 + r * 52, wz1 = wz0 + 34;
    poly(c, [[x1 + .5, wy0, wz0], [x1 + .5, wy1, wz0], [x1 + .5, wy1, wz1], [x1 + .5, wy0, wz1]], fijo(r * 5 + q * 11) > .6 ? "#EBD08E" : "#BFC5C8", TINTA, 1.5);
  }
  const xm = (x0 + x1) / 2;
  poly(c, [[xm - 40, y0 - .5, 0], [xm + 40, y0 - .5, 0], [xm + 40, y0 - .5, 84], [xm - 40, y0 - .5, 84]], "#6B5B47", TINTA, 2);
  // antena
  const A = P(x1 - 60, y1 - 60, z1), B = P(x1 - 60, y1 - 60, z1 + 140);
  if (A && B) { c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke(); c.fillStyle = ACENTO; c.beginPath(); c.arc(B.x, B.y, 4 + 2 * Math.abs(Math.sin(t * 3)), 0, TAU); c.fill(); }
}

// ---------- capas 2D sobre el mundo ----------
function etiquetaEn(c: Ctx, t: number, ini: number, fin: number, s: string, X: number, Y: number, Z: number, px: number, color = TINTA, it = true, gir = -.02) {
  const q = P(X, Y, Z); if (!q) return;
  etiqueta(c, t, ini, fin, s, q.x, q.y, px, color, it, gir);
}
function encimaDelTablero(c: Ctx, t: number) {
  // el gancho: «experimento», tachado con un signo de pregunta
  etiqueta(c, t, E.experimento[0] - .1, E.gob - .25, "experimento", 540, 360, 112, TINTA, true, -.02);
  const ks = prog(t, E.experimento[1] - .12, E.experimento[1] + .2) * (1 - smooth(prog(t, E.gob - .25, E.gob)));
  if (ks > 0) {
    c.save(); c.strokeStyle = ACENTO; c.lineWidth = 9; c.lineCap = "round"; c.globalAlpha = 1 - smooth(prog(t, E.gob - .25, E.gob));
    c.beginPath(); c.moveTo(310, 334); c.lineTo(lerp(310, 770, ease.outCubic(ks)), 330 + 6 * Math.sin(ks * 3)); c.stroke(); c.restore();
    rot(c, t, E.experimento[1] + .1, E.gob - .25, "?", 380, 150, ACENTO, true, 840);
  }
  // quién hizo la prueba
  rot(c, t, E.gob, E.red - .15, "AI Security Institute", 330, 96, TINTA, false);
  rot(c, t, E.gob + .25, E.red - .15, "del gobierno del Reino Unido", 420, 58, GRIS, true);
  rot(c, t, E.red - .05, E.tilt - .3, CREDITO, 212, 48, GRIS2, true);
  // la maqueta tiene placa: red simulada
  etiquetaEn(c, t, E.red, E.pan1 + .4, "red simulada", 230, -BASE - 70, 0, 76, ACENTO, true, -.02);
  etiquetaEn(c, t, E.pan2 + .4, E.freno - .3, "red simulada", -230, -BASE - 70, 0, 76, ACENTO, true, -.02);
  etiquetaEn(c, t, E.sindef + .1, E.pan3 + .1, "red simulada", 60, -BASE - 70, 0, 76, ACENTO, true, -.02);
  rot(c, t, E.ola, E.c1[0].t0 + .4, "32 pasos", 400, 140, TINTA, false, 540, mono(140));
  // los contadores de los intentos
  const kc1 = ventana(t, E.c1[0].t0 + .3, E.pan1 + .2, .3, .4);
  if (kc1 > 0) {
    const xa = lerp(540, 270, ease.inOutCubic(prog(t, E.reset, E.reset + .5)));
    const gris = smooth(prog(t, E.version, E.version + .4));
    c.save(); c.globalAlpha = kc1;
    tx(c, "abril", xa, 340, { fuente: serif(66, true), color: GRIS, alfa: smooth(prog(t, E.abril - .05, E.abril + .2)) });
    tx(c, `${llegados(C1, t)} de 10`, xa, 450, { fuente: mono(92), color: gris > .5 ? GRIS : TINTA });
    const kt = smooth(prog(t, E.tres, E.tres + .3)) * (1 - gris);
    if (kt > 0) { c.strokeStyle = ACENTO; c.lineWidth = 6; c.globalAlpha = kc1 * kt; c.beginPath(); c.moveTo(xa - 190, 478); c.lineTo(xa - 190 + 380 * kt, 478); c.stroke(); }
    c.restore();
  }
  const kc2 = ventana(t, E.version - .05, E.pan1 + .2, .3, .4);
  if (kc2 > 0) {
    c.save(); c.globalAlpha = kc2;
    tx(c, "versión más nueva", 770, 340, { fuente: serif(58, true), color: ACENTO });
    tx(c, `${llegados(C2, t)} de 10`, 770, 450, { fuente: mono(92), color: TINTA });
    const kt = smooth(prog(t, E.seis, E.seis + .3));
    if (kt > 0) { c.strokeStyle = ACENTO; c.lineWidth = 6; c.globalAlpha = kc2 * kt; c.beginPath(); c.moveTo(580, 478); c.lineTo(580 + 380 * kt, 478); c.stroke(); }
    c.restore();
  }
  // los abiertos: llegan unos meses atrás por la misma pista
  rot(c, t, E.abiertos - .1, E.cuenta - .2, "modelos abiertos", 340, 104, TINTA, false);
  rot(c, t, E.descargar - .2, E.cuenta - .2, "los descarga cualquiera", 440, 62, GRIS, true);
  const kd = ventana(t, E.descargar - .2, E.descargar + 1.2, .1, .3);
  if (kd > 0) BLANCAS.forEach((i, j) => {
    const q = P(PT[i][0] + 22, PT[i][1] - 10, ZT + RB * 2.2); if (!q) return;
    const caidaY = ((t - E.descargar + j * .1) % .7) / .7;
    c.save(); c.globalAlpha = kd * (1 - caidaY); c.strokeStyle = ACENTO; c.lineWidth = 6; c.lineCap = "round";
    const y = q.y - 70 + caidaY * 40;
    c.beginPath(); c.moveTo(q.x, y - 34); c.lineTo(q.x, y); c.moveTo(q.x - 14, y - 14); c.lineTo(q.x, y); c.lineTo(q.x + 14, y - 14); c.stroke(); c.restore();
  });
  // la distancia: una cinta roja por la pista, de la fila blanca a la negra
  const kg = smooth(prog(t, E.atras - .1, E.atras + .7)) * (1 - smooth(prog(t, E.enmeses, E.enmeses + .4)));
  if (kg > 0) {
    c.save(); c.globalAlpha = kg; c.strokeStyle = ACENTO; c.lineWidth = 11; c.lineCap = "round"; c.setLineDash([2, 18]); c.lineDashOffset = -t * 40;
    c.beginPath(); const n = 6 * kg;
    for (let k = 0; k <= 60; k++) { const u = 22 + n * k / 60, i = Math.floor(u), f = u - i, a = tile(i), b = tile(Math.min(i + 1, 32)), q = P(lerp(a[0], b[0], f), lerp(a[1], b[1], f), ZT + 4); if (q) { if (k) c.lineTo(q.x, q.y); else c.moveTo(q.x, q.y); } }
    c.stroke(); c.restore();
    const q = P(PT[25][0], PT[25][1], ZT + 80);
    if (q) etiqueta(c, t, E.atras + .1, E.enmeses, "unos meses", q.x, q.y - 50, 84, ACENTO, true, .02);
  }
  rot(c, t, E.cuenta, E.enmeses - .1, "haz la cuenta", 340, 104, TINTA, false);
  rot(c, t, E.pocos, E.enmeses - .1, "hoy: unos pocos", 450, 76, TINTA, true);
  // anillo sobre los pocos
  const kp = ventana(t, E.pocos - .1, E.enmeses + .2, .25, .3);
  if (kp > 0) {
    const q = P((PT[28][0] + PT[30][0]) / 2 - 20, (PT[28][1] + PT[30][1]) / 2 + 10, ZT + 20);
    if (q) { c.save(); c.globalAlpha = kp; c.strokeStyle = ACENTO; c.lineWidth = 5; c.setLineDash([3, 12]); c.lineDashOffset = -t * 30; c.beginPath(); c.ellipse(q.x, q.y, 210 * q.s, 150 * q.s, -.3, 0, TAU); c.stroke(); c.restore(); }
  }
  rot(c, t, E.enmeses - .05, E.freno0 - .15, "en meses:", 330, 78, GRIS, true);
  rot(c, t, E.cualquiera - .05, E.freno0 - .15, "cualquiera", 450, 132, ACENTO, true);
  // sin defensores: siluetas punteadas en las esquinas de la maqueta, que no están
  const kv = ventana(t, E.defensores - .05, E.pan3 + .1, .2, .3);
  if (kv > 0) {
    const esq: [number, number][] = [[-BASE + 50, -BASE + 40], [BASE - 50, -BASE + 40], [BASE - 50, BASE - 40], [-BASE + 50, BASE - 40]];
    esq.forEach(([x, y], k) => {
      const q = P(x, y, ZB); if (!q) return;
      const a = smooth(prog(t, E.defensores + k * .08, E.defensores + k * .08 + .15)), va = 1 - smooth(prog(t, E.activos + .2 + k * .06, E.activos + .45 + k * .06));
      guardia(c, q.x, q.y, q.s * 1.1, t, k, kv * a * lerp(.3, 1, va), true);
      if (va < 1) { c.save(); c.globalAlpha = kv * (1 - va); c.strokeStyle = ACENTO; c.lineWidth = 4; c.beginPath(); c.ellipse(q.x, q.y, 30 * q.s * 1.1, 9 * q.s * 1.1, 0, 0, TAU); c.stroke(); c.restore(); }
    });
  }
  rot(c, t, E.defensores - .1, E.pan3 + .2, "sin defensores activos", 360, 92, ACENTO, true);
}
function relojesEncima(c: Ctx, t: number) {
  if (t < E.reloj[0] - .5 || t > E.pan2 + 1.4) return;
  const fuera = 1 - smooth(prog(t, E.pan2, E.pan2 + .6));
  c.save(); c.globalAlpha = fuera;
  // la regla del tiempo, sobre la mesa
  const kr = smooth(prog(t, E.reloj[0], E.reloj[0] + .5));
  if (kr > 0) {
    const a = P(X0 - .55 * SP, -140, 0), b = P(X0 + lerp(-.55, 3.55, kr) * SP, -140, 0);
    if (a && b) {
      c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
      for (let i = 0; i < 4; i++) { const q = P(X0 + i * SP, -140, 0); if (q && i <= kr * 4) { c.beginPath(); c.moveTo(q.x, q.y - 12); c.lineTo(q.x, q.y + 12); c.stroke(); } }
    }
    ["", "×2", "×4", "×8"].forEach((s, i) => { if (!s) return; const q = P(X0 + i * SP, -140, 0); if (q) rot(c, t, E.reloj[i], E.pan2, s, q.y + 100, 56, TINTA, false, q.x, mono(56)); });
    const m0 = P(X0 + .5 * SP, -140, 0);
    if (m0) rot(c, t, E.meses, E.pan2, "4.7 meses", m0.y + 48, 46, ACENTO, true, m0.x);
  }
  // la tendencia: pasa por la punta de cada torre y sigue
  const kt = prog(t, E.recientes - .25, E.recientes + .75);
  if (kt > 0) {
    c.save(); c.strokeStyle = TINTA; c.lineWidth = 4; c.setLineDash([14, 12]); c.lineDashOffset = -t * 20; c.beginPath();
    const u1 = lerp(-.4, 3.6, ease.inOutCubic(kt));
    for (let k = 0; k <= 80; k++) { const u = lerp(-.4, u1, k / 80), q = P(X0 + u * SP, 0, HR * 2 ** u); if (q) { if (k) c.lineTo(q.x, q.y); else c.moveTo(q.x, q.y); } }
    c.stroke(); c.restore();
    const ql = P(X0 + 1.55 * SP, 0, HR * 2 ** 1.55);
    if (ql) rot(c, t, E.recientes + .3, E.pan2, "tendencia", ql.y - 40, 54, TINTA, true, ql.x - 120);
  }
  // los más recientes: una línea por encima de la tendencia
  const us = [2.45, 2.78, 3.1];
  const pts = us.map((u, k) => {
    const t1 = E.supera + k * .14, f = prog(t, t1, t1 + .38), zT = HR * 2 ** u, zA = zT * 1.42;
    return { u, z: lerp(zT, zA, ease.outBack(f)), f, t1, zT };
  });
  const kl = smooth(prog(t, E.supera + .4, E.supera + .8));
  if (kl > 0) {
    c.save(); c.strokeStyle = ACENTO; c.lineWidth = 7; c.lineCap = "round"; c.globalAlpha *= kl; c.beginPath();
    pts.forEach((p, k) => { const q = P(X0 + p.u * SP, 0, p.z); if (q) { if (k) c.lineTo(q.x, q.y); else c.moveTo(q.x, q.y); } });
    c.stroke(); c.restore();
  }
  pts.forEach((p, k) => { if (t >= p.t1) bolaMundo(c, X0 + p.u * SP, 0, p.z - RB, p.z - RB, RB * 1.05, { aire: Math.sin(PI * clamp(p.f)), fase: t * 3 + k }); });
  const q0 = P(X0 + 2.45 * SP, 0, HR * 2 ** 2.45 * 1.42);
  if (q0) { rot(c, t, E.supera, E.pan2, "modelos", q0.y - 18, 56, ACENTO, true, q0.x - 300); rot(c, t, E.supera + .1, E.pan2, "más recientes", q0.y + 46, 56, ACENTO, true, q0.x - 300); }
  // lo que estimó el instituto
  rot(c, t, E.duracion - .05, E.reloj[1] - .2, "duración de las tareas", 340, 84, TINTA, true);
  rot(c, t, E.reloj[1] - .15, E.recientes - .3, "se duplica", 330, 108, TINTA, false);
  rot(c, t, E.meses - .05, E.recientes - .3, "cada 4.7 meses", 440, 76, ACENTO, false, 540, mono(76));
  c.restore();
}
function realEncima(c: Ctx, t: number) {
  if (t < E.pan3 - .5 || t > E.tilt + 1.2) return;
  // la flecha de la maqueta al edificio, con su interrogación
  const kf = prog(t, E.traslada - .1, E.traslada + .7);
  if (kf > 0) {
    const a: V3 = [-BASE - 40, 40, 30], b: V3 = [ED.x1 + 60, 60, 30];
    c.save(); c.strokeStyle = ACENTO; c.lineWidth = 6; c.setLineDash([4, 14]); c.lineCap = "round"; c.lineDashOffset = -t * 30; c.beginPath();
    for (let k = 0; k <= 30; k++) { const u = ease.inOutCubic(kf) * k / 30, q = P(lerp(a[0], b[0], u), lerp(a[1], b[1], u), 30 + 260 * Math.sin(PI * u)); if (q) { if (k) c.lineTo(q.x, q.y); else c.moveTo(q.x, q.y); } }
    c.stroke(); c.restore();
    const m = P((a[0] + b[0]) / 2, 50, 330);
    if (m) {
      const kq = ease.outBack(prog(t, E.traslada + .7, E.traslada + 1.05), 2.4), pulso = 1 + .06 * Math.sin(t * 5) * smooth(prog(t, E.nadie, E.nadie + .3));
      if (kq > 0) { c.save(); c.translate(m.x, m.y); c.scale(kq * pulso, kq * pulso); tx(c, "?", 0, 0, { fuente: serif(220, true), color: ACENTO }); c.restore(); }
    }
  }
  const qa = P(0, -BASE - 40, 0), qb = P((ED.x0 + ED.x1) / 2, ED.y0 - 120, 0);
  if (qa) { rot(c, t, E.pan3 + .3, E.tilt - .3, "simulada", qa.y + 80, 58, TINTA, true, qa.x); rot(c, t, E.pan3 + .45, E.tilt - .3, "sin defensores", qa.y + 145, 50, GRIS, true, qa.x); }
  if (qb) { rot(c, t, E.reales, E.tilt - .3, "real", qb.y + 80, 58, TINTA, true, qb.x); rot(c, t, E.defendidos, E.tilt - .3, "con defensores", qb.y + 145, 50, GRIS, true, qb.x); }
  // lo que dice el instituto
  rot(c, t, E.pan3 + .3, E.nadie - .2, "el propio instituto:", 330, 58, GRIS, true);
  rot(c, t, E.nosabe, E.nadie - .2, "no sabe cuándo", 440, 100, TINTA, false);
  rot(c, t, E.como, E.nadie - .2, "ni cómo", 550, 100, TINTA, false);
  rot(c, t, E.nadie, E.fecha - .45, "nadie sabe", 400, 120, TINTA, false);
  calendario(c, t);
}
/** Un calendario de escritorio sin mes ni año: alguien encierra una fecha y la hoja se tacha sola. */
function calendario(c: Ctx, t: number) {
  const k0 = E.fecha - .4;
  if (t < k0) return;
  const baja = ease.outBack(prog(t, k0, k0 + .45), 1.4), sale = smooth(prog(t, E.tilt - .3, E.tilt + .1));
  const cx = 540, cy = lerp(-400, 455, baja) - sale * 200, w = 440, h = 380;
  c.save(); c.globalAlpha = 1 - sale; c.translate(cx, cy); c.rotate(-.025 + .01 * Math.sin(t * 1.3));
  c.fillStyle = "rgba(20,18,14,.18)"; c.fillRect(-w / 2 + 12, -h / 2 + 14, w, h);
  c.fillStyle = HOJA; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.rect(-w / 2, -h / 2, w, h); c.fill(); c.stroke();
  c.fillStyle = ACENTO; c.fillRect(-w / 2, -h / 2, w, 62); c.strokeRect(-w / 2, -h / 2, w, 62);
  for (const sx of [-130, 130]) { c.fillStyle = TINTA; c.beginPath(); c.arc(sx, -h / 2, 10, 0, TAU); c.fill(); }
  for (let d = 0; d < 30; d++) {
    const col = d % 7, fil = Math.floor(d / 7), x = -w / 2 + 40 + col * 60, y = -h / 2 + 116 + fil * 60;
    tx(c, String(d + 1), x, y, { fuente: mono(32), color: TINTA });
  }
  // la fecha encerrada
  const kc = prog(t, E.fecha + .25, E.fecha + .65);
  if (kc > 0) {
    const x = -w / 2 + 40 + (16 % 7) * 60, y = -h / 2 + 116 + Math.floor(16 / 7) * 60 - 11;
    c.strokeStyle = ACENTO; c.lineWidth = 5; c.beginPath();
    for (let i = 0; i <= 40 * kc; i++) { const a = -1.2 + i / 40 * 7, r = 34 + 4 * Math.sin(i * .7); c.lineTo(x + Math.cos(a) * r * 1.15, y + Math.sin(a) * r * .85); }
    c.stroke();
  }
  // se tacha solo
  const tacha = (ini: number, ax: number, ay: number, bx: number, by: number) => {
    const k = ease.outCubic(prog(t, ini, ini + .2)); if (k <= 0) return;
    c.strokeStyle = ACENTO; c.lineWidth = 12; c.lineCap = "round"; c.beginPath(); c.moveTo(ax, ay); c.lineTo(lerp(ax, bx, k), lerp(ay, by, k)); c.stroke();
  };
  tacha(E.adivinando, -w / 2 + 24, -h / 2 + 80, w / 2 - 24, h / 2 - 20);
  tacha(E.adivinando + .26, w / 2 - 24, -h / 2 + 80, -w / 2 + 24, h / 2 - 20);
  c.restore();
  rot(c, t, E.adivinando + .1, E.tilt - .3, "adivinando", 760, 104, ACENTO, true);
}

/** El freno: una hoja que entra sobre la mesa con una balanza. Una pesa cae y la balanza queda pareja. */
function freno(c: Ctx, t: number) {
  const ent = E.freno0 - .15, sal = E.sindef - .4;
  if (t < ent || t > sal + .6) return;
  const k = ease.outCubic(prog(t, ent, ent + .45)), s = ease.inOutCubic(prog(t, sal, sal + .55));
  c.save(); c.translate(0, (1 - k) * 1500 - s * 1900); c.rotate(-.02 + .03 * s);
  c.fillStyle = "rgba(20,18,14,.18)"; c.fillRect(64, 560, 960, 980);
  c.fillStyle = HOJA; c.strokeStyle = "rgba(17,17,17,.55)"; c.lineWidth = 3; c.beginPath(); c.rect(50, 546, 980, 980); c.fill(); c.stroke();
  // la balanza
  const px = 540, py = 820, L = 320;
  const th = -.27 * (1 - resorte(t - E.pesa, 1.05, .3)) + .015 * Math.sin(t * 1.7) * (t < E.pesa ? 1 : .3);
  c.strokeStyle = TINTA; c.lineWidth = 9; c.lineCap = "round"; c.lineJoin = "round";
  c.fillStyle = "#3a3a38"; c.beginPath(); c.moveTo(px - 120, 1430); c.lineTo(px + 120, 1430); c.lineTo(px + 40, 1390); c.lineTo(px - 40, 1390); c.closePath(); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(px, 1390); c.lineTo(px, py); c.stroke();
  const ex = (sg: number) => [px + sg * L * Math.cos(th), py + sg * L * Math.sin(th)] as [number, number];
  const [lx, ly] = ex(-1), [rx, ry] = ex(1);
  c.beginPath(); c.moveTo(lx, ly); c.lineTo(rx, ry); c.stroke();
  c.fillStyle = TINTA; c.beginPath(); c.moveTo(px, py - 34); c.lineTo(px - 18, py); c.lineTo(px + 18, py); c.closePath(); c.fill();
  c.beginPath(); c.arc(px, py, 12, 0, TAU); c.fill();
  const plato = (x: number, y: number) => {
    const yp = y + 250;
    c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 120, yp); c.moveTo(x, y); c.lineTo(x + 120, yp); c.stroke();
    c.fillStyle = "#D8CFBE"; c.lineWidth = 5; c.beginPath(); c.ellipse(x, yp, 140, 26, 0, 0, TAU); c.fill(); c.stroke();
    return yp;
  };
  const ypl = plato(lx, ly), ypr = plato(rx, ry);
  // lo que pesa: lo que ya puede hacer (relojes y una bola)
  reloj(c, lx - 70, ypl - 6, 120, t, .2); reloj(c, lx + 2, ypl - 6, 120, t, .6); agente(c, lx + 82, ypl - 50, 44, [lx + 30, ypl - 110], [lx + 128, ypl - 100]);
  rot(c, t, ent + .3, sal, "lo que ya puede", ypl + 90, 52, GRIS, true, lx);
  // la pesa del freno: cae y se asienta
  const kp = prog(t, E.pesa - .26, E.pesa), yw = t < E.pesa ? lerp(ypr - 330, ypr - 4, ease.inCubic(kp)) : ypr - 4 - Math.abs(Math.sin((t - E.pesa) * 11)) * 16 * Math.exp(-(t - E.pesa) * 6);
  if (t > E.pesa - .26) {
    c.globalAlpha *= clamp(kp * 5);
    c.fillStyle = TINTA; c.strokeStyle = TINTA; c.lineWidth = 4;
    c.beginPath(); c.moveTo(rx - 100, yw); c.lineTo(rx + 100, yw); c.lineTo(rx + 74, yw - 116); c.lineTo(rx - 74, yw - 116); c.closePath(); c.fill();
    c.lineWidth = 8; c.beginPath(); c.arc(rx, yw - 128, 24, PI, 0); c.stroke();
    tx(c, "freno", rx, yw - 44, { fuente: serif(58, true), color: HOJA });
  }
  c.restore();
  rot(c, t, E.freno0, sal + .1, "el freno", 340, 124, TINTA, false);
  rot(c, t, E.igual, sal + .1, "importa igual", 460, 96, ACENTO, true);
}

// =====================================================================================================
// el muro de a23
// =====================================================================================================
const GR = { x0: 92, x1: 976, y0: 560, y1: 1250, cols: 5, filas: 6, hc: 17, hf: 12 };
const A23 = { seismil: [75.0, 77.146], parchadas: [78.81, 80.511], encuentre: 81.675, gesto: 85.408, fin: 88.2 };
type Hueco = { x: number; y: number; p: number; a: number };
type Hallazgo = { x: number; y: number; t: number; ya: boolean };
type Datos = { gran: Hueco[]; lenta: Hueco[]; cola: Hallazgo[]; ataques: { x: number; y: number }[] };
const XQ = 924, DQ = 56, YQ = 1336;                       // la fila de espera
const QUIEN_TAPA = (k: number) => E.parches[k];

function preparar(): Datos {
  // el muro de los proyectos abiertos de a23, tal cual: 30 tableros de 204 agujeros (6,120) y 516 parches
  const gran: Hueco[] = [];
  const pw = (GR.x1 - GR.x0 - (GR.cols - 1) * 12) / GR.cols, ph = (GR.y1 - GR.y0 - (GR.filas - 1) * 12) / GR.filas;
  for (let a = 0; a < GR.cols; a++) for (let b = 0; b < GR.filas; b++) for (let j = 0; j < GR.hf; j++) for (let i = 0; i < GR.hc; i++) {
    const n = gran.length;
    gran.push({ x: GR.x0 + a * (pw + 12) + (i + .5 + (fijo(n * 1.3) - .5) * .6) * pw / GR.hc, y: GR.y0 + b * (ph + 12) + (j + .5 + (fijo(n * 2.1) - .5) * .6) * ph / GR.hf, p: 0, a: (fijo(n * 3.9) - .5) * .5 });
  }
  const ordenG = gran.map((_, n) => n).sort((a, b) => fijo(a * 2.7 + .9) - fijo(b * 2.7 + .9));
  ordenG.slice(0, 516).forEach((n) => { gran[n].p = 1; });
  ordenG.slice(516, 900).forEach((n) => { gran[n].p = -1; });
  // los parches grandes que la mano puso al final de a23 (uno cada 1.15 s: alcanzó a poner seis)
  const lenta = gran.filter((h) => h.p < 0 && h.y < 980 && h.x > 560).slice(0, 6);
  // los que la bola de a23 encontró al final: siguen rojos, esperando
  const cola: Hallazgo[] = [];
  let tt = A23.encuentre, paso = .16, k = 0;
  while (tt < A23.gesto + 1.2) {
    if (tt <= A23.fin) cola.push({ x: GR.x0 + 10 + fijo(k * 4.3 + .7) * (GR.x1 - GR.x0 - 20), y: GR.y0 + 10 + fijo(k * 6.1 + .2) * (GR.y1 - GR.y0 - 20), t: -1, ya: true });
    tt += paso; paso = Math.max(.07, paso * .96); k++;
  }
  // la fila arranca por los que la mano alcanza sin taparle nada a la carrera ni salirse por la derecha
  cola.sort((a, b) => Number(!(a.y < 1060 && a.x < 800)) - Number(!(b.y < 1060 && b.x < 800)));
  // los que encuentra la defensa en este capítulo
  const libres = gran.filter((h) => h.p === 0 && h.y > GR.y0 + 30);
  E.hall.forEach((th, q) => { const h = libres[Math.floor(fijo(q * 7.7 + .3) * libres.length)]; cola.push({ x: h.x, y: h.y, t: th, ya: false }); });
  // los atacantes abren agujeros nuevos en la orilla de arriba
  const ataques = E.ataques.map((_, q) => ({ x: 230 + q * 120 + fijo(q * 3.3) * 40, y: GR.y0 + 18 + fijo(q * 5.5) * 30 }));
  return { gran, lenta, cola, ataques };
}

function muro(c: Ctx, t: number, d: Datos) {
  // al final el muro se encoge hacia arriba: la carrera de abajo es la última imagen
  const z = (1 + .03 * smooth(prog(t, E.tilt, E.pregunta2))) * lerp(1, .78, ease.inOutCubic(prog(t, E.pregunta2 - .5, E.pregunta2 + .5)));
  const acerca = .07 * ease.inOutSine(prog(t, E.humano, E.atacando - .6)) * (1 - ease.inOutCubic(prog(t, E.atacando - .6, E.atacando + .4)));
  c.save(); c.translate(540, 520); c.scale(z, z); c.translate(-540, -520);
  c.translate(600, 760); c.scale(1 + acerca, 1 + acerca); c.rotate(-.012 * acerca / .07); c.translate(-600, -760);
  // ---------- el muro tal como lo dejó a23 ----------
  const pw = (GR.x1 - GR.x0 - (GR.cols - 1) * 12) / GR.cols, ph = (GR.y1 - GR.y0 - (GR.filas - 1) * 12) / GR.filas;
  c.fillStyle = "#EDE7DA"; c.strokeStyle = TINTA; c.lineWidth = 3;
  for (let i = 0; i < GR.cols; i++) for (let j = 0; j < GR.filas; j++) { c.beginPath(); c.rect(GR.x0 + i * (pw + 12), GR.y0 + j * (ph + 12), pw, ph); c.fill(); c.stroke(); }
  c.fillStyle = TINTA; c.beginPath();
  for (const h of d.gran) { c.moveTo(h.x + 2.6, h.y); c.arc(h.x, h.y, 2.6, 0, TAU); }
  c.fill();
  c.fillStyle = HOJA; c.strokeStyle = TINTA; c.lineWidth = 1.8;
  for (const h of d.gran) if (h.p > 0) { c.beginPath(); c.rect(h.x - 5.5, h.y - 5.5, 11, 11); c.fill(); c.stroke(); }
  d.lenta.forEach((h) => parche(c, h.x, h.y, 24, h.a, 1));
  // ---------- los hallazgos: rojo hasta que una mano los tape ----------
  const tapado = (q: number) => (q < E.parches.length ? E.parches[q] : 1e9);
  d.cola.forEach((h, q) => {
    if (!h.ya && t < h.t) return;
    const tp = tapado(q);
    if (t >= tp) { parche(c, h.x, h.y, 22, fijo(q * 1.7) - .5, (t - tp) / .14); return; }
    const a = h.ya ? 9 : t - h.t;
    const rr = h.ya ? 6.5 : 9.5;
    c.fillStyle = ACENTO; c.beginPath(); c.arc(h.x, h.y, rr + 6 * Math.exp(-a * 8), 0, TAU); c.fill();
    if (!h.ya) { c.strokeStyle = HOJA; c.lineWidth = 2.5; c.beginPath(); c.arc(h.x, h.y, rr + 1.5, 0, TAU); c.stroke(); }
    if (a < .5) { c.strokeStyle = ACENTO; c.lineWidth = 6; c.globalAlpha = 1 - a / .5; c.beginPath(); c.arc(h.x, h.y, 12 + a * 90, 0, TAU); c.stroke(); c.globalAlpha = 1; }
  });
  // ---------- los atacantes: abren agujeros nuevos en la orilla de arriba ----------
  const kat = ventana(t, E.atacando - .3, E.pregunta2 - .2, .3, .4);
  if (kat > 0) {
    d.ataques.forEach((h, q) => {
      const ta = E.ataques[q]; if (t < ta) return;
      const a = t - ta;
      c.strokeStyle = TINTA; c.lineWidth = 2.5;
      for (let r = 0; r < 6; r++) { const an = r / 6 * TAU + q; c.beginPath(); c.moveTo(h.x, h.y); c.lineTo(h.x + Math.cos(an) * 20 * Math.min(1, a * 6), h.y + Math.sin(an) * 14 * Math.min(1, a * 6)); c.stroke(); }
      c.fillStyle = TINTA; c.beginPath(); c.arc(h.x, h.y, 9, 0, TAU); c.fill();
      if (a < .5) { c.strokeStyle = ACENTO; c.lineWidth = 5; c.globalAlpha = 1 - a / .5; c.beginPath(); c.arc(h.x, h.y, 12 + a * 90, 0, TAU); c.stroke(); c.globalAlpha = 1; }
    });
    [0, 1, 2].forEach((q) => {
      const x = 260 + q * 240 + 50 * Math.sin(t * 1.3 + q * 2), golpe = Math.max(0, ...E.ataques.map((ta) => (t > ta && t < ta + .3 ? 1 - (t - ta) / .3 : 0)));
      const by = GR.y0 - 40 - Math.abs(Math.sin(t * 5 + q)) * 14;
      c.save(); c.globalAlpha *= kat * smooth(prog(t, E.atacando - .3 + q * .1, E.atacando + q * .1));
      agente(c, x, by, 34, [x - 56, by - 20 + 8 * Math.sin(t * 4 + q)], [x + 40, by + 30 + golpe * 20], { piso: GR.y0 - 6, sombra: .25, abre2: .1 });
      c.restore();
    });
  }
  // ---------- la mano humana: un parche a la vez, del principio de la fila ----------
  const kh = smooth(prog(t, E.humano - .2, E.humano + .4));
  if (kh > 0) {
    let i = 0;
    while (i < E.parches.length - 1 && t > E.parches[i] + .25) i++;
    const cur = d.cola[i], prev = d.cola[Math.max(0, i - 1)];
    const t1 = E.parches[i], t0 = i > 0 ? E.parches[i - 1] : E.humano;
    const u = clamp((t - t0) / Math.max(t1 - t0, .1)), mv = smooth(prog(u, .1, .75)), baja = Math.exp(-((t - t1) ** 2) / .004) + (i > 0 ? Math.exp(-((t - t0) ** 2) / .004) : 0);
    const hx = i === 0 && t < t1 - .5 ? lerp(1250, cur.x, smooth(prog(t, E.humano - .2, t1 - .5))) : lerp(prev.x, cur.x, i === 0 ? 1 : mv);
    const hy = i === 0 && t < t1 - .5 ? lerp(1500, cur.y, smooth(prog(t, E.humano - .2, t1 - .5))) : lerp(prev.y, cur.y, i === 0 ? 1 : mv);
    if (t < t1 + .2 || i === E.parches.length - 1) manoH(c, hx + 50 + (1 - clamp(baja)) * 60, hy + 96 + (1 - clamp(baja)) * 50, -.3, .95, 2, kh);
  }
  c.restore();
  // ---------- la fila de espera ----------
  const kq = ventana(t, E.humano - .1, E.pregunta2 - .3, .4, .4);
  if (kq > 0) {
    c.save(); c.globalAlpha = kq;
    let lugar = 0;
    d.cola.forEach((h, q) => {
      if (!h.ya && t < h.t) return;
      const tp = tapado(q);
      if (t >= tp + .25) return;
      const xq = XQ - lugar * DQ + (t > tp ? (t - tp) / .25 * 60 : 0);
      const llega = h.ya ? 1 : smooth(prog(t, h.t, h.t + .45));
      const x = lerp(h.x, xq, llega), y = lerp(h.y, YQ, llega) - Math.sin(PI * llega) * 80;
      const intro = h.ya ? ease.outCubic(prog(t, E.humano - .1 + lugar * .015, E.humano + .3 + lugar * .015)) : 1;
      if (x > -40) {
        c.save(); c.translate(lerp(-60, x, intro), y); c.rotate((fijo(q * 3.1) - .5) * .16); c.globalAlpha *= t > tp ? 1 - (t - tp) / .25 : 1;
        c.fillStyle = HOJA; c.strokeStyle = TINTA; c.lineWidth = 3.5; c.beginPath(); c.rect(-23, -30, 46, 60); c.fill(); c.stroke();
        c.fillStyle = ACENTO; c.beginPath(); c.arc(0, -6, 11, 0, TAU); c.fill();
        c.fillStyle = "rgba(17,17,17,.4)"; c.fillRect(-13, 14, 26, 4);
        c.restore();
      }
      lugar++;
    });
    tx(c, "fila de espera", 690, YQ + 100, { fuente: serif(60, true), color: GRIS2 });
    c.restore();
  }
  // ---------- la defensa: la misma bola, con lámparas ----------
  const objetivo = (k: number) => { const vis = d.cola.filter((h) => !h.ya && h.t <= t); const h = vis.length ? vis[Math.max(0, vis.length - 1 - k)] : { x: 540 + 300 * Math.sin(t * 1.3), y: 870 + 200 * Math.sin(t * .9) }; return h; };
  const kl = ventana(t, E.tilt + .6, E.pregunta2 - .4, .4, .4);
  if (kl > 0) {
    const o = objetivo(0);
    lampara(c, t, 128, 1470, o.x, o.y, kl, 66);
    const k2 = ventana(t, E.encontrar - .3, E.humano + .2, .3, .4);
    if (k2 > 0) { const o2 = objetivo(1), o3 = objetivo(2); lampara(c, t, 330, 1490, o2.x, o2.y, k2 * kl, 58); lampara(c, t, 520, 1500, o3.x, o3.y, k2 * kl, 52); }
  }
  // ---------- la carrera: encontrar contra parchar ----------
  carrera(c, t);
  // ---------- textos ----------
  rot(c, t, E.defensa - .1, E.pregunta1 - .2, CREDITO, 212, 48, GRIS2, true);
  rot(c, t, E.defensa - .1, E.retrasa - .2, "la defensa", 330, 116, TINTA, false);
  rot(c, t, E.armas - .1, E.retrasa - .2, "usa las mismas armas", 440, 74, ACENTO, true);
  rot(c, t, E.retrasa, E.pregunta1 - .2, "lo que más retrasa", 314, 92, TINTA, false);
  rot(c, t, E.noes, E.revise - .35, "encontrar la falla", 410, 80, GRIS, true);
  const ks = prog(t, E.falla_e - .05, E.falla_e + .3) * (1 - smooth(prog(t, E.revise - .35, E.revise - .13)));
  if (ks > 0) { c.save(); c.strokeStyle = ACENTO; c.lineWidth = 7; c.lineCap = "round"; c.beginPath(); c.moveTo(240, 388); c.lineTo(lerp(240, 840, ease.outCubic(ks)), 386); c.stroke(); c.restore(); }
  rot(c, t, E.revise - .1, E.pregunta1 - .2, "revisar y arreglar", 420, 96, ACENTO, true);
  rot(c, t, E.pregunta1, E.vimos - .22, "¿habrá agentes atacando?", 330, 80, TINTA, false);
  const kv = prog(t, E.vimos - .2, E.vimos);
  if (kv > 0) {
    const sale = 1 - smooth(prog(t, E.pregunta2 - .3, E.pregunta2));
    const zz = t < E.vimos ? lerp(2.4, 1, ease.inCubic(kv)) : 1 + .05 * Math.exp(-(t - E.vimos) * 8);
    c.save(); c.globalAlpha = clamp(kv * 2) * sale; c.translate(540, 330); c.rotate(-.06); c.scale(zz, zz);
    c.strokeStyle = ACENTO; c.lineWidth = 8; c.beginPath(); c.roundRect(-300, -58, 600, 102, 10); c.stroke();
    tx(c, "YA LOS VIMOS", 0, 18, { fuente: mono(66), color: ACENTO });
    c.restore();
  }
  rot(c, t, E.pregunta2, DURACION + 1, "la pregunta es", 290, 64, GRIS, true);
  rot(c, t, E.rapido - .05, DURACION + 1, "¿más rápido?", 410, 118, TINTA, false);
}

/** Dos carriles de casillas, como el tablero: una ficha por cada falla encontrada y una por cada parche. */
function carrera(c: Ctx, t: number) {
  const k = smooth(prog(t, E.pregunta2 - .35, E.pregunta2 + .25));
  if (k <= 0) return;
  const X1 = 196, PASO = 66, N = 12, YR = 1262, YP = 1440, L = 28;
  c.save(); c.globalAlpha = k; c.translate(0, (1 - k) * 90);
  for (const [y, nombre, col] of [[YR, "encontrar", ACENTO], [YP, "parchar", TINTA]] as [number, string, string][]) {
    tx(c, nombre, X1 - L, y - 52, { fuente: serif(62, true), color: col, alin: "left" });
    for (let i = 0; i < N; i++) {
      c.fillStyle = i === N - 1 ? "#F3E9D9" : HOJA; c.strokeStyle = TINTA; c.lineWidth = 3;
      c.beginPath(); c.rect(X1 + i * PASO - L + hsh(i + y) * 1.5, y - L + hsh(i * 3 + y) * 1.5, 2 * L, 2 * L); c.fill(); c.stroke();
    }
  }
  // la meta de los carriles: nadie llega todavía
  const xf = X1 + (N - 1) * PASO;
  c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.moveTo(xf, YP + L); c.lineTo(xf, YR - 120); c.stroke();
  c.fillStyle = ACENTO; c.lineWidth = 3; c.beginPath(); c.moveTo(xf, YR - 120); for (let i = 0; i <= 8; i++) { const u = i / 8; c.lineTo(xf - 70 * u, YR - 120 + Math.sin(t * 6 - u * 4) * 6 * u); } for (let i = 8; i >= 0; i--) { const u = i / 8; c.lineTo(xf - 70 * u, YR - 76 - u * 20 + Math.sin(t * 6 - u * 4) * 6 * u); } c.closePath(); c.fill(); c.stroke();
  const ficha = (saltos: number[], y: number, dib: (x: number, y: number) => void) => {
    let n = 0; while (n < saltos.length && t >= saltos[n]) n++;
    let x = X1, yy = y;
    if (n > 0) { const f = clamp((t - saltos[n - 1]) / .14); x = X1 + (n - 1 + ease.inOutSine(f)) * PASO; yy = y - Math.sin(PI * f) * 58; }
    const fin = t > E.fin + .14 ? Math.abs(Math.sin((t - E.fin - .14) * 2.2)) * 6 * Math.exp(-(t - E.fin) * .4) : 0;
    dib(x, yy - fin);
  };
  ficha(E.carrera_r, YR, (x, y) => { c.fillStyle = HOJA; c.strokeStyle = TINTA; c.lineWidth = 3.5; c.beginPath(); c.arc(x, y - 4, 26, 0, TAU); c.fill(); c.stroke(); c.fillStyle = ACENTO; c.beginPath(); c.arc(x, y - 4, 14, 0, TAU); c.fill(); });
  ficha(E.carrera_p, YP, (x, y) => parche(c, x, y - 4, 46, -.12, 1));
  // el empate: ninguno gana, y la meta sigue sin dueño
  const kq = ease.outBack(prog(t, E.fin + .45, E.fin + .9), 2);
  if (kq > 0) { c.save(); c.translate(xf + 26, YR - 128); c.scale(kq, kq); tx(c, "?", 0, 0, { fuente: serif(104, true), color: ACENTO }); c.restore(); }
  const ke = smooth(prog(t, E.fin + .2, E.fin + .6));
  if (ke > 0) {
    const xe = X1 + 9 * PASO;
    c.save(); c.globalAlpha *= ke; c.strokeStyle = ACENTO; c.lineWidth = 4; c.setLineDash([3, 10]); c.lineDashOffset = -t * 20;
    c.beginPath(); c.moveTo(xe, YR - 60); c.lineTo(xe, YP + 40); c.stroke(); c.restore();
  }
  c.restore();
}

// =====================================================================================================
// composición
// =====================================================================================================
function dibuja(c: CanvasRenderingContext2D, t: number, d: Datos) {
  FR = Math.floor(t * 10);
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  const imp = (ti: number, f = 14) => (t > ti && t < ti + .6 ? Math.exp(-(t - ti) * 9) * f : 0);
  const golpe = imp(E.pesa, 18) + imp(E.vimos, 14) + imp(E.fin + .12, 12) + imp(E.freno0 - .05, 9) + imp(E.regresa[1], 5) + imp(META_LLEGA, 5);
  const kT = ease.inOutCubic(prog(t, E.tilt, E.tilt + 1.0));
  c.save(); c.translate(golpe * Math.sin(t * 87), golpe * Math.cos(t * 71));
  const z = (1.02 + .012 * Math.sin(t * .83)) * lerp(1, .84, ease.outCubic(prog(t, E.fin + .3, DURACION)));
  c.translate(540 + 8 * Math.sin(t * .71), 960 + 10 * Math.cos(t * .61)); c.rotate(.004 * Math.sin(t * .47)); c.scale(z, z); c.translate(-540, -960);
  if (kT < 1) { c.save(); c.translate(0, 1750 * kT); mundo(c, t); freno(c, t); c.restore(); }
  if (kT > 0) { c.save(); c.translate(0, -1750 * (1 - kT)); muro(c, t, d); c.restore(); }
  polvo(c, t, 1);
  c.restore();
}

export const Pieza: React.FC = () => <Lienzo dibuja={(c, t, d) => dibuja(c, t, d)} preparar={preparar} />;
