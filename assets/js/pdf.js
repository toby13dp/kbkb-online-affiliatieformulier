function formPdfDate(name) {
  const value = formValue(name);
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function pdfFormValue(name, fallback = "—") {
  const value = formValue(name);
  if (typeof value === "boolean") return value ? "Ja" : "Nee";
  return value || fallback;
}

function pdfAffiliationLabel(value) {
  const labels = {
    competition: "Competitiespeler",
    recreant: "Recreant",
    adherent: "Adherent",
    occasional: "Occasioneel korfballer - medische verklaring vereist"
  };
  return labels[value] || "—";
}

function pdfGenderLabel(value) {
  return value === "female" ? "Vrouw" : value === "male" ? "Man" : "—";
}

function collectAffiliationPdfData() {
  const minor = isMinor(formValue("birthDate"));
  const foreign = Boolean(formValue("previousClubForeign"));
  const address = `${pdfFormValue("street")} ${pdfFormValue("houseNumber", "")}${formValue("box") ? ` bus ${pdfFormValue("box", "")}` : ""}`.trim();
  const guardianAddress = `${pdfFormValue("guardianStreet")} ${pdfFormValue("guardianHouseNumber", "")}${formValue("guardianBox") ? ` bus ${pdfFormValue("guardianBox", "")}` : ""}`.trim();

  return {
    affiliationType: pdfAffiliationLabel(formValue("affiliationType")),
    club: pdfFormValue("club"),
    lastName: pdfFormValue("lastName"),
    firstName: pdfFormValue("firstName"),
    nationality: pdfFormValue("nationality"),
    birthDate: formPdfDate("birthDate"),
    nationalNumber: formatNationalNumber(formValue("nationalNumber")),
    address,
    postalMunicipality: `${pdfFormValue("postalCode")} ${pdfFormValue("municipality")}`.trim(),
    gender: pdfGenderLabel(formValue("gender")),
    previousClub: pdfFormValue("previousClub"),
    minor,
    guardianName: pdfFormValue("guardianName"),
    guardianBirthDate: formPdfDate("guardianBirthDate"),
    guardianNationality: pdfFormValue("guardianNationality"),
    guardianAddress,
    guardianPostalMunicipality: `${pdfFormValue("guardianPostalCode")} ${pdfFormValue("guardianMunicipality")}`.trim(),
    guardianRelationship: pdfFormValue("guardianRelationship"),
    foreign,
    foreignClubName: pdfFormValue("foreignClubName"),
    foreignMunicipality: pdfFormValue("foreignMunicipality"),
    foreignCountry: pdfFormValue("foreignCountry"),
    formerAddress: pdfFormValue("formerAddress"),
    fullName: `${formValue("firstName")} ${formValue("lastName")}`.trim()
  };
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

function downloadAffiliationPdf() {
  const data = collectAffiliationPdfData();
  const bytes = generateAffiliationPdf(data);
  const filename = `Affiliatie_${safePdfFilename(formValue("lastName"))}_${safePdfFilename(formValue("firstName"))}.pdf`;
  const blob = new Blob([bytes], { type: "application/pdf" });
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

function configurePdfUi() {
  document.title = "KBKB Online Affiliatieformulier - PDF export";

  const description = document.querySelector('meta[name="description"]');
  if (description) {
    description.content = "Vul het KBKB-affiliatieformulier veilig in en download lokaal een printklare PDF die onderaan handmatig moet worden ondertekend.";
  }

  const heading = document.querySelector("h1");
  if (heading) heading.textContent = "Vul het affiliatieformulier in en download een printklare PDF.";

  const intro = document.querySelector(".intro");
  if (intro) {
    intro.textContent = "Alle verwerking gebeurt uitsluitend in deze browser. De PDF wordt rechtstreeks lokaal opgeslagen en moet daarna worden afgedrukt en onderaan met pen worden ondertekend.";
  }

  const noticeText = document.querySelector(".notice div");
  if (noticeText) {
    noticeText.innerHTML = "<strong>Belangrijk:</strong> download de ingevulde PDF, druk ze vervolgens af en onderteken onderaan. De aansluitingsdatum en het lidnummer blijven voorbehouden voor het bondssecretariaat.";
  }

  const actionCopy = document.querySelector(".action-copy");
  if (actionCopy) {
    actionCopy.innerHTML = "<strong>Uitvoer: een printklare PDF</strong> Daarna afdrukken en onderaan ondertekenen.";
  }

  saveButton.textContent = "PDF opslaan";

  const footer = document.querySelector(".footer-note");
  if (footer) {
    footer.textContent = "Persoonsgegevens worden niet verzonden. De gedownloade PDF moet nog worden afgedrukt en onderaan handmatig worden ondertekend.";
  }
}

configurePdfUi();
