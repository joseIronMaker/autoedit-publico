// Serie 2, capítulo 4. Un solo mundo en 3D: la mesa de la fiesta. La bola festeja de cerca y la cámara,
// al retroceder entre las sillas, descubre que nadie vino. La mesa se alarga hasta el horizonte (el proyecto
// largo), la bola le da vueltas (los tres finales: contesta, tope, lista) y una lista de pie, que no se deja
// palomear sin prueba, crece hasta el cielo. El cierre es la reversa exacta de la apertura.
import React from "react";
import { azar, Cam, camara, clamp, ease, guionCamara, lerp, prog, smooth, texto, Vista } from "../../kit";
import { ACENTO, bola, cue, GRIS, Lienzo, LUZ, mono, NOCHE, PAPEL, rotulo, serif, sombra, TINTA } from "../../marca";
import { agente } from "../../personaje";
import palabras from "./palabras.json";
import duracion from "./duracion.json";

export const DURACION = duracion.dur;
const T = cue(palabras);
const s = (f: string) => T(f).s, e = (f: string) => T(f).e;
type C = CanvasRenderingContext2D;
type P3 = [number, number, number];
type D = { tela: HTMLCanvasElement };

const t0 = {
  dice: s("te dice que"), si: s("sí cuando"), cuando: s("sí cuando") + .28, tu: s("tu agente ya"), resto: s("restaurante"), avisa: s("te avisa"), listo: s("listo la"),
  fiesta: s("la fiesta está"), organ: s("organizada"), organF: e("organizada"), pero: s("pero nunca"), nunca: s("nunca invitó"), nadie: s("a nadie"), nadieF: e("a nadie"),
  anth: s("anthropic lo vio"), poner: s("poner agentes"), largos: s("proyectos largos"), largosF: e("proyectos largos"), declar: s("declaraban"), vict: s("victoria antes"), antes: s("antes de tiempo"), antesF: e("antes de tiempo"),
  logica: s("y tiene lógica"), decir: s("decir ya"), ya: s("ya terminé es"), otra: s("es solo otra"), frase: s("otra frase"), creible: s("creíble"), creibleF: e("creíble"),
  entonces: s("entonces cómo"), como: s("cómo sabe que"), acabo: e("que acabó"), hay: s("hay tres"), formas: e("tres formas"),
  f1: s("la primera"), modelo: s("el modelo"), decide: s("decide que"), nada: s("nada más"), contesta: s("contesta"), contestaF: e("contesta"), normal: s("es la normal"), falla: s("y la que falla"), fallaF: e("y la que falla"),
  f2: s("la segunda"), limite: s("un límite"), veinte: s("veinte vueltas"), dinero: s("cierto dinero"), detiene: s("se detiene"), aunque: s("aunque no haya"), aunqueF: e("aunque no haya terminado"),
  f3: s("la tercera"), buena: s("es la buena"), lista: s("lista de lo"), cierto: s("debe ser cierto"), ciertoF: e("debe ser cierto"),
  mesa: s("hay mesa"), si2: s("sí todos"), todos: s("todos invitados"), faltan: s("faltan tres"), pastel: s("pastel no"), no2: s("no y cada"), cada: s("y cada punto"), marca: s("se marca"), compr: s("comprobarlo"), comprF: e("comprobarlo"),
  eso: s("eso hizo"), lista2: s("una lista donde"), todo: s("todo empieza"), sinT: s("sin terminar"), ag2: s("y el agente solo"), cambia: s("cambiarlo"), despues: s("después de probarlo"), probar: s("probarlo"), probarF: e("probarlo"),
  sin: s("sin eso"), dos: s("dos peligros"), que: s("que se detenga"), detenga: s("detenga"), o: s("o que siga"), dando: s("dando vueltas"), gasta: s("gastando dinero"), parar: s("sin parar"), pararF: e("sin parar"),
  por: s("por eso un"), hacer: s("qué hacer"), hacerF: e("qué hacer"), nec2: s("necesita que le digas cómo"), ve: s("cómo se ve"), verF: e("cómo se ve terminado"), porque: s("porque si tú"), tu2: s("tú no lo"), sabesF: e("no lo sabes"), el: s("él tampoco"), fin: e("él tampoco"),
};

// Instantes de impacto: animación y partitura.py usan la misma cuenta.
const tBam = t0.detiene + .02, tBam2 = t0.detenga + .06, tCae = t0.lista + .02, tGolpe = t0.cuando + .4;
const tR1 = t0.marca + .1, tR2 = t0.compr + .2, tMuerde = t0.probar + .12, tPaloma = t0.probarF + .24;
const CHEQUE = [t0.si2, -1, tPaloma];

// ---------- el mundo ----------
const ZM = .8, RB = .5, BX = 0, BY = 7.1, BL = 6.5, ML = 8;
const FP: P3 = [.72, 6.86, ZM];                      // la bandera se clava delante de la bola
const SILLAS: { x: number; y: number; l: number; i: number }[] = [];
const YF = (i: number) => 1 + i * 1.08;              // la cabecera queda libre: en el primer plano no se ve ni una silla
for (let i = 0; i < 6; i++) for (const l of [-1, 1]) SILLAS.push({ x: l * 1.5, y: YF(i), l, i: SILLAS.length });
const LEJOS: { x: number; y: number; l: number; i: number }[] = [];
for (let i = 0; i < 44; i++) for (const l of [-1, 1]) LEJOS.push({ x: l * 1.5, y: 8.56 + i * 1.08, l, i });
const SIN_SOBRE = [7, 8, 10];                         // las tres que faltan
const DOMO: P3 = [0, 4.75, ZM], RD = .74;

// ---------- la pista ----------
const PA = 3.2, PB = 2.6, Y0 = 0, Y1 = 8, S1 = .234, A1 = .266, UT = .176;
function pista(u: number): [number, number] {
  const f = u - Math.floor(u);
  if (f < S1) return [PA, lerp(Y0, Y1, f / S1)];
  if (f < S1 + A1) { const a = (f - S1) / A1 * Math.PI; return [PA * Math.cos(a), Y1 + PB * Math.sin(a)]; }
  if (f < 2 * S1 + A1) return [-PA, lerp(Y1, Y0, (f - S1 - A1) / S1)];
  const a = (f - 2 * S1 - A1) / A1 * Math.PI;
  return [-PA * Math.cos(a), Y0 - PB * Math.sin(a)];
}
function integra(a: number, b: number, v: (t: number) => number) {
  const n = Math.ceil((b - a) * 240), o = new Float64Array(n + 1);
  for (let i = 1; i <= n; i++) o[i] = o[i - 1] + v(a + (i - .5) / 240);
  return (t: number) => { const k = clamp((t - a) / (b - a)) * n, i = Math.min(Math.floor(k), n - 1); return lerp(o[i], o[i + 1], k - i) / 240; };
}
const R1a = t0.formas + .05, R1b = t0.contesta - .05, U1 = 1.9;
const R2a = t0.f2 + .1;
const v2 = integra(R2a, tBam, (t) => lerp(.6, 1, smooth(prog(t, R2a, R2a + 1.3))) * lerp(1, .38, smooth(prog(t, tBam - .55, tBam - .05))));
const U2 = 22 + UT - U1, u2 = (t: number) => U1 + U2 * v2(t) / v2(tBam);
const R4a = t0.o + .08, R4b = t0.por + .45;
const v4 = integra(R4a, R4b, (t) => lerp(0, 2.6, smooth(prog(t, R4a, t0.gasta))) * (1 - smooth(prog(t, t0.por - .15, R4b))));
function uDe(t: number) {
  if (t < R1a) return 0;
  if (t < R1b) { const k = prog(t, R1a, R1b); return U1 * (1 - (1 - k) ** 1.8); }
  if (t < R2a) return U1;
  if (t < tBam) return u2(t);
  if (t < t0.dos + .3) return 22 + UT;
  if (t < tBam2) return lerp(.09, UT, prog(t, t0.dos + .3, tBam2));
  if (t < R4a) return UT;
  return UT + v4(t);
}
const vueltasDe = (t: number) => clamp(Math.floor(uDe(t) - 2 - UT), 0, 20);

// ---------- herramientas ----------
let FR = 0;
const frac = (x: number) => x - Math.floor(x);
const tiembla = (j: number) => frac(Math.sin(j * 12.9898 + FR * 78.233) * 43758.5453) - .5;
const hop = (t: number, ini: number, dur: number, h: number) => { const k = (t - ini) / dur; return k <= 0 || k >= 1 ? 0 : h * 4 * k * (1 - k); };
const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * 6.2832 + f);

function poli(c: C, cam: Cam, P: P3[], fill?: string, tinta?: string, g = 3, vib = 1.1) {
  c.beginPath();
  for (let i = 0; i < P.length; i++) {
    const q = cam.p(P[i][0], P[i][1], P[i][2]);
    if (!q) return;
    const j = P[i][0] * 3.1 + P[i][1] * 5.7 + P[i][2] * 2.3;
    const x = q.x + tiembla(j) * vib, y = q.y + tiembla(j + 40) * vib;
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.closePath();
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (tinta) { c.strokeStyle = tinta; c.lineWidth = g; c.lineJoin = "round"; c.stroke(); }
}
function lin(c: C, cam: Cam, a: P3, b: P3, g: number, color = TINTA) {
  const A = cam.p(a[0], a[1], a[2]), B = cam.p(b[0], b[1], b[2]);
  if (!A || !B) return;
  c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round"; c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke();
}
/** Dibuja en píxeles locales sobre un plano del mundo (afín: basta para tiras cortas). */
function plano(c: C, cam: Cam, o: P3, ux: P3, vy: P3, f: () => void) {
  const a = cam.p(o[0], o[1], o[2]), b = cam.p(o[0] + ux[0] * 100, o[1] + ux[1] * 100, o[2] + ux[2] * 100), d = cam.p(o[0] + vy[0] * 100, o[1] + vy[1] * 100, o[2] + vy[2] * 100);
  if (!a || !b || !d) return;
  c.save(); c.transform((b.x - a.x) / 100, (b.y - a.y) / 100, (d.x - a.x) / 100, (d.y - a.y) / 100, a.x, a.y); f(); c.restore();
}

function suelo(c: C, cam: Cam) {
  const P = 2, xs = 18, y0 = -16, y1 = 46, cubos: number[][] = [[], [], []];
  const seg = (ax: number, ay: number, bx: number, by: number) => {
    const A = cam.p(ax, ay, 0), B = cam.p(bx, by, 0); if (!A || !B) return;
    const z = (A.zc + B.zc) / 2; cubos[z < 14 ? 0 : z < 26 ? 1 : 2].push(A.x, A.y, B.x, B.y);
  };
  for (let x = -xs; x <= xs; x += P) for (let y = y0; y < y1; y += P) seg(x, y, x, y + P);
  for (let y = y0; y <= y1; y += P) for (let x = -xs; x < xs; x += P) seg(x, y, x + P, y);
  [.13, .08, .04].forEach((a, i) => {
    const q = cubos[i]; c.strokeStyle = `rgba(17,17,17,${a})`; c.lineWidth = 1.5; c.beginPath();
    for (let k = 0; k < q.length; k += 4) { c.moveTo(q[k], q[k + 1]); c.lineTo(q[k + 2], q[k + 3]); }
    c.stroke();
  });
}

function mesa(c: C, cam: Cam, L: number) {
  const w = 1, tela = "#FCFBF7", falda = "#DEDAD0";
  const cx = cam.pos[0], cy = cam.pos[1];
  const cortes: number[] = [];
  for (let y = 0; y < L;) { cortes.push(y); y += y < 16 ? 1 : 4; }
  cortes.push(L);
  for (let i = 0; i < cortes.length - 1; i++) {
    const a = cortes[i], b = cortes[i + 1];
    poli(c, cam, [[-1.32, a, 0], [1.32, a, 0], [1.32, b, 0], [-1.32, b, 0]], "rgba(20,18,14,.09)", undefined, 0, 0);
  }
  for (let i = 0; i < cortes.length - 1; i++) {
    const a = cortes[i], b = cortes[i + 1];
    if (cx > w) poli(c, cam, [[w, a, ZM], [w, b, ZM], [w, b, .1], [w, a, .1]], falda);
    if (cx < -w) poli(c, cam, [[-w, a, ZM], [-w, b, ZM], [-w, b, .1], [-w, a, .1]], falda);
    poli(c, cam, [[-w, a, ZM], [w, a, ZM], [w, b, ZM], [-w, b, ZM]], tela);
  }
  if (cy < 0) { poli(c, cam, [[-w, 0, ZM], [w, 0, ZM], [w, 0, .1], [-w, 0, .1]], falda, TINTA, 3); }
  if (cy > L) poli(c, cam, [[-w, L, ZM], [w, L, ZM], [w, L, .1], [-w, L, .1]], falda, TINTA, 3);
  for (let i = 0; i < cortes.length - 1; i++) {
    const a = cortes[i], b = cortes[i + 1], q = cam.p(0, (a + b) / 2, ZM), g = q ? clamp(q.s * .022, 1.4, 6) : 3;
    lin(c, cam, [w, a, ZM], [w, b, ZM], g); lin(c, cam, [-w, a, ZM], [-w, b, ZM], g);
  }
  lin(c, cam, [-w, 0, ZM], [w, 0, ZM], 4); lin(c, cam, [-w, L, ZM], [w, L, ZM], 3);
}

function plato(c: C, cam: Cam, x: number, y: number) {
  for (const [r, fill, g] of [[.3, "#EFECE4", 2.2], [.19, "#F8F6F1", 1.4]] as [number, string, number][]) {
    const P: P3[] = [];
    for (let i = 0; i < 18; i++) { const a = i / 18 * 6.2832; P.push([x + Math.cos(a) * r, y + Math.sin(a) * r, ZM]); }
    poli(c, cam, P, fill, "rgba(17,17,17,.55)", g, .5);
  }
}

function silla(c: C, cam: Cam, x: number, y: number, l: number, k = 1) {
  const p = (dx: number, dy: number, z: number): P3 => [x + dx * l, y + dy, z * k];
  const q = cam.p(x, y, .5); if (!q || k <= .02) return;
  const g = clamp(.05 * q.s, 1.2, 15);
  c.save(); c.globalAlpha *= clamp(1.25 - q.zc / 50, .12, 1);
  for (const [a, b] of [[-.3, -.3], [-.3, .3], [.3, -.3], [.3, .3]]) lin(c, cam, p(a, b, 0), p(a, b, .5), g);
  lin(c, cam, p(.32, -.32, .5), p(.32, -.32, 1.34), g); lin(c, cam, p(.32, .32, .5), p(.32, .32, 1.34), g);
  lin(c, cam, p(.32, -.32, .92), p(.32, .32, .92), g * .7);
  poli(c, cam, [p(-.34, -.34, .5), p(.34, -.34, .5), p(.34, .34, .5), p(-.34, .34, .5)], TINTA, TINTA, 2);
  poli(c, cam, [p(.32, -.34, 1.36), p(.32, .34, 1.36), p(.32, .34, 1.14), p(.32, -.34, 1.14)], TINTA, TINTA, 2);
  c.restore();
}

function sobreS(c: C, x: number, y: number, w: number, g = 0) {
  const h = w * .66;
  c.save(); c.translate(x, y); c.rotate(g); c.fillStyle = "#fff"; c.strokeStyle = TINTA; c.lineWidth = Math.max(w * .05, 1.6); c.lineJoin = "round";
  c.beginPath(); c.rect(-w / 2, -h / 2, w, h); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-w / 2, -h / 2); c.lineTo(0, h * .1); c.lineTo(w / 2, -h / 2); c.stroke(); c.restore();
}

function gorro(c: C, r: number, g: number) {
  c.save(); c.rotate(g);
  c.fillStyle = ACENTO; c.beginPath(); c.moveTo(-r * .84, -r * .55); c.quadraticCurveTo(0, -r * .32, r * .84, -r * .55); c.lineTo(0, -r * 2.5); c.closePath(); c.fill();
  c.strokeStyle = "rgba(255,240,225,.8)"; c.lineWidth = r * .07; c.beginPath(); c.moveTo(-r * .44, -r * 1.28); c.quadraticCurveTo(0, -r * 1.14, r * .44, -r * 1.28); c.moveTo(-r * .2, -r * 1.86); c.quadraticCurveTo(0, -r * 1.78, r * .2, -r * 1.86); c.stroke();
  c.fillStyle = TINTA; c.beginPath(); c.arc(0, -r * 2.56, r * .2, 0, 7); c.fill(); c.restore();
}

function bandera(c: C, x: number, y: number, ang: number, k: number, t: number, d: D, flojo: number) {
  const H = 640 * k, W = 720 * k, A = 280 * k, n = Math.round(clamp(44 * k, 28, 180));
  c.save(); c.translate(x, y); c.rotate(ang);
  c.strokeStyle = TINTA; c.lineWidth = Math.max(11 * k, 2); c.lineCap = "round"; c.beginPath(); c.moveTo(0, 360 * k); c.lineTo(0, -H); c.stroke();
  c.fillStyle = TINTA; c.beginPath(); c.arc(0, -H, Math.max(14 * k, 3), 0, 7); c.fill();
  // Tela en tiras: la ondulación crece hacia el borde libre y, floja, cuelga pegada al palo.
  for (let i = 0; i < n; i++) {
    const v = 1 - (i + .5) / n, ola = Math.sin(v * 8 - t * 9) * 30 * k * v * (1 - flojo * .86);
    const px = -W * (1 - i / n) * lerp(1, .36, flojo), dy = ola + flojo * v * v * 250 * k;
    c.drawImage(d.tela, i / n * d.tela.width, 0, d.tela.width / n + 1, d.tela.height, px, -H + dy, W * lerp(1, .36, flojo) / n + 1, A);
    const sa = .17 * (1 + Math.cos(v * 8 - t * 9)) * (1 - flojo * .4);
    c.fillStyle = `rgba(0,0,0,${sa})`; c.fillRect(px, -H + dy, W * lerp(1, .36, flojo) / n + 1, A);
  }
  c.restore();
}

function rotulo2(c: C, t: number, ini: number, fin: number, txt: string, x: number, y: number, px: number, color = TINTA, it = false, alin: CanvasTextAlign = "center") {
  const a = smooth(prog(t, ini - .04, ini + .14)) * (1 - smooth(prog(t, fin, fin + .2)));
  if (a > 0) texto(c, txt, x, y + (1 - ease.outCubic(prog(t, ini - .04, ini + .3))) * 16, { fuente: serif(px, it), color, alfa: a, alin });
}

/** Papel picado: cada lámina es un plano del mundo que se mece desde la cuerda. */
function picado(c: C, cam: Cam, t: number) {
  const L = "SORPRESA", y = 9.2, ZB = 6.62;
  if (Math.abs(cam.v.yaw) > .5 || cam.v.pitch > .8 || (t >= tCae - .02 && t < t0.sin + .7)) return globos(c, cam, t);
  lin(c, cam, [-2.9, y, 0], [-2.9, y, ZB + .2], 5); lin(c, cam, [2.9, y, 0], [2.9, y, ZB + .2], 5);
  let ant: P3 = [-2.9, y, ZB];
  for (let i = 0; i <= 18; i++) {
    const u = i / 18, x = lerp(-2.9, 2.9, u), z = ZB - .36 * Math.sin(u * Math.PI);
    lin(c, cam, ant, [x, y, z], 3); ant = [x, y, z];
  }
  for (let i = 0; i < 8; i++) {
    const u = (i + .5) / 8, x = lerp(-2.9, 2.9, u), z = ZB - .36 * Math.sin(u * Math.PI), mece = vaiven(t, 1.7, i * 1.1) * .14;
    plano(c, cam, [x - .3, y, z], [.0067, 0, 0], [0, mece * .0067, -.0067], () => {
      c.fillStyle = i % 3 === 1 ? ACENTO : "#fff"; c.strokeStyle = TINTA; c.lineWidth = 3;
      c.beginPath(); c.moveTo(0, 0); c.lineTo(90, 0); c.lineTo(90, 96);
      for (let k = 5; k >= 0; k--) c.quadraticCurveTo(k * 15 + 7.5, 112, k * 15, 96);
      c.closePath(); c.fill(); c.stroke();
      texto(c, L[i], 45, 72, { fuente: serif(76), color: i % 3 === 1 ? PAPEL : TINTA });
    });
  }
  globos(c, cam, t);
}
function globos(c: C, cam: Cam, t: number) {
  // Lo único que seguía de pie. El golpe de la lista los suelta y se van.
  const y = 9.2, a = t - tCae; if (a > 2 || Math.abs(cam.v.yaw) > .5 || cam.v.pitch > .8) return;
  const sube = a > 0 ? 2.4 * a * a + 1.4 * a : 0;
  for (const [x, z, f] of [[-3.5, 4.5, 0], [-2.9, 5.1, 1], [3.5, 4.8, 2], [2.9, 5.4, 3]] as [number, number, number][]) {
    const b = cam.p(x + vaiven(t, 2.7, f) * .1, y, z + vaiven(t, 3.3, f) * .08 + sube), n = a > 0 ? cam.p(x + vaiven(t, 2.7, f) * .1, y, z - 1 + sube) : cam.p(x > 0 ? 2.9 : -2.9, y, 3.9);
    if (!b || !n) continue;
    c.strokeStyle = "rgba(17,17,17,.6)"; c.lineWidth = 2; c.beginPath(); c.moveTo(n.x, n.y); c.lineTo(b.x, b.y); c.stroke();
    bola(c, b.x, b.y, .42 * b.s, ACENTO);
  }
}

// ---------- confeti y monedas: mundo, no pantalla ----------
const RAFAGAS: { t: number; x: number; y: number; z: number; n: number; v: number; sem: number }[] = [
  { t: -.34, x: -.3, y: BY, z: 1.7, n: 120, v: 4.4, sem: 1 }, { t: 1.42, x: .4, y: BY, z: 1.8, n: 90, v: 4, sem: 2 },
  { t: t0.listo - .04, x: -.2, y: BY, z: 1.8, n: 70, v: 3.8, sem: 3 }, { t: t0.organ + .1, x: .2, y: BY, z: 2, n: 150, v: 5.4, sem: 4 },
];
function confeti(c: C, cam: Cam, t: number) {
  const C3: number[][] = [[], [], []];
  for (const b of RAFAGAS) {
    const a = t - b.t; if (a < 0) continue;
    const r = azar(b.sem * 977);
    for (let i = 0; i < b.n; i++) {
      const th = r() * 6.283, v = b.v * (.35 + r()), vz = 1.2 + r() * 3.4, fa = .42 + r() * .36, w0 = r() * 6.28, wv = 3 + r() * 7, ta = .022 + r() * .018, f = r() * 6.28;
      const K = 2.3, q = (1 - Math.exp(-K * a)) / K;
      const x = b.x + Math.cos(th) * v * q + Math.sin(a * 2.1 + f) * .07 * Math.min(a, 1), y = b.y + Math.sin(th) * v * q * .8;
      const dentro = Math.abs(x) < 1 && y > 0 && y < ML, pi = (dentro ? ZM : 0) + .012;
      const z0 = b.z + vz * q - fa * a, z = Math.max(pi, z0), tierra = z0 <= pi;
      const p = cam.p(x, y, z); if (!p || p.x < -40 || p.x > 1120 || p.y < -40 || p.y > 1960) continue;
      const rot = tierra ? w0 : w0 + a * wv, flip = tierra ? .55 : Math.cos(a * (wv + 2) + f), W = ta * p.s, H = ta * .62 * p.s * Math.abs(flip);
      if (W < .7) continue;
      const cs = Math.cos(rot), sn = Math.sin(rot), o = C3[i % 5 === 0 ? 1 : i % 7 === 0 ? 2 : 0];
      o.push(p.x + cs * W - sn * H, p.y + sn * W + cs * H, p.x - cs * W - sn * H, p.y - sn * W + cs * H, p.x - cs * W + sn * H, p.y - sn * W - cs * H, p.x + cs * W + sn * H, p.y + sn * W - cs * H);
    }
  }
  [TINTA, ACENTO, GRIS].forEach((col, n) => {
    const q = C3[n]; c.fillStyle = col; c.beginPath();
    for (let k = 0; k < q.length; k += 8) { c.moveTo(q[k], q[k + 1]); c.lineTo(q[k + 2], q[k + 3]); c.lineTo(q[k + 4], q[k + 5]); c.lineTo(q[k + 6], q[k + 7]); c.closePath(); }
    c.fill();
  });
}

function monedas(c: C, cam: Cam, t: number) {
  const a0 = t0.dando, N = 300, dt = (t0.por + .1 - a0) / N, r = azar(4242);
  const cae = 1 - smooth(prog(t, t0.por + .15, t0.por + .95));
  if (cae <= 0) return;
  for (let i = 0; i < N; i++) {
    const ang = r() * 6.283, v = 2.4 + r() * 5, vz = 4 + r() * 6.5, wv = 7 + r() * 9, tam = .19 + r() * .1, ti = a0 + i * dt, a = t - ti;
    if (a < 0) continue;
    const [px, py] = pista(uDe(ti));
    const K = 1.5, q = (1 - Math.exp(-K * a)) / K, x = px + Math.cos(ang) * v * q, y = py + Math.sin(ang) * v * q;
    const z0 = .6 + vz * a - 9.5 * a * a, dentro = Math.abs(x) < 1 && y > 0 && y < ML, pi = (dentro ? ZM : 0) + .02, z = Math.max(pi, z0);
    const p = cam.p(x, y, z); if (!p) continue;
    const R = tam * p.s, fl = z <= pi ? .62 : Math.abs(Math.cos(a * wv));
    c.save(); c.globalAlpha = cae; c.fillStyle = ACENTO; c.strokeStyle = "#7E2413"; c.lineWidth = Math.max(R * .12, 1); c.beginPath(); c.ellipse(p.x, p.y, R, Math.max(R * fl, R * .1), 0, 0, 6.3); c.fill(); c.stroke();
    if (R > 15 && fl > .5) texto(c, "$", p.x, p.y + R * .36, { fuente: mono(Math.round(R)), color: PAPEL, alfa: cae });
    c.restore();
  }
}

function polvo(c: C, cam: Cam, t: number, tb: number, x: number, y: number, z: number, n = 16, ancho = 1.5) {
  const a = t - tb; if (a < 0 || a > .8) return;
  const r = azar(Math.floor(tb * 100) + 3);
  for (let i = 0; i < n; i++) {
    const lado = i % 2 ? 1 : -1, v = 1 + r() * 2.6, sube = .08 + r() * .34, ra = .03 + r() * .07, dx = (r() - .5) * .8;
    const q = 1 - Math.exp(-a * 5), p = cam.p(x + dx * q, y + lado * v * q * ancho * .55, z + sube * q - .4 * a * a);
    if (!p) continue;
    c.fillStyle = `rgba(120,116,106,${(1 - a / .8) * .5})`; c.beginPath(); c.arc(p.x, p.y, (ra + a * .12) * p.s, 0, 6.3); c.fill();
  }
}

// ---------- la lista ----------
const LX = -2.5, LW = 5, LY = 8.9, FILA = .95, ESC = LW / 900, NF = 46, Z0L = 1.72;
const ETQ = ["¿pastel?", "¿invitados?", "¿mesa?"];
function zLista(t: number) {
  if (t < tCae - .36) return 80;
  if (t < tCae) return 26 * (1 - ease.inCubic(prog(t, tCae - .36, tCae)));
  const a = t - tCae;
  return .22 * Math.exp(-a * 5.5) * Math.abs(Math.sin(a * 12)) + 80 * ease.inCubic(prog(t, t0.sin + .05, t0.sin + 1));
}
const verLista = (t: number) => t >= tCae - .38 && t < t0.sin + 1.05;
const crece = (t: number) => ease.inOutCubic(prog(t, t0.lista2 + .05, t0.sinT + .3));
const borrado = (t: number) => t >= t0.todo;

function paloma(c: C, x: number, y: number, tam: number, k: number, color = TINTA) {
  if (k <= 0) return;
  const z = lerp(1.7, 1, ease.outBack(clamp(k * 1.6)));
  c.save(); c.translate(x, y); c.scale(z, z); c.strokeStyle = color; c.lineWidth = tam * .2; c.lineCap = "round"; c.lineJoin = "round"; c.globalAlpha *= clamp(k * 3);
  c.beginPath(); c.moveTo(-tam * .46, tam * .02); c.lineTo(-tam * .12, tam * .38); c.lineTo(tam * .56, -tam * .56); c.stroke(); c.restore();
}

function lista(c: C, cam: Cam, t: number) {
  if (!verLista(t)) return;
  const z0 = zLista(t) + Z0L, kc = crece(t), H = 3 * FILA + 1.2 + kc * (NF * FILA), top = z0 + H, x1 = LX + LW;
  poli(c, cam, [[LX + .13, LY + .1, z0 - .13], [x1 + .13, LY + .1, z0 - .13], [x1 + .13, LY + .1, top - .13], [LX + .13, LY + .1, top - .13]], "rgba(20,18,14,.18)", undefined, 0, 0);
  // La hoja va por tramos: una sola diagonal de 40 m se doblaría al proyectarse sin perspectiva.
  const paso = Math.max(H / 18, .6);
  for (let z = z0; z < top; z += paso) poli(c, cam, [[LX, LY, z], [x1, LY, z], [x1, LY, Math.min(z + paso + .02, top)], [LX, LY, Math.min(z + paso + .02, top)]], "#FFFFFF", undefined, 0, .8);
  for (let z = z0; z < top; z += paso) { const b = Math.min(z + paso, top); lin(c, cam, [LX, LY, z], [LX, LY, b], 4); lin(c, cam, [x1, LY, z], [x1, LY, b], 4); }
  lin(c, cam, [LX, LY, z0], [x1, LY, z0], 4); lin(c, cam, [LX, LY, top], [x1, LY, top], 4);
  // Título y pinza.
  plano(c, cam, [LX, LY, z0 + 3 * FILA + 1.1], [ESC, 0, 0], [0, 0, -ESC], () => {
    texto(c, "terminado es:", 450, 118, { fuente: serif(104, true), color: TINTA, alfa: 1 - clamp(kc * 3) * .0 });
  });
  plano(c, cam, [0, LY, top + .22], [ESC, 0, 0], [0, 0, -ESC], () => {
    c.fillStyle = TINTA; c.beginPath(); c.roundRect(-150, 0, 300, 70, 16); c.fill();
    c.fillStyle = "#3a3a38"; c.beginPath(); c.arc(0, 34, 16, 0, 7); c.fill();
  });
  // Tres renglones que el guion pregunta, luego los que nadie ha probado.
  const lap = ["sí", "faltan 3", "no"], tRes = [t0.si2, t0.faltan, t0.no2], act = [t0.mesa, t0.todos, t0.pastel];
  for (let k = 0; k < 3; k++) {
    const i = 2 - k;  // i: 0 pastel, 1 invitados, 2 mesa
    const zf = z0 + i * FILA + FILA, ap = smooth(prog(t, tCae + .25 + k * .22, tCae + .4 + k * .22));
    plano(c, cam, [LX, LY, zf], [ESC, 0, 0], [0, 0, -ESC], () => {
      const y = 25, b = 116, x = 44, pulso = rechazo(t, i);
      const activa = smooth(prog(t, act[k] - .1, act[k] + .08)) * (1 - smooth(prog(t, act[k] + 1.45, act[k] + 1.7)));
      if (activa > 0) { c.fillStyle = `rgba(192,68,42,${.1 * activa})`; c.fillRect(14, 8, 872, 150); }
      c.globalAlpha = ap;
      c.save(); c.translate(x + b / 2, y + b / 2); const zz = 1 + pulso * .38; c.scale(zz, zz);
      c.fillStyle = pulso > .02 ? `rgba(192,68,42,${.2 + pulso * .7})` : "#FBFAF6"; c.strokeStyle = pulso > .02 ? ACENTO : TINTA; c.lineWidth = 9; c.beginPath(); c.roundRect(-b / 2, -b / 2, b, b, 12); c.fill(); c.stroke();
      if (pulso > .02) { c.strokeStyle = PAPEL; c.lineWidth = 15; c.lineCap = "round"; c.beginPath(); c.moveTo(-30, -30); c.lineTo(30, 30); c.moveTo(30, -30); c.lineTo(-30, 30); c.stroke(); }
      c.restore();
      texto(c, ETQ[i], 192, 118, { fuente: serif(100), color: TINTA, alfa: ap, alin: "left" });
      const borra = 1 - smooth(prog(t, t0.todo, t0.todo + .22));
      const r = smooth(prog(t, tRes[k] - .02, tRes[k] + .1)) * borra;
      if (r > 0) texto(c, lap[k], 872, 112, { fuente: serif(i === 1 ? 78 : 96, true), color: i === 2 ? TINTA : ACENTO, alfa: r, alin: "right" });
      if (i === 2) paloma(c, x + b / 2, y + b / 2, 92, prog(t, t0.si2, t0.si2 + .16) * borra);
      if (i === 0) paloma(c, x + b / 2, y + b / 2, 92, prog(t, tPaloma, tPaloma + .16));
      c.globalAlpha = 1;
    });
  }
  // Renglones de arriba: casillas sin palomear, texto de relleno que no se lee a propósito (no es dato).
  if (kc > 0) {
    const r = azar(66);
    for (let n = 0; n < NF; n++) {
      const l1 = 300 + r() * 380, l2 = 120 + r() * 300, zf = z0 + 3 * FILA + 1.2 + (n + 1) * FILA;
      if (zf > top) continue;
      plano(c, cam, [LX, LY, zf], [ESC, 0, 0], [0, 0, -ESC], () => {
        c.fillStyle = "#FBFAF6"; c.strokeStyle = TINTA; c.lineWidth = 9; c.beginPath(); c.roundRect(44, 25, 116, 116, 12); c.fill(); c.stroke();
        c.fillStyle = "#B9B6AD"; c.fillRect(192, 56, l1, 16); c.fillRect(192, 96, l2, 16);
      });
    }
  }
}
function rechazo(t: number, i: number) {
  let v = 0;
  if (i === 0 && t >= tR1) v = Math.max(v, Math.exp(-(t - tR1) * 3.4));
  if (i === 1 && t >= tR2) v = Math.max(v, Math.exp(-(t - tR2) * 3.4));
  return v;
}

// ---------- el tope ----------
const TOPY = 6.6, TOPW = .55;
function zTope(t: number) {
  if (t < t0.limite - .2) return 18;
  if (t < tBam - .15) return lerp(14, 4.5, ease.outBack(prog(t, t0.limite - .15, t0.limite + .35), 1.1)) + vaiven(t, .9) * .06;
  if (t < tBam) return lerp(4.5, 0, ease.inCubic(prog(t, tBam - .15, tBam)));
  if (t < t0.f3 + .3) return .14 * Math.exp(-(t - tBam) * 8) * Math.abs(Math.sin((t - tBam) * 22));
  if (t < t0.f3 + .95) return 16 * ease.inCubic(prog(t, t0.f3 + .3, t0.f3 + .95));
  if (t < tBam2 - .22) return 18;
  if (t < tBam2) return 16 * (1 - ease.inCubic(prog(t, tBam2 - .22, tBam2)));
  if (t < t0.o) return .14 * Math.exp(-(t - tBam2) * 8) * Math.abs(Math.sin((t - tBam2) * 22));
  return 16 * ease.inCubic(prog(t, t0.o, t0.o + .4));
}
function tope(c: C, cam: Cam, t: number) {
  const z = zTope(t); if (z > 17 || Math.abs(cam.v.yaw) < .35) return;
  const x0 = 2.5, x1 = 3.9, y0 = TOPY, y1 = TOPY + TOPW, h = 9;
  poli(c, cam, [[x0, y0, z], [x1, y0, z], [x1, y0, z + h], [x0, y0, z + h]], "#26262A");
  poli(c, cam, [[x1, y0, z], [x1, y1, z], [x1, y1, z + h], [x1, y0, z + h]], "#17171a", TINTA, 5);
  // Rayas de peligro proyectadas una por una: en un plano afín la plancha se estiraba hasta el pie del cuadro.
  for (let k = -1; k < 13; k++) {
    const a = z + k * .72, m = (w: number) => clamp(w, z, z + h);
    poli(c, cam, [[x1, y0, m(a)], [x1, y1, m(a + .42)], [x1, y1, m(a + .82)], [x1, y0, m(a + .4)]], ACENTO, undefined, 0, .6);
  }
}
function buzon(c: C, cam: Cam, t: number) {
  if (Math.abs(cam.v.yaw) < .35) return;
  const y = 7.85, x = 3.2;
  lin(c, cam, [x, y, 0], [x, y, 1.4], 9);
  plano(c, cam, [x, y - .62, 1.86], [0, .0062, 0], [0, 0, -.0062], () => {
    c.fillStyle = "#26262A"; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.moveTo(0, 90); c.lineTo(0, 40); c.quadraticCurveTo(0, 0, 40, 0); c.lineTo(160, 0); c.quadraticCurveTo(200, 0, 200, 40); c.lineTo(200, 90); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = "#6d6b66"; c.fillRect(30, 34, 96, 11);
    c.fillStyle = ACENTO; c.fillRect(158, 8, 11, 60); c.beginPath(); c.moveTo(169, 8); c.lineTo(200, 22); c.lineTo(169, 36); c.closePath(); c.fill();
  });
}

// ---------- domo y pastel ----------
function domoY(t: number) {
  const a1 = t0.pastel - .28;
  const uno = smooth(prog(t, a1, a1 + .3)) * (1 - smooth(prog(t, t0.no2 + .55, t0.no2 + .85)));
  const a2 = t0.despues - .25;
  const dos = smooth(prog(t, a2, a2 + .3));
  return Math.max(uno, dos);
}
const hayPastel = (t: number) => t >= t0.ag2;
function pastel(c: C, x: number, y: number, S: number, bocado: number) {
  const w = .54 * S, h = .36 * S, W2 = .38 * S, h2 = .26 * S, bx = x + .4 * S, by = y - .5 * S, br = .27 * S * bocado;
  const silueta = () => { c.beginPath(); c.roundRect(x - w, y - h, w * 2, h, S * .03); c.roundRect(x - W2, y - h - h2, W2 * 2, h2, S * .03); };
  c.save();
  if (bocado > 0) { c.beginPath(); c.rect(x - S, y - S, S * 2, S * 1.2); c.arc(bx, by, br, 0, 6.3); c.clip("evenodd"); }
  c.strokeStyle = TINTA; c.lineWidth = Math.max(.024 * S, 1.6); c.lineJoin = "round";
  c.fillStyle = "#FFFFFF"; c.beginPath(); c.roundRect(x - w, y - h, w * 2, h, S * .03); c.fill(); c.stroke();
  c.fillStyle = "#F4EFE6"; c.beginPath(); c.roundRect(x - W2, y - h - h2, W2 * 2, h2, S * .03); c.fill(); c.stroke();
  c.fillStyle = ACENTO; for (let i = -2; i <= 2; i++) { c.beginPath(); c.arc(x + i * w * .4, y - h * .62, S * .05, 0, 7); c.fill(); }
  c.beginPath(); c.arc(x - S * .05, y - h - h2 - S * .06, S * .08, 0, 7); c.fill();
  c.restore();
  if (bocado > 0) {
    // Lo que deja la mordida: el bizcocho por dentro, solo donde había pastel.
    c.save(); silueta(); c.clip(); c.strokeStyle = "#E3C98F"; c.lineWidth = S * .05; c.beginPath(); c.arc(bx, by, br + S * .02, 0, 6.3); c.stroke();
    c.strokeStyle = TINTA; c.lineWidth = Math.max(.02 * S, 1.6); c.beginPath(); c.arc(bx, by, br, 0, 6.3); c.stroke(); c.restore();
    c.fillStyle = "#C9A865"; for (let i = 0; i < 8; i++) { c.beginPath(); c.arc(x + (.5 + Math.sin(i * 2.4) * .3) * S, y + Math.cos(i * 1.7) * .03 * S + .03 * S, S * .016, 0, 7); c.fill(); }
  }
}
function domo(c: C, cam: Cam, t: number) {
  if (!(t >= tCae - .5 && t < t0.sin + 1.1)) return;
  const k = domoY(t), a = cam.p(DOMO[0], DOMO[1], ZM); if (!a) return;
  const S = a.s * RD / .72, R = .72 * S;
  c.strokeStyle = TINTA; c.lineWidth = 3; c.fillStyle = "#E9E6DE"; c.beginPath(); c.ellipse(a.x, a.y, R * 1.12, R * .34, 0, 0, 6.3); c.fill(); c.stroke();
  if (hayPastel(t)) pastel(c, a.x, a.y, S, smooth(prog(t, tMuerde, tMuerde + .08)));
  else if (k > .3) { c.fillStyle = TINTA; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(a.x + Math.sin(i * 2.1) * R * .4, a.y + Math.cos(i * 3.3) * R * .12, 3.4, 0, 7); c.fill(); } }
  const y = a.y - k * R * 1.5, x = a.x + k * R * .82;
  const g = c.createLinearGradient(-R, -R, R, 0);
  g.addColorStop(0, "#F7F6F1"); g.addColorStop(.3, "#C9C7C0"); g.addColorStop(.52, "#8d8b85"); g.addColorStop(.72, "#D6D4CD"); g.addColorStop(1, "#4b4a46");
  c.save(); c.translate(x, y); c.rotate(k * .34);
  c.fillStyle = g; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.moveTo(-R, 0); c.quadraticCurveTo(-R, -R * 1.2, 0, -R * 1.2); c.quadraticCurveTo(R, -R * 1.2, R, 0); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = TINTA; c.beginPath(); c.arc(0, -R * 1.3, R * .13, 0, 7); c.fill(); c.restore();
}
function perilla(cam: Cam, t: number): [number, number] {
  const k = domoY(t), a = cam.p(DOMO[0], DOMO[1], ZM)!; const R = RD * a.s;
  const y = a.y - k * R * 1.5, x = a.x + k * R * .82;
  return [x + Math.sin(k * .34) * R * 1.3, y - Math.cos(k * .34) * R * 1.3];
}

// ---------- el bicho ----------
type Est = { x: number; y: number; z: number; r: number; m1: [number, number]; m2: [number, number]; a1?: [number, number]; a2?: [number, number]; ab1: number; ab2: number; rot: number; sq: number; piso: number; gorro: number; carga: number };
const conFlag = (t: number) => t < t0.vict;

function estado(t: number, cam: Cam): Est {
  const E: Est = { x: BX, y: BY, z: ZM + RB, r: RB, m1: [-1.9, -1.1], m2: [2, -1.2], ab1: .7, ab2: .2, rot: 0, sq: 0, piso: ZM, gorro: .14, carga: 0 };
  const rm = (t2: number) => { E.r = lerp(RB, .82, smooth(prog(cam.v.pitch, .45, 1.1))); return t2; };
  const salta = (a: number, b: number, X0: number, Y0_: number, Z0: number, X1: number, Y1_: number, Z1: number, h = 1.1) => { const k = smooth(prog(t, a, b)); E.x = lerp(X0, X1, k); E.y = lerp(Y0_, Y1_, k); E.z = lerp(Z0, Z1, k) + h * 4 * k * (1 - k); E.piso = k < .5 ? Z0 - RB : Z1 - RB; };

  if (t < t0.vict) {
    const k = 1 - smooth(prog(t, t0.dice - .2, t0.dice + .1)), f = (t + .16) / .62, fr = frac(f);
    let alto = Math.abs(Math.sin(Math.PI * f)) * .5 * k;
    alto += hop(t, t0.tu - .02, .46, .26) + hop(t, t0.listo - .14, .5, .36) + hop(t, t0.organ - .1, .62, .62);
    E.z += alto; E.sq = .17 * k * Math.max(0, 1 - Math.min(fr, 1 - fr) / .12);
    const sw = Math.sin(t * 9);
    const baja = smooth(prog(t, t0.nunca, t0.nadieF + .25));
    E.m1 = [lerp(-2.05, -1.7, baja), lerp(-2.1 + sw * .28, .7, baja)]; E.m2 = [lerp(1.95, 1.6, baja), lerp(-1.05 + sw * .22, -.1, baja)]; E.ab1 = lerp(.9, .4, baja);
    if (t >= t0.dice - .1 && t < tGolpe) E.m1 = [-1.5, -.1 + .1 * sw];    // en jarras: orgullosa
    if (t >= tGolpe) {
      const a = t - tGolpe;
      E.sq += .34 * Math.exp(-a * 7) * Math.cos(a * 22);
      E.gorro = .14 + .75 * Math.exp(-a * 3.2) * Math.cos(a * 8);
    }
    if (t >= t0.declar - .5) {
      const k2 = smooth(prog(t, t0.declar - .4, t0.vict - .16)), a = ease.inCubic(prog(t, t0.vict - .16, t0.vict));
      E.m2 = [lerp(1.6, 1.9, k2), lerp(-.1, -2.5, k2) + a * 2.3];
    }
    return E;
  }
  if (t < t0.hay) {
    // Clavó la bandera. Festeja. Después, sin la bandera, ya no sabe qué hacer con las manos.
    const a = t - t0.vict;
    E.z += hop(t, t0.vict, .42, .3) + hop(t, t0.antes - .1, .46, .34) + Math.abs(Math.sin(a * 5.2)) * .08 * (1 - prog(t, t0.logica, t0.logica + .4));
    const sw = Math.sin(t * 8);
    E.m1 = [-2, -2.1 + sw * .25]; E.m2 = [2, -2.1 - sw * .25]; E.ab1 = .9; E.ab2 = .9;
    if (t >= t0.entonces) {
      const m = Math.sin((t - t0.entonces) * 2.1);
      E.rot = m * .1; E.m1 = [-.92, -1.55 + Math.sin(t * 13) * .1]; E.m2 = [2.1, -.5 + m * .2]; E.ab1 = .3; E.ab2 = .95; E.z = ZM + RB;
    }
    return E;
  }
  if (t < R1a + .02) {
    const P = pista(0); salta(t0.hay, R1a, BX, BY, ZM + RB, P[0], P[1], RB, 1.5);
    E.m1 = [-2, -1.6]; E.m2 = [2, -1.6]; E.ab2 = .8; rm(0); return E;
  }
  if (t < t0.buena - .3) {
    const u = uDe(t), P = pista(u), Q = pista(u + .004);
    E.x = P[0]; E.y = P[1]; E.z = RB; E.piso = 0;
    const corre = R1b > t ? 1 - prog(t, R1b - .5, R1b) * .8 : t > R2a && t < tBam ? 1 : 0;
    const q0 = cam.p(P[0], P[1], .5), q1 = cam.p(Q[0], Q[1], .5);
    const dx = q0 && q1 ? Math.sign(q1.x - q0.x) || 1 : 1;
    E.z += Math.abs(Math.sin(t * 15)) * .12 * corre;
    E.rot = corre * dx * .16; E.sq = -.05 * corre;
    if (corre > .1) { const v = Math.sin(t * 21); E.m1 = [-1.8 * dx + v * .3, -.2 - v * .5]; E.m2 = [1.2 * dx - v * .3, -.3 + v * .5]; E.ab1 = .4; E.ab2 = .3; }
    if (t >= R1b && t < t0.f2 - .1) {
      // Se para sola y contesta.
      const k = t - R1b; E.z += hop(t, R1b, .34, .22);
      E.m1 = [-1.3, .1]; E.m2 = [1.8, -1.5 + Math.sin(k * 7) * .1]; E.ab2 = .95;
      const cae = smooth(prog(t, t0.falla, t0.falla + .35)); E.m1 = [lerp(-1.3, -1.6, cae), lerp(.1, .8, cae)]; E.m2 = [lerp(1.8, 1.6, cae), lerp(-1.5, .8, cae)];
    }
    if (t >= R2a - .2 && t < tBam + .02) E.carga = 1;
    if (t >= tBam) {
      const a = t - tBam, re = Math.exp(-a * 5) * Math.sin(a * 16) * .3;
      E.y = P[1] - .08 - Math.abs(re); E.sq = .36 * Math.exp(-a * 8) * Math.cos(a * 20); E.rot = -.12 * Math.exp(-a * 3);
      // El brazo sigue queriendo llegar.
      const est = smooth(prog(t, tBam + .3, tBam + .8));
      E.m1 = [-1.8, -.2 + .1 * Math.sin(t * 9)]; E.m2 = [lerp(1.4, 2.5, est) + Math.sin(t * 30) * .02, lerp(-.3, -.7, est)]; E.ab2 = .95;
    }
    rm(0); return E;
  }
  if (t < t0.dos) {
    if (t < t0.buena + .5) { const P = pista(22 + UT); salta(t0.buena - .3, t0.buena + .5, P[0], P[1] - .08, RB, BX, BL, ZM + RB, 1.8); E.m1 = [-2, -1.6]; E.m2 = [2, -1.6]; return E; }
    return enLista(t, cam, E);
  }
  if (t < t0.dos + .34) { const P = pista(.09); salta(t0.dos, t0.dos + .34, BX, DOMO[1] + .85, ZM + RB, P[0], P[1], RB, 1); E.m1 = [-2, -1.6]; E.m2 = [2, -1.6]; rm(0); return E; }
  if (t < R4b + .02) {
    const u = uDe(t), P = pista(u), Q = pista(u + .004);
    E.x = P[0]; E.y = P[1]; E.z = RB; E.piso = 0;
    const q0 = cam.p(P[0], P[1], .5), q1 = cam.p(Q[0], Q[1], .5), dx = q0 && q1 ? Math.sign(q1.x - q0.x) || 1 : 1;
    const v = Math.sin(t * 24), parado = t >= tBam2 && t < R4a;
    E.z += parado ? 0 : Math.abs(Math.sin(t * 15)) * .12; E.rot = parado ? 0 : dx * .18;
    E.m1 = [-1.8 * dx + v * .3, -.2 - v * .5]; E.m2 = [1.2 * dx - v * .3, -.3 + v * .5]; E.ab1 = .4; E.ab2 = .3;
    if (parado) { const a = t - tBam2; E.y -= .08; E.sq = .36 * Math.exp(-a * 8) * Math.cos(a * 20); E.m1 = [-1.8, -.2]; E.m2 = [1.5, -.3]; }
    rm(0); return E;
  }
  // Mareada, de vuelta a la mesa.
  if (t < R4b + .62) { const P = pista(uDe(R4b)); salta(R4b, R4b + .6, P[0], P[1], RB, BX, BY, ZM + RB, 2); E.m1 = [-2, -1.6]; E.m2 = [2, -1.6]; return E; }
  E.rot = .05 * Math.sin(t * 3.4) * (1 - prog(t, R4b + .6, R4b + 1.8));
  const ag = smooth(prog(t, t0.hacer - .55, t0.hacer - .1)) * (1 - smooth(prog(t, t0.ve - .35, t0.ve)));
  const ale = smooth(prog(t, t0.ve, t0.ve + .4)) * (1 - smooth(prog(t, t0.tu2 - .3, t0.tu2)));
  E.m1 = [lerp(-1.7, -1.4, ag), lerp(.5, -2.6, ag)]; E.m2 = [lerp(1.7, 1.4, ag), lerp(.5, -2.6, ag)]; E.ab1 = .85; E.ab2 = .85;
  if (ale > 0) { const sw = Math.sin(t * 7); E.m1 = [lerp(E.m1[0], -2, ale), lerp(E.m1[1], -2 + sw * .15, ale)]; E.m2 = [lerp(E.m2[0], 2, ale), lerp(E.m2[1], -2 - sw * .15, ale)]; E.z += ale * Math.abs(Math.sin(t * 6)) * .05; }
  const quieta = smooth(prog(t, t0.porque, t0.tu2));
  if (quieta > 0) { E.m1 = [lerp(E.m1[0], -1.6, quieta), lerp(E.m1[1], .7, quieta)]; E.m2 = [lerp(E.m2[0], 1.6, quieta), lerp(E.m2[1], .7, quieta)]; }
  const hombros = ease.outBack(prog(t, t0.el - .1, t0.el + .3));
  if (t >= t0.el - .1) {
    const b = Math.sin((t - t0.el) * 3.5) * .02;
    E.m1 = [-2.25, lerp(.7, -.95, hombros) + b]; E.m2 = [2.25, lerp(1.7, -.95, hombros) + b]; E.ab1 = .95; E.ab2 = .95;
    E.sq = -.05 * smooth(prog(t, t0.el, t0.el + .3)) * (1 - smooth(prog(t, t0.fin + .1, t0.fin + .7)));
  }
  // El gorro se resbala solo: el remate.
  const cae = prog(t, t0.fin + .8, t0.fin + 1.5);
  E.gorro = .14 + ease.inOutCubic(cae) * .7;
  return E;
}

function enLista(t: number, cam: Cam, E: Est): Est {
  E.y = BL;
  const a = cam.p(BX, BL, ZM + RB)!;
  const caja = (i: number): [number, number] => { const z0 = zLista(t) + Z0L + i * FILA + FILA; const q = cam.p(LX + 102 * ESC, LY, z0 - 83 * ESC)!; return [q.x, q.y]; };
  const atrae = (b: [number, number], k: number, m: [number, number]): [number, number] => { const r = RB * a.s, x = (b[0] - a.x) / r, y = (b[1] - a.y) / r; return [lerp(m[0], x, k), lerp(m[1], y, k)]; };
  E.m1 = [-1.8, -.2]; E.m2 = [1.8, -.2]; E.ab1 = .6; E.ab2 = .6;
  E.z += hop(t, tCae, .4, .42);
  // ¿Hay mesa? Toca la mesa, de verdad, dos veces.
  const tk = (ti: number) => Math.exp(-Math.max(t - ti, 0) * 9) * (t >= ti ? 1 : 0);
  if (t >= t0.mesa - .2 && t < t0.si2 + .4) {
    const g = tk(t0.mesa + .05) + tk(t0.mesa + .42);
    const P = 1 - smooth(prog(t, t0.si2, t0.si2 + .3));
    E.m1 = [-1.4, lerp(-.2, .9 - g * 1.3, P)]; E.m2 = [1.4, lerp(-.2, .9 - g * 1.3, P)]; E.sq = .06 * g;
  }
  // ¿Invitados? Reparte sobres.
  if (t >= t0.todos - .2 && t < t0.faltan + .3) { const v = Math.sin((t - t0.todos) * 17); E.m1 = [-1.9, -1.1 + v * .6]; E.m2 = [1.9, -1.1 - v * .6]; E.ab1 = .9; E.ab2 = .9; }
  // ¿Pastel? Levanta el domo.
  if (t >= t0.pastel - .4 && t < t0.no2 + .95) {
    const k = smooth(prog(t, t0.pastel - .4, t0.pastel - .22)) * (1 - smooth(prog(t, t0.no2 + .75, t0.no2 + .95)));
    E.m2 = atrae(perilla(cam, t), k, [1.8, -.2]); E.ab2 = .3;
    if (t > t0.no2) { E.m1 = [-1.9, -.9]; E.ab1 = .95; }
  }
  // Intenta palomear sin probar. Dos veces. La segunda la avienta.
  if (t >= t0.cada - .1 && t < tR1) { const k = smooth(prog(t, t0.cada, tR1)); E.m2 = atrae(caja(0), ease.inCubic(k), [1.8, -.4]); E.ab2 = .15; E.x = lerp(0, -.14, k); }
  if (t >= tR1 && t < tR2) {
    const q = t - tR1, zm = Math.exp(-q * 7);
    E.sq = .26 * zm * Math.cos(q * 22); E.y = BL - .5 * Math.sin(Math.min(q, .9) * 3.5) * zm; E.z += hop(t, tR1, .34, .3);
    const va = smooth(prog(t, tR2 - .62, tR2)); E.m2 = atrae(caja(1), va * va, [lerp(2.6, 1.8, clamp(q * 3)), lerp(-1.6, -.4, clamp(q * 3))]); E.ab2 = .15; E.x = lerp(.3, -.1, va);
    E.m1 = [-1.7, -.6];
  }
  if (t >= tR2 && t < t0.eso + .4) {
    const q = t - tR2, K = prog(q, 0, .62), back = 1 - smooth(prog(t, tR2 + .9, t0.eso + .35));
    E.y = lerp(BL, 3.95, ease.outCubic(K) * back); E.x = .3 * Math.sin(K * 3) * back;
    E.z += hop(t, tR2, .62, 1.05) + hop(t, tR2 + .62, .3, .22) + hop(t, tR2 + .9, .42, .5) + hop(t, tR2 + 1.32, .4, .4);
    E.rot = (K < 1 ? K * -6.283 : 0); E.sq = .24 * Math.exp(-Math.max(q - .62, 0) * 7) * (q > .62 ? 1 : 0);
    E.m1 = [-2.2, -1.1]; E.m2 = [2.2, -1.1]; E.ab1 = .95; E.ab2 = .95;
    if (q < .62) E.gorro = .14 + K * 1.2;
    else E.gorro = .14 + 1.06 * Math.exp(-(q - .62) * 5);
  }
  // Ahora sí: se acerca, prueba, y solo entonces la casilla se palomea.
  if (t >= t0.ag2 - .1) {
    E.m1 = [-1.6, .3]; E.m2 = [1.7, -.6]; E.ab2 = .2;
    const tA = t0.despues - .35, cerca = smooth(prog(t, t0.despues - .05, t0.despues + .36));
    E.y = lerp(BL, DOMO[1] + .85, cerca); E.z += hop(t, t0.despues - .05, .42, .4);
    if (t >= tA - .08) { const k = smooth(prog(t, tA - .08, tA + .08)); E.m2 = atrae(perilla(cam, t), k, [1.8, -.2]); E.ab2 = .3; }
    if (t >= tMuerde - .32) {
      const q = cam.p(DOMO[0] + .28, DOMO[1] + .1, ZM + .52)!, va = smooth(prog(t, tMuerde - .32, tMuerde)), vuelve = smooth(prog(t, tMuerde, tMuerde + .22));
      E.m1 = atrae([q.x, q.y], va * (1 - vuelve), [-.5, -.1]); E.ab1 = .3;
    }
    if (t >= tMuerde + .2 && t < tPaloma) E.sq = .1 * Math.sin((t - tMuerde) * 24) * Math.exp(-(t - tMuerde - .2) * 2.2);
    if (t >= tPaloma) { E.z += hop(t, tPaloma, .44, .5) + hop(t, tPaloma + .46, .36, .24); E.m1 = [-2.1, -.7]; E.ab1 = .9; }
  }
  return E;
}

function lapiz(c: C, x: number, y: number, ang: number, L: number) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.fillStyle = "#EFE6CF"; c.strokeStyle = TINTA; c.lineWidth = L * .03; c.beginPath(); c.moveTo(0, 0); c.lineTo(L * .2, -L * .07); c.lineTo(L, -L * .07); c.lineTo(L, L * .07); c.lineTo(L * .2, L * .07); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = TINTA; c.beginPath(); c.moveTo(0, 0); c.lineTo(L * .08, -L * .03); c.lineTo(L * .08, L * .03); c.closePath(); c.fill();
  c.fillStyle = ACENTO; c.fillRect(L * .86, -L * .07, L * .14, L * .14); c.restore();
}

function pintaBola(c: C, cam: Cam, E: Est, t: number, d: D) {
  const p = cam.p(E.x, E.y, E.z); if (!p) return;
  const r = E.r * p.s, q = cam.p(E.x, E.y, E.piso), alt = Math.max(E.z - E.r - E.piso, 0);
  if (q) sombra(c, q.x, q.y + r * .04, r * 1.65, .36 / (1 + alt * 2));
  const sy = 1 - E.sq, sx = 1 + E.sq * .85;
  const h1: [number, number] = E.a1 ?? [E.m1[0] * r, E.m1[1] * r], h2: [number, number] = E.a2 ?? [E.m2[0] * r, E.m2[1] * r];
  c.save(); c.translate(p.x, p.y + r * E.sq * .9); c.rotate(E.rot); c.scale(sx, sy);
  agente(c, 0, 0, r, h1, h2, { abre1: E.ab1, abre2: E.ab2 });
  gorro(c, r, E.gorro);
  if (conFlag(t)) {
    const fl = smooth(prog(t, t0.nunca + .2, t0.nadieF + .1)), k = p.s / 500;
    bandera(c, h2[0], h2[1] + 30 * k, .1 - .16 * fl + Math.sin(t * 9) * .05 * (1 - fl), k, t, d, fl);
  }
  if (E.carga) sobreS(c, h2[0], h2[1], r * 1.5, -.1);
  if (t >= t0.no2 + .9 && t < tR2 + .06) { const an = Math.atan2(h2[1], h2[0]); lapiz(c, h2[0], h2[1], an + 3.14, r * 1.05); }
  if (t >= tMuerde && t < tMuerde + .16) { const w = r * .42; c.fillStyle = "#fff"; c.strokeStyle = TINTA; c.lineWidth = 3; c.lineJoin = "round"; c.beginPath(); c.moveTo(h1[0] - w, h1[1] + w * .5); c.lineTo(h1[0] + w, h1[1] + w * .5); c.lineTo(h1[0] + w * .1, h1[1] - w * .7); c.closePath(); c.fill(); c.stroke(); }
  c.restore();
}

// ---------- pantalla ----------
function globo(c: C, x: number, y: number, w: number, h: number, tx: number, ty: number, txt: string, px: number, k: number, g = 0) {
  if (k <= .01) return;
  c.save(); c.translate(x, y); c.rotate(g); c.scale(k, k); c.fillStyle = "#fff"; c.strokeStyle = TINTA; c.lineWidth = 7; c.lineJoin = "round";
  c.beginPath(); c.moveTo(-w / 2 + 50, -h / 2); c.lineTo(w / 2 - 50, -h / 2); c.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + 50); c.lineTo(w / 2, h / 2 - 50); c.quadraticCurveTo(w / 2, h / 2, w / 2 - 50, h / 2);
  c.lineTo(tx + 44, h / 2); c.lineTo(tx, ty); c.lineTo(tx - 34, h / 2); c.lineTo(-w / 2 + 50, h / 2); c.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - 50); c.lineTo(-w / 2, -h / 2 + 50); c.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + 50, -h / 2); c.closePath(); c.fill(); c.stroke();
  texto(c, txt, 0, px * .3, { fuente: serif(px, true), color: TINTA }); c.restore();
}

function palomaGrande(c: C, t: number, b: { x: number; y: number }) {
  // Un sí de utilería: sale, posa y se cae porque nada lo sostiene.
  if (t < t0.si - .1 || t > tGolpe + 1.2) return;
  const ap = ease.outBack(prog(t, t0.si - .1, t0.si + .12), 2);
  const a = Math.max(t - t0.cuando, 0), g = 3100;
  const ty = a <= .4 ? .5 * g * a * a : .5 * g * .16 + (-420 * (a - .4) + .5 * g * (a - .4) ** 2);
  const x = 540 + (a > .4 ? (a - .4) * -640 : 0) + (a > 0 ? a * -60 : 0), y = 500 + ty;
  c.save(); c.translate(x, y); c.rotate(-.1 + a * (a > .4 ? -7 : 1.1)); c.scale(clamp(ap, 0, 1.3), clamp(ap, 0, 1.3));
  c.lineCap = "round"; c.lineJoin = "round";
  for (const [col, dy, l] of [["#7E2413", 18, 96], [ACENTO, 0, 96]] as [string, number, number][]) { c.strokeStyle = col; c.lineWidth = l; c.beginPath(); c.moveTo(-200, dy + 10); c.lineTo(-60, dy + 150); c.lineTo(240, dy - 180); c.stroke(); }
  c.restore(); void b;
}

function contador(c: C, t: number) {
  const a = smooth(prog(t, t0.veinte - .3, t0.veinte)) * (1 - smooth(prog(t, t0.f3 + .1, t0.f3 + .4)));
  if (a <= 0) return;
  const n = vueltasDe(t), x0 = 104, y0 = 380, w = 158, h = 226;
  texto(c, "vueltas", x0 + w + 8, y0 - 26, { fuente: serif(84, true), color: TINTA, alfa: a });
  const dig = [Math.floor(n / 10), n % 10];
  dig.forEach((v, i) => {
    const x = x0 + i * (w + 16);
    c.save(); c.globalAlpha = a; c.fillStyle = TINTA; c.beginPath(); c.roundRect(x, y0, w, h, 18); c.fill();
    texto(c, String(v), x + w / 2, y0 + h * .78, { fuente: mono(178), color: n >= 20 ? "#E9896C" : LUZ, alfa: a });
    c.fillStyle = "#3a3a38"; c.fillRect(x, y0 + h / 2 - 2, w, 4); c.restore();
  });
  const ad = a * smooth(prog(t, t0.dinero - .1, t0.dinero + .1)); if (ad <= 0) return;
  const kd = prog(t, t0.dinero, tBam), X = 446, Y = y0 + h, N = 11, quedan = Math.round(lerp(N, 3, kd));
  texto(c, "dinero", X + 70, y0 - 26, { fuente: serif(84, true), color: TINTA, alfa: ad });
  c.save(); c.globalAlpha = ad;
  for (let i = 0; i < quedan; i++) { const y = Y - 14 - i * 19; c.fillStyle = ACENTO; c.strokeStyle = "#7E2413"; c.lineWidth = 3; c.beginPath(); c.ellipse(X + 70, y, 70, 17, 0, 0, 6.3); c.fill(); c.stroke(); }
  c.strokeStyle = TINTA; c.lineWidth = 5; c.setLineDash([12, 12]); c.beginPath(); c.moveTo(X - 14, Y - 66); c.lineTo(X + 154, Y - 66); c.stroke(); c.restore();
}

function tarjeta(c: C, t: number) {
  const a0 = t0.hacer - .75;
  if (t < a0 || t > t0.ve) return;
  const k = 1 - (1 - prog(t, a0, a0 + .75)) ** 3, y = lerp(-180, 455, k) + Math.sin(t * 3) * 6, sale = smooth(prog(t, t0.ve - .42, t0.ve - .08));
  c.save(); c.translate(540, y - sale * 760); c.rotate(.05 * Math.sin((1 - k) * 8) - .02);
  c.fillStyle = "rgba(20,18,14,.16)"; c.fillRect(-300, -112, 620, 246);
  c.fillStyle = "#fff"; c.strokeStyle = TINTA; c.lineWidth = 5; c.fillRect(-310, -124, 620, 240); c.strokeRect(-310, -124, 620, 240);
  texto(c, "qué hacer", 0, 34, { fuente: serif(128, true), color: TINTA }); c.restore();
}

// Fiesta punteada: cómo se vería terminada. Es un plano, no algo que exista todavía.
function fantasmas(c: C, cam: Cam, t: number) {
  if (t < t0.ve - .1 || t > t0.sabesF + .3) return;
  const ap = (i: number) => smooth(prog(t, t0.ve + i * .075, t0.ve + .22 + i * .075)) * (1 - smooth(prog(t, t0.tu2 - .1 + (12 - i) * .05, t0.tu2 + .14 + (12 - i) * .05)));
  c.save(); c.strokeStyle = ACENTO; c.fillStyle = ACENTO; c.lineCap = "round"; c.lineDashOffset = -t * 42;
  const orden = [...SILLAS].sort((a, b) => b.y - a.y);
  orden.forEach((S, i) => {
    const a = ap(i); if (a <= 0) return;
    const p = cam.p(S.x - S.l * .02, S.y, .5 + .52); if (!p) return;
    const r = .44 * p.s;
    c.globalAlpha = a; c.lineWidth = clamp(.05 * p.s, 2.5, 7); c.setLineDash([r * .2, r * .17]);
    c.fillStyle = "rgba(246,243,236,.9)"; c.beginPath(); c.arc(p.x, p.y, r, 0, 6.3); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(p.x - r * .62, p.y - r * .74); c.lineTo(p.x, p.y - r * 1.95); c.lineTo(p.x + r * .62, p.y - r * .74); c.closePath(); c.fill(); c.stroke();
  });
  // Tu mamá, en la cabecera: la razón de la fiesta.
  const am = ap(6), m = cam.p(0, -.7, 1.32);
  if (am > 0 && m) {
    const r = .58 * m.s; c.globalAlpha = am; c.lineWidth = 6; c.setLineDash([r * .17, r * .14]); c.fillStyle = "rgba(246,243,236,.92)";
    c.beginPath(); c.arc(m.x, m.y, r, 0, 6.3); c.fill(); c.stroke();
    const hx = m.x, hy = m.y + r * .02, H = r * .42; c.setLineDash([]); c.fillStyle = ACENTO;
    c.beginPath(); c.moveTo(hx, hy + H * .9); c.bezierCurveTo(hx - H * 1.5, hy - H * .2, hx - H * .7, hy - H * 1.1, hx, hy - H * .36); c.bezierCurveTo(hx + H * .7, hy - H * 1.1, hx + H * 1.5, hy - H * .2, hx, hy + H * .9); c.fill();
  }
  const a = ap(12), q = cam.p(0, 3.7, ZM); c.fillStyle = "rgba(246,243,236,.9)";
  if (a > 0 && q) {
    const S = q.s; c.globalAlpha = a; c.lineWidth = clamp(.03 * S, 3, 7); c.setLineDash([12, 10]);
    c.beginPath(); c.roundRect(q.x - .62 * S, q.y - .36 * S, 1.24 * S, .36 * S, 10); c.fill(); c.stroke();
    c.beginPath(); c.roundRect(q.x - .4 * S, q.y - .62 * S, .8 * S, .26 * S, 8); c.fill(); c.stroke();
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(q.x + i * .15 * S, q.y - .62 * S); c.lineTo(q.x + i * .15 * S, q.y - .84 * S); c.stroke(); }
  }
  c.restore();
}

function tambor(c: C, t: number) {
  c.fillStyle = NOCHE; c.fillRect(0, 0, 1080, 1920);
  const F = ["falta poco", "voy a revisar", "todo salió bien", "ya terminé", "no hay errores", "quedó perfecto", "ya casi", "todo en orden"];
  const a = t0.otra - .05, b = t0.creible + .28, K = prog(t, a, b);
  // Antes de arrancar ya gira, casi a oscuras; al final sigue girando, despacio: el modelo no se detiene a pensarlo.
  const o = t < a ? 24 + (a - t) * .9 : t < b ? (1 - ease.outCubic(K)) * 24 : -(t - b) * .62;
  const otros = lerp(.11, 1, smooth(prog(t, t0.otra - .05, t0.otra + .22)));
  const rojo = 1 - smooth(prog(t, t0.frase + .1, t0.creible + .12)), CY = 780, RR = 560;
  const antes = t < a;
  // "ya terminé" llega ocupando todo y se encoge hasta medir lo mismo que las demás.
  const z = lerp(1.62, 1, ease.inOutCubic(prog(t, t0.decir + .2, t0.otra + .35))) * (1 + Math.exp(-(t - t0.decir) * 8) * .1);
  const fr = o - Math.floor(o);
  for (let r = -5; r <= 5; r++) {
    const th = (r + fr) * .36, cs = Math.cos(th); if (Math.abs(th) > 1.5) continue;
    const idx = ((3 + r - Math.floor(o)) % 8 + 800) % 8, y = CY + Math.sin(th) * RR, esa = F[idx] === "ya terminé";
    if (antes && (Math.abs(th) < .34 || esa)) continue;      // detrás de la frase grande no pasa nada
    const centro = !antes && Math.abs(r + fr) < .5 && t < b;
    const al = (centro ? 1 : otros) * cs * cs;
    c.save(); c.translate(540, y); c.scale(centro ? z : 1, cs * (centro ? z : 1));
    const col = esa && rojo > 0 ? `rgb(${Math.round(lerp(237, 192, rojo))},${Math.round(lerp(234, 68, rojo))},${Math.round(lerp(227, 42, rojo))})` : LUZ;
    texto(c, F[idx], 0, 44, { fuente: serif(132, true), color: col, alfa: al }); c.restore();
  }
  if (antes) { c.save(); c.translate(540 + tiembla(3) * 3, CY + tiembla(9) * 3); c.scale(z, z); texto(c, "ya terminé", 0, 44, { fuente: serif(132, true), color: ACENTO }); c.restore(); }
  const gr = azar(FR + 5); c.fillStyle = "rgba(237,234,227,.09)";
  for (let i = 0; i < 40; i++) c.fillRect(gr() * 1080, gr() * 1920, 3, 3);
  rotulo(c, t, t0.creible - .04, t0.entonces, "creíble", 1520, 176, "#E9896C", true);
}

// ---------- cámara ----------
const CERCA: Vista = { tx: 0, ty: BY, tz: 1.76, yaw: 0, pitch: .05, dist: 3.2 };
const SALA: Vista = { tx: 0, ty: 4.5, tz: .05, yaw: 0, pitch: .4, dist: 10 };
const LARGA: Vista = { tx: 0, ty: 8.24, tz: 1.85, yaw: 0, pitch: .11, dist: 5.6 };
const FLAG: Vista = { tx: FP[0] - .72, ty: FP[1], tz: ZM + 1.72, yaw: 0, pitch: .02, dist: 1.02 };
const MEDIO: Vista = { tx: 0, ty: BY, tz: 1.5, yaw: 0, pitch: .16, dist: 5.2 };
const ARRIBA: Vista = { tx: 0, ty: 4, tz: 0, yaw: 0, pitch: 1.32, dist: 15 };
const LADO: Vista = { tx: 3.2, ty: 5.72, tz: 2.15, yaw: Math.PI / 2, pitch: .1, dist: 6.3 };
const FRENTE: Vista = { tx: 0, ty: 7.3, tz: 2.9, yaw: 0, pitch: .15, dist: 6.5 };
const TORRE: Vista = { tx: 0, ty: LY, tz: 5.9, yaw: 0, pitch: -.54, dist: 8.5 };
const ULT: Vista = { tx: 0, ty: 4.6, tz: .35, yaw: 0, pitch: .44, dist: 8.5 };
const CLAVES: { t: number; v: Vista; dur?: number; curva?: (x: number) => number }[] = [
  // Nada de cámara fija: el primer plano orbita despacio, para que el fondo se mueva de verdad.
  { t: 0, v: CERCA }, { t: .1, v: { ...CERCA, dist: 2.86, yaw: .055, tx: .06 }, dur: t0.tu - .2, curva: ease.inOutSine }, { t: t0.tu, v: { ...CERCA, dist: 3.05, yaw: -.07, tx: -.12 }, dur: t0.nunca - .3 - t0.tu, curva: ease.inOutSine },
  { t: t0.nunca - .28, v: SALA, dur: t0.nadieF - t0.nunca + .55, curva: ease.inOutCubic },
  { t: t0.anth - .25, v: LARGA, dur: 2.1, curva: ease.inOutCubic }, { t: t0.logica - .05, v: FLAG, dur: t0.decir - t0.logica + .05, curva: ease.inCubic },
  { t: t0.entonces - .02, v: MEDIO, dur: .02 }, { t: t0.hay - .05, v: ARRIBA, dur: 1.15 }, { t: t0.nada, v: { ...ARRIBA, yaw: .2, dist: 13.4 }, dur: t0.f2 - t0.nada - .1, curva: (x) => x },
  { t: t0.f2 - .2, v: LADO, dur: 1.15 }, { t: t0.buena - .35, v: FRENTE, dur: 1.15 },
  // En la lista la cámara va a lo que se está comprobando, sin perder las casillas.
  { t: t0.mesa - .5, v: { ...FRENTE, yaw: .035, tx: -.15, dist: 6.3 }, dur: 1.4, curva: ease.inOutSine }, { t: t0.todos - .2, v: { ...FRENTE, yaw: -.05, tx: .15, dist: 6.95 }, dur: 1.5, curva: ease.inOutSine },
  { t: t0.pastel - .4, v: { ...FRENTE, tz: 2.55, dist: 6.15, yaw: .02 }, dur: 1.2, curva: ease.inOutSine }, { t: t0.cada - .2, v: { ...FRENTE, tz: 3.1, dist: 5.75, ty: 7.5 }, dur: 1.3, curva: ease.inOutSine },
  { t: tR2 + .75, v: FRENTE, dur: 1.1, curva: ease.inOutSine },
  { t: t0.lista2 - .05, v: TORRE, dur: 1.5 }, { t: t0.ag2 - .12, v: FRENTE, dur: .8, curva: ease.outCubic }, { t: t0.despues - .4, v: { ...FRENTE, tz: 2.55, dist: 5.8, ty: 7 }, dur: 1.2, curva: ease.inOutSine },
  { t: t0.sin + .2, v: LADO, dur: 1.1 }, { t: t0.o - .05, v: { ...ARRIBA, yaw: .7 }, dur: 1.25 }, { t: t0.gasta, v: { ...ARRIBA, yaw: 1.5, dist: 12.5 }, dur: t0.por - t0.gasta, curva: (x) => x },
  { t: t0.por, v: ULT, dur: 1.3 }, { t: t0.tu2 - .1, v: CERCA, dur: t0.el - t0.tu2 + .4, curva: ease.inOutCubic },
];

const GOLPES: [number, number][] = [[tGolpe, 1], [tBam, 2.2], [tCae, 1.8], [tR1, .7], [tR2, 1.2], [tBam2, 1.8], [t0.vict, .9], [t0.organ + .1, .5], [t0.resto + .1, .35]];
function sacude(t: number): [number, number] {
  let x = 0, y = 0;
  for (const [g, a] of GOLPES) { const q = t - g; if (q >= 0 && q < .7) { const k = a * 16 * Math.exp(-q * 9); x += k * Math.sin(q * 67); y += k * Math.cos(q * 53); } }
  return [x, y];
}

function dibuja(c: C, t: number, d: D) {
  FR = Math.floor(t * 10);
  if (t >= t0.decir && t < t0.entonces) { tambor(c, t); return; }
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  const [sx, sy] = sacude(t);
  const z = 1.022 + .012 * Math.sin(t * .83);
  c.save(); c.translate(540 + 8 * Math.sin(t * .71) + sx, 960 + 9 * Math.cos(t * .61) + sy); c.rotate(.004 * Math.sin(t * .47)); c.scale(z, z); c.translate(-540, -960);
  c.fillStyle = PAPEL; c.fillRect(-80, -80, 1240, 2080);

  const v = guionCamara(t, CLAVES);
  const cam = camara({ ...v, yaw: v.yaw + .011 * Math.sin(t * .37), pitch: v.pitch + .006 * Math.sin(t * .53 + 1), tx: v.tx + .05 * Math.sin(t * .29) }, 540, 960, 1250);
  const E = estado(t, cam);

  suelo(c, cam);
  pistaDibujo(c, cam, t);
  picado(c, cam, t);
  lista(c, cam, t);

  const L = t >= t0.largos - .15 && t < t0.decir ? lerp(ML, 72, ease.inOutCubic(prog(t, t0.largos - .15, t0.largosF + .55))) : ML;
  const cx = cam.pos[0], detras = E.z < ZM && ((Math.abs(cx) > 1.2 && Math.sign(cx) !== Math.sign(E.x)) || (Math.abs(cx) <= 1.2 && E.y > ML));
  const lejos = [...LEJOS].filter((S) => S.y < L - .5).sort((a, b) => b.y - a.y);
  const sillasOrd = [...SILLAS].sort((a, b) => { const A = cam.p(a.x, a.y, .5), B = cam.p(b.x, b.y, .5); return (B ? B.zc : 0) - (A ? A.zc : 0); });
  const de = (S: typeof SILLAS[number]) => { silla(c, cam, S.x, S.y, S.l, 1); if (verSobre(t, S.i)) sobreSilla(c, cam, t, S); };
  if (detras) pintaBola(c, cam, E, t, d);
  if (Math.abs(cx) > 1.2) sillasOrd.filter((S) => Math.sign(S.x) !== Math.sign(cx)).forEach(de);
  mesa(c, cam, L);
  for (const S of lejos) { const k = clamp((L - S.y) / 2.2); silla(c, cam, S.x, S.y, S.l, ease.outBack(k)); }
  for (let i = 0; i < 6; i++) for (const l of [-1, 1]) plato(c, cam, l * .62, YF(i));
  (Math.abs(cx) > 1.2 ? sillasOrd.filter((S) => Math.sign(S.x) === Math.sign(cx)) : sillasOrd).forEach(de);

  faltantes(c, cam, t);
  domo(c, cam, t);
  buzon(c, cam, t);
  tope(c, cam, t);
  if (t >= tBam && t < tBam + .8) polvo(c, cam, t, tBam, 3.2, TOPY, .06, 26);
  if (t >= tBam2 && t < tBam2 + .8) polvo(c, cam, t, tBam2, 3.2, TOPY, .06, 26);
  if (t >= tCae && t < tCae + .8) polvo(c, cam, t, tCae, 0, LY, 1, 22, 2.2);

  estela(c, cam, t);
  if (!detras) pintaBola(c, cam, E, t, d);
  if (t >= tBam && t < t0.buena) sobreCaido(c, cam, t, tBam);
  if (!conFlag(t) && (t < t0.hay || t >= t0.por + 1.1)) {
    const q = cam.p(FP[0], FP[1], FP[2]);
    if (q) { const tem = t < t0.vict + .4 ? Math.exp(-(t - t0.vict) * 9) * Math.sin((t - t0.vict) * 44) * .05 : 0; const fl = t >= t0.por ? 1 : smooth(prog(t, t0.logica - 2, t0.logica - 1.6)) * .0; bandera(c, q.x, q.y - 360 * q.s / 500, .05 + tem + Math.sin(t * 1.3) * .012 * (1 - fl), q.s / 500, t, d, fl); }
  }
  if (t < t0.hay + .3 || t >= t0.por) confeti(c, cam, t);
  if ((t >= t0.resto - .3 && t < t0.hay + .4) || t >= t0.por + 1.2) reservado(c, cam, t);
  if (t >= t0.dando && t < t0.el + 1) monedas(c, cam, t);
  fantasmas(c, cam, t);

  // ---------- capa de pantalla ----------
  const bp = cam.p(E.x, E.y, E.z);
  palomaGrande(c, t, bp ?? { x: 540, y: 960 });
  if (bp) {
    const k1 = ease.outBack(prog(t, t0.listo - .08, t0.listo + .18)) * (1 - smooth(prog(t, t0.nunca - .05, t0.nunca + .2)));
    globo(c, 262, 800, 410, 214, 120, 176, "listo.", 150, clamp(k1, 0, 1.2), -.03);
    const k2 = ease.outBack(prog(t, t0.contesta - .06, t0.contesta + .2)), cae = prog(t, t0.falla + .1, t0.falla + .62);
    if (t < t0.f2 - .1) globo(c, clamp(bp.x + 20, 300, 780), bp.y - 300 + 1900 * cae * cae, 440, 220, -40, 170, "listo.", 150, clamp(k2, 0, 1.2), cae * .9);
  }
  textos(c, t);
  contador(c, t);
  tarjeta(c, t);
  c.restore();
}

/** A esa velocidad un cuadro no alcanza: la bola deja un rastro que se apaga. */
function estela(c: C, cam: Cam, t: number) {
  const corre = (t > R2a + .4 && t < tBam) || (t > t0.dando - .3 && t < t0.por + .2); if (!corre) return;
  const r = .5, u0 = uDe(t);
  for (let i = 7; i >= 1; i--) {
    const ti = t - i / 170, u = uDe(ti); if (Math.abs(u0 - u) < .002) continue;
    const [x, y] = pista(u), q = cam.p(x, y, r); if (!q) continue;
    c.fillStyle = `rgba(17,17,17,${.2 * (1 - i / 8)})`; c.beginPath(); c.arc(q.x, q.y, r * q.s * (.95 - i * .05), 0, 6.3); c.fill();
  }
}
function verSobre(t: number, i: number) {
  if (SIN_SOBRE.includes(i)) return false;
  return t >= t0.todos - .05 && t < t0.sin + .8;
}
function sobreSilla(c: C, cam: Cam, t: number, S: typeof SILLAS[number]) {
  const llega = t0.todos + S.i * .095, q = cam.p(S.x, S.y, .95), b = cam.p(BX, BY, ZM + RB);
  if (!q || !b) return;
  const k = ease.outCubic(prog(t, llega, llega + .26));
  if (t < llega) return;
  sobreS(c, lerp(b.x, q.x, k), lerp(b.y, q.y, k) - Math.sin(k * 3.14) * 80, .62 * q.s, .08);
}
function faltantes(c: C, cam: Cam, t: number) {
  const a = smooth(prog(t, t0.faltan - .05, t0.faltan + .12)) * (1 - smooth(prog(t, t0.lista2 - .2, t0.lista2)));
  if (a <= 0) return;
  for (const i of SIN_SOBRE) {
    const S = SILLAS[i], q = cam.p(S.x, S.y, .85); if (!q) continue;
    const r = q.s * (.5 + .04 * Math.sin(t * 7));
    c.strokeStyle = ACENTO; c.lineWidth = 7; c.globalAlpha = a; c.beginPath(); c.arc(q.x, q.y, r, 0, 6.3); c.stroke(); c.globalAlpha = 1;
  }
}
function reservado(c: C, cam: Cam, t: number) {
  const k = ease.inCubic(prog(t, t0.resto - .3, t0.resto));
  const y = 6.05, z = ZM + (1 - k) * 2.5 + (t >= t0.resto && t < t0.resto + .35 ? Math.abs(Math.sin((t - t0.resto) * 11)) * .05 * Math.exp(-(t - t0.resto) * 8) : 0);
  plano(c, cam, [-.62, y, z + .44], [.00207, 0, 0], [0, .0006, -.00207], () => {
    c.fillStyle = "rgba(20,18,14,.15)"; c.fillRect(10, 200, 600, 20);
    c.fillStyle = "#fff"; c.strokeStyle = TINTA; c.lineWidth = 7; c.fillRect(0, 0, 600, 208); c.strokeRect(0, 0, 600, 208);
    texto(c, "RESERVADO", 300, 132, { fuente: mono(92), color: TINTA });
  });
}
function sobreCaido(c: C, cam: Cam, t: number, tb: number) {
  const a = t - tb, y0 = TOPY - .1, z0 = .7;
  const z = Math.max(.1, z0 + 2.6 * a - 6.5 * a * a), q = cam.p(PA + .35, y0 - Math.min(a, .6) * .25, z); if (!q) return;
  sobreS(c, q.x, q.y, .62 * q.s, z <= .08 ? .05 : a * 8);
}
function pistaDibujo(c: C, cam: Cam, t: number) {
  const ver = smooth(prog(t, t0.hay + .1, t0.hay + .6)) * (1 - smooth(prog(t, t0.buena - .2, t0.buena + .1))) + smooth(prog(t, t0.dos, t0.dos + .3)) * (1 - smooth(prog(t, t0.por + .4, t0.por + 1)));
  if (ver <= 0) return;
  const hue = t < t0.buena ? clamp(uDe(t) / 22) : clamp((t - t0.o) / 5);
  c.save(); c.globalAlpha = ver; c.strokeStyle = TINTA; c.lineWidth = lerp(3, 12, hue); c.lineCap = "round"; c.setLineDash([3, lerp(18, 8, hue)]); c.lineDashOffset = -t * 30;
  c.beginPath();
  for (let i = 0; i <= 96; i++) { const [x, y] = pista(i / 96), q = cam.p(x, y, .01); if (q) { if (i === 0) c.moveTo(q.x, q.y); else c.lineTo(q.x, q.y); } }
  c.closePath(); c.stroke(); c.restore();
}

function textos(c: C, t: number) {
  const ba = smooth(prog(t, t0.gasta - .2, t0.gasta)) * (1 - smooth(prog(t, t0.por, t0.por + .4)));
  if (ba > 0) {
    const g = c.createLinearGradient(0, 300, 0, 430); g.addColorStop(0, `rgba(244,242,236,${ba})`); g.addColorStop(1, "rgba(244,242,236,0)");
    c.fillStyle = g; c.fillRect(-80, 300, 1240, 130); c.fillStyle = `rgba(244,242,236,${ba})`; c.fillRect(-80, -80, 1240, 380);
  }
  rotulo2(c, t, t0.nadie - .02, t0.anth - .3, "a nadie", 540, 1510, 190, ACENTO, true);
  rotulo2(c, t, t0.anth, t0.largos - .24, "Anthropic", 540, 440, 140);
  rotulo2(c, t, t0.largos, t0.vict - .26, "proyectos largos", 540, 440, 130, TINTA, true);
  rotulo2(c, t, t0.vict - .02, t0.antes - .24, "victoria", 540, 440, 150, TINTA, true);
  rotulo2(c, t, t0.antes, t0.logica - .1, "antes de tiempo", 540, 440, 130, ACENTO, true);
  rotulo2(c, t, t0.como - .05, t0.hay - .24, "¿cómo sabe que acabó?", 540, 330, 112, TINTA, true);
  rotulo2(c, t, t0.hay, t0.f1 + .1, "tres formas", 540, 250, 140);
  rotulo2(c, t, t0.f1, t0.falla + .6, "1", 150, 262, 200, TINTA, true);
  rotulo2(c, t, t0.modelo, t0.normal - .24, "el modelo decide", 620, 222, 96, TINTA, true);
  rotulo2(c, t, t0.normal, t0.falla - .24, "la normal", 620, 226, 118);
  rotulo2(c, t, t0.falla, t0.f2 - .1, "y la que falla", 620, 226, 118, ACENTO, true);
  rotulo2(c, t, t0.f2 + .1, t0.f3, "2", 150, 262, 170, TINTA, true);
  rotulo2(c, t, t0.limite, t0.f3, "un límite", 240, 262, 120, TINTA, true, "left");
  rotulo2(c, t, t0.aunque, t0.f3 + .3, "aunque no haya terminado", 540, 1530, 88, ACENTO, true);
  rotulo2(c, t, t0.f3 + .3, tCae - .1, "3", 300, 300, 200, ACENTO, true);
  rotulo2(c, t, t0.buena, tCae - .1, "la buena", 610, 290, 130, TINTA, true);
  rotulo2(c, t, t0.marca - .1, t0.eso - .25, "comprobar", 540, 210, 118, ACENTO, true);
  rotulo2(c, t, t0.eso, t0.lista2 - .05, "Anthropic", 540, 200, 112);
  rotulo2(c, t, t0.dos, t0.que - .24, "dos peligros", 540, 300, 130, TINTA, true);
    rotulo2(c, t, t0.que, t0.o - .1, "antes de tiempo", 104, 300, 100, ACENTO, true, "left");
  rotulo2(c, t, t0.gasta, t0.parar - .24, "gastando dinero", 540, 300, 118, TINTA, true);
  rotulo2(c, t, t0.parar, t0.por + .4, "sin parar", 540, 300, 170, ACENTO, true);
  rotulo2(c, t, t0.ve, t0.tu2 - .3, "cómo se ve terminado", 540, 320, 112, ACENTO, true);
  rotulo2(c, t, t0.tu2 - .06, t0.el - .24, "si tú no lo sabes", 540, 300, 118, TINTA, true);
  rotulo2(c, t, t0.el - .02, 99, "él tampoco.", 540, 320, 176, ACENTO, true);
  // El sello: lo único que está escrito a lo ancho de la torre.
  const k = ease.outBack(prog(t, t0.sinT - .04, t0.sinT + .12), 2) * (1 - smooth(prog(t, t0.ag2 - .2, t0.ag2)));
  if (k > 0) {
    c.save(); c.translate(540, 760); c.rotate(-.06); const z = lerp(1.8, 1, clamp(k)); c.scale(z, z); c.globalAlpha = clamp(k * 2);
    c.fillStyle = "#fff"; c.strokeStyle = ACENTO; c.lineWidth = 10; c.beginPath(); c.roundRect(-400, -96, 800, 180, 14); c.fill(); c.stroke();
    texto(c, "SIN TERMINAR", 0, 34, { fuente: mono(92), color: ACENTO }); c.restore();
  }
}

function preparar(): D {
  const cv = document.createElement("canvas"); cv.width = 1120; cv.height = 440;
  const g = cv.getContext("2d")!;
  g.fillStyle = ACENTO; g.fillRect(0, 0, 1120, 440);
  g.fillStyle = PAPEL; g.font = serif(212, true); g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("¡ya terminé!", 560, 214);
  return { tela: cv };
}

export const Pieza: React.FC = () => <Lienzo dibuja={dibuja} preparar={preparar} />;
