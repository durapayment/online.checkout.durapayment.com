// helpers/verifyTokens.ts

const HMAC_SECRET = "";

if (!HMAC_SECRET) {
  throw new Error("CHECKOUT_HMAC_SECRET not set");
}

function base64urlEncode(input: string | Uint8Array): string {
  const buffer: any =
    typeof input === "string" ? new TextEncoder().encode(input) : input;
  let base64 = btoa(String.fromCharCode(...buffer));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(input: string): string {
  let base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  // Add padding if missing
  while (base64.length % 4 !== 0) {
    base64 += "=";
  }
  const binary = atob(base64);
  return binary;
}

export async function verifyCheckoutToken(
  token: string | null,
): Promise<{ ref: string; dent: string; expires: number } | null> {
  if (!token) return null;

  // Step 1: Decode outer base64url → get "payload.hmacBase64"
  let decodedFull: string;
  try {
    decodedFull = base64urlDecode(token);
  } catch (err) {
    console.warn("Outer base64url decode failed:", err);
    return null;
  }

  // Step 2: Split into payload + received HMAC (base64url)
  const dotIndex = decodedFull.lastIndexOf(".");
  if (dotIndex === -1) {
    console.warn("No '.' separator found");
    return null;
  }

  const payload = decodedFull.substring(0, dotIndex);
  const receivedHmacB64 = decodedFull.substring(dotIndex + 1);

  // Step 3: Recompute inner HMAC (exactly like Laravel)
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(HMAC_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"], // we need sign to compute the expected MAC
  );

  const computedSig = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );

  const computedHmacB64 = base64urlEncode(new Uint8Array(computedSig));

  // Step 4: Constant-time comparison
  if (computedHmacB64 !== receivedHmacB64) {
    console.warn("HMAC mismatch");
    console.log("Computed:", computedHmacB64);
    console.log("Received:", receivedHmacB64);
    return null;
  }

  // Step 5: Parse payload
  const parts = payload.split("|");
  if (parts.length !== 3) {
    console.warn("Payload has wrong number of parts");
    return null;
  }

  const [ref, dent, expiresStr] = parts;
  const expires = Number(expiresStr);

  if (!ref || !dent || isNaN(expires) || Date.now() / 1000 > expires) {
    console.warn("Invalid payload or expired");
    return null;
  }

  return { ref, dent, expires };
}
