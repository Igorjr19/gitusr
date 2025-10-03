import { SecureUserStorage } from '../utils/secure-user-storage.js';
import { Logger } from '../utils/logger.js';
import type { SwitchUserOptions } from '../utils/types.js';
import { GitManager } from '../utils/git-manager.js';
import { SshAgent } from '../utils/ssh-agent.js';
import { ErrorHandler } from '../utils/errors.js';

export async function switchUser(options: SwitchUserOptions): Promise<void> {
  const storage = new SecureUserStorage();

  if (!options.id && !options.email && !options.nickname) {
    Logger.error(ErrorHandler.create('missingUserIdentifier'));
    Logger.warning(
      'Uso: gitusr switch-user --id <user-id> OU --email <email> OU --nickname <apelido>'
    );
    return;
  }

  try {
    let userToSwitch;

    if (options.id) {
      userToSwitch = await storage.getUser(options.id);

      if (!userToSwitch) {
        Logger.error(ErrorHandler.create('userNotFoundById', options.id));
        return;
      }
    } else if (options.email) {
      const usersWithEmail = await storage.findUsersByEmail(options.email);

      if (usersWithEmail.length === 0) {
        Logger.error(ErrorHandler.create('userNotFoundByEmail', options.email));
        return;
      } else if (usersWithEmail.length > 1) {
        Logger.error(
          ErrorHandler.create(
            'multipleUsersWithEmail',
            options.email,
            usersWithEmail.length.toString()
          )
        );
        Logger.info('Usuários encontrados:');
        usersWithEmail.forEach((user, index) => {
          Logger.info(
            `  ${index + 1}. ${user.nickname || 'Sem apelido'} (ID: ${user.id.substring(0, 8)}...)`
          );
          Logger.info(`     SSH: ${user.sshKeyPath}`);
        });
        return;
      } else {
        userToSwitch = usersWithEmail[0];
      }
    } else if (options.nickname) {
      userToSwitch = await storage.findUserByNickname(options.nickname);

      if (!userToSwitch) {
        Logger.error(
          ErrorHandler.create('userNotFoundByNickname', options.nickname)
        );
        return;
      }
    } else {
      return;
    }

    if (!userToSwitch) {
      Logger.error(ErrorHandler.create('userNotFound'));
      return;
    }

    const activeUser = await storage.getActiveUser();
    if (activeUser?.id === userToSwitch.id) {
      Logger.info(`ℹ️  ${ErrorHandler.get('userAlreadyActive')}`);
      return;
    }

    Logger.info('🔄 Alternando usuário...');
    Logger.debug(`   Usuário anterior: ${activeUser?.name || 'Nenhum'}`);
    Logger.debug(`   Novo usuário: ${userToSwitch.name}`);

    const sshAgent = new SshAgent();
    const gitManager = new GitManager();

    try {
      const loadedKeys = sshAgent.listLoadedKeys();
      if (loadedKeys.length > 0) {
        Logger.info('🔑 Removendo chaves SSH anteriores...');
        sshAgent.unloadAllKeys();
      }

      Logger.info('🔑 Carregando chave SSH do novo usuário...');
      sshAgent.loadKey(userToSwitch.sshKeyPath);
      Logger.success('✅ Chave SSH carregada');
    } catch (sshError) {
      Logger.warning(`⚠️  Erro ao gerenciar chaves SSH: ${sshError}`);
    }

    try {
      if (gitManager.isGitAvailable()) {
        Logger.info('🔧 Atualizando configuração Git...');
        gitManager.setGlobalConfig(userToSwitch.name, userToSwitch.email);
        Logger.success('✅ Configuração Git atualizada');
      } else {
        Logger.warning('⚠️  Git não disponível - configuração não aplicada');
      }
    } catch (gitError) {
      Logger.warning(`⚠️  Erro ao configurar Git: ${gitError}`);
    }

    await storage.setActiveUser(userToSwitch.id);

    Logger.success('✅ Usuário alternado com sucesso!');
    Logger.debug(`\tID: ${userToSwitch.id}`);
    Logger.debug(`\tApelido: ${userToSwitch.nickname || 'N/A'}`);
    Logger.debug(`\tNome: ${userToSwitch.name}`);
    Logger.debug(`\tEmail: ${userToSwitch.email}`);

    if (userToSwitch.description) {
      Logger.debug(`\tDescrição: ${userToSwitch.description}`);
    }

    Logger.default('');

    Logger.info('🔧 Configuração Git atual:');
    try {
      const currentConfig = gitManager.getGlobalConfig();
      Logger.default(`\tuser.name = ${currentConfig.name || 'não definido'}`);
      Logger.default(`\tuser.email = ${currentConfig.email || 'não definido'}`);
    } catch {
      Logger.warning('⚠️  Erro ao verificar configurações');
    }
  } catch (error) {
    if (error instanceof Error) {
      Logger.error(
        `${ErrorHandler.create('switchUserFailed')}: ${error.message}`
      );
    } else {
      Logger.error(ErrorHandler.create('switchUserFailed'));
    }
  }
}
