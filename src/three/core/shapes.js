import {
  BoxGeometry,
  CatmullRomCurve3,
  CurvePath,
  CylinderGeometry,
  LineCurve3,
  QuadraticBezierCurve3,
  Shape,
  ExtrudeGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** A classic bit key lying along +X, bow on the left. ~3.2 units long. */
export function keyGeometry() {
  const bow = new TorusGeometry(0.46, 0.12, 14, 40);
  bow.translate(-1.25, 0, 0);
  const inner = new TorusGeometry(0.2, 0.05, 10, 28);
  inner.translate(-1.25, 0, 0);
  const collar = new CylinderGeometry(0.16, 0.16, 0.18, 18);
  collar.rotateZ(Math.PI / 2);
  collar.translate(-0.68, 0, 0);
  const shaft = new CylinderGeometry(0.085, 0.085, 2.25, 14);
  shaft.rotateZ(Math.PI / 2);
  shaft.translate(0.45, 0, 0);
  const bit1 = new BoxGeometry(0.2, 0.56, 0.12);
  bit1.translate(1.38, -0.28, 0);
  const bit2 = new BoxGeometry(0.16, 0.38, 0.12);
  bit2.translate(1.08, -0.19, 0);
  const bit3 = new BoxGeometry(0.12, 0.24, 0.12);
  bit3.translate(0.84, -0.12, 0);
  const geos = [bow, inner, collar, shaft, bit1, bit2, bit3];
  const merged = mergeGeometries(geos.map((g) => g.toNonIndexed()));
  geos.forEach((g) => g.dispose());
  merged.computeVertexNormals();
  return merged;
}

/** Padlock shackle path: two legs and an arch. */
export function shackleCurve(width = 2.0, legHeight = 1.0, archHeight = 1.0, baseY = 0) {
  const hw = width / 2;
  const path = new CurvePath();
  path.add(new LineCurve3(new Vector3(-hw, baseY, 0), new Vector3(-hw, baseY + legHeight, 0)));
  // arch made from two quadratic segments for a rounded top
  path.add(
    new QuadraticBezierCurve3(
      new Vector3(-hw, baseY + legHeight, 0),
      new Vector3(-hw, baseY + legHeight + archHeight, 0),
      new Vector3(0, baseY + legHeight + archHeight, 0),
    ),
  );
  path.add(
    new QuadraticBezierCurve3(
      new Vector3(0, baseY + legHeight + archHeight, 0),
      new Vector3(hw, baseY + legHeight + archHeight, 0),
      new Vector3(hw, baseY + legHeight, 0),
    ),
  );
  path.add(new LineCurve3(new Vector3(hw, baseY + legHeight, 0), new Vector3(hw, baseY, 0)));
  return path;
}

/** Padlock: rounded body + tube shackle. Returns separate geometries. */
export function padlockGeometries({
  bodyW = 3.0,
  bodyH = 2.4,
  bodyD = 1.0,
  radius = 0.26,
  shackleW = 2.0,
  shackleLeg = 0.9,
  shackleArch = 1.05,
  tube = 0.2,
} = {}) {
  const body = new RoundedBoxGeometry(bodyW, bodyH, bodyD, 6, radius);
  const curve = shackleCurve(shackleW, shackleLeg, shackleArch, bodyH / 2 - 0.25);
  const shackle = new TubeGeometry(curve, 96, tube, 18, false);
  return { body, shackle, curve };
}

/** Merged single-geometry padlock (for wireframes and silhouettes). */
export function padlockGeometry(opts) {
  const { body, shackle } = padlockGeometries(opts);
  const merged = mergeGeometries([body.toNonIndexed(), shackle.toNonIndexed()]);
  body.dispose();
  shackle.dispose();
  merged.computeVertexNormals();
  return merged;
}

/** A keyhole silhouette (circle + tapered slot), extruded. */
export function keyholeShape(r = 0.24, slotH = 0.5) {
  const shape = new Shape();
  shape.absarc(0, 0, r, -Math.PI / 2 + 0.55, -Math.PI / 2 - 0.55 + Math.PI * 2, false);
  shape.lineTo(-r * 0.62, -r - slotH);
  shape.lineTo(r * 0.62, -r - slotH);
  shape.closePath();
  return shape;
}

export function keyholeGeometry(r = 0.24, slotH = 0.5, depth = 0.06) {
  const shape = new Shape();
  shape.absarc(0, 0, r, -Math.PI / 2 + 0.55, -Math.PI / 2 - 0.55 + Math.PI * 2, false);
  shape.lineTo(-r * 0.62, -r - slotH);
  shape.lineTo(r * 0.62, -r - slotH);
  shape.closePath();
  return new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 32 });
}

export { CatmullRomCurve3 };
