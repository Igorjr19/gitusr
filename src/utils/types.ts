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

export interface UserStore {
  users: Record<string, GitUser>;
  activeUser?: string | undefined;
  encryptionKey?: string;
}

export interface GitUser {
  id: string;
  name: string;
  email: string;
  sshKeyPath: string;
  description?: string;
}

export interface Command {
  name: string;
  alias: string;
  description: string;
  execute: (options: unknown) => Promise<void>;
}

export interface AddUserOptions {
  name: string;
  email: string;
  sshKeyPath: string;
  description?: string;
  setAsActive?: boolean;
}

export interface SwitchUserOptions {
  id?: string;
  email?: string;
}

export interface ListUsersOptions {
  showDetails?: boolean;
}

export interface ListedUser {
  id: string;
  name: string;
  email: string;
  description?: string;
  isActive: boolean;
}
