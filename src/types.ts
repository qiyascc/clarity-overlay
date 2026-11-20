export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Anchor {
  selector?: string | null;
  xpath?: string | null;
  text?: string | null;
  role?: string | null;
  box?: Box | null;
}

export type Severity = "critical" | "high" | "medium" | "low" | "suggestion";
export type Category =
  | "visual"
  | "ux"
  | "functional"
  | "content"
  | "conversion"
  | "accessibility"
  | "performance";

export interface Note {
  id: string;
  title: string;
  description: string;
  recommendation: string;
  severity: Severity;
  category: Category;
  status: "verified" | "predicted";
  confidence: number;
  anchor?: Anchor | null;
}

export interface ClickTarget {
  index: number;
  name: string;
  click: number;
  attention: number;
  anchor: Anchor;
}

export interface Heatmap {
  src: string;
  scale: number;
}

export interface OverlayData {
  url: string;
  viewport: { width: number; height: number };
  documentHeight: number;
  heatmap?: Heatmap | null;
  clicks?: ClickTarget[];
  notes?: Note[];
}

export type LayerName = "heatmap" | "clicks" | "notes";

export type LoadedImage = CanvasImageSource & { width: number; height: number };
export type ImageLoader = (src: string) => Promise<LoadedImage>;

export interface OverlayOptions {
  document?: Document;
  layers?: Partial<Record<LayerName, boolean>>;
  opacity?: number;
  panel?: boolean;
  loadImage?: ImageLoader;
  onFocusNote?: (note: Note) => void;
}
