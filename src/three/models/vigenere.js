import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  DoubleSide,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
  Object3D,
  RingGeometry,
} from 'three';
import { HEX } from '../core/palette.js';
import { addStudio } from '../core/studio.js';
import { createGlyphAtlas } from '../core/glyphs.js';
import { damp, smoothstep } from '../core/ticker.js';
import { ALPHABET } from '../../crypto/classical.js';

// The tabula recta: 26 × 26 shifted alphabets plus a header row (plaintext)
// and a header column (key letters). Encrypting = row of the key letter ×
// column of the plaintext letter.
const C = 0.33; // cell size
const N = 27; // header + 26
const OX = -((N - 1) * C) / 2;
const OZ = -((N - 1) * C) / 2;

export default async function createVigenere(stage, params, emit) {
  const { scene, camera } = stage;
  scene.environmentIntensity = 0.4;
  addStudio(stage, { floorY: -0.06, rim: 0.3 });

  const fit = () => {
    const aspect = stage.width / stage.height;
    const t = Math.tan((camera.fov * Math.PI) / 360);
    const dist = Math.max(10.2 / 2 / (t * aspect), 9.0 / 2 / t);
    camera.position.set(0, dist * 0.8, dist * 0.62);
    camera.lookAt(0, -0.4, 0.35);
    camera.updateProjectionMatrix();
  };
  camera.fov = 30;
  stage.onResize = fit;
  fit();

  const root = new Group();
  scene.add(root);

  const atlas = createGlyphAtlas(ALPHABET, { cell: 128, weight: 700, scale: 0.72 });

  // cells: index = r * N + c ; r = 0 header row, c = 0 header column
  const count = N * N - 1; // skip the top-left corner
  const cells = [];
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      if (r === 0 && c === 0) continue;
      let glyph;
      if (r === 0) glyph = c - 1; // plaintext header
      else if (c === 0) glyph = r - 1; // key header
      else glyph = (r - 1 + c - 1) % 26;
      cells.push({ r, c, glyph });
    }

  const bodyGeo = new BoxGeometry(C * 0.9, 0.08, C * 0.9);
  bodyGeo.translate(0, 0.04, 0);
  const bodyMat = new MeshStandardMaterial({ color: 0xffffff, metalness: 0.15, roughness: 0.78 });
  const bodies = new InstancedMesh(bodyGeo, bodyMat, count);
  const glyphGeo = new PlaneGeometry(C * 0.74, C * 0.74);
  glyphGeo.rotateX(-Math.PI / 2);
  const glyphIdx = new Float32Array(count);
  cells.forEach((cell, i) => (glyphIdx[i] = cell.glyph));
  glyphGeo.setAttribute('aGlyph', new InstancedBufferAttribute(glyphIdx, 1));
  const glyphMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uAtlas: { value: atlas.texture }, uGrid: { value: new Vector2(atlas.cols, atlas.rows) } },
    vertexShader: /* glsl */ `
      attribute float aGlyph;
      varying vec2 vUv;
      varying float vGlyph;
      varying vec3 vColor;
      void main() {
        vUv = uv;
        vGlyph = aGlyph;
        #ifdef USE_INSTANCING_COLOR
          vColor = instanceColor;
        #else
          vColor = vec3(1.0);
        #endif
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D uAtlas;
      uniform vec2 uGrid;
      varying vec2 vUv;
      varying float vGlyph;
      varying vec3 vColor;
      void main() {
        vec2 cell = vec2(mod(vGlyph, uGrid.x), floor(vGlyph / uGrid.x));
        vec2 uv = (cell + vec2(vUv.x, 1.0 - vUv.y)) / uGrid;
        float a = texture2D(uAtlas, uv).a;
        if (a < 0.04) discard;
        gl_FragColor = vec4(vColor * a, a);
      }
    `,
  });
  const glyphs = new InstancedMesh(glyphGeo, glyphMat, count);
  glyphs.renderOrder = 2;
  root.add(bodies, glyphs);

  const dummy = new Object3D();
  const base = cells.map((cell) => ({ x: OX + cell.c * C, z: OZ + cell.r * C }));
  const lift = new Float32Array(count);
  const colBody = new Color();
  const colGlyph = new Color();
  const BODY_DARK = new Color(0x0f160d);
  const BODY_HEAD = new Color(0x1d2a17);
  const BODY_ROW = new Color(0x3c5a14);
  const BODY_HIT = new Color(0x8a9a10);
  const G_DIM = new Color(HEX.text).multiplyScalar(0.22);
  const G_HEAD = new Color(HEX.text).multiplyScalar(0.7);
  const G_ROW = new Color(HEX.acid).multiplyScalar(1.15);
  const G_HIT = new Color(HEX.yellow).multiplyScalar(2.6);

  function writeMatrix(i, y) {
    dummy.position.set(base[i].x, y, base[i].z);
    dummy.updateMatrix();
    bodies.setMatrixAt(i, dummy.matrix);
    dummy.position.y = y + 0.085;
    dummy.updateMatrix();
    glyphs.setMatrixAt(i, dummy.matrix);
  }
  for (let i = 0; i < count; i++) {
    writeMatrix(i, 0);
    bodies.setColorAt(i, BODY_DARK);
    glyphs.setColorAt(i, G_DIM);
  }

  // marker ring that sits on the hit cell
  const ring = new Mesh(new RingGeometry(C * 0.62, C * 0.72, 40), new MeshBasicMaterial({ color: new Color(HEX.yellow).multiplyScalar(2), side: DoubleSide, transparent: true, depthWrite: false, toneMapped: false, blending: AdditiveBlending }));
  ring.rotation.x = -Math.PI / 2;
  root.add(ring);

  // a base slab under the board
  const slab = new Mesh(new BoxGeometry(N * C + 0.3, 0.12, N * C + 0.3), new MeshStandardMaterial({ color: 0x070b06, metalness: 0.7, roughness: 0.5 }));
  slab.position.y = -0.06;
  root.add(slab);

  const st = { steps: [], cursor: 0, phase: 0, row: 1, col: 1 };
  function set(p) {
    st.steps = (p.steps || []).filter((s) => s.keyChar);
    if (st.cursor >= st.steps.length) st.cursor = 0;
    st.phase = 0;
  }
  set(params);

  const STEP = 1.25;
  const off = stage.add((dt, t) => {
    const step = st.steps[st.cursor];
    if (step) {
      st.phase += dt;
      if (st.phase > STEP) {
        st.phase = 0;
        st.cursor = (st.cursor + 1) % st.steps.length;
        emit?.('cursor', st.cursor);
      }
    }
    const cur = st.steps[st.cursor];
    const row = cur ? cur.shift + 1 : 1; // key letter row
    const col = cur ? cur.plain.charCodeAt(0) - 64 : 1; // plaintext column
    const sweep = smoothstep(0.05, 0.6, st.phase);
    const hitOn = smoothstep(0.55, 0.7, st.phase);

    for (let i = 0; i < count; i++) {
      const { r, c } = cells[i];
      const header = r === 0 || c === 0;
      let level = 0; // 0 dim, 1 lit path, 2 hit
      if (r === row && c <= Math.round(col * sweep) && c > 0) level = 1;
      if (c === col && r <= Math.round(row * sweep) && r > 0) level = 1;
      if ((r === 0 && c === col) || (c === 0 && r === row)) level = 1;
      const hit = r === row && c === col && hitOn > 0.01;
      if (hit) level = 2;
      const targetLift = hit ? 0.42 * hitOn : level === 1 ? 0.06 : 0;
      lift[i] = damp(lift[i], targetLift, 10, dt);
      writeMatrix(i, lift[i]);
      if (level === 2) {
        colBody.copy(BODY_HIT);
        colGlyph.copy(G_HIT);
      } else if (level === 1) {
        colBody.copy(BODY_ROW);
        colGlyph.copy(G_ROW);
      } else {
        colBody.copy(header ? BODY_HEAD : BODY_DARK);
        colGlyph.copy(header ? G_HEAD : G_DIM);
      }
      bodies.setColorAt(i, colBody);
      glyphs.setColorAt(i, colGlyph);
    }
    bodies.instanceMatrix.needsUpdate = true;
    glyphs.instanceMatrix.needsUpdate = true;
    bodies.instanceColor.needsUpdate = true;
    glyphs.instanceColor.needsUpdate = true;

    ring.position.set(OX + col * C, 0.12 + 0.42 * hitOn, OZ + row * C);
    ring.scale.setScalar(1 + 0.6 * (1 - hitOn) + 0.06 * Math.sin(t * 6));
    ring.material.opacity = hitOn;

    const pt = stage.pointer;
    root.rotation.y = damp(root.rotation.y, pt.inside ? pt.nx * 0.16 : Math.sin(t * 0.25) * 0.06, 3, dt);
    root.rotation.x = damp(root.rotation.x, pt.inside ? -pt.ny * 0.05 : 0, 3, dt);
  });

  return {
    set,
    dispose() {
      off();
      atlas.texture.dispose();
    },
  };
}
