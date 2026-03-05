function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const hexParts: string[] = [];
  for (const byte of bytes) {
    hexParts.push(byte.toString(16).padStart(2, '0'));
  }
  return hexParts.join('');
}

export async function sha256Browser(content: string): Promise<string> {
  const encoded = new TextEncoder().encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return bufferToHex(hashBuffer);
}
