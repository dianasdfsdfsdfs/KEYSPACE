// Tiny event bus so DOM components can poke the 3D scenes (and vice versa)
// without prop-drilling. e.g. bus.emit('hero:unlock', true)
const handlers = new Map();

export const bus = {
  on(name, fn) {
    if (!handlers.has(name)) handlers.set(name, new Set());
    handlers.get(name).add(fn);
    return () => handlers.get(name)?.delete(fn);
  },
  emit(name, payload) {
    handlers.get(name)?.forEach((fn) => fn(payload));
  },
};
