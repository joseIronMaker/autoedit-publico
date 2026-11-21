// El agente de la serie 2: la bola de la serie 1, ahora con brazos de hule y manos de tres dedos.
// Vive aquí para que un cambio de diseño llegue a todos los capítulos sin tocar sus animaciones.
import { lerp } from "./kit";
import { bola, sombra, TINTA } from "./marca";

/** doblez: curva del brazo. abre: 0 puño, 1 mano abierta. largo: 0-1, para que brote. */
export function brazo(c: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, doblez: number, abre: number, color = TINTA, largo = 1, grueso = 1) {
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1;
  const hx = lerp(x0, x1, largo), hy = lerp(y0, y1, largo);
  const cx = mx - dy / d * doblez, cy = my + dx / d * doblez;
  c.strokeStyle = color; c.lineWidth = 17 * grueso; c.lineCap = "round";
  c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(cx, cy, hx, hy); c.stroke();
  const a = Math.atan2(hy - cy, hx - cx);
  for (const k of [-1, 0, 1]) {
    const ab = a + k * lerp(.26, .86, abre), l = (k === 0 ? 50 : 42) * grueso;
    c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + Math.cos(ab) * l, hy + Math.sin(ab) * l); c.stroke();
  }
  c.fillStyle = color; c.beginPath(); c.arc(hx, hy, 25 * grueso, 0, 7); c.fill();
}

/** La bola completa, de pie sobre un piso. mano1 y mano2 son a dónde apunta cada mano. */
export function agente(c: CanvasRenderingContext2D, x: number, y: number, r: number, mano1: [number, number], mano2: [number, number], o: { abre1?: number; abre2?: number; piso?: number; sombra?: number } = {}) {
  const g = r / 90;
  if (o.piso !== undefined) sombra(c, x, o.piso, 150 * g, o.sombra ?? .3);
  brazo(c, x - 54 * g, y - 50 * g, mano1[0], mano1[1], 90 * g, o.abre1 ?? .6, TINTA, 1, g);
  brazo(c, x + 60 * g, y - 30 * g, mano2[0], mano2[1], -100 * g, o.abre2 ?? .6, TINTA, 1, g);
  bola(c, x, y, r);
}
