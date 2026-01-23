import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './taskpane.css';

// Wait for Office.js to be ready
Office.onReady((info) => {
  if (info.host === Office.HostType.Outlook) {
    const root = ReactDOM.createRoot(document.getElementById('root')!);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
});

