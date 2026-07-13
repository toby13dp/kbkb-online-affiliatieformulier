"use strict";

    form.addEventListener("submit", async event => {
      event.preventDefault();
      clearStatus();

      if (!validateForm()) {
        showStatus("error", "Controleer de gemarkeerde velden voordat je de Excel-kopie opslaat.");
        return;
      }

      saveButton.disabled = true;
      resetButton.disabled = true;
      const originalLabel = saveButton.textContent;
      saveButton.textContent = "Excel wordt opgebouwd…";

      try {
        const workbookBytes = await generateWorkbook();
        const filename = `Affiliatie_${safeFilenamePart(formValue("lastName"))}_${safeFilenamePart(formValue("firstName"))}.xlsx`;
        const blob = new Blob([workbookBytes], { type: XLSX_MIME });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 30000);
        showStatus("success", `De ingevulde Excel-kopie is opgeslagen als ${filename}.`);
      } catch (error) {
        console.error(error);
        showStatus("error", error instanceof Error ? error.message : "De Excel-kopie kon niet worden gemaakt.");
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
