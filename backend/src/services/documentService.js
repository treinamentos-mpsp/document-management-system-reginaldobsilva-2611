const { randomUUID } = require('node:crypto');
const documentRepository = require('../repositories/documentRepository');
const fileRepository = require('../repositories/fileRepository');

function publicDocument(document) {
  const { storedName, ...metadata } = document;
  return metadata;
}

function create(file, owner) {
  const document = documentRepository.save({
    id: randomUUID(),
    originalName: file.originalName,
    storedName: file.storedName,
    mimeType: file.mimeType,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner,
  });
  return publicDocument(document);
}

function list(owner) {
  return documentRepository.findByOwner(owner).map(publicDocument);
}

function findForDownload(id, owner) {
  const document = documentRepository.findById(id);
  if (!document || document.owner !== owner) return null;
  return { ...publicDocument(document), path: fileRepository.getPath(document.storedName) };
}

module.exports = { create, list, findForDownload };