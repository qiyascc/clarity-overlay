import { beforeEach, describe, expect, it } from "vitest";
import { resolveAnchor } from "../src/anchor";

beforeEach(() => {
  document.body.innerHTML = `
    <header style="position: fixed"><a id="logo" href="/">Home</a></header>
    <main>
      <section><p>Intro</p><button class="cta"><span>Contact agent</span></button></section>
      <section><a href="/about">About us</a></section>
    </main>`;
});

describe("resolveAnchor", () => {
  it("prefers the selector", () => {
    const resolved = resolveAnchor(document, { selector: "#logo", text: "About us" });
    expect(resolved.element?.id).toBe("logo");
    expect(resolved.fixed).toBe(true);
  });

  it("falls back to the xpath when the selector no longer matches", () => {
    const resolved = resolveAnchor(document, {
      selector: "#gone",
      xpath: "/html/body/main/section[2]/a",
    });
    expect(resolved.element?.textContent).toBe("About us");
    expect(resolved.fixed).toBe(false);
  });

  it("falls back to visible text and picks the innermost match", () => {
    const resolved = resolveAnchor(document, { selector: ".missing", text: "  contact AGENT " });
    expect(resolved.element?.tagName).toBe("SPAN");
  });

  it("uses the recorded box when nothing matches", () => {
    const box = { x: 10, y: 20, width: 30, height: 40 };
    expect(resolveAnchor(document, { selector: "#none", box })).toEqual({
      element: null,
      box,
      fixed: false,
    });
  });

  it("tolerates invalid selectors and missing anchors", () => {
    expect(resolveAnchor(document, { selector: "[[" }).element).toBeNull();
    expect(resolveAnchor(document, null).box).toBeNull();
  });
});
