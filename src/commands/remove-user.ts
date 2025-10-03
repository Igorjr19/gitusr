import { UserStorage } from '../utils/user-storage.js';
import { Logger } from '../utils/logger.js';
import { Commands } from './commands.js';
import type { RemoveUserOptions } from '../utils/types.js';
import { GitManager } from '../utils/git-manager.js';
import { SshAgent } from '../utils/ssh-agent.js';
import { ErrorHandler } from '../utils/errors.js';

export async function removeUser(options: RemoveUserOptions): Promise<void> {
  const storage = new UserStorage();

  if (!options.id && !options.email && !options.nickname) {
    Logger.error(ErrorHandler.create('missingUserIdentifier'));
    Logger.warning(
      `Uso: gitusr ${Commands.removeUser.name} --id <user-id> OU --email <email> OU --nickname <apelido>`
    );
    return;
  }

  try {
    let userId: string = '';
    let userToRemove;

    if (options.id) {
      userId = options.id;
      userToRemove = await storage.getUser(userId);

      if (!userToRemove) {
        Logger.error(ErrorHandler.create('userNotFoundById', userId));
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
        userToRemove = usersWithEmail[0];
        userId = userToRemove?.id || '';
      }
    } else if (options.nickname) {
      userToRemove = await storage.findUserByNickname(options.nickname);

      if (!userToRemove) {
        Logger.error(
          ErrorHandler.create('userNotFoundByNickname', options.nickname)
        );
        return;
      }

      userId = userToRemove?.id || '';
    } else {
      return;
    }

    if (!userToRemove) {
      Logger.error(ErrorHandler.create('userNotFound'));
      return;
    }

    Logger.info('🗑️  Removendo usuário...');
    Logger.debug(`\tNome: ${userToRemove.name}`);
    Logger.debug(`\tEmail: ${userToRemove.email}`);

    const activeUser = await storage.getActiveUser();
    const wasActive = activeUser?.id === userId;

    const success = await storage.removeUser(userId);

    if (success) {
      Logger.success('✅ Usuário removido com sucesso!');

      if (wasActive) {
        Logger.warning('⚠️  O usuário removido era o ativo.');

        const gitManager = new GitManager();
        try {
          if (gitManager.isGitAvailable()) {
            Logger.info('🧹 Limpando configurações Git...');
            gitManager.unsetGlobalConfig('user.name');
            gitManager.unsetGlobalConfig('user.email');
            Logger.success('✅ Configurações Git removidas');
          }
        } catch (gitError) {
          Logger.warning(`⚠️  Erro ao limpar configurações Git: ${gitError}`);
        }

        const sshAgent = new SshAgent();
        try {
          const loadedKeys = sshAgent.listLoadedKeys();
          if (loadedKeys.length > 0) {
            Logger.info('🧹 Removendo chaves SSH...');
            await sshAgent.unloadAllKeys();
            Logger.success('✅ Chaves SSH removidas do agente');
          }
        } catch (sshError) {
          Logger.warning(`⚠️  Erro ao remover chaves SSH: ${sshError}`);
        }

        Logger.info(
          `💡 Para definir outro usuário como ativo, use: gitusr ${Commands.switchUser.name}`
        );
      }
    } else {
      Logger.error(ErrorHandler.create('userRemovalFailed'));
    }
  } catch (error) {
    if (error instanceof Error) {
      Logger.error(
        `${ErrorHandler.create('removeUserFailed')}: ${error.message}`
      );
    } else {
      Logger.error(ErrorHandler.create('removeUserFailed'));
    }
  }
}
