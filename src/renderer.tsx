import 'assets/styles/global.scss';

import { createRoot } from 'react-dom/client';

import { App } from './react-components/app';

const container = document.getElementById('root');

if (container) {
  createRoot(container).render(<App />);
} else {
  console.error('Root container not found');
}
