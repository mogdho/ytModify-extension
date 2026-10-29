// Small DOM builders shared by the popup tabs.

export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on')) node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key in node && typeof value !== 'string') node[key] = value;
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

const labelBlock = (label, hint, badge) =>
  el('div', { class: 'row__label' }, el('span', {}, label, badge ? el('span', { class: 'badge' }, badge) : null), hint ? el('small', {}, hint) : null);

// A row with an on/off switch. Returns { row, set(checked), setDisabled(bool) }.
export function switchRow({ label, hint, checked, onChange, sub = false, title }) {
  const button = el('button', {
    class: 'switch',
    type: 'button',
    role: 'switch',
    'aria-label': label,
    'aria-checked': String(!!checked),
  });
  const row = el('div', { class: `row${sub ? ' row--sub' : ''}`, title }, labelBlock(label, hint), button);
  button.addEventListener('click', () => {
    if (button.disabled) return;
    const next = button.getAttribute('aria-checked') !== 'true';
    button.setAttribute('aria-checked', String(next));
    onChange(next);
  });
  return {
    row,
    set: (value) => button.setAttribute('aria-checked', String(!!value)),
    setDisabled: (disabled) => {
      button.disabled = disabled;
      row.classList.toggle('is-disabled', disabled);
    },
  };
}

// A row with a range slider and a live value label.
export function sliderRow({ label, hint, min, max, step = 1, value, format = (v) => v, onInput, onChange, sub = false, title, list }) {
  const output = el('output', { class: 'slider__value' }, format(value));
  const input = el('input', { type: 'range', min, max, step, value, 'aria-label': label, list });
  input.addEventListener('input', () => {
    output.textContent = format(Number(input.value));
    onInput?.(Number(input.value));
  });
  input.addEventListener('change', () => onChange?.(Number(input.value)));
  const row = el(
    'div',
    { class: `row row--slider${sub ? ' row--sub' : ''}`, title },
    labelBlock(label, hint),
    el('div', { class: 'slider' }, input, output)
  );
  return {
    row,
    input,
    set: (v) => {
      input.value = v;
      output.textContent = format(Number(v));
    },
    setDisabled: (disabled) => {
      input.disabled = disabled;
      row.classList.toggle('is-disabled', disabled);
    },
  };
}

// A two-or-more option segmented control.
export function segmentRow({ label, options, value, onChange }) {
  const buttons = options.map(([optionValue, optionLabel]) =>
    el('button', { type: 'button', class: 'segment__option', 'aria-pressed': String(optionValue === value), dataset: { value: optionValue } }, optionLabel)
  );
  const set = (v) => buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === v)));
  buttons.forEach((b) =>
    b.addEventListener('click', () => {
      set(b.dataset.value);
      onChange(b.dataset.value);
    })
  );
  const row = el('div', { class: 'row' }, labelBlock(label), el('div', { class: 'segment', role: 'group', 'aria-label': label }, buttons));
  return { row, set };
}

// A colour picker row.
export function colorRow({ label, hint, value, onChange, sub = false }) {
  const input = el('input', { type: 'color', value, class: 'color', 'aria-label': label });
  input.addEventListener('input', () => onChange(input.value));
  const row = el('div', { class: `row${sub ? ' row--sub' : ''}` }, labelBlock(label, hint), input);
  return {
    row,
    set: (v) => (input.value = v),
    setDisabled: (disabled) => {
      input.disabled = disabled;
      row.classList.toggle('is-disabled', disabled);
    },
  };
}

export const debounce = (fn, ms) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

// A row with a dropdown.
export function selectRow({ label, hint, options, value, onChange, sub = false }) {
  const select = el(
    'select',
    { class: 'select', 'aria-label': label, onchange: () => onChange(select.value) },
    options.map(([optionValue, optionLabel]) => el('option', { value: optionValue }, optionLabel))
  );
  select.value = value;
  const row = el('div', { class: `row${sub ? ' row--sub' : ''}` }, labelBlock(label, hint), select);
  return {
    row,
    set: (v) => (select.value = v),
    setDisabled: (disabled) => {
      select.disabled = disabled;
      row.classList.toggle('is-disabled', disabled);
    },
  };
}
