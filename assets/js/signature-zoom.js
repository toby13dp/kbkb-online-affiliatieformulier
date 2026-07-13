"use strict";

(function () {
  const activeStates = new WeakMap();

  function saveInlineStyles(element, properties) {
    const saved = {};
    for (const property of properties) saved[property] = element.style[property];
    return saved;
  }

  function restoreInlineStyles(element, saved) {
    for (const [property, value] of Object.entries(saved)) {
      element.style[property] = value;
    }
  }

  function forceFiftyPercent(target) {
    if (!(target instanceof HTMLElement) || activeStates.has(target)) return;

    const properties = [
      "zoom",
      "width",
      "height",
      "maxWidth",
      "maxHeight",
      "right",
      "bottom",
      "transform",
      "transformOrigin"
    ];
    const state = {
      styles: saveInlineStyles(target, properties),
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      usedNativeZoom: Boolean(window.CSS?.supports?.("zoom", "0.5"))
    };
    activeStates.set(target, state);

    target.style.width = "200vw";
    target.style.height = "200dvh";
    target.style.maxWidth = "none";
    target.style.maxHeight = "none";
    target.style.right = "auto";
    target.style.bottom = "auto";
    target.style.transformOrigin = "0 0";

    if (state.usedNativeZoom) {
      target.style.zoom = "0.5";
    } else {
      const existingTransform = state.styles.transform && state.styles.transform !== "none"
        ? `${state.styles.transform} `
        : "";
      target.style.transform = `${existingTransform}scale(0.5)`;
    }

    target.dataset.kbkbForcedZoom = "50";
    target.dispatchEvent(new CustomEvent("kbkbzoomchange", {
      bubbles: true,
      detail: { active: true, zoom: 0.5 }
    }));
  }

  function restorePrevious(target) {
    if (!(target instanceof HTMLElement)) return;
    const state = activeStates.get(target);
    if (!state) return;

    restoreInlineStyles(target, state.styles);
    delete target.dataset.kbkbForcedZoom;
    activeStates.delete(target);
    window.scrollTo(state.scrollX, state.scrollY);
    target.dispatchEvent(new CustomEvent("kbkbzoomchange", {
      bubbles: true,
      detail: { active: false }
    }));
  }

  function isForced(target) {
    return target instanceof HTMLElement && activeStates.has(target);
  }

  window.KBKBSignatureZoom = {
    forceFiftyPercent,
    restorePrevious,
    isForced
  };
})();
