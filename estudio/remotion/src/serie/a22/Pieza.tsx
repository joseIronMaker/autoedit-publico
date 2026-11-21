// Serie 2, capítulo 22: programar. Una muralla de ladrillos de papel se levanta sola; cada ladrillo es una línea de
// código (renglones de tinta con sangría, nada legible) y la bola los lanza a su sitio con sus manos de alambre. Una
// cinta métrica intenta medirla y se dobla. En un tramo de cuatro ladrillos por hilera, tres los lanza la IA (papel
// blanco) y uno lo pone una mano humana (cartón); luego un sello de ingeniero aprueba cada uno de la IA y se clava el
// letrero "cifra de Google". Dieciséis bolitas levantan un torreón de 100,000 ladrillos y en lo alto sube una bandera
// con un pingüino de papel: arranca Linux. Un ladrillo en un barquito baja por las cuatro esclusas. Corte a negro: lo
// incómodo. Un cronómetro cae sobre el escritorio de un programador experto: con IA, 19% más; su globo dice "fui más
// rápido". Un año después la aguja tiembla del lado rápido pero su abanico cruza la marca: "no concluyente",
// "rediseñando". De vuelta en la muralla, un reloj de arena chiquito (~45 s) entre la bola y una persona que conversa
// y revisa; la tarjeta del robot nocturno se tacha. La muralla se termina sola; la bola, arriba, sostiene un plano de
// casa que no coincide, y su "?" pasa a la persona, que asiente.
// Todos los instantes vienen de eventos.json, que escribe partitura.py: dibujo y sonido son los mismos números.
import React from "react";
import { azar, clamp, ease, lerp, prog, resorte, smooth, texto as textoKit } from "../../kit";
import { ACENTO, bola, GRIS, Lienzo, LUZ, mono, NOCHE, PAPEL, rotulo, serif, sombra, TINTA } from "../../marca";
import { agente, brazo } from "../../personaje";
import duracion from "./duracion.json";
import ev from "./eventos.json";

export const DURACION = duracion.dur;
type C = CanvasRenderingContext2D;
type XY = { x: number; y: number };
type D = { tex: HTMLCanvasElement };

// ---------- herramientas ----------
/** El texto del kit pisa globalAlpha; este lo multiplica, así los fundidos de cada grupo también lo apagan. */
const texto = (c: C, s: string, x: number, y: number, o: Parameters<typeof textoKit>[4]) => textoKit(c, s, x, y, { ...o, alfa: (o.alfa ?? 1) * c.globalAlpha });
let FR = 0;
const frac = (x: number) => x - Math.floor(x);
const tiembla = (j: number) => frac(Math.sin(j * 12.9898 + FR * 78.233) * 43758.5453) - .5;
const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * 6.2832 + f);
const ventana = (t: number, a: number, b: number, fi = .25, fo = .3) => smooth(prog(t, a, a + fi)) * (1 - smooth(prog(t, b, b + fo)));
const brota = (t: number, t0: number, f = 4.2, z = .38) => (t < t0 ? 0 : resorte(t - t0, f, z));
const golpeteo = (t: number, t0: number, amp: number, f = 13, d = 7) => (t < t0 || t > t0 + 2.5 ? 0 : amp * Math.exp(-(t - t0) * d) * Math.sin((t - t0) * f));
const BLANCO = "#FDFCF8", CARTON = "#E6DCC6", CARTON_O = "#CDBF9F", PIEL = "#F3ECDF", HUMO = "#D8D2C5", TIERRA = "#E8E2D4";
const AGUA = "rgba(146,174,184,.6)", AGUA_O = "#5F7F8B";

function rr(c: C, x: number, y: number, w: number, h: number, r: number) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function caja(c: C, x: number, y: number, w: number, h: number, r: number, fill: string | null, ink: string | null = TINTA, g = 5) {
  rr(c, x, y, w, h, r);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (ink) { c.strokeStyle = ink; c.lineWidth = g; c.stroke(); }
}
function linea(c: C, ax: number, ay: number, bx: number, by: number, g: number, color = TINTA) {
  c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round"; c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
}
function globo(c: C, x: number, y: number, w: number, h: number, cola: -1 | 1, g = 5) {
  c.beginPath(); c.roundRect(x - w / 2, y - h / 2, w, h, Math.min(h * .45, 46));
  const bx = x + cola * w * .28; c.moveTo(bx - 18 * cola, y + h / 2 - 2); c.lineTo(bx + 14 * cola, y + h / 2 + h * .34); c.lineTo(bx + 26 * cola, y + h / 2 - 2);
  c.fillStyle = BLANCO; c.fill(); c.strokeStyle = TINTA; c.lineWidth = g; c.lineJoin = "round"; c.stroke();
  c.fillStyle = BLANCO; c.fillRect(bx - 16 * (cola > 0 ? 1 : 0) - (cola < 0 ? 26 : 0) + 2, y + h / 2 - 7, 38, 10);
}
/** Globo de pensamiento: un óvalo y tres burbujas que van hacia quien piensa. */
function nube(c: C, x: number, y: number, w: number, h: number, a: number, hacia: XY) {
  if (a <= .01) return;
  c.save(); c.globalAlpha *= a;
  const dx = hacia.x - x, dy = hacia.y - y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  const re = 1 / Math.sqrt((ux / (w / 2)) ** 2 + (uy / (h / 2)) ** 2);
  for (let i = 0; i < 3; i++) {
    const s = Math.min(re + 26 + i * 30, d - 30), r = 15 - i * 4;
    c.beginPath(); c.arc(x + ux * s, y + uy * s, r, 0, 7); c.fillStyle = BLANCO; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 4; c.stroke();
  }
  caja(c, x - w / 2, y - h / 2, w, h, h * .48, BLANCO, TINTA, 5);
  c.restore();
}

// ---------- el ladrillo: una línea de código hecha papel ----------
function ladrillo(c: C, x: number, y: number, w: number, h: number, tipo: number, sem: number, rojo = 0, rot = 0) {
  c.save(); c.translate(x, y); if (rot) c.rotate(rot);
  c.fillStyle = tipo === 1 ? CARTON : BLANCO; c.fillRect(-w / 2, -h / 2, w, h);
  c.strokeStyle = TINTA; c.lineWidth = 3.2; c.strokeRect(-w / 2, -h / 2, w, h);
  // renglones de tinta: sangría y tramos, como código visto de lejos; ninguna letra
  const r = azar(sem); c.lineCap = "round"; c.strokeStyle = TINTA; c.lineWidth = Math.max(2.2, h * .085);
  const n = h > 40 ? 3 : 1;
  for (let i = 0; i < n; i++) {
    const yy = -h / 2 + h * (i + 1) / (n + 1) + tiembla(sem * 3 + i) * .9;
    let x0 = -w / 2 + w * .09 + Math.floor(r() * 3) * w * .07;
    const tramos = 1 + Math.floor(r() * 2.4);
    for (let k = 0; k < tramos && x0 < w / 2 - w * .14; k++) {
      const L = w * (.1 + r() * .3), x1 = Math.min(x0 + L, w / 2 - w * .08);
      c.beginPath(); c.moveTo(x0, yy); c.lineTo(x1, yy); c.stroke();
      x0 = x1 + w * .06;
    }
  }
  if (rojo > .01) { c.globalAlpha *= rojo; c.strokeStyle = ACENTO; c.lineWidth = 8; c.strokeRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6); }
  c.restore();
}
function marcaSello(c: C, x: number, y: number, edad: number) {
  const k = edad < .12 ? lerp(1.6, 1, edad / .12) : 1;
  c.save(); c.translate(x, y); c.scale(k, k); c.rotate(-.2);
  c.strokeStyle = ACENTO; c.lineWidth = 4.5; c.beginPath(); c.arc(0, 0, 21, 0, 7); c.stroke();
  c.lineWidth = 5; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath(); c.moveTo(-9, 1); c.lineTo(-2, 8); c.lineTo(10, -8); c.stroke();
  c.restore();
}

// ---------- la muralla: cada ladrillo sabe dónde va, cuándo llega y quién lo pone ----------
type Lad = { x: number; y: number; w: number; r: number; tp: number; tipo: number; modo: number; sem: number; ts: number; tramo: number };
type Tiro = { tl: number; h: number; R: XY; L: Lad };
const FL = .42;
const PA = { x: 680, y: -90 }, PB = { x: -100, y: -90 }, PC = { x: 330, y: -90 }, PD = { x: 250, y: -986 };
const LADS: Lad[] = [], TIROS: Tiro[] = [], HUM: Lad[] = [], SELL: Lad[] = [];
(function arma() {
  const pos: { x: number; w: number; r: number }[] = [];
  for (let r = 0; r < 14; r++) {
    if (r % 2 === 0) for (let k = -9; k <= 3; k++) pos.push({ x: k * 160, w: 152, r });
    else { pos.push({ x: -1480, w: 72, r }); for (let k = -9; k <= 2; k++) pos.push({ x: k * 160 + 80, w: 152, r }); pos.push({ x: 520, w: 72, r }); }
  }
  const yDe = (r: number) => -(r + .5) * 64;
  let sem = 11;
  const nuevo = (p: { x: number; w: number; r: number }, tp: number, modo: number, tipo = 0, tramo = 0): Lad => {
    const L = { x: p.x, y: yDe(p.r), w: p.w, r: p.r, tp, tipo, modo, sem: sem++, ts: 999, tramo };
    LADS.push(L); return L;
  };
  const usados = new Set<object>();
  // 1. el arranque: lo lanza la bola desde la derecha, de cerca a lejos
  const s0 = pos.filter((p) => p.x >= -80 && p.r <= 8).sort((a, b) => a.r - b.r || b.x - a.x);
  let j = 0;
  for (const p of s0) {
    usados.add(p);
    if (p.r < 2) { nuevo(p, -9, 0); continue; }
    const h = j % 2, L = nuevo(p, ev.s0[j], 1);
    TIROS.push({ tl: L.tp - FL, h, R: h ? { x: PA.x + 30, y: -360 } : { x: PA.x - 110, y: -330 }, L });
    j++;
  }
  // 2. el tramo de Google: por hilera, tres de la IA y uno humano
  const HC = [0, 0, 0, 0, 0];
  for (let r = 0; r < 5; r++) {
    const fila = pos.filter((p) => p.r === r && p.x >= -640 && p.x <= -80).sort((a, b) => a.x - b.x);
    let q = 0;
    fila.forEach((p, i) => {
      usados.add(p);
      if (i === HC[r]) { HUM.push(nuevo(p, ev.s1hum[r], 2, 1, 1)); return; }
      const k = r * 3 + q++, h = k % 2, L = nuevo(p, ev.s1ia[k], 1, 0, 1);
      TIROS.push({ tl: L.tp - FL, h, R: h ? { x: PB.x + 20, y: -370 } : { x: PB.x - 120, y: -340 }, L });
    });
  }
  // los sellos: de arriba abajo, en serpentina
  let ks = 0;
  for (let r = 4; r >= 0; r--) {
    const fila = LADS.filter((L) => L.tramo === 1 && L.tipo === 0 && L.r === r).sort((a, b) => ((4 - r) % 2 ? b.x - a.x : a.x - b.x));
    for (const L of fila) { L.ts = ev.sellos[ks++]; SELL.push(L); }
  }
  // 3. la obra durante la conversación: una hilera más arriba del arranque
  const ob = pos.filter((p) => p.r === 9 && p.x >= -80).sort((a, b) => a.x - b.x);
  ob.forEach((p, i) => {
    usados.add(p);
    const h = i % 2, L = nuevo(p, ev.obra[i], 1);
    TIROS.push({ tl: L.tp - FL, h, R: h ? { x: PC.x + 60, y: -350 } : { x: PC.x - 70, y: -330 }, L });
  });
  // 4. lo demás se levanta solo al final, en ola
  const [a, b] = ev.rush;
  for (const p of pos) if (!usados.has(p)) nuevo(p, a + (b - a - .1) * (.6 * p.r / 13 + .4 * (p.x + 1516) / 2072), 3);
  TIROS.sort((x, y) => x.tl - y.tl);
})();
const TIROS_H = [TIROS.filter((x) => x.h === 0), TIROS.filter((x) => x.h === 1)];

function muro(c: C, t: number) {
  for (const L of LADS) {
    if (t < L.tp) continue;
    const b = Math.abs(golpeteo(t, L.tp, 10, 30, 13));
    const rojo = L.tramo === 1 && L.tipo === 0 ? ventana(t, ev.ia, ev.ia + .75, .1, .35) : 0;
    ladrillo(c, L.x, L.y - b, L.w, 56, L.tipo, L.sem, rojo);
    if (t >= L.ts) marcaSello(c, L.x + 36, L.y, t - L.ts);
    const age = t - L.tp;
    if (age < .38 && L.modo !== 0) {
      const r = azar(L.sem + 5); c.fillStyle = TINTA;
      for (let i = 0; i < 8; i++) {
        const lado = i % 2 ? 1 : -1, v = 90 + r() * 160;
        c.globalAlpha = (1 - age / .38) * .5;
        c.fillRect(L.x + lado * (L.w / 2 + age * v), L.y + 26 - age * (60 + r() * 80) + age * age * 400, 4, 4);
      }
      c.globalAlpha = 1;
    }
  }
}
function vuelos(c: C, t: number) {
  for (const T of TIROS) {
    const L = T.L; if (t >= L.tp || t < T.tl) continue;
    const u = (t - T.tl) / FL, dx = Math.abs(L.x - T.R.x), H = L.tramo === 0 && L.r <= 8 ? 60 + dx * .1 : 130 + dx * .22;
    ladrillo(c, lerp(T.R.x, L.x, u), lerp(T.R.y, L.y, u) - H * 4 * u * (1 - u), L.w, 56, L.tipo, L.sem, 0, (1 - u) * (T.h ? -1.3 : 1.1));
  }
  if (t > ev.rush[0] - .6 && t < ev.rush[1] + .1) for (const L of LADS) {
    if (L.modo !== 3 || t >= L.tp || t < L.tp - .55) continue;
    const u = prog(t, L.tp - .55, L.tp);
    ladrillo(c, L.x + (1 - u) * (L.x - 200) * .25, L.y - 2900 * (1 - u * u), L.w, 56, 0, L.sem, 0, (1 - u) * .5);
  }
}

// ---------- la bola ----------
function bolaPos(t: number): XY {
  if (t < 6.05) return PA;
  if (t < 6.75) { const u = prog(t, 6.05, 6.75); return { x: lerp(PA.x, PB.x, ease.inOutCubic(u)), y: PA.y - 300 * Math.sin(Math.PI * u) }; }
  if (t < ev.negro) return PB;
  if (t < ev.salta) return PC;
  if (t < ev.salta + .6) { const u = prog(t, ev.salta, ev.salta + .6); return { x: lerp(PC.x, PD.x, u), y: lerp(PC.y, PD.y, ease.outCubic(u)) - 240 * Math.sin(Math.PI * u) }; }
  return PD;
}
const REST = (B: XY, h: number, t: number): XY => ({ x: B.x + (h ? 150 : -150), y: B.y + 6 + 8 * Math.sin(t * 2.6 + h * 2) });
function manoTiro(t: number, B: XY, h: number): { p: XY; lad: Lad | null } {
  const lista = TIROS_H[h];
  let j = -1;
  for (let i = 0; i < lista.length; i++) { if (lista[i].tl - .22 <= t) j = i; else break; }
  const rest = REST(B, h, t);
  if (j < 0) return { p: rest, lad: null };
  const T = lista[j];
  const ret = (T2: Tiro): XY => { const k2 = smooth(prog(t, T2.tl, T2.tl + .3)); return { x: lerp(T2.R.x, rest.x, k2), y: lerp(T2.R.y, rest.y, k2) }; };
  if (t < T.tl) {
    const prev = j > 0 ? ret(lista[j - 1]) : rest;
    const k1 = smooth(prog(t, T.tl - .22, T.tl));
    return { p: { x: lerp(prev.x, T.R.x, k1), y: lerp(prev.y, T.R.y, k1) }, lad: T.L };
  }
  return { p: ret(T), lad: null };
}
const mezcla = (a: XY, b: XY, k: number): XY => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) });
function bolaPrincipal(c: C, t: number) {
  if (t >= ev.negro && t < ev.aTaller - .3) return;
  const B0 = bolaPos(t);
  const enAire = t > 6.05 && t < 6.75 || t > ev.salta && t < ev.salta + .6;
  const bob = enAire ? 0 : Math.abs(Math.sin(t * 4.1)) * 7;
  const B = { x: B0.x + Math.sin(t * 1.7) * 4, y: B0.y - bob };
  const arriba = t >= ev.salta + .3;
  const piso = arriba ? -896 : 0;
  sombra(c, B.x, piso + 4, 150, .3 * clamp(1 - (piso - B.y - 90) / 500));
  const A = manoTiro(t, B, 0), Bm = manoTiro(t, B, 1);
  let m1 = A.p, m2 = Bm.p;
  // la bola habla en la conversación: levanta una mano
  const habla = ventana(t, ev.conversa[1] - .1, ev.conversa[2], .15, .3);
  if (habla > 0) m1 = mezcla(m1, { x: B.x - 170, y: B.y - 160 + Math.sin(t * 9) * 14 }, habla);
  // le acerca un ladrillo a la persona para que lo revise
  const ext = ventana(t, ev.revisa - .4, ev.aLejos - .3, .3, .3);
  if (ext > 0) m2 = mezcla(m2, { x: B.x + 250, y: B.y - 230 }, ext);
  // salto con los brazos arriba
  const sal = ventana(t, ev.salta - .1, ev.salta + .65, .12, .25);
  if (sal > 0) { m1 = mezcla(m1, { x: B.x - 130, y: B.y - 150 }, sal); m2 = mezcla(m2, { x: B.x + 130, y: B.y - 150 }, sal); }
  // sostiene el plano
  const pl = smooth(prog(t, ev.plano - .3, ev.plano + .1));
  const suelta = smooth(prog(t, ev.pasa + .5, ev.pasa + 1.1));
  if (pl > 0) { m1 = mezcla(m1, { x: 430, y: -1062 + suelta * 14 }, pl); m2 = mezcla(m2, { x: 740, y: -1060 + suelta * 14 }, pl); }
  if (A.lad) ladrillo(c, m1.x, m1.y - 30, A.lad.w, 56, A.lad.tipo, A.lad.sem, 0, -.15);
  if (Bm.lad) ladrillo(c, m2.x, m2.y - 30, Bm.lad.w, 56, Bm.lad.tipo, Bm.lad.sem, 0, .12);
  if (ext > .5) ladrillo(c, m2.x + 4, m2.y - 28, 126, 48, 0, 4242, 0, -.06);
  brazo(c, B.x - 54, B.y - 50, m1.x, m1.y, 90, .55, TINTA, 1, 1);
  brazo(c, B.x + 60, B.y - 30, m2.x, m2.y, -100, .55, TINTA, 1, 1);
  bola(c, B.x, B.y, 90);
}

// ---------- la mano humana del tramo de Google ----------
function manoArriba(c: C, x: number, y: number) {
  c.save(); c.translate(x, y); c.lineJoin = "round";
  caja(c, -58, -1700, 116, 1660, 16, HUMO, TINTA, 6);
  linea(c, -56, -62, 56, -62, 5);
  caja(c, -50, -46, 100, 80, 30, PIEL, TINTA, 6);
  for (const dx of [-33, -11, 11, 33]) caja(c, dx - 11, 14, 22, 48, 11, PIEL, TINTA, 5);
  c.restore();
}
function sellito(c: C, x: number, y: number) {
  caja(c, x - 62, y + 108, 124, 40, 8, CARTON_O, TINTA, 5);
  c.fillStyle = ACENTO; c.fillRect(x - 56, y + 148, 112, 9);
  caja(c, x - 12, y + 52, 24, 60, 6, CARTON_O, TINTA, 4);
  c.beginPath(); c.arc(x, y + 44, 28, 0, 7); c.fillStyle = CARTON_O; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 5; c.stroke();
}
function manoHumana(c: C, t: number) {
  for (const L of HUM) {
    const a = L.tp - .42, b = L.tp + .38; if (t < a || t > b) continue;
    const yTop = L.y - 1100, yP = L.y - 70;
    const y = t < L.tp ? lerp(yTop, yP, ease.outCubic(prog(t, a, L.tp))) : lerp(yP, yTop, ease.inCubic(prog(t, L.tp + .06, b)));
    if (t < L.tp) ladrillo(c, L.x, y + 70, L.w, 56, 1, L.sem);
    manoArriba(c, L.x + Math.sin(t * 9) * 3, y);
    return;
  }
  const a = SELL[0].ts - .4, b = SELL[14].ts + .45;
  if (t < a || t > b) return;
  const pr = (L: Lad): XY => ({ x: L.x + 36, y: L.y - 157 });
  let p: XY;
  if (t < SELL[0].ts) { const q = pr(SELL[0]); p = { x: q.x, y: lerp(q.y - 1100, q.y, ease.outCubic(prog(t, a, SELL[0].ts))) }; }
  else if (t >= SELL[14].ts) { const q = pr(SELL[14]); p = { x: q.x, y: lerp(q.y, q.y - 1100, ease.inCubic(prog(t, SELL[14].ts + .05, b))) }; }
  else {
    let k = 0; while (k < 13 && t >= SELL[k + 1].ts) k++;
    const p0 = pr(SELL[k]), p1 = pr(SELL[k + 1]), u = prog(t, SELL[k].ts, SELL[k + 1].ts);
    p = { x: lerp(p0.x, p1.x, smooth(u)), y: lerp(p0.y, p1.y, u) - 64 * Math.sin(Math.PI * u) };
  }
  sellito(c, p.x, p.y); manoArriba(c, p.x, p.y);
}

// ---------- la cinta métrica que no alcanza ----------
function cinta(c: C, t: number) {
  if (t < ev.cinta - .35 || t > ev.cuantoF + 1.1) return;
  const CX = -165, CY = -52;
  const esc = ease.outBack(prog(t, ev.cinta - .35, ev.cinta), 1.4) * (1 - smooth(prog(t, ev.cuantoF + .45, ev.cuantoF + .9)));
  if (esc <= .01) return;
  let L = 760 * ease.outCubic(prog(t, ev.cinta, ev.cinta + .95));
  L *= 1 - ease.inCubic(prog(t, ev.cuantoF + .02, ev.cuantoF + .38));
  const th = t < ev.cuanto ? 0 : 2.6 * clamp(resorte(t - ev.cuanto, 1.5, .42), 0, 1.25);
  const sway = .09 * Math.sin(t * 4.3) * prog(t, ev.cinta + .4, ev.cinta + 1.1);
  const Lb = 330, N = 56;
  c.save(); c.translate(CX, CY); c.scale(esc, esc); c.translate(-CX, -CY);
  if (L > 4) {
    const pts: { x: number; y: number; a: number }[] = [];
    let x = CX + 34, y = CY - 46, a = -Math.PI / 2;
    for (let i = 0; i <= N; i++) {
      const s2 = L * i / N;
      const u = s2 > Lb ? (s2 - Lb) / Math.max(L - Lb, 1) : 0;
      a = -Math.PI / 2 + sway * (s2 / 380) - th * u ** 1.1 * 1.25;
      pts.push({ x, y, a });
      x += Math.cos(a) * L / N; y += Math.sin(a) * L / N;
    }
    c.lineJoin = "round"; c.lineCap = "butt";
    c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
    c.strokeStyle = TINTA; c.lineWidth = 42; c.stroke(); c.strokeStyle = CARTON; c.lineWidth = 33; c.stroke();
    c.strokeStyle = TINTA; c.lineCap = "round";
    pts.forEach((p, i) => {
      if (i === 0) return;
      const nx = -Math.sin(p.a), ny = Math.cos(p.a), l = i % 5 === 0 ? 20 : 9;
      c.lineWidth = i % 5 === 0 ? 3.4 : 2.2; c.beginPath(); c.moveTo(p.x + nx * 15, p.y + ny * 15); c.lineTo(p.x + nx * (15 - l), p.y + ny * (15 - l)); c.stroke();
    });
    const e = pts[pts.length - 1];
    c.save(); c.translate(e.x, e.y); c.rotate(e.a + Math.PI / 2); caja(c, -26, -10, 52, 16, 3, TINTA, null); c.restore();
  }
  caja(c, CX - 66, CY - 56, 132, 108, 22, CARTON_O, TINTA, 6);
  c.beginPath(); c.arc(CX - 4, CY - 2, 30, 0, 7); c.fillStyle = BLANCO; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 5; c.stroke();
  c.save(); c.translate(CX - 4, CY - 2); c.rotate(-L / 40); linea(c, -20, 0, 20, 0, 4); c.restore();
  c.restore();
}

// ---------- el letrero clavado en el tramo ----------
function letrero(c: C, t: number) {
  if (t < ev.cifra || t > ev.aTorre + 1.4) return;
  const k = clamp(brota(t, ev.cifra, 3.4, .42), 0, 1.25);
  const X = -400, Y = -322;
  c.save(); c.translate(X, Y); c.scale(1, k); c.rotate(.035 * Math.sin(t * 2.1) * Math.min(k, 1));
  linea(c, 0, 0, 0, -250, 20); linea(c, 0, -2, 0, -248, 11, CARTON_O);
  caja(c, -300, -400, 600, 140, 12, BLANCO, TINTA, 6);
  texto(c, "cifra de Google", 0, -305, { fuente: serif(86, true), color: TINTA });
  c.restore();
}

// ---------- el torreón ----------
const TX0 = 1100, TW = 600, TH = 2592, TCX = 1400;
const alto = (t: number) => TH * (1 - (1 - prog(t, ev.sube, ev.tope)) ** 2);
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
  const N = 14, ond = (u: number, f: number) => Math.sin(u * 5.5 - t * 7 + f) * 13 * u;
  c.beginPath();
  for (let i = 0; i <= N; i++) { const u = i / N; c.lineTo(x + w * u, y + ond(u, 0)); }
  for (let i = N; i >= 0; i--) { const u = i / N; c.lineTo(x + w * u, y + h + ond(u, .5)); }
  c.closePath(); c.fillStyle = BLANCO; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 6; c.lineJoin = "round"; c.stroke();
  if (w > 180) pinguino(c, x + w * .5, y + h * .5 + ond(.5, .25), 1.2);
}
function bolita(i: number, t: number): { x: number; y: number; k: number } {
  const g = { x: TCX + (i % 4 - 1.5) * 150, y: -430 + (Math.floor(i / 4) - 1.5) * 150 };
  const k = clamp(brota(t, ev.pops[i], 4.5, .4), 0, 1.3);
  const lado = i % 2 ? -1 : 1, j = Math.floor(i / 2);
  const H = Math.max(alto(t), 260);
  const at = { x: TCX + lado * (TW / 2 + 50 + (j % 2) * 88), y: Math.min(-H + 20 + Math.floor(j / 2) * 110 + (j % 2) * 55, -60) };
  const u = ease.inOutCubic(prog(t, ev.sube + i * .02, ev.sube + .6 + i * .02));
  return { x: lerp(g.x, at.x, u), y: lerp(g.y, at.y, u) - Math.sin(Math.PI * u) * 140 + vaiven(t, .5 + (i % 3) * .1, i) * 6, k };
}
function torre(c: C, t: number, d: D) {
  if (t < ev.aTorre - .5) return;
  const H = alto(t);
  if (H > 1) {
    c.imageSmoothingQuality = "high";
    c.drawImage(d.tex, 0, TH - H, TW, H, TX0, -H, TW, H);
    c.strokeStyle = TINTA; c.lineWidth = 8; c.strokeRect(TX0 + tiembla(1) * 2, -H, TW, H);
  }
  if (t > ev.tope) for (let m = 0; m < 7; m++) {
    const hh = 58 * clamp(brota(t, ev.tope + m * .035, 4, .4), 0, 1.25);
    if (hh > 1) caja(c, TX0 + 12 + m * 96, -TH - hh, 60, hh, 2, BLANCO, TINTA, 5);
  }
  const kp = ease.outBack(prog(t, ev.linux - .3, ev.linux + .12), 1.3);
  if (kp > 0) {
    const base = -TH - 58, top = base - 360 * kp;
    linea(c, TCX, base, TCX, top, 10);
    c.beginPath(); c.arc(TCX, top - 8, 11, 0, 7); c.fillStyle = TINTA; c.fill();
    const kf = ease.outCubic(prog(t, ev.linux, ev.linux + .4));
    if (kf > .02) bandera(c, TCX + 5, top + 4, 270 * kf, 180, t);
  }
  // las dieciséis bolitas: aparecen, suben con la torre y la siguen levantando
  const rise = t > ev.sube + .35 && t < ev.tope + .05;
  for (let i = 0; i < 16; i++) {
    const b = bolita(i, t); if (b.k <= .01) continue;
    const lado = i % 2 ? -1 : 1, r = 42 * b.k;
    let m1: XY, m2: XY;
    m1 = { x: b.x - 66 * b.k, y: b.y - 84 * b.k + Math.sin(t * 9 + i) * 12 }; m2 = { x: b.x + 66 * b.k, y: b.y - 84 * b.k + Math.cos(t * 9 + i) * 12 };
    const llega = smooth(prog(t, ev.sube + .45 + i * .02, ev.sube + .8 + i * .02));
    if (llega > 0) {
      const Hh = alto(t);
      const borde = { x: TCX + lado * (TW / 2 - 30), y: Math.max(-Hh - 8, b.y - 130) };
      const libre = { x: b.x + lado * 70, y: b.y - 64 + Math.sin(t * 8 + i) * 16 };
      if (lado > 0) { m1 = mezcla(m1, borde, llega); m2 = mezcla(m2, libre, llega); } else { m1 = mezcla(m1, libre, llega); m2 = mezcla(m2, borde, llega); }
    }
    if (rise) for (let n = 0; n < 2; n++) {
      const z = (t - ev.sube) / .32 + i * .37 + n * .5, ph = frac(z), cic = Math.floor(z);
      const ini = lado > 0 ? m2 : m1;
      const fin = { x: TCX + lado * TW * .5 * (.12 + .74 * frac(i * .61 + n * .3 + cic * .17)), y: -alto(t) - 6 };
      const x = lerp(ini.x, fin.x, ph), y = lerp(ini.y, fin.y, ph) - 110 * 4 * ph * (1 - ph);
      caja(c, x - 16, y - 7, 32, 13, 1, BLANCO, TINTA, 2.5);
    }
    agente(c, b.x, b.y, r, [m1.x, m1.y], [m2.x, m2.y]);
  }
}

// ---------- el canal con cuatro esclusas ----------
const CW = 340, SD = 260, X0 = -3036, Y0 = -970, XF = -1516;
const lev = (p: number) => Y0 + p * SD - 30;
const xIzq = (p: number) => X0 + p * CW;
const xDer = (p: number) => (p < 4 ? X0 + (p + 1) * CW : XF);
const fondo = (p: number) => (p < 4 ? lev(p + 1) + 100 : lev(4) + 100);
const borde = (p: number) => (p < 4 ? lev(p) - 80 : 0);
const xc = (p: number) => (xIzq(p) + xDer(p)) / 2;
function agua(p: number, t: number) { if (p >= 4) return lev(4); const a = ev.abre[p]; return lerp(lev(p), lev(p + 1), ease.inOutCubic(prog(t, a + .04, a + .5))); }
const levanta = (g: number, t: number) => 300 * ease.outCubic(prog(t, ev.abre[g] - .06, ev.abre[g] + .26));
const cae = (g: number, t: number) => (t < ev.compuertas[g] - .25 ? 1 : 1 - ease.inCubic(prog(t, ev.compuertas[g] - .25, ev.compuertas[g])));
// Las mismas señas de las esclusas del capítulo 21: 1 palomita, 2 flecha de regreso, 3 marco, 4 balanza.
const VERDE = "#4E7D57", VERDE_C = "#8DB892";
function icono(c: C, g: number, k: number, t: number) {
  const col = k > .5 ? VERDE : TINTA;
  c.strokeStyle = col; c.fillStyle = col; c.lineCap = "round"; c.lineJoin = "round";
  if (g === 0) {
    c.strokeStyle = TINTA; c.lineWidth = 7; c.strokeRect(-34, -34, 68, 68);
    if (k > 0) {
      const pts: [number, number][] = [[-22, 0], [-6, 18], [26, -26]], L1 = Math.hypot(16, 18), L2 = Math.hypot(32, 44), d = clamp(k) * (L1 + L2);
      c.strokeStyle = VERDE; c.lineWidth = 11; c.beginPath(); c.moveTo(...pts[0]);
      if (d <= L1) c.lineTo(lerp(pts[0][0], pts[1][0], d / L1), lerp(pts[0][1], pts[1][1], d / L1));
      else { c.lineTo(...pts[1]); c.lineTo(lerp(pts[1][0], pts[2][0], (d - L1) / L2), lerp(pts[1][1], pts[2][1], (d - L1) / L2)); }
      c.stroke();
    }
  } else if (g === 1) {
    c.save(); c.rotate(-6.2832 * ease.inOutCubic(clamp(k)));
    c.lineWidth = 9; c.beginPath(); c.arc(0, 0, 32, -.5, 4.1); c.stroke();
    const ax = Math.cos(4.3) * 32, ay = Math.sin(4.3) * 32, tx = -Math.sin(4.3), ty = Math.cos(4.3);
    c.beginPath(); c.moveTo(ax - tx * 4 + Math.cos(4.3) * 15, ay - ty * 4 + Math.sin(4.3) * 15); c.lineTo(ax - tx * 22, ay - ty * 22); c.lineTo(ax - tx * 4 - Math.cos(4.3) * 15, ay - ty * 4 - Math.sin(4.3) * 15); c.closePath(); c.fill();
    c.restore();
  } else if (g === 2) {
    c.lineWidth = 4; c.setLineDash([7, 7]); c.strokeRect(-26, -20, 52, 40); c.setLineDash([]);
    c.lineWidth = 9; c.lineCap = "square"; const e = 1 + (1 - clamp(k)) * .25 * (k > 0 ? 1 : 0);
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { c.beginPath(); c.moveTo(sx * 38 * e, sy * 30 * e - sy * 16); c.lineTo(sx * 38 * e, sy * 30 * e); c.lineTo(sx * 38 * e - sx * 16, sy * 30 * e); c.stroke(); }
  } else {
    const th = .25 * Math.sin(t * 2.2) * (1 - clamp(k)) * .4;
    c.lineWidth = 5; linea(c, 0, 38, 0, -22, 5, col); linea(c, -18, 38, 18, 38, 5, col);
    c.save(); c.translate(0, -24); c.rotate(th); linea(c, -38, 0, 38, 0, 5, col);
    for (const sx of [-1, 1]) { c.save(); c.translate(sx * 36, 0); c.rotate(-th); linea(c, 0, 0, -10, 22, 2.5, col); linea(c, 0, 0, 10, 22, 2.5, col); c.beginPath(); c.moveTo(-15, 22); c.lineTo(15, 22); c.quadraticCurveTo(0, 34, -15, 22); c.fillStyle = col; c.fill(); c.restore(); }
    c.restore(); c.beginPath(); c.arc(0, -24, 5, 0, 7); c.fillStyle = col; c.fill();
  }
}
function barco(c: C, x: number, y: number, rot: number) {
  c.save(); c.translate(x, y); c.rotate(rot);
  ladrillo(c, 0, -40, 132, 48, 0, 777);
  c.beginPath(); c.moveTo(-122, -14); c.lineTo(122, -14); c.lineTo(86, 32); c.lineTo(-86, 32); c.closePath();
  c.fillStyle = BLANCO; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 5; c.lineJoin = "round"; c.stroke();
  linea(c, -122, -14, -64, 32, 2.6); linea(c, 122, -14, 64, 32, 2.6);
  c.restore();
}
function barcoPos(t: number): { x: number; y: number; rot: number; p: number } | null {
  if (t < ev.codigo) return null;
  if (t < ev.chapuzon) { const u = prog(t, ev.codigo, ev.chapuzon); return { x: xc(0), y: lerp(lev(0) - 1300, lev(0) - 10, u * u), rot: (1 - u) * .35, p: 0 }; }
  const balanceo = golpeteo(t, ev.chapuzon, .2, 9, 3) + .035 * Math.sin(t * 2.4);
  for (let g = 0; g < 4; g++) {
    const a = ev.abre[g] + .36, b = ev.abre[g] + .86;
    if (t >= a && t < b) { const u = ease.inOutCubic(prog(t, a, b)); return { x: lerp(xc(g), xc(g + 1), u), y: lerp(agua(g, t), agua(g + 1, t), u) - 10 + Math.sin(u * Math.PI) * -10, rot: balanceo - Math.sin(u * Math.PI) * .08, p: u < .5 ? g : g + 1 }; }
  }
  let p = 0; for (let g = 0; g < 4; g++) if (t >= ev.abre[g] + .86) p = g + 1;
  return { x: xc(p), y: agua(p, t) - 10 + Math.sin(t * 3.1) * 4, rot: balanceo, p };
}
function canal(c: C, t: number) {
  if (t < ev.aCanal - .7 || t > ev.negro + .1) {
    if (t < ev.aLejos) return;
  }
  // el cerro
  c.beginPath(); c.moveTo(X0 - 1100, borde(0)); c.lineTo(X0, borde(0));
  for (let p = 0; p < 4; p++) { c.lineTo(xDer(p), borde(p)); c.lineTo(xDer(p), borde(p + 1)); }
  c.lineTo(XF, 0); c.lineTo(XF, 900); c.lineTo(X0 - 1100, 900); c.closePath();
  c.fillStyle = TIERRA; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 5; c.stroke();
  // rayado de tierra
  c.save(); c.clip(); c.strokeStyle = "rgba(17,17,17,.13)"; c.lineWidth = 3; const r = azar(8);
  for (let i = 0; i < 70; i++) { const x = X0 - 1000 + r() * 2600, y = -1100 + r() * 2000; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 26, y + 22); c.stroke(); }
  c.restore();
  // pozas
  for (let p = 0; p <= 4; p++) {
    const x0 = xIzq(p), x1 = xDer(p), top = borde(p) - 3, fo = fondo(p);
    c.fillStyle = PAPEL; c.fillRect(x0, top, x1 - x0, fo - top);
    const w = agua(p, t);
    c.beginPath(); c.moveTo(x0, fo);
    for (let x = x0; x <= x1; x += 20) c.lineTo(x, w + 3.5 * Math.sin(x * .045 + t * 3.2) + (x === x0 ? 0 : 0));
    c.lineTo(x1, w); c.lineTo(x1, fo); c.closePath(); c.fillStyle = AGUA; c.fill();
    c.beginPath(); for (let x = x0; x <= x1; x += 20) { const y = w + 3.5 * Math.sin(x * .045 + t * 3.2); if (x === x0) c.moveTo(x, y); else c.lineTo(x, y); }
    c.strokeStyle = AGUA_O; c.lineWidth = 4; c.stroke();
    linea(c, x0, fo, x1, fo, 6);
    if (p === 0) linea(c, x0, borde(0), x0, fo, 6);
    if (p < 4) linea(c, x1, fo, x1, fondo(p + 1), 6);
    else linea(c, x1, 0, x1, fo, 6);
  }
  // chorro de cada compuerta que se abre
  for (let g = 0; g < 4; g++) {
    const xg = xDer(g), dif = lev(g + 1) - agua(g, t);
    if (dif < 3 || levanta(g, t) < 40) continue;
    c.strokeStyle = AGUA_O; c.lineCap = "round"; c.globalAlpha = .85;
    c.lineWidth = 10 + dif * .22; c.beginPath(); c.moveTo(xg - 18, agua(g, t) + 12); c.quadraticCurveTo(xg + 40, agua(g, t) + 14, xg + 76, lev(g + 1) + 6); c.stroke();
    c.globalAlpha = 1; c.fillStyle = BLANCO; const r2 = azar(g + FR);
    for (let i = 0; i < 10; i++) { c.beginPath(); c.arc(xg + 60 + r2() * 70, lev(g + 1) - r2() * 22, 3 + r2() * 5, 0, 7); c.fill(); }
  }
  // el barco
  const B = barcoPos(t);
  if (B) {
    barco(c, B.x, B.y, B.rot);
    // la parte sumergida queda detrás del agua
    const p = B.p, w = agua(p, t);
    c.fillStyle = "rgba(146,174,184,.45)"; c.fillRect(B.x - 130, w + 4, 260, 40);
  }
  // salpicadura
  const sp = t - ev.chapuzon;
  if (sp > 0 && sp < .9) {
    const r3 = azar(55); c.fillStyle = AGUA_O;
    for (let i = 0; i < 18; i++) {
      const vx = (r3() - .5) * 700, vy = -300 - r3() * 600;
      c.globalAlpha = 1 - sp / .9; c.beginPath(); c.arc(xc(0) + vx * sp, lev(0) + vy * sp + 1400 * sp * sp, 6 + r3() * 6, 0, 7); c.fill();
    }
    c.globalAlpha = 1;
    c.strokeStyle = AGUA_O; c.lineWidth = 4; c.globalAlpha = 1 - sp / .9; c.beginPath(); c.ellipse(xc(0), lev(0), 60 + sp * 260, 10 + sp * 20, 0, 0, 7); c.stroke(); c.globalAlpha = 1;
  }
  // compuertas
  for (let g = 0; g < 4; g++) {
    if (t < ev.compuertas[g] - .3) continue;
    const xg = xDer(g), top = borde(g), cy = cae(g, t) * -700;
    const k = clamp(brota(t, ev.compuertas[g] - .05, 4, .45), 0, 1.2);
    // marco
    c.save(); c.translate(0, cy);
    linea(c, xg - 28, top, xg - 28, top - 340, 9); linea(c, xg + 28, top, xg + 28, top - 340, 9);
    caja(c, xg - 50, top - 362, 100, 24, 4, CARTON_O, TINTA, 5);
    // tablón
    const lv = levanta(g, t);
    caja(c, xg - 16, top - lv, 32, fondo(g) - top + 4, 3, CARTON_O, TINTA, 5);
    for (let i = 1; i < 5; i++) linea(c, xg - 14, top - lv + i * (fondo(g) - top) / 5, xg + 14, top - lv + i * (fondo(g) - top) / 5, 2.4);
    c.restore();
    // placa con el icono de la pregunta
    // la seña del capítulo 21 en su tablero, y la lámpara que se pone verde cuando la tarea pasa
    const kc = prog(t, ev.abre[g] - .05, ev.abre[g] + .3);
    c.save(); c.translate(xg, top - 362 - 92 + cy); c.scale(k * 1.15, k * 1.15);
    c.fillStyle = "rgba(20,18,14,.12)"; c.beginPath(); c.roundRect(-59, -57, 130, 130, 12); c.fill();
    c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.roundRect(-65, -65, 130, 130, 12); c.fill(); c.stroke();
    c.fillStyle = TINTA; c.beginPath(); c.arc(-51, -51, 3.2, 0, 7); c.arc(51, -51, 3.2, 0, 7); c.fill();
    icono(c, g, kc, t);
    const lx = -98, ly = -40, pop = ease.outBack(prog(t, ev.abre[g] - .05, ev.abre[g] + .25), 2.2), rl = 22;
    if (kc > 0) { const gl = c.createRadialGradient(lx, ly, rl * .3, lx, ly, rl * 3.2); gl.addColorStop(0, `rgba(120,190,128,${.55 * clamp(pop)})`); gl.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = gl; c.beginPath(); c.arc(lx, ly, rl * 3.2, 0, 7); c.fill(); }
    c.fillStyle = TINTA; c.fillRect(lx - rl * .7, ly + rl * .6, rl * 1.4, rl * .9);
    if (kc > 0) { const g2 = c.createRadialGradient(lx - rl * .3, ly - rl * .35, rl * .05, lx, ly, rl); g2.addColorStop(0, "#D6F0D8"); g2.addColorStop(.5, VERDE_C); g2.addColorStop(1, VERDE); c.fillStyle = g2; }
    else c.fillStyle = "#D3CFC6";
    c.beginPath(); c.arc(lx, ly, rl * (kc > 0 ? clamp(pop, .8, 1.3) : 1), 0, 7); c.fill(); c.strokeStyle = TINTA; c.lineWidth = 3; c.stroke();
    c.restore();
  }
}

// ---------- el suelo de la muralla ----------
function suelo(c: C) {
  c.fillStyle = TIERRA; c.fillRect(XF, 0, 4200, 900);
  linea(c, XF, 0, XF + 4200, 0, 5);
  c.strokeStyle = "rgba(17,17,17,.12)"; c.lineWidth = 3; const r = azar(21);
  for (let i = 0; i < 60; i++) { const x = XF + r() * 4200, y = 30 + r() * 800; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 26, y + 22); c.stroke(); }
}

// ---------- la oficina de METR (región aparte, coordenadas locales de pantalla) ----------
const AR = { x: 6000, y: 0 };
const U = 140;                                    // unidades de la vuelta completa del cronómetro: 100 = sin IA
const ang = (v: number) => -Math.PI / 2 + Math.PI * 2 * v / U;
const vGris = (t: number) => 100 * ease.inOutCubic(prog(t, ev.gris[0], ev.gris[1]));
function vRojo(t: number) {
  if (t < ev.rojo[0]) return 0;
  if (t < ev.anio + .15) return 119 * ease.outCubic(prog(t, ev.rojo[0], ev.rojo[1]));
  if (t < ev.rojo2[0]) return 119 * (1 - ease.inOutCubic(prog(t, ev.anio + .15, ev.anio + .6)));
  const base = 92 * ease.outCubic(prog(t, ev.rojo2[0], ev.rojo2[1]));
  const tr = smooth(prog(t, ev.rojo2[1] - .3, ev.rojo2[1] + .3)) * (1 + .6 * smooth(prog(t, ev.dificil, ev.dificil + .5)));
  return base + tr * (8 * Math.sin(t * 19) + 5 * Math.sin(t * 31 + 1));
}
function arco(c: C, cx: number, cy: number, r0: number, r1: number, v0: number, v1: number, color: string) {
  if (v1 - v0 < .2) return;
  c.beginPath(); c.arc(cx, cy, r1, ang(v0), ang(v1)); c.arc(cx, cy, r0, ang(v1), ang(v0), true); c.closePath(); c.fillStyle = color; c.fill();
}
function aguja(c: C, cx: number, cy: number, v: number, r0: number, r1: number, color: string, g: number) {
  const a = ang(v); linea(c, cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, g, color);
  c.beginPath(); c.arc(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, g * .9, 0, 7); c.fillStyle = color; c.fill();
}
function sello(c: C, t: number, t0: number, txt: string, x: number, y: number, rot: number, px: number, w: number, h: number) {
  if (t < t0 - .12) return;
  const k = prog(t, t0 - .12, t0);
  const sc = t < t0 ? lerp(1.9, 1, ease.inCubic(k)) : 1 + golpeteo(t, t0, .035, 30, 12);
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(sc, sc); c.globalAlpha *= t < t0 ? k : 1;
  c.fillStyle = "rgba(244,242,236,.88)"; c.fillRect(-w / 2, -h / 2, w, h);
  c.strokeStyle = ACENTO; c.lineWidth = 9; c.strokeRect(-w / 2, -h / 2, w, h); c.lineWidth = 3.5; c.strokeRect(-w / 2 + 12, -h / 2 + 12, w - 24, h - 24);
  texto(c, txt, 0, px * .36, { fuente: mono(px), color: ACENTO });
  const r = azar(Math.round(t0 * 10)); c.fillStyle = "rgba(244,242,236,.85)";
  for (let i = 0; i < 70; i++) c.fillRect(-w / 2 + r() * w, -h / 2 + r() * h, 2 + r() * 4, 2 + r() * 3);
  c.restore();
}
function lapiz(c: C, x: number, y: number, a: number) {
  c.save(); c.translate(x, y); c.rotate(a);
  c.beginPath(); c.moveTo(0, 0); c.lineTo(-18, -40); c.lineTo(18, -40); c.closePath(); c.fillStyle = PIEL; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 4; c.stroke();
  c.beginPath(); c.moveTo(0, 0); c.lineTo(-6, -13); c.lineTo(6, -13); c.closePath(); c.fillStyle = TINTA; c.fill();
  caja(c, -18, -230, 36, 190, 3, CARTON_O, TINTA, 4); caja(c, -18, -262, 36, 32, 6, HUMO, TINTA, 4);
  c.restore();
}
function persona(c: C, x: number, piso: number, h: number, o: { tinte?: string; bL?: number; bR?: number; cabeza?: number; alfa?: number } = {}) {
  const a = o.alfa ?? 1; if (a <= .01) return;
  const fill = o.tinte ?? HUMO, ink = TINTA;
  c.save(); c.globalAlpha *= a; c.lineCap = "round"; c.lineJoin = "round";
  const cad = piso - h * .44, hom = piso - h * .75, r = h * .1, cab = piso - h + r + (o.cabeza ?? 0), gr = h * .085;
  const extrem = (ax: number, ay: number, bx: number, by: number) => { linea(c, ax, ay, bx, by, gr + 9, ink); linea(c, ax, ay, bx, by, gr, fill); };
  for (const sg of [-1, 1]) extrem(x + sg * h * .05, cad, x + sg * h * .06, piso);
  const bra = (sg: number, an: number) => extrem(x + sg * h * .12, hom + gr * .4, x + sg * h * .12 + sg * Math.sin(an) * h * .33, hom + gr * .4 + Math.cos(an) * h * .33);
  bra(-1, o.bL ?? .12); bra(1, o.bR ?? .12);
  c.beginPath(); c.moveTo(x - h * .15, hom); c.lineTo(x + h * .15, hom); c.lineTo(x + h * .12, cad + h * .03); c.lineTo(x - h * .12, cad + h * .03); c.closePath();
  c.fillStyle = fill; c.fill(); c.strokeStyle = ink; c.lineWidth = 5; c.stroke();
  c.beginPath(); c.arc(x, cab, r, 0, 7); c.fillStyle = fill; c.fill(); c.stroke();
  c.restore();
}
function oficina(c: C, t: number) {
  if (t < ev.negro || t > ev.aTaller + .9) return;
  c.save(); c.translate(AR.x - 540, AR.y - 900);
  // escritorio
  c.fillStyle = "rgba(17,17,17,.05)"; c.fillRect(-400, 1340, 1900, 600);
  // el programador, detrás del escritorio
  const teclea = Math.sin(t * 17) * .05;
  persona(c, 250, 1530, 560, { bL: .25, bR: .98 + teclea, cabeza: Math.sin(t * 1.3) * 3 });
  caja(c, 40, 1330, 1000, 30, 4, CARTON_O, TINTA, 6);
  linea(c, 110, 1360, 110, 1700, 12); linea(c, 970, 1360, 970, 1700, 12);
  // laptop de perfil: la pantalla mira al programador
  caja(c, 380, 1314, 200, 16, 3, HUMO, TINTA, 5);
  c.save(); c.translate(578, 1316); c.rotate(.28); caja(c, -9, -168, 16, 168, 4, HUMO, TINTA, 5); c.restore();
  // la bola, ayudando
  const by = 1262 - Math.abs(Math.sin(t * 3.6)) * 8;
  sombra(c, 830, 1328, 110, .28);
  brazo(c, 830 - 36, by - 34, 600 + Math.sin(t * 12) * 6, 1268, 60, .5, TINTA, 1, .7);
  brazo(c, 830 + 40, by - 20, 930, by - 100 + Math.sin(t * 2.6) * 18, -70, .6, TINTA, 1, .7);
  bola(c, 830, by, 64);
  // el cronómetro cae y aterriza
  const CX = 540;
  let CY = 720, sq = 0;
  if (t < ev.golpe) { const u = prog(t, ev.cae, ev.golpe); CY = lerp(-420, 720, u * u); }
  else { sq = golpeteo(t, ev.golpe, .09, 26, 8); }
  const R = 300;
  c.save(); c.translate(CX, CY + R); c.scale(1 + sq, 1 - sq); c.translate(-CX, -CY - R);
  // corona y botón
  const tics = t > ev.golpe + .5 && t < ev.anio + .2 ? (t - ev.golpe - .5) % .5 : 1;
  const pulsa = tics < .08 ? 7 : 0;
  caja(c, CX - 22, CY - R - 62 + pulsa, 44, 56, 6, HUMO, TINTA, 6);
  caja(c, CX - 52, CY - R - 92 + pulsa, 104, 34, 12, HUMO, TINTA, 6);
  c.save(); c.translate(CX, CY); c.rotate(.78); caja(c, -16, -R - 40, 32, 44, 6, HUMO, TINTA, 5); c.restore();
  // cuerpo: después del segundo sello se vuelve plano de rediseño
  const redis = t >= ev.sello2 + .15;
  c.beginPath(); c.arc(CX + tiembla(3) * 1.5, CY + tiembla(4) * 1.5, R, 0, 7); c.fillStyle = BLANCO; c.fill();
  c.strokeStyle = TINTA; c.lineWidth = 10;
  if (redis) { c.setLineDash([22, 16]); c.lineWidth = 6; }
  c.stroke(); c.setLineDash([]);
  if (redis) {
    const fa = (t - ev.sello2 - .25) * 2.4, a0 = -Math.PI / 2;
    c.strokeStyle = TINTA; c.lineWidth = 9; c.beginPath(); c.arc(CX, CY, R, a0, a0 + Math.min(Math.max(fa, 0), 6.283)); c.stroke();
    c.save(); c.translate(CX + Math.cos(a0 + fa) * R, CY + Math.sin(a0 + fa) * R); c.scale(.6, .6); lapiz(c, 0, 0, a0 + fa + 2.2); c.restore();
  }
  for (let i = 0; i < U; i += 2) {
    const a = ang(i), l = i % 10 === 0 ? 22 : 11;
    linea(c, CX + Math.cos(a) * (R - 12), CY + Math.sin(a) * (R - 12), CX + Math.cos(a) * (R - 12 - l), CY + Math.sin(a) * (R - 12 - l), i % 10 === 0 ? 4 : 2.4, redis ? GRIS : TINTA);
  }
  // un punto que salta con cada tic: el cronómetro corre
  if (t > ev.golpe + .5) { const n = Math.floor((t - ev.golpe - .5) / .5); const a = ang((n * 7) % U); c.beginPath(); c.arc(CX + Math.cos(a) * (R - 52), CY + Math.sin(a) * (R - 52), 7, 0, 7); c.fillStyle = TINTA; c.fill(); }
  // arcos y agujas
  const vg = vGris(t), vr = vRojo(t);
  arco(c, CX, CY, R - 98, R - 64, 0, vg, "rgba(140,138,131,.42)");
  if (vg > 99) { const a = ang(100); linea(c, CX + Math.cos(a) * (R - 110), CY + Math.sin(a) * (R - 110), CX + Math.cos(a) * (R + 26), CY + Math.sin(a) * (R + 26), 7, GRIS); }
  const abanico = t > ev.rojo2[1] - .2 ? smooth(prog(t, ev.rojo2[1] - .2, ev.rojo2[1] + .3)) : 0;
  if (abanico > 0) { c.globalAlpha = .2 * abanico; arco(c, CX, CY, R - 140, R - 20, 76, 108, ACENTO); c.globalAlpha = 1; }
  if (vr > .5) arco(c, CX, CY, R - 90, R - 72, 0, vr, ACENTO);
  if (vg > .5) aguja(c, CX, CY, vg, R - 150, R - 30, GRIS, 8);
  if (vr > .5) {
    if (abanico > 0) for (const dv of [-11, 11]) { c.globalAlpha = .28 * abanico; aguja(c, CX, CY, vr + dv, R - 150, R - 24, ACENTO, 8); c.globalAlpha = 1; }
    aguja(c, CX, CY, vr, R - 150, R - 24, ACENTO, 12);
  }
  // el centro: la leyenda y la cifra
  const apaga = 1 - smooth(prog(t, ev.sello1 - .1, ev.sello1 + .05));
  const conIA = smooth(prog(t, ev.conIA, ev.conIA + .2));
  const aSin = smooth(prog(t, ev.gris[0] + .3, ev.gris[0] + .6)) * apaga;
  texto(c, "sin IA", CX, lerp(700, 646, conIA), { fuente: serif(lerp(68, 54, conIA), true), color: GRIS, alfa: aSin });
  texto(c, "con IA", CX, 722, { fuente: serif(66, true), color: ACENTO, alfa: conIA * apaga });
  const k19 = ease.outBack(prog(t, ev.diecinueve, ev.diecinueve + .3), 2) * (1 - smooth(prog(t, ev.anio, ev.anio + .25)));
  if (k19 > .01) { c.save(); c.translate(CX, 822); c.scale(k19, k19); texto(c, "+19%", 0, 0, { fuente: serif(122), color: ACENTO }); c.restore(); }
  const kq = smooth(prog(t, ev.rojo2[1] - .1, ev.rojo2[1] + .25)) * apaga;
  texto(c, "¿?", CX, 822 + Math.sin(t * 7) * 3, { fuente: serif(116), color: ACENTO, alfa: kq });
  c.restore();
  // sellos
  sello(c, t, ev.sello1, "NO CONCLUYENTE", 540 + tiembla(7) * 2, 690, -.18, 70, 720, 150);
  sello(c, t, ev.sello2, "REDISEÑANDO", 560, 905, .07, 62, 560, 124);
  // el globo del programador
  const kg = clamp(brota(t, ev.globo, 4, .45), 0, 1.15) * (1 - smooth(prog(t, ev.anio - .05, ev.anio + .15)));
  if (kg > .01) {
    c.save(); c.translate(690, 1110); c.scale(kg, kg); c.translate(-690, -1110);
    nube(c, 690, 1110, 480, 118, 1, { x: 290, y: 1020 });
    texto(c, "fui más rápido", 690, 1133, { fuente: serif(70, true), color: TINTA });
    c.restore();
  }
  // METR y su año
  const aM = smooth(prog(t, ev.metr, ev.metr + .2)) * (1 - smooth(prog(t, ev.medir, ev.medir + .3)));
  if (aM > .01) {
    c.save(); c.globalAlpha *= aM;
    texto(c, "METR", 360, 268, { fuente: serif(130), color: TINTA });
    const bx = 790, by = 228;
    caja(c, bx - 130, by - 70, 260, 150, 12, BLANCO, TINTA, 6);
    c.fillStyle = TINTA; c.fillRect(bx - 130, by - 70, 260, 30);
    const fl = prog(t, ev.anio, ev.anio + .4);
    texto(c, fl < .5 ? "2025" : "2026", bx, by + 52, { fuente: mono(74), color: fl < .5 ? TINTA : ACENTO });
    if (fl > 0 && fl < 1) { const s2 = Math.cos(Math.PI * fl); c.save(); c.translate(bx, by - 40); c.scale(1, Math.abs(s2)); caja(c, -128, 0, 256, 118, 8, BLANCO, TINTA, 4); c.restore(); }
    for (const dx of [-70, 70]) { c.beginPath(); c.arc(bx + dx, by - 74, 10, 0, 7); c.fillStyle = BLANCO; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 4; c.stroke(); }
    c.restore();
  }
  c.restore();
}

// ---------- la autonomía real ----------
const PER = { x: 880, piso: 0 };
function relojArena(c: C, x: number, piso: number, s: number, arena: number, rot: number) {
  c.save(); c.translate(x, piso - 64 * s); c.rotate(rot); c.scale(s, s);
  const vidrio = () => { c.beginPath(); c.moveTo(-28, -52); c.lineTo(28, -52); c.quadraticCurveTo(26, -10, 4, 0); c.quadraticCurveTo(26, 10, 28, 52); c.lineTo(-28, 52); c.quadraticCurveTo(-26, 10, -4, 0); c.quadraticCurveTo(-26, -10, -28, -52); c.closePath(); };
  vidrio(); c.fillStyle = "rgba(200,214,214,.35)"; c.fill();
  c.save(); vidrio(); c.clip(); c.fillStyle = CARTON_O;
  const topH = 44 * arena; c.fillRect(-30, -3 - topH, 60, topH);
  const botH = 44 * (1 - arena);
  c.beginPath(); c.moveTo(-30, 53); c.lineTo(30, 53); c.lineTo(30, 53 - botH * .6); c.lineTo(0, 53 - botH); c.lineTo(-30, 53 - botH * .6); c.closePath(); c.fill();
  if (arena > .01 && arena < .99) c.fillRect(-2, -2, 4, 55 - botH);
  c.restore();
  vidrio(); c.strokeStyle = TINTA; c.lineWidth = 4.5; c.stroke();
  caja(c, -42, -64, 84, 12, 4, CARTON_O, TINTA, 4); caja(c, -42, 52, 84, 12, 4, CARTON_O, TINTA, 4);
  linea(c, -37, -52, -37, 52, 4); linea(c, 37, -52, 37, 52, 4);
  c.restore();
}
function arenaDe(t: number): { a: number; rot: number } {
  const giros = [ev.turno + .25, ev.conversa[0], ev.conversa[2]];
  let s = -1; for (const g of giros) if (t >= g - .3) s = g;
  if (s < 0) return { a: 1, rot: 0 };
  if (t < s) return { a: 0, rot: Math.PI * (1 - ease.inOutCubic(prog(t, s - .3, s))) };
  return { a: 1 - clamp((t - s) / 3.4), rot: 0 };
}
function personaSentada(c: C, x: number, piso: number, h: number, o: { bL: XY; bR: XY; cabeza?: number }) {
  const ink = TINTA, fill = HUMO, gr = h * .085, r = h * .1;
  const seat = piso - h * .42;
  c.lineCap = "round"; c.lineJoin = "round";
  caja(c, x - 78, seat, 156, 20, 6, CARTON_O, ink, 5);
  linea(c, x - 58, seat + 20, x - 70, piso, 7); linea(c, x + 58, seat + 20, x + 70, piso, 7);
  const extrem = (ax: number, ay: number, bx: number, by: number) => { linea(c, ax, ay, bx, by, gr + 9, ink); linea(c, ax, ay, bx, by, gr, fill); };
  const kx = x - h * .24;
  extrem(x + 6, seat - 6, kx, seat - 4); extrem(kx, seat - 4, kx - 8, piso - 6);
  const hom = seat - h * .34;
  c.beginPath(); c.moveTo(x - h * .15, hom); c.lineTo(x + h * .15, hom); c.lineTo(x + h * .12, seat); c.lineTo(x - h * .12, seat); c.closePath();
  c.fillStyle = fill; c.fill(); c.strokeStyle = ink; c.lineWidth = 5; c.stroke();
  extrem(x - h * .12, hom + gr * .4, o.bL.x, o.bL.y); extrem(x + h * .12, hom + gr * .4, o.bR.x, o.bR.y);
  c.beginPath(); c.arc(x, hom - r - 4 + (o.cabeza ?? 0), r, 0, 7); c.fillStyle = fill; c.fill(); c.strokeStyle = ink; c.lineWidth = 5; c.stroke();
}
function lupa(c: C, x: number, y: number, a: number) {
  c.save(); c.translate(x, y); c.rotate(a);
  linea(c, 34, 34, 84, 84, 14);
  c.beginPath(); c.arc(0, 0, 48, 0, 7); c.fillStyle = "rgba(200,214,214,.35)"; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 10; c.stroke();
  c.restore();
}
function autonomia(c: C, t: number) {
  if (t < ev.aTaller - .5) return;
  const h = 560;
  // la persona: sentada mientras conversa, de pie al final
  const parado = t >= ev.aLejos + .35;
  if (!parado) {
    const hom = -h * .42 - h * .34;
    const habla = ventana(t, ev.conversa[0] - .1, ev.conversa[1], .12, .25) + ventana(t, ev.conversa[2] - .1, ev.revisa - .1, .12, .25);
    const rev = ventana(t, ev.revisa - .3, ev.aLejos, .3, .25);
    const bL = mezcla(mezcla({ x: PER.x - 120, y: hom + 160 }, { x: PER.x - 200, y: hom - 30 + Math.sin(t * 8) * 16 }, clamp(habla)), { x: 690, y: -300 }, rev);
    personaSentada(c, PER.x, 0, h, { bL, bR: { x: PER.x + 110, y: hom + 170 }, cabeza: rev * 10 });
    if (rev > .02) { c.save(); c.globalAlpha *= rev; lupa(c, 650, -350, .5); c.restore(); }
  } else {
    const u = smooth(prog(t, ev.aLejos + .35, ev.aLejos + 1.4));
    const xP = lerp(PER.x, 660, u) + Math.sin(u * Math.PI * 4) * 6 * (1 - u);
    const ns = t > ev.asiente ? Math.sin((t - ev.asiente) * 14) * 12 * Math.exp(-(t - ev.asiente) * 2.2) : 0;
    persona(c, xP, 0, h, { bL: .2 + .05 * Math.sin(t * 1.4), bR: .14, cabeza: Math.abs(ns) });
    sombra(c, xP, 4, 130, .25);
  }
  // el reloj de arena y su etiqueta
  if (t > ev.turno - .1 && t < ev.aLejos + .4) {
    const k = clamp(brota(t, ev.turno, 4.2, .42), 0, 1.2) * (1 - smooth(prog(t, ev.aLejos, ev.aLejos + .35)));
    const A = arenaDe(t);
    sombra(c, 610, 4, 70, .25 * k);
    relojArena(c, 610, 0, 1.05 * k, A.a, A.rot);
    const ka = smooth(prog(t, ev.cuarenta, ev.cuarenta + .2)) * (1 - smooth(prog(t, ev.revisa - .25, ev.revisa)));
    void ka;
  }
  // globos de la conversación: sin texto, solo renglones
  const gl = (t0: number, t1: number, x: number, y: number, cola: -1 | 1) => {
    const k = clamp(brota(t, t0, 4.4, .45), 0, 1.15) * (1 - smooth(prog(t, t1, t1 + .2)));
    if (k <= .01) return;
    c.save(); c.translate(x, y); c.scale(k, k);
    globo(c, 0, 0, 290, 140, cola, 6);
    for (let i = 0; i < 3; i++) linea(c, -100, -32 + i * 32, -100 + [190, 150, 110][i], -32 + i * 32, 9);
    c.restore();
  };
  gl(ev.conversa[0], ev.conversa[1] + .15, 690, -820, 1);
  gl(ev.conversa[1], ev.conversa[2] + .15, 200, -420, 1);
  gl(ev.conversa[2], ev.revisa - .05, 690, -820, 1);
  // la palomita de la revisión
  const kp = clamp(brota(t, ev.palomita, 4.2, .45), 0, 1.2) * (1 - smooth(prog(t, ev.aLejos, ev.aLejos + .3)));
  if (kp > .01) { c.save(); c.translate(560, -420); c.scale(kp, kp); c.strokeStyle = ACENTO; c.lineWidth = 16; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath(); c.moveTo(-34, 0); c.lineTo(-8, 28); c.lineTo(40, -34); c.stroke(); c.restore(); }
}

// ---------- el final: el plano de casa ----------
const PL = { x: 385, y: -1345, w: 400, h: 290 };
const CASA = { body: [120, 140, 280, 260], apex: [200, 38], door: [180, 196, 220, 260], win: [[136, 166, 166, 194], [234, 166, 264, 194]] };
function casa(c: C, T: (x: number, y: number) => XY, color: string, g: number, dash: number[] | null) {
  c.strokeStyle = color; c.lineWidth = g; c.lineJoin = "round"; c.lineCap = "round"; if (dash) c.setLineDash(dash);
  const pl = (pts: number[][], cerr: boolean) => { c.beginPath(); pts.forEach((p, i) => { const q = T(p[0], p[1]); if (i) c.lineTo(q.x, q.y); else c.moveTo(q.x, q.y); }); if (cerr) c.closePath(); c.stroke(); };
  const [x0, y0, x1, y1] = CASA.body;
  pl([[x0, y1], [x0, y0], [x1, y0], [x1, y1]], true);
  pl([[x0 - 12, y0], [CASA.apex[0], CASA.apex[1]], [x1 + 12, y0]], false);
  const d = CASA.door; pl([[d[0], d[3]], [d[0], d[1]], [d[2], d[1]], [d[2], d[3]]], false);
  for (const w of CASA.win) pl([[w[0], w[1]], [w[2], w[1]], [w[2], w[3]], [w[0], w[3]]], true);
  c.setLineDash([]);
}
function plano(c: C, t: number) {
  if (t < ev.plano - .05) return;
  const k = ease.outCubic(prog(t, ev.plano, ev.plano + .55));
  const bam = Math.sin(t * 1.9) * 4;
  c.save(); c.translate(PL.x, PL.y + bam);
  c.save(); c.beginPath(); c.rect(-6, -6, PL.w * k + 12, PL.h + 12); c.clip();
  caja(c, 0, 0, PL.w, PL.h, 6, BLANCO, TINTA, 5);
  c.strokeStyle = "rgba(95,127,139,.22)"; c.lineWidth = 2;
  for (let x = 30; x < PL.w; x += 30) { c.beginPath(); c.moveTo(x, 8); c.lineTo(x, PL.h - 8); c.stroke(); }
  for (let y = 30; y < PL.h; y += 30) { c.beginPath(); c.moveTo(8, y); c.lineTo(PL.w - 8, y); c.stroke(); }
  casa(c, (x, y) => ({ x, y }), TINTA, 4, null);
  linea(c, 120, 276, 280, 276, 2.5); linea(c, 120, 268, 120, 284, 2.5); linea(c, 280, 268, 280, 284, 2.5);
  c.restore();
  if (k < .99) { caja(c, PL.w * k - 14, -10, 28, PL.h + 20, 12, CARTON, TINTA, 5); }
  c.restore();
}
function contorno(c: C, t: number) {
  if (t < ev.contorno) return;
  const k = ease.inOutCubic(prog(t, ev.contorno, ev.contorno + 1.0));
  const s = lerp(1, 5, k), O = mezcla({ x: PL.x + 120, y: PL.y + 140 + Math.sin(t * 1.9) * 4 }, { x: -480, y: -600 }, k);
  const T = (x: number, y: number): XY => ({ x: O.x + (x - 120) * s, y: O.y + (y - 140) * s });
  c.globalAlpha = .4 + .6 * k;
  casa(c, T, ACENTO, lerp(4, 9, k), [lerp(10, 34, k), lerp(8, 22, k)]);
  c.globalAlpha = 1;
}
function duda(c: C, t: number) {
  if (t < ev.duda) return;
  const k = clamp(brota(t, ev.duda, 4.2, .45), 0, 1.15);
  const u = ease.inOutCubic(prog(t, ev.pasa, ev.pasa + 1.0));
  const A = { x: 190, y: -1300 }, Bp = { x: 590, y: -800 }, Cc = { x: 250, y: -760 };
  const x = (1 - u) ** 2 * A.x + 2 * u * (1 - u) * Cc.x + u * u * Bp.x, y = (1 - u) ** 2 * A.y + 2 * u * (1 - u) * Cc.y + u * u * Bp.y;
  const llegado = u > .5;
  const hacia = llegado ? { x: 660, y: -520 } : { x: bolaPos(t).x - 30, y: bolaPos(t).y - 70 };
  c.save(); c.translate(x, y); c.scale(k, k); c.translate(-x, -y);
  nube(c, x, y, 200, 170, 1, hacia);
  texto(c, "?", x, y + 40 + Math.sin(t * 5) * 3, { fuente: serif(130), color: ACENTO });
  c.restore();
}

// ---------- la tarjeta del robot nocturno (pantalla) ----------
function tarjetaNoche(c: C, t: number) {
  if (t < ev.robot || t > ev.persona + 1) return;
  const ent = ease.outBack(prog(t, ev.robot, ev.robot + .4), 1.2);
  const u = Math.max(0, t - (ev.persona - .2));
  const x = 540 + u * 340, y = lerp(-420, 560, ent) + 2600 * u * u, rot = -.035 + u * 1.5 + (1 - ent) * .12;
  c.save(); c.translate(x, y); c.rotate(rot);
  caja(c, -400, -290, 800, 580, 24, BLANCO, TINTA, 6);
  caja(c, -380, -270, 760, 540, 16, NOCHE, null);
  const r = azar(19);
  for (let i = 0; i < 26; i++) { const sx = -360 + r() * 720, sy = -250 + r() * 220; c.globalAlpha = .4 + .5 * Math.abs(Math.sin(t * 3 + i)); c.fillStyle = LUZ; c.fillRect(sx, sy, 4, 4); }
  c.globalAlpha = 1;
  c.beginPath(); c.arc(250, -170, 52, 0, 7); c.fillStyle = LUZ; c.fill(); c.beginPath(); c.arc(274, -186, 46, 0, 7); c.fillStyle = NOCHE; c.fill();
  linea(c, -380, 160, 380, 160, 5, LUZ);
  // el robot
  const ojos = Math.sin(t * 2.2) > .95 ? .2 : 1;
  c.save(); c.translate(-90, 0);
  linea(c, 0, -150, 0, -200, 5, LUZ); c.beginPath(); c.arc(0, -206, 10, 0, 7); c.fillStyle = LUZ; c.fill();
  caja(c, -80, -150, 160, 120, 20, NOCHE, LUZ, 6);
  c.fillStyle = LUZ; c.fillRect(-42, -102, 24, 22 * ojos); c.fillRect(18, -102, 24, 22 * ojos);
  caja(c, -100, -16, 200, 176, 18, NOCHE, LUZ, 6);
  const tec = Math.sin(t * 20);
  linea(c, 90, 20, 190 + tec * 10, 120, 12, LUZ); linea(c, -90, 20, 160 - tec * 10, 130, 12, LUZ);
  c.restore();
  // la laptop del robot y lo que escribe
  caja(c, 70, 136, 230, 20, 4, NOCHE, LUZ, 5);
  c.save(); c.translate(300, 140); c.rotate(-.22); caja(c, -10, -190, 16, 190, 4, NOCHE, LUZ, 5); c.restore();
  if (t > ev.tacha - .02) {
    const k1 = prog(t, ev.tacha, ev.tacha + .16), k2 = prog(t, ev.tacha + .2, ev.tacha + .36);
    c.strokeStyle = ACENTO; c.lineWidth = 26; c.lineCap = "round";
    if (k1 > 0) { c.beginPath(); c.moveTo(-330, -230); c.lineTo(lerp(-330, 330, k1), lerp(-230, 230, k1)); c.stroke(); }
    if (k2 > 0) { c.beginPath(); c.moveTo(330, -230); c.lineTo(lerp(330, -330, k2), lerp(-230, 230, k2)); c.stroke(); }
  }
  c.restore();
}

// ---------- cámara ----------
type V = { x: number; y: number; z: number };
const P = (x: number, y: number, z: number): V => ({ x, y, z });
const CLAVES: [number, number, V, ((x: number) => number)?][] = [
  [0, 0, P(560, -230, 1.9)],
  [.12, 2.5, P(320, -660, .95)],
  [2.6, 3.3, P(320, -690, .95)],
  [ev.aGoogle, .85, P(-330, -410, 1.35)],
  [ev.aTorre, .8, P(1400, -600, 1.0)],
  [ev.sube, 1.9, P(1030, -1300, .4)],
  [ev.aTope, .75, P(1420, -2700, 1.0)],
  [ev.aCanal, .62, P(-2276, -470, .6), ease.outExpo],
  [ev.negro, .01, P(AR.x, AR.y, 1)],
  [ev.aTaller, .7, P(560, -500, 1.0), ease.outExpo],
  [ev.aLejos, 1.3, P(200, -1150, .3)],
  [ev.aCerca, 1.6, P(200, -620, .72)],
];
function vista(t: number): V {
  let v = CLAVES[0][2];
  for (let i = 1; i < CLAVES.length; i++) {
    const [a, d, b, f] = CLAVES[i];
    if (t < a) break;
    const k = (f ?? ease.inOutCubic)(prog(t, a, a + d));
    v = { x: lerp(v.x, b.x, k), y: lerp(v.y, b.y, k), z: v.z * (b.z / v.z) ** k };
  }
  return v;
}
const GOLPES: [number, number][] = [[ev.s0[0], 12], [ev.s0[1], 7], [ev.s0[2], 6], [ev.chapuzon, 6], [ev.golpe, 28], [ev.sello1, 14], [ev.sello2, 8], [ev.salta + .6, 9], [ev.enormes + .2, 6], ...ev.compuertas.map((x) => [x, 5] as [number, number])];
function sacudida(t: number) {
  let x = 0, y = 0;
  for (const [ti, a] of GOLPES) { if (t < ti || t > ti + .8) continue; const u = t - ti; x += a * Math.exp(-u * 8) * Math.sin(u * 71); y += a * .8 * Math.exp(-u * 8) * Math.cos(u * 63); }
  return { x, y };
}

// ---------- capas de pantalla ----------
function polvo(c: C, t: number, color: string, k = 1) {
  const r = azar(18);
  c.fillStyle = color;
  for (let i = 0; i < 80; i++) {
    const x0 = r() * 1200 - 60, y0 = r() * 2060, v = 14 + r() * 40, f = r() * 6.3, z = 1.6 + r() * 3.2;
    const y = ((y0 - t * v) % 2060 + 2060) % 2060 - 70, x = x0 + Math.sin(t * .5 + f) * 36;
    c.globalAlpha = (.07 + r() * .16) * k; c.fillRect(x, y, z, z);
  }
  c.globalAlpha = 1;
}
function rayas(c: C, t: number) {
  for (const t0 of [ev.aCanal, ev.aTaller]) {
    const k = t - t0; if (k < 0 || k > .5) continue;
    const a = Math.sin(Math.PI * k / .5), r = azar(Math.floor(t0 * 10));
    c.strokeStyle = TINTA; c.lineCap = "round";
    for (let i = 0; i < 26; i++) {
      const y = 140 + r() * 1500, L = 220 + r() * 520, x = ((r() * 1600 + k * 3200) % 1600 + 1600) % 1600 - 260;
      c.globalAlpha = a * (.15 + r() * .35); c.lineWidth = 3 + r() * 6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + L, y); c.stroke();
    }
  }
  c.globalAlpha = 1;
}
function negro(c: C, t: number) {
  if (t < ev.negro || t >= ev.cae) return;
  c.fillStyle = NOCHE; c.fillRect(0, 0, 1080, 1920);
  polvo(c, t, LUZ, 1.4);
  rotulo(c, t, ev.negro + .03, 99, "ahora", 790, 104, LUZ);
  c.save(); c.translate(540, 940); const z = 1 + (t - ev.incomodo) * .05; c.scale(z, z); c.translate(-540, -940);
  rotulo(c, t, ev.incomodo, 99, "lo incómodo", 960, 150, "#E05A3E", true);
  c.restore();
}
function rotulos(c: C, t: number) {
  // arranque: la palabra cae como un ladrillo
  const kP = ease.outBack(prog(t, 0, .28), 1.7), aP = smooth(prog(t, 0, .06)) * (1 - smooth(prog(t, 3.0, 3.25)));
  if (aP > .01) texto(c, "programar", 540, lerp(150, 310, kP), { fuente: serif(156, true), color: TINTA, alfa: aP });
  rotulo(c, t, ev.cuanto, ev.aGoogle + .45, "¿cuánto ayudan?", 300, 116, TINTA, true);
  rotulo(c, t, ev.google, ev.tres - .08, "Google", 330, 128);
  rotulo(c, t, ev.tres, ev.aprobado - .12, "¾", 400, 230, ACENTO, false, 700);
  rotulo(c, t, ev.tres + .25, ev.aprobado - .12, "del código nuevo", 500, 84, TINTA, true, 700);
  rotulo(c, t, ev.aprobado, ev.cifra - .12, "aprobado por ingenieros", 1552, 84, TINTA, true);
  rotulo(c, t, ev.dieciseis, ev.sube + .05, "16 agentes", 300, 132);
  rotulo(c, t, ev.anthropic, ev.sube + .05, "de Anthropic", 420, 98, TINTA, true);
  rotulo(c, t, ev.compilador, ev.aTope - .1, "compilador", 520, 96, TINTA, false, 225);
  rotulo(c, t, ev.compilador + .2, ev.aTope - .1, "de C", 630, 108, TINTA, true, 225);
  if (t > ev.sube + .3 && t < ev.aTope + .3) {
    const a = smooth(prog(t, ev.sube + .3, ev.sube + .5)) * (1 - smooth(prog(t, ev.aTope - .1, ev.aTope + .15)));
    const n = Math.round(100000 * alto(t) / TH / 100) * 100;
    texto(c, n.toLocaleString("en-US"), 600, 300, { fuente: mono(96), color: ACENTO, alfa: a, alin: "right" });
    texto(c, "líneas", 628, 300, { fuente: serif(96, true), color: TINTA, alfa: a * smooth(prog(t, ev.lineas - .04, ev.lineas + .14)), alin: "left" });
  }
  rotulo(c, t, ev.linux, ev.aCanal - .05, "arranca Linux", 380, 112, TINTA, true);
  // las esclusas: abajo, para que las placas respiren
  rotulo(c, t, ev.porque, ev.compuertas[0] - .12, "¿por qué aquí sí?", 1450, 112, TINTA, true);
  rotulo(c, t, ev.compuertas[0], ev.codigo - .05, "las 4 preguntas", 1450, 112);
  rotulo(c, t, ev.abre[0], ev.abre[1] - .06, "se prueba", 1450, 124, TINTA, true);
  rotulo(c, t, ev.abre[1], ev.abre[2] - .06, "se deshace", 1450, 124, TINTA, true);
  rotulo(c, t, ev.abre[2], ev.negro - .3, "se delimita", 1450, 124, TINTA, true);
  // METR
  rotulo(c, t, ev.dificil, ev.aTaller - .05, "dificilísimo", 275, 134, ACENTO, true);
  // la autonomía
  rotulo(c, t, ev.aTaller + .45, ev.vida - .08, "¿qué tan autónomos?", 300, 104, TINTA, true);
  rotulo(c, t, ev.vida, ev.turno - .08, "en la vida real", 300, 110, TINTA, true);
  rotulo(c, t, ev.turno, ev.robot - .12, "un turno típico", 300, 104, TINTA, true);
  rotulo(c, t, ev.cuarenta, ev.robot - .12, "~45 s", 430, 104, ACENTO);
  rotulo(c, t, ev.claude, ev.aLejos - .1, "Claude Code", 1532, 104);
  rotulo(c, t, ev.persona + .12, ev.conversa[0] - .06, "una persona", 300, 116, TINTA, true);
  rotulo(c, t, ev.conversa[0], ev.revisa - .06, "conversando", 300, 116, TINTA, true);
  rotulo(c, t, ev.revisa, ev.aLejos - .1, "revisando", 300, 116, ACENTO, true);
  // el final
  rotulo(c, t, ev.enormes, ev.aCerca + .2, "enormes", 300, 140, TINTA, true);
  rotulo(c, t, ev.solos, ev.contorno - .1, "saber solos", 236, 104, TINTA, true);
}

// ---------- el cuadro ----------
function dibuja(c: C, t: number, d: D) {
  FR = Math.floor(t * 10);
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  polvo(c, t, TINTA);
  const v = vista(t), sh = sacudida(t);
  const z = v.z * (1 + .012 * vaiven(t, 7.3, .5));
  const ox = 10 * vaiven(t, 8.7) + 5 * vaiven(t, 5.1, 1), oy = 12 * vaiven(t, 10.1, 2);
  c.save();
  c.translate(540 + sh.x, 900 + sh.y); c.rotate(.005 * vaiven(t, 12.7)); c.scale(z, z); c.translate(-v.x - ox / Math.sqrt(z), -v.y - oy / Math.sqrt(z));
  if (t < ev.negro || t > ev.aTaller - .9) {
    suelo(c);
    canal(c, t);
    torre(c, t, d);
    muro(c, t);
    cinta(c, t);
    letrero(c, t);
    autonomia(c, t);
    contorno(c, t);
    plano(c, t);
    bolaPrincipal(c, t);
    vuelos(c, t);
    manoHumana(c, t);
    duda(c, t);
  }
  oficina(c, t);
  c.restore();
  rayas(c, t);
  negro(c, t);
  tarjetaNoche(c, t);
  rotulos(c, t);
}

function preparar(): D {
  const tex = document.createElement("canvas"); tex.width = TW; tex.height = TH;
  const g = tex.getContext("2d")!;
  g.fillStyle = PAPEL; g.fillRect(0, 0, TW, TH);
  const r = azar(41);
  for (let row = 0; row < TH / 16; row++) {
    const y = TH - (row + 1) * 16, off = row % 2 ? 20 : 0;
    for (let x = -off; x < TW; x += 40) {
      const x0 = Math.max(0, x + 2), x1 = Math.min(TW, x + 38);
      if (x1 - x0 < 8) continue;
      g.fillStyle = BLANCO; g.fillRect(x0, y + 2, x1 - x0, 12);
      g.strokeStyle = TINTA; g.lineWidth = 1.5; g.strokeRect(x0, y + 2, x1 - x0, 12);
      g.lineWidth = 2.2; g.lineCap = "round"; g.beginPath();
      const ind = Math.floor(r() * 3) * 4;
      g.moveTo(x0 + 5 + ind, y + 8); g.lineTo(x0 + 5 + ind + (x1 - x0 - 16 - ind) * (.3 + r() * .65), y + 8); g.stroke();
    }
  }
  return { tex };
}
export const Pieza: React.FC = () => <Lienzo dibuja={(c, t, d) => dibuja(c, t, d)} preparar={preparar} />;
