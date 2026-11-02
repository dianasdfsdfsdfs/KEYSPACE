import { Vector2 } from 'three';

// Final display-space pass: soft vignette, film grain, faint scanlines and a
// touch of chromatic aberration toward the edges — the "monitor" feel.
export const FinishShader = {
  name: 'KeyspaceFinish',
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uResolution: { value: new Vector2(1, 1) },
    uVignette: { value: 0.35 },
    uGrain: { value: 0.035 },
    uScan: { value: 0.0 },
    uAberration: { value: 0.0025 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform vec2 uResolution;
    uniform float uVignette;
    uniform float uGrain;
    uniform float uScan;
    uniform float uAberration;
    varying vec2 vUv;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }

    void main() {
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      float d = length(c);
      vec2 off = c * uAberration * (0.4 + d * 2.0);
      vec3 col;
      col.r = texture2D(tDiffuse, uv + off).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - off).b;

      float vig = smoothstep(0.9, 0.25, d);
      col *= mix(1.0 - uVignette, 1.0, vig);

      float g = hash(uv * uResolution + fract(uTime * 7.31) * 113.0) - 0.5;
      col += g * uGrain;

      float scan = 0.5 + 0.5 * sin(uv.y * uResolution.y * 3.14159 / 1.5);
      col *= 1.0 - uScan * scan;

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};
