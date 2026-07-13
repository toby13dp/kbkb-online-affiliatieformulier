"use strict";

(function () {
  const SignaturePad = window.KBKBSignaturePad;
  const LinkApi = window.KBKBSignatureLink;

  if (!SignaturePad || !LinkApi) {
    window.KBKBDigitalSigning = {
      validateBeforeExport() {
        return { ok: false, message: "De digitale ondertekeningsmodule kon niet worden geladen." };
      },
      reset() {},
      getMode() { return ""; }
    };
    return;
  }

  const isMobileDevice = Boolean(
    navigator.userAgentData?.mobile ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && window.matchMedia("(max-width: 900px)").matches)
  );

  const fieldDefinitions = [
    ["place", "Gemeente - veld ‘Te’", "Schrijf de gemeente", "compact"],
    ["date", "Datum - veld ‘de’", "Schrijf DD-MM-JJJJ", "compact"],
    ["signature", "Handtekening aanvrager", "Plaats de handtekening", "wide signature"],
    ["name", "Volledige naam aanvrager", "Schrijf de volledige naam", "wide"],
  ];

  const guardianDefinitions = [
    ["guardianAgreement", "Eigenhandig ‘Gezien voor akkoord’", "Schrijf: Gezien voor akkoord", "wide"],
    ["guardianSignature", "Handtekening wettelijke vertegenwoordiger", "Plaats de handtekening", "wide signature"],
    ["guardianName", "Volledige naam wettelijke vertegenwoordiger", "Schrijf de volledige naam", "wide"],
  ];

  function padCard([key, title, hint, className]) {
    return `
      <div class="signing-pad-card ${className}">
        <div class="signing-pad-head">
          <strong>${title}</strong>
          <button type="button" data-clear-pad="${key}">Wissen</button>
        </div>
        <div class="signature-canvas-wrap ${key}">
          <canvas data-kbkb-pad="${key}" aria-label="${title}"></canvas>
          <span>${hint}</span>
        </div>
      </div>`;
  }

  const sectionHtml = `
    <section class="section" id="signatureSection">
      <div class="section-head">
        <div class="section-index">5</div>
        <div class="section-title">
          <h2>Ondertekening</h2>
          <p>Kies als laatste stap of het formulier op papier of digitaal wordt ondertekend.</p>
        </div>
      </div>
      <div class="section-body signature-section-body">
        <div class="field full">
          <div class="group-label">Manier van ondertekenen</div>
          <div class="choice-grid two" role="radiogroup" aria-label="Manier van ondertekenen">
            <label class="choice">
              <input type="radio" name="signingMethod" value="print" required>
              <span class="choice-text">Niet digitaal ondertekenen<small>PDF afdrukken en onderaan met pen ondertekenen</small></span>
            </label>
            <label class="choice">
              <input type="radio" name="signingMethod" value="digital" required>
              <span class="choice-text">Wel digitaal ondertekenen<small>Gemeente, datum, handtekening en naam worden als tekeningen in de PDF geplaatst</small></span>
            </label>
          </div>
        </div>

        <div class="field full signing-notice signing-notice-print" id="printSigningNotice" hidden>
          <strong>Afdrukken is noodzakelijk.</strong>
          De PDF wordt zonder digitale handtekening opgeslagen. Druk ze daarna af en onderteken onderaan links met pen.
        </div>

        <div class="field full signing-notice signing-notice-digital" id="digitalSigningNotice" hidden>
          <strong>Afdrukken is niet nodig voor deze ondertekeningswijze.</strong>
          Alle onderstaande invoer wordt als handgeschreven lijnen op de voorziene plaatsen in de PDF gezet.
        </div>

        <div class="field full" id="inlineSigningPanel" hidden>
          <div class="signing-pad-grid">${fieldDefinitions.map(padCard).join("")}</div>
          <div class="guardian-signing" id="inlineGuardianSigning" hidden>
            <div class="guardian-signing-title">
              <strong>Aanvrager jonger dan 18 jaar</strong>
              <span>Schrijf ‘Gezien voor akkoord’, plaats de handtekening en schrijf de volledige naam van de wettelijke vertegenwoordiger. Deze drie tekeningen komen onder elkaar in de voorziene zone.</span>
            </div>
            <div class="signing-pad-grid">${guardianDefinitions.map(padCard).join("")}</div>
          </div>
        </div>

        <div class="field full" id="desktopSigningPanel" hidden>
          <div class="desktop-signing-card">
            <div>
              <strong id="desktopSigningTitle">Nog geen digitale handtekening ontvangen</strong>
              <p id="desktopSigningDescription">Open de mobiele ondertekenpagina via de QR-code of URL. Laat de popup en dit formulier geopend terwijl op het mobiele toestel wordt getekend en verzonden.</p>
            </div>
            <div class="desktop-signing-actions">
              <button type="button" class="button secondary" id="openSigningModalButton">QR-code en URL tonen</button>
              <button type="button" class="button secondary" id="restartSigningButton" hidden>Opnieuw ondertekenen</button>
            </div>
          </div>
          <div class="remote-signature-preview" id="remoteSignaturePreview" hidden>
            ${[...fieldDefinitions, ...guardianDefinitions].map(([key, title]) => `
              <div class="${key.startsWith("guardian") ? "guardian-preview " : ""}${key === "place" || key === "date" ? "" : "wide"}" data-preview-field="${key}">
                <span>${title}</span><canvas data-kbkb-preview="${key}"></canvas>
              </div>`).join("")}
          </div>
        </div>
      </div>
    </section>`;

  statusBox.insertAdjacentHTML("beforebegin", sectionHtml);

  const modalHtml = `
    <div class="signing-modal" id="signingModal" hidden aria-hidden="true">
      <div class="signing-modal-backdrop" data-close-signing-modal></div>
      <section class="signing-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="signingModalTitle">
        <button type="button" class="signing-modal-close" data-close-signing-modal aria-label="Sluiten">×</button>
        <p class="eyebrow">Mobiel ondertekenen</p>
        <h2 id="signingModalTitle">Scan de QR-code</h2>
        <p>Verbind het mobiele toestel met hetzelfde lokale netwerk, open de link, vul alle tekenvelden in en druk daar op <strong>Verzenden</strong>.</p>
        <div class="signing-connection-state" id="signingConnectionState">Lokale sessie wordt voorbereid…</div>
        <div class="signing-qr" id="signingQrCode" aria-label="QR-code voor mobiel ondertekenen"></div>
        <label class="signing-url-label" for="signingMobileUrl">URL</label>
        <div class="signing-url-row">
          <input id="signingMobileUrl" type="text" readonly>
          <button type="button" class="button secondary" id="copySigningUrlButton">Kopiëren</button>
        </div>
        <p class="signing-security-note">De tijdelijke tekengegevens blijven in het geheugen van de lokale server en vervallen automatisch na 15 minuten. Gebruik een vertrouwd lokaal netwerk.</p>
      </section>
    </div>`;
  document.body.insertAdjacentHTML("beforeend", modalHtml);

  const printNotice = document.getElementById("printSigningNotice");
  const digitalNotice = document.getElementById("digitalSigningNotice");
  const inlinePanel = document.getElementById("inlineSigningPanel");
  const inlineGuardian = document.getElementById("inlineGuardianSigning");
  const desktopPanel = document.getElementById("desktopSigningPanel");
  const desktopTitle = document.getElementById("desktopSigningTitle");
  const desktopDescription = document.getElementById("desktopSigningDescription");
  const openModalButton = document.getElementById("openSigningModalButton");
  const restartButton = document.getElementById("restartSigningButton");
  const preview = document.getElementById("remoteSignaturePreview");
  const modal = document.getElementById("signingModal");
  const connectionState = document.getElementById("signingConnectionState");
  const qrContainer = document.getElementById("signingQrCode");
  const urlInput = document.getElementById("signingMobileUrl");
  const copyUrlButton = document.getElementById("copySigningUrlButton");

  const minimumLengths = {
    place: 12,
    date: 15,
    signature: 45,
    name: 25,
    guardianAgreement: 35,
    guardianSignature: 45,
    guardianName: 25
  };

  const pads = {};
  for (const canvas of document.querySelectorAll("[data-kbkb-pad]")) {
    const key = canvas.dataset.kbkbPad;
    pads[key] = new SignaturePad(canvas, {
      minimumPathLength: minimumLengths[key],
      penWidth: key.toLowerCase().includes("signature") ? 2.6 : 2.1
    });
  }

  const previewPads = {};
  for (const canvas of document.querySelectorAll("[data-kbkb-preview]")) {
    const key = canvas.dataset.kbkbPreview;
    previewPads[key] = new SignaturePad(canvas, {
      minimumPathLength: 0,
      penWidth: key.toLowerCase().includes("signature") ? 2.4 : 1.9
    });
    previewPads[key].setDisabled(true);
  }

  let remoteData = null;
  let currentSession = null;
  let subscription = null;

  function isMinorNow() {
    return isMinor(formValue("birthDate"));
  }

  function method() {
    return form.elements.namedItem("signingMethod")?.value || "";
  }

  function requiredKeys() {
    return isMinorNow()
      ? [...fieldDefinitions, ...guardianDefinitions].map(definition => definition[0])
      : fieldDefinitions.map(definition => definition[0]);
  }

  function clearRemoteSession() {
    if (subscription) subscription.close();
    subscription = null;
    if (currentSession?.topic) LinkApi.deleteSession(currentSession.topic);
    currentSession = null;
  }

  function closeModal() {
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("signing-modal-open");
  }

  function openModal() {
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("signing-modal-open");
  }

  function renderQr(url) {
    qrContainer.textContent = "";
    if (typeof window.QRCode !== "function") {
      qrContainer.innerHTML = '<div class="signing-qr-error">QR-code niet beschikbaar. Gebruik de URL hieronder.</div>';
      return;
    }
    new window.QRCode(qrContainer, {
      text: url,
      width: 230,
      height: 230,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: window.QRCode.CorrectLevel.M
    });
  }

  function sanitizeStrokes(strokes) {
    if (!Array.isArray(strokes)) return [];
    let pointCount = 0;
    return strokes.slice(0, 180).map(stroke => {
      if (!Array.isArray(stroke)) return [];
      const cleaned = [];
      for (const point of stroke) {
        if (pointCount >= 5000 || !Array.isArray(point) || point.length < 2) break;
        cleaned.push([
          Math.min(1000, Math.max(0, Math.round(Number(point[0]) || 0))),
          Math.min(1000, Math.max(0, Math.round(Number(point[1]) || 0)))
        ]);
        pointCount++;
      }
      return cleaned;
    }).filter(stroke => stroke.length);
  }

  function sanitizePayload(payload) {
    if (!payload || payload.kind !== "kbkb-affiliation-signature" || payload.version !== 1 || !payload.fields) {
      throw new Error("De ontvangen digitale ondertekening is ongeldig.");
    }
    const fields = {};
    for (const key of [...fieldDefinitions, ...guardianDefinitions].map(definition => definition[0])) {
      fields[key] = sanitizeStrokes(payload.fields[key]);
    }
    return { version: 1, minor: Boolean(payload.minor), fields };
  }

  function showPreview(data) {
    const minor = isMinorNow();
    for (const [key, pad] of Object.entries(previewPads)) {
      pad.importStrokes(data.fields[key] || []);
      const holder = document.querySelector(`[data-preview-field="${key}"]`);
      if (holder && key.startsWith("guardian")) holder.hidden = !minor;
    }
    preview.hidden = false;
  }

  function receiveRemote(payload) {
    try {
      remoteData = sanitizePayload(payload);
      showPreview(remoteData);
      desktopTitle.textContent = "Digitale ondertekening ontvangen";
      desktopDescription.textContent = "De tekeningen worden bij het opslaan op de voorziene plaatsen in de PDF gezet.";
      restartButton.hidden = false;
      openModalButton.hidden = true;
      connectionState.textContent = "Ondertekening ontvangen.";
      closeModal();
      showStatus("success", "De digitale handtekening is vanaf het mobiele toestel ontvangen.");
      if (currentSession?.topic) LinkApi.deleteSession(currentSession.topic);
      if (subscription) subscription.close();
      subscription = null;
      currentSession = null;
    } catch (error) {
      connectionState.textContent = error.message;
    }
  }

  async function startRemoteSession() {
    clearRemoteSession();
    remoteData = null;
    preview.hidden = true;
    restartButton.hidden = true;
    openModalButton.hidden = false;
    connectionState.textContent = "Lokale sessie wordt voorbereid…";
    qrContainer.textContent = "";
    urlInput.value = "";
    openModal();

    try {
      currentSession = await LinkApi.createSession(isMinorNow());
      urlInput.value = currentSession.mobile_url;
      renderQr(currentSession.mobile_url);
      connectionState.textContent = "Wachten op verzending vanaf het mobiele toestel…";
      subscription = LinkApi.subscribe(
        currentSession.topic,
        receiveRemote,
        state => {
          if (state === "error") connectionState.textContent = "Verbinding tijdelijk onderbroken; opnieuw proberen…";
          if (state === "expired") connectionState.textContent = "De sessie is verlopen. Start opnieuw.";
        }
      );
    } catch (error) {
      connectionState.textContent = error.message || "De lokale sessie kon niet worden gestart.";
      qrContainer.innerHTML = '<div class="signing-qr-error">Start het formulier via <code>start-windows.bat</code> of <code>python local_server.py</code>.</div>';
    }
  }

  function updateView() {
    const selected = method();
    const digital = selected === "digital";
    printNotice.hidden = selected !== "print";
    digitalNotice.hidden = !digital;
    inlinePanel.hidden = !(digital && isMobileDevice);
    desktopPanel.hidden = !(digital && !isMobileDevice);
    inlineGuardian.hidden = !isMinorNow();

    if (selected !== "digital") {
      closeModal();
      clearRemoteSession();
    }
    if (digital && !isMobileDevice && !remoteData && !currentSession) {
      startRemoteSession();
    }
  }

  function localSigningData() {
    const fields = {};
    for (const key of [...fieldDefinitions, ...guardianDefinitions].map(definition => definition[0])) {
      fields[key] = pads[key].exportStrokes();
    }
    return { version: 1, minor: isMinorNow(), fields };
  }

  function validateBeforeExport() {
    const selected = method();
    if (!selected) {
      return { ok: false, message: "Kies eerst of het formulier digitaal of op papier wordt ondertekend." };
    }
    if (selected === "print") return { ok: true, mode: "print", data: null };

    const data = isMobileDevice ? localSigningData() : remoteData;
    if (!data) {
      return { ok: false, message: "De digitale ondertekening is nog niet ontvangen van het mobiele toestel." };
    }
    for (const key of requiredKeys()) {
      const strokes = data.fields[key] || [];
      const hasInk = strokes.some(stroke => stroke.length > 1);
      if (!hasInk) {
        const title = [...fieldDefinitions, ...guardianDefinitions].find(definition => definition[0] === key)?.[1] || key;
        return { ok: false, message: `Vul het tekenveld ‘${title}’ in.` };
      }
    }
    return { ok: true, mode: "digital", data };
  }

  function reset() {
    for (const pad of Object.values(pads)) pad.clear();
    for (const pad of Object.values(previewPads)) pad.clear();
    remoteData = null;
    preview.hidden = true;
    restartButton.hidden = true;
    openModalButton.hidden = false;
    desktopTitle.textContent = "Nog geen digitale handtekening ontvangen";
    desktopDescription.textContent = "Open de mobiele ondertekenpagina via de QR-code of URL.";
    clearRemoteSession();
    closeModal();
    updateView();
  }

  form.addEventListener("change", event => {
    if (event.target.name === "signingMethod" || event.target.id === "birthDate") {
      if (event.target.id === "birthDate" && remoteData) {
        remoteData = null;
        preview.hidden = true;
        restartButton.hidden = true;
        openModalButton.hidden = false;
        clearRemoteSession();
      }
      updateView();
    }
  });

  document.addEventListener("click", event => {
    const clearButton = event.target.closest("[data-clear-pad]");
    if (clearButton) pads[clearButton.dataset.clearPad]?.clear();
    if (event.target.closest("[data-close-signing-modal]")) closeModal();
  });

  openModalButton.addEventListener("click", startRemoteSession);
  restartButton.addEventListener("click", startRemoteSession);
  copyUrlButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(urlInput.value);
      copyUrlButton.textContent = "Gekopieerd";
      window.setTimeout(() => { copyUrlButton.textContent = "Kopiëren"; }, 1600);
    } catch {
      urlInput.select();
      document.execCommand("copy");
    }
  });

  window.KBKBDigitalSigning = {
    validateBeforeExport,
    reset,
    getMode: method,
    isMobileDevice
  };

  updateView();
})();
