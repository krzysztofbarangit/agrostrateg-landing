#!/usr/bin/env node
// AGROSTRATEG hub — encrypting builder (staticrypt-style, WebCrypto-compatible).
//
// Reads the plaintext content (src/content.html), encrypts it with AES-256-GCM
// using a PBKDF2-SHA256 derived key, and injects the encrypted blob into the
// public shell (src/shell.html) -> writes ./index.html.
//
// The password is NEVER written to disk or repo. Only the encrypted blob ships.
//
// Usage (PowerShell):
//   $env:HUB_PW='ekowokiele!'; node build.mjs
// or:
//   node build.mjs "ekowokiele!"
//
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import crypto from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, 'src');

const ITER = 300000;               // PBKDF2 iterations (must match shell decrypt)
const password = process.argv[2] || process.env.HUB_PW;

if (!password) {
  console.error('\n  Brak hasła. Podaj: node build.mjs "ekowokiele!"  albo  $env:HUB_PW=...\n');
  process.exit(1);
}

const shell = readFileSync(join(SRC, 'shell.html'), 'utf8');
const fonts = readFileSync(join(SRC, 'fonts.css'), 'utf8');
const content = readFileSync(join(SRC, 'content.html'), 'utf8');

// derive key + encrypt
const salt = crypto.randomBytes(16);
const iv = crypto.randomBytes(12);
const key = crypto.pbkdf2Sync(Buffer.from(password, 'utf8'), salt, ITER, 32, 'sha256');
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const ctBody = Buffer.concat([cipher.update(Buffer.from(content, 'utf8')), cipher.final()]);
const tag = cipher.getAuthTag();
const ct = Buffer.concat([ctBody, tag]); // WebCrypto AES-GCM expects ciphertext||tag

const payload = JSON.stringify({
  v: 1,
  iter: ITER,
  salt: salt.toString('base64'),
  iv: iv.toString('base64'),
  ct: ct.toString('base64'),
});

// assemble public file
let out = shell
  .replace('/*__FONTS__*/', () => fonts)
  .replace('__PAYLOAD_JSON__', () => payload);

if (out.includes('__PAYLOAD_JSON__') || out.includes('/*__FONTS__*/')) {
  console.error('  Nie podmieniono wszystkich placeholderów — sprawdź shell.html');
  process.exit(1);
}

const outPath = join(__dirname, 'index.html');
writeFileSync(outPath, out, 'utf8');

const kb = (n) => (n / 1024).toFixed(1) + ' KB';
console.log('\n  ✓ hub/index.html zbudowany (zaszyfrowany)');
console.log('    content (plaintext):', kb(Buffer.byteLength(content)));
console.log('    ciphertext:          ', kb(ct.length));
console.log('    fonts inlined:       ', kb(Buffer.byteLength(fonts)));
console.log('    output total:        ', kb(Buffer.byteLength(out)));
console.log('    PBKDF2 iterations:   ', ITER);
console.log('    hasło: NIE zapisane w pliku ani repo ✓\n');
