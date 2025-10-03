import { UserStorage } from '../utils/user-storage.js';
import { Logger } from '../utils/logger.js';
import { Commands } from './commands.js';
import { ErrorHandler } from '../utils/errors.js';

export async function listUsers(): Promise<void> {
  const storage = new UserStorage();

  try {
    Logger.info('📋 Listando usuários cadastrados...');

    const users = await storage.listUsers();

    if (users.length === 0) {
      Logger.warning('📭  Nenhum usuário cadastrado.');
      Logger.info(
        `💡 Para adicionar um usuário, use: gitusr ${Commands.addUser.name}`
      );
      return;
    }

    Logger.success(`✅ ${users.length} usuário(s) encontrado(s):\n`);

    users.forEach((user, index) => {
      const activeIndicator = Logger.activeStatus(user.isActive);
      const userIndex = Logger.indexNumber(index + 1);

      Logger.default(`${userIndex} ${activeIndicator}`);
      Logger.default(`\tApelido: ${user.nickname || 'N/A'}`);
      Logger.default(`\tNome: ${user.name}`);
      Logger.debug(`\tEmail: ${user.email}`);
      Logger.debug(`\tChave SSH: ${user.sshKeyPath}`);
      Logger.debug(`\tID: ${user.id.substring(0, 8)}...`);

      if (user.description) {
        Logger.debug(`\tDescrição: ${user.description}`);
      }

      Logger.log('');
    });
  } catch (error) {
    if (error instanceof Error) {
      Logger.error(
        `${ErrorHandler.create('listUsersFailed')}: ${error.message}`
      );
    } else {
      Logger.error(ErrorHandler.create('listUsersFailed'));
    }
  }
}
