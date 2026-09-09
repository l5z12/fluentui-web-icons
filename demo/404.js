import { toggleDemoTheme } from './generated/components.js';
import './dist/auto.js';

document.querySelector('#home')?.addEventListener('click', () => { location.assign('./'); });
document.querySelector('#explorer-nav')?.addEventListener('click', () => { location.assign('./'); });
document.querySelector('#theme')?.addEventListener('click', toggleDemoTheme);
document.documentElement.dataset.ready = 'true';
