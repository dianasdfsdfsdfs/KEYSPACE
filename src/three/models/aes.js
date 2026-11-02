import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  CylinderGeometry,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PlaneGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { HEX } from '../core/palette.js';
import { addStudio } from '../core/studio.js';
import { labelTexture } from '../core/glyphs.js';
import { damp, easeInOutCubic, clamp } from '../core/ticker.js';

const GAP = 1.16;
const SIZE = 0.92;
const pos = (r, c) => ({ x: (c - 1.5) * GAP, y: (1.5 - r) * GAP });
const hex = (b) => b.toString(16).padStart(2, '0').toUpperCase();
const DUR = { addRoundKey: 1.5, subBytes: 1.35, shiftRows: 1.35, mixColumns: 1.5, input: 0.6 };

export default async function createAES(stage, params, emit) {
  const { scene, camera } = stage;
  scene.environmentIntensity = 0.6;
  addStudio(stage, { floorY: -3.0, rim: 0.7 });

  const fit = () => {
    const aspect = stage.width / stage.height;
    const t = Math.tan((camera.fov * Math.PI) / 360);
    const dist = Math.max(7.6 / 2 / (t * aspect), 7.4 / 2 / t);
    camera.position.set(dist * 0.36, dist * 0.24, dist * 0.92);
    camera.lookAt(0, -0.1, 0);
    camera.updateProjectionMatrix();
  };
  camera.fov = 30;
  stage.onResize = fit;
  fit();

  // texture cache for byte labels (white, tinted by material colour)
  const cache = new Map();
  const tex = (b) => {
    if (!cache.has(b)) cache.set(b, labelTexture(hex(b), { size: 128, scale: 0.52, weight: 700 }));
    return cache.get(b);
  };

  const root = new Group();
  scene.add(root);

  const bodyGeo = new RoundedBoxGeometry(SIZE, SIZE, SIZE, 4, 0.08);
  const edgeGeo = new EdgesGeometry(new BoxGeometry(SIZE + 0.01, SIZE + 0.01, SIZE + 0.01));
  const labelGeo = new PlaneGeometry(SIZE * 0.78, SIZE * 0.78);
  const cubes = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const g = new Group();
      const body = new Mesh(
        bodyGeo,
        new MeshPhysicalMaterial({ color: 0x0b1409, metalness: 0.15, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.15, emissive: new Color(HEX.acid), emissiveIntensity: 0.02 }),
      );
      const edges = new LineSegments(edgeGeo, new LineBasicMaterial({ color: new Color(HEX.acid).multiplyScalar(1.2), transparent: true, opacity: 0.7, toneMapped: false }));
      const label = new Mesh(labelGeo, new MeshBasicMaterial({ transparent: true, toneMapped: false, depthWrite: false, color: new Color(HEX.acid).multiplyScalar(1.3) }));
      label.position.z = SIZE / 2 + 0.006;
      const labelBack = new Mesh(labelGeo, label.material);
      labelBack.position.z = -SIZE / 2 - 0.006;
      labelBack.rotation.y = Math.PI;
      g.add(body, edges, label, labelBack);
      const p = pos(r, c);
      g.position.set(p.x, p.y, 0);
      root.add(g);
      cubes.push({ g, body, edges, label, r, c, value: 0, flash: 0 });
    }
  }
  const cubeAt = (r, c) => cubes[r * 4 + c];

  // round-key plate that sweeps through the state
  const plate = new Group();
  root.add(plate);
  const keyTiles = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const p = pos(r, c);
      const tile = new Mesh(new BoxGeometry(SIZE * 0.98, SIZE * 0.98, 0.05), new MeshBasicMaterial({ color: new Color(HEX.yellow), transparent: true, opacity: 0.12, depthWrite: false, blending: AdditiveBlending }));
      tile.position.set(p.x, p.y, 0);
      const lbl = new Mesh(labelGeo, new MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, color: new Color(HEX.yellow).multiplyScalar(1.6) }));
      lbl.position.set(p.x, p.y, 0.04);
      lbl.scale.setScalar(0.7);
      plate.add(tile, lbl);
      keyTiles.push({ tile, lbl });
    }
  }
  const plateFrame = new LineSegments(new EdgesGeometry(new BoxGeometry(4 * GAP, 4 * GAP, 0.06)), new LineBasicMaterial({ color: new Color(HEX.yellow).multiplyScalar(1.6), transparent: true, opacity: 0.9, toneMapped: false }));
  plate.add(plateFrame);
  plate.visible = false;

  // vertical "mixing" beams for MixColumns
  const beams = [0, 1, 2, 3].map((c) => {
    const m = new Mesh(new CylinderGeometry(0.03, 0.03, 4 * GAP, 8), new MeshBasicMaterial({ color: new Color(HEX.acid).multiplyScalar(2.4), transparent: true, opacity: 0, toneMapped: false }));
    m.position.set(pos(0, c).x, 0, 0);
    root.add(m);
    return m;
  });

  function setValue(cube, b) {
    cube.value = b;
    cube.label.material.map = tex(b);
    cube.label.material.needsUpdate = true;
  }
  function snap(state) {
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 4; c++) {
        const cube = cubeAt(r, c);
        const p = pos(r, c);
        cube.g.position.set(p.x, p.y, 0);
        cube.g.rotation.set(0, 0, 0);
        setValue(cube, state[r + 4 * c]);
      }
  }

  const st = { steps: [], index: 0, anim: null };

  function set(p) {
    const steps = p.steps || [];
    const index = p.index ?? 0;
    const newRun = steps !== st.steps && (steps.length !== st.steps.length || steps[0]?.state?.join() !== st.steps[0]?.state?.join() || steps.at(-1)?.state?.join() !== st.steps.at(-1)?.state?.join());
    st.steps = steps;
    if (!steps.length) return;
    if (newRun || index !== st.index + 1) {
      st.anim = null;
      st.index = index;
      snap(steps[index].state);
      plate.visible = false;
      return;
    }
    // animate one step forward
    const prev = steps[st.index];
    const next = steps[index];
    st.index = index;
    snap(prev.state);
    st.anim = { op: next.op, t: 0, dur: DUR[next.op] || 1.2, prev, next, swapped: false };
    if (next.op === 'addRoundKey') {
      keyTiles.forEach((k, i) => {
        const r = i >> 2;
        const c = i & 3;
        k.lbl.material.map = tex(next.key[r + 4 * c]);
        k.lbl.material.needsUpdate = true;
      });
      plate.visible = true;
    }
  }
  set(params);

  const off = stage.add((dt, t) => {
    const a = st.anim;
    if (a) {
      a.t += dt;
      const k = clamp(a.t / a.dur);
      const e = easeInOutCubic(k);
      if (a.op === 'subBytes') {
        for (const cube of cubes) {
          const delay = (cube.r + cube.c) * 0.06;
          const kk = clamp((k - delay) / (1 - 0.36));
          cube.g.rotation.x = easeInOutCubic(kk) * Math.PI * 2;
          if (kk > 0.5 && cube.value !== a.next.state[cube.r + 4 * cube.c]) {
            setValue(cube, a.next.state[cube.r + 4 * cube.c]);
            cube.flash = 1;
          }
        }
      } else if (a.op === 'shiftRows') {
        for (const cube of cubes) {
          const r = cube.r;
          if (r === 0) continue;
          const from = pos(r, cube.c);
          let toC = cube.c - r;
          const wraps = toC < 0;
          toC = (toC + 4) % 4;
          const to = pos(r, toC);
          const kk = clamp((k - r * 0.05) / 0.85);
          const ee = easeInOutCubic(kk);
          cube.g.position.x = from.x + (to.x - from.x) * ee;
          cube.g.position.z = wraps ? -Math.sin(ee * Math.PI) * 1.6 : Math.sin(ee * Math.PI) * 0.25;
        }
      } else if (a.op === 'mixColumns') {
        for (const cube of cubes) {
          const delay = cube.c * 0.12;
          const kk = clamp((k - delay) / (1 - 0.36));
          cube.g.rotation.y = easeInOutCubic(kk) * Math.PI * 2;
          const p = pos(cube.r, cube.c);
          cube.g.position.x = p.x + Math.sin(kk * Math.PI) * 0.0;
          cube.g.position.z = Math.sin(kk * Math.PI) * 0.35;
          if (kk > 0.5 && cube.value !== a.next.state[cube.r + 4 * cube.c]) {
            setValue(cube, a.next.state[cube.r + 4 * cube.c]);
            cube.flash = 1;
          }
        }
        beams.forEach((b, c) => (b.material.opacity = Math.sin(clamp((k - c * 0.12) / 0.64) * Math.PI) * 0.9));
      } else if (a.op === 'addRoundKey') {
        plate.position.z = -2.6 + e * 5.4;
        const crossed = plate.position.z > 0;
        keyTiles.forEach((kt) => {
          kt.tile.material.opacity = 0.12 * (1 - clamp((k - 0.75) / 0.25));
          kt.lbl.material.opacity = 1 - clamp((k - 0.75) / 0.25);
        });
        plateFrame.material.opacity = 0.9 * (1 - clamp((k - 0.75) / 0.25));
        if (crossed)
          for (const cube of cubes) {
            const v = a.next.state[cube.r + 4 * cube.c];
            if (cube.value !== v) {
              setValue(cube, v);
              cube.flash = 1.4;
            }
          }
      }
      if (k >= 1) {
        snap(a.next.state);
        plate.visible = false;
        beams.forEach((b) => (b.material.opacity = 0));
        st.anim = null;
        emit?.('stepDone', st.index);
      }
    }
    for (const cube of cubes) {
      cube.flash = Math.max(0, cube.flash - dt * 1.8);
      const isKey = a?.op === 'addRoundKey' && cube.flash > 0;
      cube.body.material.emissive.setHex(isKey ? HEX.yellow : HEX.acid);
      cube.body.material.emissiveIntensity = 0.03 + cube.flash * 0.35;
      cube.label.material.color.setHex(isKey ? HEX.yellow : HEX.acid).multiplyScalar(1.15 + cube.flash * 0.9);
    }
    const pt = stage.pointer;
    root.rotation.y = damp(root.rotation.y, (pt.inside ? pt.nx * 0.35 : Math.sin(t * 0.3) * 0.12) - 0.18, 3, dt);
    root.rotation.x = damp(root.rotation.x, pt.inside ? -pt.ny * 0.15 : 0.05, 3, dt);
  });

  return {
    set,
    dispose() {
      off();
      cache.forEach((t) => t.dispose());
    },
  };
}
