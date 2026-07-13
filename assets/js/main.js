"use strict";

form.addEventListener("submit", event => {
  event.preventDefault();
  clearStatus();

  if (!validateForm()) {
    showStatus("error", "Controleer de gemarkeerde velden voordat je de PDF maakt.");
    return;
  }

  saveButton.disabled = true;
  resetButton.disabled = true;
  const originalLabel = saveButton.textContent;
  saveButton.textContent = "PDF wordt voorbereid…";

  try {
    openPdfExport();
    showStatus(
      "success",
      "Het afdrukvenster is geopend. Kies ‘Opslaan als PDF’. Druk de opgeslagen PDF daarna af en onderteken onderaan met pen."
    );
  } catch (error) {
    console.error(error);
    showStatus("error", error instanceof Error ? error.message : "De PDF kon niet worden voorbereid.");
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
