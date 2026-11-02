import {
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Line,
  LineBasicMaterial,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  RepeatWrapping,
  TorusGeometry,
  Vector3,
} from 'three';
import { HEX } from '../core/palette.js';
import { addStudio } from '../core/studio.js';
import { neonBasic } from '../core/materials.js';
import { canvasTexture } from '../core/glyphs.js';
import { createLetterSet } from '../core/letters.js';
import { dragRotate } from '../core/interaction.js';
import { damp, smoothstep } from '../core/ticker.js';
import { scytale } from '../../crypto/classical.js';

const CELL = 0.95; // letter spacing along the strip
const PITCH = 0.68; // strip width = axial advance per turn
const SEG = 8; // strip segments per letter cell
const ROD_LEN = 6.0;
const ROD_Y = 0.7;
const FLAT_Y = -1.2;
const FLAT_Z = 1.5;
const MAX_LETTERS = 24;
const radiusFor = (k) => (k * CELL) / (2 * Math.PI);

function woodTexture() {
  const tex = canvasTexture(1024, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#2b1d12');
    g.addColorStop(0.5, '#3a2817');
    g.addColorStop(1, '#2b1d12');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {
      const y = Math.random() * h;
      const light = Math.random() > 0.55;
      ctx.strokeStyle = light ? `rgba(120,86,52,${0.15 + Math.random() * 0.25})` : `rgba(10,6,3,${0.2 + Math.random() * 0.35})`;
      ctx.lineWidth = 0.6 + Math.random() * 2.2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      const amp = 1 + Math.random() * 3;
      const f = 0.004 + Math.random() * 0.01;
      for (let x = 0; x <= w; x += 32) ctx.lineTo(x, y + Math.sin(x * f + i) * amp);
      ctx.stroke();
    }
  });
  tex.wrapS = tex.wrapT = RepeatWrapping;
  return tex;
}

function leatherTexture() {
  const tex = canvasTexture(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#4a321d';
    ctx.fillRect(0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 26;
      img.data[i] += n;
      img.data[i + 1] += n * 0.8;
      img.data[i + 2] += n * 0.6;
    }
    ctx.putImageData(img, 0, 0);
    // worn edges
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(15,9,4,0.65)');
    g.addColorStop(0.12, 'rgba(15,9,4,0)');
    g.addColorStop(0.88, 'rgba(15,9,4,0)');
    g.addColorStop(1, 'rgba(15,9,4,0.65)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  tex.wrapS = RepeatWrapping;
  return tex;
}

export default async function createScytale(stage, params, emit) {
  const { scene, camera } = stage;
  scene.environmentIntensity = 0.35;
  addStudio(stage, { floorY: -2.05, rim: 0.7 });
  const letters = createLetterSet({ scale: 0.76, weight: 800 });

  // Fit the whole rod (and the unwound strip) to the frame at any aspect.
  const fit = () => {
    const aspect = stage.width / stage.height;
    const t = Math.tan((camera.fov * Math.PI) / 360);
    const dist = Math.max(7.8 / 2 / (t * aspect), 5.6 / 2 / t);
    camera.position.set(0, 1.25, dist);
    camera.lookAt(0, -0.2, 0);
    camera.updateProjectionMatrix();
  };
  camera.fov = 30;
  stage.onResize = fit;
  fit();

  const root = new Group();
  scene.add(root);

  // ---------------- rod ----------------
  const rod = new Group();
  rod.position.y = ROD_Y;
  root.add(rod);
  const rodGeo = new CylinderGeometry(1, 1, ROD_LEN, 96, 1, false);
  rodGeo.rotateZ(Math.PI / 2);
  const wood = woodTexture();
  wood.repeat.set(1, 2);
  const rodMat = new MeshStandardMaterial({ color: 0xd8c2a6, map: wood, roughness: 0.68, metalness: 0.04 });
  const rodMesh = new Mesh(rodGeo, rodMat);
  rod.add(rodMesh);

  const brass = new MeshStandardMaterial({ color: 0x8a7032, metalness: 0.92, roughness: 0.32 });
  const capGeo = new CylinderGeometry(1, 1, 0.16, 64);
  capGeo.rotateZ(Math.PI / 2);
  const knobGeo = new CylinderGeometry(0.62, 1, 0.24, 64);
  knobGeo.rotateZ(Math.PI / 2);
  const bandGeo = new TorusGeometry(1, 0.03, 12, 96);
  bandGeo.rotateY(Math.PI / 2);
  const caps = [];
  for (const side of [-1, 1]) {
    const cap = new Mesh(capGeo, brass);
    cap.position.x = side * (ROD_LEN / 2 + 0.08);
    const knob = new Mesh(knobGeo, brass);
    knob.position.x = side * (ROD_LEN / 2 + 0.28);
    knob.rotation.z = side > 0 ? Math.PI : 0;
    const band = new Mesh(bandGeo, neonBasic(HEX.acid, 1.6));
    band.position.x = side * (ROD_LEN / 2 - 0.12);
    rod.add(cap, knob, band);
    caps.push(cap, knob, band);
  }

  // cradles holding the rod, like a museum display
  const cradleMat = new MeshStandardMaterial({ color: 0x1a2216, metalness: 0.85, roughness: 0.35 });
  const cradles = [];
  for (const side of [-1, 1]) {
    const g = new Group();
    g.position.set(side * (ROD_LEN / 2 - 0.9), 0, 0);
    const post = new Mesh(new CylinderGeometry(0.06, 0.09, 1, 24), cradleMat);
    const fork = new Mesh(new TorusGeometry(1, 0.05, 12, 48, Math.PI), cradleMat);
    fork.rotation.z = Math.PI;
    fork.rotation.y = Math.PI / 2;
    const foot = new Mesh(new CylinderGeometry(0.42, 0.5, 0.08, 48), cradleMat);
    const footRing = new Mesh(new TorusGeometry(0.46, 0.012, 8, 64), neonBasic(HEX.acid, 1.3));
    footRing.rotation.x = Math.PI / 2;
    g.add(post, fork, foot, footRing);
    root.add(g);
    cradles.push({ g, post, fork, foot, footRing });
  }
  function layoutCradles(r) {
    const floor = -2.05;
    for (const c of cradles) {
      const top = ROD_Y - r - 0.05;
      c.fork.scale.setScalar(r + 0.06);
      c.fork.position.y = ROD_Y;
      c.post.position.y = (top + floor) / 2 - (r + 0.06) * 0;
      c.post.scale.y = Math.max(0.01, ROD_Y - (r + 0.06) - floor);
      c.post.position.y = floor + c.post.scale.y / 2;
      c.foot.position.y = floor + 0.04;
      c.footRing.position.y = floor + 0.085;
    }
  }

  // ---------------- strip ----------------
  const maxSeg = MAX_LETTERS * SEG + 1;
  const stripPos = new Float32Array(maxSeg * 2 * 3);
  const stripUv = new Float32Array(maxSeg * 2 * 2);
  const index = [];
  for (let i = 0; i < maxSeg - 1; i++) {
    const a = i * 2;
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const stripGeo = new BufferGeometry();
  stripGeo.setAttribute('position', new BufferAttribute(stripPos, 3));
  stripGeo.setAttribute('uv', new BufferAttribute(stripUv, 2));
  stripGeo.setIndex(index);
  const leather = leatherTexture();
  const stripMat = new MeshStandardMaterial({ color: 0xffffff, map: leather, roughness: 0.88, metalness: 0.02, side: DoubleSide });
  const strip = new Mesh(stripGeo, stripMat);
  strip.frustumCulled = false;
  root.add(strip);

  const edgePos = [new Float32Array(maxSeg * 3), new Float32Array(maxSeg * 3)];
  const edgeMat = new LineBasicMaterial({ color: new Color(HEX.acid).multiplyScalar(0.9), transparent: true, opacity: 0.55, toneMapped: false });
  const edges = edgePos.map((arr) => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(arr, 3));
    const l = new Line(g, edgeMat);
    l.frustumCulled = false;
    root.add(l);
    return l;
  });

  // ---------------- letter tiles ----------------
  const tileGeo = new PlaneGeometry(1, 1);
  const tiles = [];
  for (let i = 0; i < MAX_LETTERS; i++) {
    const mat = new MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, color: new Color(HEX.acid) });
    const m = new Mesh(tileGeo, mat);
    m.renderOrder = 2;
    root.add(m);
    tiles.push(m);
  }

  const drag = dragRotate(stage, root, { idleYaw: 0.07, idlePitch: 0.02, maxPitch: 0.3, minPitch: -0.2, tilt: 0.06, yawLimit: 0.9 });

  // ---------------- state ----------------
  const st = { text: '', stripText: '', key: 3, rod: 3, unwound: false, u: 0, radius: radiusFor(3), angle: Math.PI / 2, row: 0, rowTimer: 0 };

  function set(p) {
    const key = p.key ?? st.key;
    const text = (p.text ?? st.text).toUpperCase().replace(/[^A-Z]/g, '').slice(0, MAX_LETTERS);
    const res = scytale(text || 'ATTACKATDAWN', key);
    const changed = res.strip !== st.stripText || key !== st.key;
    st.text = text;
    st.key = key;
    st.stripText = res.strip.slice(0, MAX_LETTERS);
    st.rod = p.rod ?? key;
    st.unwound = !!p.unwound;
    tiles.forEach((t, i) => {
      const ch = st.stripText[i];
      t.visible = !!ch;
      if (ch && t.userData.ch !== ch) {
        t.userData.ch = ch;
        t.material.map = letters.get(ch);
        t.material.needsUpdate = true;
      }
    });
    if (changed) {
      st.row = 0;
      st.rowTimer = 0;
      emit?.('row', 0);
    }
  }
  set(params);

  const X = new Vector3(1, 0, 0);
  const Z = new Vector3(0, 0, 1);
  const tmp = {
    w: new Vector3(),
    f: new Vector3(),
    acF: new Vector3(0, 1, 0),
    ac: new Vector3(),
    up: new Vector3(),
    n: new Vector3(),
    nf: new Vector3(),
    m: new Matrix4(),
    qW: new Quaternion(),
    qF: new Quaternion(),
  };
  const res = { p: new Vector3(), pr: 0, fc: CELL, k: 3, phi: 0 };

  // Position of the point at arc length s on the strip, between wound and flat.
  function mapPoint(s, L, N, out) {
    const R = st.radius + 0.016;
    out.k = (2 * Math.PI * R) / CELL;
    const span = (PITCH * L) / (2 * Math.PI * R);
    const phi = s / R + st.angle;
    const x = -span / 2 + (PITCH * s) / (2 * Math.PI * R);
    tmp.w.set(x, ROD_Y + R * Math.cos(phi), R * Math.sin(phi));
    const fc = Math.min(CELL, 6.3 / Math.max(N, 1));
    tmp.f.set(-(N * fc) / 2 + (s / CELL) * fc, FLAT_Y, FLAT_Z);
    const q = 1 - s / L;
    const pr = smoothstep(0, 1, st.u * 2.2 - q * 1.2);
    out.p.copy(tmp.w).lerp(tmp.f, pr);
    out.p.z += Math.sin(Math.PI * pr) * 1.1;
    out.p.y += Math.sin(Math.PI * pr) * 0.35;
    out.pr = pr;
    out.fc = fc;
    out.phi = phi;
    return out;
  }

  function updateStrip() {
    const N = st.stripText.length;
    const L = N * CELL;
    const segs = N * SEG;
    for (let i = 0; i <= segs; i++) {
      const s = (i / segs) * L;
      mapPoint(s, L, N, res);
      const width = PITCH * 0.97 * (1 - res.pr) + Math.max(0.42, PITCH * (res.fc / CELL)) * res.pr;
      tmp.ac.copy(X).lerp(tmp.acF, res.pr).normalize().multiplyScalar(width / 2);
      const a = i * 2;
      stripPos[a * 3] = res.p.x - tmp.ac.x;
      stripPos[a * 3 + 1] = res.p.y - tmp.ac.y;
      stripPos[a * 3 + 2] = res.p.z - tmp.ac.z;
      stripPos[a * 3 + 3] = res.p.x + tmp.ac.x;
      stripPos[a * 3 + 4] = res.p.y + tmp.ac.y;
      stripPos[a * 3 + 5] = res.p.z + tmp.ac.z;
      const uu = (i / segs) * N * 0.6;
      stripUv[a * 2] = uu;
      stripUv[a * 2 + 1] = 0;
      stripUv[a * 2 + 2] = uu;
      stripUv[a * 2 + 3] = 1;
      for (let e = 0; e < 2; e++) {
        const sign = e === 0 ? -1.003 : 1.003;
        edgePos[e][i * 3] = res.p.x + tmp.ac.x * sign;
        edgePos[e][i * 3 + 1] = res.p.y + tmp.ac.y * sign;
        edgePos[e][i * 3 + 2] = res.p.z + tmp.ac.z * sign;
      }
    }
    stripGeo.setDrawRange(0, segs * 6);
    stripGeo.attributes.position.needsUpdate = true;
    stripGeo.attributes.uv.needsUpdate = true;
    stripGeo.computeVertexNormals();
    for (const e of edges) {
      e.geometry.setDrawRange(0, segs + 1);
      e.geometry.attributes.position.needsUpdate = true;
    }

    const readable = Math.round(res.k) === st.key && st.u < 0.05;
    for (let i = 0; i < MAX_LETTERS; i++) {
      const t = tiles[i];
      if (i >= N) {
        t.visible = false;
        continue;
      }
      t.visible = true;
      mapPoint((i + 0.5) * CELL, L, N, res);
      const phi = res.phi;
      tmp.up.set(0, Math.sin(phi), -Math.cos(phi));
      tmp.n.set(0, Math.cos(phi), Math.sin(phi));
      tmp.m.makeBasis(X, tmp.up, tmp.n);
      tmp.qW.setFromRotationMatrix(tmp.m);
      t.quaternion.copy(tmp.qW).slerp(tmp.qF, res.pr);
      tmp.nf.copy(tmp.n).lerp(Z, res.pr).normalize();
      t.position.copy(res.p).addScaledVector(tmp.nf, 0.008 + res.pr * 0.004);
      const sc = 1 - res.pr + Math.max(0.66, res.fc / CELL) * res.pr;
      t.scale.set(PITCH * 0.84 * sc, CELL * 0.7 * sc, 1);
      const facing = Math.sin(phi) * (1 - res.pr);
      const front = facing > Math.cos(Math.PI / Math.max(3, res.k)) ? 1 : 0;
      const c = t.material.color;
      if (readable && front) c.setHex(HEX.yellow).multiplyScalar(1.7);
      else c.setHex(HEX.acid).multiplyScalar(0.95 + res.pr * 0.45);
      t.material.opacity = 0.3 + 0.7 * Math.max(res.pr, smoothstep(-0.25, 0.45, Math.sin(phi)));
    }
  }

  const off = stage.add((dt) => {
    st.u = damp(st.u, st.unwound ? 1 : 0, 2.2, dt);
    st.radius = damp(st.radius, radiusFor(st.rod), 4, dt);
    const r = st.radius;
    rodMesh.scale.set(1, r, r);
    for (const c of caps) c.scale.set(1, r + 0.04, r + 0.04);
    layoutCradles(r);

    if (!st.unwound) {
      st.rowTimer += dt;
      if (st.rowTimer > 2.6) {
        st.rowTimer = 0;
        st.row = (st.row + 1) % st.rod;
        emit?.('row', st.row);
      }
    }
    const target = Math.PI / 2 - (2 * Math.PI * st.row) / st.rod;
    let d = target - st.angle;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    st.angle += d * (1 - Math.exp(-5 * dt));
    rod.rotation.x = st.angle - Math.PI / 2;
    updateStrip();
  });

  return {
    set,
    dispose() {
      off();
      drag.dispose();
      letters.dispose();
    },
  };
}
