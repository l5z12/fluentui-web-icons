import {
  Button, ButtonDefinition, TextInput, TextInputDefinition,
  Dropdown, DropdownDefinition, Listbox, ListboxDefinition,
  DropdownOption, DropdownOptionDefinition, Field, FieldDefinition,
  Label, LabelDefinition, Badge, BadgeDefinition, setTheme,
} from '@fluentui/web-components';
import { webDarkTheme, webLightTheme } from '@fluentui/tokens';
import { Updates } from '@microsoft/fast-element';

// FAST 3 registration is asynchronous. Finish upgrading controls before app.js
// assigns properties such as value and disabled.
await Promise.all([
  Button.define(ButtonDefinition), TextInput.define(TextInputDefinition),
  DropdownOption.define(DropdownOptionDefinition), Listbox.define(ListboxDefinition),
  Dropdown.define(DropdownDefinition), Field.define(FieldDefinition),
  Label.define(LabelDefinition), Badge.define(BadgeDefinition),
]);
await Updates.next();

const scheme = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
let followSystem = true;

export function applyDemoTheme(dark: boolean): void {
  setTheme(dark ? webDarkTheme : webLightTheme);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const button = document.querySelector('#theme');
  button?.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
  button?.querySelector('fluent-icon')?.setAttribute('name', dark ? 'weather-sunny' : 'weather-moon');
}

export function toggleDemoTheme(): void {
  followSystem = false;
  applyDemoTheme(document.documentElement.dataset.theme !== 'dark');
}

if (scheme) {
  applyDemoTheme(scheme.matches);
  scheme.addEventListener('change', () => {
    if (followSystem) applyDemoTheme(scheme.matches);
  });
} else {
  applyDemoTheme(false);
}
