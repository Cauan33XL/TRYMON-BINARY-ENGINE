import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './style.css';
import * as kernel from './services/kernelService';

const rootElement = document.getElementById('root')!;

// Mount the App immediately. 
// The App will handle kernel initialization within its own lifecycle.
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Trigger kernel initialization asynchronously.
// This doesn't block the initial render.
kernel.init().catch((error) => {
  console.error('[main.tsx] FATAL: Kernel bridge failed:', error);
});
