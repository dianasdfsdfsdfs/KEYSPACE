// Copy for the eight stations of the timeline. Plain language first, facts
// double-checked; every station also explains how the cipher was broken.

export const STATIONS = [
  {
    id: 'scytale',
    num: '01',
    era: 'Ancient Sparta',
    date: 'c. 5th century BC',
    railYear: '−400',
    title: 'The Scytale',
    kind: 'Transposition cipher',
    lead: 'Wrap a leather strip around a wooden rod and write your message along it. Unwind the strip, and the words fall apart into a column of jumbled letters.',
    how: [
      'Wind the strip around the rod and write along its length, line by line.',
      'Unwind it. Every letter is still there, just in a different order.',
      'Only a rod of the same thickness lines the letters up again.',
    ],
    facts: [
      { k: 'Key', v: 'Thickness of the rod' },
      { k: 'Keyspace', v: '≈ 10 sensible rods' },
    ],
    broken:
      'By trying rods. There are only a handful of sensible thicknesses, so an enemy can test them all in an afternoon. Shuffling letters hides a message; it does not protect it.',
    note: 'Our best description comes from the Greek writer Plutarch, centuries after Sparta used it.',
  },
  {
    id: 'caesar',
    num: '02',
    era: 'Rome',
    date: 'c. 50 BC',
    railYear: '−50',
    title: 'Caesar Cipher',
    kind: 'Substitution cipher',
    lead: 'Julius Caesar protected his letters with a simple trick: replace every letter with the one three places further down the alphabet.',
    how: [
      'Pick a shift. Caesar used 3.',
      'Replace every letter: A → D, B → E, … Z → C.',
      'To decrypt, shift back by the same amount.',
    ],
    facts: [
      { k: 'Key', v: 'The shift, 1–25' },
      { k: 'Keyspace', v: '25 keys' },
    ],
    broken:
      'By brute force: try every shift until the text makes sense. With only 25 keys a person can do it by hand in minutes. Password crackers use exactly the same idea today, just billions of times faster.',
    note: 'The historian Suetonius recorded the shift of three. The disk shown here is a later invention (Alberti, 1467) that performs the same trick.',
  },
  {
    id: 'frequency',
    num: '03',
    era: 'Baghdad',
    date: '9th century',
    railYear: '850',
    title: 'Frequency Analysis',
    kind: 'The first codebreaking method',
    lead: 'The Arab scholar Al-Kindi noticed that every language has a fingerprint: some letters show up far more often than others. Simple ciphers hide the letters, not the fingerprint.',
    how: [
      'Count how often each symbol appears in the secret message.',
      'Compare with the language. In English, E, T and A are the most common letters.',
      'Line up the peaks. The most frequent symbol is probably E, and the key falls out.',
    ],
    facts: [
      { k: 'Breaks', v: 'Caesar & every simple substitution' },
      { k: 'Needs', v: 'A few sentences of ciphertext' },
    ],
    broken:
      'This one is the attack. It cracks a Caesar cipher without trying a single key, and works even when the letters are scrambled in a random order, which has 4 × 10²⁶ possible keys.',
    note: "Al-Kindi's “Manuscript on Deciphering Cryptographic Messages” is the oldest known description of cryptanalysis.",
  },
  {
    id: 'vigenere',
    num: '04',
    era: 'Renaissance Europe',
    date: '1553',
    railYear: '1553',
    title: 'Vigenère Cipher',
    kind: 'Polyalphabetic cipher',
    lead: 'Use a different Caesar shift for each letter, chosen by a secret keyword. The same letter now encrypts to different letters, so the fingerprint smears out. For three centuries it was “le chiffre indéchiffrable”.',
    how: [
      'Choose a keyword, like LEMON.',
      'Each keyword letter is a shift: L = 11, E = 4, M = 12, O = 14, N = 13.',
      'Encrypt letter 1 with L, letter 2 with E… and repeat the keyword.',
    ],
    facts: [
      { k: 'Key', v: 'A keyword' },
      { k: 'Keyspace', v: '26ⁿ for an n-letter word' },
    ],
    broken:
      'By Charles Babbage (c. 1854) and Friedrich Kasiski (1863). The keyword repeats, and repetition leaves patterns. Find the keyword length, split the text into columns, and each column is just a Caesar cipher.',
    note: 'Giovan Battista Bellaso described it in 1553; it was later misattributed to Blaise de Vigenère.',
  },
  {
    id: 'enigma',
    num: '05',
    era: 'Germany',
    date: '1920s – 1945',
    railYear: '1940',
    title: 'Enigma',
    kind: 'Electro-mechanical rotor machine',
    lead: 'Press a key and a lamp lights up. Inside, current snakes through scrambling rotors that turn after every letter, so the same key never gives the same answer twice in a row.',
    how: [
      'A key press sends current through the plugboard and three wired rotors.',
      'A reflector bounces it back through the rotors by a different path to a lamp.',
      'Then the rotors click forward, rewiring the whole machine for the next letter.',
    ],
    facts: [
      { k: 'Key', v: 'Rotor order, start positions, plugboard cables' },
      { k: 'Keyspace', v: '≈ 1.59 × 10²⁰ daily settings' },
    ],
    broken:
      'By Polish mathematicians Rejewski, Różycki and Zygalski (1932), then Alan Turing and the codebreakers of Bletchley Park. Their machines exploited a design flaw: Enigma never encrypts a letter as itself.',
    note: 'Some historians estimate that the codebreakers shortened the Second World War by around two years.',
  },
  {
    id: 'aes',
    num: '06',
    era: 'The computer age',
    date: '1977 → 2001',
    railYear: '2001',
    title: 'DES → AES',
    kind: 'Modern block cipher',
    lead: 'Computers do not shift letters; they scramble bits. AES, the world standard since 2001, pushes every 16-byte block through ten rounds of substitution and mixing.',
    how: [
      'Data is cut into 16-byte blocks, arranged as a 4 × 4 grid.',
      'Each round substitutes every byte, shifts the rows, mixes the columns and blends in part of the key.',
      'After ten rounds, flipping one input bit changes about half of the output bits.',
    ],
    facts: [
      { k: 'Key', v: '128, 192 or 256 bits' },
      { k: 'Keyspace', v: '2¹²⁸ ≈ 3.4 × 10³⁸' },
    ],
    broken:
      'It hasn’t been. Even at a billion billion guesses per second, trying every 128-bit key would take about 10 trillion years. Its 1977 predecessor DES had a 56-bit key, and in 1998 a $250,000 machine called Deep Crack found one in 56 hours.',
    note: 'AES protects your Wi-Fi, your phone’s storage and most of the web traffic you send.',
  },
  {
    id: 'publickey',
    num: '07',
    era: 'The internet',
    date: '1976 – 1977',
    railYear: '1977',
    title: 'Public-Key Cryptography',
    kind: 'Asymmetric encryption',
    lead: 'Every cipher so far had the same weakness: both sides must share the secret key first. How do two strangers on the internet agree on one while everyone listens?',
    how: [
      'Bob hands out open padlocks: his public key. Anyone can snap one shut.',
      'Alice locks her message in a box with Bob’s padlock and sends it.',
      'Only Bob’s private key opens it. Eavesdroppers see a locked box, nothing more.',
    ],
    facts: [
      { k: 'Key', v: 'A pair: public to lock, private to unlock' },
      { k: 'Hard problem', v: 'Factoring a 617-digit number' },
    ],
    broken:
      'Not with ordinary computers. RSA rests on one asymmetry: multiplying two huge primes is easy, splitting the product back is practically impossible. Its real enemy is the quantum computer.',
    note: 'Diffie and Hellman published the idea in 1976, RSA followed in 1977. British codebreakers at GCHQ had found it years earlier but kept it secret until 1997.',
  },
  {
    id: 'quantum',
    num: '08',
    era: 'Today → tomorrow',
    date: '1994 → 2030s',
    railYear: '2024',
    title: 'The Quantum Threat',
    kind: 'Post-quantum cryptography',
    lead: 'A large enough quantum computer could break the public-key locks that protect the internet today. The replacement locks are already being installed.',
    how: [
      'Qubits can hold 0 and 1 at once and interfere with each other.',
      'In 1994 Peter Shor found a quantum algorithm that factors huge numbers fast. That breaks RSA.',
      'AES survives: the best quantum attack only halves its strength, so 256-bit keys stay safe.',
    ],
    facts: [
      { k: 'Threat', v: 'Shor’s algorithm vs RSA & ECC' },
      { k: 'Defence', v: 'Lattice-based ML-KEM (NIST, 2024)' },
    ],
    broken:
      'Not yet. Today’s quantum computers are far too small and noisy to break real keys. But “harvest now, decrypt later” is real: data stolen today could be opened in the future, so the switch has already begun.',
    note: 'NIST published its first post-quantum standards in 2024, and major browsers already use hybrid post-quantum key exchange.',
  },
];
