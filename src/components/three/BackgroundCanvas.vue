<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { Stage } from '../../three/core/Stage.js';
import { whenFontsReady } from '../../three/core/glyphs.js';
import { prefersReducedMotion } from '../../three/core/ticker.js';

const el = ref(null);
let stage = null;
let scene = null;
const onVisibility = () => {
  if (!stage) return;
  if (document.hidden) stage.stop();
  else stage.start();
};

onMounted(async () => {
  const [{ default: createBackground }] = await Promise.all([
    import('../../three/background/background.js'),
    whenFontsReady(),
  ]);
  if (!el.value) return;
  try {
    stage = new Stage(el.value, {
      fov: 32,
      dprMax: 1.5,
      background: 0x030503,
      env: false,
      msaa: 0,
      bloom: { strength: 1.05, radius: 0.72, threshold: 0.72 },
      finish: { vignette: 0.62, grain: 0.04, scan: 0.04, aberration: 0.0024 },
    });
    scene = await createBackground(stage, { reduced: prefersReducedMotion() });
    stage.start();
    document.addEventListener('visibilitychange', onVisibility);
  } catch (err) {
    console.error('[KEYSPACE] background failed', err);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibility);
  scene?.dispose();
  stage?.dispose();
});
</script>

<template>
  <div ref="el" class="bg-canvas" aria-hidden="true"></div>
</template>

<style scoped>
.bg-canvas {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: #030503;
}
</style>
