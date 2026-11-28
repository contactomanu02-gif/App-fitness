import { createServer, type Server } from "node:http";
import { admin } from "../../tests/db/helpers";
import { b64url } from "../../src/lib/webpush";

// Un "celular" falso: recibe los avisos como lo haría el servicio de Google o Apple y los descifra.

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

export type Phone = { keys: CryptoKeyPair; auth: Uint8Array; p256dh: string; received: { title: string; body: string; url: string; tag?: string }[]; authHeaders: string[] };

async function newPhone(): Promise<Phone> {
  const keys = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  const auth = crypto.getRandomValues(new Uint8Array(16));
  return { keys, auth, p256dh: b64url(await crypto.subtle.exportKey("raw", keys.publicKey)), received: [], authHeaders: [] };
}

async function decrypt(phone: Phone, body: Uint8Array) {
  const salt = body.slice(0, 16);
  const idlen = body[20];
  const asPublic = body.slice(21, 21 + idlen);
  const uaPublic = new Uint8Array(await crypto.subtle.exportKey("raw", phone.keys.publicKey));
  const asKey = await crypto.subtle.importKey("raw", asPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: asKey }, phone.keys.privateKey, 256));
  const ikm = await hmac(await hmac(phone.auth, ecdh), cat(enc.encode("WebPush: info\0"), uaPublic, asPublic, new Uint8Array([1])));
  const prk = await hmac(salt, ikm);
  const cek = (await hmac(prk, cat(enc.encode("Content-Encoding: aes128gcm\0"), new Uint8Array([1])))).slice(0, 16);
  const nonce = (await hmac(prk, cat(enc.encode("Content-Encoding: nonce\0"), new Uint8Array([1])))).slice(0, 12);
  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]);
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, aes, body.slice(21 + idlen)));
  return JSON.parse(new TextDecoder().decode(plain.slice(0, -1)));
}

/** Levanta los celulares falsos en ese puerto. */
export function fakePhones(port: number) {
  let server: Server;
  const phones = new Map<string, Phone>();
  return {
    port,
    async start() {
      server = createServer((req, res) => {
        const chunks: Buffer[] = [];
        req.on("data", (c) => chunks.push(c));
        req.on("end", async () => {
          const phone = phones.get(req.url!.slice(1));
          if (!phone) return res.writeHead(410).end();
          phone.authHeaders.push(String(req.headers.authorization));
          phone.received.push(await decrypt(phone, new Uint8Array(Buffer.concat(chunks))));
          res.writeHead(201).end();
        });
      });
      await new Promise<void>((r) => server.listen(port, r));
    },
    stop: () => new Promise<void>((r) => server.close(() => r())),
    /** Registra un celular para ese usuario, como si hubiera tocado "Activar avisos". */
    async subscribe(userId: string, name: string) {
      const phone = await newPhone();
      const id = `${name}-${Math.random().toString(36).slice(2, 8)}`;
      phones.set(id, phone);
      await admin.from("push_subscriptions").insert({ user_id: userId, endpoint: `http://localhost:${port}/${id}`, p256dh: phone.p256dh, auth: b64url(phone.auth) });
      return phone;
    },
  };
}
