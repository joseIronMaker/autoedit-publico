// Serie 2, capítulo 30: el último. Un piso de cartulina negra con los años pintados. Los expertos clavan sus banderitas
// en 2030 y ahí se pinta la meta; en julio de 2025 la línea se arrastra hacia atrás y la medalla cae. Detrás se levanta
// un reloj de papel gigante, rotulado «Stanford», que la bola lee bien la mitad de las veces. Medalla y reloj en una
// balanza pareja que nadie deja quieta. AGI sobre un listón que cada mano pone a su altura. Tres atriles sin caras:
// sus cajas cuelgan de su respuesta (de-pender). ARC-AGI-3 al 62%. Una mano que llena páginas y un lazo que no cierra
// frente al espejo. Vuelve el piso: un carril acotado, con palomitas, y alrededor todo en blanco. Cierre: la bola de la
// serie 1 sin manos, el frasco de a01 que revienta, la fiesta de verdad, y el interruptor del a01 para que entre la luz
// de las velas.
import React from "react";
import { azar, Cam, camara, clamp, ease, lerp, mezclaVista, prog, resorte, smooth, texto, Vista } from "../../kit";
import { ACENTO, bola, GRIS, Lienzo, LUZ, mono, NOCHE, PAPEL, rotulo, serif, sombra, TINTA } from "../../marca";
import { brazo } from "../../personaje";
import duracion from "./duracion.json";
import ev from "./eventos.json";

export const DURACION = duracion.dur;
type C = CanvasRenderingContext2D;
type P3 = [number, number, number];
type XY = [number, number];
const ORO = "#E2AE52", ORO_C = "#FFE6A6", ORO_O = "#9A6A22", BLANCO = "#FBFAF6", KRAFT = "#DCCDB0";
const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * 6.2832 + f);
const U = 1 / 250;                       // un píxel local = U unidades de mundo (a 5 de distancia se ve 1:1)

// ---------- utilidades de dibujo ----------
function jit(t: number, i: number, a = 1.3): XY { const r = azar(Math.floor(t * 10) * 977 + i * 131 + 7); return [(r() - .5) * 2 * a, (r() - .5) * 2 * a]; }
function trazo(c: C, pts: XY[], t: number, i: number, a = 1.3) {
  c.beginPath(); pts.forEach((p, k) => { const [jx, jy] = jit(t, i + k, a); if (k === 0) c.moveTo(p[0] + jx, p[1] + jy); else c.lineTo(p[0] + jx, p[1] + jy); }); c.stroke();
}
function palomita(c: C, x: number, y: number, s: number, k: number, color = TINTA) {
  if (k <= 0) return;
  const A: XY = [x - s * .45, y - s * .02], B: XY = [x - s * .12, y + s * .32], D: XY = [x + s * .5, y - s * .42];
  const l1 = Math.hypot(B[0] - A[0], B[1] - A[1]), l2 = Math.hypot(D[0] - B[0], D[1] - B[1]), L = (l1 + l2) * clamp(k);
  c.save(); c.strokeStyle = color; c.lineWidth = s * .15; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath(); c.moveTo(A[0], A[1]);
  if (L <= l1) c.lineTo(lerp(A[0], B[0], L / l1), lerp(A[1], B[1], L / l1)); else { c.lineTo(B[0], B[1]); const u = (L - l1) / l2; c.lineTo(lerp(B[0], D[0], u), lerp(B[1], D[1], u)); }
  c.stroke(); c.restore();
}
function tache(c: C, x: number, y: number, s: number, k: number, color = ACENTO) {
  if (k <= 0) return;
  const a = clamp(k * 2), b = clamp(k * 2 - 1);
  c.save(); c.strokeStyle = color; c.lineWidth = s * .15; c.lineCap = "round"; c.beginPath();
  c.moveTo(x - s * .4, y - s * .4); c.lineTo(lerp(x - s * .4, x + s * .4, a), lerp(y - s * .4, y + s * .4, a));
  if (b > 0) { c.moveTo(x + s * .4, y - s * .4); c.lineTo(lerp(x + s * .4, x - s * .4, b), lerp(y - s * .4, y + s * .4, b)); }
  c.stroke(); c.restore();
}
/** Globo de diálogo con la cola hacia (tx, ty). */
function globo(c: C, x: number, y: number, w: number, h: number, tx: number, ty: number, lw = 6) {
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = lw; c.lineJoin = "round";
  const abajo = ty > y, by = abajo ? y + h / 2 : y - h / 2, bx = clamp(tx - 22, x - w / 2 + 40, x + w / 2 - 84);
  c.beginPath(); c.roundRect(x - w / 2, y - h / 2, w, h, Math.min(h / 2, 58)); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(bx, by); c.lineTo(tx, ty); c.lineTo(bx + 46, by); c.fill(); c.stroke();
  c.fillRect(bx + lw * .6, by - lw * .75, 46 - lw * 1.2, lw * 1.5);
}
function escala(c: C, x: number, y: number, k: number, fn: () => void) { if (k <= .001) return; c.save(); c.translate(x, y); c.scale(k, k); fn(); c.restore(); }
function aparece(t: number, a: number, dur = .35, s = 1.8) { return t < a ? 0 : ease.outBack(prog(t, a, a + dur), s); }
function polvo(c: C, t: number, color: string, alfa: number) {
  const r = azar(30); c.fillStyle = color;
  for (let i = 0; i < 60; i++) {
    const x0 = r() * 1200 - 60, y0 = r() * 2060, v = 14 + r() * 40, f = r() * 6.3, z = 1.6 + r() * 3.2;
    const y = ((y0 - t * v) % 2060 + 2060) % 2060 - 70, x = x0 + Math.sin(t * .5 + f) * 30;
    c.globalAlpha = alfa * (.08 + r() * .16); c.fillRect(x, y, z, z);
  }
  c.globalAlpha = 1;
}
/** La bola con manos en pantalla. m1/m2: dónde está cada mano respecto al centro, en unidades de r=90. */
function agente2(c: C, x: number, y: number, r: number, m1: XY, m2: XY, o: { a1?: number; a2?: number; largo?: number; piso?: number; color?: string; borde?: boolean } = {}) {
  const g = r / 90, L = o.largo ?? 1;
  if (o.piso !== undefined) sombra(c, x, o.piso, r * 1.55, .3);
  if (o.borde) {
    // recorte de papel: un filo claro para que la bola se lea sobre la cartulina negra
    if (L > .05) {
      brazo(c, x - 54 * g, y - 50 * g, x + m1[0] * g, y + m1[1] * g, 90 * g, o.a1 ?? .6, BLANCO, L, g * 1.5);
      brazo(c, x + 60 * g, y - 30 * g, x + m2[0] * g, y + m2[1] * g, -100 * g, o.a2 ?? .6, BLANCO, L, g * 1.5);
    }
    c.fillStyle = BLANCO; c.beginPath(); c.arc(x, y, r + Math.max(4, r * .07), 0, 7); c.fill();
  }
  if (L > .05) {
    brazo(c, x - 54 * g, y - 50 * g, x + m1[0] * g, y + m1[1] * g, 90 * g, o.a1 ?? .6, o.color ?? TINTA, L, g);
    brazo(c, x + 60 * g, y - 30 * g, x + m2[0] * g, y + m2[1] * g, -100 * g, o.a2 ?? .6, o.color ?? TINTA, L, g);
  }
  bola(c, x, y, r);
}

// ---------- 3D: recorte contra el plano cercano y planos de papel ----------
function fwd(cam: Cam): P3 { const p = Math.min(cam.v.pitch, 1.5533), y = cam.v.yaw; return [-Math.sin(y) * Math.cos(p), Math.cos(y) * Math.cos(p), -Math.sin(p)]; }
function recorta(cam: Cam, pts: P3[], zmin = .32): P3[] {
  const f = fwd(cam), o = cam.pos, z = (q: P3) => (q[0] - o[0]) * f[0] + (q[1] - o[1]) * f[1] + (q[2] - o[2]) * f[2] - zmin;
  const out: P3[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length], za = z(a), zb = z(b);
    if (za >= 0) out.push(a);
    if ((za >= 0) !== (zb >= 0)) { const u = za / (za - zb); out.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)]); }
  }
  return out;
}
function poli(c: C, cam: Cam, pts: P3[]) {
  const q = recorta(cam, pts); if (q.length < 3) return false;
  c.beginPath(); let ok = true;
  q.forEach((r, i) => { const p = cam.p(r[0], r[1], r[2]); if (!p) { ok = false; return; } if (i === 0) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y); });
  c.closePath(); return ok;
}
function seg3(c: C, cam: Cam, a: P3, b: P3) {
  const q = recorta(cam, [a, b, b]); if (q.length < 2) return;
  const p0 = cam.p(q[0][0], q[0][1], q[0][2]), p1 = cam.p(q[1][0], q[1][1], q[1][2]); if (!p0 || !p1) return;
  c.beginPath(); c.moveTo(p0.x, p0.y); c.lineTo(p1.x, p1.y); c.stroke();
}
function plano(c: C, cam: Cam, o: P3, ex: P3, ey: P3, fn: () => void, zmin = 1.1) {
  const f = fwd(cam), zc = (o[0] - cam.pos[0]) * f[0] + (o[1] - cam.pos[1]) * f[1] + (o[2] - cam.pos[2]) * f[2];
  if (zc < zmin) return;
  const a = cam.p(o[0], o[1], o[2]), b = cam.p(o[0] + ex[0], o[1] + ex[1], o[2] + ex[2]), d = cam.p(o[0] + ey[0], o[1] + ey[1], o[2] + ey[2]);
  if (!a || !b || !d) return;
  c.save(); c.transform(b.x - a.x, b.y - a.y, d.x - a.x, d.y - a.y, a.x, a.y); fn(); c.restore();
}
const enPiso = (c: C, cam: Cam, x: number, y: number, fn: () => void) => plano(c, cam, [x, y, 0], [U, 0, 0], [0, -U, 0], fn);
function horizonte(c: C, cam: Cam) {
  const f = fwd(cam), h = cam.p(cam.pos[0] + f[0] * 900, cam.pos[1] + f[1] * 900, 0);
  const y = h ? h.y : -400;
  const g = c.createLinearGradient(0, y, 0, y + 900);
  g.addColorStop(0, "rgba(214,208,196,0)"); g.addColorStop(.08, "rgba(214,208,196,.42)"); g.addColorStop(1, "rgba(214,208,196,.2)");
  c.fillStyle = g; c.fillRect(-100, Math.max(y, -100), 1280, 2200);
}
/** La bola en el piso 3D: tamaño y sombra salen de la cámara. */
function bola3(c: C, cam: Cam, x: number, y: number, z: number, R: number, m1: XY, m2: XY, o: { a1?: number; a2?: number } = {}) {
  const s = cam.p(x, y, 0), a = cam.p(x, y, z + R); if (!s || !a || a.s > 900) return null;
  const r = R * a.s;
  sombra(c, s.x, s.y, r * (1.5 + z * .6), .36 / (1 + z * 1.4));
  agente2(c, a.x, a.y, r, m1, m2, { ...o, borde: true });
  return { x: a.x, y: a.y, r };
}

// ---------- objetos ----------
function medalla(c: C, R: number, t: number) {
  c.fillStyle = "rgba(20,18,14,.18)"; c.beginPath(); c.arc(R * .06, R * .08, R, 0, 7); c.fill();
  const g = c.createRadialGradient(-R * .35, -R * .4, R * .08, 0, 0, R);
  g.addColorStop(0, ORO_C); g.addColorStop(.5, ORO); g.addColorStop(1, ORO_O);
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, R, 0, 7); c.fill();
  c.strokeStyle = TINTA; c.lineWidth = R * .07; c.stroke();
  c.strokeStyle = "rgba(90,58,14,.55)"; c.lineWidth = R * .035; c.beginPath(); c.arc(0, 0, R * .74, 0, 7); c.stroke();
  c.fillStyle = "rgba(120,80,20,.5)"; c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? R * .2 : R * .48; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  c.closePath(); c.fill();
  const f = ((t * .5) % 1.7) - .35;
  c.save(); c.beginPath(); c.arc(0, 0, R * .95, 0, 7); c.clip();
  const lg = c.createLinearGradient(-R + f * 2.4 * R, -R, -R + f * 2.4 * R + R * .6, R);
  lg.addColorStop(0, "rgba(255,255,255,0)"); lg.addColorStop(.5, "rgba(255,255,255,.6)"); lg.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = lg; c.fillRect(-R, -R, 2 * R, 2 * R); c.restore();
}
function cinta(c: C, x0: number, y0: number, x1: number, y1: number, w: number) {
  // listón rojo en V hasta la medalla
  c.fillStyle = ACENTO; c.strokeStyle = TINTA; c.lineWidth = Math.max(w * .12, 2);
  c.beginPath(); c.moveTo(x0 - w, y0); c.lineTo(x1 - w * .1, y1); c.lineTo(x1 + w * .1, y1); c.lineTo(x0 + w, y0); c.closePath(); c.fill(); c.stroke();
}
function manecilla(c: C, a: number, L: number, w: number) {
  c.save(); c.rotate(a); c.fillStyle = TINTA; c.beginPath(); c.moveTo(-w / 2, w * 1.6); c.lineTo(-w * .32, -L); c.lineTo(0, -L - w * .9); c.lineTo(w * .32, -L); c.lineTo(w / 2, w * 1.6); c.closePath(); c.fill(); c.restore();
}
function reloj(c: C, R: number, ah: number, am: number, as: number) {
  c.fillStyle = "rgba(20,18,14,.2)"; c.beginPath(); c.arc(R * .05, R * .07, R * 1.03, 0, 7); c.fill();
  c.fillStyle = BLANCO; c.beginPath(); c.arc(0, 0, R, 0, 7); c.fill();
  c.strokeStyle = TINTA; c.lineWidth = R * .07; c.stroke();
  c.lineWidth = R * .012; c.beginPath(); c.arc(0, 0, R * .9, 0, 7); c.stroke();
  for (let i = 0; i < 60; i++) {
    const a = i / 60 * 6.2832, l = i % 5 ? R * .04 : R * .09; c.lineWidth = i % 5 ? R * .01 : R * .024;
    c.beginPath(); c.moveTo(Math.sin(a) * R * .88, -Math.cos(a) * R * .88); c.lineTo(Math.sin(a) * (R * .88 - l), -Math.cos(a) * (R * .88 - l)); c.stroke();
  }
  for (let h = 1; h <= 12; h++) { const a = h / 12 * 6.2832; texto(c, String(h), Math.sin(a) * R * .66, -Math.cos(a) * R * .66 + R * .08, { fuente: serif(R * .23), color: TINTA }); }
  manecilla(c, ah, R * .48, R * .07); manecilla(c, am, R * .76, R * .045);
  c.strokeStyle = ACENTO; c.lineWidth = R * .016; c.lineCap = "round";
  c.beginPath(); c.moveTo(-Math.sin(as) * R * .16, Math.cos(as) * R * .16); c.lineTo(Math.sin(as) * R * .83, -Math.cos(as) * R * .83); c.stroke();
  c.fillStyle = TINTA; c.beginPath(); c.arc(0, 0, R * .06, 0, 7); c.fill(); c.fillStyle = ACENTO; c.beginPath(); c.arc(0, 0, R * .026, 0, 7); c.fill();
}
const segundero = (t: number) => (Math.floor(t) + ease.outBack(clamp((t % 1) / .14), 3)) / 60 * 6.2832;
function etiqueta(c: C, x: number, y: number, w: number, h: number, g: number, txt: string, px: number) {
  c.save(); c.translate(x, y); c.rotate(g);
  c.fillStyle = "rgba(20,18,14,.16)"; c.fillRect(-w / 2 + 8, 10, w, h);
  c.fillStyle = KRAFT; c.strokeStyle = TINTA; c.lineWidth = 4;
  c.beginPath(); c.moveTo(-w / 2 + 34, 0); c.lineTo(w / 2, 0); c.lineTo(w / 2, h); c.lineTo(-w / 2 + 34, h); c.lineTo(-w / 2, h / 2); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = BLANCO; c.beginPath(); c.arc(-w / 2 + 30, h / 2, 9, 0, 7); c.fill(); c.stroke();
  texto(c, txt, 20, h / 2 + px * .34, { fuente: serif(px), color: TINTA });
  c.restore();
}

// ==================================================================================================
// 1-2. El piso de los años: la apuesta, la medalla que llega antes, y el reloj
// ==================================================================================================
const yA = (a: number) => 1.6 * (a - 2022);
const BANDERAS: [number, number, boolean][] = [[-.95, 13.3, false], [-.68, 13.0, true], [-.42, 13.5, false], [.42, 13.1, false], [.7, 13.4, true], [.95, 12.95, false], [.15, 13.75, false]];
const YR = 7.7, RR = 1.62;                // bisagra y radio del reloj
const LECT: { h: number; m: number; dice: string; ok: boolean }[] = [
  { h: 3, m: 0, dice: "3:00", ok: true }, { h: 10, m: 10, dice: "1:50", ok: false }, { h: 6, m: 30, dice: "6:30", ok: true }, { h: 4, m: 40, dice: "8:23", ok: false },
];
const lerpAng = (a: number, b: number, k: number) => { const d = ((b - a) % 6.2832 + 9.4248) % 6.2832 - 3.1416; return a + d * k; };
function manecillas(t: number): [number, number] {
  const ang = (q: { h: number; m: number }): [number, number] => [((q.h % 12) + q.m / 60) / 12 * 6.2832, q.m / 60 * 6.2832];
  let [h, m] = ang(LECT[0]);
  const k0 = ease.outCubic(prog(t, ev.stanford + .1, ev.lee[0] - .05));
  h -= (1 - k0) * 6.2832 * .8; m -= (1 - k0) * 6.2832 * 3.2;
  for (let i = 1; i < 4; i++) { const k = ease.outBack(prog(t, ev.lee[i] - .22, ev.lee[i] + .06), 1.7); const [h2, m2] = ang(LECT[i]); h = lerpAng(h, h2, k); m = lerpAng(m, m2, k); }
  return [h, m];
}
/** La línea de meta: en 2030 hasta que pasa julio de 2025. */
const yMeta = (t: number) => lerp(yA(2030), yA(2025), ease.outBack(prog(t, ev.pasa + .02, ev.pasa + .85), 1.15));
/** Medalla: cuelga, se suelta y cae al piso; luego se acuesta con un traqueteo que se apaga. */
const RMED = .52;
function medallaEstado(t: number) {
  const zc0 = 1.34, R = RMED;
  const desc = t < ev.oro ? 0 : 1 - Math.exp(-(t - ev.oro) * 7) * Math.cos((t - ev.oro) * 13);   // baja colgando y rebota
  const zColg = lerp(5.2, zc0, clamp(desc, 0, 1.2));
  const a = t - ev.suelta;
  if (a < 0) return { z: zColg, th: 0, vis: t >= ev.oro, suelto: false };
  const tc = Math.sqrt(2 * (zc0 - R) / 30);
  if (a < tc) return { z: zc0 - 15 * a * a, th: 0, vis: true, suelto: true };
  const b = a - tc;
  const th = Math.PI / 2 - Math.PI / 2 * Math.exp(-b * 3) * Math.abs(Math.cos(b * (6 + b * 7)));
  return { z: R, th, vis: true, suelto: true };
}
function vistaPista(t: number): Vista {
  const V0: Vista = { tx: .05, ty: 3.0, tz: 0, yaw: 0, pitch: .66, dist: 7.4 };
  const V1: Vista = { tx: 0, ty: 9.4, tz: .3, yaw: 0, pitch: .52, dist: 7.6 };
  const V2: Vista = { tx: 0, ty: 12.3, tz: 1.05, yaw: 0, pitch: .3, dist: 4.7 };
  const V3: Vista = { tx: 0, ty: 4.7, tz: .4, yaw: 0, pitch: .5, dist: 6.6 };
  const V4: Vista = { tx: 0, ty: 6.6, tz: 1.75, yaw: 0, pitch: .14, dist: 5.6 };
  // arranque: la cámara ya viene cayendo hacia el piso cuando empieza la voz
  const VA: Vista = { tx: -.6, ty: .2, tz: 0, yaw: -.22, pitch: .98, dist: 12.5 };
  let v = mezclaVista(VA, V0, 1 - (1 - prog(t, 0, 1.9)) ** 1.7);
  v = mezclaVista(v, V1, ease.inOutSine(prog(t, 1.75, ev.oro - .1)));
  v = mezclaVista(v, V2, ease.outCubic(prog(t, ev.oro - .15, ev.oro + 1.1)));
  v.dist *= 1 - .07 * smooth(prog(t, ev.oro + 1.1, ev.pasa));
  v = mezclaVista(v, V3, ease.outExpo(prog(t, ev.pasa, ev.pasa + .8)));
  v = mezclaVista(v, V4, ease.inOutCubic(prog(t, ev.stanford - .05, ev.stanford + 1.1)));
  v.yaw += .035 * Math.sin(t * .43); v.tx += .08 * Math.sin(t * .37);
  return v;
}
function bandera(c: C, cam: Cam, x: number, y: number, z: number, roja: boolean, ladeo: number) {
  const top: P3 = [x + ladeo * 1.3, y, z + 1.35];
  c.strokeStyle = TINTA; c.lineWidth = 4; seg3(c, cam, [x, y, z], top);
  const q: P3[] = [top, [top[0] + .66, top[1], top[2] - .17], [top[0], top[1], top[2] - .42]];
  if (poli(c, cam, q)) { c.fillStyle = roja ? ACENTO : BLANCO; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 2.6; c.stroke(); }
}
const cyPista = (t: number) => lerp(1010, 1070, ease.inOutCubic(prog(t, ev.stanford - .05, ev.stanford + 1.1)));
function escPista(c: C, t: number) {
  const cam = camara(vistaPista(t), 540, cyPista(t), 1250);
  horizonte(c, cam);
  // la cartulina negra con sus líneas
  const YF = yA(2031) + .9;
  if (poli(c, cam, [[-1.28, -8, 0], [1.28, -8, 0], [1.28, YF, 0], [-1.28, YF, 0]])) { c.fillStyle = "#151514"; c.fill(); }
  c.strokeStyle = "rgba(244,242,236,.55)"; c.lineWidth = 2.4;
  seg3(c, cam, [-1.08, -8, 0], [-1.08, YF, 0]); seg3(c, cam, [1.08, -8, 0], [1.08, YF, 0]);
  const yM = yMeta(t);
  for (let a = 2022; a <= 2031; a++) {
    const y = yA(a); c.strokeStyle = "rgba(244,242,236,.7)"; c.lineWidth = 3; seg3(c, cam, [-1.08, y, 0], [1.08, y, 0]);
    const roja = (a === 2030 && t > ev.pinta + .3 && t < ev.pasa + .3) || (a === 2025 && t > ev.pasa + .5);
    const sello = a === 2022 ? ease.outBack(prog(t, .0, .3), 2) : 1;
    enPiso(c, cam, 0, y + .14, () => { c.scale(1, 1.25 * sello); texto(c, String(a), 0, 0, { fuente: serif(190), color: roja ? "#E25B3E" : "rgba(244,242,236,.88)" }); });
  }
  // la meta pintada y su arrastre
  const pintada = ease.outCubic(prog(t, ev.pinta, ev.pinta + .45));
  if (pintada > 0) {
    if (t > ev.pasa) {
      const r = azar(8);
      for (let k = 0; k < 9; k++) {
        const x0 = -1.0 + k * .25 + r() * .06, w = .05 + r() * .06;
        if (poli(c, cam, [[x0, yM, .002], [x0 + w, yM, .002], [x0 + w, yA(2030), .002], [x0, yA(2030) + .1, .002]])) { c.fillStyle = `rgba(192,68,42,${.18 + r() * .28})`; c.fill(); }
      }
    }
    const x1 = lerp(-1.1, 1.1, pintada);
    if (poli(c, cam, [[-1.1, yM - .16, .003], [x1, yM - .16, .003], [x1, yM + .16, .003], [-1.1, yM + .16, .003]])) { c.fillStyle = ACENTO; c.fill(); }
  }
  // objetos ordenados de lejos a cerca
  const objs: { y: number; f: () => void }[] = [];
  // banderitas de la apuesta
  BANDERAS.forEach(([bx, by, roja], k) => {
    const tl = ev.flechas[k], a = t - tl;
    if (a < -.42) return;
    objs.push({ y: by, f: () => {
      if (a < 0) { const u = ease.inCubic(1 + a / .42); bandera(c, cam, bx + .3 * (1 - u), by - .8 * (1 - u), lerp(5.5, 0, u), roja, -.3 * (1 - u)); }
      else bandera(c, cam, bx, by, 0, roja, .12 * Math.exp(-a * 4) * Math.sin(a * 22) + .015 * Math.sin(t * 2 + k));
    } });
  });
  // el reloj gigante de papel
  const fi = t < ev.stanford ? -1 : Math.PI / 2 * ease.outBack(prog(t, ev.stanford, ev.stanford + .62), 1.5);
  if (fi >= 0) objs.push({ y: YR + .4, f: () => {
    const cs = Math.cos(fi), sn = Math.sin(fi), cen: P3 = [0, YR + cs * (RR + .28), sn * (RR + .28)];
    // zócalo
    if (poli(c, cam, [[-.55, YR - .12, 0], [.55, YR - .12, 0], [.55, YR - .12, .3 * sn], [-.55, YR - .12, .3 * sn]])) { c.fillStyle = TINTA; c.fill(); }
    const [ah, am] = manecillas(t);
    plano(c, cam, cen, [U, 0, 0], [0, -U * cs, -U * sn], () => {
      reloj(c, RR / U, ah, am, segundero(t));
      // la etiqueta de Stanford, amarrada al canto
      const k = aparece(t, ev.etiqueta - .1, .4, 2.2);
      // corona del reloj
      const R0 = RR / U;
      c.fillStyle = TINTA; c.beginPath(); c.roundRect(-34, -R0 - 46, 68, 40, 8); c.fill();
      c.strokeStyle = TINTA; c.lineWidth = 9; c.beginPath(); c.arc(0, -R0 - 62, 22, 0, 7); c.stroke();
      if (k > 0) {
        const sw = .16 * Math.exp(-(t - ev.etiqueta) * 1.6) * Math.sin((t - ev.etiqueta) * 7) + .03 * Math.sin(t * 1.3);
        c.save(); c.translate(0, -R0 - 62); c.rotate(-.28 + sw); c.scale(k, k);
        c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 0); c.lineTo(60, -40); c.stroke();
        etiqueta(c, 290, -150, 476, 226, .0, "", 10);
        texto(c, "Stanford", 306, -38, { fuente: serif(112), color: TINTA });
        texto(c, "principios de 2026", 306, 44, { fuente: serif(66, true), color: "#4a4842" });
        c.restore();
      }
    });
  } });
  // la meta: postes, cuerda y medalla
  const md = medallaEstado(t);
  const postes = ease.outCubic(prog(t, ev.oro - .3, ev.oro + .2)) * (1 - ease.inOutCubic(prog(t, ev.stanford - .3, ev.stanford + .2)));
  objs.push({ y: yM, f: () => {
    if (postes > 0) {
      const h = 2.25 * postes;
      c.strokeStyle = TINTA; c.lineWidth = 5; seg3(c, cam, [-1.38, yM, 0], [-1.38, yM, h]); seg3(c, cam, [1.38, yM, 0], [1.38, yM, h]);
      const pts: XY[] = [];
      for (let i = 0; i <= 12; i++) { const u = i / 12, p = cam.p(lerp(-1.38, 1.38, u), yM, h - .14 * Math.sin(u * Math.PI)); if (p) pts.push([p.x, p.y]); }
      c.lineWidth = 2.5; c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.stroke();
    }
    if (!md.vis) return;
    const sw = md.suelto ? 0 : .1 * Math.sin(t * 2.1) * Math.exp(-Math.max(t - ev.oro, 0) * .3) + .04 * Math.sin(t * 1.4);
    const cx = Math.sin(sw) * .9, zz = md.z;
    if (!md.suelto) {
      const a = cam.p(0, yM, 2.11), b = cam.p(cx, yM, zz + RMED);
      if (a && b) cinta(c, a.x, a.y, b.x, b.y, 9 * (b.s / 250));
    } else {
      const u = t - ev.suelta, a = cam.p(0, yM, 2.11), b = cam.p(.1 * Math.sin(u * 9), yM, 2.11 - .6 * Math.exp(-u * 3));
      if (a && b && u < 1.2) cinta(c, a.x, a.y, b.x, b.y, 9 * (b.s / 250));
    }
    const ct: P3 = [cx, yM + Math.sin(md.th) * RMED, md.th > 0 ? RMED * Math.cos(md.th) + .01 : zz];
    if (md.th > .02) { const s0 = cam.p(cx, yM + RMED, 0); if (s0) sombra(c, s0.x, s0.y, 110 * s0.s / 250, .3); }
    plano(c, cam, ct, [U, 0, 0], [0, -U * Math.sin(md.th), -U * Math.cos(md.th)], () => medalla(c, RMED / U, t));
  } });
  // la bola: cae en 2022; luego salta al pie del reloj
  const ys = (() => {
    const h0 = ev.pinta - .55, h1 = ev.pinta + .35;          // tres saltitos hacia la meta: de 2022 a 2024
    if (t < ev.salta) {
      const uh = prog(t, h0, h1), salt = t > h0 && t < h1 ? Math.abs(Math.sin(uh * Math.PI * 3)) * .45 : 0;
      return { x: .15, y: lerp(.75, 3.1, smooth(uh)), z: Math.max(0, 1.62 - 14 * t * t) + salt + (t > ev.aterriza ? Math.abs(Math.sin((t - ev.aterriza) * 9)) * .3 * Math.exp(-(t - ev.aterriza) * 5) : 0) };
    }
    const u = prog(t, ev.salta, ev.salta + .75);
    return { x: lerp(.15, -.35, u), y: lerp(3.1, 6.15, ease.inOutSine(u)), z: 2.2 * Math.sin(Math.PI * u) + (u >= 1 ? Math.abs(Math.sin((t - ev.salta - .75) * 9)) * .16 * Math.exp(-(t - ev.salta - .75) * 4) : 0) };
  })();
  let cab: { x: number; y: number; r: number } | null = null;
  objs.push({ y: ys.y, f: () => {
    const lee = t > ev.lee[0] - .3, apunta = lee ? [-110 + 14 * Math.sin(t * 3), -120] as XY : [-120 + 10 * Math.sin(t * 2.2), -60 + 12 * Math.sin(t * 2.7)] as XY;
    cab = bola3(c, cam, ys.x, ys.y, ys.z, .34, apunta, [130 + 10 * Math.sin(t * 2.4), -80 + 14 * Math.cos(t * 2.1)], { a1: lee ? .9 : .5, a2: .6 });
  } });
  objs.sort((a, b) => b.y - a.y).forEach((o) => o.f());

  // ---------- rótulos ----------
  rotulo(c, t, ev.oro + .05, ev.pasa - .25, "oro en la Olimpiada", 250, 112, TINTA, true);
  rotulo(c, t, ev.olimp + .1, ev.pasa - .25, "de Matemáticas", 360, 96, TINTA);
  rotulo(c, t, .12, ev.flechas[0] - .35, "2022", 250, 170, TINTA);
  rotulo(c, t, ev.flechas[0] - .1, ev.oro - .2, "lo que apostaban", 250, 104, TINTA, true);
  rotulo(c, t, ev.flechas[2], ev.oro - .2, "los expertos", 360, 96, TINTA);
  rotulo(c, t, ev.pasa + .1, ev.stanford - .2, "julio 2025", 290, 150, ACENTO, true);
  // ---------- la lectura del reloj ----------
  const cb = cab as { x: number; y: number; r: number } | null;
  if (cb && t > ev.lee[0] - .1) {
    let i = 0; for (let k = 0; k < 4; k++) if (t >= ev.lee[k] - .05) i = k;
    const L = LECT[i], a = aparece(t, ev.lee[i] - .05, .25, 2.4), gx = 236, gy = 1500;
    escala(c, gx, gy, a, () => { globo(c, 0, 0, 340, 150, cb.x - gx - cb.r * .7, cb.y - gy + cb.r * .2); texto(c, L.dice, 0, 30, { fuente: mono(86), color: TINTA }); });
    const v = prog(t, ev.lee[i] + .3, ev.lee[i] + .52);
    if (L.ok) palomita(c, gx - 20, gy - 160, 120, v); else tache(c, gx - 20, gy - 160, 110, v);
  }
  // marcador: dos bien, dos mal
  for (let k = 0; k < 4; k++) {
    const v = prog(t, ev.lee[k] + .3, ev.lee[k] + .52), x = 330 + k * 140, y = 250;
    if (t > ev.lee[k] + .3 && t < ev.balanza + .1) { if (LECT[k].ok) palomita(c, x, y, 100, v); else tache(c, x, y, 90, v); }
  }
  rotulo(c, t, ev.mitad - .05, ev.balanza + .3, "la mitad de las veces", 380, 104, ACENTO, true);
}

// ==================================================================================================
// 3. La balanza: las dos son ciertas, y nadie la deja quieta
// ==================================================================================================
const FUL: XY = [540, 700], BRZ = 285, CUER = 330;
function angBal(t: number) {
  const K: [number, number][] = [[ev.platoM + .02, -.2], [ev.platoR + .02, .2], [ev.empujes[0], .27], [ev.empujes[1], -.52], [ev.empujes[2], .48], [ev.empujes[3], -.42], [ev.empujes[3] + .42, .19]];
  let a = 0; for (const [tt, d] of K) a += d * resorte(t - tt, 1.9, .3);
  return a + .012 * Math.sin(t * 1.7);
}
function plato(c: C, x: number, y: number) {
  c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.moveTo(x, y - CUER); c.lineTo(x - 115, y - 6); c.moveTo(x, y - CUER); c.lineTo(x + 115, y - 6); c.stroke();
  c.fillStyle = BLANCO; c.lineWidth = 6; c.beginPath(); c.moveTo(x - 138, y - 8); c.quadraticCurveTo(x, y + 66, x + 138, y - 8); c.closePath(); c.fill(); c.stroke();
}
function escBalanza(c: C, t: number) {
  c.save(); c.translate(0, 90); escBalanza0(c, t); c.restore();
}
function escBalanza0(c: C, t: number) {
  const a = angBal(t), cs = Math.cos(a), sn = Math.sin(a);
  const L: XY = [FUL[0] - BRZ * cs, FUL[1] - BRZ * sn], R: XY = [FUL[0] + BRZ * cs, FUL[1] + BRZ * sn];
  const pl: XY = [L[0], L[1] + CUER], pr: XY = [R[0], R[1] + CUER];
  // piso y columna
  c.strokeStyle = "rgba(17,17,17,.3)"; c.lineWidth = 3; c.beginPath(); c.moveTo(-60, 1460); c.lineTo(1140, 1460); c.stroke();
  sombra(c, 540, 1462, 260, .3);
  c.fillStyle = TINTA; c.beginPath(); c.moveTo(400, 1460); c.lineTo(680, 1460); c.lineTo(600, 1400); c.lineTo(480, 1400); c.closePath(); c.fill();
  c.fillRect(526, FUL[1], 28, 1400 - FUL[1]);
  // brazo de la balanza y fiel
  c.save(); c.translate(FUL[0], FUL[1]); c.rotate(a);
  c.fillStyle = TINTA; c.beginPath(); c.roundRect(-BRZ - 14, -13, 2 * BRZ + 28, 26, 13); c.fill();
  c.beginPath(); c.moveTo(-16, -10); c.lineTo(0, -120); c.lineTo(16, -10); c.closePath(); c.fill();
  c.restore();
  c.fillStyle = ACENTO; c.beginPath(); c.arc(FUL[0], FUL[1], 15, 0, 7); c.fill();
  // marcas de nivel junto al fiel
  c.strokeStyle = "rgba(17,17,17,.4)"; c.lineWidth = 3;
  for (const g of [-.3, -.15, 0, .15, .3]) { c.beginPath(); c.moveTo(FUL[0] + Math.sin(g) * 150, FUL[1] - Math.cos(g) * 150); c.lineTo(FUL[0] + Math.sin(g) * (g === 0 ? 182 : 168), FUL[1] - Math.cos(g) * (g === 0 ? 182 : 168)); c.stroke(); }
  plato(c, pl[0], pl[1]); plato(c, pr[0], pr[1]);
  // la medalla sube desde el piso; el reloj cae de arriba
  const um = prog(t, ev.platoM - .4, ev.platoM), ur = prog(t, ev.platoR - .38, ev.platoR);
  if (t > ev.platoM - .4) {
    const x = lerp(260, pl[0], ease.outCubic(um)), y = lerp(2050, pl[1] - 108, ease.outCubic(um)) + (um >= 1 ? 6 * Math.exp(-(t - ev.platoM) * 9) * Math.sin((t - ev.platoM) * 30) : 0);
    cinta(c, x - 30, y - 230, x, y - 80, 16);
    c.save(); c.translate(x, y); c.rotate(.12 * (1 - um) + a * .4); medalla(c, 102, t); c.restore();
  }
  if (t > ev.platoR - .38) {
    const x = pr[0], y = lerp(-300, pr[1] - 128, ease.inCubic(ur));
    const [ah, am] = manecillas(t);
    c.save(); c.translate(x, y); c.rotate(a * .4 + (1 - ur) * -.3); reloj(c, 118, ah, am, segundero(t)); c.restore();
  }
  // las dos son ciertas
  const sale = 1 - smooth(prog(t, ev.poreso - .1, ev.poreso + .2));
  for (const [k, x] of [[0, 255], [1, 825]] as XY[]) {
    const v = prog(t, ev.ciertas + k * .18, ev.ciertas + k * .18 + .25);
    if (v > 0 && sale > 0) { c.save(); c.globalAlpha = sale; palomita(c, x, 1230, 130, v); texto(c, "cierto", x, 1370, { fuente: serif(96, true), color: TINTA, alfa: smooth(v * 2) }); c.restore(); }
  }
  // nadie se pone de acuerdo: manos que empujan de un lado y del otro
  ev.empujes.forEach((tp, i) => {
    const u = t - tp + .22; if (u < 0 || u > .75) return;
    const ent = ease.outCubic(clamp(u / .22)) * (1 - ease.inCubic(clamp((u - .45) / .3)));
    const izq = i % 2 === 1, p = izq ? pl : pr;
    const ox = izq ? -140 : 1220, oy = 1550;
    brazo(c, ox, oy, lerp(ox, p[0] + (izq ? -60 : 60), ent), lerp(oy, p[1] - 30, ent), izq ? -80 : 80, .9, TINTA, 1, 1.15);
  });
}

// ==================================================================================================
// 4. AGI sobre un listón que cada quien pone a su altura
// ==================================================================================================
const POSTE = [150, 930];
function barraY(t: number) {
  let y = 1130; const K: [number, number][] = [[ev.barra[0], 1330], [ev.barra[1], 830], [ev.barra[2], 1090]];
  for (const [tt, v] of K) y = lerp(y, v, ease.outBack(prog(t, tt - .05, tt + .28), 1.6));
  return y;
}
function escAGI(c: C, t: number) {
  const by = barraY(t), vy = (barraY(t) - barraY(t - 1 / 30)) * 30;
  c.strokeStyle = "rgba(17,17,17,.3)"; c.lineWidth = 3; c.beginPath(); c.moveTo(-60, 1500); c.lineTo(1140, 1500); c.stroke();
  for (const x of POSTE) { sombra(c, x, 1502, 90, .28); c.fillStyle = TINTA; c.fillRect(x - 11, 600, 22, 900); c.fillRect(x - 46, 1480, 92, 22); c.beginPath(); c.arc(x, 600, 16, 0, 7); c.fill(); }
  // listón
  c.fillStyle = ACENTO; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.roundRect(POSTE[0] - 30, by - 12, POSTE[1] - POSTE[0] + 60, 24, 10); c.fill(); c.stroke();
  // letras de papel que caen y viajan con el listón
  const L = ["A", "G", "I"], X = [330, 548, 708];
  L.forEach((ch, i) => {
    const tl = ev.letras[i], u = prog(t, tl - .32, tl);
    if (t < tl - .32) return;
    const rb = t > tl ? 26 * Math.exp(-(t - tl) * 8) * Math.abs(Math.sin((t - tl) * 18)) : 0;
    const y = lerp(-300, by - 14, ease.inCubic(u)) - rb - Math.max(-vy, 0) * .012 * (i + 1) + Math.max(vy, 0) * .02 * (i + 1);
    const g = (1 - u) * (i - 1) * .4 + vy * .00004 * (i - 1) + .015 * Math.sin(t * 1.9 + i);
    c.save(); c.translate(X[i], y); c.rotate(g);
    texto(c, ch, 9, 9, { fuente: serif(330), color: "rgba(20,18,14,.22)", base: "alphabetic" });
    texto(c, ch, 0, 0, { fuente: serif(330), color: TINTA, base: "alphabetic" });
    c.restore();
  });
  const q = aparece(t, ev.interroga, .4, 2.6);
  if (q > 0) { c.save(); c.translate(842, by - 14 - 6 * Math.sin(t * 3)); c.rotate(.1 + .05 * Math.sin(t * 2.2)); c.scale(q, q); texto(c, "?", 0, 0, { fuente: serif(300, true), color: ACENTO }); c.restore(); }
  rotulo(c, t, ev.termino, 999, "inteligencia artificial", 330, 92, TINTA, true);
  rotulo(c, t, ev.termino + .15, 999, "general", 432, 92, TINTA, true);
  // las manos que lo ponen cada una a su altura
  const ORIG: XY[] = [[-150, 900], [1230, 1500], [560, 2050]];
  ev.barra.forEach((tb, i) => {
    const u = t - tb + .32; if (u < 0 || u > 1.05) return;
    const ent = ease.outCubic(clamp(u / .3)) * (1 - ease.inCubic(clamp((u - .7) / .35)));
    const dest: XY = i === 0 ? [POSTE[0] + 70, by + 4] : i === 1 ? [POSTE[1] - 70, by + 4] : [560, by + 34];
    const o = ORIG[i];
    brazo(c, o[0], o[1], lerp(o[0], dest[0], ent), lerp(o[1], dest[1], ent), i === 1 ? 90 : -70, .25, TINTA, 1, 1.2);
  });
  // y de qué gane con eso: etiquetas de precio que cuelgan del listón
  [300, 540, 790].forEach((x, i) => {
    const tg = ev.gane + i * .12, u = t - tg; if (u < -.3) return;
    const caida = u < 0 ? (1 + u / .3) : 1, oy = u < 0 ? lerp(-400, 0, ease.inCubic(caida)) - (by + 150) * (1 - ease.inCubic(caida)) : 0;
    const sw = u > 0 ? .5 * Math.exp(-u * 2.2) * Math.sin(u * 8 + i) + .06 * Math.sin(t * 1.6 + i) : 0;
    c.save(); c.translate(x, by + 12 + oy); c.rotate(sw);
    c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 110); c.stroke();
    c.translate(0, 110);
    c.fillStyle = KRAFT; c.lineWidth = 4; c.beginPath(); c.moveTo(-60, 30); c.lineTo(0, -6); c.lineTo(60, 30); c.lineTo(60, 200); c.lineTo(-60, 200); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = BLANCO; c.beginPath(); c.arc(0, 22, 9, 0, 7); c.fill(); c.stroke();
    texto(c, "$", 0, 160, { fuente: serif(118), color: TINTA });
    c.restore();
  });
}

// ==================================================================================================
// 5. Tres atriles, tres respuestas, tres cajas que cuelgan de ellas
// ==================================================================================================
const LX = [540, 1300, 2060], PISO_A = 1420;
const ATR = [
  { nom: ["Sam", "Altman"], caja: "OpenAI", lin: [["ya casi…", 104, true], ["la palabra", 92, false], ["ya ni importa", 98, true]] as [string, number, boolean][], t: () => ev.altA },
  { nom: ["Dario", "Amodei"], caja: "Anthropic", lin: [["uno o dos años", 104, false], ["…o bastante más", 96, true]] as [string, number, boolean][], t: () => [ev.anios, ev.bastante] },
  { nom: ["Yann", "LeCun"], caja: "AMI Labs", lin: [["¿nivel humano", 92, false], ["con un LLM?", 92, false], ["una tontería", 98, true]] as [string, number, boolean][], t: () => [ev.nivel, ev.nivel + .25, ev.tonteria] },
];
function camAtriles(t: number) {
  let cx = LX[0], z = 1, cy = 860;
  cx = lerp(cx, LX[1], ease.inOutCubic(prog(t, ev.amodei, ev.amodei + .55)));
  cx = lerp(cx, LX[2], ease.inOutCubic(prog(t, ev.lecun, ev.lecun + .55)));
  const k = ease.inOutCubic(prog(t, ev.tres, ev.tres + .8));
  cx = lerp(cx, LX[1] + 184, k); z = lerp(1, .41, k); cy = lerp(860, 1130, k);
  return { cx: cx + 14 * Math.sin(t * .6), z: z * (1 + .01 * Math.sin(t * .9)), cy };
}
function atril(c: C, x: number, t: number, nom: string[], luz: number) {
  // cono de luz
  const g = c.createLinearGradient(0, 0, 0, PISO_A);
  g.addColorStop(0, `rgba(255,226,160,${.05 + .1 * luz})`); g.addColorStop(1, `rgba(255,226,160,${.12 + .2 * luz})`);
  c.fillStyle = g; c.beginPath(); c.moveTo(x - 80, -400); c.lineTo(x + 80, -400); c.lineTo(x + 360, PISO_A); c.lineTo(x - 360, PISO_A); c.closePath(); c.fill();
  sombra(c, x, PISO_A + 4, 300, .3);
  // micrófono
  c.strokeStyle = TINTA; c.lineWidth = 9; c.lineCap = "round"; c.beginPath(); c.moveTo(x + 140, 960); c.quadraticCurveTo(x + 150, 860, x + 60, 820); c.stroke();
  c.fillStyle = TINTA; c.beginPath(); c.ellipse(x + 46, 810, 34, 24, -.5, 0, 7); c.fill();
  // cuerpo
  c.fillStyle = "#E4DED1"; c.strokeStyle = TINTA; c.lineWidth = 6; c.lineJoin = "round";
  c.beginPath(); c.moveTo(x - 200, 1000); c.lineTo(x + 200, 1000); c.lineTo(x + 160, PISO_A); c.lineTo(x - 160, PISO_A); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = "#CFC8B8"; c.beginPath(); c.moveTo(x - 250, 1000); c.lineTo(x + 250, 1000); c.lineTo(x + 228, 930); c.lineTo(x - 228, 930); c.closePath(); c.fill(); c.stroke();
  // placa con el nombre
  c.fillStyle = BLANCO; c.lineWidth = 5; c.beginPath(); c.rect(x - 175, 1060, 350, 220); c.fill(); c.stroke();
  texto(c, nom[0], x, 1155, { fuente: serif(92), color: TINTA });
  texto(c, nom[1], x, 1250, { fuente: serif(92), color: TINTA });
}
function caja(c: C, x: number, y: number, nombre: string) {
  c.fillStyle = "rgba(20,18,14,.16)"; c.fillRect(x - 300 + 14, y + 16, 600, 340);
  c.fillStyle = KRAFT; c.strokeStyle = TINTA; c.lineWidth = 8; c.beginPath(); c.rect(x - 300, y, 600, 340); c.fill(); c.stroke();
  c.lineWidth = 5; c.strokeStyle = "rgba(17,17,17,.45)";
  for (const yy of [y + 60, y + 280]) { c.beginPath(); c.moveTo(x - 300, yy); c.lineTo(x + 300, yy); c.stroke(); }
  texto(c, nombre, x, y + 222, { fuente: serif(nombre.length > 8 ? 142 : 158), color: TINTA });
}
function escAtriles(c: C, t: number) {
  const k = camAtriles(t);
  c.save(); c.translate(540, 960); c.scale(k.z, k.z); c.translate(-k.cx, -k.cy);
  c.fillStyle = "rgba(214,208,196,.35)"; c.fillRect(-900, PISO_A, 4600, 1400);
  c.strokeStyle = "rgba(17,17,17,.35)"; c.lineWidth = 4; c.beginPath(); c.moveTo(-900, PISO_A); c.lineTo(3700, PISO_A); c.stroke();
  const turno = t < ev.amodei + .2 ? 0 : t < ev.lecun + .2 ? 1 : t < ev.tres ? 2 : -1;
  const HABLA = ev.habla as [number, number][];
  ATR.forEach((A, i) => {
    const x = LX[i];
    atril(c, x, t, A.nom, turno === i || turno === -1 ? 1 : 0);
    // ondas del micrófono mientras habla
    const [h0, h1] = HABLA[i];
    if (t > h0 && t < h1 + .6) {
      const fin = 1 - smooth(prog(t, h1, h1 + .6));
      c.save(); c.strokeStyle = TINTA; c.lineCap = "round";
      for (let k = 0; k < 3; k++) {
        const fr = ((t - h0) * 1.6 + k / 3) % 1, r = 50 + fr * 150;
        c.globalAlpha = (1 - fr) * .55 * fin; c.lineWidth = 7 * (1 - fr) + 2;
        c.beginPath(); c.arc(x + 46, 812, r, -.55, .55); c.stroke();
        c.beginPath(); c.arc(x + 46, 812, r, Math.PI - .55, Math.PI + .55); c.stroke();
      }
      c.restore();
    }
  });
  // cajas que se asoman y cuelgan de su respuesta
  ATR.forEach((A, i) => {
    const x = LX[i], tc = ev.cajas[i], u = t - tc; if (u < 0) return;
    const sube = ease.outBack(prog(u, 0, .45), 1.4);
    const cuelga = t > ev.dependen ? .05 * Math.exp(-(t - ev.dependen) * 1.8) * Math.sin((t - ev.dependen) * 6 + i) + .012 * Math.sin(t * 1.3 + i) : 0;
    const yC = lerp(2700, 1640, sube);
    const hilo = ease.outCubic(prog(t, ev.dependen + i * .1, ev.dependen + i * .1 + .3));
    const gy = ATR[i].lin.length > 1 ? 800 + (ATR[i].lin.length - 1) * 40 : 760;
    // el hilo baja por un lado del atril, sin cruzar la placa del nombre
    const hx = x + 290;
    if (hilo > 0) { c.strokeStyle = ACENTO; c.lineWidth = 16; c.beginPath(); c.moveTo(hx, gy - 20); c.lineTo(hx + Math.sin(cuelga) * (yC - gy) * hilo, lerp(gy - 20, yC, hilo)); c.stroke(); }
    c.save(); c.translate(hx, gy); c.rotate(cuelga); c.translate(-hx, -gy); caja(c, x, yC, A.caja); c.restore();
  });
  // globos
  ATR.forEach((A, i) => {
    const ts = A.t(), x = LX[i] + 40, a = aparece(t, ts[0] - .08, .32, 1.9); if (a <= 0) return;
    const n = A.lin.filter((_, j) => t >= ts[j] - .08).length, h = 120 + A.lin.length * 104, y = 760 - h / 2 - 40;
    escala(c, x, y + h / 2 + 7 * Math.sin(t * 1.9 + i * 2), a, () => {
      c.rotate(.012 * Math.sin(t * 1.3 + i));
      globo(c, 0, -h / 2, 800, h, 6, 50, 7);
      A.lin.forEach(([s, px, it], j) => {
        if (j >= n) return;
        const al = smooth(prog(t, ts[j] - .08, ts[j] + .12));
        texto(c, s, 0, -h + 104 + j * 104 + px * .1, { fuente: serif(px, it), color: it && j === A.lin.length - 1 && A.lin.length > 1 ? ACENTO : TINTA, alfa: al });
      });
    });
  });
  c.restore();
  rotulo(c, t, ev.dependen, 999, "dependen", 300, 140, ACENTO, true);
}

// ==================================================================================================
// 6. ARC-AGI-3 al 62%
// ==================================================================================================
const BX0 = 120, BX1 = 900, BY = 980;
function escARC(c: C, t: number) {
  // deriva lenta propia de la escena: la barra nunca se queda quieta en pantalla
  const z = 1 + .03 * Math.sin((t - ev.arc) * .9);
  c.save(); c.translate(540 + 22 * Math.sin((t - ev.arc) * .8), 1040 + 14 * Math.cos((t - ev.arc) * .7)); c.rotate(.012 * Math.sin((t - ev.arc) * .6)); c.scale(z, z); c.translate(-540, -960);
  escARC0(c, t); c.restore();
}
function escARC0(c: C, t: number) {
  const f = .999 * ease.inOutCubic(prog(t, ev.llega - .05, ev.llena));
  const xf = BX0 + (BX1 - BX0) * f;
  rotulo(c, t, ev.nombreArc - .15, 999, "ARC-AGI-3", 400, 120, TINTA);
  // barra
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 6; c.beginPath(); c.roundRect(BX0, BY, BX1 - BX0, 110, 14); c.fill();
  if (f > 0) { c.save(); c.beginPath(); c.roundRect(BX0, BY, BX1 - BX0, 110, 14); c.clip(); c.fillStyle = TINTA; c.fillRect(BX0, BY, xf - BX0, 110);
    c.strokeStyle = "rgba(244,242,236,.12)"; c.lineWidth = 6; for (let x = BX0 - 200; x < xf; x += 34) { c.beginPath(); c.moveTo(x + (t * 40) % 34, BY + 110); c.lineTo(x + 70 + (t * 40) % 34, BY); c.stroke(); } c.restore(); }
  c.strokeStyle = TINTA; c.lineWidth = 6; c.beginPath(); c.roundRect(BX0, BY, BX1 - BX0, 110, 14); c.stroke();
  // la regla se marca raya por raya mientras se nombra la prueba
  const tr = (k: number) => ease.outBack(prog(t, ev.nombreArc + .2 + k * .17, ev.nombreArc + .45 + k * .17), 2.2);
  for (let k = 0; k <= 10; k++) { const x = BX0 + (BX1 - BX0) * k / 10, q = tr(k); if (q <= 0) continue; c.lineWidth = k % 5 ? 3 : 5; c.beginPath(); c.moveTo(x, BY + 110); c.lineTo(x, BY + 110 + ((k % 5 ? 22 : 40) * q)); c.stroke(); }
  for (const [k, s] of [[0, "0"], [.5, "50"], [1, "100"]] as [number, string][]) { const q = tr(k * 10); if (q > 0) escala(c, BX0 + (BX1 - BX0) * k, BY + 190, q, () => texto(c, s, 0, 20, { fuente: mono(56), color: GRIS })); }
  // banderita al final
  c.strokeStyle = TINTA; c.lineWidth = 6; c.beginPath(); c.moveTo(BX1 - 10, BY); c.lineTo(BX1 - 10, BY - 190); c.stroke();
  const ond = 14 * Math.sin(t * 6.3), ond2 = 8 * Math.sin(t * 6.3 + 1.4);
  c.fillStyle = ACENTO; c.beginPath(); c.moveTo(BX1 - 10, BY - 190); c.quadraticCurveTo(BX1 - 60, BY - 190 + ond2, BX1 - 10 - 104, BY - 160 + ond); c.quadraticCurveTo(BX1 - 60, BY - 140 + ond2, BX1 - 10, BY - 130); c.closePath(); c.fill();
  // el modelo: la bola calienta con brinquitos; luego se le arma alrededor el coche de papel del capítulo 9 (el arnés)
  const arma = (k: number) => ease.outBack(prog(t, ev.arnes - .08 + k * .13, ev.arnes + .24 + k * .13), 1.8);
  const conCoche = t > ev.arnes - .1, rueda = t > ev.llega - .05 && t < ev.llena + .1;
  const cx = Math.max(xf - 122, BX0 + 120), wy = BY - 34;
  const hop = conCoche ? (rueda ? Math.abs(Math.sin(t * 17)) * 5 : Math.abs(Math.sin(t * 3)) * 3) : Math.abs(Math.sin(t * 6.8)) * 34;
  const bx = cx - 12 + (conCoche ? 0 : 8 * Math.sin(t * 3.4)), byb = conCoche ? wy - 92 - hop : BY - 76 - hop;
  const m1: XY = conCoche ? [-120 + 10 * Math.sin(t * 2), -110] : [-150 + 40 * Math.sin(t * 6.8), -105 + 35 * Math.cos(t * 6.8)];
  const m2: XY = conCoche ? (rueda ? [130, 30] : [140, -90 + 20 * Math.sin(t * 2.4)]) : [150 - 40 * Math.sin(t * 6.8), -105 + 35 * Math.sin(t * 6.8)];
  agente2(c, bx, byb, 76, m1, m2, { piso: conCoche ? undefined : BY - 2, a1: .8, a2: rueda ? .2 : .8 });
  if (conCoche) {
    const k0 = arma(0), k1 = arma(1), k2 = arma(2), dx = -420 * (1 - clamp(k0)), giro = rueda ? (t - ev.llega) * 14 : 0;
    sombra(c, cx, BY + 2, 170, .25);
    // carrocería de papel, al frente de la bola
    c.save(); c.translate(cx + dx, wy - hop * .4); c.globalAlpha = clamp(k0 * 1.5);
    c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 5; c.lineJoin = "round";
    c.beginPath(); c.moveTo(-128, 6); c.lineTo(-128, -46); c.lineTo(-70, -58); c.lineTo(40, -58); c.lineTo(78, -30); c.lineTo(128, -26); c.lineTo(128, 6); c.closePath(); c.fill(); c.stroke();
    c.lineWidth = 3; c.beginPath(); c.moveTo(48, -54); c.lineTo(48, 2); c.stroke();
    c.fillStyle = ACENTO; c.fillRect(96, -22, 26, 12);
    texto(c, "arnés", -40, -24, { fuente: serif(50, true), color: TINTA });
    c.restore();
    // ruedas que caen en su lugar
    for (const [k, ox] of [[k1, -78], [k2, 80]] as XY[]) {
      if (k <= 0) continue;
      c.save(); c.translate(cx + ox, wy - 260 * (1 - clamp(k))); c.rotate(giro);
      c.fillStyle = TINTA; c.beginPath(); c.arc(0, 0, 34, 0, 7); c.fill();
      c.fillStyle = BLANCO; c.beginPath(); c.arc(0, 0, 13, 0, 7); c.fill();
      c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.moveTo(-13, 0); c.lineTo(13, 0); c.stroke();
      c.restore();
    }
    // su etiqueta: arnés
    const ke = aparece(t, ev.arnes + .12, .3, 2);
    if (ke > 0 && t < ev.llega + .6) escala(c, cx + 20 + dx, wy - 226, ke * (1 - smooth(prog(t, ev.llega + .3, ev.llega + .55))), () => {
      c.rotate(-.12); c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.moveTo(40, 30); c.lineTo(70, 120); c.stroke();
      etiqueta(c, 0, -40, 250, 92, 0, "arnés", 70);
    });
  }
  if (t > ev.llega - .05) {
    const z = 1 + .14 * Math.exp(-Math.max(t - ev.llena, 0) * 5) * (t > ev.llena ? 1 : 0);
    const txt = f >= .998 ? "99.9%" : `${Math.floor(f * 100)}%`;
    escala(c, 540, 690, z, () => texto(c, txt, 0, 0, { fuente: serif(230), color: ACENTO }));
  }
  // la nota de sus creadores, clavada en la meta
  const a = aparece(t, ev.nota - .05, .35, 1.6);
  if (a > 0) {
    c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.moveTo(BX1 - 10, BY + 110); c.lineTo(lerp(BX1 - 10, 700, a), lerp(BY + 110, 1222, a)); c.stroke();
    escala(c, 690, 1340, a, () => {
      c.rotate(.03 + .01 * Math.sin(t * 1.4));
      c.fillStyle = "rgba(20,18,14,.15)"; c.fillRect(-202, -118, 420, 260);
      c.fillStyle = "#F7E9B8"; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.rect(-210, -128, 420, 256); c.fill(); c.stroke();
      c.fillStyle = ACENTO; c.beginPath(); c.arc(0, -114, 11, 0, 7); c.fill();
      texto(c, "no prueba", 0, -30, { fuente: serif(80, true), color: TINTA });
      texto(c, "que sea AGI", 0, 50, { fuente: serif(80, true), color: TINTA });
      texto(c, "— sus creadores", 0, 108, { fuente: serif(52), color: "#5c5a54" });
    });
  }
}

// ==================================================================================================
// 7. Una mano que llena páginas; un lazo que no cierra frente al espejo
// ==================================================================================================
const PAG = Array.from({ length: 10 }, (_, i) => ({ x: 154 + (i % 5) * 158, y: 440 + Math.floor(i / 5) * 214, w: 140, h: 194 }));
function pagina(c: C, p: { x: number; y: number; w: number; h: number }, llena: number, gris: boolean, t: number, i: number) {
  c.fillStyle = "rgba(20,18,14,.12)"; c.fillRect(p.x + 6, p.y + 8, p.w, p.h);
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.rect(p.x, p.y, p.w, p.h); c.fill(); c.stroke();
  const r = azar(50 + i);
  for (let k = 0; k < 8; k++) {
    const y = p.y + 30 + k * 21, ind = (r() < .4 ? 18 : 0) + (r() < .2 ? 18 : 0), w = 40 + r() * (p.w - 64 - ind);
    c.strokeStyle = "rgba(17,17,17,.12)"; c.lineWidth = 6; c.beginPath(); c.moveTo(p.x + 16 + ind, y); c.lineTo(p.x + 16 + ind + w, y); c.stroke();
    const u = clamp(llena * 8 - k);
    if (u > 0) { c.strokeStyle = gris ? "rgba(17,17,17,.62)" : ACENTO; c.lineWidth = 6; c.beginPath(); c.moveTo(p.x + 16 + ind, y); c.lineTo(p.x + 16 + ind + w * u, y); c.stroke(); }
  }
}
function lapiz(c: C, x: number, y: number, g: number) {
  c.save(); c.translate(x, y); c.rotate(g);
  c.fillStyle = "#E9C46A"; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.rect(-12, -150, 24, 120); c.fill(); c.stroke();
  c.fillStyle = BLANCO; c.beginPath(); c.moveTo(-12, -30); c.lineTo(12, -30); c.lineTo(0, 0); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = TINTA; c.beginPath(); c.moveTo(-4, -10); c.lineTo(4, -10); c.lineTo(0, 0); c.closePath(); c.fill();
  c.restore();
}
function escCodigo(c: C, t: number) {
  const sal = ease.inOutCubic(prog(t, ev.espejo - .1, ev.espejo + .45));
  // --- A: las páginas ---
  if (sal < 1) {
    c.save(); c.translate(0, -1500 * sal + 100);
    const t0 = ev.codigo + .4, t1 = ev.anthropic + .4, d = (t1 - t0) / 8.3;
    let manoP: XY = [880, 600], escribiendo = false;
    PAG.forEach((p, i) => {
      if (i >= 8) { const tg = t0 + (i - 8) * .5; pagina(c, p, i === 8 ? clamp((t - tg) / 1.4) * .7 + (t > tg ? .0 : 0) : clamp((t - tg) / 1.6), true, t, i); return; }
      const u = clamp((t - t0 - i * d) / d); pagina(c, p, u, false, t, i);
      if (u > 0 && u < 1) { escribiendo = true; const k = Math.floor(u * 8), fr = u * 8 - k; manoP = [p.x + 20 + fr * (p.w - 40), p.y + 30 + k * 21]; }
    });
    if (t > t0 + 8 * d && t < t1 + .1) { const p = PAG[8], u = clamp((t - t0 - 8 * d) / (d * .3)); escribiendo = u < 1; manoP = [p.x + 20 + u * (p.w - 40), p.y + 30]; }
    if (t > t1) manoP = [lerp(manoP[0], 860, smooth(prog(t, t1, t1 + .4))), lerp(manoP[1], 300, smooth(prog(t, t1, t1 + .4)))];
    // la bola, sentada sobre las páginas, escribe con la mano larga
    const bx = 862, byb = 330 + Math.abs(Math.sin(t * 3)) * -6;
    const hx = manoP[0] + (escribiendo ? 6 * Math.sin(t * 60) : 0), hy = manoP[1] + (escribiendo ? 4 * Math.sin(t * 47) : 0);
    agente2(c, bx, byb, 70, [-120, -40 + 10 * Math.sin(t * 2)], [(hx - bx) / 70 * 90, (hy - byb) / 70 * 90], { piso: 438, a2: .1 });
    lapiz(c, hx, hy, .5);
    texto(c, "más del", 540, 940, { fuente: serif(96, true), color: TINTA, alfa: smooth(prog(t, ev.codigo + .3, ev.codigo + .5)) });
    const z = aparece(t, ev.ochenta - .05, .35, 2);
    escala(c, 540, 1190, z, () => texto(c, "80%", 0, 0, { fuente: serif(250), color: ACENTO }));
    rotulo(c, t, ev.anthropic - .1, 999, "del código de Anthropic", 1310, 88, TINTA);
    rotulo(c, t, ev.claude, 999, "lo escribe Claude", 1450, 104, TINTA, true);
    c.restore();
  }
  // --- B: la mano, el espejo y el lazo ---
  if (sal > 0) {
    c.save(); c.translate(0, 1500 * (1 - sal));
    const P = 1320;
    c.strokeStyle = "rgba(17,17,17,.3)"; c.lineWidth = 3; c.beginPath(); c.moveTo(-60, P); c.lineTo(1140, P); c.stroke();
    // espejo
    const MX = 790, MY = 960, RX = 152, RY = 280;
    sombra(c, MX, P + 4, 200, .26);
    c.strokeStyle = TINTA; c.lineWidth = 8; c.beginPath(); c.moveTo(MX - 90, P); c.lineTo(MX - 30, MY + RY - 20); c.moveTo(MX + 90, P); c.lineTo(MX + 30, MY + RY - 20); c.stroke();
    c.save(); c.beginPath(); c.ellipse(MX, MY, RX, RY, 0, 0, 7); c.clip();
    const gg = c.createLinearGradient(MX - RX, MY - RY, MX + RX, MY + RY); gg.addColorStop(0, "#DCE3E2"); gg.addColorStop(1, "#BCC6C5");
    c.fillStyle = gg; c.fillRect(MX - RX, MY - RY, 2 * RX, 2 * RY);
    // reflejo: la misma bola, al revés, escribiendo lo mismo
    c.globalAlpha = .55; const rbx = MX + 30, rby = MY + 150, wr = 6 * Math.sin(t * 40);
    c.save(); c.translate(rbx, 0); c.scale(-1, 1); c.translate(-rbx, 0);
    c.fillStyle = BLANCO; c.fillRect(rbx + 70, rby - 200, 110, 140);
    agente2(c, rbx, rby, 74, [110, -60], [150 + wr, -150], { a1: .5, a2: .1 });
    c.restore(); c.globalAlpha = 1;
    c.fillStyle = "rgba(255,255,255,.4)"; c.save(); c.translate(MX - 60, MY - 120); c.rotate(.5); c.fillRect(-12, -150, 24, 300); c.fillRect(30, -120, 10, 240); c.restore();
    c.restore();
    c.strokeStyle = TINTA; c.lineWidth = 12; c.beginPath(); c.ellipse(MX, MY, RX, RY, 0, 0, 7); c.stroke();
    // la bola: sostiene la hoja y escribe
    const bx = 330, byb = P - 110 - Math.abs(Math.sin(t * 2.2)) * 6;
    c.save(); c.translate(500, 950); c.rotate(.08); c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.rect(-90, -120, 180, 240); c.fill(); c.stroke();
    for (let k = 0; k < 7; k++) { const u = clamp((t - ev.espejo - .4) * 2.5 - k); if (u > 0) { c.strokeStyle = ACENTO; c.lineWidth = 6; c.beginPath(); c.moveTo(-64, -88 + k * 30); c.lineTo(-64 + (90 + (k * 37) % 40) * u, -88 + k * 30); c.stroke(); } }
    c.restore();
    const wx = 520 + 30 * Math.sin(t * 7), wy = 930 + 50 * ((t * 1.3) % 1) + 6 * Math.sin(t * 43);
    agente2(c, bx, byb, 108, [(430 - bx) / 108 * 90, (1060 - byb) / 108 * 90], [(wx - bx) / 108 * 90, (wy - byb) / 108 * 90], { piso: P + 2, a1: .5, a2: .1 });
    lapiz(c, wx, wy, .7);
    // el lazo que no cierra
    const k = ease.inOutSine(prog(t, ev.lazo, ev.todaviaNo)), CX = 560, CY = 950, RL = 410, a0 = -Math.PI / 2 + .42, a1 = a0 + 6.2832 * .865 * k;
    if (k > 0) {
      c.save(); c.strokeStyle = ACENTO; c.lineWidth = 9; c.lineCap = "round"; c.setLineDash([2, 26]); c.lineDashOffset = -t * 60;
      c.beginPath(); c.arc(CX, CY, RL, a0, a1); c.stroke(); c.restore();
      const hx = CX + Math.cos(a1) * RL, hy = CY + Math.sin(a1) * RL, dx = -Math.sin(a1), dy = Math.cos(a1);
      c.fillStyle = ACENTO; c.beginPath(); c.moveTo(hx + dx * 30, hy + dy * 30); c.lineTo(hx - dx * 6 + dy * 24, hy - dy * 6 - dx * 24); c.lineTo(hx - dx * 6 - dy * 24, hy - dy * 6 + dx * 24); c.closePath(); c.fill();
    }
    const st = aparece(t, ev.todaviaNo, .3, 2.4);
    escala(c, 560, 548, st, () => {
      c.rotate(-.07); c.fillStyle = PAPEL; c.fillRect(-196, -56, 392, 100); c.strokeStyle = ACENTO; c.lineWidth = 7; c.beginPath(); c.roundRect(-196, -56, 392, 100, 10); c.stroke();
      texto(c, "TODAVÍA NO", 0, 16, { fuente: mono(56), color: ACENTO });
    });
    rotulo(c, t, ev.automejora - .05, 999, "automejora", 400, 130, TINTA, true);
    rotulo(c, t, ev.todaviaNo + .2, 999, "— Anthropic", 1480, 84, TINTA, true);
    c.restore();
  }
}

// ==================================================================================================
// 8. El carril: acotado, verificable, rapidísimo. Y alrededor, en blanco
// ==================================================================================================
const YFIN = 90;
function ybCarril(t: number) {
  const a = ev.avanza - .2, b = ev.nosabemos - .25;
  if (t < a) return .6 + Math.max(t - ev.sabemos, 0) * .55;
  const y0 = .6 + (a - ev.sabemos) * .55;
  return y0 + 34 * ease.inOutCubic(prog(t, a, b));
}
function vistaCarril(t: number): Vista {
  const yb = ybCarril(t);
  const Vc: Vista = { tx: .1, ty: yb + 3.2, tz: .3, yaw: .14 + .03 * Math.sin(t * .5), pitch: .5, dist: 7.2 };
  const yt = ybCarril(ev.nosabemos);
  const Vt: Vista = { tx: -1.9, ty: yt + 2.2, tz: 0, yaw: .05, pitch: 1.12, dist: 11.5 + Math.max(t - ev.nosabemos - 1.6, 0) * 1.4 };
  return mezclaVista(Vc, Vt, ease.inOutCubic(prog(t, ev.nosabemos - .1, ev.nosabemos + 1.6)));
}
const PALOMAS = Array.from({ length: 30 }, (_, i) => 3 + i * 2.7);
const APUESTAS: [number, number][] = [[-1.95, 14], [1.95, 18.5], [-1.9, 23], [1.95, 27.5], [-1.9, 32]];
function posCarril(t: number) {
  const corre = t > ev.avanza - .2 && t < ev.nosabemos - .2;
  const lado = ease.inOutCubic(prog(t, ev.nosabemos + .3, ev.sale - .1));
  return { corre, bx: lerp(.1, -.98, lado), yb: ybCarril(t), z: corre ? Math.abs(Math.sin(t * 15)) * .18 : Math.abs(Math.sin(t * 3)) * .04 };
}
function bolaPantallaCarril(t: number): XY {
  const cam = camara(vistaCarril(t), 540, 900, 1250), q = posCarril(t), p = cam.p(q.bx, q.yb, q.z + .34);
  return p ? [p.x, p.y] : [540, 900];
}
function escCarril(c: C, t: number) {
  const cam = camara(vistaCarril(t), 540, 900, 1250);
  horizonte(c, cam);
  const yb = ybCarril(t);
  if (poli(c, cam, [[-1.28, -8, 0], [1.28, -8, 0], [1.28, YFIN, 0], [-1.28, YFIN, 0]])) { c.fillStyle = "#151514"; c.fill(); }
  c.strokeStyle = "rgba(244,242,236,.5)"; c.lineWidth = 2.4; seg3(c, cam, [-1.08, -8, 0], [-1.08, YFIN, 0]); seg3(c, cam, [1.08, -8, 0], [1.08, YFIN, 0]);
  // palomitas pintadas: aparecen al decir «verificables» y se encienden al pasar la bola
  PALOMAS.forEach((y, i) => {
    const k = ease.outBack(prog(t, ev.verif + i * .045, ev.verif + i * .045 + .25), 2);
    if (k <= 0) return;
    const paso = t > ev.avanza - .3 && yb > y ? Math.exp(-(yb - y) * .6) : 0;
    enPiso(c, cam, 0, y, () => { c.scale(k, k); palomita(c, 0, 0, 190, 1, paso > .05 ? "#E25B3E" : "rgba(244,242,236,.85)"); });
  });
  // muros: lo acotado
  const h = .42 * ease.outBack(prog(t, ev.acotadas - .05, ev.acotadas + .4), 1.6);
  if (h > .01) for (const sx of [-1, 1]) {
    const x = sx * 1.3;
    if (poli(c, cam, [[x, -8, 0], [x, YFIN, 0], [x, YFIN, h], [x, -8, h]])) { c.fillStyle = sx < 0 ? "#E8E4DA" : BLANCO; c.fill(); }
    c.strokeStyle = TINTA; c.lineWidth = 3.5; seg3(c, cam, [x, -8, h], [x, YFIN, h]);
  }
  // las banderitas de lo que se predijo, afuera del carril, que se quedan atrás
  APUESTAS.forEach(([x, y], i) => {
    const viento = t > ev.avanza && Math.abs(yb - y) < 3 ? Math.exp(-Math.abs(yb - y)) : 0;
    bandera(c, cam, x, y, 0, i % 2 === 0, .2 * viento * Math.sin(t * 30) + .02 * Math.sin(t * 2 + i));
  });
  // la bola corre
  const { corre, bx, z } = posCarril(t);
  const asoma = smooth(prog(t, ev.sale - .2, ev.sale + .2));
  if (corre) {
    // estela de velocidad
    c.strokeStyle = "rgba(244,242,236,.5)"; c.lineWidth = 3;
    for (let k = 0; k < 6; k++) { const xx = bx + (k - 2.5) * .12; seg3(c, cam, [xx, yb - .5 - k * .15, .2 + k * .04], [xx, yb - 1.6 - k * .3, .2 + k * .04]); }
  }
  bola3(c, cam, bx, yb, z, .34, corre ? [-150, -20] : [lerp(-110, -250, asoma), lerp(-90, -150, asoma)], corre ? [150, -10] : [120, -100], { a1: lerp(.6, .9, asoma) });
  rotulo(c, t, ev.sabemos + .3, ev.nosabemos - .2, "lo que sabemos", 260, 118, TINTA, true, 340);
  rotulo(c, t, ev.acotadas, ev.nosabemos - .2, "acotado", 390, 100, TINTA, false, 300);
  rotulo(c, t, ev.verif, ev.nosabemos - .2, "y verificable", 500, 100, TINTA, false, 300);
  rotulo(c, t, ev.nosabemos + .05, 999, "lo que", 330, 112, GRIS, true, 320);
  rotulo(c, t, ev.nosabemos + .2, 999, "no sabemos", 450, 112, GRIS, true, 320);
}

// ==================================================================================================
// 9-10. Empezó adivinando, aprendió a actuar. Y la fiesta, de verdad
// ==================================================================================================
const BM: XY = [540, 1160], RM = 150;                  // la bola del recorrido
const JAR = { x: 540, y: 1000, w: 470, h: 650 };
const BW: XY = [720, 1296], RW = 92;                   // la bola en la fiesta (mundo)
const PISO_F = 1390, INT: XY = [876, 830], FOCO = 850;
const INV: [number, number, number][] = [[392, 1094, 50], [478, 1072, 54], [690, 1078, 52], [774, 1094, 48]];
function frasco(c: C, x: number, y: number, sac: number, t: number) {
  const J = JAR;
  c.save(); c.translate(x + sac * Math.sin(t * 46) * 6, y);
  c.fillStyle = "rgba(190,205,205,.16)"; c.strokeStyle = TINTA; c.lineWidth = 6;
  c.beginPath(); c.roundRect(-J.w / 2, -J.h / 2, J.w, J.h, 64); c.fill(); c.stroke();
  const g = c.createLinearGradient(-J.w / 2, 0, -J.w / 2 + 90, 0); g.addColorStop(0, "rgba(255,255,255,.65)"); g.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = g; c.beginPath(); c.roundRect(-J.w / 2 + 16, -J.h / 2 + 40, 78, J.h - 80, 42); c.fill();
  c.fillStyle = TINTA; c.beginPath(); c.roundRect(-J.w / 2 + 36, -J.h / 2 - 54, J.w - 72, 52, 12); c.fill();
  c.fillStyle = PAPEL; for (let i = 0; i < 7; i++) c.fillRect(-J.w / 2 + 62 + i * 49, -J.h / 2 - 44, 8, 32);
  c.restore();
}
function vidrios(c: C, t: number, z: number) {
  const a = t - ev.rompe; if (a < 0 || a > 3.2) return;
  const r = azar(77);
  for (let i = 0; i < 56; i++) {
    const ang = r() * 6.28, v = 300 + r() * 760, gi = (r() - .5) * 9, tam = 16 + r() * 36, y0 = -JAR.h / 2 + r() * JAR.h, x0 = (r() - .5) * JAR.w, col = r();
    const vy = Math.sin(ang) * v, frena = Math.min(a, .5);
    const x = BM[0] + x0 + Math.cos(ang) * v * frena + Math.sin(a * 3 + i) * 40 * Math.max(a - .5, 0);
    const y = JAR.y + y0 + vy * frena + 600 * frena * frena + 260 * Math.max(a - .5, 0);
    const conf = smooth(prog(a, .25, .8));
    c.save(); c.translate(x, y); c.rotate(gi * a); c.globalAlpha = 1 - smooth(prog(a, 2.4, 3.2));
    if (conf < 1) { c.globalAlpha *= 1 - conf; c.fillStyle = "rgba(200,214,214,.55)"; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.moveTo(-tam, -tam * .4); c.lineTo(tam * .6, -tam); c.lineTo(tam, tam * .6); c.closePath(); c.fill(); c.stroke(); c.globalAlpha /= Math.max(1 - conf, .001); }
    if (conf > 0) { c.globalAlpha *= conf; c.scale(1, Math.cos(a * 8 + i)); c.fillStyle = col < .35 ? ACENTO : col < .8 ? TINTA : GRIS; c.fillRect(-11 / z, -6 / z, 22 / z, 12 / z); }
    c.restore();
  }
}
function foco(c: C, t: number, enc: number) {
  const a = Math.sin(t * 2.2) * .05 + (t > ev.clic ? .16 * Math.exp(-(t - ev.clic) * 2) * Math.sin((t - ev.clic) * 9) : 0);
  const L = 160, x = FOCO + Math.sin(a) * L, y = -40 + Math.cos(a) * L;
  c.strokeStyle = enc > .5 ? TINTA : "#3a3530"; c.lineWidth = 4; c.beginPath(); c.moveTo(FOCO, -40); c.lineTo(x, y); c.stroke();
  c.fillStyle = enc > .5 ? TINTA : "#2a2622"; c.fillRect(x - 21, y - 8, 42, 36);
  if (enc > 0) {
    const g = c.createRadialGradient(x, y + 62, 10, x, y + 62, 760);
    g.addColorStop(0, `rgba(255,226,160,${.45 * enc})`); g.addColorStop(.3, `rgba(255,232,190,${.12 * enc})`); g.addColorStop(1, "rgba(255,232,190,0)");
    c.fillStyle = g; c.fillRect(-100, -100, 1300, 2100);
  }
  const b = c.createRadialGradient(x - 10, y + 50, 4, x, y + 64, 52);
  if (enc > .5) { b.addColorStop(0, "#fff"); b.addColorStop(.6, "#FFE8AE"); b.addColorStop(1, "#E9B85C"); } else { b.addColorStop(0, "#4a443c"); b.addColorStop(1, "#191714"); }
  c.fillStyle = b; c.beginPath(); c.arc(x, y + 64, 48, 0, 7); c.fill();
}
function apagador(c: C, x: number, y: number, abajo: number, z = 1) {
  c.save(); c.translate(x, y); c.scale(z, z);
  c.fillStyle = "#FFFFFF"; c.strokeStyle = "rgba(17,17,17,.75)"; c.lineWidth = 4;
  c.beginPath(); c.roundRect(-74, -118, 148, 236, 14); c.fill(); c.stroke();
  c.fillStyle = "#E3E0D8"; c.fillRect(-30, -62, 60, 124);
  c.fillStyle = "#FBFAF6"; c.strokeStyle = TINTA; c.lineWidth = 3;
  c.beginPath(); c.roundRect(-28, -60 + (abajo > .5 ? 58 : 0), 56, 62, 6); c.fill(); c.stroke();
  c.fillStyle = GRIS; c.beginPath(); c.arc(0, -96, 7, 0, 7); c.arc(0, 96, 7, 0, 7); c.fill();
  c.restore();
}
function pelotita(c: C, x: number, y: number, r: number) {
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = Math.max(r * .1, 2.2); c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  const g = c.createRadialGradient(x - r * .3, y - r * .36, r * .1, x, y, r); g.addColorStop(0, "rgba(140,138,131,0)"); g.addColorStop(.72, "rgba(140,138,131,.07)"); g.addColorStop(1, "rgba(120,118,110,.42)");
  c.fillStyle = g; c.fill(); c.stroke();
}
function gorro(c: C, x: number, y: number, r: number, k: number, g = 0) {
  if (k <= 0) return;
  c.save(); c.translate(x, y - r * .6); c.rotate(g);
  c.fillStyle = ACENTO; c.strokeStyle = TINTA; c.lineWidth = Math.max(r * .05, 2); c.beginPath(); c.moveTo(-r * .55, 0); c.lineTo(0, -r * 1.25 * k); c.lineTo(r * .55, 0); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = TINTA; c.beginPath(); c.arc(0, -r * 1.28 * k, r * .16, 0, 7); c.fill();
  c.restore();
}
/** Mamá, la del capítulo 8: bola blanca de chongo y lentes, en su sillón. */
function mama(c: C, x: number, y: number, k: number, t: number) {
  const s2 = t - ev.fiesta - .3;
  const salto = s2 > 0 ? Math.abs(Math.sin(Math.min(s2, 1.1) * 6.6)) * 70 * Math.exp(-s2 * 2) : 0;
  const susto = s2 > 0 && s2 < 1.5;
  c.save(); c.translate(x, y); c.scale(k, k);
  c.fillStyle = "#3A3936"; c.strokeStyle = TINTA; c.lineWidth = 5;
  c.beginPath(); c.roundRect(-134, -252, 268, 256, 62); c.fill(); c.stroke();
  c.fillStyle = "#57554F"; c.beginPath(); c.roundRect(-164, -128, 70, 132, 30); c.fill(); c.stroke(); c.beginPath(); c.roundRect(94, -128, 70, 132, 30); c.fill(); c.stroke();
  const by = -128 - salto, r = 88;
  // brazos: arriba de sorpresa, luego aplaude
  c.strokeStyle = TINTA; c.lineWidth = 11; c.lineCap = "round";
  if (s2 > 0 && susto) { c.beginPath(); c.moveTo(-70, by + 30); c.lineTo(-118, by - 40); c.moveTo(70, by + 30); c.lineTo(118, by - 40); c.stroke(); }
  else if (s2 > 0) { const ap = Math.abs(Math.sin(t * 9)) * 22; c.beginPath(); c.moveTo(-70, by + 36); c.quadraticCurveTo(-60, by + 90, -14 - ap, by + 70); c.moveTo(70, by + 36); c.quadraticCurveTo(60, by + 90, 14 + ap, by + 70); c.stroke(); }
  pelotita(c, 0, by, r);
  c.fillStyle = "#4A4944"; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.arc(0, by - r - 14, 34, 0, 7); c.fill(); c.stroke();
  c.strokeStyle = "#4A4944"; c.lineWidth = 9; c.beginPath(); c.arc(0, by, r - 5, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
  const ojo = susto ? 1.3 : 1;
  c.strokeStyle = TINTA; c.lineWidth = 4.5;
  for (const sx of [-1, 1]) { c.fillStyle = "rgba(255,255,255,.65)"; c.beginPath(); c.arc(sx * 34, by - 8, 24 * ojo, 0, 7); c.fill(); c.stroke(); c.fillStyle = TINTA; c.beginPath(); c.arc(sx * 34, by - 8 + (susto ? 0 : 3), 5.5, 0, 7); c.fill(); }
  c.beginPath(); c.moveTo(-10, by - 8); c.lineTo(10, by - 8); c.stroke();
  c.fillStyle = TINTA; if (susto) { c.beginPath(); c.ellipse(0, by + 46, 15, 21, 0, 0, 7); c.fill(); } else { c.lineWidth = 4.5; c.beginPath(); c.arc(0, by + 26, 22, .25, 2.9); c.stroke(); }
  c.restore();
}
function pastel(c: C, x: number, y: number, t: number, luz: number) {
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 5;
  c.beginPath(); c.roundRect(x - 130, y - 104, 260, 104, 10); c.fill(); c.stroke();
  c.beginPath(); c.roundRect(x - 84, y - 186, 168, 84, 10); c.fill(); c.stroke();
  c.fillStyle = ACENTO;
  for (const [yy, w] of [[y - 104, 130], [y - 186, 84]] as XY[]) {
    c.beginPath(); c.moveTo(x - w, yy); for (let k = 0; k <= 10; k++) { const xx = x - w + k * w / 5; c.quadraticCurveTo(xx - w / 10, yy + 26, xx, yy); } c.lineTo(x + w, yy - 8); c.lineTo(x - w, yy - 8); c.closePath(); c.fill();
  }
  for (let k = 0; k < 5; k++) {
    const cx = x - 60 + k * 30, top = y - 186 - 58;
    c.fillStyle = k % 2 ? BLANCO : ACENTO; c.strokeStyle = TINTA; c.lineWidth = 3; c.fillRect(cx - 6, top, 12, 58); c.strokeRect(cx - 6, top, 12, 58);
    const fl = 1 + .18 * Math.sin(t * 17 + k * 2) + .1 * Math.sin(t * 29 + k);
    if (luz > 0) { const g = c.createRadialGradient(cx, top - 16, 2, cx, top - 16, 60 * fl); g.addColorStop(0, `rgba(255,214,140,${.55 * luz})`); g.addColorStop(1, "rgba(255,214,140,0)"); c.fillStyle = g; c.fillRect(cx - 70, top - 86, 140, 140); }
    c.fillStyle = "#F5B54A"; c.beginPath(); c.ellipse(cx + Math.sin(t * 11 + k) * 1.5, top - 16, 8 * fl, 17 * fl, 0, 0, 7); c.fill();
    c.fillStyle = "#FFF4D6"; c.beginPath(); c.ellipse(cx, top - 12, 3.5, 8, 0, 0, 7); c.fill();
  }
}
function picado(c: C, t: number) {
  const L = "SORPRESA", x0 = 96, x1 = 806, y = 300;
  c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.moveTo(x0, y); c.quadraticCurveTo((x0 + x1) / 2, y + 60, x1, y); c.stroke();
  for (let i = 0; i < 8; i++) {
    const u = (i + .5) / 8, x = lerp(x0, x1, u) - 42, yy = y + 60 * 2 * u * (1 - u) * 1, mece = .08 * Math.sin(t * 2.3 + i * 1.1);
    c.save(); c.translate(x + 42, yy); c.rotate(mece); c.translate(-42, 0);
    c.fillStyle = i % 3 === 1 ? ACENTO : BLANCO; c.strokeStyle = TINTA; c.lineWidth = 3;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(84, 0); c.lineTo(84, 96); for (let k = 5; k >= 0; k--) c.quadraticCurveTo(k * 14 + 7, 112, k * 14, 96); c.closePath(); c.fill(); c.stroke();
    texto(c, L[i], 42, 76, { fuente: serif(72), color: i % 3 === 1 ? PAPEL : TINTA });
    c.restore();
  }
}
function lista(c: C, t: number) {
  c.save(); c.translate(250, 650); c.rotate(-.035);
  c.fillStyle = "rgba(20,18,14,.14)"; c.fillRect(-150, -170, 320, 370);
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.rect(-160, -182, 320, 370); c.fill(); c.stroke();
  c.fillStyle = ACENTO; c.beginPath(); c.arc(0, -168, 11, 0, 7); c.fill();
  texto(c, "la fiesta", 0, -110, { fuente: serif(64, true), color: TINTA });
  ["mesa", "invitados", "pastel", "sin mariscos"].forEach((s, i) => {
    const y = -36 + i * 64;
    c.strokeStyle = TINTA; c.lineWidth = 3.5; c.strokeRect(-138, y - 24, 32, 32);
    texto(c, s, -90, y + 4, { fuente: serif(54), color: TINTA, alin: "left" });
    palomita(c, -120, y - 10, 54, prog(t, ev.organizada + i * .14, ev.organizada + i * .14 + .2), ACENTO);
  });
  c.restore();
}
function globoFiesta(c: C, x: number, y: number, t: number, f: number) {
  const bx = x + 10 * Math.sin(t * 1.3 + f), by = y + 8 * Math.sin(t * 1.7 + f);
  c.strokeStyle = "rgba(17,17,17,.55)"; c.lineWidth = 2; c.beginPath(); c.moveTo(bx, by + 60); c.quadraticCurveTo(bx + 20 * Math.sin(t + f), by + 300, 560, 1150); c.stroke();
  c.save(); c.translate(bx, by); c.scale(.86, 1); bola(c, 0, 0, 62, ACENTO); c.restore();
  c.fillStyle = ACENTO; c.beginPath(); c.moveTo(bx - 8, by + 62); c.lineTo(bx + 8, by + 62); c.lineTo(bx, by + 52); c.fill();
}
function confeti(c: C, t: number, desde: number, n: number, sem: number, alfa = 1) {
  const r = azar(sem); const a0 = t - desde; if (a0 < 0) return;
  for (let i = 0; i < n; i++) {
    const x0 = r() * 1180 - 50, v = 90 + r() * 160, f = r() * 6.3, d = r() * 2.4, col = r();
    const a = a0 - d; if (a < 0) continue;
    const y = -40 + ((a * v + r() * 300) % 1700), x = x0 + Math.sin(a * 1.6 + f) * 40;
    c.save(); c.translate(x, y); c.rotate(a * 2.5 + f); c.scale(1, Math.cos(a * 5 + f)); c.globalAlpha = alfa * .85;
    c.fillStyle = col < .35 ? ACENTO : col < .8 ? TINTA : GRIS; c.fillRect(-10, -5, 20, 10); c.restore();
  }
}
/** Etiqueta «HOLA, SOY ¿AGI?» pegada a la bola. */
function gafete(c: C, x: number, y: number, g: number) {
  c.save(); c.translate(x, y); c.rotate(g);
  c.fillStyle = "rgba(20,18,14,.2)"; c.fillRect(-92, -58, 196, 132);
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.roundRect(-100, -66, 200, 132, 10); c.fill(); c.stroke();
  c.fillStyle = ACENTO; c.beginPath(); c.roundRect(-100, -66, 200, 40, [10, 10, 0, 0]); c.fill();
  texto(c, "HOLA, SOY", 0, -37, { fuente: mono(24), color: BLANCO });
  texto(c, "¿AGI?", 0, 46, { fuente: serif(74, true), color: TINTA });
  c.restore();
}
function camFiesta(t: number) {
  const z0 = RM / RW, DY = 100, kp = ease.inOutCubic(prog(t, ev.fiesta - .55, ev.fiesta + .75));
  let Z = lerp(z0, 1, kp);
  let B: XY = [lerp(BM[0], BW[0], kp), lerp(BM[1], BW[1] + DY, kp)];
  const kin = ease.inOutCubic(prog(t, ev.yo - .15, ev.yo + .8)) * (1 - ease.inOutCubic(prog(t, ev.nombre + .35, ev.para + .3)));
  Z = lerp(Z, 1.5, kin); B = [lerp(B[0], 560, kin), lerp(B[1], 1200, kin)];
  const ka = ease.inOutSine(prog(t, ev.clic + .1, ev.dur));
  const A: XY = [lerp(BW[0], 590, ka), lerp(BW[1], 1060, ka)];
  B = [lerp(B[0], 590, ka), lerp(B[1], 1060 + DY, ka)]; Z *= 1 + .08 * ka;
  return { Z, A, B };
}
function escFinal(c: C, t: number) {
  const fiesta = t > ev.fiesta - .55;
  if (!fiesta || t < ev.fiesta + .2) {
    // --- el recorrido de la serie: sin manos, en el frasco, con manos ---
    const sale = smooth(prog(t, ev.fiesta - .5, ev.fiesta - .15));
    c.save(); c.globalAlpha = 1 - sale;
    const retrae = 1 - ease.inOutCubic(prog(t, ev.empezo + .05, ev.empezo + .5));
    const brota = ease.outBack(prog(t, ev.rompe - .05, ev.rompe + .32), 1.3);
    const enFrasco = t > ev.frasco - .02 && t < ev.rompe;
    const jy = lerp(-900, 0, ease.inCubic(prog(t, ev.frasco, ev.frasco + .25)));
    const golpe = t > ev.grieta - .05 && t < ev.rompe ? Math.exp(-(t - ev.grieta + .05) * 7) : 0;
    const bx = BM[0] + 60 * Math.sin(Math.min(t - ev.grieta + .05, .3) * 10) * golpe, by = BM[1] - (enFrasco ? 0 : Math.abs(Math.sin(t * 2.6)) * 20);
    // letras que adivina
    const aL = smooth(prog(t, ev.empezo + .25, ev.adivinando + .1)) * (1 - smooth(prog(t, ev.rompe - .1, ev.rompe + .1)));
    if (aL > 0) {
      const r = azar(14), ABC = "abcdefghilmnopqrstuvyáéó";
      for (let i = 0; i < 110; i++) {
        const rad = 200 + r() * 200, f = r() * 6.28, v = (r() - .5) * 1.6, ch = ABC[Math.floor(r() * ABC.length)];
        const a = f + t * v, x = BM[0] + Math.cos(a) * rad * .95, y = BM[1] - 130 + Math.sin(a * 1.1) * rad * 1.15;
        texto(c, ch, x, y, { fuente: serif(52 + (i % 3) * 16, i % 2 === 0), color: TINTA, alfa: aL * lerp(.25, .8, r()) });
      }
    }
    if (retrae > 0) agente2(c, bx, by, RM, [-150, -200], [170, -120], { largo: retrae, piso: BM[1] + RM + 4 });
    else if (brota > 0) agente2(c, bx, by, RM, [-210, -170 + 20 * Math.sin(t * 5)], [210, -180 + 20 * Math.cos(t * 5)], { largo: clamp(brota, 0, 1.15), piso: BM[1] + RM + 4, a1: .9, a2: .9 });
    else { sombra(c, bx, BM[1] + RM + 4, RM * 1.5, .3); bola(c, bx, by, RM); }
    if (t > ev.frasco && t < ev.rompe) {
      frasco(c, BM[0], JAR.y + jy, golpe, t);
      const gr = smooth(prog(t, ev.grieta, ev.rompe));
      if (gr > 0) { c.strokeStyle = TINTA; c.lineWidth = 3; const r2 = azar(31); for (let i = 0; i < 12; i++) { let x = bx - 60, y = by, a = r2() * 6.28; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 5; k++) { a += (r2() - .5) * 1; x += Math.cos(a) * 92 * gr; y += Math.sin(a) * 92 * gr; c.lineTo(x, y); } c.stroke(); } }
    }
    rotulo(c, t, ev.adivinando - .05, ev.frasco + .1, "adivinando", 1530, 140, TINTA, true);
    rotulo(c, t, ev.actuar - .02, 999, "actuar", 1540, 170, ACENTO, true);
    c.restore();
  }
  // los vidrios del frasco caen y se vuelven confeti de la fiesta
  vidrios(c, t, 1);
  if (fiesta) {
    const ap = smooth(prog(t, ev.fiesta - .45, ev.fiesta - .05));
    const k = camFiesta(t), oscuro = t > ev.clic ? 1 : 0;
    c.save(); c.translate(k.B[0], k.B[1]); c.scale(k.Z, k.Z); c.translate(-k.A[0], -k.A[1]);
    c.globalAlpha = ap;
    // cuarto
    c.fillStyle = "#E7E2D7"; c.fillRect(-400, PISO_F, 1900, 900);
    c.strokeStyle = "rgba(17,17,17,.3)"; c.lineWidth = 3; c.beginPath(); c.moveTo(-400, PISO_F); c.lineTo(1500, PISO_F); c.stroke();
    foco(c, t, oscuro ? 0 : 1);
    picado(c, t);
    lista(c, t);
    globoFiesta(c, 466, 640, t, 0); globoFiesta(c, 610, 590, t, 2);
    apagador(c, INT[0], INT[1], oscuro ? 1 : 0, 1);
    // invitados detrás de la mesa
    INV.forEach(([x, y, r], i) => {
      const a = t - ev.fiesta - .2 - i * .07, hop = a > 0 ? Math.abs(Math.sin(a * 7 + i)) * 34 * Math.exp(-a * .9) + Math.abs(Math.sin(t * 2.2 + i)) * 6 : 0;
      pelotita(c, x, y - hop, r); gorro(c, x, y - hop, r, 1, .12 * Math.sin(t * 2 + i));
      const q = aparece(t, ev.nadie + i * .12, .3, 2.4) * (1 - smooth(prog(t, ev.pero + .1, ev.pero + .5)));
      if (q > 0) { const u = t - ev.nadie - i * .12; escala(c, x + 8, y - hop - r * 2.5 - 24 - u * 18, q, () => { c.rotate(.12 * Math.sin(t * 3 + i)); texto(c, "?", 0, 0, { fuente: serif(96, true), color: "#5c5a54" }); }); }
    });
    // mesa
    c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.rect(330, 1150, 560, 26); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(340, 1176); c.lineTo(880, 1176); c.lineTo(880, 1330); for (let k = 14; k >= 0; k--) c.quadraticCurveTo(340 + k * 540 / 14 + 540 / 28, 1352, 340 + k * 540 / 14, 1330); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = TINTA; c.fillRect(360, 1330, 14, PISO_F - 1330); c.fillRect(846, 1330, 14, PISO_F - 1330);
    pastel(c, 580, 1150, t, oscuro);
    mama(c, 205, PISO_F, .92, t);
    confeti(c, t, ev.fiesta - .1, 90, 11, 1 - .55 * oscuro);
    // la bola con su gorro: escucha, se quita la etiqueta y va al apagador
    const va = ease.inOutCubic(prog(t, ev.nadie + .2, ev.para + .3));
    const bx = lerp(BW[0], 800, va), salto = va > 0 && va < 1 ? Math.abs(Math.sin(va * Math.PI * 3)) * 70 : Math.abs(Math.sin(t * 3)) * 8;
    const by = BW[1] - salto;
    const alcanza = ease.inOutCubic(prog(t, ev.para + .35, ev.clic - .08));
    const quita = prog(t, ev.nombre - .25, ev.nombre + .1), suelta = t > ev.nombre + .3;
    const m1: XY = t > ev.nombre - .4 && !suelta ? [lerp(-150, -20, smooth(quita * 2)), lerp(-60, 30, smooth(quita * 2))] : [-150 + 20 * Math.sin(t * 4), -170 + 30 * Math.sin(t * 5)];
    const swx = INT[0] - 6, swy = INT[1] + (oscuro ? 40 : -30);
    const m2: XY = [lerp(150 + 15 * Math.sin(t * 4.4), (swx - bx) / RW * 90, alcanza), lerp(-160 + 30 * Math.cos(t * 5), (swy - by) / RW * 90, alcanza)];
    agente2(c, bx, by, RW, m1, m2, { piso: PISO_F + 2, a1: .7, a2: lerp(.7, .2, alcanza) });
    gorro(c, bx - 8, by, RW, ease.outBack(prog(t, ev.fiesta - .2, ev.fiesta + .15), 2.2), -.15 + .05 * Math.sin(t * 3));
    // el gafete
    if (t > ev.etiq - .3) {
      const u = prog(t, ev.etiq - .3, ev.etiq);
      if (!suelta) {
        const pegado: XY = [bx + 6, by + 28];
        const x = lerp(1200, pegado[0], ease.outCubic(u)), y = lerp(900, pegado[1], ease.outCubic(u));
        const tira = smooth(quita);
        const g = -.12 + (u < 1 ? (1 - u) * 1.2 : 0) + (t > ev.nadie && t < ev.nombre - .3 ? .06 * Math.sin((t - ev.nadie) * 7) * Math.exp(-(t - ev.nadie) * 1.5) : 0);
        gafete(c, x - 60 * tira, y - 40 * tira, g - .5 * tira);
      } else {
        const a = t - ev.nombre - .3, yP = PISO_F - 30;
        const x = bx - 60 + a * 160 + Math.sin(a * 5) * 50, y = Math.min(by - 12 + a * 240, yP);
        const g = y >= yP ? -.02 : -.62 + Math.sin(a * 6) * .6;
        c.save(); c.translate(x, y); c.scale(1, y >= yP ? .35 : Math.abs(Math.cos(a * 4)) * .7 + .3); gafete(c, 0, 0, g); c.restore();
      }
    }
    // a oscuras: solo las velas
    if (oscuro) {
      const fl = 1 + .05 * Math.sin(t * 13) + .04 * Math.sin(t * 21.7), d = smooth(prog(t, ev.clic, ev.clic + .08));
      const g = c.createRadialGradient(580, 900, 40, 580, 980, 1050 * fl);
      g.addColorStop(0, `rgba(40,22,8,${.18 * d})`); g.addColorStop(.28, `rgba(22,13,6,${.56 * d})`); g.addColorStop(.6, `rgba(12,9,7,${.84 * d})`); g.addColorStop(1, `rgba(9,9,10,${.94 * d})`);
      c.fillStyle = g; c.fillRect(-500, -500, 2200, 3000);
      c.save(); c.globalCompositeOperation = "lighter";
      const w = c.createRadialGradient(580, 920, 10, 580, 940, 560 * fl);
      w.addColorStop(0, `rgba(255,170,80,${.3 * d})`); w.addColorStop(.5, `rgba(160,80,30,${.1 * d})`); w.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = w; c.fillRect(-500, -500, 2200, 3000); c.restore();
      pastel(c, 580, 1150, t, 1);
      // reflejos en los lentes de mamá y brillos del confeti
      c.fillStyle = `rgba(255,220,160,${.7 * d})`;
      const myb = PISO_F - 128 * .92;
      for (const sx of [-1, 1]) { c.beginPath(); c.arc(205 + sx * 34 * .92 + 8, myb - 14, 4, 0, 7); c.fill(); }
      const r = azar(91);
      for (let i = 0; i < 26; i++) { const x = 300 + r() * 560, y0 = r() * 1400, v = 40 + r() * 50, y = 400 + ((y0 + (t - ev.clic) * v) % 1000); const tw = .5 + .5 * Math.sin(t * (3 + r() * 4) + i); c.globalAlpha = .5 * tw * d * Math.max(0, 1 - Math.hypot(x - 580, y - 950) / 700); c.fillStyle = "#FFD9A0"; c.fillRect(x, y, 5, 3); }
      c.globalAlpha = 1;
    }
    c.restore();
  }
}

// ==================================================================================================
// Montaje: latigazos entre escenas
// ==================================================================================================
const ESC: { ini: number; fn: (c: C, t: number) => void; dx: number; dy: number }[] = [
  { ini: -1, fn: escPista, dx: 0, dy: 0 },
  { ini: ev.balanza, fn: escBalanza, dx: 0, dy: -1 },
  { ini: ev.agi, fn: escAGI, dx: 0, dy: -1 },
  { ini: ev.altman, fn: escAtriles, dx: -1, dy: 0 },
  { ini: ev.arc, fn: escARC, dx: 0, dy: -1 },
  { ini: ev.codigo, fn: escCodigo, dx: -1, dy: 0 },
  { ini: ev.sabemos, fn: escCarril, dx: 0, dy: -1 },
  { ini: ev.empezo, fn: escFinal, dx: 0, dy: 0 },
];
const TRANS = .42;
function dibuja(c: C, t: number) {
  const oscuro = t > ev.clic;
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  const z = 1.025 + .012 * Math.sin(t * .83);
  c.save(); c.translate(540 + 9 * Math.sin(t * .71), 960 + 11 * Math.cos(t * .61)); c.rotate(.004 * Math.sin(t * .47)); c.scale(z, z); c.translate(-540, -960);
  let i = 0; for (let k = 0; k < ESC.length; k++) if (t >= ESC[k].ini) i = k;
  const E = ESC[i], a = t - E.ini;
  if (i > 0 && a < TRANS) {
    const P = ESC[i - 1], k = ease.inOutCubic(a / TRANS);
    if (E.dx || E.dy) {
      c.save(); c.translate(E.dx * 1180 * k, E.dy * 2000 * k); P.fn(c, t); c.restore();
      c.save(); c.translate(-E.dx * 1180 * (1 - k), -E.dy * 2000 * (1 - k)); E.fn(c, t); c.restore();
    } else {
      // zoom: el carril se hunde en la bola y aparece la bola de la serie 1
      const [qx, qy] = bolaPantallaCarril(E.ini);
      c.save(); c.globalAlpha = 1 - smooth(a / (TRANS * .6)); c.translate(lerp(qx, BM[0], k), lerp(qy, BM[1], k)); c.scale(1 + 7 * k * k, 1 + 7 * k * k); c.translate(-qx, -qy); P.fn(c, t); c.restore();
      c.save(); c.globalAlpha = smooth(a / TRANS); E.fn(c, t); c.restore();
    }
  } else E.fn(c, t);
  c.restore();
  if (!oscuro) polvo(c, t, TINTA, 1);
}

export const Pieza: React.FC = () => <Lienzo dibuja={(c, t) => dibuja(c, t)} preparar={() => ({})} />;
