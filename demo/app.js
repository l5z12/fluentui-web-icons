import { applyDemoTheme } from './generated/components.js';
import './dist/auto.js';
import { iconCatalog, glyphCount, upstreamVersion } from './dist/generated/catalog.js';

const $ = (selector) => document.querySelector(selector);
// These Fluent controls expose their native control. Give that focusable input
// the accessible name declared on its host (host ARIA is not inherited).
for (const element of document.querySelectorAll('fluent-text-input[aria-label], fluent-dropdown[aria-label]')) {
  element.control.setAttribute('aria-label', element.getAttribute('aria-label'));
}
const state = { query: '', variant: 'color', size: 24, page: 0, tint: undefined, selected: iconCatalog.find((icon) => icon.name === 'mail') ?? iconCatalog[0] };
const pageSize = 72;
$('#family-count').textContent = iconCatalog.length.toLocaleString();
$('#collection-count').textContent = iconCatalog.length.toLocaleString();
$('#upstream-version').textContent = upstreamVersion;
$('#collection-count').title = `${glyphCount.toLocaleString()} individual SVG designs`;

function renderGallery() {
  const terms = state.query.toLowerCase().trim().replaceAll('_', '-').split(/[\s-]+/).filter(Boolean);
  const matches = iconCatalog.filter((icon) => terms.every((term) => icon.name.includes(term)) && icon.variants.includes(state.variant));
  const pages = Math.max(1, Math.ceil(matches.length / pageSize));
  state.page = Math.min(state.page, pages - 1);
  const visible = matches.slice(state.page * pageSize, (state.page + 1) * pageSize);
  const fragment = document.createDocumentFragment();
  for (const icon of visible) {
    const button = document.createElement('fluent-button');
    button.setAttribute('appearance', 'outline');
    button.className = 'icon-card';
    button.setAttribute('aria-label', icon.name);
    button.setAttribute('aria-pressed', String(icon.name === state.selected.name));
    button.title = icon.name;
    const element = document.createElement('fluent-icon');
    element.name = icon.name;
    element.variant = state.variant;
    element.size = state.size;
    const caption = document.createElement('span');
    caption.textContent = icon.name;
    button.append(element, caption);
    button.addEventListener('click', () => {
      state.selected = icon;
      $('#icon-grid [aria-pressed="true"]')?.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-pressed', 'true');
      renderInspector();
    });
    fragment.append(button);
  }
  $('#icon-grid').replaceChildren(fragment);
  $('#empty').hidden = matches.length > 0;
  $('#results-count').textContent = `${matches.length.toLocaleString()} icons${state.query ? ` matching “${state.query}”` : ' to explore'}`;
  $('#page-count').textContent = `Page ${state.page + 1} of ${pages}`;
  $('#previous').disabled = state.page === 0;
  $('#next').disabled = state.page + 1 >= pages;
}

function markup() {
  const label = ($('#label').value ?? '').trim();
  const escape = (text) => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return `<fluent-icon\n  name="${state.selected.name}"\n  variant="${state.variant}"\n  size="${state.size}"${label ? `\n  label="${escape(label)}"` : ''}${state.tint && state.variant !== 'color' ? `\n  style="color: ${state.tint}"` : ''}\n></fluent-icon>`;
}

function renderInspector() {
  $('#preview').name = state.selected.name;
  $('#preview').variant = state.variant;
  $('#preview').label = $('#label').value ?? '';
  $('#selected-name').textContent = state.selected.name;
  $('#selected-meta').textContent = `${state.selected.variants.map((style) => style[0].toUpperCase() + style.slice(1)).join(' + ')} · ${state.selected.sizes.join(', ')} px`;
  $('#tint-field').hidden = state.variant === 'color';
  $('#original-palette').hidden = state.variant !== 'color';
  $('#markup').textContent = markup();
}

$('#search').addEventListener('input', (event) => { state.query = event.target.value; state.page = 0; renderGallery(); });
$('#clear-search').addEventListener('click', () => { $('#search').value = ''; state.query = ''; state.page = 0; renderGallery(); $('#search').focus(); });
for (const button of document.querySelectorAll('[data-variant]')) button.addEventListener('click', () => {
  state.variant = button.dataset.variant;
  state.page = 0;
  if (!state.selected.variants.includes(state.variant)) state.selected = iconCatalog.find((icon) => icon.variants.includes(state.variant));
  for (const option of document.querySelectorAll('[data-variant]')) {
    option.setAttribute('aria-pressed', String(option === button));
    option.setAttribute('appearance', option === button ? 'primary' : 'subtle');
  }
  renderGallery(); renderInspector();
});
$('#size').addEventListener('change', (event) => { state.size = Number(event.target.value); renderGallery(); renderInspector(); });
$('#previous').addEventListener('click', () => { state.page--; renderGallery(); });
$('#next').addEventListener('click', () => { state.page++; renderGallery(); });
$('#color').addEventListener('input', (event) => {
  const color = (event.target.value ?? '').trim();
  if (/^#[a-f0-9]{6}$/i.test(color)) {
    state.tint = color;
    $('#preview').style.color = color;
    $('#color').removeAttribute('aria-invalid');
    renderInspector();
  } else $('#color').setAttribute('aria-invalid', 'true');
});
$('#label').addEventListener('input', renderInspector);
let toastTimer;
async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    $('#toast').textContent = 'Copied. Ready for your next idea.';
  } catch {
    $('#toast').textContent = 'Clipboard unavailable. Select and copy the code in the preview.';
  }
  $('#toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 2800);
}
$('#copy-markup').addEventListener('click', () => copy(markup()));
$('#copy-import').addEventListener('click', () => copy(`import { defineFluentIcon, registerIcons } from 'fluentui-web-icons';\nimport icon from 'fluentui-web-icons/icons/${state.selected.name}';\n\nregisterIcons(icon);\ndefineFluentIcon();\n\n// HTML:\n${markup()}`));
for (const view of ['explorer', 'guide']) $(`#${view}-nav`).addEventListener('click', () => {
  for (const name of ['explorer', 'guide']) {
    $(`#${name}`).hidden = name !== view;
    $(`#${name}-nav`).classList.toggle('active', name === view);
    if (name === view) $(`#${name}-nav`).setAttribute('aria-current', 'page');
    else $(`#${name}-nav`).removeAttribute('aria-current');
  }
});
$('#theme').addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme !== 'dark';
  applyDemoTheme(dark);
  $('#theme').setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
});
document.addEventListener('keydown', (event) => {
  const editing = event.composedPath().some((node) => node instanceof HTMLElement && (['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName) || node.isContentEditable));
  if (event.key === '/' && !editing) {
    event.preventDefault(); $('#explorer-nav').click(); $('#search').focus();
  }
});
renderGallery();
renderInspector();
document.documentElement.dataset.ready = 'true';
try {
  const initial = await fetch(new URL('__revision', import.meta.url)).then((response) => {
    if (!response.ok) throw new Error('static host');
    return response.json();
  });
  if (initial.development) setInterval(async () => {
    try { if ((await fetch(new URL('__revision', import.meta.url)).then((response) => response.json())).revision !== initial.revision) location.reload(); } catch { /* Server restarting. */ }
  }, 1500);
} catch { /* Static hosts have no local revision endpoint. */ }
