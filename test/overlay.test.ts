import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountOverlay, type Overlay } from "../src/overlay";
import type { Note, OverlayData, OverlayOptions } from "../src/types";

const note = (id: string, overrides: Partial<Note> = {}): Note => ({
  id,
  title: `Note ${id}`,
  description: "Why it matters.",
  recommendation: "What to change.",
  severity: "medium",
  category: "ux",
  status: "predicted",
  confidence: 0.7,
  anchor: { selector: `#${id}` },
  ...overrides,
});

const data = (overrides: Partial<OverlayData> = {}): OverlayData => ({
  url: "https://theqiyas.cc/",
  viewport: { width: 1440, height: 900 },
  documentHeight: 3000,
  heatmap: { src: "https://api.test/heat.png", scale: 0.25 },
  clicks: [
    { index: 1, name: "Contact", click: 0.6, attention: 0.1, anchor: { selector: "#a" } },
    { index: 2, name: "About", click: 0.2, attention: 0.02, anchor: { selector: "#b" } },
  ],
  notes: [
    note("a"),
    note("b", { severity: "critical", category: "functional", status: "verified" }),
    note("c", { category: "accessibility", anchor: { selector: "#missing" } }),
  ],
  ...overrides,
});

const fakeImage = { width: 360, height: 750 } as unknown as ImageBitmap;
let overlay: Overlay;

beforeEach(() => {
  document.body.innerHTML = `<button id="a">Contact</button><a id="b" href="/about">About</a><p id="c">Text</p>`;
});

afterEach(() => overlay?.destroy());

const shadow = () => document.querySelector("[data-clarity-overlay]")?.shadowRoot as ShadowRoot;
const markers = () => [...shadow().querySelectorAll<HTMLButtonElement>(".marker")];

describe("Overlay", () => {
  it("mounts once into its own shadow root and unmounts cleanly", () => {
    overlay = mountOverlay(data(), { loadImage: async () => fakeImage });
    mountOverlay(data(), { loadImage: async () => fakeImage }).destroy();
    overlay = mountOverlay(data(), { loadImage: async () => fakeImage });
    expect(document.querySelectorAll("[data-clarity-overlay]")).toHaveLength(1);
    overlay.destroy();
    expect(document.querySelector("[data-clarity-overlay]")).toBeNull();
  });

  it("numbers notes by severity and skips the ones it cannot place", () => {
    overlay = mountOverlay(data(), { loadImage: async () => fakeImage });
    expect(overlay.orderedNotes.map((item) => item.id)).toEqual(["b", "a", "c"]);
    expect(markers().map((marker) => marker.textContent)).toEqual(["1", "2"]);
    expect(markers()[0]?.classList.contains("verified")).toBe(true);
  });

  it("opens a note card with outline and steps through notes", () => {
    const onFocusNote = vi.fn();
    overlay = mountOverlay(data(), { loadImage: async () => fakeImage, onFocusNote });
    overlay.focusNote("a");
    expect(shadow().querySelector(".card h3")?.textContent).toBe("Note a");
    expect(shadow().querySelector(".outline")).not.toBeNull();
    expect(onFocusNote).toHaveBeenCalledWith(expect.objectContaining({ id: "a" }));

    overlay.step(1);
    expect(shadow().querySelector(".card h3")?.textContent).toBe("Note c");
    overlay.step(1);
    expect(shadow().querySelector(".card h3")?.textContent).toBe("Note b");

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(shadow().querySelector(".card")).toBeNull();
  });

  it("clicking a marker toggles its card", () => {
    overlay = mountOverlay(data(), { loadImage: async () => fakeImage });
    markers()[1]?.click();
    expect(shadow().querySelector(".card h3")?.textContent).toBe("Note a");
    markers()[1]?.click();
    expect(shadow().querySelector(".card")).toBeNull();
  });

  it("filters notes by category from the panel", () => {
    overlay = mountOverlay(data(), { loadImage: async () => fakeImage });
    const functional = shadow().querySelector<HTMLButtonElement>('[data-category="functional"]');
    functional?.click();
    expect(markers().map((marker) => marker.dataset.note)).toEqual(["a"]);
    expect(
      shadow().querySelector('[data-category="functional"]')?.getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("toggles layers from the panel", () => {
    overlay = mountOverlay(data(), { loadImage: async () => fakeImage });
    const clicks = shadow().querySelector(".clicks") as HTMLElement;
    expect(clicks.hidden).toBe(true);
    const toggle = shadow().querySelector<HTMLInputElement>(
      '[data-layer="clicks"]',
    ) as HTMLInputElement;
    toggle.checked = true;
    toggle.dispatchEvent(new Event("change", { bubbles: true }));
    expect((shadow().querySelector(".clicks") as HTMLElement).hidden).toBe(false);
    expect(
      [...shadow().querySelectorAll(".target span")].map((label) => label.textContent),
    ).toEqual(["60%", "20%"]);
  });

  it("sizes the heatmap to document coordinates", async () => {
    const loadImage = vi.fn(async () => fakeImage);
    const options: OverlayOptions = { loadImage };
    overlay = mountOverlay(data(), options);
    await vi.waitFor(() => expect(loadImage).toHaveBeenCalledWith("https://api.test/heat.png"));
    await vi.waitFor(() => expect(shadow().querySelector(".heat > *")).not.toBeNull());
    const picture = shadow().querySelector(".heat > *") as HTMLElement;
    expect(picture.style.width).toBe("1440px");
    expect(picture.style.height).toBe("3000px");
  });

  it("can run without the panel", () => {
    overlay = mountOverlay(data({ notes: [] }), { loadImage: async () => fakeImage, panel: false });
    expect(shadow().querySelector(".panel")).toBeNull();
  });
});

describe("host isolation", () => {
  it("is not clipped or hidden by page styles", () => {
    const style = document.createElement("style");
    style.textContent = "* { overflow: hidden !important; display: none; opacity: 0; }";
    document.head.append(style);
    overlay = mountOverlay(data(), { loadImage: async () => fakeImage });
    const host = document.querySelector("[data-clarity-overlay]") as HTMLElement;
    expect(host.tagName).toBe("CLARITY-OVERLAY");
    expect(host.style.getPropertyPriority("overflow")).toBe("important");
    expect(host.style.getPropertyValue("display")).toBe("block");
    style.remove();
  });
});

describe("narrow screens", () => {
  it("starts with the panel collapsed", () => {
    const width = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });
    overlay = mountOverlay(data(), { loadImage: async () => fakeImage });
    expect(shadow().querySelector(".panel")?.classList.contains("collapsed")).toBe(true);
    Object.defineProperty(window, "innerWidth", { value: width, configurable: true });
  });
});
