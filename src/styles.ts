export const STYLES = `
:host { all: initial; }
* { box-sizing: border-box; }
.stage, .pinned { position: absolute; top: 0; left: 0; pointer-events: none; }
.pinned { position: fixed; inset: 0; }
.layer { position: absolute; inset: 0; }
.layer[hidden] { display: none; }
.heat canvas, .heat img { position: absolute; top: 0; left: 0; max-width: none; }

.target {
  position: absolute; border: 1.5px solid rgba(15, 118, 110, var(--strength));
  background: rgba(15, 118, 110, calc(var(--strength) * 0.12)); border-radius: 4px;
}
.target span {
  position: absolute; top: -18px; left: -1px; padding: 1px 5px; border-radius: 3px;
  font: 600 10px/14px ui-sans-serif, system-ui, sans-serif; color: #fff; background: #0f766e;
}

.marker {
  position: absolute; width: 22px; height: 22px; margin: -11px 0 0 -11px; border-radius: 50%;
  display: grid; place-items: center; pointer-events: auto; cursor: pointer; border: 2px solid #fff;
  font: 700 11px/1 ui-sans-serif, system-ui, sans-serif; color: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35); transition: transform 120ms ease;
}
.marker:hover, .marker.active { transform: scale(1.15); }
.marker.predicted { border-style: dashed; }
.outline {
  position: absolute; border: 2px solid var(--tone); border-radius: 4px;
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--tone) 20%, transparent);
}

.card {
  position: fixed; width: min(320px, calc(100vw - 16px)); max-height: 60vh; overflow: auto; pointer-events: auto;
  background: #fff; color: #14171c; border-radius: 10px; padding: 14px 16px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22); font: 13px/1.5 ui-sans-serif, system-ui, sans-serif;
}
.card h3 { margin: 6px 0 4px; font-size: 14px; line-height: 1.35; }
.card p { margin: 0 0 8px; color: #4a5260; }
.card .fix { color: #14171c; }
.card .meta { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.card nav { display: flex; justify-content: space-between; margin-top: 10px; }
.chip {
  display: inline-block; padding: 1px 7px; border-radius: 999px; font-size: 11px; font-weight: 600;
  background: #f2f4f7; color: #4a5260;
}
button {
  font: inherit; border: 1px solid #e3e6eb; background: #fff; color: #14171c; border-radius: 6px;
  padding: 3px 9px; cursor: pointer;
}
button:hover { background: #f7f8fa; }

.panel {
  position: fixed; right: 16px; bottom: 16px; width: min(280px, calc(100vw - 32px)); pointer-events: auto; background: #fff;
  color: #14171c; border-radius: 12px; box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22);
  font: 13px/1.4 ui-sans-serif, system-ui, sans-serif; overflow: hidden;
}
.panel header { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid #e3e6eb; }
.panel header strong { font-size: 13px; }
.panel .body { padding: 10px 12px; display: grid; gap: 10px; }
.panel.collapsed .body { display: none; }
.panel label { display: flex; align-items: center; gap: 8px; }
.panel input[type="range"] { width: 100%; }
.panel .filters { display: flex; flex-wrap: wrap; gap: 4px; }
.panel .filters button[aria-pressed="false"] { opacity: 0.45; }
.panel ol { list-style: none; margin: 0; padding: 0; max-height: 220px; overflow: auto; }
.panel li button {
  width: 100%; display: flex; gap: 8px; align-items: center; text-align: left; border: 0; padding: 5px 4px;
}
.panel li .dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
.panel li .title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty { color: #8a93a3; }
`;

export const SEVERITY_COLORS: Record<string, string> = {
  critical: "#b42318",
  high: "#c4320a",
  medium: "#b54708",
  low: "#175cd3",
  suggestion: "#5e6ad2",
};
