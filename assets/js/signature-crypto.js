"use strict";

(function () {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const RELAY_BASE = "https://ntfy.sh";

  function bytesToBase64Url(bytes) {
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
  }

  function base64UrlToBytes(value) {
    const normalized = String(value || "").replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function randomBytes(length) {
    return crypto.getRandomValues(new Uint8Array(length));
  }

  function randomToken(length = 18) {
    return bytesToBase64Url(randomBytes(length));
  }

  function createSession() {
    return {
      topic: `kbkb-sign-${randomToken(18)}`,
      key: bytesToBase64Url(randomBytes(32)),
      createdAt: Date.now()
    };
  }

  function parseSessionFragment(hash = location.hash) {
    const params = new URLSearchParams(String(hash || "").replace(/^#/, ""));
    const topic = params.get("t") || "";
    const key = params.get("k") || "";
    if (!/^kbkb-sign-[-_A-Za-z0-9]{20,64}$/.test(topic)) return null;
    try {
      if (base64UrlToBytes(key).length !== 32) return null;
    } catch {
      return null;
    }
    return {
      topic,
      key,
      minor: params.get("m") === "1",
      version: params.get("v") || "1"
    };
  }

  function buildMobileUrl(session, minor) {
    const url = new URL("sign.html", location.href);
    url.search = "";
    url.hash = new URLSearchParams({
      v: "1",
      t: session.topic,
      k: session.key,
      m: minor ? "1" : "0"
    }).toString();
    return url.toString();
  }

  async function compress(bytes) {
    if (!("CompressionStream" in window)) return { compressed: false, bytes };
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
    return { compressed: true, bytes: new Uint8Array(await new Response(stream).arrayBuffer()) };
  }

  async function decompress(bytes, compressed) {
    if (!compressed) return bytes;
    if (!("DecompressionStream" in window)) {
      throw new Error("Dit toestel kan de gecomprimeerde ondertekening niet verwerken.");
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function importKey(encodedKey) {
    return crypto.subtle.importKey(
      "raw",
      base64UrlToBytes(encodedKey),
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function encryptPayload(payload, encodedKey, topic) {
    const json = encoder.encode(JSON.stringify(payload));
    const packed = await compress(json);
    const data = new Uint8Array(packed.bytes.length + 1);
    data[0] = packed.compressed ? 1 : 0;
    data.set(packed.bytes, 1);
    const iv = randomBytes(12);
    const key = await importKey(encodedKey);
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: encoder.encode(topic) },
      key,
      data
    );
    return `1.${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(ciphertext))}`;
  }

  async function decryptPayload(packet, encodedKey, topic) {
    const parts = String(packet || "").split(".");
    if (parts.length !== 3 || parts[0] !== "1") throw new Error("Onbekend ondertekeningsformaat.");
    const key = await importKey(encodedKey);
    const plaintext = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: base64UrlToBytes(parts[1]),
        additionalData: encoder.encode(topic)
      },
      key,
      base64UrlToBytes(parts[2])
    );
    const packed = new Uint8Array(plaintext);
    const jsonBytes = await decompress(packed.subarray(1), packed[0] === 1);
    return JSON.parse(decoder.decode(jsonBytes));
  }

  function splitPacket(packet, maximumChunkLength = 2700) {
    const transferId = randomToken(8);
    const chunks = [];
    const total = Math.ceil(packet.length / maximumChunkLength);
    for (let index = 0; index < total; index++) {
      const data = packet.slice(index * maximumChunkLength, (index + 1) * maximumChunkLength);
      chunks.push(`KBKB1|${transferId}|${index + 1}|${total}|${data}`);
    }
    return chunks;
  }

  function parseChunk(message) {
    const match = /^KBKB1\|([-_A-Za-z0-9]+)\|(\d+)\|(\d+)\|([\s\S]+)$/.exec(String(message || ""));
    if (!match) return null;
    const index = Number(match[2]);
    const total = Number(match[3]);
    if (!Number.isInteger(index) || !Number.isInteger(total) || index < 1 || total < 1 || index > total || total > 60) {
      return null;
    }
    return { transferId: match[1], index, total, data: match[4] };
  }

  function createCollector(onComplete) {
    const transfers = new Map();
    return message => {
      const chunk = parseChunk(message);
      if (!chunk) return;
      let transfer = transfers.get(chunk.transferId);
      if (!transfer) {
        transfer = { total: chunk.total, chunks: new Array(chunk.total), createdAt: Date.now() };
        transfers.set(chunk.transferId, transfer);
      }
      if (transfer.total !== chunk.total) return;
      transfer.chunks[chunk.index - 1] = chunk.data;
      if (transfer.chunks.every(Boolean)) {
        transfers.delete(chunk.transferId);
        onComplete(transfer.chunks.join(""));
      }
      for (const [id, candidate] of transfers) {
        if (Date.now() - candidate.createdAt > 10 * 60 * 1000) transfers.delete(id);
      }
    };
  }

  async function publishPacket(topic, packet, onProgress) {
    const chunks = splitPacket(packet);
    for (let index = 0; index < chunks.length; index++) {
      const response = await fetch(`${RELAY_BASE}/${encodeURIComponent(topic)}`, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=UTF-8",
          "Cache": "no",
          "Firebase": "no"
        },
        body: chunks[index],
        cache: "no-store",
        mode: "cors"
      });
      if (!response.ok) throw new Error(`Verzenden mislukt (${response.status}).`);
      if (typeof onProgress === "function") onProgress(index + 1, chunks.length);
    }
  }

  function subscribe(topic, onMessage, onState) {
    const source = new EventSource(`${RELAY_BASE}/${encodeURIComponent(topic)}/sse`);
    source.addEventListener("open", () => onState?.("open"));
    source.addEventListener("error", () => onState?.("error"));
    source.onmessage = event => {
      try {
        const envelope = JSON.parse(event.data);
        if (envelope.event === "message" && typeof envelope.message === "string") {
          onMessage(envelope.message);
        }
      } catch {
        // Ignore malformed relay messages on the random topic.
      }
    };
    return source;
  }

  window.KBKBSignatureCrypto = {
    createSession,
    parseSessionFragment,
    buildMobileUrl,
    encryptPayload,
    decryptPayload,
    publishPacket,
    subscribe,
    createCollector
  };
})();
