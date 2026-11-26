const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

test('upload, listagem e download respeitam os contratos e o dono', async (context) => {
  const storageDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-test-'));
  process.env.STORAGE_DIR = storageDirectory;
  process.env.MAX_FILE_SIZE_MB = '0.00001';
  const app = require('../src/app');
  const fileRepository = require('../src/repositories/fileRepository');
  const server = app.listen(0);
  context.after(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await fs.rm(storageDirectory, { recursive: true, force: true });
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  assert.throws(() => fileRepository.getPath('../outside'), /Nome de arquivo armazenado inválido/);

  const missing = await fetch(`${baseUrl}/upload`, { method: 'POST', body: new FormData() });
  assert.equal(missing.status, 400);
  assert.equal((await missing.json()).error.code, 'MISSING_FILE');

  const invalid = await fetch(`${baseUrl}/upload`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
  });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error.code, 'INVALID_REQUEST');

  const oversizedForm = new FormData();
  oversizedForm.append('file', new Blob(['arquivo muito grande']), 'grande.txt');
  const oversized = await fetch(`${baseUrl}/upload`, { method: 'POST', body: oversizedForm });
  assert.equal(oversized.status, 413);
  assert.equal((await oversized.json()).error.code, 'FILE_TOO_LARGE');
  assert.deepEqual(await fs.readdir(storageDirectory), []);

  const form = new FormData();
  form.append('file', new Blob(['conteúdo'], { type: 'text/plain' }), 'teste.txt');
  const uploaded = await fetch(`${baseUrl}/upload`, { method: 'POST', headers: { 'X-User-Id': 'usuario-1' }, body: form });
  assert.equal(uploaded.status, 201);
  const document = await uploaded.json();
  assert.match(document.id, /^[0-9a-f-]{36}$/);
  assert.equal(document.originalName, 'teste.txt');
  assert.equal(document.mimeType, 'text/plain');
  assert.equal(document.size, Buffer.byteLength('conteúdo'));
  assert.equal(document.owner, 'usuario-1');
  assert.ok(!('storedName' in document));
  const storedFiles = await fs.readdir(storageDirectory);
  assert.equal(storedFiles.length, 1);
  assert.match(storedFiles[0], /^[0-9a-f-]{36}$/);

  const list = await fetch(`${baseUrl}/documents`, { headers: { 'X-User-Id': 'usuario-1' } });
  assert.deepEqual(await list.json(), [document]);
  const otherList = await fetch(`${baseUrl}/documents`, { headers: { 'X-User-Id': 'usuario-2' } });
  assert.deepEqual(await otherList.json(), []);
  const anonymousList = await fetch(`${baseUrl}/documents`);
  assert.deepEqual(await anonymousList.json(), []);

  const downloadUrl = `${baseUrl}/documents/${document.id}/download`;
  const forbidden = await fetch(downloadUrl, { headers: { 'X-User-Id': 'usuario-2' } });
  assert.equal(forbidden.status, 404);
  assert.equal((await forbidden.json()).error.code, 'DOCUMENT_NOT_FOUND');
  const nonexistent = await fetch(`${baseUrl}/documents/inexistente/download`);
  assert.equal(nonexistent.status, 404);
  assert.equal((await nonexistent.json()).error.code, 'DOCUMENT_NOT_FOUND');

  const download = await fetch(downloadUrl, { headers: { 'X-User-Id': 'usuario-1' } });
  assert.equal(download.status, 200);
  assert.equal(download.headers.get('content-type'), 'text/plain');
  assert.match(download.headers.get('content-disposition'), /attachment; filename="teste.txt"/);
  assert.equal(await download.text(), 'conteúdo');

  await fs.unlink(path.join(storageDirectory, storedFiles[0]));
  const missingFile = await fetch(downloadUrl, { headers: { 'X-User-Id': 'usuario-1' } });
  assert.equal(missingFile.status, 404);
  assert.equal((await missingFile.json()).error.code, 'FILE_NOT_FOUND');

  const anonymousForm = new FormData();
  anonymousForm.append('file', new Blob(['ok']), 'ação.txt');
  const anonymousUpload = await fetch(`${baseUrl}/upload`, { method: 'POST', body: anonymousForm });
  assert.equal(anonymousUpload.status, 201);
  const anonymousDocument = await anonymousUpload.json();
  assert.equal(anonymousDocument.owner, 'anonymous');
  assert.equal(anonymousDocument.originalName, 'ação.txt');
  const anonymousDocuments = await fetch(`${baseUrl}/documents`);
  assert.deepEqual(await anonymousDocuments.json(), [anonymousDocument]);
});