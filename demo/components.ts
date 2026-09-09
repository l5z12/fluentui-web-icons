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

export function applyDemoTheme(dark: boolean): void {
  setTheme(dark ? webDarkTheme : webLightTheme);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

applyDemoTheme(false);
