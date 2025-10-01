import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
  scrypt,
} from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { promisify } from 'util';
import type {
  UserCredentials,
  EncryptedUserData,
  ConfigOptions,
} from './types.js';
import { Errors } from './errors.js';

const scryptAsync = promisify(scrypt);

export class SecureUserStorage {
  private configOptions: ConfigOptions;
  private masterKey?: string;

  constructor() {
    const configDir = join(homedir(), '.gitusr');
    this.configOptions = {
      configDir,
      storePath: join(configDir, 'users.encrypted'),
    };
  }

  private generateMasterKey(): string {
    const machineId =
      process.env.HOSTNAME || process.env.COMPUTERNAME || 'default-machine';
    const userInfo = process.env.USER || process.env.USERNAME || 'default-user';

    const hash = createHash('sha256');
    hash.update(`${machineId}-${userInfo}-gitusr-secret`);
    return hash.digest('hex');
  }

  private async encryptUserData(
    data: EncryptedUserData
  ): Promise<UserCredentials> {
    if (!this.masterKey) {
      this.masterKey = this.generateMasterKey();
    }

    const salt = randomBytes(16);
    const iv = randomBytes(12);

    const derivedKey = (await scryptAsync(this.masterKey, salt, 32)) as Buffer;

    const cipher = createCipheriv('aes-256-gcm', derivedKey, iv);

    const dataToEncrypt: EncryptedUserData = {
      ...data,
    };

    const dataString = JSON.stringify(dataToEncrypt);

    let encrypted = cipher.update(dataString, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      userId: createHash('md5').update(data.email).digest('hex'),
      encryptedData: encrypted + ':' + authTag.toString('hex'),
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
    };
  }

  private async decryptUserData(
    credentials: UserCredentials
  ): Promise<EncryptedUserData> {
    if (!this.masterKey) {
      this.masterKey = this.generateMasterKey();
    }

    const salt = Buffer.from(credentials.salt, 'hex');
    const iv = Buffer.from(credentials.iv, 'hex');

    const derivedKey = (await scryptAsync(this.masterKey, salt, 32)) as Buffer;

    const parts = credentials.encryptedData.split(':');

    if (parts.length !== 2) {
      throw new Error(Errors.corruptedEncryptedData);
    }

    const [encryptedData, authTagHex] = parts;
    const authTag = Buffer.from(authTagHex!, 'hex');

    const decipher = createDecipheriv('aes-256-gcm', derivedKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData!, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted) as EncryptedUserData;
  }

  private async ensureConfigDir(): Promise<void> {
    try {
      await fs.access(this.configOptions.configDir);
    } catch {
      await fs.mkdir(this.configOptions.configDir, { recursive: true });
    }
  }
}
