import type { Anchor, Box } from "./types";

const TEXT_CANDIDATES =
  "a, button, [role], input, select, textarea, summary, h1, h2, h3, h4, h5, h6, label, p, li, span";

export interface Resolved {
  element: Element | null;
  box: Box | null;
  fixed: boolean;
}

export function resolveAnchor(doc: Document, anchor: Anchor | null | undefined): Resolved {
  if (!anchor) return { element: null, box: null, fixed: false };
  const element =
    bySelector(doc, anchor.selector) ?? byXpath(doc, anchor.xpath) ?? byText(doc, anchor.text);
  if (element) return { element, box: documentBox(element), fixed: isFixed(element) };
  return { element: null, box: anchor.box ?? null, fixed: false };
}

export function documentBox(element: Element): Box {
  const rect = element.getBoundingClientRect();
  const view = element.ownerDocument.defaultView;
  return {
    x: rect.left + (view?.scrollX ?? 0),
    y: rect.top + (view?.scrollY ?? 0),
    width: rect.width,
    height: rect.height,
  };
}

export function isFixed(element: Element): boolean {
  const view = element.ownerDocument.defaultView;
  if (!view) return false;
  for (let current: Element | null = element; current; current = current.parentElement) {
    const position = view.getComputedStyle(current).position;
    if (position === "fixed" || position === "sticky") return true;
  }
  return false;
}

function bySelector(doc: Document, selector: string | null | undefined): Element | null {
  if (!selector) return null;
  try {
    return doc.querySelector(selector);
  } catch {
    return null;
  }
}

const STEP = /^([a-z][\w-]*)(?:\[(\d+)\])?$/i;

function byXpath(doc: Document, xpath: string | null | undefined): Element | null {
  if (!xpath?.startsWith("/")) return null;
  const [root, ...steps] = xpath.slice(1).split("/");
  let current: Element | null =
    root?.toLowerCase() === doc.documentElement.localName ? doc.documentElement : null;
  for (const step of steps) {
    const match = STEP.exec(step);
    if (!current || !match) return null;
    const [, tag, position] = match;
    const siblings: Element[] = [...current.children].filter(
      (child) => child.localName === tag?.toLowerCase(),
    );
    current = siblings[(position ? Number(position) : 1) - 1] ?? null;
  }
  return current;
}

function byText(doc: Document, text: string | null | undefined): Element | null {
  const wanted = normalise(text ?? "");
  if (!wanted) return null;
  let best: Element | null = null;
  for (const element of doc.querySelectorAll(TEXT_CANDIDATES)) {
    if (normalise(element.textContent ?? "") !== wanted) continue;
    if (!best || best.contains(element)) best = element;
  }
  return best;
}

function normalise(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}
