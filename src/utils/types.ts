export interface UserCredentials {
  userId: string;
  encryptedData: string;
  salt: string;
  iv: string;
}

export interface EncryptedUserData {
  name: string;
  email: string;
  sshKeyPath: string;
  description?: string;
}

export interface ConfigOptions {
  configDir: string;
  storePath: string;
}
