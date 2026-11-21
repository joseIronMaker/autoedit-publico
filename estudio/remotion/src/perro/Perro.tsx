// «ChatGPT no sabe qué es un perro». Pieza escrita a mano: un solo mundo que se transforma.
// La palabra se rompe, se vuelve punto, el punto cae y al caer revela el mapa. Único corte: a
// negro en el giro. El último cuadro es el primero: el video da la vuelta sobre sí mismo.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as cargaSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as cargaMono } from "@remotion/google-fonts/JetBrainsMono";
import {
  azar, caida, camara, Cam, clamp, curvas, ease, Fuente, guionCamara, lerp, muestreaTexto, prog, resorte, smooth, smoother, texto, Vista,
} from "../kit";
import T from "./t.json";
import palabras from "./palabras.json";

const { fontFamily: SERIF, waitUntilDone: listoA } = cargaSerif("normal", { subsets: ["latin"] });
const { waitUntilDone: listoB } = cargaSerif("italic", { subsets: ["latin"] });
const { fontFamily: MONO, waitUntilDone: listoC } = cargaMono("normal", { subsets: ["latin"], weights: ["400"] });

// La frase final se cierra y la música se apaga con calma: un final en suspenso se oye como un corte.
export const DURACION = T.eco_fin + 1.6;
// TikTok ya pone subtítulos automáticos a quien los quiere; quemados compiten con la animación.
const SUBTITULOS = false;

const PAPEL = "#F4F2EC", TINTA = "#111111", GRIS = "#8C8A83", ACENTO = "#C0442A", NOCHE = "#09090A", LUZ = "#EDEAE3";
const serif = (px: number, it = false) => `${it ? "italic " : ""}${px}px "${SERIF}"`;
const mono = (px: number) => `${px}px "${MONO}"`;

// ---------- el mapa ----------
const PERRO: [number, number] = [0, 0], GATO: [number, number] = [1.5, .85], PLATANO: [number, number] = [23, -7];
const HOMBRE: [number, number] = [-13, 24], MUJER: [number, number] = [-10.2, 25.7];
const REY: [number, number] = [-13.4, 20.1];
const VEC: [number, number] = [MUJER[0] - HOMBRE[0], MUJER[1] - HOMBRE[1]];
const REINA: [number, number] = [REY[0] + VEC[0] + .2, REY[1] + VEC[1] - .16];       // «casi» el mismo camino

type Punto = { x0: number; y0: number; x1: number; y1: number; nace: number; tam: number };
const GRUPOS: { c: [number, number]; s: number; n: number }[] = [
  { c: [1, .4], s: 2.4, n: 70 }, { c: [23, -7], s: 2.3, n: 55 }, { c: [-11.5, 22.8], s: 3.1, n: 72 }, { c: [14, 22], s: 3.3, n: 70 },
  { c: [-20, 3], s: 3, n: 60 }, { c: [7, -20], s: 3, n: 60 }, { c: [33, 11], s: 2.6, n: 48 },
];
function creaPuntos(): Punto[] {
  const r = azar(2013);
  const g = (ms = 0, ss = 1) => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return ms + ss * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const grupos = GRUPOS;
  const P: Punto[] = [];
  for (const k of grupos) for (let i = 0; i < k.n; i++) {
    P.push({ x0: lerp(-30, 44, r()), y0: lerp(-32, 38, r()), x1: g(k.c[0], k.s), y1: g(k.c[1], k.s), nace: r(), tam: lerp(.07, .13, r()) });
  }
  return P;
}

// ---------- lo que aparece en el mundo, una sola definición del tiempo ----------
// La caída dura √(2h/g): con h=4.3 son 0.535 s. Así la bola toca el suelo justo en «mapa».
const tCaePerro = T.mapa1 - .535, tCaeGato = T.gato - .12;

/** gato se aleja y vuelve a acercarse a saltos: lo que hace el entrenamiento. */
const CONTEXTOS = ["mi ___ duerme en el sofá", "llevé a mi ___ al veterinario", "mi ___ me despertó"];
const pasoGato = (i: number) => lerp(T.acercando - .1, T.y2013 - .35, i / CONTEXTOS.length);
function posGato(t: number): [number, number] {
  const lejos: [number, number] = [6.6, 3.7];
  const ida = ease.inOutCubic(prog(t, T.huecos - .1, T.huecos + .45));
  let k = 0;
  for (let i = 0; i < CONTEXTOS.length; i++) k += ease.outBack(prog(t, pasoGato(i), pasoGato(i) + .32), 2.2) / CONTEXTOS.length;
  const f = ida * (1 - k);
  return [lerp(GATO[0], lejos[0], f), lerp(GATO[1], lejos[1], f)];
}

const VISTAS: { t: number; v: Vista; dur?: number; curva?: (x: number) => number }[] = [
  { t: 0, v: { tx: 0, ty: 0, tz: 0, yaw: -.28, pitch: .3, dist: 8.2 } },
  { t: T.vive - .5, v: { tx: 0, ty: 0, tz: 0, yaw: -.2, pitch: .52, dist: 9 }, dur: 1.2 },
  { t: T.gato - .1, v: { tx: .85, ty: .45, tz: 0, yaw: -.16, pitch: .66, dist: 8 }, dur: 1.2 },
  { t: T.platano - .16, v: { tx: PLATANO[0], ty: PLATANO[1], tz: 0, yaw: .1, pitch: .6, dist: 8.5 }, dur: .95, curva: ease.outExpo },
  { t: T.nadie - .45, v: { tx: 7, ty: 3.5, tz: 0, yaw: -.3, pitch: .9, dist: 60 }, dur: 2.1 },
  { t: T.formo, v: { tx: 6, ty: 4.5, tz: 0, yaw: .42, pitch: 1.06, dist: 50 }, dur: T.lecomer - T.formo, curva: ease.inOutSine },
  { t: T.lecomer - .4, v: { tx: 3, ty: 1.7, tz: 0, yaw: -.1, pitch: .86, dist: 11.5 }, dur: 1.5 },
  { t: T.y2013 - .3, v: { tx: -11.6, ty: 22.7, tz: 0, yaw: .05, pitch: 1.3, dist: 12.5 }, dur: 1.9 },
  { t: T.explico - .2, v: { tx: -11.6, ty: 22.7, tz: 0, yaw: .3, pitch: 1.08, dist: 13.5 }, dur: 4 , curva: ease.inOutSine },
  { t: T.saco - .1, v: { tx: 7, ty: 4, tz: 0, yaw: .3, pitch: 1.2, dist: 66 }, dur: 1.5 },
  { t: T.llamamos + .1, v: { tx: 0, ty: 0, tz: 0, yaw: .05, pitch: 1.34, dist: 7.5 }, dur: 1.5, curva: ease.inOutCubic },
];

// ---------- piezas de dibujo ----------
function bola(c: CanvasRenderingContext2D, x: number, y: number, r: number, tinte = TINTA) {
  const g = c.createRadialGradient(x - r * .34, y - r * .38, r * .05, x, y, r);
  if (tinte === TINTA) { g.addColorStop(0, "#5a5a59"); g.addColorStop(.42, "#1d1d1c"); g.addColorStop(1, "#050505"); }
  else { g.addColorStop(0, "#E9896C"); g.addColorStop(.5, tinte); g.addColorStop(1, "#7E2413"); }
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
}
function sombra(c: CanvasRenderingContext2D, x: number, y: number, r: number, alfa: number) {
  if (alfa <= .01) return;
  c.save(); c.translate(x, y); c.scale(1, .36);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, `rgba(20,18,14,${alfa})`); g.addColorStop(1, "rgba(20,18,14,0)");
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill(); c.restore();
}
/** Bola en el mundo: tamaño, sombra de contacto y altura, todo desde la cámara. */
function bolaMundo(c: CanvasRenderingContext2D, cam: Cam, x: number, y: number, z: number, r: number, tinte = TINTA, alfa = 1) {
  const s = cam.p(x, y, 0), a = cam.p(x, y, z + r * .92);
  if (!s || !a) return;
  c.save(); c.globalAlpha = alfa;
  sombra(c, s.x, s.y, r * s.s * (2 + z * .55), .4 / (1 + z * 1.1));
  bola(c, a.x, a.y, r * a.s, tinte);
  c.restore();
}
function etiqueta(c: CanvasRenderingContext2D, cam: Cam, x: number, y: number, s: string, a: number, px = 58, color = TINTA, dy = 26, it = true) {
  const p = cam.p(x, y, 0);
  if (p) texto(c, s, p.x, p.y - dy - p.s * .68, { fuente: serif(px, it), color, alfa: a });
}
function flecha(c: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, color: string, g = 7, punta = 26) {
  const d = Math.hypot(bx - ax, by - ay); if (d < 2) return;
  const ux = (bx - ax) / d, uy = (by - ay) / d, pt = Math.min(punta, d * .6);
  c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round";
  c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx - ux * pt * .7, by - uy * pt * .7); c.stroke();
  c.fillStyle = color; c.beginPath(); c.moveTo(bx, by);
  c.lineTo(bx - ux * pt - uy * pt * .52, by - uy * pt + ux * pt * .52);
  c.lineTo(bx - ux * pt + uy * pt * .52, by - uy * pt - ux * pt * .52); c.closePath(); c.fill();
}
function anillo(c: CanvasRenderingContext2D, cam: Cam, x: number, y: number, r: number, color: string, alfa: number, g = 3) {
  if (alfa <= .01) return;
  c.save(); c.globalAlpha = alfa; c.strokeStyle = color; c.lineWidth = g; c.beginPath();
  for (let i = 0; i <= 56; i++) {
    const a = i / 56 * 6.2832, p = cam.p(x + Math.cos(a) * r, y + Math.sin(a) * r, 0);
    if (p) { if (i === 0) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y); }
  }
  c.stroke(); c.restore();
}

/** Plano de puntos anclado al mundo. Se revela con la onda de la primera caída y se ondula con cada impacto. */
function plano(c: CanvasRenderingContext2D, cam: Cam, t: number, ondas: { x: number; y: number; t0: number; a: number }[], tinte: string, alfaG: number) {
  const { tx, ty, dist } = cam.v;
  const mezcla = smooth(prog(dist, 20, 38));
  const capa = (paso: number, alfa: number) => {
    if (alfa <= .01) return;
    const R = dist * 1.5 + 8;
    c.fillStyle = tinte;
    for (let j = Math.floor((ty - R) / paso); j <= Math.ceil((ty + R) / paso); j++) for (let i = Math.floor((tx - R) / paso); i <= Math.ceil((tx + R) / paso); i++) {
      const x = i * paso, y = j * paso;
      const d0 = Math.hypot(x, y), reve = smooth((13 * (t - T.mapa1) - d0 + 2) / 5);
      if (reve <= .01) continue;
      let z = 0;
      for (const o of ondas) {
        const e = t - o.t0; if (e < 0 || e > 3.4) continue;
        const d = Math.hypot(x - o.x, y - o.y) - e * 9;
        if (Math.abs(d) < 5) z += o.a * Math.exp(-e * 1.5) * Math.cos(d * 1.3) * Math.exp(-d * d * .14);
      }
      const p = cam.p(x, y, z); if (!p || p.y < -20 || p.y > 1940 || p.x < -20 || p.x > 1100) continue;
      const lado = clamp(p.s * .05, 1.5, 4.4);
      c.globalAlpha = alfa * alfaG * reve * clamp(p.s / 30, .22, .7);
      c.fillRect(p.x - lado / 2, p.y - lado / 2, lado, lado);
    }
    c.globalAlpha = 1;
  };
  capa(1, 1 - mezcla); capa(3, mezcla);
}

// ---------- subtítulo: tranquilo, abajo y palabra a palabra ----------
type Linea = { s: number; e: number; w: { w: string; s: number; e: number }[] };
function creaLineas(): Linea[] {
  const L: Linea[] = []; let act: Linea["w"] = [];
  const corta = () => { if (act.length) { L.push({ s: act[0].s, e: act[act.length - 1].e, w: act }); act = []; } };
  (palabras as Linea["w"]).forEach((p) => {
    act.push(p);
    const largo = act.map((x) => x.w).join(" ").length;
    if (/[.:?,]$/.test(p.w) && largo > 12) corta(); else if (/[.:?]$|\.\.\.$/.test(p.w)) corta(); else if (largo > 30) corta();
  });
  corta(); return L;
}
function subtitulo(c: CanvasRenderingContext2D, t: number, L: Linea[], color: string) {
  const l = L.find((x, i) => t >= x.s - .08 && t < (L[i + 1]?.s ?? x.e + .4) - .08);
  if (!l || t > l.e + .5) return;
  c.save(); c.font = serif(70); c.textBaseline = "alphabetic";
  const piezas = l.w.map((x) => x.w.replace(/"/g, ""));
  const anchos = piezas.map((p) => c.measureText(p + " ").width);
  const total = anchos.reduce((a, b) => a + b, 0);
  let x = 516 - total / 2;
  piezas.forEach((p, i) => {
    c.globalAlpha = lerp(.3, 1, smooth(prog(t, l.w[i].s - .05, l.w[i].s + .1)));
    c.fillStyle = color; c.textAlign = "left"; c.fillText(p, x, 1500); x += anchos[i];
  });
  c.restore();
}

/** Texto que entra con la voz y se va solo: reemplaza al subtítulo corrido. */
function rotulo(c: CanvasRenderingContext2D, t: number, ini: number, fin: number, s: string, y: number, px: number, color = TINTA, it = false) {
  const a = smooth(prog(t, ini - .04, ini + .14)) * (1 - smooth(prog(t, fin, fin + .22)));
  if (a > 0) texto(c, s, 540, y + (1 - ease.outCubic(prog(t, ini - .04, ini + .3))) * 18, { fuente: serif(px, it), color, alfa: a });
}

// ---------- la palabra del arranque (y del final: es el mismo cuadro) ----------
// " perro" es el token 96439 en o200k_base, el tokenizador de GPT-4o (comprobado con tiktoken).
const LETRAS = ["p", "e", "r", "r", "o"], DIGITOS = ["9", "6", "4", "3", "9"];
const IMPACTO = .35, Y0_BOLA = 120;      // la bola ya cae en el cuadro 0: nada de arrancar quieto
const YW = 880, FW = () => serif(372, true);

/** Tras el golpe la bola rueda sobre las letras; en «acariciado» vuelve despacio, rozándolas. */
function xBola(t: number) {
  const ida = ease.inOutSine(prog(t, .9, T.h_perro + .45));
  const vuelta = ease.inOutSine(prog(t, T.acaricia - .15, T.leido + .1));
  return lerp(lerp(lerp(540, 790, ida), 300, vuelta), 540, ease.inOutSine(prog(t, T.leido + .1, T.leido + .8)));
}
/** Empuje de cámara sobre la palabra: el arranque nunca es una lámina. Termina en 1 para enlazar el bucle. */
function empuje(c: CanvasRenderingContext2D, t: number) {
  const z = 1 + .085 * ease.inOutSine(prog(t, 0, T.antes + .5));
  c.translate(540, 800); c.scale(z, z); c.translate(-540, -800);
}
function palabraPerro(c: CanvasRenderingContext2D, t: number, alfa: number) {
  c.save(); c.font = FW();
  const anchos = LETRAS.map((l) => c.measureText(l).width), tot = anchos.reduce((a, b) => a + b, 0);
  let x = 540 - tot / 2;
  const imp = IMPACTO, r = azar(Math.floor(t * 17) + 3);
  LETRAS.forEach((l, i) => {
    const cx = x + anchos[i] / 2, dist = Math.abs(cx - 540) / 300;
    const e = t - imp;
    const rozando = t < T.leido + .7 ? 26 * Math.exp(-(((cx - xBola(t)) / 92) ** 2)) * smooth(prog(t, .7, 1)) : 0;
    const golpe = e > 0 ? 62 * Math.exp(-e * 4.6) * Math.cos(e * 16 - dist * 1.8) * (1 - dist * .55) : 0;
    const roce = 12 * smooth(prog(t, T.acaricia, T.acaricia + .4)) * (1 - smooth(prog(t, T.leido - .3, T.leido))) * Math.sin(t * 4.4 - i * .85);
    const dOla = (t - T.h_perro - .12 - i * .07) / .09, ola = -30 * Math.exp(-(dOla * dOla));
    const salta = T.leido + .5 + i * .08, fijo = T.leido + .95 + i * .08;
    const raro = t >= salta && t < fijo, dig = t >= fijo && t < T.mapa1;
    const y = YW + golpe + roce + ola + rozando;
    if (raro) texto(c, String(Math.floor(r() * 10)), cx, y, { fuente: mono(190), color: TINTA, alfa });
    else if (dig) texto(c, DIGITOS[i], cx, y, { fuente: mono(190), color: TINTA, alfa: alfa * (1 - smooth(prog(t, T.antes + .1, T.antes + .35))) });
    else texto(c, l, cx, y, { fuente: FW(), color: TINTA, alfa });
    x += anchos[i];
  });
  c.restore();
}

// ---------- el negro: el mismo mapa, la misma flecha, otra respuesta ----------
function escenaNegro(c: CanvasRenderingContext2D, t: number, fuentesN: Fuente[]) {
  c.fillStyle = NOCHE; c.fillRect(0, 0, 1080, 1920);
  const antesEsto = t < T.n_hombre - .15;
  if (antesEsto) {
    const a = smooth(prog(t, T.negro, T.negro + .16));
    texto(c, "Y por eso también", 540, 860, { fuente: serif(112), color: LUZ, alfa: a });
    texto(c, "aprendió esto.", 540, 1000, { fuente: serif(128, true), color: LUZ, alfa: smooth(prog(t, T.esto - .05, T.esto + .2)) });
    return;
  }
  const yaTesis = t >= T.tesis1 - .2, yaPaper = t >= T.salio - .1;
  // El mapa nunca se detiene: la cámara sube despacio hasta que el texto queda sobre un terreno lejano.
  const e = t - T.n_hombre, aleja = smoother(prog(t, T.salio - .3, T.salio + 1.2));
  const vivos = fuentesN.map((f, i) => ({ ...f, x: f.x + .55 * Math.sin(t * .9 + i * 1.7), y: f.y + .55 * Math.cos(t * .74 + i * 2.3), a: f.a * (1 + .25 * Math.sin(t * 1.2 + i)) }));
  const cam = camara({ tx: e * .1 * aleja, ty: e * .06 * aleja, tz: 0, yaw: .04 + e * .06, pitch: 1.34 - aleja * .32, dist: 13 + aleja * 13 + e * .12 }, 540, 800);
  const alfaF = smooth(prog(t, T.n_hombre - .15, T.n_hombre + .7)) * (1 - aleja * .25);
  curvas(c, cam, vivos, { x0: -24, x1: 24, y0: -28, y1: 28, paso: .3, niveles: [.2, .42, .7, 1.05, 1.5, 2], hundir: .5, tinta: (_, i) => `rgba(236,233,226,${alfaF * (.3 + i * .08)})`, grosor: () => 2 });
  if (!yaPaper) {
    const H: [number, number] = [-3.6, 3.1], Pg: [number, number] = [3.1, 4.9], M: [number, number] = [-3.8, -2.2], A: [number, number] = [2.95, -.3];
    const pH = cam.p(H[0], H[1])!, pP = cam.p(Pg[0], Pg[1])!, pM = cam.p(M[0], M[1])!, pA = cam.p(A[0], A[1])!;
    const k1 = ease.inOutCubic(prog(t, T.n_hombre + .2, T.n_prog + .25));
    const k2 = ease.inOutCubic(prog(t, T.n_mujer + .1, T.n_mujer + .8));
    const k3 = ease.inOutCubic(prog(t, T.n_mujer + .8, T.n_ama + .02));
    [[H, "hombre", T.n_hombre], [Pg, "programador", T.n_prog], [M, "mujer", T.n_mujer]].forEach(([p, s, tt]: any) => {
      const q = cam.p(p[0], p[1])!, a = smooth(prog(t, tt - .1, tt + .15));
      c.save(); c.globalAlpha = a; c.fillStyle = LUZ; c.beginPath(); c.arc(q.x, q.y, 11, 0, 7); c.fill(); c.restore();
      texto(c, s, clamp(q.x, 190, 820), q.y - 40, { fuente: serif(84, true), color: LUZ, alfa: a });
    });
    if (k1 > 0) flecha(c, pH.x, pH.y, lerp(pH.x, pP.x, k1), lerp(pH.y, pP.y, k1), LUZ, 5, 24);
    if (k2 > 0) {
      const ox = lerp(pH.x, pM.x, k2), oy = lerp(pH.y, pM.y, k2), dx = pP.x - pH.x, dy = pP.y - pH.y;
      c.save(); c.globalAlpha = 1 - k3; flecha(c, ox, oy, ox + dx, oy + dy, "rgba(236,233,226,.55)", 4, 22); c.restore();
      if (k3 > 0) flecha(c, pM.x, pM.y, lerp(pM.x, pA.x, k3), lerp(pM.y, pA.y, k3), ACENTO, 6, 26);
    }
    const r = prog(t, T.n_ama, T.n_ama + .5);
    if (r > 0) {
      c.save(); c.globalAlpha = 1 - r; c.strokeStyle = ACENTO; c.lineWidth = 4; c.beginPath(); c.arc(pA.x, pA.y, 12 + r * 80, 0, 7); c.stroke(); c.restore();
      c.fillStyle = ACENTO; c.beginPath(); c.arc(pA.x, pA.y, 12 * resorte(t - T.n_ama), 0, 7); c.fill();
      texto(c, "ama de casa", 620, pA.y + 176, { fuente: serif(118, true), color: ACENTO, alfa: smooth(r * 3) });
    }
    rotulo(c, t, T.inventado, T.salio - .15, "No es un ejemplo inventado.", 1400, 78, LUZ);
  } else if (!yaTesis) {
    const lineas = ["“Man is to", "Computer Programmer", "as Woman is to", "Homemaker?”"];
    const dur = T.publicaron - T.salio + .15;
    lineas.forEach((l, i) => {
      const ini = T.salio - .05 + i * dur / 4;
      texto(c, l, 540, 610 + i * 122 + (1 - ease.outCubic(prog(t, ini, ini + .35))) * 20, { fuente: serif(112, true), color: i === 3 ? ACENTO : LUZ, alfa: smooth(prog(t, ini, ini + .22)) });
    });
    const b = smooth(prog(t, T.publicaron, T.publicaron + .3));
    texto(c, "Bolukbasi et al. · NeurIPS 2016", 540, 1130, { fuente: mono(38), color: "#B5B2AA", alfa: b });
  } else {
    const a = smooth(prog(t, T.tesis1 - .1, T.tesis1 + .25)), b = smooth(prog(t, T.tesis2 - .05, T.tesis2 + .3));
    texto(c, "El mapa no sabe", 540, 760, { fuente: serif(108), color: LUZ, alfa: a * (1 - b * .65) });
    texto(c, "lo que es verdad.", 540, 884, { fuente: serif(108), color: LUZ, alfa: a * (1 - b * .65) });
    texto(c, "Sabe lo que", 540, 1090, { fuente: serif(138, true), color: LUZ, alfa: b });
    texto(c, "decimos.", 540, 1234, { fuente: serif(138, true), color: LUZ, alfa: b });
  }
}

function dibuja(c: CanvasRenderingContext2D, t: number, datos: ReturnType<typeof preparar>) {
  const { P, L, granos, fuentesN } = datos;
  if (t >= T.negro && t < T.dim2) return escenaNegro(c, t, fuentesN);
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);

  const salida = smooth(prog(t, T.aunasi + .45, T.fin + .3));                 // el mundo se apaga y vuelve la palabra
  // Al final se repite el arranque: misma frase, mismo golpe de la bola sobre la palabra.
  const tw = t >= T.eco ? Math.min(t - T.eco + .2, 2.2) : 0;
  const arranque = t < T.mapa1 + .05;

  // ---------- la palabra ----------
  if (arranque || salida > 0) {
    c.save(); empuje(c, t < T.mapa1 ? t : tw);
    const alfaP = t < T.mapa1 ? 1 - smooth(prog(t, T.antes + .1, T.punto)) : salida;
    palabraPerro(c, t < T.mapa1 ? t : tw, alfaP);
    const aa = t < T.acaricia - .35 ? 1 : 1 - smooth(prog(t, T.acaricia - .35, T.acaricia + .05));
    texto(c, "ChatGPT no sabe qué es un", 540, 410, { fuente: serif(100), color: TINTA, alfa: t < T.mapa1 ? aa : salida });
    c.restore();
  }

  // ---------- la cámara y el mundo ----------
  let vista = guionCamara(t, VISTAS);
  if (t >= T.dim2) {
    const k = ease.inOutCubic(prog(t, T.dim2, T.dim2 + 1.1));
    vista = { ...vista, tx: lerp(7, 0, k), ty: lerp(4, 0, k), yaw: lerp(.3, 0, k), pitch: lerp(1.2, 1.42, k), dist: 66 * (13 / 66) ** k };
    const back = ease.inOutCubic(prog(t, T.escribes - .2, T.escribes + 1));
    vista = { ...vista, pitch: lerp(vista.pitch, .78, back), dist: lerp(vista.dist, 11, back), yaw: lerp(vista.yaw, -.14, back) };
  }
  // La cámara respira siempre: ningún plano es una foto.
  const orbita = .62 * Math.sin(Math.PI * prog(t, T.y2013 - .3, T.saco)) + .5 * Math.sin(Math.PI * prog(t, T.escribes, T.aunasi + .5)) + .34 * Math.sin(Math.PI * prog(t, T.lecomer - .3, T.y2013 - .3));
  vista = { ...vista, tx: vista.tx + .3 * Math.sin(t * .53), ty: vista.ty + .24 * Math.cos(t * .47), yaw: vista.yaw + orbita + .07 * Math.sin(t * .71), pitch: vista.pitch + .03 * Math.sin(t * .59 + 1), dist: vista.dist * (1 + .04 * Math.sin(t * .63 + 2)) };
  const cam = camara(vista);
  const ondas = [
    { x: 0, y: 0, t0: T.mapa1, a: .85 }, { x: GATO[0], y: GATO[1], t0: tCaeGato + .416, a: .4 }, { x: PLATANO[0], y: PLATANO[1], t0: T.alla, a: .5 },
    { x: 0, y: 0, t0: T.ubica, a: .55 },
  ];

  if (t >= tCaePerro && salida < 1) {
    const vivo = 1 - salida;
    plano(c, cam, t, ondas, TINTA, vivo * (1 - smooth(prog(t, T.miles, T.miles + .5)) * (1 - smooth(prog(t, T.truco + .2, T.truco + .9)))));

    // puntos: nacen como lluvia, luego el significado los acomoda
    const lluvia = prog(t, T.formo - .1, T.leyendo + .9);
    const orden = ease.inOutSine(prog(t, T.leyendo - .3, T.lecomer - .35));
    const vG = posGato(t);
    const atenua = (1 - .72 * smooth(prog(t, T.lecomer - .3, T.lecomer + .4)) * (1 - smooth(prog(t, T.saco, T.saco + 1))))
      * (1 - .7 * smooth(prog(t, T.llamamos, T.llamamos + 1))) * (t >= T.dim2 ? .55 : 1);
    const estrella = 1 - .94 * smooth(prog(t, T.miles, T.miles + .4)) * (1 - smooth(prog(t, T.truco + .1, T.truco + .7)));
    const fuentes: Fuente[] = [];
    const alfaMapa = vivo * estrella;
    const crece = smooth(prog(t, T.formo, T.lecomer - .2));
    if (orden > 0) for (const p of P) {
      const fase = p.nace * 61;
      fuentes.push({ x: lerp(p.x0, p.x1, orden) + .34 * Math.sin(t * 1.05 + fase), y: lerp(p.y0, p.y1, orden) + .34 * Math.cos(t * .83 + fase * 1.7), a: .17 * orden * (1 + .22 * Math.sin(t * 1.3 + fase)), s: 1.25 });
    }
    fuentes.push({ x: 0, y: 0, a: .75 * smooth(prog(t, T.mapa1, T.mapa1 + 1.2)), s: 1.2 });
    fuentes.push({ x: vG[0], y: vG[1], a: .55 * smooth(prog(t, tCaeGato + .3, tCaeGato + 1.3)), s: 1 });
    fuentes.push({ x: PLATANO[0], y: PLATANO[1], a: .6 * smooth(prog(t, T.alla, T.alla + 1)), s: 1.1 });
    const R = vista.dist * 1.25 + 4;
    curvas(c, cam, fuentes, {
      x0: vista.tx - R, x1: vista.tx + R, y0: vista.ty - R, y1: vista.ty + R * 1.25, paso: vista.dist > 34 ? .42 : .2,
      niveles: [.12, .26, .45, .7, 1, 1.4, 1.9, 2.5], hundir: .3 + vista.dist * .012,
      tinta: (_, i) => `rgba(17,17,17,${alfaMapa * (i % 3 === 2 ? .74 : .4)})`, grosor: (i) => (i % 3 === 2 ? 2.8 : 1.6),
    });
    c.fillStyle = TINTA;
    for (const p of P) {
      const nace = p.nace * .86, a = smooth((lluvia - nace) / .1);
      if (a <= .01) continue;
      const fase = p.nace * 61;
      const x = lerp(p.x0, p.x1, orden) + .16 * Math.sin(t * 1.05 + fase), y = lerp(p.y0, p.y1, orden) + .16 * Math.cos(t * .83 + fase * 1.7);
      const caeZ = Math.max(0, (1 - (lluvia - nace) / .09)) * 16;
      const q = cam.p(x, y, caeZ); if (!q) continue;
      c.globalAlpha = a * atenua * alfaMapa * .92;
      c.beginPath(); c.arc(q.x, q.y, clamp(p.tam * q.s, 2.2, 7.5), 0, 7); c.fill();
    }
    c.globalAlpha = 1;

    // perro · gato · plátano
    const aPr = 1 - smooth(prog(t, T.y2013 + .4, T.y2013 + 1.1)) * (1 - smooth(prog(t, T.dim2, T.dim2 + .8)));
    const zPerro = t < T.mapa1 + 6 ? caida(t - tCaePerro, 4.3, .44).z : 0;
    if (t >= tCaePerro) {
      bolaMundo(c, cam, 0, 0, zPerro, t >= T.gato ? .34 : .4, TINTA, aPr * vivo);
    }
    if (t >= tCaeGato) {
      const z = caida(t - tCaeGato, 2.6, .42).z;
      bolaMundo(c, cam, vG[0], vG[1], z, .3, TINTA, aPr * vivo * (t >= T.dim2 ? 0 : 1));
    }
    if (t >= T.alla - .36) bolaMundo(c, cam, PLATANO[0], PLATANO[1], caida(t - (T.alla - .36), 2.4, .4).z, .3, TINTA, aPr * vivo * (t >= T.dim2 ? 0 : 1));
    {
      const aE = aPr * vivo;
      if (t >= T.dim2) { /* desde aquí el mapa ya no se nombra: se usa */ } else {
        const lejos = 1 - smooth(prog(vista.dist, 18, 30));
        etiqueta(c, cam, 0, 0, "perro", smooth(prog(t, T.vive, T.vive + .25)) * aE, 92);
        etiqueta(c, cam, vG[0], vG[1], "gato", smooth(prog(t, T.gato, T.gato + .25)) * aE * lejos, 92);
        etiqueta(c, cam, PLATANO[0], PLATANO[1], "plátano", smooth(prog(t, T.platano + .25, T.platano + .6)) * aE, 92);
      }
    }

    // ---------- «Le di de comer a mi ___»: dos palabras que caben en el mismo hueco ----------
    const aFr = smooth(prog(t, T.lecomer - .12, T.lecomer + .22)) * (1 - smooth(prog(t, T.huecos + .5, T.huecos + 1)));
    if (aFr > 0) {
      const yL = 300, xH = 540, yH = 420;
      texto(c, "Le di de comer a mi", 540, yL, { fuente: serif(100), color: TINTA, alfa: aFr });
      c.save(); c.globalAlpha = aFr; c.strokeStyle = TINTA; c.lineWidth = 3; c.lineCap = "round";
      c.beginPath(); c.moveTo(xH - 170, yH + 22); c.lineTo(xH + 170, yH + 22); c.stroke(); c.restore();
      const vuelaA = (w: [number, number], s: string, ini: number, sale: number) => {
        const k = ease.outBack(prog(t, ini, ini + .46), 1.1), q = cam.p(w[0], w[1]); if (!q || t < ini) return;
        const a = (1 - smooth(prog(t, sale, sale + .22))) * aFr * smooth(prog(t, ini, ini + .08));
        const ox = q.x, oy = q.y - 120;
        texto(c, s, lerp(ox, xH, k), lerp(oy, yH, k) - Math.sin(clamp(k) * Math.PI) * 60 + smooth(prog(t, sale, sale + .22)) * 70, { fuente: serif(lerp(92, 112, clamp(k)), true), color: ACENTO, alfa: a });
      };
      vuelaA([0, 0], "perro", T.cabeperro + .3, T.cabegato + .15);
      vuelaA(vG, "gato", T.cabegato + .3, T.huecos + .5);
    }

    // distancia que se encoge: cada frase leída las acerca un salto
    const aDist = smooth(prog(t, T.acercando - .25, T.acercando)) * (1 - smooth(prog(t, T.y2013 - .35, T.y2013 - .05)));
    if (aDist > 0) {
      const a = cam.p(0, 0), b = cam.p(vG[0], vG[1]);
      if (a && b) {
        c.save(); c.globalAlpha = aDist; c.strokeStyle = TINTA; c.lineWidth = 3; c.setLineDash([3, 14]); c.lineCap = "round";
        c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); c.restore();
      }
      CONTEXTOS.forEach((f, i) => {
        const e = t - pasoGato(i); if (e < -.1 || e > .84) return;
        const al = smooth((e + .1) / .1) * (1 - smooth((e - .66) / .16)) * aDist;
        texto(c, f, 540, 300, { fuente: serif(84, true), color: TINTA, alfa: al });
        const r = clamp(e / .5);
        anillo(c, cam, vG[0], vG[1], .3 + r * 1.5, ACENTO, (1 - r) * .9 * aDist, 3);
        anillo(c, cam, 0, 0, .3 + r * 1.5, ACENTO, (1 - r) * .9 * aDist, 3);
      });
    }

    // ---------- hombre · mujer · rey · reina ----------
    const aRe = smooth(prog(t, T.y2013 + .2, T.y2013 + 1.1)) * (1 - smooth(prog(t, T.saco - .3, T.saco + .05)));
    if (aRe > 0) {
      const dibuPunto = (w: [number, number], s: string, tt: number, tinte = TINTA, escala = 1) => {
        const a = aRe * smooth(prog(t, tt, tt + .3)); if (a <= 0) return;
        bolaMundo(c, cam, w[0], w[1], 0, .24 * escala, tinte, a);
        const q = cam.p(w[0], w[1]); if (q) texto(c, s, q.x, q.y - 58, { fuente: serif(96, true), color: tinte, alfa: a });
      };
      dibuPunto(HOMBRE, "hombre", T.y2013 + .4); dibuPunto(MUJER, "mujer", T.y2013 + .7); dibuPunto(REY, "rey", T.y2013 + 1);
      const fL = (a: [number, number], b: [number, number], al: number, g = 2) => {
        const A = cam.p(a[0], a[1]), B = cam.p(b[0], b[1]); if (!A || !B) return;
        c.save(); c.globalAlpha = al; c.strokeStyle = TINTA; c.lineWidth = g; c.setLineDash([3, 12]); c.lineCap = "round"; c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke(); c.restore();
      };
      const pulso = smooth(prog(t, T.distancias, T.significaban + .2)) * (1 - smooth(prog(t, T.camino - .15, T.camino + .2)));
      if (pulso > 0) { fL(HOMBRE, MUJER, pulso * .8); fL(HOMBRE, REY, pulso * .8); }
      const pA = cam.p(HOMBRE[0], HOMBRE[1])!, pB = cam.p(MUJER[0], MUJER[1])!, pR = cam.p(REY[0], REY[1])!, pQ = cam.p(REINA[0], REINA[1])!;
      const k1 = ease.inOutCubic(prog(t, T.hombre, T.mujer + .35));
      const k2 = ease.inOutCubic(prog(t, T.casi, T.reina - .85));
      const k3 = ease.inOutCubic(prog(t, T.reina - .85, T.reina + .02));
      c.save(); c.globalAlpha = aRe;
      if (k1 > 0) flecha(c, pA.x, pA.y, lerp(pA.x, pB.x, k1), lerp(pA.y, pB.y, k1), ACENTO, 9, 36);
      if (k2 > 0) {
        const lev = Math.sin(k2 * Math.PI) * 74, ox = lerp(pA.x, pR.x, k2), oy = lerp(pA.y, pR.y, k2) - lev, dx = pB.x - pA.x, dy = pB.y - pA.y;
        c.globalAlpha = aRe * (1 - k3 * k3) * .75;
        flecha(c, ox, oy, ox + dx, oy + dy, ACENTO, 6, 26);
        c.globalAlpha = aRe;
      }
      if (k3 > 0) flecha(c, pR.x, pR.y, lerp(pR.x, pR.x + pB.x - pA.x, k3), lerp(pR.y, pR.y + pB.y - pA.y, k3), ACENTO, 9, 36);
      c.restore();
      if (t >= T.reina) {
        const r = prog(t, T.reina, T.reina + .7);
        anillo(c, cam, REINA[0], REINA[1], .25 + r * 2.4, ACENTO, (1 - r) * aRe, 4);
        const e = resorte(t - T.reina);
        bolaMundo(c, cam, REINA[0], REINA[1], 0, .3 * e, ACENTO, aRe);
        const q = cam.p(REINA[0], REINA[1]);
        if (q) texto(c, "reina", q.x + 48, q.y + 44, { fuente: serif(126, true), color: ACENTO, alin: "left", alfa: aRe * smooth(prog(t, T.reina, T.reina + .2)) });
      }
    }

    // ---------- embedding: el nombre llega después de haberlo visto ----------
    const aEm = smooth(prog(t, T.embedding - .05, T.embedding + .2));
    if (aEm > 0 && t < T.negro) texto(c, "embedding", 540, 520, { fuente: serif(176, true), color: TINTA, alfa: aEm });
    const aCo = t < T.negro ? smooth(prog(t, T.llamamos + .7, T.llamamos + 1.2)) : 0;
    if (aCo > 0) {
      const q = cam.p(0, 0);
      if (q) {
        bolaMundo(c, cam, 0, 0, 0, .34, TINTA, aCo);
        texto(c, "perro", q.x, q.y + 150, { fuente: serif(96, true), color: TINTA, alfa: aCo });
        texto(c, "[ 0.31, −1.24 ]", q.x, q.y + 232, { fuente: mono(56), color: TINTA, alfa: aCo });
        for (let i = 0; i < 3; i++) { const k = ((t + i * .42) % 1.26) / 1.26; anillo(c, cam, 0, 0, .36 + k * 2.2, TINTA, (1 - k) * aCo * .55, 2.4); }
      }
    }

    // ---------- de dos dimensiones a miles ----------
    if (t >= T.dim2 && t < T.escribes + .5) {
      const atenuaB = 1 - .88 * smooth(prog(t, T.frase - .05, T.frase + .2)) * (1 - smooth(prog(t, T.truco - .1, T.truco + .15)));
      const a = smooth(prog(t, T.dim2 + .5, T.dim2 + 1)), sale = (1 - smooth(prog(t, T.truco + .1, T.truco + .9))) * atenuaB;
      const c0 = { x: 540, y: 880 };
      const mil = ease.outCubic(prog(t, T.miles + .15, T.miles + 1.5));
      const r = azar(11), N = 1500, gy = t * .95, gx = t * .41, empujeM = 1 + .22 * ease.inOutSine(prog(t, T.miles, T.frase));
      c.save(); c.lineCap = "round";
      for (let i = 0; i < 2; i++) {                                     // los dos ejes del mapa
        c.globalAlpha = a * sale; c.strokeStyle = TINTA; c.lineWidth = 5;
        c.beginPath(); c.moveTo(c0.x, c0.y); c.lineTo(c0.x + (i ? 0 : 400), c0.y - (i ? 400 : 0)); c.stroke();
      }
      for (let i = 0; i < N; i++) {                                     // direcciones al azar en la esfera
        const u = r() * 2 - 1, f = r() * 6.2832, q = Math.sqrt(1 - u * u), l0 = r();
        let x = q * Math.cos(f), y = q * Math.sin(f), z = u;
        [x, z] = [x * Math.cos(gy) + z * Math.sin(gy), -x * Math.sin(gy) + z * Math.cos(gy)];
        [y, z] = [y * Math.cos(gx) - z * Math.sin(gx), y * Math.sin(gx) + z * Math.cos(gx)];
        const nace = smooth(prog(mil, i / N * .72, i / N * .72 + .28));
        if (nace <= 0) continue;
        const pers = 1 + z * .32, L = lerp(330, 500, l0) * nace * pers * empujeM;
        c.globalAlpha = a * sale * lerp(.08, .5, (z + 1) / 2);
        c.strokeStyle = TINTA; c.lineWidth = lerp(.9, 2, (z + 1) / 2);
        c.beginPath(); c.moveTo(c0.x, c0.y); c.lineTo(c0.x + x * L, c0.y + y * L); c.stroke();
      }
      c.restore();
      const aB = smooth(prog(t, T.frase - .05, T.frase + .2)) * (1 - smooth(prog(t, T.truco - .1, T.truco + .15)));
      if (aB > 0) {
        const lado = t < T.frase + .85 ? -1 : 1, salto = ease.outBack(prog(t, T.frase + .85, T.frase + 1.2), 1.6);
        const xb = 540 + lerp(-190, 190, salto), yb = 880 - Math.sin(clamp(salto) * Math.PI) * 120;
        c.save(); c.globalAlpha = aB; bola(c, xb, yb, 46); c.restore();
        const l1 = lado < 0 ? 1 : .22, l2 = lado > 0 ? 1 : .22;
        texto(c, "me senté en el banco", 540, 1130, { fuente: serif(84, true), color: TINTA, alfa: aB * l1 });
        texto(c, "el banco me cobró", 540, 1240, { fuente: serif(84, true), color: TINTA, alfa: aB * l2 });
      }
      texto(c, "dos dimensiones", 540, 300, { fuente: serif(104, true), color: TINTA, alfa: a * (1 - smooth(prog(t, T.miles - .1, T.miles + .2))) });
      texto(c, "miles", 540, 300, { fuente: serif(176, true), color: TINTA, alfa: smooth(prog(t, T.miles + .4, T.miles + .7)) * sale });
    }

    // ---------- cuando le escribes ----------
    if (t >= T.escribes - .1 && salida < 1) {
      const a = smooth(prog(t, T.escribes - .05, T.escribes + .3)) * (1 - smooth(prog(t, T.ubica + .5, T.ubica + 1.1)));
      const msj = "¿qué es un perro?", n = Math.floor(msj.length * prog(t, T.escribes + .05, T.nolee - .05));
      const vuelo = prog(t, T.nolee + .15, T.ubica);
      if (a > 0 && vuelo < 1) {
        c.save(); c.globalAlpha = a * (1 - smooth(vuelo * 1.7));
        c.fillStyle = "#FFFFFF"; c.strokeStyle = "rgba(17,17,17,.6)"; c.lineWidth = 3;
        c.beginPath(); c.roundRect(110, 1220, 830, 150, 75); c.fill(); c.stroke(); c.restore();
        texto(c, msj.slice(0, n), 176, 1320, { fuente: serif(82), color: TINTA, alin: "left", alfa: a * (1 - smooth(vuelo * 1.7)) });
      }
      if (vuelo > 0 && vuelo < 1) {
        const q = cam.p(0, 0, .3)!, r = azar(5);
        for (let i = 0; i < granos; i++) {
          const dl = r() * .32, k = ease.inOutCubic(prog(vuelo, dl, dl + .68));
          const ox = 180 + r() * 520, oy = 1300 + r() * 28;
          const my = lerp(oy, q.y, k) - Math.sin(k * Math.PI) * 150;
          c.fillStyle = TINTA; c.globalAlpha = (k < 1 ? 1 : 0) * .85;
          c.fillRect(lerp(ox, q.x, k), my, 4, 4);
        }
        c.globalAlpha = 1;
      }
      if (t >= T.ubica) {
        for (let i = 0; i < 3; i++) {
          const r2 = prog(t, T.ubica + i * .22, T.ubica + i * .22 + 1.1);
          anillo(c, cam, 0, 0, .3 + r2 * 3.6, ACENTO, (1 - r2) * (r2 > 0 ? 1 : 0) * (1 - salida), 4);
        }
      }
      const fr = (s: string, tt: number, y: number) => texto(c, s, 540, y, { fuente: serif(112, true), color: TINTA, alfa: smooth(prog(t, tt, tt + .25)) * (1 - smooth(prog(t, T.aunasi, T.aunasi + .35))) });
      fr("ladra", T.ladra + .55, 240); fr("mueve la cola", T.cola + .2, 370); fr("te espera en la puerta", T.puerta + .2, 500);
    }
  }

  // ---------- rótulos del mundo blanco ----------
  rotulo(c, t, T.leido + 1.1, T.antes + .05, "para GPT-4o, «perro» es esto", 1060, 72, TINTA, true);
  rotulo(c, t, T.punto, T.lugar - .1, "un punto", 1290, 132, TINTA, true);
  rotulo(c, t, T.lugar, T.vive - .2, "un lugar en un mapa", 300, 108);
  rotulo(c, t, T.nadie, T.formo - .1, "Nadie dibujó este mapa.", 300, 100);
  rotulo(c, t, T.formo, T.leyendo - .1, "Se formó solo,", 300, 108, TINTA, true);
  rotulo(c, t, T.leyendo, T.lecomer - .3, "leyendo miles de millones", 300, 92);
  rotulo(c, t, T.leyendo + .35, T.lecomer - .3, "de palabras", 410, 92, TINTA, true);
  rotulo(c, t, T.y2013, T.distancias - .2, "2013", 1400, 170, TINTA, true);
  rotulo(c, t, T.distancias, T.camino - .2, "las distancias", 280, 104);
  rotulo(c, t, T.significaban, T.camino - .2, "significaban cosas", 400, 112, TINTA, true);
  rotulo(c, t, T.explico, T.dijo - .1, "Nadie le explicó qué es la realeza.", 1400, 72);
  rotulo(c, t, T.dijo, T.saco - .2, "Nadie le dijo qué es una mujer.", 1400, 72);
  rotulo(c, t, T.saco, T.llamamos - .1, "Lo sacó de cómo hablamos.", 300, 92);
  rotulo(c, t, T.nolee, T.ubica - .05, "no te lee", 300, 150, TINTA, true);
  rotulo(c, t, T.ubica, T.ladra - .1, "te ubica", 300, 170, ACENTO, true);

  // ---------- la bola del arranque: cae sobre la palabra, se la come y baja al mundo ----------
  const yGolpe = YW - 210;
  const g = 2 * (yGolpe - Y0_BOLA) / (IMPACTO * IMPACTO), tCae = IMPACTO, tIni = 0;
  const pintaBola = (t: number) => {
    let y = Y0_BOLA, r = 40;
    if (t >= tIni) {
      const a = t - tIni;
      if (a < tCae) y = Y0_BOLA + .5 * g * a * a;
      else {
        const e = a - tCae, v0 = 980, g2 = 5200;
        let tt = e, v = v0, base = yGolpe;
        for (let i = 0; i < 5; i++) { const d = 2 * v / g2; if (tt < d) { base = yGolpe - (v * tt - .5 * g2 * tt * tt); break; } tt -= d; v *= .42; }
        y = base;
      }
    }
    const baja = smooth(prog(t, T.punto + .1, tCaePerro));
    const entra = cam0().p(0, 0, 4.3)!;
    r = lerp(40, 40 + 22 * resorte(t - T.punto + .1, 3.2, .5), smooth(prog(t, T.convierte, T.punto + .1)));
    const xb = xBola(t), yy = lerp(y + Math.abs(Math.sin(xb * .021)) * 9, entra.y, baja), xx = lerp(xb, entra.x, baja);
    c.save(); empuje(c, t);
    sombra(c, xb, yGolpe + 44, 58, t > tIni ? .18 * smooth(prog(t, tIni, tIni + tCae)) * (1 - smooth(prog(t, T.antes, T.punto))) : 0);
    bola(c, xx, yy, r);
    c.restore();

    // los números se vuelven polvo y caen dentro de la bola
    const k0 = T.antes + .1, k1 = T.punto + .05;
    if (t >= k0 && t < k1 + .2) {
      c.fillStyle = TINTA;
      datos.polvo.forEach((p, i) => {
        const d = (i % 37) / 37 * .4, k = ease.inCubic(prog(t, lerp(k0, k1, d), k1));
        if (k >= 1) return;
        const ax = 540 + p[0], ay = YW - 62 + p[1];
        const giro = k * 2.1;
        const dx = ax - xx, dy = ay - yy;
        const x = xx + (dx * Math.cos(giro) - dy * Math.sin(giro)) * (1 - k), y2 = yy + (dx * Math.sin(giro) + dy * Math.cos(giro)) * (1 - k);
        c.fillRect(x, y2, 3.4, 3.4);
      });
    }
  };
  if (t < tCaePerro) pintaBola(t); else if (t >= T.eco) pintaBola(tw);

  if (SUBTITULOS && t >= T.acaricia - .3 && t < T.aunasi + 1.2) subtitulo(c, t, L, TINTA);
}

const cam0 = () => camara(VISTAS[0].v);

function preparar() {
  const r = azar(99), fuentesN: Fuente[] = [];
  for (let i = 0; i < 130; i++) fuentesN.push({ x: lerp(-11, 11, r()), y: lerp(-14, 14, r()), a: lerp(.1, .34, r()), s: lerp(.9, 1.9, r()) });
  return {
    P: creaPuntos(), L: creaLineas(), granos: 150, fuentesN,
    polvo: muestreaTexto("9 6 4 3 9", `190px "${MONO}"`, 900, 340, 1300),
  };
}

export const Perro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const [listo, setListo] = useState(false);
  const [h] = useState(() => delayRender("fuentes"));
  useEffect(() => {
    Promise.all([listoA(), listoB(), listoC()]).then(async () => {
      await Promise.all([document.fonts.load(serif(100)), document.fonts.load(serif(100, true)), document.fonts.load(mono(100))]);
      setListo(true); continueRender(h);
    });
  }, [h]);
  const datos = useMemo(() => (listo ? preparar() : null), [listo]);
  useLayoutEffect(() => {
    const cv = ref.current; if (!cv || !datos) return;
    const c = cv.getContext("2d")!;
    c.setTransform(1, 0, 0, 1, 0, 0);
    dibuja(c, frame / fps, datos);
  }, [frame, fps, datos]);
  return <AbsoluteFill style={{ background: PAPEL }}><canvas ref={ref} width={1080} height={1920} style={{ width: 1080, height: 1920 }} /></AbsoluteFill>;
};
