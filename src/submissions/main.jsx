import React from 'react';
import { createRoot } from 'react-dom/client';
import '@mrmartineau/zui/css';
import { SubmissionsApp } from '../SubmissionsApp.jsx';
import '../styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <SubmissionsApp />
  </React.StrictMode>
);
