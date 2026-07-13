"use strict";

form.addEventListener("submit", async event => {
  event.preventDefault();
  clearStatus();

  if (!validateForm()) {
    showStatus("error", "Controleer de gemarkeerde velden voordat je de PDF opslaat.");
    return;
  }

  const signingResult = window.KBKBDigitalSigning?.validateBeforeExport?.() || {
    ok: false,
    message: "Kies en voltooi eerst de manier van ondertekenen."
  };
  if (!signingResult.ok) {
    showStatus("error", signingResult.message);
    document.getElementById("signatureSection")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  saveButton.disabled = true;
  resetButton.disabled = true;
  const originalLabel = saveButton.textContent;
  saveButton.textContent = "Tijdelijke Excel wordt naar PDF geëxporteerd…";

  try {
    const filename = await exportOfficialPdf(signingResult);
    const message = signingResult.mode === "digital"
      ? `De digitaal ondertekende PDF is opgeslagen als ${filename}. Afdrukken is voor deze ondertekeningswijze niet nodig.`
      : `De PDF is opgeslagen als ${filename}. Druk dit bestand nu af en onderteken het onderaan links met pen.`;
    showStatus("success", message);
  } catch (error) {
    console.error(error);
    showStatus("error", error instanceof Error ? error.message : "De PDF kon niet worden gemaakt.");
  } finally {
    saveButton.disabled = false;
    resetButton.disabled = false;
    saveButton.textContent = originalLabel;
  }
});

resetButton.addEventListener("click", () => {
  if (!window.confirm("Alle ingevulde gegevens en tekeningen uit dit formulier wissen?")) return;
  form.reset();
  nationalNumberInput.setCustomValidity("");
  updateConditionalSections();
  window.KBKBDigitalSigning?.reset?.();
  clearStatus();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

updateConditionalSections();
