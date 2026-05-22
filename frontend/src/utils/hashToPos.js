/**
 * Deterministic hash to 2D/3D position.
 * Used by both NetworkScene (3D) and Network2D (fallback) for consistent layout.
 */
export function hashToPos(str, scale = 5) {
  // FNV-1a-like deterministic hash
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }

  const rng = (seed) => {
    // xorshift32
    let x = (seed || h) >>> 0;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    return (x >>> 0) / 0xffffffff;
  };

  return [
    (rng(1) - 0.5) * scale * 2,
    (rng(2) - 0.5) * scale * 1.5,
    (rng(3) - 0.5) * scale * 2,
  ];
}
