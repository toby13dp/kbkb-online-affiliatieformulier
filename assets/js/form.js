"use strict";

    const TEMPLATE_BASE64 = window.KBKB_TEMPLATE_BASE64;
    const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const textEncoder = new TextEncoder();
    const textDecoder = new TextDecoder("utf-8");

    const form = document.getElementById("affiliationForm");
    const saveButton = document.getElementById("saveButton");
    const resetButton = document.getElementById("resetButton");
    const statusBox = document.getElementById("formStatus");
    const guardianSection = document.getElementById("guardianSection");
    const foreignSection = document.getElementById("foreignSection");
    const birthDateInput = document.getElementById("birthDate");
    const nationalNumberInput = document.getElementById("nationalNumber");
    const previousClubForeignInput = document.getElementById("previousClubForeign");

    const guardianRequiredIds = [
      "guardianName", "guardianBirthDate", "guardianNationality", "guardianStreet",
      "guardianHouseNumber", "guardianPostalCode", "guardianMunicipality", "guardianRelationship"
    ];
    const foreignRequiredIds = ["foreignMunicipality", "foreignCountry", "foreignClubName", "formerAddress"];

    function showStatus(type, message) {
      const icon = type === "success"
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.6 2.6L16.5 9"/></svg>'
        : type === "error"
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6m0-6-6 6"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 10v6M12 7.2h.01"/></svg>';
      statusBox.className = `status ${type} show`;
      statusBox.innerHTML = icon + `<span>${escapeHtml(message)}</span>`;
      statusBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    function clearStatus() {
      statusBox.className = "status";
      statusBox.textContent = "";
    }

    function escapeHtml(value) {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    function normalizeNationalNumber(value) {
      return String(value || "").replace(/\D/g, "").slice(0, 11);
    }

    function formatNationalNumber(value) {
      const digits = normalizeNationalNumber(value);
      const parts = [];
      if (digits.length) parts.push(digits.slice(0, 6));
      if (digits.length > 6) parts.push(digits.slice(6, 9));
      if (digits.length > 9) parts.push(digits.slice(9, 11));
      let formatted = parts[0] || "";
      if (parts.length > 1) formatted += "-" + parts[1];
      if (parts.length > 2) formatted += "." + parts[2];
      if (formatted.length >= 4) {
        formatted = formatted.slice(0, 2) + "." + formatted.slice(2, 4) + "." + formatted.slice(4);
      }
      return formatted;
    }

    function dateParts(isoDate) {
      if (!isoDate) return { day: "", month: "", year: "" };
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
      return match ? { year: match[1], month: match[2], day: match[3] } : { day: "", month: "", year: "" };
    }

    function isMinor(isoDate) {
      if (!isoDate) return false;
      const birth = new Date(isoDate + "T12:00:00");
      if (Number.isNaN(birth.getTime())) return false;
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDelta = today.getMonth() - birth.getMonth();
      if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) age--;
      return age < 18;
    }

    function validateNationalNumber(digits, isoBirthDate) {
      if (digits.length !== 11) return "Het rijksregisternummer moet 11 cijfers bevatten.";
      const birth = dateParts(isoBirthDate);
      if (birth.year && digits.slice(0, 6) !== birth.year.slice(-2) + birth.month + birth.day) {
        return "De eerste zes cijfers van het rijksregisternummer komen niet overeen met de geboortedatum.";
      }

      const firstNine = BigInt(digits.slice(0, 9));
      const actualCheck = Number(digits.slice(9, 11));
      const expectedBefore2000 = 97 - Number(firstNine % 97n);
      const expectedFrom2000 = 97 - Number((2000000000n + firstNine) % 97n);
      const bornFrom2000 = birth.year ? Number(birth.year) >= 2000 : null;
      const isValid = bornFrom2000 === true
        ? actualCheck === expectedFrom2000
        : bornFrom2000 === false
          ? actualCheck === expectedBefore2000
          : actualCheck === expectedBefore2000 || actualCheck === expectedFrom2000;

      return isValid ? "" : "De controlecijfers van het rijksregisternummer zijn niet geldig.";
    }

    function updateConditionalSections() {
      const minor = isMinor(birthDateInput.value);
      guardianSection.hidden = !minor;
      guardianRequiredIds.forEach(id => {
        document.getElementById(id).required = minor;
      });

      const foreign = previousClubForeignInput.checked;
      foreignSection.hidden = !foreign;
      foreignRequiredIds.forEach(id => {
        document.getElementById(id).required = foreign;
      });
    }

    birthDateInput.addEventListener("change", updateConditionalSections);
    previousClubForeignInput.addEventListener("change", updateConditionalSections);
    nationalNumberInput.addEventListener("input", () => {
      const cursorAtEnd = nationalNumberInput.selectionStart === nationalNumberInput.value.length;
      nationalNumberInput.value = formatNationalNumber(nationalNumberInput.value);
      if (cursorAtEnd) nationalNumberInput.setSelectionRange(nationalNumberInput.value.length, nationalNumberInput.value.length);
      nationalNumberInput.setCustomValidity("");
    });

    function formValue(name) {
      const field = form.elements.namedItem(name);
      if (!field) return "";
      if (field instanceof RadioNodeList) return field.value || "";
      if (field.type === "checkbox") return field.checked;
      return String(field.value || "").trim();
    }

    function validateForm() {
      updateConditionalSections();
      nationalNumberInput.setCustomValidity("");

      if (!form.checkValidity()) {
        form.reportValidity();
        return false;
      }

      const rrnDigits = normalizeNationalNumber(formValue("nationalNumber"));
      const rrnError = validateNationalNumber(rrnDigits, formValue("birthDate"));
      if (rrnError) {
        nationalNumberInput.setCustomValidity(rrnError);
        nationalNumberInput.reportValidity();
        return false;
      }

      if (formValue("previousClubForeign") && !formValue("previousClub")) {
        document.getElementById("previousClub").setCustomValidity("Vul ook de vorige korfbalclub in.");
        document.getElementById("previousClub").reportValidity();
        document.getElementById("previousClub").setCustomValidity("");
        return false;
      }

      return true;
    }

    function buildCellMap() {
      const applicantBirth = dateParts(formValue("birthDate"));
      const guardianBirth = dateParts(formValue("guardianBirthDate"));
      const rrn = normalizeNationalNumber(formValue("nationalNumber"));
      const type = formValue("affiliationType");
      const gender = formValue("gender");
      const minor = isMinor(formValue("birthDate"));
      const foreign = Boolean(formValue("previousClubForeign"));

      return {
        "I8": type === "competition" ? "X" : "",
        "T8": type === "recreant" ? "X" : "",
        "AA8": type === "adherent" ? "X" : "",
        "AH8": type === "occasional" ? "X" : "",

        "I11": formValue("club"),
        "B15": formValue("lastName"),
        "Y15": formValue("firstName"),
        "B19": formValue("nationality"),
        "P19": applicantBirth.day,
        "S19": applicantBirth.month,
        "V19": applicantBirth.year,
        "AD19": rrn.slice(0, 6),
        "AK19": rrn.slice(6, 9),
        "AO19": rrn.slice(9, 11),
        "B23": formValue("street"),
        "AC23": formValue("houseNumber"),
        "AK23": formValue("box"),
        "F25": formValue("postalCode"),
        "T25": formValue("municipality"),
        "B29": gender === "female" ? "X" : "",
        "H29": gender === "male" ? "X" : "",
        "R29": formValue("previousClub"),

        "L33": minor ? formValue("guardianName") : "",
        "J35": minor ? guardianBirth.day : "",
        "M35": minor ? guardianBirth.month : "",
        "P35": minor ? guardianBirth.year : "",
        "AC35": minor ? formValue("guardianNationality") : "",
        "E37": minor ? formValue("guardianStreet") : "",
        "AF37": minor ? formValue("guardianHouseNumber") : "",
        "AN37": minor ? formValue("guardianBox") : "",
        "F39": minor ? formValue("guardianPostalCode") : "",
        "S39": minor ? formValue("guardianMunicipality") : "",
        "Q41": minor ? formValue("guardianRelationship") : "",

        "I47": foreign ? formValue("foreignMunicipality") : "",
        "I49": foreign ? formValue("foreignCountry") : "",
        "I51": foreign ? formValue("foreignClubName") : "",
        "B55": foreign ? formValue("formerAddress") : ""
      };
    }
