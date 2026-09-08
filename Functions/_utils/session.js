// Signs and verifies compact session tokens without needing a server-side session
// store. The token is base64url(payload) + "." + base64url(HMAC-SHA256 signature).
// Anyone can read the payload (it's just base64, not encryption) but nobody can
// forge or modify it without knowing SESSION_SECRET, since the signature check
// would fail.

function base64urlEncode(bytes) {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signSession(payloadObj, secret) {
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payloadObj));
  const payload = base64urlEncode(payloadBytes);
  const key = await hmacKey(secret);
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const sig = base64urlEncode(new Uint8Array(sigBuf));
  return `${payload}.${sig}`;
}

export async function verifySession(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;

  const key = await hmacKey(secret);
  const expectedSigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const expectedSig = base64urlEncode(new Uint8Array(expectedSigBuf));

  if (!timingSafeEqual(expectedSig, sig)) return null;

  try {
    const json = new TextDecoder().decode(base64urlDecode(payload));
    return JSON.parse(json);
  } catch {
    return null;
  }
}
