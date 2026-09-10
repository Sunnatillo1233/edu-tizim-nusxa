const crypto = require('crypto');
const bcrypt = require('bcryptjs');

function genId(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

function genLinkCode() {
  // Ota-onalar uchun oson kiritiladigan 6 xonali kod
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function genToken() {
  return crypto.randomBytes(24).toString('hex');
}

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

function checkPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

module.exports = { genId, genLinkCode, genToken, hashPassword, checkPassword };
