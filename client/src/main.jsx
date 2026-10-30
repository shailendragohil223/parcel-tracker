import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import './styles.css';
import App from './App.jsx';
import { loadPostBody } from './blog/index.js';

async function start() {
  const path = window.location.pathname;
  // Blog post pages: load the post's text first so the page matches the server-rendered HTML.
  const postBody = path.startsWith('/blog/') ? await loadPostBody(path.replace(/\/$/, '')).catch(() => null) : null;
  const root = document.getElementById('root');
  const app = (
    <React.StrictMode>
      <App path={path} postBody={postBody} />
    </React.StrictMode>
  );
  // The server sends fully rendered HTML (data-ssr) so crawlers and AI search bots can read
  // every page without JavaScript; the browser then attaches to it ("hydrates").
  if (root.dataset.ssr) hydrateRoot(root, app);
  else createRoot(root).render(app);
}
start();
