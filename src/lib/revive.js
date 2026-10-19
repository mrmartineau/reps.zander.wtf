// Test args are plain YAML data, so a callback or a promise can't be written
// directly. A `{ $js: "source" }` object stands in for one: it's evaluated
// into a real value (e.g. `x => x * 2`, `Promise.resolve(1)`) just before the
// call. Shared by the in-browser worker and the Node validator.
export function revive(value) {
  if (Array.isArray(value)) return value.map(revive);
  if (value && typeof value === 'object') {
    if (typeof value.$js === 'string') {
      return new Function(`"use strict";\nreturn (${value.$js});`)();
    }
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, revive(v)]));
  }
  return value;
}
