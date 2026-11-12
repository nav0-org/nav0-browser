import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { inflateRawSync } from 'zlib';

const MAX_UNCOMPRESSED_BYTES = 512 * 1024 * 1024;

export interface ParsedCrx {
  zip: Buffer;
  publicKey: Buffer;
}

export function extensionIdFromPublicKey(publicKey: Buffer): string {
  const hash = crypto.createHash('sha256').update(publicKey).digest();
  let id = '';
  for (let i = 0; i < 16; i++) {
    id += String.fromCharCode(97 + (hash[i] >> 4)) + String.fromCharCode(97 + (hash[i] & 0x0f));
  }
  return id;
}

interface ProtoField {
  field: number;
  bytes: Buffer;
}

function readVarint(buf: Buffer, pos: number): { value: number; next: number } {
  let value = 0;
  let multiplier = 1;
  for (let i = 0; i < 8; i++) {
    if (pos >= buf.length) throw new Error('Corrupt CRX header.');
    const byte = buf[pos++];
    value += (byte & 0x7f) * multiplier;
    if ((byte & 0x80) === 0) return { value, next: pos };
    multiplier *= 128;
  }
  throw new Error('Corrupt CRX header.');
}

// Returns only length-delimited fields; other wire types are skipped.
function readProtoFields(buf: Buffer): ProtoField[] {
  const fields: ProtoField[] = [];
  let pos = 0;
  while (pos < buf.length) {
    const tag = readVarint(buf, pos);
    pos = tag.next;
    const field = Math.floor(tag.value / 8);
    const wireType = tag.value % 8;
    if (wireType === 0) {
      pos = readVarint(buf, pos).next;
    } else if (wireType === 1) {
      pos += 8;
    } else if (wireType === 5) {
      pos += 4;
    } else if (wireType === 2) {
      const len = readVarint(buf, pos);
      const end = len.next + len.value;
      if (end > buf.length) throw new Error('Corrupt CRX header.');
      fields.push({ field, bytes: buf.subarray(len.next, end) });
      pos = end;
    } else {
      throw new Error('Corrupt CRX header.');
    }
  }
  if (pos !== buf.length) throw new Error('Corrupt CRX header.');
  return fields;
}

// Parses a CRX3 package and returns the ZIP payload plus the developer public key
// whose signature over the package verifies and whose derived ID equals expectedId.
// CrxFileHeader: 2 = sha256_with_rsa, 3 = sha256_with_ecdsa (AsymmetricKeyProof{1: public_key, 2: signature}),
// 10000 = signed_header_data.
export function parseCrx(crx: Buffer, expectedId: string): ParsedCrx {
  if (crx.length < 12 || crx.toString('ascii', 0, 4) !== 'Cr24') {
    throw new Error('Downloaded file is not a valid extension package.');
  }
  const version = crx.readUInt32LE(4);
  if (version !== 3) {
    throw new Error(`Unsupported extension package version (CRX${version}).`);
  }
  const headerLength = crx.readUInt32LE(8);
  const zipStart = 12 + headerLength;
  if (zipStart >= crx.length) {
    throw new Error('Extension package is truncated.');
  }
  const header = crx.subarray(12, zipStart);
  const zip = crx.subarray(zipStart);

  let signedHeaderData = Buffer.alloc(0);
  const proofs: Array<{ algorithm: 'rsa' | 'ecdsa'; publicKey: Buffer; signature: Buffer }> = [];
  for (const f of readProtoFields(header)) {
    if (f.field === 10000) {
      signedHeaderData = f.bytes;
    } else if (f.field === 2 || f.field === 3) {
      let publicKey: Buffer | null = null;
      let signature: Buffer | null = null;
      for (const p of readProtoFields(f.bytes)) {
        if (p.field === 1) publicKey = p.bytes;
        else if (p.field === 2) signature = p.bytes;
      }
      if (publicKey && signature) {
        proofs.push({ algorithm: f.field === 2 ? 'rsa' : 'ecdsa', publicKey, signature });
      }
    }
  }

  const sizeLE = Buffer.alloc(4);
  sizeLE.writeUInt32LE(signedHeaderData.length);
  const signedData = Buffer.concat([Buffer.from('CRX3 SignedData\x00', 'latin1'), sizeLE, signedHeaderData, zip]);

  for (const proof of proofs) {
    if (extensionIdFromPublicKey(proof.publicKey) !== expectedId) continue;
    let valid = false;
    try {
      const key = crypto.createPublicKey({ key: proof.publicKey, format: 'der', type: 'spki' });
      valid = crypto.verify('sha256', signedData, key, proof.signature);
    } catch {
      valid = false;
    }
    if (valid) return { zip, publicKey: proof.publicKey };
  }

  throw new Error('Extension package signature does not match the requested extension ID.');
}

// Adds "key" to manifest.json without reformatting it, since Chromium accepts
// comments and a BOM that JSON.parse/stringify would reject or drop.
export function injectManifestKey(manifestPath: string, key: string): void {
  let text: string;
  try {
    text = fs.readFileSync(manifestPath, 'utf-8');
  } catch {
    throw new Error('Downloaded extension has no manifest.json.');
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  let i = 0;
  while (i < text.length) {
    if (/\s/.test(text[i])) { i++; continue; }
    if (text.startsWith('//', i)) { const nl = text.indexOf('\n', i); i = nl < 0 ? text.length : nl + 1; continue; }
    if (text.startsWith('/*', i)) { const end = text.indexOf('*/', i + 2); i = end < 0 ? text.length : end + 2; continue; }
    break;
  }
  if (text[i] !== '{') throw new Error('Downloaded extension has an invalid manifest.json.');

  fs.writeFileSync(manifestPath, `${text.slice(0, i + 1)}"key":${JSON.stringify(key)},${text.slice(i + 1)}`);
}

// Extracts a ZIP archive by walking its central directory, so entries written with
// data descriptors (general-purpose flag bit 3) get their real sizes.
export function extractZip(zip: Buffer, destDir: string): void {
  const root = path.resolve(destDir);

  let eocd = -1;
  const minPos = Math.max(0, zip.length - 22 - 0xffff);
  for (let i = zip.length - 22; i >= minPos; i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Corrupt extension archive.');

  const entryCount = zip.readUInt16LE(eocd + 10);
  const cdOffset = zip.readUInt32LE(eocd + 16);
  if (entryCount === 0xffff || cdOffset === 0xffffffff) {
    throw new Error('ZIP64 extension archives are not supported.');
  }

  interface Entry { name: string; target: string; method: number; compressedSize: number; size: number; dataStart: number }
  const entries: Entry[] = [];
  let totalSize = 0;
  let pos = cdOffset;
  for (let i = 0; i < entryCount; i++) {
    if (pos + 46 > zip.length || zip.readUInt32LE(pos) !== 0x02014b50) {
      throw new Error('Corrupt extension archive.');
    }
    const flags = zip.readUInt16LE(pos + 8);
    const method = zip.readUInt16LE(pos + 10);
    const compressedSize = zip.readUInt32LE(pos + 20);
    const size = zip.readUInt32LE(pos + 24);
    const nameLength = zip.readUInt16LE(pos + 28);
    const extraLength = zip.readUInt16LE(pos + 30);
    const commentLength = zip.readUInt16LE(pos + 32);
    const localOffset = zip.readUInt32LE(pos + 42);
    if (pos + 46 + nameLength > zip.length) throw new Error('Corrupt extension archive.');
    const name = zip.toString(flags & 0x0800 ? 'utf8' : 'latin1', pos + 46, pos + 46 + nameLength);
    pos += 46 + nameLength + extraLength + commentLength;

    if (flags & 0x0001) throw new Error('Encrypted extension archives are not supported.');
    if (localOffset + 30 > zip.length || zip.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error('Corrupt extension archive.');
    }
    const dataStart = localOffset + 30 + zip.readUInt16LE(localOffset + 26) + zip.readUInt16LE(localOffset + 28);
    if (dataStart + compressedSize > zip.length) throw new Error('Corrupt extension archive.');

    const target = path.resolve(root, name.replace(/\\/g, '/'));
    if (target !== root && !target.startsWith(root + path.sep)) {
      throw new Error(`Extension archive contains an unsafe path: ${name}`);
    }
    if (method !== 0 && method !== 8) {
      throw new Error(`Unsupported compression method ${method} in extension archive.`);
    }

    totalSize += size;
    if (totalSize > MAX_UNCOMPRESSED_BYTES) throw new Error('Extension archive is too large.');
    entries.push({ name, target, method, compressedSize, size, dataStart });
  }

  for (const entry of entries) {
    if (entry.target === root) continue;
    if (entry.name.endsWith('/') || entry.name.endsWith('\\')) {
      fs.mkdirSync(entry.target, { recursive: true });
      continue;
    }

    const raw = zip.subarray(entry.dataStart, entry.dataStart + entry.compressedSize);
    let data: Buffer;
    if (entry.method === 0) {
      data = raw;
    } else {
      try {
        data = entry.size === 0 ? Buffer.alloc(0) : inflateRawSync(raw, { maxOutputLength: entry.size });
      } catch {
        throw new Error('Corrupt extension archive.');
      }
    }
    if (data.length !== entry.size) throw new Error('Corrupt extension archive.');

    fs.mkdirSync(path.dirname(entry.target), { recursive: true });
    fs.writeFileSync(entry.target, data);
  }
}
