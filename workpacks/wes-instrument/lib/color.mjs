/** Portable sRGB / D65 helpers. No network or third-party dependencies.
 * Six-digit hex only. All contrast comparisons use unrounded values.
 * Lab uses a D65 reference white; no film colour-profile recovery is implied.
 */
function triplet(value, integers = false) {
  if (!Array.isArray(value) || value.length !== 3 || value.some(v =>
    typeof v !== 'number' || !Number.isFinite(v) ||
    (integers && (!Number.isInteger(v) || v < 0 || v > 255)))) {
    throw new TypeError(integers ? 'Expected three integer RGB channels (0..255).' : 'Expected three finite coordinates.');
  }
  return value;
}
export function hexToRgb(hex) {
  if (typeof hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(hex)) throw new TypeError('Expected #RRGGBB.');
  return [1, 3, 5].map(i => Number.parseInt(hex.slice(i, i + 2), 16));
}
export function rgbToHex(rgb) {
  return '#' + triplet(rgb, true).map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}
export function srgbToLinear(channel) {
  if (typeof channel !== 'number' || !Number.isFinite(channel) || channel < 0 || channel > 1) {
    throw new TypeError('Expected an sRGB channel in [0, 1].');
  }
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}
export function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(v => srgbToLinear(v / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrastRatio(a, b) {
  const x = relativeLuminance(a), y = relativeLuminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function passesContrast(a, b, minimum = 4.5) {
  if (typeof minimum !== 'number' || !Number.isFinite(minimum) || minimum < 1 || minimum > 21) {
    throw new TypeError('Contrast threshold must be between 1 and 21.');
  }
  return contrastRatio(a, b) >= minimum;
}
export function rgbToLab(rgb) {
  const [r, g, b] = triplet(rgb, true).map(v => srgbToLinear(v / 255));
  const xyz = [
    (0.4124564*r + 0.3575761*g + 0.1804375*b) / 0.95047,
    0.2126729*r + 0.7151522*g + 0.0721750*b,
    (0.0193339*r + 0.1191920*g + 0.9503041*b) / 1.08883
  ];
  const d = 6 / 29;
  const [x,y,z] = xyz.map(t => t > d ** 3 ? Math.cbrt(t) : t / (3*d*d) + 4/29);
  return [116*y - 16, 500*(x-y), 200*(y-z)];
}
export const hexToLab = hex => rgbToLab(hexToRgb(hex));
export function deltaE76(labA, labB) {
  triplet(labA); triplet(labB);
  return Math.hypot(...labA.map((v, i) => v - labB[i]));
}
function roundHalfEven(x) {
  const floor = Math.floor(x), fraction = x - floor;
  return Math.abs(fraction - 0.5) < 1e-10 ? floor + (floor % 2) : Math.round(x);
}
export function mixHex(a, b, fraction) {
  if (typeof fraction !== 'number' || !Number.isFinite(fraction) || fraction < 0 || fraction > 1) {
    throw new TypeError('Mix fraction must be in [0, 1].');
  }
  const x = hexToRgb(a), y = hexToRgb(b);
  return rgbToHex(x.map((v, i) => roundHalfEven(v*(1-fraction) + y[i]*fraction)));
}
export function bestTextColor(background, candidates = ['#101010', '#FFFFFF']) {
  hexToRgb(background);
  if (!Array.isArray(candidates) || candidates.length === 0) throw new TypeError('Text candidates cannot be empty.');
  candidates.forEach(hexToRgb);
  return candidates.reduce((best, c) => contrastRatio(c, background) > contrastRatio(best, background) ? c : best);
}
/** Design derivation version 1; these roles are not film-frame measurements. */
export function deriveMode(colors, mode) {
  if (!Array.isArray(colors) || colors.length < 1) throw new TypeError('At least one source colour is required.');
  colors.forEach(hexToRgb);
  if (!['light', 'dark', 'stage'].includes(mode)) throw new TypeError('Unknown theme mode.');
  const accent = colors[0];
  const dark = mode === 'dark';
  const canvas = dark ? '#151716' : mixHex('#FFFFFF', accent, mode === 'light' ? 0.035 : 0);
  const surface = dark ? '#232624' : '#FFFFFF';
  const ink = dark ? '#FAFAF7' : '#171917';
  const muted = dark ? '#C5C8C5' : '#4B504B';
  const link = [...colors].sort((a,b) => contrastRatio(b,canvas) - contrastRatio(a,canvas))
    .find(c => passesContrast(c,canvas) && passesContrast(c,surface)) ?? ink;
  return { canvas, surface, text:ink, mutedText:muted, accent, onAccent:bestTextColor(accent),
    link, focusRing:ink, essentialStroke:ink, referenceText:ink, diagramFill:accent,
    diagramText:bestTextColor(accent), diagramConnector:ink, missingMark:ink,
    series:[...colors], seriesOutlines:ink, semanticPolicy:'source-colors-not-semantic-status' };
}
/** Only these actual role/background pairs are checked; not all swatch combinations. */
export const ROLE_PAIRS = Object.freeze([
  ...['text','mutedText','link','referenceText'].flatMap(fg =>
    ['canvas','surface'].map(bg => Object.freeze({fg,bg,minimum:4.5}))),
  {fg:'onAccent',bg:'accent',minimum:4.5},
  {fg:'diagramText',bg:'diagramFill',minimum:4.5},
  ...['focusRing','essentialStroke','diagramConnector','missingMark','seriesOutlines'].flatMap(fg =>
    ['canvas','surface'].map(bg => Object.freeze({fg,bg,minimum:3})))
].map(Object.freeze));
export function auditRolePairs(tokens) {
  return ROLE_PAIRS.map(pair => {
    const ratio = contrastRatio(tokens[pair.fg], tokens[pair.bg]);
    return {...pair, ratio, pass:ratio >= pair.minimum};
  });
}
