import { Logger } from './logger.js';
import { ErrorHandler } from './errors.js';
import { Shell } from './shell.js';

export class GitManager {
  private shell = new Shell();

  isGitAvailable(): boolean {
    try {
      this.shell.runCommand('git --version', 'ignore');
      return true;
    } catch {
      Logger.error(ErrorHandler.create('gitNotAvailable'));
      return false;
    }
  }

  setGlobalConfig(name: string, email: string): void {
    try {
      if (!this.isGitAvailable()) {
        throw new Error('Git não está disponível');
      }

      this.shell.runCommand(
        `git config --global user.name "${name}"`,
        'ignore'
      );
      this.shell.runCommand(
        `git config --global user.email "${email}"`,
        'ignore'
      );

      Logger.info(
        `Configurações globais do Git atualizadas para: ${name} <${email}>`
      );
    } catch (error) {
      Logger.error(`${ErrorHandler.get('gitConfigFailed')}: ${error}`);
      throw error;
    }
  }

  getGlobalConfig(): { name?: string; email?: string } {
    try {
      if (!this.isGitAvailable()) {
        return {};
      }

      const name = this.shell
        .runCommand('git config --global user.name', 'pipe')
        .trim();

      const email = this.shell
        .runCommand('git config --global user.email', 'pipe')
        .trim();

      return { name, email };
    } catch (error) {
      Logger.error(`${ErrorHandler.get('gitConfigReadFailed')}: ${error}`);
      return {};
    }
  }

  unsetGlobalConfig(key: 'user.name' | 'user.email'): void {
    try {
      if (!this.isGitAvailable()) {
        throw new Error('Git não está disponível');
      }

      this.shell.runCommand(`git config --global --unset ${key}`, 'ignore');
      Logger.info(`Configuração ${key} removida`);
    } catch (error) {
      Logger.error(
        `${ErrorHandler.get('gitConfigRemoveFailed')} ${key}: ${error}`
      );
      throw error;
    }
  }

  listGlobalConfig(): Record<string, string> {
    try {
      if (!this.isGitAvailable()) {
        return {};
      }

      const output = this.shell
        .runCommand('git config --global --list', 'pipe')
        .trim();
      const config: Record<string, string> = {};

      output.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          config[key] = valueParts.join('=');
        }
      });

      return config;
    } catch (error) {
      Logger.error(`${ErrorHandler.get('gitConfigReadFailed')}: ${error}`);
      return {};
    }
  }

  isGitRepository(): boolean {
    try {
      this.shell.runCommand('git rev-parse --git-dir', 'ignore');
      return true;
    } catch {
      return false;
    }
  }
}
