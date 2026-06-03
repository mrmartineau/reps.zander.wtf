// Structural deep-equality good enough for puzzle outputs:
// primitives, arrays and plain objects. NaN-aware.
export function deepEqual(a, b) {
  if (Object.is(a, b)) return true;

  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }

  if (a && b && typeof a === 'object') {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => deepEqual(a[k], b[k]));
  }

  return false;
}

// Compact, readable representation for showing expected vs received.
export function show(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
