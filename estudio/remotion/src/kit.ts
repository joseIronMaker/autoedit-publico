// Herramientas de animación. NO son plantillas: cada pieza es código propio y usa de aquí
// solo lo que le sirva. Todo es función pura del tiempo: el mismo t da el mismo cuadro.

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const prog = (t: number, a: number, b: number) => clamp((t - a) / Math.max(b - a, 1e-6));
export const smooth = (x: number) => { const k = clamp(x); return k * k * (3 - 2 * k); };
export const smoother = (x: number) => { const k = clamp(x); return k * k * k * (k * (k * 6 - 15) + 10); };

export const ease = {
  outCubic: (x: number) => 1 - (1 - clamp(x)) ** 3,
  inCubic: (x: number) => clamp(x) ** 3,
  inOutCubic: (x: number) => { const k = clamp(x); return k < .5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2; },
  outExpo: (x: number) => { const k = clamp(x); return k >= 1 ? 1 : 1 - 2 ** (-10 * k); },
  inOutSine: (x: number) => -(Math.cos(Math.PI * clamp(x)) - 1) / 2,
  outBack: (x: number, s = 1.70158) => { const k = clamp(x) - 1; return 1 + (s + 1) * k ** 3 + s * k ** 2; },
};

/** Resorte subamortiguado analítico: arranca en 0, llega a 1 y rebota un poco. */
export function resorte(age: number, freq = 5.5, amort = .42) {
  if (age <= 0) return 0;
  const w = 2 * Math.PI * freq * .4;
  const wd = w * Math.sqrt(Math.max(1 - amort * amort, .01));
  return 1 - Math.exp(-amort * w * age) * (Math.cos(wd * age) + (amort * w / wd) * Math.sin(wd * age));
}

/** Altura de una bola que cae desde h y rebota. Devuelve también los instantes de impacto. */
export function caida(age: number, h: number, rest = .46, g = 30) {
  const impactos: number[] = [];
  let t0 = Math.sqrt(2 * h / g);
  impactos.push(t0);
  if (age < 0) return { z: h, impactos };
  if (age < t0) return { z: h - .5 * g * age * age, impactos };
  let v = Math.sqrt(2 * g * h) * rest;
  for (let i = 0; i < 7; i++) {
    const dur = 2 * v / g;
    if (age < t0 + dur) { const a = age - t0; return { z: v * a - .5 * g * a * a, impactos }; }
    t0 += dur; impactos.push(t0); v *= rest;
  }
  return { z: 0, impactos };
}

export function azar(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---------- cámara ----------
export type Vista = { tx: number; ty: number; tz: number; yaw: number; pitch: number; dist: number };
export type Cam = ReturnType<typeof camara>;

/** yaw y pitch en radianes; pitch=π/2 es cenital. (cx, cy) es dónde cae el objetivo en pantalla. */
export function camara(v: Vista, cx = 540, cy = 880, f = 1250) {
  const p = Math.min(v.pitch, 1.5533);
  const fh = [-Math.sin(v.yaw), Math.cos(v.yaw)];
  const pos = [v.tx - v.dist * Math.cos(p) * fh[0], v.ty - v.dist * Math.cos(p) * fh[1], v.tz + v.dist * Math.sin(p)];
  const fw = [Math.cos(p) * fh[0], Math.cos(p) * fh[1], -Math.sin(p)];
  const r = [Math.cos(v.yaw), Math.sin(v.yaw), 0];
  const u = [r[1] * fw[2] - r[2] * fw[1], r[2] * fw[0] - r[0] * fw[2], r[0] * fw[1] - r[1] * fw[0]];
  return {
    v, f, cx, cy, pos,
    p(x: number, y: number, z = 0) {
      const dx = x - pos[0], dy = y - pos[1], dz = z - pos[2];
      const zc = dx * fw[0] + dy * fw[1] + dz * fw[2];
      if (zc < .25) return null;
      const s = f / zc;
      return { x: cx + (dx * r[0] + dy * r[1] + dz * r[2]) * s, y: cy - (dx * u[0] + dy * u[1] + dz * u[2]) * s, s, zc };
    },
  };
}

export function mezclaVista(a: Vista, b: Vista, k: number): Vista {
  return { tx: lerp(a.tx, b.tx, k), ty: lerp(a.ty, b.ty, k), tz: lerp(a.tz, b.tz, k), yaw: lerp(a.yaw, b.yaw, k),
    pitch: lerp(a.pitch, b.pitch, k), dist: a.dist * (b.dist / a.dist) ** k };
}

/** Recorre una lista de [tiempo, vista] sin paradas secas: cada tramo con su propia curva. */
export function guionCamara(t: number, claves: { t: number; v: Vista; dur?: number; curva?: (x: number) => number }[]) {
  let act = claves[0].v;
  for (let i = 1; i < claves.length; i++) {
    const c = claves[i];
    const d = c.dur ?? 1.4;
    if (t < c.t) break;
    act = mezclaVista(act, c.v, (c.curva ?? ease.inOutCubic)(prog(t, c.t, c.t + d)));
  }
  return act;
}

// ---------- campo y curvas de nivel ----------
export type Fuente = { x: number; y: number; a: number; s: number };

/** Curvas de nivel por marching squares sobre una malla anclada al MUNDO (no tiembla al mover la cámara). */
export function curvas(ctx: CanvasRenderingContext2D, cam: Cam, fuentes: Fuente[], o: {
  x0: number; x1: number; y0: number; y1: number; paso: number; niveles: number[]; hundir?: number;
  tinta: (nivel: number, i: number, prof: number) => string; grosor?: (i: number) => number;
}) {
  const p = o.paso;
  const ix0 = Math.floor(o.x0 / p), ix1 = Math.ceil(o.x1 / p), iy0 = Math.floor(o.y0 / p), iy1 = Math.ceil(o.y1 / p);
  const nx = ix1 - ix0 + 1, ny = iy1 - iy0 + 1;
  if (nx < 2 || ny < 2 || nx * ny > 900000) return;
  const f = new Float32Array(nx * ny);
  for (const s of fuentes) {
    if (s.a <= .001) continue;
    const r = s.s * 3.2, inv = 1 / (2 * s.s * s.s);
    const a0 = Math.max(0, Math.floor((s.x - r) / p) - ix0), a1 = Math.min(nx - 1, Math.ceil((s.x + r) / p) - ix0);
    const b0 = Math.max(0, Math.floor((s.y - r) / p) - iy0), b1 = Math.min(ny - 1, Math.ceil((s.y + r) / p) - iy0);
    for (let j = b0; j <= b1; j++) {
      const dy = (j + iy0) * p - s.y;
      for (let i = a0; i <= a1; i++) {
        const dx = (i + ix0) * p - s.x;
        f[j * nx + i] += s.a * Math.exp(-(dx * dx + dy * dy) * inv);
      }
    }
  }
  const h = o.hundir ?? 0;
  o.niveles.forEach((L, n) => {
    ctx.beginPath();
    const z = -L * h;
    const seg = (ax: number, ay: number, bx: number, by: number) => {
      const A = cam.p(ax, ay, z), B = cam.p(bx, by, z);
      if (A && B) { ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); }
    };
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const a = f[j * nx + i], b = f[j * nx + i + 1], c = f[(j + 1) * nx + i + 1], d = f[(j + 1) * nx + i];
      const m = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (d > L ? 1 : 0);
      if (m === 0 || m === 15) continue;
      const X = (i + ix0) * p, Y = (j + iy0) * p;
      const T: [number, number] = [X + p * (L - a) / (b - a), Y];
      const R: [number, number] = [X + p, Y + p * (L - b) / (c - b)];
      const U: [number, number] = [X + p * (L - d) / (c - d), Y + p];
      const I: [number, number] = [X, Y + p * (L - a) / (d - a)];
      const lin = (P: [number, number], Q: [number, number]) => seg(P[0], P[1], Q[0], Q[1]);
      switch (m) {
        case 1: case 14: lin(I, U); break;
        case 2: case 13: lin(U, R); break;
        case 3: case 12: lin(I, R); break;
        case 4: case 11: lin(T, R); break;
        case 6: case 9: lin(T, U); break;
        case 7: case 8: lin(I, T); break;
        case 5: lin(I, T); lin(U, R); break;
        case 10: lin(T, R); lin(I, U); break;
      }
    }
    ctx.strokeStyle = o.tinta(L, n, 0);
    ctx.lineWidth = o.grosor ? o.grosor(n) : 1.3;
    ctx.stroke();
  });
}

// ---------- texto ----------
export function texto(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, o: {
  fuente: string; color: string; alfa?: number; alin?: CanvasTextAlign; base?: CanvasTextBaseline; esp?: number;
}) {
  if ((o.alfa ?? 1) <= .003) return;
  ctx.save();
  ctx.globalAlpha = o.alfa ?? 1;
  ctx.font = o.fuente;
  ctx.fillStyle = o.color;
  ctx.textAlign = o.alin ?? "center";
  ctx.textBaseline = o.base ?? "alphabetic";
  // @ts-ignore letterSpacing existe en Chrome
  if (o.esp !== undefined) ctx.letterSpacing = `${o.esp}px`;
  ctx.fillText(s, x, y);
  ctx.restore();
}

/** Puntos dentro de un texto rasterizado: sirven para disolverlo en partículas. */
export function muestreaTexto(s: string, fuente: string, ancho: number, alto: number, n: number, seed = 7) {
  const c = document.createElement("canvas");
  c.width = ancho; c.height = alto;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.font = fuente; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#000";
  g.fillText(s, ancho / 2, alto / 2);
  const d = g.getImageData(0, 0, ancho, alto).data;
  const llenos: [number, number][] = [];
  for (let y = 0; y < alto; y += 2) for (let x = 0; x < ancho; x += 2) if (d[(y * ancho + x) * 4 + 3] > 128) llenos.push([x - ancho / 2, y - alto / 2]);
  const r = azar(seed), out: [number, number][] = [];
  for (let i = 0; i < n && llenos.length; i++) out.push(llenos[Math.floor(r() * llenos.length)]);
  return out;
}
