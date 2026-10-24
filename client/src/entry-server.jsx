// Server-side rendering entry (built with `vite build --ssr`, used by server/src/seo.js).
import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './App.jsx';


export function render(path) {
  return renderToString(
    <React.StrictMode>
      <App path={path} />
    </React.StrictMode>
  );
}
