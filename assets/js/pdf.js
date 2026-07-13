"use strict";

function formatPdfDate(isoDate) {
  if (!isoDate) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : escapeHtml(isoDate);
}

function pdfValue(name, fallback = "—") {
  const value = formValue(name);
  if (typeof value === "boolean") return value ? "Ja" : "Nee";
  return value ? escapeHtml(value) : fallback;
}

function affiliationLabel(value) {
  const labels = {
    competition: "Competitiespeler",
    recreant: "Recreant",
    adherent: "Adherent",
    occasional: "Occasioneel korfballer — medische verklaring vereist"
  };
  return labels[value] || "—";
}

function genderLabel(value) {
  return value === "female" ? "Vrouw" : value === "male" ? "Man" : "—";
}

function pdfRow(label, value, extraClass = "") {
  return `<div class="pdf-field ${extraClass}"><span>${escapeHtml(label)}</span><strong>${value || "—"}</strong></div>`;
}

function buildPdfDocument() {
  const minor = isMinor(formValue("birthDate"));
  const foreign = Boolean(formValue("previousClubForeign"));
  const fullName = `${formValue("firstName")} ${formValue("lastName")}`.trim();
  const filename = `Affiliatie_${safePdfFilename(formValue("lastName"))}_${safePdfFilename(formValue("firstName"))}`;

  const guardianBlock = minor ? `
    <section class="pdf-section avoid-break">
      <h2>Wettelijke vertegenwoordiger</h2>
      <div class="pdf-grid">
        ${pdfRow("Naam en voornaam", pdfValue("guardianName"), "wide")}
        ${pdfRow("Geboortedatum", formatPdfDate(formValue("guardianBirthDate")))}
        ${pdfRow("Nationaliteit", pdfValue("guardianNationality"))}
        ${pdfRow("Adres", `${pdfValue("guardianStreet")} ${pdfValue("guardianHouseNumber", "")}${formValue("guardianBox") ? ` bus ${pdfValue("guardianBox", "")}` : ""}`, "wide")}
        ${pdfRow("Postcode en gemeente", `${pdfValue("guardianPostalCode")} ${pdfValue("guardianMunicipality")}`)}
        ${pdfRow("Verwantschap", pdfValue("guardianRelationship"))}
      </div>
    </section>` : "";

  const foreignBlock = foreign ? `
    <section class="pdf-section avoid-break">
      <h2>Vorige buitenlandse korfbalclub</h2>
      <div class="pdf-grid">
        ${pdfRow("Naam vorige club", pdfValue("foreignClubName"), "wide")}
        ${pdfRow("Vestigingsgemeente", pdfValue("foreignMunicipality"))}
        ${pdfRow("Land", pdfValue("foreignCountry"))}
        ${pdfRow("Toenmalig adres aanvrager", pdfValue("formerAddress"), "wide")}
      </div>
    </section>` : "";

  const guardianSignature = minor ? `
    <div class="signature-box">
      <div class="signature-line"></div>
      <strong>Wettelijke vertegenwoordiger</strong>
      <span>Voorafgegaan door “Gezien voor akkoord”</span>
    </div>` : "";

  return `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(filename)}</title>
  <style>
    :root { font-family: Arial, Helvetica, sans-serif; color: #17191c; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #e9ebee; }
    .screen-tools {
      position: sticky; top: 0; z-index: 10; display: flex; justify-content: center;
      gap: 12px; padding: 14px; background: #20242a; color: #fff;
    }
    .screen-tools button {
      border: 0; border-radius: 8px; padding: 11px 18px; background: #f2c300;
      color: #211c00; font-weight: 800; cursor: pointer;
    }
    .screen-tools span { align-self: center; font-size: 13px; }
    .page {
      width: 210mm; min-height: 297mm; margin: 16px auto; padding: 13mm 14mm;
      background: #fff; box-shadow: 0 8px 30px rgba(0,0,0,.14);
    }
    .pdf-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; border-bottom: 3px solid #f2c300; padding-bottom: 10px; }
    .brand { display: inline-flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    .brand::before { content: ""; width: 11px; height: 11px; border-radius: 50%; background: #f2c300; }
    h1 { margin: 7px 0 2px; font-size: 25px; letter-spacing: -.03em; }
    .subtitle { margin: 0; color: #59616c; font-size: 11px; }
    .reserved { min-width: 58mm; border: 1px solid #b8bdc5; border-radius: 7px; padding: 8px 10px; font-size: 10px; }
    .reserved div { display: flex; justify-content: space-between; gap: 10px; padding: 3px 0; }
    .reserved span { color: #68717c; }
    .pdf-section { margin-top: 10px; border: 1px solid #cbd0d6; border-radius: 8px; overflow: hidden; }
    .pdf-section h2 { margin: 0; padding: 7px 10px; background: #f2f3f5; border-bottom: 1px solid #cbd0d6; font-size: 12px; }
    .pdf-grid { display: grid; grid-template-columns: 1fr 1fr; }
    .pdf-field { min-height: 16mm; padding: 6px 9px; border-right: 1px solid #e0e3e7; border-bottom: 1px solid #e0e3e7; }
    .pdf-field:nth-child(even) { border-right: 0; }
    .pdf-field.wide { grid-column: 1 / -1; border-right: 0; }
    .pdf-field span { display: block; margin-bottom: 3px; color: #68717c; font-size: 8.5px; text-transform: uppercase; letter-spacing: .04em; }
    .pdf-field strong { display: block; font-size: 11px; font-weight: 650; overflow-wrap: anywhere; }
    .important {
      margin-top: 11px; padding: 9px 11px; border: 2px solid #d1a800; border-radius: 8px;
      background: #fff8d5; font-size: 11px; line-height: 1.4;
    }
    .important strong { display: block; margin-bottom: 2px; }
    .declaration { margin-top: 9px; font-size: 9.5px; line-height: 1.45; color: #33383f; }
    .location-date { display: grid; grid-template-columns: 1fr 1fr; gap: 15mm; margin-top: 13mm; }
    .line-field { border-bottom: 1px solid #17191c; min-height: 8mm; padding: 0 2px 2px; font-size: 10px; }
    .line-label { display: block; margin-top: 3px; color: #68717c; font-size: 8px; }
    .signatures { display: grid; grid-template-columns: repeat(${minor ? 3 : 2}, 1fr); gap: 8mm; margin-top: 21mm; }
    .signature-box { min-height: 34mm; font-size: 9px; }
    .signature-line { height: 22mm; border-bottom: 1px solid #17191c; }
    .signature-box strong { display: block; margin-top: 4px; font-size: 9.5px; }
    .signature-box span { display: block; margin-top: 2px; color: #68717c; font-size: 8px; }
    .footer { margin-top: 10mm; padding-top: 4mm; border-top: 1px solid #d8dce1; color: #747c86; font-size: 8px; text-align: center; }
    .avoid-break { break-inside: avoid; page-break-inside: avoid; }
    @page { size: A4 portrait; margin: 0; }
    @media print {
      html, body { width: 210mm; background: #fff; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .screen-tools { display: none !important; }
      .page { margin: 0; box-shadow: none; }
    }
    @media screen and (max-width: 760px) {
      .page { width: 100%; min-height: auto; margin: 0; padding: 18px; }
      .screen-tools { flex-direction: column; text-align: center; }
    }
  </style>
</head>
<body>
  <div class="screen-tools">
    <button type="button" onclick="window.print()">Opslaan als PDF / afdrukken</button>
    <span>Kies in het afdrukvenster eerst “Opslaan als PDF”. Druk die PDF daarna af en onderteken onderaan.</span>
  </div>
  <main class="page">
    <header class="pdf-header">
      <div>
        <div class="brand">Koninklijke Belgische Korfbalbond</div>
        <h1>Aanvraag tot affiliatie</h1>
        <p class="subtitle">Ingevuld via het KBKB Online Affiliatieformulier</p>
      </div>
      <div class="reserved">
        <div><span>Datum aansluiting</span><strong>—</strong></div>
        <div><span>Lidnummer</span><strong>—</strong></div>
        <div><span>Voorbehouden</span><strong>Bondssecretariaat</strong></div>
      </div>
    </header>

    <section class="pdf-section avoid-break">
      <h2>Aanvraag</h2>
      <div class="pdf-grid">
        ${pdfRow("Affiliatie als", escapeHtml(affiliationLabel(formValue("affiliationType"))), "wide")}
        ${pdfRow("Vereniging", pdfValue("club"), "wide")}
      </div>
    </section>

    <section class="pdf-section">
      <h2>Gegevens van de aanvrager</h2>
      <div class="pdf-grid">
        ${pdfRow("Naam", pdfValue("lastName"))}
        ${pdfRow("Voornaam", pdfValue("firstName"))}
        ${pdfRow("Nationaliteit", pdfValue("nationality"))}
        ${pdfRow("Geboortedatum", formatPdfDate(formValue("birthDate")))}
        ${pdfRow("Rijksregisternummer", escapeHtml(formatNationalNumber(formValue("nationalNumber"))), "wide")}
        ${pdfRow("Adres", `${pdfValue("street")} ${pdfValue("houseNumber", "")}${formValue("box") ? ` bus ${pdfValue("box", "")}` : ""}`, "wide")}
        ${pdfRow("Postcode en gemeente", `${pdfValue("postalCode")} ${pdfValue("municipality")}`)}
        ${pdfRow("Geslacht", escapeHtml(genderLabel(formValue("gender"))))}
        ${pdfRow("Vorige korfbalclub", pdfValue("previousClub"), "wide")}
      </div>
    </section>

    ${guardianBlock}
    ${foreignBlock}

    <div class="important avoid-break">
      <strong>Afdrukken en ondertekenen verplicht</strong>
      Sla dit document op als PDF. Druk de opgeslagen PDF vervolgens af en plaats onderaan de vereiste handtekening(en) met pen. Een niet-ondertekende PDF is nog niet volledig afgewerkt.
    </div>

    <p class="declaration">De aanvrager bevestigt dat de bovenstaande gegevens correct zijn en dat deze voor de club- en bondsadministratie mogen worden verwerkt.</p>

    <div class="location-date avoid-break">
      <div><div class="line-field"></div><span class="line-label">Opgemaakt te</span></div>
      <div><div class="line-field"></div><span class="line-label">Datum</span></div>
    </div>

    <div class="signatures avoid-break">
      <div class="signature-box">
        <div class="signature-line"></div>
        <strong>Handtekening aanvrager</strong>
        <span>${escapeHtml(fullName || "Aanvrager")}</span>
      </div>
      ${guardianSignature}
      <div class="signature-box">
        <div class="signature-line"></div>
        <strong>Stempel en handtekening clubsecretaris</strong>
        <span>In te vullen door de vereniging</span>
      </div>
    </div>

    <div class="footer">Gegenereerd via KBKB Online Affiliatieformulier · Persoonsgegevens zijn uitsluitend lokaal in de browser verwerkt.</div>
  </main>
  <script>
    window.addEventListener("load", function () {
      window.setTimeout(function () { window.print(); }, 350);
    });
  <\/script>
</body>
</html>`;
}

function safePdfFilename(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:\"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50) || "onbekend";
}

function openPdfExport() {
  const pdfWindow = window.open("", "_blank");
  if (!pdfWindow) {
    throw new Error("De browser heeft het PDF-venster geblokkeerd. Sta pop-ups voor deze pagina toe en probeer opnieuw.");
  }

  pdfWindow.document.open();
  pdfWindow.document.write(buildPdfDocument());
  pdfWindow.document.close();
  return pdfWindow;
}

function configurePdfUi() {
  document.title = "KBKB Online Affiliatieformulier — PDF export";

  const description = document.querySelector('meta[name="description"]');
  if (description) {
    description.content = "Vul het KBKB-affiliatieformulier veilig in en exporteer een printklare PDF die onderaan handmatig moet worden ondertekend.";
  }

  const heading = document.querySelector("h1");
  if (heading) heading.textContent = "Vul het affiliatieformulier in en exporteer een printklare PDF.";

  const intro = document.querySelector(".intro");
  if (intro) {
    intro.textContent = "Alle verwerking gebeurt uitsluitend in deze browser. Na de PDF-export moet het document worden afgedrukt en onderaan met pen worden ondertekend.";
  }

  const noticeText = document.querySelector(".notice div");
  if (noticeText) {
    noticeText.innerHTML = "<strong>Belangrijk:</strong> sla het ingevulde formulier op als PDF, druk die PDF vervolgens af en onderteken onderaan. De aansluitingsdatum en het lidnummer blijven voorbehouden voor het bondssecretariaat.";
  }

  const actionStrong = document.querySelector(".action-copy strong");
  const actionCopy = document.querySelector(".action-copy");
  if (actionStrong) actionStrong.textContent = "Uitvoer: een printklare PDF";
  if (actionCopy) {
    actionCopy.childNodes[actionCopy.childNodes.length - 1].textContent = " Daarna afdrukken en onderaan ondertekenen.";
  }

  saveButton.textContent = "PDF maken";

  const footer = document.querySelector(".footer-note");
  if (footer) {
    footer.textContent = "Persoonsgegevens worden niet verzonden. De geëxporteerde PDF moet nog worden afgedrukt en onderaan handmatig worden ondertekend.";
  }
}

configurePdfUi();
