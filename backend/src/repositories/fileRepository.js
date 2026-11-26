const fs = require('node:fs');
const path = require('node:path');

const storageDirectory = path.resolve(process.env.STORAGE_DIR || path.join(__dirname, '../../storage'));
fs.mkdirSync(storageDirectory, { recursive: true });

function getPath(storedName) {
  return path.join(storageDirectory, storedName);
}

module.exports = { storageDirectory, getPath };