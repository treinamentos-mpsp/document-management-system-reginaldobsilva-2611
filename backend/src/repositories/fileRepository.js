const fs = require('node:fs');
const path = require('node:path');

const storageDirectory = path.resolve(process.env.STORAGE_DIR || path.join(__dirname, '../../storage'));
fs.mkdirSync(storageDirectory, { recursive: true });

function getPath(storedName) {
  if (typeof storedName !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(storedName)) {
    throw new TypeError('Nome de arquivo armazenado inválido.');
  }

  const filePath = path.resolve(storageDirectory, storedName);
  const relativePath = path.relative(storageDirectory, filePath);
  if (relativePath.startsWith(`..${path.sep}`) || relativePath === '..' || path.isAbsolute(relativePath)) {
    throw new TypeError('Caminho de arquivo fora do diretório de armazenamento.');
  }

  return filePath;
}

module.exports = { storageDirectory, getPath };