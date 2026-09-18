import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/unbounded/600.css';
import '@fontsource/unbounded/700.css';

import './styles/theme.css';
import './styles/app.css';
import App from './App';
import TrayMenu from './TrayMenu';

const root = document.getElementById('root');
if (!root) throw new Error('#root is missing from index.html');

// The tray menu is a second window on the same bundle, told apart by its hash.
const isTrayMenu = window.location.hash === '#traymenu';
if (isTrayMenu) document.documentElement.dataset.surface = 'traymenu';

createRoot(root).render(
  <StrictMode>
    {isTrayMenu ? <TrayMenu /> : <App />}
  </StrictMode>,
);
