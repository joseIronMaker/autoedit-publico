// Capítulo 11. Una ruleta cargada que escribe. Sus casillas no miden lo mismo: cada una es del tamaño de la
// probabilidad de su palabra. La lista de la voz (azul 70, gris 10, hermoso 5) es una barra que se enrosca
// y se vuelve la rueda. La temperatura es de verdad: los sectores salen de p^(1/T) y una sola fórmula hace
// de todo: exponente 0 = rueda pareja (nunca entrenada), 1 = la lista, grande = robot. Nada entra a la
// rueda mientras escribe: internet entra ANTES, se vuelve perillas y se acaba. La bola sale de los tres
// puntos suspensivos y termina siendo el punto final.
import React from "react";
import { azar, Cam, camara, clamp, ease, lerp, prog, resorte, smooth, texto, Vista } from "../../kit";
import { ACENTO, bola, flecha, GRIS, Lienzo, LUZ, mono, NOCHE, PAPEL, rotulo, serif, sombra, TINTA } from "../../marca";
import duracion from "./duracion.json";
import K from "./t.json";

export const DURACION = duracion.dur;
type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;

// ---------- utilidades ----------
function linea(c: Ctx, ax: number, ay: number, bx: number, by: number) { c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke(); }
function circulo(c: Ctx, x: number, y: number, r: number) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * TAU + f);
function tramos(t: number, v0: number, S: [number, number, number, ((x: number) => number)?][]) {
  let v = v0;
  for (const [a, b, x, f] of S) { if (t <= a) break; v = lerp(v, x, (f ?? smooth)(prog(t, a, b))); }
  return v;
}
const golpe = (t: number, ti: number, a = 1, w = 34, k = 9) => (t > ti ? a * Math.exp(-(t - ti) * k) * Math.sin((t - ti) * w) : 0);
const pop = (t: number, ti: number, d = .26, s = 1.9) => ease.outBack(prog(t, ti, ti + d), s);
const hash = (i: number, j: number) => { const s = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453; return s - Math.floor(s); };

// ---------- las ruedas ----------
type Sec = { w: string; p: number };
const POCAS = ["claro", "enorme", "oscuro", "nuestro", "infinito", "tuyo", "viejo", "rojo", "queso", "mesa", "lento", "tibio"];
const reparte = (L: string[], total: number): Sec[] => L.map((w) => ({ w, p: total / L.length }));
const MIL = ["el", "de", "que", "amor", "def", "mar", "si", "la", "for", "noche", "y", "río", "no", "tú", "if", "sol", "una", "ser", "con", "luz"];
const DISCOS: Record<string, Sec[]> = {
  mil: Array.from({ length: 40 }, (_, i) => ({ w: MIL[i % MIL.length], p: 1 / 40 })),
  cielo: [{ w: "azul", p: .7 }, { w: "gris", p: .1 }, { w: "hermoso", p: .05 }, ...reparte(POCAS, .15)],
  vacio: [{ w: "", p: 1 }],
  d2: [{ w: "porque", p: .36 }, { w: "y", p: .17 }, { w: "hoy", p: .13 }, { w: "como", p: .1 }, ...reparte(POCAS.slice(0, 8), .24)],
  d3: [{ w: "la", p: .44 }, { w: "el", p: .22 }, { w: "nadie", p: .08 }, { w: "así", p: .06 }, ...reparte(POCAS.slice(3, 10), .2)],
  d4: [{ w: "luz", p: .52 }, { w: "atmósfera", p: .18 }, { w: "gente", p: .06 }, ...reparte(POCAS.slice(2, 9), .24)],
  d5: [{ w: "del", p: .47 }, { w: "que", p: .2 }, { w: "se", p: .12 }, ...reparte(POCAS.slice(0, 6), .21)],
  cre: [{ w: "creíble", p: .64 }, { w: "verdadera", p: .05 }, { w: "probable", p: .13 }, { w: "lógica", p: .06 }, { w: "cierta", p: .03 }, ...reparte(POCAS.slice(0, 7), .09)],
};
/** Temperatura de verdad: p^(1/T) normalizado. e = 1/T. e = 0 da una rueda pareja. */
function poten(S: Sec[], e: number): Sec[] {
  const q = S.map((s) => s.p ** e), n = q.reduce((a, b) => a + b, 0);
  return S.map((s, i) => ({ w: s.w, p: q[i] / n }));
}

const TIR = K.tir as [number, number, string, number, number][];
const armaF = K.elige + .02;
const CAMB: [number, number, string][] = [[-1, 0, "mil"], [K.arma, 0, "cielo"], [K.vacia, .5, "vacio"], [K.re, .75, "d2"], [K.pxf[0] + .04, .24, "d3"], [K.pxf[1] + .04, .24, "d4"], [K.pxf[2] + .04, .24, "d5"],
  [K.nosi - 2, 0, "cielo"], [K.eso, 0, "mil"], [K.yc - .3, .9, "cre"]];

/** Exponente de la lista: el entrenamiento y la temperatura son el mismo número. */
function ePot(t: number) {
  if (t < K.misma) {
    let e = tramos(t, 1, [[K.como, K.igual - .05, 0, ease.inOutCubic], [K.peri + .62, K.peri + 1.05, .2, ease.outBack], [K.abs0 + .25, K.abs1 - .05, 1]]);
    if (t >= K.ledejan - .1) e = 1 / tempDe(vT(t));
    return e;
  }
  return 1;
}
/** Perilla de temperatura: −3 aprieta, +3 suelta. */
const tempDe = (v: number) => 2 ** (v / 1.25);
function vT(t: number) {
  return tramos(t, -2.4, [[K.ledejan + .3, K.azar_ + .2, 0, ease.inOutCubic], [K.ftemp + .1, K.ftemp + .5, -3, ease.outBack], [K.ftemp + .78, K.ftemp + 1.2, 2.8, ease.outBack], [K.misma - .1, K.misma + .3, 0, ease.inOutCubic]]);
}

function secs(t: number): { S: Sec[]; of: number; k: string } {
  let act = "mil", ant = "", q = 1;
  for (const [ti, d, key] of CAMB) { if (t < ti) break; ant = act; act = key; q = d > 0 ? smooth(prog(t, ti, ti + d)) : 1; }
  const A = act === "cielo" ? poten(DISCOS.cielo, ePot(t)) : DISCOS[act];
  if (q >= 1) return { S: A, of: 0, k: act };
  const B = DISCOS[ant];
  return { S: [...B.map((s) => ({ w: s.w, p: s.p * (1 - q) })), ...A.map((s) => ({ w: s.w, p: s.p * q }))], of: B.length, k: act };
}
const centroDe = (S: Sec[], g: number) => { let a = 0; for (let i = 0; i < g; i++) a += S[i].p; return a + S[g].p / 2; };

// La rueda se detiene con el ganador al frente. Entre tiradas gira a velocidad casi constante.
const FRENTE = -Math.PI / 2, W_ROT = -.62;
const ANC: { t: number; a: number }[] = (() => {
  const A = [{ t: armaF, a: -Math.PI / 2 }];
  for (const [, fin, dk, g, ti] of TIR) {
    if (ti === 0 || fin < armaF) continue;
    const u = A[A.length - 1], fr = centroDe(DISCOS[dk], g), obj = FRENTE + TAU * (dk === "cre" ? DISCOS.cre[0].p * .84 : fr), pred = u.a + W_ROT * (fin - u.t);
    A.push({ t: fin, a: obj + Math.round((pred - obj) / TAU) * TAU });
  }
  return A;
})();
function rot(t: number) {
  if (t < armaF) {
    if (t < K.arma - .1) { const b = K.truco, w = 3.1; return -(t < b ? w * t : w * b + w * (1 - Math.exp(-(t - b) * 1.5)) / 1.5); }
    return -Math.PI / 2;
  }
  const n = ANC.length - 1;
  if (t >= ANC[n].t) return ANC[n].a + W_ROT * (1 - Math.exp(-(t - ANC[n].t) * 1.5)) / 1.5;
  let i = 0;
  while (i < n - 1 && t >= ANC[i + 1].t) i++;
  return lerp(ANC[i].a, ANC[i + 1].a, prog(t, ANC[i].t, ANC[i + 1].t));
}

// ---------- la bola ----------
const RD = .59, HU = [.66, .78, .87, .94, 1], HA = [.2, .13, .07, .03], CAIDA = 1.7;
const zSup = (r: number) => lerp(.04, .12, smooth(prog(r, .72, .8)));
function angulo(dk: string, g: number, t: number, ti: number) {
  const S = dk === "cielo" ? poten(DISCOS.cielo, ePot(t)) : DISCOS[dk];
  const fr = dk === "cre" && ti === 2 ? S[0].p * .84 : centroDe(S, g);
  return rot(t) - TAU * fr;
}
function bolaR(t: number) {
  let k = -1;
  for (let i = 0; i < TIR.length; i++) { if (TIR[i][0] <= t) k = i; else break; }
  if (k < 0) return { a: 0, r: RD, z: .1 };
  const [ini, fin, dk, g, ti] = TIR[k];
  if (t >= fin) { if (t >= armaF && t < K.t1i) return { a: rot(t), r: RD, z: 0 }; return { a: angulo(dk, g, t, ti), r: RD, z: 0 }; }
  const p = k > 0 ? TIR[k - 1] : null;
  const aI = ini === K.t1i ? rot(ini) : p ? angulo(p[2], p[3], Math.min(ini, p[1] + 1e3), p[4]) : 0;
  const aF = angulo(dk, g, fin, ti);
  const u = prog(t, ini, fin);
  if (ti === 0) {
    let dA = ((aF - aI) % TAU + TAU) % TAU; if (dA > Math.PI) dA -= TAU;
    return { a: aI + dA * ease.inOutSine(u), r: RD, z: (dk === "cielo" ? .12 : .17) * 4 * u * (1 - u) };
  }
  const dur = fin - ini, W = (((aI - aF) % TAU + TAU) % TAU) + Math.round(dur * .9) * TAU;
  let a = aF + W * (1 - u) ** CAIDA;
  if (ti === 2) {
    const S = DISCOS.cre, ve = -TAU * ((S[0].p + S[1].p / 2) - S[0].p * .84);
    a += ve * (1 - smooth(prog(u, .86, .97))) * smooth(prog(u, .62, .78));
  }
  let r = u < .07 ? lerp(RD, .83, smooth(u / .07)) : u < HU[0] ? .83 : u < HU[1] ? lerp(.83, .72, smooth(prog(u, HU[0], HU[1]))) : lerp(.72, RD, smooth(prog(u, HU[1], HU[3])));
  let z = u < .07 ? .16 * Math.sin(u / .07 * Math.PI) : 0;
  for (let i = 0; i < 4; i++) if (u >= HU[i] && u < HU[i + 1]) { const v = prog(u, HU[i], HU[i + 1]); z = HA[i] * 4 * v * (1 - v); }
  // Los deflectores: cuando pierde velocidad, cada uno la hace brincar.
  if (u > .36 && u < HU[0]) { const q = smooth(prog(u, .36, .58)), s4 = Math.sin(a * 4); z += .05 * q * Math.abs(s4) ** 6; r += .014 * q * s4; }
  return { a, r, z };
}

function rimBola(c: Ctx, x: number, y: number, r: number, alfa = .9) {
  if (r < 2.5) return;
  bola(c, x, y, r);
  if (alfa <= .01) return;
  c.save(); c.globalAlpha = alfa; c.lineCap = "round";
  c.strokeStyle = "rgba(237,234,227,.82)"; c.lineWidth = Math.max(2, r * .06); c.beginPath(); c.arc(x, y, r - c.lineWidth / 2, 3.5, 5.3); c.stroke();
  c.strokeStyle = "rgba(237,234,227,.34)"; c.lineWidth = Math.max(1.4, r * .03); c.beginPath(); c.arc(x, y, r - 1, 0, TAU); c.stroke();
  c.restore();
}
const RM = 4.1, RB = .072;
function pr(cam: Cam, R: number, r: number, a: number, z = 0) { return cam.p(Math.cos(a) * r * R, Math.sin(a) * r * R, z * R)!; }
function bolaEnRueda(c: Ctx, cam: Cam, R: number, b: { a: number; r: number; z: number }) {
  const zs = zSup(b.r), s = pr(cam, R, b.r, b.a, zs), p = pr(cam, R, b.r, b.a, zs + b.z + RB * .9), rp = RB * R * p.s;
  const al = .5 / (1 + b.z * 12), rs = rp * (1.5 + b.z * 8);
  c.save(); c.translate(s.x + rp * .12, s.y + rp * .2); c.scale(1, Math.sin(cam.v.pitch));
  const g = c.createRadialGradient(0, 0, 0, 0, 0, rs); g.addColorStop(0, `rgba(10,8,6,${al})`); g.addColorStop(1, "rgba(10,8,6,0)");
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, rs, 0, TAU); c.fill(); c.restore();
  rimBola(c, p.x, p.y, rp);
  return p;
}

// ---------- la rueda, a mano ----------
function aro(c: Ctx, cam: Cam, R: number, r0: number, z0: number, r1: number, z1: number, fill: string | CanvasGradient) {
  const N = 90; c.beginPath();
  for (let i = 0; i <= N; i++) { const p = pr(cam, R, r0, i / N * TAU, z0); if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); }
  c.closePath();
  for (let i = N; i >= 0; i--) { const p = pr(cam, R, r1, i / N * TAU, z1); if (i === N) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y); }
  c.closePath(); c.fillStyle = fill; c.fill("evenodd");
}
function discoZ(c: Ctx, cam: Cam, R: number, r: number, z: number, fill: string | CanvasGradient) {
  const N = 90; c.beginPath();
  for (let i = 0; i <= N; i++) { const p = pr(cam, R, r, i / N * TAU, z); if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); }
  c.closePath(); c.fillStyle = fill; c.fill();
}
function sector(c: Ctx, cam: Cam, R: number, a0: number, a1: number, ri: number, ro: number, z: number) {
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / .06)); c.beginPath();
  for (let i = 0; i <= n; i++) { const p = pr(cam, R, ro, lerp(a0, a1, i / n), z); if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); }
  for (let i = n; i >= 0; i--) { const p = pr(cam, R, ri, lerp(a0, a1, i / n), z); c.lineTo(p.x, p.y); }
  c.closePath();
}
const tono = (S: Sec[], i: number, of = 0) => {
  const k = i - of, s = S[i];
  if (s.w === "") return "#DCD8CD";
  if (S.length - of >= 30) return k % 2 ? "#1B1B1A" : "#E7E2D6";
  if (k === 0) return "#F4F0E7";
  if (k === 1) return "#9B988F";
  if (k === 2) return "#1E1E1D";
  return k % 2 ? "#CFCABE" : "#2B2B29";
};
const oscuro = (col: string) => col === "#1B1B1A" || col === "#1E1E1D" || col === "#2B2B29" || col === "#9B988F";

/** Texto pegado a la rueda: afín local, sale de la misma proyección. Se lee derecho al frente. */
function letraDisco(c: Ctx, cam: Cam, R: number, a: number, r: number, s: string, tam: number, col: string, radial: boolean, alfa: number) {
  if (alfa <= .01) return;
  const e = .03, P = pr(cam, R, r, a, .045), A = pr(cam, R, r, a + e / r, .045), B = pr(cam, R, r + e, a, .045);
  const tx = (A.x - P.x) / (e * R), ty = (A.y - P.y) / (e * R), rx = (B.x - P.x) / (e * R), ry = (B.y - P.y) / (e * R), u = tam / 100;
  c.save(); c.globalAlpha *= alfa;
  if (radial) c.transform(-rx * u, -ry * u, tx * u, ty * u, P.x, P.y); else c.transform(tx * u, ty * u, rx * u, ry * u, P.x, P.y);
  c.font = serif(100); c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = col; c.fillText(s, 0, 2); c.restore();
}

function perillaMetal(c: Ctx, x: number, y: number, R: number, ang: number, sq = 1, alto = 8) {
  c.save(); c.translate(x, y); c.scale(1, sq);
  const g = c.createRadialGradient(R * .2, R * .3, R * .5, R * .2, R * .3, R * 1.5);
  g.addColorStop(0, "rgba(20,18,14,.42)"); g.addColorStop(1, "rgba(20,18,14,0)");
  c.fillStyle = g; c.beginPath(); c.arc(R * .2, R * .3, R * 1.5, 0, TAU); c.fill();
  const ty = -alto / sq;
  c.fillStyle = "#070707"; for (let k = 0; k <= 4; k++) circulo(c, 0, lerp(0, ty, k / 4), R * 1.02);
  const N = 34; c.fillStyle = "#151514"; c.beginPath();
  for (let i = 0; i < N * 2; i++) { const a = ang + i * Math.PI / N, r = R * (i % 2 ? 1.05 : .985), px = Math.cos(a) * r, py = ty + Math.sin(a) * r; if (i) c.lineTo(px, py); else c.moveTo(px, py); }
  c.closePath(); c.fill();
  c.lineWidth = Math.max(R * .018, 1);
  for (let i = 0; i < N; i++) {
    const a = ang + (i * 2 + 1) * Math.PI / N, l = Math.cos(a + 2.2); if (l < .12) continue;
    c.strokeStyle = `rgba(214,212,204,${.72 * l * l})`;
    linea(c, Math.cos(a) * R * .9, ty + Math.sin(a) * R * .9, Math.cos(a) * R * 1.03, ty + Math.sin(a) * R * 1.03);
  }
  const G = c.createConicGradient(-.9, 0, ty);
  [["#E4E1D9", 0], ["#8D8B85", .13], ["#DCD9D1", .26], ["#74726C", .39], ["#D2CFC7", .5], ["#7F7D77", .63], ["#E6E3DB", .76], ["#7A7872", .89], ["#E4E1D9", 1]].forEach(([k, s]) => G.addColorStop(s as number, k as string));
  c.fillStyle = "#050505"; circulo(c, 0, ty, R * .8);
  c.fillStyle = G; circulo(c, 0, ty, R * .74);
  c.strokeStyle = TINTA; c.lineWidth = R * .075; c.lineCap = "round";
  linea(c, Math.cos(ang) * R * .2, ty + Math.sin(ang) * R * .2, Math.cos(ang) * R * .66, ty + Math.sin(ang) * R * .66);
  c.fillStyle = ACENTO; circulo(c, Math.cos(ang) * R * .9, ty + Math.sin(ang) * R * .9, R * .062);
  c.restore();
}

function cuenco(c: Ctx, cam: Cam, R: number, alfa: number) {
  if (alfa <= .01) return;
  const C = cam.p(0, 0, 0)!, px = R * C.s, sq = Math.sin(Math.min(cam.v.pitch, 1.55));
  c.save(); c.globalAlpha *= alfa;
  // Sombra en la mesa.
  c.save(); c.translate(C.x + px * .07, C.y + px * .15); c.scale(1, sq);
  const gs = c.createRadialGradient(0, 0, px * .88, 0, 0, px * 1.16); gs.addColorStop(0, "rgba(20,18,14,.44)"); gs.addColorStop(1, "rgba(20,18,14,0)");
  c.fillStyle = gs; c.beginPath(); c.arc(0, 0, px * 1.16, 0, TAU); c.fill(); c.restore();
  // Faldón y aro de madera negra.
  discoZ(c, cam, R, 1, -.05, "#060606");
  const G = c.createConicGradient(-1, C.x, C.y);
  [["#2C2B29", 0], ["#0D0D0C", .14], ["#3A3936", .3], ["#111110", .48], ["#2A2927", .64], ["#0C0C0B", .8], ["#2C2B29", 1]].forEach(([k, s]) => G.addColorStop(s as number, k as string));
  aro(c, cam, R, 1, .13, .935, .13, G);
  // Pista de metal por donde corre la bola.
  aro(c, cam, R, .935, .13, .905, .09, "#3A3936");
  const Gm = c.createConicGradient(.6, C.x, C.y);
  [["#D9D5CA", 0], ["#A9A59A", .12], ["#E7E3D9", .27], ["#9B978C", .42], ["#E0DCD1", .58], ["#A3A094", .73], ["#EAE6DC", .87], ["#D9D5CA", 1]].forEach(([k, s]) => Gm.addColorStop(s as number, k as string));
  aro(c, cam, R, .905, .09, .755, .06, Gm);
  // Deflectores.
  for (let i = 0; i < 8; i++) {
    const a = (i + .5) / 8 * TAU, d = .05, w = .022, P = [pr(cam, R, .83 + d, a, .1), pr(cam, R, .83, a + w * 1.6, .1), pr(cam, R, .83 - d, a, .08), pr(cam, R, .83, a - w * 1.6, .08)];
    c.fillStyle = "#17120F"; c.beginPath(); P.forEach((p, k) => (k ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.fill();
  }
  c.restore();
}

function rueda(c: Ctx, cam: Cam, s: { S: Sec[]; of: number }, r0: number, o: { R?: number; gan?: number; gk?: number; roz?: number; rozK?: number; etiq?: number; bowl?: number; sin?: number } = {}) {
  const R = o.R ?? RM, S = s.S, etiq = o.etiq ?? 1, ri = .22, ro = .74, z = .04;
  cuenco(c, cam, R, o.bowl ?? 1);
  discoZ(c, cam, R, .76, z - .005, "#0B0B0A");
  let acc = 0;
  const ang: number[] = [];
  for (let i = 0; i < S.length; i++) {
    const f = S[i].p; ang.push(acc);
    if (f > .0004) {
      sector(c, cam, R, r0 - TAU * acc, r0 - TAU * (acc + f), ri, ro, z);
      c.fillStyle = tono(S, i, s.of); c.fill();
      if (o.gan === i && (o.gk ?? 0) > 0) { c.save(); c.globalAlpha *= o.gk!; c.fillStyle = ACENTO; c.fill(); c.restore(); }
      if (o.roz === i && (o.rozK ?? 0) > 0) { c.save(); c.globalAlpha *= o.rozK!; c.fillStyle = "#6E6C66"; c.fill(); c.restore(); }
    }
    acc += f;
  }
  // Separadores: tiras de metal con su filo de luz.
  c.lineCap = "butt";
  for (let i = 0; i < S.length; i++) {
    if (S.length > 1 && S[i].p > .0004) {
      const a = r0 - TAU * ang[i], P = pr(cam, R, ri, a, z), Q = pr(cam, R, ro, a, z);
      c.strokeStyle = "#050505"; c.lineWidth = Math.max(1.5, R * cam.p(0, 0, 0)!.s * .009); linea(c, P.x, P.y, Q.x, Q.y);
      c.strokeStyle = "rgba(234,230,220,.5)"; c.lineWidth = Math.max(.8, R * cam.p(0, 0, 0)!.s * .003); linea(c, P.x, P.y - 1, Q.x, Q.y - 1);
    }
  }
  // Palabras.
  if (etiq > .01) for (let i = 0; i < S.length; i++) {
    const f = S[i].p; if (f < .012 || !S[i].w || o.sin === i) continue;
    const a = r0 - TAU * (ang[i] + f / 2), col = tono(S, i, s.of), n = S[i].w.length;
    const lit = o.gan === i ? (o.gk ?? 0) : 0, tx = oscuro(col) || lit > .5 ? LUZ : TINTA;
    const arco = TAU * f * .5 * R, grande = f >= .13;
    const tam = grande ? Math.min(.31 * R, arco * 1.3 / Math.max(n * .46, 1)) : Math.min(.15 * R, arco * .86);
    letraDisco(c, cam, R, a, grande ? .48 : .5, S[i].w, tam, tx, !grande, etiq);
  }
  conoPerilla(c, cam, R, r0);
}
/** Cono y perilla central: la rueda se mueve por perillas, como todo en esta serie. */
function conoPerilla(c: Ctx, cam: Cam, R: number, r0: number) {
  discoZ(c, cam, R, .23, .04, "#0D0D0C");
  const C = pr(cam, R, 0, 0, .06), Gc = c.createRadialGradient(C.x - R * C.s * .05, C.y - R * C.s * .07, 1, C.x, C.y, R * C.s * .21);
  Gc.addColorStop(0, "#B9B6AC"); Gc.addColorStop(.6, "#5A5853"); Gc.addColorStop(1, "#1A1A19");
  discoZ(c, cam, R, .214, .06, Gc);
  perillaMetal(c, C.x, C.y, R * C.s * .13, r0, Math.sin(Math.min(cam.v.pitch, 1.5)), R * C.s * .03);
}

// ---------- la cinta ----------
type Pal = { s: string; t: number; x: number; w: number };
function mideTira(g: CanvasRenderingContext2D, L: [string, number][], fu: string, x0 = 0, sep = .27) {
  g.font = fu; let x = x0; const hueco = parseFloat(fu.match(/(\d+)px/)![1]) * sep;
  return L.map(([s, t]) => { const w = g.measureText(s).width, p = { s, t, x, w }; x += w + hueco; return p; });
}
function scrollDe(P: Pal[], t: number, xFin: number) {
  let sc = 0;
  for (const p of P) { if (t < p.t) break; sc = lerp(sc, Math.max(0, p.x + p.w - xFin), ease.outCubic(prog(t, p.t, p.t + .28))); }
  return sc;
}
/** Tira de papel de teletipo: perforada, con filo a mano. Las perforaciones avanzan con el scroll. */
function tiraPapel(c: Ctx, y: number, alto: number, sc: number, t: number, xa = -40, xb = 1120, tinta = "#111111") {
  const top = y - alto / 2, bot = y + alto / 2;
  const g = c.createLinearGradient(0, bot, 0, bot + 30); g.addColorStop(0, "rgba(20,18,14,.26)"); g.addColorStop(1, "rgba(20,18,14,0)");
  c.fillStyle = g; c.fillRect(xa, bot, xb - xa, 30);
  c.fillStyle = "#FCFBF7"; c.fillRect(xa, top, xb - xa, alto);
  const paso = 58, f = ((-sc % paso) + paso) % paso; c.fillStyle = "#DCD8CD";
  for (let x = xa - paso + f; x < xb; x += paso) { if (x < xa) continue; circulo(c, x, top + 15, 6.2); circulo(c, x, bot - 15, 6.2); }
  const j = azar(Math.floor(t * 10) * 7 + 3); c.strokeStyle = tinta; c.lineWidth = 3.4; c.lineCap = "round";
  c.beginPath(); c.moveTo(xa, top + j()); for (let x = xa; x <= xb; x += 96) c.lineTo(x, top + (j() - .5) * 2.6); c.stroke();
  c.beginPath(); c.moveTo(xa, bot + j()); for (let x = xa; x <= xb; x += 96) c.lineTo(x, bot + (j() - .5) * 2.6); c.stroke();
}
function palabrasTira(c: Ctx, P: Pal[], t: number, y: number, x0: number, sc: number, px: number, o: { it?: boolean; acento?: number; mono?: boolean } = {}) {
  const ult = o.acento ?? .55;
  for (const p of P) {
    const e = t - p.t; if (e < 0) continue;
    const x = x0 + p.x - sc; if (x > 1200 || x + p.w < -60) continue;
    const q = 1 + .16 * Math.exp(-e * 15) * Math.cos(e * 30), a = smooth(e / .05), rojo = 1 - smooth(prog(e, ult, ult + .3));
    c.save(); c.translate(x + p.w / 2, y); c.scale(q, q);
    texto(c, p.s, 0, 0, { fuente: o.mono ? mono(px) : serif(px, o.it), color: TINTA, alfa: a * (1 - rojo) });
    if (rojo > 0) texto(c, p.s, 0, 0, { fuente: o.mono ? mono(px) : serif(px, o.it), color: ACENTO, alfa: a * rojo });
    c.restore();
  }
}

// ---------- fondo ----------
type Fl = { s: string; x: number; y: number; px: number; v: number; f: number };
function fondo(c: Ctx, t: number, d: D) {
  c.fillStyle = "#E4E0D5";
  for (const f of d.flota) {
    const x = ((f.x + t * f.v * 18) % 1320 + 1320) % 1320 - 120, y = f.y + Math.sin(t * .23 * f.v + f.f) * 30;
    circulo(c, x, y, 2 + f.px * .02);
  }
}
function deriva(c: Ctx, t: number) {
  const z = 1.012 + .01 * vaiven(t, 7.3);
  c.translate(540, 960); c.rotate(.0038 * vaiven(t, 9.1, .6)); c.scale(z, z); c.translate(-540 + 6 * vaiven(t, 5.3), -960 + 8 * vaiven(t, 4.1, 1));
}

// ---------- datos caros ----------
type Hoja = { s: string; x: number; y: number; w: number; fu: string; col: string; t: number; h: number };
type D = {
  flota: Fl[]; prosa: Pal[]; cielo: Pal[]; neg: Pal[]; une: Pal[]; fin: Pal[]; finX: number; finPunto: number;
  mano: Hoja[]; part: { a: number; r: number; v: number; l: number; b: number; f: number }[]; mask: Uint8Array; MW: number; MH: number;
  neuro: [number, number, number, number, number, number][]; nod: [number, number][]; meds: { azul: number; es: number };
};
const PROSA = "Había una vez un rey que no dormía def suma ( a , b ) : return a + b querida Ana perdóname por lo de ayer la luna cae sobre el agua y el agua no se queja si tienes fiebre bebe mucha agua Roma cayó porque".split(" ");
const CM = 26, MCOL = Math.ceil(1200 / CM), MFIL = Math.ceil(1000 / CM);

function preparar(): D {
  const cv = document.createElement("canvas"); cv.width = 1080; cv.height = 720;
  const g = cv.getContext("2d", { willReadFrequently: true })!;
  const ra = azar(11), flota: Fl[] = [];
  const FL = ["azul", "gris", "palabra", "siguiente", "quizá", "luego", "casi", "mar", "tal vez", "hermoso", "cielo", "y", "pero", "cuando"];
  for (let i = 0; i < 11; i++) flota.push({ s: FL[i % FL.length], x: ra() * 1320, y: 90 + i * 172 + ra() * 40, px: 62 + ra() * 54, v: .5 + ra() * .7, f: ra() * 6 });
  const P124 = serif(124);
  const prosa = mideTira(g, PROSA.slice(0, K.ap.length).map((s, i) => [s, K.ap[i]]), serif(112));
  const [p0, p1, p2, p3] = K.pxf;
  const cielo = mideTira(g, [["el", K.el], ["cielo", K.cie], ["es", K.es], ["azul", K.t1f + .34], ["porque", p0 + .3], ["la", p1 + .3], ["luz", p2 + .3], ["del", p3 + .3]], P124);
  const neg = mideTira(g, [["azul", -9], ["porque", -9], ["la", -9], ["luz", -9], ["del", -9], ["sol", K.sin + .12], ["se", K.sin + .5], ["dispersa", K.sin + .78], ["en", K.sin + 1.26]], serif(132));
  const une = mideTira(g, [["una", K.une[0] + .22], ["palabra", K.une[1] + .22], ["a", K.une[2] + .22], ["la", K.une[3] + .22], ["vez", K.une[4] + .22]], P124);
  const fin = mideTira(g, [["la", K.la], ["más", K.la + .2], ["creíble", K.cre + .24]], serif(150));
  const ul = fin[2], fa = ul.x + ul.w + 34, finX = 540 - fa / 2;
  // Las tres cosas que escribió: cada palabra guarda dónde cae, porque luego se le va la tinta.
  const mano: Hoja[] = [];
  const pon = (L: string[], x: number, y: number, fu: string, col: string, ti: number, dt: number, h: number) => {
    g.font = fu; let xx = x;
    L.forEach((s, i) => { const w = g.measureText(s).width; mano.push({ s, x: xx, y, w, fu, col, t: ti + i * dt, h }); xx += w + h * .28; });
  };
  pon(["La", "luna", "cae"], 150, 300, serif(112, true), TINTA, K.poema + .04, .12, 112);
  pon(["sobre", "el", "agua."], 214, 420, serif(112, true), TINTA, K.poema + .4, .12, 112);
  pon(["def", "suma(a,", "b):"], 214, 760, mono(74), LUZ, K.prog + .04, .1, 74);
  pon(["return", "a", "+", "b"], 300, 868, mono(74), LUZ, K.prog + .34, .08, 74);
  pon(["Primero", "escucha."], 170, 1240, serif(116), TINTA, K.consejo + .05, .16, 116);
  pon(["Luego", "contesta."], 170, 1366, serif(116), TINTA, K.consejo + .45, .16, 116);
  const r = azar(5), part: D["part"] = [];
  for (let i = 0; i < 1500; i++) part.push({ a: r() * TAU, r: r(), v: .34 + r() * .5, l: 16 + r() * 40, b: Math.floor(r() * 3), f: r() });
  // LLM: cada celda de la malla sabe a qué letra pertenece.
  const MW = MCOL * 2, MH = MFIL, mask = new Uint8Array(MW * MH);
  const c2 = document.createElement("canvas"); c2.width = 1200; c2.height = 1000;
  const h = c2.getContext("2d", { willReadFrequently: true })!;
  h.font = serif(640); const wL = h.measureText("L").width, wT = h.measureText("LLM").width, x0 = 600 - wT / 2;
  h.textBaseline = "alphabetic"; h.textAlign = "left"; h.fillStyle = "#000"; h.strokeStyle = "#000"; h.lineWidth = 16; h.lineJoin = "round"; h.fillText("LLM", x0, 722); h.strokeText("LLM", x0, 722);
  const px = h.getImageData(0, 0, 1200, 1000).data;
  for (let j = 0; j < MFIL; j++) for (let i = 0; i < MCOL; i++) {
    const x = Math.round(i * CM + CM / 2), y = Math.round(j * CM + CM / 2);
    if (px[(y * 1200 + x) * 4 + 3] > 110) mask[j * MW + i] = x < x0 + wL ? 1 : x < x0 + 2 * wL ? 2 : 3;
  }
  // La red de la culpa.
  const nod: [number, number][] = [[540, 1790], [290, 1960], [540, 1960], [790, 1960], [240, 2140], [540, 2140], [840, 2140]];
  const ar: [number, number, number][] = [[0, 1, .75], [0, 2, .4], [0, 3, 1], [1, 4, .35], [1, 5, .6], [2, 4, .3], [2, 5, .45], [2, 6, .3], [3, 5, .5], [3, 6, 1]];
  const neuro = ar.map(([a, b, w], i): [number, number, number, number, number, number] => [nod[a][0], nod[a][1], nod[b][0], nod[b][1], w, a === 0 ? 0 : 1 + (i % 2) * .1]);
  g.font = P124;
  const azul = g.measureText("el cielo es ").width, es = cielo[2].x + cielo[2].w;
  return { flota, prosa, cielo, neg, une, fin, finX, finPunto: fa, mano, part, mask, MW, MH, neuro, nod, meds: { azul, es } };
}

// ---------- 0. la rueda ya está escribiendo ----------
const XI = 128, YC = 262, CAE0 = .36;
function apertura(c: Ctx, t: number, d: D) {
  fondo(c, t, d);
  const hunde = ease.inCubic(prog(t, K.fpal + .22, K.esc + .1));
  const dist = lerp(8.2, 10.4, ease.outCubic(prog(t, 0, K.truco + .4)));
  const v: Vista = { tx: 0, ty: 0, tz: 0, yaw: .05 * vaiven(t, 6.1), pitch: .94 + .02 * vaiven(t, 4.3), dist };
  const cam = camara(v, 540, lerp(1270, 1140, ease.outCubic(prog(t, 0, K.truco + .3))) + hunde * 1300 + golpe(t, K.truco, 10, 40, 8) + golpe(t, CAE0, 16, 44, 9));
  const s = secs(t), cae = t < CAE0;
  const B = bolaR(t);
  rueda(c, cam, s, rot(t), { gan: TIR[TIR.findIndex((x) => x[1] > t)]?.[3], gk: 0 });
  if (!cae) bolaEnRueda(c, cam, RM, B);
  // La cinta escupe de todo, demasiado rápido para leerla, y frena en seco en «truco».
  const ult = K.ap[K.ap.length - 1];
  const sc = scrollDe(d.prosa, t, 860) + ease.inCubic(prog(t, K.fpal + .1, K.esc + .14)) * 2400;
  tiraPapel(c, YC + golpe(t, K.truco, 7, 46, 8), 176, sc, t);
  palabrasTira(c, d.prosa, t, YC + 40, 0, sc, 112, { acento: t > ult ? 9 : .12 });
  // Cuadro 0: la bola viene encima del espectador y cae en la rueda.
  if (cae) {
    const u = t / CAE0, q = u * u, b = bolaR(CAE0), P = pr(cam, RM, b.r, b.a, zSup(b.r) + RB), rp = RB * RM * P.s;
    sombra(c, P.x, P.y + rp * .7, lerp(150, rp * 1.8, q), lerp(.22, .55, q));
    rimBola(c, lerp(540, P.x, q), lerp(500, P.y, q), lerp(268, rp, q));
  }
  rotulo(c, t, K.chat, K.truco - .22, "ChatGPT", 590, 196);
  const q = pop(t, K.truco - .06, .3, 2.6), sa = 1 - smooth(prog(t, K.adiv - .2, K.adiv));
  if (q > 0 && sa > 0) { c.save(); c.translate(540, 590); c.scale(q, q); texto(c, "un solo truco", 0, 0, { fuente: serif(172, true), color: ACENTO, alfa: sa }); c.restore(); }
  rotulo(c, t, K.adiv, K.fpal + .34, "adivinar", 486, 150);
  rotulo(c, t, K.sig - .04, K.fpal + .34, "la siguiente palabra", 636, 124, ACENTO, true);
}

// ---------- 1. escribes; la lista; la barra que se enrosca ----------
const X0 = 128, LB = 824, FIL = [604, 894, 1184], YF = 84, PL = [.7, .1, .05], YB = 1010;
const CAJ = { x: 72, y: 408, w: 936, h: 1122 };
const lateF = K.arma + .46, curF = K.elige - .08;
const ini_i = [K.azul, K.gris, K.herm];
const salta = (i: number) => ini_i[i] - .38;

function camCen(cy = YB) { return camara({ tx: 0, ty: 0, tz: 0, yaw: 0, pitch: 1.55, dist: 12.5 }, 540, cy); }
function vistaMesa(t: number) {
  const inc = ease.inOutCubic(prog(t, K.arma + .78, K.elige + .44));
  const dist = lerp(12.5, 10.5, inc), pitch = lerp(1.55, .96, inc), cy = lerp(YB, 1150, inc);
  return { cam: camara({ tx: 0, ty: 0, tz: 0, yaw: .03 * vaiven(t, 6.7), pitch, dist }, 540, cy), inc };
}

/** Punto de la barra: s a lo largo, h a lo ancho. Con k=1 es exactamente el anillo de la rueda. */
function ptoBarra(cam: Cam, s: number, h: number, k: number) {
  const LF = TAU * .48 * RM, GF = .52 * RM, LL = lerp(LB / 100, LF, k), G = lerp(.64, GF, k), Th = k * TAU;
  let x: number, y: number;
  if (Th < .002) { x = (s - .5) * LL; y = h * G / 2; }
  else { const Rr = LL / Th, a = (s - .5) * Th, rr = Rr + h * G / 2; x = rr * Math.sin(a); y = rr * Math.cos(a) - Rr * (1 - smooth(k)); }
  return cam.p(x, y, .04 * RM)!;
}
function barraAnillo(c: Ctx, cam: Cam, S: Sec[], k: number) {
  let acc = 0;
  S.forEach((sec, i) => {
    const a0 = acc, a1 = acc + sec.p, n = Math.max(2, Math.ceil(sec.p * 60)); acc = a1;
    c.beginPath();
    for (let q = 0; q <= n; q++) { const p = ptoBarra(cam, lerp(a0, a1, q / n), 1, k); if (q) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); }
    for (let q = n; q >= 0; q--) { const p = ptoBarra(cam, lerp(a0, a1, q / n), -1, k); c.lineTo(p.x, p.y); }
    c.closePath(); c.fillStyle = tono(S, i); c.fill();
    c.strokeStyle = "#0B0B0A"; c.lineWidth = 2.4; c.stroke();
  });
}

const FTEC = ["qwertyuiop", "asdfghjklñ", "zxcvbnm"];
const PULSA: [string, number][] = [["e", K.el], ["l", K.el + .14], ["c", K.cie - .06], ["i", K.cie + .02], ["e", K.cie + .08], ["l", K.cie + .14], ["o", K.cie + .2], ["e", K.es - .08], ["s", K.es + .1]];
function maquinaEscribir(c: Ctx, t: number) {
  const q = Math.min(resorte(t - (K.esc - .06), 1.5, .6), 1.03) * (1 - ease.inCubic(prog(t, K.pts + .1, K.dentro + .12)));
  if (q <= .002) return;
  const sb = (1 - q) * 900, r = 41, paso = 96;
  c.save(); c.translate(0, sb);
  FTEC.forEach((f, j) => {
    for (let i = 0; i < f.length; i++) {
      const x = 540 + (i - (f.length - 1) / 2) * paso + (j === 2 ? 0 : 0), y = 980 + j * 132;
      let h = 0; for (const [l, ti] of PULSA) if (l === f[i] && t > ti) h = Math.max(h, Math.exp(-(t - ti) * 13));
      const G = c.createRadialGradient(x + 6, y + 12, r * .6, x + 6, y + 12, r * 1.5); G.addColorStop(0, "rgba(20,18,14,.36)"); G.addColorStop(1, "rgba(20,18,14,0)");
      c.fillStyle = G; c.beginPath(); c.arc(x + 6, y + 12, r * 1.5, 0, TAU); c.fill();
      c.strokeStyle = "#8C8A83"; c.lineWidth = 6; c.beginPath(); c.moveTo(x, y + 8); c.lineTo(x, y + 58); c.stroke();
      const yk = y + h * 22;
      c.fillStyle = "#BDB9AE"; circulo(c, x, yk, r + 4); bola(c, x, yk, r * (1 - h * .08));
      texto(c, f[i], x, yk + 17, { fuente: serif(54), color: h > .3 ? "#E9896C" : LUZ });
    }
  });
  c.restore();
}

function lista(c: Ctx, t: number, d: D) {
  fondo(c, t, d);
  const zL = tramos(t, 1, [[K.azul - .34, K.azul + .16, 1.075, ease.outCubic], [K.arma - .3, K.arma + .06, 1, ease.inOutCubic]]);
  const yF = tramos(t, FIL[0], [[K.gris - .44, K.gris - .06, FIL[1], ease.outExpo], [K.herm - .44, K.herm - .06, FIL[2], ease.outExpo]]);
  const sac = ini_i.reduce((a, b) => a + golpe(t, b, 11, 46, 9), 0);
  c.save(); c.translate(540, yF); c.scale(zL, zL); c.translate(-540, -yF + sac + (zL - 1) / .075 * (884 - yF) * .12);
  const tira = d.cielo.slice(0, 3);
  maquinaEscribir(c, t);
  // Salen los tres puntos: son bolas.
  const sc = 0, yBase = YC + 40;
  const ab = clamp(resorte(t - (K.dentro - .06), 1.5, .62)), cierra = smooth(prog(t, K.arma - .02, K.arma + .3));
  const k0 = ease.inOutCubic(prog(t, K.arma + .02, lateF)), k1 = ease.inOutCubic(prog(t, lateF - .06, curF - .02));
  if (ab > .004 && cierra < 1) {
    const h = CAJ.h * ab;
    c.save(); c.globalAlpha = 1 - cierra;
    c.fillStyle = "#E9E5DA"; c.fillRect(CAJ.x, CAJ.y, CAJ.w, h);
    const g = c.createLinearGradient(0, CAJ.y, 0, CAJ.y + 70); g.addColorStop(0, "rgba(20,18,14,.34)"); g.addColorStop(1, "rgba(20,18,14,0)");
    c.fillStyle = g; c.fillRect(CAJ.x, CAJ.y, CAJ.w, Math.min(70, h));
    c.strokeStyle = TINTA; c.lineWidth = 4; c.strokeRect(CAJ.x, CAJ.y, CAJ.w, h);
    c.save(); c.beginPath(); c.rect(CAJ.x, CAJ.y, CAJ.w, h); c.clip();
    for (let i = 0; i < 3; i++) {
      const ry = FIL[i] + YF + (8 * vaiven(t, 3.7, i) * 0);
      c.fillStyle = "#BDB8AB"; c.beginPath(); c.roundRect(X0, ry - 32, LB, 64, 32); c.fill();
      c.strokeStyle = "rgba(20,18,14,.3)"; c.lineWidth = 3; c.beginPath(); c.moveTo(X0 + 30, ry - 30); c.lineTo(X0 + LB - 30, ry - 30); c.stroke();
    }
    c.restore(); c.restore();
  }
  // Filas: palabra, número y barra que empuja su bola.
  const ND = ["azul", "gris", "hermoso"], NUM = [70, 10, 5], TN = [K.seten, K.diez, K.cinco];
  const sal = 1 - smooth(prog(t, K.arma, K.arma + .22));
  const finB: [number, number][] = [];
  for (let i = 0; i < 3; i++) {
    const ti = ini_i[i], fin = ti + (i === 0 ? .78 : i === 1 ? .46 : .4), u = 1 - (1 - prog(t, ti, fin)) ** 3, rebote = golpe(t, fin, 4, 30, 10);
    const ry = lerp(FIL[i] + YF, YB, k0);
    const des = PL.slice(0, i).reduce((a, b) => a + b, 0);
    const xb = lerp(X0, X0 + des * LB, k0), w = PL[i] * LB * u;
    if (t > ti - .02 && k1 <= 0) {
      c.fillStyle = tono(DISCOS.cielo, i); c.beginPath(); c.rect(xb, ry - 32, Math.max(w, 1) + rebote * 0, 64); c.fill();
      c.strokeStyle = "#0B0B0A"; c.lineWidth = 2.4; c.stroke();
    }
    const a = pop(t, ti - .06, .22, 2.2);
    if (a > 0 && sal > 0) {
      c.save(); c.translate(X0, FIL[i]); c.scale(a, a);
      texto(c, ND[i], 0, 0, { fuente: serif(138), color: TINTA, alin: "left", alfa: sal }); c.restore();
      const n = Math.round(NUM[i] * smooth(prog(t, ti + .02, TN[i])));
      const v = pop(t, TN[i] - .1, .2, 2.4);
      texto(c, `${n}%`, X0 + LB, FIL[i], { fuente: mono(104), color: t > TN[i] - .1 ? ACENTO : GRIS, alin: "right", alfa: sal * (t > ti + .1 ? 1 : 0) * Math.max(v, .4) });
    }
    finB.push([xb + w + 4 + rebote, ry - 4]);
  }
  texto(c, "porcentajes de ejemplo", 540, 1468, { fuente: serif(66, true), color: "#6E6C66", alfa: smooth(prog(t, K.seten + .3, K.seten + .7)) * sal });
  // El resto de la lista y el cierre del anillo.
  const { cam, inc } = vistaMesa(t);
  if (k0 > 0) {
    const yp = YB;
    if (k1 <= 0) {
      const S = DISCOS.cielo; let acc = .85;
      for (let i = 3; i < S.length; i++) {
        const xa = X0 + acc * LB, w = S[i].p * LB * k0; acc += S[i].p;
        c.fillStyle = tono(S, i); c.fillRect(xa, yp - 32, w, 64);
      }
    } else {
      const aroK = smooth(prog(k1, .4, .92));
      if (aroK > 0) { cuenco(c, cam, RM, aroK); c.save(); c.globalAlpha = aroK; discoZ(c, cam, RM, .76, .035, "#CFCBBF"); conoPerilla(c, cam, RM, -Math.PI / 2); c.restore(); }
      barraAnillo(c, cam, DISCOS.cielo, k1);
      const q = smooth(prog(k1, .93, 1));
      if (q > 0) rueda(c, cam, { S: DISCOS.cielo, of: 0 }, -Math.PI / 2, { bowl: 0, etiq: q });
      void inc;
    }
  }
  // Las tres bolas: salen de los puntos, ruedan su barra, se juntan en una.
  const yR = (i: number) => lerp(FIL[i] + YF, YB, k0);
  const xe = XI + (tira[2].x + tira[2].w) + 24;
  const P1 = ptoBarra(cam, 1, 0, 0), pPunta = (u: number) => ptoBarra(cam, 1, .42, u);
  for (let i = 2; i >= 0; i--) {
    const ti = salta(i), x0 = xe + i * 40, ya = yBase - 13, r = 32;
    if (t < ti) continue;
    if (t < ini_i[i]) {
      const u = prog(t, ti, ini_i[i]);
      bola(c, lerp(x0, X0 + r, u), lerp(ya, yR(i) - 1, u * u) - 150 * Math.sin(u * Math.PI) * (1 - u), lerp(13, r, u));
    } else {
      const e = finB[i];
      let x = Math.max(e[0], X0 + r), y = e[1] + 4 - Math.abs(golpe(t, ini_i[i], 22, 16, 7));
      x = lerp(x, P1.x, k0); y = lerp(y, P1.y, k0);
      if (k1 > 0) { if (i) continue; const P = pPunta(k1); x = P.x; y = P.y; }
      rimBola(c, x, y, k1 > 0 ? lerp(r, RB * RM * 100, k1) : r, .6);
    }
  }
  // La cinta va encima: la lista sale de debajo de ella. Los tres puntos son las bolas antes de saltar.
  tiraPapel(c, YC, 176, sc, t);
  const cada = (p: Pal, a: number, b: number) => {
    c.save(); c.beginPath(); c.rect(0, 0, XI + p.x + (p.w + 6) * prog(t, a, b), 1920); c.clip();
    texto(c, p.s, XI + p.x, yBase, { fuente: serif(124), color: TINTA, alin: "left" }); c.restore();
  };
  cada(tira[0], K.el, K.el + .14); cada(tira[1], K.cie - .06, K.cie + .2); cada(tira[2], K.es - .08, K.es + .1);
  const cx = XI + (t < K.el ? -8 : t < K.es + .1 ? (t < K.cie ? tira[0].x + tira[0].w * prog(t, K.el, K.el + .14) : t < K.es ? tira[1].x + tira[1].w * prog(t, K.cie - .06, K.cie + .2) : tira[2].x + tira[2].w) : tira[2].x + tira[2].w + 8);
  if (t < K.pts && (t < K.el + .3 ? (t * 2.5) % 1 < .6 : true)) { c.fillStyle = ACENTO; c.fillRect(cx + 4, yBase - 96, 7, 112); }
  for (let i = 0; i < 3; i++) {
    const a = K.pts + i * .17;
    if (t < a || t >= salta(i)) continue;
    bola(c, XI + tira[2].x + tira[2].w + 24 + i * 40, yBase - 13, 13 * pop(t, a, .16, 2.4));
  }
  c.restore();
}

// ---------- 2. la rueda escribe ----------
function vuela(c: Ctx, cam: Cam, p: Pal, t: number, dest: { x: number; y: number }, px = 124, dur = .32, ang = FRENTE) {
  const a = p.t - dur, u = prog(t, a, p.t);
  if (t < a || t >= p.t) return;
  const F = pr(cam, RM, .5, ang, .08), e = ease.inOutCubic(u);
  const x = lerp(F.x, dest.x, e), y = lerp(F.y, dest.y, e ** 1.6) - 90 * Math.sin(u * Math.PI), q = lerp(1.5, 1, e);
  c.save(); c.translate(x, y); c.scale(q, q); c.rotate(-.12 * Math.sin(u * Math.PI));
  const k = smooth(prog(u, .1, .5));
  texto(c, p.s, 0, 20, { fuente: serif(px), color: LUZ, alfa: 1 - k });
  texto(c, p.s, 0, 20, { fuente: serif(px), color: ACENTO, alfa: k }); c.restore();
}

function mesa(c: Ctx, t: number, d: D) {
  fondo(c, t, d);
  const { cam } = vistaMesa(t);
  const s = secs(t), hit = K.t1f;
  const b = bolaR(t);
  const shk = golpe(t, hit, 8, 42, 8);
  c.save(); c.translate(0, shk);
  const gk = t < K.vacia ? smooth(prog(t, hit - .02, hit + .04)) : 0;
  const pxN = [K.pxf[0], K.pxf[1], K.pxf[2], K.pxf[3]];
  let g = -1, gq = 0;
  pxN.forEach((f, i) => { if (t >= f) { g = s.of; gq = (1 - smooth(prog(t, f + .16, f + .3))); if (i === 3) gq = 1; } });
  const fue = t >= hit && t < K.vacia ? 0 : g >= 0 ? g : -1;
  rueda(c, cam, s, rot(t), g >= 0 ? { gan: g, gk: gq, sin: fue } : { gan: 0, gk, sin: fue });
  bolaEnRueda(c, cam, RM, b);
  c.restore();
  const sc = scrollDe(d.cielo, t, 930);
  tiraPapel(c, YC, 176, sc, t);
  const yb = YC + 40;
  palabrasTira(c, d.cielo, t, yb, XI, sc, 124);
  const xe = XI + d.cielo[2].x + d.cielo[2].w + 22 - sc;
  // Lo que queda de los puntos: nada. Ya son la bola.
  void xe;
  for (let i = 3; i < d.cielo.length; i++) { const p = d.cielo[i]; vuela(c, cam, p, t, { x: XI + p.x + p.w / 2 - sc, y: yb - 30 }); }
  // Lee TODO lo anterior antes de cada palabra: un trazo barre la cinta y baja a la rueda.
  const A = K.re, Z = K.azul2 + .28;
  if (t > A - .04 && t < Z + .72) {
    const P = d.cielo.slice(0, 4), xa = XI + P[0].x - sc, xb = XI + P[3].x + P[3].w - sc, u = ease.inOutSine(prog(t, A, Z)), sale = smooth(prog(t, Z + .28, Z + .6));
    c.save(); c.globalAlpha = 1 - sale; c.strokeStyle = ACENTO; c.lineWidth = 9; c.lineCap = "round"; linea(c, xa, yb + 24, lerp(xa, xb, u), yb + 24); c.restore();
    if (t > Z - .05) {
      const q = ease.inCubic(prog(t, Z - .05, Z + .34)), x = xb, y = lerp(yb + 24, 830, q);
      if (q < 1) { c.fillStyle = ACENTO; circulo(c, lerp(x, 540, q), y, 17); for (let i = 1; i < 6; i++) { c.globalAlpha = .5 - i * .08; circulo(c, lerp(x, 540, q * (1 - i * .03)), y - i * 34 * q, 15 - i * 2); } c.globalAlpha = 1; }
    }
  }
}

// ---------- 3. el negro: la cinta nace bajo la bola ----------
function negro(c: Ctx, t: number, d: D) {
  const P = d.neg, Y = 980, H = 190;
  const bor = (tt: number) => {
    let x = P[4].x + P[4].w + 8;
    for (let i = 5; i < P.length; i++) x = lerp(x, P[i].x + P[i].w + 8, ease.inOutSine(prog(tt, P[i].t - .22, P[i].t + .16)));
    return x;
  };
  const X = bor(t), scn = X - 730 + bor(K.fin_fr) * 0;
  // Polvo: lo único que hay enfrente.
  const r = azar(23);
  for (let i = 0; i < 70; i++) {
    const x0 = r() * 1300 - 110, y0 = r() * 1920, v = .4 + r() * .9, f = r() * 6.28, rr = 1.6 + r() * 2.4;
    const x = ((x0 - scn * .3 * v + Math.sin(t * .4 * v + f) * 60) % 1300 + 1300) % 1300 - 110, y = y0 + Math.cos(t * .33 * v + f) * 50;
    c.fillStyle = `rgba(237,234,227,${.13 + .13 * Math.sin(t * v + f)})`; circulo(c, x, y, rr);
  }
  const xb = X - scn;
  // Halo: de aquí sale toda la luz.
  const hl = c.createRadialGradient(xb, Y - 60, 30, xb, Y - 60, 820);
  hl.addColorStop(0, "rgba(244,226,196,.22)"); hl.addColorStop(.5, "rgba(244,226,196,.06)"); hl.addColorStop(1, "rgba(244,226,196,0)");
  c.fillStyle = hl; c.fillRect(0, 0, 1080, 1920);
  tiraPapel(c, Y, H, scn, t, -40, xb, "#3a3936");
  c.save(); c.beginPath(); c.rect(-40, 0, xb + 40, 1920); c.clip();
  for (const p of P) {
    const x = p.x - scn; if (x > 1100 || x + p.w < -20 || t < p.t - .1) continue;
    const nueva = p.t > 0, rojo = nueva ? 1 - smooth(prog(t, p.t + .3, p.t + .8)) : 0;
    texto(c, p.s, x, Y + 46, { fuente: serif(132), color: TINTA, alin: "left" });
    if (rojo > 0) texto(c, p.s, x, Y + 46, { fuente: serif(132), color: ACENTO, alin: "left", alfa: rojo });
  }
  c.restore();
  const hg = c.createLinearGradient(0, 0, 640, 0); hg.addColorStop(0, "rgba(9,9,10,.86)"); hg.addColorStop(1, "rgba(9,9,10,0)");
  c.fillStyle = hg; c.fillRect(0, Y - H / 2 - 2, 640, H + 34);
  // El filo: la cinta acaba aquí.
  c.strokeStyle = "#BDBAB1"; c.lineWidth = 2; const j = azar(Math.floor(t * 12));
  c.beginPath(); for (let y = Y - H / 2; y <= Y + H / 2; y += 22) { const qx = xb + (j() - .5) * 5; if (y === Y - H / 2) c.moveTo(qx, y); else c.lineTo(qx, y); } c.stroke();
  // La bola se asoma y se va.
  const R = 50, top = Y - H / 2, u = t - K.caeB;
  const tam = t > K.fin_fr ? 6 * Math.sin((t - K.fin_fr) * 7.3) * smooth(prog(t, K.fin_fr, K.fin_fr + .3)) : 0;
  let bx = xb - 10 + tam, by = top - R;
  if (u > 0) { bx += 130 * u + 90 * u * u; by += .5 * 7600 * u * u; }
  rimBola(c, bx, by, R);
}

// ---------- 4. tu teléfono ----------
const F = { x: 118, y: 250, w: 844, h: 1680 };
const SUG = ["azul", "gris", "hermoso"];
function teclas() {
  const O: [number, number, number][] = [], fil = [10, 9, 7], ks = 76;
  fil.forEach((n, j) => { for (let i = 0; i < n; i++) O.push([F.x + F.w / 2 + (i - (n - 1) / 2) * ks, 1152 + j * 130, j]); });
  return O;
}
const TEC = teclas(), BOTA: [number, number, string][] = [[K.tel + .3, 12, "el"], [K.tel + .78, 19, "cielo"], [K.tel + 1.24, 3, "es"]];
function bolaTel(t: number) {
  // Cae del negro y rebota de tecla en tecla; cada rebote escribe. Al final salta a una sugerencia.
  const ii = K.tel - .18;
  const pts: [number, number, number][] = [[ii, 540, -120], ...BOTA.map(([a, i]): [number, number, number] => [a, TEC[i][0], TEC[i][1] - 30]), [K.fsug - .18, 356, 1004]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, x, y] = pts[i], [b, x2, y2] = pts[i + 1];
    if (t >= a && t < b) {
      const u = prog(t, a, b), h = i === 0 ? 0 : 340 - i * 40;
      const yy = i === 0 ? lerp(y, y2, u * u) : lerp(y, y2, u) - h * 4 * u * (1 - u);
      return { x: lerp(x, x2, u), y: yy };
    }
  }
  return { x: 356, y: 1004 };
}
function telefono(c: Ctx, t: number, d: D) {
  const sub = 1 - Math.min(resorte(t - (K.tel - .22), 1.6, .55), 1.03);
  c.translate(0, sub * 1500);
  c.fillStyle = "#0D0D0C"; c.beginPath(); c.roundRect(F.x, F.y, F.w, F.h, 96); c.fill();
  c.strokeStyle = "#3a3936"; c.lineWidth = 3; c.beginPath(); c.roundRect(F.x + 9, F.y + 9, F.w - 18, F.h - 18, 88); c.stroke();
  c.fillStyle = "#FBFAF6"; c.beginPath(); c.roundRect(F.x + 22, F.y + 22, F.w - 44, F.h - 44, 76); c.fill();
  c.fillStyle = "#0D0D0C"; c.beginPath(); c.roundRect(540 - 96, F.y + 46, 192, 40, 20); c.fill();
  // Lo escrito.
  const xt = F.x + 72;
  let x = xt; const fu = serif(118);
  c.font = fu;
  const pa = BOTA.map(([a, , w]) => ({ s: w, t: a }));
  const azulT = K.fsug;
  for (const p of [...pa, { s: "azul", t: azulT }]) {
    const a = smooth(prog(t, p.t, p.t + .06)), w = c.measureText(p.s).width;
    if (a > 0) { const rojo = p.s === "azul"; texto(c, p.s, x, 590, { fuente: fu, color: rojo ? ACENTO : TINTA, alin: "left", alfa: a }); }
    x += w + 30;
  }
  // Barra de sugerencias.
  const yS = 870, cw = (F.w - 92) / 3, hS = 170;
  c.fillStyle = "#EDEAE1"; c.fillRect(F.x + 22, yS, F.w - 44, hS);
  SUG.forEach((s, i) => {
    const q = pop(t, K.sug + i * .09, .24, 2.4), xc = F.x + 46 + cw * (i + .5);
    if (i && q > 0) { c.strokeStyle = "#BDBAB1"; c.lineWidth = 3; linea(c, F.x + 46 + cw * i, yS + 32, F.x + 46 + cw * i, yS + hS - 32); }
    if (q <= 0) return;
    const lit = i === 0 ? smooth(prog(t, K.fsug - .02, K.fsug + .06)) : 0;
    if (lit > 0) { c.save(); c.globalAlpha = lit; c.fillStyle = ACENTO; c.beginPath(); c.roundRect(xc - cw / 2 + 8, yS + 16, cw - 16, hS - 32, 22); c.fill(); c.restore(); }
    c.save(); c.translate(xc, yS + hS / 2); c.scale(q, q);
    texto(c, s, 0, 32, { fuente: serif(92), color: lit > .5 ? LUZ : TINTA }); c.restore();
  });
  // Teclado.
  for (let i = 0; i < TEC.length; i++) {
    const [xk, yk] = TEC[i];
    const on = BOTA.find(([a, j]) => j === i && t >= a && t < a + .22);
    c.fillStyle = on ? TINTA : "#E2DED3"; c.beginPath(); c.roundRect(xk - 33, yk - 56, 66, 112, 14); c.fill();
    c.strokeStyle = "#BDBAB1"; c.lineWidth = 2; c.stroke();
  }
  void d;
  if (t > K.tel - .18) { const b = bolaTel(t); rimBola(c, b.x, b.y, 36); }
}

// ---------- 5. la escala ----------
function camEsc(t: number) {
  const a = ease.inOutCubic(prog(t, K.escala - .5, K.leyo + .6));
  const b = ease.inOutCubic(prog(t, K.igual - .1, K.tapa));
  const dist = lerp(lerp(70, 12.5, a), 17, b), pitch = lerp(1.55, .98, b), cy = lerp(YB, 860, b);
  return camara({ tx: 0, ty: 0, tz: 0, yaw: 0, pitch, dist }, 540, cy);
}
function escala(c: Ctx, t: number, d: D) {
  fondo(c, t, d);
  const a = ease.inOutCubic(prog(t, K.dif - .1, K.leyo + .1));
  const e = Math.exp(lerp(0, Math.log(.1), a)), hx = lerp(540, 224, a), hy = lerp(960, 1460, a);
  const cam = camEsc(t);
  const vor = smooth(prog(t, K.leyo - .3, K.leyo + 1.1)) * (1 - smooth(prog(t, K.intern - .3, K.intern + .32)));
  const tragado = smooth(prog(t, K.leyo, K.intern));
  const C = cam.p(0, 0, 0)!, rd = RM * C.s;
  // Mil cintas entran en remolino. Entran y se acaban: nada queda conectado a la rueda.
  if (vor > .01) {
    const B: Path2D[] = [new Path2D(), new Path2D(), new Path2D()];
    const n = Math.floor(d.part.length * vor);
    for (let i = 0; i < n; i++) {
      const p = d.part[i], u = (t * p.v * (1 + tragado * .8) + p.f) % 1, q = 1 - u;
      const rr = lerp(rd * .96, 1250, q ** 1.5 * (.6 + .4 * p.r)), a2 = p.a + 2.4 * Math.log(1 + rr * .006) + t * .7;
      const x = C.x + Math.cos(a2) * rr, y = C.y + Math.sin(a2) * rr * .94, ta = a2 + 1.2, l = p.l * lerp(.45, 1.5, q);
      B[p.b].moveTo(x, y); B[p.b].lineTo(x + Math.cos(ta) * l, y + Math.sin(ta) * l);
      B[p.b].moveTo(x + Math.cos(ta) * (l + 7), y + Math.sin(ta) * (l + 7)); B[p.b].lineTo(x + Math.cos(ta) * (l * 1.4 + 7), y + Math.sin(ta) * (l * 1.4 + 7));
    }
    c.lineCap = "round";
    c.strokeStyle = TINTA; c.globalAlpha = .9; c.lineWidth = 5; c.stroke(B[0]);
    c.globalAlpha = .55; c.lineWidth = 4; c.stroke(B[1]);
    c.globalAlpha = .3; c.lineWidth = 3.4; c.stroke(B[2]); c.globalAlpha = 1;
    for (let i = 0; i < 44; i++) {
      const p = d.part[i * 3], u = (t * p.v * .8 * (1 + tragado * .7) + p.f) % 1, q = 1 - u;
      const rr = lerp(rd * 1.02, 1150, q ** 1.3), a2 = p.a + 2.4 * Math.log(1 + rr * .006) + t * .7, fuerza = smooth(prog(u, 0, .08)) * smooth(prog(q, 0, .12));
      c.save(); c.translate(C.x + Math.cos(a2) * rr, C.y + Math.sin(a2) * rr * .94); c.rotate(a2 + 1.2); const es = lerp(.5, 1.3, q); c.scale(es, es);
      texto(c, PROSA[i % PROSA.length], 0, 0, { fuente: serif(62, i % 4 === 0), color: TINTA, alfa: vor * fuerza * .8 }); c.restore();
    }
  }
  const entra = smooth(prog(t, K.dif + .3, K.leyo));
  if (entra > 0) {
    const atras = smooth(prog(t, K.como - .05, K.igual - .1));
    const r = rot(t) - atras * 7;
    c.save(); c.globalAlpha = entra;
    rueda(c, cam, { S: poten(DISCOS.cielo, ePot(t)), of: 0 }, r, { etiq: smooth(prog(t, K.intern, K.intern + .4)) });
    c.restore();
  }
  const vaT = ease.inCubic(prog(t, K.intern - .2, K.intern + .4));
  if (vaT < 1) { c.save(); c.translate(hx, hy + vaT * 700); c.scale(e, e); c.translate(-540, -960); telefono(c, t, d); c.restore(); }
  rotulo(c, t, K.escala - .08, K.leyo - .14, "escala", 420, 210, ACENTO, true);
  rotulo(c, t, K.como - .04, K.igual - .1, "¿cómo aprendió?", 400, 146);
}

// ---------- 6. el repaso: cinco estaciones de la misma hoja ----------
const FRASES = ["el perro mueve la", "dos más dos son", "había una vez un", "me duele la", "te quiero con todo mi", "la capital de Francia es", "buenos días a", "el agua moja la"];
const YE = { cinta: 262, rueda: 860, err: 1370, red: 1790, per: 2440 };
const XK = [240, 540, 840], RK = 92;
const absF = (t: number) => 15 * prog(t, K.abs0 + .2, K.abs1 + .5) ** 2.1;
function camHoja(t: number) {
  let y = tramos(t, 0, [[K.medi - .34, K.medi + .04, 450, ease.outExpo], [K.culpa - .26, K.culpa + .1, 1030, ease.outExpo], [K.ajus - .24, K.ajus + .08, 1283, ease.outExpo], [K.peri + .3, K.abs0 + .62, 400, ease.inOutCubic]]);
  const z = tramos(t, 1, [[K.ajus - .24, K.ajus + .08, 1.22, ease.outExpo], [K.peri + .3, K.abs0 + .62, .49, ease.inOutCubic], [K.mod - .3, K.gran + .2, .1, ease.inOutCubic]]);
  y = tramos(t, y, [[K.mod - .3, K.gran + .2, 300]]);
  return { y, z };
}
const PERI: [number, number, number][] = [[-.8, 1.6, 2.6], [.5, -1.4, -2], [1.4, .9, -.6]];
function perillaV(i: number, t: number) {
  const [a, b, x] = PERI[i], f = absF(t);
  let v = tramos(t, a, [[K.ajus + i * .14, K.ajus + .4 + i * .14, b, ease.outBack], [K.peri + i * .1, K.peri + .34 + i * .1, x, ease.outBack]]);
  if (f > 0) v += Math.sin(f * 4 + i * 2) * .9 * Math.min(f, 1);
  return -Math.PI / 2 + v * Math.PI / 4;
}
function icono(c: Ctx, i: number, x: number, y: number, q: number, t: number) {
  c.save(); c.translate(x, y); c.scale(q, q); c.lineCap = "round";
  if (i === 0) {
    c.strokeStyle = TINTA; c.lineWidth = 6; linea(c, -74, 54, 74, 54); bola(c, -10 + 26 * vaiven(t, 1.3), 24, 28);
    c.fillStyle = ACENTO; c.fillRect(-74, 66, 92, 11);
  } else if (i === 1) {
    c.strokeStyle = TINTA; c.lineWidth = 4;
    for (let k = 1; k <= 3; k++) { c.beginPath(); c.ellipse(0, 12, 28 + k * 21, 14 + k * 15, -.3, 0, TAU); c.stroke(); }
    bola(c, 16, -4, 24);
  } else if (i === 2) perillaMetal(c, 0, 8, 62, -1 + .5 * vaiven(t, 1.1), 1, 7);
  else {
    const P = [[-66, 52], [0, 52], [66, 52], [-36, -46], [36, -46]];
    c.strokeStyle = TINTA; c.lineWidth = 4; for (const a of [0, 1, 2]) for (const b of [3, 4]) linea(c, P[a][0], P[a][1], P[b][0], P[b][1]);
    c.fillStyle = TINTA; for (const p of P) circulo(c, p[0], p[1], 17); c.fillStyle = ACENTO; circulo(c, 36, -46, 17);
  }
  c.restore();
}
function hoja(c: Ctx, t: number, d: D, alfa = 1) {
  // ---- cinta: le tapan la palabra ----
  const P = d.cielo.slice(0, 4), xc = 540 - (P[3].x + P[3].w) / 2, az0 = P[3];
  const yc = YE.cinta, f = absF(t), vuelta = f % 1, ciclo = f > 0 ? (vuelta < .5 ? 1 : 0) : 0;
  const entra = 1 - ease.outCubic(prog(t, K.igual - .1, K.igual + .5));
  c.save(); c.translate(0, -620 * entra);
  tiraPapel(c, yc, 176, 0, t, -520, 1600);
  if (f <= 0 || f >= 14.5) P.forEach((p) => texto(c, p.s, xc + p.x, yc + 40, { fuente: serif(124), color: TINTA, alin: "left" }));
  else texto(c, FRASES[Math.floor(f) % FRASES.length], xc + az0.x - 26, yc + 40, { fuente: serif(124), color: TINTA, alin: "right" });
  const az = P[3], ta = K.tapF - .32, cae = ease.inCubic(prog(t, ta, K.tapF)), levanta = ease.inOutCubic(prog(t, K.medi - .14, K.medi + .3));
  const yt = lerp(yc - 760, yc - 70, cae) - levanta * 300 * (1 - ciclo), xt = xc + az.x - 26;
  if (t > ta) {
    const sac = golpe(t, K.tapF, 5, 40, 12);
    c.fillStyle = "#0D0D0C"; c.beginPath(); c.roundRect(xt, yt + sac, az.w + 52, 136, 12); c.fill();
    c.strokeStyle = "#3a3936"; c.lineWidth = 3; c.beginPath(); c.roundRect(xt + 7, yt + 7 + sac, az.w + 38, 122, 8); c.stroke();
  }
  c.restore();
  // ---- rueda pareja ----
  const cam = camEsc(t), bR = K.adiv2 + .5, b0 = K.tapF + .06;
  const S = poten(DISCOS.cielo, ePot(t)), g = 11;
  const r0 = -Math.PI / 2 + TAU * centroDe(S, g) + (bR - Math.min(t, bR + 1e3)) * .5 + (f > 0 ? f * 1.7 : 0);
  const lit = smooth(prog(t, bR - .02, bR + .05)) * (1 - smooth(prog(t, K.abs0, K.abs0 + .2)));
  rueda(c, cam, { S, of: 0 }, r0, { gan: g, gk: lit, etiq: smooth(prog(t, K.igual - .3, K.igual + .4)) });
  if (t > b0 - .02 && t < K.abs0 + .3) {
    const u = prog(t, b0, bR), a1 = FRENTE, W = 5.2 * TAU;
    const uu = u < .68 ? .83 : u < .8 ? lerp(.83, .72, prog(u, .68, .8)) : lerp(.72, RD, prog(u, .8, .95));
    let z = 0;
    for (let i = 0; i < 4; i++) { const h0 = lerp(.68, 1, i / 4), h1 = lerp(.68, 1, (i + 1) / 4); if (u >= h0 && u < h1) { const v = prog(u, h0, h1); z = HA[i] * 4 * v * (1 - v); } }
    bolaEnRueda(c, cam, RM, { a: a1 + W * (1 - u) ** CAIDA, r: uu, z });
  }
  // Iconos de la serie: lo que ya se vio.
  const fuera = 1 - smooth(prog(t, K.tapa + .1, K.tapa + .5));
  for (let i = 0; i < 4; i++) { const q = pop(t, K.igual + .02 + i * .3, .26, 2.2) * fuera; if (q > 0) icono(c, i, 216 + i * 216, 1336, q * 1.28, t); }
  // ---- el error: la misma barra del capítulo 1 ----
  const yE = YE.err, sal = K.medi - .02, xQ = 262, xA = 822;
  const llega = (ti: number) => ease.inOutCubic(prog(t, ti, ti + .36));
  const kQ = llega(bR + .08), kA = llega(K.medi + .08);
  const FP = pr(cam, RM, .5, FRENTE, .06);
  if (t > bR + .06) {
    const q = 1 + .14 * Math.exp(-(t - bR) * 7);
    texto(c, "queso", lerp(FP.x, xQ, kQ), lerp(FP.y, yE, kQ), { fuente: serif(124 * lerp(1, q, 1)), color: ACENTO });
  }
  if (t > sal + .08) {
    const xz = xc + az.x + az.w / 2, yz = yc + 40;
    texto(c, "azul", lerp(xz, xA, ease.outCubic(kA)) + 150 * Math.sin(kA * Math.PI), lerp(yz, yE, kA), { fuente: serif(124), color: TINTA });
  }
  const w0 = (xA - xQ - 60) * ease.outExpo(prog(t, K.err - .1, K.err + .36));
  const encoge = (1 - smooth(prog(t, K.peri - .05, K.peri + .5)) * .5) * (1 - smooth(prog(f, 0, 14)) * .95);
  if (w0 > 1) {
    c.fillStyle = ACENTO; c.fillRect(xQ + 30, yE + 58, w0 * encoge, 34);
    rotuloHoja(c, t, K.err - .06, "error", 540, yE + 190, 124);
  }
  // ---- la culpa: rojo que viaja al revés ----
  redCulpa(c, t, d);
  // ---- las perillas ----
  const aP = smooth(prog(t, K.culpa - .1, K.culpa + .3));
  for (let i = 0; i < 3; i++) {
    c.save(); c.globalAlpha = aP; perillaMetal(c, XK[i], YE.per, RK, perillaV(i, t));
    // El arco dice cuánto giró: el ojo no alcanza a leer una aguja de lejos.
    const a0 = -Math.PI / 2 + PERI[i][0] * Math.PI / 4, a1 = perillaV(i, t), ar = (1 - smooth(prog(t, K.peri + .5, K.peri + .9)));
    if (t > K.ajus + i * .14 && ar > 0) { c.globalAlpha = aP * ar; c.strokeStyle = ACENTO; c.lineWidth = 12; c.lineCap = "round"; c.beginPath(); c.arc(XK[i], YE.per, RK * 1.44, a0, a1, a1 < a0); c.stroke(); }
    c.restore();
  }
  // ---- el carril: la vuelta ----
  const zo = smooth(prog(t, K.peri + .34, K.peri + .86));
  if (zo > 0) {
    // El eje: lo que giran las perillas llega a la rueda y le cambia las casillas.
    const pu = t < K.peri + 1.1 ? smooth(prog(t, K.peri + .36, K.peri + .7)) : f > 0 ? Math.exp(-(f % 1) * 3.2) : 0, ye = YE.rueda - 6, xe = 874;
    c.save(); c.globalAlpha = zo * alfa; c.strokeStyle = "#8C8A83"; c.lineWidth = 12; c.lineCap = "round"; linea(c, 1190, ye, xe, ye);
    c.strokeStyle = ACENTO; c.lineWidth = 16; c.globalAlpha = zo * alfa * clamp(pu); linea(c, 1190, ye, lerp(1190, xe, t < K.peri + 1.1 ? pu : 1), ye); c.restore();
    const R: [number, number][] = [[540, YE.cinta], [540, YE.rueda], [540, YE.err + 70], [540, 2000], [540, YE.per], [1190, YE.per], [1190, YE.cinta], [540, YE.cinta]];
    c.save(); c.globalAlpha = zo * alfa; c.setLineDash([4, 30]); c.lineCap = "round"; c.strokeStyle = TINTA; c.lineWidth = 9;
    c.beginPath(); c.moveTo(540, YE.per + 170); c.lineTo(1190, YE.per + 170); c.lineTo(1190, YE.cinta); c.stroke();
    c.restore();
    if (f > 0 && f < 15) {
      const L = [0]; for (let i = 1; i < R.length; i++) L.push(L[i - 1] + Math.hypot(R[i][0] - R[i - 1][0], R[i][1] - R[i - 1][1]));
      const pos = (u: number) => { const q = u * L[L.length - 1]; let i = 1; while (i < L.length - 1 && L[i] < q) i++; const v = (q - L[i - 1]) / (L[i] - L[i - 1]); return [lerp(R[i - 1][0], R[i][0], v), lerp(R[i - 1][1], R[i][1], v)]; };
      for (let k = 7; k >= 0; k--) { const p = pos(((f - k * .012) % 1 + 1) % 1); c.globalAlpha = (1 - k / 8) * .7; bola(c, p[0], p[1], 46 - k * 3); }
      c.globalAlpha = 1;
    }
  }
}
function rotuloHoja(c: Ctx, t: number, ti: number, s: string, x: number, y: number, px: number) {
  const q = pop(t, ti, .24, 2.2), a = 1 - smooth(prog(t, K.ajus - .3, K.ajus - .05)) * (1 - smooth(prog(t, K.abs0 + .3, K.abs0 + .7)));
  if (q > 0) { c.save(); c.translate(x, y); c.scale(q, q); texto(c, s, 0, 0, { fuente: serif(px, true), color: ACENTO, alfa: a }); c.restore(); }
}
function redCulpa(c: Ctx, t: number, d: D) {
  const a = smooth(prog(t, K.medi + .4, K.culpa)), f = absF(t);
  if (a <= 0) return;
  c.save(); c.globalAlpha = a; c.lineCap = "round";
  c.strokeStyle = "#8C8A83"; c.lineWidth = 4;
  for (const [ax, ay, bx, by] of d.neuro) linea(c, ax, ay, bx, by);
  for (let i = 4; i < 7; i++) linea(c, d.nod[i][0], d.nod[i][1], XK[i - 4], YE.per - RK);
  const k0 = K.culpa, k1 = K.fcul, dur = (k1 - k0) / 3;
  const cae = f > 0 ? (f * 2) % 1 : -1;
  d.neuro.forEach(([ax, ay, bx, by, w, cp]) => {
    const n = Math.floor(cp), ini = k0 + n * dur;
    const u = f > 0 ? clamp((cae - n * .28) / .3) : ease.outCubic(prog(t, ini, ini + dur * 1.1));
    if (u <= 0) return;
    c.strokeStyle = ACENTO; c.lineWidth = 2 + 20 * w; linea(c, ax, ay, lerp(ax, bx, u), lerp(ay, by, u));
  });
  for (let i = 4; i < 7; i++) {
    const w = [.42, .62, 1][i - 4], ini = k0 + 2 * dur;
    const u = f > 0 ? clamp((cae - .56) / .3) : ease.outCubic(prog(t, ini, ini + dur * 1.1));
    if (u > 0) { c.strokeStyle = ACENTO; c.lineWidth = 2 + 20 * w; linea(c, d.nod[i][0], d.nod[i][1], lerp(d.nod[i][0], XK[i - 4], u), lerp(d.nod[i][1], YE.per - RK, u)); }
  }
  d.nod.forEach(([x, y], i) => { c.fillStyle = TINTA; circulo(c, x, y, i === 0 ? 34 : 26); });
  // La barra entra por la salida de la red.
  const u = ease.inCubic(prog(t, K.culpa - .22, K.culpa + .02));
  if (u > 0 && f <= 0) { c.fillStyle = ACENTO; circulo(c, 540, lerp(YE.err + 110, d.nod[0][1], u), 24 * (1 - smooth(prog(t, K.culpa, K.culpa + .1)))); }
  c.restore();
}
function entrena(c: Ctx, t: number, d: D, alfa = 1) {
  const { y, z } = camHoja(t);
  c.save(); c.translate(540, 960); c.scale(z, z); c.translate(-540, -960 - y);
  c.globalAlpha = alfa;
  hoja(c, t, d, alfa);
  c.restore();
}

// ---------- 7. grande: la malla de perillas y las tres letras ----------
function malla(c: Ctx, t: number, d: D) {
  const ola = ease.inCubic(prog(t, K.mod - .1, K.gran + .3)) * 1500, ini = K.nosi - .78, cae = t > ini;
  const lote = new Path2D(), ptas = new Path2D(), apag = new Path2D();
  const lL = [K.L1, K.L2, K.M];
  const fx = 540 - MCOL * CM / 2, fy = 960 - MFIL * CM / 2;
  for (let j = 0; j < MFIL; j++) for (let i = 0; i < MCOL; i++) {
    const x0 = fx + i * CM + CM / 2, y0 = fy + j * CM + CM / 2, h = hash(i, j);
    const dist = Math.hypot(x0 - 540, y0 - 960);
    const bor = smooth(prog(y0, 500, 620)) * (1 - smooth(prog(y0, 1330, 1450)));
    const pulso = 1 + .17 * Math.sin(dist * .017 - t * 6.5);
    const s = smooth((ola - dist) / 170) * lerp(bor, 1, smooth(prog(t, K.L1, K.M))) * (t < K.L1 ? pulso : 1);
    if (s <= .01) continue;
    const m = d.mask[j * d.MW + i], ti = m ? lL[m - 1] : K.L1 - .05;
    const k = smooth(prog(t, ti - .03, ti + .1 + (m ? 0 : .6 * h)));
    let y = y0, x = x0, r = 9.6 * s;
    if (cae) { const e = Math.max(0, t - ini - h * .36); y += 2300 * e * e; if (y > 2010) continue; }
    if (x < -20 || x > 1100) continue;
    if (m) {
      r = lerp(9.6, 12.8, k) * s;
      lote.moveTo(x + r, y); lote.arc(x, y, r, 0, TAU);
      const a = h * 9 + t * (1 + h) + (m === 3 ? 1 : 0) * 0;
      ptas.moveTo(x + Math.cos(a) * r * .3, y + Math.sin(a) * r * .3); ptas.lineTo(x + Math.cos(a) * r * .84, y + Math.sin(a) * r * .84);
    } else if (k < 1) {
      lote.moveTo(x + r * (1 - k), y); lote.arc(x, y, Math.max(r * (1 - k), .1), 0, TAU);
      const a = h * 9 + t * (1 + h);
      ptas.moveTo(x + Math.cos(a) * r * .3 * (1 - k), y + Math.sin(a) * r * .3 * (1 - k)); ptas.lineTo(x + Math.cos(a) * r * .84 * (1 - k), y + Math.sin(a) * r * .84 * (1 - k));
      apag.rect(x - 1.4, y - 1.4, 2.8, 2.8);
    } else apag.rect(x - 1.4, y - 1.4, 2.8, 2.8);
  }
  c.fillStyle = "#C2BFB6"; c.fill(apag);
  c.fillStyle = TINTA; c.fill(lote);
  c.strokeStyle = LUZ; c.lineWidth = 2.6; c.lineCap = "round"; c.stroke(ptas);
}
function llm(c: Ctx, t: number, d: D) {
  fondo(c, t, d);
  malla(c, t, d);
  const col = 1 - smooth(prog(t, K.gran - .1, K.gran + .3));
  if (col > 0 && t < K.gran + .3) entrena(c, t, d, col);
  rotulo(c, t, K.mod - .03, K.ing - .12, "modelo de lenguaje", 300, 120);
  rotulo(c, t, K.gran - .04, K.ing - .12, "grande", 480, 196, ACENTO, true);
  if (t > K.L1 - .04) {
    const a = smooth(prog(t, K.M + .05, K.M + .35)) * (1 - smooth(prog(t, K.nosi - .9, K.nosi - .7)));
    // «Large Language Model»: las tres iniciales entran en acento.
    const W = ["Large", "Language", "Model"], tt = [K.L1, K.L2, K.M], y = 1540, fu = serif(100, true), xs = [142, 368, 742];
    W.forEach((s, i) => { const q = pop(t, tt[i] + .02, .2, 2); if (q <= 0) return; c.save(); c.translate(xs[i], y); c.scale(q, q); texto(c, s, 0, 0, { fuente: fu, color: TINTA, alin: "left", alfa: a > 0 ? 1 - smooth(prog(t, K.nosi - .9, K.nosi - .7)) : 1 - smooth(prog(t, K.nosi - .9, K.nosi - .7)) }); c.restore(); });
  }
}

// ---------- 8. robot y temperatura ----------
const XT = 540, YT = 470, RT = 128;
function apuesta(c: Ctx, t: number, d: D) {
  fondo(c, t, d);
  const sube = 1 - Math.min(resorte(t - (K.nosi - .68), 1.5, .6), 1.03), hit = K.prob + .32;
  const fue = ease.inCubic(prog(t, K.misma - .06, K.misma + .5));
  const robotT = t > K.si - .3 && t < K.ledejan;
  const sac = K.rob.reduce((a, r) => a + golpe(t, r, 5, 44, 12), 0);
  const cy = 1150 + sube * 1500 + sac + golpe(t, hit, 8, 42, 8) + fue * 0;
  const giroE = robotT ? Math.floor(t * 8) / 8 : t;
  const rr = rot(giroE);
  const cam = camara({ tx: 0, ty: 0, tz: 0, yaw: robotT ? 0 : .03 * vaiven(t, 6.7), pitch: .96, dist: 10.5 }, 540, cy);
  const s = secs(t);
  const lit = (t < K.si - .2 ? smooth(prog(t, hit - .02, hit + .05)) : 0);
  const litA = K.rob.reduce((a, r) => a + (t >= r ? Math.exp(-(t - r) * 8) : 0), 0) * (t < K.ledejan ? 1 : 0);
  rueda(c, cam, s, rr, lit > 0 ? { gan: 1, gk: lit } : { gan: 0, gk: clamp(litA) });
  if (t > K.nosi - .25) bolaEnRueda(c, cam, RM, bolaR(t));
  // «la más probable»: la flecha apunta a la rebanada que NO eligió.
  const aP = smooth(prog(t, K.prob - .06, K.prob + .16)) * (1 - smooth(prog(t, K.si - .24, K.si - .05)));
  if (aP > 0) {
    rotulo(c, t, K.prob - .06, K.si - .1, "la más probable", 560, 126, TINTA, true);
    const P = pr(cam, RM, .48, rot(t) - TAU * .35, .1);
    c.save(); c.globalAlpha = aP; flecha(c, 540, 604, lerp(540, P.x, .84), lerp(604, P.y, .84), TINTA, 8, 30); c.restore();
  }
  // Robot: la misma línea, la misma, la misma.
  if (t > K.si - .1 && t < K.ledejan + .4) {
    const LIN = "el cielo es azul.", al = 1 - smooth(prog(t, K.ledejan - .1, K.ledejan + .24));
    K.rob.forEach((r, i) => {
      if (t < r) return;
      const n = Math.min(LIN.length, Math.floor((t - r) * 44)), y = 200 + i * 92 - Math.max(0, K.rob.filter((x) => x < t).length - 6) * 92;
      texto(c, LIN.slice(0, n), 112, y, { fuente: mono(84), color: i === K.rob.filter((x) => x < t).length - 1 ? TINTA : "#5a5853", alin: "left", alfa: al, esp: 0 });
    });
    if (t > K.robot - .1) { const y = 1000; void y; }
  }
  // La perilla de la temperatura.
  const pq = Math.min(resorte(t - (K.ledejan - .12), 1.4, .55), 1.04), sa = 1 - smooth(prog(t, K.misma - .1, K.misma + .24));
  if (pq > .001 && sa > 0) {
    const v = vT(t), y = lerp(-220, YT, pq);
    c.save(); c.globalAlpha = sa;
    c.strokeStyle = TINTA; c.lineCap = "round";
    for (let i = -3; i <= 3; i++) { const a = -Math.PI / 2 + i * Math.PI / 4, R0 = RT + 16, R1 = RT + (i % 3 === 0 ? 46 : 32); c.lineWidth = i % 3 === 0 ? 6 : 4; linea(c, XT + Math.cos(a) * R0, y + Math.sin(a) * R0, XT + Math.cos(a) * R1, y + Math.sin(a) * R1); }
    perillaMetal(c, XT, y, RT, -Math.PI / 2 + v * Math.PI / 4);
    c.restore();
    const aq = smooth(prog(t, K.ftemp - .1, K.ftemp + .18)) * sa;
    const hot = (v + 3) / 6;
    texto(c, "aprieta", 212, YT + 96, { fuente: serif(100, true), color: v < -1 ? ACENTO : TINTA, alfa: aq * lerp(1, .4, hot) });
    texto(c, "suelta", 852, YT + 96, { fuente: serif(100, true), color: v > 1 ? ACENTO : TINTA, alfa: aq * lerp(.4, 1, hot) });
  }
  rotulo(c, t, K.temp - .04, K.misma - .1, "temperatura", 244, 176, ACENTO, true);
  void d;
}

// ---------- 9. la misma pregunta, dos respuestas ----------
const GX = [272, 806], GY = 646, GR = 2.05;
const COL = [["azul", "porque", "la luz", "se", "dispersa."], ["hermoso", "cuando", "nadie", "lo", "mira."]];
function gemelas(c: Ctx, t: number, d: D) {
  fondo(c, t, d);
  const a = ease.inOutCubic(prog(t, K.misma - .1, K.misma + .55)), fuera = ease.inOutCubic(prog(t, K.poema - .4, K.poema + .08));
  const tf = [K.dos - .2, K.dos + .34], gan = [0, 2], S = DISCOS.cielo;
  rotulo(c, t, K.misma + .3, K.poema - .4, "¿cómo es el cielo?", 232, 124);
  for (let i = 0; i < 2; i++) {
    const cx = lerp(540, GX[i], a), cy = lerp(1150, GY, a), R = lerp(RM, GR, a);
    const cam = camara({ tx: 0, ty: 0, tz: 0, yaw: 0, pitch: lerp(.96, 1.02, a), dist: 10.5 }, cx - fuera * (i ? -1 : 1) * 760, cy);
    const fin = tf[i], ro = -Math.PI / 2 + TAU * centroDe(S, gan[i]) + (fin - Math.min(t, fin)) * -1.1 + (t > fin ? -(t - fin) * .22 : 0);
    const lit = smooth(prog(t, fin - .02, fin + .06));
    rueda(c, cam, { S, of: 0 }, ro, { R, gan: gan[i], gk: lit, etiq: a < .5 ? 1 : .95 });
    const u = prog(t, K.misma + .3 + i * .1, fin);
    if (t > K.misma + .3 && u <= 1) {
      const W = (6 + i) * TAU;
      const r = u < .68 ? .83 : u < .8 ? lerp(.83, .72, prog(u, .68, .8)) : lerp(.72, RD, prog(u, .8, .96));
      let z = 0;
      for (let k = 0; k < 4; k++) { const h0 = lerp(.68, 1, k / 4), h1 = lerp(.68, 1, (k + 1) / 4); if (u >= h0 && u < h1) { const v = prog(u, h0, h1); z = HA[k] * 4 * v * (1 - v); } }
      bolaEnRueda(c, cam, R, { a: FRENTE + W * (1 - u) ** CAIDA, r, z });
    }
    if (u >= 1) bolaEnRueda(c, cam, R, { a: FRENTE + (t > fin ? -(t - fin) * .22 : 0), r: RD, z: 0 });
    // Cada rueda escribe su propia columna.
    const X = GX[i] - fuera * (i ? -1 : 1) * 760;
    COL[i].forEach((w, j) => {
      const ti = fin + .1 + j * .3, q = pop(t, ti, .2, 2.2);
      if (q <= 0) return;
      const y = 1000 + j * 116;
      c.save(); c.translate(X, y); c.scale(q, q);
      const rojo = 1 - smooth(prog(t, ti + .2, ti + .5));
      texto(c, w, 0, 0, { fuente: serif(j ? 108 : 128, j === 0), color: TINTA, alfa: 1 - rojo });
      if (rojo > 0) texto(c, w, 0, 0, { fuente: serif(j ? 108 : 128, j === 0), color: ACENTO, alfa: rojo });
      c.restore();
    });
  }
  if (a > .05 && fuera < 1) {
    c.save(); c.globalAlpha = (1 - fuera) * smooth(prog(a, .6, 1)); c.strokeStyle = "#BDBAB1"; c.lineWidth = 4; c.setLineDash([3, 18]); c.lineCap = "round"; linea(c, 540, 920, 540, 1540); c.restore();
  }
}

// ---------- 10. un poema, un programa, un consejo; y se les va la tinta ----------
function tarjeta(c: Ctx, x: number, y: number, w: number, h: number, rot0: number, q: number, fill: string, cola = false) {
  if (q <= .002) return;
  c.save(); c.translate(x + w / 2, y + h / 2 + (1 - q) * -1200); c.rotate(rot0 * (1 + (1 - q) * 3));
  for (let i = 5; i > 0; i--) { c.fillStyle = `rgba(20,18,14,${.03})`; c.beginPath(); c.roundRect(-w / 2 - i * 3 + 7, -h / 2 - i * 3 + 11, w + i * 6, h + i * 6, 26); c.fill(); }
  c.fillStyle = fill; c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, 22); c.fill();
  if (cola) { c.beginPath(); c.moveTo(-w / 2 + 90, h / 2 - 4); c.lineTo(-w / 2 + 60, h / 2 + 56); c.lineTo(-w / 2 + 170, h / 2 - 4); c.fill(); }
  c.restore();
}
function hojas(c: Ctx, t: number, d: D, conFondo = true) {
  if (conFondo) fondo(c, t, d);
  const sale = (i: number) => ease.inCubic(prog(t, K.eso + .05 + i * .06, K.eso + .55 + i * .06));
  const T1 = [K.poema - .12, K.prog - .12, K.consejo - .12];
  const q0 = ease.outBack(prog(t, T1[0], T1[0] + .26), 1.3), q1 = ease.outBack(prog(t, T1[1], T1[1] + .26), 1.3), q2 = ease.outBack(prog(t, T1[2], T1[2] + .26), 1.3);
  c.save(); c.translate(0, -sale(0) * 1400); tarjeta(c, 100, 170, 780, 310, -.022, q0, "#FCFBF7"); c.restore();
  c.save(); c.translate(0, -sale(1) * 1400); tarjeta(c, 170, 640, 806, 300, .018, q1, "#121211"); c.restore();
  c.save(); c.translate(0, -sale(2) * 1400); tarjeta(c, 110, 1110, 830, 310, -.014, q2, "#E8E4D9", true); c.restore();
  // Palabras: primero tinta, luego bola, luego caen.
  const n = d.mano.length, S = K.nadie + .02;
  d.mano.forEach((p, i) => {
    if (t < p.t) return;
    const hc = i / n, ti = S + hc * .72, k = smooth(prog(t, ti, ti + .18)), cx = p.x + p.w / 2, cy = p.y - p.h * .3;
    if (k < 1) {
      c.save(); c.translate(cx, p.y); c.scale(1 - k, 1 - k);
      const q = 1 + .12 * Math.exp(-(t - p.t) * 15);
      c.scale(q, q);
      texto(c, p.s, 0, 0, { fuente: p.fu, color: p.col, alfa: smooth((t - p.t) / .05) }); c.restore();
    }
    if (k > 0) {
      const e = Math.max(0, t - K.eso - hc * .3), r = 19 * pop(t, ti + .05, .2, 2);
      const y = cy + .5 * 5200 * e * e + (hash(i, 3) - .5) * 0;
      const lim = 1200;
      if (y < lim + 400) {
        const bx = cx + (540 - cx) * smooth(prog(y, 500, lim)) * .8;
        c.save(); c.globalAlpha = 1 - smooth(prog(y, lim, lim + 200));
        if (p.col === LUZ && r > 3) { c.fillStyle = LUZ; circulo(c, bx, y, r + 3.5); }
        rimBola(c, bx, y, r, .5); c.restore();
      }
    }
  });
}

// ---------- 11. una palabra a la vez, y la última ----------
function final(c: Ctx, t: number, d: D) {
  fondo(c, t, d);
  const sube = 1 - Math.min(resorte(t - (K.eso + .12), 1.4, .6), 1.03), aleja = ease.inOutSine(prog(t, K.cae, K.dur));
  const K0 = K.cae, sh = golpe(t, K0, 14, 46, 7) + golpe(t, K.cre, 9, 40, 9);
  const cam = camara({ tx: 0, ty: 0, tz: 0, yaw: .03 * vaiven(t, 6.7) * (1 - aleja), pitch: .96 + .04 * prog(t, K.yc, K.cre), dist: lerp(10.5, 9.6, ease.inOutSine(prog(t, K.yc, K.cre))) + aleja * .9 }, 540, 1160 + sube * 1500 + sh);
  const s = secs(t), B = bolaR(t), pasa = t > K.cre - .4 && t < K.cre - .08, cre = smooth(prog(t, K.cre - .02, K.cre + .05));
  const aCre = rot(t) - TAU * DISCOS.cre[0].p / 2;
  rueda(c, cam, s, rot(t), { gan: s.of, gk: t < K.yc ? 0 : cre, roz: s.of + 1, rozK: pasa ? 1 : 0, sin: t > K.cre - .04 && t < d.fin[2].t ? s.of : -1 });
  // La bola: en la rueda hasta que salta a la cinta y se vuelve el punto final.
  const tl = K0 - .62;
  const yb = YC + 52, px = 150, X = d.finX, p3 = d.fin[2];
  const scU = scrollDe(d.une, t, 900) + ease.inCubic(prog(t, K.yc - .9, K.yc - .2)) * 1800;
  const yT = YC - (1 - ease.outCubic(prog(t, K.salio - .3, K.salio + .1))) * 340;
  tiraPapel(c, yT, 196, t < K.yc ? scU : 1800, t);
  if (t < K.yc) palabrasTira(c, d.une, t, YC + 40, XI, scU, 124);
  for (const p of d.une) if (t < K.yc) vuela(c, cam, p, t, { x: XI + p.x + p.w / 2 - scU, y: YC }, 124, .22);
  rotulo(c, t, K.apostar - .06, K.una - .24, "apostar", 610, 190, ACENTO, true);
  palabrasTira(c, d.fin.slice(0, 2), t, yb, X, 0, px, { acento: 0 });
  palabrasTira(c, [p3], t, yb, X, 0, px, { acento: 1e3 });
  vuela(c, cam, p3, t, { x: X + p3.x + p3.w / 2, y: yb - 40 }, px, .24, aCre);
  const xP = X + d.finPunto - 16, yP = yb - 13;
  if (t < tl) { if (t > K.eso + .3) bolaEnRueda(c, cam, RM, B); }
  else if (t < K0) {
    const p = bolaEnRueda, _ = p; void _;
    const u = prog(t, tl, K0), Q = pr(cam, RM, RD, rot(tl) - TAU * DISCOS.cre[0].p * .84 + 0, .1);
    const x = lerp(Q.x, xP, u), y = lerp(Q.y, yP, u * u * (3 - 2 * u)) - 430 * Math.sin(u * Math.PI);
    rimBola(c, x, y, lerp(RB * RM * 120, 15, ease.inCubic(u)));
  } else {
    const q = 1 + .5 * Math.exp(-(t - K0) * 11);
    bola(c, xP, yP, 15 * q);
    for (let i = 0; i < 3; i++) {
      const e = t - K0 - i * .07; if (e <= 0 || e > .7) continue;
      c.save(); c.globalAlpha = (1 - e / .7) * .7; c.strokeStyle = ACENTO; c.lineWidth = 5 - i; c.beginPath(); c.arc(xP, yP, 16 + ease.outCubic(e / .7) * 210, 0, TAU); c.stroke(); c.restore();
    }
  }
}

function dibuja(c: Ctx, t: number, d: D) {
  const noche = t >= K.sin && t < K.tel - .18;
  c.fillStyle = noche ? NOCHE : PAPEL; c.fillRect(0, 0, 1080, 1920);
  c.save(); deriva(c, t);
  if (t < K.esc) apertura(c, t, d);
  else if (t < armaF) lista(c, t, d);
  else if (t < K.sin) mesa(c, t, d);
  else if (noche) negro(c, t, d);
  else if (t < K.tapa - .35) { escala(c, t, d); if (t > K.igual - .1) { const p = ease.outCubic(prog(t, K.igual - .1, K.tapa - .35)); void p; } }
  else if (t < K.mod - .05) entrena(c, t, d);
  else if (t < K.nosi - .68) llm(c, t, d);
  else if (t < K.misma + .001) { if (t < K.nosi - .1) llm(c, t, d); apuesta(c, t, d); }
  else if (t < K.poema - .1) gemelas(c, t, d);
  else if (t < K.eso + .12) hojas(c, t, d);
  else { final(c, t, d); if (t < K.salio + .5) hojas(c, t, d, false); }
  c.restore();
}

export const Pieza: React.FC = () => <Lienzo dibuja={dibuja} preparar={preparar} />;
