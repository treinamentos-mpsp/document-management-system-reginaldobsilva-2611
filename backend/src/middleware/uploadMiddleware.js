const { randomUUID } = require('node:crypto');
const multer = require('multer');
const { storageDirectory } = require('../repositories/fileRepository');

const maxFileSizeMb = Number(process.env.MAX_FILE_SIZE_MB || 10);
if (!Number.isFinite(maxFileSizeMb) || maxFileSizeMb <= 0) {
  throw new Error('MAX_FILE_SIZE_MB deve ser um número positivo.');
}

module.exports = multer({
  defParamCharset: 'utf8',
  storage: multer.diskStorage({
    destination: storageDirectory,
    filename: (req, file, callback) => callback(null, randomUUID()),
  }),
  limits: { fileSize: Math.floor(maxFileSizeMb * 1024 * 1024) },
});