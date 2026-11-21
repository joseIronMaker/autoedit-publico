// Serie 2, capítulo 25: el laboratorio. Una mesa de laboratorio de papel, con tubitos, frascos y una placa de cultivo
// a tinta. La bola con manos avienta una tarjeta parada (un frasco, una flecha, un ojo); el ojo se infla encima y lo que
// ve tiene una mancha al centro. Una mano humana con pipeta deja caer una gota: en la lupa, las células de papel se
// comen sus basuritas. Al lado, una silueta punteada y vacía: no en personas, todavía.
// Barrido a la izquierda, por la misma mesa: tres pilas de artículos alimentan a tres bolas (Robin, de FutureHouse): una
// lee, otra suelta tarjetitas con «?», otra dibuja un experimento; con un brazo de hule saca del estante un frasco viejo
// y deja la tarjeta «ripasudil → degeneración macular seca», con el ojo encima. Más a la derecha, cinco bolas alrededor
// de una mesa redonda se avientan tarjetas y se tachan (Co-Scientist); tres tarjetas vuelan a una placa con mini hígados
// de papel; una mano los prueba y dos dejan de cicatrizar. Silencio y la cámara se aleja: «fíjate quién hizo qué». En un
// tramo limpio de la mesa la bola levanta un abanico de tarjetas; una mano elige una, otra trae materiales, otra prueba.
// De la mesa brotan las cuatro esclusas (las de a21) y la cámara salta a un canal aparte: arriba el software cruza en un
// segundo; abajo la biología tiene tres compuertas (célula, ratón, persona) y un calendario que no deja de arrancar
// hojas; las ideas se amontonan frente a la primera. De vuelta en la mesa del principio, la bola avienta una tarjeta
// nueva («¿cura?») y una mano con pipeta decide; la silueta sigue punteada. Todo instante viene de eventos.json.
import React from "react";
import { azar, clamp, ease, lerp, prog, resorte, smooth, texto as textoKit } from "../../kit";
import { ACENTO, bola, GRIS, Lienzo, PAPEL, serif, sombra, TINTA } from "../../marca";
import { agente } from "../../personaje";
import duracion from "./duracion.json";
import ev from "./eventos.json";

export const DURACION = duracion.dur;
type C = CanvasRenderingContext2D;
type XY = { x: number; y: number };

// ---------- herramientas ----------
/** El texto del kit pisa globalAlpha; este lo multiplica, así los fundidos de cada grupo también lo apagan. */
const texto = (c: C, s: string, x: number, y: number, o: Parameters<typeof textoKit>[4]) => textoKit(c, s, x, y, { ...o, alfa: (o.alfa ?? 1) * c.globalAlpha });
let FR = 0;
const frac = (x: number) => x - Math.floor(x);
const tiembla = (j: number) => frac(Math.sin(j * 12.9898 + FR * 78.233) * 43758.5453) - .5;
const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * 6.2832 + f);
const ventana = (t: number, a: number, b: number, fi = .25, fo = .3) => smooth(prog(t, a, a + fi)) * (1 - smooth(prog(t, b, b + fo)));
const brota = (t: number, t0: number, f = 4.2, z = .38) => (t < t0 ? 0 : resorte(t - t0, f, z));
const mezcla = (a: XY, b: XY, k: number): XY => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) });
const arco = (a: XY, b: XY, u: number, h: number): XY => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) - h * 4 * u * (1 - u) });

const BLANCO = "#FDFCF8", CARTON = "#E6DCC6", CARTON_O = "#CDBF9F", PIEL = "#F3E6D6", HUMO = "#D8D2C5";
const MESA = "#ECE6D8", MESA_F = "#D6CDB9", AGAR = "#EFE1CF", AGUA = "rgba(146,174,184,.55)", AGUA_O = "#5F7F8B";
const HIGADO = "#E3C6B8", CICATRIZ = "#8E3B28", VERDE = "#4E7D57";

function rr(c: C, x: number, y: number, w: number, h: number, r: number) { c.beginPath(); c.roundRect(x, y, w, h, r); }
function caja(c: C, x: number, y: number, w: number, h: number, r: number, fill: string | null, ink: string | null = TINTA, g = 5) {
  rr(c, x, y, w, h, r);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (ink) { c.strokeStyle = ink; c.lineWidth = g; c.lineJoin = "round"; c.stroke(); }
}
function linea(c: C, ax: number, ay: number, bx: number, by: number, g: number, color = TINTA) {
  c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round"; c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke();
}
/** Línea a mano: tiembla a 10 cuadros por segundo, como dibujo animado. */
function trazo(c: C, ax: number, ay: number, bx: number, by: number, g: number, color = TINTA, sem = 0) {
  const j = 1.1;
  linea(c, ax + tiembla(sem) * j, ay + tiembla(sem + 3) * j, bx + tiembla(sem + 7) * j, by + tiembla(sem + 11) * j, g, color);
}
function circulo(c: C, x: number, y: number, r: number) { c.beginPath(); c.arc(x, y, Math.max(r, .01), 0, 6.2832); c.fill(); }
function aro(c: C, x: number, y: number, r: number, g: number, color = TINTA) { c.strokeStyle = color; c.lineWidth = g; c.beginPath(); c.arc(x, y, Math.max(r, .01), 0, 6.2832); c.stroke(); }
function elipse(c: C, x: number, y: number, rx: number, ry: number, fill: string | null, ink: string | null = TINTA, g = 4) {
  c.beginPath(); c.ellipse(x, y, Math.max(rx, .01), Math.max(ry, .01), 0, 0, 6.2832);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (ink) { c.strokeStyle = ink; c.lineWidth = g; c.stroke(); }
}
function palomita(c: C, x: number, y: number, s: number, k: number, color = VERDE, g = 11) {
  if (k <= 0) return;
  const P: [number, number][] = [[x - 26 * s, y], [x - 8 * s, y + 20 * s], [x + 30 * s, y - 26 * s]];
  const L0 = Math.hypot(18, 20) * s, L1 = Math.hypot(38, 46) * s, d = clamp(k) * (L0 + L1);
  c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath(); c.moveTo(P[0][0], P[0][1]);
  if (d <= L0) c.lineTo(lerp(P[0][0], P[1][0], d / L0), lerp(P[0][1], P[1][1], d / L0));
  else { c.lineTo(P[1][0], P[1][1]); c.lineTo(lerp(P[1][0], P[2][0], (d - L0) / L1), lerp(P[1][1], P[2][1], (d - L0) / L1)); }
  c.stroke();
}
function tache(c: C, x: number, y: number, s: number, k: number, color = ACENTO, g = 10) {
  const k1 = clamp(k * 2), k2 = clamp(k * 2 - 1);
  c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round";
  if (k1 > 0) { c.beginPath(); c.moveTo(x - s, y - s); c.lineTo(lerp(x - s, x + s, k1), lerp(y - s, y + s, k1)); c.stroke(); }
  if (k2 > 0) { c.beginPath(); c.moveTo(x + s, y - s); c.lineTo(lerp(x + s, x - s, k2), lerp(y - s, y + s, k2)); c.stroke(); }
}

// ---------- el mundo: la mesa corre de izquierda a derecha; la cubierta va de y=-520 (fondo) a 0 (borde) ----------
const B = -1520, B2 = -930, E = 1500, F = 2650, GX = 3950, HX = 7000;
const PLACA: XY = { x: -30, y: -285 }, S1: XY = { x: 190, y: -335 }, SIL = 225, LUPA: XY = { x: -30, y: -810 };
const MQ = { x: -300, piso: -395, r: 72 };

function pared(c: C, x0: number, x1: number) {
  // azulejos de laboratorio, muy tenues y anclados al mundo
  c.strokeStyle = "rgba(17,17,17,.055)"; c.lineWidth = 3;
  for (let y = -560; y > -2400; y -= 170) { c.beginPath(); c.moveTo(x0, y); c.lineTo(x1, y); c.stroke(); }
  for (let x = Math.floor(x0 / 170) * 170; x < x1; x += 170) { c.beginPath(); c.moveTo(x, -560); c.lineTo(x, -2400); c.stroke(); }
}
const VETAS = (() => { const r = azar(5); return Array.from({ length: 900 }, () => ({ x: -3200 + r() * 8600, y: -500 + r() * 480, L: 60 + r() * 220, d: (r() - .5) * 6 })); })();
const FIN_MESA = 5200;
function mesa(c: C, a: number, b: number) {
  const x0 = Math.floor(a / 260) * 260, x1 = Math.min(b, FIN_MESA);
  if (x1 <= x0) return;
  c.fillStyle = MESA; c.fillRect(x0, -520, x1 - x0, 520);
  // vetas de papel prensado, ancladas al mundo
  c.strokeStyle = "rgba(17,17,17,.07)"; c.lineWidth = 3; c.lineCap = "round";
  for (const v of VETAS) { if (v.x + v.L < x0 || v.x > x1) continue; c.beginPath(); c.moveTo(v.x, v.y); c.lineTo(Math.min(v.x + v.L, x1), v.y + v.d); c.stroke(); }
  c.fillStyle = MESA_F; c.fillRect(x0, 0, x1 - x0, 74);
  for (let x = x0; x < x1; x += 260) trazo(c, x, -520, Math.min(x + 260, x1), -520, 3.5, "rgba(17,17,17,.55)", x * .01);
  for (let x = x0; x < x1; x += 260) trazo(c, x, 0, Math.min(x + 260, x1), 0, 6, TINTA, x * .013);
  linea(c, x0, 74, x1, 74, 5);
  if (x1 === FIN_MESA) { linea(c, x1, -520, x1, 74, 6); }
  for (let x = Math.ceil((x0 - 120) / 900) * 900 + 120; x < x1; x += 900) caja(c, x - 26, 74, 52, 900, 4, MESA_F, TINTA, 5);
}

// ---------- utilería de laboratorio ----------
function tubos(c: C, x: number, y: number, t: number, sem = 1, s = 1) {
  const r = azar(sem);
  c.save(); c.translate(x, y); c.scale(s, s);
  caja(c, -130, -6, 260, 14, 4, CARTON_O, TINTA, 4);
  for (let k = 0; k < 5; k++) {
    const tx = -100 + k * 50, h = 150 + r() * 30, liq = .25 + r() * .4, col = k === 2 ? "rgba(192,68,42,.35)" : k % 2 ? "rgba(150,175,175,.45)" : "rgba(222,198,150,.55)";
    const ola = 2.5 * Math.sin(t * 2.3 + k);
    rr(c, tx - 13, -h, 26, h, 13); c.fillStyle = "rgba(255,255,255,.55)"; c.fill();
    c.save(); rr(c, tx - 13, -h, 26, h, 13); c.clip(); c.fillStyle = col; c.fillRect(tx - 14, -h * liq + ola, 28, h); c.restore();
    rr(c, tx - 13, -h, 26, h, 13); c.strokeStyle = TINTA; c.lineWidth = 3.5; c.stroke();
    linea(c, tx - 7, -h + 16, tx - 7, -30, 3, "rgba(255,255,255,.9)");
  }
  caja(c, -130, -70, 260, 26, 5, CARTON_O, TINTA, 4);
  c.restore();
}
function matraz(c: C, x: number, y: number, s: number, t: number, col = "rgba(150,175,175,.5)", sem = 2) {
  c.save(); c.translate(x, y); c.scale(s, s);
  const forma = () => { c.beginPath(); c.moveTo(-22, -190); c.lineTo(-22, -120); c.lineTo(-92, -8); c.quadraticCurveTo(-96, 0, -86, 0); c.lineTo(86, 0); c.quadraticCurveTo(96, 0, 92, -8); c.lineTo(22, -120); c.lineTo(22, -190); c.closePath(); };
  forma(); c.fillStyle = "rgba(255,255,255,.6)"; c.fill();
  c.save(); forma(); c.clip(); c.fillStyle = col; c.beginPath(); c.moveTo(-120, 0);
  for (let i = -120; i <= 120; i += 12) c.lineTo(i, -58 + 3 * Math.sin(i * .06 + t * 2.6 + sem)); c.lineTo(120, 0); c.closePath(); c.fill();
  c.fillStyle = "rgba(255,255,255,.85)";
  for (let k = 0; k < 4; k++) { const u = frac(t * .45 + k * .27 + sem * .13); circulo(c, -30 + k * 20 + Math.sin(t * 3 + k) * 4, -6 - u * 50, 4 + k % 2 * 2); }
  c.restore();
  forma(); c.strokeStyle = TINTA; c.lineWidth = 4.5; c.lineJoin = "round"; c.stroke();
  linea(c, -30, -194, 30, -194, 6);
  linea(c, -60, -30, -40, -62, 3.5, "rgba(255,255,255,.95)");
  c.restore();
}
/** Frasco de medicina: cuerpo, tapa y etiqueta. */
function frasco(c: C, x: number, y: number, s: number, o: { etiqueta?: string; polvo?: number; borde?: string; alto?: number } = {}) {
  const h = o.alto ?? 130;
  c.save(); c.translate(x, y); c.scale(s, s);
  caja(c, -40, -h, 80, h, 14, "#F6F1E6", TINTA, 4.5);
  caja(c, -32, -h - 30, 64, 32, 6, TINTA, null);
  caja(c, -40, -h * .74, 80, h * .48, 3, BLANCO, o.borde ?? TINTA, o.borde ? 5 : 3.5);
  if (o.etiqueta) texto(c, o.etiqueta, 0, -h * .5 + 7, { fuente: serif(20, true), color: TINTA });
  else { linea(c, -24, -h * .6, 22, -h * .6, 4); linea(c, -24, -h * .42, 10, -h * .42, 4); }
  if ((o.polvo ?? 0) > 0) { c.fillStyle = `rgba(150,140,120,${.4 * (o.polvo ?? 0)})`; c.fillRect(-32, -h - 34, 64, 6); }
  c.restore();
}

// ---------- placa de cultivo y lupa ----------
function placa(c: C, x: number, y: number, t: number, golpes: number[], s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  sombra(c, 0, 30, 210, .25);
  elipse(c, 0, 10, 170, 56, "rgba(205,215,212,.6)", TINTA, 4.5);
  elipse(c, 0, 0, 170, 56, AGAR, TINTA, 4.5);
  elipse(c, 0, 0, 150, 46, null, "rgba(17,17,17,.3)", 2.5);
  const r = azar(33); c.fillStyle = "rgba(17,17,17,.35)";
  for (let i = 0; i < 40; i++) { const a = r() * 6.28, d = Math.sqrt(r()); circulo(c, Math.cos(a) * d * 135 + Math.sin(t * .7 + i) * 1.5, Math.sin(a) * d * 40, 2.6); }
  for (const g of golpes) {
    const e = t - g; if (e < 0 || e > 1.5) continue;
    for (let k = 0; k < 3; k++) {
      const q = e - k * .2; if (q <= 0) continue;
      c.save(); c.globalAlpha *= (1 - smooth(prog(q, .1, 1.1))) * .8;
      elipse(c, 10, -4, 20 + q * 150, (20 + q * 150) * .32, null, AGUA_O, 3.5); c.restore();
    }
  }
  c.strokeStyle = "rgba(255,255,255,.95)"; c.lineWidth = 5; c.beginPath(); c.ellipse(0, 0, 162, 50, 0, 3.6, 4.4); c.stroke();
  c.restore();
}
/** Pipeta con gota: punta en (0,0) del marco local, apuntando abajo. La mano y la manga salen hacia arriba. */
function manoPipeta(c: C, x: number, y: number, ang: number, o: { gota?: number; aprieta?: number; manga?: number } = {}) {
  c.save(); c.translate(x, y); c.rotate(ang);
  const ap = o.aprieta ?? 0, mg = o.manga ?? .5;
  const dx = Math.sin(mg), dy = -Math.cos(mg);
  c.beginPath(); c.moveTo(-46, -214); c.lineTo(-46 + dx * 1800, -214 + dy * 1800); c.lineTo(52 + dx * 1800, -214 + dy * 1800); c.lineTo(52, -214); c.closePath();
  c.fillStyle = HUMO; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 6; c.stroke();
  linea(c, -46 + dx * 40, -214 + dy * 40, 52 + dx * 40, -214 + dy * 40, 4);
  c.beginPath(); c.moveTo(-3, 0); c.lineTo(-11, -78); c.lineTo(11, -78); c.lineTo(3, 0); c.closePath(); c.fillStyle = BLANCO; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 3.5; c.stroke();
  caja(c, -17, -240, 34, 164, 6, BLANCO, TINTA, 4);
  for (let k = 0; k < 5; k++) linea(c, -17, -110 - k * 22, -6, -110 - k * 22, 2.5);
  c.fillStyle = "rgba(150,175,175,.5)"; c.fillRect(-14, -100, 28, 22);
  caja(c, -11, -268 + ap * 14, 22, 30, 4, TINTA, null);
  caja(c, -50, -232, 92, 70, 26, PIEL, TINTA, 5);
  for (let k = 0; k < 3; k++) linea(c, 28, -220 + k * 18, 42, -220 + k * 18, 3.5);
  caja(c, -26, -284 + ap * 14, 44, 26, 12, PIEL, TINTA, 4.5);
  const g = o.gota ?? 0;
  if (g > .02) { c.fillStyle = "rgba(120,160,170,.85)"; c.strokeStyle = TINTA; c.lineWidth = 3; c.beginPath(); c.arc(0, 6 + g * 10, 9 * g + 2, 0, 6.2832); c.fill(); c.stroke(); }
  c.restore();
}
function gotaCae(c: C, x: number, y0: number, y1: number, t: number, ts: number, dur = .3) {
  const u = prog(t, ts, ts + dur); if (t < ts || u >= 1) return;
  const y = lerp(y0, y1, u * u);
  c.fillStyle = "rgba(120,160,170,.9)"; c.strokeStyle = TINTA; c.lineWidth = 3;
  c.beginPath(); c.moveTo(x, y - 26); c.quadraticCurveTo(x + 13, y - 2, x, y + 10); c.quadraticCurveTo(x - 13, y - 2, x, y - 26); c.fill(); c.stroke();
}
/** Una pipeta que entra, suelta su gota sobre la placa y se va. */
function pipetazo(c: C, t: number, tip: XY, ini: number, gota: number, fin: number, yDestino: number) {
  if (t < ini - .05 || t > fin + .7) return;
  const lejos = { x: tip.x + 760, y: tip.y - 900 };
  const entra = ease.outCubic(prog(t, ini, ini + .7)), sale = ease.inCubic(prog(t, fin, fin + .6));
  const p = mezcla(mezcla(lejos, tip, entra), lejos, sale);
  const ap = ventana(t, gota - .25, gota + .1, .15, .2);
  const gg = t < gota ? smooth(prog(t, gota - .4, gota)) : 0;
  manoPipeta(c, p.x + 3 * Math.sin(t * 7), p.y, .12 + .05 * Math.sin(t * 1.7), { gota: gg, aprieta: ap, manga: .55 });
  gotaCae(c, tip.x, tip.y + 10, yDestino, t, gota, .3);
}

type Cel = { x: number; y: number; r: number; f: number };
const CELS: Cel[] = [{ x: -92, y: -70, r: 58, f: 0 }, { x: 40, y: -96, r: 52, f: 1 }, { x: 112, y: 6, r: 50, f: 2 }, { x: -20, y: 30, r: 60, f: 3 }, { x: -120, y: 66, r: 46, f: 4 }, { x: 70, y: 110, r: 44, f: 5 }, { x: -138, y: -8, r: 34, f: 6 }];
const MOTAS = (() => { const r = azar(71); return Array.from({ length: 16 }, (_, i) => ({ x: (r() - .5) * 300, y: (r() - .5) * 300, f: r() * 6.28, cel: i % CELS.length, d: r() })); })();
/** Lo que se ve en la lupa: células de papel con basuritas. Después de `come`, cada una se traga las suyas. */
function celulas(c: C, t: number, come: number) {
  for (const m of MOTAS) {
    const cel = CELS[m.cel];
    let x = m.x + 14 * Math.sin(t * .9 + m.f), y = m.y + 14 * Math.cos(t * .7 + m.f * 1.3);
    const u = come < 0 ? 0 : ease.inOutCubic(prog(t, come + m.d * .9, come + m.d * .9 + .7));
    x = lerp(x, cel.x, u); y = lerp(y, cel.y, u);
    if (u > .98) continue;
    c.fillStyle = TINTA; c.globalAlpha = 1 - u * .6;
    c.beginPath(); c.moveTo(x - 7, y - 3); c.lineTo(x + 5, y - 7); c.lineTo(x + 8, y + 4); c.lineTo(x - 3, y + 7); c.closePath(); c.fill(); c.globalAlpha = 1;
  }
  for (const k of CELS) {
    const lleno = come < 0 ? 0 : smooth(prog(t, come + .4, come + 1.6));
    const r = k.r * (1 + .08 * lleno);
    c.beginPath();
    for (let i = 0; i <= 18; i++) {
      const a = i / 18 * 6.2832;
      const ond = 1 + .07 * Math.sin(a * 3 + t * 1.6 + k.f) + .05 * Math.sin(a * 5 - t * 2.1 + k.f * 2);
      const px = k.x + Math.cos(a) * r * ond, py = k.y + Math.sin(a) * r * ond * .86;
      if (i) c.lineTo(px, py); else c.moveTo(px, py);
    }
    c.closePath(); c.fillStyle = lleno > .5 ? "#F6E7DA" : "#F8F1E7"; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 4; c.stroke();
    c.fillStyle = GRIS; circulo(c, k.x + 6 * Math.sin(t + k.f), k.y - 4, r * .26);
    if (lleno > 0) { c.fillStyle = `rgba(17,17,17,${.45 * lleno})`; for (let i = 0; i < 3; i++) circulo(c, k.x - r * .3 + i * r * .25, k.y + r * .3, 4); }
  }
}
function lupa(c: C, x: number, y: number, R: number, t: number, k: number, come: number) {
  if (k <= .01) return;
  c.save(); c.translate(x, y); c.scale(k, k);
  c.save(); c.rotate(-.75); caja(c, -18, R + 6, 36, 150, 12, TINTA, null); c.restore();
  c.save(); c.beginPath(); c.arc(0, 0, R, 0, 6.2832); c.clip();
  c.fillStyle = "#F7F2EA"; c.fillRect(-R, -R, R * 2, R * 2);
  c.save(); c.scale(R / 200, R / 200); celulas(c, t, come); c.restore();
  const g = c.createLinearGradient(-R, -R, R * .3, R * .3); g.addColorStop(0, "rgba(255,255,255,.55)"); g.addColorStop(.4, "rgba(255,255,255,0)");
  c.fillStyle = g; c.fillRect(-R, -R, R * 2, R * 2);
  c.restore();
  aro(c, 0, 0, R, 14); aro(c, 0, 0, R - 9, 3, "rgba(255,255,255,.8)");
  c.restore();
}

// ---------- el ojo de papel y lo que ve ----------
function ojo(c: C, x: number, y: number, s: number, t: number, o: { mancha: number; arrugas?: number; alfa?: number }) {
  if (s <= .01) return;
  c.save(); c.translate(x, y); c.scale(s, s); c.globalAlpha *= o.alfa ?? 1;
  const ex = -175, vx = 175, VR = 135;
  c.save(); c.setLineDash([3, 14]); c.lineCap = "round"; c.lineDashOffset = -t * 30;
  linea(c, ex + 40, -6, vx - VR * .7, -VR * .72, 3.5, "rgba(17,17,17,.4)"); linea(c, ex + 40, 6, vx - VR * .7, VR * .72, 3.5, "rgba(17,17,17,.4)");
  c.restore();
  // lo que ve: una cara de papel; la mancha cae justo en el centro
  c.save(); c.beginPath(); c.arc(vx, 0, VR, 0, 6.2832); c.clip();
  c.fillStyle = BLANCO; c.fillRect(vx - VR, -VR, VR * 2, VR * 2);
  c.fillStyle = "#3a3936"; c.beginPath(); c.ellipse(vx, -6, 82, 96, 0, 3.3, 6.12); c.lineTo(vx + 86, 30); c.lineTo(vx - 86, 30); c.closePath(); c.fill();
  elipse(c, vx, 8, 66, 82, "#F3E6D6", TINTA, 4);
  c.fillStyle = TINTA; circulo(c, vx - 24, -6, 6); circulo(c, vx + 24, -6, 6);
  c.strokeStyle = TINTA; c.lineWidth = 4; c.lineCap = "round"; c.beginPath(); c.arc(vx, 22, 24, .4, 2.74); c.stroke();
  elipse(c, vx, 128, 110, 50, "#B9B2A3", TINTA, 4);
  const m = o.mancha;
  if (m > .01) {
    for (const [dx, dy, rr2] of [[0, 0, 1], [10, -8, .8], [-9, 6, .75]] as [number, number, number][]) {
      const R2 = VR * .55 * m * rr2 * (1 + .03 * Math.sin(t * 1.3 + dx));
      const g = c.createRadialGradient(vx + dx, dy, 0, vx + dx, dy, R2);
      g.addColorStop(0, "rgba(64,60,55,.92)"); g.addColorStop(.55, "rgba(64,60,55,.7)"); g.addColorStop(1, "rgba(64,60,55,0)");
      c.fillStyle = g; c.beginPath(); c.arc(vx + dx, dy, R2, 0, 6.2832); c.fill();
    }
  }
  c.restore();
  aro(c, vx, 0, VR, 6);
  const parp = Math.max(0, 1 - Math.abs(frac(t / 3.9 + .3) - .5) * 26);         // parpadea solo, cada 3.9 s
  c.save(); c.translate(ex, 0); c.scale(1, 1 - .9 * parp);
  c.beginPath(); c.moveTo(-150, 0); c.quadraticCurveTo(0, -120, 150, 0); c.quadraticCurveTo(0, 120, -150, 0); c.closePath();
  c.fillStyle = BLANCO; c.fill(); c.save(); c.clip();
  const mira = 8 * Math.sin(t * .6);
  c.fillStyle = "#C9C1B2"; circulo(c, 24 + mira, 0, 56);
  for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28; linea(c, 24 + mira + Math.cos(a) * 26, Math.sin(a) * 26, 24 + mira + Math.cos(a) * 52, Math.sin(a) * 52, 2.5, "rgba(17,17,17,.3)"); }
  c.fillStyle = TINTA; circulo(c, 24 + mira, 0, 25); c.fillStyle = "#fff"; circulo(c, 12 + mira, -12, 8);
  c.restore();
  c.beginPath(); c.moveTo(-150, 0); c.quadraticCurveTo(0, -120, 150, 0); c.quadraticCurveTo(0, 120, -150, 0); c.closePath(); c.strokeStyle = TINTA; c.lineWidth = 6; c.stroke();
  c.restore();
  for (let k = 0; k < 5; k++) { const a = -2.5 + k * .28, px = ex + Math.cos(a) * 120, py = -48 + Math.sin(a) * 30 * (1 - .9 * parp); linea(c, px, py, px + Math.cos(a) * 26, py + Math.sin(a) * 26 - 10, 4); }
  // ceja y patas de gallo: los años, con delicadeza
  const ar = o.arrugas ?? 0;
  c.strokeStyle = ar > 0 ? `rgba(120,116,108,${.6 + .4 * ar})` : TINTA; c.lineWidth = 9; c.lineCap = "round";
  c.beginPath(); c.moveTo(ex - 120, -96); c.quadraticCurveTo(ex, -150, ex + 130, -104); c.stroke();
  if (ar > .01) for (let k = 0; k < 3; k++) { const a = -.45 + k * .45; const k2 = clamp(ar * 3 - k); linea(c, ex + 165, a * 30, ex + 165 + Math.cos(a) * 46 * k2, a * 30 + Math.sin(a) * 46 * k2, 4, "rgba(17,17,17,.7)"); }
  c.restore();
}

// ---------- la tarjeta parada ----------
function tarjeta(c: C, x: number, yb: number, w: number, h: number, o: { rot?: number; k?: number; alfa?: number; borde?: string; dib?: (c: C) => void; sem?: number; tacha?: number }) {
  const k = o.k ?? 1; if (k <= .01 || (o.alfa ?? 1) <= .01) return;
  c.save(); c.globalAlpha *= o.alfa ?? 1;
  sombra(c, x, yb + 2, w * .62 * Math.min(k, 1), .26);
  c.translate(x, yb); c.rotate(o.rot ?? 0); c.scale(k, k);
  c.fillStyle = CARTON_O; c.beginPath(); c.moveTo(-w * .34, 0); c.lineTo(w * .34, 0); c.lineTo(w * .24, -14); c.lineTo(-w * .24, -14); c.closePath(); c.fill();
  const j = (n: number) => tiembla((o.sem ?? 0) + n) * 1.4;
  c.beginPath(); c.moveTo(-w / 2 + j(1), -h + j(2)); c.lineTo(w / 2 + j(3), -h + j(4)); c.lineTo(w / 2 + j(5), -6 + j(6)); c.lineTo(-w / 2 + j(7), -6 + j(8)); c.closePath();
  c.fillStyle = BLANCO; c.fill(); c.strokeStyle = o.borde ?? TINTA; c.lineWidth = 5; c.lineJoin = "round"; c.stroke();
  c.save(); c.translate(-w / 2, -h); o.dib?.(c); c.restore();
  if ((o.tacha ?? 0) > 0) tache(c, 0, -h / 2 - 3, Math.min(w, h) * .34, o.tacha ?? 0, ACENTO, 11);
  c.restore();
}
function renglones(c: C, w: number, h: number, sem: number, n = 3) {
  const r = azar(sem);
  for (let i = 0; i < n; i++) { const y = h * (i + 1) / (n + 1), L = w * (.45 + r() * .35); linea(c, w * .14, y, w * .14 + L, y, 6, "rgba(17,17,17,.75)"); }
}
function iconoOjo(c: C, x: number, y: number, s: number, mancha: number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.beginPath(); c.moveTo(-60, 0); c.quadraticCurveTo(0, -50, 60, 0); c.quadraticCurveTo(0, 50, -60, 0); c.closePath(); c.fillStyle = BLANCO; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 6; c.stroke();
  c.fillStyle = TINTA; circulo(c, 0, 0, 16);
  if (mancha > 0) { const g = c.createRadialGradient(0, 0, 0, 0, 0, 30); g.addColorStop(0, `rgba(64,60,55,${.6 * mancha})`); g.addColorStop(1, "rgba(64,60,55,0)"); c.fillStyle = g; circulo(c, 0, 0, 30); }
  c.restore();
}
function flechaDer(c: C, x0: number, x1: number, y: number, k: number, g = 7) {
  if (k <= 0) return;
  const xe = lerp(x0, x1, k);
  linea(c, x0, y, xe, y, g);
  if (k > .6) { c.fillStyle = TINTA; c.beginPath(); c.moveTo(xe + 6, y); c.lineTo(xe - 18, y - 15); c.lineTo(xe - 18, y + 15); c.closePath(); c.fill(); }
}
function revela(c: C, x0: number, w: number, k: number, f: () => void) {
  if (k <= 0) return;
  c.save(); c.beginPath(); c.rect(x0 - 10, -2000, (w + 20) * clamp(k), 4000); c.clip(); f(); c.restore();
}
/** «¿cura?» con el signo en rojo y sin encimarse. */
function cura(c: C, x: number, y: number, px: number) {
  c.font = serif(px, true);
  const w1 = c.measureText("¿cura").width, w2 = c.measureText("?").width, x0 = x - (w1 + w2) / 2;
  texto(c, "¿cura", x0, y, { fuente: serif(px, true), color: TINTA, alin: "left" });
  texto(c, "?", x0 + w1 + 2, y, { fuente: serif(px, true), color: ACENTO, alin: "left" });
}

// ---------- la silueta vacía ----------
function silueta(c: C, x: number, base: number, alfa: number, dibujo: number, t: number) {
  if (alfa <= .01) return;
  const top = base - 560;
  c.save(); c.globalAlpha *= alfa;
  const cuerpo = () => { c.beginPath(); c.moveTo(x - 180, base); c.lineTo(x - 180, top + 300); c.bezierCurveTo(x - 180, top + 196, x - 116, top + 176, x, top + 176); c.bezierCurveTo(x + 116, top + 176, x + 180, top + 196, x + 180, top + 300); c.lineTo(x + 180, base); };
  cuerpo(); c.fillStyle = "rgba(255,255,255,.45)"; c.fill();
  c.beginPath(); c.arc(x, top + 80, 72, 0, 6.2832); c.fill();
  c.setLineDash([12, 16]); c.lineDashOffset = -t * 18; c.strokeStyle = "rgba(17,17,17,.62)"; c.lineWidth = 5; c.lineCap = "round";
  // se dibuja de abajo hacia arriba; la cabeza se cierra al final
  const sube = 420 * smooth(prog(dibujo, 0, .65));
  c.save(); c.beginPath(); c.rect(x - 260, base - sube - 4, 520, sube + 14); c.clip(); cuerpo(); c.stroke(); c.restore();
  if (dibujo > .6) { c.beginPath(); c.arc(x, top + 80, 72, Math.PI / 2, Math.PI / 2 + 6.2832 * smooth(prog(dibujo, .6, 1))); c.stroke(); }
  c.restore();
}

// ---------- la pila de artículos ----------
const PILAS = [{ dx: -210, H: 450, w: 230 }, { dx: 0, H: 570, w: 250 }, { dx: 200, H: 380, w: 215 }];
function pila(c: C, x: number, base: number, t: number) {
  sombra(c, x, base + 10, 420, .3);
  PILAS.forEach((P0, j) => {
    const r = azar(91 + j), n = Math.floor(P0.H / 10);
    const xc = x + P0.dx;
    for (let i = 0; i < n; i++) {
      const y = base - i * 10, sube = i / n;
      const dx = (r() - .5) * 14 + Math.sin(i * .09 + j) * 10 * sube + Math.sin(t * .9 + j) * 6 * sube * sube;
      const w = P0.w + (r() - .5) * 20, sale = r() < .07;
      c.fillStyle = i % 2 ? BLANCO : "#F2EDE2"; c.fillRect(xc - w / 2 + dx, y - 10, w, 11);
      linea(c, xc - w / 2 + dx, y, xc + w / 2 + dx, y, 2.2, "rgba(17,17,17,.62)");
      if (sale) { const sx = (r() < .5 ? -1 : 1); c.save(); c.translate(xc + dx + sx * (w / 2 - 20), y - 5); c.rotate(sx * (.08 + r() * .1)); caja(c, -40, -4, 80, 8, 1, BLANCO, TINTA, 2.2); c.restore(); }
    }
    const top = base - n * 10;
    linea(c, xc - P0.w / 2 - 6, base, xc - P0.w / 2 + Math.sin(j) * 10, top, 4.5); linea(c, xc + P0.w / 2 + 6, base, xc + P0.w / 2 + Math.sin(j) * 10, top, 4.5);
    caja(c, xc - P0.w / 2 + Math.sin(t * .9 + j) * 6, top - 12, P0.w, 12, 2, BLANCO, TINTA, 3.5);
  });
}
function hojaVuela(c: C, x: number, y: number, s: number, rot: number, alfa: number, sem: number) {
  if (alfa <= .01) return;
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s); c.globalAlpha *= alfa;
  caja(c, -42, -56, 84, 112, 3, BLANCO, TINTA, 3.5);
  const r = azar(sem); for (let i = 0; i < 6; i++) linea(c, -28, -36 + i * 15, -28 + 30 + r() * 26, -36 + i * 15, 3, "rgba(17,17,17,.6)");
  c.restore();
}

// ---------- estante ----------
const XEST = B + 20, BOT = [0, 1, 2, 3, 4, 5].map((k) => ({ x: XEST - 160 + k * 64, h: [120, 104, 132, 112, 126, 98][k] }));
const RIPA_I = 3, YEST = -1000, SEST = .85;
function estante(c: C, t: number) {
  for (let i = 0; i < BOT.length; i++) {
    if (i === RIPA_I && t > ev.existe) continue;
    frasco(c, BOT[i].x, YEST, SEST, { alto: BOT[i].h, polvo: 1 });
  }
  caja(c, XEST - 200, YEST, 400, 22, 3, CARTON_O, TINTA, 4.5);
  linea(c, XEST - 160, YEST + 22, XEST - 140, YEST + 70, 6); linea(c, XEST + 160, YEST + 22, XEST + 140, YEST + 70, 6);
}

// ---------- hígados ----------
function pathHigado(c: C) {
  c.beginPath();
  c.moveTo(-200, -30);
  c.bezierCurveTo(-190, -112, -60, -120, 40, -96);
  c.bezierCurveTo(120, -80, 190, -72, 206, -42);
  c.bezierCurveTo(218, -14, 150, 10, 70, 30);
  c.bezierCurveTo(10, 50, -40, 102, -110, 106);
  c.bezierCurveTo(-182, 110, -212, 40, -200, -30);
  c.closePath();
}
const CIC = (() => { const r = azar(17); return Array.from({ length: 46 }, () => ({ x: -180 + r() * 370, y: -95 + r() * 190, a: -.8 + r() * .5, l: 26 + r() * 30, u: r() })); })();
function higado(c: C, x: number, y: number, s: number, fib: number, t: number, g = 6) {
  c.save(); c.translate(x, y); c.scale(s, s);
  pathHigado(c); c.fillStyle = HIGADO; c.fill();
  c.save(); pathHigado(c); c.clip();
  c.fillStyle = "rgba(255,255,255,.35)"; c.beginPath(); c.ellipse(-60, -50, 110, 30, -.15, 0, 6.28); c.fill();
  for (const k of CIC) {
    const v = clamp((fib - k.u * .9) * 6); if (v <= 0) continue;
    const L = k.l * v;
    c.strokeStyle = CICATRIZ; c.lineWidth = 5; c.lineCap = "round"; c.globalAlpha = .85;
    c.beginPath(); c.moveTo(k.x, k.y); c.lineTo(k.x + Math.cos(k.a) * L, k.y + Math.sin(k.a) * L + 2 * Math.sin(t * 2 + k.x)); c.stroke();
    c.globalAlpha = 1;
  }
  c.restore();
  pathHigado(c); c.strokeStyle = TINTA; c.lineWidth = g; c.lineJoin = "round"; c.stroke();
  c.strokeStyle = "rgba(17,17,17,.5)"; c.lineWidth = g * .6; c.beginPath(); c.moveTo(40, -96); c.quadraticCurveTo(10, -20, 30, 36); c.stroke();
  c.restore();
}
const POZOS = [F - 180, F, F + 180], YPOZO = -250;
function fibEn(t: number) { return .38 + .3 * smooth(prog(t, ev.fibrosis, ev.probaron + 1)) + .25 * smooth(prog(t, ev.probaron + 1, ev.fijate)); }
function fibPozo(i: number, t: number) {
  if (i === 1 || t < ev.frenan) return fibEn(t);
  const d = i === 2 ? .22 : 0;
  return lerp(fibEn(ev.frenan), fibEn(ev.frenan) - .2, smooth(prog(t, ev.frenan - .1 + d, ev.frenan + .8 + d)));
}
function placaPozos(c: C, t: number) {
  const y = YPOZO;
  sombra(c, F, y + 70, 380, .25);
  caja(c, F - 280, y - 40, 560, 110, 14, "#EEF0EC", TINTA, 5);
  c.fillStyle = "rgba(255,255,255,.7)"; c.fillRect(F - 270, y - 32, 540, 18);
  for (let i = 0; i < 3; i++) {
    const x = POZOS[i];
    elipse(c, x, y, 82, 30, "#D9E2E0", TINTA, 4);
    c.save(); c.beginPath(); c.ellipse(x, y, 80, 28, 0, 0, 6.2832); c.clip();
    c.fillStyle = "rgba(150,175,175,.35)"; c.fillRect(x - 90, y - 30, 180, 60);
    higado(c, x, y - 2 + Math.sin(t * 1.4 + i) * 2, .3, fibPozo(i, t), t, 9);
    c.restore();
    elipse(c, x, y, 82, 30, null, TINTA, 4);
  }
}

// ---------- esclusas ----------
type Icono = (c: C, t: number) => void;
function esclusa(c: C, x: number, base: number, w: number, h: number, o: { abre?: number; icono?: Icono; t: number; alza?: number; borde?: string; tam?: number }) {
  const alza = o.alza ?? 1; if (alza <= .01) return;
  c.save(); c.translate(x, base); c.scale(1, alza);
  const pw = 30, tam = o.tam ?? 130;
  caja(c, -w / 2 - pw, -h, pw, h, 4, CARTON_O, TINTA, 5);
  caja(c, w / 2, -h, pw, h, 4, CARTON_O, TINTA, 5);
  const lv = (o.abre ?? 0) * h * .55;
  c.save(); c.beginPath(); c.rect(-w / 2, -h, w, h + 6); c.clip();
  caja(c, -w / 2 + 4, -h * .62 - lv, w - 8, h * .62, 3, CARTON, TINTA, 4.5);
  for (let k = 1; k < 5; k++) linea(c, -w / 2 + 10, -h * .62 - lv + k * h * .62 / 5, w / 2 - 10, -h * .62 - lv + k * h * .62 / 5, 2.4, "rgba(17,17,17,.45)");
  c.restore();
  caja(c, -w / 2 - pw - 14, -h - 26, w + pw * 2 + 28, 28, 4, CARTON_O, TINTA, 5);
  if (o.icono) {
    linea(c, -26, -h - 26, -26, -h - 60, 5); linea(c, 26, -h - 26, 26, -h - 60, 5);
    c.save(); c.translate(0, -h - 60 - tam / 2);
    c.fillStyle = "rgba(20,18,14,.12)"; rr(c, -tam / 2 + 6, -tam / 2 + 8, tam, tam, 12); c.fill();
    caja(c, -tam / 2, -tam / 2, tam, tam, 12, BLANCO, o.borde ?? TINTA, o.borde ? 9 : 5);
    c.fillStyle = TINTA; circulo(c, -tam / 2 + 14, -tam / 2 + 14, 3.2); circulo(c, tam / 2 - 14, -tam / 2 + 14, 3.2);
    c.scale(tam / 130, tam / 130); o.icono(c, o.t);
    c.restore();
  }
  c.restore();
}
const icoCaja = (ok: number, mal: number): Icono => (c) => {
  c.strokeStyle = TINTA; c.lineWidth = 7; c.lineJoin = "round"; c.strokeRect(-34, -34, 68, 68);
  if (ok > 0) palomita(c, 0, 0, 1, ok, VERDE, 11);
  if (mal > 0) tache(c, 0, 0, 22, mal, ACENTO, 11);
};
const icoFlecha: Icono = (c) => {
  c.strokeStyle = TINTA; c.fillStyle = TINTA; c.lineWidth = 9; c.lineCap = "round";
  c.beginPath(); c.arc(0, 0, 32, -.5, 4.1); c.stroke();
  const ax = Math.cos(4.3) * 32, ay = Math.sin(4.3) * 32, tx = -Math.sin(4.3), ty = Math.cos(4.3);
  c.beginPath(); c.moveTo(ax - tx * 4 + Math.cos(4.3) * 15, ay - ty * 4 + Math.sin(4.3) * 15); c.lineTo(ax - tx * 22, ay - ty * 22); c.lineTo(ax - tx * 4 - Math.cos(4.3) * 15, ay - ty * 4 - Math.sin(4.3) * 15); c.closePath(); c.fill();
};
const icoMarco: Icono = (c) => {
  c.strokeStyle = TINTA; c.lineWidth = 4; c.setLineDash([7, 7]); c.strokeRect(-26, -20, 52, 40); c.setLineDash([]);
  c.lineWidth = 9; c.lineCap = "square";
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { c.beginPath(); c.moveTo(sx * 38, sy * 30 - sy * 16); c.lineTo(sx * 38, sy * 30); c.lineTo(sx * 38 - sx * 16, sy * 30); c.stroke(); }
};
const icoBalanza: Icono = (c, t) => {
  const th = .12 * Math.sin(t * 1.3);
  c.strokeStyle = TINTA; c.fillStyle = TINTA; c.lineWidth = 5; c.lineCap = "round";
  linea(c, 0, 38, 0, -22, 5); linea(c, -18, 38, 18, 38, 5);
  c.save(); c.translate(0, -24); c.rotate(th); linea(c, -38, 0, 38, 0, 5);
  for (const sx of [-1, 1]) { c.save(); c.translate(sx * 36, 0); c.rotate(-th); linea(c, 0, 0, -10, 22, 2.5); linea(c, 0, 0, 10, 22, 2.5); c.beginPath(); c.moveTo(-15, 22); c.lineTo(15, 22); c.quadraticCurveTo(0, 34, -15, 22); c.fill(); c.restore(); }
  c.restore(); circulo(c, 0, -24, 5);
};
const icoCelula: Icono = (c, t) => {
  c.beginPath();
  for (let i = 0; i <= 16; i++) { const a = i / 16 * 6.28, r = 40 * (1 + .07 * Math.sin(a * 3 + t * 2)); if (i) c.lineTo(Math.cos(a) * r, Math.sin(a) * r * .85); else c.moveTo(Math.cos(a) * r, Math.sin(a) * r * .85); }
  c.closePath(); c.fillStyle = "#F6E7DA"; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 5; c.stroke();
  c.fillStyle = GRIS; circulo(c, 4, -2, 13);
};
function raton(c: C, x: number, y: number, s: number, t: number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  c.strokeStyle = TINTA; c.lineWidth = 4; c.lineCap = "round"; c.beginPath(); c.moveTo(34, 8); c.bezierCurveTo(60, 10, 64, -16, 52 + 6 * Math.sin(t * 5), -26); c.stroke();
  c.beginPath(); c.moveTo(-44, 10); c.bezierCurveTo(-46, -26, 0, -34, 36, 10); c.closePath(); c.fillStyle = "#E7E2D8"; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 5; c.stroke();
  elipse(c, -26, -20, 12, 12, "#F3E6D6", TINTA, 4);
  c.fillStyle = TINTA; circulo(c, -40, -4, 3.5); circulo(c, -48, 8, 3);
  c.restore();
}
const icoRaton: Icono = (c, t) => raton(c, 4, 12, 1.05, t);
const icoPersona: Icono = (c) => {
  c.save(); c.setLineDash([6, 8]); c.strokeStyle = TINTA; c.lineWidth = 5; c.lineCap = "round";
  c.beginPath(); c.arc(0, -16, 18, 0, 6.28); c.stroke();
  c.beginPath(); c.moveTo(-36, 40); c.quadraticCurveTo(-36, 6, 0, 6); c.quadraticCurveTo(36, 6, 36, 40); c.stroke(); c.restore();
};

// ---------- barquito de papel ----------
function barco(c: C, x: number, y: number, rot: number, carga: (c: C) => void, s = 1) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  carga(c);
  c.beginPath(); c.moveTo(-96, -14); c.lineTo(96, -14); c.lineTo(66, 30); c.lineTo(-66, 30); c.closePath();
  c.fillStyle = BLANCO; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 5; c.lineJoin = "round"; c.stroke();
  linea(c, -96, -14, -48, 30, 2.6); linea(c, 96, -14, 48, 30, 2.6);
  c.restore();
}
function aguaBanda(c: C, x0: number, x1: number, y: number, h: number, t: number) {
  c.beginPath(); c.moveTo(x0, y + h);
  for (let x = x0; x <= x1; x += 20) c.lineTo(x, y + 4 * Math.sin(x * .03 + t * 3));
  c.lineTo(x1, y + h); c.closePath(); c.fillStyle = AGUA; c.fill();
  c.beginPath(); for (let x = x0; x <= x1; x += 20) { const yy = y + 4 * Math.sin(x * .03 + t * 3); if (x === x0) c.moveTo(x, yy); else c.lineTo(x, yy); }
  c.strokeStyle = AGUA_O; c.lineWidth = 4; c.stroke();
  linea(c, x0, y + h, x1, y + h, 6);
  const r = azar(Math.floor(y));
  for (let i = 0; i < 14; i++) { const xx = x0 + frac(r() + t * (.05 + r() * .05)) * (x1 - x0), yy = y + 20 + r() * (h - 40); linea(c, xx, yy, xx + 30, yy, 3, "rgba(95,127,139,.5)"); }
}
function cronometro(c: C, x: number, y: number, R: number, vel: number) {
  linea(c, x, y - R - 4, x, y - R - 22, 8); caja(c, x - 20, y - R - 40, 40, 20, 5, TINTA, null);
  c.fillStyle = BLANCO; circulo(c, x, y, R); aro(c, x, y, R, 8);
  for (let k = 0; k < 12; k++) { const a = k / 12 * 6.28; linea(c, x + Math.cos(a) * R * .76, y + Math.sin(a) * R * .76, x + Math.cos(a) * R * .9, y + Math.sin(a) * R * .9, k % 3 ? 3 : 5); }
  const a = -Math.PI / 2 + vel;
  linea(c, x, y, x + Math.cos(a) * R * .8, y + Math.sin(a) * R * .8, 7, ACENTO);
  c.fillStyle = TINTA; circulo(c, x, y, 9);
}
function calendario(c: C, x: number, y: number, t: number, hojas: number[]) {
  const w = 190, h = 200;
  sombra(c, x, y + h / 2 + 8, 120, .2);
  caja(c, x - w / 2, y - h / 2, w, h, 8, BLANCO, TINTA, 5);
  caja(c, x - w / 2, y - h / 2, w, 44, 8, ACENTO, TINTA, 5);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) caja(c, x - w / 2 + 18 + j * 32, y - h / 2 + 60 + i * 32, 24, 22, 3, null, "rgba(17,17,17,.5)", 2.5);
  for (const sx of [-1, 1]) aro(c, x + sx * 44, y - h / 2 - 2, 12, 5);
  for (const ti of hojas) {
    const e = t - ti; if (e < 0 || e > .7) continue;
    c.save(); c.translate(x - w / 2 + e * 260, y - h / 2 + 44 - e * 200 + e * e * 500); c.rotate(-e * 3);
    c.globalAlpha *= 1 - e / .7;
    caja(c, 0, 0, w, h - 44, 6, BLANCO, TINTA, 4);
    c.restore();
  }
}

// ---------- estación A: la mesa de casa ----------
const LANZA = () => ev.nueva - .5;
function cartaNueva(t: number, bx: number, by: number): XY {
  if (t >= ev.nueva) return S1;
  if (t < LANZA()) return { x: bx + 150, y: by - 150 };
  return arco({ x: bx + 150, y: by - 150 }, S1, prog(t, LANZA(), ev.nueva), 220);
}
function bolaMesa(c: C, t: number) {
  const r = MQ.r, bob = Math.abs(Math.sin(t * 3.4)) * 6;
  const cx = MQ.x + 4 * Math.sin(t * 1.3), cy = MQ.piso - r - bob;
  let m1: XY = { x: cx - 140, y: cy + 50 + 10 * Math.sin(t * 2.2) }, m2: XY = { x: cx + 140, y: cy + 40 + 10 * Math.cos(t * 2.4) };
  // el lanzamiento del arranque
  if (t < 1.2) { const k = 1 - smooth(prog(t, .35, 1.1)); m2 = mezcla(m2, { x: cx + 230, y: cy - 200 }, k); }
  // señala el ojo
  const se = ventana(t, ev.ceguera, ev.lab, .3, .4);
  if (se > 0) m1 = mezcla(m1, { x: cx + 30, y: cy - 250 }, se);
  // pone la tarjeta nueva: la mano va con ella
  const pn = ventana(t, ev.proponer - .45, LANZA() + .1, .4, .1);
  if (pn > 0) { const q = cartaNueva(t, cx, cy); m2 = mezcla(m2, { x: q.x - 20, y: q.y - 90 }, pn); }
  if (t > LANZA() && t < LANZA() + 1) { const k = 1 - smooth(prog(t, LANZA() + .1, LANZA() + .8)); m2 = mezcla(m2, { x: cx + 230, y: cy - 200 }, k); }
  const fin = t > ev.golpeF ? Math.sin((t - ev.golpeF) * 7) * 10 * Math.exp(-(t - ev.golpeF) * 2) : 0;
  agente(c, cx, cy + fin, r, [m1.x, m1.y], [m2.x, m2.y], { piso: MQ.piso, abre1: .6, abre2: pn > .5 ? .2 : .6, sombra: .3 });
  return { x: cx, y: cy };
}
function tarjetaInicial(c: C, t: number) {
  if (t > ev.google + .5) return;
  const ini = -.25, cae = ev.slap;
  const desde = { x: MQ.x + 230, y: MQ.piso - 330 };
  let p: XY = S1, rot = 0, k = 1;
  if (t < cae) { const u = prog(t, ini, cae); p = arco(desde, S1, u, 230); rot = (1 - u) * -2.4; k = lerp(.7, 1, u); }
  const sq = t > cae ? 1 + .12 * Math.exp(-(t - cae) * 9) * Math.sin((t - cae) * 30) : 1;
  tarjeta(c, p.x, p.y, 210, 180, {
    rot, k: k * sq, sem: 3, dib: (g) => {
      // el boceto a lápiz ya viene en la tarjeta; la tinta llega con la voz
      g.save(); g.globalAlpha *= .2; frasco(g, 52, 150, .8); flechaDer(g, 92, 132, 98, 1, 6); iconoOjo(g, 168, 96, .56, 0); g.restore();
      revela(g, 14, 80, prog(t, ev.medic - .35, ev.medic + .35), () => frasco(g, 52, 150, .8));
      flechaDer(g, 92, 132, 98, prog(t, ev.ceguera - .2, ev.ceguera + .1), 6);
      const ojoK = ease.outBack(prog(t, ev.ceguera - .05, ev.ceguera + .3));
      if (ojoK > 0) iconoOjo(g, 168, 96, .56 * ojoK, smooth(prog(t, ev.ceguera + .2, ev.ceguera + .8)));
    },
  });
  // polvo de papel al caer
  const e = t - cae;
  if (e > 0 && e < .7) {
    const r = azar(12);
    for (let i = 0; i < 14; i++) {
      const a = Math.PI + r() * Math.PI, v = 160 + r() * 260, x = S1.x + Math.cos(a) * (60 + v * e), y = S1.y - 6 + Math.sin(a) * v * e * .35 + 120 * e * e;
      c.globalAlpha = (1 - e / .7) * .55; c.fillStyle = i % 3 ? "#B9B1A1" : TINTA; circulo(c, x, y, 3 + r() * 4);
    }
    c.globalAlpha = 1;
  }
}
function estacionA(c: C, t: number) {
  tubos(c, -80, -500, t, 1);
  matraz(c, 140, -505, .82, t);
  silueta(c, SIL, -520, smooth(prog(t, ev.personas - .1, ev.personas + .2)), prog(t, ev.personas, ev.personas + .9), t);
  placa(c, PLACA.x, PLACA.y, t, [ev.toca, ev.toca2, ev.golpeF]);
  const B0 = bolaMesa(c, t);
  tarjetaInicial(c, t);
  // la tarjeta nueva del final
  if (t > ev.proponer - .1) {
    const u = prog(t, LANZA(), ev.nueva), sale = ease.outBack(prog(t, ev.proponer - .1, ev.proponer + .3), 1.6);
    const p = cartaNueva(t, B0.x, B0.y);
    const sq = t > ev.nueva ? 1 + .12 * Math.exp(-(t - ev.nueva) * 9) * Math.sin((t - ev.nueva) * 30) : lerp(.7, 1, u) * sale;
    tarjeta(c, p.x, p.y, 210, 180, { k: sq, sem: 77, rot: t < ev.nueva ? (1 - u) * -2.4 * (t > LANZA() ? 1 : 0) - .2 * (t < LANZA() ? 1 : 0) : 0, dib: (g) => cura(g, 105, 116, 80) });
  }
  // el ojo del arranque sale de la tarjeta
  const oj = ease.outBack(prog(t, ev.ceguera - .05, ev.ceguera + .5), 1.2) * (1 - ease.inCubic(prog(t, ev.lab - .2, ev.lab + .25)));
  if (oj > .01) {
    const desde = { x: S1.x + 63, y: S1.y - 84 }, hasta = { x: -20, y: -880 };
    ojo(c, lerp(desde.x, hasta.x, clamp(oj)), lerp(desde.y, hasta.y, clamp(oj)), .95 * oj, t, { mancha: smooth(prog(t, ev.ceguera + .3, ev.ceguera + 1)) });
  }
  // las pipetas: la de la prueba, la de las personas y la que decide al final
  const tip = { x: PLACA.x + 30, y: PLACA.y - 120 };
  pipetazo(c, t, tip, ev.lab + .12, ev.gota, ev.toca + .4, PLACA.y);
  pipetazo(c, t, tip, ev.hicieron + .05, ev.exp2 + .02, ev.toca2 + .5, PLACA.y);
  if (t > ev.decide - .05) {
    const lejos = { x: tip.x + 760, y: tip.y - 900 };
    const entra = ease.outCubic(prog(t, ev.decide, ev.decide + 1.1)), sale = ease.inOutCubic(prog(t, ev.golpeF + .9, ev.golpeF + 2.2));
    const p = mezcla(mezcla(lejos, tip, entra), { x: tip.x + 120, y: tip.y - 260 }, sale);
    const gg = t < ev.suelta ? smooth(prog(t, ev.funcionan, ev.suelta)) : 0;
    const ap = ventana(t, ev.suelta - .3, ev.suelta + .05, .2, .2);
    manoPipeta(c, p.x + 2 * Math.sin(t * 6), p.y + (t < ev.suelta ? 3 * Math.sin(t * 9) * gg : 0), .12, { gota: gg, aprieta: ap, manga: .55 });
    gotaCae(c, tip.x, tip.y + 10, PLACA.y, t, ev.suelta, .3);
  }
  // la lupa: en «no en personas» se hace a un lado para que quepa la silueta
  const lu1 = ease.outBack(prog(t, ev.toca - .05, ev.toca + .4), 1.3) * (1 - smooth(prog(t, ev.mayo - .2, ev.mayo + .2)));
  const lu2 = ease.outBack(prog(t, ev.toca2 - .05, ev.toca2 + .4), 1.3) * (1 - smooth(prog(t, ev.google - .2, ev.google + .2)));
  const aparte = t < ev.mayo ? smooth(prog(t, ev.personas - .15, ev.personas + .5)) : 0;
  const L = mezcla(LUPA, { x: -175, y: -790 }, aparte);
  if (lu1 > .01) lupa(c, L.x + 6 * Math.sin(t * 1.1), L.y + 8 * Math.sin(t * .9), 200 * (1 - .22 * aparte), t, lu1, ev.toca + .25);
  if (lu2 > .01) lupa(c, LUPA.x + 6 * Math.sin(t * 1.1), LUPA.y + 8 * Math.sin(t * .9), 200, t, lu2, ev.aparecio - .15);
}

// ---------- estación B: Robin ----------
const RB = [{ x: B - 20, piso: -300 }, { x: B + 135, piso: -425 }, { x: B + 290, piso: -300 }];
function estacionB(c: C, t: number) {
  pila(c, B - 470, -470, t);
  if (t > ev.mayo - .5 && t < ev.propuso + 1) {
    const r = azar(66);
    for (let k = 0; k < 7; k++) {
      const per = 2.4 + r() * 1.2, f = frac((t - ev.mayo) / per + r()), x0 = B - 470 + (r() - .5) * 420;
      const x = x0 + 260 * f + 30 * Math.sin(t * 2 + k), y = -1000 - (k % 3) * 40 + 520 * f * f - 120 * f;
      hojaVuela(c, x, y, .7, Math.sin(t * 2.3 + k) * .8 + f * 2, Math.sin(Math.PI * f), 500 + k);
    }
  }
  // hojas que vuelan de la pila a la primera bola
  ev.hojas.forEach((ti: number, k: number) => {
    const u = prog(t, ti - .5, ti); if (u <= 0 || u >= 1) return;
    const desde = { x: B - 470 + (k % 3 - 1) * 180, y: -900 - (k % 4) * 90 }, hasta = { x: RB[0].x, y: RB[0].piso - 90 };
    const p = arco(desde, hasta, ease.inOutCubic(u), 140);
    hojaVuela(c, p.x, p.y, lerp(1.1, .35, u * u), u * 4 + k, 1, 200 + k);
  });
  const r = 72;
  const orden = [1, 0, 2];
  for (const i of orden) {
    const b = RB[i];
    const pop = clamp(brota(t, ev.pops[i], 3.4, .4), 0, 1.2);
    if (pop <= .01) continue;
    const bob = Math.abs(Math.sin(t * 3 + i)) * 7;
    const cx = b.x + 3 * Math.sin(t * 1.2 + i), cy = b.piso - r * pop - bob;
    let m1: XY = { x: cx - 120, y: cy + 40 + 8 * Math.sin(t * 2 + i) }, m2: XY = { x: cx + 120, y: cy + 40 + 8 * Math.cos(t * 2.2 + i) };
    const lee = i === 0 ? ventana(t, ev.lee - .3, ev.propuso, .3, .4) : 0;
    if (i === 0) { m1 = mezcla(m1, { x: cx - 80, y: cy - 150 }, lee); m2 = mezcla(m2, { x: cx + 80, y: cy - 150 + 10 * Math.sin(t * 9) }, lee); }
    if (i === 1) {
      const pr = ventana(t, ev.propone - .2, ev.propuso, .2, .4);
      m1 = mezcla(m1, { x: cx - 110, y: cy - 150 + 30 * Math.sin(t * 8) }, pr);
      m2 = mezcla(m2, { x: cx + 110, y: cy - 150 - 30 * Math.sin(t * 8) }, pr);
    }
    const di = i === 2 ? ventana(t, ev.disena - .2, ev.propuso - .1, .2, .3) : 0;
    if (i === 2) {
      m1 = mezcla(m1, { x: cx - 60, y: cy - 200 }, di); m2 = mezcla(m2, { x: cx + 110, y: cy - 210 }, di);
      // el brazo de hule que se estira hasta el estante
      const es = smooth(prog(t, ev.estira, ev.existe)), regresa = ease.inOutCubic(prog(t, ev.existe + .05, ev.frasco - .05));
      const bot = { x: BOT[RIPA_I].x, y: YEST - BOT[RIPA_I].h * SEST * .5 };
      if (es > 0 && regresa < 1) m2 = mezcla(mezcla(m2, bot, es), { x: B2 - 150, y: -400 }, regresa);
    }
    c.save(); c.translate(cx, b.piso); c.scale(pop, pop); c.translate(-cx, -b.piso);
    agente(c, cx, cy, r, [m1.x, m1.y], [m2.x, m2.y], { piso: b.piso, sombra: .3 });
    c.restore();
    if (lee > .2) hojaVuela(c, cx, cy - 175, 1.3, .05 * Math.sin(t * 4), lee, 300 + Math.floor(t * 4));
    if (i === 2) {
      if (t > ev.existe && t < ev.frasco) frasco(c, m2.x, m2.y + 50, SEST, { alto: BOT[RIPA_I].h, polvo: 1 });
      // el plano del experimento: pipeta → placa
      if (di > .02) {
        c.save(); c.globalAlpha *= di; c.translate(cx + 70, cy - 300); c.rotate(-.05);
        caja(c, -130, -95, 260, 190, 6, BLANCO, TINTA, 5);
        revela(c, -120, 240, prog(t, ev.disena, ev.expF), () => {
          c.save(); c.translate(-70, 30); c.scale(.36, .36); pipetaSola(c); c.restore();
          flechaDer(c, -36, 6, -14, 1, 5);
          elipse(c, 66, 34, 50, 16, AGAR, TINTA, 4);
          palomita(c, 66, -42, .7, 1, VERDE, 8);
        });
        c.restore();
      }
    }
  }
  // las hipótesis: tarjetitas con «?» que brotan de la bola de atrás y flotan
  ev.ideas.forEach((ti: number, k: number) => {
    const pop = clamp(brota(t, ti, 4, .4), 0, 1.2); if (pop <= .01) return;
    const al = 1 - smooth(prog(t, ev.propuso - .2, ev.propuso + .3));
    const x = RB[1].x + (k - 1.5) * 120, y = RB[1].piso - 330 + Math.abs(k - 1.5) * 22 + 8 * Math.sin(t * 2 + k);
    tarjeta(c, x, y, 104, 124, { k: pop, alfa: al, rot: (k - 1.5) * .12, sem: 90 + k, dib: (g) => texto(g, "?", 52, 96, { fuente: serif(96, true), color: k === 1 ? ACENTO : TINTA }) });
  });
}
function pipetaSola(c: C) {
  caja(c, -17, -240, 34, 164, 6, BLANCO, TINTA, 6);
  c.beginPath(); c.moveTo(-3, 0); c.lineTo(-11, -78); c.lineTo(11, -78); c.lineTo(3, 0); c.closePath(); c.fillStyle = BLANCO; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 6; c.stroke();
  caja(c, -11, -270, 22, 30, 4, TINTA, null);
}

// ---------- estación B2: el estante, el frasco y la tarjeta de Robin ----------
function estacionB2(c: C, t: number) {
  estante(c, t);
  if (t > ev.frasco) {
    const sq = 1 + .1 * Math.exp(-(t - ev.frasco) * 9) * Math.sin((t - ev.frasco) * 30);
    const k = smooth(prog(t, ev.ripa - .1, ev.ripa + .3));
    frasco(c, B2 - 150, -330, lerp(SEST, 1.6, k) * sq, { alto: BOT[RIPA_I].h, etiqueta: k > .3 ? "ripasudil" : undefined, polvo: 1 - k, borde: k > .3 ? ACENTO : undefined });
  }
  const tk = clamp(brota(t, ev.tarjeta, 3.8, .42), 0, 1.2);
  if (tk > .01) {
    tarjeta(c, B2 + 90, -320, 300, 250, {
      k: tk, sem: 11, rot: -.02, dib: (g) => {
        texto(g, "ripasudil", 150, 64, { fuente: serif(58, true), color: TINTA });
        const fl = prog(t, ev.tarjeta + .2, ev.tarjeta + .5);
        if (fl > 0) { linea(g, 150, 84, 150, 84 + 36 * fl, 6); if (fl > .7) { g.fillStyle = TINTA; g.beginPath(); g.moveTo(150, 132); g.lineTo(137, 110); g.lineTo(163, 110); g.closePath(); g.fill(); } }
        revela(g, 14, 272, prog(t, ev.tarjeta + .4, ev.macular + .3), () => texto(g, "degeneración", 150, 178, { fuente: serif(44), color: TINTA }));
        revela(g, 14, 272, prog(t, ev.macular, ev.macular + .6), () => texto(g, "macular seca", 150, 226, { fuente: serif(44), color: ACENTO }));
      },
    });
  }
  // encima, el ojo con la mancha
  const oj = ease.outBack(prog(t, ev.degen + .2, ev.degen + .8), 1.2) * (1 - smooth(prog(t, ev.hicieron - .3, ev.hicieron)));
  if (oj > .01) ojo(c, B2 + 40, -1000, oj, t, { mancha: .55 + .45 * smooth(prog(t, ev.causas, ev.cegB + .4)), arrugas: smooth(prog(t, ev.adultos, ev.adultos + .6)) });
}

// ---------- estación E: Co-Scientist, la mesa redonda ----------
const NE = 5;
const ANG = Array.from({ length: NE }, (_, k) => -Math.PI / 2 + k * 2 * Math.PI / NE + .3);
const TIROS: [number, number][] = [[0, 2], [3, 1], [4, 0], [2, 4], [1, 3]];
function posE(k: number) { const a = ANG[k]; const sc = .82 + .18 * (Math.sin(a) + 1) / 2; return { x: E + Math.cos(a) * 250, piso: -330 + Math.sin(a) * 92, sc }; }
function cartaE(k: number, t: number) { const p = posE(k), r = 66 * p.sc; return { x: p.x, y: p.piso - 2 * r - 150 * p.sc - 6 * Math.sin(t * 2 + k), w: 140 * p.sc, h: 112 * p.sc }; }
const TACHA_K = [2, 1], STAN_K = [0, 3, 4];
function estacionE(c: C, t: number) {
  sombra(c, E, -310, 440, .18);
  elipse(c, E, -330, 300, 96, "#E4DCCB", TINTA, 5);
  elipse(c, E, -330, 236, 72, null, "rgba(17,17,17,.2)", 3);
  const orden = Array.from({ length: NE }, (_, k) => k).sort((a, b) => posE(a).piso - posE(b).piso);
  for (const k of orden) {
    const p = posE(k), pop = clamp(brota(t, ev.google + .45 + k * .09, 3.4, .42), 0, 1.2);
    if (pop <= .01) continue;
    const r = 66 * p.sc, bob = Math.abs(Math.sin(t * 3.1 + k)) * 6;
    const cx = p.x, cy = p.piso - r * pop - bob;
    const ca = cartaE(k, t);
    let tir = 0;
    TIROS.forEach(([a], i) => { if (a === k) tir = Math.max(tir, ventana(t, ev.tiros[i] - .15, ev.tiros[i] + .1, .1, .25)); });
    const m1: XY = { x: ca.x - ca.w * .38, y: ca.y + ca.h * .45 - tir * 40 }, m2: XY = { x: ca.x + ca.w * .38, y: ca.y + ca.h * .45 - tir * 40 };
    c.save(); c.translate(cx, p.piso); c.scale(pop, pop); c.translate(-cx, -p.piso);
    agente(c, cx, cy, r, [m1.x, m1.y], [m2.x, m2.y], { piso: p.piso, sombra: .25, abre1: .3, abre2: .3 });
    const ti = TACHA_K.indexOf(k);
    const tachada = ti >= 0 ? ev.tachas[ti] : 99, nueva = ti >= 0 ? ev.nuevas[ti] : 99;
    const sale = t > nueva ? 0 : 1;
    const si = STAN_K.indexOf(k);
    const al = si >= 0 ? 1 - smooth(prog(t, ev.vuelan[si] - .05, ev.vuelan[si] + .05)) : 1;
    if (sale > .01) tarjeta(c, ca.x, ca.y + ca.h, ca.w, ca.h, { alfa: al, sem: 60 + k, tacha: prog(t, tachada, tachada + .25), rot: .05 * Math.sin(t * 1.5 + k), dib: (g) => renglones(g, ca.w, ca.h, 70 + k, 2) });
    if (t > nueva) tarjeta(c, ca.x, ca.y + ca.h, ca.w, ca.h, { k: clamp(brota(t, nueva, 4, .4), 0, 1.2), alfa: al, sem: 80 + k, borde: ACENTO, dib: (g) => renglones(g, ca.w, ca.h, 99 + k, 2) });
    c.restore();
  }
  // tarjetas en el aire: el debate
  TIROS.forEach(([a, b], i) => {
    const u = prog(t, ev.tiros[i], ev.tiros[i] + .36); if (u <= 0 || u >= 1) return;
    const A0 = cartaE(a, t), B0 = cartaE(b, t);
    const p = arco({ x: A0.x, y: A0.y }, { x: B0.x, y: B0.y }, ease.inOutCubic(u), 150);
    tarjeta(c, p.x, p.y + 60, 110, 88, { rot: u * 6, sem: 120 + i, dib: (g) => renglones(g, 110, 88, 130 + i, 2) });
  });
  // las tres que se van a Stanford
  ev.vuelan.forEach((ti: number, j: number) => {
    if (t < ti) return;
    const u = ease.inOutCubic(prog(t, ti, ti + .75));
    const A0 = cartaE(STAN_K[j], t), dest = { x: POZOS[j], y: -430 };
    const p = arco({ x: A0.x, y: A0.y + A0.h }, dest, u, 520);
    const sq = t > ti + .75 ? 1 + .1 * Math.exp(-(t - ti - .75) * 9) * Math.sin((t - ti - .75) * 30) : 1;
    tarjeta(c, p.x, p.y, lerp(A0.w, 150, u), lerp(A0.h, 130, u), { k: sq, rot: (1 - u) * .5, sem: 140 + j, dib: (g) => frasco(g, 75, 112, .55, { alto: 120 }) });
  });
}

// ---------- estación F: los organoides ----------
function estacionF(c: C, t: number) {
  const hk = ease.outBack(prog(t, ev.fibrosis - .1, ev.fibrosis + .4), 1.2) * (1 - smooth(prog(t, ev.probaron + .2, ev.probaron + .6)));
  if (hk > .01) higado(c, F, -1010 + 6 * Math.sin(t * 1.4), 1.2 * hk, .2 + .8 * smooth(prog(t, ev.fibrosis, ev.probaron + .3)), t);
  placaPozos(c, t);
  if (t > ev.probaron - .3 && t < ev.gotas[2] + 1.2) {
    const tipDe = (i: number) => ({ x: POZOS[i] + 10, y: YPOZO - 110 });
    const lejos = { x: F + 900, y: -1400 };
    let p: XY;
    if (t < ev.gotas[0]) p = mezcla(lejos, tipDe(0), ease.outCubic(prog(t, ev.probaron - .3, ev.gotas[0] - .1)));
    else if (t < ev.gotas[1]) p = arco(tipDe(0), tipDe(1), ease.inOutCubic(prog(t, ev.gotas[0] + .1, ev.gotas[1] - .05)), 50);
    else if (t < ev.gotas[2]) p = arco(tipDe(1), tipDe(2), ease.inOutCubic(prog(t, ev.gotas[1] + .1, ev.gotas[2] - .05)), 50);
    else p = mezcla(tipDe(2), lejos, ease.inCubic(prog(t, ev.gotas[2] + .3, ev.gotas[2] + 1.1)));
    const gg = ev.gotas.reduce((m: number, g: number) => Math.max(m, ventana(t, g - .3, g, .2, .02)), 0);
    manoPipeta(c, p.x, p.y, .1, { gota: gg, manga: .5 });
    ev.gotas.forEach((g: number, i: number) => gotaCae(c, POZOS[i] + 10, YPOZO - 100, YPOZO + 5, t, g, .22));
  }
  for (const [i, d] of [[0, 0], [2, .22]] as [number, number][]) {
    const k = prog(t, ev.frenan + d, ev.frenan + d + .35);
    if (k > 0) palomita(c, POZOS[i] + 30, YPOZO - 110, 2.1, k, VERDE, 16);
  }
}

// ---------- estación G: quién hizo qué ----------
const FAN = [0, 1, 2, 3].map((k) => ({ dx: (k - 1.5) * 96, dy: Math.abs(k - 1.5) * 16, rot: (k - 1.5) * .2 }));
const GB = { x: GX - 270, piso: -400, r: 72 }, GC: XY = { x: GX - 30, y: -330 }, GT = { x: GX + 200, y: -300 };
function manoAbierta(c: C, x: number, y: number, ang: number, pinza: number) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.beginPath(); c.moveTo(-50, -60); c.lineTo(-50, -1800); c.lineTo(50, -1800); c.lineTo(50, -60); c.closePath(); c.fillStyle = HUMO; c.fill(); c.strokeStyle = TINTA; c.lineWidth = 6; c.stroke();
  linea(c, -50, -96, 50, -96, 4);
  caja(c, -46, -66, 92, 74, 28, PIEL, TINTA, 5.5);
  const ab = lerp(16, 4, pinza);
  for (const [dx, l] of [[-30, 46], [-10, 54], [10, 52], [30, 44]] as [number, number][]) caja(c, dx - 10 + Math.sign(dx) * ab * .3, 0, 20, l, 10, PIEL, TINTA, 4.5);
  caja(c, -64 + ab * .4, -40, 24, 50, 12, PIEL, TINTA, 4.5);
  c.restore();
}
function estacionG(c: C, t: number) {
  const r = GB.r, bob = Math.abs(Math.sin(t * 3.2)) * 6;
  const cx = GB.x + 3 * Math.sin(t * 1.4) - 150 * smooth(prog(t, ev.suben[0] - .45, ev.suben[0] + .1)), cy = GB.piso - r - bob;
  const centro = { x: GB.x + 150, y: GB.piso - 330 };
  const ab = ventana(t, ev.maquina - .4, ev.suben[0] - .1, .4, .5);
  let m1: XY = { x: cx - 140, y: cy + 50 + 10 * Math.sin(t * 2.2) }, m2: XY = { x: cx + 140, y: cy + 40 + 10 * Math.cos(t * 2.4) };
  if (ab > 0) { m1 = mezcla(m1, { x: centro.x - 120, y: centro.y + 30 }, ab); m2 = mezcla(m2, { x: centro.x + 60, y: centro.y + 40 }, ab); }
  agente(c, cx, cy, r, [m1.x, m1.y], [m2.x, m2.y], { piso: GB.piso, sombra: .3, abre1: .3, abre2: .3 });
  // las cuatro esclusas que vuelven, recortadas de la mesa
  if (t > ev.suben[0] - .1) {
    for (let k = 0; k < 4; k++) {
      const alza = clamp(brota(t, ev.suben[k], 3.6, .42), 0, 1.15);
      const destaca = k === 0 ? smooth(prog(t, ev.software - .55, ev.software - .25)) : 0;
      const apaga = k > 0 ? 1 - .6 * smooth(prog(t, ev.software - .55, ev.software - .25)) : 1;
      c.save(); c.globalAlpha *= apaga;
      esclusa(c, GX - 225 + k * 170, -110, 110, 200, { alza, icono: ICONOS4[k], t, borde: destaca > .5 ? ACENTO : undefined, tam: 116 });
      c.restore();
    }
  }

  const sale = 1 - smooth(prog(t, ev.suben[0] - .15, ev.suben[0] + .3));
  if (sale <= .01) return;
  c.save(); c.globalAlpha *= sale;
  // el abanico que la bola levanta
  FAN.forEach((f, k) => {
    const pop = clamp(brota(t, ev.abanico[k], 4, .45), 0, 1.25);
    if (pop <= .01) return;
    let p: XY = { x: centro.x + f.dx, y: centro.y + f.dy }, rot = f.rot;
    if (k === 2 && t > ev.elige) { const u = ease.inOutCubic(prog(t, ev.elige, ev.consiguen - .1)); p = arco(p, GC, u, 200); rot = lerp(f.rot, 0, u); }
    tarjeta(c, p.x, p.y, 150, 150, { rot, k: pop, sem: 40 + k, dib: (g) => renglones(g, 150, 150, 50 + k) });
  });
  // la mano que elige
  if (t > ev.eligen - .1 && t < ev.consiguen + .8) {
    const card0 = { x: centro.x + FAN[2].dx + 10, y: centro.y + FAN[2].dy - 150 };
    const lejos = { x: card0.x + 950, y: card0.y - 520 };
    const llega = ease.outCubic(prog(t, ev.eligen - .1, ev.elige)), lleva = ease.inOutCubic(prog(t, ev.elige, ev.consiguen - .1)), vuelve = ease.inCubic(prog(t, ev.consiguen, ev.consiguen + .7));
    let p = mezcla(lejos, card0, llega);
    p = arco(p, { x: GC.x + 10, y: GC.y - 150 }, lleva, 200);
    p = mezcla(p, { x: GC.x + 1000, y: GC.y - 700 }, vuelve);
    manoAbierta(c, p.x, p.y - 10, 1.0, smooth(prog(t, ev.elige - .15, ev.elige + .05)) * (1 - smooth(prog(t, ev.consiguen - .15, ev.consiguen))));
  }
  // los materiales: una charola con una placa, un frasco y tubos, empujada desde la derecha
  if (t > ev.consiguen) {
    const u = ease.outCubic(prog(t, ev.consiguen + .1, ev.trae));
    const x = lerp(GT.x + 900, GT.x, u), y = GT.y;
    caja(c, x - 150, y - 8, 300, 26, 6, CARTON, TINTA, 5);
    tubos(c, x + 70, y - 8, t, 6, .55);
    frasco(c, x + 105, y - 8, .7, { alto: 110 });
    placa(c, x - 50, y - 20, t, [ev.toca3], .5);
    const vuelve = ease.inCubic(prog(t, ev.trae + .2, ev.trae + .9));
    if (vuelve < 1) manoAbierta(c, x + 210 + vuelve * 700, y - 60, Math.PI / 2 + .25, 0);
    pipetazo(c, t, { x: GT.x - 40, y: GT.y - 130 }, ev.trae - .2, ev.prueban + .02, ev.toca3 + .45, GT.y - 20);
  }
  c.restore();
}
const ICONOS4: Icono[] = [icoCaja(0, 0), icoFlecha, icoMarco, icoBalanza];

// ---------- región H: las esclusas, en coordenadas de pantalla ----------
const pasoBarco = (t: number, ti: number) => prog(t, ti - .45, ti + .55);
function regionH(c: C, t: number) {
  c.save(); c.translate(HX, 0);
  c.fillStyle = PAPEL; c.fillRect(-500, -300, 2080, 2600);
  // ----- arriba: software -----
  const yA = 790, GXA = 600;
  const sinArriba = 1 - smooth(prog(t, ev.ideas0 - .1, ev.ideas0 + .5));
  c.save(); c.globalAlpha *= .15 + .85 * sinArriba;
  aguaBanda(c, -500, 1580, yA, 140, t);
  c.globalAlpha *= sinArriba / (.15 + .85 * sinArriba + 1e-6);
  const extra = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((k) => ev.biologia + .9 + k * 1.35);
  const pases = [ev.software + .45, ...ev.pases, ...extra];
  let abreA = 0;
  for (const ti of pases) abreA = Math.max(abreA, ventana(t, ti - .3, ti + .15, .12, .25));
  let ok = 0, mal = 0;
  ev.pases.forEach((ti: number, k: number) => { if (t > ti + .1) { if (k < 2) { ok = prog(t, ti + .1, ti + .35); mal = 0; } else { mal = prog(t, ti + .1, ti + .35); ok = 0; } } });
  if (t > extra[0]) { const k = Math.floor((t - extra[0]) / 1.35), q = frac((t - extra[0]) / 1.35); if (k % 3 === 2) { mal = clamp(q * 4); ok = 0; } else { ok = clamp(q * 4); mal = 0; } }
  const tenue = 1 - .5 * smooth(prog(t, ev.biologia, ev.biologia + .5));
  for (const ti of pases) {
    const u = pasoBarco(t, ti); if (u <= 0 || u >= 1) continue;
    const x = lerp(-220, 1300, ease.inOutCubic(u));
    c.save(); c.globalAlpha *= ti > ev.biologia ? tenue : 1;
    barco(c, x, yA + 2 + 3 * Math.sin(t * 5), .04 * Math.sin(t * 4), (g) => { sombra(g, 0, -14, 50, .2); bola(g, 0, -60, 48); }, 1.45);
    c.restore();
  }
  c.save(); c.globalAlpha *= tenue;
  esclusa(c, GXA, yA + 140, 240, 470, { abre: abreA, icono: icoCaja(ok, mal), t, tam: 140 });
  cronometro(c, 250, 480, 88, (t - ev.software) * 6.2832 * .9);
  c.restore();
  textoH(c, t, "software", 250, 330, ev.software + .1, 92, TINTA, tenue);
  textoH(c, t, "segundos", 250, 650, ev.segundos, 80, ACENTO, tenue);
  c.restore();
  // ----- abajo: biología -----
  const yB = 1470;
  const bio = smooth(prog(t, ev.biologia - .2, ev.biologia + .3));
  if (bio > .01) {
    c.save(); c.globalAlpha *= bio;
    c.save(); c.setLineDash([10, 18]); linea(c, 60, 975, 700, 975, 3, "rgba(17,17,17,.3)"); c.restore();
    aguaBanda(c, -500, 1580, yB, 105, t);
    const GXB = [390, 615, 840], GTB = [ev.celula, ev.raton, ev.persona], ICO = [icoCelula, icoRaton, icoPersona];
    const xb = lerp(150, 505, ease.inOutCubic(prog(t, ev.meses - .2, ev.anos + 1.2)));
    const abre0 = ventana(t, ev.meses - .4, ev.anos + .4, .6, .6);
    // las ideas que se amontonan frente a la primera compuerta
    ev.lluvia.forEach((ti: number, k: number) => {
      if (t < ti) return;
      const col = k % 4, fila = Math.floor(k / 4);
      const x = 240 - col * 58 - fila * 20, yq = yB - 4 - fila * 30;
      const u = prog(t, ti, ti + .4), y = lerp(yq - 1000, yq, u * u);
      const sq = t > ti + .4 ? Math.exp(-(t - ti - .4) * 8) * Math.sin((t - ti - .4) * 26) * .12 : 0;
      barco(c, x + 4 * Math.sin(t * 2 + k), y, .06 * Math.sin(t * 3 + k) + sq, (g) => tarjeta(g, 0, -12, 70, 84, { sem: 300 + k, dib: (h) => renglones(h, 70, 84, 310 + k, 2) }), .7);
    });
    barco(c, xb, yB + 2 + 3 * Math.sin(t * 2), .03 * Math.sin(t * 2.4), (g) => tarjeta(g, 0, -12, 100, 120, { sem: 400, dib: (h) => frasco(h, 50, 106, .55, { alto: 120 }) }), .85);
    for (let k = 0; k < 3; k++) {
      const alza = clamp(brota(t, GTB[k], 3.6, .42), 0, 1.15);
      const temb = k === 0 && t > ev.comprobar ? Math.sin(t * 40) * 4 * Math.exp(-(t - ev.comprobar) * 3) : 0;
      c.save(); c.translate(temb, 0);
      esclusa(c, GXB[k], yB + 105, 150, 200, { alza, abre: k === 0 ? abre0 : 0, icono: ICO[k], t, tam: 120 });
      c.restore();
    }
    calendario(c, 865, 1052, t, hojasCal());
    c.restore();
    textoH(c, t, "biología", 195, 1090, ev.biologia + .05, 92, TINTA, 1);
    textoH(c, t, "meses", 530, 1100, ev.meses, 104, ACENTO, 1 - smooth(prog(t, ev.anos - .1, ev.anos + .05)));
    textoH(c, t, "años", 530, 1100, ev.anos, 124, ACENTO, 1);
  }
  c.restore();
}
function hojasCal() {
  const h: number[] = [];
  for (let s = ev.biologia + .6; s < ev.meses; s += .85) h.push(s);
  for (let k = 0; k < 4; k++) h.push(ev.meses + k * .2);
  for (let s = ev.anos; s < ev.puede + .3; s += .09 + .05 * (frac(s * 7.3))) h.push(s);
  return h;
}
function textoH(c: C, t: number, s: string, x: number, y: number, ini: number, px: number, color: string, alfa: number) {
  const a = smooth(prog(t, ini - .04, ini + .2)) * alfa;
  if (a <= .01) return;
  texto(c, s, x, y + (1 - ease.outCubic(prog(t, ini - .04, ini + .3))) * 16, { fuente: serif(px, true), color, alfa: a });
}

// ---------- cámara ----------
type V = { x: number; y: number; z: number };
const P = (x: number, y: number, z: number): V => ({ x, y, z });
const HV = (dx = 0, dy = 0, z = 1) => P(HX + 540 + dx, 960 + dy, z);
const CLAVES: [number, number, V, ((x: number) => number)?][] = [
  [0, 0, P(110, -560, 1.9)],
  [.3, 3.6, P(-10, -720, 1.32), ease.inOutCubic],
  [ev.lab - .15, .9, P(0, -660, 1.4)],
  [ev.toca + .15, 1.0, P(-10, -740, 1.42)],
  [ev.personas - .2, 1.0, P(50, -760, 1.25)],
  [ev.todavia, 1.8, P(55, -775, 1.28)],
  [ev.mayo - .12, .75, P(B - 40, -650, 1.22), ease.outExpo],
  [ev.lee - .25, 1.1, P(B - 120, -640, 1.28)],
  [ev.propone - .25, 1.0, P(B + 20, -660, 1.3)],
  [ev.disena - .25, 1.0, P(B + 120, -650, 1.28)],
  [ev.propuso - .1, 1.0, P(B + 220, -720, 1.12)],
  [ev.frasco - .25, .8, P(B2 - 40, -560, 1.4)],
  [ev.degen - .45, .9, P(B2 + 40, -730, 1.3)],
  [ev.causas, 2.4, P(B2 + 40, -760, 1.38)],
  [ev.hicieron - .14, .7, P(0, -680, 1.38), ease.outExpo],
  [ev.efecto - .1, 1.0, P(-10, -760, 1.44)],
  [ev.google - .15, .8, P(E, -500, 1.38), ease.outExpo],
  [ev.debaten - .2, 1.2, P(E, -500, 1.46)],
  [ev.stanford - .1, 1.1, P(F, -720, 1.3)],
  [ev.fibrosis - .2, .8, P(F, -900, 1.26)],
  [ev.probaron - .15, .9, P(F, -560, 1.5)],
  [ev.frenaron, 1.6, P(F, -575, 1.56)],
  [ev.fijate - .05, 1.2, P(3300, -760, .7)],
  [ev.llega - .1, 1.0, P(GX, -700, 1.3)],
  [ev.vuelven - .1, 1.0, P(GX, -560, 1.26)],
  [ev.software - .15, .7, HV(-40, -400, 1.2), ease.outExpo],
  [ev.biologia - .3, 1.0, HV(0, 0, 1.0)],
  [ev.ideas0 - .05, 1.2, HV(-60, 280, 1.12)],
  [ev.puede - .15, .7, P(30, -700, 1.36), ease.outExpo],
  [ev.decide - .1, 1.6, P(0, -660, 1.44)],
  [ev.golpeF - .05, 3.2, P(40, -770, 1.14), ease.inOutSine],
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
const LATIGOS = [ev.mayo - .12, ev.hicieron - .14, ev.google - .15, ev.software - .15, ev.puede - .15];
const GOLPES: [number, number][] = [[ev.slap, 16], [ev.toca, 4], [ev.frasco, 6], [ev.tarjeta, 5], [ev.toca2, 4], [ev.trae, 6], [ev.toca3, 4],
  ...ev.suben.map((x: number) => [x, 5] as [number, number]), [ev.comprobar, 7], [ev.nueva, 9], [ev.golpeF, 6]];
function sacudida(t: number) {
  let x = 0, y = 0;
  for (const [ti, a] of GOLPES) { if (t < ti || t > ti + .8) continue; const u = t - ti; x += a * Math.exp(-u * 8) * Math.sin(u * 71); y += a * .8 * Math.exp(-u * 8) * Math.cos(u * 63); }
  return { x, y };
}

// ---------- capas de pantalla ----------
function polvo(c: C, t: number) {
  const r = azar(18);
  c.fillStyle = TINTA;
  for (let i = 0; i < 80; i++) {
    const x0 = r() * 1200 - 60, y0 = r() * 2060, v = 14 + r() * 40, f = r() * 6.3, z = 1.6 + r() * 3.2;
    const y = ((y0 - t * v) % 2060 + 2060) % 2060 - 70, x = x0 + Math.sin(t * .5 + f) * 36;
    c.globalAlpha = .07 + r() * .16; c.fillRect(x, y, z, z);
  }
  c.globalAlpha = 1;
}
function rayas(c: C, t: number) {
  for (const t0 of LATIGOS) {
    const k = t - t0; if (k < 0 || k > .5) continue;
    const a = Math.sin(Math.PI * k / .5), r = azar(Math.floor(t0 * 10));
    c.strokeStyle = TINTA; c.lineCap = "round";
    for (let i = 0; i < 24; i++) {
      const y = 140 + r() * 1500, L = 220 + r() * 520, x = ((r() * 1600 - k * 3200) % 1600 + 1600) % 1600 - 260;
      c.globalAlpha = a * (.12 + r() * .3); c.lineWidth = 3 + r() * 6; c.beginPath(); c.moveTo(x, y); c.lineTo(x + L, y); c.stroke();
    }
  }
  c.globalAlpha = 1;
}
function titulo(c: C, t: number, a: number, b: number, s: string, y: number, px: number, color = TINTA, it = false, pop = false) {
  // entra cuando el anterior ya se fue: nunca dos títulos encimados
  const al = smooth(prog(t, a + .02, a + .2)) * (1 - smooth(prog(t, b, b + .12)));
  if (al <= .01) return;
  c.font = serif(px, it); const w = c.measureText(s).width, p2 = w > 880 ? px * 880 / w : px;
  const k = pop ? ease.outBack(prog(t, a - .04, a + .3), 2) : 1;
  c.save(); c.translate(540, y + (1 - ease.outCubic(prog(t, a - .04, a + .32))) * 18); c.scale(k, k);
  texto(c, s, 0, 0, { fuente: serif(p2, it), color, alfa: al });
  c.restore();
}
function rotulos(c: C, t: number) {
  // arranque
  titulo(c, t, .22, ev.medic - .12, "una IA propuso", 250, 116, TINTA, true, true);
  titulo(c, t, ev.medic, ev.ceguera - .12, "un medicamento", 250, 116, TINTA, true);
  titulo(c, t, ev.ceguera, ev.lab - .05, "ceguera", 260, 160, ACENTO, true, true);
  titulo(c, t, ev.gota + .1, ev.celulas - .1, "funcionó", 260, 150, TINTA, true, true);
  titulo(c, t, ev.celulas, ev.personas - .1, "en células", 260, 136, TINTA, true);
  titulo(c, t, ev.personas, ev.mayo - .1, "no en personas", 240, 116, TINTA, true);
  titulo(c, t, ev.todavia, ev.mayo - .1, "todavía", 380, 140, ACENTO, true, true);
  // Robin
  titulo(c, t, ev.mayo + .1, ev.fh - .1, "mayo de 2025", 250, 116);
  titulo(c, t, ev.fh, ev.robin - .1, "FutureHouse", 250, 124);
  titulo(c, t, ev.robin, ev.lee - .15, "Robin", 270, 180, TINTA, true, true);
  titulo(c, t, ev.lee, ev.propone - .1, "miles de artículos", 250, 112, TINTA, true);
  titulo(c, t, ev.propone, ev.disena - .1, "hipótesis", 260, 140, ACENTO, true, true);
  titulo(c, t, ev.disena, ev.propuso - .1, "experimentos", 260, 130, TINTA, true);
  titulo(c, t, ev.existe, ev.ripa - .1, "que ya existe", 250, 116, TINTA, true);
  titulo(c, t, ev.ripa, ev.degen - .05, "ripasudil", 260, 150, TINTA, true, true);
  titulo(c, t, ev.degen + .05, ev.adultos - .1, "degeneración", 220, 116, TINTA);
  titulo(c, t, ev.macular, ev.adultos - .1, "macular seca", 340, 116, ACENTO, true);
  titulo(c, t, ev.adultos, ev.hicieron - .1, "adultos mayores", 260, 116, TINTA, true);
  // las personas
  titulo(c, t, ev.hicieron, ev.aparecio - .1, "las personas", 250, 130, ACENTO, true, true);
  titulo(c, t, ev.aparecio, ev.google - .1, "el efecto apareció", 250, 112, TINTA, true);
  // Google
  titulo(c, t, ev.google, ev.cosci - .1, "Google", 250, 130);
  titulo(c, t, ev.cosci, ev.debaten - .12, "Co-Scientist", 250, 150, TINTA, true, true);
  titulo(c, t, ev.nature, ev.debaten - .12, "en Nature", 380, 100, TINTA, true);
  titulo(c, t, ev.debaten, ev.corrigen - .08, "debaten", 250, 140, TINTA, true);
  titulo(c, t, ev.corrigen, ev.stanford - .1, "y se corrigen", 250, 130, ACENTO, true);
  // Stanford
  titulo(c, t, ev.stanford, ev.fibrosis - .1, "Stanford", 250, 130);
  titulo(c, t, ev.fibrosis, ev.probaron - .05, "fibrosis de hígado", 250, 116, TINTA, true);
  titulo(c, t, ev.organoides, ev.mini - .1, "organoides", 250, 140, TINTA, true, true);
  titulo(c, t, ev.mini, ev.frenan - .1, "mini hígados", 250, 130, TINTA, true);
  titulo(c, t, ev.frenan, ev.fijate - .05, "dos la frenaron", 250, 120, TINTA, true, true);
  // quién hizo qué
  titulo(c, t, ev.fijate + .05, ev.maquina - .1, "¿quién hizo qué?", 300, 140, TINTA, true, true);
  titulo(c, t, ev.maquina, ev.eligen - .1, "la máquina propone", 250, 116, TINTA, true);
  titulo(c, t, ev.eligen, ev.vuelven - .2, "eligen", 230, 116, ACENTO, true, true);
  titulo(c, t, ev.consiguen, ev.vuelven - .2, "consiguen", 350, 116, ACENTO, true, true);
  titulo(c, t, ev.prueban, ev.vuelven - .2, "prueban", 470, 116, ACENTO, true, true);
  titulo(c, t, ev.suben[0] - .1, ev.software - .1, "las cuatro preguntas", 260, 112, TINTA, true);
  // esclusas
  titulo(c, t, ev.software, ev.tener - .1, "¿se puede comprobar?", 190, 104, TINTA, true);
  titulo(c, t, ev.tener, ev.comprobar - .08, "tener ideas", 190, 116, TINTA, true);
  titulo(c, t, ev.comprobar, ev.puede - .12, "comprobarlas", 195, 140, ACENTO, true, true);
  // cierre
  titulo(c, t, ev.proponer, ev.decide - .1, "proponer", 250, 130, TINTA, true);
  titulo(c, t, ev.lab2 + .1, 999, "el laboratorio", 290, 150, ACENTO, true, true);
}

// ---------- el cuadro ----------
function dibuja(c: C, t: number) {
  FR = Math.floor(t * 10);
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  polvo(c, t);
  const v = vista(t), sh = sacudida(t);
  const z = v.z * (1 + .012 * vaiven(t, 7.3, .5));
  const ox = 10 * vaiven(t, 8.7) + 5 * vaiven(t, 5.1, 1), oy = 12 * vaiven(t, 10.1, 2);
  c.save();
  c.translate(540 + sh.x, 960 + sh.y); c.rotate(.005 * vaiven(t, 12.7)); c.scale(z, z); c.translate(-v.x - ox / Math.sqrt(z), -v.y - oy / Math.sqrt(z));
  const ve = (x: number, m = 700) => Math.abs(v.x - x) < 560 / z + m;
  const x0 = v.x - 720 / z, x1 = v.x + 720 / z;
  if (x0 < FIN_MESA) { pared(c, x0, Math.min(x1, HX - 500)); mesa(c, x0, x1); }
  if (ve(0)) estacionA(c, t);
  if (ve(B, 900) || ve(B2)) { estacionB2(c, t); estacionB(c, t); }
  if (ve(E) || ve(F)) { estacionE(c, t); estacionF(c, t); }
  if (ve(GX)) estacionG(c, t);
  if (x1 > HX - 500) regionH(c, t);
  c.restore();
  rayas(c, t);
  rotulos(c, t);
}

export const Pieza: React.FC = () => <Lienzo dibuja={(c, t) => dibuja(c, t)} preparar={() => ({})} />;
