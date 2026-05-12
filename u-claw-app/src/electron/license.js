// ── License 加密常量 ──
import crypto from 'crypto';

const LICENSE_SALT = 'uclaw-license-v1';
const LICENSE_ITERATIONS = 100000;
const LICENSE_KEYLEN = 32;
const LICENSE_DIGEST = 'sha256';


/**
 * AES-256-GCM 加密
 * @param {string} data - 要加密的数据
 * @param {Buffer} key - 32 字节密钥
 * @returns {{ iv: string, tag: string, data: string }} - 加密结果（均为 base64）
 */
function aesGcmEncrypt(data, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: encrypted.toString('base64'),
  };
}

/**
 * AES-256-GCM 解密
 * @param {{ iv: string, tag: string, data: string }} encrypted - 加密对象
 * @param {Buffer} key - 32 字节密钥
 * @returns {string} - 解密后的字符串
 */
function aesGcmDecrypt(encrypted, key) {
  const iv = Buffer.from(encrypted.iv, 'base64');
  const tag = Buffer.from(encrypted.tag, 'base64');
  const data = Buffer.from(encrypted.data, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * 从 USB 序列号派生 AES-256 密钥
 * @param {string} serial - USB 序列号
 * @returns {Buffer} - 32 字节 AES-256 密钥
 */
function deriveKeyFromSerial(serial) {
  return crypto.pbkdf2Sync(serial, LICENSE_SALT, LICENSE_ITERATIONS, LICENSE_KEYLEN, LICENSE_DIGEST);
}


export {
  deriveKeyFromSerial,
  aesGcmDecrypt,
  aesGcmEncrypt
};