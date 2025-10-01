import { SecureUserStorage } from '../utils/secure-user-storage.js';
import { Logger } from '../utils/logger.js';
import type { SwitchUserOptions } from '../utils/types.js';

export async function switchUser(options: SwitchUserOptions): Promise<void> {
  const storage = new SecureUserStorage();

  if (!options.id && !options.email) {
    Logger.error('❌ ID do usuário ou email é obrigatório.');
    Logger.warning('Uso: gitusr switch-user --id <user-id> OU --email <email>');
    return;
  }

  try {
    let userToSwitch;

    if (options.id) {
      userToSwitch = await storage.getUser(options.id);

      if (!userToSwitch) {
        Logger.error(`❌ Usuário com ID ${options.id} não encontrado.`);
        return;
      }
    } else if (options.email) {
      userToSwitch = await storage.findUserByEmail(options.email);

      if (!userToSwitch) {
        Logger.error(`❌ Usuário com email ${options.email} não encontrado.`);
        return;
      }
    } else {
      return;
    }

    const activeUser = await storage.getActiveUser();
    if (activeUser?.id === userToSwitch.id) {
      Logger.info('ℹ️  O usuário selecionado já está ativo.');
      return;
    }

    Logger.info('🔄 Alternando usuário...');
    Logger.debug(`   Usuário anterior: ${activeUser?.name || 'Nenhum'}`);
    Logger.debug(`   Novo usuário: ${userToSwitch.name}`);

    await storage.setActiveUser(userToSwitch.id);

    // TODO - Adicionar carregamento da chave SSH
    // TODO - Adicionar configuração global do Git

    Logger.success('✅ Usuário alternado com sucesso!');
    Logger.debug(`\tNome: ${userToSwitch.name}`);
    Logger.debug(`\tEmail: ${userToSwitch.email}`);

    if (userToSwitch.description) {
      Logger.debug(`\tDescrição: ${userToSwitch.description}`);
    }

    Logger.default('');

    Logger.info('🔧 Configuração Git atualizada:');
    // TODO - Mostrar configurações do Git
  } catch (error) {
    if (error instanceof Error) {
      Logger.error(`❌ Erro ao alternar usuário: ${error.message}`);
    } else {
      Logger.error('❌ Erro desconhecido ao alternar usuário');
    }
  }
}
