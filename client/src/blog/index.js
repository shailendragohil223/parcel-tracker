// Blog post list (titles, dates) and, in the browser, on-demand loading of a post's text.
// Post text is loaded only on that post's page, so the blog adds nothing to other pages' download.
import BLOG from './posts.json';

export { BLOG };
export const POSTS = [...BLOG.posts].sort((a, b) => b.published.localeCompare(a.published));
export const postPath = (p) => `/blog/${p.slug}`;
export const postFor = (path) => {
  const m = path.match(/^\/blog\/([a-z0-9-]+)$/);
  return (m && POSTS.find((p) => p.slug === m[1])) || null;
};

const loaders = import.meta.glob('./*.md', { query: '?raw', import: 'default' });
export async function loadPostBody(path) {
  const post = postFor(path);
  const load = post && loaders[`./${post.slug}.md`];
  return load ? load() : null;
}
