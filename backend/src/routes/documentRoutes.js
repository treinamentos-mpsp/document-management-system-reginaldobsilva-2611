const { randomUUID } = require('node:crypto');
const express = require('express');
const multer = require('multer');
const documentController = require('../controllers/documentController');
const { storageDirectory } = require('../repositories/fileRepository');

const maxFileSizeMb = Number(process.env.MAX_FILE_SIZE_MB || 10);
if (!Number.isFinite(maxFileSizeMb) || maxFileSizeMb <= 0) {
  throw new Error('MAX_FILE_SIZE_MB deve ser um número positivo.');
}

const upload = multer({
  defParamCharset: 'utf8',
  storage: multer.diskStorage({
    destination: storageDirectory,
    filename: (req, file, callback) => callback(null, randomUUID()),
  }),
  limits: { fileSize: Math.floor(maxFileSizeMb * 1024 * 1024) },
});

const router = express.Router();
router.post('/upload', upload.single('file'), documentController.upload);
router.get('/documents', documentController.list);
router.get('/documents/:id/download', documentController.download);

module.exports = router;