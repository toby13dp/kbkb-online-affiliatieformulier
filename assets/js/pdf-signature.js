"use strict";

(function () {
  const encoder = new TextEncoder();

  // Coördinaten in PDF-punten, gemeten op de rechtstreeks door LibreOffice
  // geëxporteerde officiële A4-pagina (595,304 × 841,89 pt).
  const SIGNATURE_RECTS = {
    place: { x: 52, top: 598, width: 166, height: 16, lineWidth: 1.05 },
    date: { x: 62, top: 622, width: 120, height: 14, lineWidth: 1.0 },
    signature: { x: 28, top: 640, width: 210, height: 32, lineWidth: 1.2 },
    name: { x: 28, top: 674, width: 210, height: 14, lineWidth: 0.95 },
    guardianAgreement: { x: 28, top: 724, width: 350, height: 16, lineWidth: 0.95 },
    guardianSignature: { x: 28, top: 743, width: 350, height: 34, lineWidth: 1.2 },
    guardianName: { x: 28, top: 780, width: 350, height: 15, lineWidth: 0.95 }
  };

  function latin1(bytes) {
    let output = "";
    const chunk = 0x8000;
    for (let index = 0; index < bytes.length; index += chunk) {
      output += String.fromCharCode(...bytes.subarray(index, index + chunk));
    }
    return output;
  }

  function concatBytes(chunks) {
    const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const output = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      output.set(chunk, offset);
      offset += chunk.length;
    }
    return output;
  }

  function extractTrailer(pdfText) {
    const startMatches = [...pdfText.matchAll(/startxref\s+(\d+)\s+%%EOF/g)];
    if (!startMatches.length) throw new Error("De PDF heeft geen geldige xref-verwijzing.");
    const previousXref = Number(startMatches[startMatches.length - 1][1]);
    const trailerIndex = pdfText.lastIndexOf("trailer", previousXref);
    const trailerText = trailerIndex >= 0
      ? pdfText.slice(trailerIndex, pdfText.indexOf("startxref", trailerIndex))
      : pdfText.slice(-5000);
    const size = Number((trailerText.match(/\/Size\s+(\d+)/) || [])[1]);
    const root = trailerText.match(/\/Root\s+(\d+)\s+(\d+)\s+R/);
    const info = trailerText.match(/\/Info\s+(\d+)\s+(\d+)\s+R/);
    const id = trailerText.match(/\/ID\s*\[\s*(<[^>]+>)\s*(<[^>]+>)\s*\]/s);
    if (!size || !root) throw new Error("De PDF-trailer heeft een onverwachte structuur.");
    return {
      size,
      previousXref,
      root: `${root[1]} ${root[2]} R`,
      info: info ? `${info[1]} ${info[2]} R` : "",
      id: id ? `[ ${id[1]} ${id[2]} ]` : ""
    };
  }

  function findPageObject(pdfText) {
    const objectPattern = /(?:^|\n)(\d+)\s+(\d+)\s+obj\s*([\s\S]*?)\s*endobj/g;
    let match;
    while ((match = objectPattern.exec(pdfText)) !== null) {
      if (/\/Type\s*\/Page(?!s)\b/.test(match[3])) {
        return { id: Number(match[1]), generation: Number(match[2]), body: match[3].trim() };
      }
    }
    throw new Error("De eerste PDF-pagina kon niet worden gevonden.");
  }

  function mediaBox(pageBody) {
    const match = pageBody.match(/\/MediaBox\s*\[\s*([\d.+-]+)\s+([\d.+-]+)\s+([\d.+-]+)\s+([\d.+-]+)\s*\]/);
    if (!match) return { width: 595.304, height: 841.89 };
    return {
      width: Number(match[3]) - Number(match[1]),
      height: Number(match[4]) - Number(match[2])
    };
  }

  function validStrokes(strokes) {
    return Array.isArray(strokes)
      ? strokes.filter(stroke => Array.isArray(stroke) && stroke.length > 1)
      : [];
  }

  function strokeCommands(strokes, rect, pageHeight) {
    const clean = validStrokes(strokes);
    if (!clean.length) return "";
    const commands = [
      "q",
      `${rect.x.toFixed(3)} ${(pageHeight - rect.top - rect.height).toFixed(3)} ${rect.width.toFixed(3)} ${rect.height.toFixed(3)} re W n`,
      "0 0 0 RG",
      `${rect.lineWidth.toFixed(2)} w`,
      "1 J",
      "1 j"
    ];
    for (const stroke of clean) {
      const first = stroke[0];
      const firstX = rect.x + (Number(first[0]) / 1000) * rect.width;
      const firstTop = rect.top + (Number(first[1]) / 1000) * rect.height;
      commands.push(`${firstX.toFixed(3)} ${(pageHeight - firstTop).toFixed(3)} m`);
      for (let index = 1; index < stroke.length; index++) {
        const point = stroke[index];
        const x = rect.x + (Number(point[0]) / 1000) * rect.width;
        const top = rect.top + (Number(point[1]) / 1000) * rect.height;
        commands.push(`${x.toFixed(3)} ${(pageHeight - top).toFixed(3)} l`);
      }
      commands.push("S");
    }
    commands.push("Q");
    return commands.join("\n");
  }

  function appendSignature(pdfBytes, signingData) {
    if (!(pdfBytes instanceof Uint8Array)) pdfBytes = new Uint8Array(pdfBytes);
    if (!signingData?.fields) return pdfBytes;

    const originalText = latin1(pdfBytes);
    const trailer = extractTrailer(originalText);
    const page = findPageObject(originalText);
    const pageSize = mediaBox(page.body);
    const overlayObjectId = trailer.size;

    const streams = [];
    for (const [field, rect] of Object.entries(SIGNATURE_RECTS)) {
      const commands = strokeCommands(signingData.fields[field], rect, pageSize.height);
      if (commands) streams.push(commands);
    }
    if (!streams.length) throw new Error("Er zijn geen digitale tekeningen om in de PDF te plaatsen.");

    const stream = streams.join("\n");
    const streamLength = encoder.encode(stream).length;
    let pageBody = page.body;
    if (/\/Contents\s+\d+\s+\d+\s+R/.test(pageBody)) {
      pageBody = pageBody.replace(
        /\/Contents\s+(\d+\s+\d+\s+R)/,
        `/Contents[$1 ${overlayObjectId} 0 R]`
      );
    } else if (/\/Contents\s*\[/.test(pageBody)) {
      pageBody = pageBody.replace(/\/Contents\s*\[/, `/Contents[${overlayObjectId} 0 R `);
    } else {
      throw new Error("De inhoudsverwijzing van de PDF werd niet herkend.");
    }

    const objects = [
      { id: page.id, generation: page.generation, body: pageBody },
      {
        id: overlayObjectId,
        generation: 0,
        body: `<< /Length ${streamLength} >>\nstream\n${stream}\nendstream`
      }
    ].sort((a, b) => a.id - b.id);

    const chunks = [pdfBytes, encoder.encode("\n")];
    const offsets = new Map();
    let offset = pdfBytes.length + 1;
    for (const object of objects) {
      const objectBytes = encoder.encode(
        `${object.id} ${object.generation} obj\n${object.body}\nendobj\n`
      );
      offsets.set(object.id, { offset, generation: object.generation });
      chunks.push(objectBytes);
      offset += objectBytes.length;
    }

    const xrefOffset = offset;
    let xref = "xref\n";
    for (const object of objects) {
      const entry = offsets.get(object.id);
      xref += `${object.id} 1\n${String(entry.offset).padStart(10, "0")} ${String(entry.generation).padStart(5, "0")} n \n`;
    }
    const infoPart = trailer.info ? `/Info ${trailer.info}` : "";
    const idPart = trailer.id ? `/ID ${trailer.id}` : "";
    const newSize = Math.max(trailer.size, overlayObjectId + 1);
    const tail = `trailer\n<< /Size ${newSize} /Root ${trailer.root} ${infoPart} ${idPart} /Prev ${trailer.previousXref} >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
    chunks.push(encoder.encode(xref + tail));
    return concatBytes(chunks);
  }

  window.KBKBAppendDigitalSignature = appendSignature;
  window.KBKB_SIGNATURE_RECTS = SIGNATURE_RECTS;
})();
