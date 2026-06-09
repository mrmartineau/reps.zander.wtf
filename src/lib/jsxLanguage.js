// Monaco ships no JSX grammar — its JS/TS Monarch tokenizer reads `<`/`>` as
// operators, so JSX tags, attributes, and children render flat. React puzzles
// (`kind: react-component` / `react-hook`) use this custom `jsx` language for
// real tag/attribute colouring. It's a Monarch grammar only (no TS language
// service), which is fine here: the puzzle harness defines the contract, so we
// don't want IntelliSense or diagnostics squiggles anyway.

const KEYWORDS = [
  'abstract', 'as', 'async', 'await', 'break', 'case', 'catch', 'class',
  'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'export',
  'extends', 'false', 'finally', 'for', 'from', 'function', 'get', 'if',
  'import', 'in', 'instanceof', 'let', 'new', 'null', 'of', 'return', 'set',
  'static', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof',
  'undefined', 'var', 'void', 'while', 'with', 'yield',
];

// Shared JS token rules, reused by the top level and by `{…}` expression
// embeds inside JSX.
const jsRules = [
  [/\/\/.*$/, 'comment'],
  [/\/\*/, 'comment', '@comment'],
  [/"([^"\\]|\\.)*"/, 'string'],
  [/'([^'\\]|\\.)*'/, 'string'],
  [/`/, 'string', '@template'],
  [/\b\d+(\.\d+)?\b/, 'number'],
  [
    /[A-Za-z_$][\w$]*/,
    { cases: { '@keywords': 'keyword', '@default': 'identifier' } },
  ],
  [/[;,.]/, 'delimiter'],
  [/[=+\-*/%!&|^~?:]+/, 'operator'],
];

const language = {
  defaultToken: '',
  tokenPostfix: '.jsx',
  keywords: KEYWORDS,

  tokenizer: {
    root: [
      // A `<` that starts a tag (followed by a name, `/`, or `>`) opens JSX;
      // anything else (`a < b`, `=>`) falls through to the JS operator rule.
      [/<(?=[A-Za-z>/])/, { token: 'delimiter.angle', next: '@jsxOpen' }],
      [/[{}()[\]]/, '@brackets'],
      ...jsRules,
      [/[<>]/, 'operator'],
      [/\s+/, ''],
    ],

    // Inside an opening/self-closing tag, before `>`.
    jsxOpen: [
      [/[A-Za-z][\w.-]*/, 'tag', '@jsxAttrs'],
      [/\//, 'delimiter.angle'],
      [/>/, { token: 'delimiter.angle', next: '@jsxChildren' }],
    ],

    jsxAttrs: [
      [/\/>/, { token: 'delimiter.angle', next: '@pop' }], // self-closing — back to JS
      [/>/, { token: 'delimiter.angle', switchTo: '@jsxChildren' }],
      [/[A-Za-z_:][\w:.-]*/, 'attribute.name'],
      [/=/, 'delimiter'],
      [/"([^"]*)"/, 'attribute.value'],
      [/'([^']*)'/, 'attribute.value'],
      [/\{/, { token: 'delimiter.bracket', next: '@jsxExpr' }],
      [/\s+/, ''],
    ],

    // Tag body: text, nested tags, `{…}` expressions, and the closing tag.
    jsxChildren: [
      [/<\//, { token: 'delimiter.angle', next: '@jsxClose' }],
      [/<(?=[A-Za-z])/, { token: 'delimiter.angle', next: '@jsxOpen' }],
      [/\{/, { token: 'delimiter.bracket', next: '@jsxExpr' }],
      [/[^<{]+/, 'string.jsx'], // literal text
    ],

    jsxClose: [
      [/[A-Za-z][\w.-]*/, 'tag'],
      [/>/, { token: 'delimiter.angle', next: '@pop' }],
    ],

    // `{ … }` embed — return to JS rules until the brace count balances.
    jsxExpr: [
      [/\{/, { token: 'delimiter.bracket', next: '@jsxExpr' }],
      [/\}/, { token: 'delimiter.bracket', next: '@pop' }],
      [/<(?=[A-Za-z>/])/, { token: 'delimiter.angle', next: '@jsxOpen' }],
      [/[()[\]]/, '@brackets'],
      ...jsRules,
      [/[<>]/, 'operator'],
      [/\s+/, ''],
    ],

    comment: [
      [/[^/*]+/, 'comment'],
      [/\*\//, 'comment', '@pop'],
      [/[/*]/, 'comment'],
    ],

    template: [
      [/[^`$\\]+/, 'string'],
      [/\\./, 'string.escape'],
      [/\$\{/, { token: 'delimiter.bracket', next: '@jsxExpr' }],
      [/`/, 'string', '@pop'],
    ],
  },
};

const config = {
  comments: { lineComment: '//', blockComment: ['/*', '*/'] },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
    { open: '`', close: '`' },
    { open: '<', close: '>' },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '<', close: '>' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
};

let registered = false;
export function registerJsx(monaco) {
  if (registered) return;
  registered = true;
  monaco.languages.register({ id: 'jsx' });
  monaco.languages.setMonarchTokensProvider('jsx', language);
  monaco.languages.setLanguageConfiguration('jsx', config);
}
