# KEYSPACE

**How secrets are kept, and how they get cracked.** An interactive 3D journey through 2,500 years of cryptography that ends with a password lab where you watch a cracker attack a password in real time.

Everything runs in the browser. There is no backend, no tracking and no password is ever sent anywhere (the optional breach check sends only the first 5 characters of a SHA-1 hash).

## What's inside

| Section | 3D model | What you can do |
| --- | --- | --- |
| Hero | Padlock assembled from ~3,000 binary glyphs, hologram projector | Hover "Test your password" to unlock it |
| Primer | Cipher box with key | Watch plaintext become ciphertext |
| 01 Scytale | Wooden rod, leather strip, cradles | Write a message, unwind the strip, try other rods to crack it |
| 02 Caesar | Two-ring cipher disk | Encrypt, drag the inner disk, brute-force an intercepted message |
| 03 Frequency analysis | 3D bar chart vs English "molds" | Crack a Caesar cipher without a key |
| 04 Vigenère | 26 × 26 tabula recta | Watch row × column lookups for your keyword |
| 05 Enigma | Full Enigma I: keys, lamps, rotors, plugboard | Type on your keyboard, see the real wiring path through the rotors |
| 06 AES | 4 × 4 cube of state bytes | Step through all 10 rounds, run an avalanche test |
| 07 Public key | Alice, Bob, a padlock and Eve the drone | Send a message, factor a toy RSA key |
| 08 Quantum | Voxel RSA lock, Bloch-sphere qubits, lattice lock | Run Shor's algorithm, install a post-quantum lock |
| Hashing | SHA-256 grinder with a helix of 64 hex digits | See one character change the whole hash |
| Password Lab | Cryptex with one ring per character | Dictionary → rules → brute-force attack simulation, crack-time by attacker, breach check |
| Defend | Vault, phone, keys, dice, shield | Five habits that beat crackers |

The crypto is real and tested: Enigma reproduces the classic `AAAAA → BDZGO`, AES matches the FIPS-197 test vector and Node's crypto, Vigenère matches the textbook `LEMON` example.

## Tech

- [Vue 3](https://vuejs.org/) + [Vite](https://vitejs.dev/)
- [Three.js](https://threejs.org/) with HDR bloom, one lazily mounted WebGL stage per model
- [GSAP](https://gsap.com/) ticker + [Lenis](https://lenis.darkroom.engineering/) smooth scrolling
- [zxcvbn-ts](https://zxcvbn-ts.github.io/zxcvbn/) for realistic password strength (lazy-loaded)
- Fonts: Unbounded, JetBrains Mono, Inter (self-hosted via Fontsource)

## Run it locally

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # crypto unit tests
npm run build    # production build in dist/
npm run preview  # serve the build
```

Requires Node 20+.

## Project structure

```
src/
  App.vue                     page composition
  content/stations.js         all timeline copy
  crypto/                     classical.js, enigma.js, aes.js, rsa.js, password.js
  lib/                        scroll (Lenis), event bus, lazy zxcvbn loader
  components/
    layout/                   header, footer, logo
    sections/                 hero, intro, timeline, hashing, lab, defense
    timeline/                 station shell, specimen frame, one component per station
    three/                    ThreeCanvas (lazy WebGL mount), BackgroundCanvas
  three/
    core/                     Stage (renderer + bloom), ticker, materials, glyph textures, shapes
    background/               binary rain, floating keys, hero padlock
    models/                   one file per 3D model
tests/crypto.test.js          node --test
```

## Deploying

`npm run build` produces a static site in `dist/` with relative asset paths, so it works on any static host (Vercel, Netlify, Cloudflare Pages, GitHub Pages) and on a custom domain.

## Credits

- Breach data: [Pwned Passwords](https://haveibeenpwned.com/Passwords) by Have I Been Pwned, CC BY 4.0
- Password strength: zxcvbn-ts, MIT
- Passphrase words: EFF Long Wordlist, CC BY 3.0 US
