// Transforms JSX (and TS-free modern JS) into plain `React.createElement`
// calls so user-authored component/hook code can be evaluated in the browser
// with `new Function`. We use the *classic* runtime so the only thing the
// generated code needs in scope is `React` — no auto-imported jsx-runtime.
import { transform } from 'sucrase';

export function transformJsx(code) {
  return transform(code, {
    transforms: ['jsx'],
    jsxRuntime: 'classic',
    production: true,
  }).code;
}
