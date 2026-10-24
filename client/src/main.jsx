import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import './styles.css';
import App from './App.jsx';

const root = document.getElementById('root');
const app = (
  <React.StrictMode>
    <App path={window.location.pathname} />
  </React.StrictMode>
);

// The server sends fully rendered HTML (data-ssr) so crawlers and AI search bots can read
// every page without JavaScript; the browser then attaches to it ("hydrates").
if (root.dataset.ssr) hydrateRoot(root, app);
else createRoot(root).render(app);
