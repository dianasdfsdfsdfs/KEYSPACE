import { Color, FogExp2, Mesh, PlaneGeometry } from 'three';
import { HEX } from '../core/palette.js';
import { gridMaterial } from '../core/materials.js';
import { createGlyphAtlas } from '../core/glyphs.js';
import { clamp, damp, smoothstep } from '../core/ticker.js';
import { createRain } from './rain.js';
import { createHeroLock } from './heroLock.js';
import { createFloaters, createDust } from './floaters.js';
import { scrollState } from '../../lib/scroll.js';
import { bus } from '../../lib/bus.js';

/**
 * The fixed full-screen world behind the whole page. The camera flies forward
 * through falling binary as you scroll; the hero padlock assembles from glyphs
 * at the top and dissolves back into the rain on the way down.
 */
export default async function createBackground(stage, { reduced = false } = {}) {
  const { scene, camera } = stage;
  scene.background = new Color(0x030503);
  scene.fog = new FogExp2(0x030503, 0.018);
  camera.fov = 32;
  camera.position.set(0, 0.2, 15);
  camera.updateProjectionMatrix();

  const atlas = createGlyphAtlas('01' + '23456789ABCDEF' + '#$%&<>/{}', { cell: 96, weight: 700, scale: 0.78 });

  const rain = createRain(atlas, { columns: reduced ? 140 : 300 });
  scene.add(rain.object);

  const floaters = createFloaters();
  scene.add(floaters.object);

  const dust = createDust({ count: reduced ? 600 : 1600 });
  scene.add(dust.object);

  const grid = new Mesh(new PlaneGeometry(600, 600, 1, 1), gridMaterial({ cell: 2, major: 5, fade: 0.028, opacity: 0.42 }));
  grid.rotation.x = -Math.PI / 2;
  grid.position.y = -7.5;
  scene.add(grid);

  const hero = createHeroLock(atlas);
  scene.add(hero.object);

  // ---------- layout ----------
  const layout = { heroX: 2.9, heroY: 0, heroScale: 1 };
  const halfTan = () => Math.tan((camera.fov * Math.PI) / 360);
  function relayout(w, h) {
    const pxScale = (h * stage.dpr * 0.5) / halfTan();
    rain.setScale(pxScale);
    dust.setScale(pxScale);
    hero.setScale(pxScale);
    const aspect = w / h;
    const halfW = halfTan() * 15 * aspect;
    if (aspect > 1.15) {
      layout.heroX = Math.min(halfW * 0.44, 5.2);
      layout.heroY = 0.1;
      layout.heroScale = Math.min(1.15, Math.max(0.82, aspect / 1.6));
    } else {
      layout.heroX = 0;
      layout.heroY = 1.6;
      layout.heroScale = 0.72;
    }
  }
  stage.onResize = relayout;
  relayout(stage.width, stage.height);

  // ---------- input ----------
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 };
  const onMove = (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
  };
  window.addEventListener('pointermove', onMove, { passive: true });

  const offUnlock = bus.on('hero:unlock', (v) => (hero.state.unlockTarget = v ? 1 : 0));
  let alert = 0;
  const offAlert = bus.on('bg:alert', (v) => (alert = Math.max(alert, v ?? 1)));

  // ---------- intro: glyphs fly in and assemble the lock ----------
  let introT = reduced ? 10 : 0;
  const acid = new Color(HEX.acid).multiplyScalar(0.9);
  const warm = new Color(HEX.yellow).multiplyScalar(0.85);
  let camZ = camera.position.z;

  const off = stage.add((dt, t) => {
    introT += dt;
    hero.state.assemble = clamp((introT - 0.25) / 2.6);

    pointer.sx = damp(pointer.sx, pointer.x, 2.5, dt);
    pointer.sy = damp(pointer.sy, pointer.y, 2.5, dt);

    const vh = scrollState.vh || window.innerHeight;
    const heroP = clamp(scrollState.y / (vh * 0.9));
    const p = scrollState.progress;

    // camera flies forward through the volume
    const targetZ = 15 - p * 92;
    camZ = damp(camZ, targetZ, 4, dt);
    camera.position.z = camZ;
    camera.position.x = pointer.sx * 0.55;
    camera.position.y = 0.2 + pointer.sy * 0.3 + Math.sin(t * 0.25) * 0.08;
    camera.lookAt(pointer.sx * 0.25, 0, camZ - 20);

    // hero padlock: lives at the top, dissolves on scroll
    const ho = hero.object;
    ho.visible = heroP < 0.999;
    ho.position.set(layout.heroX, layout.heroY + heroP * 1.2, -heroP * 3);
    ho.scale.setScalar(layout.heroScale);
    if (ho.visible) hero.update(dt, t, { pointerX: pointer.sx, pointerY: pointer.sy, disperse: smoothstep(0.02, 1, heroP) });

    // the ancient eras tint the rain warmer, the lab cools it back to acid
    const warmth = smoothstep(0.08, 0.2, p) * (1 - smoothstep(0.38, 0.55, p)) * 0.55;
    alert = Math.max(0, alert - dt * 0.9);
    rain.material.uniforms.uColor.value.copy(acid).lerp(warm, warmth);
    rain.material.uniforms.uAlert.value = alert * 0.85;
    hero.state.alert = alert;

    // calmer rain behind long-form content so text stays readable
    const content = smoothstep(0.45, 1.25, scrollState.y / vh);
    rain.material.uniforms.uOpacity.value = 0.75 - content * 0.47;
    floaters.materials[0].opacity = 0.22 - content * 0.1;
    floaters.materials[1].opacity = 0.16 - content * 0.08;
    rain.update(t);
    dust.update(t);
    floaters.update(dt, t);
  });

  if (/[?&]capture\b/.test(location.search)) window.__ksBg = { hero, rain, layout, camera };

  return {
    dispose() {
      off();
      offUnlock();
      offAlert();
      window.removeEventListener('pointermove', onMove);
      atlas.texture.dispose();
    },
  };
}
