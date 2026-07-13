"use strict";

(function () {
  const isMobileDevice = Boolean(
    navigator.userAgentData?.mobile ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && window.matchMedia("(max-width: 900px)").matches)
  );
  if (!isMobileDevice) return;

  const inlinePanel = document.getElementById("inlineSigningPanel");
  const digitalNotice = document.getElementById("digitalSigningNotice");
  const guardianSection = document.getElementById("inlineGuardianSigning");
  if (!inlinePanel || !digitalNotice) return;

  const startWrap = document.createElement("div");
  startWrap.className = "field full mobile-signing-start";
  startWrap.hidden = true;
  startWrap.innerHTML = `
    <button type="button" class="button primary" id="startInlineSigningButton">Ondertekenen</button>
    <p>De tekenvelden worden één voor één in liggende stand geopend.</p>`;
  digitalNotice.insertAdjacentElement("afterend", startWrap);

  const controls = document.createElement("div");
  controls.className = "signature-wizard-controls";
  controls.innerHTML = `
    <button type="button" class="button secondary" id="signatureWizardPrevious">Vorige</button>
    <div class="signature-wizard-progress" id="signatureWizardProgress"></div>
    <button type="button" class="button primary" id="signatureWizardNext">Volgende</button>`;
  inlinePanel.appendChild(controls);

  const orientationBlock = document.createElement("div");
  orientationBlock.className = "signature-orientation-block";
  orientationBlock.innerHTML = `<strong>Draai het toestel horizontaal</strong><span>Ondertekenen gaat verder zodra het scherm in liggende stand staat.</span>`;
  inlinePanel.appendChild(orientationBlock);

  const startButton = document.getElementById("startInlineSigningButton");
  const previousButton = document.getElementById("signatureWizardPrevious");
  const nextButton = document.getElementById("signatureWizardNext");
  const progress = document.getElementById("signatureWizardProgress");

  let active = false;
  let index = 0;
  let steps = [];

  function isMinorNow() {
    return typeof isMinor === "function" && isMinor(formValue("birthDate"));
  }

  function signingMethod() {
    return form.elements.namedItem("signingMethod")?.value || "";
  }

  function collectSteps() {
    return [...inlinePanel.querySelectorAll(".signing-pad-card")].filter(card => {
      const key = card.querySelector("[data-kbkb-pad]")?.dataset.kbkbPad || "";
      return isMinorNow() || !key.startsWith("guardian");
    });
  }

  async function requestLandscape() {
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen({ navigationUI: "hide" });
      }
    } catch {
      // Fullscreen is optional; the orientation guard remains active.
    }
    try {
      await screen.orientation?.lock?.("landscape");
    } catch {
      // Not all mobile browsers support orientation locking.
    }
  }

  async function releaseLandscape() {
    try {
      screen.orientation?.unlock?.();
    } catch {
      // Ignore unsupported orientation unlock.
    }
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      // Ignore browser restrictions when leaving fullscreen.
    }
  }

  function currentKey() {
    return steps[index]?.querySelector("[data-kbkb-pad]")?.dataset.kbkbPad || "";
  }

  function currentPad() {
    return window.KBKB_SIGNATURE_PADS?.[currentKey()] || null;
  }

  function renderStep() {
    steps.forEach((card, cardIndex) => {
      card.hidden = cardIndex !== index;
      card.classList.toggle("is-current-signing-step", cardIndex === index);
    });
    previousButton.disabled = index === 0;
    nextButton.textContent = index === steps.length - 1 ? "Terug naar formulier" : "Volgende";
    progress.textContent = `Veld ${index + 1} van ${steps.length}`;
    window.setTimeout(() => currentPad()?.resize(), 60);
  }

  function showWizardMessage(message) {
    let box = inlinePanel.querySelector(".signature-wizard-message");
    if (!box) {
      box = document.createElement("div");
      box.className = "signature-wizard-message";
      controls.insertAdjacentElement("beforebegin", box);
    }
    box.textContent = message;
    box.classList.add("show");
  }

  function clearWizardMessage() {
    inlinePanel.querySelector(".signature-wizard-message")?.classList.remove("show");
  }

  async function openWizard() {
    steps = collectSteps();
    if (!steps.length) return;
    active = true;
    index = 0;
    inlinePanel.hidden = false;
    document.documentElement.classList.add("signature-wizard-open");
    document.body.classList.add("signature-wizard-open");
    clearWizardMessage();
    renderStep();
    await requestLandscape();
  }

  async function closeWizard() {
    active = false;
    inlinePanel.hidden = true;
    document.documentElement.classList.remove("signature-wizard-open");
    document.body.classList.remove("signature-wizard-open");
    steps.forEach(card => { card.hidden = false; });
    clearWizardMessage();
    await releaseLandscape();
    document.getElementById("signatureSection")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function validateCurrent() {
    const pad = currentPad();
    if (pad?.hasInk()) return true;
    const title = steps[index]?.querySelector(".signing-pad-head strong")?.textContent || "dit tekenveld";
    showWizardMessage(`Vul ‘${title}’ duidelijk in voordat je verdergaat.`);
    return false;
  }

  function syncVisibility() {
    const digital = signingMethod() === "digital";
    startWrap.hidden = !digital;
    if (!digital && active) closeWizard();
    if (digital && !active) inlinePanel.hidden = true;
    if (guardianSection) guardianSection.hidden = !isMinorNow();
  }

  startButton.addEventListener("click", openWizard);
  previousButton.addEventListener("click", () => {
    if (index > 0) {
      index--;
      clearWizardMessage();
      renderStep();
    }
  });
  nextButton.addEventListener("click", async () => {
    if (!validateCurrent()) return;
    clearWizardMessage();
    if (index < steps.length - 1) {
      index++;
      renderStep();
      return;
    }
    await closeWizard();
  });

  form.addEventListener("change", event => {
    if (event.target.name === "signingMethod" || event.target.id === "birthDate") {
      window.setTimeout(syncVisibility, 0);
    }
  });

  window.addEventListener("orientationchange", () => {
    if (active) window.setTimeout(() => currentPad()?.resize(), 180);
  });

  syncVisibility();
})();
