import React from 'react';
import ReactDOM from 'react-dom/client';
import EhrApp from './EhrApp';
// import './App.css'; // Don't import general App styles
import './EhrApp.css'; // Import EHR-specific styles

ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
    <EhrApp />
  // </React.StrictMode>,
); 