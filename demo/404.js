import { toggleDemoTheme } from './generated/components.js';
import './dist/auto.js';
import { upstreamVersion } from './dist/generated/catalog.js';

for (const node of document.querySelectorAll('.upstream-version')) node.textContent = upstreamVersion;

document.querySelector('#home')?.addEventListener('click', () => { location.assign('./'); });
document.querySelector('#explorer-nav')?.addEventListener('click', () => { location.assign('./'); });
document.querySelector('#theme')?.addEventListener('click', toggleDemoTheme);
document.documentElement.dataset.ready = 'true';
