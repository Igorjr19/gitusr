import { execSync } from 'child_process';
import { Logger } from './logger.js';
import { ErrorHandler } from './errors.js';

export class GitManager {
  isGitAvailable(): boolean {
    try {
      execSync('git --version', { stdio: 'ignore' });
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

      execSync(`git config --global user.name "${name}"`, { stdio: 'ignore' });
      execSync(`git config --global user.email "${email}"`, {
        stdio: 'ignore',
      });

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

      const name = execSync('git config --global user.name', {
        encoding: 'utf8',
      }).trim();

      const email = execSync('git config --global user.email', {
        encoding: 'utf8',
      }).trim();

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

      execSync(`git config --global --unset ${key}`, { stdio: 'ignore' });
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

      const output = execSync('git config --global --list', {
        encoding: 'utf8',
      });
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
      execSync('git rev-parse --git-dir', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
}
