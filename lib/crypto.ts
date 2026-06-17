import crypto from "node:crypto";
import { aiKeySecret } from "@/lib/env";

/**
 * Symmetric encryption for secrets at rest (BYOK provider API keys).
 * AES-256-GCM with a key derived from AI_KEY_SECRET. Ciphertext format:
 *   base64(iv) : base64(authTag) : base64(ciphertext)
 */

function keyBuffer(): Buffer | null {
  if (!aiKeySecret) return null;
  return crypto.createHash("sha256").update(aiKeySecret).digest(); // 32 bytes
}

export function isEncryptionConfigured(): boolean {
  return Boolean(aiKeySecret);
}

export function encryptSecret(plain: string): string | null {
  const key = keyBuffer();
  if (!key) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

export function decryptSecret(payload: string | null | undefined): string | null {
  const key = keyBuffer();
  if (!key || !payload) return null;
  try {
    const [ivB64, tagB64, dataB64] = payload.split(":");
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivB64, "base64"));
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
