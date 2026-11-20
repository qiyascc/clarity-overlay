import { colorize } from "../heat";
import type { Heatmap, ImageLoader } from "../types";

export const fetchImage: ImageLoader = async (src) => {
  const response = await fetch(src, { credentials: "include" });
  if (!response.ok) throw new Error(`heatmap request failed with ${response.status}`);
  return createImageBitmap(await response.blob());
};

/**
 * Renders the colourised heatmap into `layer`.
 *
 * A canvas shows nothing in documents where scripting is disabled, such as a
 * sandboxed replay iframe, so the pixels are handed over as an <img> backed by
 * a blob URL. Pages whose CSP refuses blob: images keep the canvas instead.
 */
export async function drawHeatmap(
  layer: HTMLElement,
  heatmap: Heatmap,
  load: ImageLoader,
): Promise<() => void> {
  const image = await load(heatmap.src);
  const doc = layer.ownerDocument;
  const canvas = doc.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const width = `${Math.round(image.width / heatmap.scale)}px`;
  const height = `${Math.round(image.height / heatmap.scale)}px`;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (context) {
    context.drawImage(image, 0, 0);
    const frame = context.getImageData(0, 0, image.width, image.height);
    colorize(frame.data);
    context.putImageData(frame, 0, 0);
  }

  const blob = context ? await new Promise<Blob | null>((done) => canvas.toBlob(done)) : null;
  if (!blob) {
    Object.assign(canvas.style, { width, height });
    layer.replaceChildren(canvas);
    return () => undefined;
  }

  const url = URL.createObjectURL(blob);
  const picture = doc.createElement("img");
  picture.alt = "";
  Object.assign(picture.style, { width, height, display: "block" });
  picture.addEventListener(
    "error",
    () => {
      Object.assign(canvas.style, { width, height });
      layer.replaceChildren(canvas);
    },
    { once: true },
  );
  picture.src = url;
  layer.replaceChildren(picture);
  return () => URL.revokeObjectURL(url);
}
