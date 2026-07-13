"use strict";

(function () {
  function parseSessionFragment(hash = location.hash) {
    const params = new URLSearchParams(String(hash || "").replace(/^#/, ""));
    const topic = params.get("t") || "";
    if (!/^kbkb-sign-[a-f0-9]{48}$/.test(topic)) return null;
    return {
      topic,
      minor: params.get("m") === "1",
      version: params.get("v") || "1"
    };
  }

  async function createSession(minor) {
    const response = await fetch("/api/signature/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ minor: Boolean(minor) })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "De mobiele ondertekeningssessie kon niet worden gestart.");
    }
    return payload;
  }

  async function publishPayload(topic, payload) {
    const response = await fetch(`/api/signature/${encodeURIComponent(topic)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "De ondertekening kon niet worden verzonden.");
    return result;
  }

  function subscribe(topic, onMessage, onState) {
    let active = true;
    let timer = null;
    let busy = false;

    async function poll() {
      if (!active || busy) return;
      busy = true;
      try {
        const response = await fetch(`/api/signature/${encodeURIComponent(topic)}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-store" }
        });
        const payload = await response.json().catch(() => ({}));
        if (response.status === 200 && payload.ready) {
          onState?.("received");
          onMessage(payload.payload);
          active = false;
          return;
        }
        if (response.status === 404 || response.status === 410) {
          onState?.("expired");
          active = false;
          return;
        }
        onState?.("waiting");
      } catch {
        onState?.("error");
      } finally {
        busy = false;
      }
      if (active) timer = window.setTimeout(poll, 1000);
    }

    poll();
    return {
      close() {
        active = false;
        if (timer) window.clearTimeout(timer);
      }
    };
  }

  async function deleteSession(topic) {
    try {
      await fetch(`/api/signature/${encodeURIComponent(topic)}`, {
        method: "DELETE",
        cache: "no-store"
      });
    } catch {
      // Session expiry is automatic; cleanup failure is non-critical.
    }
  }

  window.KBKBSignatureLink = {
    parseSessionFragment,
    createSession,
    publishPayload,
    subscribe,
    deleteSession
  };
})();
