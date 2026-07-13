'use strict';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function toWinAnsiByte(char) {
  const code = char.codePointAt(0);
  if (code >= 32 && code <= 126) return code;
  if (code >= 160 && code <= 255) return code;
  const map = {
    0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84,
    0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88,
    0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C,
    0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93,
    0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
    0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B,
    0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F
  };
  if (map[code] !== undefined) return map[code];
  const normalized = char.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const first = normalized.charCodeAt(0);
  return first >= 32 && first <= 126 ? first : 63;
}

function pdfString(value) {
  let out = '';
  for (const char of String(value ?? '')) {
    const byte = toWinAnsiByte(char);
    if (byte === 40 || byte === 41 || byte === 92) {
      out += '\\' + String.fromCharCode(byte);
    } else if (byte < 32 || byte > 126) {
      out += '\\' + byte.toString(8).padStart(3, '0');
    } else {
      out += String.fromCharCode(byte);
    }
  }
  return out;
}

function wrapText(text, maxWidth, fontSize, bold = false) {
  const words = String(text || '—').replace(/\s+/g, ' ').trim().split(' ');
  const factor = bold ? 0.56 : 0.52;
  const maxChars = Math.max(4, Math.floor(maxWidth / (fontSize * factor)));
  const lines = [];
  let line = '';
  for (const word of words) {
    if (!line) {
      if (word.length <= maxChars) line = word;
      else {
        for (let i = 0; i < word.length; i += maxChars) lines.push(word.slice(i, i + maxChars));
      }
      continue;
    }
    if ((line + ' ' + word).length <= maxChars) line += ' ' + word;
    else {
      lines.push(line);
      if (word.length <= maxChars) line = word;
      else {
        for (let i = 0; i < word.length - maxChars; i += maxChars) lines.push(word.slice(i, i + maxChars));
        line = word.slice(Math.floor((word.length - 1) / maxChars) * maxChars);
      }
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : ['—'];
}

function generateAffiliationPdf(data) {
  const pages = [];
  let commands = [];
  let cursorY = 0;
  let pageNo = 0;

  const yPdf = top => PAGE_HEIGHT - top;
  const num = value => Number(value).toFixed(2).replace(/\.00$/, '');

  function cmd(value) { commands.push(value); }
  function setFill(r, g, b) { cmd(`${num(r)} ${num(g)} ${num(b)} rg`); }
  function setStroke(r, g, b) { cmd(`${num(r)} ${num(g)} ${num(b)} RG`); }
  function fillRect(x, top, width, height, r, g, b) {
    setFill(r, g, b);
    cmd(`${num(x)} ${num(yPdf(top + height))} ${num(width)} ${num(height)} re f`);
  }
  function strokeRect(x, top, width, height, r = 0.75, g = 0.77, b = 0.8, lineWidth = 0.7) {
    setStroke(r, g, b); cmd(`${num(lineWidth)} w`);
    cmd(`${num(x)} ${num(yPdf(top + height))} ${num(width)} ${num(height)} re S`);
  }
  function line(x1, top1, x2, top2, width = 0.7, r = 0.15, g = 0.16, b = 0.18) {
    setStroke(r, g, b); cmd(`${num(width)} w`);
    cmd(`${num(x1)} ${num(yPdf(top1))} m ${num(x2)} ${num(yPdf(top2))} l S`);
  }
  function text(x, top, value, size = 10, bold = false, r = 0.08, g = 0.09, b = 0.1) {
    setFill(r, g, b);
    cmd(`BT /${bold ? 'F2' : 'F1'} ${num(size)} Tf 1 0 0 1 ${num(x)} ${num(yPdf(top))} Tm (${pdfString(value)}) Tj ET`);
  }
  function wrappedText(x, top, value, maxWidth, size = 10, bold = false, lineHeight = size * 1.25, color = [0.08,0.09,0.1]) {
    const lines = wrapText(value, maxWidth, size, bold);
    lines.forEach((entry, index) => text(x, top + index * lineHeight, entry, size, bold, ...color));
    return lines.length * lineHeight;
  }
  function finishPage() {
    text(MARGIN, PAGE_HEIGHT - 21, `KBKB Online Affiliatieformulier`, 7, false, 0.45, 0.48, 0.52);
    text(PAGE_WIDTH - MARGIN - 34, PAGE_HEIGHT - 21, `Pagina ${pageNo}`, 7, false, 0.45, 0.48, 0.52);
    pages.push(commands.join('\n'));
  }
  function startPage() {
    if (commands.length) finishPage();
    commands = [];
    pageNo += 1;
    cursorY = MARGIN;
  }
  function ensureSpace(height) {
    if (cursorY + height > PAGE_HEIGHT - 50) startPage();
  }
  function sectionTitle(title) {
    ensureSpace(28);
    fillRect(MARGIN, cursorY, CONTENT_WIDTH, 22, 0.94, 0.95, 0.96);
    strokeRect(MARGIN, cursorY, CONTENT_WIDTH, 22, 0.76, 0.78, 0.81, 0.8);
    text(MARGIN + 9, cursorY + 15, title, 10, true);
    cursorY += 22;
  }
  function fieldGrid(fields) {
    const colWidth = CONTENT_WIDTH / 2;
    for (let i = 0; i < fields.length; ) {
      const field = fields[i];
      if (field.wide) {
        const valueLines = wrapText(field.value, CONTENT_WIDTH - 18, 9.5, true);
        const h = Math.max(39, 22 + valueLines.length * 11);
        ensureSpace(h);
        strokeRect(MARGIN, cursorY, CONTENT_WIDTH, h, 0.86, 0.87, 0.89, 0.55);
        text(MARGIN + 8, cursorY + 11, field.label.toUpperCase(), 6.8, false, 0.42, 0.45, 0.49);
        wrappedText(MARGIN + 8, cursorY + 26, field.value, CONTENT_WIDTH - 16, 9.5, true, 11);
        cursorY += h;
        i += 1;
      } else {
        const field2 = fields[i + 1] && !fields[i + 1].wide ? fields[i + 1] : null;
        const lines1 = wrapText(field.value, colWidth - 18, 9.5, true);
        const lines2 = field2 ? wrapText(field2.value, colWidth - 18, 9.5, true) : [''];
        const h = Math.max(39, 22 + Math.max(lines1.length, lines2.length) * 11);
        ensureSpace(h);
        strokeRect(MARGIN, cursorY, colWidth, h, 0.86, 0.87, 0.89, 0.55);
        text(MARGIN + 8, cursorY + 11, field.label.toUpperCase(), 6.8, false, 0.42, 0.45, 0.49);
        wrappedText(MARGIN + 8, cursorY + 26, field.value, colWidth - 16, 9.5, true, 11);
        if (field2) {
          strokeRect(MARGIN + colWidth, cursorY, colWidth, h, 0.86, 0.87, 0.89, 0.55);
          text(MARGIN + colWidth + 8, cursorY + 11, field2.label.toUpperCase(), 6.8, false, 0.42, 0.45, 0.49);
          wrappedText(MARGIN + colWidth + 8, cursorY + 26, field2.value, colWidth - 16, 9.5, true, 11);
        }
        cursorY += h;
        i += field2 ? 2 : 1;
      }
    }
    cursorY += 8;
  }

  startPage();
  fillRect(MARGIN, cursorY, 11, 11, 0.95, 0.76, 0);
  text(MARGIN + 18, cursorY + 9, 'KONINKLIJKE BELGISCHE KORFBALBOND', 8, true, 0.18, 0.2, 0.23);
  text(MARGIN, cursorY + 37, 'Aanvraag tot affiliatie', 22, true);
  text(MARGIN, cursorY + 53, 'Ingevuld via het KBKB Online Affiliatieformulier', 8.5, false, 0.38, 0.41, 0.45);
  const boxX = PAGE_WIDTH - MARGIN - 168;
  strokeRect(boxX, cursorY, 168, 48, 0.65, 0.68, 0.72, 0.7);
  text(boxX + 8, cursorY + 13, 'Datum aansluiting', 7, false, 0.42, 0.45, 0.49);
  text(boxX + 112, cursorY + 13, '—', 8, true);
  text(boxX + 8, cursorY + 27, 'Lidnummer', 7, false, 0.42, 0.45, 0.49);
  text(boxX + 112, cursorY + 27, '—', 8, true);
  text(boxX + 8, cursorY + 41, 'Voorbehouden aan bondssecretariaat', 7, true);
  cursorY += 66;
  fillRect(MARGIN, cursorY, CONTENT_WIDTH, 3, 0.95, 0.76, 0);
  cursorY += 13;

  sectionTitle('Aanvraag');
  fieldGrid([
    { label: 'Affiliatie als', value: data.affiliationType, wide: true },
    { label: 'Vereniging', value: data.club, wide: true }
  ]);

  sectionTitle('Gegevens van de aanvrager');
  fieldGrid([
    { label: 'Naam', value: data.lastName },
    { label: 'Voornaam', value: data.firstName },
    { label: 'Nationaliteit', value: data.nationality },
    { label: 'Geboortedatum', value: data.birthDate },
    { label: 'Rijksregisternummer', value: data.nationalNumber, wide: true },
    { label: 'Adres', value: data.address, wide: true },
    { label: 'Postcode en gemeente', value: data.postalMunicipality },
    { label: 'Geslacht', value: data.gender },
    { label: 'Vorige korfbalclub', value: data.previousClub, wide: true }
  ]);

  if (data.minor) {
    sectionTitle('Wettelijke vertegenwoordiger');
    fieldGrid([
      { label: 'Naam en voornaam', value: data.guardianName, wide: true },
      { label: 'Geboortedatum', value: data.guardianBirthDate },
      { label: 'Nationaliteit', value: data.guardianNationality },
      { label: 'Adres', value: data.guardianAddress, wide: true },
      { label: 'Postcode en gemeente', value: data.guardianPostalMunicipality },
      { label: 'Verwantschap', value: data.guardianRelationship }
    ]);
  }

  if (data.foreign) {
    sectionTitle('Vorige buitenlandse korfbalclub');
    fieldGrid([
      { label: 'Naam vorige club', value: data.foreignClubName, wide: true },
      { label: 'Vestigingsgemeente', value: data.foreignMunicipality },
      { label: 'Land', value: data.foreignCountry },
      { label: 'Toenmalig adres aanvrager', value: data.formerAddress, wide: true }
    ]);
  }

  const noteText = 'Druk deze PDF af en plaats onderaan de vereiste handtekening(en) met pen. Een niet-ondertekende PDF is nog niet volledig afgewerkt.';
  const noteLines = wrapText(noteText, CONTENT_WIDTH - 20, 9, false);
  const noteHeight = 27 + noteLines.length * 11;
  ensureSpace(noteHeight + 185);
  fillRect(MARGIN, cursorY, CONTENT_WIDTH, noteHeight, 1, 0.973, 0.84);
  strokeRect(MARGIN, cursorY, CONTENT_WIDTH, noteHeight, 0.82, 0.66, 0, 1.3);
  text(MARGIN + 9, cursorY + 14, 'AFDRUKKEN EN ONDERTEKENEN VERPLICHT', 8.5, true, 0.3, 0.25, 0);
  wrappedText(MARGIN + 9, cursorY + 29, noteText, CONTENT_WIDTH - 18, 9, false, 11, [0.3,0.25,0]);
  cursorY += noteHeight + 10;

  wrappedText(MARGIN, cursorY + 8, 'De aanvrager bevestigt dat de bovenstaande gegevens correct zijn en dat deze voor de club- en bondsadministratie mogen worden verwerkt.', CONTENT_WIDTH, 8.2, false, 10, [0.22,0.24,0.27]);
  cursorY += 32;

  text(MARGIN, cursorY + 10, 'Opgemaakt te', 7, false, 0.42, 0.45, 0.49);
  line(MARGIN, cursorY + 27, MARGIN + 220, cursorY + 27);
  text(MARGIN + 270, cursorY + 10, 'Datum', 7, false, 0.42, 0.45, 0.49);
  line(MARGIN + 270, cursorY + 27, PAGE_WIDTH - MARGIN, cursorY + 27);
  cursorY += 54;

  const signatureCount = data.minor ? 3 : 2;
  const sigGap = 18;
  const sigWidth = (CONTENT_WIDTH - sigGap * (signatureCount - 1)) / signatureCount;
  const labels = data.minor
    ? [
        ['Handtekening aanvrager', data.fullName || 'Aanvrager'],
        ['Wettelijke vertegenwoordiger', 'Voorafgegaan door "Gezien voor akkoord"'],
        ['Clubsecretaris', 'Stempel en handtekening']
      ]
    : [
        ['Handtekening aanvrager', data.fullName || 'Aanvrager'],
        ['Clubsecretaris', 'Stempel en handtekening']
      ];
  labels.forEach((entry, index) => {
    const x = MARGIN + index * (sigWidth + sigGap);
    line(x, cursorY + 62, x + sigWidth, cursorY + 62);
    text(x, cursorY + 76, entry[0], 8.2, true);
    wrappedText(x, cursorY + 88, entry[1], sigWidth, 7.2, false, 9, [0.42,0.45,0.49]);
  });

  finishPage();

  const objects = [null, null];
  const fontRegularId = objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const fontBoldId = objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const pageIds = [];

  for (const content of pages) {
    const contentLength = new TextEncoder().encode(content).length;
    const contentId = objects.push(`<< /Length ${contentLength} >>\nstream\n${content}\nendstream`);
    const pageId = objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  }

  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[1] = `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] >>`;

  const chunks = ['%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'];
  const offsets = [0];
  let length = new TextEncoder().encode(chunks[0]).length;
  for (let i = 0; i < objects.length; i++) {
    offsets[i + 1] = length;
    const objectText = `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
    chunks.push(objectText);
    length += new TextEncoder().encode(objectText).length;
  }
  const xrefOffset = length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  chunks.push(xref, trailer);
  return new TextEncoder().encode(chunks.join(''));
}
