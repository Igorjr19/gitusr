import { SecureUserStorage } from '../utils/secure-user-storage.js';
import { Logger } from '../utils/logger.js';
import { Commands } from './commands.js';
import type { RemoveUserOptions } from '../utils/types.js';

export async function removeUser(options: RemoveUserOptions): Promise<void> {
  const storage = new SecureUserStorage();

  if (!options.id && !options.email) {
    Logger.error('❌ ID do usuário ou email é obrigatório.');
    Logger.warning(
      `Uso: gitusr ${Commands.removeUser.name} --id <user-id> OU --email <email>`
    );
    return;
  }

  try {
    let userId: string;
    let userToRemove;

    if (options.id) {
      userId = options.id;
      userToRemove = await storage.getUser(userId);

      if (!userToRemove) {
        Logger.error(`❌ Usuário com ID ${userId} não encontrado.`);
        return;
      }
    } else if (options.email) {
      userToRemove = await storage.findUserByEmail(options.email);

      if (!userToRemove) {
        Logger.error(`❌ Usuário com email ${options.email} não encontrado.`);
        return;
      }

      userId = userToRemove.id;
    } else {
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
        Logger.info(
          `💡 Para definir outro usuário como ativo, use: gitusr ${Commands.switchUser.name}`
        );

        // TODO - Limpar configuração SSH personalizada
      }
    } else {
      Logger.error('❌ Falha ao remover o usuário.');
    }
  } catch (error) {
    if (error instanceof Error) {
      Logger.error(`❌ Erro ao remover usuário: ${error.message}`);
    } else {
      Logger.error('❌ Erro desconhecido ao remover usuário');
    }
  }
}
