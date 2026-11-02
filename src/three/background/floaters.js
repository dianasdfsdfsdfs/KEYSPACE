import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Points,
  ShaderMaterial,
} from 'three';
import { HEX } from '../core/palette.js';
import { keyGeometry, padlockGeometry } from '../core/shapes.js';

/** Wireframe keys and padlocks drifting through the background volume. */
export function createFloaters({ count = 22, zNear = -9, zFar = -105 } = {}) {
  const group = new Group();
  const keyEdges = new EdgesGeometry(keyGeometry(), 28);
  const lockEdges = new EdgesGeometry(padlockGeometry({ bodyW: 2.6, bodyH: 2.0, bodyD: 0.9, shackleW: 1.7 }), 28);
  const mats = [
    new LineBasicMaterial({ color: new Color(HEX.acid), transparent: true, opacity: 0.22, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
    new LineBasicMaterial({ color: new Color(HEX.yellow), transparent: true, opacity: 0.16, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
  ];
  const items = [];
  for (let i = 0; i < count; i++) {
    const isKey = i % 3 !== 0;
    const obj = new LineSegments(isKey ? keyEdges : lockEdges, mats[i % 5 === 0 ? 1 : 0]);
    const side = i % 2 === 0 ? 1 : -1;
    obj.position.set(side * (5 + Math.random() * 16), -4 + Math.random() * 10, zFar + (i / count) * (zNear - zFar) + Math.random() * 3);
    const s = 0.55 + Math.random() * 0.9;
    obj.scale.setScalar(s);
    obj.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    items.push({
      obj,
      spin: [(Math.random() - 0.5) * 0.25, (Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 0.2],
      bob: Math.random() * 6,
      baseY: obj.position.y,
    });
    group.add(obj);
  }
  return {
    object: group,
    materials: mats,
    update(dt, t) {
      for (const it of items) {
        it.obj.rotation.x += it.spin[0] * dt;
        it.obj.rotation.y += it.spin[1] * dt;
        it.obj.rotation.z += it.spin[2] * dt;
        it.obj.position.y = it.baseY + Math.sin(t * 0.3 + it.bob) * 0.6;
      }
    },
  };
}

/** Fine luminous dust for depth and parallax. */
export function createDust({ count = 1600, spread = 40, zNear = 12, zFar = -110 } = {}) {
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() * 2 - 1) * spread;
    pos[i * 3 + 1] = (Math.random() * 2 - 1) * 14;
    pos[i * 3 + 2] = zFar + Math.random() * (zNear - zFar);
    seed[i] = Math.random();
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new BufferAttribute(seed, 1));
  const mat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uScale: { value: 600 }, uColor: { value: new Color(HEX.lime) } },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime;
      uniform float uScale;
      varying float vA;
      void main() {
        vec3 p = position;
        p.y += sin(uTime * 0.2 + aSeed * 20.0) * 0.6;
        p.x += cos(uTime * 0.15 + aSeed * 13.0) * 0.4;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float dist = max(0.1, -mv.z);
        gl_PointSize = min((0.035 + aSeed * 0.05) * uScale / dist, 6.0);
        vA = (0.25 + 0.75 * aSeed) * smoothstep(1.0, 5.0, dist) * (1.0 - smoothstep(60.0, 100.0, dist));
        vA *= 0.5 + 0.5 * sin(uTime * (0.5 + aSeed) + aSeed * 40.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vA * 0.6;
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
  });
  const points = new Points(geo, mat);
  points.frustumCulled = false;
  return {
    object: points,
    setScale(px) {
      mat.uniforms.uScale.value = px;
    },
    update(t) {
      mat.uniforms.uTime.value = t;
    },
  };
}
