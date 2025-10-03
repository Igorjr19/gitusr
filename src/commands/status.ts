import { Logger } from '../utils/logger.js';
import { SecureUserStorage } from '../utils/secure-user-storage.js';
import { GitManager } from '../utils/git-manager.js';
import { SshAgent } from '../utils/ssh-agent.js';
import { ErrorHandler } from '../utils/errors.js';

export async function status(): Promise<void> {
  const storage = new SecureUserStorage();
  const gitManager = new GitManager();
  const sshAgent = new SshAgent();

  try {
    const activeUser = await storage.getActiveUser();

    const gitConfig = gitManager.getGlobalConfig();

    const sshInfo = sshAgent.getAgentInfo();

    Logger.info('📊 Status atual:');

    if (activeUser) {
      Logger.success('✅ Usuário ativo:');
      Logger.default(`\tApelido: ${activeUser.nickname || 'N/A'}`);
      Logger.default(`\tNome: ${activeUser.name}`);
      Logger.debug(`\tEmail: ${activeUser.email}`);
      Logger.debug(`\tID: ${activeUser.id}`);
      if (activeUser.description) {
        Logger.debug(`\tDescrição: ${activeUser.description}`);
      }
    } else {
      Logger.warning('⚠️  Nenhum usuário ativo definido');
    }

    Logger.log('');
    Logger.info('🔧 Configuração Git atual:');
    if (gitManager.isGitAvailable()) {
      Logger.default(`\tuser.name = ${gitConfig.name || 'não definido'}`);
      Logger.default(`\tuser.email = ${gitConfig.email || 'não definido'}`);

      if (gitManager.isGitRepository()) {
        Logger.success('\t✅ Repositório Git detectado');
      } else {
        Logger.info('\tℹ️  Não está em um repositório Git');
      }
    } else {
      Logger.warning('\t⚠️  Git não está disponível no sistema');
    }

    Logger.log('');
    Logger.info('🔑 Status SSH:');
    Logger.default(
      `\tSSH Agent rodando: ${sshInfo.running ? '✅ Sim' : '❌ Não'}`
    );

    if (sshInfo.running) {
      Logger.default(`\tChaves carregadas: ${sshInfo.keyCount}`);

      if (sshInfo.socketPath) {
        Logger.debug(`\tSocket: ${sshInfo.socketPath}`);
      }

      if (sshInfo.keyCount > 0) {
        const loadedKeys = sshAgent.listLoadedKeys();
        Logger.info('\t📋 Chaves SSH carregadas:');
        loadedKeys.forEach((key, index) => {
          Logger.default(`\t\t${index + 1}. ${key}`);
        });
      } else {
        Logger.warning('\t⚠️  Nenhuma chave SSH carregada');
      }
    } else {
      Logger.warning('\t⚠️  SSH Agent não está rodando');
      Logger.info('\t💡 Execute: eval "$(ssh-agent -s)"');
    }

    Logger.log('');
    Logger.info('🔍 Verificação de sincronização:');

    if (activeUser && gitConfig.name && gitConfig.email) {
      const configMatches =
        activeUser.name === gitConfig.name &&
        activeUser.email === gitConfig.email;

      if (configMatches) {
        Logger.success('\t✅ Usuário ativo sincronizado com configuração Git');
      } else {
        Logger.warning(
          '\t⚠️  Usuário ativo não sincronizado com configuração Git'
        );
        Logger.debug(
          `\t   Usuário ativo: ${activeUser.name} <${activeUser.email}>`
        );
        Logger.debug(`\t   Git config: ${gitConfig.name} <${gitConfig.email}>`);
      }
    } else if (activeUser) {
      Logger.warning('\t⚠️  Usuário ativo definido mas Git não configurado');
    } else if (gitConfig.name || gitConfig.email) {
      Logger.warning('\t⚠️  Git configurado mas nenhum usuário ativo definido');
    } else {
      Logger.info('\t💡 Nenhum usuário ativo nem configuração Git definidos');
    }
  } catch (error) {
    if (error instanceof Error) {
      Logger.error(`${ErrorHandler.create('statusFailed')}: ${error.message}`);
    } else {
      Logger.error(ErrorHandler.create('statusFailed'));
    }
  }
}
