"use strict";

(function () {
  const BaseSignaturePad = window.KBKBSignaturePad;
  if (!BaseSignaturePad) return;

  const registry = window.KBKB_SIGNATURE_PADS || {};

  class RegisteredSignaturePad extends BaseSignaturePad {
    constructor(canvas, options = {}) {
      super(canvas, options);
      const key = canvas.dataset.kbkbPad || canvas.dataset.kbkbPreview || "";
      if (key && canvas.dataset.kbkbPad) registry[key] = this;
      canvas.kbkbSignaturePad = this;
    }
  }

  window.KBKB_SIGNATURE_PADS = registry;
  window.KBKBSignaturePad = RegisteredSignaturePad;
})();
