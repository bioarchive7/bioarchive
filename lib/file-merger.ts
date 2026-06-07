/**
 * File Merger Utility
 * Zero external dependencies — uses only Node.js built-ins.
 * Creates real ZIP files using the deflate algorithm via Node's zlib.
 */

import { deflateRawSync } from 'zlib';

// ── CRC32 (required by ZIP spec) ─────────────────────────────────────────────
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ── DOS timestamp helper ──────────────────────────────────────────────────────
function dosDateTime(): { time: number; date: number } {
  const d = new Date();
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

/**
 * Merge multiple files into a ZIP archive using Node.js built-ins only.
 */
export async function mergeIntoZip(
  files: { name: string; buffer: Buffer }[]
): Promise<Buffer> {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = Buffer.from(file.name, 'utf8');
    const compressed = deflateRawSync(file.buffer, { level: 9 });
    const checksum = crc32(file.buffer);
    const { time, date } = dosDateTime();

    // ── Local file header (30 bytes + filename) ───────────────────────────
    const local = Buffer.alloc(30 + nameBytes.length);
    local.writeUInt32LE(0x04034b50, 0);       // signature
    local.writeUInt16LE(20, 4);                // version needed
    local.writeUInt16LE(0, 6);                 // flags
    local.writeUInt16LE(8, 8);                 // method: deflate
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(file.buffer.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);                // extra field length
    nameBytes.copy(local, 30);

    // ── Central directory header (46 bytes + filename) ───────────────────
    const central = Buffer.alloc(46 + nameBytes.length);
    central.writeUInt32LE(0x02014b50, 0);      // signature
    central.writeUInt16LE(20, 4);              // version made by
    central.writeUInt16LE(20, 6);              // version needed
    central.writeUInt16LE(0, 8);               // flags
    central.writeUInt16LE(8, 10);              // method: deflate
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(file.buffer.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt16LE(0, 30);              // extra field length
    central.writeUInt16LE(0, 32);              // file comment length
    central.writeUInt16LE(0, 34);              // disk number start
    central.writeUInt16LE(0, 36);              // internal attributes
    central.writeUInt32LE(0, 38);              // external attributes
    central.writeUInt32LE(offset, 42);         // offset of local header
    nameBytes.copy(central, 46);

    localParts.push(local, compressed);
    centralParts.push(central);
    offset += local.length + compressed.length;
  }

  const centralOffset = offset;
  const centralSize = centralParts.reduce((s, b) => s + b.length, 0);

  // ── End of central directory (22 bytes) ──────────────────────────────────
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);           // signature
  eocd.writeUInt16LE(0, 4);                    // disk number
  eocd.writeUInt16LE(0, 6);                    // start disk
  eocd.writeUInt16LE(files.length, 8);         // entries on disk
  eocd.writeUInt16LE(files.length, 10);        // total entries
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  eocd.writeUInt16LE(0, 20);                   // comment length

  return Buffer.concat([...localParts, ...centralParts, eocd]);
}

/**
 * Intelligently merge files based on type.
 * Always produces a valid ZIP for multiple files.
 */
export async function smartMergeFiles(
  files: { name: string; buffer: Buffer; ext: string }[]
): Promise<{ buffer: Buffer; filename: string }> {
  if (files.length === 0) throw new Error('No files to merge');

  if (files.length === 1) {
    return { buffer: files[0].buffer, filename: files[0].name };
  }

  const zip = await mergeIntoZip(files);
  return { buffer: zip, filename: `documents_${Date.now()}.zip` };
}

/**
 * Check if we should attempt to merge files.
 */
export function shouldMergeFiles(fileType: string, fileCount: number): boolean {
  const mergeableTypes = ['qpaper', 'notes', 'slides', 'lab', 'assignment'];
  return mergeableTypes.includes(fileType) && fileCount > 1;
}