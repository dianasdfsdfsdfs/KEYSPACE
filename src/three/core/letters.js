import { labelTexture, FONT_MONO } from './glyphs.js';

/**
 * Per-stage cache of glyph textures (white on transparent) so materials can
 * tint them. Each Stage owns its own set — textures are never shared between
 * WebGL contexts.
 */
export function createLetterSet({ size = 128, font = FONT_MONO, weight = 700, scale = 0.72 } = {}) {
  const cache = new Map();
  return {
    get(ch) {
      const key = ch || ' ';
      if (!cache.has(key)) cache.set(key, labelTexture(key, { size, font, weight, scale }));
      return cache.get(key);
    },
    dispose() {
      cache.forEach((t) => t.dispose());
      cache.clear();
    },
  };
}
