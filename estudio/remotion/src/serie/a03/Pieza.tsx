// Serie 2, capítulo 3. Una pista circular de verdad. El chatbot contesta una vez, y un iris de caricatura lo
// apaga; ese mismo círculo se reabre empujado por la bola, y de ahí sale la pista. La bola da vueltas entre
// tres estaciones, cada vuelta escribe en la pista lo que pasó, y cada vuelta siguiente pisa TODO lo escrito y
// paga una moneda por marca: por eso la torre crece cada vez más rápido (1, 3, 6, 10… 55).
// Todos los tiempos de bola, monedas y sellos vienen de pista.json, que escribe partitura.py.
import React from "react";
import { azar, Cam, camara, clamp, ease, lerp, mezclaVista, prog, smooth, texto, Vista } from "../../kit";
import { ACENTO, bola, GRIS, Lienzo, LUZ, mono, NOCHE, PAPEL, rotulo, serif, sombra, TINTA } from "../../marca";
import { agente, brazo } from "../../personaje";
import pista from "./pista.json";
import duracion from "./duracion.json";

export const DURACION = duracion.dur;
type Ctx = CanvasRenderingContext2D;
type P3 = [number, number, number];
const A = pista.A, TAU = Math.PI * 2, { MARCAS, SITIO, PUERTA, VUELO, HOPS, U_FIN, HOOK0, HOOK_V } = pista;

// ---------- geometría ----------
const R0 = 2.7, R1 = 4.2, RM = 3.45, H = .24, RB = .52, CY = 1040;
const TH = (u: number) => Math.PI / 2 - u * TAU;
const PED = { x: -.75, y: .3, r: .84, h: .52 };      // el pedestal del chatbot
const TOR = { x: 1.05, y: -.1 }, PILA = { x: -2.0, y: -.3 }, RMON = .62, EMON = .15;
const COBRE = ["#E9896C", ACENTO, "#7E2413", "#4C140A"];

// ---------- tiempo de la pista ----------
const NU = pista.u.length;
function U(t: number) {
  const x = clamp(t / pista.paso, 0, NU - 1.001), i = Math.floor(x);
  return lerp(pista.u[i], pista.u[i + 1], x - i);
}
const velo = (t: number) => (U(t + .06) - U(t - .06)) / .12;
const uHook = (t: number) => (t - HOOK0) / HOOK_V;
const CAE = pista.monedas.map((m) => m.t + VUELO);
function cuenta(t: number) { let a = 0, b = CAE.length; while (a < b) { const m = (a + b) >> 1; if (CAE[m] <= t) a = m + 1; else b = m; } return a; }
const CRUCES: number[][] = MARCAS.map((_, j) => pista.monedas.filter((m) => m.j === j).map((m) => m.t));
const SELLO: number[] = MARCAS.map((_, j) => (j === 0 ? A.cosa : pista.sellos.find((s) => s.j === j)!.t));
const PLANTILLA = Array.from({ length: 10 }, (_, i) => lerp(A.ninguna + .22, A.inteligente - .05, i / 9));

// ---------- utilidades ----------
const q = (x: number, y: number) => [x, y] as [number, number];
const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * TAU + f);
const cerca = (ref: number, y: number) => y + TAU * Math.round((ref - y) / TAU);

function circulo(c: Ctx, cam: Cam, r: number, z: number, N = 96, boil?: () => number, a0 = 0, a1 = TAU) {
  let abierto = false;
  for (let i = 0; i <= N; i++) {
    const a = lerp(a0, a1, i / N), rr = r + (boil ? (boil() - .5) * .022 : 0), p = cam.p(rr * Math.cos(a), rr * Math.sin(a), z);
    if (!p) { abierto = false; continue; }
    if (abierto) c.lineTo(p.x, p.y); else { c.moveTo(p.x, p.y); abierto = true; }
  }
}
function elipse(cam: Cam, x: number, y: number, z: number, R: number) {
  const p = cam.p(x, y, z); if (!p) return null;
  const dh = Math.hypot(x - cam.pos[0], y - cam.pos[1]), dz = cam.pos[2] - z, k = Math.abs(dz) / Math.hypot(dh, dz);
  return { x: p.x, y: p.y, rx: R * p.s, ry: R * p.s * Math.max(k, .025), s: p.s };
}
/** Superficie plana en el mundo: dibuja en píxeles locales con `f`. k = unidades de mundo por píxel. */
function plano(c: Ctx, cam: Cam, O: P3, Ux: P3, Vy: P3, k: number, f: () => void) {
  const a = cam.p(O[0], O[1], O[2]), b = cam.p(O[0] + Ux[0] * k * 100, O[1] + Ux[1] * k * 100, O[2] + Ux[2] * k * 100), d = cam.p(O[0] + Vy[0] * k * 100, O[1] + Vy[1] * k * 100, O[2] + Vy[2] * k * 100);
  if (!a || !b || !d) return;
  c.save(); c.transform((b.x - a.x) / 100, (b.y - a.y) / 100, (d.x - a.x) / 100, (d.y - a.y) / 100, a.x, a.y); f(); c.restore();
}
function palo(c: Ctx, cam: Cam, a: P3, b: P3, g: number, color = TINTA) {
  const p = cam.p(a[0], a[1], a[2]), r = cam.p(b[0], b[1], b[2]); if (!p || !r) return;
  c.strokeStyle = color; c.lineWidth = Math.max(1.5, g * (p.s + r.s) / 2); c.lineCap = "round"; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(r.x, r.y); c.stroke();
}
function cobre(c: Ctx, x: number, r: number, f = 0) {
  const g = c.createLinearGradient(x - r, 0, x + r, 0);
  g.addColorStop(0, COBRE[2]); g.addColorStop(clamp(.2 + f * .1), COBRE[0]); g.addColorStop(.52, COBRE[1]); g.addColorStop(1, COBRE[3]);
  return g;
}

// ---------- el suelo y la pista ----------
function suelo(c: Ctx, cam: Cam) {
  c.fillStyle = "rgba(17,17,17,.2)";
  for (let i = -11; i <= 11; i++) for (let j = -11; j <= 11; j++) {
    const x = i * 1.5 + (j % 2) * .75, y = j * 1.5, d = Math.hypot(x, y);
    if (d > R0 + .2 && d < R1 + .5) continue;
    const p = cam.p(x, y, 0); if (!p) continue;
    const z = Math.min(p.s * .026, 5); c.fillRect(p.x - z / 2, p.y - z / 2, z, z);
  }
}

function pistaBase(c: Ctx, cam: Cam, t: number) {
  const N = 128, c0 = cam.p(0, 0, 0), sC = c0 ? c0.s : 100, [px, py] = cam.pos;
  // sombra de contacto: anillos muy tenues, sin blur
  for (const [dr, a, w] of [[.42, .035, .95], [.28, .05, .6], [.16, .07, .34]] as const) {
    c.strokeStyle = `rgba(20,18,14,${a})`; c.lineWidth = w * sC; c.beginPath(); circulo(c, cam, R1 + dr, 0, 72); c.stroke();
    c.beginPath(); circulo(c, cam, R0 - dr, 0, 60); c.stroke();
  }
  const pts = (r: number, z: number) => Array.from({ length: N + 1 }, (_, i) => cam.p(r * Math.cos(i / N * TAU), r * Math.sin(i / N * TAU), z));
  const a0 = pts(R0, H), a1 = pts(R1, H), b0 = pts(R0, 0), b1 = pts(R1, 0);
  const cuad = (A1: any, A2: any, B2: any, B1: any, col: string) => {
    if (!A1 || !A2 || !B1 || !B2) return;
    c.fillStyle = col; c.strokeStyle = col; c.lineWidth = 1; c.beginPath(); c.moveTo(A1.x, A1.y); c.lineTo(A2.x, A2.y); c.lineTo(B2.x, B2.y); c.lineTo(B1.x, B1.y); c.closePath(); c.fill(); c.stroke();
  };
  for (let i = 0; i < N; i++) {
    const a = (i + .5) / N * TAU, ca = Math.cos(a), sa = Math.sin(a);
    const luz = .5 + .5 * Math.cos(a + .9), v = Math.round(22 + 44 * luz);
    if (-ca * (px - R0 * ca) - sa * (py - R0 * sa) > 0) cuad(a0[i], a0[i + 1], b0[i + 1], b0[i], `rgb(${v},${v},${v})`);
    if (ca * (px - R1 * ca) + sa * (py - R1 * sa) > 0) cuad(a1[i], a1[i + 1], b1[i + 1], b1[i], `rgb(${v},${v},${v})`);
  }
  for (let i = 0; i < N; i++) {
    const a = (i + .5) / N * TAU, v = Math.round(238 + 14 * (.5 + .5 * Math.cos(2 * a + 1.1 + t * .05)));
    cuad(a0[i], a0[i + 1], a1[i + 1], a1[i], `rgb(${v},${v - 2},${v - 7})`);
  }
  // bordillos: se vibran como dibujados a mano
  const boil = azar(Math.floor(t * 10) * 13 + 5);
  c.strokeStyle = TINTA; c.lineCap = "round"; c.lineWidth = Math.max(2.5, .05 * sC);
  c.beginPath(); circulo(c, cam, R1 - .1, H, 128, boil); c.stroke();
  c.beginPath(); circulo(c, cam, R0 + .1, H, 110, boil); c.stroke();
  // carril central
  c.strokeStyle = "rgba(17,17,17,.42)"; c.lineWidth = Math.max(1.5, .024 * sC);
  c.beginPath();
  for (let i = 0; i < 56; i++) { const a = i / 56 * TAU; circulo(c, cam, RM, H, 2, undefined, a, a + TAU / 56 * .45); }
  c.stroke();
  // regla del borde: da la sensación de velocidad al pasar
  c.strokeStyle = "rgba(17,17,17,.5)"; c.lineWidth = Math.max(1.2, .02 * sC); c.beginPath();
  for (let i = 0; i < 180; i++) {
    const a = i / 180 * TAU, l = i % 5 === 0 ? .2 : .1;
    const p = cam.p((R1 - .1) * Math.cos(a), (R1 - .1) * Math.sin(a), H), r = cam.p((R1 - .1 - l) * Math.cos(a), (R1 - .1 - l) * Math.sin(a), H);
    if (p && r) { c.moveTo(p.x, p.y); c.lineTo(r.x, r.y); }
  }
  c.stroke();
  // la meta, a cuadros, bajo la primera estación
  const th0 = TH(0), fil = 2, col = 8, an = .16;
  c.fillStyle = TINTA;
  for (let i = 0; i < col; i++) for (let j = 0; j < fil; j++) {
    if ((i + j) % 2) continue;
    const r0 = lerp(R0 + .14, R1 - .14, i / col), r1 = lerp(R0 + .14, R1 - .14, (i + 1) / col), g0 = th0 + (j - fil / 2) * an / RM * 1.6, g1 = g0 + an / RM * 1.6;
    const P = [[r0, g0], [r1, g0], [r1, g1], [r0, g1]].map(([r, g]) => cam.p(r * Math.cos(g), r * Math.sin(g), H));
    if (P.every(Boolean)) { c.beginPath(); P.forEach((p, k) => (k ? c.lineTo(p!.x, p!.y) : c.moveTo(p!.x, p!.y))); c.closePath(); c.fill(); }
  }
}

/** Huellas: cada vuelta deja un surco fino al borde de la pista, como anillos de árbol. */
function huellas(c: Ctx, cam: Cam, u: number) {
  if (u <= 0) return;
  const c0 = cam.p(0, 0, 0), sC = c0 ? c0.s : 100;
  c.strokeStyle = "rgba(17,17,17,.3)"; c.lineWidth = Math.max(1, .012 * sC); c.beginPath();
  const n = Math.floor(u);
  for (let k = 0; k <= Math.min(n, 14); k++) {
    const r = R1 - .42 - k * .046, f = k < n ? 1 : u - n;
    circulo(c, cam, r, H, Math.max(4, Math.ceil(64 * f)), undefined, TH(0) - f * TAU, TH(0));
  }
  c.stroke();
}

// ---------- marcas escritas en la pista ----------
const K_TXT = .0072;
function marcas(c: Ctx, cam: Cam, t: number, u: number, ANCHO: number[][]) {
  // "vuelve a leer todo lo anterior": un marcatextos sigue a la bola y lo que ya pisó se queda encendido
  const aL = smooth(prog(t, A.encada - .1, A.encada + .1)) * (1 - smooth(prog(t, A.anteriorF + .1, A.poreso + .2)));
  if (aL > 0 && u > 6) {
    const c0 = cam.p(0, 0, 0), sC = c0 ? c0.s : 100;
    c.strokeStyle = ACENTO; c.globalAlpha = aL * .17; c.lineWidth = .96 * sC; c.lineCap = "butt"; c.beginPath();
    circulo(c, cam, RM, H + .002, 96, undefined, TH(6), TH(Math.min(u, 7))); c.stroke(); c.globalAlpha = 1;
  }
  c.font = serif(100, true); c.textAlign = "left"; c.textBaseline = "alphabetic";
  MARCAS.forEach((w, j) => {
    const ts = SELLO[j];
    if (t < ts) return;
    const edad = t - ts, cruz = CRUCES[j].filter((x) => x <= t).pop() ?? -9, flash = Math.exp(-(t - cruz) * 5);
    const nueva = j > 0 ? 1 - smooth(prog(edad, 1.6, 2.4)) : 0;
    const leida = t > A.encada && t < A.poreso && CRUCES[j].some((x) => x >= A.encada - .1 && x <= t) ? 1 : 0;
    const rojo = Math.max(nueva, flash, leida);
    const pop = j === 0 ? 1 : lerp(1.4, 1, ease.outBack(prog(edad, 0, .2)));
    const W = ANCHO[j], tot = W.reduce((a, b) => a + b, 0) * K_TXT;
    let d = -tot / 2;
    const thC = TH(SITIO[j]), rr = RM + .23;
    c.fillStyle = rojo > .5 ? ACENTO : TINTA; c.globalAlpha = clamp(prog(edad, 0, .06));
    for (let i = 0; i < w.length; i++) {
      const adv = W[i] * K_TXT, th = thC + (d + adv / 2) * pop / rr;
      const O: P3 = [rr * Math.cos(th), rr * Math.sin(th), H + .004], Ux: P3 = [-Math.sin(th), Math.cos(th), 0], Vy: P3 = [Math.cos(th), Math.sin(th), 0];
      plano(c, cam, O, Ux, Vy, K_TXT * pop, () => { c.fillText(w[i], -W[i] / 2, 0); });
      d += adv;
    }
    c.globalAlpha = 1;
    if (j > 0 && edad < .5) {            // el golpe del sello deja una onda de tinta
      const k = prog(edad, 0, .5), p = RM;
      const e = cam.p(p * Math.cos(thC), p * Math.sin(thC), H); if (!e) return;
      c.strokeStyle = ACENTO; c.lineWidth = 5 * (1 - k); c.globalAlpha = 1 - k;
      c.beginPath(); c.ellipse(e.x, e.y, (40 + 1.5 * e.s * k * 1.4), (22 + .8 * e.s * k * 1.4), 0, 0, TAU); c.stroke(); c.globalAlpha = 1;
    }
  });
}

// ---------- estaciones ----------
const T_NOMBRE = [A.mira, A.actua, A.revisa], NOMBRE = ["mira", "actúa", "revisa"];
function ojo(c: Ctx, x: number, y: number, R: number, mx: number, my: number, abre: number) {
  c.save(); c.translate(x, y);
  c.beginPath(); c.moveTo(-R, 0); c.quadraticCurveTo(0, -R * 1.25 * abre, R, 0); c.quadraticCurveTo(0, R * 1.25 * abre, -R, 0); c.closePath();
  c.fillStyle = "#fff"; c.fill(); c.save(); c.clip();
  c.fillStyle = TINTA; c.beginPath(); c.arc(mx * R * .32, my * R * .2, R * .46, 0, TAU); c.fill();
  c.fillStyle = "#fff"; c.beginPath(); c.arc(mx * R * .32 - R * .14, my * R * .2 - R * .14, R * .12, 0, TAU); c.fill(); c.restore();
  c.strokeStyle = TINTA; c.lineWidth = R * .13; c.lineJoin = "round"; c.beginPath(); c.moveTo(-R, 0); c.quadraticCurveTo(0, -R * 1.25 * abre, R, 0); c.quadraticCurveTo(0, R * 1.25 * abre, -R, 0); c.closePath(); c.stroke();
  c.restore();
}
function manoIcono(c: Ctx, x: number, y: number, R: number) {
  c.save(); c.translate(x, y + R * .3); c.strokeStyle = TINTA; c.fillStyle = TINTA; c.lineWidth = R * .24; c.lineCap = "round";
  for (const k of [-1, 0, 1]) { const a = -Math.PI / 2 + k * .62, l = R * (k === 0 ? 1.05 : .9); c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * l, Math.sin(a) * l); c.stroke(); }
  c.beginPath(); c.arc(0, 0, R * .42, 0, TAU); c.fill(); c.restore();
}
/** Revisar: una hoja con palomita. La lupa se habría leído como "buscar". */
function revisaIcono(c: Ctx, x: number, y: number, R: number) {
  c.save(); c.translate(x, y); c.strokeStyle = TINTA; c.lineWidth = R * .13; c.lineCap = "round"; c.lineJoin = "round";
  c.fillStyle = "#fff"; c.beginPath(); c.roundRect(-R * .56, -R * .66, R * 1.12, R * 1.42, R * .1); c.fill(); c.stroke();
  c.fillStyle = TINTA; c.beginPath(); c.roundRect(-R * .26, -R * .86, R * .52, R * .3, R * .08); c.fill();
  c.strokeStyle = ACENTO; c.lineWidth = R * .2; c.beginPath(); c.moveTo(-R * .3, R * .1); c.lineTo(-R * .06, R * .36); c.lineTo(R * .34, -R * .2); c.stroke(); c.restore();
}

const HUNDE = [A.yvuelve + .1, A.yvuelve + .75];
/** Las estaciones se hunden cuando ya cumplieron. La de actuar se dobla para que salga el restaurante. */
function hundido(g: number, t: number) {
  // No existen hasta que el agente sale: el arranque es solo la bola y la pista.
  const nace = A.cosa - .08 + g * .14;
  if (t < nace) return 1;
  let h = Math.max(0, 1 - ease.outBack(prog(t, nace, nace + .34), 1.8)); h = Math.max(h, ease.inCubic(prog(t, HUNDE[0], HUNDE[1])));
  if (g === 1) for (const n of [0, 1]) h = Math.max(h, smooth(prog(t, REST[n].sube - .22, REST[n].sube + .06)) * (1 - smooth(prog(t, REST[n].baja + .34, REST[n].baja + .62))));
  return h;
}
function porton(c: Ctx, cam: Cam, g: number, t: number, bx: number, by: number) {
  const hunde = hundido(g, t); if (hunde >= 1) return;
  const th = TH(g / 3), ca = Math.cos(th), sa = Math.sin(th), Z = lerp(2.5, H, hunde);
  const a0: P3 = [(R0 + .02) * ca, (R0 + .02) * sa, H], a1: P3 = [(R0 + .02) * ca, (R0 + .02) * sa, Z];
  const b0: P3 = [(R1 - .02) * ca, (R1 - .02) * sa, H], b1: P3 = [(R1 - .02) * ca, (R1 - .02) * sa, Z];
  palo(c, cam, a0, a1, .075); palo(c, cam, b0, b1, .075); palo(c, cam, a1, b1, .1);
  const rP = R0 + .02, p = cam.p(rP * ca, rP * sa, Z + .58); if (!p) return;
  const tw = T_NOMBRE[g], k = prog(t, tw - .14, tw + .14), R = Math.max(.58 * p.s, 26) * (1 - hunde);
  const flip = Math.abs(Math.cos(k * Math.PI));
  const activa = t >= tw && t < tw + 1.15;
  c.save(); c.translate(p.x, p.y);
  c.scale(Math.max(flip, .03) * (1 - hunde), 1 - hunde);
  if (k < .5) {
    c.fillStyle = "#fff"; c.strokeStyle = TINTA; c.lineWidth = R * .11; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill(); c.stroke();
    if (g === 0) {
      const dx = bx - p.x, dy = by - p.y, d = Math.hypot(dx, dy) || 1, parpadeo = (t % 3.7) < .12 ? .12 : 1;
      ojo(c, 0, 0, R * .78, dx / d, dy / d, parpadeo);
    } else if (g === 1) manoIcono(c, 0, 0, R * .64);
    else revisaIcono(c, 0, 0, R * .78);
  } else {
    const px = 86, an = NOMBRE[g].length * px * .44 + px * .8, al = px * 1.3;
    c.translate(Math.min(0, 972 - an / 2 - p.x) + Math.max(0, 104 + an / 2 - p.x), 0);   // la zona que tapa TikTok
    c.fillStyle = activa ? ACENTO : "#fff"; c.strokeStyle = activa ? ACENTO : TINTA; c.lineWidth = R * .1;
    c.beginPath(); c.roundRect(-an / 2, -al / 2, an, al, al * .28); c.fill(); c.stroke();
    texto(c, NOMBRE[g], 0, px * .3, { fuente: serif(px, true), color: activa ? "#fff" : TINTA });
  }
  c.restore();
}

// ---------- restaurantes ----------
const REST = [
  { sube: A.pregunta - .95, baja: A.ve - .85 },
  { sube: A.busca2 + .45, baja: A.caroF + .22 },
];
function sello(c: Ctx, txt: string, x: number, y: number, px: number, k: number, gira = -.09) {
  if (k <= 0) return;
  const z = lerp(1.9, 1, ease.outCubic(k)), al = clamp(k * 4);
  c.save(); c.translate(x, y); c.rotate(gira); c.scale(z, z); c.globalAlpha *= al;
  c.font = serif(px); const w = c.measureText(txt).width + px * .56, h = px * 1.3;
  c.fillStyle = "rgba(244,242,236,.9)"; c.fillRect(-w / 2, -h / 2, w, h);
  c.strokeStyle = ACENTO; c.lineWidth = px * .075; c.strokeRect(-w / 2, -h / 2, w, h);
  texto(c, txt, 0, px * .33, { fuente: serif(px), color: ACENTO });
  c.restore();
}
function fachada(c: Ctx, n: number, t: number) {
  const W = 430, Y = -320;
  c.fillStyle = "#FBFAF6"; c.strokeStyle = TINTA; c.lineWidth = 7; c.lineJoin = "round";
  c.beginPath(); c.rect(-W / 2, Y, W, -Y); c.fill(); c.stroke();
  c.fillStyle = TINTA; c.fillRect(-W / 2 - 12, Y - 26, W + 24, 30);
  // toldo a rayas
  const nR = 9, aR = (W + 24) / nR;
  for (let i = 0; i < nR; i++) {
    const x = -W / 2 - 12 + i * aR;
    c.fillStyle = i % 2 ? "#FBFAF6" : TINTA; c.strokeStyle = TINTA; c.lineWidth = 4;
    c.beginPath(); c.moveTo(x, Y + 4); c.lineTo(x + aR, Y + 4); c.lineTo(x + aR, Y + 58); c.arc(x + aR / 2, Y + 58, aR / 2, 0, Math.PI); c.closePath(); c.fill(); c.stroke();
  }
  // ventana
  const vx = -W / 2 + 26, vy = Y + 96, vw = 190, vh = 142;
  c.fillStyle = "#E7E3D8"; c.fillRect(vx, vy, vw, vh);
  c.save(); c.beginPath(); c.rect(vx, vy, vw, vh); c.clip();
  if (n === 0) {
    const r = azar(4);
    for (let i = 0; i < 11; i++) {
      const x = vx + 16 + (i % 4) * 54 + r() * 12, y = vy + 42 + Math.floor(i / 4) * 44 + r() * 8, f = r() * 6, z = 21 + r() * 6;
      bola(c, x, y + Math.sin(t * 7 + f) * 3, z);
    }
  } else {
    c.fillStyle = "#fff"; c.strokeStyle = TINTA; c.lineWidth = 4;
    c.beginPath(); c.moveTo(vx + 30, vy + 100); c.lineTo(vx + 160, vy + 100); c.lineTo(vx + 176, vy + 142); c.lineTo(vx + 14, vy + 142); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = TINTA; c.fillRect(vx + 92, vy + 66, 7, 34);
    c.fillStyle = ACENTO; c.beginPath(); c.ellipse(vx + 95.5, vy + 56 + Math.sin(t * 14) * 1.5, 7, 11, 0, 0, TAU); c.fill();
  }
  c.restore();
  c.strokeStyle = TINTA; c.lineWidth = 6; c.strokeRect(vx, vy, vw, vh);
  c.beginPath(); c.moveTo(vx + vw / 2, vy); c.lineTo(vx + vw / 2, vy + vh); c.stroke();
  // puerta
  const dx = 42, dw = 132, dy = Y + 96, dh = -Y - 96;
  const abre = n === 0 ? 0 : smooth(prog(t, A.este + .3, A.este + .62));
  c.fillStyle = "#1a1a19"; c.fillRect(dx, dy, dw, dh);
  c.fillStyle = "#F3EFE4"; c.strokeStyle = TINTA; c.lineWidth = 6;
  const hoja = dw * (1 - .78 * abre);
  c.beginPath(); c.rect(dx, dy, hoja, dh); c.fill(); c.stroke();
  c.fillStyle = TINTA; c.beginPath(); c.arc(dx + hoja - 18, dy + dh * .52, 8, 0, TAU); c.fill();
  if (n === 1) {
    const k = ease.outBack(prog(t, A.pero, A.pero + .3)), o = Math.sin(t * 3.2) * .08;
    if (k > 0 && t < A.caro + .02) {
      c.save(); c.translate(0, Y + 62); c.rotate(o); c.scale(1, clamp(k));
      c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 24); c.stroke();
      c.fillStyle = "#fff"; c.lineWidth = 5; c.beginPath(); c.roundRect(-104, 24, 208, 70, 12); c.fill(); c.stroke();
      texto(c, "$$$$$", 0, 78, { fuente: serif(62), color: TINTA }); c.restore();
    }
  }
  if (n === 0) sello(c, "LLENO", 0, -188, 118, prog(t, A.esta + .3, A.esta + .42));
  if (n === 1) sello(c, "CARÍSIMO", 0, -172, 80, prog(t, A.caro, A.caro + .12));   // arriba de la bola: es la palabra clave
}
function restaurante(c: Ctx, cam: Cam, n: number, t: number) {
  const { sube, baja } = REST[n], k = ease.outBack(prog(t, sube, sube + .42), 1.3) * (1 - smooth(prog(t, baja, baja + .34)));
  if (k <= .005) return;
  const u = PUERTA, th = TH(u), ca = Math.cos(th), sa = Math.sin(th), r = R0 - .12;
  const dobla = (1 - clamp(k)) * 1.5;                  // sale doblada del piso, como libro desplegable
  const O: P3 = [r * ca, r * sa, 0];
  const Ux: P3 = [-sa, ca, 0];
  const Vy: P3 = [ca * Math.sin(dobla), sa * Math.sin(dobla), -Math.cos(dobla)];
  plano(c, cam, O, Ux, Vy, .0105, () => fachada(c, n, t));
}

// ---------- monedas ----------
const JIT = (() => { const r = azar(23); return Array.from({ length: 130 }, () => [(r() - .5) * .07, (r() - .5) * .07, r()]); })();
function cilindro(c: Ctx, cam: Cam, x: number, y: number, z0: number, z1: number, R: number, lado: string | CanvasGradient, tapa: string) {
  const b = elipse(cam, x, y, z0, R), a = elipse(cam, x, y, z1, R); if (!a || !b) return;
  c.fillStyle = lado; c.beginPath(); c.moveTo(b.x - b.rx, b.y); c.ellipse(b.x, b.y, b.rx, b.ry, 0, Math.PI, 0, true); c.lineTo(a.x + a.rx, a.y); c.lineTo(a.x - a.rx, a.y); c.closePath(); c.fill();
  c.fillStyle = tapa; c.beginPath(); c.ellipse(a.x, a.y, a.rx, a.ry, 0, 0, TAU); c.fill();
}
function pilaMonedas(c: Ctx, cam: Cam, x: number, y: number, n: number, t: number, tUlt: number) {
  const fase = t - tUlt;
  for (let i = 0; i < n; i++) {
    const [dx, dy, f] = JIT[i % JIT.length];
    const cae = i === n - 1 && fase < .14 ? (1 - fase / .14) ** 2 * .9 : 0;
    const z0 = i * EMON + cae, X = x + dx, Y = y + dy, e = elipse(cam, X, Y, z0, RMON); if (!e) continue;
    cilindro(c, cam, X, Y, z0, z0 + EMON * .94, RMON, cobre(c, e.x, e.rx, f), i === n - 1 ? "#D9694B" : "#B8452B");
    const a = elipse(cam, X, Y, z0 + EMON * .94, RMON);
    if (a && a.ry > 5) {          // el canto y el borde de la cara
      c.strokeStyle = "rgba(60,14,6,.75)"; c.lineWidth = Math.max(1, a.s * .012);
      c.beginPath(); c.ellipse(a.x, a.y, a.rx, a.ry, 0, 0, TAU); c.stroke();
    }
    if (e.rx > 34) {
      c.strokeStyle = "rgba(50,12,6,.5)"; c.lineWidth = 1.2; c.beginPath();
      for (let k = 0; k < 16; k++) { const g = Math.PI * (k + .5) / 16, ax = e.x - Math.cos(g) * e.rx, h = Math.sin(g) * e.ry; c.moveTo(ax, e.y + h); c.lineTo(ax, e.y + h - EMON * e.s * .8); }
      c.stroke();
    }
  }
  if (n > 0) {
    const a = elipse(cam, x + JIT[(n - 1) % JIT.length][0], y + JIT[(n - 1) % JIT.length][1], (n - 1) * EMON + EMON * .94, RMON * .72);
    if (a && a.ry > 8) { c.strokeStyle = "rgba(90,26,12,.8)"; c.lineWidth = Math.max(1.4, a.s * .018); c.beginPath(); c.ellipse(a.x, a.y, a.rx, a.ry, 0, 0, TAU); c.stroke(); }
  }
}
/** Disco de moneda con cualquier orientación: n es su normal. */
function disco(c: Ctx, cam: Cam, x: number, y: number, z: number, n: P3, R: number) {
  const m = Math.hypot(n[0], n[1], n[2]) || 1, N: P3 = [n[0] / m, n[1] / m, n[2] / m];
  const ref: P3 = Math.abs(N[2]) > .9 ? [1, 0, 0] : [0, 0, 1];
  const e1: P3 = [N[1] * ref[2] - N[2] * ref[1], N[2] * ref[0] - N[0] * ref[2], N[0] * ref[1] - N[1] * ref[0]], l = Math.hypot(e1[0], e1[1], e1[2]);
  e1[0] /= l; e1[1] /= l; e1[2] /= l;
  const e2: P3 = [N[1] * e1[2] - N[2] * e1[1], N[2] * e1[0] - N[0] * e1[2], N[0] * e1[1] - N[1] * e1[0]];
  const gr = EMON * .55, sg = (N[0] * (cam.pos[0] - x) + N[1] * (cam.pos[1] - y) + N[2] * (cam.pos[2] - z)) >= 0 ? 1 : -1;
  const pol = (o: number, rr: number) => {
    let ok = true; const P: { x: number; y: number }[] = [];
    for (let i = 0; i < 36; i++) { const a = i / 36 * TAU, cc = Math.cos(a) * rr, ss = Math.sin(a) * rr, p = cam.p(x + cc * e1[0] + ss * e2[0] + N[0] * o, y + cc * e1[1] + ss * e2[1] + N[1] * o, z + cc * e1[2] + ss * e2[2] + N[2] * o); if (!p) { ok = false; break; } P.push(p); }
    return ok ? P : null;
  };
  const atras = pol(-sg * gr, R), frente = pol(sg * gr, R); if (!atras || !frente) return;
  const xs = frente.map((p) => p.x), x0 = Math.min(...xs), x1 = Math.max(...xs);
  const g = c.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, COBRE[0]); g.addColorStop(.45, COBRE[1]); g.addColorStop(1, COBRE[2]);
  c.fillStyle = COBRE[3]; c.strokeStyle = COBRE[3]; c.lineWidth = 2;
  for (let i = 0; i < 36; i++) { const a = atras[i], b = atras[(i + 1) % 36], d = frente[(i + 1) % 36], e = frente[i]; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(d.x, d.y); c.lineTo(e.x, e.y); c.closePath(); c.fill(); c.stroke(); }
  c.fillStyle = g; c.beginPath(); frente.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.fill();
  c.strokeStyle = "rgba(60,14,6,.75)"; c.lineWidth = Math.max(1.5, (x1 - x0) * .012); c.stroke();
  const an = pol(sg * gr, R * .78);
  if (an && x1 - x0 > 40) {
    c.lineWidth = Math.max(1.5, (x1 - x0) * .014); c.strokeStyle = "rgba(90,26,12,.8)"; c.beginPath(); an.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.stroke();
    plano(c, cam, [x + N[0] * sg * gr, y + N[1] * sg * gr, z + N[2] * sg * gr], e1, [-e2[0], -e2[1], -e2[2]], R / 100, () => { texto(c, "$", 0, 40, { fuente: serif(118), color: "rgba(80,22,10,.82)" }); });
  }
}
function vuelos(c: Ctx, cam: Cam, t: number, topeTorre: number) {
  // las monedas que están en el aire ahora mismo
  for (let i = Math.max(0, cuenta(t - .001) - 1); i < pista.monedas.length; i++) {
    const m = pista.monedas[i], e = t - m.t;
    if (e < 0) break;
    if (e > VUELO || m.j < 0) continue;
    const th = TH(SITIO[m.j]), x0 = RM * Math.cos(th), y0 = RM * Math.sin(th), k = e / VUELO;
    const x = lerp(x0, TOR.x, k), y = lerp(y0, TOR.y, k), z = lerp(H + .4, topeTorre + .2, k) + 3.4 * k * (1 - k) * 1.6;
    const g = e * 16 + i;
    disco(c, cam, x, y, z, [Math.sin(g), Math.cos(g) * .5, Math.cos(g)], RMON * .84);
  }
}

// ---------- monedas que llueven al final ----------
const LLUVIA = (() => {
  const r = azar(91);
  const thF0 = TH(U_FIN);
  return Array.from({ length: 96 }, (_, i) => {
    const a = thF0 + 1.15 + r() * (TAU - 2.3), d = Math.sqrt(r()) * 5.2;      // el lado del cierre queda limpio
    return { x: Math.cos(a) * d, y: Math.sin(a) * d, t0: A.todas + r() * (A.paguesF - A.todas + .5), g: r() * 6, z0: 9 + r() * 4 };
  });
})();
function lluvia(c: Ctx, cam: Cam, t: number) {
  for (const m of LLUVIA) {
    const e = t - m.t0; if (e < 0) continue;
    const d = Math.hypot(m.x, m.y), suelo0 = d > R0 && d < R1 ? H : 0, fuga = 1 - smooth(prog(e, .75, 1.05));
    if (fuga <= 0) continue;
    const tc = Math.sqrt(2 * m.z0 / 34);
    let z: number;
    if (e < tc) z = m.z0 - 17 * e * e;
    else { const a = e - tc; z = a < .24 ? 3.4 * a - 14 * a * a : 0; z = Math.max(z, 0); }
    const gira = e < tc + .24 ? e * 13 + m.g : 0;
    if (gira) disco(c, cam, m.x, m.y, suelo0 + z + .06, [Math.sin(gira), Math.cos(gira) * .6, Math.cos(gira) + .2], RMON * .62);
    else { const el = elipse(cam, m.x, m.y, suelo0 + .05, RMON * .62 * fuga); if (el) { c.fillStyle = COBRE[2]; c.beginPath(); c.ellipse(el.x, el.y + .05 * el.s, el.rx, el.ry, 0, 0, TAU); c.fill(); c.fillStyle = "#CF5A3B"; c.beginPath(); c.ellipse(el.x, el.y, el.rx, el.ry, 0, 0, TAU); c.fill(); } }
  }
}

// ---------- persona y valla ----------
/** Nosotros: hecho con el mismo hule que los brazos de la bola, para que viva en este mundo. */
function persona(c: Ctx, x: number, y: number, h: number, fase: number, rot: number, abierta = 1) {
  const g = h / 100;
  c.save(); c.translate(x, y); c.scale(-g, g); c.rotate(rot);
  c.strokeStyle = TINTA; c.fillStyle = TINTA; c.lineCap = "round"; c.lineJoin = "round";
  const seg = (ax: number, ay: number, a: number, l: number) => [ax + Math.sin(a) * l, ay + Math.cos(a) * l];
  const hip = [0, -50], sh = [10, -77];
  const pierna = (f: number) => {
    const a = Math.sin(f) * .72 * abierta, r = (.28 + .95 * (.5 + .5 * Math.sin(f - 1.15))) * abierta + .08;
    const [kx, ky] = seg(hip[0], hip[1], a + .06, 25), [px, py] = seg(kx, ky, a - r, 26);
    c.lineWidth = 7.4; c.beginPath(); c.moveTo(hip[0], hip[1]);
    c.quadraticCurveTo(2 * kx - (hip[0] + px) / 2, 2 * ky - (hip[1] + py) / 2, px, py); c.stroke();
    c.lineWidth = 10; c.beginPath(); c.moveTo(px, py); c.lineTo(px + 8, py + 1); c.stroke();
  };
  const manita = (f: number) => {
    const a = Math.sin(f) * .9 * abierta, [ex, ey] = seg(sh[0], sh[1], a, 18), [hx, hy] = seg(ex, ey, a + 1.2 * abierta + .1, 18);
    brazo(c, sh[0], sh[1], hx, hy, (ex - (sh[0] + hx) / 2) * -1.6 + (ey - (sh[1] + hy) / 2) * 0, .62, TINTA, 1, .3);
  };
  pierna(fase + Math.PI); manita(fase);
  c.lineWidth = 11; c.beginPath(); c.moveTo(hip[0], hip[1]); c.quadraticCurveTo(1, -64, sh[0], sh[1]); c.stroke();
  pierna(fase); manita(fase + Math.PI);
  bola(c, 15, -92, 13);
  c.restore();
}
function valla(c: Ctx, cam: Cam, u: number, tumba: number) {
  const th = TH(u), ca = Math.cos(th), sa = Math.sin(th), tx = Math.sin(th), ty = -Math.cos(th), A0 = RM - .62, B0 = RM + .62, Z = .86;
  const d = Math.sin(tumba * 1.5), z = Math.cos(tumba * 1.5) * Z;
  const p = (r: number, zz: number, dd: number): P3 => [r * ca + tx * dd, r * sa + ty * dd, H + zz];
  palo(c, cam, p(A0, 0, 0), p(A0, z, d), .05); palo(c, cam, p(B0, 0, 0), p(B0, z, d), .05);
  palo(c, cam, p(A0 - .1, 0, 0), p(A0 + .1, 0, 0), .05); palo(c, cam, p(B0 - .1, 0, 0), p(B0 + .1, 0, 0), .05);
  palo(c, cam, p(A0, z, d), p(B0, z, d), .08, ACENTO);
}

// ---------- la cámara ----------
const yBase = (t: number) => .08 * vaiven(t, 11) + .02 * vaiven(t, 4.3);
function vCorre(t: number): Vista {
  const th = TH(uHook(t));
  return { tx: (RM - .1) * Math.cos(th) + .4 * Math.sin(th), ty: (RM - .1) * Math.sin(th) - .4 * Math.cos(th), tz: 1.2, yaw: th, pitch: .27, dist: 3.75 };
}
const Y_CH = cerca(TH(uHook(A.chatbot)), TH(uHook(A.chatbot)) + Math.PI / 2 + .62);
const vChat0 = (t: number): Vista => ({ tx: PED.x, ty: PED.y, tz: 1.05, yaw: Y_CH - (t - A.chatbot) * .35, pitch: .28, dist: 6.4 });
const Y_AN1 = cerca(TH(uHook(A.cabe + .55)), 0);
const ancho = (t: number, y0 = 0, d = 11.3): Vista => ({ tx: 0, ty: .85, tz: 0, yaw: y0 + yBase(t), pitch: .94 + .02 * vaiven(t, 7), dist: d });
const vChat1 = (t: number): Vista => ({ tx: PED.x, ty: PED.y, tz: .42, yaw: Y_AN1 + 1.05 + .05 * vaiven(t, 9), pitch: .3, dist: 3.7 - .01 * (t - A.pides) });
function orb(dist: number, pitch: number, adentro = 1.05, lag = .32) {
  return (t: number): Vista => {
    const th = TH(U(t - lag));
    return { tx: (RM - adentro) * Math.cos(th), ty: (RM - adentro) * Math.sin(th), tz: 1, yaw: th + Math.PI / 2 + .05 * vaiven(t, 8), pitch: pitch + .012 * vaiven(t, 5), dist };
  };
}
const yawOrb = (t: number) => TH(U(t)) + Math.PI / 2;
const Y_ALTO = cerca(yawOrb(A.yvuelve + 1), 0), Y_L3 = cerca(yawOrb(A.busca3 + .6), 0);
const alto = (t: number): Vista => ({ tx: 0, ty: .46, tz: 0, yaw: Y_ALTO + (t - A.llamamos) * .06, pitch: 1.5, dist: 11.2 });
const Y_RA = Y_ALTO + (A.noes - A.llamamos) * .06, GIRO = .52, Y_OB = Y_RA - GIRO * (A.cada - A.noes);
// Rasante alrededor del centro: el chatbot quieto y la torre creciendo, con la bola pasando enfrente.
const rasa = (t: number): Vista => ({ tx: .15, ty: 0, tz: 1.5, yaw: Y_RA - GIRO * (t - A.noes), pitch: .3, dist: 7.9 });
const obli = (t: number): Vista => ({ tx: .1, ty: .3, tz: .5, yaw: Y_OB + yBase(t), pitch: .86, dist: 12 });
const Y_NORTE = cerca(Y_OB - 1.3, Y_ALTO - Math.PI) + .28;
const vTorre = (t: number): Vista => ({ tx: .3, ty: .2, tz: 4.1, yaw: Y_NORTE + .05 * vaiven(t, 6), pitch: .2, dist: 13.2 });
const ballF = () => { const th = TH(10); return { x: RM * Math.cos(th), y: RM * Math.sin(th) }; };
const vFreno = (t: number): Vista => ({ tx: ballF().x, ty: ballF().y, tz: H + RB, yaw: Y_NORTE - .28, pitch: .3, dist: 3.85 - .02 * (t - A.sabes) });
const alto2 = (t: number): Vista => ({ tx: 0, ty: 0, tz: 0, yaw: Y_NORTE - .28 + (t - A.unico) * .07, pitch: 1.47, dist: 11.4 });
const U_V = .79, thV = TH(U_V);
const vLado = (t: number): Vista => ({ tx: (RM + .2) * Math.cos(thV), ty: (RM + .2) * Math.sin(thV), tz: 1.5, yaw: thV + Math.PI / 2 + cerca(Y_NORTE - thV, 0) + .02 * vaiven(t, 6) - (t - A.nos) * .012, pitch: .24, dist: 5.9 });
const anchoN = (t: number): Vista => ({ tx: 0, ty: 0, tz: .5, yaw: Y_NORTE - .28 + yBase(t) - (t - A.solo) * .05, pitch: .88, dist: 13.4 });
const U_F = U_FIN, thF = TH(U_F);
const vFin = (t: number): Vista => ({ tx: RM * Math.cos(thF), ty: RM * Math.sin(thF), tz: .9, yaw: cerca(Y_NORTE - .28 - (A.paguesF - A.solo) * .05, thF + Math.PI / 2) + .56 + .03 * vaiven(t, 7), pitch: .4 + (t - A.paguesF) * .004, dist: 4.3 });

const TOMAS: { t: number; d: number; v: (t: number) => Vista; c?: (x: number) => number }[] = [
  { t: 0, d: 0, v: vCorre },
  { t: A.chatbot - .3, d: .3, v: vChat0, c: ease.inOutCubic },
  { t: A.agente - .27, d: .28, v: vCorre, c: ease.inOutCubic },
  { t: A.cabe + .02, d: 1.5, v: (t) => ancho(t, Y_AN1), c: ease.inOutCubic },
  { t: A.vuelveF + .2, d: 1.15, v: vChat1, c: ease.inOutCubic },
  { t: A.acabaF + .2, d: .01, v: (t) => ancho(t, 0) },
  { t: A.pregunta - 1.15, d: 1.05, v: orb(7.7, .42), c: ease.inOutCubic },
  { t: A.ve - .8, d: .75, v: orb(6.9, .54, .35), c: ease.inOutCubic },
  { t: A.piensa - .45, d: .75, v: orb(8.4, .6, .6), c: ease.inOutCubic },
  { t: A.busca2 + .3, d: 1.05, v: orb(7.7, .42), c: ease.inOutCubic },
  { t: A.caroF + .05, d: .7, v: orb(6.9, .54, .35), c: ease.inOutCubic },
  { t: A.busca3, d: 1.1, v: (t) => ancho(t, Y_L3, 12.7), c: ease.inOutCubic },
  { t: A.yvuelve - .15, d: 2.3, v: alto, c: ease.inOutCubic },
  { t: A.noes - .3, d: .95, v: rasa, c: ease.inOutCubic },
  { t: A.cada - .15, d: 1.0, v: obli, c: ease.inOutCubic },
  { t: A.poreso - .2, d: 2.35, v: vTorre, c: ease.inOutCubic },
  { t: A.vecesF + .5, d: 1.5, v: vFreno, c: ease.inOutCubic },
  { t: A.unico - .1, d: .35, v: alto2, c: ease.inOutCubic },
  { t: A.hizo + .3, d: 1.2, v: vLado, c: ease.inOutCubic },
  { t: A.listo + .15, d: .01, v: anchoN },
  { t: A.paguesF + .1, d: 1.5, v: vFin, c: ease.inOutCubic },
];
function vistaEn(t: number) {
  let v = TOMAS[0].v(t);
  for (let i = 1; i < TOMAS.length; i++) {
    const q0 = TOMAS[i]; if (t < q0.t) break;
    v = mezclaVista(v, q0.v(t), (q0.c ?? smooth)(prog(t, q0.t, q0.t + q0.d)));
  }
  return v;
}

// ---------- la bola ----------
const T_ESP = A.agente2 - .62;     // la espiral arranca en el silencio: el negro dura menos de medio segundo
const spk = (t: number) => prog(t, T_ESP, A.cosa + .02);
const GOLPES: [number, number][] = [[A.intentar, 16], [A.esta + .3, 12], [SELLO[1], 14], [A.caro, 12], [SELLO[2], 14], [SELLO[3], 16], [A.paga, 26], [A.vecesF + .55, 12], [A.fallar, 18], [A.acabaF, 14]];
function sacude(t: number) { let s = 0; for (const [g, a] of GOLPES) if (t >= g && t < g + .6) s = Math.max(s, a * Math.exp(-(t - g) * 8)); return s; }

function estadoBola(t: number) {
  if (t < A.vuelveF + 1.4) {
    // Se despide al empezar la bajada al chatbot: si sigue corriendo, se cruza enfrente de él.
    const u = uHook(t), th = TH(u), hop = .24 * Math.abs(Math.sin(Math.PI * 9 * u));
    return { x: RM * Math.cos(th), y: RM * Math.sin(th), z: H + RB + hop, suelo: H, u, vel: 1 / HOOK_V, vis: t < A.vuelveF + .3 };
  }
  if (t < T_ESP) return { x: 0, y: 0, z: 0, suelo: 0, u: 0, vel: 0, vis: false };
  const k = spk(t);
  if (k < 1) {
    const r = lerp(.25, RM, smooth(k ** .8)), th = TH(0) + (1 - ease.outCubic(k)) * TAU * 2.3;
    const z = r < R0 ? 0 : smooth(prog(r, R0 - .1, R0 + .2)) * H;
    return { x: r * Math.cos(th), y: r * Math.sin(th), z: z + RB + .14 * Math.abs(Math.sin(t * 19)), suelo: z, u: 0, vel: 1, vis: true };
  }
  const u = U(t);
  const v = velo(t), th = TH(u), hop = .26 * Math.abs(Math.sin(Math.PI * HOPS * u)) * clamp(v / .1);
  let extra = 0;
  for (const j of [1, 2, 3]) extra = Math.max(extra, Math.sin(Math.PI * clamp((t - (SELLO[j] - .34)) / .34)) * 1.05);
  return { x: RM * Math.cos(th), y: RM * Math.sin(th), z: H + RB + hop + extra, suelo: H, u, vel: v, vis: true };
}

function dibujaBola(c: Ctx, cam: Cam, t: number, b: ReturnType<typeof estadoBola>) {
  const p = cam.p(b.x, b.y, b.z), s = cam.p(b.x, b.y, b.suelo); if (!p || !s) return;
  const r = RB * p.s, g = r / 90;
  const ad = cam.p(RM * Math.cos(TH(b.u + .015)), RM * Math.sin(TH(b.u + .015)), b.suelo);
  const dx0 = ad ? ad.x - s.x : 1, dy0 = ad ? ad.y - s.y : 0, dl = Math.hypot(dx0, dy0) || 1, fx = dx0 / dl, fy = dy0 / dl;
  const hook = t < A.cabe, rapida = hook ? 0 : clamp((b.vel - .14) / .5), f = Math.PI * 7 * b.u, mov = clamp(b.vel / .1);
  // en reposo, a los lados; corriendo, bombean; a toda velocidad, van hacia atrás
  const cor = (l: number) => {
    const o = Math.sin(f) * l;
    return q(p.x + fx * o * 120 * g - l * 8 * g, p.y + fy * o * 120 * g - 72 * g - Math.abs(Math.cos(f)) * 26 * g);
  };
  const m1r = cor(1), m2r = cor(-1);
  const m1a = q(p.x - fx * 200 * g - 60 * g, p.y - fy * 200 * g - 72 * g + Math.sin(t * 40) * 8 * g), m2a = q(p.x - fx * 200 * g + 60 * g, p.y - fy * 200 * g - 12 * g + Math.cos(t * 37) * 8 * g);
  const m1q = q(p.x - 158 * g, p.y + 16 * g + Math.sin(t * 2.2) * 8 * g), m2q = q(p.x + 158 * g, p.y + 22 * g + Math.cos(t * 2.5) * 8 * g);
  let m1 = q(lerp(lerp(m1q[0], m1r[0], mov), m1a[0], rapida), lerp(lerp(m1q[1], m1r[1], mov), m1a[1], rapida));
  let m2 = q(lerp(lerp(m2q[0], m2r[0], mov), m2a[0], rapida), lerp(lerp(m2q[1], m2r[1], mov), m2a[1], rapida));
  let ab1 = .6, ab2 = .6;
  // toca la puerta
  const toca = (ini: number, fin2: number, golpes: number[]) => {
    const k = smooth(prog(t, ini, ini + .2)) * (1 - smooth(prog(t, fin2, fin2 + .2)));
    if (k <= 0) return;
    const th = TH(PUERTA), dp = cam.p((R0 - .15) * Math.cos(th) + .35 * Math.sin(th) * -1, (R0 - .15) * Math.sin(th) + .35 * Math.cos(th), 1.4);
    if (!dp) return;
    let g2 = 0;
    for (const y of golpes) if (t >= y - .1 && t < y + .12) g2 = 1 - Math.abs(t - y) / .12;
    m2 = q(lerp(m2[0], dp.x, k), lerp(m2[1], dp.y + 26 * clamp(1 - g2), k)); ab2 = .08;
  };
  toca(A.pregunta - .35, A.esta + .4, [A.pregunta + .03, A.pregunta + .25]);
  toca(A.este - .3, A.este + .3, [A.este + .1]);
  // piensa: mano a la "barbilla"
  const pz = smooth(prog(t, A.piensa - .1, A.piensa + .1)) * (1 - smooth(prog(t, A.busca2 - .2, A.busca2)));
  if (pz > 0) { m1 = q(lerp(m1[0], p.x - 62 * g, pz), lerp(m1[1], p.y + 110 * g, pz)); ab1 = lerp(ab1, .1, pz); }
  // sella con las dos manos arriba
  for (const j of [1, 2, 3]) {
    const k = Math.sin(Math.PI * clamp((t - (SELLO[j] - .5)) / .62));
    if (k > 0) { m1 = q(lerp(m1[0], p.x - 150 * g, k), lerp(m1[1], p.y - 190 * g, k)); m2 = q(lerp(m2[0], p.x + 150 * g, k), lerp(m2[1], p.y - 190 * g, k)); ab1 = lerp(ab1, .9, k); ab2 = lerp(ab2, .9, k); }
  }
  // el final: extiende la mano, esperando que le paguen
  const pide = ease.outBack(prog(t, A.paguesF + 2.15, A.paguesF + 2.65), 1.4);
  sombra(c, s.x, s.y + 2, 150 * g * (1 + (b.z - b.suelo - RB) * .4), .34 / (1 + (b.z - b.suelo - RB) * 1.4));
  if (hook) {          // corre hacia la cámara: las manos van por delante del cuerpo
    const o = Math.sin(f * 1.0);
    bola(c, p.x, p.y, r);
    brazo(c, p.x - 70 * g, p.y + 8 * g, p.x - 200 * g - o * 40 * g, p.y + 100 * g + o * 96 * g, 50 * g, .8, TINTA, 1, g * (1.02 + o * .25));
    brazo(c, p.x + 70 * g, p.y + 8 * g, p.x + 200 * g - o * 40 * g, p.y + 100 * g - o * 96 * g, -50 * g, .8, TINTA, 1, g * (1.02 - o * .25));
  } else if (pide > 0) {  // la palma hacia arriba, esperando: la curva del brazo es lo que hace que pida
    const hx = lerp(m2[0], p.x + 250 * g, pide), hy = lerp(m2[1], p.y + 8 * g, pide);
    brazo(c, p.x - 54 * g, p.y - 50 * g, m1[0], m1[1], 90 * g, .6, TINTA, 1, g);
    brazo(c, p.x + 60 * g, p.y - 10 * g, hx, hy, lerp(-100, 120, clamp(pide)) * g, lerp(.6, 1, clamp(pide)), TINTA, 1, g);
    bola(c, p.x, p.y, r);
  } else agente(c, p.x, p.y, r, m1, m2, { abre1: ab1, abre2: ab2 });
  // piensa: tres puntos
  for (let i = 0; i < 3; i++) {
    const k = ease.outBack(prog(t, A.piensa + .02 + i * .22, A.piensa + .2 + i * .22)) * (1 - smooth(prog(t, A.busca2 - .18, A.busca2)));
    if (k > 0) { c.fillStyle = i === 2 ? ACENTO : TINTA; c.beginPath(); c.arc(p.x - 92 * g + i * 92 * g, p.y - 164 * g - i * 12 * g, 23 * g * clamp(k, 0, 1.2), 0, TAU); c.fill(); }
  }
}
/** Rayas de velocidad detrás de la bola, en el piso. */
function estela(c: Ctx, cam: Cam, u: number, vel: number) {
  const k = clamp((vel - .2) / .6); if (k <= 0) return;
  const c0 = cam.p(0, 0, 0), sC = c0 ? c0.s : 100;
  c.lineCap = "round";
  for (const [dr, l, a] of [[-.3, .09, .24], [0, .15, .38], [.3, .07, .2]] as const) {
    c.strokeStyle = `rgba(17,17,17,${a * k})`; c.lineWidth = Math.max(2, .05 * sC); c.beginPath();
    circulo(c, cam, RM + dr, H + .01, 14, undefined, TH(u - .012), TH(u - .012 - l * k * 1.8)); c.stroke();
  }
}

// ---------- el chatbot ----------
function pedestal(c: Ctx, cam: Cam, x: number, y: number) {
  const e = elipse(cam, x, y, 0, PED.r); if (!e) return;
  const g = c.createLinearGradient(e.x - e.rx, 0, e.x + e.rx, 0);
  g.addColorStop(0, "#d9d5ca"); g.addColorStop(.3, "#FBFAF6"); g.addColorStop(.7, "#cfcabd"); g.addColorStop(1, "#8f8b80");
  sombra(c, e.x, e.y + 4, e.rx * 1.45, .3);
  cilindro(c, cam, x, y, 0, PED.h, PED.r, g, "#FBFAF6");
  const a = elipse(cam, x, y, PED.h, PED.r)!; c.strokeStyle = TINTA; c.lineWidth = Math.max(2, a.s * .022); c.beginPath(); c.ellipse(a.x, a.y, a.rx, a.ry, 0, 0, TAU); c.stroke();
  c.beginPath(); c.moveTo(e.x - e.rx, e.y); c.lineTo(a.x - a.rx, a.y); c.moveTo(e.x + e.rx, e.y); c.lineTo(a.x + a.rx, a.y); c.stroke();
  c.beginPath(); c.ellipse(e.x, e.y, e.rx, e.ry, 0, 0, Math.PI); c.stroke();
}
function bolaChat(c: Ctx, cam: Cam, t: number) {
  const off = t >= A.acaba + .12 && t < A.solo + .3;
  const res = t > A.ytt - .24 && t < A.ytt + .35 ? Math.sin((t - A.ytt) * 60) * .012 : 0;
  const hin = lerp(1, 1.05, t > A.ytt - .1 && t < A.ytt + .2 ? Math.sin(Math.PI * prog(t, A.ytt - .1, A.ytt + .2)) : 0);
  const p = cam.p(PED.x + res, PED.y, PED.h + RB * hin + .01 * vaiven(t, 1.9)); if (!p) return;
  const r = RB * p.s * hin;
  if (!off) { bola(c, p.x, p.y, r); return; }
  const g = c.createRadialGradient(p.x - r * .2, p.y - r * .24, r * .05, p.x, p.y, r);
  g.addColorStop(0, "#a7a49c"); g.addColorStop(1, "#7d7a72");
  c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, r, 0, TAU); c.fill();
  c.strokeStyle = "#3d3c38"; c.lineWidth = Math.max(1.5, r * .03); c.stroke();
}
function gorro(c: Ctx, x: number, y: number, z: number, g = 0) {
  c.save(); c.translate(x, y); c.rotate(g); c.scale(z, z);
  c.fillStyle = ACENTO; c.beginPath(); c.moveTo(-40, 42); c.lineTo(0, -48); c.lineTo(40, 42); c.closePath(); c.fill();
  c.fillStyle = TINTA; c.beginPath(); c.arc(0, -52, 12, 0, TAU); c.fill(); c.restore();
}
function escenaChat(c: Ctx, cam: Cam, t: number) {
  if (t < A.pides - .1 || t > A.acabaF + .1) return;
  const o = cam.p(PED.x, PED.y, PED.h + RB); if (!o) return;
  // la tarjeta: entra volando y la bola se la traga
  const entra = ease.outCubic(prog(t, A.pides - .05, A.pides + .62)), traga = ease.inCubic(prog(t, A.ytt - .38, A.ytt - .08));
  if (entra > 0 && traga < 1) {
    const x = lerp(lerp(1320, 540, entra), o.x, traga), y = lerp(lerp(1640, 1290, entra), o.y, traga) + Math.sin(t * 2.4) * 8 * (1 - traga);
    const z = lerp(1, .05, traga), g = lerp(.28, -.04, entra) + traga * 1.4 + Math.sin(t * 1.9) * .012;
    c.save(); c.translate(x, y); c.rotate(g); c.scale(z, z);
    c.fillStyle = "rgba(20,18,14,.13)"; c.beginPath(); c.roundRect(-326, -112, 664, 256, 18); c.fill();
    c.fillStyle = "#FFFEFA"; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.roundRect(-336, -128, 672, 256, 18); c.fill(); c.stroke();
    texto(c, "¿un lugar para", -18, -18, { fuente: serif(88), color: TINTA });
    texto(c, "la fiesta?", -18, 80, { fuente: serif(96, true), color: ACENTO });
    gorro(c, 258, 34, 1.05, .14);
    c.restore();
  }
  // la lista: sale como un recibo por debajo de la bola, y es lo último que hace
  const sale = ease.outCubic(prog(t, A.lista - .12, A.lista + .56));
  if (sale > 0) {
    const yS = o.y + RB * o.s * .62, w = 620, l = 490 * sale;
    c.save(); c.beginPath(); c.rect(0, yS, 1080, l + 30); c.clip();
    const yt = yS + l - 460;
    c.fillStyle = "#FFFEFA"; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.rect(540 - w / 2, yt - 60, w, 520); c.fill(); c.stroke();
    ["un restaurante", "un salón", "un jardín"].forEach((s2, i) => { texto(c, `${i + 1}. ${s2}`, 540 - w / 2 + 52, yt + 118 + i * 124, { fuente: serif(84), color: TINTA, alin: "left" }); });
    c.restore();
    bolaChat(c, cam, t);
  }
}
function iris(c: Ctx, cam: Cam, t: number) {
  const ini = A.acaba + .22, fin = A.acabaF + .1, abre0 = T_ESP, abre1 = A.cosa + .46;
  if (t < ini || t >= abre1) return;
  c.fillStyle = NOCHE;
  if (t < fin) {
    const o = cam.p(PED.x, PED.y, PED.h + RB)!, k = prog(t, ini, fin);
    const rr = lerp(1500, 240, smooth(prog(k, 0, .55))) * (1 - smooth(prog(k, .68, 1)));
    c.beginPath(); c.rect(-120, -120, 1320, 2160); c.arc(o.x, o.y, Math.max(rr, .1), 0, TAU, true); c.fill("evenodd");
    return;
  }
  if (t < abre0) { c.fillRect(-120, -120, 1320, 2160); return; }
  // se abre desde adentro: el agujero siempre es un poco más grande que el radio de la bola
  const k = spk(t), rb = lerp(.25, RM, smooth(k ** .8)), rh = (rb + 1.15) * (1 + 22 * smooth(prog(t, A.cosa - .08, abre1)) ** 2);
  c.beginPath(); c.rect(-120, -120, 1320, 2160);
  let ini2 = true;
  for (let i = 0; i <= 72; i++) { const a = i / 72 * TAU, p = cam.p(rh * Math.cos(a), rh * Math.sin(a), 0); if (!p) continue; if (ini2) { c.moveTo(p.x, p.y); ini2 = false; } else c.lineTo(p.x, p.y); }
  c.closePath(); c.fill("evenodd");
}

// ---------- el mundo ----------
function mundo(c: Ctx, cam: Cam, t: number, d: { ancho: number[][] }) {
  const b = estadoBola(t), pb = cam.p(b.x, b.y, b.z);
  suelo(c, cam); pistaBase(c, cam, t);
  const uVis = t > A.busca - .1 ? b.u : 0;
  if (t > A.busca - .1) huellas(c, cam, uVis);
  marcas(c, cam, t, uVis, d.ancho);
  if (b.vis) estela(c, cam, b.u, b.vel);
  const S: { z: number; f: () => void }[] = [];
  const pon = (x: number, y: number, z: number, f: () => void, sesgo = 0) => { const p = cam.p(x, y, z); if (p) S.push({ z: p.zc + sesgo, f }); };
  for (let g = 0; g < 3; g++) { const th = TH(g / 3); pon(RM * Math.cos(th), RM * Math.sin(th), 1, () => porton(c, cam, g, t, pb ? pb.x : 540, pb ? pb.y : 900)); }
  pon(PED.x, PED.y, .3, () => { pedestal(c, cam, PED.x, PED.y); bolaChat(c, cam, t); });
  const nC = cuenta(t), nT = Math.min(nC, 55), uC = CAE[Math.max(nT - 1, 0)];
  const conTorre = t < A.ninguna;       // lo gastado se queda atrás: del giro en adelante la pista está limpia
  if (nT > 0 && conTorre) pon(TOR.x, TOR.y, .3, () => pilaMonedas(c, cam, TOR.x, TOR.y, nT, t, uC));
  const nP = t < A.lista + .7 ? 0 : t < A.veces ? 1 : 1 + Math.floor(9 * ease.outCubic(prog(t, A.veces, A.vecesF - .05)));
  if (nP > 0 && conTorre) pon(PILA.x, PILA.y, .2, () => pilaMonedas(c, cam, PILA.x, PILA.y, nP, t, t < A.veces ? A.lista + .7 : A.veces + (nP - 1) * .08));
  for (let n = 0; n < 2; n++) if (t > REST[n].sube && t < REST[n].baja + .4) { const th = TH(PUERTA); pon((R0 - .1) * Math.cos(th), (R0 - .1) * Math.sin(th), 1.2, () => restaurante(c, cam, n, t)); }
  if (b.vis) pon(b.x, b.y, b.z, () => dibujaBola(c, cam, t, b), -.1);
  // la persona, sobre la pista
  if (t > A.nos && t < A.listo + .25) escenaPersona(c, cam, t, pon);
  S.sort((p, r) => r.z - p.z).forEach((s) => s.f());
  vuelos(c, cam, t, nT * EMON);
  if (t > A.todas - .1) lluvia(c, cam, t);
  // "una respuesta": la única cosa que hizo el chatbot
  const aR = smooth(prog(t, A.respuesta - .05, A.respuesta + .2)) * (1 - smooth(prog(t, A.muchas - .3, A.muchas)));
  if (aR > 0) {
    const e = cam.p(PED.x, PED.y, PED.h + RB);
    if (e) { c.strokeStyle = ACENTO; c.lineWidth = 7; c.globalAlpha = aR; c.beginPath(); c.arc(e.x, e.y, RB * e.s + 13, 0, TAU); c.stroke(); c.globalAlpha = 1; }
  }
  // la moneda grande
  if (t > A.paga - .5 && t < A.paga + .05) {
    const k = prog(t, A.paga - .46, A.paga), z = lerp(11.2, nT * EMON + .2, k ** 2), g = t * 15;
    disco(c, cam, TOR.x, TOR.y, z, [Math.sin(g) * .9, .22, Math.cos(g) * .9 + .1], RMON);
  }
  // la última moneda: rueda, se inclina y se asienta
  if (t > A.paguesF + .05) monedaFinal(c, cam, t);
}

const T_ROD = A.paguesF + .32, T_FIN = T_ROD + 2.2;
function monedaFinal(c: Ctx, cam: Cam, t: number) {
  const thM = TH(U_F + .082), x = RM * Math.cos(thM), y = RM * Math.sin(thM);
  const k = prog(t, T_ROD, T_FIN);
  const vuelo = 1 - smooth(prog(t, A.paguesF + .05, T_ROD));
  const al = lerp(1.2, .0, k ** .62), pr = 44 * (1 - Math.sqrt(1 - k)) ** 1 * 2.3 + .4, n: P3 = [Math.sin(al) * Math.cos(pr), Math.sin(al) * Math.sin(pr), Math.cos(al)];
  disco(c, cam, x, y, H + EMON * .5 + RMON * Math.sin(al) + vuelo * 3.4, n, RMON);
}

function escenaPersona(c: Ctx, cam: Cam, t: number, pon: (x: number, y: number, z: number, f: () => void, s?: number) => void) {
  const U1 = U_V - .045, U2 = U_V + .05;
  const posV = (u: number) => { const th = TH(u); return [RM * Math.cos(th), RM * Math.sin(th)]; };
  const [x1, y1] = posV(U1), [x2, y2] = posV(U2);
  const tumba = smooth(prog(t, A.fallar - .04, A.fallar + .2));
  pon(x1, y1, .4, () => valla(c, cam, U1, tumba));
  pon(x2, y2, .4, () => valla(c, cam, U2, 0));
  // Posición en la pista por tramos
  const v0 = A.nos + .9, tSalto = A.probar + .22, tSube = A.ajustar + .02, tCorre = A.ajustar + .34, tSalto2 = A.ajustarF + .02;
  const u = t < v0 ? -1 : t < A.fallar ? lerp(U_V - .22, U1 - .006, prog(t, v0, A.fallar))
    : t < tCorre ? lerp(U1 - .006, U1 + .03, ease.outCubic(prog(t, A.fallar, A.fallar + .34)))
      : lerp(U1 + .03, U_V + .2, prog(t, tCorre, A.listo + .25) ** 1.1);
  if (u < 0) return;
  const [x, y] = posV(u), sup = H;
  let zs = 0, rot = .16, abierta = 1;
  if (t >= tSalto && t < A.fallar) zs = .85 * Math.sin(Math.PI * prog(t, tSalto - .02, A.fallar + .22));
  if (t >= A.fallar) {
    rot = lerp(.16, 1.52, smooth(prog(t, A.fallar, A.fallar + .26)) * (1 - smooth(prog(t, tSube - .06, tSube + .24))));
    abierta = 1 - .55 * smooth(prog(t, A.fallar, A.fallar + .2)) * (1 - smooth(prog(t, tSube, tSube + .2)));
  }
  if (t >= tSalto2) zs = 1.72 * Math.sin(Math.PI * clamp(prog(t, tSalto2, tSalto2 + .66)));
  const quieto = t >= A.fallar && t < tCorre;
  const fase = quieto ? 2 : (t - v0) * 17;
  pon(x, y, 1, () => {
    const p = cam.p(x, y, sup + zs), s0 = cam.p(x, y, sup); if (!p || !s0) return;
    const al = 2.5 * p.s;
    sombra(c, s0.x, s0.y + 2, 90 * p.s / 100, .28 / (1 + zs));
    persona(c, p.x, p.y, al, fase, rot, abierta);
  }, -.2);
}

// ---------- capa de texto y escenas planas ----------
function contador(c: Ctx, t: number) {
  const a = smooth(prog(t, A.busca - .1, A.busca + .25)) * (1 - smooth(prog(t, A.vecesF + 1.0, A.vecesF + 1.6))) + smooth(prog(t, A.solo + .2, A.solo + .6));
  if (a <= .01) return;
  const n = cuenta(t), edad = t - (n > 0 ? CAE[n - 1] : -9), pulso = Math.exp(-edad * 12) * .12;
  const x = 148, y = 236;
  c.save(); c.globalAlpha = a; c.translate(x, y); c.scale(1 + pulso, 1 + pulso);
  const g = c.createLinearGradient(-58, -58, 58, 58); g.addColorStop(0, COBRE[0]); g.addColorStop(.5, COBRE[1]); g.addColorStop(1, COBRE[2]);
  c.fillStyle = COBRE[3]; c.beginPath(); c.arc(0, 6, 56, 0, TAU); c.fill();
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, 56, 0, TAU); c.fill();
  c.strokeStyle = "rgba(80,22,10,.8)"; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 44, 0, TAU); c.stroke();
  texto(c, "$", 0, 24, { fuente: serif(70), color: "rgba(80,22,10,.85)" });
  c.restore();
  texto(c, String(n), 226, 282, { fuente: serif(132), color: TINTA, alin: "left", alfa: a });
  const lap = n > 0 ? pista.monedas[n - 1].v + 1 : 0;
  if (lap > 0 && lap <= 10) {
    const anchoN = String(n).length * 66;
    texto(c, `+${lap}`, 226 + anchoN + 34, 274, { fuente: serif(84, true), color: ACENTO, alfa: a * (.75 + pulso * 2) });
  }
}

function blanco(t: number) {
  const a = smooth(prog(t, A.ninguna - .36, A.ninguna + .02)) * (1 - smooth(prog(t, A.unico - .2, A.unico + .3)));
  const b = smooth(prog(t, A.listo - .1, A.listo + .22)) * (1 - smooth(prog(t, A.solo + .02, A.solo + .34)));
  return Math.max(a, b);
}
const B0 = { x: 540, y: 1040, r: 162 };
function escenaGiro(c: Ctx, t: number, cam: Cam) {
  if (t < A.ninguna - .1 || t > A.unico + .32) return;
  const reab = smooth(prog(t, A.unico - .1, A.unico + .3));
  const th = TH(10), tierra = cam.p(RM * Math.cos(th), RM * Math.sin(th), H + RB), rW = tierra ? RB * tierra.s : 50;
  const flota = 1 - reab, fx = 7 * vaiven(t, 3.7) * flota, fy = 11 * vaiven(t, 2.6) * flota;
  const x0 = (tierra ? lerp(B0.x, tierra.x, reab) : B0.x) + fx, y0 = (tierra ? lerp(B0.y, tierra.y, reab) : B0.y) + fy, r0 = lerp(B0.r, rW, reab);
  const abre = ease.outCubic(prog(t, A.ninguna + .02, A.ninguna + .3)) * (1 - ease.inOutCubic(prog(t, A.inteligenteF - .34, A.inteligenteF - .04)));
  const G = Array.from({ length: 10 }, (_, i) => ({ x: 540 + ((i % 5) - 2) * 190, y: i < 5 ? 830 : 1228, r: 76 }));
  if (abre > 0.001) {
    for (let i = 9; i >= 0; i--) {
      const x = lerp(B0.x, G[i].x, abre), y = lerp(B0.y, G[i].y, abre) + Math.sin(t * 2.2 + i * 1.3) * 8 * abre, r = lerp(B0.r, G[i].r, abre);
      agente(c, x, y, r, q(x - r * .8, y - r * 1.34), q(x + r * .8, y - r * 1.34), { abre1: .55, abre2: .55 });
      const vista = t >= PLANTILLA[i];
      texto(c, String(i + 1), x, y + r + 66, { fuente: serif(68), color: vista ? ACENTO : TINTA, alfa: smooth(prog(abre, .6, 1)) });
    }
    // la plantilla roja: el mismo contorno calza en cada bola
    if (t >= PLANTILLA[0] - .1) {
      let i = 0; while (i < 9 && t >= PLANTILLA[i + 1]) i++;
      const j = Math.min(i + 1, 9), k = ease.inOutCubic(prog(t, PLANTILLA[i] + .02, PLANTILLA[j] - .02) * (i < 9 ? 1 : 0));
      const yy = (n: number) => G[n].y + Math.sin(t * 2.2 + n * 1.3) * 8 * abre;
      const x = lerp(G[i].x, G[j].x, k), y = lerp(yy(i), yy(j), k);
      c.strokeStyle = ACENTO; c.lineWidth = 7; c.beginPath(); c.arc(lerp(B0.x, x, abre), lerp(B0.y, y, abre), lerp(B0.r, 76, abre) + 2, 0, TAU); c.stroke();
    }
    return;
  }
  // una sola bola: pierde las manos, y solo queda lo de la serie 1: letras, una tras otra
  const aL = smooth(prog(t, A.mismo + .25, A.mismo + .8)) * (1 - smooth(prog(t, A.unico - .45, A.unico - .12)));
  if (aL > 0) {
    const r = azar(14), ABC = "abcdefghilmnopqrstuvyáéó";
    for (let i = 0; i < 58; i++) {
      const rad = 214 + r() * 150, f = r() * TAU, v = (.22 + r() * .4) * (i % 3 ? 1 : -1), ch = ABC[Math.floor(r() * ABC.length)], al = lerp(.16, .55, r());
      const a = f + t * v, x = x0 + Math.cos(a) * rad, y = y0 + Math.sin(a) * rad * .8;
      texto(c, ch, x, y, { fuente: serif(46 + (i % 3) * 14, i % 2 === 0), color: TINTA, alfa: aL * al });
    }
  }
  const quita = 1 - smooth(prog(t, A.mismo + .05, A.mismo + .55)) + smooth(prog(t, A.unico - .25, A.unico + .05));
  const lg = clamp(quita), g = r0 / 90;
  const m1x = x0 - 158 * g, m1y = y0 - 160 * g + Math.sin(t * 2) * 6 * g, m2x = x0 + 158 * g, m2y = y0 - 160 * g + Math.cos(t * 2.1) * 6 * g;
  if (lg > .02) {
    brazo(c, x0 - 54 * g, y0 - 50 * g, m1x, m1y, 90 * g, .7, TINTA, lg, g);
    brazo(c, x0 + 60 * g, y0 - 30 * g, m2x, m2y, -100 * g, .7, TINTA, lg, g);
  }
  sombra(c, x0, y0 + r0 + 26, 150 * g, .28 * (1 - reab));
  bola(c, x0, y0, r0);
  if (reab < .5 && t < A.mismo + .4) { const a = 1 - smooth(prog(t, A.mismo, A.mismo + .35)); c.strokeStyle = ACENTO; c.lineWidth = 8; c.globalAlpha = a; c.beginPath(); c.arc(x0, y0, r0 + 2, 0, TAU); c.stroke(); c.globalAlpha = 1; }
  rotulo(c, t, A.inteligenteF - .04, A.mismo - .12, "la misma bola", 1430, 124, ACENTO, true);
  rotulo(c, t, A.mismo - .02, A.unico - .35, "el mismo modelo", 620, 112, TINTA);
  // adivinando la siguiente palabra: la ranura duda y cae
  const a2 = smooth(prog(t, A.adivina - .1, A.adivina + .1)) * (1 - smooth(prog(t, A.unico - .35, A.unico - .1)));
  if (a2 > 0) {
    const OP = ["lunes", "martes", "jueves", "sábado"], i = Math.min(3, Math.floor(prog(t, A.adivina, A.palabraF - .12) * 4));
    const final = t >= A.palabraF - .12;
    texto(c, "la fiesta es el", 104, 1450, { fuente: serif(96), color: TINTA, alin: "left", alfa: a2 });
    texto(c, OP[i], 696, 1450, { fuente: serif(96, true), color: final ? ACENTO : GRIS, alin: "left", alfa: a2 });
    c.strokeStyle = ACENTO; c.lineWidth = 4; c.globalAlpha = a2; c.beginPath(); c.moveTo(690, 1474); c.lineTo(950, 1474); c.stroke(); c.globalAlpha = 1;
  }
}
function escenaListo(c: Ctx, t: number, cam: Cam) {
  if (t < A.listo - .06 || t > A.solo + .36) return;
  const k = ease.outBack(prog(t, A.listo - .06, A.listo + .32), 1.2), sale = ease.inCubic(prog(t, A.solo - .05, A.solo + .3));
  const y = 1040 + 9 * vaiven(t, 2.4), r = 168, xC = lerp(-200, 286, k) + 5 * vaiven(t, 3.1), xA = lerp(1280, 794, k) + sale * 760 - 5 * vaiven(t, 3.1);
  const ta = A.listo + .9, tb = A.listo + 1.3;
  // Al salir, el chatbot regresa a su pedestal: es la misma bola, no otra.
  const m0 = cam.p(PED.x, PED.y, PED.h + RB), vuelve = smooth(prog(t, A.solo - .02, A.solo + .32));
  const xB = m0 ? lerp(xC, m0.x, vuelve) : xC, yB = m0 ? lerp(y, m0.y, vuelve) : y, rB = m0 ? lerp(r, RB * m0.s, vuelve) : r;
  sombra(c, xC, y + r + 26, 170, .28 * (1 - vuelve)); sombra(c, xA, y + r + 26, 170, .28);
  bola(c, xB, yB, rB);
  const g = r / 90;
  agente(c, xA, y, r, q(xA - 104 * g, y - 170 * g + Math.sin(t * 2) * 6), q(xA + 104 * g, y - 170 * g + Math.cos(t * 2.1) * 6), { abre1: .7, abre2: .7 });
  if (t >= ta - .05) {
    const m = ease.inOutCubic(prog(t, ta, tb - .05)), x = lerp(xC, xA, m), f = 1 - smooth(prog(t, A.solo - .3, A.solo));
    c.strokeStyle = ACENTO; c.lineWidth = 8; c.globalAlpha = f; c.beginPath(); c.arc(x, y, r + 2, 0, TAU); c.stroke(); c.globalAlpha = 1;
  }
  const iE = smooth(prog(t, tb, tb + .2)) * (1 - sale);
  if (iE > 0) texto(c, "=", 540, y + 52, { fuente: serif(150), color: ACENTO, alfa: iE });
  rotulo(c, t, A.listo + .05, A.solo - .15, "no es más listo", 560, 116, TINTA, true);
}
function capaTexto(c: Ctx, t: number) {
  // arranque
  rotulo(c, t, A.chatbot - .06, A.agente - .14, "chatbot", 470, 134, TINTA);
  rotulo(c, t, A.agente - .05, A.cabe + .32, "agente", 400, 134, TINTA, false, 700);
  rotulo(c, t, A.vuelve - .03, A.vuelveF + .26, "vuelve a", 380, 150, ACENTO, true);
  rotulo(c, t, A.intentar - .08, A.vuelveF + .26, "intentar", 530, 170, ACENTO, true);
  // la tercera puerta sí abrió
  const kS = ease.outBack(prog(t, SELLO[3] - .02, SELLO[3] + .2), 2.2), aS = 1 - smooth(prog(t, A.yvuelveF - .15, A.yvuelveF + .1));
  if (kS > 0 && aS > 0) { c.save(); c.translate(540, 470); c.rotate(-.05); c.scale(kS, kS); texto(c, "sí", 0, 0, { fuente: serif(230, true), color: ACENTO, alfa: aS }); c.restore(); }
  // el nombre, ya que se vio
  rotulo(c, t, A.bucle - .05, A.noes - .12, "bucle", 412, 150, ACENTO, true);
  rotulo(c, t, A.bucle + .22, A.noes - .12, "agéntico", 552, 150, ACENTO, true);
  rotulo(c, t, A.respuesta - .04, A.muchas - .3, "una respuesta", 470, 124, TINTA);
  rotulo(c, t, A.muchas - .03, A.cada - .12, "muchas vueltas", 470, 132, ACENTO, true);
  rotulo(c, t, A.paga - .03, A.encada - .12, "se paga", 480, 160, ACENTO, true);
  rotulo(c, t, A.encada + .9, A.poreso - .1, "vuelve a leer", 420, 104, TINTA);
  rotulo(c, t, A.anterior - .03, A.poreso - .1, "todo lo anterior", 548, 116, ACENTO, true);
  // se van antes de que la cámara avance hacia la bola: la torre crecería encima del texto
  rotulo(c, t, A.diez - .03, A.vecesF + .3, "diez vueltas", 500, 110, ACENTO, true);
  rotulo(c, t, A.veces - .03, A.vecesF + .3, "diez veces", 1000, 92, TINTA, true, 786);
  rotulo(c, t, A.veces + .2, A.vecesF + .3, "una", 1090, 92, TINTA, true, 786);
  // oportunidades
  rotulo(c, t, A.segunda - .05, A.tercera - .15, "segunda", 470, 150, ACENTO, true);
  rotulo(c, t, A.tercera + .2, A.todas - .1, "tercera", 470, 150, ACENTO, true);
  const nv = smooth(prog(t, A.todas - .1, A.todas + .1)) * (1 - smooth(prog(t, A.paguesF + .9, A.paguesF + 1.15)));
  if (nv > 0) {                                   // niebla de papel: el texto se lee aunque lluevan monedas
    c.save(); c.translate(540, 495); c.scale(1, .34); c.globalAlpha = nv;
    const g = c.createRadialGradient(0, 0, 60, 0, 0, 640); g.addColorStop(0, "rgba(244,242,236,.96)"); g.addColorStop(.6, "rgba(244,242,236,.8)"); g.addColorStop(1, "rgba(244,242,236,0)");
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 640, 0, TAU); c.fill(); c.restore();
  }
  rotulo(c, t, A.todas - .02, A.paguesF + .9, "todas las que", 420, 118, TINTA, true);
  rotulo(c, t, A.pagues - .05, A.paguesF + .9, "le pagues", 560, 150, ACENTO, true);
  // nosotros
  rotulo(c, t, A.nosotros - .05, A.probar - .3, "nosotros", 470, 140, TINTA, true);
  rotulo(c, t, A.probar - .03, A.fallar - .3, "probar", 470, 140, TINTA, true);
  rotulo(c, t, A.fallar - .03, A.ajustar - .3, "fallar", 470, 140, ACENTO, true);
  rotulo(c, t, A.ajustar - .03, A.ajustarF + .55, "ajustar", 470, 140, TINTA, true);
  // lo nuevo
  rotulo(c, t, A.unico + .1, A.por - .3, "lo único nuevo", 330, 110, TINTA);
  rotulo(c, t, A.por - .04, A.hizo + .3, "ve el resultado", 330, 120, ACENTO, true);
}
/** La flecha que cierra la vuelta: sale de la bola, le da la vuelta a la pista y regresa a ella. */
function flechaVuelta(c: Ctx, cam: Cam, t: number) {
  const k = ease.inOutCubic(prog(t, A.unico + .5, A.hizo - .14)); if (k <= 0 || t > A.hizo + .5) return;
  const a = 1 - smooth(prog(t, A.hizo + .1, A.hizo + .5)), th0 = TH(10), R = RM - .02, c0 = cam.p(0, 0, 0), sC = c0 ? c0.s : 100, th1 = th0 - .18 - (TAU - .55) * k;
  c.save(); c.globalAlpha = a; c.strokeStyle = ACENTO; c.lineCap = "round"; c.lineWidth = .17 * sC;
  c.beginPath(); circulo(c, cam, R, H + .02, 90, undefined, th0 - .18, th1); c.stroke();
  const p = cam.p(R * Math.cos(th1), R * Math.sin(th1), H), p2 = cam.p(R * Math.cos(th1 - .05), R * Math.sin(th1 - .05), H);
  if (p && p2) {
    const dx = p2.x - p.x, dy = p2.y - p.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, L = .46 * sC;
    c.fillStyle = ACENTO; c.beginPath(); c.moveTo(p.x + ux * L, p.y + uy * L); c.lineTo(p.x - uy * L * .62, p.y + ux * L * .62); c.lineTo(p.x + uy * L * .62, p.y - ux * L * .62); c.closePath(); c.fill();
  }
  c.restore();
}

function motas(c: Ctx, t: number, color: string) {
  const r = azar(33); c.fillStyle = color;
  for (let i = 0; i < 64; i++) {
    const x0 = r() * 1200 - 60, y0 = r() * 2060, v = 18 + r() * 40, f = r() * 6.3, z = 1.8 + r() * 3.2;
    const y = ((y0 - t * v) % 2060 + 2060) % 2060 - 70, x = x0 + Math.sin(t * .6 + f) * 30;
    c.globalAlpha = .1 + r() * .18; c.fillRect(x, y, z, z);
  }
  c.globalAlpha = 1;
}

function dibuja(c: Ctx, t: number, d: { ancho: number[][] }) {
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  const v = vistaEn(t), f = sacude(t);
  const cam = camara(v, 540 + Math.sin(t * 71) * f, CY + Math.cos(t * 63) * f, 1250);
  const z = 1.012 + .007 * Math.sin(t * .83);
  // El arranque se inclina como en una curva; después, solo una respiración.
  const inclina = .07 * (1 - smooth(prog(t, A.cabe, A.cabe + 1))) * Math.sin(t * 2.17 + .9);
  c.save(); c.translate(540 + 6 * Math.sin(t * .71), 960 + 7 * Math.cos(t * .61)); c.rotate(.0035 * Math.sin(t * .47) + inclina); c.scale(z + Math.abs(inclina), z + Math.abs(inclina)); c.translate(-540, -960);
  mundo(c, cam, t, d);
  flechaVuelta(c, cam, t);
  c.restore();
  motas(c, t, TINTA);
  const b = blanco(t);
  if (b > 0) { c.fillStyle = PAPEL; c.globalAlpha = b; c.fillRect(0, 0, 1080, 1920); c.globalAlpha = 1; }
  escenaChat(c, cam, t);
  iris(c, cam, t);
  // Mientras el círculo está cerrado, la bola corre sobre él: va encima del negro.
  if (t > T_ESP && t < A.cosa + .5) { const e = estadoBola(t); if (e.vis) dibujaBola(c, cam, t, e); }
  if (b > .5 || (t > A.ninguna && t < A.unico + .32)) escenaGiro(c, t, cam);
  if (t >= A.listo - .1 && t <= A.solo + .4) escenaListo(c, t, cam);
  contador(c, t);
  capaTexto(c, t);
}

export const Pieza: React.FC = () => (
  <Lienzo
    dibuja={dibuja}
    preparar={() => {
      const cv = document.createElement("canvas").getContext("2d")!; cv.font = serif(100, true);
      return { ancho: MARCAS.map((w) => [...w].map((ch) => cv.measureText(ch).width)) };
    }}
  />
);
