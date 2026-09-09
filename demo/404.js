import { applyDemoTheme } from './generated/components.js';
import './dist/auto.js';

document.querySelector('#home')?.addEventListener('click', () => { location.assign('./'); });
document.querySelector('#explorer-nav')?.addEventListener('click', () => { location.assign('./'); });
document.querySelector('#theme')?.addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme !== 'dark';
  applyDemoTheme(dark);
  document.querySelector('#theme')?.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
});
document.documentElement.dataset.ready = 'true';
