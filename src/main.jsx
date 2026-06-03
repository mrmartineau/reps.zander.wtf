import React from 'react';
import { createRoot } from 'react-dom/client';
// zui is CSS-first: pull in the base tokens + component styles, then the
// React components consume them.
import '@mrmartineau/zui/css';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
