import { defineFluentIcon } from './fluent-icon.js';
import { enableIconLoader } from './lazy.js';

enableIconLoader();
defineFluentIcon();
export * from './index.js';
