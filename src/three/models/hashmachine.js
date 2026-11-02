import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  ShaderMaterial,
  TorusGeometry,
  Vector2,
  Vector3,
  CylinderGeometry as Cyl,
} from 'three';
import { HEX } from '../core/palette.js';
import { addStudio } from '../core/studio.js';
import { createGlyphAtlas } from '../core/glyphs.js';
import { createLetterSet } from '../core/letters.js';
import { damp, clamp, easeInOutCubic } from '../core/ticker.js';

const HEXCH = '0123456789abcdef';
const N = 64;
const HELIX_R = 2.15;
const TURNS = 2;
const H0 = -1.9;
const H1 = 0.3;

export default async function createHashMachine(stage, params, emit) {
  const { scene, camera } = stage;
  scene.environmentIntensity = 0.55;
  addStudio(stage, { floorY: -2.45, rim: 0.8 });

  const fit = () => {
    const aspect = stage.width / stage.height;
    const t = Math.tan((camera.fov * Math.PI) / 360);
    const dist = Math.max(6.4 / 2 / (t * aspect), 6.6 / 2 / t);
    camera.position.set(0, dist * 0.32, dist * 0.95);
    camera.lookAt(0, -0.2, 0);
    camera.updateProjectionMatrix();
  };
  camera.fov = 30;
  stage.onResize = fit;
  fit();

  const root = new Group();
  scene.add(root);
  const letters = createLetterSet({ scale: 0.7 });

  // ---------- the machine: funnel + counter-rotating grinder rings ----------
  const metal = new MeshStandardMaterial({ color: 0x1c2618, metalness: 0.9, roughness: 0.3 });
  const dark = new MeshStandardMaterial({ color: 0x0a0e08, metalness: 0.6, roughness: 0.5 });
  const funnel = new Mesh(new CylinderGeometry(1.15, 0.55, 0.9, 64, 1, true), new MeshStandardMaterial({ color: 0x1c2618, metalness: 0.9, roughness: 0.3, side: DoubleSide }));
  funnel.position.y = 1.55;
  root.add(funnel);
  const lip = new Mesh(new TorusGeometry(1.15, 0.04, 12, 96), new MeshBasicMaterial({ color: new Color(HEX.acid).multiplyScalar(1.8), toneMapped: false }));
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 2.0;
  root.add(lip);
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const g = new Group();
    g.position.y = 0.85 - i * 0.62;
    const body = new Mesh(new CylinderGeometry(0.72, 0.72, 0.5, 48), i % 2 ? dark : metal);
    g.add(body);
    // glowing slits
    for (let k = 0; k < 12; k++) {
      const slit = new Mesh(new PlaneGeometry(0.07, 0.36), new MeshBasicMaterial({ color: new Color(HEX.acid).multiplyScalar(1.4), toneMapped: false, side: DoubleSide }));
      const a = (k / 12) * Math.PI * 2;
      slit.position.set(Math.cos(a) * 0.725, 0, Math.sin(a) * 0.725);
      slit.lookAt(Math.cos(a) * 2, 0, Math.sin(a) * 2);
      g.add(slit);
    }
    const teeth = new Mesh(new TorusGeometry(0.74, 0.05, 8, 48), metal);
    teeth.rotation.x = Math.PI / 2;
    teeth.position.y = 0.26;
    g.add(teeth);
    root.add(g);
    rings.push(g);
  }
  const base = new Mesh(new Cyl(1.05, 1.25, 0.5, 64), metal);
  base.position.y = -1.95;
  root.add(base);
  const coreGlow = new Mesh(new CylinderGeometry(0.5, 0.5, 2.4, 32, 1, true), new MeshBasicMaterial({ color: new Color(HEX.acid), transparent: true, opacity: 0.12, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }));
  coreGlow.position.y = 0.0;
  root.add(coreGlow);

  // ---------- output helix of 64 hex glyphs ----------
  const atlas = createGlyphAtlas(HEXCH, { cell: 128, weight: 700, scale: 0.72 });
  const glyphIdx = new Float32Array(N);
  const tileGeo = new PlaneGeometry(0.3, 0.36);
  tileGeo.setAttribute('aGlyph', new InstancedBufferAttribute(glyphIdx, 1));
  const tileMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    uniforms: { uAtlas: { value: atlas.texture }, uGrid: { value: new Vector2(atlas.cols, atlas.rows) } },
    vertexShader: /* glsl */ `
      attribute float aGlyph; varying vec2 vUv; varying float vGlyph; varying vec3 vColor;
      void main(){ vUv = uv; vGlyph = aGlyph;
        #ifdef USE_INSTANCING_COLOR
          vColor = instanceColor;
        #else
          vColor = vec3(1.0);
        #endif
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uAtlas; uniform vec2 uGrid; varying vec2 vUv; varying float vGlyph; varying vec3 vColor;
      void main(){ vec2 cell = vec2(mod(vGlyph, uGrid.x), floor(vGlyph / uGrid.x));
        vec2 uv = (cell + vec2(gl_FrontFacing ? vUv.x : 1.0 - vUv.x, 1.0 - vUv.y)) / uGrid;
        float a = texture2D(uAtlas, uv).a; if (a < 0.05) discard; gl_FragColor = vec4(vColor * a, a); }
    `,
  });
  const tiles = new InstancedMesh(tileGeo, tileMat, N);
  tiles.renderOrder = 3;
  root.add(tiles);
  const dummy = new Object3D();
  const slots = Array.from({ length: N }, (_, i) => {
    const u = i / N;
    const a = u * TURNS * Math.PI * 2 + Math.PI / 2;
    const p = new Vector3(Math.cos(a) * HELIX_R, H1 + (H0 - H1) * u, Math.sin(a) * HELIX_R);
    return { p, a, value: 0, next: 0, flip: 1, delay: 0, glow: 0 };
  });
  // ---------- input letters orbiting above the funnel ----------
  const inputTiles = Array.from({ length: 14 }, () => {
    const m = new Mesh(new PlaneGeometry(0.34, 0.34), new MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, color: new Color(HEX.yellow).multiplyScalar(1.6), side: DoubleSide }));
    root.add(m);
    return { m, ch: '' };
  });

  const st = { input: '', hash: '', spin: 0, burst: 0, drop: 1 };
  const colors = { base: new Color(HEX.acid).multiplyScalar(1.15), hot: new Color(HEX.yellow).multiplyScalar(2.4) };
  const c = new Color();

  function set(p) {
    if (p.input !== undefined && p.input !== st.input) {
      st.input = p.input;
      const shown = [...st.input].slice(-14);
      inputTiles.forEach((t, i) => {
        const ch = shown[i];
        t.m.visible = !!ch;
        if (ch && ch !== t.ch) {
          t.ch = ch;
          t.m.material.map = letters.get(ch === ' ' ? '·' : ch);
          t.m.material.needsUpdate = true;
        }
      });
      st.drop = 0;
    }
    if (p.hash && p.hash !== st.hash) {
      const old = st.hash;
      st.hash = p.hash;
      slots.forEach((s, i) => {
        const v = HEXCH.indexOf(p.hash[i]);
        if (v !== s.value || !old) {
          s.next = v;
          s.flip = 0;
          s.delay = i * 0.012;
          s.glow = old ? 1 : 0.4;
        }
      });
      st.burst = 1;
    }
  }
  set(params);

  const off = stage.add((dt, t) => {
    st.burst = Math.max(0, st.burst - dt * 0.9);
    st.drop = Math.min(1, st.drop + dt * 1.6);
    st.spin += dt * (0.6 + st.burst * 6);
    rings.forEach((r, i) => (r.rotation.y = st.spin * (i % 2 ? -1.3 : 1) * (1 + i * 0.2)));
    coreGlow.material.opacity = 0.08 + st.burst * 0.35;
    lip.material.color.setHex(HEX.acid).multiplyScalar(1.4 + st.burst * 2);

    slots.forEach((s, i) => {
      if (s.flip < 1) {
        s.delay -= dt;
        if (s.delay <= 0) {
          s.flip = Math.min(1, s.flip + dt * 3.2);
          if (s.flip >= 0.5 && s.value !== s.next) s.value = s.next;
        }
      }
      s.glow = Math.max(0, s.glow - dt * 0.7);
      const flipAngle = s.flip < 1 ? easeInOutCubic(s.flip) * Math.PI * 2 : 0;
      dummy.position.copy(s.p);
      dummy.lookAt(s.p.x * 2, s.p.y, s.p.z * 2);
      dummy.rotateY(Math.PI + flipAngle);
      dummy.updateMatrix();
      tiles.setMatrixAt(i, dummy.matrix);
      glyphIdx[i] = s.value;
      c.copy(colors.base).lerp(colors.hot, s.glow);
      tiles.setColorAt(i, c);
    });
    tiles.instanceMatrix.needsUpdate = true;
    tiles.instanceColor.needsUpdate = true;
    tileGeo.attributes.aGlyph.needsUpdate = true;

    // input letters circle the funnel; the newest one drops in
    const shown = inputTiles.filter((x) => x.m.visible);
    shown.forEach((x, i) => {
      const last = i === shown.length - 1;
      const a = (i / Math.max(shown.length, 1)) * Math.PI * 2 + t * 0.5;
      const ringP = new Vector3(Math.cos(a) * 1.55, 2.45 + Math.sin(t * 2 + i) * 0.05, Math.sin(a) * 1.55);
      if (last && st.drop < 1) {
        const k = easeInOutCubic(st.drop);
        x.m.position.lerpVectors(new Vector3(0, 2.9, 0.4), new Vector3(0, 1.4, 0), k);
        x.m.scale.setScalar(1 - k * 0.8);
      } else {
        x.m.position.copy(ringP);
        x.m.scale.setScalar(1);
      }
      x.m.lookAt(camera.position);
    });

    const pt = stage.pointer;
    root.rotation.y = damp(root.rotation.y, (pt.inside ? pt.nx * 0.5 : 0) + t * 0.12, 3, dt);
    root.rotation.x = damp(root.rotation.x, pt.inside ? -pt.ny * 0.08 : 0, 3, dt);
  });

  return {
    set,
    dispose() {
      off();
      atlas.texture.dispose();
      letters.dispose();
    },
  };
}
