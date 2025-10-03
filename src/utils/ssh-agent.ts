import { existsSync, statSync } from 'fs';
import { Logger } from './logger.js';
import { Errors, ErrorHandler } from './errors.js';
import { Shell } from './shell.js';

export class SshAgent {
  private shell = new Shell();

  private isAgentRunning(): boolean {
    try {
      this.shell.runCommand('ssh-add -l', 'ignore');
      return true;
    } catch {
      return false;
    }
  }

  private ensureAgentRunning(): void {
    if (!this.isAgentRunning()) {
      try {
        if (!process.env.SSH_AUTH_SOCK) {
          Logger.warning('SSH agent não está rodando. Iniciando...');
          throw new Error(ErrorHandler.get('sshAgentNotRunning'));
        }
      } catch (error) {
        Logger.error(`Erro ao verificar SSH agent: ${error}`);
        throw error;
      }
    }
  }

  private validateSshKey(sshKeyPath: string): void {
    if (!existsSync(sshKeyPath)) {
      throw new Error(Errors.sshFileNotFound);
    }

    const stats = statSync(sshKeyPath);
    const mode = stats.mode & parseInt('777', 8);

    if (mode !== parseInt('600', 8) && mode !== parseInt('400', 8)) {
      Logger.warning(
        `Chave SSH ${sshKeyPath}: ${ErrorHandler.get('sshKeyPermissions')}`
      );
    }
  }

  loadKey(sshKeyPath: string): void {
    try {
      this.validateSshKey(sshKeyPath);
      this.ensureAgentRunning();

      if (this.isKeyLoaded(sshKeyPath)) {
        Logger.info(`Chave SSH ${sshKeyPath} já está carregada`);
        return;
      }

      this.shell.runCommand(`ssh-add "${sshKeyPath}"`, 'ignore');
      Logger.success(`Chave SSH carregada: ${sshKeyPath}`);
    } catch (error) {
      Logger.error(
        `${ErrorHandler.get('sshKeyLoadFailed')} ${sshKeyPath}: ${error}`
      );
      throw error;
    }
  }

  unloadKey(sshKeyPath: string): void {
    try {
      this.ensureAgentRunning();

      if (!this.isKeyLoaded(sshKeyPath)) {
        Logger.info(`Chave SSH ${sshKeyPath} não está carregada`);
        return;
      }

      this.shell.runCommand(`ssh-add -d "${sshKeyPath}"`, 'ignore');
      Logger.success(`Chave SSH removida: ${sshKeyPath}`);
    } catch (error) {
      Logger.error(
        `${ErrorHandler.get('sshKeyUnloadFailed')} ${sshKeyPath}: ${error}`
      );
      throw error;
    }
  }

  isKeyLoaded(sshKeyPath: string): boolean {
    try {
      this.ensureAgentRunning();

      const publicKeyOutput = this.shell.runCommand(
        `ssh-keygen -y -f "${sshKeyPath}"`,
        'pipe'
      );
      const publicKey = publicKeyOutput.trim();

      const loadedKeys = this.shell.runCommand('ssh-add -L', 'pipe');

      return loadedKeys.includes(publicKey);
    } catch {
      return false;
    }
  }

  listLoadedKeys(): string[] {
    try {
      this.ensureAgentRunning();

      const output = this.shell.runCommand('ssh-add -l', 'pipe');

      return output
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const parts = line.split(' ');
          return parts[parts.length - 2] || line;
        });
    } catch {
      return [];
    }
  }

  unloadAllKeys(): void {
    try {
      this.ensureAgentRunning();

      this.shell.runCommand('ssh-add -D', 'ignore');
      Logger.success('Todas as chaves SSH foram removidas do agente');
    } catch (error) {
      Logger.error(`${ErrorHandler.get('sshKeyUnloadFailed')}: ${error}`);
      throw error;
    }
  }

  getAgentInfo(): { running: boolean; keyCount: number; socketPath?: string } {
    const running = this.isAgentRunning();
    const keyCount = running ? this.listLoadedKeys().length : 0;
    const socketPath = process.env.SSH_AUTH_SOCK;

    return {
      running,
      keyCount,
      socketPath,
    };
  }
}
