const HEX_HASH_LENGTH = 64;

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function checkPassword(candidate: string): Promise<boolean> {
  if (candidate.length === 0) {
    throw new Error('checkPassword: candidate must not be empty');
  }

  const expectedHash: unknown = import.meta.env['VITE_PRERELEASE_PASSWORD_HASH'];

  if (typeof expectedHash !== 'string' || expectedHash.length !== HEX_HASH_LENGTH) {
    throw new Error(
      `checkPassword: VITE_PRERELEASE_PASSWORD_HASH must be a 64-character hex string, got ${typeof expectedHash === 'string' ? `string of length ${expectedHash.length}` : typeof expectedHash}`,
    );
  }

  const encoded = new TextEncoder().encode(candidate);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashHex = bufferToHex(hashBuffer);

  return hashHex === expectedHash;
}
