// Capítulo 4. Una hoja de papel con puntos que se dobla de verdad. Nada aquí es un efecto: la hoja es un
// conjunto de trozos rígidos (más una curvatura isométrica mientras viajan), cada doblez es una reflexión
// sobre un eje real y la "forma" que aparece al desdoblar es la MISMA recta leída en coordenadas de hoja.
// El doblez q ← q − 2·relu(n·q − o)·n es exactamente lo que hacen dos neuronas ReLU.
import React from "react";
import { azar, Cam, caida, camara, clamp, ease, guionCamara, lerp, prog, smooth, smoother, texto, Vista } from "../../kit";
import { ACENTO, bola, bolaMundo, cue, Lienzo, LUZ, mono, NOCHE, PAPEL, rotulo, serif, sombra, TINTA } from "../../marca";
import palabras from "./palabras.json";
import duracion from "./duracion.json";
import geo from "./geometria.json";

export const DURACION = duracion.dur;
const T = cue(palabras);

const t0 = {
  neurona: T("neurona").s, cosa: T("cosa").s, trazar: T("trazar").s, recta: T("línea recta").s, rectaF: T("línea recta").e,
  si: T("sí").s, no: T("no").s, casi: T("casi nada").s, mira: T("mira").s, puntos: T("puntos").s, negros: T("negros").s, rojos: T("rojos").s,
  ninguna: T("ninguna").s, intenta: T("inténtalo").s, ahora: T("ahora").s, agarra: T("agarra la hoja").s, dob1: T("dóblala").s, dob2: T("dóblala otra").s,
  pronto: T("de pronto").s, sola: T("una sola recta").s, todo: T("separa todo").s, eso: T("eso hace").s, capaN: T("una capa de neuronas").s, dobla: T("dobla el espacio").s,
  cada: T("cada capa").s, agarra2: T("agarra lo que").s, vuelve: T("lo vuelve a doblar").s, negro: T("y cuando").s, desdob: T("desdoblas").s,
  esa: T("esa recta").s, yaNo: T("ya no es recta").s, conv: T("se convirtió").s, forma: T("una forma").s, rodea: T("rodea").s, justo: T("justo lo que").s,
  doblez: T("doblez tras").s, asi: T("así distingue").s, cara: T("cara de").s, perro: T("perro").s, por: T("por eso").s, aprend: T("aprendizaje").s, prof: T("profundo").s,
  noSig: T("no significa").s, hondo: T("piense hondo").s, sign: T("significa que tiene").s, muchas: T("muchas capas").s, nadie: T("y nadie").s, losD: T("los dobleces").s,
  salen: T("salen del error").s, error: T("del error").e, unaR: T("una recta sola").s, noPuede: T("no puede casi").s, pero: T("pero una recta").s, doblada: T("doblada").s,
  puede: T("puede casi todo").s, casiT: T("casi todo").s, fin: palabras[palabras.length - 1].e,
};

// ---------- el papel: trozos rígidos y reflexiones ----------
type V = [number, number];
type Eje = { c: V; n: V };                                    // n apunta al lado que se mueve
type Afin = [number, number, number, number, number, number];
type Trozo = { poly: V[]; A0: Afin; A1: Afin; mov: boolean; z0: number; z1: number };
type Plegado = { ejes: Eje[]; etapas: Trozo[][]; S: number[]; pliegues: [V, V][][]; centros: V[] };
type Estado = { et: Trozo[]; eje: Eje; x: number; k: number; f0: number };
type Forma = { segs: [V, V][]; tau: [number, number][]; polys: V[][] };
type Punto = { u: number; v: number; neg: boolean };

const aplica = (m: Afin, p: V): V => [m[0] * p[0] + m[1] * p[1] + m[4], m[2] * p[0] + m[3] * p[1] + m[5]];
const compone = (b: Afin, a: Afin): Afin => [b[0] * a[0] + b[1] * a[2], b[0] * a[1] + b[1] * a[3], b[2] * a[0] + b[3] * a[2], b[2] * a[1] + b[3] * a[3],
  b[0] * a[4] + b[1] * a[5] + b[4], b[2] * a[4] + b[3] * a[5] + b[5]];
const reflejo = (e: Eje): Afin => { const [x, y] = e.n, d = e.c[0] * x + e.c[1] * y; return [1 - 2 * x * x, -2 * x * y, -2 * x * y, 1 - 2 * y * y, 2 * d * x, 2 * d * y]; };
const det = (m: Afin) => m[0] * m[3] - m[1] * m[2];
const dir = (g: number): V => [Math.cos(g * Math.PI / 180), Math.sin(g * Math.PI / 180)];
const R_P = .029;                                             // radio de un punto, en unidades de hoja
const CUADRO: V[] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];

function area(P: V[]) { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - p[1] * q[0]; } return a / 2; }

/** Sutherland-Hodgman contra un semiplano: conserva f >= 0. */
function corta(P: V[], f: (p: V) => number): V[] {
  const out: V[] = [];
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], fa = f(a), fb = f(b);
    if (fa >= 0) out.push(a);
    if ((fa > 0 && fb < 0) || (fa < 0 && fb > 0)) { const r = fa / (fa - fb); out.push([lerp(a[0], b[0], r), lerp(a[1], b[1], r)]); }
  }
  return out;
}
/** Q es convexo y antihorario. */
function interseca(P: V[], Q: V[]) {
  let o = P;
  for (let i = 0; i < Q.length && o.length; i++) {
    const a = Q[i], b = Q[(i + 1) % Q.length];
    o = corta(o, (p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]));
  }
  return o;
}
function dentro(Q: V[], p: V) {
  for (let i = 0; i < Q.length; i++) { const a = Q[i], b = Q[(i + 1) % Q.length]; if ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]) < -1e-9) return false; }
  return true;
}
function segEn(a: V, b: V, Q: V[]): [V, V] | null {
  let r0 = 0, r1 = 1;
  for (let i = 0; i < Q.length; i++) {
    const p = Q[i], q = Q[(i + 1) % Q.length], ex = q[0] - p[0], ey = q[1] - p[1];
    const fa = ex * (a[1] - p[1]) - ey * (a[0] - p[0]), fb = ex * (b[1] - p[1]) - ey * (b[0] - p[0]);
    if (fa >= -1e-9 && fb >= -1e-9) continue;
    if (fa <= 1e-9 && fb <= 1e-9) return null;                 // por fuera, o apenas tocando el borde: no es de este trozo
    const r = fa / (fa - fb);
    if (fa < fb) r0 = Math.max(r0, r); else r1 = Math.min(r1, r);
  }
  if (r0 >= r1) return null;
  return [[lerp(a[0], b[0], r0), lerp(a[1], b[1], r0)], [lerp(a[0], b[0], r1), lerp(a[1], b[1], r1)]];
}

/** Plega la hoja eje por eje, partiendo cada trozo por donde pasa el pliegue. El orden de la lista es el orden de las capas. */
function plegar(ejes: Eje[], H = .002): Plegado {
  let vivos: { poly: V[]; A: Afin; nivel: number }[] = [{ poly: CUADRO, A: [1, 0, 0, 1, 0, 0], nivel: 0 }];
  const etapas: Trozo[][] = [], S: number[] = [], pliegues: [V, V][][] = [], centros: V[] = [[0, 0]];
  for (const e of ejes) {
    const R = reflejo(e), quietos: typeof vivos = [], movidos: typeof vivos = [], z0q: number[] = [], z0m: number[] = [], rayas: [V, V][] = [];
    let sm = 0;
    for (const v of vivos) {
      const f = (p: V) => { const q = aplica(v.A, p); return (q[0] - e.c[0]) * e.n[0] + (q[1] - e.c[1]) * e.n[1]; };
      const m = corta(v.poly, f), q = corta(v.poly, (p) => -f(p));
      if (m.length > 2 && area(m) > 1e-6) {
        movidos.push({ poly: m, A: v.A, nivel: v.nivel }); z0m.push(v.nivel * H);
        for (let i = 0; i < m.length; i++) {
          const a = m[i], b = m[(i + 1) % m.length]; sm = Math.max(sm, f(a));
          if (Math.abs(f(a)) < 1e-7 && Math.abs(f(b)) < 1e-7) rayas.push([a, b]);
        }
      }
      if (q.length > 2 && area(q) > 1e-6) { quietos.push({ poly: q, A: v.A, nivel: v.nivel }); z0q.push(v.nivel * H); }
    }
    const nq = quietos.length;
    const orden = [...quietos, ...movidos.reverse()], z0 = [...z0q, ...z0m.reverse()];
    const planos = orden.map((o, i) => o.poly.map((p) => aplica(i < nq ? o.A : compone(R, o.A), p)));
    const niveles: number[] = [];
    orden.forEach((_, i) => {
      let n = 0;
      for (let j = 0; j < i; j++) {
        let Q = planos[j]; if (area(Q) < 0) Q = [...Q].reverse();
        if (Math.abs(area(interseca(planos[i], Q))) > 1e-4) n = Math.max(n, niveles[j] + 1);
      }
      niveles.push(n);
    });
    const et: Trozo[] = orden.map((o, i) => ({ poly: o.poly, A0: o.A, A1: i < nq ? o.A : compone(R, o.A), mov: i >= nq, z0: z0[i], z1: niveles[i] * H }));
    etapas.push(et); S.push(sm); pliegues.push(rayas);
    vivos = et.map((o, i) => ({ poly: o.poly, A: o.A1, nivel: niveles[i] }));
    // centro del paquete, para que la cámara lo siga
    let ax = 0, ay = 0, w = 0;
    planos.forEach((P) => { const a = Math.abs(area(P)); P.forEach((p) => { ax += p[0] * a / P.length; ay += p[1] * a / P.length; }); w += a; });
    centros.push([ax / w, ay / w]);
  }
  return { ejes, etapas, S, pliegues, centros };
}

const estado = (pl: Plegado, e: number): Estado => {
  const i = clamp(Math.ceil(e) - 1, 0, pl.ejes.length - 1), x = clamp(e - i), th = x * Math.PI, Sm = Math.max(pl.S[i], 1.1), k = .95 * Math.sin(th) / Sm;
  return { et: pl.etapas[i], eje: pl.ejes[i], x, k, f0: th - k * Sm / 2 };
};
/** Perfil isométrico del ala: la curva mide lo mismo que el papel plano. La punta se adelanta, el pliegue se queda atrás. */
function sube(s: Estado, d: number): V {
  if (Math.abs(s.k) < 1e-5) return [d * Math.cos(s.f0), d * Math.sin(s.f0)];
  return [(Math.sin(s.f0 + s.k * d) - Math.sin(s.f0)) / s.k, (Math.cos(s.f0) - Math.cos(s.f0 + s.k * d)) / s.k];
}
function lugar(s: Estado, tr: Trozo, p: V): [number, number, number] {
  const q = aplica(tr.A0, p), zc = lerp(tr.z0, tr.z1, smooth(s.x));
  if (!tr.mov || s.x <= 0) return [q[0], q[1], zc];
  const e = s.eje, d = (q[0] - e.c[0]) * e.n[0] + (q[1] - e.c[1]) * e.n[1], [a, b] = sube(s, d);
  return [q[0] + (a - d) * e.n[0], q[1] + (a - d) * e.n[1], b + zc];
}
const enCurva = (s: Estado, tr: Trozo) => tr.mov && s.x > 0 && s.x < 1;

function tramo(c: CanvasRenderingContext2D, cam: Cam, s: Estado, tr: Trozo, a: V, b: V, primero: boolean) {
  const n = enCurva(s, tr) ? 9 : 1;
  for (let i = primero ? 0 : 1; i <= n; i++) {
    const r = i / n, g = lugar(s, tr, [lerp(a[0], b[0], r), lerp(a[1], b[1], r)]), P = cam.p(g[0], g[1], g[2]);
    if (!P) continue;
    if (i === 0) c.moveTo(P.x, P.y); else c.lineTo(P.x, P.y);
  }
}
function contorno(c: CanvasRenderingContext2D, cam: Cam, s: Estado, tr: Trozo, P: V[]) {
  P.forEach((p, i) => tramo(c, cam, s, tr, p, P[(i + 1) % P.length], i === 0));
  c.closePath();
}

// ---------- pintar la hoja ----------
const LZ = (() => { const n = Math.hypot(.38, .46, .8); return [-.38 / n, .46 / n, .8 / n]; })();
const tono = (l: number, atras: boolean) => { const b = atras ? [244, 241, 232] : [255, 254, 250], q = Math.min(l, 1); return `rgb(${b[0] * q | 0},${b[1] * q | 0},${b[2] * q | 0})`; };
type Opc = { forma?: Forma; lavado?: string; hechos?: number; huella?: number; rayas?: boolean; mesa?: boolean; reticula?: number; sombraFlap?: number; velo?: number };

function pintaTrozo(c: CanvasRenderingContext2D, cam: Cam, s: Estado, tr: Trozo, pl: Plegado, o: Opc) {
  const vol = det(tr.A0) < 0;
  if (enCurva(s, tr)) {
    const e = s.eje, f = (p: V) => { const q = aplica(tr.A0, p); return (q[0] - e.c[0]) * e.n[0] + (q[1] - e.c[1]) * e.n[1]; };
    const paso = Math.max(...tr.poly.map(f)) / 13, tiras: { P: V[]; d: number; zc: number; G: [number, number, number] }[] = [];
    for (let j = 0; j < 13; j++) {
      const a = j * paso, b = (j + 1) * paso, P = corta(corta(tr.poly, (p) => f(p) - a), (p) => b - f(p));
      if (P.length < 3) continue;
      const m = P.reduce((q, p) => [q[0] + p[0] / P.length, q[1] + p[1] / P.length] as V, [0, 0] as V), G = lugar(s, tr, m), Q = cam.p(G[0], G[1], G[2]);
      tiras.push({ P, d: (a + b) / 2, zc: Q ? Q.zc : 0, G });
    }
    tiras.sort((p, q) => q.zc - p.zc);
    for (const t of tiras) {
      const fi = s.f0 + s.k * t.d, sf = Math.sin(fi), cf = Math.cos(fi), N = [-sf * e.n[0], -sf * e.n[1], cf];
      const v = [cam.pos[0] - t.G[0], cam.pos[1] - t.G[1], cam.pos[2] - t.G[2]], ver = N[0] * v[0] + N[1] * v[1] + N[2] * v[2] > 0 ? 1 : -1;
      const nl = (N[0] * LZ[0] + N[1] * LZ[1] + N[2] * LZ[2]) * ver;
      const l = (.66 + .46 * Math.max(nl, 0)) * (1 - .24 * Math.sin(s.x * Math.PI) * Math.exp(-t.d / .13));
      c.fillStyle = c.strokeStyle = tono(l, vol !== (ver < 0));
      c.lineWidth = 1; c.beginPath(); contorno(c, cam, s, tr, t.P); c.fill(); c.stroke();
    }
  } else {
    const vuelta = tr.mov && s.x >= 1 ? !vol : vol;
    c.fillStyle = c.strokeStyle = tono(1, vuelta); c.lineWidth = 1; c.beginPath(); contorno(c, cam, s, tr, tr.poly); c.fill(); c.stroke();
  }
  // memoria del papel: lo que ya se dobló y se volvió a abrir queda con un tono distinto en cada cara
  const h = o.hechos ?? 0;
  if (h > 0) {
    c.fillStyle = `rgba(70,60,40,${.035 * (o.huella ?? 1)})`;
    for (const f of pl.etapas[h - 1]) {
      if (det(f.A1) > 0) continue;
      const P = interseca(f.poly, tr.poly);
      if (P.length > 2 && area(P) > 1e-5) { c.beginPath(); contorno(c, cam, s, tr, P); c.fill(); }
    }
  }
  if (o.forma && o.lavado) {
    c.fillStyle = o.lavado;
    for (const q of o.forma.polys) {
      const P = interseca(q, tr.poly);
      if (P.length > 2 && area(P) > 1e-6) { c.beginPath(); contorno(c, cam, s, tr, P); c.fill(); }
    }
  }
  const R = o.reticula ?? 6;
  if (R) {
    c.strokeStyle = "rgba(40,38,32,.13)"; c.lineWidth = 1.2; c.beginPath();
    for (let i = -R; i <= R; i++) {
      const x = i / R, a = segEn([x, -1], [x, 1], tr.poly), b = segEn([-1, x], [1, x], tr.poly);
      if (a) tramo(c, cam, s, tr, a[0], a[1], true);
      if (b) tramo(c, cam, s, tr, b[0], b[1], true);
    }
    c.stroke();
  }
  if (h > 0) {
    c.save(); c.strokeStyle = o.rayas ? `rgba(17,17,17,${.62 * (o.huella ?? 1)})` : `rgba(60,54,44,${.3 * (o.huella ?? 1)})`; c.lineWidth = o.rayas ? 3 : 1.5; if (o.rayas) c.setLineDash([13, 11]); c.beginPath();
    for (let j = 0; j < h; j++) for (const r of pl.pliegues[j]) { const q = segEn(r[0], r[1], tr.poly); if (q) tramo(c, cam, s, tr, q[0], q[1], true); }
    c.stroke(); c.restore();
  }
  if (s.x > 0) { c.strokeStyle = "rgba(17,17,17,.34)"; c.lineWidth = 1.1; c.lineJoin = "round"; c.beginPath(); contorno(c, cam, s, tr, tr.poly); c.stroke(); }
}

function hoja(c: CanvasRenderingContext2D, cam: Cam, pl: Plegado, e: number, o: Opc = {}) {
  const s = estado(pl, e), activo = s.x > 0 && s.x < 1, quietos = s.et.filter((t) => !t.mov), mov = s.et.filter((t) => t.mov);
  const lig = (x: number, y: number, z: number, g: number) => cam.p(x - g * z * LZ[0] / LZ[2], y - g * z * LZ[1] / LZ[2], 0);
  if (o.mesa !== false) {
    for (const [d, a] of [[.03, .05], [.016, .1]] as [number, number][]) {
      c.fillStyle = `rgba(30,26,20,${a})`; c.beginPath();
      for (const tr of s.et) {
        if (activo && tr.mov) continue;
        tr.poly.forEach((p, i) => { const q = aplica(s.x <= 0 || activo ? tr.A0 : tr.A1, p), P = cam.p(q[0] + d * .8, q[1] - d, 0); if (P) { if (i === 0) c.moveTo(P.x, P.y); else c.lineTo(P.x, P.y); } }); c.closePath();
      }
      c.fill();
    }
  }
  const dibQ = activo ? quietos : s.et;
  c.globalAlpha = o.velo ?? 1;
  for (const tr of dibQ) pintaTrozo(c, cam, s, tr, pl, o);
  if (activo) {
    // la sombra del ala sobre lo que queda abajo: oscura junto al pliegue, abierta lejos de él
    const sn = Math.sin(s.x * Math.PI), al = .12 * (o.sombraFlap ?? 1) * (.45 + .55 * sn) / Math.max(1, mov.length ** .75);
    c.globalAlpha = 1;
    for (const g of [.62, 1, 1.5]) for (const tr of mov) {
      c.fillStyle = `rgba(24,20,14,${al})`; c.beginPath();
      tr.poly.forEach((p, i) => {
        const q = tr.poly[(i + 1) % tr.poly.length];
        for (let j = 0; j < 7; j++) {
          const r = j / 7, h = lugar(s, tr, [lerp(p[0], q[0], r), lerp(p[1], q[1], r)]), P = lig(h[0], h[1], h[2], g);
          if (P) { if (i === 0 && j === 0) c.moveTo(P.x, P.y); else c.lineTo(P.x, P.y); }
        }
      });
      c.closePath(); c.fill();
    }
    const tr0 = mov[0], med = lugar(s, tr0, tr0.poly[0]), th = s.x * Math.PI, ns = -Math.sin(th);
    const N = [ns * s.eje.n[0], ns * s.eje.n[1], Math.cos(th)], v = [cam.pos[0] - med[0], cam.pos[1] - med[1], cam.pos[2] - med[2]];
    const seVeArriba = N[0] * v[0] + N[1] * v[1] + N[2] * v[2] > 0;
    const orden = seVeArriba ? [...mov].reverse() : mov;
    c.globalAlpha = o.velo ?? 1;
    for (const tr of orden) pintaTrozo(c, cam, s, tr, pl, o);
  }
  c.globalAlpha = 1;
  if (s.x <= 0) { c.strokeStyle = "rgba(17,17,17,.34)"; c.lineWidth = 1.1; c.beginPath(); CUADRO.forEach((p, i) => { const P = cam.p(p[0], p[1], 0); if (P) { if (i === 0) c.moveTo(P.x, P.y); else c.lineTo(P.x, P.y); } }); c.closePath(); c.stroke(); }
  return s;
}

/** Forma: la recta de un estado plegado, leída en coordenadas de la hoja. Los puntos con n·(q−c) > 0 quedan dentro. */
function forma(pl: Plegado, k: number, c0: V, n: V): Forma {
  const d: V = [-n[1], n[0]], segs: [V, V][] = [], tau: [number, number][] = [], polys: V[][] = [];
  for (const tr of pl.etapas[k - 1]) {
    const f = (p: V) => { const q = aplica(tr.A1, p); return (q[0] - c0[0]) * n[0] + (q[1] - c0[1]) * n[1]; };
    const ta = (p: V) => { const q = aplica(tr.A1, p); return (q[0] - c0[0]) * d[0] + (q[1] - c0[1]) * d[1]; };
    const P = corta(tr.poly, f);
    if (P.length < 3 || area(P) < 1e-7) continue;
    polys.push(P);
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      if (Math.abs(f(a)) < 1e-7 && Math.abs(f(b)) < 1e-7) { segs.push([a, b]); tau.push([ta(a), ta(b)]); }
    }
  }
  return { segs, tau, polys };
}

function tintaForma(c: CanvasRenderingContext2D, cam: Cam, s: Estado, F: Forma, color: string, g: number, tauMax = 1e9, alfa = 1) {
  if (alfa <= .01) return;
  c.save(); c.globalAlpha = alfa; c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath();
  F.segs.forEach((q, i) => {
    let [a, b] = q; const [ta, tb] = F.tau[i];
    if (Math.min(ta, tb) > tauMax) return;
    if (Math.max(ta, tb) > tauMax) { const r = (tauMax - ta) / (tb - ta), m: V = [lerp(a[0], b[0], r), lerp(a[1], b[1], r)]; if (ta < tb) b = m; else a = m; }
    for (const tr of s.et) { const w = segEn(a, b, tr.poly); if (w) tramo(c, cam, s, tr, w[0], w[1], true); }
  });
  c.stroke(); c.restore();
}

const repartos = new WeakMap<Trozo[], Map<Punto[], Trozo[]>>();
function trozosDe(et: Trozo[], P: Punto[]) {
  let m = repartos.get(et); if (!m) { m = new Map(); repartos.set(et, m); }
  let r = m.get(P);
  if (!r) { r = P.map((p) => et.find((t) => dentro(t.poly, [p.u, p.v])) ?? et[0]); m.set(P, r); }
  return r;
}
function tintaPuntos(c: CanvasRenderingContext2D, cam: Cam, s: Estado, P: Punto[], r: number, esc?: (i: number) => number, alfa = 1) {
  const tz = trozosDe(s.et, P);
  c.save(); c.globalAlpha = alfa;
  P.forEach((p, i) => {
    const R = r * (esc ? esc(i) : 1); if (R <= .0005) return;
    const a = lugar(s, tz[i], [p.u, p.v]), b = lugar(s, tz[i], [p.u + R, p.v]), d = lugar(s, tz[i], [p.u, p.v + R]);
    const A = cam.p(a[0], a[1], a[2]), B = cam.p(b[0], b[1], b[2]), D = cam.p(d[0], d[1], d[2]);
    if (!A || !B || !D) return;
    c.setTransform(B.x - A.x, B.y - A.y, D.x - A.x, D.y - A.y, A.x, A.y);
    c.fillStyle = p.neg ? TINTA : ACENTO; c.beginPath(); c.arc(0, 0, 1, 0, 7); c.fill();
  });
  c.restore();
}

/** Texto impreso en la hoja: lo deforma la misma cámara. */
function sello(c: CanvasRenderingContext2D, cam: Cam, u: number, v: number, s: string, px: number, color: string, alfa: number, it = true) {
  const d = .2, A = cam.p(u, v, 0), B = cam.p(u + d, v, 0), D = cam.p(u, v + d, 0); if (!A || !B || !D || alfa <= .01) return;
  const K = 1 / (d * 430);
  c.save(); c.globalAlpha = alfa; c.setTransform((B.x - A.x) * K, (B.y - A.y) * K, -(D.x - A.x) * K, -(D.y - A.y) * K, A.x, A.y);
  c.font = serif(px, it); c.fillStyle = color; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(s, 0, 0); c.restore();
}
function rectaMundo(c: CanvasRenderingContext2D, cam: Cam, a: V, b: V, z: number, color: string, g: number, alfa = 1) {
  const A = cam.p(a[0], a[1], z), B = cam.p(b[0], b[1], z); if (!A || !B || alfa <= .01) return;
  c.save(); c.globalAlpha = alfa; c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round"; c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke(); c.restore();
}
function polyMundo(c: CanvasRenderingContext2D, cam: Cam, P: V[], color: string) {
  c.fillStyle = color; c.beginPath();
  P.forEach((p, i) => { const Q = cam.p(p[0], p[1], 0); if (Q) { if (i === 0) c.moveTo(Q.x, Q.y); else c.lineTo(Q.x, Q.y); } });
  c.closePath(); c.fill();
}

// ---------- el arranque: la hoja cae del aire ----------
const T_CAE = .92;
function hojaAire(c: CanvasRenderingContext2D, cam: Cam, t: number) {
  const q = prog(t, 0, T_CAE), fal = 1 - q, h = 1.42 * fal ** 1.5;
  const rx = .55 * fal * Math.cos(q * 4.1 + .5), ry = -.72 * fal * Math.sin(q * 3.4 + 1), rz = .95 * fal * fal, amp = .17 * fal ** .8;
  const D = (u: number, v: number): [number, number, number] => {
    const w = amp * Math.sin(2.5 * u + 1.6 * v - t * 8.5);
    const y1 = v * Math.cos(rx) - w * Math.sin(rx), z1 = v * Math.sin(rx) + w * Math.cos(rx);
    const x2 = u * Math.cos(ry) + z1 * Math.sin(ry), z2 = -u * Math.sin(ry) + z1 * Math.cos(ry);
    return [x2 * Math.cos(rz) - y1 * Math.sin(rz), x2 * Math.sin(rz) + y1 * Math.cos(rz), z2 + h + .02];
  };
  // sombra en la mesa
  for (const g of [.8, 1.1, 1.45]) {
    c.fillStyle = `rgba(24,20,14,${.1 / (1 + h * 1.4)})`; c.beginPath();
    let pr = true;
    const ve = (u: number, v: number) => { const P = D(u, v), S = cam.p(P[0] - g * P[2] * LZ[0] / LZ[2], P[1] - g * P[2] * LZ[1] / LZ[2], 0); if (S) { if (pr) c.moveTo(S.x, S.y); else c.lineTo(S.x, S.y); pr = false; } };
    for (let i = 0; i < 8; i++) ve(-1 + i / 4, -1); for (let i = 0; i < 8; i++) ve(1, -1 + i / 4);
    for (let i = 0; i < 8; i++) ve(1 - i / 4, 1); for (let i = 0; i < 8; i++) ve(-1, 1 - i / 4);
    c.closePath(); c.fill();
  }
  const N = 30, celdas: { P: { x: number; y: number }[]; zc: number; l: number }[] = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const u0 = -1 + 2 * i / N, v0 = -1 + 2 * j / N, d = 2 / N, A = D(u0, v0), B = D(u0 + d, v0), E = D(u0 + d, v0 + d), F = D(u0, v0 + d);
    const a = [E[0] - A[0], E[1] - A[1], E[2] - A[2]], b = [F[0] - B[0], F[1] - B[1], F[2] - B[2]];
    const n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], m = Math.hypot(n[0], n[1], n[2]) || 1;
    const nl = Math.abs(n[0] * LZ[0] + n[1] * LZ[1] + n[2] * LZ[2]) / m, S = [A, B, E, F].map((g) => cam.p(g[0], g[1], g[2]));
    if (S.some((x) => !x)) continue;
    celdas.push({ P: S as { x: number; y: number }[], zc: (S[0] as any).zc, l: .8 + .27 * nl });
  }
  celdas.sort((p, q) => q.zc - p.zc);
  for (const k of celdas) {
    c.fillStyle = c.strokeStyle = tono(k.l, false); c.lineWidth = 1; c.beginPath(); k.P.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.fill(); c.stroke();
  }
  c.strokeStyle = "rgba(40,38,32,.14)"; c.lineWidth = 1.2; c.beginPath();
  for (let i = -6; i <= 6; i++) for (const eje of [0, 1]) for (let j = 0; j <= 20; j++) {
    const g = eje ? D(i / 6, -1 + j / 10) : D(-1 + j / 10, i / 6), P = cam.p(g[0], g[1], g[2]);
    if (P) { if (j === 0) c.moveTo(P.x, P.y); else c.lineTo(P.x, P.y); }
  }
  c.stroke();
  c.strokeStyle = "rgba(17,17,17,.4)"; c.lineWidth = 1.4; c.beginPath();
  [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]].forEach(([a, b, e, f]) => { for (let j = 0; j <= 16; j++) { const r = j / 16, g = D(lerp(a, e, r), lerp(b, f, r)), P = cam.p(g[0], g[1], g[2]); if (P) { if (j === 0) c.moveTo(P.x, P.y); else c.lineTo(P.x, P.y); } } });
  c.stroke();
}

// polvo que escapa de debajo de la hoja al aterrizar
function polvo(c: CanvasRenderingContext2D, cam: Cam, age: number) {
  if (age < 0 || age > .9) return;
  const r = azar(11);
  for (let i = 0; i < 90; i++) {
    const a = r() * 6.283, v = .5 + r() * 1.3, e = ease.outCubic(age / .9), b = r();
    const rad = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? 1 / Math.abs(Math.cos(a)) : 1 / Math.abs(Math.sin(a));
    const x = Math.cos(a) * (rad + v * e * .55), y = Math.sin(a) * (rad + v * e * .55), z = b * .22 * e, P = cam.p(x, y, z);
    if (!P) continue;
    c.fillStyle = TINTA; c.globalAlpha = (1 - age / .9) * .3 * b; c.fillRect(P.x, P.y, 3.2, 3.2);
  }
  c.globalAlpha = 1;
}

// ---------- tiempos de cada gesto ----------
const DOB = .95;
/** Curva de un doblez: viaja, aterriza a los .68 de su duración y rebota un pelo, como el papel. */
function aterriza(x: number) { const k = clamp(x); return k < .72 ? ease.inOutSine(k / .72) : 1 - .022 * Math.sin((k - .72) / .28 * Math.PI); }
const F1 = t0.dob1 - .06, F2 = t0.dob2 - .1, F3 = t0.vuelve - .12;
const U3 = [t0.desdob + .02, t0.esa - .1], U2 = [t0.esa + .04, t0.conv - .08], U1 = [t0.conv + .02, t0.conv + 1.5];
function eA(t: number) {
  const tiembla = t > t0.agarra && t < F1 ? .004 * Math.sin(t * 34) : 0;
  let a = .15 * ease.inOutSine(prog(t, t0.agarra, F1)) + tiembla;
  a = lerp(a, 1, aterriza(prog(t, F1, F1 + DOB)));
  const b = aterriza(prog(t, F2, F2 + DOB));
  const res = .33 * ease.inOutSine(prog(t, t0.capaN + .1, t0.dobla - .2)) * (1 - aterriza(prog(t, t0.dobla - .15, t0.dobla + .7)));   // se abre y se vuelve a apretar
  const tiemb2 = t > t0.agarra2 && t < F3 ? .003 * Math.sin(t * 34) : 0;
  let d = .15 * ease.inOutSine(prog(t, t0.agarra2, F3)) + tiemb2;
  d = lerp(d, 1, aterriza(prog(t, F3, F3 + DOB)));
  const u = smoother(prog(t, U3[0], U3[1])) + smoother(prog(t, U2[0], U2[1])) + smoother(prog(t, U1[0], U1[1]));
  return a + b - res + d - u;
}

// Rectas del paquete: la de dos dobleces hace un rombo; ladeada 22.5° sobre tres dobleces, un octágono regular.
const TAU = .72, C_ROMBO = .575, RHO_ROMBO = C_ROMBO * Math.SQRT1_2, RHO_OCTA = .4;
function formaLadeada(pl: Plegado, k: number, ladeo: number) {
  const a = lerp(225, 202.5, ladeo), rho = lerp(RHO_ROMBO, RHO_OCTA, ladeo), u = dir(a);
  return forma(pl, k, [u[0] * rho, u[1] * rho], [-u[0], -u[1]]);
}

// La tinta late como una ola en las esperas. Los puntos no se mueven de su sitio: la geometría no se toca.
const VIDA: [number, number][] = [[t0.puntos, t0.negros + .1], [t0.rojos + .9, t0.ninguna + .2], [t0.todo - .1, t0.capaN + .2], [t0.dobla + .7, t0.cada + .8], [t0.agarra2 - .4, F3 + .1],
  [U1[1] - .1, t0.doblez], [t0.perro + .3, t0.por + .2], [t0.error - .4, t0.unaR - .5]];
const vida = (t: number) => VIDA.reduce((q, [a, b]) => Math.max(q, smooth(prog(t, a, a + .3)) * (1 - smooth(prog(t, b - .3, b)))), 0);
const ola = (t: number, u: number, w: number) => 1 + .26 * vida(t) * Math.sin(t * 6.6 - Math.hypot(u, w) * 5.5);

// ---------- la cámara ----------
const v = (tx: number, ty: number, yaw: number, pitch: number, dist: number, tz = 0): Vista => ({ tx, ty, tz, yaw, pitch, dist });
const CLAVES: { t: number; v: Vista; dur?: number; curva?: (x: number) => number }[] = [
  { t: 0, v: v(0, 0, .34, 1, 3.3) },
  { t: .02, v: v(0, 0, .09, 1.2, 3.02), dur: 1.5, curva: ease.outCubic },
  { t: t0.casi, v: v(0, 0, -.1, 1.16, 3.24), dur: 2.4 },
  { t: t0.mira, v: v(0, 0, .03, 1.38, 3), dur: 1.3 },
  { t: t0.ahora, v: v(-.2, -.06, -.42, .98, 3.08), dur: 1.5 },
  { t: t0.dob2 - .7, v: v(-.47, -.38, .36, 1, 2.2), dur: 1.65 },
  { t: t0.pronto - .5, v: v(-.5, -.5, .05, 1.42, 1.62), dur: 1.6 },
  { t: t0.todo + .45, v: v(-.5, -.42, -.34, 1.05, 1.95), dur: 2 },
  { t: t0.dobla + .85, v: v(-.46, -.38, .42, 1, 1.85), dur: 2.1 },
  { t: F3 + .75, v: v(-.47, -.2, .08, 1.38, 1.6), dur: 1 },
  { t: U3[0] + .1, v: v(-.47, -.42, -.1, 1.28, 1.85), dur: 1.3 },
  { t: U2[0], v: v(-.46, -.04, .1, 1.18, 2.4), dur: 1.3 },
  { t: U1[0], v: v(0, 0, -.02, 1.4, 3), dur: 1.4 },
  { t: t0.justo, v: v(0, 0, .03, 1.44, 2.76), dur: 2.6 },
];
function respira(w: Vista, t: number): Vista {
  return { ...w, yaw: w.yaw + .03 * Math.sin(t * .71 + 1) + .012 * Math.sin(t * 1.37), pitch: w.pitch + .02 * Math.sin(t * .89), dist: w.dist * (1 + .014 * Math.sin(t * .53 + 2)) };
}

// ---------- recorrido de la bola ----------
const L0A: V = [-.9, -.38], L0B: V = [.9, .38];
const NV = (a: V, b: V, r: number): V => [lerp(a[0], b[0], r), lerp(a[1], b[1], r)];
const SI: V = [-.62, .62], NO: V = [.62, -.62];
const TR = { a: t0.trazar - .02, b: t0.rectaF + .02 };
const G_B = 26, H_B = 3, RE_B = .46, CAE_B = T_CAE - Math.sqrt(2 * H_B / G_B), B_INI: V = [.42, .5];
const INTENTOS: V[] = [[-1, .58], [1, -.3], [-.2, 1], [.4, -1], [-1, -.36], [1, .62], [-.36, -1], [.62, 1]];
const I0 = t0.ninguna - .02, ID = (t0.ahora - .4 - I0) / (INTENTOS.length - 1);
function salto(t: number, ini: number, dur: number, a: V, b: V, h: number): [number, number, number] {
  const k = prog(t, ini, ini + dur), e = ease.inOutSine(k), p = NV(a, b, e);
  return [p[0], p[1], 4 * h * k * (1 - k)];
}
function bolaPrimera(t: number): [number, number, number] | null {
  if (t < CAE_B) return null;
  if (t < TR.a) {
    const z = t < t0.cosa - .06 ? caida(t - CAE_B, H_B, RE_B, G_B).z : caida(t - (t0.cosa - .06), .42, .4, G_B).z * smooth(prog(t, t0.cosa - .06, t0.cosa - .02)), atras = -.1 * smooth(prog(t, TR.a - .66, TR.a - .02));
    const p = NV(B_INI, L0A, ease.inOutCubic(prog(t, T_CAE - .02, t0.cosa - .1)));
    return [p[0] + atras, p[1], z];
  }
  if (t < t0.si - .95) { const p = NV([L0A[0] - .1, L0A[1]], L0B, ease.inOutCubic(prog(t, TR.a, TR.b))); return [p[0], p[1], 0]; }
  if (t < t0.no - .95) return salto(t, t0.si - .95, .95, L0B, SI, .5);
  if (t < t0.no) return salto(t, t0.no - .95, .95, SI, NO, .5);
  if (t < t0.casi + .5) { const k = ease.inOutSine(prog(t, t0.no + .18, t0.casi + .5)); return [lerp(NO[0], 2.4, k * k), lerp(NO[1], -.5, k), 0]; }
  return null;
}
function bolaIntentos(t: number): { p: [number, number, number]; j: number; r: number } | null {
  if (t < I0 - .4 || t > t0.ahora + .9) return null;
  if (t < I0) { const z = 3 * (1 - prog(t, I0 - .4, I0)) ** 2; return { p: [INTENTOS[0][0], INTENTOS[0][1], z], j: -1, r: 0 }; }
  const tt = (t - I0) / ID, j = Math.min(Math.floor(tt), INTENTOS.length - 2), r = clamp(tt - j);
  if (tt < INTENTOS.length - 1) { const q = NV(INTENTOS[j], INTENTOS[j + 1], r); return { p: [q[0], q[1], 0], j, r }; }
  const f = ease.inCubic(prog(t, I0 + ID * (INTENTOS.length - 1), t0.ahora + .9)), e = INTENTOS[INTENTOS.length - 1];
  return { p: [lerp(e[0], e[0] + .5, f), lerp(e[1], 2.6, f), 0], j: INTENTOS.length - 2, r: 1 };
}

type Datos = { A: Plegado; B: Plegado; fRombo: Forma; fB: Forma; fEstrella: Forma; fFin: Forma; tauB: [number, number]; pA: Punto[]; pB: Punto[]; mez: V[]; lluvia: number[]; malos: number[][] };

function prepara(): Datos {
  const A = plegar([{ c: [0, 0], n: [1, 0] }, { c: [0, 0], n: [0, 1] }, { c: [0, 0], n: [Math.SQRT1_2, -Math.SQRT1_2] }, { c: [0, 0], n: dir(292.5) }]);
  const B = plegar(geo.ejesB.map((e) => ({ c: e.c as V, n: e.n as V })));
  const pA = geo.A.map(([u, w, n]) => ({ u, v: w, neg: !!n }));
  const pB = geo.B.map(([u, w], i) => ({ u, v: w, neg: pA[i].neg }));
  const lluvia = geo.lluvia.map((q) => lerp(t0.casi - .4, t0.mira - .4, q));
  const malos = INTENTOS.slice(0, -1).map((a, j) => {
    const b = INTENTOS[j + 1], lado = (p: Punto) => (b[0] - a[0]) * (p.v - a[1]) - (b[1] - a[1]) * (p.u - a[0]) > 0;
    const nN = pA.filter((p) => p.neg && lado(p)).length, nT = pA.filter((p) => p.neg).length, ladoN = nN * 2 > nT;
    return pA.map((p, i) => (p.neg ? lado(p) !== ladoN : lado(p) === ladoN) ? i : -1).filter((i) => i >= 0);
  });
  const fB = forma(B, geo.ejesB.length, geo.lineaB.c as V, geo.lineaB.n as V);
  const fFin = formaAprendida(geo.aprende[Math.min(geo.aprende.findIndex((r) => r.e === 0) + 90, geo.aprende.length - 1)].p);
  const u = dir(45), ee = dir(180), ff = dir(202.5), P1: V = [ee[0] * .92, ee[1] * .92], P2: V = [ff[0] * .34, ff[1] * .34], dd = [P2[0] - P1[0], P2[1] - P1[1]], m = Math.hypot(dd[0], dd[1]);
  return {
    A, B, pA, pB, mez: geo.mezcla as V[], lluvia, malos, tauB: [Math.min(...fB.tau.flat()), Math.max(...fB.tau.flat())], fFin,
    fRombo: forma(A, 2, [-u[0] * RHO_ROMBO, -u[1] * RHO_ROMBO], u),
    fB,
    fEstrella: forma(A, 4, P1, [-dd[1] / m, dd[0] / m]),
  };
}

function dibuja(c: CanvasRenderingContext2D, t: number, d: Datos) {
  const negro = t >= t0.negro - .02 && t < t0.doblez - .02;
  c.fillStyle = negro ? NOCHE : PAPEL; c.fillRect(0, 0, 1080, 1920);
  if (t < t0.doblez - .02) primera(c, t, d, negro);
  else segunda(c, t, d);
}

function primera(c: CanvasRenderingContext2D, t: number, d: Datos, negro: boolean) {
  const pega = [T_CAE, F1 + DOB * .72, F2 + DOB * .72, F3 + DOB * .72].reduce((q, a) => q + (t >= a ? Math.exp(-(t - a) * 11) : 0), 0);
  const vi = respira(guionCamara(t, CLAVES), t), cam = camara({ ...vi, dist: vi.dist * (1 + .012 * pega) }, 540, 1010, 1250);
  const e = eA(t), plano = e <= 0;
  if (t < T_CAE) {
    hojaAire(c, cam, t);
    if (t >= CAE_B) bolaMundo(c, cam, B_INI[0], B_INI[1], caida(t - CAE_B, H_B, RE_B, G_B).z, .085);
    rotulo(c, t, -1, 3.2, "Una neurona sola", 262, 124);
    return;
  }

  // ---------- recta del paquete ----------
  const ladeo = ease.inOutCubic(prog(t, F3 + DOB * .8, F3 + DOB * .8 + 1));
  let F: Forma | undefined = undefined, tauMax = 1e9;
  const tr0 = t0.sola - .12, tr1 = t0.todo - .1;
  if (t >= tr0) {
    F = t > F3 + DOB * .7 ? formaLadeada(d.A, 3, ladeo) : d.fRombo;
    tauMax = lerp(-TAU, TAU, ease.inOutSine(prog(t, tr0, tr1)));
  }
  const hechos = t > F3 + .2 ? 3 : t > F2 + .2 ? 2 : t > F1 + .2 ? 1 : 0;
  const lavA = (t < t0.negro ? .1 : lerp(.1, .14, smooth(prog(t, U1[1] - .4, U1[1])))) * smooth(prog(t, tr1 - .2, tr1 + .3));
  const s = hoja(c, cam, d.A, Math.max(e, 0), { hechos, forma: F, lavado: F ? `rgba(17,17,17,${lavA})` : undefined, mesa: !negro });
  if (!negro) polvo(c, cam, t - T_CAE);

  // ---------- la primera recta: sí / no ----------
  if (t < t0.mira + .9) {
    const a = 1 - smooth(prog(t, t0.mira, t0.mira + .55));
    const kL = ease.inOutCubic(prog(t, TR.a, TR.b));
    const aSi = smooth(prog(t, t0.si - .08, t0.si + .3)) * (1 - smooth(prog(t, t0.casi, t0.casi + .7)));
    const aNo = smooth(prog(t, t0.no - .08, t0.no + .3)) * (1 - smooth(prog(t, t0.casi, t0.casi + .7)));
    if (aSi > 0 || aNo > 0) {
      const f = (p: V) => (L0B[0] - L0A[0]) * (p[1] - L0A[1]) - (L0B[1] - L0A[1]) * (p[0] - L0A[0]);
      const K = 1 / Math.hypot(L0B[0] - L0A[0], L0B[1] - L0A[1]), W1 = 1.7 * ease.outCubic(prog(t, t0.si - .1, t0.si + .7)), W2 = 1.7 * ease.outCubic(prog(t, t0.no - .1, t0.no + .7));
      if (aSi > 0) polyMundo(c, cam, corta(corta(CUADRO, f), (p) => W1 - f(p) * K), `rgba(17,17,17,${.1 * aSi})`);
      if (aNo > 0) polyMundo(c, cam, corta(corta(CUADRO, (p) => -f(p)), (p) => W2 + f(p) * K), `rgba(192,68,42,${.2 * aNo})`);
      sello(c, cam, -.02, .44, "sí", 210, TINTA, aSi);
      sello(c, cam, .02, -.44, "no", 210, ACENTO, aNo);
    }
    // se borra de punta a punta
    const borra = ease.inOutCubic(prog(t, t0.mira, t0.mira + .7));
    if (kL > 0) rectaMundo(c, cam, NV(L0A, L0B, borra), NV(L0A, L0B, Math.max(kL, borra)), 0, TINTA, 9, a > 0 ? 1 : 0);
  }

  // ---------- los puntos: lluvia, y luego cada quien a su sitio ----------
  const P = d.pA;
  if (plano && t >= t0.casi - .2) {
    for (let i = 0; i < P.length; i++) {
      const ini = d.lluvia[i], k = prog(t, ini, ini + .38), h = 1.7 * (1 - k * k);
      if (k <= 0) continue;
      const m = d.mez[i], tl = P[i].neg ? t0.negros - .08 : t0.rojos - .08, rr = (i * 37 % 19) / 19;
      const q = ease.inOutCubic(prog(t, tl + rr * .4, tl + rr * .4 + .78));
      const u = lerp(m[0], P[i].u, q), w = lerp(m[1], P[i].v, q);
      const late = (1 + .35 * Math.exp(-Math.max(t - t0.puntos - Math.hypot(u, w) * .25, 0) * 7) * (t > t0.puntos ? 1 : 0)) * ola(t, u, w);
      const A = cam.p(u, w, h), B = cam.p(u + R_P, w, h), D = cam.p(u, w + R_P, h), S = cam.p(u, w, 0);
      if (!A || !B || !D) continue;
      if (h > .01 && S) sombra(c, S.x, S.y, 22, .24 / (1 + h * 2));
      c.save(); c.setTransform((B.x - A.x) * late, (B.y - A.y) * late, (D.x - A.x) * late, (D.y - A.y) * late, A.x, A.y);
      c.fillStyle = P[i].neg ? TINTA : ACENTO; c.beginPath(); c.arc(0, 0, 1, 0, 7); c.fill(); c.restore();
    }
  } else if (t >= t0.mira) {
    tintaPuntos(c, cam, s, P, R_P, (i) => ola(t, P[i].u, P[i].v));
  }

  // ---------- intentos con una sola recta ----------
  const bi = bolaIntentos(t);
  if (bi && bi.j >= 0) {
    for (let j = Math.max(0, bi.j - 1); j <= bi.j; j++) {
      const age = j < bi.j ? (bi.j - j - 1) + (1 - 1) + bi.r : 0, a = j === bi.j ? 1 : 1 - bi.r;
      void age;
      const fin = j === bi.j ? NV(INTENTOS[j], INTENTOS[j + 1], bi.r) : INTENTOS[j + 1];
      rectaMundo(c, cam, INTENTOS[j], fin, 0, TINTA, 7, a * (1 - smooth(prog(t, t0.ahora - .2, t0.ahora + .2))));
      if (j < bi.j) for (const i of d.malos[j]) {
        const Q = cam.p(P[i].u, P[i].v, 0); if (!Q) continue;
        c.save(); c.globalAlpha = (1 - bi.r) * .8; c.strokeStyle = P[i].neg ? TINTA : ACENTO; c.lineWidth = 3.4; c.beginPath(); c.arc(Q.x, Q.y, 20 + bi.r * 12, 0, 7); c.stroke(); c.restore();
      }
    }
  }

  // ---------- la recta sobre el paquete ----------
  if (F && t < t0.cada + .4) {
    const u = dir(45), ct: V = [-u[0] * RHO_ROMBO, -u[1] * RHO_ROMBO], dd: V = [-u[1], u[0]], al = 1 - smooth(prog(t, t0.cada - .1, t0.cada + .4));
    const a: V = [ct[0] - dd[0] * TAU, ct[1] - dd[1] * TAU], b: V = [ct[0] + dd[0] * Math.min(tauMax, TAU), ct[1] + dd[1] * Math.min(tauMax, TAU)];
    rectaMundo(c, cam, a, b, .03, TINTA, 8.5, al);
  }
  if (F) tintaForma(c, cam, s, F, TINTA, 8.5, tauMax);
  if (F && t >= U1[1] - .05) {
    // el contorno se enciende de una punta a la otra
    const k = ease.inOutSine(prog(t, U1[1] - .05, U1[1] + .8)), lista = F.segs.map((q, i) => ({ q, a: Math.atan2(q[0][1] + q[1][1], q[0][0] + q[1][0]) + 0 * i })).sort((x, y) => x.a - y.a);
    const R = lista.map((x) => x.q), G: Forma = { segs: [], tau: [], polys: [] }, n = R.length * k;
    R.forEach((q, i) => { if (i + 1 <= n) { G.segs.push(q); G.tau.push([0, 0]); } else if (i < n) { G.segs.push([q[0], NV(q[0], q[1], n - i)]); G.tau.push([0, 0]); } });
    tintaForma(c, cam, s, G, ACENTO, 13);
  }

  // ---------- bolas ----------
  const b1 = bolaPrimera(t);
  if (b1) bolaMundo(c, cam, b1[0], b1[1], b1[2], .085);
  if (bi) bolaMundo(c, cam, bi.p[0], bi.p[1], bi.p[2], .07);
  if (t >= tr0 - .1 && t < tr1 + .75) {
    const u = dir(45), ct: V = [-u[0] * RHO_ROMBO, -u[1] * RHO_ROMBO], dd: V = [-u[1], u[0]], q = t < tr1 ? tauMax : TAU + (t - tr1) * 2.2;
    bolaMundo(c, cam, ct[0] + dd[0] * q, ct[1] + dd[1] * q, .03, .06);
  }
  // la fila de neuronas que aprieta el pliegue
  if (t > t0.capaN - .2 && t < t0.dobla + 1.2) {
    const k = ease.inOutSine(prog(t, t0.capaN - .1, t0.dobla + 1.1));
    for (let i = 0; i < 5; i++) { const x = lerp(-1.9, 1, k) - i * .135; bolaMundo(c, cam, x, .035, .022, .055, TINTA, smooth(prog(t, t0.capaN - .2, t0.capaN + .1)) * (1 - smooth(prog(t, t0.dobla + .9, t0.dobla + 1.2)))); }
  }

  // ---------- oscuridad: luz cenital sobre la hoja ----------
  if (negro) {
    const g = c.createRadialGradient(540, 1010, 280, 540, 1010, 1020);
    g.addColorStop(0, "rgba(9,9,10,0)"); g.addColorStop(1, "rgba(9,9,10,.86)");
    c.fillStyle = g; c.fillRect(0, 0, 1080, 1920);
  }

  // ---------- palabras ----------
  rotulo(c, t, -1, t0.cosa - .68, "Una neurona sola", 262, 124);
  rotulo(c, t, t0.cosa - .38, t0.trazar + .1, "una cosa", 262, 136, ACENTO, true);
  rotulo(c, t, t0.recta - .12, t0.si - .3, "una línea recta", 262, 124, TINTA, true);
  rotulo(c, t, t0.casi + .2, t0.mira - .2, "casi nada", 1568, 136, ACENTO, true);
  rotulo(c, t, t0.negros, t0.ninguna - .3, "negros en medio", 232, 104);
  rotulo(c, t, t0.rojos, t0.ninguna - .3, "rojos alrededor", 346, 104, ACENTO, true);
  rotulo(c, t, t0.ninguna, t0.intenta - .3, "ninguna línea", 262, 124);
  rotulo(c, t, t0.intenta - .04, t0.ahora - .15, "Inténtalo.", 262, 136, ACENTO, true);
  rotulo(c, t, t0.dob1 - .05, t0.dob2 - .34, "dóblala", 262, 136, TINTA, true);
  rotulo(c, t, t0.dob2 - .04, t0.pronto - .2, "otra vez", 262, 136, TINTA, true);
  rotulo(c, t, t0.sola, t0.eso - .25, "una sola recta", 262, 128, TINTA, true);
  rotulo(c, t, t0.capaN + .05, t0.dobla - .32, "una capa de neuronas", 262, 104);
  rotulo(c, t, t0.dobla - .02, t0.cada - .25, "dobla el espacio", 262, 118, ACENTO, true);
  rotulo(c, t, t0.vuelve - .1, t0.negro - .2, "lo vuelve a doblar", 262, 108, TINTA, true);
  rotulo(c, t, t0.yaNo - .02, t0.conv - .2, "ya no es recta", 262, 128, LUZ, true);
  rotulo(c, t, t0.justo - .02, t0.doblez - .3, "justo lo que querías", 262, 108, LUZ, true);
}

// ---------- segunda mitad ----------
const centro = (pl: Plegado, e: number): V => { const i = clamp(Math.floor(e), 0, pl.ejes.length - 1); return NV(pl.centros[i], pl.centros[i + 1], smooth(e - i)); };
const desplaza = (cam: Cam, dx: number, dy: number, dz: number): Cam => ({ ...cam, p: (x: number, y: number, z = 0) => cam.p(x + dx, y + dy, z + dz) });

/** Discos sobre la hoja plana; a diferencia de tintaPuntos, aquí los puntos pueden estar viajando. */
function discos(c: CanvasRenderingContext2D, cam: Cam, P: { u: number; v: number; neg: boolean }[], r: number, esc?: (i: number) => number) {
  P.forEach((p, i) => {
    const R = r * (esc ? esc(i) : 1); if (R <= .001) return;
    const A = cam.p(p.u, p.v, 0), B = cam.p(p.u + R, p.v, 0), D = cam.p(p.u, p.v + R, 0); if (!A || !B || !D) return;
    c.save(); c.setTransform(B.x - A.x, B.y - A.y, D.x - A.x, D.y - A.y, A.x, A.y); c.fillStyle = p.neg ? TINTA : ACENTO; c.beginPath(); c.arc(0, 0, 1, 0, 7); c.fill(); c.restore();
  });
}

// El caso difícil: cinco dobleces cualquiera, una recta, y al abrir sale un recorte que nadie dibujó.
const B0 = t0.doblez - .02, BD = .37, BN = geo.ejesB.length, BU = t0.cara - .95, BUD = .2;
function eB(t: number) {
  let e = 0;
  for (let i = 0; i < BN; i++) e += ease.inOutSine(prog(t, B0 + i * BD, B0 + (i + 1) * BD)) - smooth(prog(t, BU + i * BUD, BU + (i + 1) * BUD));
  return e;
}
function escenaB(c: CanvasRenderingContext2D, t: number, d: Datos) {
  const e = eB(t), cen = centro(d.B, e), hondo = Math.sin(clamp(e / BN) * Math.PI / 2);
  const cam = camara(respira(v(cen[0], cen[1], .03 + hondo * .34 + .1 * prog(t, BU + 1, t0.por), lerp(1.4, 1.12, hondo), lerp(3, 1.7, hondo) - .16 * smooth(prog(t, BU + 1, t0.por))), t), 540, 1010, 1250);
  const tr0 = B0 + BN * BD, tr1 = BU - .02, k = ease.inOutSine(prog(t, tr0, tr1)), tau = lerp(d.tauB[0] - .05, d.tauB[1] + .05, k);
  const hechos = t < BU ? clamp(Math.ceil(e - .03), 0, BN) : BN, lav = .13 * smooth(prog(t, tr0, tr1));
  const s = hoja(c, cam, d.B, e, { forma: t >= tr0 ? d.fB : undefined, lavado: `rgba(17,17,17,${lav})`, hechos });
  const nombra = (i: number) => { const a = d.pB[i].neg ? t0.cara : t0.perro, x = t - a; return ola(t, d.pB[i].u, d.pB[i].v) * (1 + (x > 0 ? .75 * Math.exp(-x * 5) * Math.min(x * 14, 1) : 0)); };
  tintaPuntos(c, cam, s, d.pB, R_P, nombra);
  if (t >= tr0) tintaForma(c, cam, s, d.fB, TINTA, 7, tau);
  if (t >= tr0 && t < tr1 + .06) {
    const n: V = geo.lineaB.n as V, dd: V = [-n[1], n[0]], q = geo.lineaB.c as V;
    bolaMundo(c, cam, q[0] + dd[0] * tau, q[1] + dd[1] * tau, .05, .06);
  }
  rotulo(c, t, t0.doblez, t0.asi + .1, "doblez tras doblez", 262, 116, TINTA, true);
  rotulo(c, t, t0.cara - .1, t0.por - .1, "una cara", 232, 112);
  rotulo(c, t, t0.perro - .08, t0.por - .1, "un perro", 350, 112, ACENTO, true);
}

// La pila: cada capa agarra lo que dejó la de arriba y lo dobla. La cámara baja con ella: arriba el recorte
// más enredado, hasta abajo una sola recta. Es la misma curva del cold-open, vista desde el otro extremo.
const PILA = BN, GAP = .92, PASO = (t0.muchas - t0.prof) / PILA, TP = (i: number) => t0.prof + (i - 1) * PASO - .12;
function nivel(t: number) { let n = 0; for (let i = 1; i <= PILA; i++) n += ease.inOutCubic(prog(t, TP(i) + .12, TP(i) + .12 + PASO * .9)); return n; }
function escenaPila(c: CanvasRenderingContext2D, t: number, d: Datos) {
  const cierra = ease.inOutCubic(prog(t, t0.nadie - .62, t0.nadie - .06)), lv = nivel(t) * (1 - cierra), ent = ease.inOutCubic(prog(t, t0.por - .1, t0.prof + .3)) * (1 - cierra);
  const cam = camara(respira(v(0, 0, lerp(.03, -.3 + lv * .1, ent), lerp(1.4, 1.1, ent), lerp(3, 3.15 - lv * .23, ent), -GAP * lv), t), 540, 1010, 1250);
  for (let i = PILA; i >= 0; i--) {
    const k = i === 0 ? 1 : ease.inOutSine(prog(t, TP(i), TP(i) + .5));
    if (k <= 0 || (i > 0 && cierra >= 1)) continue;
    const e0 = i === 0 ? 0 : i - 1 + k, e = e0 * (1 - cierra), cen = centro(d.B, e), z = -e0 * GAP * (1 - cierra);
    const cerca = i === PILA ? 1 : 1 - smooth((lv - i - .3) / .45), cam2 = desplaza(cam, -cen[0], -cen[1], z);
    if (cerca <= .01) continue;
    const s = hoja(c, cam2, d.B, e, { forma: d.fB, lavado: `rgba(17,17,17,${.13 * (1 - cierra)})`, hechos: Math.ceil(e), reticula: i < 3 ? 6 : 3, mesa: false, sombraFlap: .5, velo: lerp(i === PILA ? 1 : .84, 1, cierra) * cerca });
    tintaPuntos(c, cam2, s, d.pB, .028, () => 1 - (i === 0 ? 0 : cierra), cerca);
    tintaForma(c, cam2, s, d.fB, TINTA, i === PILA ? 9 : 5.5, 1e9, (1 - cierra) * cerca);
  }
  // abajo solo queda lo que sabe hacer una neurona: la bola corre por la recta
  if (t >= t0.muchas - .25 && cierra <= 0) {
    const cen = centro(d.B, PILA), cam2 = desplaza(cam, -cen[0], -cen[1], -GAP * PILA), n = geo.lineaB.n as V, dd: V = [-n[1], n[0]], q = geo.lineaB.c as V;
    const u = lerp(d.tauB[0] - .25, d.tauB[1] + .25, ease.inOutSine(prog(t, t0.muchas - .25, t0.nadie - .7)));
    bolaMundo(c, cam2, q[0] + dd[0] * u, q[1] + dd[1] * u, .04, .05);
  }
  if (cierra > 0) discos(c, cam, d.pB.map((p, i) => ({ u: lerp(p.u, d.pA[i].u, cierra), v: lerp(p.v, d.pA[i].v, cierra), neg: p.neg })), R_P);
  // niebla de papel: lo que sube se pierde antes de llegar a las palabras
  const nb = smooth(lv / .7);
  if (nb > 0) {
    const g = c.createLinearGradient(0, 400, 0, 600);
    g.addColorStop(0, `rgba(244,242,236,${nb})`); g.addColorStop(1, "rgba(244,242,236,0)");
    c.fillStyle = g; c.fillRect(0, 400, 1080, 200); c.fillStyle = `rgba(244,242,236,${nb})`; c.fillRect(0, 0, 1080, 400);
  }
  rotulo(c, t, t0.aprend - .02, t0.noSig - .12, "aprendizaje", 232, 118);
  rotulo(c, t, t0.prof - .02, t0.noSig - .12, "profundo", 372, 158, ACENTO, true);
  rotulo(c, t, t0.hondo - .05, t0.sign - .14, "piense hondo", 262, 124);
  if (t >= t0.hondo + .36 && t < t0.sign) {
    const q = ease.outCubic(prog(t, t0.hondo + .36, t0.hondo + .62));
    c.save(); c.globalAlpha = 1 - smooth(prog(t, t0.sign - .14, t0.sign + .06)); c.strokeStyle = ACENTO; c.lineWidth = 11; c.lineCap = "round"; c.beginPath(); c.moveTo(214, 228); c.lineTo(lerp(214, 866, q), 228); c.stroke(); c.restore();
  }
  rotulo(c, t, t0.muchas - .03, t0.nadie - .86, "muchas capas", 262, 136, ACENTO, true);
}

// Las perillas de verdad: dos dobleces y una recta. El aprendizaje es descenso de gradiente real (geometria.py).
function ejesDe(th: number[]) {
  const n1: V = [Math.cos(th[0]), Math.sin(th[0])], n2: V = [Math.cos(th[2]), Math.sin(th[2])], n3: V = [Math.cos(th[4]), Math.sin(th[4])];
  return { ejes: [{ c: [n1[0] * th[1], n1[1] * th[1]] as V, n: n1 }, { c: [n2[0] * th[3], n2[1] * th[3]] as V, n: n2 }], n3, w: th[5] };
}
function formaAprendida(th: number[], pl?: Plegado) {
  const q = ejesDe(th), P = pl ?? plegar(q.ejes);
  return forma(P, 2, [q.n3[0] * q.w, q.n3[1] * q.w], [-q.n3[0], -q.n3[1]]);
}
function puntaje(th: number[], p: Punto) {
  const q = ejesDe(th); let x = p.u, y = p.v;
  for (const e of q.ejes) { const m = Math.max(x * e.n[0] + y * e.n[1] - (e.c[0] * e.n[0] + e.c[1] * e.n[1]), 0); x -= 2 * m * e.n[0]; y -= 2 * m * e.n[1]; }
  return x * q.n3[0] + y * q.n3[1] - q.w;
}
const CEROS = geo.aprende.findIndex((r) => r.e === 0), ULT = Math.min(CEROS + 90, geo.aprende.length - 1);
function pasoDe(t: number) {
  const R = geo.aprende, k = prog(t, t0.nadie + .05, t0.error + .05);
  const x = t < t0.error + .05 ? CEROS * Math.min(k ** 1.25 * 1.02, 1) : CEROS + (ULT - CEROS) * ease.outCubic(prog(t, t0.error + .05, t0.unaR - .6));
  const i = Math.min(Math.floor(x), ULT - 1), r = x - i;
  return { th: R[i].p.map((a, j) => lerp(a, R[i + 1].p[j], r)), err: R[Math.round(x)].e, ini: R[0].e };
}
function perilla(c: CanvasRenderingContext2D, x: number, y: number, r: number, a: number) {
  bola(c, x, y, r);
  c.strokeStyle = LUZ; c.lineWidth = 7; c.lineCap = "round"; c.beginPath(); c.moveTo(x + Math.cos(a) * r * .28, y + Math.sin(a) * r * .28); c.lineTo(x + Math.cos(a) * r * .82, y + Math.sin(a) * r * .82); c.stroke();
}
const CAM_PLANA = (t: number) => camara(respira(v(0, 0, .03, 1.38, 3), t), 540, 1010, 1250);
function escenaAprende(c: CanvasRenderingContext2D, t: number, d: Datos) {
  const cam = CAM_PLANA(t), { th, err, ini } = pasoDe(t), q = ejesDe(th), pl = plegar(q.ejes), F = formaAprendida(th, pl);
  const entra = smooth(prog(t, t0.nadie - .06, t0.nadie + .3));
  const s = hoja(c, cam, pl, 0, { forma: F, lavado: `rgba(17,17,17,${.1 * entra})`, hechos: 2, rayas: true, huella: entra });
  discos(c, cam, d.pA, R_P, (i) => ola(t, d.pA[i].u, d.pA[i].v));
  tintaForma(c, cam, s, F, err === 0 ? ACENTO : TINTA, 8, 1e9, entra);
  d.pA.forEach((p) => {
    if ((puntaje(th, p) > 0) === !p.neg) return;
    const Q = cam.p(p.u, p.v, 0); if (!Q) return;
    c.save(); c.globalAlpha = entra; c.strokeStyle = p.neg ? TINTA : ACENTO; c.lineWidth = 3.6; c.beginPath(); c.arc(Q.x, Q.y, 22, 0, 7); c.stroke(); c.restore();
  });
  [th[0], th[2], th[4]].forEach((a, i) => perilla(c, 168 + i * 124, 1510, 50, -a * 2.6));
  const yN = 1546, pulso = Math.exp(-((t * 7) % 1) * 3) * (err > 0 ? 1 : 0);
  texto(c, "error", 640, yN, { fuente: serif(100, true), color: ACENTO, alfa: entra });
  texto(c, String(err), 862, yN, { fuente: mono(112 + pulso * 6), color: err === 0 ? TINTA : ACENTO, alfa: entra });
  c.save(); c.globalAlpha = entra; c.fillStyle = ACENTO; c.fillRect(540, 1572, 430 * err / ini, 14); c.restore();
  rotulo(c, t, t0.nadie + .1, t0.losD - .3, "nadie le dice", 232, 116);
  rotulo(c, t, t0.nadie + .6, t0.losD - .3, "dónde doblar", 350, 116, TINTA, true);
  rotulo(c, t, t0.losD - .02, t0.salen - .3, "los dobleces", 262, 118);
  rotulo(c, t, t0.salen - .02, t0.unaR - .62, "salen del error", 262, 124, ACENTO, true);
}

// Una recta sola, y la misma recta doblada: el capítulo se cierra con un recorte que cabe en una línea.
const RA: V = [-.96, -.24], RB: V = [.96, .24], F0 = t0.doblada - .14, FD = .4, FN = 4, U0 = t0.puede - .2, UD = .3;
const CB0 = F0 + FN * FD + .02, CB1 = U0 - .03;
function eF(t: number) {
  let e = 0;
  for (let i = 0; i < FN; i++) e += ease.inOutSine(prog(t, F0 + i * FD, F0 + (i + 1) * FD)) - ease.inOutCubic(prog(t, U0 + i * UD, U0 + (i + 1) * UD));
  return e;
}
/** Sola, la recta cabecea y regresa al mismo sitio: toda su libertad es girar. */
const cabeceo = (t: number) => .2 * Math.sin((t - t0.unaR) * 2.75) * smooth(prog(t, t0.unaR + .1, t0.unaR + .7)) * (1 - smooth(prog(t, t0.pero - .25, t0.pero + .3)));
const gira = (p: V, a: number): V => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
const proy = (p: V): V => { const dx = RB[0] - RA[0], dy = RB[1] - RA[1], r = ((p[0] - RA[0]) * dx + (p[1] - RA[1]) * dy) / (dx * dx + dy * dy); return [lerp(RA[0], RB[0], r), lerp(RA[1], RB[1], r)]; };
function escenaFinal(c: CanvasRenderingContext2D, t: number, d: Datos) {
  const e = eF(t), cen = centro(d.A, e), h = Math.sin(clamp(e / FN) * Math.PI / 2), acaba = prog(t, t0.fin - .2, DURACION);
  const fA = U0 + FN * UD, tg = t - fA, giro = tg > 0 ? .24 * tg * smooth(tg / .7) * (1 - tg * .055) : 0;
  const cam = camara(respira(v(cen[0], cen[1], .03 + h * .4 + giro, lerp(1.4 + acaba * .06, 1.2, h), lerp(3 - acaba * .16, 1.42, h)), t), 540, 1010, 1250);
  const k = ease.inOutCubic(prog(t, t0.unaR - .6, t0.unaR - .02)), abierta = t > U0;
  const ver = abierta ? smooth(prog(t, U0, U0 + FN * UD + .05)) : 0;
  const huella = abierta ? 1 : 1 - smooth(prog(t, t0.unaR - .6, t0.unaR - .1));
  const hechos = abierta ? FN : t < F0 ? (huella > .01 ? 2 : 0) : clamp(Math.ceil(e - .02), 0, FN);
  const plA = !abierta && t < F0 && huella > .01 ? plegar(ejesDe(geo.aprende[ULT].p).ejes) : d.A;
  const estrella = t >= CB0;
  const s = hoja(c, cam, plA, e, {
    forma: estrella ? d.fEstrella : undefined, lavado: `rgba(192,68,42,${.94 * ver})`, hechos, huella: abierta || t >= F0 ? 1 : huella,
  });
  // el contorno aprendido se aplasta hasta ser una sola recta
  if (t < F0 + FN * FD) {
    const a = d.fFin.segs, al = 1 - smooth(prog(t, F0 + .4, F0 + 1.2)), alar = smooth(prog(t, t0.unaR - .2, t0.unaR + .22));
    if (k < 1) {
      c.save(); c.strokeStyle = ACENTO; c.lineWidth = 8; c.lineCap = "round"; c.beginPath();
      for (const q of a) { const A = NV(q[0], proy(q[0]), k), B = NV(q[1], proy(q[1]), k), P = cam.p(A[0], A[1], 0), Q = cam.p(B[0], B[1], 0); if (P && Q) { c.moveTo(P.x, P.y); c.lineTo(Q.x, Q.y); } }
      c.stroke(); c.restore();
      discos(c, cam, d.pA, R_P, (i) => 1 - ease.inCubic(prog(t, t0.unaR - .62 + (i % 7) * .03, t0.unaR - .14 + (i % 7) * .03)));
    }
    if (alar > 0 || k >= 1) {
      const qq = cabeceo(t), L: Forma = { segs: [[gira(NV([0, 0], RA, alar), qq), gira(NV([0, 0], RB, alar), qq)]], tau: [[0, 0]], polys: [] };
      tintaForma(c, cam, s, L, TINTA, 9, 1e9, al);
    }
  }
  const tauF = lerp(-1.3, .72, ease.inOutSine(prog(t, CB0 - .22, CB1 + .1)));
  if (estrella) tintaForma(c, cam, s, d.fEstrella, ACENTO, 7, abierta ? 99 : tauF);
  // la bola
  let b: [number, number, number] | null = null;
  if (t >= t0.unaR - .06 && t < t0.pero + .55) {
    const r = ease.outCubic(prog(t, t0.unaR - .06, t0.noPuede + .75)), p = gira(NV(RA, RB, lerp(0, .5, r)), cabeceo(t)), z = 7 * ease.inCubic(prog(t, t0.pero + .05, t0.pero + .55)) + caida(t - (t0.unaR - .06), .5, .42, 24).z;
    b = [p[0], p[1], z];
  } else if (t >= CB0 - .22 && t < CB1 + .1) {
    const u = dir(180), f = dir(202.5), P1: V = [u[0] * .92, u[1] * .92], P2: V = [f[0] * .34, f[1] * .34], m = Math.hypot(P2[0] - P1[0], P2[1] - P1[1]);
    b = [P1[0] + (P1[0] - P2[0]) / m * tauF, P1[1] + (P1[1] - P2[1]) / m * tauF, .05];
  } else if (t >= t0.fin - .14) b = [0, 0, caida(t - (t0.fin - .14), 5, .44, 24).z + .02];
  if (b) bolaMundo(c, cam, b[0], b[1], b[2], .085);
  rotulo(c, t, t0.unaR + .02, t0.pero - .22, "una recta sola", 232, 120);
  rotulo(c, t, t0.noPuede - .02, t0.pero - .22, "no puede casi nada", 350, 104, TINTA, true);
  rotulo(c, t, t0.doblada - .04, t0.puede - .3, "doblada", 262, 136, TINTA, true);
  rotulo(c, t, t0.puede - .02, 99, "puede casi todo", 262, 128, ACENTO, true);
}

function segunda(c: CanvasRenderingContext2D, t: number, d: Datos) {
  if (t < t0.por - .1) escenaB(c, t, d);
  else if (t < t0.nadie - .06) escenaPila(c, t, d);
  else if (t < t0.unaR - .6) escenaAprende(c, t, d);
  else escenaFinal(c, t, d);
}

export const Pieza: React.FC = () => <Lienzo dibuja={dibuja} preparar={prepara} />;
