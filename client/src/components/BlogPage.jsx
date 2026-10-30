import SEO from '../seo-pages.json';
import { BLOG, POSTS, postPath } from '../blog/index.js';
import Markdown from './Markdown.jsx';

const fmt = (d) => new Date(`${d}T00:00:00+05:30`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

function PostCard({ post }) {
  return (
    <li className="post-card">
      <a href={postPath(post)}>
        <span className="post-card-title">{post.h1}</span>
        <span className="post-card-desc">{post.description}</span>
        <span className="post-card-date">{fmt(post.published)}</span>
      </a>
    </li>
  );
}

export function BlogIndex() {
  return (
    <section className="panel info-page" aria-label="Blog posts">
      <ul className="post-list">
        {POSTS.map((p) => <PostCard key={p.slug} post={p} />)}
      </ul>
      <p className="muted small">
        Looking for the basics — tracking numbers and every status explained? Read the{' '}
        <a href="/parcel-tracking-guide">parcel tracking guide</a>.
      </p>
    </section>
  );
}

// `body` is the post's Markdown text: bundled in on the server, loaded before hydration in the browser.
export function BlogPost({ post, body }) {
  const more = POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);
  return (
    <>
      <article className="panel info-page info-page--article blog-post">
        <nav className="crumbs" aria-label="Breadcrumb">
          <a href="/">Home</a> › <a href={BLOG.index.path}>Blog</a>
        </nav>
        <p className="muted">
          By Track My Ship · Published <time dateTime={post.published}>{fmt(post.published)}</time>
          {post.updated !== post.published && <> · Updated <time dateTime={post.updated}>{fmt(post.updated)}</time></>}
        </p>
        {body ? <Markdown text={body} /> : <p>{post.description}</p>}

        <h2 id="track">Track your parcel</h2>
        <p>Enter your tracking number on the <a href="/">Track My Ship tracker</a>, or go to your courier's page:</p>
        <ul className="courier-links">
          {SEO.couriers.map((c) => <li key={c.slug}><a href={c.path}>{c.name} tracking</a></li>)}
        </ul>
        <p className="muted small">
          Track My Ship is an independent tracking website, not a courier. For problems with a delivery, contact the
          courier or the sender.
        </p>
      </article>

      {more.length > 0 && (
        <section className="panel info-page" aria-labelledby="more-posts">
          <h2 id="more-posts">More from the blog</h2>
          <ul className="post-list">{more.map((p) => <PostCard key={p.slug} post={p} />)}</ul>
        </section>
      )}
    </>
  );
}
