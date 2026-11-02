import {
  ACESFilmicToneMapping,
  Color,
  HalfFloatType,
  PerspectiveCamera,
  PMREMGenerator,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FinishShader } from './finishShader.js';
import { addTick } from './ticker.js';
import { HEX } from './palette.js';

const DEFAULTS = {
  fov: 32,
  near: 0.1,
  far: 400,
  dprMax: 2,
  background: HEX.stage,
  exposure: 1,
  env: true,
  envIntensity: 0.55,
  bloom: { strength: 0.9, radius: 0.55, threshold: 0.82 },
  finish: { vignette: 0.4, grain: 0.03, scan: 0.0, aberration: 0.002 },
  msaa: 4,
};

/**
 * A self-contained WebGL "display": renderer, scene, camera, HDR bloom and a
 * finishing pass. Every 3D model on the site lives in its own Stage, mounted
 * only while it is near the viewport.
 */
export class Stage {
  constructor(container, options = {}) {
    const o = (this.options = {
      ...DEFAULTS,
      ...options,
      bloom: options.bloom === false ? false : { ...DEFAULTS.bloom, ...(options.bloom || {}) },
      finish: options.finish === false ? false : { ...DEFAULTS.finish, ...(options.finish || {}) },
    });
    this.container = container;
    this.updaters = new Set();
    this.running = false;
    this.time = 0;
    this.disposed = false;

    const renderer = (this.renderer = new WebGLRenderer({
      antialias: false,
      alpha: false,
      stencil: false,
      powerPreference: 'high-performance',
    }));
    this.dpr = Math.min(window.devicePixelRatio || 1, o.dprMax);
    renderer.setPixelRatio(this.dpr);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = o.exposure;
    renderer.setClearColor(new Color(o.background), 1);
    this.canvas = renderer.domElement;
    this.canvas.className = 'stage-canvas';
    container.appendChild(this.canvas);

    this.scene = new Scene();
    this.scene.background = new Color(o.background);
    this.camera = new PerspectiveCamera(o.fov, 1, o.near, o.far);
    this.camera.position.set(0, 0, 10);

    if (o.env) {
      const pmrem = new PMREMGenerator(renderer);
      this.envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
      this.scene.environment = this.envRT.texture;
      this.scene.environmentIntensity = o.envIntensity;
      pmrem.dispose();
    }

    const rt = new WebGLRenderTarget(2, 2, { type: HalfFloatType, samples: o.msaa });
    this.composer = new EffectComposer(renderer, rt);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    if (o.bloom) {
      this.bloom = new UnrealBloomPass(new Vector2(256, 256), o.bloom.strength, o.bloom.radius, o.bloom.threshold);
      this.composer.addPass(this.bloom);
    }
    this.composer.addPass(new OutputPass());
    if (o.finish) {
      this.finish = new ShaderPass(FinishShader);
      const u = this.finish.uniforms;
      u.uVignette.value = o.finish.vignette;
      u.uGrain.value = o.finish.grain;
      u.uScan.value = o.finish.scan;
      u.uAberration.value = o.finish.aberration;
      this.composer.addPass(this.finish);
    }

    // Pointer, normalised to [-1, 1] over the canvas.
    this.pointer = { x: 0, y: 0, nx: 0, ny: 0, inside: false, down: false, dragX: 0, dragY: 0 };
    this.ndc = new Vector2();
    this.raycaster = new Raycaster();
    this._bindPointer();

    this._onLost = (e) => {
      e.preventDefault();
      this.stop();
    };
    this.canvas.addEventListener('webglcontextlost', this._onLost);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
  }

  _bindPointer() {
    const p = this.pointer;
    const c = this.canvas;
    let lastX = 0;
    let lastY = 0;
    const update = (e) => {
      const r = c.getBoundingClientRect();
      p.x = e.clientX - r.left;
      p.y = e.clientY - r.top;
      p.nx = (p.x / r.width) * 2 - 1;
      p.ny = -((p.y / r.height) * 2 - 1);
      this.ndc.set(p.nx, p.ny);
    };
    this._pm = (e) => {
      update(e);
      p.inside = true;
      if (p.down) {
        p.dragX += e.clientX - lastX;
        p.dragY += e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
      }
      this.onPointerMove?.(p, e);
    };
    this._pd = (e) => {
      update(e);
      p.down = true;
      lastX = e.clientX;
      lastY = e.clientY;
      this.onPointerDown?.(p, e);
    };
    this._pu = (e) => {
      p.down = false;
      this.onPointerUp?.(p, e);
    };
    this._pl = () => {
      p.inside = false;
      p.down = false;
      this.onPointerLeave?.(p);
    };
    c.addEventListener('pointermove', this._pm);
    c.addEventListener('pointerdown', this._pd);
    window.addEventListener('pointerup', this._pu);
    c.addEventListener('pointerleave', this._pl);
  }

  /** Raycast the current pointer against a list of objects. */
  pick(objects, recursive = true) {
    this.raycaster.setFromCamera(this.ndc, this.camera);
    return this.raycaster.intersectObjects(objects, recursive);
  }

  resize() {
    if (this.disposed) return;
    const r = this.container.getBoundingClientRect();
    const w = Math.max(2, Math.round(r.width));
    const h = Math.max(2, Math.round(r.height));
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(this.dpr);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.finish) this.finish.uniforms.uResolution.value.set(w * this.dpr, h * this.dpr);
    this.onResize?.(w, h);
  }

  /** Register a per-frame callback (dt, elapsed). Returns an unsubscribe fn. */
  add(fn) {
    this.updaters.add(fn);
    return () => this.updaters.delete(fn);
  }

  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    this._untick = addTick((dt) => this.frame(dt));
  }

  stop() {
    this.running = false;
    this._untick?.();
    this._untick = null;
  }

  frame(dt) {
    if (this.disposed) return;
    this.time += dt;
    for (const fn of this.updaters) fn(dt, this.time);
    if (this.finish) this.finish.uniforms.uTime.value = this.time;
    this.composer.render(dt);
  }

  /** Render a single frame immediately (used for reduced motion / first paint). */
  renderOnce() {
    this.frame(0);
  }

  dispose() {
    if (this.disposed) return;
    this.stop();
    this.disposed = true;
    this.ro.disconnect();
    const c = this.canvas;
    c.removeEventListener('pointermove', this._pm);
    c.removeEventListener('pointerdown', this._pd);
    window.removeEventListener('pointerup', this._pu);
    c.removeEventListener('pointerleave', this._pl);
    c.removeEventListener('webglcontextlost', this._onLost);
    this.scene.traverse((obj) => {
      obj.geometry?.dispose?.();
      const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
      for (const m of mats) {
        for (const key in m) {
          const v = m[key];
          if (v && v.isTexture) v.dispose();
        }
        if (m.uniforms) {
          for (const k in m.uniforms) {
            const v = m.uniforms[k]?.value;
            if (v && v.isTexture) v.dispose();
          }
        }
        m.dispose?.();
      }
    });
    this.envRT?.dispose();
    this.bloom?.dispose?.();
    this.composer.dispose?.();
    this.renderer.dispose();
    c.remove();
  }
}
