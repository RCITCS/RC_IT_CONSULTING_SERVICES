const encoder = new TextEncoder();
const BOOTSTRAP_SCHEME = "pbkdf2-sha256";
const BOOTSTRAP_ITERATIONS = 600_000;

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

export async function shaHex(value) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyBootstrapPassword(password, verifier) {
  try {
    const [scheme, iterationsText, saltText, expectedText] = verifier.split(":");
    const iterations = Number(iterationsText);
    const salt = fromBase64Url(saltText);
    const expected = fromBase64Url(expectedText);

    if (
      scheme !== BOOTSTRAP_SCHEME
      || iterations !== BOOTSTRAP_ITERATIONS
      || salt.length < 16
      || expected.length !== 32
    ) {
      return false;
    }

    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    const actual = new Uint8Array(await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        salt,
        iterations
      },
      key,
      expected.length * 8
    ));
    return constantTimeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function randomToken() {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}
