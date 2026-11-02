import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace } from 'three';

export const FONT_MONO = '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, Menlo, monospace';
export const FONT_DISPLAY = '"Unbounded Variable", "Unbounded", system-ui, sans-serif';
export const FONT_BODY = '"Inter Variable", "Inter", system-ui, sans-serif';

let ready;
/** Canvas text must wait for the web fonts, otherwise textures bake a fallback font. */
export function whenFontsReady() {
  if (!ready) {
    ready = Promise.all([
      document.fonts.load(`600 64px ${FONT_MONO}`),
      document.fonts.load(`800 64px ${FONT_MONO}`),
      document.fonts.load(`700 64px ${FONT_DISPLAY}`),
      document.fonts.load(`500 32px ${FONT_BODY}`),
    ])
      .catch(() => {})
      .then(() => document.fonts.ready);
  }
  return ready;
}

function finishTexture(canvas, { srgb = true, mip = true } = {}) {
  const tex = new CanvasTexture(canvas);
  if (srgb) tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = mip;
  tex.minFilter = mip ? LinearMipmapLinearFilter : LinearFilter;
  tex.magFilter = LinearFilter;
  return tex;
}

/**
 * White glyphs on transparent cells, for point/instance shaders that tint and
 * pick a cell per particle. Cells are padded so mipmaps don't bleed.
 */
export function createGlyphAtlas(chars, { cell = 96, font = FONT_MONO, weight = 700, scale = 0.7 } = {}) {
  const list = [...chars];
  const cols = Math.ceil(Math.sqrt(list.length));
  const rows = Math.ceil(list.length / cols);
  const canvas = document.createElement('canvas');
  canvas.width = cols * cell;
  canvas.height = rows * cell;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${weight} ${Math.round(cell * scale)}px ${font}`;
  list.forEach((ch, i) => {
    const x = (i % cols) * cell + cell / 2;
    const y = Math.floor(i / cols) * cell + cell / 2 + cell * 0.04;
    ctx.fillText(ch, x, y);
  });
  const texture = finishTexture(canvas, { srgb: false });
  texture.flipY = false;
  return { texture, cols, rows, count: list.length, chars: list, index: Object.fromEntries(list.map((c, i) => [c, i])) };
}

/** Generic canvas texture: draw(ctx, w, h) paints it. */
export function canvasTexture(width, height, draw, opts = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  draw(ctx, width, height);
  const tex = finishTexture(canvas, opts);
  tex.userData.canvas = canvas;
  tex.userData.redraw = (fn) => {
    ctx.clearRect(0, 0, width, height);
    (fn || draw)(ctx, width, height);
    tex.needsUpdate = true;
  };
  return tex;
}

/** Single centred label, e.g. a key cap letter or a hex byte. */
export function labelTexture(text, { size = 128, w = size, h = size, font = FONT_MONO, weight = 700, color = '#ffffff', scale = 0.62, bg = null } = {}) {
  return canvasTexture(w, h, (ctx) => {
    if (bg) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${weight} ${Math.round(h * scale)}px ${font}`;
    ctx.fillText(text, w / 2, h / 2 + h * 0.03);
  });
}
