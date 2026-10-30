import AdSlot from './AdSlot.jsx';

// Small, safe Markdown renderer for blog posts (client/src/blog/*.md).
// Turns text into React elements (never raw HTML), so a post can't inject scripts.
// Supported:
//   ## Heading / ### Subheading        (an id is made from the text, for #links)
//   > In short: ...                     (highlighted direct answer)
//   - item / 1. item                    (lists)
//   | a | b |  tables (first row = header, second row = |---|)
//   **bold**, [text](/internal-link) or [text](https://external.site)
//   [ad]                                (Google AdSense ad unit; use at most once or twice)
const slugify = (s) => s.toLowerCase().replace(/\*\*/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function inline(text, key = 'i') {
  const out = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m;
  let n = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${key}-${n++}`;
    if (m[1] !== undefined) {
      out.push(<b key={k}>{inline(m[1], k)}</b>);
    } else {
      const [, , label, href] = m;
      if (/^https?:\/\//.test(href)) out.push(<a key={k} href={href} target="_blank" rel="noopener noreferrer">{label}</a>);
      else if (/^[/#]/.test(href)) out.push(<a key={k} href={href}>{label}</a>);
      else out.push(label); // anything else (javascript:, data: ...) is shown as plain text
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const cells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

export default function Markdown({ text }) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const k = `b${i}`;
    if (!line.trim()) { i++; continue; }

    const h = line.match(/^(#{2,3})\s+(.+)$/);
    if (h) {
      const Tag = h[1].length === 2 ? 'h2' : 'h3';
      blocks.push(<Tag key={k} id={slugify(h[2])}>{inline(h[2], k)}</Tag>);
      i++; continue;
    }
    if (line.trim() === '[ad]') { blocks.push(<AdSlot key={k} />); i++; continue; }

    const take = (test) => { const got = []; while (i < lines.length && test(lines[i])) got.push(lines[i++]); return got; };

    if (line.startsWith('>')) {
      const text = take((l) => l.startsWith('>')).map((l) => l.replace(/^>\s?/, '')).join(' ');
      blocks.push(<p key={k} className="answer">{inline(text, k)}</p>);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items = take((l) => /^[-*]\s+/.test(l)).map((l) => l.replace(/^[-*]\s+/, ''));
      blocks.push(<ul key={k}>{items.map((t, j) => <li key={j}>{inline(t, `${k}-${j}`)}</li>)}</ul>);
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items = take((l) => /^\d+\.\s+/.test(l)).map((l) => l.replace(/^\d+\.\s+/, ''));
      blocks.push(<ol key={k}>{items.map((t, j) => <li key={j}>{inline(t, `${k}-${j}`)}</li>)}</ol>);
      continue;
    }
    if (line.trim().startsWith('|')) {
      const rows = take((l) => l.trim().startsWith('|')).filter((l) => !/^\s*\|?\s*:?-{2,}/.test(l)).map(cells);
      const [head, ...body] = rows;
      blocks.push(
        <div key={k} className="table-wrap">
          <table>
            <thead><tr>{head.map((c, j) => <th key={j} scope="col">{inline(c, `${k}h${j}`)}</th>)}</tr></thead>
            <tbody>{body.map((r, ri) => <tr key={ri}>{r.map((c, j) => <td key={j}>{inline(c, `${k}r${ri}c${j}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
      continue;
    }
    // Paragraph: consecutive plain lines
    const para = take((l) => l.trim() && !/^(#{2,3}\s|>|[-*]\s|\d+\.\s|\|)/.test(l) && l.trim() !== '[ad]');
    blocks.push(<p key={k}>{inline(para.join(' '), k)}</p>);
  }
  return <>{blocks}</>;
}
