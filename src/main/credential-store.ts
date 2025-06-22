import { safeStorage }  from 'electron';
import fs from 'fs';
import path from 'path';

const filePath =path.join(process.env.APPDATA || '', process.env.APP_NAME, 'secrets.dat');

export function saveKey(key: string, value: string) {
  let all: { [key: string]: string } = {};

  if (fs.existsSync(filePath)) {
    const decrypted = safeStorage.decryptString(fs.readFileSync(filePath));
    all = JSON.parse(decrypted);
  }
  all[key] = value;
  const encrypted = safeStorage.encryptString(JSON.stringify(all));
  fs.writeFileSync(filePath, encrypted);
}

export function loadKey(key: string): string {
  if (!fs.existsSync(filePath)) return '';
  const decrypted = safeStorage.decryptString(fs.readFileSync(filePath));
  const all = JSON.parse(decrypted);
  return all[key] || '';
}
