import '@fontsource-variable/nunito/wght.css';
import './styles/index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { unlockAudioOnFirstGesture } from './lib/effects/playCue';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing in index.html');

unlockAudioOnFirstGesture();

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
