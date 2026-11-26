const documentService = require('../services/documentService');

function ownerOf(req) {
  return req.get('X-User-Id') || 'anonymous';
}

function upload(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: { code: 'MISSING_FILE', message: 'Nenhum arquivo foi enviado.' } });
  }
  return res.status(201).json(documentService.create({
    originalName: req.file.originalname,
    storedName: req.file.filename,
    mimeType: req.file.mimetype,
    size: req.file.size,
  }, ownerOf(req)));
}

function list(req, res) {
  res.json(documentService.list(ownerOf(req)));
}

function download(req, res, next) {
  const document = documentService.findForDownload(req.params.id, ownerOf(req));
  if (!document) {
    return res.status(404).json({ error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado.' } });
  }

  return res.download(document.path, document.originalName, {
    headers: { 'Content-Type': document.mimeType },
  }, (error) => {
    if (!error) return;
    if (res.headersSent) return next(error);
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: { code: 'FILE_NOT_FOUND', message: 'Arquivo não encontrado.' } });
    }
    return next(error);
  });
}

module.exports = { upload, list, download };