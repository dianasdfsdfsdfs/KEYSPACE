// zxcvbn-ts and its dictionaries are ~1.5 MB, so they load only when the
// Password Lab comes into view.
let loading = null;

export function loadStrength() {
  if (!loading) {
    loading = Promise.all([import('@zxcvbn-ts/core'), import('@zxcvbn-ts/language-common'), import('@zxcvbn-ts/language-en')]).then(
      ([core, common, en]) => {
        const zxcvbn = new core.ZxcvbnFactory({
          dictionary: { ...common.dictionary, ...en.dictionary },
          graphs: common.adjacencyGraphs,
          translations: en.translations,
        });
        return {
          check: async (pw) => zxcvbn.check(pw),
          topPasswords: common.dictionary['passwords-common'],
          words: common.dictionary['diceware-common'],
        };
      },
    );
  }
  return loading;
}

/** Random integer in [0, max) from the browser's CSPRNG. */
export function secureRandom(max) {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return buf[0] % max;
}
