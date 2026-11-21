// Paletas de marca replicadas de autoedit/diagrams.py (THEMES). Colores en HEX para poder
// añadir alpha con sufijo (#RRGGBBAA).
//
// PALETA SOBRIA (feedback de José, 11-ago-2026: "esos fondos fosforescentes no van, mejor
// sobrios"). El look es documental: fondos de grafito/tinta con muy poca saturación y acentos
// apagados. El contraste lo da el VALOR (claro sobre oscuro), nunca el brillo del color.
// Si cambias algo aquí, cámbialo TAMBIÉN en diagrams.py: si las dos paletas se separan, el
// video sale con dos looks distintos (le pasó al video 2 de la serie de lenguaje).
export type Theme = {
  bgTop: string;
  bgBottom: string;
  accent: string;
  accent2: string;
  card: string;
  cardAlt: string;
  text: string;
  muted: string;
  red: string;
  green: string;
};

const COMMON = {
  text: '#EEECE8', // hueso cálido
  muted: '#969491',
  red: '#C66864', // ladrillo, no rojo láser
  green: '#8CB084', // salvia, no verde lima
};

export const THEMES: Record<string, Theme> = {
  neon: {bgTop: '#1E2026', bgBottom: '#121318', accent: '#DEB05C', accent2: '#8CA5B2', card: '#282B32', cardAlt: '#202229', ...COMMON},
  cyber: {bgTop: '#1A222E', bgBottom: '#0F131B', accent: '#9AB6CA', accent2: '#D0A86E', card: '#242E3C', cardAlt: '#1A212C', ...COMMON},
  matrix: {bgTop: '#1A2422', bgBottom: '#101515', accent: '#96BA9E', accent2: '#CDB278', card: '#222E2C', cardAlt: '#18201F', ...COMMON},
  sunset: {bgTop: '#2C201E', bgBottom: '#181213', accent: '#D08A60', accent2: '#C4B094', card: '#362825', cardAlt: '#241B1A', ...COMMON},
  violeta: {bgTop: '#24202E', bgBottom: '#14121A', accent: '#AC9EC4', accent2: '#D4B278', card: '#2E293A', cardAlt: '#1F1C27', ...COMMON},
  ambar: {bgTop: '#282118', bgBottom: '#16120F', accent: '#E0AC58', accent2: '#B07A52', card: '#32291E', cardAlt: '#211B15', ...COMMON},
  menta: {bgTop: '#182226', bgBottom: '#0F1417', accent: '#8CBAB4', accent2: '#CEB27E', card: '#202C30', cardAlt: '#161E21', ...COMMON},
  carmin: {bgTop: '#2C1C20', bgBottom: '#171013', accent: '#C67474', accent2: '#CAB48E', card: '#362327', cardAlt: '#23171A', ...COMMON},
  hielo: {bgTop: '#1C222C', bgBottom: '#10141A', accent: '#A8C0D0', accent2: '#DEDEDA', card: '#262D39', cardAlt: '#191E26', ...COMMON},
  selva: {bgTop: '#1A241E', bgBottom: '#101613', accent: '#98B48A', accent2: '#CEAC70', card: '#222E26', cardAlt: '#171F1A', ...COMMON},
  'curso python con ia': {bgTop: '#1E2026', bgBottom: '#121318', accent: '#DEB05C', accent2: '#8CA5B2', card: '#282B32', cardAlt: '#202229', ...COMMON}, // = neon, la del curso
};

export const themeOf = (name?: string): Theme => THEMES[name ?? 'neon'] ?? THEMES.neon;
