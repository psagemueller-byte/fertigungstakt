import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';

// Global Styles
const style = document.createElement('style');
style.textContent = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  body {
    margin: 0;
    background: #0a0e1a;
    color: #e5e7eb;
    overflow-x: hidden;
  }
  ::-webkit-scrollbar {
    width: 8px;
  }
  ::-webkit-scrollbar-track {
    background: #111827;
  }
  ::-webkit-scrollbar-thumb {
    background: #374151;
    border-radius: 4px;
  }
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    opacity: 1;
  }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
