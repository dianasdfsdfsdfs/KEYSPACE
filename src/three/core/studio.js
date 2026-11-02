import {
  AdditiveBlending,
  AmbientLight,
  CircleGeometry,
  Color,
  DirectionalLight,
  Mesh,
  PlaneGeometry,
  PointLight,
  ShaderMaterial,
} from 'three';
import { HEX } from './palette.js';
import { gridMaterial } from './materials.js';

/**
 * Consistent "display case" lighting for every station: a cool key light,
 * an acid rim light from behind, low ambient and a fading grid floor.
 */
export function addStudio(stage, { floorY = -2.2, grid = true, glow = true, rim = 1.0, key = 1.0, floorScale = 1 } = {}) {
  const { scene } = stage;
  const objs = [];
  const amb = new AmbientLight(0xdfffd0, 0.18);
  const keyLight = new DirectionalLight(0xf2ffe8, 2.2 * key);
  keyLight.position.set(-4, 6, 7);
  const fill = new DirectionalLight(0x8fb3ff, 0.35);
  fill.position.set(6, 1, 4);
  const rimLight = new PointLight(new Color(HEX.acid), 40 * rim, 30, 1.6);
  rimLight.position.set(2.5, 3, -5);
  const rim2 = new PointLight(new Color(HEX.yellow), 14 * rim, 20, 1.8);
  rim2.position.set(-5, -1, -3);
  objs.push(amb, keyLight, fill, rimLight, rim2);

  if (grid) {
    const floor = new Mesh(new PlaneGeometry(80 * floorScale, 80 * floorScale), gridMaterial({ cell: 0.5, major: 4, fade: 0.11, opacity: 0.5 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = floorY;
    objs.push(floor);
  }
  if (glow) {
    const g = new Mesh(
      new CircleGeometry(6 * floorScale, 64),
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { uColor: { value: new Color(HEX.acid) }, uStrength: { value: 0.12 } },
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform vec3 uColor; uniform float uStrength; varying vec2 vUv; void main(){ float d = length(vUv - 0.5) * 2.0; float a = pow(max(0.0, 1.0 - d), 2.2) * uStrength; gl_FragColor = vec4(uColor * a, a); }`,
      }),
    );
    g.rotation.x = -Math.PI / 2;
    g.position.y = floorY + 0.002;
    objs.push(g);
  }
  objs.forEach((o) => scene.add(o));
  return { key: keyLight, rim: rimLight, rim2, ambient: amb, objects: objs };
}

/** Pixel-perfect-ish camera framing helper. */
export function frame(stage, { pos = [0, 1, 10], target = [0, 0, 0], fov } = {}) {
  const cam = stage.camera;
  if (fov) cam.fov = fov;
  cam.position.set(...pos);
  cam.lookAt(...target);
  cam.updateProjectionMatrix();
}
