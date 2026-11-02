// A faithful Enigma I (Wehrmacht) simulator: rotors I–V, reflector B,
// ring settings, plugboard and the famous double-stepping middle rotor.
// `press()` also returns the electrical path so the 3D model can draw it.

const A = 65;
const idx = (ch) => ch.charCodeAt(0) - A;
const chr = (i) => String.fromCharCode(A + i);
const mod = (n) => ((n % 26) + 26) % 26;

export const ROTORS = {
  I: { wiring: 'EKMFLGDQVZNTOWYHXUSPAIBRCJ', notch: 'Q' },
  II: { wiring: 'AJDKSIRUXBLHWTMCQGZNPYFVOE', notch: 'E' },
  III: { wiring: 'BDFHJLCPRTXVZNYEIWGAKMUSQO', notch: 'V' },
  IV: { wiring: 'ESOVPZJAYQUIRHXLNFTGKDCMWB', notch: 'J' },
  V: { wiring: 'VZBRGITYUPSDNHLXAWMKCJQFOE', notch: 'Z' },
};
export const REFLECTOR_B = 'YRUHQSLDPXNGOKMIEBFZCWVJAT';

class Rotor {
  constructor(name, position = 'A', ring = 'A') {
    const def = ROTORS[name];
    this.name = name;
    this.forwardMap = [...def.wiring].map(idx);
    this.backwardMap = new Array(26);
    this.forwardMap.forEach((out, i) => (this.backwardMap[out] = i));
    this.notch = idx(def.notch);
    this.pos = idx(position);
    this.ring = idx(ring);
  }
  atNotch() {
    return this.pos === this.notch;
  }
  step() {
    this.pos = mod(this.pos + 1);
  }
  forward(c) {
    const shift = this.pos - this.ring;
    return mod(this.forwardMap[mod(c + shift)] - shift);
  }
  backward(c) {
    const shift = this.pos - this.ring;
    return mod(this.backwardMap[mod(c + shift)] - shift);
  }
}

export class Enigma {
  /**
   * @param {object} cfg
   * @param {string[]} cfg.rotors   left → right, e.g. ['I','II','III']
   * @param {string}   cfg.positions e.g. 'AAA'
   * @param {string}   cfg.rings     e.g. 'AAA'
   * @param {string}   cfg.plugs     space-separated pairs, e.g. 'AB CD'
   */
  constructor({ rotors = ['I', 'II', 'III'], positions = 'AAA', rings = 'AAA', plugs = '' } = {}) {
    this.rotors = rotors.map((r, i) => new Rotor(r, positions[i], rings[i]));
    this.reflector = [...REFLECTOR_B].map(idx);
    this.plugboard = Array.from({ length: 26 }, (_, i) => i);
    for (const pair of plugs.toUpperCase().split(/\s+/).filter(Boolean)) {
      const [a, b] = [...pair].map(idx);
      this.plugboard[a] = b;
      this.plugboard[b] = a;
    }
  }

  get positions() {
    return this.rotors.map((r) => chr(r.pos)).join('');
  }

  setPositions(str) {
    [...str].forEach((ch, i) => (this.rotors[i].pos = idx(ch)));
  }

  /** Advance the rotors exactly as the pawls and notches do. */
  stepRotors() {
    const [left, middle, right] = this.rotors;
    const stepped = [false, false, true];
    if (middle.atNotch()) {
      middle.step();
      left.step();
      stepped[0] = stepped[1] = true;
    } else if (right.atNotch()) {
      middle.step();
      stepped[1] = true;
    }
    right.step();
    return stepped;
  }

  /** Press a key: rotors step first, then current flows. Returns lamp + path. */
  press(ch) {
    const input = idx(ch.toUpperCase());
    const stepped = this.stepRotors();
    const [left, middle, right] = this.rotors;
    const path = [];
    let c = input;
    path.push({ stage: 'key', value: c });
    c = this.plugboard[c];
    path.push({ stage: 'plug-in', value: c });
    c = right.forward(c);
    path.push({ stage: 'R', value: c });
    c = middle.forward(c);
    path.push({ stage: 'M', value: c });
    c = left.forward(c);
    path.push({ stage: 'L', value: c });
    c = this.reflector[c];
    path.push({ stage: 'UKW', value: c });
    c = left.backward(c);
    path.push({ stage: 'L-back', value: c });
    c = middle.backward(c);
    path.push({ stage: 'M-back', value: c });
    c = right.backward(c);
    path.push({ stage: 'R-back', value: c });
    c = this.plugboard[c];
    path.push({ stage: 'lamp', value: c });
    return { input: chr(input), output: chr(c), path, stepped, positions: this.positions };
  }

  encrypt(text) {
    return [...text.toUpperCase()]
      .filter((ch) => /[A-Z]/.test(ch))
      .map((ch) => this.press(ch).output)
      .join('');
  }
}

// Number of daily settings of the Army Enigma: rotor choice/order (5·4·3),
// starting positions (26³) and 10 plugboard cables. ≈ 1.59 × 10^20.
export const ENIGMA_KEYSPACE = 158962555217826360000n;
