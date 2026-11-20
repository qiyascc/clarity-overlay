# Clarity Overlay

Draws website analysis on top of the page it belongs to: an attention heatmap,
predicted click targets and numbered review notes, with a small control panel
to toggle layers and step through notes.

It is the rendering layer of [Clarity Compass](https://github.com/qiyascc/clarity-compass)
and works on any document you can reach from JavaScript - the live page in a
browser extension, or a replayed snapshot inside an iframe.

## Install

Releases ship a packed tarball:

```sh
pnpm add https://github.com/qiyascc/clarity-overlay/releases/download/v0.1.0/qiyascc-clarity-overlay-0.1.0.tgz
```

or load `dist/clarity-overlay.iife.js`, which exposes `window.ClarityOverlay`.

## Usage

```ts
import { mountOverlay } from "@qiyascc/clarity-overlay";

const overlay = mountOverlay(
  {
    url: location.href,
    viewport: { width: 1440, height: 900 },
    documentHeight: 6400,
    heatmap: { src: "/api/artifacts/run/home/desktop/attention.png", scale: 0.25 },
    clicks: [
      {
        index: 12,
        name: "Contact agent",
        click: 0.31,
        attention: 0.06,
        anchor: { selector: "#contact" },
      },
    ],
    notes: [
      {
        id: "f9c1",
        title: "Contact button is far from the price",
        description: "Visitors see the price first, the button sits two screens lower.",
        recommendation: "Move the contact button next to the price block.",
        severity: "high",
        category: "ux",
        status: "predicted",
        confidence: 0.72,
        anchor: {
          selector: "#contact",
          xpath: "/html/body/main/section[3]/a",
          text: "Contact agent",
        },
      },
    ],
  },
  { layers: { heatmap: true, clicks: false, notes: true } },
);

overlay.focusNote("f9c1");
overlay.setLayer("clicks", true);
overlay.destroy();
```

`mountOverlay(data, options)` accepts:

| Option        | Default           | Meaning                                                       |
| ------------- | ----------------- | ------------------------------------------------------------- |
| `document`    | global `document` | Target document, e.g. a replay iframe's `contentDocument`     |
| `layers`      | heatmap, notes    | Initial visibility of `heatmap`, `clicks`, `notes`            |
| `opacity`     | `0.75`            | Heatmap opacity                                               |
| `panel`       | `true`            | Render the floating control panel                             |
| `loadImage`   | `fetch` + bitmap  | Custom loader, e.g. one that goes through an extension worker |
| `onFocusNote` | -                 | Called when a note is opened                                  |

### Data

- **Heatmap** - a greyscale PNG of the whole page where brightness is relative
  attention; `scale` is image pixels per CSS pixel.
- **Clicks** - the expected share of clicks per element.
- **Notes** - review findings. `status` tells whether the issue was reproduced
  in a browser (`verified`) or inferred (`predicted`); markers for predicted
  notes are dashed.

### Anchors

Each note or click target is located with the first strategy that works: CSS
selector, an indexed XPath such as `/html/body/main/a[2]`, the element's visible
text, then the box recorded at capture time. Markers follow the page as it
scrolls, resizes or re-renders; anchors inside fixed or sticky elements stay
pinned to the viewport.

## Development

```sh
pnpm install
pnpm test
pnpm build
```

## License

Apache-2.0 with an attribution requirement. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
