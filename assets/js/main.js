"use strict";

form.addEventListener("submit", event => {
  event.preventDefault();
  clearStatus();

  if (!validateForm()) {
    showStatus("error", "Controleer de gemarkeerde velden voordat je de PDF opslaat.");
    return;
  }

  saveButton.disabled = true;
  resetButton.disabled = true;
  const originalLabel = saveButton.textContent;
  saveButton.textContent = "Officiële PDF wordt opgebouwd…";

  try {
    const filename = downloadAffiliationPdf();
    showStatus(
      "success",
      `De PDF is opgeslagen als ${filename}. Druk dit bestand af en onderteken het onderaan met pen voordat je het bezorgt.`
    );
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
  if (!window.confirm("Alle ingevulde gegevens uit dit formulier wissen?")) return;
  form.reset();
  nationalNumberInput.setCustomValidity("");
  updateConditionalSections();
  clearStatus();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

updateConditionalSections();
