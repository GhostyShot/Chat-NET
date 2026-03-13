import { useEffect, useRef } from 'react';

type Props = {
  content: string;
  renderMentions: (text: string) => React.ReactNode;
};

// Quick markdown-like renderer:
// - ```lang\ncode``` → syntax-highlighted block with copy button
// - inline `code` → <code>
// - **bold** → <strong>
// - *italic* → <em>
export function MessageContent({ content, renderMentions }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Code block pattern: ```lang?\n...\n```
  const CODE_BLOCK = /```([\w-]*)\n?([\s\S]*?)```/g;
  const INLINE_CODE = /`([^`]+)`/g;
  const BOLD = /\*\*([^*]+)\*\*/g;
  const ITALIC = /(?<!\*)\*([^*]+)\*(?!\*)/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  const rendered = content.replace(CODE_BLOCK, (match, lang, code, offset) => {
    // push text before this block
    if (offset > lastIndex) {
      const before = content.slice(lastIndex, offset);
      parts.push(<InlineText key={key++} text={before} renderMentions={renderMentions} />);
    }
    parts.push(
      <CodeBlock key={key++} lang={lang?.trim() || ''} code={code.trim()} />
    );
    lastIndex = offset + match.length;
    return '';
  });

  // remaining text after last code block
  if (lastIndex < content.length) {
    parts.push(<InlineText key={key++} text={content.slice(lastIndex)} renderMentions={renderMentions} />);
  }

  // If no code blocks, just inline render
  if (parts.length === 0) {
    return (
      <p className="message-content">
        <InlineText text={content} renderMentions={renderMentions} />
      </p>
    );
  }

  return <div ref={containerRef}>{parts}</div>;
}

function InlineText({ text, renderMentions }: { text: string; renderMentions: (t: string) => React.ReactNode }) {
  // Split by inline code, bold, italic
  const segments: React.ReactNode[] = [];
  let remaining = text;
  let k = 0;

  // Simple sequential replacement
  const tokenize = (str: string): React.ReactNode[] => {
    const result: React.ReactNode[] = [];
    let i = 0;
    while (i < str.length) {
      // inline code
      if (str[i] === '`') {
        const end = str.indexOf('`', i + 1);
        if (end !== -1) {
          if (i > 0) result.push(renderMentions(str.slice(0, i)));
          result.push(<code key={i} className="inline-code">{str.slice(i + 1, end)}</code>);
          str = str.slice(end + 1); i = 0; continue;
        }
      }
      // bold **
      if (str[i] === '*' && str[i+1] === '*') {
        const end = str.indexOf('**', i + 2);
        if (end !== -1) {
          if (i > 0) result.push(renderMentions(str.slice(0, i)));
          result.push(<strong key={i}>{str.slice(i + 2, end)}</strong>);
          str = str.slice(end + 2); i = 0; continue;
        }
      }
      // italic *
      if (str[i] === '*' && str[i+1] !== '*') {
        const end = str.indexOf('*', i + 1);
        if (end !== -1) {
          if (i > 0) result.push(renderMentions(str.slice(0, i)));
          result.push(<em key={i}>{str.slice(i + 1, end)}</em>);
          str = str.slice(end + 1); i = 0; continue;
        }
      }
      i++;
    }
    if (str) result.push(renderMentions(str));
    return result;
  };

  return <p className="message-content">{tokenize(text)}</p>;
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const copied = useRef(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleCopy = () => {
    void navigator.clipboard.writeText(code).then(() => {
      if (btnRef.current) {
        btnRef.current.textContent = 'Kopiert!';
        setTimeout(() => { if (btnRef.current) btnRef.current.textContent = 'Kopieren'; }, 2000);
      }
    });
  };

  return (
    <div className="code-block">
      <div className="code-block-header">
        {lang && <span className="code-lang">{lang}</span>}
        <button ref={btnRef} className="code-copy" onClick={handleCopy}>Kopieren</button>
      </div>
      <pre className="code-pre"><code>{code}</code></pre>
    </div>
  );
}
