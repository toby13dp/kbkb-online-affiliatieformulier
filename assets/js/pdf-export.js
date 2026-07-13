"use strict";

(function () {
  function apiUrl(path) {
    const base = String(window.KBKB_API_BASE || "").replace(/\/$/, "");
    return `${base}${path}`;
  }

  function safeFilenamePart(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[<>:\"/\\|?*\x00-\x1F]/g, "")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 50) || "onbekend";
  }

  async function readError(response) {
    const payload = await response.json().catch(() => ({}));
    return payload.error || `PDF-export mislukt (${response.status}).`;
  }

  async function verifyExportService() {
    try {
      const response = await fetch(apiUrl("/api/status"), { cache: "no-store" });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  async function exportOfficialPdf(signingResult) {
    const service = await verifyExportService();
    if (!service?.local_server) {
      throw new Error(
        "Er is geen actieve Excel-naar-PDF-service geconfigureerd. " +
        "Start lokaal via start-windows.bat, of configureer voor GitHub Pages de repositoryvariabele KBKB_API_BASE met de URL van de permanente backend."
      );
    }
    if (!service.exact_excel_export) {
      throw new Error(
        "LibreOffice Calc is niet beschikbaar op de exportservice. Controleer de backendinstallatie."
      );
    }

    const response = await fetch(apiUrl("/api/export"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ cells: buildCellMap() })
    });
    if (!response.ok) throw new Error(await readError(response));

    let pdfBytes = new Uint8Array(await response.arrayBuffer());
    if (signingResult?.mode === "digital") {
      if (typeof window.KBKBAppendDigitalSignature !== "function") {
        throw new Error("De digitale handtekening kon niet in de PDF worden geplaatst.");
      }
      pdfBytes = window.KBKBAppendDigitalSignature(pdfBytes, signingResult.data);
    }

    const filename = `Affiliatie_${safeFilenamePart(formValue("lastName"))}_${safeFilenamePart(formValue("firstName"))}.pdf`;
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    return filename;
  }

  window.exportOfficialPdf = exportOfficialPdf;
  window.checkKbkbExportService = verifyExportService;
})();
