"use strict";

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

  const requiredKeys = session.minor
    ? ["place", "date", "signature", "name", "guardianAgreement", "guardianSignature", "guardianName"]
    : ["place", "date", "signature", "name"];

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-clear-pad]");
    if (button) pads[button.dataset.clearPad]?.clear();
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    for (const key of requiredKeys) {
      if (!pads[key]?.hasInk()) {
        showStatus("error", `Vul het tekenveld ‘${labels[key]}’ duidelijk in.`);
        pads[key]?.canvas.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }

    const fields = {};
    for (const [key, pad] of Object.entries(pads)) fields[key] = pad.exportStrokes();

    sendButton.disabled = true;
    sendButton.textContent = "Verzenden…";
    try {
      await LinkApi.publishPayload(session.topic, {
        kind: "kbkb-affiliation-signature",
        version: 1,
        minor: session.minor,
        sentAt: new Date().toISOString(),
        fields
      });
      for (const pad of Object.values(pads)) pad.setDisabled(true);
      showStatus("success", "De tekeningen zijn ontvangen op de computer. Je mag deze pagina sluiten.");
      sendButton.textContent = "Verzonden";
    } catch (error) {
      showStatus("error", error instanceof Error ? error.message : "Verzenden is mislukt.");
      sendButton.disabled = false;
      sendButton.textContent = "Opnieuw verzenden";
    }
  });
})();
