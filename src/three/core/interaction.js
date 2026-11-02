import { damp } from './ticker.js';

/**
 * Drag-to-rotate with inertia, plus an idle sway and a gentle tilt toward the
 * pointer. Never captures the mouse wheel, so page scrolling keeps working.
 */
export function dragRotate(stage, target, opts = {}) {
  const o = {
    sensitivity: 0.0065,
    maxPitch: 0.45,
    minPitch: -0.35,
    yawLimit: Infinity,
    idleYaw: 0.12,
    idlePitch: 0.04,
    idleSpeed: 0.35,
    tilt: 0.12,
    damping: 6,
    ...opts,
  };
  const base = { x: target.rotation.x, y: target.rotation.y };
  const s = { yaw: 0, pitch: 0, tYaw: 0, tPitch: 0, vYaw: 0, dragging: false, lastX: 0, lastY: 0, idleT: 0, moved: 0 };
  const canvas = stage.canvas;
  canvas.style.cursor = 'grab';

  const down = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    s.dragging = true;
    s.moved = 0;
    s.lastX = e.clientX;
    s.lastY = e.clientY;
    canvas.style.cursor = 'grabbing';
  };
  const move = (e) => {
    if (!s.dragging) return;
    const dx = e.clientX - s.lastX;
    const dy = e.clientY - s.lastY;
    s.moved += Math.abs(dx) + Math.abs(dy);
    s.lastX = e.clientX;
    s.lastY = e.clientY;
    s.tYaw += dx * o.sensitivity;
    s.tPitch = Math.min(o.maxPitch, Math.max(o.minPitch, s.tPitch + dy * o.sensitivity));
    if (Number.isFinite(o.yawLimit)) s.tYaw = Math.max(-o.yawLimit, Math.min(o.yawLimit, s.tYaw));
    s.vYaw = dx * o.sensitivity;
  };
  const up = () => {
    if (!s.dragging) return;
    s.dragging = false;
    canvas.style.cursor = 'grab';
  };
  canvas.addEventListener('pointerdown', down);
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);

  const update = (dt) => {
    s.idleT += dt * o.idleSpeed;
    if (!s.dragging) {
      // inertia
      s.tYaw += s.vYaw;
      s.vYaw *= Math.pow(0.04, dt);
      if (Number.isFinite(o.yawLimit)) s.tYaw = Math.max(-o.yawLimit, Math.min(o.yawLimit, s.tYaw));
    }
    s.yaw = damp(s.yaw, s.tYaw, o.damping, dt);
    s.pitch = damp(s.pitch, s.tPitch, o.damping, dt);
    const p = stage.pointer;
    const tiltX = p.inside && !s.dragging ? -p.ny * o.tilt : 0;
    const tiltY = p.inside && !s.dragging ? p.nx * o.tilt : 0;
    s.tiltX = damp(s.tiltX || 0, tiltX, 3, dt);
    s.tiltY = damp(s.tiltY || 0, tiltY, 3, dt);
    target.rotation.y = base.y + s.yaw + Math.sin(s.idleT) * o.idleYaw + s.tiltY;
    target.rotation.x = base.x + s.pitch + Math.sin(s.idleT * 0.7 + 1.3) * o.idlePitch + s.tiltX;
  };
  const off = stage.add(update);

  return {
    state: s,
    /** True if the last pointer interaction was a click rather than a drag. */
    wasClick: () => s.moved < 6,
    reset() {
      s.tYaw = 0;
      s.tPitch = 0;
      s.vYaw = 0;
    },
    dispose() {
      off();
      canvas.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    },
  };
}
