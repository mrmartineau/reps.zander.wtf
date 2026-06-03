import { useRef } from 'react';

// Deliberately a styled textarea, not a heavyweight editor — keeps the PoC
// dependency-free. Swap in CodeMirror later if you want syntax highlighting.
export function CodeEditor({ value, onChange, onFirstEdit, disabled }) {
  const touched = useRef(false);

  function handleChange(e) {
    if (!touched.current) {
      touched.current = true;
      onFirstEdit?.();
    }
    onChange(e.target.value);
  }

  function handleKeyDown(e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.target;
      const { selectionStart: s, selectionEnd: end } = el;
      const next = value.slice(0, s) + '  ' + value.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = s + 2;
      });
    }
  }

  return (
    <textarea
      className="editor"
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
      value={value}
      disabled={disabled}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      aria-label="Solution editor"
    />
  );
}
