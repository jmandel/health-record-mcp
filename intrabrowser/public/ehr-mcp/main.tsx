import React from 'react';
import ReactDOM from 'react-dom/client';
import EhrMcpTool from './index';
import './index.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error("Failed to find the root element");
}

const root = ReactDOM.createRoot(container);

root.render(
  <React.StrictMode>
    <EhrMcpTool />
  </React.StrictMode>
); 