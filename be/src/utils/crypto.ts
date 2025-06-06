import CryptoJS from 'crypto-js'

export function encrypt(clearText, secret) {
  return CryptoJS.AES.encrypt(clearText, secret).toString();
}

export function decrypt(ciphertext, secret) {
  return CryptoJS.AES.decrypt(ciphertext, secret).toString(CryptoJS.enc.Utf8);
}
