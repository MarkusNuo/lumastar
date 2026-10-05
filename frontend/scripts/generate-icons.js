// Generates the favicon and the PWA app icons (`npm run gen:icons`) from the mascot geometry in
// src/components/ui/mascotArt.ts and the colour tokens in src/styles/tokens.css, so the icons stay
// original artwork in the design system's colours. The output is committed: builds need no sharp.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import {
  CHEEK_RADII,
  CHEEKS,
  EYES,
  HAPPY_MOUTH,
  HAPPY_TONGUE,
  HIGHLIGHT,
  MASCOT_VIEWBOX,
  STAR_EDGE_OFFSET,
  STAR_POSES,
  STAR_STROKE_WIDTH,
} from '../src/components/ui/mascotArt.ts';
import { readColorTokens } from './designTokens.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');
const iconDir = join(publicDir, 'icons');
const color = readColorTokens();

/** `fill="…"` for a token; translucent tokens become a colour plus an opacity. */
function paint(token, attribute = 'fill') {
  const value = color(token);
  const translucent = /^rgb\((\d+) (\d+) (\d+) \/ ([\d.]+)\)$/.exec(value);
  if (!translucent) return `${attribute}="${value}"`;
  const [, r, g, b, alpha] = translucent;
  return `${attribute}="rgb(${r},${g},${b})" ${attribute}-opacity="${alpha}"`;
}

/** The happy mascot, as Mascot.tsx draws it, without animation. */
function mascotMark() {
  const star = STAR_POSES.rest;
  const eye = ({ cx, cy }) =>
    `<circle cx="${cx}" cy="${cy}" r="${EYES.radius}" ${paint('mascot-eye')}/>` +
    `<circle cx="${cx}" cy="${cy}" r="${EYES.pupilRadius}" ${paint('mascot-pupil')}/>` +
    `<circle cx="${cx + EYES.glintOffset}" cy="${cy - EYES.glintOffset}" r="${EYES.glintRadius}" ${paint('mascot-eye')}/>`;
  return [
    `<defs><linearGradient id="mascot-body" x1="0" y1="0" x2="0.3" y2="1">`,
    `<stop offset="0" stop-color="${color('mascot-top')}"/>`,
    `<stop offset="1" stop-color="${color('mascot-bottom')}"/>`,
    `</linearGradient></defs>`,
    `<polygon points="${star}" transform="translate(0 ${STAR_EDGE_OFFSET})" ${paint('mascot-edge')} ${paint('mascot-edge', 'stroke')} stroke-width="${STAR_STROKE_WIDTH}" stroke-linejoin="round"/>`,
    `<polygon points="${star}" fill="url(#mascot-body)" stroke="url(#mascot-body)" stroke-width="${STAR_STROKE_WIDTH}" stroke-linejoin="round"/>`,
    `<ellipse cx="${HIGHLIGHT.cx}" cy="${HIGHLIGHT.cy}" rx="${HIGHLIGHT.rx}" ry="${HIGHLIGHT.ry}" transform="rotate(${HIGHLIGHT.rotate} ${HIGHLIGHT.cx} ${HIGHLIGHT.cy})" ${paint('shine')}/>`,
    ...CHEEKS.map(
      ({ cx, cy }) =>
        `<ellipse cx="${cx}" cy="${cy}" rx="${CHEEK_RADII.rx}" ry="${CHEEK_RADII.ry}" ${paint('mascot-cheek')} opacity="0.8"/>`,
    ),
    eye(EYES.left),
    eye(EYES.right),
    `<path d="${HAPPY_MOUTH}" ${paint('mascot-mouth')}/>`,
    `<path d="${HAPPY_TONGUE}" ${paint('mascot-tongue')}/>`,
  ].join('');
}

const svg = (size, content) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${content}</svg>`;

/**
 * The mark on the app background with two soft aurora glows. `markShare` is the mark's size
 * relative to the icon; `radius` rounds the tile (0 = full bleed, for maskable and Apple icons).
 */
function appIcon(size, { markShare, radius }) {
  const mark = size * markShare;
  // The star's visual centre sits slightly below the middle of its viewBox (the 3D edge).
  const x = (size - mark) / 2;
  const y = size / 2 - mark * 0.52;
  const rx = size * radius;
  const glow = (id, cx, cy, token, opacity) =>
    `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="0.65"><stop offset="0" stop-color="${color(token)}" stop-opacity="${opacity}"/><stop offset="1" stop-color="${color(token)}" stop-opacity="0"/></radialGradient>`;
  return svg(
    size,
    [
      `<defs>${glow('glow-teal', 0.25, 0.2, 'secondary', 0.4)}${glow('glow-violet', 0.8, 0.85, 'primary', 0.55)}</defs>`,
      `<rect width="${size}" height="${size}" rx="${rx}" ${paint('bg')}/>`,
      `<rect width="${size}" height="${size}" rx="${rx}" fill="url(#glow-teal)"/>`,
      `<rect width="${size}" height="${size}" rx="${rx}" fill="url(#glow-violet)"/>`,
      `<svg x="${x}" y="${y}" width="${mark}" height="${mark}" viewBox="${MASCOT_VIEWBOX}">${mascotMark()}</svg>`,
    ].join(''),
  );
}

const PNG_ICONS = [
  // "any": a rounded tile, so the icon reads on light and dark launchers alike.
  { file: 'icon-192.png', size: 192, markShare: 0.8, radius: 0.22 },
  { file: 'icon-512.png', size: 512, markShare: 0.8, radius: 0.22 },
  // "maskable": full bleed; the mark stays inside the 80 % safe circle of every launcher mask.
  { file: 'icon-maskable-192.png', size: 192, markShare: 0.7, radius: 0 },
  { file: 'icon-maskable-512.png', size: 512, markShare: 0.7, radius: 0 },
  // iOS rounds the corners itself and shows transparency as black.
  { file: 'apple-touch-icon.png', size: 180, markShare: 0.76, radius: 0 },
];

mkdirSync(iconDir, { recursive: true });
writeFileSync(
  join(publicDir, 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MASCOT_VIEWBOX}">${mascotMark()}</svg>\n`,
);
for (const { file, size, ...layout } of PNG_ICONS) {
  await sharp(Buffer.from(appIcon(size, layout)))
    .png({ compressionLevel: 9 })
    .toFile(join(iconDir, file));
}
console.log(`Wrote public/favicon.svg and ${PNG_ICONS.length} icons to public/icons.`);
