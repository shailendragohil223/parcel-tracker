// Server-side rendering only (imported by entry-server.jsx): every post's text, bundled in.
import { postFor } from './index.js';

const bodies = import.meta.glob('./*.md', { query: '?raw', import: 'default', eager: true });
export const postBodyFor = (path) => {
  const post = postFor(path);
  return post ? bodies[`./${post.slug}.md`] ?? null : null;
};
