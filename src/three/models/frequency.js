import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RingGeometry,
  DoubleSide,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { HEX } from '../core/palette.js';
import { addStudio } from '../core/studio.js';
import { canvasTexture, FONT_MONO } from '../core/glyphs.js';
import { createLetterSet } from '../core/letters.js';
import { damp, smoothstep } from '../core/ticker.js';
import { ALPHABET, ENGLISH_FREQ, letterFrequencies, crackCaesar, mod } from '../../crypto/classical.js';

const S = 0.46; // slot spacing
const H = 0.36; // height per percent
const X0 = -12.5 * S;

function plateTexture() {
  return canvasTexture(2048, 256, (ctx, w, h) => {
    ctx.fillStyle = '#0b1009';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(182,255,0,0.25)';
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    const slot = w / 27;
    ctx.font = `700 ${Math.round(h * 0.42)}px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 26; i++) {
      const x = (i + 1) * slot;
      ctx.fillStyle = 'rgba(232,245,220,0.75)';
      ctx.fillText(ALPHABET[i], x, h * 0.62);
      ctx.fillStyle = 'rgba(182,255,0,0.35)';
      ctx.fillRect(x - 1, 14, 2, 22);
    }
  });
}

export default async function createFrequency(stage, params, emit) {
  const { scene, camera } = stage;
  scene.environmentIntensity = 0.45;
  addStudio(stage, { floorY: -0.02, rim: 0.35, glow: true });
  const letters = createLetterSet({ scale: 0.7 });

  const fit = () => {
    const aspect = stage.width / stage.height;
    const t = Math.tan((camera.fov * Math.PI) / 360);
    const dist = Math.max(12.9 / 2 / (t * aspect), 7.3 / 2 / t);
    camera.position.set(0, dist * 0.27, dist * 0.96);
    camera.lookAt(0, 2.05, 0);
    camera.updateProjectionMatrix();
  };
  camera.fov = 30;
  stage.onResize = fit;
  fit();

  const root = new Group();
  scene.add(root);

  // base plate with the plain alphabet engraved
  const plate = new Mesh(new RoundedBoxGeometry(27 * S, 0.14, 1.5, 4, 0.05), new MeshStandardMaterial({ color: 0x0d140b, metalness: 0.3, roughness: 0.75 }));
  plate.position.y = 0.06;
  root.add(plate);
  const plateLabels = new Mesh(new PlaneGeometry(27 * S, 1.5), new MeshBasicMaterial({ map: plateTexture(), transparent: true, toneMapped: false, color: new Color(0.9, 0.9, 0.9) }));
  plateLabels.rotation.x = -Math.PI / 2;
  plateLabels.position.y = 0.135;
  root.add(plateLabels);

  // reference "molds": English letter frequencies as wireframes
  const refGroup = new Group();
  root.add(refGroup);
  const refEdgeMat = new LineBasicMaterial({ color: new Color(HEX.yellow).multiplyScalar(1.1), transparent: true, opacity: 0.8, toneMapped: false });
  const refFillMat = new MeshBasicMaterial({ color: new Color(HEX.yellow), transparent: true, opacity: 0.05, depthWrite: false, blending: AdditiveBlending });
  const unitBox = new BoxGeometry(1, 1, 1);
  unitBox.translate(0, 0.5, 0);
  const unitEdges = new EdgesGeometry(unitBox);
  const refs = ENGLISH_FREQ.map((f, i) => {
    const g = new Group();
    const hgt = Math.max(0.05, f * H);
    const edge = new LineSegments(unitEdges, refEdgeMat.clone());
    const fill = new Mesh(unitBox, refFillMat.clone());
    g.add(edge, fill);
    g.scale.set(S * 0.86, hgt, 0.5);
    g.position.set(X0 + i * S, 0.14, -0.02);
    refGroup.add(g);
    return { g, edge, fill, h: hgt };
  });
  // halo rings marking E, T, A when the bars line up
  const halos = [4, 19, 0].map((i) => {
    const m = new Mesh(new RingGeometry(0.28, 0.33, 48), new MeshBasicMaterial({ color: new Color(HEX.yellow).multiplyScalar(2), transparent: true, opacity: 0, side: DoubleSide, toneMapped: false, depthWrite: false }));
    m.position.set(X0 + i * S, ENGLISH_FREQ[i] * H + 0.55, 0);
    root.add(m);
    return { m, i };
  });

  // ciphertext bars: solid, they slide until they fit the molds
  const barMat = new MeshPhysicalMaterial({
    color: new Color(HEX.acid).multiplyScalar(0.35),
    emissive: new Color(HEX.acid),
    emissiveIntensity: 0.45,
    metalness: 0.1,
    roughness: 0.55,
    clearcoat: 0.15,
    transparent: true,
    opacity: 0.92,
  });
  const barGeo = new BoxGeometry(1, 1, 1);
  barGeo.translate(0, 0.5, 0);
  const bars = Array.from({ length: 26 }, (_, c) => {
    const g = new Group();
    const body = new Mesh(barGeo, barMat.clone());
    const cap = new Mesh(new PlaneGeometry(0.34, 0.34), new MeshBasicMaterial({ map: letters.get(ALPHABET[c]), transparent: true, depthWrite: false, toneMapped: false, color: new Color(HEX.text).multiplyScalar(1.1) }));
    g.add(body);
    root.add(g, cap);
    return { g, body, cap, c, h: 0.05, target: 0.05 };
  });

  const st = { text: '', offset: 0, target: 0, crack: false, scanning: false, scanT: 0, scanK: 0, best: 0, scores: [], aligned: 0 };

  function set(p) {
    const text = p.text ?? st.text;
    if (text !== st.text) {
      st.text = text;
      const f = letterFrequencies(text);
      bars.forEach((b, i) => (b.target = Math.max(0.04, f[i] * H)));
      const res = crackCaesar(text);
      st.best = res.shift;
      st.scores = res.scores;
      st.target = 0;
      st.scanning = false;
    }
    if (p.crack && !st.crack) {
      st.scanning = true;
      st.scanK = 0;
      st.scanT = 0;
      st.target = 0;
    }
    if (!p.crack) {
      st.scanning = false;
      st.target = p.shift ?? 0;
    }
    st.crack = !!p.crack;
  }
  set(params);

  const off = stage.add((dt, t) => {
    if (st.scanning) {
      st.scanT += dt;
      if (st.scanT > 0.28) {
        st.scanT = 0;
        st.scanK++;
        if (st.scanK > 25) {
          st.scanning = false;
          st.target = st.best;
          emit?.('done', st.best);
        } else {
          st.target = st.scanK;
          emit?.('scan', { shift: st.scanK, score: st.scores[st.scanK] });
        }
      }
    }
    // unwrap so the bars slide the short way round
    let d = st.target - st.offset;
    if (!st.scanning) d = ((d % 26) + 39) % 26 - 13;
    st.offset += d * (1 - Math.exp(-(st.scanning ? 14 : 5) * dt));

    const aligned = st.crack && !st.scanning && Math.abs(st.offset - st.best) < 0.08 ? 1 : 0;
    st.aligned = damp(st.aligned, aligned, 4, dt);

    for (const b of bars) {
      b.h = damp(b.h, b.target, 6, dt);
      const p = mod(b.c - st.offset, 26);
      const x = p > 25.5 ? X0 + (p - 26) * S : X0 + p * S;
      const f = p > 25 ? smoothstep(0, 0.5, Math.abs(p - 25.5)) : 1;
      b.g.position.set(x, 0.14, 0);
      b.g.scale.set(S * 0.66, Math.max(0.001, b.h * f), 0.36);
      b.cap.position.set(x, 0.14 + b.h * f + 0.3, 0.02);
      b.cap.scale.setScalar(Math.max(0.001, f));
      b.cap.lookAt(camera.position.x, camera.position.y, camera.position.z);
      const em = 0.35 + st.aligned * 0.55 + Math.sin(t * 3 + b.c) * 0.04;
      b.body.material.emissiveIntensity = em;
    }
    refs.forEach((r) => {
      r.edge.material.opacity = 0.55 + st.aligned * 0.4;
      r.fill.material.opacity = 0.04 + st.aligned * 0.08;
    });
    halos.forEach((h) => {
      h.m.material.opacity = st.aligned * (0.7 + 0.3 * Math.sin(t * 4 + h.i));
      h.m.lookAt(camera.position);
      h.m.scale.setScalar(1 + 0.08 * Math.sin(t * 3 + h.i));
    });

    const pt = stage.pointer;
    root.rotation.y = damp(root.rotation.y, pt.inside ? pt.nx * 0.12 : Math.sin(t * 0.3) * 0.05, 3, dt);
    root.rotation.x = damp(root.rotation.x, pt.inside ? -pt.ny * 0.04 : 0, 3, dt);
  });

  return {
    set,
    dispose() {
      off();
      letters.dispose();
    },
  };
}
