// Capítulo 1. Una tormenta de números se vuelve una bola; la bola adivina; la distancia a la verdad
// es lo único que siente. La recta es larguísima a propósito: 2 pesos y 3 millones no caben juntos.
import React from "react";
import { azar, caida, clamp, ease, lerp, prog, smooth, texto } from "../../kit";
import { ACENTO, bola, cue, GRIS, Lienzo, LUZ, mono, NOCHE, PAPEL, rotulo, serif, sombra, TINTA } from "../../marca";
import palabras from "./palabras.json";
import duracion from "./duracion.json";

export const DURACION = duracion.dur;
const T = cue(palabras);

const t0 = {
  azar: T("adivinando al azar").s, sin: T("sin saber nada").s, puros: T("puros números").s, pide: T("pídele algo").s, casa: T("cuesta una casa").s,
  primera: T("su primera").s, dos: T("dos pesos").s, real: T("el precio real").s, tres: T("tres millones").s, entre: T("entre lo que").s,
  dist: T("hay una distancia").s, llama: T("a esa distancia").s, error: T("llamamos error").e - .42, secreto: T("y aquí está").s, nocasa: T("no sabe qué es una casa").s,
  nopeso: T("no sabe qué es un peso").s, siente: T("lo único que puede sentir").s, ajusta: T("así que ajusta").s, intenta: T("vuelve a intentar").s,
  m2: T("dos millones de error").s, m1: T("un millón").s, c100: T("cien mil").s, vez: T("una vez otra vez").s, mills: T("millones de veces").s, hasta: T("hasta que un día").s,
  atina: T("le atina").s, nunca: T("nunca había visto").e, entrena: T("eso es entrenar").s, noexpl: T("no le explicaron").s, solo: T("solo le dijeron").s,
  gpt: T("chatgpt").s, autos: T("los autos").s, voz: T("esta voz").s, todo: T("todo nació").s, quita: T("si le quitas").s, nada: T("no aprende nada").s,
  porque: T("porque lo único").s, menos: T("a equivocarse menos").s, fin: palabras[palabras.length - 1].e,
};

const PRECIO = 3e6, LARGO = 6400, YL = 1120;
const xDe = (p: number) => 150 + p / PRECIO * LARGO;                   // recta en píxeles de mundo

/** Las respuestas de la bola: saltos con su instante. Antes del último, puede fallar por poco. */
const SALTOS: [number, number][] = [[t0.dos - .35, 2], [t0.m2 - .1, 1e6], [t0.m1 - .1, 2e6], [t0.c100 - .1, 2.9e6]];
function precioBola(t: number) {
  let p = 2, arco = 0;
  for (let i = 1; i < SALTOS.length; i++) {
    const k = ease.inOutCubic(prog(t, SALTOS[i][0], SALTOS[i][0] + .5));
    p = lerp(p, SALTOS[i][1], k);
    arco += Math.sin(clamp(k) * Math.PI) * 300 * (1 - i * .22);
  }
  if (t >= t0.vez - .1) {                                              // millones de intentos: tiembla alrededor del precio
    const d = t - (t0.vez - .1);
    const e = 1e5 * Math.exp(-d * .95);
    p = lerp(p, PRECIO - e * Math.cos(d * 22), smooth(d / .3));
    arco += Math.abs(Math.sin(d * 11)) * 58 * Math.exp(-d * .5);
  }
  return { p, arco };
}

function dinero(n: number) { return "$" + Math.round(n).toLocaleString("en-US"); }

/** Línea a mano alzada que se dibuja sola. */
function trazaPoli(c: CanvasRenderingContext2D, P0: [number, number][], k: number, color = TINTA, g = 8, t = 0) {
  if (k <= 0) return;
  // Vibración de dibujo a mano, a 10 cuadros por segundo: la línea está viva sin moverse de sitio.
  const r = azar(Math.floor(t * 10) + 1);
  const P = P0.map(([x, y]) => [x + (r() - .5) * 5, y + (r() - .5) * 5] as [number, number]);
  const L: number[] = [0];
  for (let i = 1; i < P.length; i++) L[i] = L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
  const hasta = L[L.length - 1] * clamp(k);
  c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath(); c.moveTo(P[0][0], P[0][1]);
  for (let i = 1; i < P.length; i++) {
    if (L[i] <= hasta) c.lineTo(P[i][0], P[i][1]);
    else { const r = (hasta - L[i - 1]) / (L[i] - L[i - 1]); c.lineTo(lerp(P[i - 1][0], P[i][0], r), lerp(P[i - 1][1], P[i][1], r)); break; }
  }
  c.stroke();
}

const CASA: [number, number][] = [[300, 800], [300, 560], [230, 560], [540, 300], [850, 560], [780, 560], [780, 800], [610, 800], [610, 650], [470, 650], [470, 800], [300, 800]];
const CASA2: [number, number][] = [[230, 800], [230, 420], [620, 420], [620, 560], [850, 560], [850, 800], [720, 800], [720, 660], [600, 660], [600, 800], [230, 800]];

function tormenta(c: CanvasRenderingContext2D, t: number, alfa: number, junta: number, cx: number, cy: number) {
  if (alfa <= .01) return;
  const col = 13, fil = 22, r = azar(7);
  c.save(); c.font = mono(52); c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = TINTA;
  for (let j = 0; j < fil; j++) for (let i = 0; i < col; i++) {
    const a = r(), b = r(), q = r();
    const d = Math.floor(((Math.floor(t * lerp(8, 17, a) + b * 40) * 2654435761 + i * 40503 + j * 9973) >>> 0) / 37) % 10;
    const x0 = 60 + i * 80 + Math.sin(t * lerp(.7, 1.6, b) + a * 9) * 11, y0 = 50 + j * 88 + Math.cos(t * lerp(.8, 1.4, a) + b * 9) * 11;
    const k = ease.inCubic(prog(junta, q * .55, q * .55 + .45)), gi = k * 1.9;
    const dx = x0 - cx, dy = y0 - cy;
    const x = cx + (dx * Math.cos(gi) - dy * Math.sin(gi)) * (1 - k), y = cy + (dx * Math.sin(gi) + dy * Math.cos(gi)) * (1 - k);
    c.globalAlpha = alfa * lerp(.16, .86, a) * (1 - k * .2);
    if (k < .99) c.fillText(String(d), x, y);
  }
  c.restore();
}

/** Lo que queda de la tormenta: números que siguen flotando detrás de todo. */
function polvoDigitos(c: CanvasRenderingContext2D, t: number, color: string, alfa: number) {
  const r = azar(41);
  c.save(); c.font = mono(44); c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = color;
  for (let i = 0; i < 90; i++) {
    const x0 = r() * 1260 - 90, y0 = r() * 2100 - 90, v = 30 + r() * 62, f = r() * 6.28, a = r();
    const y = ((y0 - t * v) % 2100 + 2100) % 2100 - 90, x = x0 + Math.sin(t * .6 + f) * 42;
    const d = Math.floor(((Math.floor(t * (3 + a * 5) + f) * 2654435761 + i * 40503) >>> 0) / 37) % 10;
    c.globalAlpha = alfa * (.1 + a * .22);
    c.fillText(String(d), x, y);
  }
  c.restore();
}

function dibuja(c: CanvasRenderingContext2D, t: number, _d: { x: number }) {
  c.fillStyle = t >= t0.siente && t < t0.ajusta ? NOCHE : PAPEL; c.fillRect(0, 0, 1080, 1920);
  // La cámara respira siempre, aunque en pantalla solo haya texto.
  const z = 1.035 + .018 * Math.sin(t * .83), dx = 12 * Math.sin(t * .71), dy = 15 * Math.cos(t * .61);
  c.save(); c.translate(540 + dx, 900 + dy); c.rotate(.006 * Math.sin(t * .47)); c.scale(z, z); c.translate(-540, -900);
  escena(c, t);
  c.restore();
}

function escena(c: CanvasRenderingContext2D, t: number) {
  // ---------- el negro: lo único que siente ----------
  if (t >= t0.siente && t < t0.ajusta) {
    c.fillStyle = NOCHE; c.fillRect(-60, -60, 1200, 2040);
    polvoDigitos(c, t, LUZ, .9);
    const late = 1 + .035 * Math.exp(-((t * 1.5) % 1) * 5);
    const z = (1 + (t - t0.siente) * .03) * late;
    c.save(); c.translate(540, 900); c.scale(z, z);
    texto(c, dinero(PRECIO - 2), 0, 44, { fuente: mono(132), color: LUZ });
    c.restore();
    const r = azar(3);
    for (let i = 0; i < 90; i++) {
      const a = r() * 6.3, v = 200 + r() * 620, f = ((t * .35 + r()) % 1);
      c.fillStyle = LUZ; c.globalAlpha = (1 - f) * .3 * r();
      c.fillRect(540 + Math.cos(a) * (v * f + 80), 900 + Math.sin(a) * (v * f + 80), 3, 3);
    }
    c.globalAlpha = 1;
    texto(c, "esto es lo único que siente", 540, 1130, { fuente: serif(78, true), color: LUZ, alfa: smooth(prog(t, t0.siente + .25, t0.siente + .6)) });
    return;
  }

  c.fillStyle = PAPEL; c.fillRect(-60, -60, 1200, 2040);
  if (t >= t0.pide) polvoDigitos(c, t, TINTA, 1);

  // ---------- la tormenta se vuelve bola ----------
  const junta = prog(t, t0.puros + .2, t0.pide - .1);
  const aTor = 1 - smooth(prog(t, t0.pide - .2, t0.pide + .12));
  tormenta(c, t, aTor, junta, 540, 960);
  if (t < t0.sin) {
    c.save(); c.globalAlpha = .9; c.fillStyle = PAPEL; c.fillRect(0, 700, 1080, 450); c.restore();
    texto(c, "La IA más poderosa", 540, 850, { fuente: serif(112), color: TINTA });
    texto(c, "del mundo", 540, 968, { fuente: serif(112), color: TINTA });
    texto(c, "empezó adivinando", 540, 1090, { fuente: serif(100, true), color: ACENTO, alfa: smooth(prog(t, t0.azar - .25, t0.azar)) });
  }
  if (t >= t0.sin - .05 && t < t0.pide) {
    c.save(); c.globalAlpha = .92 * smooth(prog(t, t0.sin - .05, t0.sin + .1)) * (1 - smooth(prog(t, t0.pide - .25, t0.pide - .05))); c.fillStyle = PAPEL; c.fillRect(0, 190, 1080, 170); c.restore();
  }
  rotulo(c, t, t0.sin, t0.puros - .05, "Sin saber nada.", 310, 118);
  rotulo(c, t, t0.puros, t0.pide - .1, "Puros números al azar.", 310, 96, TINTA, true);

  // ---------- la recta: una cámara 2D que recorre precios ----------
  const { p, arco } = precioBola(t);
  const irV = ease.outExpo(prog(t, t0.tres - .55, t0.tres + .15));              // latigazo hasta la verdad
  const verTodo = ease.inOutCubic(prog(t, t0.entre, t0.dist + .1));             // se abre para ver ambos
  const sigue = ease.inOutCubic(prog(t, t0.m2 - .2, t0.m2 + .5));
  let camX = lerp(340, xDe(PRECIO) - 480, irV), zoom = 1;
  camX = lerp(camX, xDe(PRECIO / 2) , verTodo); zoom = lerp(1, .145, verTodo);
  const finalCam = ease.inOutCubic(prog(t, t0.vez - .4, t0.vez + .5));
  zoom = lerp(zoom, .34 + (t > t0.vez ? 0 : 0), sigue); camX = lerp(camX, xDe(2.1e6), sigue);
  zoom = lerp(zoom, 1.25, finalCam); camX = lerp(camX, xDe(PRECIO) - 200, finalCam);
  const sx = (w: number) => (w - camX) * zoom + 540;

  const aRecta = smooth(prog(t, t0.pide + .05, t0.pide + .5)) * (1 - smooth(prog(t, t0.entrena - .15, t0.entrena + .3)));
  if (aRecta > 0) {
    c.save(); c.globalAlpha = aRecta;
    c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.moveTo(-20, YL); c.lineTo(1100, YL); c.stroke();
    const paso = zoom > .6 ? 2.5e5 : 5e5;
    for (let v = 0; v <= PRECIO * 1.6; v += paso) {
      const x = sx(xDe(v)); if (x < -60 || x > 1140) continue;
      c.fillRect(x - 1.5, YL, 3, 24);
      if (v % 1e6 === 0) texto(c, v === 0 ? "$0" : `$${v / 1e6}M`, x, YL + 72, { fuente: mono(38), color: GRIS });
    }
    c.restore();
  }

  // la casa se dibuja sola
  const salCasa = 1 - smooth(prog(t, t0.secreto + .3, t0.secreto + .7));
  const aCasa = aRecta * lerp(.28, 1, salCasa) * (t < t0.hasta ? 1 : 0);
  if (t >= t0.casa - .4) {
    c.save(); c.globalAlpha = aCasa; c.translate(0, 60 + (1 - salCasa) * -40);
    trazaPoli(c, CASA, prog(t, t0.casa - .35, t0.primera - .1), TINTA, 8, t);
    c.restore();
  }
  if (t >= t0.hasta - .05) {
    c.save(); c.globalAlpha = aRecta; c.translate(0, 60);
    trazaPoli(c, CASA2, prog(t, t0.hasta, t0.atina - .05), TINTA, 8, t);
    c.restore();
  }
  // tachones sobre lo que la máquina no sabe
  const tacha = (x0: number, y0: number, x1: number, y1: number, ti: number) => {
    const k = ease.outCubic(prog(t, ti, ti + .3)); if (k <= 0 || t > t0.ajusta) return;
    c.strokeStyle = ACENTO; c.lineWidth = 11; c.lineCap = "round"; c.beginPath(); c.moveTo(x0, y0); c.lineTo(lerp(x0, x1, k), lerp(y0, y1, k)); c.stroke();
  };
  tacha(210, 930, 870, 340, t0.nocasa + .1); tacha(210, 340, 870, 930, t0.nopeso + .1);

  // bandera de la verdad
  const xV = sx(xDe(PRECIO)), aV = smooth(prog(t, t0.tres - .25, t0.tres)) * aRecta;
  if (aV > 0 && xV < 1300) {
    c.save(); c.globalAlpha = aV; c.fillStyle = ACENTO; c.fillRect(xV - 3, YL - 250, 6, 250);
    c.beginPath(); c.moveTo(xV + 3, YL - 250); c.lineTo(xV + 92, YL - 212); c.lineTo(xV + 3, YL - 174); c.closePath(); c.fill(); c.restore();
    if (t < t0.dist) texto(c, "$3,000,000", 540, YL + 230, { fuente: serif(132), color: ACENTO, alfa: aV * (1 - verTodo) });
  }

  // la barra de error
  const xB = sx(xDe(p));
  const aErr = smooth(prog(t, t0.dist - .1, t0.dist + .3)) * aRecta;
  if (aErr > 0) {
    const k = ease.inOutCubic(prog(t, t0.dist - .05, t0.dist + .7));
    c.save(); c.globalAlpha = aErr; c.fillStyle = ACENTO; const alto = 18;
    c.fillRect(Math.min(xB, lerp(xB, xV, k)), YL - alto / 2, Math.abs(lerp(xB, xV, k) - xB), alto); c.restore();
    if (t >= t0.m2 - .15 || t < t0.secreto) {
      const e = Math.abs(PRECIO - p);
      const yN = YL + 240, pulso = t >= t0.m2 ? Math.exp(-Math.min(...[t0.m2, t0.m1, t0.c100].map((q) => (t >= q ? t - q : 9))) * 6) : 0;
      texto(c, dinero(e), 540, yN, { fuente: mono(112 + pulso * 16), color: ACENTO, alfa: aErr * (t >= t0.vez ? 1 - finalCam * .0 : 1) });
    }
  }
  rotulo(c, t, t0.llama + .9, t0.secreto - .1, "error", 1536, 170, ACENTO, true);
  // ---------- por dentro de la bola: los números que de verdad se ajustan ----------
  const abre = ease.inOutCubic(prog(t, t0.ajusta - .05, t0.ajusta + .7)) * (1 - ease.inOutCubic(prog(t, t0.m2 - .75, t0.m2 - .2)));
  if (abre > 0) {
    const R0 = lerp(42, 330, abre), cx = 540, cy = lerp(YL - 42, 700, abre);
    bola(c, cx, cy, R0);
    c.save(); c.beginPath(); c.arc(cx, cy, R0, 0, 7); c.clip();
    const r = azar(21);
    for (let i = 0; i < 26; i++) {
      const a0 = r() * 6.28, rad = 60 + r() * 245, v = (r() - .5) * .9, base = r() * 2 - 1;
      const q = Math.floor(t * 2.4 + i * .3);
      const val = base + Math.sin(q * 1.7 + i) * .012 * (1 + i % 3);
      const a = a0 + t * v, cambia = Math.exp(-(((t * 2.4 + i * .3) % 1) * 7));
      texto(c, val.toFixed(3), cx + Math.cos(a) * rad * abre, cy + Math.sin(a) * rad * abre, { fuente: mono(38), color: cambia > .35 ? "#E9896C" : LUZ, alfa: abre * lerp(.45, 1, cambia) });
    }
    c.restore();
    texto(c, "ajusta sus números, tantito", 540, 1320, { fuente: serif(84, true), color: TINTA, alfa: smooth(prog(t, t0.ajusta + .3, t0.ajusta + .6)) * abre });
  }

  // intentos: el contador se acelera
  if (t >= t0.vez - .1 && t < t0.hasta) {
    const n = Math.floor(1 + (10 ** (6.3 * ease.inCubic(prog(t, t0.vez, t0.hasta)))));
    texto(c, `${n.toLocaleString("en-US")} intentos`, 540, 1500, { fuente: mono(62), color: TINTA });
  }

  // ---------- la bola ----------
  if (t >= t0.pide - .15 && t < t0.entrena) {
    const entra = smooth(prog(t, t0.pide - .15, t0.dos - .3));
    const cae = caida(t - (t0.dos - .46), 4, .42, 34).z * 60;
    const yR = YL - 42 - (t >= t0.dos - .46 ? cae : 330) - arco;
    const yy = lerp(960, yR, entra), xx = lerp(540, xB, entra);
    sombra(c, xB, YL + 8, 74, .3 / (1 + arco * .012));
    bola(c, xx, yy, lerp(52, 42, entra) * lerp(1, .8, verTodo * (1 - finalCam)));
    if (t >= t0.dos - .1 && t < t0.entre) texto(c, "$2", clamp(xB, 120, 960), YL - 130, { fuente: serif(132), color: TINTA, alfa: smooth(prog(t, t0.dos - .1, t0.dos + .1)) * (1 - irV) });
  }

  // ---------- le atina ----------
  if (t >= t0.atina && t < t0.entrena + .1) {
    for (let i = 0; i < 3; i++) {
      const r = prog(t, t0.atina + i * .16, t0.atina + i * .16 + .9);
      if (r <= 0 || r >= 1) continue;
      c.save(); c.globalAlpha = (1 - r) * .9; c.strokeStyle = ACENTO; c.lineWidth = 5;
      c.beginPath(); c.arc(xB, YL - 42, 42 + r * 240, 0, 7); c.stroke(); c.restore();
    }
  }

  // ---------- entrenar ----------
  rotulo(c, t, t0.entrena, t0.noexpl - .1, "Eso es", 760, 120);
  rotulo(c, t, t0.entrena + .25, t0.noexpl - .1, "entrenar", 980, 210, ACENTO, true);
  rotulo(c, t, t0.noexpl, t0.solo - .08, "No le explicaron qué es una casa.", 840, 76);
  if (t >= t0.solo && t < t0.gpt) {
    rotulo(c, t, t0.solo, t0.gpt - .2, "Solo le dijeron", 820, 128);
    rotulo(c, t, t0.solo + .55, t0.gpt - .2, "cuánto se equivocó.", 980, 124, ACENTO, true);
  }

  // ---------- todo nació de ese número ----------
  const fila = (s: string, y: number, ti: number) => {
    // ajustado al ancho útil: TikTok tapa el borde derecho
    const a = smooth(prog(t, ti, ti + .2)) * (1 - smooth(prog(t, t0.quita - .25, t0.quita)));
    if (a <= 0) return;
    texto(c, s, 110, y, { fuente: serif(82, true), color: TINTA, alin: "left", alfa: a });
    const k = Math.exp(-Math.max(t - ti, 0) * 1.25), W = 860 * (.04 + .96 * k);
    c.save(); c.globalAlpha = a; c.fillStyle = ACENTO; c.fillRect(110, y + 30, W, 15); c.restore();
  };
  fila("ChatGPT", 520, t0.gpt); fila("los autos que se manejan solos", 720, t0.autos); fila("esta voz", 920, t0.voz);
  rotulo(c, t, t0.todo, t0.quita - .25, "todo nació de ese número", 1220, 84);

  // ---------- sin error ----------
  if (t >= t0.quita && t < t0.porque) {
    const a = smooth(prog(t, t0.quita, t0.quita + .3)) * (1 - smooth(prog(t, t0.porque - .3, t0.porque)));
    tormenta(c, t * .35, a * .5, 0, 540, 960);
    c.save(); c.globalAlpha = a * .92; c.fillStyle = PAPEL; c.fillRect(0, 760, 1080, 330); c.restore();
    texto(c, "sin error", 540, 900, { fuente: serif(150, true), color: TINTA, alfa: a });
    texto(c, "no aprende nada", 540, 1020, { fuente: serif(96), color: TINTA, alfa: a * smooth(prog(t, t0.nada, t0.nada + .25)) });
  }

  // ---------- final: una frase que se cierra, con la bola posada encima ----------
  if (t >= t0.porque - .1) {
    const a = smooth(prog(t, t0.porque, t0.porque + .3));
    texto(c, "Lo único que aprende", 540, 760, { fuente: serif(102), color: TINTA, alfa: a });
    texto(c, "una máquina", 540, 880, { fuente: serif(102), color: TINTA, alfa: a });
    const b = smooth(prog(t, t0.menos - .03, t0.menos + .2));
    const zz = 1 + (t - t0.menos) * .012;
    c.save(); c.translate(540, 1080); c.scale(zz, zz);
    texto(c, "es a equivocarse", 0, 0, { fuente: serif(128, true), color: ACENTO, alfa: b });
    texto(c, "menos", 0, 150, { fuente: serif(148, true), color: ACENTO, alfa: smooth(prog(t, t0.menos + .55, t0.menos + .75)) });
    c.restore();
    // La bola cae y se queda como el punto final de la frase.
    const cb = caida(t - (t0.fin - .25), 9, .42, 30);
    const yp = 1230 - 20 - cb.z * 60;
    if (t > t0.fin - .25) bola(c, 722, yp, 21);
  }
}

export const Pieza: React.FC = () => <Lienzo dibuja={dibuja} preparar={() => ({ x: 0 })} />;
