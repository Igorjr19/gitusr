import { spawnSync } from 'child_process';
import { Logger } from './logger.js';

export class Shell {
  runCommand(
    command: string,
    args: string[],
    stdio: 'ignore' | 'inherit' | 'pipe' = 'pipe'
  ): string {
    try {
      const result = spawnSync(command, args, {
        stdio: stdio === 'pipe' ? ['pipe', 'pipe', 'pipe'] : stdio,
        encoding: 'utf8',
        shell: false,
      });

      if (result.error) {
        throw result.error;
      }

      if (result.status !== 0 && stdio !== 'ignore') {
        const errorMsg =
          result.stderr || `Comando falhou com código ${result.status}`;
        throw new Error(errorMsg);
      }

      return stdio === 'pipe' ? (result.stdout || '').trim() : '';
    } catch (error) {
      Logger.error(`Erro ao executar comando ${command}: ${error}`);
      throw error;
    }
  }
}
