<script setup>
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { Stage } from '../../three/core/Stage.js';
import { whenFontsReady } from '../../three/core/glyphs.js';
import { prefersReducedMotion } from '../../three/core/ticker.js';

/**
 * Mounts one 3D model in its own Stage — only while it is near the viewport,
 * renders only while visible, and disposes the WebGL context when far away.
 * The model module exports `default async (stage, params, emit) => controller`.
 */
const props = defineProps({
  load: { type: Function, required: true },
  params: { type: Object, default: () => ({}) },
  stage: { type: Object, default: () => ({}) },
  label: { type: String, default: '3D scene' },
  nearMargin: { type: String, default: '60% 0px' },
});
const emit = defineEmits(['ready', 'event']);

const el = ref(null);
const ready = ref(false);
const failed = ref(false);
const controller = shallowRef(null);
let stage = null;
let near = false;
let visible = false;
let loading = false;
let nearIO;
let visIO;

async function mount() {
  if (stage || loading) return;
  loading = true;
  try {
    const [mod] = await Promise.all([props.load(), whenFontsReady()]);
    if (!near || !el.value) return;
    stage = new Stage(el.value, props.stage);
    const create = mod.default || mod.create;
    const ctrl = await create(stage, { reduced: prefersReducedMotion(), ...props.params }, (name, payload) =>
      emit('event', name, payload),
    );
    if (!stage) {
      ctrl?.dispose?.();
      return;
    }
    controller.value = ctrl;
    ready.value = true;
    if (visible) stage.start();
    else stage.renderOnce();
    emit('ready', ctrl);
  } catch (err) {
    console.error('[KEYSPACE] 3D scene failed to start', err);
    failed.value = true;
    unmount();
  } finally {
    loading = false;
  }
}

function unmount() {
  controller.value?.dispose?.();
  controller.value = null;
  stage?.dispose();
  stage = null;
  ready.value = false;
}

onMounted(() => {
  nearIO = new IntersectionObserver(
    ([entry]) => {
      near = entry.isIntersecting;
      if (near) mount();
      else unmount();
    },
    { rootMargin: props.nearMargin },
  );
  visIO = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (!stage || !ready.value) return;
      if (visible) stage.start();
      else stage.stop();
    },
    { rootMargin: '0px' },
  );
  nearIO.observe(el.value);
  visIO.observe(el.value);
});

onBeforeUnmount(() => {
  nearIO?.disconnect();
  visIO?.disconnect();
  near = false;
  unmount();
});

watch(
  () => props.params,
  (p) => controller.value?.set?.(p),
  { deep: true },
);

defineExpose({
  call(method, ...args) {
    return controller.value?.[method]?.(...args);
  },
  get controller() {
    return controller.value;
  },
});
</script>

<template>
  <div ref="el" class="three-canvas" role="img" :aria-label="label">
    <div v-if="!ready" class="three-canvas__boot" aria-hidden="true">
      <span v-if="!failed">initialising renderer<span class="blink">_</span></span>
      <span v-else>3D unavailable on this device</span>
    </div>
  </div>
</template>

<style scoped>
.three-canvas {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.three-canvas__boot {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}
.blink {
  animation: blink 1s steps(1) infinite;
}
@keyframes blink {
  50% {
    opacity: 0;
  }
}
</style>
