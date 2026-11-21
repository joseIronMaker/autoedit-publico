import React from 'react';
import {Easing, interpolate, interpolateColors, spring} from 'remotion';
import {Theme} from '../theme';
import {ANTON} from '../fonts';

// ─────────────────────────────────────────────────────────────────────────────
// STAT — el ancla numérica del panel inferior.
//
// Hoy una cifra se cuenta con `bar` (una barra horizontal que no para a nadie) o
// escondida dentro de un `headline`. Aquí el número ES la escena: se CONSTRUYE en
// pantalla (sube desde 0, aterriza con rebote y se pinta del acento) y solo después
// llegan la etiqueta, el matiz y la comparación.
//
// Dos restricciones MEDIDAS del formato mandan sobre todo lo demás:
//  1) la banda útil son 528 px de alto (1026 − SUB_ZONE 168 − SAFE_BOTTOM 330) por
//     912 px de ancho (1080 − SAFE_RIGHT 104 − 64 de padding). Todo se dimensiona
//     con aritmética explícita contra ese presupuesto, nunca "a ojo": si el número
//     no cabe, se encoge él, no se recorta la etiqueta.
//  2) los paneles duran de 4 a 20 s y las animaciones se REPARTEN en
//     durationInFrames. Un contador que termina en el frame 20 de un panel de 500
//     deja 480 frames congelados — el bug que ya se pagó dos veces en este repo.
//
// El reparto de alto se hace ENTERO antes de dibujar (etiqueta → tarjeta → bloques →
// matiz → y el número se queda con lo que sobre) y CADA bloque de texto lleva además
// un clamp duro (maxHeight + overflow), porque una estimación de líneas no es una
// garantía: la primera versión de esto reservaba altos fijos y tres casos se salían.
// ─────────────────────────────────────────────────────────────────────────────

// Banda útil real del panel: 1026 − SUB_ZONE(168) − SAFE_BOTTOM(330) = 528 px de alto
// por 1080 − SAFE_RIGHT(104) − 64 de padding = 912 de ancho. El presupuesto de reparto
// va 20 px por debajo del alto real para que el peor caso deje aire arriba y abajo en vez
// de morder justo la costura de los subtítulos (ahí caben también los ±8 px del rebote,
// que es un transform y por tanto no ocupa layout pero sí se ve).
const MAX_H = 508;
const MAX_W = 912;
const MONO = 'JetBrains Mono, Consolas, monospace';
const SERIF = 'Georgia, serif';

export type StatSpec = {
  kind: 'stat';
  /** La cifra final. En 'reloj' son SEGUNDOS; en 'fraccion', cuántos se encienden. */
  value: number;
  /** Sufijo CORTO ("%", "MB", "veces"): lo largo va en `sub`, o el número se encoge para
   *  dejarle sitio. En 'fraccion' es el DENOMINADOR: "10" o "de cada 10". En 'reloj' se
   *  ignora si es una unidad de tiempo (el mm:ss ya dice que son segundos). */
  unit?: string;
  /** Qué mide la cifra. Una línea en ANTON; si no cabe legible, pasa a dos y se encoge. */
  label: string;
  /** Matiz opcional bajo la etiqueta; se revela palabra por palabra. */
  sub?: string;
  /** Segunda cifra de contraste; entra a la MITAD de la escena, nunca antes. */
  compare?: {value: number; label: string};
  style?: 'contador' | 'fraccion' | 'reloj';
};

// ── medidas de tipografía ───────────────────────────────────────────────────
// MEDIDAS en el Chrome del render (headless, sobre las fuentes que de verdad resuelve
// esta máquina), no a ojo:
//  · ANTON dígitos      0.478 em  → se reserva 0.56 a propósito: las cajas de <Digits>
//    son fijas y de ese ancho para que el contador no "baile" de lado cuando un 1 pasa
//    a ser un 8 (los dígitos de ANTON no son tabulares).
//  · ANTON mayúsculas   0.418–0.457 em/carácter → 0.47 para estimar, deja margen.
//  · SERIF: Georgia NO está instalada en la máquina de render, resuelve a Times New
//    Roman (~0.42 em). Se estima con 0.52 para aguantar también un sustituto ancho
//    (DejaVu Serif) sin que el bloque se salga en otra máquina.
//  · MONO: JetBrains tampoco está; resuelve a DejaVu Sans Mono, 0.635 em medido.
const ADV_ANTON = 0.56;
const ADV_LBL = 0.47;
const ADV_SERIF = 0.52;
const ADV_MONO = 0.65;
const advOf = (c: string, adv: number) =>
  /[0-9]/.test(c) ? adv : c === ':' ? adv * 0.42 : c === ',' || c === '.' ? adv * 0.46 : adv * 0.9;
const emWidth = (t: string, adv: number) => t.split('').reduce((w, c) => w + advOf(c, adv), 0);
/** Líneas que ocupa `txt` a `size` px dentro de `ancho`, con la métrica de arriba. */
const lineasDe = (txt: string, size: number, adv: number, ancho: number) =>
  Math.max(1, Math.ceil(txt.length / Math.max(6, ancho / (size * adv))));

// Separador de miles a mano: `toLocaleString` depende del locale del proceso que
// renderiza y el render tiene que ser idéntico frame a frame y máquina a máquina.
const fmt = (n: number, dec: number): string => {
  const neg = n < 0;
  const [ent, frac] = Math.abs(n).toFixed(dec).split('.');
  const miles = ent.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${neg ? '-' : ''}${miles}${frac ? `.${frac}` : ''}`;
};
const decimalsOf = (n: number) => Math.min(2, (String(n).split('.')[1] ?? '').length);

const clock = (secs: number): string => {
  const s = Math.max(0, Math.floor(secs));
  const dos = (x: number) => String(x).padStart(2, '0');
  const h = Math.floor(s / 3600);
  return h > 0 ? `${h}:${dos(Math.floor((s % 3600) / 60))}:${dos(s % 60)}` : `${Math.floor(s / 60)}:${dos(s % 60)}`;
};

// En 'reloj' el mm:ss YA dice que son segundos: pintar "12:45 SEGUNDOS" es ruido.
// Cualquier otra unidad ("por PR", "de espera") sí se respeta.
const UNIDAD_TIEMPO = /^(s|sec|secs|seg|segs|segundo|segundos|min|mins|minuto|minutos|h|hr|hrs|hora|horas)$/i;

/** Dígitos con caja de ancho fijo (ver ADV_ANTON). `blink` solo afecta a los ":". */
const Digits: React.FC<{text: string; size: number; color: string; family: string; adv: number; blink?: number}> =
  ({text, size, color, family, adv, blink}) => (
    <span style={{display: 'inline-flex', alignItems: 'baseline', fontFamily: family, fontSize: size,
                  lineHeight: 0.9, color, whiteSpace: 'nowrap'}}>
      {text.split('').map((c, i) => (
        <span key={i} style={{display: 'inline-block', width: advOf(c, adv) * size, textAlign: 'center',
                              opacity: c === ':' && blink !== undefined ? blink : 1}}>{c}</span>
      ))}
    </span>
  );

export const Stat: React.FC<{spec: StatSpec; th: Theme; frame: number; fps: number; dur?: number}> =
  ({spec, th, frame, fps, dur}) => {
    const total = dur ?? 150;
    const style = spec.style ?? 'contador';
    const unit = spec.unit ?? '';
    // Las constantes de sensación (rebote, respiración, pintado) están calibradas en
    // frames a 30 fps, que es el fps del canal: `k` las traduce si algún día cambia.
    const k = fps / 30;

    // ── reparto temporal ─────────────────────────────────────────────────────
    // El conteo ocupa ~42% del panel (tope 6 s: más que eso el número deja de
    // sentirse como que "aterriza" y se vuelve una espera). Lo que sobra en un
    // panel largo lo llenan, en orden: pintado del acento → etiqueta → el matiz
    // palabra por palabra → la comparación a la mitad → y una deriva y un barrido
    // que no paran nunca (regla de los 3 segundos sin cambio visual).
    const cs = Math.min(Math.max(fps * 0.2, total * 0.06), fps * 1.2);   // arranca el conteo
    const cd = Math.min(Math.max(fps * 0.8, total * 0.42), fps * 6);     // dura el conteo
    const ce = cs + cd;                                                  // aterriza
    // out(cubic) = arranca rápido y DESACELERA: los últimos dígitos se leen.
    const p = interpolate(frame, [cs, ce], [0, 1],
      {easing: Easing.out(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

    const enter = spring({frame, fps, config: {damping: 14, mass: 0.8, stiffness: 130}, durationInFrames: 18});

    // Micro-rebote de llegada: oscilación amortiguada, continua en dt=0 (arranca en
    // 0 y muere sola), en vez de un spring que daría un salto de escala en seco.
    const dt = frame - ce;
    const wob = dt > 0 ? Math.sin(dt / (2.6 * k)) * 0.085 * Math.exp(-dt / (10 * k)) : 0;
    const respira = dt > 0 ? Math.sin(frame / (34 * k)) * 0.005 : 0;     // el número nunca queda muerto
    const numScale = 1 + wob + respira;

    const paint = interpolate(frame, [ce, ce + 9 * k], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    const numColor = interpolateColors(paint, [0, 1], [th.text, th.accent]);

    // ── presupuesto vertical (MAX_H) ─────────────────────────────────────────
    // Se reparte ENTERO antes de elegir el tamaño del número, y en este orden: lo que
    // tiene texto (etiqueta, tarjeta, matiz) declara su alto REAL estimado y se clampa
    // a él; el número se queda con el resto. Reservar 64.8 px para el número desde el
    // principio es lo que hace que el reparto no pueda pasarse: antes el número tenía
    // un piso de 72 px aplicado DESPUÉS, así que un matiz largo empujaba el bloque
    // entero fuera de la banda (medido: 530 px con un `sub` de 400 caracteres).
    const UL_H = 40;               // subrayado (16 + 8 + 16)
    const NUM_MIN = 72 * 0.9;      // el número nunca baja de 72 px de tipo → 64.8 de caja

    // Etiqueta: UNA línea mientras se lea; si para caber tuviera que bajar de 30 px,
    // pasa a DOS líneas y se encoge menos. El piso duro de 26 px con `nowrap` de la
    // versión anterior se salía 147 px por CADA lado del frame con 120 caracteres.
    const lblLen = Math.max(1, spec.label.length);
    const lblFit = (lineas: number) => ((MAX_W - 6) * lineas / lblLen - 1) / ADV_LBL;
    const lblDos = lblFit(1) < 30;
    const labelSize = lblDos ? Math.max(22, Math.min(44, lblFit(1.84))) : Math.min(50, lblFit(1));
    const labelH = Math.ceil((lblDos ? 2 : 1) * labelSize * 1.06);

    // Denominador de 'fraccion': sale de `unit` ("10" o "de cada 10"), 10 por defecto.
    const pips = Math.max(2, Math.min(20, parseInt((unit.match(/\d+/) ?? ['10'])[0], 10) || 10));
    const encendidos = Math.max(0, Math.min(pips, Math.floor(spec.value)));

    const unitVis = style === 'reloj' && UNIDAD_TIEMPO.test(unit.trim()) ? '' : unit;
    const dec = decimalsOf(spec.value);
    const finalTxt = style === 'reloj' ? clock(spec.value)
      : style === 'fraccion' ? String(encendidos)
      : fmt(spec.value, dec);

    // ── tarjeta de comparación ───────────────────────────────────────────────
    // Su alto NO es constante: depende de cuántas líneas ocupe `compare.label`, y eso
    // depende de lo ancho que sea el número de la izquierda (nowrap) y de la ficha.
    // El presupuesto fijo de 123 px cubría exactamente dos líneas; con un número ancho
    // ("128,000 TOKENS") la etiqueta se iba a tres y la tarjeta medía 158 px.
    const CARD_IN = MAX_W - 10 - 44;      // bordes (8 izq + 2 der) + padding (22×2)
    const CMP_LN = 36;                    // línea de la etiqueta: 29 px × 1.22
    const cmpTxt = spec.compare
      ? (style === 'reloj' ? clock(spec.compare.value)
        : style === 'fraccion' ? `${spec.compare.value}/${pips}`
        : `${fmt(spec.compare.value, decimalsOf(spec.compare.value))}${unitVis ? ` ${unitVis}` : ''}`)
      : '';
    // Ficha "×N": es lo que hace que la comparación se lea SOLA, sin narración.
    const razon = spec.compare && spec.compare.value !== 0 ? spec.value / spec.compare.value : 0;
    const ficha = razon >= 1.15 ? `×${Math.round(razon * 10) / 10}`
      : razon > 0 && razon <= 0.87 ? `÷${Math.round((1 / razon) * 10) / 10}` : '';
    const cmpEm = emWidth(cmpTxt, ADV_ANTON);
    // el número de la tarjeta nunca se come más del 42% del ancho útil
    const cmpSize = Math.min(62, cmpEm > 0 ? (CARD_IN * 0.42) / cmpEm : 62);
    const fichaW = ficha ? ficha.length * 30 * ADV_MONO + 30 : 0;
    const cmpLibre = Math.max(150, CARD_IN - cmpEm * cmpSize - fichaW - 40);
    const cmpLineas = spec.compare
      ? Math.min(3, lineasDe(spec.compare.label, 29, ADV_SERIF, cmpLibre))
      : 0;
    const cmpLblH = cmpLineas * CMP_LN;
    const cardH = spec.compare ? 20 + 4 + 28 + Math.max(cmpSize * 0.95, cmpLblH, 42) : 0;

    // Lo que se reparten los bloques de 'fraccion' y el matiz: el resto ya está fijado
    // y el número tiene su mínimo apartado, así que este pool NO puede desbordar.
    const base = UL_H + labelH + cardH;
    const pool = Math.max(0, MAX_H - base - NUM_MIN);

    // Geometría de los bloques: se llevan como mucho el 44% del pool, y un bloque nunca
    // es más alto que 1.35× su ancho (sin ese tope, un panel sin `sub` ni `compare`
    // sacaba diez barras altísimas y flacas). Lo que no usan se lo queda el número.
    const pipGap = 12;
    const pipFilas = pips > 10 ? 2 : 1;
    const pipPorFila = Math.ceil(pips / pipFilas);
    const pipWMax = (MAX_W - (pipPorFila - 1) * pipGap) / pipPorFila;
    const pipBruto = Math.min(190, pool * 0.44);
    const pipH = Math.max(14, Math.min((pipBruto - (pipFilas - 1) * pipGap) / pipFilas, pipWMax * 1.35));
    const pipW = Math.min(pipWMax, pipH / 1.15);
    const blocksH = style === 'fraccion' ? pipFilas * pipH + (pipFilas - 1) * pipGap + 18 : 0;

    // Matiz: se le da lo que quede del pool y, si no cabe a 32 px, ENCOGE la tipografía
    // antes que empujar a nadie. Además va clampado en duro por si el sustituto de
    // Georgia de la máquina de render es más ancho de lo estimado.
    const subTxt = spec.sub ?? '';
    const subPool = Math.max(0, pool - blocksH);
    let subSize = 32;
    let subLineas = subTxt ? lineasDe(subTxt, subSize, ADV_SERIF, MAX_W) : 0;
    while (subTxt && subSize > 20 && 12 + subLineas * subSize * 1.3 > subPool) {
      subSize -= 2;
      subLineas = lineasDe(subTxt, subSize, ADV_SERIF, MAX_W);
    }
    const subCajaH = subTxt ? Math.max(0, Math.min(subPool - 12, subLineas * Math.ceil(subSize * 1.3))) : 0;
    const subH = subTxt ? subCajaH + 12 : 0;

    // ANTON incluso para el reloj: las cajas de ancho fijo de <Digits> ya dan el
    // comportamiento tabular, y el fallback de 'JetBrains Mono' en el Chrome del render
    // es una monoespaciada fina que al lado de la etiqueta en ANTON se ve desmayada.
    // El tamaño se calcula con el texto FINAL (el más ancho) para que no cambie a
    // media cuenta, y se limita por alto y por ancho a la vez.
    const unitEsc = unitVis.length > 18 ? 0.18 : unitVis.length > 10 ? 0.24 : 0.34;
    const colaEm = style === 'fraccion'
      ? emWidth(`/${pips}`, ADV_ANTON) * 0.5 + 0.12
      : unitVis ? unitEsc * 0.52 * unitVis.length + 0.16 : 0;
    const porAncho = (MAX_W - 10) / (emWidth(finalTxt, ADV_ANTON) + colaEm);
    const numH = MAX_H - base - blocksH - subH;          // ≥ NUM_MIN por construcción
    const numSize = Math.min(300, numH / 0.9, porAncho);

    // ── holgura: lo que el bloque puede MOVERSE sin salirse ──────────────────
    // El reparto de arriba solo garantiza el LAYOUT. Encima hay tres transforms (la
    // entrada del bloque, la de la tarjeta y el rebote del número) que en el caso lleno
    // se comían hasta 16 px por debajo de la banda (zona de la UI de TikTok) y 12 por
    // encima (zona de los subtítulos). Ahora cada recorrido se limita al aire que de
    // verdad queda en ESTE caso: en un panel vacío la entrada sigue siendo de 26 px.
    const alto = base + blocksH + subH + numSize * 0.9;
    const aire = Math.max(0, (528 - alto) / 2);            // px libres arriba Y abajo
    const rebote = numSize * 0.9 * 0.032;                  // lo que sube el pico del rebote
    // La entrada BAJA (solo la limita el aire de abajo); la deriva SUBE y comparte el
    // aire de arriba con el rebote del número, así que se reparte lo que quede.
    const entraY = Math.min(26, aire);
    const derivaY = Math.min(14, Math.max(0, aire - rebote));
    const deriva = interpolate(frame, [0, total], [0, -derivaY], {extrapolateRight: 'clamp'});

    // Texto que se ve AHORA (crece con la cuenta).
    const shown = style === 'reloj' ? clock(spec.value * p)
      : style === 'fraccion' ? String(Math.min(encendidos, Math.floor(encendidos * p + 1e-6)))
      : fmt(spec.value * p, dec);
    // El ":" del reloj parpadea mientras corre y se queda fijo al aterrizar.
    const blink = dt > 0 ? 1 : Math.floor(frame / Math.max(1, fps * 0.5)) % 2 === 0 ? 1 : 0.34;

    // Subrayado: crece con la cuenta y luego lo recorre un destello en bucle, que es
    // lo que mantiene vivo un panel de 20 s sin repetir la animación de entrada.
    const ulW = Math.min(560, MAX_W * 0.62);
    const cicloLen = Math.max(1, fps * 3.2);
    const ciclo = dt > 0 ? ((frame - ce) % cicloLen) / cicloLen : -1;

    const cmpAt = Math.max(ce + fps * 0.4, total * 0.5);
    const cmpP = spring({frame: frame - cmpAt, fps, config: {damping: 15, mass: 0.9, stiffness: 120}, durationInFrames: 20});

    const palabras = (spec.sub ?? '').split(' ');
    // El matiz se revela DURANTE la cuenta y sigue después: así el bloque nunca se ve
    // a medio componer y el reparto llega hasta el 72% del panel.
    const subIni = cs + 6 * k;
    const pasoSub = Math.max(2, (total * 0.72 - subIni) / Math.max(1, palabras.length));
    const labelIn = spring({frame: frame - 8 * k, fps, config: {damping: 15, mass: 0.9, stiffness: 130}, durationInFrames: 16});

    return (
      <div style={{width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
                   opacity: Math.min(1, enter * 1.5), transform: `translateY(${entraY * (1 - enter) + deriva}px)`}}>

        {/* ── el número ──────────────────────────────────────────────────── */}
        <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'center',
                     transform: `scale(${numScale})`, height: numSize * 0.9}}>
          <Digits text={shown} size={numSize} color={numColor} family={ANTON} adv={ADV_ANTON}
                  blink={style === 'reloj' ? blink : undefined} />
          {style === 'fraccion' ? (
            <span style={{fontFamily: ANTON, fontSize: numSize * 0.5, color: th.muted, marginLeft: numSize * 0.06}}>
              /{pips}
            </span>
          ) : unitVis ? (
            <span style={{fontFamily: ANTON, fontSize: numSize * unitEsc, color: th.accent2,
                          marginLeft: numSize * 0.09, textTransform: 'uppercase', letterSpacing: 1}}>
              {unitVis}
            </span>
          ) : null}
        </div>

        {/* ── bloques de 'fraccion': se encienden UNO POR UNO al ritmo del conteo ── */}
        {style === 'fraccion' ? (
          <Pips th={th} pips={pips} llenos={encendidos * p} w={pipW} h={pipH}
                filas={pipFilas} porFila={pipPorFila} hueco={pipGap} paint={paint} />
        ) : null}

        {/* ── subrayado que crece + destello en bucle ─────────────────────
            En 'reloj' esta MISMA regla es la barra de progreso del tiempo (raíl fijo con
            relleno): dos reglas apiladas se leían como un subrayado doble roto. */}
        <div style={{position: 'relative', width: style === 'reloj' ? ulW : ulW * (0.3 + 0.7 * p),
                     height: 8, margin: '16px 0', overflow: 'hidden',
                     background: style === 'reloj' ? th.cardAlt : `linear-gradient(90deg, ${th.accent2}, ${th.accent})`}}>
          {style === 'reloj' ? (
            <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${p * 100}%`,
                         background: `linear-gradient(90deg, ${th.accent2}, ${th.accent})`}} />
          ) : null}
          {ciclo >= 0 ? (
            <div style={{position: 'absolute', top: 0, bottom: 0, width: 150,
                         left: interpolate(ciclo, [0, 1], [-150, ulW]),
                         background: `linear-gradient(90deg, ${th.text}00, ${th.text}66, ${th.text}00)`}} />
          ) : null}
        </div>

        {/* ── etiqueta: una o dos líneas, siempre dentro de la banda ───────── */}
        <div style={{fontFamily: ANTON, fontSize: labelSize, lineHeight: 1.06, color: th.text,
                     textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center',
                     maxWidth: MAX_W, maxHeight: labelH, overflow: 'hidden',
                     whiteSpace: lblDos ? 'normal' : 'nowrap', overflowWrap: 'anywhere',
                     opacity: Math.min(1, labelIn * 1.5)}}>
          {spec.label}
        </div>

        {/* ── matiz, palabra por palabra: rellena el tramo muerto del panel ── */}
        {subTxt ? (
          <div style={{marginTop: 12, maxWidth: MAX_W, maxHeight: subCajaH, overflow: 'hidden',
                       textAlign: 'center', overflowWrap: 'anywhere',
                       fontFamily: SERIF, fontSize: subSize, lineHeight: 1.3, color: th.muted}}>
            {palabras.map((w, i) => (
              <span key={i} style={{opacity: interpolate(frame, [subIni + i * pasoSub, subIni + i * pasoSub + 8 * k], [0, 1],
                                                         {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
                {w}{i < palabras.length - 1 ? ' ' : ''}
              </span>
            ))}
          </div>
        ) : null}

        {/* ── comparación: entra a la mitad de la escena ─────────────────── */}
        {spec.compare ? (
          <div style={{width: '100%', marginTop: 20, display: 'flex', alignItems: 'center', gap: 20,
                       background: th.card, border: `2px solid ${th.cardAlt}`, borderLeft: `8px solid ${th.accent2}`,
                       borderRadius: '3px 16px 16px 3px', padding: '14px 22px', boxSizing: 'border-box',
                       opacity: Math.min(1, cmpP * 1.5), transform: `translateY(${Math.min(24, aire) * (1 - cmpP)}px)`}}>
            <div style={{fontFamily: ANTON, fontSize: cmpSize, lineHeight: 0.95, color: th.accent2,
                         textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0}}>
              {cmpTxt}
            </div>
            <div style={{flex: 1, minWidth: 0, fontFamily: SERIF, fontSize: 29, lineHeight: 1.22,
                         maxHeight: cmpLblH, overflow: 'hidden', overflowWrap: 'anywhere', color: th.muted}}>
              {spec.compare.label}
            </div>
            {ficha ? (
              <div style={{fontFamily: MONO, fontSize: 30, lineHeight: 1, letterSpacing: 1, background: th.accent,
                           color: th.bgBottom, padding: '6px 14px', borderRadius: 10, whiteSpace: 'nowrap',
                           flexShrink: 0}}>
                {ficha}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  };

/**
 * Los bloques de "8 de cada 10". Nada de emojis: rectángulos con los colores del
 * theme. Cada bloque toma su relleno de `llenos` (el contador en float), así que se
 * encienden uno por uno con la MISMA desaceleración que el número, sin timers aparte.
 */
const Pips: React.FC<{th: Theme; pips: number; llenos: number; w: number; h: number;
                      filas: number; porFila: number; hueco: number; paint: number}> =
  ({th, pips, llenos, w: bw, h: bh, filas, porFila, hueco, paint}) => {
    const color = interpolateColors(paint, [0, 1], [th.accent2, th.accent]);
    return (
      <div style={{marginTop: 18, display: 'flex', flexDirection: 'column', gap: hueco, alignItems: 'center'}}>
        {Array.from({length: filas}, (_, f) => (
          <div key={f} style={{display: 'flex', gap: hueco}}>
            {Array.from({length: Math.min(porFila, pips - f * porFila)}, (_, i) => {
              const idx = f * porFila + i;
              const on = Math.max(0, Math.min(1, llenos - idx));
              return (
                <div key={i} style={{
                  width: bw, height: bh, borderRadius: Math.min(12, bw * 0.22),
                  background: th.cardAlt, border: `2px solid ${th.card}`,
                  boxSizing: 'border-box', overflow: 'hidden', position: 'relative',
                  // el bloque "crece" al encenderse: el relleno sube desde abajo
                  transform: `scale(${1 + 0.08 * Math.sin(Math.min(1, on) * Math.PI)})`,
                }}>
                  <div style={{position: 'absolute', left: 0, right: 0, bottom: 0,
                               height: `${on * 100}%`, background: color}} />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };
