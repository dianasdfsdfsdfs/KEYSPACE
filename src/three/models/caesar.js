import {
  BoxGeometry,
  Color,
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Path,
  Plane,
  RingGeometry,
  Shape,
  Vector3,
  DoubleSide,
  AdditiveBlending,
  EdgesGeometry,
  LineSegments,
  LineBasicMaterial,
} from 'three';
import { HEX } from '../core/palette.js';
import { addStudio } from '../core/studio.js';
import { canvasTexture, FONT_MONO, FONT_DISPLAY } from '../core/glyphs.js';
import { neonBasic } from '../core/materials.js';
import { damp } from '../core/ticker.js';
import { ALPHABET } from '../../crypto/classical.js';

const A = (Math.PI * 2) / 26; // one sector
const OUT_R = [2.98, 4.05];
const IN_R = [0.95, 2.92];
const IN_LETTER_R = [2.25, 2.92];

function annulus(rIn, rOut, depth, bevel = 0.03) {
  const s = new Shape();
  s.absarc(0, 0, rOut, 0, Math.PI * 2, false);
  const hole = new Path();
  hole.absarc(0, 0, rIn, 0, Math.PI * 2, true);
  s.holes.push(hole);
  const g = new ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 160 });
  g.rotateX(-Math.PI / 2); // lie flat, extruded upward
  return g;
}

/** Letters around a ring, tops toward the centre (so the near side reads upright). */
function letterRingTexture({ rIn, rOut, outer, color, size = 2048, font = FONT_MONO, weight = 700, ticks = true, inner = null }) {
  return canvasTexture(size, size, (ctx, w) => {
    const c = w / 2;
    const px = (r) => (r / outer) * c;
    ctx.clearRect(0, 0, w, w);
    // engraved guide circles
    ctx.strokeStyle = 'rgba(232,245,220,0.18)';
    ctx.lineWidth = 3;
    for (const r of [rIn + 0.04, rOut - 0.04]) {
      ctx.beginPath();
      ctx.arc(c, c, px(r), 0, Math.PI * 2);
      ctx.stroke();
    }
    const mid = (rIn + rOut) / 2;
    for (let i = 0; i < 26; i++) {
      const th = Math.PI / 2 - i * A;
      // sector dividers
      if (ticks) {
        const tb = th + A / 2;
        ctx.strokeStyle = 'rgba(232,245,220,0.16)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(c + Math.cos(tb) * px(rIn + 0.05), c + Math.sin(tb) * px(rIn + 0.05));
        ctx.lineTo(c + Math.cos(tb) * px(rOut - 0.05), c + Math.sin(tb) * px(rOut - 0.05));
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(c + Math.cos(th) * px(mid), c + Math.sin(th) * px(mid));
      ctx.rotate(th - Math.PI / 2);
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${weight} ${Math.round(px(rOut - rIn) * 0.62)}px ${font}`;
      ctx.fillText(ALPHABET[i], 0, 0);
      ctx.restore();
    }
    if (inner) inner(ctx, c, px);
  });
}

function hubTexture(shift) {
  return canvasTexture(512, 512, (ctx, w) => {
    const c = w / 2;
    ctx.clearRect(0, 0, w, w);
    ctx.fillStyle = '#eeff00';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 190px ${FONT_DISPLAY}`;
    ctx.fillText(`+${shift}`, c, c + 6);
    ctx.font = `600 44px ${FONT_MONO}`;
    ctx.fillStyle = 'rgba(232,245,220,0.6)';
    ctx.fillText('SHIFT', c, c - 140);
  });
}

export default async function createCaesar(stage, params, emit) {
  const { scene, camera } = stage;
  scene.environmentIntensity = 0.5;
  addStudio(stage, { floorY: -0.9, rim: 0.9 });

  const fit = () => {
    const aspect = stage.width / stage.height;
    const t = Math.tan((camera.fov * Math.PI) / 360);
    const need = Math.max(9.2 / 2 / (t * aspect), 7.4 / 2 / t);
    camera.position.set(0, need * 0.72, need * 0.72);
    camera.lookAt(0, -0.2, 0.55);
    camera.updateProjectionMatrix();
  };
  camera.fov = 30;
  stage.onResize = fit;
  fit();

  const root = new Group();
  scene.add(root);
  const assembly = new Group(); // rotates to bring the active letter to the front
  root.add(assembly);

  // ---------- outer ring (plaintext) ----------
  const metal = new MeshStandardMaterial({ color: 0x1c2618, metalness: 0.88, roughness: 0.34 });
  const outerBody = new Mesh(annulus(OUT_R[0], OUT_R[1], 0.22), metal);
  assembly.add(outerBody);
  const outerTex = letterRingTexture({ rIn: OUT_R[0], rOut: OUT_R[1], outer: OUT_R[1], color: '#e8f5dc' });
  const outerFace = new Mesh(
    new RingGeometry(OUT_R[0], OUT_R[1], 160, 1),
    new MeshBasicMaterial({ map: outerTex, transparent: true, depthWrite: false, toneMapped: false, color: new Color(0.62, 0.66, 0.6) }),
  );
  outerFace.rotation.x = -Math.PI / 2;
  outerFace.position.y = 0.255;
  assembly.add(outerFace);
  // rim lights
  const rimGlow = new Mesh(new RingGeometry(OUT_R[1] + 0.02, OUT_R[1] + 0.06, 160), neonBasic(HEX.acid, 1.4, { side: DoubleSide }));
  rimGlow.rotation.x = -Math.PI / 2;
  rimGlow.position.y = 0.02;
  assembly.add(rimGlow);

  // ---------- inner disk (ciphertext) ----------
  const inner = new Group();
  assembly.add(inner);
  const innerMetal = new MeshStandardMaterial({ color: 0x0f150c, metalness: 0.8, roughness: 0.42 });
  const innerBody = new Mesh(annulus(IN_R[0], IN_R[1], 0.38), innerMetal);
  inner.add(innerBody);
  const innerTex = letterRingTexture({
    rIn: IN_LETTER_R[0],
    rOut: IN_LETTER_R[1],
    outer: IN_R[1],
    color: '#b6ff00',
    inner: (ctx, c, px) => {
      // engraved decoration inside the letter ring
      ctx.strokeStyle = 'rgba(182,255,0,0.16)';
      ctx.lineWidth = 2;
      for (const r of [1.25, 1.55, 1.9, 2.15]) {
        ctx.beginPath();
        ctx.arc(c, c, px(r), 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let i = 0; i < 26; i++) {
        const th = Math.PI / 2 - i * A;
        ctx.beginPath();
        ctx.moveTo(c + Math.cos(th) * px(1.95), c + Math.sin(th) * px(1.95));
        ctx.lineTo(c + Math.cos(th) * px(2.15), c + Math.sin(th) * px(2.15));
        ctx.stroke();
      }
    },
  });
  const innerFace = new Mesh(
    new RingGeometry(IN_R[0], IN_R[1], 160, 1),
    new MeshBasicMaterial({ map: innerTex, transparent: true, depthWrite: false, toneMapped: false, color: new Color(0.78, 0.78, 0.78) }),
  );
  innerFace.rotation.x = -Math.PI / 2;
  innerFace.position.y = 0.415;
  inner.add(innerFace);

  // ---------- hub ----------
  const brass = new MeshStandardMaterial({ color: 0x9a7d38, metalness: 0.95, roughness: 0.28 });
  const hub = new Mesh(new CylinderGeometry(0.92, 0.98, 0.55, 64), brass);
  hub.position.y = 0.34;
  inner.add(hub);
  const knurl = new Group();
  const toothGeo = new BoxGeometry(0.06, 0.4, 0.08);
  for (let i = 0; i < 48; i++) {
    const t = new Mesh(toothGeo, brass);
    const a = (i / 48) * Math.PI * 2;
    t.position.set(Math.cos(a) * 0.97, 0.36, Math.sin(a) * 0.97);
    t.rotation.y = -a;
    knurl.add(t);
  }
  inner.add(knurl);
  let hubTex = hubTexture(3);
  const hubFace = new Mesh(new RingGeometry(0, 0.86, 64), new MeshBasicMaterial({ map: hubTex, transparent: true, toneMapped: false, color: new Color(0.95, 0.95, 0.95) }));
  hubFace.rotation.x = -Math.PI / 2;
  hubFace.position.y = 0.625;
  inner.add(hubFace);
  const hubTop = new Mesh(new CylinderGeometry(0.86, 0.86, 0.02, 64), new MeshStandardMaterial({ color: 0x0a0e08, metalness: 0.5, roughness: 0.3 }));
  hubTop.position.y = 0.615;
  inner.add(hubTop);

  // ---------- highlight sectors ----------
  const hiOuterMat = new MeshBasicMaterial({ color: new Color(HEX.text).multiplyScalar(0.5), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, toneMapped: false, side: DoubleSide });
  const hiInnerMat = new MeshBasicMaterial({ color: new Color(HEX.acid).multiplyScalar(0.8), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, toneMapped: false, side: DoubleSide });
  const hiOuter = new Mesh(new RingGeometry(OUT_R[0] + 0.04, OUT_R[1] - 0.04, 16, 1, -Math.PI / 2 - A / 2, A), hiOuterMat);
  hiOuter.rotation.x = -Math.PI / 2;
  hiOuter.position.y = 0.26;
  assembly.add(hiOuter);
  const hiInner = new Mesh(new RingGeometry(IN_LETTER_R[0] + 0.03, IN_LETTER_R[1] - 0.03, 16, 1, -Math.PI / 2 - A / 2, A), hiInnerMat);
  hiInner.rotation.x = -Math.PI / 2;
  hiInner.position.y = 0.42;
  inner.add(hiInner);

  // ---------- reading window (static, at the front) ----------
  const windowGroup = new Group();
  root.add(windowGroup);
  const winShape = new Shape();
  const ww = 0.86;
  winShape.moveTo(-ww / 2, IN_LETTER_R[0] - 0.12);
  winShape.lineTo(ww / 2, IN_LETTER_R[0] - 0.12);
  winShape.lineTo(ww * 0.72, OUT_R[1] + 0.12);
  winShape.lineTo(-ww * 0.72, OUT_R[1] + 0.12);
  winShape.closePath();
  const winGeo = new ExtrudeGeometry(winShape, { depth: 0.02, bevelEnabled: false });
  winGeo.rotateX(Math.PI / 2);
  const winEdges = new LineSegments(new EdgesGeometry(winGeo), new LineBasicMaterial({ color: new Color(HEX.yellow).multiplyScalar(1.8), toneMapped: false }));
  winEdges.position.y = 0.62;
  windowGroup.add(winEdges);
  const winGlass = new Mesh(winGeo, new MeshBasicMaterial({ color: new Color(HEX.yellow), transparent: true, opacity: 0.06, depthWrite: false, blending: AdditiveBlending }));
  winGlass.position.y = 0.62;
  windowGroup.add(winGlass);
  // arrow from plain to cipher inside the window
  const arrow = new Mesh(new CylinderGeometry(0.0, 0.12, 0.24, 3), neonBasic(HEX.yellow, 2));
  arrow.rotation.x = -Math.PI / 2;
  arrow.position.set(0, 0.64, OUT_R[0] - 0.05);
  windowGroup.add(arrow);

  // ---------- state ----------
  const st = {
    text: 'VENI VIDI VICI',
    shift: 3,
    innerAngle: -3 * A,
    assemblyAngle: 0,
    cursor: 0,
    timer: 0,
    letters: [],
    brute: false,
    bruteShift: 1,
    bruteTimer: 0,
    dragging: false,
    dragOffset: 0,
    pulse: 0,
  };

  function set(p) {
    st.text = (p.text ?? st.text).toUpperCase();
    st.letters = [...st.text].map((ch, i) => ({ ch, i })).filter((l) => /[A-Z]/.test(l.ch));
    if (p.shift != null && p.shift !== st.shift) {
      st.shift = p.shift;
      hubTex.dispose();
      hubTex = hubTexture(st.shift);
      hubFace.material.map = hubTex;
      hubFace.material.needsUpdate = true;
    }
    if (p.brute && !st.brute) {
      st.bruteShift = 0;
      st.bruteTimer = 0;
    }
    st.brute = !!p.brute;
    if (st.cursor >= st.letters.length) st.cursor = 0;
  }
  set(params);

  // ---------- drag the inner disk to change the shift ----------
  const plane = new Plane(new Vector3(0, 1, 0), -0.42);
  const hit = new Vector3();
  const pointerAngle = () => {
    stage.raycaster.setFromCamera(stage.ndc, camera);
    if (!stage.raycaster.ray.intersectPlane(plane, hit)) return null;
    root.worldToLocal(hit);
    return Math.atan2(-hit.z, hit.x); // CCW from above
  };
  stage.canvas.style.cursor = 'grab';
  stage.onPointerDown = () => {
    const hits = stage.pick([innerBody, innerFace, hub, hubFace]);
    if (!hits.length) return;
    const a = pointerAngle();
    if (a == null) return;
    st.dragging = true;
    st.dragOffset = st.innerAngle + st.assemblyAngle - a;
    stage.canvas.style.cursor = 'grabbing';
  };
  stage.onPointerMove = () => {
    if (!st.dragging) {
      const over = stage.pick([innerBody, innerFace, hub, hubFace]).length > 0;
      stage.canvas.style.cursor = over ? 'grab' : 'default';
      return;
    }
    const a = pointerAngle();
    if (a == null) return;
    st.innerAngle = a + st.dragOffset - st.assemblyAngle;
    const k = ((Math.round(-st.innerAngle / A) % 26) + 26) % 26;
    if (k !== 0 && k !== st.shift) emit?.('shift', k);
  };
  stage.onPointerUp = () => {
    if (!st.dragging) return;
    st.dragging = false;
    stage.canvas.style.cursor = 'grab';
  };

  const off = stage.add((dt, t) => {
    // advance the reading cursor through the message
    if (!st.brute && st.letters.length) {
      st.timer += dt;
      if (st.timer > 0.85) {
        st.timer = 0;
        st.cursor = (st.cursor + 1) % st.letters.length;
        st.pulse = 1;
        emit?.('cursor', st.letters[st.cursor].i);
      }
    }
    // brute force: spin through all 25 keys
    if (st.brute) {
      st.bruteTimer += dt;
      if (st.bruteTimer > 0.42) {
        st.bruteTimer = 0;
        st.bruteShift = (st.bruteShift % 25) + 1;
        emit?.('brute', st.bruteShift);
      }
    }
    const shown = st.brute ? st.bruteShift : st.shift;
    if (!st.dragging) st.innerAngle = damp(st.innerAngle, -shown * A, st.brute ? 12 : 6, dt);

    // bring the active plaintext letter to the front
    const cur = st.letters[st.cursor];
    const li = cur ? cur.ch.charCodeAt(0) - 65 : 0;
    const target = st.brute ? 0 : -li * A;
    let d = target - st.assemblyAngle;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    st.assemblyAngle += d * (1 - Math.exp(-4.5 * dt));
    assembly.rotation.y = st.assemblyAngle;
    inner.rotation.y = st.innerAngle;
    hubFace.rotation.z = -(st.assemblyAngle + st.innerAngle); // keep the shift label upright

    // highlight the plain letter at the window and the cipher letter under it
    hiOuter.rotation.z = li * A;
    const ci = (li + shown) % 26;
    hiInner.rotation.z = ci * A;
    st.pulse = Math.max(0, st.pulse - dt * 1.6);
    const on = st.brute ? 0 : 1;
    hiOuterMat.opacity = on * (0.35 + st.pulse * 0.4);
    hiInnerMat.opacity = on * (0.45 + st.pulse * 0.5);
    arrow.material.color.setHex(HEX.yellow).multiplyScalar(1.4 + st.pulse * 1.5);

    // gentle presentation sway
    const p = stage.pointer;
    root.rotation.x = damp(root.rotation.x, p.inside ? -p.ny * 0.05 : Math.sin(t * 0.4) * 0.02, 3, dt);
    root.rotation.z = damp(root.rotation.z, p.inside ? -p.nx * 0.04 : 0, 3, dt);
  });

  return {
    set,
    dispose() {
      off();
      hubTex.dispose();
    },
  };
}
