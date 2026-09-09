import { iconLoaders } from './generated/loaders.js';
import { normalizeIconName, setIconResolver } from './registry.js';
import type { IconResolver } from './types.js';
import type { IconName } from './generated/names.js';

/** Loads only requested families. All import paths are generated and allowlisted. */
export const fluentIconResolver: IconResolver = (input) => {
  const name = normalizeIconName(input);
  if (!Object.hasOwn(iconLoaders, name)) return undefined;
  return iconLoaders[name as IconName]();
};

export function enableIconLoader(): void { setIconResolver(fluentIconResolver); }
