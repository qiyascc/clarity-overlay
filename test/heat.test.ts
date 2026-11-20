import { describe, expect, it } from "vitest";
import { colorize, heatColor } from "../src/heat";

describe("heat", () => {
  it("maps zero to transparent and the peak to red", () => {
    expect(heatColor(0)[3]).toBe(0);
    expect(heatColor(1)).toEqual([227, 26, 28, 225]);
    expect(heatColor(-1)).toEqual(heatColor(0));
  });

  it("colorizes grey pixels through the lookup table", () => {
    const pixels = new Uint8ClampedArray([255, 255, 255, 255, 128, 128, 128, 255]);
    colorize(pixels);
    expect([...pixels.slice(0, 4)]).toEqual([227, 26, 28, 225]);
    expect([...pixels.slice(4)]).toEqual(heatColor(128 / 255));
  });
});
