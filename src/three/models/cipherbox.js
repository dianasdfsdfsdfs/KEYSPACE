import { AdditiveBlending, BoxGeometry, Color, EdgesGeometry, Group, LineBasicMaterial, LineSegments, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, PlaneGeometry } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { HEX } from '../core/palette.js';
import { addStudio } from '../core/studio.js';
import { createLetterSet } from '../core/letters.js';
import { keyGeometry, keyholeGeometry } from '../core/shapes.js';
import { neonBasic } from '../core/materials.js';
import { clamp, damp, easeInOutCubic, smoothstep } from '../core/ticker.js';
import { caesar } from '../../crypto/classical.js';

const WORDS = ['HELLO', 'SECRET', 'ATTACK', 'MONEY', 'PASSWORD'];
const CYCLE = 4.6;

export default async function createCipherBox(stage) {
  const { scene, camera } = stage;
  scene.environmentIntensity = 0.6;
  addStudio(stage, { floorY: -1.1, rim: 0.8 });
  const letters = createLetterSet({ scale: 0.72 });

  const fit = () => {
    const aspect = stage.width / stage.height;
    const t = Math.tan((camera.fov * Math.PI) / 360);
    const dist = Math.max(10.8 / 2 / (t * aspect), 3.8 / 2 / t);
    camera.position.set(0, dist * 0.22, dist);
    camera.lookAt(0, 0.15, 0);
    camera.updateProjectionMatrix();
  };
  camera.fov = 28;
  stage.onResize = fit;
  fit();

  const root = new Group();
  scene.add(root);

  // the machine
  const box = new Group();
  root.add(box);
  const bodyMat = new MeshPhysicalMaterial({ color: 0x0c1409, metalness: 0.7, roughness: 0.3, clearcoat: 1, emissive: new Color(HEX.acid), emissiveIntensity: 0.02 });
  box.add(new Mesh(new RoundedBoxGeometry(1.6, 1.6, 1.6, 5, 0.14), bodyMat));
  const edges = new LineSegments(new EdgesGeometry(new BoxGeometry(1.62, 1.62, 1.62)), new LineBasicMaterial({ color: new Color(HEX.acid).multiplyScalar(1.4), toneMapped: false, transparent: true, opacity: 0.7 }));
  box.add(edges);
  const hole = new Mesh(keyholeGeometry(0.17, 0.3, 0.02), neonBasic(HEX.yellow, 1.6));
  hole.position.set(0, 0.08, 0.8);
  box.add(hole);
  // slots on both sides where tiles go in and out
  for (const side of [-1, 1]) {
    const slot = new Mesh(new PlaneGeometry(0.12, 0.7), neonBasic(HEX.acid, 1.4));
    slot.position.set(side * 0.81, 0, 0);
    slot.rotation.y = (side * Math.PI) / 2;
    box.add(slot);
  }
  // the key sits in the keyhole, bow toward the viewer, and turns while the box works
  const keyPivot = new Group();
  keyPivot.position.set(0, 0.08, 0.8);
  box.add(keyPivot);
  const key = new Mesh(keyGeometry(), neonBasic(HEX.yellow, 1.3));
  key.scale.setScalar(0.3);
  key.rotation.y = Math.PI / 2;
  keyPivot.add(key);

  // letter tiles
  const tileGeo = new RoundedBoxGeometry(0.5, 0.62, 0.1, 3, 0.04);
  const tiles = Array.from({ length: 8 }, () => {
    const g = new Group();
    const body = new Mesh(tileGeo, new MeshPhysicalMaterial({ color: 0x111a0d, metalness: 0.4, roughness: 0.35, clearcoat: 1 }));
    const face = new Mesh(new PlaneGeometry(0.42, 0.42), new MeshBasicMaterial({ transparent: true, toneMapped: false, depthWrite: false }));
    face.position.z = 0.056;
    g.add(body, face);
    root.add(g);
    return { g, face };
  });
  const glow = new Mesh(new PlaneGeometry(3, 3), new MeshBasicMaterial({ color: new Color(HEX.acid), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }));
  glow.position.z = -0.9;
  root.add(glow);

  let t = 0;
  let wordIdx = -1;
  let word = '';
  let cipher = '';
  const off = stage.add((dt, time) => {
    t += dt;
    const k = t % CYCLE;
    const w = Math.floor(t / CYCLE) % WORDS.length;
    if (w !== wordIdx) {
      wordIdx = w;
      word = WORDS[w];
      cipher = caesar(word, 3);
    }
    const n = word.length;
    const gap = 0.58;
    const inside = smoothstep(1.7, 2.5, k) * (1 - smoothstep(2.5, 2.6, k));
    tiles.forEach((tile, i) => {
      if (i >= n) {
        tile.g.visible = false;
        return;
      }
      tile.g.visible = true;
      const startX = -3.1 - (n - 1 - i) * gap; // queue on the left, last letter nearest the box
      const endX = 1.55 + i * gap; // line up on the right
      const enterK = clamp((k - 0.6 - (n - 1 - i) * 0.12) / 1.0);
      const exitK = clamp((k - 2.5 - i * 0.12) / 1.0);
      const out = k > 2.5;
      let x;
      let s;
      if (!out) {
        x = startX + (-0.2 - startX) * easeInOutCubic(enterK);
        s = enterK > 0.85 ? 1 - (enterK - 0.85) / 0.15 : 1;
      } else {
        x = 0.2 + (endX - 0.2) * easeInOutCubic(exitK);
        s = exitK < 0.15 ? exitK / 0.15 : 1;
      }
      const fadeIn = clamp(k / 0.4);
      const fadeOut = 1 - clamp((k - CYCLE + 0.45) / 0.45);
      tile.g.position.set(x, Math.sin(time * 2 + i) * 0.04, 0);
      tile.g.scale.setScalar(Math.max(0.001, s * Math.min(fadeIn, fadeOut)));
      const ch = out ? cipher[i] : word[i];
      if (tile.ch !== ch) {
        tile.ch = ch;
        tile.face.material.map = letters.get(ch);
        tile.face.material.needsUpdate = true;
      }
      tile.face.material.color.setHex(out ? HEX.yellow : HEX.text).multiplyScalar(out ? 1.5 : 0.95);
      tile.g.rotation.y = out ? (1 - easeInOutCubic(Math.min(1, exitK * 2))) * Math.PI : 0;
    });
    // the machine works while the letters are inside
    const work = smoothstep(1.4, 1.9, k) * (1 - smoothstep(2.6, 3.2, k));
    bodyMat.emissiveIntensity = 0.02 + work * 0.25;
    edges.material.opacity = 0.6 + work * 0.4;
    glow.material.opacity = work * 0.12 + inside * 0.05;
    box.rotation.y = Math.sin(time * 0.6) * 0.15 + work * Math.sin(time * 30) * 0.02;
    key.position.z = 0.48 + (1 - smoothstep(0.9, 1.5, k)) * 0.5 + smoothstep(3.6, 4.3, k) * 0.5;
    keyPivot.rotation.z = work * Math.PI * 0.5;

    const pt = stage.pointer;
    root.rotation.y = damp(root.rotation.y, pt.inside ? pt.nx * 0.12 : 0, 3, dt);
    root.rotation.x = damp(root.rotation.x, pt.inside ? -pt.ny * 0.06 : 0, 3, dt);
  });

  return {
    dispose() {
      off();
      letters.dispose();
    },
  };
}
