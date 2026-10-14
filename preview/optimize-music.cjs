/* Remove leading ID3 artwork/tags without re-encoding or changing MPEG audio. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const music = path.join(root, 'assets/music');
const backup = path.join(root, '.game-work/music-originals-20261010');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
fs.mkdirSync(backup, {recursive: true});
const songs = [];
for (const name of fs.readdirSync(music).filter(name => name.endsWith('.mp3')).sort()) {
  const target = path.join(music, name);
  const originalPath = path.join(backup, name);
  if (!fs.existsSync(originalPath)) fs.copyFileSync(target, originalPath, fs.constants.COPYFILE_EXCL);
  const original = fs.readFileSync(originalPath);
  let offset = 0;
  if (original.toString('ascii', 0, 3) === 'ID3') {
    assert([3, 4].includes(original[3]), `Unsupported ID3 version: ${name}`);
    assert(original.subarray(6, 10).every(byte => byte < 128), `Invalid ID3 size: ${name}`);
    offset = 10 + ((original[6] << 21) | (original[7] << 14) | (original[8] << 7) | original[9]);
    if (original[3] === 4 && (original[5] & 0x10)) offset += 10;
  }
  assert(offset < original.length && original[offset] === 0xff && (original[offset + 1] & 0xe0) === 0xe0, `Missing MPEG frame: ${name}`);
  const audio = original.subarray(offset);
  const current = fs.readFileSync(target);
  assert(current.equals(original) || current.equals(audio), `File changed since backup: ${name}`);
  if (!current.equals(audio)) fs.writeFileSync(target, audio);
  assert(fs.readFileSync(target).equals(audio), `Audio payload differs: ${name}`);
  songs.push({name, originalBytes: original.length, optimizedBytes: audio.length, removedTagBytes: offset, originalSha256: sha(original), audioSha256: sha(audio)});
}
const report = {method: 'ID3 removal; MPEG audio bytes unchanged', backup: '.game-work/music-originals-20261010', songs, removedBytes: songs.reduce((total, song) => total + song.removedTagBytes, 0)};
fs.writeFileSync(path.join(__dirname, 'music-optimization.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`Optimized ${songs.length} tracks losslessly; removed ${report.removedBytes} bytes of leading tags. Originals retained in ${report.backup}.`);
