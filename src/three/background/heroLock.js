import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Line,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshPhysicalMaterial,
  Points,
  RingGeometry,
  CircleGeometry,
  ShaderMaterial,
  TubeGeometry,
  Vector2,
  Vector3,
  BufferGeometry as BG,
  Float32BufferAttribute,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { HEX } from '../core/palette.js';
import { keyholeGeometry, shackleCurve } from '../core/shapes.js';
import { neonBasic } from '../core/materials.js';

const W = 3.0;
const H = 2.4;
const D = 1.0;
const R = 0.26;
const SPACING = 0.105;
const SHACKLE_W = 2.0;
const SHACKLE_LEG = 0.95;
const SHACKLE_ARCH = 1.05;
const SHACKLE_TUBE = 0.2;
const KEYHOLE_Y = 0.12;

// Project a point onto the rounded-box surface; returns [point, normal].
function onRoundedBox(p) {
  const b = new Vector3(W / 2 - R, H / 2 - R, D / 2 - R);
  const q = new Vector3(Math.max(-b.x, Math.min(b.x, p.x)), Math.max(-b.y, Math.min(b.y, p.y)), Math.max(-b.z, Math.min(b.z, p.z)));
  const n = p.clone().sub(q);
  if (n.lengthSq() < 1e-9) n.set(0, 0, 1);
  n.normalize();
  return [q.add(n.clone().multiplyScalar(R)), n];
}

function inKeyhole(x, y) {
  const r = 0.26 + 0.07;
  const dy = y - KEYHOLE_Y;
  if (x * x + dy * dy < r * r) return true;
  return dy < 0 && dy > -(0.26 + 0.46 + 0.08) && Math.abs(x) < 0.26 * 0.62 + 0.08;
}

/** Points laid out on a regular grid over every face, wrapped onto the rounded box. */
function bodyPoints() {
  const pts = [];
  const nrm = [];
  const face = (axisU, axisV, axisN, sign, du, dv) => {
    const nu = Math.round(du / SPACING);
    const nv = Math.round(dv / SPACING);
    for (let i = 0; i <= nu; i++) {
      for (let j = 0; j <= nv; j++) {
        const u = -du / 2 + (i / nu) * du;
        const v = -dv / 2 + (j / nv) * dv;
        const p = new Vector3();
        p[axisU] = u;
        p[axisV] = v;
        p[axisN] = sign * { x: W, y: H, z: D }[axisN] * 0.5;
        // skip the outermost ring of each face to avoid doubled seams
        if (i === 0 || j === 0 || i === nu || j === nv) continue;
        if (axisN === 'z' && sign > 0 && inKeyhole(p.x, p.y)) continue;
        const [s, n] = onRoundedBox(p);
        pts.push(s.x, s.y, s.z);
        nrm.push(n.x, n.y, n.z);
      }
    }
  };
  face('x', 'y', 'z', 1, W, H);
  face('x', 'y', 'z', -1, W, H);
  face('x', 'z', 'y', 1, W, D);
  face('x', 'z', 'y', -1, W, D);
  face('y', 'z', 'x', 1, H, D);
  face('y', 'z', 'x', -1, H, D);
  return { pts, nrm };
}

function shacklePoints(curve) {
  const pts = [];
  const nrm = [];
  const len = curve.getLength();
  const steps = Math.round(len / SPACING);
  const around = Math.round((2 * Math.PI * SHACKLE_TUBE) / SPACING);
  const frames = curve.computeFrenetFrames ? null : null;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t).normalize();
    // stable frame: binormal = z for a planar curve
    const bin = new Vector3(0, 0, 1);
    const norm = new Vector3().crossVectors(bin, tan).normalize();
    for (let k = 0; k < around; k++) {
      const a = (k / around) * Math.PI * 2;
      const n = norm.clone().multiplyScalar(Math.cos(a)).add(bin.clone().multiplyScalar(Math.sin(a)));
      const q = p.clone().add(n.clone().multiplyScalar(SHACKLE_TUBE + 0.01));
      if (q.y < H / 2 - 0.02) continue; // hidden inside the body
      pts.push(q.x, q.y, q.z);
      nrm.push(n.x, n.y, n.z);
    }
  }
  void frames;
  return { pts, nrm };
}

function roundedRectLoop(w, h, r, z, segs = 10) {
  const pts = [];
  const corners = [
    [w / 2 - r, h / 2 - r, 0],
    [-w / 2 + r, h / 2 - r, Math.PI / 2],
    [-w / 2 + r, -h / 2 + r, Math.PI],
    [w / 2 - r, -h / 2 + r, (3 * Math.PI) / 2],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let i = 0; i <= segs; i++) {
      const a = a0 + (i / segs) * (Math.PI / 2);
      pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r, z);
    }
  }
  const g = new BG();
  g.setAttribute('position', new Float32BufferAttribute(pts, 3));
  return g;
}

function circleLine(radius, segs = 160) {
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    pts.push(Math.cos(a) * radius, 0, Math.sin(a) * radius);
  }
  const g = new BG();
  g.setAttribute('position', new Float32BufferAttribute(pts, 3));
  return g;
}

export function createHeroLock(atlas) {
  const root = new Group();
  const lock = new Group(); // rotates
  root.add(lock);
  const shackleGroup = new Group();
  lock.add(shackleGroup);

  // ---------- occluders (dark glass core so back glyphs are hidden) ----------
  const coreMat = new MeshPhysicalMaterial({
    color: 0x020402,
    metalness: 0.6,
    roughness: 0.32,
    clearcoat: 1,
    clearcoatRoughness: 0.2,
    envMapIntensity: 0.6,
  });
  const core = new Mesh(new RoundedBoxGeometry(W - 0.03, H - 0.03, D - 0.03, 6, R - 0.02), coreMat);
  lock.add(core);
  const curve = shackleCurve(SHACKLE_W, SHACKLE_LEG, SHACKLE_ARCH, H / 2 - 0.3);
  const shackleCore = new Mesh(new TubeGeometry(curve, 96, SHACKLE_TUBE - 0.025, 16, false), coreMat);
  shackleGroup.add(shackleCore);

  // ---------- glyph particles ----------
  const body = bodyPoints();
  const shack = shacklePoints(curve);
  const n = body.pts.length / 3 + shack.pts.length / 3;
  const pos = new Float32Array(n * 3);
  const nor = new Float32Array(n * 3);
  const start = new Float32Array(n * 3);
  const seed = new Float32Array(n * 2);
  const group = new Float32Array(n);
  pos.set(body.pts, 0);
  pos.set(shack.pts, body.pts.length);
  nor.set(body.nrm, 0);
  nor.set(shack.nrm, body.nrm.length);
  const bodyCount = body.pts.length / 3;
  for (let i = 0; i < n; i++) {
    // scattered origin: a wide shell around the lock
    const dir = new Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
    const rr = 6 + Math.random() * 14;
    start[i * 3] = dir.x * rr * 1.4;
    start[i * 3 + 1] = dir.y * rr;
    start[i * 3 + 2] = dir.z * rr - 4;
    seed[i * 2] = Math.random();
    seed[i * 2 + 1] = Math.random();
    group[i] = i >= bodyCount ? 1 : 0;
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('aNormal', new BufferAttribute(nor, 3));
  geo.setAttribute('aStart', new BufferAttribute(start, 3));
  geo.setAttribute('aSeed', new BufferAttribute(seed, 2));
  geo.setAttribute('aGroup', new BufferAttribute(group, 1));

  const glyphMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uAssemble: { value: 0 },
      uDisperse: { value: 0 },
      uUnlock: { value: 0 },
      uScanY: { value: -2 },
      uSize: { value: 0.098 },
      uScale: { value: 600 },
      uAtlas: { value: atlas.texture },
      uGrid: { value: new Vector2(atlas.cols, atlas.rows) },
      uColor: { value: new Color(HEX.acid) },
      uAccent: { value: new Color(HEX.yellow) },
      uAlert: { value: 0 },
      uAlertColor: { value: new Color(HEX.danger) },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aNormal;
      attribute vec3 aStart;
      attribute vec2 aSeed;
      attribute float aGroup;
      uniform float uTime;
      uniform float uAssemble;
      uniform float uDisperse;
      uniform float uUnlock;
      uniform float uScanY;
      uniform float uSize;
      uniform float uScale;
      varying float vGlyph;
      varying float vBright;
      varying float vAccent;
      varying float vAlpha;
      varying float vFacing;
      void main() {
        float delay = aSeed.x * 0.45 + (position.y + 1.4) * 0.11;
        float t = clamp((uAssemble * 1.75 - delay) / 0.85, 0.0, 1.0);
        t = 1.0 - pow(1.0 - t, 3.0);
        vec3 target = position;
        target.y += aGroup * uUnlock * 0.62;
        vec3 p = mix(aStart, target, t);
        // swirl while flying in
        float sw = (1.0 - t) * 2.5;
        p.xz = mat2(cos(sw), -sin(sw), sin(sw), cos(sw)) * p.xz;
        // scroll dispersion: blow outward along the surface normal
        vec3 dir = normalize(aNormal * 1.4 + vec3(aSeed.y - 0.5, aSeed.x - 0.35, aSeed.y - 0.5));
        float dd = uDisperse * uDisperse;
        p += dir * dd * (2.5 + aSeed.y * 10.0);
        p.y -= dd * aSeed.x * 3.0;
        // breathing
        p += aNormal * sin(uTime * 1.7 + aSeed.x * 30.0) * 0.01;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float dist = max(0.1, -mv.z);
        gl_PointSize = uSize * uScale / dist;
        float tick = floor(uTime * (0.8 + aSeed.y * 3.5) + aSeed.x * 97.0);
        vGlyph = step(0.5, fract(sin(tick * 12.9898 + aSeed.x * 78.233 + aSeed.y * 3.1) * 43758.5453));
        float scan = 1.0 - smoothstep(0.0, 0.22, abs(position.y - uScanY));
        float wave = 0.5 + 0.5 * sin(position.x * 2.2 - position.y * 1.4 + uTime * 1.6);
        vBright = 0.42 + wave * 0.35 + scan * 1.8 + (1.0 - t) * 0.6;
        vAccent = step(0.972, aSeed.y);
        vAlpha = smoothstep(0.0, 0.25, t + 0.04) * (1.0 - smoothstep(0.35, 1.0, uDisperse));
        vec3 nView = normalize(normalMatrix * aNormal);
        vFacing = mix(0.35, 1.0, clamp(nView.z * 1.4 + 0.4, 0.0, 1.0));
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uAtlas;
      uniform vec2 uGrid;
      uniform vec3 uColor;
      uniform vec3 uAccent;
      uniform float uAlert;
      uniform vec3 uAlertColor;
      varying float vGlyph;
      varying float vBright;
      varying float vAccent;
      varying float vAlpha;
      varying float vFacing;
      void main() {
        vec2 cell = vec2(mod(vGlyph, uGrid.x), floor(vGlyph / uGrid.x));
        vec2 uv = (cell + gl_PointCoord) / uGrid;
        float a = texture2D(uAtlas, uv).a;
        vec3 col = mix(mix(uColor, uAccent, vAccent), uAlertColor, uAlert);
        float alpha = a * vAlpha * vFacing;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(col * vBright * alpha * 1.6, alpha);
      }
    `,
  });
  const glyphs = new Points(geo, glyphMat);
  glyphs.frustumCulled = false;
  glyphs.renderOrder = 3;
  lock.add(glyphs);

  // ---------- keyhole ----------
  const keyMat = neonBasic(HEX.yellow, 2.6);
  const keyhole = new Mesh(keyholeGeometry(0.26, 0.46, 0.04), keyMat);
  keyhole.position.set(0, KEYHOLE_Y, D / 2 - 0.03);
  lock.add(keyhole);
  const keyRingMat = new LineBasicMaterial({ color: new Color(HEX.yellow).multiplyScalar(1.6), transparent: true, opacity: 0.9, toneMapped: false });
  const keyRing = new LineLoop(circleLine(0.42, 64).rotateX(Math.PI / 2), keyRingMat);
  keyRing.position.set(0, KEYHOLE_Y, D / 2 + 0.012);
  lock.add(keyRing);

  // ---------- face outlines ----------
  const outlineMat = new LineBasicMaterial({ color: new Color(HEX.acid).multiplyScalar(1.3), transparent: true, opacity: 0.55, toneMapped: false });
  const frontLine = new LineLoop(roundedRectLoop(W - 0.08, H - 0.08, R * 0.8, D / 2 + 0.004), outlineMat);
  const backLine = new LineLoop(roundedRectLoop(W - 0.08, H - 0.08, R * 0.8, -D / 2 - 0.004), outlineMat);
  lock.add(frontLine, backLine);

  // ---------- hologram projector ----------
  const projector = new Group();
  projector.position.y = -H / 2 - 1.15;
  root.add(projector);
  const ringMat = neonBasic(HEX.acid, 1.7, { side: DoubleSide, transparent: true, opacity: 0.9 });
  const ring = new Mesh(new RingGeometry(1.72, 1.8, 128), ringMat);
  ring.rotation.x = -Math.PI / 2;
  projector.add(ring);
  const ring2 = new Mesh(new RingGeometry(2.1, 2.12, 128), neonBasic(HEX.acid, 1.0, { side: DoubleSide, transparent: true, opacity: 0.5 }));
  ring2.rotation.x = -Math.PI / 2;
  projector.add(ring2);
  const discMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    uniforms: { uTime: { value: 0 }, uColor: { value: new Color(HEX.acid) }, uFade: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uColor; uniform float uFade; varying vec2 vUv;
      void main(){
        vec2 c = vUv - 0.5; float r = length(c) * 2.0;
        float rings = smoothstep(0.92, 1.0, sin(r * 46.0 - uTime * 3.0) * 0.5 + 0.5);
        float a = (rings * 0.35 + (1.0 - r) * 0.22) * smoothstep(1.0, 0.85, r) * uFade;
        float ang = atan(c.y, c.x);
        float spokes = smoothstep(0.96, 1.0, sin(ang * 24.0 + uTime * 0.6) * 0.5 + 0.5) * 0.25 * (1.0 - r);
        a += spokes * uFade;
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
  });
  const disc = new Mesh(new CircleGeometry(1.72, 96), discMat);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.002;
  projector.add(disc);
  const beamMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    uniforms: { uTime: { value: 0 }, uColor: { value: new Color(HEX.acid) }, uFade: { value: 1 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uColor; uniform float uFade; varying vec2 vUv;
      void main(){
        float v = vUv.y;
        float lines = smoothstep(0.7, 1.0, sin(vUv.x * 380.0) * 0.5 + 0.5) * 0.4 + 0.6;
        float sweep = smoothstep(0.08, 0.0, abs(fract(v * 1.0 - uTime * 0.25) - 0.5) - 0.42);
        float a = pow(1.0 - v, 2.2) * 0.16 * lines + sweep * 0.05;
        a *= uFade;
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
  });
  const beam = new Mesh(new CylinderGeometry(2.25, 1.76, 5.4, 96, 1, true), beamMat);
  beam.position.y = 2.7;
  projector.add(beam);

  // ---------- orbit rings with data packets ----------
  const orbits = new Group();
  root.add(orbits);
  const orbitMat = new LineBasicMaterial({ color: new Color(HEX.acid).multiplyScalar(0.9), transparent: true, opacity: 0.28, toneMapped: false, depthWrite: false });
  const orbitDefs = [
    { r: 3.05, tiltX: 1.25, tiltZ: 0.22, speed: 0.42, packets: 3 },
    { r: 3.45, tiltX: 1.42, tiltZ: -0.38, speed: -0.28, packets: 2 },
  ];
  const packetGeo = new BufferGeometry();
  const packetCount = orbitDefs.reduce((s, d) => s + d.packets, 0);
  const packetPos = new Float32Array(packetCount * 3);
  packetGeo.setAttribute('position', new BufferAttribute(packetPos, 3));
  const packetMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uScale: { value: 600 }, uColor: { value: new Color(HEX.yellow).multiplyScalar(2.2) }, uFade: { value: 1 } },
    vertexShader: `uniform float uScale; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = 0.22 * uScale / -mv.z; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uFade; void main(){ vec2 c = gl_PointCoord - 0.5; float d = length(c); float a = smoothstep(0.5, 0.0, d); a = pow(a, 2.5) * uFade; gl_FragColor = vec4(uColor * a, a); }`,
  });
  const packets = new Points(packetGeo, packetMat);
  packets.frustumCulled = false;
  const orbitObjs = orbitDefs.map((d) => {
    const g = new Group();
    g.rotation.set(d.tiltX, 0, d.tiltZ);
    const line = new Line(circleLine(d.r, 200), orbitMat);
    g.add(line);
    orbits.add(g);
    return { ...d, group: g };
  });
  root.add(packets);
  const tmp = new Vector3();

  lock.rotation.set(0.12, -0.5, 0);
  root.position.y = -0.35;
  lock.position.y = -0.55; // optical centre (shackle makes it top-heavy)

  const state = { assemble: 0, unlock: 0, unlockTarget: 0, disperse: 0, alert: 0 };

  return {
    object: root,
    state,
    setScale(px) {
      glyphMat.uniforms.uScale.value = px;
      packetMat.uniforms.uScale.value = px;
    },
    update(dt, t, { pointerX = 0, pointerY = 0, disperse = 0 } = {}) {
      const u = glyphMat.uniforms;
      u.uTime.value = t;
      u.uAssemble.value = state.assemble;
      state.unlock += (state.unlockTarget - state.unlock) * (1 - Math.exp(-7 * dt));
      u.uUnlock.value = state.unlock;
      u.uDisperse.value = disperse;
      u.uAlert.value = state.alert;
      // scan line sweeps bottom → top every 3.6s
      const cycle = (t % 3.6) / 3.6;
      u.uScanY.value = -H / 2 - 0.5 + cycle * (H + SHACKLE_LEG + SHACKLE_ARCH + 1.4);

      shackleGroup.position.y = state.unlock * 0.62;
      const show = 1 - Math.min(1, disperse * 2.2);
      core.visible = shackleCore.visible = show > 0.02;
      core.scale.setScalar(Math.max(0.001, 0.4 + 0.6 * show));
      shackleCore.scale.setScalar(Math.max(0.001, 0.4 + 0.6 * show));
      keyMat.color.setHex(HEX.yellow).multiplyScalar((1.25 + Math.sin(t * 2.4) * 0.35 + state.unlock * 1.0) * show * Math.min(1, state.assemble * 1.4));
      keyRingMat.opacity = 0.85 * show * Math.min(1, state.assemble);
      outlineMat.opacity = 0.55 * show * Math.min(1, Math.max(0, state.assemble * 1.6 - 0.6));
      const pf = show * Math.min(1, state.assemble * 1.2);
      discMat.uniforms.uTime.value = t;
      discMat.uniforms.uFade.value = pf;
      beamMat.uniforms.uTime.value = t;
      beamMat.uniforms.uFade.value = pf;
      ringMat.opacity = 0.9 * pf;
      ring2.material.opacity = 0.5 * pf;
      orbitMat.opacity = 0.28 * pf;
      packetMat.uniforms.uFade.value = pf;

      // lock follows the pointer a little and breathes
      const targetY = -0.5 + pointerX * 0.32 + Math.sin(t * 0.35) * 0.12;
      const targetX = 0.12 - pointerY * 0.14 + Math.sin(t * 0.5) * 0.03;
      lock.rotation.y += (targetY - lock.rotation.y) * (1 - Math.exp(-3 * dt));
      lock.rotation.x += (targetX - lock.rotation.x) * (1 - Math.exp(-3 * dt));
      lock.position.y = -0.55 + Math.sin(t * 0.9) * 0.06;

      // packets travel along their orbits
      let k = 0;
      for (const o of orbitObjs) {
        o.group.rotation.y = t * 0.05 * Math.sign(o.speed);
        for (let i = 0; i < o.packets; i++) {
          const a = t * o.speed + (i / o.packets) * Math.PI * 2;
          tmp.set(Math.cos(a) * o.r, 0, Math.sin(a) * o.r).applyEuler(o.group.rotation);
          packetPos[k * 3] = tmp.x;
          packetPos[k * 3 + 1] = tmp.y;
          packetPos[k * 3 + 2] = tmp.z;
          k++;
        }
      }
      packetGeo.attributes.position.needsUpdate = true;
    },
  };
}
