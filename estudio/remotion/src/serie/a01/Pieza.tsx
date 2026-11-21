// Serie 2, capítulo 1. Una bola en un frasco no alcanza un interruptor. Le salen manos, rompe el
// vidrio y apaga la luz: el corte a negro del giro es la acción misma del agente.
import React from "react";
import { azar, clamp, ease, lerp, prog, smooth, texto } from "../../kit";
import { ACENTO, bola, cue, GRIS, Lienzo, LUZ, mono, NOCHE, PAPEL, rotulo, serif, sombra, TINTA } from "../../marca";
import { brazo } from "../../personaje";
import palabras from "./palabras.json";
import duracion from "./duracion.json";

export const DURACION = duracion.dur;
const T = cue(palabras);
const s = (f: string) => T(f).s, e = (f: string) => T(f).e;

const t0 = {
  apagar: s("apagar la luz"), explica: s("puede explicarte"), codigo: s("puede escribirte"), hacerlo: s("pero no puede"), todo: s("todo lo que vimos"), texto: s("texto"),
  caja: s("adivina la siguiente"), encerrada: s("encerrada en una caja"), dos: s("ahora hazle"), manos: s("dale manos"), manosF: e("dale manos"), herr: s("herramientas"), buscar: s("buscar en internet"),
  leer: s("leer un archivo"), mandar: s("mandar un mensaje"), segundo: s("segundo"), ver: s("déjala ver"), sigue: e("qué sigue"), eso: s("eso es un agente"), modelo: s("un modelo de lenguaje"),
  vueltas: s("dando vueltas"), conH: s("con herramientas"), nuevo: s("no es un modelo nuevo"), mismo: s("es el mismo"), permiso: s("con permiso"), dif: s("y esa diferencia"), chat: s("si un chatbot"),
  decides: s("y tú decides"), agente: s("si un agente"), hizo: s("ya lo hizo"), mensaje: s("ya mandó"), archivo: s("ya borró"), encargo: s("por eso en esta"), fiesta: s("organizar la fiesta"),
  lovamos: s("y lo vamos"), fallar: s("fallar"), trampa: s("hacer trampa"), porque: s("porque la máquina"), hacer: s("ya aprendió"), fin: e("hacer cosas"),
};
const tOff = t0.sigue - .02, tOn = t0.nuevo - .1, tOff2 = t0.fin + .1;          // cuándo cambia la luz del cuarto
const luzEn = (t: number) => (t >= tOff2 ? 0 : t >= tOff && t < tOn ? 0 : 1);

const GOLPES = [.34, 1.34, 2.3];
function dGolpeDe(t: number) { const u = [...GOLPES, t0.hacerlo + .12].filter((g) => t >= g); return u.length ? t - u[u.length - 1] : 9; }
const INT = { x: 858, y: 700 };                       // interruptor de la pared
const JARRO = { x: 330, y: 965, w: 470, h: 650 };
const PISO = 1290, RB = 90;

// ---------- piezas ----------
function foco(c: CanvasRenderingContext2D, t: number, enc: boolean) {
  const dg = dGolpeDe(t), a = Math.sin(t * 2.6) * .075 * (1 + Math.exp(-Math.max(t - tOff, 0) * 2) * (t > tOff ? 2.6 : 0) + (t < t0.manosF ? 3 * Math.exp(-dg * 1.6) : 0));
  const L = 130, x = 860 + Math.sin(a) * L, y = -20 + Math.cos(a) * L;
  c.strokeStyle = enc ? TINTA : "#3a3a38"; c.lineWidth = 4; c.beginPath(); c.moveTo(860, -20); c.lineTo(x, y); c.stroke();
  c.fillStyle = enc ? TINTA : "#2a2a28"; c.fillRect(x - 21, y - 8, 42, 36);
  if (enc) {
    const g = c.createRadialGradient(x, y + 62, 10, x, y + 62, 760);
    g.addColorStop(0, "rgba(255,226,160,.5)"); g.addColorStop(.3, "rgba(255,232,190,.14)"); g.addColorStop(1, "rgba(255,232,190,0)");
    c.fillStyle = g; c.fillRect(-60, -60, 1200, 2040);
  }
  const b = c.createRadialGradient(x - 10, y + 50, 4, x, y + 64, 52);
  if (enc) { b.addColorStop(0, "#fff"); b.addColorStop(.6, "#FFE8AE"); b.addColorStop(1, "#E9B85C"); } else { b.addColorStop(0, "#54534f"); b.addColorStop(1, "#191918"); }
  c.fillStyle = b; c.beginPath(); c.arc(x, y + 64, 48, 0, 7); c.fill();
}
function apagador(c: CanvasRenderingContext2D, x: number, y: number, abajo: number, oscuro: boolean, z = 1) {
  c.save(); c.translate(x, y); c.scale(z, z);
  c.fillStyle = oscuro ? "#1b1b1a" : "#FFFFFF"; c.strokeStyle = oscuro ? "#55544f" : "rgba(17,17,17,.75)"; c.lineWidth = 4;
  c.beginPath(); c.roundRect(-74, -118, 148, 236, 14); c.fill(); c.stroke();
  c.fillStyle = oscuro ? "#0c0c0c" : "#E3E0D8"; c.fillRect(-30, -62, 60, 124);
  const k = lerp(-1, 1, abajo);
  c.fillStyle = oscuro ? "#6c6a64" : "#FBFAF6"; c.strokeStyle = oscuro ? "#8a8880" : TINTA; c.lineWidth = 3;
  c.beginPath(); c.roundRect(-28, -60 + (k > 0 ? 58 : 0), 56, 62, 6); c.fill(); c.stroke();
  c.fillStyle = oscuro ? "#55544f" : GRIS; c.beginPath(); c.arc(0, -96, 7, 0, 7); c.arc(0, 96, 7, 0, 7); c.fill();
  c.restore();
}
/** Vidrio: reflejos, cuello y tapa. El grosor del trazo lo da la luz, no una caja dibujada. */
function frasco(c: CanvasRenderingContext2D, J: typeof JARRO, t: number, tapa: number, sacude: number, giro = 0, dx = 0) {
  c.save(); c.translate(J.x + dx, J.y + J.h / 2); c.rotate(giro); c.translate(sacude * Math.sin(t * 46) * 7, -J.h / 2);
  c.fillStyle = "rgba(190,205,205,.16)"; c.strokeStyle = TINTA; c.lineWidth = 6;
  c.beginPath(); c.roundRect(-J.w / 2, -J.h / 2, J.w, J.h, 64); c.fill(); c.stroke();
  const g = c.createLinearGradient(-J.w / 2, 0, -J.w / 2 + 90, 0); g.addColorStop(0, "rgba(255,255,255,.65)"); g.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = g; c.beginPath(); c.roundRect(-J.w / 2 + 16, -J.h / 2 + 40, 78, J.h - 80, 42); c.fill();
  c.fillStyle = TINTA; c.beginPath(); c.roundRect(-J.w / 2 + 36, -J.h / 2 - 54 - (1 - tapa) * 90, J.w - 72, 52, 12); c.fill();
  c.fillStyle = PAPEL; for (let i = 0; i < 7; i++) c.fillRect(-J.w / 2 + 62 + i * 49, -J.h / 2 - 44 - (1 - tapa) * 90, 8, 32);
  c.restore();
}
function lupa(c: CanvasRenderingContext2D, x: number, y: number, a: number) { c.save(); c.translate(x, y); c.globalAlpha *= a; c.strokeStyle = TINTA; c.lineWidth = 11; c.lineCap = "round"; c.beginPath(); c.arc(0, -8, 44, 0, 7); c.stroke(); c.beginPath(); c.moveTo(32, 26); c.lineTo(74, 72); c.stroke(); c.restore(); }
function hoja(c: CanvasRenderingContext2D, x: number, y: number, a: number) { c.save(); c.translate(x, y); c.globalAlpha *= a; c.fillStyle = "#fff"; c.strokeStyle = TINTA; c.lineWidth = 6; c.beginPath(); c.moveTo(-46, -62); c.lineTo(22, -62); c.lineTo(46, -36); c.lineTo(46, 62); c.lineTo(-46, 62); c.closePath(); c.fill(); c.stroke(); c.fillStyle = TINTA; for (let i = 0; i < 4; i++) c.fillRect(-28, -20 + i * 20, 56 - i * 6, 6); c.restore(); }
function sobre(c: CanvasRenderingContext2D, x: number, y: number, a: number, g = 0) { c.save(); c.translate(x, y); c.rotate(g); c.globalAlpha *= a; c.fillStyle = "#fff"; c.strokeStyle = TINTA; c.lineWidth = 6; c.beginPath(); c.rect(-66, -44, 132, 88); c.fill(); c.stroke(); c.beginPath(); c.moveTo(-66, -44); c.lineTo(0, 12); c.lineTo(66, -44); c.stroke(); c.restore(); }

function polvoPapel(c: CanvasRenderingContext2D, t: number, color: string, alfa: number) {
  const r = azar(9);
  c.fillStyle = color;
  for (let i = 0; i < 70; i++) {
    const x0 = r() * 1200 - 60, y0 = r() * 2060, v = 16 + r() * 46, f = r() * 6.3, z = 1.6 + r() * 3.4;
    const y = ((y0 - t * v) % 2060 + 2060) % 2060 - 70, x = x0 + Math.sin(t * .55 + f) * 34;
    c.globalAlpha = alfa * (.08 + r() * .18); c.fillRect(x, y, z, z);
  }
  c.globalAlpha = 1;
}

/** Los trozos de vidrio: física simple, misma semilla, el mismo golpe siempre. */
function vidrios(c: CanvasRenderingContext2D, t: number) {
  const a = t - t0.manosF; if (a < 0 || a > 2.2) return;
  const r = azar(77);
  c.strokeStyle = TINTA; c.lineWidth = 3;
  for (let i = 0; i < 46; i++) {
    const ang = r() * 6.28, v = 300 + r() * 760, gi = (r() - .5) * 9, tam = 18 + r() * 42, y0 = -JARRO.h / 2 + r() * JARRO.h, x0 = (r() - .5) * JARRO.w;
    const x = JARRO.x + x0 + Math.cos(ang) * v * a, y = JARRO.y + y0 + Math.sin(ang) * v * a + 1500 * a * a;
    c.save(); c.translate(x, y); c.rotate(gi * a); c.globalAlpha = 1 - smooth(prog(a, 1.1, 2.1));
    c.fillStyle = "rgba(200,214,214,.55)"; c.beginPath(); c.moveTo(-tam, -tam * .4); c.lineTo(tam * .6, -tam); c.lineTo(tam, tam * .6); c.closePath(); c.fill(); c.stroke(); c.restore();
  }
  c.globalAlpha = 1;
}

function dibuja(c: CanvasRenderingContext2D, t: number) {
  const encendida = luzEn(t) === 1;
  const fondo = encendida ? PAPEL : NOCHE, tinta = encendida ? TINTA : LUZ;
  c.fillStyle = fondo; c.fillRect(0, 0, 1080, 1920);
  // Un latigazo de cámara cuando cambia la luz; la respiración, siempre.
  const g = t >= tOff ? Math.exp(-(t - tOff) * 7) * 16 : 0;
  const dG = dGolpeDe(t), punch = t < t0.manosF && dG < .5 ? Math.exp(-dG * 9) : 0;
  const z = 1.035 + .016 * Math.sin(t * .83) + .05 * punch;
  c.save(); c.translate(540 + 11 * Math.sin(t * .71) + g * Math.sin(t * 90) + 16 * punch * Math.sin(t * 80), 900 + 13 * Math.cos(t * .61) + 12 * punch * Math.cos(t * 67)); c.rotate(.005 * Math.sin(t * .47)); c.scale(z, z); c.translate(-540, -900);
  escena(c, t, encendida, tinta);
  c.restore();
}

function escena(c: CanvasRenderingContext2D, t: number, enc: boolean, ink: string) {
  c.fillStyle = enc ? PAPEL : NOCHE; c.fillRect(-60, -60, 1200, 2040);
  polvoPapel(c, t, ink, 1);
  const verAgente = t < t0.dif - .1 || t >= t0.porque - .1;
  if (verAgente) foco(c, t, enc);

  // ---------- el piso ----------
  const yP = PISO;
  if (verAgente) { c.strokeStyle = enc ? "rgba(17,17,17,.3)" : "rgba(236,233,226,.14)"; c.lineWidth = 3; c.beginPath(); c.moveTo(-60, yP); c.lineTo(1140, yP); c.stroke(); }

  const sw = t >= tOff2 - .12 ? 1 : t >= tOn ? 0 : smooth(prog(t, tOff - .08, tOff));
  if (verAgente) apagador(c, INT.x, INT.y, sw, !enc, 1.32);

  // ---------- frasco ----------
  const roto = t >= t0.manosF;
  const dGolpe = dGolpeDe(t);
  if (!roto) {
    const J = JARRO;
    const tapa = 1 - ease.outBack(prog(t, t0.encerrada, t0.encerrada + .4)) * 0 ;
    // La bola toma impulso y embiste el vidrio hacia el interruptor. El frasco acusa cada golpe.
    const giro = dGolpe < 1.2 ? .075 * Math.exp(-dGolpe * 3.2) * Math.cos(dGolpe * 13) : 0;
    const dxJ = dGolpe < 1.2 ? 30 * Math.exp(-dGolpe * 3.4) : 0;
    const carga = t < GOLPES[0] ? 1 - t / GOLPES[0] : Math.sin(Math.PI * clamp(dGolpe / 1)) ** 1.1;
    const quieto = smooth(prog(t, 2.9, t0.todo));
    const bxG = J.x + 118 + dxJ - 250 * carga * (1 - quieto);
    const bxF = lerp(bxG, J.x, smooth(prog(t, t0.todo - .2, t0.caja)));
    const by = J.y + J.h / 2 - RB - 10 - Math.abs(Math.sin(Math.min(dGolpe, 2) * 7)) * 120 * Math.exp(-dGolpe * 2.2) * (1 - quieto * .4) - Math.abs(Math.sin(t * 1.9)) * 10;
    frasco(c, J, t, 1, dGolpe < .3 ? 1 - dGolpe / .3 : 0, giro, dxJ);
    // letras: lo único que produce
    const aL = smooth(prog(t, t0.todo + .2, t0.texto + .1)) * (1 - smooth(prog(t, t0.manos - .4, t0.manos)));
    if (aL > 0) {
      const r = azar(14);
      c.save(); c.beginPath(); c.roundRect(J.x - J.w / 2 + 8, J.y - J.h / 2 + 8, J.w - 16, J.h - 16, 56); c.clip();
      const ABC = "abcdefghilmnopqrstuvyáéó";
      for (let i = 0; i < 190; i++) {
        const rad = 40 + r() * 240, f = r() * 6.28, v = (r() - .5) * 1.5, ch = ABC[Math.floor(r() * ABC.length)];
        const a = f + t * v * (1 + aL), x = J.x + Math.cos(a) * rad * 1.05, y = J.y + Math.sin(a * 1.2) * rad * 1.55;
        texto(c, ch, x, y, { fuente: serif(52 + (i % 3) * 16, i % 2 === 0), color: TINTA, alfa: aL * lerp(.3, .9, r()) });
      }
      c.restore();
    }
    sombra(c, bxF, J.y + J.h / 2 - 6, 120, .3);
    bola(c, bxF, by, RB);
    texto(c, "ChatGPT", J.x + dxJ, J.y - 60, { fuente: serif(92, true), color: TINTA, alfa: (1 - smooth(prog(t, t0.todo, t0.todo + .4))) * .86 });
    // grietas: aparecen justo antes de romperse
    const gr = smooth(prog(t, t0.manos - .1, t0.manosF));
    if (gr > 0) {
      c.strokeStyle = TINTA; c.lineWidth = 3; const r2 = azar(31);
      for (let i = 0; i < 12; i++) {
        let x = J.x, y = by, a = r2() * 6.28; c.beginPath(); c.moveTo(x, y);
        for (let k = 0; k < 5; k++) { a += (r2() - .5) * 1; x += Math.cos(a) * 90 * gr; y += Math.sin(a) * 90 * gr; c.lineTo(x, y); }
        c.stroke();
      }
    }
  }
  vidrios(c, t);

  // ---------- lo que sí puede hacer: escribir ----------
  rotulo(c, t, t0.explica, t0.hacerlo - .05, "explicarte cómo", 420, 96, TINTA, true);
  const linea = (s2: string, tt: number, y: number, fu: string) => {
    const a = smooth(prog(t, tt, tt + .2));
    const cae = t >= t0.hacerlo ? 1500 * (t - t0.hacerlo) ** 2 : 0;
    if (a > 0 && cae < 1400) texto(c, s2, 776, y + cae, { fuente: fu, color: TINTA, alfa: a });
  };
  linea("1. Levántate", t0.explica + .1, 950, serif(58)); linea("2. Camina", t0.explica + .3, 1018, serif(58)); linea("3. Aprieta", t0.explica + .5, 1086, serif(58));
  linea("luz.apagar()", t0.codigo + .1, 1180, mono(42));
  rotulo(c, t, t0.hacerlo, t0.todo - .1, "no puede hacerlo", 420, 124, ACENTO, true);
  rotulo(c, t, t0.todo + .1, t0.dos - .2, "solo produce", 290, 92, TINTA);
  rotulo(c, t, t0.texto, t0.dos - .2, "texto", 440, 170, ACENTO, true);
  rotulo(c, t, t0.caja, t0.dos - .2, "encerrada en una caja", 1450, 88, TINTA, true);
  rotulo(c, t, t0.dos, t0.manos - .1, "dos cambios", 420, 136);

  // ---------- la bola con manos ----------
  if (roto && verAgente) {
    const salto = t - t0.manosF;
    const pisoB = PISO - RB - 4;
    const yb = lerp(JARRO.y + JARRO.h / 2 - RB - 10, pisoB, ease.outBack(prog(salto, 0, .5), 1.1)) - Math.abs(Math.sin(salto * 4)) * 90 * Math.exp(-salto * 1.6);
    const xb = lerp(JARRO.x, 400, smooth(prog(salto, 0, .6)));
    const bx = xb + Math.sin(t * 2.3) * 12, by = yb + Math.sin(t * 3.1) * 8;
    const luzB = enc ? TINTA : LUZ;
    const brota = ease.outBack(prog(t, t0.manos - .05, t0.manosF + .25), 1.2);
    // destinos de cada mano: herramientas, luego el interruptor
    const hx1a = bx - 170 + Math.sin(t * 1.9) * 22, hy1a = by - 370 + Math.cos(t * 2.3) * 20;
    const hx2a = bx + 300 + Math.cos(t * 2.1) * 20, hy2a = by - 90 + Math.sin(t * 1.7) * 20;
    const alcanza = smooth(prog(t, t0.ver + .4, tOff - .05));
    const regresa = t >= tOff ? 1 : 0;
    const hx2 = t >= tOff2 - .6 ? lerp(hx2a, INT.x - 80, smooth(prog(t, tOff2 - .6, tOff2 - .15))) : lerp(hx2a, INT.x - 80, Math.max(alcanza * (1 - regresa), 0) + (t >= tOn - .4 && t < tOn + .3 ? 1 : 0));
    const hy2 = t >= tOff2 - .6 ? lerp(hy2a, INT.y - 30, smooth(prog(t, tOff2 - .6, tOff2 - .15))) : lerp(hy2a, INT.y + (t < tOff ? -50 : 30), Math.max(alcanza * (1 - regresa), 0) + (t >= tOn - .4 && t < tOn + .3 ? 1 : 0));
        brazo(c, bx - 54, by - 50, hx1a, hy1a, 90, .5 + .35 * Math.sin(t * 2.4), luzB, brota);
    brazo(c, bx + 60, by - 30, hx2, hy2, -100, t >= tOff - .05 ? .1 : .6, luzB, brota);
    if (enc) { sombra(c, bx, yP + 6, 150, .3); bola(c, bx, by, RB); } else { c.fillStyle = NOCHE; c.beginPath(); c.arc(bx, by, RB, 0, 7); c.fill(); c.strokeStyle = LUZ; c.lineWidth = 5; c.stroke(); }
    // herramientas: cada palabra aparece con su objeto
    if (t < t0.segundo + .2) {
      const aT = (tt: number) => smooth(prog(t, tt, tt + .16)) * (1 - smooth(prog(t, t0.segundo - .1, t0.segundo + .2)));
      lupa(c, hx1a + 60, hy1a - 100, aT(t0.buscar));
      hoja(c, 150, 1110 + Math.sin(t * 2) * 12, aT(t0.leer));
      sobre(c, hx2a + 110, hy2a + 40, aT(t0.mandar), -.12);
      rotulo(c, t, t0.manos, t0.herr - .1, "manos", 440, 190, ACENTO, true);
      rotulo(c, t, t0.herr, t0.segundo - .1, "herramientas", 440, 138, TINTA, true);
    }
    // ver qué pasó: un rayo punteado que va al interruptor y al foco
    const aV = smooth(prog(t, t0.ver, t0.ver + .3)) * (t < tOff ? 1 : 0);
    if (aV > 0) {
      c.save(); c.globalAlpha = aV; c.strokeStyle = ACENTO; c.lineWidth = 4; c.setLineDash([3, 16]); c.lineCap = "round"; c.lineDashOffset = -t * 90;
      c.beginPath(); c.moveTo(bx + 40, by - 70); c.lineTo(INT.x - 100, INT.y + 40); c.moveTo(bx + 20, by - 90); c.lineTo(830, 200); c.stroke(); c.restore();
      rotulo(c, t, t0.ver, tOff - .08, "ver qué pasó", 1450, 110, ACENTO, true);
    }
  }

  // ---------- oscuridad: el agente ----------
  if (!enc && t < tOn) {
    rotulo(c, t, t0.eso, t0.modelo - .3, "Eso es un agente.", 1460, 118, LUZ);
    if (t >= t0.modelo - .02) {
      const aM = smooth(prog(t, t0.modelo - .02, t0.modelo + .12));
      texto(c, "modelo de lenguaje", 540, 1400, { fuente: serif(84), color: LUZ, alfa: aM });
      const aV = smooth(prog(t, t0.vueltas, t0.vueltas + .15));
      if (aV > 0) {
        texto(c, "+ vueltas", 540, 1490, { fuente: serif(84, true), color: "#E9896C", alfa: aV });
        c.save(); c.globalAlpha = aV; c.strokeStyle = "#E9896C"; c.lineWidth = 6; c.setLineDash([2, 24]); c.lineCap = "round"; c.lineDashOffset = -t * 120;
        c.beginPath(); c.ellipse(420, 1110, 250, 160, 0, 0, 7); c.stroke(); c.restore();
        const a = t * 3.1; bola(c, 420 + Math.cos(a) * 250, 1110 + Math.sin(a) * 160, 22, ACENTO);
      }
      const aH = smooth(prog(t, t0.conH, t0.conH + .15));
      if (aH > 0) texto(c, "+ herramientas", 540, 1578, { fuente: serif(84, true), color: LUZ, alfa: aH });
    }
  }

  // ---------- el mismo modelo, con permiso ----------
  if (t >= tOn && t < t0.dif - .1) {
    rotulo(c, t, t0.nuevo, t0.mismo - .1, "no es un modelo nuevo", 1470, 92, TINTA, true);
    const k = ease.outBack(prog(t, t0.permiso, t0.permiso + .35), 2);
    if (k > 0) {
      c.save(); c.translate(540, 1470); c.rotate(-.05); c.scale(lerp(1.7, 1, clamp(k)), lerp(1.7, 1, clamp(k))); c.globalAlpha = clamp(k);
      c.strokeStyle = ACENTO; c.lineWidth = 7; c.beginPath(); c.roundRect(-370, -70, 740, 124, 10); c.stroke();
      texto(c, "PERMISO PARA ACTUAR", 0, 18, { fuente: mono(54), color: ACENTO }); c.restore();
    }
  }

  // ---------- la diferencia ----------
  if (t >= t0.dif - .1 && t < t0.encargo) {
    const sale = 1 - smooth(prog(t, t0.encargo - .3, t0.encargo));
    if (t < t0.chat - .05) rotulo(c, t, t0.dif, t0.chat - .15, "lo cambia todo", 860, 170, TINTA, true);
    const aC = smooth(prog(t, t0.chat, t0.chat + .2)) * sale;
    const baja = smooth(prog(t, t0.agente - .1, t0.agente + .3));
    if (aC > 0) {
      c.save(); c.globalAlpha = aC * lerp(1, .42, baja);
      texto(c, "chatbot", 540, 280, { fuente: serif(104), color: TINTA });
      c.fillStyle = "#fff"; c.strokeStyle = TINTA; c.lineWidth = 6; c.beginPath(); c.roundRect(110, 340, 860, 190, 46); c.fill(); c.stroke();
      c.fillStyle = "#fff"; c.beginPath(); c.moveTo(200, 526); c.lineTo(170, 590); c.lineTo(280, 526); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = "#fff"; c.fillRect(205, 518, 70, 14);
      texto(c, "respuesta mala", 540, 462, { fuente: serif(100, true), color: TINTA });
      c.restore();
      const b = smooth(prog(t, t0.decides, t0.decides + .24));
      if (b > 0) texto(c, "tú decides", 650, 640, { fuente: serif(100, true), color: ACENTO, alfa: aC * b * lerp(1, .42, baja) });
    }
    const aA = smooth(prog(t, t0.agente, t0.agente + .2)) * sale;
    if (aA > 0) {
      const yA = 800;
      texto(c, "agente", 540, yA, { fuente: serif(104), color: TINTA, alfa: aA });
      texto(c, "ya lo hizo", 540, yA + 170, { fuente: serif(186, true), color: ACENTO, alfa: aA * smooth(prog(t, t0.hizo, t0.hizo + .12)) });
      const am = smooth(prog(t, t0.mensaje, t0.mensaje + .1));
      const bx = 300, by = 1360 + Math.sin(t * 3) * 8;
      c.save(); c.globalAlpha = aA; sombra(c, bx, 1466, 110, .22); bola(c, bx, by, 74);
      const v = Math.max(t - t0.mensaje, 0), lanza = 1 - Math.exp(-v * 7);
      brazo(c, bx + 50, by - 30, bx + 200 + lanza * 110, by - 150, -50, .8, TINTA);
      c.restore();
      if (am > 0) {
        sobre(c, bx + 340 + v * 640, by - 200 - v * 100 + Math.sin(v * 7) * 18, am * (1 - smooth(prog(v, .85, 1.2))) * sale, -.14 + v * .3);
        texto(c, "ya mandó el mensaje", 540, 1560, { fuente: serif(74, true), color: TINTA, alfa: am * sale * (1 - smooth(prog(t, t0.archivo - .1, t0.archivo + .1))) });
      }
      const af = smooth(prog(t, t0.archivo, t0.archivo + .1));
      if (af > 0) {
        const w = t - t0.archivo, r = azar(3);
        for (let i = 0; i < 30; i++) {
          const ax = (r() - .5) * 200, ay = (r() - .5) * 240, vx = (r() - .5) * 640, g2 = 900 + r() * 500;
          c.save(); c.globalAlpha = (1 - smooth(prog(w, .4, 1.1))) * sale; c.fillStyle = "#fff"; c.strokeStyle = TINTA; c.lineWidth = 3;
          c.translate(740 + ax + vx * w, 1370 + ay + g2 * w * w); c.rotate(w * (i - 15) * .4); c.fillRect(-20, -26, 40, 52); c.strokeRect(-20, -26, 40, 52); c.restore();
        }
        texto(c, "ya borró el archivo", 540, 1560, { fuente: serif(74, true), color: TINTA, alfa: af * sale });
      }
    }
  }

  // ---------- el encargo ----------
  if (t >= t0.encargo - .1 && t < t0.porque) {
    const a = smooth(prog(t, t0.encargo - .1, t0.encargo + .2)) * (1 - smooth(prog(t, t0.porque - .3, t0.porque)));
    const r = azar(5);
    const conf = smooth(prog(t, t0.fiesta + .2, t0.fiesta + .5));
    for (let i = 0; i < 120 && conf > 0; i++) {
      const x0 = r() * 1140 - 30, v = 180 + r() * 340, f = r() * 6.3, col = i % 4 === 0 ? ACENTO : TINTA;
      const y = ((r() * 2000 + (t - t0.fiesta) * v) % 2000) - 60, x = x0 + Math.sin(t * 2 + f) * 34;
      if (y < 600) continue;
      c.save(); c.translate(x, y); c.rotate(t * 3 + f); c.globalAlpha = a * conf * .7; c.fillStyle = col; c.fillRect(-9, -5, 18, 10); c.restore();
    }
    c.globalAlpha = 1;
    const by = 1120 + Math.abs(Math.sin(t * 5)) * -92;
    sombra(c, 540, 1226, 140, .3 * a);
    c.save(); c.globalAlpha = a; bola(c, 540, by, 96);
    // gorro de fiesta
    c.fillStyle = ACENTO; c.beginPath(); c.moveTo(456, by - 62); c.lineTo(566, by - 240); c.lineTo(614, by - 56); c.closePath(); c.fill();
    c.fillStyle = TINTA; c.beginPath(); c.arc(566, by - 244, 19, 0, 7); c.fill();
    brazo(c, 476, by - 10, 230, by - 200 + Math.sin(t * 7) * 40, 60, .75, TINTA);
    brazo(c, 604, by - 10, 850, by - 200 - Math.sin(t * 7) * 40, -60, .75, TINTA);
    c.restore();
    rotulo(c, t, t0.encargo, t0.fiesta - .1, "tu encargo", 420, 136);
    rotulo(c, t, t0.fiesta, t0.lovamos - .1, "la fiesta sorpresa", 380, 122, ACENTO, true);
    rotulo(c, t, t0.fiesta + .3, t0.lovamos - .1, "de tu mamá", 510, 122, ACENTO, true);
    rotulo(c, t, t0.lovamos, t0.fallar - .05, "funcionar", 440, 150, TINTA, true);
    rotulo(c, t, t0.fallar, t0.trampa - .05, "fallar", 440, 150, TINTA, true);
    rotulo(c, t, t0.trampa, t0.porque - .15, "y hacer trampa", 440, 136, ACENTO, true);
  }

  // ---------- cierre: vuelve al interruptor y apaga ----------
  if (t >= t0.porque - .1 && enc) {
    rotulo(c, t, t0.porque, t0.fin + .1, "la máquina que aprendió a hablar", 1420, 72, TINTA);
    rotulo(c, t, t0.hacer, t0.fin + .1, "ya aprendió a hacer cosas", 1530, 88, ACENTO, true);
  }
}

export const Pieza: React.FC = () => <Lienzo dibuja={(c, t) => dibuja(c, t)} preparar={() => ({})} />;
