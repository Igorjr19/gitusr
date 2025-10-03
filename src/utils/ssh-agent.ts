import { execSync } from 'child_process';
import { existsSync, statSync } from 'fs';
import { Logger } from './logger.js';
import { Errors, ErrorHandler } from './errors.js';

export class SshAgent {
  private isAgentRunning(): boolean {
    try {
      execSync('ssh-add -l', { stdio: 'ignore' });
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

      execSync(`ssh-add "${sshKeyPath}"`, { stdio: 'ignore' });
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

      execSync(`ssh-add -d "${sshKeyPath}"`, { stdio: 'ignore' });
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

      const publicKeyOutput = execSync(`ssh-keygen -y -f "${sshKeyPath}"`, {
        encoding: 'utf8',
      });
      const publicKey = publicKeyOutput.trim();

      const loadedKeys = execSync('ssh-add -L', { encoding: 'utf8' });

      return loadedKeys.includes(publicKey);
    } catch {
      return false;
    }
  }

  listLoadedKeys(): string[] {
    try {
      this.ensureAgentRunning();

      const output = execSync('ssh-add -l', { encoding: 'utf8' });

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

      execSync('ssh-add -D', { stdio: 'ignore' });
      Logger.success('Todas as chaves SSH foram removidas do agente');
    } catch (error) {
      Logger.error(`${ErrorHandler.get('sshKeyUnloadFailed')}: ${error}`);
      throw error;
    }
  }

  testGitHubConnection(): boolean {
    try {
      this.ensureAgentRunning();

      const output = execSync('ssh -T git@github.com', {
        encoding: 'utf8',
        stdio: 'pipe',
      });

      return output.includes('successfully authenticated');
    } catch (error) {
      const execError = error as {
        status?: number;
        stderr?: string;
        message?: string;
      };
      if (
        execError.status === 1 &&
        execError.stderr?.includes('successfully authenticated')
      ) {
        return true;
      }

      Logger.error(
        `${ErrorHandler.get('sshConnectivityFailed')}: ${execError.stderr || execError.message || ErrorHandler.get('unknownError')}`
      );
      return false;
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
