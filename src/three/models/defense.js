import { Color, CylinderGeometry, ExtrudeGeometry, Group, Mesh, MeshBasicMaterial, MeshPhysicalMaterial, Shape, SphereGeometry, TorusGeometry, BoxGeometry, PlaneGeometry } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { HEX } from '../core/palette.js';
import { addStudio } from '../core/studio.js';
import { keyGeometry } from '../core/shapes.js';
import { neonBasic } from '../core/materials.js';
import { labelTexture } from '../core/glyphs.js';
import { damp } from '../core/ticker.js';

const body = (hex = 0x18210f) => new MeshPhysicalMaterial({ color: hex, metalness: 0.75, roughness: 0.3, clearcoat: 0.8 });

function vault() {
  const g = new Group();
  g.add(new Mesh(new RoundedBoxGeometry(1.5, 1.5, 1.1, 5, 0.14), body()));
  const door = new Mesh(new CylinderGeometry(0.5, 0.5, 0.08, 48), body(0x24301c));
  door.rotation.x = Math.PI / 2;
  door.position.z = 0.57;
  g.add(door);
  const ring = new Mesh(new TorusGeometry(0.5, 0.03, 10, 64), neonBasic(HEX.acid, 1.6));
  ring.position.z = 0.62;
  g.add(ring);
  const wheel = new Group();
  for (let i = 0; i < 3; i++) {
    const spoke = new Mesh(new BoxGeometry(0.62, 0.05, 0.05), neonBasic(HEX.yellow, 1.4));
    spoke.rotation.z = (i / 3) * Math.PI;
    wheel.add(spoke);
  }
  wheel.position.z = 0.66;
  g.add(wheel);
  g.userData.spin = wheel;
  return g;
}

function phone() {
  const g = new Group();
  g.add(new Mesh(new RoundedBoxGeometry(0.85, 1.6, 0.1, 5, 0.1), body(0x0d120a)));
  const screen = new Mesh(new PlaneGeometry(0.72, 1.4), new MeshBasicMaterial({ color: 0x07100a }));
  screen.position.z = 0.051;
  g.add(screen);
  const code = new Mesh(new PlaneGeometry(0.66, 0.22), new MeshBasicMaterial({ map: labelTexture('482 913', { w: 512, h: 160, size: 160, scale: 0.6 }), transparent: true, toneMapped: false, color: new Color(HEX.acid).multiplyScalar(1.6) }));
  code.position.z = 0.053;
  g.add(code);
  const check = new Mesh(new TorusGeometry(0.16, 0.025, 8, 40), neonBasic(HEX.yellow, 1.6));
  check.position.set(0, 0.42, 0.055);
  g.add(check);
  return g;
}

function keys() {
  const g = new Group();
  const ring = new Mesh(new TorusGeometry(0.34, 0.04, 12, 48), neonBasic(HEX.acid, 1.4));
  ring.position.set(-0.55, 0.35, 0);
  g.add(ring);
  const colors = [HEX.acid, HEX.yellow, HEX.lime];
  colors.forEach((c, i) => {
    const k = new Mesh(keyGeometry(), new MeshPhysicalMaterial({ color: c, metalness: 0.9, roughness: 0.3, emissive: new Color(c), emissiveIntensity: 0.08 }));
    k.scale.setScalar(0.34);
    k.position.set(-0.1, 0.35 - i * 0.05, i * 0.05);
    k.rotation.z = -0.6 - i * 0.45;
    g.add(k);
  });
  return g;
}

function dice() {
  const g = new Group();
  const pipMat = neonBasic(HEX.acid, 1.6);
  const makeDie = (faces) => {
    const d = new Group();
    d.add(new Mesh(new RoundedBoxGeometry(0.8, 0.8, 0.8, 5, 0.12), body(0x101a0c)));
    const pip = new SphereGeometry(0.065, 12, 8);
    const put = (x, y) => {
      const m = new Mesh(pip, pipMat);
      m.position.set(x, y, 0.4);
      d.add(m);
    };
    faces.forEach(([x, y]) => put(x, y));
    return d;
  };
  const a = makeDie([
    [-0.2, 0.2],
    [0, 0],
    [0.2, -0.2],
  ]);
  a.position.set(-0.35, 0.1, 0);
  a.rotation.set(0.3, 0.4, 0.2);
  const b = makeDie([
    [-0.2, 0.2],
    [0.2, 0.2],
    [-0.2, -0.2],
    [0.2, -0.2],
    [0, 0],
  ]);
  b.position.set(0.4, -0.25, 0.2);
  b.rotation.set(-0.2, -0.5, -0.1);
  g.add(a, b);
  return g;
}

function shield() {
  const s = new Shape();
  s.moveTo(0, 0.8);
  s.quadraticCurveTo(0.45, 0.72, 0.7, 0.6);
  s.quadraticCurveTo(0.72, -0.1, 0, -0.85);
  s.quadraticCurveTo(-0.72, -0.1, -0.7, 0.6);
  s.quadraticCurveTo(-0.45, 0.72, 0, 0.8);
  const g = new Group();
  const geo = new ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 4 });
  geo.translate(0, 0, -0.09);
  g.add(new Mesh(geo, body()));
  const arrow = new Group();
  const shaft = new Mesh(new BoxGeometry(0.12, 0.6, 0.06), neonBasic(HEX.acid, 1.6));
  shaft.position.y = -0.12;
  const head = new Mesh(new CylinderGeometry(0, 0.26, 0.28, 3), neonBasic(HEX.acid, 1.6));
  head.position.y = 0.3;
  arrow.add(shaft, head);
  arrow.position.z = 0.2;
  g.add(arrow);
  return g;
}

export default async function createDefense(stage) {
  const { scene, camera } = stage;
  scene.environmentIntensity = 0.7;
  addStudio(stage, { floorY: -1.3, rim: 0.8, grid: false });
  camera.fov = 26;
  const items = [vault(), phone(), keys(), dice(), shield()];
  items[1].userData.boost = 1.25;
  const root = new Group();
  scene.add(root);
  items.forEach((m) => root.add(m));

  const layout = () => {
    const aspect = stage.width / stage.height;
    const dist = 9;
    camera.position.set(0, 0.6, dist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    const halfW = Math.tan((camera.fov * Math.PI) / 360) * dist * aspect;
    const step = (2 * halfW) / 5;
    items.forEach((m, i) => {
      m.position.x = -halfW + step * (i + 0.5);
      m.scale.setScalar(Math.min(1, step / 2.1) * (m.userData.boost || 1));
    });
  };
  stage.onResize = layout;
  layout();

  const off = stage.add((dt, t) => {
    items.forEach((m, i) => {
      m.rotation.y = Math.sin(t * 0.7 + i) * 0.45;
      m.rotation.x = Math.sin(t * 0.5 + i * 2) * 0.1;
      m.position.y = Math.sin(t * 1.1 + i) * 0.08;
      if (m.userData.spin) m.userData.spin.rotation.z = t * 0.8;
    });
    const pt = stage.pointer;
    root.rotation.x = damp(root.rotation.x, pt.inside ? -pt.ny * 0.1 : 0, 3, dt);
  });
  return { dispose: off };
}
