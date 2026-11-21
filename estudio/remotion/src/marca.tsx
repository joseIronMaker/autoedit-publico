// La identidad del canal: colores, tipografía y lienzo. Lo demás lo inventa cada pieza.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as cargaSerif } from "@remotion/google-fonts/InstrumentSerif";
import { loadFont as cargaMono } from "@remotion/google-fonts/JetBrainsMono";
import { Cam, ease, prog, smooth, texto } from "./kit";

const { fontFamily: SERIF, waitUntilDone: listoA } = cargaSerif("normal", { subsets: ["latin"] });
const { waitUntilDone: listoB } = cargaSerif("italic", { subsets: ["latin"] });
const { fontFamily: MONO, waitUntilDone: listoC } = cargaMono("normal", { subsets: ["latin"], weights: ["400"] });

export const PAPEL = "#F4F2EC", TINTA = "#111111", GRIS = "#8C8A83", ACENTO = "#C0442A", NOCHE = "#09090A", LUZ = "#EDEAE3";
export const serif = (px: number, it = false) => `${it ? "italic " : ""}${px}px "${SERIF}"`;
export const mono = (px: number) => `${px}px "${MONO}"`;

export function bola(c: CanvasRenderingContext2D, x: number, y: number, r: number, tinte = TINTA) {
  const g = c.createRadialGradient(x - r * .34, y - r * .38, r * .05, x, y, r);
  if (tinte === TINTA) { g.addColorStop(0, "#5a5a59"); g.addColorStop(.42, "#1d1d1c"); g.addColorStop(1, "#050505"); }
  else { g.addColorStop(0, "#E9896C"); g.addColorStop(.5, tinte); g.addColorStop(1, "#7E2413"); }
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
}

export function sombra(c: CanvasRenderingContext2D, x: number, y: number, r: number, alfa: number) {
  if (alfa <= .01) return;
  c.save(); c.translate(x, y); c.scale(1, .36);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, `rgba(20,18,14,${alfa})`); g.addColorStop(1, "rgba(20,18,14,0)");
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill(); c.restore();
}

/** Bola en un mundo 3D: tamaño, altura y sombra de contacto salen de la cámara. */
export function bolaMundo(c: CanvasRenderingContext2D, cam: Cam, x: number, y: number, z: number, r: number, tinte = TINTA, alfa = 1) {
  const s = cam.p(x, y, 0), a = cam.p(x, y, z + r * .92);
  if (!s || !a) return;
  c.save(); c.globalAlpha = alfa;
  sombra(c, s.x, s.y, r * s.s * (2 + z * .55), .4 / (1 + z * 1.1));
  bola(c, a.x, a.y, r * a.s, tinte);
  c.restore();
}

export function flecha(c: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, color: string, g = 7, punta = 26) {
  const d = Math.hypot(bx - ax, by - ay); if (d < 2) return;
  const ux = (bx - ax) / d, uy = (by - ay) / d, pt = Math.min(punta, d * .6);
  c.strokeStyle = color; c.lineWidth = g; c.lineCap = "round";
  c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx - ux * pt * .7, by - uy * pt * .7); c.stroke();
  c.fillStyle = color; c.beginPath(); c.moveTo(bx, by);
  c.lineTo(bx - ux * pt - uy * pt * .52, by - uy * pt + ux * pt * .52);
  c.lineTo(bx - ux * pt + uy * pt * .52, by - uy * pt - ux * pt * .52); c.closePath(); c.fill();
}

export function anillo(c: CanvasRenderingContext2D, cam: Cam, x: number, y: number, r: number, color: string, alfa: number, g = 3) {
  if (alfa <= .01) return;
  c.save(); c.globalAlpha = alfa; c.strokeStyle = color; c.lineWidth = g; c.beginPath();
  for (let i = 0; i <= 56; i++) {
    const a = i / 56 * 6.2832, p = cam.p(x + Math.cos(a) * r, y + Math.sin(a) * r, 0);
    if (p) { if (i === 0) c.moveTo(p.x, p.y); else c.lineTo(p.x, p.y); }
  }
  c.stroke(); c.restore();
}

/** Texto que entra con la voz y se va solo. Las palabras clave viven en la animación. */
export function rotulo(c: CanvasRenderingContext2D, t: number, ini: number, fin: number, s: string, y: number, px: number, color = TINTA, it = false, x = 540) {
  const a = smooth(prog(t, ini - .04, ini + .14)) * (1 - smooth(prog(t, fin, fin + .22)));
  if (a > 0) texto(c, s, x, y + (1 - ease.outCubic(prog(t, ini - .04, ini + .3))) * 18, { fuente: serif(px, it), color, alfa: a });
}

/** Busca una frase del guion y da sus tiempos: `cue(palabras)("la frase").s`. */
export function cue(palabras: { w: string; s: number; e: number }[]) {
  const n = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9ñ]/g, "");
  const W = palabras.map((p) => n(p.w));
  return (frase: string, desde = 0) => {
    const q = frase.split(/\s+/).map(n).filter(Boolean);
    for (let i = desde; i <= W.length - q.length; i++) if (q.every((x, k) => W[i + k] === x)) return { s: palabras[i].s, e: palabras[i + q.length - 1].e, i };
    throw new Error(`Frase que no está en el guion: ${frase}`);
  };
}

/**
 * Lienzo de 1080×1920 con las fuentes ya cargadas.
 * `preparar` corre una vez (datos caros, muestreo de texto); `dibuja` es función pura de t.
 */
export function Lienzo<D>({ dibuja, preparar, fondo = PAPEL }: {
  dibuja: (c: CanvasRenderingContext2D, t: number, d: D) => void; preparar: () => D; fondo?: string;
}) {
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
  return <AbsoluteFill style={{ background: fondo }}><canvas ref={ref} width={1080} height={1920} style={{ width: 1080, height: 1920 }} /></AbsoluteFill>;
}
