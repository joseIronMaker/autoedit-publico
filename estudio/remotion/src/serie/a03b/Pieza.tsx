// Serie 2, capítulo 3b: la cuenta. Sigue al bucle de a03, que terminó con la bola cobrando.
// Una caja registradora de papel con tres teclas (LEE, ESCRIBE, CACHÉ) sobre el mostrador donde trabaja la bola.
// Cada token es un papelito: los que lee entran por la tolva izquierda y cuestan una moneda; los que escribe salen
// por la derecha y cuestan cinco. En el bucle, cada vuelta reimprime todo lo anterior: el ticket crece al cuadrado y
// en la vuelta 10 toca el piso. La caché es una charola tibia con el principio ya leído, cobrado a una décima; se
// tira si cambias una letra del principio y se enfría si nadie la usa. Con suscripción, una cortina tapa la cuenta,
// pero el ticket sigue corriendo. Renglones, monedas, fichas y golpes salen de cuenta.json (lo escribe partitura.py).
import React from "react";
import { azar, clamp, ease, lerp, prog, smooth, texto } from "../../kit";
import { ACENTO, bola, GRIS, Lienzo, LUZ, mono, NOCHE, PAPEL, rotulo, serif, sombra, TINTA } from "../../marca";
import { agente, brazo } from "../../personaje";
import cuenta from "./cuenta.json";
import duracion from "./duracion.json";

export const DURACION = duracion.dur;
type Ctx = CanvasRenderingContext2D;
type P = [number, number];
const A = cuenta.A, E = cuenta.E, TAU = Math.PI * 2;

// ---------- el mundo (coordenadas en px a escala 1) ----------
const CX = 560, MESA = 900, CANTO = 928, PISO = 1545;
const K = { x0: 384, x1: 736, top: 664, base: 822, pie: 900 };        // la caja
const DISP = { x0: 492, x1: 628, y0: 678, y1: 718 };                   // la ventanita de la vuelta, en la cara de la caja
const SLOT = 834, TW = 128, ROW = 6, GAP = 6;
const B0 = { x: 560, y: 578, r: 104 };
const TOL: P = [336, 744], TOR: P = [784, 744];                        // boca de entrada, boca de salida
const PL = 175, PR = 886;                                              // las dos pilas de monedas
const MON = { rx: 44, ry: 12, h: 4.2 };
const TECLA = [452, 560, 668], TY = 774, NOMBRES = ["LEE", "ESCRIBE", "CACHÉ"];
const CH = { x0: 176, x1: 372, y: 886 };                                // la charola, ya afuera
const COBRE = ["#E9896C", ACENTO, "#7E2413", "#4C140A"];
const DECIMA = Math.sqrt(.1);                                           // una décima del ÁREA de la moneda

const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * TAU + f);
const ventana = (t: number, a: number, b: number, fi = .2, fo = .25) => smooth(prog(t, a - fi, a)) * (1 - smooth(prog(t, b, b + fo)));
const pulso = (t: number, t0: number, dur = .5) => (t >= t0 && t < t0 + dur ? Math.sin(Math.PI * (t - t0) / dur) : 0);
const decae = (t: number, t0: number, k = 9) => (t >= t0 ? Math.exp(-(t - t0) * k) : 0);

// ---------- dibujo a mano ----------
function poli(c: Ctx, pts: P[], t: number, sem: number, amp = 1.7) {
  const r = azar(Math.floor(t * 10) * 977 + sem);
  c.beginPath();
  pts.forEach(([x, y], i) => { const X = x + (r() - .5) * amp, Y = y + (r() - .5) * amp; if (i) c.lineTo(X, Y); else c.moveTo(X, Y); });
  c.closePath();
}
function rayaMano(c: Ctx, x0: number, y0: number, x1: number, y1: number, t: number, sem: number, amp = 1.6) {
  const r = azar(Math.floor(t * 10) * 571 + sem), n = 6;
  c.beginPath();
  for (let i = 0; i <= n; i++) { const k = i / n, x = lerp(x0, x1, k) + (i && i < n ? (r() - .5) * amp : 0), y = lerp(y0, y1, k) + (i && i < n ? (r() - .5) * amp : 0); if (i) c.lineTo(x, y); else c.moveTo(x, y); }
  c.stroke();
}

// ---------- el ticket ----------
type Fila = { t: number; d: number; k: string; v: number; h: number; p: number };
const FILAS: Fila[] = (() => { let p = 0; return cuenta.filas.map((f) => { const h = f.k === "s" ? GAP : ROW, r = { ...f, h, p }; p += h; return r; }); })();
const L_PROG = FILAS.reduce((a, f) => a + f.h, 0);
const EXT0 = E.cortina + .5;
/** Lo que el ticket sigue imprimiendo detrás de la cortina: no se ve la cuenta, pero corre. */
const extra = (t: number) => 2250 * Math.max(0, Math.min(t, E.rompe) - EXT0) ** 1.12;
function impreso(t: number) {
  let L = 0;
  for (const f of FILAS) { if (t < f.t) break; L += f.h * clamp((t - f.t) / f.d); }
  return L + extra(t);
}
/** El renglón número i del papel (los de después del programa son la misma cuenta que sigue). */
function fila(i: number): { p: number; h: number; k: string } {
  if (i < FILAS.length) return FILAS[i];
  const j = i - FILAS.length;
  return { p: L_PROG + j * ROW, h: ROW, k: j % 24 === 23 ? "r" : "g" };
}
function filaEn(s: number) {          // índice del renglón que contiene la coordenada s del papel
  if (s >= L_PROG) return FILAS.length + Math.floor((s - L_PROG) / ROW);
  let a = 0, b = FILAS.length - 1;
  while (a < b) { const m = (a + b + 1) >> 1; if (FILAS[m].p <= s) a = m; else b = m - 1; }
  return a;
}
// el ticket nuevo, después de romper el viejo: el resumen y nada más
const NUEVO = [{ t: E.slip + .5, d: .16, k: "n" }, { t: E.slip + .62, d: .1, k: "s" }];
function impresoNuevo(t: number) { let L = 0; for (const f of NUEVO) L += (f.k === "s" ? GAP : ROW) * clamp((t - f.t) / f.d); return L; }

// ---------- la pila de papel en el piso: aros de ticket que se amontonan ----------
// Cada aro es una banda de papel parada de canto (como un rollo de cinta acostado), con su inclinación y su
// centro; los parámetros se mezclan de un aro al siguiente, así el papel es una sola tira continua.
const CXP = 600, WB = 50;
type Aro = { R: number; cx: number; dz: number; tl: number; h: number; S: number; f1: number; f2: number };
const AROS: Aro[] = (() => {
  const r = azar(404), out: Aro[] = []; let h = 0, S = 0;
  for (let n = 0; n < 90; n++) {
    const env = Math.max(.5, 1 - n / 20);
    const R = n === 0 ? 46 : n === 1 ? 120 : n === 2 ? 210 : (230 + 200 * r()) * env + 40;
    out.push({ R, cx: n === 0 ? CX : n < 3 ? CX + 30 * n : CXP + (r() - .5) * 520 * env, dz: n < 2 ? 0 : (r() - .2) * 260 * env, tl: n < 2 ? 0 : (r() - .5) * .5, h, S, f1: r() * TAU, f2: r() * TAU });
    S += TAU * R; h += n === 0 ? 4 : 13 + 14 * r();
  }
  return out;
})();
function qDeS(s: number) {
  let a = 0, b = AROS.length - 1;
  while (a < b) { const m = (a + b + 1) >> 1; if (AROS[m].S <= s) a = m; else b = m - 1; }
  return a + clamp((s - AROS[a].S) / (TAU * AROS[a].R));
}
function aroEn(q: number) {
  const n = Math.min(Math.floor(q), AROS.length - 2), w = smooth(q - n), a0 = AROS[n], b0 = AROS[n + 1];
  return { R: lerp(a0.R, b0.R, w), cx: lerp(a0.cx, b0.cx, w), dz: lerp(a0.dz, b0.dz, w), tl: lerp(a0.tl, b0.tl, w), h: lerp(a0.h, b0.h, w), f1: lerp(a0.f1, b0.f1, w), f2: lerp(a0.f2, b0.f2, w) };
}
function rizo(s: number): [number, number, number] {
  const q = qDeS(s), P2 = aroEn(q), a = -Math.PI / 2 + TAU * q, irr = q < 2 ? 1 : 1 + .2 * Math.sin(2 * a + P2.f1) + .1 * Math.sin(3 * a + P2.f2);
  const lx = P2.R * irr * Math.cos(a), ly = -P2.R * irr * .3 * Math.sin(a);
  return [P2.cx + lx * Math.cos(P2.tl) - ly * Math.sin(P2.tl), PISO - 6 - P2.h + P2.dz * .25 + lx * Math.sin(P2.tl) + ly * Math.cos(P2.tl), Math.sin(a)];
}
/** Hasta dónde baja la tira cuando ya hay pila: entra un poco en ella. */
const cimaPila = (E2: number) => PISO - 6 - Math.min(WB + 10, E2 * .5) - aroEn(qDeS(E2)).h + 30 * clamp(E2 / 60);
/** Cuánto papel cuelga y cuánto está en la pila. */
function reparte(L: number) {
  if (L <= PISO - 6 - SLOT) return { cuelga: L, pila: 0, y1: SLOT + L };
  let E2 = Math.max(0, L - (PISO - 6 - SLOT));
  for (let k = 0; k < 5; k++) E2 = Math.max(0, L - (cimaPila(E2) - SLOT));
  return { cuelga: L - E2, pila: E2, y1: SLOT + (L - E2) };
}

function renglon(c: Ctx, k: string, i: number, x0: number, y: number, w: number, resR: number, resG: number) {
  if (k === "s") {
    c.strokeStyle = "rgba(17,17,17,.38)"; c.lineWidth = 1.3; c.setLineDash([4, 4]);
    c.beginPath(); c.moveTo(x0 + 4, y + GAP / 2); c.lineTo(x0 + w - 4, y + GAP / 2); c.stroke(); c.setLineDash([]);
    return;
  }
  if (k === "c") { c.fillStyle = "rgba(233,137,108,.26)"; c.fillRect(x0 + 1, y, w - 2, ROW); }
  const r = azar(i * 131 + 17);
  let px = x0 + 7;
  const col = k === "r" ? ACENTO : k === "n" ? "rgba(17,17,17,.86)" : k === "c" ? "rgba(140,138,131,.8)" : "#B9B5AB";
  c.fillStyle = (k === "r" && resR > 0) ? `rgba(192,68,42,${1})` : (k === "g" || k === "c") && resG > 0 ? lerpCol(col, ACENTO, resG) : col;
  while (px < x0 + w - 40) {
    const pw = Math.min(6 + r() * 22, x0 + w - 40 - px);
    c.beginPath(); c.roundRect(px, y + 1.9, pw, ROW - 3.8, 1.6); c.fill();
    px += pw + 3;
  }
  c.fillStyle = "#C9603E";
  if (k === "r") for (let j = 0; j < 5; j++) { c.beginPath(); c.arc(x0 + w - 30 + j * 5.3, y + ROW / 2, 2, 0, TAU); c.fill(); }
  else { c.beginPath(); c.arc(x0 + w - 12, y + ROW / 2, k === "c" ? 2.4 * DECIMA : 2.4, 0, TAU); c.fill(); }
}
function lerpCol(a: string, b: string, k: number) {
  return k > .5 ? b : a;
}

/** La tira que cuelga de la caja. `scan`: dónde va la lectura (coordenada del papel). */
function tira(c: Ctx, t: number, L: number, y1: number, o: { scan?: number; resR?: number; resG?: number; base?: number; libre?: boolean; xo?: number }) {
  const base = o.base ?? 0, x0 = CX - TW / 2 + (o.xo ?? 0);
  const larg = y1 - SLOT; if (larg <= .5) return;
  const sk = .01 * Math.sin(t * 1.13) + .006 * Math.sin(t * .47);
  c.save(); c.translate(CX, SLOT); c.transform(1, 0, sk, 1, 0, 0); c.translate(-CX, -SLOT);
  // sombra sobre el frente del mostrador
  c.fillStyle = "rgba(20,18,14,.09)"; c.fillRect(x0 + 9, Math.max(SLOT, CANTO), TW, Math.max(0, y1 - Math.max(SLOT, CANTO)));
  c.fillStyle = "#FFFEFA"; c.fillRect(x0, SLOT, TW, larg);
  // renglones visibles
  c.save(); c.beginPath(); c.rect(x0, SLOT, TW, larg); c.clip();
  let i = filaEn(Math.max(0, base + L - .01));
  for (let n = 0; n < 400 && i >= 0; n++, i--) {
    const f = fila(i), yb = SLOT + (base + L - f.p), yt = yb - f.h;
    if (yt > y1) break;
    if (yb < SLOT) continue;
    renglon(c, f.k, i, x0, yt, TW, o.resR ?? 0, o.resG ?? 0);
  }
  if (o.scan !== undefined) {                 // la lectura: una franja roja que recorre el papel
    const ys = SLOT + (base + L - o.scan);
    const g = c.createLinearGradient(0, ys - 60, 0, ys + 8);
    g.addColorStop(0, "rgba(192,68,42,0)"); g.addColorStop(.8, "rgba(192,68,42,.32)"); g.addColorStop(1, "rgba(192,68,42,.7)");
    c.fillStyle = g; c.fillRect(x0, ys - 60, TW, 68);
  }
  c.restore();
  c.strokeStyle = TINTA; c.lineWidth = 2.6;
  rayaMano(c, x0, SLOT, x0, y1, t, 41, 1.2); rayaMano(c, x0 + TW, SLOT, x0 + TW, y1, t, 43, 1.2);
  if (o.libre !== false && y1 < cimaPila(0) - 4) {      // la punta libre, rasgada
    c.fillStyle = "#FFFEFA"; c.beginPath(); c.moveTo(x0, y1);
    for (let j = 0; j <= 8; j++) c.lineTo(x0 + j * TW / 8, y1 + (j % 2 ? 5 : 0));
    c.lineTo(x0 + TW, y1 - 1); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(x0, y1); for (let j = 0; j <= 8; j++) c.lineTo(x0 + j * TW / 8, y1 + (j % 2 ? 5 : 0)); c.stroke();
  }
  c.restore();
}

/** La pila de aros: primero todas las mitades de atrás (la cara de adentro), luego las de enfrente. */
function pilaPapel(c: Ctx, t: number, E2: number, barrido = -1) {
  if (E2 <= 2) return;
  const paso = 12, N = Math.ceil(E2 / paso), P2: { x: number; y: number; d: number; s: number }[] = [];
  for (let i = 0; i <= N; i++) { const s = Math.min(E2, i * paso), [x, y, d] = rizo(s); P2.push({ x, y, d, s }); }
  const qT = qDeS(E2), W = (s: number) => Math.min(WB, s * .5 + 6);
  sombra(c, CXP, PISO + 2, 150 + 120 * Math.min(qT, 4), .34);
  // tramos de la misma cara
  const tramos: { atras: boolean; a: number; b: number }[] = [];
  let ini = 0;
  for (let i = 1; i <= N; i++) if ((P2[i].d > 0) !== (P2[ini].d > 0) || i === N) { tramos.push({ atras: P2[ini].d > 0, a: ini, b: i }); ini = i; }
  for (const atras of [true, false]) {
    for (const tr of tramos) {
      if (tr.atras !== atras || tr.b - tr.a < 1) continue;
      c.beginPath();
      for (let i = tr.a; i <= tr.b; i++) { const p = P2[i]; if (i === tr.a) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y); }
      for (let i = tr.b; i >= tr.a; i--) { const p = P2[i]; c.lineTo(p.x, p.y - W(p.s)); }
      c.closePath();
      c.fillStyle = atras ? "#E4E0D5" : "#FFFEFA"; c.fill();
      c.strokeStyle = TINTA; c.lineWidth = 2.6; c.lineJoin = "round";
      c.beginPath(); for (let i = tr.a; i <= tr.b; i++) { const p = P2[i]; if (i === tr.a) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y); } c.stroke();
      c.beginPath(); for (let i = tr.a; i <= tr.b; i++) { const p = P2[i]; if (i === tr.a) c.moveTo(p.x, p.y - W(p.s)); else c.lineTo(p.x, p.y - W(p.s)); } c.stroke();
      if (!atras) {                           // lo impreso: rayitas a lo ancho, y de vez en cuando una roja
        c.lineWidth = 2.2;
        for (const rojo of [false, true]) {
          c.strokeStyle = rojo ? "rgba(192,68,42,.7)" : "rgba(140,138,131,.6)"; c.beginPath();
          for (let i = tr.a; i <= tr.b; i++) {
            const p = P2[i], k = Math.floor(p.s / paso); if ((k % 9 === 4) !== rojo) continue;
            const w = W(p.s); c.moveTo(p.x, p.y - w * .22); c.lineTo(p.x, p.y - w * (rojo ? .7 : .62 + .14 * Math.sin(k)));
          }
          c.stroke();
        }
      }
      if (barrido > 0 && !atras) {             // releer todo: la lectura recorre la pila de punta a punta
        c.fillStyle = "rgba(192,68,42,.42)";
        for (let i = Math.max(tr.a, 1); i <= tr.b; i++) {
          const p = P2[i], q2 = P2[i - 1]; if (p.s > barrido || p.s < barrido - 2600) continue;
          const w = W(p.s);
          c.beginPath(); c.moveTo(q2.x, q2.y); c.lineTo(p.x, p.y); c.lineTo(p.x, p.y - w); c.lineTo(q2.x, q2.y - w); c.closePath(); c.fill();
        }
      }
    }
  }
}

// ---------- monedas ----------
const VUELO = .34, RESETS = [E.barre, E.barre2];
/** La cuenta se vacía dos veces: al empezar el bucle y al llegar la caché. */
const faseDe = (t: number) => RESETS.filter((r) => t >= r).length;
type Mon = { t: number; p: string; n: number; f: number };
const MONEDAS: Mon[] = (() => {
  const cnt: Record<string, number> = {};
  return cuenta.monedas.map((m) => {
    const f = faseDe(m.t), key = m.p + f;
    cnt[key] = (cnt[key] ?? 0); const n = cnt[key]++;
    return { ...m, n, f };
  });
})();
function enPila(t: number, p: string) {
  let n = 0, ult = -9;
  const f = faseDe(t);
  for (const m of MONEDAS) {
    if (m.p !== p || m.f !== f) continue;
    const llega = m.t + VUELO;
    if (llega <= t) { n++; ult = llega; }
  }
  return { n, ult };
}
function cobre(c: Ctx, x: number, rx: number) {
  const g = c.createLinearGradient(x - rx, 0, x + rx, 0);
  g.addColorStop(0, COBRE[2]); g.addColorStop(.22, COBRE[0]); g.addColorStop(.55, COBRE[1]); g.addColorStop(1, COBRE[3]);
  return g;
}
/** Moneda acostada: (x, y) es el centro de su cara de arriba. */
function monedaPlana(c: Ctx, x: number, y: number, s = 1, tope = true) {
  const rx = MON.rx * s, ry = MON.ry * s, h = MON.h * s;
  c.fillStyle = COBRE[3]; c.beginPath(); c.ellipse(x, y + h, rx, ry, 0, 0, Math.PI); c.lineTo(x - rx, y); c.ellipse(x, y, rx, ry, 0, Math.PI, 0, true); c.closePath(); c.fill();
  c.fillStyle = cobre(c, x, rx); c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill();
  if (tope) { c.strokeStyle = "rgba(80,22,10,.7)"; c.lineWidth = Math.max(1, 1.6 * s); c.beginPath(); c.ellipse(x, y, rx * .74, ry * .74, 0, 0, TAU); c.stroke(); }
}
/** Moneda en el aire: gira sobre un eje horizontal. */
function monedaAire(c: Ctx, x: number, y: number, s: number, giro: number, alfa = 1) {
  const R = MON.rx * s, k = Math.cos(giro), ry = R * Math.max(Math.abs(k), .1), th = MON.h * s * 1.4;
  c.save(); c.globalAlpha *= alfa;
  c.fillStyle = COBRE[3]; c.beginPath(); c.ellipse(x, y + th * Math.sign(k || 1) * .5, R, ry, 0, 0, TAU); c.fill();
  c.fillStyle = cobre(c, x, R); c.beginPath(); c.ellipse(x, y, R, ry, 0, 0, TAU); c.fill();
  c.strokeStyle = "rgba(80,22,10,.75)"; c.lineWidth = Math.max(1, 1.8 * s); c.beginPath(); c.ellipse(x, y, R * .74, ry * .74, 0, 0, TAU); c.stroke();
  c.restore();
}
function pila(c: Ctx, x: number, n: number, t: number, ult: number, sem: number, res: number) {
  if (n <= 0) return;
  sombra(c, x, MESA + 3, 74, .3);
  const r = azar(sem);
  const J = Array.from({ length: n }, () => (r() - .5) * 4.5);
  for (let i = 0; i < n; i++) {
    const cae = i === n - 1 && t - ult < .1 ? (1 - (t - ult) / .1) ** 2 * 10 : 0;
    monedaPlana(c, x + J[i], MESA - MON.h - i * MON.h - cae, 1, i === n - 1);
  }
  if (res > 0) {
    const yT = MESA - n * MON.h - 30;
    c.save(); c.globalAlpha = res; c.strokeStyle = ACENTO; c.lineWidth = 5; c.setLineDash([2, 12]); c.lineCap = "round"; c.lineDashOffset = -t * 40;
    c.beginPath(); c.roundRect(x - 70, yT, 140, MESA - yT + 22, 20); c.stroke(); c.restore();
  }
}
function vuelos(c: Ctx, t: number, tray: { x: number; y: number }, nTray: number) {
  for (const m of MONEDAS) {
    const e = t - m.t; if (e < 0) break;
    if (e > VUELO) continue;
    const k = e / VUELO, chica = m.p === "C";
    const [x0, y0] = m.p === "R" ? TOR : TOL;
    const x1 = m.p === "L" ? PL : m.p === "R" ? PR : tray.x, y1 = m.p === "C" ? tray.y - 6 - Math.min(m.n, nTray) * 1.4 : MESA - MON.h - m.n * MON.h;
    const x = lerp(x0, x1, k), y = lerp(y0, y1, ease.inCubic(k) * .4 + k * .6) - Math.sin(Math.PI * k) * 110;
    monedaAire(c, x, y, chica ? DECIMA : .9, e * 19 + m.n);
  }
}

// ---------- la caja ----------
const PRESION: [number, number][] = [[E.pLee, 0], [E.pEsc, 1], [E.pCache, 2]];
function presion(t: number, i: number) {
  let p = 0;
  for (const [tp, j] of PRESION) if (j === i) p = Math.max(p, smooth(prog(t, tp - .08, tp)) * (1 - smooth(prog(t, tp + .22, tp + .4))));
  // en el bucle, la tecla de lo que se está imprimiendo se hunde sola
  for (const f of FILAS) {
    if (f.t > t + .02) break;
    if (t - f.t > .16) continue;
    const j = f.k === "r" ? 1 : f.k === "c" ? 2 : f.k === "s" ? -1 : 0;
    if (j === i) p = Math.max(p, .7 * Math.sin(Math.PI * clamp((t - f.t + .02) / .18)));
  }
  return p;
}
function salto(t: number, i: number) { return pulso(t, E.pop[i] - .04, .42); }
function luzTecla(t: number, i: number) {
  return Math.max(presion(t, i), salto(t, i) > 0 ? 1 : 0, i === 0 && t > E.pLee && t < A.segundo - .2 ? .35 : 0, i === 1 && t > E.pEsc && t < A.ahora ? .35 : 0, i === 2 && t > E.pCache && t < A.trampa ? .35 : 0);
}
function tecla(c: Ctx, t: number, i: number) {
  const x = TECLA[i], w = 100, h = 56, pr = presion(t, i), sp = salto(t, i), luz = luzTecla(t, i);
  const y = TY - sp * 18 + pr * 8, prof = 11 * (1 - pr);
  c.save(); c.translate(x, y); const z = 1 + sp * .16; c.scale(z, z);
  c.fillStyle = "#2b2a28"; c.beginPath(); c.roundRect(-w / 2, -h / 2 + prof, w, h, 11); c.fill();
  const on = luz > .5;
  const g = c.createLinearGradient(0, -h / 2, 0, h / 2);
  if (on) { g.addColorStop(0, "#D9694B"); g.addColorStop(1, ACENTO); } else if (luz > .2) { g.addColorStop(0, "#FFF7F2"); g.addColorStop(1, "#F2D8CE"); } else { g.addColorStop(0, "#FFFFFF"); g.addColorStop(1, "#E9E5DB"); }
  c.fillStyle = g; c.strokeStyle = TINTA; c.lineWidth = 3.4;
  c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, 11); c.fill(); c.stroke();
  texto(c, NOMBRES[i], 0, 9, { fuente: mono(i === 1 ? 20 : 24), color: on ? "#fff" : TINTA });
  c.restore();
}
function tolva(c: Ctx, t: number, lado: number) {
  const x0 = lado < 0 ? K.x0 + 6 : K.x1 - 6, x1 = lado < 0 ? TOL[0] : TOR[0], y = TOL[1];
  const g = c.createLinearGradient(0, y - 50, 0, y + 50); g.addColorStop(0, "#FBFAF6"); g.addColorStop(1, "#DCD7CA");
  c.fillStyle = g; c.strokeStyle = TINTA; c.lineWidth = 4.5; c.lineJoin = "round";
  poli(c, [[x0, y - 28], [x1, y - 50], [x1, y + 50], [x0, y + 28]], t, lado > 0 ? 7 : 9); c.fill(); c.stroke();
  c.fillStyle = TINTA; c.beginPath(); c.ellipse(x1, y, 12, 49, 0, 0, TAU); c.fill();
  c.strokeStyle = lado > 0 ? ACENTO : TINTA; c.lineWidth = 4; c.beginPath(); c.ellipse(x1, y, 12, 49, 0, 0, TAU); c.stroke();
}
function pantallaTxt(t: number): { s: string; t0: number } | null {
  if (t >= A.cobran - .1 && t < A.nomin - .3) return { s: "?", t0: A.cobran - .1 };
  if (t >= A.v1 - .05 && t < E.cortina + .4) {
    let v = cuenta.vueltas[0];
    for (const x of cuenta.vueltas) if (x.t <= t) v = x;
    return { s: String(v.v), t0: v.t };
  }
  return null;
}
function pantalla(c: Ctx, t: number) {
  const { x0, x1, y0, y1 } = DISP;
  c.fillStyle = NOCHE; c.strokeStyle = TINTA; c.lineWidth = 3;
  c.beginPath(); c.roundRect(x0, y0, x1 - x0, y1 - y0, 7); c.fill(); c.stroke();
  const p = pantallaTxt(t);
  if (p) {
    const k = ease.outBack(prog(t, p.t0, p.t0 + .18), 2);
    c.save(); c.beginPath(); c.rect(x0 + 4, y0 + 4, x1 - x0 - 8, y1 - y0 - 8); c.clip();
    c.translate(CX, (y0 + y1) / 2); c.scale(1, clamp(k, 0, 1.2));
    c.fillStyle = "#FFFEFA"; c.fillRect(-44, -15, 88, 30);
    texto(c, p.s, 0, 10, { fuente: mono(28), color: p.s === "?" ? ACENTO : TINTA });
    c.restore();
  }
  // la ranura de arriba, por donde entra la moneda del arranque
  c.fillStyle = TINTA; c.beginPath(); c.roundRect(CX - 36, K.top + 4, 72, 7, 3); c.fill();
}
function caja(c: Ctx, t: number, kj: number) {
  c.save(); c.translate(0, -kj * 8);
  tolva(c, t, -1); tolva(c, t, 1);
  const g = c.createLinearGradient(K.x0, 0, K.x1, 0); g.addColorStop(0, "#FFFFFF"); g.addColorStop(.55, "#EFEBE1"); g.addColorStop(1, "#D3CEC1");
  c.fillStyle = g; c.strokeStyle = TINTA; c.lineWidth = 5; c.lineJoin = "round";
  poli(c, [[K.x0 - 12, K.base], [K.x1 + 12, K.base], [K.x1 + 12, K.pie + kj * 8], [K.x0 - 12, K.pie + kj * 8]], t, 3); c.fill(); c.stroke();
  c.fillStyle = TINTA; c.beginPath(); c.roundRect(CX - TW / 2 - 12, SLOT - 7, TW + 24, 11, 5); c.fill();
  const g2 = c.createLinearGradient(K.x0, K.top, K.x1, K.base); g2.addColorStop(0, "#FFFFFF"); g2.addColorStop(1, "#E2DDD0");
  c.fillStyle = g2;
  poli(c, [[K.x0, K.base], [K.x1, K.base], [K.x1 - 22, K.top], [K.x0 + 22, K.top]], t, 5); c.fill(); c.stroke();
  pantalla(c, t);
  for (let i = 0; i < 3; i++) tecla(c, t, i);
  c.restore();
}
/** La campanita: rayas que saltan de la caja cuando cobra. */
function campanita(c: Ctx, t: number) {
  for (const t0 of [E.kc0, ...E.kc, E.kcF]) {
    const e = t - t0; if (e < 0 || e > .45) continue;
    const k = e / .45;
    c.strokeStyle = ACENTO; c.lineWidth = 6 * (1 - k); c.lineCap = "round";
    for (let j = -2; j <= 2; j++) {
      const a = -Math.PI / 2 + j * .42, r0 = 120 + k * 60, r1 = r0 + 40 * (1 - k);
      c.beginPath(); c.moveTo(CX + Math.cos(a) * r0 * 1.2, DISP.y0 + 20 + Math.sin(a) * r0); c.lineTo(CX + Math.cos(a) * r1 * 1.2, DISP.y0 + 20 + Math.sin(a) * r1); c.stroke();
    }
  }
}
function kachin(t: number) {
  let k = 0;
  for (const t0 of [E.kc0, ...E.kc, E.kcF]) k = Math.max(k, t >= t0 ? Math.exp(-(t - t0) * 14) * Math.cos((t - t0) * 40) : 0);
  return k;
}

// ---------- el mostrador ----------
function mostrador(c: Ctx, t: number) {
  c.fillStyle = "#E3DFD4"; c.fillRect(-900, PISO, 2900, 1400);
  c.strokeStyle = "rgba(17,17,17,.35)"; c.lineWidth = 3; rayaMano(c, -900, PISO, 2000, PISO, t, 61, 2);
  const g = c.createLinearGradient(0, CANTO, 0, PISO); g.addColorStop(0, "#E9E5DA"); g.addColorStop(1, "#DCD7CA");
  c.fillStyle = g; c.fillRect(-900, CANTO, 2900, PISO - CANTO);
  c.strokeStyle = "rgba(17,17,17,.16)"; c.lineWidth = 2.4;
  for (let x = -840; x < 1900; x += 150) rayaMano(c, x, CANTO + 14, x, PISO - 4, t, 70 + x, 2.4);
  // la tapa
  c.fillStyle = "#F7F4EC"; c.fillRect(-900, MESA - 4, 2900, CANTO - MESA + 4);
  c.strokeStyle = TINTA; c.lineWidth = 4.5; rayaMano(c, -900, MESA - 4, 2000, MESA - 4, t, 81, 2); rayaMano(c, -900, CANTO, 2000, CANTO, t, 83, 2);
  c.fillStyle = "rgba(20,18,14,.12)"; c.fillRect(-900, CANTO + 2, 2900, 16);
}

// ---------- la bola ----------
const LAP1 = 1.3;
function hop(t: number) {
  let h = 0;
  for (const v of cuenta.vueltas) if (v.v >= 3 && v.v <= 10) h = Math.max(h, 26 * pulso(t, v.t, .2));
  h = Math.max(h, 30 * pulso(t, A.v1 - .02, .3), 30 * pulso(t, A.v2 - .02, .3), 36 * pulso(t, A.v10 - .02, .34));
  return h;
}
function estadoBola(t: number) {
  if (t < LAP1) {
    const th = lerp(2.25, TAU, ease.outCubic(prog(t, 0, LAP1))), fr = (1 - Math.cos(th)) / 2;
    const salta = Math.abs(Math.sin(th * 4)) * 34 * (1 - smooth(prog(t, LAP1 - .3, LAP1)));
    return { x: CX + 330 * Math.sin(th), y: lerp(B0.y, 790, fr) - salta, r: lerp(B0.r, 124, fr), frente: Math.cos(th) < -.1, corre: 1 - smooth(prog(t, LAP1 - .25, LAP1)), th };
  }
  const golpe = 10 * kachin(t);
  return { x: B0.x + 4 * vaiven(t, 3.1), y: B0.y + 5 * vaiven(t, 2.3) - hop(t) + golpe, r: B0.r, frente: false, corre: 0, th: TAU };
}
type Manos = { m1: P; m2: P; ab1: number; ab2: number; pluma: number; carta: number; slip: number };
function mezcla(a: P, b: P, k: number): P { return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]; }
function manos(t: number, b: { x: number; y: number }): Manos {
  let m1: P = [K.x0 + 22 + 5 * vaiven(t, 2.3), K.top + 6 + 4 * vaiven(t, 1.9)], m2: P = [K.x1 - 22 + 5 * vaiven(t, 2.1, 1), K.top + 6 + 4 * vaiven(t, 1.7, 2)];
  let ab1 = .55, ab2 = .55, pluma = 0, carta = 0, slip = 0;
  // ka-ching: golpe con las dos manos sobre la caja
  const kg = pulso(t, E.kc0 - .25, .5);
  if (kg > 0) { m1 = mezcla(m1, [K.x0 + 60, K.top - 30 + 40 * clamp((t - E.kc0 + .25) / .25)], kg); m2 = mezcla(m2, [K.x1 - 60, K.top - 30 + 40 * clamp((t - E.kc0 + .25) / .25)], kg); }
  // guía lo que entra (lee)
  const gl = ventana(t, A.lee - .1, A.segundo - .3, .3, .3);
  if (gl > 0) { m1 = mezcla(m1, [TOL[0] + 4 + 10 * vaiven(t, .7), TOL[1] - 86 + 8 * vaiven(t, .9)], gl); ab1 = lerp(ab1, .9, gl); }
  // aprieta teclas
  for (const [tp, j] of PRESION) {
    const k = smooth(prog(t, tp - .32, tp - .08)) * (1 - smooth(prog(t, tp + .3, tp + .55)));
    if (k <= 0) continue;
    const tgt: P = [TECLA[j] - 6, TY - 30 + 16 * smooth(prog(t, tp - .1, tp))];
    if (j === 1 || j === 2) { m2 = mezcla(m2, tgt, k); ab2 = lerp(ab2, .2, k); } else { m1 = mezcla(m1, tgt, k); ab1 = lerp(ab1, .2, k); }
  }
  // escribe (con pluma) sobre la libreta
  const es = Math.max(ventana(t, A.escribe - .05, A.escribir - .1, .3, .3), ventana(t, E.escribe2 + .1, E.slip - .05, .25, .2));
  if (es > 0) { m2 = mezcla(m2, [LIB.x - 14 + 22 * Math.sin(t * 17), LIB.y - 6 + 7 * Math.sin(t * 29)], es); ab2 = lerp(ab2, .15, es); pluma = es; }
  // saca la charola
  const sc = ventana(t, E.charola - .05, E.charola + .55, .3, .3);
  if (sc > 0) { const x = lerp(K.x0, CH.x0, ease.outCubic(prog(t, E.charola, E.charola + .4))); m1 = mezcla(m1, [x + 8, CH.y - 14], sc); ab1 = lerp(ab1, .15, sc); }
  // la trampa: cambia la primera ficha
  const tr = ventana(t, E.voltea - .05, E.voltea + .08, .35, .3);
  if (tr > 0) { m1 = mezcla(m1, [CH.x0 + 38, CH.y - 40 - 20 * pulso(t, E.voltea - .08, .3)], tr); ab1 = lerp(ab1, .1, tr); }
  // se enfría: espera, con las manos caídas
  const es2 = ventana(t, E.enfria + .3, E.cortina - .2, .5, .3);
  if (es2 > 0) { m1 = mezcla(m1, [K.x0 - 6, K.top + 40 + 6 * vaiven(t, 3.3)], es2); m2 = mezcla(m2, [K.x1 + 6, K.top + 40 + 6 * vaiven(t, 3.1)], es2); ab1 = lerp(ab1, .3, es2); ab2 = lerp(ab2, .3, es2); }
  // rompe el ticket
  const ro = ventana(t, E.rompe - .05, E.rompe + .35, .35, .3), jala = smooth(prog(t, E.rompe - .05, E.rompe + .12));
  if (ro > 0) {
    m1 = mezcla(m1, [CX - 52 - 70 * jala, SLOT + 30 - 90 * jala], ro); m2 = mezcla(m2, [CX + 52 + 70 * jala, SLOT + 40 - 70 * jala], ro);
    ab1 = lerp(ab1, .05, ro); ab2 = lerp(ab2, .05, ro);
  }
  // la pregunta en la mano
  const ca = smooth(prog(t, E.carta - .1, E.carta + .3));
  if (ca > 0) { m2 = mezcla(m2, [770 + 8 * vaiven(t, 2.7), 560 + 10 * vaiven(t, 2.2)], ca); ab2 = lerp(ab2, .3, ca); carta = ca; }
  slip = ventana(t, E.escribe2 + .2, E.slip, .2, .05);
  return { m1, m2, ab1, ab2, pluma, carta, slip };
}
const LIB = { x: 850, y: 618 };   // la libreta donde escribe
function cuerpo(c: Ctx, t: number, b: ReturnType<typeof estadoBola>) {
  sombra(c, b.x, b.frente ? MESA + 2 : K.top + 4, 120 * b.r / 104, b.frente ? .3 : .0);
  bola(c, b.x, b.y, b.r);
}
function correr(c: Ctx, t: number, b: ReturnType<typeof estadoBola>) {
  const g = b.r / 90, o = Math.sin(t * 22);
  const lado = Math.sin(b.th) > 0 ? 1 : -1;
  sombra(c, b.x, b.frente ? MESA + 2 : MESA - 120, 130 * g, b.frente ? .32 : .1);
  agente(c, b.x, b.y, b.r, [b.x - 150 * g - lado * 50 * g, b.y - 40 * g + o * 70 * g], [b.x + 150 * g - lado * 50 * g, b.y - 40 * g - o * 70 * g], { abre1: .8, abre2: .8 });
}
function brazos(c: Ctx, t: number, b: ReturnType<typeof estadoBola>, M: Manos) {
  const g = b.r / 90;
  brazo(c, b.x - 54 * g, b.y - 50 * g, M.m1[0], M.m1[1], 90 * g, M.ab1, TINTA, 1, g);
  brazo(c, b.x + 60 * g, b.y - 30 * g, M.m2[0], M.m2[1], -100 * g, M.ab2, TINTA, 1, g);
  if (M.pluma > .05) {
    c.save(); c.translate(M.m2[0], M.m2[1]); c.rotate(-.7 + .1 * Math.sin(t * 17)); c.globalAlpha = clamp(M.pluma * 2);
    c.fillStyle = TINTA; c.beginPath(); c.roundRect(-6, -86, 12, 92, 5); c.fill();
    c.fillStyle = ACENTO; c.beginPath(); c.moveTo(-6, 4); c.lineTo(6, 4); c.lineTo(0, 22); c.closePath(); c.fill();
    c.restore();
  }
  if (M.carta > .02) {
    c.save(); c.translate(M.m2[0] + 30, M.m2[1] - 84); c.rotate(-.06 + .03 * vaiven(t, 2.4)); c.scale(M.carta, M.carta);
    c.fillStyle = "rgba(20,18,14,.13)"; c.beginPath(); c.roundRect(-98, -36, 210, 84, 10); c.fill();
    c.fillStyle = "#FFFEFA"; c.strokeStyle = TINTA; c.lineWidth = 3.5; c.beginPath(); c.roundRect(-106, -44, 212, 84, 10); c.fill(); c.stroke();
    texto(c, "¿y el pastel?", 0, 12, { fuente: serif(40, true), color: TINTA });
    c.restore();
  }
}
function libreta(c: Ctx, t: number) {
  const a = Math.max(ventana(t, A.escribe - .2, A.escribir - .05, .25, .3), ventana(t, E.escribe2 - .05, E.slip + .05, .25, .2));
  if (a <= 0) return;
  c.save(); c.globalAlpha = a; c.translate(LIB.x, LIB.y + 40); c.rotate(.08);
  c.fillStyle = "#FFFEFA"; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.roundRect(-62, -44, 124, 92, 6); c.fill(); c.stroke();
  c.fillStyle = TINTA; c.fillRect(-62, -44, 124, 10);
  const segunda = t > E.escribe2 - .1;
  const t0 = segunda ? E.escribe2 + .1 : A.escribe - .05, k = prog(t, t0, segunda ? E.slip - .05 : A.salidaF);
  c.strokeStyle = segunda ? TINTA : ACENTO; c.lineWidth = 3; c.lineCap = "round";
  for (let j = 0; j < 3; j++) {
    const l = clamp(k * 3 - j) * 92; if (l <= 0) continue;
    c.beginPath(); for (let x = 0; x <= l; x += 4) { const y = -12 + j * 22 + Math.sin(x * .45 + j) * 3; if (x) c.lineTo(-46 + x, y); else c.moveTo(-46, y); } c.stroke();
  }
  c.restore();
}

// ---------- fichas de papel (tokens) ----------
function ficha(c: Ctx, s: string, x: number, y: number, px: number, rot: number, rojo: boolean, alfa = 1) {
  if (alfa <= .01) return;
  c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha *= alfa;
  c.font = mono(px); const w = c.measureText(s).width + px * .7, h = px * 1.52;
  c.fillStyle = "rgba(20,18,14,.12)"; c.fillRect(-w / 2 + 4, -h / 2 + 5, w, h);
  c.fillStyle = "#FFFEFA"; c.strokeStyle = rojo ? ACENTO : TINTA; c.lineWidth = Math.max(1.6, px * .1);
  c.beginPath(); c.rect(-w / 2, -h / 2, w, h); c.fill(); c.stroke();
  c.fillStyle = rojo ? ACENTO : TINTA; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText(s, -w / 2 + px * .35, 1);
  c.restore();
}
// Los tres papeles de lo que lee: tu mensaje, sus instrucciones y la plática. Sus fichas salen en fila.
const ITEMS = [0, 1, 2].map((g) => {
  const fs = cuenta.fichas.filter((f) => f.g === g);
  return { t0: fs[0].t, tFin: fs[fs.length - 1].t + .12 };
});
const ITEM_P: P = [150, 598];
const CAMINO: [P, P, P] = [[ITEM_P[0] + 46, ITEM_P[1] - 8], [ITEM_P[0] + 150, ITEM_P[1] - 190], [TOL[0] - 6, TOL[1]]];
function origenFicha(f: { t: number; s: string }, j: number): P {
  const r = azar(j * 7 + 3);
  if (f.t > A.ahora) return [190, 520 + r() * 40];
  return [-90, 560 + r() * 200];
}
function fichas(c: Ctx, t: number) {
  // en orden: la que acaba de salir del papel queda encima y su corte se lee entero
  for (let j = 0; j < cuenta.fichas.length; j++) {
    const f = cuenta.fichas[j];
    const e = t - f.t; if (e < 0 || e > f.d) continue;
    const k = e / f.d;
    if (f.k === "in" && f.g >= 0) {           // en fila, por el mismo camino: nunca se tapan
      const [p0, p1, p2] = CAMINO, u = 1 - k;
      const x = u * u * p0[0] + 2 * u * k * p1[0] + k * k * p2[0], y = u * u * p0[1] + 2 * u * k * p1[1] + k * k * p2[1];
      const z = lerp(1, .55, smooth(prog(k, .75, 1)));
      ficha(c, f.s, x, y, 30 * z * lerp(.7, 1, smooth(prog(k, 0, .15))), .12 * Math.sin(j * 2.1 + k * 3), false, 1 - smooth(prog(k, .9, 1)));
    } else if (f.k === "in") {
      const [x0, y0] = origenFicha(f, j), x1 = TOL[0] - 6, y1 = TOL[1];
      const x = lerp(x0, x1, ease.inOutCubic(k)), y = lerp(y0, y1, k) - Math.sin(Math.PI * k) * 120;
      const z = lerp(1, .55, smooth(prog(k, .7, 1)));
      ficha(c, f.s, x, y, (f.s.length > 8 ? 18 : 30) * z, (1 - k) * .4 * Math.sin(j * 2.1), false, 1 - smooth(prog(k, .9, 1)));
    } else {
      const x = lerp(TOR[0] + 10, 1240, ease.inCubic(k) * .7 + k * .3), y = TOR[1] - 10 - Math.sin(Math.PI * k * .8) * 230 + k * 40;
      ficha(c, f.s, x, y, 32 * lerp(.6, 1.15, smooth(prog(k, 0, .25))), .3 * Math.sin(k * 5 + j), true);
    }
  }
}
function objetoItem(c: Ctx, t: number) {
  ITEMS.forEach((it, n) => {
    const tFin = it.tFin;
    const llega = ease.outCubic(prog(t, it.t0 - .34, it.t0 - .02)), gasta = prog(t, it.t0, tFin);
    if (llega <= 0 || gasta >= 1) return;
    const x = lerp(-180, ITEM_P[0], llega), y = ITEM_P[1] + 6 * vaiven(t, 1.3);
    c.save(); c.translate(x, y); c.rotate(-.05 + .02 * Math.sin(t * 2)); const z = 1 - .45 * gasta; c.scale(z, z); c.globalAlpha = 1 - smooth(prog(gasta, .75, 1));
    c.fillStyle = "rgba(20,18,14,.12)"; c.fillRect(-112, -70, 232, 150);
    c.fillStyle = "#FFFEFA"; c.strokeStyle = TINTA; c.lineWidth = 4;
    if (n === 0) {
      c.beginPath(); c.roundRect(-120, -78, 240, 150, 12); c.fill(); c.stroke();
      texto(c, "¿un lugar para", -4, -14, { fuente: serif(36), color: TINTA }); texto(c, "la fiesta?", -4, 34, { fuente: serif(40, true), color: ACENTO });
      c.fillStyle = ACENTO; c.beginPath(); c.moveTo(78, 60); c.lineTo(98, 22); c.lineTo(118, 60); c.closePath(); c.fill();
    } else if (n === 1) {
      c.beginPath(); c.rect(-100, -96, 200, 192); c.fill(); c.stroke();
      c.fillStyle = TINTA; c.fillRect(-100, -96, 200, 16);
      c.fillStyle = "rgba(17,17,17,.7)"; for (let j = 0; j < 6; j++) c.fillRect(-78, -58 + j * 24, 156 - (j % 3) * 30, 7);
    } else {
      for (let j = 0; j < 3; j++) {
        const yy = -70 + j * 58, xx = j % 2 ? 20 : -20;
        c.fillStyle = j % 2 ? "#FFFEFA" : "#F0ECE2"; c.beginPath(); c.roundRect(xx - 96, yy - 22, 192, 46, 22); c.fill(); c.stroke();
        c.fillStyle = "rgba(17,17,17,.6)"; c.fillRect(xx - 66, yy - 3, 110 - j * 16, 7);
      }
    }
    c.restore();
  });
}

// ---------- lo que no entra: un reloj y una pregunta ----------
function rechazado(c: Ctx, t: number, t0: number, tipo: number) {
  const tb = t0, e = t - (tb - .8); if (e < 0 || e > 1.9) return;
  let x: number, y: number, g: number;
  if (t < tb) { const k = prog(t, tb - .8, tb), k2 = ease.inCubic(k) * .6 + k * .4; x = lerp(-80, TOL[0] - 70, k2); y = lerp(500, TOL[1] - 10, k2) - Math.sin(Math.PI * k2) * 120; g = k * 2; }
  else { const a = t - tb; x = TOL[0] - 70 - 300 * a; y = TOL[1] - 10 - 260 * a + 1300 * a * a; g = 2 - a * 9; }
  c.save(); c.translate(x, y); c.rotate(g * .3);
  if (tipo === 0) {
    c.fillStyle = "#FFFEFA"; c.strokeStyle = TINTA; c.lineWidth = 6;
    c.beginPath(); c.arc(0, 0, 62, 0, TAU); c.fill(); c.stroke();
    c.fillStyle = TINTA; c.fillRect(-12, -84, 24, 16); c.fillRect(-20, -92, 40, 10);
    c.lineWidth = 5; c.lineCap = "round"; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -40); c.moveTo(0, 0); c.lineTo(28, 10); c.stroke();
  } else {
    c.fillStyle = "#FFFEFA"; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.roundRect(-60, -70, 120, 140, 12); c.fill(); c.stroke();
    texto(c, "?", 0, 40, { fuente: serif(130, true), color: TINTA });
  }
  if (t >= tb) {            // no entra: una cruz roja
    const k = ease.outBack(prog(t, tb, tb + .2), 2);
    c.rotate(-g * .3); c.strokeStyle = ACENTO; c.lineWidth = 13; c.lineCap = "round"; c.globalAlpha = clamp(k);
    const r = 70 * clamp(k, 0, 1.3);
    c.beginPath(); c.moveTo(-r, -r); c.lineTo(r, r); c.moveTo(r, -r); c.lineTo(-r, r); c.stroke();
  }
  c.restore();
}

// ---------- la frase que se corta en tokens ----------
const FRASE: string[] = cuenta.frase;            // cortes reales de o200k_base, calculados en partitura.py
const FR_Y = 990, FR_X = 430;
function frase(c: Ctx, t: number, d: Datos) {
  const ent = ease.outCubic(prog(t, A.pedacitos - .55, A.pedacitos - .05));
  if (ent <= 0 || t > E.traga + 1) return;
  const px = 40, W = d.anchoFrase, sep = ease.outBack(prog(t, E.corte + .3, E.corte + .65), 1.6) * 20;
  const total = W.reduce((a, b) => a + b, 0) + sep * (FRASE.length - 1);
  let x = FR_X - total / 2 + (1 - ent) * -700;
  FRASE.forEach((s, j) => {
    const corto = t >= E.corte + j * .07;
    const traga = prog(t, E.traga + j * .06, E.traga + j * .06 + .42);
    const w = W[j], cxp = x + w / 2, yb = FR_Y + (corto ? 8 * Math.sin(t * 3.1 + j * 1.7) * smooth(prog(t, E.corte, E.corte + .5)) : 0);
    if (traga < 1) {
      const X = lerp(cxp, TOL[0] - 6, ease.inOutCubic(traga)), Y = lerp(yb, TOL[1], traga) - Math.sin(Math.PI * traga) * 160, z = lerp(1, .5, traga);
      c.save(); c.translate(X, Y); c.scale(z, z); c.rotate(corto ? .05 * Math.sin(j * 2.3 + t) * smooth(prog(t, E.corte, E.corte + .4)) : 0);
      c.fillStyle = "#FFFEFA"; c.fillRect(-w / 2, -34, w, 62);
      c.strokeStyle = TINTA; c.lineWidth = 3;
      if (corto) c.strokeRect(-w / 2, -34, w, 62);
      else { c.beginPath(); c.moveTo(-w / 2, -34); c.lineTo(w / 2, -34); c.moveTo(-w / 2, 28); c.lineTo(w / 2, 28); if (j === 0) { c.moveTo(-w / 2, -34); c.lineTo(-w / 2, 28); } if (j === FRASE.length - 1) { c.moveTo(w / 2, -34); c.lineTo(w / 2, 28); } c.stroke(); }
      c.fillStyle = TINTA; c.font = mono(px); c.textAlign = "left"; c.textBaseline = "middle"; c.fillText(s, -w / 2 + 6, -4);
      c.restore();
    }
    x += w + sep;
  });
  // la cuchilla: cada corte cae donde la máquina parte el texto
  let xc = FR_X - total / 2 + (1 - ent) * -700;
  for (let j = 0; j < FRASE.length - 1; j++) {
    xc += W[j];
    const tc = E.corte + (j + 1) * .07, k = prog(t, tc - .1, tc), sale = smooth(prog(t, tc + .05, tc + .3));
    if (k <= 0 || sale >= 1) continue;
    c.strokeStyle = ACENTO; c.lineWidth = 5; c.globalAlpha = 1 - sale; c.lineCap = "round";
    c.beginPath(); c.moveTo(xc + sep * (j + .5), FR_Y - 70); c.lineTo(xc + sep * (j + .5), FR_Y - 70 + 130 * ease.outCubic(k)); c.stroke(); c.globalAlpha = 1;
  }
}

// ---------- la balanza: cinco contra una ----------
const BAL = { x: 560, y: 1176 };
function balanza(c: Ctx, t: number) {
  const a = ease.outBack(prog(t, A.escribir - .15, A.escribir + .35), 1.3) * (1 - smooth(prog(t, E.barre - .1, E.barre + .3)));
  if (a <= .01) return;
  const caeY = (1 - clamp(a)) * 700 + smooth(prog(t, E.barre - .1, E.barre + .3)) * 600;
  const inc = .24 * (ease.outBack(prog(t, E.inclina - .05, E.inclina + .45), 2.2)) + .01 * Math.sin(t * 2.3);
  c.save(); c.translate(BAL.x, BAL.y + caeY);
  // poste
  c.strokeStyle = TINTA; c.lineWidth = 9; c.lineCap = "round";
  c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 300); c.stroke();
  c.fillStyle = TINTA; c.beginPath(); c.moveTo(-90, 312); c.lineTo(90, 312); c.lineTo(60, 290); c.lineTo(-60, 290); c.closePath(); c.fill();
  c.beginPath(); c.arc(0, 0, 14, 0, TAU); c.fill();
  // brazo
  const L = 262, ex = Math.cos(inc) * L, ey = Math.sin(inc) * L;
  c.lineWidth = 8; c.beginPath(); c.moveTo(-ex, -ey); c.lineTo(ex, ey); c.stroke();
  for (const lado of [-1, 1]) {
    const px = lado * ex, py = lado * ey, H = 128;
    c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.moveTo(px, py); c.lineTo(px - 96, py + H); c.moveTo(px, py); c.lineTo(px + 96, py + H); c.stroke();
    c.fillStyle = "#FFFEFA"; c.strokeStyle = TINTA; c.lineWidth = 5;
    c.beginPath(); c.moveTo(px - 116, py + H); c.quadraticCurveTo(px, py + H + 52, px + 116, py + H); c.closePath(); c.fill(); c.stroke();
    // lo que pesa: una ficha y sus monedas
    const n = lado < 0 ? 1 : 5;
    for (let i = 0; i < n; i++) {
      const sb = lado > 0 ? 18 * pulso(t, E.x5 + i * .09, .22) : 0;
      monedaPlana(c, px + 52, py + H - 4 - i * MON.h * 1.6 - sb, .82, i === n - 1);
    }
    ficha(c, lado < 0 ? "lee" : "escribe", px - 44, py + H - 28, 30, 0, lado > 0);
  }
  c.restore();
}

// ---------- la charola tibia ----------
function charolaX(t: number) { return lerp(K.x0 - 20, CH.x0, ease.outCubic(prog(t, E.charola, E.charola + .4))); }
function frio(t: number) { return smooth(prog(t, E.enfria, E.enfria + .8)) * (1 - smooth(prog(t, E.cortina - .1, E.cortina + .2))); }
function hojasCharola(t: number) {
  // cuántas hojas guardadas hay: se guardan, se tiran, se vuelven a guardar y se borran
  const g1 = clamp(prog(t, E.guarda, E.guarda + 1.4) * 5, 0, 5);
  if (t < E.tira) return { n: g1, borra: 0, tira: 0 };
  if (t < E.rellena) return { n: 5, borra: 0, tira: prog(t, E.tira, E.tira + 1.1) };
  const g2 = clamp(prog(t, E.rellena, E.rellena + .5) * 5, 0, 5);
  return { n: g2, borra: smooth(prog(t, E.borra, E.borra + .55)), tira: 0 };
}
function inclinaCharola(t: number) { return -.62 * smooth(prog(t, E.tira - .05, E.tira + .2)) * (1 - smooth(prog(t, E.tira + .9, E.tira + 1.3))); }
function charola(c: Ctx, t: number, nC: number) {
  if (t < E.charola - .05 || t > E.cortina + .5) return;
  const x0 = charolaX(t), x1 = CH.x1, y = CH.y, f = frio(t), rot = inclinaCharola(t);
  const H2 = hojasCharola(t), lleno = clamp(H2.n / 5) * (1 - H2.borra) * (t < E.tira ? 1 : t < E.rellena ? 1 - smooth(prog(t, E.tira, E.tira + .5)) : 1);
  // tibieza: un resplandor cálido debajo y vapor que sube
  const tibio = lleno * (1 - f) * smooth(prog(t, E.guarda, E.guarda + .5));
  if (tibio > .01) {
    const g = c.createRadialGradient((x0 + x1) / 2, y - 10, 10, (x0 + x1) / 2, y - 10, 170);
    g.addColorStop(0, `rgba(233,137,108,${.34 * tibio})`); g.addColorStop(1, "rgba(233,137,108,0)");
    c.fillStyle = g; c.fillRect(x0 - 160, y - 190, x1 - x0 + 320, 300);
    c.strokeStyle = `rgba(192,68,42,${.34 * tibio})`; c.lineWidth = 4; c.lineCap = "round";
    for (let j = 0; j < 4; j++) {
      const bx = lerp(x0 + 30, x1 - 30, j / 3), fase = (t * .9 + j * .37) % 1;
      c.globalAlpha = Math.sin(Math.PI * fase); c.beginPath();
      for (let k = 0; k <= 12; k++) { const yy = y - 40 - fase * 70 - k * 7, xx = bx + 9 * Math.sin(k * .7 + t * 3 + j); if (k) c.lineTo(xx, yy); else c.moveTo(xx, yy); }
      c.stroke(); c.globalAlpha = 1;
    }
  }
  c.save(); c.translate(x0, y); c.rotate(rot);
  // las hojas guardadas
  const r = azar(77);
  for (let i = 0; i < Math.ceil(H2.n); i++) {
    const a = clamp(H2.n - i) * (1 - H2.borra);
    let dx = (r() - .5) * 8, dy = -16 - i * 9;
    let al = a;
    if (H2.tira > 0) { const e = Math.max(0, H2.tira * 1.1 - i * .05); dx -= 260 * e * e + 40 * e; dy += 900 * e * e; al = a * (1 - smooth(prog(e, .6, .9))); }
    if (al <= .01) continue;
    c.save(); c.globalAlpha = al; c.translate(18 + dx, dy); c.rotate(H2.tira * (i - 2) * .4);
    c.fillStyle = "#FFFEFA"; c.strokeStyle = TINTA; c.lineWidth = 2.5; c.beginPath(); c.rect(-4, -14, x1 - x0 - 36, 22); c.fill(); c.stroke();
    if (i === Math.ceil(H2.n) - 1 || (H2.n >= 5 && i === 4)) primeraLinea(c, t, x1 - x0 - 40);
    c.restore();
  }
  // las monedas chiquitas de la caché
  for (let i = 0; i < nC; i++) {
    let dx = 0, dy = 0, a = 1;
    if (t > E.tira) { const e = prog(t, E.tira + .05, E.tira + 1); dx = -200 * e - i * 3; dy = 700 * e * e - i; a = 1 - e; }
    if (a > 0) { c.globalAlpha = a; monedaPlana(c, x1 - x0 - 26 + dx, -6 - i * 1.4 + dy, DECIMA, i === nC - 1); c.globalAlpha = 1; }
  }
  // la charola
  const col = f > .01 ? mezclaHex("#F2DCCF", "#C9D3D8", f) : "#F2DCCF";
  c.fillStyle = col; c.strokeStyle = TINTA; c.lineWidth = 4.5; c.lineJoin = "round";
  poli(c, [[-6, -2], [x1 - x0, -2], [x1 - x0 - 12, 14], [6, 14]], t, 33); c.fill(); c.stroke();
  c.fillStyle = TINTA; c.fillRect(-22, 0, 18, 6);
  if (f > .2) {               // escarcha
    const r2 = azar(Math.floor(t * 8) + 5);
    c.strokeStyle = `rgba(94,116,128,${.8 * f})`; c.lineWidth = 2;
    for (let j = 0; j < 16; j++) { const xx = 6 + r2() * (x1 - x0 - 12), yy = -6 - r2() * 46 * (1 - H2.borra), l = 4 + r2() * 4; c.beginPath(); c.moveTo(xx - l, yy); c.lineTo(xx + l, yy); c.moveTo(xx, yy - l); c.lineTo(xx, yy + l); c.moveTo(xx - l * .7, yy - l * .7); c.lineTo(xx + l * .7, yy + l * .7); c.moveTo(xx - l * .7, yy + l * .7); c.lineTo(xx + l * .7, yy - l * .7); c.stroke(); }
  }
  c.restore();
  // el polvo de lo que se borra
  if (H2.borra > 0 && H2.borra < 1) {
    const r3 = azar(55);
    for (let j = 0; j < 70; j++) {
      const xx = x0 + 20 + r3() * (x1 - x0 - 40), yy = y - 20 - r3() * 30 - H2.borra * (60 + r3() * 140), z = 2 + r3() * 4;
      c.fillStyle = `rgba(17,17,17,${.5 * (1 - H2.borra)})`; c.fillRect(xx + 20 * Math.sin(j + t * 2) * H2.borra, yy, z, z);
    }
  }
}
function mezclaHex(a: string, b: string, k: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(lerp(v, pb[i], k))).join(",")})`;
}
/** La primera línea de lo guardado: los primeros tokens, y el que cambia. */
function primeraLinea(c: Ctx, t: number, w: number) {
  const P1: string[] = cuenta.charola, J = cuenta.cambia, cambio = smooth(prog(t, E.voltea - .06, E.voltea + .06));
  c.font = mono(14); c.textBaseline = "middle"; c.textAlign = "left";
  let x = 6;
  P1.forEach((s, j) => {
    const sTxt = j === J && t > E.voltea && t < E.rellena ? cuenta.charola2[J] : s, wj = c.measureText(s).width + 5;
    if (x + wj > w - 4) return;
    let sy = 1;
    if (j === J && t > E.voltea - .1 && t < E.voltea + .1) sy = Math.abs(Math.cos(Math.PI * prog(t, E.voltea - .1, E.voltea + .1)));
    c.save(); c.translate(x + wj / 2, -3); c.scale(1, Math.max(sy, .05));
    const rojo = j === J && cambio > .5 && t < E.rellena;
    c.strokeStyle = rojo ? ACENTO : "rgba(17,17,17,.55)"; c.lineWidth = 1.2; c.strokeRect(-wj / 2, -8, wj - 1, 16);
    c.fillStyle = rojo ? ACENTO : TINTA; c.fillText(sTxt, -wj / 2 + 2.5, .5);
    c.restore();
    x += wj + 1;
  });
  // "desde el primer token": un subrayado rojo que arranca en la primera ficha
  const sub = prog(t, A.primer - .05, A.primerF) * (1 - smooth(prog(t, E.voltea + .3, E.voltea + .6)));
  if (sub > 0 && t < E.tira) { c.strokeStyle = ACENTO; c.lineWidth = 2.6; c.beginPath(); c.moveTo(4, 8); c.lineTo(4 + (w - 8) * sub, 8); c.stroke(); }
}
/** Lo que se guarda: copias del ticket que vuelan a la charola. */
function guardando(c: Ctx, t: number, y1: number) {
  for (const t0 of [E.guarda, E.rellena - .05]) {
    const dur = t0 === E.guarda ? 1.4 : .5;
    for (let j = 0; j < 5; j++) {
      const ts = t0 + j * dur / 5, k = prog(t, ts, ts + .5); if (k <= 0 || k >= 1) continue;
      const x = lerp(CX, (CH.x0 + CH.x1) / 2, ease.inOutCubic(k)), y = lerp(Math.min(y1 - 60 - j * 80, 1300), CH.y - 20 - j * 7, ease.inOutCubic(k)) - Math.sin(Math.PI * k) * 120;
      c.save(); c.translate(x, y); c.rotate(Math.sin(k * 6 + j) * .3); c.globalAlpha = .9;
      c.fillStyle = "#FFFEFA"; c.strokeStyle = TINTA; c.lineWidth = 2.5; c.beginPath(); c.rect(-60, -9, 120, 18); c.fill(); c.stroke();
      c.fillStyle = "#B9B5AB"; c.fillRect(-50, -3, 70, 6); c.fillRect(26, -3, 20, 6);
      c.restore();
    }
  }
}
/** La moneda de la caché: se encoge a una décima, y crece de nuevo cuando se pierde el descuento. */
const MC: P = [250, 520];
function escalaMC(t: number) {
  let s = 1;
  s = lerp(s, DECIMA, ease.outBack(prog(t, E.encoge, E.encoge + .35), 2));
  s = lerp(s, DECIMA * .78, ease.outBack(prog(t, E.encoge2, E.encoge2 + .3), 2));
  s = lerp(s, 1, ease.outBack(prog(t, E.crece, E.crece + .35), 2.4));
  return s;
}
function monedaCache(c: Ctx, t: number) {
  const a = ventana(t, A.cobra - .05, E.crece + .9, .25, .3) * (1 - ventana(t, A.idem, E.tira - .3, .2, .25)); if (a <= .01) return;
  const s = escalaMC(t), x = MC[0], y = MC[1] + 6 * vaiven(t, 1.7);
  c.save(); c.globalAlpha = a;
  // el contorno de la moneda completa, para comparar
  const fant = smooth(prog(t, E.encoge, E.encoge + .2)) * (1 - smooth(prog(t, E.crece, E.crece + .2)));
  if (fant > 0) { c.globalAlpha = a * fant; c.strokeStyle = GRIS; c.lineWidth = 3; c.setLineDash([6, 8]); c.beginPath(); c.arc(x, y, MON.rx * 1.6, 0, TAU); c.stroke(); c.setLineDash([]); c.globalAlpha = a; }
  monedaAire(c, x, y, s * 1.6, .25 * Math.sin(t * 1.7));
  c.restore();
}

// ---------- el reloj de cocina: unos minutos ----------
function timer(c: Ctx, t: number) {
  const a = ventana(t, E.timer0, E.borra + .7, .25, .35); if (a <= 0) return;
  const k = ease.outBack(prog(t, E.timer0 - .25, E.timer0 + .1), 1.8), x = MC[0], y = MC[1] - 10, R = 66;
  const resto = 1 - smooth(prog(t, E.timer0 + .1, E.timer1));
  const suena = t > E.timer1 ? Math.sin(t * 70) * .08 * Math.exp(-(t - E.timer1) * 3) : 0;
  c.save(); c.globalAlpha = a; c.translate(x, y); c.rotate(suena); c.scale(clamp(k, 0, 1.3), clamp(k, 0, 1.3));
  c.fillStyle = "rgba(20,18,14,.12)"; c.beginPath(); c.arc(5, 8, R, 0, TAU); c.fill();
  c.fillStyle = "#FFFEFA"; c.strokeStyle = TINTA; c.lineWidth = 6; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill(); c.stroke();
  if (resto > 0) { c.fillStyle = "rgba(192,68,42,.85)"; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, R - 12, -Math.PI / 2, -Math.PI / 2 + TAU * resto * (5 / 60)); c.closePath(); c.fill(); }
  c.strokeStyle = TINTA; c.lineWidth = 3;
  for (let i = 0; i < 12; i++) { const an = i / 12 * TAU; c.beginPath(); c.moveTo(Math.cos(an) * (R - 8), Math.sin(an) * (R - 8)); c.lineTo(Math.cos(an) * (R - (i % 3 ? 15 : 22)), Math.sin(an) * (R - (i % 3 ? 15 : 22))); c.stroke(); }
  c.fillStyle = TINTA; c.fillRect(-10, -R - 16, 20, 14);
  texto(c, "5 min", 0, 34, { fuente: mono(18), color: TINTA });
  c.restore();
}

// ---------- la cortina de la suscripción ----------
function cortinaY(t: number) {
  const baja = ease.outBack(prog(t, E.cortina, E.cortina + .5), 1.15), sube = ease.inCubic(prog(t, E.sube, E.sube + .6));
  return lerp(-900, 1470, baja) - sube * 2600;
}
function cortina(c: Ctx, t: number, yH: number) {
  if (yH < -880) return;
  const x0 = -600, x1 = 1700, top = -1200, n = 22, w = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const x = x0 + i * w, onda = 14 * Math.sin(t * 2.1 + i * .9) * decae(t, E.cortina + .45, 2.2) + 4 * Math.sin(t * 1.3 + i);
    const g = c.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, "#7E2413"); g.addColorStop(.45, ACENTO); g.addColorStop(.7, "#CF5A3B"); g.addColorStop(1, "#6A1E10");
    c.fillStyle = g; c.beginPath(); c.moveTo(x, top); c.lineTo(x + w + 1, top); c.lineTo(x + w + 1 + onda, yH); c.quadraticCurveTo(x + w / 2 + onda, yH + 26, x + onda, yH); c.closePath(); c.fill();
  }
  c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath();
  for (let i = 0; i <= n; i++) { const x = x0 + i * w + 4 * Math.sin(t * 1.3 + i); if (i) c.quadraticCurveTo(x - w / 2, yH + 26, x, yH); else c.moveTo(x, yH); }
  c.stroke();
  // el medidor de tus límites, colgado de la cortina
  const k = ease.outBack(prog(t, E.medidor - .2, E.medidor + .2), 1.6);
  if (k > 0 && t < E.sube + .6) {
    const llena = clamp(prog(t, E.medidor, A.limitesF) ** 1.6), lleno = t > A.limitesF;
    c.save(); c.translate(CX, yH - 380); c.scale(clamp(k, 0, 1.3), clamp(k, 0, 1.3));
    c.fillStyle = "#FFFEFA"; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.roundRect(-300, -50, 600, 100, 14); c.fill(); c.stroke();
    c.fillStyle = lleno ? ACENTO : TINTA; c.fillRect(-280, -30, 560 * Math.max(llena, .04), 60);
    if (lleno) { const fl = .5 + .5 * Math.sin(t * 22); c.globalAlpha = fl; c.strokeStyle = ACENTO; c.lineWidth = 8; c.beginPath(); c.roundRect(-312, -62, 624, 124, 18); c.stroke(); }
    c.restore();
  }
}
/** Monedas apagadas detrás de la cortina: alguien sigue pagando. */
function trasCortina(c: Ctx, t: number, yH: number) {
  if (t < A.alguien - .2 || t > E.sube) return;
  const r = azar(Math.floor(t * 9));
  for (let j = 0; j < 3; j++) {
    const fase = (t * 2.4 + j * .33) % 1, x = 200 + r() * 700;
    monedaAire(c, x, yH + 30 + fase * 220, .55, t * 14 + j, (1 - fase) * .9);
  }
}

// ---------- la cámara ----------
type Vista = { x: number; y: number; z: number };
const TOMAS: { t: number; d: number; v: (t: number) => Vista; c?: (x: number) => number }[] = [
  { t: 0, d: 0, v: (t) => ({ x: 600 - 24 * t, y: 730, z: 1.7 + .05 * t }) },
  { t: 1.75, d: 1.4, v: (t) => ({ x: 560, y: 690 + 4 * vaiven(t, 3), z: 2.3 + .03 * (t - 2) }), c: ease.inOutCubic },
  { t: A.nomin - .6, d: .75, v: (t) => ({ x: 430 + 6 * vaiven(t, 4), y: 800, z: 1.6 + .012 * (t - 5) }), c: ease.inOutCubic },
  { t: E.traga - .05, d: .7, v: (t) => ({ x: 560, y: 790, z: 2.25 + .02 * (t - 12.5) }), c: ease.inOutCubic },
  { t: A.primero + .15, d: .8, v: (t) => ({ x: 255 + 8 * vaiven(t, 5), y: 712, z: 1.92 + .01 * (t - 15) }), c: ease.inOutCubic },
  { t: A.segundo - .15, d: .8, v: (t) => ({ x: 805 + 6 * vaiven(t, 5), y: 712, z: 1.92 + .01 * (t - 22) }), c: ease.inOutCubic },
  { t: A.escribir - .2, d: .8, v: (t) => ({ x: 560, y: 1010 + 6 * vaiven(t, 4), z: 1.15 + .006 * (t - 26) }), c: ease.inOutCubic },
  { t: A.ahora - .1, d: .8, v: (t) => ({ x: 560, y: 790, z: 1.32 }), c: ease.inOutCubic },
  { t: A.v1 - .15, d: .7, v: (t) => ({ x: 500, y: 800, z: 2.1 + .02 * (t - 34) }), c: ease.inOutCubic },
  { t: A.encontroW + .55, d: A.v10 - A.encontroW - .1, v: (t) => ({ x: 560, y: 1010, z: 1.12 }), c: ease.inOutCubic },
  { t: A.relee10 - .1, d: 1.0, v: (t) => ({ x: 560, y: 1010 + 5 * vaiven(t, 4), z: 1.12 }), c: ease.inOutCubic },
  { t: A.paraeso - .1, d: .9, v: (t) => ({ x: 300 + 6 * vaiven(t, 5), y: 790, z: 1.72 + .01 * (t - 51) }), c: ease.inOutCubic },
  { t: A.idem - .15, d: .8, v: (t) => ({ x: 262, y: 858, z: 3.0 + .02 * (t - 64) }), c: ease.inOutCubic },
  { t: E.tira - .25, d: .5, v: (t) => ({ x: 290, y: 800, z: 1.72 }), c: ease.inOutCubic },
  { t: A.enfria - .3, d: .8, v: (t) => ({ x: 290, y: 760, z: 1.9 + .02 * (t - 71) }), c: ease.inOutCubic },
  { t: E.cortina - .2, d: .7, v: (t) => ({ x: 560, y: 1030 + 5 * vaiven(t, 4), z: 1.02 }), c: ease.inOutCubic },
  { t: E.sube - .05, d: 1.4, v: (t) => ({ x: 600, y: 1080, z: .95 }), c: ease.inOutCubic },
  { t: E.rompe - .6, d: .55, v: (t) => ({ x: 600, y: 800, z: 1.4 }), c: ease.inOutCubic },
  { t: A.porque - .1, d: .9, v: (t) => ({ x: 660, y: 640, z: 1.6 + .015 * (t - 87) }), c: ease.inOutCubic },
  { t: A.estodo - .2, d: 1.6, v: (t) => ({ x: 600, y: 1122, z: .96 - .006 * (t - 90) }), c: ease.inOutCubic },
];
function vista(t: number): Vista {
  let v = TOMAS[0].v(t);
  for (let i = 1; i < TOMAS.length; i++) {
    const q0 = TOMAS[i]; if (t < q0.t) break;
    const k = (q0.c ?? smooth)(prog(t, q0.t, q0.t + q0.d)), w = q0.v(t);
    v = { x: lerp(v.x, w.x, k), y: lerp(v.y, w.y, k), z: v.z * (w.z / v.z) ** k };
  }
  return v;
}
const GOLPES: [number, number][] = [[E.cae0, 7], [E.kc0, 16], [E.rebota1, 8], [E.rebota2, 8], [E.inclina + .25, 10], [E.x5, 8], [E.piso, 12], [E.tira + .1, 10], [E.cortina + .45, 18], [E.rompe, 14], [E.kcF, 12]];
function sacude(t: number) { let s = 0; for (const [g, a] of GOLPES) if (t >= g && t < g + .6) s = Math.max(s, a * Math.exp(-(t - g) * 9)); return s; }

// ---------- la moneda del arranque (la de a03) y la del final ----------
function monedaInicio(c: Ctx, t: number) {
  if (t > E.kc0 + .45) return;
  const X = 744;
  if (t < E.cae0) { const k = t / E.cae0; monedaAire(c, X, lerp(380, MESA - 8, k * k), 1, t * 20); return; }
  if (t < E.kc0) {                       // rebota y se asienta, cada vez más rápido
    const e = t - E.cae0, rb = Math.abs(Math.sin(e * 15)) * 26 * Math.exp(-e * 6), al = .9 * Math.exp(-e * 2.2);
    const giro = 1.4 - al;
    monedaAire(c, X, MESA - 8 - rb, 1, giro + Math.sin(e * (10 + e * 30)) * al * .25);
    return;
  }
  const k = prog(t, E.kc0, E.kc0 + .42);           // la caja la cobra: salta a la ranura de arriba
  monedaAire(c, lerp(X, CX, k), lerp(MESA - 8, K.top + 2, k) - Math.sin(Math.PI * k) * 260, lerp(1, .7, k), t * 24, 1 - smooth(prog(k, .88, 1)));
}
function monedaFinal(c: Ctx, t: number) {
  if (t < E.kcF) return;
  const X = 700, e = t - E.kcF, cae = .38;
  if (e < cae) { const k = e / cae; monedaAire(c, lerp(TOR[0], X, k), lerp(TOR[1], MESA - 8, k) - Math.sin(Math.PI * k) * 180, .9, e * 22); return; }
  const a = e - cae, al = 1.4 * Math.exp(-a * 1.6), rb = Math.abs(Math.sin(a * 13)) * 20 * Math.exp(-a * 5);
  monedaAire(c, X, MESA - 8 - rb, .9, Math.PI / 2 - al * Math.abs(Math.cos(a * (8 + a * 22))) * .9 + (a > 1.9 ? 0 : 0));
}

// ---------- el mundo ----------
type Datos = { anchoFrase: number[] };
function mundo(c: Ctx, t: number, d: Datos) {
  mostrador(c, t);
  const b = estadoBola(t), M = manos(t, b), kj = kachin(t);
  // el papel: antes y después de romperlo
  const roto = t >= E.rompe;
  const Lv = impreso(roto ? E.rompe : t), R = reparte(Lv);
  let pilaE = R.pila, y1 = R.y1;
  if (roto) {
    const cae = ease.inCubic(prog(t, E.rompe, E.rompe + .5));
    pilaE = R.pila + R.cuelga * cae;
  }
  // la cuenta, tras la cortina, no se ve; la pila sí, cuando asoma por debajo
  const bar = t > A.estodo ? clamp(prog(t, A.estodo + .1, A.para - .05)) * (pilaE + 1100) : -1;
  pilaPapel(c, t, pilaE, bar);
  // pilas de monedas
  const fase = faseDe(t), visible = t < E.cortina + .5;
  const pL = enPila(t, "L"), pR = enPila(t, "R"), pC = enPila(t, "C");
  const resR = ventana(t, A.noes - .05, A.relee - .1, .2, .25), resL = ventana(t, A.relee - .05, A.paraeso - .2, .2, .3);
  if (visible) {
    for (const r0 of RESETS) if (t >= r0 && t < r0 + .9) barrido(c, t - r0, enPila(r0 - .01, "L").n, enPila(r0 - .01, "R").n, fase);
    pila(c, PL, pL.n, t, pL.ult, 3 + fase, fase === 1 ? resL : 0); pila(c, PR, pR.n, t, pR.ult, 6 + fase, fase === 1 ? resR : 0);
  }
  // la charola sale de detrás de la caja
  const nC = t < E.tira + 1.2 ? pC.n : 0;
  charola(c, t, nC);
  // la bola, detrás de la caja
  if (!b.frente) { if (b.corre > .02) correr(c, t, b); else cuerpo(c, t, b); }
  caja(c, t, kj);
  // el ticket cuelga por delante del mostrador
  if (!roto) {
    const scan2 = t > A.relee2 - .05 && t < A.relee2 + .34 ? clamp(prog(t, A.relee2 - .05, A.relee2 + .3)) * FILAS[2].p : undefined;
    const scan10 = t > A.relee10 + .05 && t < A.principio + .05 ? clamp(prog(t, A.relee10 + .05, A.principio - .05)) * Lv : undefined;
    tira(c, t, Lv, y1, { scan: scan2 ?? scan10, resR: resR, resG: resL });
  } else {
    const cae = ease.inCubic(prog(t, E.rompe, E.rompe + .5));
    if (cae < 1) {                  // la tira rota cae entera sobre la pila
      const dd = R.cuelga * cae;
      c.save(); c.translate(0, dd); tira(c, t, R.cuelga - dd, SLOT + R.cuelga - dd, { base: R.pila + dd, libre: false }); c.restore();
    }
    const Ln = impresoNuevo(t);
    if (Ln > 0) tira(c, t, Ln, SLOT + Ln, { base: 0 });
  }
  libreta(c, t);
  if (b.frente) correr(c, t, b);
  else if (b.corre <= .02) brazos(c, t, b, M);
  campanita(c, t);
  monedaInicio(c, t);
  monedaFinal(c, t);
  rechazado(c, t, E.rebota1, 0); rechazado(c, t, E.rebota2, 1);
  frase(c, t, d);
  objetoItem(c, t);
  fichas(c, t);
  vuelos(c, t, { x: charolaX(t) + (CH.x1 - CH.x0) - 26, y: CH.y }, nC);
  guardando(c, t, y1);
  monedaCache(c, t);
  timer(c, t);
  balanza(c, t);
  bucle(c, t);
  // el papel que se rompe deja trocitos
  if (t > E.rompe && t < E.rompe + .9) {
    const r = azar(9), e = t - E.rompe;
    for (let j = 0; j < 18; j++) { const vx = (r() - .5) * 600, vy = -200 - r() * 300; c.fillStyle = "#FFFEFA"; c.strokeStyle = TINTA; c.lineWidth = 1.5; c.save(); c.translate(CX + vx * e, SLOT + 30 + vy * e + 1400 * e * e); c.rotate(e * (j - 9)); c.fillRect(-7, -5, 14, 10); c.strokeRect(-7, -5, 14, 10); c.restore(); }
  }
  // la cortina tapa la caja; el ticket sigue saliendo por debajo
  const yH = cortinaY(t);
  if (yH > -880) { trasCortina(c, t, yH); cortina(c, t, yH); }
}
/** Al empezar el bucle, las monedas de antes se van: la cuenta arranca en cero. */
function barrido(c: Ctx, e: number, nL: number, nR: number, sem: number) {
  for (const [x, n, lado] of [[PL, nL, -1], [PR, nR, 1]] as const) {
    const r = azar((lado > 0 ? 8 : 9) + sem * 31);
    for (let i = 0; i < n; i++) {
      const vx = lado * (120 + r() * 380), vy = -80 - r() * 260, xx = x + vx * e, yy = MESA - MON.h - i * MON.h + vy * e + 1700 * e * e;
      monedaAire(c, xx, yy, 1, e * (8 + r() * 12) + i, 1 - smooth(prog(e, .55, .85)));
    }
  }
}
/** El bucle: una flecha roja que da la vuelta alrededor de la bola y su caja. */
function bucle(c: Ctx, t: number) {
  const a = ventana(t, E.bucle, A.v1 + .1, .25, .4); if (a <= 0) return;
  const cx = CX, cy = 700, rx = 360, ry = 150, ph = (t - E.bucle) * 3.4;
  c.save(); c.globalAlpha = a; c.strokeStyle = ACENTO; c.lineWidth = 7; c.lineCap = "round"; c.setLineDash([2, 20]); c.lineDashOffset = -t * 120;
  c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, TAU); c.stroke(); c.setLineDash([]);
  const x = cx + Math.cos(ph) * rx, y = cy + Math.sin(ph) * ry, dx = -Math.sin(ph) * rx, dy = Math.cos(ph) * ry, dl = Math.hypot(dx, dy) || 1;
  const ux = dx / dl, uy = dy / dl;
  c.fillStyle = ACENTO; c.beginPath(); c.moveTo(x + ux * 30, y + uy * 30); c.lineTo(x - uy * 20 - ux * 10, y + ux * 20 - uy * 10); c.lineTo(x + uy * 20 - ux * 10, y - ux * 20 - uy * 10); c.closePath(); c.fill();
  c.restore();
}

// ---------- la capa de texto ----------
function tachado(c: Ctx, t: number, ini: number, fin: number, tTacha: number, s: string, y: number, px: number) {
  rotulo(c, t, ini, fin, s, y, px, TINTA, true);
  const a = smooth(prog(t, ini - .04, ini + .14)) * (1 - smooth(prog(t, fin, fin + .22))), k = ease.outCubic(prog(t, tTacha, tTacha + .2));
  if (a > 0 && k > 0) {
    c.font = serif(px, true); const w = c.measureText(s).width;
    c.save(); c.globalAlpha = a; c.strokeStyle = ACENTO; c.lineWidth = 10; c.lineCap = "round";
    c.beginPath(); c.moveTo(540 - w / 2 - 14, y - px * .3); c.lineTo(540 - w / 2 - 14 + (w + 28) * k, y - px * .3 - 8 * k); c.stroke(); c.restore();
  }
}
function capaTexto(c: Ctx, t: number, v: Vista) {
  const P2 = (x: number, y: number): P => [540 + (x - v.x) * v.z, 960 + (y - v.y) * v.z];
  const ARR = 268, ABA = 1478;      // renglón de arriba y de abajo: nunca encima de la bola
  rotulo(c, t, A.cobran - .08, A.nomin - .3, "¿qué te cobran?", 300, 118, TINTA, true);
  tachado(c, t, A.minutos - .05, A.tokens - .15, E.rebota1, "minutos", 250, 120);
  tachado(c, t, A.preguntas - .05, A.tokens - .15, E.rebota2, "preguntas", 372, 120);
  rotulo(c, t, A.tokens - .02, A.tres - .1, "tokens", ARR, 170, ACENTO, true);
  rotulo(c, t, A.pedacitos - .04, A.tres - .1, "pedacitos de texto", ABA, 92, TINTA, true);
  rotulo(c, t, A.tresP - .04, A.primero - .15, "tres precios", ABA, 136, TINTA, true);
  rotulo(c, t, A.lee - .04, A.entradaW - .12, "lo que lee", ARR, 130, TINTA, true);
  rotulo(c, t, A.entradaW - .06, A.mensaje - .1, "entrada", ARR, 160, ACENTO, true);
  rotulo(c, t, A.mensaje - .04, A.instr - .1, "tu mensaje", ARR, 120, TINTA, true);
  rotulo(c, t, A.instr - .04, A.platicaron - .1, "sus instrucciones", ARR, 112, TINTA, true);
  rotulo(c, t, A.platicaron - .04, A.segundo - .15, "lo que ya platicaron", ARR, 100, TINTA, true);
  rotulo(c, t, A.escribe - .04, A.salidaW - .12, "lo que escribe", ARR, 124, TINTA, true);
  rotulo(c, t, A.salidaW - .06, A.escribir - .12, "salida", ARR, 160, ACENTO, true);
  rotulo(c, t, A.cuesta - .04, A.anthropic - .15, "cuesta más", 252, 130, TINTA, true);
  rotulo(c, t, A.anthropic - .06, A.ahora - .15, "en Anthropic", 252, 104, TINTA);
  // ×5: el sello junto al platillo que pesa
  const k5 = ease.outBack(prog(t, E.x5 - .02, E.x5 + .22), 2.4), a5 = 1 - smooth(prog(t, E.barre - .25, E.barre));
  if (k5 > 0 && a5 > 0) { const [x, y] = P2(BAL.x + 300, BAL.y - 70); c.save(); c.translate(Math.min(x, 850), y); c.rotate(-.08); c.scale(lerp(1.8, 1, clamp(k5)), lerp(1.8, 1, clamp(k5))); texto(c, "×5", 0, 0, { fuente: serif(190, true), color: ACENTO, alfa: clamp(k5) * a5 }); c.restore(); }
  rotulo(c, t, A.bucle - .06, A.v1 - .15, "bucle", ARR, 160, ACENTO, true);
  rotulo(c, t, A.v1 - .04, A.v2 - .12, "vuelta 1", 1440, 120, TINTA, true);
  rotulo(c, t, A.v2 - .04, A.v2F + .3, "vuelta 2", 1440, 120, TINTA, true);
  rotulo(c, t, A.relee2 - .02, A.v2F + .3, "relee", 1552, 100, ACENTO, true);
  rotulo(c, t, A.v10 - .04, A.relee10 - .12, "vuelta 10", 252, 120, TINTA, true);
  rotulo(c, t, A.relee10 - .04, A.enun - .15, "relee todo", 252, 120, ACENTO, true);
  // las dos pilas, con su nombre encima
  const aE = ventana(t, A.escribe2 - .1, A.relee - .1, .2, .25), aR = ventana(t, A.releeW - .1, A.paraeso - .2, .2, .3);
  c.font = serif(84, true);
  if (aE > 0) { const [x, y] = P2(PR, MESA - enPila(t, "R").n * MON.h); const w = c.measureText("escribe").width; texto(c, "escribe", Math.min(x, 966 - w / 2), y - 56, { fuente: serif(84, true), color: TINTA, alfa: aE }); }
  c.font = serif(110, true);
  if (aR > 0) { const [x, y] = P2(PL, MESA - enPila(t, "L").n * MON.h); const w = c.measureText("relee").width; texto(c, "relee", Math.max(x, 40 + w / 2), y - 56, { fuente: serif(110, true), color: ACENTO, alfa: aR }); }
  rotulo(c, t, A.cache - .06, A.si - .12, "caché", ARR, 170, ACENTO, true);
  rotulo(c, t, A.identico - .04, A.noproc - .12, "idéntico", ARR, 130, TINTA, true);
  rotulo(c, t, A.noproc - .04, A.guardado - .12, "no lo vuelve a procesar", ARR, 84, TINTA, true);
  rotulo(c, t, A.guardado - .04, A.cobra - .1, "guardado", ARR, 130, TINTA, true);
  const a10 = ventana(t, E.encoge, E.crece - .05, .1, .2) * (1 - ventana(t, A.idem, E.tira - .3, .2, .25));
  if (a10 > 0) { const [x, y] = P2(MC[0], MC[1]); texto(c, "1/10", x + 160, y + 30, { fuente: serif(110, true), color: ACENTO, alfa: a10 }); if (t > E.encoge2) texto(c, "o menos", x + 160, y + 100, { fuente: serif(62, true), color: TINTA, alfa: a10 * smooth(prog(t, E.encoge2, E.encoge2 + .2)) }); }
  rotulo(c, t, A.trampaW - .06, A.idem - .15, "trampa", ARR, 170, ACENTO, true);
  rotulo(c, t, A.primer - .04, A.cambias - .1, "desde el primer token", ABA, 92, TINTA, true);
  rotulo(c, t, A.cambias - .04, E.tira - .05, "cambias algo", ABA, 116, TINTA, true);
  rotulo(c, t, E.tira - .02, A.enfria - .15, "se pierde", ARR, 130, ACENTO, true);
  rotulo(c, t, A.enfriaW - .06, A.pasan - .1, "se enfría", ARR, 150, "#5E7480", true);
  rotulo(c, t, A.minutos2 - .04, A.borra - .12, "unos minutos", ARR, 120, TINTA, true);
  rotulo(c, t, A.borra - .04, A.susc - .2, "se borra", ARR, 150, TINTA, true);
  rotulo(c, t, A.suscW - .1, A.nove - .1, "suscripción", 330, 116, LUZ, true);
  rotulo(c, t, A.nove - .04, A.alguien - .12, "no la ves", 330, 150, LUZ, true);
  rotulo(c, t, A.lapaga - .06, A.salen - .12, "alguien la paga", 330, 116, LUZ, true);
  rotulo(c, t, A.salen - .04, E.sube - .1, "tus límites", 330, 136, LUZ, true);
  rotulo(c, t, A.alarga - .06, E.rompe - .1, "se alarga", ARR, 140, TINTA, true);
  rotulo(c, t, A.nueva - .06, A.resumen - .1, "una nueva", ARR, 130, TINTA, true);
  rotulo(c, t, A.resumen - .04, A.porque - .15, "con un resumen", ARR, 112, ACENTO, true);
  rotulo(c, t, A.caro - .04, A.estodo - .15, "lo caro", ARR, 150, TINTA, true);
  rotulo(c, t, A.preguntaW - .04, A.estodo - .15, "no es la pregunta", 410, 92, TINTA, true);
  rotulo(c, t, A.estodo - .02, DURACION + 1, "es todo lo que relee", ARR, 112, ACENTO, true);
}

function motas(c: Ctx, t: number) {
  const r = azar(33); c.fillStyle = TINTA;
  for (let i = 0; i < 60; i++) {
    const x0 = r() * 1200 - 60, y0 = r() * 2060, v = 16 + r() * 40, f = r() * 6.3, z = 1.8 + r() * 3;
    const y = ((y0 - t * v) % 2060 + 2060) % 2060 - 70, x = x0 + Math.sin(t * .6 + f) * 30;
    c.globalAlpha = .08 + r() * .14; c.fillRect(x, y, z, z);
  }
  c.globalAlpha = 1;
}

function dibuja(c: Ctx, t: number, d: Datos) {
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  const v = vista(t), f = sacude(t);
  const z = v.z * (1 + .012 * Math.sin(t * .83));
  c.save();
  c.translate(540 + 7 * Math.sin(t * .71) + Math.sin(t * 71) * f, 960 + 8 * Math.cos(t * .61) + Math.cos(t * 63) * f);
  c.rotate(.004 * Math.sin(t * .47));
  c.scale(z, z); c.translate(-v.x, -v.y);
  mundo(c, t, d);
  c.restore();
  motas(c, t);
  capaTexto(c, t, v);
}

export const Pieza: React.FC = () => (
  <Lienzo
    dibuja={dibuja}
    preparar={() => {
      const cv = document.createElement("canvas").getContext("2d")!; cv.font = mono(40);
      return { anchoFrase: FRASE.map((s) => cv.measureText(s).width + 12) };
    }}
  />
);
