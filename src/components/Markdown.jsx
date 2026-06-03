import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Reusable Markdown renderer. GitHub-flavoured (tables, strikethrough, task
// lists, autolinks) via remark-gfm, with inline/block code styled using ZUI's
// code classes. react-markdown v10 dropped the `className` prop, so we wrap the
// output in a div we can target.
export function Markdown({ children, className = 'markdown' }) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Block code arrives with a `language-*` class or contains newlines;
          // everything else is an inline snippet.
          code({ className: codeClass, children: codeChildren, ...props }) {
            const isBlock =
              /language-/.test(codeClass || '') || String(codeChildren).includes('\n');
            return (
              <code
                className={isBlock ? codeClass : 'zui-code'}
                {...props}
              >
                {codeChildren}
              </code>
            );
          },
          pre({ children: preChildren }) {
            return <pre className="zui-pre">{preChildren}</pre>;
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
