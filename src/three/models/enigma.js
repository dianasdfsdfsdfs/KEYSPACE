import {
  AdditiveBlending,
  BoxGeometry,
  CircleGeometry,
  Color,
  CurvePath,
  CylinderGeometry,
  DoubleSide,
  Group,
  LineCurve3,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  QuadraticBezierCurve3,
  RepeatWrapping,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  CatmullRomCurve3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { HEX } from '../core/palette.js';
import { addStudio } from '../core/studio.js';
import { canvasTexture, FONT_MONO } from '../core/glyphs.js';
import { createLetterSet } from '../core/letters.js';
import { damp, easeOutCubic, clamp } from '../core/ticker.js';

const ROWS = ['QWERTZUIO', 'ASDFGHJK', 'PYXCVBNML'];
const KEY_DX = 0.72;
const KEY_Z = [0.95, 1.66, 2.37];
const LAMP_Z = [-1.3, -0.66, -0.02];
const CASE = { w: 7.4, d: 6.6, h: 1.5 };
const ROTOR_R = 0.7;
const ROTOR_W = 0.36;
const A = (Math.PI * 2) / 26;
const CONTACT_R = 0.5;

function rowPos(letter) {
  for (let r = 0; r < 3; r++) {
    const i = ROWS[r].indexOf(letter);
    if (i >= 0) return { r, x: (i - (ROWS[r].length - 1) / 2) * KEY_DX };
  }
  return null;
}

function woodTexture() {
  const tex = canvasTexture(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = '#2a1b10';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) {
      const y = Math.random() * h;
      ctx.strokeStyle = Math.random() > 0.5 ? `rgba(110,74,40,${0.12 + Math.random() * 0.2})` : `rgba(8,4,2,${0.2 + Math.random() * 0.3})`;
      ctx.lineWidth = 0.5 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= w; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.006 + i) * 3);
      ctx.stroke();
    }
  });
  tex.wrapS = tex.wrapT = RepeatWrapping;
  return tex;
}

/** Letter ring around a rotor: letters run around the circumference. */
function rotorRingTexture() {
  return canvasTexture(2048, 160, (ctx, w, h) => {
    ctx.fillStyle = '#8f8a78';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#12110d';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(h * 0.56)}px ${FONT_MONO}`;
    for (let k = 0; k < 26; k++) {
      const u = (0.75 + k / 26) % 1;
      const x = u * w;
      ctx.save();
      ctx.translate(x, h / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(String.fromCharCode(65 + k), 0, 2);
      ctx.restore();
      ctx.fillRect(x + w / 52 - 1, 0, 2, h * 0.18);
      ctx.fillRect(x + w / 52 - 1, h * 0.82, 2, h * 0.18);
    }
  });
}

/** Rotor face with 26 brass contacts. */
function contactFaceTexture() {
  return canvasTexture(512, 512, (ctx, w) => {
    const c = w / 2;
    ctx.fillStyle = '#141810';
    ctx.beginPath();
    ctx.arc(c, c, c, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(182,255,0,0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(c, c, c * 0.92, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 26; i++) {
      const a = i * A;
      const r = (CONTACT_R / ROTOR_R) * c;
      ctx.fillStyle = '#c9a54c';
      ctx.beginPath();
      ctx.arc(c + Math.sin(a) * r, c - Math.cos(a) * r, 11, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#5a4a24';
    ctx.beginPath();
    ctx.arc(c, c, 46, 0, Math.PI * 2);
    ctx.fill();
  });
}

function plateTexture(text) {
  return canvasTexture(1024, 160, (ctx, w, h) => {
    ctx.fillStyle = '#8a7438';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#3d3216';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = '#231c0b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(h * 0.34)}px ${FONT_MONO}`;
    ctx.fillText(text, w / 2, h / 2 + 3);
  });
}

export default async function createEnigma(stage, params, emit) {
  const { scene, camera } = stage;
  scene.environmentIntensity = 0.5;
  const studio = addStudio(stage, { floorY: -1.52, rim: 0.6, key: 0.75 });
  const letters = createLetterSet({ scale: 0.62, weight: 700 });

  const fit = () => {
    const aspect = stage.width / stage.height;
    const t = Math.tan((camera.fov * Math.PI) / 360);
    const dist = Math.max(9.6 / 2 / (t * aspect), 8.9 / 2 / t);
    camera.position.set(0, dist * 0.8, dist * 0.62);
    camera.lookAt(0, 0.35, -0.15);
    camera.updateProjectionMatrix();
  };
  camera.fov = 30;
  stage.onResize = fit;
  fit();

  const root = new Group();
  scene.add(root);

  // ---------- case ----------
  const fadeables = [];
  const fade = (m) => {
    m.transparent = true;
    m.userData.baseOpacity = m.opacity ?? 1;
    fadeables.push(m);
    return m;
  };
  const wood = woodTexture();
  wood.repeat.set(2, 1);
  const caseMat = fade(new MeshStandardMaterial({ color: 0xc8a888, map: wood, roughness: 0.6, metalness: 0.05 }));
  const caseMesh = new Mesh(new RoundedBoxGeometry(CASE.w, CASE.h, CASE.d, 4, 0.12), caseMat);
  caseMesh.position.y = -CASE.h / 2;
  root.add(caseMesh);
  const plateMat = fade(new MeshStandardMaterial({ color: 0x15180f, roughness: 0.82, metalness: 0.35 }));
  const topPlate = new Mesh(new BoxGeometry(CASE.w - 0.36, 0.06, CASE.d - 0.36), plateMat);
  topPlate.position.y = 0.0;
  root.add(topPlate);
  // lid, opened back
  const lid = new Group();
  lid.position.set(0, 0, -CASE.d / 2);
  root.add(lid);
  const lidMesh = new Mesh(new RoundedBoxGeometry(CASE.w, 0.3, 2.6, 4, 0.1), caseMat);
  lidMesh.position.set(0, 1.3, -0.12);
  lidMesh.rotation.x = -Math.PI / 2 + 0.08;
  lid.add(lidMesh);
  const brassPlate = new Mesh(new PlaneGeometry(2.8, 0.44), new MeshStandardMaterial({ map: plateTexture('ROTOR CIPHER · 3 ROTORS · UKW-B'), metalness: 0.75, roughness: 0.35 }));
  brassPlate.position.set(0, 1.55, 0.06);
  brassPlate.rotation.x = 0.08;
  lid.add(brassPlate);
  fadeables.push(brassPlate.material);
  brassPlate.material.transparent = true;

  // ---------- keyboard ----------
  const keyCapMat = new MeshStandardMaterial({ color: 0x0b0d09, roughness: 0.45, metalness: 0.2 });
  const keyRimMat = new MeshStandardMaterial({ color: 0xa8a28a, roughness: 0.25, metalness: 0.95 });
  const keyCapGeo = new CylinderGeometry(0.25, 0.25, 0.1, 40);
  const keyRimGeo = new TorusGeometry(0.255, 0.028, 10, 40);
  keyRimGeo.rotateX(Math.PI / 2);
  const stemGeo = new CylinderGeometry(0.05, 0.05, 0.36, 12);
  const keys = {};
  const keyPickables = [];
  for (let r = 0; r < 3; r++) {
    for (const ch of ROWS[r]) {
      const { x } = rowPos(ch);
      const g = new Group();
      g.position.set(x, 0.28, KEY_Z[r]);
      const stem = new Mesh(stemGeo, keyRimMat);
      stem.position.y = -0.18;
      const cap = new Mesh(keyCapGeo, keyCapMat);
      const rim = new Mesh(keyRimGeo, keyRimMat);
      rim.position.y = 0.03;
      const face = new Mesh(new CircleGeometry(0.2, 32), new MeshBasicMaterial({ map: letters.get(ch), transparent: true, toneMapped: false, color: new Color(0.95, 0.95, 0.88) }));
      face.rotation.x = -Math.PI / 2;
      face.position.y = 0.052;
      g.add(stem, cap, rim, face);
      cap.userData.letter = ch;
      face.userData.letter = ch;
      keyPickables.push(cap, face);
      root.add(g);
      keys[ch] = { g, face, press: 0 };
    }
  }

  // ---------- lampboard ----------
  const lampBaseMat = new MeshStandardMaterial({ color: 0x0c0f0a, roughness: 0.6, metalness: 0.4 });
  const lamps = {};
  for (let r = 0; r < 3; r++) {
    for (const ch of ROWS[r]) {
      const { x } = rowPos(ch);
      const base = new Mesh(new CylinderGeometry(0.25, 0.27, 0.06, 36), lampBaseMat);
      base.position.set(x, 0.05, LAMP_Z[r]);
      const glassMat = new MeshBasicMaterial({ map: letters.get(ch), transparent: true, toneMapped: false, color: new Color(0x2a3020) });
      const glass = new Mesh(new CircleGeometry(0.21, 32), glassMat);
      glass.rotation.x = -Math.PI / 2;
      glass.position.set(x, 0.085, LAMP_Z[r]);
      const halo = new Mesh(
        new CircleGeometry(0.42, 32),
        new MeshBasicMaterial({ color: new Color(HEX.yellow), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }),
      );
      halo.rotation.x = -Math.PI / 2;
      halo.position.set(x, 0.09, LAMP_Z[r]);
      root.add(base, glass, halo);
      lamps[ch] = { glass, halo, lit: 0 };
    }
  }

  // ---------- plugboard (front face) ----------
  const sockMat = new MeshStandardMaterial({ color: 0x050605, roughness: 0.4, metalness: 0.6 });
  const sockRimMat = new MeshStandardMaterial({ color: 0x9a9480, roughness: 0.3, metalness: 0.9 });
  for (let r = 0; r < 3; r++) {
    for (const ch of ROWS[r]) {
      const { x } = rowPos(ch);
      for (const dx of [-0.07, 0.07]) {
        const s = new Mesh(new CylinderGeometry(0.035, 0.035, 0.04, 12), sockMat);
        s.rotation.x = Math.PI / 2;
        s.position.set(x + dx, -0.42 - r * 0.32, CASE.d / 2 + 0.01);
        root.add(s);
      }
      const rim = new Mesh(new TorusGeometry(0.13, 0.012, 6, 24), sockRimMat);
      rim.position.set(x, -0.42 - r * 0.32, CASE.d / 2 + 0.01);
      root.add(rim);
    }
  }

  // ---------- rotors ----------
  const stack = new Group(); // rotors + reflector + entry wheel; explodes in "inside view"
  root.add(stack);
  const ringTex = rotorRingTexture();
  const faceTex = contactFaceTexture();
  const rotorBodyMat = new MeshStandardMaterial({ color: 0x1b1d16, roughness: 0.4, metalness: 0.7 });
  const ringMat = new MeshStandardMaterial({ map: ringTex, roughness: 0.62, metalness: 0.05 });
  const faceMat = new MeshBasicMaterial({ map: faceTex, toneMapped: false, color: new Color(0.9, 0.9, 0.9), side: DoubleSide });
  const toothMat = new MeshStandardMaterial({ color: 0x6f6a58, roughness: 0.48, metalness: 0.85 });

  function makeRotor() {
    const g = new Group();
    const spin = new Group(); // rotates with the rotor position
    g.add(spin);
    const body = new CylinderGeometry(ROTOR_R * 0.96, ROTOR_R * 0.96, ROTOR_W, 48);
    body.rotateZ(-Math.PI / 2);
    spin.add(new Mesh(body, rotorBodyMat));
    const ring = new CylinderGeometry(ROTOR_R, ROTOR_R, ROTOR_W * 0.55, 96, 1, true);
    ring.rotateZ(-Math.PI / 2);
    spin.add(new Mesh(ring, ringMat));
    // serrated thumb wheel on the left side
    const wheel = new CylinderGeometry(ROTOR_R * 1.12, ROTOR_R * 1.12, 0.08, 48);
    wheel.rotateZ(-Math.PI / 2);
    const wheelMesh = new Mesh(wheel, toothMat);
    wheelMesh.position.x = -ROTOR_W / 2 - 0.04;
    spin.add(wheelMesh);
    const toothGeo = new BoxGeometry(0.08, 0.08, 0.07);
    for (let i = 0; i < 26; i++) {
      const t = new Mesh(toothGeo, toothMat);
      const a = i * A;
      t.position.set(-ROTOR_W / 2 - 0.04, Math.cos(a) * ROTOR_R * 1.16, Math.sin(a) * ROTOR_R * 1.16);
      t.rotation.x = a;
      spin.add(t);
    }
    // contact faces (static relative to the machine: they show absolute contacts)
    for (const side of [-1, 1]) {
      const f = new Mesh(new CircleGeometry(ROTOR_R * 0.95, 48), faceMat);
      f.rotation.y = (side * Math.PI) / 2;
      if (side > 0) f.scale.x = -1; // keep the pin layout identical on both faces
      f.position.x = side * (ROTOR_W / 2 + (side < 0 ? 0.085 : 0.002));
      g.add(f);
    }
    return { g, spin };
  }
  const rotors = [makeRotor(), makeRotor(), makeRotor()]; // L, M, R
  rotors.forEach((r) => stack.add(r.g));
  const discGeo = new CylinderGeometry(ROTOR_R, ROTOR_R, 0.14, 48);
  discGeo.rotateZ(-Math.PI / 2);
  const reflector = new Mesh(discGeo, new MeshStandardMaterial({ color: 0x3a3a2c, roughness: 0.35, metalness: 0.85 }));
  const entry = new Mesh(discGeo, new MeshStandardMaterial({ color: 0x3a3a2c, roughness: 0.35, metalness: 0.85 }));
  stack.add(reflector, entry);
  const refFace = new Mesh(new CircleGeometry(ROTOR_R * 0.95, 48), faceMat);
  refFace.rotation.y = Math.PI / 2;
  refFace.scale.x = -1;
  reflector.add(refFace);
  refFace.position.x = 0.072;
  const entFace = new Mesh(new CircleGeometry(ROTOR_R * 0.95, 48), faceMat);
  entFace.rotation.y = -Math.PI / 2;
  entFace.position.x = -0.072;
  entry.add(entFace);

  // window plate over the rotors
  const windowPlate = new Group();
  root.add(windowPlate);
  const wp = new Mesh(new BoxGeometry(2.7, 0.08, 0.7), fade(new MeshStandardMaterial({ color: 0x23261c, metalness: 0.6, roughness: 0.5 })));
  wp.position.set(0, 0.06, -2.55 + 0.75);
  windowPlate.add(wp);

  // layouts: [L, M, R, UKW, ETW] x positions + stack placement
  const NORMAL = { x: [-0.62, 0, 0.62, -1.2, 1.2], pos: new Vector3(0, -0.28, -2.55), rotY: 0, scale: 1 };
  const XRAY = { x: [-0.95, 0.05, 1.05, -1.95, 2.0], pos: new Vector3(0, 1.8, -1.5), rotY: -0.5, scale: 1.12 };

  // ---------- signal path ----------
  const pathGroup = new Group();
  stack.add(pathGroup);
  const fwdMat = new MeshBasicMaterial({ color: new Color(HEX.acid).multiplyScalar(2.2), toneMapped: false, transparent: true, opacity: 0 });
  const backMat = new MeshBasicMaterial({ color: new Color(HEX.yellow).multiplyScalar(2.2), toneMapped: false, transparent: true, opacity: 0 });
  let fwdTube = null;
  let backTube = null;
  const spark = new Mesh(new SphereGeometry(0.07, 16, 12), new MeshBasicMaterial({ color: new Color(1, 1, 0.8).multiplyScalar(4), toneMapped: false }));
  spark.visible = false;
  stack.add(spark);
  let fullCurve = null;

  const contact = (x, idx) => new Vector3(x, Math.cos(idx * A) * CONTACT_R, Math.sin(idx * A) * CONTACT_R);

  function buildPath(path, layout) {
    if (fwdTube) {
      pathGroup.remove(fwdTube, backTube);
      fwdTube.geometry.dispose();
      backTube.geometry.dispose();
    }
    const v = Object.fromEntries(path.map((p) => [p.stage, p.value]));
    const [xL, xM, xR, xU, xE] = layout.x;
    const hw = ROTOR_W / 2 + 0.01;
    const fwd = [
      contact(xE - 0.08, v['plug-in']),
      contact(xR + hw, v['plug-in']),
      contact(xR - hw, v.R),
      contact(xM + hw, v.R),
      contact(xM - hw, v.M),
      contact(xL + hw, v.M),
      contact(xL - hw, v.L),
      contact(xU + 0.08, v.L),
    ];
    const back = [
      contact(xU + 0.08, v.UKW),
      contact(xL - hw, v.UKW),
      contact(xL + hw, v['L-back']),
      contact(xM - hw, v['L-back']),
      contact(xM + hw, v['M-back']),
      contact(xR - hw, v['M-back']),
      contact(xR + hw, v['R-back']),
      contact(xE - 0.08, v['R-back']),
    ];
    const poly = (pts) => {
      const cp = new CurvePath();
      for (let i = 0; i < pts.length - 1; i++) cp.add(new LineCurve3(pts[i], pts[i + 1]));
      return cp;
    };
    const fwdPath = poly(fwd);
    const turn = new QuadraticBezierCurve3(fwd.at(-1), new Vector3(xU - 0.05, (fwd.at(-1).y + back[0].y) / 2, (fwd.at(-1).z + back[0].z) / 2), back[0]);
    fwdPath.add(turn);
    const backPath = poly(back);
    fwdTube = new Mesh(new TubeGeometry(fwdPath, 260, 0.032, 8, false), fwdMat);
    backTube = new Mesh(new TubeGeometry(backPath, 220, 0.032, 8, false), backMat);
    pathGroup.add(fwdTube, backTube);
    fullCurve = new CurvePath();
    fwdPath.curves.forEach((c) => fullCurve.add(c));
    backPath.curves.forEach((c) => fullCurve.add(c));
  }

  // ---------- state ----------
  const st = {
    positions: [0, 0, 0],
    shown: [0, 0, 0],
    xray: 0,
    xrayTarget: 0,
    lastId: -1,
    flow: 1,
    litLetter: null,
    pathData: null,
  };

  function set(p) {
    if (p.positions) st.positions = [...p.positions].map((c) => c.charCodeAt(0) - 65);
    st.xrayTarget = p.xray ? 1 : 0;
    const last = p.last;
    if (last && last.id !== st.lastId) {
      st.lastId = last.id;
      st.pathData = last.path;
      st.flow = 0;
      st.litLetter = last.output;
      keys[last.input].press = 1;
      buildPath(last.path, XRAY);
      // un-unwrap the rotor animation so they always turn forward
      for (let i = 0; i < 3; i++) if (st.positions[i] < st.shown[i] - 13) st.shown[i] -= 26;
    }
    if (p.resetId !== undefined && p.resetId !== st.resetId) {
      st.resetId = p.resetId;
      st.shown = [...st.positions];
      st.litLetter = null;
    }
  }
  set(params);
  st.shown = [...st.positions];

  // click a key
  stage.onPointerDown = () => {
    const hit = stage.pick(keyPickables)[0];
    if (hit) emit?.('key', hit.object.userData.letter);
  };
  stage.onPointerMove = () => {
    stage.canvas.style.cursor = stage.pick(keyPickables).length ? 'pointer' : 'default';
  };

  const tmpV = new Vector3();
  const off = stage.add((dt, t) => {
    st.xray = damp(st.xray, st.xrayTarget, 3.2, dt);
    const x = st.xray;
    const e = easeOutCubic(x);

    // explode the rotor stack
    stack.position.lerpVectors(NORMAL.pos, XRAY.pos, e);
    stack.rotation.y = NORMAL.rotY + (XRAY.rotY - NORMAL.rotY) * e;
    stack.scale.setScalar(NORMAL.scale + (XRAY.scale - NORMAL.scale) * e);
    const parts = [rotors[0].g, rotors[1].g, rotors[2].g, reflector, entry];
    parts.forEach((p, i) => (p.position.x = NORMAL.x[i] + (XRAY.x[i] - NORMAL.x[i]) * e));
    for (const m of fadeables) m.opacity = (m.userData.baseOpacity ?? 1) * (1 - 0.82 * x);
    windowPlate.visible = x < 0.98;

    // rotors step forward with a mechanical ease
    for (let i = 0; i < 3; i++) {
      st.shown[i] = damp(st.shown[i], st.positions[i], 9, dt);
      rotors[i].spin.rotation.x = -st.shown[i] * A;
    }

    // current flows along the wiring, then the lamp lights
    st.flow = Math.min(1.6, st.flow + dt * (x > 0.5 ? 1.75 : 2.4));
    const flowT = clamp(st.flow / 1.2);
    fwdMat.opacity = x * clamp(flowT * 2.2);
    backMat.opacity = x * clamp(flowT * 2.2 - 1.0);
    if (fullCurve && x > 0.3 && st.flow < 1.25) {
      spark.visible = true;
      fullCurve.getPointAt(Math.min(0.999, flowT), tmpV);
      spark.position.copy(tmpV);
    } else spark.visible = false;
    const lampReady = x > 0.5 ? flowT >= 0.98 : st.flow > 0.25;

    for (const ch in lamps) {
      const l = lamps[ch];
      const target = ch === st.litLetter && lampReady ? 1 : 0;
      l.lit = damp(l.lit, target, target ? 16 : 3, dt);
      l.glass.material.color.setRGB(0.16 + l.lit * 2.4, 0.19 + l.lit * 2.5, 0.12 + l.lit * 0.2);
      l.halo.material.opacity = l.lit * 0.55;
    }
    for (const ch in keys) {
      const k = keys[ch];
      k.press = Math.max(0, k.press - dt * 3.2);
      k.g.position.y = 0.28 - Math.sin(Math.min(1, k.press) * Math.PI) * 0.12;
      k.face.material.color.setRGB(0.95 + k.press * 0.5, 0.95 + k.press * 0.9, 0.88);
    }

    const pt = stage.pointer;
    root.rotation.y = damp(root.rotation.y, (pt.inside ? pt.nx * 0.14 : Math.sin(t * 0.25) * 0.05) + x * 0.12, 3, dt);
    root.rotation.x = damp(root.rotation.x, pt.inside ? -pt.ny * 0.05 : 0, 3, dt);
    studio.rim.intensity = 40 * 0.6 + x * 20;
  });

  return {
    set,
    dispose() {
      off();
      letters.dispose();
    },
  };
}
