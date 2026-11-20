type Attributes = Record<string, string | number | boolean | undefined>;

export function h<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  attributes: Attributes = {},
  ...children: (Node | string | null | undefined | false)[]
): HTMLElementTagNameMap[K] {
  const element = doc.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (value === undefined || value === false) continue;
    if (name === "class") element.className = String(value);
    else element.setAttribute(name, value === true ? "" : String(value));
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    element.append(child);
  }
  return element;
}

export function place(element: HTMLElement, x: number, y: number, width?: number, height?: number) {
  element.style.left = `${Math.round(x)}px`;
  element.style.top = `${Math.round(y)}px`;
  if (width !== undefined) element.style.width = `${Math.round(width)}px`;
  if (height !== undefined) element.style.height = `${Math.round(height)}px`;
}
