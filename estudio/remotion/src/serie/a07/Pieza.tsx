// Serie 2, capítulo 7. Un solo mundo: una mesa larga y encima una montaña de tarjetas. La bola intenta cargarla
// entera y queda enterrada, con las dos manos asomando; ese aplastón se rebobina y luego ocurre de verdad.
// Una regla escolar marca la montaña, la parte en seis rebanadas y cada rebanada se comprime en una tarjeta
// colgada de la guirnalda de la fiesta: el plan. Cuando el restaurante baja la cortina, la tarjeta del sábado
// se descuelga por una esquina y cae; las demás se reacomodan solas. El pendiente enorme se le pasa a una bola
// idéntica en otra mesa, que deja allá su desorden y regresa con una sola tarjeta. El final repite el primer
// cuadro: la misma lluvia de papel, pero ahora la bola levanta la mano y toma una.
import React from "react";
import { azar, Cam, camara, clamp, ease, guionCamara, lerp, prog, smooth, texto, Vista } from "../../kit";
import { ACENTO, bola, cue, GRIS, Lienzo, mono, PAPEL, rotulo, serif, sombra, TINTA } from "../../marca";
import { agente, brazo } from "../../personaje";
import palabras from "./palabras.json";
import duracion from "./duracion.json";

export const DURACION = duracion.dur;
type C = CanvasRenderingContext2D;
type V3 = [number, number, number];
const T = cue(palabras);
const s = (f: string) => T(f).s, e = (f: string) => T(f).e;

const t0 = {
  golpe: s("golpe"), agente: s("tu agente"), arru: s("arruinar"),
  org: s("organiza"), fiesta: s("la fiesta"), lug: s("lugar"), inv: s("invitados"), pas: s("pastel"), mus: s("música"), sor: s("sorpresa"),
  emp: s("empieza"), vez: s("a la vez"), mitad: s("a la mitad del trabajo su"), llena: s("su mesa ya"), llenaW: s("está llena"), deja: s("te deja"), med: s("a medias"),
  anth: s("anthropic"), intent: s("intentaba"), dem: s("demasiado"), quedaba: s("se quedaba"), sinE: s("sin espacio"), esp: s("espacio"),
  sol: s("solución"), ens: s("enseñaron"), est: s("estudiar"), part: s("partir"), prob: s("problema"),
  antes: s("antes de"), escr: s("escribe un"), lista: s("una lista"), pend: s("pendientes"),
  uno: s("uno lugar"), lugar: s("lugar dos"), dos: s("dos fecha"), fecha: s("fecha tres"), tres: s("tres invitados"), inv2: s("invitados y hace"), hace: s("hace uno"),
  pero: s("pero el plan"), noes: s("no es un mapa"), mapa: s("mapa es"), es: s("es una hipótesis"), hipo: s("hipótesis"),
  llama: s("llama al"), restW: s("restaurante el"), sab: s("el sábado"), cerr: s("cerrado"), cambia: s("cambia la fecha"), fecha2: s("fecha y eso"), camb2: s("cambia a los"), inv3: s("invitados un"),
  buen: s("buen agente"), rees: s("reescribe"), cada: s("cada vuelta"), vuelta: s("vuelta y"), hay: s("hay un truco"), truco: s("truco"), si: s("si el pendiente"), pend2: s("pendiente es"), enorme: s("enorme"),
  pasa: s("se lo pasa"), ayud: s("ayudante"), propia: s("su propia"), limpia: s("limpia"), regresa: s("regresa"), solo: s("solo con"), res: s("resultado"),
  asi: s("así la"), desp: s("despejada"), planear: s("planear"), adiv: s("adivinar"), fut: s("futuro"), saber: s("es saber"), sigue: s("sigue cuando"), todo2: s("todo cambia"),
};
const FIN = e("todo cambia");
const CUANDO = t0.todo2 - .3;                         // Whisper estira "cuando": la voz entra aquí

// Instantes de impacto: partitura.py repite estas mismas cuentas.
const HOOK = [.1, .6, 1.1], tG = t0.golpe + .06, tSlam = tG + .13, tAlud = t0.arru + .1, tRew0 = 3.6, tRew1 = 4.3;
const ST = [t0.lug + .62, t0.inv + .62, t0.pas + .62, t0.mus + .62, t0.sor + .62];
const tSlam2 = t0.esp - .02;
// La montaña se parte en el silencio de antes de «partir»: el crujido no debe comerse la palabra.
const PARTE = t0.part - .26;
const tM = [0, 1, 2, 3, 4].map((i) => t0.ens + .02 + i * .32);
const tV = (k: number) => t0.lista + k * .16;
const tToma = t0.hace, tPosa = tToma + .72, tPaloma = tPosa + .5, tAvanza = tToma + .26, tSale = tPaloma + .5, tRest = tSale + .24;
const tCierra = t0.cerr + .06, tCae0 = e("cerrado") + .2, tCae1 = tCae0 + .52, tMesaCae = tCae1 + .7;
const tReac = tCae1 + .24, tDom = t0.fecha2 + .08, tFlip = t0.camb2 + .14;
const tOrb0 = t0.buen - .1, tOrb1 = t0.vuelta + .36, VUELTAS = 3;
const tHin = t0.pend2 + .05, tSube = t0.enorme - .2, tPasa = t0.pasa + .1, tLlega = tPasa + 1.2, tHel = t0.ayud - .12, tObra = t0.limpia + .5, tSalta = t0.regresa - .16, tAterriza = tSalta + 1.15, tEntrega = t0.res + .12, tFuera = t0.asi - .3;
const tArchiva = t0.desp + .62;
const tRompe = t0.fut + .3;
const tL0 = t0.saber - .34, tAtrapa = t0.sigue - .02, tDeja = FIN + .08, tSello = tDeja + .3;

// ---------- el mundo ----------
const TX = 4.2, TY = 1.7, PISO = -3.1, RB = .7, XH = 13;
const XC = .62, Z0 = 7.35, DZ = 1.3, ZR = 8.55, WP = 5.1, HP = 1.16, ESC = 127, YP = .55;
const HM = 7, RX = 3.6, RY = 1.25;
const SLOT = (k: number): V3 => [XC, YP, Z0 - k * DZ];

const rnd = (i: number) => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x); };
const sum3 = (a: V3, b: V3, k: number): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];

function ejes(ry: number, rx: number, rz: number): [V3, V3] {
  const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx), cz = Math.cos(rz), sz = Math.sin(rz);
  const e1: V3 = [cy, sy, 0], e2: V3 = [-sy * sx, cy * sx, cx];
  return [[e1[0] * cz + e2[0] * sz, e1[1] * cz + e2[1] * sz, e1[2] * cz + e2[2] * sz], [-e1[0] * sz + e2[0] * cz, -e1[1] * sz + e2[1] * cz, -e1[2] * sz + e2[2] * cz]];
}

// ---------- la montaña: tarjetas sueltas, una por una ----------
type Hoja = { x: number; y: number; z: number; rx: number; ry: number; rz: number; w: number; h: number; u: number; reb: number; sem: number; rojo: boolean; lin: number; gris: number };
const reb = (x: number) => clamp(Math.floor((x + RX * 1.15) / (2 * RX * 1.15) * 6), 0, 5);
const MONTE: Hoja[] = (() => {
  const r = azar(71), out: Hoja[] = [];
  for (let i = 0; i < 460; i++) {
    const u = 1 - Math.sqrt(1 - r() * .985), a = Math.PI * (1 + r()), hueco = i % 5 === 0;
    const R = Math.pow(1 - u, .86) * (1 + .1 * Math.sin(u * 17 + a * 3));
    const fr = hueco ? .25 + r() * .5 : .84 + r() * .2;
    const x = Math.cos(a) * RX * R * fr, y = Math.sin(a) * RY * R * fr * (i % 7 === 0 ? -1 : 1), w = .86 + r() * .72;
    out.push({ x, y, z: u * HM, rx: .35 + r() * .85, ry: -Math.cos(a) * .7 + (r() - .5) * .5, rz: r() * 6.28, w, h: w * (.6 + r() * .14), u: u * .94, reb: reb(x), sem: r(), rojo: r() < .07, lin: 1 + Math.floor(r() * 3), gris: hueco ? .35 + r() * .35 : r() * .3 });
  }
  return out;
})();
const CHARCO: Hoja[] = (() => {
  const r = azar(23), out: Hoja[] = [];
  for (let i = 0; i < 190; i++) {
    const x = (r() * 2 - 1) * (TX - .35), y = (r() * 2 - 1) * (TY - .3), w = 1 + r() * .6;
    out.push({ x, y, z: .02 + i * .0016, rx: Math.PI / 2 + (r() - .5) * .08, ry: 0, rz: r() * 6.28, w, h: w * .66, u: r(), reb: reb(x), sem: r(), rojo: r() < .06, lin: 1 + Math.floor(r() * 3), gris: r() * .2 });
  }
  return out;
})();

function estado(t: number) {
  let n = 0;
  if (t < tRew1) {
    n = .36 + .15 * prog(t, 0, tG - .26);
    for (const g of HOOK) n += .05 * ease.outCubic(prog(t, g - .12, g + .05));
    n = lerp(n, 1, ease.inCubic(prog(t, tG - .3, tG))) * (1 - smooth(prog(t, tRew0 + .1, tRew1)));
  } else for (const st of ST) n += .2 * ease.outCubic(prog(t, st - .12, st + .46));
  let alza = 0;
  if (t < tSlam) { alza = 2.28; for (const g of HOOK) alza -= .1 * ease.outCubic(prog(t, g, g + .1)); alza *= 1 - ease.inCubic(prog(t, tG - .04, tSlam)); }
  else if (t > t0.intent - .1) alza = smooth(prog(t, t0.intent - .1, t0.quedaba + .25)) * .66 * (1 - ease.inCubic(prog(t, tSlam2 - .15, tSlam2)));
  const ap = t < tRew1 ? ease.outCubic(prog(t, tAlud, tAlud + .36)) * (1 - smooth(prog(t, tRew0, tRew0 + .3))) : 0;
  const ina = t < tRew1 ? ap : ease.inOutCubic(prog(t, t0.mitad, t0.llenaW + .3));
  let la = 0;
  if (t < tSlam) la = .16 * Math.sin(t * 7.3) + .1 * Math.sin(t * 13);
  else if (t > ST[4] && t < t0.emp + .4) la = .3 * Math.sin((t - ST[4]) * 6.2) * Math.exp(-(t - ST[4]) * .9);
  else if (t > t0.intent - .1 && t < tSlam2) la = prog(t, t0.intent - .1, tSlam2) * .28 * Math.sin(t * 19);
  else if (t >= tSlam2 && t < tSlam2 + .8) la = .26 * Math.sin((t - tSlam2) * 24) * Math.exp(-(t - tSlam2) * 6);
  const cy = t < tRew1 ? .2 : lerp(.55, -.45, ease.inCubic(prog(t, tSlam2 - .22, tSlam2)));
  const cr = ease.outExpo(prog(t, PARTE, PARTE + .55));
  const lav = (t < t0.emp - .3 ? 0 : smooth(prog(t, t0.emp - .3, t0.emp + .4))) * (1 - smooth(prog(t, t0.anth, t0.anth + 1))) * .78;
  return { n, alza, ap, ina, la, cy, cr, lav };
}

// ---------- texto sobre una tarjeta en 3D ----------
function enPlano(c: C, cam: Cam, P: V3, u: V3, v: V3, W: number, H: number, f: (w: number, h: number) => void) {
  const A = cam.p(...sum3(sum3(P, u, -W / 2), v, H / 2)), B = cam.p(...sum3(sum3(P, u, W / 2), v, H / 2)), D = cam.p(...sum3(sum3(P, u, -W / 2), v, -H / 2));
  if (!A || !B || !D) return;
  const w = W * ESC, h = H * ESC;
  c.save(); c.transform((B.x - A.x) / w, (B.y - A.y) / w, (D.x - A.x) / h, (D.y - A.y) / h, A.x, A.y); f(w, h); c.restore();
}

function palomita(c: C, x: number, y: number, z: number, k: number, color = ACENTO) {
  if (k <= 0) return;
  c.save(); c.translate(x, y); c.scale(z, z); c.strokeStyle = color; c.lineWidth = 15; c.lineCap = "round"; c.lineJoin = "round";
  const p: [number, number][] = [[-34, 2], [-8, 30], [42, -32]], l1 = Math.hypot(26, 28), l2 = Math.hypot(50, 62), d = (l1 + l2) * k;
  c.beginPath(); c.moveTo(p[0][0], p[0][1]);
  if (d < l1) c.lineTo(p[0][0] + 26 * d / l1, p[0][1] + 28 * d / l1);
  else { c.lineTo(p[1][0], p[1][1]); const q = (d - l1) / l2; c.lineTo(p[1][0] + 50 * q, p[1][1] - 62 * q); }
  c.stroke(); c.restore();
}

function lapiz(c: C, x: number, y: number, a: number, z = 1) {
  c.save(); c.translate(x, y); c.rotate(a); c.scale(z, z);
  c.fillStyle = TINTA; c.fillRect(-8, -92, 16, 76); c.fillStyle = ACENTO; c.fillRect(-8, -106, 16, 18);
  c.fillStyle = "#E9E3D2"; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.moveTo(-8, -16); c.lineTo(8, -16); c.lineTo(0, 12); c.closePath(); c.fill(); c.stroke();
  c.restore();
}

// ---------- pictogramas de las cinco tarjetas de la fiesta ----------
function pic(c: C, i: number, x: number, y: number) {
  c.save(); c.translate(x, y); c.strokeStyle = TINTA; c.fillStyle = TINTA; c.lineWidth = 6; c.lineCap = "round"; c.lineJoin = "round";
  if (i === 0) { c.fillStyle = ACENTO; c.beginPath(); c.arc(0, -10, 26, Math.PI * .85, Math.PI * 2.15); c.lineTo(0, 36); c.closePath(); c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.arc(0, -10, 9, 0, 7); c.fill(); }
  else if (i === 1) { for (const [dx, sc] of [[-24, .8], [24, .8], [0, 1]] as [number, number][]) { c.fillStyle = dx === 0 ? ACENTO : TINTA; c.beginPath(); c.arc(dx, -16 * sc, 13 * sc, 0, 7); c.fill(); c.beginPath(); c.arc(dx, 26 * sc, 23 * sc, Math.PI, 0); c.fill(); } }
  else if (i === 2) { c.fillStyle = "#fff"; c.strokeRect(-34, -2, 68, 34); c.strokeRect(-22, -24, 44, 22); c.fillStyle = ACENTO; c.beginPath(); c.arc(0, -32, 8, 0, 7); c.fill(); }
  else if (i === 3) { c.beginPath(); c.moveTo(-14, 24); c.lineTo(-14, -26); c.lineTo(26, -32); c.lineTo(26, 16); c.stroke(); c.beginPath(); c.ellipse(-24, 24, 12, 9, -.3, 0, 7); c.fill(); c.fillStyle = ACENTO; c.beginPath(); c.ellipse(16, 16, 12, 9, -.3, 0, 7); c.fill(); }
  else { c.fillStyle = ACENTO; c.fillRect(-32, -14, 64, 48); c.fillStyle = TINTA; c.fillRect(-6, -14, 12, 48); c.fillRect(-36, -22, 72, 14); c.beginPath(); c.ellipse(-12, -32, 14, 9, .5, 0, 7); c.ellipse(12, -32, 14, 9, -.5, 0, 7); c.stroke(); }
  c.restore();
}

// ---------- la mesa ----------
function mesa(c: C, cam: Cam, xc: number, aparece = 1) {
  if (aparece <= 0) return;
  const q = (x: number, y: number, z: number) => cam.p(xc + x, y, z);
  const S = q(0, 0, PISO); if (S) sombra(c, S.x, S.y, TX * S.s * 1.04, .13);
  const pata = (x: number, y: number, g: number) => {
    const A = q(x, y, -.14), B = q(x, y, PISO); if (!A || !B) return;
    c.strokeStyle = TINTA; c.lineWidth = g * A.s / 120; c.lineCap = "butt"; c.beginPath(); c.moveTo(A.x, A.y); c.lineTo(B.x, B.y); c.stroke();
  };
  pata(-TX + .42, TY - .3, 8); pata(TX - .42, TY - .3, 8); pata(-TX + .36, -TY + .22, 13); pata(TX - .36, -TY + .22, 13);
  const a = q(-TX, TY, 0), b = q(TX, TY, 0), d = q(TX, -TY, 0), f = q(-TX, -TY, 0), d2 = q(TX, -TY, -.2), f2 = q(-TX, -TY, -.2);
  if (!a || !b || !d || !f || !d2 || !f2) return;
  c.fillStyle = "#FBF9F2"; c.strokeStyle = TINTA; c.lineWidth = 4; c.lineJoin = "round";
  c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(d.x, d.y); c.lineTo(f.x, f.y); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = TINTA; c.beginPath(); c.moveTo(f.x, f.y); c.lineTo(d.x, d.y); c.lineTo(d2.x, d2.y); c.lineTo(f2.x, f2.y); c.closePath(); c.fill();
}

function borde(c: C, cam: Cam, t: number, a: number) {
  if (a <= 0) return;
  const P = ([[-TX, TY], [TX, TY], [TX, -TY], [-TX, -TY]] as [number, number][]).map(([x, y]) => cam.p(x, y, .02));
  if (P.some((p) => !p)) return;
  c.save(); c.globalAlpha = a; c.strokeStyle = ACENTO; c.lineWidth = 9; c.setLineDash([20, 14]); c.lineDashOffset = -t * 160; c.beginPath();
  P.forEach((p, i) => (i ? c.lineTo(p!.x, p!.y) : c.moveTo(p!.x, p!.y))); c.closePath(); c.stroke(); c.restore();
}

function guirnalda(c: C, cam: Cam, t: number, z0: number) {
  const PTS: { x: number; y: number; s: number }[] = [];
  for (let i = 0; i <= 44; i++) {
    const x = -9 + i * .41, k = (x + 9) / 18, sag = Math.sin(k * Math.PI * 3) ** 2 * .34 + .05 * Math.sin(t * 1.4 + i * .3);
    const p = cam.p(x, YP + .2, z0 - sag); if (p) PTS.push(p);
  }
  if (PTS.length < 2) return;
  c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); PTS.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.stroke();
  PTS.forEach((p, i) => {
    if (i % 2) return;
    const sz = 30 * p.s / 120, col = [ACENTO, TINTA, "#fff"][(i / 2) % 3], g = Math.sin(t * 2.1 + i) * .1;
    c.save(); c.translate(p.x, p.y); c.rotate(g); c.fillStyle = col; c.strokeStyle = TINTA; c.lineWidth = 3;
    c.beginPath(); c.moveTo(-sz, 0); c.lineTo(sz, 0); c.lineTo(0, sz * 1.8); c.closePath(); c.fill(); if (col === "#fff") c.stroke(); c.restore();
  });
}

function polvo(c: C, t: number) {
  const r = azar(9); c.fillStyle = TINTA;
  for (let i = 0; i < 70; i++) {
    const x0 = r() * 1200 - 60, y0 = r() * 2060, v = 16 + r() * 46, f = r() * 6.3, z = 1.6 + r() * 3.4;
    c.globalAlpha = .1 + r() * .16;
    c.fillRect(x0 + Math.sin(t * .55 + f) * 34, ((y0 - t * v) % 2060 + 2060) % 2060 - 70, z, z);
  }
  c.globalAlpha = 1;
}

// ---------- plan: tarjetas colgadas de la guirnalda ----------
const ORD: { t: number; o: string[] }[] = [
  { t: -1, o: ["lugar", "fecha", "inv", "pastel", "musica", "sorp"] },
  { t: tAvanza, o: ["fecha", "inv", "pastel", "musica", "sorp"] },
  { t: tReac, o: ["inv", "pastel", "musica", "sorp"] },
  { t: tDom, o: ["dom", "inv", "pastel", "musica", "sorp"] },
  { t: tFlip + .3, o: ["dom", "inv", "musica", "pastel", "sorp"] },
  { t: tOrb0 + .78, o: ["dom", "musica", "inv", "pastel", "sorp"] },
  { t: tOrb0 + 1.6, o: ["dom", "inv", "pastel", "musica", "sorp"] },
];
const DATOS: Record<string, { pal: string; sub?: string; k: number; tW: number; tN: number; subR?: boolean }> = {
  lugar: { pal: "lugar", sub: "restaurante", k: 0, tW: t0.lugar, tN: t0.uno },
  fecha: { pal: "fecha", sub: "sábado", k: 1, tW: t0.fecha, tN: t0.dos },
  inv: { pal: "invitados", k: 2, tW: t0.inv2, tN: t0.tres },
  pastel: { pal: "pastel", k: 3, tW: t0.inv2 + .52, tN: t0.inv2 + .52 },
  musica: { pal: "música", k: 4, tW: t0.inv2 + .66, tN: t0.inv2 + .66 },
  sorp: { pal: "sorpresa", k: 5, tW: t0.inv2 + .8, tN: t0.inv2 + .8 },
  dom: { pal: "fecha", sub: "domingo", k: 1, tW: tDom + .1, tN: tDom + .1, subR: true },
};

const ordenAhora = (t: number) => { let o = ORD[0].o; for (const O of ORD) if (t >= O.t) o = O.o; return o; };
function slotDe(id: string, t: number) {
  let cur = ORD[0].o.indexOf(id), arco = 0, dentro = cur >= 0;
  for (let i = 1; i < ORD.length; i++) {
    const O = ORD[i]; if (t < O.t) break;
    const nv = O.o.indexOf(id), d = (nv >= 0 ? nv : 0) * .035, p = prog(t, O.t + d, O.t + d + .52);
    if (cur >= 0 && nv >= 0) { arco = Math.sin(Math.PI * p) * (nv - cur) * .9; cur = lerp(cur, nv, ease.outBack(p, 1.5)); }
    else if (nv >= 0) { cur = nv - 3.2 * (1 - ease.outBack(p, 1)); dentro = p > 0; }
    else dentro = false;
    if (p >= 1 && cur >= 0 && nv >= 0) cur = nv;
  }
  return { s: cur, arco, dentro };
}

const hipo = (t: number) => smooth(prog(t, t0.es - .2, t0.es + .3));
const sube = (t: number) => ease.inOutCubic(prog(t, tSube, tSube + .9)) * 10;
const baja = (t: number) => (1 - ease.outBack(prog(t, t0.antes - .2, t0.antes + .7), 1.1)) * 6;
function viento(z: number, t: number) { const g = hipo(t) * (1 - prog(t, t0.llama, t0.llama + 1)) * .12 + .03 * punch(t); return (ZR - z) / 8 * (.07 * Math.sin(t * 1.17) + .04 * Math.sin(t * 1.9 + 1) + g * Math.sin(t * 5.3)); }

function cara(c: C, t: number, W: number, H: number, id: string, o: { flip?: boolean; num: number; hech?: number }) {
  const D = DATOS[id], hi = hipo(t), k = smooth(prog(t, D.tW - .02, D.tW + .34)), kn = ease.outBack(prog(t, D.tN - .02, D.tN + .22), 2);
  c.fillStyle = "rgba(20,18,14,.13)"; c.fillRect(9, 11, W, H);
  c.fillStyle = "#FDFCF8"; c.fillRect(0, 0, W, H);
  c.strokeStyle = TINTA; c.lineWidth = 5;
  if (hi < 1) { c.globalAlpha = 1 - hi; c.strokeRect(0, 0, W, H); c.globalAlpha = 1; }
  if (hi > 0) { c.save(); c.globalAlpha = hi; c.setLineDash([22, 14]); c.strokeRect(0, 0, W, H); c.restore(); }
  if (kn > 0) {
    c.save(); c.translate(72, H / 2); c.scale(kn, kn); c.fillStyle = TINTA; c.beginPath(); c.arc(0, 0, 44, 0, 7); c.fill();
    texto(c, String(o.num), 0, 19, { fuente: serif(56), color: "#fff" }); c.restore();
  }
  if (k > 0) {
    c.save(); c.beginPath(); c.rect(124, 0, (W - 124) * k, H); c.clip();
    const pal = o.flip ? "invitados" : D.pal;
    texto(c, pal, 136, H / 2 + 31, { fuente: serif(92), color: TINTA, alin: "left" });
    const sub = o.flip ? "avisar" : D.sub;
    if (sub) texto(c, sub, W - 26, H / 2 + 22, { fuente: serif(58, true), color: D.subR || o.flip ? ACENTO : GRIS, alin: "right" });
    c.restore();
  }
  if (o.hech) palomita(c, W - 80, H / 2, 1.5, o.hech);
}

function planta(c: C, t: number, cam: Cam) {
  const a = t >= t0.antes - .2 && t < tSube + 1;
  if (!a) return;
  const up = sube(t) + baja(t), hi = hipo(t);
  const fan = smooth(prog(t, t0.escr - .3, t0.escr + .3));
  // cuerdas
  const ult = ORD.filter((O) => t >= O.t).pop()!.o.length;
  const zb = Z0 - (ult - 1) * DZ - HP / 2 - .34 + up;
  for (const l of [-1, 1]) {
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= 20; i++) { const z = lerp(ZR + up, zb, i / 20), p = cam.p(XC + l * 2.32 + viento(z - up, t), YP, z); if (p) pts.push(p); }
    c.strokeStyle = TINTA; c.lineWidth = 3.4; c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.stroke();
  }
  // huecos: la lista antes de existir
  if (fan > 0 && t < tV(5) + .8) for (let k = 0; k < 6; k++) {
    if (t > tV(k) + .62) continue;
    const S = SLOT(k), [u, v] = ejes(0, 0, 0), P: V3 = [S[0] + viento(S[2], t), S[1], S[2] + up];
    enPlano(c, cam, P, u, v, WP, HP, (w, h) => { c.save(); c.globalAlpha = fan * .55; c.strokeStyle = GRIS; c.lineWidth = 4; c.setLineDash([16, 14]); c.lineDashOffset = -t * 40; c.strokeRect(0, 0, w, h); c.restore(); });
  }
  for (const id of Object.keys(DATOS)) {
    const D = DATOS[id], { s: sl, arco, dentro } = slotDe(id, t);
    if (!dentro || sl < -5) continue;
    if (id === "lugar" && t >= tToma + .02) continue;
    if (id === "fecha" && t >= tCae0) continue;
    if (id === "sorp" && t >= tHin) continue;
    const ent = id === "dom" ? ease.outBack(prog(t, tDom, tDom + .5)) : ease.outBack(prog(t, tV(D.k) + .48, tV(D.k) + .84), 2.4);
    if (ent <= 0) continue;
    const z = Z0 - sl * DZ, x = XC + viento(z, t) + arco;
    let ry = (.08 + .1 * hi) * Math.sin(t * 1.3 + D.k * 1.7), flip = false;
    if (id === "inv" && t >= tFlip) { const p = prog(t, tFlip, tFlip + .56); ry += p < .5 ? lerp(0, Math.PI / 2, p * 2) : lerp(-Math.PI / 2, 0, (p - .5) * 2); flip = p >= .5; }
    const [u, v] = ejes(ry, .05 * Math.sin(t * 1.1 + D.k), .012 * Math.sin(t * 1.6 + D.k * 2));
    const P: V3 = [x, YP - Math.abs(arco) * .5, z + up];
    enPlano(c, cam, P, sum3([0, 0, 0], u, ent), v, WP, HP, (w, h) => cara(c, t, w, h, id, { flip, num: ordenAhora(t).indexOf(id) + (t >= tAvanza ? 2 : 1) }));
    for (const l of [-1, 1]) { const q = cam.p(P[0] + l * 2.32, P[1], P[2] + HP / 2 - .03); if (q) { c.fillStyle = TINTA; c.fillRect(q.x - 13, q.y - 9, 26, 18); } }
  }
}

/** La tarjeta del sábado: se descuelga de un lado, gira sobre el clip que le queda y cae. Física a mano, misma cuenta en partitura.py. */
function poseSabado(t: number) {
  const P: V3 = [XC - 2.32, YP, Z0 + HP / 2 - .03], L = Math.hypot(2.32, HP / 2 - .03), a0 = Math.atan2(HP / 2 - .03, 2.32);
  const d = t - tCae0, q = 1.5 * (1 - Math.exp(-Math.min(d, tCae1 - tCae0) * 5) * Math.cos(Math.min(d, tCae1 - tCae0) * 8));
  const ang = -a0 - q, cx = P[0] + Math.cos(ang) * L, cz = P[2] + Math.sin(ang) * L;
  if (t < tCae1) return { x: cx, y: YP - .1, z: cz, rz: -q, ry: 0, rx: 0 };
  const f = t - tCae1, G = 22, tv = Math.sqrt(2 * (cz - .3) / G);
  if (f < tv) return { x: cx + f * 1.1, y: YP - .1 - f * .9, z: cz - .5 * G * f * f, rz: -q - f * 3.4, ry: f * 1.2, rx: f * 2.2 };
  const r = f - tv, z = .3 + Math.max(0, 3.2 * r - .5 * G * r * r);
  const y = YP - .1 - tv * .9 - r * .3, x = cx + tv * 1.1 + r * 8.5;
  return { x, y, z: x > TX ? z - 14 * (x - TX) ** 2 / 64 : z, rz: -q - tv * 3.4 - r * 7, ry: tv * 1.2 + r, rx: Math.min(tv * 2.2 + r * 2, Math.PI / 2) };
}

function sabado(c: C, t: number, cam: Cam) {
  if (t < tCae0 || t > tMesaCae + 1.6) return;
  const p = poseSabado(t), [u, v] = ejes(p.ry, p.rx, p.rz);
  enPlano(c, cam, [p.x, p.y, p.z], u, v, WP, HP, (w, h) => cara(c, t, w, h, "fecha", { num: 2 }));
}

/** La tarjeta en curso: baja de las cuerdas, se pone inclinada sobre la mesa, se palomea y se va. */
function posLugar(t: number): V3 {
  const a = SLOT(0), m: V3 = [.15, -.55, HP * .4 + .02], fin: V3 = [3.3, .1, .7];
  const p = ease.inOutCubic(prog(t, tToma + .04, tPosa)), o = ease.inOutCubic(prog(t, tSale, tSale + .6));
  const arc = Math.sin(Math.PI * p);
  return [lerp(lerp(a[0], m[0], p) - arc * 1.1, fin[0], o), lerp(lerp(a[1], m[1], p), fin[1], o), lerp(lerp(a[2], m[2], p), fin[2], o) + Math.sin(Math.PI * o) * .5];
}
function tarjetaLugar(c: C, t: number, cam: Cam) {
  if (t < tToma + .02 || t > tSale + .6) return;
  const P = posLugar(t), p = ease.inOutCubic(prog(t, tToma + .04, tPosa)), rx = p * .5, gol = t > tPosa ? Math.exp(-(t - tPosa) * 9) * .06 * Math.sin((t - tPosa) * 40) : 0;
  const a = 1 - smooth(prog(t, tSale + .4, tSale + .6)), [u, v] = ejes(0, rx, gol);
  enPlano(c, cam, P, sum3([0, 0, 0], u, a), sum3([0, 0, 0], v, a), WP * .78, HP * .78 * 1.0, (w, h) => {
    c.scale(.78, .78); cara(c, t, w / .78, h / .78, "lugar", { num: 1, hech: t >= tPaloma ? ease.outCubic(prog(t, tPaloma, tPaloma + .18)) : 0 });
  });
}

function restaurante(c: C, t: number, cam: Cam) {
  const a = ease.outBack(prog(t, tRest, tRest + .42), 1.6) * (1 - smooth(prog(t, tSube, tSube + .4)));
  if (a <= 0) return;
  const P = cam.p(3.32, 1, 0); if (!P) return;
  let sac = t >= tCierra ? Math.exp(-(t - tCierra) * 6) * Math.sin((t - tCierra) * 44) * .05 : 0;
  for (const d of [.12, .6]) { const q = t - (t0.restW + d); if (q > 0 && q < .34) sac += Math.sin(q * 90) * .035 * Math.sin(Math.PI * q / .34); }
  c.save(); c.translate(P.x, P.y); c.scale(P.s / 127 * a, P.s / 127 * a); c.rotate(sac);
  c.fillStyle = "#FDFCF8"; c.strokeStyle = TINTA; c.lineWidth = 5; c.fillRect(-94, -176, 188, 176); c.strokeRect(-94, -176, 188, 176);
  c.fillStyle = "#EDE9DD"; c.fillRect(-70, -128, 58, 128); c.strokeRect(-70, -128, 58, 128);
  c.strokeRect(6, -128, 66, 64);
  for (let i = 0; i < 7; i++) {
    c.fillStyle = i % 2 ? "#fff" : ACENTO; c.beginPath(); const x0 = -112 + i * 32;
    c.moveTo(x0 + 6, -218); c.lineTo(x0 + 32 + 6 * (i === 6 ? 0 : 1), -218); c.lineTo(x0 + 32, -158); c.arc(x0 + 16, -158, 16, 0, Math.PI); c.closePath(); c.fill(); c.lineWidth = 3; c.stroke();
  }
  const k = t < tCierra - .14 ? 0 : ease.inCubic(prog(t, tCierra - .14, tCierra));
  if (k > 0) {
    const H = 156 * k; c.fillStyle = TINTA; c.fillRect(-90, -156, 180, H); c.strokeStyle = "rgba(237,234,227,.5)"; c.lineWidth = 3;
    for (let y = -156 + 14; y < -156 + H; y += 15) { c.beginPath(); c.moveTo(-90, y); c.lineTo(90, y); c.stroke(); }
    if (k >= 1) { c.fillStyle = ACENTO; c.fillRect(-76, -106, 152, 52); texto(c, "sábado", 0, -67, { fuente: mono(32), color: "#fff" }); }
  }
  c.restore();
}

const enLlamada = (t: number) => t >= t0.llama - .16 && t < tCae0 + .3;
function auricular(c: C, x: number, y: number, a: number, z: number) {
  c.save(); c.translate(x, y); c.rotate(a); c.scale(z, z);
  const forma = () => { c.beginPath(); c.roundRect(-14, -62, 28, 124, 12); c.roundRect(-30, -78, 46, 34, 14); c.roundRect(-30, 44, 46, 34, 14); };
  forma(); c.strokeStyle = PAPEL; c.lineWidth = 12; c.lineJoin = "round"; c.stroke();
  forma(); c.fillStyle = TINTA; c.fill();
  c.fillStyle = ACENTO; c.beginPath(); c.arc(-8, -61, 7, 0, 7); c.fill();
  c.restore();
}
/** El cordón va de la mano al restaurante; se tiende al descolgar y se recoge al colgar. */
function cordon(c: C, t: number, cam: Cam, mano: V3) {
  const k = smooth(prog(t, t0.llama - .1, t0.llama + .45)) * (1 - smooth(prog(t, tCae0 + .05, tCae0 + .3)));
  if (k <= 0) return;
  const fin: V3 = [2.66, 1.05, .55], N = 90, pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= N * k; i++) {
    const u = i / N, P = cam.p(lerp(mano[0], fin[0], u), lerp(mano[1], fin[1], u), lerp(mano[2] - .3, fin[2], u) - Math.sin(Math.PI * u) * .5);
    if (!P) continue;
    const g = P.s / 127 * 9;
    pts.push({ x: P.x + Math.cos(u * 140) * g, y: P.y + Math.sin(u * 140) * g });
  }
  c.strokeStyle = TINTA; c.lineWidth = 3; c.lineJoin = "round"; c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.stroke();
}

function mapa(c: C, t: number) {
  const k = ease.outCubic(prog(t, t0.pero - .1, t0.pero + .7)) * (1 - ease.inCubic(prog(t, t0.es - .34, t0.es - .1)));
  if (k <= 0) return;
  const X0 = 150, W = 800, Y0 = 56, H = 1030 * k;
  c.save(); c.beginPath(); c.rect(X0, Y0, W, H); c.clip();
  c.fillStyle = "#EFEADC"; c.fillRect(X0, Y0, W, 1030);
  c.strokeStyle = "rgba(17,17,17,.2)"; c.lineWidth = 3;
  for (let i = 1; i < 7; i++) { c.beginPath(); c.moveTo(X0, Y0 + i * 150); c.lineTo(X0 + W, Y0 + i * 150 - 40); c.stroke(); c.beginPath(); c.moveTo(X0 + i * 120, Y0); c.lineTo(X0 + i * 120 + 30, Y0 + 1030); c.stroke(); }
  c.strokeStyle = "rgba(17,17,17,.5)"; c.lineWidth = 5;
  for (const [x, y] of [[280, 300], [760, 240], [820, 700], [330, 860]] as [number, number][]) { c.beginPath(); c.moveTo(x - 50, y + 34); c.lineTo(x, y - 40); c.lineTo(x + 50, y + 34); c.stroke(); }
  c.strokeStyle = ACENTO; c.lineWidth = 11; c.lineCap = "round"; c.setLineDash([2, 26]); c.lineDashOffset = -t * 60;
  c.beginPath(); c.moveTo(250, 140); c.bezierCurveTo(740, 180, 360, 470, 620, 560); c.bezierCurveTo(820, 640, 380, 720, 660, 930); c.stroke(); c.setLineDash([]);
  c.lineWidth = 16; c.beginPath(); c.moveTo(626, 894); c.lineTo(696, 964); c.moveTo(696, 894); c.lineTo(626, 964); c.stroke();
  bola(c, 250, 140, 22);
  c.restore();
  c.fillStyle = TINTA; c.fillRect(X0 - 14, Y0 + H - 7, W + 28, 15); c.strokeStyle = TINTA; c.lineWidth = 5; c.strokeRect(X0, Y0, W, H);
  c.beginPath(); c.arc(540, Y0 + H + 34, 11, 0, 7); c.moveTo(540, Y0 + H + 8); c.lineTo(540, Y0 + H + 23); c.stroke();
}

// ---------- cosas a medias: lo hecho va en tinta, lo que falta punteado ----------
function pastelito(c: C, x: number, y: number, z: number, k: number) {
  if (k <= 0) return;
  c.save(); c.translate(x, y); c.scale(z, z);
  c.strokeStyle = TINTA; c.lineWidth = 6; c.lineJoin = "round";
  c.setLineDash([12, 10]); c.strokeRect(0, -74, 96, 74); c.strokeRect(0, -132, 62, 58); c.setLineDash([]);
  const a = smooth(prog(k, 0, .4)), b = smooth(prog(k, .4, 1));
  c.fillStyle = "#fff"; c.fillRect(-96, -74 * a, 96, 74 * a); c.strokeRect(-96, -74 * a, 96, 74 * a);
  if (b > 0) { c.fillRect(-62, -74 - 58 * b, 62, 58 * b); c.strokeRect(-62, -74 - 58 * b, 62, 58 * b); }
  c.fillStyle = ACENTO; c.fillRect(-96, -46 * a, 96, 11 * a); if (b >= 1) { c.beginPath(); c.arc(-22, -148, 16, 0, 7); c.fill(); }
  c.lineWidth = 3; c.setLineDash([6, 7]); c.beginPath(); c.moveTo(0, 10); c.lineTo(0, -160); c.stroke();
  c.restore();
}
function globo(c: C, x: number, y: number, z: number, k: number, t: number) {
  if (k <= 0) return;
  c.save(); c.translate(x, y + Math.sin(t * 2.2) * 6); c.scale(z, z);
  c.strokeStyle = TINTA; c.lineWidth = 5; c.setLineDash([12, 10]); c.beginPath(); c.ellipse(0, -176, 86, 104, 0, 0, 7); c.stroke(); c.setLineDash([]);
  const r = lerp(.2, .56, k);
  c.fillStyle = ACENTO; c.beginPath(); c.ellipse(0, -72 - 104 * r, 86 * r, 104 * r, 0, 0, 7); c.fill();
  c.beginPath(); c.moveTo(-9, -72); c.lineTo(0, -88); c.lineTo(9, -72); c.closePath(); c.fill();
  c.lineWidth = 4; c.beginPath(); c.moveTo(0, -70); c.quadraticCurveTo(22, -36, 0, 0); c.stroke();
  c.restore();
}
function manta(c: C, cx: number, cy: number, z: number, k: number, gi = 0) {
  if (k <= 0) return;
  const W = 660, H = 118, LET = "FELICIDADES", corte = Math.floor(5 * Math.min(k * 2, 1));
  c.save(); c.translate(cx, cy); c.rotate(gi); c.scale(z, z);
  c.strokeStyle = TINTA; c.lineWidth = 7; c.beginPath(); c.moveTo(-W / 2, -H / 2 - 170); c.lineTo(-W / 2, H / 2 + 130); c.moveTo(W / 2, -H / 2 - 170); c.lineTo(W / 2, H / 2 + 130); c.stroke();
  c.fillStyle = "#FDFCF8"; c.fillRect(-W / 2, -H / 2, W, H); c.lineWidth = 5; c.setLineDash([14, 11]); c.strokeRect(-W / 2, -H / 2, W, H); c.setLineDash([]);
  c.strokeRect(-W / 2, -H / 2, W * .47, H);
  c.font = serif(90); c.textBaseline = "alphabetic"; c.textAlign = "left";
  let x = -W / 2 + 26;
  for (let i = 0; i < LET.length; i++) {
    const ch = LET[i], ww = c.measureText(ch).width;
    if (i < corte) { c.fillStyle = TINTA; c.fillText(ch, x, 32); } else { c.save(); c.setLineDash([5, 6]); c.lineWidth = 2; c.strokeStyle = GRIS; c.strokeText(ch, x, 32); c.restore(); }
    x += ww + 4;
  }
  c.restore();
}

function medias(c: C, t: number, cam: Cam) {
  if (t < t0.emp - .2 || t > tSlam2 + 1.4) return;
  const d = Math.max(t - tSlam2, 0), G = 16 * d * d;
  const vis = [t0.emp + .05, t0.emp + .5, t0.emp + .92, t0.emp + 1.3, t0.mitad + .05, t0.mitad + .5];
  const paso = (a: number, b: number) => .5 * ease.outCubic(prog(t, a, a + .3)) + .5 * ease.outCubic(prog(t, b, b + .3));
  const P1 = cam.p(-2.3, -.3, 0), P2 = cam.p(2.15, -.3, 0), P3 = cam.p(0, .1, 3.15);
  c.save(); if (d > 0) { c.beginPath(); c.rect(-200, -200, 1500, 1500); c.clip(); }
  if (P3) manta(c, P3.x, P3.y + G * 60, P3.s / 127, paso(vis[1], vis[4]), d * 1.4);
  if (P1) pastelito(c, P1.x - d * 90, P1.y + G * 80, P1.s / 127 * 1.05, paso(vis[0], vis[3]));
  if (P2) globo(c, P2.x + Math.sin(d * 16) * 90 * Math.min(d * 3, 1) + d * 220, P2.y - d * 340, P2.s / 127 * 1.05, paso(vis[2], vis[5]), t);
  c.restore();
}

// ---------- la regla ----------
const XM = [1, 2, 3, 4, 5].map((i) => -RX * 1.15 + i * 2 * RX * 1.15 / 6);
function regla(c: C, t: number, cam: Cam) {
  const a = ease.outCubic(prog(t, t0.ens - .55, t0.ens - .1)) * (1 - ease.inCubic(prog(t, PARTE + .3, PARTE + .75)));
  if (a <= 0) return;
  const A = cam.p(-RX * 1.15, -.6, 8), B = cam.p(RX * 1.15, -.6, 8); if (!A || !B) return;
  const Y = lerp(-140, A.y - 20, a), L = B.x - A.x;
  // marcas: de la regla al pie de la montaña
  for (let i = 0; i < 5; i++) {
    const k = ease.outCubic(prog(t, tM[i], tM[i] + .2)); if (k <= 0) continue;
    const pie = cam.p(XM[i], -1, 0); if (!pie) continue;
    c.save(); c.globalAlpha = 1 - smooth(prog(t, PARTE + .1, PARTE + .3)); c.strokeStyle = ACENTO; c.lineWidth = t >= PARTE - .04 ? 11 : 7; c.setLineDash(t >= PARTE - .04 ? [] : [20, 14]); c.lineDashOffset = -t * 90;
    c.beginPath(); c.moveTo(A.x + (i + 1) * L / 6, Y + 42); c.lineTo(lerp(A.x + (i + 1) * L / 6, pie.x, k), lerp(Y + 42, pie.y, k)); c.stroke(); c.restore();
  }
  c.fillStyle = "#FDFCF8"; c.strokeStyle = TINTA; c.lineWidth = 5; c.fillRect(A.x, Y - 46, L, 92); c.strokeRect(A.x, Y - 46, L, 92);
  c.lineWidth = 3;
  for (let i = 0; i <= 60; i++) { const x = A.x + i * L / 60, h = i % 10 === 0 ? 36 : i % 5 === 0 ? 24 : 13; c.beginPath(); c.moveTo(x, Y + 46); c.lineTo(x, Y + 46 - h); c.stroke(); }
  for (let i = 0; i < 6; i++) texto(c, String(i + 1), A.x + (i + .5) * L / 6, Y - 2, { fuente: serif(50), color: TINTA });
}

// ---------- el ayudante ----------
type K = { t: number; x: number; y: number; d: number; h: number };
function recorre(t: number, ks: K[]) {
  let x = ks[0].x, y = ks[0].y, z = 0;
  for (let i = 1; i < ks.length; i++) {
    const k = ks[i]; if (t < k.t) break;
    const p = prog(t, k.t, k.t + k.d), q = ease.inOutCubic(p);
    const ax = x, ay = y; x = lerp(ax, k.x, q); y = lerp(ay, k.y, q); z = p < 1 ? Math.sin(Math.PI * p) * k.h : 0;
  }
  return { x, y, z };
}
const KB: K[] = [
  { t: -1, x: 0, y: -.92, d: 0, h: 0 }, { t: tRew0 + .12, x: 0, y: -.95, d: .42, h: .7 },
  { t: t0.emp - .08, x: -.8, y: -1, d: .22, h: .75 }, { t: t0.emp + .36, x: .8, y: -1, d: .3, h: 1 }, { t: t0.emp + .78, x: -.1, y: -1, d: .2, h: .8 }, { t: t0.emp + 1.1, x: -.8, y: -1, d: .22, h: .75 },
  { t: t0.mitad - .22, x: .8, y: -1, d: .3, h: 1 }, { t: t0.mitad + .2, x: -.2, y: -1, d: .2, h: .8 }, { t: t0.mitad + .55, x: .8, y: -1, d: .24, h: .7 }, { t: t0.llena, x: -.6, y: -1, d: .26, h: .7 }, { t: t0.llenaW - .1, x: 0, y: -1, d: .3, h: .6 },
  { t: t0.intent - .3, x: 0, y: -1.2, d: .3, h: .5 }, { t: PARTE + .14, x: -2.6, y: -.7, d: .72, h: 2.2 },
  { t: tOrb1 + .2, x: -2.6, y: -.7, d: .4, h: .7 },
  { t: t0.si, x: -1.2, y: -.9, d: .4, h: .5 }, { t: tPasa, x: 3.3, y: -.6, d: 1.05, h: .35 }, { t: t0.limpia, x: -1.4, y: -.8, d: .1, h: 0 },
  { t: t0.desp + .3, x: -.9, y: -.8, d: .3, h: .3 }, { t: tArchiva + .3, x: -1.9, y: -.7, d: .4, h: .5 }, { t: tL0, x: -1.25, y: -.35, d: .5, h: 1 },
];
const KH: K[] = [
  { t: -1, x: XH - 3.1, y: -.5, d: 0, h: 0 }, { t: tObra - .12, x: XH - 1.7, y: -.8, d: .2, h: .8 }, { t: tObra + .24, x: XH + 1.8, y: -.8, d: .22, h: .9 }, { t: tObra + .6, x: XH - 1.3, y: -.8, d: .2, h: .8 }, { t: tObra + .94, x: XH, y: -.9, d: .22, h: .6 },
  { t: tSalta, x: 2.1, y: -.8, d: 1.15, h: 3.4 }, { t: tFuera, x: 7.4, y: -.8, d: .7, h: 2.2 },
];
const entraH = (t: number) => { const p = prog(t, tHel, tHel + .34); return (1 - ease.outCubic(p)) * 7 + (p >= 1 ? Math.abs(Math.sin((t - tHel - .34) * 6)) * .4 * Math.exp(-(t - tHel - .34) * 4) : 0); };

function gorro(c: C, x: number, y: number, r: number, k: number) {
  if (k <= 0) return;
  c.save(); c.translate(x, y); c.rotate(.18); c.scale(r / 90 * k, r / 90 * k);
  c.fillStyle = ACENTO; c.beginPath(); c.moveTo(-72, -62); c.lineTo(8, -226); c.lineTo(70, -56); c.closePath(); c.fill();
  c.fillStyle = TINTA; c.beginPath(); c.arc(8, -232, 19, 0, 7); c.fill(); c.restore();
}

type Pose = { m1: V3; m2: V3; a1?: number; a2?: number; sq?: number };
function pintaBola(c: C, cam: Cam, b: { x: number; y: number; z: number }, p: Pose, hat: number, piso = 0) {
  const A = cam.p(b.x, b.y, b.z + RB), S = cam.p(b.x, b.y, piso), H1 = cam.p(...p.m1), H2 = cam.p(...p.m2);
  if (!A || !S || !H1 || !H2) return null;
  const r = RB * A.s, g = r / 90, sq = p.sq ?? 0;
  if (sq === 0) agente(c, A.x, A.y, r, [H1.x, H1.y], [H2.x, H2.y], { abre1: p.a1, abre2: p.a2, piso: S.y, sombra: .3 / (1 + b.z * .7) });
  else {
    sombra(c, S.x, S.y, 150 * g, .34);
    const yy = S.y - (S.y - A.y) * (1 - sq * .46);
    brazo(c, A.x - 54 * g, yy - 50 * g * (1 - sq * .5), H1.x, H1.y, 60 * g, p.a1 ?? .6, TINTA, 1, g);
    brazo(c, A.x + 60 * g, yy - 30 * g * (1 - sq * .5), H2.x, H2.y, -60 * g, p.a2 ?? .6, TINTA, 1, g);
    c.save(); c.translate(A.x, yy); c.scale(1 + sq * .36, 1 - sq * .46); bola(c, 0, 0, r); c.restore();
  }
  gorro(c, A.x, A.y + (sq ? (S.y - A.y) * sq * .46 : 0), r, hat);
  return { A, S, H1, H2, r };
}

function cartaFinal(t: number) {
  const L: V3 = [.8, -.2, 3.7], F: V3 = [.92, -.8, HP * .3 + .02];
  const cae = 1 - ease.outCubic(prog(t, tAtrapa - .55, tAtrapa)), va = ease.inOutCubic(prog(t, tDeja, tDeja + .3));
  const P: V3 = [lerp(L[0], F[0], va) + .04 * Math.sin(t * 3) * (1 - va), lerp(L[1], F[1], va), lerp(L[2] + cae * 8 + (t >= tDeja ? 0 : .04 * Math.sin(t * 7)), F[2], va)];
  return { P, cae, va };
}

function salto(t: number) { let m = 0; for (const g of HOOK) { const d = t - g; if (d >= 0 && d < .5) m = Math.max(m, Math.exp(-d * 9)); } return m; }

function poseBola(t: number, b: { x: number; y: number; z: number }): Pose {
  const X = b.x, Y = b.y, Z = b.z, w = Math.sin(t * 3.1) * .08;
  const rel: Pose = { m1: [X - 1.05, Y, Z + .35 + w], m2: [X + 1.05, Y, Z + .4 - w] };
  if (t < tSlam) {
    const tr = Math.sin(t * 46) * .035, al = estado(t).alza;
    return { m1: [X - 1.2 + tr, Y + .3, al + .1], m2: [X + 1.2 - tr, Y + .3, al + .1], a1: 1, a2: 1, sq: clamp(.16 + salto(t) * .3 + ease.inCubic(prog(t, tG - .04, tSlam)) * .84) };
  }
  if (t < t0.org + .2) return rel;
  if (t < t0.sor + .9) {
    // cada tarjeta llega a su mano y la lanza a la pila
    let m2: V3 = [X + 1, Y, Z + .4 - w], a2 = .5;
    const tt = [t0.lug, t0.inv, t0.pas, t0.mus, t0.sor];
    for (const a of tt) { const d = t - a; if (d > -.1 && d < .62) { const q = smooth(prog(d, -.1, .1)) * (1 - smooth(prog(d, .46, .62))); m2 = [lerp(X + 1, .9, q), lerp(Y, -2.2, q), lerp(Z + .4, 2.9, q)]; a2 = .95; } }
    return { m1: [X - 1.05, Y, Z + .35 + w], m2, a2 };
  }
  if (t < t0.emp - .08) return { m1: [X - .8, Y, Z + 1.2 + w], m2: [X + .8, Y, Z + 1.2 - w], a1: 1, a2: 1 };   // mira hacia arriba
  if (t < t0.deja) {
    const v = Math.sin(t * 15) * .3;
    return { m1: [X - 1.3, Y + .2, Z + .8 + v], m2: [X + 1.3, Y + .2, Z + .8 - v], a1: .9, a2: .9 };
  }
  if (t < t0.intent - .3) return { m1: [X - 1.25, Y, Z + .95 + w * .4], m2: [X + 1.25, Y, Z + .95 - w * .4], a1: 1, a2: 1 };      // no sabe qué hizo
  if (t < tSlam2) { const al = estado(t).alza, tr = Math.sin(t * 46) * .03; return { m1: [X - 1.15 + tr, Y + .1, al + 1], m2: [X + 1.15 - tr, Y + .1, al + 1], a1: .9, a2: .9, sq: clamp(prog(t, t0.dem, tSlam2) * .22 + .02) }; }
  if (t < PARTE + .9) return { m1: [X - 1.1, Y, Z + 1 + w], m2: [X + 1.1, Y, Z + 1 - w], a1: 1, a2: 1 };
  if (t < t0.uno - .3) { const esc = t >= t0.escr - .2 && t < t0.lista; const v = esc ? Math.sin(t * 22) * .1 : 0; return { m1: [X - .95, Y, Z + .35 + w], m2: esc ? [X + 1.2 + v, Y - .2, Z + 1.3 + v] : [X + 1.05, Y, Z + .6], a2: .4 }; }
  if (t < tToma + .02) {
    // escribe en cada tarjeta, con el brazo estirado
    const obj = t < t0.dos - .2 ? 0 : t < t0.tres - .2 ? 1 : 2, S = SLOT(obj), ras = t < tToma - .55 ? Math.sin(t * 24) * .05 : 0;
    const q = t < tToma - .4 ? 1 : smooth(prog(t, tToma - .4, tToma - .05)), Z2 = lerp(S[2], SLOT(0)[2], t >= tToma - .4 ? q : 0);
    return { m1: [X - 1.05, Y, Z + .35 + w], m2: [XC - 2.75 + ras, YP - .2, Z2 + ras], a2: .35 };
  }
  if (t < tSale) {
    const L = posLugar(t), st = t >= tPosa ? 1 : 0, g = prog(t, tPaloma - .34, tPaloma - .02), lev = g < 1 ? Math.sin(g * Math.PI) * .9 : Math.exp(-(t - tPaloma) * 6) * .2;
    if (!st) return { m1: [X - 1.05, Y, Z + .35 + w], m2: [L[0] - 2.1, L[1], L[2] + .1], a2: .85 };
    return { m1: [X - 1.05, Y, Z + .35 + w], m2: [L[0] + .9, L[1] - .3, L[2] + .05 + lev], a2: .25 };
  }
  if (enLlamada(t)) { const q = smooth(prog(t, t0.llama - .16, t0.llama + .1)) * (1 - smooth(prog(t, tCae0 + .1, tCae0 + .3))); return { m1: [X - 1, Y, Z + .35 + w], m2: [lerp(X + 1.05, X + 1.12, q), Y - .25 * q, lerp(Z + .45, Z + 1.62, q)], a2: lerp(.6, .15, q) }; }
  if (t < tOrb0) { return { m1: [X - 1, Y, Z + .35 + w], m2: [X + 1.05, Y, Z + .45 - w] }; }
  if (t < tOrb1) return { m1: [X - .85, Y, Z + .8], m2: [X + .85, Y, Z + 1 + Math.sin(t * 20) * .1], a1: .5, a2: .3 };
  if (t < t0.si) { const up = smooth(prog(t, t0.hay - .1, t0.hay + .2)); return { m1: [X - 1, Y, Z + .35 + w], m2: [X + .7, Y, Z + lerp(.4, 1.8, up)], a2: lerp(.5, .2, up) }; }
  if (t < t0.limpia) return { m1: [X + 1.15, Y + .25, Z + 1.15], m2: [X + 1.25, Y + .25, Z + .4], a1: .95, a2: .95 };
  if (t < tEntrega) return rel;
  if (t < tArchiva + .4) { const q = smooth(prog(t, tEntrega, tEntrega + .3)) * (1 - smooth(prog(t, tArchiva - .02, tArchiva + .16))); const R = posRes(t); return { m1: [X - 1.05, Y, Z + .35 + w], m2: [lerp(X + 1.05, R[0] - 1.3, q), lerp(Y, R[1], q), lerp(Z + .4, R[2] + .1, q)], a2: .8 }; }
  if (t < t0.fut + .3) return { m1: [X - .9, Y, Z + .35 + w], m2: [X + .6, Y - .3, Z + 1.26], a2: .3 };                 // se asoma al orbe
  if (t < tL0 + .5) return { m1: [X - 1.2, Y, Z + .9], m2: [X + 1.2, Y, Z + .9], a1: 1, a2: 1 };
  const atr = smooth(prog(t, tAtrapa - .36, tAtrapa)), w2 = Math.sin(t * 2.2) * .07, { P } = cartaFinal(t);
  const m2: V3 = [lerp(X + 1.05, P[0] - 1.2, atr), lerp(Y, P[1], atr), lerp(Z + .4, P[2] + (t < tAtrapa ? -.3 : 0), atr)];
  const al = smooth(prog(t, tSello + .1, tSello + .5));          // suelta la tarjeta y levanta la mano: listo, y a lo que sigue
  return { m1: [X - 1.05, Y, Z + .4 + w2], m2: [lerp(m2[0], X + .8, al), lerp(m2[1], Y, al), lerp(m2[2], Z + 1.75 + w2, al)], a2: t < tAtrapa ? 1 : lerp(.32, .9, al) };
}

// ---------- el pendiente enorme ----------
function gigante(t: number) {
  const k = ease.outBack(prog(t, tHin, tHin + .82), 1.1), S = SLOT(4);
  const m = ease.inOutCubic(prog(t, tPasa, tLlega));
  const w = lerp(WP, 7.4, k), h = lerp(HP, 5.7, k);
  return { x: lerp(lerp(XC, .3, clamp(k)), XH + .7, m) + Math.sin(t * 2.3) * .04, y: lerp(YP, -.1, clamp(k)), z: lerp(S[2], h / 2 + .06, clamp(k)) + Math.sin(Math.PI * m) * .3, w, h, k };
}
function dibGigante(c: C, t: number, cam: Cam) {
  if (t < tHin || t > tObra + .5) return;
  const G = gigante(t), sac = t < tObra ? 0 : Math.sin(t * 60) * .03 * prog(t, tObra - .3, tObra);
  const al = 1 - smooth(prog(t, tObra - .02, tObra + .22)), esc = 1 + prog(t, tObra - .02, tObra + .22) * .1;
  const [u, v] = ejes(.05 * Math.sin(t * 1.3) * (1 - clamp(G.k)), .03, sac + (t < tObra ? .02 * Math.sin(t * 1.7) : 0));
  c.save(); c.globalAlpha = al;
  enPlano(c, cam, [G.x, G.y, G.z], sum3([0, 0, 0], u, esc), sum3([0, 0, 0], v, esc), G.w, G.h, (w, h) => {
    c.fillStyle = "rgba(20,18,14,.13)"; c.fillRect(11, 14, w, h);
    c.fillStyle = "#FDFCF8"; c.fillRect(0, 0, w, h); c.strokeStyle = TINTA; c.lineWidth = lerp(5, 8, clamp(G.k)); c.strokeRect(0, 0, w, h);
    const f = lerp(92, 228, clamp(G.k));
    texto(c, "sorpresa", lerp(136, w / 2, clamp(G.k)), lerp(h / 2 + f * .28, h * .4, clamp(G.k)), { fuente: serif(f, true), color: TINTA, alin: G.k > .5 ? "center" : "left", alfa: al });
    if (G.k > .4) { c.save(); c.globalAlpha = al * smooth(prog(G.k, .4, 1)); c.translate(w / 2 + 300, h - 96); c.scale(1.5, 1.5); pic(c, 4, 0, 0); c.restore(); }
    if (G.k < .5) { c.fillStyle = TINTA; c.beginPath(); c.arc(72, h / 2, 44, 0, 7); c.fill(); texto(c, "6", 72, h / 2 + 19, { fuente: serif(56), color: "#fff", alfa: al }); }
  });
  c.restore();
}

function monteChico(c: C, t: number, cam: Cam) {
  if (t < tObra) return;
  const p = ease.outCubic(prog(t, tObra, tObra + 1.05));
  const L: { d: number; f: () => void }[] = [];
  for (let i = 0; i < 180; i++) {
    const h = MONTE[i], k = clamp((p - h.u * .9) / .1); if (k <= 0) continue;
    const x = XH + h.x * .86, y = .1 + h.y * .78, z = h.z * .46 + (1 - k) ** 2 * 3;
    const [u, v] = ejes(h.ry, h.rx, h.rz + (1 - k) * 5);
    const q = cam.p(x, y, z); if (!q) continue;
    L.push({ d: q.zc, f: () => hoja(c, cam, x, y, z, u, v, h.w * .8, h.h * .8, h, t, 0, 1) });
  }
  L.sort((a, b) => b.d - a.d).forEach((o) => o.f());
}

function posRes(t: number): V3 {
  const H = recorre(t, KH), z = H.z;
  const m: V3 = [.75, -.7, HP * .32 + .02];
  if (t < tEntrega) return [H.x, H.y, z + 2.3];
  const p = ease.inOutCubic(prog(t, tEntrega, tEntrega + .4));
  const q = ease.inOutCubic(prog(t, tArchiva, tArchiva + .5));
  return [lerp(lerp(H.x, m[0], p), -7, q), lerp(lerp(H.y, m[1], p), .5, q), lerp(lerp(z + 2.3, m[2], p), 9, q) + Math.sin(Math.PI * p) * .3];
}
function tarjetaRes(c: C, t: number, cam: Cam) {
  if (t < tObra + 1 || t > tArchiva + .5) return;
  const a = ease.outBack(prog(t, tObra + 1, tObra + 1.26), 2), P = posRes(t), q = prog(t, tEntrega, tEntrega + .4), [u, v] = ejes(0, lerp(.1, .55, q), .06 * Math.sin(t * 2));
  enPlano(c, cam, P, sum3([0, 0, 0], u, a), sum3([0, 0, 0], v, a), 3.2, 1.05, (w, h) => {
    c.fillStyle = "rgba(20,18,14,.13)"; c.fillRect(8, 10, w, h);
    c.fillStyle = "#FDFCF8"; c.fillRect(0, 0, w, h); c.strokeStyle = ACENTO; c.lineWidth = 7; c.strokeRect(0, 0, w, h);
    texto(c, "resultado", 28, h / 2 + 24, { fuente: serif(74, true), color: TINTA, alin: "left" });
    palomita(c, w - 56, h / 2, .78, 1);
  });
}

function destellos(c: C, t: number, cam: Cam, xm: number, t1: number) {
  const d = t - t1; if (d < 0 || d > 1) return;
  const r = azar(41);
  for (let i = 0; i < 9; i++) {
    const P = cam.p(xm + (r() * 2 - 1) * 3.6, (r() * 2 - 1) * 1.2, .05), a = r() * .4, z = Math.sin(Math.PI * prog(d, a, a + .46)); if (!P || z <= 0) continue;
    c.save(); c.translate(P.x, P.y); c.fillStyle = TINTA; c.scale(z, z); c.beginPath();
    for (let k = 0; k < 8; k++) { const R = k % 2 ? 7 : 34, b = k * Math.PI / 4; c.lineTo(Math.cos(b) * R, Math.sin(b) * R); }
    c.closePath(); c.fill(); c.restore();
  }
}

// ---------- el orbe ----------
function orbe(c: C, t: number, cam: Cam) {
  const a = ease.outBack(prog(t, t0.planear - .1, t0.planear + .3), 1.6); if (a <= 0) return;
  const P = cam.p(.9, -.55, 0); if (!P) return;
  const z = P.s / 127, R = 106 * z * a, cy = P.y - 34 * z - R;
  if (t < tRompe) {
    c.fillStyle = TINTA; c.beginPath(); c.moveTo(P.x - 78 * z, P.y); c.lineTo(P.x + 78 * z, P.y); c.lineTo(P.x + 50 * z, P.y - 42 * z); c.lineTo(P.x - 50 * z, P.y - 42 * z); c.closePath(); c.fill();
    const g = c.createRadialGradient(P.x - R * .3, cy - R * .4, R * .1, P.x, cy, R);
    g.addColorStop(0, "#FFFFFF"); g.addColorStop(.55, "#DDE3E2"); g.addColorStop(1, "#8FA0A0");
    c.fillStyle = g; c.beginPath(); c.arc(P.x, cy, R, 0, 7); c.fill(); c.strokeStyle = TINTA; c.lineWidth = 5; c.stroke();
    c.save(); c.beginPath(); c.arc(P.x, cy, R - 3, 0, 7); c.clip();
    for (let i = 0; i < 3; i++) { const a2 = t * (1.2 + i * .5) + i * 2; c.strokeStyle = `rgba(60,70,70,${.2 + i * .1})`; c.lineWidth = 10 * z; c.beginPath(); c.arc(P.x + Math.cos(a2) * R * .3, cy + Math.sin(a2 * 1.3) * R * .3, R * (.42 - i * .08), a2, a2 + 3.4); c.stroke(); }
    texto(c, "?", P.x, cy + 46 * z, { fuente: serif(128 * z, true), color: "rgba(17,17,17,.74)" });
    c.restore();
    const gr = smooth(prog(t, tRompe - .22, tRompe));
    if (gr > 0) { const r2 = azar(8); c.strokeStyle = TINTA; c.lineWidth = 3; for (let i = 0; i < 9; i++) { let x = P.x, y = cy, b = r2() * 6.28; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 4; k++) { b += (r2() - .5); x += Math.cos(b) * R * .28 * gr; y += Math.sin(b) * R * .28 * gr; c.lineTo(x, y); } c.stroke(); } }
    return;
  }
  const d = t - tRompe; if (d > 1.6) return;
  const r = azar(77); c.strokeStyle = TINTA; c.lineWidth = 3;
  c.save(); c.beginPath(); c.rect(-100, -100, 1300, 1320); c.clip();
  for (let i = 0; i < 40; i++) {
    const b = r() * 6.28, v = 200 + r() * 620, gi = (r() - .5) * 9, tam = 14 + r() * 34, x = P.x + Math.cos(b) * (R * .7 + v * d), y = cy + Math.sin(b) * (R * .7 + v * d) + 1300 * d * d;
    c.save(); c.translate(x, y); c.rotate(gi * d); c.globalAlpha = 1 - smooth(prog(d, .7, 1.4)); c.fillStyle = "rgba(200,214,214,.7)"; c.beginPath(); c.moveTo(-tam, -tam * .4); c.lineTo(tam * .6, -tam); c.lineTo(tam, tam * .6); c.closePath(); c.fill(); c.stroke(); c.restore();
  }
  c.restore();
}

// ---------- la lluvia del primer cuadro y del último ----------
const LLUVIA = (() => { const r = azar(19); return Array.from({ length: 74 }, () => ({ x: (r() * 2 - 1) * (TX - .4), y: -1.4 + r() * 3, ph: r(), per: .85 + r() * .6, rx: r() * 3, ry: r() * 3, rz: r() * 6.28, w: .8 + r() * .7, sem: r(), lin: 1 + Math.floor(r() * 3), rojo: r() < .08, gris: r() * .2 })); })();
function lluvia(c: C, t: number, cam: Cam, a: number, b: number, front: boolean, X0B = 0) {
  if (t < a - .1 || t > b + 1.1) return;
  LLUVIA.forEach((h, i) => {
    if ((h.y < -.3) !== front) return;
    if (front && Math.abs(h.x + X0B) < 1.5) return;
    const u = (t - a) / h.per + h.ph, ci = Math.floor(u), f = u - ci, ini = a + (ci - h.ph) * h.per;
    if (ini > b) return;
    const z = 11.6 - 12 * f * f; if (z < .2) return;
    const [e1, e2] = ejes(h.ry + f * 2.2, h.rx + f * 3.6, h.rz + f * (h.sem - .5) * 7);
    hoja(c, cam, h.x + Math.sin(f * 5 + i) * .24, h.y, z, e1, e2, h.w, h.w * .66, h, t, 0, 1);
  });
}

// ---------- una hoja suelta ----------
function hoja(c: C, cam: Cam, x: number, y: number, z: number, u: V3, v: V3, w: number, h: number, H: { sem: number; lin: number; rojo: boolean; gris: number }, t: number, lav: number, esc: number) {
  const W = w * esc / 2, Hh = h * esc / 2;
  const P = (a: number, b: number) => cam.p(x + u[0] * a + v[0] * b, y + u[1] * a + v[1] * b, z + u[2] * a + v[2] * b);
  const A = P(-W, Hh), B = P(W, Hh), C2 = P(W, -Hh), D = P(-W, -Hh);
  if (!A || !B || !C2 || !D) return;
  const q = Math.floor(t * 10), n = H.sem * 997, j = (i: number) => (rnd(n + i + q * 13.1) - .5) * 2.2;
  const fr = (B.x - A.x) * (D.y - A.y) - (B.y - A.y) * (D.x - A.x) > 0;
  const g = Math.round(252 - H.gris * 34), col = fr ? `rgb(${g},${g - 1},${g - 6})` : "#E5E1D5";
  c.fillStyle = lav ? `rgba(${g},${g - 1},${g - 6},${1 - lav * .55})` : col;
  c.strokeStyle = `rgba(17,17,17,${(lav ? (1 - lav) * .7 : .78) + .02})`; c.lineWidth = 2.3;
  c.beginPath(); c.moveTo(A.x + j(0), A.y + j(1)); c.lineTo(B.x + j(2), B.y + j(3)); c.lineTo(C2.x + j(4), C2.y + j(5)); c.lineTo(D.x + j(6), D.y + j(7)); c.closePath(); c.fill(); c.stroke();
  if (!fr || lav > .4) return;
  const ar = Math.abs((B.x - A.x) * (D.y - A.y) - (B.y - A.y) * (D.x - A.x)); if (ar < 2600) return;
  c.strokeStyle = H.rojo ? ACENTO : "rgba(17,17,17,.52)"; c.lineWidth = H.rojo ? 5 : 2.4;
  for (let i = 0; i < H.lin; i++) {
    const f = .28 + i * .22, ax = lerp(A.x, D.x, f), ay = lerp(A.y, D.y, f), bx = lerp(B.x, C2.x, f), by = lerp(B.y, C2.y, f), ll = i === H.lin - 1 ? .55 : .82;
    c.beginPath(); c.moveTo(lerp(ax, bx, .12), lerp(ay, by, .12)); c.lineTo(lerp(ax, bx, ll), lerp(ay, by, ll)); c.stroke();
  }
}

const tarjFiesta: { txt: string; t: number; mx: number; mz: number; g: number }[] = [
  { txt: "lugar", t: t0.lug, mx: -1.8, mz: 1.2, g: -.09 }, { txt: "invitados", t: t0.inv, mx: 1.72, mz: 1.95, g: .08 }, { txt: "pastel", t: t0.pas, mx: -1.05, mz: 3.1, g: .07 },
  { txt: "música", t: t0.mus, mx: .95, mz: 4.2, g: -.1 }, { txt: "sorpresa", t: t0.sor, mx: -.05, mz: 5.35, g: .04 },
];
function tarjetasFiesta(c: C, t: number, cam: Cam) {
  if (t < t0.lug - .2 || t > PARTE + .5) return;
  const E = estado(t);
  tarjFiesta.forEach((N, i) => {
    const d = t - N.t + .08; if (d < 0) return;
    const entra = ease.outBack(prog(d, 0, .24), 1.3), va = ease.inOutCubic(prog(d, .56, .86));
    const B: V3 = [.05, -3.5, 4.5 + .1 * Math.sin(t * 2)], M: V3 = [N.mx + E.la * N.mz / HM, E.cy - 1.42 * (1 - N.mz / HM * .62), N.mz + E.alza];
    const x = lerp(lerp(0, B[0], entra), M[0], va), y = lerp(B[1], M[1], va), z = lerp(lerp(-2.2, B[2], entra), M[2], va) + Math.sin(Math.PI * va) * .8;
    const esc = lerp(1, .62, va), [u, v] = ejes(0, lerp(.02, .24, va), lerp(0, N.g, va) + (1 - entra) * .5 + Math.sin(Math.PI * va) * 1);
    // al partirse la montaña, cada una se va con su rebanada
    const cr = E.cr, o = 1 - smooth(prog(t, PARTE + .1, PARTE + .46));
    const dxp = cr * (reb(N.mx) - 2.5) * (.8 + .14 * N.mz);
    const A = o * (1 - smooth(prog(t, t0.emp - .3, t0.emp + .1))) + o * smooth(prog(t, tSlam2 - .1, tSlam2 + .3));
    if (A <= .01) return;
    c.save(); c.globalAlpha = A;
    enPlano(c, cam, [x + dxp, y, z], sum3([0, 0, 0], u, esc), sum3([0, 0, 0], v, esc), 3.5, 1.3, (w, h) => {
      c.fillStyle = "rgba(20,18,14,.15)"; c.fillRect(9, 11, w, h); c.fillStyle = "#FDFCF8"; c.fillRect(0, 0, w, h); c.strokeStyle = TINTA; c.lineWidth = 6; c.strokeRect(0, 0, w, h);
      pic(c, i, 66, h / 2 + 4); texto(c, N.txt, 128, h / 2 + 30, { fuente: serif(N.txt.length > 7 ? 80 : 92, true), color: TINTA, alin: "left", alfa: A });
    });
    c.restore();
  });
}

// ---------- montaña, charco y bola, ordenados por distancia ----------
function pila(c: C, t: number, cam: Cam) {
  const E = estado(t);
  const L: { d: number; f: () => void }[] = [];
  const fly = (h: Hoja) => { const a = tV(h.reb) + h.sem * .24; return ease.inOutCubic(prog(t, a, a + .52)); };
  const pon = (h: Hoja, x: number, y: number, z: number, rz: number, ry: number, esc: number, lav: number) => {
    const q = cam.p(x, y, z); if (!q) return;
    const [u, v] = ejes(ry, h.rx, rz);
    L.push({ d: q.zc, f: () => hoja(c, cam, x, y, z, u, v, h.w, h.h, h, t, lav, esc) });
  };
  if (t < tV(5) + 1) {
    for (const h of MONTE) {
      const k = clamp((E.n - h.u) / .07); if (k <= 0) continue;
      const fl = fly(h); if (fl >= 1) continue;
      let z = h.z * (1 - E.ap * .54) + E.alza, x = h.x * (1 + E.ap * .22) + E.la * h.z / HM, y = Math.max(h.y * (1 + E.ap * .4) + E.cy, -1.12);
      const cae = 1 - k; z += cae * cae * 11; const gi = cae * (h.sem - .5) * 10;
      let esc = 1, ry = h.ry;
      if (E.cr > 0) {
        const d = h.reb - 2.5, cx = (h.reb + .5) / 6 * 2 * RX * 1.15 - RX * 1.15, ax = cx + (x - cx) * lerp(1, .36, E.cr) + d * .22 * E.cr, a = d * .19 * E.cr, zz = z + 1.2;
        x = ax + zz * Math.sin(a); z += E.cr * (.16 + .1 * Math.sin(t * 1.7 + h.reb * 1.3));
        esc = lerp(1, .74, E.cr);
      }
      if (fl > 0) { const S = SLOT(h.reb), up = baja(t); x = lerp(x, S[0] + (h.sem - .5) * WP * .8, fl); y = lerp(y, S[1], fl); z = lerp(z, S[2] + up, fl); esc *= lerp(1, .4, fl); ry += fl * 3 * (h.sem - .5); }
      pon(h, x, y, z, h.rz + gi, ry, esc, E.lav);
    }
    if (E.ina > 0) for (const h of CHARCO) {
      const p = ease.outCubic(clamp((E.ina - h.sem * .6) / .4)); if (p <= 0) continue;
      const fl = fly(h); if (fl >= 1) continue;
      let x = lerp(h.x * .25, h.x, p), y = lerp(E.cy + .1, h.y, p), z = h.z + Math.sin(p * Math.PI) * .12, esc = 1;
      if (E.cr > 0) { x += (h.reb - 2.5) * .5 * E.cr; z += E.cr * .1 * h.sem; }
      if (fl > 0) { const S = SLOT(h.reb), up = baja(t); x = lerp(x, S[0], fl); y = lerp(y, S[1], fl); z = lerp(z, S[2] + up, fl); esc = lerp(1, .36, fl); }
      pon(h, x, y, z, h.rz, h.ry, esc, 0);
    }
  }
  L.sort((a, b) => b.d - a.d).forEach((o) => o.f());
}

/** Dos manos saliendo de la pila. Lo único que queda del agente. */
function manitas(c: C, t: number, cam: Cam, x0: number, y0: number, ini: number) {
  const k = ease.outBack(prog(t, ini, ini + .32), 1.6);
  for (const l of [-1, 1]) {
    const R = cam.p(x0 + l * .72, y0, .08); if (!R) continue;
    const g = R.s / 120, v = Math.sin(t * (l > 0 ? 13 : 11) + l) * 30 * g, A: [number, number] = [R.x + l * 26 * g + v, R.y - 170 * g * k + Math.cos(t * 9 + l) * 12 * g];
    brazo(c, R.x, R.y + 14 * g, A[0], A[1], l * 34 * g, .8 + .2 * Math.sin(t * 8 + l), TINTA, 1, g);
  }
  // tapas: papeles sobre la raíz de cada brazo
  const r = azar(5);
  for (let i = 0; i < 12; i++) {
    const l = i % 2 ? 1 : -1, x = x0 + l * (.72 + (r() - .5) * .6), z = .12 + r() * .24, H = { sem: r(), lin: 0, rojo: false, gris: r() * .2 };
    const [u, v] = ejes(0, .7 + r() * .3, r() * 6.28);
    hoja(c, cam, x, y0 - .1, z, u, v, .86, .56, H, t, 0, 1);
  }
}

function esquirlas(c: C, t: number, cam: Cam, x: number, z: number, t1: number, n: number, sem: number, f = 1) {
  const d = t - t1; if (d < 0 || d > 1.3) return;
  const r = azar(sem), P = cam.p(x, -1, z); if (!P) return;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI * r(), v = (240 + r() * 760) * f, w = 26 + r() * 38, gi = (r() - .5) * 12;
    const X = P.x + Math.cos(a) * v * d, Y = P.y + Math.sin(a) * v * d + 1500 * d * d;
    if (Y > 1288 && Math.abs(X - 540) < 470) continue;
    c.save(); c.translate(X, Y); c.rotate(gi * d); c.globalAlpha = 1 - smooth(prog(d, .75, 1.3)); c.fillStyle = "#FCFBF6"; c.strokeStyle = TINTA; c.lineWidth = 2.4; c.fillRect(-w / 2, -w * .33, w, w * .66); c.strokeRect(-w / 2, -w * .33, w, w * .66); c.restore();
  }
}

function confeti(c: C, t: number) {
  const d = t - tSello; if (d < 0) return;
  const r = azar(61);
  for (let i = 0; i < 110; i++) {
    const x0 = r() * 1120 - 20, v = 150 + r() * 230, f = r() * 6.3, y0 = -40 - r() * 900, y = y0 + d * v, x = x0 + Math.sin(t * 1.9 + f) * 30;
    if (y < -30 || y > 1268) continue;
    c.save(); c.translate(x, y); c.rotate(t * 2.6 + f); c.fillStyle = i % 3 === 0 ? ACENTO : TINTA; c.fillRect(-9, -4, 18, 9); c.restore();
  }
}

function aro(c: C, t: number, cam: Cam, a: number) {
  if (a <= 0) return;
  c.save(); c.globalAlpha = a; c.strokeStyle = ACENTO; c.lineWidth = 6; c.setLineDash([3, 22]); c.lineCap = "round"; c.lineDashOffset = -t * 190; c.beginPath();
  for (let i = 0; i <= 60; i++) { const b = i / 60 * 6.2832, p = cam.p(.4 + Math.cos(b) * 2.6, YP + Math.sin(b) * 1, .02); if (p) (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); }
  c.stroke(); c.restore();
}

// ---------- golpes de cámara ----------
const GOL: [number, number][] = [[HOOK[0], .36], [HOOK[1], .42], [HOOK[2], .5], [tSlam, 1.5], [tAlud, .8], ...ST.map((x, i) => [x + .12, .22 + i * .08] as [number, number]),
  [tSlam2, 1.6], [PARTE, 1.1], [tPosa, .2], [tCierra, .7], [tMesaCae, .4], [tHin + .55, .5], [tLlega, .4], [tAterriza, .4], [tRompe, .7], [tDeja + .24, .5]];
function punch(t: number) { let p = 0; for (const [g, f] of GOL) { const d = t - g; if (d >= 0 && d < .7) p += f * Math.exp(-d * 8.5); } return p; }

const V: Record<string, Vista> = {
  hook: { tx: 0, ty: .2, tz: 2.5, yaw: 0, pitch: .07, dist: 9.4 },
  ancho: { tx: 0, ty: 0, tz: 2.6, yaw: 0, pitch: .18, dist: 10.4 },
  cerca: { tx: 0, ty: -1.1, tz: 1.4, yaw: -.05, pitch: .3, dist: 8.3 },
  ancho2: { tx: 0, ty: 0, tz: 2.55, yaw: .05, pitch: .17, dist: 10.2 },
  monte: { tx: 0, ty: 0, tz: 2.6, yaw: 0, pitch: .13, dist: 10.8 },
  plan: { tx: 0, ty: .3, tz: 2.13, yaw: 0, pitch: .07, dist: 9.8 },
  rest: { tx: 3.3, ty: 1, tz: .86, yaw: .06, pitch: .12, dist: 3.9 },
  ayud: { tx: XH, ty: 0, tz: 2.6, yaw: 0, pitch: .18, dist: 10.4 },
  arriba: { tx: 0, ty: 0, tz: .5, yaw: 0, pitch: .95, dist: 10.6 },
  orbe: { tx: .1, ty: -.5, tz: 1.3, yaw: .05, pitch: .2, dist: 6.6 },
};
const CAM = [
  { t: -1, v: V.hook }, { t: tRew0, v: V.ancho, dur: .7 }, { t: t0.emp - .25, v: V.cerca, dur: .9 }, { t: t0.anth - .3, v: V.ancho2, dur: 1.5 }, { t: t0.sol - .5, v: V.monte, dur: 2.4 },
  { t: PARTE + .6, v: V.plan, dur: 2.2 }, { t: t0.sab - .5, v: V.rest, dur: .75 }, { t: tCae0 - .12, v: V.plan, dur: .6, curva: ease.outCubic }, { t: tPasa - .1, v: V.ayud, dur: 1.3 },
  { t: tSalta + .05, v: V.ancho, dur: 1.1 }, { t: t0.asi - .1, v: V.arriba, dur: 1.5 }, { t: t0.planear - .2, v: V.orbe, dur: .9 }, { t: tL0 - .1, v: V.hook, dur: .9 },
];

function dibuja(c: C, t: number) {
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  const cam = camara(guionCamara(t, CAM), 540, 880), p = punch(t);
  const sh = (a: number) => p * 15 * Math.sin(t * a);
  const z = 1.03 + .013 * Math.sin(t * .83) + .03 * Math.min(p, 1.6);
  c.save(); c.translate(540 + 9 * Math.sin(t * .71) + sh(83), 900 + 11 * Math.cos(t * .61) + sh(71)); c.rotate(.0045 * Math.sin(t * .47) + .004 * Math.min(p, 1) * Math.sin(t * 47)); c.scale(z, z); c.translate(-540, -900);
  polvo(c, t);
  const P1 = cam.p(0, TY + 1.4, PISO);
  if (P1) { c.strokeStyle = "rgba(17,17,17,.28)"; c.lineWidth = 3; c.beginPath(); c.moveTo(-200, P1.y); c.lineTo(1300, P1.y); c.stroke(); }

  const hatK = t < tRew1 ? 0 : ease.outBack(prog(t, t0.fiesta - .1, t0.fiesta + .2), 2);
  const zHat = (1 - clamp(hatK)) * 5;
  const zG = t < t0.fiesta ? 14 : lerp(14, 8.68, ease.outBack(prog(t, t0.fiesta, t0.fiesta + .55), 1.1));
  // el plan sube con la guirnalda; el cuadro final la recupera
  const zGb = t >= tSube ? zG + sube(t) * (1 - ease.outBack(prog(t, tL0, tL0 + .7), 1)) : zG;
  guirnalda(c, cam, t, zGb);
  planta(c, t, cam);
  mesa(c, cam, 0);
  if (t > tPasa - .6 && t < tAterriza + 1) mesa(c, cam, XH);
  restaurante(c, t, cam);
  aro(c, t, cam, smooth(prog(t, tOrb0 + .1, tOrb0 + .4)) * (1 - smooth(prog(t, tOrb1 - .2, tOrb1 + .1))));
  const E = estado(t);
  if (t < tSlam + .1) { const Q = cam.p(0, E.cy, 0); if (Q) sombra(c, Q.x, Q.y, RX * Q.s * 1.1, .3); }
  lluvia(c, t, cam, -.6, tG - .2, false);
  lluvia(c, t, cam, tL0, tDeja - .1, false);

  // ---------- bola ----------
  const enterrada = (t >= tSlam && t < tRew0 + .14) || (t >= tSlam2 && t < PARTE + .1);
  let b = recorre(t, KB);
  if (t >= tOrb0 + .3 && t < tOrb1 - .1) {
    const a = (t - tOrb0 - .3) / (tOrb1 - tOrb0 - .4) * VUELTAS * Math.PI * 2 - 2.4;
    b = { x: .4 + Math.cos(a) * 2.6, y: YP + Math.sin(a) * 1, z: Math.abs(Math.sin(a * 2)) * .12 };
  } else if (t >= tOrb0 && t < tOrb0 + .3) {
    const q = smooth(prog(t, tOrb0, tOrb0 + .3)), a = -2.4; b = { x: lerp(b.x, .4 + Math.cos(a) * 2.6, q), y: lerp(b.y, YP + Math.sin(a), q), z: Math.sin(q * Math.PI) * .3 };
  } else if (t >= tOrb1 - .1 && t < tOrb1 + .2) { const a = VUELTAS * Math.PI * 2 - 2.4, q = smooth(prog(t, tOrb1 - .1, tOrb1 + .2)); b = { x: lerp(.4 + Math.cos(a) * 2.6, -2.6, q), y: lerp(YP + Math.sin(a), -.7, q), z: Math.sin(q * Math.PI) * .4 }; }
  let bb = b;
  const brinco = t > tRew1 && t < t0.emp - .3 ? Math.abs(Math.sin(t * 2.2)) * .05 : 0;
  bb = { ...b, z: b.z + brinco };
  const pos = poseBola(t, bb);
  const vis = !enterrada;
  const ver = vis ? () => {
    const hz = hatK > 0 ? bb.z + zHat : bb.z;
    if (enLlamada(t)) cordon(c, t, cam, pos.m2);
    pintaBola(c, cam, bb, pos, 0);
    if (enLlamada(t)) { const H = cam.p(...pos.m2), q = smooth(prog(t, t0.llama - .16, t0.llama + .1)) * (1 - smooth(prog(t, tCae0 + .1, tCae0 + .3))); if (H && q > 0) auricular(c, H.x + 10, H.y - 30, -.35, H.s / 127 * 1.05 * q); }
    const A = cam.p(bb.x, bb.y, hz + RB);
    if (A && hatK > 0) gorro(c, A.x, A.y + (pos.sq ? 12 : 0), RB * A.s, clamp(hatK, 0, 1.2));
  } : null;

  dibGigante(c, t, cam);
  // La bola va delante de la pila salvo en el instante en que esta le cae encima.
  const debajo = (t >= tG - .02 && t < tRew0) || (t >= tSlam2 - .17 && t < PARTE + .1);
  if (debajo && ver) ver();
  pila(c, t, cam);
  tarjetasFiesta(c, t, cam);
  borde(c, cam, t, smooth(prog(t, t0.sinE - .1, t0.sinE + .1)) * (1 - smooth(prog(t, t0.sol - .5, t0.sol))) * (.6 + .4 * Math.sin(t * 16)));
  medias(c, t, cam);
  if (!debajo && ver) ver();

  if (t >= tSlam && t < tRew0 + .1) manitas(c, t, cam, 0, -1.2, tSlam + .22);
  if (t >= tSlam2 + .1 && t < PARTE + .1) manitas(c, t, cam, 0, -1.72, tSlam2 + .34);
  lluvia(c, t, cam, -.6, tG - .2, true);
  lluvia(c, t, cam, tL0, tDeja - .1, true, 1.25);

  // lo que se pinta encima de la pila
  regla(c, t, cam);
  tarjetaLugar(c, t, cam);
  sabado(c, t, cam);
  monteChico(c, t, cam);
  destellos(c, t, cam, XH, t0.limpia - .05);
  destellos(c, t, cam, 0, t0.desp - .1);

  // ---------- la otra bola ----------
  if (t >= tHel && t < tFuera + .8) {
    const h = recorre(t, KH), H = { x: h.x, y: h.y, z: h.z + entraH(t) }, w = Math.sin(t * 3.4) * .08;
    const carga = t >= tObra + 1 && t < tEntrega, R = posRes(t);
    const p2: Pose = t < tObra - .12
      ? { m1: [H.x - 1, H.y, H.z + .6 + w], m2: [H.x + 1, H.y, H.z + .9 - w], a1: .9, a2: .9 }
      : t < tObra + 1 ? { m1: [H.x - 1.3, H.y, H.z + .9 + Math.sin(t * 19) * .3], m2: [H.x + 1.3, H.y, H.z + .9 - Math.sin(t * 19) * .3], a1: .9, a2: .9 }
        : carga ? { m1: [R[0] - .9, R[1], R[2] - .48], m2: [R[0] + .9, R[1], R[2] - .48], a1: .85, a2: .85 } : { m1: [H.x - 1, H.y, H.z + .4 + w], m2: [H.x + 1, H.y, H.z + 1.1], a2: .85 };
    const hi = pintaBola(c, cam, H, p2, 0, t > tSalta && t < tAterriza ? -40 : 0);
    if (hi) gorro(c, hi.A.x, hi.A.y, hi.r, 1);
  }
  tarjetaRes(c, t, cam);
  orbe(c, t, cam);

  // ---------- la tarjeta que sí toma ----------
  if (t >= tAtrapa - .55) {
    const { P, cae, va } = cartaFinal(t);
    const [u, v] = ejes(0, va * .3, (1 - va) * .1 * Math.sin(t * 2.5) + cae * 2);
    enPlano(c, cam, P, u, v, 2.7, 1, (w, h) => {
      c.fillStyle = "rgba(20,18,14,.14)"; c.fillRect(9, 11, w, h);
      c.fillStyle = ACENTO; c.fillRect(0, 0, w, h);
      texto(c, "lo que sigue", w / 2 - (t >= tSello ? 40 : 0), h / 2 + 22, { fuente: serif(66, true), color: "#fff" });
      if (t >= tSello) palomita(c, w - 50, h / 2, .7, ease.outCubic(prog(t, tSello, tSello + .2)), "#fff");
    });
  }

  esquirlas(c, t, cam, 0, 0, tSlam, 54, 12, 1.2);
  esquirlas(c, t, cam, 0, 0, tAlud, 30, 16, .8);
  esquirlas(c, t, cam, 0, .4, tSlam2, 70, 21, 1.3);
  esquirlas(c, t, cam, 0, .3, PARTE, 34, 33, .9);
  mapa(c, t);
  confeti(c, t);
  c.restore();
  letreros(c, t);
}

function letreros(c: C, t: number) {
  const Y = 1466;
  rotulo(c, t, .86, 2.06, "todo de golpe", Y, 122, TINTA, true);
  rotulo(c, t, t0.arru - .06, tRew0 - .02, "lo va a arruinar", Y, 122, ACENTO, true);
  rotulo(c, t, t0.org, t0.lug - .3, "organiza la fiesta", Y, 116, TINTA, true);
  rotulo(c, t, t0.emp + .1, t0.mitad - .3, "todo a la vez", Y - 50, 116, TINTA, true);
  rotulo(c, t, t0.mitad - .02, t0.deja - .28, "a la mitad del trabajo", Y - 58, 100, TINTA, true);
  rotulo(c, t, t0.llena - .04, t0.deja - .28, "mesa llena", Y + 70, 124, TINTA);
  rotulo(c, t, t0.med - .24, t0.anth - .22, "todo a medias", Y - 30, 136, ACENTO, true);
  rotulo(c, t, t0.anth, t0.intent - .32, "Anthropic", Y, 148, TINTA);
  rotulo(c, t, t0.dem - .04, t0.quedaba - .08, "demasiado de una vez", Y, 104, TINTA, true);
  rotulo(c, t, t0.sinE - .04, t0.sol - .5, "sin espacio", Y, 146, ACENTO, true);
  rotulo(c, t, t0.ens + .1, t0.part - .32, "para estudiar", Y, 116, TINTA, true);
  rotulo(c, t, t0.part, t0.antes - .1, "partir el problema", Y, 118, ACENTO, true);
  rotulo(c, t, t0.escr, t0.lista - .32, "un plan", Y, 146, TINTA);
  rotulo(c, t, t0.lista, t0.uno - .18, "lista de pendientes", Y, 110, TINTA, true);
  rotulo(c, t, t0.hace - .04, t0.pero - .2, "uno a la vez", Y, 124, ACENTO, true);
  rotulo(c, t, t0.noes - .06, t0.es - .32, "no es un mapa", Y, 120, TINTA, true);
  rotulo(c, t, t0.es, t0.llama - .32, "una hipótesis", Y, 134, ACENTO, true);
  rotulo(c, t, t0.llama - .04, t0.sab - .3, "llama al restaurante", Y, 108, TINTA, true);
  rotulo(c, t, t0.cerr - .04, t0.cambia - .34, "sábado: cerrado", Y, 124, ACENTO, true);
  rotulo(c, t, t0.cambia, t0.buen - .22, "cambia la fecha", Y - 54, 112, TINTA, true);
  rotulo(c, t, t0.camb2, t0.buen - .22, "y a los invitados", Y + 58, 100, TINTA, true);
  rotulo(c, t, t0.rees - .04, t0.hay - .24, "reescribe su plan", Y - 40, 118, ACENTO, true);
  rotulo(c, t, t0.cada - .02, t0.hay - .24, "en cada vuelta", Y + 76, 100, TINTA, true);
  rotulo(c, t, t0.ayud - .04, t0.propia - .32, "un ayudante", Y - 40, 124, TINTA, true);
  if (t > t0.ayud) texto(c, "subagente", 540, Y + 54, { fuente: mono(58), color: GRIS, alfa: smooth(prog(t, t0.ayud + .1, t0.ayud + .3)) * (1 - smooth(prog(t, t0.propia - .32, t0.propia - .12))) });
  rotulo(c, t, t0.propia, t0.regresa - .3, "su propia mesa limpia", Y, 100, TINTA, true);
  rotulo(c, t, t0.solo - .08, t0.asi - .2, "solo el resultado", Y, 118, ACENTO, true);
  rotulo(c, t, t0.desp - .14, t0.planear - .28, "despejada", Y - 100, 150, TINTA, true);
  rotulo(c, t, t0.planear + .06, t0.saber - .3, "no es adivinar", Y, 126, TINTA, true);
  const fa = 1 - smooth(prog(t, DURACION - 1, DURACION - .4));
  if (t >= t0.saber) { const a = fa * smooth(prog(t, t0.saber, t0.saber + .2)); texto(c, "qué sigue", 540, Y - 30 + (1 - ease.outCubic(prog(t, t0.saber, t0.saber + .3))) * 18, { fuente: serif(150, true), color: ACENTO, alfa: a }); }
  if (t >= CUANDO) { const a = fa * smooth(prog(t, CUANDO, CUANDO + .2)); texto(c, "cuando todo cambia", 540, Y + 88 + (1 - ease.outCubic(prog(t, CUANDO, CUANDO + .3))) * 18, { fuente: serif(100, true), color: TINTA, alfa: a }); }
}

export const Pieza: React.FC = () => <Lienzo dibuja={(c, t) => dibuja(c, t)} preparar={() => ({})} />;
