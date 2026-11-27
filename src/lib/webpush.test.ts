import { describe, expect, it } from "vitest";
import { b64url, encryptPayload, fromB64url, generateVapidKeys, vapidJwt } from "./webpush";

const enc = new TextEncoder();

async function hmac(key: Uint8Array, data: Uint8Array) {
  const k = await crypto.subtle.importKey("raw", key as BufferSource, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data as BufferSource));
}
const cat = (...p: Uint8Array[]) => {
  const o = new Uint8Array(p.reduce((n, x) => n + x.length, 0));
  let i = 0;
  for (const x of p) {
    o.set(x, i);
    i += x.length;
  }
  return o;
};

/** Descifra como lo hace el navegador (RFC 8291), para comprobar el cifrado. */
async function browserDecrypt(body: Uint8Array, uaKeys: CryptoKeyPair, authSecret: Uint8Array) {
  const salt = body.slice(0, 16);
  const idlen = body[20];
  const asPublic = body.slice(21, 21 + idlen);
  const cipher = body.slice(21 + idlen);
  const uaPublic = new Uint8Array(await crypto.subtle.exportKey("raw", uaKeys.publicKey));
  const asKey = await crypto.subtle.importKey("raw", asPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: asKey }, uaKeys.privateKey, 256));
  const prkKey = await hmac(authSecret, ecdh);
  const ikm = await hmac(prkKey, cat(enc.encode("WebPush: info\0"), uaPublic, asPublic, new Uint8Array([1])));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, cat(enc.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, cat(enc.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);
  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]);
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, aes, cipher));
  expect(plain[plain.length - 1]).toBe(2);
  return new TextDecoder().decode(plain.slice(0, -1));
}

describe("webpush", () => {
  it("base64url ida y vuelta", () => {
    const u = new Uint8Array([0, 250, 251, 252, 253, 254, 255, 1]);
    expect(Array.from(fromB64url(b64url(u)))).toEqual(Array.from(u));
  });

  it("el celular puede descifrar el mensaje", async () => {
    const ua = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
    const auth = crypto.getRandomValues(new Uint8Array(16));
    const target = {
      endpoint: "https://push.example.com/x",
      p256dh: b64url(await crypto.subtle.exportKey("raw", ua.publicKey)),
      auth: b64url(auth),
    };
    const msg = JSON.stringify({ title: "Hoy tenés sesión", body: "Tren inferior · 60 min", url: "/app" });
    const body = await encryptPayload(target, enc.encode(msg));
    expect(await browserDecrypt(body, ua, auth)).toBe(msg);
  });

  it("firma VAPID válida con la clave pública", async () => {
    const keys = await generateVapidKeys();
    expect(fromB64url(keys.publicKey).length).toBe(65);
    const jwt = await vapidJwt("https://fcm.googleapis.com/fcm/send/abc", keys, "https://app.example.com", 1_000_000_000_000);
    const [h, c, s] = jwt.split(".");
    expect(JSON.parse(new TextDecoder().decode(fromB64url(c)))).toMatchObject({ aud: "https://fcm.googleapis.com", sub: "https://app.example.com" });
    const pub = await crypto.subtle.importKey("raw", fromB64url(keys.publicKey), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pub, fromB64url(s), enc.encode(`${h}.${c}`));
    expect(ok).toBe(true);
  });
});
