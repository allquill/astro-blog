// QR codes as SVG markup, made on the server: brand-teal modules with the site's mark in the middle.
// Level H error correction (up to 30% of the code can be lost) lets the centre be left empty for the
// mark. A post's URL never changes, so each one is drawn once per process (bounded cache).
import QRCode from 'qrcode';

const BRAND = '#0f766e'; // brand-700, as in global.css and public/favicon.svg
/** The mark from public/favicon.svg (32×32), inlined so the server never reads files to draw a code. */
const MARK =
  '<rect width="32" height="32" rx="8" fill="#0f766e"/><path d="M12.5 10 7 16l5.5 6M19.5 10 25 16l-5.5 6M17.5 8.5l-3 15" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>';
const QUIET = 2; // modules of white border
const LOGO = 0.22; // share of the code's width the mark (with its white pad) takes

const cache = new Map<string, string>();
const MAX = 500;

export function qrSvg(text: string): string {
  const hit = cache.get(text);
  if (hit) return hit;
  const { modules } = QRCode.create(text, { errorCorrectionLevel: 'H' });
  const n = modules.size;
  // The cleared square: centred, an odd/even size that matches n so it sits on the module grid.
  let hole = Math.round(n * LOGO);
  if ((n - hole) % 2) hole++;
  const from = (n - hole) / 2;
  const to = from + hole;

  let d = '';
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (x >= from && x < to && y >= from && y < to) continue;
      if (modules.get(y, x)) d += `M${x + QUIET} ${y + QUIET}h1v1h-1z`;
    }
  }
  const size = n + QUIET * 2;
  const pad = 0.6;
  const mark = hole - pad * 2;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">` +
    `<rect width="${size}" height="${size}" fill="#fff"/>` +
    `<path fill="${BRAND}" d="${d}"/>` +
    `<svg x="${from + QUIET + pad}" y="${from + QUIET + pad}" width="${mark}" height="${mark}" viewBox="0 0 32 32" shape-rendering="geometricPrecision">${MARK}</svg>` +
    `</svg>`;
  if (cache.size >= MAX) cache.delete(cache.keys().next().value!);
  cache.set(text, svg);
  return svg;
}
