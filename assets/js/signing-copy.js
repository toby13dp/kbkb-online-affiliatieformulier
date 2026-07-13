"use strict";

(function () {
  const notice = document.querySelector(".notice div");
  const actionCopy = document.querySelector(".action-copy");
  const footer = document.querySelector(".footer-note");
  const sessionNote = document.querySelector(".signing-security-note");

  if (sessionNote) {
    sessionNote.textContent = "De tijdelijke tekengegevens blijven maximaal 30 minuten in het geheugen van de lokale server. Gebruik een vertrouwd lokaal netwerk.";
  }

  function selectedMethod() {
    return form.elements.namedItem("signingMethod")?.value || "";
  }

  function updateCopy() {
    const method = selectedMethod();
    if (method === "digital") {
      if (notice) notice.innerHTML = "<strong>Digitale ondertekening gekozen:</strong> klik in stap 5 op Ondertekenen en voltooi de tekenvelden één voor één. Afdrukken is daarna niet nodig.";
      if (actionCopy) actionCopy.innerHTML = "<strong>Uitvoer: officieel Excel-formulier als digitaal ondertekende PDF</strong> Alle tekenvelden moeten voltooid zijn; de tijdelijke Excelkopie wordt na de geslaagde PDF-export verwijderd.";
      if (footer) footer.textContent = "Formuliergegevens worden lokaal verwerkt. Digitale tekeningen worden rechtstreeks in de PDF geplaatst.";
      return;
    }
    if (method === "print") {
      if (notice) notice.innerHTML = "<strong>Ondertekenen op papier gekozen:</strong> download de PDF, druk ze af en onderteken onderaan links met pen.";
      if (actionCopy) actionCopy.innerHTML = "<strong>Uitvoer: officiële PDF via een tijdelijke Excelkopie</strong> Daarna afdrukken en onderaan met pen ondertekenen.";
      if (footer) footer.textContent = "Formuliergegevens worden lokaal verwerkt. De PDF moet na de download nog worden afgedrukt en ondertekend.";
      return;
    }
    if (notice) notice.innerHTML = "<strong>Laatste stap:</strong> kies onderaan of je digitaal ondertekent of de PDF eerst afdrukt en met pen ondertekent.";
    if (actionCopy) actionCopy.innerHTML = "<strong>Uitvoer: officiële PDF via een tijdelijke Excelkopie</strong> Kies in stap 5 hoe het document wordt ondertekend.";
    if (footer) footer.textContent = "De tijdelijke Excelkopie en alle formuliergegevens worden uitsluitend lokaal verwerkt.";
  }

  form.addEventListener("change", event => {
    if (event.target.name === "signingMethod") updateCopy();
  });
  updateCopy();
})();
