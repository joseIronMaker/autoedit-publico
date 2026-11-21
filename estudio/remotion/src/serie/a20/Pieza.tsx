// Serie 2, capítulo 20: el enchufe. Abre dentro de un nudo de mil cables de papel; la cámara se mete en él y llega a
// una bola que tuerce a mano un cable para el calendario, otro para los archivos, otro para el correo. Caen otras bolas
// con sombrero y avientan los suyos: se enredan. «Diez modelos y cien programas»: todo se encoge a una fila de diez bolas
// y una rejilla de cien programas, los cables brotan y el contador llega a 10 × 100 = 1,000. «Anthropic publicó MCP»:
// el nudo se jala hacia su centro y en su lugar queda un enchufe de pared; el × gira y se vuelve +. Junto a la pared,
// cada programa se cablea UNA vez a su contacto, los tres contactos laten iguales y cualquier bola compatible enchufa.
// Tres bolas rivales (bombín, gorra, boina) miran con su propio nudo; lo tiran y enchufan. Una caja de cartón se arma
// alrededor del enchufe: «fundación», Anthropic, Block, OpenAI. «Faltaba otra pieza»: un hueco punteado. La bola de la
// fiesta quiere enchufarse al agente del restaurante y no hay dónde: se presentan con tarjetas, hablan con los mismos
// signos y rompen la lista de la fiesta en dos. Ese interfón es A2A, y entra al hueco de la caja. Dos viñetas: la bola
// con sus herramientas, la bola con un colega. Vuelve la imagen del principio, ahora en orden, y la cámara se mete al
// enchufe, cuya tapa se abre como una puerta hacia lo oscuro. Todos los instantes vienen de eventos.json (partitura.py).
import React from "react";
import { azar, caida, clamp, ease, lerp, prog, smooth, texto } from "../../kit";
import { ACENTO, bola, GRIS, Lienzo, mono, NOCHE, PAPEL, serif, sombra, TINTA } from "../../marca";
import { brazo } from "../../personaje";
import duracion from "./duracion.json";
import eventos from "./eventos.json";

export const DURACION = duracion.dur;
type C = CanvasRenderingContext2D;
type P2 = [number, number];
const E = eventos;
const BLANCO = "#FDFCF8", CARTON = "#E4D8C0", CARTON2 = "#CDBEA0", CARTON3 = "#EEE5D2";

// ---------- herramientas ----------
let FR = 0;
const frac = (x: number) => x - Math.floor(x);
const tiembla = (j: number) => frac(Math.sin(j * 12.9898 + FR * 78.233) * 43758.5453) - .5;
const vaiven = (t: number, p: number, f = 0) => Math.sin(t / p * 6.2832 + f);
const ven = (t: number, a: number, b: number, fi = .25, fo = .3) => smooth(prog(t, a, a + fi)) * (1 - smooth(prog(t, b, b + fo)));
const L2 = (a: P2, b: P2, k: number): P2 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
function ajusta(c: C, s: string, px: number, max: number, it = false, f = serif) { c.font = f(px, it); const w = c.measureText(s).width; return w > max ? px * max / w : px; }
function letrero(c: C, t: number, ini: number, fin: number, s: string, y: number, px: number, color = TINTA, it = false, max = 860, x = 540) {
  const a = smooth(prog(t, ini - .04, ini + .16)) * (1 - smooth(prog(t, fin, fin + .25)));
  if (a <= 0) return;
  const p = ajusta(c, s, px, max, it);
  texto(c, s, x, y + (1 - ease.outCubic(prog(t, ini - .04, ini + .32))) * 20, { fuente: serif(p, it), color, alfa: a });
}
/** Banda de papel detrás de un letrero: lo de abajo se aclara, no se tapa de golpe. */
function banda(c: C, y0: number, y1: number, a: number, x0 = 0, x1 = 1080) {
  if (a <= 0) return;
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, "rgba(244,242,236,0)"); g.addColorStop(.25, `rgba(244,242,236,${.92 * a})`);
  g.addColorStop(.75, `rgba(244,242,236,${.92 * a})`); g.addColorStop(1, "rgba(244,242,236,0)");
  c.fillStyle = g; c.fillRect(x0, y0, x1 - x0, y1 - y0);
}
/** Sello: cae grande, rebota y se asienta. */
function sello(c: C, t: number, ini: number, fin: number, s: string, x: number, y: number, px: number, color = TINTA, it = true) {
  const a = smooth(prog(t, ini, ini + .08)) * (1 - smooth(prog(t, fin, fin + .3)));
  if (a <= 0) return;
  const k = ease.outBack(prog(t, ini, ini + .26), 2.2), z = lerp(1.7, 1, clamp(k)) * (k > 1 ? 1 + (k - 1) * .3 : 1);
  c.save(); c.translate(x, y); c.scale(z, z); c.rotate(-.02);
  texto(c, s, 0, 0, { fuente: serif(ajusta(c, s, px, 900, it), it), color, alfa: a });
  c.restore();
}
/** La línea de fechas, siempre en el mismo lugar: abajo, antes de la zona que tapa TikTok. */
function pie(c: C, t: number, ini: number, fin: number, fecha: string, quien = "", tq = ini) {
  const a = ven(t, ini, fin, .2, .3);
  if (a <= 0) return;
  c.font = serif(78, true);
  const w1 = c.measureText(fecha).width, w2 = quien ? c.measureText("  ·  " + quien).width : 0, x0 = 540 - (w1 + w2) / 2;
  const sube = (1 - ease.outCubic(prog(t, ini, ini + .35))) * 24;
  c.save(); c.globalAlpha = a; c.fillStyle = ACENTO; c.fillRect(x0, 1556 + sube, w1 * ease.outCubic(prog(t, ini + .1, ini + .5)), 5); c.restore();
  texto(c, fecha, x0, 1535 + sube, { fuente: serif(78, true), color: TINTA, alfa: a, alin: "left" });
  if (quien) texto(c, "  ·  " + quien, x0 + w1, 1535 + sube, { fuente: serif(78, true), color: GRIS, alfa: a * smooth(prog(t, tq, tq + .25)), alin: "left" });
}
function polvo(c: C, t: number, alfa = 1, color = TINTA) {
  const r = azar(9);
  c.fillStyle = color;
  for (let i = 0; i < 64; i++) {
    const x0 = r() * 1200 - 60, y0 = r() * 2060, v = 14 + r() * 40, f = r() * 6.3, z = 1.6 + r() * 3.2;
    const y = ((y0 - t * v) % 2060 + 2060) % 2060 - 70, x = x0 + Math.sin(t * .5 + f) * 34;
    c.globalAlpha = alfa * (.08 + r() * .16); c.fillRect(x, y, z, z);
  }
  c.globalAlpha = 1;
}
/** n saltos entre a y b: avance suavizado y altura de cada salto. */
function saltos(t: number, a: number, b: number, n: number, h: number) {
  const u = prog(t, a, b);
  return { k: smooth(u), y: u > 0 && u < 1 ? -h * Math.abs(Math.sin(Math.PI * n * u)) : 0 };
}
/** Caída con rebote (física del kit): desplazamiento hacia arriba desde el piso. */
function cae(t: number, t0: number, alto: number) {
  const h = 1.2, ti = Math.sqrt(2 * h / 30);
  const { z } = caida(t - (t0 - ti), h, .34);
  return -z / h * alto;
}

// ---------- personajes ----------
type Gorro = "" | "fiesta" | "bombin" | "gorra" | "boina" | "copa" | "chef";
function sombrero(c: C, k: Gorro, x: number, y: number, r: number, inc = 0, alfa = 1) {
  if (!k || alfa <= 0) return;
  c.save(); c.globalAlpha *= alfa; c.translate(x, y - r * .82); c.rotate(inc); c.scale(r / 90, r / 90);
  c.lineWidth = 5; c.strokeStyle = TINTA; c.lineJoin = "round";
  // los sombreros oscuros llevan un filo de papel: si no, se pierden contra la bola negra
  const filo = () => { c.save(); c.strokeStyle = "rgba(244,242,236,.95)"; c.lineWidth = 5; c.stroke(); c.restore(); };
  if (k === "fiesta") {
    c.fillStyle = ACENTO; c.beginPath(); c.moveTo(-70, 12); c.lineTo(18, -170); c.lineTo(62, 18); c.closePath(); c.fill();
    c.fillStyle = BLANCO; for (const q of [.35, .62]) { c.beginPath(); c.arc(lerp(-4, 18, q), lerp(12, -170, q) + 16, 7, 0, 7); c.fill(); }
    c.fillStyle = TINTA; c.beginPath(); c.arc(18, -174, 17, 0, 7); c.fill();
  } else if (k === "bombin") {
    c.fillStyle = "#2a2927"; c.beginPath(); c.ellipse(0, 6, 60, 70, 0, Math.PI, 0); c.closePath(); c.fill(); filo();
    c.beginPath(); c.ellipse(0, 10, 96, 17, 0, 0, 7); c.fill(); filo();
    c.fillStyle = BLANCO; c.fillRect(-58, -10, 116, 12);
  } else if (k === "gorra") {
    c.fillStyle = "#8a877f"; c.beginPath(); c.ellipse(-4, 8, 82, 58, 0, Math.PI, 0); c.closePath(); c.fill(); filo();
    c.fillStyle = "#5a5852"; c.beginPath(); c.ellipse(70, 8, 64, 13, .06, 0, 7); c.fill(); filo();
    c.beginPath(); c.arc(-4, -50, 9, 0, 7); c.fill();
  } else if (k === "boina") {
    c.fillStyle = "#6f5f4a"; c.beginPath(); c.ellipse(10, -4, 94, 30, .14, 0, 7); c.fill(); filo();
    c.beginPath(); c.moveTo(18, -30); c.lineTo(24, -52); c.lineTo(30, -30); c.fill();
  } else if (k === "copa") {
    c.fillStyle = "#2a2927"; c.beginPath(); c.rect(-48, -112, 96, 122); c.fill(); filo();
    c.beginPath(); c.ellipse(0, 10, 84, 15, 0, 0, 7); c.fill(); filo(); c.fillStyle = BLANCO; c.fillRect(-48, -16, 96, 12);
  } else if (k === "chef") {
    c.fillStyle = BLANCO; c.beginPath(); c.roundRect(-58, -40, 116, 52, 8); c.fill(); c.stroke();
    for (const [px, py, pr] of [[-42, -80, 40], [42, -80, 40], [0, -104, 50]] as number[][]) { c.beginPath(); c.arc(px, py, pr, 0, 7); c.fill(); c.stroke(); }
    c.fillStyle = BLANCO; c.fillRect(-52, -66, 104, 34);
  }
  c.restore();
}
type Opc = { abre1?: number; abre2?: number; gorro?: Gorro; inc?: number; piso?: number; alfa?: number; aplasta?: number; gorroY?: number };
/** La bola de la serie (manos de personaje.ts) con su sombrero. m1, m2: dónde está cada mano. */
function tipo(c: C, x: number, y: number, r: number, m1: P2, m2: P2, o: Opc = {}) {
  const a = o.alfa ?? 1; if (a <= 0) return;
  const g = r / 90, sq = o.aplasta ?? 0;
  c.save(); c.globalAlpha *= a;
  if (o.piso !== undefined) sombra(c, x, o.piso, r * 1.7, .28);
  brazo(c, x - 54 * g, y - 46 * g, m1[0], m1[1], 80 * g, o.abre1 ?? .6, TINTA, 1, g);
  brazo(c, x + 56 * g, y - 34 * g, m2[0], m2[1], -86 * g, o.abre2 ?? .6, TINTA, 1, g);
  c.save(); c.translate(x, y + r); c.scale(1 + sq * .14, 1 - sq * .14); bola(c, 0, -r, r); c.restore();
  sombrero(c, o.gorro ?? "", x, y - sq * r * .28 + (o.gorroY ?? 0), r, o.inc ?? 0);
  c.restore();
}

// ---------- objetos ----------
type Icono = "cal" | "car" | "sob" | "doc" | "gra" | "foto" | "mapa";
const ICONOS: Icono[] = ["cal", "car", "sob", "doc", "gra", "foto", "mapa"];
function icono(c: C, k: Icono, x: number, y: number, S: number, rot = 0, luz = 0, alfa = 1) {
  if (alfa <= 0 || S < 1) return;
  c.save(); c.globalAlpha *= alfa; c.translate(x, y); c.rotate(rot);
  if (luz > 0) {
    const g = c.createRadialGradient(0, 0, S * .2, 0, 0, S * 1.1);
    g.addColorStop(0, `rgba(192,68,42,${.26 * luz})`); g.addColorStop(1, "rgba(192,68,42,0)");
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, S * 1.1, 0, 7); c.fill();
  }
  const s = S / 160; c.scale(s, s);
  c.lineWidth = Math.max(5, 1.6 / s); c.strokeStyle = TINTA; c.lineJoin = "round"; c.fillStyle = BLANCO;
  const caja = (w: number, h: number, r = 12) => { c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, r); c.fill(); c.stroke(); };
  if (k === "cal") {
    caja(150, 150); c.fillStyle = luz > .5 ? ACENTO : TINTA; c.fillRect(-75, -75, 150, 36);
    c.fillStyle = TINTA; for (const dx of [-38, 38]) c.fillRect(dx - 6, -90, 12, 28);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) c.fillRect(-56 + j * 32, -22 + i * 30, 18, 16);
  } else if (k === "car") {
    c.fillStyle = "#EFE5CC"; c.beginPath(); c.moveTo(-76, -58); c.lineTo(-24, -58); c.lineTo(-10, -42); c.lineTo(76, -42); c.lineTo(76, 62); c.lineTo(-76, 62); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-76, -26); c.lineTo(76, -26); c.stroke();
  } else if (k === "sob") {
    caja(156, 108, 8); c.beginPath(); c.moveTo(-78, -54); c.lineTo(0, 12); c.lineTo(78, -54); c.stroke();
  } else if (k === "doc") {
    c.beginPath(); c.moveTo(-56, -76); c.lineTo(28, -76); c.lineTo(56, -48); c.lineTo(56, 76); c.lineTo(-56, 76); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = TINTA; for (let i = 0; i < 4; i++) c.fillRect(-34, -26 + i * 26, 68 - (i % 2) * 18, 9);
  } else if (k === "gra") {
    caja(150, 130); c.fillStyle = TINTA; [40, 72, 100].forEach((h, i) => c.fillRect(-50 + i * 38, 50 - h, 24, h));
  } else if (k === "foto") {
    caja(152, 120, 8); c.fillStyle = TINTA; c.beginPath(); c.moveTo(-60, 46); c.lineTo(-14, -6); c.lineTo(16, 24); c.lineTo(34, 8); c.lineTo(62, 46); c.closePath(); c.fill();
    c.beginPath(); c.arc(36, -26, 14, 0, 7); c.fill();
  } else {
    c.beginPath(); c.moveTo(0, 78); c.bezierCurveTo(-30, 30, -58, 6, -58, -26); c.arc(0, -26, 58, Math.PI, 0); c.bezierCurveTo(58, 6, 30, 30, 0, 78); c.fill(); c.stroke();
    c.fillStyle = TINTA; c.beginPath(); c.arc(0, -26, 20, 0, 7); c.fill();
  }
  c.restore();
}

const PW = 170, PH = 270;            // placa de pared a escala 1
/** Contacto doble de pared (como los de México). ocupa: [arriba, abajo] con clavija puesta. */
function placa(c: C, x: number, y: number, s: number, o: { alfa?: number; pulso?: number; tornillo?: number } = {}) {
  const a = o.alfa ?? 1; if (a <= 0) return;
  c.save(); c.globalAlpha *= a; c.translate(x, y); const z = s * (1 + .08 * (o.pulso ?? 0)); c.scale(z, z);
  const g = c.createRadialGradient(8, 16, 40, 8, 16, 190); g.addColorStop(0, "rgba(20,18,14,.2)"); g.addColorStop(1, "rgba(20,18,14,0)");
  c.fillStyle = g; c.fillRect(-200, -200, 400, 420);
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 5; c.lineJoin = "round";
  c.beginPath(); c.roundRect(-PW / 2, -PH / 2, PW, PH, 18); c.fill(); c.stroke();
  c.strokeStyle = "rgba(17,17,17,.14)"; c.lineWidth = 3; c.beginPath(); c.roundRect(-PW / 2 + 9, -PH / 2 + 9, PW - 18, PH - 18, 12); c.stroke();
  for (const oy of [-62, 62]) {
    c.fillStyle = "#E9E6DC"; c.strokeStyle = TINTA; c.lineWidth = 3.5; c.beginPath(); c.roundRect(-46, oy - 44, 92, 88, 22); c.fill(); c.stroke();
    c.fillStyle = TINTA; c.beginPath(); c.roundRect(-25, oy - 26, 10, 34, 3); c.fill(); c.beginPath(); c.roundRect(15, oy - 23, 10, 28, 3); c.fill();
    c.beginPath(); c.arc(0, oy + 24, 11, Math.PI, 0); c.lineTo(11, oy + 30); c.lineTo(-11, oy + 30); c.closePath(); c.fill();
  }
  c.fillStyle = "#D5D1C6"; c.strokeStyle = TINTA; c.lineWidth = 2.5; c.beginPath(); c.arc(0, 0, 8, 0, 7); c.fill(); c.stroke();
  const tr = (o.tornillo ?? 0) * 6.28 + .6; c.beginPath(); c.moveTo(-6 * Math.cos(tr), -6 * Math.sin(tr)); c.lineTo(6 * Math.cos(tr), 6 * Math.sin(tr)); c.stroke();
  c.restore();
}
/** El interfón: A2A. Rejilla para hablar y un botón. */
function interfon(c: C, x: number, y: number, s: number, o: { alfa?: number; habla?: number } = {}) {
  const a = o.alfa ?? 1; if (a <= 0) return;
  c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(s, s);
  const g = c.createRadialGradient(8, 16, 40, 8, 16, 190); g.addColorStop(0, "rgba(20,18,14,.2)"); g.addColorStop(1, "rgba(20,18,14,0)");
  c.fillStyle = g; c.fillRect(-200, -200, 400, 420);
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.roundRect(-PW / 2, -PH / 2, PW, PH, 18); c.fill(); c.stroke();
  c.fillStyle = "#E9E6DC"; c.lineWidth = 3.5; c.beginPath(); c.arc(0, -46, 58, 0, 7); c.fill(); c.stroke();
  c.fillStyle = TINTA;
  const h = o.habla ?? 0;
  for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) {
    const px = i * 14 + (j % 2 ? 7 : 0), py = j * 13; if (px * px + py * py > 46 * 46) continue;
    c.beginPath(); c.arc(px, -46 + py, 3.6 + h * 1.6 * Math.max(0, Math.sin(i * 1.3 + j + FR * 2.1)), 0, 7); c.fill();
  }
  c.fillStyle = "#D5D1C6"; c.beginPath(); c.arc(0, 66, 24, 0, 7); c.fill(); c.stroke();
  c.fillStyle = h > .5 ? ACENTO : TINTA; c.beginPath(); c.arc(0, 66, 10, 0, 7); c.fill();
  c.restore();
}
/** Clavija vista de frente; (x, y) es el centro de su cara. */
function clavija(c: C, x: number, y: number, s: number, puesta = 0, rot = 0) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  if (puesta < 1) { c.fillStyle = "#9d9a90"; c.globalAlpha *= 1; c.fillRect(-21, -40 * (1 - puesta) - 6, 9, 40 * (1 - puesta) + 6); c.fillRect(13, -34 * (1 - puesta) - 6, 9, 34 * (1 - puesta) + 6); }
  c.fillStyle = "#1c1c1b"; c.strokeStyle = "#000"; c.lineWidth = 2; c.beginPath(); c.roundRect(-34, -30, 68, 72, 14); c.fill();
  c.strokeStyle = "#3a3a38"; c.lineWidth = 3; for (const dy of [12, 22, 32]) { c.beginPath(); c.moveTo(-22, dy); c.lineTo(22, dy); c.stroke(); }
  c.restore();
}
/** Una clavija que va de la mano al contacto o: u = cuánto viajó, p = cuánto entró. */
function enchufa(c: C, mano: P2, o: P2, u: number, p: number, s = .9, alfa = 1) {
  if (alfa <= 0 || u <= 0) return;
  const pos = L2(mano, [o[0], o[1] + 40 * s], u), y = pos[1] - 36 * s * p;
  cordon(c, mano, [pos[0], y + 40 * s], alfa, 6, u < 1 ? .3 : 1);
  c.save(); c.globalAlpha *= alfa; clavija(c, pos[0], y, s, p, (1 - u) * .5); c.restore();
}
/** Cordón negro con caída natural. */
function cordon(c: C, a: P2, b: P2, alfa = 1, g = 6, cae = 1) {
  if (alfa <= 0) return;
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]), sag = (30 + d * .12) * cae;
  c.save(); c.globalAlpha *= alfa; c.strokeStyle = TINTA; c.lineWidth = g; c.lineCap = "round";
  c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo((a[0] + b[0]) / 2, Math.max(a[1], b[1]) + sag, b[0], b[1]); c.stroke(); c.restore();
}

// ---------- cables de papel ----------
type Cad = number[];   // 7 puntos (14 números): dos cúbicas S-c1-c2-K y K-c3-c4-P
function bez(a: number, b: number, c2: number, d: number, u: number) { const v = 1 - u; return v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * c2 + u * u * u * d; }
function muestra(k: Cad, n: number): P2[] {
  const out: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n * 2, s = u < 1 ? 0 : 6, w = u < 1 ? u : u - 1;
    out.push([bez(k[s], k[s + 2], k[s + 4], k[s + 6], w), bez(k[s + 1], k[s + 3], k[s + 5], k[s + 7], w)]);
  }
  return out;
}
/** Cadena para un cable a mano que cuelga de a a b con una panza `sag`. */
function cadenaCuelga(a: P2, b: P2, sag: number, lado = 0): Cad {
  const q: P2 = [(a[0] + b[0]) / 2 + lado, Math.max(a[1], b[1]) * 0 + (a[1] + b[1]) / 2 + sag];
  const quad = (u: number): P2 => [(1 - u) ** 2 * a[0] + 2 * (1 - u) * u * q[0] + u * u * b[0], (1 - u) ** 2 * a[1] + 2 * (1 - u) * u * q[1] + u * u * b[1]];
  const pts = [0, 1 / 6, 2 / 6, .5, 4 / 6, 5 / 6, 1].map(quad);
  return pts.flat();
}
/** Tira de papel torcida: borde de tinta, alma blanca y marcas de torsión. rizo: un bucle hecho a mano. */
function tira(c: C, k: Cad, ancho: number, o: { rizo?: number; ondas?: number; fase?: number; alfa?: number; hasta?: number } = {}) {
  const a = o.alfa ?? 1; if (a <= 0 || ancho <= .2) return;
  const n = 64, P = muestra(k, n), hasta = o.hasta ?? 1;
  const Q: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n; if (u > hasta + 1e-6) break;
    const p = P[i], q = P[Math.min(n, i + 1)], r = P[Math.max(0, i - 1)];
    let dx = q[0] - r[0], dy = q[1] - r[1]; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
    const w = Math.sin(u * Math.PI) * Math.sin(u * 6.28 * (o.ondas ?? 2.2) + (o.fase ?? 0)) * ancho * .9;
    let x = p[0] - dy * w, y = p[1] + dx * w;
    const R = o.rizo ?? 0;
    if (R > 0 && u > .44 && u < .58) { const v = (u - .44) / .14, an = v * 6.2832; x += (Math.sin(an) * dx - (1 - Math.cos(an)) * dy * 1) * R - dx * v * R * 0; y += (Math.sin(an) * dy + (1 - Math.cos(an)) * dx) * R; }
    Q.push([x + tiembla(i + (o.fase ?? 0) * 31) * .8, y + tiembla(i + 50 + (o.fase ?? 0) * 31) * .8]);
  }
  if (Q.length < 2) return;
  c.save(); c.globalAlpha *= a; c.lineCap = "round"; c.lineJoin = "round";
  const traza = () => { c.beginPath(); c.moveTo(Q[0][0], Q[0][1]); for (let i = 1; i < Q.length; i++) c.lineTo(Q[i][0], Q[i][1]); c.stroke(); };
  c.strokeStyle = TINTA; c.lineWidth = ancho; traza();
  c.strokeStyle = BLANCO; c.lineWidth = ancho * .56; traza();
  if (ancho > 5) {
    c.strokeStyle = TINTA; c.lineWidth = Math.max(1.4, ancho * .14);
    c.beginPath();
    for (let i = 2; i < Q.length - 1; i += 2) {
      const p = Q[i], q = Q[i + 1]; let dx = q[0] - p[0], dy = q[1] - p[1]; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
      const h = ancho * .3; c.moveTo(p[0] - dy * h - dx * h * .8, p[1] + dx * h - dy * h * .8); c.lineTo(p[0] + dy * h + dx * h * .8, p[1] - dx * h + dy * h * .8);
    }
    c.stroke();
  }
  c.restore();
}
/** Cómo se amarró cada cable al programa: hecho a mano, cada uno distinto. */
function amarre(c: C, x: number, y: number, tipo: number, s: number) {
  c.save(); c.translate(x, y); c.scale(s, s); c.strokeStyle = TINTA; c.lineWidth = 4; c.fillStyle = BLANCO;
  if (tipo === 0) { c.fillStyle = TINTA; c.beginPath(); c.ellipse(0, 0, 15, 11, .4, 0, 7); c.fill(); c.beginPath(); c.moveTo(6, 4); c.lineTo(20, 22); c.moveTo(-4, 6); c.lineTo(-14, 24); c.stroke(); }
  else if (tipo === 1) { c.rotate(-.3); c.fillStyle = "rgba(232,224,200,.95)"; c.fillRect(-26, -11, 52, 22); c.strokeRect(-26, -11, 52, 22); }
  else { c.beginPath(); c.roundRect(-9, -24, 18, 44, 9); c.stroke(); c.beginPath(); c.roundRect(-4, -16, 8, 30, 4); c.stroke(); }
  c.restore();
}

// ---------- escena 1: cables a mano (coordenadas de pantalla) ----------
const PISO1 = 1440;
const P1 = { x: 290, y: 1346, r: 90 }, B1 = { x: 640, y: 1366, r: 74 }, C1 = { x: 868, y: 1366, r: 74 };
const PR1 = [{ k: "cal" as Icono, x: 230, y: 560 }, { k: "car" as Icono, x: 540, y: 470 }, { k: "sob" as Icono, x: 850, y: 560 }];
const S1 = 160;
type Cab = { de: 0 | 1 | 2; a: number; lanza: number; pega: number; amarre: number; rizo: number; fase: number; dx: number };
const CABLES1: Cab[] = [
  { de: 0, a: 0, lanza: E.lanza[0], pega: E.pega[0], amarre: 0, rizo: 22, fase: .3, dx: -34 },
  { de: 0, a: 1, lanza: E.lanza[1], pega: E.pega[1], amarre: 1, rizo: 0, fase: 1.7, dx: -40 },
  { de: 0, a: 2, lanza: E.lanza[2], pega: E.pega[2], amarre: 2, rizo: 18, fase: 2.9, dx: -42 },
  ...[[1, 0], [2, 2], [1, 1], [2, 0], [1, 2], [2, 1]].map(([de, a], k) => ({
    de: de as 1 | 2, a, lanza: E.avientan[k] - .02, pega: E.avientan[k] + .36, amarre: (k + 1) % 3, rizo: k % 2 ? 0 : 20, fase: 4 + k * 1.3, dx: 0,
  })),
];
// dónde se amarra cada cable en su programa (tres por programa, repartidos)
const OFF_AMARRE = (() => { const n = [0, 0, 0]; return CABLES1.map((cb) => [-44, 0, 44][n[cb.a]++]); })();
const LLEGA_B = [E.caen2[0], E.caen2[1]];

// destino de cada cosa en la rejilla del mil
const GX = (cc: number) => 160 + cc * 84.44, GY = (rr: number) => 484 + rr * 38, GS = 30;
const RX = (i: number) => 160 + i * 84.44, RY = 1420, RR = 30;
const PROG_DEST = [91, 94, 98], BOLA_DEST = [1, 5, 8];
const GORROS_FILA: Gorro[] = ["", "", "boina", "", "copa", "bombin", "gorra", "", "gorra", "bombin"];
GORROS_FILA[5] = "bombin"; GORROS_FILA[8] = "gorra";
const morfo = (t: number) => ease.inOutCubic(prog(t, E.diez, E.diez + 1.05));

function posBola1(k: 0 | 1 | 2, t: number) {
  const base = [P1, B1, C1][k];
  let x = base.x, y = base.y, r = base.r;
  if (k > 0) y += cae(t, LLEGA_B[k - 1], 1500);
  const m = morfo(t);
  if (m > 0) { const i = BOLA_DEST[k]; x = lerp(x, RX(i), m); y = lerp(y, RY, m); r = lerp(r, RR, m); }
  return { x, y, r };
}
function posProg1(j: number, t: number) {
  const b = PR1[j], m = morfo(t), d = PROG_DEST[j];
  return { x: lerp(b.x, GX(d % 10), m), y: lerp(b.y, GY(Math.floor(d / 10)), m), S: lerp(S1, GS, m) };
}
function sacudida(j: number, t: number) {
  let r = .02 * vaiven(t, 2.3 + j * .4, j);
  CABLES1.forEach((cb) => { if (cb.a === j && t > cb.pega) { const a = t - cb.pega; r += .14 * Math.exp(-a * 4) * Math.sin(a * 15); } });
  return r * (1 - morfo(t));
}
function ancla1(cb: Cab, t: number): P2 {
  const b = posBola1(cb.de, t), g = b.r / 90;
  return [b.x + (cb.de === 0 ? 58 : 46) * g + (cb.de === 0 ? (cb.a - 1) * 10 : 0) * g, b.y - 40 * g];
}
function puntaPrograma(cb: Cab, t: number, i: number): P2 {
  const p = posProg1(cb.a, t), s = p.S / S1;
  return [p.x + OFF_AMARRE[i] * s, p.y + 74 * s];
}
/** La cadena de un cable de la escena 1 a la hora t (vuelo, caída y bamboleo). */
function cadena1(cb: Cab, i: number, t: number): Cad | null {
  if (t < cb.lanza) return null;
  const a = ancla1(cb, t), b = puntaPrograma(cb, t, i);
  const u = prog(t, cb.lanza, cb.pega);
  if (u < 1) {
    const k = ease.outCubic(u), arco = -260 * Math.sin(Math.PI * u);
    const fin: P2 = [lerp(a[0] + 40, b[0], k), lerp(a[1] - 60, b[1], k) + arco];
    return cadenaCuelga(a, fin, lerp(-40, 40, u));
  }
  const e = t - cb.pega;
  return cadenaCuelga(a, b, 120 + 80 * Math.exp(-e * 3.2) * Math.cos(e * 9), (i % 2 ? 40 : -40));
}

function bolaP1(c: C, t: number, alfaFila = 1) {
  const p = posBola1(0, t), m = morfo(t);
  const g = p.r / 90;
  // manos: tuercen, amarran, lanzan, descansan
  const centro: P2 = [p.x + 14 * g, p.y - 196 * g];
  let m1: P2 = [p.x - 130 * g, p.y - 96 * g + 10 * g * vaiven(t, 1.3)], m2: P2 = [p.x + 132 * g, p.y - 104 * g + 10 * g * vaiven(t, 1.1, 1)];
  const tw = ven(t, E.llega - 1, E.nudo1 - .1, .1, .25);
  if (tw > 0) {
    const w = t * 9.5;
    m1 = L2(m1, [centro[0] + Math.cos(w) * 62 * g, centro[1] + Math.sin(w) * 24 * g], tw);
    m2 = L2(m2, [centro[0] - Math.cos(w) * 62 * g, centro[1] - Math.sin(w) * 24 * g], tw);
  }
  const nd = ven(t, E.nudo1 - .12, E.nudo1 + .1, .1, .2);
  if (nd > 0) { m1 = L2(m1, [p.x - 170 * g, p.y - 170 * g], nd); m2 = L2(m2, [p.x + 170 * g, p.y - 170 * g], nd); }
  for (const tl of E.lanza) {
    const q = prog(t, tl - .08, tl + .5); if (q <= 0 || q >= 1) continue;
    const sube = Math.sin(Math.PI * Math.min(q * 1.6, 1));
    m2 = L2(m2, [p.x + 110 * g, p.y - 330 * g], sube);
  }
  let sq = 0; for (const tl of E.lanza) { const q = t - tl; if (q > 0 && q < .6) sq += .5 * Math.exp(-q * 7) * Math.sin(q * 20); }
  // rollo de papel y la tira que se tuerce
  const aR = ven(t, -1, E.lanza[0] + .3, .1, .4) * (1 - m);
  if (aR > 0) {
    c.save(); c.globalAlpha = aR;
    c.fillStyle = "rgba(244,242,236,1)";
    const rx = 112, ry = 1394;
    c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.arc(rx, ry, 44, 0, 7); c.fill(); c.stroke();
    c.lineWidth = 2.5; c.beginPath(); for (let a = 0; a < 18; a += .2) { const rr = 6 + a * 2.1; const an = a + t * 3 * tw; if (a === 0) c.moveTo(rx + Math.cos(an) * rr, ry + Math.sin(an) * rr); else c.lineTo(rx + Math.cos(an) * rr, ry + Math.sin(an) * rr); } c.stroke();
    if (tw > .05) {
      c.strokeStyle = TINTA; c.lineWidth = 15; c.lineCap = "butt"; c.beginPath(); c.moveTo(rx + 20, ry - 40); c.quadraticCurveTo(rx + 40, centro[1] + 40, centro[0] - 10, centro[1] + 6); c.stroke();
      c.strokeStyle = BLANCO; c.lineWidth = 10; c.stroke();
    }
    c.restore();
  }
  // la cuerda que sale de las manos al rollo del piso
  const loops = Math.max(0, Math.round(7 * prog(t, E.llega - .4, E.nudo1)) - 2 * E.pega.filter((x) => t > x).length);
  const aC = (1 - m) * ven(t, -1, E.pega[2] + .5, .1, .4);
  if (aC > 0 && tw > .05) tira(c, cadenaCuelga(centro, [470, 1410], 60), 13, { alfa: tw * aC, fase: t * 6, ondas: 3.2 });
  if (aC > 0) {
    c.save(); c.globalAlpha = aC;
    for (let i = 0; i < loops; i++) { c.strokeStyle = TINTA; c.lineWidth = 12; c.beginPath(); c.ellipse(470 + Math.sin(i * 1.7) * 6, 1424 - i * 8, 76, 18, Math.sin(i) * .05, 0, 7); c.stroke(); c.strokeStyle = BLANCO; c.lineWidth = 6; c.stroke(); }
    c.restore();
  }
  tipo(c, p.x, p.y, p.r, m1, m2, { piso: lerp(PISO1, RY + RR, m), abre1: tw > .3 ? .2 : .6, abre2: tw > .3 ? .2 : .7, aplasta: sq, alfa: alfaFila, gorro: "" });
  return { m1, m2 };
}

// ---------- el nudo de mil ----------
type Nudo = { cab: Float32Array; n: number; spawn: Float32Array; heroe: Uint8Array; cuenta: Float32Array; pop: Float32Array };
const KC: P2 = [540, 1112];
function preparaNudo(): Nudo {
  const r = azar(2024), n = 1000, cab = new Float32Array(n * 12), spawn = new Float32Array(n), heroe = new Uint8Array(n);
  // aparición de los cien programas: una ola desde el centro
  const pop = new Float32Array(100);
  const orden = [...Array(100).keys()].sort((a, b) => Math.hypot(GX(a % 10) - 540, GY(Math.floor(a / 10)) - 650) - Math.hypot(GX(b % 10) - 540, GY(Math.floor(b / 10)) - 650));
  orden.forEach((j, k) => { pop[j] = E.cien - .05 + .36 * (k / 99); });
  for (const j of PROG_DEST) pop[j] = 0;
  const lista: number[] = [];
  for (let i = 0; i < 10; i++) for (let j = 0; j < 100; j++) {
    const q = i * 100 + j, rad = Math.pow(r(), .75), an = r() * 6.2832, dir = r() * 6.2832, L = 110 + r() * 200;
    cab.set([KC[0] + Math.cos(an) * rad * 340, KC[1] + Math.sin(an) * rad * 190, (r() - .5) * 420, -90 - r() * 260, Math.cos(dir) * L, Math.sin(dir) * L, (r() - .5) * 360, 70 + r() * 240, r() * 6.28, r() * 6.28, .7 + r() * .8, r()], q * 12);
    const h = BOLA_DEST.indexOf(i), pj = PROG_DEST.indexOf(j);
    if (h >= 0 && pj >= 0) heroe[q] = 1; else lista.push(q);
  }
  // orden de brote al azar; la cuenta llega a 1,000 justo en «mil»
  for (let k = lista.length - 1; k > 0; k--) { const z = Math.floor(r() * (k + 1)); [lista[k], lista[z]] = [lista[z], lista[k]]; }
  const [b0, b1] = E.brotan;
  lista.forEach((q, k) => { spawn[q] = Math.max(b0 + (b1 - b0) * Math.pow(k / (lista.length - 1), .72), pop[q % 100] + .05); });
  lista.forEach((q) => { spawn[q] = Math.min(spawn[q], E.mil - .01); });
  const ts = Array.from(lista, (q) => spawn[q]).sort((a, b) => a - b);
  return { cab, n, spawn, heroe, cuenta: Float32Array.from(ts), pop };
}
function cuantos(d: Nudo, t: number) { let lo = 0, hi = d.cuenta.length; while (lo < hi) { const m = (lo + hi) >> 1; if (d.cuenta[m] <= t) lo = m + 1; else hi = m; } return lo + 9; }

/** Cadena del cable (i, j) del nudo a la hora t, ya con temblor, tensión y colapso. */
function cadenaNudo(d: Nudo, q: number, t: number, ini: P2, fin: P2, out: Cad) {
  const o = q * 12, A = d.cab;
  const vib = 1 + 3 * smooth(prog(t, E.anth, E.jala)) * (t < E.colapsa ? 1 : 0);
  const kx = A[o] + Math.sin(t * 1.6 * A[o + 10] + A[o + 8]) * 9 * vib + tiembla(q) * 1.4 * vib, ky = A[o + 1] + Math.cos(t * 1.3 * A[o + 10] + A[o + 9]) * 7 * vib;
  const enc = 1 - .07 * smooth(prog(t, E.anth, E.jala));
  const K: P2 = [KC[0] + (kx - KC[0]) * enc, KC[1] + (ky - KC[1]) * enc];
  const pts: P2[] = [ini, [ini[0] + A[o + 2], ini[1] + A[o + 3]], [K[0] + A[o + 4], K[1] + A[o + 5]], K, [K[0] - A[o + 4], K[1] - A[o + 5]], [fin[0] + A[o + 6], fin[1] + A[o + 7]], fin];
  const km = ease.inCubic(prog(t, E.jala, E.colapsa - .1)), ke = ease.inCubic(prog(t, E.jala + .18, E.colapsa));
  if (km > 0 || ke > 0) {
    const CEN: P2 = [540, 1130];
    pts.forEach((p, i) => {
      const k = i === 0 || i === 6 ? ke : Math.max(km, ke * .9);
      const gx = p[0] - CEN[0], gy = p[1] - CEN[1], an = k * 2.2;
      const rx = gx * Math.cos(an) - gy * Math.sin(an), ry = gx * Math.sin(an) + gy * Math.cos(an);
      pts[i] = [CEN[0] + rx * (1 - k), CEN[1] + ry * (1 - k)];
    });
  }
  for (let i = 0; i < 7; i++) { out[i * 2] = pts[i][0]; out[i * 2 + 1] = pts[i][1]; }
  return out;
}
function manoFila(i: number, j: number, t: number): P2 {
  const lado = j % 2 ? 1 : -1;
  return [RX(i) + lado * 24 + 3 * vaiven(t, .9 + i * .07, i), RY - 62 + 4 * vaiven(t, 1.1, j)];
}
function puntaRejilla(j: number, t: number): P2 {
  const h = PROG_DEST.indexOf(j);
  if (h >= 0) { const p = posProg1(h, t); return [p.x, p.y + p.S * .46]; }
  return [GX(j % 10), GY(Math.floor(j / 10)) + GS * .46];
}
function bolaFila(c: C, i: number, t: number, alfa: number) {
  const h = BOLA_DEST.indexOf(i);
  if (h >= 0) return;
  const f = [0, 2, 3, 4, 6, 7, 9].indexOf(i), t0 = E.filas[f] + .35;
  if (t < t0 - .4) return;
  const y = RY + cae(t, t0, 1100);
  tipo(c, RX(i), y, RR, [RX(i) - 24 + 3 * vaiven(t, .9 + i * .07, i), y - 62], [RX(i) + 24, y - 62 + 4 * vaiven(t, 1.1, i)], { gorro: GORROS_FILA[i], piso: RY + RR, alfa, abre1: .3, abre2: .3 });
}

/** Todo el mundo del mil: rejilla, fila, cables y nudo. `estado` fija la hora del nudo (para el arranque). */
function mundoMil(c: C, t: number, d: Nudo, o: { tNudo?: number; alfa?: number } = {}) {
  const tn = o.tNudo ?? t, a = o.alfa ?? 1;
  if (a <= 0) return;
  // programas de la rejilla
  for (let j = 0; j < 100; j++) {
    if (PROG_DEST.includes(j)) continue;
    const q = ease.outBack(prog(tn, d.pop[j], d.pop[j] + .22), 2.4);
    if (q <= 0) continue;
    const tiro = tn > E.jala + .1 && tn < E.colapsa + .6 ? .25 * Math.exp(-Math.max(tn - E.colapsa + .2, 0) * 5) * Math.sin(tn * 30 + j) : 0;
    icono(c, ICONOS[(j * 7 + Math.floor(j / 10) * 3) % 7], GX(j % 10), GY(Math.floor(j / 10)), GS * q, .05 * Math.sin(tn * 1.3 + j) + tiro, 0, a);
  }
  // el nudo: mil caminos, tinta clara; unos cuantos son tiras de papel
  if (tn < E.colapsa + .02) {
    const out: Cad = new Array(14).fill(0);
    const capas = 22;
    for (let b = 0; b < capas; b++) {
      const t0 = lerp(E.brotan[0], E.brotan[1], b / capas), t1 = lerp(E.brotan[0], E.brotan[1], (b + 1) / capas);
      let alfa = 0;
      c.beginPath();
      let hay = false;
      for (let q = 0; q < d.n; q++) {
        if (d.heroe[q]) continue;
        const sp = d.spawn[q]; if (sp < t0 || sp >= t1 || sp > tn) continue;
        hay = true; alfa = Math.max(alfa, smooth(prog(tn, sp, sp + .15)));
        const i = Math.floor(q / 100), j = q % 100;
        cadenaNudo(d, q, tn, manoFila(i, j, tn), puntaRejilla(j, tn), out);
        c.moveTo(out[0], out[1]); c.bezierCurveTo(out[2], out[3], out[4], out[5], out[6], out[7]); c.bezierCurveTo(out[8], out[9], out[10], out[11], out[12], out[13]);
      }
      if (!hay) continue;
      c.save(); c.globalAlpha = a * .2 * Math.max(alfa, smooth(prog(tn, t1, t1 + .15))); c.strokeStyle = TINTA; c.lineWidth = 1.7; c.stroke(); c.restore();
    }
    // tiras de papel: uno de cada veinte
    for (let q = 7; q < d.n; q += 19) {
      if (d.heroe[q] || d.spawn[q] > tn) continue;
      const i = Math.floor(q / 100), j = q % 100;
      cadenaNudo(d, q, tn, manoFila(i, j, tn), puntaRejilla(j, tn), out);
      c.save(); c.globalAlpha = a * smooth(prog(tn, d.spawn[q], d.spawn[q] + .15)); c.lineCap = "round";
      c.beginPath(); c.moveTo(out[0], out[1]); c.bezierCurveTo(out[2], out[3], out[4], out[5], out[6], out[7]); c.bezierCurveTo(out[8], out[9], out[10], out[11], out[12], out[13]);
      c.strokeStyle = TINTA; c.lineWidth = 6; c.stroke(); c.strokeStyle = BLANCO; c.lineWidth = 3; c.stroke(); c.restore();
    }
  }
  // la fila de diez
  for (let i = 0; i < 10; i++) bolaFila(c, i, tn, a);
}

// ---------- escena 1 + transición al mil ----------
function escenaMano(c: C, t: number, d: Nudo) {
  const m = morfo(t);
  // piso
  c.save(); c.globalAlpha = 1 - m; c.strokeStyle = "rgba(17,17,17,.28)"; c.lineWidth = 3; c.beginPath(); c.moveTo(-80, PISO1); c.lineTo(1160, PISO1); c.stroke(); c.restore();
  if (m > 0) mundoMil(c, t, d);
  // programas de la escena 1
  PR1.forEach((pr, j) => {
    const p = posProg1(j, t);
    icono(c, pr.k, p.x, p.y + 6 * vaiven(t, 2.1 + j * .3, j) * (1 - m), p.S, sacudida(j, t), 0);
  });
  // cables de la escena 1 (también son tres de los mil)
  CABLES1.forEach((cb, i) => {
    let k = cadena1(cb, i, t);
    if (!k) return;
    if (m > 0) {
      const q = BOLA_DEST[cb.de] * 100 + PROG_DEST[cb.a];
      const kn = cadenaNudo(d, q, t, [k[0], k[1]], [k[12], k[13]], new Array(14).fill(0));
      k = k.map((v, z) => lerp(v, kn[z], m));
    }
    const ancho = lerp(13, 4.5, m);
    if (t < E.colapsa + .02) tira(c, k, ancho, { rizo: cb.rizo * (1 - m), fase: cb.fase, ondas: 2.4 });
    if (t > cb.pega && m < 1) { const p = puntaPrograma(cb, t, i); amarre(c, p[0], p[1], cb.amarre, lerp(1, .2, m)); }
  });
  // «a mano»: vive en el mundo, junto a las manos que tuercen
  letrero(c, t, E.amano - .1, E.lanza[0] + .3, "a mano", 1010, 92, ACENTO, true, 860, 330);
  // las bolas de la escena 1
  bolaP1(c, t);
  for (const k of [1, 2] as const) {
    const t0 = LLEGA_B[k - 1]; if (t < t0 - .45) continue;
    const p = posBola1(k, t), g = p.r / 90;
    let m2: P2 = [p.x + 120 * g, p.y - 110 * g + 8 * g * vaiven(t, 1.2, k)];
    CABLES1.forEach((cb) => { if (cb.de !== k) return; const q = prog(t, cb.lanza - .1, cb.lanza + .4); if (q > 0 && q < 1) m2 = L2(m2, [p.x + 90 * g, p.y - 320 * g], Math.sin(Math.PI * Math.min(q * 1.6, 1))); });
    const m1: P2 = [p.x - 120 * g, p.y - 90 * g];
    // su propio rollo de cable, colgando de la mano
    const resta = 3 - CABLES1.filter((cb) => cb.de === k && t > cb.lanza + .1).length;
    if (resta > 0 && m < 1) {
      c.save(); c.globalAlpha = 1 - m;
      for (let z = 0; z < resta + 1; z++) { c.strokeStyle = TINTA; c.lineWidth = 9 * g; c.beginPath(); c.ellipse(m1[0] - 4 * g, m1[1] + (40 + z * 8) * g, 44 * g, 30 * g, .3 + z * .2, 0, 7); c.stroke(); c.strokeStyle = BLANCO; c.lineWidth = 4.5 * g; c.stroke(); }
      c.restore();
    }
    tipo(c, p.x, p.y, p.r, m1, m2, { gorro: k === 1 ? "bombin" : "gorra", piso: lerp(PISO1, RY + RR, m) });
  }
}

// ---------- la ecuación de arriba ----------
function cuentaTxt(n: number) { return n >= 1000 ? `${Math.floor(n / 1000)},${String(n % 1000).padStart(3, "0")}` : String(n); }
function ecuacion(c: C, t: number, d: Nudo) {
  // escena 1: cuántos cables hay
  const n1 = CABLES1.filter((cb) => t > cb.pega).length;
  const a1 = smooth(prog(t, E.pega[0] - .05, E.pega[0] + .1)) * (1 - smooth(prog(t, E.diez - .2, E.diez + .02)));
  if (a1 > 0 && n1 > 0) {
    const ult = Math.max(...CABLES1.filter((cb) => t > cb.pega).map((cb) => cb.pega));
    const brinca = 1 + .22 * Math.exp(-(t - ult) * 7);
    c.font = serif(150); const w1 = c.measureText(String(n1)).width; c.font = serif(84, true); const w2 = c.measureText(n1 === 1 ? "  cable" : "  cables").width;
    const x0 = 540 - (w1 + w2) / 2;
    c.save(); c.translate(x0 + w1 / 2, 300); c.scale(brinca, brinca); texto(c, String(n1), 0, 0, { fuente: serif(150), color: ACENTO, alfa: a1 }); c.restore();
    texto(c, n1 === 1 ? "  cable" : "  cables", x0 + w1, 300, { fuente: serif(84, true), color: TINTA, alfa: a1, alin: "left" });
  }
  // el mil: 10 × 100 = 1,000 → 10 + 100 = 110
  const sale = 1 - smooth(prog(t, E.misma, E.misma + .35));
  if (t < E.diez || sale <= 0) return;
  const PX = 122, Y = 300;
  c.font = serif(PX);
  const piezas = ["10", "×", "100", "=", "1,000"], ws = piezas.map((s) => c.measureText(s).width), sp = 26;
  const W = ws.reduce((a, b) => a + b, 0) + sp * 4;
  let x = 540 - W / 2;
  const xs = ws.map((w) => { const r = x + w / 2; x += w + sp; return r; });
  const aDiez = smooth(prog(t, E.diez + .02, E.diez + .2)), aCien = smooth(prog(t, E.cien, E.cien + .2)), aIg = smooth(prog(t, E.brotan[0], E.brotan[0] + .2));
  const pop = (t0: number) => 1 + .25 * Math.exp(-Math.max(t - t0, 0) * 8) * (t > t0 ? 1 : 0);
  const dib = (s: string, i: number, a: number, col = TINTA, z = 1, rot = 0, dy = 0) => {
    if (a <= 0) return; c.save(); c.translate(xs[i], Y + dy); c.rotate(rot); c.scale(z, z);
    texto(c, s, 0, rot ? PX * .33 : 0, { fuente: serif(PX), color: col, alfa: a * sale, base: rot ? "alphabetic" : "alphabetic" }); c.restore();
  };
  dib("10", 0, aDiez, TINTA, pop(E.diez));
  // el × gira 45° y se vuelve +
  const gira = ease.outBack(prog(t, E.colapsa, E.colapsa + .4), 1.6) * Math.PI / 4;
  if (aCien > 0) {
    c.save(); c.translate(xs[1], Y - PX * .3); c.rotate(gira); c.globalAlpha = aCien * sale; c.strokeStyle = t > E.colapsa ? ACENTO : TINTA; c.lineWidth = 9; c.lineCap = "round";
    const L = 30; c.beginPath(); c.moveTo(-L, -L); c.lineTo(L, L); c.moveTo(L, -L); c.lineTo(-L, L); c.stroke(); c.restore();
  }
  dib("100", 2, aCien, TINTA, pop(E.cien));
  dib("=", 3, aIg);
  // el número: cuenta, aterriza en 1,000 y luego rueda a 110
  const n = Math.min(1000, cuantos(d, t));
  const rueda = ease.inOutCubic(prog(t, E.colapsa + .1, E.colapsa + .5));
  const enMil = t >= E.mil;
  if (rueda < 1) {
    c.save(); c.beginPath(); c.rect(xs[4] - 200, Y - 150, 400, 190); c.clip();
    dib(cuentaTxt(n), 4, aIg * (1 - rueda), enMil ? ACENTO : TINTA, pop(E.mil), 0, -rueda * 130);
    c.restore();
  }
  if (rueda > 0) { c.save(); c.beginPath(); c.rect(xs[4] - 200, Y - 150, 400, 190); c.clip(); dib("110", 4, aIg * rueda, ACENTO, 1, 0, (1 - rueda) * 140); c.restore(); }
}

// ---------- el mundo de la pared, la caja y el restaurante (con cámara) ----------
type Cm = { x: number; y: number; z: number };
const CLAVES: [number, number, Cm, ((x: number) => number)?][] = [
  [E.anth, E.jala, { x: 540, y: 1000, z: 1.05 }],
  [E.colapsa, E.colapsa + .5, { x: 540, y: 960, z: 1 }, ease.outCubic],
  [E.misma, E.misma + .85, { x: 540, y: 1130, z: 2.8 }],
  [E.programa - .05, E.programa + .9, { x: 540, y: 960, z: 1 }],
  [E.parecia, E.parecia + .9, { x: 560, y: 1000, z: .93 }],
  [E.dic, E.dic + 1.9, { x: 690, y: 1130, z: 1.4 }],
  [E.conecta, E.conecta + .8, { x: 640, y: 1130, z: 1.1 }],
  [E.pero + .45, E.pero + 2.9, { x: 1525, y: 1150, z: 1.4 }],
  [E.agosto, E.agosto + 1.05, { x: 690, y: 1130, z: 1.4 }],
];
function camara(t: number): Cm {
  let v: Cm = { x: 540, y: 960, z: 1 };
  if (t > E.mil) v = { x: 540, y: 960 + 30 * smooth(prog(t, E.mil, E.anth)), z: 1 + .03 * smooth(prog(t, E.mil, E.anth)) };
  for (const [a, b, q, f] of CLAVES) {
    if (t <= a) break;
    const k = (f ?? ease.inOutCubic)(prog(t, a, b));
    v = { x: lerp(v.x, q.x, k), y: lerp(v.y, q.y, k), z: v.z * (q.z / v.z) ** k };
  }
  return v;
}

const PISO = 1480;
const FX = [250, 540, 830], FY = 1130;
const salida = (o: number): P2 => [FX[Math.floor(o / 2)], FY + (o % 2 ? 62 : -62)];   // contacto o: 0 F1 arriba, 1 F1 abajo…
const PR3: { k: Icono; x: number; cae: number }[] = [{ k: "cal", x: 250, cae: E.programa + .45 }, { k: "car", x: 540, cae: E.formato }, { k: "sob", x: 830, cae: E.formato + .14 }];
const PY3 = 760;
const PP = { x: 150, y: 1410, r: 70 }, GEM = { x: 330, y: 1418, r: 62 };
const RIV: { x: number; g: Gorro; llega: number }[] = [{ x: 562, g: "bombin", llega: E.parecia + .1 }, { x: 736, g: "gorra", llega: E.parecia + .3 }, { x: 910, g: "boina", llega: E.parecia + .5 }];
const RR3 = 62, RY3 = PISO - RR3 - 4;
type Enchufe = { quien: number; o: number; t: number };    // quien: 0 P, 1 gemela, 2-4 rivales
const ENCHUFES: Enchufe[] = [
  { quien: 0, o: 0, t: E.enchufan[0] }, { quien: 1, o: 2, t: E.enchufan[1] }, { quien: 0, o: 4, t: E.enchufan[2] },
  { quien: 2, o: 1, t: E.adoptan[0] }, { quien: 3, o: 3, t: E.adoptan[1] }, { quien: 4, o: 5, t: E.adoptan[2] },
];
const vaPared = (t: number) => 1 - smooth(prog(t, E.dic + .1, E.dic + .8));      // lo que se va al armar la caja

function posPared(q: number, t: number) {
  if (q === 0 || q === 1) {
    const b = q === 0 ? PP : GEM, ini = E.cualquier - .05 + q * .12;
    const s = saltos(t, ini, ini + .55, 3, 46);
    return { x: lerp(-140, b.x, s.k), y: b.y + s.y, r: b.r };
  }
  const R = RIV[q - 2], s = saltos(t, R.llega, R.llega + .6, 3, 40);
  let y = RY3 + s.y;
  if (t > E.miran - .05 && t < E.miran + .6) y -= 34 * Math.abs(Math.sin((t - E.miran + .05) * 11)) * Math.exp(-(t - E.miran) * 3);
  return { x: lerp(1260, R.x, s.k), y, r: RR3 };
}

function pared(c: C, t: number) {
  const va = vaPared(t);
  if (t < E.misma + .7 || va <= 0) return;
  // contactos 1 y 3 (el 2 es el enchufe del nudo y se dibuja aparte)
  const pulso = (k: number) => { const q = t - (E.estandar + .05); return q > 0 && q < .6 ? Math.sin(q / .6 * Math.PI) * (1 - k * 0) : 0; };
  for (const i of [0, 2]) placa(c, FX[i], FY, 1, { alfa: va, pulso: pulso(i) });
  // programas: caen del techo y se cablean UNA vez a su contacto
  PR3.forEach((pr, i) => {
    if (t < pr.cae - .5) return;
    const y = PY3 + cae(t, pr.cae, 900);
    const luz = Math.max(...ENCHUFES.filter((e) => Math.floor(e.o / 2) === i).map((e) => ven(t, e.t, e.t + .35, .05, .6)), 0);
    const cab = ease.outCubic(prog(t, pr.cae + (i === 0 ? E.ofrece - E.programa - .3 : .05), pr.cae + (i === 0 ? E.ofrece - E.programa + .25 : .35)));
    if (cab > 0) {
      c.save(); c.globalAlpha = va; c.strokeStyle = TINTA; c.lineWidth = 7; c.lineCap = "round";
      const y0 = PY3 + 76, y1 = lerp(y0, FY - PH / 2 - 4, cab);
      c.beginPath(); c.moveTo(pr.x, y0); c.lineTo(pr.x, y1); c.stroke();
      if (cab >= 1) { c.fillStyle = TINTA; c.beginPath(); c.roundRect(pr.x - 16, FY - PH / 2 - 22, 32, 22, 5); c.fill(); }
      c.restore();
    }
    icono(c, pr.k, pr.x, y, 150, .03 * vaiven(t, 2.4, i), luz, va);
  });
  // las herramientas del calendario bajan por su cable
  if (t > E.ofrece && t < E.unavez + .6) {
    const glifos = ["+", "?", "✎"];
    for (let k = 0; k < 3; k++) {
      const u = prog(t, E.ofrece + .25 + k * .32, E.ofrece + .95 + k * .32); if (u <= 0 || u >= 1) continue;
      const y = lerp(PY3 + 90, FY - PH / 2 - 10, ease.inCubic(u));
      c.save(); c.globalAlpha = va * (1 - smooth(prog(u, .85, 1))); c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 3.5;
      c.beginPath(); c.roundRect(FX[0] + 14, y - 20, 64, 40, 8); c.fill(); c.stroke();
      texto(c, glifos[k], FX[0] + 46, y + 12, { fuente: mono(32), color: TINTA }); c.restore();
    }
  }
  // «una sola vez»: la tuerca aprieta
  // bolas, clavijas y cordones
  const bolas = [0, 1, 2, 3, 4].filter((q) => (q < 2 ? t > E.cualquier - .1 : t > RIV[q - 2].llega - .1));
  const manos: Record<number, { m1: P2; m2: P2 }> = {};
  for (const q of bolas) {
    const p = posPared(q, t), g = p.r / 90;
    let m1: P2 = [p.x - 118 * g, p.y - 96 * g + 6 * vaiven(t, 1.2, q)], m2: P2 = [p.x + 120 * g, p.y - 110 * g + 6 * vaiven(t, 1.05, q + 1)];
    if (q >= 2 && t < E.tiran + .05) m1 = [p.x - 104 * g, p.y + 10 * g];              // el nudo cuelga a un lado
    for (const e of ENCHUFES) if (e.quien === q) {
      const u = prog(t, e.t - .32, e.t + .1);
      if (u > 0 && u < 1) m2 = L2(m2, [p.x + 70 * g, p.y - 260 * g], Math.sin(Math.PI * u));
    }
    manos[q] = { m1, m2 };
  }
  // cordones por detrás de las bolas
  for (const e of ENCHUFES) {
    if (!manos[e.quien] || t < e.t - .32) continue;
    enchufa(c, manos[e.quien].m2, salida(e.o), ease.outCubic(prog(t, e.t - .32, e.t - .06)), smooth(prog(t, e.t - .06, e.t)), .9, va);
  }
  for (const q of bolas) {
    const p = posPared(q, t), { m1, m2 } = manos[q];
    tipo(c, p.x, p.y, p.r, m1, m2, { gorro: q < 2 ? "" : RIV[q - 2].g, piso: PISO, alfa: va, abre1: q >= 2 && t < E.tiran ? .2 : .6 });
    // el nudo propio de cada rival: lo traen en la mano y lo tiran
    if (q >= 2) {
      const tt = E.tiran + (q - 2) * .07;
      let nx = m1[0], ny = m1[1] + 30;
      if (t > tt) { const { z } = caida(t - tt, .9, .3); nx = m1[0] - 30 * clamp((t - tt) * 3); ny = lerp(m1[1] + 30, PISO - 20, 1 - z / .9); }
      nudito(c, nx, ny, 34, q * 3.1 + (t > tt ? 0 : t * 1.5), va);
    }
  }
  // luz sobre la pared cuando «parecía de una sola empresa»
  const lz = ven(t, E.sola - .1, E.raro, .3, .5) * va;
  if (lz > 0) {
    const g = c.createRadialGradient(330, 1180, 40, 330, 1180, 560);
    g.addColorStop(0, `rgba(255,236,190,${.32 * lz})`); g.addColorStop(1, "rgba(255,236,190,0)");
    c.fillStyle = g; c.fillRect(-300, 500, 1400, 1100);
  }
}
function nudito(c: C, x: number, y: number, r: number, seed: number, alfa = 1) {
  const rr = azar(Math.floor(seed * 7) + 3);
  c.save(); c.globalAlpha *= alfa; c.lineCap = "round"; c.lineJoin = "round";
  for (const [w, col] of [[8, TINTA], [4, BLANCO]] as [number, string][]) {
    c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(x, y);
    const r2 = azar(Math.floor(seed * 7) + 3);
    for (let k = 0; k < 9; k++) c.quadraticCurveTo(x + (r2() - .5) * r * 2.4, y + (r2() - .5) * r * 2.4, x + (r2() - .5) * r * 1.6, y + (r2() - .5) * r * 1.6);
    c.stroke();
  }
  void rr; c.restore();
}

// ---------- la caja de la fundación ----------
const CJ = { x0: 390, x1: 990, y0: 880, y1: PISO, dx: -46, dy: -70 }, HX = 840;
function caja(c: C, t: number, alfa: number) {
  if (t < E.arma[0] - .05 || alfa <= 0) return;
  const fr = ease.outBack(prog(t, E.arma[0], E.arma[0] + .4), 1.3), la = ease.outBack(prog(t, E.arma[1], E.arma[1] + .35), 1.5), ta = ease.outBack(prog(t, E.arma[2], E.arma[2] + .35), 1.5);
  const { x0, x1, y0, y1, dx, dy } = CJ;
  const top = lerp(y1, y0, fr);
  c.save(); c.globalAlpha *= alfa; c.lineJoin = "round"; c.strokeStyle = TINTA; c.lineWidth = 5;
  // lado izquierdo y tapa, detrás del frente
  if (la > 0) { c.fillStyle = CARTON2; c.beginPath(); c.moveTo(x0, top); c.lineTo(x0 + dx * la, top + dy * la); c.lineTo(x0 + dx * la, y1 + dy * la * .02); c.lineTo(x0, y1); c.closePath(); c.fill(); c.stroke(); }
  if (ta > 0) {
    c.fillStyle = CARTON3; c.beginPath(); c.moveTo(x0, top); c.lineTo(x1, top); c.lineTo(x1 + dx * ta, top + dy * ta); c.lineTo(x0 + dx * ta, top + dy * ta); c.closePath(); c.fill(); c.stroke();
    const ci = smooth(prog(t, E.arma[3], E.arma[3] + .3));
    if (ci > 0) { c.fillStyle = "rgba(200,186,150,.95)"; c.beginPath(); c.moveTo(lerp(x0, x1, .44), top); c.lineTo(lerp(x0, x1, .56), top); c.lineTo(lerp(x0, x1, .56) + dx * ta, top + dy * ta * ci); c.lineTo(lerp(x0, x1, .44) + dx * ta, top + dy * ta * ci); c.closePath(); c.fill(); }
  }
  c.fillStyle = CARTON; c.beginPath(); c.rect(x0, top, x1 - x0, y1 - top); c.fill(); c.stroke();
  // fibras del cartón
  c.save(); c.beginPath(); c.rect(x0, top, x1 - x0, y1 - top); c.clip(); c.strokeStyle = "rgba(120,100,60,.12)"; c.lineWidth = 2;
  for (let k = 0; k < 18; k++) { const yy = top + 20 + k * 34; c.beginPath(); c.moveTo(x0, yy + Math.sin(k) * 4); c.lineTo(x1, yy - Math.sin(k * 1.3) * 4); c.stroke(); }
  c.restore();
  c.restore();
}
function etiquetas(c: C, t: number, alfa: number) {
  if (alfa <= 0) return;
  // la etiqueta «fundación»
  const k = ease.outBack(prog(t, E.fundacion, E.fundacion + .3), 2.2);
  if (k > 0) {
    c.save(); c.globalAlpha *= alfa * clamp(k * 3); c.translate(690, 948); c.rotate(-.025); c.scale(lerp(1.5, 1, clamp(k)), lerp(1.5, 1, clamp(k)));
    c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.roundRect(-190, -46, 380, 92, 6); c.fill(); c.stroke();
    texto(c, "fundación", 0, 22, { fuente: serif(78, true), color: TINTA }); c.restore();
  }
  // los nombres, escritos a mano en orden
  const nombres = ["Anthropic", "Block", "OpenAI"];
  c.font = serif(54);
  const sep = "  ·  ", wsep = c.measureText(sep).width, ws = nombres.map((s) => c.measureText(s).width);
  const W = ws.reduce((a, b) => a + b, 0) + 2 * wsep;
  const esc = Math.min(1, 560 / W), X0 = 690 - W * esc / 2;
  c.save(); c.globalAlpha *= alfa; c.translate(X0, 1372); c.scale(esc, esc);
  let x = 0;
  nombres.forEach((s, i) => {
    const t0 = E.firmas[i], u = prog(t, t0, t0 + .42);
    if (u > 0) {
      if (i > 0) texto(c, sep, x - wsep, 0, { fuente: serif(54), color: GRIS, alin: "left", alfa: smooth(u * 3) });
      c.save(); c.beginPath(); c.rect(x - 4, -70, (ws[i] + 8) * u, 100); c.clip();
      texto(c, s, x, 0, { fuente: serif(54), color: TINTA, alin: "left" }); c.restore();
      if (u < 1) { c.save(); c.translate(x + ws[i] * u, -10); c.rotate(.5); c.fillStyle = TINTA; c.fillRect(-4, -60, 8, 56); c.beginPath(); c.moveTo(-4, -4); c.lineTo(4, -4); c.lineTo(0, 10); c.fill(); c.restore(); }
    }
    x += ws[i] + wsep;
  });
  c.restore();
}
/** El hueco punteado que espera otra pieza. */
function hueco(c: C, t: number, alfa: number) {
  const u = prog(t, E.hueco, E.hueco + .6);
  if (u <= 0 || alfa <= 0) return;
  const sale = 1 - smooth(prog(t, E.entra - .05, E.entra + .05));
  if (sale <= 0) return;
  c.save(); c.globalAlpha *= alfa * sale; c.strokeStyle = TINTA; c.lineWidth = 5; c.setLineDash([16, 14]); c.lineDashOffset = -t * 30;
  const per = 2 * (PW + PH), L = per * ease.inOutCubic(u);
  c.beginPath();
  const pts: P2[] = [[HX - PW / 2, FY - PH / 2], [HX + PW / 2, FY - PH / 2], [HX + PW / 2, FY + PH / 2], [HX - PW / 2, FY + PH / 2], [HX - PW / 2, FY - PH / 2]];
  let rest = L; c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length && rest > 0; i++) { const a = pts[i - 1], b = pts[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.min(1, rest / d); c.lineTo(lerp(a[0], b[0], k), lerp(a[1], b[1], k)); rest -= d; }
  c.stroke(); c.setLineDash([]);
  const q = ease.outBack(prog(t, E.hueco + .55, E.hueco + .85), 2);
  if (q > 0) texto(c, "?", HX, FY + 50, { fuente: serif(Math.round(170 * clamp(q, 0, 1.3))), color: GRIS, alfa: clamp(q) });
  c.restore();
}

// ---------- fiesta y restaurante ----------
const XF = 1270, XCHEF = 1780, YB = PISO - 74;      // dónde se paran la bola de la fiesta y el chef
function bolaFiesta(t: number) {
  // llega a la caja, se enchufa, se desenchufa y camina a la derecha
  const s1 = saltos(t, E.conecta + .1, E.conecta + .6, 3, 50);
  let x = lerp(-80, 250, s1.k), y = PISO - 74 + s1.y;
  const s2 = saltos(t, E.pero + .25, E.pero + 1.65, 4, 60);
  x = lerp(x, XF, s2.k); y += s2.y;
  return { x, y, r: 70 };
}
function restaurante(c: C, t: number, alfa: number) {
  if (alfa <= 0) return;
  c.save(); c.globalAlpha *= alfa; c.lineJoin = "round";
  const x0 = 1580, x1 = 2130, y0 = 1010;
  c.fillStyle = "#F7F4EC"; c.strokeStyle = TINTA; c.lineWidth = 5; c.beginPath(); c.rect(x0, y0, x1 - x0, PISO - y0); c.fill(); c.stroke();
  // toldo a rayas que se mece
  const mece = 4 * vaiven(t, 1.7);
  for (let k = 0; k < 9; k++) {
    const a = x0 - 20 + k * 63, b = a + 63;
    c.fillStyle = k % 2 ? BLANCO : "#2b2a28"; c.beginPath(); c.moveTo(a, y0 - 70); c.lineTo(b, y0 - 70); c.lineTo(b + 4, y0 + 26 + mece); c.quadraticCurveTo((a + b) / 2 + 2, y0 + 50 + mece, a + 4, y0 + 26 + mece); c.closePath(); c.fill(); c.stroke();
  }
  // puerta y ventana
  c.fillStyle = "#3a3936"; c.fillRect(1700, 1170, 160, PISO - 1170); c.strokeRect(1700, 1170, 160, PISO - 1170);
  c.fillStyle = "rgba(255,226,170,.55)"; c.fillRect(1912, 1170, 170, 150); c.strokeRect(1912, 1170, 170, 150);
  c.beginPath(); c.moveTo(1997, 1170); c.lineTo(1997, 1320); c.moveTo(1912, 1245); c.lineTo(2082, 1245); c.stroke();
  // letrero: tenedor y cuchillo colgando
  c.save(); c.translate(1650, 1100); c.rotate(.06 * vaiven(t, 1.9)); c.fillStyle = BLANCO; c.beginPath(); c.arc(0, 0, 44, 0, 7); c.fill(); c.stroke();
  c.lineWidth = 6; c.beginPath(); c.moveTo(-12, -26); c.lineTo(-12, 28); c.moveTo(-20, -26); c.lineTo(-20, -6); c.moveTo(-4, -26); c.lineTo(-4, -6); c.moveTo(14, -26); c.quadraticCurveTo(26, -6, 14, 0); c.lineTo(14, 28); c.stroke(); c.restore();
  c.restore();
}
function burbuja(c: C, x: number, y: number, w: number, h: number, cola: P2, a: number, glifos: number[], dibujados: number) {
  if (a <= 0) return;
  const z = ease.outBack(clamp(a * 1.4), 2);
  c.save(); c.globalAlpha *= clamp(a * 2); c.translate(x, y); c.scale(z, z);
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 5; c.lineJoin = "round";
  c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, 30); c.fill(); c.stroke();
  c.beginPath(); c.moveTo(cola[0] - x - 18, h / 2 - 3); c.lineTo(cola[0] - x, cola[1] - y); c.lineTo(cola[0] - x + 18, h / 2 - 3); c.fill(); c.stroke();
  c.fillStyle = BLANCO; c.fillRect(cola[0] - x - 15, h / 2 - 8, 30, 10);
  c.strokeStyle = TINTA; c.lineWidth = 7; c.fillStyle = TINTA;
  glifos.forEach((g, i) => {
    if (i >= dibujados) return;
    const gx = (i - (glifos.length - 1) / 2) * 62, s = 20;
    c.beginPath();
    if (g === 0) c.arc(gx, 0, s, 0, 7);
    else if (g === 1) { c.moveTo(gx, -s); c.lineTo(gx + s, s * .8); c.lineTo(gx - s, s * .8); c.closePath(); }
    else c.rect(gx - s * .85, -s * .85, s * 1.7, s * 1.7);
    c.stroke();
  });
  c.restore();
}
function tarjeta(c: C, x: number, y: number, rot: number, g: Gorro, s = 1) {
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
  c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.roundRect(-70, -44, 140, 88, 8); c.fill(); c.stroke();
  bola(c, -36, 8, 20); sombrero(c, g, -36, 8, 20);
  c.fillStyle = TINTA; c.fillRect(-4, -12, 56, 7); c.fillRect(-4, 4, 44, 7); c.fillRect(-4, 20, 50, 7);
  c.restore();
}
/** La lista de la fiesta: invitaciones | mesa | pastel. Se rompe entre la primera y las otras dos. */
function lista(c: C, t: number, cx: number, cy: number, xP: number, xC: number) {
  const a = smooth(prog(t, E.repartan - .1, E.repartan + .15)) * (1 - smooth(prog(t, E.agosto + .2, E.agosto + .6)));
  if (a <= 0) return;
  const rompe = ease.inOutCubic(prog(t, E.repartan + .25, E.repartan + .75));
  const W = 420, H = 150, corte = -W / 2 + 140;
  const izq: P2 = [lerp(cx, xP + 120, rompe), lerp(cy, cy + 40, rompe)], der: P2 = [lerp(cx, xC - 150, rompe), lerp(cy, cy + 40, rompe)];
  const pedazo = (pos: P2, desde: number, hasta: number, rot: number, check: boolean) => {
    c.save(); c.globalAlpha *= a; c.translate(pos[0], pos[1]); c.rotate(rot); c.translate(-(desde + hasta) / 2, 0);
    c.fillStyle = BLANCO; c.strokeStyle = TINTA; c.lineWidth = 4; c.beginPath(); c.moveTo(desde, -H / 2);
    if (desde > -W / 2) for (let k = 0; k <= 8; k++) c.lineTo(desde + (k % 2 ? 7 : -7) * rompe, -H / 2 + H * k / 8);
    else { c.lineTo(desde, H / 2); }
    c.lineTo(desde, H / 2); c.lineTo(hasta, H / 2);
    if (hasta < W / 2) for (let k = 8; k >= 0; k--) c.lineTo(hasta + (k % 2 ? 7 : -7) * rompe, -H / 2 + H * k / 8); else c.lineTo(hasta, -H / 2);
    c.closePath(); c.fill(); c.stroke();
    // iconos: sobre, mesa, pastel
    [[-W / 2 + 70, 0], [-W / 2 + 210, 1], [-W / 2 + 350, 2]].forEach(([x, k]) => {
      if (x < desde || x > hasta) return;
      c.save(); c.translate(x, -8); c.strokeStyle = TINTA; c.fillStyle = BLANCO; c.lineWidth = 4;
      if (k === 0) { c.beginPath(); c.rect(-34, -22, 68, 46); c.fill(); c.stroke(); c.beginPath(); c.moveTo(-34, -22); c.lineTo(0, 6); c.lineTo(34, -22); c.stroke(); }
      else if (k === 1) { c.beginPath(); c.moveTo(-40, -8); c.lineTo(40, -8); c.moveTo(-30, -8); c.lineTo(-30, 28); c.moveTo(30, -8); c.lineTo(30, 28); c.stroke(); c.lineWidth = 8; c.beginPath(); c.moveTo(-44, -10); c.lineTo(44, -10); c.stroke(); }
      else { c.beginPath(); c.rect(-32, -6, 64, 34); c.fill(); c.stroke(); c.beginPath(); c.rect(-22, -24, 44, 18); c.fill(); c.stroke(); c.fillStyle = ACENTO; c.fillRect(-2, -40, 4, 16); }
      c.restore();
      if (check) {
        const q = ease.outBack(prog(t, E.trabajo + (k === 0 ? 0 : .15 + (k - 1) * .12), E.trabajo + .25 + (k === 0 ? 0 : .15 + (k - 1) * .12)), 2);
        if (q > 0) { c.save(); c.strokeStyle = ACENTO; c.lineWidth = 9; c.lineCap = "round"; c.globalAlpha *= clamp(q); c.beginPath(); c.moveTo(x - 20, 46); c.lineTo(x - 4, 60); c.lineTo(x + 24, 30); c.stroke(); c.restore(); }
      }
    });
    c.restore();
  };
  pedazo(izq, -W / 2, corte, -.08 * rompe, rompe > .9);
  pedazo(der, corte, W / 2, .06 * rompe, rompe > .9);
}

function mundo(c: C, t: number, d: Nudo) {
  const cam = camara(t);
  c.save(); c.translate(540, 960); c.scale(cam.z, cam.z); c.translate(-cam.x, -cam.y);
  // piso de la pared en adelante
  const aPiso = smooth(prog(t, E.misma + .6, E.programa + .6)) * (1 - smooth(prog(t, E.uno, E.uno + .3)));
  if (aPiso > 0) { c.save(); c.globalAlpha = aPiso; c.strokeStyle = "rgba(17,17,17,.3)"; c.lineWidth = 3; c.beginPath(); c.moveTo(-600, PISO); c.lineTo(2600, PISO); c.stroke(); c.restore(); }
  // el mil y la rejilla (se van al entrar al enchufe)
  const aMil = 1 - smooth(prog(t, E.misma, E.misma + .32));
  if (aMil > 0) {
    if (t < E.colapsa + .05) {
      mundoMil(c, t, d);
      escenaManoHeroes(c, t, d);
    } else mundoMil(c, t, d, { alfa: aMil });
    // los hilos limpios: cada programa una vez, cada bola una vez
    const h = ease.outCubic(prog(t, E.enchufe + .2, E.enchufe + .8));
    if (h > 0) {
      c.save(); c.globalAlpha = aMil * .5; c.strokeStyle = TINTA; c.lineWidth = 1.6; c.beginPath();
      for (let j = 0; j < 100; j++) { const p = puntaRejilla(j, 99); c.moveTo(540, FY - PH / 2); c.lineTo(lerp(540, p[0], h), lerp(FY - PH / 2, p[1], h)); }
      for (let i = 0; i < 10; i++) { c.moveTo(540, FY + PH / 2); c.lineTo(lerp(540, RX(i), h), lerp(FY + PH / 2, RY - 40, h)); }
      c.stroke(); c.restore();
    }
    // la fila de diez y los tres de la escena 1, ya en su lugar
    if (t >= E.colapsa + .05) {
      for (const k of [0, 1, 2] as const) { const p = posBola1(k, t); tipo(c, p.x, p.y, p.r, [p.x - 24, p.y - 62], [p.x + 24, p.y - 62], { gorro: (["", "bombin", "gorra"] as Gorro[])[k], piso: RY + RR, alfa: aMil }); }
      PR1.forEach((pr, j) => { const p = posProg1(j, t); icono(c, pr.k, p.x, p.y, p.S, 0, 0, aMil); });
    }
  }
  // el enchufe que sale del nudo
  const k = ease.outBack(prog(t, E.enchufe - .08, E.enchufe + .3), 2.4);
  const aCaja = 1 - smooth(prog(t, E.uno - .05, E.uno + .3));
  if (k > 0 && aCaja > 0) {
    caja(c, t, aCaja);
    // «lo donó»: la placa se desatornilla de la pared y se despega antes de que la caja la reciba
    const tor = smooth(prog(t, E.unavez, E.unavez + .3)) + 3 * smooth(prog(t, E.dic + .6, E.dono - .1));
    const suelta = smooth(prog(t, E.dic + .7, E.dono - .1)) * (1 - smooth(prog(t, E.dono + .05, E.dono + .45)));
    c.save(); c.translate(540, FY); c.rotate(suelta * .06 * Math.sin((t - E.dic) * 4.4)); c.scale(1 + .07 * suelta, 1 + .07 * suelta); c.translate(-540, -FY - 14 * suelta);
    placa(c, 540, FY, clamp(k, 0, 1.3), { alfa: aCaja, pulso: (() => { const q = t - (E.estandar + .05); return q > 0 && q < .6 ? Math.sin(q / .6 * Math.PI) : 0; })(), tornillo: tor });
    c.restore();
    if (t < E.colapsa + 1.2) { const fl = Math.exp(-(t - E.enchufe) * 5) * (t > E.enchufe ? 1 : 0); if (fl > 0) { c.save(); c.globalAlpha = fl * .6; c.strokeStyle = ACENTO; c.lineWidth = 6; for (let i = 0; i < 12; i++) { const an = i / 12 * 6.28, r0 = 170 + (1 - fl) * 140; c.beginPath(); c.moveTo(540 + Math.cos(an) * r0, FY + Math.sin(an) * r0); c.lineTo(540 + Math.cos(an) * (r0 + 50), FY + Math.sin(an) * (r0 + 50)); c.stroke(); } c.restore(); } }
  }
  // la clavija que demuestra el enchufe
  if (t > E.mete2 - .5 && t < E.programa + .5) {
    const sale2 = ease.inCubic(prog(t, E.programa - .25, E.programa + .3));
    enchufa(c, [540, 1700 + sale2 * 300], [540, FY - 62 + sale2 * 600], ease.outCubic(prog(t, E.mete2 - .45, E.mete2 - .07)), smooth(prog(t, E.mete2 - .07, E.mete2)) * (1 - sale2), .95);
  }
  pared(c, t);
  // MCP: el nombre sale con el enchufe
  const aM = ven(t, E.enchufe + .05, E.misma + .1, .2, .3);
  if (aM > 0) { banda(c, 856, 1000, aM, 260, 820); const z = ease.outBack(prog(t, E.enchufe + .05, E.enchufe + .35), 2); c.save(); c.translate(540, 976); c.scale(z, z); texto(c, "MCP", 0, 0, { fuente: serif(132), color: TINTA, alfa: aM }); c.restore(); }

  // caja: etiquetas, hueco, interfón
  const aEt = aCaja * smooth(prog(t, E.dono, E.dono + .2));
  etiquetas(c, t, aEt);
  hueco(c, t, aCaja);
  // herramientas sobre la caja: «MCP conecta a un agente con sus herramientas»
  const aH = ven(t, E.conecta + .3, E.pero + .2, .3, .4);
  if (aH > 0) {
    const pos: P2[] = [[500, 690], [690, 650], [880, 690]];
    (["cal", "car", "sob"] as Icono[]).forEach((ic, i) => {
      const q = ease.outBack(prog(t, E.conecta + .3 + i * .12, E.conecta + .6 + i * .12), 2);
      if (q <= 0) return;
      const luz = smooth(prog(t, E.herr + i * .1, E.herr + .2 + i * .1));
      c.save(); c.globalAlpha = aH * .7; c.strokeStyle = luz > .5 ? ACENTO : TINTA; c.lineWidth = 3.5; c.setLineDash([10, 9]); c.lineDashOffset = -t * 50;
      c.beginPath(); c.moveTo(pos[i][0] - 30, 842); c.lineTo(pos[i][0], pos[i][1] + 58); c.stroke(); c.restore();
      icono(c, ic, pos[i][0], pos[i][1] + 6 * vaiven(t, 1.8, i), 110 * clamp(q, 0, 1.3), .04 * vaiven(t, 2.2, i), luz, aH);
    });
  }
  // la bola de la fiesta (y antes, la que se enchufa a la caja)
  if (t > E.conecta && aCaja > 0 && t < E.agosto + 1.2) {
    const b = bolaFiesta(t), g = b.r / 90;
    let m1: P2 = [b.x - 116 * g, b.y - 92 * g + 6 * vaiven(t, 1.3)], m2: P2 = [b.x + 118 * g, b.y - 110 * g + 6 * vaiven(t, 1.1, 1)];
    // cordón a la caja mientras está enchufada
    const pega = E.conecta + .85, suelta = E.pero + .05;
    if (t > pega - .3 && t < suelta + .4) {
      const u = ease.outCubic(prog(t, pega - .3, pega - .06)), r = ease.inCubic(prog(t, suelta, suelta + .35));
      if (u > 0 && u < 1) m2 = L2(m2, [b.x + 60 * g, b.y - 250 * g], Math.sin(Math.PI * u));
      enchufa(c, m2, [540, FY - 62], u * (1 - r), smooth(prog(t, pega - .06, pega)) * (1 - smooth(prog(t, suelta, suelta + .08))));
    }
    // la clavija que quiere entrar en el chef
    const topa = prog(t, E.topa - .5, E.topa), vuelve = prog(t, E.topa + .35, E.google + .4);
    if (topa > 0 && vuelve < 1) {
      const meta: P2 = [XCHEF - 70, YB - 50];
      const golpe = t > E.topa ? -40 * Math.exp(-(t - E.topa) * 6) * Math.abs(Math.sin((t - E.topa) * 16)) : 0;
      const pos = L2(L2(m2, meta, ease.outCubic(topa)), m2, ease.inCubic(vuelve));
      m2 = [pos[0] + golpe - 50, pos[1] + 30];
      clavija(c, pos[0] + golpe, pos[1], .9, 0, -1.3);
    }
    // A2A: tarjetas que se cruzan
    const tj = prog(t, E.presenten, E.presenten + .6);
    if (tj > 0 && t < E.agosto + .4) {
      const a = 1 - smooth(prog(t, E.agosto - .2, E.agosto + .3));
      const vuela = (de: P2, a2: P2, u: number, arco: number): P2 => [lerp(de[0], a2[0], u), lerp(de[1], a2[1], u) - Math.sin(Math.PI * u) * arco];
      const pA = vuela([XF + 90, YB - 120], [XCHEF - 110, YB - 140], ease.inOutCubic(tj), 180), pB = vuela([XCHEF - 90, YB - 120], [XF + 110, YB - 140], ease.inOutCubic(tj), 120);
      c.save(); c.globalAlpha = a; tarjeta(c, pA[0], pA[1], -.2 + tj * .5, "fiesta"); tarjeta(c, pB[0], pB[1], .2 - tj * .6, "chef"); c.restore();
      if (tj > .2 && tj < 1) m2 = [b.x + 110 * g, b.y - 140 * g];
    }
    const sq = t > E.pero + .25 && t < E.pero + 1.7 ? 0 : 0;
    tipo(c, b.x, b.y, b.r, m1, m2, { piso: PISO, gorro: t > E.fiestas - .2 ? "fiesta" : "", gorroY: t < E.fiestas + .3 ? cae(t, E.fiestas + .3, 700) : 0, aplasta: sq, alfa: aCaja, abre2: topa > 0 && vuelve < 1 ? .1 : .6 });
    // «?» cuando la clavija no tiene dónde entrar
    const aQ = ven(t, E.topa + .05, E.google + .2, .2, .3);
    if (aQ > 0) { const z = ease.outBack(prog(t, E.topa + .05, E.topa + .35), 2.4); c.save(); c.translate(b.x + 30, b.y - 260); c.scale(z, z); texto(c, "?", 0, 0, { fuente: serif(150), color: ACENTO, alfa: aQ }); c.restore(); }
  }
  // restaurante y chef
  const aR = smooth(prog(t, E.pero, E.pero + .5)) * aCaja;
  if (aR > 0 && t < E.agosto + 1.2) {
    restaurante(c, t, aR);
    const sale = ease.outBack(prog(t, E.resta - .2, E.resta + .25), 1.6);
    if (sale > 0) {
      const x = XCHEF + (1 - clamp(sale)) * 0, y = YB - (1 - clamp(sale)) * 0, g = 70 / 90;
      const tb = t > E.topa ? Math.exp(-(t - E.topa) * 4) * Math.sin((t - E.topa) * 18) * .12 : 0;
      let m1: P2 = [x - 118 * g, y - 100 * g + 8 * vaiven(t, 1.2)], m2: P2 = [x + 112 * g, y - 92 * g];
      const tj = prog(t, E.presenten, E.presenten + .6); if (tj > .1 && tj < 1) m1 = [x - 120 * g, y - 150 * g];
      c.save(); c.translate(x, y + 70); c.rotate(tb); c.translate(-x, -(y + 70));
      tipo(c, x, y, 70 * clamp(sale, .01, 1.2), m1, m2, { piso: PISO, gorro: "chef", alfa: aR });
      c.restore();
    }
    // idioma común: mismas formas en las dos burbujas
    const aB = ven(t, E.idioma, E.presenten - .1, .3, .3);
    if (aB > 0) {
      const g1 = [0, 1, 2], n1 = Math.floor(prog(t, E.idioma + .1, E.idioma + .7) * 3.99), n2 = Math.floor(prog(t, E.idioma + .9, E.idioma + 1.5) * 3.99);
      burbuja(c, XF + 30, YB - 290, 230, 116, [XF + 10, YB - 150], aB * smooth(prog(t, E.idioma, E.idioma + .25)), g1, n1);
      burbuja(c, XCHEF - 120, YB - 330, 230, 116, [XCHEF - 50, YB - 160], aB * smooth(prog(t, E.idioma + .8, E.idioma + 1.05)), g1, n2);
    }
    lista(c, t, (XF + XCHEF) / 2 - 10, YB - 330, XF, XCHEF);
  }
  // el interfón: nace entre los dos y vuela al hueco de la caja
  if (t > E.agosto - .1 && aCaja > 0) {
    const u = prog(t, E.agosto + .1, E.entra), k2 = ease.inOutCubic(u);
    const de: P2 = [(XF + XCHEF) / 2, YB - 250], x = lerp(de[0], HX, k2), y = lerp(de[1], FY, k2) - Math.sin(Math.PI * u) * 260;
    const z = ease.outBack(prog(t, E.agosto - .1, E.agosto + .25), 2) * lerp(.7, 1, k2);
    const ch = t > E.entra ? Math.exp(-(t - E.entra) * 7) * Math.sin((t - E.entra) * 30) * 6 : 0;
    interfon(c, x + ch, y, z, { alfa: aCaja, habla: ven(t, E.entra + .1, E.uno, .1, .2) });
  }
  c.restore();
}
/** Los nueve cables de la escena 1 dentro del mil (dibujados en el mundo hasta el colapso). */
function escenaManoHeroes(c: C, t: number, d: Nudo) {
  if (t < E.diez) return;
  CABLES1.forEach((cb, i) => {
    const k0 = cadena1(cb, i, t); if (!k0) return;
    const q = BOLA_DEST[cb.de] * 100 + PROG_DEST[cb.a];
    const kn = cadenaNudo(d, q, t, [k0[0], k0[1]], [k0[12], k0[13]], new Array(14).fill(0));
    const m = morfo(t), k = k0.map((v, z) => lerp(v, kn[z], m));
    tira(c, k, lerp(13, 4.5, m), { rizo: cb.rizo * (1 - m), fase: cb.fase, ondas: 2.4 });
  });
  PR1.forEach((pr, j) => { const p = posProg1(j, t); icono(c, pr.k, p.x, p.y, p.S, sacudida(j, t)); });
  for (const k of [0, 1, 2] as const) {
    const p = posBola1(k, t);
    tipo(c, p.x, p.y, p.r, [p.x - 24 * p.r / 30, p.y - 62 * p.r / 30], [p.x + 24 * p.r / 30, p.y - 62 * p.r / 30], { gorro: (["", "bombin", "gorra"] as Gorro[])[k], piso: RY + RR });
  }
}

// ---------- viñetas: herramientas contra colegas ----------
function vinetas(c: C, t: number) {
  const a = 1;
  if (t > E.internet + .02 || t < E.uno) return;
  const s = (t0: number) => ease.outBack(prog(t, t0, t0 + .38), 1.8);
  c.save(); c.globalAlpha = a;
  // arriba: la bola con sus herramientas, por el enchufe
  const k1 = s(E.uno);
  if (k1 > 0) {
    const PIS = 830, R = 82, g = R / 90, x = 180, y = PIS - R - 4;
    c.strokeStyle = "rgba(17,17,17,.25)"; c.lineWidth = 3; c.beginPath(); c.moveTo(40, PIS); c.lineTo(1040, PIS); c.stroke();
    const zp = 1.08 * clamp(k1, 0, 1.2);
    (["cal", "car", "sob"] as Icono[]).forEach((ic, i) => {
      const q = s(E.uno + .2 + i * .12); if (q <= 0) return;
      const py = 420 + i * 175, luz = smooth(prog(t, E.usar + i * .12, E.usar + .2 + i * .12));
      c.save(); c.strokeStyle = luz > .5 ? ACENTO : TINTA; c.lineWidth = 5; c.setLineDash([12, 10]); c.lineDashOffset = -t * 70;
      c.beginPath(); c.moveTo(500 + 92 * zp, 580 + (i - 1) * 60); c.lineTo(800, py); c.stroke(); c.restore();
      icono(c, ic, 868, py + 5 * vaiven(t, 1.6, i), 128 * clamp(q, 0, 1.2), .04 * vaiven(t, 2, i), luz);
    });
    placa(c, 500, 580, zp);
    const m2: P2 = [x + 122 * g, y - 118 * g + 4 * vaiven(t, 1.4)];
    enchufa(c, m2, [500, 580 - 62 * zp], 1, 1, .95 * zp);
    tipo(c, x, y + 3 * vaiven(t, .8), R, [x - 112 * g, y - 90 * g + 8 * vaiven(t, 1.2)], m2, { piso: PIS, gorro: "fiesta" });
    texto(c, "MCP", 500, 405, { fuente: mono(70), color: TINTA, alfa: clamp(k1) });
    letrero(c, t, E.usar, E.internet - .1, "herramientas", 935, 108, ACENTO, true);
  }
  // abajo: la bola con un colega, por el interfón
  const k2 = s(E.otro);
  if (k2 > 0) {
    const PIS = 1450, R = 82, gs = R / 90, yb = PIS - R - 4;
    c.strokeStyle = "rgba(17,17,17,.25)"; c.lineWidth = 3; c.beginPath(); c.moveTo(40, PIS); c.lineTo(1040, PIS); c.stroke();
    interfon(c, 540, 1262, .9 * clamp(k2, 0, 1.2), { habla: smooth(prog(t, E.colegas, E.colegas + .2)) });
    const hab = (t2: number) => Math.max(0, Math.sin((t - t2) * 9)) * 12 * (t > t2 ? 1 : 0);
    const xa = 185, xb = 885;
    tipo(c, xa, yb - hab(E.otro + .3), R * clamp(k2, 0, 1.2), [xa - 110 * gs, yb - 90 * gs], [xa + 120 * gs, yb - 130 * gs + 8 * vaiven(t, .7)], { piso: PIS, gorro: "fiesta" });
    tipo(c, xb, yb - hab(E.otro + .65), R * clamp(s(E.otro + .12), 0, 1.2), [xb - 120 * gs, yb - 130 * gs + 8 * vaiven(t, .8, 1)], [xb + 100 * gs, yb - 90 * gs], { piso: PIS, gorro: "chef" });
    burbuja(c, 300, 1095, 200, 104, [215, 1250], smooth(prog(t, E.otro + .3, E.otro + .6)), [0, 1, 2], 3);
    burbuja(c, 780, 1060, 200, 104, [860, 1240], smooth(prog(t, E.otro + .7, E.otro + 1)), [2, 0, 1], 3);
    texto(c, "A2A", 540, 1085, { fuente: mono(70), color: TINTA, alfa: clamp(k2) });
    letrero(c, t, E.colegas, E.internet - .1, "colegas", 1550, 108, ACENTO, true);
  }
  c.restore();
}

// ---------- la imagen del principio, en orden, y la puerta ----------
const BOX = { x0: 400, x1: 680, y0: 1004, y1: 1252, dx: -24, dy: -36 };
const FPX = 478, FPY = 1128, FPS = .44;
function enOrden(c: C, t: number) {
  const a = 1;
  if (t < E.internet) return;
  // la zambullida al enchufe
  const zz = ease.inOutCubic(prog(t, E.ycomo, E.puerta - .1));
  const ZF = 600 / (PW * FPS), Z = Math.pow(ZF, zz) * (1 + .045 * ease.outCubic(prog(t, E.puerta, E.fin)) * 2.4);
  const cx = lerp(540, FPX - 70 / ZF, zz), cy = lerp(960, FPY + 50 / ZF, zz);
  c.save(); c.globalAlpha = a; c.translate(540, 960); c.scale(Z, Z); c.translate(-cx, -cy);
  const pop = (t0: number) => ease.outBack(prog(t, t0, t0 + .3), 2);
  // cien programas y sus hilos a la caja
  const hil = ease.outCubic(prog(t, E.internet + .35, E.internet + 1.2));
  const pulsos = t > E.esto - .1;
  c.lineWidth = 1.5;
  c.strokeStyle = "rgba(17,17,17,.42)"; c.beginPath();
  for (let j = 0; j < 100; j++) {
    const px = GX(j % 10), py = GY(Math.floor(j / 10)) + GS * .46, tx = lerp(BOX.x0 + 30, BOX.x1 - 30, (j % 10) / 9) + BOX.dx * .5, ty = BOX.y0 + BOX.dy * .5;
    c.moveTo(tx, ty); c.lineTo(lerp(tx, px, hil), lerp(ty, py, hil));
  }
  for (let i = 0; i < 10; i++) { const tx = lerp(BOX.x0 + 40, BOX.x1 - 40, i / 9); c.moveTo(tx, BOX.y1); c.lineTo(lerp(tx, RX(i), hil), lerp(BOX.y1, RY - 40, hil)); }
  c.stroke();
  for (let j = 0; j < 100; j++) {
    const d = Math.hypot(GX(j % 10) - 540, GY(Math.floor(j / 10)) - 650) / 520;
    const q = pop(E.internet + .05 + d * .4); if (q <= 0) continue;
    const fl = pulsos ? Math.max(0, Math.sin(t * 5 - j * .7)) ** 8 : 0;
    icono(c, ICONOS[(j * 7 + Math.floor(j / 10) * 3) % 7], GX(j % 10), GY(Math.floor(j / 10)), GS * q, .04 * Math.sin(t * 1.3 + j), fl);
  }
  // pulsos rojos por los hilos: máquinas que actúan
  if (pulsos) {
    c.fillStyle = ACENTO;
    for (let j = 0; j < 100; j += 3) {
      const u = frac(t * .9 + j * .137);
      const px = GX(j % 10), py = GY(Math.floor(j / 10)) + GS * .46, tx = lerp(BOX.x0 + 30, BOX.x1 - 30, (j % 10) / 9) + BOX.dx * .5, ty = BOX.y0 + BOX.dy * .5;
      c.globalAlpha = smooth(prog(t, E.esto - .1, E.esto + .4)) * (1 - smooth(prog(t, E.ycomo, E.ycomo + .4)));
      c.beginPath(); c.arc(lerp(tx, px, u), lerp(ty, py, u), 4, 0, 7); c.fill();
    }
    c.globalAlpha = 1;
  }
  // la caja con el enchufe y el interfón
  const kb = pop(E.internet + .1);
  if (kb > 0) {
    c.save(); c.translate(540, 1128); c.scale(clamp(kb, 0, 1.2), clamp(kb, 0, 1.2)); c.translate(-540, -1128);
    c.lineJoin = "round"; c.strokeStyle = TINTA; c.lineWidth = 3.5;
    c.fillStyle = CARTON2; c.beginPath(); c.moveTo(BOX.x0, BOX.y0); c.lineTo(BOX.x0 + BOX.dx, BOX.y0 + BOX.dy); c.lineTo(BOX.x0 + BOX.dx, BOX.y1 + BOX.dy * .02); c.lineTo(BOX.x0, BOX.y1); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = CARTON3; c.beginPath(); c.moveTo(BOX.x0, BOX.y0); c.lineTo(BOX.x1, BOX.y0); c.lineTo(BOX.x1 + BOX.dx, BOX.y0 + BOX.dy); c.lineTo(BOX.x0 + BOX.dx, BOX.y0 + BOX.dy); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = CARTON; c.fillRect(BOX.x0, BOX.y0, BOX.x1 - BOX.x0, BOX.y1 - BOX.y0); c.strokeRect(BOX.x0, BOX.y0, BOX.x1 - BOX.x0, BOX.y1 - BOX.y0);
    interfon(c, 602, FPY, FPS);
    c.restore();
  }
  // la fila de diez: cada una con su cordón y hablando con la de al lado
  for (let i = 0; i < 10; i++) {
    const q = pop(E.internet + .2 + Math.abs(i - 4.5) * .05); if (q <= 0) continue;
    const act = pulsos ? Math.sin(t * 7 + i * 1.1) : 0;
    const y = RY - Math.max(0, act) * 10;
    tipo(c, RX(i), y, RR * clamp(q, 0, 1.2), [RX(i) - 26, y - 56 - act * 12], [RX(i) + 26, y - 60 + act * 12], { gorro: i === 1 ? "fiesta" : GORROS_FILA[i], piso: RY + RR });
  }
  const aA = smooth(prog(t, E.idioma2 - .3, E.idioma2 + .3)) * (1 - smooth(prog(t, E.ycomo, E.ycomo + .4)));
  if (aA > 0) {
    c.save(); c.globalAlpha = aA; c.strokeStyle = ACENTO; c.lineWidth = 3.5; c.setLineDash([6, 9]); c.lineDashOffset = -t * 40;
    for (let i = 0; i < 9; i++) { const h = 40 + 14 * Math.sin(t * 2 + i); c.beginPath(); c.moveTo(RX(i) + 14, RY - 40); c.quadraticCurveTo((RX(i) + RX(i + 1)) / 2, RY - 40 - h * 2, RX(i + 1) - 14, RY - 40); c.stroke(); }
    c.restore();
  }
  // el enchufe: la puerta
  puerta(c, t);
  c.restore();
  letrero(c, t, E.idioma2, E.esto - .1, "el mismo idioma", 300, 112, TINTA, true);
  letrero(c, t, E.actuan - .2, E.ycomo - .05, "máquinas que actúan", 300, 112, ACENTO, true);
}
const ABRE = 1.12;     // ángulo final de la tapa: entreabierta, como puerta
function puerta(c: C, t: number) {
  const ab = t < E.puerta ? 0 : (() => { const q = t - E.puerta; return ABRE * (1 - Math.exp(-q * 3.4) * (Math.cos(q * 5.6) + .6 * Math.sin(q * 5.6))); })();
  c.save(); c.translate(FPX, FPY); c.scale(FPS, FPS);
  if (ab > 0.001) {
    // el hueco: oscuro, con fondo, y una luz roja lejos que respira; un poco se derrama sobre el cartón
    const k = clamp(ab / ABRE);
    const der = c.createRadialGradient(40, 30, 60, 40, 30, 330); der.addColorStop(0, `rgba(192,68,42,${.16 * k})`); der.addColorStop(1, "rgba(192,68,42,0)");
    c.fillStyle = der; c.fillRect(-400, -500, 800, 1000);
    c.fillStyle = NOCHE; c.beginPath(); c.roundRect(-PW / 2, -PH / 2, PW, PH, 18); c.fill();
    const late = .5 + .08 * Math.sin((t - E.puerta) * 2.2);
    const g = c.createRadialGradient(18, 26, 2, 18, 26, 140); g.addColorStop(0, `rgba(192,68,42,${late * k})`); g.addColorStop(.3, `rgba(192,68,42,${.15 * k})`); g.addColorStop(1, "rgba(192,68,42,0)");
    c.fillStyle = g; c.fillRect(-PW / 2, -PH / 2, PW, PH);
    c.strokeStyle = `rgba(237,234,227,${.2 * k})`; c.lineWidth = 2; c.beginPath(); c.roundRect(-PW / 2 + 30, -PH / 2 + 34, PW - 60, PH - 68, 8); c.stroke();
    c.beginPath();
    for (const [a2, b2] of [[[-PW / 2, -PH / 2], [-PW / 2 + 30, -PH / 2 + 34]], [[PW / 2, -PH / 2], [PW / 2 - 30, -PH / 2 + 34]], [[PW / 2, PH / 2], [PW / 2 - 30, PH / 2 - 34]], [[-PW / 2, PH / 2], [-PW / 2 + 30, PH / 2 - 34]]] as P2[][]) { c.moveTo(a2[0], a2[1]); c.lineTo(b2[0], b2[1]); }
    c.stroke();
    // el polvo de papel se mete por la rendija
    const r = azar(5);
    c.fillStyle = "#EDEAE3";
    for (let i = 0; i < 60; i++) { const f = frac((t - E.puerta) * (.22 + r() * .3) + r()), ox = (r() - .2) * 300, oy = (r() - .5) * 460, z = 1.6 + r() * 2.4; c.globalAlpha = k * Math.sin(Math.PI * f) * .8; c.fillRect(lerp(ox, 18, f * f), lerp(oy, 26, f * f), z, z); }
    c.globalAlpha = 1;
  }
  // la tapa gira sobre su bisagra izquierda, hacia ti: más cerca, más grande
  c.save(); c.translate(-PW / 2, 0);
  const cs = Math.cos(ab), sn = Math.sin(ab);
  c.transform(cs, 0, 0, 1 + .17 * sn, 0, 0);
  c.translate(PW / 2, 0);
  placa(c, 0, 0, 1);
  if (sn > .01) { c.fillStyle = `rgba(20,18,14,${.32 * sn})`; c.beginPath(); c.roundRect(-PW / 2, -PH / 2, PW, PH, 18); c.fill(); }
  c.restore();
  // canto de la tapa: su grosor se ve al abrir
  if (sn > .02) {
    const xe = -PW / 2 + PW * cs, hh = PH / 2 * (1 + .17 * sn);
    c.fillStyle = "#E7E3D8"; c.strokeStyle = TINTA; c.lineWidth = 3;
    c.beginPath(); c.moveTo(xe, -hh); c.lineTo(xe + 12 * sn, -hh + 6); c.lineTo(xe + 12 * sn, hh - 6); c.lineTo(xe, hh); c.closePath(); c.fill(); c.stroke();
  }
  c.restore();
}

// ---------- apertura: el nudo, y la zambullida ----------
function apertura(c: C, t: number, d: Nudo) {
  const u = ease.inCubic(prog(t, E.mete, E.llega));
  const z = (1.04 + .03 * Math.sin(t * 1.4) + .06 * prog(t, 0, E.mete)) * Math.pow(26, u);
  const cen = L2([540, 990], KC, ease.inOutCubic(prog(t, E.mete - .2, E.llega)));
  c.save(); c.translate(540, 960 + 30 * u); c.rotate(.04 * Math.sin(t * .9) + u * .5); c.scale(z, z); c.translate(-cen[0], -cen[1]);
  mundoMil(c, t, d, { tNudo: E.mil + .6 + t * .9 });
  escenaManoHeroes(c, E.mil + .6 + t * .9, d);
  c.restore();
  // «antes de 2024», sellado
  banda(c, 170, 360, smooth(prog(t, E.sello, E.sello + .1)) * (1 - smooth(prog(t, E.mete, E.mete + .3))));
  sello(c, t, E.sello, E.mete + .05, "antes de 2024", 540, 300, 138, TINTA, true);
}

function dibuja(c: C, t: number, d: Nudo) {
  FR = Math.floor(t * 10);
  c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920);
  const z = 1.03 + .014 * Math.sin(t * .83);
  c.save(); c.translate(540 + 9 * Math.sin(t * .71), 960 + 11 * Math.cos(t * .61)); c.rotate(.004 * Math.sin(t * .47)); c.scale(z, z); c.translate(-540, -960);
  c.fillStyle = PAPEL; c.fillRect(-80, -80, 1240, 2080);
  polvo(c, t);
  if (t < E.llega) apertura(c, t, d);
  else {
    if (t < E.diez + 1.2) {
      // llegada: la cámara frena junto a la bola
      const k = 1 - ease.outExpo(prog(t, E.llega, E.llega + .75));
      const q = ease.inOutCubic(prog(t, E.amano + .2, E.lanza[0] + .45)), zs = lerp(1.8, 1, q) * (1 + 1.4 * k), F = L2([330, 1232], [540, 960], q);
      c.save(); c.translate(540, 960); c.rotate(-.25 * k); c.scale(zs, zs); c.translate(-F[0], -F[1]);
      escenaMano(c, t, d);
      c.restore();
    }
    if (t >= E.diez + 1.2 && t < E.uno + .05) mundo(c, t, d);
    const vela = smooth(prog(t, E.uno - .3, E.uno));
    if (vela > 0 && t < E.uno + .05) { c.fillStyle = `rgba(244,242,236,${vela})`; c.fillRect(-80, -80, 1240, 2080); }
    if (t >= E.uno && t < E.internet + .05) vinetas(c, t);
    const vela2 = smooth(prog(t, E.internet - .3, E.internet));
    if (vela2 > 0 && t < E.internet + .05) { c.fillStyle = `rgba(244,242,236,${vela2})`; c.fillRect(-80, -80, 1240, 2080); }
    if (t >= E.internet) enOrden(c, t);
  }
  c.restore();
  // textos en pantalla
  c.save(); c.translate(540 + 9 * Math.sin(t * .71), 960 + 11 * Math.cos(t * .61)); c.translate(-540, -960);
  if (t >= E.llega - .1 && t < E.misma + .5) ecuacion(c, t, d);
  pie(c, t, E.nov, E.misma, "noviembre 2024", "Anthropic", E.anth);
  letrero(c, t, E.misma + .35, E.programa - .1, "un enchufe", 300, 130, TINTA, true);
  letrero(c, t, E.unavez - .05, E.formato - .15, "una sola vez", 330, 120, TINTA, true);
  letrero(c, t, E.estandar, E.cualquier - .1, "estándar", 330, 140, ACENTO, true);
  letrero(c, t, E.cualquier + .05, E.parecia - .1, "cualquier agente", 330, 116, TINTA, true);
  letrero(c, t, E.sola, E.raro - .1, "una sola empresa", 330, 116, TINTA, true);
  letrero(c, t, E.adoptan[0] - .1, E.dic - .1, "lo adoptaron", 330, 130, ACENTO, true);
  pie(c, t, E.dic, E.faltaba - .3, "diciembre 2025");
  letrero(c, t, E.herr, E.pero + .1, "herramientas", 300, 116, ACENTO, true);
  letrero(c, t, E.fiestas, E.resta - .15, "tu agente de fiestas", 330, 110, TINTA, true);
  letrero(c, t, E.resta, E.google - .15, "el del restaurante", 330, 110, TINTA, true);
  sello(c, t, E.a2a - .1, E.idioma - .4, "A2A", 540, 400, 230, ACENTO, false);
  pie(c, t, E.abril - .1, E.agosto - .25, "abril 2025", "Google", E.abril + .15);
  letrero(c, t, E.idioma, E.presenten - .1, "un idioma común", 330, 116, TINTA, true);
  pie(c, t, E.agosto, E.uno - .1, "agosto 2026");
  c.restore();
}

export const Pieza: React.FC = () => <Lienzo dibuja={dibuja} preparar={preparaNudo} />;
