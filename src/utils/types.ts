export interface UserCredentials {
  userId: string;
  encryptedData: string;
  salt: string;
  iv: string;
}

export interface EncryptedUserData {
  nickname?: string;
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
  nickname?: string;
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
  nickname?: string;
  name: string;
  email: string;
  sshKeyPath: string;
  description?: string;
  setAsActive?: boolean;
}

export interface SwitchUserOptions {
  id?: string;
  nickname?: string;
  email?: string;
}

export interface ListUsersOptions {
  showDetails?: boolean;
}

export interface ListedUser {
  id: string;
  nickname?: string;
  name: string;
  email: string;
  sshKeyPath: string;
  description?: string;
  isActive: boolean;
}

export interface RemoveUserOptions {
  id?: string;
  nickname?: string;
  email?: string;
}
