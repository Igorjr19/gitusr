import { Logger } from '../utils/logger.js';
import { SecureUserStorage } from '../utils/secure-user-storage.js';

export async function status(): Promise<void> {
  const storage = new SecureUserStorage();

  try {
    const activeUser = await storage.getActiveUser();
    // TODO - Obter configuração Git atual
    const gitConfig = {
      name: '',
      email: '',
      sshCommand: '',
    };

    Logger.info('📊 Status atual:');

    if (activeUser) {
      Logger.success('✅ Usuário ativo:');
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
    Logger.default(`\tuser.name = ${gitConfig.name || 'não definido'}`);
    Logger.default(`\tuser.email = ${gitConfig.email || 'não definido'}`);

    if (gitConfig.sshCommand) {
      Logger.default(`\tcore.sshCommand = ${gitConfig.sshCommand}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      Logger.error(`❌ Erro ao obter status: ${error.message}`);
    } else {
      Logger.error('❌ Erro desconhecido ao obter status');
    }
  }
}
