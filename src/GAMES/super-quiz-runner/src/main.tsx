import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import VanillaGame from './VanillaGame';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VanillaGame />
  </StrictMode>,
);
