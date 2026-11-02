import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Points,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  Vector3,
  Quaternion,
  Euler,
} from 'three';
import { HEX } from '../core/palette.js';
import { addStudio } from '../core/studio.js';
import { labelTexture, FONT_MONO } from '../core/glyphs.js';
import { damp, clamp, smoothstep, easeInOutCubic } from '../core/ticker.js';
import { PlaneGeometry } from 'three';

const VOX = 0.15;

/** Voxelise a padlock: shell of the body + a thick arched shackle. */
function padlockVoxels() {
  const out = [];
  const bw = 2.2;
  const bh = 1.7;
  const bd = 0.75;
  for (let x = -bw / 2; x <= bw / 2 + 1e-6; x += VOX)
    for (let y = -bh / 2; y <= bh / 2 + 1e-6; y += VOX)
      for (let z = -bd / 2; z <= bd / 2 + 1e-6; z += VOX) {
        const edge = Math.abs(x) > bw / 2 - VOX * 0.9 || Math.abs(y) > bh / 2 - VOX * 0.9 || Math.abs(z) > bd / 2 - VOX * 0.9;
        if (!edge) continue;
        // keyhole
        if (z > 0 && Math.hypot(x, y - 0.1) < 0.2) continue;
        if (z > 0 && Math.abs(x) < 0.09 && y < 0.1 && y > -0.45) continue;
        out.push(new Vector3(x, y, z));
      }
  const R = 0.72;
  const tube = 0.17;
  const baseY = bh / 2 - 0.05;
  for (let x = -R - tube; x <= R + tube; x += VOX)
    for (let y = baseY; y <= baseY + 0.5 + R + tube; y += VOX)
      for (let z = -tube; z <= tube + 1e-6; z += VOX) {
        // legs + semicircle arch
        let d;
        const top = baseY + 0.5;
        if (y < top) d = Math.min(Math.hypot(x + R, z), Math.hypot(x - R, z));
        else d = Math.hypot(Math.hypot(x, y - top) - R, z);
        if (d < tube) out.push(new Vector3(x, y, z));
      }
  return out;
}

function makeQubit() {
  const g = new Group();
  const shell = new Mesh(new SphereGeometry(0.42, 16, 10), new MeshBasicMaterial({ color: new Color(HEX.acid).multiplyScalar(0.6), wireframe: true, transparent: true, opacity: 0.1, depthWrite: false }));
  const eq = new Mesh(new TorusGeometry(0.42, 0.006, 6, 64), new MeshBasicMaterial({ color: new Color(HEX.acid).multiplyScalar(1.4), toneMapped: false }));
  eq.rotation.x = Math.PI / 2;
  const core = new Mesh(new SphereGeometry(0.07, 16, 12), new MeshBasicMaterial({ color: new Color(HEX.yellow).multiplyScalar(2.5), toneMapped: false }));
  const arrow = new Group();
  const shaft = new Mesh(new CylinderGeometry(0.018, 0.018, 0.36, 8), new MeshBasicMaterial({ color: new Color(HEX.yellow).multiplyScalar(2), toneMapped: false }));
  shaft.position.y = 0.18;
  const head = new Mesh(new ConeGeometry(0.05, 0.1, 12), shaft.material);
  head.position.y = 0.39;
  arrow.add(shaft, head);
  g.add(shell, eq, core, arrow);
  return { g, arrow, shell };
}

export default async function createQuantum(stage, params, emit) {
  const { scene, camera } = stage;
  scene.environmentIntensity = 0.55;
  addStudio(stage, { floorY: -2.2, rim: 0.8 });

  const fit = () => {
    const aspect = stage.width / stage.height;
    const t = Math.tan((camera.fov * Math.PI) / 360);
    const dist = Math.max(8.4 / 2 / (t * aspect), 7.0 / 2 / t);
    camera.position.set(0, dist * 0.3, dist * 0.96);
    camera.lookAt(0, 0.25, 0);
    camera.updateProjectionMatrix();
  };
  camera.fov = 30;
  stage.onResize = fit;
  fit();

  const root = new Group();
  scene.add(root);

  // ---------- RSA voxel lock ----------
  const vox = padlockVoxels();
  const voxGeo = new BoxGeometry(VOX * 0.86, VOX * 0.86, VOX * 0.86);
  const voxMat = new MeshStandardMaterial({ color: 0x9a8a30, metalness: 0.6, roughness: 0.35, emissive: new Color(HEX.yellow), emissiveIntensity: 0.12 });
  const voxels = new InstancedMesh(voxGeo, voxMat, vox.length);
  root.add(voxels);
  const vState = vox.map((p) => ({
    home: p.clone().add(new Vector3(0, -0.35, 0)),
    pos: p.clone().add(new Vector3(0, -0.35, 0)),
    vel: new Vector3(),
    rot: new Euler(),
    spin: new Vector3((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8),
    scale: 1,
  }));
  const rsaLabel = new Mesh(new PlaneGeometry(1.6, 0.4), new MeshBasicMaterial({ map: labelTexture('RSA-2048', { w: 512, h: 128, size: 128, scale: 0.6 }), transparent: true, toneMapped: false, color: new Color(HEX.yellow).multiplyScalar(1.4), depthWrite: false }));
  rsaLabel.position.set(0, -1.55, 0.6);
  root.add(rsaLabel);

  // ---------- lattice lock (post-quantum) ----------
  const latticeGroup = new Group();
  root.add(latticeGroup);
  const b1 = new Vector3(0.44, 0.04, 0.06);
  const b2 = new Vector3(0.1, 0.42, -0.04);
  const b3 = new Vector3(-0.05, 0.08, 0.44);
  const nodes = [];
  for (let i = -3; i <= 3; i++)
    for (let j = -2; j <= 2; j++)
      for (let k = -1; k <= 1; k++) {
        const p = new Vector3().addScaledVector(b1, i).addScaledVector(b2, j).addScaledVector(b3, k);
        nodes.push({ p: p.add(new Vector3(0, -0.3, 0)), i, j, k });
      }
  // arch made of lattice points
  for (let a = 0; a <= 12; a++) {
    const th = (a / 12) * Math.PI;
    for (const k of [-1, 0, 1]) nodes.push({ p: new Vector3(Math.cos(th) * 0.95, 0.9 + Math.sin(th) * 0.95, k * 0.4), arch: a, k });
  }
  const nodePos = new Float32Array(nodes.length * 3);
  const nodeStart = nodes.map(() => new Vector3((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 7, (Math.random() - 0.5) * 6));
  const nodeGeo = new BufferGeometry();
  nodeGeo.setAttribute('position', new BufferAttribute(nodePos, 3));
  const nodeMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uScale: { value: 500 }, uColor: { value: new Color(HEX.acid).multiplyScalar(2.2) }, uOpacity: { value: 0 } },
    vertexShader: `uniform float uScale; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = 0.16 * uScale / -mv.z; }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; void main(){ float d = length(gl_PointCoord - 0.5); float a = pow(smoothstep(0.5, 0.0, d), 1.6) * uOpacity; gl_FragColor = vec4(uColor * a, a); }`,
  });
  latticeGroup.add(new Points(nodeGeo, nodeMat));
  // edges between neighbouring lattice nodes
  const idx = new Map(nodes.map((n, i) => [n.arch !== undefined ? `a${n.arch},${n.k}` : `${n.i},${n.j},${n.k}`, i]));
  const pairs = [];
  nodes.forEach((n, i) => {
    if (n.arch !== undefined) {
      const nx = idx.get(`a${n.arch + 1},${n.k}`);
      if (nx !== undefined) pairs.push([i, nx]);
      const nz = idx.get(`a${n.arch},${n.k + 1}`);
      if (nz !== undefined) pairs.push([i, nz]);
      return;
    }
    for (const [di, dj, dk] of [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ]) {
      const m = idx.get(`${n.i + di},${n.j + dj},${n.k + dk}`);
      if (m !== undefined) pairs.push([i, m]);
    }
  });
  const edgePos = new Float32Array(pairs.length * 6);
  const edgeGeo = new BufferGeometry();
  edgeGeo.setAttribute('position', new BufferAttribute(edgePos, 3));
  const edgeMat = new LineBasicMaterial({ color: new Color(HEX.acid).multiplyScalar(1.2), transparent: true, opacity: 0, toneMapped: false, blending: AdditiveBlending, depthWrite: false });
  latticeGroup.add(new LineSegments(edgeGeo, edgeMat));
  const pqLabel = new Mesh(new PlaneGeometry(1.6, 0.4), new MeshBasicMaterial({ map: labelTexture('ML-KEM', { w: 512, h: 128, size: 128, scale: 0.6 }), transparent: true, toneMapped: false, color: new Color(HEX.acid).multiplyScalar(1.5), depthWrite: false, opacity: 0 }));
  pqLabel.position.set(0, -1.55, 0.6);
  root.add(pqLabel);

  // ---------- qubits ----------
  const qubits = Array.from({ length: 5 }, (_, i) => ({ ...makeQubit(), phase: (i / 5) * Math.PI * 2, tilt: Math.random() * 2 }));
  qubits.forEach((q) => root.add(q.g));
  const beamGeo = new BufferGeometry();
  const beamPos = new Float32Array(5 * 2 * 3 + 5 * 2 * 3);
  beamGeo.setAttribute('position', new BufferAttribute(beamPos, 3));
  const beamMat = new LineBasicMaterial({ color: new Color(HEX.yellow).multiplyScalar(2.4), transparent: true, opacity: 0, toneMapped: false, blending: AdditiveBlending, depthWrite: false });
  const beams = new LineSegments(beamGeo, beamMat);
  beams.frustumCulled = false;
  root.add(beams);
  // sparks when beams hit the lattice
  const sparkGeo = new BufferGeometry();
  const sparkPos = new Float32Array(80 * 3);
  sparkGeo.setAttribute('position', new BufferAttribute(sparkPos, 3));
  const sparkMat = nodeMat.clone();
  sparkMat.uniforms = { uScale: nodeMat.uniforms.uScale, uColor: { value: new Color(HEX.yellow).multiplyScalar(2.6) }, uOpacity: { value: 0 } };
  const sparks = new Points(sparkGeo, sparkMat);
  sparks.frustumCulled = false;
  root.add(sparks);
  const sparkVel = Array.from({ length: 80 }, () => new Vector3());

  const st = { mode: 'rsa', t: 0, runId: -1, exploded: false, latticeK: 0, emitted: false };
  function resetVoxels() {
    vState.forEach((v) => {
      v.pos.copy(v.home);
      v.vel.set(0, 0, 0);
      v.rot.set(0, 0, 0);
      v.scale = 1;
    });
    st.exploded = false;
  }
  function set(p) {
    if (p.runId !== undefined && p.runId !== st.runId) {
      st.runId = p.runId;
      st.mode = p.mode || 'rsa';
      st.t = 0;
      st.emitted = false;
      if (st.mode === 'rsa' || st.mode === 'attack') resetVoxels();
    }
  }
  set(params);

  const dummy = new Object3D();
  const q = new Quaternion();
  const up = new Vector3(0, 1, 0);
  const tmp = new Vector3();
  const center = new Vector3(0, 0.2, 0);

  const off = stage.add((dt, time) => {
    st.t += dt;
    const t = st.t;
    const attack = st.mode === 'attack' || st.mode === 'pq';
    const charge = attack ? smoothstep(0.2, 1.4, t) : 0;
    const fire = attack ? smoothstep(1.3, 1.6, t) * (1 - smoothstep(3.6, 4.4, t)) : 0;

    // qubits orbit; when attacking they gather into a ring facing the lock
    qubits.forEach((qb, i) => {
      const a = qb.phase + time * 0.45;
      const orbit = new Vector3(Math.cos(a) * 3.1, Math.sin(a * 1.3 + qb.tilt) * 1.1 + 0.4, Math.sin(a) * 1.6);
      const ringA = (i / 5) * Math.PI * 2 + time * 0.8;
      const ring = new Vector3(Math.cos(ringA) * 2.4, 0.3 + Math.sin(ringA) * 1.6, 1.6);
      qb.g.position.lerpVectors(orbit, ring, easeInOutCubic(charge));
      // the state arrow precesses — superposition
      const theta = 0.9 + Math.sin(time * 1.3 + i) * 0.6 + charge * 0.6;
      const phi = time * (1.5 + i * 0.3);
      tmp.set(Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi));
      q.setFromUnitVectors(up, tmp);
      qb.arrow.quaternion.copy(q);
      qb.shell.material.opacity = 0.1 + charge * 0.06;
    });

    // entanglement beams: neighbour-to-neighbour + to the lock
    let k = 0;
    for (let i = 0; i < 5; i++) {
      const a = qubits[i].g.position;
      const b = qubits[(i + 1) % 5].g.position;
      beamPos.set([a.x, a.y, a.z, b.x, b.y, b.z], k);
      k += 6;
      beamPos.set([a.x, a.y, a.z, center.x, center.y, center.z], k);
      k += 6;
    }
    beamGeo.attributes.position.needsUpdate = true;
    beamMat.opacity = charge * 0.35 + fire * (0.6 + 0.4 * Math.sin(time * 40));

    // RSA lock: holds until the beams fire, then blows apart
    const rsaVisible = st.mode !== 'pq' || t < 0.01;
    if (st.mode === 'attack' && t > 1.6 && !st.exploded) {
      st.exploded = true;
      vState.forEach((v) => {
        v.vel.copy(v.pos).sub(center).normalize().multiplyScalar(2.5 + Math.random() * 4.5);
        v.vel.y += 1.5 + Math.random() * 2;
      });
      if (!st.emitted) {
        st.emitted = true;
        emit?.('broken');
      }
    }
    voxels.visible = rsaVisible;
    rsaLabel.visible = rsaVisible;
    if (rsaVisible) {
      vState.forEach((v, i) => {
        if (st.exploded) {
          v.vel.y -= 6 * dt;
          v.pos.addScaledVector(v.vel, dt);
          v.rot.x += v.spin.x * dt;
          v.rot.y += v.spin.y * dt;
          v.scale = Math.max(0, v.scale - dt * 0.45);
        }
        dummy.position.copy(v.pos);
        dummy.rotation.copy(v.rot);
        dummy.scale.setScalar(Math.max(0.0001, v.scale));
        dummy.updateMatrix();
        voxels.setMatrixAt(i, dummy.matrix);
      });
      voxels.instanceMatrix.needsUpdate = true;
      voxMat.emissiveIntensity = 0.12 + charge * 0.4 + (st.exploded ? 0.6 : 0);
      rsaLabel.material.opacity = st.exploded ? Math.max(0, 1 - (t - 1.6) * 1.5) : 1;
    }

    // lattice lock assembles in "pq" mode and shrugs the beams off
    const latTarget = st.mode === 'pq' ? 1 : 0;
    st.latticeK = damp(st.latticeK, latTarget, 2.2, dt);
    const L = st.latticeK;
    latticeGroup.visible = L > 0.01;
    pqLabel.visible = L > 0.01;
    if (latticeGroup.visible) {
      nodes.forEach((n, i) => {
        const delay = (i % 17) / 17;
        const kk = clamp((L * 1.4 - delay * 0.4) / 1);
        tmp.lerpVectors(nodeStart[i], n.p, easeInOutCubic(kk));
        nodePos[i * 3] = tmp.x;
        nodePos[i * 3 + 1] = tmp.y;
        nodePos[i * 3 + 2] = tmp.z;
      });
      nodeGeo.attributes.position.needsUpdate = true;
      pairs.forEach(([a, b], i) => {
        edgePos.set([nodePos[a * 3], nodePos[a * 3 + 1], nodePos[a * 3 + 2], nodePos[b * 3], nodePos[b * 3 + 1], nodePos[b * 3 + 2]], i * 6);
      });
      edgeGeo.attributes.position.needsUpdate = true;
      nodeMat.uniforms.uOpacity.value = L;
      edgeMat.opacity = L * (0.35 + fire * 0.4);
      pqLabel.material.opacity = L;
      latticeGroup.rotation.y = Math.sin(time * 0.4) * 0.35;
      if (st.mode === 'pq' && t > 1.6 && t < 1.7 && !st.emitted) {
        st.emitted = true;
        emit?.('held');
      }
    }
    nodeMat.uniforms.uScale.value = (stage.height * stage.dpr * 0.5) / Math.tan((camera.fov * Math.PI) / 360);

    // sparks bounce off the lattice while firing
    const sparking = st.mode === 'pq' && fire > 0.1;
    sparkMat.uniforms.uOpacity.value = damp(sparkMat.uniforms.uOpacity.value, sparking ? 1 : 0, 6, dt);
    for (let i = 0; i < 80; i++) {
      const v = sparkVel[i];
      tmp.set(sparkPos[i * 3], sparkPos[i * 3 + 1], sparkPos[i * 3 + 2]);
      if (sparking && (tmp.length() > 3.2 || Math.random() < dt * 1.2)) {
        tmp.set((Math.random() - 0.5) * 1.6, (Math.random() - 0.3) * 1.6, 0.6);
        v.set((Math.random() - 0.5) * 4, Math.random() * 3, 1 + Math.random() * 3);
      }
      tmp.addScaledVector(v, dt);
      sparkPos[i * 3] = tmp.x;
      sparkPos[i * 3 + 1] = tmp.y;
      sparkPos[i * 3 + 2] = tmp.z;
    }
    sparkGeo.attributes.position.needsUpdate = true;

    const pt = stage.pointer;
    root.rotation.y = damp(root.rotation.y, pt.inside ? pt.nx * 0.3 : Math.sin(time * 0.3) * 0.12, 3, dt);
    root.rotation.x = damp(root.rotation.x, pt.inside ? -pt.ny * 0.1 : 0, 3, dt);
  });

  return { set, dispose: off };
}
