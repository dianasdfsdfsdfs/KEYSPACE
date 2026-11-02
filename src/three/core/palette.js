import { Color } from 'three';

// Hex values shared by every 3D scene so the whole site reads as one system.
export const HEX = {
  bg: 0x050705,
  stage: 0x060906,
  ink: 0x0b120a,
  metal: 0x1b2617,
  metalLight: 0x33452b,
  acid: 0xb6ff00,
  yellow: 0xeeff00,
  lime: 0xd9ff7a,
  danger: 0xff2e63,
  text: 0xe8f5dc,
  muted: 0x708264,
  dim: 0x1a2e14,
};

export const CSS = {
  acid: '#b6ff00',
  yellow: '#eeff00',
  lime: '#d9ff7a',
  danger: '#ff2e63',
  text: '#e8f5dc',
  muted: '#708264',
  ink: '#0b120a',
};

export const color = (hex) => new Color(hex);

// Emissive colours above 1.0 cross the bloom threshold and glow.
export function neon(hex, intensity = 2.2) {
  return new Color(hex).multiplyScalar(intensity);
}
