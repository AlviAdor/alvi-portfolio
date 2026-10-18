"use client";

import { site } from "./site";

/*
 * End-to-end encrypted contact channel into the Secure Auth Demo's
 * zero-knowledge inbox. A typed port of the original portfolio's
 * `SecureCrypto.encryptForRecipient` and its popup bridge.
 *
 * Crypto: a fresh AES-256-GCM key encrypts the message in the browser, and that
 * key is wrapped with the inbox owner's RSA-OAEP-2048/SHA-256 public key. Only
 * ciphertext, IV and wrapped key are sent. The server cannot decrypt them.
 *
 * Transport: the backend sits on free PHP hosting behind an anti-bot edge
 * layer that blocks cross-origin fetch(). The backend's `bridge.php` is opened
 * as a small popup (a top-level navigation, so the edge challenge can pass) and
 * relays two request types over postMessage: `admin_public_key` and
 * `contact_submit`. It only answers the single origin configured in
 * SAD_ALLOWED_ORIGIN on the backend, so that must be set to this site's origin.
 */

const RSA_PARAMS: RsaHashedImportParams = { name: "RSA-OAEP", hash: "SHA-256" };
const READY_TIMEOUT_MS = 12_000;
const REQUEST_TIMEOUT_MS = 10_000;

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  wrappedKey: string;
}

interface BridgeResult {
  ok: boolean;
  error?: string;
  publicKey?: string;
}

const b64encode = (buf: ArrayBuffer | Uint8Array): string => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
};

const b64decode = (b64: string): ArrayBuffer => {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
};

/** Hybrid RSA-OAEP + AES-256-GCM encryption, byte-compatible with the PHP inbox. */
export async function encryptForRecipient(plaintext: string, recipientPublicKeyB64: string): Promise<EncryptedPayload> {
  const recipientKey = await crypto.subtle.importKey("spki", b64decode(recipientPublicKeyB64), RSA_PARAMS, false, ["encrypt"]);
  const aesKeyRaw = crypto.getRandomValues(new Uint8Array(32));
  const aesKey = await crypto.subtle.importKey("raw", aesKeyRaw, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, new TextEncoder().encode(plaintext));
  const wrappedKey = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, recipientKey, aesKeyRaw);
  aesKeyRaw.fill(0);
  return { ciphertext: b64encode(ciphertext), iv: b64encode(iv), wrappedKey: b64encode(wrappedKey) };
}

export const secureChannelEnabled = (): boolean =>
  site.secureMessagingBase !== "" && typeof window !== "undefined" && typeof window.crypto?.subtle !== "undefined";

/**
 * One bridge session per submission. `open()` MUST be called synchronously
 * inside the submit/click handler: popup blockers judge the moment of user
 * activation, not whether the surrounding code later awaits.
 */
export class SecureBridge {
  private readonly base = site.secureMessagingBase;
  private readonly origin = new URL(site.secureMessagingBase).origin;
  private ready: Promise<Window | null> | null = null;
  private seq = 0;

  open(): void {
    if (this.ready) return;
    const popup = window.open(`${this.base}bridge.php`, "secure_auth_bridge", "width=80,height=80,left=0,top=0");
    if (!popup) {
      this.ready = Promise.resolve(null);
      return;
    }
    this.ready = new Promise((resolve) => {
      const onReady = (event: MessageEvent) => {
        if (event.origin !== this.origin || !(event.data as { bridgeReady?: boolean } | null)?.bridgeReady) return;
        window.removeEventListener("message", onReady);
        window.clearTimeout(timer);
        resolve(popup);
      };
      // first visit may need a few seconds to pass the host's bot challenge
      const timer = window.setTimeout(() => {
        window.removeEventListener("message", onReady);
        resolve(popup.closed ? null : popup);
      }, READY_TIMEOUT_MS);
      window.addEventListener("message", onReady);
    });
  }

  private async request(type: "admin_public_key" | "contact_submit", payload?: Record<string, string>): Promise<BridgeResult> {
    const popup = await (this.ready ?? Promise.resolve(null));
    if (!popup || popup.closed) return { ok: false, error: "Secure bridge window was blocked or closed." };
    const requestId = `req_${++this.seq}_${Date.now()}`;
    return new Promise((resolve) => {
      const onMessage = (event: MessageEvent) => {
        const data = event.data as { requestId?: string; result?: BridgeResult } | null;
        if (event.origin !== this.origin || data?.requestId !== requestId) return;
        window.clearTimeout(timer);
        window.removeEventListener("message", onMessage);
        resolve(data.result ?? { ok: false, error: "Empty bridge response." });
      };
      const timer = window.setTimeout(() => {
        window.removeEventListener("message", onMessage);
        resolve({ ok: false, error: "Secure bridge timed out." });
      }, REQUEST_TIMEOUT_MS);
      window.addEventListener("message", onMessage);
      popup.postMessage({ requestId, type, payload }, this.origin);
    });
  }

  /** Encrypts in this browser and submits only ciphertext. Resolves true on delivery. */
  async send(name: string, email: string, message: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const key = await this.request("admin_public_key");
      if (!key.ok || !key.publicKey) return { ok: false, error: key.error ?? "Inbox public key unavailable." };
      const enc = await encryptForRecipient(message, key.publicKey);
      const sent = await this.request("contact_submit", { name, email, ...enc });
      return sent.ok ? { ok: true } : { ok: false, error: sent.error ?? "Encrypted submission rejected." };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Encryption failed." };
    }
  }

  close(): void {
    void this.ready?.then((popup) => {
      if (popup && !popup.closed) popup.close();
    });
    this.ready = null;
  }
}
