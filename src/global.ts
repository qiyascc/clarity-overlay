import * as ClarityOverlay from "./index";

declare global {
  interface Window {
    ClarityOverlay?: typeof ClarityOverlay;
  }
}

window.ClarityOverlay = ClarityOverlay;
