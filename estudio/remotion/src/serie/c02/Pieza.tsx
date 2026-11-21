// Capítulo 2. De día, papel: un muro de perillas que se cae y deja dos, y dos perillas son un lugar. De
// noche, un solo corte: del terreno solo existe lo que alumbra la bola. El suelo es un sombreado por
// pixel (linterna puntual sobre el relieve) y las curvas nacen de ese mismo campo, así que nunca vemos
// el mapa. Los pasos NO están dibujados a mano: salen de x' = x − η·∇H sobre el terreno, y el brinco
// que se pasa del valle y acaba más arriba es lo que de verdad hace ese cálculo con η grande.
import React from "react";
import { azar, Cam, camara, caida, clamp, ease, guionCamara, lerp, prog, resorte, smooth, texto, Vista } from "../../kit";
import { ACENTO, bola, Lienzo, LUZ, mono, NOCHE, PAPEL, rotulo, serif, sombra, TINTA } from "../../marca";
import duracion from "./duracion.json";
import t0 from "./t.json";

export const DURACION = duracion.dur;

// ---------- el terreno: una sola función, la misma para dibujar y para descender ----------
const ALT: [number, number, number, number][] = [
  [-15.5, 3, 6.2, 4.6], [-22.5, 7.5, -6.5, 3.2], [13, -11, 3.6, 5], [16, 10, 4.2, 5.5], [-4, 17, 3.2, 5], [-5, -17, 3, 5.5],
  [34, 2, -5, 6], [-34, -18, -4.5, 6], [6, 36, -5, 6.5], [10, -38, -5, 6], [-30, 30, -4, 6], [38, 30, -4, 6], [40, -30, -4.5, 6],
];
const ONDAS: [number, number, number, number][] = [[.31, .17, 0, .1], [-.19, .27, 1.3, .09], [.11, -.41, 2.1, .07], [.47, .23, .7, .05], [-.37, .53, 4.1, .04]];
function H(x: number, y: number) {
  const r2 = x * x + y * y;
  let v = 5.2 * (1 - Math.exp(-r2 / (2 * 6.2 * 6.2))) + .1 * Math.sqrt(r2 + 4) - .2;
  for (const [a, b, c, s] of ALT) v += c * Math.exp(-((x - a) ** 2 + (y - b) ** 2) / (2 * s * s));
  for (const [kx, ky, ph, am] of ONDAS) v += am * Math.sin(kx * x + ky * y + ph) * 2;
  return v;
}
type P2 = [number, number];
const grad = (p: P2): P2 => { const e = .02; return [(H(p[0] + e, p[1]) - H(p[0] - e, p[1])) / (2 * e), (H(p[0], p[1] + e) - H(p[0], p[1] - e)) / (2 * e)]; };
const paso = (p: P2, eta: number): P2 => { const g = grad(p); return [p[0] - eta * g[0], p[1] - eta * g[1]]; };

const ETA = 2.4, ETA_CORTO = .22, ETA_LARGO = 21, ETA_AFINADO = 1.05;   // tasas de aprendizaje reales
const ZE = .5;                                                          // exageración vertical del DIBUJO
const GMIN = -44, GP = .125, GN = 705;
const NIV = .21, FPS = 30;

// ---------- la bola: lista de movimientos ----------
type Mov = { ini: number; dur: number; a: P2; b: P2; alto: number; suave?: boolean };
const P0: P2 = [-19, -2.4], PA: P2 = [-19, 3], P1: P2 = [-15.6, 3], P_V: P2 = [-22.5, 7.4], S: P2 = [-12.4, -.6];

function creaMovs() {
  const m: Mov[] = [];
  m.push({ ini: t0.comb + .1, dur: t0.lugar - t0.comb - .25, a: P0, b: PA, alto: 0, suave: true });
  m.push({ ini: t0.lugar + .02, dur: t0.donde1 - t0.lugar - .3, a: PA, b: P1, alto: 0, suave: true });
  m.push({ ini: t0.donde2, dur: t0.valle1 + .3 - t0.donde2, a: P1, b: P_V, alto: 0, suave: true });
  m.push({ ini: t0.tu - .1, dur: .88, a: P_V, b: S, alto: 4.2 });
  for (const s of [t0.nover, t0.nadie, t0.maquina, t0.quienes]) m.push({ ini: s + .1, dur: .34, a: S, b: S, alto: .34 });
  const hu: { p: P2; t: number }[] = [];
  const salto = (a: P2, b: P2, h: number[], alto: number) => { m.push({ ini: h[0], dur: h[1], a, b, alto }); hu.push({ p: b, t: h[0] + h[1] }); return b; };
  let q = salto(S, paso(S, ETA), t0.hop1, 1.05);
  q = salto(q, paso(q, ETA), t0.hop2, 1.0);
  for (const h of t0.cortos_h) q = salto(q, paso(q, ETA_CORTO), h, .16);
  const Q = q, L = paso(q, ETA_LARGO);
  q = salto(q, L, t0.largo, 6.2);
  for (const h of t0.afinados) q = salto(q, paso(q, ETA_AFINADO), h, h[1] > .3 ? .8 : .36);
  const fin = paso(q, ETA);
  salto(q, fin, t0.ultimo, .75);
  return { m, hu, Q, L };
}

type Linterna = { pts: Float32Array; nace: number; apaga: number; tam: number; fase: number };
type Mota = { x: number; y: number; z: number; vx: number; vy: number; f: number };
type D = {
  A: Float32Array; Ax: Float32Array; Ay: Float32Array; nz: Float32Array; dith: Float32Array;
  cv: HTMLCanvasElement; g: CanvasRenderingContext2D; img: ImageData; W: number; Hh: number;
  lr: Uint8Array; lg: Uint8Array; lb: Uint8Array; mov: Mov[]; hu: { p: P2; t: number }[]; Q: P2; L: P2;
  bx: Float32Array; by: Float32Array; bz: Float32Array; gz: Float32Array; cx: Float32Array; cy: Float32Array; cz: Float32Array;
  lin: Linterna[]; sprite: HTMLCanvasElement; motas: Mota[]; kn: Float32Array;
};

const AMP = (t: number) => t < t0.donde1 ? 0 : ease.outBack(prog(t, t0.donde1 + .1, t0.montana + .55), 1.1);

function preparar(): D {
  const A = new Float32Array(GN * GN), Ax = new Float32Array(GN * GN), Ay = new Float32Array(GN * GN);
  for (let j = 0; j < GN; j++) for (let i = 0; i < GN; i++) A[j * GN + i] = H(GMIN + i * GP, GMIN + j * GP) * ZE;
  for (let j = 1; j < GN - 1; j++) for (let i = 1; i < GN - 1; i++) {
    Ax[j * GN + i] = (A[j * GN + i + 1] - A[j * GN + i - 1]) / (2 * GP);
    Ay[j * GN + i] = (A[(j + 1) * GN + i] - A[(j - 1) * GN + i]) / (2 * GP);
  }
  // Niebla: ruido de valor periódico, tres octavas.
  const nz = new Float32Array(65536);
  const r = azar(2);
  for (const [cel, am] of [[8, .6], [16, .28], [32, .12]] as [number, number][]) {
    const G = new Float32Array(cel * cel).map(() => r() * 2 - 1), l = 256 / cel;
    for (let j = 0; j < 256; j++) for (let i = 0; i < 256; i++) {
      const u = i / l, v = j / l, a = Math.floor(u), b = Math.floor(v), fx = u - a, fy = v - b;
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const g = (p: number, q: number) => G[((q % cel + cel) % cel) * cel + ((p % cel + cel) % cel)];
      nz[j * 256 + i] += am * lerp(lerp(g(a, b), g(a + 1, b), sx), lerp(g(a, b + 1), g(a + 1, b + 1), sx), sy);
    }
  }
  const dith = new Float32Array(4096).map(() => (r() - .5) * 2.6);
  const W = 270, Hh = 480;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = Hh;
  const g = cv.getContext("2d", { willReadFrequently: true })!;
  const img = g.createImageData(W, Hh);
  const lr = new Uint8Array(256), lg = new Uint8Array(256), lb = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {                                       // de noche a papel pasando por tierra cálida
    const v = i / 255;
    lr[i] = 9 + 235 * v ** .92; lg[i] = 9 + 233 * v ** 1.04; lb[i] = 10 + 226 * v ** 1.2;
  }
  const { m: mov, hu, Q, L } = creaMovs();
  const nF = Math.ceil(DURACION * FPS) + 3;
  const bx = new Float32Array(nF), by = new Float32Array(nF), bz = new Float32Array(nF), gz = new Float32Array(nF);
  let k = 0, x = P0[0], y = P0[1];
  for (let f = 0; f < nF; f++) {
    const t = f / FPS;
    while (k < mov.length - 1 && t >= mov[k + 1].ini) { x = mov[k].b[0]; y = mov[k].b[1]; k++; }
    const m = mov[k]; let hop = 0;
    if (t >= m.ini) {
      const u = prog(t, m.ini, m.ini + m.dur), e = m.suave ? ease.inOutCubic(u) : u;
      x = lerp(m.a[0], m.b[0], e); y = lerp(m.a[1], m.b[1], e); hop = m.alto * 4 * u * (1 - u);
    }
    const am = AMP(t), h = H(x, y) * ZE * am;
    bx[f] = x; by[f] = y; gz[f] = h; bz[f] = h + hop;
  }
  // La cámara sigue a la bola con un filtro de fase cero: nunca llega tarde ni se detiene en seco.
  const suaviza = (s: Float32Array, tau: number) => {
    const o = Float32Array.from(s), a = 1 - Math.exp(-1 / (tau * FPS));
    for (let i = 1; i < nF; i++) o[i] = lerp(o[i - 1], o[i], a);
    for (let i = nF - 2; i >= 0; i--) o[i] = lerp(o[i + 1], o[i], a);
    return o;
  };
  const zc = gz.map((v, i) => v + (bz[i] - v) * .35);
  const cx = suaviza(bx, .17), cy = suaviza(by, .17), cz = suaviza(zc, .2);
  // Mil linternas: cada una baja por su cuenta con descenso de gradiente de verdad.
  const rl = azar(61), lin: Linterna[] = [];
  for (let i = 0; i < 560; i++) {
    const a = rl() * 6.283, rad = 11 + Math.sqrt(rl()) * 66;
    let p: P2 = [Math.cos(a) * rad, Math.sin(a) * rad * 1.5];
    const n = 60, pts = new Float32Array(n * 3);
    for (let j = 0; j < n; j++) { pts[j * 3] = p[0]; pts[j * 3 + 1] = p[1]; pts[j * 3 + 2] = H(p[0], p[1]) * ZE; p = paso(p, 2.1); }
    lin.push({ pts, nace: t0.casi - .55 + rl() * 1.6, apaga: t0.nosabe + rl() * (t0.solo - t0.nosabe - .55), tam: lerp(.72, 1.24, rl()), fase: rl() });
  }
  const sprite = document.createElement("canvas"); sprite.width = sprite.height = 96;
  const sg = sprite.getContext("2d")!, gr = sg.createRadialGradient(48, 48, 0, 48, 48, 48);
  gr.addColorStop(0, "rgba(255,247,232,1)"); gr.addColorStop(.11, "rgba(250,232,205,.92)"); gr.addColorStop(.3, "rgba(232,190,150,.26)"); gr.addColorStop(1, "rgba(200,140,100,0)");
  sg.fillStyle = gr; sg.fillRect(0, 0, 96, 96);
  const rm = azar(19), motas: Mota[] = [];
  for (let i = 0; i < 130; i++) motas.push({ x: rm() * 15, y: rm() * 15, z: rm() * 3.4 + .1, vx: (rm() - .3) * .5, vy: (rm() - .5) * .34, f: rm() * 6.28 });
  const kn = new Float32Array(4096).map(() => r());
  return { A, Ax, Ay, nz, dith, cv, g, img, W, Hh, lr, lg, lb, mov, hu, Q, L, bx, by, bz, gz, cx, cy, cz, lin, sprite, motas, kn };
}

function hg(d: D, x: number, y: number) {
  const u = clamp((x - GMIN) / GP, 0, GN - 1.01), v = clamp((y - GMIN) / GP, 0, GN - 1.01);
  const i = u | 0, j = v | 0, fx = u - i, fy = v - j, A = d.A, k = j * GN + i;
  return (A[k] * (1 - fx) + A[k + 1] * fx) * (1 - fy) + (A[k + GN] * (1 - fx) + A[k + GN + 1] * fx) * fy;
}
function ruidoEn(d: D, u: number, v: number) {
  const a = Math.floor(u), b = Math.floor(v), fx = u - a, fy = v - b;
  const n = d.nz, i0 = a & 255, i1 = (a + 1) & 255, j0 = (b & 255) << 8, j1 = ((b + 1) & 255) << 8;
  return (n[j0 + i0] * (1 - fx) + n[j0 + i1] * fx) * (1 - fy) + (n[j1 + i0] * (1 - fx) + n[j1 + i1] * fx) * fy;
}
const sstep = (a: number, b: number, x: number) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };

// ---------- la luz: lo único que hace existir al mundo ----------
type Luz = { x: number; y: number; z: number; R: number; dia: number; ecos: { x: number; y: number; R: number; a: number }[]; pings: { x: number; y: number; r: number; a: number }[]; t: number };

function nivelLuz(d: D, L: Luz, x: number, y: number) {
  const n = ruidoEn(d, x * 9 + L.t * 2.2, y * 9 - L.t * 1.4);
  const dx = x - L.x, dy = y - L.y, di = Math.sqrt(dx * dx + dy * dy) * (1 - .24 * n);
  let v = L.R > .01 ? sstep(L.R * 1.12, L.R * .26, di) : 0;
  for (const e of L.ecos) {
    const q = Math.hypot(x - e.x, y - e.y) * (1 - .24 * n);
    if (e.R < .05) continue;
    v = 1 - (1 - v) * (1 - e.a * sstep(e.R * 1.02, e.R * .2, q));
  }
  for (const p of L.pings) {
    const q = Math.hypot(x - p.x, y - p.y) - p.r;
    if (Math.abs(q) < 1) v += p.a * Math.exp(-q * q * 7) * (1 - v);
  }
  return v;
}

/** Suelo por pixel a 1/4 de resolución: rayo → relieve → linterna. Lo oscuro lo cuida el dither. */
function suelo(c: CanvasRenderingContext2D, d: D, cam: Cam, L: Luz, amp: number, f: number) {
  const v = cam.v, p = Math.min(v.pitch, 1.5533), sy = Math.sin(v.yaw), cy = Math.cos(v.yaw), cp = Math.cos(p), sp = Math.sin(p);
  const fw0 = -cp * sy, fw1 = cp * cy, fw2 = -sp, r0 = cy, r1 = sy;
  const u0 = r1 * fw2, u1 = -r0 * fw2, u2 = r0 * fw1 - r1 * fw0;
  const [px, py, pz] = cam.pos, ff = cam.f, ccx = cam.cx, ccy = cam.cy;
  const W = d.W, Hh = d.Hh, data = d.img.data, esc = 1080 / W;
  const dia = L.dia, Rmax = dia ? 8.4 : Math.max(L.R * 1.5, ...L.pings.map((q) => q.r + 2), ...L.ecos.map((e) => e.R * 1.1), .1);
  let Rlim = Rmax + 2.4; Rlim *= Rlim;
  const sun = [-.52, -.42, .744];
  let k = 0, pl = L.z;
  for (let j = 0; j < Hh; j++) {
    const s2 = ccy - (j + .5) * esc;
    for (let i = 0; i < W; i++, k += 4) {
      const s1 = (i + .5) * esc - ccx;
      const dx = fw0 * ff + r0 * s1 + u0 * s2, dy = fw1 * ff + r1 * s1 + u1 * s2, dz = fw2 * ff + u2 * s2;
      const di = d.dith[(i * 7 + j * 131 + f * 37) & 4095];
      if (dz > -.5) { const q = dia ? 244 : 9; data[k] = q + di; data[k + 1] = dia ? 242 + di : q + di; data[k + 2] = dia ? 236 + di : 10 + di; data[k + 3] = 255; continue; }
      let l = (pl - pz) / dz, x = px + l * dx, y = py + l * dy;
      const qx = x - L.x, qy = y - L.y, q2 = qx * qx + qy * qy;
      if (q2 > Rlim) {
        if (dia) { data[k] = 244 + di; data[k + 1] = 242 + di; data[k + 2] = 236 + di; data[k + 3] = 255; continue; }
        const n = ruidoEn(d, x * 1.6 + L.t * .8, y * 1.6 - L.t * .5), h = Math.max(0, 1 - Math.sqrt(q2) / (Rmax * 3.2));
        const g = 9 + (2.5 + 5 * n) * .6 + 12 * h * h * (.6 + .5 * n);
        data[k] = g + di; data[k + 1] = g + di; data[k + 2] = g + 1 + di; data[k + 3] = 255; continue;
      }
      let z = pl;
      for (let it = 0; it < 3; it++) { l = (z - pz) / dz; x = px + l * dx; y = py + l * dy; z += (hg(d, x, y) * amp - z) * .8; }
      l = (z - pz) / dz; x = px + l * dx; y = py + l * dy;
      const u = clamp((x - GMIN) / GP, 1, GN - 2) | 0, w = clamp((y - GMIN) / GP, 1, GN - 2) | 0, ki = w * GN + u;
      const hx = d.Ax[ki] * amp, hy = d.Ay[ki] * amp, nl = 1 / Math.sqrt(hx * hx + hy * hy + 1);
      let val: number, halo = 0;
      if (dia) {
        const lam = (-hx * sun[0] - hy * sun[1] + sun[2]) * nl;
        const qd = Math.sqrt((x - L.x) ** 2 + (y - L.y) ** 2), mask = sstep(7, 3, qd);
        val = 1 - clamp(-(.95 * (lam - sun[2])), -.03, .34) * mask;
      } else {
        const a = nivelLuz(d, L, x, y);
        const lx = L.x - x, ly = L.y - y, lz = L.z + 4.8 - z, li = 1 / Math.sqrt(lx * lx + ly * ly + lz * lz);
        const lam = (-hx * lx - hy * ly + lz) * nl * li;
        val = a * clamp(.5 + .6 * lam, 0, 1.03);
        const n = ruidoEn(d, x * 1.6 + L.t * .8, y * 1.6 - L.t * .5), h = Math.max(0, 1 - Math.sqrt(q2) / (Rmax * 3.2));
        halo = (1 - a) * ((2.5 + 5 * n) * .6 + 12 * h * h * (.6 + .5 * n));
      }
      const iv = clamp(val, 0, 1) * 255 | 0;
      data[k] = d.lr[iv] + halo + di; data[k + 1] = d.lg[iv] + halo + di; data[k + 2] = d.lb[iv] + halo + di; data[k + 3] = 255;
    }
  }
  d.g.putImageData(d.img, 0, 0);
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "medium";
  c.drawImage(d.cv, 0, 0, 1080, 1920);
}

/** Curvas de nivel en el mismo campo. Su opacidad es la luz que reciben: no existen fuera de ella. */
function curvasTerreno(c: CanvasRenderingContext2D, d: D, cam: Cam, L: Luz, amp: number) {
  if (amp < .02 || (L.R < .05 && !L.dia && !L.ecos.length && !L.pings.length)) return;
  const R = L.dia ? 7.6 : Math.max(L.R * 2.3, ...L.pings.map((q) => q.r + 1.2), 1);
  const a0 = Math.floor(((L.x - R) - GMIN) / GP / 2) * 2, a1 = Math.ceil(((L.x + R) - GMIN) / GP / 2) * 2;
  const b0 = Math.floor(((L.y - R) - GMIN) / GP / 2) * 2, b1 = Math.ceil(((L.y + R) - GMIN) / GP / 2) * 2;
  const NB = 6, tinta: Path2D[] = [], gorda: Path2D[] = [], fant: Path2D[] = [];
  for (let i = 0; i < NB; i++) { tinta.push(new Path2D()); gorda.push(new Path2D()); fant.push(new Path2D()); }
  const A = d.A, p = GP * 2, st = 2, Rf = L.R;
  const seg = (ax: number, ay: number, bx: number, by: number, z: number, may: boolean) => {
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    let v: number;
    if (L.dia) v = sstep(7.2, 3.2, Math.hypot(mx - L.x, my - L.y));
    else v = nivelLuz(d, L, mx, my);
    let pa: Path2D | null = null;
    if (v > .1) { const b = Math.min(NB - 1, Math.floor(v * NB)); pa = may ? gorda[b] : tinta[b]; }
    else if (!L.dia && Rf > .1) {
      const q = sstep(Rf * 2.3, Rf * .9, Math.hypot(mx - L.x, my - L.y));
      if (q > .04) pa = fant[Math.min(NB - 1, Math.floor(q * NB))];
    }
    if (!pa) return;
    const P = cam.p(ax, ay, z), Q = cam.p(bx, by, z);
    if (P && Q) { pa.moveTo(P.x, P.y); pa.lineTo(Q.x, Q.y); }
  };
  for (let j = Math.max(b0, 0); j < Math.min(b1, GN - st - 1); j += st) for (let i = Math.max(a0, 0); i < Math.min(a1, GN - st - 1); i += st) {
    const a = A[j * GN + i] * amp, b = A[j * GN + i + st] * amp, e = A[(j + st) * GN + i + st] * amp, g = A[(j + st) * GN + i] * amp;
    const mn = Math.min(a, b, e, g), mx = Math.max(a, b, e, g);
    const l0 = Math.ceil(mn / NIV), l1 = Math.floor(mx / NIV);
    if (l1 < l0) continue;
    const X = GMIN + i * GP, Y = GMIN + j * GP;
    for (let l = l0; l <= l1; l++) {
      const Z = l * NIV, may = l % 5 === 0;
      const m = (a > Z ? 8 : 0) | (b > Z ? 4 : 0) | (e > Z ? 2 : 0) | (g > Z ? 1 : 0);
      if (m === 0 || m === 15) continue;
      const Tx = X + p * (Z - a) / (b - a), Ry = Y + p * (Z - b) / (e - b), Ux = X + p * (Z - g) / (e - g), Iy = Y + p * (Z - a) / (g - a);
      const XR = X + p, YU = Y + p;
      switch (m) {
        case 1: case 14: seg(X, Iy, Ux, YU, Z, may); break;
        case 2: case 13: seg(Ux, YU, XR, Ry, Z, may); break;
        case 3: case 12: seg(X, Iy, XR, Ry, Z, may); break;
        case 4: case 11: seg(Tx, Y, XR, Ry, Z, may); break;
        case 6: case 9: seg(Tx, Y, Ux, YU, Z, may); break;
        case 7: case 8: seg(X, Iy, Tx, Y, Z, may); break;
        case 5: seg(X, Iy, Tx, Y, Z, may); seg(Ux, YU, XR, Ry, Z, may); break;
        case 10: seg(Tx, Y, XR, Ry, Z, may); seg(X, Iy, Ux, YU, Z, may); break;
      }
    }
  }
  c.lineCap = "round";
  for (let i = 0; i < NB; i++) {
    const a = (i + 1) / NB;
    c.strokeStyle = `rgba(17,17,17,${a * .66})`; c.lineWidth = 2.7; c.stroke(tinta[i]);
    c.strokeStyle = `rgba(17,17,17,${Math.min(1, a * 1.05)})`; c.lineWidth = 5; c.stroke(gorda[i]);
    c.strokeStyle = `rgba(237,234,227,${a * .3})`; c.lineWidth = 2; c.stroke(fant[i]);
  }
}

// ---------- piezas sueltas ----------
function rimBola(c: CanvasRenderingContext2D, x: number, y: number, r: number, alfa: number) {
  bola(c, x, y, r);
  if (alfa <= .01) return;
  c.save(); c.globalAlpha = alfa; c.lineCap = "round";
  c.strokeStyle = "rgba(237,234,227,.82)"; c.lineWidth = Math.max(2.4, r * .05); c.beginPath(); c.arc(x, y, r - c.lineWidth / 2, 3.5, 5.3); c.stroke();
  c.strokeStyle = "rgba(237,234,227,.3)"; c.lineWidth = Math.max(1.6, r * .03); c.beginPath(); c.arc(x, y, r - 1, 0, 6.3); c.stroke();
  c.restore();
}

function bolaEn(c: CanvasRenderingContext2D, cam: Cam, x: number, y: number, g: number, z: number, r: number, rim: number) {
  const s = cam.p(x, y, g), a = cam.p(x, y, z + r * .92);
  if (!s || !a) return;
  const al = z - g;
  sombra(c, s.x, s.y, r * s.s * (1.9 + al * .4), .46 / (1 + al * .9));
  rimBola(c, a.x, a.y, r * a.s, rim);
}

/** Una perilla: la bola con diente y marcas. Grande lleva detalle; pequeña es punto y raya. */
function perilla(c: CanvasRenderingContext2D, x: number, y: number, r: number, ang: number, acento = false, tintaMarca = TINTA, marcas = 1) {
  if (marcas > .01) {
    c.save(); c.strokeStyle = tintaMarca; c.lineWidth = Math.max(2, r * .03); c.lineCap = "round"; c.globalAlpha = marcas;
    for (let i = 0; i <= 10; i++) {
      const a = -2.36 + i * .472 - 1.5708, r0 = r * 1.2, r1 = r * (i % 5 === 0 ? 1.36 : 1.3);
      c.beginPath(); c.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); c.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); c.stroke();
    }
    c.restore();
  }
  bola(c, x, y, r, acento ? ACENTO : TINTA);
  c.strokeStyle = LUZ; c.lineWidth = Math.max(2, r * .09); c.lineCap = "round";
  const a = ang - 1.5708;
  c.beginPath(); c.moveTo(x + Math.cos(a) * r * .34, y + Math.sin(a) * r * .34); c.lineTo(x + Math.cos(a) * r * .86, y + Math.sin(a) * r * .86); c.stroke();
}

function arco(c: CanvasRenderingContext2D, cam: Cam, a: P2, b: P2, za: number, zb: number, alto: number, k: number, color: string, g = 6, dash: number[] = [3, 20]) {
  if (k <= 0) return;
  c.save(); c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round"; c.setLineDash(dash); c.beginPath();
  let pri = true;
  for (let i = 0; i <= 40; i++) {
    const u = i / 40 * k, p = cam.p(lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(za, zb, u) + alto * 4 * u * (1 - u) + .4);
    if (p) { if (pri) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y); pri = false; }
  }
  c.stroke(); c.restore();
}

/** El error es la altura: la misma barra del capítulo anterior, ahora de pie. */
const YB = 1400, XB = 96;
const yErr = (h: number) => YB - clamp(h / 13) * 800;
function barra(c: CanvasRenderingContext2D, h: number, a: number, marca: number | null, aMarca: number) {
  if (a <= .01) return;
  c.save(); c.globalAlpha = a; c.fillStyle = ACENTO;
  const y = yErr(h);
  c.fillRect(XB - 10, y, 20, YB - y);
  c.restore();
  texto(c, "error", XB - 16, YB + 78, { fuente: serif(82, true), color: ACENTO, alin: "left", alfa: a });
  if (marca !== null && aMarca > 0) {
    const ym = yErr(marca);
    c.save(); c.globalAlpha = a * aMarca; c.fillStyle = LUZ; c.fillRect(XB - 30, ym - 3.5, 92, 7); c.restore();
  }
}

function errorEn(t: number, d: D) {
  let i = -1;
  for (let k = 0; k < d.hu.length; k++) if (d.hu[k].t <= t) i = k; else break;
  const v0 = i > 0 ? H(d.hu[i - 1].p[0], d.hu[i - 1].p[1]) : H(S[0], S[1]);
  if (i < 0) return v0;
  return lerp(v0, H(d.hu[i].p[0], d.hu[i].p[1]), ease.outCubic(prog(t, d.hu[i].t, d.hu[i].t + .24)));
}

// ---------- el muro de perillas ----------
const espDe = (t: number) => {
  let l = Math.log(1500);
  l = lerp(l, Math.log(13), ease.inOutCubic(prog(t, t0.miles - .16, t0.perillas + .45)));
  l -= .05 * Math.max(0, Math.min(t, t0.cada - .1) - t0.perillas);
  l = lerp(l, Math.log(150), ease.inOutCubic(prog(t, t0.cada - .1, t0.cada + .75)));
  l = lerp(l, Math.log(80), ease.inOutCubic(prog(t, t0.probar - .1, t0.probar + 1.4)));
  return Math.exp(l);
};
const SALTA: [number, number][] = [[-2, 3], [2, -2], [-1, -4], [3, 2], [0, 1]];

function trinqueteA(t: number) {                                        // la primera perilla, a dientes
  let a = -.5;
  for (let i = 0; i < 9; i++) a += .42 * ease.outBack(prog(t, .3 + i * .17, .3 + i * .17 + .13), 2.4);
  return a;
}
function ondaGolpe(c: CanvasRenderingContext2D, t: number, r: number) {
  for (let i = 0; i < 3; i++) {
    const e = t - t0.golpe - i * .07; if (e <= 0 || e > .62) continue;
    c.save(); c.globalAlpha = 1 - e / .62; c.strokeStyle = TINTA; c.lineWidth = 7 - i * 2; c.beginPath(); c.arc(540, 960, r + ease.outCubic(e / .62) * 640, 0, 6.3); c.stroke(); c.restore();
  }
  const ra = azar(11);
  for (let i = 0; i < 26; i++) {                                         // astillas de tinta que salen volando
    const a = ra() * 6.283, v = 600 + ra() * 1100, tam = 3 + ra() * 6, e = t - t0.golpe;
    if (e <= 0 || e > .7) continue;
    const dr = v * e * (1 - e * .55), x = 540 + Math.cos(a) * (r + dr), y = 960 + Math.sin(a) * (r + dr) + 500 * e * e;
    c.fillStyle = TINTA; c.globalAlpha = 1 - e / .7; c.beginPath(); c.arc(x, y, tam, 0, 6.3); c.fill(); c.globalAlpha = 1;
  }
}
function nudges(t: number) {
  return ease.outBack(prog(t, t0.poquito, t0.poquito + .22), 3) * .4 + ease.outBack(prog(t, t0.responde + .05, t0.responde + .27), 3) * -.26;
}

function muroDia(c: CanvasRenderingContext2D, t: number, d: D, fondo: boolean) {
  if (fondo) { c.fillStyle = PAPEL; c.fillRect(0, 0, 1080, 1920); }
  const e = espDe(t), aplasta = 1 + .1 * Math.exp(-Math.max(0, t - t0.golpe) * 13) * Math.cos(Math.max(0, t - t0.golpe) * 34);
  const r = Math.min(e * .36, (240 + 92 * smooth(prog(t, .3, t0.miles))) * aplasta);
  const caeIni = t0.mejor + .22;
  const nx = Math.ceil(600 / e) + 2, ny = Math.ceil(1060 / e) + 2;
  const giro = .11 * ease.inOutCubic(prog(t, t0.miles - .16, t0.perillas + .4)) * (1 - ease.inOutCubic(prog(t, t0.cada - .1, t0.cada + .7)));
  const cs = Math.cos(giro), sn = Math.sin(giro);
  const vida = smooth(prog(t, t0.perillas, t0.cada)) * (1 - smooth(prog(t, t0.mejor - .1, t0.mejor + .3)));
  const derX = Math.sin(t * .67) * 20 * vida, derY = Math.cos(t * .53) * 22 * vida;
  const ts = clamp(t, t0.probar, t0.mejor) - t0.probar;                // al decir «Mejor» se congela
  const caos = (i: number) => ts * ts * .34 * (d.kn[i & 4095] - .5) * 7 + ts * (d.kn[(i + 91) & 4095] - .5) * 7;
  const hopI = t >= t0.como && t < t0.probar + .1 ? Math.min(SALTA.length - 1, Math.floor(prog(t, t0.como, t0.cual + .32) * SALTA.length)) : -1;
  // Bola que cae en el cuadro 0: ya viene en movimiento.
  if (t < t0.golpe) {
    const k = t / t0.golpe, y = lerp(250, 960, k * k), R = lerp(120, 240, k * k * .0 + 1);
    rimBola(c, 540, y, R, 0);
    return;
  }
  ondaGolpe(c, t, r);
  const lote = e < 60 ? new Path2D() : null, punt = e < 60 ? new Path2D() : null;
  const mTop = t < t0.chat - .4 ? -260 : lerp(-260, 610, smooth(prog(t, t0.chat - .4, t0.chat - .05)));
  const mBot = lerp(2200, 1390, smooth(prog(t, t0.perillas - .3, t0.perillas)) * (1 - smooth(prog(t, t0.cada - .1, t0.cada + .15))));
  for (let j = -ny; j <= ny; j++) for (let i = -nx; i <= nx; i++) {
    const id = (j + 200) * 401 + (i + 200);
    const wx = i * e, wy = j * e;
    let x = 540 + wx * cs - wy * sn + derX, y = 960 + wx * sn + wy * cs + derY;
    const q = d.kn[id & 4095], base = (q * 2 - 1) * 2.4 + Math.sin(t * lerp(.9, 2.2, q) + q * 20) * .2;
    let ang = base + caos(id);
    let ac = false, rr = r * sstep(mTop, mTop + 130, y) * sstep(mBot, mBot - 130, y), sobre = false;
    if (rr < .5) continue;
    if (e < 26) rr *= 1 + .22 * Math.sin(Math.hypot(wx, wy) * .017 - t * 7.5);  // brillo que corre: siguen vivas
    if (i === 0 && j === 0) { ang = trinqueteA(t) + nudges(t); ac = t >= t0.cada - .05 && t < t0.como; }
    if (hopI >= 0 && SALTA[hopI][0] === i && SALTA[hopI][1] === j) { ac = true; sobre = true; }
    if (t >= t0.probar + .15 && t < t0.mejor) {
      const vel = 7 + ts * 6, tira = Math.floor(ts * vel);
      if (d.kn[(id * 7 + tira * 1319) & 4095] < .1) ac = true;
      rr *= 1 + .17 * Math.sin(t * (9 + q * 8) + q * 30) * Math.min(1, ts);
    }
    const queda = (i === 0 || i === 1) && j === 0;
    if (t >= caeIni && !queda) {
      const age = t - caeIni - d.kn[(id + 7) & 4095] * .52;
      if (age > 0) { y += 1900 * age * age; ang += age * (q - .5) * 9; if (y > 2040) continue; }
    }
    if (queda && t >= caeIni - .2) continue;                            // las dos que quedan se dibujan aparte
    if (x < -r * 1.5 || x > 1080 + r * 1.5 || y < -r * 1.5 || y > 1920 + r * 1.5) continue;
    if (e >= 60) {
      perilla(c, x, y, rr, ang, ac, TINTA, t < .3 ? 0 : smooth(prog(e, 90, 150)) * (e > 400 ? ease.outBack(prog(t, t0.golpe, t0.golpe + .3), 2) : 1));
      if (sobre) { c.save(); c.strokeStyle = ACENTO; c.lineWidth = 7; c.globalAlpha = .9; c.beginPath(); c.arc(x, y, rr * 1.42, 0, 6.3); c.stroke(); c.restore(); }
    } else if (r >= 7) {
      lote!.moveTo(x + rr, y); lote!.arc(x, y, rr, 0, 6.3);
      const a = ang - 1.5708; punt!.moveTo(x + Math.cos(a) * rr * .3, y + Math.sin(a) * rr * .3); punt!.lineTo(x + Math.cos(a) * rr * .86, y + Math.sin(a) * rr * .86);
    } else lote!.rect(x - rr, y - rr, rr * 2, rr * 2);
  }
  if (lote) {
    c.fillStyle = TINTA; c.fill(lote);
    c.strokeStyle = LUZ; c.lineWidth = Math.max(1.5, r * .16); c.lineCap = "round"; c.stroke(punt!);
  }
}

function textoMuro(c: CanvasRenderingContext2D, t: number) {
  // Las franjas limpias: el muro nunca pasa por debajo de una palabra.
  rotulo(c, t, t0.chat - .1, t0.cada - .22, "ChatGPT tiene", 330, 118);
  rotulo(c, t, t0.miles, t0.cada - .22, "miles de millones", 480, 124, ACENTO, true);
  rotulo(c, t, t0.perillas, t0.cada - .22, "de perillas", 1540, 136, TINTA, true);

  // La respuesta cambia un poquito con cada empujón.
  const aB = smooth(prog(t, t0.cada + .25, t0.cada + .55)) * (1 - smooth(prog(t, t0.como - .22, t0.como - .02)));
  if (aB > 0) {
    const n = t < t0.poquito ? 0 : t < t0.responde + .05 ? 1 : 2, s = ["Sí, claro.", "Sí, casi.", "Sí, quizá."][n];
    const salta = 1 + .05 * Math.exp(-Math.max(0, t - (n === 1 ? t0.poquito : n === 2 ? t0.responde + .05 : -9)) * 9);
    c.save(); c.globalAlpha = aB; c.translate(540, 322); c.scale(salta, salta);
    const w = 620, h = 200;
    c.fillStyle = PAPEL; c.strokeStyle = TINTA; c.lineWidth = 5;
    c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, 44); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-40, h / 2 - 2.5); c.lineTo(-20, h / 2 + 46); c.lineTo(30, h / 2 - 2.5); c.fill();
    c.beginPath(); c.moveTo(-40, h / 2); c.lineTo(-20, h / 2 + 46); c.lineTo(30, h / 2); c.stroke();
    c.restore();
    texto(c, s, 540, 362, { fuente: serif(124), color: TINTA, alfa: aB });
  }
  rotulo(c, t, t0.como - .02, t0.probar - .22, "¿cuál?", 400, 200, ACENTO, true);

  // Probadas: los ceros no se acaban nunca.
  const aP = smooth(prog(t, t0.probar + .1, t0.probar + .35)) * (1 - smooth(prog(t, t0.mejor - .1, t0.mejor + .06)));
  if (aP > 0) {
    texto(c, "combinaciones probadas", 540, 270, { fuente: serif(100), color: TINTA, alfa: aP });
    const u = Math.max(0, t - t0.probar - .2), n = Math.floor(3 + u * 8 + u * u * 10), w = 55.2;
    let cad = "0.";
    for (let k = 0; k < n; k++) cad += (k + 1) % 3 === 0 ? "0 " : "0";
    const des = Math.max(0, cad.length * w - 930);
    texto(c, cad, 76 - des, 442, { fuente: mono(92), color: ACENTO, alin: "left", alfa: aP });
  }
}

// ---------- los pies ----------
const PV: P2 = [420, 1180];
function escenaPies(c: CanvasRenderingContext2D, t: number) {
  const ab = ease.outExpo(prog(t, t0.pero, t0.pero + .95));
  const ang = .36 * resorte(t - (t0.inclina - .34), 1.5, .36) + Math.sin(t * .83) * .009 * smooth(prog(t, t0.inclina, t0.inclina + 1));
  const tiem = Math.exp(-Math.max(0, t - (t0.inclina - .34)) * 3.4) * (t > t0.inclina - .34 ? 1 : 0);
  const sx = Math.sin(t * 61) * 7 * tiem, sy = Math.cos(t * 47) * 9 * tiem;
  // Nunca quieto: acercamiento lento, y la bola respira y carga el peso.
  const zs = 1 + (t - t0.pero) * .0085, dxs = Math.sin(t * .53) * 9, dys = Math.cos(t * .41) * 7;
  c.save(); c.translate(PV[0] + sx + dxs, PV[1] - 120 + sy + dys); c.scale(zs, zs); c.translate(-PV[0], -PV[1] + 120);
  // Halo de la linterna: de aquí sale toda la luz de la escena.
  const hl = c.createRadialGradient(PV[0], PV[1] - 200, 40, PV[0], PV[1] - 200, 760);
  hl.addColorStop(0, `rgba(244,226,196,${.26 * ab})`); hl.addColorStop(.5, `rgba(244,226,196,${.07 * ab})`); hl.addColorStop(1, "rgba(244,226,196,0)");
  c.fillStyle = hl; c.fillRect(0, 0, 1080, 1920);
  // La tierra, de perfil.
  c.save(); c.translate(PV[0], PV[1]); c.rotate(ang);
  const R = 940 * ab, g = c.createRadialGradient(0, 0, 20, 0, 0, Math.max(R, 30));
  g.addColorStop(0, "rgba(244,242,236,1)"); g.addColorStop(.3, "rgba(242,238,228,.96)"); g.addColorStop(.52, "rgba(214,202,182,.7)"); g.addColorStop(.74, "rgba(150,132,110,.3)"); g.addColorStop(.9, "rgba(110,94,78,.08)"); g.addColorStop(1, "rgba(100,86,70,0)");
  c.fillStyle = g; c.beginPath(); c.rect(-1600, 0, 3200, 1500); c.fill();
  const ln = c.createLinearGradient(-R, 0, R, 0);
  ln.addColorStop(0, "rgba(17,17,17,0)"); ln.addColorStop(.2, "rgba(17,17,17,.55)"); ln.addColorStop(.5, "rgba(17,17,17,.75)"); ln.addColorStop(.8, "rgba(17,17,17,.55)"); ln.addColorStop(1, "rgba(17,17,17,0)");
  c.strokeStyle = ln;
  for (let k = 1; k <= 6; k++) {
    const y = 34 + k * k * 13.5; c.lineWidth = k % 3 === 0 ? 3.4 : 2; c.globalAlpha = 1 - k * .12;
    c.beginPath();
    for (let x = -R; x <= R; x += 26) { const w = y + Math.sin(x * .0052 + k * 1.7 + t * .46) * (k * 3.4) + Math.sin(x * .013 + k - t * .31) * k * .9; if (x === -R) c.moveTo(x, w); else c.lineTo(x, w); }
    c.stroke();
  }
  c.globalAlpha = 1;
  const ls = c.createLinearGradient(-R * 1.02, 0, R * 1.02, 0);
  ls.addColorStop(0, "rgba(244,242,236,0)"); ls.addColorStop(.3, "rgba(244,242,236,1)"); ls.addColorStop(.7, "rgba(244,242,236,1)"); ls.addColorStop(1, "rgba(244,242,236,0)");
  c.strokeStyle = ls; c.lineWidth = 7; c.beginPath(); c.moveTo(-R, 0); c.lineTo(R, 0); c.stroke();
  // Guijarros: lo que de verdad te dice para dónde va el suelo.
  const r = azar(5);
  for (let i = 0; i < 8; i++) {
    const u0 = lerp(-560, 130, r()), rad = lerp(7, 14, r()), dl = r() * .16;
    const age = Math.max(0, t - (t0.inclina - .08) - dl), u = u0 + 1050 * age * age * (1 + (i % 3) * .2);
    const a = (1 - smooth(prog(u, 480, 680))) * smooth(prog(t, t0.pies, t0.pies + .4));
    if (a <= 0) continue;
    c.fillStyle = "#E8DFCE"; c.globalAlpha = a; c.beginPath(); c.arc(u, -rad - 3, rad, 0, 6.3); c.fill();
  }
  c.globalAlpha = 1;
  c.restore();
  // Los pies: dos puntos de apoyo a distinta altura. Así se siente una pendiente.
  const LP = 150, sal = ease.outBack(prog(t, t0.pies - .02, t0.pies + .26), 2.2);
  const cuesta = 26 * smooth(prog(ang, 0, .3));
  const cxb = PV[0] + cuesta + Math.sin(t * 1.27) * 5, cyb = PV[1] - 268 + Math.sin(t * 2.3) * 6;
  // Polvo en la luz.
  const rp = azar(23);
  for (let i = 0; i < 46; i++) {
    const x0 = rp() * 1300 - 110, y0 = rp() * 900 + 400, v = .4 + rp() * .9, f = rp() * 6.28, r = 1.8 + rp() * 2.8;
    const x = x0 + Math.sin(t * .4 * v + f) * 70 + t * 11 * v, y = y0 + Math.cos(t * .33 * v + f) * 54 - (t - t0.pero) * 9 * v;
    const a = ab * clamp(1 - Math.hypot(x - PV[0], y - PV[1] + 200) / 760) * .62;
    if (a <= .01) continue;
    c.fillStyle = `rgba(244,232,212,${a})`; c.beginPath(); c.arc(x, y, r, 0, 6.3); c.fill();
  }
  const tap = (ti: number) => { const k = prog(t, ti, ti + .17); return Math.sin(k * Math.PI) * 30; };
  const tapI = tap(t0.pies + .0) + tap(t0.algo + .1), tapD = tap(t0.pies + .24) + tap(t0.algo + .32);
  const pie = (lado: number, lev: number) => {
    const fx = PV[0] + Math.cos(ang) * LP * lado, fy = PV[1] + Math.sin(ang) * LP * lado - 7 - lev;
    const hx = cxb + lado * 74, hy = cyb + 120;
    c.strokeStyle = LUZ; c.lineWidth = 4.5; c.lineCap = "round"; c.beginPath(); c.moveTo(hx, hy); c.lineTo(lerp(hx, fx, sal), lerp(hy, fy, sal)); c.stroke();
    c.fillStyle = ACENTO; c.beginPath(); c.arc(lerp(hx, fx, sal), lerp(hy, fy, sal) - 8, 19 * sal, 0, 6.3); c.fill();
  };
  if (sal > 0) { pie(-1, tapI); pie(1, tapD); }
  rimBola(c, cxb, cyb, 158, 1);
  // La inclinación, medida: subida contra avance.
  const aI = smooth(prog(t, t0.esa + .1, t0.esa + .5));
  if (aI > 0) {
    const ax = PV[0] + Math.cos(ang) * LP, ay = PV[1] + Math.sin(ang) * LP - 38;
    const w = 410 * ease.outCubic(prog(t, t0.esa + .05, t0.esa + .55));
    const ex = ax + w, ey = ay + Math.tan(ang) * w;
    c.save(); c.globalAlpha = aI; c.setLineDash([3, 22]); c.lineCap = "round"; c.strokeStyle = LUZ; c.lineWidth = 8;
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax + w, ay); c.stroke();
    c.setLineDash([]); c.strokeStyle = ACENTO; c.lineWidth = 20; c.beginPath(); c.moveTo(ex, ay); c.lineTo(ex, ey); c.stroke();
    c.restore();
  }
  c.restore();
  texto(c, "gradiente", 540, 480, { fuente: serif(190, true), color: ACENTO, alfa: smooth(prog(t, t0.gradiente - .06, t0.gradiente + .14)) * (1 - smooth(prog(t, t0.lomejor + .1, t0.lomejor + .4))) });
}

function muroNoche(c: CanvasRenderingContext2D, t: number, d: D) {
  const p = ease.inOutCubic(prog(t, t0.lomejor + .1, t0.todas + .4));
  const z = Math.exp(lerp(0, Math.log(.04), p)), e = 1500 * z;
  const j0 = t0.snap, snap = t >= j0, age = t - j0;
  const pu = snap ? 1 + .05 * Math.exp(-age * 5.5) : 1;
  const sk = snap ? Math.exp(-age * 7) * 16 : 0;
  c.fillStyle = NOCHE; c.fillRect(0, 0, 1080, 1920);
  c.save(); c.translate(540 + Math.sin(t * 71) * sk + Math.sin(t * .71) * 14, 960 + Math.cos(t * 59) * sk + Math.cos(t * .59) * 12); c.scale(pu, pu); c.rotate(Math.sin(t * .47) * .012); c.translate(-540, -960);
  const aEsc = smooth(prog(z, .07, .22));
  if (aEsc > 0) {
    c.save(); c.globalAlpha = aEsc; c.translate(540, 960); c.scale(z, z); c.translate(-540, -960 - 40); escenaPies(c, t); c.restore();
  }
  const aMuro = 1 - smooth(prog(z, .14, .4));
  if (aMuro > 0) {
    const nx = Math.ceil(620 / e) + 1, ny = Math.ceil(1080 / e) + 1, r = e * .37;
    const dis = new Path2D(), pun = new Path2D(), disA = new Path2D(), punA = new Path2D();
    const imp = ease.inCubic(prog(t, j0 + .55, t0.dasun - .02));
    const tiembla = prog(t, t0.mismo, t0.jalon2 + .1) ** 2;
    for (let j = -ny; j <= ny; j++) for (let i = -nx; i <= nx; i++) {
      const id = (j + 300) * 601 + (i + 300), q = d.kn[id & 4095];
      if (i === 0 && j === 0 && aEsc > .5) continue;
      const na = (q * 2 - 1) * (.5 + d.kn[(id + 33) & 4095] * 1.5);
      let a = (snap ? na * resorte(age, 3.1, .32) : 0) + Math.sin(t * 58 + q * 40) * .13 * tiembla * (snap ? 0 : 1) + Math.sin(t * 1.4 + q * 30) * .09;
      if (i === 0 && j === 0) a = .36;
      const es = snap && Math.abs(na) > 1.05;
      let x = 540 + i * e, y = 960 + j * e;
      const dm = Math.hypot(i * e, j * e) / 1200;
      const nace = smooth((aMuro * 1.5 - dm) * 2.4) * sstep(600, 690, y);
      if (nace <= .01) continue;
      const kk = clamp(imp * (1.15 - dm * .3));
      x = lerp(x, 540, kk); y = lerp(y, 960, kk);
      const rr = r * (1 - kk * .86) * nace;
      (es ? disA : dis).moveTo(x + rr, y); (es ? disA : dis).arc(x, y, rr, 0, 6.3);
      (es ? punA : pun).moveTo(x + Math.sin(a) * rr * .24, y - Math.cos(a) * rr * .24); (es ? punA : pun).lineTo(x + Math.sin(a) * rr * .84, y - Math.cos(a) * rr * .84);
    }
    c.lineCap = "round";
    c.fillStyle = "#CFCBC1"; c.fill(dis); c.fillStyle = ACENTO; c.fill(disA);
    c.strokeStyle = NOCHE; c.lineWidth = Math.max(3, e * .085); c.stroke(pun); c.strokeStyle = LUZ; c.stroke(punA);
    if (snap && age < .34) { c.fillStyle = `rgba(237,234,227,${.2 * (1 - age / .34)})`; c.fillRect(0, 0, 1080, 1920); }
  }
  c.restore();
  rotulo(c, t, t0.todas, t0.jalon + .3, "para todas", 300, 150, LUZ);
  rotulo(c, t, t0.mismo, t0.jalon + .3, "al mismo tiempo", 460, 118, LUZ, true);
  rotulo(c, t, t0.jalon, t0.dasun - .4, "de un solo", 300, 136, LUZ);
  rotulo(c, t, t0.jalon2 - .02, t0.dasun - .4, "jalón", 470, 190, ACENTO, true);
}

// ---------- cámara ----------
const V = (yaw: number, pitch: number, dist: number): Vista => ({ tx: 0, ty: 0, tz: 0, yaw, pitch, dist });
const CLAVES: { t: number; v: Vista; dur?: number; curva?: (x: number) => number }[] = [
  { t: 0, v: V(-.34, .9, 13.4) },
  { t: t0.comb, v: V(-.2, .9, 12.6), dur: 2.4 },
  { t: t0.donde1, v: V(-.05, .78, 16), dur: 1.7 },
  { t: t0.donde2, v: V(.12, .94, 13), dur: 1.4 },
  { t: t0.tu - .1, v: V(.3, .92, 12), dur: 1.1 },
  { t: t0.noche - .02, v: V(.52, .98, 9.4), dur: .02 },
  { t: t0.niebla, v: V(-.38, .9, 11.6), dur: t0.quienes - t0.niebla, curva: ease.inOutSine },
  { t: t0.quienes - .2, v: V(-.5, .94, 5.6), dur: 2.4 },
  { t: t0.dasun - .05, v: V(-.44, .96, 10.8), dur: .02 },
  { t: t0.dasun, v: V(.22, .92, 10.4), dur: t0.situs - t0.dasun, curva: ease.inOutSine },
  { t: t0.situs - .1, v: V(.34, .88, 10.2), dur: t0.largos - t0.situs, curva: ease.inOutSine },
  { t: t0.largos, v: V(-.04, .84, 14), dur: 1.1 },
  { t: t0.salta - .1, v: V(.02, .8, 17.5), dur: .9 },
  { t: t0.acabas - .55, v: V(.16, .82, 15), dur: .8 },
  { t: t0.tamano - .2, v: V(.26, .96, 12), dur: 1.2 },
  { t: t0.elegirlo - .2, v: V(-.16, .98, 11.4), dur: t0.todo - t0.elegirlo, curva: ease.inOutSine },
  { t: t0.todo, v: V(.3, 1.02, 11), dur: 1.5 },
  { t: t0.asi + .05, v: V(.42, 1.26, 150), dur: 2.5 },
  { t: t0.ninguna - .7, v: V(1.02, 1.26, 136), dur: t0.nosabe + .35 - t0.ninguna + .7, curva: ease.inOutSine },
  { t: t0.nosabe + .35, v: V(.14, .96, 10.6), dur: 2.0 },
  { t: t0.solo + .3, v: V(-.2, .96, 10.2), dur: 4.2, curva: ease.inOutSine },
];

function vista(t: number): Vista {
  const v = guionCamara(t, CLAVES);
  return { ...v, yaw: v.yaw + Math.sin(t * .37) * .05 + Math.sin(t * .23 + 1) * .035, dist: v.dist * (1 + Math.sin(t * .29) * .025), pitch: v.pitch + Math.sin(t * .31 + 2) * .012 };
}

// ---------- el mundo ----------
function radio(t: number) {
  if (t < t0.dasun - .05) return ease.outCubic(prog(t, t0.niebla - .7, t0.niebla + 1.2)) * 4.7 * (1 - smooth(prog(t, t0.quienes + .15, t0.constru + .3)) * .97);
  let R = 4.7 * ease.outExpo(prog(t, t0.dasun - .05, t0.dasun + .6));
  R *= lerp(1, .78, smooth(prog(t, t0.salta - .2, t0.salta + .3)) * (1 - smooth(prog(t, t0.acabas - .2, t0.acabas + .4))));
  R *= lerp(1, .86, smooth(prog(t, t0.solo - .3, t0.solo + .6)));
  R *= 1 - smooth(prog(t, t0.abajo + .5, t0.dur - .7));
  return R;
}

function luzDe(t: number, d: D, f: number, dia: number): Luz {
  const x = d.bx[f], y = d.by[f];
  const L: Luz = { x, y, z: d.gz[f], R: radio(t), dia, ecos: [], pings: [], t };
  if (dia) return L;
  // En ladera el lado de arriba recibe más luz y parece que la bola se sale del charco: se compensa.
  const ki = (clamp((y - GMIN) / GP, 1, GN - 2) | 0) * GN + (clamp((x - GMIN) / GP, 1, GN - 2) | 0);
  // Mientras nadie ve, la luz busca: se estira hacia un lado y otro y solo encuentra niebla.
  const bus = smooth(prog(t, t0.nover - .3, t0.nover + .4)) * (1 - smooth(prog(t, t0.quienes, t0.constru)));
  if (bus > 0) { const e = t - t0.nover; L.x += Math.sin(e * 1.45) * 1.5 * bus; L.y += Math.sin(e * .97 + 1) * 1 * bus; }
  const kL = clamp(L.R / 3.2);
  L.x -= d.Ax[ki] * 1.7 * kL; L.y -= (d.Ay[ki] * 1.7 - .35) * kL;
  // Lo que dejas atrás se apaga despacio: las curvas se pierden.
  for (let i = d.hu.length - 1; i >= 0; i--) {
    const h = d.hu[i], e = t - h.t;
    if (e < 0) continue;
    if (e > 3.2) break;
    if (L.ecos.length < 3 && e > .02) L.ecos.push({ x: h.p[0], y: h.p[1], R: L.R * .9, a: .62 * (1 - e / 3.2) ** 1.5 });
  }
  const ping = (x: number, y: number, ti: number, a = .85) => {
    const e = t - ti;
    if (e > 0 && e < 1.5) L.pings.push({ x, y, r: 1 + e * 5.2, a: a * (1 - e / 1.5) ** 2 });
  };
  for (const h of d.hu) if (t >= h.t && t - h.t < 1.5 && (h.t < t0.cortos || (h.t > t0.acabas - .4 && h.t < t0.acabas + .4))) ping(h.p[0], h.p[1], h.t, .7);
  ping(x, y, t0.sentir + .14, .9);
  ping(x, y, t0.dasun - .02, 1);
  return L;
}

function mundo(c: CanvasRenderingContext2D, t: number, d: D, dia: number) {
  const f = Math.min(d.bx.length - 1, Math.round(t * FPS));
  const v0 = vista(t);
  const v: Vista = { ...v0, tx: d.cx[f], ty: d.cy[f], tz: d.cz[f] };
  const sac = (ti: number, a: number, k = 8) => { const e = t - ti; return e > 0 && e < 1 ? a * Math.exp(-e * k) : 0; };
  const fz = sac(t0.largo[0] + t0.largo[1], 30, 6) + sac(t0.hop1[0] + t0.hop1[1], 9) + sac(t0.hop2[0] + t0.hop2[1], 8) + sac(t0.ultimo[0] + t0.ultimo[1], 10) + sac(t0.noche, 0);
  const cam = camara(v, 566 + Math.sin(t * 67) * fz * .6, 930 + Math.cos(t * 53) * fz);
  const L = luzDe(t, d, f, dia), amp = AMP(t);
  suelo(c, d, cam, L, amp, f);
  return { cam, L, amp, f };
}

// Rejilla del suelo plano, antes de que el error le dé relieve. Sale de la bola al caer.
function rejilla(c: CanvasRenderingContext2D, cam: Cam, t: number, d: D, f: number, amp: number) {
  const tImp = t0.comb - .78 + Math.sqrt(2 * 5.2 / 26);
  const a0 = smooth(prog(t, tImp, tImp + .5)) * (1 - smooth(prog(t, t0.grande - .1, t0.montana)));
  if (a0 <= 0) return;
  const bx = d.bx[f], by = d.by[f], ol = (t - tImp) * 15;
  const sp = 2;
  const pa = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
  const lado = 10;
  const tira = (xa: number, ya: number, xb: number, yb: number) => {
    const n = 12;
    for (let i = 0; i < n; i++) {
      const u = i / n, w = (i + 1) / n, x0 = lerp(xa, xb, u), y0 = lerp(ya, yb, u), x1 = lerp(xa, xb, w), y1 = lerp(ya, yb, w);
      const di = Math.hypot((x0 + x1) / 2 - bx, (y0 + y1) / 2 - by), q = sstep(8.6, 4, di) * sstep(ol, ol - 2.5, di);
      if (q < .05) continue;
      const P = cam.p(x0, y0, hg(d, x0, y0) * amp), Q = cam.p(x1, y1, hg(d, x1, y1) * amp);
      if (P && Q) { const b = pa[Math.min(3, Math.floor(q * 4))]; b.moveTo(P.x, P.y); b.lineTo(Q.x, Q.y); }
    }
  };
  const X0 = Math.floor(bx / sp) * sp, Y0 = Math.floor(by / sp) * sp;
  for (let k = -5; k <= 5; k++) { tira(X0 + k * sp, Y0 - lado, X0 + k * sp, Y0 + lado); tira(X0 - lado, Y0 + k * sp, X0 + lado, Y0 + k * sp); }
  c.lineCap = "round"; c.lineWidth = 2;
  pa.forEach((p, i) => { c.strokeStyle = `rgba(17,17,17,${a0 * (i + 1) * .15})`; c.stroke(p); });
}

function motas(c: CanvasRenderingContext2D, cam: Cam, t: number, d: D, L: Luz) {
  if (L.R < .3 || cam.v.dist > 40) return;
  for (const m of d.motas) {
    const x = L.x - 7.5 + (((m.x + t * m.vx - L.x) % 15) + 15) % 15, y = L.y - 7.5 + (((m.y + t * m.vy - L.y) % 15) + 15) % 15;
    const z = L.z + m.z + Math.sin(t * .6 + m.f) * .3;
    const p = cam.p(x, y, z); if (!p) continue;
    const v = sstep(L.R * 1.5, L.R * .5, Math.hypot(x - L.x, y - L.y)); if (v < .04) continue;
    const r = clamp(p.s * .022, 1.4, 4.2);
    c.fillStyle = v > .62 ? `rgba(17,17,17,${v * .34})` : `rgba(237,234,227,${v * .55})`;
    c.beginPath(); c.arc(p.x, p.y, r, 0, 6.3); c.fill();
  }
}

/** Niebla delante de la cámara: mantos lentos, cada uno con su periodo. */
function nieblaFrente(c: CanvasRenderingContext2D, t: number, fuerza: number) {
  if (fuerza <= .01) return;
  const M: [number, number, number, number, number][] = [[900, 1230, .0], [760, 610, 1.7], [1020, 1060, 3.1], [640, 780, 4.4]].map(([r, y, f], i) => [r, y, f, 19 + i * 7, i % 2 ? -1 : 1]);
  for (const [r, y, f, per, sg] of M) {
    const x = 540 + sg * Math.sin(t / per * 6.283 + f) * 520, yy = y + Math.sin(t * .21 + f) * 70;
    const g = c.createRadialGradient(x, yy, 0, x, yy, r);
    g.addColorStop(0, `rgba(196,192,184,${.055 * fuerza})`); g.addColorStop(.5, `rgba(170,166,158,${.02 * fuerza})`); g.addColorStop(1, "rgba(150,146,140,0)");
    c.fillStyle = g; c.fillRect(0, 0, 1080, 1920);
  }
}

function linternas(c: CanvasRenderingContext2D, cam: Cam, t: number, d: D) {
  if (t < t0.casi - .6 || t > t0.solo + .4) return;
  c.save(); c.globalCompositeOperation = "lighter";
  const dt = .24;
  const ini = t0.casi - .4;
  for (const l of d.lin) {
    const a = smooth(prog(t, l.nace, l.nace + .5)) * (1 - smooth(prog(t, l.apaga, l.apaga + .26)));
    if (a <= .01) continue;
    const u = Math.max(0, (t - ini) / dt + l.fase * 9);
    const n = l.pts.length / 3, i = Math.min(n - 2, Math.floor(u)), fr = u >= n - 1 ? 1 : u - i;
    const k = i * 3, ex = fr * fr * (3 - 2 * fr);
    const x = lerp(l.pts[k], l.pts[k + 3], ex), y = lerp(l.pts[k + 1], l.pts[k + 4], ex), z = lerp(l.pts[k + 2], l.pts[k + 5], ex) + Math.sin(fr * Math.PI) * .9;
    const p = cam.p(x, y, z); if (!p || p.x < -40 || p.x > 1120 || p.y < -40 || p.y > 1960) continue;
    const m = sstep(490, 760, p.y) ** 1.5 * sstep(1780, 1420, p.y);     // las franjas de texto quedan limpias
    if (m <= .01) continue;
    // Las huellas que deja: tres puntos que se apagan.
    c.globalAlpha = a * m * .3; c.fillStyle = "#C0442A";
    for (let b = 1; b <= 3; b++) {
      const q = (i - b * 2) * 3; if (q < 0) break;
      const P = cam.p(l.pts[q], l.pts[q + 1], l.pts[q + 2]); if (P) c.fillRect(P.x - 1.5, P.y - 1.5, 3, 3);
    }
    const s = clamp(p.s * 6.6, 26, 96) * l.tam;
    c.globalAlpha = a * m;
    c.drawImage(d.sprite, p.x - s / 2, p.y - s / 2, s, s);
  }
  c.restore();
}

// ---------- el video ----------
function dibuja(c: CanvasRenderingContext2D, t: number, d: D) {
  // ---------- los pies y el muro de noche son mundos aparte ----------
  if (t >= t0.pero - .02 && t < t0.lomejor + .1) { c.fillStyle = NOCHE; c.fillRect(0, 0, 1080, 1920); escenaPies(c, t); return; }
  if (t >= t0.lomejor + .1 && t < t0.dasun - .05) { muroNoche(c, t, d); return; }

  const finMuro = t0.mejor + 1.3, enDia = t < t0.noche;
  if (t < t0.mejor + .55) {
    muroDia(c, t, d, true);
    if (t >= t0.mejor + .02) dosPerillas(c, t, d, Math.round(t * FPS));
    textoMuro(c, t);
    return;
  }

  const { cam, L, amp, f } = mundo(c, t, d, enDia ? 1 : 0);
  if (enDia) rejilla(c, cam, t, d, f, amp);
  curvasTerreno(c, d, cam, L, amp);

  // ---------- la bola ----------
  const tCae = t0.comb - .78, Rb = .56;
  if (!enDia || t >= tCae) {
    const x = d.bx[f], y = d.by[f]; let g = d.gz[f], z = d.bz[f];
    if (t < t0.comb + .1) { const q = caida(t - tCae, 5.2, .42, 26); z = q.z; g = 0; }
    if (enDia) bolaEn(c, cam, x, y, g, z, Rb, 0);
  }

  if (enDia) {
    if (t < finMuro) muroDia(c, t, d, false);
    dia(c, t, d, cam, f);
    return;
  }

  // ---------- noche ----------
  if (t < t0.noche_e + .34) return;                                    // el negro del corte
  motasYBola(c, t, d, cam, L, f);
  noche(c, t, d, cam, f);
}

function motasYBola(c: CanvasRenderingContext2D, t: number, d: D, cam: Cam, L: Luz, f: number) {
  // Huellas de la bola: brasas en el suelo, en el único color que importa.
  if (t >= t0.dasun) for (const h of d.hu) {
    const e = t - h.t; if (e < 0 || e > 6) continue;
    const p = cam.p(h.p[0], h.p[1], hg(d, h.p[0], h.p[1]));
    if (p && cam.v.dist < 50) { c.fillStyle = ACENTO; c.globalAlpha = (1 - e / 6) ** 1.4 * .95; c.beginPath(); c.arc(p.x, p.y, 8.5, 0, 6.3); c.fill(); c.globalAlpha = 1; }
  }
  motas(c, cam, t, d, L);
  const rim = 1 - sstep(.4, 2.4, L.R);
  const vuelo = d.bz[f] - d.gz[f];
  if (vuelo > 1) {                                                      // en el aire no la alumbra el suelo: lleva su propio halo
    const p = cam.p(d.bx[f], d.by[f], d.bz[f] + .5);
    if (p) { const r = p.s * 2.4, g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, r); g.addColorStop(0, `rgba(244,232,212,${.34 * clamp(vuelo / 2)})`); g.addColorStop(1, "rgba(244,232,212,0)"); c.fillStyle = g; c.fillRect(p.x - r, p.y - r, r * 2, r * 2); }
  }
  if (cam.v.dist < 60) bolaEn(c, cam, d.bx[f], d.by[f], d.gz[f], d.bz[f], .56, Math.max(rim, vuelo > 1 ? 1 : 0));
  nieblaFrente(c, t, smooth(prog(t, t0.niebla - .4, t0.niebla + .8)) * lerp(1, .5, smooth(prog(cam.v.dist, 20, 60))));
}

/** Las dos perillas que sobreviven al muro: cada combinación es un lugar. Mueven la bola de verdad, una en cada eje. */
function dosPerillas(c: CanvasRenderingContext2D, t: number, d: D, f: number) {
  const kIni = t0.mejor + .02, ap = ease.inOutCubic(prog(t, kIni, t0.esto + .1));
  const K: P2[] = [[lerp(540, 330, ap), lerp(960, 286, ap)], [lerp(618, 750, ap), lerp(960, 286, ap)]];
  const r = lerp(28.8, 104, ap);
  const a0 = (d.by[f] - P0[1]) * .52 - 1.4, a1 = (d.bx[f] - P0[0]) * .46 - .7;
  perilla(c, K[0][0], K[0][1], r, a0 + Math.sin(t * 1.1) * .01, false, TINTA, smooth(prog(ap, .4, .9)));
  perilla(c, K[1][0], K[1][1], r, a1, false, TINTA, smooth(prog(ap, .4, .9)));
  const manda = (k: P2, ini: number, fin: number) => {
    const a = smooth(prog(t, ini, ini + .15)) * (1 - smooth(prog(t, fin - .15, fin)));
    if (a > 0) { c.save(); c.globalAlpha = a; c.strokeStyle = ACENTO; c.lineWidth = 8; c.beginPath(); c.arc(k[0], k[1], r * 1.52, 0, 6.3); c.stroke(); c.restore(); }
  };
  manda(K[0], t0.comb + .1, t0.lugar - .1);
  manda(K[1], t0.lugar + .02, t0.donde1 - .3);
}

function dia(c: CanvasRenderingContext2D, t: number, d: D, cam: Cam, f: number) {
  dosPerillas(c, t, d, f);
  const am = AMP(t), h = d.gz[f] / ZE, aBar = smooth(prog(t, t0.donde1 + .1, t0.grande));
  barra(c, Math.max(h, 0) * (am > 0 ? 1 : 0), aBar, null, 0);
  rotulo(c, t, t0.lugar + .04, t0.donde1 - .12, "un lugar", 1520, 150, TINTA, true);
  rotulo(c, t, t0.montana - .02, t0.donde2 - .1, "montaña", 1520, 170, TINTA, true);
  rotulo(c, t, t0.valle1 - .04, t0.tu - .1, "valle", 1520, 170, TINTA, true);
  // «tú»: la voz te mete al terreno.
  const aT = smooth(prog(t, t0.tu + .72, t0.tu + .9));
  if (aT > 0) {
    const s = cam.p(d.bx[f], d.by[f], d.bz[f] + 1.2);
    const gt = c.createRadialGradient(540, 520, 30, 540, 520, 200);
    gt.addColorStop(0, `rgba(244,242,236,${aT})`); gt.addColorStop(.55, `rgba(244,242,236,${aT * .92})`); gt.addColorStop(1, "rgba(244,242,236,0)");
    c.fillStyle = gt; c.fillRect(340, 320, 400, 400);
    texto(c, "tú", 540, 560, { fuente: serif(150, true), color: ACENTO, alfa: aT });
    if (s) {
      const k = ease.outCubic(prog(t, t0.ahi - .25, t0.ahi + .1));
      c.save(); c.globalAlpha = aT; c.strokeStyle = ACENTO; c.lineWidth = 6; c.lineCap = "round"; c.setLineDash([3, 18]);
      c.beginPath(); c.moveTo(540, 600); c.lineTo(lerp(540, s.x, k), lerp(600, s.y, k)); c.stroke(); c.restore();
    }
  }
}

function noche(c: CanvasRenderingContext2D, t: number, d: D, cam: Cam, f: number) {
  const pre = t < t0.dasun;
  const h = errorEn(t, d);
  // ---------- nadie lo ve ----------
  rotulo(c, t, t0.nover, t0.nadie - .1, "No ves el valle.", 330, 112, LUZ);
  rotulo(c, t, t0.nadie, t0.maquina - .14, "Nadie lo ve.", 330, 134, LUZ);
  rotulo(c, t, t0.maquina, t0.quienes - .08, "Ni la máquina,", 330, 112, LUZ);
  rotulo(c, t, t0.quienes, t0.constru + .08, "ni quienes", 300, 112, LUZ);
  rotulo(c, t, t0.quienes + .24, t0.constru + .08, "la construyeron.", 424, 112, LUZ);
  if (pre) return;

  // ---------- pasos ----------
  const pa = smooth(prog(t, t0.dasun + .1, t0.dasun + .5)) * (1 - smooth(prog(t, t0.asi + .2, t0.asi + 1)));
  const yaLargo = t >= t0.largo[0] + t0.largo[1] - .05;
  barra(c, h, pa, H(d.Q[0], d.Q[1]), yaLargo ? smooth(prog(t, t0.arriba - .4, t0.arriba)) * (1 - smooth(prog(t, t0.tamano - .3, t0.tamano))) : 0);

  // Preview del paso: un arco punteado de donde estás a donde caerías.
  const previa = (ti: number, tf: number, a: P2, b: P2, alto: number) => {
    const ka = ease.outCubic(prog(t, ti, ti + .34)) * (1 - smooth(prog(t, tf - .03, tf + .05)));
    if (ka > 0) arco(c, cam, a, b, hg(d, a[0], a[1]), hg(d, b[0], b[1]), alto, ka, ACENTO);
  };
  previa(t0.dasun + .12, t0.hop1[0], S, d.hu[0].p, 1.05);
  previa(t0.otro - .3, t0.hop2[0], d.hu[0].p, d.hu[1].p, 1.0);
  previa(t0.largos + .1, t0.largo[0], d.Q, d.L, 6.2);
  const uL = prog(t, t0.largo[0], t0.largo[0] + t0.largo[1]);          // la estela del brinco se queda colgada en el aire
  if (uL > 0 && t < t0.tamano) {
    const aE = 1 - smooth(prog(t, t0.arriba + .2, t0.tamano - .2));
    c.save(); c.globalAlpha = aE; arco(c, cam, d.Q, d.L, hg(d, d.Q[0], d.Q[1]), hg(d, d.L[0], d.L[1]), 6.2, uL, ACENTO, 7, [2, 20]); c.restore();
  }

  rotulo(c, t, t0.dasun + .05, t0.vuelves - .1, "Un paso", 330, 124, LUZ);
  rotulo(c, t, t0.abajo1 - .02, t0.vuelves - .1, "hacia abajo", 472, 124, ACENTO, true);
  rotulo(c, t, t0.sentir - .02, t0.otro - .16, "sientes el suelo", 330, 116, LUZ, true);
  rotulo(c, t, t0.otro, t0.situs - .2, "Otro paso", 330, 124, LUZ);
  rotulo(c, t, t0.cortos - .04, t0.nunca - .08, "muy cortos", 330, 134, LUZ, true);
  rotulo(c, t, t0.nunca, t0.largos - .16, "nunca llegas", 330, 134, LUZ);
  rotulo(c, t, t0.largos + .35, t0.brincas - .16, "muy largos", 300, 134, ACENTO, true);
  // El valle: lo cruzas sin tocarlo. Lo único que llegas a ver de él.
  rotulo(c, t, t0.brincas - .02, t0.acabas - .1, "te brincas el valle", 320, 112, LUZ, true);
  const tV = t0.largo[0] + t0.largo[1] * .39, kV = prog(t, tV - .5, tV + .5);
  if (kV > 0 && kV < 1) {
    const p = cam.p(-.5, -.39, hg(d, -.5, -.39));
    if (p) {
      for (let i = 0; i < 3; i++) {
        const q = (kV * 2.4 + i * .33) % 1;
        c.save(); c.globalAlpha = (1 - q) * .75 * Math.sin(kV * Math.PI); c.strokeStyle = ACENTO; c.lineWidth = 5;
        c.beginPath(); c.ellipse(p.x, p.y, 30 + q * 150, (30 + q * 150) * Math.sin(cam.v.pitch), 0, 0, 6.3); c.stroke(); c.restore();
      }
    }
  }
  rotulo(c, t, t0.arriba - .02, t0.tamano - .2, "más arriba", 300, 150, LUZ);
  rotulo(c, t, t0.arriba + .5, t0.tamano - .2, "que antes", 444, 118, ACENTO, true);

  // ---------- la perilla que eliges tú ----------
  const aK = smooth(prog(t, t0.tamano + .05, t0.tamano + .4)) * (1 - smooth(prog(t, t0.todo - .3, t0.todo)));
  if (aK > 0) {
    const onda = Math.sin((t - t0.tamano) * 2.1) * .5 * Math.exp(-Math.max(0, t - t0.arte) * 1.6);
    const seg = t < t0.elegirlo ? Math.sin((t - t0.tamano) * 2.6) * 1.15 : onda + Math.sin((t - t0.elegirlo) * 7.3) * .14 * Math.exp(-(t - t0.elegirlo) * .9);
    const eta = 3.2 * Math.exp(seg * 1.05);
    const a = d.L, g = grad(a), b: P2 = [a[0] - eta * g[0], a[1] - eta * g[1]];
    arco(c, cam, a, b, hg(d, a[0], a[1]), hg(d, b[0], b[1]), .34 * Math.hypot(a[0] - b[0], a[1] - b[1]), aK, ACENTO, 10, [2, 24]);
    const pb = cam.p(b[0], b[1], hg(d, b[0], b[1]) + .35);
    if (pb) { c.save(); c.globalAlpha = aK; c.strokeStyle = ACENTO; c.lineWidth = 7; c.beginPath(); c.ellipse(pb.x, pb.y, pb.s * .5, pb.s * .5 * Math.sin(cam.v.pitch), 0, 0, 6.3); c.stroke(); c.restore(); }
    c.save(); c.globalAlpha = aK;
    perilla(c, 540, 1442, 92, seg * 1.1, false, LUZ, 1);
    c.restore();
    c.save(); c.globalAlpha = aK; c.strokeStyle = "rgba(237,234,227,.9)"; c.lineWidth = 3; c.beginPath(); c.arc(540, 1442, 92, 0, 6.3); c.stroke(); c.restore();
  }
  rotulo(c, t, t0.tasa - .04, t0.todo - .28, "tasa de aprendizaje", 330, 116, ACENTO, true);
  rotulo(c, t, t0.arte - .02, t0.todo - .28, "algo de arte", 470, 110, LUZ);

  // ---------- el nombre ----------
  rotulo(c, t, t0.descenso - .05, t0.asi + .2, "descenso", 300, 150, ACENTO, true);
  rotulo(c, t, t0.descenso + .34, t0.asi + .2, "de gradiente", 446, 124, ACENTO, true);

  // ---------- linternas ----------
  linternas(c, cam, t, d);
  rotulo(c, t, t0.casi - .02, t0.ninguna - .14, "casi todas", 330, 150, LUZ, true);
  rotulo(c, t, t0.ninguna + .05, t0.nosabe - .14, "Ninguna", 300, 136, LUZ);
  rotulo(c, t, t0.mapa - .5, t0.nosabe - .14, "ha visto el mapa", 444, 112, LUZ, true);
  rotulo(c, t, t0.nosabe, t0.solo - .3, "Ninguna sabe", 300, 124, LUZ);
  rotulo(c, t, t0.nosabe + .4, t0.solo - .3, "a dónde va", 438, 124, LUZ, true);

  // ---------- final: se lee hacia abajo, y la bola queda en medio ----------
  if (t >= t0.solo - .05) {
    const finF = 1 - smooth(prog(t, t0.dur - .55, t0.dur - .08));
    const zz = 1 + (t - t0.solo) * .006;
    c.save(); c.translate(540, 420); c.scale(zz, zz);
    texto(c, "Solo sabe", 0, -50, { fuente: serif(134), color: LUZ, alfa: smooth(prog(t, t0.solo - .04, t0.solo + .16)) * finF });
    texto(c, "dónde es", 0, 90, { fuente: serif(134), color: LUZ, alfa: smooth(prog(t, t0.dondees - .04, t0.dondees + .16)) * finF });
    c.restore();
    const q = caida(t - (t0.abajo - .05), 1.05, .4, 26);
    const yA = 1500 - q.z * 95;
    texto(c, "abajo", 540, yA, { fuente: serif(232, true), color: ACENTO, alfa: smooth(prog(t, t0.abajo - .02, t0.abajo + .06)) * finF });
  }
}

export const Pieza: React.FC = () => <Lienzo dibuja={dibuja} preparar={preparar} />;
