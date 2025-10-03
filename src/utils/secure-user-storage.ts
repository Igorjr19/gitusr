import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
  scrypt,
} from 'crypto';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import { homedir } from 'os';
import { promisify } from 'util';

import type {
  UserCredentials,
  EncryptedUserData,
  ConfigOptions,
  GitUser,
  UserStore,
  ListedUser,
} from './types.js';

import { Logger } from './logger.js';
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
      await fs.mkdir(this.configOptions.configDir, {
        recursive: true,
        mode: 0o700,
      });
    }
  }

  private normalizeSshKeyPath(sshKeyPath: string): string {
    if (sshKeyPath.startsWith('~')) {
      return join(homedir(), sshKeyPath.slice(1));
    }

    return resolve(sshKeyPath);
  }

  private async calculateSshKeyFingerprint(
    keyPath: string
  ): Promise<string | null> {
    try {
      const content = await fs.readFile(keyPath, 'utf8');
      return createHash('sha256').update(content).digest('hex');
    } catch {
      return null;
    }
  }

  private async validateSshKey(sshKeyPath: string): Promise<void> {
    const normalizedPath = this.normalizeSshKeyPath(sshKeyPath);

    try {
      await fs.access(normalizedPath, fs.constants.R_OK);
    } catch {
      throw new Error(`${Errors.sshFileNotFound}: ${normalizedPath}`);
    }

    const stats = await fs.stat(normalizedPath);
    const mode = stats.mode & parseInt('777', 8);

    if (mode !== parseInt('600', 8) && mode !== parseInt('400', 8)) {
      Logger.warning(
        `Chave SSH tem permissões inseguras: ${mode.toString(8)}. Recomendado: chmod 600 ${normalizedPath}`
      );
    }

    const content = await fs.readFile(normalizedPath, 'utf8');
    if (!content.includes('PRIVATE KEY')) {
      throw new Error('Arquivo não parece ser uma chave SSH privada válida');
    }
  }

  private async findSshKeyByFingerprint(
    fingerprint: string,
    originalPath: string
  ): Promise<string | null> {
    const searchPaths = [
      originalPath,
      join(homedir(), '.ssh', 'id_rsa'),
      join(homedir(), '.ssh', 'id_ed25519'),
      join(homedir(), '.ssh', 'id_ecdsa'),
      join(homedir(), '.ssh', 'id_dsa'),
    ];

    const baseName = originalPath.split('/').pop() || '';
    if (baseName) {
      searchPaths.push(
        join(homedir(), '.ssh', baseName),
        join(homedir(), 'keys', baseName),
        join(homedir(), '.keys', baseName)
      );
    }

    for (const path of searchPaths) {
      const currentFingerprint = await this.calculateSshKeyFingerprint(path);
      if (currentFingerprint === fingerprint) {
        Logger.info(`🔍 Chave SSH encontrada em: ${path}`);
        return path;
      }
    }

    try {
      const sshDir = join(homedir(), '.ssh');
      const files = await fs.readdir(sshDir);

      for (const file of files) {
        const fullPath = join(sshDir, file);
        try {
          const stat = await fs.stat(fullPath);
          if (stat.isFile() && !file.endsWith('.pub')) {
            const currentFingerprint =
              await this.calculateSshKeyFingerprint(fullPath);
            if (currentFingerprint === fingerprint) {
              Logger.info(`🔍 Chave SSH encontrada em: ${fullPath}`);
              return fullPath;
            }
          }
        } catch {
          continue;
        }
      }
    } catch {
      return null;
    }

    return null;
  }

  async verifySshKeyIntegrity(user: GitUser): Promise<{
    valid: boolean;
    newPath?: string;
    message: string;
  }> {
    const normalizedPath = this.normalizeSshKeyPath(user.sshKeyPath);

    try {
      await fs.access(normalizedPath, fs.constants.R_OK);

      if (user.sshKeyFingerprint) {
        const currentFingerprint =
          await this.calculateSshKeyFingerprint(normalizedPath);

        if (currentFingerprint !== user.sshKeyFingerprint) {
          return {
            valid: false,
            message: `⚠️ Chave SSH foi modificada: ${normalizedPath}`,
          };
        }
      }

      return {
        valid: true,
        message: `✅ Chave SSH válida: ${normalizedPath}`,
      };
    } catch {
      if (user.sshKeyFingerprint) {
        Logger.warning(`⚠️ Chave SSH não encontrada em: ${normalizedPath}`);
        Logger.info('🔍 Procurando chave em locais comuns...');

        const newPath = await this.findSshKeyByFingerprint(
          user.sshKeyFingerprint,
          normalizedPath
        );

        if (newPath) {
          return {
            valid: true,
            newPath,
            message: `✅ Chave SSH encontrada em novo local: ${newPath}`,
          };
        }
      }

      return {
        valid: false,
        message: `❌ Chave SSH não encontrada: ${normalizedPath}`,
      };
    }
  }

  private async loadUsers(): Promise<UserStore> {
    try {
      await this.ensureConfigDir();
      const data = await fs.readFile(this.configOptions.storePath, 'utf8');
      const parsed = JSON.parse(data) ?? {};

      const users: Record<string, GitUser> = {};

      for (const [userId, credentials] of Object.entries(parsed.users)) {
        try {
          const decryptedData = await this.decryptUserData(
            credentials as UserCredentials
          );

          const user: GitUser = {
            nickname: decryptedData.nickname,
            id: userId,
            name: decryptedData.name,
            email: decryptedData.email,
            sshKeyPath: decryptedData.sshKeyPath,
          };

          if (decryptedData.description) {
            user.description = decryptedData.description;
          }

          users[userId] = user;
        } catch {
          Logger.error(
            `⚠️  Falha ao descriptografar dados do usuário com ID ${userId}. Os dados podem estar corrompidos ou a chave de criptografia mudou.`
          );
        }
      }

      return {
        users,
        activeUser: parsed.activeUser || undefined,
      };
    } catch {
      return { users: {} };
    }
  }

  private async saveUsers(store: UserStore): Promise<void> {
    await this.ensureConfigDir();

    const encryptedUsers: Record<string, UserCredentials> = {};

    for (const [userId, user] of Object.entries(store.users)) {
      const sensitiveData: EncryptedUserData = {
        name: user.name,
        email: user.email,
        sshKeyPath: user.sshKeyPath,
      };

      if (user.nickname) {
        sensitiveData.nickname = user.nickname;
      }

      if (user.description) {
        sensitiveData.description = user.description;
      }

      encryptedUsers[userId] = await this.encryptUserData(sensitiveData);
    }

    const dataToSave = {
      users: encryptedUsers,
      activeUser: store.activeUser,
      timestamp: new Date().toISOString(),
    };

    await fs.writeFile(
      this.configOptions.storePath,
      JSON.stringify(dataToSave, null, 2)
    );
    await fs.chmod(this.configOptions.storePath, 0o600);
  }

  async addUser(
    name: string,
    email: string,
    sshKeyPath: string,
    description?: string,
    nickname?: string
  ): Promise<GitUser> {
    const normalizedPath = this.normalizeSshKeyPath(sshKeyPath);

    await this.validateSshKey(normalizedPath);

    const fingerprint = await this.calculateSshKeyFingerprint(normalizedPath);

    const store = await this.loadUsers();

    const uniqueString = `${email}-${nickname || 'no-nickname'}-${normalizedPath}`;
    const userId = createHash('md5').update(uniqueString).digest('hex');

    const existingUser = Object.values(store.users).find(
      user =>
        user.email === email &&
        user.nickname === nickname &&
        this.normalizeSshKeyPath(user.sshKeyPath) === normalizedPath
    );

    if (existingUser) {
      throw new Error(Errors.duplicateUserData);
    }

    const newUser: GitUser = {
      id: userId,
      nickname,
      name,
      email,
      sshKeyPath: normalizedPath,
      sshKeyFingerprint: fingerprint || undefined,
    };

    if (description) {
      newUser.description = description;
    }

    store.users[userId] = newUser;
    await this.saveUsers(store);

    return newUser;
  }

  async listUsers(): Promise<ListedUser[]> {
    const store = await this.loadUsers();

    return Object.values(store.users).map(user => {
      const listUser: ListedUser = {
        id: user.id,
        nickname: user.nickname,
        name: user.name,
        email: user.email,
        sshKeyPath: user.sshKeyPath,
        isActive: store.activeUser === user.id,
      };

      if (user.description) {
        listUser.description = user.description;
      }

      return listUser;
    });
  }

  async getUser(userId: string): Promise<GitUser | null> {
    const store = await this.loadUsers();
    return store.users[userId] || null;
  }

  async findUserByEmail(email: string): Promise<GitUser | null> {
    const users = await this.findUsersByEmail(email);
    return users.length > 0 ? users[0] || null : null;
  }

  async findUsersByEmail(email: string): Promise<GitUser[]> {
    const store = await this.loadUsers();
    return Object.values(store.users).filter(user => user.email === email);
  }

  async getActiveUser(): Promise<GitUser | null> {
    const store = await this.loadUsers();

    if (!store.activeUser) {
      return null;
    }

    return store.users[store.activeUser] || null;
  }

  async setActiveUser(userId: string): Promise<boolean> {
    const store = await this.loadUsers();

    if (!store.users[userId]) {
      return false;
    }

    store.activeUser = userId;
    await this.saveUsers(store);

    return true;
  }

  async removeUser(userId: string): Promise<boolean> {
    const store = await this.loadUsers();

    if (!store.users[userId]) {
      return false;
    }

    delete store.users[userId];

    if (store.activeUser === userId) {
      store.activeUser = undefined;
    }

    await this.saveUsers(store);
    return true;
  }

  async findUserByNickname(nickname: string): Promise<GitUser | null> {
    const store = await this.loadUsers();

    const user = Object.values(store.users).find(
      user => user.nickname === nickname
    );

    return user || null;
  }

  async updateSshKeyPath(userId: string, newPath: string): Promise<boolean> {
    const store = await this.loadUsers();

    if (!store.users[userId]) {
      return false;
    }

    const normalizedPath = this.normalizeSshKeyPath(newPath);
    await this.validateSshKey(normalizedPath);

    const fingerprint = await this.calculateSshKeyFingerprint(normalizedPath);

    store.users[userId]!.sshKeyPath = normalizedPath;
    store.users[userId]!.sshKeyFingerprint = fingerprint || undefined;

    await this.saveUsers(store);

    Logger.success(`✅ Caminho da chave SSH atualizado: ${normalizedPath}`);
    return true;
  }

  async updateUserField(
    userId: string,
    field: 'name' | 'email' | 'nickname' | 'description',
    value: string | undefined
  ): Promise<boolean> {
    const store = await this.loadUsers();

    if (!store.users[userId]) {
      return false;
    }

    if (field === 'nickname' || field === 'description') {
      store.users[userId]![field] = value;
    } else {
      if (!value) {
        Logger.error(`❌ Campo ${field} não pode ser vazio`);
        return false;
      }
      store.users[userId]![field] = value;
    }

    await this.saveUsers(store);

    return true;
  }
}
