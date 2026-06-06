// Lightweight markdown renderer (headings, bold, italic, lists, code, links)
import React from "react";

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderInline(text) {
  let t = escapeHtml(text);
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/(^|\s)\*([^*\n]+)\*/g, '$1<em>$2</em>');
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  return t;
}

export default function Markdown({ source = "" }) {
  const lines = source.split("\n");
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const ln = lines[i];
    if (ln.startsWith("```")) {
      const lang = ln.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      blocks.push(<pre key={blocks.length}><code className={`lang-${lang}`}>{codeLines.join("\n")}</code></pre>);
      continue;
    }
    if (/^#{1,6}\s/.test(ln)) {
      const level = ln.match(/^#+/)[0].length;
      const text = ln.replace(/^#+\s/, "");
      const Tag = `h${Math.min(level, 4)}`;
      blocks.push(React.createElement(Tag, { key: blocks.length, dangerouslySetInnerHTML: { __html: renderInline(text) } }));
      i++;
      continue;
    }
    if (/^[-*]\s/.test(ln)) {
      const items = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s/, ""));
        i++;
      }
      blocks.push(
        <ul key={blocks.length}>
          {items.map((it, k) => <li key={k} dangerouslySetInnerHTML={{ __html: renderInline(it) }} />)}
        </ul>
      );
      continue;
    }
    if (/^\d+\.\s/.test(ln)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      blocks.push(
        <ol key={blocks.length}>
          {items.map((it, k) => <li key={k} dangerouslySetInnerHTML={{ __html: renderInline(it) }} />)}
        </ol>
      );
      continue;
    }
    if (ln.trim() === "") { i++; continue; }
    const paraLines = [];
    while (i < lines.length && lines[i].trim() !== "" && !lines[i].startsWith("```") && !/^#{1,6}\s/.test(lines[i]) && !/^[-*]\s/.test(lines[i]) && !/^\d+\.\s/.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push(<p key={blocks.length} dangerouslySetInnerHTML={{ __html: renderInline(paraLines.join(" ")) }} />);
  }
  return <div className="md-content">{blocks}</div>;
}
