import { resolveAnchor } from "./anchor";
import { h, place } from "./dom";
import { drawHeatmap, fetchImage, type ImageLoader } from "./layers/heatmap";
import { orderNotes } from "./order";
import { SEVERITY_COLORS, STYLES } from "./styles";
import type { Box, Category, LayerName, Note, OverlayData, OverlayOptions } from "./types";

const HOST_ATTRIBUTE = "data-clarity-overlay";
const LAYERS: LayerName[] = ["heatmap", "clicks", "notes"];
const HOST_STYLE: Record<string, string> = {
  all: "initial",
  display: "block",
  position: "absolute",
  top: "0",
  left: "0",
  width: "0",
  height: "0",
  margin: "0",
  padding: "0",
  border: "0",
  overflow: "visible",
  contain: "none",
  transform: "none",
  filter: "none",
  opacity: "1",
  visibility: "visible",
  "clip-path": "none",
  "z-index": "2147483647",
  "pointer-events": "none",
};
const CATEGORY_LABELS: Record<Category, string> = {
  visual: "Visual",
  ux: "UX",
  functional: "Functional",
  content: "Content",
  conversion: "Conversion",
  accessibility: "Accessibility",
  performance: "Performance",
};

interface Placed {
  box: Box | null;
  fixed: boolean;
}

export interface OverlayConfig extends OverlayOptions {
  loadImage?: ImageLoader;
}

export class Overlay {
  readonly document: Document;
  private data: OverlayData;
  private notes: Note[] = [];
  private visible: Record<LayerName, boolean>;
  private hiddenCategories = new Set<Category>();
  private opacity: number;
  private activeId: string | null = null;
  private host: HTMLElement | null = null;
  private root: ShadowRoot | null = null;
  private parts: Partial<
    Record<
      "stage" | "pinned" | "heat" | "clicks" | "notes" | "pinnedNotes" | "card" | "panel",
      HTMLElement
    >
  > = {};
  private frame = 0;
  private observers: (() => void)[] = [];
  private readonly load: ImageLoader;
  private releaseHeatmap: () => void = () => undefined;

  constructor(
    data: OverlayData,
    private readonly options: OverlayConfig = {},
  ) {
    this.document = options.document ?? document;
    this.data = data;
    this.notes = orderNotes(data.notes ?? []);
    this.visible = { heatmap: true, clicks: false, notes: true, ...options.layers };
    this.opacity = options.opacity ?? 0.75;
    this.load = options.loadImage ?? fetchImage;
  }

  get mounted(): boolean {
    return this.host !== null;
  }

  get orderedNotes(): readonly Note[] {
    return this.notes;
  }

  mount(): this {
    if (this.host) return this;
    const doc = this.document;
    doc.querySelector(`[${HOST_ATTRIBUTE}]`)?.remove();
    this.host = doc.createElement("clarity-overlay");
    this.host.setAttribute(HOST_ATTRIBUTE, "");
    for (const [property, value] of Object.entries(HOST_STYLE)) {
      this.host.style.setProperty(property, value, "important");
    }
    this.root = this.host.attachShadow({ mode: "open" });
    const stage = h(doc, "div", { class: "stage" });
    const pinned = h(doc, "div", { class: "pinned" });
    const heat = h(doc, "div", { class: "heat layer" });
    const clicks = h(doc, "div", { class: "layer clicks" });
    const notes = h(doc, "div", { class: "layer notes" });
    const pinnedNotes = h(doc, "div", { class: "layer notes" });
    stage.append(heat, clicks, notes);
    pinned.append(pinnedNotes);
    this.root.append(h(doc, "style", {}, STYLES), stage, pinned);
    this.parts = { stage, pinned, heat, clicks, notes, pinnedNotes };
    doc.documentElement.append(this.host);

    if (this.options.panel !== false) this.renderPanel();
    this.listen();
    this.applyVisibility();
    void this.renderHeatmap();
    this.layout();
    return this;
  }

  destroy(): void {
    cancelAnimationFrame(this.frame);
    this.releaseHeatmap();
    for (const stop of this.observers) stop();
    this.observers = [];
    this.host?.remove();
    this.host = null;
    this.root = null;
    this.parts = {};
  }

  setData(data: OverlayData): void {
    this.data = data;
    this.notes = orderNotes(data.notes ?? []);
    if (!this.host) return;
    void this.renderHeatmap();
    if (this.options.panel !== false) this.renderPanel();
    this.layout();
  }

  setLayer(layer: LayerName, visible: boolean): void {
    this.visible[layer] = visible;
    this.applyVisibility();
    this.renderPanel();
  }

  setOpacity(opacity: number): void {
    this.opacity = Math.min(1, Math.max(0, opacity));
    this.applyVisibility();
  }

  setCategoryVisible(category: Category, visible: boolean): void {
    if (visible) this.hiddenCategories.delete(category);
    else this.hiddenCategories.add(category);
    if (
      this.activeId &&
      this.hiddenCategories.has(this.noteById(this.activeId)?.category as Category)
    ) {
      this.activeId = null;
    }
    this.renderPanel();
    this.layout();
  }

  focusNote(id: string): void {
    const note = this.noteById(id);
    if (!note) return;
    this.activeId = id;
    this.hiddenCategories.delete(note.category);
    this.setLayer("notes", true);
    const placed = this.position(note);
    const view = this.document.defaultView;
    if (placed.box && !placed.fixed && view) {
      const target = placed.box.y - view.innerHeight / 3;
      view.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
    }
    this.options.onFocusNote?.(note);
    this.layout();
  }

  step(direction: 1 | -1): void {
    const notes = this.shownNotes();
    if (!notes.length) return;
    const index = notes.findIndex((note) => note.id === this.activeId);
    const next = notes[(index + direction + notes.length) % notes.length];
    if (next) this.focusNote(next.id);
  }

  close(): void {
    this.activeId = null;
    this.layout();
  }

  layout = (): void => {
    if (!this.host) return;
    const doc = this.document;
    const width = Math.max(doc.documentElement.scrollWidth, this.data.viewport.width);
    const height = Math.max(doc.documentElement.scrollHeight, this.data.documentHeight);
    place(this.parts.stage as HTMLElement, 0, 0, width, height);
    this.renderClicks();
    this.renderNotes();
  };

  private shownNotes(): Note[] {
    return this.notes.filter((note) => !this.hiddenCategories.has(note.category));
  }

  private noteById(id: string): Note | undefined {
    return this.notes.find((note) => note.id === id);
  }

  private position(note: { anchor?: Note["anchor"] }): Placed {
    const { box, fixed } = resolveAnchor(this.document, note.anchor);
    if (!box || !fixed) return { box, fixed };
    const view = this.document.defaultView;
    return {
      box: { ...box, x: box.x - (view?.scrollX ?? 0), y: box.y - (view?.scrollY ?? 0) },
      fixed,
    };
  }

  private applyVisibility(): void {
    const { heat, clicks, notes, pinnedNotes } = this.parts;
    if (heat) {
      heat.hidden = !this.visible.heatmap || !this.data.heatmap;
      heat.style.opacity = String(this.opacity);
    }
    if (clicks) clicks.hidden = !this.visible.clicks;
    if (notes) notes.hidden = !this.visible.notes;
    if (pinnedNotes) pinnedNotes.hidden = !this.visible.notes;
  }

  private async renderHeatmap(): Promise<void> {
    const layer = this.parts.heat;
    this.releaseHeatmap();
    if (!layer) return;
    layer.replaceChildren();
    if (!this.data.heatmap) {
      this.applyVisibility();
      return;
    }
    try {
      this.releaseHeatmap = await drawHeatmap(layer, this.data.heatmap, this.load);
    } catch {
      layer.hidden = true;
    }
  }

  private renderClicks(): void {
    const layer = this.parts.clicks;
    if (!layer) return;
    const doc = this.document;
    const targets = this.data.clicks ?? [];
    const peak = Math.max(...targets.map((target) => target.click), 0) || 1;
    layer.replaceChildren(
      ...targets.flatMap((target) => {
        const { box } = resolveAnchor(doc, target.anchor);
        if (!box) return [];
        const element = h(
          doc,
          "div",
          { class: "target", title: target.name },
          h(doc, "span", {}, `${Math.round(target.click * 100)}%`),
        );
        element.style.setProperty("--strength", (0.35 + 0.65 * (target.click / peak)).toFixed(2));
        place(element, box.x, box.y, box.width, box.height);
        return [element];
      }),
    );
  }

  private renderNotes(): void {
    const { notes: scrolling, pinnedNotes: pinned } = this.parts;
    if (!scrolling || !pinned) return;
    const doc = this.document;
    const scrollingItems: HTMLElement[] = [];
    const pinnedItems: HTMLElement[] = [];
    let card: HTMLElement | null = null;

    this.notes.forEach((note, index) => {
      if (this.hiddenCategories.has(note.category)) return;
      const { box, fixed } = this.position(note);
      if (!box) return;
      const tone = SEVERITY_COLORS[note.severity] ?? "#5e6ad2";
      const active = note.id === this.activeId;
      const marker = h(
        doc,
        "button",
        {
          class: `marker ${note.status}${active ? " active" : ""}`,
          type: "button",
          "aria-label": `Note ${index + 1}: ${note.title}`,
          "data-note": note.id,
        },
        String(index + 1),
      );
      marker.style.background = tone;
      place(marker, box.x + box.width, box.y);
      marker.addEventListener("click", (event) => {
        event.stopPropagation();
        if (active) this.close();
        else this.focusNote(note.id);
      });
      const bucket = fixed ? pinnedItems : scrollingItems;
      if (active) {
        const outline = h(doc, "div", { class: "outline" });
        outline.style.setProperty("--tone", tone);
        place(outline, box.x - 3, box.y - 3, box.width + 6, box.height + 6);
        bucket.push(outline);
        card = this.renderCard(note, index, box, fixed);
      }
      bucket.push(marker);
    });

    if (!card && this.activeId) {
      const active = this.noteById(this.activeId);
      if (active) card = this.renderCard(active, this.notes.indexOf(active), null, true);
    }

    scrolling.replaceChildren(...scrollingItems);
    pinned.replaceChildren(...pinnedItems, ...(card ? [card] : []));
  }

  private renderCard(note: Note, index: number, box: Box | null, fixed: boolean): HTMLElement {
    const doc = this.document;
    const view = doc.defaultView;
    const card = h(
      doc,
      "div",
      { class: "card", role: "dialog", "aria-label": note.title },
      h(
        doc,
        "div",
        { class: "meta" },
        h(doc, "span", { class: "chip" }, `#${index + 1}`),
        h(
          doc,
          "span",
          { class: "chip", style: `color:${SEVERITY_COLORS[note.severity]}` },
          note.severity[0]?.toUpperCase() + note.severity.slice(1),
        ),
        h(doc, "span", { class: "chip" }, CATEGORY_LABELS[note.category]),
        h(doc, "span", { class: "chip" }, note.status === "verified" ? "Verified" : "Predicted"),
        h(doc, "span", { class: "chip" }, `${Math.round(note.confidence * 100)}% confidence`),
      ),
      h(doc, "h3", {}, note.title),
      h(doc, "p", {}, note.description),
      h(doc, "p", { class: "fix" }, h(doc, "strong", {}, "Recommendation: "), note.recommendation),
      h(
        doc,
        "nav",
        {},
        h(doc, "button", { type: "button", "data-step": "-1" }, "Previous"),
        h(doc, "button", { type: "button", "data-close": "" }, "Close"),
        h(doc, "button", { type: "button", "data-step": "1" }, "Next"),
      ),
    );
    card.addEventListener("click", (event) => {
      const button = (event.target as Element).closest("button");
      if (!button) return;
      if (button.hasAttribute("data-close")) this.close();
      const step = button.getAttribute("data-step");
      if (step) this.step(Number(step) as 1 | -1);
    });

    const viewportWidth = view?.innerWidth ?? 1024;
    if (!box) {
      place(card, viewportWidth - 336, 16);
      return card;
    }
    const scrollX = fixed ? 0 : (view?.scrollX ?? 0);
    const scrollY = fixed ? 0 : (view?.scrollY ?? 0);
    const left = Math.min(Math.max(8, box.x - scrollX + 18), viewportWidth - 336);
    const top = Math.max(8, box.y - scrollY + box.height + 12);
    place(card, left, top);
    return card;
  }

  private renderPanel(): void {
    if (!this.root || this.options.panel === false) return;
    const doc = this.document;
    const previous = this.parts.panel;
    const collapsed = previous?.classList.contains("collapsed") ?? false;
    const categories = [...new Set(this.notes.map((note) => note.category))];
    const shown = this.shownNotes();

    const toggle = (layer: LayerName, label: string) =>
      h(
        doc,
        "label",
        {},
        h(doc, "input", { type: "checkbox", "data-layer": layer, checked: this.visible[layer] }),
        label,
      );

    const panel = h(
      doc,
      "section",
      { class: `panel${collapsed ? " collapsed" : ""}`, "aria-label": "Clarity overlay" },
      h(
        doc,
        "header",
        {},
        h(doc, "strong", {}, "Clarity"),
        h(doc, "button", { type: "button", "data-collapse": "" }, collapsed ? "Show" : "Hide"),
      ),
      h(
        doc,
        "div",
        { class: "body" },
        toggle("heatmap", "Attention heatmap"),
        toggle("clicks", "Predicted clicks"),
        toggle("notes", `Review notes (${this.notes.length})`),
        h(
          doc,
          "label",
          {},
          "Opacity",
          h(doc, "input", {
            type: "range",
            min: 0,
            max: 100,
            value: Math.round(this.opacity * 100),
            "data-opacity": "",
          }),
        ),
        categories.length > 1 &&
          h(
            doc,
            "div",
            { class: "filters" },
            ...categories.map((category) =>
              h(
                doc,
                "button",
                {
                  type: "button",
                  class: "chip",
                  "data-category": category,
                  "aria-pressed": String(!this.hiddenCategories.has(category)),
                },
                CATEGORY_LABELS[category],
              ),
            ),
          ),
        shown.length
          ? h(
              doc,
              "ol",
              {},
              ...shown.map((note) =>
                h(
                  doc,
                  "li",
                  {},
                  h(
                    doc,
                    "button",
                    { type: "button", "data-focus": note.id },
                    h(doc, "span", {
                      class: "dot",
                      style: `background:${SEVERITY_COLORS[note.severity]}`,
                    }),
                    h(doc, "span", {}, `${this.notes.indexOf(note) + 1}.`),
                    h(doc, "span", { class: "title" }, note.title),
                  ),
                ),
              ),
            )
          : h(doc, "p", { class: "empty" }, "No notes for this page."),
      ),
    );

    panel.addEventListener("change", (event) => {
      const input = event.target as HTMLInputElement;
      const layer = input.getAttribute("data-layer") as LayerName | null;
      if (layer && LAYERS.includes(layer)) this.setLayer(layer, input.checked);
    });
    panel.addEventListener("input", (event) => {
      const input = event.target as HTMLInputElement;
      if (input.hasAttribute("data-opacity")) this.setOpacity(Number(input.value) / 100);
    });
    panel.addEventListener("click", (event) => {
      const button = (event.target as Element).closest("button");
      if (!button) return;
      if (button.hasAttribute("data-collapse")) {
        panel.classList.toggle("collapsed");
        button.textContent = panel.classList.contains("collapsed") ? "Show" : "Hide";
      }
      const category = button.getAttribute("data-category") as Category | null;
      if (category) this.setCategoryVisible(category, this.hiddenCategories.has(category));
      const focus = button.getAttribute("data-focus");
      if (focus) this.focusNote(focus);
    });

    if (previous) previous.replaceWith(panel);
    else this.root.append(panel);
    this.parts.panel = panel;
  }

  private listen(): void {
    const view = this.document.defaultView;
    if (!view) return;
    const schedule = () => {
      cancelAnimationFrame(this.frame);
      this.frame = requestAnimationFrame(this.layout);
    };
    view.addEventListener("resize", schedule);
    view.addEventListener("scroll", schedule, { passive: true });
    const keys = (event: KeyboardEvent) => {
      if (event.key === "Escape" && this.activeId) this.close();
    };
    this.document.addEventListener("keydown", keys);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const mutations = new view.MutationObserver((records) => {
      if (records.every((record) => this.host?.contains(record.target))) return;
      clearTimeout(timer);
      timer = setTimeout(schedule, 200);
    });
    mutations.observe(this.document.body ?? this.document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden"],
    });

    this.observers.push(
      () => view.removeEventListener("resize", schedule),
      () => view.removeEventListener("scroll", schedule),
      () => this.document.removeEventListener("keydown", keys),
      () => mutations.disconnect(),
      () => clearTimeout(timer),
    );
  }
}

export function mountOverlay(data: OverlayData, options: OverlayConfig = {}): Overlay {
  return new Overlay(data, options).mount();
}
