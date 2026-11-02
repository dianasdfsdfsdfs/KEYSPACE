import {
  AdditiveBlending,
  Color,
  DoubleSide,
  LineBasicMaterial,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  ShaderMaterial,
} from 'three';
import { HEX } from './palette.js';

/** Dark anodised metal — the base of most machines on the site. */
export const darkMetal = (opts = {}) =>
  new MeshPhysicalMaterial({
    color: HEX.metal,
    metalness: 0.85,
    roughness: 0.38,
    clearcoat: 0.4,
    clearcoatRoughness: 0.35,
    ...opts,
  });

/** Slightly lighter brushed metal for rims, bolts and edges. */
export const brushedMetal = (opts = {}) =>
  new MeshStandardMaterial({
    color: HEX.metalLight,
    metalness: 0.95,
    roughness: 0.28,
    ...opts,
  });

/** Matte surface (leather, wood, rubber). */
export const matte = (hex, opts = {}) =>
  new MeshStandardMaterial({ color: hex, metalness: 0.05, roughness: 0.85, ...opts });

/** Self-lit neon: HDR colour so bloom picks it up. */
export const neonBasic = (hex = HEX.acid, intensity = 2.2, opts = {}) =>
  new MeshBasicMaterial({ color: new Color(hex).multiplyScalar(intensity), toneMapped: false, ...opts });

export const neonLine = (hex = HEX.acid, opacity = 0.5, intensity = 1.0) =>
  new LineBasicMaterial({
    color: new Color(hex).multiplyScalar(intensity),
    transparent: true,
    opacity,
    blending: AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });

/** Smoked glass — lamp covers, windows. */
export const glass = (opts = {}) =>
  new MeshPhysicalMaterial({
    color: 0x0d140b,
    metalness: 0,
    roughness: 0.08,
    transmission: 0,
    transparent: true,
    opacity: 0.55,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    side: DoubleSide,
    ...opts,
  });

/**
 * Infinite-looking floor grid, faded by distance from the camera.
 * Drawn additively so it glows faintly through fog.
 */
export function gridMaterial({ color = HEX.acid, cell = 1, major = 5, fade = 0.06, opacity = 0.35 } = {}) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uColor: { value: new Color(color) },
      uCell: { value: cell },
      uMajor: { value: major },
      uFade: { value: fade },
      uOpacity: { value: opacity },
      uCenter: { value: new Color(0, 0, 0) },
      uOrigin: { value: { x: 0, y: 0 } },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uCell;
      uniform float uMajor;
      uniform float uFade;
      uniform float uOpacity;
      varying vec3 vWorld;
      float line(vec2 p) {
        vec2 g = abs(fract(p - 0.5) - 0.5) / fwidth(p);
        return 1.0 - min(min(g.x, g.y), 1.0);
      }
      void main() {
        vec2 p = vWorld.xz / uCell;
        float minor = line(p) * 0.45;
        float majorL = line(p / uMajor);
        float d = length(vWorld.xz - cameraPosition.xz);
        float fade = exp(-d * uFade);
        float a = max(minor, majorL) * fade * uOpacity;
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
  });
}
