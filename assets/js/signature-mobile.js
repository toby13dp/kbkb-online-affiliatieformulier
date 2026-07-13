"use strict";

const kbkbSignatureStyle = document.createElement("link");
kbkbSignatureStyle.rel = "stylesheet";
kbkbSignatureStyle.href = "assets/css/signature.css";
document.head.appendChild(kbkbSignatureStyle);

(function () {
  const SignaturePad = window.KBKBSignaturePad;
  const LinkApi = window.KBKBSignatureLink;
  const session = LinkApi?.parseSessionFragment();
  const form = document.getElementById("mobileSignatureForm");
  const guardianFields = document.getElementById("mobileGuardianFields");
  const statusBox = document.getElementById("mobileSignatureStatus");
  const sendButton = document.getElementById("sendSignatureButton");

  function showStatus(type, message) {
    statusBox.className = `status ${type} show`;
    statusBox.textContent = message;
    statusBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  if (!SignaturePad || !LinkApi || !session) {
    showStatus("error", "Deze ondertekeningslink is ongeldig of onvolledig. Scan de QR-code opnieuw.");
    sendButton.disabled = true;
    return;
  }

  guardianFields.hidden = !session.minor;

  const minimumLengths = {
    place: 12,
    date: 15,
    signature: 45,
    name: 25,
    guardianAgreement: 35,
    guardianSignature: 45,
    guardianName: 25
  };

  const labels = {
    place: "Gemeente",
    date: "Datum",
    signature: "Handtekening aanvrager",
    name: "Volledige naam aanvrager",
    guardianAgreement: "Gezien voor akkoord",
    guardianSignature: "Handtekening wettelijke vertegenwoordiger",
    guardianName: "Volledige naam wettelijke vertegenwoordiger"
  };

  const pads = {};
  for (const canvas of document.querySelectorAll("[data-kbkb-pad]")) {
    const key = canvas.dataset.kbkbPad;
    pads[key] = new SignaturePad(canvas, {
      minimumPathLength: minimumLengths[key],
      penWidth: key.toLowerCase().includes("signature") ? 2.7 : 2.1
    });
  }

  const steps = [...document.querySelectorAll(".signing-pad-card")].filter(card => {
    const key = card.querySelector("[data-kbkb-pad]")?.dataset.kbkbPad || "";
    return session.minor || !key.startsWith("guardian");
  });

  const intro = document.createElement("section");
  intro.className = "mobile-wizard-intro";
  intro.innerHTML = `
    <strong>Ondertekenen in liggende stand</strong>
    <p>De ${steps.length} tekenvelden worden één voor één getoond. De navigatieknoppen blijven steeds onderaan zichtbaar.</p>
    <button type="button" class="button primary" id="startMobileSignatureWizard">Ondertekenen</button>`;
  form.insertAdjacentElement("afterbegin", intro);

  const controls = document.createElement("div");
  controls.className = "signature-wizard-controls mobile-signature-controls";
  controls.hidden = true;
  controls.innerHTML = `
    <button type="button" class="button secondary" id="mobileSignaturePrevious">Vorige</button>
    <div class="signature-wizard-progress" id="mobileSignatureProgress"></div>
    <button type="button" class="button primary" id="mobileSignatureNext">Volgende</button>`;
  statusBox.insertAdjacentElement("beforebegin", controls);

  const orientationBlock = document.createElement("div");
  orientationBlock.className = "signature-orientation-block mobile-orientation-block";
  orientationBlock.innerHTML = `<strong>Draai het toestel horizontaal</strong><span>Het huidige tekenveld wordt zichtbaar in liggende stand.</span>`;
  form.appendChild(orientationBlock);

  const startButton = document.getElementById("startMobileSignatureWizard");
  const previousButton = document.getElementById("mobileSignaturePrevious");
  const nextButton = document.getElementById("mobileSignatureNext");
  const progress = document.getElementById("mobileSignatureProgress");

  let index = 0;
  let active = false;
  let sending = false;

  sendButton.hidden = true;
  steps.forEach(card => { card.hidden = true; });

  async function requestLandscape() {
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen({ navigationUI: "hide" });
      }
    } catch {
      // The orientation guard remains available when fullscreen is rejected.
    }
    try {
      await screen.orientation?.lock?.("landscape");
    } catch {
      // iOS and some embedded browsers require manual rotation.
    }
  }

  async function releaseLandscape() {
    try {
      screen.orientation?.unlock?.();
    } catch {
      // Ignore unsupported unlock.
    }
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      // Ignore browser restrictions.
    }
  }

  function currentKey() {
    return steps[index]?.querySelector("[data-kbkb-pad]")?.dataset.kbkbPad || "";
  }

  function renderStep() {
    steps.forEach((card, stepIndex) => {
      card.hidden = stepIndex !== index;
      card.classList.toggle("is-current-signing-step", stepIndex === index);
    });
    previousButton.disabled = index === 0 || sending;
    nextButton.disabled = sending;
    nextButton.textContent = index === steps.length - 1
      ? "Terug naar formulier op computer"
      : "Volgende";
    progress.textContent = `Veld ${index + 1} van ${steps.length}`;
    window.setTimeout(() => pads[currentKey()]?.resize(), 80);
  }

  function validateCurrent() {
    const key = currentKey();
    if (pads[key]?.hasInk()) return true;
    showStatus("error", `Vul het tekenveld ‘${labels[key]}’ duidelijk in voordat je verdergaat.`);
    return false;
  }

  async function sendToComputer() {
    sending = true;
    renderStep();
    nextButton.textContent = "Verzenden…";
    const fields = {};
    for (const [key, pad] of Object.entries(pads)) fields[key] = pad.exportStrokes();

    try {
      await LinkApi.publishPayload(session.topic, {
        kind: "kbkb-affiliation-signature",
        version: 1,
        minor: session.minor,
        sentAt: new Date().toISOString(),
        fields
      });
      for (const pad of Object.values(pads)) pad.setDisabled(true);
      controls.hidden = true;
      steps.forEach(card => { card.hidden = true; });
      showStatus(
        "success",
        "De tekeningen zijn ontvangen op de computer. Ga nu terug naar het formulier op de computer; deze mobiele pagina mag worden gesloten."
      );
      await releaseLandscape();
      document.documentElement.classList.remove("mobile-signature-wizard-open");
      document.body.classList.remove("mobile-signature-wizard-open");
      active = false;
    } catch (error) {
      showStatus("error", error instanceof Error ? error.message : "Verzenden is mislukt.");
      sending = false;
      renderStep();
      nextButton.textContent = "Opnieuw verzenden";
    }
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-clear-pad]");
    if (button) pads[button.dataset.clearPad]?.clear();
  });

  startButton.addEventListener("click", async () => {
    active = true;
    intro.hidden = true;
    controls.hidden = false;
    statusBox.className = "status";
    document.documentElement.classList.add("mobile-signature-wizard-open");
    document.body.classList.add("mobile-signature-wizard-open");
    index = 0;
    renderStep();
    await requestLandscape();
    window.setTimeout(() => pads[currentKey()]?.resize(), 140);
  });

  previousButton.addEventListener("click", () => {
    if (index > 0 && !sending) {
      index--;
      statusBox.className = "status";
      renderStep();
    }
  });

  nextButton.addEventListener("click", async () => {
    if (!active || sending || !validateCurrent()) return;
    statusBox.className = "status";
    if (index < steps.length - 1) {
      index++;
      renderStep();
      return;
    }
    await sendToComputer();
  });

  form.addEventListener("submit", event => event.preventDefault());
  window.addEventListener("orientationchange", () => {
    if (active) window.setTimeout(() => pads[currentKey()]?.resize(), 180);
  });
})();
