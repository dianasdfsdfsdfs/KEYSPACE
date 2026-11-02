import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, Points, ShaderMaterial, Vector2 } from 'three';
import { HEX } from '../core/palette.js';

/**
 * Falling columns of binary (and the odd hex digit) spread through a deep
 * volume. Every glyph is one point; the shader moves a bright "head" down
 * each column, leaves a fading trail and flips glyphs as it goes.
 */
export function createRain(atlas, { columns = 300, rows = 30, spacing = 0.44, size = 0.34, spread = 34, zNear = 10, zFar = -110 } = {}) {
  const count = columns * rows;
  const base = new Float32Array(count * 3);
  const row = new Float32Array(count);
  const params = new Float32Array(count * 4);
  for (let c = 0; c < columns; c++) {
    const z = zFar + Math.random() * (zNear - zFar);
    // keep a clear corridor around the camera path so glyphs never fill the screen
    let x = (Math.random() * 2 - 1) * spread;
    if (Math.abs(x) < 2.2) x += Math.sign(x || 1) * 2.2;
    const top = 5 + Math.random() * 11;
    const seed = Math.random();
    const speed = 5 + Math.random() * 9;
    const trail = 8 + Math.random() * 16;
    const flip = Math.random();
    for (let r = 0; r < rows; r++) {
      const i = c * rows + r;
      base[i * 3] = x;
      base[i * 3 + 1] = top;
      base[i * 3 + 2] = z;
      row[i] = r;
      params[i * 4] = seed;
      params[i * 4 + 1] = speed;
      params[i * 4 + 2] = trail;
      params[i * 4 + 3] = flip;
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(base, 3));
  geometry.setAttribute('aRow', new BufferAttribute(row, 1));
  geometry.setAttribute('aParams', new BufferAttribute(params, 4));

  const material = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uSpacing: { value: spacing },
      uRows: { value: rows },
      uSize: { value: size },
      uScale: { value: 600 },
      uAtlas: { value: atlas.texture },
      uGrid: { value: new Vector2(atlas.cols, atlas.rows) },
      uGlyphs: { value: atlas.count },
      uColor: { value: new Color(HEX.acid).multiplyScalar(0.9) },
      uHead: { value: new Color(HEX.lime).multiplyScalar(2.4) },
      uOpacity: { value: 0.75 },
      uAlert: { value: 0 },
      uAlertColor: { value: new Color(HEX.danger).multiplyScalar(1.4) },
    },
    vertexShader: /* glsl */ `
      attribute float aRow;
      attribute vec4 aParams;
      uniform float uTime;
      uniform float uSpacing;
      uniform float uRows;
      uniform float uSize;
      uniform float uScale;
      uniform float uGlyphs;
      varying float vBright;
      varying float vHead;
      varying float vGlyph;
      varying float vFade;
      float hash(float n) { return fract(sin(n) * 43758.5453123); }
      void main() {
        float seed = aParams.x;
        float speed = aParams.y;
        float trail = aParams.z;
        vec3 pos = position;
        pos.y -= aRow * uSpacing;
        float cycle = uRows + trail + 10.0;
        float head = mod(uTime * speed + seed * cycle * 7.0, cycle);
        float d = head - aRow;
        float lit = step(0.0, d) * (1.0 - smoothstep(trail * 0.6, trail, d));
        vBright = lit * exp(-d / trail * 1.6);
        vHead = lit * (1.0 - smoothstep(0.0, 1.4, d));
        float tick = floor(uTime * (1.5 + aParams.w * 7.0) + seed * 37.0 + aRow * 0.37);
        float r = hash(aRow * 13.17 + seed * 91.7 + tick * 0.7313);
        vGlyph = r < 0.86 ? floor(r / 0.86 * 2.0) : 2.0 + floor((r - 0.86) / 0.14 * (uGlyphs - 2.0));
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mv;
        float dist = max(0.001, -mv.z);
        gl_PointSize = min(uSize * uScale / dist, 48.0);
        vFade = smoothstep(1.5, 6.0, dist) * (1.0 - smoothstep(55.0, 105.0, dist));
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uAtlas;
      uniform vec2 uGrid;
      uniform vec3 uColor;
      uniform vec3 uHead;
      uniform float uOpacity;
      uniform float uAlert;
      uniform vec3 uAlertColor;
      varying float vBright;
      varying float vHead;
      varying float vGlyph;
      varying float vFade;
      void main() {
        if (vBright < 0.004 || vFade < 0.004) discard;
        vec2 cell = vec2(mod(vGlyph, uGrid.x), floor(vGlyph / uGrid.x));
        vec2 uv = (cell + gl_PointCoord) / uGrid;
        float a = texture2D(uAtlas, uv).a;
        vec3 base = mix(uColor, uAlertColor, uAlert);
        vec3 col = mix(base, uHead, vHead);
        float alpha = a * vBright * vFade * uOpacity;
        if (alpha < 0.003) discard;
        gl_FragColor = vec4(col * alpha, alpha);
      }
    `,
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 1;
  return {
    object: points,
    material,
    setScale(px) {
      material.uniforms.uScale.value = px;
    },
    update(t) {
      material.uniforms.uTime.value = t;
    },
  };
}
