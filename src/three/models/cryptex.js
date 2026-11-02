import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  ShaderMaterial,
  TorusGeometry,
} from 'three';
import { HEX } from '../core/palette.js';
import { addStudio } from '../core/studio.js';
import { canvasTexture, FONT_MONO } from '../core/glyphs.js';
import { createLetterSet } from '../core/letters.js';
import { PlaneGeometry } from 'three';
import { damp, clamp } from '../core/ticker.js';

const W = 0.46; // ring width
const R = 0.95;
const MAX = 22;

function ringTexture(alphabet) {
  const N = alphabet.length;
  const w = 4096;
  return canvasTexture(w, 192, (ctx, _w, h) => {
    ctx.fillStyle = '#10150d';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(182,255,0,0.08)';
    ctx.fillRect(0, 0, w, 10);
    ctx.fillRect(0, h - 10, w, 10);
    ctx.fillStyle = '#d7e6c8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const size = Math.min(h * 0.5, (w / N) * 0.95);
    ctx.font = `700 ${Math.round(size)}px ${FONT_MONO}`;
    for (let k = 0; k < N; k++) {
      const x = (k / N) * w;
      for (const xx of [x, x + w]) {
        ctx.save();
        ctx.translate(xx, h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(alphabet[k] === ' ' ? '␣' : alphabet[k], 0, 3);
        ctx.restore();
      }
    }
  });
}

export default async function createCryptex(stage, params, emit) {
  const { scene, camera } = stage;
  scene.environmentIntensity = 0.32;
  addStudio(stage, { floorY: -1.75, rim: 0.45, key: 0.8 });

  const root = new Group();
  scene.add(root);

  const metal = new MeshStandardMaterial({ color: 0x1e271a, metalness: 0.85, roughness: 0.32 });
  const brass = new MeshStandardMaterial({ color: 0x6e5a28, metalness: 0.9, roughness: 0.38 });
  const ringGeo = new CylinderGeometry(R, R, W * 0.9, 96, 1, true);
  ringGeo.rotateZ(-Math.PI / 2);
  const sepGeo = new CylinderGeometry(R * 1.04, R * 1.04, W * 0.1, 64);
  sepGeo.rotateZ(-Math.PI / 2);
  const coreGeo = new CylinderGeometry(R * 0.9, R * 0.9, 1, 48);
  coreGeo.rotateZ(-Math.PI / 2);
  const core = new Mesh(coreGeo, metal);
  root.add(core);

  const textures = new Map();
  const texFor = (alpha) => {
    if (!textures.has(alpha)) textures.set(alpha, ringTexture(alpha));
    return textures.get(alpha);
  };
  const ringMat = new MeshStandardMaterial({ color: 0xffffff, metalness: 0.4, roughness: 0.45, emissive: new Color(0xffffff), emissiveIntensity: 0.06 });

  const glyphs = createLetterSet({ scale: 0.8, weight: 800 });
  const labelGeo = new PlaneGeometry(W * 0.78, W * 0.95);
  const rings = [];
  for (let i = 0; i < MAX; i++) {
    const g = new Group();
    const ring = new Mesh(ringGeo, ringMat);
    const sep = new Mesh(sepGeo, metal);
    sep.position.x = W / 2;
    g.add(ring, sep);
    const label = new Mesh(labelGeo, new MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, color: new Color(HEX.acid) }));
    label.position.set(0, 0, R + 0.09);
    g.add(label);
    root.add(g);
    rings.push({ g, ring, label, ch: null, angle: 0, target: 0, from: 0 });
  }

  // end caps
  const caps = [-1, 1].map((side) => {
    const g = new Group();
    const body = new Mesh(new CylinderGeometry(R * 1.12, R * 1.12, 0.5, 64), brass);
    body.rotation.z = Math.PI / 2;
    const cone = new Mesh(new CylinderGeometry(0.3, R * 1.0, 0.55, 64), brass);
    cone.rotation.z = (side * -Math.PI) / 2;
    cone.position.x = side * 0.52;
    const ring1 = new Mesh(new TorusGeometry(R * 1.12, 0.04, 12, 64), brass);
    ring1.rotation.y = Math.PI / 2;
    ring1.position.x = side * -0.22;
    const glow = new Mesh(new TorusGeometry(R * 1.13, 0.018, 8, 96), new MeshBasicMaterial({ color: new Color(HEX.acid).multiplyScalar(1.8), toneMapped: false }));
    glow.rotation.y = Math.PI / 2;
    glow.position.x = side * 0.18;
    const tip = new Mesh(new CylinderGeometry(0.14, 0.3, 0.2, 32), brass);
    tip.rotation.z = (side * -Math.PI) / 2;
    tip.position.x = side * 0.88;
    g.add(body, cone, ring1, glow, tip);
    root.add(g);
    return { g, side, glow };
  });

  // reading line: two glowing rails along the front
  const railMat = new MeshBasicMaterial({ color: new Color(HEX.acid).multiplyScalar(2), toneMapped: false });
  const rails = [0.36, -0.36].map((y) => {
    const m = new Mesh(new BoxGeometry(1, 0.025, 0.025), railMat);
    m.position.set(0, y, R + 0.06);
    root.add(m);
    return m;
  });

  // force field shown when the password survives
  const shieldMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uColor: { value: new Color(HEX.acid) } },
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec2 vUv; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uTime; uniform float uOpacity; uniform vec3 uColor; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
      void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.5); vec2 g = fract(vUv * vec2(60.0, 6.0)); float hex = step(0.92, max(g.x, g.y));
      float sweep = smoothstep(0.1, 0.0, abs(fract(vUv.x - uTime * 0.25) - 0.5) - 0.45);
      float a = (f * 0.5 + hex * 0.06 + sweep * 0.1) * uOpacity * 0.55; gl_FragColor = vec4(uColor * a, a); }`,
  });
  const shieldGeo = new CylinderGeometry(R * 1.45, R * 1.45, 1, 64, 1, true);
  shieldGeo.rotateZ(-Math.PI / 2);
  const shield = new Mesh(shieldGeo, shieldMat);
  root.add(shield);

  const st = {
    n: 8,
    alphabet: 'abcdefghijklmnopqrstuvwxyz',
    mode: 'idle',
    display: '',
    password: '',
    masked: false,
    counter: 0,
    rate: 22, // odometer steps per second (visual)
    capOpen: 0,
    alert: 0,
    safe: 0,
  };
  const A = () => (Math.PI * 2) / st.alphabet.length;

  function layout() {
    const n = st.n;
    const len = n * W;
    rings.forEach((r, i) => {
      r.g.visible = i < n;
      r.g.position.x = -len / 2 + W / 2 + i * W;
    });
    core.scale.set(len + 0.1, 1, 1);
    rails.forEach((m) => m.scale.set(len + 0.2, 1, 1));
    shield.scale.set(len + 1.9, 1, 1);
    caps.forEach((c) => (c.baseX = c.side * (len / 2 + 0.26)));
    const aspect = stage.width / stage.height;
    const t = Math.tan((camera.fov * Math.PI) / 360);
    const total = len + 2.4;
    const dist = Math.max(total / 2 / (t * aspect), 3.6 / 2 / t);
    camera.position.set(0, dist * 0.34, dist * 0.94);
    camera.lookAt(0, -0.05, 0);
    camera.updateProjectionMatrix();
  }
  camera.fov = 30;
  stage.onResize = layout;

  function setTargets(str) {
    const a = st.alphabet;
    rings.forEach((r, i) => {
      if (i >= st.n) return;
      let k = a.indexOf(str[i]);
      if (k < 0) k = Math.floor(Math.random() * a.length);
      const target = -k * A();
      // spin forward the short way round, plus a little flourish
      let d = target - r.angle;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      r.target = r.angle + d;
    });
  }

  function set(p) {
    const n = Math.max(1, Math.min(MAX, p.length || 8));
    const alphaChanged = p.alphabet && p.alphabet !== st.alphabet;
    if (alphaChanged) st.alphabet = p.alphabet;
    if (alphaChanged || !ringMat.map) {
      ringMat.map = texFor(st.alphabet);
      ringMat.emissiveMap = ringMat.map;
      ringMat.needsUpdate = true;
    }
    if (n !== st.n || alphaChanged) {
      st.n = n;
      layout();
    }
    st.masked = !!p.masked;
    st.password = p.password || '';
    if (p.mode !== st.mode) {
      st.mode = p.mode || 'idle';
      if (st.mode === 'brute') st.counter = 0;
      if (st.mode === 'cracked') {
        st.alert = 1;
        setTargets(st.masked ? '' : st.password);
      }
    }
    if (p.display !== undefined && p.display !== st.display) {
      st.display = p.display;
      if (st.mode === 'dictionary' || st.mode === 'rules' || st.mode === 'idle') setTargets(st.display);
    }
  }
  set(params);
  layout();

  const acid = new Color(HEX.acid);
  const red = new Color(HEX.danger);
  const tmpC = new Color();

  const off = stage.add((dt, t) => {
    const N = st.alphabet.length;
    if (st.mode === 'brute' || st.mode === 'safe') {
      // odometer: the rightmost ring flies, each ring to the left is N× slower
      st.counter += dt * st.rate;
      for (let i = 0; i < st.n; i++) {
        const k = st.n - 1 - i; // 0 = rightmost
        const v = st.counter / N ** k;
        const whole = Math.floor(v);
        const frac = v - whole;
        const pos = (whole % N) + (k === 0 ? frac : 0);
        rings[i].angle = -pos * A();
        rings[i].target = rings[i].angle;
      }
    } else {
      for (let i = 0; i < st.n; i++) {
        const r = rings[i];
        r.angle = damp(r.angle, r.target, st.mode === 'cracked' ? 5 + i * 0.4 : 14, dt);
      }
    }
    for (let i = 0; i < st.n; i++) {
      const r = rings[i];
      r.ring.rotation.x = r.angle;
      // big readable glyph at the reading line
      let k = Math.round(-r.angle / A()) % N;
      if (k < 0) k += N;
      let ch = st.alphabet[k];
      if (st.masked && (st.mode === 'idle' || st.mode === 'cracked')) ch = '•';
      if (ch === ' ') ch = '␣';
      if (ch !== r.ch) {
        r.ch = ch;
        r.label.material.map = glyphs.get(ch);
        r.label.material.needsUpdate = true;
      }
    }

    st.capOpen = damp(st.capOpen, st.mode === 'cracked' ? 1 : 0, 3, dt);
    caps.forEach((c) => (c.g.position.x = (c.baseX || 0) + c.side * st.capOpen * 0.7));
    st.alert = Math.max(0, st.alert - dt * 0.6);
    const cracked = st.mode === 'cracked' ? 1 : 0;
    tmpC.copy(acid).lerp(red, cracked);
    railMat.color.copy(tmpC).multiplyScalar(2 + st.alert * 2);
    caps.forEach((c) => c.glow.material.color.copy(tmpC).multiplyScalar(1.8));
    const busy = st.mode === 'dictionary' || st.mode === 'rules' || st.mode === 'brute';
    for (let i = 0; i < st.n; i++) rings[i].label.material.color.setHex(cracked ? HEX.danger : busy ? HEX.yellow : HEX.acid).multiplyScalar(cracked ? 2.2 : 1.5);
    ringMat.emissive.copy(cracked ? red : acid);
    ringMat.emissiveIntensity = 0.05 + cracked * (0.18 + st.alert * 0.5);
    st.safe = damp(st.safe, st.mode === 'safe' ? 1 : 0, 2.5, dt);
    shieldMat.uniforms.uOpacity.value = st.safe;
    shieldMat.uniforms.uTime.value = t;

    const pt = stage.pointer;
    root.rotation.y = damp(root.rotation.y, pt.inside ? pt.nx * 0.25 : Math.sin(t * 0.35) * 0.1, 3, dt);
    root.rotation.x = damp(root.rotation.x, pt.inside ? -pt.ny * 0.12 : 0.04, 3, dt);
    root.position.y = Math.sin(t * 0.9) * 0.04 + (st.alert > 0 ? (Math.random() - 0.5) * st.alert * 0.05 : 0);
  });

  return {
    set,
    dispose() {
      off();
      textures.forEach((t) => t.dispose());
      glyphs.dispose();
    },
  };
}
