import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Points,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { HEX } from '../core/palette.js';
import { addStudio } from '../core/studio.js';
import { canvasTexture, FONT_DISPLAY, FONT_MONO } from '../core/glyphs.js';
import { keyGeometry, padlockGeometries } from '../core/shapes.js';
import { damp, clamp, easeInOutCubic, easeOutBack, smoothstep } from '../core/ticker.js';

const ALICE = new Vector3(-3.35, 0, 0.1);
const BOB = new Vector3(3.35, 0, 0.1);

function screenTexture(name, role, tint) {
  return canvasTexture(512, 320, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0b1209');
    g.addColorStop(1, '#050805');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = tint;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 4;
    ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.globalAlpha = 1;
    ctx.fillStyle = tint;
    ctx.textAlign = 'center';
    ctx.font = `700 92px ${FONT_DISPLAY}`;
    ctx.fillText(name, w / 2, h / 2 + 18);
    ctx.font = `600 30px ${FONT_MONO}`;
    ctx.fillStyle = 'rgba(232,245,220,0.6)';
    ctx.fillText(role, w / 2, h / 2 + 76);
  });
}

function messageTexture(text) {
  return canvasTexture(512, 160, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#eeff00';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const t = text.slice(0, 18);
    ctx.font = `700 ${t.length > 12 ? 50 : 64}px ${FONT_MONO}`;
    ctx.fillText(t, w / 2, h / 2);
  });
}

function makeLaptop(name, role, tint) {
  const g = new Group();
  const metal = new MeshStandardMaterial({ color: 0x1b2318, metalness: 0.8, roughness: 0.35 });
  const base = new Mesh(new RoundedBoxGeometry(2.2, 0.12, 1.5, 4, 0.05), metal);
  base.position.y = 0.06;
  const kb = new Mesh(new PlaneGeometry(1.8, 0.8), new MeshStandardMaterial({ color: 0x0a0d08, roughness: 0.8 }));
  kb.rotation.x = -Math.PI / 2;
  kb.position.set(0, 0.125, 0.1);
  const hinge = new Group();
  hinge.position.set(0, 0.12, -0.72);
  hinge.rotation.x = -0.28;
  const lid = new Mesh(new RoundedBoxGeometry(2.2, 1.42, 0.07, 4, 0.04), metal);
  lid.position.y = 0.71;
  const screen = new Mesh(new PlaneGeometry(2.0, 1.25), new MeshBasicMaterial({ map: screenTexture(name, role, tint), toneMapped: false }));
  screen.position.set(0, 0.71, 0.04);
  hinge.add(lid, screen);
  g.add(base, kb, hinge);
  return g;
}

function makePadlock(color) {
  const { body, shackle } = padlockGeometries({ bodyW: 1.6, bodyH: 1.25, bodyD: 0.6, radius: 0.16, shackleW: 1.0, shackleLeg: 0.45, shackleArch: 0.6, tube: 0.12 });
  const g = new Group();
  const mat = new MeshPhysicalMaterial({ color, metalness: 0.9, roughness: 0.25, clearcoat: 0.6, emissive: new Color(color), emissiveIntensity: 0.08 });
  const steel = new MeshStandardMaterial({ color: 0xb8b8a8, metalness: 1, roughness: 0.2 });
  const b = new Mesh(body, mat);
  const shackleGroup = new Group();
  const s = new Mesh(shackle, steel);
  shackleGroup.add(s);
  const hole = new Mesh(new SphereGeometry(0.09, 16, 12), new MeshBasicMaterial({ color: 0x050505 }));
  hole.position.set(0, -0.05, 0.3);
  hole.scale.z = 0.3;
  g.add(b, shackleGroup, hole);
  g.scale.setScalar(0.42);
  return { g, shackle: shackleGroup, mat };
}

export default async function createPublicKey(stage, params, emit) {
  const { scene, camera } = stage;
  scene.environmentIntensity = 0.6;
  addStudio(stage, { floorY: -0.01, rim: 0.7 });

  const fit = () => {
    const aspect = stage.width / stage.height;
    const t = Math.tan((camera.fov * Math.PI) / 360);
    const dist = Math.max(9.4 / 2 / (t * aspect), 5.4 / 2 / t);
    camera.position.set(0, dist * 0.36, dist * 0.93);
    camera.lookAt(0, 1.0, 0);
    camera.updateProjectionMatrix();
  };
  camera.fov = 30;
  stage.onResize = fit;
  fit();

  const root = new Group();
  scene.add(root);

  const alice = makeLaptop('ALICE', 'sender', '#b6ff00');
  alice.position.copy(ALICE);
  alice.rotation.y = 0.35;
  const bob = makeLaptop('BOB', 'holds the private key', '#eeff00');
  bob.position.copy(BOB);
  bob.rotation.y = -0.35;
  root.add(alice, bob);

  // ---------- the wire between them ----------
  const wireCurve = new CatmullRomCurve3([
    new Vector3(-2.3, 0.35, 0.5),
    new Vector3(-1.15, 0.72, 0.95),
    new Vector3(0, 0.86, 1.05),
    new Vector3(1.15, 0.72, 0.95),
    new Vector3(2.3, 0.35, 0.5),
  ]);
  const wire = new Mesh(new TubeGeometry(wireCurve, 120, 0.025, 8, false), new MeshBasicMaterial({ color: new Color(HEX.acid).multiplyScalar(0.8), toneMapped: false, transparent: true, opacity: 0.55 }));
  root.add(wire);
  // packets of data flowing along the wire
  const flowN = 60;
  const flowPos = new Float32Array(flowN * 3);
  const flowGeo = new BufferGeometry();
  flowGeo.setAttribute('position', new BufferAttribute(flowPos, 3));
  const flowMat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uColor: { value: new Color(HEX.acid).multiplyScalar(1.8) }, uScale: { value: 500 } },
    vertexShader: `uniform float uScale; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = 0.09 * uScale / -mv.z; }`,
    fragmentShader: `uniform vec3 uColor; void main(){ float d = length(gl_PointCoord-0.5); float a = smoothstep(0.5,0.0,d); gl_FragColor = vec4(uColor*a, a); }`,
  });
  const flow = new Points(flowGeo, flowMat);
  flow.frustumCulled = false;
  root.add(flow);

  // ---------- Eve, the eavesdropper ----------
  const eve = new Group();
  eve.position.set(0, 2.55, 0.6);
  root.add(eve);
  const eveBody = new Mesh(new SphereGeometry(0.34, 32, 24), new MeshStandardMaterial({ color: 0x15100f, metalness: 0.7, roughness: 0.3 }));
  const eveEye = new Mesh(new SphereGeometry(0.14, 24, 16), new MeshBasicMaterial({ color: new Color(HEX.danger).multiplyScalar(2.4), toneMapped: false }));
  eveEye.position.set(0, -0.08, 0.27);
  const eveRing = new Mesh(new TorusGeometry(0.62, 0.035, 10, 64), new MeshStandardMaterial({ color: 0x2a1f1d, metalness: 0.9, roughness: 0.3 }));
  eveRing.rotation.x = Math.PI / 2;
  const rotorBlades = new Group();
  for (let i = 0; i < 4; i++) {
    const blade = new Mesh(new RoundedBoxGeometry(0.5, 0.02, 0.1, 2, 0.01), new MeshStandardMaterial({ color: 0x3a2a28, metalness: 0.6, roughness: 0.4 }));
    const a = (i / 4) * Math.PI * 2;
    blade.position.set(Math.cos(a) * 0.62, 0.06, Math.sin(a) * 0.62);
    blade.rotation.y = -a;
    rotorBlades.add(blade);
  }
  const scanMat = new MeshBasicMaterial({ color: new Color(HEX.danger), transparent: true, opacity: 0, side: DoubleSide, depthWrite: false, blending: AdditiveBlending });
  const scan = new Mesh(new ConeGeometry(0.9, 2.2, 48, 1, true), scanMat);
  scan.position.y = -1.25;
  eve.add(eveBody, eveEye, eveRing, rotorBlades, scan);

  // ---------- padlock, key, box ----------
  const lock = makePadlock(0xc9a227);
  root.add(lock.g);
  const keyMat = new MeshBasicMaterial({ color: new Color(HEX.acid).multiplyScalar(1.6), toneMapped: false });
  const key = new Mesh(keyGeometry(), keyMat);
  key.scale.setScalar(0.32);
  root.add(key);
  const box = new Group();
  const boxMat = new MeshPhysicalMaterial({ color: 0x16200f, metalness: 0.5, roughness: 0.3, clearcoat: 1, transparent: true, opacity: 0.94 });
  const boxBody = new Mesh(new RoundedBoxGeometry(1.0, 0.72, 0.72, 4, 0.06), boxMat);
  box.add(boxBody);
  const boxGlow = new Mesh(new RoundedBoxGeometry(1.04, 0.76, 0.76, 4, 0.07), new MeshBasicMaterial({ color: new Color(HEX.acid), wireframe: true, transparent: true, opacity: 0.15 }));
  box.add(boxGlow);
  root.add(box);
  let msgTex = messageTexture('HELLO BOB');
  const msg = new Mesh(new PlaneGeometry(1.8, 0.56), new MeshBasicMaterial({ map: msgTex, transparent: true, toneMapped: false, depthWrite: false, color: new Color(1.4, 1.4, 1.4) }));
  root.add(msg);

  // ---------- timeline ----------
  const T = { offer: [0, 1.7], lock: [1.7, 2.8], send: [2.8, 5.4], unlock: [5.4, 6.8], read: [6.8, 9.5] };
  const st = { t: 99, runId: -1, phase: '' };
  function set(p) {
    if (p.message) {
      msgTex.dispose();
      msgTex = messageTexture(p.message.toUpperCase());
      msg.material.map = msgTex;
      msg.material.needsUpdate = true;
    }
    if (p.runId !== undefined && p.runId !== st.runId) {
      st.runId = p.runId;
      st.t = 0;
    }
  }
  set(params);
  if (st.t > 50) st.t = 0;

  const aliceDock = new Vector3(-2.15, 0.62, 0.6);
  const bobDock = new Vector3(2.15, 0.62, 0.6);
  const tmp = new Vector3();
  const along = (k, reverse = false) => {
    const u = reverse ? 1 - k : k;
    wireCurve.getPointAt(clamp(u), tmp);
    return tmp.clone().add(new Vector3(0, 0.42, 0));
  };
  const phaseOf = (t) => Object.keys(T).find((k) => t >= T[k][0] && t < T[k][1]) || 'idle';
  const local = (t, name) => clamp((t - T[name][0]) / (T[name][1] - T[name][0]));

  const off = stage.add((dt, time) => {
    st.t += dt;
    const t = st.t;
    const ph = phaseOf(t);
    if (ph !== st.phase) {
      st.phase = ph;
      emit?.('phase', ph);
    }
    // padlock: starts open at Bob, travels to Alice, snaps shut on the box, travels back
    const offer = easeInOutCubic(local(t, 'offer'));
    const send = easeInOutCubic(local(t, 'send'));
    const lockK = local(t, 'lock');
    const unlock = local(t, 'unlock');
    let lockPos;
    if (t < T.offer[1]) lockPos = offer <= 0 ? bobDock.clone() : along(offer, true);
    else if (t < T.send[0]) lockPos = aliceDock.clone();
    else if (t < T.send[1]) lockPos = along(send);
    else lockPos = bobDock.clone();
    lockPos.y += Math.sin(time * 2) * 0.03;

    // the box appears at Alice when locking, travels with the lock
    const boxVisible = t >= T.lock[0] && t < T.read[1];
    box.visible = boxVisible;
    const boxPos = lockPos.clone().add(new Vector3(0, -0.12, -0.05));
    box.position.copy(boxPos);
    box.scale.setScalar(t < T.lock[0] + 0.4 ? easeOutBack(clamp((t - T.lock[0]) / 0.4)) : 1);
    lock.g.position.copy(lockPos).add(new Vector3(0, boxVisible ? 0.42 : 0.1, 0.42));
    // shackle: open (lifted) until it snaps shut during "lock", reopens during "unlock"
    const closed = t >= T.lock[0] + 0.55 && t < T.unlock[0] + 0.85;
    const shackleTarget = closed ? 0 : 0.34;
    lock.shackle.position.y = damp(lock.shackle.position.y, shackleTarget, closed ? 22 : 6, dt);
    lock.mat.emissiveIntensity = 0.08 + (closed && t < T.lock[1] ? Math.max(0, 1 - (t - T.lock[0] - 0.55) * 3) * 0.8 : 0);
    lock.g.rotation.y = Math.sin(time * 0.8) * 0.2;

    // Bob's private key never leaves Bob; it slides into the lock to open it
    const keyHome = new Vector3(2.75, 1.85, 0.7);
    const keyIn = lock.g.position.clone().add(new Vector3(0.62, -0.02, 0.12));
    const kIn = smoothstep(0, 0.45, unlock) * (1 - smoothstep(0.85, 1, local(t, 'read')));
    key.position.lerpVectors(keyHome, keyIn, t >= T.unlock[0] ? kIn : 0);
    key.rotation.set(0, Math.PI, t >= T.unlock[0] ? smoothstep(0.45, 0.65, unlock) * (Math.PI / 2) : Math.sin(time) * 0.1);
    keyMat.color.setHex(HEX.acid).multiplyScalar(1.3 + 0.4 * Math.sin(time * 3));

    // message: visible at Alice before locking, then rises out of the box at Bob
    const showAtAlice = t >= T.lock[0] && t < T.lock[0] + 0.5;
    const showAtBob = t >= T.unlock[0] + 0.9;
    msg.visible = showAtAlice || showAtBob;
    if (showAtAlice) {
      msg.position.copy(aliceDock).add(new Vector3(0, 1.0 - (t - T.lock[0]) * 1.4, 0.4));
      msg.material.opacity = 1 - (t - T.lock[0]) / 0.5;
    } else if (showAtBob) {
      const k = clamp((t - T.unlock[0] - 0.9) / 0.6);
      msg.position.copy(bobDock).add(new Vector3(-0.2, 1.05 + k * 0.6, 0.45));
      msg.material.opacity = k;
    }
    msg.lookAt(camera.position);

    // Eve scans the box as it passes underneath
    const passing = t >= T.send[0] && t < T.send[1] && Math.abs(lockPos.x) < 1.6;
    scanMat.opacity = damp(scanMat.opacity, passing ? 0.16 + 0.08 * Math.sin(time * 30) : 0, 8, dt);
    eveEye.material.color.setHex(HEX.danger).multiplyScalar(passing ? 3.4 + Math.sin(time * 20) : 2.2);
    const look = passing ? Math.atan2(lockPos.x - eve.position.x, 2) : Math.sin(time * 0.6) * 0.5;
    eve.rotation.y = damp(eve.rotation.y, look, 5, dt);
    eve.position.y = 2.55 + Math.sin(time * 1.6) * 0.08;
    rotorBlades.rotation.y += dt * 18;

    // data packets on the wire
    for (let i = 0; i < flowN; i++) {
      const u = (i / flowN + time * 0.12) % 1;
      wireCurve.getPointAt(u, tmp);
      flowPos[i * 3] = tmp.x;
      flowPos[i * 3 + 1] = tmp.y;
      flowPos[i * 3 + 2] = tmp.z;
    }
    flowGeo.attributes.position.needsUpdate = true;
    flowMat.uniforms.uScale.value = (stage.height * stage.dpr * 0.5) / Math.tan((camera.fov * Math.PI) / 360);

    // loop
    if (t > T.read[1] + 1.2) st.t = 0;

    const pt = stage.pointer;
    root.rotation.y = damp(root.rotation.y, pt.inside ? pt.nx * 0.18 : Math.sin(time * 0.25) * 0.05, 3, dt);
    root.rotation.x = damp(root.rotation.x, pt.inside ? -pt.ny * 0.06 : 0, 3, dt);
  });

  return {
    set,
    dispose() {
      off();
      msgTex.dispose();
    },
  };
}
