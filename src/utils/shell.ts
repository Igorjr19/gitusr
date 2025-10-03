import { execSync } from 'child_process';
import { Logger } from './logger.js';

export class Shell {
  private escapeShellArg(arg: string): string {
    return arg.replace(/(["$`\\])/g, '\\$1');
  }

  runCommand(
    command: string,
    stdio: 'ignore' | 'inherit' | 'overlapped' | 'pipe'
  ): string {
    try {
      const escapedCommand = this.escapeShellArg(command);

      if (stdio === 'pipe') {
        return execSync(escapedCommand, { encoding: 'utf8' }).trim();
      }

      return execSync(escapedCommand, { stdio }).toString();
    } catch (error) {
      Logger.error(`Erro ao executar comando: ${error}`);
      throw error;
    }
  }
}
