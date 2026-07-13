"use strict";

    function base64ToBytes(base64) {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    }

    function readU16(view, offset) { return view.getUint16(offset, true); }
    function readU32(view, offset) { return view.getUint32(offset, true); }
    function writeU16(view, offset, value) { view.setUint16(offset, value, true); }
    function writeU32(view, offset, value) { view.setUint32(offset, value >>> 0, true); }

    async function inflateRaw(bytes) {
      if (!("DecompressionStream" in window)) {
        throw new Error("Deze browser ondersteunt de lokale Excel-verwerking niet. Open het HTML-bestand in een recente versie van Chrome, Edge of Firefox.");
      }
      let stream;
      try {
        stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      } catch (error) {
        throw new Error("De ingebouwde ZIP-decompressie wordt niet ondersteund door deze browser.");
      }
      return new Uint8Array(await new Response(stream).arrayBuffer());
    }

    async function parseZip(bytes) {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const minOffset = Math.max(0, bytes.length - 65557);
      let eocdOffset = -1;

      for (let offset = bytes.length - 22; offset >= minOffset; offset--) {
        if (readU32(view, offset) === 0x06054b50) {
          eocdOffset = offset;
          break;
        }
      }
      if (eocdOffset < 0) throw new Error("Het ingebouwde Excel-sjabloon is geen geldig ZIP/XLSX-bestand.");

      const entryCount = readU16(view, eocdOffset + 10);
      let centralOffset = readU32(view, eocdOffset + 16);
      const entries = [];

      for (let index = 0; index < entryCount; index++) {
        if (readU32(view, centralOffset) !== 0x02014b50) {
          throw new Error("De centrale ZIP-map van het sjabloon is beschadigd.");
        }

        const versionMadeBy = readU16(view, centralOffset + 4);
        const versionNeeded = readU16(view, centralOffset + 6);
        const flags = readU16(view, centralOffset + 8);
        const method = readU16(view, centralOffset + 10);
        const modTime = readU16(view, centralOffset + 12);
        const modDate = readU16(view, centralOffset + 14);
        const compressedSize = readU32(view, centralOffset + 20);
        const fileNameLength = readU16(view, centralOffset + 28);
        const extraLength = readU16(view, centralOffset + 30);
        const commentLength = readU16(view, centralOffset + 32);
        const internalAttributes = readU16(view, centralOffset + 36);
        const externalAttributes = readU32(view, centralOffset + 38);
        const localHeaderOffset = readU32(view, centralOffset + 42);

        const nameBytes = bytes.slice(centralOffset + 46, centralOffset + 46 + fileNameLength);
        const name = textDecoder.decode(nameBytes);

        if (readU32(view, localHeaderOffset) !== 0x04034b50) {
          throw new Error(`Ongeldige lokale ZIP-header voor ${name}.`);
        }

        const localNameLength = readU16(view, localHeaderOffset + 26);
        const localExtraLength = readU16(view, localHeaderOffset + 28);
        const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
        const compressedData = bytes.slice(dataStart, dataStart + compressedSize);

        let data;
        if (method === 0) {
          data = compressedData.slice();
        } else if (method === 8) {
          data = await inflateRaw(compressedData);
        } else {
          throw new Error(`Niet-ondersteunde ZIP-compressiemethode (${method}) in ${name}.`);
        }

        entries.push({
          name,
          data,
          versionMadeBy,
          versionNeeded,
          flags: flags & 0x0800,
          modTime,
          modDate,
          internalAttributes,
          externalAttributes
        });

        centralOffset += 46 + fileNameLength + extraLength + commentLength;
      }

      return entries;
    }

    const crcTable = (() => {
      const table = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        table[n] = c >>> 0;
      }
      return table;
    })();

    function crc32(bytes) {
      let crc = 0xffffffff;
      for (let i = 0; i < bytes.length; i++) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
      return (crc ^ 0xffffffff) >>> 0;
    }

    function concatBytes(chunks, totalLength) {
      const output = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        output.set(chunk, offset);
        offset += chunk.length;
      }
      return output;
    }

    function buildZip(entries) {
      const localChunks = [];
      const centralChunks = [];
      let localOffset = 0;

      for (const entry of entries) {
        const nameBytes = textEncoder.encode(entry.name);
        const data = entry.data;
        const crc = crc32(data);
        const flags = 0x0800;
        const localHeader = new Uint8Array(30 + nameBytes.length);
        const lv = new DataView(localHeader.buffer);

        writeU32(lv, 0, 0x04034b50);
        writeU16(lv, 4, 20);
        writeU16(lv, 6, flags);
        writeU16(lv, 8, 0);
        writeU16(lv, 10, entry.modTime || 0);
        writeU16(lv, 12, entry.modDate || 0);
        writeU32(lv, 14, crc);
        writeU32(lv, 18, data.length);
        writeU32(lv, 22, data.length);
        writeU16(lv, 26, nameBytes.length);
        writeU16(lv, 28, 0);
        localHeader.set(nameBytes, 30);

        localChunks.push(localHeader, data);

        const centralHeader = new Uint8Array(46 + nameBytes.length);
        const cv = new DataView(centralHeader.buffer);
        writeU32(cv, 0, 0x02014b50);
        writeU16(cv, 4, entry.versionMadeBy || 20);
        writeU16(cv, 6, 20);
        writeU16(cv, 8, flags);
        writeU16(cv, 10, 0);
        writeU16(cv, 12, entry.modTime || 0);
        writeU16(cv, 14, entry.modDate || 0);
        writeU32(cv, 16, crc);
        writeU32(cv, 20, data.length);
        writeU32(cv, 24, data.length);
        writeU16(cv, 28, nameBytes.length);
        writeU16(cv, 30, 0);
        writeU16(cv, 32, 0);
        writeU16(cv, 34, 0);
        writeU16(cv, 36, entry.internalAttributes || 0);
        writeU32(cv, 38, entry.externalAttributes || 0);
        writeU32(cv, 42, localOffset);
        centralHeader.set(nameBytes, 46);
        centralChunks.push(centralHeader);

        localOffset += localHeader.length + data.length;
      }

      const centralSize = centralChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const eocd = new Uint8Array(22);
      const ev = new DataView(eocd.buffer);
      writeU32(ev, 0, 0x06054b50);
      writeU16(ev, 4, 0);
      writeU16(ev, 6, 0);
      writeU16(ev, 8, entries.length);
      writeU16(ev, 10, entries.length);
      writeU32(ev, 12, centralSize);
      writeU32(ev, 16, localOffset);
      writeU16(ev, 20, 0);

      const totalLength = localOffset + centralSize + eocd.length;
      return concatBytes([...localChunks, ...centralChunks, eocd], totalLength);
    }

    function escapeXml(value) {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&apos;");
    }

    function setXmlCell(xml, reference, value) {
      const escapedReference = reference.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const selfClosingPattern = new RegExp(`<c(?=[^>]*\\br="${escapedReference}")([^>]*)\\/>`);
      const normalPattern = new RegExp(`<c(?=[^>]*\\br="${escapedReference}")([^>]*)>([\\s\\S]*?)<\\/c>`);

      let match = selfClosingPattern.exec(xml);
      let pattern = selfClosingPattern;
      if (!match) {
        match = normalPattern.exec(xml);
        pattern = normalPattern;
      }
      if (!match) throw new Error(`De verwachte Excel-cel ${reference} ontbreekt in het sjabloon.`);

      const attributes = match[1].replace(/\s+t="[^"]*"/g, "");
      const replacement = value === null || value === undefined || String(value) === ""
        ? `<c${attributes}/>`
        : `<c${attributes} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;

      return xml.replace(pattern, replacement);
    }

    function safeFilenamePart(value) {
      return String(value || "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
        .replace(/\s+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 50) || "onbekend";
    }

    async function generateWorkbook() {
      const entries = await parseZip(base64ToBytes(TEMPLATE_BASE64));
      const sheetEntry = entries.find(entry => entry.name === "xl/worksheets/sheet1.xml");
      if (!sheetEntry) throw new Error("Het werkblad van het ingebouwde sjabloon ontbreekt.");

      let sheetXml = textDecoder.decode(sheetEntry.data);
      const cellMap = buildCellMap();
      for (const [reference, value] of Object.entries(cellMap)) {
        sheetXml = setXmlCell(sheetXml, reference, value);
      }
      sheetEntry.data = textEncoder.encode(sheetXml);

      const coreEntry = entries.find(entry => entry.name === "docProps/core.xml");
      if (coreEntry) {
        let coreXml = textDecoder.decode(coreEntry.data);
        const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
        coreXml = coreXml.replace(
          /(<dcterms:modified\b[^>]*>)[\s\S]*?(<\/dcterms:modified>)/,
          `$1${now}$2`
        );
        coreEntry.data = textEncoder.encode(coreXml);
      }

      return buildZip(entries);
    }
