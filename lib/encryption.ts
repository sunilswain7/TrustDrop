import crypto from 'crypto';

const ALGO = 'aes-256-cbc';

function getMasterKey(): Buffer {
  const key = process.env.ENCRYPTION_MASTER_KEY;
  if (!key) throw new Error('ENCRYPTION_MASTER_KEY is not set');
  return Buffer.from(key, 'hex');
}

export function encryptFile(fileBuffer: Buffer) {
  const MASTER_KEY = getMasterKey();

  // Generate unique key for this file
  const fileKey = crypto.randomBytes(32);
  const iv = crypto.randomBytes(16);

  // Encrypt the file
  const cipher = crypto.createCipheriv(ALGO, fileKey, iv);
  const encrypted = Buffer.concat([iv, cipher.update(fileBuffer), cipher.final()]);

  // Encrypt the file key with master key (DB never stores raw key)
  const mkIv = crypto.randomBytes(16);
  const mkCipher = crypto.createCipheriv(ALGO, MASTER_KEY, mkIv);
  const encryptedKey = Buffer.concat([mkIv, mkCipher.update(fileKey), mkCipher.final()]);

  return {
    encryptedBlob: encrypted,
    encryptedKey: encryptedKey.toString('hex'),
    fileHash: crypto.createHash('sha256').update(fileBuffer).digest('hex'),
  };
}

export function decryptFile(encryptedBlob: Buffer, encryptedKeyHex: string) {
  const MASTER_KEY = getMasterKey();

  // Decrypt the file key
  const ekBuf = Buffer.from(encryptedKeyHex, 'hex');
  const mkIv = ekBuf.subarray(0, 16);
  const mkData = ekBuf.subarray(16);
  const mkDecipher = crypto.createDecipheriv(ALGO, MASTER_KEY, mkIv);
  const fileKey = Buffer.concat([mkDecipher.update(mkData), mkDecipher.final()]);

  // Decrypt the file
  const iv = encryptedBlob.subarray(0, 16);
  const data = encryptedBlob.subarray(16);
  const decipher = crypto.createDecipheriv(ALGO, fileKey, iv);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}
