// In-depth guide for each indexed courier page: client/src/couriers/<courier slug>.md
// (same Markdown as the blog, see components/Markdown.jsx). Bundled in so the guide is in the
// server-rendered HTML and hydrates without a second request. Don't use [ad] here: the courier
// page already has one ad unit.
const guides = import.meta.glob('./*.md', { query: '?raw', import: 'default', eager: true });
export const courierGuide = (slug) => guides[`./${slug}.md`] ?? null;
