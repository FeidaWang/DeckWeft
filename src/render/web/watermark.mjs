import {readFileSync} from 'node:fs';
/**
 * The DeckWeft watermark, designed in Figma (https://www.figma.com/design/8P2CALkQHYO3eSY1jELaaW, component DeckWeft/Watermark):
 * a plain-weave mark and the wordmark, outlined to paths, in currentColor. The renderer draws it on every slide from this file
 * alone. No document, plan, theme, profile or export option reaches it, so no deck can remove or hide it.
 */
const svg=readFileSync(new URL('../../../public/brand/deckweft-watermark.svg',import.meta.url),'utf8').trim();
export const WATERMARK_SVG=svg.replace('<svg ','<svg class="dw-watermark-mark" aria-hidden="true" focusable="false" ');
export const watermarkHTML=()=>`<div class="dw-watermark" aria-hidden="true">${WATERMARK_SVG}</div>`;
