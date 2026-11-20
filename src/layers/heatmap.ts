import { colorize } from "../heat";
import type { Heatmap } from "../types";

export type LoadedImage = CanvasImageSource & { width: number; height: number };
export type ImageLoader = (src: string) => Promise<LoadedImage>;

export const fetchImage: ImageLoader = async (src) => {
  const response = await fetch(src, { credentials: "include" });
  if (!response.ok) throw new Error(`heatmap request failed with ${response.status}`);
  return createImageBitmap(await response.blob());
};

export async function drawHeatmap(
  canvas: HTMLCanvasElement,
  heatmap: Heatmap,
  load: ImageLoader,
): Promise<void> {
  const image = await load(heatmap.src);
  canvas.width = image.width;
  canvas.height = image.height;
  canvas.style.width = `${Math.round(image.width / heatmap.scale)}px`;
  canvas.style.height = `${Math.round(image.height / heatmap.scale)}px`;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return;
  context.clearRect(0, 0, image.width, image.height);
  context.drawImage(image, 0, 0);
  const frame = context.getImageData(0, 0, image.width, image.height);
  colorize(frame.data);
  context.putImageData(frame, 0, 0);
}
